/* MATRICE MARGE x ROTATION : LES SEUILS ET LES RUPTURES (retours de l'officine du 21/09).
 *
 * « Pourquoi un produit classe A se retrouve en produit a risque ? Pourquoi un produit classe C, deux boites
 * vendues et stock zero, est un champion ? » Les deux avaient une seule cause : un produit en rupture n'a pas
 * de rotation, et sa quantite vendue en tenait lieu - deux boites donnaient « rotation 2 », trois cents boites
 * « rotation 300 », et ces valeurs gonflaient la mediane que les autres devaient atteindre.
 *
 * CE QUE CE TEST ETABLIT, sur la base du banc et le parcours reel :
 *  - l'en-tete enonce les trois regles en clair, avec le seuil retenu et la mediane ;
 *  - la rotation se lit par defaut en jours de couverture ; « en ratio » change l'en-tete et le seuil ;
 *  - AUCUN produit en rupture a quantite anecdotique n'est champion ;
 *  - une rupture qui s'est vraiment vendue est bien « rotation elevee » ;
 *  - un seuil saisi remplace la mediane et l'en-tete le dit ;
 *  - les filtres « stock ≥ 1 » et « quantite > N » font exactement ce qu'ils disent ;
 *  - les colonnes portent leur formule en infobulle ;
 *  - l'export Excel repond avec les regles en tete.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1700, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('analysearticle', {}));
    const attendre = async () => {
      await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('analysearticle')[0]; return e && e.derniereAnalyse && !e.articleStore.isLoading(); }, null, { timeout: 120000 });
      await p.waitForTimeout(700);
    };
    await attendre();
    const lire = () => p.evaluate(() => {
      const e = Ext.ComponentQuery.query('analysearticle')[0];
      return { entete: e.down('#quadrants').el.dom.querySelector('.aa-entete').innerText, seuils: e.derniereAnalyse.seuils,
        regles: e.derniereAnalyse.regles, total: e.articleStore.getTotalCount(), libelleSeuil: e.down('#seuilRotation').getFieldLabel(),
        unite: e.down('#uniteRotation').getValue() };
    });
    const s0 = await lire();
    ok('L en-tête énonce les trois règles en clair : marge, rotation en jours de couverture, ruptures',
      /Marge élevée : taux ≥ [\d,]+ % \(médiane/.test(s0.entete) && /Rotation élevée : couverture ≤ [\d,]+ j \(médiane\)/.test(s0.entete)
      && /En rupture \(stock 0\) : rotation élevée si quantité vendue ≥ [\d,]+/.test(s0.entete), s0.entete.split('\n')[1]);
    ok('Par défaut la rotation se lit en jours : le champ de seuil le dit, avec son unité', s0.seuils.modeRotation === 'JOURS' && /couv\. ≤/.test(s0.libelleSeuil) && s0.unite === 'j', s0.libelleSeuil + ' ' + s0.unite);
    const medQ = Number(s0.seuils.medianeQuantite);

    /* Toute la liste, par l'API que l'ecran utilise, pour verifier la regle produit par produit. */
    const tous = await p.evaluate(async () => (await fetch('../api/v1/analyse-article/matrice?typePeriode=TROIS_MOIS&limit=0', { credentials: 'same-origin' })).json());
    const ruptures = tous.data.filter((a) => a.stock <= 0);
    const anecdotiques = ruptures.filter((a) => a.quantite < medQ);
    const champions = anecdotiques.filter((a) => a.quadrant === 1 || a.quadrant === 3);
    ok('Aucun produit en rupture à quantité anecdotique (< ' + medQ + ', la médiane) n est « rotation élevée » : plus de champion à deux boîtes',
      anecdotiques.length > 0 && champions.length === 0, anecdotiques.length + ' ruptures anecdotiques, ' + champions.length + ' jugée(s) rotation élevée');
    const vendues = ruptures.filter((a) => a.quantite >= medQ);
    ok('Et une rupture qui s est vraiment vendue (≥ ' + medQ + ') reste « rotation élevée »', vendues.length > 0 && vendues.every((a) => a.quadrant === 1 || a.quadrant === 3), vendues.length + ' rupture(s) vendues');
    const enStock = tous.data.filter((a) => a.stock > 0);
    const seuilJ = Number(tous.seuils.rotation);
    const coherent = enStock.every((a) => {
      const haute = a.couverture >= 0 && a.couverture <= seuilJ;
      return haute === (a.quadrant === 1 || a.quadrant === 3);
    });
    ok('Pour chaque produit en stock, « rotation élevée » = couverture ≤ ' + seuilJ + ' j, sans exception', coherent, enStock.length + ' produits vérifiés');
    const margeOk = tous.data.every((a) => (a.tauxMarge >= tous.seuils.marge) === (a.quadrant === 1 || a.quadrant === 2));
    ok('Et « marge élevée » = taux ≥ ' + tous.seuils.marge + ' %, sans exception', margeOk);

    /* En ratio. */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('analysearticle')[0]; const c = e.down('#modeRotation'); c.setValue('RATIO'); c.fireEvent('select', c, [c.findRecordByValue('RATIO')]); });
    await attendre();
    const s1 = await lire();
    ok('« En ratio vendu/stock » : l en-tête et le seuil changent de lecture', s1.seuils.modeRotation === 'RATIO' && /vendu \/ stock ≥ [\d,]+ \(médiane\)/.test(s1.entete) && /ratio ≥/.test(s1.libelleSeuil) && s1.unite === '',
      s1.entete.split('\n')[1]);
    ok('La médiane des rotations ne compte plus les ruptures : elle est calculée sur les produits en stock', Math.abs(s1.seuils.rotation - s1.seuils.medianeRotation) < 0.001 && s1.seuils.medianeRotation > 0, s1.seuils.medianeRotation);

    /* Un seuil saisi. */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('analysearticle')[0]; e.down('#seuilRotation').setValue(1.5); });
    await p.waitForTimeout(1000); await attendre();
    const s2 = await lire();
    ok('Un seuil saisi remplace la médiane et l en-tête le dit', s2.seuils.rotation === 1.5 && /vendu \/ stock ≥ 1,50 \(saisi ; médiane/.test(s2.entete), s2.entete.split('\n')[1]);

    /* Retour en jours, puis les filtres. */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('analysearticle')[0]; const c = e.down('#modeRotation'); c.setValue('JOURS'); c.fireEvent('select', c, [c.findRecordByValue('JOURS')]); });
    await attendre();
    const avant = (await lire()).total;
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('analysearticle')[0]; const c = e.down('#filtreStockOp'); c.setValue('>='); e.down('#filtreStockVal').setValue(1); c.fireEvent('select', c); });
    await p.waitForTimeout(900); await attendre();
    const s3 = await lire();
    const rappel = await p.evaluate(() => Ext.ComponentQuery.query('analysearticle')[0].down('#rappelFiltres').text);
    ok('« Stock ≥ 1 » écarte exactement les produits en rupture, et le rappel le dit', s3.total === avant - ruptures.length && /stock &gt;= 1|stock >= 1/.test(rappel), s3.total + ' contre ' + avant + ' − ' + ruptures.length + ' | ' + rappel);
    const auMoins10 = tous.data.filter((a) => a.stock >= 1 && a.quantite > 10).length;
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('analysearticle')[0]; const c = e.down('#filtreQteOp'); c.setValue('>'); e.down('#filtreQteVal').setValue(10); c.fireEvent('select', c); });
    await p.waitForTimeout(900); await attendre();
    const s4 = await lire();
    ok('« Quantité > 10 » se combine au filtre de stock', s4.total === auMoins10, s4.total + ' contre ' + auMoins10);
    await p.evaluate(() => Ext.ComponentQuery.query('analysearticle')[0].down('#effacerFiltres').el.dom.click());
    await attendre();
    ok('« Effacer les filtres » rend toute la liste', (await lire()).total === avant);

    const infobulles = await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysearticle #grilleArticles')[0]; const t = {}; g.headerCt.getGridColumns().forEach((c) => { t[c.text] = c.tooltip || ''; }); return t; });
    ok('Les colonnes portent leur formule : marge, taux, rotation, couverture', /TTC − remise − TVA/.test(infobulles['Marge']) && /marge ÷ montant HT/.test(infobulles['Taux %'])
      && /quantité vendue sur la période ÷ stock actuel/.test(infobulles['Rotation']) && /stock actuel × jours de la période ÷ quantité vendue/.test(infobulles['Couv. (j)']), Object.keys(infobulles).join(','));

    const xls = await p.evaluate(async () => { const r = await fetch('../api/v1/analyse-article/matrice/excel?typePeriode=TROIS_MOIS&stockOp=%3E%3D&stockVal=1', { credentials: 'same-origin' }); return { code: r.status, type: r.headers.get('content-type'), taille: (await r.blob()).size }; });
    ok('L export Excel répond avec les filtres', xls.code === 200 && /spreadsheet/.test(xls.type) && xls.taille > 5000, JSON.stringify(xls));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    await b.close();
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
