/* PLAN « CLIENTS ASSURES ET TIERS-PAYANTS » (02/11), ETAPE 2 : retirer un tiers-payant d'un client assure.
 *
 * Un client assure n'existe que par son assurance :
 *  - retirer son dernier tiers-payant actif desactive le client dans la meme operation : il quitte la liste des
 *    clients et apparait dans « Desactives » ;
 *  - retirer son principal alors qu'il lui reste un complementaire : ce complementaire passe en priorite 1.
 *
 * Parcours par les vues (compte e2e) : GESTION DES TIERS-PAYANTS > Clients, « Creer » (client assurance et son
 * tiers-payant), icone « Ajouter des tiers payants a ce client », « Creer » (second tiers-payant), icone « Supprimer »
 * de la ligne puis confirmation dans l'icone. Les clients d'essai sont supprimes a la fin par l'icone « Supprimer »
 * de la liste des clients.
 *
 * node client/test-retrait-tiers-payant.js   (BASE=http://localhost:9080/prestige)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, choisir, saisir, texteMessage } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const MARQUE = 'ZZE2ERETRAIT' + Date.now().toString(36).toUpperCase();
const UN = { nom: MARQUE, prenom: 'UN' }, DEUX = { nom: MARQUE, prenom: 'DEUX' };

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());

  const fermerMessages = () => p.evaluate(() => { while (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
  const attendreReponse = (motif, methode) => p.waitForResponse((r) => motif.test(r.url()) && r.request().method() === (methode || 'POST'), { timeout: 30000 });

  /* liste des clients : recherche par la barre, lignes du marqueur */
  const chercher = async (desactives, terme) => {
    terme = terme || MARQUE;
    const bascule = await p.evaluate(() => { const bt = Ext.getCmp('BT_CLIENT_VOIR_DESACTIVES'); return bt ? { vue: bt.isVisible(), presse: !!bt.pressed } : null; });
    if (bascule && bascule.vue && bascule.presse !== !!desactives) {
      const charge = attendreReponse(/client\/gestion\?/, 'GET');
      await cliquer(p, '#BT_CLIENT_VOIR_DESACTIVES'); await charge;
    }
    await saisir(p, '#rechecher', terme);
    const charge = attendreReponse(/client\/gestion\?/, 'GET');
    await cliquer(p, 'clientgestion button[text=rechercher]'); await charge;
    await p.waitForTimeout(800);
    return p.evaluate((m) => Ext.ComponentQuery.query('clientgestion')[0].getStore().getRange()
      .filter((r) => (r.get('str_FIRST_LAST_NAME') || '').indexOf(m) >= 0)
      .map((r) => ({ id: r.get('lg_CLIENT_ID'), nom: r.get('str_FIRST_LAST_NAME') })), terme);
  };

  /* clic reel sur une icone de ligne d'une grille */
  /* clic reel sur l'icone d'une ligne, designee par l'infobulle de sa colonne (le theme redessine les images) */
  const cliquerIcone = async (grille, indexLigne, infobulle) => {
    const sel = await p.evaluate(([g, i, info]) => {
      const grid = Ext.ComponentQuery.query(g).filter((x) => x.isVisible(true))[0];
      const col = grid.query('actioncolumn').find((c) => c.items && c.items.some((it) => it.tooltip === info));
      const ligne = grid.getView().getNode(i);
      const icone = col && ligne ? Array.from(ligne.querySelectorAll('.x-grid-cell-' + col.getId() + ' img.x-action-col-icon')).find((x) => x.offsetWidth > 0) : null;
      if (!icone) { return null; }
      icone.id = icone.id || ('e2e-icone-' + Date.now());
      return '#' + icone.id;
    }, [grille, indexLigne, infobulle]);
    if (!sel) { throw new Error('Icône « ' + infobulle + ' » absente sur la ligne ' + indexLigne + ' de ' + grille); }
    await p.click(sel);
  };
  const ligneClient = (prenom) => p.evaluate(([m, pr]) => Ext.ComponentQuery.query('clientgestion')[0].getStore()
    .findBy((r) => (r.get('str_FIRST_LAST_NAME') || '').indexOf(m) >= 0 && (r.get('str_FIRST_LAST_NAME') || '').indexOf(pr) >= 0), [MARQUE, prenom]);

  /* « Creer » : client assurance avec son premier tiers-payant (rang dans la liste des organismes) */
  const creerClient = async (c, rangTp) => {
    await cliquer(p, 'clientgestion button[text=Cr&eacute;er]');
    await p.waitForFunction(() => Ext.getCmp('str_FIRST_NAME') && Ext.getCmp('str_FIRST_NAME').isVisible(true), null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const organismes = attendreReponse(/client\/tiers-payants\?lg_TYPE_TIERS_PAYANT_ID=1/, 'GET');
    const type = await choisir(p, '#lg_TYPE_TIERS_PAYANT_ID', /assurance/i);
    await organismes; await p.waitForTimeout(500);
    await saisir(p, '#str_FIRST_NAME', c.nom);
    await saisir(p, '#str_LAST_NAME', c.prenom);
    await p.locator('#str_SEXE').getByText('Masculin').click();
    const tp = await choisir(p, 'combobox[name=lg_TIERS_PAYANT_ID]', rangTp);
    await saisir(p, 'field[name=int_POURCENTAGE]', '80');
    /* priorite : champ masque a la creation, le premier tiers-payant est le principal */
    const invalides = await p.evaluate(() => Ext.getCmp('str_FIRST_NAME').up('form').query('field').filter((f) => !f.isValid()).map((f) => f.name || f.id));
    const reponse = attendreReponse(/client\/gestion\/create$/);
    await p.click('#' + await p.evaluate(() => Ext.getCmp('str_FIRST_NAME').up('window').down('button[text=Enregistrer]').getId()));
    const r = await (await reponse).json().catch(() => ({}));
    await p.waitForTimeout(800); await fermerMessages();
    return { type, tp, invalides, r };
  };

  /* fenetre « Gestion des tiers payants du client » */
  const ouvrirTiersPayants = async (prenom) => {
    const i = await ligneClient(prenom);
    if (i < 0) { throw new Error('Client d\'essai absent de la liste : ' + prenom); }
    const charge = attendreReponse(/client\/gestion\/tiers-payants\?/, 'GET');
    await cliquerIcone('clientgestion', i, 'Ajouter des tiers payants a ce client');
    await charge;
    await p.waitForTimeout(800);
  };
  const liensAffiches = () => p.evaluate(() => Ext.getCmp('CltgridpanelID').getStore().getRange().map((r, i) => ({
    i, id: r.get('lg_COMPTE_CLIENT_TIERS_PAYANT_ID'), tp: r.get('str_TIERS_PAYANT_NAME'), priorite: r.get('int_PRIORITY'),
    regime: Ext.getCmp('CltgridpanelID').getView().getNode(i).innerText })));
  const fermerTiersPayants = async () => { await cliquer(p, 'window[id=cltwinID] button[text=Retour]').catch(() => p.evaluate(() => void (Ext.getCmp('cltwinID') && Ext.getCmp('cltwinID').close()))); await p.waitForTimeout(500); };

  const ajouterTiersPayant = async (rangTp, priorite) => {
    await cliquer(p, 'window[id=cltwinID] button[text=Creer]');
    await p.waitForFunction(() => Ext.getCmp('int_PRIORITY') && Ext.getCmp('int_PRIORITY').isVisible(true), null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const tp = await choisir(p, 'combobox[name=lg_TIERS_PAYANT_ID]', rangTp);
    await saisir(p, 'field[name=int_POURCENTAGE]', '20');
    await saisir(p, 'field[name=int_PRIORITY]', String(priorite));
    const reponse = attendreReponse(/client\/gestion\/tiers-payants\/create$/);
    const recharge = attendreReponse(/client\/gestion\/tiers-payants\?/, 'GET').catch(() => null);
    const fenetreAjout = await p.evaluate(() => Ext.getCmp('int_PRIORITY').up('window').getId());
    await p.click('#' + await p.evaluate((w) => Ext.getCmp(w).down('button[text=Enregistrer]').getId(), fenetreAjout));
    const r = await (await reponse).json().catch(() => ({}));
    await p.waitForTimeout(800); await fermerMessages();
    await p.evaluate((w) => Ext.getCmp(w) && void (Ext.getCmp(w).isVisible() && Ext.getCmp(w).close()), fenetreAjout);
    await p.evaluate(() => Ext.getCmp('CltgridpanelID').getStore().reload() && undefined); await recharge;
    await p.waitForTimeout(800);
    return { tp, r };
  };

  /* icone « Supprimer » de la ligne, puis confirmation dans l'icone ; renvoie le message affiche */
  const retirer = async (indexLigne) => {
    await cliquerIcone('#CltgridpanelID', indexLigne, 'Supprimer');
    await p.waitForTimeout(400);
    const confirmation = await p.evaluate(() => {
      const c = Array.from(document.querySelectorAll('.prestige-confirmer-icone')).find((x) => x.offsetWidth > 0);
      return c ? { texte: c.innerText || c.title, id: c.id || (c.id = 'e2e-confirmer-' + Date.now()) } : null;
    });
    const reponse = attendreReponse(/client\/gestion\/tiers-payants\/delete$/);
    if (confirmation) { await p.click('#' + confirmation.id); } else { await cliquer(p, 'messagebox{isVisible()} button[itemId=yes]'); }
    const r = await (await reponse).json().catch(() => ({}));
    await p.waitForTimeout(1200);
    const message = await texteMessage(p);
    await fermerMessages();
    return { confirmation, r, message };
  };

  const crees = [];
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Clients');
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.ComponentQuery.query('clientgestion').length, null, { timeout: 60000 });
    await p.waitForTimeout(2000);

    /* jeu d'essai, par les ecrans */
    const c1 = await creerClient(UN, 0);
    const c2 = await creerClient(DEUX, 0);
    let liste = await chercher(false);
    crees.push(...liste.map((x) => x.id));
    ok('Jeu d\'essai : deux clients assurance créés par « Créer »', liste.length === 2, JSON.stringify({ c1, c2, liste }));
    await ouvrirTiersPayants('DEUX');
    const ajout = await ajouterTiersPayant(1, 2);
    let liens = await liensAffiches();
    ok('Fiche client : « Ajouter un tiers payant » propose les organismes et ajoute le second', liens.length === 2 && ajout.tp && ajout.tp !== c2.tp, JSON.stringify({ ajout, liens }));
    if (liens.length !== 2) { throw new Error('jeu d\'essai incomplet'); }

    /* cas 1 : retrait du principal, le complementaire passe en priorite 1 */
    const principal = liens.find((l) => l.priorite === 1);
    const complementaire = liens.find((l) => l.priorite !== 1);
    const r1 = await retirer(principal.i);
    liens = await liensAffiches();
    ok('Retrait du principal accepté', String(r1.r.success) !== '0' && liens.length === 1, JSON.stringify({ r1, liens }));
    ok('Le complémentaire restant passe en priorité 1 (principal)', liens.length === 1 && liens[0].id === complementaire.id && liens[0].priorite === 1, JSON.stringify(liens));
    ok('Le message annonce le nouveau principal', /devient le tiers-payant principal/i.test(r1.message + ' ' + (r1.r.errors || '')), r1.message);
    await fermerTiersPayants();
    liste = await chercher(false);
    ok('Le client DEUX reste actif', liste.some((x) => /DEUX/.test(x.nom)), JSON.stringify(liste));

    /* cas 2 : retrait du dernier tiers-payant, le client est desactive */
    await ouvrirTiersPayants('UN');
    liens = await liensAffiches();
    const r2 = await retirer(0);
    ok('Retrait du dernier tiers-payant accepté', String(r2.r.success) !== '0', JSON.stringify(r2));
    ok('Le message dit que le client est désactivé', /d[ée]sactiv/i.test(r2.message + ' ' + (r2.r.errors || '')), r2.message);
    await fermerTiersPayants();
    liste = await chercher(false);
    ok('Le client UN quitte la liste des clients actifs', !liste.some((x) => /\bUN\b/.test(x.nom)), JSON.stringify(liste));
    const desactives = await chercher(true);
    ok('Le client UN apparaît dans « Désactivés »', desactives.some((x) => /\bUN\b/.test(x.nom)), JSON.stringify(desactives));

    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    /* retrait des clients d'essai par l'icone « Supprimer » de la liste (actifs puis desactives) */
    try {
      await fermerMessages();
      await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && !w.isXType('messagebox')).forEach((w) => w.close()));
      /* colonne « Supprimer » masquee par defaut (l'utilisateur l'affiche par le menu des colonnes) */
      await p.evaluate(() => Ext.ComponentQuery.query('clientgestion')[0].query('actioncolumn')
        .filter((c) => c.items.some((it) => it.tooltip === 'Supprimer')).forEach((c) => c.show()));
      for (const vue of [false, true]) {
        const liste = await chercher(vue, 'ZZE2ERETRAIT');
        for (const c of liste) {
          const i = await p.evaluate((id) => Ext.ComponentQuery.query('clientgestion')[0].getStore().findBy((r) => r.get('lg_CLIENT_ID') === id), c.id);
          await cliquerIcone('clientgestion', i, 'Supprimer');
          await p.waitForTimeout(400);
          const conf = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('.prestige-confirmer-icone')).find((x) => x.offsetWidth > 0); return c ? (c.id || (c.id = 'e2e-sup-' + Date.now())) : null; });
          const rep = attendreReponse(/client\/gestion\/delete$/);
          if (conf) { await p.click('#' + conf); } else { await cliquer(p, 'messagebox{isVisible()} button[itemId=yes]'); }
          await rep; await p.waitForTimeout(800); await fermerMessages();
        }
      }
      const reste = (await chercher(false, 'ZZE2ERETRAIT')).length + (await chercher(true, 'ZZE2ERETRAIT')).length;
      ok('Jeu d\'essai retiré', reste === 0, reste + ' client(s) d\'essai restant(s)');
    } catch (x) { ok('Jeu d\'essai retiré', false, MARQUE + ' : ' + x.message); }
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
