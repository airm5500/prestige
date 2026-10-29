/* STATISTIQUES PAR FAMILLE / RAYON / GROSSISTE SUR UNE PERIODE SANS VENTE (journaux du 13/10).
 * Avant : NullPointerException (total HT vide) puis NumberFormatException « Infinite or NaN » (division par zero),
 * avalees : totaux et pourcentages absents, et sur une periode ou le HT total est nul la liste etait tronquee
 * au premier rayon.
 *  - periode vide : reponse complete, totaux a 0, aucune erreur dans le journal du serveur ;
 *  - periode avec ventes : memes resultats qu'avant (pourcentages identiques, somme des lignes = total).
 * Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const JOURNAL = ENV_E2E.JOURNAL_SERVEUR;
const taille = () => fs.statSync(JOURNAL).size;
const lireDepuis = (pos) => { const fd = fs.openSync(JOURNAL, 'r'); const n = taille() - pos; const buf = Buffer.alloc(Math.max(0, n)); fs.readSync(fd, buf, 0, buf.length, pos); fs.closeSync(fd); return buf.toString('utf8'); };
const ECRANS = [['familles', 'v1/statfamillearticle'], ['rayons', 'v1/statfamillearticle/statisticrayons'], ['grossistes', 'v1/statfamillearticle/statisticprovider'], ['veto', 'v1/statfamillearticle/veto']];

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const lire = (chemin, du, au) => p.evaluate(async ([c, d, a]) => {
      const r = await fetch('../api/' + c + '?dtStart=' + d + '&dtEnd=' + a + '&codeFamillle=&query=&codeRayon=&codeGrossiste=');
      return JSON.parse(await r.text()); }, [chemin, du, au]);

    for (const [nom, chemin] of ECRANS) {
      const pos = taille();
      const vide = await lire(chemin, '2019-01-01', '2019-01-31');
      const journal = lireDepuis(pos);
      const m = vide.metaData || {};
      ok(`${nom}, période sans vente : réponse complète, totaux à 0`, vide.success === true && Array.isArray(vide.data) && vide.data.length === 0
        && m.montantCumulHT === 0 && m.pourcentageCumulMage === 0, JSON.stringify(m).slice(0, 200));
      ok(`${nom}, période sans vente : aucune erreur dans le journal du serveur`, !/SEVERE|NumberFormatException|NullPointerException/.test(journal),
        (journal.match(/SEVERE.*|.*Exception.*/) || [''])[0]);

      const plein = await lire(chemin, '2026-09-01', '2026-09-30');
      const l = plein.data || [], mp = plein.metaData || {};
      const somme = l.reduce((s, x) => s + (x['MONTANT NET HT'] || 0), 0);
      ok(`${nom}, période avec ventes : lignes complètes, somme des lignes = total`, plein.success === true && l.length > 0 && somme === mp.montantCumulHT,
        l.length + ' lignes, ' + somme + ' / ' + mp.montantCumulHT);
      ok(`${nom}, période avec ventes : pourcentages calculés`, l.every((x) => Number.isFinite(x['POURCENTAGE TOTAL'])) && mp.pourcentageCumulMage > 0, mp.pourcentageCumulMage);
    }
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
