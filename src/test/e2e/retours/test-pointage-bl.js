/* POINTAGE BL / AVOIRS ET RAPPROCHEMENT AVEC LE RELEVE (retours du 09/10 (5)).
 * Jeu d'essai (retire a la fin), grossiste TEDIS, septembre 2026 :
 *   BL 900101 (12 491), BL 900102 (65 000, seq 49), BL 900103 (150 000) + retour sur ce BL (20 323), BL 900105 (5 000).
 * Releve PDF (fixtures/releve-e2e-pointage.pdf) : BL 900101 12 491, BL 900102 65 343, AV/BL 900103 1 -20 323,
 *   BL 900104 15 759.
 *  - ecran « Pointage BL / avoirs » : pieces du grossiste et totaux = base ; case « Pointe » enregistree (et retiree) ;
 *    N° de sequence et reference d'avoir saisis dans la liste ; valeur invalide refusee, valeur d'origine remise ;
 *  - import du releve par le bouton : 2 rapproches (BL 900101, avoir 900103), 1 ecart (900102 : 343), 1 absent chez
 *    nous (900104), 2 absents du releve (BL 900103, BL 900105) ; totaux des deux cotes ; compteurs cliquables ;
 *  - « Pointer les pieces rapprochees » : BL 900101 et le retour pointes ; releve conserve et rechargeable ;
 *  - sans le droit P_SM_POINTAGE_BL : donnees refusees ; PDF invalide : message ;
 *  - mise en page : en-tetes et boutons entiers ; aucune erreur JavaScript.
 */
const { execFileSync } = require('child_process');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const G = '51217123531215794892', CMD = 'E2E-PBL-CMD';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID WHERE u.str_LOGIN = 'admin' LIMIT 1");
const BLS = [['E2E-PBL-1', 'TST900101', '2026-09-25', 12491, null], ['E2E-PBL-2', '900102', '2026-09-28', 65000, '49'],
  ['E2E-PBL-3', '900103', '2026-09-16', 150000, null], ['E2E-PBL-5', '900105', '2026-09-20', 5000, null]];
let droit = null;

function nettoyer() {
  exec("DELETE FROM t_releve_grossiste_ligne WHERE lg_RELEVE_ID IN (SELECT lg_RELEVE_ID FROM t_releve_grossiste WHERE str_FICHIER LIKE 'releve-e2e-pointage%');"
    + "DELETE FROM t_releve_grossiste WHERE str_FICHIER LIKE 'releve-e2e-pointage%';"
    + "DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = 'E2E-PBL-R3';"
    + "DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PBL-%';"
    + "DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';");
}

