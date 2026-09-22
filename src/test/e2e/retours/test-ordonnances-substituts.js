/* SUBSTITUTS PAR DCI DANS L'ORDONNANCE (23/09), JOUES A LA SOURIS ET AU CLAVIER.
 *
 * Le banc n'a presque aucun lien produit-DCI (la production, si) : le test pose les siens, les marque, et les retire.
 * Il met aussi a 0, le temps du test, le stock du produit choisi pour jouer la rupture, puis le remet.
 *
 *  - un produit en rupture choisi dans l'ordonnance affiche ses equivalents d'eux-memes ;
 *  - « equivalent direct » (meme DCI, dosage, forme) avant « a adapter » (1 g, effervescent), avec la raison ;
 *  - une autre voie (suppositoire) n'est pas proposee ;
 *  - « Remplacer » change le produit de la ligne et garde la posologie ;
 *  - levothyroxine : « substitution a eviter » ; produit sans DCI : on le dit, on ne devine pas.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-SUB-';
const ORIGINE = 'DOLIPRANE 500MG CPR B/16';
const PARA = ['DOLIPRANE 500MG CPR B/16', 'DOLIPRANE 500MG CPR EFFV T/16', 'DOLIPRANE 1G CPR B/8', 'DOLIPRANE 200MG SUPPO B/10',
  'EFFERALGAN 500MG GEL B/16 ANF', 'EFFERALGAN 500MG CPR SEC B/16'];
const sqlTexte = (v) => "'" + v.replace(/'/g, "''") + "'";

(async () => {
  const idOrigine = q('SELECT lg_FAMILLE_ID FROM t_famille WHERE str_NAME=' + sqlTexte(ORIGINE) + " AND str_STATUT='enable' LIMIT 1");
  const stockAvant = q("SELECT CONCAT_WS('|', lg_FAMILLE_STOCK_ID, int_NUMBER_AVAILABLE, int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID='" + idOrigine + "' AND lg_EMPLACEMENT_ID='1' LIMIT 1").split('|');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1100 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    /* --------------------------------------------------------------- jeu d essai : liens DCI marques */
    const dciPara = q("SELECT lg_DCI_ID FROM t_dci WHERE str_NAME='PARACETAMOL' LIMIT 1");
    const dciLevo = q("SELECT lg_DCI_ID FROM t_dci WHERE str_NAME LIKE 'LEVOTHYROX%' LIMIT 1") || dciPara;
    let n = 0;
    const lier = (nom, dci) => exec("INSERT INTO t_famille_dci (lg_FAMILLE_DCI_ID, lg_FAMILLE_ID, lg_DCI_ID, str_STATUT, dt_CREATED, dt_UPDATED)"
      + " SELECT CONCAT('" + MARQUE + "', " + (n++) + "), f.lg_FAMILLE_ID, '" + dci + "', 'enable', NOW(), NOW() FROM t_famille f"
      + ' WHERE f.str_NAME=' + sqlTexte(nom) + " AND f.str_STATUT='enable'"
      + " AND NOT EXISTS (SELECT 1 FROM t_famille_dci x WHERE x.lg_FAMILLE_ID=f.lg_FAMILLE_ID) LIMIT 1");
    PARA.forEach((nom) => lier(nom, dciPara));
    ['LEVOTHYROX 75MCG CPR SEC B/30', 'LEVOTHYROXINE GH 75MCG CPR B/30'].forEach((nom) => lier(nom, dciLevo));
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=0 WHERE lg_FAMILLE_STOCK_ID='" + stockAvant[0] + "'");
    const attendus = Number(q("SELECT COUNT(*) FROM t_famille_dci fd JOIN t_famille f ON f.lg_FAMILLE_ID=fd.lg_FAMILLE_ID WHERE fd.lg_DCI_ID='" + dciPara + "' AND f.str_STATUT='enable' AND f.lg_FAMILLE_ID<>'" + idOrigine + "' AND (SELECT COUNT(*) FROM t_famille_dci y WHERE y.lg_FAMILLE_ID=f.lg_FAMILLE_ID)=1"));
    ok('Précondition : liens DCI posés, origine mise en rupture', attendus >= 5 && q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID='" + stockAvant[0] + "'") === '0', attendus + ' candidat(s) paracétamol');

    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(1200); };
    await clic('ordonnanceclient #grilleOrdonnances button[itemId=nouvelle]');
    const cellule = async (ligne, colItemId) => {
      const c = await p.evaluate((a) => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleProduits')[0]; const col = g.down('#' + a.id) || g.headerCt.items.findBy((x) => x.dataIndex === a.id); const n = g.getView().getCell(g.getStore().getAt(a.ligne), col).dom.getBoundingClientRect(); return { x: n.left + n.width / 2, y: n.top + n.height / 2 }; }, { ligne, id: colItemId });
      await p.mouse.click(c.x, c.y); await p.waitForTimeout(400);
    };
    const choisirProduit = async (ligne, tape, nom) => {
      await cellule(ligne, 'colProduit');
      await p.keyboard.type(tape, { delay: 50 });
      await p.waitForFunction((n) => { const c = Ext.ComponentQuery.query('ordonnanceclient #editeurProduit')[0]; return c && c.isExpanded && c.getStore().findExact('strNAME', n) >= 0; }, nom, { timeout: 20000 });
      const r = await p.evaluate((n) => { const c = Ext.ComponentQuery.query('ordonnanceclient #editeurProduit')[0]; const k = c.getPicker().getNode(c.getStore().findExact('strNAME', n)); k.scrollIntoView(); const b = k.getBoundingClientRect(); return { x: b.left + 10, y: b.top + b.height / 2 }; }, nom);
      await p.mouse.click(r.x, r.y); await p.waitForTimeout(900);
    };

    /* --------------------------------------------------------------- rupture : les equivalents s affichent */
    await choisirProduit(0, 'DOLIPRANE 500MG CPR', ORIGINE);
    await p.keyboard.type('1 cp 3 fois par jour'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const g = e.down('#grilleSubstituts'); return g.isVisible() && e.storeSubstituts.getCount() > 0; }, null, { timeout: 20000 });
    const sub = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const g = e.down('#grilleSubstituts'); return { lignes: e.storeSubstituts.getRange().map((r) => ({ nom: r.get('nom'), niveau: r.get('niveau'), stock: r.get('stock'), raison: r.get('raison') })), message: g.down('#messageSubstituts').getEl().dom.textContent }; });
    ok('Produit en rupture choisi : les équivalents s affichent d eux-mêmes, et la rupture est dite', /rupture/.test(sub.message) && /PARACETAMOL/.test(sub.message), sub.message.slice(0, 200));
    ok('Autant de propositions que la base en donne, moins la voie rectale', sub.lignes.length === attendus - 1, sub.lignes.length + ' / ' + (attendus - 1));
    const niveaux = sub.lignes.map((l) => l.niveau);
    ok('Équivalents directs d abord, puis « à adapter »', niveaux.indexOf('adapter') < 0 || niveaux.lastIndexOf('direct') < niveaux.indexOf('adapter'), niveaux.join(','));
    const nomNiveau = (nom) => (sub.lignes.find((l) => l.nom === nom) || {}).niveau;
    ok('Efferalgan 500 gélule et comprimé sécable : équivalents directs', nomNiveau('EFFERALGAN 500MG GEL B/16 ANF') === 'direct' && nomNiveau('EFFERALGAN 500MG CPR SEC B/16') === 'direct', JSON.stringify(sub.lignes.map((l) => l.nom + ':' + l.niveau)));
    const effv = sub.lignes.find((l) => l.nom === 'DOLIPRANE 500MG CPR EFFV T/16') || {};
    const ungramme = sub.lignes.find((l) => l.nom === 'DOLIPRANE 1G CPR B/8') || {};
    ok('Effervescent et 1 g : « à adapter », avec la raison (sodium ; 1000 mg au lieu de 500 mg)', effv.niveau === 'adapter' && /sodium/.test(effv.raison) && ungramme.niveau === 'adapter' && /1000 mg au lieu de 500 mg/.test(ungramme.raison), JSON.stringify([effv, ungramme]));
    const directs = sub.lignes.filter((l) => l.niveau === 'direct');
    const premierDetail = directs.findIndex((l) => / DET$/.test(l.nom));
    ok('Vente à l unité (DET) : signalée, et rangée après les boîtes', premierDetail < 0 || (directs.slice(premierDetail).every((l) => / DET$/.test(l.nom) || l.stock <= 0) && /unité/.test(directs[premierDetail].raison)), JSON.stringify(directs.map((l) => l.nom)));
    ok('Le suppositoire (autre voie) n est pas proposé', !sub.lignes.some((l) => /SUPPO/.test(l.nom)));
    const couleurs = await p.evaluate(() => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleSubstituts')[0]; const n = g.getView().getNode(0); const s = [...n.querySelectorAll('span')].map((x) => getComputedStyle(x).color); return s; });
    ok('Stock et prix visibles en couleur (bleu / rouge)', couleurs.indexOf('rgb(192, 57, 43)') >= 0 && (couleurs.indexOf('rgb(30, 95, 168)') >= 0 || couleurs.filter((c) => c === 'rgb(192, 57, 43)').length >= 2), couleurs.join(' '));

    /* --------------------------------------------------------------- remplacer */
    const premier = sub.lignes[0].nom;
    const pos = await p.evaluate(() => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleSubstituts')[0]; const r = g.getView().getNode(0).querySelector('.ordo-act-remplacer').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(800);
    const ligne0 = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const l = e.storeProduits.getAt(0); return { libelle: l.get('libelle'), posologie: l.get('posologie'), cache: !e.down('#grilleSubstituts').isVisible() }; });
    ok('« Remplacer » : la ligne prend le produit choisi et GARDE sa posologie', ligne0.libelle === premier && ligne0.posologie === '1 cp 3 fois par jour' && ligne0.cache, JSON.stringify(ligne0) + ' / ' + premier);

    /* --------------------------------------------------------------- marge etroite, sans DCI */
    await clic('ordonnanceclient #grilleProduits button[itemId=ajouterProduit]');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await choisirProduit(1, 'LEVOTHYROX 75', 'LEVOTHYROX 75MCG CPR SEC B/30');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    const icone = async (ligne) => { const c = await p.evaluate((l) => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleProduits')[0]; const r = g.getView().getNode(l).querySelector('.ordo-act-equivalents').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, ligne); await p.mouse.click(c.x, c.y); await p.waitForTimeout(1500); };
    await icone(1);
    const levo = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #grilleSubstituts')[0].down('#messageSubstituts').getEl().dom.textContent);
    ok('Lévothyroxine : « substitution à éviter », marge thérapeutique étroite', /à éviter/.test(levo) && /marge/.test(levo), levo.slice(0, 200));
    await clic('ordonnanceclient #grilleProduits button[itemId=ajouterProduit]');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await choisirProduit(2, 'FERCEFOL', 'FERCEFOL CPR B/30');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await icone(2);
    const fer = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; return { n: e.storeSubstituts.getCount(), m: e.down('#grilleSubstituts').down('#messageSubstituts').getEl().dom.textContent }; });
    ok('Produit sans DCI : aucune proposition devinée, et on dit pourquoi', fer.n === 0 && /Aucune DCI/.test(fer.m), JSON.stringify(fer));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    await b.close();
    exec("DELETE FROM t_famille_dci WHERE lg_FAMILLE_DCI_ID LIKE '" + MARQUE + "%'");
    if (stockAvant[0]) { exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=" + Number(stockAvant[1]) + " WHERE lg_FAMILLE_STOCK_ID='" + stockAvant[0] + "'"); }
    const reste = q("SELECT COUNT(*) FROM t_famille_dci WHERE lg_FAMILLE_DCI_ID LIKE '" + MARQUE + "%'");
    ok('Remise en état : liens de test retirés, stock remis', reste === '0' && q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID='" + stockAvant[0] + "'") === String(Number(stockAvant[1])));
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
