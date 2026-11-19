/* DEMANDE 64 (regle du pharmacien, 19/11) : payer a la borne par mobile money termine la vente.
 *
 * 1. Empecher : la borne n'encaisse (cloture automatique demandee) que si la vente pourra etre cloturee. Caisse de la
 *    borne fermee -> paiement refuse avec message, aucune transaction creee, la vente reste intacte.
 * 2. Verrouiller : vente qui porte un paiement mobile money paye (ou en cours) non cloture -> aucune modification du
 *    panier (retrait v1 et v2, quantite, ajout v1 et v2, remise, type de vente), refus avec message, rien d'ecrit.
 *    Le verrou tombe quand le paiement en cours est annule.
 * 3. Filet : cloture automatique en echec (caisse fermee entre la demande et le paiement) -> la vente se termine au
 *    comptoir, au meme montant, avec le mode de l'operateur : un reglement, un mouvement de caisse, stock - quantite.
 * Jeux varies : quantite 3 et 2, deux articles de prix differents, Wave et Orange Money, paiement en cours et paye.
 * Tout ce qui est pose est retire, stock et caisse compris.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();

const CLIENT = 'E2E-D64-CLI';
const CAISSE = 'E2E-D64-RC';
const PRODUITS = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, f.int_PRICE, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f JOIN t_famille_stock s"
  + " ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable'"
  + " AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.int_PRICE BETWEEN 500 AND 4000 AND s.int_NUMBER_AVAILABLE > 20 AND f.bool_DECONDITIONNE = 0"
  + " AND NOT EXISTS (SELECT 1 FROM t_famille e WHERE e.lg_FAMILLE_PARENT_ID = f.lg_FAMILLE_ID)"
  + " GROUP BY f.int_PRICE ORDER BY f.int_CIP LIMIT 2").split('\n').map((l) => l.split('\t'));
// une remise de la base si elle en a, sinon « 0 » (sans remise) : la demande de remise est refusee avant d'etre lue
const REMISE = q("SELECT IFNULL(MAX(lg_REMISE_ID), '0') FROM t_remise");
const ventes = [];
let caissePosee = false, caisseExistante = null;

function nettoyer() {
  for (const v of ventes) {
    const det = "(SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "')";
    const regl = q("SELECT IFNULL(MAX(lg_REGLEMENT_ID), '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
    q("DELETE FROM paiement_mobile WHERE vente_id = '" + v + "'; DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN " + det + " OR pkey = '" + v + "';"
      + " DELETE FROM mvttransaction WHERE vente_id = '" + v + "' OR pkey = '" + v + "'; DELETE FROM vente_reglement WHERE vente_id = '" + v + "';"
      + " DELETE FROM t_recettes WHERE str_REF_FACTURE = '" + v + "'; DELETE FROM t_cash_transaction WHERE lg_REGLEMENT_ID = '" + regl + "';"
      + " DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_reglement WHERE lg_REGLEMENT_ID = '" + regl + "' OR str_REF_RESSOURCE = '" + v + "'");
  }
  for (const x of PRODUITS) {
    q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + x[3] + ", int_NUMBER = " + x[4] + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + x[0] + "'");
  }
  q("DELETE FROM t_compte_client WHERE lg_CLIENT_ID = '" + CLIENT + "'; DELETE FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "';"
    + (caissePosee ? " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'" : ''));
  if (caisseExistante) { q("UPDATE t_resume_caisse SET str_STATUT = 'is_Using' WHERE ld_CAISSE_ID = '" + caisseExistante + "'"); }
}

function poser(user) {
  q("INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, str_ADRESSE, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + CLIENT + "', '" + CLIENT + "', 'ZZBORNEPAYEE', 'E2E', '0707070707', '6', NOW(), NOW(), 'enable');"
    + " INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, str_CODE_COMPTE_CLIENT, str_TYPE, P_KEY, dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION, dec_Balance,"
    + " dt_CREATED, dt_UPDATED, str_STATUT, lg_CLIENT_ID, dbl_PLAFOND) VALUES ('" + CLIENT + "', '" + CLIENT + "', 'CLIENT', '" + CLIENT + "', 0, 0, 0,"
    + " NOW(), NOW(), 'enable', '" + CLIENT + "', 0)");
  const ouverte = q("SELECT IFNULL(MAX(ld_CAISSE_ID), '') FROM t_resume_caisse WHERE lg_USER_ID = '" + user + "' AND str_STATUT = 'is_Using'");
  if (!ouverte) {
    caissePosee = true;
    q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + user + "', 0, 0, CURDATE(), NOW(), '" + user + "', NOW(), '" + user + "', 'is_Using')");
    return CAISSE;
  }
  return ouverte;
}

const api = (p, m, u, c) => p.evaluate(async ([m, u, c]) => {
  const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 160) }; } j.http = r.status; return j;
}, [m, u, c]);

/* empreinte de tout ce qu'une modification du panier toucherait */
const empreinte = (v, x) => q("SELECT CONCAT_WS('|', p.str_STATUT, p.int_PRICE, IFNULL(p.int_PRICE_REMISE, 0), IFNULL(p.lg_REMISE_ID, '-'), p.lg_TYPE_VENTE_ID,"
  + " (SELECT GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, ':', d.int_QUANTITY, ':', d.int_QUANTITY_SERVED, ':', d.int_PRICE) ORDER BY d.lg_FAMILLE_ID) FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID),"
  + " (SELECT COUNT(*) FROM hmvtproduit h WHERE h.pkey = p.lg_PREENREGISTREMENT_ID),"
  + " (SELECT COUNT(*) FROM t_preenregistrement_compte_client c WHERE c.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID),"
  + " (SELECT GROUP_CONCAT(CONCAT(statut, '/', cloture, '/', montant)) FROM paiement_mobile m WHERE m.vente_id = p.lg_PREENREGISTREMENT_ID),"
  + " (SELECT GROUP_CONCAT(s.int_NUMBER_AVAILABLE ORDER BY s.lg_FAMILLE_ID) FROM t_famille_stock s WHERE s.lg_EMPLACEMENT_ID = '1' AND s.lg_FAMILLE_ID IN ('" + PRODUITS[0][0] + "', '" + PRODUITS[1][0] + "')))"
  + " FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = '" + v + "'");

