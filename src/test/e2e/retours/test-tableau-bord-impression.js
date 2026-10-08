/* TABLEAU DE BORD : IMPRESSION FIDELE A L'ECRAN (retours du 08/10). Par l'ecran, admin ; rien n'est ecrit en base.
 *  - meme disposition qu'a l'ecran : chaque tuile et chaque carte a la meme position et la meme largeur RELATIVES
 *    (a 1 % pres), dans le meme ordre ; plus d'empilement des cartes sur papier ;
 *  - meme contenu : graphiques SVG, interrupteurs avec le choix en cours, listes avec la valeur choisie ;
 *  - boutons d'action (Personnaliser, Actualiser, Imprimer, outils) absents ; « Imprimé le » present ;
 *  - la copie tient dans la largeur d'une page A4 paysage ; PDF paysage ; retour a l'ecran normal ensuite.
 */
const { chromium } = require('playwright-core');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const SORTIE = process.env.SORTIE || '/tmp';

/* positions relatives au cadre (racine .tb) */
const mesurer = (sel) => {
  const racine = document.querySelector(sel);
  const r = racine.getBoundingClientRect();
  const out = {};
  racine.querySelectorAll('[data-tuile], [data-carte]').forEach((e) => {
    const b = e.getBoundingClientRect();
    if (b.width === 0) { return; }
    const id = e.getAttribute('data-tuile') ? 't:' + e.getAttribute('data-tuile') : 'c:' + e.getAttribute('data-carte');
    out[id] = { x: (b.left - r.left) / r.width, w: b.width / r.width, y: b.top - r.top };
  });
  return { largeur: r.width, out };
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('tableaubord', {}));
    await p.waitForFunction(() => document.querySelectorAll('[data-carte]').length >= 10 && document.querySelector('[data-carte="evolution"] svg')
      && document.querySelector('[data-seg="empl"] [data-v="famille"]'), null, { timeout: 120000 });
    await p.waitForTimeout(4000);
    /* un choix a l'ecran qui doit se retrouver a l'impression */
    await p.click('[data-seg="empl"] [data-v="famille"]');
    await p.waitForFunction(() => /on/.test(document.querySelector('[data-seg="empl"] [data-v="famille"]').className), null, { timeout: 15000 });
    await p.waitForTimeout(1500);
    const ecran = await p.evaluate(mesurer, '.tb');
    const etatEcran = await p.evaluate(() => ({ segs: [...document.querySelectorAll('.tb .tb-seg button.on')].map((x) => x.textContent),
      selects: [...document.querySelectorAll('.tb select')].map((s) => s.options[s.selectedIndex] && s.options[s.selectedIndex].text), svg: document.querySelectorAll('.tb svg').length }));
    await p.screenshot({ path: SORTIE + '/tableau-bord-ecran.png' });

    await p.evaluate(() => { window.__imprime = 0; window.print = () => { window.__imprime++; }; });
    await p.click('[data-tb="imprimer"]');
    await p.waitForFunction(() => window.__imprime === 1, null, { timeout: 5000 });
    await p.emulateMedia({ media: 'print' });
    await p.waitForTimeout(500);
    const papier = await p.evaluate(mesurer, '#tb-impression .tb');
    const etatPapier = await p.evaluate(() => { const z = document.querySelector('#tb-impression .tb'); const zoom = Number(z.style.zoom || 1);
      return { segs: [...z.querySelectorAll('.tb-seg button.on')].map((x) => x.textContent),
        selects: [...z.querySelectorAll('select')].map((s) => s.options[s.selectedIndex] && s.options[s.selectedIndex].text), svg: z.querySelectorAll('svg').length,
        boutons: z.querySelectorAll('[data-tb="perso"], [data-tb="actualiser"], [data-tb="imprimer"], .tb-carte-outils, .tb-tuile-outils').length,
        imprimeLe: /Imprimé le \d{2}\/\d{2}\/\d{4}/.test(z.textContent), zoom, largeurRendue: z.getBoundingClientRect().width,
        cartesSurPapier: getComputedStyle(z.querySelector('.tb-grille')).gridTemplateColumns.split(' ').length }; });
    await p.screenshot({ path: SORTIE + '/tableau-bord-impression.png', fullPage: true });
    /* retours du 08/10 (2) : pas de zone vide (une carte vide n'a plus 300 px de hauteur minimale sur papier) */
    const vides = await p.evaluate(() => { const ecran = {}; document.querySelectorAll('.tb:not(#tb-impression .tb) [data-carte]').forEach((c) => { ecran[c.getAttribute('data-carte')] = c.getBoundingClientRect().height; });
      return [...document.querySelectorAll('#tb-impression [data-carte]')].filter((c) => /Aucun/.test(c.textContent) && !c.querySelector('svg, table'))
        .map((c) => ({ id: c.getAttribute('data-carte'), corps: c.querySelector('.tb-c').getBoundingClientRect().height / Number(document.querySelector('#tb-impression .tb').style.zoom || 1),
          minimum: getComputedStyle(c.querySelector('.tb-c')).minHeight })); });
    ok('Impression : cartes vides compactes (plus de hauteur minimale de 300 px), donc moins de pages', vides.length >= 1 && vides.every((v) => v.corps < 260 && v.minimum === '0px') && vides.some((v) => v.corps < 120), JSON.stringify(vides));

    const ids = Object.keys(ecran.out);
    const ecarts = ids.filter((id) => !papier.out[id] || Math.abs(papier.out[id].x - ecran.out[id].x) > 0.01 || Math.abs(papier.out[id].w - ecran.out[id].w) > 0.01);
    ok('Mêmes tuiles et cartes à l\'impression qu\'à l\'écran (' + ids.length + ')', ids.length >= 8 && ids.every((id) => papier.out[id]) && Object.keys(papier.out).length === ids.length,
      ids.length + ' / ' + Object.keys(papier.out).length);
    ok('Même disposition : position et largeur relatives identiques à 1 % près (cartes côte à côte comme à l\'écran)', ecarts.length === 0,
      ecarts.map((id) => id + ' ' + JSON.stringify(ecran.out[id]) + ' -> ' + JSON.stringify(papier.out[id])).join(' | '));
    const ordre = (m) => ids.slice().sort((a, c) => (m.out[a].y - m.out[c].y) || (m.out[a].x - m.out[c].x)).join(',');
    ok('Même ordre de lecture (lignes puis colonnes)', ordre(ecran) === ordre(papier), ordre(ecran) + ' / ' + ordre(papier));
    ok('Même contenu : graphiques, interrupteurs (choix « famille » compris), valeurs des listes', etatPapier.svg === etatEcran.svg
      && JSON.stringify(etatPapier.segs) === JSON.stringify(etatEcran.segs) && etatPapier.segs.some((x) => /famille/i.test(x))
      && JSON.stringify(etatPapier.selects) === JSON.stringify(etatEcran.selects), JSON.stringify({ etatEcran, etatPapier }));
    ok('Boutons d\'action non imprimés, « Imprimé le » présent', etatPapier.boutons === 0 && etatPapier.imprimeLe, JSON.stringify(etatPapier));
    ok('La copie tient dans la largeur d\'une page A4 paysage (1062 px utiles)', etatPapier.largeurRendue <= 1062 + 1 && etatPapier.zoom > 0.5, JSON.stringify(etatPapier));
    const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true, path: SORTIE + '/tableau-bord.pdf' });
    const boite = /\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)/.exec(pdf.toString('latin1'));
    ok('PDF produit en paysage', boite && Number(boite[1]) > Number(boite[2]), boite ? boite[1] + ' x ' + boite[2] : 'MediaBox ?');
    await p.emulateMedia({ media: 'screen' });
    await p.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    const apres = await p.evaluate(() => ({ zone: !!document.getElementById('tb-impression'), page: !!document.getElementById('tb-page-paysage'), classe: document.documentElement.classList.contains('tb-imprime') }));
    ok('Après l\'impression : écran normal, mise en page paysage retirée', !apres.zone && !apres.page && !apres.classe, JSON.stringify(apres));
    /* l'ecran lui-meme n'a pas ete modifie par la copie */
    const ecran2 = await p.evaluate(mesurer, '.tb');
    const xw = (m) => JSON.stringify(Object.keys(m.out).map((k) => [k, m.out[k].x.toFixed(4), m.out[k].w.toFixed(4)]));
    ok('L\'écran n\'est pas modifié par l\'impression (mêmes cartes, positions et largeurs)', xw(ecran2) === xw(ecran), xw(ecran2));
    await p.click('[data-seg="empl"] [data-v="emplacement"]').catch(() => {});
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
