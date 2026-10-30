/* POSOS : HISTORIQUE DES ANALYSES ET ROUTE UNITAIRE D'INTERACTION (demandes serveur des applications mobiles, point 35).
 *
 * Mode demonstration active sur le BANC le temps du test (posos.properties remis en etat), produits de la
 * demonstration crees s'ils manquent. Ce que le test etablit :
 *  - POST posos/interaction (deux produits du catalogue, par identifiant ou CIP) : Sintrom + Brufen ->
 *    « Association déconseillée » ; produit inconnu : 400 ;
 *  - chaque analyse (ecran et route unitaire) laisse une ligne d'historique : source, nombre de produits et d'alertes,
 *    gravite la plus haute, mode ; AUCUN nom de produit n'y est garde ;
 *  - GET posos/historique : la liste, le total d'alertes ; sans le droit Posos : 403 ;
 * Les lignes d'historique du test sont retirees.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const CONF = process.env.POSOS_CONF || ENV_E2E.CONFIG_POSTE + '/posos.properties';
const produits = require('../support/produits-essai')(q, exec, 'E2E-PSH-');
const droits = ['P_SM_POSOS', 'P_ORDONNANCE_CLIENT'].map((x) => require('../support/privilege-essai')(q, exec, ENV_E2E.LOGIN, x));
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const nettoyer = () => exec(`DELETE FROM t_posos_analyse WHERE lg_USER_ID = '${ADMIN}' AND created_at >= '${DEBUT}'`);

(async () => {
  droits.forEach((d) => d.remettre());
  produits.assurer(['SINTROM 4MG CPR SEC B/30', 'BRUFEN 400MG CPR DRG B/30']);
  const SINTROM = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_NAME = 'SINTROM 4MG CPR SEC B/30' AND str_STATUT = 'enable' LIMIT 1");
  const BRUFEN_CIP = q("SELECT int_CIP FROM t_famille WHERE str_NAME = 'BRUFEN 400MG CPR DRG B/30' AND str_STATUT = 'enable' LIMIT 1");
  const avant = fs.existsSync(CONF) ? fs.readFileSync(CONF) : null;
  const b = await ENV_E2E.lancer(chromium);
  let p;
  const connecter = async () => {
    p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
  };
  const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 120) }; } j.http = r.status; return j; }, [m, u, c]);
  try {
    fs.writeFileSync(CONF, (avant ? avant.toString() : '') + '\nPOSOS_MODE=demonstration\n');
    await connecter();
    const it = await api('POST', '../api/v1/posos/interaction', { produitA: SINTROM, produitB: BRUFEN_CIP });
    const premiere = (it.alertes || [])[0] || {};
    ok('Interaction Sintrom + Brufen (identifiant et CIP) : « Association déconseillée »', it.http === 200 && premiere.gravite === 'Association déconseillée', JSON.stringify(premiere).slice(0, 200));
    const inconnu = await api('POST', '../api/v1/posos/interaction', { produitA: SINTROM, produitB: 'ZZZ-INCONNU' });
    ok('Produit inconnu : 400', inconnu.http === 400 && inconnu.code === 'PRODUIT_INCONNU', JSON.stringify(inconnu));
    const libre = await api('POST', '../api/v1/posos/analyse', { produits: [{ nom: 'SINTROM 4MG CPR SEC B/30' }, { nom: 'BRUFEN 400MG CPR DRG B/30' }] });
    ok('Analyse de l\'écran (saisie libre) : inchangée', libre.http === 200 && (libre.alertes || []).length > 0, (libre.alertes || []).length);

    const h = await api('GET', '../api/v1/posos/historique');
    const miennes = (h.data || []).filter((x) => x.utilisateurId === ADMIN && x.le >= DEBUT.replace(' ', 'T'));
    const u = miennes.find((x) => x.source === 'UNITAIRE') || {}, l = miennes.find((x) => x.source === 'LIBRE') || {};
    ok('Historique : route unitaire et écran tracés (source, produits, alertes, gravité, mode)', miennes.length === 2 && u.nbProduits === 2 && u.nbAlertes >= 1
      && u.graviteMax === 'Association déconseillée' && u.mode === 'DEMONSTRATION' && l.nbProduits === 2 && l.nbAlertes >= 1, JSON.stringify(miennes));
    ok('Historique : total des alertes rendu', h.alertes >= u.nbAlertes + l.nbAlertes, JSON.stringify(h).slice(0, 250));
    const noms = q(`SELECT COUNT(*) FROM t_posos_analyse WHERE created_at >= '${DEBUT}' AND CONCAT_WS('|', reference, gravite_max, source) REGEXP 'SINTROM|BRUFEN'`);
    ok('Aucun nom de produit gardé dans l\'historique', noms === '0', noms);
    ok('Aucune analyse non tracée (une ligne par analyse, l\'inconnu refusé avant)', q(`SELECT COUNT(*) FROM t_posos_analyse WHERE lg_USER_ID = '${ADMIN}' AND created_at >= '${DEBUT}'`) === '2');

    droits.forEach((d) => d.retirer());
    await p.context().close(); await connecter();
    const refusH = await api('GET', '../api/v1/posos/historique');
    const refusI = await api('POST', '../api/v1/posos/interaction', { produitA: SINTROM, produitB: BRUFEN_CIP });
    ok('Sans le droit Posos : historique et interaction refusés (403)', refusH.http === 403 && refusI.http === 403, refusH.http + ' / ' + refusI.http);
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    droits.forEach((d) => d.remettre());
    if (avant !== null) { fs.writeFileSync(CONF, avant); } else if (fs.existsSync(CONF)) { fs.unlinkSync(CONF); }
    await b.close();
    nettoyer();
    produits.retirer();
    ok('Remise en état (configuration, historique du test, produits)', !/^POSOS_MODE=/m.test(fs.existsSync(CONF) ? fs.readFileSync(CONF).toString() : '')
      && q(`SELECT COUNT(*) FROM t_posos_analyse WHERE lg_USER_ID = '${ADMIN}' AND created_at >= '${DEBUT}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
