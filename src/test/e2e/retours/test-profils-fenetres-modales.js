/* GESTION DE PROFILS : FENETRES MODALES (retours du 25/10, point 3).
 *
 * Par les vues (admin), GESTION DES UTILISATEURS > Gestion de profils : « Créer », « Modifier » (icone de ligne) et
 * « Attribution des privilèges » (icone de ligne) ouvrent une fenetre MODALE : l'ecran derriere est voile et ne
 * recoit plus les clics tant que la fenetre est ouverte. Chaque fenetre se ferme par son bouton, sans rien enregistrer.
 * Aucune erreur JavaScript, aucune fenetre du navigateur, aucun profil cree ou modifie.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const empreinte = () => q("SELECT CONCAT(COUNT(*), '|', IFNULL(MAX(dt_UPDATED), '')) FROM t_role") + '#' + q('SELECT COUNT(*) FROM t_role_privelege');

(async () => {
  const avant = empreinte();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  /* fenetre visible au premier plan : modale, et le point au centre de la grille des profils est couvert par le voile */
  const etat = () => p.evaluate(() => {
    const w = Ext.WindowManager.getActive();
    if (!w || !w.isVisible()) { return null; }
    const g = Ext.ComponentQuery.query('rolemanager')[0].getEl().dom.getBoundingClientRect();
    const dessus = document.elementFromPoint(g.left + 20, g.top + g.height / 2);
    return { titre: w.title, modal: !!w.modal, voile: !!(dessus && dessus.closest('.x-mask')) };
  });
  const icone = (col) => p.evaluate((c) => { const g = Ext.ComponentQuery.query('rolemanager')[0];
    const cols = g.getView().getHeaderCt().getGridColumns().filter((x) => x.xtype === 'actioncolumn');
    const n = g.getView().getCell(g.getStore().getAt(0), cols[c]); n.dom.querySelector('img, .x-action-col-icon').click(); }, col);
  const fermer = (texte) => p.evaluate((t) => { const w = Ext.WindowManager.getActive(); const btn = w.query('button').find((x) => x.getText && x.getText() === t); btn.btnEl.dom.click(); }, texte);
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES UTILISATEURS', 'Gestion de profils');
    await p.waitForFunction(() => Ext.ComponentQuery.query('rolemanager').some((g) => g.isVisible(true) && g.getStore().getCount() > 0), null, { timeout: 60000 });
    await p.waitForTimeout(800);

    await cliquer(p, 'rolemanager button[text=Creer]');
    await p.waitForTimeout(1000);
    let e = await etat();
    ok('« Créer » : fenêtre modale, l\'écran derrière est voilé', e && e.modal && e.voile, JSON.stringify(e));
    await fermer('Annuler');
    await p.waitForTimeout(600);
    ok('« Créer » se ferme par « Annuler »', !(await etat()));

    await icone(0);
    await p.waitForTimeout(1000);
    e = await etat();
    ok('« Modifier » : fenêtre modale, l\'écran derrière est voilé', e && e.modal && e.voile, JSON.stringify(e));
    await fermer('Annuler');
    await p.waitForTimeout(600);
    ok('« Modifier » se ferme par « Annuler »', !(await etat()));

    await icone(1);
    await p.waitForTimeout(2500);
    e = await etat();
    ok('« Attribution des privilèges » : fenêtre modale, l\'écran derrière est voilé', e && e.modal && e.voile, JSON.stringify(e));
    await fermer('Fermer');
    await p.waitForTimeout(600);
    ok('« Attribution des privilèges » se ferme par « Fermer »', !(await etat()));
    ok('Aucun profil ni privilège modifié', empreinte() === avant, empreinte() + ' / ' + avant);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
