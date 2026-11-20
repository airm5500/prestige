/* PLAN DU 19/11, POINT 4 : INVENTAIRE, FILTRE « VENDUS APRES LA CREATION » : UNE SEULE REQUETE, AFFICHAGE RAPIDE.
 *
 * Constat : au choix d'un filtre, l'ecran envoyait deux fois la meme requete (load() puis loadPage(1)) ; cote serveur,
 * le EXISTS correle sur toutes les ventes de chaque produit etait execute pour le compte puis pour la liste, meme
 * quand le resultat est vide.
 *
 * Verifie :
 *  - par l'ecran (menu Inventaire, « Editer », choix du filtre) : UNE requete « inventaire/detail » par choix du
 *    filtre (« Vendus après la création », puis « Tous »), et pour le choix d'une famille ;
 *  - inventaire sans vente depuis sa creation (E2E-VA0, cree maintenant, 5 000 lignes d'un inventaire reel) : 0 ligne,
 *    reponse sous le plafond ;
 *  - mesure (mediane de 3 appels, page de 30 comme l'ecran) sur le plus gros inventaire reel et sur E2E-VA0 ;
 *  - rapprochement : total = nombre de lignes de la liste complete (limit 100 000), sur l'inventaire reel.
 * La justesse du filtre (lignes et quantites = base, 4 inventaires reels) reste verifiee par
 * test-filtre-vendus-apres-creation-1011.js.
 * Jeu d'essai retire a la fin. Lancement seul : node src/test/e2e/inventaire/test-inventaire-vendus-apres-une-requete-1911.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const ID = 'E2E-VA0';
const PLAFOND_VIDE_MS = Number(process.env.PLAFOND_VIDE_MS || 1500);
const LIBELLE = 'Vendus après la création de l\'inventaire';
const REEL = q("SELECT i.lg_INVENTAIRE_ID FROM t_inventaire i JOIN t_inventaire_famille f ON f.lg_INVENTAIRE_ID = i.lg_INVENTAIRE_ID WHERE i.str_STATUT = 'enable' AND f.bool_INVENTAIRE = 1 AND i.lg_INVENTAIRE_ID <> 'E2E-VA0' GROUP BY i.lg_INVENTAIRE_ID ORDER BY COUNT(*) DESC LIMIT 1");
const nettoyer = () => q(`DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '${ID}'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${ID}';`);

(async () => {
  let b = null;
  const err = [];
  try {
    nettoyer();
    q(`INSERT INTO t_inventaire (lg_INVENTAIRE_ID, str_NAME, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, lg_EMPLACEMENT_ID)
      SELECT '${ID}', 'E2E vendus apres (vide)', 'E2E une requete', 'emplacement', 'enable', NOW(), NOW(), lg_USER_ID, '1' FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}';
      INSERT INTO t_inventaire_famille (lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, str_STATUT, dt_CREATED, dt_UPDATED, bool_INVENTAIRE, str_UPDATED_ID, lg_FAMILLE_STOCK_ID)
      SELECT '${ID}', lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, 'enable', NOW(), NULL, 1, '', lg_FAMILLE_STOCK_ID FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '${REEL}' AND bool_INVENTAIRE = 1 ORDER BY lg_INVENTAIRE_FAMILLE_ID LIMIT 5000;`);
    const nLignes = Number(q(`SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '${ID}'`));
    ok('Jeu d\'essai : inventaire E2E-VA0 créé maintenant, ' + nLignes + ' lignes d\'un inventaire réel (' + REEL + ')', nLignes >= 1000, nLignes);

    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    const appels = [];
    p.on('request', (r) => { if (r.url().includes('inventaire/detail')) { appels.push(r.url()); } });
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'inventaire', true); return r ? [r.parentNode.get('text'), r.get('text')] : null; });
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('inventaire')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_INVENTAIRE_ID', id) >= 0; }, ID, { timeout: 60000 });
    const edit = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('inventaire')[0];
      const col = g.headerCt.getGridColumns().find((c) => Array.isArray(c.items) && c.items.some((x) => x.handler === g.onEditClick));
      const n = g.getView().getNode(g.getStore().findExact('lg_INVENTAIRE_ID', id)); const td = n && col && n.querySelector('.x-grid-cell-' + col.getId());
      const i = td && (td.querySelector('.x-action-col-icon') || td.querySelector('img')); if (!i) { return null; } i.id = i.id || 'e2e-edit-inv'; return '#' + i.id; }, ID);
    await p.click(edit);
    const grille = () => p.waitForFunction(() => { const g = Ext.getCmp('gridpanelInventaireID'); return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 120000 });
    await grille();
    await p.waitForTimeout(1500);

    /* 1. choix du filtre : une seule requete */
    appels.length = 0;
    const t0 = Date.now();
    await V.choisir(p, '#str_TYPE', LIBELLE);
    await p.waitForTimeout(300);
    await grille();
    const dureeEcran = Date.now() - t0;
    await p.waitForTimeout(1500);
    const vendus = appels.filter((u) => u.includes('str_TYPE=VENDUS_APRES'));
    const total = await p.evaluate(() => Ext.getCmp('gridpanelInventaireID').getStore().getTotalCount());
    console.log('MESURE  écran, choix du filtre (inventaire sans vente, ' + nLignes + ' lignes) : ' + dureeEcran + ' ms, ' + vendus.length + ' requête(s)');
    ok('Choix du filtre « Vendus après » : une seule requête', vendus.length === 1 && appels.length === 1, appels.join(' | '));
    ok('Inventaire créé maintenant : 0 ligne', total === 0, total);
    appels.length = 0;
    await V.choisir(p, '#str_TYPE', 'Tous');
    await p.waitForTimeout(300);
    await grille();
    await p.waitForTimeout(1500);
    ok('Retour à « Tous » : une seule requête', appels.length === 1, appels.join(' | '));

    /* 2. mesures de l'API (page de 30, comme l'ecran) */
    const mesurer = (id, type, limit) => p.evaluate(async (x) => {
      const u = '../api/v1/inventaire/detail?lg_INVENTAIRE_ID=' + x.id + '&str_TYPE=' + x.type + '&search_value=&lg_FAMILLEARTICLE_ID=&lg_ZONE_GEO_ID=&lg_GROSSISTE_ID=&lg_USER_ID=&page=1&start=0&limit=' + x.limit;
      const d = []; let j = null;
      for (let i = 0; i < 3; i++) { const t = performance.now(); j = await (await fetch(u)).json(); d.push(Math.round(performance.now() - t)); }
      d.sort((a, c) => a - c);
      return { median: d[1], total: j.total, n: j.results.length };
    }, { id, type, limit });
    const vide = await mesurer(ID, 'VENDUS_APRES', 30);
    const reel = await mesurer(REEL, 'VENDUS_APRES', 30);
    console.log('MESURE  API VENDUS_APRES, inventaire sans vente (' + nLignes + ' lignes) : ' + vide.median + ' ms, total ' + vide.total);
    console.log('MESURE  API VENDUS_APRES, inventaire réel ' + REEL + ' : ' + reel.median + ' ms, total ' + reel.total);
    ok('Inventaire sans vente : réponse sous ' + PLAFOND_VIDE_MS + ' ms', vide.total === 0 && vide.median < PLAFOND_VIDE_MS, JSON.stringify(vide));
    const complet = await mesurer(REEL, 'VENDUS_APRES', 100000);
    ok('Rapprochement : total de la page = lignes de la liste complète (inventaire réel)', reel.total === complet.n && complet.total === complet.n && reel.n === Math.min(30, reel.total), JSON.stringify({ reel, complet: { total: complet.total, n: complet.n } }));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    nettoyer();
    ok('Jeu d\'essai retiré', q(`SELECT COUNT(*) FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${ID}'`) === '0' && q(`SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '${ID}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
