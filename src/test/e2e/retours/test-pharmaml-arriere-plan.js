/* ENVOI PHARMAML EN ARRIERE-PLAN (lot B, retours du 10/10 : « blocage » de 21 a 39 s au journal du support).
 * Faux grossiste local qui met 6 s a repondre. Par l'ecran (bouton « Commander par PharmaML » d'une commande) :
 *  - l'ecran n'est pas fige pendant l'envoi : pas de fenetre d'attente modale, bandeau « envoi en cours », on peut
 *    continuer a travailler (requete servie tout de suite) ;
 *  - un second envoi de la meme commande pendant l'envoi ne repart pas (meme jeton, une seule commande au grossiste) ;
 *  - a la fin : le meme message qu'avant (pris en compte / rupture), bandeau retire, lignes de la commande mises a jour ;
 *  - jeton inconnu : message clair ; aucune requete HTTP ne dure plus de quelques secondes.
 * Tout est retire a la fin (commande, ruptures, reglage du grossiste).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const http = require('http');
const archives = require('./archives-pharmaml');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined && d !== '' ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const PORT = 18779, G = '51217123531215794892', CMD = 'E2E-PAP-CMD';
let recus = 0, sauve = null;

const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  recus++;
  setTimeout(() => {
    rep.writeHead(200, { 'Content-Type': 'text/xml' });
    const lignes = [...b.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
    rep.end('<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>E2E</REF_MESSAGE></ENTETE><CORPS>'
      + '<MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS><REP_COMMANDE><NORMALE>'
      + lignes.map((m, i) => '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + (i === 0 ? Number(m[2]) : 0) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/>'
        + (i === 0 ? '' : '<INDISPONIBILITE_N Code_Reponse="0005" Additif="Manque rayon"/>') + '</LIGNE_N>').join('')
      + '</NORMALE></REP_COMMANDE></CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>');
  }, 6000);
}); });

const P = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$' ORDER BY f.str_NAME LIMIT 2").split(/\r?\n/);
function nettoyer() {
  archives.retirer(/E2E-PAP/);
  q(`DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference IN ('${CMD}'));
     DELETE FROM rupture WHERE reference IN ('${CMD}');
     DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '${CMD}'; DELETE FROM t_pharmaml_remplacement WHERE lg_ORDER_ID = '${CMD}';
     DELETE FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID = '${CMD}' OR lg_ORDER_ID = '${CMD}';
     DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${CMD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${CMD}';`);
}

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  sauve = q(`SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', IFNULL(str_PHARMAML_VERSION_CMDE, 'NULL')) FROM t_grossiste WHERE lg_GROSSISTE_ID = '${G}'`).split('|');
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const durees = [];
  p.on('requestfinished', (r) => { if (/api\/v1\/pharma\//.test(r.url())) { const t = r.timing(); durees.push({ url: r.url().replace(/^.*prestige\//, ''), ms: Math.round(t.responseEnd) }); } });
  let jeton = null;
  p.on('response', async (r) => { if (/\/pharma\/E2E-PAP-CMD\/envoi$/.test(r.url())) { try { jeton = (await r.json()).jeton; } catch (e) { /* rien */ } } });
  try {
    nettoyer();
    q(`UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:${PORT}/', str_PHARMAML_VERSION_CMDE = '1.0.0.0' WHERE lg_GROSSISTE_ID = '${G}';
       INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)
         VALUES ('${CMD}', '${CMD}', 2, '${G}', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0);
       INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)
         VALUES ('${CMD}-0', '${CMD}', '${P[0]}', '${G}', 2, 0, 1000, 2000, 'is_Process', NOW(), NOW()), ('${CMD}-1', '${CMD}', '${P[1]}', '${G}', 3, 0, 1000, 2000, 'is_Process', NOW(), NOW());`);
    ok('Précondition : commande d\'essai et faux grossiste (réponse en 6 s)', P.length === 2);
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });

    /* bouton « Commander par PharmaML » (meme fonction que l'ecran de la commande), confirmation « Oui » */
    await p.evaluate((c) => { window.__apres = null; testextjs.view.commandemanagement.order.EnvoiPharmaMl.envoyerCommande({ commandeId: c, reference: c, grossiste: 'TEDIS', lignes: 2 }, function (r) { window.__apres = r; }); }, CMD);
    await p.waitForTimeout(500);
    await p.evaluate(() => { Ext.Msg.msgButtons.yes.btnEl.dom.click(); });
    await p.waitForTimeout(2000);
    const pendant = await p.evaluate(() => ({ modal: Ext.Msg.isVisible() || [...document.querySelectorAll('.x-mask')].some((m) => m.offsetParent !== null),
      bandeau: (document.querySelector('.pml-envoi-en-cours') || {}).textContent || '' }));
    ok('Pendant l\'envoi : aucune fenêtre d\'attente modale, bandeau « envoi en cours »', !pendant.modal && /envoi au grossiste en cours/.test(pendant.bandeau), JSON.stringify(pendant));
    const t0 = Date.now();
    const autre = await p.evaluate(async () => (await fetch('../api/v1/commande/list?start=0&limit=5')).status);
    ok('… et on continue à travailler : une autre demande est servie tout de suite', autre === 200 && Date.now() - t0 < 3000, (Date.now() - t0) + ' ms');
    const second = await p.evaluate(async (c) => (await (await fetch('../api/v1/pharma/' + c + '/envoi', { method: 'POST' })).json()), CMD);
    ok('Second envoi de la même commande pendant l\'envoi : même jeton, rien ne repart', jeton && second.jeton === jeton, JSON.stringify({ premier: jeton, second: second.jeton }));

    await p.waitForFunction(() => window.__apres !== null, null, { timeout: 40000 });
    await p.waitForTimeout(300);
    const fin = await p.evaluate(() => ({ r: window.__apres, boite: Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.textContent : '', bandeau: !!document.querySelector('.pml-envoi-en-cours') }));
    ok('Fin de l\'envoi : même résultat qu\'avant (1/2 pris en compte, 1 en rupture)', fin.r && fin.r.success === true && fin.r.nbreproduit === 1 && fin.r.nbrerupture === 1, JSON.stringify(fin.r).slice(0, 200));
    ok('… message affiché, bandeau retiré', /Réponse du grossiste reçue/.test(fin.boite) && !fin.bandeau, JSON.stringify({ boite: fin.boite, bandeau: fin.bandeau }));
    ok('Une seule commande reçue par le grossiste', recus === 1, recus);
    ok('Commande traitée en base (réponse enregistrée)', q(`SELECT COUNT(*) FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID = '${CMD}' OR lg_ORDER_ID = '${CMD}'`) !== '0');
    const etat = await p.evaluate(async (j) => (await (await fetch('../api/v1/pharma/envoi/' + j)).json()), jeton);
    ok('Le jeton terminé rend toujours le résultat (écran rechargé entre-temps)', etat.termine === true && etat.nbreproduit === 1, JSON.stringify(etat).slice(0, 150));
    const inconnu = await p.evaluate(async () => (await (await fetch('../api/v1/pharma/envoi/xyz')).json()));
    ok('Jeton inconnu : message clair', inconnu.success === false && /plus suivi/.test(inconnu.msg), inconnu.msg);
    await p.evaluate(() => { if (Ext.Msg.isVisible()) { Ext.Msg.hide(); } });
    const longue = durees.filter((d) => d.ms > 5000);
    ok('Aucune requête vers le serveur ne dure plus de 5 s (plus de « blocage » au journal du support)', longue.length === 0, JSON.stringify(longue));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    serveur.close();
    try {
      nettoyer();
      q(`UPDATE t_grossiste SET str_URL_PHARMAML = ${sauve[0] === 'NULL' ? 'NULL' : "'" + sauve[0] + "'"}, str_PHARMAML_VERSION_CMDE = ${sauve[1] === 'NULL' ? 'NULL' : "'" + sauve[1] + "'"} WHERE lg_GROSSISTE_ID = '${G}'`);
    } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Remise en état : commande retirée, grossiste remis', q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${CMD}'`) === '0'
      && q(`SELECT IFNULL(str_URL_PHARMAML, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID = '${G}'`) === sauve[0]);
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
