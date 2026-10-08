/* PHARMAML : BON DE LIVRAISON VALORISE, ALERTES, RECUPERATION, TABLEAU DE BORD (retours du 08/10 (11)).
 * Faux grossiste local qui depose au depot un BON_LIVRAISON (§ 3.2.4) et une ALERTE_REGLEMENTAIRE (§ 3.2.6) :
 *  - « RÉPONSES PHARMAML » (liste des commandes) vide aussi un grossiste actif sans envoi en attente ; le resume cite
 *    le BLV (rattache a la commande par Ref_Cde_Client) et l'alerte ; enregistrements en base ;
 *  - bandeau d'alerte non lue dans la liste des commandes -> onglet Alertes (detail, produits, stock) ;
 *    « J'ai pris connaissance » (qui, quand) ; le bandeau disparait ;
 *  - onglet Tableau de bord : tuiles, activite par grossiste, derniers echanges ; tuile « Alertes » cliquable ;
 *  - saisie du bon de livraison : BLV propose et choisi, numero/date/montants pre-remplis, detail des ecarts en
 *    lecture seule ; quantites recues = quantites livrees du BLV (et non celles de la reponse a la commande) ;
 *  - message redepose (copie) : aucun doublon ;
 *  - aucune erreur JavaScript, aucun en-tete tronque ; tout est retire a la fin (base et archives).
 */
const { execFileSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const archives = require('./archives-pharmaml');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const PORT = 18781, G = '51217123531215794892';
const CMD = 'E2E-BLV-CMD';
const DOC = 'BLV-E2E-1', ALR = 'E2E-ALR-1';
let P = [], cips = [], sauve = null, refCde = '';
const depot = [];
const avant = new Set(archives.fichiers());

const env = (corps, enRep) => '<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Nature_Action="REP_EMISSION" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>B' + Date.now() + Math.floor(Math.random() * 1000)
  + '</REF_MESSAGE>' + (enRep ? '<EN_REPONSE_A>' + enRep + '</EN_REPONSE_A>' : '') + '</ENTETE><CORPS>' + corps + '</CORPS></CSRP_ENVELOPPE>';
const msg = (corps) => '<MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS>' + corps + '</CORPS></MESSAGE_REPARTITEUR>';
const AUJ = new Date().toISOString().slice(0, 10);
/* ligne 1 : 2 commandes, 2 livres, 1000 (conforme) ; ligne 2 : 3 commandes, 1 livre, 1600 (ecart quantite et prix) */
const blv = () => msg('<BON_LIVRAISON Nature_Document="0003" Ref_Document="' + DOC + '" Nom_Client="OFFICINE E2E">'
  + '<INFOS_LIVRAISON><LIVREUR Societe="E2E TRANSPORT"/><TOURNEE Reference="T7" Date="' + AUJ + '"/></INFOS_LIVRAISON>'
  + '<VALOR Ref_Facture="FAC-E2E-1" Date="' + AUJ + '"><CUMUL Montant_HT="3600.000" Montant_Total_Taxes="0" Montant_TTC="3600.000"/></VALOR>'
  + '<LIVRAISON Ref_Livraison="' + DOC + '" Date="' + AUJ + '">'
  + '<LIGNE Num_Ligne="1" Ref_Cde_Client="' + refCde + '" Quantite_commandee="2" Quantite_livree="2" Quantite_facturee="2"><PRIX Nature="NETHT" Valeur="1000.000"/><TAXE_LV Nature="TVA" Taux="0"/>'
  + '<NORMALE Type_Codification="CIP39" Code_Produit="' + cips[0] + '"/></LIGNE>'
  + '<LIGNE Num_Ligne="2" Ref_Cde_Client="' + refCde + '" Quantite_commandee="3" Quantite_livree="1" Quantite_facturee="1" Commentaire="reliquat demain"><PRIX Nature="NETHT" Valeur="1600.000"/>'
  + '<NORMALE Type_Codification="CIP39" Code_Produit="' + cips[1] + '"/></LIGNE>'
  + '</LIVRAISON></BON_LIVRAISON>');
const alerte = () => msg('<ALERTE_REGLEMENTAIRE Numero_Alerte="' + ALR + '" Motif="Défaut de qualité" Designation_globale="Retrait de lots E2E" Arret_immediat="true"'
  + ' Commentaire_Instructions="Mettre en quarantaine et retourner au grossiste">'
  + '<EMETTEUR_FABRICANT Nom="LABO E2E"><INSTRUCTIONS Renvoi="true" Date_limite_Reprise="2026-10-31"/>'
  + '<PRODUIT Num_Ligne="1" Type_Codification="CIP39" Code_Produit="' + cips[0] + '" Designation="PRODUIT E2E"><LOT Numero_Lot="E2ELOT1"/></PRODUIT>'
  + '</EMETTEUR_FABRICANT></ALERTE_REGLEMENTAIRE>');

const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  const ref = (b.match(/Ref_Cde_Client="([^"]*)"/) || [])[1];
  const refMsg = (b.match(/<REF_MESSAGE>([^<]*)</) || [])[1];
  if (/<COMMANDE /.test(b)) {
    /* la reponse a la commande annonce tout livre : le BLV dira 1 au lieu de 3 pour la ligne 2 */
    const lignes = [...b.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
    rep.end(env(msg('<REP_COMMANDE Ref_Cde_Client="' + ref + '"><NORMALE>' + lignes.map((m) => '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + Number(m[2]) + '"><PRIX_N Nature="PHAHT" Valeur="1000"/><PRIX_N Nature="PUBTC" Valeur="2500"/></LIGNE_N>').join('')
      + '</NORMALE></REP_COMMANDE>'), refMsg));
    return;
  }
  if (/VIDAGE|ACQUITTEMENT/.test(b)) { rep.end(depot.length ? depot.shift() : env('<ACTION>FIN_SERVICE</ACTION>')); return; }
  rep.end(env('<ACTION>FIN_SERVICE</ACTION>'));
}); });

