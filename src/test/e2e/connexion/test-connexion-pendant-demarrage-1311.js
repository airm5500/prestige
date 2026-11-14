/* CONNEXION PENDANT LE DEMARRAGE DU SERVEUR (rapport d'exploitation du 13/11, point 4) — test d'ergonomie.
 *
 * Constat chez appaul le 13/11 : de 07:24 a 07:42, les premieres requetes de chaque caisse prenaient 6 a 16 s ; le
 * prechauffage (factory JPA, scripts des ecrans) tournait en meme temps que les premieres connexions.
 *
 * Vrai chemin : l'application est redeployee (comme un demarrage du matin) ; la page de connexion est ouverte des que
 * le serveur repond.
 *  Cas 1 : la caissiere saisit ses identifiants et clique tout de suite. La page dit « Demarrage en cours » (dans la
 *          page, aucune fenetre), le bouton aussi ; la demande de connexion ne part qu'une fois le serveur pret, puis
 *          aboutit en 5 s au plus ; l'accueil s'ouvre.
 *  Cas 2 : la caissiere attend sans cliquer : le message disparait (« Serveur pret. »), le bouton reprend son libelle,
 *          la connexion se fait normalement en 5 s au plus.
 *  Cas 3 : serveur deja pret : aucun message, connexion normale (non-regression).
 * Pas de donnee ecrite (hors la session de connexion), donc pas de bilan.
 * Lancement seul (redeploie l'application du domaine d'essai) :
 *   node src/test/e2e/connexion/test-connexion-pendant-demarrage-1311.js
 * Variables : ASADMIN (defaut D:/payara5/payara5/bin/asadmin.bat), ASADMIN_PORT (defaut 10048), E2E_WAR (war a redeployer).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { spawn } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.BASE || 'http://localhost:8080/prestige';
const ASADMIN = process.env.ASADMIN || 'D:/payara5/payara5/bin/asadmin.bat';
const PORT = process.env.ASADMIN_PORT || '10048';
const WAR = process.env.E2E_WAR || 'D:/projet/p3/wars-session-principale/prestige-exploitation-1311.war';
const LOGIN = ENV_E2E.LOGIN_SUPPORT;
const MDP = 'e2etest';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function info() {
  try {
    const r = await fetch(BASE + '/api/v1/app/info', { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch (e) {
    return null;
  }
}

function redeployer() {
  return new Promise((resolve) => {
    const c = spawn(ASADMIN, ['--port', PORT, 'redeploy', '--name', 'prestige', '--contextroot', 'prestige', WAR], { shell: true });
    let sortie = '';
    c.stdout.on('data', (d) => { sortie += d; });
    c.stderr.on('data', (d) => { sortie += d; });
    c.on('close', (code) => resolve({ code, sortie }));
  });
}

/* redeploie et rend la main des que la page de connexion repond a nouveau */
async function demarrer() {
  const avant = await info();
  const fin = redeployer();
  /* attendre que l'ancienne application soit retiree, puis que la nouvelle reponde */
  const t0 = Date.now();
  let vu = null;
  let coupe = false;
  while (Date.now() - t0 < 300000) {
    const i = await info();
    if (!i) { coupe = true; } else if (coupe || (avant && i.demarrageSecondes < avant.demarrageSecondes)) { vu = i; break; }
    await pause(150);
  }
  return { vu, fin };
}

/* etat visible de la page de connexion */
const etatPage = (p) => p.evaluate(() => {
  const z = document.getElementById('pl-demarrage');
  const fenetres = Array.from(document.querySelectorAll('[aria-modal=true],dialog')).filter((d) => d.offsetParent !== null && !d.hidden);
  return {
    message: z && !z.hidden ? z.textContent.trim() : '',
    bouton: (document.querySelector('#login span') || {}).textContent || '',
    fenetres: fenetres.length,
  };
});