(async () => {
  nettoyer();
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + CMD + "', '" + CMD + "', 0, '" + G + "', '" + ADMIN + "', 'is_Closed', NOW(), NOW(), 0, 1, 0)");
  BLS.forEach(([id, ref, d, ht, seq]) => exec("INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, str_STATUT,"
    + " dt_CREATED, dt_UPDATED, lg_USER_ID, lg_ORDER_ID, str_SEQ_CLIENT) VALUES ('" + id + "', '" + ref + "', '" + d + "', " + ht + ", 0, " + ht + ", 'is_Closed', NOW(), NOW(), '"
    + ADMIN + "', '" + CMD + "', " + (seq ? "'" + seq + "'" : 'NULL') + ")"));
  exec("INSERT INTO t_retour_fournisseur (lg_RETOUR_FRS_ID, str_REF_RETOUR_FRS, dt_DATE, str_STATUT, dt_CREATED, dt_UPDATED, dl_AMOUNT, lg_USER_ID, lg_GROSSISTE_ID, lg_BON_LIVRAISON_ID)"
    + " VALUES ('E2E-PBL-R3', 'E2E-RET-3', '2026-09-15', 'is_Closed', NOW(), NOW(), 20323, '" + ADMIN + "', '" + G + "', 'E2E-PBL-3')");
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  let ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  let p = await ctx.newPage();
  const err = [];
  const connexion = async () => {
    p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
  };
  const ecran = () => 'Ext.ComponentQuery.query("pointagebl")[0]';
  const pieces = () => p.evaluate(() => Ext.ComponentQuery.query('pointagebl')[0].pieces.getRange().map((r) => r.data));
  const charge = () => p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pointagebl')[0]; return e && !e.pieces.isLoading() && /Net HT/.test(e.down('#totauxPointage').getEl().dom.textContent); }, null, { timeout: 30000 });
  try {
    await connexion();
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('pointagebl', 'Pointage BL / avoirs', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pointagebl')[0]; return e && e.isVisible() && e.down('#grossiste').getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.evaluate((g) => { const e = Ext.ComponentQuery.query('pointagebl')[0]; e.down('#du').setValue(new Date(2026, 8, 1)); e.down('#au').setValue(new Date(2026, 8, 30));
      const c = e.down('#grossiste'); c.setValue(g); c.fireEvent('select', c, [c.getStore().findRecord('id', g)]); }, G);
    await charge();
    let l = await pieces();
    const nos = l.filter((x) => /^E2E-PBL/.test(x.id));
    ok('Pièces du grossiste : 4 BL et l\'avoir du retour de l\'essai, montants HT', nos.length === 5 && nos.find((x) => x.id === 'E2E-PBL-R3' && x.type === 'RETOUR' && x.montantHt === -20323)
      && nos.find((x) => x.id === 'E2E-PBL-2' && x.sequence === '49'), JSON.stringify(nos.map((x) => x.type + ' ' + x.reference + ' ' + x.montantHt)));
    const totaux = await p.evaluate(() => Ext.ComponentQuery.query('pointagebl')[0].pieces.getProxy().getReader().rawData);
    const attenduBl = Number(q("SELECT COALESCE(SUM(b.int_MHT), 0) FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID JOIN t_user u ON u.lg_USER_ID = b.lg_USER_ID"
      + " WHERE o.lg_GROSSISTE_ID = '" + G + "' AND u.lg_EMPLACEMENT_ID = (SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = 'admin') AND b.str_STATUT IN ('enable', 'is_Closed')"
      + " AND b.dt_DATE_LIVRAISON >= '2026-09-01' AND b.dt_DATE_LIVRAISON < '2026-10-01'"));
    ok('Total BL du bandeau = base', totaux.totalBl === attenduBl, totaux.totalBl + ' / ' + attenduBl);
    await p.screenshot({ path: SORTIE + '/pointage-bl.png' });

    /* case Pointe */
    const cocher = async (id) => {
      const cell = await p.evaluate((i) => { const g = Ext.ComponentQuery.query('pointagebl #grillePointage')[0], st = g.getStore(), rec = st.findRecord('id', i);
        return g.getView().getCell(rec, g.down('#colPointe')).dom.id; }, id);
      await p.click('#' + cell + ' div'); await p.waitForTimeout(1200);
    };
    await cocher('E2E-PBL-1');
    ok('Case « Pointé » : pointage enregistré (date et opérateur)', q("SELECT CONCAT(dt_POINTAGE IS NOT NULL, '|', lg_POINTAGE_USER) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = 'E2E-PBL-1'") === '1|' + ADMIN);
    await cocher('E2E-PBL-1');
    ok('Décocher : pointage retiré', q("SELECT dt_POINTAGE IS NULL AND lg_POINTAGE_USER IS NULL FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = 'E2E-PBL-1'") === '1');

    /* saisie dans la liste */
    const saisir = async (id, champ, valeur) => {
      await p.evaluate(([i, c, v]) => { const g = Ext.ComponentQuery.query('pointagebl #grillePointage')[0], rec = g.getStore().findRecord('id', i),
        pl = g.plugins[0], col = g.headerCt.getGridColumns().find((x) => x.dataIndex === c); pl.startEdit(rec, col); pl.getActiveEditor().setValue(v); pl.completeEdit(); }, [id, champ, valeur]);
      await p.waitForTimeout(1500);
    };
    await saisir('E2E-PBL-1', 'sequence', '48');
    ok('N° de séquence saisi dans la liste : enregistré', q("SELECT str_SEQ_CLIENT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = 'E2E-PBL-1'") === '48');
    await saisir('E2E-PBL-R3', 'referenceAvoir', 'TST 900103 1');
    ok('Référence d\'avoir saisie dans la liste : enregistrée', q("SELECT str_REF_AVOIR FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = 'E2E-PBL-R3'") === 'TST 900103 1');
    const refus = await p.evaluate(async () => (await fetch('/prestige/api/v1/pointage-bl/sequence/E2E-PBL-1?valeur=' + encodeURIComponent("<script>'x'") , { method: 'PUT' })).json());
    ok('Valeur invalide refusée par le serveur, valeur d\'origine conservée', refus.success === false && q("SELECT str_SEQ_CLIENT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = 'E2E-PBL-1'") === '48', JSON.stringify(refus));

    /* import du releve */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('pointagebl')[0]; e.down('#ongletsPointage').setActiveTab(e.down('#ongletRapprochement')); });
    const input = await p.evaluate(() => Ext.ComponentQuery.query('pointagebl #fichierReleve')[0].fileInputEl.dom.id);
    await p.setInputFiles('#' + input, path.join(__dirname, 'fixtures', 'releve-e2e-pointage.pdf'));
    /* fin de lecture : releve affiche, ou message d'erreur (pas le message d'attente « Lecture du releve... ») */
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pointagebl')[0];
      return e.releveCourant || (Ext.MessageBox.isVisible() && !/Lecture du relevé/.test(Ext.MessageBox.msg.getEl().dom.textContent)); }, null, { timeout: 60000 });
    const rel = await p.evaluate(() => { const e = Ext.ComponentQuery.query('pointagebl')[0]; return e.releveCourant ? { c: e.releveCourant.compteurs, t: e.releveCourant.totaux, lignes: e.releveCourant.data.filter((x) => /9001|E2E/.test(x.numero + x.pieceReference)).map((x) => x.statut + ':' + (x.numero || x.pieceReference) + ':' + x.ecart) } : { msg: Ext.MessageBox.msg.getEl().dom.textContent }; });
    await p.screenshot({ path: SORTIE + '/pointage-releve.png' });
    const vu = (rel.lignes || []).join(' | ');
    ok('Relevé importé : BL 900101 et avoir 900103 rapprochés, 900102 en écart de 343, 900104 absent chez nous',
      /RAPPROCHE:TST 900101/.test(vu) && /RAPPROCHE:TST 900103 1/.test(vu) && /ECART:TST 900102:343/.test(vu) && /ABSENT_PRESTIGE:TST 900104/.test(vu), JSON.stringify(rel));
    ok('BL Prestige de la période absents du relevé : 900103 et 900105', /ABSENT_RELEVE:900103/.test(vu) && /ABSENT_RELEVE:900105/.test(vu), vu);
    ok('Totaux du relevé : BL 93 593, avoirs -20 323', rel.t && rel.t.releveBl === 93593 && rel.t.releveAvoirs === -20323, JSON.stringify(rel.t));
    const filtre = await p.evaluate(() => { const e = Ext.ComponentQuery.query('pointagebl')[0]; e.basculer('RAPPROCHE'); const n = e.lignesReleve.getRange().every((r) => r.get('statut') !== 'RAPPROCHE'); e.basculer('RAPPROCHE'); return n; });
    ok('Compteur cliquable : masquer puis réafficher les rapprochés', filtre);

    /* pointer les rapproches */
    await p.evaluate(() => Ext.ComponentQuery.query('pointagebl #pointerRapproches')[0].btnEl.dom.click());
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && Ext.MessageBox.msgButtons.yes.isVisible(), null, { timeout: 10000 });
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.btnEl.dom.click());
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /pointé/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 15000 });
    await p.evaluate(() => Ext.MessageBox.hide());
    ok('« Pointer les pièces rapprochées » : BL 900101 et le retour pointés, les autres non',
      q("SELECT GROUP_CONCAT(lg_BON_LIVRAISON_ID ORDER BY 1) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PBL-%' AND dt_POINTAGE IS NOT NULL") === 'E2E-PBL-1'
      && q("SELECT dt_POINTAGE IS NOT NULL FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = 'E2E-PBL-R3'") === '1');
    const conserve = await p.evaluate(async (g) => (await fetch('/prestige/api/v1/pointage-bl/releves?grossiste=' + g)).json(), G);
    ok('Relevé conservé et listé', (conserve.data || []).some((x) => x.fichier === 'releve-e2e-pointage.pdf'), JSON.stringify(conserve.data && conserve.data[0]));

    /* PDF invalide */
    const faux = await p.evaluate(async (g) => { const f = new FormData(); f.append('grossiste', g); f.append('releve', new Blob(['pas un pdf'], { type: 'application/pdf' }), 'faux.pdf');
      return (await fetch('/prestige/api/v1/pointage-bl/releve', { method: 'POST', body: f })).text(); }, G);
    ok('Fichier qui n\'est pas un PDF lisible : message, pas d\'erreur serveur', /"success":false/.test(faux), faux.slice(0, 200));

    /* mise en page */
    const mp = await p.evaluate(() => { const e = Ext.ComponentQuery.query('pointagebl')[0]; const coupes = [];
      e.query('grid').forEach((g) => g.headerCt.getGridColumns().forEach((c) => { const i = c.getEl() && c.getEl().dom.querySelector('.x-column-header-inner'); if (i && c.isVisible(true) && i.scrollWidth > i.clientWidth + 1) { coupes.push(c.text); } }));
      const boutons = e.query('button').filter((x) => x.isVisible(true)).filter((x) => { const r = x.getEl().dom.getBoundingClientRect(), t = x.getEl().dom.querySelector('.x-btn-inner'); return r.right > window.innerWidth || (t && t.scrollWidth > t.clientWidth + 1); }).map((x) => x.getText());
      return { coupes, boutons, defil: document.body.scrollWidth > document.body.clientWidth + 1 }; });
    ok('Mise en page : en-têtes et boutons entiers, pas de défilement horizontal', !mp.coupes.length && !mp.boutons.length && !mp.defil, JSON.stringify(mp));

    /* sans le droit */
    droit = q("SELECT CONCAT(rp.lg_ROLE_PRIVILEGE, '|', rp.lg_ROLE_ID, '|', rp.lg_PRIVILEGE_ID) FROM t_role_privelege rp JOIN t_privilege pr ON pr.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
      + " WHERE rp.lg_ROLE_ID = '" + ROLE + "' AND pr.str_NAME = 'P_SM_POINTAGE_BL' LIMIT 1").split('|');
    exec("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + droit[0] + "'");
    await ctx.close(); ctx = await b.newContext({ viewport: { width: 1366, height: 768 } }); p = await ctx.newPage();
    await connexion();
    const interdit = await p.evaluate(async (g) => (await fetch('/prestige/api/v1/pointage-bl?grossiste=' + g)).json(), G);
    ok('Sans le droit : données refusées', interdit.success === false && interdit.interdit === true, JSON.stringify(interdit));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    if (droit && droit.length === 3) {
      exec("INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('" + droit[0] + "', '" + droit[1] + "', '" + droit[2] + "', NOW(), NOW())");
    }
    nettoyer();
    ok('Données d\'essai retirées, droit remis', q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-PBL-%'") === '0'
      && q("SELECT COUNT(*) FROM t_releve_grossiste WHERE str_FICHIER LIKE 'releve-e2e-pointage%'") === '0'
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege pr ON pr.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + ROLE + "' AND pr.str_NAME = 'P_SM_POINTAGE_BL'") === '1');
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + ' OK');
    process.exit(k === res.length ? 0 : 1);
  }
})();