function nettoyer() {
  exec("DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (SELECT lg_BON_LIVRAISON_ID FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD + "');"
    + "DELETE FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD + "';"
    + "DELETE FROM t_pharmaml_blv_ligne WHERE lg_BLV_ID IN (SELECT lg_ID FROM t_pharmaml_blv WHERE str_REF_DOCUMENT = '" + DOC + "');"
    + "DELETE FROM t_pharmaml_blv WHERE str_REF_DOCUMENT = '" + DOC + "';"
    + "DELETE FROM t_pharmaml_alerte_produit WHERE lg_ALERTE_ID IN (SELECT lg_ID FROM t_pharmaml_alerte WHERE str_NUMERO = '" + ALR + "');"
    + "DELETE FROM t_pharmaml_alerte WHERE str_NUMERO = '" + ALR + "';"
    + "DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + CMD + "';"
    + "DELETE FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID = '" + CMD + "' OR lg_ORDER_ID = '" + CMD + "';"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'; DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';");
}
function poser() {
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + CMD + "', '" + CMD + "', 2, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
  P.forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + CMD + "-" + i + "', '" + CMD + "', '" + p + "', '" + G + "', " + (i + 2) + ", " + ((i + 2) * 1000) + ", 1000, 2000, 'is_Process', NOW(), NOW())"));
}
const url = (u) => exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (u === null || u === 'NULL' ? 'NULL' : "'" + u + "'") + ", str_PHARMAML_VERSION_CMDE = '1.0.0.0' WHERE lg_GROSSISTE_ID = '" + G + "'");
const versionG = (v) => exec("UPDATE t_grossiste SET str_PHARMAML_VERSION_CMDE = " + (v === 'NULL' ? 'NULL' : "'" + v + "'") + " WHERE lg_GROSSISTE_ID = '" + G + "'");

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  sauve = q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', IFNULL(str_PHARMAML_VERSION_CMDE, 'NULL')) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'").split('|');
  /* produits avec stock a l'emplacement principal (necessaire a la creation du bon de livraison) */
  const lus = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_CIP) ORDER BY str_NAME SEPARATOR '|') FROM (SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME FROM t_famille f WHERE f.str_STATUT='enable'"
    + " AND f.int_CIP REGEXP '^[0-9]{7}$' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1"
    + " AND EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1')"
    + " AND NOT EXISTS (SELECT 1 FROM t_famille_grossiste fg WHERE fg.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND fg.lg_GROSSISTE_ID = '" + G + "') ORDER BY f.str_NAME LIMIT 2) x").split('|');
  P = lus.map((x) => x.split(':')[0]); cips = lus.map((x) => x.split(':')[1]);
  var intervalle = '30';
  const stock0 = Number(q("SELECT IFNULL(SUM(int_NUMBER_AVAILABLE), 0) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + P[0] + "' AND lg_EMPLACEMENT_ID = '1'"));
  nettoyer();
  /* la recuperation automatique ne doit pas vider le depot du faux grossiste pendant le test */
  intervalle = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_PHARMAML_VIDAGE_MESSAGES_MIN'), '30')");
  exec("UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = 'KEY_PHARMAML_VIDAGE_MESSAGES_MIN'");
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const attendreListe = async () => {
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0 && Ext.ComponentQuery.query('i_order_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.evaluate(() => { Ext.getCmp('rechecher').setValue('E2E-BLV'); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); });
    await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', 'E2E-BLV-CMD') >= 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(600);
  };
  const cliquer = async (marquer, sel) => {
    for (let essai = 0; essai < 5; essai++) {
      await p.evaluate(marquer);
      try { await p.click(sel, { timeout: 4000 }); return; } catch (e) { if (essai === 4) { throw e; } await p.waitForTimeout(700); }
    }
  };
  const fermerMessage = async () => {
    await p.evaluate(() => { const m = Ext.MessageBox; if (m && m.isVisible()) { m.hide(); } });
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    url('http://127.0.0.1:' + PORT + '/ok/');
    poser();
    const envoi = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/pharma/' + id, { method: 'PUT' })).text()), CMD);
    refCde = q("SELECT str_REF_CDE FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + CMD + "' AND str_SOURCE = 'COMMANDE'");
    const attente = q("SELECT COUNT(*) FROM t_pharmaml_attente WHERE lg_GROSSISTE_ID = '" + G + "' AND str_STATUT = 'EN_ATTENTE'");
    ok('Commande envoyée et répondue tout de suite (aucun envoi en attente chez ce grossiste)', envoi.success !== false && refCde.length > 0 && attente === '0', JSON.stringify(envoi) + ' ' + refCde + ' attente=' + attente);

    /* le grossiste depose un BLV et une alerte (sans demande de l'officine) */
    depot.push(env(blv()), env(alerte()));
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
    await attendreListe();
    const idBt = await p.evaluate(() => Ext.ComponentQuery.query('i_order_manager')[0].down('#btnReponsesPharmaml').getEl().dom.id);
    let resume = '';
    for (let essai = 0; essai < 3; essai++) {
      await p.click('#' + idBt);
      await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Envois encore en attente/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 60000 });
      resume = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
      const attendre = resume.match(/réessayez dans (\d+) s/);
      if (!attendre) { break; }
      /* regle des 30 s entre deux vidages (execution precedente toute proche) : le test patiente comme l'utilisateur */
      await fermerMessage();
      await p.waitForTimeout((Number(attendre[1]) + 1) * 1000);
    }
    ok('« RÉPONSES PHARMAML » vide aussi le grossiste actif : le résumé cite le BLV (rattaché à la commande) et l\'alerte',
      new RegExp('bon de livraison valorisé ' + DOC + ' \\(commande ' + CMD + '\\)').test(resume) && new RegExp('alerte réglementaire ' + ALR).test(resume), resume);
    await fermerMessage();
    const enBase = q("SELECT CONCAT(IFNULL(lg_ORDER_ID, '-'), '|', int_LIGNES, '|', IFNULL(int_MONTANT_HT, '-'), '|', IFNULL(str_REF_FACTURE, ''), '|', IFNULL(str_TOURNEE, '')) FROM t_pharmaml_blv WHERE str_REF_DOCUMENT = '" + DOC + "'");
    const lignesBlv = q("SELECT GROUP_CONCAT(CONCAT(int_NUM, ':', IFNULL(lg_FAMILLE_ID, '-'), ':', int_QTE_LIVREE, ':', int_PRIX, ':', str_NATURE_PRIX) ORDER BY int_NUM SEPARATOR ' ') FROM t_pharmaml_blv_ligne WHERE lg_BLV_ID = (SELECT lg_ID FROM t_pharmaml_blv WHERE str_REF_DOCUMENT = '" + DOC + "')");
    ok('BLV enregistré : rattaché à la commande, montant de valorisation, facture, tournée, 2 lignes (produits reconnus, quantités, prix nets)',
      enBase === CMD + '|2|3600|FAC-E2E-1|T7' && lignesBlv === '1:' + P[0] + ':2:1000:NETHT 2:' + P[1] + ':1:1600:NETHT', enBase + ' / ' + lignesBlv);
    const alerteBase = q("SELECT CONCAT(str_TYPE, '|', b_ARRET_IMMEDIAT, '|', b_RENVOI, '|', IFNULL(str_DATE_LIMITE, ''), '|', IFNULL(dt_LU, 'non lue'), '|', (SELECT CONCAT(IFNULL(lg_FAMILLE_ID, '-'), ':', str_LOTS) FROM t_pharmaml_alerte_produit WHERE lg_ALERTE_ID = a.lg_ID)) FROM t_pharmaml_alerte a WHERE str_NUMERO = '" + ALR + "'");
    ok('Alerte enregistrée : réglementaire, arrêt immédiat, renvoi avant le 31/10, produit reconnu et lot visé, non lue',
      alerteBase === 'REGLEMENTAIRE|1|1|2026-10-31|non lue|' + P[0] + ':E2ELOT1', alerteBase);
    const journal = archives.fichiers().filter((f) => /^log\//.test(f)).map((f) => fs.readFileSync(path.join(archives.DOSSIER, f), 'utf8')).join('\n');
    ok('Journal des transmissions : BLV et ALERTE tracés', /BLV.*TRAITEE/.test(journal) && /ALERTE.*TRAITEE/.test(journal));

    /* bandeau de la liste des commandes */
    await p.evaluate(() => Ext.ComponentQuery.query('i_order_manager')[0].chargerAlertesPml());
    await p.waitForFunction(() => { const bd = Ext.ComponentQuery.query('i_order_manager')[0].down('#bandeauAlertesPml'); return bd.isVisible() && /non lue/.test(bd.getEl().dom.textContent); }, null, { timeout: 20000 });
    const bandeau = await p.evaluate(() => { const bd = Ext.ComponentQuery.query('i_order_manager')[0].down('#bandeauAlertesPml').getEl().dom; const d = bd.querySelector('.alerte-pml-bandeau');
      return { texte: bd.textContent, coupe: d.scrollWidth > d.clientWidth + 1 }; });
    ok('Liste des commandes : bandeau « alerte(s) PharmaML non lue(s), dont réglementaire, arrêt immédiat », non tronqué',
      /1 alerte\(s\) PharmaML non lue\(s\), dont 1 réglementaire\(s\)/.test(bandeau.texte) && /1 arrêt\(s\) immédiat\(s\)/.test(bandeau.texte) && /Retrait de lots E2E/.test(bandeau.texte) && !bandeau.coupe, JSON.stringify(bandeau));
    await p.screenshot({ path: SORTIE + '/blv-bandeau-alertes.png' });
    await cliquer(() => { const a = Ext.ComponentQuery.query('i_order_manager')[0].down('#bandeauAlertesPml').getEl().dom.querySelector('[data-ouvrir-alertes]'); a.id = 'e2e-voir-alertes'; }, '#e2e-voir-alertes');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('rupturepharma')[0]; return e && e.isVisible() && e.down('#ongletsRuptures').getActiveTab() === e.down('#ongletAlertes')
      && e.down('#grilleAlertes').getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const ong = await p.evaluate((alr) => { const e = Ext.ComponentQuery.query('rupturepharma')[0], g = e.down('#grilleAlertes'), st = g.getStore();
      const r = st.getAt(st.findExact('numero', alr)); g.getSelectionModel().select(r);
      const n = g.getView().getNode(r), pg = e.down('#grilleProduitsAlerte');
      return { titre: e.down('#ongletAlertes').tab.getEl().dom.textContent, ligne: n.textContent, lien: !!n.querySelector('[data-alerte-lue]'),
        detail: e.down('#detailAlerte').getEl().dom.textContent, produits: pg.getStore().getCount(), produit: pg.getView().getNode(0) ? pg.getView().getNode(0).textContent : '',
        stock: pg.getStore().getAt(0) ? pg.getStore().getAt(0).get('stock') : null, champs: e.down('#ongletAlertes').getEl().dom.querySelectorAll('textarea, input[type=text]:not([readonly])').length,
        filtreCoupe: (() => { const i = e.down('#filtreAlertes').inputEl.dom; return i.scrollWidth > i.clientWidth + 1; })(),
        cellulesCoupees: [...g.getView().getNode(r).querySelectorAll('.x-grid-cell-inner')].filter((c) => c.textContent.trim() && !c.querySelector('a') && c.scrollWidth > c.clientWidth + 1).map((c) => c.textContent),
        tronques: [...e.down('#ongletAlertes').getEl().dom.querySelectorAll('.x-column-header-inner')].filter((h) => h.textContent.trim() && h.scrollWidth > h.clientWidth + 1).map((h) => h.textContent) }; }, ALR);
    ok('Onglet Alertes ouvert depuis le bandeau : nombre de non lues dans le titre, ligne « Réglementaire / Arrêt immédiat », lien de prise de connaissance',
      /Alertes\s*1/.test(ong.titre) && /Réglementaire/.test(ong.ligne) && /Arrêt immédiat/.test(ong.ligne) && /1 \/ 1|0 \/ 1/.test(ong.ligne) && ong.lien, JSON.stringify(ong));
    ok('Détail : consignes (arrêt, renvoi avant le 31/10/2026), instructions ; produit concerné avec lot visé et stock réel',
      /Arrêt immédiat de la délivrance/.test(ong.detail) && /Renvoi du stock au grossiste avant le 31\/10\/2026/.test(ong.detail) && /quarantaine/.test(ong.detail)
      && ong.produits === 1 && /E2ELOT1/.test(ong.produit) && ong.stock === stock0, JSON.stringify(ong) + ' stock=' + stock0);
    ok('Onglet Alertes : aucun en-tête, filtre ni cellule tronqué, aucune saisie', ong.tronques.length === 0 && !ong.filtreCoupe && ong.cellulesCoupees.length === 0 && ong.champs === 0,
      JSON.stringify({ t: ong.tronques, f: ong.filtreCoupe, c: ong.cellulesCoupees }));
    await p.screenshot({ path: SORTIE + '/blv-onglet-alertes.png' });
    await cliquer((alr) => { const e = Ext.ComponentQuery.query('rupturepharma')[0], g = e.down('#grilleAlertes'), st = g.getStore();
      const a = g.getView().getNode(st.getAt(st.findExact('numero', 'E2E-ALR-1'))).querySelector('[data-alerte-lue]'); a.id = 'e2e-lue'; }, '#e2e-lue');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('rupturepharma')[0], st = e.down('#grilleAlertes').getStore(), r = st.getAt(st.findExact('numero', 'E2E-ALR-1')); return r && r.get('lu'); }, null, { timeout: 20000 });
    const lue = q("SELECT CONCAT(dt_LU IS NOT NULL, '|', IFNULL(str_LU_PAR, '')) FROM t_pharmaml_alerte WHERE str_NUMERO = '" + ALR + "'");
    const apres = await p.evaluate(() => { const e = Ext.ComponentQuery.query('rupturepharma')[0], g = e.down('#grilleAlertes'), st = g.getStore(), r = st.getAt(st.findExact('numero', 'E2E-ALR-1'));
      return { titre: e.down('#ongletAlertes').tab.getEl().dom.textContent, ligne: g.getView().getNode(r).textContent, info: e.down('#infoAlertes').getEl().dom.textContent }; });
    ok('« J\'ai pris connaissance » : qui et quand enregistrés, ligne marquée, compteur de l\'onglet à jour',
      /^1\|.+/.test(lue) && /✓/.test(apres.ligne) && /Prise de connaissance enregistrée/.test(apres.info) && !/Alertes\s*\d/.test(apres.titre.trim()) , lue + ' ' + JSON.stringify(apres));

    /* tableau de bord */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('rupturepharma')[0]; e.ouvrirOnglet('ongletTableauBord'); });
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('rupturepharma')[0]; const t = e.down('#tuilesPml'); return t.getEl() && t.getEl().dom.querySelectorAll('.pml-tuile').length === 6 && e.down('#grillePmlEvenements').getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(400);
    const tdb = await p.evaluate((g) => { const e = Ext.ComponentQuery.query('rupturepharma')[0], el = e.down('#tuilesPml').getEl().dom, val = {};
      el.querySelectorAll('.pml-tuile').forEach((t) => { val[t.getAttribute('data-tuile')] = { v: t.querySelector('.pml-tuile-valeur').textContent, sous: t.querySelector('.pml-tuile-sous').textContent,
        coupe: [...t.querySelectorAll('.pml-tuile-titre, .pml-tuile-valeur')].some((x) => x.scrollWidth > x.clientWidth + 1), clic: t.classList.contains('cliquable') }; });
      const gr = e.down('#grillePmlGrossistes').getStore(), r = gr.getAt(gr.findExact('id', g));
      return { val, grossiste: r ? r.getData() : null, evenements: e.down('#grillePmlEvenements').getStore().getRange().map((x) => x.get('commande') + ':' + x.get('statut')),
        tronques: [...e.down('#ongletTableauBord').getEl().dom.querySelectorAll('.x-column-header-inner')].filter((h) => h.textContent.trim() && h.scrollWidth > h.clientWidth + 1).map((h) => h.textContent) }; }, G);
    ok('Tableau de bord : 6 tuiles (attente, refus, taux de service, à décider, BLV à saisir, alertes), valeurs cohérentes, rien de tronqué',
      tdb.val.blv && Number(tdb.val.blv.v) >= 1 && tdb.val.alertes && /^\d+$/.test(tdb.val.alertes.v) && tdb.val.service && /%|—/.test(tdb.val.service.v)
      && Object.values(tdb.val).every((t) => !t.coupe) && tdb.tronques.length === 0, JSON.stringify(tdb.val) + ' ' + JSON.stringify(tdb.tronques));
    ok('Tableau de bord : activité du grossiste (envois 30 j, taux de service) et dernier échange de la commande',
      tdb.grossiste && tdb.grossiste.envois30j >= 1 && tdb.grossiste.tauxService === 100 && tdb.evenements.indexOf(CMD + ':TRAITEE') >= 0, JSON.stringify(tdb.grossiste) + ' ' + JSON.stringify(tdb.evenements));
    await p.screenshot({ path: SORTIE + '/blv-tableau-bord.png' });

    /* plus d'alerte non lue : le bandeau disparait */
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
    await attendreListe();
    await p.evaluate(() => Ext.ComponentQuery.query('i_order_manager')[0].chargerAlertesPml());
    await p.waitForTimeout(1500);
    const autres = Number(q("SELECT COUNT(*) FROM t_pharmaml_alerte WHERE dt_LU IS NULL"));
    const visible = await p.evaluate(() => Ext.ComponentQuery.query('i_order_manager')[0].down('#bandeauAlertesPml').isVisible());
    ok('Alerte lue : le bandeau disparaît de la liste des commandes', autres > 0 || !visible, 'autres non lues=' + autres + ' visible=' + visible);

    /* saisie du bon de livraison depuis la ligne de la commande */
    await cliquer(() => { const g = Ext.ComponentQuery.query('i_order_manager')[0], r = g.getStore().getAt(g.getStore().findExact('str_REF_ORDER', 'E2E-BLV-CMD'));
      const i = g.getView().getNode(r).querySelector('img[data-qtip="Créer le bon de livraisson"]'); i.id = 'e2e-creer-bl'; }, '#e2e-creer-bl');
    await p.waitForFunction(() => { const c = Ext.getCmp('cmbBlvPml'); return c && c.isVisible() && c.getValue(); }, null, { timeout: 20000 });
    await p.waitForTimeout(400);
    const saisie = await p.evaluate(() => { const c = Ext.getCmp('cmbBlvPml'), w = c.up('window'), vp = Ext.getBody().getViewSize();
      return { choix: c.getRawValue(), ref: Ext.getCmp('str_REF_LIVRAISON').getValue(), date: Ext.Date.format(Ext.getCmp('dt_DATE_LIVRAISON').getValue(), 'Y-m-d'),
        mht: String(Ext.getCmp('int_MHT').getValue()), tva: String(Ext.getCmp('int_TVA').getValue()), info: Ext.getCmp('infoBlvPml').getEl().dom.textContent,
        dedans: w.getX() >= 0 && w.getY() >= 0 && w.getX() + w.getWidth() <= vp.width && w.getY() + w.getHeight() <= vp.height,
        coupe: (() => { const i = c.inputEl.dom; return i.scrollWidth > i.clientWidth + 1; })(), options: c.getStore().getCount() }; });
    ok('Saisie du bon de livraison : BLV rattaché proposé et choisi, numéro, date, montant HT et TVA pré-remplis',
      new RegExp('^BL ' + DOC).test(saisie.choix) && saisie.ref === DOC && saisie.date === AUJ && saisie.mht === '3600' && saisie.tva === '0' && saisie.options >= 2 && /Voir le détail/.test(saisie.info), JSON.stringify(saisie));
    ok('Fenêtre de saisie : entièrement visible, choix du BLV lisible', saisie.dedans, JSON.stringify(saisie));
    await cliquer(() => { Ext.getCmp('infoBlvPml').getEl().dom.querySelector('[data-voir-blv]').id = 'e2e-voir-blv'; }, '#e2e-voir-blv');
    await p.waitForFunction(() => { const w = Ext.getCmp('fenBlvPml'); return w && w.isVisible() && w.down('#grilleBlv').getView().getNodes().length === 2; }, null, { timeout: 20000 });
    const det = await p.evaluate(() => { const w = Ext.getCmp('fenBlvPml'), el = w.getEl().dom, vp = Ext.getBody().getViewSize();
      return { entete: w.down('#enteteBlv').getEl().dom.textContent, ecarts: [...el.querySelectorAll('.blv-ligne-ecart')].length, texte: w.down('#grilleBlv').getEl().dom.textContent,
        champs: el.querySelectorAll('input, textarea').length, tronques: [...el.querySelectorAll('.x-column-header-inner')].filter((h) => h.textContent.trim() && h.scrollWidth > h.clientWidth + 1).map((h) => h.textContent),
        dedans: w.getX() >= 0 && w.getY() >= 0 && w.getX() + w.getWidth() <= vp.width && w.getY() + w.getHeight() <= vp.height }; });
    ok('Détail du BLV (lecture seule) : 1 écart de quantité, 1 écart de prix, la ligne concernée signalée, facture et commande citées',
      /1 écart\(s\) de quantité/.test(det.entete) && /1 écart\(s\) de prix/.test(det.entete) && /facture FAC-E2E-1/.test(det.entete) && new RegExp('commande ' + CMD).test(det.entete)
      && det.ecarts === 1 && /reliquat demain/.test(det.texte) && det.champs === 0 && det.tronques.length === 0 && det.dedans, JSON.stringify(det));
    await p.screenshot({ path: SORTIE + '/blv-detail.png' });
    await p.evaluate(() => Ext.getCmp('fenBlvPml').close());
    await p.screenshot({ path: SORTIE + '/blv-saisie.png' });
    /* enregistrer (montant different du montant machine -> confirmation) */
    await p.evaluate(() => { const w = Ext.getCmp('cmbBlvPml').up('window'); w.down('button[text=Enregistrer]').getEl().dom.id = 'e2e-enregistrer-bl'; });
    await p.click('#e2e-enregistrer-bl');
    await p.waitForTimeout(800);
    await p.evaluate(() => { const m = Ext.MessageBox; if (m.isVisible() && /different/.test(m.msg.getEl().dom.textContent)) { m.down('button[itemId=yes]').getEl().dom.id = 'e2e-oui'; } });
    if (await p.$('#e2e-oui')) { await p.click('#e2e-oui'); }
    for (let i = 0; i < 30 && q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD + "'") === '0'; i++) { await p.waitForTimeout(500); }
    const bon = q("SELECT CONCAT(str_REF_LIVRAISON, '|', int_MHT, '|', int_TVA) FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD + "'");
    const recues = q("SELECT GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, ':', d.int_QTE_CMDE, ':', d.int_QTE_RECUE, ':', d.int_QTE_MANQUANT) ORDER BY d.int_QTE_CMDE SEPARATOR ' ') FROM t_bon_livraison_detail d"
      + " JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.lg_ORDER_ID = '" + CMD + "'");
    const utilise = q("SELECT CONCAT(lg_BON_LIVRAISON_ID = (SELECT lg_BON_LIVRAISON_ID FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD + "'), '|', dt_UTILISE IS NOT NULL) FROM t_pharmaml_blv WHERE str_REF_DOCUMENT = '" + DOC + "'");
    ok('Bon de livraison créé avec le numéro et les montants du BLV', bon === DOC + '|3600|0', bon);
    ok('Quantités reçues = quantités livrées du BLV (2 et 1), manquant calculé (2), et non la réponse à la commande (3)',
      recues === P[0] + ':2:2:0 ' + P[1] + ':3:1:2', recues);
    ok('BLV marqué utilisé (rattaché au bon) : il n\'est plus proposé à saisir', utilise === '1|1', utilise);

    /* copie redeposee : pas de doublon (regle des 30 s entre deux vidages respectee) */
    await p.waitForTimeout(31000);
    depot.push(env(blv()), env(alerte()));
    const re = await p.evaluate(async () => JSON.parse(await (await fetch('../api/v1/pharma/reponses', { method: 'POST' })).text()));
    const doublons = q("SELECT CONCAT((SELECT COUNT(*) FROM t_pharmaml_blv WHERE str_REF_DOCUMENT = '" + DOC + "'), '|', (SELECT COUNT(*) FROM t_pharmaml_alerte WHERE str_NUMERO = '" + ALR + "'))");
    const statuts = (re.grossistes || []).flatMap((g) => (g.messages || []).map((m) => m.statut));
    ok('Message redéposé : acquitté sans doublon (BLV et alerte déjà connus)', doublons === '1|1' && statuts.filter((s) => s === 'DEJA_TRAITEE').length === 2, doublons + ' ' + JSON.stringify(statuts));

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
    await p.screenshot({ path: SORTIE + '/blv-erreur.png' }).catch(() => {});
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    url(sauve[0]); versionG(sauve[1]);
    exec("UPDATE t_parameters SET str_VALUE = '" + intervalle + "' WHERE str_KEY = 'KEY_PHARMAML_VIDAGE_MESSAGES_MIN'");
    archives.fichiers().filter((f) => !avant.has(f) && !/^log\//.test(f)).forEach((f) => fs.unlinkSync(path.join(archives.DOSSIER, f)));
    const reste = q("SELECT (SELECT COUNT(*) FROM t_pharmaml_blv WHERE str_REF_DOCUMENT = '" + DOC + "') + (SELECT COUNT(*) FROM t_pharmaml_alerte WHERE str_NUMERO = '" + ALR + "')"
      + " + (SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + CMD + "') + (SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD + "')");
    ok('Nettoyage : rien ne reste en base, archives du test retirées', reste === '0', reste);
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
