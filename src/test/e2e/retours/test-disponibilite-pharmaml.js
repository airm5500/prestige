/* DISPONIBILITE PHARMAML (plan d'octobre, lot L4 : section 1.2 et 2).
 *
 * Un faux grossiste PharmaML tourne pendant le test (serveur HTTP local) : il enregistre chaque message recu et repond
 * une REP_INFO_PRODUIT (produits a CIP pair : non disponibles avec motif, date et remplacant ; impairs : disponibles).
 * Le grossiste B (revérification) repond « disponible » pour tout.
 *
 * Ce que le test etablit, sur les vrais ecrans (suggestion puis commande) :
 *  - « Vérifier la disponibilité » : 55 produits -> deux requetes (50 + 5), en 3.0.0.0 (reglee sur la fiche ; SRP_ENVELOPPE,
 *    REQ_INFO_PRODUIT, Id_Moteur PRESTIGE), JAMAIS de message COMMANDE ; 55 resultats enregistres ;
 *  - la colonne DISPO : vert / rouge, info-bulle (motif, mise a disposition, remplacant) ; filtre « Non disponibles » ;
 *  - « Revérifier les indisponibles » : choix du grossiste B, seuls les non disponibles partent chez B, avec le CODE
 *    ARTICLE du produit chez B quand il existe ; ils deviennent disponibles ;
 *  - version 1.0.0.0 reglee sur le grossiste -> enveloppe CSRP 1.0.0.0 ; liste des grossistes : versions rendues ;
 *  - impression PDF dans l'onglet ;
 *  - commande : meme verification sur l'ecran de la commande ;
 *  - aucune erreur JavaScript. Tout est retire a la fin (URL, versions et codes article remis).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const http = require('http');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CAPT = process.env.CAPTURES || '/tmp';
const PORT = 18765;
const SUGG = 'E2E-DSP-SUGG', REF = 'E2E-DSP-REF', CMD = 'E2E-DSP-CMD', N = 55;
let GA, GB, sauveA, sauveB, prods = [];
const recus = [];

function repondre(xml, tout) {
  const v3 = /SRP_ENVELOPPE/.test(xml) && !/CSRP_ENVELOPPE/.test(xml);
  const lignes = [...xml.matchAll(/<LIGNE_REQ_INFO_PRODUIT Num_Ligne="(\d+)"[^>]*Code_Produit="([^"]*)"/g)];
  const ns = v3 ? 'urn:x-srp:fr.srp.protocole' : 'urn:x-csrp:fr.csrp.protocole', env = v3 ? 'SRP_ENVELOPPE' : 'CSRP_ENVELOPPE';
  return '<?xml version="1.0" encoding="UTF-8"?><' + env + ' xmlns="' + ns + ':enveloppe"><CORPS><MESSAGE_REPARTITEUR xmlns="' + ns + ':message"><CORPS><REP_INFO_PRODUIT><NORMALE>'
    + lignes.map((m) => { const pair = !tout && Number(m[2].slice(-1)) % 2 === 0;
      return '<LIGNE_REP_INFO_PRODUIT Num_Ligne="' + m[1] + '" Type_Codification="CIP39" Code_Produit="' + m[2] + '" Disponibilite="' + (pair ? 'Non' : 'Oui') + '">'
        + (pair ? '<INDISPONIBILITE Code_Reponse="4" Additif="MANQUE FABRICANT"><INFO_DISPO Date_Mise_Dispo="2026-10-20" Quantite_Dispo="12"/><PRODUIT_REMPLACANT Type_Remplacement="EQ" Code_Produit="1234567" Designation="GENERIQUE E2E"/></INDISPONIBILITE>' : '<PRIX_N Nature="PFHT" Valeur="1000"/>')
        + '</LIGNE_REP_INFO_PRODUIT>'; }).join('')
    + '</NORMALE></REP_INFO_PRODUIT></CORPS></MESSAGE_REPARTITEUR></CORPS></' + env + '>';
}
let attenteServeur = 0;
const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  recus.push({ chemin: req.url, xml: b }); setTimeout(() => { rep.writeHead(200, { 'Content-Type': 'text/xml' }); rep.end(repondre(b, req.url === '/b')); }, attenteServeur); }); });

function nettoyer() {
  exec("DELETE FROM t_disponibilite_produit WHERE lg_SOURCE_ID IN ('" + SUGG + "','" + CMD + "');"
    + "DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "';"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'; DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';"
    + "DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_GROSSISTE_ID LIKE 'E2E-DSP-%';");
  [[GA, sauveA], [GB, sauveB]].forEach(([g, s]) => { if (g && s) {
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (s[0] === 'NULL' ? 'NULL' : "'" + s[0] + "'") + ", str_PHARMAML_VERSION_INFO = '" + s[1] + "', str_PHARMAML_VERSION_CMDE = '" + s[2] + "', int_PHARMAML_DISPO = " + s[3] + " WHERE lg_GROSSISTE_ID = '" + g + "'"); } });
}

function poser() {
  [GA, GB] = q("SELECT GROUP_CONCAT(lg_GROSSISTE_ID ORDER BY str_LIBELLE SEPARATOR '|') FROM (SELECT lg_GROSSISTE_ID, str_LIBELLE FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 2) x").split('|');
  sauveA = q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', str_PHARMAML_VERSION_INFO, '|', str_PHARMAML_VERSION_CMDE, '|', int_PHARMAML_DISPO) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + GA + "'").split('|');
  sauveB = q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', str_PHARMAML_VERSION_INFO, '|', str_PHARMAML_VERSION_CMDE, '|', int_PHARMAML_DISPO) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + GB + "'").split('|');
  exec("UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:" + PORT + "/a', str_PHARMAML_VERSION_INFO = '3.0.0.0', int_PHARMAML_DISPO = 1 WHERE lg_GROSSISTE_ID = '" + GA + "';"
    + "UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:" + PORT + "/b', str_PHARMAML_VERSION_INFO = '3.0.0.0', int_PHARMAML_DISPO = 1 WHERE lg_GROSSISTE_ID = '" + GB + "'");
  prods = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_CIP) ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, int_CIP, str_NAME FROM t_famille WHERE str_STATUT = 'enable'"
    + " AND int_CIP REGEXP '^[0-9]{7}$' AND COALESCE(bool_DECONDITIONNE, 0) = 0 ORDER BY str_NAME LIMIT " + N + ") x").split('|').map((x) => ({ id: x.split(':')[0], cip: x.split(':')[1] }));
  exec("INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + SUGG + "', '" + REF + "', '" + GA + "', 'is_Process', NOW(), NOW())");
  exec("INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg) VALUES "
    + prods.map((p, i) => "('E2E-DSP-L" + i + "', '" + SUGG + "', '" + GA + "', '" + p.id + "', 2, 200, 150, 100, NOW(), NOW(), 'is_Process', 0)").join(','));
  /* code article chez B pour le premier produit non disponible (CIP pair) */
  const pair = prods.find((p) => Number(p.cip.slice(-1)) % 2 === 0);
  exec("INSERT INTO t_famille_grossiste (lg_FAMILLE_GROSSISTE_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, str_CODE_ARTICLE, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('E2E-DSP-FG', '" + pair.id + "', '" + GB + "', 'ART-B-777', 'enable', NOW(), NOW())");
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + CMD + "', '" + CMD + "', 2, '" + GA + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
  prods.slice(0, 2).forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + CMD + "-" + i + "', '" + CMD + "', '" + p.id + "', '" + GA + "', 1, 0, 'is_Process', NOW(), NOW())"));
  return pair;
}

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  let pair;
  try { pair = poser(); } catch (e) { console.log('FATAL ' + e.message); nettoyer(); serveur.close(); process.exit(1); }
  let nbPairs = 0;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const attendreFin = async () => { await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Information seulement|injoignable|erreur|illisible/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 120000 });
    const t = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent); await p.evaluate(() => Ext.MessageBox.hide()); return t; };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.evaluate((ref) => { Ext.getCmp('rechecher').setValue(ref); Ext.ComponentQuery.query('i_sugg_manager')[0].onRechClick(); }, REF);
    await p.waitForFunction((ref) => { const st = Ext.ComponentQuery.query('i_sugg_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF', ref) >= 0; }, REF, { timeout: 30000 });
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF', ref)); }, REF);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    ok('Ouverture : aucune interrogation du grossiste', recus.length === 0, recus.length);

    /* Verifier */
    attenteServeur = 1500;
    await p.click('#btn_dispo_verifier');
    /* retours du 08/10 : barre animee pendant l'attente du grossiste (elle defile meme pour un seul paquet) */
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && Ext.MessageBox.progressBar && Ext.MessageBox.progressBar.isVisible(), null, { timeout: 10000 });
    const anim = await p.evaluate(async () => { const pb = Ext.MessageBox.progressBar; const l1 = pb.bar.getWidth(); await new Promise((r) => setTimeout(r, 400));
      return { attente: pb.isWaiting(), l1, l2: pb.bar.getWidth(), texte: pb.getEl().dom.textContent }; });
    ok('Vérification : barre de progression animée pendant l\'attente du grossiste, avancement en texte', anim.attente && anim.l1 !== anim.l2 && /produit\(s\)/.test(anim.texte), JSON.stringify(anim));
    attenteServeur = 0;
    const fin1 = await attendreFin();
    /* Codes reellement envoyes (code article chez ce grossiste s'il existe, sinon CIP) : le faux grossiste repond selon eux. */
    const envoyes = recus.flatMap((r) => [...r.xml.matchAll(/<LIGNE_REQ_INFO_PRODUIT [^>]*Code_Produit="([^"]*)"/g)].map((m) => m[1]));
    nbPairs = envoyes.filter((c) => Number(c.slice(-1)) % 2 === 0).length;
    ok('Deux requêtes (50 + 5) au grossiste de la suggestion', recus.length === 2 && recus.every((r) => r.chemin === '/a')
      && (recus[0].xml.match(/<LIGNE_REQ_INFO_PRODUIT /g) || []).length === 50 && (recus[1].xml.match(/<LIGNE_REQ_INFO_PRODUIT /g) || []).length === 5, recus.map((r) => r.chemin + ':' + (r.xml.match(/<LIGNE_REQ_INFO_PRODUIT /g) || []).length).join(','));
    ok('Version 3.0.0.0 (fiche) : SRP_ENVELOPPE, REQ_INFO_PRODUIT, Id_Moteur PRESTIGE', recus.every((r) => /<SRP_ENVELOPPE[^>]*Version_Protocole="3\.0\.0\.0"[^>]*Id_Moteur="PRESTIGE"/.test(r.xml) && /<REQ_INFO_PRODUIT /.test(r.xml)));
    ok('Jamais de message COMMANDE', recus.every((r) => !/<COMMANDE[ >]|LIGNE_N /.test(r.xml)));
    ok('Résumé : non disponibles et disponibles comptés selon les réponses (' + nbPairs + ' / ' + (N - nbPairs) + ')', new RegExp((N - nbPairs) + ' disponible\\(s\\), ' + nbPairs + ' non disponible').test(fin1), fin1);
    ok('55 résultats enregistrés', q("SELECT COUNT(*) FROM t_disponibilite_produit WHERE lg_SOURCE_ID = '" + SUGG + "'") === String(N));
    const col = await p.evaluate(() => { const g = Ext.getCmp('gridpanelSuggestionID'); const n = g.getEl().dom.querySelectorAll('.dispo-boule');
      const rouge = g.getEl().dom.querySelector('.dispo-boule[data-dispo=NON]'); return { n: n.length, vert: g.getEl().dom.querySelectorAll('.dispo-boule[data-dispo=OUI]').length,
        rouge: g.getEl().dom.querySelectorAll('.dispo-boule[data-dispo=NON]').length, tip: rouge ? rouge.closest('td').getAttribute('data-qtip') : '' }; });
    ok('Colonne DISPO : boules vertes et rouges, info-bulle complète', col.n > 0 && col.vert + col.rouge === col.n && /MANQUE FABRICANT/.test(col.tip) && /2026-10-20 \(12\)/.test(col.tip) && /GENERIQUE E2E/.test(col.tip), JSON.stringify(col));
    await p.screenshot({ path: CAPT + '/dispo-suggestion.png' });
    await p.evaluate(() => { const c = Ext.getCmp('gridpanelSuggestionID').up('form').down('#filtreDispo'); c.setValue('NON'); c.fireEvent('select', c); });
    await p.waitForTimeout(400);
    const filtre = await p.evaluate(() => { const st = Ext.getCmp('gridpanelSuggestionID').getStore(); const e = Me_Window.etatDispo; const r = []; st.each((x) => r.push(e[x.get('lg_FAMILLE_ID')] && e[x.get('lg_FAMILLE_ID')].statut)); return r; });
    ok('Filtre « Non disponibles » : la page ne montre que des non disponibles', filtre.length > 0 && filtre.every((s) => s === 'NON'), JSON.stringify(filtre));
    await p.evaluate(() => { const c = Ext.getCmp('gridpanelSuggestionID').up('form').down('#filtreDispo'); c.setValue(''); c.fireEvent('select', c); });

    /* Reverifier chez B */
    recus.length = 0;
    await p.click('#btn_dispo_reverifier');
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('#dispoChoixGrossiste')[0]; return w && w.down('#grossiste').getStore().getCount() > 0; }, null, { timeout: 20000 });
    await p.evaluate((g) => { const w = Ext.ComponentQuery.query('#dispoChoixGrossiste')[0]; w.down('#grossiste').setValue(g); }, GB);
    await p.screenshot({ path: CAPT + '/dispo-choix-grossiste.png' });
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('#dispoChoixGrossiste')[0].down('#ok').getId()));
    const fin2 = await attendreFin();
    const lignesB = recus.map((r) => (r.xml.match(/<LIGNE_REQ_INFO_PRODUIT /g) || []).length).reduce((a, x) => a + x, 0);
    ok('Revérification : seuls les non disponibles (' + nbPairs + ') partent, chez le grossiste B', recus.every((r) => r.chemin === '/b') && lignesB === nbPairs, lignesB + ' / ' + fin2);
    ok('Code article du produit chez B utilisé', recus.some((r) => /Code_Produit="ART-B-777"/.test(r.xml)) && !recus.some((r) => new RegExp('Code_Produit="' + pair.cip + '"').test(r.xml)));
    const reste = q("SELECT COUNT(*) FROM (SELECT d.lg_FAMILLE_ID, d.str_STATUT FROM t_disponibilite_produit d JOIN (SELECT lg_FAMILLE_ID f, MAX(dt_CREATED) dt FROM t_disponibilite_produit WHERE lg_SOURCE_ID='" + SUGG + "' GROUP BY lg_FAMILLE_ID) x ON x.f=d.lg_FAMILLE_ID AND x.dt=d.dt_CREATED WHERE d.lg_SOURCE_ID='" + SUGG + "') y WHERE y.str_STATUT <> 'OUI'");
    ok('Après revérification : tous disponibles', reste === '0', reste);

    /* Version 1.0.0.0 */
    const v = await p.evaluate(async (g) => (await fetch('../api/v1/grossistes/pharmaml-version', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'lg_GROSSISTE_ID=' + g + '&versionInfo=1.0.0.0&versionCommande=3.0.0.0' })).json(), GA);
    recus.length = 0;
    await p.click('#btn_dispo_verifier');
    await attendreFin();
    ok('Version 1.0.0.0 réglée sur le grossiste : enveloppe CSRP 1.0.0.0', v.success && recus.length === 2 && recus.every((r) => /<CSRP_ENVELOPPE[^>]*Version_Protocole="1\.0\.0\.0"/.test(r.xml) && !/<COMMANDE[ >]/.test(r.xml)), JSON.stringify(v));
    const liste = await p.evaluate(async () => (await fetch('../api/v1/grossistes?limit=500')).json());
    const gA = (liste.results || []).find((x) => x.lg_GROSSISTE_ID === liste.results.find((y) => y.str_PHARMAML_VERSION_INFO === '1.0.0.0').lg_GROSSISTE_ID);
    ok('Liste des grossistes : versions rendues', gA && gA.str_PHARMAML_VERSION_INFO === '1.0.0.0' && gA.str_PHARMAML_VERSION_CMDE === '3.0.0.0', JSON.stringify(gA && { i: gA.str_PHARMAML_VERSION_INFO, c: gA.str_PHARMAML_VERSION_CMDE }));

    const pdf = await p.evaluate(async (id) => { const r = await fetch('../api/v1/disponibilite/pdf?source=SUGGESTION&id=' + id + '&reference=X'); return r.headers.get('content-type') + ' ' + r.headers.get('content-disposition'); }, SUGG);
    ok('Impression PDF dans l\'onglet (inline)', /application\/pdf/.test(pdf) && /inline/.test(pdf), pdf);

    /* Commande */
    recus.length = 0;
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.evaluate((ref) => { Ext.getCmp('rechecher').setValue(ref); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); }, CMD);
    await p.waitForFunction((ref) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', ref) >= 0; }, CMD, { timeout: 30000 });
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF_ORDER', ref)); }, CMD);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.click('#btn_cmd_dispo_verifier');
    const fin3 = await attendreFin();
    const boules = await p.evaluate(() => Ext.getCmp('gridpanelID').getEl().dom.querySelectorAll('.dispo-boule').length);
    ok('Commande : vérification (1 requête, 2 produits, aucune COMMANDE), colonne DISPO remplie', recus.length === 1 && (recus[0].xml.match(/<LIGNE_REQ_INFO_PRODUIT /g) || []).length === 2
      && !/<COMMANDE[ >]/.test(recus[0].xml) && boules === 2 && q("SELECT COUNT(*) FROM t_disponibilite_produit WHERE lg_SOURCE_ID='" + CMD + "' AND str_SOURCE='COMMANDE'") === '2', fin3 + ' / ' + boules);
    await p.screenshot({ path: CAPT + '/dispo-commande.png' });

    /* Disponibilite desactivee dans la fiche du grossiste (08/10) */
    const d0 = await p.evaluate(async (g) => (await fetch('../api/v1/grossistes/pharmaml-version', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'lg_GROSSISTE_ID=' + g + '&versionInfo=1.0.0.0&versionCommande=3.0.0.0&disponibilite=0' })).json(), GA);
    ok('Fiche : disponibilité désactivée enregistrée, versions inchangées', d0.success && q("SELECT CONCAT(int_PHARMAML_DISPO, str_PHARMAML_VERSION_CMDE) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + GA + "'") === '03.0.0.0', JSON.stringify(d0));
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0 && Ext.ComponentQuery.query('i_order_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    await p.evaluate((ref) => { Ext.getCmp('rechecher').setValue(ref); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); }, CMD);
    await p.waitForFunction((ref) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', ref) >= 0; }, CMD, { timeout: 30000 });
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF_ORDER', ref)); }, CMD);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 30000 });
    await p.waitForFunction(() => { const b = Ext.getCmp('btn_cmd_dispo_verifier'); return b && b.isHidden(); }, null, { timeout: 15000 }).catch(() => {});
    const etatBoutons = await p.evaluate(() => ({ verifier: Ext.getCmp('btn_cmd_dispo_verifier').isHidden(), reverifier: Ext.getCmp('btn_cmd_dispo_reverifier').isHidden(), imprimer: Ext.getCmp('btn_cmd_dispo_imprimer').isHidden(),
      boules: Ext.getCmp('gridpanelID').getEl().dom.querySelectorAll('.dispo-boule').length }));
    ok('Commande, grossiste désactivé : « Vérifier » masqué, anciens résultats et impression gardés', etatBoutons.verifier && !etatBoutons.imprimer && etatBoutons.boules === 2, JSON.stringify(etatBoutons));
    recus.length = 0;
    const refus = await p.evaluate(async (a) => (await fetch('../api/v1/disponibilite/verifier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'COMMANDE', id: a.cmd, familles: [a.f] }) })).json(), { cmd: CMD, f: prods[0].id });
    ok('Appel direct refusé avec un message clair, rien envoyé au grossiste', refus.success === false && refus.desactivee === true && /désactivée/.test(refus.msg) && recus.length === 0, JSON.stringify(refus));
    await p.screenshot({ path: CAPT + '/dispo-commande-desactivee.png' });
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    ok('Jeu d\'essai retiré, grossistes remis', q("SELECT COUNT(*) FROM t_disponibilite_produit WHERE lg_SOURCE_ID IN ('" + SUGG + "','" + CMD + "')") === '0'
      && q("SELECT IFNULL(str_URL_PHARMAML, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID='" + GA + "'") === sauveA[0]
      && q("SELECT str_PHARMAML_VERSION_INFO FROM t_grossiste WHERE lg_GROSSISTE_ID='" + GA + "'") === sauveA[1]);
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
