/* LOT « BASE DE CALCUL PAR TIERS-PAYANT » (Q2.5 du cas 2 du 03/11/2026) : NON-REGRESSION DU NET A PAYER sur la copie
 * de travail, par SalesNetComputingServiceImpl et le meme appel net/assurance que l'ecran.
 *
 * N ventes assurance closes (un et deux tiers-payants, les plus recentes, comme celles du banc) sont COPIEES en ventes
 * en cours (identifiants marques), puis net/assurance est demande pour chacune :
 *   1. KEY_PRIX_REF_BASE_PAR_TP a 0, sans reference : la serie est FIGEE dans un fichier (E2E_FIGE, premier lancement,
 *      avant la livraison du lot) et comparee a ce fichier aux lancements suivants : identique au franc pres ;
 *   2. des references d'essai DIFFERENTES par tiers-payant (MIX, taux de la vente) sont posees sur les produits des
 *      copies a deux tiers-payants, et une reference sur celles a un tiers-payant : a 0, la serie est encore celle du
 *      fichier fige « avec references » ; a 1, les copies sans reference et celles a un seul tiers-payant sont
 *      identiques a la serie a 0, et les copies a deux tiers-payants suivent la regle attendue (part de chaque
 *      organisme = sa propre reference x quantite x son taux, bornee au reste de la ligne), hors plafonds.
 * Les copies, references, journal et taux_produit sont retires a la fin ; les ventes closes d'origine ne sont jamais
 * ecrites ; le parametre est remis a sa valeur d'avant.
 * Lancement seul : node src/test/e2e/prix-reference/test-base-par-tp-non-regression.js
 *   (E2E_NB_VENTES : nombre, defaut 40 ; E2E_FIGE : fichier des series figees, defaut dans le dossier temporaire ;
 *    E2E_REFIGER=1 : reecrire le fichier)
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ENV_E2E = require('../outils/poste');
const { execFileSync, spawnSync } = require('child_process');
const BASE = ENV_E2E.BASE;
const URL = (process.env.BASE || 'http://localhost:8080/prestige').replace(/\/$/, '');
const MARQUE = 'E2ENRB';
const CLE = 'KEY_PRIX_REF_BASE_PAR_TP';
const NB = Number(process.env.E2E_NB_VENTES || 40);
const FIGE = process.env.E2E_FIGE || path.join(os.tmpdir(), 'prestige-e2e-base-par-tp-fige.json');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const sql = (s, args) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ...(args || []), BASE, '-e', s], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const q = (s) => sql(s, ['-sN']).trim();
const lignes = (s) => q(s).split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));
const USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");

const PARAM_AVANT = q("SELECT IFNULL(MAX(str_VALUE), '__ABSENT__') FROM t_parameters WHERE str_KEY = '" + CLE + "'");
const PARAM_EXISTE = PARAM_AVANT !== '__ABSENT__';
function parametre(valeur) {
  if (PARAM_EXISTE) { sql("UPDATE t_parameters SET str_VALUE = '" + valeur + "' WHERE str_KEY = '" + CLE + "'"); }
}

function nettoyer() {
  const script = [
    "DELETE FROM prix_reference_journal WHERE produit_id IN (SELECT lg_FAMILLE_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%') AND vente_id LIKE '" + MARQUE + "%'",
    "DELETE FROM prix_reference WHERE id LIKE '" + MARQUE + "%'",
    "DELETE FROM taux_produit WHERE sale_iem_id LIKE '" + MARQUE + "%'",
    "DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%'",
    "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%'",
    "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%'",
  ];
  const s = spawnSync('mariadb', [...ENV_E2E.MARIADB, '--force', BASE], { input: script.join(';\n') + ';', encoding: 'utf8' });
  (s.stderr || '').split('\n').filter((l) => /ERROR/.test(l)).forEach((l) => console.log('  (nettoyage) ' + l.slice(0, 200)));
  parametre(PARAM_AVANT);
}

/* copies : N ventes closes, moitie a un tiers-payant, moitie a deux, les plus recentes ; toujours les memes (ordre de
   creation), pour que les series figees restent comparables d'un lancement a l'autre */
