/* HISTORIQUE DES MOUVEMENTS apres un deconditionnement automatique a la vente (13/10).
 * Parcours de l'ecran de vente par son API (ajout, net a payer, cloture), comme la caisse ; puis l'ecran de vente
 * au depot (ajout, cloture), comme DepotCtr.
 * Produit au detail : 2 unites en rayon, 3 boites de N ; on en vend 3 -> une boite est ouverte automatiquement.
 *  - la ligne de deconditionnement va de 2 a 2 + N ;
 *  - la ligne de vente doit partir de 2 + N (le stock apres ouverture de la boite), et non de 2, et finir a N - 1 ;
 *  - chaque ligne est coherente (avant - quantite = apres) et la derniere ligne = le stock reel ;
 *  - fiche des mouvements de l'article : ouverture du jour = 2, fin du jour = N - 1 ;
 *  - vente au depot : la ligne d'entree en stock du depot doit MONTER de la quantite (avant + quantite = apres),
 *    et finir au stock reel du depot.
 * Tout ce que le test pose ou provoque est retire a la fin : ventes, reglements, mouvements, deconditionnements,
 * notifications, journal des deconditionnements, stocks et compteurs du produit, ligne de stock du depot, caisse d'essai.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const CAISSE = 'e2e-decon-caisse';
const QTE = 3;

/* produit au detail (boite parent de 3 a 50 unites), CIP unique, stocks a l'officine */
const [D, P, N, CIP] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, p.lg_FAMILLE_ID, p.int_NUMBERDETAIL, f.int_CIP) FROM t_famille f"
  + " JOIN t_famille p ON p.lg_FAMILLE_ID = f.lg_FAMILLE_PARENT_ID"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " JOIN t_famille_stock sp ON sp.lg_FAMILLE_ID = p.lg_FAMILLE_ID AND sp.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 1 AND p.int_NUMBERDETAIL BETWEEN 3 AND 50 AND f.int_PRICE > 0"
  + " AND (SELECT COUNT(*) FROM t_famille g WHERE g.int_CIP = f.int_CIP) = 1 ORDER BY f.str_NAME LIMIT 1").split('|');
const n = parseInt(N, 10);
/* depot d'essai : un depot existant du banc (type 2) et son client */
const [DEP, DEP_CLIENT] = q("SELECT CONCAT_WS('|', e.lg_EMPLACEMENT_ID, cc.lg_CLIENT_ID) FROM t_emplacement e"
  + " JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = e.lg_COMPTE_CLIENT_ID WHERE e.lg_EMPLACEMENT_ID <> '1'"
  + " AND e.str_STATUT = 'enable' AND e.lg_TYPEDEPOT_ID = '2' ORDER BY e.lg_EMPLACEMENT_ID LIMIT 1").split('|');

const stockLigne = (f, e) => q(`SELECT COALESCE((SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${f}' AND lg_EMPLACEMENT_ID = '${e}' LIMIT 1), '')`);
const stock = (f, e) => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${f}' AND lg_EMPLACEMENT_ID = '${e}' LIMIT 1`));
const ORIGINE = { d: stockLigne(D, '1'), p: stockLigne(P, '1'), dDep: stockLigne(D, DEP), pDep: stockLigne(P, DEP),
  fam: q(`SELECT GROUP_CONCAT(CONCAT_WS('|', lg_FAMILLE_ID, int_NBRE_SORTIE, COALESCE(dt_LAST_MOUVEMENT, 'NULL')) SEPARATOR ';') FROM t_famille WHERE lg_FAMILLE_ID IN ('${D}', '${P}')`) };
let caisseCreee = false;

const poserStocks = () => exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 2, int_NUMBER = 2 WHERE lg_FAMILLE_ID = '${D}' AND lg_EMPLACEMENT_ID = '1';`
  + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 3, int_NUMBER = 3 WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1';`);
/* lignes d'historique du test, dans l'ordre d'ecriture */
const lignes = (f, e) => q(`SELECT CONCAT_WS('|', typeMvt, qteDebut, qteMvt, qteFinale) FROM hmvtproduit WHERE lg_FAMILLE_ID = '${f}'`
  + ` AND lg_EMPLACEMENT_ID = '${e}' AND createdAt >= '${DEBUT}' ORDER BY createdAt, typeMvt`).split('\n').filter(Boolean)
  .map((l) => { const [t, a, m, z] = l.split('|'); return { t, a: +a, m: +m, z: +z }; });

