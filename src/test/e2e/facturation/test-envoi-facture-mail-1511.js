/* PLAN DU 14/11, POINT 4 : mode d'envoi des factures sur la fiche du tiers payant, envoi reel par email.
 *
 * Par l'ecran (compte e2e), sur un tiers payant qui a plusieurs factures et sur un second tiers payant laisse en
 * impression :
 *  - fiche (GESTION DES TIERS-PAYANTS > Tiers-payants > Modifier) : « Envoi des factures » = Email avec une adresse
 *    invalide : refus dans le champ, rien n'est ecrit ; avec deux adresses : enregistre ; la fiche rouverte relit le
 *    mode ; API : enregistre, la liste des factures dit « pas encore disponible » ;
 *  - liste des factures (FACTURATION > Factures) : colonne « Envoi email » ; premier clic : le bouton demande
 *    confirmation, sans fenetre ; sans second clic en 10 s, il revient et rien n'est ecrit ; deux clics : la facture
 *    part (domaine d'essai : le message est ecrit dans le dossier prestige.mail.essai.dossier, rien ne sort) ; une
 *    seconde facture du meme organisme, puis un renvoi : un envoi de plus a chaque fois ; facture d'un organisme en
 *    impression : aucune action d'envoi ;
 *  - rapprochement : cellule (date, statut) = journal t_facture_envoi = message ecrit (destinataires = adresses de la
 *    fiche, objet = numero de facture, piece jointe = PDF de taille journalisee) ; texte du PDF envoye = texte du PDF
 *    imprime par l'ecran (meme page d'impression), numero et montant net de la facture presents ;
 *  - bilan : un envoi = une ligne de journal et un message, rien d'autre ; la facture est inchangee ; la fiche ne
 *    change que par le mode et l'adresse.
 * Nettoyage : fiche du tiers payant remise a l'identique, journal, messages et traces du test retires.
 *
 * Domaine d'essai : -Dprestige.mail.essai.dossier=<dossier> (asadmin create-jvm-options) ; le test s'arrete sinon.
 * node src/test/e2e/facturation/test-envoi-facture-mail-1511.js   (MAILS_ESSAI=<dossier>)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const editions = require('../support/editions');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' })
  .replace(/\r/g, '').trim();
/* ligne entiere d'une table, colonnes nommees (sortie tabulee avec en-tete) */
const ligne = (table, where) => {
  const t = execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-B', '--raw', '-e', 'SELECT * FROM ' + table + ' WHERE ' + where], { encoding: 'utf8' })
    .replace(/\r/g, '').split('\n').filter((x) => x !== '');
  if (t.length < 2) { return null; }
  const cols = t[0].split('\t'), vals = t[1].split('\t'), o = {};
  cols.forEach((c, i) => { o[c] = vals[i]; });
  return o;
};
const sql = (v) => (v === 'NULL' || v === undefined ? 'NULL' : "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'");
const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }

const DOSSIER = process.env.MAILS_ESSAI || 'D:/projet/p3/mails-essai-domain3';
const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const ADRESSES = ['compta-e2e@exemple.invalid', 'factures.e2e@exemple.invalid'];

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
const journal = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', lg_FACTURE_ID, str_STATUT, str_DESTINATAIRE, int_TAILLE, str_FICHIER, DATE_FORMAT(dt_CREATED, '%d/%m/%Y %H:%i:%s'), lg_USER_ID) ORDER BY dt_CREATED, id SEPARATOR '§'), '')"
  + " FROM t_facture_envoi WHERE lg_FACTURE_ID IN ('" + FACTURES.map((f) => f.id).join("','") + "','" + TEMOIN.id + "') AND dt_CREATED >= '" + DEBUT + "'").split('§').filter(Boolean).map((x) => x.split('|'));
const mails = () => (fs.existsSync(DOSSIER) ? fs.readdirSync(DOSSIER).filter((n) => FACTURES.concat([TEMOIN]).some((f) => n.startsWith(f.id + '-'))).sort() : []);
const MAILS_AVANT = mails();

