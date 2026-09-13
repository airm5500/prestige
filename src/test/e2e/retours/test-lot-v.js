/* Retours des tests du 12/09 (3e) - lot V.
 *  1 : pied de la liste des articles de la vente : lignes et produits (somme des quantites) ;
 *  2 : apercu de la fiche article : taux de marque apres la TVA ;
 *  3 : basculement d'emplacement en REST (liste des produits d'une zone, basculement), produit sans ligne
 *      t_famille_zonegeo pris en compte ;
 *  4 : analyse du CA : trois dernieres semaines par defaut, filtres gamme / laboratoire sur l'onglet ;
 *  5 : rapport activite : premiere section a sa hauteur ;
 *  6 : PDF balance : officine centree avec le pharmacien, imprime le / par en bas, pas de numero de page,
 *      resume sur deux colonnes.
 * Tout ce que le test pose est retire ou retabli a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const TMP = '/tmp/lot-v'; fs.mkdirSync(TMP, { recursive: true });
const ventesCreees = [];
let produitBascule = null, zoneOrigine = null;
function retablir() {
  ventesCreees.forEach(id => exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + id + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + id + "';"));
  if (produitBascule) {
    exec("UPDATE t_famille SET lg_ZONE_GEO_ID='" + zoneOrigine + "' WHERE lg_FAMILLE_ID='" + produitBascule + "'; DELETE FROM t_famille_zonegeo WHERE lg_FAMILLE_ID='" + produitBascule + "' AND str_STATUT='enable' AND dt_CREATED > NOW() - INTERVAL 10 MINUTE;");
  }
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 30000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const appel = (url, options) => p.evaluate(async (a) => { const r = await fetch(a.url, a.options); return { statut: r.status, type: r.headers.get('content-type') || '', corps: await r.text() }; }, { url, options: options || {} });
    const poster = (url, corps) => appel(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    const ouvrir = async (xtype, attendu) => { await p.evaluate((x) => testextjs.app.getController('App').onRedirectTo(x, {}), xtype); await p.waitForFunction((s) => Ext.ComponentQuery.query(s).length > 0, attendu, { timeout: 20000 }); await p.waitForTimeout(1500); };

    /* ------------------------------------------------ point 1 : lignes et produits */
    const produits = q("SELECT f.lg_FAMILLE_ID, f.int_PRICE FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1' WHERE s.int_NUMBER_AVAILABLE>10 AND f.int_PRICE>0 AND f.str_STATUT='enable' LIMIT 2").split('\n').map(l => l.split('\t'));
    const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
    const params = (pr, qte, venteId) => ({ typeVenteId: '1', natureVenteId: '1', produitId: pr[0], itemPu: Number(pr[1]), qte: qte, qteServie: qte, devis: false, remiseId: '', venteId: venteId, userVendeurId: user, prevente: false });
    let r = JSON.parse((await poster('../api/v1/vente/add/vno', params(produits[0], 3, null))).corps);
    const venteId = r.data && r.data.lgPREENREGISTREMENTID; if (venteId) { ventesCreees.push(venteId); }
    await poster('../api/v1/vente/add/item', params(produits[1], 1, venteId));
    const compte = JSON.parse((await appel('../api/v1/vente/quantites-vente/' + venteId)).corps);
    ok('Point 1 : 3 + 1 unites sur deux lignes -> lignes 2, produits 4', compte.lignes === 2 && compte.produits === 4, JSON.stringify(compte));
    await ouvrir('doventemanager', 'doventemanager #nombreLignesVente');
    ok('Point 1 : la pagination annonce des lignes, le texte a cote des produits', await p.evaluate(() => {
      const t = Ext.ComponentQuery.query('doventemanager #nombreLignesVente')[0];
      return !!t && /ligne/.test(t.ownerCt.displayMsg || '');
    }));

    /* ------------------------------------------------ point 2 : taux de marque dans l apercu */
    const fiche = q("SELECT lg_FAMILLE_ID, int_PRICE, int_PAF, IFNULL(int_TAUX_MARQUE,0) FROM t_famille WHERE str_STATUT='enable' AND int_PRICE>0 AND int_PAF>0 ORDER BY str_NAME LIMIT 1").split('\t');
    const apercu = JSON.parse((await appel('../api/v1/produit-search/apercu/' + fiche[0])).corps);
    const attendu = Number(fiche[3]) ? String(fiche[3]) : String(Math.round((fiche[1] - fiche[2]) * 100 / fiche[1]));
    ok('Point 2 : l apercu porte le taux de marque (enregistre, sinon calcule)', apercu.tauxMarque === attendu, JSON.stringify({ recu: apercu.tauxMarque, attendu, fiche }));
    ok('Point 2 : la puce « Taux de marque » vient apres la TVA', await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('famillemanager')[0] || null;
      const src = String(testextjs.view.configmanagement.famille.FamilleManager.prototype.htmlApercu || '');
      return /TVA/.test(src) && src.indexOf('Taux de marque') > src.indexOf('TVA');
    }));

    /* ------------------------------------------------ point 3 : basculement en REST */
    const ligne = q("SELECT f.lg_FAMILLE_ID, f.lg_ZONE_GEO_ID FROM t_famille f JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID=f.lg_ZONE_GEO_ID AND z.lg_EMPLACEMENT_ID='1' WHERE f.str_STATUT='enable' AND NOT EXISTS (SELECT 1 FROM t_famille_zonegeo l WHERE l.lg_FAMILLE_ID=f.lg_FAMILLE_ID) ORDER BY f.str_NAME LIMIT 1").split('\t');
    produitBascule = ligne[0]; zoneOrigine = ligne[1];
    const zoneCible = q("SELECT lg_ZONE_GEO_ID FROM t_zone_geographique WHERE str_STATUT='enable' AND lg_EMPLACEMENT_ID='1' AND lg_ZONE_GEO_ID<>'" + zoneOrigine + "' ORDER BY str_LIBELLEE LIMIT 1");
    const liste = JSON.parse((await appel('../api/v1/zones-geographiques/produits?zoneID=' + zoneOrigine + '&search_value=&start=0&limit=15')).corps);
    ok('Point 3 : la liste REST des produits d une zone repond (data, total, colonnes de l ecran)', liste.total >= 1 && liste.data.length >= 1 && liste.data[0].lg_FAMILLE_ID && 'int_NUMBER' in liste.data[0] && 'str_DESCRIPTION' in liste.data[0], JSON.stringify(liste).slice(0, 200));
    ok('Point 3 : la liste REST des zones repond au format des combos', (JSON.parse((await appel('../api/v1/zones-geographiques?query=&start=0&limit=10')).corps).results || []).some(z => z.lg_ZONE_GEO_ID && z.str_LIBELLEE));
    const corps = 'zoneID=' + zoneCible + '&zoneIDO=' + zoneOrigine + '&MODE_SELECTION=SELECTED&search_value=&uncheckedList=%5B%5D&recordsToSend=' + encodeURIComponent(JSON.stringify([produitBascule]));
    const bascule = JSON.parse((await appel('../api/v1/zones-geographiques/basculer', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps })).corps);
    ok('Point 3 : le basculement REST d un produit SANS ligne t_famille_zonegeo aboutit', bascule.status === 1 && bascule.count === 1, JSON.stringify(bascule));
    ok('Point 3 : la fiche et la ligne zone du produit pointent sur la zone de destination', q("SELECT lg_ZONE_GEO_ID FROM t_famille WHERE lg_FAMILLE_ID='" + produitBascule + "'") === zoneCible
      && q("SELECT COUNT(*) FROM t_famille_zonegeo WHERE lg_FAMILLE_ID='" + produitBascule + "' AND lg_ZONE_GEO_ID='" + zoneCible + "' AND lg_EMPLACEMENT_ID='1'") === '1');
    const sans = JSON.parse((await appel('../api/v1/zones-geographiques/basculer', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'zoneID=&zoneIDO=' + zoneOrigine + '&MODE_SELECTION=SELECTED&search_value=&uncheckedList=%5B%5D&recordsToSend=%5B%5D' })).corps);
    ok('Point 3 : sans destination, refus explicite', sans.status === 0 && /destination/.test(sans.message), JSON.stringify(sans));
    ok('Point 3 : la fenetre de basculement n appelle plus les JSP', await p.evaluate(() => {
      const src = Ext.ClassManager.get('testextjs.view.configmanagement.zonegeographique.action.basculement').prototype.initComponent.toString();
      return src.indexOf('zones-geographiques/produits') > 0 && src.indexOf('zones-geographiques/basculer') > 0 && src.indexOf('.jsp') < 0;
    }));

    /* ------------------------------------------------ point 4 : CA */
    await ouvrir('cazonegeomanager', 'cazonegeomanager #gammeFiltre');
    const ca = await p.evaluate(() => { const e = Ext.ComponentQuery.query('cazonegeomanager')[0]; return { periode: e.down('#typePeriode').getValue(), gamme: !!e.down('#gammeFiltre'), labo: !!e.down('#laboratoireFiltre') }; });
    ok('Point 4 : trois dernieres semaines par defaut, filtres gamme et laboratoire presents', ca.periode === 'TROIS_SEMAINES' && ca.gamme && ca.labo, JSON.stringify(ca));
    const filtre = JSON.parse((await appel('../api/v1/ca-zone-geo?typePeriode=TROIS_SEMAINES&regroupement=GAMME&zoneId=&familleId=&gammeId=inexistante&laboratoireId=')).corps);
    ok('Point 4 : le filtre gamme est applique par le serveur (gamme inconnue -> aucune ligne)', filtre.success === true && (filtre.data || []).length === 0, JSON.stringify(filtre).slice(0, 150));
    ok('Point 4 : les parametres de l ecran portent les filtres', await p.evaluate(() => { const pr = testextjs.app.getController('CaZoneGeoCtr').parametres(); return 'gammeId' in pr && 'laboratoireId' in pr; }));

    /* ------------------------------------------------ point 5 : rapport activite */
    await ouvrir('recap', 'recap');
    await p.waitForTimeout(2500);
    // depuis la proposition A : les cartes sont un gabarit HTML (style balance) de hauteur fixe, entierement visible
    const recap = await p.evaluate(() => { const c = Ext.ComponentQuery.query('recap #cartesRecap')[0]; const carte = document.getElementById('panelCa'); const r = carte.getBoundingClientRect(), s = c.getEl().dom.getBoundingClientRect(); return { section: c.getHeight(), carte: r.height, visible: r.bottom <= s.bottom + 2, titre: (carte.querySelector('.vb-titre') || {}).textContent }; });
    ok('Point 5 : la premiere section du rapport garde sa hauteur fixe et sa premiere carte entiere', recap.section === 250 && recap.carte > 150 && recap.visible && /affaires/i.test(recap.titre), JSON.stringify(recap));
    await p.screenshot({ path: TMP + '/recap.png' });

    /* ------------------------------------------------ point 6 : PDF balance */
    const j = q("SELECT CURDATE()");
    const pdf = await p.evaluate(async (u) => { const x = await fetch(u); return { type: x.headers.get('content-type'), octets: Array.from(new Uint8Array(await x.arrayBuffer())) }; }, '../api/v1/balance/balancesalecash/pdf?dtStart=' + j + '&dtEnd=' + j);
    fs.writeFileSync(TMP + '/balance.pdf', Buffer.from(pdf.octets));
    const texte = execSync('pdftotext -layout ' + TMP + '/balance.pdf -', { encoding: 'utf8' });
    const lignes = texte.split('\n');
    const officine = q("SELECT str_NOM_ABREGE FROM t_officine LIMIT 1");
    ok('Point 6 : le nom de l officine est en premiere ligne, centre', lignes[0].trim() === officine && lignes[0].indexOf(officine) > 20, JSON.stringify(lignes[0]));
    ok('Point 6 : imprime le / par en bas a droite, plus de numero de page', /Imprimé le .* par /.test(lignes.slice(-6).join('\n')) && !/Page 1/.test(texte) && !/Imprimé le/.test(lignes.slice(0, 5).join('\n')), lignes.slice(-6).join(' | '));
    ok('Point 6 : le resume est sur deux colonnes (Montant vente et Mobile sur la meme ligne)', /Montant vente\s+\S+\s+Mobile\s+\S+/.test(texte), (texte.match(/Montant vente.*/) || [''])[0]);
    ok('aucune erreur javascript', err.length === 0, err.join(' | '));
  } finally {
    retablir();
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS' + (ko ? '  (' + ko + ' FAIL)' : ''));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); retablir(); process.exit(2); });
