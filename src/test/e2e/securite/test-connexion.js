/* SECURITE : page de connexion (13/10).
 *  - la page n'est plus une JSP : security/index.jsp renvoie vers security/index.html (anciens liens conserves) ;
 *  - nom de l'application, version et nom de la pharmacie viennent de l'API (v1/app/info) ;
 *  - deja connecte : la page renvoie directement vers l'accueil ;
 *  - mauvais mot de passe : message dans la page, aucune fenetre ;
 *  - 10 echecs sur un meme identifiant (retour du 25/10, 5 avant) : attente imposee (ecran ET telephone), message
 *    clair ; un autre compte passe ;
 *  - retour du 25/10 : l'attente ecoulee, une faute de frappe ne rebloque pas aussitot et le bon mot de passe passe ;
 *  - l'identifiant de session change a la connexion (fixation de session).
 * Aucune donnee ecrite : l'identifiant d'essai n'existe pas ; le blocage est en memoire et expire seul.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const URL = 'http://localhost:8080/prestige/';
const FAUX = 'e2e_inconnu_' + Date.now();

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const dialogues = [];
  try {
    const ctx = await b.newContext();
    const p = await ctx.newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto(URL + 'security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'networkidle' });
    ok('Ancien lien security/index.jsp : arrive sur la page HTML', /security\/index\.html/.test(p.url()), p.url());
    const html = await (await fetch(URL + 'security/index.html')).text();
    ok('Page servie sans code JSP', !/<%/.test(html) && /id="str_login"/.test(html));
    await p.waitForFunction(() => /\S/.test((document.getElementById('pl-version') || {}).textContent || ''), null, { timeout: 10000 });
    const vue = await p.evaluate(() => ({ titre: document.title, version: document.getElementById('pl-version').textContent,
      marque: document.querySelector('.pl-brand__text').textContent, pharma: document.getElementById('pl-pharma-name').textContent }));
    const officine = q("SELECT str_NOM_COMPLET FROM t_officine LIMIT 1");
    ok('Nom de l\'application, version et titre affichés', /v\S+/.test(vue.version) && vue.titre.indexOf(vue.marque.trim()) >= 0 && vue.marque.trim().length > 0, JSON.stringify(vue));
    await p.waitForFunction((o) => (document.getElementById('pl-pharma-name').textContent || '').indexOf(o) >= 0, officine, { timeout: 10000 }).catch(() => {});
    ok('Nom de la pharmacie affiché', (await p.textContent('#pl-pharma-name')).indexOf(officine) >= 0, await p.textContent('#pl-pharma-name'));

    /* mauvais mot de passe */
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'mauvais-mot-de-passe'); await p.click('#login');
    await p.waitForFunction(() => { const m = document.getElementById('pl-message'); return m && !m.hidden && /\S/.test(m.textContent); }, null, { timeout: 10000 }).catch(() => {});
    const msg1 = await p.evaluate(() => { const m = document.getElementById('pl-message'); return m ? (m.hidden ? '' : m.textContent) : null; });
    ok('Mauvais mot de passe : message dans la page', /incorrect/i.test(msg1 || ''), msg1);
    ok('Aucune fenêtre (alert)', dialogues.length === 0, dialogues.join(' | '));

    /* limite d'essais sur un identifiant inconnu */
    const essai = (login) => p.evaluate(async ([l]) => (await fetch('../api/v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: l, password: 'x' }) })).json(), [login]);
    const r = [];
    for (let i = 0; i < 10; i++) { r.push(await essai(FAUX)); }
    ok('9 premiers échecs : message habituel', r.slice(0, 9).every((x) => x.success === false && !x.attente && /incorrect/i.test(x.message)), JSON.stringify(r[8]));
    ok('10e échec : attente de 30 s annoncée', r[9].attente === 30 && /Trop d'essais/.test(r[9].message), JSON.stringify(r[9]));
    const r6 = await essai(FAUX);
    ok('Pendant l\'attente : refus immédiat avec le temps restant', r6.success === false && r6.attente > 0 && /Réessayez dans/.test(r6.message), JSON.stringify(r6));
    const mob = await (await fetch(URL + 'api/v1/mobile/connexion', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: FAUX, motDePasse: 'x', appareil: 'e2e' }) })).json();
    ok('Téléphone : même blocage', mob.success === false && /Trop d'essais/.test(mob.message || mob.msg || ''), JSON.stringify(mob));
    await p.fill('#str_login', FAUX); await p.fill('#str_password', 'x'); await p.click('#login');
    await p.waitForFunction(() => /Trop d'essais/.test((document.getElementById('pl-message') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => {});
    ok('Écran : message de blocage affiché', /Trop d'essais/.test(await p.textContent('#pl-message')), await p.textContent('#pl-message'));

    /* retour du 25/10 : un compte reel bloque, l'attente ecoulee, une faute de frappe puis le bon mot de passe */
    const essaiMdp = (l, m) => p.evaluate(async ([l2, m2]) => (await fetch('../api/v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: l2, password: m2 }) })).json(), [l, m]);
    const ra = [];
    for (let i = 0; i < 10; i++) { ra.push(await essaiMdp('admin', 'faux-' + i)); }
    ok('Compte réel : bloqué au 10e échec', ra[9].attente === 30 && /Trop d'essais/.test(ra[9].message), JSON.stringify(ra[9]));
    await p.waitForTimeout(31000);
    const apresAttente = await essaiMdp('admin', 'encore-faux');
    ok('Attente écoulée : une faute de frappe ne rebloque pas (message « incorrect »)', apresAttente.success === false && !apresAttente.attente && /incorrect/i.test(apresAttente.message), JSON.stringify(apresAttente));

    /* un autre compte passe ; la session change */
    ok('Page de connexion : aucune session créée avant la connexion (13/10)', !(await ctx.cookies()).some((c) => c.name === 'JSESSIONID'));
    /* fixation de session : un identifiant impose avant la connexion n'est pas repris */
    await ctx.addCookies([{ name: 'JSESSIONID', value: 'identifiant-impose-e2e', domain: 'localhost', path: '/prestige' }]);
    const avant = (await ctx.cookies()).find((c) => c.name === 'JSESSIONID');
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const apres = (await ctx.cookies()).find((c) => c.name === 'JSESSIONID');
    ok('Autre compte : connexion normale malgré le blocage du premier', /general/.test(p.url()));
    ok('Identifiant de session renouvelé à la connexion', avant && apres && avant.value !== apres.value, (avant || {}).value + ' -> ' + (apres || {}).value);

    /* deja connecte */
    const p2 = await ctx.newPage();
    await p2.goto(URL + 'security/index.jsp?content=panelInfos.jsp&lng=fr');
    await p2.waitForURL('**/general/**', { timeout: 20000 }).catch(() => {});
    ok('Déjà connecté : la page de connexion renvoie à l\'accueil', /general/.test(p2.url()), p2.url());
    ok('Aucune fenêtre pendant tout le parcours', dialogues.length === 0, dialogues.join(' | '));
  } catch (e) {
    ok('Exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
