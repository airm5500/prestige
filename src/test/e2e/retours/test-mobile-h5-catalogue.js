/* PRESTIGE MOBILE H5 : changements du catalogue depuis un instant (v1/app-vente/catalogue/changements).
 * Par l'API, avec la session habituelle (cookie) :
 *  - capacites : catalogueDelta true, version 1, serveurMaintenant lisible ;
 *  - sans session : 401 ; depuis absent ou illisible : 400 ; jusqua illisible : 400 ;
 *  - depuis = serveurMaintenant : aucun changement ;
 *  - produit modifie : present, statut actif, identique a sa ligne de v1/vente/search ;
 *  - produit desactive : statut supprime ; reactive : de nouveau actif ;
 *  - pagination figee par jusqua : pages sans doublon, total stable ; limit plafonne a 2000.
 * Donnees remises a la fin : statut du produit d'essai, lignes de t_famille_history ajoutees par le declencheur.
 * (dt_UPDATED reste a l'heure du test : t_famille_before_upd_tr l'impose a chaque modification.)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const PID = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " JOIN t_famille_grossiste g ON g.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE f.str_STATUT = 'enable' AND f.int_CIP IS NOT NULL AND f.int_CIP <> ''"
  + " ORDER BY f.str_NAME LIMIT 1");
const ORIG = q("SELECT CONCAT(str_STATUT, '|', DATE_FORMAT(dt_UPDATED, '%Y-%m-%d %H:%i:%s')) FROM t_famille WHERE lg_FAMILLE_ID = '" + PID + "'").split('|');
const T_DEBUT = q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')");
const remettre = () => q("UPDATE t_famille SET str_STATUT = '" + ORIG[0] + "' WHERE lg_FAMILLE_ID = '" + PID + "';"
  + " DELETE FROM t_famille_history WHERE lg_FAMILLE_ID = '" + PID + "' AND dt_CREATED >= '" + T_DEBUT + "'");
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  const appel = (url, page) => (page || p).evaluate(async (url) => {
    const r = await fetch(url); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { j = null; }
    return { s: r.status, t, j };
  }, url);
  const URL = '../api/v1/app-vente/catalogue/changements';
  const enc = encodeURIComponent;
  try {
    /* sans session (page hors application, meme origine) */
    const anonyme = await (await b.newContext()).newPage();
    await anonyme.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    const sans = await appel('/prestige/api/v1/app-vente/catalogue/changements?depuis=' + enc('2026-01-01 00:00:00'), anonyme);
    ok('Sans session : refusé (401)', sans.s === 401, sans.s + ' ' + sans.t.slice(0, 80));

    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 }); await p.waitForLoadState('networkidle'); await p.waitForTimeout(2000);

    const cap = await appel('../api/v1/app-vente/capacites');
    ok('Capacités : catalogueDelta true, version 1, horloge serveur', cap.s === 200 && cap.j.catalogueDelta === true && cap.j.catalogueDeltaVersion === 1
      && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(cap.j.serveurMaintenant || ''), cap.t);
    ok('Capacités : clientRef (H4) toujours présent', cap.j && cap.j.clientRef === true, cap.t);

    const r1 = await appel(URL);
    ok('depuis absent : 400 avec message', r1.s === 400 && r1.j && r1.j.success === false && /depuis/.test(r1.j.msg), r1.t);
    const r2 = await appel(URL + '?depuis=hier');
    ok('depuis illisible : 400', r2.s === 400, r2.t);
    const r3 = await appel(URL + '?depuis=' + enc('2026-13-45 99:00:00'));
    ok('depuis impossible (mois 13) : 400', r3.s === 400, r3.t);
    const r4 = await appel(URL + '?depuis=' + enc('2026-01-01 00:00:00') + '&jusqua=xx');
    ok('jusqua illisible : 400', r4.s === 400, r4.t);

    const t0 = (await appel('../api/v1/app-vente/capacites')).j.serveurMaintenant;
    await pause(1200);
    const vide = await appel(URL + '?depuis=' + enc(t0) + '&jusqua=' + enc(t0));
    ok('Intervalle vide (depuis = jusqua) : aucun changement', vide.s === 200 && vide.j.total === 0 && vide.j.data.length === 0, vide.t.slice(0, 200));

    /* modification du produit d'essai (le declencheur pose dt_UPDATED) */
    q("UPDATE t_famille SET str_STATUT = str_STATUT WHERE lg_FAMILLE_ID = '" + PID + "'");
    q("UPDATE t_famille SET dt_UPDATED = NOW() WHERE lg_FAMILLE_ID = '" + PID + "'");
    const ch = await appel(URL + '?depuis=' + enc(t0) + '&limit=2000');
    const ligne = ch.j && ch.j.data.find((x) => x.lgFAMILLEID === PID);
    ok('Produit modifié : renvoyé, statut actif', ch.s === 200 && ligne && ligne.statut === 'actif', ch.t.slice(0, 300));
    ok('Réponse : depuis repris, serveurMaintenant ≥ depuis', ch.j.depuis === t0 && ch.j.serveurMaintenant >= t0, ch.j.depuis + ' / ' + ch.j.serveurMaintenant);
    const cip = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + PID + "'");
    const rech = await appel('../api/v1/vente/search?query=' + enc(cip) + '&start=0&limit=50');
    const ref = rech.j && (rech.j.data || []).find((x) => x.lgFAMILLEID === PID);
    const champs = ref ? Object.keys(ref) : [];
    const differents = champs.filter((k) => JSON.stringify(ref[k]) !== JSON.stringify(ligne && ligne[k]));
    ok('Ligne identique à celle de la recherche de vente (' + champs.length + ' champs)', ref && ligne && champs.length > 5 && differents.length === 0,
      differents.join(',') || rech.t.slice(0, 200));

    /* desactivation puis reactivation */
    const t1 = ch.j.serveurMaintenant;
    await pause(1200);
    q("UPDATE t_famille SET str_STATUT = 'disable' WHERE lg_FAMILLE_ID = '" + PID + "'");
    const sup = await appel(URL + '?depuis=' + enc(t1) + '&limit=2000');
    const ls = sup.j && sup.j.data.find((x) => x.lgFAMILLEID === PID);
    ok('Produit désactivé : statut supprime (identifiant seul)', ls && ls.statut === 'supprime' && Object.keys(ls).length === 2, JSON.stringify(ls));
    const t2 = sup.j.serveurMaintenant;
    await pause(1200);
    q("UPDATE t_famille SET str_STATUT = 'enable' WHERE lg_FAMILLE_ID = '" + PID + "'");
    const rea = await appel(URL + '?depuis=' + enc(t2) + '&limit=2000');
    const la = rea.j && rea.j.data.find((x) => x.lgFAMILLEID === PID);
    ok('Produit réactivé : de nouveau actif', la && la.statut === 'actif', JSON.stringify(la).slice(0, 200));
    remettre();

    /* pagination figee */
    const debut = '2000-01-01 00:00:00';
    const p0 = await appel(URL + '?depuis=' + enc(debut) + '&start=0&limit=7');
    const fige = p0.j.serveurMaintenant;
    const vus = new Set(); let total = p0.j.total, stable = true, pages = 0;
    for (let s = 0; s < Math.min(total, 35); s += 7) {
      const pg = await appel(URL + '?depuis=' + enc(debut) + '&jusqua=' + enc(fige) + '&start=' + s + '&limit=7');
      if (pg.j.total !== total || pg.j.serveurMaintenant !== fige) { stable = false; }
      pg.j.data.forEach((x) => vus.add(x.lgFAMILLEID)); pages++;
    }
    ok('Pagination avec jusqua : total et horloge figés', total > 7 && stable, 'total=' + total);
    ok('Pagination : aucune ligne en double entre pages', vus.size === Math.min(total, pages * 7), vus.size + ' / ' + pages + ' pages');
    const gros = await appel(URL + '?depuis=' + enc(fige) + '&limit=99999');
    ok('limit plafonné à 2000, défaut 500', gros.j.limit === 2000 && (await appel(URL + '?depuis=' + enc(fige))).j.limit === 500, gros.j.limit);
    const tSep = await appel(URL + '?depuis=' + enc(fige.replace(' ', 'T')) + '&jusqua=' + enc(fige));
    ok('Format avec T accepté', tSep.s === 200 && tSep.j.total === 0, tSep.t.slice(0, 100));
  } catch (e) {
    ok('Exception', false, e.stack);
  } finally {
    remettre();
    ok('Produit d\'essai remis (statut, historique)', q("SELECT str_STATUT FROM t_famille WHERE lg_FAMILLE_ID = '" + PID + "'") === ORIG[0]
      && q("SELECT COUNT(*) FROM t_famille_history WHERE lg_FAMILLE_ID = '" + PID + "' AND dt_CREATED >= '" + T_DEBUT + "'") === '0');
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
