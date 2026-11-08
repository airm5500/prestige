/* EXTRANETS GROSSISTES : catalogue et promotions Copharmed, colonnes « Taux TVA » et « Prix TTC » (08/11).
 * Consultation seulement (domain3, laborex_audit tels quels) : aucune lecture sur l'extranet, rien écrit en base.
 * Rapprochement : en-têtes de la grille = titres de l'API ; sur toutes les lignes gardées, prix TTC = prix HT × (1 + taux)
 * à 1 F près ; les cellules affichées = celles de l'API, ligne par ligne. Bilan : aucune collecte ajoutée.
 * Lancement : BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node test-ecran-copharmed-tva-0811.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : ''));
}
const ECRAN = 'extranetsgrossistes';
const nombre = (s) => Number(String(s).replace(/[^\d,.-]/g, '').replace(',', '.'));

(async () => {
  const collecteAvant = q('SELECT IFNULL(MAX(id), 0) FROM extranet_collecte');
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const lectures = [];
  p.on('request', (r) => { if (/\/collecte(\?|$)|\/lectures\//.test(r.url()) && r.method() === 'POST') { lectures.push(r.url()); } });
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const listes = [{ code: 'COPHARMED_CATALOGUE', chemin: ['Copharmed', 'Produits', 'Catalogue produits'] },
      { code: 'COPHARMED_PROMOTIONS', chemin: ['Promotions', 'Promotion'] }];
    for (const l of listes) {
      for (const t of l.chemin) { await vues.cliquer(p, ECRAN + ' tab[text=' + t + ']'); await p.waitForTimeout(400); }
      await p.waitForFunction((c) => { const me = Ext.ComponentQuery.query('extranetsgrossistes')[0];
        return me.donnees && me.donnees[c] !== undefined; }, l.code, { timeout: 60000 });
      if (l.code === 'COPHARMED_PROMOTIONS') { await vues.cliquer(p, ECRAN + ' #exListe' + l.code + 'Tout'); await p.waitForTimeout(400); }
      const r = await p.evaluate(async (c) => {
        const me = Ext.ComponentQuery.query('extranetsgrossistes')[0], g = me.down('#exListe' + c + 'Grille');
        const api = await fetch('../api/v1/extranet/copharmed/listes/' + c).then((x) => x.json());
        const entetes = g.headerCt.getGridColumns().map((x) => x.text.replace(/<[^>]+>/g, ''));
        const vues = Array.from(g.getView().el.dom.querySelectorAll('tr.x-grid-row')).slice(0, 50)
          .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.trim()));
        return { api, entetes, vues };
      }, l.code);
      const c = r.api.colonnes, iHT = c.indexOf('Prix HT'), iT = c.indexOf('Taux TVA'), iTTC = c.indexOf('Prix TTC');
      ok(l.code + ' : en-têtes « Taux TVA » et « Prix TTC » à l\'écran = API', iT === iHT + 1 && iTTC === iHT + 2
        && JSON.stringify(r.entetes) === JSON.stringify(c) && c.indexOf('Remise') < 0 && c.indexOf('Prix net HT') < 0, JSON.stringify(r.entetes));
      const fausses = r.api.lignes.filter((x) => { const ht = nombre(x.cellules[iHT]), t = nombre(x.cellules[iT]), ttc = nombre(x.cellules[iTTC]);
        return !(Math.abs(ttc - ht * (1 + t / 100)) <= 1); });
      const taux = [...new Set(r.api.lignes.map((x) => x.cellules[iT]))].sort();
      ok(l.code + ' : prix TTC = prix HT × (1 + taux) sur toutes les lignes', r.api.lignes.length > 0 && fausses.length === 0,
        r.api.lignes.length + ' lignes, taux ' + JSON.stringify(taux) + ', écarts ' + JSON.stringify(fausses.slice(0, 3).map((x) => x.cellules)));
      const ecarts = r.vues.filter((v, i) => nombre(v[iHT]) !== nombre(r.api.lignes[i].cellules[iHT])
        || v[iT] !== r.api.lignes[i].cellules[iT] || nombre(v[iTTC]) !== nombre(r.api.lignes[i].cellules[iTTC]));
      ok(l.code + ' : prix HT, taux et prix TTC affichés = API (50 premières lignes)', r.vues.length > 0 && ecarts.length === 0,
        r.vues.length + ' lignes, écarts ' + JSON.stringify(ecarts.slice(0, 2)));
    }
    ok('bilan : aucune lecture sur l\'extranet, aucune collecte ajoutée', lectures.length === 0
      && q('SELECT IFNULL(MAX(id), 0) FROM extranet_collecte') === collecteAvant, JSON.stringify(lectures));
    ok('aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'copharmed-tva-erreur').catch(() => {});
  } finally {
    await navigateur.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
