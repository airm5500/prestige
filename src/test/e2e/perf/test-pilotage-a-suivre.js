/* ANALYSE DE GESTION > « Pilotage de l'officine », onglet « À suivre » : LENTEUR (journal de l'officine, 19/10).
 *
 * Le journal signale « BLOCAGE DETECTE : requete en traitement depuis 26s : GET .../pilotage/onglet/asuivre ». Sur le
 * banc (3 ans de ventes), le premier calcul prenait 28 s en cumul annuel et 33 s en glissant 12 mois : les lignes de
 * vente de la periode etaient relues quatre fois (CA, emplacements, familles, ventes a perte), en partant des articles.
 * Par les vues : menu, onglet « À suivre », période « Glissant 12 mois » choisie dans la liste.
 *  - l'onglet est rempli en moins de 12 s ;
 *  - premier emplacement et première famille du tableau : CA = base (SQL indépendant) ;
 *  - aucune erreur JavaScript.
 * Le calcul est garde 5 minutes par le serveur : le test ne mesure le calcul que s'il n'a pas ete fait dans les 5
 * dernieres minutes par le compte admin (lancer les tests un par un). Aucune ecriture.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, choisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MAX_MS = 12000;

/* glissant 12 mois : douze mois complets, mois en cours exclu */
const premierDuMois = q("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-01')");
const debut = q(`SELECT DATE_SUB('${premierDuMois}', INTERVAL 12 MONTH)`);
const lignes = (jointure) => `FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID`
  + ` JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID ${jointure} WHERE p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0`
  + ` AND p.lg_TYPE_VENTE_ID <> '5' AND p.dt_UPDATED >= '${debut}' AND p.dt_UPDATED < '${premierDuMois}'`;
const CA = 'SUM(d.int_PRICE - COALESCE(d.int_PRICE_REMISE, 0))';
const [EMPLACEMENT, CA_EMPLACEMENT] = q(`SELECT COALESCE(z.str_LIBELLEE, '(non renseigné)'), ${CA} ${lignes('LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID')}`
  + ' GROUP BY f.lg_ZONE_GEO_ID ORDER BY 2 DESC LIMIT 1').split('\t');
const [FAMILLE, CA_FAMILLE] = q(`SELECT COALESCE(fa.str_LIBELLE, '(non renseigné)'), ${CA} ${lignes('LEFT JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID')}`
  + ' GROUP BY f.lg_FAMILLEARTICLE_ID ORDER BY 2 DESC LIMIT 1').split('\t');

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', "Pilotage de l'officine");
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; return e && e.isVisible(true) && e.down('#onglet-asuivre'); }, null, { timeout: 120000 });
    /* l'onglet ouvert a l'arrivee charge le mois en cours : on attend qu'il ait fini */
    await p.waitForLoadState('networkidle');
    const idOnglet = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #onglet-asuivre')[0].tab.getId());
    const mois = p.waitForResponse((r) => r.url().includes('pilotage/onglet/asuivre') && r.url().includes('axe=MOIS'), { timeout: 120000 }).catch(() => null);
    await p.click('#' + idOnglet);
    await mois;
    await p.waitForLoadState('networkidle');

    const t = Date.now();
    const g12 = p.waitForResponse((r) => r.url().includes('pilotage/onglet/asuivre') && r.url().includes('axe=G12'), { timeout: 180000 });
    await choisir(p, 'pilotage #barrePeriode #axe', 'Glissant 12 mois');
    await g12;
    await p.waitForFunction(() => { const o = Ext.ComponentQuery.query('pilotage #onglet-asuivre')[0]; return !(o.loadMask && o.loadMask.isVisible()); }, null, { timeout: 60000, polling: 50 });
    const ms = Date.now() - t;
    await p.waitForTimeout(500);
    ok('« À suivre », glissant 12 mois : rempli en moins de 12 s', ms < MAX_MS, ms + ' ms');

    const premiere = (carte) => p.evaluate((c) => { const l = document.querySelector('.sv-carte[data-carte="' + c + '"] table.sv-table tr:nth-child(2)');
      return l ? [...l.querySelectorAll('td')].map((x) => x.textContent.trim()) : null; }, carte);
    const chiffres = (s) => Number(String(s).replace(/[^0-9-]/g, ''));
    const e = await premiere('emplacements');
    ok('CA par emplacement : « ' + EMPLACEMENT + ' » en tête, CA = base', e && e[0] === EMPLACEMENT && chiffres(e[1]) === Number(CA_EMPLACEMENT), JSON.stringify(e) + ' / ' + CA_EMPLACEMENT);
    const f = await premiere('familles');
    ok('CA par famille : « ' + FAMILLE + ' » en tête, CA = base', f && f[0] === FAMILLE && chiffres(f[1]) === Number(CA_FAMILLE), JSON.stringify(f) + ' / ' + CA_FAMILLE);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
