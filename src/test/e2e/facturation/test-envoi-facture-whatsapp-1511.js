/* DEMANDE DU 15/11 : WhatsApp comme mode d'envoi des factures (fiche du tiers payant), a cote de l'email.
 *
 * Par l'ecran (compte e2e), sur un tiers payant qui a plusieurs factures et sur un organisme temoin en impression :
 *  - fiche (GESTION DES TIERS-PAYANTS > Tiers-payants > Modifier) : « Envoi des factures » = WhatsApp sans numero, puis
 *    avec un numero invalide : refus sous le champ, rien n'est ecrit ; avec un numero mobile valide : enregistre ; la
 *    fiche rouverte relit le mode et le numero ;
 *  - liste des factures (FACTURATION > Factures) : colonne « Envoi » ; premier clic : confirmation dans le bouton, sans
 *    fenetre ; sans second clic en 10 s, rien n'est ecrit ni envoye ; deux clics : la facture part en document PDF au
 *    numero de la fiche ; seconde facture, puis renvoi : un envoi de plus a chaque fois ;
 *  - envoi reel vers un service WhatsApp Web d'essai lance par le test (compte WEB de la base d'essai pointe sur lui,
 *    jeton d'essai propre au test) : le service recoit le numero (225 + 10 chiffres), la legende et le PDF ;
 *  - rapprochement : cellule (date, statut) = journal des factures (t_facture_envoi) = journal WhatsApp (origine
 *    FACTURE, statut, utilisateur) = fil de discussion du numero (document, nom du fichier) = message recu par le
 *    service (numero, nom et taille du PDF, legende avec numero de facture et montant net de la liste) ; PDF envoye =
 *    PDF imprime par l'ecran ;
 *  - compte en mode API : refus journalise (« WhatsApp Web seulement »), rien ne part ; compte en mode test : envoi
 *    simule (« Simulée le … »), rien ne part ;
 *  - bilan : un envoi = une ligne de journal des factures, une du journal WhatsApp, une du fil, un message ; les
 *    factures sont inchangees.
 * Nettoyage : fiche, compte WhatsApp et mode par defaut remis a l'identique ; journaux, fil et traces du test retires.
 *
 * node src/test/e2e/facturation/test-envoi-facture-whatsapp-1511.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const editions = require('../support/editions');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' })
  .replace(/\r/g, '').trim();
const ligne = (table, where) => {
  const t = execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-B', '--raw', '-e', 'SELECT * FROM ' + table + ' WHERE ' + where], { encoding: 'utf8' })
    .replace(/\r/g, '').split('\n').filter((x) => x !== '');
  if (t.length < 2) { return null; }
  const cols = t[0].split('\t'), vals = t[1].split('\t'), o = {};
  cols.forEach((c, i) => { o[c] = vals[i]; });
  return o;
};
const sql = (v) => (v === 'NULL' || v === undefined || v === null ? 'NULL' : "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'");
const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
/* numeros masques dans les sorties */
const masquer = (t) => String(t).replace(/(225)?(0[157])\d{6}(\d{2})/g, (m, i, a, b) => (i || '') + a + '******' + b);

const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const MOBILE = '07 00 00 15 11', NUMERO = '2250700001511', LOCAL = '0700001511';
const JETON = crypto.randomBytes(18).toString('hex');

/* organisme d'essai : au moins deux factures de 2 a 30 bons, modele Jasper ; organisme temoin : un autre */
const [TP, TP_NOM] = q("SELECT CONCAT_WS('|', t.lg_TIERS_PAYANT_ID, t.str_NAME) FROM t_tiers_payant t JOIN t_facture f ON f.str_CUSTOMER = t.lg_TIERS_PAYANT_ID"
  + " JOIN t_model_facture m ON m.lg_MODEL_FACTURE_ID = t.lg_MODEL_FACTURE_ID WHERE m.model_facture_dynamique_id IS NULL AND f.int_NB_DOSSIER BETWEEN 2 AND 30"
  + " AND t.str_STATUT = 'enable' AND t.str_NAME REGEXP '^[A-Z ]+$' GROUP BY t.lg_TIERS_PAYANT_ID HAVING COUNT(*) >= 2 ORDER BY MAX(f.dt_DATE_FACTURE) DESC LIMIT 1").split('|');
