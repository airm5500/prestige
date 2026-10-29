/* RESERVE : AJOUT D'UNE LIGNE A UNE SUGGESTION (demandes serveur des applications mobiles, point 33).
 *
 * POST v1/suggestion-reserve/{id}/lignes {produitId, quantite} + X-Client-Ref, sur une suggestion A_TRAITER ou EN_COURS
 * dont l'utilisateur detient le verrou. Ce que le test etablit :
 *  - ligne creee, rendue au format des lignes de PUT {id}/ouvrir (memes cles), quantite retenue = quantite envoyee ;
 *  - meme X-Client-Ref renvoye : meme reponse, une seule ligne ;
 *  - produit deja present : refus code DEJA_PRESENT, rien d'ajoute ;
 *  - quantite nulle ou produit absent : refus ;
 *  - suggestion occupee par un autre : SUGGESTION_OCCUPEE ; annulee : refus (cloturee) ; autre emplacement :
 *    « Suggestion introuvable » (comme ouvrir) ;
 *  - sans le droit de la reserve : 403.
 * Suggestions d'essai (commentaire E2E-RES-LIGNE), lignes de stock reserve et cles retirees ; produits remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const droits = [privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_TRAITER_RESERVE'), privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_SM_RESERVE')];
/* deux produits avec stock rayon et sans ligne de stock reserve ; le test leur en pose une, puis la retire */
const PS = q("SELECT s.lg_FAMILLE_ID FROM t_famille_stock s JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND r.lg_EMPLACEMENT_ID = '1' AND r.lg_TYPE_STOCK_ID = '1'"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
  + " WHERE s.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND s.int_NUMBER_AVAILABLE > 0"
  + " AND NOT EXISTS (SELECT 1 FROM t_type_stock_famille v WHERE v.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND v.lg_TYPE_STOCK_ID = '2') ORDER BY s.lg_FAMILLE_ID LIMIT 2 OFFSET 11").split(/\r?\n/);
const RESERVE_AVANT = PS.map((p) => q("SELECT IFNULL(bool_RESERVE, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '" + p + "'"));
function nettoyer() {
  exec("DELETE d FROM t_suggestion_reserve_detail d JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID WHERE s.str_COMMENTAIRE = 'E2E-RES-LIGNE';"
    + " DELETE FROM t_suggestion_reserve WHERE str_COMMENTAIRE = 'E2E-RES-LIGNE'; DELETE FROM mobile_client_ref WHERE ref LIKE 'E2E-RL-%';"
    + " DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE 'E2E-RES-LIGNE-%';");
  PS.forEach((p, i) => exec("UPDATE t_famille SET bool_RESERVE = " + RESERVE_AVANT[i] + " WHERE lg_FAMILLE_ID = '" + p + "'"));
}

