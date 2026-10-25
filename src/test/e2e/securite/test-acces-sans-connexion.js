/* SECURITE (audit du 12/10) : acces sans connexion.
 *  - C1 : les en-tetes X-User-Info / X-Token-Exp / X-client ne valent plus connexion (parametre KEY_ENTETES_X_USER_INFO,
 *    0 par defaut ; a 1, l'ancien comportement revient) ;
 *  - C2 : les routes de gestion (CA, TVA, factures, credits, inventaires...) ne repondent plus sans connexion ;
 *  - I1 : les anciennes JSP de webservices/ et les servlets exigent une session (401 sinon) ;
 *  - ce qui doit rester public l'est : connexion, nom de l'officine, espace produit, avis publics, rappels SMS/WhatsApp,
 *    lecture de la licence par les applications mobiles (cle masquee, voir test-licence-mobile.js) ;
 *  - connecte, les ecrans qui lisent ces routes recoivent toujours leurs donnees.
 * Rien n'est ecrit en base, sauf le parametre d'essai, remis a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const PARAM_AVANT = q("SELECT COALESCE((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_ENTETES_X_USER_INFO'), '__absent__')");
const API = 'http://localhost:8080/prestige/api/';
const FAUX = { 'X-User-Info': JSON.stringify({ id: ADMIN }), 'X-Token-Exp': '2099-01-01T00:00:00Z', 'X-client': 'x' };
const PERIODE = 'dtStart=2026-09-01&dtEnd=2026-09-30';
const FERMEES = ['v1/ca-comptant?' + PERIODE, 'v1/ca-all?' + PERIODE, 'v1/ca-credit?' + PERIODE, 'v1/reglements?' + PERIODE,
  'v1/factures?' + PERIODE, 'v1/fournisseurs', 'v1/tierspayants', 'v1/valorisation', 'v1/info', 'v1/balance/etat-annuel?' + PERIODE,
  'v1/etat-control-bon/etat-annuel?' + PERIODE, 'v1/recap/creditsmob?' + PERIODE, 'v1/recap/dashboardmob?' + PERIODE,
  'v3/tvamobile?' + PERIODE, 'v1/produit/stats/vente-annuellep', 'v1/licence/save/XYZ', 'v1/modereglement/all', 'v1/motifreglement'];
const JSP = ['webservices/MOBILES/configurationmanager/inventaire/ws_emplacement_inventaire.jsp', 'webservices/sm_user/famille/ws_data_other.jsp',
  'webservices/sm_user/diffclient/ws_customer_last_transction_compte_client_data.jsp', 'webservices/tierspayantmanagement/tierspayant/ws_client_data.jsp',
  'webservices/Report/RuptureStock/ws_data.jsp', 'webservices/usermanagement/ws_login.jsp', 'ListBonsServlet', 'myBean', 'UserCtr'];
const APP = 'http://localhost:8080/prestige/';
const brut = async (url, h) => { const r = await fetch(API + url, { headers: h || {} }); const t = await r.text(); return { s: r.status, t }; };
const ouvert = (r) => r.s === 200 && !/connecter/i.test(r.t) && !/^</.test(r.t);

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  try {
    /* C1 */
    let r = await brut('v1/app-vente/capacites', FAUX);
    ok('C1 : en-têtes forgés (admin) refusés', r.s === 401, r.s + ' ' + r.t.slice(0, 80));
    r = await brut('v1/app-vente/catalogue/changements?depuis=' + encodeURIComponent('2000-01-01 00:00:00') + '&limit=1', FAUX);
    ok('C1 : catalogue (prix d\'achat) refusé avec en-têtes forgés', r.s === 401, r.s);
    /* C2 */
    const encoreOuvertes = [];
    for (const u of FERMEES) { const x = await brut(u); if (ouvert(x)) { encoreOuvertes.push(u + ' (' + x.s + ')'); } }
    ok('C2 : aucune route de gestion lisible sans connexion (' + FERMEES.length + ' routes)', encoreOuvertes.length === 0, encoreOuvertes.join(', '));
    const encoreForgees = [];
    for (const u of FERMEES) { const x = await brut(u, FAUX); if (ouvert(x)) { encoreForgees.push(u); } }
    ok('C1+C2 : aucune route de gestion lisible avec en-têtes forgés', encoreForgees.length === 0, encoreForgees.join(', '));

    /* I1 */
    const jspOuvertes = [];
    for (const u of JSP) { const r = await fetch(APP + u); const t = await r.text(); if (r.status !== 401 || !/connecter/.test(t)) { jspOuvertes.push(u + ' (' + r.status + ')'); } }
    ok('I1 : anciennes JSP et servlets refusées sans connexion (' + JSP.length + ')', jspOuvertes.length === 0, jspOuvertes.join(', '));

    /* ce qui reste public */
    r = await brut('v1/officine');
    ok('Public : nom de l\'officine (page de connexion)', r.s === 200 && /nomComplet/.test(r.t), r.t.slice(0, 80));
    r = await brut('v1/espace-produit/recherche?q=pa');
    ok('Public : espace produit', r.s === 200 && /"data"/.test(r.t), r.t.slice(0, 80));
    r = await brut('v1/espace-produit/dci?q=pa');
    ok('Public : DCI de l\'espace produit', r.s === 200 && /"data"/.test(r.t), r.s);
    r = await brut('v1/avis-public/contexte?t=faux');
    ok('Public : avis (jeton faux → 403 du service, pas 401 du filtre)', r.s === 403, r.s);
    const p0 = await (await b.newContext()).newPage();
    await p0.goto('http://localhost:8080/prestige/security/index.jsp', { waitUntil: 'networkidle' });
    const nom = await p0.evaluate(() => (document.querySelector('.pl-officine, #officineName, [data-officine]') || {}).textContent || document.body.innerText);
    ok('Page de connexion : nom de la pharmacie affiché', nom.indexOf(q("SELECT str_NOM_COMPLET FROM t_officine LIMIT 1").split(' ')[0]) >= 0, nom.slice(0, 120));

    /* connecte : les ecrans recoivent toujours leurs donnees */
    const p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 }); await p.waitForLoadState('networkidle'); await p.waitForTimeout(2000);
    const connecte = await p.evaluate(async ([urls]) => {
      const out = {};
      for (const u of urls) { const r = await fetch('../api/' + u); out[u] = { s: r.status, t: (await r.text()).slice(0, 60) }; }
      return out;
    }, [['v1/balance/etat-annuel?dtStart=2026-01-01&dtEnd=2026-10-30', 'v1/etat-control-bon/etat-annuel?dtStart=2026-01-01&dtEnd=2026-10-30',
      'v1/modereglement/all', 'v1/motifreglement', 'v1/app-vente/capacites', 'v1/ca-all?' + PERIODE]]);
    const jspConnecte = await p.evaluate(async () => {
      const r = await fetch('../webservices/sm_user/famille/ws_data_other.jsp?search_value=pa&start=0&limit=5');
      return { s: r.status, t: (await r.text()).slice(0, 80) };
    });
    ok('Connecté : une ancienne JSP répond toujours', jspConnecte.s === 200 && !/connecter/.test(jspConnecte.t), JSON.stringify(jspConnecte));
    const ko = Object.keys(connecte).filter((u) => connecte[u].s !== 200 || /connecter/i.test(connecte[u].t));
    ok('Connecté : routes des écrans toujours servies', ko.length === 0, JSON.stringify(ko.map((u) => [u, connecte[u]])));

    /* parametre : retour possible a l'ancien comportement */
    q("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('KEY_ENTETES_X_USER_INFO', '1', 'essai', 'SYSTEM', 'enable', NOW())"
      + " ON DUPLICATE KEY UPDATE str_VALUE = '1'");
    await new Promise((x) => setTimeout(x, 61000));
    r = await brut('v1/app-vente/capacites', FAUX);
    ok('Paramètre à 1 : ancien comportement rétabli (compatibilité)', r.s === 200, r.s);
  } catch (e) {
    ok('Exception', false, e.stack);
  } finally {
    if (PARAM_AVANT === '__absent__') { q("DELETE FROM t_parameters WHERE str_KEY = 'KEY_ENTETES_X_USER_INFO'"); }
    else { q("UPDATE t_parameters SET str_VALUE = '" + PARAM_AVANT + "' WHERE str_KEY = 'KEY_ENTETES_X_USER_INFO'"); }
    /* le parametre est garde une minute en memoire : on attend son expiration pour ne pas laisser les en-tetes ouverts */
    await new Promise((x) => setTimeout(x, 61000));
    const apres = await brut('v1/app-vente/capacites', FAUX);
    ok('Paramètre remis : en-têtes de nouveau refusés', apres.s === 401, apres.s);
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
