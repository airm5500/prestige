/* Facturation des carnets depot.
   Scenarios A a G du cahier : isolation de la liste normale, onglet dedie, bons a facturer,
   creation, impressions, pagination. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 280) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2ECD';

/* Deux tiers payants : A est un carnet depot, B un tiers payant ordinaire. Chacun recoit des
   factures ET des bons non factures, pour que chaque ecran puisse etre pris en defaut s'il
   melange les deux circuits. */
const DEPOT = MARQUE + '-TP-DEPOT';
const ORDINAIRE = MARQUE + '-TP-NORMAL';
const NB_FACTURES_DEPOT = 3;

function nettoyer() {
  exec("DELETE FROM t_facture WHERE lg_FACTURE_ID LIKE '" + MARQUE + "%'");
  exec("DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID LIKE '" + MARQUE + "%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%'");
  exec("DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID LIKE '" + MARQUE + "%'");
  exec("DELETE FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID LIKE '" + MARQUE + "%'");
}

function clonerTiersPayant(id, nom, estDepot) {
  exec("CREATE TEMPORARY TABLE tmp_tp SELECT * FROM t_tiers_payant WHERE str_STATUT='enable' LIMIT 1;"
    + " UPDATE tmp_tp SET lg_TIERS_PAYANT_ID='" + id + "', str_NAME='" + nom + "', str_FULLNAME='" + nom + "',"
    + " is_depot=" + (estDepot ? 1 : 0) + ", str_STATUT='enable';"
    + " INSERT INTO t_tiers_payant SELECT * FROM tmp_tp; DROP TEMPORARY TABLE tmp_tp;");
}

function clonerFacture(id, tiersPayant, code, template) {
  exec("CREATE TEMPORARY TABLE tmp_f SELECT * FROM t_facture LIMIT 1;"
    /* Deux colonnes designent le tiers payant : « str_CUSTOMER », lue par l'edition, et
       « tiersPayant », qui porte la RELATION dont se sert la liste. Elles concordent sur les
       1 112 factures reelles de la base ; la copie doit donc renseigner les deux, sinon elle
       serait classee d'apres le tiers payant de la facture d'origine. */
    + " UPDATE tmp_f SET lg_FACTURE_ID='" + id + "', str_CUSTOMER='" + tiersPayant + "',"
    + " tiersPayant='" + tiersPayant + "',"
    + " str_CODE_FACTURE='" + code + "', int_NB_DOSSIER=4, dbl_MONTANT_CMDE=125000, template=" + template + ","
    + " dt_CREATED=NOW(), dt_DATE_FACTURE=NOW();"
    + " INSERT INTO t_facture SELECT * FROM tmp_f; DROP TEMPORARY TABLE tmp_f;");
}

/* Un bon non facture : une vente cloturee rattachee au compte client du tiers payant, au statut
   « impaye ». C'est ce que l'ecran de creation propose a la facturation. */
