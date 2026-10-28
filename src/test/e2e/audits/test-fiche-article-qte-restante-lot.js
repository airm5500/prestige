/* FICHE ARTICLE > « Voir les lots / péremptions » : stock restant du lot (retours de recette du 28/10, VC-11).
 * Un lot d'essai de 10 boites dont 4 restent. Parcours de l'utilisateur, a la souris et au clavier :
 *  - menu GESTION DU STOCK > « Fiche Article » ; CIP tape dans la recherche, touche Entree ;
 *  - sur la ligne du produit, icone « Voir les lots / péremptions », ou menu « Autres actions » puis cette entree ;
 *  - la fenetre des lots montre « Qté lot » 10 et « Qté restante lot » 4 sur la ligne du lot.
 * Lot et stock d'essai retires a la fin.
 * Lancement seul : node src/test/e2e/audits/test-fiche-article-qte-restante-lot.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const C = require('./commun');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const { ok, q, exec, ADMIN, MARQUE } = C;

(async () => {
  const P = C.produit(7, 50, "AND NOT EXISTS (SELECT 1 FROM t_lot l WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID)");
  const lot = MARQUE + '-LOT-FA';
  exec("INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, int_QTY_VENDUE, current_stock)"
    + " VALUES ('" + lot + "', '" + ADMIN + "', '" + P.id + "', '" + lot + "', 10, NOW(), NOW(), CURDATE() + INTERVAL 40 DAY, 'enable', 6, 4)");
  C.etat.restaurations.push("DELETE FROM t_lot WHERE lg_LOT_ID = '" + lot + "'");
  const cip = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + P.id + "'");
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    /* recherche au clavier : CIP puis Entree */
    await cliquer(p, 'famillemanager #rechecher');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(cip, { delay: 20 });
    await p.keyboard.press('Enter');
    const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: cip }).first();
    await ligne.waitFor({ timeout: 60000 });
    /* l'action est en icone ou dans le menu « Autres actions », selon le parametrage du poste */
    const icone = ligne.locator('img[data-qtip="Voir les lots / péremptions"]');
    if (await icone.count() && await icone.first().isVisible()) {
      await icone.first().click();
    } else {
      await ligne.locator('img[data-qtip="Autres actions"]').click();
      const entree = p.locator('.x-menu-item').filter({ visible: true, hasText: 'Voir les lots / péremptions' }).first();
      await entree.waitFor({ timeout: 10000 });
      await entree.click();
    }
    const fenetre = p.locator('.x-window').filter({ visible: true, hasText: 'Date péremption' }).first();
    await fenetre.waitFor({ timeout: 30000 });
    const ligneLot = fenetre.locator('.x-grid-row').filter({ hasText: lot }).first();
    await ligneLot.waitFor({ timeout: 30000 });
    const entetes = (await fenetre.locator('.x-column-header-text').allTextContents()).map((t) => t.trim()).filter(Boolean);
    ok('Fenêtre des lots : colonnes « Qté lot » puis « Qté restante lot »',
      entetes.indexOf('Qté lot') >= 0 && entetes.indexOf('Qté restante lot') === entetes.indexOf('Qté lot') + 1, entetes.join(' | '));
    const cellules = (await ligneLot.locator('td').allTextContents()).map((t) => t.trim());
    const i = entetes.indexOf('Qté lot');
    ok('Ligne du lot d\'essai : Qté lot 10, Qté restante lot 4', i >= 0 && cellules[i] === '10' && cellules[i + 1] === '4', cellules.join(' | '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
