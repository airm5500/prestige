/* FICHE ARTICLE : RECHERCHE PAR DCI (retours du 10/10, lot 1).
 *
 * La recherche apres choix d'une DCI etait lente : DISTINCT sur toutes les colonnes de l'article, multiplie par la
 * jointure des grossistes (une ligne par grossiste) et de la DCI. La requete passe par des EXISTS ; ce test verifie
 * sur l'ecran (combo DCI, recherche, pagination) que la liste est EXACTEMENT celle d'une requete de reference :
 *  - memes articles, aucun doublon, meme total, ordre alphabetique, pages contigues ;
 *  - article a plusieurs grossistes et article lie deux fois a la DCI : une seule ligne ;
 *  - recherche par code article grossiste (second grossiste) avec la DCI ; filtre de stock avec la DCI ;
 *  - sans DCI, recherche texte : inchangee ;
 *  - temps de reponse mesure (volume : toute la base liee a la DCI).
 * Jeu d'essai retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE], { encoding: 'utf8', input: s });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const liste = (s) => { const r = q(s); return r ? r.split('\n') : []; };

const DCI = q("SELECT lg_DCI_ID FROM t_dci WHERE str_STATUT = 'enable' ORDER BY str_NAME LIMIT 1");
const EMPL = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = 'admin'");
function nettoyer() {
  exec("DELETE FROM t_famille_dci WHERE lg_FAMILLE_DCI_ID LIKE 'E2E-DCI-%'; DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_GROSSISTE_ID LIKE 'E2E-DCI-%'");
}
/* reference : articles actifs avec stock a l'emplacement, au moins un grossiste, lies a la DCI */
function reference(condition) {
  return liste("SELECT t.lg_FAMILLE_ID FROM t_famille t JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND fs.lg_EMPLACEMENT_ID = '" + EMPL + "'"
    + " WHERE t.str_STATUT = 'enable' AND EXISTS (SELECT 1 FROM t_famille_grossiste g WHERE g.lg_FAMILLE_ID = t.lg_FAMILLE_ID)"
    + " AND EXISTS (SELECT 1 FROM t_famille_dci d WHERE d.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND d.lg_DCI_ID = '" + DCI + "')" + (condition || '')).sort();
}