function clonerBon(suffixe, tiersPayant) {
  const compte = MARQUE + '-CC-' + suffixe;
  const vente = MARQUE + '-V-' + suffixe;
  const bon = MARQUE + '-B-' + suffixe;
  const utilisateur = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  /* Les comptes clients de cette base sont tous orphelins : aucun des 6 051 ne pointe vers un
     t_compte_client existant. On rattache donc la copie au seul compte client valide, sans quoi
     la contrainte de cle etrangere refuse l'insertion. */
  const compteClient = q("SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1");
  exec("CREATE TEMPORARY TABLE tmp_cc SELECT * FROM t_compte_client_tiers_payant LIMIT 1;"
    + " UPDATE tmp_cc SET lg_COMPTE_CLIENT_TIERS_PAYANT_ID='" + compte + "',"
    + " lg_TIERS_PAYANT_ID='" + tiersPayant + "', lg_COMPTE_CLIENT_ID='" + compteClient + "',"
    + " str_STATUT='enable';"
    + " INSERT INTO t_compte_client_tiers_payant SELECT * FROM tmp_cc; DROP TEMPORARY TABLE tmp_cc;");
  exec("CREATE TEMPORARY TABLE tmp_v SELECT * FROM t_preenregistrement WHERE str_STATUT='is_Closed' LIMIT 1;"
    + " UPDATE tmp_v SET lg_PREENREGISTREMENT_ID='" + vente + "', lg_USER_ID='" + utilisateur + "',"
    + " dt_UPDATED=NOW(), dt_CREATED=NOW(), b_IS_CANCEL=0, str_STATUT='is_Closed', int_PRICE=50000;"
    + " INSERT INTO t_preenregistrement SELECT * FROM tmp_v; DROP TEMPORARY TABLE tmp_v;");
  exec("CREATE TEMPORARY TABLE tmp_b SELECT * FROM t_preenregistrement_compte_client_tiers_payent LIMIT 1;"
    + " UPDATE tmp_b SET lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID='" + bon + "',"
    + " lg_PREENREGISTREMENT_ID='" + vente + "', lg_COMPTE_CLIENT_TIERS_PAYANT_ID='" + compte + "',"
    // Meme constat que pour les comptes clients : les lignes existantes portent des utilisateurs
    // qui n'existent plus. On rattache la copie a l'operateur du test.
    + " lg_USER_ID='" + utilisateur + "',"
    + " str_REF_BON='" + bon + "', int_PRICE=50000, str_STATUT='is_Closed', str_STATUT_FACTURE='unpaid',"
    + " dt_UPDATED=NOW();"
    + " INSERT INTO t_preenregistrement_compte_client_tiers_payent SELECT * FROM tmp_b;"
    + " DROP TEMPORARY TABLE tmp_b;");
}

function semer() {
  nettoyer();
  clonerTiersPayant(DEPOT, MARQUE + ' CARNET DEPOT', true);
  clonerTiersPayant(ORDINAIRE, MARQUE + ' TP ORDINAIRE', false);
  for (let i = 0; i < NB_FACTURES_DEPOT; i++) {
    clonerFacture(MARQUE + '-F-DEP-' + i, DEPOT, MARQUE + 'D' + i, i === 0 ? 1 : 0);
  }
  clonerFacture(MARQUE + '-F-ORD-0', ORDINAIRE, MARQUE + 'O0', 1);
  clonerFacture(MARQUE + '-F-ORD-1', ORDINAIRE, MARQUE + 'O1', 0);
  clonerBon('DEP', DEPOT);
  clonerBon('ORD', ORDINAIRE);
  return true;
}

