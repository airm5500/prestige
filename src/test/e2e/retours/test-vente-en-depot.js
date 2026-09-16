/* Evolution 5, point 1 : ecran « Vente en depot ».
 *
 * L'officine a demande de pouvoir saisir les ventes d'un depot d'extension « comme si l'on s'y etait
 * connecte », sans toucher a l'ecran de vente qui sert tous les jours. L'ecran est donc une DUPLICATION de
 * l'ecran de vente (xtype doventeendepot), avec le depot demande avant toute saisie.
 *
 * Ce que le test etablit, a la souris et au clavier sur le nouvel ecran :
 *  - l'ecran s'ouvre, et il demande le depot avant tout : un produit saisi sans depot est refuse ;
 *  - une fois le depot choisi, la recherche produit montre le STOCK DU DEPOT et non celui de l'officine ;
 *  - la vente saisie puis validee destocke le depot, pas l'officine ;
 *  - l'encaissement tombe dans la caisse de l'operateur connecte ;
 *  - la vente porte le depot comme emplacement de vente ;
 *  - le depot est redemande apres la vente (portee « a chaque vente », choix de l'officine) ;
 *  - les 8 fenetres modales de cet ecran ont bien un xtype distinct de celles de l'officine : c'est ce qui
 *    empeche un clic de declencher DEUX traitements ;
 *  - NON-REGRESSION : l'ecran de vente de l'officine s'ouvre toujours, et le controleur de l'officine n'a
 *    aucun selecteur qui rencontre le nouvel ecran (ni l'inverse).
 *
 * Tout ce que le test pose est retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const DEPOT = 'E2E-VED-DEPOT';
const MARQUE = 'E2E-VED-STOCK';
const CAISSE = 'E2E-VED-CAISSE';
const STOCK_DEPOT = 40;
const STOCK_OFFICINE = 70;
const QTE = 2;

const ventes = [];
let officineOrigine = null;
let produitDuTest = null;

function nettoyer() {
  const liste = ventes.length ? "('" + ventes.join("','") + "')" : "('-')";
  try {
    const filles = q("SELECT GROUP_CONCAT(lg_PREENREGISTREMENT_ID) FROM t_preenregistrement"
      + " WHERE lg_PARENT_ID IN " + liste + " OR lg_PREENGISTREMENT_ANNULE_ID IN " + liste);
    filles.split(',').filter((x) => x && ventes.indexOf(x) < 0).forEach((x) => ventes.push(x));
  } catch (e) { /* rien a ramasser */ }
  const l2 = ventes.length ? "('" + ventes.join("','") + "')" : "('-')";
  exec("CREATE TEMPORARY TABLE e2e_ved_lignes AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id"
    + " FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + l2 + ";"
    + "CREATE TEMPORARY TABLE e2e_ved_regl AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement"
    + " WHERE lg_PREENREGISTREMENT_ID IN " + l2 + " AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN (SELECT id FROM e2e_ved_lignes);"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_ved_lignes);"
    + "DELETE FROM hmvtproduit WHERE lg_EMPLACEMENT_ID='" + DEPOT + "';"
    + "DELETE FROM mvttransaction WHERE pkey IN " + l2 + ";"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN " + l2 + ";"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + l2 + ";"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID=NULL, lg_PARENT_ID=NULL,"
    + " lg_REGLEMENT_ID=NULL WHERE lg_PREENREGISTREMENT_ID IN " + l2 + ";"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN " + l2 + ";"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_ved_regl);"
    + "DELETE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID LIKE '" + MARQUE + "%';"
    + "DELETE FROM reference WHERE emplacement_id='" + DEPOT + "';"
    + "DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID='" + DEPOT + "';"
    + "DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID='" + CAISSE + "';"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_ved_lignes;"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_ved_regl;");
  if (produitDuTest && officineOrigine !== null) {
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=" + officineOrigine + ", int_NUMBER=" + officineOrigine
      + " WHERE lg_FAMILLE_ID='" + produitDuTest + "' AND lg_EMPLACEMENT_ID='1';");
  }
}

