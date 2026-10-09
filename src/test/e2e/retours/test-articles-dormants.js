/* ARTICLES DORMANTS (retours du 09/10 (4)) : onglet de l'ecran « Articles invendus ».
 *  - l'ecran a deux onglets ; le premier (articles invendus) fonctionne comme avant ;
 *  - onglet « Articles dormants » : produits en stock non vendus depuis leur derniere entree, entree de plus de N jours ;
 *    total, stock et valeur immobilisee = calcul independant en SQL ;
 *  - un produit dormant de la base apparait (date d'entree, stock, jours) ; un produit vendu apres sa derniere entree
 *    n'apparait pas ;
 *  - saisie : nombre de jours absurde (lettres, 0, 99999) refuse ; recherche longue sans erreur ;
 *  - export Excel et edition PDF des memes lignes ;
 *  - mise en page : en-tetes entiers, pas de defilement horizontal ; aucune erreur JavaScript. Lecture seule.
 */
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const SORTIE = process.env.SORTIE || '/tmp';

const EMP = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = 'admin'");
const ENTREES = "(SELECT w.lg_FAMILLE_ID, MAX(w.dt_CREATED) derniere FROM t_warehouse w JOIN t_user wu ON wu.lg_USER_ID = w.lg_USER_ID"
  + " WHERE wu.lg_EMPLACEMENT_ID = '" + EMP + "' GROUP BY w.lg_FAMILLE_ID) e";
const VENDU_APRES = "EXISTS (SELECT 1 FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
  + " WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.dt_UPDATED >= e.derniere)";
const BASE_SQL = (jours) => " FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '" + EMP + "' AND s.str_STATUT = 'enable'"
  + " JOIN " + ENTREES + " ON e.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 0"
  + " AND e.derniere < CURDATE() - INTERVAL " + jours + " DAY";

/* Jeu d'essai (retire a la fin) : une entree ancienne (200 jours) pour trois produits en stock sans autre entree :
 * deux sans vente depuis (dormants), un vendu depuis (pas dormant). La liste ne depend pas de l'anciennete des
 * donnees de la base d'essai. */
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const SANS_ENTREE = " FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '" + EMP + "' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 0 AND f.int_PAF > 0 AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_warehouse w WHERE w.lg_FAMILLE_ID = f.lg_FAMILLE_ID)";
const VENDU_DEPUIS = "EXISTS (SELECT 1 FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
  + " WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.dt_UPDATED >= CURDATE() - INTERVAL 200 DAY)";
const ESSAI = q("SELECT GROUP_CONCAT(id) FROM ((SELECT f.lg_FAMILLE_ID id" + SANS_ENTREE + " AND NOT " + VENDU_DEPUIS + " ORDER BY f.str_NAME LIMIT 2)"
  + " UNION ALL (SELECT f.lg_FAMILLE_ID" + SANS_ENTREE + " AND " + VENDU_DEPUIS + " ORDER BY f.str_NAME LIMIT 1)) x").split(',');
const retirerEssai = () => exec("DELETE FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE 'e2e-dormant-%'");

