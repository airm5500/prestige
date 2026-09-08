/* Retours du 08/09 - point 3, lot H2 : comparaison sur les indicateurs REELS, et suivi de l'activite.
 *
 *  - comparaison : nombre de ventes, de clients, chiffre, evolution, marge et taux, rates, clients a
 *    credit et montant, chiffre par mode (especes, mobile, cheque, CB) ;
 *  - onglet « Suivi de l'activite » separe : la courbe clients / chiffre par heure du jour, les heures
 *    reellement tenues, les clients par heure et l'effectif conseille selon la capacite saisie.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-H2';

let PRODUIT = '', USER = '', CLIENTS = [];

/* Garde A, nuit du 5 au 6 (20 h - 8 h) :
     V1 20h30 comptant 1 000, client C1, especes 1 000
     V2 20h45 assurance 5 000 dont 1 000 au client, client C2, especes 1 000  -> 4 000 a credit
     V3 21h00 comptant 2 000, anonyme, mobile (Orange) 1 500 + carte 500
     V4 21h30 comptant 800, anonyme, differe 800                              -> 800 a credit
     + 2 ventes ratees pendant la garde, 1 en journee (hors garde)
   Garde B, nuit du 12 au 13 :
     V5 22h00 comptant 3 000, client C1, especes ; V6 23h00 comptant 1 000, anonyme, cheque
   Evolution B / A sur le chiffre : (4 000 - 8 800) / 8 800 = -54,55 %. */
const VENTES = [
  { id: MARQUE + '-1', quand: '2026-09-05 20:30:00', type: 1, montant: 1000, part: 1000, client: 0, regl: [['1', 1000]] },
  { id: MARQUE + '-2', quand: '2026-09-05 20:45:00', type: 2, montant: 5000, part: 1000, client: 1, regl: [['1', 1000]] },
  { id: MARQUE + '-3', quand: '2026-09-05 21:00:00', type: 1, montant: 2000, part: 2000, client: null, regl: [['7', 1500], ['3', 500]] },
  { id: MARQUE + '-4', quand: '2026-09-05 21:30:00', type: 1, montant: 800, part: 800, client: null, regl: [['4', 800]] },
  { id: MARQUE + '-5', quand: '2026-09-12 22:00:00', type: 1, montant: 3000, part: 3000, client: 0, regl: [['1', 3000]] },
  { id: MARQUE + '-6', quand: '2026-09-12 23:00:00', type: 1, montant: 1000, part: 1000, client: null, regl: [['2', 1000]] }
];
const RATES = ['2026-09-05 21:10:00', '2026-09-06 02:00:00', '2026-09-06 11:00:00'];

function purger() {
  exec("DELETE FROM vente_reglement WHERE vente_id LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_vente_ratee WHERE lg_VENTE_RATEE_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM garde WHERE libelle LIKE '" + MARQUE + " %'");
}