const FACTURES = q("SELECT GROUP_CONCAT(CONCAT_WS('|', lg_FACTURE_ID, str_CODE_FACTURE, ROUND(dbl_MONTANT_CMDE), DATE_FORMAT(dt_CREATED, '%d/%m/%Y')) ORDER BY dt_DATE_FACTURE DESC SEPARATOR ';')"
  + " FROM (SELECT * FROM t_facture WHERE str_CUSTOMER = '" + TP + "' AND int_NB_DOSSIER BETWEEN 2 AND 30 ORDER BY dt_DATE_FACTURE DESC LIMIT 2) x")
  .split(';').map((x) => { const [id, code, net, cree] = x.split('|'); return { id, code, net: Number(net), cree }; });
const TEMOIN = (() => { const [id, code, cree] = q("SELECT CONCAT_WS('|', f.lg_FACTURE_ID, f.str_CODE_FACTURE, DATE_FORMAT(f.dt_CREATED, '%d/%m/%Y')) FROM t_facture f JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = f.str_CUSTOMER"
  + " WHERE f.str_CUSTOMER <> '" + TP + "' AND t.str_MODE_ENVOI_FACTURE = 'IMPRESSION' AND f.int_NB_DOSSIER > 0 AND f.str_STATUT = 'enable' ORDER BY f.dt_DATE_FACTURE DESC LIMIT 1").split('|'); return { id, code, cree }; })();
const FICHE_AVANT = ligne('t_tiers_payant', "lg_TIERS_PAYANT_ID = '" + TP + "'");
const FACTURES_AVANT = FACTURES.map((f) => ligne('t_facture', "lg_FACTURE_ID = '" + f.id + "'"));
/* compte WhatsApp Web : sauvegarde DANS la base d'essai (les secrets ne sortent pas de la base) ; comparaison par
   empreinte de la ligne entiere */
const SAUVEGARDE = 'e2e_wa_compte_1511';
const empreinteCompte = () => q("SELECT MD5(CONCAT_WS('|', mode, actif, mode_test, IFNULL(api_version,''), IFNULL(phone_number_id,''), IFNULL(waba_id,''), IFNULL(access_token,''),"
  + " IFNULL(verify_token,''), IFNULL(app_secret,''), IFNULL(modele_nom,''), IFNULL(modele_langue,''), IFNULL(web_url,''), IFNULL(web_jeton,''), IFNULL(updated_at,''), IFNULL(updated_by,''),"
  + " IFNULL(web_regles,''), IFNULL(sante,''), IFNULL(sante_raison,''), IFNULL(sante_maj,''), IFNULL(web_repertoire,''))) FROM whatsapp_compte WHERE mode = 'WEB'");
const COMPTE_AVANT = empreinteCompte();
q('DROP TABLE IF EXISTS ' + SAUVEGARDE);
q('CREATE TABLE ' + SAUVEGARDE + " AS SELECT * FROM whatsapp_compte WHERE mode = 'WEB'");
const DEFAUT_AVANT = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'");
const IDS = "'" + FACTURES.map((f) => f.id).concat([TEMOIN.id]).join("','") + "'";
const journal = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', lg_FACTURE_ID, str_MODE, str_STATUT, str_DESTINATAIRE, IFNULL(int_TAILLE, ''), IFNULL(str_FICHIER, ''), DATE_FORMAT(dt_CREATED, '%d/%m/%Y %H:%i:%s'), lg_USER_ID, IFNULL(str_ERREUR, '')) ORDER BY dt_CREATED, id SEPARATOR '§'), '')"
  + ' FROM t_facture_envoi WHERE lg_FACTURE_ID IN (' + IDS + ") AND dt_CREATED >= '" + DEBUT + "'").split('§').filter(Boolean).map((x) => x.split('|'));
const journalWa = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', telephone, mode, simule, statut, IFNULL(origine, ''), IFNULL(utilisateur_id, ''), IFNULL(message_id, '')) ORDER BY created_at, id SEPARATOR '§'), '')"
  + " FROM whatsapp_message WHERE created_at >= '" + DEBUT + "' AND telephone = '" + LOCAL + "'").split('§').filter(Boolean).map((x) => x.split('|'));
