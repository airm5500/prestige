/* MONOGRAPHIE A LA DEMANDE (retour du 31/10) — lecture seule.
 * Le site des monographies est lent ou en panne : ouvrir le detail d'un article ne doit plus l'interroger. La fiche
 * n'est demandee qu'au clic sur « Afficher la monographie » ou sur une rubrique.
 * Le site est simule dans le navigateur (seuls les appels a la fiche sont comptes) ; le service doit etre actif.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [P, CIP] = q("SELECT lg_FAMILLE_ID, int_CIP FROM t_famille WHERE str_STATUT = 'enable' AND int_CIP REGEXP '^[0-9]{7}$' ORDER BY str_NAME LIMIT 1").split('\t');
const fiche = (rub) => JSON.stringify({ success: true, trouve: true, lueLe: Date.now(), fiche: { titre: 'ESSAI', rubrique: rub, libelleRubrique: 'Rubrique ' + rub,
  paragraphes: ['Paragraphe d\'essai de la rubrique ' + rub + '.'] } });

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], appels = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route(/\/api\/v1\/monographie\/fiche\//, (r) => { const rub = +(new URL(r.request().url()).searchParams.get('rubrique') || 1); appels.push(rub);
    r.fulfill({ contentType: 'application/json', body: fiche(rub) }); });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const etat = await p.evaluate(async () => (await fetch('../api/v1/monographie/etat')).json());
    ok('Précondition : service des monographies actif', etat.actif === true, JSON.stringify(etat).slice(0, 120));
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 30000 });
    await p.evaluate((cip) => { Ext.getCmp('rechecher').setValue(cip); Ext.ComponentQuery.query('famillemanager')[0].onRechClick(); }, CIP);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', id) >= 0; }, P, { timeout: 60000 });
    await p.evaluate((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onDetailClick(g, g.getStore().findExact('lg_FAMILLE_ID', id)); }, P);
    await p.waitForFunction(() => { const m = Ext.ComponentQuery.query('#monographieDetail')[0]; return m && m.getEl() && m.getEl().dom.querySelectorAll('.mono-rub').length > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(3000);

    ok('Ouverture du détail : le site des monographies n\'est pas interrogé', appels.length === 0, JSON.stringify(appels));
    const v = await p.evaluate(() => { const d = Ext.ComponentQuery.query('#monographieDetail')[0].getEl().dom, bt = d.querySelector('.mono-afficher');
      return { actif: d.querySelectorAll('.mono-rub.actif').length, bouton: bt ? bt.textContent : null, chargement: /Chargement/.test(d.textContent) }; });
    ok('Bouton « Afficher la monographie » proposé, aucune rubrique ouverte, pas de « Chargement… »', v.bouton === 'Afficher la monographie' && v.actif === 0 && !v.chargement, JSON.stringify(v));

    await p.click('.mono-panel .mono-afficher');
    await p.waitForFunction(() => document.querySelector('.mono-panel .mono-titre'), null, { timeout: 15000 });
    const v2 = await p.evaluate(() => { const d = Ext.ComponentQuery.query('#monographieDetail')[0].getEl().dom;
      return { actif: (d.querySelector('.mono-rub.actif') || {}).textContent, texte: d.querySelector('.mono-corps').textContent }; });
    ok('Clic sur le bouton : posologie demandée une fois et affichée', appels.length === 1 && appels[0] === 1 && /rubrique 1/.test(v2.texte), JSON.stringify({ appels, v2 }));

    await p.click('.mono-panel .mono-rub[data-rub="3"]');
    await p.waitForFunction(() => /rubrique 3|Aucune interaction/.test(document.querySelector('.mono-panel .mono-corps').textContent), null, { timeout: 15000 });
    ok('Clic sur une autre rubrique : chargée à son tour', appels.length === 2 && appels[1] === 3, JSON.stringify(appels));
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
