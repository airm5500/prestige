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
const { connexion, ouvrirMenu, cliquer, choisir, saisir, texteMessage } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const ORGANISME = 'ZZE2E ORGANISME RETRAIT';
const PREFIXE = 'ZZE2ECREA';
const MARQUE = PREFIXE + Date.now().toString(36).toUpperCase();

/* gestes d'ecran pour un onglet donne (memes gestes que test-desactivation-organisme.js) */
function gestes(p) {
  const fermerMessages = () => p.evaluate(() => { while (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
  const attendreReponse = (motif, methode) => p.waitForResponse((r) => motif.test(r.url()) && r.request().method() === (methode || 'POST'), { timeout: 60000 });
  const fermerFenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && !w.isXType('messagebox')).forEach((w) => w.close()));
  const cliquerIcone = async (grille, indexLigne, infobulle) => {
    const sel = await p.evaluate(([g, i, info]) => {
      const grid = Ext.ComponentQuery.query(g).filter((x) => x.isVisible(true))[0];
      const col = grid && grid.query('actioncolumn').find((c) => c.items && c.items.some((it) => it.tooltip === info));
      const ligne = grid && grid.getView().getNode(i);
      const icone = col && ligne ? Array.from(ligne.querySelectorAll('.x-grid-cell-' + col.getId() + ' img.x-action-col-icon')).find((x) => x.offsetWidth > 0) : null;
      if (!icone) { return null; }
      icone.id = icone.id || ('e2e-icone-' + Date.now());
      return '#' + icone.id;
    }, [grille, indexLigne, infobulle]);
    if (!sel) { throw new Error('Icône « ' + infobulle + ' » absente sur la ligne ' + indexLigne + ' de ' + grille); }
    await p.click(sel);
  };
  const confirmerDansIcone = async () => {
    await p.waitForTimeout(450);
    const id = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('.prestige-confirmer-icone')).find((x) => x.offsetWidth > 0); return c ? (c.id || (c.id = 'e2e-confirmer-' + Date.now())) : null; });
    if (id) { await p.click('#' + id); } else { await cliquer(p, 'messagebox{isVisible()} button[itemId=yes]'); }
  };

  const lignesOrganismes = (xtype) => p.evaluate(([x, nom]) => { const g = Ext.ComponentQuery.query(x + ' gridpanel, ' + x).find((c) => c.getStore && c.isVisible(true));
    return g ? g.getStore().getRange().map((r, i) => ({ i, id: r.get('lg_TIERS_PAYANT_ID'), nom: r.get('str_FULLNAME') || r.get('str_NAME') })).filter((l) => (l.nom || '').indexOf(nom) === 0) : []; }, [xtype, ORGANISME]);
  const chercherOrganisme = async (xtype) => {
    await saisir(p, xtype + ' #rechecher', ORGANISME);
    const charge = attendreReponse(/tierspayant\/list/, 'GET');
    await cliquer(p, xtype + ' button[text=rechercher]'); await charge;
    await p.waitForTimeout(800);
    return lignesOrganismes(xtype);
  };
  const ouvrirOrganismes = async () => {
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Tiers-payants');
    await p.waitForFunction(() => Ext.ComponentQuery.query('tierspayantmanager').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
  };
  const reactiverOrganisme = async () => {
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Tiers payants désactivés');
    await p.waitForFunction(() => Ext.ComponentQuery.query('tierspayantdesactive').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const l = await chercherOrganisme('tierspayantdesactive');
    if (!l.length) { return false; }
    const rep = attendreReponse(/tierspayant\/gestion\/toggle-statut$/);
    await cliquerIcone('tierspayantdesactive', l[0].i, 'Activer ce tiers payant');
    await cliquer(p, 'messagebox{isVisible()} button[itemId=yes]');
    await rep; await p.waitForTimeout(800); await fermerMessages();
    return true;
  };
  const desactiverOrganisme = async () => {
    await ouvrirOrganismes();
    const orga = await chercherOrganisme('tierspayantmanager');
    if (!orga.length) { throw new Error('organisme d\'essai absent des organismes actifs'); }
    const rep = attendreReponse(/tierspayant\/gestion\/toggle-statut$/);
    await cliquerIcone('tierspayantmanager', orga[0].i, 'Desactiver le tiers payant');
    await cliquer(p, 'messagebox{isVisible()} button[itemId=yes]');
    const r = await (await rep).json().catch(() => ({}));
    await p.waitForTimeout(1000); await fermerMessages();
    return r;
  };

  const ouvrirClients = async () => {
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Clients');
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.ComponentQuery.query('clientgestion').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
  };
  const chercherClients = async (desactives, terme) => {
    terme = terme || MARQUE;
    const bascule = await p.evaluate(() => { const bt = Ext.getCmp('BT_CLIENT_VOIR_DESACTIVES'); return bt ? { vue: bt.isVisible(), presse: !!bt.pressed } : null; });
    if (bascule && bascule.vue && bascule.presse !== !!desactives) {
      const charge = attendreReponse(/client\/gestion\?/, 'GET');
      await cliquer(p, '#BT_CLIENT_VOIR_DESACTIVES'); await charge;
    }
    await saisir(p, 'clientgestion #rechecher', terme);
    const charge = attendreReponse(/client\/gestion\?/, 'GET');
    await cliquer(p, 'clientgestion button[text=rechercher]'); await charge;
    await p.waitForTimeout(800);
    return p.evaluate((m) => Ext.ComponentQuery.query('clientgestion')[0].getStore().getRange()
      .map((r, i) => ({ i, id: r.get('lg_CLIENT_ID'), nom: r.get('str_FIRST_LAST_NAME') || '' }))
      .filter((r) => r.nom.indexOf(m) >= 0), terme);
  };
  /* « Creer » rempli jusqu'a l'organisme, sans enregistrer */
  const remplirCreation = async (prenom, organisme) => {
    await cliquer(p, 'clientgestion button[text=Cr&eacute;er]');
    await p.waitForFunction(() => Ext.getCmp('str_FIRST_NAME') && Ext.getCmp('str_FIRST_NAME').isVisible(true), null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const organismes = attendreReponse(/client\/tiers-payants\?lg_TYPE_TIERS_PAYANT_ID=1/, 'GET');
    await choisir(p, '#lg_TYPE_TIERS_PAYANT_ID', /assurance/i);
    await organismes; await p.waitForTimeout(500);
    await saisir(p, '#str_FIRST_NAME', MARQUE);
    await saisir(p, '#str_LAST_NAME', prenom);
    await p.locator('#str_SEXE').getByText('Masculin').click();
    const tp = await choisir(p, 'combobox[name=lg_TIERS_PAYANT_ID]', organisme);
    await saisir(p, 'field[name=int_POURCENTAGE]', '80');
    return tp;
  };
  const enregistrerCreation = async () => {
    const reponse = attendreReponse(/client\/gestion\/create$/);
    await p.click('#' + await p.evaluate(() => Ext.getCmp('str_FIRST_NAME').up('window').down('button[text=Enregistrer]').getId()));
    const r = await (await reponse).json().catch(() => ({}));
    await p.waitForTimeout(1000);
    const message = await texteMessage(p);
    await fermerMessages();
    return { r, message };
  };
  const liensDuClient = async (prenom) => {
    const l = (await chercherClients(false)).find((c) => c.nom.endsWith(' ' + prenom));
    if (!l) { return null; }
    const charge = attendreReponse(/client\/gestion\/tiers-payants\?/, 'GET');
    await cliquerIcone('clientgestion', l.i, 'Ajouter des tiers payants a ce client');
    await charge; await p.waitForTimeout(800);
    const liens = await p.evaluate(() => Ext.getCmp('CltgridpanelID').getStore().getRange().map((r) => ({ tp: r.get('str_TIERS_PAYANT_NAME'), priorite: r.get('int_PRIORITY') })));
    await fermerFenetres();
    return liens;
  };
  const nettoyerClients = async () => {
    await fermerMessages(); await fermerFenetres();
    await ouvrirClients();
    await p.evaluate(() => Ext.ComponentQuery.query('clientgestion')[0].query('actioncolumn')
      .filter((c) => c.items.some((it) => it.tooltip === 'Supprimer')).forEach((c) => c.show()));
    for (const vue of [false, true]) {
      for (const c of await chercherClients(vue, PREFIXE)) {
        const i = await p.evaluate((id) => Ext.ComponentQuery.query('clientgestion')[0].getStore().findBy((x) => x.get('lg_CLIENT_ID') === id), c.id);
        const rep = attendreReponse(/client\/gestion\/delete$/);
        await cliquerIcone('clientgestion', i, 'Supprimer');
        await confirmerDansIcone();
        await rep; await p.waitForTimeout(800); await fermerMessages();
      }
    }
    return (await chercherClients(false, PREFIXE)).length + (await chercherClients(true, PREFIXE)).length;
  };
  /* SERVICE CLIENT > Ventes, nouvelle vente « Assurance », nom inconnu tape puis Entree, « Oui » a « ajouter un
     nouveau client », fiche remplie jusqu'au taux, sans enregistrer */
  const remplirCreationVente = async (prenom, organisme) => {
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #typeVente').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.locator('text=/^\\s*Assurance\\s*$/').filter({ visible: true }).first().click();
    await p.waitForTimeout(1500);
    await cliquer(p, 'doventemanager #contenu #clientSearchTextField');
    await p.keyboard.type(MARQUE + ' ' + prenom, { delay: 20 });
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => Ext.ComponentQuery.query('messagebox').some((m) => m.isVisible() && /nouveau client/i.test(m.el.dom.textContent)), null, { timeout: 30000 });
    await cliquer(p, 'messagebox{isVisible()} button[itemId=yes]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('addaddclientwindow').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await saisir(p, 'addaddclientwindow #strFIRSTNAME', MARQUE);
    await saisir(p, 'addaddclientwindow #strLASTNAME', prenom);
    await saisir(p, 'addaddclientwindow #strNUMEROSECURITESOCIAL', MARQUE + prenom);
    await p.locator('.x-window:visible').getByText('Masculin').click();
    const tp = await choisir(p, 'addaddclientwindow #tiersvo', organisme);
    await saisir(p, 'addaddclientwindow #intPOURCENTAGE', '80');
    return tp;
  };
  const enregistrerCreationVente = async () => {
    const reponse = attendreReponse(/client\/add\/assurance$/);
    await cliquer(p, 'addaddclientwindow #btnAddClientAssurance');
    const r = await (await reponse).json().catch(() => ({}));
    await p.waitForTimeout(1000);
    const message = await texteMessage(p);
    await fermerMessages();
    return { succes: r.success, msg: r.msg, message };
  };
  return { ouvrirOrganismes, chercherOrganisme, reactiverOrganisme, desactiverOrganisme, ouvrirClients, chercherClients,
    remplirCreation, enregistrerCreation, liensDuClient, nettoyerClients, fermerFenetres, remplirCreationVente,
    enregistrerCreationVente };
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const pa = await b.newPage({ viewport: { width: 1600, height: 950 } });
  pa.setDefaultTimeout(60000);
  const erreurs = []; pa.on('pageerror', (e) => erreurs.push(e.message));
  await pa.context().route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  let pb = null;
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
