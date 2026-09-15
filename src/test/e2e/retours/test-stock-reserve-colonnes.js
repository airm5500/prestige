/* Evolution 5, point 4 : la reserve dans « comparaison stock article » et « etat de stock ».
 * Les deux ecrans n'affichaient qu'une quantite, qui etait en fait le stock du RAYON
 * (t_famille_stock.int_NUMBER_AVAILABLE) : la reserve (t_type_stock_famille, type 2) restait invisible, et
 * rien ne donnait le total detenu sur l'emplacement. Les trois quantites - rayon, reserve et total -
 * figurent desormais dans les deux grilles et dans leurs exports.
 * Les lignes de reserve posees par le test et le parametre AFFICHER_STOCK sont remis en etat a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const MARQUE = 'E2E-RESERVE';
const afficherStockOrigine = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY='AFFICHER_STOCK'");

function nettoyer() {
  exec("DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '" + MARQUE + "%';"
    + "UPDATE t_parameters SET str_VALUE='" + (afficherStockOrigine || '0') + "' WHERE str_KEY='AFFICHER_STOCK';");
}

/* Trois articles ayant du stock rayon recoivent une reserve ; un quatrieme n'en recoit pas, pour verifier
   qu'un article sans ligne de reserve vaut zero et non un vide. */
function poser() {
  nettoyer();
  // Le stock doit etre visible, sinon les deux ecrans masquent les quantites (parametre AFFICHER_STOCK).
  exec("UPDATE t_parameters SET str_VALUE='1' WHERE str_KEY='AFFICHER_STOCK';");
  const lignes = q("SELECT GROUP_CONCAT(CONCAT(id, ':', dispo) SEPARATOR '|') FROM ("
    + " SELECT f.lg_FAMILLE_ID id, s.int_NUMBER_AVAILABLE dispo FROM t_famille f"
    + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE f.str_STATUT='enable' AND s.int_NUMBER_AVAILABLE>5 ORDER BY f.str_NAME LIMIT 4) x")
    .split('|').map((x) => ({ id: x.split(':')[0], rayon: parseInt(x.split(':')[1], 10) }));
  const reserves = [7, 13, 25];
  lignes.slice(0, 3).forEach((a, i) => {
    a.reserve = reserves[i];
    exec("INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID,"
      + " lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)"
      + " VALUES ('" + MARQUE + '-' + i + "', '" + a.id + "', '2', '1', 'Stock reserve', 'E2E', NOW(), NOW(),"
      + " 'enable', " + a.reserve + ");");
  });
  lignes[3].reserve = 0; // aucune ligne posee : la reserve doit valoir zero
  return lignes;
}

const appeler = (p, url) => p.evaluate(async (u) => {
  const r = await fetch(u);
  return { statut: r.status, corps: await r.text() };
}, url);