/* lecture d'un message .eml : destinataires, objet, piece jointe */
function lireMail(fichier) {
  const brut = fs.readFileSync(fichier, 'latin1');
  const [entete] = brut.split(/\r?\n\r?\n/);
  const champs = {};
  entete.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach((l) => { const i = l.indexOf(':'); if (i > 0) { champs[l.slice(0, i).toLowerCase()] = l.slice(i + 1).trim(); } });
  const decoder = (v) => String(v || '').replace(/=\?UTF-8\?([BQ])\?([^?]*)\?=/gi, (m, t, x) => (t.toUpperCase() === 'B' ? Buffer.from(x, 'base64')
    : Buffer.from(x.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (a, h) => String.fromCharCode(parseInt(h, 16))), 'latin1')).toString('utf8')).replace(/\?=\s+=\?/g, '');
  const limite = (champs['content-type'].match(/boundary="?([^";]+)"?/) || [])[1];
  const parties = brut.split('--' + limite).slice(1, -1).map((p) => { const [e, ...c] = p.replace(/^\r?\n/, '').split(/\r?\n\r?\n/); return { e, c: c.join('\n\n') }; });
  const piece = parties.find((p) => /application\/pdf/i.test(p.e));
  return { a: decoder(champs.to).split(',').map((x) => x.trim()), cc: champs.cc, objet: decoder(champs.subject), nom: piece ? decoder((piece.e.match(/filename="?([^"\r\n;]+)"?/) || [])[1]) : '',
    pdf: piece ? Buffer.from(piece.c.replace(/[\r\n]/g, '').replace(/--$/, ''), 'base64') : Buffer.alloc(0), parties: parties.length };
}
const texteDuPdf = (octets, nom) => { const f = path.join(os.tmpdir(), 'e2e-1511-' + nom + '.pdf'); fs.writeFileSync(f, octets);
  try { return execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }); } finally { fs.unlinkSync(f); } };

function nettoyer() {
  const cols = Object.keys(FICHE_AVANT).filter((c) => c !== 'lg_TIERS_PAYANT_ID');
  q('UPDATE t_tiers_payant SET ' + cols.map((c) => '`' + c + '` = ' + sql(FICHE_AVANT[c])).join(', ') + " WHERE lg_TIERS_PAYANT_ID = '" + TP + "'");
  q("DELETE FROM t_facture_envoi WHERE lg_FACTURE_ID IN ('" + FACTURES.map((f) => f.id).join("','") + "','" + TEMOIN.id + "') AND dt_CREATED >= '" + DEBUT + "'");
  q("DELETE FROM t_event_log WHERE lg_USER_ID = '" + U + "' AND dt_CREATED >= '" + DEBUT + "'");
  mails().filter((n) => MAILS_AVANT.indexOf(n) < 0).forEach((n) => fs.unlinkSync(path.join(DOSSIER, n)));
}

