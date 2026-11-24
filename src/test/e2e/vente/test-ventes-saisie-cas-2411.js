/* VENTES EN SAISIE, CAS RESTANTS (cahier des charges du 24/11, point 2), complément de test-ventes-saisie-2411.js.
 *
 * Parcours par les vues ; navigateurs séparés = postes différents :
 *  - admin (compte des tests, tous les droits) ;
 *  - E2E SC1, E2E SC2 : profil réel « Caisse/Commande/Stock ».
 *
 *  A. Poste qui disparaît (SC1, vente au comptant)
 *   A1. « RETOUR » puis Échap : les trois choix se referment, Retour revient, la vente reste ouverte, rien au journal.
 *   A2. Navigateur fermé : la saisie passe INTERROMPUE, cause « FERMETURE ».
 *   A3. Nouveau navigateur (autre session) : rien n'est repris en silence ; le bandeau propose la saisie ; reprise
 *       confirmée dans le bouton ; EN_COURS sur la nouvelle session, mêmes lignes.
 *   A4. Session expirée : plus de signal reconnu ; INTERROMPUE (« plus de signal ») après 2 min ; reconnexion :
 *       bandeau, reprise ; puis « Mettre en attente et quitter ».
 *  B. Vente assurance reprise sur un autre poste : client, bon, tiers payant, lignes identiques en base avant la
 *     mise en attente, après le rappel par SC2 et après sa remise en attente ; l'écran de SC2 montre le même client,
 *     le même bon, les mêmes lignes.
 *  C. Vente en dépôt (« Gestion dépôts extensions », onglet de vente), de bout en bout :
 *   C1. Retour : trois choix dans la barre de l'écran dépôt ; « Mettre en attente et quitter » : EN_ATTENTE, le dépôt
 *       de la vente est gardé.
 *   C2. Une 2e vente en dépôt interrompue (menu quitté) n'est PAS proposée sur l'écran de vente de l'officine ; elle
 *       l'est sur l'écran dépôt, une fois le dépôt choisi.
 *   C3. « Ventes en cours de saisie » > Reprendre : l'écran dépôt s'ouvre, sur le dépôt de la vente, la vente chargée.
 *   C4. Retour > « Supprimer la vente » (confirmé dans le bouton) : lignes dans « Produits retirés et ventes
 *       abandonnées », stock du dépôt et de l'officine inchangés.
 *  D. Temps d'affichage des deux écrans (ventes en cours, journal) sous plafond.
 *  E. Bilan : journal exact de chaque vente, ni plus ni moins ; aucune erreur JavaScript.
 * Tout est retiré à la fin.
 */
const C = require('../ligne-comptant/commun');
const { chromium, A, vues, ok, q, exec } = C;
const ENV_E2E = A.ENV_E2E;

const MDP = 'E2e-Saisie-8';
const COMPTES = [['E2E-SC1', 'e2e-sc1', 'SC1'], ['E2E-SC2', 'e2e-sc2', 'SC2']];
const ROLE_CAISSE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Caisse/Commande/Stock'");
const J0 = Number(q('SELECT IFNULL(MAX(id), 0) FROM vente_journal_saisie'));
const DEPOT = 'E2E-SC-DEPOT';
const NOM_DEPOT = 'DEPOT E2E SAISIE';
const STOCK_DEPOT = 30;
const P1 = C.produitSimple(7);
const P2 = C.produitSimple(8);
const CIP1 = C.cip(P1), CIP2 = C.cip(P2);
const STOCK0 = [A.stock(P1), A.stock(P2)];
const PLAFOND_ECRAN_MS = 5000;
const ventes = [];

const etat = (id) => q("SELECT CONCAT_WS('|', IFNULL(etat_saisie, '-'), IFNULL(saisie_session, '-'), IFNULL(saisie_interruption, '-'), IFNULL(lg_EMPLACEMENT_VENTE_ID, '-'))"
  + " FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'").split('|');
const journal = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', geste, admis, IFNULL(etat_apres, '-'), IFNULL(cause, '-'), IFNULL(utilisateur_id, 'SERVEUR')) ORDER BY id SEPARATOR ' ; '), '')"
  + " FROM vente_journal_saisie WHERE id > " + J0 + " AND vente_id = '" + id + "'");
