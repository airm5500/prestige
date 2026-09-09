/* Retours du 09/09 - lot K : la feuille de match simple (points 2 et 8), jouee a l'ecran.
 *  - tri « par quantite achetee » et colonnes UG / quantite achetee sur la periode dans la vue ;
 *  - Imprimer : deux impressions (detaillee, simple), chacune dans son clic ;
 *  - la feuille simple : Rang, Produit, CIP13, UG, Quantites achetees, Frequence d'achat, rangs ex aequo « 1-2 » ;
 *  - export Excel de la feuille simple ; nom des fichiers feuille_de_match_<officine>_<periode>.pdf / .xlsx.
 */
const { chromium } = require('playwright-core');
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2ELK';
const JOUR = q('SELECT CURDATE()');
const PRODUITS = [];
let USER = '';

/* Trois produits vendus aujourd'hui (pour figurer dans le classement de la periode « aujourd'hui »)
   et receptionnes aujourd'hui sur des bons de livraison clotures :
     P0 : 60 + 40 = 100 unites en 2 receptions, 5 UG      -> rang « 1-2 »
     P1 : 100 unites en 1 reception                        -> rang « 1-2 »
     P2 : 30 unites en 1 reception, 2 UG                   -> rang « 3 » */
function purger() {
  exec("DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
}
function semer() {
  purger();
  USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  /* Des produits entiers : un deconditionne est replie sur son parent par le classement. */
  q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' AND int_EAN13 IS NOT NULL AND int_EAN13<>''"
    + " AND bool_DECONDITIONNE=0 AND (lg_FAMILLE_PARENT_ID IS NULL OR lg_FAMILLE_PARENT_ID='') ORDER BY str_NAME LIMIT 3")
    .split('\n').filter(Boolean).forEach(id => PRODUITS.push(id.trim()));
  if (!USER || PRODUITS.length !== 3) { return false; }
  PRODUITS.forEach((prod, i) => {
    const id = MARQUE + '-V' + i, quand = JOUR + ' 09:0' + i + ':00', montant = 1000 * (i + 1);
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
      + " int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
      + " lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER,"
      + " int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
      + " montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + id + "','" + id + "','0'," + montant + ",0,'is_Closed','" + quand + "','" + quand + "',1,'" + USER + "','" + USER + "','"
      + USER + "',0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
      + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
      + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
      + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + id + "-D','" + id + "','" + prod + "',1,1,0,0," + montant + "," + montant + ",0,'" + quand + "','" + quand
      + "',0,0,0,0,0,0,1,0,0," + Math.round(montant / 2) + ",0,0)");
  });
  [['BL1', [[0, 60, 5]]], ['BL2', [[0, 40, 0], [1, 100, 0], [2, 30, 2]]]].forEach(([bl, lignes], k) => {
    const id = MARQUE + '-' + bl, quand = JOUR + ' 1' + k + ':00:00';
    exec("INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)"
      + " VALUES ('" + id + "','" + id + "','" + quand + "',0,0,0,'is_Closed','" + quand + "','" + quand + "','" + USER + "')");
    lignes.forEach(([p, qte, ug], j) => {
      exec("INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_BON_LIVRAISON_ID, lg_FAMILLE_ID, int_QTE_CMDE, int_QTE_RECUE, int_QTE_UG, dt_CREATED, dt_UPDATED, str_STATUT, prixTarif, lg_ZONE_GEO_ID)"
        + " VALUES ('" + id + "-" + j + "','" + id + "','" + PRODUITS[p] + "'," + qte + "," + qte + "," + ug + ",'" + quand + "','" + quand + "','enable',0,NULL)");
      /* Un declencheur BEFORE INSERT remet les UG a zero : on les pose apres coup, comme le ferait la reception. */
      exec("UPDATE t_bon_livraison_detail SET int_QTE_UG=" + ug + " WHERE lg_BON_LIVRAISON_DETAIL='" + id + "-" + j + "'");
    });
  });
  return true;
}