function semer() {
  purger();
  USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  PRODUIT = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' ORDER BY str_NAME LIMIT 1");
  CLIENTS = q("SELECT lg_CLIENT_ID FROM t_client ORDER BY lg_CLIENT_ID LIMIT 2").split('\n').filter(Boolean);
  if (!USER || !PRODUIT || CLIENTS.length !== 2) { return false; }
  VENTES.forEach(v => {
    const client = v.client === null ? 'NULL' : "'" + CLIENTS[v.client] + "'";
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
      + " int_PRICE_REMISE, int_CUST_PART, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
      + " lg_USER_CAISSIER_ID, lg_USER_ID, lg_CLIENT_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER,"
      + " int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
      + " montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + v.id + "','" + v.id + "','0'," + v.montant + ",0," + v.part + ",'is_Closed','" + v.quand + "','"
      + v.quand + "'," + v.type + ",'" + USER + "','" + USER + "','" + USER + "'," + client + ",0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
      + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
      + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
      + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + v.id + "-D','" + v.id + "','" + PRODUIT + "',1,0,0,0," + v.montant + "," + v.montant
      + ",0,'" + v.quand + "','" + v.quand + "',0,0,0,0,0,0,1,0,0," + Math.round(v.montant / 2) + ",0,0)");
    v.regl.forEach((r, i) => {
      exec("INSERT INTO vente_reglement (id, flaged_amount, montant, montant_attentu, mvtDate, vente_id, type_regelement)"
        + " VALUES ('" + v.id + "-R" + i + "',0," + r[1] + "," + r[1] + ",'" + v.quand + "','" + v.id + "','" + r[0] + "')");
    });
  });
  RATES.forEach((quand, i) => {
    exec("INSERT INTO t_vente_ratee (lg_VENTE_RATEE_ID, str_DESIGNATION, str_DESIGNATION_NORM, int_QUANTITE,"
      + " bool_COMMANDE, dt_CREATED, lg_USER_ID, str_STATUT)"
      + " VALUES ('" + MARQUE + "-" + i + "','PRODUIT " + MARQUE + "','PRODUIT " + MARQUE + "',1,0,'" + quand + "','" + USER + "','enable')");
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
  const lire = (chemin) => p.evaluate(async (chemin) => {
    const r = await fetch('../api/v1/gardes' + chemin, { credentials: 'same-origin' });
    return await r.json();
  }, chemin);
  const attendreStore = (expr) => p.waitForFunction((expr) => {
    const s = eval(expr); return s && !s.isLoading();
  }, expr, { timeout: 20000 });
  const cliquerComposant = async (selecteur) => {
    const id = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), selecteur);
    await p.click('#' + id);
  };
  const cocher = async (libelles) => {
    const cases = await p.evaluate((libelles) => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0];
      g.getSelectionModel().deselectAll();
      return libelles.map(l => {
        const n = g.getView().getNode(g.getStore().findExact('libelle', l)).querySelector('.x-grid-row-checker');
        n.scrollIntoView();
        const r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    }, libelles);
    for (const c of cases) { await p.mouse.click(c.x, c.y); }
  };

  try {
    const gA = await poster({ libelle: MARQUE + ' nuit A', dateDebut: '2026-09-05 20:00', dateFin: '2026-09-06 08:00' });
    const gB = await poster({ libelle: MARQUE + ' nuit B', dateDebut: '2026-09-12 20:00', dateFin: '2026-09-13 08:00' });
    ok('Deux gardes de jeu d\'essai', gA.success && gB.success, JSON.stringify([gA.msg, gB.msg]));

    // ---------------------------------------------------------------- les indicateurs par l'API
    const kpiA = ((await lire('/' + gA.data.id + '/rapport')).kpi) || {};
    ok('Garde A : 4 ventes, 4 clients (C1, C2 et deux anonymes), 8 800 de chiffre',
      kpiA.ventes === 4 && kpiA.clients === 4 && kpiA.montant === 8800, JSON.stringify(kpiA));
    ok('Garde A : 2 ventes ratees pendant la garde, pas celle de la journee', kpiA.rates === 2, kpiA.rates);
    ok('Garde A : 2 clients a credit (assurance + differe), 4 800 de credit',
      kpiA.clientsCredit === 2 && kpiA.montantCredit === 4800, JSON.stringify(kpiA));
    ok('Garde A : especes 2 000, mobile 1 500, CB 500, cheque 0, differe 800',
      kpiA.caEspeces === 2000 && kpiA.caMobile === 1500 && kpiA.caCarte === 500 && kpiA.caCheque === 0 && kpiA.caDiffere === 800,
      JSON.stringify(kpiA));
    ok('Garde A : marge 4 400 soit 50 %', kpiA.marge === 4400 && Math.abs(kpiA.tauxMarge - 50) < 0.01, JSON.stringify(kpiA));

    // ---------------------------------------------------------------- l'ecran : cocher, comparer
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('gardemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager').length > 0, null, { timeout: 20000 });
    await attendreStore("Ext.ComponentQuery.query('gardemanager')[0].gardeStore");
    await p.waitForTimeout(800);
    const titres = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #ongletsGarde')[0].items.getRange().map(o => o.title));
    ok('L\'ecran a ses onglets : analyse, suivi de l\'activite, ..., comparaison',
      titres.length >= 3 && /activit/i.test(titres[1]) && /Comparaison/.test(titres[titres.length - 1]), titres.join(' | '));

    await cocher([MARQUE + ' nuit A', MARQUE + ' nuit B']);
    await p.waitForTimeout(600);
    // Le bouton « Comparer la selection » vit dans la barre de l'onglet Comparaison : on y va d'abord.
    const idOngletComparaison = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #ongletComparaison')[0].tab.getId());
    await p.click('#' + idOngletComparaison);
    await p.waitForTimeout(500);
    await cliquerComposant('gardemanager #comparerSelection');
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager')[0].comparaisonStore.getCount() === 2, null, { timeout: 20000 });
    await p.waitForTimeout(500);
    const comparaison = await p.evaluate(() => {
      const v = Ext.ComponentQuery.query('gardemanager')[0];
      const grille = v.down('#grilleComparaison');
      return {
        actif: v.down('#ongletsGarde').getActiveTab().itemId,
        entetes: grille.headerCt.getGridColumns().map(c => (c.text || '').replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è')),
        lignes: v.comparaisonStore.getRange().map(l => l.getData()),
        cellules: Array.from(grille.getView().getNode(1).querySelectorAll('.x-grid-cell-inner')).map(c => c.innerText.trim())
      };
    });
    ok('La comparaison s\'ouvre sur son onglet', comparaison.actif === 'ongletComparaison', comparaison.actif);
    const attendus = ['Ventes', 'Clients', 'Chiffre d\'affaires', 'Evolution %', 'Marge', 'Taux marge %', 'Ratés',
      'Clients crédit', 'Montant crédit', 'Espèces', 'Mobile', 'Chèque', 'CB'];
    ok('Les colonnes sont les indicateurs reels demandes',
      attendus.every(e => comparaison.entetes.includes(e)) && !comparaison.entetes.some(e => /Qt|Dur/.test(e)),
      comparaison.entetes.join(' | '));
    const lA = comparaison.lignes[0] || {}, lB = comparaison.lignes[1] || {};
    ok('De la plus ancienne a la plus recente : A puis B', /nuit A/.test(lA.libelle) && /nuit B/.test(lB.libelle),
      lA.libelle + ' | ' + lB.libelle);
    ok('La ligne A porte ses indicateurs', lA.ventes === 4 && lA.clients === 4 && lA.montant === 8800 && lA.rates === 2
      && lA.clientsCredit === 2 && lA.montantCredit === 4800 && lA.caEspeces === 2000 && lA.caMobile === 1500 && lA.caCarte === 500,
      JSON.stringify(lA));
    ok('La ligne B porte les siens : 2 ventes, 4 000, cheque 1 000',
      lB.ventes === 2 && lB.clients === 2 && lB.montant === 4000 && lB.caCheque === 1000 && lB.caEspeces === 3000, JSON.stringify(lB));
    ok('L\'evolution de B est -54,55 % du chiffre de A', Math.abs(lB.evolutionPourcentage + 54.55) < 0.01, lB.evolutionPourcentage);
    ok('La premiere ligne n\'a pas d\'evolution', lA.evolutionPourcentage === null || lA.evolutionPourcentage === undefined,
      String(lA.evolutionPourcentage));
    ok('L\'evolution est rendue en rouge, avec son signe', comparaison.cellules.some(c => /-54[.,]55 %/.test(c)),
      comparaison.cellules.join(' | '));

    // ---------------------------------------------------------------- suivi de l'activite : clic sur la garde A, puis l'onglet
    const ligne = await p.evaluate((libelle) => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0];
      g.getSelectionModel().deselectAll();
      const cellule = g.getView().getNode(g.getStore().findExact('libelle', libelle))
        .querySelector('.x-grid-cell:not(.x-grid-cell-row-checker) .x-grid-cell-inner');
      const r = cellule.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, MARQUE + ' nuit A');
    await p.mouse.click(ligne.x, ligne.y);
    await p.waitForFunction(() => !/Analyse en cours/.test(Ext.ComponentQuery.query('gardemanager #gardeIndicateurs')[0].el.dom.innerHTML)
      && Ext.ComponentQuery.query('gardemanager')[0].trancheStore.getCount() === 12, null, { timeout: 20000 });
    const idOnglet = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #ongletActivite')[0].tab.getId());
    await p.click('#' + idOnglet);
    await p.waitForTimeout(1200);
    const activite = await p.evaluate(() => {
      const v = Ext.ComponentQuery.query('gardemanager')[0];
      const courbe = v.down('#courbeActivite');
      const grille = v.down('#grilleTranches');
      const t20 = grille.getStore().findRecord('libelle', '20h - 22h');
      const i20 = grille.getStore().indexOf(t20);
      return {
        actif: v.down('#ongletsGarde').getActiveTab().itemId,
        courbeVisible: courbe.isVisible(true) && courbe.getHeight() > 150,
        traces: courbe.el.query('svg path').length,
        entetes: grille.headerCt.getGridColumns().map(c => (c.text || '').replace(/&eacute;/g, 'é')),
        heuresTenues: grille.getStore().sum('heuresCouvertes'),
        t20: t20 ? t20.getData() : null,
        cellules20: Array.from(grille.getView().getNode(i20).querySelectorAll('.x-grid-cell-inner')).map(c => c.innerText.trim())
      };
    });
    ok('L\'onglet « Suivi de l\'activite » est ouvert', activite.actif === 'ongletActivite', activite.actif);
    ok('La courbe est dessinee (SVG avec des traces)', activite.courbeVisible && activite.traces > 2,
      'visible=' + activite.courbeVisible + ' traces=' + activite.traces);
    ok('La grille porte heures tenues, clients / heure et effectif conseille',
      activite.entetes.some(e => /Heures tenues/.test(e)) && activite.entetes.some(e => /Clients \/ heure/.test(e))
      && activite.entetes.some(e => /Effectif/.test(e)), activite.entetes.join(' | '));
    ok('Une nuit de 12 h : douze heures tenues au total', activite.heuresTenues === 12, activite.heuresTenues);
    ok('20h - 22h : 4 clients sur 2 heures tenues, soit 2 par heure',
      activite.t20 && activite.t20.clients === 4 && activite.t20.heuresCouvertes === 2 && Math.abs(activite.t20.clientsParHeure - 2) < 0.01,
      JSON.stringify(activite.t20));
    ok('Avec 10 clients par heure et par personne, une personne suffit', activite.cellules20[activite.cellules20.length - 1] === '1',
      activite.cellules20.join(' | '));

    const idCapacite = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #capacitePersonne')[0].inputEl.id);
    await p.fill('#' + idCapacite, '1');
    await p.waitForTimeout(900);
    const effectif = await p.evaluate(() => {
      const grille = Ext.ComponentQuery.query('gardemanager #grilleTranches')[0];
      const i = grille.getStore().indexOf(grille.getStore().findRecord('libelle', '20h - 22h'));
      const cellules = Array.from(grille.getView().getNode(i).querySelectorAll('.x-grid-cell-inner')).map(c => c.innerText.trim());
      const j = grille.getStore().indexOf(grille.getStore().findRecord('libelle', '12h - 14h'));
      const jour = Array.from(grille.getView().getNode(j).querySelectorAll('.x-grid-cell-inner')).map(c => c.innerText.trim());
      return { nuit: cellules[cellules.length - 1], jour: jour[jour.length - 1] };
    });
    ok('Avec 1 client par heure et par personne, il en faut 2 sur 20h - 22h', effectif.nuit === '2', effectif.nuit);
    ok('Une tranche que la garde ne tient pas n\'a pas d\'effectif', effectif.jour === '-', effectif.jour);

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    purger();
    ok('Jeu d\'essai entierement retire',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'") === '0'
      && q("SELECT COUNT(*) FROM vente_reglement WHERE vente_id LIKE '" + MARQUE + "-%'") === '0'
      && q("SELECT COUNT(*) FROM t_vente_ratee WHERE lg_VENTE_RATEE_ID LIKE '" + MARQUE + "-%'") === '0'
      && q("SELECT COUNT(*) FROM garde WHERE libelle LIKE '" + MARQUE + " %'") === '0');
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
