/* DONNEES DE L'EXTRANET DU GROSSISTE DANS LE TRAITEMENT DES SUGGESTIONS (demande du 09/11) :
 *   « afficher les produits avec UG (10 commandé 1 offert) en ajoutant une colonne dans le traitement des suggestions ;
 *     la zone peut être petite : une valeur parmi la liste et un survol affichera les autres » ;
 *   « savoir si un produit est en commande réellement chez le grossiste » ;
 *   « paramètre "afficher stock grossiste", par défaut 0 pour ne pas être affiché ».
 * Vrai ecran : liste des suggestions, recherche de la reference, ouverture du detail (meme chemin que les autres tests
 * de suggestion). Jeu d'essai (retire a la fin) :
 *   - suggestion S1, grossiste LABOREX-CI YOP lie a Ubipharm : produit A (3 paliers UG), B (1 palier), C (paliers
 *     seulement dans une lecture en ECHEC : ne compte pas) ;
 *   - suggestion S2, grossiste TEDIS PHARMA lie a TEDIS : produit D (stock GAGNOA Oui / BOUAKE Non, en commande x30 :
 *     CIP dans la designation), E (en commande x12 : designation tronquee « ... ») ;
 *   - suggestion S3, grossiste non lie : colonnes masquees.
 * Rapprochement : cellule (1re valeur, « +N ») et info-bulle (toutes) = API = regle ecrite a part, ligne par ligne.
 * Parametre KEY_AFFICHER_STOCK_GROSSISTE : 0 -> colonne de stock masquee et stock absent de l'API ; 1 -> affiche.
 * Bilan : suggestions, listes gardees, liens et parametre remis a l'identique (CHECKSUM), connexions d'essai retirees.
 *
 * Lancement (domain2, laborex_perf) :
 *   BASE=http://localhost:9080/prestige DB_TEST=laborex_perf E2E_BASE_LIBRE=1 PAYARA_DOMAINE=.../domain2 node test-ecran-suggestion-extranet-0911.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : ''));
}
const sql = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "''");

const garde = require('./garde-extranets');
garde.verifier(q, ENV_E2E.BASE, ENV_E2E.PAYARA_DOMAINE);
const TABLES = ['extranet_collecte', 'extranet_liste_ligne', 'extranet_grossiste'];
const YOP = '51217123167082947316', TEDIS = '51217123531215794892', DIVERS = '62199302197661034291';
const MARQUE = 'E2E-SGX-';
const PARAM = 'KEY_AFFICHER_STOCK_GROSSISTE';

(async () => {
  const debut = q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')");
  const journalTotal = q('SELECT COUNT(*) FROM t_event_log');
  const empreinte = (t) => q('CHECKSUM TABLE ' + t).split('\t')[1];
  const avant = { param: q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + PARAM + "'"), parametres: empreinte('t_parameters'),
    sugg: empreinte('t_suggestion_order'), details: empreinte('t_suggestion_order_details') };
  const sauve = garde.sauver(q, TABLES);
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  try {
    /* ---- produits du banc (avec stock a l'emplacement 1, CIP a 7 chiffres, nom long) */
    const prod = q("SELECT CONCAT(f.lg_FAMILLE_ID, '|', f.int_CIP, '|', f.str_NAME) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
      + " AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$' AND LENGTH(f.str_NAME) >= 20"
      + ' ORDER BY f.str_NAME LIMIT 6 OFFSET 300').split('\n').map((l) => { const c = l.split('|'); return { id: c[0], cip: c[1], nom: c[2] }; });
    const [A, B, C, D, E, F] = prod;
    if (!F) { throw new Error('banc : produits d\'essai introuvables'); }

    /* ---- listes gardees : seulement celles de l'essai (les lectures reelles sont copiees et remises a la fin) */
    q('DELETE FROM extranet_liste_ligne; DELETE FROM extranet_collecte; DELETE FROM extranet_grossiste;');
    q("INSERT INTO extranet_grossiste (lg_GROSSISTE_ID, source, modifie_le, modifie_par) VALUES ('" + YOP + "', 'UBIPHARM', NOW(), 'e2e'), ('"
      + TEDIS + "', 'TEDIS', NOW(), 'e2e')");
    const collecte = (source, module, statut) => {
      q("INSERT INTO extranet_collecte (source, module, utilisateur, debut, fin, statut, lignes_recues) VALUES ('" + source + "', '" + module
        + "', 'e2e', NOW(), NOW(), '" + statut + "', 0)");
      return q("SELECT MAX(id) FROM extranet_collecte WHERE module = '" + module + "'");
    };
    let pos = 0;
    const ligne = (c, liste, agence, pscode, cip, cellules) => q('INSERT INTO extranet_liste_ligne (collecte_id, liste, position, agence, pscode, cip, cellules)'
      + ' VALUES (' + c + ", '" + liste + "', " + (pos++) + ', ' + (agence ? "'" + sql(agence) + "'" : 'NULL') + ', ' + (pscode ? "'" + sql(pscode) + "'" : 'NULL')
      + ', ' + (cip ? "'" + sql(cip) + "'" : 'NULL') + ", '" + sql(JSON.stringify(cellules)) + "')");
    const UG_A = ['20 U → 02 UG', '50 U → 10 UG', '100 U → 25 UG'], UG_B = ['10 U → 1 UG'];
    const cu = collecte('UBIPHARM', 'LISTE_PRODUITS_UG', 'COMPLETE');
    ligne(cu, 'PRODUITS_UG', null, 'PSA01', A.cip, ['PSA01', A.nom, A.cip, 'En stock — YOP : Oui', UG_A.join(' ; ')]);
    ligne(cu, 'PRODUITS_UG', null, 'PSB01', B.cip, ['PSB01', B.nom, B.cip, 'En stock — YOP : Non', UG_B.join(' ; ')]);
    ligne(cu, 'PRODUITS_UG', null, 'PSZ99', '0000001', ['PSZ99', 'AUTRE PRODUIT', '0000001', 'En stock', '5 U → 1 UG']);
    const ce = collecte('UBIPHARM', 'LISTE_PRODUITS_UG', 'ECHEC');
    ligne(ce, 'PRODUITS_UG', null, 'PSC01', C.cip, ['PSC01', C.nom, C.cip, 'En stock', '30 U → 3 UG']);
    const ct = collecte('TEDIS', 'LISTE_TEDIS_CATALOGUE', 'COMPLETE');
    ligne(ct, 'TEDIS_CATALOGUE', 'GAGNOA', null, D.cip, ['GAGNOA', '', D.nom, D.cip, D.cip, 'NORMAL', '', '', 'LABO', 'Oui', '795', '1175', '48']);
    ligne(ct, 'TEDIS_CATALOGUE', 'BOUAKE', null, D.cip, ['BOUAKE', '', D.nom, D.cip, D.cip, 'NORMAL', '', '', 'LABO', 'Non', '795', '1175', '48']);
    const cc = collecte('TEDIS', 'LISTE_TEDIS_COMMANDES_ATTENTE', 'COMPLETE');
    ligne(cc, 'TEDIS_COMMANDES_ATTENTE', '29/10/2026 13:03:22', null, null, ['29/10/2026 13:03:22', D.nom + ' CIP : ' + D.cip + ' / EAN : ' + D.cip + ' - Colisage : 100', '30', '1 495 F', '2 260 F']);
    ligne(cc, 'TEDIS_COMMANDES_ATTENTE', '17/10/2026 12:52:00', null, null, ['17/10/2026 12:52:00', E.nom.slice(0, 18) + '...', '12', '3 982 F', '4 770 F']);
    ligne(cc, 'TEDIS_COMMANDES_ATTENTE', '01/10/2026 08:00:00', null, null, ['01/10/2026 08:00:00', 'PRODUIT SANS RAPPORT B/10', '5', '1 F', '2 F']);

    /* ---- suggestions */
    const SUG = { S1: { g: YOP, l: [A, B, C] }, S2: { g: TEDIS, l: [D, E] }, S3: { g: DIVERS, l: [F] } };
    for (const [k, s] of Object.entries(SUG)) {
      q("INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('" + MARQUE + k
        + "', '" + MARQUE + k + "', '" + s.g + "', 'is_Process', NOW(), NOW())");
      s.l.forEach((pr, i) => q('INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID,'
        + " int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg) VALUES ('" + MARQUE + k + 'L' + i + "', '"
        + MARQUE + k + "', '" + s.g + "', '" + pr.id + "', " + (i + 2) + ', ' + (100 * (i + 2)) + ', 150, 100, NOW(), NOW(), \'is_Process\', 0)'));
    }
    q("UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = '" + PARAM + "'");

    /* regle attendue, ecrite a part */
    const attendu = {
      [A.id]: { ug: UG_A, stock: ['En stock — YOP : Oui'], cde: '' }, [B.id]: { ug: UG_B, stock: ['En stock — YOP : Non'], cde: '' },
      [C.id]: { ug: [], stock: [], cde: '' }, [D.id]: { ug: [], stock: ['GAGNOA : Oui', 'BOUAKE : Non'], cde: 'Oui (30)' },
      [E.id]: { ug: [], stock: [], cde: 'Oui (12)' } };
    const texteListe = (l) => (l.length ? l[0] + (l.length > 1 ? ' +' + (l.length - 1) : '') : '');

    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    const ouvrir = async (ref, n) => {
      await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
      await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0, null, { timeout: 30000 });
      await p.waitForTimeout(2000);
      await p.evaluate((r) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; if (g.down('#filtreStatut')) { g.down('#filtreStatut').setValue(''); }
        Ext.getCmp('rechecher').setValue(r); g.onRechClick(); }, ref);
      await p.waitForFunction((r) => { const st = Ext.ComponentQuery.query('i_sugg_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF', r) >= 0; }, ref, { timeout: 30000 });
      await p.evaluate((r) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF', r)); }, ref);
      await p.waitForFunction((x) => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && !g.getStore().isLoading() && g.getStore().getCount() === x; }, n, { timeout: 60000 });
      await p.waitForTimeout(1200);
    };
    /* cellules visibles des colonnes de l'extranet, et info-bulles */
    const lire = () => p.evaluate(() => {
      const g = Ext.getCmp('gridpanelSuggestionID'), v = g.getView();
      const col = (id) => g.down('#' + id);
      const cel = (r, id) => { const c = col(id); if (!c.isVisible()) { return null; } const td = v.getCell(r, c); return td ? { t: td.dom.textContent.trim(), b: td.dom.getAttribute('data-qtip') || '' } : null; };
      return { visibles: ['colUgGrossiste', 'colStockGrossiste', 'colEnCdeGrossiste'].map((id) => col(id).isVisible()),
        titres: ['colUgGrossiste', 'colStockGrossiste'].map((id) => col(id).text),
        lignes: g.getStore().getRange().map((r) => ({ id: r.get('lg_FAMILLE_ID'), ug: cel(r, 'colUgGrossiste'), stock: cel(r, 'colStockGrossiste'),
          cde: cel(r, 'colEnCdeGrossiste'), raw: r.raw.extranet || null })) };
    });
    const api = (ref) => p.evaluate((r) => fetch('../api/v1/suggestion/list/items?orderId=' + encodeURIComponent(r) + '&start=0&limit=50').then((x) => x.json()), ref);

    /* ---- S1 Ubipharm, parametre a 0 */
    await ouvrir(MARQUE + 'S1', 3);
    let e = await lire();
    ok('S1 (Ubipharm) : colonnes UG et en commande visibles, stock masqué (paramètre à 0)', e.visibles.join() === 'true,false,true', e.visibles.join());
    ok('S1 : titre « UG Ubipharm »', e.titres[0] === 'UG Ubipharm', e.titres.join(' / '));
    const ecartsUg = [];
    e.lignes.forEach((l) => {
      const a = attendu[l.id];
      if (!a || !l.ug || l.ug.t !== texteListe(a.ug) || (a.ug.length && l.ug.b.split('<br>').join('|') !== a.ug.join('|'))) {
        ecartsUg.push(l.id + ' : ' + JSON.stringify(l.ug));
      }
    });
    ok('rapprochement UG : cellule = 1re valeur « +N », info-bulle = toutes (A 3 paliers, B 1, C rien : lecture en échec)', e.lignes.length === 3 && ecartsUg.length === 0, ecartsUg.join(' | '));
    let r = await api(MARQUE + 'S1');
    ok('API (paramètre à 0) : aucun stock envoyé, extranet Ubipharm', r.extranet && r.extranet.source === 'UBIPHARM' && r.extranet.stockAffiche === false
      && r.data.every((l) => l.extranet && !('stock' in l.extranet)), JSON.stringify(r.extranet));
    ok('API = écran : UG ligne par ligne', r.data.every((l) => JSON.stringify(l.extranet.ug) === JSON.stringify(attendu[l.lg_FAMILLE_ID].ug)));

    /* ---- parametre a 1 : stock affiche apres actualisation de la page */
    q("UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = '" + PARAM + "'");
    const relu = p.waitForResponse((x) => x.url().indexOf('/suggestion/list/items') >= 0, { timeout: 60000 });
    await vues.cliquer(p, '#gridpanelSuggestionID pagingtoolbar #refresh');
    await relu;
    await p.waitForTimeout(1500);
    e = await lire();
    ok('paramètre à 1 : colonne « STOCK UBIPHARM » visible', e.visibles[1] === true && e.titres[1] === 'STOCK UBIPHARM', e.titres.join(' / '));
    const ecartsSt = e.lignes.filter((l) => !l.stock || l.stock.t !== texteListe(attendu[l.id].stock)).map((l) => l.id + ' ' + JSON.stringify(l.stock));
    ok('rapprochement stock : écran = extranet (A Oui, B Non, C vide)', ecartsSt.length === 0, ecartsSt.join(' | '));

    /* ---- S2 TEDIS : stock par agence et commandes en attente */
    await ouvrir(MARQUE + 'S2', 2);
    e = await lire();
    ok('S2 (TEDIS) : trois colonnes visibles, titres TEDIS', e.visibles.join() === 'true,true,true' && e.titres[0] === 'UG TEDIS', e.titres.join(' / '));
    const lD = e.lignes.find((l) => l.id === D.id), lE = e.lignes.find((l) => l.id === E.id);
    ok('stock TEDIS par agence : « GAGNOA : Oui +1 », info-bulle des deux agences', lD && lD.stock.t === 'GAGNOA : Oui +1'
      && lD.stock.b === 'GAGNOA : Oui<br>BOUAKE : Non', JSON.stringify(lD && lD.stock));
    ok('en commande chez TEDIS : D « Oui (30) » (CIP dans la désignation), E « Oui (12) » (désignation tronquée)',
      lD && lD.cde.t === attendu[D.id].cde && lE && lE.cde.t === attendu[E.id].cde, JSON.stringify([lD && lD.cde, lE && lE.cde]));
    ok('info-bulle « en commande » : date et quantité', lD && /29\/10\/2026 13:03:22 : 30/.test(lD.cde.b), lD && lD.cde.b);
    r = await api(MARQUE + 'S2');
    ok('API = écran : commandes en attente (1 ligne chacune), produit sans rapport ignoré', r.data.every((l) => l.extranet.enCommande.length === 1));

    /* ---- S3 grossiste non lie */
    await ouvrir(MARQUE + 'S3', 1);
    e = await lire();
    ok('S3 (grossiste sans extranet) : colonnes masquées', e.visibles.join() === 'false,false,false', e.visibles.join());
    r = await api(MARQUE + 'S3');
    ok('API : extranet null, lignes sans données d\'extranet', r.extranet === null && r.data.every((l) => !l.extranet));

    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('déroulé sans exception', false, x.stack || x.message);
  } finally {
    await navigateur.close();
    q("DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID LIKE '" + MARQUE + "%'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID LIKE '"
      + MARQUE + "%'; UPDATE t_parameters SET str_VALUE = '" + sql(avant.param) + "' WHERE str_KEY = '" + PARAM + "'");
    const ecarts = garde.restaurer(q, TABLES, sauve);
    q("DELETE FROM t_event_log WHERE dt_CREATED >= '" + debut + "' AND lg_USER_ID = (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '"
      + ENV_E2E.LOGIN.replace(/'/g, "''") + "') AND str_TABLE_CONCERN = 'dal.TUser'");
    ok('bilan : suggestions d\'essai retirées (tables identiques)', empreinte('t_suggestion_order') === avant.sugg && empreinte('t_suggestion_order_details') === avant.details);
    ok('bilan : paramètre remis (' + avant.param + '), t_parameters identique', empreinte('t_parameters') === avant.parametres);
    ok('bilan : listes gardées et liens remis à l\'identique', ecarts.length === 0, ecarts.join(', '));
    ok('bilan : journal des connexions d\'essai retiré', q('SELECT COUNT(*) FROM t_event_log') === journalTotal);
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
