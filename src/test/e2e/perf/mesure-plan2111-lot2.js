/* PLAN DU 21/11, LOT 2 : mesures avant / apres des trois lenteurs (4.3 prevision, 14 analyse tiers payants,
 * 17 recherche des perimes), par les memes appels que les ecrans, compte e2e, serveur au repos.
 * Chaque appel est fait REPETITIONS fois (le premier « a froid » est garde a part) ; les reponses sont ecrites dans
 * SORTIE (un fichier par appel) pour le rapprochement avant / apres (rapprochement-plan2111-lot2.js).
 * Lecture seule, hormis ce que l'ecran ecrit lui-meme (en-cours de la prevision).
 * Variables : SORTIE (dossier), REPETITIONS (defaut 3), PRODUITS (identifiants separes par des virgules).
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const ENV_E2E = require('../outils/poste');
const { connexion } = require('../outils/vues');

const SORTIE = process.env.SORTIE || path.join(process.cwd(), 'mesures-lot2');
const N = Number(process.env.REPETITIONS || 3);
const PRODUITS = (process.env.PRODUITS || '').split(',').filter(Boolean);
const MOIS = ['2026-10-01', '2026-10-31'];
const AN = ['2025-11-01', '2026-10-31'];

const appels = [];
for (const id of PRODUITS) { appels.push(['prevision-' + id, '../api/v1/analyse-commande/produit/' + id]); }
for (const [nom, [d, f]] of [['mois', MOIS], ['an', AN]]) {
  const p = 'dtStart=' + d + '&dtEnd=' + f;
  appels.push(['tp-liste-' + nom, '../api/v1/analyse-tierspayant/tiers-payants?' + p]);
  appels.push(['tp-recherche-' + nom, '../api/v1/analyse-tierspayant/tiers-payants?' + p + '&query=MUGEF']);
  appels.push(['tp-detail-p1-' + nom, '../api/v1/analyse-tierspayant/produits?' + p + '&tiersPayantId={MUGEFCI}&start=0&limit=25']);
  appels.push(['tp-detail-p2-' + nom, '../api/v1/analyse-tierspayant/produits?' + p + '&tiersPayantId={MUGEFCI}&start=25&limit=25']);
  appels.push(['tp-detail-petit-' + nom, '../api/v1/analyse-tierspayant/produits?' + p + '&tiersPayantId={ANKARA}&start=0&limit=25']);
  appels.push(['tp-csv-' + nom, '../api/v1/analyse-tierspayant/csv?' + p + '&niveau=TIERS']);
  appels.push(['tp-csv-produits-' + nom, '../api/v1/analyse-tierspayant/csv?' + p + '&niveau=PRODUIT&tiersPayantId={MUGEFCI}']);
  appels.push(['tp-excel-' + nom, '../api/v1/analyse-tierspayant/excel?' + p + '&niveau=TIERS']);
  appels.push(['tp-print-' + nom, '../api/v1/analyse-tierspayant/print?' + p + '&niveau=TIERS']);
  appels.push(['tp-print-produits-' + nom, '../api/v1/analyse-tierspayant/print?' + p + '&niveau=PRODUIT&tiersPayantId={MUGEFCI}']);
}
appels.push(['perimes-page1', '../api/v1/fichearticle/perimes?nbreMois=&codeFamile=&codeRayon=&codeGrossiste=&query=&dtStart=&dtEnd=&page=1&start=0&limit=20']);
appels.push(['perimes-page3', '../api/v1/fichearticle/perimes?nbreMois=&codeFamile=&codeRayon=&codeGrossiste=&query=&dtStart=&dtEnd=&page=3&start=40&limit=20']);
appels.push(['perimes-6mois', '../api/v1/fichearticle/perimes?nbreMois=6&codeFamile=&codeRayon=&codeGrossiste=&query=&dtStart=&dtEnd=&page=1&start=0&limit=20']);
appels.push(['perimes-count', '../api/v1/fichearticle/perimes/count?nbreMois=0']);
appels.push(['perimes-csv', '../api/v1/fichearticle/perimes/csv?nbreMois=0']);

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const b = await ENV_E2E.lancer(chromium);
  const resultats = [];
  try {
    const p = await (await b.newContext()).newPage();
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    /* identifiants des tiers payants par leur nom, dans la liste du mois */
    const liste = await p.evaluate((u) => fetch(u).then((r) => r.json()), '../api/v1/analyse-tierspayant/tiers-payants?dtStart=' + AN[0] + '&dtEnd=' + AN[1]);
    const id = (nom) => ((liste.data || []).find((l) => l.tiersPayant === nom) || {}).tiersPayantId || '';
    const ids = { MUGEFCI: id('MUGEFCI'), ANKARA: id('ANKARA') };
    for (const [nom, modele] of appels) {
      const url = modele.replace(/\{(\w+)\}/g, (_, k) => ids[k]);
      const temps = [];
      let corps = '';
      for (let i = 0; i < N + 1; i++) {
        const r = await p.evaluate(async (u) => { const t0 = performance.now(); const rep = await fetch(u); const t = await rep.text(); return { ms: performance.now() - t0, t, s: rep.status }; }, url);
        temps.push(Math.round(r.ms));
        corps = r.t;
      }
      const chaud = temps.slice(1).sort((a, c) => a - c);
      const ligne = { nom, froid: temps[0], median: chaud[Math.floor(chaud.length / 2)], min: chaud[0], octets: corps.length };
      resultats.push(ligne);
      console.log(nom.padEnd(32) + ' froid ' + String(ligne.froid).padStart(6) + ' ms   médiane ' + String(ligne.median).padStart(6) + ' ms   ' + ligne.octets + ' o');
      fs.writeFileSync(path.join(SORTIE, nom + (/csv/.test(nom) ? '.csv' : /excel/.test(nom) ? '.xlsx.txt' : '.json')), corps);
    }
  } finally {
    await b.close();
  }
  fs.writeFileSync(path.join(SORTIE, '_temps.json'), JSON.stringify(resultats, null, 1));
})();
