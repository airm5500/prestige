/* RETOUR DU 05/11, LOT C : dans l'onglet Analyse de l'ordonnancier, a cote du nom du client, son numero.
 * Reponse du 05/11 : client standard, son telephone ; client assurance, son telephone, a defaut son adresse.
 *
 * Jeu d'essai propre au test (aucune donnee de vrai client lue) : quatre clients marques, un medecin, quatre ventes
 * closes du jour avec un produit de l'ordonnancier :
 *   A standard avec telephone      -> le telephone
 *   B standard sans telephone      -> rien (l'adresse n'est pas reprise pour un client standard)
 *   C assurance avec telephone     -> le telephone
 *   D assurance sans telephone     -> l'adresse
 * Par le vrai chemin : menu Ordonnancier, recherche du nom d'essai dans le champ commun, Entree, onglet Analyse,
 * palmares « Clients » lu tel qu'affiche ; puis l'export Excel de l'analyse (meme bouton que l'ecran) porte le numero.
 * Tout est retire a la fin : ventes, clients, medecin, drapeau du produit.
 * Lancement seul : node src/test/e2e/retours/test-ordonnancier-numero-client.js
 */
const { chromium } = require('playwright-core');
const C = require('../ordonnancier/commun');
const { q, ok } = C;

const MARQUE = 'E2ENUMCLI';
const NOM = 'ZZNUMCLI';
const MEDECIN = MARQUE + '-MED';
const CLIENTS = [
  { id: MARQUE + '-A', prenom: NOM + ' ALPHA', type: '6', tel: '0700000101', adresse: 'RUE ESSAI ALPHA', attendu: '0700000101' },
  { id: MARQUE + '-B', prenom: NOM + ' BRAVO', type: '6', tel: '', adresse: 'RUE ESSAI BRAVO', attendu: '' },
  { id: MARQUE + '-C', prenom: NOM + ' CHARLIE', type: '1', tel: '0700000303', adresse: 'RUE ESSAI CHARLIE', attendu: '0700000303' },
  { id: MARQUE + '-D', prenom: NOM + ' DELTA', type: '1', tel: '', adresse: 'RUE ESSAI DELTA', attendu: 'RUE ESSAI DELTA' }
];
const article = C.articleSimple();

function purger() {
  q("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%';"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%';"
    + " DELETE FROM t_client WHERE lg_CLIENT_ID LIKE '" + MARQUE + "%';"
    + " DELETE FROM medecin WHERE id = '" + MEDECIN + "'");
}

function semer() {
  purger();
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + C.ENV_E2E.LOGIN + "'");
  q("UPDATE t_famille SET is_sensible = 1 WHERE lg_FAMILLE_ID = '" + article.id + "'");
  q("INSERT INTO medecin (id, num_ordre, nom, commentaire, created_at) VALUES ('" + MEDECIN + "', 'E2E-9105', 'DOCTEUR ESSAI NUMERO', 'recette e2e', NOW())");
  CLIENTS.forEach((c, i) => {
    q("INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_TELEPHONE, str_ADRESSE,"
      + " dt_CREATED, dt_UPDATED, str_STATUT) VALUES ('" + c.id + "', '" + c.id + "', '" + c.prenom + "', 'E2E', '" + c.type + "', "
      + (c.tel ? "'" + c.tel + "'" : 'NULL') + ", '" + c.adresse + "', NOW(), NOW(), 'enable')");
    const v = MARQUE + '-V' + i;
    q("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE, int_PRICE_REMISE, str_STATUT, dt_CREATED,"
      + " dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID, lg_USER_CAISSIER_ID, lg_USER_ID, lg_CLIENT_ID, medecin_id, b_IS_CANCEL, b_IS_AVOIR,"
      + " b_WITHOUT_BON, int_PRICE_OTHER, int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
      + " montantnetug, int_SENDTOSUGGESTION) VALUES ('" + v + "', '" + v + "', '0', 1000, 0, 'is_Closed', NOW(), NOW(), " + (c.type === '1' ? 2 : 1) + ","
      + " '" + user + "', '" + user + "', '" + user + "', '" + c.id + "', '" + MEDECIN + "', 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0)");
    q("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY,"
      + " int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE, int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE,"
      + " b_IS_AVOIR, int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT, montantTva, valeurTva, prixAchat,"
      + " montanttvaug, int_AVOIR_INITIAL) VALUES ('" + v + "-D', '" + v + "', '" + article.id + "', " + (i + 1) + ", 0, 0, 0, 1000, 1000, 0,"
      + " NOW(), NOW(), 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0)");
  });
}

