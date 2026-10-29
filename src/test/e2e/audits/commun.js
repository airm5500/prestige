/* REPRODUCTION DES CONSTATS D'AUDIT : outils communs (docs/notices/CONFIRMATION_AUDITS_CODE_2026-10-25.md).
 *
 * Chaque scenario affirme le comportement ATTENDU. Une ligne « FAIL » signifie donc que le defaut est REPRODUIT ;
 * « PASS », qu'il ne l'est pas (au code deploye). Aucune conclusion n'est tiree sans la mesure affichee entre crochets.
 *
 * Le jeu d'essai est marque (clients et tiers payants « ZZAUDIT », ventes du compte de test posterieures au debut du
 * test) et retire a la fin, y compris en cas d'erreur. Base : copie de travail uniquement (voir outils/poste.js).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const BASE = ENV_E2E.BASE;
const MARQUE = 'ZZAUDIT';
const res = [];
const sql = (s, args) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ...(args || []), BASE, '-e', s],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const exec = (s) => sql(s);
const q = (s) => sql(s, ['-sN']).trim();
const liste = (v) => (v && v.length ? v.map((x) => "'" + x + "'").join(',') : "'-'");

/* ok(nom, condition, mesure) : la condition est le comportement attendu ; FAIL = defaut reproduit */
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : ''));
}
function bilan() {
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' — ' + ko + ' constat(s) reproduit(s) ou precondition(s) en echec' : ' OK'));
  return ko;
}

const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
/* AUDIT_DEBUT : reprendre le nettoyage d'un lancement interrompu (nettoyer.js) */
const DEBUT = process.env.AUDIT_DEBUT || q('SELECT NOW() - INTERVAL 1 SECOND');
const CAISSE = MARQUE + '-caisse';
/* ventes : identifiants notes par les scenarios (une vente antidatee echappe au filtre par date) ; AUDIT_VENTES en reprise */
const etat = { produits: [], caisseCreee: false, params: [], tiersPayants: [], restaurations: [],
  ventes: (process.env.AUDIT_VENTES || '').split(',').filter(Boolean) };

/* produit vendable de l'emplacement 1, stock force a `stock` et remis a la fin */
function produit(rang, stock, filtre) {
  const a = q("SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 500 AND 5000 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
    + " AND f.bool_ACCOUNT = 1 AND s.int_NUMBER_AVAILABLE >= 0 " + (filtre || '') + " ORDER BY f.str_NAME LIMIT 1 OFFSET " + (rang || 0)).split(':');
  const p = { id: a[0], pu: parseInt(a[1], 10) };
  p.origine = q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER, '|', int_UG) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + p.id + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
  p.nbVentes = q("SELECT IFNULL(int_NOMBRE_VENTES, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '" + p.id + "'");
  p.lots = q("SELECT COUNT(*) FROM t_lot WHERE lg_FAMILLE_ID = '" + p.id + "'");
  etat.produits.push(p);
  exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + stock + ", int_NUMBER = " + stock + " WHERE lg_FAMILLE_ID = '" + p.id + "' AND lg_EMPLACEMENT_ID = '1'");
  return p;
}
const stock = (p) => Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + p.id + "' AND lg_EMPLACEMENT_ID = '1'"));

/* parametre applicatif modifie le temps du test, remis a la fin */
function parametre(cle, valeur) {
  const avant = q("SELECT IFNULL(MAX(str_VALUE), '__ABSENT__') FROM t_parameters WHERE str_KEY = '" + cle + "'");
  etat.params.push([cle, avant]);
  if (avant === '__ABSENT__') {
    exec("INSERT INTO t_parameters (str_KEY, str_VALUE, str_STATUT) VALUES ('" + cle + "', '" + valeur + "', 'enable')");
  } else {
    exec("UPDATE t_parameters SET str_VALUE = '" + valeur + "' WHERE str_KEY = '" + cle + "'");
  }
}

