/* § 21 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 : P4, onglet Analyse des produits filtre par grossiste ou par
 * emplacement.
 *
 * « Unexpected gap in ordinal parameter labels » : la requete numerotait ses filtres ?3 (texte), ?4 (emplacement),
 * ?5 (grossiste) et ne posait que ceux qui etaient remplis ; un grossiste sans texte laissait un trou, erreur 500.
 *
 * Parcours par les vues (compte e2e) : menu Produits, onglet Analyse, liste des emplacements puis des grossistes
 * (premier element de chaque liste), Actualiser. Lecture seule : aucune donnee creee.
 *
 * node support/anomalies-centre/test-p4-analyse-filtres.js   (BASE=http://localhost:9080/prestige ; MENU="PARENT|Produits")
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer, choisir } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const [PARENT, ENTREE] = (process.env.MENU || 'GESTION DU STOCK|Produits').split('|');
const A = 'produitsonglets #analyseProduits';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const reponses = []; p.on('response', (r) => { if (/api\/v1\/analyse-produits/.test(r.url())) { reponses.push(r.status() + ' ' + r.url().replace(/.*\?/, '')); } });
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  const analyser = async (titre) => {
    reponses.length = 0;
    await cliquer(p, A + ' #paActualiser');
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('produitsonglets')[0]; return !w.enCours; }, null, { timeout: 180000 });
    await p.waitForTimeout(500);
    const etat = await p.evaluate((a) => ({ texte: Ext.ComponentQuery.query(a + ' #paTableaux')[0].getEl().dom.innerText.slice(0, 120),
      ok: !!(Ext.ComponentQuery.query('produitsonglets')[0].donnees || {}).success }), A);
    ok(titre, reponses.length > 0 && reponses.every((r) => r.startsWith('200')) && etat.ok && !/n'a pas répondu|indisponible/.test(etat.texte),
      JSON.stringify({ reponses, etat }));
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, PARENT, ENTREE);
    await p.waitForFunction(() => Ext.ComponentQuery.query('produitsonglets #pa-analyse').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'produitsonglets #pa-analyse');
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('produitsonglets')[0]; return w.donnees && !w.enCours; }, null, { timeout: 180000 });

    const rayon = await choisir(p, A + ' #paRayon', 0);
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('produitsonglets')[0]; return !w.enCours; }, null, { timeout: 180000 });
    await analyser('P4 emplacement seul (' + rayon + ') : l\'analyse s\'affiche, sans erreur du serveur');

    await p.evaluate((a) => Ext.ComponentQuery.query(a + ' #paRayon')[0].clearValue(), A);
    const grossiste = await choisir(p, A + ' #paGrossiste', 0);
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('produitsonglets')[0]; return !w.enCours; }, null, { timeout: 180000 });
    await analyser('P4 grossiste seul (' + grossiste + ') : l\'analyse s\'affiche, sans erreur du serveur');
    ok('P4 aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (x) { ok('parcours sans exception', false, x.message); } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
