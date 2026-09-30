/* ORDONNANCES, RETOURS DU 30/09 (maquettes validees) : HISTORIQUE REVU et SCAN D'UNE ORDONNANCE EN 3 PARTIES.
 *
 * 1. Historique : onglets segmentes, criteres en puces, « Nouvelle ordonnance » et « Scanner » a gauche, compteurs
 *    cliquables, colonnes regroupees (type et telephone sous le client).
 * 2. Scan SANS lecture automatique (saisie assistee) : depot d'une photo, l'image a gauche, un produit ajoute par la
 *    recherche, un NOUVEAU client standard, Ctrl+Entree : ordonnance creee, scan joint en piece, scan traite.
 * 3. Scan AVEC lecture : un faux service Posos local (le vrai n'est pas accessible) repond ; la configuration du BANC
 *    est posee le temps du test puis remise telle quelle. Produits, patient et prescripteur pre-remplis, ligne
 *    incertaine en orange ; « Ecarter ».
 *
 * Donnees de test (ZZSCAN) retirees a la fin ; clients et produits reels seulement lus.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const http = require('http');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const CONF = process.env.POSOS_CONF || '/root/prestige/config/posos.properties';
const NOM = 'ZZSCAN';
const TMP = require('os').tmpdir();
const scans = [];
let confOrigine = null;
let serveur = null;

(async () => {
  /* Un produit reel en stock, lu par sa premiere syllabe. */
  const produit = q("SELECT f.str_NAME FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID WHERE f.str_STATUT='enable'"
    + " AND s.int_NUMBER_AVAILABLE > 5 AND f.str_NAME REGEXP '^[A-Z]{5,} ' ORDER BY s.int_NUMBER_AVAILABLE DESC LIMIT 1");
  const mot = produit.split(' ')[0];
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  /* Deux ordonnances « papier », dessinees puis photographiees. */
  const dessin = await b.newPage({ viewport: { width: 620, height: 820 } });
  const photo = async (fichier, lignes) => {
    await dessin.setContent('<body style="margin:0;background:#fbfaf6;color:#1d2a6b;padding:30px;font:26px cursive">'
      + '<div style="font:13px Arial;border-bottom:1px solid #999">Dr ZZDOC Test - Cabinet</div>' + lignes.map((l) => '<p>' + l + '</p>').join('') + '</body>');
    await dessin.screenshot({ path: fichier });
  };
  const IMG1 = TMP + '/zzscan-1.png'; const IMG2 = TMP + '/zzscan-2.png';
  await photo(IMG1, [NOM + ' Awa', produit, '1 cp matin et soir']);
  await photo(IMG2, [NOM + ' Koffi', mot + ' 500', 'Produit illisible']);
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2500);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel, t) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(t || 900); };

    /* ------------------------------------------------ 1. historique revu */
    const h = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('ordonnanceclient')[0];
      const g = e.down('#grilleOrdonnances');
      const x = (s) => e.down(s);
      return { onglets: x('#onglets').hasCls('ordo-onglets'), puces: x('#barreCriteres #typesPuces').items.getCount(),
        tous: x('#barreCriteres #typesPuces').items.getAt(0).pressed, typeCache: x('#barreCriteres #typeClient').hidden,
        nouvelleGauche: g.down('button[itemId=nouvelle]').getEl().getLeft() < g.down('button[itemId=scanner]').getEl().getLeft(),
        scannerAvantCompteurs: g.down('button[itemId=scanner]').getEl().getLeft() < x('#compteursHistorique').getEl().getLeft(),
        compteurs: x('#compteursHistorique').getEl().dom.textContent,
        colonnes: g.headerCt.getVisibleGridColumns().map((c) => c.text) };
    });
    ok('Historique : onglets segmentés, type de client en puces (« Tous » + types), combo caché', h.onglets && h.puces >= 4 && h.tous && h.typeCache, JSON.stringify(h));
    ok('Historique : « Nouvelle ordonnance » puis « Scanner une ordonnance » à gauche, compteurs à côté', h.nouvelleGauche && h.scannerAvantCompteurs && /ordonnance/.test(h.compteurs) && /reste à délivrer/.test(h.compteurs) && /renouveler/.test(h.compteurs), h.compteurs);
    ok('Historique : colonnes regroupées (N° / DATE, pas de TYPE, ÉTABLISSEMENT, SAISIE ni PAR)', h.colonnes.indexOf('N° / DATE') === 0 && h.colonnes.indexOf('TYPE') < 0 && h.colonnes.indexOf('ÉTABLISSEMENT') < 0 && h.colonnes.indexOf('SAISIE') < 0, h.colonnes.join(','));
    await p.click('.ordo-compteur-reste');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; return e.down('#barreCriteres #reste').getValue() === true && !e.storeOrdonnances.isLoading(); }, null, { timeout: 15000 });
    await p.waitForTimeout(600);
    const filtre = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; return { param: e.storeOrdonnances.getProxy().extraParams.reste, actif: !!document.querySelector('.ordo-compteur-reste.ordo-compteur-actif') }; });
    ok('Compteur « avec un reste » cliqué : le filtre est posé et le compteur s\'allume', filtre.param === true && filtre.actif, JSON.stringify(filtre));
    await clic('ordonnanceclient #barreCriteres button[itemId=periode7]', 1200);
    const periode = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const p = e.storeOrdonnances.getProxy().extraParams; return p.dtStart + '|' + p.dtEnd; });
    const j = new Date(); const d7 = new Date(j.getTime() - 6 * 86400000); const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    ok('Puce « 7 jours » : période posée et recherche relancée', periode === iso(d7) + '|' + iso(j), periode);
    const typeStd = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #barreCriteres #typesPuces button').find((x) => x.text === 'Standard').getId());
    await p.click('#' + typeStd); await p.waitForTimeout(1000);
    ok('Puce « Standard » : le type est filtré', (await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances.getProxy().extraParams.typeClientId)) === '6');
    await clic('ordonnanceclient #barreCriteres button[itemId=reinitialiser]', 1200);
    const raz = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const p = e.storeOrdonnances.getProxy().extraParams;
      return { p: p.reste + '|' + p.typeClientId + '|' + p.dtStart, tous: e.down('#barreCriteres #typesPuces').items.getAt(0).pressed, sept: e.down('#barreCriteres #periode7').pressed }; });
    ok('Réinitialiser : filtres, type et période effacés, « Tous » enfoncé', raz.p === 'false||' && raz.tous && !raz.sept, JSON.stringify(raz));

    /* ------------------------------------------------ 2. scan sans lecture automatique */
    await clic('ordonnanceclient #grilleOrdonnances button[itemId=scanner]', 1500);
    const carte = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].getLayout().getActiveItem().itemId);
    ok('« Scanner une ordonnance » ouvre l\'écran de scan', carte === 'vueScan', carte);
    const fichier = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueScan #fichierScan')[0].fileInputEl.dom.id);
    await p.setInputFiles('#' + fichier, IMG1);
    await p.waitForFunction(() => { const i = document.querySelector('.ordo-scan-image'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const s1 = q("SELECT CONCAT_WS('|', lg_SCAN_ID, str_STATUT, str_SOURCE, str_TYPE_MIME) FROM t_ordonnance_scan ORDER BY dt_CREATED DESC LIMIT 1").split('|');
    scans.push(s1[0]);
    ok('Photo déposée : scan « à traiter », source poste, et l\'image s\'affiche à gauche', s1[1] === 'a_traiter' && s1[2] === 'poste' && s1[3] === 'image/png', s1.join(' | '));
    const etat1 = await p.evaluate(() => { const v = Ext.ComponentQuery.query('ordonnanceclient #vueScan')[0]; return { message: v.down('#messageScan').getEl().dom.textContent,
      lire: v.down('#lireScan').isDisabled(), valider: v.down('#validerScan').isDisabled(), file: document.querySelectorAll('.ordo-puce-scan').length, active: !!document.querySelector('.ordo-puce-scan-active') }; });
    ok('Sans lecture branchée : saisie assistée annoncée, « Lire » et « Créer » grisés, le scan est dans la file', /non branchée/.test(etat1.message) && etat1.lire && etat1.valider && etat1.file >= 1 && etat1.active, JSON.stringify(etat1));
    await p.evaluate(() => { const v = Ext.ComponentQuery.query('ordonnanceclient #vueScan')[0]; v.down('#zoomPlus').fireEvent('click', v.down('#zoomPlus')); v.down('#pivoter').fireEvent('click', v.down('#pivoter')); });
    const transfo = await p.evaluate(() => document.querySelector('.ordo-scan-image').style.transform);
    ok('Zoom et rotation de l\'image', /scale\(1\.25\)/.test(transfo) && /rotate\(90deg\)/.test(transfo), transfo);
    await p.click('#' + (await idDe('ordonnanceclient #vueScan #rechercheScan')) + '-inputEl');
    await p.keyboard.type(mot, { delay: 40 });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueScan #rechercheScan')[0]; return c.isExpanded && c.getStore().getCount() > 0; }, null, { timeout: 15000 });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    await p.waitForTimeout(900);
    await p.keyboard.type('1 cp matin et soir'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    const ligne = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const r = e.storeScanLignes.getAt(0); return r ? { art: r.get('articleId'), lib: r.get('libelle'), poso: r.get('posologie'), q: r.get('quantite'), stock: r.get('stock') } : null; });
    ok('Produit ajouté par la recherche, avec son stock ; posologie saisie', ligne && ligne.art && ligne.poso === '1 cp matin et soir' && ligne.q === 1 && ligne.stock > 0, JSON.stringify(ligne));
    await p.click('.ordo-qte button[data-qte="plus"]'); await p.waitForTimeout(200);
    await p.click('.ordo-qte button[data-qte="plus"]'); await p.waitForTimeout(200);
    await p.click('.ordo-qte button[data-qte="moins"]'); await p.waitForTimeout(200);
    ok('− / + de la quantité', (await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeScanLignes.getAt(0).get('quantite'))) === 2);
    /* Validation sans client ni nom : refusee avec la raison. */
    await p.evaluate(() => { Ext.ComponentQuery.query('ordonnanceclient #vueScan #rechercheScan')[0].focus(); });
    await p.keyboard.press('Control+Enter'); await p.waitForTimeout(800);
    const sansNom = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueScan #messageScan')[0].getEl().dom.textContent);
    ok('Ctrl+Entrée sans client ni nom : refus expliqué', /nouveau client standard/.test(sansNom), sansNom);
    await p.click('#' + (await idDe('ordonnanceclient #vueScan #scNom')) + '-inputEl'); await p.keyboard.type(NOM);
    await p.click('#' + (await idDe('ordonnanceclient #vueScan #scPrenoms')) + '-inputEl'); await p.keyboard.type('AWA');
    await p.click('#' + (await idDe('ordonnanceclient #vueScan #scNaissance')) + '-inputEl'); await p.keyboard.type('12/04/19');
    await p.keyboard.press('Control+Enter');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient')[0].getLayout().getActiveItem().itemId === 'vueFiche', null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    const cree = q("SELECT CONCAT_WS('|', o.lg_ORDONNANCE_ID, c.lg_TYPE_CLIENT_ID, DATE(c.dt_NAISSANCE), (SELECT COUNT(*) FROM t_ordonnance_client_detail d WHERE d.lg_ORDONNANCE_ID=o.lg_ORDONNANCE_ID),"
      + " (SELECT MAX(d.int_QUANTITE) FROM t_ordonnance_client_detail d WHERE d.lg_ORDONNANCE_ID=o.lg_ORDONNANCE_ID), (SELECT COUNT(*) FROM t_ordonnance_client_piece x WHERE x.lg_ORDONNANCE_ID=o.lg_ORDONNANCE_ID))"
      + " FROM t_ordonnance_client o JOIN t_client c ON c.lg_CLIENT_ID=o.lg_CLIENT_ID WHERE c.str_FIRST_NAME='" + NOM + "' AND c.str_LAST_NAME='AWA'").split('|');
    ok('Ctrl+Entrée : client STANDARD créé (né le 12/04/2019), ordonnance à 1 produit (qté 2), scan joint en pièce', cree[1] === '6' && cree[2] === '2019-04-12' && cree[3] === '1' && cree[4] === '2' && cree[5] === '1', cree.join(' | '));
    ok('Le scan est « traité » et lié à l\'ordonnance', q("SELECT CONCAT_WS('|', str_STATUT, lg_ORDONNANCE_ID) FROM t_ordonnance_scan WHERE lg_SCAN_ID='" + s1[0] + "'") === 'traite|' + cree[0]);
    const fiche = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const f = e.down('#vueFiche'); return { client: f.down('#ficheClient').getRawValue(), pieces: e.storePieces.getCount(), naissance: f.down('#naissancePatient').getRawValue() }; });
    ok('La fiche de l\'ordonnance créée s\'ouvre, scan en pièce, date de naissance reprise', /ZZSCAN/.test(fiche.client) && fiche.pieces === 1 && fiche.naissance === '12/04/2019', JSON.stringify(fiche));
    const pdfRefus = await p.evaluate(async () => { const fd = new FormData(); fd.append('fichier', new Blob(['x'], { type: 'application/msword' }), 'ordo.docx');
      return (await (await fetch('../api/v1/ordonnance-client/scans?source=poste', { method: 'POST', body: fd })).text()); });
    ok('Un fichier qui n\'est ni photo ni PDF est refusé', /photo/.test(pdfRefus), pdfRefus);

    /* ------------------------------------------------ 3. scan AVEC lecture (faux Posos local) */
    /* Un prescripteur de test (le banc n'en a pas d'actif), retire a la fin. */
    exec("INSERT INTO t_medecin (lg_MEDECIN_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED) VALUES ('ZZSCAN-MED', 'AWA', 'ZZSCANDOC', 'enable', NOW())");
    const medecin = ['ZZSCAN-MED', 'Dr ZZSCANDOC'];
    const recu = [];
    serveur = http.createServer((req, rep) => {
      let corps = ''; req.on('data', (c) => { corps += c; });
      req.on('end', () => {
        recu.push({ url: req.url, taille: corps.length, auth: req.headers.authorization || '' });
        rep.setHeader('Content-Type', 'application/json');
        if (req.url === '/oauth/token') { rep.end(JSON.stringify({ access_token: 'jeton-test', expires_in: 3600 })); return; }
        rep.end(JSON.stringify({ data: { medications: [{ name: mot + ' 500', dosage: '2 fois par jour', quantity: 3, confidence: 0.95 },
          { name: 'Qwxzv illisible', confidence: 0.4 }], patient: { lastName: NOM, firstName: 'Koffi', age: 7 },
          prescriber: { name: medecin[1] }, date: iso(j) } }));
      });
    });
    await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
    confOrigine = fs.readFileSync(CONF, 'utf8');
    fs.writeFileSync(CONF, 'POSOS_API_URL=http://127.0.0.1:' + serveur.address().port + '\nPOSOS_CLIENT_ID=test\nPOSOS_CLIENT_SECRET=test\n'
      + 'POSOS_PRESCRIPTION_PATH=/v1/prescription\n');
    await p.evaluate(() => testextjs.app.getController('OrdonnanceClientCtr').ouvrirScan());
    await p.waitForTimeout(1500);
    const f2 = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueScan #fichierScan')[0].fileInputEl.dom.id);
    await p.setInputFiles('#' + f2, IMG2);
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeScanLignes.getCount() === 2, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    scans.push(q('SELECT lg_SCAN_ID FROM t_ordonnance_scan ORDER BY dt_CREATED DESC LIMIT 1'));
    const lu = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const v = e.down('#vueScan');
      return { lignes: e.storeScanLignes.getRange().map((r) => ({ lu: r.get('texteLu'), art: !!r.get('articleId'), lib: r.get('libelle'), poso: r.get('posologie'), q: r.get('quantite'), doute: r.get('aVerifier') })),
        nom: v.down('#scNom').getValue(), prenoms: v.down('#scPrenoms').getValue(), medecin: v.down('#scanMedecin').getValue(), patientLu: v.down('#patientLu').getEl().dom.textContent,
        orange: document.querySelectorAll('.ordo-scan-doute').length, message: v.down('#messageScan').getEl().dom.textContent, lire: !v.down('#lireScan').isDisabled() }; });
    ok('Lecture automatique : produit lu rapproché du catalogue, posologie et quantité reprises', lu.lignes[0].art && lu.lignes[0].lib.indexOf(mot) === 0 && lu.lignes[0].poso === '2 fois par jour' && lu.lignes[0].q === 3 && !lu.lignes[0].doute, JSON.stringify(lu.lignes[0]));
    ok('Ligne illisible : gardée telle que lue, à vérifier (en orange)', lu.lignes[1].doute && !lu.lignes[1].art && lu.orange === 1 && /1 à vérifier/.test(lu.message), JSON.stringify(lu.lignes[1]) + ' ' + lu.message);
    ok('Patient lu (nouveau client standard pré-rempli), prescripteur retrouvé', lu.nom === NOM && lu.prenoms === 'KOFFI' && /7 ans/.test(lu.patientLu) && lu.medecin === medecin[0] && lu.lire, JSON.stringify(lu));
    const appel = recu.find((r) => r.url === '/v1/prescription');
    ok('Posos a reçu le document, avec le jeton', appel && appel.taille > 1000 && appel.auth === 'Bearer jeton-test', JSON.stringify(recu.map((r) => r.url)));
    ok('La lecture est gardée en base (pas de nouvel appel à la réouverture)', q("SELECT str_ETAT_LECTURE FROM t_ordonnance_scan WHERE lg_SCAN_ID='" + scans[1] + "'") === 'lu');
    await clic('ordonnanceclient #vueScan button[itemId=ecarterScan]', 600);
    const oui = await p.evaluate(() => { const box = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; const btn = box && box.query('button{isVisible()}').find((x) => /oui|yes/i.test(x.text || x.itemId || '')); return btn ? '#' + btn.el.dom.id : null; });
    await p.click(oui); await p.waitForTimeout(1500);
    ok('« Écarter ce scan » : le scan quitte la file (il reste tracé)', q("SELECT str_STATUT FROM t_ordonnance_scan WHERE lg_SCAN_ID='" + scans[1] + "'") === 'ecarte');
    const logs = execFileSync('bash', ['-c', 'tail -n 400 /opt/payara5/glassfish/domains/domain1/logs/server.log']).toString();
    ok('Journaux : ni le jeton, ni le document, ni le nom du patient', logs.indexOf('jeton-test') < 0 && logs.indexOf('Koffi') < 0 && logs.indexOf(NOM + ' Koffi') < 0);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    if (confOrigine !== null) { fs.writeFileSync(CONF, confOrigine); }
    if (serveur) { serveur.close(); }
    await b.close();
    ok('Configuration Posos du banc remise telle quelle', confOrigine === null || fs.readFileSync(CONF, 'utf8') === confOrigine);
    const ids = q("SELECT GROUP_CONCAT(CONCAT(\"'\", lg_CLIENT_ID, \"'\")) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'");
    if (ids && ids !== 'NULL') {
      const ords = "(SELECT lg_ORDONNANCE_ID FROM t_ordonnance_client WHERE lg_CLIENT_ID IN (" + ids + "))";
      const chemins = q("SELECT GROUP_CONCAT(str_CHEMIN) FROM t_ordonnance_client_piece WHERE lg_ORDONNANCE_ID IN " + ords);
      exec('DELETE FROM t_ordonnance_scan WHERE lg_ORDONNANCE_ID IN ' + ords);
      exec('DELETE FROM t_ordonnance_client_piece WHERE lg_ORDONNANCE_ID IN ' + ords);
      exec('DELETE FROM t_ordonnance_client_detail WHERE lg_ORDONNANCE_ID IN ' + ords);
      exec('DELETE FROM t_ordonnance_client WHERE lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_client WHERE lg_CLIENT_ID IN (' + ids + ')');
      if (chemins && chemins !== 'NULL') { process.env.PIECES = chemins; }
    }
    exec("DELETE FROM t_medecin WHERE lg_MEDECIN_ID = 'ZZSCAN-MED'");
    for (const s of scans) {
      if (s) { exec("DELETE FROM t_ordonnance_scan WHERE lg_SCAN_ID='" + s + "'"); }
    }
    ok('Remise en état : clients, ordonnances et scans de test retirés', q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'") === '0'
      && scans.every((s) => q("SELECT COUNT(*) FROM t_ordonnance_scan WHERE lg_SCAN_ID='" + s + "'") === '0'));
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
