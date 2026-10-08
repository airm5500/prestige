/* PHARMAML : AVANCEMENT DES COMMANDES (retours du 08/10 (10), REQ_ETAT_COMMANDE / SUIVI_COMMANDE, tableau 11).
 * Faux grossiste local, par la liste des commandes en cours :
 *  - commande jamais envoyee : pas de lien « Où en est-elle ? », demande refusee avec la raison ;
 *  - commande envoyee : lien sur la ligne ; demande REQ_ETAT_COMMANDE avec la reference de la commande envoyee ;
 *    reponse immediate (2 lignes : En cours / Preparee) -> fenetre en lecture seule (etat global = le moins avance,
 *    livraison prevue), pastille « En cours » + « liv. » dans la liste ; lignes enregistrees ; archives suivis/AAAA-MM ;
 *  - service non ouvert chez le grossiste (erreur 0006) : message clair ;
 *  - reponse differee (FIN_SERVICE) : appliquee au vidage, la liste passe « Préparée » ;
 *  - aucune erreur JavaScript ; tout est retire a la fin.
 */
const { execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const archives = require('./archives-pharmaml');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const PORT = 18779, G = '51217123531215794892';
const CMD = 'E2E-AVC-CMD', NON = 'E2E-AVC-NON', CMDS = [CMD, NON];
let P = [], cips = [], sauve = null, depot = null;
const recus = [];
const pad = (n) => String(n).padStart(2, '0');
const MOIS = new Date().getFullYear() + '-' + pad(new Date().getMonth() + 1);

const env = (corps, enRep) => '<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Nature_Action="REP_EMISSION" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>S' + Date.now()
  + '</REF_MESSAGE>' + (enRep ? '<EN_REPONSE_A>' + enRep + '</EN_REPONSE_A>' : '') + '</ENTETE><CORPS>' + corps + '</CORPS></CSRP_ENVELOPPE>';
const msg = (corps) => '<MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS>' + corps + '</CORPS></MESSAGE_REPARTITEUR>';
const suivi = (ref, codes) => msg('<SUIVI_COMMANDE Ref_Suivi="SV1" Ref_Cde_Client="' + ref + '"><NORMALE>' + codes.map((c, i) => '<LIGNE_N Num_Ligne="' + (i + 1)
  + '" Type_Codification="CIP39" Code_Produit="' + cips[i] + '" Quantite="' + (i + 2) + '" Code_Statut="' + c[0] + '" Date_Livraison="' + c[1] + '"' + (c[2] ? ' Commentaire="' + c[2] + '"' : '') + '/>').join('')
  + '</NORMALE></SUIVI_COMMANDE>');
const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  recus.push(b);
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  const ref = (b.match(/Ref_Cde_Client="([^"]*)"/) || [])[1];
  const refMsg = (b.match(/<REF_MESSAGE>([^<]*)</) || [])[1];
  if (/<COMMANDE /.test(b)) {
    const lignes = [...b.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
    rep.end(env(msg('<REP_COMMANDE Ref_Cde_Client="' + ref + '"><NORMALE>' + lignes.map((m) => '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + Number(m[2]) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/></LIGNE_N>').join('')
      + '</NORMALE></REP_COMMANDE>'), refMsg));
    return;
  }
  if (/REQ_ETAT_COMMANDE/.test(b)) {
    if (/\/ferme\//.test(req.url)) { rep.end(env(msg('<ERREUR Statut="0006" Detail="Service non implémenté"/>'), refMsg)); return; }
    if (/\/differe\//.test(req.url)) { depot = env(suivi(ref, [['0003', '2026-10-11'], ['0003', '2026-10-11']]), 'VIDAGE'); rep.end(env('<ACTION>FIN_SERVICE</ACTION>', refMsg)); return; }
    rep.end(env(suivi(ref, [['0002', '2026-10-10', 'En préparation'], ['0003', '2026-10-09']]), refMsg));
    return;
  }
  if (/VIDAGE/.test(b)) { if (depot) { const d = depot; depot = null; rep.end(d); } else { rep.end(env('<ACTION>FIN_SERVICE</ACTION>')); } return; }
  if (/ACQUITTEMENT/.test(b)) { rep.end(env('<ACTION>FIN_SERVICE</ACTION>')); return; }
  rep.end(env('<ACTION>FIN_SERVICE</ACTION>'));
}); });

