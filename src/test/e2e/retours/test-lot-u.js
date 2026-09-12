/* Retours des tests du 12/09 - lot U (points 7, 9, 12).
 *
 *  7 : basculement d'emplacement : origine affichee en tete et preselectionnee, compteur de produits coches,
 *      « Cocher la page », coches memorisees d'une page a l'autre, fenetre modale ;
 *  9 : analyse du CA : onglet « Gammes / Laboratoires » (tableau comparatif par gamme, par laboratoire),
 *      exports Excel et PDF sur ce regroupement ;
 * 12 : ecran de vente : peremption la plus proche (lot, quantite) apres le rayon, clignotante a moins de six mois,
 *      nombre de lignes de la vente, icone sur le bouton mobile money.
 * Les donnees posees (vente cloturee, lots) sont retirees a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const TMP = '/tmp/lot-u';
fs.mkdirSync(TMP, { recursive: true });
const VENTE = 'E2ELU-VT', LOT = 'E2ELU-LOT';

function purger() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + VENTE + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + VENTE + "';"
    + " DELETE FROM t_lot WHERE lg_LOT_ID LIKE '" + LOT + "%';");
}
function produits() {
  return q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' ORDER BY str_NAME LIMIT 2").split('\n').filter(Boolean);
}
function poserVente(jour) {
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const ps = produits();
  const quand = jour + ' 10:00:00';
  exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
    + " int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
    + " lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER,"
    + " int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
    + " montantnetug, int_SENDTOSUGGESTION)"
    + " VALUES ('" + VENTE + "','" + VENTE + "','0',3000,0,'is_Closed','" + quand + "','" + quand + "',1,'" + user + "','" + user + "','"
    + user + "',0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
  ps.forEach(function (produit, i) {
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
      + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
      + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
      + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + VENTE + "-D" + i + "','" + VENTE + "','" + produit + "',2,2,0,0," + (1000 + i * 1000)
      + "," + (500 + i * 500) + ",0,'" + quand + "','" + quand + "',0,0,0,0,0,0,1,0,0," + (300 + i * 300) + ",0,0)");
  });
  return ps;
}
/* Deux lots pour le premier produit : l'un perime dans 2 mois (clignote), l'autre dans 2 ans ; un lot a 1 an pour le second. */
function poserLots(ps) {
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  [[ps[0], 'A1', 2, 5], [ps[0], 'A2', 24, 9], [ps[1], 'B1', 12, 7]].forEach(function (l, i) {
    exec("INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, int_NUMBER_GRATUIT, str_STATUT, int_QTY_VENDUE, current_stock)"
      + " VALUES ('" + LOT + i + "','" + user + "','" + l[0] + "','" + l[1] + "'," + l[3] + ",NOW(),NOW(),DATE_ADD(CURDATE(), INTERVAL " + l[2] + " MONTH),0,'enable',0," + l[3] + ")");
  });
}

