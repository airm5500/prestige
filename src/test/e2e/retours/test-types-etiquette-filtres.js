/* ETIQUETTAGE PRO > TYPES D'ETIQUETTE : FILTRES DE LA MISE A JOUR SELECTIVE (retours du 25/10, point 7).
 *
 * Par les vues (admin), GESTION DU STOCK > Étiquettage Pro > Types d'étiquette :
 *  - une seule ligne de filtres : le filtre a cases a cocher (zone geo, famille, grossiste), « Type actuel »,
 *    la recherche, « Rechercher » et « Effacer les filtres » ; les trois anciennes listes ne s'affichent plus ;
 *  - deux zones cochees : la liste donne les produits actifs de ces deux zones (meme nombre qu'en base) ;
 *  - une zone + un grossiste : les deux filtres se combinent ;
 *  - « Effacer les filtres » : tous les produits actifs ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur. Rien n'est ecrit en base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [Z1, Z2] = q("SELECT lg_ZONE_GEO_ID FROM t_famille WHERE str_STATUT = 'enable' AND lg_ZONE_GEO_ID IS NOT NULL GROUP BY lg_ZONE_GEO_ID ORDER BY COUNT(*) DESC LIMIT 2").split('\n');
const G = q(`SELECT lg_GROSSISTE_ID FROM t_famille WHERE str_STATUT = 'enable' AND lg_ZONE_GEO_ID = '${Z1}' AND lg_GROSSISTE_ID IS NOT NULL GROUP BY lg_GROSSISTE_ID ORDER BY COUNT(*) DESC LIMIT 1`);
const compte = (w) => q("SELECT COUNT(*) FROM t_famille f WHERE f.str_STATUT = 'enable'" + w);

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const total = async () => {
    await p.waitForTimeout(600);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('etqtypes')[0].produitsStore.isLoading(), null, { timeout: 30000 });
    return String(await p.evaluate(() => Ext.ComponentQuery.query('etqtypes')[0].produitsStore.getTotalCount()));
  };
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Étiquettage Pro');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('etiquetagepro')[0]; return e && e.isVisible(true); }, null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    await cliquer(p, 'etiquetagepro #outilTypes');
    await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('etqtypes')[0]; return t && t.isVisible(true) && t.dejaCharge && !t.produitsStore.isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    const barre = await p.evaluate(() => {
      const t = Ext.ComponentQuery.query('etqtypes')[0], g = t.down('#produitsGrille');
      const hautes = g.getDockedItems('toolbar[dock="top"]').filter((x) => x.isVisible());
      const b0 = t.down('#barreFiltres'), v = (s) => { const c = t.down(s); return !!c && c.isVisible(true); };
      const dans = (s) => { const c = t.down(s); return !!c && c.up('toolbar') === b0; };
      return { barres: hautes.length, hauteur: b0.getHeight(), filtre: !!b0.down('filtresmulti') && b0.down('filtresmulti').isVisible(true),
        anciennes: ['#filtreZone', '#filtreFamille', '#filtreGrossiste'].filter(v), memeLigne: ['#filtreType', '#filtreRecherche', '#rechercher', '#effacerFiltres'].every(dans) };
    });
    ok('Une seule ligne de filtres : filtre à cases à cocher, Type actuel, recherche, Rechercher, Effacer', barre.barres === 1 && barre.hauteur < 50 && barre.filtre
      && barre.anciennes.length === 0 && barre.memeLigne, JSON.stringify(barre));
    const tous = compte('');
    ok('Sans filtre : tous les produits actifs (' + tous + ')', await total() === tous);
    await p.evaluate(([a, c]) => { Ext.ComponentQuery.query('etqtypes filtresmulti')[0].setValeurs({ rayon: [a, c] }); }, [Z1, Z2]);
    let n = await total();
    ok('Deux zones cochées : leurs produits (même nombre qu\'en base)', n === compte(` AND f.lg_ZONE_GEO_ID IN ('${Z1}', '${Z2}')`), n);
    await p.evaluate(([a, g]) => { Ext.ComponentQuery.query('etqtypes filtresmulti')[0].setValeurs({ rayon: [a], grossiste: [g] }); }, [Z1, G]);
    n = await total();
    ok('Une zone et un grossiste : les filtres se combinent', n === compte(` AND f.lg_ZONE_GEO_ID = '${Z1}' AND f.lg_GROSSISTE_ID = '${G}'`), n);
    await cliquer(p, 'etqtypes #effacerFiltres');
    n = await total();
    ok('« Effacer les filtres » : tous les produits, filtre vidé', n === tous && await p.evaluate(() => Ext.ComponentQuery.query('etqtypes filtresmulti')[0].nombre()) === 0, n);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