function copier() {
  const choisir = (nbTp, limite) => lignes("SELECT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p WHERE p.lg_TYPE_VENTE_ID = '2' AND p.str_STATUT = 'is_Closed'"
    + " AND p.b_IS_CANCEL = 0 AND p.lg_CLIENT_ID IS NOT NULL AND p.lg_PREENREGISTREMENT_ID NOT LIKE 'E2E%'"
    + " AND (SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent t WHERE t.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID) = " + nbTp
    + " AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)"
    + " AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d JOIN prix_reference r ON r.produit_id = d.lg_FAMILLE_ID WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)"
    + " ORDER BY p.dt_CREATED DESC, p.lg_PREENREGISTREMENT_ID LIMIT " + limite).map((l) => l[0]);
  const origines = choisir(1, Math.ceil(NB / 2)).concat(choisir(2, Math.floor(NB / 2)));
  const copies = [];
  origines.forEach((o, i) => {
    const id = MARQUE + '-V' + i;
    sql("CREATE TEMPORARY TABLE tmp_v AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + o + "';"
      + " UPDATE tmp_v SET lg_PREENREGISTREMENT_ID = '" + id + "', str_REF = '" + id + "', str_STATUT = 'is_Progress', lg_REGLEMENT_ID = NULL, lg_PARENT_ID = NULL,"
      + " lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_USER_ID = '" + USER + "', dt_CREATED = NOW(), dt_UPDATED = NOW();"
      + " INSERT INTO t_preenregistrement SELECT * FROM tmp_v; DROP TEMPORARY TABLE tmp_v;"
      + " CREATE TEMPORARY TABLE tmp_d AS SELECT * FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + o + "';"
      + " UPDATE tmp_d SET lg_PREENREGISTREMENT_DETAIL_ID = CONCAT('" + id + "-D', SUBSTRING(MD5(lg_PREENREGISTREMENT_DETAIL_ID), 1, 12)), lg_PREENREGISTREMENT_ID = '" + id + "', str_STATUT = 'is_Progress';"
      + " INSERT INTO t_preenregistrement_detail SELECT * FROM tmp_d; DROP TEMPORARY TABLE tmp_d;"
      + " CREATE TEMPORARY TABLE tmp_t AS SELECT * FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + o + "';"
      + " UPDATE tmp_t SET lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = CONCAT('" + id + "-T', SUBSTRING(MD5(lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID), 1, 12)),"
      + " lg_PREENREGISTREMENT_ID = '" + id + "', str_STATUT = 'is_Progress', str_LAST_TRANSACTION = NULL;"
      + " INSERT INTO t_preenregistrement_compte_client_tiers_payent SELECT * FROM tmp_t; DROP TEMPORARY TABLE tmp_t;");
    const tps = lignes("SELECT t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID, IFNULL(t.int_PERCENT, 0), IFNULL(t.str_REF_BON, ''), l.lg_TIERS_PAYANT_ID, l.int_PRIORITY,"
      + " IFNULL(l.db_PLAFOND_ENCOURS, 0), IFNULL(l.dbl_QUOTA_CONSO_VENTE, 0), IFNULL(tp.dbl_PLAFOND_CREDIT, 0)"
      + " FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
      + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = l.lg_TIERS_PAYANT_ID WHERE t.lg_PREENREGISTREMENT_ID = '" + id + "' ORDER BY l.int_PRIORITY");
    const details = lignes("SELECT lg_FAMILLE_ID, int_PRICE_UNITAIR, int_QUANTITY, int_PRICE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + id + "' ORDER BY lg_PREENREGISTREMENT_DETAIL_ID")
      .map((d) => ({ produit: d[0], pu: Number(d[1]), qte: Number(d[2]), prix: Number(d[3]) }));
    copies.push({ id, origine: o, details,
      tps: tps.map((t) => ({ compteTp: t[0], taux: Number(t[1]), numBon: t[2] || id, cmu: 'false', tpId: t[3], priorite: Number(t[4]),
        plafonds: Number(t[5]) > 0 || Number(t[6]) > 0 || Number(t[7]) > 0 })),
      remiseId: q("SELECT IFNULL(lg_REMISE_ID, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'") });
  });
  return copies;
}

/* references d'essai : MIX au taux de la vente, prix DIFFERENT par tiers-payant (90 % du prix pour le prioritaire,
   70 % pour le complementaire ; 85 % sur les copies a un tiers-payant) ; sur toutes les copies */
function poserReferences(copies) {
  let n = 0;
  const posees = {}; /* produit|tiers-payant -> {valeur, taux} : une reference par couple, partagee par les copies qui l'ont en commun */
  copies.forEach((c) => {
    c.refs = {};
    c.details.forEach((d) => {
      c.tps.forEach((t, k) => {
        const cle = d.produit + '|' + t.tpId;
        if (posees[cle] === undefined) {
          const part = c.tps.length === 1 ? 0.85 : (k === 0 ? 0.9 : 0.7);
          const valeur = Math.max(5, Math.round(d.pu * part));
          sql("INSERT INTO prix_reference (id, type_prix, valeur, produit_id, tiersPayant_id, enabled, valeur_taux) VALUES ('" + MARQUE + '-R' + n + "', 'MIX_TAUX_PRIX', "
            + valeur + ", '" + d.produit + "', '" + t.tpId + "', 1, " + t.taux + ")");
          posees[cle] = { valeur, taux: t.taux };
          n++;
        }
        c.refs[cle] = posees[cle];
      });
    });
  });
  return n;
}

/* parts attendues avec le parametre a 1 (regle du lot), arrondies comme le moteur (somme puis HALF_UP) */
function attendu(c) {
  const parts = {};
  c.tps.forEach((t) => { parts[t.compteTp] = 0; });
  c.details.forEach((d) => {
    let deja = 0;
    c.tps.forEach((t) => {
      const ref = c.refs[d.produit + '|' + t.tpId]; /* la reference porte aussi son taux (MIX) : c'est lui que le moteur applique */
      const base = (ref ? ref.valeur : d.pu) * d.qte;
      const taux = ref ? ref.taux : t.taux;
      const reste = d.prix - deja;
      if (reste <= 0) { return; }
      let part = taux === 100 && !ref ? reste : Math.min(base * taux / 100, reste);
      deja += part;
      parts[t.compteTp] += part;
    });
  });
  return Object.keys(parts).map((k) => k + ':' + Math.round(parts[k])).sort().join(';');
}

(async () => {
  nettoyer();
  const copies = copier();
  ok('Copies de ' + NB + ' ventes assurance closes posées en ventes en cours (un et deux tiers-payants, sans référence)', copies.length >= Math.min(NB, 10) && copies.every((c) => c.tps.length > 0),
    copies.length + ' copies, ' + copies.filter((c) => c.tps.length === 2).length + ' à deux tiers-payants');
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext()).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  try {
    await p.goto(URL + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 240000 });
    const net = (c) => p.evaluate(async (corps) => { const r = await fetch('../api/v1/vente/net/assurance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
      return r.json(); }, { venteId: c.id, remiseId: c.remiseId || null, tierspayants: c.tps.map((t) => ({ compteTp: t.compteTp, taux: t.taux, numBon: t.numBon, cmu: t.cmu })) });
    const serie = async () => { const r = {}; for (const c of copies) { const j = await net(c); r[c.id] = j.success ? { net: j.data.montantNet, tp: j.data.montantTp, remise: j.data.remise, montant: j.data.montant,
      parts: (j.data.tierspayants || []).map((t) => t.compteTp + ':' + t.tpnet + ':' + t.taux).sort().join(';'), plafond: !!j.data.message } : { echec: j.msg }; } return r; };
    const comparer = (a, b, filtre) => Object.keys(a).filter((k) => !filtre || filtre(k)).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map((k) => k + ' ' + JSON.stringify(a[k]) + ' ≠ ' + JSON.stringify(b[k]));
    const cle = (k) => copies.find((c) => c.id === k).origine;
    const parCle = (s) => { const r = {}; Object.keys(s).forEach((k) => { r[cle(k)] = s[k]; }); return r; };

    /* 1. parametre a 0, sans reference : serie figee */
    parametre('0'); const s0 = await serie();
    const calcules = Object.values(s0).filter((x) => !x.echec).length;
    ok('Paramètre à 0 (ou absent), sans référence : net calculé pour les copies (' + calcules + '/' + copies.length + ')', calcules >= copies.length * 0.9, JSON.stringify(Object.values(s0).filter((x) => x.echec).slice(0, 3)));
    const nbRef = poserReferences(copies);
    const r0 = await serie();
    ok('Références d\'essai posées, différentes par tiers-payant (' + nbRef + ') : elles pèsent sur le calcul', nbRef > 0 && comparer(s0, r0).length > 0, comparer(s0, r0).length + ' ventes dont le net a changé');
    const fige = { sansReference: parCle(s0), avecReferences: parCle(r0) };
    if (fs.existsSync(FIGE) && process.env.E2E_REFIGER !== '1') {
      const avant = JSON.parse(fs.readFileSync(FIGE, 'utf8'));
      const dA = comparer(avant.sansReference, fige.sansReference), dB = comparer(avant.avecReferences, fige.avecReferences);
      const communes = Object.keys(avant.sansReference).filter((k) => fige.sansReference[k]).length;
      ok('Série à 0 sans référence identique au franc près à la série figée (' + communes + ' ventes communes, ' + FIGE + ')', communes >= Math.min(copies.length, 10) && dA.length === 0, dA.slice(0, 3).join(' | '));
      ok('Série à 0 avec références identique au franc près à la série figée (règle du minimum inchangée)', dB.length === 0, dB.slice(0, 3).join(' | '));
    } else {
      fs.writeFileSync(FIGE, JSON.stringify(fige, null, 1));
      ok('Séries à 0 figées dans ' + FIGE + ' (à comparer après la livraison du lot)', fs.existsSync(FIGE));
    }

    /* 2. parametre a 1 */
    if (PARAM_EXISTE) {
      parametre('1'); const r1 = await serie();
      const unTp = (k) => copies.find((c) => c.id === k).tps.length === 1;
      const d1 = comparer(r0, r1, unTp);
      ok('Paramètre à 1, copies à un tiers-payant : identiques à la série à 0 (net, parts, remise)', d1.length === 0, d1.slice(0, 3).join(' | '));
      const deuxTp = copies.filter((c) => c.tps.length === 2 && !r1[c.id].echec);
      const sansPlafond = deuxTp.filter((c) => !r1[c.id].plafond && !r0[c.id].plafond && !c.tps.some((t) => t.plafonds));
      const ecarts = sansPlafond.filter((c) => r1[c.id].parts.split(';').map((x) => x.split(':').slice(0, 2).join(':')).sort().join(';') !== attendu(c))
        .map((c) => c.id + ' ' + r1[c.id].parts + ' ≠ ' + attendu(c));
      ok('Paramètre à 1, copies à deux tiers-payants sans plafond (' + sansPlafond.length + ') : part de chaque organisme = sa propre référence × quantité × son taux, bornée au reste de la ligne',
        sansPlafond.length > 0 && ecarts.length === 0, ecarts.slice(0, 3).join(' | '));
      const changees = deuxTp.filter((c) => r0[c.id].parts !== r1[c.id].parts).length;
      ok('Les copies à deux tiers-payants avec deux références différentes changent bien de parts à 1', changees > 0, changees + '/' + deuxTp.length);
      const clientOk = deuxTp.every((c) => r1[c.id].net >= 0 && r1[c.id].tp <= r1[c.id].montant);
      ok('Part client jamais négative, parts jamais au-delà du montant de la vente', clientOk);
      parametre('0'); const r0bis = await serie();
      const dRetour = comparer(r0, r0bis);
      ok('Retour à 0 : série de nouveau identique à la série à 0', dRetour.length === 0, dRetour.slice(0, 3).join(' | '));
    } else {
      ok('Paramètre ' + CLE + ' absent de la base (lot non déployé) : seule la série figée est produite', true);
    }
    ok('Aucune vente d\'origine modifiée (statut clos, non touchée pendant le test)', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + copies.map((c) => c.origine).join("','") + "')"
      + " AND (str_STATUT <> 'is_Closed' OR dt_UPDATED >= NOW() - INTERVAL 10 MINUTE)") === '0');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Copies, références et journal retirés, paramètre remis à ' + PARAM_AVANT, q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%'") === '0'
      && q("SELECT COUNT(*) FROM prix_reference WHERE id LIKE '" + MARQUE + "%'") === '0'
      && q("SELECT IFNULL(MAX(str_VALUE), '__ABSENT__') FROM t_parameters WHERE str_KEY = '" + CLE + "'") === PARAM_AVANT);
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
