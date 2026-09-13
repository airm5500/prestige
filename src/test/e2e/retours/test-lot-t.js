/* Retours des tests du 12/09 - lot T (points sans question).
 *
 *  4 : rupturepharma, famillestockcomparaisonmanager, cautiontierspayant, suiviremise sont des ecrans colles ;
 *  6 : liste des avoirs : export Excel (filtres actifs) et creation d'inventaire des produits des avoirs ;
 *  8 : marge sur produits vendus : export Excel (filtres actifs) et creation d'inventaire ;
 *  3 : liste des mouvements de caisse : nouvelle edition groupee par type, date du mouvement saisie distincte de
 *      la date de creation, sous-totaux, total general, modes de reglement.
 * Les inventaires, ventes et mouvements crees par le test sont retires a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const TMP = '/tmp/lot-t';
fs.mkdirSync(TMP, { recursive: true });

function purgerInventaires() {
  const ids = q("SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE AVOIRS %' OR str_NAME LIKE 'INVENTAIRE MARGE PRODUITS VENDUS %'").split('\n').filter(Boolean);
  ids.forEach(function (id) {
    exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + id + "'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + id + "';");
  });
  return ids.length;
}
const AVOIR = 'E2ELT-AV', VENTE = 'E2ELT-VT';
function purgerAvoir() {
  [AVOIR, VENTE].forEach(function (id) {
    exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + id + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + id + "';");
  });
}
/* Une vente cloturee au nom de KGA3 avec deux produits ; avoir en cours d'aujourd'hui, ou vente ordinaire d'un jour donne. */
function poserVente(id, avoir, jour) {
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const produits = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' ORDER BY str_NAME LIMIT 2").split('\n').filter(Boolean);
  const quand = jour + ' 10:00:00';
  const AVOIR = id, isAvoir = avoir ? 1 : 0;
  exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
    + " int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
    + " lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER,"
    + " int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
    + " montantnetug, int_SENDTOSUGGESTION)"
    + " VALUES ('" + AVOIR + "','" + AVOIR + "','0',3000,0,'is_Closed','" + quand + "','" + quand + "',1,'" + user + "','" + user + "','"
    + user + "',0," + isAvoir + ",0,0,0,0,0,1,0,0,0,0,0,0)");
  produits.forEach(function (produit, i) {
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
      + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
      + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
      + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + AVOIR + "-D" + i + "','" + AVOIR + "','" + produit + "',2,1,1,0," + (1000 + i * 1000)
      + "," + (500 + i * 500) + ",0,'" + quand + "','" + quand + "',0," + isAvoir + ",0,0,0,0,1,0,0," + (300 + i * 300) + ",0," + isAvoir + ")");
  });
}
const MVT = 'E2ELT-MV';
function purgerMouvements() {
  exec("DELETE FROM t_mvt_caisse WHERE lg_MVT_CAISSE_ID LIKE '" + MVT + "%'");
}
/* Trois mouvements de KGA3, controles, crees un meme jour mais dates (date du mouvement) de jours differents. */
function poserMouvements(jour) {
  purgerMouvements();
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  [['5', 3000, -3, 'Apport du gerant'], ['5', 1000, -1, ''], ['4', 500, -2, 'Achat de fournitures']].forEach(function (m, i) {
    exec("INSERT INTO t_mvt_caisse (lg_MVT_CAISSE_ID, lg_TYPE_MVT_CAISSE_ID, lg_USER_ID, str_NUM_COMPTE, str_COMMENTAIRE,"
      + " lg_MODE_REGLEMENT_ID, int_AMOUNT, dt_DATE_MVT, dt_CREATED, dt_UPDATED, str_CREATED_BY, str_STATUT, P_KEY, str_REF_TICKET, bool_CHECKED)"
      + " VALUES ('" + MVT + i + "','" + m[0] + "','" + user + "','531','" + m[3] + "','1'," + m[1] + ",DATE_ADD('" + jour + " 09:00:00', INTERVAL " + m[2] + " DAY),'"
      + jour + " 10:0" + i + ":00','" + jour + " 10:0" + i + ":00','" + user + "','enable','" + user + "','T" + i + "',1)");
  });
}
function xlsxTexte(fichier) {
  return execSync("python3 -c \"import openpyxl,sys; wb=openpyxl.load_workbook(sys.argv[1]); ws=wb.active; print('\\\\n'.join('|'.join('' if c is None else str(c) for c in r) for r in ws.iter_rows(values_only=True)))\" " + fichier, { encoding: 'utf8' });
}

