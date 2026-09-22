/* ORDONNANCES CLIENTS : RETOURS DU 22/09, JOUES AU CLAVIER ET A LA SOURIS.
 *
 *  - Nouvelle ordonnance a DROITE ; zone client elargie (un nom sur une ligne) ;
 *  - recherche de produit : stock en BLEU et prix en ROUGE dans la liste ; apres le choix, le curseur est dans la
 *    POSOLOGIE ;
 *  - contexte clinique (age, grossesse...) enregistre avec l'ordonnance ;
 *  - service LIGNE PAR LIGNE : quantite servie, etat Partielle / Servie, bouton « Tout servi » ;
 *  - actions par ligne : consulter, modifier, suivi de consommation (avec le stock) ;
 *  - analyse Posos depuis la fiche : rien d'identifiant ne part vers le serveur Posos ;
 *  - l'ecran Analyse posologie charge une ordonnance par son N°, avec ses posologies et son contexte ;
 *  - onglet Analyse : les taux affiches sont ceux que la base donne.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-2209';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const envoisPosos = []; p.on('request', (r) => { if (/posos\/analyse/.test(r.url())) { envoisPosos.push(r.postData() || ''); } });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);

    /* Un client qui a des achats (pour le suivi), un produit en stock (pour la recherche). */
    const client = q("SELECT c.lg_CLIENT_ID FROM t_client c JOIN t_preenregistrement p ON p.lg_CLIENT_ID=c.lg_CLIENT_ID"
      + " WHERE c.str_STATUT='enable' AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND LENGTH(TRIM(c.str_LAST_NAME))>=6"
      /* Un nom que personne d'autre ne porte : la liste des clients est paginee, un nom courant l'y noierait. */
      + " AND (SELECT COUNT(*) FROM t_client x WHERE x.str_LAST_NAME LIKE CONCAT('%', LEFT(TRIM(c.str_LAST_NAME), 6), '%')"
      + "      OR x.str_FIRST_NAME LIKE CONCAT('%', LEFT(TRIM(c.str_LAST_NAME), 6), '%')) = 1"
      + " AND p.dt_UPDATED >= DATE_SUB(NOW(), INTERVAL 11 MONTH) LIMIT 1");
    const nomClient = q("SELECT TRIM(str_LAST_NAME) FROM t_client WHERE lg_CLIENT_ID='" + client + "'");
    const produit = q("SELECT f.str_NAME FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID"
      + " WHERE s.int_NUMBER_AVAILABLE > 0 AND f.str_STATUT='enable' AND f.int_PRICE > 0 AND LENGTH(f.str_NAME) >= 8"
      + " AND f.str_NAME REGEXP '^[A-Z]' ORDER BY f.str_NAME LIMIT 1");
    ok('Précondition : un client avec des achats et un produit en stock', client && produit, client + ' / ' + produit);

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(1200); };
    const vue = () => p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].getLayout().getActiveItem().itemId);

    /* ------------------------------------------------------------------ ergonomie de l historique */
    const place = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
      const g = e.down('#grilleOrdonnances'); const n = g.down('button[itemId=nouvelle]');
      return { droite: n.getEl().getRight(), grille: g.getEl().getRight(), clientCritere: e.down('#barreCriteres #client').getWidth(),
        clientFiche: e.down('#vueFiche #ficheClient').width, liste: e.down('#vueFiche #ficheClient').listConfig.minWidth };
    });
    ok('« Nouvelle ordonnance » est à DROITE de l historique', place.grille - place.droite < 40, JSON.stringify(place));
    ok('Zones client élargies (critère 360, fiche 520, liste 480 au moins)', place.clientCritere >= 360 && place.clientFiche >= 520 && place.liste >= 480, JSON.stringify(place));

    /* ------------------------------------------------------------------ saisie d une ordonnance */
    await clic('ordonnanceclient #grilleOrdonnances button[itemId=nouvelle]');
    ok('La fiche neuve s ouvre', (await vue()) === 'vueFiche');
    const focusClient = await p.evaluate(() => document.activeElement && document.activeElement.id === Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheClient')[0].getId() + '-inputEl');
    ok('Fiche neuve : le curseur est dans le CLIENT', focusClient);
    /* Le client, tape au clavier (sans clic : le curseur y est). */
    await p.keyboard.type(nomClient.slice(0, 6), { delay: 60 });
    await p.waitForFunction((id) => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheClient')[0]; return c.isExpanded && c.getStore().findExact('lgCLIENTID', id) >= 0; }, client, { timeout: 20000 });
    const itemClient = await p.evaluate((id) => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheClient')[0]; const n = c.getPicker().getNode(c.getStore().findExact('lgCLIENTID', id)); n.scrollIntoView(); const r = n.getBoundingClientRect(); return { x: r.left + 10, y: r.top + r.height / 2, h: r.height }; }, client);
    ok('La liste des clients tient sur une ligne (hauteur d une ligne)', itemClient.h < 30, itemClient.h + ' px');
    await p.mouse.click(itemClient.x, itemClient.y); await p.waitForTimeout(600);
    /* Le curseur etait deja dans le client a l ouverture de la fiche neuve. */
    /* Le produit : un clic sur la cellule de la ligne amorcee ouvre son editeur. */
    const cellule = async (colItemId) => {
      const c = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleProduits')[0]; const col = g.down('#' + id) || g.headerCt.items.findBy((x) => x.dataIndex === id); const n = g.getView().getCell(g.getStore().getAt(0), col).dom.getBoundingClientRect(); return { x: n.left + n.width / 2, y: n.top + n.height / 2 }; }, colItemId);
      await p.mouse.click(c.x, c.y); await p.waitForTimeout(400);
    };
    await cellule('colProduit');
    await p.keyboard.type(produit.slice(0, 7), { delay: 60 });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #editeurProduit')[0]; return c && c.isExpanded && c.getStore().getCount() > 0; }, null, { timeout: 20000 });
    const liste = await p.evaluate((nom) => {
      const c = Ext.ComponentQuery.query('ordonnanceclient #editeurProduit')[0];
      const i = c.getStore().findExact('strNAME', nom); const n = c.getPicker().getNode(i >= 0 ? i : 0);
      const spans = [...n.querySelectorAll('span')].filter((x) => !x.querySelector('span')).map((s) => ({ t: s.textContent, c: getComputedStyle(s).color }));
      const r = n.getBoundingClientRect();
      return { spans, x: r.left + 10, y: r.top + r.height / 2 };
    }, produit);
    const stock = liste.spans.find((s) => /^Stock/.test(s.t)); const prix = liste.spans.find((s) => / F$/.test(s.t));
    ok('Recherche produit : le STOCK en bleu', stock && stock.c === 'rgb(30, 95, 168)', JSON.stringify(stock));
    ok('Recherche produit : le PRIX en rouge', prix && prix.c === 'rgb(192, 57, 43)', JSON.stringify(prix));
    await p.mouse.click(liste.x, liste.y);
    await p.waitForTimeout(700);
    const curseur = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('ordonnanceclient #grilleProduits')[0]; const ed = g.plugins[0];
      const col = ed.getActiveColumn ? ed.getActiveColumn() : ed.context && ed.context.column;
      const actif = document.activeElement;
      return { col: col ? col.itemId : null, saisie: actif && actif.tagName === 'INPUT', libelle: g.getStore().getAt(0).get('libelle') };
    });
    ok('Après le choix du produit, le curseur est dans la POSOLOGIE', curseur.col === 'colPosologie' && curseur.saisie && curseur.libelle === produit, JSON.stringify(curseur));
    await p.keyboard.type('1 cp matin et soir', { delay: 20 });
    /* Quantite prescrite 2, servie 1 : cliquer la cellule, taper. */
    await cellule('quantite'); await p.keyboard.press('Control+A'); await p.keyboard.type('2');
    await cellule('colServie'); await p.keyboard.press('Control+A'); await p.keyboard.type('1'); await p.keyboard.press('Enter');
    await p.waitForTimeout(400);
    /* Contexte clinique et observation (marqueur de nettoyage). */
    await p.click('#' + (await idDe('ordonnanceclient #vueFiche #agePatient')) + '-inputEl');
    await p.keyboard.type('34');
    await p.click('#' + (await idDe('ordonnanceclient #vueFiche #grossesse')) + '-boxLabelEl');
    await p.click('#' + (await idDe('ordonnanceclient #vueFiche #observations')) + '-inputEl');
    await p.keyboard.type(MARQUE);
    await clic('ordonnanceclient #vueFiche button[itemId=enregistrer]');
    await p.waitForTimeout(1000);
    const titre = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #titreFiche')[0].getValue());
    const numero = (titre.match(/ORD-\d{6}-\d{4}/) || [''])[0];
    const enBase = q("SELECT CONCAT_WS('|', o.int_AGE_PATIENT, o.bool_GROSSESSE, d.int_QUANTITE, d.int_QTE_SERVIE, d.str_POSOLOGIE) FROM t_ordonnance_client o JOIN t_ordonnance_client_detail d ON d.lg_ORDONNANCE_ID=o.lg_ORDONNANCE_ID WHERE o.str_NUMERO='" + numero + "'");
    ok('Enregistrée : âge 34, grossesse, 2 prescrits, 1 servi, posologie tapée', enBase === '34|1|2|1|1 cp matin et soir', numero + ' -> ' + enBase);
    const ordId = q("SELECT lg_ORDONNANCE_ID FROM t_ordonnance_client WHERE str_NUMERO='" + numero + "'");

    /* ------------------------------------------------------------------ editions : quantite servie */
    const telecharger = (u) => p.evaluate(async (u) => { const r = await fetch(u); const b = new Uint8Array(await r.arrayBuffer()); let t = ''; for (let i = 0; i < b.length; i += 0x8000) { t += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); } return btoa(t); }, u);
    const fs = require('fs'); const os = require('os'); const path = require('path');
    const fichier = (b64, ext) => { const f = path.join(os.tmpdir(), 'e2e-2209-' + Date.now() + ext); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return f; };
    const pdfTexte = (b64) => execFileSync('pdftotext', ['-layout', fichier(b64, '.pdf'), '-'], { encoding: 'utf8' });
    const fichePdf = pdfTexte(await telecharger('../api/v1/ordonnance-client/' + ordId + '/pdf'));
    const ligneFiche = fichePdf.split('\n').find((l) => l.indexOf(produit.slice(0, 20)) >= 0) || '';
    ok('Fiche PDF : colonne « Servie », et la ligne porte 2 prescrits, 1 servi', /Servie/.test(fichePdf) && /\b2\s+1\s+1 cp matin/.test(ligneFiche), ligneFiche.replace(/\s+/g, ' '));
    const xls = fichier(await telecharger('../api/v1/ordonnance-client/historique/excel?query=' + numero + '&annulees=false'), '.xls');
    const lu = execFileSync('python3', ['-c', "import xlrd,sys,json\nw=xlrd.open_workbook(sys.argv[1]).sheet_by_index(0)\nrows=[w.row_values(i) for i in range(w.nrows)]\nh=[r for r in rows if 'QTÉ SERVIE' in r][0]\nd=[r for r in rows if r and r[0]==sys.argv[2]][0]\nprint(json.dumps({'servie':d[h.index('QTÉ SERVIE')],'qte':d[h.index('QUANTITÉ')],'suivante':h[h.index('QTÉ SERVIE')+1]}))", xls, numero], { encoding: 'utf8' });
    const x = JSON.parse(lu);
    ok('Excel : colonne QTÉ SERVIE après QUANTITÉ, 1 servi sur 2', Number(x.servie) === 1 && Number(x.qte) === 2 && x.suivante === 'POSOLOGIE', lu);
    const histoPdf = pdfTexte(await telecharger('../api/v1/ordonnance-client/historique/pdf?query=' + numero + '&annulees=false'));
    ok('Historique PDF : colonne « Service », l ordonnance y est « Partielle »', /Service/.test(histoPdf) && new RegExp(numero + '.*Partielle').test(histoPdf.replace(/\n/g, ' ')), histoPdf.replace(/\s+/g, ' ').slice(0, 300));

    /* ------------------------------------------------------------------ Posos depuis la fiche */
    await clic('ordonnanceclient #vueFiche button[itemId=analyserPosos]');
    await p.waitForTimeout(1500);
    const posos = await p.evaluate(() => { const g = Ext.ComponentQuery.query('ordonnanceclient #alertesFiche')[0]; return { visible: g.isVisible(), message: g.down('#messagePosos').getEl().dom.textContent }; });
    ok('Analyser (Posos) depuis la fiche : le résultat s affiche sous les produits', posos.visible && posos.message.length > 3 && !/en cours/.test(posos.message), JSON.stringify(posos));
    const envoi = envoisPosos[envoisPosos.length - 1] || '';
    ok('Ce qui part vers Posos : produit, posologie, âge, grossesse - et AUCUN nom de client', /1 cp matin et soir/.test(envoi) && /"age":34/.test(envoi) && /"grossesse":true/.test(envoi) && envoi.indexOf(nomClient) < 0, envoi.slice(0, 300));

    /* ------------------------------------------------------------------ historique : etat de service */
    await clic('ordonnanceclient #retourHistorique');
    await p.waitForFunction((id) => Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances.findExact('id', id) >= 0, ordId, { timeout: 20000 });
    const etat = () => p.evaluate((id) => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0]; const n = g.getView().getNode(g.getStore().findExact('id', id)); const k = n.querySelector('.ordo-etat'); return k ? k.textContent : ''; }, ordId);
    ok('L historique dit « Partielle »', (await etat()) === 'Partielle', await etat());
    const icone = async (nom) => {
      const c = await p.evaluate((a) => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0]; const n = g.getView().getNode(g.getStore().findExact('id', a.id)); n.scrollIntoView(); const r = n.querySelector('.ordo-act-' + a.nom).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, { id: ordId, nom });
      await p.mouse.click(c.x, c.y); await p.waitForTimeout(1500);
    };
    await icone('consulter');
    const relue = await p.evaluate(() => { const f = Ext.ComponentQuery.query('ordonnanceclient #vueFiche')[0]; const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; return { age: f.down('#agePatient').getValue(), grossesse: f.down('#grossesse').getValue(), servie: e.storeProduits.getAt(0).get('qteServie'), lecture: f.down('#agePatient').readOnly }; });
    ok('Consulter (icône de la ligne) : contexte et quantité servie relus, en lecture seule', relue.age === 34 && relue.grossesse === true && relue.servie === 1 && relue.lecture === true, JSON.stringify(relue));
    await clic('ordonnanceclient #retourHistorique');
    await icone('modifier');
    await clic('ordonnanceclient #grilleProduits button[itemId=toutServir]');
    await clic('ordonnanceclient #vueFiche button[itemId=enregistrer]');
    ok('« Tout servi » puis Enregistrer : 2 servis sur 2 en base', q("SELECT d.int_QTE_SERVIE FROM t_ordonnance_client_detail d WHERE d.lg_ORDONNANCE_ID='" + ordId + "'") === '2');
    await clic('ordonnanceclient #retourHistorique');
    await p.waitForTimeout(800);
    ok('L historique dit maintenant « Servie »', (await etat()) === 'Servie', await etat());
    const xls2 = fichier(await telecharger('../api/v1/ordonnance-client/historique/excel?query=' + numero + '&annulees=false'), '.xls');
    const lu2 = JSON.parse(execFileSync('python3', ['-c', "import xlrd,sys,json\nw=xlrd.open_workbook(sys.argv[1]).sheet_by_index(0)\nrows=[w.row_values(i) for i in range(w.nrows)]\nh=[r for r in rows if 'QTÉ SERVIE' in r][0]\nd=[r for r in rows if r and r[0]==sys.argv[2]][0]\nprint(json.dumps({'servie':d[h.index('QTÉ SERVIE')]}))", xls2, numero], { encoding: 'utf8' }));
    ok('Après « Tout servi », l Excel dit 2 servis', Number(lu2.servie) === 2, JSON.stringify(lu2));


    /* ------------------------------------------------------------------ suivi de consommation */
    await icone('conso');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; return !e.storeConso.isLoading() && e.storeConso.getCount() > 0; }, null, { timeout: 30000 });
    const conso = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const v = e.down('#vueConso'); return { vue: e.getLayout().getActiveItem().itemId, lignes: e.storeConso.getCount(), avecStock: e.storeConso.getRange().filter((r) => r.get('stock') !== null).length, resume: v.down('#resumeConso').getEl().dom.textContent, titre: v.down('#titreConso').getEl().dom.textContent }; });
    /* La reference : le service du suivi de consommation de la gestion des clients, sur la meme periode. */
    const attendu = await p.evaluate(async (id) => { const v = Ext.ComponentQuery.query('ordonnanceclient #vueConso')[0]; const j = (s) => Ext.Date.format(v.down(s).getValue(), 'Y-m-d'); const r = await fetch('../api/v1/client/consommation?clientId=' + id + '&dtStart=' + j('#consoDebut') + '&dtEnd=' + j('#consoFin') + '&start=0&limit=0'); return JSON.parse(await r.text()).total; }, client);
    ok('Suivi de consommation (icône de la ligne) : la vue s ouvre sur le client', conso.vue === 'vueConso' && /Suivi de consommation/.test(conso.titre) && /produit\(s\) achet/.test(conso.resume), JSON.stringify(conso));
    ok('Les produits du suivi sont ceux du suivi de consommation des clients, avec leur stock', conso.lignes === attendu && conso.avecStock === conso.lignes, conso.lignes + ' / ' + attendu + ' ; stock sur ' + conso.avecStock);
    await clic('ordonnanceclient #vueConso button[itemId=retourConso]');
    ok('Retour : on revient à l historique', (await vue()) === 'onglets');

    /* ------------------------------------------------------------------ Analyse posologie : charge l ordonnance */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pososmanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('pososmanager #referenceVente').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    await p.click('#' + (await idDe('pososmanager #referenceVente')) + '-inputEl');
    await p.keyboard.type(numero); await p.keyboard.press('Enter');
    await p.waitForFunction(() => Ext.ComponentQuery.query('pososmanager #lignes')[0].getStore().getCount() > 0, null, { timeout: 20000 });
    const ps = await p.evaluate(() => { const l = Ext.ComponentQuery.query('pososmanager #lignes')[0].getStore().getAt(0); return { nom: l.get('nom'), poso: l.get('posologie'), age: Ext.ComponentQuery.query('pososmanager #age')[0].getValue(), grossesse: Ext.ComponentQuery.query('pososmanager #grossesse')[0].getValue() }; });
    ok('Analyse posologie charge l ordonnance par son N° : produit, posologie et contexte', ps.nom === produit && ps.poso === '1 cp matin et soir' && ps.age === 34 && ps.grossesse === true, JSON.stringify(ps));

    /* ------------------------------------------------------------------ onglet analyse */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #onglets').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    const onglet = await p.evaluate(() => { const t = Ext.ComponentQuery.query('ordonnanceclient #onglets')[0]; const tab = t.down('#vueAnalyse').tab; return tab.getId(); });
    await p.click('#' + onglet); await p.waitForTimeout(2500);
    const ana = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; return { tuiles: e.down('#tuilesAnalyse').getEl().dom.textContent, valeurs: [...e.down('#tuilesAnalyse').getEl().dom.querySelectorAll('.ordo-tuile-valeur')].map((x) => x.textContent), prescripteurs: e.storeParPrescripteur.getCount(), produits: e.storeProduitsAnalyse.getCount() }; });
    const fenetre = "o.dt_ORDONNANCE >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND o.dt_ORDONNANCE <= CURDATE()";
    const nb = q("SELECT COUNT(*) FROM t_ordonnance_client o WHERE " + fenetre);
    const lignes = q("SELECT CONCAT_WS('|', COUNT(d.int_QTE_SERVIE), SUM(d.int_QTE_SERVIE >= d.int_QUANTITE)) FROM t_ordonnance_client o JOIN t_ordonnance_client_detail d ON d.lg_ORDONNANCE_ID=o.lg_ORDONNANCE_ID WHERE o.str_STATUT<>'annulee' AND " + fenetre).split('|');
    const satisf = Number(lignes[0]) ? (Math.round(Number(lignes[1]) * 1000 / Number(lignes[0])) / 10).toFixed(1).replace('.', ',') : '—';
    ok('Onglet Analyse : le nombre d ordonnances est celui de la base', ana.valeurs[0] === nb, nb + ' / ' + ana.tuiles.slice(0, 160));
    ok('Onglet Analyse : la satisfaction est celle de la base (lignes servies / renseignées)', ana.valeurs[2] === (satisf === '—' ? '—' : satisf + ' %'), satisf + ' / ' + ana.tuiles.slice(0, 260));
    ok('Onglet Analyse : ventilation par prescripteur et produits prescrits remplis', ana.prescripteurs > 0 && ana.produits > 0, JSON.stringify(ana).slice(0, 200));
    ok('Aucune erreur JavaScript sur tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    await b.close();
    exec("DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID=d.lg_ORDONNANCE_ID WHERE o.str_OBSERVATIONS='" + MARQUE + "'; DELETE FROM t_ordonnance_client WHERE str_OBSERVATIONS='" + MARQUE + "'");
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
