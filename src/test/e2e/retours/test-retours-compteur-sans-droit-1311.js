/* COMPTEUR DES RETOURS FOURNISSEURS EN ATTENTE SANS LE DROIT (rapport d'exploitation du 13/11, point 8).
 *
 * Constat chez appaul le 13/11 : 53 refus 403 sur GET retourfournisseur/en-attente/nombre. Le compteur est interroge a
 * la connexion puis toutes les 5 min par TOUS les profils ; ceux qui n'ont pas P_VALIDER_RETOUR_FRS etaient refuses, et
 * chaque refus devenait un evenement FRONTEND du Centre de support, sans rien d'anormal.
 *
 * Vrai chemin : connexion par l'ecran, menu charge, pastille posee par l'ecran lui-meme ; l'horloge de la page est
 * avancee de 6 min (deux passages du compteur) au lieu d'attendre.
 *  1. Sans le droit : aucune reponse 403, une seule interrogation (plus rien apres « non autorise »), aucun evenement
 *     du Centre de support sur ce compteur, ni pastille ni avis, aucune erreur JavaScript.
 *  2. Avec le droit, 0, 1 puis 3 retours en attente en base : la pastille du menu affiche le meme nombre que la base
 *     (rapprochement ecran = base), et la route le meme nombre.
 * Bilan : rien d'ecrit par le compteur ; les retours d'essai (marque E2E-RAT-1311) et le droit sont remis.
 * Lancement seul : node src/test/e2e/retours/test-retours-compteur-sans-droit-1311.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const { connexion } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-RAT-1311';
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_VALIDER_RETOUR_FRS');
const enAttente = () => Number(q("SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_STATUT = 'is_Waiting'"));
const evenementsCompteur = (depuis) => Number(q(`SELECT COUNT(*) FROM t_application_event WHERE last_seen_at >= '${depuis}'`
  + " AND CONCAT_WS(' ', message_court, url_ou_ecran, payload_json) LIKE '%en-attente/nombre%'"));

const DEBUT = q('SELECT NOW()');
const SUR_LE_COMPTEUR = " CONCAT_WS(' ', message_court, url_ou_ecran, payload_json) LIKE '%en-attente/nombre%'";
/* evenements deja presents sur ce compteur (anciens 403) : etat de depart, remis a l'identique a la fin */
const AVANT_EVT = q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', id, occurrences, last_seen_at, modified_at, status) SEPARATOR ';'), '')"
  + ' FROM t_application_event WHERE' + SUR_LE_COMPTEUR).split(';').filter(Boolean).map((l) => l.split('|'));
function retirer() {
  exec(`DELETE FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${MARQUE}';`);
  /* evenement du compteur cree pendant le test (ancien code) : retire, occurrences comprises */
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", id, "'")), "''") FROM t_application_event WHERE created_at >= '${DEBUT}' AND` + SUR_LE_COMPTEUR);
  exec(`DELETE FROM t_application_event_occurrence WHERE event_id IN (${ids}); DELETE FROM t_application_event WHERE id IN (${ids});`);
  /* evenement plus ancien revu pendant le test : ses occurrences du test sont retirees, ses compteurs remis */
  AVANT_EVT.forEach(([id, occ, vu, modif, statut]) => exec(`DELETE FROM t_application_event_occurrence WHERE event_id = '${id}' AND seen_at >= '${DEBUT}';`
    + ` UPDATE t_application_event SET occurrences = ${Number(occ)}, last_seen_at = '${vu}', modified_at = '${modif}', status = '${statut}' WHERE id = '${id}';`));
}
/* retours d'essai en attente : seule la ligne d'en-tete compte pour le compteur */
function poserEnAttente(n) {
  retirer();
  for (let i = 1; i <= n; i++) {
    exec("INSERT INTO t_retour_fournisseur (lg_RETOUR_FRS_ID, str_REF_RETOUR_FRS, str_COMMENTAIRE, str_STATUT, dt_CREATED, dt_UPDATED, dt_ATTENTE, bool_SANS_SORTIE_STOCK)"
      + ` VALUES ('${MARQUE}-${i}', 'RAT1311${i}', '${MARQUE}', 'is_Waiting', NOW(), NOW(), NOW(), 0)`);
  }
}

(async () => {
  droit.remettre();
  retirer();
  const attente0 = enAttente();
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  let ctx = null;
  try {
    /* ----- 1. sans le droit ----- */
    droit.retirer();
    const debut = q('SELECT NOW()');
    ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    let p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    const appels = [];
    p.on('response', (r) => { if (/retourfournisseur\/en-attente\/nombre/.test(r.url())) { appels.push(r.status()); } });
    await p.clock.install();
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForTimeout(6000); // menu charge, premier passage du compteur
    const premier = appels.slice();
    await p.clock.runFor(6 * 60 * 1000); // deux echeances de 5 min
    await p.waitForTimeout(2500);
    ok('Sans le droit : aucune réponse 403 du compteur', appels.length > 0 && appels.every((s) => s === 200), appels.join(','));
    ok('Sans le droit : une seule interrogation, plus rien après « non autorisé » (6 min)', premier.length === 1 && appels.length === 1, premier.join(',') + ' puis ' + appels.join(','));
    const pastille = await p.evaluate(() => document.querySelectorAll('.pastille-retours').length);
    const avis = await p.evaluate(() => document.querySelectorAll('.avis-retours-attente').length);
    ok('Sans le droit : ni pastille ni avis', pastille === 0 && avis === 0, pastille + ' / ' + avis);
    await p.waitForTimeout(2000); // envoi asynchrone au Centre de support
    ok('Sans le droit : aucun événement du Centre de support sur le compteur', evenementsCompteur(debut) === 0, evenementsCompteur(debut));
    await ctx.close();
    ctx = null;
    droit.remettre();

    /* ----- 2. avec le droit : 0, 1, 3 retours en attente ----- */
    for (const n of [0, 1, 3]) {
      poserEnAttente(n);
      ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
      p = await ctx.newPage();
      p.on('pageerror', (e) => err.push(e.message));
      let rep = null;
      p.on('response', async (r) => { if (/retourfournisseur\/en-attente\/nombre/.test(r.url())) { rep = { status: r.status(), j: await r.json().catch(() => null) }; } });
      await connexion(p, ENV_E2E.LOGIN, 'e2etest');
      await p.waitForTimeout(6000);
      const base = enAttente();
      const ecran = await p.evaluate(() => { const e = document.querySelector('.prestige-nav .pastille-retours'); return e ? Number(e.textContent) : 0; });
      ok(`Avec le droit, ${n} retour(s) d'essai : pastille = route = base`, base === attente0 + n && ecran === base && rep && rep.status === 200 && rep.j && rep.j.autorise === true && rep.j.nombre === base,
        'écran ' + ecran + ', route ' + JSON.stringify(rep) + ', base ' + base);
      await ctx.close();
      ctx = null;
    }
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' || '));
  } finally {
    if (ctx) { await ctx.close().catch(() => {}); }
    await b.close();
    retirer();
    droit.remettre();
  }
  ok('Données d\'essai retirées, compteur revenu à son état de départ', enAttente() === attente0 && q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${MARQUE}'`) === '0', enAttente() + ' / ' + attente0);
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' réussis');
  process.exitCode = echecs ? 1 : 0;
})().catch((e) => { console.error('FATAL', e); try { retirer(); droit.remettre(); } catch (_) { /* rien */ } process.exit(2); });
