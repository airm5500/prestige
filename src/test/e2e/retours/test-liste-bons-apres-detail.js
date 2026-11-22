/* LISTE DES BONS : RECHERCHE APRES LE DETAIL D'UNE VENTE (journal d'appaul du 21/11, N3).
 *
 * L'ecran « Liste des bons » (facturesubrogatoire) relancait sa recherche, au choix d'un tiers payant et a la touche
 * Entree dans le champ de recherche, par la variable globale Me. La fenetre « Detail des produits de la vente »
 * (detailProduct.js), ouverte par l'icone de detail d'une ligne, reecrit cette meme variable : apres son ouverture, la
 * recherche partait dans la fenetre de detail (detruite a sa fermeture) et l'ecran levait une erreur JavaScript ; la
 * liste n'etait plus filtree.
 *
 * Parcours reel (compte e2e) : GESTION COURANTE > « Liste des bons », periode du dernier mois qui a des bons, bouton
 * « rechercher », icone de detail de la premiere ligne, fermeture de la fenetre, puis :
 *  1. choix d'un tiers payant dans la liste : une requete part avec ce tiers payant, lignes affichees = lignes
 *     renvoyees, toutes de ce tiers payant (rapprochement ecran = reponse = base) ;
 *  2. Entree dans le champ de recherche avec une reference : une requete part avec cette reference, la vente est
 *     affichee ;
 *  3. detail rouvert puis laisse ouvert : le choix d'un autre tiers payant recharge bien la liste, pas le detail ;
 *  4. aucune erreur JavaScript ; bilan : aucune donnee modifiee (ecran en lecture seule).
 * Seuls des nombres, des references de vente et des noms d'organismes sont lus ; aucun nom de client.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const bilan = () => q("SELECT CONCAT((SELECT COUNT(*) FROM t_preenregistrement), '/', (SELECT COUNT(*) FROM t_preenregistrement_detail), '/',"
  + " (SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent), '/', (SELECT COUNT(*) FROM t_tiers_payant))");
const fr = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);

(async () => {
  /* periode : le dernier mois qui a des bons de plusieurs tiers payants */
  const mois = q("SELECT DATE_FORMAT(dt_UPDATED, '%Y-%m-01') FROM v_facture_subrogatoire GROUP BY 1"
    + " HAVING COUNT(DISTINCT lg_TIERS_PAYANT_ID) > 1 ORDER BY 1 DESC LIMIT 1");
  if (!mois) { ok('Données : un mois avec des bons de plusieurs tiers payants', false, 'aucun dans ' + ENV_E2E.BASE); process.exit(1); }
  const fin = q("SELECT LAST_DAY('" + mois + "')");
  const periode = "dt_UPDATED >= '" + mois + "' AND dt_UPDATED < '" + mois + "' + INTERVAL 1 MONTH";
  /* deux tiers payants de la periode, aux noms distincts */
  const tps = q("SELECT CONCAT(v.lg_TIERS_PAYANT_ID, '/', COUNT(*)) FROM v_facture_subrogatoire v JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = v.lg_TIERS_PAYANT_ID"
    + " WHERE " + periode.replace(/dt_UPDATED/g, "v.dt_UPDATED") + " GROUP BY v.lg_TIERS_PAYANT_ID HAVING COUNT(*) BETWEEN 1 AND 20 AND COUNT(DISTINCT t.str_FULLNAME) = 1"
    + " AND (SELECT COUNT(*) FROM t_tiers_payant t2 WHERE t2.str_FULLNAME = MAX(t.str_FULLNAME)) = 1 ORDER BY COUNT(*) DESC LIMIT 2").split('\n').map((l) => l.split('/'));
  const nom = (id) => q("SELECT str_FULLNAME FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '" + id + "'");
  const avant = bilan();

  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const liste = /api\/v1\/facture-subrogatoire\/liste/;
  /* attend la reponse de la liste declenchee par l'action ; null si aucune requete ne part */
  const charger = async (action) => {
    const attente = p.waitForResponse((r) => liste.test(r.url()), { timeout: 20000 }).catch(() => null);
    await action();
    const rep = await attente;
    if (!rep) { return null; }
    await p.waitForTimeout(600);
    const corps = await rep.json().catch(() => ({}));
    const params = new URL(rep.url()).searchParams;
    const ecran = await p.evaluate(() => Ext.getCmp('Grid_Prevente_ID').getStore().getRange().map((r) => [r.get('lg_PREENREGISTREMENT_ID'), r.get('str_REF')].join('|')));
    return { params, renvoyees: (corps.results || []).map((r) => [r.lg_PREENREGISTREMENT_ID, r.str_REF].join('|')), ecran, total: corps.total };
  };
  const ouvrirDetail = async () => {
    const icone = p.locator('#Grid_Prevente_ID .x-grid-row .x-action-col-icon').filter({ visible: true }).first();
    await icone.click();
    await p.waitForFunction(() => !!Ext.getCmp('cltwinID') && Ext.getCmp('cltwinID').isVisible(), null, { timeout: 15000 });
    await p.waitForTimeout(800);
  };
  const choisirTp = async (id) => {
    const libelle = nom(id);
    await cliquer(p, '#lg_TIERS_PAYANT_ID');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(libelle.slice(0, 6), { delay: 40 });
    const item = p.locator('.x-boundlist-item').filter({ visible: true }).filter({ hasText: libelle }).first();
    await item.waitFor({ timeout: 15000 });
    return charger(() => item.click());
  };
  const memes = (r) => r && r.ecran.length === r.renvoyees.length && r.ecran.every((x, i) => x === r.renvoyees[i]);
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION COURANTE', 'Liste des bons');
    await p.waitForFunction(() => { const g = Ext.getCmp('Grid_Prevente_ID'); return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await saisir(p, '#dt_debut_journal', fr(mois));
    await saisir(p, '#dt_fin_journal', fr(fin));
    const r0 = await charger(() => p.locator('a.x-btn, .x-btn').filter({ visible: true }).filter({ hasText: /^\s*rechercher\s*$/ }).first().click());
    const enBase = q("SELECT COUNT(*) FROM (SELECT DISTINCT lg_PREENREGISTREMENT_ID FROM v_facture_subrogatoire WHERE " + periode + ") x");
    ok('Recherche de la période : lignes affichées = lignes renvoyées, des bons présents', r0 && r0.ecran.length > 0 && memes(r0),
      r0 && `${r0.ecran.length} affichées / ${r0.renvoyees.length} renvoyées, total ${r0.total}, base ${enBase} ventes`);

    await ouvrirDetail();
    await p.evaluate(() => { Ext.getCmp('cltwinID').close(); });
    await p.waitForTimeout(800);

    /* 1. choix d'un tiers payant apres le detail */
    const [idA, nA] = tps[0];
    const r1 = await choisirTp(idA);
    const lignesA = r1 && q("SELECT COUNT(*) FROM v_facture_subrogatoire WHERE " + periode + " AND lg_TIERS_PAYANT_ID = '" + idA + "'");
    ok('Après le détail, choix d\'un tiers payant : la liste est rechargée avec ce tiers payant', r1 && r1.params.get('lg_TIERS_PAYANT_ID') === idA,
      r1 ? r1.params.get('lg_TIERS_PAYANT_ID') : 'aucune requête de liste');
    ok('Tiers payant : lignes affichées = lignes renvoyées = bons du tiers payant en base', r1 && memes(r1) && r1.ecran.length > 0 && String(r1.total) === lignesA,
      r1 && `${r1.ecran.length} / ${r1.renvoyees.length}, total ${r1.total}, base ${lignesA} (attendu ${nA})`);

    /* 2. Entree dans le champ de recherche, avec la reference d'une vente vue a l'ecran (derniere ligne de la periode) */
    const ref = r0.ecran[r0.ecran.length - 1].split('|')[1];
    await p.evaluate(() => { Ext.getCmp('lg_TIERS_PAYANT_ID').clearValue(); });
    await cliquer(p, '#rechecher');
    await p.keyboard.type(ref, { delay: 20 });
    const r2 = await charger(() => p.keyboard.press('Enter'));
    ok('Après le détail, Entrée dans la recherche : la liste est rechargée avec la référence', r2 && r2.params.get('search_value') === ref
      && r2.ecran.some((x) => x.split('|')[1] === ref) && memes(r2), r2 ? `${r2.params.get('search_value')} : ${r2.ecran.length} ligne(s)` : 'aucune requête de liste');

    /* 3. detail laisse ouvert, autre tiers payant */
    await p.evaluate(() => { Ext.getCmp('rechecher').setValue(''); });
    await cliquer(p, 'button[text=rechercher]').catch(() => p.locator('.x-btn').filter({ visible: true }).filter({ hasText: /^\s*rechercher\s*$/ }).first().click());
    await p.waitForTimeout(1500);
    await ouvrirDetail();
    const detailAvant = await p.evaluate(() => Ext.getCmp('CltgridpanelID').getStore().getCount());
    await p.evaluate(() => { Ext.getCmp('cltwinID').hide(); });
    const idB = (tps[1] || tps[0])[0];
    const r3 = await choisirTp(idB);
    ok('Détail encore en mémoire, autre tiers payant : la liste est rechargée, pas le détail', r3 && r3.params.get('lg_TIERS_PAYANT_ID') === idB && memes(r3),
      r3 ? `${r3.params.get('lg_TIERS_PAYANT_ID')} : ${r3.ecran.length} ligne(s), détail ${detailAvant} ligne(s)` : 'aucune requête de liste');
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    await b.close();
  }
  ok('Bilan : aucune donnée modifiée', bilan() === avant, avant + ' -> ' + bilan());
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
