/* CONNEXION juste apres un deploiement (retour du 05/11).
 *
 * Constat : « quand je saisis mes identifiants, la page reste figee avant de commencer a tourner, et s'affiche un peu
 * longtemps apres ». Mesure sur domain2 juste apres un redeploiement : identifiants acceptes en 0,8 s, puis page
 * blanche jusqu'a 13,4 s. La page d'accueil attend GET api/v1/ecrans/scripts.js (11,5 s) : le paquet des scripts
 * d'ecran (1 095 fichiers) etait fabrique a la PREMIERE demande, donc par le premier utilisateur apres chaque
 * deploiement. A chaud, la meme page est prete en 1,7 s.
 *
 * A lancer PENDANT un deploiement (ou juste avant qu'il se termine) : le test attend que l'application reponde,
 * ouvre l'ecran de connexion et se connecte aussitot, comme l'utilisateur qui attend devant cet ecran.
 *  - le paquet des scripts arrive en moins de 3 s ;
 *  - la page d'accueil est construite (DOMContentLoaded) en moins de 5 s apres le clic ;
 *  - le menu est rempli ;
 *  - aucune erreur JavaScript.
 * Lecture seule. Variables : BASE, E2E_LOGIN, ATTENTE_DEPLOIEMENT_MS (600000 par defaut).
 */
const http = require('http');
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { BASE } = require('../outils/vues');

const BUDGET_SCRIPTS_MS = 3000;
const BUDGET_PAGE_MS = 5000;
const ATTENTE_MS = Number(process.env.ATTENTE_DEPLOIEMENT_MS || 600000);
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const statut = (url) => new Promise((r) => {
  const q = http.get(url, (s) => { s.resume(); r(s.statusCode); });
  q.on('error', () => r(0)); q.setTimeout(5000, () => { q.destroy(); r(0); });
});

(async () => {
  console.log('Serveur : ' + BASE);
  const fin = Date.now() + ATTENTE_MS;
  while (await statut(BASE + '/security/index.html') !== 200) {
    if (Date.now() > fin) { ok('L application repond', false, 'pas de reponse apres ' + ATTENTE_MS + ' ms'); process.exit(1); }
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log(new Date().toISOString().slice(11, 19) + ' application disponible');
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  try {
    await p.goto(BASE + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest');
    const scripts = p.waitForResponse((r) => /ecrans\/scripts\.js/.test(r.url()), { timeout: 300000 }).catch(() => null);
    const t0 = Date.now();
    await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 300000, waitUntil: 'commit' });
    const tAccueil = Date.now() - t0;
    const rep = await scripts;
    if (!rep) { throw new Error('paquet des scripts jamais recu'); }
    const tim = rep.request().timing();
    const dureeScripts = Math.round(tim.responseEnd > 0 ? tim.responseEnd - tim.requestStart : -1);
    await p.waitForLoadState('domcontentloaded');
    const tPage = Date.now() - t0;
    await p.waitForFunction(() => { const n = window.Ext && Ext.ComponentQuery.query('navigation')[0];
      return n && n.getStore().getRootNode().childNodes.length > 0 && !n.getStore().isLoading(); }, null, { timeout: 300000, polling: 50 });
    const tMenu = Date.now() - t0;
    console.log(JSON.stringify({ accueilDemande: tAccueil, scripts: dureeScripts, page: tPage, menu: tMenu }));
    ok('Paquet des scripts d ecran recu dans son budget', rep.status() < 400 && dureeScripts >= 0 && dureeScripts <= BUDGET_SCRIPTS_MS,
      dureeScripts + ' ms, budget ' + BUDGET_SCRIPTS_MS + ' ms, statut ' + rep.status());
    ok('Page d accueil construite peu apres le clic', tPage <= BUDGET_PAGE_MS, tPage + ' ms apres le clic, budget ' + BUDGET_PAGE_MS + ' ms');
    ok('Menu rempli', tMenu > 0, tMenu + ' ms apres le clic');
    ok('Aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs.slice(0, 3)));
  } catch (e) {
    ok('Le test va jusqu au bout', false, String(e && e.message).slice(0, 300));
    await ENV_E2E.capture(p, 'echec');
  } finally {
    await b.close();
  }
  const echecs = res.filter((x) => !x.c).length;
  console.log((res.length - echecs) + '/' + res.length + ' controles respectes');
  process.exit(echecs ? 1 : 0);
})();
