/* INVENTAIRE : VERSEMENT DE COLLECTE EN LOT (demandes serveur des applications mobiles, point 37).
 *
 * POST /api/v1/inventaire/{id}/versement, sur un inventaire ouvert du banc (lignes touchees remises a l'identique) :
 *  - « ajouter » : une ligne jamais comptee part de 0 ; une ligne comptee s'additionne ; auteur et date renseignes ;
 *  - meme cle renvoyee : meme rapport, dejaTraite, une seule addition ; meme cle, autre contenu : 409 CLE_REUTILISEE ;
 *  - deux versements simultanes (cles differentes) sur la meme ligne : somme exacte ;
 *  - « remplacer » ; code inconnu, quantite invalide ; code EAN et code article grossiste reconnus ;
 *  - (49) EAN-13 « 34009 + CIP7 + cle » et GTIN-14 « 0 + EAN-13 » reconnus par le CIP7 ;
 *  - 401 sans session, 410 inventaire inconnu, 413 au-dela de 500 lignes, 400 corps invalide.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const CLE = 'e2e-versement-';

(async () => {
  exec("DELETE FROM t_inventaire_versement WHERE cle LIKE '" + CLE + "%'");
  const INV = q("SELECT i.lg_INVENTAIRE_ID FROM t_inventaire i JOIN t_inventaire_famille f ON f.lg_INVENTAIRE_ID = i.lg_INVENTAIRE_ID"
    + " WHERE i.str_STATUT = 'enable' GROUP BY i.lg_INVENTAIRE_ID ORDER BY COUNT(*) DESC LIMIT 1");
  /* trois lignes a CIP unique dans l'inventaire */
  const L = q("SELECT CONCAT_WS('|', i.lg_INVENTAIRE_FAMILLE_ID, f.int_CIP, i.int_NUMBER, IFNULL(i.dt_UPDATED, 'NULL'), IFNULL(i.str_UPDATED_ID, 'NULL'), IFNULL(f.int_EAN13, ''))"
    + " FROM t_inventaire_famille i JOIN t_famille f ON f.lg_FAMILLE_ID = i.lg_FAMILLE_ID WHERE i.lg_INVENTAIRE_ID = '" + INV + "' AND i.bool_INVENTAIRE = 1"
    + " AND f.int_CIP REGEXP '^[0-9]{6,8}$' AND (SELECT COUNT(*) FROM t_inventaire_famille x JOIN t_famille y ON y.lg_FAMILLE_ID = x.lg_FAMILLE_ID"
    + "   WHERE x.lg_INVENTAIRE_ID = i.lg_INVENTAIRE_ID AND y.int_CIP = f.int_CIP) = 1 ORDER BY i.lg_INVENTAIRE_FAMILLE_ID LIMIT 3").split('\n').map((l) => l.split('|'));
  const [A, B, C] = L;
  const nombre = (l) => q("SELECT int_NUMBER FROM t_inventaire_famille WHERE lg_INVENTAIRE_FAMILLE_ID = '" + l[0] + "'");
  ok('Jeu d\'essai : inventaire ouvert, trois lignes à CIP unique', L.length === 3, INV);
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const verser = (corps, inv) => p.evaluate(async ([c, inv]) => { const r = await fetch('../api/v1/inventaire/' + inv + '/versement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof c === 'string' ? c : JSON.stringify(c) }); return { s: r.status, j: await r.json().catch(() => null) }; }, [corps, inv || INV]);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    const sans = await verser({ cle: CLE + '0', mode: 'ajouter', lignes: [] });
    ok('Sans session : 401', sans.s === 401, sans.s);
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    const admin = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");

    /* remise a zero de comptage sur A et B pour partir d'un etat connu (jamais comptees) */
    exec("UPDATE t_inventaire_famille SET dt_UPDATED = NULL WHERE lg_INVENTAIRE_FAMILLE_ID IN ('" + A[0] + "', '" + B[0] + "')");
    const corps1 = { cle: CLE + '1', mode: 'ajouter', lignes: [{ code: A[1], quantite: 3 }, { code: B[1], quantite: 2 }, { code: 'ZZZ-INCONNU-E2E', quantite: 1 }, { code: C[1], quantite: -2 }] };
    const v1 = await verser(corps1);
    const lig = (v, i) => ((v.j || {}).lignes || [])[i] || {};
    ok('Ajouter sur des lignes jamais comptées : part de 0 (3 et 2, pas le stock théorique)', v1.s === 200 && nombre(A) === '3' && nombre(B) === '2' && lig(v1, 0).statut === 'ok' && lig(v1, 0).quantiteFinale === 3, JSON.stringify(v1.j).slice(0, 300));
    ok('Rapport : inconnu et quantité négative refusée', lig(v1, 2).statut === 'inconnu' && lig(v1, 3).statut === 'refuse' && v1.j.ok === 2 && v1.j.inconnu === 1 && v1.j.refuse === 1, JSON.stringify(v1.j).slice(0, 300));
    ok('Auteur et date de saisie renseignés', q("SELECT CONCAT_WS('|', str_UPDATED_ID, dt_UPDATED IS NOT NULL) FROM t_inventaire_famille WHERE lg_INVENTAIRE_FAMILLE_ID = '" + A[0] + "'") === admin + '|1');
    const v1bis = await verser(corps1);
    ok('Même clé renvoyée : même rapport, dejaTraite, pas de seconde addition', v1bis.s === 200 && v1bis.j.dejaTraite === true && nombre(A) === '3' && JSON.stringify(v1bis.j.lignes) === JSON.stringify(v1.j.lignes), nombre(A));
    const autre = await verser({ cle: CLE + '1', mode: 'ajouter', lignes: [{ code: A[1], quantite: 9 }] });
    ok('Même clé, autre contenu : 409 CLE_REUTILISEE, rien d\'écrit', autre.s === 409 && autre.j.code === 'CLE_REUTILISEE' && nombre(A) === '3', JSON.stringify(autre.j));
    const v2 = await verser({ cle: CLE + '2', mode: 'ajouter', lignes: [{ code: A[1], quantite: 4 }] });
    ok('Ajouter sur une ligne déjà comptée : 3 + 4 = 7', v2.s === 200 && nombre(A) === '7', nombre(A));

    /* deux terminaux en meme temps */
    const [x, y] = await Promise.all([verser({ cle: CLE + '3', mode: 'ajouter', lignes: [{ code: A[1], quantite: 10 }] }), verser({ cle: CLE + '4', mode: 'ajouter', lignes: [{ code: A[1], quantite: 5 }] })]);
    ok('Deux versements simultanés : somme exacte (7 + 10 + 5 = 22)', x.s === 200 && y.s === 200 && nombre(A) === '22', nombre(A));
    const rp = await verser({ cle: CLE + '5', mode: 'remplacer', lignes: [{ code: A[1], quantite: 6 }] });
    ok('Remplacer : 6', rp.s === 200 && nombre(A) === '6', nombre(A));
    if (A[5]) {
      const ean = await verser({ cle: CLE + '6', mode: 'remplacer', lignes: [{ code: A[5], quantite: 8 }] });
      ok('Code EAN reconnu', ean.s === 200 && lig(ean, 0).statut === 'ok' && nombre(A) === '8', JSON.stringify(ean.j).slice(0, 200));
    }
    if (/^\d{7}$/.test(A[1])) {
      /* 49 : EAN-13 « 34009 + CIP7 + cle » et GTIN-14 « 0 + EAN-13 » reconnus par le CIP7 */
      const e13 = await verser({ cle: CLE + '6b', mode: 'remplacer', lignes: [{ code: '34009' + A[1] + '8', quantite: 11 }] });
      ok('EAN-13 « 34009 + CIP7 + clé » reconnu (49)', e13.s === 200 && lig(e13, 0).statut === 'ok' && nombre(A) === '11', JSON.stringify(e13.j).slice(0, 200));
      const g14 = await verser({ cle: CLE + '6c', mode: 'remplacer', lignes: [{ code: '034009' + A[1] + '8', quantite: 12 }] });
      ok('GTIN-14 « 0 + EAN-13 » reconnu (49)', g14.s === 200 && lig(g14, 0).statut === 'ok' && nombre(A) === '12', JSON.stringify(g14.j).slice(0, 200));
    }
    const ga = q("SELECT g.str_CODE_ARTICLE FROM t_famille_grossiste g JOIN t_inventaire_famille i ON i.lg_FAMILLE_ID = g.lg_FAMILLE_ID WHERE i.lg_INVENTAIRE_FAMILLE_ID = '" + B[0] + "'"
      + " AND g.str_CODE_ARTICLE <> '' AND (SELECT COUNT(*) FROM t_famille_grossiste h JOIN t_inventaire_famille j ON j.lg_FAMILLE_ID = h.lg_FAMILLE_ID WHERE j.lg_INVENTAIRE_ID = '" + INV + "' AND h.str_CODE_ARTICLE = g.str_CODE_ARTICLE) = 1 LIMIT 1");
    if (ga) {
      const vg = await verser({ cle: CLE + '7', mode: 'remplacer', lignes: [{ code: ga, quantite: 5 }] });
      ok('Code article grossiste reconnu', vg.s === 200 && lig(vg, 0).statut === 'ok' && nombre(B) === '5', JSON.stringify(vg.j).slice(0, 200));
    }
    const inconnu = await verser({ cle: CLE + '8', mode: 'ajouter', lignes: [] }, 'ZZZ-INCONNU');
    ok('Inventaire inconnu : 410', inconnu.s === 410 && inconnu.j.code === 'INVENTAIRE_INCONNU', inconnu.s);
    const avantTrop = nombre(A);
    const trop = await verser({ cle: CLE + '9', mode: 'ajouter', lignes: Array.from({ length: 501 }, () => ({ code: A[1], quantite: 1 })) });
    ok('Plus de 500 lignes : 413, rien d\'écrit', trop.s === 413 && nombre(A) === avantTrop, trop.s);
    const mauvais = await verser({ cle: CLE + '10', mode: 'multiplier', lignes: [] });
    const illisible = await verser('pas du json');
    ok('Corps invalide : 400', mauvais.s === 400 && illisible.s === 400, mauvais.s + ' / ' + illisible.s);
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    L.forEach(([id, , n, dt, u]) => exec("UPDATE t_inventaire_famille SET int_NUMBER = " + n + ", dt_UPDATED = " + (dt === 'NULL' ? 'NULL' : "'" + dt + "'")
      + ", str_UPDATED_ID = " + (u === 'NULL' ? 'NULL' : "'" + u + "'") + " WHERE lg_INVENTAIRE_FAMILLE_ID = '" + id + "'"));
    exec("DELETE FROM t_inventaire_versement WHERE cle LIKE '" + CLE + "%'");
    ok('Lignes remises à l\'identique, clés retirées', L.every(([id, , n, dt, u]) => q("SELECT CONCAT_WS('|', int_NUMBER, IFNULL(dt_UPDATED, 'NULL'), IFNULL(str_UPDATED_ID, 'NULL')) FROM t_inventaire_famille WHERE lg_INVENTAIRE_FAMILLE_ID = '" + id + "'") === [n, dt, u].join('|'))
      && q("SELECT COUNT(*) FROM t_inventaire_versement WHERE cle LIKE '" + CLE + "%'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