/* tiers payant d'essai : copie d'un tiers payant existant du type voulu (1 assurance, 2 carnet), compteurs a zero */
function tiersPayant(suffixe, type, reglages) {
  const modele = q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE lg_TYPE_TIERS_PAYANT_ID = '" + type + "' AND str_STATUT = 'enable'"
    + " AND lg_TIERS_PAYANT_ID NOT LIKE '" + MARQUE + "%' ORDER BY lg_TIERS_PAYANT_ID LIMIT 1");
  const id = MARQUE + '-TP-' + suffixe;
  exec("CREATE TEMPORARY TABLE tmp_tp SELECT * FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '" + modele + "';"
    + " UPDATE tmp_tp SET lg_TIERS_PAYANT_ID = '" + id + "', str_CODE_ORGANISME = '" + id + "', str_NAME = '" + id + "', str_FULLNAME = '" + id + "',"
    + " db_CONSOMMATION_MENSUELLE = 0, dbl_PLAFOND_CREDIT = 0, dbl_PLAFOND_VENTE = 0, b_CANBEUSE = 1, account = 0, to_be_exclude = 0, is_depot = 0,"
    + " lg_GROUPE_ID = NULL, dbl_POURCENTAGE_REMISE = 0, dbl_REMISE_FORFETAIRE = 0, bool_IsACCOUNT = 0 " + (reglages ? ', ' + reglages : '') + ";"
    + " INSERT INTO t_tiers_payant SELECT * FROM tmp_tp; DROP TEMPORARY TABLE tmp_tp;");
  etat.tiersPayants.push(id);
  return id;
}
const encoursTp = (id) => Number(q("SELECT COALESCE(db_CONSOMMATION_MENSUELLE, 0) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '" + id + "'"));
const encoursLien = (lien) => Number(q("SELECT COALESCE(db_CONSOMMATION_MENSUELLE, 0) FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '" + lien + "'"));

function ouvrirCaisse() {
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND str_STATUT = 'is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + ADMIN + "', 0, 0, CURDATE(), NOW(), '" + ADMIN + "', NOW(), '" + ADMIN + "', 'is_Using')");
    etat.caisseCreee = true;
  }
}

/* ventes creees pendant le test : par le compte de test, ou rattachees a un client ou un tiers payant d'essai */
function ventesDuTest() {
  /* ventes notees, et leurs descendantes sur deux generations (copie de modification, annulation, annulation de la copie) */
  const notees = liste(etat.ventes);
  const enfants = '(SELECT x.lg_PREENREGISTREMENT_ID FROM t_preenregistrement x WHERE x.lg_PARENT_ID IN (' + notees + ') OR x.lg_PREENGISTREMENT_ANNULE_ID IN (' + notees + '))';
  return q("SELECT DISTINCT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p LEFT JOIN t_client c ON c.lg_CLIENT_ID = p.lg_CLIENT_ID"
    + " WHERE p.lg_PREENREGISTREMENT_ID IN (" + notees + ") OR p.lg_PREENREGISTREMENT_ID IN " + enfants
    + " OR p.lg_PARENT_ID IN " + enfants + " OR p.lg_PREENGISTREMENT_ANNULE_ID IN " + enfants
    + " OR (p.dt_CREATED >= '" + DEBUT + "' AND p.lg_USER_ID = '" + ADMIN + "') OR c.str_LAST_NAME LIKE '" + MARQUE + "%'"
    + " OR p.lg_PARENT_ID IN (SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "')"
    + " OR p.lg_PREENREGISTREMENT_ID IN (SELECT t.lg_PREENREGISTREMENT_ID FROM t_preenregistrement_compte_client_tiers_payent t"
    + "   JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID WHERE l.lg_TIERS_PAYANT_ID LIKE '" + MARQUE + "%')")
    .split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}

const clientsDuTest = "(SELECT lg_CLIENT_ID FROM t_client WHERE str_LAST_NAME LIKE '" + MARQUE + "%')";
const comptesDuTest = "(SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client WHERE lg_CLIENT_ID IN " + clientsDuTest + ")";