(async () => {
  semer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const appel = (url) => p.evaluate(async (u) => {
    const r = await fetch(u);
    const t = await r.text();
    let json = null; try { json = JSON.parse(t); } catch (e) { }
    return { status: r.status, json: json, texte: t.slice(0, 300) };
  }, url);

  const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  try {
    // ---- Scenario A : la liste NORMALE ignore les carnets depot
    const normales = await appel('../api/v1/facturation/summary/provisoires?start=0&limit=500');
    const idsNormaux = ((normales.json && normales.json.data) || []).map(f => f.lgFACTUREID);
    ok('scenario A : la liste normale repond', normales.json && idsNormaux.length >= 0,
       'factures=' + idsNormaux.length);
    ok('scenario A : aucune facture carnet depot dans la liste normale',
       !idsNormaux.some(id => String(id).indexOf(MARQUE + '-F-DEP') === 0),
       idsNormaux.filter(id => String(id).indexOf(MARQUE) === 0).join(','));
    ok('scenario A : la facture provisoire du tiers payant ORDINAIRE y figure bien',
       idsNormaux.indexOf(MARQUE + '-F-ORD-0') !== -1,
       idsNormaux.filter(id => String(id).indexOf(MARQUE) === 0).join(','));

    // ---- Scenario B : l'onglet dedie ne montre QUE les carnets depot
    const dedie = await appel('../api/v1/facturation/summary/carnet-depot?start=0&limit=500');
    const idsDepot = ((dedie.json && dedie.json.data) || []).map(f => f.lgFACTUREID);
    ok('scenario B : l onglet dedie repond', dedie.json && dedie.json.total !== undefined,
       'total=' + (dedie.json && dedie.json.total));
    ok('scenario B : les trois factures du carnet depot y figurent',
       [0, 1, 2].every(i => idsDepot.indexOf(MARQUE + '-F-DEP-' + i) !== -1),
       idsDepot.filter(id => String(id).indexOf(MARQUE) === 0).join(','));
    ok('scenario B : aucune facture de tiers payant ordinaire dans l onglet dedie',
       !idsDepot.some(id => String(id).indexOf(MARQUE + '-F-ORD') === 0),
       idsDepot.filter(id => String(id).indexOf(MARQUE) === 0).join(','));
    ok('scenario B : provisoires ET definitives sont visibles cote depot',
       idsDepot.indexOf(MARQUE + '-F-DEP-0') !== -1 && idsDepot.indexOf(MARQUE + '-F-DEP-1') !== -1,
       'la 0 est provisoire, la 1 est definitive');
    const ligne = ((dedie.json && dedie.json.data) || []).filter(f => f.lgFACTUREID === MARQUE + '-F-DEP-1')[0];
    ok('scenario B : la ligne porte periode, nom, nombre de bons, montant et date',
       ligne && ligne.periode && ligne.strFULLNAME && ligne.nbDossier === 4
         && ligne.dblMONTANTCMDE === 125000 && ligne.dtDATEFACTURE, JSON.stringify(ligne));

    // filtre par tiers payant
    const filtree = await appel('../api/v1/facturation/summary/carnet-depot?start=0&limit=500&tpid='
      + encodeURIComponent(DEPOT));
    ok('scenario B : le filtre tpid restreint bien a un carnet',
       ((filtree.json && filtree.json.data) || []).every(f => f.strFULLNAME.indexOf(MARQUE) === 0),
       'total=' + (filtree.json && filtree.json.total));
    const filtreeOrdinaire = await appel('../api/v1/facturation/summary/carnet-depot?start=0&limit=500&tpid='
      + encodeURIComponent(ORDINAIRE));
    ok('scenario B : demander un tiers payant ORDINAIRE dans l onglet dedie ne rend rien',
       filtreeOrdinaire.json && filtreeOrdinaire.json.total === 0,
       'total=' + (filtreeOrdinaire.json && filtreeOrdinaire.json.total));

    // ---- Scenario C : bons a facturer
    const critere = '&dtStart=' + hier + '&dtEnd=' + demain + '&mode=TP';
    const bonsNormaux = await appel('../api/v1/facturation/provisoires?start=0&limit=500' + critere);
    const nomsNormaux = ((bonsNormaux.json && bonsNormaux.json.data) || []).map(x => x.fullName || '');
    ok('scenario C : l ecran normal ne propose pas les bons du carnet depot',
       !nomsNormaux.some(n => n.indexOf(MARQUE + ' CARNET DEPOT') !== -1),
       nomsNormaux.filter(n => n.indexOf(MARQUE) === 0).join(','));
    ok('scenario C : l ecran normal propose bien les bons du tiers payant ordinaire',
       nomsNormaux.some(n => n.indexOf(MARQUE + ' TP ORDINAIRE') !== -1),
       nomsNormaux.filter(n => n.indexOf(MARQUE) === 0).join(','));

    const bonsDepot = await appel('../api/v1/facturation/provisoires?start=0&limit=500' + critere
      + '&carnetDepot=true');
    const nomsDepot = ((bonsDepot.json && bonsDepot.json.data) || []).map(x => x.fullName || '');
    ok('scenario C : l ecran dedie propose les bons du carnet depot',
       nomsDepot.some(n => n.indexOf(MARQUE + ' CARNET DEPOT') !== -1),
       nomsDepot.filter(n => n.indexOf(MARQUE) === 0).join(','));
    ok('scenario C : l ecran dedie ne propose aucun bon de tiers payant ordinaire',
       !nomsDepot.some(n => n.indexOf(MARQUE + ' TP ORDINAIRE') !== -1),
       nomsDepot.filter(n => n.indexOf(MARQUE) === 0).join(','));

    // mode BONS, ligne a ligne
    const modeBons = await appel('../api/v1/facturation/provisoires?start=0&limit=500&dtStart=' + hier
      + '&dtEnd=' + demain + '&mode=BONS&carnetDepot=true');
    const refsDepot = ((modeBons.json && modeBons.json.data) || []).map(x => x.fullName || '');
    ok('scenario C : le mode BONS applique lui aussi la separation',
       refsDepot.indexOf(MARQUE + '-B-DEP') !== -1 && refsDepot.indexOf(MARQUE + '-B-ORD') === -1,
       refsDepot.filter(r => String(r).indexOf(MARQUE) === 0).join(','));
    const modeBonsNormal = await appel('../api/v1/facturation/provisoires?start=0&limit=500&dtStart=' + hier
      + '&dtEnd=' + demain + '&mode=BONS');
    const refsNormales = ((modeBonsNormal.json && modeBonsNormal.json.data) || []).map(x => x.fullName || '');
    ok('scenario C : en mode BONS, le circuit normal ignore le bon du depot',
       refsNormales.indexOf(MARQUE + '-B-ORD') !== -1 && refsNormales.indexOf(MARQUE + '-B-DEP') === -1,
       refsNormales.filter(r => String(r).indexOf(MARQUE) === 0).join(','));

    // ---- Scenario G : comptage et pagination symetriques
    const page1 = await appel('../api/v1/facturation/summary/carnet-depot?start=0&limit=2');
    const page2 = await appel('../api/v1/facturation/summary/carnet-depot?start=2&limit=2');
    const totalAnnonce = page1.json && page1.json.total;
    const totalReel = Number(q("SELECT COUNT(*) FROM t_facture f JOIN t_tiers_payant tp"
      + " ON tp.lg_TIERS_PAYANT_ID = f.tiersPayant WHERE tp.is_depot = 1"));
    ok('scenario G : le total annonce ne compte aucun tiers payant ordinaire',
       totalAnnonce === totalReel, 'annonce=' + totalAnnonce + ' reel=' + totalReel);
    ok('scenario G : la premiere page rend le nombre demande',
       ((page1.json && page1.json.data) || []).length === Math.min(2, totalReel),
       'page 1 = ' + ((page1.json && page1.json.data) || []).length + ' lignes');
    const ids1 = ((page1.json && page1.json.data) || []).map(f => f.lgFACTUREID);
    const ids2 = ((page2.json && page2.json.data) || []).map(f => f.lgFACTUREID);
    ok('scenario G : les pages ne se recouvrent pas',
       !ids1.some(id => ids2.indexOf(id) !== -1), JSON.stringify({ page1: ids1, page2: ids2 }));

    // ---- Scenario F : impression detaillee
    const modeleDetail = q("SELECT COUNT(*) FROM t_model_facture WHERE typeAffichage='DETAIL_ARTICLE'"
      + " AND str_STATUT='enable'");
    const detail = await p.evaluate(async (u) => {
      const r = await fetch(u);
      return { status: r.status, texte: (await r.text()).slice(0, 600) };
    }, '../webservices/sm_user/facturation/ws_rp_facture_tiers_payant.jsp?details=true&lg_FACTURE_ID='
      + encodeURIComponent(MARQUE + '-F-DEP-1'));
    if (Number(modeleDetail) === 0) {
      // Aucun modele DETAIL_ARTICLE actif : la page doit le DIRE, et nommer le reglage a faire.
      ok('scenario F : sans modele DETAIL_ARTICLE, l impression detaillee explique ce qui manque',
         detail.texte.indexOf('DETAIL_ARTICLE') !== -1, detail.texte.replace(/\s+/g, ' ').slice(0, 200));
    } else {
      ok('scenario F : l impression detaillee aboutit', detail.status === 200,
         detail.texte.replace(/\s+/g, ' ').slice(0, 200));
    }

    // ---- l'ecran
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('reglementdepot', {}));
    await p.waitForTimeout(3000);
    const ecran = await p.evaluate(async () => {
      const vue = Ext.ComponentQuery.query('reglementdepot')[0];
      if (!vue) { return { ouvert: false }; }
      const onglet = vue.down('#facturesPanel');
      const grille = vue.down('#grilleFacturesDepot');
      if (grille) {
        testextjs.app.getController('GestionCarnetDepotCtr').chargerFacturesDepot();
        await new Promise(r => setTimeout(r, 3000));
      }
      return {
        ouvert: true,
        onglets: vue.items.items.map(o => o.title),
        grille: !!grille,
        lignes: grille ? grille.getStore().getCount() : -1,
        colonnes: grille ? grille.headerCt.items.items.map(c => (c.text || '').replace(/<[^>]*>/g, '')) : [],
        boutonCreer: !!vue.down('#btnCreerFactureDepot'),
        impressions: grille
          ? grille.headerCt.items.items.filter(c => c.xtype === 'actioncolumn')
              .reduce((n, c) => n + c.items.length, 0) : 0
      };
    });
    ok('l onglet FACTURES est present dans Gerer carnet depot',
       ecran.ouvert && ecran.onglets.indexOf('FACTURES') !== -1, JSON.stringify(ecran.onglets));
    ok('l onglet porte les colonnes demandees',
       ['Période facturée', 'Dépôt / tiers-payant', 'Nbre bons', 'Montant net', 'Date facture']
         .every(c => ecran.colonnes.indexOf(c) !== -1), JSON.stringify(ecran.colonnes));
    ok('l onglet est rempli avec les factures carnet depot', ecran.lignes >= 3, 'lignes=' + ecran.lignes);
    ok('le bouton « Créer une facture » est present', ecran.boutonCreer);
    ok('les deux impressions sont proposees sur chaque ligne', ecran.impressions === 2,
       'actions=' + ecran.impressions);

    // ---- Scenario D : l'ecran de creation ouvert en mode carnet depot
    const creation = await p.evaluate(async () => {
      testextjs.app.getController('GestionCarnetDepotCtr').creerFactureDepot();
      await new Promise(r => setTimeout(r, 3000));
      const vue = Ext.ComponentQuery.query('oneditfacture')[0];
      if (!vue) { return { ouvert: false }; }
      const magasins = Ext.ComponentQuery.query('oneditfacture gridpanel')
        .map(g => g.getStore().getProxy().extraParams);
      return { ouvert: true, titre: vue.title, magasins: magasins };
    });
    ok('scenario D : l ecran de creation s ouvre en mode carnet depot',
       creation.ouvert && /CARNET/i.test(creation.titre || ''), JSON.stringify(creation.titre));
    ok('scenario D : ses magasins transmettent carnetDepot au serveur',
       (creation.magasins || []).some(m => m && m.carnetDepot === true),
       JSON.stringify(creation.magasins));

    ok('aucune erreur JavaScript', err.length === 0, err.slice(0, 3).join(' | '));
  } finally {
    await b.close();
    nettoyer();
  }
  const total = res.length, passes = res.filter(r => r.c).length;
  console.log('\n===== ' + passes + '/' + total + ' PASS =====');
  process.exit(passes === total ? 0 : 1);
})();
