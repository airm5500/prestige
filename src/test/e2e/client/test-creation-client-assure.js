/* PLAN « CLIENTS ASSURES ET TIERS-PAYANTS » (02/11), ETAPE 4 : creation d'un client assure en une fois, ou rien.
 *
 * Defaut reproduit : l'organisme choisi dans « Creer » est desactive (par un autre poste) avant « Enregistrer ».
 * Avant : le client et son compte etaient enregistres SANS tiers-payant, l'ecran annoncait le succes. Attendu : refus
 * explicite, aucun client cree (ni actif ni desactive). Non-regression : l'organisme reactive, la meme creation donne
 * un client avec son tiers-payant principal.
 *
 * Parcours par les vues, deux onglets du meme compte (e2e), comme deux postes :
 *  - onglet A : GESTION DES TIERS-PAYANTS > Clients, « Creer », type Assurance, organisme d'essai, nom, sexe, taux ;
 *  - onglet B : Tiers-payants, icone « Desactiver le tiers payant » de l'organisme d'essai, « Oui » ;
 *  - onglet A : « Enregistrer », puis recherche du client dans la liste et dans « Desactives ».
 * Nettoyage : clients d'essai supprimes par l'icone « Supprimer » ; l'organisme d'essai est laisse desactive, comme
 * le laisse test-desactivation-organisme.js (il est reactive au passage suivant).
 *
 * node client/test-creation-client-assure.js   (BASE=http://localhost:9080/prestige)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion } = require('../outils/vues');
const outils = require('./outils-clients');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const ORGANISME = 'ZZE2E ORGANISME RETRAIT';
const PREFIXE = 'ZZE2ECREA';
const MARQUE = PREFIXE + Date.now().toString(36).toUpperCase();

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const pa = await b.newPage({ viewport: { width: 1600, height: 950 } });
  pa.setDefaultTimeout(60000);
  const erreurs = []; pa.on('pageerror', (e) => erreurs.push(e.message));
  await pa.context().route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  let pb = null;
  const gestes = (page) => outils.gestes(page, { ORGANISME, MARQUE, PREFIXE });
  const A = gestes(pa);
  let B = null;
  let organismeActif = false;
  try {
    await connexion(pa, ENV_E2E.LOGIN, 'e2etest');
    /* l'onglet B partage la session de l'onglet A */
    pb = await pa.context().newPage({ viewport: { width: 1600, height: 950 } });
    pb.setDefaultTimeout(60000);
    pb.on('pageerror', (e) => erreurs.push('B: ' + e.message));
    await pb.goto(pa.url(), { waitUntil: 'domcontentloaded' });
    await pb.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await pb.waitForTimeout(2000);
    B = gestes(pb);

    /* organisme d'essai actif (laisse desactive par le passage precedent) */
    await B.reactiverOrganisme();
    await B.ouvrirOrganismes();
    const orga = await B.chercherOrganisme('tierspayantmanager');
    if (!orga.length) { throw new Error('organisme d\'essai absent : lancer d\'abord client/test-desactivation-organisme.js, qui le crée'); }
    organismeActif = true;
    const nomOrga = orga[0].nom;

    /* A remplit « Creer » ; B desactive l'organisme ; A enregistre */
    await A.ouvrirClients();
    const tp = await A.remplirCreation('REFUSE', nomOrga);
    const desactivation = await B.desactiverOrganisme();
    organismeActif = false;
    ok('Jeu d\'essai : organisme choisi en A, puis désactivé en B', tp === nomOrga && String(desactivation.success) !== '0', JSON.stringify({ tp, desactivation }));
    const refus = await A.enregistrerCreation();
    ok('« Enregistrer » est refusé et le dit', String(refus.r.success) === '0' && /pas été créé/.test(refus.message), JSON.stringify(refus));
    await A.fermerFenetres();
    const actifs = await A.chercherClients(false);
    const desactives = await A.chercherClients(true);
    ok('Aucun client créé, ni actif ni désactivé', actifs.length === 0 && desactives.length === 0, JSON.stringify({ actifs, desactives }));

    /* meme course depuis la vente : fiche « nouveau client » assurance remplie en A, organisme desactive en B */
    await B.reactiverOrganisme();
    organismeActif = true;
    const tpVente = await A.remplirCreationVente('VENTE', nomOrga);
    await B.desactiverOrganisme();
    organismeActif = false;
    const refusVente = await A.enregistrerCreationVente();
    ok('Vente : l\'enregistrement du nouveau client est refusé et le dit', tpVente === nomOrga && refusVente.succes === false
      && /plus actif/.test(refusVente.msg || ''), JSON.stringify({ tpVente, refusVente }));
    await A.fermerFenetres();
    await A.ouvrirClients();
    const apresVente = (await A.chercherClients(false)).concat(await A.chercherClients(true));
    ok('Vente : aucun client créé', apresVente.length === 0, JSON.stringify(apresVente));

    /* non-regression : organisme reactive, la meme creation aboutit avec son tiers-payant principal */
    await B.reactiverOrganisme();
    organismeActif = true;
    await A.ouvrirClients();
    await A.remplirCreation('ACCEPTE', nomOrga);
    const accord = await A.enregistrerCreation();
    await A.fermerFenetres();
    ok('Création normale acceptée', String(accord.r.success) !== '0', JSON.stringify(accord));
    const liens = await A.liensDuClient('ACCEPTE');
    ok('Le client créé a son tiers-payant principal', liens && liens.length === 1 && liens[0].tp === nomOrga && liens[0].priorite === 1, JSON.stringify(liens));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    try {
      const reste = await A.nettoyerClients();
      ok('Clients d\'essai retirés', reste === 0, reste + ' client(s) d\'essai restant(s)');
    } catch (x) { ok('Clients d\'essai retirés', false, x.message); }
    try { if (organismeActif && B) { await B.desactiverOrganisme(); } } catch (x) { console.log('organisme d\'essai laissé actif : ' + x.message); }
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