let nettoye = false;
function nettoyer() {
  nettoye = true;
  const v = liste(ventesDuTest());
  const tps = "(SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID LIKE '" + MARQUE + "%')";
  const factures = "(SELECT lg_FACTURE_ID FROM t_facture WHERE tiersPayant IN " + tps + " OR str_CUSTOMER IN " + tps
    + " OR str_CUSTOMER IN (SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client WHERE p_KEY IN " + tps + ") OR str_CODE_FACTURE LIKE '" + MARQUE + "%'"
    + " OR groupeTp_id IN (SELECT lg_GROUPE_ID FROM t_groupe_tierspayant WHERE str_LIBELLE LIKE '" + MARQUE + "%')"
    /* factures portant un bon d'une vente du test, et leur facture de groupe */
    + " OR lg_FACTURE_ID IN (SELECT d.lg_FACTURE_ID FROM t_facture_detail d WHERE d.str_REF IN (SELECT t.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID"
    + "   FROM t_preenregistrement_compte_client_tiers_payent t WHERE t.lg_PREENREGISTREMENT_ID IN (" + v + ")))"
    + " OR lg_FACTURE_ID IN (SELECT x.str_PERE FROM t_facture x JOIN t_facture_detail d ON d.lg_FACTURE_ID = x.lg_FACTURE_ID WHERE d.str_REF IN"
    + "   (SELECT t.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent t WHERE t.lg_PREENREGISTREMENT_ID IN (" + v + "))))";
  const dossiers = "(SELECT lg_DOSSIER_REGLEMENT_ID FROM t_dossier_reglement WHERE str_ORGANISME_ID IN " + clientsDuTest
    + " OR str_ORGANISME_ID IN " + tps + " OR lg_FACTURE_ID IN " + factures + ")";
  const etapes = [
    "CREATE TEMPORARY TABLE za_v AS SELECT lg_PREENREGISTREMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ")",
    'CREATE TEMPORARY TABLE za_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (SELECT id FROM za_v)',
    'CREATE TEMPORARY TABLE za_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (SELECT id FROM za_v) AND lg_REGLEMENT_ID IS NOT NULL',
    'CREATE TEMPORARY TABLE za_d AS SELECT lg_DOSSIER_REGLEMENT_ID id FROM t_dossier_reglement WHERE lg_DOSSIER_REGLEMENT_ID IN ' + dossiers,
    'CREATE TEMPORARY TABLE za_f AS SELECT lg_FACTURE_ID id FROM t_facture WHERE lg_FACTURE_ID IN ' + factures,
    'DELETE FROM vente_modifiee_ligne WHERE modification_id IN (SELECT id FROM vente_modifiee WHERE vente_id IN (SELECT id FROM za_v) OR vente_origine_id IN (SELECT id FROM za_v))',
    'DELETE FROM vente_modifiee WHERE vente_id IN (SELECT id FROM za_v) OR vente_origine_id IN (SELECT id FROM za_v)',
    'DELETE FROM vente_exclu WHERE preenregistrement_id IN (SELECT id FROM za_v) OR tiersPayant_id IN ' + tps,
    'DELETE FROM vente_reglement WHERE vente_id IN (SELECT id FROM za_v)',
    'DELETE FROM annulation_recette WHERE preenregistrement_id IN (SELECT id FROM za_v)',
    'DELETE FROM annulation_snapshot WHERE idVente IN (SELECT id FROM za_v)',
    'DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM za_l) OR lg_PREENREGISTREMENT_DETAIL_ID IN (SELECT id FROM za_l)',
    'DELETE FROM mvttransaction WHERE pkey IN (SELECT id FROM za_v) OR vente_id IN (SELECT id FROM za_v) OR pkey IN (SELECT id FROM za_d) OR pkey IN (SELECT id FROM za_f)',
    'DELETE FROM t_mvt_caisse WHERE str_NUM_PIECE_COMPTABLE IN (SELECT id FROM za_d)',
    'DELETE FROM t_reglement WHERE str_REF_RESSOURCE IN (SELECT id FROM za_d)',
    'DELETE FROM t_dossier_reglement_detail WHERE lg_DOSSIER_REGLEMENT_ID IN (SELECT id FROM za_d)',
    'DELETE FROM t_dossier_reglement WHERE lg_DOSSIER_REGLEMENT_ID IN (SELECT id FROM za_d)',
    'DELETE FROM t_groupe_factures WHERE lg_FACTURES_ID IN (SELECT id FROM za_f)',
    'DELETE FROM t_facture_detail WHERE lg_FACTURE_ID IN (SELECT id FROM za_f)',
    'UPDATE t_facture SET str_PERE = NULL WHERE lg_FACTURE_ID IN (SELECT id FROM za_f)',
    'DELETE FROM t_facture WHERE lg_FACTURE_ID IN (SELECT id FROM za_f)',
    'DELETE FROM t_recettes WHERE str_REF_FACTURE IN (SELECT id FROM za_v)',
    'DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (SELECT id FROM za_v) OR lg_COMPTE_CLIENT_ID IN ' + comptesDuTest,
    'DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN (SELECT id FROM za_v)',
    'DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (SELECT id FROM za_v)',
    'UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (SELECT id FROM za_v)',
    'DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (SELECT id FROM za_v)',
    'DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM za_r)',
    /* mouvements de retour (type 13) du test SEULEMENT : leur pkey est l'identifiant numerique de la ligne de retour, que
       d'anciens mouvements (inventaires...) peuvent aussi porter ; on filtre donc aussi sur type, produit et date */
    "DELETE FROM hmvtproduit WHERE typeMvt = '13' AND createdAt >= '" + DEBUT + "' AND lg_FAMILLE_ID IN (" + liste(etat.produits.map((p) => p.id)) + ")"
      + ' AND (pkey IN (SELECT CAST(d.id AS CHAR) FROM retour_carnet_detail d JOIN retour_carnet r ON r.id = d.retour_carnet_id WHERE r.tierspayant_id IN ' + tps + ')'
      + " OR pkey IN (SELECT CONCAT('RC-', d.id) FROM retour_carnet_detail d"
      + ' JOIN retour_carnet r ON r.id = d.retour_carnet_id WHERE r.tierspayant_id IN ' + tps + '))',
    'DELETE FROM retour_carnet_detail WHERE retour_carnet_id IN (SELECT id FROM retour_carnet WHERE tierspayant_id IN ' + tps + ')',
    'DELETE FROM retour_carnet WHERE tierspayant_id IN ' + tps,
    'DELETE FROM reglement_carnet WHERE tierspayant_id IN ' + tps,
    'DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_ID IN ' + comptesDuTest + ' OR lg_TIERS_PAYANT_ID IN ' + tps,
    'DELETE FROM t_ayant_droit WHERE lg_CLIENT_ID IN ' + clientsDuTest,
    'DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN ' + clientsDuTest + ' OR p_KEY IN ' + tps,
    'DELETE FROM t_client WHERE lg_CLIENT_ID IN ' + clientsDuTest,
    'DELETE FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID IN ' + tps,
    "DELETE FROM t_groupe_factures WHERE lg_GROUPE_ID IN (SELECT lg_GROUPE_ID FROM t_groupe_tierspayant WHERE str_LIBELLE LIKE '" + MARQUE + "%')",
    "UPDATE t_tiers_payant SET lg_GROUPE_ID = NULL WHERE lg_GROUPE_ID IN (SELECT lg_GROUPE_ID FROM t_groupe_tierspayant WHERE str_LIBELLE LIKE '" + MARQUE + "%')",
    "DELETE FROM t_groupe_tierspayant WHERE str_LIBELLE LIKE '" + MARQUE + "%'",
    /* mouvements de caisse manuels du compte de test */
    "CREATE TEMPORARY TABLE za_mc AS SELECT lg_MVT_CAISSE_ID id FROM t_mvt_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND dt_CREATED >= '" + DEBUT + "'",
    'DELETE FROM mvttransaction WHERE pkey IN (SELECT id FROM za_mc)',
    'DELETE FROM t_reglement WHERE str_REF_RESSOURCE IN (SELECT id FROM za_mc)',
    'DELETE FROM t_mvt_caisse WHERE lg_MVT_CAISSE_ID IN (SELECT id FROM za_mc)',
    /* remises d'essai */
    "DELETE FROM t_grille_remise WHERE lg_REMISE_ID LIKE '" + MARQUE + "%'",
    "DELETE FROM t_remise WHERE lg_REMISE_ID LIKE '" + MARQUE + "%'",
    "DELETE FROM t_workflow_remise_article WHERE lg_WORKFLOW_REMISE_ARTICLE_ID LIKE '" + MARQUE + "%'",
    /* journal et notifications ecrits par le compte de test pendant le scenario */
    "DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE user_id = '" + ADMIN + "' AND created_at >= '" + DEBUT + "')",
    "DELETE FROM notification WHERE user_id = '" + ADMIN + "' AND created_at >= '" + DEBUT + "'",
    "DELETE FROM t_event_log WHERE lg_USER_ID = '" + ADMIN + "' AND dt_CREATED >= '" + DEBUT + "'",
  ];
  /* une seule connexion (les tables temporaires n'existent que dans la leur) ; --force : une etape en echec
     n'arrete pas les suivantes, et l'erreur est affichee */
  const sortie = require('child_process').spawnSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '--force', BASE],
    { input: etapes.join(';\n') + ';', encoding: 'utf8' });
  if (sortie.error || sortie.status) { console.log('  (nettoyage) code ' + sortie.status + ' ' + (sortie.error || '')); }
  (sortie.stderr || '').split('\n').filter((l) => /ERROR/.test(l)).forEach((l) => console.log('  (nettoyage) ' + l.slice(0, 300)));
  for (const r of etat.restaurations.reverse()) {
    try { exec(r); } catch (x) { console.log('  (restauration) ' + r.slice(0, 90) + ' : ' + String(x.message).split('\n')[1]); }
  }
  for (const p of etat.produits) {
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + p.origine[0] + ", int_NUMBER = " + p.origine[1] + ", int_UG = " + p.origine[2]
      + " WHERE lg_FAMILLE_ID = '" + p.id + "' AND lg_EMPLACEMENT_ID = '1'");
    exec("UPDATE t_famille SET int_NOMBRE_VENTES = " + p.nbVentes + " WHERE lg_FAMILLE_ID = '" + p.id + "'");
  }
  for (const [cle, avant] of etat.params) {
    exec(avant === '__ABSENT__' ? "DELETE FROM t_parameters WHERE str_KEY = '" + cle + "'"
      : "UPDATE t_parameters SET str_VALUE = '" + avant + "' WHERE str_KEY = '" + cle + "'");
  }
  if (etat.caisseCreee) { exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'"); }
  const reste = ventesDuTest().length;
  ok('Jeu d\'essai retiré (ventes, clients, tiers payants, factures), stocks et paramètres remis',
    reste === 0 && q("SELECT COUNT(*) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID LIKE '" + MARQUE + "%'") === '0'
    && q("SELECT COUNT(*) FROM t_client WHERE str_LAST_NAME LIKE '" + MARQUE + "%'") === '0'
    && etat.produits.every((p) => q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER, '|', int_UG) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + p.id
      + "' AND lg_EMPLACEMENT_ID = '1'") === p.origine.join('|')), 'ventes restantes ' + reste);
}

