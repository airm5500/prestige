/* FICHE ARTICLE : la monographie n'est plus lancee a l'ouverture, seulement a la demande (demande du 12/11).
 *
 * « sur la fiche article, la monographie sur la fiche detail au clic ne doit plus etre lancee automatiquement ce sera a
 * la demande parce que le clic sur la modification et detail article prend du temps ».
 *
 * Avant : a l'ouverture du detail, le panneau affichait « Chargement… », demandait l'etat du service, dessinait la
 * rangee des rubriques puis recalculait la mise en page de toute la fenetre (deux fois). La fiche, elle, n'etait deja
 * demandee qu'au clic (31/10).
 * Apres : a l'ouverture, seul le bouton « Afficher la monographie » ; ni « Chargement… », ni rubriques, ni recalcul, ni
 * fiche. Au clic : la posologie est demandee une fois et affichee, les rubriques apparaissent.
 *
 * Vrai chemin : liste des articles, recherche par CIP (touche Entree), icone « Détail sur l'article » (ou menu
 * « Autres actions »), puis « Modifier ». Le site des monographies est simule dans le navigateur ; le service est mis
 * en marche le temps du test sur la base d'essai, puis remis comme avant.
 * Jeu varie : article tres vendu, articles tires au hasard (graine fixe), jamais vendu.
 * Controles : ouverture (rien de lance), clic (fiche = reponse du service, paragraphe par paragraphe : rapprochement),
 * autre rubrique, « Modifier » sans monographie, service coupe = section masquee, aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const un = (s) => (q(s).split('\n')[0] || '').split('\t');

const articles = [];
const ajouter = (l, quoi) => { if (l[0] && l[1] && !articles.some((a) => a.id === l[0])) { articles.push({ id: l[0], cip: l[1], quoi }); } };
ajouter(un("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f JOIN t_preenregistrement_detail d ON d.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{6,8}$' AND d.dt_CREATED > NOW() - INTERVAL 90 DAY GROUP BY f.lg_FAMILLE_ID ORDER BY COUNT(*) DESC LIMIT 1"), 'très vendu');
q("SELECT lg_FAMILLE_ID, int_CIP FROM t_famille WHERE str_STATUT = 'enable' AND int_CIP REGEXP '^[0-9]{6,8}$' ORDER BY CRC32(CONCAT(lg_FAMILLE_ID, '20261112')) LIMIT 2")
  .split('\n').forEach((l) => ajouter(l.split('\t'), 'au hasard'));
ajouter(un("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{6,8}$' AND NOT EXISTS"
  + " (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID) ORDER BY CRC32(f.lg_FAMILLE_ID) LIMIT 1"), 'jamais vendu');

/* reponse simulee du service : contenu different par article et par rubrique */
const fiche = (id, rub) => ({ success: true, trouve: true, lueLe: Date.now(), fiche: { titre: 'ESSAI ' + id.slice(-6), rubrique: rub, libelleRubrique: 'Rubrique ' + rub,
  paragraphes: Array.from({ length: 2 + (rub % 3) }, (x, i) => 'Paragraphe ' + (i + 1) + ' de la rubrique ' + rub + ' pour ' + id.slice(-6) + '.') } });