(async () => {
  ok('Préparation : organisme avec deux factures, organisme témoin en impression, dossier d\'essai du domaine', !!TP && FACTURES.length === 2 && !!TEMOIN.id,
    TP_NOM + ' ' + FACTURES.map((f) => f.code).join(',') + ' / témoin ' + TEMOIN.code);
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue()));
  const fermerVolet = () => p.mouse.click(1550, 870);
  /* message visible, hors attente (« Veuillez patienter ») ; puis le bouton donne */
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
    /* la ligne de l'organisme, reperee par son identifiant (la liste affiche le nom complet) */
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('tierspayantmanager')[0]; const s = g && g.getStore(); return s && !s.isLoading() && s.findExact('lg_TIERS_PAYANT_ID', id) >= 0; }, TP, { timeout: 30000 });
    const noeud = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('tierspayantmanager')[0]; return g.getView().getNode(g.getStore().findExact('lg_TIERS_PAYANT_ID', id)).id; }, TP);
    await p.locator('#' + noeud + ' img[data-qtip="Modifier"]').first().click();
    await p.waitForFunction(() => Ext.getCmp('str_MODE_ENVOI_FACTURE') && Ext.getCmp('str_MAIL') && Ext.getCmp('str_MAIL').getValue() !== undefined, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    /* le mode est dans l'onglet de la facturation : on le montre comme l'utilisateur, par son onglet */
    const onglet = await p.evaluate(() => { const c = Ext.getCmp('str_MODE_ENVOI_FACTURE'); const t = c.up('tabpanel'); if (!t) { return null; }
      const pan = t.items.items.find((x) => x === c.up('[title]') || x.contains(c)); return pan ? pan.tab.getId() : null; });
    if (onglet) { await p.click('#' + onglet); }
  };
  const fiche = () => p.evaluate(() => ({ mode: Ext.getCmp('str_MODE_ENVOI_FACTURE').getValue(), libelle: Ext.getCmp('str_MODE_ENVOI_FACTURE').getRawValue(),
    mail: Ext.getCmp('str_MAIL').getValue(), valide: Ext.getCmp('str_MODE_ENVOI_FACTURE').isValid(), erreur: String(Ext.getCmp('str_MODE_ENVOI_FACTURE').getActiveError() || '') }));
  const enregistrer = async () => { await p.locator('.x-window .x-btn').filter({ visible: true }).filter({ hasText: /^\s*Enregistrer\s*$/ }).first().click(); };
  const fermerFiche = async () => { await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible(true) && w.down && w.down('#str_MAIL')).forEach((w) => w.close())); };

  /* liste des factures */
  const cellule = (code) => p.evaluate((c) => { const g = Ext.getCmp('facturemanagerID'); const r = g.getStore().findRecord('str_CODE_FACTURE', c, 0, false, true, true); if (!r) { return null; }
    const i = g.getStore().indexOf(r), n = g.getView().getNode(i), b = n && n.querySelector('.fm-btn'), info = n && n.querySelector('.fm-info');
    return { texte: b ? b.textContent : (info ? info.textContent : ''), cls: b ? b.className : '', statut: r.get('envoiStatut'), date: r.get('envoiDate'), dest: r.get('envoiDestinataire'), net: r.get('dbl_MONTANT_CMDE') }; }, code);
  const boutonEnvoi = (code) => p.locator('#facturemanagerID .x-grid-row').filter({ hasText: code }).first().locator('.fm-btn');
  const ouvrirFactures = async () => {
    await vues.ouvrirMenu(p, 'FACTURATION', 'Factures');
    await fermerVolet();
    await p.waitForFunction(() => Ext.getCmp('facturemanagerID') && Ext.getCmp('rechecherFacture') && Ext.getCmp('rechecherFacture').isVisible(true), null, { timeout: 60000 });
  };
  const chercherFacture = async (code, cree) => {
    /* par la periode : du jour de creation de la facture au meme jour */
    await vues.saisir(p, '#datedebut', cree);
    await vues.saisir(p, '#datefin', cree);
    await vues.saisir(p, '#rechecherFacture', '');
    await p.locator('.x-btn').filter({ visible: true }).filter({ hasText: /^\s*rechercher\s*$/ }).first().click();
    await p.waitForFunction((c) => { const s = Ext.getCmp('facturemanagerID').getStore(); return !s.isLoading() && !!s.findRecord('str_CODE_FACTURE', c, 0, false, true, true); }, code, { timeout: 30000 });
  };

  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* 0. fiche enregistree sans rien changer : reference du bilan. L'enregistrement historique reecrit deja
       certaines colonnes (constat signale a part, sans rapport avec le mode d'envoi). */
    await ouvrirFiche();
    await enregistrer();
    await message('ok');
    await fermerFiche();
    const FICHE_REF = ligne('t_tiers_payant', "lg_TIERS_PAYANT_ID = '" + TP + "'");
    const reecrites = Object.keys(FICHE_AVANT).filter((c) => FICHE_AVANT[c] !== FICHE_REF[c] && c !== 'dt_UPDATED');
    console.log('INFO  Enregistrement sans modification : colonnes réécrites par la fiche historique : '
      + (reecrites.map((c) => c + ' ' + FICHE_AVANT[c] + ' -> ' + FICHE_REF[c]).join(' ; ') || 'aucune'));

    /* 1. fiche : Email avec une adresse invalide, refus dans le champ, rien d'ecrit */
    await ouvrirFiche();
    await vues.saisir(p, '#str_MAIL', 'pas-une-adresse');
    await vues.choisir(p, '#str_MODE_ENVOI_FACTURE', 'Email');
    const f1 = await fiche();
    await enregistrer();
    const m1 = await message('ok');
    const apres1 = ligne('t_tiers_payant', "lg_TIERS_PAYANT_ID = '" + TP + "'");
    ok('Fiche : Email avec « pas-une-adresse » : refus sous le champ, rien n\'est écrit', !f1.valide && /adresse invalide/.test(f1.erreur)
      && JSON.stringify(apres1) === JSON.stringify(FICHE_REF), JSON.stringify(f1) + ' | ' + m1);

    /* 2. fiche : deux adresses, Email : enregistre */
    await vues.saisir(p, '#str_MAIL', ADRESSES.join('; '));
    const f2 = await fiche();
    await enregistrer();
    const m2 = await message('ok');
    const apres2 = ligne('t_tiers_payant', "lg_TIERS_PAYANT_ID = '" + TP + "'");
    ok('Fiche : deux adresses, Email : enregistré (mode et adresse en base)', f2.valide && apres2.str_MODE_ENVOI_FACTURE === 'MAIL' && apres2.str_MAIL === ADRESSES.join('; '), m2 + ' | ' + apres2.str_MODE_ENVOI_FACTURE + ' ' + apres2.str_MAIL);
    const changees = Object.keys(FICHE_REF).filter((c) => FICHE_REF[c] !== apres2[c]);
    ok('Bilan de la fiche (par rapport à un enregistrement sans modification) : seuls le mode, l\'adresse et la date de mise à jour changent', changees.every((c) => ['str_MODE_ENVOI_FACTURE', 'str_MAIL', 'dt_UPDATED'].indexOf(c) >= 0), changees.join(', '));
    await fermerFiche();
    await ouvrirFiche();
    const f3 = await fiche();
    ok('Rapprochement : la fiche rouverte relit le mode et l\'adresse de la base', f3.mode === 'MAIL' && /Email/.test(f3.libelle) && f3.mail === apres2.str_MAIL, JSON.stringify(f3));
    await fermerFiche();

    /* 3. liste des factures : confirmation dans le bouton, puis envoi */
    await ouvrirFactures();
    await chercherFacture(FACTURES[0].code, FACTURES[0].cree);
    const c0 = await cellule(FACTURES[0].code);
    ok('Liste : la facture de l\'organisme en Email propose « Envoyer »', c0 && /Envoyer/.test(c0.texte), JSON.stringify(c0));
    await boutonEnvoi(FACTURES[0].code).click();
    const c1 = await cellule(FACTURES[0].code);
    const fen1 = await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible(true) && w.xtype !== 'tooltip' && w.xtype !== 'quicktip').length);
    ok('Premier clic : le bouton demande confirmation, aucune fenêtre', /Confirmer l'envoi/.test(c1.texte) && fen1 === 0 && (await vues.texteMessage(p)) === '', JSON.stringify(c1) + ' fenêtres=' + fen1);
    await p.waitForTimeout(10800);
    const c2 = await cellule(FACTURES[0].code);
    ok('Sans second clic en 10 s : le bouton revient, rien n\'est écrit ni envoyé', /Envoyer/.test(c2.texte) && journal().length === 0 && mails().length === MAILS_AVANT.length, c2.texte);

    const envoyer = async (code) => {
      await boutonEnvoi(code).click();
      await boutonEnvoi(code).click();
      await p.waitForFunction((c) => { const g = Ext.getCmp('facturemanagerID'); const r = g.getStore().findRecord('str_CODE_FACTURE', c, 0, false, true, true);
        return r && !r.etatEnvoi && (r.get('envoiStatut') || r.refusEnvoi); }, code, { timeout: 120000 });
      return cellule(code);
    };
    const e1 = await envoyer(FACTURES[0].code);
    const j1 = journal(), m1s = mails().filter((n) => MAILS_AVANT.indexOf(n) < 0);
    ok('Deux clics : la facture part, la cellule dit « Envoyée le … »', e1.statut === 'ENVOYEE' && /Envoyée le/.test(e1.texte), JSON.stringify(e1));
    ok('Bilan de l\'envoi : une ligne de journal (ENVOYEE, compte e2e) et un message, rien d\'autre', j1.length === 1 && j1[0][0] === FACTURES[0].id && j1[0][1] === 'ENVOYEE' && j1[0][6] === U && m1s.length === 1,
      JSON.stringify(j1.map((l) => l.slice(0, 4))) + ' | ' + m1s.length);
    const mail1 = m1s.length ? lireMail(path.join(DOSSIER, m1s[0])) : null;
    ok('Rapprochement : destinataires du message = adresses de la fiche = journal', mail1 && JSON.stringify(mail1.a) === JSON.stringify(ADRESSES) && !mail1.cc && j1[0][2] === ADRESSES.join('; ') && e1.dest === j1[0][2],
      mail1 && JSON.stringify(mail1.a) + ' | ' + j1[0][2]);
    ok('Rapprochement : date de la cellule = date du journal', e1.date === j1[0][5], e1.date + ' | ' + j1[0][5]);
    ok('Message : objet « Facture <numéro> », une pièce jointe PDF nommée d\'après l\'organisme et le numéro, de la taille journalisée',
      mail1 && mail1.objet.indexOf('Facture ' + FACTURES[0].code) === 0 && mail1.parties === 2 && mail1.pdf.slice(0, 4).toString() === '%PDF' && mail1.pdf.length === Number(j1[0][3])
      && mail1.nom === j1[0][4] && mail1.nom.indexOf(FACTURES[0].code.replace(/[^A-Za-z0-9]+/g, '_')) > 0, mail1 && (mail1.objet + ' | ' + mail1.nom + ' | ' + mail1.pdf.length + ' / ' + j1[0][3]));
    /* PDF envoye = PDF imprime par l'ecran (meme page d'impression) */
    /* la page d'impression repond par une redirection vers /data/reports/pdf/<fichier> : le fichier est relu sur le
       disque (le dossier des editions peut appartenir a un autre domaine du poste) */
    const imprime = await ctx.request.get(vues.BASE + '/webservices/sm_user/facturation/ws_rp_facture_tiers_payant.jsp?lg_FACTURE_ID=' + FACTURES[0].id, { maxRedirects: 0 });
    const fichierImprime = editions.fichierEdition(imprime.headers().location || '');
    const octetsImprimes = fs.existsSync(fichierImprime) ? fs.readFileSync(fichierImprime) : Buffer.alloc(0);
    const tEnvoye = mail1 ? texteDuPdf(mail1.pdf, 'envoye') : '', tImprime = octetsImprimes.length ? texteDuPdf(octetsImprimes, 'imprime') : '';
    const normal = (t) => t.replace(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(:\d{2})?/g, '').replace(/\s+/g, ' ').trim();
    ok('Rapprochement : le PDF envoyé est le PDF imprimé par l\'écran (même édition, même texte, même taille)',
      octetsImprimes.slice(0, 4).toString() === '%PDF' && mail1 && normal(tEnvoye) === normal(tImprime) && Math.abs(mail1.pdf.length - octetsImprimes.length) < 64,
      path.basename(fichierImprime) + ' : ' + octetsImprimes.length + ' octets / envoyé ' + (mail1 ? mail1.pdf.length : 0) + ' ; texte ' + tEnvoye.length + ' / ' + tImprime.length);
    const netEcran = Math.round(Number(c0.net));
    const netLettres = String(netEcran).replace(/\B(?=(\d{3})+(?!\d))/g, '[  .]?');
    if (normal(tImprime) === '') {
      /* sur ce poste l'edition Jasper lit une autre base que Prestige : la page imprimee est vide, a l'ecran comme
         dans l'envoi. Le contenu du PDF ne peut pas etre compare au montant ici ; il l'est sur un poste d'officine. */
      console.log('INFO  Édition de facture vide sur ce poste (impression écran comme envoi) : contrôle du montant dans le PDF non applicable ici.');
      ok('Rapprochement : montant net de la liste = base', netEcran === FACTURES[0].net, netEcran + ' / ' + FACTURES[0].net);
    } else {
      ok('Rapprochement : montant net de la liste = base, présent dans le PDF envoyé avec le numéro', netEcran === FACTURES[0].net && tEnvoye.indexOf(FACTURES[0].code) >= 0 && new RegExp(netLettres).test(tEnvoye),
        netEcran + ' / ' + FACTURES[0].net);
    }

    /* 4. seconde facture du meme organisme, puis renvoi de la premiere */
    await chercherFacture(FACTURES[1].code, FACTURES[1].cree);
    const e2 = await envoyer(FACTURES[1].code);
    await chercherFacture(FACTURES[0].code, FACTURES[0].cree);
    const avantRenvoi = await cellule(FACTURES[0].code);
    const e3 = await envoyer(FACTURES[0].code);
    const j3 = journal(), m3 = mails().filter((n) => MAILS_AVANT.indexOf(n) < 0);
    ok('Seconde facture puis renvoi : un envoi de plus à chaque fois (3 lignes, 3 messages), la liste relit le dernier envoi',
      e2.statut === 'ENVOYEE' && /Envoyée le/.test(avantRenvoi.texte) && e3.statut === 'ENVOYEE' && j3.length === 3 && m3.length === 3
      && j3.filter((l) => l[0] === FACTURES[0].id).length === 2 && j3.filter((l) => l[0] === FACTURES[1].id).length === 1 && e3.date === j3[2][5],
      j3.map((l) => l[0].slice(0, 6) + ':' + l[1]).join(',') + ' | ' + m3.length);
    const facturesApres = FACTURES.map((f) => ligne('t_facture', "lg_FACTURE_ID = '" + f.id + "'"));
    ok('Bilan : les factures envoyées sont inchangées', facturesApres.every((f, i) => JSON.stringify(f) === JSON.stringify(FACTURES_AVANT[i])), '');

    /* 5. organisme temoin en impression : aucune action d'envoi */
    await chercherFacture(TEMOIN.code, TEMOIN.cree);
    const ct = await cellule(TEMOIN.code);
    ok('Organisme en impression : aucune action d\'envoi dans la liste', ct && ct.texte === '' && ct.cls === '', JSON.stringify(ct));

    /* 6. mode API : enregistre, la liste dit « pas encore disponible », aucun envoi possible */
    await ouvrirFiche();
    await vues.choisir(p, '#str_MODE_ENVOI_FACTURE', 'API');
    await enregistrer();
    await message('ok');
    const apresApi = ligne('t_tiers_payant', "lg_TIERS_PAYANT_ID = '" + TP + "'");
    await fermerFiche();
    await ouvrirFactures();
    await chercherFacture(FACTURES[0].code, FACTURES[0].cree);
    const ca = await cellule(FACTURES[0].code);
    ok('API : mode enregistré, la liste dit « pas encore disponible », sans bouton d\'envoi', apresApi.str_MODE_ENVOI_FACTURE === 'API' && /pas encore disponible/.test(ca.texte) && ca.cls === '', apresApi.str_MODE_ENVOI_FACTURE + ' | ' + JSON.stringify(ca));
    ok('Aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    const resteJournal = q("SELECT COUNT(*) FROM t_facture_envoi WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + U + "'");
    const fiche2 = ligne('t_tiers_payant', "lg_TIERS_PAYANT_ID = '" + TP + "'");
    ok('Nettoyage : fiche remise à l\'identique, journal et messages du test retirés', resteJournal === '0' && JSON.stringify(fiche2) === JSON.stringify(FICHE_AVANT) && mails().length === MAILS_AVANT.length,
      resteJournal + ' ' + Object.keys(FICHE_AVANT).filter((c) => FICHE_AVANT[c] !== fiche2[c]).join(','));
  }
  const ko = res.filter((x) => !x).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