/* navigateur connecte avec le compte de test ; api() passe par la session de l'ecran */
async function connecter() {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  await p.goto((process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 40000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
  const api = (methode, url, corps, entetes) => p.evaluate(async ([m, u, c, h]) => {
    const form = h && /urlencoded/.test(h['Content-Type'] || '');
    const r = await fetch(u, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}),
      body: c === undefined || c === null ? undefined : form ? new URLSearchParams(c).toString() : JSON.stringify(c) });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 300) }; }
    if (Array.isArray(j)) { j = { liste: j }; }
    j.http = r.status; return j;
  }, [methode, url, corps, entetes]);
  return { b, p, api, erreurs };
}

/* ---- parcours de l'ecran de vente, par son API ---- */
function venteComptant(api) {
  const ajouter = async (p, qte, venteId, extra) => {
    const r = await api('POST', venteId ? '../api/v1/vente/add/item' : '../api/v1/vente/add/vno', Object.assign({ typeVenteId: '1', natureVenteId: '1',
      produitId: p.id, itemPu: p.pu, qte, qteServie: qte, devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN, venteId: venteId || null }, extra || {}));
    const id = r.data ? r.data.lgPREENREGISTREMENTID : venteId || null;
    if (id && !etat.ventes.includes(id)) { etat.ventes.push(id); }
    return id;
  };
  const net = async (venteId, remiseId) => (await api('POST', '../api/v1/vente/net/vno', { venteId, remiseId: remiseId || '', checkUg: false })).data || {};
  const cloturer = async (venteId, opts) => {
    const o = Object.assign({ mode: '1', clientId: '', recu: null, typeVente: '1', remiseId: '' }, opts || {});
    const data = await net(venteId, o.remiseId);
    const montant = o.montant !== undefined ? o.montant : data.montantNet;
    const recu = o.recu !== null ? o.recu : montant;
    const r = await api('POST', '../api/v1/vente/cloturer/vno', { venteId, typeVenteId: o.typeVente, natureVenteId: '1', devis: false, remiseId: o.remiseId,
      userVendeurId: ADMIN, montantRecu: recu, montantRemis: 0, montantPaye: o.paye !== undefined ? o.paye : recu, totalRecap: montant, partTP: 0,
      typeRegleId: o.mode, clientId: o.clientId, nom: '', commentaire: '', banque: '', lieux: '', marge: data.marge || 0, data,
      reglements: [{ typeReglement: o.mode, montant: o.mode === '1' ? (o.paye !== undefined ? o.paye : recu) : montant, montantAttentu: montant }] });
    r.net = data;
    return r;
  };
  const vendre = async (p, qte, opts) => {
    const v = await ajouter(p, qte);
    const c = await cloturer(v, opts);
    return c.success ? v : null;
  };
  return { ajouter, net, cloturer, vendre };
}

