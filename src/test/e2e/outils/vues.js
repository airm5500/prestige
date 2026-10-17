/* PARCOURS PAR LES VUES : aide commune aux tests d'ecran.
 *
 * Les tests passent par le vrai chemin de l'ecran : formulaire de connexion, volet du menu deplie d'un clic, menu
 * parent clique dans l'arbre, entree cliquee dans le volet flottant. Aucun ecran n'est ouvert par le code : un menu
 * absent des droits de l'utilisateur fait echouer le parcours.
 */
const BASE = process.env.BASE || 'http://localhost:8080/prestige';

async function connexion(p, login, mdp) {
  await p.goto(BASE + '/security/index.html', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', login); await p.fill('#str_password', mdp); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 60000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
  await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0];
    return n && n.getStore().getRootNode().childNodes.length > 0 && !n.getStore().isLoading(); }, null, { timeout: 120000 });
  await p.waitForLoadState('networkidle').catch(() => {});
}

/* menu parent puis entree, par leurs libelles affiches */
async function ouvrirMenu(p, parent, entree) {
  const visible = (sel) => p.locator(sel).filter({ visible: true });
  if (await visible('.prestige-nav .x-grid-row').count() === 0) {
    const id = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n.placeholder ? n.placeholder.getId() : null; });
    if (!id) { throw new Error('Volet du menu introuvable'); }
    await p.click('#' + id);
    await visible('.prestige-nav .x-grid-row').first().waitFor({ timeout: 10000 });
  }
  const exact = (t) => new RegExp('^\\s*' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$');
  await visible('.prestige-nav .x-grid-row').filter({ has: p.getByText(exact(parent)) }).first().click();
  const item = visible('.prestige-flyout-menu .x-menu-item').filter({ has: p.getByText(exact(entree)) }).first();
  await item.waitFor({ timeout: 10000 });
  await item.click();
}

/* vrai clic de souris sur le composant visible designe (requete de composants ExtJS) */
async function cliquer(p, requete, options) {
  const id = await p.evaluate((r) => { const c = Ext.ComponentQuery.query(r).filter((x) => x.isVisible(true))[0]; return c ? c.getId() : null; }, requete);
  if (!id) { throw new Error('Composant absent ou masqué : ' + requete); }
  await p.click('#' + id, options);
}

/* liste deroulante : clic sur sa fleche, puis clic sur l'element de rang donne (ou de libelle donne) de la liste */
async function choisir(p, requete, element) {
  const ids = await p.evaluate((r) => { const c = Ext.ComponentQuery.query(r).filter((x) => x.isVisible(true))[0]; if (!c) { return null; }
    const t = c.triggerEl && (c.triggerEl.first ? c.triggerEl.first() : c.triggerEl.item(0)); return { trigger: t && t.dom.id, picker: c.getPicker().getId() }; }, requete);
  if (!ids || !ids.trigger) { throw new Error('Liste déroulante absente ou masquée : ' + requete); }
  await p.click('#' + ids.trigger);
  const items = p.locator('#' + ids.picker + ' .x-boundlist-item');
  await items.first().waitFor({ timeout: 15000 });
  const cible = typeof element === 'number' ? items.nth(element) : items.filter({ hasText: element }).first();
  const texte = (await cible.textContent()).trim();
  await cible.click();
  return texte;
}

/* champ texte ou date : clic, tout selectionner, frappe, puis Tab */
async function saisir(p, requete, texte) {
  await cliquer(p, requete);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(texte, { delay: 20 });
  await p.keyboard.press('Tab');
}

/* texte des boites de message visibles */
const texteMessage = (p) => p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').map((b) => b.el.dom.textContent).join(' | '));

async function attendreMessage(p, texte, delai) {
  const fin = Date.now() + (delai || 10000);
  while (Date.now() < fin) { const t = await texteMessage(p); if (t.indexOf(texte) >= 0) { return t; } await p.waitForTimeout(200); }
  return null;
}

/* clic sur le bouton (ok, yes, no, cancel) de la boite de message visible */
const repondre = (p, bouton) => cliquer(p, 'messagebox{isVisible()} button[itemId=' + bouton + ']');

module.exports = { BASE, connexion, ouvrirMenu, cliquer, choisir, saisir, texteMessage, attendreMessage, repondre };