const fil = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', sens, type, IFNULL(piece_nom, ''), statut, IFNULL(lg_USER_ID, ''), IFNULL(message_id, '')) ORDER BY created_at, id SEPARATOR '§'), '')"
  + " FROM whatsapp_discussion WHERE created_at >= '" + DEBUT + "' AND numero = '" + LOCAL + "'").split('§').filter(Boolean).map((x) => x.split('|'));
const texteDuPdf = (octets, nom) => { const f = path.join(os.tmpdir(), 'e2e-1511-wa-' + nom + '.pdf'); fs.writeFileSync(f, octets);
  try { return execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }); } finally { fs.unlinkSync(f); } };
const pagesDuPdf = (octets) => { const f = path.join(os.tmpdir(), 'e2e-1511-wa-pages.pdf'); fs.writeFileSync(f, octets);
  try { return Number((execFileSync('pdfinfo', [f], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/) || [])[1]); } finally { fs.unlinkSync(f); } };

/* service WhatsApp Web d'essai : garde chaque message recu (numero, legende, piece) et rend un identifiant */
const RECUS = [];
const service = http.createServer((req, rep) => {
  let corps = '';
  req.on('data', (c) => { corps += c; });
  req.on('end', () => {
    if (req.method === 'POST' && /\/messages$/.test(req.url)) {
      const autorise = req.headers.authorization === 'Bearer ' + JETON;
      let m = {};
      try { m = JSON.parse(corps); } catch (e) { /* corps illisible */ }
      RECUS.push({ autorise, to: m.to, text: m.text, media: m.media });
      rep.writeHead(autorise ? 200 : 401, { 'Content-Type': 'application/json' });
      rep.end(JSON.stringify(autorise ? { id: 'E2E-WA-' + RECUS.length } : { error: 'jeton' }));
      return;
    }
    rep.writeHead(200, { 'Content-Type': 'application/json' });
    rep.end('{}');
  });
});

function nettoyer() {
  const cols = Object.keys(FICHE_AVANT).filter((c) => c !== 'lg_TIERS_PAYANT_ID');
  q('UPDATE t_tiers_payant SET ' + cols.map((c) => '`' + c + '` = ' + sql(FICHE_AVANT[c])).join(', ') + " WHERE lg_TIERS_PAYANT_ID = '" + TP + "'");
  q('UPDATE whatsapp_compte w JOIN ' + SAUVEGARDE + ' s ON s.mode = w.mode SET w.actif = s.actif, w.mode_test = s.mode_test, w.web_url = s.web_url, w.web_jeton = s.web_jeton,'
    + ' w.updated_at = s.updated_at, w.updated_by = s.updated_by, w.sante = s.sante, w.sante_raison = s.sante_raison, w.sante_maj = s.sante_maj');
  if (empreinteCompte() === COMPTE_AVANT) { q('DROP TABLE IF EXISTS ' + SAUVEGARDE); }
  q("UPDATE t_parameters SET str_VALUE = " + sql(DEFAUT_AVANT) + " WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'");
  q('DELETE FROM t_facture_envoi WHERE lg_FACTURE_ID IN (' + IDS + ") AND dt_CREATED >= '" + DEBUT + "'");
  q("DELETE FROM whatsapp_message WHERE created_at >= '" + DEBUT + "' AND telephone = '" + LOCAL + "'");
  q("DELETE FROM whatsapp_discussion WHERE created_at >= '" + DEBUT + "' AND numero = '" + LOCAL + "'");
  q("DELETE FROM t_event_log WHERE lg_USER_ID = '" + U + "' AND dt_CREATED >= '" + DEBUT + "'");
}

