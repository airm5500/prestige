/* NUMEROTATION DES VENTES : une proforma ou une vente sur un depot d'extension remettait a 1 le compteur des ventes
 * du jour (analyse du 02/11 : 3 076 numeros en double depuis le 01/09 sur la copie de travail).
 *
 * Le compteur du jour (table Reference) avait la date seule pour cle : la proforma, qui cherche son propre compteur, et
 * la vente sur un depot, qui cherche celui du depot, ne le trouvaient pas, en creaient un neuf a la meme date, et ce
 * compteur neuf ECRASAIT celui des ventes de l'officine. La vente suivante repartait a _00001.
 *
 * Parcours a l'ecran, a la souris et au clavier (compte admin) :
 *  1. SERVICE CLIENT > Ventes : une vente au comptant, « Terminer la vente » ;
 *  2. Proforma : client, article, quantite, Entree (la proforma prend son numero a sa creation) ;
 *  3. une deuxieme vente : elle doit suivre la premiere ;
 *  4. Vente en depot : depot choisi dans la liste, une vente terminee ;
 *  5. une troisieme vente d'officine : elle doit suivre la vente du depot.
 * Les ventes de l'officine et du depot partagent la meme suite de numeros : la recette du depot tombe dans la caisse
 * de l'operateur, deux tickets du meme jour ne doivent pas porter le meme numero. La proforma garde sa propre suite.
 *
 * Tout ce que le test pose est retire : ventes, proforma, client, depot, caisse d'essai, stocks remis. Le compteur de
 * l'officine n'est jamais redescendu : il est au moins au plus grand numero deja donne ce jour.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();

const DEPOT = 'E2E-NUM-DEPOT';
const NOM_DEPOT = 'DEPOT E2E NUMEROTATION';
const MARQUE = 'E2E-NUM-STOCK';
const CAISSE = 'E2E-NUM-CAISSE';
const CLIENT = 'E2E-NUM-CLI';
const NOM_CLIENT = 'ZZNUMEROTATION';
const d = new Date();
const JOUR = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
const PREFIXE = JOUR.slice(2) + '_';
const CHAMP = (ecran) => ecran + ' #contenu [xtype=fieldcontainer] #produit';

/* un article simple, CIP unique, stock large ; ses stocks d'origine sont remis a la fin */
const [PRODUIT, CIP, STOCK, STOCK_TOTAL] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f JOIN t_famille_stock s"
  + " ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable'"
  + " AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.int_PRICE BETWEEN 300 AND 3000 AND s.int_NUMBER_AVAILABLE > 20 AND f.bool_DECONDITIONNE = 0"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_famille e WHERE e.lg_FAMILLE_PARENT_ID = f.lg_FAMILLE_ID) ORDER BY f.int_CIP LIMIT 1").split('\t');
const ventes = [];
let devisAvant = null;

function retirerVentes() {
  if (!ventes.length) { return; }
  const liste = "('" + ventes.join("','") + "')";
  const filles = q("SELECT IFNULL(GROUP_CONCAT(lg_PREENREGISTREMENT_ID), '') FROM t_preenregistrement WHERE lg_PARENT_ID IN " + liste
    + " OR lg_PREENGISTREMENT_ANNULE_ID IN " + liste);
  filles.split(',').filter((x) => x && ventes.indexOf(x) < 0).forEach((x) => ventes.push(x));
  const tout = "('" + ventes.join("','") + "')";
  q("CREATE TEMPORARY TABLE e2e_num_lignes AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " CREATE TEMPORARY TABLE e2e_num_regl AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN " + tout + " AND lg_REGLEMENT_ID IS NOT NULL;"
    + " DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN (SELECT id FROM e2e_num_lignes);"
    + " DELETE FROM hmvtproduit WHERE pkey IN " + tout + " OR pkey IN (SELECT id FROM e2e_num_lignes);"
    + " DELETE FROM vente_reglement WHERE vente_id IN " + tout + ";"
    + " DELETE FROM annulation_recette WHERE preenregistrement_id IN " + tout + ";"
    + " DELETE FROM vente_exclu WHERE preenregistrement_id IN " + tout + ";"
    + " DELETE FROM mvttransaction WHERE pkey IN " + tout + " OR vente_id IN " + tout + ";"
    + " DELETE FROM t_cash_transaction WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_num_regl);"
    + " DELETE FROM t_recettes WHERE str_REF_FACTURE IN " + tout + ";"
    + " DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_num_regl) OR str_REF_RESSOURCE IN " + tout + ";"
    + " DROP TEMPORARY TABLE e2e_num_lignes; DROP TEMPORARY TABLE e2e_num_regl");
}