(async () => {
  ok('Jeu d\'essai : un article simple', !!article.id, article.cip);
  const paramAvant = C.parametreOrdonnancier('1');
  semer();
  const b = await C.ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await C.vues.connexion(p, C.ENV_E2E.LOGIN, 'e2etest');
    await C.ouvrirOnglet(p, 'Registre', 'grilleRegistre');
    /* recherche commune : le nom d'essai, Entree */
    const champ = await p.evaluate(() => Ext.ComponentQuery.query('ordonnancier #query')[0].inputEl.dom.id);
    await p.locator('#' + champ).click();
    await p.keyboard.type(NOM, { delay: 20 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1500);
    const analyse = p.waitForResponse((r) => /ventesordonnanciers\/analyse\?/.test(r.url()), { timeout: 60000 });
    await C.ouvrirOnglet(p, 'Analyse', 'ongletAnalyse');
    await analyse;
    await p.waitForTimeout(800);

    const grille = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('ordonnancier #grilleTopClients')[0];
      const cols = g.headerCt.getGridColumns().filter((c) => c.isVisible());
      const v = g.getView();
      return { entetes: cols.map((c) => { const t = document.createElement('textarea'); t.innerHTML = (c.text || '').replace(/<[^>]+>/g, ''); return t.value; }),
        lignes: g.getStore().getRange().map((r) => cols.map((c) => { const n = v.getCell(r, c); return n ? n.dom.innerText.trim() : ''; })) };
    });
    const iNum = grille.entetes.findIndex((t) => /t[ée]l[ée]phone/i.test(t));
    ok('Palmarès Clients : une colonne « Téléphone / adresse » à côté du nom', iNum === 1, grille.entetes.join(' | '));
    ok('Les quatre clients d\'essai, et eux seuls', grille.lignes.length === 4, JSON.stringify(grille.lignes));
    CLIENTS.forEach((c) => {
      const l = grille.lignes.find((x) => x[0].toUpperCase().startsWith(c.prenom));
      const lu = l && iNum >= 0 ? l[iNum] : '(ligne ou colonne absente)';
      const genre = (c.type === '1' ? 'assurance' : 'standard') + (c.tel ? ' avec téléphone' : ' sans téléphone');
      ok('Client ' + genre + ' : « ' + (c.attendu || 'rien') + ' »', lu === c.attendu, lu);
    });

    /* l'export Excel de l'analyse : le bouton de l'ecran */
    const tel = p.waitForEvent('download', { timeout: 60000 }).catch(() => null);
    const page2 = ctx.waitForEvent('page', { timeout: 60000 }).catch(() => null);
    await C.vues.cliquer(p, 'ordonnancier #analyseExporter');
    const dl = await Promise.race([tel, page2.then(async (np) => np ? np.waitForEvent('download', { timeout: 60000 }).catch(() => null) : null)]);
    let contenu = '';
    if (dl) {
      const chemin = await dl.path();
      /* classeur .xls : les textes ASCII y sont stockes en clair sur un octet */
      const brut = require('fs').readFileSync(chemin);
      contenu = brut.toString('latin1') + ' ' + brut.toString('utf16le');
    }
    ok('Export Excel de l\'analyse : le téléphone et l\'adresse y figurent', /0700000101/.test(contenu) && /RUE ESSAI DELTA/.test(contenu) && !/RUE ESSAI BRAVO/.test(contenu),
      dl ? contenu.length + ' caractères' : 'aucun téléchargement');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    purger();
    C.remettreArticle(article);
    C.remettreParametre(paramAvant);
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE '" + MARQUE + "%'") === '0'
      && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%'") === '0');
    process.exit(C.bilan() ? 1 : 0);
  }
})();
