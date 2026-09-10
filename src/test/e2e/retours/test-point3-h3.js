/* Retours du 08/09 - point 3, lot H3 : vendeurs, produits commandes non vendus, inventaire et suggestion.
 *
 *  - onglet Vendeurs : les meilleurs vendeurs de la garde, ou de toutes les gardes cochees ;
 *  - onglet Commandes non vendus : les produits commandes PENDANT la garde et non vendus pendant la
 *    garde, avec la proportion ;
 *  - suivi de l'activite sur l'historique des gardes cochees (heures tenues additionnees) ;
 *  - courbe d'evolution des gardes comparees ;
 *  - depuis la classification ABC : creer un inventaire des produits coches, envoyer en suggestion de
 *    commande avec la quantite vendue pendant la garde.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-H3';
const DEBUT_TEST = q('SELECT NOW()');

let PRODUITS = [], KGA3 = '', AUTRE = '', GROSSISTE = '';

/* Garde « nuit » du 5 au 6 (20 h - 8 h) :
     V1 20h30 P0 x2 = 1 000 (KGA3), V2 21h00 P1 x1 = 4 000 (autre vendeur), V3 22h00 P0 x3 = 1 500 (KGA3)
     commande a 23h00 : P0 x5 (vendu pendant la garde), P2 x4 (NON vendu) ; commande de jour le 6 : P1 x9 (hors garde)
   Garde « nuit 2 » du 12 au 13 : V4 21h00 P1 x1 = 2 000 (autre vendeur). */
const VENTES = [
  { id: MARQUE + '-1', quand: '2026-09-05 20:30:00', prod: 0, qte: 2, montant: 1000, vendeur: 'KGA3' },
  { id: MARQUE + '-2', quand: '2026-09-05 21:00:00', prod: 1, qte: 1, montant: 4000, vendeur: 'AUTRE' },
  { id: MARQUE + '-3', quand: '2026-09-05 22:00:00', prod: 0, qte: 3, montant: 1500, vendeur: 'KGA3' },
  { id: MARQUE + '-4', quand: '2026-09-12 21:00:00', prod: 1, qte: 1, montant: 2000, vendeur: 'AUTRE' }
];
const COMMANDES = [
  { id: 'E2EH3-ORD-1', quand: '2026-09-05 23:00:00', lignes: [[0, 5], [2, 4]] },
  { id: 'E2EH3-ORD-2', quand: '2026-09-06 12:00:00', lignes: [[1, 9]] }
];

function purger() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_order_detail WHERE lg_ORDER_ID LIKE 'E2EH3-%'");
  exec("DELETE FROM t_order WHERE lg_ORDER_ID LIKE 'E2EH3-%'");
  exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN (SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE GARDE " + MARQUE + "%')");
  exec("DELETE FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE GARDE " + MARQUE + "%'");
  if (PRODUITS.length) {
    const ids = PRODUITS.map(p => "'" + p + "'").join(',');
    exec("DELETE FROM t_suggestion_order_details WHERE lg_FAMILLE_ID IN (" + ids + ") AND dt_CREATED >= '" + DEBUT_TEST + "'");
    exec("DELETE FROM t_suggestion_order WHERE dt_CREATED >= '" + DEBUT_TEST + "' AND lg_SUGGESTION_ORDER_ID NOT IN (SELECT DISTINCT lg_SUGGESTION_ORDER_ID FROM t_suggestion_order_details)");
    exec("DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_ID IN (" + ids + ") AND dt_CREATED >= '" + DEBUT_TEST + "'");
  }
  exec("DELETE FROM garde WHERE libelle LIKE '" + MARQUE + " %'");
}

