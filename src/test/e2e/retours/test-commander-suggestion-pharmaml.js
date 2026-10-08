/* COMMANDER UNE SUGGESTION PAR PHARMAML DEPUIS LA LISTE (plan d'octobre, lot L5 : section 1.5, decision Q-C).
 *
 * Faux grossiste (serveur HTTP local) : produit 1 livre, produit 2 en rupture.
 *
 * Ce que le test etablit :
 *  - action de ligne « Commander par PharmaML » : confirmation (grossiste, lignes, protocole), envoi en 1.0.0.0 (defaut)
 *    (COMMANDE avec les lignes de la suggestion) ; la suggestion est CONSERVEE (memes lignes), statut « commandee »,
 *    mode PHARMAML, commande liee ; liste « COMMANDÉE · PHARMAML », actions masquees ;
 *  - envoi en echec (grossiste injoignable) : message clair, suggestion inchangee, commande creee et liee ; nouvel
 *    essai apres correction : la MEME commande est renvoyee (aucun doublon), puis « commandee » ;
 *  - grossiste sans lien PharmaML : refus avant toute creation ;
 *  - le bouton « Commander » historique fonctionne comme avant (commande creee, suggestion supprimee) ;
 *  - retours du 08/10 : reponse DIFFEREE (FIN_SERVICE) -> la suggestion n'est PAS « commandee » a l'envoi ; elle le
 *    devient a la reception de la reponse (vidage) ;
 *  - aucune erreur JavaScript ; tout est retire a la fin, grossistes remis.
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
const PORT = 18767;
const S = { A: 'E2E-SPM-A', B: 'E2E-SPM-B', C: 'E2E-SPM-C', D: 'E2E-SPM-D', E: 'E2E-SPM-E' };
const depot = [];
let nMsg = 0;
const envDiffere = (nature, enRep, corps) => '<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Nature_Action="' + nature
  + '" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>S' + (++nMsg) + '</REF_MESSAGE>' + (enRep ? '<EN_REPONSE_A>' + enRep + '</EN_REPONSE_A>' : '') + '</ENTETE><CORPS>' + corps + '</CORPS></CSRP_ENVELOPPE>';
let G, G2, sauve, sauve2, P, debut;
const recus = [];

const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  recus.push(b);
  if (/differe/.test(req.url)) {
    /* comme DPCI : commande -> FIN_SERVICE ; VIDAGE -> la reponse ; ACQUITTEMENT -> retrait du depot */
    const tag = (t) => (b.match(new RegExp('<' + t + '>([^<]*)</' + t + '>')) || [])[1];
    const action = tag('ACTION') || (/<COMMANDE /.test(b) ? 'COMMANDE' : '');
    rep.writeHead(200, { 'Content-Type': 'text/xml' });
    if (action === 'COMMANDE') {
      depot.push({ enRep: tag('REF_MESSAGE'), lignes: [...b.matchAll(/<LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)] });
      rep.end(envDiffere('REP_EMISSION', tag('REF_MESSAGE'), '<ACTION>FIN_SERVICE</ACTION>')); return;
    }
    if (action === 'ACQUITTEMENT') { depot.shift(); }
    if (!depot.length) { rep.end(envDiffere('REP_RECEPTION', tag('REF_MESSAGE'), '<ACTION>FIN_SERVICE</ACTION>')); return; }
    rep.end(envDiffere('REP_RECEPTION', depot[0].enRep, '<MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS><REP_COMMANDE><NORMALE>'
      + depot[0].lignes.map((m) => '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + Number(m[2]) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/></LIGNE_N>').join('')
      + '</NORMALE></REP_COMMANDE></CORPS></MESSAGE_REPARTITEUR>'));
    return;
  }
  const v3 = /<SRP_ENVELOPPE/.test(b), ns = v3 ? 'urn:x-srp:fr.srp.protocole' : 'urn:x-csrp:fr.csrp.protocole', env = v3 ? 'SRP_ENVELOPPE' : 'CSRP_ENVELOPPE';
  const lignes = [...b.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  rep.end('<' + env + ' xmlns="' + ns + ':enveloppe"><CORPS><MESSAGE_REPARTITEUR xmlns="' + ns + ':message"><CORPS><REP_COMMANDE><NORMALE>'
    + lignes.map((m, i) => '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + (i === 0 ? Number(m[2]) : 0) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/>'
      + (i === 0 ? '' : '<INDISPONIBILITE_N Code_Reponse="2" Additif="PAS EN STOCK"/>') + '</LIGNE_N>').join('')
    + '</NORMALE></REP_COMMANDE></CORPS></MESSAGE_REPARTITEUR></CORPS></' + env + '>');
}); });

