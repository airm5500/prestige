/* POINTER LES BL / AVOIRS ET CONTROLE MOBILE (retours du 10/10, lot 4, Q11 lecture 2) — par l'ecran.
 *  - menu renomme « Pointer les BL / Avoirs » ;
 *  - groupe de grossistes : pieces de tous les grossistes du groupe, grossiste grise ; edition PDF de la liste ;
 *  - controle fait dans l'application mobile (meme appel que l'application : bon/items/checked-quantities) : qui et quand
 *    enregistres, ecart de quantite signale, visible dans le pointage et dans l'etat de controle des achats ;
 *  - edition PDF du rapprochement d'un releve.
 * Jeu d'essai (2 BL de deux grossistes du groupe 1, un releve) retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE], { encoding: 'utf8', input: s });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const G1 = '51217123167082947316', G1B = '51217123725332335681';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const NOM = q("SELECT TRIM(CONCAT(str_FIRST_NAME, ' ', str_LAST_NAME)) FROM t_user WHERE str_LOGIN = 'admin'");
const P = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY str_NAME LIMIT 1");
const EMPL = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = 'admin'");

function nettoyer() {
  exec("SET FOREIGN_KEY_CHECKS = 0; DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PG-%'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PG-%';"
    + " DELETE FROM t_order WHERE lg_ORDER_ID LIKE 'E2E-PG-%'; DELETE FROM t_releve_grossiste_ligne WHERE lg_RELEVE_ID = 'E2E-PG-REL'; DELETE FROM t_releve_grossiste WHERE lg_RELEVE_ID = 'E2E-PG-REL';"
    + " SET FOREIGN_KEY_CHECKS = 1;");
}
function bl(n, grossiste, recue) {
  const o = 'E2E-PG-O' + n, b = 'E2E-PG-' + n;
  return "INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + o + "', '" + o + "', 1, '" + grossiste + "', '" + ADMIN + "', 'is_Closed', '2025-02-09', '2025-02-09', 1000, 1, 0);"
    + "INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)"
    + " VALUES ('" + b + "', 'E2EPG" + n + "', '2025-02-10', " + (1000 * n) + ", 0, " + (1000 * n) + ", '" + o + "', 'is_Closed', '2025-02-10 09:00:00', '2025-02-10 09:00:00', '" + ADMIN + "');"
    + "INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_RECUE, int_QTE_UG, int_PAF, int_PRIX_VENTE, prixTarif, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + b + "-L', '" + grossiste + "', '" + P + "', '" + b + "', " + recue + ", " + recue + ", 0, 500, 800, 500, '1', 'is_Closed', NOW(), NOW());";
}

(async () => {
  nettoyer();
  exec(bl(1, G1, 4) + bl(2, G1B, 2)
    + "INSERT INTO t_releve_grossiste (lg_RELEVE_ID, lg_GROSSISTE_ID, lg_EMPLACEMENT_ID, str_FICHIER, dt_DEBUT, dt_FIN, int_LIGNES, int_TOTAL_BL, int_TOTAL_AVOIRS, dt_IMPORT, lg_USER_ID)"
    + " VALUES ('E2E-PG-REL', '" + G1 + "', '" + EMPL + "', 'releve-e2e.pdf', '2025-02-01', '2025-02-28', 2, 1500, 0, NOW(), '" + ADMIN + "');"
    + "INSERT INTO t_releve_grossiste_ligne (lg_LIGNE_ID, lg_RELEVE_ID, int_RANG, str_TYPE, str_NUMERO, dt_DATE, int_MONTANT_HT, str_STATUT, str_PIECE_TYPE, lg_PIECE_ID, str_PIECE_REF, int_PIECE_HT, int_ECART) VALUES"
    + " ('E2E-PG-RL1', 'E2E-PG-REL', 1, 'BL', 'E2EPG1', '2025-02-10', 1000, 'RAPPROCHE', 'BL', 'E2E-PG-1', 'E2EPG1', 1000, 0),"
    + " ('E2E-PG-RL2', 'E2E-PG-REL', 2, 'BL', 'E2EPG9', '2025-02-12', 500, 'ABSENT_PRESTIGE', NULL, NULL, NULL, NULL, NULL);");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    ok('Menu « Pointer les BL / Avoirs »', q("SELECT str_VALUE FROM t_sous_menu WHERE str_COMPOSANT = 'pointagebl'") === 'Pointer les BL / Avoirs');

    /* controle mobile : meme appel que l'application (3 comptes sur 4 recus => 1 ecart) */
    const avant = Date.now();
    const st = await p.evaluate(async () => (await fetch('../api/v1/commande/bon/items/checked-quantities', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'E2E-PG-1-L', checked: true, checkedQuantity: 3 }) })).status);
    const ligne = q("SELECT CONCAT_WS('|', checked, quantite_controle, lg_CONTROLE_USER, DATE_FORMAT(dt_CONTROLE, '%Y-%m-%d')) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = 'E2E-PG-1-L'");
    ok('Contrôle envoyé par l\'application : quantité, qui et quand enregistrés', st === 202 && ligne === '1|3|' + ADMIN + '|' + new Date(avant).toISOString().slice(0, 10), st + ' ' + ligne);

    /* pointage : groupe de grossistes */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('pointagebl', 'Pointer les BL / Avoirs', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('pointagebl').length > 0 && Ext.ComponentQuery.query('pointagebl #groupe')[0].getStore().getCount() > 1, null, { timeout: 30000 });
    ok('Titre de l\'écran « Pointer les BL / Avoirs »', await p.evaluate(() => Ext.getClass(Ext.ComponentQuery.query('pointagebl')[0]).prototype.title === 'Pointer les BL / Avoirs'));
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('pointagebl')[0]; e.down('#du').setValue(new Date(2025, 1, 1)); e.down('#au').setValue(new Date(2025, 1, 28));
      const g = e.down('#groupe'); g.setValue('1'); g.fireEvent('select', g); });
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('pointagebl')[0].pieces; return !s.isLoading() && s.getProxy().getReader().rawData; }, null, { timeout: 60000 });
    await p.waitForTimeout(500);
    const v = await p.evaluate(() => { const e = Ext.ComponentQuery.query('pointagebl')[0];
      return { refs: e.pieces.collect('reference').filter((x) => /^E2EPG/.test(x)).sort(), gris: e.down('#grossiste').isDisabled(),
        controle: (e.pieces.findRecord('reference', 'E2EPG1') || { get: () => '' }).get('controle'),
        cellule: [...e.down('#grillePointage').getView().getEl().dom.querySelectorAll('td')].map((t) => t.textContent).filter((t) => /écart/.test(t)) }; });
    ok('Groupe 1 : pièces des deux grossistes du groupe, grossiste grisé', JSON.stringify(v.refs) === '["E2EPG1","E2EPG2"]' && v.gris, JSON.stringify(v));
    ok('Colonne « Contrôle (appli) » : 1/1, 1 écart, par ' + NOM + ' le …', new RegExp('^1/1 · 1 écart · par ' + NOM + ' le \\d\\d/\\d\\d/\\d{4} \\d\\d:\\d\\d$').test(v.controle) && v.cellule.length >= 1, v.controle);
    const pdf = await p.evaluate(async () => { const r = await fetch('../api/v1/pointage-bl/pdf?groupe=1&du=2025-02-01&au=2025-02-28&etat=TOUS'); const b = new Uint8Array(await r.arrayBuffer());
      return { s: r.status, t: r.headers.get('content-type'), debut: String.fromCharCode.apply(null, b.slice(0, 5)), n: b.length }; });
    ok('Édition PDF de la liste (groupe)', pdf.s === 200 && /pdf/.test(pdf.t) && pdf.debut === '%PDF-' && pdf.n > 1500, JSON.stringify(pdf));
    const sans = await p.evaluate(async () => (await fetch('../api/v1/pointage-bl/pdf?du=2025-02-01&au=2025-02-28')).status);
    ok('Édition sans grossiste ni groupe : refusée proprement (400)', sans === 400, sans);
    const rel = await p.evaluate(async () => { const r = await fetch('../api/v1/pointage-bl/releve/E2E-PG-REL/pdf'); const b = new Uint8Array(await r.arrayBuffer());
      return { s: r.status, debut: String.fromCharCode.apply(null, b.slice(0, 5)), n: b.length }; });
    ok('Édition PDF du rapprochement du relevé', rel.s === 200 && rel.debut === '%PDF-' && rel.n > 1500, JSON.stringify(rel));
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('pointagebl')[0], g = e.down('#groupe'); g.setValue(''); g.fireEvent('select', g); });
    ok('« Aucun groupe » : grossiste de nouveau choisissable', await p.evaluate(() => !Ext.ComponentQuery.query('pointagebl #grossiste')[0].isDisabled()));

    /* etat de controle des achats : meme information */
    const lst = await p.evaluate(async () => (await fetch('../api/v1/etat-control-bon/list?start=0&limit=50&dtStart=2025-02-01&dtEnd=2025-02-28&dateType=LIVRAISON')).json());
    const b1 = (lst.data || []).find((x) => x.strREFLIVRAISON === 'E2EPG1') || {}, b2 = (lst.data || []).find((x) => x.strREFLIVRAISON === 'E2EPG2') || {};
    ok('Contrôle des achats : contrôle de l\'application (qui, quand, écart) sur le BL ; rien sur le BL non contrôlé',
      /^1\/1 · 1 écart · par /.test(b1.controleResume || '') && b1.controlePar === NOM && b1.controleEcarts === 1 && !b2.controleResume, JSON.stringify({ b1: b1.controleResume, b2: b2.controleResume }));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PG-%'") === '0' && q("SELECT COUNT(*) FROM t_releve_grossiste WHERE lg_RELEVE_ID = 'E2E-PG-REL'") === '0');
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
