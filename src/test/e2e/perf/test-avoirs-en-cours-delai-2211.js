/* LISTE DES AVOIRS EN COURS : DELAI (retours du 22/11, lot 10, point 1 : 1,39 s pour 9 ventes sur la copie appaul).
 *
 * A lancer sur un domaine branche sur la copie d'une officine (domain2, base appaul : BASE=http://localhost:9080/prestige
 * DB_TEST=appaul). Lecture seule.
 * Par les clics (compte e2e), menu SERVICE CLIENT > « Liste des avoirs » :
 *  - onglet « Avoir en cours » : trois recherches (periode du mois), puis une periode d'un an ; onglet « Avoir clôturé » ;
 *  - delai de chaque reponse de /api/v1/ventestats (avoirs) mesure par le navigateur : plafond 400 ms (avant : 1,4 s) ;
 *  - rapprochement : total affiche = API = base (meme definition : vente cloturee, avoir ouvert, non annulee).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const PLAFOND_MS = 400;

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Liste des avoirs');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('venteavoirmanager #gridEnCours')[0]; return g && g.isVisible(true) && g.getStore().lastOptions && !g.getStore().isLoading(); }, null, { timeout: 120000 });
    const mesurer = async (titre, action, motif) => {
      const [rep] = await Promise.all([p.waitForResponse((r) => /api\/v1\/ventestats\?/.test(r.url()) && motif.test(r.url()), { timeout: 60000 }), action()]);
      const corps = await rep.json();
      const t = rep.request().timing();
      const delai = Math.round(t.responseEnd >= 0 ? t.responseEnd - t.requestStart : -1);
      const u = new URL(rep.url());
      return { titre, delai, total: corps.total, dtStart: u.searchParams.get('dtStart'), dtEnd: u.searchParams.get('dtEnd'), statut: u.searchParams.get('avoirStatut') };
    };
    const base = (m) => q(m.statut === 'CLOTURE'
      ? `SELECT COUNT(*) FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_HAS_AVOIR = 1 AND p.b_IS_AVOIR = 0 AND p.dt_CLOTURE_AVOIR >= '${m.dtStart} 00:00:00' AND p.dt_CLOTURE_AVOIR <= '${m.dtEnd} 23:59:59'`
      : `SELECT COUNT(*) FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_AVOIR = 1 AND p.b_IS_CANCEL = 0 AND p.dt_UPDATED >= '${m.dtStart} 00:00:00' AND p.dt_UPDATED <= '${m.dtEnd} 23:59:59'`);
    const mesures = [];
    for (let i = 0; i < 3; i++) {
      mesures.push(await mesurer('en cours, mois, recherche ' + (i + 1), () => cliquer(p, 'venteavoirmanager #rechercher'), /avoirStatut=EN_COURS/));
      await p.waitForTimeout(400);
    }
    /* un an : saisie de la date de debut au clavier */
    const id = await p.evaluate(() => Ext.ComponentQuery.query('venteavoirmanager #dtStart')[0].inputEl.id);
    const unAn = await p.evaluate(() => Ext.Date.format(Ext.Date.add(new Date(), Ext.Date.YEAR, -1), 'd/m/Y'));
    await p.fill('#' + id, unAn); await p.press('#' + id, 'Tab');
    mesures.push(await mesurer('en cours, un an', () => cliquer(p, 'venteavoirmanager #rechercher'), /avoirStatut=EN_COURS/));
    await p.waitForTimeout(400);
    const onglet = await p.evaluate(() => { const t = Ext.ComponentQuery.query('venteavoirmanager #avoirTabs')[0]; return t.getTabBar().items.getAt(1).getId(); });
    mesures.push(await mesurer('clôturés, un an', () => p.click('#' + onglet), /avoirStatut=CLOTURE/));
    for (const m of mesures) {
      const nb = base(m);
      ok(`${m.titre} : ${m.delai} ms (plafond ${PLAFOND_MS}) ; total ${m.total} = base ${nb}`, m.delai >= 0 && m.delai <= PLAFOND_MS && String(m.total) === nb, JSON.stringify(m));
    }
    const affiche = await p.evaluate(() => Ext.ComponentQuery.query('venteavoirmanager #gridCloture')[0].getStore().getTotalCount());
    ok('Total affiché (onglet clôturé) = API', affiche === mesures[mesures.length - 1].total, affiche);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack || e);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