(async () => {
  const articles = poser();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 950 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* ---------- comparaison stock article ---------- */
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('famillestockcomparaisonmanager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillestockcomparaisonmanager gridpanel').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(5000);

    const colonnesComp = await p.evaluate(() => Ext.ComponentQuery.query('famillestockcomparaisonmanager gridpanel')[0]
      .columns.filter((c) => c.dataIndex).map((c) => [c.dataIndex, c.text]));
    ok('Comparaison : les trois colonnes rayon, reserve et total sont presentes',
      colonnesComp.some((c) => c[0] === 'stock' && /Rayon/i.test(c[1]))
      && colonnesComp.some((c) => c[0] === 'stockReserve' && /R.serve/i.test(c[1]))
      && colonnesComp.some((c) => c[0] === 'stockTotal' && /Total/i.test(c[1])), JSON.stringify(colonnesComp));

    const champsComp = await p.evaluate(() => Ext.ComponentQuery.query('famillestockcomparaisonmanager gridpanel')[0]
      .getStore().model.getFields().map((f) => f.name));
    ok('Comparaison : les champs sont declares dans le store',
      champsComp.indexOf('stockReserve') >= 0 && champsComp.indexOf('stockTotal') >= 0, JSON.stringify(champsComp.length));

    // On cherche chacun des articles poses et on lit sa ligne
    for (const a of articles) {
      const cip = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID='" + a.id + "'");
      await p.evaluate((c) => {
        const e = Ext.ComponentQuery.query('famillestockcomparaisonmanager')[0];
        e.down('#query').setValue(c);
        testextjs.app.getController('ComparaisonCtr').doSearch();
      }, cip);
      await p.waitForTimeout(3000);
      const ligne = await p.evaluate((c) => {
        const g = Ext.ComponentQuery.query('famillestockcomparaisonmanager gridpanel')[0];
        let trouve = null;
        g.getStore().each((r) => { if (r.get('code') === c) { trouve = { rayon: r.get('stock'), reserve: r.get('stockReserve'), total: r.get('stockTotal') }; } });
        return trouve;
      }, cip);
      ok('Comparaison : ' + cip + ' affiche rayon ' + a.rayon + ', reserve ' + a.reserve + ', total '
        + (a.rayon + a.reserve),
        !!ligne && ligne.rayon === a.rayon && ligne.reserve === a.reserve && ligne.total === a.rayon + a.reserve,
        JSON.stringify(ligne));
    }

    /* l export Excel de la comparaison porte les trois en-tetes */
    const cipUn = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID='" + articles[0].id + "'");
    const exp = await appeler(p, '../api/v1/fichearticle/comparaison/csv?query=' + encodeURIComponent(cipUn)
      + '&codeFamile=&codeRayon=&codeGrossiste=&stock=0&seuil=0');
    ok('Comparaison : l export CSV porte les trois colonnes et les trois valeurs',
      exp.statut === 200 && /Stock rayon;Stock réserve;Stock total/.test(exp.corps)
      && new RegExp(';' + articles[0].rayon + ';' + articles[0].reserve + ';' + (articles[0].rayon + articles[0].reserve) + ';').test(exp.corps),
      exp.corps.split('\r\n').slice(0, 3).join(' || '));

    /* ---------- etat de stock ---------- */
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('etatstock', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('etatstock').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(4000);

    const colonnesEtat = await p.evaluate(() => Ext.ComponentQuery.query('etatstock')[0]
      .columns.filter((c) => c.dataIndex).map((c) => [c.dataIndex, c.text]));
    ok('Etat de stock : les trois colonnes rayon, reserve et total sont presentes',
      colonnesEtat.some((c) => c[0] === 'int_NUMBER' && /rayon/i.test(c[1]))
      && colonnesEtat.some((c) => c[0] === 'int_NUMBER_RESERVE' && /r.serve/i.test(c[1]))
      && colonnesEtat.some((c) => c[0] === 'int_NUMBER_TOTAL' && /total/i.test(c[1])), JSON.stringify(colonnesEtat));

    const donnees = JSON.parse((await appeler(p, '../api/v1/etat-stock?search_value='
      + encodeURIComponent(cipUn) + '&limit=20&start=0')).corps);
    const ligneEtat = (donnees.results || []).find((x) => String(x.int_CIP) === String(cipUn));
    ok('Etat de stock : la ligne porte rayon, reserve et total coherents',
      !!ligneEtat && ligneEtat.int_NUMBER === articles[0].rayon
      && ligneEtat.int_NUMBER_RESERVE === articles[0].reserve
      && ligneEtat.int_NUMBER_TOTAL === articles[0].rayon + articles[0].reserve, JSON.stringify(ligneEtat));

    const cipSansReserve = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID='" + articles[3].id + "'");
    const donneesSans = JSON.parse((await appeler(p, '../api/v1/etat-stock?search_value='
      + encodeURIComponent(cipSansReserve) + '&limit=20&start=0')).corps);
    const ligneSans = (donneesSans.results || []).find((x) => String(x.int_CIP) === String(cipSansReserve));
    ok('Etat de stock : un article sans ligne de reserve vaut zero, et son total egale son rayon',
      !!ligneSans && ligneSans.int_NUMBER_RESERVE === 0
      && ligneSans.int_NUMBER_TOTAL === ligneSans.int_NUMBER, JSON.stringify(ligneSans));

    const expEtat = await appeler(p, '../api/v1/etat-stock/export/csv?search_value=' + encodeURIComponent(cipUn));
    ok('Etat de stock : l export CSV porte les trois colonnes et les trois valeurs',
      expEtat.statut === 200 && /Stock rayon;Stock reserve;Stock total/.test(expEtat.corps)
      && new RegExp(';' + articles[0].rayon + ';' + articles[0].reserve + ';' + (articles[0].rayon + articles[0].reserve)).test(expEtat.corps),
      expEtat.corps.split('\r\n').slice(0, 3).join(' || '));

    /* le masquage du stock (AFFICHER_STOCK) couvre aussi les deux nouvelles colonnes */
    exec("UPDATE t_parameters SET str_VALUE='0' WHERE str_KEY='AFFICHER_STOCK';");
    const masque = JSON.parse((await appeler(p, '../api/v1/etat-stock?search_value='
      + encodeURIComponent(cipUn) + '&limit=20&start=0')).corps);
    const ligneMasquee = (masque.results || []).find((x) => String(x.int_CIP) === String(cipUn));
    ok('Etat de stock : quand AFFICHER_STOCK est a 0, aucune des trois quantites ne sort',
      !!ligneMasquee && !ligneMasquee.hasOwnProperty('int_NUMBER')
      && !ligneMasquee.hasOwnProperty('int_NUMBER_RESERVE')
      && !ligneMasquee.hasOwnProperty('int_NUMBER_TOTAL'), JSON.stringify(ligneMasquee));
    const expMasque = await appeler(p, '../api/v1/etat-stock/export/csv?search_value=' + encodeURIComponent(cipUn));
    ok('Etat de stock : l export ne contourne pas ce masquage',
      expMasque.statut === 200 && /;;;\s*$/m.test(expMasque.corps.split('\r\n')[1] + ''),
      (expMasque.corps.split('\r\n')[1] || '').slice(-30));
    exec("UPDATE t_parameters SET str_VALUE='1' WHERE str_KEY='AFFICHER_STOCK';");

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err.slice(0, 3)));
  } catch (e) {
    ok('Parcours complet sans exception', false, e.message + ' | ' + p.url());
  } finally {
    await b.close();
    nettoyer();
    const reste = q("SELECT CONCAT((SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID LIKE '"
      + MARQUE + "%'), '|', (SELECT str_VALUE FROM t_parameters WHERE str_KEY='AFFICHER_STOCK'))");
    ok('Tout ce que le test a pose est retire et le parametre est restaure',
      reste === '0|' + (afficherStockOrigine || '0'), reste);
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' controles OK');
  process.exit(echecs ? 1 : 0);
})();