const liste = (a) => a.map((x) => "'" + x + "'").join(',');
function nettoyer() {
  archives.retirer(/E2E-AVC/);
  exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference IN (" + liste(CMDS) + ")); DELETE FROM rupture WHERE reference IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_avancement WHERE lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ") OR (lg_GROSSISTE_ID = '" + G + "' AND str_SOURCE = 'SUIVI' AND str_STATUT = 'ORPHELINE');"
    + "DELETE FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ") OR lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (" + liste(CMDS) + "); DELETE FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ");");
}
function poser(cmd) {
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + cmd + "', '" + cmd + "', 2, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
  P.forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + cmd + "-" + i + "', '" + cmd + "', '" + p + "', '" + G + "', " + (i + 2) + ", 0, 1000, 2000, 'is_Process', NOW(), NOW())"));
}
const url = (u) => exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (u === null ? 'NULL' : "'" + u + "'") + ", str_PHARMAML_VERSION_CMDE = '1.0.0.0' WHERE lg_GROSSISTE_ID = '" + G + "'");

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  sauve = q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', str_PHARMAML_VERSION_CMDE) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'").split('|');
  const lus = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_CIP) ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, int_CIP, str_NAME FROM t_famille WHERE str_STATUT='enable'"
    + " AND int_CIP REGEXP '^[0-9]{7}$' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = t_famille.int_CIP) = 1"
    + " AND NOT EXISTS (SELECT 1 FROM t_famille_grossiste fg WHERE fg.lg_FAMILLE_ID = t_famille.lg_FAMILLE_ID AND fg.lg_GROSSISTE_ID = '" + G + "') ORDER BY str_NAME LIMIT 2) x").split('|');
  P = lus.map((x) => x.split(':')[0]); cips = lus.map((x) => x.split(':')[1]);
  nettoyer();
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const liste2 = async () => {
    await p.evaluate(() => { Ext.getCmp('rechecher').setValue('E2E-AVC'); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); });
    await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', 'E2E-AVC-CMD') >= 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(500);
    return p.evaluate(() => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; const o = {};
      g.getStore().each((r) => { const n = g.getView().getNode(r); const c = n && n.querySelector('.x-grid-cell-colAvancement'); const inner = c && c.querySelector('.x-grid-cell-inner');
        o[r.get('str_REF_ORDER')] = { pastille: (c && c.querySelector('.avancement-pml') || {}).textContent || '', livraison: (c && c.querySelector('.livraison-prevue') || {}).textContent || '',
          lien: !!(c && c.querySelector('.demander-avancement')), tip: c ? c.getAttribute('data-qtip') : '', coupe: inner ? inner.scrollWidth > inner.clientWidth + 1 : true }; });
      const h = g.down('#colAvancement').getEl().dom.querySelector('.x-column-header-text');
      /* la nouvelle colonne ne doit pas ecraser les autres : en-tetes et chiffres entiers */
      const entetesCoupes = [...g.getEl().dom.querySelectorAll('.x-column-header-text')].filter((x) => x.textContent.trim() && x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent);
      const chiffresCoupes = [...g.getEl().dom.querySelectorAll('.x-grid-row .x-grid-cell-inner')].filter((c) => /^[\d.\s]+$/.test(c.textContent.trim()) && c.scrollWidth > c.clientWidth + 1).map((c) => c.textContent);
      return { o, entete: h.textContent, enteteCoupe: h.scrollWidth > h.clientWidth + 1, entetesCoupes, chiffresCoupes }; });
  };
  const cliquerLien = async () => {
    for (let essai = 0; essai < 5; essai++) {
      await p.evaluate(() => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; const r = g.getStore().getAt(g.getStore().findExact('str_REF_ORDER', 'E2E-AVC-CMD'));
        const a = g.getView().getNode(r).querySelector('.demander-avancement'); if (a) { a.id = 'e2e-avancement'; } });
      try { await p.click('#e2e-avancement', { timeout: 4000 }); return; } catch (e) { if (essai === 4) { throw e; } await p.waitForTimeout(700); }
    }
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    url('http://127.0.0.1:' + PORT + '/ok/');
    poser(CMD); poser(NON);
    const envoi = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/pharma/' + id, { method: 'PUT' })).text()), CMD);
    const refCde = q("SELECT str_REF_CDE FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + CMD + "' AND str_SOURCE = 'COMMANDE'");
    ok('Commande envoyée (référence de commande notée)', envoi.success !== false && refCde.length > 0, JSON.stringify(envoi) + ' ' + refCde);

    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0 && Ext.ComponentQuery.query('i_order_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    let l = await liste2();
    ok('Liste : colonne « Avancement » ; lien « Où en est-elle ? » sur la commande envoyée, rien sur la commande non envoyée', l.entete === 'Avancement' && !l.enteteCoupe && l.o[CMD].lien && !l.o[NON].lien && l.o[NON].pastille === '', JSON.stringify(l));
    ok('Liste : aucun en-tête ni montant tronqué (largeurs rééquilibrées)', l.entetesCoupes.length === 0 && l.chiffresCoupes.length === 0, JSON.stringify({ e: l.entetesCoupes, c: l.chiffresCoupes }));
    const refus = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/pharma/avancement/' + id, { method: 'POST' })).text()), NON);
    ok('Commande non envoyée : demande refusée avec la raison', refus.success === false && /n'a pas été reçue par le grossiste/.test(refus.msg), JSON.stringify(refus));

    /* reponse immediate */
    recus.length = 0;
    await cliquerLien();
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('#fenAvancement')[0]; return w && w.isVisible() && w.down('#grilleAvancement').getView().getNodes().length === 2; }, null, { timeout: 30000 });
    const demande = recus.find((x) => /REQ_ETAT_COMMANDE/.test(x)) || '';
    ok('Demande REQ_ETAT_COMMANDE avec la référence de la commande envoyée et ses 2 lignes', new RegExp('Ref_Cde_Client="' + refCde + '"').test(demande) && (demande.match(/<LIGNE /g) || []).length === 2, demande.slice(0, 300));
    const fen = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenAvancement')[0], el = w.getEl().dom, vp = Ext.getBody().getViewSize();
      const r = { entete: w.down('#enteteAvancement').getEl().dom.textContent, etats: [...el.querySelectorAll('.etat-avancement')].map((e) => e.getAttribute('data-etat')).sort(),
        texte: w.down('#grilleAvancement').getEl().dom.textContent, champs: el.querySelectorAll('input, textarea').length,
        tronques: [...el.querySelectorAll('.x-column-header-text')].filter((h) => h.scrollWidth > h.clientWidth + 1).map((h) => h.textContent),
        dedans: w.getX() >= 0 && w.getY() >= 0 && w.getX() + w.getWidth() <= vp.width && w.getY() + w.getHeight() <= vp.height };
      return r; });
    await p.screenshot({ path: SORTIE + '/avancement-fenetre.png' });
    await p.evaluate(() => Ext.ComponentQuery.query('#fenAvancement')[0].close());
    ok('Fenêtre (lecture seule) : état global « En cours » (le moins avancé), livraison prévue la plus tardive, 2 lignes',
      /^En cours/.test(fen.entete) && /livraison prévue 2026-10-10/.test(fen.entete) && JSON.stringify(fen.etats) === '["EN_COURS","PREPAREE"]' && /En préparation/.test(fen.texte) && fen.champs === 0, JSON.stringify(fen));
    ok('Fenêtre : en-têtes entiers, dans l\'écran', fen.tronques.length === 0 && fen.dedans, JSON.stringify(fen));
    l = await liste2();
    ok('Liste : pastille « En cours » et « liv. 10/10 », info-bulle, cellule non tronquée', l.o[CMD].pastille === 'En cours' && l.o[CMD].livraison === 'liv. 10/10' && /Livraison prévue : 2026-10-10/.test(l.o[CMD].tip) && !l.o[CMD].coupe, JSON.stringify(l.o[CMD]));
    await p.screenshot({ path: SORTIE + '/avancement-liste.png' });
    ok('Base : 2 lignes d\'avancement (codes 0002 / 0003)', q("SELECT GROUP_CONCAT(str_CODE_STATUT ORDER BY str_CODE_STATUT) FROM t_pharmaml_avancement WHERE lg_ORDER_ID = '" + CMD + "'") === '0002,0003');
    const fichiers = archives.fichiers().filter((f) => new RegExp('^suivis/' + MOIS + '/R?E_E2E-AVC-CMD').test(f));
    ok('Archives E_ / RE_ dans suivis/' + MOIS, fichiers.length === 2, JSON.stringify(fichiers));

    /* service non ouvert */
    url('http://127.0.0.1:' + PORT + '/ferme/');
    const ferme = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/pharma/avancement/' + id, { method: 'POST' })).text()), CMD);
    ok('Service non ouvert (erreur 0006) : message clair', ferme.success === false && ferme.serviceFerme === true && /ne propose pas .* le suivi de commande/.test(ferme.msg), JSON.stringify(ferme));

    /* reponse differee, recuperee au vidage */
    url('http://127.0.0.1:' + PORT + '/differe/');
    const diff = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/pharma/avancement/' + id, { method: 'POST' })).text()), CMD);
    ok('Réponse différée (FIN_SERVICE) : demande notée en attente', diff.success === true && diff.enAttente === true
      && q("SELECT COUNT(*) FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + CMD + "' AND str_SOURCE = 'SUIVI' AND str_STATUT = 'EN_ATTENTE'") === '1', JSON.stringify(diff));
    let v = {};
    for (let essai = 0; essai < 3; essai++) {
      v = await p.evaluate(async (g) => JSON.parse(await (await fetch('../api/v1/pharma/reponses?grossiste=' + g, { method: 'POST' })).text()), G);
      if (!/30 secondes/.test(JSON.stringify(v))) { break; }
      await p.waitForTimeout(31000);
    }
    ok('Vidage : le suivi déposé est appliqué, la demande passe traitée', q("SELECT str_STATUT FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + CMD + "' AND str_SOURCE = 'SUIVI' ORDER BY dt_ENVOI DESC LIMIT 1") === 'TRAITEE', JSON.stringify(v).slice(0, 300));
    l = await liste2();
    ok('Liste après vidage : « Préparée », livraison 2026-10-11', l.o[CMD].pastille === 'Préparée' && l.o[CMD].livraison === 'liv. 11/10' && !l.o[CMD].coupe, JSON.stringify(l.o[CMD]));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (sauve[0] === 'NULL' ? 'NULL' : "'" + sauve[0] + "'") + ", str_PHARMAML_VERSION_CMDE = '" + sauve[1] + "' WHERE lg_GROSSISTE_ID = '" + G + "'");
    /* archives de vidage de l'essai */
    archives.fichiers().filter((f) => /^vidages\/.*_TEDISPHARMA\.xml$/.test(f) && fs.statSync(path.join(archives.DOSSIER, f)).mtimeMs >= Date.now() - 20 * 60000)
      .forEach((f) => { if (/E2E-AVC|SV1/.test(fs.readFileSync(path.join(archives.DOSSIER, f), 'utf8'))) { fs.unlinkSync(path.join(archives.DOSSIER, f)); } });
    ok('Données d\'essai retirées, grossiste remis', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ")") === '0'
      && q("SELECT COUNT(*) FROM t_pharmaml_avancement WHERE lg_ORDER_ID IN (" + liste(CMDS) + ")") === '0'
      && q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', str_PHARMAML_VERSION_CMDE) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'") === sauve.join('|'));
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
