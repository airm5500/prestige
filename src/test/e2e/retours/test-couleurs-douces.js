/* RETOUR DU 04/11 (2) : « pourquoi les couleurs ont disparu ? j'avais demande des couleurs douces sur le dashboard pour
 * faire la difference et montrer un peu de relief ; pour le menu pilotage, c'est quoi ces points et tuiles sans
 * couleur ? ». Le retrait des filets de couleur (test-sans-filet-colore.js) ne devait pas retirer les teintes douces.
 * Par le vrai chemin : connexion, puis le menu pour le pilotage :
 *  - tableau de bord (ecran d'accueil, ouvert a la connexion) : le bandeau de chaque carte est teinte (pas gris), et les cartes voisines n'ont pas toutes la
 *    meme teinte ;
 *  - « Pilotage » : chaque tuile a un fond teinte ; sa pastille porte une icone, jamais un point ; les tuiles de la bande
 *    n'ont pas toutes la meme teinte ;
 *  - toujours aucun filet de couleur sur un seul bord dans ces deux ecrans.
 * Lecture seule.
 *
 * node retours/test-couleurs-douces.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const menu = (cond) => q("SELECT CONCAT_WS('|', m.str_VALUE, s.str_DESCRIPTION) FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID WHERE "
  + cond + " AND s.str_Status = 'enable' ORDER BY s.int_PRIORITY LIMIT 1").split('|');

/* teinte d'un fond : couleur unie ou premiere couleur d'un degrade ; « grise » quand ses trois composantes sont proches */
const LIRE = `
  window.__teinte = (e, pseudo) => {
    const s = getComputedStyle(e, pseudo || null);
    const src = s.backgroundImage && s.backgroundImage !== 'none' ? s.backgroundImage : s.backgroundColor;
    const m = src.match(/rgba?\\(([^)]+)\\)/);
    if (!m) { return null; }
    const v = m[1].split(',').map(parseFloat);
    return { rgb: v.slice(0, 3).join(','), grise: Math.max(v[0], v[1], v[2]) - Math.min(v[0], v[1], v[2]) < 12 || (v.length > 3 && v[3] < 0.2) };
  };
  window.__filets = (racine) => {
    const out = [];
    for (const e of racine.querySelectorAll('*')) {
      const r = e.getBoundingClientRect();
      if (r.width < 12 || r.height < 8) { continue; }
      const s = getComputedStyle(e);
      const epais = ['Top', 'Right', 'Bottom', 'Left'].filter((c) => {
        const w = parseFloat(s['border' + c + 'Width']); const m = s['border' + c + 'Color'].match(/rgba?\\(([^)]+)\\)/);
        if (w < 2 || s['border' + c + 'Style'] === 'none' || !m) { return false; }
        const v = m[1].split(',').map(parseFloat); return Math.max(v[0], v[1], v[2]) - Math.min(v[0], v[1], v[2]) >= 40;
      });
      if (epais.length > 0 && epais.length < 4) { out.push(e.className + ' ' + epais.join('/')); }
    }
    return out;
  };`;

(async () => {
  const mp = menu("s.str_COMPOSANT = 'pilotage'");
  ok('Précondition : menu « Pilotage » présent', !!mp[1], mp.join('/'));
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.addScriptTag({ content: LIRE });

    /* ---- Tableau de bord : ecran d'accueil */
    await p.waitForFunction(() => document.querySelectorAll('.tb-carte .tb-tete').length >= 4, null, { timeout: 60000 });
    await p.waitForTimeout(2500);
    const tb = await p.evaluate(() => {
      const tetes = [...document.querySelectorAll('.tb-carte .tb-tete')].filter((e) => e.offsetParent);
      const t = tetes.map((e) => window.__teinte(e));
      return { n: tetes.length, grises: t.filter((x) => !x || x.grise).length, teintes: [...new Set(t.filter(Boolean).map((x) => x.rgb))],
        filets: window.__filets(document.querySelector('.tb-grille') || document.body).slice(0, 6) };
    });
    if (process.env.CAPTURE_DIR) { await p.screenshot({ path: process.env.CAPTURE_DIR + '/couleurs-tableau-bord.png' }); }
    ok('Tableau de bord : chaque bandeau de carte est teinté, aucun gris', tb.n > 0 && tb.grises === 0, tb.grises + ' gris sur ' + tb.n);
    ok('Tableau de bord : les cartes n\'ont pas toutes la même teinte', tb.teintes.length >= 3, tb.teintes.join(' ; '));
    ok('Tableau de bord : aucun filet de couleur sur un seul bord', tb.filets.length === 0, tb.filets.join(' | '));

    /* ---- Pilotage */
    await ouvrirMenu(p, mp[0], mp[1]);
    await p.waitForFunction(() => [...document.querySelectorAll('.pilotage-tuile')].filter((e) => e.offsetParent).length >= 4, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    const pi = await p.evaluate(() => {
      const tuiles = [...document.querySelectorAll('.pilotage-tuile')].filter((e) => e.offsetParent);
      const fonds = tuiles.map((e) => window.__teinte(e));
      const pastilles = tuiles.map((e) => { const s = getComputedStyle(e, '::before'); return { cle: e.getAttribute('data-cle'), contenu: s.content, police: s.fontFamily }; });
      return { n: tuiles.length, blanches: fonds.filter((x) => !x || x.grise).length, teintes: [...new Set(fonds.filter(Boolean).map((x) => x.rgb))],
        points: pastilles.filter((x) => /•|^none$|^normal$|^""$/.test(x.contenu)).map((x) => x.cle),
        sansIcone: pastilles.filter((x) => !/Font Awesome/i.test(x.police) && !/^"[!✓]"$/.test(x.contenu)).map((x) => x.cle + ' ' + x.contenu),
        filets: window.__filets(document.querySelector('.pilotage-ardoise') || document.body).slice(0, 6) };
    });
    if (process.env.CAPTURE_DIR) { await p.screenshot({ path: process.env.CAPTURE_DIR + '/couleurs-pilotage.png' }); }
    ok('Pilotage : chaque tuile a un fond teinté', pi.n > 0 && pi.blanches === 0, pi.blanches + ' sans teinte sur ' + pi.n);
    ok('Pilotage : les tuiles n\'ont pas toutes la même teinte', pi.teintes.length >= 3, pi.teintes.join(' ; '));
    ok('Pilotage : aucune pastille réduite à un point', pi.points.length === 0, pi.points.join(', '));
    ok('Pilotage : chaque pastille porte une icône', pi.sansIcone.length === 0, pi.sansIcone.join(' | '));
    ok('Pilotage : aucun filet de couleur sur un seul bord', pi.filets.length === 0, pi.filets.join(' | '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
