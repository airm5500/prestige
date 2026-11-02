/* PLAN « CLIENTS ASSURES ET TIERS-PAYANTS » (02/11), ETAPE 2 : desactiver un organisme (Gestion des tiers-payants).
 *
 *  - client dont l'organisme etait le PRINCIPAL et qui a un complementaire : le complementaire passe en priorite 1,
 *    le client reste actif ;
 *  - client dont c'etait le SEUL tiers-payant : le client est desactive (il apparait dans « Desactives »).
 *
 * Parcours par les vues (compte e2e) :
 *  - GESTION DES TIERS-PAYANTS > Tiers-payants : l'organisme d'essai « ZZE2E ORGANISME RETRAIT » est cree par
 *    « Creer » (ou reactive depuis « Tiers payants desactives » s'il existe deja) ;
 *  - Clients : « Creer » deux clients assurance rattaches a cet organisme ; le premier recoit un complementaire ;
 *  - Tiers-payants : icone « Desactiver le tiers payant » de l'organisme d'essai, « Oui » ;
 *  - Clients : controle des tiers-payants du premier, de la liste et de « Desactives » pour le second.
 * Nettoyage : clients d'essai supprimes par l'icone « Supprimer » de la liste. L'organisme d'essai reste DESACTIVE :
 * l'ecran ne supprime pas un organisme qui a eu des clients ; il est reactive au passage suivant (un seul en base).
 *
 * node client/test-desactivation-organisme.js   (BASE=http://localhost:9080/prestige)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, choisir, saisir, texteMessage } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const ORGANISME = 'ZZE2E ORGANISME RETRAIT';
const PREFIXE = 'ZZE2EORGA';
const MARQUE = PREFIXE + Date.now().toString(36).toUpperCase();

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  p.setDefaultTimeout(60000);
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());

  const fermerMessages = () => p.evaluate(() => { while (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
  const attendreReponse = (motif, methode) => p.waitForResponse((r) => motif.test(r.url()) && r.request().method() === (methode || 'POST'), { timeout: 60000 });
  const fermerFenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && !w.isXType('messagebox')).forEach((w) => w.close()));

  /* clic reel sur l'icone d'une ligne, designee par l'infobulle de sa colonne */
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

  /* ---- organismes ---- */
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

  /* « Creer » : organisme d'essai de type Assurance */
  const creerOrganisme = async () => {
    await cliquer(p, 'tierspayantmanager button[text=Cr&eacute;er]');
    await p.waitForFunction(() => Ext.getCmp('str_FULLNAME') && Ext.getCmp('str_FULLNAME').isVisible(true), null, { timeout: 20000 });
    await p.waitForTimeout(800);
    await saisir(p, '#str_NAME_ADD', ORGANISME);
    /* le nom est recopie dans le nom complet : ne le saisir que s'il ne l'a pas ete */
    if (await p.evaluate(() => Ext.getCmp('str_FULLNAME').getValue()) !== ORGANISME) { await saisir(p, '#str_FULLNAME', ORGANISME); }
    await saisir(p, '#str_CODE_ORGANISME', 'ZZE2E-RETRAIT');
    await choisir(p, '#lg_TYPE_TIERS_PAYANT_ID_ADD', /assurance/i);
    await saisir(p, '#str_ADRESSE', 'ESSAI');
    await saisir(p, '#str_TELEPHONE', '0000000000');
    const invalides = await p.evaluate(() => Ext.getCmp('str_FULLNAME').up('form').query('field').filter((f) => f.isVisible(true) && !f.isValid()).map((f) => f.name || f.id));
    for (const nom of invalides) {
      /* montants obligatoires laisses vides : zero */
      await saisir(p, 'field[name=' + nom + ']', '0').catch(() => {});
    }
    const encore = await p.evaluate(() => Ext.getCmp('str_FULLNAME').up('form').query('field').filter((f) => f.isVisible(true) && !f.isValid()).map((f) => f.name || f.id));
    const reponse = attendreReponse(/tierspayant\/gestion\/create$/);
    await p.click('#' + await p.evaluate(() => Ext.getCmp('str_FULLNAME').up('window').down('button[text=Enregistrer]').getId()));
    const r = await (await reponse).json().catch(() => ({}));
    await p.waitForTimeout(1200); await fermerMessages(); await fermerFenetres();
    return { invalides, encore, r };
  };

  /* « Tiers payants desactives » : icone « Activer ce tiers payant », « Oui » */
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

  /* ---- clients (memes gestes que test-retrait-tiers-payant.js) ---- */
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
  const creerClient = async (prenom, organisme) => {
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
    const reponse = attendreReponse(/client\/gestion\/create$/);
    await p.click('#' + await p.evaluate(() => Ext.getCmp('str_FIRST_NAME').up('window').down('button[text=Enregistrer]').getId()));
    const r = await (await reponse).json().catch(() => ({}));
    await p.waitForTimeout(800); await fermerMessages();
    return { tp, r };
  };
  const ouvrirTiersPayants = async (prenom) => {
    const l = (await chercherClients(false)).find((c) => c.nom.endsWith(' ' + prenom));
    if (!l) { throw new Error('Client d\'essai absent de la liste : ' + prenom); }
    const charge = attendreReponse(/client\/gestion\/tiers-payants\?/, 'GET');
    await cliquerIcone('clientgestion', l.i, 'Ajouter des tiers payants a ce client');
    await charge; await p.waitForTimeout(800);
  };
  const liensAffiches = () => p.evaluate(() => Ext.getCmp('CltgridpanelID').getStore().getRange().map((r) => ({
    id: r.get('lg_COMPTE_CLIENT_TIERS_PAYANT_ID'), tp: r.get('str_TIERS_PAYANT_NAME'), priorite: r.get('int_PRIORITY') })));
  const ajouterTiersPayant = async (rangTp, priorite) => {
    await cliquer(p, 'window[id=cltwinID] button[text=Creer]');
    await p.waitForFunction(() => Ext.getCmp('int_PRIORITY') && Ext.getCmp('int_PRIORITY').isVisible(true), null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const fenetre = await p.evaluate(() => Ext.getCmp('int_PRIORITY').up('window').getId());
    const tp = await choisir(p, 'combobox[name=lg_TIERS_PAYANT_ID]', rangTp);
    await saisir(p, 'field[name=int_POURCENTAGE]', '20');
    await saisir(p, 'field[name=int_PRIORITY]', String(priorite));
    const reponse = attendreReponse(/client\/gestion\/tiers-payants\/create$/);
    await p.click('#' + await p.evaluate((w) => Ext.getCmp(w).down('button[text=Enregistrer]').getId(), fenetre));
    const r = await (await reponse).json().catch(() => ({}));
    await p.waitForTimeout(800); await fermerMessages();
    await p.evaluate((w) => Ext.getCmp(w) && void (Ext.getCmp(w).isVisible() && Ext.getCmp(w).close()), fenetre);
    const recharge = attendreReponse(/client\/gestion\/tiers-payants\?/, 'GET');
    await p.evaluate(() => void Ext.getCmp('CltgridpanelID').getStore().reload()); await recharge;
    await p.waitForTimeout(600);
    return { tp, r };
  };

  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* organisme d'essai : reactive s'il existe deja (passage precedent), sinon cree */
    const reactive = await reactiverOrganisme();
    await ouvrirOrganismes();
    let orga = await chercherOrganisme('tierspayantmanager');
    let creation = null;
    if (!orga.length) { creation = await creerOrganisme(); orga = await chercherOrganisme('tierspayantmanager'); }
    ok('Jeu d\'essai : organisme d\'essai actif (' + (reactive ? 'réactivé' : 'créé') + ')', orga.length >= 1, JSON.stringify({ creation, orga }));
    if (!orga.length) { throw new Error('organisme d\'essai absent'); }
    const nomOrga = orga[0].nom;

    /* deux clients rattaches a l'organisme d'essai ; le premier recoit un complementaire */
    await ouvrirClients();
    const c1 = await creerClient('AVEC COMPLEMENTAIRE', nomOrga);
    const c2 = await creerClient('SEUL', nomOrga);
    ok('Jeu d\'essai : deux clients créés sur l\'organisme d\'essai', c1.tp === nomOrga && c2.tp === nomOrga && (await chercherClients(false)).length === 2, JSON.stringify({ c1, c2 }));
    await ouvrirTiersPayants('AVEC COMPLEMENTAIRE');
    const ajout = await ajouterTiersPayant(1, 2);
    let liens = await liensAffiches();
    ok('Jeu d\'essai : complémentaire ajouté', liens.length === 2 && liens.some((l) => l.tp === nomOrga && l.priorite === 1), JSON.stringify({ ajout, liens }));
    const complementaire = liens.find((l) => l.tp !== nomOrga);
    await fermerFenetres();

    /* desactivation de l'organisme par son icone */
    await ouvrirOrganismes();
    orga = await chercherOrganisme('tierspayantmanager');
    const rep = attendreReponse(/tierspayant\/gestion\/toggle-statut$/);
    await cliquerIcone('tierspayantmanager', orga[0].i, 'Desactiver le tiers payant');
    await cliquer(p, 'messagebox{isVisible()} button[itemId=yes]');
    const r = await (await rep).json().catch(() => ({}));
    await p.waitForTimeout(1000);
    const message = await texteMessage(p); await fermerMessages();
    ok('Désactivation de l\'organisme acceptée', String(r.success) !== '0' && String(r.success) !== 'false', JSON.stringify({ r, message }));

    /* effets sur les clients */
    await ouvrirClients();
    let actifs = await chercherClients(false);
    ok('Le client qui avait un complémentaire reste actif', actifs.some((c) => /AVEC COMPLEMENTAIRE$/.test(c.nom)), JSON.stringify(actifs));
    await ouvrirTiersPayants('AVEC COMPLEMENTAIRE');
    liens = await liensAffiches();
    ok('Son complémentaire passe en priorité 1 (principal)', liens.some((l) => l.id === complementaire.id && l.priorite === 1), JSON.stringify(liens));
    await fermerFenetres();
    ok('Le client dont c\'était le seul tiers-payant quitte la liste', !actifs.some((c) => /SEUL$/.test(c.nom)), JSON.stringify(actifs));
    const desactives = await chercherClients(true);
    ok('Il apparaît dans « Désactivés »', desactives.some((c) => /SEUL$/.test(c.nom)), JSON.stringify(desactives));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    try {
      await fermerMessages(); await fermerFenetres();
      await ouvrirClients();
      /* colonne « Supprimer » masquee par defaut (l'utilisateur l'affiche par le menu des colonnes) */
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
      const reste = (await chercherClients(false, PREFIXE)).length + (await chercherClients(true, PREFIXE)).length;
      ok('Clients d\'essai retirés', reste === 0, reste + ' client(s) d\'essai restant(s)');
    } catch (x) { ok('Clients d\'essai retirés', false, x.message); }
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
