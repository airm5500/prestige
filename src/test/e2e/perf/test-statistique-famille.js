/* ANALYSE DE GESTION > « Statistique famille » : LENTEUR (19/10).
 *
 * Sur le banc (3 ans de ventes), un mois prenait 10 a 17 s : les sommes, ecrites en criteres JPA, laissaient MariaDB
 * partir des articles et relire toutes leurs lignes de vente depuis l'origine, puis une requete par famille sur l'annee.
 * Par les vues : menu, periode de septembre 2026 saisie au clavier, bouton Rechercher.
 *  - la grille se remplit en moins de 6 s ;
 *  - une ligne par famille vendue ; montant TTC, montant achat et cumul TTC de l'annee d'une famille = base (SQL
 *    independant) ; total TTC du bas de l'ecran = base ;
 *  - filtre par rayon : moins de 6 s, total = base ;
 *  - aucune erreur JavaScript.
 * L'ecran exige P_SM_FAMI_STAT, absent du role administrateur du banc : le test le donne le temps du parcours (ligne
 * E2E-STATFAM) et le retire. Aucune autre ecriture.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir, choisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MAX_MS = 6000;
const EMP = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = 'admin'");
const ventes = (debut, fin, plus) => `FROM t_preenregistrement p JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID`
  + ` JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID`
  + ` JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID WHERE p.dt_UPDATED >= '${debut}' AND p.dt_UPDATED < '${fin}'`
  + ` AND u.lg_EMPLACEMENT_ID = '${EMP}' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'` + (plus || '');
const MOIS = ['2026-09-01', '2026-10-01'];
const NB = q(`SELECT COUNT(DISTINCT fa.lg_FAMILLEARTICLE_ID) ${ventes(...MOIS)}`);
const TOTAL = q(`SELECT SUM(d.int_PRICE) - SUM(d.int_PRICE_REMISE) ${ventes(...MOIS)}`);
const [FAM, LIB, TTC, ACHAT] = q(`SELECT fa.str_CODE_FAMILLE, fa.str_LIBELLE, SUM(d.int_PRICE) - SUM(d.int_PRICE_REMISE), SUM(d.prixAchat * d.int_QUANTITY) ${ventes(...MOIS)}`
  + ' GROUP BY fa.lg_FAMILLEARTICLE_ID ORDER BY 3 DESC LIMIT 1').split('\t');
const CUMUL = q(`SELECT SUM(d.int_PRICE) - SUM(d.int_PRICE_REMISE) ${ventes('2026-01-01', '2027-01-01', ` AND fa.str_CODE_FAMILLE = '${FAM}'`)}`);
const [RAYON_ID, RAYON] = q(`SELECT z.lg_ZONE_GEO_ID, z.str_LIBELLEE ${ventes(...MOIS).replace('WHERE', 'JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID WHERE')}`
  + ' GROUP BY z.lg_ZONE_GEO_ID ORDER BY COUNT(*) DESC LIMIT 1').split('\t');
const TOTAL_RAYON = q(`SELECT SUM(d.int_PRICE) - SUM(d.int_PRICE_REMISE) ${ventes(...MOIS, ` AND f.lg_ZONE_GEO_ID = '${RAYON_ID}'`)}`);

const DROIT = 'E2E-STATFAM';
const retirerDroit = () => q(`DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '${DROIT}'`);

(async () => {
  retirerDroit();
  q(`INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)`
    + ` SELECT '${DROIT}', ru.lg_ROLE_ID, pr.lg_PRIVELEGE_ID, NOW(), NOW() FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID`
    + ` JOIN t_privilege pr ON pr.str_NAME = 'P_SM_FAMI_STAT' WHERE u.str_LOGIN = 'admin'`
    + ` AND NOT EXISTS (SELECT 1 FROM t_role_privelege x WHERE x.lg_ROLE_ID = ru.lg_ROLE_ID AND x.lg_PRIVILEGE_ID = pr.lg_PRIVELEGE_ID)`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const grille = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('statfamilleartcl #familleStatGrid')[0], s = g.getStore();
    return { n: s.getCount(), charge: !s.isLoading(), total: Ext.ComponentQuery.query('statfamilleartcl #montantTtc')[0].getValue(),
      lignes: s.getRange().map((r) => ({ code: r.get('code'), ttc: r.get('MONTANT NET TTC'), achat: r.get('VALEUR ACHAT'), cumul: r.raw.montantCumulTTC })) }; });
  /* l'ecran lance une recherche a l'ouverture (dates du jour) : on attend la reponse de NOTRE periode, puis le magasin */
  const rechercher = async (rayon) => {
    const t = Date.now();
    const reponse = p.waitForResponse((r) => /statfamillearticle\?/.test(r.url()) && r.url().includes('dtStart=2026-09-01')
      && (!rayon || r.url().includes(rayon)), { timeout: 120000 });
    await cliquer(p, 'statfamilleartcl #rechercher');
    await reponse;
    await p.waitForFunction(() => !Ext.ComponentQuery.query('statfamilleartcl #familleStatGrid')[0].getStore().isLoading(), null, { timeout: 30000, polling: 50 });
    const ms = Date.now() - t;
    await p.waitForTimeout(300);
    return ms;
  };
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Statistique famille');
    const ouverture = p.waitForResponse((r) => /statfamillearticle\?/.test(r.url()), { timeout: 120000 });
    await p.waitForFunction(() => Ext.ComponentQuery.query('statfamilleartcl').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await ouverture;
    await p.waitForTimeout(800);
    await saisir(p, 'statfamilleartcl #dtStart', '01/09/2026');
    await saisir(p, 'statfamilleartcl #dtEnd', '30/09/2026');
    const ms = await rechercher();
    let g = await grille();
    ok('Septembre : la grille se remplit en moins de 6 s', ms < MAX_MS, ms + ' ms');
    ok('Une ligne par famille vendue', g.n === Number(NB), g.n + ' / ' + NB);
    const l = g.lignes.find((x) => x.code === FAM);
    ok('Famille la plus vendue (' + LIB + ') : TTC, achat et cumul de l\'année = base', l && l.ttc === Number(TTC) && l.achat === Number(ACHAT) && l.cumul === Number(CUMUL),
      JSON.stringify(l) + ' / ' + [TTC, ACHAT, CUMUL].join(' '));
    ok('Total TTC du bas de l\'écran = base', Number(g.total) === Number(TOTAL), g.total + ' / ' + TOTAL);

    /* choisir un rayon relance la recherche (select) ; le bouton aussi : on mesure la reponse filtree */
    const filtree = p.waitForResponse((r) => /statfamillearticle\?/.test(r.url()) && r.url().includes(RAYON_ID), { timeout: 120000 });
    await choisir(p, 'statfamilleartcl #rayons', RAYON);
    await filtree;
    const ms2 = await rechercher(RAYON_ID);
    g = await grille();
    ok('Filtre rayon « ' + RAYON + ' » : moins de 6 s, total = base', ms2 < MAX_MS && Number(g.total) === Number(TOTAL_RAYON), ms2 + ' ms ; ' + g.total + ' / ' + TOTAL_RAYON);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirerDroit();
    ok('Droit temporaire retiré', q(`SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '${DROIT}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
