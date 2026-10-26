/* LOT 1 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 : volet API (P1, A4).
 *
 *  - P1 : « NullPointerException : text » sur produit/monitoringproduct (14 occurrences en officine). Sans dates, la
 *    route doit refuser proprement (success:false, sans erreur 500 ni evenement au support) ; avec des dates, elle
 *    repond comme avant ;
 *  - A4 : texte dans un filtre entier de « Liste des articles vendus » (stock=abc) : refus 400 en JSON qui nomme le
 *    champ, au lieu de la page 404 de Payara ; une valeur entiere repond comme avant.
 * Aucune donnee ecrite. Le test echoue tant que les defauts sont presents.
 *
 * node support/anomalies-centre/test-lot1-api.js   (BASE=http://localhost:9080/prestige pour le second domaine)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const V = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 250) + ']' : '')); }
const API = '../api/v1/';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage();
  try {
    /* super administrateur : le journal du support lui est reserve */
    await V.connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    const appel = (url) => p.evaluate(async (u) => {
      const x = await fetch(u); const t = await x.text(); let j = null; try { j = JSON.parse(t); } catch (e) { /* page HTML */ }
      return { statut: x.status, json: j, texte: t.slice(0, 200) };
    }, url);
    /* occurrences de l'evenement « NullPointerException : text » (0 s'il n'existe pas) */
    const evenements = async () => {
      const j = (await appel(API + 'support/events?start=0&limit=5000')).json || {};
      const e = (j.data || []).find((x) => x.messageCourt === 'NullPointerException : text');
      return e ? e.occurrences : 0;
    };
    const avant = await evenements();

    for (const route of ['produit/monitoringproduct', 'produit/monitoringproduct-complet']) {
      const r = await appel(API + route + '?start=0&limit=20&produitId=E2E-INEXISTANT');
      ok('P1 ' + route + ' sans dates : refus propre (pas de 500, success:false avec un message)',
        r.statut !== 500 && r.json && r.json.success === false && !!r.json.msg, r.statut + ' ' + r.texte);
      const d = await appel(API + route + '?start=0&limit=20&produitId=E2E-INEXISTANT&dtStart=2026-10-01&dtEnd=2026-10-25');
      ok('P1 ' + route + ' avec dates : réponse inchangée (200, JSON)', d.statut === 200 && d.json && d.json.success !== false, d.statut);
    }
    const apres = await evenements();
    ok('P1 aucun événement « NullPointerException : text » ajouté au support', avant === apres, avant + ' → ' + apres);

    const base = API + 'ventestats/article-vendus?dtStart=2026-10-01&dtEnd=2026-10-01&start=0&limit=1&nbre=0';
    const a = await appel(base + '&stock=abc');
    ok('A4 article-vendus stock=abc : refus 400 en JSON qui nomme le champ',
      a.statut === 400 && a.json && a.json.success === false && /stock/.test(a.json.msg || ''), a.statut + ' ' + a.texte);
    const a2 = await appel(base + '&stock=5');
    ok('A4 article-vendus stock=5 : réponse inchangée (200)', a2.statut === 200 && a2.json, a2.statut);
    const a3 = await appel(API + 'ventestats/article-vendus-recap?dtStart=2026-10-01&dtEnd=2026-10-01&start=0&limit=1&qteVendu=1,5');
    ok('A4 article-vendus-recap qteVendu=1,5 : refus 400 en JSON', a3.statut === 400 && a3.json && a3.json.success === false, a3.statut + ' ' + a3.texte);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
