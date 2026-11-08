/* PLAN DU 08/11, POINT 9c : FENETRE « TRAITEMENT DE LA SUGGESTION » SANS DEFILEMENT HORIZONTAL.
 *
 * Retour : « vue traitement de suggestion, pourquoi ne pas adapter la vue aux colonnes disponibles et eviter le scroll
 * horizontal ? ». La somme des largeurs minimales des colonnes (1 250 px) depassait la fenetre (1 150 px).
 *
 * Par l'ecran (menu Gestion des reserves, onglet Suggestions, double-clic sur la suggestion), a 1366 x 768,
 * 1600 x 950 et 1920 x 1080 :
 *  - la grille des lignes ne defile pas en largeur ; la fenetre tient dans l'ecran ;
 *  - une seule colonne « Stock rayon / reserve » (creation, et « → actuel » s'il a change) ;
 * rapprochement ligne par ligne avec la base : stock a la creation (ligne de suggestion) et stock actuel
 * (t_famille_stock pour le rayon, t_type_stock_famille type 2 pour la reserve), sur deux lignes : une dont le stock a
 * change depuis la creation, une inchangee.
 * Jeu d'essai E2E-TRC-* retire a la fin ; aucun stock modifie.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const MOI = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const EMPL = q(`SELECT lg_EMPLACEMENT_ID FROM t_user WHERE lg_USER_ID = '${MOI}'`);
/* deux produits geres en reserve, avec un stock reserve et un stock rayon connus */
const P = q(`SELECT f.lg_FAMILLE_ID, s.int_NUMBER_AVAILABLE, t.int_NUMBER FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '${EMPL}'
  JOIN t_type_stock_famille t ON t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID = '${EMPL}' AND t.lg_TYPE_STOCK_ID = '2' AND t.str_STATUT = 'enable'
  WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 1 ORDER BY f.lg_FAMILLE_ID LIMIT 2`).split('\n').map((l) => l.split('\t'));
const nettoyer = () => q("DELETE FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID = 'E2E-TRC-1'; DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = 'E2E-TRC-1';");
/* ligne 0 : stock a la creation different de l'actuel (rayon + 7, reserve + 2) ; ligne 1 : identique */
const CREATION = [[Number(P[0][1]) + 7, Number(P[0][2]) + 2], [Number(P[1][1]), Number(P[1][2])]];

