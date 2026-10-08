/* PHARMAML : REPONSE DIFFEREE (retours du 08/10, specification v4.8 § 4.1.2-4.1.3). Faux serveur au comportement reel
 * de DPCI : la commande recoit « FIN_SERVICE » (recue, reponse plus tard) ; la demande de VIDAGE (REQ_RECEPTION) rend
 * la reponse de commande (REP_RECEPTION) avec, COMME LE VRAI DPCI (fichier RV_ du 08/10), EN_REPONSE_A = reference de la
 * DEMANDE DE VIDAGE et Ref_Cde_Client = reference de la commande : le rattachement se fait par Ref_Cde_Client ; l'ACQUITTEMENT la retire du depot
 * et rend FIN_SERVICE. Reglages reels de DPCI (code client, cle) ; seule l'adresse est detournee.
 *  - envoi par l'ecran : message « a bien reçu », pas d'echec, commande intacte, envoi enregistre EN_ATTENTE ;
 *  - renvoi refuse (doublon chez le grossiste) sans rien envoyer ;
 *  - bouton « Réponses PharmaML » : VIDAGE puis ACQUITTEMENT de la bonne reference, en-tete de controle sur chaque
 *    message, reponse appliquee a la commande (quantites, prix, rupture), envoi TRAITEE ;
 *  - 30 s au moins entre deux vidages ; copie d'une reponse deja traitee acquittee sans etre reappliquee ; reponse
 *    inconnue archivee et acquittee (ORPHELINE), jamais appliquee ; seuls les grossistes ayant un envoi en attente sont
 *    interroges ; refus de la demande de vidage : arret sans acquittement ;
 *  - tout est retire a la fin, le grossiste est remis.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const http = require('http');
const crypto = require('crypto');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const G = '51217123242587374880', CMD = 'E2E-PMD-CMD', CMD2 = 'E2E-PMD-CMD2';
const PORT = 18768;
const recus = [];
let mode = 'normal';                 // normal | orpheline | refus
const depot = [];                     // messages en attente chez le « grossiste »
let n = 0;
const env = (nature, enRep, corps) => '<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Nature_Action="' + nature
  + '" Version_Protocole="1.0.0.0" Id_Logiciel="FAUX" Version_Logiciel="1" Usage="P"><ENTETE><EMETTEUR Nature="RE" Code="12" Id="04" Adresse="DPCI"/><RECEPTEUR Nature="OF" Code="00" Id="0999908" Adresse="X"/>'
  + '<REF_MESSAGE>M' + (++n) + '</REF_MESSAGE>' + (enRep ? '<EN_REPONSE_A>' + enRep + '</EN_REPONSE_A>' : '') + '<DATE>2026-10-08T10:00:00</DATE></ENTETE><CORPS>' + corps + '</CORPS></CSRP_ENVELOPPE>';
const repCommande = (codes, refCde) => '<MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><ENTETE><EMETTEUR Code_Societe="12" Id_Societe="04"/><DESTINATAIRE Id_Client="0999908"/></ENTETE><CORPS><REP_COMMANDE' + (refCde ? ' Ref_Cde_Client="' + refCde + '"' : '') + '><NORMALE>'
  + codes.map((c, i) => i === 0 ? '<LIGNE_N Num_Ligne="' + (i + 1) + '" Code_Produit="' + c.code + '" Quantite_livree="' + c.q + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/></LIGNE_N>'
    : '<LIGNE_N Num_Ligne="' + (i + 1) + '" Code_Produit="' + c.code + '" Quantite_livree="0"><PRIX_N Nature="PHAHT" Valeur="900"/><PRIX_N Nature="PUBTC" Valeur="1400"/><INDISPONIBILITE_N Code_Reponse="2" Additif="PAS EN STOCK"/></LIGNE_N>').join('')
  + '</NORMALE></REP_COMMANDE></CORPS></MESSAGE_REPARTITEUR>';
let cle = '', idOf = '';
const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  const att = (a) => (b.match(new RegExp(a + '="([^"]*)"')) || [])[1];
  const tag = (t) => (b.match(new RegExp('<' + t + '>([^<]*)</' + t + '>')) || [])[1];
  const controle = crypto.createHash('md5').update(Buffer.from(b, 'utf8')).update(idOf.padEnd(16, '0') + cle).digest('base64');
  const m = { nature: att('Nature_Action'), action: tag('ACTION') || (/<COMMANDE /.test(b) ? 'COMMANDE' : ''), ref: tag('REF_MESSAGE'), enRep: tag('EN_REPONSE_A') || '', controleOk: req.headers['content-pharmaml'] === controle };
  recus.push(m);
  const repondre = (x) => { rep.writeHead(200, { 'Content-Type': 'text/xml' }); rep.end(x); };
  if (m.action === 'COMMANDE') {
    const codes = [...b.matchAll(/<LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)].map((x) => ({ code: x[1], q: Number(x[2]) }));
    /* comportement reel de DPCI : la reponse portera EN_REPONSE_A = reference du vidage, et Ref_Cde_Client */
    depot.push({ reel: true, refCde: (b.match(/Ref_Cde_Client="([^"]*)"/) || [])[1], codes });
    return repondre(env('REP_EMISSION', m.ref, '<ACTION>FIN_SERVICE</ACTION>'));
  }
  if (m.action === 'VIDAGE' && mode === 'refus') {
    return repondre(env('REP_RECEPTION', '', '<ERREUR Description_libre="Element de controle invalide"/>'));
  }
  if (m.action === 'ACQUITTEMENT') { depot.shift(); }
  if (m.action === 'VIDAGE' || m.action === 'ACQUITTEMENT') {
    if (!depot.length) { return repondre(env('REP_RECEPTION', m.ref, '<ACTION>FIN_SERVICE</ACTION>')); }
    const d = depot[0];
    return repondre(env('REP_RECEPTION', d.reel ? m.ref : d.enRep, repCommande(d.codes, d.reel ? d.refCde : null)));
  }
  repondre(env('REP_EMISSION', m.ref, '<ERREUR Description_libre="inattendu"/>'));
}); });

