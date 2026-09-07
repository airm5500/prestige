/* Retours de tests, lot A : les correctifs courts et isoles.

   Points couverts : 1 (menus colles), 3 (taille du nom sur le ticket), 7 (liste de caisse),
   10 (libelles de type de vente), 11 (le (+) de l'etat de controle), 13 (vues modales),
   15 (inventaire annonce en echec, et PDF en 404). */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 280) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });

/* Deux ventes du mois en cours, avec produits.

   Sans elles, l'analyse du CA ne rend aucune ligne et le point 15 se verifierait a vide : on
   controlerait que « aucun produit » est bien annonce en echec, jamais que l'inventaire REELLEMENT
   cree est annonce en succes -- c'est-a-dire exactement le defaut signale. */
const JOUR = new Date().toISOString().slice(0, 10);
let PRODUITS = [], USER = '';

function purger() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE 'E2ELA-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2ELA-%'");
  exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN"
    + " (SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE '%E2ELOTA%')");
  exec("DELETE FROM t_inventaire WHERE str_NAME LIKE '%E2ELOTA%'");
}

function semer() {
  purger();
  USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' ORDER BY str_NAME LIMIT 2")
    .split('\n').filter(Boolean).forEach(id => PRODUITS.push(id.trim()));
  if (!USER || PRODUITS.length !== 2) { return false; }
  ['E2ELA-1', 'E2ELA-2'].forEach((id, i) => {
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
      + " int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
      + " lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER,"
      + " int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
      + " montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + id + "','" + id + "','0'," + (2000 + i * 1000) + ",0,'is_Closed','"
      + JOUR + " 10:0" + i + ":00','" + JOUR + " 10:0" + i + ":00',1,'" + USER + "','" + USER + "','"
      + USER + "',0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
      + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
      + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
      + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + id + "-D','" + id + "','" + PRODUITS[i] + "',2,0,0,0," + (2000 + i * 1000)
      + "," + (1000 + i * 500) + ",0,'" + JOUR + " 10:0" + i + ":00','" + JOUR + " 10:0" + i
      + ":00',0,0,0,0,0,0,1,0,0,0,0,0)");
  });
  return true;
}

