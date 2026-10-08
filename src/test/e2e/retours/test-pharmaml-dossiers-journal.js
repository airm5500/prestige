/* PHARMAML : DOSSIERS PAR TYPE ET PAR MOIS, JOURNAL DES TRANSMISSIONS (retours du 08/10 (5)).
 * Faux grossiste local (le grossiste d'essai est detourne pendant le test, puis remis) :
 *  - commande : C_ et R_ dans commandes/AAAA-MM ; disponibilite (ecran de la commande) : I_ et RI_ dans
 *    infoproduit/AAAA-MM ; recuperation des reponses : V_ et RV_ dans vidages/AAAA-MM ; plus rien a la racine ;
 *  - journal log/AAAA-MM/pharmaml_AAAA-MM-JJ.log : une ligne par evenement, 5 champs (horodatage | domaine |
 *    grossiste | evenement | detail) : preparation, envoi, chaque essai HTTP (adresse, code, duree, tailles),
 *    reponse recue, resultat ; disponibilite (resultat chiffre) ; vidage (debut, demande, reponse, fin) ;
 *  - grossiste injoignable : les 3 essais et l'echec « NON_ENVOYEE » sont traces ;
 *  - le journal ne contient jamais la cle du grossiste, l'en-tete de controle ni le contenu XML ;
 *  - aucune erreur JavaScript ; donnees, archives et lignes de journal de l'essai retirees.
 */
const { execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const archives = require('./archives-pharmaml');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const PORT = 18775, G = '51217123531215794892', CLE = 'E2EJ9';
const CMD = 'E2E-PMJ-CMD', CMD2 = 'E2E-PMJ-KO', CMDS = [CMD, CMD2];
const pad = (n) => String(n).padStart(2, '0');
const d = new Date(), MOIS = d.getFullYear() + '-' + pad(d.getMonth() + 1), JOUR = MOIS + '-' + pad(d.getDate());
const JOURNAL = path.join(archives.DOSSIER, 'log', MOIS, 'pharmaml_' + JOUR + '.log');
let P = [], cips = [], sauve = null, tailleJournal = 0, libelle = '';

const env = (corps, action) => '<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Nature_Action="REP_EMISSION" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>E2E'
  + Date.now() + '</REF_MESSAGE></ENTETE><CORPS>' + (action ? '<ACTION>' + action + '</ACTION>' : '<MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS>' + corps + '</CORPS></MESSAGE_REPARTITEUR>') + '</CORPS></CSRP_ENVELOPPE>';
const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  if (/VIDAGE/.test(b)) { rep.end(env('', 'FIN_SERVICE')); return; }
  if (/REQ_INFO_PRODUIT/.test(b)) {
    const l = [...b.matchAll(/<LIGNE_REQ_INFO_PRODUIT Num_Ligne="(\d+)"[^>]*Code_Produit="([^"]*)"/g)];
    rep.end(env('<REP_INFO_PRODUIT>' + l.map((m) => '<LIGNE_REP_INFO_PRODUIT Num_Ligne="' + m[1] + '" Code_Produit="' + m[2] + '" Nature="PHAHT" '
      + (m[2] === cips[0] ? 'Valeur="0" Code_Reponse="0001" Libelle="Produit inconnu"' : 'Valeur="1040" Code_Reponse="0000" Libelle="Produit disponible"') + '/>').join('') + '</REP_INFO_PRODUIT>'));
    return;
  }
  const lignes = [...b.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
  rep.end(env('<REP_COMMANDE><NORMALE>' + lignes.map((m) => '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + Number(m[2]) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/></LIGNE_N>').join('') + '</NORMALE></REP_COMMANDE>'));
}); });

