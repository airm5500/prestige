/* NOM DE L'APPAREIL SUR TELEPHONE OU TERMINAL (retours du 25/10, point 4).
 *
 * Un appareil mobile (navigateur Android) qui ouvre Prestige sans nom de poste est invite UNE fois a se nommer, par un
 * bandeau en bas de l'ecran (pas de fenetre) :
 *  - « Enregistrer » garde le nom sur l'appareil ; il part ensuite avec chaque requete (en-tete X-Poste) ;
 *  - nom vide : message dans le bandeau, rien n'est garde ;
 *  - « Plus tard » : le bandeau ne revient pas (le nom reste reglable dans Fichier journal › Ce poste) ;
 *  - un poste de bureau, ou un appareil deja nomme, ne voit pas le bandeau ;
 *  - aucune erreur JavaScript, aucune fenetre. Rien n'est ecrit en base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const ANDROID = 'Mozilla/5.0 (Linux; Android 11; V2s Build/RKQ1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const BUREAU = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [], dialogues = [];
  const page = async (ua, nom) => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, userAgent: ua });
    if (nom) {
      await ctx.addInitScript((n) => { try { localStorage.setItem('prestige.poste', n); } catch (e) { /* rien */ } }, nom);
    }
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForTimeout(3000);
    return p;
  };
  /* element en position fixe : offsetParent vaut toujours null, on regarde sa taille et son affichage */
  const bandeau = (p) => p.evaluate(() => { const e = document.getElementById('prestige-nom-appareil'); return !!e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none'; });
  try {
    let p = await page(ANDROID);
    ok('Android sans nom : bandeau « Nommez cet appareil » en bas, sans fenêtre', await bandeau(p)
      && await p.evaluate(() => { const r = document.getElementById('prestige-nom-appareil').getBoundingClientRect(); return r.bottom >= window.innerHeight - 2 && /Nommez cet appareil/.test(document.getElementById('prestige-nom-appareil').innerText); })
      && await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length) === 0);
    await p.click('#prestige-nom-appareil-ok');
    await p.waitForTimeout(300);
    ok('Nom vide : message dans le bandeau, rien gardé', /Saisissez un nom/.test(await p.evaluate(() => document.getElementById('prestige-nom-appareil').innerText))
      && await p.evaluate(() => localStorage.getItem('prestige.poste')) === null);
    await p.fill('#prestige-nom-appareil-champ', 'Sunmi caisse 2');
    await p.press('#prestige-nom-appareil-champ', 'Enter');
    await p.waitForTimeout(500);
    ok('Entrée : nom gardé sur l\'appareil, bandeau fermé', await p.evaluate(() => localStorage.getItem('prestige.poste')) === 'Sunmi caisse 2' && !(await bandeau(p)));
    const entete = new Promise((r) => p.on('request', (q) => { if (/\/api\//.test(q.url()) && q.headers()['x-poste']) { r(q.headers()['x-poste']); } }));
    await p.evaluate(() => { Ext.Ajax.request({ url: '../api/v1/common/natures', method: 'GET' }); });
    ok('Les requêtes suivantes portent le nom (X-Poste)', decodeURIComponent(await Promise.race([entete, new Promise((r) => setTimeout(() => r(''), 5000))])) === 'Sunmi caisse 2');
    await p.context().close();

    p = await page(ANDROID);
    await p.click('#prestige-nom-appareil-plustard');
    await p.waitForTimeout(300);
    ok('« Plus tard » : bandeau fermé, aucun nom gardé', !(await bandeau(p)) && await p.evaluate(() => localStorage.getItem('prestige.poste')) === null);
    await p.reload();
    await p.waitForFunction(() => window.Ext && Ext.ComponentQuery && Ext.ComponentQuery.query('viewport').length > 0, null, { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(3000);
    ok('« Plus tard » : le bandeau ne revient pas', !(await bandeau(p)));
    await p.context().close();

    p = await page(ANDROID, 'Déjà nommé');
    ok('Appareil déjà nommé : pas de bandeau', !(await bandeau(p)));
    await p.context().close();
    p = await page(BUREAU);
    ok('Poste de bureau : pas de bandeau', !(await bandeau(p)));
    await p.context().close();
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