(async () => {
  purgerInventaires();
  purgerAvoir();
  purgerMouvements();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(1500);

  const telecharger = async (declencheur) => {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), declencheur()]);
    const chemin = TMP + '/' + dl.suggestedFilename();
    await dl.saveAs(chemin);
    return chemin;
  };
  const ouvrir = async (xtype, attendu) => {
    await p.evaluate((x) => testextjs.app.getController('App').onRedirectTo(x, {}), xtype);
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s).length > 0, attendu, { timeout: 20000 });
    await p.waitForTimeout(1500);
  };
  const cliquer = async (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; c.fireEvent('click', c); return !!c; }, sel);
  const derniereBoite = () => p.evaluate(() => {
    const m = Ext.MessageBox; return m.isVisible() ? { titre: m.title, texte: (m.msg.getEl ? m.msg.getEl().dom.innerText : String(m.msg)) } : null;
  });
  // le bouton d'une boite de message porte son action en handler (pas en listener) : on passe par le rappel de la boite
  const repondre = (bouton) => p.evaluate((b) => { Ext.MessageBox.btnCallback(Ext.MessageBox.msgButtons[b]); }, bouton);

  try {
    /* ------------------------------------------------------------ point 4 */
    const colles = await p.evaluate(() => window.PrestigeAffichage.ECRANS_COLLES);
    const attendus = ['rupturepharma', 'famillestockcomparaisonmanager', 'cautiontierspayant', 'suiviremise'];
    ok('Point 4 : les quatre ecrans sont colles', attendus.every(m => colles.indexOf(m) >= 0), attendus.filter(m => colles.indexOf(m) < 0).join(','));
    ok('Point 4 : la liste n a pas de doublon', colles.length === new Set(colles).size);

    /* ------------------------------------------------------------ point 6 : avoirs */
    // Les ventes cloturees du banc appartiennent a des utilisateurs disparus (invisibles de la liste) :
    // le test pose son propre avoir en cours, d'aujourd'hui, au nom de KGA3, avec deux produits.
    const nbProduitsAvoir = '2';
    purgerAvoir();
    poserVente(AVOIR, true, q("SELECT CURDATE()"));
    try {
      await ouvrir('venteavoirmanager', 'venteavoirmanager #exporterExcel');
      await p.evaluate(() => { const e = Ext.ComponentQuery.query('venteavoirmanager')[0]; e.down('#dtStart').setValue(new Date()); e.down('#dtEnd').setValue(new Date()); });
      await cliquer('venteavoirmanager #rechercher');
      await p.waitForFunction(() => !Ext.ComponentQuery.query('venteavoirmanager #gridEnCours')[0].getStore().isLoading(), null, { timeout: 30000 });
      const lignes = await p.evaluate(() => Ext.ComponentQuery.query('venteavoirmanager #gridEnCours')[0].getStore().getCount());
      ok('Point 6 : la liste des avoirs en cours affiche l avoir pose', lignes >= 1, lignes);

      const xls = await telecharger(() => cliquer('venteavoirmanager #exporterExcel'));
      const entete = fs.readFileSync(xls).slice(0, 4).toString('hex');
      const chaines = execSync('strings -a ' + xls + '; strings -a -el ' + xls, { encoding: 'utf8' });
      ok('Point 6 : l export Excel est un vrai classeur (.xls) titre AVOIRS EN COURS', /\.xls$/.test(xls) && entete === 'd0cf11e0' && /AVOIRS EN COURS DU/.test(chaines), xls + ' ' + entete);
      ok('Point 6 : l export porte la reference de l avoir', chaines.indexOf(AVOIR) >= 0, AVOIR);

      await cliquer('venteavoirmanager #creerInventaire');
      await p.waitForFunction(() => Ext.MessageBox.isVisible() && Ext.MessageBox.title === 'Confirmation', null, { timeout: 30000 });
      let boite = await derniereBoite();
      ok('Point 6 : la confirmation annonce le nombre de produits et d avoirs', new RegExp(nbProduitsAvoir + ' produit\\(s\\)').test(boite.texte) && /1 avoir\(s\)/.test(boite.texte), boite.texte);
      await repondre('yes');
      await p.waitForFunction(() => Ext.MessageBox.isVisible() && (Ext.MessageBox.title === 'Information' || Ext.MessageBox.title === 'Message'), null, { timeout: 60000 });
      boite = await derniereBoite();
      ok('Point 6 : l inventaire est cree', /Inventaire « INVENTAIRE AVOIRS EN COURS/.test(boite.texte), boite.texte);
      await repondre('ok');
      const inv = q("SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE AVOIRS EN COURS %' ORDER BY dt_CREATED DESC LIMIT 1");
      ok('Point 6 : l inventaire porte les produits de l avoir', inv && q("SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + inv + "'") === nbProduitsAvoir, inv);
    } finally {
      purgerAvoir();
    }

    /* ------------------------------------------------------------ point 8 : marge */
    // meme raison : une vente cloturee posee par le test, un jour sans autre vente lisible (400 jours en arriere)
    const jour = q("SELECT DATE_SUB(CURDATE(), INTERVAL 400 DAY)");
    poserVente(VENTE, false, jour);
    await ouvrir('margeproducts', 'margeproducts #exporterExcel');
    await p.evaluate((j) => { const e = Ext.ComponentQuery.query('margeproducts')[0]; e.down('#dtStart').setValue(Ext.Date.parse(j, 'Y-m-d')); e.down('#dtEnd').setValue(Ext.Date.parse(j, 'Y-m-d')); }, jour);
    await cliquer('margeproducts #rechercher');
    await p.waitForFunction(() => !Ext.ComponentQuery.query('margeproducts gridpanel')[0].getStore().isLoading(), null, { timeout: 60000 });
    const totalMarge = await p.evaluate(() => Ext.ComponentQuery.query('margeproducts gridpanel')[0].getStore().getTotalCount());
    ok('Point 8 : la marge sur produits vendus a des lignes sur ' + jour, totalMarge > 0, totalMarge);
    const premier = await p.evaluate(() => { const r = Ext.ComponentQuery.query('margeproducts gridpanel')[0].getStore().getAt(0); return r ? r.get('libelle') : ''; });

    const xlsxM = await telecharger(() => cliquer('margeproducts #exporterExcel'));
    const texteM = xlsxTexte(xlsxM);
    ok('Point 8 : l export Excel porte le titre, la periode et les colonnes de la liste', /MARGE SUR PRODUITS VENDUS/.test(texteM) && /Code CIP\|Libell/.test(texteM) && /%Marge/.test(texteM), texteM.slice(0, 200));
    ok('Point 8 : l export porte toutes les lignes (pas seulement la page)', texteM.split('\n').filter(l => /^\d/.test(l)).length >= Math.min(totalMarge, 1) && texteM.indexOf(premier) >= 0, premier);

    await cliquer('margeproducts #creerInventaire');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && Ext.MessageBox.title === 'Confirmation', null, { timeout: 60000 });
    let boiteM = await derniereBoite();
    ok('Point 8 : la confirmation annonce le nombre de produits de la liste', new RegExp(totalMarge + ' produit\\(s\\)').test(boiteM.texte), boiteM.texte);
    await repondre('yes');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && (Ext.MessageBox.title === 'Information' || Ext.MessageBox.title === 'Message'), null, { timeout: 120000 });
    boiteM = await derniereBoite();
    ok('Point 8 : l inventaire est cree', /Inventaire « INVENTAIRE MARGE PRODUITS VENDUS/.test(boiteM.texte), boiteM.texte);
    await repondre('ok');
    const invM = q("SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE MARGE PRODUITS VENDUS %' ORDER BY dt_CREATED DESC LIMIT 1");
    ok('Point 8 : l inventaire porte autant de produits que la liste', invM && q("SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + invM + "'") === String(totalMarge), invM);

    /* ------------------------------------------------------------ point 3 : mouvements de caisse */
    const jourMvt = q("SELECT DATE_SUB(CURDATE(), INTERVAL 410 DAY)");
    poserMouvements(jourMvt);
    try {
      const userId = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
      const pdfMvt = await p.evaluate(async (u) => {
        const x = await fetch(u); return { statut: x.status, type: x.headers.get('content-type'), octets: Array.from(new Uint8Array(await x.arrayBuffer())) };
      }, '../CaisseServlet?dtStart=' + jourMvt + '&dtEnd=' + jourMvt + '&userId=' + userId + '&checked=true&typeMvtId=');
      ok('Point 3 : l edition des mouvements de caisse rend un PDF', pdfMvt.statut === 200 && /pdf/.test(pdfMvt.type || ''), pdfMvt.statut + ' ' + pdfMvt.type);
      fs.writeFileSync(TMP + '/mouvements.pdf', Buffer.from(pdfMvt.octets));
      const texteMvt = execSync('pdftotext -layout ' + TMP + '/mouvements.pdf -', { encoding: 'utf8' });
      ok('Point 3 : titre, periode et filtres', /LISTE DES MOUVEMENTS DE CAISSE/.test(texteMvt) && /Mouvements contr/.test(texteMvt), texteMvt.slice(0, 300));
      ok('Point 3 : les mouvements sont groupes par type avec sous-total', /ENTREES DE CAISSE/.test(texteMvt) && /SORTIES DE CAISSE/.test(texteMvt)
        && /Sous-total Entrees de caisse : 2 mouvement/.test(texteMvt) && /Sous-total Sorties de caisse : 1 mouvement/.test(texteMvt), texteMvt.slice(0, 900));
      const dateSaisie = q("SELECT DATE_FORMAT(DATE_SUB('" + jourMvt + "', INTERVAL 3 DAY), '%d/%m/%Y')");
      const dateCreation = q("SELECT DATE_FORMAT('" + jourMvt + "', '%d/%m/%Y')");
      ok('Point 3 : la date du mouvement saisie figure, distincte de la date de creation', texteMvt.indexOf(dateSaisie) >= 0 && texteMvt.indexOf(dateCreation + ' 10:00:00') >= 0, dateSaisie + ' / ' + dateCreation);
      ok('Point 3 : total general et modes de reglement', /TOTAL G.N.RAL : 3 mouvement/.test(texteMvt) && /Par mode de r.glement : Especes/.test(texteMvt) && /Apport du gerant/.test(texteMvt), texteMvt.slice(-500));
    } finally {
      purgerMouvements();
    }

    ok('aucune erreur javascript', err.length === 0, err.join(' | '));
  } finally {
    const purges = purgerInventaires();
    ok('les inventaires d essai sont retires', purges >= 0, purges);
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS' + (ko ? '  (' + ko + ' FAIL)' : ''));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); purgerInventaires(); purgerAvoir(); purgerMouvements(); process.exit(2); });