const url = (g, u) => exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (u === null ? 'NULL' : "'" + u + "'") + " WHERE lg_GROSSISTE_ID = '" + g + "'");
function commandesCreees() {
  return q("SELECT IFNULL(GROUP_CONCAT(lg_ORDER_ID), '') FROM t_order WHERE dt_CREATED >= '" + debut + "' AND lg_GROSSISTE_ID IN ('" + G + "','" + G2 + "')").split(',').filter(Boolean);
}
function nettoyer() {
  const cmds = debut ? commandesCreees() : [];
  if (cmds.length) {
    const l = cmds.map((c) => "'" + c + "'").join(',');
    exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference IN (SELECT str_REF_ORDER FROM t_order WHERE lg_ORDER_ID IN (" + l + ")));"
      + "DELETE FROM rupture WHERE reference IN (SELECT str_REF_ORDER FROM t_order WHERE lg_ORDER_ID IN (" + l + "));"
      + "DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID IN (" + l + ");"
      + "DELETE FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID IN (" + l + ") OR lg_ORDER_ID IN (" + l + ");"
      + "DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (" + l + "); DELETE FROM t_order WHERE lg_ORDER_ID IN (" + l + ");");
  }
  const ids = Object.values(S).map((x) => "'" + x + "'").join(',');
  exec("DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID IN (" + ids + "); DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID IN (" + ids + ");");
  if (sauve) { url(G, sauve === 'NULL' ? null : sauve); }
  if (sauve2) { url(G2, sauve2 === 'NULL' ? null : sauve2); }
}
function poser() {
  debut = q("SELECT DATE_FORMAT(NOW() - INTERVAL 2 SECOND, '%Y-%m-%d %H:%i:%s')");
  [G, G2] = q("SELECT GROUP_CONCAT(lg_GROSSISTE_ID ORDER BY str_LIBELLE SEPARATOR '|') FROM (SELECT lg_GROSSISTE_ID, str_LIBELLE FROM t_grossiste WHERE str_STATUT='enable' ORDER BY str_LIBELLE LIMIT 2) x").split('|');
  sauve = q("SELECT IFNULL(str_URL_PHARMAML, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'");
  sauve2 = q("SELECT IFNULL(str_URL_PHARMAML, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G2 + "'");
  url(G, 'http://127.0.0.1:' + PORT + '/'); url(G2, null);
  P = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, str_NAME FROM t_famille WHERE str_STATUT='enable' AND int_CIP REGEXP '^[0-9]{7}$' ORDER BY str_NAME LIMIT 2) x").split('|');
  Object.entries(S).forEach(([k, id]) => {
    exec("INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + id + "', '" + id + "-REF', '" + (k === 'C' ? G2 : G) + "', 'is_Process', NOW(), NOW())");
    P.forEach((f, i) => exec("INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg)"
      + " VALUES ('" + id + "-L" + i + "', '" + id + "', '" + (k === 'C' ? G2 : G) + "', '" + f + "', " + (i + 2) + ", 200, 1500, 1000, NOW(), NOW(), 'is_Process', 0)"));
  });
}
const etatSugg = (id) => q("SELECT CONCAT(str_STATUT, '|', IFNULL(str_MODE_COMMANDE, ''), '|', lg_ORDER_ID IS NOT NULL, '|', (SELECT COUNT(*) FROM t_suggestion_order_details d WHERE d.lg_SUGGESTION_ORDER_ID = s.lg_SUGGESTION_ORDER_ID)) FROM t_suggestion_order s WHERE lg_SUGGESTION_ORDER_ID = '" + id + "'");

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  try { nettoyer(); } catch (e) { /* rien */ }
  sauve = null; sauve2 = null;
  poser();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const liste = async (ref) => {
    await p.evaluate((ref) => { Ext.getCmp('rechecher').setValue(ref); Ext.ComponentQuery.query('i_sugg_manager')[0].onRechClick(); }, ref);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('i_sugg_manager')[0].getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(500);
    return p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; const i = g.getStore().findExact('str_REF', ref); if (i < 0) { return null; }
      const n = g.getView().getNode(i); const col = g.query('gridcolumn[dataIndex=str_STATUT]')[0];
      const ic = n.querySelector('.x-grid-cell-commanderPharmaMl .x-action-col-icon'); if (ic) { ic.setAttribute('data-e2e', 'cmd-' + ref); }
      return { statut: n.querySelector('.x-grid-cell-' + col.getId()).textContent.trim(), icone: !!ic && !ic.classList.contains('x-hide-display') }; }, ref);
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);

    /* A : parcours ecran */
    const l0 = await liste(S.A + '-REF');
    ok('Action « Commander par PharmaML » visible', l0 && l0.icone, JSON.stringify(l0));
    await p.click('[data-e2e="cmd-' + S.A + '-REF"]');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Envoyer la suggestion/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 20000 });
    const conf = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    ok('Confirmation : référence, grossiste, 2 lignes, protocole 1.0.0.0 (défaut), « Commandée » à la réception de la réponse', /E2E-SPM-A-REF/.test(conf) && /2 ligne\(s\), valeur 5 000/.test(conf) && /1\.0\.0\.0/.test(conf) && /passera au statut « Commandée » à la réception de la réponse du grossiste/.test(conf), conf);
    await p.screenshot({ path: CAPT + '/commander-pharmaml-confirmation.png' });
    await p.click('#' + await p.evaluate(() => Ext.MessageBox.msgButtons.yes.getId()));
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /commandée|abouti/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 60000 });
    const fin = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    await p.evaluate(() => Ext.MessageBox.hide());
    ok('Envoi : COMMANDE 1.0.0.0 (défaut) avec les 2 lignes de la suggestion', recus.length === 1 && /<CSRP_ENVELOPPE[^>]*1\.0\.0\.0/.test(recus[0]) && (recus[0].match(/<LIGNE_N /g) || []).length === 2, recus.length);
    ok('Résultat affiché : réponse reçue, commandée, 1 pris en compte, 1 en rupture', /Réponse du grossiste reçue/.test(fin) && /commandée/.test(fin) && /1 produit\(s\) pris en compte, 1 en rupture sur 2/.test(fin), fin);
    ok('Suggestion conservée (2 lignes), statut commandee, mode PHARMAML, commande liée', etatSugg(S.A) === 'commandee|PHARMAML|1|2', etatSugg(S.A));
    const lA = await liste(S.A + '-REF');
    ok('Liste : « COMMANDÉE · PHARMAML », action masquée', lA && lA.statut === 'COMMANDÉE · PHARMAML' && !lA.icone, JSON.stringify(lA));
    await p.screenshot({ path: CAPT + '/commander-pharmaml-liste.png' });
    const reessai = await p.evaluate(async (id) => (await fetch('../api/v1/suggestion-pharmaml/' + id, { method: 'POST' })).json(), S.A);
    ok('Déjà commandée : refus', reessai.success === false && /déjà commandée/.test(reessai.msg), JSON.stringify(reessai));

    /* B : echec puis reprise sans doublon */
    url(G, 'http://127.0.0.1:' + (PORT + 50) + '/');
    const avant = commandesCreees().length;
    const e1 = await p.evaluate(async (id) => (await fetch('../api/v1/suggestion-pharmaml/' + id, { method: 'POST' })).json(), S.B);
    const apres1 = commandesCreees().length;
    ok('Grossiste injoignable : échec expliqué, suggestion inchangée, commande créée et liée', e1.success === false && e1.commandeCreee && /commandes en cours/.test(e1.msg)
      && etatSugg(S.B) === 'is_Process||1|2' && apres1 === avant + 1, JSON.stringify(e1) + ' / ' + etatSugg(S.B));
    url(G, 'http://127.0.0.1:' + PORT + '/');
    const ap = await p.evaluate(async (id) => (await fetch('../api/v1/suggestion-pharmaml/' + id)).json(), S.B);
    const e2 = await p.evaluate(async (id) => (await fetch('../api/v1/suggestion-pharmaml/' + id, { method: 'POST' })).json(), S.B);
    ok('Nouvel essai : même commande renvoyée (aucun doublon), suggestion commandée', ap.commandeRef && e2.success && e2.reprise === true && commandesCreees().length === apres1
      && etatSugg(S.B) === 'commandee|PHARMAML|1|2', JSON.stringify({ ref: ap.commandeRef, reprise: e2.reprise, n: commandesCreees().length }));

    /* C : grossiste sans lien PharmaML */
    const n0 = commandesCreees().length;
    const e3 = await p.evaluate(async (id) => (await fetch('../api/v1/suggestion-pharmaml/' + id, { method: 'POST' })).json(), S.C);
    ok('Grossiste sans lien PharmaML : refus, aucune commande créée', e3.success === false && /lien PharmaML/.test(e3.msg) && commandesCreees().length === n0 && etatSugg(S.C) === 'is_Process||0|2', JSON.stringify(e3));

    /* E : reponse differee (retours du 08/10) */
    url(G, 'http://127.0.0.1:' + PORT + '/differe/');
    const e5 = await p.evaluate(async (id) => (await fetch('../api/v1/suggestion-pharmaml/' + id, { method: 'POST' })).json(), S.E);
    ok('Réponse différée (FIN_SERVICE) : envoi accepté, suggestion PAS commandée (commande liée, en attente)', e5.success === true && e5.enAttente === true
      && etatSugg(S.E) === 'is_Process||1|2', JSON.stringify(e5) + ' / ' + etatSugg(S.E));
    /* ecran : pastille « En attente », renvoi masque, bouton de recuperation sur la ligne */
    const ligneE = async () => { await liste(S.E + '-REF'); return p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; const i = g.getStore().findExact('str_REF', ref);
      const n = g.getView().getNode(i); const b = n.querySelector('.envoi-pml'); const col = g.query('gridcolumn[dataIndex=str_STATUT]')[0];
      const rec = n.querySelector('img.envoi-pml-recuperer'); if (rec) { rec.id = 'e2e-recuperer-sugg'; }
      const env = n.querySelector('.x-grid-cell-commanderPharmaMl .act-envoyer');
      const dh = g.down('#colDateHeure'); const h = dh.getEl().dom.querySelector('.x-column-header-text');
      return { badge: b ? b.getAttribute('data-envoi') : '', texte: b ? b.textContent : '', recuperer: !!rec, renvoi: !!(env && !env.classList.contains('x-hide-display')),
        statut: n.querySelector('.x-grid-cell-' + col.getId()).textContent.trim(), date: n.querySelector('.x-grid-cell-' + dh.getItemId()).textContent.trim(),
        enteteTronque: h ? h.scrollWidth > h.clientWidth + 1 : true }; }, S.E + '-REF'); };
    const avantE = await ligneE();
    ok('Liste des suggestions : pastille « En attente », bouton « récupérer la réponse » sur la ligne, renvoi masqué ; date et heure dans une colonne',
      avantE.badge === 'EN_ATTENTE' && avantE.texte === 'En attente' && avantE.recuperer && !avantE.renvoi && /^\d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2}/.test(avantE.date), JSON.stringify(avantE));
    await p.screenshot({ path: CAPT + '/suggestion-en-attente.png' });
    await p.click('#e2e-recuperer-sugg');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Envois encore en attente/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 60000 });
    const vid = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    await p.evaluate(() => Ext.MessageBox.hide());
    ok('Récupération depuis la ligne : réponse appliquée, la suggestion passe « commandee » (mode PHARMAML)', etatSugg(S.E) === 'commandee|PHARMAML|1|2' && /1 réponse\(s\) traitée\(s\)/.test(vid), vid + ' / ' + etatSugg(S.E));
    const apresE = await ligneE();
    ok('Liste après réponse : « COMMANDÉE · PHARMAML », pastille « Répondue », plus de bouton de récupération', apresE.statut === 'COMMANDÉE · PHARMAML' && apresE.badge === 'REPONDUE' && !apresE.recuperer, JSON.stringify(apresE));
    url(G, 'http://127.0.0.1:' + PORT + '/');

    /* D : bouton historique inchange */
    const n1 = commandesCreees().length;
    await liste(S.D + '-REF');
    await p.evaluate((ref) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; g.onMakeOrderClick(g, g.getStore().findExact('str_REF', ref)); }, S.D + '-REF');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Opération terminée/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 30000 });
    await p.evaluate(() => Ext.MessageBox.hide());
    ok('« Commander » historique : commande créée, suggestion supprimée (comme avant)', commandesCreees().length === n1 + 1 && q("SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID='" + S.D + "'") === '0');
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    ok('Jeu d\'essai retiré, grossistes remis', commandesCreees().length === 0 && q("SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID LIKE 'E2E-SPM-%'") === '0'
      && q("SELECT IFNULL(str_URL_PHARMAML, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'") === sauve);
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
