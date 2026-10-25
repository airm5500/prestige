/* ANALYSE DE GESTION > « CA par emplacement » et « CA par grossiste » : LENTEUR (19/10).
 *
 * Sur le banc (3 ans de ventes), un mois prenait 13 a 16 s et un trimestre 19 s : meme cause que « Statistique
 * famille » (sommes en criteres JPA qui relisent toutes les lignes de vente des articles, puis une requete par rayon ou
 * par grossiste sur l'annee).
 * Par les vues, pour chacun des deux ecrans : menu, periode de septembre 2026 saisie au clavier, bouton Rechercher.
 *  - la grille se remplit en moins de 6 s ;
 *  - une ligne par rayon (ou grossiste) vendu ; montant TTC, achat et cumul TTC de l'annee du premier = base (SQL
 *    independant) ; total TTC du bas de l'ecran = base ;
 *  - filtre (grossiste sur l'ecran des rayons, rayon sur l'ecran des grossistes) : moins de 6 s, total = base ;
 *  - puis filtre sur la dimension de l'ecran (une seule ligne) : moins de 6 s, cumul de l'annee et total = base. Sur
 *    le banc, l'emplacement « Default » porte moins du quart des articles (cumul calcule seul) et le grossiste le plus
 *    vendu plus du quart (cumul groupe) : les deux chemins sont parcourus.
 *  - aucune erreur JavaScript.
 * Les deux ecrans exigent P_SM_RAYONS_PRODUITS_STAT et P_SM_PROVIDERS_PRODUITS_STAT, absents du role administrateur du
 * banc : le test les donne le temps du parcours (lignes E2E-STATRAY, E2E-STATGRO) et les retire. Aucune autre ecriture.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir, choisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MAX_MS = 6000;
const EMP = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = 'admin'");
const ventes = (debut, fin, plus) => `FROM t_preenregistrement p JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID`
  + ` JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID`
  + ` JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID`
  + ` WHERE p.dt_UPDATED >= '${debut}' AND p.dt_UPDATED < '${fin}'`
  + ` AND u.lg_EMPLACEMENT_ID = '${EMP}' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'` + (plus || '');
const MOIS = ['2026-09-01', '2026-10-01'];
const SOMME = 'SUM(d.int_PRICE) - SUM(d.int_PRICE_REMISE)';

/* un ecran : sa dimension (z ou g), sa colonne d'identifiant, son filtre croise (l'autre dimension) */
const ECRANS = [
  { menu: 'CA par emplacement', xtype: 'statistiqueRayons', url: 'statisticrayons', dim: 'z', id: 'lg_ZONE_GEO_ID',
    lib: 'str_LIBELLEE', filtre: { combo: 'grossiste', dim: 'g', id: 'lg_GROSSISTE_ID', lib: 'str_LIBELLE' } },
  { menu: 'CA par grossiste', xtype: 'statistiqueProvider', url: 'statisticprovider', dim: 'g', id: 'lg_GROSSISTE_ID',
    lib: 'str_LIBELLE', filtre: { combo: 'rayons', dim: 'z', id: 'lg_ZONE_GEO_ID', lib: 'str_LIBELLEE' } }
];
for (const e of ECRANS) {
  e.nb = q(`SELECT COUNT(DISTINCT ${e.dim}.${e.id}) ${ventes(...MOIS)}`);
  e.total = q(`SELECT ${SOMME} ${ventes(...MOIS)}`);
  [e.premier, e.code, e.libelle, e.ttc, e.achat] = q(`SELECT ${e.dim}.${e.id}, ${e.dim}.str_CODE, ${e.dim}.${e.lib}, ${SOMME}, SUM(d.prixAchat * d.int_QUANTITY)`
    + ` ${ventes(...MOIS)} GROUP BY ${e.dim}.${e.id} ORDER BY 4 DESC LIMIT 1`).split('\t');
  e.cumul = q(`SELECT ${SOMME} ${ventes('2026-01-01', '2027-01-01', ` AND ${e.dim}.${e.id} = '${e.premier}'`)}`);
  const f = e.filtre;
  [f.valeur, f.libelle] = q(`SELECT ${f.dim}.${f.id}, ${f.dim}.${f.lib} ${ventes(...MOIS)} GROUP BY ${f.dim}.${f.id} ORDER BY COUNT(*) DESC LIMIT 1`).split('\t');
  f.total = q(`SELECT ${SOMME} ${ventes(...MOIS, ` AND ${f.dim}.${f.id} = '${f.valeur}'`)}`);
  e.totalDeux = q(`SELECT ${SOMME} ${ventes(...MOIS, ` AND ${f.dim}.${f.id} = '${f.valeur}' AND ${e.dim}.${e.id} = '${e.premier}'`)}`);
}

const DROITS = { 'E2E-STATRAY': 'P_SM_RAYONS_PRODUITS_STAT', 'E2E-STATGRO': 'P_SM_PROVIDERS_PRODUITS_STAT' };
const retirerDroits = () => q(`DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE IN ('${Object.keys(DROITS).join("','")}')`);