/* client assure pose en base, tel que l'ecran client le cree : client, compte client, ayant droit (meme identifiant que
   le client), un lien par tiers payant (le premier RO et priorite 1, les suivants complementaires 2, 3...).
   La creation par l'ecran (client/add/assurance) n'est pas utilisee : sur le poste, le 25/10, elle repond « succes »
   sans rien enregistrer (constat N8, voir clientAssureParEcran). */
async function clientAssure(api, nom, tps) {
  const clientId = MARQUE + '-CL-' + nom;
  const cpt = clientId + '-cpt';
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, str_SEXE, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + clientId + "', 'ESSAI', '" + MARQUE + ' ' + nom + "', '" + MARQUE + '-' + nom + "', 'M', '1', 'enable', NOW(), NOW());"
    + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_CODE_COMPTE_CLIENT, P_KEY, str_TYPE, str_STATUT, dbl_QUOTA_CONSO_MENSUELLE, dbl_PLAFOND, dbl_CAUTION,"
    + " dec_Balance_InDisponible, dec_balance_Disponible, dt_CREATED, dt_UPDATED) VALUES ('" + cpt + "', '" + clientId + "', '', '', '', 'enable', 0, -1, -1, 0, 0, NOW(), NOW());"
    + "INSERT INTO t_ayant_droit (lg_AYANTS_DROITS_ID, lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, str_SEXE, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + clientId + "', '" + clientId + "', 'ESSAI', '" + MARQUE + ' ' + nom + "', '" + MARQUE + '-' + nom + "', 'M', 'enable', NOW(), NOW())");
  tps.forEach((t, i) => exec("INSERT INTO t_compte_client_tiers_payant (lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID, dt_CREATED, dt_UPDATED,"
    + " str_STATUT, int_POURCENTAGE, int_PRIORITY, b_IS_RO, b_IS_RC1, b_IS_RC2, dbl_PLAFOND, dbl_QUOTA_CONSO_MENSUELLE, dbl_QUOTA_CONSO_VENTE, str_NUMERO_SECURITE_SOCIAL,"
    + " db_PLAFOND_ENCOURS, db_CONSOMMATION_MENSUELLE, b_IsAbsolute, b_CANBEUSE, isCapped) VALUES ('" + clientId + '-L' + i + "', '" + cpt + "', '" + t.tp + "',"
    + " NOW() + INTERVAL " + i + " SECOND, NOW(), 'enable', " + t.taux + ", " + (i + 1) + ", " + (i === 0 ? 1 : 0) + ", 0, 0, 0, 0, 0, '" + MARQUE + '-' + nom + '-' + i + "', 0, 0, 0, 1, 0)"));
  return {
    clientId,
    ayantDroitId: clientId,
    lien: (tp) => q("SELECT l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID FROM t_compte_client_tiers_payant l JOIN t_compte_client c ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID"
      + " WHERE c.lg_CLIENT_ID = '" + clientId + "' AND l.lg_TIERS_PAYANT_ID = '" + tp + "' AND l.str_STATUT = 'enable' ORDER BY l.dt_CREATED LIMIT 1"),
  };
}

