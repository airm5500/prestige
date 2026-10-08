/* RETOURS DU 08/10 (3) : COMMANDES EN COURS, REPONSE DU GROSSISTE, RUPTURES, DISPONIBILITE DPCI.
 * Faux grossiste local (le grossiste d'essai est detourne pendant le test, puis remis) :
 *  - liste des commandes en cours : s'affiche meme avec une ligne sans prix (plantage du journal log_cmde) ;
 *  - ecran de la commande : bouton de verification de disponibilite SUR LA LIGNE ; reponse vide facon DPCI (une ligne
 *    sans code) -> avertissement explicite, message entier (pas tronque) ;
 *  - selection d'une ligne : fond continu sur toute la ligne (cellule et contenu de meme couleur) ;
 *  - reponse a la commande : 1 ligne livree SANS prix public (PUBTC absent), 1 ligne en rupture « Manque Rayon » :
 *    la commande ne garde que la ligne livree (nombre de lignes = 1), prix de vente de la ligne conserve ;
 *  - « Voir la réponse du grossiste » sur la ligne (commandes en cours ET suggestion) : fenetre en lecture seule,
 *    2 produits, etats Livré / Rupture, motif, aucun champ de saisie ;
 *  - suggestion commandee : NOMBRE.LIGNE « 1 / 2 » avec info-bulle ;
 *  - liste des ruptures : date ET heure, motif dans le detail ;
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
const PORT = 18773, G = '51217123531215794892';
const CMD = 'E2E-0810D-CMD', NUL = 'E2E-0810D-NUL', SUGG = 'E2E-0810D-SUGG', CMDS = [CMD, NUL];
const DOSSIER = '/root/prestige/pharmaml';
let P = [], sauve = null;
const recus = [];

const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  recus.push({ chemin: req.url, xml: b });
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  if (/REQ_INFO_PRODUIT/.test(b)) {
    /* reponse de DPCI du 08/10 (fichier RI_) : une seule ligne vide */
    rep.end('<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Nature_Action="REP_EMISSION" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>E2E</REF_MESSAGE></ENTETE><CORPS>'
      + '<MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS><REP_INFO_PRODUIT Ref_Demande_Info="X" Ref_Reponse_Info="Y"><LIGNE Num_Ligne="0" Num_Ligne_Demande="0" Type_Codification="" Code_Produit="">'
      + '<PRIX Nature="NETHT" Valeur="0.000"/><PRIX Nature="PTCBT" Valeur="0.000"/><NON_DISPO Code_Reponse="" Additif=""/></LIGNE></REP_INFO_PRODUIT></CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>');
    return;
  }
  const lignes = [...b.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
  const corps = lignes.map((m, i) => i === 0
    ? '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + Number(m[2]) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/></LIGNE_N>'
    : '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="0"><PRIX_N Nature="PHAHT" Valeur="1400"/><INDISPONIBILITE_N Code_Reponse="0005" Additif="Manque Rayon"/></LIGNE_N>').join('');
  rep.end('<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>E2E</REF_MESSAGE></ENTETE><CORPS><MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS><REP_COMMANDE><NORMALE>' + corps + '</NORMALE></REP_COMMANDE></CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>');
}); });