let sauve, P = [];
function nettoyer() {
  for (const c of [CMD, CMD2]) {
    exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference = '" + c + "'); DELETE FROM rupture WHERE reference = '" + c + "';"
      + "DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + c + "'; DELETE FROM t_order WHERE lg_ORDER_ID = '" + c + "';");
  }
  exec("DELETE FROM t_pharmaml_attente WHERE lg_GROSSISTE_ID = '" + G + "' AND (lg_SOURCE_ID IN ('" + CMD + "', '" + CMD2 + "') OR str_STATUT = 'ORPHELINE' OR lg_SOURCE_ID IS NULL OR lg_ID LIKE 'e2e-pmd-%')");
}
function poser(id, produits) {
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + id + "', '" + id + "', " + produits.length + ", '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
  produits.forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + id + "-" + i + "', '" + id + "', '" + p + "', '" + G + "', " + (i + 2) + ", 0, 1000, 2000, 'is_Process', NOW(), NOW())"));
}
const etat = (id) => q("SELECT CONCAT(int_PRICE, '|', (SELECT IFNULL(GROUP_CONCAT(CONCAT(IFNULL(int_QTE_REP_GROSSISTE, ''), ':', IFNULL(prixAchat, '')) ORDER BY lg_ORDERDETAIL_ID), '') FROM t_order_detail WHERE lg_ORDER_ID = '" + id + "'), '|', "
  + "(SELECT COUNT(*) FROM rupture WHERE reference = '" + id + "')) FROM t_order WHERE lg_ORDER_ID = '" + id + "'");