(async () => {
  let b = null;
  const err = [];
  try {
    ok('Jeu d\'essai : deux produits gérés en réserve', P.length === 2 && P[1][0], JSON.stringify(P));
    nettoyer();
    q(`INSERT INTO t_suggestion_reserve (lg_SUGGESTION_RESERVE_ID, str_REF, str_CATEGORIE, str_ORIGINE, str_STATUT, str_COMMENTAIRE, lg_EMPLACEMENT_ID, lg_USER_CREATEUR_ID, dt_CREATED, dt_UPDATED)
      VALUES ('E2E-TRC-1', 'E2E-TRC-1', 'RAYON', 'MANUELLE', 'A_TRAITER', 'E2E', '${EMPL}', '${MOI}', NOW(), NOW());`
      + P.map((x, i) => `INSERT INTO t_suggestion_reserve_detail (lg_SUGGESTION_RESERVE_DETAIL_ID, lg_SUGGESTION_RESERVE_ID, lg_FAMILLE_ID, int_QTE_PROPOSEE, int_QTE_RETENUE, int_QTE_DEPLACEE,
      int_STOCK_RAYON, int_STOCK_RESERVE, int_SEUIL_DECLENCHEUR, int_CIBLE, int_DISPONIBLE, str_FORMULE, str_ETAT, dt_CREATED, dt_UPDATED)
      VALUES ('E2E-TRC-1-L${i}', 'E2E-TRC-1', '${x[0]}', ${2 + i}, ${2 + i}, 0, ${CREATION[i][0]}, ${CREATION[i][1]}, 5, 10, ${CREATION[i][1]}, 'E2E formule de declenchement assez longue pour la colonne', 'PROPOSEE', NOW(), NOW());`).join(''));
    const stocksAvant = q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER) ORDER BY 1) FROM t_type_stock_famille WHERE lg_FAMILLE_ID IN ('${P[0][0]}', '${P[1][0]}')`);
    b = await ENV_E2E.lancer(chromium);
    for (const [l, h] of [[1366, 768], [1600, 950], [1920, 1080]]) {
      const p = await (await b.newContext({ viewport: { width: l, height: h } })).newPage();
      p.on('pageerror', (e) => err.push(e.message));
      await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
      const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'reservemanager', true); return [r.parentNode.get('text'), r.get('text')]; });
      await V.ouvrirMenu(p, menu[0], menu[1]);
      await p.waitForFunction(() => Ext.getCmp('reservemanagerID'), null, { timeout: 30000 });
      await p.click('#' + await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletSuggestions').tab.getId()));
      await p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'); return g.filtreInitialise && !g.getStore().isLoading() && g.getStore().findExact('lg_SUGGESTION_RESERVE_ID', 'E2E-TRC-1') >= 0; }, null, { timeout: 30000 });
      const ligne = await p.evaluate(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'); const n = g.getView().getNode(g.getStore().findExact('lg_SUGGESTION_RESERVE_ID', 'E2E-TRC-1'));
        const c = n.querySelectorAll('td')[2]; c.id = c.id || 'e2e-trc-cellule'; return c.id; });
      await p.dblclick('#' + ligne);
      await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('window[title=Traitement de la suggestion]{isVisible()}')[0]; const g = w && w.down('grid'); return g && g.getStore().getCount() === 2; }, null, { timeout: 30000 });
      await p.waitForTimeout(1200);
      const m = await p.evaluate(() => {
        const w = Ext.ComponentQuery.query('window[title=Traitement de la suggestion]{isVisible()}')[0], g = w.down('grid'), v = g.getView().getEl().dom, r = w.getEl().dom.getBoundingClientRect();
        const entetes = g.headerCt.getGridColumns().filter((c) => !c.hidden).map((c) => c.text);
        const idx = g.headerCt.getGridColumns().findIndex((c) => c.itemId === 'colStock');
        const cellules = g.getStore().getRange().map((rec, i) => ({ id: rec.get('lg_FAMILLE_ID'), texte: idx >= 0 ? g.getView().getNode(i).querySelectorAll('td')[idx].textContent.trim() : null,
          rayon: rec.get('int_STOCK_RAYON_ACTUEL'), reserve: rec.get('int_STOCK_RESERVE_ACTUEL') }));
        const res = { largeur: [v.scrollWidth, v.clientWidth], fenetre: [Math.round(r.left), Math.round(r.right), innerWidth], entetes, cellules };
        w.close();
        return res;
      });
      ok(`${l}x${h} : la grille ne défile pas en largeur`, m.largeur[0] <= m.largeur[1] + 1, JSON.stringify(m.largeur));
      ok(`${l}x${h} : la fenêtre tient dans l'écran`, m.fenetre[0] >= 0 && m.fenetre[1] <= m.fenetre[2], JSON.stringify(m.fenetre));
      ok(`${l}x${h} : une seule colonne « Stock rayon / réserve »`, m.entetes.includes('Stock rayon / réserve') && !m.entetes.includes('Stock actuel') && !m.entetes.includes('Stock a la creation'), m.entetes.join(', '));
      P.forEach((x, i) => {
        const c = m.cellules.find((y) => y.id === x[0]) || {};
        const actuelBase = q(`SELECT CONCAT(s.int_NUMBER_AVAILABLE, ' / ', t.int_NUMBER) FROM t_famille_stock s JOIN t_type_stock_famille t ON t.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID = s.lg_EMPLACEMENT_ID AND t.lg_TYPE_STOCK_ID = '2'
          WHERE s.lg_FAMILLE_ID = '${x[0]}' AND s.lg_EMPLACEMENT_ID = '${EMPL}'`);
        const attendu = i === 0 ? `${CREATION[0][0]} / ${CREATION[0][1]} → ${actuelBase}` : `${CREATION[1][0]} / ${CREATION[1][1]}`;
        ok(`${l}x${h} : ligne ${i + 1} (${i === 0 ? 'stock changé' : 'stock inchangé'}) = base : « ${attendu} »`, c.texte === attendu, c.texte);
      });
      await p.context().close();
    }
    ok('Stocks inchangés par l\'affichage', q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER) ORDER BY 1) FROM t_type_stock_famille WHERE lg_FAMILLE_ID IN ('${P[0][0]}', '${P[1][0]}')`) === stocksAvant);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    nettoyer();
    ok('Données d\'essai retirées', q("SELECT COUNT(*) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = 'E2E-TRC-1'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
