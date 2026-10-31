/* DETAIL SUR L'ARTICLE (retour du 31/10, point 4) — lecture seule.
 *  1. petit ecran (1100 x 700) : le nom de l'article ne chevauche plus « Péremption proche » ;
 *  2. grilles « consommations (sorties) » et « commandes reçues » : au moins 10 lignes visibles ;
 *  3. monographie : en bas de la page, un clic sur une rubrique ne fait plus remonter la page.
 * Le site des monographies est simule dans le navigateur (fiche longue puis fiche courte, reponse differee) : le
 * serveur et le site ne sont pas appeles pour la fiche.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
/* article au nom long, avec un lot en stock (pour « Péremption proche ») */
const [P, CIP] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f JOIN t_lot l ON l.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " WHERE f.str_STATUT = 'enable' AND f.int_CIP IS NOT NULL AND f.int_CIP <> '' AND CHAR_LENGTH(f.str_NAME) >= 22"
  + " AND l.dt_PEREMPTION IS NOT NULL AND l.current_stock > 0 ORDER BY CHAR_LENGTH(f.str_NAME) DESC LIMIT 1").split('\t');
const fiche = (n) => JSON.stringify({ success: true, trouve: true, lueLe: Date.now(), fiche: { titre: 'ESSAI', rubrique: 6, libelleRubrique: 'Rubrique',
  paragraphes: Array.from({ length: n }, (x, i) => 'Paragraphe d\'essai numéro ' + (i + 1) + ' : texte de la monographie simulée.') } });

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1100, height: 700 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  let longue = true;
  await p.route(/\/api\/v1\/monographie\/fiche\//, async (r) => { const corps = fiche(longue ? 12 : 3); await new Promise((x) => setTimeout(x, 600));
    r.fulfill({ contentType: 'application/json', body: corps }); });
  try {
    ok('Précondition : un article au nom long avec un lot en stock', P, CIP);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 30000 });
    await p.evaluate((cip) => { Ext.getCmp('rechecher').setValue(cip); Ext.ComponentQuery.query('famillemanager')[0].onRechClick(); }, CIP);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', id) >= 0; }, P, { timeout: 60000 });
    await p.evaluate((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onDetailClick(g, g.getStore().findExact('lg_FAMILLE_ID', id)); }, P);
    await p.waitForFunction(() => { const c = Ext.getCmp('peremption_proche_detail'); return c && c.isVisible(); }, null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1500);

    const h = await p.evaluate(() => { const r = (id) => Ext.getCmp(id).getEl().dom.getBoundingClientRect();
      const n = r('str_DESCRIPTION'), e = Ext.getCmp('peremption_proche_detail'), pr = e.isVisible() ? r('peremption_proche_detail') : null;
      const sep = !pr || n.right <= pr.left + 1 || pr.top >= n.bottom - 1 || n.top >= pr.bottom - 1;
      return { sep, nom: Math.round(n.width), peremption: !!pr }; });
    ok('Petit écran : « Péremption proche » affichée', h.peremption, JSON.stringify(h));
    ok('Petit écran : le nom ne chevauche pas « Péremption proche » et garde sa largeur', h.sep && h.nom >= 200, JSON.stringify(h));

    const g = await p.evaluate(() => ['gridpanelDetailID', 'gridpanelOrderID'].map((id) => { const c = Ext.getCmp(id);
      if (!c || !c.isVisible(true)) { return { id, visible: false }; }
      const ligne = c.getView().getEl().dom.querySelector('.x-grid-row'), hl = ligne ? ligne.getBoundingClientRect().height : 24;
      return { id, visible: true, lignes: Math.floor(c.getView().getEl().dom.clientHeight / hl) }; }));
    ok('« Consommations (sorties) » : au moins 10 lignes visibles', g[0].visible && g[0].lignes >= 10, JSON.stringify(g[0]));
    ok('« Commandes reçues » : au moins 10 lignes visibles (si affichée)', !g[1].visible || g[1].lignes >= 10, JSON.stringify(g[1]));

    /* monographie : fiche de 12 paragraphes, defilement tout en bas, clic sur une autre rubrique (fiche courte) */
    const mono = await p.waitForFunction(() => { const m = Ext.ComponentQuery.query('#monographieDetail')[0];
      return m && m.isVisible(true) && m.getEl().dom.querySelectorAll('.mono-corps p').length >= 12; }, null, { timeout: 30000 }).then(() => true).catch(() => false);
    ok('Monographie affichée (fiche simulée)', mono);
    if (mono) {
      const defil = () => p.evaluate(() => { const f = Ext.ComponentQuery.query('#monographieDetail')[0].up('[autoScroll=true]') || Ext.ComponentQuery.query('#monographieDetail')[0].up('form');
        const d = (f.body || f.getEl()).dom; return { haut: Math.round(d.scrollTop), max: d.scrollHeight - d.clientHeight }; });
      await p.evaluate(() => { const f = Ext.ComponentQuery.query('#monographieDetail')[0].up('[autoScroll=true]') || Ext.ComponentQuery.query('#monographieDetail')[0].up('form');
        const d = (f.body || f.getEl()).dom; d.scrollTop = d.scrollHeight; });
      await p.waitForTimeout(500);
      const avant = await defil();
      longue = false;
      const bt = await p.evaluate(() => { const b = [...Ext.ComponentQuery.query('#monographieDetail')[0].getEl().dom.querySelectorAll('.mono-rub')].find((x) => !x.classList.contains('actif'));
        b.setAttribute('data-e2e', 'rub'); return b.textContent; });
      /* comme l'utilisateur : le bouton est visible en bas de page (sinon Playwright le ramenerait lui-meme au centre) */
      const visible = await p.evaluate(() => { const f = Ext.ComponentQuery.query('#monographieDetail')[0].up('[autoScroll=true]') || Ext.ComponentQuery.query('#monographieDetail')[0].up('form');
        const z = (f.body || f.getEl()).dom.getBoundingClientRect(), r = document.querySelector('[data-e2e=rub]').getBoundingClientRect();
        return r.top >= z.top && r.bottom <= z.bottom; });
      ok('Monographie : en bas de page, les rubriques sont visibles', visible);
      await p.click('[data-e2e=rub]');
      await p.waitForTimeout(150);
      const pendant = await defil();
      await p.waitForFunction(() => Ext.ComponentQuery.query('#monographieDetail')[0].getEl().dom.querySelectorAll('.mono-corps p').length === 3, null, { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(500);
      const apres = await defil();
      ok('Monographie : clic sur « ' + bt + ' » en bas de page, la page ne remonte pas', Math.abs(pendant.haut - avant.haut) <= 5 && Math.abs(apres.haut - avant.haut) <= 5,
        JSON.stringify({ avant, pendant, apres }));
    }
    ok('Aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
