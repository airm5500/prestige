/* VENTE ASSURANCE : ECHEC DE LA RECHERCHE DU CLIENT (journal d'appaul du 21/11, N2, CAISSE44 17:41).
 *
 * La recherche du client (Entree dans le champ client d'une vente « Assurance ») lit ../api/v1/client/all. Quand
 * cette lecture echoue (coupure de la base de CAISSE44 : 500), la branche d'erreur du 02/11 appelait
 * onBtnCancelClient, qui detruisait la fenetre de choix du client... absente : « Cannot read properties of undefined
 * (reading 'destroy') », et le message prevu n'etait jamais affiche.
 *
 * Parcours reel (compte e2e) : SERVICE CLIENT > Ventes, « Nouvelle vente », type « Assurance », texte tape dans le
 * champ client puis Entree :
 *  1. lecture en echec (reponse 500 du serveur, comme a appaul) : message « La recherche du client a échoué »,
 *     aucune erreur JavaScript, aucune fenetre de choix, champ client vide, une seule requete ;
 *  2. recherche reelle qui trouve plusieurs clients : fenetre de choix ouverte (rapprochement : lignes affichees =
 *     clients renvoyes), « Annuler » la ferme et vide le champ, comme avant ;
 *  3. bilan : aucune vente, aucun client cree ; aucune erreur JavaScript.
 * Les noms des clients ne sont ni lus ni affiches : seuls les nombres sont compares.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, texteMessage } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const bilan = () => q('SELECT CONCAT((SELECT COUNT(*) FROM t_preenregistrement), \'/\', (SELECT COUNT(*) FROM t_client))');

(async () => {
  const avant = bilan();
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const erreurs = [], recherches = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  p.on('request', (r) => { if (/api\/v1\/client\/all\?/.test(r.url())) { recherches.push(r.url()); } });
  const fenetreChoix = () => p.evaluate(() => Ext.ComponentQuery.query('assuranceClient').filter((w) => w.isVisible()).length);
  const champClient = () => p.evaluate(() => (Ext.ComponentQuery.query('doventemanager #contenu #clientSearchTextField')[0] || { getValue: () => '?' }).getValue());
  const fermerMessages = async () => {
    for (let i = 0; i < 3 && (await texteMessage(p)); i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #typeVente').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.locator('text=/^\\s*Assurance\\s*$/').filter({ visible: true }).first().click();
    await p.waitForTimeout(1500);

    /* 1. lecture en echec : le serveur repond 500, comme pendant la coupure de CAISSE44 */
    let coupe = true;
    await ctx.route(/api\/v1\/client\/all\?/, (route) => (coupe
      ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false,"msg":"Communications link failure"}' })
      : route.continue()));
    const n0 = recherches.length;
    await cliquer(p, 'doventemanager #contenu #clientSearchTextField');
    await p.keyboard.type('zz', { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    const message = await texteMessage(p);
    ok('Lecture en échec : message « La recherche du client a échoué » affiché', /recherche du client a échoué/i.test(message), message.slice(0, 160));
    ok('Lecture en échec : une seule requête, aucune fenêtre de choix, champ client vide',
      recherches.length - n0 === 1 && (await fenetreChoix()) === 0 && (await champClient()) === '', `${recherches.length - n0} ${await fenetreChoix()} « ${await champClient()} »`);
    ok('Lecture en échec : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    await fermerMessages();

    /* 2. recherche reelle : plusieurs clients, fenetre de choix, « Annuler » */
    coupe = false;
    await cliquer(p, 'doventemanager #contenu #clientSearchTextField');
    await p.keyboard.type('a', { delay: 30 });
    const [rep] = await Promise.all([p.waitForResponse((r) => /api\/v1\/client\/all\?/.test(r.url()), { timeout: 30000 }), p.keyboard.press('Enter')]);
    const corps = await rep.json().catch(() => ({}));
    const renvoyes = (corps.data || []).length;
    await p.waitForFunction(() => Ext.ComponentQuery.query('assuranceClient').some((w) => w.isVisible()), null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(800);
    const affiches = await p.evaluate(() => { const w = Ext.ComponentQuery.query('assuranceClient').filter((x) => x.isVisible())[0]; return w ? w.down('gridpanel').getStore().getCount() : -1; });
    ok('Recherche réelle : fenêtre de choix ouverte, lignes affichées = clients renvoyés', renvoyes > 1 && affiches === renvoyes, `${affiches} / ${renvoyes}`);
    await cliquer(p, 'assuranceClient #btnCancelClient');
    await p.waitForTimeout(800);
    ok('« Annuler » : fenêtre fermée, champ client vide, aucune erreur', (await fenetreChoix()) === 0 && (await champClient()) === '' && erreurs.length === 0,
      `${await fenetreChoix()} « ${await champClient()} » ${erreurs.join(' | ')}`);
    await fermerMessages();
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  ok('Bilan : aucune vente ni aucun client créé', bilan() === avant, avant + ' -> ' + bilan());
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