function semer() {
  KGA3 = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  AUTRE = q("SELECT lg_USER_ID FROM t_user WHERE str_STATUT='enable' AND str_LOGIN<>'KGA3' ORDER BY str_LOGIN DESC LIMIT 1");
  GROSSISTE = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT='enable' LIMIT 1");
  q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT='enable' AND f.lg_GROSSISTE_ID IS NOT NULL"
    + " AND f.bool_DECONDITIONNE=0 AND EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.str_STATUT='enable')"
    + " ORDER BY f.str_NAME LIMIT 3").split('\n').filter(Boolean).forEach(id => PRODUITS.push(id.trim()));
  purger();
  if (!KGA3 || !AUTRE || !GROSSISTE || PRODUITS.length !== 3) { return false; }
  VENTES.forEach(v => {
    const vendeur = v.vendeur === 'KGA3' ? KGA3 : AUTRE;
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
      + " int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
      + " lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER,"
      + " int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
      + " montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + v.id + "','" + v.id + "','0'," + v.montant + ",0,'is_Closed','" + v.quand + "','"
      + v.quand + "',1,'" + vendeur + "','" + KGA3 + "','" + KGA3 + "',0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
      + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
      + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
      + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + v.id + "-D','" + v.id + "','" + PRODUITS[v.prod] + "'," + v.qte + ",0,0,0,"
      + v.montant + "," + Math.round(v.montant / v.qte) + ",0,'" + v.quand + "','" + v.quand
      + "',0,0,0,0,0,0,1,0,0," + Math.round(v.montant / v.qte / 2) + ",0,0)");
  });
  COMMANDES.forEach(c => {
    exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
      + " VALUES ('" + c.id + "','" + c.id + "'," + c.lignes.length + ",'" + GROSSISTE + "','" + KGA3 + "','is_Process','" + c.quand + "','" + c.quand + "',0,0,0)");
    c.lignes.forEach((l, i) => {
      exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, str_STATUT, dt_CREATED, dt_UPDATED)"
        + " VALUES ('" + c.id + "-" + i + "','" + c.id + "','" + PRODUITS[l[0]] + "','" + GROSSISTE + "'," + l[1] + ",0,'is_Process','" + c.quand + "','" + c.quand + "')");
    });
  });
  return true;
}

