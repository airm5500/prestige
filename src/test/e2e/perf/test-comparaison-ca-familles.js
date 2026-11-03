/* COMPARAISON CA FAMILLES : une ligne par famille, et une ouverture rapide (demande du 02/11).
 *
 * Defaut constate a la mesure du 02/11 : le serveur (StatisticsFamilleArticle.getFamilleCA_Data) ajoutait chaque famille
 * a la reponse dans la boucle des douze mois, soit douze fois, avec le meme identifiant. La grille les fusionnait
 * (une ligne par famille), mais la reponse pesait douze fois son poids.
 *
 * Vrai chemin : menu ANALYSE DE GESTION > Comparaison CA familles, lignes lues dans la grille affichee, reponse lue
 * telle que l'ecran l'a recue. Lecture seule. Variables : BASE (adresse de Prestige), E2E_LOGIN.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { BASE, connexion, ouvrirMenu } = require('../outils/vues');

const BUDGET_OUVERTURE = 3000;
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  console.log('Serveur : ' + BASE);
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const reponse = p.waitForResponse((r) => /comparaisonChiffreAffaire\/ws_data\.jsp/.test(r.url()), { timeout: 300000 });
    const t0 = Date.now();
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Comparaison CA familles');
    const r = await reponse;
    const taille = (await r.body()).length;
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('comparaisonChiffreAffaireManager gridpanel').filter((x) => x.isVisible(true))[0];
      return g && !g.getStore().isLoading(); }, null, { timeout: 300000 });
    const ms = Date.now() - t0;

    /* libelles des lignes affichees dans la grille (premiere colonne de texte non vide) */
    const lignes = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('comparaisonChiffreAffaireManager gridpanel').filter((x) => x.isVisible(true))[0];
      return Array.prototype.map.call(g.getView().getEl().dom.querySelectorAll('.x-grid-row'),
        (tr) => Array.prototype.map.call(tr.querySelectorAll('.x-grid-cell-inner'), (c) => c.textContent.trim()).slice(0, 2).join(' | '));
    });
    const distinctes = new Set(lignes).size;
    ok('La grille affiche des familles', lignes.length > 0, lignes.length + ' lignes');
    ok('Chaque famille n apparait qu une fois dans la grille', lignes.length === distinctes,
      lignes.length + ' lignes pour ' + distinctes + ' familles distinctes');

    /* reponse recue par l'ecran : la grille masque les doublons (meme identifiant), la reponse les porte */
    const json = JSON.parse((await r.body()).toString('utf8'));
    const ids = new Set(json.data.map((x) => x.id));
    ok('La reponse recue par l ecran porte chaque famille une seule fois', json.data.length === ids.size,
      json.data.length + ' elements pour ' + ids.size + ' familles');

    ok('Ouverture de l ecran dans son budget', ms <= BUDGET_OUVERTURE,
      ms + ' ms (budget ' + BUDGET_OUVERTURE + ' ms), reponse de ' + Math.round(taille / 1024) + ' Ko');
    ok('Aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs.slice(0, 3)));
  } catch (e) {
    ok('Le test va jusqu au bout', false, String(e && e.message).slice(0, 300));
    await ENV_E2E.capture(p, 'echec');
  } finally {
    await b.close();
  }
  const echecs = res.filter((x) => !x.c).length;
  console.log((res.length - echecs) + '/' + res.length + ' controles respectes');
  process.exit(echecs ? 1 : 0);
})();
