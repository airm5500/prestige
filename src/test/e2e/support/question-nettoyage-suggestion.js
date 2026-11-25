/* Retour du 25/11 : à l'ouverture d'une suggestion dont des produits sont repassés au-dessus du seuil, une fenêtre
 * modale « Nettoyer la suggestion ? » s'ouvre une fois les lignes affichées. Les tests d'écran qui ne portent pas sur
 * cette question y répondent comme l'utilisateur : clic sur « Non, garder » (la suggestion reste intacte), dès que la
 * fenêtre couvre l'élément à cliquer.
 * La question elle-même est testée par reappro/test-suggestion-bandeau-nettoyage-2211.js et
 * reappro/test-suggestion-defilement-2511.js, qui n'utilisent pas cette aide.
 * Usage : require('../support/question-nettoyage-suggestion').garder(p);
 */
async function garder(p) {
  const fenetre = p.locator('.sugg-fenetre-nettoyage');
  await p.addLocatorHandler(fenetre, async () => {
    await fenetre.getByRole('button', { name: 'Non, garder' }).click();
  });
}

/* Pour un test qui continue au clavier après l'ouverture (le clavier ne déclenche pas l'aide ci-dessus) : si la
 * question est affichée, clic sur « Non, garder ». */
async function repondre(p) {
  const fenetre = p.locator('.sugg-fenetre-nettoyage');
  if (await fenetre.isVisible()) {
    /* si l'aide « garder » est posée, elle répond d'abord et le bouton disparaît : le clic n'a plus d'objet */
    await fenetre.getByRole('button', { name: 'Non, garder' }).click({ timeout: 5000 }).catch(() => {});
    await fenetre.waitFor({ state: 'hidden', timeout: 10000 });
  }
}

module.exports = { garder, repondre };
