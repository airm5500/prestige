/* SCRIPTS A JOUR SUR TOUS LES POSTES APRES UN DEPLOIEMENT (retour du 03/11 : « rappel de date ou d'heure incoherente
 * alors que j'ai ouvert via un autre poste un lien sur le serveur »).
 * Le correctif du 02/11 (l'horloge du navigateur n'est plus comparee) etait deploye, mais l'autre poste gardait
 * l'ancien alerte-horloge.js : les scripts sont gardes 24 h par le navigateur (StaticResourceCacheFilter) sous la meme
 * adresse, donc un correctif n'atteint un poste qu'au bout d'un jour ou apres Ctrl+F5.
 * Attendu : chaque script et feuille de style de Prestige pose par la page porte le jeton du deploiement (?v=...),
 * comme les ecrans qu'ExtJS irait chercher par le reseau (hors du paquet api/v1/ecrans/scripts.js, lui revalide a
 * chaque connexion) ; un nouveau deploiement change l'adresse, donc le navigateur relit le fichier. Le cache de 24 h
 * reste (sinon l'ouverture redevient lente). Les bibliotheques dont le nom porte deja une version ne changent pas.
 * Lecture seule.
 *
 * node support/test-scripts-a-jour-apres-deploiement.js   (BASE=http://localhost:9080/prestige)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  p.setDefaultTimeout(60000);
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const scripts = [], styles = [], cache = {};
  p.on('response', (r) => { const u = r.url(); cache[u] = r.headers()['cache-control'] || '';
    if (/\/prestige\/general\/.*\.js(\?|$)/.test(u)) { scripts.push(u); }
    if (/\/prestige\/general\/(resources\/css|metro)\/[^/?]+\.css(\?|$)|\/general\/bootstrap\.css/.test(u)) { styles.push(u); }
    if (/api\/v1\/ecrans\/scripts\.js/.test(u)) { cache.paquet = (r.headers()['cache-control'] || '') + ' ' + (r.headers().etag || ''); } });
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());

  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => { const n = window.Ext && Ext.ComponentQuery.query('navigation')[0];
      return n && n.getStore().getRootNode().childNodes.length > 0; }, null, { timeout: 60000 });
    await p.waitForTimeout(2000);
    const jeton = await p.evaluate(() => window.PRESTIGE_VERSION_RESSOURCES || '');
    ok('La page connaît le jeton du déploiement', /^[0-9a-z]{6,}$/.test(jeton), jeton);
    const porte = (u) => jeton && new RegExp('[?&]v=' + jeton + '(&|$)').test(u);

    const horloge = scripts.find((u) => /resources\/js\/alerte-horloge\.js/.test(u));
    ok('alerte-horloge.js est demandé avec le jeton du déploiement', horloge && porte(horloge), horloge);
    /* scripts de Prestige poses par la page (pas ExtJS ni les bibliotheques versionnees, comme qrcode-generator-1.4.4) */
    const page = scripts.filter((u) => /\/general\/((resources\/js|metro)\/[^/?]+|bootstrap|app)\.js/.test(u)
      && !/-\d+\.\d+(\.\d+)?(\.min)?\.js/.test(u));
    const sansPage = page.filter((u) => !porte(u));
    ok('Tous les scripts de la page portent le jeton', page.length >= 10 && sansPage.length === 0,
      page.length + ' scripts ; sans jeton : ' + sansPage.join(' | '));
    const sansStyles = styles.filter((u) => !porte(u));
    ok('Les feuilles de style de Prestige portent le jeton', styles.length >= 6 && sansStyles.length === 0,
      styles.length + ' feuilles ; sans jeton : ' + sansStyles.join(' | '));
    /* un ecran hors du paquet part par le reseau : Ext.Loader le demande avec le jeton */
    const classes = scripts.filter((u) => /\/general\/app\/.+\.js/.test(u));
    ok('Les écrans chargés par le réseau portent le jeton', classes.every(porte), classes.filter((u) => !porte(u)).slice(0, 5).join(' | '));
    const essai = await p.evaluate(() => new Promise((fin) => {
      const avant = new Set(performance.getEntriesByType('resource').map((e) => e.name));
      Ext.Loader.loadScriptFile('/prestige/general/resources/js/qrcode-generator-1.4.4.js', () => fin(performance.getEntriesByType('resource')
        .map((e) => e.name).filter((n) => !avant.has(n) && /qrcode-generator/.test(n))), () => fin(['échec']), null, false);
      setTimeout(() => fin(['délai']), 15000);
    }));
    ok("Ext.Loader ajoute le jeton aux fichiers qu'il va chercher", essai.length === 1 && porte(essai[0]), essai.join(' | '));
    ok('Le paquet des écrans reste revalidé à chaque connexion', /no-cache/.test(cache.paquet || '') && /"/.test(cache.paquet || ''), cache.paquet);
    ok('Le jeton est le même pour tous (un seul téléchargement par déploiement)',
      [...page, ...styles, ...classes].every((u) => (u.match(/[?&]v=([^&]+)/) || [])[1] === jeton));
    ok('Le cache de 24 h est gardé (ouverture rapide)', horloge && /max-age=86400/.test(cache[horloge]), horloge && cache[horloge]);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