(async () => {
  if (!semer()) { console.log('FATAL : jeu d\'essai incomplet'); purger(); process.exit(1); }
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
    // ---------------------------------------------------------------- point 1
    const menus = await p.evaluate(() => window.PrestigeAffichage.ECRANS_COLLES);
    const attendus = ['tierpayantasdepot', 'reglementdepot', 'cloturerventemanager',
      'mvtcaissemanager', 'logfile', 'factureprovisoire'];
    ok('Point 1 : les six menus sont dans la liste des ecrans colles',
      attendus.every(m => menus.indexOf(m) >= 0),
      attendus.filter(m => menus.indexOf(m) < 0).join(', ') || 'tous presents');
    ok('Point 1 : la liste n\'a pas de doublon',
      menus.length === new Set(menus).size,
      menus.filter((m, i) => menus.indexOf(m) !== i).join(', '));

    // ---------------------------------------------------------------- point 3
    ok('Point 3 : le parametre de taille du nom existe',
      q("SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_TAILLE_NOM_OFFICINE_TICKET'") === '15',
      q("SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_TAILLE_NOM_OFFICINE_TICKET'"));
    ok('Point 3 : sa valeur par defaut est celle qui etait figee dans le code',
      q("SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_TAILLE_NOM_OFFICINE_TICKET'") === '15');

    // ---------------------------------------------------------------- point 7
    const caisse = await p.evaluate(async () => {
      await new Promise((r, j) => Ext.require('testextjs.view.sm_user.mvtcaisse.MvtCaisseManager', r, j));
      const vue = Ext.create('testextjs.view.sm_user.mvtcaisse.MvtCaisseManager', {renderTo: Ext.getBody()});
      const combo = Ext.getCmp('typeMvtFiltre');
      // On attend le chargement des types, puis on DEROULE la liste : c'est l'ouverture qui
      // effacait le filtre et faisait revenir les dix types.
      await new Promise(r => setTimeout(r, 2500));
      const avant = combo.getStore().getCount();
      combo.expand();
      await new Promise(r => setTimeout(r, 400));
      const apres = combo.getStore().getCount();
      combo.collapse();
      const noms = [];
      combo.getStore().each(rec => noms.push(rec.get('str_NAME')));
      const resultat = {
        avant: avant, apres: apres, noms: noms,
        boutonExcel: !!vue.down('button[text=Exporter]')
      };
      vue.destroy();
      return resultat;
    });
    ok('Point 7 : le filtre type ne propose que les trois types du journal',
      caisse.avant === 3, caisse.avant + ' : ' + caisse.noms.join(' | '));
    ok('Point 7 : derouler la liste ne fait pas revenir les autres types',
      caisse.apres === 3, caisse.apres + ' apres ouverture');
    ok('Point 7 : le bouton d\'exportation Excel est present', caisse.boutonExcel);

    const excel = await p.evaluate(async () => {
      const jour = new Date().toISOString().slice(0, 10);
      const r = await fetch('../api/v1/caisse/mvtcaisses/excel?dtStart=' + jour + '&dtEnd=' + jour,
        { credentials: 'same-origin' });
      const buf = await r.arrayBuffer();
      return { statut: r.status, taille: buf.byteLength, type: r.headers.get('content-type') };
    });
    ok('Point 7 : l\'export Excel du journal repond',
      excel.statut === 200 && excel.taille > 2000 && /excel/.test(excel.type || ''), JSON.stringify(excel));

    const focus = await p.evaluate(() => {
      const src = String(testextjs.view.sm_user.mvtcaisse.action.add ? '' : '');
      return src;
    });

    // ---------------------------------------------------------------- point 10
    const libelles = await p.evaluate(async () => {
      const jour = new Date().toISOString().slice(0, 10);
      const r = await fetch('../api/v1/caisse/listecaisse?dtStart=' + jour + '&dtEnd=' + jour
        + '&start=0&limit=50', { credentials: 'same-origin' });
      return await r.json();
    });
    const types = (libelles.data || []).map(l => l.typeMouvement);
    ok('Point 10 : plus aucun libelle « ventes ordonnancees » ni « ventes N.O. »',
      !types.some(t => /ordonnanc|N\.O\./i.test(String(t))),
      types.slice(0, 6).join(' | ') || 'aucune ligne sur la periode');

    // ---------------------------------------------------------------- point 11
    const controle = await p.evaluate(async () => {
      await new Promise((r, j) => Ext.require('testextjs.view.commandemanagement.etats.EtatControleManager', r, j));
      const classe = Ext.ClassManager.get('testextjs.view.commandemanagement.etats.EtatControleManager');
      const plugins = classe.prototype.plugins || [];
      return {
        sansExpander: !plugins.some(pl => pl && (pl.ptype === 'rowexpander'
          || String(pl.$className || '').indexOf('RowExpander') >= 0))
      };
    });
    ok('Point 11 : le (+) a disparu de l\'etat de controle des achats', controle.sansExpander);

    // ---------------------------------------------------------------- point 13
    const modales = await p.evaluate(async () => {
      const noms = ['testextjs.view.sm_user.role.action.add',
        'testextjs.view.sm_user.role.action.addPrivilegeBis'];
      const out = {};
      for (const n of noms) {
        await new Promise((r, j) => Ext.require(n, r, j));
        out[n] = Ext.ClassManager.get(n).prototype.modal === true;
      }
      return out;
    });
    ok('Point 13 : la fenetre de modification du profil est modale',
      modales['testextjs.view.sm_user.role.action.add'] === true);
    ok('Point 13 : la fenetre d\'attribution des privileges est modale',
      modales['testextjs.view.sm_user.role.action.addPrivilegeBis'] === true);

    // ---------------------------------------------------------------- point 15
    const pdf = await lire('../api/v1/ca-zone-geo/pdf?typePeriode=TROIS_MOIS&regroupement=ZONE');
    ok('Point 15 : l\'edition du CA par emplacement aboutit',
      pdf.success === true && !!pdf.url, JSON.stringify(pdf).slice(0, 200));
    if (pdf.url) {
      const chemin = '/opt/CONF/reports/pdf/' + pdf.url.split('/').pop();
      ok('Point 15 : le PDF est REELLEMENT ecrit sur le disque, plus de 404',
        fs.existsSync(chemin) && fs.statSync(chemin).size > 500,
        chemin + ' ' + (fs.existsSync(chemin) ? fs.statSync(chemin).size + ' octets' : 'absent'));
    }

    // L'analyse doit voir les ventes semees, sinon la suite se verifierait a vide.
    const analyse = await lire('../api/v1/ca-zone-geo?typePeriode=TROIS_MOIS&regroupement=ZONE');
    const lignes = analyse.data || [];
    ok('Point 15 : l\'analyse du CA voit les ventes du jeu d\'essai', lignes.length > 0,
      lignes.length + ' ligne(s)');

    const ligne = lignes[0] || {};
    const avantInv = parseInt(q("SELECT COUNT(*) FROM t_inventaire"), 10);
    const inv = await p.evaluate(async (l) => {
      const r = await fetch('../api/v1/ca-zone-geo/detail/inventaire?typePeriode=TROIS_MOIS'
        + '&regroupement=ZONE&libelle=E2ELOTA&ligneZoneId=' + encodeURIComponent(l.zoneId || '')
        + '&ligneFamilleId=' + encodeURIComponent(l.familleId || ''),
        { method: 'POST', credentials: 'same-origin' });
      return await r.json();
    }, ligne);
    const apresInv = parseInt(q("SELECT COUNT(*) FROM t_inventaire"), 10);

    ok('Point 15 : la reponse porte « success » et « msg »',
      Object.prototype.hasOwnProperty.call(inv, 'success')
      && Object.prototype.hasOwnProperty.call(inv, 'msg'), JSON.stringify(inv).slice(0, 200));
    ok('Point 15 : l\'inventaire a bien ete cree', apresInv > avantInv,
      'inventaires ' + avantInv + ' -> ' + apresInv);
    // LE defaut signale : l'inventaire etait cree, et l'ecran annoncait « La creation a echoue ».
    ok('Point 15 : et il est annonce en SUCCES, non plus en echec',
      inv.success === true, JSON.stringify(inv).slice(0, 200));
    ok('Point 15 : le message rend compte du nombre de produits',
      /produit/i.test(String(inv.msg || '')), inv.msg);

    ok('Aucune erreur JavaScript', err.length === 0, err.slice(0, 3).join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    purger();
    ok('Jeu d\'essai entierement retire',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2ELA-%'") === '0'
      && q("SELECT COUNT(*) FROM t_inventaire WHERE str_NAME LIKE '%E2ELOTA%'") === '0');
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
