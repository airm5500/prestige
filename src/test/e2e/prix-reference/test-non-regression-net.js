/* CAS 2 DU 03/11/2026 : NON-REGRESSION DU NET A PAYER, au franc pres, parametre a 0 puis a 1 sans saisie.
 *
 * Le moteur (SalesNetComputingServiceImpl, TiersPayantCalculationService) n'est pas modifie par le cas 2 ; ce test
 * le prouve sur les ventes de la copie de travail : N ventes assurance closes (un et deux tiers-payants, les plus
 * recentes) sont COPIEES en ventes en cours (identifiants marques), puis net/assurance est demande pour chacune,
 * par le meme appel que l'ecran, avec KEY_PRIX_REF_CAISSE a 0 puis a 1. Les deux series doivent etre identiques
 * (net, part tiers-payant, remise, part de chaque organisme). Pour exercer aussi le chemin des prix de reference,
 * des references d'essai (MIX, PRIX_REFERENCE, TAUX) sont posees sur les produits de quelques copies avant le calcul
 * et les deux series doivent encore coincider. Les copies, references, journal et taux_produit sont retires a la fin.
 * Les ventes closes d'origine ne sont jamais ecrites.
 * Lancement seul : node src/test/e2e/prix-reference/test-non-regression-net.js   (E2E_NB_VENTES : nombre, defaut 40)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync, spawnSync } = require('child_process');
const BASE = ENV_E2E.BASE;
const URL = (process.env.BASE || 'http://localhost:8080/prestige').replace(/\/$/, '');
const MARQUE = 'E2ENRN';
const NB = Number(process.env.E2E_NB_VENTES || 40);
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const sql = (s, args) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ...(args || []), BASE, '-e', s], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const q = (s) => sql(s, ['-sN']).trim();
const lignes = (s) => q(s).split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));
const USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");

function parametre(valeur) { sql("UPDATE t_parameters SET str_VALUE = '" + valeur + "' WHERE str_KEY = 'KEY_PRIX_REF_CAISSE'"); }
const PARAM_AVANT = q("SELECT IFNULL(str_VALUE, '0') FROM t_parameters WHERE str_KEY = 'KEY_PRIX_REF_CAISSE'");

function nettoyer() {
  const script = [
    "DELETE FROM prix_reference_journal WHERE tiers_payant_id IN (SELECT l.lg_TIERS_PAYANT_ID FROM t_compte_client_tiers_payant l JOIN t_preenregistrement_compte_client_tiers_payent t ON t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID WHERE t.lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%') AND produit_id IN (SELECT lg_FAMILLE_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%')",
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

/* copies : N ventes closes, moitie a un tiers-payant, moitie a deux, les plus recentes */
function copier() {
  const choisir = (nbTp, limite) => lignes("SELECT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p WHERE p.lg_TYPE_VENTE_ID = '2' AND p.str_STATUT = 'is_Closed'"
    + " AND p.b_IS_CANCEL = 0 AND p.lg_CLIENT_ID IS NOT NULL AND p.lg_PREENREGISTREMENT_ID NOT LIKE '" + MARQUE + "%'"
    + " AND (SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent t WHERE t.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID) = " + nbTp
    + " AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)"
    + " ORDER BY p.dt_CREATED DESC LIMIT " + limite).map((l) => l[0]);
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
    const tps = lignes("SELECT t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID, IFNULL(t.int_PERCENT, 0), IFNULL(t.str_REF_BON, ''), l.lg_TIERS_PAYANT_ID"
      + " FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
      + " WHERE t.lg_PREENREGISTREMENT_ID = '" + id + "' ORDER BY l.int_PRIORITY");
    copies.push({ id, origine: o, tps: tps.map((t) => ({ compteTp: t[0], taux: Number(t[1]), numBon: t[2] || id, cmu: 'false', tpId: t[3] })),
      remiseId: q("SELECT IFNULL(lg_REMISE_ID, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'") });
  });
  return copies;
}

/* references d'essai sur les produits de 6 copies (2 par type), pour exercer le chemin des prix de reference */
function poserReferences(copies) {
  const types = ['MIX_TAUX_PRIX', 'PRIX_REFERENCE', 'TAUX'];
  let n = 0;
  copies.slice(0, 6).forEach((c, i) => {
    const produits = lignes("SELECT lg_FAMILLE_ID, int_PRICE_UNITAIR FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + c.id + "' LIMIT 2");
    produits.forEach((pr, j) => {
      const type = types[(i + j) % 3];
      c.tps.forEach((t, k) => {
        if (q("SELECT COUNT(*) FROM prix_reference WHERE produit_id = '" + pr[0] + "' AND tiersPayant_id = '" + t.tpId + "'") !== '0') { return; }
        const valeur = Math.max(5, Math.round(Number(pr[1]) * 0.8));
        sql("INSERT INTO prix_reference (id, type_prix, valeur, produit_id, tiersPayant_id, enabled, valeur_taux) VALUES ('" + MARQUE + '-R' + n + "', '" + type + "', "
          + valeur + ", '" + pr[0] + "', '" + t.tpId + "', 1, " + (type === 'PRIX_REFERENCE' ? 'NULL' : 10 + 5 * k) + ")");
        n++;
      });
    });
  });
  return n;
}

(async () => {
  nettoyer();
  const copies = copier();
  ok('Copies de ' + NB + ' ventes assurance closes posées en ventes en cours (un et deux tiers-payants)', copies.length >= Math.min(NB, 10) && copies.every((c) => c.tps.length > 0),
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
      parts: (j.data.tierspayants || []).map((t) => t.compteTp + ':' + t.tpnet + ':' + t.taux).sort().join(';') } : { echec: j.msg }; } return r; };
    const comparer = (a, b) => Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map((k) => k + ' ' + JSON.stringify(a[k]) + ' ≠ ' + JSON.stringify(b[k]));

    parametre('0'); const s0 = await serie();
    const calcules = Object.values(s0).filter((x) => !x.echec).length;
    ok('Paramètre à 0 : net calculé pour les copies (' + calcules + '/' + copies.length + ')', calcules >= copies.length * 0.9, JSON.stringify(Object.values(s0).filter((x) => x.echec).slice(0, 3)));
    parametre('1'); const s1 = await serie();
    const d1 = comparer(s0, s1);
    ok('Paramètre à 1, sans saisie : net, part tiers-payant, remise et part de chaque organisme identiques au franc près', d1.length === 0, d1.slice(0, 3).join(' | '));

    const nbRef = poserReferences(copies);
    parametre('0'); const r0 = await serie();
    parametre('1'); const r1 = await serie();
    const d2 = comparer(r0, r1);
    ok('Avec ' + nbRef + ' prix de référence d\'essai (MIX, PRIX_REFERENCE, TAUX) : séries 0 et 1 identiques', nbRef > 0 && d2.length === 0, d2.slice(0, 3).join(' | '));
    const changes = comparer(s0, r0).length;
    ok('Les références d\'essai ont bien pesé sur le calcul (le chemin des prix de référence est exercé)', changes > 0, changes + ' ventes dont le net a changé');
    ok('Aucune vente d\'origine modifiée (statut clos, non touchée pendant le test)', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + copies.map((c) => c.origine).join("','") + "')"
      + " AND (str_STATUT <> 'is_Closed' OR dt_UPDATED >= NOW() - INTERVAL 10 MINUTE)") === '0');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Copies, références et journal retirés, paramètre remis à ' + PARAM_AVANT, q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%'") === '0'
      && q("SELECT COUNT(*) FROM prix_reference WHERE id LIKE '" + MARQUE + "%'") === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
