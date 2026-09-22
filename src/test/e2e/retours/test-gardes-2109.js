/* MENU DES GARDES - retours de l'officine du 21/09.
 *
 *  - onglet « commandes non vendus » : le stock actuel, la quantite PREPAREE (commandee dans les N jours avant la
 *    garde, N choisi, 3 par defaut) a cote de la quantite commandee pendant, le % de vente scinde (prep. / cmd),
 *    la frequence de vente par jour, une recherche CIP / nom, des filtres a operateurs sur le stock et la
 *    quantite vendue, un bouton « Suggerer » qui envoie le resultat filtre, une courbe des ventes jour par jour,
 *    et des editions alignees ;
 *  - la suggestion creee porte un commentaire « Suggestion de garde - <libelle> (du ... au ...) », dans une
 *    colonne ajoutee a la table des suggestions - sans toucher aux suggestions existantes ;
 *  - l'onglet Comparaison passe en barres, une par garde, sur une grandeur choisie ;
 *  - le suivi de l'activite s'imprime, courbe et tranches sur une meme page, en flux dans un onglet ;
 *  - les textes de creation d'une garde.
 *
 * Jeu d'essai : la garde « nuit » du 5 au 6 (20 h - 8 h) ; ventes P0 x5 et P1 x1 pendant la garde ; commande de
 * PREPARATION le 3 a 10 h (P0 x6, P2 x3 - deux jours avant) ; commande pendant la garde le 5 a 23 h (P0 x5,
 * P2 x4) ; commande de jour le 6 a 12 h, hors garde (P1 x9). Ainsi P0 est prepare ET commande ET vendu, P2 est
 * prepare ET commande et JAMAIS vendu, P1 est vendu sans commande.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-G21';
const DEBUT_TEST = q('SELECT NOW()');
let PRODUITS = [], KGA3 = '', GROSSISTE = '';

const VENTES = [
  { id: MARQUE + '-1', quand: '2026-09-05 20:30:00', prod: 0, qte: 2, montant: 1000 },
  { id: MARQUE + '-2', quand: '2026-09-05 21:00:00', prod: 1, qte: 1, montant: 4000 },
  { id: MARQUE + '-3', quand: '2026-09-06 07:00:00', prod: 0, qte: 3, montant: 1500 }
];
const COMMANDES = [
  { id: MARQUE + '-ORD-PREP', quand: '2026-09-03 10:00:00', lignes: [[0, 6], [2, 3]] },
  { id: MARQUE + '-ORD-1', quand: '2026-09-05 23:00:00', lignes: [[0, 5], [2, 4]] },
  { id: MARQUE + '-ORD-2', quand: '2026-09-06 12:00:00', lignes: [[1, 9]] }
];

function purger() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_order_detail WHERE lg_ORDER_ID LIKE '" + MARQUE + "-ORD%'");
  exec("DELETE FROM t_order WHERE lg_ORDER_ID LIKE '" + MARQUE + "-ORD%'");
  exec("DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID IN (SELECT lg_SUGGESTION_ORDER_ID FROM t_suggestion_order WHERE str_COMMENTAIRE LIKE 'Suggestion de garde - " + MARQUE + "%')");
  exec("DELETE FROM t_suggestion_order WHERE str_COMMENTAIRE LIKE 'Suggestion de garde - " + MARQUE + "%'");
  exec("DELETE FROM garde WHERE libelle LIKE '" + MARQUE + " %'");
}

function semer() {
  KGA3 = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  GROSSISTE = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT='enable' LIMIT 1");
  q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT='enable' AND f.lg_GROSSISTE_ID IS NOT NULL"
    + " AND f.bool_DECONDITIONNE=0 AND EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.str_STATUT='enable' AND s.lg_EMPLACEMENT_ID='1' AND s.int_NUMBER_AVAILABLE>0)"
    + " ORDER BY f.str_NAME LIMIT 3").split('\n').filter(Boolean).forEach(id => PRODUITS.push(id.trim()));
  purger();
  if (!KGA3 || !GROSSISTE || PRODUITS.length !== 3) { return false; }
  VENTES.forEach(v => {
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE, int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
      + " lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER, int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug, montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + v.id + "','" + v.id + "','0'," + v.montant + ",0,'is_Closed','" + v.quand + "','" + v.quand + "',1,'" + KGA3 + "','" + KGA3 + "','" + KGA3 + "',0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR, int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT, montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + v.id + "-D','" + v.id + "','" + PRODUITS[v.prod] + "'," + v.qte + ",0,0,0," + v.montant + "," + Math.round(v.montant / v.qte) + ",0,'" + v.quand + "','" + v.quand + "',0,0,0,0,0,0,1,0,0," + Math.round(v.montant / v.qte / 2) + ",0,0)");
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
  const stocks = PRODUITS.map(id => Number(q("SELECT COALESCE(SUM(int_NUMBER_AVAILABLE),0) FROM t_famille_stock WHERE lg_FAMILLE_ID='" + id + "' AND lg_EMPLACEMENT_ID='1'")));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1800, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 30000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await p.waitForTimeout(2000);
    const poster = (params) => p.evaluate(async (params) => {
      const corps = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch('../api/v1/gardes', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps });
      return await r.json();
    }, params);
    const g1 = await poster({ libelle: MARQUE + ' nuit', dateDebut: '2026-09-05 20:00', dateFin: '2026-09-06 08:00' });
    const g2 = await poster({ libelle: MARQUE + ' nuit 2', dateDebut: '2026-09-12 20:00', dateFin: '2026-09-13 08:00' });
    ok('Deux gardes de jeu d essai', g1.success && g2.success, JSON.stringify([g1.msg, g2.msg]));
    const idGarde = q("SELECT id FROM garde WHERE libelle='" + MARQUE + " nuit'");

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('gardemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager').length > 0 && !Ext.ComponentQuery.query('gardemanager')[0].gardeStore.isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const ouvrirOnglet = async (itemId) => {
      const id = await p.evaluate((i) => Ext.ComponentQuery.query('gardemanager #' + i)[0].tab.getId(), itemId);
      await p.click('#' + id); await p.waitForTimeout(900);
    };
    const cliquerGarde = async (libelle) => {
      const ligne = await p.evaluate((libelle) => {
        const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0];
        g.getSelectionModel().deselectAll();
        const cellule = g.getView().getNode(g.getStore().findExact('libelle', libelle)).querySelector('.x-grid-cell:not(.x-grid-cell-row-checker) .x-grid-cell-inner');
        const r = cellule.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, libelle);
      await p.mouse.click(ligne.x, ligne.y);
      await p.waitForFunction(() => !/Analyse en cours/.test(Ext.ComponentQuery.query('gardemanager #gardeIndicateurs')[0].el.dom.innerHTML) && Ext.ComponentQuery.query('gardemanager')[0].abcStore.getCount() > 0, null, { timeout: 20000 });
      await p.waitForTimeout(400);
    };
    const cliquer = async (sel) => { const id = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), sel); await p.click('#' + id); };
    const attendreCommandes = () => p.waitForFunction(() => { const v = Ext.ComponentQuery.query('gardemanager')[0]; const o = v.down('#ongletCommandes'); return v.commandeStore.getCount() > 0 && !(o.loadMask && o.loadMask.isVisible()); }, null, { timeout: 20000 });
    const lignes = () => p.evaluate(() => { const v = Ext.ComponentQuery.query('gardemanager')[0]; return { lignes: v.commandeStore.getRange().map(l => l.getData()), resume: v.down('#commandesResume').el.dom.innerText, compte: v.down('#commandesCompte').text || '', entetes: v.down('#ongletCommandes').headerCt.getGridColumns().map(c => { const d = document.createElement('div'); d.innerHTML = c.text; return d.textContent; }) }; });

    /* ------------------------------------------------------------ commandes non vendus */
    await cliquerGarde(MARQUE + ' nuit');
    await ouvrirOnglet('ongletCommandes');
    await attendreCommandes(); await p.waitForTimeout(500);
    let c = await lignes();
    const par = (i) => c.lignes.filter(l => l.produitId === PRODUITS[i])[0];
    ok('Colonnes : Stock, Qté prép. (3 j), Qté cmd, Qté vendue, % vente prép. / cmd, Fréq./jour, Statut',
      /Qté prép\. \(3 j\)/.test(c.entetes.join('|')) && ['Stock', 'Qté cmd', 'Qté vendue', 'prép.', 'cmd', 'Fréq./jour', 'Statut'].every(t => c.entetes.indexOf(t) >= 0), c.entetes.join(' | '));
    ok('P0 : préparé 6 (deux jours avant), commandé 5 pendant, vendu 5 ; % prép. 83,33, % cmd 100 ; stock actuel de la fiche',
      par(0) && par(0).quantitePreparation === 6 && par(0).quantiteCommandee === 5 && par(0).quantiteVendue === 5 && par(0).pourcentagePreparation === 83.33 && par(0).pourcentageCommande === 100 && par(0).stock === stocks[0], JSON.stringify(par(0)));
    ok('P2 : préparé 3 et commandé 4, jamais vendu : non vendu, en tête', par(2) && par(2).quantitePreparation === 3 && par(2).quantiteCommandee === 4 && par(2).quantiteVendue === 0 && par(2).nonVendu === true && c.lignes[0].produitId === PRODUITS[2], JSON.stringify(par(2)));
    ok('La commande de jour après la garde ne compte ni en préparation ni pendant : P1 absent', !par(1), c.lignes.length + ' ligne(s)');
    ok('Fréquence par jour : 5 unités sur une garde d une nuit (1 jour) = 5,00', par(0) && par(0).frequenceJour === 5, par(0) && par(0).frequenceJour);
    ok('Le résumé nomme la préparation (3 jour(s) avant, ou pendant) et compte 1 non vendu sur 2', /3 jour\(s\) avant, ou pendant/.test(c.resume) && /\b2\b/.test(c.resume) && /50[.,]00 %/.test(c.resume), c.resume);

    await p.evaluate(() => { const cb = Ext.ComponentQuery.query('gardemanager #commandesJoursPrep')[0]; cb.setValue(1); cb.fireEvent('select', cb, [cb.findRecordByValue(1)]); });
    await p.waitForTimeout(1500); await attendreCommandes(); c = await lignes();
    ok('« 1 jour avant » : la commande de deux jours avant n est plus une préparation', par(0) && par(0).quantitePreparation === 0 && /Qté prép\. \(1 j\)/.test(c.entetes.join('|')), JSON.stringify(par(0)));
    await p.evaluate(() => { const cb = Ext.ComponentQuery.query('gardemanager #commandesJoursPrep')[0]; cb.setValue(3); cb.fireEvent('select', cb, [cb.findRecordByValue(3)]); });
    await p.waitForTimeout(1500); await attendreCommandes();

    /* filtres sur place */
    const nomP2 = q("SELECT str_NAME FROM t_famille WHERE lg_FAMILLE_ID='" + PRODUITS[2] + "'");
    /* Un evaluate ne doit jamais RENVOYER un composant ExtJS : setValue() rend « this », objet cyclique qui
       tient le DOM, et sa serialisation tue le contexte de la page. D'ou les accolades et le retour vide. */
    await p.evaluate((t) => { Ext.ComponentQuery.query('gardemanager #commandesRecherche')[0].setValue(t); }, nomP2.slice(0, 8));
    await p.waitForTimeout(900); c = await lignes();
    ok('La recherche par nom filtre sur place', c.lignes.every(l => l.libelle.toUpperCase().indexOf(nomP2.slice(0, 8).toUpperCase()) >= 0) && c.lignes.length >= 1 && /apr(&egrave;|è)s filtre/.test(c.compte), c.lignes.length + ' | ' + c.compte);
    await p.evaluate(() => { Ext.ComponentQuery.query('gardemanager #commandesRecherche')[0].setValue(''); });
    await p.evaluate(() => { const v = Ext.ComponentQuery.query('gardemanager')[0]; const op = v.down('#commandesVenduOp'); op.setValue('>='); v.down('#commandesVenduVal').setValue(1); op.fireEvent('select', op); });
    await p.waitForTimeout(900); c = await lignes();
    ok('« Qté vendue ≥ 1 » ne garde que P0', c.lignes.length === 1 && c.lignes[0].produitId === PRODUITS[0], c.lignes.length);
    await p.evaluate(() => { const v = Ext.ComponentQuery.query('gardemanager')[0]; const op = v.down('#commandesStockOp'); op.setValue('>'); v.down('#commandesStockVal').setValue(99999999); op.fireEvent('select', op); });
    await p.waitForTimeout(900); c = await lignes();
    ok('« Stock > 99 999 999 » ne garde rien : les filtres se combinent', c.lignes.length === 0);
    await cliquer('gardemanager #commandesEffacer'); await p.waitForTimeout(600); c = await lignes();
    ok('« Effacer » rend les deux lignes', c.lignes.length === 2 && c.compte === '');

    /* suggerer le resultat filtre : les non vendus seuls */
    await p.evaluate(() => { const cb = Ext.ComponentQuery.query('gardemanager #commandesFiltre')[0]; cb.setValue('non'); cb.fireEvent('select', cb); });
    await p.waitForTimeout(700);
    await cliquer('gardemanager #commandesSuggerer');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /1 produit\(s\) affich/.test(Ext.MessageBox.msg.el.dom.innerText), null, { timeout: 10000 });
    const question = await p.evaluate(() => Ext.MessageBox.msg.el.dom.innerText);
    await p.click('#' + await p.evaluate(() => Ext.MessageBox.msgButtons.yes.getId()));
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && !/patienter/i.test(Ext.MessageBox.msg.el.dom.innerText), null, { timeout: 20000 });
    const reponse = await p.evaluate(() => Ext.MessageBox.msg.el.dom.innerText);
    await p.click('#' + await p.evaluate(() => Ext.MessageBox.msgButtons.ok.getId()));
    const sugg = q("SELECT CONCAT(o.str_COMMENTAIRE, '|', d.lg_FAMILLE_ID, '|', d.int_NUMBER) FROM t_suggestion_order o JOIN t_suggestion_order_details d ON d.lg_SUGGESTION_ORDER_ID=o.lg_SUGGESTION_ORDER_ID WHERE o.str_COMMENTAIRE LIKE 'Suggestion de garde - " + MARQUE + "%' AND o.dt_CREATED >= '" + DEBUT_TEST + "'").split('\n').filter(Boolean);
    ok('« Suggérer » sur le filtre « non vendus » demande confirmation pour 1 produit puis crée la suggestion', /1 produit\(s\) affich/.test(question) && /suggestion/.test(reponse), question.slice(0, 80) + ' / ' + reponse.slice(0, 80));
    ok('La suggestion porte P2 avec 7 unités (préparé 3 + commandé 4, faute de vente) et le commentaire « Suggestion de garde - ... (du ... au ...) »',
      sugg.length === 1 && sugg[0].indexOf('|' + PRODUITS[2] + '|7') > 0 && /^Suggestion de garde - E2E-G21 nuit \(du 05\/09\/2026 20h00 au 06\/09\/2026 08h00\)\|/.test(sugg[0]), JSON.stringify(sugg));
    const listeSugg = await p.evaluate(async () => (await fetch('../api/v1/suggestion/list?query=&start=0&limit=200', { credentials: 'same-origin' })).json());
    const trouvee = (listeSugg.data || listeSugg.results || []).filter(s => /Suggestion de garde - E2E-G21/.test(s.str_COMMENTAIRE || ''));
    ok('Et le menu des suggestions la liste avec son commentaire (colonne ajoutée sans toucher aux autres)', trouvee.length === 1 && trouvee[0].str_REF, JSON.stringify(trouvee[0] || listeSugg).slice(0, 200));
    await p.evaluate(() => { const cb = Ext.ComponentQuery.query('gardemanager #commandesFiltre')[0]; cb.setValue(''); cb.fireEvent('select', cb); });

    /* la courbe des ventes jour par jour */
    await cliquer('gardemanager #commandesCourbe');
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('window[itemId=fenetreVentesJour]')[0]; return w && w.isVisible() && Ext.ComponentQuery.query('gardemanager')[0].ventesJourStore.getCount() > 0; }, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const jours = await p.evaluate(() => { const v = Ext.ComponentQuery.query('gardemanager')[0]; const ch = Ext.ComponentQuery.query('window[itemId=fenetreVentesJour] chart')[0]; return { data: v.ventesJourStore.getRange().map(r => r.getData()), type: ch.series.items[0].type, bandes: ch.el.query('svg rect').length }; });
    /* Le 5 : P0 x2 a 20 h 30 et P1 x1 a 21 h = 3 unites sur 2 ventes ; le 6 : P0 x3 a 7 h = 3 unites sur 1 vente. */
    ok('La courbe des ventes montre un jour par jour civil de la garde, en bandes : le 5 (3 unités, 2 ventes) et le 6 (3 unités, 1 vente)',
      jours.data.length === 2 && jours.data[0].quantite === 3 && jours.data[0].ventes === 2 && jours.data[1].quantite === 3 && jours.data[1].ventes === 1
      && /column/.test(jours.type) && jours.bandes >= 2, JSON.stringify(jours));
    await p.evaluate(() => { Ext.ComponentQuery.query('window[itemId=fenetreVentesJour]')[0].close(); });

    /* editions alignees */
    const pdf = await p.evaluate(async (id) => { const r = await fetch('../api/v1/gardes/' + id + '/commandes/pdf?joursPrep=3', { credentials: 'same-origin' }); return { code: r.status, type: r.headers.get('content-type'), taille: (await r.blob()).size }; }, idGarde);
    const xls = await p.evaluate(async (id) => { const r = await fetch('../api/v1/gardes/' + id + '/commandes/excel?joursPrep=3', { credentials: 'same-origin' }); const b = await r.blob(); return { code: r.status, type: r.headers.get('content-type'), taille: b.size }; }, idGarde);
    ok('Le PDF et l Excel des commandes répondent avec la préparation', pdf.code === 200 && /pdf/.test(pdf.type) && pdf.taille > 2000 && xls.code === 200 && /spreadsheet/.test(xls.type) && xls.taille > 3000, JSON.stringify([pdf, xls]));
    const fs = require('fs'); const os = require('os');
    const octets = await p.evaluate(async (id) => { const r = await fetch('../api/v1/gardes/' + id + '/commandes/pdf?joursPrep=3', { credentials: 'same-origin' }); return Array.from(new Uint8Array(await r.arrayBuffer())); }, idGarde);
    const tmp = os.tmpdir() + '/garde_cmd_' + Date.now() + '.pdf'; fs.writeFileSync(tmp, Buffer.from(octets));
    const texte = execFileSync('pdftotext', ['-layout', tmp, '-'], { encoding: 'utf8' });
    ok('Le PDF porte les colonnes de préparation, de stock et de fréquence', /Qté prép\./.test(texte) && /Stock/.test(texte) && /Fréq\.\/jour/.test(texte) && /% prép\./.test(texte), texte.replace(/\s+/g, ' ').slice(0, 300));

    /* ------------------------------------------------------------ comparaison en barres */
    await ouvrirOnglet('ongletComparaison');
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0]; const s = g.getStore(); g.getSelectionModel().select([s.getAt(s.findExact('libelle', 'E2E-G21 nuit')), s.getAt(s.findExact('libelle', 'E2E-G21 nuit 2'))]); return undefined; });
    await cliquer('gardemanager #comparerSelection');
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager')[0].comparaisonStore.getCount() === 2, null, { timeout: 20000 });
    await p.waitForTimeout(900);
    const barres = await p.evaluate(() => { const c = Ext.ComponentQuery.query('gardemanager #courbeComparaison')[0]; return { type: c.series.items[0].type, champ: c.series.items[0].yField, rects: c.el.query('svg rect').length, grandeur: Ext.ComponentQuery.query('gardemanager #grandeurComparaison')[0].getValue() }; });
    ok('La comparaison est un diagramme en bandes, une par garde, sur le chiffre d affaires par défaut', /column/.test(barres.type) && barres.champ === 'montant' && barres.rects >= 2 && barres.grandeur === 'montant', JSON.stringify(barres));
    await p.evaluate(() => { const cb = Ext.ComponentQuery.query('gardemanager #grandeurComparaison')[0]; cb.setValue('clients'); cb.fireEvent('select', cb, [cb.findRecordByValue('clients')]); });
    await p.waitForTimeout(900);
    const barres2 = await p.evaluate(() => { const c = Ext.ComponentQuery.query('gardemanager #courbeComparaison')[0]; return { champ: c.series.items[0].yField, titre: c.axes.items[0].title }; });
    ok('Changer la grandeur reconstruit les barres sur les clients', barres2.champ === 'clients' && /Clients/.test(barres2.titre), JSON.stringify(barres2));

    /* ------------------------------------------------------------ impression du suivi de l activite */
    await ouvrirOnglet('ongletActivite');
    await cliquerGarde(MARQUE + ' nuit');
    await ouvrirOnglet('ongletActivite');
    await p.waitForTimeout(800);
    const [nouvelle] = await Promise.all([ctx.waitForEvent('page', { timeout: 20000 }), cliquer('gardemanager #activiteImprimer')]);
    await nouvelle.waitForLoadState('load', { timeout: 30000 }).catch(() => null);
    const typePdf = await nouvelle.evaluate(() => document.contentType).catch(() => '');
    ok('« Imprimer » l activité ouvre le PDF EN FLUX dans un onglet (courbe et tranches sur une page)', /pdf/.test(typePdf) && /activite\/pdf/.test(nouvelle.url()), typePdf + ' ' + nouvelle.url());
    await nouvelle.close();
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const direct = await p.evaluate(async ([id, png]) => { const r = await fetch('../api/v1/gardes/activite/pdf', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'ids=' + id + '&heures=2&capacite=10&image=' + encodeURIComponent('data:image/png;base64,' + png) }); return { code: r.status, type: r.headers.get('content-type'), taille: (await r.blob()).size }; }, [idGarde, png]);
    ok('L édition accepte l image de la courbe et rend un PDF', direct.code === 200 && /pdf/.test(direct.type) && direct.taille > 2000, JSON.stringify(direct));
    const sansImage = await p.evaluate(async (id) => { const r = await fetch('../api/v1/gardes/activite/pdf', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'ids=' + id + '&heures=2&capacite=10&image=pas-une-image' }); return { code: r.status, type: r.headers.get('content-type') }; }, idGarde);
    ok('Et sans image valable, elle part quand même avec les tranches', sansImage.code === 200 && /pdf/.test(sansImage.type), JSON.stringify(sansImage));

    /* ------------------------------------------------------------ textes de creation */
    await cliquer('gardemanager #gardeNouvelle');
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardeform').length > 0, null, { timeout: 10000 });
    const textes = await p.evaluate(() => { const f = Ext.ComponentQuery.query('gardeform')[0]; return { aide: f.down('displayfield').getValue(), vide: f.down('#gardeLibelle').emptyText }; });
    ok('Le formulaire dit « Une garde dure 7 jours et les horaires de début dépendent de la zone de la pharmacie » et propose « Semaine du ... »',
      /Une garde dure 7 jours et les horaires de d.but d.pendent de la zone de la pharmacie/.test(textes.aide.replace(/&eacute;/g, 'é')) && /^Semaine du /.test(textes.vide), JSON.stringify(textes));
    await p.evaluate(() => { Ext.ComponentQuery.query('gardeform')[0].close(); });

    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    let url = ''; try { url = p.url(); } catch (x) { url = '?'; }
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1] + ' | page : ' + url);
  } finally {
    await b.close();
    purger();
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