(async () => {
  retirerEssai();
  ESSAI.forEach((id, i) => exec("INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUMBER, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('e2e-dormant-" + i + "', '" + ADMIN + "', '" + id + "', " + (i + 2) + ", CURDATE() - INTERVAL 200 DAY, CURDATE() - INTERVAL 200 DAY, 'enable')"));
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const charge = () => p.waitForFunction(() => { const d = Ext.ComponentQuery.query('articlesdormants')[0]; return d && !d.store.isLoading() && d.down('#totaux').getEl().dom.textContent.length > 0; }, null, { timeout: 120000 });
  const totaux = () => p.evaluate(() => Ext.ComponentQuery.query('articlesdormants')[0].down('#totaux').getEl().dom.textContent);
  const fixer = async (id, v) => { await p.evaluate(([i, x]) => { const d = Ext.ComponentQuery.query('articlesdormants')[0]; d.down('#totaux').update(''); d.down('#' + i).setValue(x); d.charger(); }, [id, v]); await charge(); };
  const lignes = () => p.evaluate(() => Ext.ComponentQuery.query('articlesdormants')[0].store.getRange().map((r) => r.data));
  const n = (x) => Number(String(x).replace(/[^\d]/g, ''));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('stockmort', 'Articles invendus', ''));
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('stockmort')[0]; return s && s.isVisible(); }, null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    const onglets = await p.evaluate(() => Ext.ComponentQuery.query('stockmort')[0].down('#ongletsInvendus').getTabBar().items.items.map((t) => t.getText()));
    ok('Écran Articles invendus : deux onglets « Articles invendus » et « Articles dormants »', onglets.join('|') === 'Articles invendus|Articles dormants', JSON.stringify(onglets));

    /* premier onglet : comme avant */
    await p.evaluate(() => { Ext.ComponentQuery.query('stockmort #rechercher')[0].fireEvent('click', Ext.ComponentQuery.query('stockmort #rechercher')[0]); });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('stockmort #grilleInvendus')[0]; return g && !g.getStore().isLoading(); }, null, { timeout: 180000 });
    await p.waitForTimeout(500);
    const inv = await p.evaluate(() => { const g = Ext.ComponentQuery.query('stockmort #grilleInvendus')[0]; return { n: g.getStore().getCount(), total: g.getStore().getTotalCount(), visible: g.isVisible(true) }; });
    ok('Onglet « Articles invendus » : la recherche fonctionne comme avant (liste chargée)', inv.visible && inv.n > 0 && inv.total >= inv.n, JSON.stringify(inv));

    /* onglet dormants */
    const idOnglet = await p.evaluate(() => Ext.ComponentQuery.query('stockmort')[0].down('#ongletDormants').tab.getEl().dom.id);
    await p.click('#' + idOnglet);
    await charge();
    const t90 = await totaux();
    const attendu = q("SELECT CONCAT(COUNT(*), '|', IFNULL(SUM(s.int_NUMBER_AVAILABLE), 0), '|', IFNULL(SUM(CAST(s.int_NUMBER_AVAILABLE AS SIGNED) * IFNULL(f.int_PAF, 0)), 0))"
      + BASE_SQL(90) + " AND NOT " + VENDU_APRES).split('|');
    const lu = (t90.match(/([\d\s  .,]+) article/) || [])[1], st = (t90.match(/stock ([\d\s  .,]+)/) || [])[1], va = (t90.match(/immobilisée ([\d\s  .,]+)/) || [])[1];
    ok('Ouverture : 90 jours par défaut, totaux = calcul SQL indépendant (nombre, stock, valeur)', n(lu) === Number(attendu[0]) && n(st) === Number(attendu[1]) && n(va) === Number(attendu[2]), t90 + ' / SQL ' + attendu.join('|'));
    const l1 = await lignes();
    ok('Tri par défaut : valeur du stock décroissante', l1.length > 1 && l1.every((x, i) => i === 0 || l1[i - 1].valeurStock >= x.valeurStock), JSON.stringify(l1.slice(0, 3).map((x) => x.valeurStock)));
    ok('Lignes cohérentes : stock > 0, jours > 90, valeur = stock × prix d\'achat', l1.every((x) => x.stock > 0 && x.jours > 90 && x.valeurStock === x.stock * x.prixAchat), JSON.stringify(l1[0]));
    await p.screenshot({ path: SORTIE + '/dormants.png' });

    /* un dormant connu de la base */
    const dormant = q("SELECT CONCAT(f.int_CIP, '|', s.int_NUMBER_AVAILABLE, '|', DATE_FORMAT(e.derniere, '%d/%m/%Y'), '|', DATEDIFF(CURDATE(), e.derniere))"
      + BASE_SQL(90) + " AND NOT " + VENDU_APRES + " AND f.lg_FAMILLE_ID = '" + ESSAI[0] + "'").split('|');
    await fixer('recherche', dormant[0]);
    let l = await lignes();
    ok('Recherche par CIP d\'un produit dormant : trouvé avec sa date d\'entrée, son stock et ses jours', l.length === 1 && l[0].cip === dormant[0] && l[0].stock === Number(dormant[1]) && l[0].derniereEntree === dormant[2] && l[0].jours === Number(dormant[3]), JSON.stringify(l) + ' / ' + dormant.join('|'));
    const vendu = q("SELECT f.int_CIP FROM t_famille f WHERE f.lg_FAMILLE_ID = '" + ESSAI[2] + "'");
    await fixer('recherche', vendu);
    l = await lignes();
    ok('Produit vendu après sa dernière entrée : absent', vendu && l.length === 0, vendu + ' -> ' + l.length);
    await fixer('recherche', '');

    /* changement de seuil */
    await fixer('jours', 200);
    const t200 = await totaux();
    const att200 = q("SELECT COUNT(*)" + BASE_SQL(200) + " AND NOT " + VENDU_APRES);
    ok('Seuil 200 jours : total = SQL, et pas plus qu\'à 90 jours', n((t200.match(/([\d\s  .,]+) article/) || [])[1]) === Number(att200) && Number(att200) <= Number(attendu[0]), t200 + ' / SQL ' + att200);
    await fixer('jours', 90);

    /* saisie absurde */
    const saisie = await p.evaluate(() => {
      const d = Ext.ComponentQuery.query('articlesdormants')[0], j = d.down('#jours'), r = {};
      j.setRawValue('abc'); r.lettres = j.isValid() ? 'accepte' : 'refuse';
      j.setValue(0); r.zero = j.isValid() ? 'accepte' : 'refuse';
      j.setValue(99999); r.enorme = j.isValid() ? 'accepte' : 'refuse';
      const avant = d.store.lastOptions && d.store.lastOptions.params; d.charger(); r.rechargeBloque = !d.store.isLoading();
      j.setValue(90); return r;
    });
    ok('Nombre de jours absurde (lettres, 0, 99999) refusé, aucune recherche lancée', saisie.lettres === 'refuse' && saisie.zero === 'refuse' && saisie.enorme === 'refuse' && saisie.rechargeBloque, JSON.stringify(saisie));
    await fixer('recherche', 'x'.repeat(150) + "'%;--");
    const tLong = await totaux();
    ok('Recherche longue avec caractères spéciaux : pas d\'erreur (0 article)', /^0 article/.test(tLong.trim()), tLong);
    await fixer('recherche', '');

    /* exports */
    const exp = await p.evaluate(async () => {
      const c = Ext.Object.toQueryString(Ext.ComponentQuery.query('articlesdormants')[0].criteres());
      const x = await fetch('/prestige/api/v1/articles-dormants/excel?' + c), xb = await x.arrayBuffer();
      const f = await fetch('/prestige/api/v1/articles-dormants/pdf?' + c), fb = new Uint8Array(await f.arrayBuffer());
      return { xs: x.status, xt: x.headers.get('content-type'), xd: x.headers.get('content-disposition'), xl: xb.byteLength,
        ps: f.status, pt: f.headers.get('content-type'), pdf: String.fromCharCode.apply(null, fb.slice(0, 4)), pl: fb.length, octets: Array.from(fb) };
    });
    ok('Export Excel : fichier .xls téléchargé', exp.xs === 200 && /ms-excel/.test(exp.xt) && /articles-dormants_.*\.xls/.test(exp.xd) && exp.xl > 5000, JSON.stringify(exp));
    require('fs').writeFileSync(SORTIE + '/articles-dormants.pdf', Buffer.from(exp.octets || []));
    const textePdf = exp.pdf === '%PDF' ? execFileSync('pdftotext', ['-layout', SORTIE + '/articles-dormants.pdf', '-'], { encoding: 'utf8' }) : '';
    delete exp.octets;
    ok('Édition PDF : titre et produit dormant de l\'essai', exp.ps === 200 && /pdf/.test(exp.pt) && /ARTICLES DORMANTS/.test(textePdf) && textePdf.includes(dormant[0]), textePdf.slice(0, 300) + ' ' + JSON.stringify(exp));

    /* mise en page */
    const mp = await p.evaluate(() => {
      const d = Ext.ComponentQuery.query('articlesdormants')[0], corps = document.body;
      const coupes = d.down('grid').headerCt.getGridColumns().filter((c) => { const i = c.getEl().dom.querySelector('.x-column-header-inner'); return i && i.scrollWidth > i.clientWidth + 1; }).map((c) => c.text);
      const boutons = d.query('button').filter((x) => x.isVisible()).filter((x) => { const r = x.getEl().dom.getBoundingClientRect(), t = x.getEl().dom.querySelector('.x-btn-inner'); return r.right > window.innerWidth || (t && t.scrollWidth > t.clientWidth + 1); }).map((x) => x.getText());
      return { coupes, boutons, defil: corps.scrollWidth > corps.clientWidth + 1 };
    });
    ok('Mise en page : en-têtes et boutons entiers, pas de défilement horizontal', mp.coupes.length === 0 && mp.boutons.length === 0 && !mp.defil, JSON.stringify(mp));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirerEssai();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE 'e2e-dormant-%'") === '0');
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + ' OK');
    process.exit(k === res.length ? 0 : 1);
  }
})();