function nettoyer() {
  const v = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`);
  exec("CREATE TEMPORARY TABLE e2e_dec_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_dec_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + `DELETE FROM hmvtproduit WHERE lg_FAMILLE_ID IN ('${D}', '${P}') AND createdAt >= '${DEBUT}';`
    + "DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN (SELECT id FROM e2e_dec_l);"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_dec_r);"
    + `DELETE FROM t_deconditionnement WHERE lg_FAMILLE_ID IN ('${D}', '${P}') AND dt_CREATED >= '${DEBUT}';`
    + `DELETE FROM notification WHERE entity_ref IN ('${D}', '${P}') AND created_at >= '${DEBUT}';`
    + `DELETE FROM t_suggestion_order_details WHERE lg_FAMILLE_ID IN ('${D}', '${P}') AND dt_CREATED >= '${DEBUT}';`
    + `DELETE FROM t_famille_history WHERE lg_FAMILLE_ID IN ('${D}', '${P}') AND dt_CREATED >= '${DEBUT}';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${DEBUT}' AND str_DESCRIPTION LIKE CONCAT('%[ ', (SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${P}'), ' ]%');`
    + "DROP TEMPORARY TABLE IF EXISTS e2e_dec_l; DROP TEMPORARY TABLE IF EXISTS e2e_dec_r;");
  for (const [f, e, o] of [[D, '1', ORIGINE.d], [P, '1', ORIGINE.p], [D, DEP, ORIGINE.dDep], [P, DEP, ORIGINE.pDep]]) {
    if (o) {
      const [a, b] = o.split('|');
      exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${a}, int_NUMBER = ${b} WHERE lg_FAMILLE_ID = '${f}' AND lg_EMPLACEMENT_ID = '${e}'`);
    } else {
      exec(`DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${f}' AND lg_EMPLACEMENT_ID = '${e}' AND dt_CREATED >= '${DEBUT}'`);
    }
  }
  for (const l of (ORIGINE.fam || '').split(';').filter(Boolean)) {
    const [f, s, d] = l.split('|');
    exec(`UPDATE t_famille SET int_NBRE_SORTIE = ${s}, dt_LAST_MOUVEMENT = ${d === 'NULL' ? 'NULL' : "'" + d + "'"} WHERE lg_FAMILLE_ID = '${f}';`
      + `DELETE FROM t_famille_history WHERE lg_FAMILLE_ID = '${f}' AND dt_CREATED >= '${DEBUT}'`);
  }
  if (caisseCreee) { exec(`DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '${CAISSE}'`); }
}

