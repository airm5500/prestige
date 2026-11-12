/* DETAIL ARTICLE : la fiche n'est plus calculee deux fois (lenteurs d'appaul, journal du 12/11) — lecture seule.
 *
 * Constat : a 00:50, « Détail sur l'article » a demande produit-search/produits/{id} (10,5 s) puis, la fenetre ouverte,
 * produit-search/fiche?produitId= (10,4 s) : les deux routes font exactement le meme calcul (buildProduitData : stock,
 * derniere vente, inventaire, entree, peremption, commandes...). La fenetre reprend maintenant la fiche deja recue.
 *  - rapprochement : pour des articles tires au hasard (graine fixe : tres vendu, jamais vendu, deconditionne, en
 *    reserve), produits/{id} et fiche?produitId= renvoient la meme fiche, champ par champ ;
 *  - ecran (liste des articles, recherche par CIP, « Détail sur l'article ») : un seul calcul de la fiche par
 *    ouverture (produits/{id}), aucun fiche?produitId= ; les champs affiches (CIP, designation, stock, derniere vente,
 *    derniere entree, date de livraison, inventaire) sont ceux de la fiche recue ;
 *  - liste : la touche Entree ne lance qu'une recherche (la pause de frappe qui suit ne recalcule pas la meme liste) ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const un = (s) => (q(s).split(/\r?\n/)[0] || '').split('\t');

/* jeu varie : article le plus vendu, articles tires au hasard (graine fixe), jamais vendu, deconditionne, en reserve */
const articles = [];
const ajouter = (l, quoi) => { if (l[0] && !articles.some((a) => a.id === l[0])) { articles.push({ id: l[0], cip: l[1], quoi }); } };
ajouter(un("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f JOIN t_preenregistrement_detail d ON d.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " WHERE f.str_STATUT = 'enable' AND d.dt_CREATED > NOW() - INTERVAL 90 DAY GROUP BY f.lg_FAMILLE_ID ORDER BY COUNT(*) DESC LIMIT 1"), 'très vendu');
q("SELECT lg_FAMILLE_ID, int_CIP FROM t_famille WHERE str_STATUT = 'enable' ORDER BY CRC32(CONCAT(lg_FAMILLE_ID, '20261112')) LIMIT 6")
  .split(/\r?\n/).forEach((l) => ajouter(l.split('\t'), 'au hasard'));
ajouter(un("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f WHERE f.str_STATUT = 'enable' AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d"
  + " WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID) ORDER BY CRC32(f.lg_FAMILLE_ID) LIMIT 1"), 'jamais vendu');
ajouter(un("SELECT lg_FAMILLE_ID, int_CIP FROM t_famille WHERE str_STATUT = 'enable' AND bool_DECONDITIONNE = 1 ORDER BY CRC32(lg_FAMILLE_ID) LIMIT 1"), 'déconditionné');
ajouter(un("SELECT lg_FAMILLE_ID, int_CIP FROM t_famille WHERE str_STATUT = 'enable' AND bool_DECONDITIONNE_EXIST = 1 ORDER BY CRC32(lg_FAMILLE_ID) LIMIT 1"), 'avec déconditionné');
ajouter(un("SELECT lg_FAMILLE_ID, int_CIP FROM t_famille WHERE str_STATUT = 'enable' AND bool_RESERVE = 1 ORDER BY CRC32(lg_FAMILLE_ID) LIMIT 1"), 'en réserve');

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const erreurs = [], appels = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('request', (r) => { const u = r.url(); if (/produit-search\/(produits\/|fiche)/.test(u)) { appels.push(u.replace(/^.*produit-search\//, '').replace(/_dc=\d+&?/, '').replace(/[?&]$/, '')); } });
  try {
    ok('Jeu d\'essai : ' + articles.length + ' articles variés', articles.length >= 8, articles.map((a) => a.quoi).join(', '));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* rapprochement : les deux routes, champ par champ */
    for (const a of articles) {
      const r = await p.evaluate(async (id) => {
        const un = await (await fetch('../api/v1/produit-search/produits/' + id)).json();
        const liste = await (await fetch('../api/v1/produit-search/fiche?produitId=' + encodeURIComponent(id))).json();
        return { un: un.data, deux: liste.results && liste.results[0] };
      }, a.id);
      const cles = Object.keys(r.un || {}).sort();
      const ecarts = cles.filter((k) => JSON.stringify(r.un[k]) !== JSON.stringify((r.deux || {})[k]));
      const enTrop = Object.keys(r.deux || {}).filter((k) => !(k in (r.un || {})));
      ok('Même fiche par produits/{id} et fiche?produitId= : ' + a.quoi + ' (' + a.cip + ', ' + cles.length + ' champs)',
        cles.length > 20 && ecarts.length === 0 && enTrop.length === 0, ecarts.concat(enTrop).slice(0, 5).join(', '));
      a.fiche = r.un;
    }

    /* ecran : liste des articles, recherche par CIP, Detail */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 30000 });
    for (const a of articles.slice(0, 4)) {
      await p.click('#' + await p.evaluate(() => Ext.getCmp('rechecher').inputEl.dom.id));
      await p.fill('#' + await p.evaluate(() => Ext.getCmp('rechecher').inputEl.dom.id), a.cip);
      appels.length = 0;
      await p.keyboard.press('Enter');
      await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', id) >= 0; }, a.id, { timeout: 60000 });
      await p.waitForTimeout(1500); // au-dela de la pause de frappe (600 ms)
      const recherches = appels.filter((u) => /^fiche\?search_value=/.test(u));
      ok('Écran, ' + a.quoi + ' : une seule recherche de la liste pour la touche Entrée', recherches.length === 1, recherches.length + ' : ' + recherches.join(' , ').slice(0, 120));
      appels.length = 0;
      /* meme action que l'icone « Détail sur l'article » de la ligne */
      await p.evaluate((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onDetailClick(g, g.getStore().findExact('lg_FAMILLE_ID', id)); }, a.id);
      await p.waitForFunction(() => { const c = Ext.getCmp('str_DESCRIPTION'); return c && c.isVisible(true) && c.getValue(); }, null, { timeout: 60000 });
      await p.waitForTimeout(2500);
      const vu = await p.evaluate(() => {
        const v = (id) => { const c = Ext.getCmp(id); return c ? String(c.getValue() === null || c.getValue() === undefined ? '' : c.getValue()) : '(absent)'; };
        return { cip: v('int_CIP'), nom: v('str_DESCRIPTION'), stock: v('int_NUMBER_AVAILABLE'), vente: v('dt_LAST_VENTE'), entree: v('dt_LAST_ENTREE'),
          livraison: v('dt_DATE_LIVRAISON'), inventaire: v('dt_LAST_INVENTAIRE'), chargement: !!(Ext.ComponentQuery.query('window[title^=Detail]')[0] || {}).loadMask };
      });
      const unSeul = appels.filter((u) => /^produits\//.test(u)).length === 1 && appels.filter((u) => /^fiche\?produitId=/.test(u)).length === 0;
      ok('Écran, ' + a.quoi + ' : une seule demande de la fiche à l\'ouverture', unSeul, appels.join(' , '));
      const f = a.fiche || {};
      const memes = vu.cip === String(f.int_CIP) && vu.nom === String(f.str_DESCRIPTION || f.str_NAME) && vu.stock === String(f.int_NUMBER_AVAILABLE)
        && vu.entree === String(f.dt_LAST_ENTREE || '') && vu.livraison === String(f.dt_DATE_LIVRAISON || '') && vu.inventaire === String(f.dt_LAST_INVENTAIRE || '')
        && (f.dt_LAST_VENTE ? vu.vente.indexOf(f.dt_LAST_VENTE) === 0 : /Jamais vendu/.test(vu.vente));
      ok('Écran, ' + a.quoi + ' : champs affichés = fiche reçue (CIP, désignation, stock, vente, entrée, livraison, inventaire)', memes,
        JSON.stringify(vu) + ' / ' + JSON.stringify({ cip: f.int_CIP, stock: f.int_NUMBER_AVAILABLE, vente: f.dt_LAST_VENTE, entree: f.dt_LAST_ENTREE, livraison: f.dt_DATE_LIVRAISON, inventaire: f.dt_LAST_INVENTAIRE }));
      await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => /Detail sur l'article/.test(w.title || '')).forEach((w) => w.close()));
      await p.waitForTimeout(500);
    }
    ok('Aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