async function cas(b, nom, attendreAvantClic) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const err = [];
  p.on('pageerror', (e) => err.push(e.message));
  const auth = [];
  p.on('request', (r) => { if (/\/api\/v1\/user\/auth$/.test(r.url())) { auth.push({ t: Date.now() }); } });
  p.on('response', (r) => { if (/\/api\/v1\/user\/auth$/.test(r.url())) { const a = auth[auth.length - 1]; if (a) { a.fin = Date.now(); a.statut = r.status(); } } });
  let pretA = 0;
  const surveiller = (async () => { for (let k = 0; k < 1200 && !pretA; k++) { const i = await info(); if (i && i.pret) { pretA = Date.now(); } else { await pause(100); } } })();

  await p.goto(BASE + '/security/index.html', { waitUntil: 'domcontentloaded' });
  await pause(700);
  const e1 = await etatPage(p);
  const enCours = !pretA;
  if (enCours) {
    ok(`${nom} : « Démarrage en cours » affiché dans la page, aucune fenêtre`, /Démarrage du serveur en cours/.test(e1.message) && /Démarrage en cours/.test(e1.bouton) && e1.fenetres === 0,
      `message « ${e1.message} », bouton « ${e1.bouton} »`);
  }
  if (attendreAvantClic) {
    await surveiller;
    await pause(1500);
    const e2 = await etatPage(p);
    ok(`${nom} : serveur prêt, le bouton reprend « Se connecter »`, /Se connecter/.test(e2.bouton) && !/en cours/.test(e2.message), `message « ${e2.message} », bouton « ${e2.bouton} »`);
  }
  await p.fill('#str_login', LOGIN);
  await p.fill('#str_password', MDP);
  const clic = Date.now();
  await p.click('#login');
  if (!attendreAvantClic && enCours && !pretA) {
    await pause(400);
    const e3 = await etatPage(p);
    ok(`${nom} : clic pendant le démarrage, la connexion est mise en attente (message dans la page)`, /votre connexion partira/.test(e3.message) && auth.length === 0, `message « ${e3.message} », demandes ${auth.length}`);
  }
  await p.waitForURL('**/general/**', { timeout: 180000 }).catch(() => {});
  await surveiller;
  const arrivee = Date.now();
  const a = auth[0] || {};
  const depart = Math.max(clic, pretA || 0);
  ok(`${nom} : la demande de connexion part une fois le serveur prêt`, !!a.t && (!enCours || a.t >= pretA - 200), `demande à ${a.t ? a.t - clic : '?'} ms du clic, prêt à ${pretA ? pretA - clic : '?'} ms`);
  ok(`${nom} : connexion acceptée et accueil ouvert en 5 s au plus après « prêt » ou le clic`, a.statut === 200 && /\/general\//.test(p.url()) && arrivee - depart <= 5000,
    `réponse ${a.statut} en ${a.fin - a.t} ms ; accueil ${arrivee - depart} ms ; ${p.url().replace(/^.*\/prestige/, '')}`);
  ok(`${nom} : aucune erreur JavaScript`, err.length === 0, err.join(' || '));
  await ctx.close();
  return enCours;
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  try {
    /* cas 1 : clic immediat pendant le demarrage */
    let d = await demarrer();
    ok('Redémarrage 1 : la page répond pendant le préchauffage (pret=false)', d.vu && d.vu.pret === false, JSON.stringify(d.vu));
    const enCours1 = await cas(b, 'Clic pendant le démarrage', false);
    ok('Cas 1 joué pendant le démarrage', enCours1);
    let r = await d.fin;
    ok('Redéploiement 1 réussi', r.code === 0, r.sortie.trim().split('\n').pop());

    /* cas 2 : attente sans clic */
    d = await demarrer();
    const enCours2 = await cas(b, 'Attente sans clic', true);
    ok('Cas 2 joué pendant le démarrage', enCours2 && d.vu && d.vu.pret === false, JSON.stringify(d.vu));
    r = await d.fin;
    ok('Redéploiement 2 réussi', r.code === 0, r.sortie.trim().split('\n').pop());

    /* cas 3 : serveur deja pret */
    const i = await info();
    ok('Serveur prêt avant le cas 3', i && i.pret === true, JSON.stringify(i));
    const ctx = await b.newContext();
    const p = await ctx.newPage();
    await p.goto(BASE + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await pause(1200);
    const e = await etatPage(p);
    ok('Serveur prêt : aucun message de démarrage, bouton « Se connecter »', !e.message && /Se connecter/.test(e.bouton), JSON.stringify(e));
    await ctx.close();
    await cas(b, 'Serveur prêt', false);
  } finally {
    await b.close();
  }
  const n = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - n) + '/' + res.length + ' réussis');
  process.exitCode = n ? 1 : 0;
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
