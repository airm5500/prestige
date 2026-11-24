/* RESERVE : DROIT « VOIR LA LISTE RESERVE » (plan du 21/11, point 13, question 9 ; P_RESERVE_LISTE), ECRAN ET ROUTES.
 *
 * Profils d'essai (roles et utilisateurs crees par le test, retires a la fin) :
 *  - SANS : menu « Gestion des reserves » et droit de traiter la reserve, SANS P_RESERVE_LISTE ;
 *  - AVEC : les memes droits, PLUS P_RESERVE_LISTE ;
 *  - le compte de test habituel (administrateur), pour le rapprochement.
 * Ce que le test etablit :
 *  - migration V7.6.41.2191 : le droit existe, et chaque role qui a le menu « Gestion des reserves » l'a recu
 *    (personne ne perd l'onglet) ;
 *  - ecran, par le vrai menu : SANS n'a pas l'onglet LISTE RESERVE (les autres onglets restent), AVEC l'a et la liste
 *    se charge ;
 *  - SANS, sur chaque route de l'onglet (liste, tout, Excel, PDF, import, Excel de l'import, enregistrement) : 403
 *    « Droit manquant : Voir la liste réserve », et rien n'est ecrit (bilan avant / apres) ;
 *  - AVEC : les lectures repondent 200 et rendent le meme nombre de produits que la grille de l'ecran ;
 *  - rapprochement : voirListe de GET v1/reserve/droits = presence du droit en base, pour les trois profils ;
 *  - droit desactive en base le temps d'un bloc : comportement d'avant (onglet et routes pour SANS) ;
 *  - sans session : jamais 403.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const URL = process.env.BASE || 'http://localhost:8080/prestige';
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '--raw', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r\n/g, '\n').trim();
const PROFILS = {
  sans: { id: 'E2E-RVL-SANS', login: 'e2e-rvl-sans', droits: ['P_M_GESTION_STOCK', 'P_SM_RESERVE', 'P_TRAITER_RESERVE', 'P_RESERVE_SUGGESTION'] },
  avec: { id: 'E2E-RVL-AVEC', login: 'e2e-rvl-avec', droits: ['P_M_GESTION_STOCK', 'P_SM_RESERVE', 'P_TRAITER_RESERVE', 'P_RESERVE_SUGGESTION', 'P_RESERVE_LISTE'] }
};
const MDP = 'E2e-Rvl-2111';
const LIBELLE = 'Droit manquant : Voir la liste réserve';
let droitDesactive = false;
function remettreDroit() { if (droitDesactive) { q("UPDATE t_privilege SET str_STATUT = 'enable' WHERE str_NAME = 'P_RESERVE_LISTE'"); droitDesactive = false; } }

function nettoyer() {
  const ids = Object.values(PROFILS).map((p) => "'" + p.id + "'").join(',');
  q('DELETE FROM t_role_privelege WHERE lg_ROLE_ID IN (' + ids + '); DELETE FROM t_role_user WHERE lg_USER_ID IN (' + ids + ');'
    + ' DELETE FROM t_role WHERE lg_ROLE_ID IN (' + ids + '); DELETE FROM t_event_log WHERE lg_USER_ID IN (' + ids + ');'
    + ' DELETE FROM t_employe WHERE lg_USER_ID IN (' + ids + '); DELETE FROM t_user WHERE lg_USER_ID IN (' + ids + ');');
}
function creerProfil(p) {
  q("INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + p.id + "', '" + p.id + "', '" + p.id + "', 'CUSTOMER', 'enable', NOW())");
  p.droits.forEach((d, i) => q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED)"
    + " SELECT '" + p.id + '-' + i + "', '" + p.id + "', lg_PRIVELEGE_ID, NOW() FROM t_privilege WHERE str_NAME = '" + d + "' ORDER BY str_STATUT = 'enable' DESC LIMIT 1"));
  q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
    + " VALUES ('" + p.id + "', '" + p.login + "', MD5('" + MDP + "'), 'E2E', '" + p.id + "', 'Magasinier', 'enable', '1', NOW(), 0)");
  q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + p.id + "', '" + p.id + "', '" + p.id + "', NOW())");
}
const droitEnBase = (login) => q("SELECT COUNT(*) FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID"
  + " JOIN t_role_privelege rp ON rp.lg_ROLE_ID = ru.lg_ROLE_ID JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
  + " WHERE u.str_LOGIN = '" + login + "' AND p.str_NAME = 'P_RESERVE_LISTE' AND p.str_STATUT = 'enable'") !== '0';
/* traces que l'onglet peut ecrire : reglages de reserve et mouvements */
const bilan = () => q("SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_type_stock_famille), (SELECT IFNULL(SUM(int_NUMBER), 0) FROM t_type_stock_famille),"
  + " (SELECT COUNT(*) FROM t_mouvement_reserve), (SELECT COUNT(*) FROM t_suggestion_reserve))");