const liste = (a) => a.map((x) => "'" + x + "'").join(',');
function nettoyer() {
  archives.retirer(/E2E-PMJ/);
  exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference IN (" + liste(CMDS) + ")); DELETE FROM rupture WHERE reference IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (" + liste(CMDS) + "); DELETE FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ") OR lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_disponibilite_produit WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ");");
}
function poser(cmd) {
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + cmd + "', '" + cmd + "', 2, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
  P.forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + cmd + "-" + i + "', '" + cmd + "', '" + p + "', '" + G + "', " + (i + 2) + ", 0, 1000, 2000, 'is_Process', NOW(), NOW())"));
}
const journalAjoute = () => (fs.existsSync(JOURNAL) ? fs.readFileSync(JOURNAL, 'utf8').slice(tailleJournal) : '');
const racine = () => fs.readdirSync(archives.DOSSIER).filter((f) => /E2E-PMJ|PRS\d+_/.test(f) && fs.statSync(path.join(archives.DOSSIER, f)).mtimeMs > d.getTime());

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  sauve = q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', int_PHARMAML_DISPO, '|', str_PHARMAML_VERSION_INFO, '|', str_PHARMAML_VERSION_CMDE, '|', IFNULL(str_CLE_RECEPTEUR, 'NULL'), '|', IFNULL(str_PHARMAML_CONTROLE, 'NULL')) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'").split('|');
  libelle = q("SELECT str_LIBELLE FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'");
  const lus = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_CIP) ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, int_CIP, str_NAME FROM t_famille WHERE str_STATUT='enable'"
    + " AND int_CIP REGEXP '^[0-9]{7}$' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = t_famille.int_CIP) = 1"
    + " AND NOT EXISTS (SELECT 1 FROM t_famille_grossiste fg WHERE fg.lg_FAMILLE_ID = t_famille.lg_FAMILLE_ID AND fg.lg_GROSSISTE_ID = '" + G + "') ORDER BY str_NAME LIMIT 2) x").split('|');
  P = lus.map((x) => x.split(':')[0]); cips = lus.map((x) => x.split(':')[1]);
  nettoyer();
  tailleJournal = fs.existsSync(JOURNAL) ? fs.statSync(JOURNAL).size : 0;
  exec("UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:" + PORT + "/pml/', int_PHARMAML_DISPO = 1, str_PHARMAML_VERSION_INFO = '1.0.0.0', str_PHARMAML_VERSION_CMDE = '1.0.0.0',"
    + " str_CLE_RECEPTEUR = '" + CLE + "', str_PHARMAML_CONTROLE = 'CSRP' WHERE lg_GROSSISTE_ID = '" + G + "'");
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    poser(CMD);

    /* 1) disponibilite depuis l'ecran de la commande */
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0 && Ext.ComponentQuery.query('i_order_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    await p.evaluate((ref) => { Ext.getCmp('rechecher').setValue(ref); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); }, CMD);
    await p.waitForFunction((ref) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', ref) >= 0; }, CMD, { timeout: 30000 });
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF_ORDER', ref)); }, CMD);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.click('#btn_cmd_dispo_verifier');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Information seulement/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 60000 });
    await p.evaluate(() => { Ext.MessageBox.hide(); });

    /* 2) commande, 3) recuperation des reponses (vidage), 4) grossiste injoignable */
    const r1 = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/pharma/' + id, { method: 'PUT' })).text()), CMD);
    ok('Commande envoyée et traitée', r1.success !== false && r1.nbreproduit === 2, JSON.stringify(r1));
    await p.waitForTimeout(31000 - 0); /* regle PharmaML : 30 s entre deux vidages d'un meme grossiste */
    const v = await p.evaluate(async (g) => JSON.parse(await (await fetch('../api/v1/pharma/reponses?grossiste=' + g, { method: 'POST' })).text()), G);
    ok('Récupération des réponses : dépôt vide (FIN_SERVICE)', v && (v.grossistes || []).length === 1, JSON.stringify(v).slice(0, 300));
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:1/pml/' WHERE lg_GROSSISTE_ID = '" + G + "'");
    poser(CMD2);
    const r2 = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/pharma/' + id, { method: 'PUT' })).text()), CMD2);
    ok('Grossiste injoignable : commande non envoyée', r2.success === false, JSON.stringify(r2));

    /* dossiers */
    const tous = archives.fichiers();
    const dans = (dossier, motif) => tous.filter((f) => new RegExp('^' + dossier + '/' + MOIS + '/' + motif).test(f));
    const nomG = libelle.replace(/ /g, '');
    const cmd = { C: dans('commandes', 'C_' + CMD + '_' + nomG + '\\.xml$'), R: dans('commandes', 'R_' + CMD + '_' + nomG + '\\.xml$'),
      C2: dans('commandes', 'C_' + CMD2) };
    ok('Commande : C_ et R_ rangés dans commandes/' + MOIS, cmd.C.length === 1 && cmd.R.length === 1, JSON.stringify(cmd));
    ok('Commande injoignable : C_ archivé quand même (ce qui a été tenté)', cmd.C2.length === 1, JSON.stringify(cmd.C2));
    const nomI = libelle.replace(/[^A-Za-z0-9]/g, '');
    const recents = (motif) => dans('infoproduit', motif).filter((f) => fs.statSync(path.join(archives.DOSSIER, f)).mtimeMs >= d.getTime());
    const info = { I: recents('I_PRS\\d+_' + nomI + '\\.xml$'), RI: recents('RI_PRS\\d+_' + nomI + '\\.xml$') };
    ok('Disponibilité : I_ et RI_ rangés dans infoproduit/' + MOIS, info.I.length >= 1 && info.RI.length >= 1, JSON.stringify(info));
    const vid = { V: dans('vidages', 'V_\\d+_' + nomG).filter((f) => fs.statSync(path.join(archives.DOSSIER, f)).mtimeMs >= d.getTime()),
      RV: dans('vidages', 'RV_\\d+_' + nomG).filter((f) => fs.statSync(path.join(archives.DOSSIER, f)).mtimeMs >= d.getTime()) };
    ok('Vidage : V_ et RV_ rangés dans vidages/' + MOIS, vid.V.length >= 1 && vid.RV.length >= 1, JSON.stringify(vid));
    ok('Plus aucun échange écrit à la racine du dossier PharmaML', racine().length === 0, JSON.stringify(racine()));

    /* journal */
    const j = journalAjoute();
    const lignes = j.split('\n').filter(Boolean);
    fs.writeFileSync(SORTIE + '/journal-pharmaml-extrait.log', j);
    const format = lignes.every((l) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \| [A-Z]+ \| [^|]* \| [^|]+ \| .*$/.test(l));
    ok('Journal log/' + MOIS + '/pharmaml_' + JOUR + '.log : une ligne par événement, 5 champs', lignes.length >= 15 && format, lignes.length + ' lignes');
    const a = (re) => lignes.some((l) => re.test(l));
    const g = libelle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    ok('Commande tracée : préparation, envoi (message, commande, lignes, version, archive), réponse reçue, traitée (résultat)',
      a(new RegExp('\\| COMMANDE \\| ' + g + ' \\| PREPARATION \\| commande ' + CMD))
      && a(new RegExp('\\| COMMANDE \\| ' + g + ' \\| ENVOI \\| message \\d+ \\| commande .* \\| 2 ligne\\(s\\) \\| version 1\\.0\\.0\\.0 \\| archive commandes/' + MOIS + '/C_' + CMD))
      && a(new RegExp('\\| COMMANDE \\| ' + g + ' \\| REPONSE RECUE \\| message \\d+ \\| archive commandes/' + MOIS + '/R_' + CMD))
      && a(new RegExp('\\| COMMANDE \\| ' + g + ' \\| TRAITEE \\| COMMANDE ' + CMD + ' \\| message \\d+ \\| 2 pris en compte, 0 en rupture sur 2')), j);
    ok('Chaque essai HTTP tracé avec le grossiste, l\'adresse, le code, la durée et les tailles',
      a(new RegExp('\\| HTTP \\| ' + g + ' \\| REPONSE 200 \\| essai 1/3 http://127\\.0\\.0\\.1:' + PORT + '/pml/ \\| \\d+ ms \\| envoye \\d+ octets, recu \\d+ octets \\| controle CSRP')), j);
    ok('Disponibilité tracée : envoi, réponse, résultat chiffré (1 disponible, 1 non disponible)',
      a(new RegExp('\\| INFOPRODUIT \\| ' + g + ' \\| ENVOI \\| message PRS\\d+ \\| 2 produit\\(s\\) \\| version 1\\.0\\.0\\.0 \\| archive infoproduit/' + MOIS + '/I_PRS'))
      && a(new RegExp('\\| INFOPRODUIT \\| ' + g + ' \\| REPONSE RECUE \\| message PRS\\d+ \\| HTTP 200 \\| archive infoproduit/' + MOIS + '/RI_PRS'))
      && a(new RegExp('\\| INFOPRODUIT \\| ' + g + ' \\| RESULTAT \\| message PRS\\d+ \\| 1 disponible\\(s\\), 1 non disponible\\(s\\), 0 autre\\(s\\), 0 sans reponse')), j);
    ok('Vidage tracé : début, demande, réponse reçue, fin',
      a(new RegExp('\\| VIDAGE \\| ' + g + ' \\| DEBUT \\| version')) && a(new RegExp('\\| VIDAGE \\| ' + g + ' \\| DEMANDE \\| message \\d+ \\| archive vidages/' + MOIS + '/V_'))
      && a(new RegExp('\\| VIDAGE \\| ' + g + ' \\| REPONSE RECUE \\| HTTP 200 \\| archive vidages/' + MOIS + '/RV_')) && a(new RegExp('\\| VIDAGE \\| ' + g + ' \\| FIN \\| aucune reponse en attente')), j);
    ok('Injoignable tracé : 3 essais puis « NON_ENVOYEE » avec le message affiché',
      [1, 2, 3].every((n) => a(new RegExp('\\| HTTP \\| ' + g + ' \\| INJOIGNABLE \\| essai ' + n + '/3 http://127\\.0\\.0\\.1:1/pml/ \\| \\d+ ms \\| ConnectException')))
      && a(new RegExp('\\| COMMANDE \\| ' + g + ' \\| NON_ENVOYEE \\| COMMANDE ' + CMD2 + ' \\| ')), j);
    ok('Le journal ne contient ni la clé, ni l\'en-tête de contrôle, ni le contenu XML', !j.includes(CLE) && !/Content-PharmaML/i.test(j) && !/<LIGNE|<CSRP|Code_Produit/.test(j) && !cips.some((c) => j.includes(c)));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    /* lignes de journal de l'essai retirees ; archives de disponibilite et de vidage de l'essai retirees */
    if (fs.existsSync(JOURNAL)) { fs.truncateSync(JOURNAL, tailleJournal); if (tailleJournal === 0) { fs.unlinkSync(JOURNAL); } }
    archives.fichiers().filter((f) => /^(infoproduit|vidages)\//.test(f) && fs.statSync(path.join(archives.DOSSIER, f)).mtimeMs >= d.getTime())
      .forEach((f) => fs.unlinkSync(path.join(archives.DOSSIER, f)));
    const s = sauve.map((v) => (v === 'NULL' ? 'NULL' : "'" + v + "'"));
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + s[0] + ", int_PHARMAML_DISPO = " + sauve[1] + ", str_PHARMAML_VERSION_INFO = " + s[2] + ", str_PHARMAML_VERSION_CMDE = " + s[3]
      + ", str_CLE_RECEPTEUR = " + s[4] + ", str_PHARMAML_CONTROLE = " + s[5] + " WHERE lg_GROSSISTE_ID = '" + G + "'");
    ok('Données, archives et lignes de journal de l\'essai retirées, grossiste remis', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ")") === '0'
      && !archives.fichiers().some((f) => /E2E-PMJ/.test(f))
      && q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', int_PHARMAML_DISPO, '|', str_PHARMAML_VERSION_INFO, '|', str_PHARMAML_VERSION_CMDE, '|', IFNULL(str_CLE_RECEPTEUR, 'NULL'), '|', IFNULL(str_PHARMAML_CONTROLE, 'NULL')) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'") === sauve.join('|'));
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
