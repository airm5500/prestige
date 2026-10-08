/* PHARMAML : STATUT D'ENVOI DES COMMANDES ET EQUIVALENTS PROPOSES (retours du 08/10, points 3 et 5).
 * Faux grossiste local (TEDIS detourne pendant le test) :
 *  - reponse avec une ligne livree et une ligne en rupture accompagnee d'un EQUIVALENT PROPOSE (EP) ;
 *  - liste des commandes : colonne « PharmaML » = Partielle (info-bulle : produits pris en compte / en rupture) ;
 *    commande refusee (HTTP 403) = Refusée ; commande jamais envoyee = vide ;
 *  - archive R_ de la reponse reindentee balise par balise (retours du 08/10, point 2) ;
 *  - ecran « Liste des ruptures » : tableau « Équivalents proposés » ; clic « Accepter » sur la ligne (pas de
 *    fenetre) -> la ligne de rupture passe sur l'equivalent ; « Mémoriser » coche + Refuser -> la proposition
 *    suivante pour le meme couple est refusee automatiquement et n'apparait plus ;
 *  - EL/RL (deja livres) : ajoutes a la commande et notes, jamais proposes ;
 *  - donnees d'essai retirees, grossiste remis.
 */
const { execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const PORT = 18771, G = '51217123531215794892', CMDS = ['E2E-PM5-A', 'E2E-PM5-B', 'E2E-PM5-C', 'E2E-PM5-D'];
const DOSSIER = '/root/prestige/pharmaml';
let P = [], cipEquivalent = '', typeRempl = 'EP';
const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  if (/refus/.test(req.url)) { rep.writeHead(403, { 'Content-Type': 'text/html' }); rep.end('<html>Forbidden</html>'); return; }
  const lignes = [...b.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
  const corps = lignes.map((m, i) => i === 0
    ? '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + Number(m[2]) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/></LIGNE_N>'
    : '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="0"><PRIX_N Nature="PHAHT" Valeur="1400"/><PRIX_N Nature="PUBTC" Valeur="2300"/>'
      + '<INDISPONIBILITE_N Code_Reponse="0005" Additif="Manque Rayon"><PRODUIT_REMPLACANT Type_Remplacement="' + typeRempl + '" Type_Codification="CIP39" Code_Produit="' + cipEquivalent + '" Designation="EQUIVALENT E2E"/></INDISPONIBILITE_N></LIGNE_N>').join('');
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  rep.end('<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>E2E</REF_MESSAGE></ENTETE><CORPS><MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS><REP_COMMANDE><NORMALE>' + corps + '</NORMALE></REP_COMMANDE></CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>');
}); });
const liste = (a) => a.map((x) => "'" + x + "'").join(',');
let sauveUrl = null, fgAvant = '';
function nettoyer() {
  if (fs.existsSync(DOSSIER)) {
    fs.readdirSync(DOSSIER).filter((f) => /E2E-PM5/.test(f)).forEach((f) => fs.unlinkSync(DOSSIER + '/' + f));
  }
  exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference IN (" + liste(CMDS) + ")); DELETE FROM rupture WHERE reference IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (" + liste(CMDS) + "); DELETE FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID IN (" + liste(CMDS) + "); DELETE FROM t_pharmaml_remplacement WHERE lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ") OR lg_ORDER_ID IN (" + liste(CMDS) + ");");
  if (P.length) {
    exec("DELETE FROM t_pharmaml_equivalent_choix WHERE lg_FAMILLE_ID = '" + P[1] + "' AND str_CODE_REMPLACANT = '" + cipEquivalent + "';"
      + "DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '" + P[2] + "' AND lg_GROSSISTE_ID = '" + G + "'" + (fgAvant ? " AND lg_FAMILLE_GROSSISTE_ID NOT IN (" + liste(fgAvant.split(',')) + ")" : '') + ";");
  }
}
function poser(cmd) {
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + cmd + "', '" + cmd + "', 2, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
  P.slice(0, 2).forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + cmd + "-" + i + "', '" + cmd + "', '" + p + "', '" + G + "', " + (i + 2) + ", 0, 1000, 2000, 'is_Process', NOW(), NOW())"));
}
const url = (u) => exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (u === null ? 'NULL' : "'" + u + "'") + " WHERE lg_GROSSISTE_ID = '" + G + "'");

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  sauveUrl = q("SELECT IFNULL(str_URL_PHARMAML, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'");
  const lus = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_CIP) ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, int_CIP, str_NAME FROM t_famille WHERE str_STATUT='enable'"
    + " AND int_CIP REGEXP '^[0-9]{7}$' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = t_famille.int_CIP) = 1 ORDER BY str_NAME LIMIT 3) x").split('|');
  P = lus.map((x) => x.split(':')[0]); cipEquivalent = lus[2].split(':')[1];
  fgAvant = q("SELECT IFNULL(GROUP_CONCAT(lg_FAMILLE_GROSSISTE_ID), '') FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '" + P[2] + "' AND lg_GROSSISTE_ID = '" + G + "'");
  nettoyer();
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const envoyer = (cmd) => p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/pharma/' + id, { method: 'PUT' })).text()), cmd);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });

    /* 1) commande A : une ligne livree, une en rupture avec equivalent propose */
    url('http://127.0.0.1:' + PORT + '/ep/');
    poser(CMDS[0]);
    const rA = await envoyer(CMDS[0]);
    ok('Commande A traitée (1 pris en compte, 1 en rupture)', rA.success !== false && rA.nbrerupture === 1, JSON.stringify(rA));
    const prop = q("SELECT CONCAT(str_TYPE, '|', str_STATUT, '|', str_CODE_REMPLACANT, '|', IF(lg_RUPTURE_DETAIL_ID IS NULL, 'sans', 'avec')) FROM t_pharmaml_remplacement WHERE lg_ORDER_ID = '" + CMDS[0] + "'");
    ok('Équivalent proposé noté (EP, PROPOSE, rattaché à la ligne de rupture)', prop === 'EP|PROPOSE|' + cipEquivalent + '|avec', prop);
    const nouveauxR = (fs.existsSync(DOSSIER) ? fs.readdirSync(DOSSIER) : []).filter((f) => /^R_E2E-PM5-A/.test(f));
    const contenuR = nouveauxR.length ? fs.readFileSync(DOSSIER + '/' + nouveauxR[0], 'utf8') : '';
    ok('Archive R_ réindentée balise par balise (une balise par ligne)', /\n    <MESSAGE_REPARTITEUR/.test(contenuR) && /\n            <LIGNE_N /.test(contenuR) && contenuR.split('\n').length > 10, nouveauxR.join(',') + ' / ' + contenuR.slice(0, 200));

    /* 2) commande B : refus HTTP 403 ; commande C : jamais envoyee */
    url('http://127.0.0.1:' + PORT + '/refus/');
    poser(CMDS[1]);
    const rB = await envoyer(CMDS[1]);
    ok('Commande B refusée (403)', rB.success === false && /403/.test(rB.msg), JSON.stringify(rB));
    poser(CMDS[2]);

    /* Liste des commandes : colonne PharmaML */
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    await p.evaluate(() => { Ext.getCmp('rechecher').setValue('E2E-PM5'); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); });
    await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', 'E2E-PM5-C') >= 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const etats = await p.evaluate(() => { const g = Ext.ComponentQuery.query('i_order_manager')[0], o = {};
      g.getStore().each((r) => { const n = g.getView().getNode(r); const s = n && n.querySelector('.envoi-pml'); const td = s && s.closest('td');
        o[r.get('str_REF_ORDER')] = { code: s ? s.getAttribute('data-envoi') : '', texte: s ? s.textContent : '', tip: td ? td.getAttribute('data-qtip') : '' }; });
      const col = g.down('#colEnvoiPharmaml'); const h = col.getEl().dom.querySelector('.x-column-header-text');
      return { o, entete: col.text, tronque: h ? h.scrollWidth > h.clientWidth + 1 : true }; });
    const A = etats.o[CMDS[0]] || {}, B = etats.o[CMDS[1]] || {}, C = etats.o[CMDS[2]] || {};
    ok('Liste : A « Partielle », info-bulle « 1 produit(s) pris en compte, 1 en rupture sur 2 »', A.code === 'PARTIELLE' && A.texte === 'Partielle' && /1 produit\(s\) pris en compte, 1 en rupture sur 2/.test(A.tip), JSON.stringify(A));
    ok('Liste : B « Refusée », motif HTTP 403 en info-bulle', B.code === 'REFUSEE' && /403/.test(B.tip), JSON.stringify(B));
    ok('Liste : C jamais envoyée → aucune pastille', C.code === '', JSON.stringify(C));
    ok('Liste : en-tête « PharmaML » entier', etats.entete === 'PharmaML' && !etats.tronque, JSON.stringify({ e: etats.entete, t: etats.tronque }));
    await p.screenshot({ path: (process.env.SORTIE || '/tmp') + '/commandes-statut-pharmaml.png' });

    /* 3) Ecran des ruptures : accepter l'equivalent sur la ligne */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('rupturepharma', 'Liste des ruptures', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('rupturepharma #grilleEquivalents')[0]; return g && g.rendered && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const ecran = await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('rupturepharma #grilleEquivalents')[0]; const st = g.getStore(); const i = st.findExact('reference', ref);
      const r = st.getAt(i); const n = g.getView().getNode(r);
      const rup = Ext.ComponentQuery.query('rupturepharma #grilleRuptures')[0];
      return { i, titre: g.title, texte: n ? n.textContent : '', accepter: !!(n && n.querySelector('.eq-accepter')), refuser: !!(n && n.querySelector('.eq-refuser')),
        ruptureVisible: rup && rup.isVisible() && rup.getHeight() > 200, fenetres: Ext.ComponentQuery.query('window[hidden=false]').length }; }, CMDS[0]);
    ok('Écran ruptures : proposition visible (produit commandé, équivalent, Accepter / Refuser), liste des ruptures toujours visible',
      ecran.i >= 0 && /EQUIVALENT E2E/.test(ecran.texte) && ecran.accepter && ecran.refuser && /Équivalents proposés par les grossistes \(\d+\)/.test(ecran.titre) && ecran.ruptureVisible, JSON.stringify(ecran));
    await p.screenshot({ path: (process.env.SORTIE || '/tmp') + '/ruptures-equivalents.png' });
    const idProp = q("SELECT lg_ID FROM t_pharmaml_remplacement WHERE lg_ORDER_ID = '" + CMDS[0] + "'");
    const sel = await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('rupturepharma #grilleEquivalents')[0]; const r = g.getStore().getAt(g.getStore().findExact('reference', ref));
      const a = g.getView().getNode(r).querySelector('.eq-accepter'); a.id = 'e2e-accepter'; return '#e2e-accepter'; }, CMDS[0]);
    await p.click(sel);
    await p.waitForFunction(() => /accepté/.test(Ext.ComponentQuery.query('rupturepharma #infoEquivalent')[0].getEl().dom.textContent), null, { timeout: 20000 });
    const apres = q("SELECT CONCAT(r.str_STATUT, '|', r.str_MODE, '|', d.produitId) FROM t_pharmaml_remplacement r JOIN rupture_detail d ON d.id = r.lg_RUPTURE_DETAIL_ID WHERE r.lg_ID = '" + idProp + "'");
    const fenetres = await p.evaluate(() => Ext.ComponentQuery.query('window[hidden=false]').length + (Ext.MessageBox.isVisible() ? 1 : 0));
    ok('Accepter (clic sur la ligne, sans fenêtre) : la ligne de rupture passe sur l\'équivalent, statut ACCEPTE / MANUEL', apres === 'ACCEPTE|MANUEL|' + P[2] && fenetres === 0, apres + ' fenetres=' + fenetres);
    const restant = await p.evaluate((ref) => { const st = Ext.ComponentQuery.query('rupturepharma #grilleEquivalents')[0].getStore(); return st.isLoading() ? -2 : st.findExact('reference', ref); }, CMDS[0]);
    ok('La proposition traitée disparaît du tableau', restant === -1, restant);
    const deux = await p.evaluate(async (id) => (await fetch('../api/v1/pharma/remplacements/' + id + '?decision=REFUSER', { method: 'POST' })).json(), idProp);
    ok('Seconde décision sur la même proposition refusée (« déjà traitée »)', deux.success === false && /déjà/.test(deux.msg), JSON.stringify(deux));

    /* 4) Memoriser + Refuser, puis proposition suivante refusee automatiquement */
    url('http://127.0.0.1:' + PORT + '/ep/');
    exec("DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + CMDS[3] + "'");
    poser(CMDS[3]);
    await envoyer(CMDS[3]);
    await p.evaluate(() => { Ext.ComponentQuery.query('rupturepharma #grilleEquivalents')[0].getStore().reload(); });
    await p.waitForFunction((ref) => { const st = Ext.ComponentQuery.query('rupturepharma #grilleEquivalents')[0].getStore(); return !st.isLoading() && st.findExact('reference', ref) >= 0; }, CMDS[3], { timeout: 20000 });
    await p.evaluate(() => { Ext.ComponentQuery.query('rupturepharma #memoriserChoix')[0].setValue(true); });
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('rupturepharma #grilleEquivalents')[0]; const r = g.getStore().getAt(g.getStore().findExact('reference', ref));
      g.getView().getNode(r).querySelector('.eq-refuser').id = 'e2e-refuser'; }, CMDS[3]);
    await p.click('#e2e-refuser');
    await p.waitForFunction(() => /refusé/.test(Ext.ComponentQuery.query('rupturepharma #infoEquivalent')[0].getEl().dom.textContent), null, { timeout: 20000 });
    const memo = q("SELECT str_CHOIX FROM t_pharmaml_equivalent_choix WHERE lg_FAMILLE_ID = '" + P[1] + "' AND str_CODE_REMPLACANT = '" + cipEquivalent + "'");
    const produitD = q("SELECT d.produitId FROM t_pharmaml_remplacement r JOIN rupture_detail d ON d.id = r.lg_RUPTURE_DETAIL_ID WHERE r.lg_ORDER_ID = '" + CMDS[3] + "'");
    ok('Refuser + « Mémoriser » : choix REFUSER enregistré, la rupture garde le produit d\'origine', memo === 'REFUSER' && produitD === P[1], memo + ' / ' + produitD);
    /* meme couple de produits, nouvel envoi : refus automatique, rien a decider */
    exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference = '" + CMDS[2] + "'); DELETE FROM rupture WHERE reference = '" + CMDS[2] + "'");
    url('http://127.0.0.1:' + PORT + '/ep/');
    await envoyer(CMDS[2]);
    const auto = q("SELECT CONCAT(str_STATUT, '|', str_MODE) FROM t_pharmaml_remplacement WHERE lg_ORDER_ID = '" + CMDS[2] + "'");
    ok('Couple mémorisé : la proposition suivante est refusée automatiquement (REFUSE / AUTO)', auto === 'REFUSE|AUTO', auto);

    /* 5) EL (deja livre) : ajoute a la commande, jamais propose */
    typeRempl = 'EL';
    exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference = '" + CMDS[1] + "'); DELETE FROM rupture WHERE reference = '" + CMDS[1] + "'");
    url('http://127.0.0.1:' + PORT + '/ep/');
    await envoyer(CMDS[1]);
    const el = q("SELECT CONCAT(str_TYPE, '|', str_STATUT) FROM t_pharmaml_remplacement WHERE lg_ORDER_ID = '" + CMDS[1] + "'");
    const ligneEl = q("SELECT COUNT(*) FROM t_order_detail WHERE lg_ORDER_ID = '" + CMDS[1] + "' AND lg_FAMILLE_ID = '" + P[2] + "'");
    ok('EL (déjà livré) : ajouté à la commande et noté AJOUTE, jamais proposé', el === 'EL|AJOUTE' && ligneEl === '1', el + ' / ' + ligneEl);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    url(sauveUrl === 'NULL' ? null : sauveUrl);
    ok('Données d\'essai retirées, grossiste remis', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ")") === '0'
      && q("SELECT COUNT(*) FROM t_pharmaml_remplacement WHERE lg_ORDER_ID IN (" + liste(CMDS) + ")") === '0'
      && !(fs.existsSync(DOSSIER) && fs.readdirSync(DOSSIER).some((f) => /E2E-PM5/.test(f)))
      && q("SELECT IFNULL(str_URL_PHARMAML, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'") === sauveUrl);
    const n = res.filter((r) => r.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
