/* INVENTAIRE : CREATION LIMITEE A UNE LISTE DE PRODUITS, EN UNE REQUETE (demandes serveur, point 46 ; 49 pour les
 * formes du code).
 *
 * POST v1/inventaire/creation avec « produits » : l'inventaire ne contient que ces produits, lignes deja retenues,
 * stock theorique repris de l'emplacement de l'utilisateur, le tout dans une seule transaction. Ce que le test etablit :
 *  - elements designes par lg_FAMILLE_ID, par CIP et par EAN-13 « 34009 + CIP7 + cle » (49) ; un code inconnu
 *    est rendu dans « inconnus » ;
 *  - exactement ces lignes, retenues, stock initial = stock de l'emplacement (calcul SQL) ;
 *  - 4 produits de 4 rayons : ws/inventaires/rayons rend ces 4 rayons seulement ;
 *  - (47) lignes ecartees : rayons, etat des rayons et criteres ne montrent que les rayons des lignes retenues ;
 *  - « valeurs » en plus : intersection (un produit hors du rayon choisi n'entre pas) ;
 *  - tous inconnus : refus, aucun inventaire ; 501 elements : 413 ; 500 elements : accepte ;
 *  - sans « produits » : la reponse n'a pas de champ « inconnus » (comportement actuel inchange).
 * Les inventaires du test (libelle E2E-46-*) sont retires.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 64 << 20 }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const nettoyer = () => exec("DELETE f FROM t_inventaire_famille f JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = f.lg_INVENTAIRE_ID WHERE i.str_NAME LIKE 'E2E-46-%';"
  + " DELETE FROM t_inventaire WHERE str_NAME LIKE 'E2E-46-%';");

(async () => {
  nettoyer();
  const EMP = q("SELECT u.lg_EMPLACEMENT_ID FROM t_user u WHERE u.str_LOGIN = 'admin'");
  /* 4 produits actifs, de 4 rayons differents, avec une ligne de stock a l'emplacement d'admin et un CIP7 */
  const P = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.lg_ZONE_GEO_ID, s.int_NUMBER_AVAILABLE) FROM t_famille f"
    + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '" + EMP + "'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$'"
    + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP OR x.int_EAN13 = f.int_CIP) = 1"
    + " AND f.lg_FAMILLE_ID = (SELECT MIN(y.lg_FAMILLE_ID) FROM t_famille y JOIN t_famille_stock ys ON ys.lg_FAMILLE_ID = y.lg_FAMILLE_ID AND ys.lg_EMPLACEMENT_ID = '" + EMP + "'"
    + "   WHERE y.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND y.str_STATUT = 'enable' AND y.int_CIP REGEXP '^[0-9]{7}$'"
    + "   AND (SELECT COUNT(*) FROM t_famille x2 WHERE x2.int_CIP = y.int_CIP OR x2.int_EAN13 = y.int_CIP) = 1)"
    + " ORDER BY f.lg_ZONE_GEO_ID LIMIT 4").split('\n').map((l) => { const [id, cip, zone, stock] = l.split('|'); return { id, cip, zone, stock }; });
  ok('Jeu d\'essai : 4 produits de 4 rayons, avec stock à l\'emplacement d\'admin', P.length === 4 && new Set(P.map((x) => x.zone)).size === 4, JSON.stringify(P.map((x) => x.cip)));
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage();
  const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const t0 = performance.now(); const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 120) }; } j.http = r.status; j.ms = performance.now() - t0; return j; }, [m, u, c]);
  const lignesDe = (id) => q("SELECT CONCAT_WS('|', lg_FAMILLE_ID, bool_INVENTAIRE, int_NUMBER_INIT, int_NUMBER) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID = '" + id + "' ORDER BY lg_FAMILLE_ID");
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });

    const ean = '34009' + P[2].cip + '7';
    const c1 = await api('POST', '../api/v1/inventaire/creation', { str_NAME: 'E2E-46-A', str_TYPE_TRANSACTION: 'Emplacement',
      produits: [P[0].id, P[1].cip, ean, P[3].cip, 'ZZ-E2E-INCONNU'] });
    ok('Création : succès, 4 lignes, l\'inconnu rendu dans « inconnus »', c1.success === 1 && c1.lignes === 4 && !!c1.lgInventaireId && JSON.stringify(c1.inconnus) === '["ZZ-E2E-INCONNU"]', JSON.stringify(c1).slice(0, 250));
    const attendu = P.slice().sort((a, b) => (a.id < b.id ? -1 : 1)).map((x) => x.id + '|1|' + x.stock + '|' + x.stock).join('\n');
    ok('Exactement ces 4 produits, retenus, stock initial = stock de l\'emplacement (SQL)', lignesDe(c1.lgInventaireId) === attendu, lignesDe(c1.lgInventaireId).replace(/\n/g, ' ; ') + ' ≠ ' + attendu.replace(/\n/g, ' ; '));
    ok('EAN-13 « 34009 + CIP7 + clé » reconnu (49)', lignesDe(c1.lgInventaireId).indexOf(P[2].id + '|') >= 0);
    const rayons = await api('GET', '../api/v1/ws/inventaires/rayons?idInventaire=' + c1.lgInventaireId);
    const ids = (Array.isArray(rayons) ? rayons : Object.values(rayons).filter((x) => x && typeof x === 'object')).map((r) => r.id || r.rayonId || r.lgZONEGEOID).sort();
    ok('Rayons de l\'inventaire : les 4 rayons des produits, rien d\'autre', JSON.stringify(ids) === JSON.stringify(P.map((x) => x.zone).sort()), JSON.stringify(ids));
    ok('Inventaire à l\'emplacement d\'admin', q("SELECT lg_EMPLACEMENT_ID FROM t_inventaire WHERE lg_INVENTAIRE_ID = '" + c1.lgInventaireId + "'") === EMP);

    /* 47 : deux lignes ecartees -> rayons, etat des rayons et criteres « emplacement » ne montrent que les 2 rayons
       des lignes retenues */
    await api('POST', '../api/v1/inventaire/lignes/retenue', { lg_INVENTAIRE_ID: c1.lgInventaireId, produits: [P[2].id, P[3].id], retenue: false });
    const deux = [P[0].zone, P[1].zone].sort();
    const r2 = await api('GET', '../api/v1/ws/inventaires/rayons?idInventaire=' + c1.lgInventaireId);
    const ids2 = (Array.isArray(r2) ? r2 : Object.values(r2).filter((x) => x && typeof x === 'object')).map((r) => r.id || r.rayonId || r.lgZONEGEOID).sort();
    ok('47 : ws/inventaires/rayons limité aux rayons des lignes retenues', JSON.stringify(ids2) === JSON.stringify(deux), JSON.stringify(ids2));
    const e2 = await api('GET', '../api/v1/ws/inventaires/' + c1.lgInventaireId + '/rayons/etat');
    const ide = (Array.isArray(e2) ? e2 : Object.values(e2).filter((x) => x && typeof x === 'object')).map((r) => r.rayonId).sort();
    ok('47 : rayons/etat limité aux rayons à compter', JSON.stringify(ide) === JSON.stringify(deux), JSON.stringify(ide));
    const cr = await api('GET', '../api/v1/inventaire/criteres?axe=ZONE&lg_INVENTAIRE_ID=' + c1.lgInventaireId);
    const idc = (cr.results || []).map((r) => r.id || r.lg_ZONE_GEO_ID || r.value).filter((x) => x).sort();
    ok('47 : critères « emplacement » limités aux lignes retenues (plus « Tous »)', (cr.results || []).length === 3 && JSON.stringify(idc) === JSON.stringify(deux), JSON.stringify(cr.results).slice(0, 250));

    const c2 = await api('POST', '../api/v1/inventaire/creation', { str_NAME: 'E2E-46-B', str_TYPE_TRANSACTION: 'Emplacement',
      valeurs: [P[0].zone], produits: [P[0].id, P[1].id] });
    ok('Avec « valeurs » : intersection (seul le produit du rayon choisi)', c2.success === 1 && c2.lignes === 1 && lignesDe(c2.lgInventaireId).split('\n').length === 1 && lignesDe(c2.lgInventaireId).startsWith(P[0].id + '|'), JSON.stringify(c2).slice(0, 200));

    const avant = q("SELECT COUNT(*) FROM t_inventaire");
    const c3 = await api('POST', '../api/v1/inventaire/creation', { str_NAME: 'E2E-46-C', str_TYPE_TRANSACTION: 'Emplacement', produits: ['ZZ-1', 'ZZ-2'] });
    ok('Tous inconnus : refus, aucun inventaire créé', c3.success === 0 && JSON.stringify(c3.inconnus) === '["ZZ-1","ZZ-2"]' && q("SELECT COUNT(*) FROM t_inventaire") === avant, JSON.stringify(c3).slice(0, 200));

    const trop = await api('POST', '../api/v1/inventaire/creation', { str_NAME: 'E2E-46-D', str_TYPE_TRANSACTION: 'Emplacement', produits: Array.from({ length: 501 }, (x, i) => 'ZZ' + i) });
    ok('501 éléments : 413, aucun inventaire', trop.http === 413 && q("SELECT COUNT(*) FROM t_inventaire") === avant, trop.http + ' ' + JSON.stringify(trop).slice(0, 120));

    const cinqCents = q("SELECT s.lg_FAMILLE_ID FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID WHERE s.lg_EMPLACEMENT_ID = '" + EMP + "' AND f.str_STATUT = 'enable' GROUP BY s.lg_FAMILLE_ID LIMIT 500").split('\n');
    const c4 = await api('POST', '../api/v1/inventaire/creation', { str_NAME: 'E2E-46-E', str_TYPE_TRANSACTION: 'Emplacement', produits: cinqCents });
    ok('500 éléments : accepté, 500 lignes retenues', c4.success === 1 && c4.lignes === 500 && q("SELECT COUNT(*) FROM t_inventaire_famille WHERE bool_INVENTAIRE = 1 AND lg_INVENTAIRE_ID = '" + c4.lgInventaireId + "'") === '500', JSON.stringify(c4).slice(0, 160) + ' ' + Math.round(c4.ms) + ' ms');
    ok('500 éléments : en moins de 5 s', c4.ms < 5000, Math.round(c4.ms) + ' ms');

    const sansProduits = await api('POST', '../api/v1/inventaire/creation', { str_NAME: 'E2E-46-F', str_TYPE_TRANSACTION: 'Emplacement', valeurs: [P[0].zone] });
    ok('Sans « produits » : comportement actuel (pas de champ inconnus)', sansProduits.success === 1 && !('inconnus' in sansProduits), JSON.stringify(sansProduits).slice(0, 160));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Inventaires du test retirés', q("SELECT COUNT(*) FROM t_inventaire WHERE str_NAME LIKE 'E2E-46-%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
