/* Demande du 02/11 : CENTRE DE SUPPORT > Diagnostic & bugs, filtrer la liste par periode et par module.
 *
 * Parcours par le menu (compte e2e-sa), lecture seule sur les evenements deja presents :
 *  - la barre porte une liste « Module » (alimentee par l'API) et deux dates « Du » / « Au » ;
 *  - choisir un module : toutes les lignes sont de ce module, le total est celui de l'API pour ce module ;
 *  - saisir une periode d'un jour (date de derniere apparition d'une ligne) : toutes les lignes ont leur derniere
 *    apparition ce jour-la, la ligne d'origine en fait partie ;
 *  - l'export Excel reprend les filtres ; « Effacer » les vide et rend la liste complete.
 *
 * node support/anomalies-centre/test-diagnostic-filtres.js   (BASE=http://localhost:9080/prestige)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer, choisir, saisir } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
async function attendre(p, etape, fn, arg, delai) {
  try { await p.waitForFunction(fn, arg, { timeout: delai || 60000 }); } catch (e) { throw new Error('Étape non atteinte : ' + etape + ' (' + e.message.split(/\r?\n/)[0] + ')'); }
}
/* etat de la grille une fois chargee : total, lignes affichees */
const grille = (p) => p.evaluate(() => { const s = Ext.ComponentQuery.query('supportdiagnostic gridpanel')[0].getStore();
  return { total: s.getTotalCount(), lignes: s.getRange().map((r) => ({ id: r.get('id'), module: r.get('module'), vu: r.get('lastSeenAt') })) }; });
async function chargee(p, etape) {
  await p.waitForTimeout(300);
  await attendre(p, etape, () => { const g = Ext.ComponentQuery.query('supportdiagnostic gridpanel')[0]; return g && !g.getStore().isLoading(); });
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  p.setDefaultTimeout(60000);
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  const exports = [];
  p.context().on('request', (r) => { if (/support\/events\/export\/excel/.test(r.url())) { exports.push(r.url()); } });
  p.context().on('page', (pg) => pg.on('request', (r) => { if (/support\/events\/export\/excel/.test(r.url())) { exports.push(r.url()); } }));
  try {
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Diagnostic & bugs');
    await attendre(p, 'écran Diagnostic & bugs affiché', () => Ext.ComponentQuery.query('supportdiagnostic gridpanel').some((c) => c.isVisible(true)));
    await chargee(p, 'liste initiale chargée');
    const initial = await grille(p);
    ok('liste initiale non vide', initial.total > 0, 'total ' + initial.total);

    const champs = await p.evaluate(() => ['combobox#comboModule', 'datefield#dateDu', 'datefield#dateAu']
      .map((q) => Ext.ComponentQuery.query('supportdiagnostic ' + q).some((c) => c.isVisible(true))));
    ok('la barre porte « Module », « Du » et « Au »', champs.every(Boolean), JSON.stringify(champs));
    if (!champs.every(Boolean)) { throw new Error('filtres absents de l\'écran'); }

    /* module : le premier de la liste apres « TOUS » */
    const module = await choisir(p, 'supportdiagnostic combobox#comboModule', 1);
    await chargee(p, 'liste filtrée par module');
    const parModule = await grille(p);
    ok('module « ' + module + ' » : toutes les lignes sont de ce module', parModule.lignes.length > 0 && parModule.lignes.every((l) => l.module === module),
      parModule.lignes.length + ' ligne(s), modules ' + [...new Set(parModule.lignes.map((l) => l.module))].join(','));
    const api = await p.evaluate(async (m) => (await (await fetch('../api/v1/support/events?start=0&limit=1&module=' + encodeURIComponent(m))).json()).total, module);
    ok('module : le total de l\'écran est celui de l\'API', parModule.total === api && parModule.total <= initial.total, parModule.total + ' / API ' + api + ' / sans filtre ' + initial.total);

    /* export avec le module */
    exports.length = 0;
    await cliquer(p, 'supportdiagnostic #btnExcel');
    await p.waitForTimeout(1500);
    ok('export Excel : le module filtré est transmis', exports.some((u) => u.indexOf('module=' + encodeURIComponent(module)) >= 0), exports.join(' | '));
    for (const pg of p.context().pages()) { if (pg !== p) { await pg.close().catch(() => {}); } }

    /* periode : retour a tous les modules, puis le jour de derniere apparition de la derniere ligne de la page */
    await choisir(p, 'supportdiagnostic combobox#comboModule', 'TOUS');
    await chargee(p, 'liste revenue à tous les modules');
    const ref = (await grille(p)).lignes.slice(-1)[0];
    const jour = ref.vu.slice(0, 10); /* yyyy-MM-dd */
    const saisie = jour.slice(8, 10) + '/' + jour.slice(5, 7) + '/' + jour.slice(0, 4);
    await saisir(p, 'supportdiagnostic datefield#dateDu', saisie);
    await chargee(p, 'liste filtrée depuis le ' + saisie);
    await saisir(p, 'supportdiagnostic datefield#dateAu', saisie);
    await chargee(p, 'liste filtrée jusqu\'au ' + saisie);
    const parJour = await grille(p);
    ok('période du ' + saisie + ' : toutes les lignes ont leur dernière apparition ce jour-là', parJour.lignes.length > 0 && parJour.lignes.every((l) => l.vu.slice(0, 10) === jour),
      parJour.lignes.length + ' ligne(s), jours ' + [...new Set(parJour.lignes.map((l) => l.vu.slice(0, 10)))].join(','));
    const apiJour = await p.evaluate(async (j) => (await (await fetch('../api/v1/support/events?start=0&limit=200&dtStart=' + j + '&dtEnd=' + j)).json()), jour);
    ok('période : la ligne de référence en fait partie, total conforme à l\'API', apiJour.data.some((e) => e.id === ref.id) && parJour.total === apiJour.total,
      'écran ' + parJour.total + ' / API ' + apiJour.total);

    exports.length = 0;
    await cliquer(p, 'supportdiagnostic #btnExcel');
    await p.waitForTimeout(1500);
    ok('export Excel : la période est transmise', exports.some((u) => u.indexOf('dtStart=' + jour) >= 0 && u.indexOf('dtEnd=' + jour) >= 0), exports.join(' | '));
    for (const pg of p.context().pages()) { if (pg !== p) { await pg.close().catch(() => {}); } }

    /* Effacer : tous les filtres sont vides, la liste est complete */
    await cliquer(p, 'supportdiagnostic button#btnEffacerRecherche');
    await chargee(p, 'liste après « Effacer »');
    const efface = await grille(p);
    const vides = await p.evaluate(() => { const v = (q) => Ext.ComponentQuery.query('supportdiagnostic ' + q)[0].getValue();
      return [v('combobox#comboModule'), v('datefield#dateDu'), v('datefield#dateAu')]; });
    ok('« Effacer » vide le module et la période, la liste revient entière', efface.total === initial.total
      && (vides[0] === 'TOUS' || !vides[0]) && !vides[1] && !vides[2], efface.total + ' / ' + initial.total + ' ' + JSON.stringify(vides));
    ok('aucune fenêtre surgissante', await p.evaluate(() => Ext.ComponentQuery.query('window{isVisible()}').length === 0));
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) { ok('parcours sans exception', false, x.message); } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + (echecs ? ' ECHEC' : ' OK'));
    process.exit(echecs ? 1 : 0);
  }
})();