(async () => {
  ok('Préparation : organisme avec deux factures, organisme témoin en impression, compte WhatsApp Web de la base d\'essai', !!TP && FACTURES.length === 2 && !!TEMOIN.id && !!COMPTE_AVANT,
    TP_NOM + ' ' + FACTURES.map((f) => f.code).join(',') + ' / témoin ' + TEMOIN.code);
  await new Promise((r) => service.listen(0, '127.0.0.1', r));
  const PORT = service.address().port;
  /* compte WEB actif, hors mode test, pointe sur le service d'essai ; mode par defaut : WEB */
  const compteEssai = (modeTest) => q("UPDATE whatsapp_compte SET actif = 1, mode_test = " + (modeTest ? 1 : 0) + ", web_url = 'http://127.0.0.1:" + PORT + "', web_jeton = '" + JETON + "' WHERE mode = 'WEB'");
  const modeDefaut = (m) => q("UPDATE t_parameters SET str_VALUE = '" + m + "' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'");
  compteEssai(false);
  modeDefaut('WEB');

  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue()));
  const fermerVolet = () => p.mouse.click(1550, 870);
  const message = async (bouton) => {
    const fin = Date.now() + 30000; let t = '';
    while (Date.now() < fin) { t = await vues.texteMessage(p); if (t && !/patienter|cours de traitement/i.test(t)) { break; } t = ''; await p.waitForTimeout(250); }
    if (t && bouton) { await vues.repondre(p, bouton).catch(() => {}); await p.waitForTimeout(400); }
    return t.replace(/\s+/g, ' ');
  };

  /* fiche du tiers payant, par la liste */
  const ouvrirFiche = async () => {
    await vues.ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Tiers-payants');
    await fermerVolet();
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await vues.saisir(p, '#rechecher', TP_NOM);
    await p.locator('.x-panel .x-btn').filter({ visible: true }).filter({ hasText: /^\s*rechercher\s*$/ }).first().click();
    for (let essai = 0; ; essai++) {
      await p.waitForTimeout(600);
      await p.waitForFunction((id) => { const s = Ext.ComponentQuery.query('tierspayantmanager')[0].getStore(); return !s.isLoading() && s.findExact('lg_TIERS_PAYANT_ID', id) >= 0; }, TP, { timeout: 30000 });
      const noeud = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('tierspayantmanager')[0]; return g.getView().getNode(g.getStore().findExact('lg_TIERS_PAYANT_ID', id)).id; }, TP);
      try { await p.locator('#' + noeud + ' img[data-qtip="Modifier"]').first().click({ timeout: 5000 }); break; } catch (e) { if (essai >= 3) { throw e; } }
    }
    await p.waitForFunction(() => Ext.getCmp('str_MODE_ENVOI_FACTURE') && Ext.getCmp('str_MOBILE') && Ext.getCmp('str_MOBILE').getValue() !== undefined, null, { timeout: 30000 });
    await p.waitForTimeout(800);
  };
  const montrer = async (champ) => {
    const onglet = await p.evaluate((c) => { const f = Ext.getCmp(c); const t = f.up('tabpanel'); if (!t) { return null; }
      const pan = t.items.items.find((x) => x.contains && x.contains(f)); return pan && pan.tab ? pan.tab.getId() : null; }, champ);
    if (onglet) { await p.click('#' + onglet); await p.waitForTimeout(300); }
  };
  const fiche = () => p.evaluate(() => ({ mode: Ext.getCmp('str_MODE_ENVOI_FACTURE').getValue(), libelle: Ext.getCmp('str_MODE_ENVOI_FACTURE').getRawValue(),
    mobile: Ext.getCmp('str_MOBILE').getValue(), valide: Ext.getCmp('str_MODE_ENVOI_FACTURE').isValid(), erreur: String(Ext.getCmp('str_MODE_ENVOI_FACTURE').getActiveError() || '') }));
  const enregistrer = async () => { await p.locator('.x-window .x-btn').filter({ visible: true }).filter({ hasText: /^\s*Enregistrer\s*$/ }).first().click(); };
  const fermerFiche = async () => { await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible(true) && w.down && w.down('#str_MOBILE')).forEach((w) => w.close())); };

  /* liste des factures */
  const cellule = (code) => p.evaluate((c) => { const g = Ext.getCmp('facturemanagerID'); const r = g.getStore().findRecord('str_CODE_FACTURE', c, 0, false, true, true); if (!r) { return null; }
    const i = g.getStore().indexOf(r), n = g.getView().getNode(i), b = n && n.querySelector('.fm-btn'), info = n && n.querySelector('.fm-info');
    return { texte: b ? b.textContent : (info ? info.textContent : ''), cls: b ? b.className : '', statut: r.get('envoiStatut'), mode: r.get('envoiMode'), date: r.get('envoiDate'),
      dest: r.get('envoiDestinataire'), erreur: r.get('envoiErreur'), net: r.get('dbl_MONTANT_CMDE') }; }, code);
  const boutonEnvoi = (code) => p.locator('#facturemanagerID .x-grid-row').filter({ hasText: code }).first().locator('.fm-btn');
  const ouvrirFactures = async () => {
    await vues.ouvrirMenu(p, 'FACTURATION', 'Factures');
    await fermerVolet();
    await p.waitForFunction(() => Ext.getCmp('facturemanagerID') && Ext.getCmp('rechecherFacture') && Ext.getCmp('rechecherFacture').isVisible(true), null, { timeout: 60000 });
  };
  const chercherFacture = async (code, cree) => {
    await vues.saisir(p, '#datedebut', cree);
    await vues.saisir(p, '#datefin', cree);
    await vues.saisir(p, '#rechecherFacture', '');
    await p.locator('.x-btn').filter({ visible: true }).filter({ hasText: /^\s*rechercher\s*$/ }).first().click();
    await p.waitForFunction((c) => { const s = Ext.getCmp('facturemanagerID').getStore(); return !s.isLoading() && !!s.findRecord('str_CODE_FACTURE', c, 0, false, true, true); }, code, { timeout: 30000 });
  };
  const envoyer = async (code) => {
    await boutonEnvoi(code).click();
    await boutonEnvoi(code).click();
    await p.waitForFunction((c) => { const g = Ext.getCmp('facturemanagerID'); const r = g.getStore().findRecord('str_CODE_FACTURE', c, 0, false, true, true);
      return r && !r.etatEnvoi && (r.get('envoiStatut') || r.refusEnvoi); }, code, { timeout: 120000 });
    return cellule(code);
  };

  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* reference du bilan : fiche enregistree sans rien changer (ne reecrit plus rien depuis le 15/11) */
    await ouvrirFiche();
    await enregistrer();
    await message('ok');
    await fermerFiche();
    const FICHE_REF = ligne('t_tiers_payant', "lg_TIERS_PAYANT_ID = '" + TP + "'");

    /* 1. fiche : WhatsApp sans numero, puis numero invalide : refus sous le champ, rien d'ecrit */
    await ouvrirFiche();
    await vues.saisir(p, '#str_MOBILE', '');
    await montrer('str_MODE_ENVOI_FACTURE');
    await vues.choisir(p, '#str_MODE_ENVOI_FACTURE', 'WhatsApp');
    const f0 = await fiche();
    await enregistrer();
    const m0 = await message('ok');
    ok('Fiche : WhatsApp sans numéro : refus sous le champ, rien n\'est écrit', !f0.valide && /renseignez le numéro mobile/.test(f0.erreur)
      && JSON.stringify(ligne('t_tiers_payant', "lg_TIERS_PAYANT_ID = '" + TP + "'")) === JSON.stringify(FICHE_REF), JSON.stringify(f0) + ' | ' + m0);
    await montrer('str_MOBILE');
    await vues.saisir(p, '#str_MOBILE', '27 22 44 55 66');
    await montrer('str_MODE_ENVOI_FACTURE');
    const f1 = await fiche();
    await enregistrer();
    const m1 = await message('ok');
    ok('Fiche : WhatsApp avec un numéro fixe : refus sous le champ, rien n\'est écrit', !f1.valide && /numéro mobile invalide/.test(f1.erreur)
      && JSON.stringify(ligne('t_tiers_payant', "lg_TIERS_PAYANT_ID = '" + TP + "'")) === JSON.stringify(FICHE_REF), masquer(JSON.stringify(f1)) + ' | ' + m1);

    /* 2. numero mobile valide : enregistre */
    await montrer('str_MOBILE');
    await vues.saisir(p, '#str_MOBILE', MOBILE);
    await montrer('str_MODE_ENVOI_FACTURE');
    const f2 = await fiche();
    await enregistrer();
    const m2 = await message('ok');
    const apres2 = ligne('t_tiers_payant', "lg_TIERS_PAYANT_ID = '" + TP + "'");
    ok('Fiche : numéro mobile, WhatsApp : enregistré (mode et numéro en base)', f2.valide && apres2.str_MODE_ENVOI_FACTURE === 'WHATSAPP' && String(apres2.str_MOBILE).replace(/\D/g, '') === LOCAL, m2 + ' | ' + apres2.str_MODE_ENVOI_FACTURE);
    const changees = Object.keys(FICHE_REF).filter((c) => FICHE_REF[c] !== apres2[c]);
    ok('Bilan de la fiche : seuls le mode, le numéro mobile et la date de mise à jour changent', changees.every((c) => ['str_MODE_ENVOI_FACTURE', 'str_MOBILE', 'dt_UPDATED'].indexOf(c) >= 0), changees.join(', '));
    await fermerFiche();
    await ouvrirFiche();
    const f3 = await fiche();
    ok('Rapprochement : la fiche rouverte relit le mode et le numéro de la base', f3.mode === 'WHATSAPP' && /WhatsApp/.test(f3.libelle) && f3.mobile === apres2.str_MOBILE, masquer(JSON.stringify(f3)));
    await fermerFiche();

    /* 3. liste des factures : confirmation dans le bouton, puis envoi */
    await ouvrirFactures();
    const entete = await p.evaluate(() => Ext.getCmp('facturemanagerID').columns.map((c) => c.text).filter((t) => /^Envoi/.test(t)));
    await chercherFacture(FACTURES[0].code, FACTURES[0].cree);
    const c0 = await cellule(FACTURES[0].code);
    ok('Liste : colonne « Envoi » ; la facture de l\'organisme en WhatsApp propose « Envoyer » (bouton WhatsApp)', JSON.stringify(entete) === '["Envoi"]' && c0 && /Envoyer/.test(c0.texte) && /fm-whatsapp/.test(c0.cls),
      JSON.stringify(entete) + ' ' + JSON.stringify(c0));
    await boutonEnvoi(FACTURES[0].code).click();
    const c1 = await cellule(FACTURES[0].code);
    const fen1 = await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible(true) && w.xtype !== 'tooltip' && w.xtype !== 'quicktip').length);
    ok('Premier clic : le bouton demande confirmation, aucune fenêtre', /Confirmer l'envoi/.test(c1.texte) && fen1 === 0 && (await vues.texteMessage(p)) === '', JSON.stringify(c1) + ' fenêtres=' + fen1);
    await p.waitForTimeout(10800);
    const c2 = await cellule(FACTURES[0].code);
    ok('Sans second clic en 10 s : le bouton revient, rien n\'est écrit ni envoyé', /Envoyer/.test(c2.texte) && journal().length === 0 && journalWa().length === 0 && RECUS.length === 0, c2.texte);

    const e1 = await envoyer(FACTURES[0].code);
    const j1 = journal(), w1 = journalWa(), d1 = fil();
    ok('Deux clics : la facture part, la cellule dit « Envoyée le … »', e1.statut === 'ENVOYEE' && e1.mode === 'WHATSAPP' && /Envoyée le/.test(e1.texte), masquer(JSON.stringify(e1)));
    ok('Bilan de l\'envoi : une ligne au journal des factures, une au journal WhatsApp, une dans le fil, un message reçu',
      j1.length === 1 && w1.length === 1 && d1.length === 1 && RECUS.length === 1, j1.length + ' / ' + w1.length + ' / ' + d1.length + ' / ' + RECUS.length);
    const r1 = RECUS[0] || {}, pdf1 = r1.media ? Buffer.from(r1.media.base64, 'base64') : Buffer.alloc(0);
    ok('Rapprochement journal des factures : WHATSAPP, ENVOYEE, numéro de la fiche, compte e2e ; date = cellule',
      j1[0] && j1[0][0] === FACTURES[0].id && j1[0][1] === 'WHATSAPP' && j1[0][2] === 'ENVOYEE' && j1[0][3] === NUMERO && j1[0][7] === U && e1.date === j1[0][6] && e1.dest === NUMERO,
      masquer(JSON.stringify(j1[0] && j1[0].slice(0, 8))));
    ok('Rapprochement journal WhatsApp : origine FACTURE, mode WEB, envoyé (non simulé), compte e2e, identifiant du service',
      w1[0] && w1[0][1] === 'WEB' && w1[0][2] === '0' && w1[0][3] === 'ENVOYE' && w1[0][4] === 'FACTURE' && w1[0][5] === U && w1[0][6] === 'E2E-WA-1', masquer(JSON.stringify(w1[0])));
    ok('Rapprochement fil de discussion : message sortant, document, nom du fichier = journal, même identifiant',
      d1[0] && d1[0][0] === 'S' && d1[0][1] === 'DOCUMENT' && d1[0][2] === j1[0][5] && d1[0][3] === 'ENVOYE' && d1[0][4] === U && d1[0][5] === 'E2E-WA-1', JSON.stringify(d1[0]));
    ok('Message reçu par le service : jeton du compte, numéro 225 + 10 chiffres de la fiche, document PDF nommé comme au journal, de la taille journalisée',
      r1.autorise && r1.to === NUMERO && r1.media && r1.media.type === 'document' && r1.media.mimeType === 'application/pdf' && r1.media.nomFichier === j1[0][5]
      && pdf1.slice(0, 4).toString() === '%PDF' && pdf1.length === Number(j1[0][4]) && r1.media.nomFichier.indexOf(FACTURES[0].code.replace(/[^A-Za-z0-9]+/g, '_')) > 0,
      masquer(r1.to) + ' | ' + (r1.media && r1.media.nomFichier) + ' | ' + pdf1.length + ' / ' + (j1[0] && j1[0][4]));
    const netEcran = Math.round(Number(c0.net));
    const netFormate = String(netEcran).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F CFA';
    ok('Légende : numéro de facture, montant net de la liste (= base), nombre de bons ; aucun nom de patient',
      String(r1.text).indexOf('Facture ' + FACTURES[0].code) === 0 && String(r1.text).indexOf('Montant net : ' + netFormate) > 0 && netEcran === FACTURES[0].net && /Nombre de bons : \d+/.test(r1.text),
      String(r1.text).replace(/\n/g, ' / '));
    /* PDF envoye = PDF imprime par l'ecran */
    const imprime = await ctx.request.get(vues.BASE + '/webservices/sm_user/facturation/ws_rp_facture_tiers_payant.jsp?lg_FACTURE_ID=' + FACTURES[0].id, { maxRedirects: 0 });
    const fichierImprime = editions.fichierEdition(imprime.headers().location || '');
    const octetsImprimes = fs.existsSync(fichierImprime) ? fs.readFileSync(fichierImprime) : Buffer.alloc(0);
    const normal = (t) => t.replace(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(:\d{2})?/g, '').replace(/\s+/g, ' ').trim();
    const tEnvoye = pdf1.length ? texteDuPdf(pdf1, 'envoye') : '', tImprime = octetsImprimes.length ? texteDuPdf(octetsImprimes, 'imprime') : '';
    ok('Rapprochement : le PDF envoyé est le PDF imprimé par l\'écran (même texte, même nombre de pages, même taille à quelques octets près)',
      octetsImprimes.slice(0, 4).toString() === '%PDF' && pdf1.length > 0 && normal(tEnvoye) === normal(tImprime) && pagesDuPdf(pdf1) === pagesDuPdf(octetsImprimes) && Math.abs(pdf1.length - octetsImprimes.length) < 64,
      path.basename(fichierImprime) + ' : ' + octetsImprimes.length + ' / ' + pdf1.length + ' octets ; ' + pagesDuPdf(pdf1) + ' page(s)');
    if (normal(tImprime) === '') {
      console.log('INFO  Édition de facture vide sur ce poste (impression écran comme envoi) : contrôle du montant dans le PDF non applicable ici.');
    } else {
      ok('PDF envoyé : numéro de facture présent', tEnvoye.indexOf(FACTURES[0].code) >= 0, '');
    }

    /* 4. seconde facture du meme organisme, puis renvoi de la premiere */
    await chercherFacture(FACTURES[1].code, FACTURES[1].cree);
    const e2 = await envoyer(FACTURES[1].code);
    await chercherFacture(FACTURES[0].code, FACTURES[0].cree);
    const avantRenvoi = await cellule(FACTURES[0].code);
    const e3 = await envoyer(FACTURES[0].code);
    const j3 = journal(), w3 = journalWa(), d3 = fil();
    ok('Seconde facture puis renvoi : un envoi de plus à chaque fois (3 lignes dans chaque journal et dans le fil, 3 messages reçus)',
      e2.statut === 'ENVOYEE' && /Envoyée le/.test(avantRenvoi.texte) && e3.statut === 'ENVOYEE' && j3.length === 3 && w3.length === 3 && d3.length === 3 && RECUS.length === 3
      && j3.filter((l) => l[0] === FACTURES[0].id).length === 2 && e3.date === j3[2][6] && RECUS[1].media.nomFichier === j3[1][5],
      j3.map((l) => l[0].slice(0, 6) + ':' + l[2]).join(',') + ' | ' + RECUS.length);

    /* 5. compte en mode API : les documents ne partent que par WhatsApp Web */
    modeDefaut('API');
    await chercherFacture(FACTURES[1].code, FACTURES[1].cree);
    const e4 = await envoyer(FACTURES[1].code);
    const j4 = journal();
    ok('Mode API : refus journalisé (« WhatsApp Web seulement »), la cellule dit « Échec : réessayer », rien ne part',
      e4.statut === 'ECHEC' && /Échec/.test(e4.texte) && j4.length === 4 && j4[3][2] === 'ECHEC' && /WhatsApp Web seulement/.test(j4[3][8]) && RECUS.length === 3 && journalWa().length === 3,
      j4[3] && j4[3][8]);
    /* 6. compte en mode test : envoi simule */
    modeDefaut('WEB');
    compteEssai(true);
    const e5 = await envoyer(FACTURES[1].code);
    const j5 = journal(), w5 = journalWa();
    ok('Compte en mode test : envoi simulé (« Simulée le … »), journal SIMULEE et WhatsApp SIMULE, rien ne part',
      e5.statut === 'SIMULEE' && /Simulée le/.test(e5.texte) && j5.length === 5 && j5[4][2] === 'SIMULEE' && w5.length === 4 && w5[3][3] === 'SIMULE' && w5[3][4] === 'FACTURE' && RECUS.length === 3,
      JSON.stringify(e5.texte) + ' | ' + (j5[4] && j5[4][2]));
    const facturesApres = FACTURES.map((f) => ligne('t_facture', "lg_FACTURE_ID = '" + f.id + "'"));
    ok('Bilan : les factures envoyées sont inchangées', facturesApres.every((f, i) => JSON.stringify(f) === JSON.stringify(FACTURES_AVANT[i])), '');

    /* 7. organisme temoin en impression : aucune action d'envoi */
    await chercherFacture(TEMOIN.code, TEMOIN.cree);
    const ct = await cellule(TEMOIN.code);
    ok('Organisme en impression : aucune action d\'envoi dans la liste', ct && ct.texte === '' && ct.cls === '', JSON.stringify(ct));
    ok('Aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (e) {
    ok('Parcours sans exception', false, masquer(e.stack));
  } finally {
    await b.close();
    service.close();
    nettoyer();
    const fiche2 = ligne('t_tiers_payant', "lg_TIERS_PAYANT_ID = '" + TP + "'"), compte2 = empreinteCompte();
    ok('Nettoyage : fiche, compte WhatsApp et mode par défaut remis à l\'identique ; journaux et fil du test retirés',
      JSON.stringify(fiche2) === JSON.stringify(FICHE_AVANT) && compte2 === COMPTE_AVANT
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'") === DEFAUT_AVANT && journal().length === 0 && journalWa().length === 0 && fil().length === 0, '');
  }
  const ko = res.filter((x) => !x).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
