/* SECURITE (13/10) : sessions.
 *  - les routes publiques et les pages d'entree ne creent plus de session (aucun cookie JSESSIONID rendu) : avant,
 *    chaque appel anonyme laissait une session en memoire, jamais liberee (session-timeout -1) ;
 *  - un essai de connexion rate ne cree pas de session ; une connexion reussie en cree une ;
 *  - les sessions expirent apres KEY_DUREE_SESSION_MINUTES minutes sans requete (720 par defaut) : essai a 1 minute ;
 *  - ecran ouvert sur une session expiree : a la requete suivante, retour a la page de connexion avec un message dans
 *    la page, sans fenetre ; un 401 alors que le poste est connecte ne deconnecte pas l'ecran.
 * Le parametre est remis a sa valeur d'origine a la fin (et la minute de cache attendue).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const URL = 'http://localhost:8080/prestige/';
const API = URL + 'api/';
const CLE = 'KEY_DUREE_SESSION_MINUTES';
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const cookieSession = (r) => (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || '']).some((c) => /JSESSIONID=/.test(c));

(async () => {
  const origine = q(`SELECT COALESCE((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${CLE}'), '__absent__')`);
  ok('Paramètre de durée présent (720 min par défaut)', origine !== '__absent__', origine);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const dialogues = [];
  try {
    /* 1. aucun appel public ne cree de session */
    const publics = ['api/v1/licence/find', 'api/v1/officine', 'api/v1/app/info', 'api/v1/espace-produit/recherche?q=pa',
      'api/v1/espace-produit/dci?q=pa', 'api/v1/avis-public/contexte?t=faux', 'api/v1/ca-all', '', 'index.jsp',
      'security/index.jsp', 'security/index.html', 'app/security/index.jsp'];
    const avecSession = [];
    for (const u of publics) { const r = await fetch(URL + u, { redirect: 'manual' }); if (cookieSession(r)) { avecSession.push(u || '/'); } }
    ok('Routes publiques et pages d\'entrée : aucune session créée (' + publics.length + ' adresses)', avecSession.length === 0, avecSession.join(', '));
    let r = await fetch(API + 'v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'e2e_inconnu_' + Date.now(), password: 'x' }) });
    ok('Connexion ratée : aucune session créée', !cookieSession(r));
    r = await fetch(API + 'v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: ENV_E2E.LOGIN, password: 'e2etest' }) });
    ok('Connexion réussie : session créée', cookieSession(r) && (await r.json()).success !== false);

    /* 2. expiration reelle : duree ramenee a 1 minute (cache d'une minute) */
    q(`UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = '${CLE}'`);
    await attendre(61000);
    const ctx = await b.newContext();
    const p = await ctx.newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto(URL + 'security/index.html', { waitUntil: 'networkidle' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && Ext.Ajax, null, { timeout: 60000 });
    const cookie = (await ctx.cookies()).find((c) => c.name === 'JSESSIONID');
    const appel = async () => (await fetch(API + 'v1/fournisseurs', { headers: { Cookie: 'JSESSIONID=' + cookie.value } })).status;
    ok('Session active : les données répondent', (await appel()) === 200);

    /* un 401 alors que le poste est connecte (jeton telephone absent) : l'ecran reste en place */
    await p.evaluate(() => Ext.Ajax.request({ url: '../api/v1/mobile/catalogue-essai', method: 'GET', failure: function () {} }));
    await attendre(3000);
    ok('401 avec poste connecté : l\'écran reste ouvert', /general/.test(p.url()), p.url());

    /* inactivite : plus aucune requete pendant la duree + passage du nettoyeur de sessions */
    await p.goto('about:blank');
    const t0 = Date.now();
    let statut = 200;
    await attendre(65000);
    while (Date.now() - t0 < 240000) { statut = await appel(); if (statut === 401) { break; } await attendre(70000); }
    ok('Après 1 minute sans requête : session expirée (401)', statut === 401, statut + ' après ' + Math.round((Date.now() - t0) / 1000) + ' s');

    /* ecran ouvert dont la session se ferme cote serveur (comme a l'expiration) : a la requete suivante, retour a la
       page de connexion avec un message dans la page */
    await ctx.clearCookies();
    await p.goto(URL + 'security/index.html', { waitUntil: 'networkidle' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && Ext.Ajax, null, { timeout: 60000 });
    const c2 = (await ctx.cookies()).find((c) => c.name === 'JSESSIONID');
    await fetch(API + 'v1/user/logout', { method: 'POST', headers: { Cookie: 'JSESSIONID=' + c2.value } });
    await p.evaluate(() => Ext.Ajax.request({ url: '../api/v1/fournisseurs', method: 'GET', failure: function () {} }));
    await p.waitForURL('**/security/index.html?expiree=1', { timeout: 20000 }).catch(() => {});
    ok('Session fermée : l\'écran revient à la page de connexion', /security\/index\.html\?expiree=1/.test(p.url()), p.url());
    await p.waitForFunction(() => { const m = document.getElementById('pl-message'); return m && !m.hidden && /expiré/.test(m.textContent); }, null, { timeout: 10000 }).catch(() => {});
    ok('Message « session expirée » affiché dans la page', /expiré/.test(await p.evaluate(() => { const m = document.getElementById('pl-message'); return m && !m.hidden ? m.textContent : ''; })));
    ok('Écran : aucune fenêtre affichée', dialogues.length === 0, dialogues.join(' | '));
    r = await fetch(API + 'v1/user/logout', { method: 'POST' });
    ok('Déconnexion sans session : aucune session créée', r.status === 200 && !cookieSession(r));
  } finally {
    if (origine === '__absent__') {
      q(`DELETE FROM t_parameters WHERE str_KEY = '${CLE}'`);
    } else {
      q(`UPDATE t_parameters SET str_VALUE = '${origine.replace(/'/g, "''")}' WHERE str_KEY = '${CLE}'`);
    }
    ok('Paramètre remis à sa valeur d\'origine', q(`SELECT COALESCE((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${CLE}'), '__absent__')`) === origine);
    await attendre(61000);
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
