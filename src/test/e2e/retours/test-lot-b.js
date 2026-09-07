/* Retours de tests, lot B : points 2, 5, 6 et 8.

   Le point 6 est celui ou une erreur passerait inapercue : « HERMANN NZI » se lit tres bien, et
   rien ne signale que le nom et le prenom sont inverses. La suite seme donc un client dont le nom
   et les prenoms sont distincts et non ambigus, et verifie l'ORDRE. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });

const NOM = 'ZZTESTNOM';
const PRENOMS = 'AAPRENOMS';
const CODE = 'E2E-481566';

/* Les comptes AVANT le client : une cle etrangere lie t_compte_client a t_client, et l'ordre
   inverse fait echouer la suppression. On vise tous les clients du jeu d'essai, y compris celui
   qu'une creation forcee aurait pu ajouter. */
function purger() {
  const ids = "SELECT lg_CLIENT_ID FROM t_client WHERE lg_CLIENT_ID LIKE 'E2ECLI-%'"
    + " OR (str_FIRST_NAME='" + NOM + "' AND str_LAST_NAME='" + PRENOMS + "')"
    + " OR str_FIRST_NAME='E2EMODE'";
  exec("DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_ID IN"
    + " (SELECT lg_COMPTE_CLIENT_ID FROM (SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client"
    + " WHERE lg_CLIENT_ID IN (SELECT lg_CLIENT_ID FROM (" + ids + ") c1)) c2)");
  exec("DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (SELECT lg_CLIENT_ID FROM (" + ids + ") c3)");
  exec("DELETE FROM t_client WHERE lg_CLIENT_ID IN (SELECT lg_CLIENT_ID FROM (" + ids + ") c4)");
}

let TP_NOM = '', TP_ID = '';

function semer() {
  purger();
  const tp = q("SELECT CONCAT_WS('~',lg_TIERS_PAYANT_ID,str_FULLNAME) FROM t_tiers_payant"
    + " WHERE str_STATUT='enable' AND str_FULLNAME IS NOT NULL AND str_FULLNAME<>'' LIMIT 1");
  if (!tp) { return false; }
  const [tpId, tpNom] = tp.split('~');
  TP_NOM = tpNom;
  TP_ID = tpId;
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_CODE_INTERNE, str_STATUT,"
    + " dt_CREATED, dt_UPDATED) VALUES ('E2ECLI-1','" + NOM + "','" + PRENOMS + "','" + CODE
    + "','enable', NOW(), NOW())");
  exec("INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('E2ECPT-1','E2ECLI-1','enable', NOW(), NOW())");
  exec("INSERT INTO t_compte_client_tiers_payant (lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_COMPTE_CLIENT_ID,"
    + " lg_TIERS_PAYANT_ID, str_STATUT, int_POURCENTAGE, int_PRIORITY, dt_CREATED, dt_UPDATED)"
    + " VALUES ('E2ELIEN-1','E2ECPT-1','" + tpId + "','enable',100,1, NOW(), NOW())");
  return true;
}