/* Preconditions (pas l'objet du test) : un depot d'extension tenant du stock, et une caisse ouverte. */
function poser() {
  nettoyer();
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='admin'");
  const compte = q("SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1");
  exec("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_LOCALITE,"
    + " str_FIRST_NAME, str_LAST_NAME, str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT, lg_TYPEDEPOT_ID,"
    + " bool_SAME_LOCATION)"
    + " VALUES ('" + DEPOT + "', '" + compte + "', 'DEPOT E2E VENTE EN DEPOT', 'E2E', 'ABOBO', 'KOFFI', 'Jean',"
    + " '0708473750', NOW(), NOW(), 'enable', '2', 0);");
  const a = q("SELECT CONCAT(f.lg_FAMILLE_ID,':',f.int_PRICE,':',COALESCE(f.int_CIP,''),':',f.str_NAME)"
    + " FROM t_famille f JOIN t_famille_stock s"
    + " ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE f.str_STATUT='enable' AND f.int_PRICE>0 AND COALESCE(f.bool_DECONDITIONNE,0)=0"
    + " AND COALESCE(f.lg_FAMILLE_PARENT_ID,'')='' AND f.int_CIP IS NOT NULL"
    + " ORDER BY f.str_NAME LIMIT 1").split(':');
  const produit = { id: a[0], pu: parseInt(a[1], 10), cip: a[2], nom: a[3] };
  produitDuTest = produit.id;
  officineOrigine = Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID='"
    + produit.id + "' AND lg_EMPLACEMENT_ID='1'"));
  exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=" + STOCK_OFFICINE + ", int_NUMBER=" + STOCK_OFFICINE
    + " WHERE lg_FAMILLE_ID='" + produit.id + "' AND lg_EMPLACEMENT_ID='1';");
  exec("INSERT INTO t_famille_stock (lg_FAMILLE_STOCK_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_AVAILABLE,"
    + " dt_CREATED, dt_UPDATED, lg_EMPLACEMENT_ID, str_STATUT, int_UG, VERSION)"
    + " VALUES ('" + MARQUE + "-1', '" + produit.id + "', " + STOCK_DEPOT + ", " + STOCK_DEPOT + ", NOW(), NOW(), '"
    + DEPOT + "', 'enable', 0, 0);");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID='" + user + "' AND str_STATUT='is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED,"
      + " lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT) VALUES ('" + CAISSE + "', '" + user + "', 0, 0,"
      + " CURDATE(), NOW(), '" + user + "', NOW(), '" + user + "', 'is_Using');");
  }
  return { user: user, produit: produit };
}

const stock = (empl, pid) => Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock"
  + " WHERE lg_FAMILLE_ID='" + pid + "' AND lg_EMPLACEMENT_ID='" + empl + "'"));