const liste = (a) => a.map((x) => "'" + x + "'").join(',');
function nettoyer() {
  require('./archives-pharmaml').retirer(/E2E-0810D/);
  exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference IN (" + liste(CMDS) + ")); DELETE FROM rupture WHERE reference IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (" + liste(CMDS) + "); DELETE FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID IN (" + liste(CMDS) + "); DELETE FROM t_pharmaml_remplacement WHERE lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ") OR lg_ORDER_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_disponibilite_produit WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "';");
}
function poser(cmd, prix) {
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + cmd + "', '" + cmd + "', 2, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
  P.forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + cmd + "-" + i + "', '" + cmd + "', '" + p + "', '" + G + "', " + (i + 2) + ", " + (prix ? '0, 1000, 2000' : 'NULL, NULL, NULL') + ", 'is_Process', NOW(), NOW())"));
}
const regler = (url, dispo) => exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (url === null ? 'NULL' : "'" + url + "'")
  + (dispo === undefined ? '' : ", int_PHARMAML_DISPO = " + dispo + ", str_PHARMAML_VERSION_INFO = '1.0.0.0'") + " WHERE lg_GROSSISTE_ID = '" + G + "'");

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  sauve = q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', int_PHARMAML_DISPO, '|', str_PHARMAML_VERSION_INFO) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'").split('|');
  P = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, str_NAME FROM t_famille WHERE str_STATUT='enable'"
    + " AND int_CIP REGEXP '^[0-9]{7}$' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = t_famille.int_CIP) = 1 ORDER BY str_NAME LIMIT 2) x").split('|');
  nettoyer();
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const listeCommandes = async (texte, attendue) => {
    await p.evaluate((t) => { Ext.getCmp('rechecher').setValue(t); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); }, texte);
    await p.waitForFunction((ref) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', ref) >= 0; }, attendue, { timeout: 30000 });
    await p.waitForTimeout(500);
  };
  const ouvrirCommandes = async () => {
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0 && Ext.ComponentQuery.query('i_order_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1200);
  };
  /* fenetre « reponse du grossiste » ouverte par le clic sur l'icone de la ligne */
  const lireFenetre = async () => {
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('#fenReponseGrossiste')[0]; return w && w.isVisible() && w.down('#grilleReponse').getView().getNodes().length > 0; }, null, { timeout: 20000 });
    await p.waitForTimeout(300);
    return p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenReponseGrossiste')[0], g = w.down('#grilleReponse'), el = w.getEl().dom;
      const vp = Ext.getBody().getViewSize();
      const r = { lignes: g.getStore().getCount(), etats: [...el.querySelectorAll('.etat-rep')].map((e) => e.getAttribute('data-etat')).sort(),
        texte: g.getEl().dom.textContent, entete: w.down('#enteteReponse').getEl().dom.textContent, champs: el.querySelectorAll('input, textarea').length,
        tronques: [...el.querySelectorAll('.x-column-header-text')].filter((h) => h.scrollWidth > h.clientWidth + 1).map((h) => h.textContent),
        dedans: w.getX() >= 0 && w.getY() >= 0 && w.getX() + w.getWidth() <= vp.width && w.getY() + w.getHeight() <= vp.height };
      w.close(); return r; });
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* 1) liste des commandes en cours avec une ligne sans prix (log_cmde : NullPointerException) */
    poser(NUL, false);
    poser(CMD, true);
    await ouvrirCommandes();
    await listeCommandes('E2E-0810D', NUL);
    const nul = await p.evaluate((ref) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); const r = st.getAt(st.findExact('str_REF_ORDER', ref)); return { lignes: r.get('int_LINE'), pa: r.get('PRIX_ACHAT_TOTAL') }; }, NUL);
    ok('Commandes en cours : la liste s\'affiche avec une commande dont les lignes n\'ont pas de prix', Number(nul.lignes) === 2 && Number(nul.pa) === 0, JSON.stringify(nul));

    /* 2) selection d'une ligne : fond continu */
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.getSelectionModel().select(g.getStore().findExact('str_REF_ORDER', ref)); }, CMD);
    await p.mouse.move(5, 5);
    await p.waitForTimeout(300);
    const fonds = await p.evaluate(() => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; const n = g.getView().getNode(g.getSelectionModel().getSelection()[0]);
      const c = new Set(); n.querySelectorAll('td.x-grid-cell').forEach((td) => { c.add(getComputedStyle(td).backgroundColor); const i = td.querySelector('.x-grid-cell-inner');
        if (i && getComputedStyle(i).backgroundColor !== 'rgba(0, 0, 0, 0)') { c.add(getComputedStyle(i).backgroundColor); } }); return [...c]; });
    ok('Ligne sélectionnée : un seul fond sur toute la ligne (plus de trait discontinu)', fonds.length === 1 && fonds[0] !== 'rgba(0, 0, 0, 0)', JSON.stringify(fonds));

    /* 3) ecran de la commande : verification de disponibilite sur la ligne, reponse vide facon DPCI */
    regler('http://127.0.0.1:' + PORT + '/dpci/', 1);
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF_ORDER', ref)); }, CMD);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 30000 });
    await p.waitForFunction(() => Ext.getCmp('gridpanelID').getEl().dom.querySelectorAll('[data-verif-dispo]').length === 2, null, { timeout: 15000 }).catch(() => {});
    const boutons = await p.evaluate(() => Ext.getCmp('gridpanelID').getEl().dom.querySelectorAll('[data-verif-dispo]').length);
    ok('Commande : bouton « vérifier la disponibilité » sur chaque ligne (comme en suggestion)', boutons === 2, boutons);
    recus.length = 0;
    await p.evaluate(() => { const v = Ext.getCmp('gridpanelID').getEl().dom.querySelector('[data-verif-dispo]'); v.id = 'e2e-verif-ligne'; });
    await p.click('#e2e-verif-ligne');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Information seulement/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 60000 });
    await p.waitForTimeout(400);
    const msg = await p.evaluate(() => { const box = Ext.MessageBox, m = box.msg.getEl().dom, corps = box.body ? box.body.dom : m.parentNode;
      const vp = Ext.getBody().getViewSize();
      return { texte: m.textContent, coupe: corps.scrollHeight > corps.clientHeight + 2 || m.scrollWidth > m.clientWidth + 2,
        dedans: box.getX() >= 0 && box.getX() + box.getWidth() <= vp.width && box.getY() + box.getHeight() <= vp.height }; });
    await p.screenshot({ path: SORTIE + '/0810d-dispo-dpci.png' });
    await p.evaluate(() => Ext.MessageBox.hide());
    ok('Vérification d\'UNE ligne : une requête au grossiste avec ce seul produit', recus.length === 1 && (recus[0].xml.match(/<LIGNE_REQ_INFO_PRODUIT /g) || []).length === 1, recus.length);
    ok('Réponse vide (DPCI) : avertissement explicite (le grossiste ne fournit pas la disponibilité, désactivable dans la fiche)',
      /sans aucune information produit/.test(msg.texte) && /Interroger la disponibilité/.test(msg.texte) && /1 sans réponse/.test(msg.texte), msg.texte);
    ok('Message d\'information entier (ni tronqué ni hors de l\'écran)', !msg.coupe && msg.dedans, JSON.stringify(msg));

    /* 4) reponse a la commande : 1 livree sans PUBTC, 1 en rupture « Manque Rayon » */
    regler('http://127.0.0.1:' + PORT + '/cmd/');
    const r = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/pharma/' + id, { method: 'PUT' })).text()), CMD);
    ok('Commande envoyée : 1 produit pris en compte, 1 en rupture', r.success !== false && r.nbreproduit === 1 && r.nbrerupture === 1, JSON.stringify(r));
    const reste = q("SELECT CONCAT(COUNT(*), '|', IFNULL(MAX(int_PRICE_DETAIL), 'NULL'), '|', IFNULL(MAX(lg_FAMILLE_ID), '')) FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'");
    ok('La commande ne garde que la ligne livrée ; prix de vente conservé quand le grossiste n\'envoie pas de PUBTC', reste === '1|2000|' + P[0], reste);

    await ouvrirCommandes();
    await listeCommandes(CMD, CMD);
    const ligne = await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; const rec = g.getStore().getAt(g.getStore().findExact('str_REF_ORDER', ref));
      const n = g.getView().getNode(rec); const voir = n.querySelector('.envoi-pml-voir'); if (voir) { voir.id = 'e2e-voir-cmd'; }
      return { lignes: rec.get('int_LINE'), envoi: rec.get('str_ENVOI_PHARMAML'), voir: !!voir && voir.offsetWidth > 0 }; }, CMD);
    ok('Liste : nombre de lignes mis à jour (1), pastille « Partielle », bouton « voir la réponse » sur la ligne', Number(ligne.lignes) === 1 && ligne.envoi === 'PARTIELLE' && ligne.voir, JSON.stringify(ligne));
    await p.click('#e2e-voir-cmd');
    const f1 = await lireFenetre();
    ok('Réponse du grossiste lisible sans XML : 2 produits, Livré / Rupture, motif « Manque Rayon », état en entête', f1.lignes === 2 && JSON.stringify(f1.etats) === '["LIVRE","RUPTURE"]'
      && /Manque Rayon/.test(f1.texte) && /Partielle/.test(f1.entete) && /1 produit\(s\) pris en compte, 1 en rupture sur 2/.test(f1.entete), JSON.stringify(f1));
    ok('Fenêtre en lecture seule, en-têtes entiers, dans l\'écran', f1.champs === 0 && f1.tronques.length === 0 && f1.dedans, JSON.stringify(f1));

    /* 5) suggestion commandee liee a cette commande : « 1 / 2 » et meme fenetre */
    exec("INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED, dt_COMMANDEE, str_MODE_COMMANDE, lg_ORDER_ID)"
      + " VALUES ('" + SUGG + "', '" + SUGG + "-REF', '" + G + "', 'commandee', NOW(), NOW(), NOW(), 'PHARMAML', '" + CMD + "')");
    P.forEach((f, i) => exec("INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg)"
      + " VALUES ('" + SUGG + "-L" + i + "', '" + SUGG + "', '" + G + "', '" + f + "', " + (i + 2) + ", 200, 1500, 1000, NOW(), NOW(), 'is_Process', 0)"));
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0 && Ext.ComponentQuery.query('i_sugg_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    await p.evaluate((ref) => { Ext.getCmp('rechecher').setValue(ref); Ext.ComponentQuery.query('i_sugg_manager')[0].onRechClick(); }, SUGG + '-REF');
    await p.waitForFunction((ref) => { const st = Ext.ComponentQuery.query('i_sugg_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF', ref) >= 0; }, SUGG + '-REF', { timeout: 30000 });
    await p.waitForTimeout(500);
    const sg = await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; const n = g.getView().getNode(g.getStore().getAt(g.getStore().findExact('str_REF', ref)));
      const l = n.querySelector('.lignes-livrees'); const voir = n.querySelector('.envoi-pml-voir'); if (voir) { voir.id = 'e2e-voir-sugg'; }
      return { texte: l ? l.textContent : '', tip: l ? l.closest('td').getAttribute('data-qtip') : '', voir: !!voir && voir.offsetWidth > 0,
        envoi: (n.querySelector('.envoi-pml') || {}).textContent }; }, SUGG + '-REF');
    ok('Suggestion : NOMBRE.LIGNE « 1 / 2 » (lignes retenues / commandées) avec info-bulle', sg.texte === '1 / 2' && /1 ligne\(s\) retenue\(s\) par le grossiste sur 2/.test(sg.tip) && /rupture/.test(sg.tip), JSON.stringify(sg));
    await p.screenshot({ path: SORTIE + '/0810d-suggestion-lignes.png' });
    ok('Suggestion : pastille « Partielle » et bouton « voir la réponse » sur la ligne', sg.envoi === 'Partielle' && sg.voir, JSON.stringify(sg));
    await p.click('#e2e-voir-sugg');
    const f2 = await lireFenetre();
    ok('Depuis la suggestion : même réponse (2 produits, motif)', f2.lignes === 2 && /Manque Rayon/.test(f2.texte) && f2.champs === 0, JSON.stringify(f2));

    /* 6) liste des ruptures : date ET heure, motif dans le detail */
    const rup = q("SELECT CONCAT(IFNULL(d.motif, 'NULL'), '|', r.dtHeure IS NOT NULL) FROM rupture r JOIN rupture_detail d ON d.ruptureId = r.id WHERE r.reference = '" + CMD + "'");
    ok('Rupture enregistrée avec le motif du grossiste et l\'heure', rup === 'Manque Rayon|1', rup);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('rupturepharma', 'Liste des ruptures', ''));
    await p.waitForFunction((ref) => { const g = Ext.ComponentQuery.query('rupturepharma #grilleRuptures')[0]; return g && g.rendered && !g.getStore().isLoading() && g.getStore().findExact('reference', ref) >= 0; }, CMD, { timeout: 30000 });
    await p.waitForTimeout(500);
    const ru = await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('rupturepharma #grilleRuptures')[0]; const rec = g.getStore().getAt(g.getStore().findExact('reference', ref));
      const n = g.getView().getNode(rec); const cell = n.querySelector('.x-grid-cell-colDateRupture .x-grid-cell-inner');
      const exp = g.getPlugin ? null : null; const pl = (g.plugins || []).find((x) => x.ptype === 'rowexpander' || x.toggleRow);
      if (pl) { pl.toggleRow(g.getStore().indexOf(rec), rec); }
      return { date: rec.get('commandeDate'), coupe: cell ? cell.scrollWidth > cell.clientWidth + 1 : true, expander: !!pl }; }, CMD);
    await p.waitForTimeout(400);
    const detail = await p.evaluate(() => { const m = Ext.ComponentQuery.query('rupturepharma #grilleRuptures')[0].getEl().dom.querySelector('.rupt-motif'); return m ? m.textContent : ''; });
    await p.screenshot({ path: SORTIE + '/0810d-ruptures.png' });
    ok('Liste des ruptures : date et heure (jj/mm/aaaa hh:mm), colonne non tronquée', /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(ru.date) && !ru.coupe, JSON.stringify(ru));
    ok('Détail de la rupture : motif « Manque Rayon » affiché', ru.expander && detail === 'Motif : Manque Rayon', detail);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (sauve[0] === 'NULL' ? 'NULL' : "'" + sauve[0] + "'") + ", int_PHARMAML_DISPO = " + sauve[1] + ", str_PHARMAML_VERSION_INFO = '" + sauve[2] + "' WHERE lg_GROSSISTE_ID = '" + G + "'");
    ok('Données d\'essai retirées, grossiste remis', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ")") === '0'
      && q("SELECT COUNT(*) FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID IN (" + liste(CMDS) + ")") === '0'
      && q("SELECT COUNT(*) FROM rupture WHERE reference IN (" + liste(CMDS) + ")") === '0'
      && q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', int_PHARMAML_DISPO, '|', str_PHARMAML_VERSION_INFO) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'") === sauve.join('|'));
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
