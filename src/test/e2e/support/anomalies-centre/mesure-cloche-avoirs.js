/* L1 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 : mesure de la cloche « Ventes en avoir » (733 lenteurs en
 * officine). Lecture seule.
 *  - appel actuel de la cloche (Header.js) : ventestats?onlyAvoir=true… sur un mois glissant, 10 fois a la suite,
 *    puis 6 en parallele (6 postes qui rafraichissent en meme temps) ;
 *  - compteur prevu mais inactif (AVOIRS_SANS_PERIODE) : ventestats/avoirs-ouverts/count, memes series.
 * Seuil du rapport : 200 ms par appel de la cloche.
 *
 * node support/anomalies-centre/mesure-cloche-avoirs.js   (BASE=… pour viser un autre domaine)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion } = require('../../outils/vues');

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage();
  await connexion(p, ENV_E2E.LOGIN, 'e2etest');
  const r = await p.evaluate(async () => {
    const f = (d) => d.toISOString().slice(0, 10);
    const fin = new Date(); const debut = new Date(fin.getTime() - 30 * 86400000);
    const cloche = '../api/v1/ventestats?onlyAvoir=true&sansBon=false&typeVenteId=&avoirStatut=EN_COURS&dtStart=' + f(debut)
      + '&dtEnd=' + f(fin) + '&start=0&limit=50';
    const compteur = '../api/v1/ventestats/avoirs-ouverts/count';
    const une = async (u) => { const t = performance.now(); const x = await fetch(u); const j = await x.json(); return { ms: performance.now() - t, j }; };
    const stats = (l) => { const s = l.map((x) => x.ms).sort((a, b) => a - b); return { min: Math.round(s[0]), med: Math.round(s[Math.floor(s.length / 2)]), max: Math.round(s[s.length - 1]) }; };
    const out = {};
    for (const [nom, u] of [['cloche', cloche], ['compteur', compteur]]) {
      await une(u); /* chauffe */
      const suite = []; for (let i = 0; i < 10; i++) { suite.push(await une(u)); }
      const t0 = performance.now(); const para = await Promise.all([1, 2, 3, 4, 5, 6].map(() => une(u)));
      out[nom] = { suite: stats(suite), parallele6: stats(para), mur6: Math.round(performance.now() - t0),
        resultat: nom === 'cloche' ? { total: suite[0].j.total } : suite[0].j };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(2); });
