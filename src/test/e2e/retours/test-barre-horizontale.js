/* BARRE DE DEFILEMENT HORIZONTALE FLOTTANTE (demande du 25/10, option 3 de la maquette D).
 *
 * Par les vues (admin), ecran de 1280 x 760, lecture seule :
 *  - GESTION DES COMMANDES > Commande en cours (grille plus large que l'ecran) : barre flottante visible, a la largeur
 *    de la grille, dans l'ecran, au bas de la grille ; barre native du bas cachee ; « Colonnes 1–k sur N » ;
 *  - ▶ fait avancer d'un ecran de colonnes (position et texte suivent), ◀ grise au depart puis actif ; pouce glisse
 *    jusqu'au bout : derniere colonne visible, ▶ grise ; clic sur la piste ;
 *  - la derniere ligne ne passe pas sous la barre ;
 *  - grille qui tient en largeur (SERVICE CLIENT > Vente terminées) : aucune barre, grille non touchee ;
 *  - ANALYSE DE GESTION > Comparaison CA familles : barre presente ; changer d'ecran ne laisse aucune barre derriere ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  /* grille visible qui deborde, et sa barre */
  const etat = () => p.evaluate(() => {
    const v = Array.from(document.querySelectorAll('.x-grid-view')).find((x) => x.offsetParent && x.scrollWidth > x.clientWidth + 2);
    const barres = Array.from(document.querySelectorAll('.pbh-barre')).filter((x) => x.style.display !== 'none');
    if (!v) { return { grille: false, barres: barres.length }; }
    const r = v.getBoundingClientRect(), br = barres[0] && barres[0].getBoundingClientRect();
    return { grille: true, barres: barres.length, x: Math.round(v.scrollLeft), max: v.scrollWidth - v.clientWidth, natif: v.offsetHeight - v.clientHeight - (parseFloat(getComputedStyle(v).borderTopWidth) || 0) - (parseFloat(getComputedStyle(v).borderBottomWidth) || 0),
      vue: { g: Math.round(r.left), l: v.clientWidth, h: Math.round(r.top), b: Math.round(r.bottom) }, barre: br && { g: Math.round(br.left), l: Math.round(br.width), h: Math.round(br.top), b: Math.round(br.bottom) },
      texte: barres[0] ? barres[0].querySelector('.pbh-pos').textContent : '', prec: barres[0] && barres[0].querySelectorAll('.pbh-fl')[0].disabled, suiv: barres[0] && barres[0].querySelectorAll('.pbh-fl')[1].disabled };
  });
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Commande en cours');
    await p.waitForFunction(() => Array.from(document.querySelectorAll('.x-grid-view')).some((x) => x.offsetParent && x.scrollWidth > x.clientWidth + 2), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    let e = await etat();
    ok('Grille plus large que l\'écran : une barre flottante, à la largeur de la grille, dans l\'écran, au bas de la grille', e.barres === 1 && e.barre
      && Math.abs(e.barre.g - e.vue.g) <= 1 && Math.abs(e.barre.l - e.vue.l) <= 1 && e.barre.b <= 760 && e.barre.b <= e.vue.b + 1 && e.barre.h > e.vue.h, JSON.stringify(e));
    /* le navigateur des tests n'affiche pas de barres natives (barres superposees) : on verifie le style qui la cache */
    const natif = await p.evaluate(() => { const v = Array.from(document.querySelectorAll('.x-grid-view')).find((x) => x.offsetParent && x.scrollWidth > x.clientWidth + 2);
      return { classe: v.classList.contains('pbh-vue'), hauteur: getComputedStyle(v, '::-webkit-scrollbar').height }; });
    ok('Barre native du bas cachée (style de la grille)', natif.classe && e.natif <= 1, JSON.stringify(natif) + ' ' + e.natif);
    const n = await p.evaluate(() => { const v = Array.from(document.querySelectorAll('.x-grid-view')).find((x) => x.offsetParent && x.scrollWidth > x.clientWidth + 2);
      return Ext.getCmp(v.id).ownerCt.headerCt.getVisibleGridColumns().length; });
    ok('Position « Colonnes 1–k sur N », ◀ grisée au départ, ▶ active', new RegExp('^Colonnes 1–\\d+ sur ' + n + '$').test(e.texte) && e.prec === true && e.suiv === false, e.texte + ' / ' + n);
    const t0 = e.texte;
    await p.locator('.pbh-barre .pbh-fl').nth(1).click();
    await p.waitForTimeout(900);
    e = await etat();
    ok('▶ : avance d\'un écran de colonnes, la position suit, ◀ active', e.x > 100 && e.texte !== t0 && e.prec === false, JSON.stringify({ x: e.x, texte: e.texte }));
    await p.locator('.pbh-barre .pbh-fl').nth(0).click();
    await p.waitForTimeout(900);
    e = await etat();
    ok('◀ : retour au début', e.x === 0 && e.texte === t0, e.x + ' ' + e.texte);
    const pouce = await p.locator('.pbh-barre .pbh-pouce').boundingBox(), piste = await p.locator('.pbh-barre .pbh-piste').boundingBox();
    await p.mouse.move(pouce.x + pouce.width / 2, pouce.y + pouce.height / 2);
    await p.mouse.down();
    await p.mouse.move(piste.x + piste.width + 50, pouce.y + pouce.height / 2, { steps: 8 });
    await p.mouse.up();
    await p.waitForTimeout(400);
    e = await etat();
    ok('Pouce glissé jusqu\'au bout : dernière colonne visible, ▶ grisée', e.x >= e.max - 1 && new RegExp('–' + n + ' sur ' + n + '$').test(e.texte) && e.suiv === true, JSON.stringify({ x: e.x, max: e.max, texte: e.texte }));
    await p.mouse.click(piste.x + 30, piste.y + piste.height / 2);
    await p.waitForTimeout(900);
    e = await etat();
    ok('Clic au début de la piste : retour vers les premières colonnes', e.x < e.max / 3, e.x + ' / ' + e.max);
    const cache = await p.evaluate(() => { const v = Array.from(document.querySelectorAll('.x-grid-view')).find((x) => x.offsetParent && x.scrollWidth > x.clientWidth + 2);
      v.scrollTop = v.scrollHeight; const rows = v.querySelectorAll('.x-grid-row'); const der = rows[rows.length - 1];
      const bar = document.querySelector('.pbh-barre'); return der ? { ligne: Math.round(der.getBoundingClientRect().bottom), barre: Math.round(bar.getBoundingClientRect().top) } : null; });
    await p.waitForTimeout(300);
    const cache2 = await p.evaluate(() => { const v = Array.from(document.querySelectorAll('.x-grid-view')).find((x) => x.offsetParent && x.scrollWidth > x.clientWidth + 2);
      const rows = v.querySelectorAll('.x-grid-row'); const der = rows[rows.length - 1]; const bar = document.querySelector('.pbh-barre');
      return der ? { ligne: Math.round(der.getBoundingClientRect().bottom), barre: Math.round(bar.getBoundingClientRect().top) } : { vide: true }; });
    ok('La dernière ligne ne passe pas sous la barre', cache2.vide || cache2.ligne <= cache2.barre + 1, JSON.stringify({ cache, cache2 }));

    await ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction(() => Array.from(document.querySelectorAll('.x-grid-view')).some((x) => x.offsetParent), null, { timeout: 60000 });
    await p.waitForTimeout(2000);
    const vt = await p.evaluate(() => ({ deborde: Array.from(document.querySelectorAll('.x-grid-view')).filter((x) => x.offsetParent && x.scrollWidth > x.clientWidth + 2).length,
      barres: Array.from(document.querySelectorAll('.pbh-barre')).length, touchees: document.querySelectorAll('.pbh-vue').length }));
    ok('Grille qui tient en largeur : aucune barre, grille non touchée, aucune barre laissée par l\'écran précédent', vt.deborde === 0 && vt.barres === 0 && vt.touchees === 0, JSON.stringify(vt));

    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Comparaison CA familles');
    await p.waitForFunction(() => Array.from(document.querySelectorAll('.x-grid-view')).some((x) => x.offsetParent && x.scrollWidth > x.clientWidth + 2), null, { timeout: 90000 }).catch(() => {});
    await p.waitForTimeout(1500);
    e = await etat();
    ok('Comparaison CA familles : une barre flottante', e.grille && e.barres === 1 && /^Colonnes 1–\d+ sur \d+$/.test(e.texte), JSON.stringify({ grille: e.grille, barres: e.barres, texte: e.texte }));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
