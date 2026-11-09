/* RESERVE : DROIT « VOIR LES SUGGESTIONS DE RESERVE » (demande 60, P_RESERVE_SUGGESTION), ROUTE PAR ROUTE.
 *
 * Profils d'essai (roles et utilisateurs crees par le test, retires a la fin) :
 *  - SANS  : menu « Gestion des reserves » et droit de traiter la reserve, SANS P_RESERVE_SUGGESTION ;
 *  - AVEC  : les memes droits, PLUS P_RESERVE_SUGGESTION ;
 *  - VOIR  : P_RESERVE_SUGGESTION seul (ni le menu ni le droit de traiter) ;
 *  - le compte de test habituel (administrateur), pour le rapprochement.
 * Ce que le test etablit :
 *  - SANS cree une suggestion (creer, creer-depuis-recherche) : permis (decision du pharmacien du 08/11), reponse
 *    {lg_SUGGESTION_RESERVE_ID, str_REF} ; motifs : 200 ;
 *  - SANS, sur chaque lecture et chaque action sur une suggestion existante : 403 {interdit, « Droit manquant : Voir
 *    les suggestions de réserve »}, jamais 401, et rien ne change (bilan avant / apres de la suggestion et des
 *    mouvements de reserve) ;
 *  - AVEC : les lectures repondent 200 (le detail rend la suggestion creee par SANS) ; les actions ne sont pas refusees
 *    par le droit (identifiant inconnu : aucun effet) ;
 *  - VOIR : les lectures repondent 200, les actions restent refusees par « Traiter la réserve » ;
 *  - cloche (notifications-centre catalogue et compteurs) et tableau de bord (alertes, liste « rayon ») : la categorie
 *    et les compteurs des suggestions de reserve absents pour SANS, presents pour AVEC ;
 *  - rapprochement : voirSuggestions de GET v1/reserve/droits = presence du droit en base, pour chaque profil ;
 *  - sans session : les lectures gardent leur reponse d'avant (200 « deconnecte »).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const URL = process.env.BASE || 'http://localhost:8080/prestige';
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '--raw', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r\n/g, '\n').trim();
const COMMENTAIRE = 'E2E-RVS';
const PROFILS = {
  sans: { id: 'E2E-RVS-SANS', login: 'e2e-rvs-sans', droits: ['P_M_GESTION_STOCK', 'P_SM_RESERVE', 'P_TRAITER_RESERVE'] },
  avec: { id: 'E2E-RVS-AVEC', login: 'e2e-rvs-avec', droits: ['P_M_GESTION_STOCK', 'P_SM_RESERVE', 'P_TRAITER_RESERVE', 'P_RESERVE_SUGGESTION'] },
  voir: { id: 'E2E-RVS-VOIR', login: 'e2e-rvs-voir', droits: ['P_RESERVE_SUGGESTION'] }
};
const MDP = 'E2e-Rvs-60';
const LIBELLE = 'Droit manquant : Voir les suggestions de réserve';

function nettoyer() {
  const ids = Object.values(PROFILS).map((p) => "'" + p.id + "'").join(',');
  q("DELETE d FROM t_suggestion_reserve_detail d JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID WHERE (s.str_COMMENTAIRE = '" + COMMENTAIRE + "' OR s.lg_USER_CREATEUR_ID IN (" + ids + "));"
    + " DELETE FROM t_suggestion_reserve WHERE (str_COMMENTAIRE = '" + COMMENTAIRE + "' OR lg_USER_CREATEUR_ID IN (" + ids + ")); DELETE FROM mobile_client_ref WHERE ref LIKE 'E2E-RVS-%';"
    /* inventaire qu'un profil aurait cree par {id}/inventaire (ancien code, sans controle du droit) */
    + ' CREATE TEMPORARY TABLE e2e_rvs_inv AS SELECT lg_INVENTAIRE_ID id FROM t_inventaire WHERE lg_USER_ID IN (' + ids + ');'
    + ' DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN (SELECT id FROM e2e_rvs_inv); DELETE FROM t_inventaire_versement WHERE lg_INVENTAIRE_ID IN (SELECT id FROM e2e_rvs_inv);'
    + ' DELETE FROM rattrapage_cloture_inventaire WHERE lg_INVENTAIRE_ID IN (SELECT id FROM e2e_rvs_inv); DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID IN (SELECT id FROM e2e_rvs_inv);'
    + ' DROP TEMPORARY TABLE e2e_rvs_inv;'
    + ' DELETE FROM t_role_privelege WHERE lg_ROLE_ID IN (' + ids + '); DELETE FROM t_role_user WHERE lg_USER_ID IN (' + ids + ');'
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