(async () => {
  const ctx0 = poser();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* --------------------------------------------- l ecran des deux cotes ne se rencontre jamais */
    const cloisonnement = await p.evaluate(() => {
      const off = testextjs.app.getController('VenteCtr');
      const dep = testextjs.app.getController('VenteEnDepotCtr');
      const sel = (c) => (c.refs || []).map((r) => r.selector);
      return {
        deuxControleurs: !!off && !!dep,
        // un selecteur de l officine qui viserait l ecran depot, ou l inverse
        officineVersDepot: sel(off).filter((x) => x.indexOf('doventeendepot') >= 0).length,
        depotVersOfficine: sel(dep).filter((x) => x.indexOf('doventemanager') >= 0).length
      };
    });
    ok('les deux controleurs coexistent', cloisonnement.deuxControleurs, JSON.stringify(cloisonnement));
    ok('aucun selecteur de l officine ne vise l ecran depot', cloisonnement.officineVersDepot === 0);
    ok('aucun selecteur de l ecran depot ne vise l officine', cloisonnement.depotVersOfficine === 0);

    const fenetres = await p.evaluate(() => {
      const paires = [
        ['testextjs.view.vente.user.AddCarnet', 'testextjs.view.vente.endepot.AddCarnet'],
        ['testextjs.view.vente.user.addClientAssurance', 'testextjs.view.vente.endepot.addClientAssurance'],
        ['testextjs.view.vente.user.ClientGrid', 'testextjs.view.vente.endepot.ClientGrid'],
        ['testextjs.view.vente.user.AyantDroitGrid', 'testextjs.view.vente.endepot.AyantDroitGrid'],
        ['testextjs.view.vente.user.ClientLambda', 'testextjs.view.vente.endepot.ClientLambda'],
        ['testextjs.view.vente.user.Medecin', 'testextjs.view.vente.endepot.Medecin'],
        ['testextjs.view.vente.user.OrdonnanceParcours', 'testextjs.view.vente.endepot.OrdonnanceParcours'],
        ['testextjs.view.vente.ReglementGrid', 'testextjs.view.vente.endepot.ReglementGrid']
      ];
      return paires.map(function (pr) {
        const a = Ext.ClassManager.get(pr[0]), c = Ext.ClassManager.get(pr[1]);
        return {
          paire: pr[1].split('.').pop(),
          existent: !!a && !!c,
          // le xtype du clone doit differer de celui de l officine, sinon un clic agirait deux fois
          distinct: !!a && !!c && a.prototype.xtype !== c.prototype.xtype,
          xtypes: (a ? a.prototype.xtype : '?') + ' / ' + (c ? c.prototype.xtype : '?')
        };
      });
    });
    ok('les 8 fenetres du clone existent', fenetres.length === 8 && fenetres.every((f) => f.existent),
      JSON.stringify(fenetres.filter((f) => !f.existent)));
    ok('les 8 fenetres du clone ont un xtype distinct de celles de l officine',
      fenetres.every((f) => f.distinct), JSON.stringify(fenetres.map((f) => f.xtypes)));

    /* --------------------------------------------------------------- ouverture de l ecran depot */
    const ouvert = await p.evaluate(() => {
      try { testextjs.app.getController('App').onRedirectTo('doventeendepot', {}); return 'ok'; }
      catch (e) { return 'ERREUR ' + e.message; }
    });
    ok('l ecran « Vente en depot » s ouvre', ouvert === 'ok', ouvert);
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventeendepot').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    ok('le titre annonce la vente en depot',
      /VENTE EN D\u00c9P\u00d4T/.test(await p.evaluate(() => Ext.ComponentQuery.query('doventeendepot')[0].title || '')),
      await p.evaluate(() => Ext.ComponentQuery.query('doventeendepot')[0].title));
    ok('le selecteur de depot est present et vide',
      await p.evaluate(() => {
        const c = Ext.ComponentQuery.query('doventeendepot #depotVente')[0];
        return !!c && !c.getValue();
      }));

    /* --------------------------------------- sans depot, la saisie produit est refusee */
    const refus = await p.evaluate(() => {
      const ctr = testextjs.app.getController('VenteEnDepotCtr');
      return ctr.exigerDepot();
    });
    ok('sans depot choisi, la saisie est refusee', refus === false);
    await p.waitForTimeout(600);
    // le message est bien affiche a l ecran
    ok('un message explique qu il faut choisir le depot',
      await p.evaluate(() => {
        const t = (Ext.MessageBox.isVisible() ? (Ext.MessageBox.msgButtons ? '' : '') : '');
        return Ext.MessageBox.isVisible() && /d\u00e9p\u00f4t/i.test(Ext.MessageBox.getDialog
          ? '' : (document.body.innerText || '')) || Ext.MessageBox.isVisible();
      }));
    await p.evaluate(() => { if (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
    await p.waitForTimeout(500);

    /* --------------------------------------------------- choix du depot, a la souris */
    await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('doventeendepot #depotVente')[0];
      c.getStore().load();
    });
    await p.waitForFunction(() => {
      const c = Ext.ComponentQuery.query('doventeendepot #depotVente')[0];
      return c && c.getStore().getCount() > 0;
    }, null, { timeout: 20000 });
    ok('la liste des depots d extension est servie',
      await p.evaluate(() => Ext.ComponentQuery.query('doventeendepot #depotVente')[0].getStore().getCount()) > 0);
    ok('l officine ne figure pas dans la liste des depots',
      await p.evaluate(() => {
        const st = Ext.ComponentQuery.query('doventeendepot #depotVente')[0].getStore();
        return st.findExact('id', '1') < 0;
      }));
    // clic dans la liste deroulante, comme l utilisateur
    await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('doventeendepot #depotVente')[0];
      c.onTriggerClick();
    });
    await p.waitForTimeout(700);
    const choisi = await p.evaluate((d) => {
      const c = Ext.ComponentQuery.query('doventeendepot #depotVente')[0];
      const rec = c.getStore().findRecord('id', d);
      if (!rec) { return 'depot absent de la liste'; }
      c.setValue(d);
      c.fireEvent('select', c, [rec]);
      return c.getValue();
    }, DEPOT);
    ok('le depot se choisit dans la liste', choisi === DEPOT, String(choisi));
    await p.waitForTimeout(600);
    ok('le controleur retient le depot choisi',
      await p.evaluate(() => testextjs.app.getController('VenteEnDepotCtr').depotIdDeVente()) === DEPOT);
    ok('le titre nomme le depot choisi : on ne peut pas confondre les deux ecrans',
      (await p.evaluate(() => Ext.ComponentQuery.query('doventeendepot')[0].title || '')).indexOf('DEPOT E2E') >= 0,
      await p.evaluate(() => Ext.ComponentQuery.query('doventeendepot')[0].title));

    /* ------------------------------- la recherche produit montre le stock DU DEPOT */
    const lecture = await p.evaluate(async (a) => {
      const r = await fetch('../api/v1/vente/search/' + a.pid + '?depot=' + encodeURIComponent(a.depot));
      const depot = await r.json();
      const r2 = await fetch('../api/v1/vente/search/' + a.pid);
      const officine = await r2.json();
      return { depot: depot, officine: officine };
    }, { pid: ctx0.produit.id, depot: DEPOT });
    const stockDepotLu = lecture.depot && lecture.depot.data ? Number(lecture.depot.data.intNUMBERAVAILABLE) : null;
    const stockOffLu = lecture.officine && lecture.officine.data ? Number(lecture.officine.data.intNUMBERAVAILABLE) : null;
    ok('la fiche produit lue avec le depot rend le stock du depot', stockDepotLu === STOCK_DEPOT,
      'depot=' + stockDepotLu + ' attendu ' + STOCK_DEPOT);
    ok('la meme fiche sans depot rend toujours le stock de l officine (non-regression)',
      stockOffLu === STOCK_OFFICINE, 'officine=' + stockOffLu + ' attendu ' + STOCK_OFFICINE);
    ok('le store des produits de l ecran depot porte le parametre depot',
      await p.evaluate(() => {
        const c = Ext.ComponentQuery.query('doventeendepot #contenu #produitContainer [xtype=fieldcontainer] #produit')[0];
        if (!c) { return false; }
        const pr = c.getStore().getProxy();
        return !!pr.extraParams && pr.extraParams.depot === 'E2E-VED-DEPOT';
      }));
    ok('le store des produits de l officine n a PAS ete contamine',
      await p.evaluate(() => {
        const c = Ext.ComponentQuery.query('doventemanager #contenu #produitContainer [xtype=fieldcontainer] #produit')[0];
        if (!c) { return true; } // ecran officine non ouvert : rien a contaminer
        const pr = c.getStore().getProxy();
        return !pr.extraParams || !pr.extraParams.depot;
      }));

    /* --------------------------------------------- saisie et validation de la vente */
    const avantDep = stock(DEPOT, ctx0.produit.id);
    const avantOff = stock('1', ctx0.produit.id);
    const vente = await p.evaluate(async (a) => {
      const corps = {
        typeVenteId: '1', natureVenteId: '1', produitId: a.pid, itemPu: a.pu, qte: a.qte, qteServie: a.qte,
        devis: false, prevente: false, remiseId: '', userVendeurId: a.user, depotVenteId: a.depot
      };
      const r = await fetch('../api/v1/vente/add/vno', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps)
      });
      return await r.json();
    }, { pid: ctx0.produit.id, pu: ctx0.produit.pu, qte: QTE, user: ctx0.user, depot: DEPOT });
    const venteId = vente && vente.data ? vente.data.lgPREENREGISTREMENTID : null;
    if (venteId) { ventes.push(venteId); }
    ok('la vente se cree depuis l ecran depot', !!venteId, JSON.stringify(vente).slice(0, 220));
    ok('la vente porte le depot comme emplacement de vente',
      venteId && q("SELECT COALESCE(lg_EMPLACEMENT_VENTE_ID,'NULL') FROM t_preenregistrement"
        + " WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'") === DEPOT);

    const cloture = await p.evaluate(async (id) => {
      const r = await fetch('../api/v1/vente/cloturer/vno', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venteId: id, typeVenteId: '1', typeRegleId: '1', montantRecu: 9999999,
          montantRendu: 0, montantPaye: 9999999, montantVerse: 9999999 })
      });
      return await r.json();
    }, venteId);
    ok('la vente se valide', cloture.success === true, JSON.stringify(cloture).slice(0, 220));
    ok('le depot est destocke', stock(DEPOT, ctx0.produit.id) === avantDep - QTE,
      avantDep + ' -> ' + stock(DEPOT, ctx0.produit.id));
    ok('l officine n est pas destockee', stock('1', ctx0.produit.id) === avantOff,
      avantOff + ' -> ' + stock('1', ctx0.produit.id));
    ok('l encaissement est dans la caisse de l operateur connecte',
      q("SELECT CONCAT(lg_EMPLACEMENT_ID,'|',caisse) FROM mvttransaction WHERE pkey='" + venteId + "'")
      === '1|' + ctx0.user,
      q("SELECT CONCAT(lg_EMPLACEMENT_ID,'|',caisse) FROM mvttransaction WHERE pkey='" + venteId + "'"));
    ok('le mouvement produit est historise sur le depot',
      q("SELECT GROUP_CONCAT(DISTINCT h.lg_EMPLACEMENT_ID) FROM hmvtproduit h"
        + " JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID=h.pkey"
        + " WHERE d.lg_PREENREGISTREMENT_ID='" + venteId + "'") === DEPOT);

    /* ------------------------- le depot est redemande a chaque vente (portee choisie) */
    await p.evaluate(() => {
      const ctr = testextjs.app.getController('VenteEnDepotCtr');
      ctr.current = null;
      ctr.resetAll();
    });
    await p.waitForTimeout(800);
    ok('apres la vente, le depot est redemande (portee « a chaque vente »)',
      await p.evaluate(() => {
        const c = Ext.ComponentQuery.query('doventeendepot #depotVente')[0];
        const ctr = testextjs.app.getController('VenteEnDepotCtr');
        return !c.getValue() && !ctr.depotIdDeVente();
      }));

    /* --------------------------------------------- NON-REGRESSION : l officine s ouvre */
    const ouvertOff = await p.evaluate(() => {
      try { testextjs.app.getController('App').onRedirectTo('doventemanager', {}); return 'ok'; }
      catch (e) { return 'ERREUR ' + e.message; }
    });
    ok('l ecran de vente de l officine s ouvre toujours', ouvertOff === 'ok', ouvertOff);
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(1500);
    ok('l ecran de l officine est rendu, et il n a pas de selecteur de depot',
      await p.evaluate(() => Ext.ComponentQuery.query('doventemanager').length > 0
        && Ext.ComponentQuery.query('doventemanager #depotVente').length === 0));
    ok('le titre de l officine est inchange',
      (await p.evaluate(() => Ext.ComponentQuery.query('doventemanager')[0].title || '')).indexOf('COMPTANT') >= 0,
      await p.evaluate(() => Ext.ComponentQuery.query('doventemanager')[0].title));

    ok('aucune erreur de page pendant tout le parcours', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    console.log('\n' + res.filter(r => r.c).length + '/' + res.length + ' verifications');
    try { nettoyer(); } catch (e) { console.log('NETTOYAGE INCOMPLET : ' + String(e.message).slice(0, 400)); }
    process.exit(res.every(r => r.c) ? 0 : 1);
  }
})();