(async () => {
  nettoyer();
  /* 60 articles lies a la DCI ; 3 ont un second grossiste ; 1 est lie deux fois */
  const ids = liste("SELECT t.lg_FAMILLE_ID FROM t_famille t JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND fs.lg_EMPLACEMENT_ID = '" + EMPL + "'"
    + " WHERE t.str_STATUT = 'enable' AND EXISTS (SELECT 1 FROM t_famille_grossiste g WHERE g.lg_FAMILLE_ID = t.lg_FAMILLE_ID) ORDER BY t.int_CIP LIMIT 60");
  let sql = '';
  ids.forEach((id, i) => { sql += "INSERT INTO t_famille_dci (lg_FAMILLE_DCI_ID, lg_FAMILLE_ID, lg_DCI_ID, str_STATUT, dt_CREATED) VALUES ('E2E-DCI-" + i + "', '" + id + "', '" + DCI + "', 'enable', NOW());"; });
  sql += "INSERT INTO t_famille_dci (lg_FAMILLE_DCI_ID, lg_FAMILLE_ID, lg_DCI_ID, str_STATUT, dt_CREATED) VALUES ('E2E-DCI-DOUBLE', '" + ids[5] + "', '" + DCI + "', 'enable', NOW());";
  [0, 1, 2].forEach((i) => {
    const autre = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE lg_GROSSISTE_ID NOT IN (SELECT IFNULL(lg_GROSSISTE_ID, '') FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '" + ids[i * 7] + "') LIMIT 1");
    sql += "INSERT INTO t_famille_grossiste (lg_FAMILLE_GROSSISTE_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, str_CODE_ARTICLE, str_STATUT, dt_CREATED) VALUES ('E2E-DCI-G" + i + "', '" + ids[i * 7] + "', '" + autre + "', 'E2EDCIZ" + i + "', 'enable', NOW());";
  });
  exec(sql);

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Fiche Article', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);

    /* recherche par l'ecran : filtres poses dans les champs, puis toutes les pages parcourues */
    const parEcran = (f) => p.evaluate(async (f) => {
      const m = Ext.ComponentQuery.query('famillemanager')[0], s = m.getStore();
      m.fmField('rechecher').setValue(f.texte || '');
      const dci = m.fmField('lg_DCI_PRINCIPAL_ID');
      if (f.dci) { dci.getStore().add({ lg_DCI_ID: f.dci, str_NAME: 'E2E' }); }
      dci.setValue(f.dci || null);
      m.fmField('stock_operator').setValue(f.op || null); m.fmField('stock_value').setValue(f.val === undefined ? null : f.val);
      const charger = (page) => new Promise((ok) => { s.on('load', function fin() { s.un('load', fin); ok(); }); page ? s.loadPage(page) : m.onRechClick(); });
      const t0 = performance.now(); await charger(0); const ms = Math.round(performance.now() - t0);
      const lignes = [], ordre = []; let page = 1;
      while (true) {
        s.each((r) => { lignes.push(r.get('lg_FAMILLE_ID')); ordre.push(r.get('str_DESCRIPTION') || ''); });
        if (page * s.pageSize >= s.getTotalCount()) break;
        page++; await charger(page);
      }
      return { total: s.getTotalCount(), lignes, ordre, ms, taille: s.pageSize };
    }, f);
    const compare = (nom, r, attendu) => {
      const tri = r.lignes.slice().sort(), dbl = r.lignes.length - new Set(r.lignes).size;
      const alpha = r.ordre.every((d, i) => i === 0 || r.ordre[i - 1].localeCompare(d, 'fr', { sensitivity: 'base' }) <= 0 || r.ordre[i - 1].toUpperCase() <= d.toUpperCase());
      ok(nom + ' : ' + attendu.length + ' article(s), mêmes que la référence, sans doublon, total juste (' + r.ms + ' ms)',
        dbl === 0 && r.total === attendu.length && JSON.stringify(tri) === JSON.stringify(attendu), 'total=' + r.total + ' lignes=' + r.lignes.length + ' doublons=' + dbl);
      return alpha;
    };

    const att = reference();
    ok('Précondition : 60 articles liés à la DCI', att.length === 60, att.length);
    const r1 = await parEcran({ dci: DCI });
    const alpha = compare('DCI seule, toutes les pages', r1, att);
    ok('DCI seule : ordre alphabétique conservé, pagination de ' + r1.taille, alpha && r1.taille > 0);
    ok('Article à deux grossistes et article lié deux fois : une seule ligne chacun', r1.lignes.filter((x) => x === ids[0] || x === ids[5]).length === 2);

    compare('DCI + code article du second grossiste « E2EDCIZ1 »', await parEcran({ dci: DCI, texte: 'E2EDCIZ1' }), [ids[7]]);
    compare('DCI + code commun « E2EDCIZ »', await parEcran({ dci: DCI, texte: 'E2EDCIZ' }), [ids[0], ids[7], ids[14]].sort());
    const cip = q("SELECT LEFT(int_CIP, 3) FROM t_famille WHERE lg_FAMILLE_ID = '" + ids[20] + "'");
    /* un texte numerique (CIP) est toujours cherche « commence par » */
    compare('DCI + CIP « ' + cip + ' » (commence par)', await parEcran({ dci: DCI, texte: cip }),
      reference(" AND (t.int_CIP LIKE '" + cip + "%' OR t.int_EAN13 LIKE '" + cip + "%' OR t.str_NAME LIKE '" + cip + "%' OR t.code_ean_fabriquant LIKE '" + cip + "%'"
        + " OR EXISTS (SELECT 1 FROM t_famille_grossiste g2 WHERE g2.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND g2.str_CODE_ARTICLE LIKE '" + cip + "%'))"));
    /* un texte est cherche « contient » (parametre du banc) */
    const mot = q("SELECT SUBSTRING(str_NAME, 3, 3) FROM t_famille WHERE lg_FAMILLE_ID = '" + ids[30] + "'");
    compare('DCI + texte « ' + mot + ' » (contient)', await parEcran({ dci: DCI, texte: mot }),
      reference(" AND (t.int_CIP LIKE '%" + mot + "%' OR t.int_EAN13 LIKE '%" + mot + "%' OR t.str_NAME LIKE '%" + mot + "%' OR t.code_ean_fabriquant LIKE '%" + mot + "%'"
        + " OR EXISTS (SELECT 1 FROM t_famille_grossiste g2 WHERE g2.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND g2.str_CODE_ARTICLE LIKE '%" + mot + "%'))"));
    compare('DCI + stock > 0', await parEcran({ dci: DCI, op: 'MORE', val: 0 }), reference(' AND fs.int_NUMBER_AVAILABLE > 0'));

    /* sans DCI : recherche texte inchangee */
    const sansDci = await parEcran({ texte: 'E2EDCIZ' });
    ok('Sans DCI, code « E2EDCIZ » : les 3 articles du second grossiste, sans doublon', sansDci.total === 3 && new Set(sansDci.lignes).size === 3, JSON.stringify(sansDci).slice(0, 200));

    /* volume : toute la base liee a la DCI */
    const tous = liste("SELECT t.lg_FAMILLE_ID FROM t_famille t WHERE t.str_STATUT = 'enable' AND t.lg_FAMILLE_ID NOT IN ('" + ids.join("','") + "')");
    let v = '';
    tous.forEach((id, i) => { v += (v ? ',' : '') + "('E2E-DCI-V" + i + "', '" + id + "', '" + DCI + "', 'enable', NOW())"; });
    if (v) exec('INSERT INTO t_famille_dci (lg_FAMILLE_DCI_ID, lg_FAMILLE_ID, lg_DCI_ID, str_STATUT, dt_CREATED) VALUES ' + v);
    const attV = reference();
    const t0 = Date.now();
    const premiere = await p.evaluate(async (dci) => { const r = await fetch('../api/v1/produit-search/fiche?start=0&limit=50&lg_DCI_ID=' + dci); return r.json(); }, DCI);
    const ms = Date.now() - t0;
    ok('Volume (' + attV.length + ' articles liés) : première page et total justes, ' + ms + ' ms', premiere.total === attV.length && premiere.results.length === Math.min(50, attV.length), 'total=' + premiere.total);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_famille_dci WHERE lg_FAMILLE_DCI_ID LIKE 'E2E-DCI-%'") === '0' && q("SELECT COUNT(*) FROM t_famille_grossiste WHERE lg_FAMILLE_GROSSISTE_ID LIKE 'E2E-DCI-%'") === '0');
    const n = res.filter((r) => r.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
