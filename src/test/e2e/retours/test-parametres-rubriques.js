/* PARAMETRES RANGES PAR RUBRIQUE (retours du 13/10, point 16). Par l'ecran « Gestion des parametres », admin.
 *  - a gauche, les rubriques (pastille de couleur, nombre de parametres), « Toutes les rubriques » choisie au depart ;
 *  - chaque parametre a sa rubrique (colonne « Rubrique ») ; les nombres s'additionnent au total ;
 *  - choisir une rubrique ne montre que ses parametres ; la recherche et le filtre de type restent operants dedans ;
 *  - « Toutes les rubriques » remet la liste complete. Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    const api = (u) => p.evaluate(async (u) => (await fetch(u)).json(), u);
    const rub = await api('../api/v1/app-params/rubriques');
    const liste = await api('../api/v1/app-params/liste?start=0&limit=0');
    const toutes = rub.results[0], autres = rub.results.slice(1);
    ok('API : « Toutes les rubriques » = nombre de paramètres visibles, somme des rubriques', toutes.nombre === liste.total && autres.reduce((s, r) => s + r.nombre, 0) === liste.total,
      toutes.nombre + ' / ' + liste.total);
    ok('API : chaque paramètre a sa rubrique (libellé, couleur)', liste.results.every((x) => x.rubrique && x.rubriqueLibelle && /^#/.test(x.rubriqueCouleur)));
    ok('Au moins 8 rubriques, « Système et divers » minoritaire', autres.length >= 8 && (autres.find((r) => r.code === 'AUTRES') || { nombre: 0 }).nombre < liste.total / 5,
      JSON.stringify(autres.map((r) => r.code + ':' + r.nombre)));

    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('parametermanager', 'Paramètres', ''));
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('parametermanager #rubriquesParam')[0]; return v && v.getStore().getCount() > 0 && v.getSelectionModel().hasSelection(); }, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const ecran = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('parametermanager')[0], v = g.down('#rubriquesParam');
      return { choisie: v.getSelectionModel().getSelection()[0].get('libelle'), total: g.getStore().getTotalCount(), rubriques: g.getStore().collect('rubrique'),
        colonne: !!g.down('#colRubrique'), pastilles: v.getEl().dom.querySelectorAll('.param-rubrique').length, visible: v.isVisible() }; });
    let e = await ecran();
    ok('Écran : rubriques à gauche, « Toutes les rubriques » choisie, colonne « Rubrique »', e.visible && e.pastilles === rub.results.length && e.choisie === 'Toutes les rubriques' && e.colonne && e.total === liste.total,
      JSON.stringify(e).slice(0, 200));
    const etiq = rub.results.find((r) => r.code === 'ETIQUETTE');
    /* vrai clic souris sur la rubrique, puis attente du rechargement de la liste */
    const choisir = async (code) => {
      const charge = p.evaluate(() => new Promise((ok) => { const g = Ext.ComponentQuery.query('parametermanager')[0];
        g.getStore().on('load', () => ok(true), null, { single: true }); setTimeout(() => ok(false), 20000); }));
      await p.click('.param-rubrique[data-code="' + code + '"]');
      return charge;
    };
    await choisir('ETIQUETTE');
    e = await ecran();
    ok('Rubrique « Étiquettes » : seulement ses paramètres, au bon nombre', e.choisie === 'Étiquettes' && e.total === etiq.nombre && e.rubriques.length === 1 && e.rubriques[0] === 'ETIQUETTE', JSON.stringify(e).slice(0, 200));
    const recherche = await p.evaluate(() => new Promise((ok) => { const g = Ext.ComponentQuery.query('parametermanager')[0]; Ext.getCmp('rechecher').setValue('MARGE');
      g.getStore().on('load', (s) => ok({ total: s.getTotalCount(), cles: s.collect('str_KEY') }), null, { single: true }); g.onRechClick(); }));
    ok('Recherche dans la rubrique : « MARGE » ne garde que les étiquettes qui y répondent', recherche.cles.every((k) => /^KEY_ETIQUETTE_MARGE/.test(k)) && recherche.total >= 1, JSON.stringify(recherche));
    await p.evaluate(() => { Ext.getCmp('rechecher').setValue(''); });
    await choisir('');
    e = await ecran();
    ok('« Toutes les rubriques » : la liste complète revient', e.total === liste.total && e.choisie === 'Toutes les rubriques', e.total);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
