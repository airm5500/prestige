/* DEMANDE 62 (applications mobiles, relance du 19/11) : client rapide et paiement mobile money de la borne.
 *
 * Par les routes des applications (session de connexion habituelle), sur la copie d'essai :
 *  1. client rapide cree avec son numero dans l'adresse (« 07 00 00 99 99 ») : retrouve par GET v1/client/lambda avec
 *     ?query=0700, ?query=07000099, ?query=07 00 00 ; une fiche ancienne de meme forme aussi ; une adresse postale
 *     commencant par des chiffres n'est pas prise pour un numero trop court ;
 *  2. client rapide sans type : client standard (6), retrouve par son nom ; type vide aussi ; type inconnu refuse ;
 *  3a. compte de borne (role d'essai au seul droit P_BORNE_PAIEMENT_MOBILE) : le droit figure dans GET v1/user/droits,
 *     cloturer:true accepte ; compte sans aucun droit : cloturer:true refuse (403 interdit), cloturer:false accepte ;
 *  3c. paiement simule d'une prevente comptant rattachee a un client : vente cloturee par la borne avec le mode de
 *     l'operateur, client et nom gardes ; bilan : un reglement, un mouvement de caisse, stock - quantite, une seule
 *     cloture meme si le paiement est notifie deux fois.
 * Le simulateur de paiement doit etre actif sur le serveur (PRESTIGE_PAIEMENTS_FOURNISSEUR=simulateur et son secret) ;
 * sans lui, 3a et 3c sont signales en echec. Tout ce qui est pose est retire, stock compris.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const URL = process.env.BASE || 'http://localhost:8080/prestige';

const NOM = 'ZZDEMANDE62';
const ANCIEN = 'E2E-D62-ANCIEN';
const ROLE_BORNE = 'E2E-D62-ROLE-BORNE', ROLE_NUL = 'E2E-D62-ROLE-NUL';
const BORNE = 'E2E-D62-BORNE', NUL = 'E2E-D62-NUL', MDP = 'E2e-D62-9';
const CAISSE = 'E2E-D62-RC';
const [PRODUIT, PRIX, STOCK, STOCK_TOTAL] = q("SELECT f.lg_FAMILLE_ID, f.int_PRICE, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f JOIN t_famille_stock s"
  + " ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable'"
  + " AND f.int_PRICE BETWEEN 500 AND 5000 AND s.int_NUMBER_AVAILABLE > 20 AND f.bool_DECONDITIONNE = 0"
  + " AND NOT EXISTS (SELECT 1 FROM t_famille e WHERE e.lg_FAMILLE_PARENT_ID = f.lg_FAMILLE_ID) ORDER BY f.int_CIP LIMIT 1").split('\t');
const ventes = [];

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
  q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + STOCK + ", int_NUMBER = " + STOCK_TOTAL + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'");
  q("CREATE TEMPORARY TABLE e2e_d62 AS SELECT lg_CLIENT_ID id FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%' OR lg_CLIENT_ID = '" + ANCIEN + "';"
    + " DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (SELECT id FROM e2e_d62); DELETE FROM t_client WHERE lg_CLIENT_ID IN (SELECT id FROM e2e_d62); DROP TEMPORARY TABLE e2e_d62;"
    + " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "';"
    + " DELETE FROM t_role_user WHERE lg_USER_ID IN ('" + BORNE + "', '" + NUL + "'); DELETE FROM t_event_log WHERE lg_USER_ID IN ('" + BORNE + "', '" + NUL + "');"
    + " DELETE FROM t_user WHERE lg_USER_ID IN ('" + BORNE + "', '" + NUL + "');"
    + " DELETE FROM t_role_privelege WHERE lg_ROLE_ID IN ('" + ROLE_BORNE + "', '" + ROLE_NUL + "'); DELETE FROM t_role WHERE lg_ROLE_ID IN ('" + ROLE_BORNE + "', '" + ROLE_NUL + "')");
}

function poser() {
  q("INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED) VALUES"
    + " ('" + ROLE_BORNE + "', 'E2E borne', 'E2E borne', 'CUSTOMER', 'enable', NOW(), NOW()), ('" + ROLE_NUL + "', 'E2E sans droit', 'E2E sans droit', 'CUSTOMER', 'enable', NOW(), NOW());"
    + " INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)"
    + " SELECT '" + ROLE_BORNE + "', '" + ROLE_BORNE + "', lg_PRIVELEGE_ID, NOW(), NOW() FROM t_privilege WHERE str_NAME = 'P_BORNE_PAIEMENT_MOBILE' LIMIT 1;"
    + " INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION) VALUES"
    + " ('" + BORNE + "', 'e2e-d62-borne', MD5('" + MDP + "'), 'E2E', 'BORNE', 'Borne', 'enable', '1', NOW(), 0),"
    + " ('" + NUL + "', 'e2e-d62-nul', MD5('" + MDP + "'), 'E2E', 'SANSDROIT', 'Borne', 'enable', '1', NOW(), 0);"
    + " INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + BORNE + "', '" + ROLE_BORNE + "', '" + BORNE + "', NOW()),"
    + " ('" + NUL + "', '" + ROLE_NUL + "', '" + NUL + "', NOW());"
    /* la cloture se fait au nom du compte de la borne : sa caisse doit etre ouverte, comme pour tout operateur */
    + " INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
    + " VALUES ('" + CAISSE + "', '" + BORNE + "', 0, 0, CURDATE(), NOW(), '" + BORNE + "', NOW(), '" + BORNE + "', 'is_Using');"
    /* fiche ancienne : client rapide d'avant la correction, numero dans l'adresse, telephone vide */
    + " INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, str_ADRESSE, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + ANCIEN + "', '" + ANCIEN + "', '" + NOM + "ANCIEN', 'E2E', '05.55.12.34.56', '6', NOW(), NOW(), 'enable')");
}

