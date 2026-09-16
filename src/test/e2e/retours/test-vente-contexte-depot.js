/* Evolution 5, point 1 (deuxieme partie, fondations) : vendre le stock d'un depot d'extension.
 *
 * Jusqu'ici une vente n'avait pas d'emplacement propre : tout le code deduisait le lieu de la vente de
 * l'emplacement de son utilisateur. La vente porte desormais un emplacement explicite, NULLABLE, et un seul
 * point de decision (ContexteVenteDepot) le rend a tous les sites d'ecriture.
 *
 * Ce que le test etablit :
 *  - NON-REGRESSION : une vente d'officine reste identique a ce qu'elle etait. La colonne reste NULL, le stock
 *    de l'officine baisse, celui du depot ne bouge pas, et le mouvement de caisse est celui de l'operateur.
 *  - une vente posee sur un depot d'extension destocke le DEPOT et pas l'officine, historise le mouvement
 *    produit sur le depot, et laisse l'argent dans la caisse de l'operateur connecte - la decision de
 *    l'officine : « la vente cree un mouvement dans la caisse ouverte de l'operateur connecte ».
 *  - un depot inconnu, ou l'officine elle-meme, est ignore : on retombe sur le comportement d'avant plutot que
 *    de jouer la vente sur un emplacement arbitraire.
 *  - l'annulation d'une vente de depot rend le stock au depot, pas a l'officine.
 *  - l'ecran de vente, qui sert tous les jours, s'ouvre toujours sans erreur.
 *
 * Les routes appelees sont exactement celles de l'ecran de vente (VenteCtr), depuis la session du navigateur.
 * L'ecran de choix du depot arrive dans la tranche suivante ; il aura son propre parcours a la souris.
 * Tout ce que le test pose est retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const DEPOT = 'E2E-VD-DEPOT';
const MARQUE = 'E2E-VD-STOCK';
const CAISSE = 'E2E-VD-CAISSE';
const STOCK_DEPOT = 50;
const STOCK_OFFICINE = 60;
const QTE = 3;

const ventes = [];
// Stock d'origine de l'officine pour le produit du test : le test le force, il le remet a la fin.
let officineOrigine = null;
let produitDuTest = null;

function nettoyer() {
  const liste = ventes.length ? "('" + ventes.join("','") + "')" : "('-')";
  // Les clones d'annulation sont des ventes filles : on les ramasse avec leurs parentes.
  try {
    const filles = q("SELECT GROUP_CONCAT(lg_PREENREGISTREMENT_ID) FROM t_preenregistrement"
      + " WHERE lg_PARENT_ID IN " + liste + " OR lg_PREENGISTREMENT_ANNULE_ID IN " + liste);
    filles.split(',').filter((x) => x && ventes.indexOf(x) < 0).forEach((x) => ventes.push(x));
  } catch (e) { /* rien a ramasser */ }
  // L'historique des mouvements produit pointe les LIGNES de vente : on le retire par les lignes, pas
  // seulement par la vente, sinon la contrainte de cle etrangere bloque la suppression des lignes.
  exec("CREATE TEMPORARY TABLE e2e_vd_lignes AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id"
    + " FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
    + "DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN (SELECT id FROM e2e_vd_lignes);"
    + "DELETE FROM hmvtproduit WHERE pkey IN " + liste + ";"
    + "DELETE FROM hmvtproduit WHERE lg_EMPLACEMENT_ID='" + DEPOT + "';"
    + "DELETE FROM mvttransaction WHERE pkey IN " + liste + ";"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN " + liste + ";"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
    + "CREATE TEMPORARY TABLE e2e_vd_regl AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement"
    + " WHERE lg_PREENREGISTREMENT_ID IN " + liste + " AND lg_REGLEMENT_ID IS NOT NULL;"
    // La vente pointe son reglement : on denoue le lien avant de supprimer l'un ou l'autre.
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID=NULL, lg_PARENT_ID=NULL,"
    + " lg_REGLEMENT_ID=NULL WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_vd_regl);"
    + "DELETE FROM t_reglement WHERE str_REF_RESSOURCE IN " + liste + ";"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_vd_regl;"
    + "DELETE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID LIKE '" + MARQUE + "%';"
    + "DELETE FROM reference WHERE emplacement_id='" + DEPOT + "';"
    + "DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID='" + DEPOT + "';"
    + "DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID='" + CAISSE + "';"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_vd_lignes;");
  if (produitDuTest && officineOrigine !== null) {
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=" + officineOrigine + ", int_NUMBER=" + officineOrigine
      + " WHERE lg_FAMILLE_ID='" + produitDuTest + "' AND lg_EMPLACEMENT_ID='1';");
  }
}