/* le compteur de l'officine ne redescend jamais : au moins le plus grand numero de vente deja donne ce jour */
function reparerCompteur() {
  const max = q("SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(str_REF, '_', -1) AS SIGNED)), 0) FROM t_preenregistrement WHERE str_REF LIKE '" + PREFIXE + "%'"
    + " AND str_STATUT = 'is_Closed'");
  q("DELETE FROM reference WHERE id = '" + JOUR + "' AND emplacement_id = '" + DEPOT + "'"
    + (devisAvant === '0' ? "; DELETE FROM reference WHERE id = '" + JOUR + "' AND devis = 1" : ''));
  if (q("SELECT COUNT(*) FROM reference WHERE id = '" + JOUR + "' AND emplacement_id = '1' AND devis = 0") === '0') {
    /* ancien code : la ligne du jour a pu etre ecrasee par celle du depot, puis retiree ci-dessus */
    q("DELETE FROM reference WHERE id = '" + JOUR + "' AND emplacement_id = '1'; INSERT INTO reference (id, emplacement_id, devis, reference, reference_temp,"
      + " last_int_value, last_int_tmp_value) VALUES ('" + JOUR + "', '1', 0, '" + PREFIXE + "', '" + PREFIXE + "', " + max + ", 0)");
  }
  q("UPDATE reference SET last_int_value = GREATEST(last_int_value, " + max + ") WHERE id = '" + JOUR + "' AND emplacement_id = '1' AND devis = 0");
}

function nettoyer() {
  reparerCompteur();
  try { retirerVentes(); } catch (e) { console.log('Retrait des ventes incomplet : ' + String(e.message).split('\n').pop()); }
  q("DELETE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID LIKE '" + MARQUE + "%';"
    + " DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "';"
    + " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "';"
    + " DELETE FROM t_compte_client WHERE lg_CLIENT_ID = '" + CLIENT + "';"
    + " DELETE FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "';"
    + " UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + STOCK + ", int_NUMBER = " + STOCK_TOTAL
    + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'");
}

/* preconditions : un depot d'extension qui tient l'article, un client standard pour la proforma, une caisse ouverte */
function poser() {
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
  const compte = q("SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1");
  devisAvant = q("SELECT COUNT(*) FROM reference WHERE id = '" + JOUR + "' AND devis = 1");
  q("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_LOCALITE, str_FIRST_NAME, str_LAST_NAME,"
    + " str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT, lg_TYPEDEPOT_ID, bool_SAME_LOCATION) VALUES ('" + DEPOT + "', '" + compte + "', '" + NOM_DEPOT + "',"
    + " 'E2E', 'E2E', 'E2E', 'E2E', '0000000000', NOW(), NOW(), 'enable', '2', 0);"
    + " INSERT INTO t_famille_stock (lg_FAMILLE_STOCK_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_AVAILABLE, dt_CREATED, dt_UPDATED, lg_EMPLACEMENT_ID,"
    + " str_STATUT, int_UG, VERSION) VALUES ('" + MARQUE + "-1', '" + PRODUIT + "', 50, 50, NOW(), NOW(), '" + DEPOT + "', 'enable', 0, 0);"
    + " INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + CLIENT + "', '" + CLIENT + "', '" + NOM_CLIENT + "', 'E2E', '6', NOW(), NOW(), 'enable');"
    + " INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, str_CODE_COMPTE_CLIENT, str_TYPE, P_KEY, dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION, dec_Balance,"
    + " dt_CREATED, dt_UPDATED, str_STATUT, lg_CLIENT_ID, dbl_PLAFOND) VALUES ('" + CLIENT + "', '" + CLIENT + "', 'CLIENT', '" + CLIENT + "', 0, 0, 0,"
    + " NOW(), NOW(), 'enable', '" + CLIENT + "', 0)");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + user + "' AND str_STATUT = 'is_Using'") === '0') {
    q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED,"
      + " lg_UPDATED_BY, str_STATUT) VALUES ('" + CAISSE + "', '" + user + "', 0, 0, CURDATE(), NOW(), '" + user + "', NOW(), '" + user + "', 'is_Using')");
  }
}

const numero = (ref) => (ref && ref.indexOf(PREFIXE) === 0 ? Number(ref.slice(PREFIXE.length)) : NaN);
const refDe = (id) => (id ? q("SELECT IFNULL(str_REF, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'") : '');