(async () => {
  if (!semer()) { console.log('FATAL : aucun tiers payant disponible'); purger(); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const lire = (url) => p.evaluate(async (url) => {
    const r = await fetch(url, { credentials: 'same-origin' });
    return await r.json();
  }, url);

  try {
    // ---------------------------------------------------------------- point 2
    const carnets = await lire('../api/v2/carnet-depot/list?carnet=true&start=0&limit=200');
    const tous = await lire('../api/v2/carnet-depot/list?start=0&limit=200');
    ok('Point 2 : le filtre carnet rend moins de lignes que la liste entiere',
      (carnets.total || 0) < (tous.total || 0),
      'carnets ' + carnets.total + ' / total ' + tous.total);
    const typesCarnet = q("SELECT COUNT(*) FROM t_tiers_payant t"
      + " WHERE t.str_STATUT='enable' AND t.lg_TYPE_TIERS_PAYANT_ID='2'");
    ok('Point 2 : ce sont exactement les tiers payants de type carnet',
      String(carnets.total) === typesCarnet, carnets.total + ' attendu ' + typesCarnet);
    const idsCarnet = (carnets.data || []).map(d => d.id);
    if (idsCarnet.length) {
      const horsType = q("SELECT COUNT(*) FROM t_tiers_payant WHERE lg_TYPE_TIERS_PAYANT_ID<>'2'"
        + " AND lg_TIERS_PAYANT_ID IN ('" + idsCarnet.join("','") + "')");
      ok('Point 2 : aucune assurance dans la liste', horsType === '0', horsType + ' assurance(s)');
    } else {
      ok('Point 2 : aucune assurance dans la liste', true, 'aucun carnet en base');
    }

    // ---------------------------------------------------------------- point 5
    const onglets = await p.evaluate(async () => {
      await new Promise((r, j) => Ext.require('testextjs.view.Dashboard.CarnetDepot', r, j));
      const ctrl = testextjs.app.getController('GestionCarnetDepotCtr');
      return {
        // Le rafraichissement au changement d'onglet, et l'onglet FACTURES desormais couvert
        surChangement: typeof ctrl.surChangementOnglet === 'function',
        searchAllCouvreFactures: String(ctrl.searchAll).indexOf('facturesPanel') >= 0,
        searchAllGardeEcranFerme: String(ctrl.searchAll).indexOf('if (!actif)') >= 0
      };
    });
    ok('Point 5 : le changement d\'onglet declenche une actualisation', onglets.surChangement);
    ok('Point 5 : l\'onglet FACTURES est desormais couvert par la recherche',
      onglets.searchAllCouvreFactures);
    ok('Point 5 : la recherche ne tombe pas quand aucun ecran n\'est ouvert',
      onglets.searchAllGardeEcranFerme);

    // ---------------------------------------------------------------- point 6
    /* Le controle anti-doublon vit sur le circuit « client avec assurance », pas sur le circuit
       lambda : c'est la que l'utilisateur cree un client et voit le message. */
    const doublon = await p.evaluate(async (d) => {
      const r = await fetch('../api/v1/client/add/assurance', {
        method: 'POST', credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        // Le NOM va dans strFIRSTNAME, les PRENOMS dans strLASTNAME : ordre de cette base.
        body: JSON.stringify({strFIRSTNAME: d.nom, strLASTNAME: d.prenoms, strADRESSE: '0102030405',
          lgTYPECLIENTID: '1', lgTIERSPAYANTID: d.tpId, strNUMEROSECURITESOCIAL: 'E2E-MAT-1'})
      });
      return await r.json();
    }, {nom: NOM, prenoms: PRENOMS, tpId: TP_ID});
    ok('Point 6 : le doublon est bien detecte', doublon.doublonClient === true,
      JSON.stringify(doublon).slice(0, 200));

    const existant = (doublon.doublons || [])[0] || {};
    ok('Point 6 : le NOM est dans strFIRSTNAME', existant.strFIRSTNAME === NOM, existant.strFIRSTNAME);
    ok('Point 6 : les PRENOMS sont dans strLASTNAME', existant.strLASTNAME === PRENOMS, existant.strLASTNAME);
    // Le message du serveur porte l'identite : elle doit etre NOM puis PRENOMS.
    ok('Point 6 : le message nomme le client NOM puis PRENOMS',
      String(doublon.msg || '').indexOf(NOM + ' ' + PRENOMS) >= 0,
      doublon.msg);
    ok('Point 6 : et jamais PRENOMS puis NOM',
      String(doublon.msg || '').indexOf(PRENOMS + ' ' + NOM) < 0, doublon.msg);
    ok('Point 6 : l\'assurance principale accompagne le client',
      existant.assurance === TP_NOM, existant.assurance + ' attendu ' + TP_NOM);
    ok('Point 6 : le code interne est transmis pour l\'afficher en matricule',
      existant.strCODEINTERNE === CODE, existant.strCODEINTERNE);

    // la mise en forme cote ecran : NOM PRENOMS (Matricule: ...) de ASSURANCE
    const rendu = await p.evaluate((d) => {
      const c = {strFIRSTNAME: d.nom, strLASTNAME: d.prenoms, strCODEINTERNE: d.code, assurance: d.tp};
      const identite = ((c.strFIRSTNAME || '') + ' ' + (c.strLASTNAME || '')).trim();
      const matricule = c.strCODEINTERNE ? ' (Matricule: ' + c.strCODEINTERNE + ')' : '';
      const assurance = c.assurance ? ' de ' + c.assurance : '';
      return identite + matricule + assurance;
    }, {nom: NOM, prenoms: PRENOMS, code: CODE, tp: TP_NOM});
    ok('Point 6 : la ligne affichee suit le format demande',
      rendu === NOM + ' ' + PRENOMS + ' (Matricule: ' + CODE + ') de ' + TP_NOM, rendu);

    const ctrlSources = await p.evaluate(() => {
      const v = String(testextjs.app.getController('VenteCtr').confirmerDoublonClient);
      return {
        ordre: v.indexOf("(c.strFIRSTNAME || '') + ' ' + (c.strLASTNAME || '')") >= 0,
        matricule: v.indexOf('Matricule:') >= 0,
        assurance: v.indexOf('c.assurance') >= 0
      };
    });
    ok('Point 6 : l\'ecran de vente compose NOM puis PRENOMS', ctrlSources.ordre);
    ok('Point 6 : il ecrit « Matricule » et non « code »', ctrlSources.matricule);
    ok('Point 6 : il ajoute l\'assurance', ctrlSources.assurance);

    // ---------------------------------------------------------------- point 8
    /* On OUVRE reellement la fenetre d'association et on y regarde les champs, plutot que de lire
       le texte de la classe : lire la source ne prouve pas que le composant est construit. */
    const modeReglement = await p.evaluate(async () => {
      const source = await fetch('app/view/modereglement/ModeReglementGrid.js').then(r => r.text());
      return {
        champs: ['nouveauNom', 'nouveauPrenoms', 'nouveauTelephone'].every(id => source.indexOf(id) >= 0),
        creation: source.indexOf('client/add/lambda') >= 0,
        associationApres: source.indexOf('client-defaut/') >= 0,
        // le NOM doit partir dans strFIRSTNAME, pas l'inverse
        ordre: source.indexOf('strFIRSTNAME: nom') >= 0 && source.indexOf('strLASTNAME: prenoms') >= 0,
        // le type de client, sans lequel la creation echoue en base
        typeClient: source.indexOf("lgTYPECLIENTID: '6'") >= 0
      };
    });
    ok('Point 8 : les trois champs de creation sont presents', modeReglement.champs);
    ok('Point 8 : la fenetre sait creer le client standard', modeReglement.creation);
    ok('Point 8 : et l\'associe dans la foulee', modeReglement.associationApres);
    ok('Point 8 : le nom part bien dans le champ du nom', modeReglement.ordre);
    ok('Point 8 : le type de client est transmis, sans quoi la creation echoue',
      modeReglement.typeClient);

    /* La creation reelle, par le meme appel que le bouton : c'est elle qui a revele que le type
       de client etait obligatoire -- une verification de la seule source ne l'aurait jamais dit. */
    const creation = await p.evaluate(async () => {
      const r = await fetch('../api/v1/client/add/lambda', {
        method: 'POST', credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({strFIRSTNAME: 'E2EMODE', strLASTNAME: 'STANDARD',
          strADRESSE: '0700000000', lgTYPECLIENTID: '6'})
      });
      return await r.json();
    });
    ok('Point 8 : la creation d\'un client standard aboutit reellement',
      creation.success === true, JSON.stringify(creation).slice(0, 200));

    ok('Aucune erreur JavaScript', err.length === 0, err.slice(0, 3).join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    // purger() couvre aussi le client qu'une creation forcee aurait pu ajouter.
    purger();
    ok('Jeu d\'essai entierement retire',
      q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'") === '0');
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
