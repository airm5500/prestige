/* RETOURS DE L'OFFICINE DU 21/09 (seconde salve) : ce que l'ecran fait quand on decoche tout, les infobulles
 * des valeurs de la matrice, la comparaison des gardes en mode « Tout » et ses colonnes dynamiques.
 *
 *  - Pilotage / KPI : tout decocher VIDE les tuiles, le graphique et les colonnes - « j'ai decoche tous les KPI
 *    mais je vois des donnees » ; et le graphique porte EXACTEMENT une courbe par indicateur coche, aucune trace
 *    du dessin precedent - « les memes couleurs se repetent, la ligne du bas on ne sait pas a quoi elle sert ».
 *  - Pilotage / comparateur : la frequentation horaire n'est plus proposee comme grandeur comparable.
 *  - Matrice : les cellules Rotation et Couv. (j) portent une infobulle bleue avec la formule ET les nombres de
 *    la ligne ; les filtres stock et quantite sont sur la ligne du haut, avant « Effacer les filtres ».
 *  - Gardes / comparaison : « Tout » trace tous les indicateurs en barres minces, en % de leur maximum, la vraie
 *    valeur ecrite ; les colonnes de modes de reglement a zero partout sont cachees ; l'evolution est entre
 *    parentheses sur clients, ventes, credit, especes, mobile.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-G21B';
let KGA3 = '';

(async () => {
  KGA3 = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  exec("DELETE FROM garde WHERE libelle LIKE '" + MARQUE + " %'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1800, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);

    /* ------------------------------------------------------------ pilotage : tout decocher */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pilotage', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #onglets').length > 0, null, { timeout: 30000 });
    await p.waitForFunction(() => { const z = Ext.ComponentQuery.query('pilotage #barrePeriode #zoneProgression')[0]; return !z || z.isHidden(); }, null, { timeout: 300000 });
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('pilotage #barrePeriode combobox')[0]; a.setValue('G12'); a.fireEvent('select', a); });
    await p.waitForTimeout(2000);
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('pilotage #onglets')[0]; o.setActiveTab(o.items.items.filter((t) => t.title === 'KPI Analyse')[0]); });
    const attendre = async () => { await p.waitForFunction(() => { const o = Ext.ComponentQuery.query('pilotage #onglet-kpi')[0]; return o && !(o.loadMask && o.loadMask.isVisible()); }, null, { timeout: 60000 }); await p.waitForTimeout(1200); };
    await attendre();
    const etat = () => p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const g = Ext.ComponentQuery.query('pilotage #graphique-kpi')[0];
      const series = g ? g.series.items.map((s) => ({ titre: s.title, champ: s.yField, couleur: s.style && s.style.stroke })) : [];
      /* Les courbes des KPI sont tracees en trait de 3 : les axes et la grille, en trait de 1, ne comptent pas. */
      const traits = g && g.el ? g.el.query('svg path').filter((el) => String(el.getAttribute('stroke-width')) === '3' && el.getAttribute('d') && el.getAttribute('d').length > 40).length : -1;
      return { tuiles: e.stores.kpi.tuiles.getCount(), series, traits, cols: e.down('#detail-kpi').headerCt.getGridColumns().length, titre: e.down('#graphiquePanneau-kpi').title };
    });
    const s0 = await etat();
    ok('Au départ, trois indicateurs cochés : trois tuiles et trois courbes, chacune de sa couleur, aucune autre',
      s0.tuiles === 3 && s0.series.length === 3 && new Set(s0.series.map((s) => s.couleur)).size === 3 && s0.traits === 3, JSON.stringify(s0));
    /* Cocher deux de plus puis les decocher : le nombre de traits suit EXACTEMENT, rien ne s'empile. */
    const clic = (k, v) => p.evaluate(([k, v]) => { Ext.ComponentQuery.query('pilotage #casesKpi checkbox').filter((c) => c.cleKpi === k)[0].setValue(v); }, [k, v]);
    await clic('marge', true); await attendre(); await clic('tauxMarge', true); await attendre();
    const s1 = await etat();
    ok('Cinq cochés : cinq courbes de cinq couleurs, cinq traits dessinés, pas un de plus', s1.series.length === 5 && new Set(s1.series.map((s) => s.couleur)).size === 5 && s1.traits === 5, JSON.stringify({ n: s1.series.length, traits: s1.traits }));
    await clic('marge', false); await attendre(); await clic('tauxMarge', false); await attendre();
    const s2 = await etat();
    ok('Décochés : retour à trois traits, les anciennes courbes ne restent pas dessinées', s2.series.length === 3 && s2.traits === 3, JSON.stringify({ n: s2.series.length, traits: s2.traits }));
    for (const k of ['caTTC', 'nbVentes', 'panier']) { await clic(k, false); await attendre(); }
    const s3 = await etat();
    ok('TOUT décoché : aucune tuile, aucune courbe, aucun trait, une seule colonne (le mois), et le titre le dit',
      s3.tuiles === 0 && s3.series.length === 0 && s3.traits === 0 && s3.cols === 1 && /aucun indicateur/.test(s3.titre), JSON.stringify(s3));
    await clic('caTTC', true); await attendre();
    const s4 = await etat();
    ok('Recocher un indicateur le fait revenir seul', s4.tuiles === 1 && s4.series.length === 1 && s4.traits === 1, JSON.stringify({ t: s4.tuiles, n: s4.series.length }));
    const detail = await p.evaluate(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; const g = e.down('#detail-kpi'); const n = g.getView().getNode(0); return n ? n.innerHTML : ''; });
    ok('Le détail mensuel des KPI est redevenu basique : la valeur seule, sans seconde ligne d évolution', detail.length > 0 && !/pilotage-seconde-ligne/.test(detail));

    /* Le comparateur ne propose plus la frequentation horaire comme grandeur. */
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('pilotage #onglets')[0]; o.setActiveTab(o.items.items.filter((t) => t.title === 'Comparateur')[0]); });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('pilotage #choixComparateur #typeComparaison')[0]; c.setValue('GRANDEUR'); c.fireEvent('select', c); });
    await p.waitForTimeout(800);
    const grandeurs = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #choixComparateur #objetB')[0].getStore().getRange().map((r) => r.get('cle')));
    ok('Le comparateur de grandeurs ne propose plus la fréquentation horaire (pas mensuelle : sa courbe restait à plat)', grandeurs.length >= 10 && grandeurs.indexOf('frequentation') < 0 && grandeurs.indexOf('caTTC') >= 0, grandeurs.join(','));

    /* ------------------------------------------------------------ matrice : infobulles des valeurs */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('analysearticle', {}));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('analysearticle')[0]; return e && e.derniereAnalyse && !e.articleStore.isLoading(); }, null, { timeout: 120000 });
    await p.waitForTimeout(800);
    const bulles = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('analysearticle')[0];
      const g = e.down('#grilleArticles');
      const cols = g.headerCt.getGridColumns();
      const iRot = cols.findIndex((c) => c.dataIndex === 'rotation'), iCouv = cols.findIndex((c) => c.dataIndex === 'couverture');
      const ligne = g.getView().getNode(0);
      const cellules = ligne.querySelectorAll('td');
      const r = e.articleStore.getAt(0);
      const barre = e.down('#effacerFiltres').up('toolbar');
      const ordre = barre.items.items.map((i) => i.itemId).filter(Boolean);
      return { rot: cellules[iRot].getAttribute('data-qtip'), couv: cellules[iCouv].getAttribute('data-qtip'), classe: cellules[iRot].getAttribute('data-qclass'),
        largeur: cellules[iRot].getAttribute('data-qwidth'), q: r.get('quantite'), stock: r.get('stock'),
        jours: e.derniereAnalyse.periode.jours, ordre, memeBarre: e.down('#filtreStockOp').up('toolbar') === e.down('#filtreQuadrant').up('toolbar') };
    });
    ok('La cellule Rotation porte une infobulle bleue et large avec la formule ET les nombres de la ligne et la période',
      bulles.classe === 'aa-bulle' && Number(bulles.largeur) >= 400 && /Rotation/.test(bulles.rot) && bulles.rot.indexOf(String(bulles.jours) + ' jours') >= 0
      && (bulles.stock > 0 ? bulles.rot.indexOf('en stock') >= 0 : /RUPTURE/.test(bulles.rot)), String(bulles.rot).slice(0, 200));
    ok('La cellule Couv. (j) aussi, avec le seuil en jours', /Couverture/.test(bulles.couv) && /Seuil/.test(bulles.couv), String(bulles.couv).slice(0, 200));
    ok('Les filtres stock et quantité sont sur la ligne du haut, AVANT « Effacer les filtres »',
      bulles.ordre.indexOf('filtreStockOp') >= 0 && bulles.ordre.indexOf('filtreQteVal') >= 0 && bulles.ordre.indexOf('filtreQteVal') < bulles.ordre.indexOf('effacerFiltres') && bulles.memeBarre, bulles.ordre.join(','));
    /* L'infobulle s'affiche au survol de la cellule et disparait quand on la quitte. */
    const cible = await p.evaluate(() => { const e = Ext.ComponentQuery.query('analysearticle')[0]; const g = e.down('#grilleArticles'); const i = g.headerCt.getGridColumns().findIndex((c) => c.dataIndex === 'rotation'); const r = g.getView().getNode(0).querySelectorAll('td')[i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.move(cible.x, cible.y); await p.waitForTimeout(1200);
    const visible = await p.evaluate(() => { const t = document.querySelector('.aa-bulle.x-tip'); return t && t.offsetParent !== null && getComputedStyle(t).visibility !== 'hidden' ? t.innerText : ''; });
    ok('Au survol, l infobulle bleue s affiche en entier', /Rotation/.test(visible) && visible.length > 60, visible.slice(0, 120));
    await p.mouse.move(10, 500); await p.waitForTimeout(800);
    const cachee = await p.evaluate(() => { const t = document.querySelector('.aa-bulle.x-tip'); return !t || t.offsetParent === null || getComputedStyle(t).visibility === 'hidden' || getComputedStyle(t).display === 'none'; });
    ok('Et elle disparaît quand on quitte la cellule', cachee);

    /* ------------------------------------------------------------ gardes : comparaison « Tout » */
    const poster = (params) => p.evaluate(async (params) => { const corps = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&'); const r = await fetch('../api/v1/gardes', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps }); return await r.json(); }, params);
    /* Deux gardes sur des periodes qui ont des ventes au banc (fin 2025), pour que les barres aient de quoi vivre. */
    await poster({ libelle: MARQUE + ' A', dateDebut: '2025-11-03 20:00', dateFin: '2025-11-04 08:00' });
    await poster({ libelle: MARQUE + ' B', dateDebut: '2025-11-10 20:00', dateFin: '2025-11-11 08:00' });
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('gardemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager').length > 0 && !Ext.ComponentQuery.query('gardemanager')[0].gardeStore.isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('gardemanager #ongletsGarde')[0]; o.setActiveTab(Ext.ComponentQuery.query('gardemanager #ongletComparaison')[0]); });
    await p.evaluate((m) => { const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0]; const s = g.getStore(); g.getSelectionModel().select([s.getAt(s.findExact('libelle', m + ' A')), s.getAt(s.findExact('libelle', m + ' B'))]); }, MARQUE);
    await p.evaluate(() => { Ext.ComponentQuery.query('gardemanager #comparerSelection')[0].el.dom.click(); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager')[0].comparaisonStore.getCount() === 2, null, { timeout: 30000 });
    await p.waitForTimeout(900);
    const lig = await p.evaluate(() => { const e = Ext.ComponentQuery.query('gardemanager')[0]; return e.comparaisonStore.getRange().map((r) => r.getData()); });
    const evol = (a, b) => b === 0 ? '' : (Math.round((a - b) * 100 / Math.abs(b))) + ' %';
    const colonnes = await p.evaluate(() => { const g = Ext.ComponentQuery.query('gardemanager #grilleComparaison')[0]; const c2 = g.getView().getNode(1).querySelectorAll('td'); return g.headerCt.getGridColumns().map((c, i) => ({ id: c.dataIndex, visible: !c.isHidden(), texte: c2[i] ? c2[i].innerText.replace(/\s+/g, ' ').trim() : '' })); });
    const colClients = colonnes.filter((c) => c.id === 'clients')[0];
    ok('La seconde garde porte son évolution de clients entre parenthèses : « ' + colClients.texte + ' »',
      colClients.texte.indexOf('(' ) > 0 && colClients.texte.indexOf(evol(lig[1].clients, lig[0].clients).replace('-', '-')) > 0, colClients.texte + ' attendu ' + evol(lig[1].clients, lig[0].clients));
    const modes = colonnes.filter((c) => ['caEspeces', 'caMobile', 'caCheque', 'caCarte', 'caDiffere', 'caAutres'].indexOf(c.id) >= 0);
    const coherents = modes.every((c) => c.visible === ((Math.abs(lig[0][c.id] || 0) + Math.abs(lig[1][c.id] || 0)) > 0));
    ok('Les colonnes des modes de règlement à zéro sur toutes les gardes comparées sont cachées, les autres visibles',
      coherents && modes.some((c) => !c.visible) && modes.some((c) => c.visible), modes.map((c) => c.id + ':' + (c.visible ? 'vue' : 'cachée')).join(' '));
    await p.evaluate(() => { const cb = Ext.ComponentQuery.query('gardemanager #grandeurComparaison')[0]; cb.setValue('TOUT'); cb.fireEvent('select', cb, [cb.findRecordByValue('TOUT')]); });
    await p.waitForTimeout(1200);
    const tout = await p.evaluate(() => { const c = Ext.ComponentQuery.query('gardemanager #courbeComparaison')[0]; const e = Ext.ComponentQuery.query('gardemanager')[0]; const s0 = c.series.items[0]; const r = e.comparaisonStore.getAt(0).getData(); return { champs: [].concat(s0.yField), max: c.axes.items[0].maximum, rects: c.el.query('svg rect').length, pct: [r.pct_montant, r.pct_clients], legende: e.down('#legendeComparaison').text }; });
    const maxAttendu = Math.max(lig[0].montant, lig[1].montant);
    ok('« Tout » : une série à six grandeurs en barres minces, axe en % du maximum, la garde la plus forte à 100',
      tout.champs.length === 6 && tout.max === 100 && tout.rects >= 12 && (lig[0].montant === maxAttendu ? tout.pct[0] === 100 : tout.pct[0] < 100) && /% de son maximum/.test(tout.legende), JSON.stringify(tout));

    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    await b.close();
    exec("DELETE FROM garde WHERE libelle LIKE '" + MARQUE + " %'");
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
