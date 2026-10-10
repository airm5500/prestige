/* PASSATION PHARMAML DEPUIS LES ECRANS DE TRAITEMENT ET CODES D'ERREUR (retours du 08/10 (8)). Faux grossiste local :
 *  - ecran de traitement d'une SUGGESTION : bouton « Commander par PharmaML » (meme envoi que la liste) : confirmation,
 *    envoi, la suggestion passe « commandee », retour a la liste ;
 *  - ecran de traitement d'une COMMANDE : bouton « Commander par PharmaML » : confirmation (reference, grossiste,
 *    lignes), resultat (pris en compte / rupture), bouton desactive ensuite avec la raison ; un second envoi est refuse
 *    par le serveur (commande deja repondue : pas de double commande) ;
 *  - retours du 10/10 : bouton au BAS de la suggestion et de la commande ouvertes ; grossiste sans lien PharmaML :
 *    bouton absent (comme avant) ;
 *  - refus du grossiste avec code d'erreur (tableau 8) : libelle et conseil affiches (0101 -> code client) ;
 *  - mise en page : boutons entiers et dans l'ecran ; aucune erreur JavaScript ; tout est retire a la fin.
 */
const { execFileSync } = require('child_process');
const http = require('http');
const archives = require('./archives-pharmaml');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const PORT = 18777, G = '51217123531215794892';
const SUGG = 'E2E-PEC-SUGG', O1 = 'E2E-PEC-CMD', O2 = 'E2E-PEC-SANS', O3 = 'E2E-PEC-REFUS', CMDS = [O1, O2, O3];
let P = [], sauve = null, debut = null;

const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  const env = (corps) => '<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>E2E</REF_MESSAGE></ENTETE><CORPS>'
    + '<MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS>' + corps + '</CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>';
  if (/refus101/.test(req.url)) { rep.end(env('<ERREUR Statut="0101" Detail="Client 0999908 inconnu"/>')); return; }
  const lignes = [...b.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
  rep.end(env('<REP_COMMANDE><NORMALE>' + lignes.map((m, i) => '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + (i === 0 ? Number(m[2]) : 0) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/>'
    + (i === 0 ? '' : '<INDISPONIBILITE_N Code_Reponse="0005" Additif="Manque rayon"/>') + '</LIGNE_N>').join('') + '</NORMALE></REP_COMMANDE>'));
}); });