/* creation par l'ecran client (client/add/assurance), gardee pour le constat N8 */
async function clientAssureParEcran(api, nom, tps) {
  const corps = { bIsAbsolute: false, dbPLAFONDENCOURS: 0, dblQUOTACONSOMENSUELLE: 0, dtNAISSANCE: '', intPOURCENTAGE: tps[0].taux, intPRIORITY: 1,
    lgCATEGORIEAYANTDROITID: '', lgCLIENTID: null, lgCOMPANYID: '', lgRISQUEID: '', lgTIERSPAYANTID: tps[0].tp, lgTYPECLIENTID: '1', lgVILLEID: '',
    strADRESSE: '', strCODEPOSTAL: '', strFIRSTNAME: 'Essai', strLASTNAME: MARQUE + ' ' + nom, compteTp: '', strNUMEROSECURITESOCIAL: MARQUE + '-' + nom,
    strSEXE: 'M', forcerCreation: true,
    tiersPayants: tps.slice(1).map((t, i) => ({ compteTp: '', lgTIERSPAYANTID: t.tp, numSecurity: MARQUE + '-' + nom + '-' + i, order: i + 2, taux: t.taux,
      bIsAbsolute: false, dbPLAFONDENCOURS: 0, tpFullName: '' })) };
  const r = await api('POST', '../api/v1/client/add/assurance', corps);
  if (!r.success) { throw new Error('client ' + nom + ' : ' + JSON.stringify(r).slice(0, 300)); }
  const clientId = r.data.lgCLIENTID;
  return {
    clientId,
    ayantDroitId: q("SELECT IFNULL(MAX(lg_AYANTS_DROITS_ID), '') FROM t_ayant_droit WHERE lg_CLIENT_ID = '" + clientId + "'"),
    lien: (tp) => q("SELECT l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID FROM t_compte_client_tiers_payant l JOIN t_compte_client c ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID"
      + " WHERE c.lg_CLIENT_ID = '" + clientId + "' AND l.lg_TIERS_PAYANT_ID = '" + tp + "' AND l.str_STATUT = 'enable' ORDER BY l.dt_CREATED LIMIT 1"),
  };
}