/* menu du volet, retrouve par l'ecran qu'il ouvre : parent puis entree, par leurs libelles affiches */
async function ouvrirEcran(p, composant) {
  const lib = await p.evaluate((c) => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode()
    .cascadeBy((n) => { if (!r && n.get('id') === c && n.parentNode) { r = [n.parentNode.get('text'), n.get('text')]; } }); return r; }, composant);
  if (!lib) { throw new Error('Menu absent pour ' + composant); }
  await vues.ouvrirMenu(p, lib[0], lib[1]);
  /* le volet du menu reste deplie par-dessus l'ecran : on le referme comme l'utilisateur, en cliquant a cote */
  await p.waitForTimeout(800);
  if (await p.locator('.prestige-nav .x-grid-row').filter({ visible: true }).count() > 0) {
    await p.mouse.click(1000, 33);
    await p.locator('.prestige-nav .x-grid-row').filter({ visible: true }).first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}

const visible = (p, requete) => p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), requete, { timeout: 60000 });

/* article tape par son CIP, Entree : l'ecran de vente l'ajoute directement */
async function taperArticle(p, ecran) {
  await vues.cliquer(p, CHAMP(ecran));
  await p.keyboard.press('Control+A');
  await p.keyboard.type(CIP, { delay: 15 });
  const rep = p.waitForResponse((r) => /\/vente\/add\/(vno|item)/.test(r.url()), { timeout: 60000 });
  await p.keyboard.press('Enter');
  const r = await rep;
  await p.waitForTimeout(800);
  return r.json().catch(() => ({}));
}

/* montant recu = net a payer, puis « Terminer la vente » ; renvoie l'id de la vente terminee */
async function terminer(p, ecran, controleur) {
  const venteId = await p.evaluate((c) => { const v = testextjs.app.getController(c).current; return v ? v.lgPREENREGISTREMENTID : null; }, controleur);
  if (venteId) { ventes.push(venteId); }
  const net = await p.evaluate((c) => { const x = testextjs.app.getController(c).getNetAmountToPay(); return x ? x.montantNet : 0; }, controleur);
  await vues.cliquer(p, ecran + ' #contenu #montantRecu');
  await p.waitForTimeout(300);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(String(net), { delay: 15 });
  await p.waitForTimeout(300);
  const rep = p.waitForResponse((r) => /\/vente\/cloturer\/vno/.test(r.url()), { timeout: 120000 });
  await vues.cliquer(p, ecran + ' #contenu [xtype=toolbar] #btnCloture');
  const r = await rep;
  const corps = await r.json().catch(() => ({}));
  await p.waitForTimeout(800);
  const ecranTexte = await vues.texteMessage(p).catch(() => '');
  if (/imprimer le ticket/i.test(ecranTexte)) { await vues.repondre(p, 'no'); }
  else if (ecranTexte) { await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close())).catch(() => {}); }
  await p.waitForTimeout(600);
  return { id: venteId, ok: r.status() < 400 && corps.success !== false, msg: corps.msg || ecranTexte };
}