/* Preconditions (pas l'objet du test) : un depot d'extension tenant du stock du meme produit que l'officine,
   et une caisse ouverte pour l'operateur - la cloture l'exige deja aujourd'hui. */
function poser() {
  nettoyer();
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='admin'");
  const compte = q("SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1");
  exec("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_LOCALITE,"
    + " str_FIRST_NAME, str_LAST_NAME, str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT, lg_TYPEDEPOT_ID,"
    + " bool_SAME_LOCATION)"
    + " VALUES ('" + DEPOT + "', '" + compte + "', 'DEPOT E2E VENTE', 'E2E', 'ABOBO', 'KOFFI', 'Jean',"
    + " '0708473750', NOW(), NOW(), 'enable', '2', 0);");
  // Un produit simple (non deconditionnable, comptabilise) tenu par l'officine ET par le depot.
  const a = q("SELECT CONCAT(f.lg_FAMILLE_ID,':',f.int_PRICE) FROM t_famille f JOIN t_famille_stock s"
    + " ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE f.str_STATUT='enable' AND f.int_PRICE>0 AND COALESCE(f.bool_DECONDITIONNE,0)=0"
    + " AND COALESCE(f.lg_FAMILLE_PARENT_ID,'')='' ORDER BY f.str_NAME LIMIT 1").split(':');
  const produit = { id: a[0], pu: parseInt(a[1], 10) };
  produitDuTest = produit.id;
  officineOrigine = Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID='"
    + produit.id + "' AND lg_EMPLACEMENT_ID='1'"));
  exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=" + STOCK_OFFICINE + ", int_NUMBER=" + STOCK_OFFICINE
    + " WHERE lg_FAMILLE_ID='" + produit.id + "' AND lg_EMPLACEMENT_ID='1';");
  exec("INSERT INTO t_famille_stock (lg_FAMILLE_STOCK_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_AVAILABLE,"
    + " dt_CREATED, dt_UPDATED, lg_EMPLACEMENT_ID, str_STATUT, int_UG, VERSION)"
    + " VALUES ('" + MARQUE + "-1', '" + produit.id + "', " + STOCK_DEPOT + ", " + STOCK_DEPOT + ", NOW(), NOW(), '"
    + DEPOT + "', 'enable', 0, 0);");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID='" + user + "' AND str_STATUT='is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED,"
      + " lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT) VALUES ('" + CAISSE + "', '" + user + "', 0, 0,"
      + " CURDATE(), NOW(), '" + user + "', NOW(), '" + user + "', 'is_Using');");
  }
  return { user: user, produit: produit };
}

const stock = (emplacement, produitId) => Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock"
  + " WHERE lg_FAMILLE_ID='" + produitId + "' AND lg_EMPLACEMENT_ID='" + emplacement + "'"));
// hmvtproduit est indexe par la LIGNE de vente (pkey = lg_PREENREGISTREMENT_DETAIL_ID).
const emplacementsHistorises = (venteId) => q("SELECT GROUP_CONCAT(DISTINCT h.lg_EMPLACEMENT_ID) FROM hmvtproduit h"
  + " JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID = h.pkey"
  + " WHERE d.lg_PREENREGISTREMENT_ID='" + venteId + "'");
const champVente = (id, colonne) => q("SELECT COALESCE(" + colonne + ", 'NULL') FROM t_preenregistrement"
  + " WHERE lg_PREENREGISTREMENT_ID='" + id + "'");