const attendre = async (p, f, delai, pas) => { const fin = Date.now() + delai; let v; while (Date.now() < fin) { v = f(); if (v) { return v; } await p.waitForTimeout(pas || 1000); } return f(); };
const stockDepot = () => Number(q("SELECT IFNULL(MAX(int_NUMBER_AVAILABLE), -1) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + P1.id + "' AND lg_EMPLACEMENT_ID = '" + DEPOT + "'"));
const ref = (id) => q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
const nbLignes = (id) => q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");

function nettoyer() {
  const v = A.liste(ventes);
  q("DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM vente_suppression WHERE vente_id IN (" + v + ");"
    + " DELETE FROM vente_journal_saisie WHERE id > " + J0 + ";"
    + " DELETE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID = 'E2E-SC-STK';"
    + " DELETE FROM reference WHERE emplacement_id = '" + DEPOT + "';"
    + " DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "';"
    + " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE 'E2E-SC%';"
    + " DELETE FROM t_role_user WHERE lg_USER_ID LIKE 'E2E-SC%';"
    + " DELETE FROM t_event_log WHERE lg_USER_ID LIKE 'E2E-SC%';"
    + " DELETE FROM t_user WHERE lg_USER_ID LIKE 'E2E-SC%'");
}

async function poste(login) {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  await vues.connexion(p, login, login === ENV_E2E.LOGIN ? 'e2etest' : MDP);
  return { b, ctx, p, erreurs };
}
const courante = (p) => C.venteCourante(p);
const couranteDepot = (p) => p.evaluate(() => { const v = testextjs.app.getController('VenteEnDepotCtr').current; return v ? v.lgPREENREGISTREMENTID : null; });
const bandeau = (p) => p.evaluate(() => { const b = document.getElementById('psv-bandeau'); return b && b.style.display !== 'none' ? b.textContent : ''; });
const boutons = (p, ecran) => p.evaluate((e) => ['btnGoBack', 'btnRetourAttente', 'btnRetourSupprimer', 'btnRetourAnnuler'].map((i) => {
  const c = Ext.ComponentQuery.query(e + ' #contenu [xtype=toolbar] #' + i)[0]; return c && c.isVisible(true) ? (c.getText ? c.getText() : 'ok') : null; }), ecran);
const BARRE_V = 'doventemanager #contenu [xtype=toolbar] #';
const BARRE_D = 'doventeendepot #contenu [xtype=toolbar] #';

async function reprendreParBandeau(p, id, ecran) {
  await p.waitForFunction(() => !!document.getElementById('psv-action'), null, { timeout: 20000 });
  await p.click('#psv-action'); await p.waitForTimeout(400);
  await p.click('#psv-action');
  await p.waitForFunction(([v, c]) => { const x = testextjs.app.getController(c).current; return x && x.lgPREENREGISTREMENTID === v; },
    [id, ecran === 'depot' ? 'VenteEnDepotCtr' : 'VenteCtr'], { timeout: 20000 });
}

async function ouvrirDepot(p) {
  await C.ouvrirEcran(p, 'depotextension');
  await C.visible(p, 'depotextension #depotEcran');
  await p.evaluate(() => { Ext.ComponentQuery.query('depotextension #depotEcran')[0].getStore().load(); });
  await p.waitForFunction((d) => Ext.ComponentQuery.query('depotextension #depotEcran')[0].getStore().findRecord('id', d), DEPOT, { timeout: 20000 });
  /* choix du dépôt dans la liste du haut, comme l'utilisateur */
  await p.evaluate((d) => { const c = Ext.ComponentQuery.query('depotextension #depotEcran')[0]; const r = c.getStore().findRecord('id', d);
    c.setValue(d); c.fireEvent('select', c, [r]); }, DEPOT);
  await p.waitForTimeout(800);
  await p.evaluate(() => { const o = Ext.ComponentQuery.query('depotextension #onglets')[0]; o.setActiveTab(o.down('#ongletVente')); });
  await p.waitForFunction((d) => { const c = Ext.ComponentQuery.query('depotextension doventeendepot #depotVente')[0]; return c && c.getValue() === d; }, DEPOT, { timeout: 20000 });
  await p.waitForTimeout(1500);
}
async function taperArticleDepot(p, cipProduit) {
  const champ = 'doventeendepot #contenu #produitContainer [xtype=fieldcontainer] #produit';
  await C.visible(p, champ);
  await vues.cliquer(p, champ);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(cipProduit, { delay: 15 });
  const rep = p.waitForResponse((r) => /\/vente\/add\/(item|vno)/.test(r.url()), { timeout: 60000 });
  await p.keyboard.press('Enter');
  await rep;
  await p.waitForTimeout(1500);
}

(async () => {
  nettoyer();
  for (const [id, login, nom] of COMPTES) {
    q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
      + " VALUES ('" + id + "', '" + login + "', MD5('" + MDP + "'), 'E2E', '" + nom + "', 'Caissier', 'enable', '1', NOW(), 0)");
    q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + id + "', '" + ROLE_CAISSE + "', '" + id + "', NOW())");
    q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_CREATED, lg_CREATED_BY, str_STATUT) VALUES ('" + id + "-RC', '" + id + "', 0, 0, NOW(), '" + id + "', 'is_Using')");
  }
  const compte = q('SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1');
  exec("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_LOCALITE, str_FIRST_NAME, str_LAST_NAME, str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT, lg_TYPEDEPOT_ID, bool_SAME_LOCATION)"
    + " VALUES ('" + DEPOT + "', '" + compte + "', '" + NOM_DEPOT + "', 'E2E', 'ABOBO', 'E2E', 'Depot', '0700000000', NOW(), NOW(), 'enable', '2', 0);"
    + "INSERT INTO t_famille_stock (lg_FAMILLE_STOCK_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_AVAILABLE, dt_CREATED, dt_UPDATED, lg_EMPLACEMENT_ID, str_STATUT, int_UG, VERSION)"
    + " VALUES ('E2E-SC-STK', '" + P1.id + "', " + STOCK_DEPOT + ", " + STOCK_DEPOT + ", NOW(), NOW(), '" + DEPOT + "', 'enable', 0, 0)");
  A.ouvrirCaisse();
  const TP = A.tiersPayant('SC', '1');
  await A.clientAssure(null, 'SCA', [{ tp: TP, taux: 70 }]);
  const postes = [];
  try {
    let c1 = await poste('e2e-sc1'); postes.push(c1);

    /* A1. Echap sur le choix du Retour */
    await C.nouvelleVente(c1.p);
    await C.taperArticle(c1.p, CIP1);
    await C.taperArticle(c1.p, CIP2);
    const va = await courante(c1.p); ventes.push(va);
    const refA = ref(va);
    const ea = await attendre(c1.p, () => { const e = etat(va); return e[0] === 'EN_COURS' ? e : null; }, 10000, 300);
    await vues.cliquer(c1.p, BARRE_V + 'btnGoBack');
    await c1.p.waitForTimeout(500);
    const a1 = await boutons(c1.p, 'doventemanager');
    await c1.p.keyboard.press('Escape');
    await c1.p.waitForTimeout(500);
    ok('A1. Retour puis Échap : les trois choix se referment, Retour revient, la vente reste ouverte et EN_COURS',
      a1[1] === 'METTRE EN ATTENTE ET QUITTER' && JSON.stringify(await boutons(c1.p, 'doventemanager')) === JSON.stringify(['RETOUR', null, null, null])
      && (await courante(c1.p)) === va && etat(va)[0] === 'EN_COURS', JSON.stringify(a1) + ' ' + JSON.stringify(await boutons(c1.p, 'doventemanager')));
    ok('A1. Échap n\'écrit rien au journal', journal(va) === 'DEBUT_SAISIE/1/EN_COURS/-/E2E-SC1', journal(va));

    /* A2. navigateur ferme */
    /* l'onglet est fermé, le navigateur reste ouvert quelques secondes (comme chez l'utilisateur) ; un navigateur tué
     * d'un coup n'envoie rien : c'est alors le délai sans signal qui joue (A4) */
    await c1.p.close({ runBeforeUnload: true });
    await new Promise((r) => setTimeout(r, 3000));
    await c1.b.close();
    postes.splice(postes.indexOf(c1), 1);
    const e2 = await attendre({ waitForTimeout: (ms) => new Promise((r) => setTimeout(r, ms)) }, () => { const e = etat(va); return e[0] === 'INTERROMPUE' ? e : null; }, 15000, 500);
    ok('A2. Navigateur fermé : INTERROMPUE, cause « FERMETURE »', e2 && e2[2] === 'FERMETURE', JSON.stringify(etat(va)));

    /* A3. nouveau navigateur */
    c1 = await poste('e2e-sc1'); postes.push(c1);
    await C.nouvelleVente(c1.p);
    await c1.p.waitForFunction(() => !!document.getElementById('psv-action'), null, { timeout: 20000 });
    await c1.p.waitForTimeout(3000);
    ok('A3. Nouvelle session : rien n\'est repris en silence (toujours INTERROMPUE) ; le bandeau propose la saisie (numéro, 2 lignes)',
      etat(va)[0] === 'INTERROMPUE' && (await bandeau(c1.p)).indexOf(refA) >= 0 && /2 ligne/.test(await bandeau(c1.p)), (await bandeau(c1.p)) + ' ' + etat(va).join('|'));
    await reprendreParBandeau(c1.p, va, 'vente');
    const e3 = await attendre(c1.p, () => { const e = etat(va); return e[0] === 'EN_COURS' ? e : null; }, 10000, 300);
    ok('A3. Reprise confirmée dans le bouton : EN_COURS sur la nouvelle session, mêmes 2 lignes', e3 && e3[1] !== ea[1] && nbLignes(va) === '2', JSON.stringify(etat(va)));

    /* A4. session expiree */
    await c1.ctx.clearCookies();
    const e4 = await attendre(c1.p, () => { const e = etat(va); return e[0] === 'INTERROMPUE' ? e : null; }, 210000, 5000);
    ok('A4. Session expirée : INTERROMPUE après 2 min sans signal reconnu (« SIGNAL_PERDU »)', e4 && e4[2] === 'SIGNAL_PERDU', JSON.stringify(etat(va)));
    await vues.connexion(c1.p, 'e2e-sc1', MDP);
    ok('A4. La page de connexion (sans session) ne change rien à la saisie', etat(va)[0] === 'INTERROMPUE' && etat(va)[2] === 'SIGNAL_PERDU', etat(va).join('|'));
    await C.nouvelleVente(c1.p);
    await reprendreParBandeau(c1.p, va, 'vente');
    const e4b = await attendre(c1.p, () => { const e = etat(va); return e[0] === 'EN_COURS' ? e : null; }, 10000, 300);
    ok('A4. Reconnexion : bandeau, reprise ; EN_COURS, mêmes 2 lignes', !!e4b && nbLignes(va) === '2', JSON.stringify(etat(va)));
    await vues.cliquer(c1.p, BARRE_V + 'btnGoBack'); await c1.p.waitForTimeout(400);
    await vues.cliquer(c1.p, BARRE_V + 'btnRetourAttente');
    await attendre(c1.p, () => etat(va)[0] === 'EN_ATTENTE', 10000, 300);
    ok('A4. « Mettre en attente et quitter » : EN_ATTENTE, écran vidé', etat(va)[0] === 'EN_ATTENTE' && (await courante(c1.p)) === null, etat(va).join('|'));
    ok('A. Journal de la vente : début, fermeture, reprise, signal perdu, reprise, attente — ni plus ni moins',
      journal(va) === ['DEBUT_SAISIE/1/EN_COURS/-/E2E-SC1', 'INTERROMPRE/1/INTERROMPUE/FERMETURE/E2E-SC1', 'REPRENDRE_INTERROMPUE/1/EN_COURS/-/E2E-SC1',
        'INTERROMPRE/1/INTERROMPUE/SIGNAL_PERDU/SERVEUR', 'REPRENDRE_INTERROMPUE/1/EN_COURS/-/E2E-SC1', 'METTRE_EN_ATTENTE/1/EN_ATTENTE/-/E2E-SC1'].join(' ; '), journal(va));

    /* B. assurance reprise sur un autre poste */
    const ad = await poste(ENV_E2E.LOGIN); postes.push(ad);
    const c2 = await poste('e2e-sc2'); postes.push(c2);
    await C.nouvelleVente(ad.p);
    await C.passerEnAssurance(ad.p);
    await C.choisirClient(ad.p, C.MARQUE + ' SCA');
    await C.saisirBon(ad.p, 1, C.MARQUE + '-BON-SC');
    await C.taperArticle(ad.p, CIP1);
    await C.taperArticle(ad.p, CIP2);
    const vb = await courante(ad.p); ventes.push(vb);
    const photo = () => q("SELECT CONCAT_WS('#', lg_TYPE_VENTE_ID, IFNULL(lg_CLIENT_ID, '-'), IFNULL(lg_AYANTS_DROITS_ID, '-'), int_PRICE, str_STATUT) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vb + "'")
      + '#' + C.lignes(vb) + '#' + q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', lg_COMPTE_CLIENT_TIERS_PAYANT_ID, str_REF_BON, int_PERCENT) ORDER BY lg_COMPTE_CLIENT_TIERS_PAYANT_ID), '-')"
      + " FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + vb + "'");
    await attendre(ad.p, () => etat(vb)[0] === 'EN_COURS', 10000, 300);
    const pb0 = photo();
    ok('B. Vente assurance préparée : client, bon, 2 lignes', /^2#/.test(pb0) && pb0.indexOf(C.MARQUE + '-BON-SC') >= 0 && nbLignes(vb) === '2', pb0);
    await vues.cliquer(ad.p, BARRE_V + 'btnStandBy');
    await attendre(ad.p, () => etat(vb)[0] === 'EN_ATTENTE', 10000, 300);
    await ad.p.waitForTimeout(1500);
    if (await vues.texteMessage(ad.p)) { await vues.repondre(ad.p, 'ok').catch(() => {}); }
    const pb1 = photo();
    ok('B. Mise en attente : EN_ATTENTE, base identique (client, ayant droit, bon, taux, lignes, montant)', etat(vb)[0] === 'EN_ATTENTE' && pb1 === pb0, pb1 + ' / ' + pb0);
    await C.nouvelleVente(c2.p);
    await c2.p.click('#' + await c2.p.evaluate(() => Ext.ComponentQuery.query('doventemanager #preventeSearchBtn')[0].getId()));
    await c2.p.waitForFunction((r) => [...document.querySelectorAll('.va-carte .va-ticket')].some((x) => x.textContent === r), ref(vb), { timeout: 20000 });
    await c2.p.evaluate((r) => { const c = [...document.querySelectorAll('.va-carte')].find((x) => x.querySelector('.va-ticket').textContent === r); c.id = 'carte-visee'; }, ref(vb));
    await c2.p.click('#carte-visee'); await c2.p.waitForTimeout(800);
    await c2.p.keyboard.press('Enter');
    await c2.p.waitForFunction((id) => { const c = testextjs.app.getController('VenteCtr'); return c.current && c.current.lgPREENREGISTREMENTID === id; }, vb, { timeout: 20000 });
    await c2.p.waitForTimeout(2500);
    const ecranB = await c2.p.evaluate(() => {
      const v = (s) => { const c = Ext.ComponentQuery.query('doventemanager ' + s)[0]; return c ? c.getValue() : null; };
      const g = Ext.ComponentQuery.query('doventemanager #contenu #gridContainer #venteGrid')[0];
      /* le client tel que l'écran le montre : textes affichés et valeurs des champs */
      const ecran = Ext.ComponentQuery.query('doventemanager #contenu')[0];
      const vus = [ecran.getEl().dom.innerText].concat(ecran.query('field').map((f) => String(f.getRawValue ? f.getRawValue() : ''))).join(' | ');
      return { type: v('#typeVente'), bon: v('#contenu #refBon1'), client: vus, lignes: g ? g.getStore().getCount() : -1 };
    });
    const pb2 = photo();
    ok('B. Rappel par SC2 : EN_COURS ; base identique', etat(vb)[0] === 'EN_COURS' && pb2.replace('#is_Process', '').replace('#pending', '') === pb0.replace('#is_Process', '').replace('#pending', ''), pb2 + ' / ' + pb0);
    ok('B. Écran de SC2 = base : type Assurance, même bon, même client, 2 lignes', ecranB.type === '2' && ecranB.bon === C.MARQUE + '-BON-SC'
      && /SCA/.test(ecranB.client) && ecranB.lignes === 2, JSON.stringify(Object.assign({}, ecranB, { client: (ecranB.client.match(/.{0,40}SCA.{0,20}/) || ['client absent'])[0] })));
    await vues.cliquer(c2.p, BARRE_V + 'btnGoBack'); await c2.p.waitForTimeout(400);
    await vues.cliquer(c2.p, BARRE_V + 'btnRetourAttente');
    await attendre(c2.p, () => etat(vb)[0] === 'EN_ATTENTE', 10000, 300);
    ok('B. SC2 « Mettre en attente et quitter » : EN_ATTENTE, base toujours identique', etat(vb)[0] === 'EN_ATTENTE' && photo().replace(/#(is_Process|pending)/, '') === pb0.replace(/#(is_Process|pending)/, ''), photo());
    ok('B. Journal : début, attente, rappel par SC2, attente par SC2', journal(vb) === ['DEBUT_SAISIE/1/EN_COURS/-/' + A.ADMIN, 'METTRE_EN_ATTENTE/1/EN_ATTENTE/-/' + A.ADMIN,
      'REPRENDRE_ATTENTE/1/EN_COURS/-/E2E-SC2', 'METTRE_EN_ATTENTE/1/EN_ATTENTE/-/E2E-SC2'].join(' ; '), journal(vb));

    /* C. vente en depot */
    const stockOff0 = A.stock(P1);
    await ouvrirDepot(ad.p);
    await taperArticleDepot(ad.p, CIP1);
    const vc1 = await couranteDepot(ad.p); ventes.push(vc1);
    const ec1 = await attendre(ad.p, () => { const e = etat(vc1); return e[0] === 'EN_COURS' ? e : null; }, 10000, 300);
    ok('C. Vente saisie dans l\'onglet de vente du dépôt : EN_COURS, dépôt de la vente noté', ec1 && ec1[3] === DEPOT, JSON.stringify(etat(vc1)));
    await vues.cliquer(ad.p, BARRE_D + 'btnGoBack'); await ad.p.waitForTimeout(500);
    const bc1 = await boutons(ad.p, 'doventeendepot');
    ok('C1. Retour (écran dépôt) : trois choix dans la barre, Retour masqué', bc1[0] === null && bc1[1] === 'METTRE EN ATTENTE ET QUITTER' && bc1[2] === 'SUPPRIMER LA VENTE' && bc1[3] === 'ANNULER', JSON.stringify(bc1));
    await vues.cliquer(ad.p, BARRE_D + 'btnRetourAttente');
    await attendre(ad.p, () => etat(vc1)[0] === 'EN_ATTENTE', 10000, 300);
    ok('C1. « Mettre en attente et quitter » : EN_ATTENTE, le dépôt de la vente est gardé', etat(vc1)[0] === 'EN_ATTENTE' && etat(vc1)[3] === DEPOT, etat(vc1).join('|'));

    /* la sortie de l'écran dépôt ramène, comme avant ce plan, aux ventes de l'officine : retour par le menu */
    await ad.p.waitForTimeout(1500);
    await ouvrirDepot(ad.p);
    await taperArticleDepot(ad.p, CIP1);
    const vc2 = await couranteDepot(ad.p); ventes.push(vc2);
    const refC2 = ref(vc2);
    await attendre(ad.p, () => etat(vc2)[0] === 'EN_COURS', 10000, 300);
    const lignesC2 = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, 'x', int_QUANTITY) ORDER BY lg_FAMILLE_ID) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + vc2 + "'");
    await C.ouvrirEcran(ad.p, 'cloturerventemanager');
    const ec2 = await attendre(ad.p, () => { const e = etat(vc2); return e[0] === 'INTERROMPUE' ? e : null; }, 15000, 500);
    ok('C2. Vente en dépôt, menu quitté : INTERROMPUE (« MENU »)', ec2 && ec2[2] === 'MENU', etat(vc2).join('|'));
    await C.visible(ad.p, 'cloturerventemanager #addBtn');
    await vues.cliquer(ad.p, 'cloturerventemanager #addBtn');
    await C.visible(ad.p, C.CHAMP_PRODUIT);
    await ad.p.waitForTimeout(7000);
    const bOff = await bandeau(ad.p);
    ok('C2. Écran de vente de l\'officine : la saisie interrompue du DÉPÔT n\'y est pas proposée', bOff.indexOf(refC2) < 0, bOff);
    await ouvrirDepot(ad.p);
    await ad.p.waitForFunction(() => !!document.getElementById('psv-action'), null, { timeout: 15000 }).catch(() => {});
    const bDep = await bandeau(ad.p);
    ok('C2. Écran dépôt, dépôt choisi : la saisie interrompue y est proposée', bDep.indexOf(refC2) >= 0, bDep);

    /* C3. reprise depuis « Ventes en cours de saisie » */
    const t0 = Date.now();
    await C.ouvrirEcran(ad.p, 'ventesencourssaisie');
    await C.visible(ad.p, 'ventesencourssaisie #vcsGrille');
    await ad.p.waitForFunction((r) => { const v = Ext.ComponentQuery.query('ventesencourssaisie')[0]; return v && !v.ventes.isLoading() && v.ventes.findRecord('numero', r); }, refC2, { timeout: 20000 });
    const dureeVcs = Date.now() - t0 - 800;
    /* la grille se redessine au 1er clic (bouton armé) : la ligne est retrouvée par son numéro à chaque clic */
    const boutonReprendre = () => ad.p.locator('.x-grid-row', { hasText: refC2 }).locator('.vcs-reprendre').first();
    await boutonReprendre().click(); await ad.p.waitForTimeout(400);
    await boutonReprendre().click();
    await ad.p.waitForFunction((v) => { const x = testextjs.app.getController('VenteEnDepotCtr').current; return x && x.lgPREENREGISTREMENTID === v
      && Ext.ComponentQuery.query('doventeendepot').some((e) => e.isVisible(true)); }, vc2, { timeout: 20000 }).catch(() => {});
    const ec3 = await attendre(ad.p, () => { const e = etat(vc2); return e[0] === 'EN_COURS' ? e : null; }, 10000, 300);
    const ecranC3 = await ad.p.evaluate(() => ({ depot: Ext.ComponentQuery.query('depotextension #depotEcran').map((c) => c.getValue())[0] || null,
      depotVente: Ext.ComponentQuery.query('doventeendepot #depotVente').map((c) => c.getValue())[0] || null,
      officine: Ext.ComponentQuery.query('doventemanager').some((e) => e.isVisible(true)) }));
    ok('C3. « Reprendre » : l\'écran dépôt s\'ouvre sur le dépôt de la vente, la vente chargée, EN_COURS ; pas l\'écran de l\'officine',
      !!ec3 && (await couranteDepot(ad.p)) === vc2 && ecranC3.depot === DEPOT && ecranC3.depotVente === DEPOT && !ecranC3.officine, JSON.stringify(ecranC3) + ' ' + etat(vc2).join('|'));

    /* C4. Retour > supprimer */
    await vues.cliquer(ad.p, BARRE_D + 'btnGoBack'); await ad.p.waitForTimeout(400);
    await vues.cliquer(ad.p, BARRE_D + 'btnRetourSupprimer'); await ad.p.waitForTimeout(600);
    ok('C4. 1er clic : confirmation demandée dans le bouton, rien n\'est supprimé', (await boutons(ad.p, 'doventeendepot'))[2] === 'CONFIRMER LA SUPPRESSION' && nbLignes(vc2) === '1');
    await vues.cliquer(ad.p, BARRE_D + 'btnRetourSupprimer');
    await attendre(ad.p, () => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vc2 + "'") === '0', 15000, 300);
    const retirees = q("SELECT IFNULL(GROUP_CONCAT(CONCAT(produit_id, 'x', quantite) ORDER BY produit_id), '') FROM vente_suppression WHERE vente_id = '" + vc2 + "'");
    ok('C4. 2e clic : vente supprimée, lignes dans « Produits retirés et ventes abandonnées » (mêmes produits, mêmes quantités)', retirees === lignesC2 && retirees !== '', retirees + ' / ' + lignesC2);
    ok('C4. Stock du dépôt et de l\'officine inchangés', stockDepot() === STOCK_DEPOT && A.stock(P1) === stockOff0, stockDepot() + ' ' + A.stock(P1) + '/' + stockOff0);
    ok('C. Journal des deux ventes en dépôt', journal(vc1) === 'DEBUT_SAISIE/1/EN_COURS/-/' + A.ADMIN + ' ; METTRE_EN_ATTENTE/1/EN_ATTENTE/-/' + A.ADMIN
      && journal(vc2) === ['DEBUT_SAISIE/1/EN_COURS/-/' + A.ADMIN, 'INTERROMPRE/1/INTERROMPUE/MENU/' + A.ADMIN, 'REPRENDRE_INTERROMPUE/1/EN_COURS/-/' + A.ADMIN,
        'RETOUR_SUPPRIMER/1/ABANDONNEE/-/' + A.ADMIN].join(' ; '), journal(vc1) + ' || ' + journal(vc2));

    /* D. temps d'affichage */
    const t1 = Date.now();
    await C.ouvrirEcran(ad.p, 'journalsaisievente');
    await C.visible(ad.p, 'journalsaisievente #jsvGrille');
    await ad.p.waitForFunction(() => /intacte|ROMPUE/.test(Ext.ComponentQuery.query('journalsaisievente #jsvChaine')[0].getEl().dom.textContent), null, { timeout: 30000 });
    const dureeJournal = Date.now() - t1 - 800;
    ok('D. « Ventes en cours de saisie » affiché, données comprises, sous ' + PLAFOND_ECRAN_MS + ' ms', dureeVcs < PLAFOND_ECRAN_MS, dureeVcs + ' ms');
    ok('D. « Journal des ventes en saisie » affiché, chaîne vérifiée, sous ' + PLAFOND_ECRAN_MS + ' ms', dureeJournal < PLAFOND_ECRAN_MS, dureeJournal + ' ms');
    ok('D. Chaîne du journal intacte après tout le parcours', /intacte/.test(await ad.p.evaluate(() => Ext.ComponentQuery.query('journalsaisievente #jsvChaine')[0].getEl().dom.textContent)));

    /* E. bilan */
    const n = Number(q('SELECT COUNT(*) FROM vente_journal_saisie WHERE id > ' + J0));
    ok('E. Bilan : exactement 16 lignes au journal pour tout le parcours, ni plus ni moins', n === 16, n + ' : ' + q("SELECT GROUP_CONCAT(geste ORDER BY id) FROM vente_journal_saisie WHERE id > " + J0));
    ok('E. Stock de l\'officine inchangé (aucune vente clôturée)', A.stock(P1) === STOCK0[0] && A.stock(P2) === STOCK0[1], [A.stock(P1), A.stock(P2), STOCK0].join(' '));
    ok('E. Aucune erreur JavaScript', postes.every((s) => s.erreurs.length === 0), postes.map((s) => s.erreurs.join(' | ')).join(' || '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    for (const s of postes) { await s.b.close().catch(() => {}); }
    nettoyer();
    A.nettoyer();
    ok('Nettoyage : ventes, lignes retirées, journal du test, dépôt, comptes retirés',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + A.liste(ventes) + ")") === '0'
      && q('SELECT COUNT(*) FROM vente_journal_saisie WHERE id > ' + J0) === '0' && q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID LIKE 'E2E-SC%'") === '0'
      && q("SELECT COUNT(*) FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "'") === '0');
    process.exit(A.bilan() ? 1 : 0);
  }
})();