(async () => {
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
  nettoyer();
  const caisse = poser(user);
  if (!caissePosee) { caisseExistante = caisse; }
  const fermerCaisse = () => q("UPDATE t_resume_caisse SET str_STATUT = 'is_Closed' WHERE ld_CAISSE_ID = '" + caisse + "'");
  const ouvrirCaisse = () => q("UPDATE t_resume_caisse SET str_STATUT = 'is_Using' WHERE ld_CAISSE_ID = '" + caisse + "'");
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  try {
    ok('Jeu d’essai : deux articles de prix différents', PRODUITS.length === 2 && PRODUITS[0][2] !== PRODUITS[1][2], JSON.stringify(PRODUITS.map((x) => [x[1], x[2]])) + ' remise ' + REMISE);
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const cap = await api(p, 'GET', '../api/v1/paiements-mobile/capacites');
    ok('Simulateur de paiement actif', cap.fournisseur === 'simulateur', JSON.stringify(cap).slice(0, 120));

    const prevente = async (x, qte) => {
      const r = await api(p, 'POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: x[0], itemPu: Number(x[2]), qte, qteServie: qte,
        devis: false, prevente: true, remiseId: '', venteId: null, userVendeurId: user, clientId: CLIENT });
      const v = r.data && r.data.lgPREENREGISTREMENTID; if (v) { ventes.push(v); await api(p, 'PUT', '../api/v1/vente/terminerprevente/' + v); }
      return v;
    };
    const ligne = (v) => q("SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "' ORDER BY dt_CREATED LIMIT 1");
    const pu = (it) => Number(q("SELECT int_PRICE_UNITAIR FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '" + it + "'"));
    const payer = async (v, operateur, cloturer, simuler) => {
      const pm = await api(p, 'POST', '../api/v1/paiements-mobile', { venteId: v, operateur, cloturer });
      const id = pm.data && pm.data.id;
      if (id && simuler) { await api(p, 'POST', '../api/v1/paiements-mobile/' + id + '/simuler?payer=true'); await api(p, 'GET', '../api/v1/paiements-mobile/' + id); }
      return { pm, id };
    };
    const tentatives = async (v, x) => {
      const it = ligne(v);
      return {
        retraitV1: await api(p, 'POST', '../api/v1/vente/remove/vno/item/' + it),
        retraitV2: await api(p, 'POST', '../api/v2/vente/remove/vno/item/' + it),
        quantite: await api(p, 'POST', '../api/v1/vente/update/item/vno', { itemId: it, itemPu: pu(it), qte: 1, qteServie: 1, venteId: v }),
        ajoutV1: await api(p, 'POST', '../api/v1/vente/add/item', { venteId: v, produitId: PRODUITS[1][0], itemPu: Number(PRODUITS[1][2]), qte: 1, qteServie: 1, typeVenteId: '1' }),
        ajoutV2: await api(p, 'POST', '../api/v2/vente/add/item', { venteId: v, produitId: PRODUITS[1][0], itemPu: Number(PRODUITS[1][2]), qte: 1, qteServie: 1, typeVenteId: '1' }),
        remise: await api(p, 'POST', '../api/v1/vente/remise', { venteId: v, remiseId: REMISE }),
        type: await api(p, 'POST', '../api/v1/vente/updatetypevente', { venteId: v, typeVenteId: '2' })
      };
    };
    const tousRefuses = (t, motif) => Object.keys(t).filter((k) => !(t[k].success === false && motif.test(t[k].msg || '')));

    /* 1. caisse de la borne fermee : paiement refuse avant tout encaissement */
    const C = await prevente(PRODUITS[1], 2);
    const avantC = empreinte(C);
    fermerCaisse();
    const refus = await payer(C, 'WAVE', true, false);
    ok('Caisse fermée : paiement refusé, message (caisse fermée, payer à la caisse)', refus.pm.success === false && /caisse de la borne est fermée/.test(refus.pm.message || '')
      && /paie à la caisse/.test(refus.pm.message || ''), JSON.stringify(refus.pm).slice(0, 240));
    ok('… aucune transaction créée, vente intacte', q("SELECT COUNT(*) FROM paiement_mobile WHERE vente_id = '" + C + "'") === '0' && empreinte(C) === avantC, empreinte(C));
    const sansCloture = await payer(C, 'WAVE', false, false);
    ok('Non-régression : sans clôture automatique (paiement en deux temps, comptoir), la demande reste acceptée', sansCloture.pm.success === true, JSON.stringify(sansCloture.pm).slice(0, 160));
    if (sansCloture.id) { await api(p, 'POST', '../api/v1/paiements-mobile/' + sansCloture.id + '/annuler'); }
    ouvrirCaisse();

    /* 2a. paiement en cours : verrou, puis verrou leve a l'annulation */
    const A = await prevente(PRODUITS[0], 3);
    const enCours = await payer(A, 'OM', false, false);
    const avantEnCours = empreinte(A);
    const tEnCours = await tentatives(A, PRODUITS[0]);
    const nonRefusEnCours = tousRefuses(tEnCours, /paiement Orange Money de \d+ F est en cours/);
    ok('Paiement en cours : les 7 modifications du panier refusées avec message', nonRefusEnCours.length === 0, nonRefusEnCours.map((k) => k + '=' + JSON.stringify(tEnCours[k]).slice(0, 100)).join(' ; '));
    ok('… rien d\'écrit', empreinte(A) === avantEnCours, avantEnCours + ' -> ' + empreinte(A));
    await api(p, 'POST', '../api/v1/paiements-mobile/' + enCours.id + '/annuler');
    const libre = await api(p, 'POST', '../api/v1/vente/update/item/vno', { itemId: ligne(A), itemPu: pu(ligne(A)), qte: 2, qteServie: 2, venteId: A });
    ok('Paiement annulé : le panier se modifie de nouveau (quantité 3 -> 2)', libre.success === true
      && q("SELECT int_QUANTITY FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + A + "'") === '2', JSON.stringify(libre).slice(0, 160));

    /* 2b. paiement recu, cloture automatique en echec (caisse fermee entre la demande et le paiement) */
    const net = Number(q("SELECT int_PRICE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + A + "'"));
    const demande = await api(p, 'POST', '../api/v1/paiements-mobile', { venteId: A, operateur: 'WAVE', cloturer: true });
    const idA = demande.data && demande.data.id;
    ok('Caisse ouverte : demande de paiement avec clôture automatique acceptée', demande.success === true && !!idA, JSON.stringify(demande).slice(0, 160));
    fermerCaisse();
    await api(p, 'POST', '../api/v1/paiements-mobile/' + idA + '/simuler?payer=true');
    await api(p, 'GET', '../api/v1/paiements-mobile/' + idA);
    ouvrirCaisse();
    ok('Clôture automatique en échec : payé, non clôturé, vente en cours', q("SELECT CONCAT(statut, '/', cloture, '/', montant) FROM paiement_mobile WHERE id = '" + idA + "'") === 'paye/0/' + net
      && q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + A + "'") !== 'is_Closed',
      q("SELECT CONCAT(statut, '/', cloture, '/', montant, '/', IFNULL(message, '-')) FROM paiement_mobile WHERE id = '" + idA + "'"));
    const avantPaye = empreinte(A);
    const tPaye = await tentatives(A, PRODUITS[0]);
    const nonRefusPaye = tousRefuses(tPaye, /déjà payée par Wave \(\d+ F\) : le panier ne peut plus être modifié/);
    ok('Prévente payée : les 7 modifications du panier refusées avec message', nonRefusPaye.length === 0, nonRefusPaye.map((k) => k + '=' + JSON.stringify(tPaye[k]).slice(0, 100)).join(' ; '));
    ok('… rien d\'écrit (vente, lignes, stock, traces, paiement)', empreinte(A) === avantPaye, avantPaye + ' -> ' + empreinte(A));
    const netAffiche = await api(p, 'POST', '../api/v1/vente/net/vno', { venteId: A });
    ok('Le net reste lisible (comptoir) : net = montant payé', netAffiche.data && netAffiche.data.montantNet === net, JSON.stringify(netAffiche).slice(0, 160));

    /* 3. filet : reprise au comptoir au montant paye */
    const stockAvant = Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUITS[0][0] + "'"));
    const cl = await api(p, 'POST', '../api/v1/vente/cloturer/vno', { venteId: A, typeRegleId: '10', typeVenteId: '1', natureVenteId: '1', clientId: CLIENT,
      montantPaye: net, montantRecu: net, montantRemis: 0, totalRecap: net, devis: false, userVendeurId: user, reglements: [{ typeReglement: '10', montant: net, montantAttentu: net }] });
    ok('Comptoir : vente terminée avec Wave au montant payé', cl.success === true, JSON.stringify(cl).slice(0, 200));
    const regl = q("SELECT CONCAT(COUNT(*), '|', IFNULL(GROUP_CONCAT(type_regelement), '-'), '|', IFNULL(SUM(montant), 0)) FROM vente_reglement WHERE vente_id = '" + A + "'");
    const stockApres = Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUITS[0][0] + "'"));
    ok('Bilan : un règlement Wave du montant payé, un seul mouvement de caisse, stock - 2, paiement clôturé',
      regl === '1|10|' + net && q("SELECT COUNT(*) FROM mvttransaction WHERE vente_id = '" + A + "'") === '1' && stockAvant - stockApres === 2
      && q("SELECT CONCAT(statut, '/', cloture) FROM paiement_mobile WHERE id = '" + idA + "'") === 'paye/1',
      regl + ' ; mvt ' + q("SELECT COUNT(*) FROM mvttransaction WHERE vente_id = '" + A + "'") + ' ; stock ' + stockAvant + ' -> ' + stockApres);
    ok('Rapprochement : paiement = règlement = mouvement de caisse = vente', Number(q("SELECT ABS(montant) FROM mvttransaction WHERE vente_id = '" + A + "'")) === net
      && Number(q("SELECT int_PRICE - IFNULL(int_PRICE_REMISE, 0) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + A + "'")) === net,
      q("SELECT montant FROM mvttransaction WHERE vente_id = '" + A + "'") + ' / ' + net);

    /* 4. non-regression : vente ordinaire, borne caisse ouverte, cloture automatique */
    const D = await prevente(PRODUITS[1], 1);
    const modD = await api(p, 'POST', '../api/v1/vente/update/item/vno', { itemId: ligne(D), itemPu: pu(ligne(D)), qte: 2, qteServie: 2, venteId: D });
    ok('Vente sans paiement mobile : quantité modifiable (1 -> 2)', modD.success === true, JSON.stringify(modD).slice(0, 160));
    const auto = await payer(D, 'WAVE', true, true);
    ok('Caisse ouverte : payée à la borne et clôturée automatiquement, un mouvement de caisse', auto.pm.success === true
      && q("SELECT CONCAT(statut, '/', cloture) FROM paiement_mobile WHERE id = '" + auto.id + "'") === 'paye/1'
      && q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + D + "'") === 'is_Closed'
      && q("SELECT COUNT(*) FROM mvttransaction WHERE vente_id = '" + D + "'") === '1', JSON.stringify(auto.pm).slice(0, 160));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées, stock et caisse remis', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + (ventes.join("','") || '-') + "')") === '0'
      && q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "'") === '0'
      && (caissePosee ? q("SELECT COUNT(*) FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'") === '0' : q("SELECT str_STATUT FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + caisse + "'") === 'is_Using')
      && PRODUITS.every((x) => q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + x[0] + "'") === x[3]),
      q("SELECT CONCAT_WS(' ', (SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + (ventes.join("','") || '-') + "')), (SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "'),"
        + " (SELECT GROUP_CONCAT(str_STATUT) FROM t_resume_caisse WHERE ld_CAISSE_ID IN ('" + CAISSE + "', '" + caisse + "')))") + ' ' + caissePosee + ' ' + PRODUITS.map((x) => q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + x[0] + "'") + '/' + x[3]).join(','));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