async function venteOfficine(p, premiere) {
  if (premiere) {
    await ouvrirEcran(p, 'cloturerventemanager');
    await visible(p, 'cloturerventemanager #addBtn');
    await vues.cliquer(p, 'cloturerventemanager #addBtn');
    await visible(p, CHAMP('doventemanager'));
    await p.waitForTimeout(1500);
  }
  await taperArticle(p, 'doventemanager');
  return terminer(p, 'doventemanager', 'VenteCtr');
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    ok('Jeu d\'essai : un article simple en stock', !!CIP, CIP);
    poser();
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* 1. premiere vente d'officine */
    const v1 = await venteOfficine(p, true);
    const n1 = numero(refDe(v1.id));
    ok('1re vente terminée, numérotée du jour', v1.ok && n1 > 0, refDe(v1.id) + ' ' + (v1.msg || ''));

    /* 2. proforma : client, article, quantite, Entree */
    await ouvrirEcran(p, 'devismanager');
    await visible(p, 'devismanager #addBtn');
    await vues.cliquer(p, 'devismanager #addBtn');
    await visible(p, 'doDevis #clientSearchTextField');
    await p.waitForTimeout(1500);
    await vues.cliquer(p, 'doDevis #clientSearchTextField');
    await p.keyboard.type(NOM_CLIENT, { delay: 15 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    if (await p.evaluate(() => Ext.ComponentQuery.query('clientDevis').some((w) => w.isVisible()))) {
      /* fenetre de choix : clic sur le « + » de la ligne du client */
      const icone = p.locator('.x-window:visible .x-grid-row').filter({ hasText: 'ZZNUMEROTATION' }).first().locator('.x-action-col-icon').first();
      await icone.click();
      await p.waitForTimeout(1500);
    }
    const client = await p.evaluate(() => { const c = testextjs.app.getController('DevisCtr').getClient(); return c ? String(c.get('strFIRSTNAME') || '') : ''; });
    ok('Proforma : le client est choisi', client === NOM_CLIENT, client);
    await vues.cliquer(p, CHAMP('doDevis'));
    await p.keyboard.type(CIP, { delay: 15 });
    await p.waitForTimeout(2500);
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const q = Ext.ComponentQuery.query('doDevis #qtyField')[0]; return q && document.activeElement === q.inputEl.dom; }, null, { timeout: 15000 });
    await p.keyboard.press('Control+A');
    await p.keyboard.type('1', { delay: 15 });
    const repDevis = p.waitForResponse((r) => /\/vente\/devis/.test(r.url()), { timeout: 60000 });
    await p.keyboard.press('Enter');
    await repDevis;
    await p.waitForTimeout(1500);
    const devisId = await p.evaluate(() => { const v = testextjs.app.getController('DevisCtr').getCurrent(); return v ? v.lgPREENREGISTREMENTID : null; });
    if (devisId) { ventes.push(devisId); }
    const refDevis = refDe(devisId);
    ok('Proforma créée, avec son numéro', !!devisId && numero(refDevis) > 0
      && q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + devisId + "'") === 'devis', refDevis);

    /* 3. deuxieme vente : elle suit la premiere */
    const v2 = await venteOfficine(p, true);
    const n2 = numero(refDe(v2.id));
    ok('Après la proforma, la vente suivante continue la suite (pas de retour à 1)', v2.ok && n2 === n1 + 1, 'avant ' + n1 + ', après ' + n2);

    /* 4. vente sur le depot d'extension */
    /* Gestion depots extensions : le depot se choisit en haut, l'onglet de saisie de vente le suit */
    await ouvrirEcran(p, 'depotextension');
    await visible(p, 'depotextension #depotEcran');
    await p.waitForTimeout(1500);
    const choisi = await vues.choisir(p, 'depotextension #depotEcran', NOM_DEPOT);
    await p.waitForFunction((d) => testextjs.app.getController('VenteEnDepotCtr').depotIdDeVente() === d, DEPOT, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(800);
    ok('Vente en dépôt : le dépôt est choisi dans la liste', choisi.indexOf(NOM_DEPOT) === 0
      && await p.evaluate(() => testextjs.app.getController('VenteEnDepotCtr').depotIdDeVente()) === DEPOT, choisi);
    await visible(p, CHAMP('doventeendepot'));
    await taperArticle(p, 'doventeendepot');
    const vd = await terminer(p, 'doventeendepot', 'VenteEnDepotCtr');
    const nd = numero(refDe(vd.id));
    ok('Vente en dépôt terminée, sur le dépôt', vd.ok && q("SELECT IFNULL(lg_EMPLACEMENT_VENTE_ID, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vd.id + "'") === DEPOT,
      refDe(vd.id) + ' ' + (vd.msg || ''));
    ok('La vente du dépôt prend le numéro suivant de la journée', nd === n2 + 1, 'avant ' + n2 + ', dépôt ' + nd);

    /* 5. troisieme vente d'officine : elle suit la vente du depot */
    const v3 = await venteOfficine(p, true);
    const n3 = numero(refDe(v3.id));
    ok('Après la vente en dépôt, la vente d\'officine continue la suite', v3.ok && n3 === nd + 1, 'dépôt ' + nd + ', après ' + n3);

    const nos = [v1, v2, vd, v3].map((v) => refDe(v.id));
    const autres = q("SELECT COUNT(*) FROM t_preenregistrement WHERE str_STATUT = 'is_Closed' AND str_REF IN ('" + nos.join("','") + "')"
      + " AND lg_PREENREGISTREMENT_ID NOT IN ('" + ventes.join("','") + "')");
    ok('Aucun de ces numéros n\'est déjà porté par une autre vente du jour', autres === '0' && new Set(nos).size === nos.length, nos.join(' ') + ' ; autres ' + autres);
    ok('Le compteur des ventes de l\'officine est resté sur l\'officine',
      q("SELECT CONCAT(COUNT(*), '|', IFNULL(MAX(last_int_value), 0)) FROM reference WHERE id = '" + JOUR + "' AND emplacement_id = '1' AND devis = 0") === '1|' + n3,
      q("SELECT GROUP_CONCAT(CONCAT(emplacement_id, '/', devis + 0, ':', last_int_value)) FROM reference WHERE id = '" + JOUR + "'"));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    await p.screenshot({ path: ENV_E2E.TMP + '/numerotation-echec.png' }).catch(() => {});
    ok('Parcours sans exception', false, (await vues.texteMessage(p).catch(() => '')) + ' ' + e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées, stock remis', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + (ventes.join("','") || '-') + "')") === '0'
      && q("SELECT COUNT(*) FROM t_emplacement WHERE lg_EMPLACEMENT_ID = '" + DEPOT + "'") === '0'
      && q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "'") === '0'
      && q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'") === STOCK);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