(async () => {
  if (!semer()) { console.log('FATAL : jeu d\'essai incomplet'); purger(); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1800, height: 1000 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2500);

  const poster = (params) => p.evaluate(async (params) => {
    const corps = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    const r = await fetch('../api/v1/gardes', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps
    });
    return await r.json();
  }, params);
  const attendreStore = (expr) => p.waitForFunction((expr) => {
    const s = eval(expr); return s && !s.isLoading();
  }, expr, { timeout: 20000 });
  const cliquerComposant = async (selecteur) => {
    const id = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), selecteur);
    await p.click('#' + id);
  };
  const ouvrirOnglet = async (itemId) => {
    const id = await p.evaluate((i) => Ext.ComponentQuery.query('gardemanager #' + i)[0].tab.getId(), itemId);
    await p.click('#' + id);
    await p.waitForTimeout(900);
  };
  const cocherGardes = async (libelles) => {
    const cases = await p.evaluate((libelles) => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0];
      g.getSelectionModel().deselectAll();
      // Retours des tests 3 : l'onglet Analyse n'accepte qu'une garde cochee ; pour en cocher plusieurs,
      // on se place d'abord sur l'onglet Comparaison (les autres onglets cumulent).
      const onglets = Ext.ComponentQuery.query('gardemanager #ongletsGarde')[0];
      if (onglets.getActiveTab() && onglets.getActiveTab().itemId === 'ongletAnalyseGarde') {
        onglets.setActiveTab(Ext.ComponentQuery.query('gardemanager #ongletComparaison')[0]);
      }
      return libelles.map(l => {
        const n = g.getView().getNode(g.getStore().findExact('libelle', l)).querySelector('.x-grid-row-checker');
        n.scrollIntoView();
        const r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    }, libelles);
    for (const c of cases) { await p.mouse.click(c.x, c.y); }
    await p.waitForTimeout(500);
  };
  const cliquerGarde = async (libelle) => {
    const ligne = await p.evaluate((libelle) => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0];
      g.getSelectionModel().deselectAll();
      const cellule = g.getView().getNode(g.getStore().findExact('libelle', libelle))
        .querySelector('.x-grid-cell:not(.x-grid-cell-row-checker) .x-grid-cell-inner');
      const r = cellule.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, libelle);
    await p.mouse.click(ligne.x, ligne.y);
    await p.waitForFunction(() => !/Analyse en cours/.test(Ext.ComponentQuery.query('gardemanager #gardeIndicateurs')[0].el.dom.innerHTML)
      && Ext.ComponentQuery.query('gardemanager')[0].abcStore.getCount() > 0, null, { timeout: 20000 });
    await p.waitForTimeout(400);
  };
  const messageVisible = async () => {
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && !/patienter/i.test(Ext.MessageBox.msg.el.dom.innerText), null, { timeout: 20000 });
    return p.evaluate(() => ({ texte: Ext.MessageBox.msg.el.dom.innerText, ok: Ext.MessageBox.msgButtons.ok.getId(), oui: Ext.MessageBox.msgButtons.yes.getId() }));
  };

  try {
    const g1 = await poster({ libelle: MARQUE + ' nuit', dateDebut: '2026-09-05 20:00', dateFin: '2026-09-06 08:00' });
    const g2 = await poster({ libelle: MARQUE + ' nuit 2', dateDebut: '2026-09-12 20:00', dateFin: '2026-09-13 08:00' });
    ok('Deux gardes de jeu d\'essai', g1.success && g2.success, JSON.stringify([g1.msg, g2.msg]));

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('gardemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager').length > 0, null, { timeout: 20000 });
    await attendreStore("Ext.ComponentQuery.query('gardemanager')[0].gardeStore");
    await p.waitForTimeout(800);
    const titres = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #ongletsGarde')[0].items.getRange().map(o => o.title.replace(/&eacute;/g, 'é')));
    ok('Cinq onglets : analyse, activite, vendeurs, commandes non vendus, comparaison',
      titres.length === 5 && titres[2] === 'Vendeurs' && /Command/.test(titres[3]) && titres[4] === 'Comparaison', titres.join(' | '));

    // ---------------------------------------------------------------- vendeurs
    await cliquerGarde(MARQUE + ' nuit');
    await ouvrirOnglet('ongletVendeurs');
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager')[0].vendeurStore.getCount() > 0, null, { timeout: 20000 });
    const vendeurs = await p.evaluate(() => ({
      lignes: Ext.ComponentQuery.query('gardemanager')[0].vendeurStore.getRange().map(l => l.getData()),
      source: Ext.ComponentQuery.query('gardemanager #vendeursSource')[0].el.dom.innerText
    }));
    ok('Deux vendeurs sur la garde', vendeurs.lignes.length === 2, JSON.stringify(vendeurs.lignes.map(l => l.nom)));
    ok('Le meilleur vendeur est en tete : 1 vente, 4 000', vendeurs.lignes[0].montant === 4000 && vendeurs.lignes[0].ventes === 1,
      JSON.stringify(vendeurs.lignes[0]));
    ok('KGA3 suit avec 2 ventes, 2 clients, 2 500', vendeurs.lignes[1].montant === 2500 && vendeurs.lignes[1].ventes === 2
      && vendeurs.lignes[1].clients === 2 && /KONAN/.test(vendeurs.lignes[1].nom), JSON.stringify(vendeurs.lignes[1]));
    ok('La marge suit la formule de l\'ABC : 4 000 - 2 000 = 2 000, soit 50 %',
      vendeurs.lignes[0].marge === 2000 && Math.abs(vendeurs.lignes[0].tauxMarge - 50) < 0.01, JSON.stringify(vendeurs.lignes[0]));

    // Cliquer une garde la coche aussi : on decoche tout pour verifier le message.
    await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleGardes')[0].getSelectionModel().deselectAll());
    await p.waitForTimeout(300);
    await cliquerComposant('gardemanager #vendeursHistorique');
    await p.waitForTimeout(800);
    const sansCoche = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #vendeursSource')[0].el.dom.innerText);
    ok('Sans garde cochee, l\'historique le dit', /Cochez/.test(sansCoche), sansCoche);
    await cocherGardes([MARQUE + ' nuit', MARQUE + ' nuit 2']);
    await cliquerComposant('gardemanager #vendeursHistorique');
    await p.waitForTimeout(400);
    await cliquerComposant('gardemanager #vendeursHistorique');
    await p.waitForFunction(() => /2 garde\(s\) cumul/.test(Ext.ComponentQuery.query('gardemanager #vendeursSource')[0].el.dom.innerText)
      && Ext.ComponentQuery.query('gardemanager')[0].vendeurStore.getCount() === 2, null, { timeout: 20000 });
    const cumul = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager')[0].vendeurStore.getRange().map(l => l.getData()));
    ok('Sur les deux gardes cochees, le meilleur vendeur cumule 6 000 sur 2 ventes',
      cumul[0].montant === 6000 && cumul[0].ventes === 2, JSON.stringify(cumul[0]));

    // ---------------------------------------------------------------- commandes non vendues
    await cliquerGarde(MARQUE + ' nuit');
    await ouvrirOnglet('ongletCommandes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager')[0].commandeStore.getCount() > 0, null, { timeout: 20000 });
    const commandes = await p.evaluate(() => {
      const v = Ext.ComponentQuery.query('gardemanager')[0];
      const grille = v.down('#ongletCommandes');
      return {
        lignes: v.commandeStore.getRange().map(l => l.getData()),
        resume: v.down('#commandesResume').el.dom.innerText,
        classePremiere: grille.getView().getNode(0).className
      };
    });
    ok('Deux produits commandes pendant la garde ; la commande de jour est ignoree', commandes.lignes.length === 2,
      JSON.stringify(commandes.lignes.map(l => l.libelle)));
    ok('Le produit commande et non vendu est en tete, marque en rouge',
      commandes.lignes[0].nonVendu === true && commandes.lignes[0].quantiteCommandee === 4 && commandes.lignes[0].quantiteVendue === 0
      && /garde-non-vendu/.test(commandes.classePremiere), JSON.stringify(commandes.lignes[0]) + ' ' + commandes.classePremiere);
    ok('Le produit commande ET vendu montre ses 5 unites vendues',
      commandes.lignes[1].nonVendu === false && commandes.lignes[1].quantiteCommandee === 5 && commandes.lignes[1].quantiteVendue === 5,
      JSON.stringify(commandes.lignes[1]));
    ok('La proportion est annoncee : 1 sur 2, 50 % des produits, 44,44 % des quantites',
      /2/.test(commandes.resume) && /50[.,]00 %/.test(commandes.resume) && /44[.,]44 %/.test(commandes.resume), commandes.resume);

    // ---------------------------------------------------------------- activite sur l'historique
    await ouvrirOnglet('ongletActivite');
    await cocherGardes([MARQUE + ' nuit', MARQUE + ' nuit 2']);
    await cliquerComposant('gardemanager #activiteHistorique');
    await p.waitForFunction(() => /2 garde\(s\) cumul/.test(Ext.ComponentQuery.query('gardemanager #activiteSource')[0].el.dom.innerText), null, { timeout: 20000 });
    const historique = await p.evaluate(() => {
      const s = Ext.ComponentQuery.query('gardemanager')[0].trancheStore;
      return { heures: s.sum('heuresCouvertes'), clients: s.sum('clients'),
        t20: (s.findRecord('libelle', '20h - 22h') || { getData: () => null }).getData() };
    });
    ok('L\'historique de deux nuits tient 24 heures et cumule les clients des deux gardes',
      historique.heures === 24 && historique.clients === 4, JSON.stringify(historique));
    ok('20h - 22h : 3 clients sur 4 heures tenues', historique.t20 && historique.t20.clients === 3 && historique.t20.heuresCouvertes === 4,
      JSON.stringify(historique.t20));
    await cliquerComposant('gardemanager #activiteHistorique');
    await p.waitForTimeout(1200);
    const retour = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager')[0].trancheStore.sum('heuresCouvertes'));
    ok('Bouton relache : retour a la garde choisie (12 heures)', retour === 12, retour);

    // ---------------------------------------------------------------- courbe de comparaison
    await ouvrirOnglet('ongletComparaison');
    await cliquerComposant('gardemanager #comparerSelection');
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager')[0].comparaisonStore.getCount() === 2, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const courbe = await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('gardemanager #courbeComparaison')[0];
      return { visible: c.isVisible(true) && c.getHeight() > 100, traces: c.el.query('svg path').length,
        grille: !!Ext.ComponentQuery.query('gardemanager #grilleComparaison')[0].getView().getNode(1) };
    });
    ok('La comparaison porte une courbe d\'evolution au-dessus des valeurs', courbe.visible && courbe.traces > 2 && courbe.grille,
      JSON.stringify(courbe));

    // ---------------------------------------------------------------- inventaire des produits coches
    await ouvrirOnglet('ongletAnalyseGarde');
    // Retours des tests 3 : deux gardes etaient cochees, l'onglet Analyse previent et n'en garde qu'une.
    await p.waitForTimeout(800);
    await p.evaluate(() => { if (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
    await p.waitForFunction(() => !/Analyse en cours/.test(Ext.ComponentQuery.query('gardemanager #gardeIndicateurs')[0].el.dom.innerHTML), null, { timeout: 20000 });
    await cliquerGarde(MARQUE + ' nuit');
    const caseP0 = await p.evaluate((produit) => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleAbc')[0];
      const i = g.getStore().findExact('produitId', produit);
      const n = g.getView().getNode(i).querySelector('.x-grid-row-checker');
      const r = n.getBoundingClientRect();
      return { i: i, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, PRODUITS[0]);
    await p.mouse.click(caseP0.x, caseP0.y);
    await p.waitForTimeout(400);
    const coches = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #abcCoches')[0].el.dom.innerText);
    ok('Un produit coche dans l\'ABC, et l\'ecran le compte', /1/.test(coches), coches);
    await cliquerComposant('gardemanager #gardeInventaire');
    let m = await messageVisible();
    ok('La confirmation d\'inventaire vise le produit coche', /1 produit\(s\) coch/.test(m.texte), m.texte);
    await p.click('#' + m.oui);
    m = await messageVisible();
    ok('L\'inventaire est cree avec 1 produit', /cr.{1,2}.? avec 1 produit/i.test(m.texte), m.texte);
    await p.click('#' + m.ok);
    await p.waitForTimeout(400);
    const inventaire = q("SELECT i.str_NAME, COUNT(f.lg_INVENTAIRE_FAMILLE_ID), MAX(f.lg_FAMILLE_ID) FROM t_inventaire i"
      + " LEFT JOIN t_inventaire_famille f ON f.lg_INVENTAIRE_ID=i.lg_INVENTAIRE_ID WHERE i.str_NAME LIKE 'INVENTAIRE GARDE " + MARQUE + "%' GROUP BY i.lg_INVENTAIRE_ID");
    ok('En base : un inventaire nomme d\'apres la garde, avec la seule ligne du produit coche',
      inventaire.split('\t')[0] === 'INVENTAIRE GARDE ' + MARQUE + ' nuit' && inventaire.split('\t')[1] === '1' && inventaire.split('\t')[2] === PRODUITS[0],
      inventaire);

    // ---------------------------------------------------------------- suggestion de tous les produits vendus
    await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleAbc')[0].getSelectionModel().deselectAll());
    await p.waitForTimeout(300);
    await cliquerComposant('gardemanager #gardeSuggestion');
    m = await messageVisible();
    ok('Sans coche, la suggestion vise tous les produits affiches', /les 2 produit\(s\) affich/.test(m.texte), m.texte);
    await p.click('#' + m.oui);
    m = await messageVisible();
    ok('Deux produits partent en suggestion', /2 produit\(s\) envoy/.test(m.texte), m.texte);
    await p.click('#' + m.ok);
    const suggestion = q("SELECT d.lg_FAMILLE_ID, d.int_NUMBER, o.str_STATUT FROM t_suggestion_order_details d JOIN t_suggestion_order o ON o.lg_SUGGESTION_ORDER_ID=d.lg_SUGGESTION_ORDER_ID"
      + " WHERE d.lg_FAMILLE_ID IN ('" + PRODUITS[0] + "','" + PRODUITS[1] + "') AND d.dt_CREATED >= '" + DEBUT_TEST + "' ORDER BY d.int_NUMBER DESC");
    const lignesSugg = suggestion.split('\n').filter(Boolean).map(l => l.split('\t'));
    ok('En base : P0 avec 5 unites (2 + 3 vendues) et P1 avec 1, sur des suggestions en cours',
      lignesSugg.length === 2 && lignesSugg[0][0] === PRODUITS[0] && lignesSugg[0][1] === '5' && lignesSugg[1][1] === '1'
      && lignesSugg.every(l => l[2] === 'is_Process'), suggestion);

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    purger();
    ok('Jeu d\'essai entierement retire',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'") === '0'
      && q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID LIKE 'E2EH3-%'") === '0'
      && q("SELECT COUNT(*) FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE GARDE " + MARQUE + "%'") === '0'
      && q("SELECT COUNT(*) FROM t_suggestion_order_details WHERE dt_CREATED >= '" + DEBUT_TEST + "' AND lg_FAMILLE_ID IN ('" + PRODUITS.join("','") + "')") === '0'
      && q("SELECT COUNT(*) FROM garde WHERE libelle LIKE '" + MARQUE + " %'") === '0');
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