(async () => {
  ok('Jeu d\'essai : produit au détail (boîte de ' + n + ') et dépôt trouvés', D && P && n >= 3 && DEP && DEP_CLIENT, CIP + ' ' + DEP);
  if (q(`SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '${ADMIN}' AND str_STATUT = 'is_Using'`) === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + ` VALUES ('${CAISSE}', '${ADMIN}', 0, 0, CURDATE(), NOW(), '${ADMIN}', NOW(), '${ADMIN}', 'is_Using')`);
    caisseCreee = true;
  }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext()).newPage();
  const api = (m, u, c) => p.evaluate(async ([m, u, c]) => {
    const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined });
    const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { success: false, brut: t.slice(0, 200) }; }
  }, [m, u, c]);
  const coherente = (l) => l.a - l.m === l.z;
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const pu = Number(q(`SELECT int_PRICE FROM t_famille WHERE lg_FAMILLE_ID = '${D}'`));

    /* A. vente au comptant : 2 en rayon, on en vend 3 */
    poserStocks();
    const a = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: D, itemPu: pu, qte: QTE, qteServie: QTE,
      devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN });
    const venteA = a.data && a.data.lgPREENREGISTREMENTID;
    const net = (await api('POST', '../api/v1/vente/net/vno', { venteId: venteA, remiseId: '', checkUg: false })).data || {};
    const c = await api('POST', '../api/v1/vente/cloturer/vno', { venteId: venteA, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '',
      userVendeurId: ADMIN, montantRecu: net.montantNet, montantRemis: 0, montantPaye: net.montantNet, totalRecap: net.montantNet, partTP: 0, typeRegleId: '1',
      clientId: '', nom: '', commentaire: '', banque: '', lieux: '', marge: net.marge || 0, data: net,
      reglements: [{ typeReglement: '1', montant: net.montantNet, montantAttentu: net.montantNet }] });
    ok('A. Vente au comptant de ' + QTE + ' (2 en rayon) validée', venteA && c.success, JSON.stringify(c).slice(0, 200));
    let h = lignes(D, '1');
    let dec = h.find((l) => l.t === '05');
    let vte = h.find((l) => l.t === '02');
    ok('A. Boîte ouverte : déconditionnement 2 → ' + (2 + n), dec && dec.a === 2 && dec.z === 2 + n, JSON.stringify(dec));
    ok('A. Ligne de vente : part du stock après ouverture (' + (2 + n) + ' → ' + (2 + n - QTE) + ')', vte && vte.a === 2 + n && vte.z === 2 + n - QTE, JSON.stringify(vte));
    ok('A. Chaque ligne cohérente (avant − quantité = après, + pour le déconditionnement)', h.length >= 2 && h.every((l) => (l.t === '05' ? l.a + l.m === l.z : coherente(l))), JSON.stringify(h));
    ok('A. Dernière ligne = stock réel du produit', vte && vte.z === stock(D, '1'), (vte && vte.z) + ' / ' + stock(D, '1'));
    /* fiche des mouvements de l'article (ecran Suivi mouvement article), journee du jour */
    const jour = q('SELECT CURDATE()');
    const fiche = await api('GET', `../api/v1/produit/monitoringproduct?start=0&limit=50&dtStart=${jour}&dtEnd=${jour}&produitId=${D}`);
    const jourFiche = ((fiche && fiche.data) || []).find((l) => String(l.dateOperation || '').indexOf(jour) >= 0 || (fiche.data || []).length === 1) || {};
    ok('A. Fiche des mouvements : stock d\'ouverture du jour = 2 (avant ouverture de la boîte)', jourFiche.stockInit === 2, JSON.stringify(jourFiche).slice(0, 300));
    ok('A. Fiche des mouvements : stock de fin du jour = ' + (2 + n - QTE), jourFiche.stockFinal === 2 + n - QTE, jourFiche.stockFinal);
    const hp = lignes(P, '1');
    ok('A. Boîte : 3 → 2', hp.length === 1 && hp[0].a === 3 && hp[0].z === 2, JSON.stringify(hp));

    /* B. vente au depot (ecran DepotCtr), meme situation */
    exec(`DELETE FROM hmvtproduit WHERE lg_FAMILLE_ID IN ('${D}', '${P}') AND createdAt >= '${DEBUT}'`);
    poserStocks();
    const depAvant = stockLigne(D, DEP) ? stock(D, DEP) : 0;
    const bAdd = await api('POST', '../api/v1/vente/add/depot', { natureVenteId: '3', typeDepoId: '2', emplacementId: DEP, produitId: D, itemPu: pu,
      qte: QTE, qteServie: QTE, devis: false, depot: true, remiseDepot: 0, venteId: null, userVendeurId: ADMIN, clientId: DEP_CLIENT });
    const venteB = bAdd.data && bAdd.data.lgPREENREGISTREMENTID;
    const bClo = await api('POST', '../api/v1/vente/clotureVenteDepot', { natureVenteId: '3', venteId: venteB, userVendeurId: ADMIN, typeRegleId: '1',
      clientId: DEP_CLIENT, nom: '', commentaire: '', banque: '', lieux: 'lieux' });
    ok('B. Vente au dépôt de ' + QTE + ' (2 en rayon) validée', venteB && bClo.success, JSON.stringify(bClo).slice(0, 200));
    h = lignes(D, '1');
    dec = h.find((l) => l.t === '05');
    vte = h.find((l) => l.t === '12' || l.t === '02');
    ok('B. Officine : ligne de vente au dépôt part du stock après ouverture (' + (2 + n) + ' → ' + (2 + n - QTE) + ')', dec && vte && vte.a === dec.z && vte.z === 2 + n - QTE, JSON.stringify(h));
    ok('B. Officine : dernière ligne = stock réel', vte && vte.z === stock(D, '1'), (vte && vte.z) + ' / ' + stock(D, '1'));
    const hd = lignes(D, DEP);
    const ent = hd.find((l) => l.t === '01');
    ok('B. Dépôt : entrée en stock en hausse (' + depAvant + ' → ' + (depAvant + QTE) + ')', ent && ent.a === depAvant && ent.z === depAvant + QTE, JSON.stringify(hd));
    ok('B. Dépôt : dernière ligne = stock réel du dépôt', ent && ent.z === stock(D, DEP), (ent && ent.z) + ' / ' + stock(D, DEP));
  } finally {
    await b.close();
    nettoyer();
    ok('Données remises (stocks, compteurs, ventes, mouvements)', stockLigne(D, '1') === ORIGINE.d && stockLigne(P, '1') === ORIGINE.p
      && stockLigne(D, DEP) === ORIGINE.dDep && q(`SELECT COUNT(*) FROM hmvtproduit WHERE lg_FAMILLE_ID IN ('${D}', '${P}') AND createdAt >= '${DEBUT}'`) === '0'
      && q(`SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