(async () => {
  nettoyer();
  ok('Migration V7.6.41.2191 : le droit P_RESERVE_LISTE existe et est actif', q("SELECT COUNT(*) FROM t_privilege WHERE str_NAME = 'P_RESERVE_LISTE' AND str_STATUT = 'enable'") === '1');
  const perdus = q("SELECT COUNT(DISTINCT rp.lg_ROLE_ID) FROM t_role_privelege rp JOIN t_privilege m ON m.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID AND m.str_NAME = 'P_SM_RESERVE'"
    + " WHERE rp.lg_ROLE_ID NOT LIKE 'E2E-%' AND NOT EXISTS (SELECT 1 FROM t_role_privelege x JOIN t_privilege c ON c.lg_PRIVELEGE_ID = x.lg_PRIVILEGE_ID AND c.str_NAME = 'P_RESERVE_LISTE'"
    + " WHERE x.lg_ROLE_ID = rp.lg_ROLE_ID)");
  ok('Migration : chaque rôle qui a le menu « Gestion des réserves » a reçu le droit (personne ne perd l\'onglet)', perdus === '0', perdus + ' rôle(s) sans le droit');
  Object.values(PROFILS).forEach(creerProfil);

  const b = await ENV_E2E.lancer(chromium);
  const ecran = async (login, mdp) => {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    const erreurs = [];
    p.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p, login, mdp);
    const libelles = await p.evaluate(() => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => {
      if (n.get('id') === 'reservemanager') { r = [n.parentNode.get('text'), n.get('text')]; return false; } }); return r; });
    const texte = (h) => String(h).replace(/<[^>]*>/g, '').trim();
    await ouvrirMenu(p, texte(libelles[0]), texte(libelles[1]));
    await p.waitForFunction(() => { const m = Ext.getCmp('reservemanagerID'); return m && m.rendered && window.PrestigeDroitsReserve.voirSuggestions() !== null; }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const onglets = await p.evaluate(() => Ext.getCmp('reservemanagerID').items.items.map((t) => String(t.baseTitle || t.title).replace(/<[^>]*>/g, '')));
    return { p, onglets, erreurs };
  };
  const appel = (p, m, u, c, type) => p.evaluate(async ([m, u, c, type]) => {
    const h = { 'Content-Type': type || 'application/json' };
    const r = await fetch(u, { method: m, headers: h, body: c === undefined ? undefined : (type ? c : JSON.stringify(c)) });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 80) }; }
    if (Array.isArray(j)) { j = { tableau: j }; }
    j.http = r.status; return j;
  }, [m, u, c, type]);
  const R = '../api/v1/reserve/';
  const routes = [['GET', R + 'liste?limit=20'], ['GET', R + 'liste/tout'], ['GET', R + 'liste/excel'], ['GET', R + 'liste/pdf'],
    ['POST', R + 'liste/enregistrer', { lignes: [] }], ['POST', R + 'liste/import', 'CIP\n0000000\n', 'text/csv'], ['POST', R + 'liste/import/excel', { inconnus: [] }]];
  const refuse = (r) => r.http === 403 && r.interdit === true && r.msg === LIBELLE;
  try {
    /* ---- SANS : pas d'onglet, routes refusees, rien d'ecrit */
    const sans = await ecran(PROFILS.sans.login, MDP);
    ok('SANS, écran : pas d\'onglet LISTE RÉSERVE, les autres onglets gardés', !sans.onglets.includes('LISTE RÉSERVE') && sans.onglets.includes('TOUT') && sans.onglets.includes('SUGGESTIONS') && sans.onglets.includes('HISTORIQUE'), sans.onglets.join(', '));
    const avant = bilan();
    for (const a of routes) {
      const r = await appel(sans.p, a[0], a[1], a[2], a[3]);
      ok('SANS : ' + a[0] + ' ' + a[1].replace(R, '').replace(/\?.*$/, '') + ' : 403 « ' + LIBELLE + ' »', refuse(r), r.http + ' ' + (r.msg || r.brut || ''));
    }
    ok('SANS : bilan avant / après identique (réglages de réserve, mouvements, suggestions)', bilan() === avant, avant + ' => ' + bilan());
    const drSans = await appel(sans.p, 'GET', R + 'droits');
    ok('SANS : reserve/droits → voirListe false, voirSuggestions et traiter gardés', drSans.voirListe === false && drSans.voirSuggestions === true && drSans.traiter === true, JSON.stringify(drSans));
    ok('SANS : aucune erreur JavaScript', sans.erreurs.length === 0, sans.erreurs.join(' | '));
    await sans.p.context().close();

    /* ---- AVEC : onglet, liste chargee, memes produits a l'ecran et par la route */
    const avec = await ecran(PROFILS.avec.login, MDP);
    ok('AVEC, écran : onglet LISTE RÉSERVE présent', avec.onglets.includes('LISTE RÉSERVE'), avec.onglets.join(', '));
    await avec.p.locator('.x-tab').filter({ visible: true, hasText: 'LISTE RÉSERVE' }).first().click();
    await avec.p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').getActiveTab(); return g.itemId === 'ongletListe' && g.getStore && !g.getStore().isLoading() && g.getStore().getTotalCount() > 0; }, null, { timeout: 60000 });
    const totalEcran = await avec.p.evaluate(() => Ext.getCmp('reservemanagerID').getActiveTab().getStore().getTotalCount());
    const liste = await appel(avec.p, 'GET', R + 'liste?limit=20');
    const tout = await appel(avec.p, 'GET', R + 'liste/tout');
    ok('AVEC : liste et liste/tout répondent 200', liste.http === 200 && !liste.interdit && tout.http === 200 && !tout.interdit, liste.http + ' / ' + tout.http);
    const totalRoute = Number(liste.total != null ? liste.total : (liste.totalCount != null ? liste.totalCount : -1));
    ok('Rapprochement : même nombre de produits sur la grille de l\'écran et par la route', totalEcran === totalRoute, totalEcran + ' / ' + totalRoute);
    for (const a of routes.slice(2)) {
      const r = await appel(avec.p, a[0], a[1], a[2], a[3]);
      ok('AVEC : ' + a[0] + ' ' + a[1].replace(R, '') + ' : non refusé par ce droit', !refuse(r) && r.http !== 401, r.http + ' ' + (r.msg || ''));
    }
    const drAvec = await appel(avec.p, 'GET', R + 'droits');
    ok('AVEC : reserve/droits → voirListe true', drAvec.voirListe === true, JSON.stringify(drAvec));
    ok('AVEC : aucune erreur JavaScript', avec.erreurs.length === 0, avec.erreurs.join(' | '));
    await avec.p.context().close();

    /* ---- rapprochement : voirListe = droit en base */
    const adm = await ecran(ENV_E2E.LOGIN, 'e2etest');
    const drAdm = await appel(adm.p, 'GET', R + 'droits');
    ok('Administrateur : onglet LISTE RÉSERVE présent', adm.onglets.includes('LISTE RÉSERVE'), adm.onglets.join(', '));
    await adm.p.context().close();
    const cas = [[PROFILS.sans.login, drSans], [PROFILS.avec.login, drAvec], [ENV_E2E.LOGIN, drAdm]];
    ok('Rapprochement : voirListe = présence de P_RESERVE_LISTE en base, pour les trois profils',
      cas.every(([l, d]) => typeof d.voirListe === 'boolean' && d.voirListe === droitEnBase(l)), cas.map(([l, d]) => l + ' : base ' + droitEnBase(l) + ', droits ' + d.voirListe).join(' ; '));

    /* ---- droit desactive : comportement d'avant */
    q("UPDATE t_privilege SET str_STATUT = 'disable' WHERE str_NAME = 'P_RESERVE_LISTE'");
    droitDesactive = true;
    const sans2 = await ecran(PROFILS.sans.login, MDP);
    const l2 = await appel(sans2.p, 'GET', R + 'liste?limit=20');
    ok('Droit désactivé en base, SANS : onglet LISTE RÉSERVE et liste comme avant', sans2.onglets.includes('LISTE RÉSERVE') && l2.http === 200 && !l2.interdit, sans2.onglets.join(', ') + ' / ' + l2.http);
    await sans2.p.context().close();
    remettreDroit();

    /* ---- sans session : jamais 403 */
    const anonyme = await (await b.newContext()).newPage();
    await anonyme.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    const anon = [];
    for (const a of routes) { const r = await appel(anonyme, a[0], a[1], a[2], a[3]); anon.push(r.http + (r.interdit ? ' interdit' : '')); }
    ok('Sans session : aucune route de l\'onglet ne répond 403', anon.every((x) => !/403|interdit/.test(x)), anon.join(', '));
    await anonyme.context().close();
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    remettreDroit();
    nettoyer();
    ok('Jeu d\'essai retiré (profils, rôles), droit actif', q("SELECT (SELECT COUNT(*) FROM t_user WHERE lg_USER_ID LIKE 'E2E-RVL-%') + (SELECT COUNT(*) FROM t_role WHERE lg_ROLE_ID LIKE 'E2E-RVL-%')"
      + " + (SELECT COUNT(*) FROM t_privilege WHERE str_NAME = 'P_RESERVE_LISTE' AND str_STATUT <> 'enable')") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