(async () => {
  if (!semer()) { console.log('FATAL : jeu d\'essai incomplet'); purger(); process.exit(1); }
  const libelles = PRODUITS.map(p => q("SELECT str_NAME FROM t_famille WHERE lg_FAMILLE_ID='" + p + "'"));
  console.log('DEBUG fixture ' + JSON.stringify(PRODUITS) + ' | ' + q("SELECT lg_BON_LIVRAISON_DETAIL, lg_FAMILLE_ID, int_QTE_RECUE, int_QTE_UG FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID LIKE '" + MARQUE + "-%'").replace(/\n/g, ' ;; ')
    + ' | parents=' + q("SELECT lg_FAMILLE_ID, lg_FAMILLE_PARENT_ID, bool_DECONDITIONNE FROM t_famille WHERE lg_FAMILLE_ID IN ('" + PRODUITS.join("','") + "')").replace(/\n/g, ' ;; '));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1800, height: 1000 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  await p.evaluate(() => { window.__ouvertures = []; window.open = function (u) { window.__ouvertures.push(u); return null; }; });
  const telecharger = (u) => p.evaluate(async (u) => {
    const r = await fetch(u); const buf = await r.arrayBuffer();
    return { statut: r.status, type: r.headers.get('content-type') || '', disposition: r.headers.get('content-disposition') || '', octets: Array.from(new Uint8Array(buf)) };
  }, u);
  const choisir = async (selecteur, texte) => {
    const id = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), selecteur);
    await p.click('#' + id + ' .x-form-trigger');
    await p.waitForSelector('.x-boundlist:visible .x-boundlist-item', { timeout: 5000 });
    await p.click('.x-boundlist:visible .x-boundlist-item:text-is("' + texte + '")');
  };
  /* Un bouton a menu : le corps du bouton ouvre le menu (Imprimer), ou execute l'action par defaut
     (Exporter) ; la fleche, elle, ouvre toujours le menu. On clique la fleche quand on la demande. */
  const cliquerMenu = async (bouton, item, parLaFleche) => {
    const id = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), bouton);
    const idItem = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), item);
    await p.evaluate((s) => { const b = Ext.ComponentQuery.query(s)[0]; if (b.menu && b.menu.isVisible()) { b.menu.hide(); } }, bouton);
    await p.waitForTimeout(300);
    if (parLaFleche) {
      const r = await p.evaluate((i) => { const x = document.getElementById(i).getBoundingClientRect(); return { x: x.right - 5, y: x.top + x.height / 2 }; }, id);
      await p.mouse.click(r.x, r.y);
    } else {
      await p.click('#' + id);
    }
    await p.waitForSelector('#' + idItem + ':visible', { timeout: 8000 });
    await p.click('#' + idItem);
    await p.waitForTimeout(600);
  };

  try {
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('feuilledematch', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('feuilledematch').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(1200);
    const idRechercher = await p.evaluate(() => Ext.ComponentQuery.query('feuilledematch #rechercher')[0].getId());
    await p.click('#' + idRechercher);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('feuilledematch grid')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    const entetes = await p.evaluate(() => Ext.ComponentQuery.query('feuilledematch grid')[0].headerCt.getGridColumns().map(c => c.text));
    ok('La vue porte les colonnes UG et Qté achetée (période)', entetes.includes('UG') && entetes.includes('Qté achetée (période)'), entetes.join(' | '));

    await choisir('feuilledematch #comboTri', 'Tri : quantité achetée');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('feuilledematch grid')[0]; return g && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(500);
    const lignes = await p.evaluate(() => Ext.ComponentQuery.query('feuilledematch grid')[0].getStore().getRange().slice(0, 4).map(r => ({ produitId: r.get('produitId'), qte: r.get('qteAchetee'), ug: r.get('ug'), freq: r.get('freqAchat') })));
    console.log('DEBUG brut ' + JSON.stringify((Ext => Ext)(await p.evaluate(() => (Ext.ComponentQuery.query('feuilledematch grid')[0].getStore().getProxy().getReader().rawData.data || []).slice(0, 4).map(r => ({ id: r.produitId, l: r.libelle, q: r.qteAchetee, ug: r.ug, f: r.freqAchat, cip: r.cip, ean: r.ean })))))
      + ' total=' + await p.evaluate(() => Ext.ComponentQuery.query('feuilledematch grid')[0].getStore().getTotalCount()));
    ok('Trie par quantite achetee : les deux produits a 100 d\'abord, puis celui a 30',
      lignes.length >= 3 && lignes[0].qte === 100 && lignes[1].qte === 100 && lignes[2].qte === 30, JSON.stringify(lignes));
    ok('Les UG et la frequence d\'achat de la periode sont portes par les lignes',
      lignes.slice(0, 3).some(l => l.produitId === PRODUITS[0] && l.ug === 5 && l.freq === 2)
      && lignes.slice(0, 3).some(l => l.produitId === PRODUITS[2] && l.ug === 2 && l.freq === 1), JSON.stringify(lignes));

    /* ---------------------------------------------------------- Imprimer : deux impressions, chacune dans son clic */
    const menu = await p.evaluate(() => Ext.ComponentQuery.query('feuilledematch #imprimer')[0].menu.items.getRange().map(i => i.text));
    ok('Le bouton Imprimer propose l\'impression detaillee ET l\'impression simple', menu.length === 2 && /d[ée]taill/.test(menu[0]) && /simple/.test(menu[1]), menu.join(' | '));
    await cliquerMenu('feuilledematch #imprimer', 'feuilledematch #imprimerSimple');
    let ouvertures = await p.evaluate(() => window.__ouvertures.splice(0));
    ok('L\'impression simple ouvre une seule fois, dans le clic', ouvertures.length === 1 && /feuille-match\/simple\/pdf\?/.test(ouvertures[0]), JSON.stringify(ouvertures));
    const pdf = await telecharger(ouvertures[0]);
    fs.writeFileSync('/tmp/claude-0/feuille_simple.pdf', Buffer.from(pdf.octets));
    const texte = execSync('pdftotext -layout /tmp/claude-0/feuille_simple.pdf -', { encoding: 'utf8' });
    const attenduPdf = new RegExp('feuille_de_match_[A-Za-z0-9_]+_' + JOUR.replace(/-/g, '_') + '_' + JOUR.replace(/-/g, '_') + '\\.pdf');
    ok('Le PDF simple repond, sous le nom feuille_de_match_<officine>_<periode>.pdf', pdf.statut === 200 && /pdf/.test(pdf.type) && attenduPdf.test(pdf.disposition), pdf.disposition);
    // Retour des tests du 09/09 (lot O) : une septieme colonne, les quantites vendues, entre les achats et la frequence.
    ok('Il porte les colonnes du modele fourni, plus les quantites vendues', /Rang\s+Produit\s+CIP13\s+UG\s+Quantités\s+Quantités\s+Fréquence/.test(texte) && /achetées\s+vendues\s+d'achat/.test(texte), texte.split('\n').find(l => /Rang/.test(l)));
    const lignesPdf = texte.split('\n').filter(l => /^\s*\d+(-\d+)?\s/.test(l)).map(l => l.trim());
    ok('Les deux produits a 100 unites partagent le rang « 1-2 », le troisieme est « 3 »',
      lignesPdf.length >= 3 && /^1-2\s/.test(lignesPdf[0]) && /^1-2\s/.test(lignesPdf[1]) && /^3\s/.test(lignesPdf[2]), lignesPdf.slice(0, 3).join(' || '));
    ok('Le produit a 5 UG et 2 receptions est en tete, avec ses valeurs',
      new RegExp('^1-2\\s+.*' + libelles[0].slice(0, 12).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*\\s5\\s+100\\s+\\d+\\s+2\\s*$').test(lignesPdf[0]), lignesPdf[0]);
    ok('Le troisieme : 2 UG, 30 unites, 1 reception', /\s2\s+30\s+\d+\s+1\s*$/.test(lignesPdf[2]), lignesPdf[2]);
    ok('Les CIP13 sont ceux des articles', texte.indexOf(q("SELECT int_EAN13 FROM t_famille WHERE lg_FAMILLE_ID='" + PRODUITS[0] + "'")) >= 0);

    await cliquerMenu('feuilledematch #imprimer', 'feuilledematch #imprimerDetaillee');
    ouvertures = await p.evaluate(() => window.__ouvertures.splice(0));
    ok('L\'impression detaillee reste disponible, dans son propre clic', ouvertures.length === 1 && /feuille-match\/print\?/.test(ouvertures[0]), JSON.stringify(ouvertures));
    const detaillee = await telecharger(ouvertures[0]);
    ok('Elle porte elle aussi le nom feuille_de_match_<officine>_<periode>.pdf', detaillee.statut === 200 && attenduPdf.test(detaillee.disposition), detaillee.disposition);

    /* ---------------------------------------------------------- Excel de la feuille simple */
    await cliquerMenu('feuilledematch #btnExporter', 'feuilledematch #exporterSimpleXlsx', true);
    ouvertures = await p.evaluate(() => window.__ouvertures.splice(0));
    ok('L\'export Excel de la feuille simple part dans le clic', ouvertures.length === 1 && /simple\/xlsx\?/.test(ouvertures[0]), JSON.stringify(ouvertures));
    const xlsx = await telecharger(ouvertures[0]);
    fs.writeFileSync('/tmp/claude-0/feuille_simple.xlsx', Buffer.from(xlsx.octets));
    const attenduXlsx = new RegExp('feuille_de_match_[A-Za-z0-9_]+_' + JOUR.replace(/-/g, '_') + '_' + JOUR.replace(/-/g, '_') + '\\.xlsx');
    ok('Le classeur repond sous le nom feuille_de_match_<officine>_<periode>.xlsx', xlsx.statut === 200 && attenduXlsx.test(xlsx.disposition), xlsx.disposition);
    const contenu = execSync("python3 -c \"import openpyxl,json;wb=openpyxl.load_workbook('/tmp/claude-0/feuille_simple.xlsx');ws=wb.active;print(json.dumps([[str(c) if c is not None else '' for c in r] for r in ws.iter_rows(values_only=True)][:8]))\"", { encoding: 'utf8' });
    const feuilles = JSON.parse(contenu);
    const enTete = feuilles.find(r => r[0] === 'Rang') || [];
    const premiere = feuilles[feuilles.indexOf(enTete) + 1] || [];
    ok('Le classeur porte les memes colonnes', enTete.join('|') === 'Rang|Produit|CIP13|UG|Quantités achetées|Quantités vendues|Fréquence d\'achat', enTete.join('|'));
    ok('...et les memes rangs et valeurs', premiere[0] === '1-2' && parseFloat(premiere[3]) === 5 && parseFloat(premiere[4]) === 100 && parseFloat(premiere[6]) === 2, premiere.join('|'));

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    await b.close();
    purger();
    ok('Jeu d\'essai retire', q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE '" + MARQUE + "-%'") === '0'
      && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'") === '0');
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