/* le droit en base, tel que la session le lira : role de l'utilisateur -> privilege */
const droitEnBase = (login) => q("SELECT COUNT(*) FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID"
  + " JOIN t_role_privelege rp ON rp.lg_ROLE_ID = ru.lg_ROLE_ID JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
  + " WHERE u.str_LOGIN = '" + login + "' AND p.str_NAME = 'P_RESERVE_SUGGESTION'") !== '0';

(async () => {
  nettoyer();
  const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
  ok('Le droit P_RESERVE_SUGGESTION existe en base (migration V7.2.70)', q("SELECT COUNT(*) FROM t_privilege WHERE str_NAME = 'P_RESERVE_SUGGESTION'") === '1');
  Object.values(PROFILS).forEach(creerProfil);
  /* deux produits suivis en reserve, differents, pour deux lignes de quantites differentes */
  const PS = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '2'"
    + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 2 ORDER BY f.lg_FAMILLE_ID LIMIT 2").split('\n');
  const CIP = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + PS[0] + "'");
  const MOTIF = Number(q('SELECT id FROM motif_suggestion_reserve ORDER BY id LIMIT 1'));
  ok('Jeu d\'essai : deux produits suivis en réserve', PS.length === 2 && PS.every((x) => x), PS.join(' / '));

  const b = await ENV_E2E.lancer(chromium);
  const session = async (login, mdp) => {
    const p = await (await b.newContext()).newPage();
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', login); await p.fill('#str_password', mdp); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    return p;
  };
  const appel = (p, m, u, c, ref) => p.evaluate(async ([m, u, c, ref]) => {
    const h = { 'Content-Type': 'application/json' }; if (ref) { h['X-Client-Ref'] = ref; }
    const r = await fetch(u, { method: m, headers: h, body: c === undefined ? undefined : JSON.stringify(c) });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 80) }; }
    if (Array.isArray(j)) { j = { tableau: j }; }
    j.http = r.status; return j;
  }, [m, u, c, ref]);
  const S = '../api/v1/suggestion-reserve/';
  /* toutes les routes soumises au droit, sur une suggestion et une ligne donnees */
  const lectures = (id, ref) => [['GET', S + 'liste'], ['GET', S + 'en-attente'], ['GET', S + 'en-attente/count'], ['GET', S + 'produits?ids=' + ref],
    ['GET', S + id], ['GET', S + id + '/compte-rendu']];
  const actions = (id, ligne) => [['PUT', S + 'ligne/' + ligne + '/quantite', { quantite: 1 }], ['POST', S + id + '/lignes', { produitId: PS[1], quantite: 4 }],
    ['DELETE', S + 'ligne/' + ligne + '?motif=E2E'], ['DELETE', S + id + '?motif=E2E'], ['PUT', S + id + '/traiter'], ['PUT', S + id + '/reessayer'],
    ['PUT', S + id + '/ouvrir'], ['PUT', S + id + '/liberer'], ['PUT', S + id + '/controler', { observation: 'E2E' }], ['POST', S + id + '/inventaire'],
    ['PUT', S + 'ligne/' + ligne + '/annuler', { motif: 'E2E' }], ['PUT', S + id + '/annuler', { motif: 'E2E' }]];
  const bilan = (id) => q("SELECT CONCAT_WS('|', s.str_STATUT, IFNULL(s.lg_USER_VERROU_ID, '-'), (SELECT COUNT(*) FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID),"
    + " (SELECT GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, ':', IFNULL(d.int_QTE_RETENUE, '-'), ':', IFNULL(d.str_ETAT, '-'), ':', IFNULL(d.int_QTE_DEPLACEE, '-')) ORDER BY d.lg_FAMILLE_ID) FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID),"
    + " (SELECT COUNT(*) FROM t_suggestion_reserve WHERE str_COMMENTAIRE = '" + COMMENTAIRE + "'), (SELECT COUNT(*) FROM t_mouvement_reserve WHERE dt_CREATED >= '" + DEBUT + "'),"
    + " (SELECT COUNT(*) FROM t_inventaire WHERE dt_CREATED >= '" + DEBUT + "')) FROM t_suggestion_reserve s WHERE s.lg_SUGGESTION_RESERVE_ID = '" + id + "'");
  const refuse = (r) => r.http === 403 && r.interdit === true && r.msg === LIBELLE;
  try {
    /* ---- SANS : creation permise, tout le reste refuse sans rien changer */
    const sans = await session(PROFILS.sans.login, MDP);
    const motifs = await appel(sans, 'GET', S + 'motifs?categorie=RAYON');
    ok('SANS : motifs répondent 200', motifs.http === 200 && !motifs.interdit, JSON.stringify(motifs).slice(0, 120));
    const cree = await appel(sans, 'POST', S + 'creer', { categorie: 'RAYON', motifId: MOTIF, commentaire: COMMENTAIRE,
      items: [{ lg_FAMILLE_ID: PS[0], int_QTE: 2 }, { lg_FAMILLE_ID: PS[1], int_QTE: 3 }] }, 'E2E-RVS-1');
    const ID = cree.lg_SUGGESTION_RESERVE_ID;
    ok('SANS : création permise, réponse {lg_SUGGESTION_RESERVE_ID, str_REF}', cree.http === 200 && cree.success === true && !!ID && !!cree.str_REF, JSON.stringify(cree).slice(0, 200));
    const enBase = q("SELECT CONCAT_WS('|', str_REF, lg_USER_CREATEUR_ID, str_STATUT, (SELECT COUNT(*) FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID)) FROM t_suggestion_reserve s WHERE lg_SUGGESTION_RESERVE_ID = '" + ID + "'");
    ok('SANS : la suggestion créée est en base (référence, auteur, à traiter, deux lignes)', enBase === [cree.str_REF, PROFILS.sans.id, 'A_TRAITER', '2'].join('|'), enBase);
    const recherche = await appel(sans, 'POST', S + 'creer-depuis-recherche', { type: 'ALL', search: CIP, motifId: MOTIF, commentaire: COMMENTAIRE }, 'E2E-RVS-2');
    ok('SANS : création depuis la recherche permise', recherche.http === 200 && !recherche.interdit && (recherche.success === true ? !!recherche.str_REF : true), JSON.stringify(recherche).slice(0, 200));
    const LIGNE = q("SELECT lg_SUGGESTION_RESERVE_DETAIL_ID FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID = '" + ID + "' AND lg_FAMILLE_ID = '" + PS[0] + "'");
    const avant = bilan(ID);
    const rs = [];
    for (const a of lectures(ID, cree.str_REF).concat([['GET', S + ID + '/compte-rendu/excel']], actions(ID, LIGNE))) {
      const r = await appel(sans, a[0], a[1], a[2]);
      rs.push(a[0] + ' ' + a[1].replace(S, '') + ' -> ' + r.http + (refuse(r) ? '' : ' ' + (r.msg || r.brut || '')));
      ok('SANS : ' + a[0] + ' ' + a[1].replace(S, '').replace(ID, '{id}').replace(LIGNE, '{ligne}') + ' : 403 « ' + LIBELLE + ' »', refuse(r), r.http + ' ' + (r.msg || ''));
    }
    ok('SANS : bilan avant / après identique (suggestion, lignes, mouvements de réserve, inventaires)', bilan(ID) === avant, avant + ' => ' + bilan(ID));
    const drSans = await appel(sans, 'GET', '../api/v1/reserve/droits');
    ok('SANS : reserve/droits → voirSuggestions false, traiter true', drSans.voirSuggestions === false && drSans.traiter === true, JSON.stringify(drSans));
    const catSans = await appel(sans, 'GET', '../api/v1/notifications-centre/catalogue');
    const cptSans = await appel(sans, 'GET', '../api/v1/notifications-centre/compteurs?cles=reserve,perimes,avoirs');
    ok('SANS : cloche sans la catégorie des suggestions de réserve (catalogue et compteurs), les autres gardées',
      !(catSans.data || []).some((c) => c.cle === 'reserve') && (catSans.data || []).some((c) => c.cle === 'perimes')
      && cptSans.compteurs && !('reserve' in cptSans.compteurs) && ('perimes' in cptSans.compteurs) && ('avoirs' in cptSans.compteurs), JSON.stringify(cptSans));
    const tbSans = await appel(sans, 'GET', '../api/v1/tableau-bord/alertes');
    const tbListeSans = await appel(sans, 'GET', '../api/v1/tableau-bord/alertes/liste?type=rayon');
    ok('SANS : tableau de bord sans les compteurs des suggestions, liste « rayon » refusée, autres alertes gardées',
      tbSans.success === true && !('suggestionsReserve' in tbSans) && !('suggestionsRayon' in tbSans) && !!tbSans.peremptions && refuse(tbListeSans),
      JSON.stringify(Object.keys(tbSans)) + ' / ' + tbListeSans.http);
    await sans.context().close();

    /* ---- AVEC : lectures 200, actions non refusees par le droit */
    const avec = await session(PROFILS.avec.login, MDP);
    for (const a of lectures(ID, cree.str_REF)) {
      const r = await appel(avec, a[0], a[1], a[2]);
      ok('AVEC : ' + a[0] + ' ' + a[1].replace(S, '').replace(ID, '{id}') + ' : 200', r.http === 200 && !r.interdit, r.http + ' ' + (r.msg || ''));
    }
    const det = await appel(avec, 'GET', S + ID);
    const detail = det.data || det;
    ok('AVEC : le détail rend la suggestion créée par SANS (référence, deux lignes)', JSON.stringify(det).indexOf(cree.str_REF) >= 0 && (detail.lignes || []).length === 2, JSON.stringify(det).slice(0, 200));
    const liste = await appel(avec, 'GET', S + 'liste?limit=200');
    ok('AVEC : la liste répond sans erreur et contient la demande de SANS', liste.success !== false && JSON.stringify(liste).indexOf(cree.str_REF) >= 0, JSON.stringify(liste).slice(0, 160));
    const excel = await appel(avec, 'GET', S + ID + '/compte-rendu/excel');
    ok('AVEC : compte-rendu/excel non refusé par le droit', excel.http !== 403, excel.http);
    for (const a of actions('ZZZ-E2E-RVS', 'ZZZ-E2E-RVS')) {
      const r = await appel(avec, a[0], a[1], a[2]);
      ok('AVEC : ' + a[0] + ' ' + a[1].replace(S, '') + ' : non refusé (identifiant inconnu, aucun effet)', r.http !== 403 && !r.interdit, r.http + ' ' + (r.msg || r.message || ''));
    }
    const drAvec = await appel(avec, 'GET', '../api/v1/reserve/droits');
    ok('AVEC : reserve/droits → voirSuggestions true', drAvec.voirSuggestions === true && drAvec.traiter === true, JSON.stringify(drAvec));
    const catAvec = await appel(avec, 'GET', '../api/v1/notifications-centre/catalogue');
    const cptAvec = await appel(avec, 'GET', '../api/v1/notifications-centre/compteurs?cles=reserve,perimes,avoirs');
    const nbAvec = await appel(avec, 'GET', S + 'en-attente/count');
    ok('AVEC : cloche avec la catégorie, même nombre que en-attente/count', (catAvec.data || []).some((c) => c.cle === 'reserve')
      && cptAvec.compteurs && cptAvec.compteurs.reserve === Number(nbAvec.total) && Number(nbAvec.total) >= 1, JSON.stringify([cptAvec.compteurs, nbAvec.total]));
    const tbAvec = await appel(avec, 'GET', '../api/v1/tableau-bord/alertes?frais=1');
    const tbListeAvec = await appel(avec, 'GET', '../api/v1/tableau-bord/alertes/liste?type=rayon');
    const rayonBase = q("SELECT COUNT(*) FROM t_suggestion_reserve WHERE str_CATEGORIE = 'RAYON' AND str_STATUT IN ('A_TRAITER', 'EN_COURS') AND lg_EMPLACEMENT_ID = '1'");
    ok('AVEC : tableau de bord avec les compteurs (rayon = base), liste « rayon » contient la suggestion', tbAvec.suggestionsRayon === Number(rayonBase) && 'suggestionsReserve' in tbAvec
      && tbListeAvec.http === 200 && (tbListeAvec.data || []).some((x) => x.reference === cree.str_REF), tbAvec.suggestionsRayon + ' / ' + rayonBase);
    await avec.context().close();

    /* ---- VOIR seul : lectures 200, actions refusees par « Traiter la réserve » */
    const voir = await session(PROFILS.voir.login, MDP);
    for (const a of lectures(ID, cree.str_REF)) {
      const r = await appel(voir, a[0], a[1], a[2]);
      ok('VOIR seul : ' + a[0] + ' ' + a[1].replace(S, '').replace(ID, '{id}') + ' : 200', r.http === 200 && !r.interdit, r.http + ' ' + (r.msg || ''));
    }
    const ouv = await appel(voir, 'PUT', S + ID + '/ouvrir');
    const creeVoir = await appel(voir, 'POST', S + 'creer', { categorie: 'RAYON', motifId: MOTIF, commentaire: COMMENTAIRE, items: [{ lg_FAMILLE_ID: PS[0], int_QTE: 1 }] });
    ok('VOIR seul : ouvrir et créer refusés par « Traiter la réserve »', [ouv, creeVoir].every((r) => r.http === 403 && r.msg === 'Droit manquant : Traiter la réserve'), JSON.stringify([ouv.msg, creeVoir.msg]));
    const drVoir = await appel(voir, 'GET', '../api/v1/reserve/droits');
    await voir.context().close();

    /* ---- rapprochement : voirSuggestions = droit en base, pour chaque profil */
    const adm = await session(ENV_E2E.LOGIN, 'e2etest');
    const drAdm = await appel(adm, 'GET', '../api/v1/reserve/droits');
    await adm.context().close();
    const lignes = [[PROFILS.sans.login, drSans], [PROFILS.avec.login, drAvec], [PROFILS.voir.login, drVoir], [ENV_E2E.LOGIN, drAdm]]
      .map(([l, d]) => l + ' : base ' + droitEnBase(l) + ', droits ' + d.voirSuggestions);
    ok('Rapprochement : voirSuggestions = présence de P_RESERVE_SUGGESTION en base, pour les quatre profils',
      [[PROFILS.sans.login, drSans], [PROFILS.avec.login, drAvec], [PROFILS.voir.login, drVoir], [ENV_E2E.LOGIN, drAdm]].every(([l, d]) => typeof d.voirSuggestions === 'boolean' && d.voirSuggestions === droitEnBase(l)), lignes.join(' ; '));

    /* ---- sans session : reponse d'avant */
    const anonyme = await (await b.newContext()).newPage();
    await anonyme.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    const anon = await appel(anonyme, 'GET', S + 'liste');
    /* reponse d'avant (constatee sur l'ancien code) : 401 « Veuillez vous connecter », jamais 403 */
    ok('Sans session : liste répond comme avant (401 « Veuillez vous connecter », jamais 403)', anon.http === 401 && !anon.interdit && /connecter/.test(anon.brut || anon.msg || ''), JSON.stringify(anon).slice(0, 120));
    await anonyme.context().close();
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré (profils, rôles, suggestions)', q("SELECT (SELECT COUNT(*) FROM t_user WHERE lg_USER_ID LIKE 'E2E-RVS-%') + (SELECT COUNT(*) FROM t_role WHERE lg_ROLE_ID LIKE 'E2E-RVS-%')"
      + " + (SELECT COUNT(*) FROM t_suggestion_reserve WHERE str_COMMENTAIRE = '" + COMMENTAIRE + "' OR lg_USER_CREATEUR_ID LIKE 'E2E-RVS-%')"
      + " + (SELECT COUNT(*) FROM t_inventaire WHERE lg_USER_ID LIKE 'E2E-RVS-%') + (SELECT COUNT(*) FROM mobile_client_ref WHERE ref LIKE 'E2E-RVS-%')") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
