/* RETOURS DU 08/10 (4) : CLE DU GROSSISTE, DISPONIBILITE TEDIS, EQUIVALENTS PAR RUPTURE.
 * Faux grossiste local (le grossiste d'essai est detourne pendant le test, puis remis) :
 *  - fiche grossiste (Modifier) : la cle saisie est enregistree ; a la reouverture la fiche dit « Clé enregistrée
 *    (n caractères) », « Vérifier » compare une cle saisie (identique / différente) ; la liste affiche « ✓ n car. » ;
 *    la valeur de la cle n'est JAMAIS transmise au navigateur ;
 *  - disponibilite au format TEDIS (fichier RI_ du 08/10 : Code_Reponse et Libelle portes par la ligne) : code 0001
 *    « Produit inconnu » = NON disponible (boule rouge, motif en info-bulle), 0000 = disponible ;
 *  - commande : la rupture porte le motif du grossiste ;
 *  - liste des ruptures : les equivalents proposes sont ceux de la rupture cliquee en haut, et changent au clic ;
 *    « Toutes les ruptures » les montre tous ;
 *  - aucune erreur JavaScript ; tout est retire a la fin.
 */
const { execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const PORT = 18774, G = '51217123531215794892', CLE = 'E2EK7';
const CMD = 'E2E-0810E-DSP', RA = 'E2E-0810E-A', RB = 'E2E-0810E-B', CMDS = [CMD, RA, RB];
const DOSSIER = '/root/prestige/pharmaml';
let P = [], cips = [], sauve = null, fgAvant = '';
const recus = [];

const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  recus.push({ chemin: req.url, xml: b });
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  const env = (corps) => '<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Nature_Action="REP_EMISSION" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>E2E</REF_MESSAGE></ENTETE><CORPS>'
    + '<MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS>' + corps + '</CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>';
  if (/REQ_INFO_PRODUIT/.test(b)) {
    /* format TEDIS : premier produit inconnu (0001), les autres disponibles (0000) */
    const l = [...b.matchAll(/<LIGNE_REQ_INFO_PRODUIT Num_Ligne="(\d+)"[^>]*Code_Produit="([^"]*)"/g)];
    rep.end(env('<REP_INFO_PRODUIT Ref_Reponse_Info="IP_1" Ref_Demande_Info="X">' + l.map((m) => '<LIGNE_REP_INFO_PRODUIT Num_Ligne="' + m[1] + '" Num_Ligne_Demande="' + m[1]
      + '" Type_Codification="CIP39" Code_Produit="' + m[2] + '" Designation="X" Nature="PHAHT" ' + (m[2] === cips[0] ? 'Valeur="0" Code_Reponse="0001" Libelle="Produit inconnu"' : 'Valeur="1040" Code_Reponse="0000" Libelle="Produit disponible"') + '/>').join('')
      + '</REP_INFO_PRODUIT>'));
    return;
  }
  /* commande : 1re ligne livree, 2e en rupture (code 0001 sans texte) avec un equivalent propose */
  const lignes = [...b.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
  rep.end(env('<REP_COMMANDE><NORMALE>' + lignes.map((m, i) => i === 0
    ? '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + Number(m[2]) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/></LIGNE_N>'
    : '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="0"><PRIX_N Nature="PHAHT" Valeur="0"/><INDISPONIBILITE_N Code_Reponse="0004" Additif=""><PRODUIT_REMPLACANT Type_Remplacement="EP" Type_Codification="CIP39" Code_Produit="' + cips[2] + '" Designation="EQUIVALENT E2E"/></INDISPONIBILITE_N></LIGNE_N>').join('')
    + '</NORMALE></REP_COMMANDE>'));
}); });