/* ---- parcours de la vente assurance (type 2) ou carnet (type 3), par l'API de l'ecran ---- */
function venteAssurance(api) {
  /* tps : [{ lien, taux, bon }] */
  const params = (tps) => tps.map((t) => ({ compteTp: t.lien, numBon: t.bon, taux: t.taux, cmu: 'false' }));
  const ajouter = async (cl, tps, p, qte, venteId, typeVente) => {
    const r = await api('POST', venteId ? '../api/v1/vente/add/item' : '../api/v1/vente/add/assurance', { typeVenteId: typeVente || '2', natureVenteId: '1',
      produitId: p.id, itemPu: p.pu, qte, qteServie: qte, devis: false, remiseId: null, venteId: venteId || null, userVendeurId: ADMIN, tierspayants: params(tps),
      clientId: cl.clientId, ayantDroitId: cl.ayantDroitId, prevente: false });
    const id = r.data ? r.data.lgPREENREGISTREMENTID : venteId || null;
    if (!id) { throw new Error('ajout VO : ' + JSON.stringify(r).slice(0, 300)); }
    if (!etat.ventes.includes(id)) { etat.ventes.push(id); }
    return id;
  };
  const net = async (venteId, tps, remiseId) => {
    const r = await api('POST', '../api/v1/vente/net/assurance', { remiseId: remiseId || null, venteId, tierspayants: params(tps) });
    return Object.assign({ succes: r.success, msgNet: r.msg }, r.data || {});
  };
  /* opts : mode ('1' especes, '4' differe), recu, sansBon, falsifier(data) pour modifier ce que le poste renvoie */
  const cloturer = async (cl, venteId, tps, opts) => {
    const o = Object.assign({ mode: '1', typeVente: '2', remiseId: null, sansBon: false }, opts || {});
    const data = await net(venteId, tps, o.remiseId);
    if (o.falsifier) { o.falsifier(data); }
    const recu = o.recu !== undefined ? o.recu : data.montantNet;
    const r = await api('POST', '../api/v1/vente/cloturer/assurance', { typeVenteId: o.typeVente, ayantDroitId: cl.ayantDroitId, natureVenteId: '1', devis: false,
      remiseId: o.remiseId, venteId, userVendeurId: ADMIN, userConseilId: null, montantRecu: recu, montantRemis: 0, montantPaye: recu, totalRecap: data.montant,
      typeRegleId: o.mode, clientId: cl.clientId, nom: '', sansBon: o.sansBon, commentaire: '', banque: '', lieux: '', tierspayants: data.tierspayants,
      partTP: data.montantTp, marge: data.marge, medecinId: null,
      reglements: [{ typeReglement: o.mode, montant: o.mode === '1' ? recu : data.montantNet, montantAttentu: data.montantNet }] });
    r.net = data;
    return r;
  };
  const vendre = async (cl, tps, p, qte, opts) => {
    const v = await ajouter(cl, tps, p, qte, null, opts && opts.typeVente);
    if (opts && opts.remiseId) { await api('POST', '../api/v1/vente/remise', { remiseId: opts.remiseId, venteId: v }); }
    const c = await cloturer(cl, v, tps, opts);
    if (!c.success) { throw new Error('clôture VO : ' + JSON.stringify(c).slice(0, 300)); }
    return { v, c };
  };
  return { ajouter, net, cloturer, vendre, params };
}

