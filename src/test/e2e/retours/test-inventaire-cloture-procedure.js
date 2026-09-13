/* Cloture d'inventaire (13/09) : la cloture REST ecrit ce que la procedure stockee proc_clotureinentaire ecrivait,
 * et vite. Deux inventaires identiques sont poses (40 produits, 14 ecarts) : A est cloture par la procedure,
 * B par l'API ; les ecritures de B doivent etre celles que la procedure aurait faites en second passage le meme
 * jour (cumul du mouvement, instantane mis a jour). Un troisieme inventaire de 1 500 lignes mesure la duree.
 * Tout ce qui est pose est retire et les stocks sont remis a l'identique. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const IDS = ['E2E-INV-PROC-A', 'E2E-INV-PROC-B', 'E2E-INV-PROC-C'];
const T0 = q('SELECT NOW()');
const USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
function poser(id, nb) {
  exec("INSERT INTO t_inventaire (lg_INVENTAIRE_ID, str_NAME, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, lg_EMPLACEMENT_ID) VALUES ('" + id + "', '" + id + "', '" + id + "', 'emplacement', 'enable', NOW(), NOW(), '" + USER + "', '1');"
    + "INSERT INTO t_inventaire_famille (lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, str_STATUT, dt_CREATED, dt_UPDATED, bool_INVENTAIRE, str_UPDATED_ID, lg_FAMILLE_STOCK_ID)"
    + " SELECT '" + id + "', b.lg_FAMILLE_ID, IF(RAND(7) < 0.34, b.int_NUMBER_AVAILABLE + 2, b.int_NUMBER_AVAILABLE), b.int_NUMBER_AVAILABLE, 'enable', NOW(), NOW(), 1, '', b.lg_FAMILLE_STOCK_ID"
    + " FROM e2e_sauvegarde_proc b ORDER BY b.lg_FAMILLE_ID LIMIT " + nb + ";");
}
function retablir() {
  exec("UPDATE t_famille_stock s JOIN e2e_sauvegarde_proc b ON b.lg_FAMILLE_STOCK_ID=s.lg_FAMILLE_STOCK_ID SET s.int_NUMBER=b.int_NUMBER, s.int_NUMBER_AVAILABLE=b.int_NUMBER_AVAILABLE, s.dt_UPDATED=b.dt_UPDATED;"
    + "UPDATE t_type_stock_famille t JOIN e2e_sauvegarde_proc b ON b.lg_FAMILLE_ID=t.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID='1' AND t.lg_TYPE_STOCK_ID='1' SET t.int_NUMBER=b.type_stock, t.dt_UPDATED=b.type_dt;"
    + "UPDATE t_famille f JOIN e2e_sauvegarde_proc b ON b.lg_FAMILLE_ID=f.lg_FAMILLE_ID SET f.dt_LAST_INVENTAIRE=b.dt_last;"
    + "DELETE FROM t_mouvement WHERE str_ACTION='INVENTAIRE' AND dt_CREATED >= '" + T0 + "' AND lg_FAMILLE_ID IN (SELECT lg_FAMILLE_ID FROM e2e_sauvegarde_proc);"
    + "DELETE FROM t_mouvement_snapshot WHERE dt_CREATED >= '" + T0 + "' AND lg_FAMILLE_ID IN (SELECT lg_FAMILLE_ID FROM e2e_sauvegarde_proc);"
    + "DELETE FROM HMvtProduit WHERE typeMvt='04' AND createdAt >= '" + T0 + "';"
    + IDS.map(i => "DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + i + "'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + i + "';").join('')
    + "DROP TABLE IF EXISTS e2e_sauvegarde_proc;");
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  try {
    // sauvegarde des 1 500 produits touches (stock rayon, stock type 1, date du dernier inventaire)
    exec("DROP TABLE IF EXISTS e2e_sauvegarde_proc; CREATE TABLE e2e_sauvegarde_proc AS SELECT s.lg_FAMILLE_STOCK_ID, s.lg_FAMILLE_ID, s.int_NUMBER, s.int_NUMBER_AVAILABLE, s.dt_UPDATED, f.dt_LAST_INVENTAIRE AS dt_last, t.int_NUMBER AS type_stock, t.dt_UPDATED AS type_dt FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID=s.lg_FAMILLE_ID LEFT JOIN t_type_stock_famille t ON t.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID='1' AND t.lg_TYPE_STOCK_ID='1' AND t.str_STATUT='enable' WHERE s.lg_EMPLACEMENT_ID='1' AND f.str_STATUT='enable' AND NOT EXISTS (SELECT 1 FROM t_mouvement m WHERE m.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND m.dt_DAY=CURDATE() AND m.str_ACTION='INVENTAIRE') ORDER BY s.lg_FAMILLE_ID LIMIT 1500;");
    IDS.forEach(i => exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + i + "'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + i + "';"));
    poser(IDS[0], 40); poser(IDS[1], 40); poser(IDS[2], 1500);
    const ecarts = Number(q("SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + IDS[1] + "' AND int_NUMBER<>int_NUMBER_INIT"));
    ok('Jeu d essai : deux inventaires identiques de 40 lignes avec des ecarts', ecarts > 0 && q("SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + IDS[0] + "' AND int_NUMBER<>int_NUMBER_INIT") === String(ecarts), ecarts);

    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 30000 });
    const cloturer = async (id) => { const t = Date.now(); const r = await p.evaluate(async (u) => { const x = await fetch(u, { method: 'PUT', headers: { 'Content-Type': 'application/json' } }); return { statut: x.status, corps: await x.text() }; }, '../api/v1/commande/clotureinventaire/' + id); r.ms = Date.now() - t; return r; };

    /* A : la procedure stockee de l ancien ecran */
    const nbProc = q("CALL proc_clotureinentaire('1','" + USER + "','" + IDS[0] + "','1')");
    ok('Procedure stockee : A cloture, lignes avec ecart traitees', nbProc === String(ecarts) && q("SELECT str_STATUT FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + IDS[0] + "'") === 'is_Closed', nbProc);
    const apresProc = q("SELECT COUNT(*), SUM(int_NUMBERTRANSACTION), SUM(int_NUMBER) FROM t_mouvement WHERE str_ACTION='INVENTAIRE' AND dt_DAY=CURDATE() AND lg_USER_ID='" + USER + "' AND lg_FAMILLE_ID IN (SELECT lg_FAMILLE_ID FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + IDS[0] + "' AND int_NUMBER<>int_NUMBER_INIT)").split('\t');
    const sommeComptee = q("SELECT SUM(int_NUMBER) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + IDS[0] + "' AND int_NUMBER<>int_NUMBER_INIT");
    ok('Procedure : un mouvement du jour par produit avec ecart', apresProc[0] === String(ecarts) && apresProc[1] === String(ecarts) && apresProc[2] === sommeComptee, apresProc.join('/'));

    /* B : l API, sur les memes produits, le meme jour : elle doit CUMULER comme la procedure l aurait fait */
    const rb = await cloturer(IDS[1]);
    ok('API : B cloture, meme compte de lignes que la procedure', rb.statut === 200 && rb.corps.includes('"success":true') && rb.corps.includes(ecarts + ' Article'), rb.corps);
    const apresApi = q("SELECT COUNT(*), SUM(int_NUMBERTRANSACTION), SUM(int_NUMBER) FROM t_mouvement WHERE str_ACTION='INVENTAIRE' AND dt_DAY=CURDATE() AND lg_USER_ID='" + USER + "' AND lg_FAMILLE_ID IN (SELECT lg_FAMILLE_ID FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + IDS[1] + "' AND int_NUMBER<>int_NUMBER_INIT)").split('\t');
    ok('API : t_mouvement cumule (toujours une ligne par produit, transactions 2, quantite doublee)', apresApi[0] === String(ecarts) && apresApi[1] === String(2 * ecarts) && apresApi[2] === String(2 * Number(sommeComptee)), apresApi.join('/'));
    const snap = q("SELECT COUNT(*), SUM(int_NUMBERTRANSACTION), SUM(int_STOCK_JOUR = i.int_NUMBER), SUM(int_STOCK_DEBUT = i.int_NUMBER_INIT) FROM t_mouvement_snapshot m JOIN t_inventaire_famille i ON i.lg_FAMILLE_ID=m.lg_FAMILLE_ID AND i.lg_INVENTAIRE_ID='" + IDS[1] + "' AND i.int_NUMBER<>i.int_NUMBER_INIT WHERE m.dt_DAY=CURDATE() AND m.lg_EMPLACEMENT_ID='1'").split('\t');
    ok('API : instantane du jour (cree par la procedure, mis a jour par l API : transactions 2, stock du jour = compte)', snap[0] === String(ecarts) && snap[1] === String(2 * ecarts) && snap[2] === String(ecarts) && snap[3] === String(ecarts), snap.join('/'));
    const stocks = q("SELECT SUM(s.int_NUMBER = i.int_NUMBER AND s.int_NUMBER_AVAILABLE = i.int_NUMBER), SUM(t.int_NUMBER = i.int_NUMBER), SUM(DATE(f.dt_LAST_INVENTAIRE) = CURDATE()) FROM t_inventaire_famille i JOIN t_famille_stock s ON s.lg_FAMILLE_STOCK_ID=i.lg_FAMILLE_STOCK_ID JOIN t_famille f ON f.lg_FAMILLE_ID=i.lg_FAMILLE_ID LEFT JOIN t_type_stock_famille t ON t.lg_FAMILLE_ID=i.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID='1' AND t.lg_TYPE_STOCK_ID='1' AND t.str_STATUT='enable' WHERE i.lg_INVENTAIRE_ID='" + IDS[1] + "' AND i.int_NUMBER<>i.int_NUMBER_INIT").split('\t');
    const avecType = q("SELECT COUNT(*) FROM t_inventaire_famille i JOIN t_type_stock_famille t ON t.lg_FAMILLE_ID=i.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID='1' AND t.lg_TYPE_STOCK_ID='1' AND t.str_STATUT='enable' WHERE i.lg_INVENTAIRE_ID='" + IDS[1] + "' AND i.int_NUMBER<>i.int_NUMBER_INIT");
    ok('API : stock rayon, stock par type et date du dernier inventaire poses comme la procedure', stocks[0] === String(ecarts) && stocks[1] === avecType && stocks[2] === String(ecarts), stocks.join('/') + ' type=' + avecType);
    const lignes = q("SELECT SUM(str_STATUT='is_Closed'), SUM(str_STATUT='enable') FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + IDS[1] + "'").split('\t');
    ok('API : lignes avec ecart « is_Closed », les autres inchangees, en-tete « is_Closed »', lignes[0] === String(ecarts) && lignes[1] === String(40 - ecarts) && q("SELECT str_STATUT FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + IDS[1] + "'") === 'is_Closed', lignes.join('/'));
    const hist = q("SELECT COUNT(*), SUM(qteDebut = i.int_NUMBER_INIT AND qteFinale = i.int_NUMBER AND qteMvt = i.int_NUMBER) FROM HMvtProduit h JOIN t_inventaire_famille i ON CAST(i.lg_INVENTAIRE_FAMILLE_ID AS CHAR)=h.pkey WHERE i.lg_INVENTAIRE_ID='" + IDS[1] + "' AND h.typeMvt='04'").split('\t');
    ok('API : historique HMvtProduit conserve, une ligne par ligne retenue (comme avant)', hist[0] === '40' && hist[1] === '40', hist.join('/'));

    /* C : 1 500 lignes, duree */
    const rc = await cloturer(IDS[2]);
    ok('1 500 lignes cloturees en moins de 5 s (10 s auparavant sur ce bench)', rc.statut === 200 && rc.corps.includes('"success":true') && rc.ms < 5000, rc.ms + ' ms ' + rc.corps);
    const ecartsC = q("SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + IDS[2] + "' AND int_NUMBER<>int_NUMBER_INIT");
    const creesC = q("SELECT (SELECT COUNT(*) FROM t_mouvement m WHERE m.str_ACTION='INVENTAIRE' AND m.dt_DAY=CURDATE() AND m.lg_USER_ID='" + USER + "' AND m.lg_FAMILLE_ID IN (SELECT lg_FAMILLE_ID FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + IDS[2] + "' AND int_NUMBER<>int_NUMBER_INIT)), (SELECT COUNT(*) FROM t_mouvement_snapshot m WHERE m.dt_DAY=CURDATE() AND m.lg_EMPLACEMENT_ID='1' AND m.lg_FAMILLE_ID IN (SELECT lg_FAMILLE_ID FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + IDS[2] + "' AND int_NUMBER<>int_NUMBER_INIT))").split('\t');
    ok('API : un mouvement et un instantane du jour par produit avec ecart (crees, ou cumules pour les 13 deja vus)', creesC[0] === ecartsC && creesC[1] === ecartsC, ecartsC + ' -> ' + creesC.join('/'));

    /* D : inventaire reserve, seul le stock reserve (type 2) bouge */
    const RES = 'E2E-INV-PROC-D'; IDS.push(RES);
    exec("INSERT INTO t_inventaire (lg_INVENTAIRE_ID, str_NAME, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, lg_EMPLACEMENT_ID) VALUES ('" + RES + "', 'E2E reserve', 'E2E reserve', 'reserve', 'enable', NOW(), NOW(), '" + USER + "', '1');"
      + "INSERT INTO t_inventaire_famille (lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, str_STATUT, dt_CREATED, dt_UPDATED, bool_INVENTAIRE, str_UPDATED_ID, lg_FAMILLE_STOCK_ID) SELECT '" + RES + "', t.lg_FAMILLE_ID, IFNULL(t.int_NUMBER,0) + 5, IFNULL(t.int_NUMBER,0), 'enable', NOW(), NOW(), 1, '', b.lg_FAMILLE_STOCK_ID FROM t_type_stock_famille t JOIN e2e_sauvegarde_proc b ON b.lg_FAMILLE_ID=t.lg_FAMILLE_ID WHERE t.lg_TYPE_STOCK_ID='2' AND t.lg_EMPLACEMENT_ID='1' AND t.str_STATUT='enable' ORDER BY t.lg_FAMILLE_ID LIMIT 5;");
    const nbRes = Number(q("SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + RES + "'"));
    if (nbRes > 0) {
      const avantRayon = q("SELECT SUM(s.int_NUMBER) FROM t_famille_stock s JOIN t_inventaire_famille i ON i.lg_FAMILLE_STOCK_ID=s.lg_FAMILLE_STOCK_ID WHERE i.lg_INVENTAIRE_ID='" + RES + "'");
      const rd = await cloturer(RES);
      const apresRes = q("SELECT SUM(t.int_NUMBER = i.int_NUMBER), (SELECT SUM(s.int_NUMBER) FROM t_famille_stock s JOIN t_inventaire_famille j ON j.lg_FAMILLE_STOCK_ID=s.lg_FAMILLE_STOCK_ID WHERE j.lg_INVENTAIRE_ID='" + RES + "') FROM t_inventaire_famille i JOIN t_type_stock_famille t ON t.lg_FAMILLE_ID=i.lg_FAMILLE_ID AND t.lg_TYPE_STOCK_ID='2' AND t.lg_EMPLACEMENT_ID='1' AND t.str_STATUT='enable' WHERE i.lg_INVENTAIRE_ID='" + RES + "'").split('\t');
      ok('Inventaire reserve : stock reserve (type 2) = compte, stock rayon intact, en-tete cloture', rd.corps.includes('"success":true') && apresRes[0] === String(nbRes) && apresRes[1] === avantRayon && q("SELECT str_STATUT FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + RES + "'") === 'is_Closed', rd.corps + ' ' + apresRes.join('/'));
      exec("UPDATE t_type_stock_famille t JOIN t_inventaire_famille i ON i.lg_FAMILLE_ID=t.lg_FAMILLE_ID AND i.lg_INVENTAIRE_ID='" + RES + "' SET t.int_NUMBER=i.int_NUMBER_INIT WHERE t.lg_TYPE_STOCK_ID='2' AND t.lg_EMPLACEMENT_ID='1' AND t.str_STATUT='enable';");
    } else {
      ok('Inventaire reserve : pas de stock reserve sur ce bench, cas non joue', true);
    }
  } catch (e) { ok('Deroulement sans exception', false, e.stack || e.message); }
  retablir();
  const restants = q("SELECT COUNT(*) FROM t_inventaire WHERE lg_INVENTAIRE_ID LIKE 'E2E-INV-PROC-%'");
  ok('Jeu d essai retire', restants === '0');
  await b.close();
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS');
  process.exit(ko ? 1 : 0);
})();