async function session(b, login, mdp) {
  const p = await (await b.newContext()).newPage();
  await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', login); await p.fill('#str_password', mdp); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 120000 });
  return p;
}
const api = (p, m, u, c) => p.evaluate(async ([m, u, c]) => {
  const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 160) }; } if (j === null || typeof j !== 'object' || Array.isArray(j)) { j = { valeur: j }; } j.http = r.status; return j;
}, [m, u, c]);
const ids = (r) => (r.data || []).map((x) => x.lgCLIENTID);

(async () => {
  nettoyer();
  poser();
  const b = await ENV_E2E.lancer(chromium);
  try {
    ok('Jeu d\'essai : droit P_BORNE_PAIEMENT_MOBILE présent (migration) et donné au rôle de la borne',
      q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + ROLE_BORNE + "' AND p.str_NAME = 'P_BORNE_PAIEMENT_MOBILE'") === '1');
    const admin = await session(b, ENV_E2E.LOGIN, 'e2etest');

    /* ---------------------------------------------------------------- 1 et 2 : client rapide */
    const c1 = await api(admin, 'POST', '../api/v1/client/add/lambda', { strFIRSTNAME: NOM + 'UN', strLASTNAME: 'E2E', strADRESSE: '07 00 00 99 99' });
    const id1 = c1.data && c1.data.lgCLIENTID;
    ok('Client rapide créé sans type', c1.success === true && !!id1, JSON.stringify(c1).slice(0, 200));
    ok('Sans type : client standard (6) en base', !!id1 && q("SELECT IFNULL(lg_TYPE_CLIENT_ID, '-') FROM t_client WHERE lg_CLIENT_ID = '" + id1 + "'") === '6',
      id1 && q("SELECT IFNULL(lg_TYPE_CLIENT_ID, '-') FROM t_client WHERE lg_CLIENT_ID = '" + id1 + "'"));
    ok('Sans type : retrouvé par son nom', ids(await api(admin, 'GET', '../api/v1/client/lambda?query=' + NOM + 'UN')).indexOf(id1) >= 0);
    for (const saisie of ['0700', '07000099', '07 00 00', '0700009999']) {
      ok('Numéro dans l\'adresse : retrouvé par ?query=' + saisie, ids(await api(admin, 'GET', '../api/v1/client/lambda?query=' + encodeURIComponent(saisie))).indexOf(id1) >= 0);
    }
    ok('Fiche ancienne (numéro « 05.55.12.34.56 » dans l\'adresse) : retrouvée par ?query=0555123456 et ?query=05 55',
      ids(await api(admin, 'GET', '../api/v1/client/lambda?query=0555123456')).indexOf(ANCIEN) >= 0
      && ids(await api(admin, 'GET', '../api/v1/client/lambda?query=05%2055')).indexOf(ANCIEN) >= 0);
    ok('Un autre numéro ne la ramène pas', ids(await api(admin, 'GET', '../api/v1/client/lambda?query=0799887766')).indexOf(id1) < 0
      && ids(await api(admin, 'GET', '../api/v1/client/lambda?query=0799887766')).indexOf(ANCIEN) < 0);
    const c2 = await api(admin, 'POST', '../api/v1/client/add/lambda', { strFIRSTNAME: NOM + 'DEUX', strLASTNAME: 'E2E', strADRESSE: 'Cocody Angré', lgTYPECLIENTID: '' });
    ok('Type vide : client standard (6), adresse postale gardée, retrouvé par son nom', c2.success === true
      && q("SELECT CONCAT(lg_TYPE_CLIENT_ID, '|', str_ADRESSE) FROM t_client WHERE lg_CLIENT_ID = '" + (c2.data && c2.data.lgCLIENTID) + "'") === '6|Cocody Angré'
      && ids(await api(admin, 'GET', '../api/v1/client/lambda?query=' + NOM + 'DEUX')).indexOf(c2.data.lgCLIENTID) >= 0,
      q("SELECT CONCAT(IFNULL(lg_TYPE_CLIENT_ID, '-'), '|', IFNULL(str_ADRESSE, '-')) FROM t_client WHERE str_FIRST_NAME = '" + NOM + "DEUX'"));
    const c3 = await api(admin, 'POST', '../api/v1/client/add/lambda', { strFIRSTNAME: NOM + 'TROIS', strLASTNAME: 'E2E', strADRESSE: '0102030405', lgTYPECLIENTID: 'XX' });
    ok('Type inconnu : toujours refusé, rien en base', c3.success === false && q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME = '" + NOM + "TROIS'") === '0', JSON.stringify(c3).slice(0, 160));
    const c4 = await api(admin, 'POST', '../api/v1/client/add/lambda', { strFIRSTNAME: NOM + 'QUATRE', strLASTNAME: 'E2E', strADRESSE: '0102030405', lgTYPECLIENTID: '6' });
    ok('Type 6 donné (comme les applications) : inchangé', c4.success === true && q("SELECT lg_TYPE_CLIENT_ID FROM t_client WHERE lg_CLIENT_ID = '" + (c4.data && c4.data.lgCLIENTID) + "'") === '6');

    /* ---------------------------------------------------------------- 3a : droits */
    const borne = await session(b, 'e2e-d62-borne', MDP);
    const nul = await session(b, 'e2e-d62-nul', MDP);
    const droits = await api(borne, 'GET', '../api/v1/user/droits');
    ok('GET v1/user/droits du compte de la borne : contient P_BORNE_PAIEMENT_MOBILE', (droits.droits || []).indexOf('P_BORNE_PAIEMENT_MOBILE') >= 0, JSON.stringify(droits.droits));
    const droitsNul = await api(nul, 'GET', '../api/v1/user/droits');
    ok('… et pas le compte sans droit', droitsNul.success === true && (droitsNul.droits || []).indexOf('P_BORNE_PAIEMENT_MOBILE') < 0, JSON.stringify(droitsNul.droits));

    const cap = await api(admin, 'GET', '../api/v1/paiements-mobile/capacites');
    const actif = cap.fournisseur === 'simulateur' && (cap.paiementsMobile || []).indexOf('wave') >= 0;
    ok('Simulateur de paiement actif sur ce serveur', actif, JSON.stringify(cap).slice(0, 160));

    /* une prevente comptant rattachee au client cree plus haut (comme la borne : client, puis article) */
    const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
    const prevente = async (qte) => {
      const r = await api(admin, 'POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: PRODUIT, itemPu: Number(PRIX), qte, qteServie: qte,
        devis: false, prevente: true, remiseId: '', venteId: null, userVendeurId: user, clientId: id1 });
      const v = r.data && r.data.lgPREENREGISTREMENTID; if (v) { ventes.push(v); }
      return v;
    };
    const v1 = await prevente(2);
    ok('Prévente comptant posée, client rattaché', !!v1 && q("SELECT CONCAT(str_STATUT, '|', IFNULL(lg_CLIENT_ID, '-')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'") === 'pending|' + id1,
      v1 && q("SELECT CONCAT(str_STATUT, '|', IFNULL(lg_CLIENT_ID, '-')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'"));

    const refus = await api(nul, 'POST', '../api/v1/paiements-mobile', { venteId: v1, operateur: 'WAVE', cloturer: true });
    ok('Compte sans aucun droit : cloturer:true refusé (403 interdit), aucun paiement', refus.http === 403 && refus.interdit === true
      && q("SELECT COUNT(*) FROM paiement_mobile WHERE vente_id = '" + v1 + "'") === '0', JSON.stringify(refus).slice(0, 200));
    const sansCloture = await api(nul, 'POST', '../api/v1/paiements-mobile', { venteId: v1, operateur: 'WAVE', cloturer: false });
    ok('Compte sans aucun droit : cloturer:false accepté (inchangé)', sansCloture.http === 200 && sansCloture.success === true, JSON.stringify(sansCloture).slice(0, 200));
    if (sansCloture.data && sansCloture.data.id) { await api(nul, 'POST', '../api/v1/paiements-mobile/' + sansCloture.data.id + '/annuler'); }

    const pm = await api(borne, 'POST', '../api/v1/paiements-mobile', { venteId: v1, operateur: 'WAVE', cloturer: true });
    const pid = pm.data && pm.data.id;
    ok('Compte de la borne (P_BORNE_PAIEMENT_MOBILE seul) : cloturer:true accepté, clôture automatique demandée', pm.http === 200 && pm.success === true && !!pid
      && q("SELECT cloture_auto FROM paiement_mobile WHERE id = '" + pid + "'") === '1', JSON.stringify(pm).slice(0, 200));

    /* ---------------------------------------------------------------- 3c : paiement, cloture, bilan */
    const avant = Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'"));
    if (pid) {
      await api(borne, 'POST', '../api/v1/paiements-mobile/' + pid + '/simuler?payer=true');
      await api(borne, 'GET', '../api/v1/paiements-mobile/' + pid);
      await api(borne, 'POST', '../api/v1/paiements-mobile/' + pid + '/simuler?payer=true'); // notification en double
    }
    const etat = pid ? q("SELECT CONCAT_WS('|', statut, cloture, IFNULL(message, '-')) FROM paiement_mobile WHERE id = '" + pid + "'") : '';
    ok('Paiement payé, vente clôturée automatiquement', /^paye\|1\|-$/.test(etat), etat);
    const vente = v1 ? q("SELECT CONCAT_WS('|', str_STATUT, IFNULL(lg_CLIENT_ID, '-'), IFNULL(str_FIRST_NAME_CUSTOMER, '-'), IFNULL(lg_USER_CAISSIER_ID, '-'), int_PRICE)"
      + " FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v1 + "'").split('|') : [];
    ok('Vente clôturée par la borne, client de la vente et nom gardés', vente[0] === 'is_Closed' && vente[1] === id1 && vente[2] === NOM + 'UN' && vente[3] === BORNE, vente.join('|'));
    const regl = v1 ? q("SELECT CONCAT((SELECT COUNT(*) FROM vente_reglement WHERE vente_id = '" + v1 + "'), '|', (SELECT IFNULL(GROUP_CONCAT(DISTINCT type_regelement), '-') FROM vente_reglement WHERE vente_id = '" + v1 + "'),"
      + " '|', (SELECT IFNULL(SUM(montant), 0) FROM vente_reglement WHERE vente_id = '" + v1 + "'), '|', (SELECT COUNT(*) FROM mvttransaction WHERE vente_id = '" + v1 + "'))") : '';
    ok('Bilan : un règlement Wave (10) du montant de la vente, un mouvement de caisse', regl === '1|10|' + 2 * Number(PRIX) + '|1', regl + ' (attendu 1|10|' + 2 * Number(PRIX) + '|1)');
    const apres = Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'"));
    ok('Bilan : stock diminué de la quantité (2), une seule fois', avant - apres === 2, avant + ' -> ' + apres);
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées, stock remis', q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME LIKE '" + NOM + "%'") === '0'
      && q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID IN ('" + BORNE + "', '" + NUL + "')") === '0'
      && q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'") === STOCK
      && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + (ventes.join("','") || '-') + "')") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