const lignesTp = (v) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', l.lg_TIERS_PAYANT_ID, t.int_PERCENT, t.int_PRICE, t.str_STATUT, t.str_STATUT_FACTURE) ORDER BY l.lg_TIERS_PAYANT_ID SEPARATOR ' ; '), 'aucune')"
  + " FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
  + " WHERE t.lg_PREENREGISTREMENT_ID = '" + v + "'");

const vente = (id) => {
  const r = q("SELECT CONCAT_WS('|', str_STATUT, b_IS_CANCEL, int_PRICE, int_PRICE_REMISE, int_CUST_PART, montantTva, IFNULL(lg_CLIENT_ID, 'NULL')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'").split('|');
  return { statut: r[0], annulee: r[1] === '1', prix: Number(r[2]), remise: Number(r[3]), partClient: Number(r[4]), tva: Number(r[5]), client: r[6] };
};

/* arret brutal (exception avant le finally, connexion impossible) : le jeu d'essai est quand meme retire */
process.on('exit', () => { if (!nettoye && (etat.produits.length || etat.tiersPayants.length || etat.caisseCreee || etat.params.length)) { nettoyer(); } });

module.exports = { ENV_E2E, MARQUE, ADMIN, DEBUT, ok, bilan, exec, q, liste, produit, stock, parametre, tiersPayant, encoursTp, encoursLien,
  ouvrirCaisse, nettoyer, connecter, venteComptant, vente, ventesDuTest, etat, clientAssure, clientAssureParEcran, venteAssurance, lignesTp };