(async () => {
  retirerDroits();
  for (const [ligne, droit] of Object.entries(DROITS)) {
    q(`INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)`
      + ` SELECT '${ligne}', ru.lg_ROLE_ID, pr.lg_PRIVELEGE_ID, NOW(), NOW() FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID`
      + ` JOIN t_privilege pr ON pr.str_NAME = '${droit}' WHERE u.str_LOGIN = 'admin'`
      + ` AND NOT EXISTS (SELECT 1 FROM t_role_privelege x WHERE x.lg_ROLE_ID = ru.lg_ROLE_ID AND x.lg_PRIVILEGE_ID = pr.lg_PRIVELEGE_ID)`);
  }
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, 'admin', 'e2etest');
    for (const e of ECRANS) {
      const X = e.xtype;
      const grille = () => p.evaluate((X) => { const g = Ext.ComponentQuery.query(X + ' gridpanel')[0], s = g.getStore();
        return { n: s.getCount(), total: Ext.ComponentQuery.query(X + ' #montantTtc')[0].getValue(),
          lignes: s.getRange().map((r) => ({ code: r.raw.code, ttc: r.raw['MONTANT NET TTC'], achat: r.raw['VALEUR ACHAT'], cumul: r.raw.montantCumulTTC })) }; }, X);
      /* l'ecran lance une recherche a l'ouverture (dates du jour) : on attend la reponse de NOTRE periode */
      const rechercher = async (filtre) => {
        const t = Date.now();
        const reponse = p.waitForResponse((r) => r.url().includes(e.url + '?') && r.url().includes('dtStart=2026-09-01')
          && (!filtre || r.url().includes(filtre)), { timeout: 120000 });
        await cliquer(p, X + ' #rechercher');
        await reponse;
        await p.waitForFunction((X) => !Ext.ComponentQuery.query(X + ' gridpanel')[0].getStore().isLoading(), X, { timeout: 30000, polling: 50 });
        const ms = Date.now() - t;
        await p.waitForTimeout(300);
        return ms;
      };
      const ouverture = p.waitForResponse((r) => r.url().includes(e.url + '?'), { timeout: 120000 });
      await ouvrirMenu(p, 'ANALYSE DE GESTION', e.menu);
      await p.waitForFunction((X) => Ext.ComponentQuery.query(X).some((c) => c.isVisible(true)), X, { timeout: 60000 });
      await ouverture;
      await p.waitForTimeout(800);
      await saisir(p, X + ' #dtStart', '01/09/2026');
      await saisir(p, X + ' #dtEnd', '30/09/2026');
      const ms = await rechercher();
      let g = await grille();
      ok(e.menu + ', septembre : la grille se remplit en moins de 6 s', ms < MAX_MS, ms + ' ms');
      ok(e.menu + ' : une ligne par ' + (e.dim === 'z' ? 'emplacement' : 'grossiste') + ' vendu', g.n === Number(e.nb), g.n + ' / ' + e.nb);
      const l = g.lignes.find((x) => x.code === e.code);
      ok(e.menu + ' : « ' + e.libelle + ' » TTC, achat et cumul de l\'année = base', l && l.ttc === Number(e.ttc) && l.achat === Number(e.achat) && l.cumul === Number(e.cumul),
        JSON.stringify(l) + ' / ' + [e.ttc, e.achat, e.cumul].join(' '));
      ok(e.menu + ' : total TTC du bas de l\'écran = base', Number(g.total) === Number(e.total), g.total + ' / ' + e.total);

      /* choisir dans la liste relance la recherche (select) ; le bouton aussi : on mesure la reponse filtree */
      const f = e.filtre;
      const filtree = p.waitForResponse((r) => r.url().includes(e.url + '?') && r.url().includes(f.valeur), { timeout: 120000 });
      await choisir(p, X + ' #' + f.combo, f.libelle);
      await filtree;
      const ms2 = await rechercher(f.valeur);
      g = await grille();
      ok(e.menu + ', filtre « ' + f.libelle + ' » : moins de 6 s, total = base', ms2 < MAX_MS && Number(g.total) === Number(f.total), ms2 + ' ms ; ' + g.total + ' / ' + f.total);

      const propre = e.dim === 'z' ? 'rayons' : 'grossiste';
      const seule = p.waitForResponse((r) => r.url().includes(e.url + '?') && r.url().includes(e.premier) && r.url().includes(f.valeur), { timeout: 120000 });
      await choisir(p, X + ' #' + propre, e.libelle);
      await seule;
      const ms3 = await rechercher(e.premier);
      g = await grille();
      const s1 = g.lignes[0];
      ok(e.menu + ', plus filtre « ' + e.libelle + ' » : une ligne en moins de 6 s, cumul de l\'année et total = base',
        ms3 < MAX_MS && g.n === 1 && s1.code === e.code && s1.cumul === Number(e.cumul) && Number(g.total) === Number(e.totalDeux),
        ms3 + ' ms ; ' + JSON.stringify(s1) + ' ; ' + g.total + ' / ' + e.cumul + ' ' + e.totalDeux);
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirerDroits();
    ok('Droits temporaires retirés', q(`SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE IN ('${Object.keys(DROITS).join("','")}')`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