(async () => {
  purger();
  const jour = q("SELECT DATE_SUB(CURDATE(), INTERVAL 420 DAY)");
  const ps = poserVente(jour);
  poserLots(ps);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  const ouvrir = async (xtype, attendu) => {
    const r = await p.evaluate((x) => { try { testextjs.app.getController('App').onRedirectTo(x, {}); return 'ok'; } catch (e) { return 'ERREUR ' + e.stack; } }, xtype);
    if (r !== 'ok') { console.log('ouverture ' + xtype + ' : ' + r); }
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s).length > 0, attendu, { timeout: 20000 });
    await p.waitForTimeout(1500);
  };
  const octets = (url) => p.evaluate(async (u) => {
    const x = await fetch(u); return { statut: x.status, type: x.headers.get('content-type'), octets: Array.from(new Uint8Array(await x.arrayBuffer())) };
  }, url);

  try {
    /* ------------------------------------------------------------ point 12 : peremption proche */
    const api = JSON.parse((await octets('../api/v1/vente/peremption-proche/' + ps[0])).octets.map(c => String.fromCharCode(c)).join(''));
    const dansDeuxMois = q("SELECT DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 2 MONTH), '%d/%m/%Y')");
    ok('Point 12 : l API rend le lot le plus proche (date, lot, quantite)', api.success && api.date === dansDeuxMois && api.lot === 'A1' && String(api.qte) === '5', JSON.stringify(api));
    const apiVide = JSON.parse((await octets('../api/v1/vente/peremption-proche/inexistant')).octets.map(c => String.fromCharCode(c)).join(''));
    ok('Point 12 : produit inconnu -> champs vides, sans erreur', apiVide.success && apiVide.date === '', JSON.stringify(apiVide));

    await ouvrir('doventemanager', 'doventemanager #peremptionProcheId');
    ok('Point 12 : le champ « Péremption » est apres le rayon sur l ecran de vente', await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('doventemanager #peremptionProcheId')[0];
      const r = Ext.ComponentQuery.query('doventemanager #contenu [xtype=container] #emplacementId')[0];
      return !!c && !!r && c.ownerCt === r.ownerCt && c.ownerCt.items.indexOf(c) === c.ownerCt.items.indexOf(r) + 1;
    }));
    await p.evaluate((id) => testextjs.app.getController('VenteCtr').afficherPeremptionProche(id), ps[0]);
    await p.waitForFunction(() => (Ext.ComponentQuery.query('doventemanager #peremptionProcheId')[0].getValue() || '') !== '', null, { timeout: 15000 });
    let valeur = await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #peremptionProcheId')[0].getValue());
    ok('Point 12 : a moins de six mois, la date clignote, avec le lot et la quantite', /peremption-clignote/.test(valeur) && valeur.indexOf(dansDeuxMois) >= 0 && /lot A1 × 5/.test(valeur), valeur);
    await p.evaluate((id) => testextjs.app.getController('VenteCtr').afficherPeremptionProche(id), ps[1]);
    await p.waitForFunction((d) => (Ext.ComponentQuery.query('doventemanager #peremptionProcheId')[0].getValue() || '').indexOf(d) < 0, dansDeuxMois, { timeout: 15000 });
    valeur = await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #peremptionProcheId')[0].getValue());
    ok('Point 12 : a plus de six mois, bleu gras sans clignotement', !/peremption-clignote/.test(valeur) && /#0D47A1/.test(valeur) && /lot B1 × 7/.test(valeur), valeur);
    await p.evaluate(() => testextjs.app.getController('VenteCtr').afficherPeremptionProche(null));
    ok('Point 12 : sans produit, le champ est vide', (await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #peremptionProcheId')[0].getValue() || '')) === '');
    ok('Point 12 : le texte « Lignes » est dans la barre des articles choisis et le bouton mobile porte une icone', await p.evaluate(() => {
      const t = Ext.ComponentQuery.query('doventemanager #nombreLignesVente')[0];
      const bt = Ext.ComponentQuery.query('doventemanager #btnExtraMode')[0];
      return !!t && !!bt && /paiement-mobile/.test(bt.icon || '');
    }));

    /* ------------------------------------------------------------ point 9 : gammes / laboratoires */
    await ouvrir('cazonegeomanager', 'cazonegeomanager #ongletGammesLabos');
    const prepa = await p.evaluate((j) => {
      try {
        const e = Ext.ComponentQuery.query('cazonegeomanager')[0];
        const tp = e.down('#typePeriode'); tp.setValue('LIBRE'); tp.fireEvent('select', tp);
        e.down('#dtStart').setValue(Ext.Date.parse(j, 'Y-m-d')); e.down('#dtEnd').setValue(Ext.Date.parse(j, 'Y-m-d'));
        e.down('#btnRechercher').fireEvent('click', e.down('#btnRechercher'));
        return 'ok';
      } catch (x) { return 'ERREUR ' + x.stack; }
    }, jour);
    ok('Point 9 : la periode libre se pose et la recherche part', prepa === 'ok', prepa);
    await p.waitForTimeout(3000);
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('cazonegeomanager')[0]; e.setActiveTab(e.down('#ongletGammesLabos')); });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('cazonegeomanager #grilleGammes')[0]; return g && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    const gammes = await p.evaluate(() => { const g = Ext.ComponentQuery.query('cazonegeomanager #grilleGammes')[0]; return { colonnes: g.columns.map(c => c.text), lignes: g.getStore().getRange().map(r => ({ libelle: r.get('libelle'), total: r.get('total') })) }; });
    ok('Point 9 : l onglet Gammes rend une ligne par gamme (« Sans gamme » sur le banc) avec le total de la vente', gammes.colonnes[0] === 'Gamme' && gammes.lignes.some(l => l.libelle === 'Sans gamme' && l.total === 3000), JSON.stringify(gammes).slice(0, 300));
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('cazonegeomanager #ongletGammesLabos')[0]; o.setActiveTab(o.down('#grilleLaboratoires')); });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('cazonegeomanager #grilleLaboratoires')[0]; return g && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    const labos = await p.evaluate(() => { const g = Ext.ComponentQuery.query('cazonegeomanager #grilleLaboratoires')[0]; return { colonnes: g.columns.map(c => c.text), lignes: g.getStore().getRange().map(r => ({ libelle: r.get('libelle'), total: r.get('total') })) }; });
    ok('Point 9 : l onglet Laboratoires rend une ligne par laboratoire avec le total', labos.colonnes[0] === 'Laboratoire' && labos.lignes.some(l => l.libelle === 'Sans laboratoire' && l.total === 3000), JSON.stringify(labos).slice(0, 300));
    ok('Point 9 : les exports suivent l onglet actif (regroupement LABORATOIRE)', await p.evaluate(() => testextjs.app.getController('CaZoneGeoCtr').parametres().regroupement) === 'LABORATOIRE');
    const xl = await octets('../api/v1/ca-zone-geo/excel?typePeriode=LIBRE&dtStart=' + jour + '&dtEnd=' + jour + '&regroupement=GAMME&zoneId=&familleId=');
    fs.writeFileSync(TMP + '/gammes.xls', Buffer.from(xl.octets));
    const chaines = execSync('strings -a ' + TMP + '/gammes.xls; strings -a -el ' + TMP + '/gammes.xls', { encoding: 'utf8' });
    ok('Point 9 : l export Excel par gamme est titre PAR GAMME avec la colonne Gamme', xl.statut === 200 && /PAR GAMME/.test(chaines) && /Gamme/.test(chaines) && /Sans gamme/.test(chaines), chaines.slice(0, 200));
    // l'edition rend l'URL du fichier genere (comme les autres editions de cet ecran) : on lit le fichier lui-meme
    const pdf = await octets('../api/v1/ca-zone-geo/pdf?typePeriode=LIBRE&dtStart=' + jour + '&dtEnd=' + jour + '&regroupement=LABORATOIRE&zoneId=&familleId=');
    let reponsePdf = {}; try { reponsePdf = JSON.parse(Buffer.from(pdf.octets).toString('utf8')); } catch (e) { }
    const fichierPdf = reponsePdf.url ? '/opt/CONF/reports/pdf/' + reponsePdf.url.split('/').pop() : '';
    const textePdf = fichierPdf && fs.existsSync(fichierPdf) ? execSync('pdftotext -layout ' + fichierPdf + ' -', { encoding: 'utf8' }) : '';
    ok('Point 9 : le PDF par laboratoire s edite avec son titre', reponsePdf.success === true && /PAR LABORATOIRE/.test(textePdf) && /Sans laboratoire/.test(textePdf),
      JSON.stringify(reponsePdf).slice(0, 150) + ' ' + textePdf.slice(0, 200));

    /* ------------------------------------------------------------ point 7 : basculement d'emplacement */
    const zone = q("SELECT z.lg_ZONE_GEO_ID FROM t_zone_geographique z JOIN t_famille f ON f.lg_ZONE_GEO_ID=z.lg_ZONE_GEO_ID GROUP BY z.lg_ZONE_GEO_ID ORDER BY COUNT(*) DESC LIMIT 1");
    const zoneLib = q("SELECT str_LIBELLEE FROM t_zone_geographique WHERE lg_ZONE_GEO_ID='" + zone + "'");
    await ouvrir('zonegeographiquemanager', 'zonegeographiquemanager');
    await p.evaluate((a) => {
      new testextjs.view.configmanagement.zonegeographique.action.basculement({
        odatasource: a.z, libelleOrigine: a.lib, codeOrigine: 'C1', parentview: Ext.ComponentQuery.query('zonegeographiquemanager')[0], titre: 'Gestion des emplacements'
      });
    }, { z: zone, lib: zoneLib });
    await p.waitForFunction(() => { const g = Ext.getCmp('basculID'); return g && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    const fenetre = await p.evaluate(() => {
      const g = Ext.getCmp('basculID');
      return { modale: !!g.up('window').modal, origine: Ext.getCmp('origineEmp').getValue(), combo: Ext.getCmp('zoneID').getRawValue(), compte: Ext.getCmp('compteCoches').text, lignes: g.getStore().getCount(), total: g.getStore().getTotalCount() };
    });
    ok('Point 7 : fenetre modale, origine affichee en tete et preselectionnee dans la liste', fenetre.modale && fenetre.origine.indexOf(zoneLib) === 0 && fenetre.combo === zoneLib, JSON.stringify(fenetre));
    ok('Point 7 : compteur a zero a l ouverture', /^0 produit coché$/.test(fenetre.compte), fenetre.compte);
    const coche = await p.evaluate(() => {
      try {
        const g = Ext.getCmp('basculID');
        g.getStore().getAt(0).set('isChecked', true);
        const vue = Ext.getCmp('addfamilleID');
        vue.onCheckChange(null, 0, true);
        return Ext.getCmp('compteCoches').text;
      } catch (x) { return 'ERREUR ' + x.stack; }
    });
    ok('Point 7 : un produit coche -> compteur a 1', coche === '1 produit coché', coche);
    const cochePage = await p.evaluate(() => { try { Ext.getCmp('cocherPage').setValue(true); return 'ok'; } catch (x) { return 'ERREUR ' + x.stack; } });
    if (cochePage !== 'ok') { console.log(cochePage); }
    const apresPage = await p.evaluate(() => ({ compte: Ext.getCmp('compteCoches').text, coches: Ext.getCmp('basculID').getStore().getRange().filter(r => r.get('isChecked')).length, lignes: Ext.getCmp('basculID').getStore().getCount() }));
    ok('Point 7 : « Cocher la page » coche toute la page et le compteur suit', apresPage.coches === apresPage.lignes && apresPage.compte === apresPage.lignes + (apresPage.lignes > 1 ? ' produits cochés' : ' produit coché'), JSON.stringify(apresPage));
    if (fenetre.total > fenetre.lignes) {
      await p.evaluate(() => Ext.getCmp('basculID').getStore().loadPage(2));
      await p.waitForTimeout(2500);
      const page2 = await p.evaluate(() => ({ compte: Ext.getCmp('compteCoches').text, coches: Ext.getCmp('basculID').getStore().getRange().filter(r => r.get('isChecked')).length, cochePage: Ext.getCmp('cocherPage').getValue() }));
      ok('Point 7 : page suivante : rien de coche, la case de page est retombee, le compteur garde les coches de la page 1', page2.coches === 0 && page2.cochePage === false && page2.compte === apresPage.lignes + ' produits cochés', JSON.stringify(page2));
      await p.evaluate(() => Ext.getCmp('basculID').getStore().loadPage(1));
      await p.waitForTimeout(2500);
      const retour = await p.evaluate(() => Ext.getCmp('basculID').getStore().getRange().filter(r => r.get('isChecked')).length);
      ok('Point 7 : retour page 1 : les coches sont memorisees', retour === apresPage.lignes, retour);
    }
    await p.evaluate(() => { Ext.getCmp('basculID').up('window').close(); });

    ok('aucune erreur javascript', err.length === 0, err.join(' | '));
  } finally {
    purger();
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS' + (ko ? '  (' + ko + ' FAIL)' : ''));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); purger(); process.exit(2); });
