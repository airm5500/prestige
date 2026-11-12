/* FICHE ARTICLE : ventes par mois du « Détail sur l'article » chargees directement ou a la demande (demande du 12/11).
 *
 * « peux tu l'inclure avec un parametre ? par defaut a 0 pour dire calcul direct et 1 pour a la demande ».
 * Constat (copie d'appaul) : 4,9 s sur les 5,2 s d'ouverture du detail d'un article tres vendu viennent de
 * suivi-stock-vente/stat-vente-famille (quantites vendues par annee et par mois, depuis l'origine).
 *
 * Parametre KEY_FICHE_VENTES_MOIS_A_LA_DEMANDE :
 *  - 0 (defaut, ou parametre absent) : comme avant, les ventes par mois sont demandees a l'ouverture ;
 *  - 1 : rien n'est demande a l'ouverture ; le bouton « Afficher les ventes par mois » les charge.
 * Vrai chemin : liste des articles, recherche par CIP (touche Entree), icone « Détail sur l'article » (ou menu
 * « Autres actions »), clic sur le bouton. Jeu varie : article tres vendu, articles au hasard (graine fixe), jamais
 * vendu. Rapprochement : chaque ligne de la grille (annee, mois, total) = la base (memes regles que la fiche :
 * ventes cloturees, non annulees, de montant positif, hors type 5, quantite > 0). Le parametre est remis comme avant.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const un = (s) => (q(s).split('\n')[0] || '').split('\t');
const CLE = 'KEY_FICHE_VENTES_MOIS_A_LA_DEMANDE';
const MOIS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const articles = [];
const ajouter = (l, quoi) => { if (l[0] && l[1] && !articles.some((a) => a.id === l[0])) { articles.push({ id: l[0], cip: l[1], quoi }); } };
ajouter(un("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f JOIN t_preenregistrement_detail d ON d.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{6,8}$' AND d.dt_CREATED > NOW() - INTERVAL 90 DAY GROUP BY f.lg_FAMILLE_ID ORDER BY COUNT(*) DESC LIMIT 1"), 'très vendu');
q("SELECT lg_FAMILLE_ID, int_CIP FROM t_famille WHERE str_STATUT = 'enable' AND int_CIP REGEXP '^[0-9]{6,8}$' ORDER BY CRC32(CONCAT(lg_FAMILLE_ID, '1211')) LIMIT 2")
  .split('\n').forEach((l) => ajouter(l.split('\t'), 'au hasard'));
ajouter(un("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{6,8}$' AND NOT EXISTS"
  + " (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID) ORDER BY CRC32(f.lg_FAMILLE_ID) LIMIT 1"), 'jamais vendu');

/* la base, annee par annee : { annee: { January: qte, ... } } */
const base = (id) => {
  const r = {};
  q("SELECT YEAR(p.dt_UPDATED), MONTHNAME(p.dt_UPDATED), SUM(d.int_QUANTITY) FROM t_preenregistrement_detail d JOIN t_preenregistrement p"
    + " ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID WHERE d.lg_FAMILLE_ID = '" + id + "' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
    + " AND p.lg_TYPE_VENTE_ID <> '5' AND d.int_QUANTITY > 0 AND p.str_STATUT = 'is_Closed' GROUP BY 1, 2").split('\n').filter(Boolean)
    .forEach((l) => { const [a, m, n] = l.split('\t'); (r[a] = r[a] || {})[m] = Number(n); });
  return r;
};
const avant = q("SELECT COUNT(*) FROM t_parameters WHERE str_KEY = '" + CLE + "'") === '1' ? q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + CLE + "'") : null;
const poser = (v) => q(v === null ? "DELETE FROM t_parameters WHERE str_KEY = '" + CLE + "'"
  : "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES ('" + CLE + "', '" + v + "', 'essai', 'SYSTEME', 'enable')"
    + " ON DUPLICATE KEY UPDATE str_VALUE = '" + v + "'");

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], appels = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('request', (r) => { if (/suivi-stock-vente\/stat-vente-famille/.test(r.url())) { appels.push(new URL(r.url()).searchParams.get('lg_FAMILLE_ID')); } });
  const ligne = (cip) => p.locator('.x-grid-row').filter({ visible: true, hasText: cip }).first();
  const detail = async (a) => {
    const champ = '#' + await p.evaluate(() => Ext.getCmp('rechecher').inputEl.dom.id);
    await p.click(champ);
    await p.fill(champ, a.cip);
    await p.keyboard.press('Enter');
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', id) >= 0; }, a.id, { timeout: 60000 });
    const l = ligne(a.cip);
    await l.waitFor({ timeout: 30000 });
    appels.length = 0;
    const icone = l.locator('img[data-qtip="Détail sur l\'article"]');
    if (await icone.count() > 0) { await icone.first().click(); } else {
      await l.locator('.fa-action-plus').last().click();
      await p.locator('.x-menu-item').filter({ visible: true, hasText: 'Détail sur l\'article' }).first().click();
    }
    await p.waitForFunction(() => { const c = Ext.getCmp('str_DESCRIPTION'); return c && c.isVisible(true) && c.getValue(); }, null, { timeout: 60000 });
  };
  /* grille affichee : annee, mois (donnees de la ligne) et total (cellule affichee) */
  const grille = () => p.evaluate((mois) => {
    const g = Ext.getCmp('gridpanelStatVenteID'), v = g.getView();
    return g.getStore().getRange().map((r) => { const n = v.getNode(r); const cellules = n ? n.querySelectorAll('td') : [];
      return { annee: String(r.get('int_YEAR')), mois: mois.map((m) => parseInt(r.get(m), 10) || 0), total: cellules.length ? cellules[cellules.length - 1].textContent.replace(/\D/g, '') : null }; });
  }, MOIS);
  const rapprocher = async (a, mode) => {
    const g = await grille(), attendu = base(a.id);
    const ecarts = [];
    Object.keys(attendu).forEach((an) => { if (!g.some((x) => x.annee === an)) { ecarts.push(an + ' absente'); } });
    g.forEach((x) => { const m = MOIS.map((k) => (attendu[x.annee] || {})[k] || 0);
      if (JSON.stringify(m) !== JSON.stringify(x.mois)) { ecarts.push(x.annee + ' écran ' + x.mois.join(',') + ' / base ' + m.join(',')); }
      if (Number(x.total) !== m.reduce((s, n) => s + n, 0)) { ecarts.push(x.annee + ' total ' + x.total); } });
    ok('Rapprochement (' + mode + '), ' + a.quoi + ' : grille = base, année par année et mois par mois, total = somme (' + g.length + ' années)', ecarts.length === 0, ecarts.slice(0, 3).join(' ; '));
  };
  const fermer = () => p.evaluate(() => { const w = Ext.WindowManager.getActive(); if (w && !w.isXType('famillemanager') && w.close) { w.close(); } });
  try {
    ok('Jeu d\'essai : ' + articles.length + ' articles variés', articles.length >= 3, articles.map((a) => a.quoi).join(', '));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 30000 });

    for (const [valeur, mode] of [[null, 'paramètre absent'], ['0', 'paramètre à 0'], ['1', 'paramètre à 1']]) {
      poser(valeur);
      for (const a of (valeur === '1' ? articles : articles.slice(0, 2))) {
        await detail(a);
        await p.waitForTimeout(2500);
        const bouton = await p.evaluate(() => { const x = Ext.ComponentQuery.query('#afficherVentesMois')[0]; return !!x && x.isVisible(true); });
        if (valeur !== '1') {
          await p.waitForFunction(() => !Ext.getCmp('gridpanelStatVenteID').getStore().isLoading(), null, { timeout: 60000 });
          ok('Ouverture (' + mode + '), ' + a.quoi + ' : ventes par mois demandées une fois, directement, sans bouton', appels.length === 1 && appels[0] === a.id && !bouton, JSON.stringify({ appels, bouton }));
          await rapprocher(a, mode);
        } else {
          ok('Ouverture (' + mode + '), ' + a.quoi + ' : rien demandé, bouton « Afficher les ventes par mois » proposé', appels.length === 0 && bouton, JSON.stringify({ appels, bouton }));
          if (bouton) {
            await p.locator('#' + await p.evaluate(() => Ext.ComponentQuery.query('#afficherVentesMois')[0].getId())).click();
            await p.waitForFunction(() => { const s = Ext.getCmp('gridpanelStatVenteID').getStore(); return !s.isLoading() && s.lastOptions; }, null, { timeout: 60000 });
            await p.waitForTimeout(500);
            const encore = await p.evaluate(() => { const x = Ext.ComponentQuery.query('#afficherVentesMois')[0]; return !!x && x.isVisible(true); });
            ok('Clic (' + mode + '), ' + a.quoi + ' : demandées une fois pour cet article, bouton retiré', appels.length === 1 && appels[0] === a.id && !encore, JSON.stringify({ appels, encore }));
            await rapprocher(a, mode);
          }
        }
        await fermer();
        await p.waitForTimeout(400);
      }
    }
    ok('Aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    poser(avant);
    ok('Paramètre remis comme avant (' + avant + ')', (q("SELECT COUNT(*) FROM t_parameters WHERE str_KEY = '" + CLE + "'") === '1' ? q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + CLE + "'") : null) === avant);
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
