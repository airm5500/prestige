/* Point 5 : analyse tiers payant.
   - export Excel du resultat complet, aux deux niveaux ;
   - le choix d'un groupe tiers payant declenche la recherche ;
   - creation d'une suggestion a partir des produits du RESULTAT COURANT, avec le nombre integre. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 240) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });

const MARQUE = 'E2E-A5';

/* La base de test ne contient aucune vente tiers payant exploitable par l'analyse : le test pose
   la sienne - une vente assurance cloturee, avec ses lignes de produits et son tiers payant -
   puis la retire. Sans cela l'ecran resterait vide et rien ne serait reellement verifie. */
function semer() {
  nettoyer();
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const cctp = q("SELECT lg_COMPTE_CLIENT_TIERS_PAYANT_ID FROM t_compte_client_tiers_payant LIMIT 1");
  const produits = q("SELECT f.lg_FAMILLE_ID FROM t_famille f"
    + " JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND fs.lg_EMPLACEMENT_ID='1'"
    + " WHERE f.lg_GROSSISTE_ID IS NOT NULL AND f.bool_DECONDITIONNE=0 LIMIT 3").split('\n');
  const modele = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_TYPE_VENTE_ID='2' LIMIT 1");
  exec("CREATE TEMPORARY TABLE tmp_a AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + modele + "';"
     + "UPDATE tmp_a SET lg_PREENREGISTREMENT_ID='" + MARQUE + "-V', str_REF='" + MARQUE + "-REF',"
     + " lg_USER_ID='" + user + "', int_PRICE=30000, int_CUST_PART=0, b_IS_CANCEL=0,"
     + " str_STATUT='is_Closed', dt_UPDATED=NOW(), dt_CREATED=NOW();"
     + "INSERT INTO t_preenregistrement SELECT * FROM tmp_a;");
  produits.forEach(function (produit, i) {
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
      + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_PRICE, int_PRICE_UNITAIR, str_STATUT,"
      + " dt_CREATED, dt_UPDATED, int_PRICE_REMISE, montantTva, valeurTva, prixAchat)"
      + " VALUES ('" + MARQUE + "-D" + i + "', '" + MARQUE + "-V', '" + produit + "', 2, 2, 10000, 5000,"
      + " 'is_Closed', NOW(), NOW(), 0, 0, 0, 6000)");
  });
  exec("INSERT INTO t_preenregistrement_compte_client_tiers_payent"
     + " (lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID, lg_PREENREGISTREMENT_ID,"
     + "  lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED,"
     + "  int_PERCENT, int_PRICE, int_PRICE_RESTE, str_REF_BON)"
     + " VALUES ('" + MARQUE + "-L', '" + MARQUE + "-V', '" + cctp + "', '" + user + "', 'is_Closed',"
     + " NOW(), NOW(), 100, 30000, 30000, '" + MARQUE + "')");
  return produits.length;
}
function nettoyer() {
  exec("DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%';"
     + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%';"
     + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%';");
}

function nettoyerSuggestions(avant) {
  // Retire les suggestions creees par le test, en gardant celles qui preexistaient.
  exec("DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID IN"
     + " (SELECT lg_SUGGESTION_ORDER_ID FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID NOT IN ("
     + (avant.length ? avant.map(i => "'" + i + "'").join(',') : "''") + "));"
     + "DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID NOT IN ("
     + (avant.length ? avant.map(i => "'" + i + "'").join(',') : "''") + ");");
}

(async () => {
  const nbProduitsSemes = semer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  let appelsTp = 0;
  p.on('request', r => { if (r.url().includes('analyse-tierspayant/tiers-payants')) appelsTp++; });
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('analysetierspayant', 'Analyse tiers payant', ''));
  const ouvert = await p.waitForFunction(() => Ext.ComponentQuery.query('analysetierspayant').length > 0, null, { timeout: 20000 }).then(() => true).catch(() => false);
  ok('ecran Analyse tiers payant ouvert', ouvert);
  await p.waitForTimeout(5000);

  // periode large pour disposer de donnees
  await p.evaluate(() => {
    const e = Ext.ComponentQuery.query('analysetierspayant')[0];
    e.down('#dtStart').setValue(new Date(2020, 0, 1));
    e.down('#dtEnd').setValue(new Date());
    testextjs.app.getController('AnalyseTiersPayantCtr').onRechercher(e.down('#btnRechercher'));
  });
  await p.waitForTimeout(6000);

  const grilles = await p.evaluate(() => {
    const e = Ext.ComponentQuery.query('analysetierspayant')[0];
    return { tp: e.storeTiersPayants.getCount(), produits: e.storeProduits.getCount() };
  });
  ok('les deux grilles sont alimentees', grilles.tp > 0 && grilles.produits > 0, JSON.stringify(grilles));

  // --- boutons presents ---
  const boutons = await p.evaluate(() => {
    const e = Ext.ComponentQuery.query('analysetierspayant')[0];
    return {
      excel: !!e.down('#btnExcel'),
      excelTp: !!e.down('#btnExcelTiersPayants'),
      excelProd: !!e.down('#btnExcelProduits'),
      suggestion: !!e.down('#btnSuggestion')
    };
  });
  ok('boutons Excel et Créer une suggestion presents',
     boutons.excel && boutons.excelTp && boutons.excelProd && boutons.suggestion, JSON.stringify(boutons));

  // --- exports Excel ---
  const appel = (url) => p.evaluate(async (u) => {
    const r = await fetch(u);
    const t = r.headers.get('content-type') || '';
    if (t.indexOf('json') !== -1) { return { status: r.status, json: JSON.parse(await r.text()) }; }
    const buf = await r.arrayBuffer();
    return { status: r.status, taille: buf.byteLength,
             signature: new TextDecoder().decode(new Uint8Array(buf.slice(0, 2))) };
  }, url);

  for (const niveau of ['TIERSPAYANT', 'PRODUIT']) {
    const r = await appel('../api/v1/analyse-tierspayant/excel?niveau=' + niveau
        + '&dtStart=2020-01-01&dtEnd=' + new Date().toISOString().slice(0, 10) + '&query=&tri=MARGE&groupeId=');
    ok('export Excel ' + niveau + ' : classeur valide',
       r.status === 200 && r.signature === 'PK' && r.taille > 1000, JSON.stringify(r));
  }

  // --- le choix d'un groupe declenche la recherche ---
  const avantGroupe = appelsTp;
  const groupeChoisi = await p.evaluate(() => {
    const c = Ext.ComponentQuery.query('analysetierspayant #groupeTiersPayant')[0];
    const rec = c.getStore().getAt(c.getStore().getCount() - 1);
    if (!rec) { return null; }
    c.setValue(rec.get('id'));
    c.fireEvent('select', c, [rec]);
    return rec.get('libelle');
  });
  await p.waitForTimeout(4000);
  ok('choisir un groupe tiers payant lance la recherche', appelsTp > avantGroupe,
     'groupe=' + groupeChoisi + ' appels avant=' + avantGroupe + ' apres=' + appelsTp);

  // --- suggestion a partir du resultat courant ---
  const suggestionsAvant = q("SELECT lg_SUGGESTION_ORDER_ID FROM t_suggestion_order").split('\n').filter(Boolean);
  const nbProduits = await p.evaluate(() => {
    const e = Ext.ComponentQuery.query('analysetierspayant')[0];
    e.down('#groupeTiersPayant').setValue('');
    testextjs.app.getController('AnalyseTiersPayantCtr').onRechercher(e.down('#btnRechercher'));
    return null;
  });
  await p.waitForTimeout(6000);

  const suggestion = await appel('../api/v1/analyse-tierspayant/suggestion?dtStart=2020-01-01&dtEnd='
      + new Date().toISOString().slice(0, 10) + '&tiersPayantId=&query=&tri=MARGE&groupeId=');
  ok('la suggestion est creee', suggestion.json && suggestion.json.success === true, JSON.stringify(suggestion.json));
  ok('le nombre de produits integres est annonce',
     suggestion.json && typeof suggestion.json.count === 'number' && suggestion.json.count > 0,
     JSON.stringify(suggestion.json));
  ok('le perimetre du resultat courant est rappele',
     suggestion.json && suggestion.json.produitsDuResultat >= suggestion.json.count,
     JSON.stringify(suggestion.json));

  // La suggestion doit porter sur le RESULTAT FILTRE, pas sur l'ensemble des produits : en
  // restreignant la recherche a un seul CIP, elle ne doit retenir que ce produit-la.
  const unCip = q("SELECT f.int_CIP FROM t_famille f JOIN t_preenregistrement_detail d"
    + " ON d.lg_FAMILLE_ID=f.lg_FAMILLE_ID WHERE d.lg_PREENREGISTREMENT_ID='" + MARQUE + "-V' LIMIT 1");
  const suggestionUnProduit = await appel('../api/v1/analyse-tierspayant/suggestion?dtStart=2020-01-01&dtEnd='
      + new Date().toISOString().slice(0, 10) + '&tiersPayantId=&query=' + encodeURIComponent(unCip)
      + '&tri=MARGE&groupeId=');
  ok('la suggestion ne retient que les produits du resultat filtre',
     suggestionUnProduit.json && suggestionUnProduit.json.success === true
       && suggestionUnProduit.json.produitsDuResultat === 1,
     'cip=' + unCip + ' -> ' + JSON.stringify(suggestionUnProduit.json));

  const suggestionFiltree = await appel('../api/v1/analyse-tierspayant/suggestion?dtStart=2020-01-01&dtEnd='
      + new Date().toISOString().slice(0, 10)
      + '&tiersPayantId=&query=' + encodeURIComponent('ZZZZ-AUCUN-PRODUIT') + '&tri=MARGE&groupeId=');
  ok('une recherche sans resultat ne cree pas de suggestion',
     suggestionFiltree.json && suggestionFiltree.json.success === false,
     JSON.stringify(suggestionFiltree.json));

  ok('aucune erreur JavaScript', err.length === 0, err.join(' || '));
  await b.close();
  nettoyerSuggestions(suggestionsAvant);
  nettoyer();
  const ko = res.filter(r => !r.c).length;
  console.log('\n===== ' + (res.length - ko) + '/' + res.length + (ko ? ' FAIL' : ' PASS') + ' =====');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('FATAL', e); try { nettoyer(); } catch (_) { } process.exit(2); });