const liste = (a) => a.map((x) => "'" + x + "'").join(',');
function nettoyer() {
  if (fs.existsSync(DOSSIER)) {
    fs.readdirSync(DOSSIER).filter((f) => /E2E-0810E/.test(f)).forEach((f) => fs.unlinkSync(DOSSIER + '/' + f));
  }
  exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference IN (" + liste(CMDS) + ")); DELETE FROM rupture WHERE reference IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (" + liste(CMDS) + "); DELETE FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID IN (" + liste(CMDS) + "); DELETE FROM t_pharmaml_remplacement WHERE lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ") OR lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_disponibilite_produit WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ");");
  if (P.length) {
    exec("DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '" + P[2] + "' AND lg_GROSSISTE_ID = '" + G + "'" + (fgAvant ? " AND lg_FAMILLE_GROSSISTE_ID NOT IN (" + liste(fgAvant.split(',')) + ")" : '') + ";");
  }
}
function poser(cmd) {
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + cmd + "', '" + cmd + "', 2, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
  P.slice(0, 2).forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + cmd + "-" + i + "', '" + cmd + "', '" + p + "', '" + G + "', " + (i + 2) + ", 0, 1000, 2000, 'is_Process', NOW(), NOW())"));
}

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  sauve = q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', int_PHARMAML_DISPO, '|', str_PHARMAML_VERSION_INFO, '|', IFNULL(str_CLE_RECEPTEUR, 'NULL')) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'").split('|');
  /* produits sans code article chez ce grossiste : le CIP est envoye tel quel */
  const lus = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_CIP) ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, int_CIP, str_NAME FROM t_famille WHERE str_STATUT='enable'"
    + " AND int_CIP REGEXP '^[0-9]{7}$' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = t_famille.int_CIP) = 1"
    + " AND NOT EXISTS (SELECT 1 FROM t_famille_grossiste fg WHERE fg.lg_FAMILLE_ID = t_famille.lg_FAMILLE_ID AND fg.lg_GROSSISTE_ID = '" + G + "') ORDER BY str_NAME LIMIT 3) x").split('|');
  P = lus.map((x) => x.split(':')[0]); cips = lus.map((x) => x.split(':')[1]);
  fgAvant = q("SELECT IFNULL(GROUP_CONCAT(lg_FAMILLE_GROSSISTE_ID), '') FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '" + P[2] + "' AND lg_GROSSISTE_ID = '" + G + "'");
  nettoyer();
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  /* tout ce que le serveur renvoie sur les grossistes : la cle ne doit jamais y figurer */
  const reponsesGrossistes = [];
  p.on('response', async (r) => { if (/grossiste/i.test(r.url())) { try { reponsesGrossistes.push(await r.text()); } catch (e) { /* binaire */ } } });
  const ouvrirFiche = async () => {
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; if (!g || !g.isVisible()) { testextjs.app.getController('App').onLoadNewComponent('grossistemanager', 'Grossistes', ''); } });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; return g && g.getStore && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForFunction((id) => Ext.ComponentQuery.query('grossistemanager')[0].getStore().findExact('lg_GROSSISTE_ID', id) >= 0, G, { timeout: 15000 });
    await p.waitForTimeout(400);
    await p.evaluate((id) => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; g.onEditClick(g, g.getStore().findExact('lg_GROSSISTE_ID', id)); }, G);
    await p.waitForFunction(() => Ext.getCmp('str_CLE_RECEPTEUR') && Ext.getCmp('str_CLE_RECEPTEUR').rendered && Ext.getCmp('etatCle') && Ext.getCmp('etatCle').isVisible()
      && /Clé enregistrée|Aucune clé/.test(Ext.getCmp('etatCle').getEl().dom.textContent), null, { timeout: 20000 });
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* 1) cle du grossiste : saisie + Enregistrer depuis la fiche */
    exec("UPDATE t_grossiste SET str_CLE_RECEPTEUR = NULL WHERE lg_GROSSISTE_ID = '" + G + "'");
    await ouvrirFiche();
    const avant = await p.evaluate(() => Ext.getCmp('etatCle').getEl().dom.textContent);
    ok('Fiche sans clé : « Aucune clé enregistrée »', /Aucune clé enregistrée/.test(avant), avant);
    await p.click('#str_CLE_RECEPTEUR input, #str_CLE_RECEPTEUR-inputEl');
    await p.keyboard.type(CLE);
    const idEnr = await p.evaluate(() => Ext.getCmp('str_CLE_RECEPTEUR').up('window').down('button[text=Enregistrer]').getId());
    await p.click('#' + idEnr);
    let cleBase = '';
    for (let i = 0; i < 40 && cleBase !== CLE; i++) { await p.waitForTimeout(250); cleBase = q("SELECT IFNULL(str_CLE_RECEPTEUR, '') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'"); }
    ok('Clé saisie dans la fiche et enregistrée', cleBase === CLE, cleBase.length);
    await p.waitForTimeout(800);
    await p.evaluate(() => { if (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
    /* liste : coche + longueur */
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; const st = g.getStore(); return !st.isLoading() && st.findExact('lg_GROSSISTE_ID', id) >= 0; }, G, { timeout: 20000 });
    await p.evaluate(() => Ext.ComponentQuery.query('grossistemanager')[0].getStore().reload());
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; const st = g.getStore(); return !st.isLoading() && st.findExact('lg_GROSSISTE_ID', id) >= 0; }, G, { timeout: 20000 });
    await p.waitForTimeout(500);
    const cellule = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; const n = g.getView().getNode(g.getStore().getAt(g.getStore().findExact('lg_GROSSISTE_ID', id)));
      const c = n && n.querySelector('.cle-etat'); const inner = c && c.closest('.x-grid-cell-inner');
      return { texte: c ? c.textContent : '', tip: c ? c.closest('td').getAttribute('data-qtip') : '', coupe: inner ? inner.scrollWidth > inner.clientWidth + 1 : true }; }, G);
    ok('Liste : « ✓ 5 car. » à côté de la coche (longueur de la clé), info-bulle, colonne non tronquée', cellule.texte.replace(/\s+/g, ' ').trim() === '✓ 5 car.' && /5 caractère/.test(cellule.tip) && !cellule.coupe, JSON.stringify(cellule));
    await p.screenshot({ path: SORTIE + '/0810e-liste-grossistes.png' });

    /* reouverture : etat, verification */
    await ouvrirFiche();
    const etat = await p.evaluate(() => ({ texte: Ext.getCmp('etatCle').getEl().dom.textContent, valeur: Ext.getCmp('str_CLE_RECEPTEUR').getValue(), type: Ext.getCmp('str_CLE_RECEPTEUR').inputEl.dom.type }));
    ok('Réouverture : « Clé enregistrée (5 caractère(s)) », champ vide et masqué (la clé n\'est pas renvoyée)', /Clé enregistrée \(5 caractère\(s\)\)/.test(etat.texte) && etat.valeur === '' && etat.type === 'password', JSON.stringify(etat));
    const verifier = async (v) => {
      await p.evaluate(() => { Ext.getCmp('str_CLE_RECEPTEUR').setValue(''); });
      await p.click('#str_CLE_RECEPTEUR-inputEl');
      await p.keyboard.type(v);
      await p.click('#btnVerifierCle');
      await p.waitForFunction(() => /identique|différente/.test(Ext.getCmp('etatCle').getEl().dom.textContent), null, { timeout: 10000 });
      const t = await p.evaluate(() => Ext.getCmp('etatCle').getEl().dom.textContent);
      await p.evaluate(() => Ext.getCmp('etatCle').update(''));
      return t;
    };
    const v1 = await verifier(CLE), v2 = await verifier('AUTRE1');
    ok('« Vérifier » : clé saisie identique reconnue', /La clé saisie est identique/.test(v1), v1);
    ok('« Vérifier » : clé différente signalée (Enregistrer la remplacera)', /La clé saisie est différente : « Enregistrer » la remplacera/.test(v2), v2);
    const etatBox = await p.evaluate(() => { const e = Ext.getCmp('etatCle').getEl().dom.getBoundingClientRect(), w = Ext.getCmp('etatCle').up('window').body.dom.getBoundingClientRect(); return e.right <= w.right + 1 && e.bottom <= w.bottom + 1; });
    ok('Message de la clé visible dans la fiche', etatBox);
    await p.screenshot({ path: SORTIE + '/0810e-fiche-cle.png' });
    await p.evaluate(() => Ext.getCmp('str_CLE_RECEPTEUR').up('window').close());
    ok('La valeur de la clé n\'est jamais renvoyée par le serveur', reponsesGrossistes.length > 0 && reponsesGrossistes.every((t) => t.indexOf(CLE) < 0), reponsesGrossistes.length);

    /* 2) disponibilite au format TEDIS */
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:" + PORT + "/tedis/', int_PHARMAML_DISPO = 1, str_PHARMAML_VERSION_INFO = '1.0.0.0' WHERE lg_GROSSISTE_ID = '" + G + "'");
    poser(CMD);
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0 && Ext.ComponentQuery.query('i_order_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    await p.evaluate((ref) => { Ext.getCmp('rechecher').setValue(ref); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); }, CMD);
    await p.waitForFunction((ref) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', ref) >= 0; }, CMD, { timeout: 30000 });
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF_ORDER', ref)); }, CMD);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    recus.length = 0;
    await p.click('#btn_cmd_dispo_verifier');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Information seulement/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 60000 });
    const resume = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    await p.evaluate(() => Ext.MessageBox.hide());
    await p.waitForTimeout(800);
    const boules = await p.evaluate((f) => { const g = Ext.getCmp('gridpanelID'); const o = {};
      g.getStore().each((r) => { const n = g.getView().getNode(r); const bl = n && n.querySelector('.dispo-boule'); const td = bl && bl.closest('[data-qtip]');
        o[r.get('lg_FAMILLE_ID') === f ? 'inconnu' : 'dispo'] = { couleur: bl ? getComputedStyle(bl).backgroundColor : '', tip: td ? td.getAttribute('data-qtip') : '' }; }); return o; }, P[0]);
    await p.screenshot({ path: SORTIE + '/0810e-dispo-tedis.png' });
    ok('Disponibilité TEDIS : « Produit inconnu » (code 0001) compté NON disponible, l\'autre disponible', /1 disponible\(s\), 1 non disponible\(s\), 0 autre\(s\), 0 sans réponse/.test(resume), resume);
    const inc = boules.inconnu || {}, dsp = boules.dispo || {};
    ok('Colonne DISPO : boule rouge avec « Produit inconnu » en info-bulle ; l\'autre verte', /Produit inconnu/.test(inc.tip) && inc.couleur !== dsp.couleur && inc.couleur !== '' && dsp.couleur !== '', JSON.stringify(boules));
    ok('Base : statut NON et code 0001 enregistrés pour le produit inconnu', q("SELECT CONCAT(str_STATUT, '|', str_CODE_REPONSE, '|', str_LIBELLE) FROM t_disponibilite_produit WHERE lg_SOURCE_ID = '" + CMD + "' AND lg_FAMILLE_ID = '" + P[0] + "'") === 'NON|0001|Produit inconnu');

    /* 3) deux commandes avec un equivalent propose chacune -> deux ruptures */
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:" + PORT + "/cmd/' WHERE lg_GROSSISTE_ID = '" + G + "'");
    poser(RA); poser(RB);
    for (const c of [RA, RB]) { await p.evaluate(async (id) => (await fetch('../api/v1/pharma/' + id, { method: 'PUT' })).text(), c); }
    const motif = q("SELECT GROUP_CONCAT(DISTINCT d.motif) FROM rupture r JOIN rupture_detail d ON d.ruptureId = r.id WHERE r.reference IN ('" + RA + "', '" + RB + "')");
    ok('Rupture sans texte du grossiste : motif lu dans la table des codes (0004 = Manque fabricant)', motif === 'Manque fabricant', motif);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('rupturepharma', 'Liste des ruptures', ''));
    await p.waitForFunction((refs) => { const g = Ext.ComponentQuery.query('rupturepharma #grilleRuptures')[0]; const e = Ext.ComponentQuery.query('rupturepharma #grilleEquivalents')[0];
      return g && g.rendered && !g.getStore().isLoading() && refs.every((r) => g.getStore().findExact('reference', r) >= 0) && e && !e.getStore().isLoading(); }, [RA, RB], { timeout: 30000 });
    await p.waitForTimeout(600);
    const equivalents = () => p.evaluate(() => { const e = Ext.ComponentQuery.query('rupturepharma #grilleEquivalents')[0]; const refs = []; e.getStore().each((r) => refs.push(r.get('reference')));
      return { refs, titre: e.title, lignes: e.getView().getNodes().length }; });
    const tous = await equivalents();
    ok('Sans rupture choisie : tous les équivalents (A et B), rappel de cliquer une rupture', tous.refs.includes(RA) && tous.refs.includes(RB) && /cliquez une rupture/.test(tous.titre), JSON.stringify(tous));
    const cliquer = async (ref) => {
      await p.evaluate((r) => { const g = Ext.ComponentQuery.query('rupturepharma #grilleRuptures')[0]; const n = g.getView().getNode(g.getStore().getAt(g.getStore().findExact('reference', r)));
        n.querySelectorAll('.x-grid-cell-inner')[1].id = 'e2e-rupt-' + r; }, ref);
      await p.click('#e2e-rupt-' + ref);
      await p.waitForTimeout(400);
      return equivalents();
    };
    const a = await cliquer(RA);
    ok('Clic sur la rupture A : seuls ses équivalents, titre avec la référence', a.refs.length === 1 && a.refs[0] === RA && a.lignes === 1 && new RegExp('rupture ' + RA + ' \\(1 sur').test(a.titre), JSON.stringify(a));
    const bb = await cliquer(RB);
    ok('Clic sur la rupture B : la section change aussitôt (seuls ceux de B)', bb.refs.length === 1 && bb.refs[0] === RB, JSON.stringify(bb));
    const repere = await p.evaluate(() => { const g = Ext.ComponentQuery.query('rupturepharma #grilleRuptures')[0];
      return [...g.getEl().dom.querySelectorAll('.rupture-choisie')].map((n) => { const r = g.getView().getRecord(n.closest('.x-grid-row, .x-grid-wrap-row') || n); return r ? r.get('reference') : n.className; }); });
    ok('La rupture choisie est repérée dans la liste du haut', repere.length === 1 && repere[0] === RB, JSON.stringify(repere));
    await p.screenshot({ path: SORTIE + '/0810e-equivalents-par-rupture.png' });
    const idToutes = await p.evaluate(() => Ext.ComponentQuery.query('rupturepharma #toutesRuptures')[0].getId());
    await p.click('#' + idToutes);
    await p.waitForTimeout(300);
    const t2 = await equivalents();
    ok('« Toutes les ruptures » : de nouveau tous les équivalents', t2.refs.includes(RA) && t2.refs.includes(RB), JSON.stringify(t2));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (sauve[0] === 'NULL' ? 'NULL' : "'" + sauve[0] + "'") + ", int_PHARMAML_DISPO = " + sauve[1] + ", str_PHARMAML_VERSION_INFO = '" + sauve[2]
      + "', str_CLE_RECEPTEUR = " + (sauve[3] === 'NULL' ? 'NULL' : "'" + sauve[3] + "'") + " WHERE lg_GROSSISTE_ID = '" + G + "'");
    ok('Données d\'essai retirées, grossiste remis (adresse, disponibilité, version, clé)', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ")") === '0'
      && q("SELECT COUNT(*) FROM t_pharmaml_remplacement WHERE lg_ORDER_ID IN (" + liste(CMDS) + ")") === '0'
      && q("SELECT COUNT(*) FROM rupture WHERE reference IN (" + liste(CMDS) + ")") === '0'
      && q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', int_PHARMAML_DISPO, '|', str_PHARMAML_VERSION_INFO, '|', IFNULL(str_CLE_RECEPTEUR, 'NULL')) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'") === sauve.join('|'));
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