const liste = (a) => a.map((x) => "'" + x + "'").join(',');
function commandesSuggestion() {
  return debut ? q("SELECT IFNULL(GROUP_CONCAT(lg_ORDER_ID), '') FROM t_order WHERE dt_CREATED >= '" + debut + "' AND lg_GROSSISTE_ID = '" + G + "' AND lg_ORDER_ID NOT IN (" + liste(CMDS) + ")").split(',').filter(Boolean) : [];
}
function nettoyer() {
  archives.retirer(/E2E-PEC/);
  const toutes = [...CMDS, ...commandesSuggestion()];
  const l = liste(toutes);
  exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference IN (SELECT str_REF_ORDER FROM t_order WHERE lg_ORDER_ID IN (" + l + ")) OR reference IN (" + liste(CMDS) + "));"
    + "DELETE FROM rupture WHERE reference IN (SELECT str_REF_ORDER FROM t_order WHERE lg_ORDER_ID IN (" + l + ")) OR reference IN (" + liste(CMDS) + ");"
    + "DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID IN (" + l + "); DELETE FROM t_pharmaml_remplacement WHERE lg_ORDER_ID IN (" + l + ");"
    + "DELETE FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID IN (" + l + ") OR lg_ORDER_ID IN (" + l + ");"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (" + l + "); DELETE FROM t_order WHERE lg_ORDER_ID IN (" + l + ");"
    + "DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "';");
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
  P = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, str_NAME FROM t_famille WHERE str_STATUT='enable'"
    + " AND int_CIP REGEXP '^[0-9]{7}$' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = t_famille.int_CIP) = 1 ORDER BY str_NAME LIMIT 2) x").split('|');
  nettoyer();
  debut = q('SELECT NOW()');
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const oui = async () => { await p.waitForFunction(() => Ext.MessageBox.isVisible() && Ext.MessageBox.msgButtons.yes.isVisible(), null, { timeout: 20000 });
    const t = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent); await p.click('#' + await p.evaluate(() => Ext.MessageBox.msgButtons.yes.getId())); return t; };
  const resultat = async (re) => { await p.waitForFunction((r) => Ext.MessageBox.isVisible() && new RegExp(r).test(Ext.MessageBox.msg.getEl().dom.textContent), re, { timeout: 60000 });
    const t = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent); await p.evaluate(() => { Ext.MessageBox.hide(); }); return t; };
  const boutonDans = (id) => p.evaluate((i) => { const c = Ext.getCmp(i); if (!c || !c.isVisible()) { return { visible: false }; } const r = c.getEl().dom.getBoundingClientRect(), t = (c.up('fieldcontainer') || c.up('toolbar')).getEl().dom.getBoundingClientRect();
    const txt = c.getEl().dom.querySelector('.x-btn-inner'); return { visible: true, actif: !c.isDisabled(), dedans: r.left >= t.left - 1 && r.right <= t.right + 1 && r.right <= window.innerWidth,
      entier: txt ? txt.scrollWidth <= txt.clientWidth + 1 : false, texte: c.getText(), info: c.tooltip,
      fond: getComputedStyle(c.getEl().dom).backgroundColor, enBas: !!(c.up('toolbar') && c.up('toolbar').dock === 'bottom') }; }, id);
  const ouvrirCommande = async (ref) => {
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0 && Ext.ComponentQuery.query('i_order_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    await p.evaluate((r) => { Ext.getCmp('rechecher').setValue(r); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); }, ref);
    await p.waitForFunction((r) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', r) >= 0; }, ref, { timeout: 30000 });
    await p.evaluate((r) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF_ORDER', r)); }, ref);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    url('http://127.0.0.1:' + PORT + '/ok/');

    /* 1) ecran de traitement de la suggestion */
    exec("INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + SUGG + "', '" + SUGG + "-REF', '" + G + "', 'is_Process', NOW(), NOW())");
    P.forEach((f, i) => exec("INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg)"
      + " VALUES ('" + SUGG + "-L" + i + "', '" + SUGG + "', '" + G + "', '" + f + "', " + (i + 2) + ", 200, 1500, 1000, NOW(), NOW(), 'is_Process', 0)"));
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0 && Ext.ComponentQuery.query('i_sugg_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    await p.evaluate((r) => { Ext.getCmp('rechecher').setValue(r); Ext.ComponentQuery.query('i_sugg_manager')[0].onRechClick(); }, SUGG + '-REF');
    await p.waitForFunction((r) => { const st = Ext.ComponentQuery.query('i_sugg_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF', r) >= 0; }, SUGG + '-REF', { timeout: 30000 });
    await p.evaluate((r) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF', r)); }, SUGG + '-REF');
    await p.waitForFunction(() => Ext.getCmp('btn_sugg_commander_pml') && Ext.getCmp('btn_sugg_commander_pml').isVisible() && Ext.getCmp('gridpanelSuggestionID') && !Ext.getCmp('gridpanelSuggestionID').getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const bs = await boutonDans('btn_sugg_commander_pml');
    await p.screenshot({ path: SORTIE + '/passation-suggestion.png' });
    ok('Traitement de la suggestion : bouton « Commander par PharmaML » visible, actif, entier, dans l\'écran, dans la barre du BAS', bs.visible && bs.actif && bs.dedans && bs.entier && bs.enBas && bs.texte === 'Commander par PharmaML', JSON.stringify(bs));
    /* la barre du bas de la suggestion n'est pas poussee hors de l'ecran */
    const barre = await p.evaluate(() => { const c = Ext.getCmp('btn_clean_sugg'); const r = c.getEl().dom.getBoundingClientRect(); return { droite: r.right, largeur: window.innerWidth }; });
    ok('Suggestion : la barre du bas tient dans l\'écran (« Nettoyer la suggestion » visible)', barre.droite <= barre.largeur, JSON.stringify(barre));
    await p.click('#btn_sugg_commander_pml');
    const confS = await oui();
    ok('Confirmation : référence, grossiste, 2 lignes, « Commandée » à la réception de la réponse', new RegExp(SUGG + '-REF').test(confS) && /2 ligne\(s\)/.test(confS) && /« Commandée » à la réception/.test(confS), confS);
    const finS = await resultat('commandée|attente|impossible|refusé');
    ok('Envoi depuis l\'écran : réponse reçue, suggestion commandée (1 pris en compte, 1 en rupture)', /la suggestion est commandée/.test(finS) && /1 produit\(s\) pris en compte, 1 en rupture sur 2/.test(finS), finS);
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0 && Ext.ComponentQuery.query('i_sugg_manager')[0].isVisible(), null, { timeout: 20000 });
    ok('Retour à la liste des suggestions ; statut commandee, mode PHARMAML', q("SELECT CONCAT(str_STATUT, '|', IFNULL(str_MODE_COMMANDE, '')) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "'") === 'commandee|PHARMAML');

    /* 2) ecran de traitement de la commande */
    poser(O1);
    await ouvrirCommande(O1);
    const bc = await boutonDans('btn_cmd_envoyer_pml');
    await p.screenshot({ path: SORTIE + '/passation-commande.png' });
    ok('Traitement de la commande : bouton « Commander par PharmaML » visible, actif, entier, dans l\'écran, mis en avant (vert)', bc.visible && bc.actif && bc.dedans && bc.entier && bc.enBas && bc.fond === 'rgb(23, 121, 95)', JSON.stringify(bc));
    await p.click('#btn_cmd_envoyer_pml');
    const confC = await oui();
    ok('Confirmation : référence, grossiste, 2 ligne(s), ruptures vers la liste des ruptures', new RegExp(O1).test(confC) && /TEDIS/.test(confC) && /2 ligne\(s\)/.test(confC) && /liste des ruptures/.test(confC), confC);
    const finC = await resultat('Réponse du grossiste reçue|impossible');
    ok('Résultat : 1/2 pris en compte, 1 en rupture', /1\/2 produit\(s\) pris en compte, 1 en rupture/.test(finC), finC);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return !g.getStore().isLoading() && g.getStore().getCount() === 1; }, null, { timeout: 20000 });
    const apres = await boutonDans('btn_cmd_envoyer_pml');
    ok('Après réponse : lignes à jour (1), bouton désactivé, raison lisible dans son libellé (« Déjà envoyée (répondue) »)', apres.visible && !apres.actif && apres.texte === 'Déjà envoyée (répondue)' && apres.entier && apres.dedans, JSON.stringify(apres));
    const second = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/pharma/' + id, { method: 'PUT' })).text()), O1);
    ok('Second envoi refusé par le serveur (commande déjà répondue), aucun nouvel envoi noté', second.success === false && second.dejaRepondue === true && /seconde fois/.test(second.msg)
      && q("SELECT COUNT(*) FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + O1 + "'") === '1', JSON.stringify(second));

    /* 3) grossiste sans lien PharmaML : pas de bouton */
    url(null); poser(O2);
    await ouvrirCommande(O2);
    const sans = await boutonDans('btn_cmd_envoyer_pml');
    ok('Grossiste sans lien PharmaML : bouton absent', !sans.visible, JSON.stringify(sans));

    /* 4) refus avec code d'erreur (tableau 8) */
    url('http://127.0.0.1:' + PORT + '/refus101/'); poser(O3);
    await ouvrirCommande(O3);
    await p.click('#btn_cmd_envoyer_pml');
    await oui();
    const refus = await resultat('refusé|impossible');
    ok('Refus du grossiste : code 0101 avec son libellé et le conseil (code client)', /statut 0101 \(officine inconnue du grossiste\)/.test(refus) && /code client de l'officine/.test(refus), refus);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (sauve[0] === 'NULL' ? 'NULL' : "'" + sauve[0] + "'") + ", str_PHARMAML_VERSION_CMDE = '" + sauve[1] + "' WHERE lg_GROSSISTE_ID = '" + G + "'");
    ok('Données d\'essai retirées, grossiste remis', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID IN (" + liste(CMDS) + ")") === '0' && commandesSuggestion().length === 0
      && q("SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + SUGG + "'") === '0'
      && q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', str_PHARMAML_VERSION_CMDE) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'") === sauve.join('|'));
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
