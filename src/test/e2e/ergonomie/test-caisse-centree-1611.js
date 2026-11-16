/* RETOUR DU 16/11 : « Ouverture / clôture caisse » centre dans l'ecran, pour que le volet de navigation deplie ne le
 * cache plus.
 *
 * Defaut : le bloc (etat + ouverture + cloture) etait colle a gauche ; le volet de navigation deplie (260 px, flottant
 * au-dessus de l'ecran) recouvrait le debut du bandeau et du formulaire d'ouverture.
 *
 * Test d'apparence, par l'ecran, a 1366 x 768 (portable) puis 1920 x 1080 :
 *  - le bloc est centre dans le panneau (ecart gauche = ecart droit, a 2 px pres), sans defilement horizontal ;
 *  - ouverture a gauche, cloture a droite, cote a cote ;
 *  - volet deplie par sa barre : pour chaque point du bord gauche du bloc (bandeau, titre et champ de l'ouverture), le
 *    navigateur dit quel element est au premier plan (document.elementFromPoint) : ce doit etre l'ecran caisse, jamais
 *    le volet ; et le bord droit du volet est a gauche du bloc.
 * Lecture seule : rien n'est ecrit.
 *
 * node src/test/e2e/ergonomie/test-caisse-centree-1611.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const ECRAN = 'caisseouverturecloture';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  try {
    for (const [l, h] of [[1366, 768], [1920, 1080]]) {
      const p = await (await b.newContext({ viewport: { width: l, height: h } })).newPage();
      const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
      await p.route('**/api/v1/support/events', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue()));
      await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
      await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Ouverture / clôture caisse');
      await p.mouse.move(l - 100, h - 60); await p.mouse.click(l - 100, h - 60);
      await p.waitForFunction((e) => { const v = Ext.ComponentQuery.query(e).filter((x) => x.isVisible(true))[0];
        return v && /ferm|ouvert/.test(v.down('#ocEtat').getEl().dom.textContent); }, ECRAN, { timeout: 30000 });
      await p.waitForTimeout(800);
      const geo = await p.evaluate((e) => {
        const v = Ext.ComponentQuery.query(e).filter((x) => x.isVisible(true))[0], corps = v.body.dom.getBoundingClientRect();
        const r = (c) => c.getEl().dom.getBoundingClientRect();
        const etat = r(v.down('#ocEtat')), o = r(v.down('#ocOuverture')), c = r(v.down('#ocCloture'));
        const gauche = Math.min(etat.left, o.left), droite = Math.max(etat.right, c.right);
        return { corps: [Math.round(corps.left), Math.round(corps.right)], bloc: [Math.round(gauche), Math.round(droite)],
          ecartG: Math.round(gauche - corps.left), ecartD: Math.round(corps.right - droite), cote: o.right <= c.left + 1,
          defile: v.body.dom.scrollWidth > v.body.dom.clientWidth + 1 };
      }, ECRAN);
      ok(l + ' px : bloc centré dans l\'écran (écart gauche = écart droit à 2 px près), plus de 200 px de chaque côté',
        Math.abs(geo.ecartG - geo.ecartD) <= 2 && geo.ecartG > 200, JSON.stringify(geo));
      ok(l + ' px : ouverture à gauche, clôture à droite, sans défilement horizontal', geo.cote && !geo.defile, JSON.stringify(geo));

      /* volet deplie par sa barre */
      const ph = await p.evaluate(() => { const n = Ext.ComponentQuery.query('[title*=Navigation]')[0];
        return n && n.placeholder && n.placeholder.rendered ? n.placeholder.getEl().id : null; });
      if (ph) { await p.click('#' + ph, { position: { x: 10, y: 220 } }); }
      await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('[title*=Navigation]')[0]; return n && n.getEl() && n.getEl().isVisible() && !n.getEl().dom.closest('[id*="-anim-wrap-for-"]'); }, null, { timeout: 15000 });
      await p.waitForTimeout(800);
      const cache = await p.evaluate((e) => {
        const v = Ext.ComponentQuery.query(e).filter((x) => x.isVisible(true))[0], nav = Ext.ComponentQuery.query('[title*=Navigation]')[0].getEl().dom;
        const points = [['bandeau', v.down('#ocEtat')], ['titre ouverture', v.down('#ocOuverture')], ['champ fond', v.down('#ocMontant')]];
        const ko = [];
        points.forEach(([nom, c]) => { const r = c.getEl().dom.getBoundingClientRect();
          [r.top + 8, r.top + r.height / 2].forEach((y) => { const d = document.elementFromPoint(r.left + 6, y);
            if (!d || nav.contains(d) || !v.getEl().dom.contains(d)) { ko.push(nom + ' sous ' + (d ? (d.className || d.tagName) : 'rien')); } }); });
        return { ko, volet: Math.round(nav.getBoundingClientRect().right), bloc: Math.round(Math.min(v.down('#ocEtat').getEl().dom.getBoundingClientRect().left, v.down('#ocOuverture').getEl().dom.getBoundingClientRect().left)) };
      }, ECRAN);
      ok(l + ' px, volet déplié : le bord gauche du bloc reste au premier plan, le volet s\'arrête avant le bloc',
        cache.ko.length === 0 && cache.volet <= cache.bloc, JSON.stringify(cache));
      ok(l + ' px : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
      await p.context().close();
    }
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close().catch(() => {});
    const n = res.filter((x) => !x).length;
    console.log('\n' + (res.length - n) + '/' + res.length + ' OK');
    process.exit(n ? 1 : 0);
  }
})();