const ACTIF = 'KEY_MONOGRAPHIE_ACTIF';
const actifAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + ACTIF + "'");
const poser = (v) => q("UPDATE t_parameters SET str_VALUE = '" + v + "' WHERE str_KEY = '" + ACTIF + "'");

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], appels = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('request', (r) => { const m = /\/api\/v1\/monographie\/(etat|fiche\/([^?]+))/.exec(r.url()); if (m) { appels.push({ quoi: m[1].replace(/\/.*/, ''), id: m[2] ? decodeURIComponent(m[2]) : null, rub: +(new URL(r.url()).searchParams.get('rubrique') || 0) }); } });
  await p.route(/\/api\/v1\/monographie\/fiche\//, (r) => { const u = new URL(r.request().url()); const id = decodeURIComponent(u.pathname.split('/').pop());
    r.fulfill({ contentType: 'application/json', body: JSON.stringify(fiche(id, +(u.searchParams.get('rubrique') || 1))) }); });
  const ligne = (cip) => p.locator('.x-grid-row').filter({ visible: true, hasText: cip }).first();
  const action = async (cip, texte) => {
    const l = ligne(cip);
    const icone = l.locator('img[data-qtip="' + texte + '"]');
    if (await icone.count() > 0) { await icone.first().click(); return; }
    await l.locator('.fa-action-plus').last().click();
    await p.locator('.x-menu-item').filter({ visible: true, hasText: texte }).first().click();
  };
  const rechercher = async (a) => {
    const champ = '#' + await p.evaluate(() => Ext.getCmp('rechecher').inputEl.dom.id);
    await p.click(champ);
    await p.fill(champ, a.cip);
    await p.keyboard.press('Enter');
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', id) >= 0; }, a.id, { timeout: 60000 });
    await ligne(a.cip).waitFor({ timeout: 30000 });
  };
  const fermer = () => p.evaluate(() => { const w = Ext.WindowManager.getActive(); if (w && !w.isXType('famillemanager') && w.close) { w.close(); } });
  try {
    ok('Jeu d\'essai : ' + articles.length + ' articles variés', articles.length >= 3, articles.map((a) => a.quoi).join(', '));
    poser('1');
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    /* espions : recalculs de mise en page demandes par le panneau, « Chargement… » affiche a un moment quelconque */
    await p.evaluate(() => new Promise((ok) => Ext.require('testextjs.view.configmanagement.famille.MonographiePanel', ok)));
    await p.evaluate(() => {
      const P = testextjs.view.configmanagement.famille.MonographiePanel.prototype, aj = P.ajuster;
      window.__ajuste = 0; window.__chargementVu = 0;
      P.ajuster = function () { window.__ajuste++; return aj.apply(this, arguments); };
      new MutationObserver(() => { if (Array.prototype.some.call(document.querySelectorAll('.mono-panel .mono-vide'), (x) => /Chargement/.test(x.textContent))) { window.__chargementVu++; } })
        .observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 30000 });

    for (const a of articles) {
      await rechercher(a);
      appels.length = 0;
      await p.evaluate(() => { window.__ajuste = 0; window.__chargementVu = 0; });
      await action(a.cip, 'Détail sur l\'article');
      await p.waitForFunction(() => { const c = Ext.getCmp('str_DESCRIPTION'); return c && c.isVisible(true) && c.getValue(); }, null, { timeout: 60000 });
      await p.waitForSelector('.mono-panel .mono-afficher', { timeout: 30000 });
      await p.waitForTimeout(2500);
      const o = await p.evaluate(() => { const d = Ext.ComponentQuery.query('#monographieDetail')[0].getEl().dom;
        return { rubriques: d.querySelectorAll('.mono-rub[data-rub]').length, bouton: (d.querySelector('.mono-afficher') || {}).textContent || null,
          chargement: window.__chargementVu, ajuste: window.__ajuste, section: !Ext.ComponentQuery.query('#monographieSection')[0].isHidden() }; });
      ok('Ouverture du détail, ' + a.quoi + ' (' + a.cip + ') : aucune fiche demandée', !appels.some((x) => x.quoi === 'fiche'), JSON.stringify(appels));
      ok('Ouverture, ' + a.quoi + ' : seul le bouton « Afficher la monographie », ni rubriques, ni « Chargement… », ni recalcul de la fenêtre',
        o.section && o.bouton === 'Afficher la monographie' && o.rubriques === 0 && o.chargement === 0 && o.ajuste === 0, JSON.stringify(o));

      /* clic : posologie demandee une fois, affichee telle que le service l'a rendue (rapprochement) */
      await p.click('.mono-panel .mono-afficher');
      await p.waitForFunction(() => document.querySelector('.mono-panel .mono-titre'), null, { timeout: 15000 });
      const attendu = fiche(a.id, 1).fiche;
      const v = await p.evaluate(() => { const d = Ext.ComponentQuery.query('#monographieDetail')[0].getEl().dom;
        return { titre: d.querySelector('.mono-titre').firstChild.textContent, p: [...d.querySelectorAll('.mono-corps p')].map((x) => x.textContent),
          rubriques: d.querySelectorAll('.mono-rub[data-rub]').length, actif: (d.querySelector('.mono-rub.actif') || {}).textContent || null }; });
      const fiches = appels.filter((x) => x.quoi === 'fiche');
      ok('Clic, ' + a.quoi + ' : posologie demandée une fois, pour cet article', fiches.length === 1 && fiches[0].id === a.id && fiches[0].rub === 1, JSON.stringify(fiches));
      ok('Rapprochement, ' + a.quoi + ' : titre et paragraphes affichés = réponse du service, un par un (' + attendu.paragraphes.length + ')',
        v.titre === attendu.titre && JSON.stringify(v.p) === JSON.stringify(attendu.paragraphes), JSON.stringify(v.p));
      ok('Clic, ' + a.quoi + ' : les rubriques apparaissent, la première est active', v.rubriques > 1 && !!v.actif, JSON.stringify({ n: v.rubriques, actif: v.actif }));
      /* une autre rubrique a texte (la 3, interactions, a sa propre presentation) */
      const r2 = await p.evaluate(() => [...document.querySelectorAll('.mono-panel .mono-rub[data-rub]')].map((x) => +x.getAttribute('data-rub')).filter((n) => n !== 1 && n !== 3)[0]);
      await p.click('.mono-panel .mono-rub[data-rub="' + r2 + '"]');
      await p.waitForFunction((n) => new RegExp('rubrique ' + n + ' ').test(document.querySelector('.mono-panel .mono-corps').textContent), r2, { timeout: 15000 });
      const p2 = await p.evaluate(() => [...document.querySelectorAll('.mono-panel .mono-corps p')].map((x) => x.textContent));
      ok('Autre rubrique (' + r2 + '), ' + a.quoi + ' : chargée à son tour, affichée telle que rendue', appels.filter((x) => x.quoi === 'fiche').map((x) => x.rub).join() === '1,' + r2
        && JSON.stringify(p2) === JSON.stringify(fiche(a.id, r2).fiche.paragraphes), JSON.stringify(p2));
      await fermer();
      await p.waitForTimeout(400);

      appels.length = 0;
      await action(a.cip, 'Modifier');
      await p.waitForFunction(() => { const w = Ext.WindowManager.getActive(); return w && w.isVisible() && /Modification Article/.test(w.title || ''); }, null, { timeout: 60000 });
      await p.waitForTimeout(1500);
      ok('« Modifier », ' + a.quoi + ' : aucune monographie demandée', appels.length === 0, JSON.stringify(appels));
      await fermer();
      await p.waitForTimeout(400);
    }

    /* service coupe : la section disparait, rien n'est demande au site */
    poser('0');
    await rechercher(articles[0]);
    appels.length = 0;
    await action(articles[0].cip, 'Détail sur l\'article');
    await p.waitForFunction(() => { const c = Ext.getCmp('str_DESCRIPTION'); return c && c.isVisible(true) && c.getValue(); }, null, { timeout: 60000 });
    await p.waitForTimeout(2500);
    ok('Service coupé : section MONOGRAPHIE masquée, aucune fiche demandée', await p.evaluate(() => Ext.ComponentQuery.query('#monographieSection')[0].isHidden())
      && !appels.some((x) => x.quoi === 'fiche'), JSON.stringify(appels));
    await fermer();
    ok('Aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    poser(actifAvant);
    ok('Paramètre du service remis comme avant (' + actifAvant + ')', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + ACTIF + "'") === actifAvant);
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
