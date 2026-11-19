/* FREQUENCE DU PANIER DES VENTES RATEES ET DE LA CLOCHE (retour du 18/11).
 *
 * Demande : « les notifications ventes ratees du panier en haut doivent suivre le parametre de la cloche de
 * notifications concernant la frequence de recherche ». Le parametre KEY_NOTIFICATION_REFRESH_SECONDS vaut 300 dans la
 * base du jour d'appaul, mais les fils d'Ariane du 16/11 et du 17/11 (CAISSE44, CAISSE11, SERVEUR) montrent les deux
 * compteurs appeles ensemble toutes les 60 s.
 *
 * Ce que le test etablit, sur le vrai en-tete (parametre remis a sa valeur a la fin) :
 *  - parametre a 20 s : le panier (ventes-ratees/compteur-jour) et la cloche (notifications-centre/compteurs) sont
 *    appeles toutes les 20 s, ensemble, et jamais toutes les 60 s ;
 *  - parametre change a 30 s pendant la session : le cycle suivant le suit, sans se reconnecter ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const CLE = 'KEY_NOTIFICATION_REFRESH_SECONDS';
const regler = (v) => exec("UPDATE t_parameters SET str_VALUE = '" + v + "' WHERE str_KEY = '" + CLE + "'");

/** Ecarts en secondes entre appels successifs d'une meme route. */
function ecarts(t) { const e = []; for (let i = 1; i < t.length; i++) { e.push(Math.round((t[i] - t[i - 1]) / 100) / 10); } return e; }

(async () => {
  const avant = q("SELECT COUNT(*) FROM t_parameters WHERE str_KEY = '" + CLE + "'") === '1'
    ? q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + CLE + "'") : null;
  if (avant === null) {
    exec("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + CLE + "', '60', 'essai', 'CUSTOMER', 'enable', NOW(), NOW())");
  }
  regler('20');
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = [], panier = [], cloche = [], lectures = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  p.on('request', (r) => {
    const u = r.url();
    if (/ventes-ratees\/compteur-jour/.test(u)) { panier.push(Date.now()); }
    if (/notifications-centre\/compteurs/.test(u)) { cloche.push(Date.now()); }
    if (/app-params\/value\/KEY_NOTIFICATION_REFRESH_SECONDS/.test(u)) { lectures.push(Date.now()); }
  });
  try {
    await p.goto((process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.PrestigeNotif && Ext.ComponentQuery.query('navigation').length && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 90000 });

    // 0) coherence du calcul du delai (graine fixe, 5 000 valeurs) : entier >= 15 garde tel quel, sinon 60
    const coherence = await p.evaluate(() => {
      let g = 20261118; const alea = () => { g = (g * 1103515245 + 12345) % 2147483648; return g / 2147483648; };
      const fautes = [];
      const formes = [(n) => String(n), (n) => n, (n) => ' ' + n, (n) => n + 's', () => '', () => null, () => 'abc', (n) => String(-n)];
      for (let i = 0; i < 5000; i++) {
        const n = Math.floor(alea() * 1000); const f = formes[Math.floor(alea() * formes.length)]; const v = f(n);
        const s = v === null ? '' : String(v).trim(); const m = /^-?\d+/.exec(s);
        const attendu = m && Number(m[0]) >= 15 ? Number(m[0]) : 60;
        const obtenu = prestigeDelaiNotifications(v);
        if (obtenu !== attendu) { fautes.push(JSON.stringify(v) + ' -> ' + obtenu + ' au lieu de ' + attendu); }
      }
      return { fautes: fautes.slice(0, 5), n: fautes.length, frontieres: [14, 15, 16, 0, 300].map((x) => prestigeDelaiNotifications(String(x))) };
    });
    ok('Délai : 5 000 valeurs tirées au hasard, entier ≥ 15 gardé, sinon 60', coherence.n === 0, JSON.stringify(coherence.fautes));
    ok('Délai : frontières 14 → 60, 15 → 15, 16 → 16, 0 → 60, 300 → 300', JSON.stringify(coherence.frontieres) === '[60,15,16,60,300]', JSON.stringify(coherence.frontieres));

    // 1) parametre a 20 s : on observe 65 s apres le premier appel du panier
    const t0 = Date.now();
    while (!panier.length && Date.now() - t0 < 30000) { await p.waitForTimeout(250); }
    const debut = panier.length ? panier[0] : Date.now();
    await p.waitForTimeout(Math.max(0, debut + 65000 - Date.now()));
    const p1 = panier.filter((t) => t >= debut), c1 = cloche.filter((t) => t >= debut - 1000);
    const e1 = ecarts(p1);
    ok('Paramètre à 20 s : le panier est appelé au moins 4 fois en 65 s (et non une fois par minute)', p1.length >= 4, p1.length + ' appels, écarts ' + JSON.stringify(e1));
    ok('Paramètre à 20 s : chaque écart du panier est de 20 s (± 3 s)', e1.length >= 3 && e1.every((e) => Math.abs(e - 20) <= 3), JSON.stringify(e1));
    ok('Paramètre à 20 s : la cloche suit le même rythme', ecarts(c1).length >= 3 && ecarts(c1).every((e) => Math.abs(e - 20) <= 3), JSON.stringify(ecarts(c1)));
    const l1 = lectures.filter((t) => t >= debut && t <= debut + 65000), c1b = c1.filter((t) => t >= debut);
    ok('Bilan des cycles : une lecture du paramètre par cycle, autant d\'appels du panier que de la cloche', Math.abs(l1.length - p1.length) <= 1 && p1.length === c1b.length, l1.length + ' lectures, ' + p1.length + ' panier, ' + c1b.length + ' cloche');
    ok('Panier et cloche partent ensemble (moins d\'1 s d\'écart)', p1.every((t) => cloche.some((c) => Math.abs(c - t) < 1000)), '');

    // 2) parametre change a 30 s pendant la session : le cycle suivant le suit, sans reconnexion
    regler('30');
    const change = Date.now();
    await p.waitForTimeout(100000);
    const p2 = panier.filter((t) => t > change);
    // le premier appel apres le changement est encore cale sur l ancien rythme ; les ecarts entre appels suivants, non
    const e2 = ecarts(p2);
    ok('Paramètre changé à 30 s en cours de session : le panier passe à 30 s (± 3 s) sans reconnexion', e2.length >= 2 && e2.every((e) => Math.abs(e - 30) <= 3), JSON.stringify(ecarts(p2)));
    ok('Paramètre changé à 30 s : la cloche suit aussi', (() => { const e = ecarts(cloche.filter((t) => t > change)); return e.length >= 2 && e.every((x) => Math.abs(x - 30) <= 3); })(), JSON.stringify(ecarts(cloche.filter((t) => t > change))));

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack || e);
  } finally {
    if (avant === null) {
      exec("DELETE FROM t_parameters WHERE str_KEY = '" + CLE + "'");
    } else {
      regler(avant.replace(/'/g, "''"));
    }
    const remis = q("SELECT COALESCE(MAX(str_VALUE), '(absent)') FROM t_parameters WHERE str_KEY = '" + CLE + "'");
    ok('Paramètre remis à sa valeur d\'origine', remis === (avant === null ? '(absent)' : avant), remis);
    await b.close();
  }
  const ko = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS');
  process.exit(ko ? 1 : 0);
})();
