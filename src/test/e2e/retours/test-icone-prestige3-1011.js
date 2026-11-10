/* PLAN DU 09/11, POINT 16 : ICONE PRESTIGE 3 (« P » blanc et vert d'eau sur fond violet, pastille doree « 3 »).
 *
 * Par les vues, avec de vrais clics. Ce que le test etablit, pour chaque endroit ou l'icone apparait :
 *  - onglet du navigateur : la page de connexion, l'application et l'espace produit declarent favicon.ico et
 *    favicon.png en version 3 (les navigateurs ne gardent pas l'ancienne) ;
 *  - favicon.ico porte les sept tailles (16, 24, 32, 48, 64, 128, 256) ; chaque PNG icone-prestige-N est la taille N
 *    du fichier .ico (meme taille, meme icone), et favicon.png est icone-prestige-256.png pixel pour pixel ;
 *  - l'icone est la nouvelle : fond violet sous le « P » (repere a mi-largeur, aux 78 % de la hauteur) ;
 *  - page de connexion : le logo affiche est la nouvelle icone ;
 *  - bandeau de l'application : l'icone remplace la croix ; un clic ramene toujours au menu principal ;
 *  - « A propos » (menu des options) : la nouvelle icone et « PRESTIGE 3 » ;
 *  - aucune erreur JavaScript. Rien n'est ecrit en base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { BASE, connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const TAILLES = [16, 24, 32, 48, 64, 128, 256];

/* lecture d'une image dans la page : pixels RGBA, a sa taille naturelle */
const pixels = (p, url) => p.evaluate(async (u) => {
  const img = new Image();
  img.src = u;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  return { l: c.width, h: c.height, d: Array.from(g.getImageData(0, 0, c.width, c.height).data) };
}, url);
const violet = (im) => {
  const x = Math.floor(im.l / 2), y = Math.floor(im.h * 0.78), i = (y * im.l + x) * 4;
  const [r, v, b, a] = im.d.slice(i, i + 4);
  return { ok: a > 200 && b > 120 && r < 90 && v < 70, rvba: [r, v, b, a] };
};
/* tailles d'un fichier .ico, lues dans son repertoire d'entete */
const taillesIco = (buf) => {
  const n = buf.readUInt16LE(4), t = [];
  for (let i = 0; i < n; i++) { const w = buf[6 + i * 16]; t.push(w === 0 ? 256 : w); }
  return t.sort((a, b) => a - b);
};

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    /* 1. page de connexion */
    await p.goto(BASE + '/security/index.html', { waitUntil: 'load' });
    const liensConnexion = await p.evaluate(() => Array.from(document.querySelectorAll('link[rel=icon]')).map((l) => l.getAttribute('href')));
    ok('Connexion : favicon.ico et favicon.png déclarés en version 3', liensConnexion.length === 2 && liensConnexion.every((h) => /favicon\.(ico|png)\?v=3$/.test(h)), liensConnexion);
    const logo = await p.evaluate(() => { const i = document.querySelector('.pl-brand__mark--icone img'); return i && { src: i.src, l: i.naturalWidth, vue: i.getBoundingClientRect().width }; });
    ok('Connexion : logo chargé et visible', logo && logo.l > 0 && logo.vue > 0, JSON.stringify(logo));
    const vLogo = violet(await pixels(p, logo.src));
    ok('Connexion : le logo est la nouvelle icône (fond violet)', vLogo.ok, vLogo.rvba);

    /* 2. fichier .ico et PNG : memes images, taille par taille */
    const ico = await p.request.get(BASE + '/resources/images/favicon.ico?v=3');
    const buf = await ico.body();
    ok('favicon.ico : sept tailles, de 16 à 256', ico.ok() && JSON.stringify(taillesIco(buf)) === JSON.stringify(TAILLES), taillesIco(buf));
    const vIco = violet(await pixels(p, BASE + '/resources/images/favicon.png?v=3'));
    ok('favicon.png : nouvelle icône (fond violet), 256 px', vIco.ok, vIco.rvba);
    const ecarts = [];
    for (const t of TAILLES) {
      const png = await pixels(p, BASE + '/resources/images/icone-prestige/icone-prestige-' + t + '.png?v=3');
      if (png.l !== t || png.h !== t) { ecarts.push(t + ' : ' + png.l + 'x' + png.h); continue; }
      if (t >= 32 && !violet(png).ok) { ecarts.push(t + ' : pas violet ' + violet(png).rvba); }
    }
    ok('PNG 16 à 256 : bonne taille, nouvelle icône', ecarts.length === 0, ecarts.join(' | '));
    const fav = await pixels(p, BASE + '/resources/images/favicon.png?v=3');
    const png256 = await pixels(p, BASE + '/resources/images/icone-prestige/icone-prestige-256.png?v=3');
    ok('favicon.png = icone-prestige-256.png, pixel pour pixel', fav.l === 256 && JSON.stringify(fav.d) === JSON.stringify(png256.d));

    /* 3. application : onglet et bandeau */
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const liensAppli = await p.evaluate(() => Array.from(document.querySelectorAll('link[rel=icon]')).map((l) => l.getAttribute('href')));
    ok('Application : favicon.ico et favicon.png en version 3', liensAppli.length === 2 && liensAppli.every((h) => /favicon\.(ico|png)\?v=3$/.test(h)), liensAppli);
    const bandeau = await p.evaluate(() => { const i = document.querySelector('#app-header-title .hdr-brand-ico img'); const r = i && i.getBoundingClientRect();
      return i && { src: i.src, l: i.naturalWidth, vue: r.width, haut: r.height, croix: !!document.querySelector('#app-header-title .hdr-brand-ico .fa-plus') }; });
    ok('Bandeau : icône chargée, visible, à la place de la croix', bandeau && bandeau.l > 0 && bandeau.vue >= 28 && bandeau.haut >= 28 && !bandeau.croix, JSON.stringify(bandeau));
    const vBandeau = bandeau && violet(await pixels(p, bandeau.src));
    ok('Bandeau : la nouvelle icône (fond violet)', vBandeau && vBandeau.ok, vBandeau && vBandeau.rvba);

    /* 4. « A propos » par le menu des options */
    /* le bouton qui porte le menu des options (celui qui contient « A propos ») */
    const ouvreur = await p.evaluate(() => { const btn = Ext.ComponentQuery.query('button').find((x) => x.menu && x.menu.items
      && x.menu.items.findIndexBy((m) => /A propos/.test(m.text || '')) >= 0); return btn ? btn.getId() : null; });
    await p.locator('#' + ouvreur).click();
    await p.locator('.x-menu-item').filter({ hasText: 'A propos' }).filter({ visible: true }).first().click();
    await p.locator('#aboutmanagerID').waitFor({ state: 'visible', timeout: 20000 });
    await p.waitForTimeout(800);
    const apropos = await p.evaluate(() => { const w = document.getElementById('aboutmanagerID'); const i = w.querySelector('img.about-icone');
      return { texte: w.innerText, img: i && { src: i.src, l: i.naturalWidth, vue: i.getBoundingClientRect().width } }; });
    ok('À propos : icône chargée et « PRESTIGE 3 »', apropos.img && apropos.img.l > 0 && apropos.img.vue > 0 && /PRESTIGE 3/.test(apropos.texte), JSON.stringify(apropos).slice(0, 250));
    const vApropos = apropos.img && violet(await pixels(p, apropos.img.src));
    ok('À propos : la nouvelle icône (fond violet)', vApropos && vApropos.ok, vApropos && vApropos.rvba);
    const coupe = await p.evaluate(() => { const w = Ext.getCmp('aboutmanagerID'); const c = w.body.dom; return c.scrollHeight - c.clientHeight; });
    ok('À propos : tout le contenu tient dans la fenêtre', coupe <= 1, coupe);
    await p.evaluate(() => Ext.getCmp('aboutmanagerID').close());

    /* 5. le clic sur l'icone du bandeau ramene au menu principal (comme avant) */
    const avant = await p.evaluate(() => typeof window.loadMainMenu === 'function');
    await p.locator('#app-header-title .hdr-brand').click();
    await p.waitForTimeout(1500);
    ok('Bandeau : le clic ramène au menu principal, sans erreur', avant && erreurs.length === 0, erreurs.join(' | '));

    /* 6. espace produit */
    await p.goto(BASE + '/security/espace-produit.html', { waitUntil: 'domcontentloaded' });
    const liensEspace = await p.evaluate(() => Array.from(document.querySelectorAll('link[rel=icon]')).map((l) => l.getAttribute('href')));
    ok('Espace produit : favicon en version 3', liensEspace.length >= 1 && liensEspace.every((h) => /\?v=3$/.test(h)), liensEspace);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