(async () => {
  droits.forEach((d) => d.remettre());
  nettoyer();
  PS.forEach((p, i) => exec("UPDATE t_famille SET bool_RESERVE = 1 WHERE lg_FAMILLE_ID = '" + p + "';"
    + " INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)"
    + " VALUES ('E2E-RES-LIGNE-" + i + "', '" + p + "', '2', '1', 'E2E', 'E2E', NOW(), NOW(), 'enable', 0)"));
  ok('Jeu d\'essai : deux produits', PS.length === 2 && PS.every((x) => x), PS.join(' / '));
  const b = await ENV_E2E.lancer(chromium);
  const session = async () => { const p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 }); return p; };
  const appel = (p, m, u, c, ref) => p.evaluate(async ([m, u, c, ref]) => { const h = { 'Content-Type': 'application/json' }; if (ref) { h['X-Client-Ref'] = ref; }
    const r = await fetch(u, { method: m, headers: h, body: c === undefined ? undefined : JSON.stringify(c) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 100) }; } j.http = r.status; return j; }, [m, u, c, ref]);
  const lignesDe = (id, p) => q("SELECT COUNT(*) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID = '" + id + "' AND lg_FAMILLE_ID = '" + p + "'");
  try {
    const p = await session();
    const MOTIF = Number(q('SELECT id FROM motif_suggestion_reserve ORDER BY id LIMIT 1'));
    const s = await appel(p, 'POST', '../api/v1/suggestion-reserve/creer', { categorie: 'RAYON', motifId: MOTIF, commentaire: 'E2E-RES-LIGNE', items: [{ lg_FAMILLE_ID: PS[0], int_QTE: 2 }] });
    const ID = s.lg_SUGGESTION_RESERVE_ID;
    ok('Suggestion d\'essai créée', s.success === true && !!ID, JSON.stringify(s).slice(0, 200));
    const ouverte = await appel(p, 'PUT', '../api/v1/suggestion-reserve/' + ID + '/ouvrir');
    const cles = Object.keys(((ouverte.data || ouverte).lignes || [])[0] || {}).sort();
    ok('Ouverture : verrou pris', ouverte.modifiable === true, JSON.stringify(ouverte).slice(0, 160));

    const a1 = await appel(p, 'POST', '../api/v1/suggestion-reserve/' + ID + '/lignes', { produitId: PS[1], quantite: 3 }, 'E2E-RL-1');
    const l1 = a1.ligne || a1.data || {};
    ok('Ajout : ligne créée, quantité retenue 3', a1.success === true && l1.lg_FAMILLE_ID === PS[1] && l1.int_QTE_RETENUE === 3 && lignesDe(ID, PS[1]) === '1', JSON.stringify(a1).slice(0, 250));
    ok('Ligne au format des lignes de « ouvrir » (mêmes clés)', cles.length > 0 && JSON.stringify(Object.keys(l1).sort()) === JSON.stringify(cles), JSON.stringify(Object.keys(l1).sort()) + ' / ' + JSON.stringify(cles));
    const a2 = await appel(p, 'POST', '../api/v1/suggestion-reserve/' + ID + '/lignes', { produitId: PS[1], quantite: 3 }, 'E2E-RL-1');
    ok('Même X-Client-Ref : même réponse, une seule ligne', a2.success === true && (a2.ligne || {}).lg_SUGGESTION_RESERVE_DETAIL_ID === l1.lg_SUGGESTION_RESERVE_DETAIL_ID && lignesDe(ID, PS[1]) === '1', JSON.stringify(a2).slice(0, 160));
    const deja = await appel(p, 'POST', '../api/v1/suggestion-reserve/' + ID + '/lignes', { produitId: PS[0], quantite: 1 }, 'E2E-RL-2');
    ok('Produit déjà présent : DEJA_PRESENT, rien d\'ajouté', deja.success === false && deja.code === 'DEJA_PRESENT' && lignesDe(ID, PS[0]) === '1', JSON.stringify(deja).slice(0, 200));
    const zero = await appel(p, 'POST', '../api/v1/suggestion-reserve/' + ID + '/lignes', { produitId: PS[1], quantite: 0 });
    const sansProduit = await appel(p, 'POST', '../api/v1/suggestion-reserve/' + ID + '/lignes', { quantite: 2 });
    ok('Quantité nulle ou produit absent : refus', zero.success === false && sansProduit.success === false, JSON.stringify([zero.msg || zero.message, sansProduit.msg || sansProduit.message]));

    const autre = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN <> '" + ENV_E2E.LOGIN + "' AND str_STATUT = 'enable' LIMIT 1");
    exec("UPDATE t_suggestion_reserve SET lg_USER_VERROU_ID = '" + autre + "', dt_VERROU = NOW() WHERE lg_SUGGESTION_RESERVE_ID = '" + ID + "'");
    exec("DELETE FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID = '" + ID + "' AND lg_FAMILLE_ID = '" + PS[1] + "'");
    const occ = await appel(p, 'POST', '../api/v1/suggestion-reserve/' + ID + '/lignes', { produitId: PS[1], quantite: 3 });
    ok('Occupée par un autre : SUGGESTION_OCCUPEE, rien d\'ajouté', occ.success === false && occ.code === 'SUGGESTION_OCCUPEE' && lignesDe(ID, PS[1]) === '0', JSON.stringify(occ).slice(0, 200));
    exec("UPDATE t_suggestion_reserve SET lg_USER_VERROU_ID = NULL, dt_VERROU = NULL, str_STATUT = 'ANNULEE' WHERE lg_SUGGESTION_RESERVE_ID = '" + ID + "'");
    const ann = await appel(p, 'POST', '../api/v1/suggestion-reserve/' + ID + '/lignes', { produitId: PS[1], quantite: 3 });
    ok('Suggestion annulée : refus (clôturée), rien d\'ajouté', ann.success === false && /clotur/i.test(ann.msg || ann.message || '') && lignesDe(ID, PS[1]) === '0', JSON.stringify(ann).slice(0, 200));
    exec("UPDATE t_suggestion_reserve SET str_STATUT = 'A_TRAITER', lg_EMPLACEMENT_ID = 'ZZ-E2E' WHERE lg_SUGGESTION_RESERVE_ID = '" + ID + "'");
    const ailleurs = await appel(p, 'POST', '../api/v1/suggestion-reserve/' + ID + '/lignes', { produitId: PS[1], quantite: 3 });
    const ouvrirAilleurs = await appel(p, 'PUT', '../api/v1/suggestion-reserve/' + ID + '/ouvrir');
    ok('Autre emplacement : même refus que ouvrir (« introuvable »)', ailleurs.success === false && (ailleurs.msg || ailleurs.message) === (ouvrirAilleurs.msg || ouvrirAilleurs.message) && lignesDe(ID, PS[1]) === '0', JSON.stringify([ailleurs.msg || ailleurs.message, ouvrirAilleurs.msg || ouvrirAilleurs.message]));
    exec("UPDATE t_suggestion_reserve SET lg_EMPLACEMENT_ID = '1' WHERE lg_SUGGESTION_RESERVE_ID = '" + ID + "'");

    droits.forEach((d) => d.retirer());
    const p2 = await session();
    const refus = await appel(p2, 'POST', '../api/v1/suggestion-reserve/' + ID + '/lignes', { produitId: PS[1], quantite: 3 });
    ok('Sans le droit de la réserve : 403', refus.http === 403 && refus.interdit === true, refus.http);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    droits.forEach((d) => d.remettre());
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées, produits remis', q("SELECT COUNT(*) FROM t_suggestion_reserve WHERE str_COMMENTAIRE = 'E2E-RES-LIGNE'") === '0'
      && q("SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE 'E2E-RES-LIGNE-%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