const statut = (id) => q("SELECT IFNULL(GROUP_CONCAT(str_STATUT ORDER BY dt_ENVOI), '') FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + id + "'");

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  sauve = q("SELECT CONCAT_WS('|', IFNULL(str_URL_PHARMAML, 'NULL'), IFNULL(str_URL_PHARMAML_SECOURS, 'NULL'), str_PHARMAML_VERSION_CMDE, IFNULL(str_CLE_RECEPTEUR, ''), IFNULL(str_ID_RECEPTEUR_PHARMA, '')) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'").split('|');
  cle = sauve[3]; idOf = sauve[4];
  P = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, str_NAME FROM t_famille WHERE str_STATUT='enable' AND int_CIP REGEXP '^[0-9]{7}$' ORDER BY str_NAME LIMIT 2 OFFSET 40) x").split('|');
  nettoyer();
  exec("UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:" + PORT + "/PharmaML/', str_URL_PHARMAML_SECOURS = NULL, str_PHARMAML_VERSION_CMDE = '1.0.0.0' WHERE lg_GROSSISTE_ID = '" + G + "'");
  poser(CMD, P);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const boite = () => p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; return m ? m.el.dom.textContent : ''; });
  const fermer = () => p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; if (m) { m.close(); } });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('i_order_manager', 'Commandes', ''));
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_ORDER_ID', id) >= 0; }, CMD, { timeout: 30000 }).catch(() => {});
    const avant = etat(CMD);
    /* 1. envoi par l'ecran */
    const envoyerEcran = async (id) => { await p.evaluate((id) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.getStore().reload(); }, id);
      await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_ORDER_ID', id) >= 0; }, id, { timeout: 30000 });
      await p.evaluate((id) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.envoiPharmaML(g, g.getStore().findExact('lg_ORDER_ID', id)); }, id);
      await p.waitForFunction(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; return m && /Envoi PharmaML/.test(m.el.dom.textContent); }, null, { timeout: 60000 });
      const t = await boite(); await fermer(); return t; };
    recus.length = 0;
    const t1 = await envoyerEcran(CMD);
    ok('Envoi (écran) : « a bien reçu la commande », pas d\'échec ; en-tête de contrôle correct', /a bien reçu la commande/.test(t1) && !/impossible/.test(t1) && recus.length === 1 && recus[0].controleOk, t1 + JSON.stringify(recus));
    ok('Envoi : commande intacte, envoi enregistré EN_ATTENTE avec la référence du message', etat(CMD) === avant && statut(CMD) === 'EN_ATTENTE'
      && q("SELECT str_REF_MESSAGE FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + CMD + "'") === recus[0].ref, etat(CMD) + ' ' + statut(CMD));
    /* liste des commandes : pastille « En attente », bouton de recuperation sur la ligne, date et heure regroupees */
    await p.evaluate(() => { Ext.ComponentQuery.query('i_order_manager')[0].getStore().reload(); });
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_ORDER_ID', id) >= 0; }, CMD, { timeout: 30000 });
    const ligne = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; const n = g.getView().getNode(g.getStore().findExact('lg_ORDER_ID', id));
      const b = n.querySelector('.envoi-pml'); const dh = g.down('#colDateHeure');
      return { badge: b ? b.getAttribute('data-envoi') : '', recuperer: !!n.querySelector('img.envoi-pml-recuperer'), date: n.querySelector('.x-grid-cell-' + dh.getItemId()).textContent.trim(),
        heure: g.query('gridcolumn[text=Heure]').length }; }, CMD);
    ok('Liste des commandes : « En attente » + bouton de récupération sur la ligne ; date et heure dans une seule colonne', ligne.badge === 'EN_ATTENTE' && ligne.recuperer
      && /^\d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2}/.test(ligne.date) && ligne.heure === 0, JSON.stringify(ligne));
    /* 2. renvoi refuse */
    recus.length = 0;
    const t2 = await envoyerEcran(CMD);
    ok('Renvoi refusé (doublon), message clair, rien envoyé au grossiste', /déjà été reçue/.test(t2) && /impossible/.test(t2) && recus.length === 0, t2);
    /* 3. bouton Reponses PharmaML */
    recus.length = 0;
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.down('#btnReponsesPharmaml').fireEvent('click', g.down('#btnReponsesPharmaml')); g.reponsesPharmaML(); });
    await p.waitForFunction(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; return m && /Envois encore en attente/.test(m.el.dom.textContent); }, null, { timeout: 120000 });
    const t3 = await boite();
    await p.screenshot({ path: SORTIE + '/pharmaml-reponses.png' });
    await fermer();
    const vid = recus.filter((r) => r.action === 'VIDAGE'), acq = recus.filter((r) => r.action === 'ACQUITTEMENT');
    ok('« Réponses PharmaML » : VIDAGE (REQ_RECEPTION) puis ACQUITTEMENT du message reçu, contrôle sur chaque message', vid.length >= 1 && acq.length === 1 && vid[0].nature === 'REQ_RECEPTION'
      && acq[0].nature === 'REQ_RECEPTION' && /^M\d+$/.test(acq[0].enRep) && recus.every((r) => r.controleOk), JSON.stringify(recus));
    const apres = etat(CMD);
    ok('Réponse au format réel DPCI (EN_REPONSE_A = référence du vidage) rattachée par Ref_Cde_Client et appliquée : produit 1 livré (prix 1500), produit 2 en rupture ; envoi TRAITEE', apres !== avant && /1500/.test(apres) && /\|1$/.test(apres) && statut(CMD) === 'TRAITEE', avant + ' -> ' + apres);
    ok('Écran : DPCI seul interrogé, « 1 réponse(s) traitée(s) », plus rien en attente', /DPCI : 1 réponse\(s\) traitée\(s\)/.test(t3) && !/LABOREX/.test(t3) && /attente de réponse : 0/.test(t3), t3);
    /* 4. 30 s entre deux vidages */
    const r4 = JSON.parse(await p.evaluate(async (g) => (await fetch('../api/v1/pharma/reponses?grossiste=' + g, { method: 'POST' })).text(), G));
    ok('Deuxième interrogation immédiate : refusée (30 s minimum, règle PharmaML)', /moins de 30 secondes/.test(r4.grossistes[0].msg), JSON.stringify(r4));
    /* 5. copie d'une reponse deja traitee + reponse inconnue */
    nettoyer(); poser(CMD2, P);
    const codes = q("SELECT GROUP_CONCAT(f.int_CIP ORDER BY d.lg_ORDERDETAIL_ID) FROM t_order_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_ORDER_ID = '" + CMD2 + "'").split(',');
    exec("INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, lg_SOURCE_ID, str_REF_MESSAGE, str_STATUT, dt_ENVOI) VALUES ('e2e-pmd-1', '" + G + "', 'COMMANDE', '" + CMD2 + "', 'DEJA-1', 'TRAITEE', NOW()),"
      + " ('e2e-pmd-2', '" + G + "', 'COMMANDE', '" + CMD2 + "', 'ATT-2', 'EN_ATTENTE', NOW())");
    depot.push({ enRep: 'DEJA-1', codes: codes.map((c, i) => ({ code: c, q: i + 2 })) });
    depot.push({ enRep: 'INCONNU', codes: codes.map((c, i) => ({ code: c, q: i + 2 })) });
    await p.waitForTimeout(31000);
    recus.length = 0;
    const avant5 = etat(CMD2);
    const r5 = JSON.parse(await p.evaluate(async () => (await fetch('../api/v1/pharma/reponses', { method: 'POST' })).text()));
    const st = (r5.grossistes[0].messages || []).map((m) => m.statut).join(',');
    ok('Copie d\'une réponse déjà traitée : acquittée sans être réappliquée ; réponse inconnue (mêmes produits) archivée ORPHELINE, jamais appliquée', st === 'DEJA_TRAITEE,ORPHELINE'
      && etat(CMD2) === avant5 && recus.filter((r) => r.action === 'ACQUITTEMENT').length === 2 && depot.length === 0, st + ' ' + avant5 + ' / ' + etat(CMD2));
    ok('Bouton sans grossiste : seuls les grossistes ayant un envoi en attente sont interrogés', r5.grossistes.length === 1 && r5.grossistes[0].grossiste === 'DPCI', JSON.stringify(r5.grossistes.map((g) => g.grossiste)));
    /* 6. refus de la demande de vidage : arret sans acquittement */
    mode = 'refus'; depot.push({ enRep: 'X', codes: [{ code: '0000002', q: 1 }] });
    await p.waitForTimeout(31000);
    recus.length = 0;
    const r6 = JSON.parse(await p.evaluate(async (g) => (await fetch('../api/v1/pharma/reponses?grossiste=' + g, { method: 'POST' })).text(), G));
    ok('Refus de la demande de vidage : arrêt, motif affiché, aucun acquittement', /refus : .*controle/.test(r6.grossistes[0].msg) && recus.every((r) => r.action !== 'ACQUITTEMENT') && depot.length === 1, JSON.stringify(r6));
    mode = 'normal'; depot.length = 0;
    /* 7. reponse deja archivee « non rattachee » (cas reel du 08/10, avant correction) : reprise depuis l'archive */
    const fs = require('fs'), DOSSIER = '/root/prestige/pharmaml', ARCH = 'RV_E2E-PMD-ORPH_DPCI';
    fs.mkdirSync(DOSSIER, { recursive: true });
    fs.writeFileSync(DOSSIER + '/' + ARCH + '.xml', env('REP_RECEPTION', '261008091521007', repCommande(codes.map((c, i) => ({ code: c, q: i + 2 })), CMD2)));
    exec("INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, lg_SOURCE_ID, str_REF_MESSAGE, str_REF_CDE, str_STATUT, dt_ENVOI) VALUES ('e2e-pmd-3', '" + G + "', 'COMMANDE', '" + CMD2 + "', '20261008091358', '" + CMD2 + "', 'EN_ATTENTE', NOW());"
      + "INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, str_REF_MESSAGE, str_STATUT, str_DETAIL, dt_ENVOI, dt_REPONSE) VALUES ('e2e-pmd-4', '" + G + "', 'COMMANDE', '261008091521007', 'ORPHELINE', 'Réponse non rattachée, archivée : " + ARCH + ".xml', NOW(), NOW())");
    const avant7 = etat(CMD2);
    recus.length = 0;
    const r7 = JSON.parse(await p.evaluate(async (g) => (await fetch('../api/v1/pharma/reponses?grossiste=' + g, { method: 'POST' })).text(), G));
    const st7 = q("SELECT GROUP_CONCAT(CONCAT(lg_ID, ':', str_STATUT) ORDER BY lg_ID) FROM t_pharmaml_attente WHERE lg_ID IN ('e2e-pmd-3', 'e2e-pmd-4')");
    ok('Réponse archivée non rattachée : reprise depuis l\'archive, rattachée par Ref_Cde_Client et appliquée (envoi TRAITEE, ligne RATTACHEE)', st7 === 'e2e-pmd-3:TRAITEE,e2e-pmd-4:RATTACHEE'
      && etat(CMD2) !== avant7 && /1500/.test(etat(CMD2)) && r7.traitees >= 1, st7 + ' ' + avant7 + ' -> ' + etat(CMD2) + ' ' + JSON.stringify(r7).slice(0, 200));
    const orphelineInconnue = q("SELECT COUNT(*) FROM t_pharmaml_attente WHERE lg_GROSSISTE_ID = '" + G + "' AND str_STATUT = 'ORPHELINE'");
    ok('Réponse archivée toujours inconnue (sans Ref_Cde_Client connu) : laissée non rattachée, jamais appliquée', orphelineInconnue === '1', orphelineInconnue);
    const r7b = JSON.parse(await p.evaluate(async (g) => (await fetch('../api/v1/pharma/reponses?grossiste=' + g, { method: 'POST' })).text(), G));
    ok('Reprise rejouée : rien n\'est appliqué deux fois', st7 === q("SELECT GROUP_CONCAT(CONCAT(lg_ID, ':', str_STATUT) ORDER BY lg_ID) FROM t_pharmaml_attente WHERE lg_ID IN ('e2e-pmd-3', 'e2e-pmd-4')") && r7b.traitees === 0, JSON.stringify(r7b).slice(0, 200));
    fs.unlinkSync(DOSSIER + '/' + ARCH + '.xml');
    const att = JSON.parse(await p.evaluate(async () => (await fetch('../api/v1/pharma/attentes')).text()));
    ok('Liste des envois en attente / réponses non rattachées disponible', att.success && Array.isArray(att.data) && att.data.some((a) => a.statut === 'ORPHELINE'), JSON.stringify(att).slice(0, 200));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (sauve[0] === 'NULL' ? 'NULL' : "'" + sauve[0] + "'") + ", str_URL_PHARMAML_SECOURS = " + (sauve[1] === 'NULL' ? 'NULL' : "'" + sauve[1] + "'")
      + ", str_PHARMAML_VERSION_CMDE = '" + sauve[2] + "' WHERE lg_GROSSISTE_ID = '" + G + "'");
    ok('Jeu d\'essai retiré, grossiste remis', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID IN ('" + CMD + "', '" + CMD2 + "')") === '0'
      && q("SELECT COUNT(*) FROM t_pharmaml_attente WHERE lg_GROSSISTE_ID = '" + G + "'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
