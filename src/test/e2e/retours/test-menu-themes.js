/* THEMES DU MENU A, C, D (demande du 24/10) : le menu actuel reste par defaut, A, C et D au choix de l'utilisateur.
 *
 * Par les vues (admin), preference « menu-navigation » de l'admin retiree au debut et remise a la fin :
 *  - sans choix : le menu actuel, inchange (volet replie, ouverture d'un ecran par l'arbre et le volet flottant) ;
 *  - Options > Affichage du menu : 4 choix, « Menu actuel » coche ; clic sur « D » -> page rechargee en theme D ;
 *  - D : rail + arbre ; memes modules et memes entrees que le menu actuel (memes droits) ; filtre ; un seul module
 *    ouvert a la fois ; ouverture d'un ecran ; recents ; favori garde dans les preferences ; recherche Ctrl K ; menu
 *    replie : le rail ouvre le volet du module, une entree ouvre l'ecran ;
 *  - A : panneau des modules, volet, ouverture d'un ecran ; C : arbre filtrable, ouverture d'un ecran ;
 *  - retour au « Menu actuel » : menu actuel de nouveau, il ouvre toujours les ecrans ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const PREF = () => q(`SELECT IFNULL((SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = 'menu-navigation'), '')`);

(async () => {
  const avant = PREF();
  q(`DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = 'menu-navigation'`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const visibleEcran = (x) => p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), x, { timeout: 60000 }).then(() => true).catch(() => false);
  const attendreTheme = (t) => p.waitForFunction((t) => { const m = document.querySelector('.mp'); return m && m.classList.contains('mp-' + t) && m.querySelector('.mp-rb, .mp-mod, .mp-modn'); }, t, { timeout: 120000 });
  const choisirTheme = async (libelle) => {
    await p.click('#commonsettingapp');
    await p.waitForTimeout(400);
    let m = p.locator('.x-menu-item').filter({ hasText: 'Affichage du menu' }).filter({ visible: true }).first();
    if (await m.count() === 0) { await p.click('#commonsettingapp-btnWrap, #commonsettingapp .x-btn-split', { force: true }).catch(() => {}); await p.waitForTimeout(400);
      m = p.locator('.x-menu-item').filter({ hasText: 'Affichage du menu' }).filter({ visible: true }).first(); }
    await m.hover(); await p.waitForTimeout(500);
    const etat = await p.evaluate(() => Ext.ComponentQuery.query('#choixThemeMenu menucheckitem').map((i) => (i.checked ? '[x] ' : '[ ] ') + i.text));
    const nav = p.waitForNavigation({ timeout: 60000 }).catch(() => null);
    await p.locator('.x-menu-item').filter({ hasText: libelle }).filter({ visible: true }).first().click();
    await nav;
    await connexionApresRechargement();
    return etat;
  };
  /* menu actuel de la page affichee (store du composant navigation, meme apres changement de theme) */
  const menuDeLaPage = () => p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode(), mods = [];
    r.eachChild((m) => { let n = 0; m.eachChild((x) => { if (x.isLeaf()) { n++; } }); if (n) { mods.push([m.get('text'), n]); } }); return mods; });
  /* deux modules ont la meme priorite en base (12) : leur ordre peut changer d'un chargement a l'autre, dans le menu
     actuel aussi ; la comparaison entre deux chargements se fait sans l'ordre */
  const sansOrdre = (l) => JSON.stringify(l.map((x) => x.join('#')).sort());
  const connexionApresRechargement = async () => {
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation')[0]
      && Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().childNodes.length > 0, null, { timeout: 240000 });
    await p.waitForTimeout(1500);
  };
  try {
    await connexion(p, 'admin', 'e2etest');
    /* reference : menu de l'admin (store du menu actuel, menus masques retires) */
    const ref = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode(), mods = [];
      r.eachChild((m) => { const e = []; m.eachChild((n) => { if (n.isLeaf()) { e.push(n.get('id')); } }); if (e.length) { mods.push({ nom: m.get('text'), n: e.length, ids: e }); } }); return mods; });
    const total = ref.reduce((s, m) => s + m.n, 0);
    const sansTheme = await p.evaluate(() => ({ nav: Ext.ComponentQuery.query('navigation')[0].isVisible(true) || !!Ext.ComponentQuery.query('navigation')[0].placeholder, mp: !!document.querySelector('.mp-hote') }));
    ok('Sans choix : le menu actuel, aucun nouveau menu', sansTheme.nav && !sansTheme.mp, JSON.stringify(sansTheme));
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    ok('Menu actuel : « Ventes » s\'ouvre par l\'arbre et le volet flottant', await visibleEcran('cloturerventemanager'));

    /* --- D */
    const etat = await choisirTheme('D : rail et arbre');
    ok('Options > Affichage du menu : 4 choix, « Menu actuel » coché', etat.length === 4 && /^\[x\] Menu actuel/.test(etat[0]) && etat.slice(1).every((x) => x.startsWith('[ ]')), etat.join(' | '));
    await attendreTheme('D');
    const d = await p.evaluate(() => ({ navVisible: Ext.ComponentQuery.query('navigation')[0].isVisible(), rail: document.querySelectorAll('.mp-rail [data-rail]').length,
      mods: Array.from(document.querySelectorAll('.mp-corps .mp-mod')).map((m) => [m.querySelector('.mp-lib').textContent, Number(m.querySelector('.mp-n').textContent)]) }));
    ok('Thème D après rechargement : rail + arbre, menu actuel caché', !d.navVisible && d.rail === ref.length, JSON.stringify({ navVisible: d.navVisible, rail: d.rail, attendu: ref.length }));
    const pageD = await menuDeLaPage();
    ok('Mêmes modules, même ordre et même nombre d\'écrans que le menu actuel (mêmes droits)', JSON.stringify(d.mods) === JSON.stringify(pageD)
      && sansOrdre(d.mods) === sansOrdre(ref.map((m) => [m.nom, m.n])), JSON.stringify(d.mods).slice(-150) + ' // ' + JSON.stringify(pageD).slice(-150));
    await p.fill('.mp-filtre input', 'périm');
    await p.waitForTimeout(300);
    const filtre = await p.evaluate(() => Array.from(document.querySelectorAll('.mp-corps .mp-ent')).map((e) => e.textContent.trim()));
    const attenduFiltre = await p.evaluate(() => { const l = []; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { if (n.isLeaf() && /périm/i.test(n.get('text'))) { l.push(n.get('text')); } }); return l; });
    ok('Filtre « périm » : exactement les écrans dont le nom le contient', filtre.length === attenduFiltre.length && filtre.length > 0 && filtre.every((t) => /périm/i.test(t)), filtre.join(' ; '));
    await p.fill('.mp-filtre input', '');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    const sc = await p.evaluate(() => Array.from(document.querySelectorAll('.mp-corps .mp-mod')).findIndex((m) => /SERVICE CLIENT/i.test(m.textContent)));
    await p.locator('.mp-corps .mp-mod').nth(sc).click();
    await p.waitForTimeout(300);
    let ouverts = await p.evaluate(() => Array.from(document.querySelectorAll('.mp-corps .mp-mod.ouvert')).map((m) => m.querySelector('.mp-lib').textContent));
    await p.locator('.mp-corps .mp-mod').nth(sc === 0 ? 1 : 0).click();
    await p.waitForTimeout(300);
    const ouverts2 = await p.evaluate(() => Array.from(document.querySelectorAll('.mp-corps .mp-mod.ouvert')).map((m) => m.querySelector('.mp-lib').textContent));
    ok('Un seul module ouvert : déplier un module replie celui qui était ouvert', ouverts.length === 1 && /SERVICE CLIENT/i.test(ouverts[0]) && ouverts2.length === 1 && ouverts2[0] !== ouverts[0], ouverts.concat(ouverts2).join(' -> '));
    await p.locator('.mp-corps .mp-mod').nth(sc).click();
    await p.waitForTimeout(300);
    await p.locator('.mp-corps .mp-sous .mp-ent').filter({ has: p.locator('.mp-lib', { hasText: /^Ventes$/ }) }).first().click();
    ok('D : clic sur « Ventes » dans l\'arbre -> l\'écran s\'ouvre', await visibleEcran('cloturerventemanager'));
    await p.waitForTimeout(800);
    const apres = await p.evaluate(() => ({ actif: (document.querySelector('.mp-corps .mp-sous .mp-ent.actif .mp-lib') || {}).textContent,
      recents: Array.from(document.querySelectorAll('.mp-corps .mp-ent.court')).map((e) => e.textContent.trim()), ici: (document.querySelector('.mp-rail .mp-rb.ici') || {}).getAttribute ? document.querySelector('.mp-rail .mp-rb.ici').getAttribute('data-bulle') : null }));
    ok('Écran actif marqué, « Ventes » dans les récents, point or sur le module dans le rail', apres.actif === 'Ventes' && apres.recents.includes('Ventes') && /SERVICE CLIENT/i.test(apres.ici || ''), JSON.stringify(apres));
    /* favori */
    const ligneFav = p.locator('.mp-corps .mp-sous .mp-ent').filter({ has: p.locator('.mp-lib', { hasText: /^Ventes$/ }) }).first();
    await ligneFav.hover();
    await ligneFav.locator('.mp-etoile').click();
    await p.waitForTimeout(1500);
    const favs = await p.evaluate(() => { const s = Array.from(document.querySelectorAll('.mp-sect')).find((x) => /Favoris/.test(x.textContent)); const l = []; let n = s && s.nextElementSibling;
      while (n && n.classList.contains('mp-ent')) { l.push(n.textContent.trim()); n = n.nextElementSibling; } return l; });
    ok('★ sur « Ventes » : en tête des favoris, gardé dans les préférences de l\'utilisateur', favs.includes('Ventes') && /"favoris":\["[^"]+"/.test(PREF()) && /"theme":"D"/.test(PREF()), favs.join(',') + ' | ' + PREF().slice(0, 160));
    /* Ctrl K */
    await p.keyboard.press('Control+k');
    await p.waitForSelector('#mp-p-saisie', { timeout: 5000 });
    await p.keyboard.type('activité des');
    await p.waitForTimeout(300);
    const premier = await p.evaluate(() => (document.querySelector('.mp-p-l.on .mp-lib') || {}).textContent);
    await p.keyboard.press('Enter');
    ok('Ctrl K « activité des » + Entrée -> « Activité des équipes » s\'ouvre', premier === 'Activité des équipes' && await visibleEcran('activiteequipes') && !(await p.$('#mp-palette')), premier);
    /* menu replie : rail -> volet */
    await p.click('.mp-rail [data-act="replier"]');
    await p.waitForTimeout(600);
    const largeur = await p.evaluate(() => document.querySelector('.mp-hote').getBoundingClientRect().width);
    const iSc = (await menuDeLaPage()).findIndex((m) => /SERVICE CLIENT/i.test(m[0]));
    await p.locator('.mp-rail [data-rail]').nth(iSc).click();
    await p.waitForSelector('#mp-volet', { timeout: 5000 });
    const volet = await p.evaluate(() => ({ titre: document.querySelector('#mp-volet h2').textContent, n: document.querySelectorAll('#mp-volet .mp-ent').length, tuile: getComputedStyle(document.querySelector('.mp-rail .mp-rb.on')).backgroundColor }));
    ok('Menu replié (60 px) : l\'icône du rail ouvre le volet du module, icône sur fond or plein', Math.round(largeur) === 60 && /SERVICE CLIENT/i.test(volet.titre) && volet.n === ref.find((m) => /SERVICE CLIENT/i.test(m.nom)).n && volet.tuile === 'rgb(242, 184, 75)', JSON.stringify({ largeur, volet }));
    await p.locator('#mp-volet .mp-ent').filter({ has: p.locator('.mp-lib', { hasText: /^Ventes$/ }) }).first().click();
    ok('Entrée du volet -> l\'écran s\'ouvre, le volet se ferme', await visibleEcran('cloturerventemanager') && !(await p.$('#mp-volet')));
    await p.click('.mp-rail [data-act="replier"]');
    await p.waitForTimeout(400);

    /* --- A */
    await choisirTheme('A : rail d\'icônes et volet');
    await attendreTheme('A');
    const a = await p.evaluate(() => Array.from(document.querySelectorAll('.mp-panneau .mp-modn')).map((m) => [m.querySelector('.mp-lib').textContent, Number(m.querySelector('.mp-n').textContent)]));
    const pageA = await menuDeLaPage();
    ok('Thème A : panneau des modules, mêmes modules, même ordre et nombres d\'écrans', JSON.stringify(a) === JSON.stringify(pageA)
      && sansOrdre(a) === sansOrdre(ref.map((m) => [m.nom, m.n])), JSON.stringify(a).slice(-150) + ' // ' + JSON.stringify(pageA).slice(-150));
    await p.locator('.mp-panneau .mp-modn').nth(pageA.findIndex((m) => /SERVICE CLIENT/i.test(m[0]))).click();
    await p.waitForSelector('#mp-volet', { timeout: 5000 });
    await p.locator('#mp-volet .mp-ent').filter({ has: p.locator('.mp-lib', { hasText: /^Ventes$/ }) }).first().click();
    ok('A : module -> volet -> « Ventes » s\'ouvre', await visibleEcran('cloturerventemanager'));

    /* --- C */
    await choisirTheme('C : arbre filtrable');
    await attendreTheme('C');
    await p.fill('.mp-filtre input', 'activité des');
    await p.waitForTimeout(300);
    await p.locator('.mp-corps .mp-ent').first().click();
    ok('Thème C : filtre puis clic -> « Activité des équipes » s\'ouvre', await visibleEcran('activiteequipes'));

    /* --- retour au menu actuel */
    await choisirTheme('Menu actuel');
    await p.waitForTimeout(1500);
    const retour = await p.evaluate(() => ({ mp: !!document.querySelector('.mp-hote'), nav: !!Ext.ComponentQuery.query('navigation')[0].placeholder }));
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    ok('Retour au « Menu actuel » : plus de nouveau menu, le menu actuel ouvre toujours « Ventes »', !retour.mp && retour.nav && await visibleEcran('cloturerventemanager'), JSON.stringify(retour));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    q(`DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = 'menu-navigation'`);
    if (avant) { q(`INSERT INTO t_preference_utilisateur (lg_USER_ID, str_CLE, txt_VALEUR, dt_UPDATED) VALUES ('${U}', 'menu-navigation', '${avant.replace(/'/g, "''")}', NOW())`); }
    ok('Préférence de l\'admin remise comme avant', PREF() === avant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
