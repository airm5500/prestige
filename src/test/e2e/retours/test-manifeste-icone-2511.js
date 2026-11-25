/* DEMANDE DU 25/11 : RACCOURCI « PRESTIGE » SUR LE BUREAU, PETITE ICONE SUR FOND BLANC.
 *
 * Retour de l'utilisateur : « pourquoi apres deploiement j'ai cette petite icone avec fond blanc ? alors qu'elle ne
 * devait pas avoir de fond blanc et etre plus grande ». Le raccourci est cree par le navigateur : sans manifeste
 * d'application, Chrome pose le favicon, en petit, sur une tuile blanche. Avec un manifeste (icones 192 et 512), le
 * raccourci (« Installer » / « Creer un raccourci ») prend l'icone elle-meme.
 *
 * Par les vues (1366 × 768). Ce que le test etablit :
 *  - la page de connexion et l'application declarent le manifeste ;
 *  - le manifeste se lit : nom « Prestige », ouverture dans sa propre fenetre, icones 192 et 512 declarees ;
 *  - chaque icone declaree existe, a la taille annoncee, a des coins transparents (pas de fond blanc), et le dessin
 *    remplit au moins 90 % du carre (pas de marge vide qui la rapetisse) ; fond violet sous le « P » ;
 *  - le navigateur reconnait le manifeste (lien resolu, icones chargees sans erreur) ;
 *  - aucune erreur JavaScript. Rien n'est ecrit en base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { BASE, connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const pixels = (p, url) => p.evaluate(async (u) => {
  const img = new Image();
  img.src = u;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
  }
  const px = (x, y) => Array.from(d.slice((y * c.width + x) * 4, (y * c.width + x) * 4 + 4));
  return { l: c.width, h: c.height, coins: [px(0, 0), px(c.width - 1, 0), px(0, c.height - 1), px(c.width - 1, c.height - 1)],
    remplissage: Math.max(x1 - x0 + 1, y1 - y0 + 1) / c.width, bas: px(Math.floor(c.width / 2), Math.floor(c.height * 0.85)) };
}, url);

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const echecsReseau = []; p.on('requestfailed', (r) => { if (/manifest|icone-prestige/.test(r.url())) echecsReseau.push(r.url()); });
  try {
    await p.goto(BASE + '/security/index.html', { waitUntil: 'load' });
    const lienConnexion = await p.evaluate(() => { const l = document.querySelector('link[rel=manifest]'); return l ? l.href : null; });
    ok('Page de connexion : manifeste déclaré', !!lienConnexion, lienConnexion);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lienAppli = await p.evaluate(() => { const l = document.querySelector('link[rel=manifest]'); return l ? l.href : null; });
    ok('Application : même manifeste déclaré', !!lienAppli && lienAppli === lienConnexion, lienAppli);
    const m = lienAppli ? await p.evaluate(async (u) => { const r = await fetch(u); return { http: r.status, json: await r.json().catch(() => null) }; }, lienAppli) : { json: null };
    const j = m.json || {};
    ok('Manifeste lu : nom « Prestige », fenêtre à part, adresse de départ dans Prestige', m.http === 200 && j.name === 'Prestige' && j.display === 'standalone'
      && new URL(j.start_url, lienAppli).pathname.startsWith('/prestige/'), JSON.stringify({ http: m.http, name: j.name, display: j.display, start: j.start_url }));
    const icones = (j.icons || []).map((i) => ({ src: new URL(i.src, lienAppli).href, taille: Number((i.sizes || '').split('x')[0]) }));
    ok('Icônes 192 et 512 déclarées', icones.some((i) => i.taille === 192) && icones.some((i) => i.taille === 512), icones.map((i) => i.taille).join(','));
    for (const i of icones) {
      const im = await pixels(p, i.src);
      ok(`Icône ${i.taille} : taille réelle = taille annoncée`, im.l === i.taille && im.h === i.taille, im.l + 'x' + im.h);
      ok(`Icône ${i.taille} : coins transparents (pas de fond blanc)`, im.coins.every((c) => c[3] === 0), JSON.stringify(im.coins));
      if (i.taille >= 192) {
        ok(`Icône ${i.taille} : le dessin remplit au moins 90 % du carré`, im.remplissage >= 0.9, (100 * im.remplissage).toFixed(1) + ' %');
        ok(`Icône ${i.taille} : fond violet sous le « P »`, im.bas[3] > 200 && im.bas[2] > 120 && im.bas[0] < 90 && im.bas[1] < 70, JSON.stringify(im.bas));
      }
    }
    ok('Manifeste et icônes chargés sans erreur réseau', echecsReseau.length === 0, echecsReseau.join(' '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close().catch(() => null);
    const echecs = res.filter((x) => !x.c).length;
    console.log((res.length - echecs) + '/' + res.length + (echecs ? ' ECHEC' : ' OK'));
    process.exit(echecs ? 1 : 0);
  }
})();