(async () => {
  const ctx0 = poser();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    const poster = (url, corps) => p.evaluate(async (a) => {
      const r = await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a.corps) });
      return { statut: r.status, corps: await r.text() };
    }, { url: url, corps: corps });
    const lire = (r) => { try { return JSON.parse(r.corps); } catch (e) { return { success: false, msg: String(r.corps).slice(0, 200) }; } };

    // Creation d'une vente comptant, exactement comme l'ecran de vente le fait. depotVenteId est le seul
    // parametre nouveau : absent, tout se passe comme avant.
    const creer = async (depotVenteId) => {
      const corps = {
        typeVenteId: '1', natureVenteId: '1', produitId: ctx0.produit.id, itemPu: ctx0.produit.pu,
        qte: QTE, qteServie: QTE, devis: false, prevente: false, remiseId: '', userVendeurId: ctx0.user
      };
      if (depotVenteId !== undefined) { corps.depotVenteId = depotVenteId; }
      const r = lire(await poster('../api/v1/vente/add/vno', corps));
      const id = r.success && r.data ? r.data.lgPREENREGISTREMENTID : null;
      if (id) { ventes.push(id); }
      return { r: r, id: id };
    };
    const cloturer = (id) => poster('../api/v1/vente/cloturer/vno', {
      venteId: id, typeVenteId: '1', typeRegleId: '1', montantRecu: 9999999, montantRendu: 0,
      montantPaye: 9999999, montantVerse: 9999999
    }).then(lire);

    ok('precondition : le produit est tenu par l officine et par le depot',
      stock('1', ctx0.produit.id) === STOCK_OFFICINE && stock(DEPOT, ctx0.produit.id) === STOCK_DEPOT,
      stock('1', ctx0.produit.id) + ' / ' + stock(DEPOT, ctx0.produit.id));

    /* ------------------------------------------------ NON-REGRESSION : la vente d officine est inchangee */
    let avantOff = stock('1', ctx0.produit.id);
    let avantDep = stock(DEPOT, ctx0.produit.id);
    const officine = await creer(undefined);
    ok('la vente d officine se cree comme avant', !!officine.id, JSON.stringify(officine.r).slice(0, 220));
    ok('sans depot, la vente ne porte aucun emplacement de vente',
      officine.id && champVente(officine.id, 'lg_EMPLACEMENT_VENTE_ID') === 'NULL',
      officine.id && champVente(officine.id, 'lg_EMPLACEMENT_VENTE_ID'));
    let rc = await cloturer(officine.id);
    ok('la vente d officine se valide', rc.success === true, JSON.stringify(rc).slice(0, 220));
    ok('la vente d officine destocke bien l officine', stock('1', ctx0.produit.id) === avantOff - QTE,
      avantOff + ' -> ' + stock('1', ctx0.produit.id));
    ok('la vente d officine ne touche pas le stock du depot', stock(DEPOT, ctx0.produit.id) === avantDep,
      avantDep + ' -> ' + stock(DEPOT, ctx0.produit.id));
    ok('le mouvement de caisse de la vente d officine reste sur l officine et sur l operateur',
      q("SELECT CONCAT(lg_EMPLACEMENT_ID,'|',caisse) FROM mvttransaction WHERE pkey='" + officine.id + "'")
      === '1|' + ctx0.user,
      q("SELECT CONCAT(lg_EMPLACEMENT_ID,'|',caisse) FROM mvttransaction WHERE pkey='" + officine.id + "'"));
    ok('le mouvement produit de la vente d officine est historise sur l officine',
      emplacementsHistorises(officine.id) === '1', emplacementsHistorises(officine.id));

    /* --------------------------------------------------------------- la vente posee sur le depot */
    avantOff = stock('1', ctx0.produit.id);
    avantDep = stock(DEPOT, ctx0.produit.id);
    const vd = await creer(DEPOT);
    ok('la vente en contexte depot se cree', !!vd.id, JSON.stringify(vd.r).slice(0, 220));
    ok('la vente porte le depot comme emplacement de vente',
      vd.id && champVente(vd.id, 'lg_EMPLACEMENT_VENTE_ID') === DEPOT,
      vd.id && champVente(vd.id, 'lg_EMPLACEMENT_VENTE_ID'));
    rc = await cloturer(vd.id);
    ok('la vente en contexte depot se valide', rc.success === true, JSON.stringify(rc).slice(0, 220));
    ok('elle destocke le depot', stock(DEPOT, ctx0.produit.id) === avantDep - QTE,
      avantDep + ' -> ' + stock(DEPOT, ctx0.produit.id));
    ok('elle ne touche pas le stock de l officine', stock('1', ctx0.produit.id) === avantOff,
      avantOff + ' -> ' + stock('1', ctx0.produit.id));
    ok('le mouvement produit est historise sur le depot',
      emplacementsHistorises(vd.id) === DEPOT, emplacementsHistorises(vd.id));
    ok('l argent reste dans la caisse de l operateur connecte (decision de l officine)',
      q("SELECT CONCAT(lg_EMPLACEMENT_ID,'|',caisse) FROM mvttransaction WHERE pkey='" + vd.id + "'")
      === '1|' + ctx0.user,
      q("SELECT CONCAT(lg_EMPLACEMENT_ID,'|',caisse) FROM mvttransaction WHERE pkey='" + vd.id + "'"));
    ok('le montant encaisse est bien celui de la vente',
      Number(q("SELECT montantNet FROM mvttransaction WHERE pkey='" + vd.id + "'")) === QTE * ctx0.produit.pu,
      q("SELECT montantNet FROM mvttransaction WHERE pkey='" + vd.id + "'") + ' attendu ' + QTE * ctx0.produit.pu);
    ok('la reference de la vente est numerotee sur le depot, pas sur l officine',
      Number(q("SELECT COUNT(*) FROM reference WHERE emplacement_id='" + DEPOT + "'")) > 0);

    /* ------------------------------------------------- un depot invalide ramene au comportement d avant */
    const inconnu = await creer('CE-DEPOT-N-EXISTE-PAS');
    ok('un depot inconnu est ignore : la vente reste une vente d officine',
      inconnu.id && champVente(inconnu.id, 'lg_EMPLACEMENT_VENTE_ID') === 'NULL',
      inconnu.id && champVente(inconnu.id, 'lg_EMPLACEMENT_VENTE_ID'));
    const officineCommeDepot = await creer('1');
    ok('l officine passee comme depot est ignoree (elle n est pas un depot d extension)',
      officineCommeDepot.id && champVente(officineCommeDepot.id, 'lg_EMPLACEMENT_VENTE_ID') === 'NULL',
      officineCommeDepot.id && champVente(officineCommeDepot.id, 'lg_EMPLACEMENT_VENTE_ID'));
    const vide = await creer('');
    ok('un depot vide est ignore',
      vide.id && champVente(vide.id, 'lg_EMPLACEMENT_VENTE_ID') === 'NULL',
      vide.id && champVente(vide.id, 'lg_EMPLACEMENT_VENTE_ID'));

    /* ----------------------------------------------- l annulation rend le stock la ou la vente l avait pris */
    avantOff = stock('1', ctx0.produit.id);
    avantDep = stock(DEPOT, ctx0.produit.id);
    const ra = lire(await p.evaluate(async (u) => {
      const r = await fetch(u); return { statut: r.status, corps: await r.text() };
    }, '../api/v1/vente/annulation/' + vd.id));
    const annulee = ra.success === true;
    if (annulee && ra.ref) { ventes.push(ra.ref); }
    ok('l annulation de la vente de depot aboutit', annulee, JSON.stringify(ra).slice(0, 250));
    if (annulee) {
      ok('l annulation rend le stock au depot', stock(DEPOT, ctx0.produit.id) === avantDep + QTE,
        avantDep + ' -> ' + stock(DEPOT, ctx0.produit.id));
      ok('l annulation ne gonfle pas le stock de l officine', stock('1', ctx0.produit.id) === avantOff,
        avantOff + ' -> ' + stock('1', ctx0.produit.id));
    }

    /* ------------------------------------------------------- l ecran de vente s ouvre toujours sans erreur */
    const ouvert = await p.evaluate(() => {
      try { testextjs.app.getController('App').onRedirectTo('doventemanager', {}); return 'ok'; }
      catch (e) { return 'ERREUR ' + e.message; }
    });
    ok('l ecran de vente s ouvre', ouvert === 'ok', ouvert);
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(1200);
    ok('l ecran de vente est rendu', await p.evaluate(() => Ext.ComponentQuery.query('doventemanager').length > 0));
    ok('aucune erreur de page pendant le parcours', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    console.log('\n' + res.filter(r => r.c).length + '/' + res.length + ' verifications');
    try { nettoyer(); } catch (e) { console.log('NETTOYAGE INCOMPLET : ' + String(e.message).slice(0, 400)); }
    process.exit(res.every(r => r.c) ? 0 : 1);
  }
})();
