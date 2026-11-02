/* PLAN « CLIENTS ASSURES ET TIERS-PAYANTS » (02/11), ETAPE 5 : un client assure sans tiers-payant actif n'apparait
 * pas dans la recherche de la vente.
 *
 * Les etapes 2 a 4 ferment les chemins d'ecran qui laissaient un client assure actif sans tiers-payant actif (le
 * 02/11, enregistrer par « Modifier » la fiche d'un tel client desactive echoue sans le reactiver). Il n'en reste que
 * dans des donnees anciennes : la recherche de la vente les exclut. Ce test verifie, par l'ecran, le cas courant :
 * l'organisme du client est desactive, le client aussi, et la vente ne le propose plus.
 *
 * Parcours par les vues (compte e2e) :
 *  - GESTION DES TIERS-PAYANTS : organisme d'essai « ZZE2E ORGANISME RETRAIT » reactive (« Tiers payants
 *    desactives ») ; Clients, « Creer » un client assurance sur cet organisme ; Tiers-payants, icone « Desactiver le
 *    tiers payant » de l'organisme, « Oui » : le client est desactive ;
 *  - SERVICE CLIENT > Ventes, nouvelle vente « Assurance », nom du client tape puis Entree.
 * Attendu : la vente ne trouve pas le client et propose d'ajouter un nouveau client.
 * Nettoyage : client d'essai supprime par l'icone « Supprimer » ; l'organisme d'essai reste desactive (comme apres
 * test-desactivation-organisme.js).
 *
 * node client/test-recherche-client-sans-tp.js   (BASE=http://localhost:9080/prestige)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, texteMessage } = require('../outils/vues');
const outils = require('./outils-clients');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const ORGANISME = 'ZZE2E ORGANISME RETRAIT';
const PREFIXE = 'ZZE2ESANSTP';
const MARQUE = PREFIXE + Date.now().toString(36).toUpperCase();

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  p.setDefaultTimeout(60000);
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  const G = outils.gestes(p, { ORGANISME, MARQUE, PREFIXE });
  const fermerMessages = () => p.evaluate(() => { while (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
  const attendreReponse = (motif, methode) => p.waitForResponse((r) => motif.test(r.url()) && r.request().method() === (methode || 'POST'), { timeout: 60000 });
  let organismeActif = false;

  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* organisme d'essai actif, client assurance cree dessus, puis organisme desactive */
    await G.reactiverOrganisme();
    await G.ouvrirOrganismes();
    const orga = await G.chercherOrganisme('tierspayantmanager');
    if (!orga.length) { throw new Error('organisme d\'essai absent : lancer d\'abord client/test-desactivation-organisme.js, qui le crée'); }
    organismeActif = true;
    await G.ouvrirClients();
    await G.remplirCreation('ESSAI', orga[0].nom);
    const creation = await G.enregistrerCreation();
    await G.fermerFenetres();
    ok('Jeu d\'essai : client assurance créé sur l\'organisme d\'essai', String(creation.r.success) !== '0' && (await G.chercherClients(false)).length === 1, JSON.stringify(creation));
    const desactivation = await G.desactiverOrganisme();
    organismeActif = false;
    await G.ouvrirClients();
    const desactive = await G.chercherClients(true);
    ok('Jeu d\'essai : organisme désactivé, le client l\'est aussi', String(desactivation.success) !== '0' && desactive.length === 1, JSON.stringify(desactivation));

    /* vente « Assurance » : le client n'est pas propose */
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #typeVente').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.locator('text=/^\\s*Assurance\\s*$/').filter({ visible: true }).first().click();
    await p.waitForTimeout(1500);
    const recherche = attendreReponse(/client\/all\?/, 'GET');
    await cliquer(p, 'doventemanager #contenu #clientSearchTextField');
    await p.keyboard.type(MARQUE, { delay: 20 });
    await p.keyboard.press('Enter');
    const rs = await (await recherche).json().catch(() => ({}));
    await p.waitForTimeout(2000);
    const message = await texteMessage(p);
    const trouves = (rs.data || []).filter((c) => (c.fullName || ((c.strFIRSTNAME || '') + ' ' + (c.strLASTNAME || ''))).indexOf(MARQUE) >= 0).length;
    ok('Vente « Assurance » : le client sans tiers-payant actif n\'est pas proposé', trouves === 0 && /nouveau client/i.test(message),
      JSON.stringify({ trouves, message: message.slice(0, 160) }));
    await fermerMessages();
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    try {
      const reste = await G.nettoyerClients();
      ok('Client d\'essai retiré', reste === 0, reste + ' client(s) d\'essai restant(s)');
    } catch (x) { ok('Client d\'essai retiré', false, x.message); }
    try { if (organismeActif) { await G.desactiverOrganisme(); } } catch (x) { console.log('organisme d\'essai laissé actif : ' + x.message); }
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
