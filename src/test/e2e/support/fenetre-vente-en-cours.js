/* Retour du 25/11 : une vente rappelée par son numéro (zone « N° ticket / scan ») est tenue par le poste, comme une
 * vente rappelée par la fenêtre « Ventes en attente ». Quitter l'écran, ou rappeler une autre vente, ouvre alors la
 * fenêtre « Que faire de la vente ? » (#psv-fenetre, exception voulue à la règle « pas de fenêtre »).
 * Les tests d'écran qui ne portent pas sur cette fenêtre y répondent comme l'utilisateur qui garde sa vente :
 * « Mettre en attente » (#psv-choix-attente) : la vente reste intacte (lignes, montant, statut) et rappelable.
 * La fenêtre elle-même est testée par vente/test-ventes-sortie-2511.js et vente/test-ventes-saisie-2411.js, qui
 * n'utilisent pas cette aide.
 * Usage : await require('../support/fenetre-vente-en-cours').repondre(p) après le geste qui peut l'ouvrir (menu,
 * numéro tapé) ; mettreEnAttente(p) répond aussi avant chaque clic du test.
 */
async function repondre(p, delai) {
  const fenetre = p.locator('#psv-fenetre');
  const vue = await fenetre.waitFor({ state: 'visible', timeout: delai || 2500 }).then(() => true).catch(() => false);
  if (!vue) {
    return false;
  }
  await p.locator('#psv-choix-attente').click({ timeout: 5000 }).catch(() => {});
  await fenetre.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(800);
  return true;
}

async function mettreEnAttente(p) {
  const fenetre = p.locator('#psv-fenetre');
  await p.addLocatorHandler(fenetre, async () => {
    await p.locator('#psv-choix-attente').click({ timeout: 5000 }).catch(() => {});
    await fenetre.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  });
}

module.exports = { repondre, mettreEnAttente };
