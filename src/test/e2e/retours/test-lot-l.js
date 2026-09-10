/* Retours du 09/09 - lot L : balance vente / caisse (point 4) et caisse / recette (point 7).
 *
 * Point 4 :
 *  - sous les lignes VO / VNO, le document de ventilation : clients et ventes comptant / credit (nombre, %),
 *    part de chaque mode dans le CA (especes, mobile money global et par operateur, credit), caisse
 *    (mouvements, reglements tiers payant, ventes a credit : nombre et montant) ;
 *  - l'onglet « Evolution par mode de paiement » : les periodes en ligne, les modes en colonne ;
 *  - l'analyse comparative a son propre jrxml, imprimee en flux sans fenetre surgissante ; export Excel des modes.
 * Point 7 :
 *  - le detail mobile money s'affiche au pied de chaque journee SANS le « + » ;
 *  - le recap de la part de chaque mode de reglement dans le CA realise (mobile global + par operateur).
 *
 * Le banc n'a ni vente_reglement ni mouvement de caisse : le test pose un jeu d'essai complet aux montants
 * CHOISIS, sur deux mois d'il y a plus d'un an, et le retire a la fin. Tout attendu se calcule a la main :
 *
 *   Mois A : V1 comptant 10 000 (especes 6 000 + ORANGE 4 000) ; V2 comptant 5 000 (WAVE 5 000) ;
 *            V3 credit 20 000 (credit TP 15 000 + especes 5 000) ;
 *            fonds de caisse 50 000 ; entrees 1 000 et 2 000 ; sortie 500
 *   Mois B : V4 comptant 8 000 (especes 8 000) ; V5 credit 10 000 (credit TP 7 000 + especes 3 000) ;
 *            reglement tiers payant 12 000
 *   => 5 ventes (3 comptant = 60,0 %, 2 credit = 40,0 %) ; CA 53 000 (comptant 23 000 = 43,4 %, credit 30 000 = 56,6 %)
 *      especes 22 000 = 41,5 % ; mobile 9 000 = 17,0 % (ORANGE 4 000 = 7,5 %, WAVE 5 000 = 9,4 %) ; credit 22 000 = 41,5 %
 *      mouvements 3 (= +2 500) ; reglements TP 1 (12 000) ; ventes a credit 2 (30 000)
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }

const { q, MARQUE, MOIS_A, MOIS_B, FIN_B, jour, fr, poserJeuDEssai, retirerJeuDEssai } = require('../support/jeu-balance');
const TMP = '/tmp/claude-0/lot-l';

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const avant = q("SELECT COUNT(*) FROM mvttransaction WHERE mvtdate BETWEEN '" + MOIS_A + "' AND '" + FIN_B + "' AND typeTransaction<>2");
  poserJeuDEssai();
  ok('jeu d essai pose sur une fenetre vierge (' + MOIS_A + ' .. ' + FIN_B + ')', avant === '0', 'mouvements preexistants=' + avant);

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 980 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  const popups = []; ctx.on('page', pg => popups.push(pg));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2500);

  const appel = (url) => p.evaluate(async (u) => {
    const r = await fetch(u, { credentials: 'same-origin' });
    return { statut: r.status, type: r.headers.get('content-type'), corps: await r.text() };
  }, url);
  const nb = (s) => String(s).replace(/[\s ]/g, '');

  try {
    /* ======================================================= point 4 : API */
    const r = await appel('../api/v1/balance/balancesalecash?dtStart=' + MOIS_A + '&dtEnd=' + FIN_B);
    const json = JSON.parse(r.corps);
    const v = json.ventilation || {};
    ok('API balance : la reponse porte la ventilation', !!v.comptant && !!v.credit && !!v.caisse, r.corps.slice(0, 300));
    ok('API : 3 ventes comptant (60,0 %) et 2 a credit (40,0 %)',
      v.comptant && v.comptant.ventes === 3 && v.comptant.partVentes === 60 && v.credit.ventes === 2 && v.credit.partVentes === 40,
      JSON.stringify(v.comptant) + ' ' + JSON.stringify(v.credit));
    ok('API : CA 53 000, comptant 23 000 (43,4 %), credit 30 000 (56,6 %)',
      v.chiffreAffaires === 53000 && v.comptant.montant === 23000 && v.comptant.partMontant === 43.4
      && v.credit.montant === 30000 && v.credit.partMontant === 56.6, JSON.stringify(v.comptant) + ' ' + JSON.stringify(v.credit));
    ok('API : especes 22 000 = 41,5 % du CA', v.especes && v.especes.montant === 22000 && v.especes.part === 41.5, JSON.stringify(v.especes));
    ok('API : mobile 9 000 = 17,0 %, ORANGE 7,5 %, WAVE 9,4 %',
      v.mobile && v.mobile.montant === 9000 && v.mobile.part === 17
      && v.mobile.operateurs.length === 2
      && v.mobile.operateurs.some(o => o.libelle === 'ORANGE' && o.part === 7.5)
      && v.mobile.operateurs.some(o => o.libelle === 'WAVE' && o.part === 9.4), JSON.stringify(v.mobile));
    ok('API : credit (tiers payant) 22 000 = 41,5 % du CA', v.creditCa && v.creditCa.montant === 22000 && v.creditCa.part === 41.5, JSON.stringify(v.creditCa));
    const c = v.caisse || {};
    ok('API : mouvements de caisse 3 (+2 500), entrees 2 (3 000), sorties 1 (500)',
      c.mouvements && c.mouvements.nombre === 3 && c.mouvements.montant === 2500
      && c.entrees.nombre === 2 && c.entrees.montant === 3000 && c.sorties.nombre === 1 && c.sorties.montant === 500, JSON.stringify(c));
    ok('API : reglements TP 1 (12 000), ventes a credit 2 (30 000), fonds de caisse 50 000',
      c.reglementsTp && c.reglementsTp.nombre === 1 && c.reglementsTp.montant === 12000
      && c.ventesCredit.nombre === 2 && c.ventesCredit.montant === 30000 && c.fondCaisse.montant === 50000, JSON.stringify(c));
    // la grille au-dessus n'a pas change
    ok('API : les lignes VNO / VO de la grille sont inchangees (2 lignes, metaData present)',
      json.data && json.data.length === 2 && json.metaData && json.metaData.montantNet === 53000, JSON.stringify(json.metaData).slice(0, 200));

    const ra = await appel('../api/v1/balance/balancesalecash/analyse?typePeriode=LIBRE&dtStart=' + MOIS_A + '&dtEnd=' + FIN_B);
    const analyse = JSON.parse(ra.corps);
    // Une periode libre de deux mois se decoupe en semaines (regle du selecteur) : les deux semaines
    // qui portent le 10 de chaque mois doivent porter les montants, les autres rester a zero.
    const tranche = (jourIso) => (analyse.data || []).find(t => t.debut <= jourIso && jourIso <= t.fin) || {};
    const lA = tranche(jour(MOIS_A, 10)), lB = tranche(jour(MOIS_B, 10));
    ok('API analyse : les periodes sont decoupees et les modes rencontres sont [Especes, ORANGE, WAVE], dans cet ordre',
      analyse.data && analyse.data.length >= 2 && analyse.modes
      && analyse.modes.map(m => m.libelle).join(',') === 'Espèces,ORANGE,WAVE', JSON.stringify(analyse.modes) + ' ' + (analyse.data || []).length);
    ok('API analyse : semaine du mois A par mode = especes 11 000, ORANGE 4 000, WAVE 5 000 ; semaine du mois B = especes 11 000 seulement',
      lA.parModes && lA.parModes['1'] === 11000 && lA.parModes['7'] === 4000 && lA.parModes['10'] === 5000
      && lB.parModes && lB.parModes['1'] === 11000 && !lB.parModes['7'] && !lB.parModes['10'], JSON.stringify(lA.parModes) + ' ' + JSON.stringify(lB.parModes));

    /* ======================================================= point 4 : ecran */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('balancesalecahs', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #balanceGrid').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    const ids = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      return { du: vue.down('#dtStart').inputEl.id, au: vue.down('#dtEnd').inputEl.id, rechercher: vue.down('#rechercher').el.id,
        ventilation: !!vue.down('#ventilationBalance'), ongletModes: !!vue.down('#ongletModesBalance'),
        onglets: vue.down('#ongletsBalance').items.getRange().map(t => t.title) };
    });
    ok('ecran : le document de ventilation et l onglet « Evolution par mode de paiement » sont presents',
      // lot P : un quatrieme onglet cache, « Balance (ancienne) », sous privilege
      ids.ventilation && ids.ongletModes && ids.onglets.length === 4, ids.onglets.join(' | '));
    // parcours reel : saisie des dates puis clic sur Rechercher
    await p.fill('#' + ids.du, fr(MOIS_A)); await p.keyboard.press('Tab');
    await p.fill('#' + ids.au, fr(FIN_B)); await p.keyboard.press('Tab');
    await p.click('#' + ids.rechercher);
    // Retour des tests du 09/09 (lot N) : la synthese modernisee porte la meme classe ; on lit le
    // document de ventilation par son composant.
    await p.waitForFunction(() => {
      const c = Ext.ComponentQuery.query('balancesalecahs #ventilationBalance')[0];
      return c && c.el && /COMPTANT/.test(c.el.dom.innerText);
    }, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const doc = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #ventilationBalance')[0].el.dom.innerText);
    ok('ecran : VO -> CREDIT et VNO -> COMPTANT, avec les % clients et ventes',
      /COMPTANT\s/.test(doc) && /CRÉDIT\s/.test(doc) && /60,0 %/.test(doc) && /40,0 %/.test(doc) && /43,4 %/.test(doc) && /56,6 %/.test(doc), doc.replace(/\n/g, ' | ').slice(0, 400));
    ok('ecran : part des modes dans le CA : especes 41,5 %, mobile 17,0 %, ORANGE 7,5 %, WAVE 9,4 %, credit 41,5 %',
      /Espèces[\s\S]*41,5 %/.test(doc) && /Mobile money[\s\S]*17,0 %/.test(doc) && /ORANGE[\s\S]*7,5 %/.test(doc)
      && /WAVE[\s\S]*9,4 %/.test(doc) && /Part tiers payant[\s\S]*41,5 %/.test(doc), doc.replace(/\n/g, ' | ').slice(0, 600));
    ok('ecran : caisse : mouvements 3 / 2 500, reglements TP 1 / 12 000, ventes a credit 2 / 30 000',
      /Mouvements de caisse\s+3\s+2[\s .,]?500/.test(doc) && /Règlements tiers payant\s+1\s+12[\s .,]?000/.test(doc)
      && /Ventes à crédit\s+2\s+30[\s .,]?000/.test(doc), doc.replace(/\n/g, ' | ').slice(-500));
    const place = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      const g = vue.down('#balanceGrid').getEl().getBox(), d = vue.down('#ventilationBalance').getEl().getBox();
      return { grilleBas: g.bottom, docHaut: d.top, docH: d.height, lignes: vue.down('#balanceGrid').getStore().getCount() };
    });
    ok('ecran : le document est affiche SOUS la grille VO/VNO (2 lignes), dans l espace du bas',
      place.lignes === 2 && place.docHaut >= place.grilleBas - 2 && place.docH > 100, JSON.stringify(place));

    // onglet Evolution par mode : sa propre recherche (lot N) - periode libre, dates, Rechercher
    const ongletModes = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #ongletModesBalance')[0].tab.el.id);
    await p.click('#' + ongletModes);
    await p.waitForTimeout(1500);
    const idsM = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('balancesalecahs')[0];
      vue.down('#typePeriodeModes').setValue('LIBRE');
      return { du: vue.down('#dtStartModes').inputEl.id, au: vue.down('#dtEndModes').inputEl.id, rechercher: vue.down('#rechercherModes').el.id };
    });
    await p.fill('#' + idsM.du, fr(MOIS_A)); await p.keyboard.press('Tab');
    await p.fill('#' + idsM.au, fr(FIN_B)); await p.keyboard.press('Tab');
    await p.click('#' + idsM.rechercher);
    await p.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #grilleModes')[0].getStore().getCount() > 0, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const modes = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('balancesalecahs #grilleModes')[0];
      const entetes = g.headerCt.getGridColumns().map(c => (c.text || '').replace(/<[^>]+>/g, '').trim());
      const lignes = g.getStore().getRange().map(r => r.getData());
      const html = g.getView().getEl().dom.innerText;
      return { entetes, lignes, html };
    });
    ok('onglet modes : les periodes en ligne et les modes en colonne (Especes, ORANGE (mobile), WAVE (mobile), Total mobile, Tiers payant)',
      modes.lignes.length === (analyse.data || []).length && modes.entetes.indexOf('Espèces') >= 0
      && modes.entetes.some(e => /^ORANGE$/.test(e)) && modes.entetes.some(e => /^WAVE$/.test(e))
      && modes.entetes.some(e => /Total mobile/.test(e)) && modes.entetes.some(e => /Tiers payant/.test(e)),
      modes.entetes.join(' | '));
    const ligneA = modes.lignes.find(l => l.libelle === lA.libelle) || {}, ligneB = modes.lignes.find(l => l.libelle === lB.libelle) || {};
    ok('onglet modes : semaine A = 11 000 / 4 000 / 5 000 (mobile 9 000, TP 15 000) ; semaine B = 11 000 / 0 / 0 (mobile 0, TP 7 000)',
      ligneA.mode0 === 11000 && ligneA.mode1 === 4000 && ligneA.mode2 === 5000 && ligneA.montantMobile === 9000 && ligneA.montantTp === 15000
      && ligneB.mode0 === 11000 && ligneB.mode1 === 0 && ligneB.mode2 === 0 && ligneB.montantMobile === 0 && ligneB.montantTp === 7000,
      JSON.stringify(ligneA) + ' ' + JSON.stringify(ligneB));
    ok('onglet modes : la ligne TOTAL cumule les periodes (especes 22 000, ORANGE 4 000)',
      /TOTAL/.test(modes.html) && /22[\s .,]000/.test(modes.html), modes.html.replace(/\n/g, ' | ').slice(-300));

    // Imprimer : une seule ouverture, en flux, sur le PDF du modele
    const nbPopupsAvant = popups.length;
    const boutonImprimer = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #modesImprimer')[0].el.id);
    await p.click('#' + boutonImprimer);
    await p.waitForTimeout(3500);
    const popup = popups[popups.length - 1];
    const urlPopup = popup ? popup.url() : '';
    ok('impression : le clic ouvre UNE fois l edition PDF, sans fenetre intermediaire',
      popups.length === nbPopupsAvant + 1 && /balancesalecash\/analyse\/pdf\?/.test(urlPopup)
      && (await p.evaluate(() => Ext.ComponentQuery.query('window{isVisible()}').length)) === 0, urlPopup);
    const pdf = await p.evaluate(async (u) => {
      const r = await fetch(u, { credentials: 'same-origin' });
      const buf = await r.arrayBuffer();
      return { statut: r.status, type: r.headers.get('content-type'), octets: Array.from(new Uint8Array(buf)) };
    }, '../api/v1/balance/balancesalecash/analyse/pdf?typePeriode=LIBRE&dtStart=' + MOIS_A + '&dtEnd=' + FIN_B);
    fs.writeFileSync(TMP + '/analyse.pdf', Buffer.from(pdf.octets));
    const texte = execFileSync('pdftotext', ['-layout', TMP + '/analyse.pdf', '-'], { encoding: 'utf8' });
    ok('PDF : rendu en flux (application/pdf) sur le modele balance_analyse_comparative',
      pdf.statut === 200 && /pdf/.test(pdf.type || '') && /ANALYSE COMPARATIVE BALANCE VENTE \/ CAISSE/.test(texte), (pdf.type || '') + ' ' + texte.slice(0, 200));
    ok('PDF : les deux periodes, puis l evolution par mode avec les colonnes Especes / ORANGE / WAVE et le TOTAL',
      /ÉVOLUTION PAR MODE DE PAIEMENT/.test(texte) && /Espèces/.test(texte) && /ORANGE/.test(texte) && /WAVE/.test(texte)
      && /TOTAL/.test(texte) && /22[\s .,]000/.test(texte), texte.replace(/\n/g, ' | ').slice(-700));
    ok('PDF : le crosstab porte les montants du mois A (11 000 / 4 000 / 5 000)',
      /11[\s .,]000/.test(texte) && /4[\s .,]000/.test(texte) && /5[\s .,]000/.test(texte), '');

    // export Excel des modes
    const xlsx = await p.evaluate(async (u) => {
      const r = await fetch(u, { credentials: 'same-origin' });
      const buf = await r.arrayBuffer();
      return { statut: r.status, octets: Array.from(new Uint8Array(buf)) };
    }, '../api/v1/balance/balancesalecash/analyse/modes/excel?typePeriode=LIBRE&dtStart=' + MOIS_A + '&dtEnd=' + FIN_B);
    fs.writeFileSync(TMP + '/modes.xlsx', Buffer.from(xlsx.octets));
    const feuille = execFileSync('python3', ['-c', "import openpyxl,sys\nwb=openpyxl.load_workbook(sys.argv[1])\nws=wb.active\nprint('\\n'.join(' ; '.join('' if c.value is None else str(c.value) for c in row) for row in ws.iter_rows()))", TMP + '/modes.xlsx'], { encoding: 'utf8' });
    ok('Excel modes : une colonne par mode (Espèces ; ORANGE ; WAVE) et les montants du mois A',
      /Espèces ; ORANGE ; WAVE/.test(feuille) && /11000/.test(feuille) && /4000/.test(feuille), feuille.replace(/\n/g, ' | ').slice(0, 400));

    /* ======================================================= point 7 : caisse / recette */
    const rm = await appel('../api/v1/stats-recette-caisse/modes?dtStart=' + MOIS_A + '&dtEnd=' + FIN_B + '&groupByYear=false');
    const jm = JSON.parse(rm.corps);
    ok('API modes caisse/recette : CA realise 53 000, mobile 17,0 %, credit 41,5 %, especes 41,5 % du CA',
      jm.chiffreAffaires === 53000 && jm.partMobileCa === 17 && jm.partCreditCa === 41.5
      && (jm.data || []).some(m => m.modeId === '1' && m.partCa === 41.5)
      && (jm.data || []).some(m => m.modeId === '7' && m.partCa === 7.5), rm.corps.slice(0, 400));

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('caisserecetterecap', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('caisserecetterecap #caisserecetterecapGrid').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    const idsR = await p.evaluate(() => {
      const vue = Ext.ComponentQuery.query('caisserecetterecap')[0];
      return { du: vue.down('#dtStart').inputEl.id, au: vue.down('#dtEnd').inputEl.id, rechercher: vue.down('#rechercher').el.id };
    });
    await p.fill('#' + idsR.du, fr(MOIS_A)); await p.keyboard.press('Tab');
    await p.fill('#' + idsR.au, fr(FIN_B)); await p.keyboard.press('Tab');
    await p.click('#' + idsR.rechercher);
    await p.waitForFunction(() => Ext.ComponentQuery.query('caisserecetterecap #caisserecetterecapGrid')[0].getStore().getCount() >= 2, null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    const recap = await p.evaluate(() => {
      const grille = Ext.ComponentQuery.query('caisserecetterecap #caisserecetterecapGrid')[0];
      const vueEl = grille.getView().getEl().dom;
      const corps = Array.from(vueEl.querySelectorAll('tr.x-grid-rowbody-tr'));
      const visibles = corps.filter(tr => tr.offsetHeight > 0 && !/x-grid-row-body-hidden/.test(tr.className));
      return {
        expanders: vueEl.querySelectorAll('.x-grid-row-expander').length,
        pluginExpander: (grille.plugins || []).some(pl => pl.ptype === 'rowexpander' || (pl.self && /RowExpander/.test(pl.self.getName()))),
        lignes: grille.getStore().getCount(),
        corps: corps.length, visibles: visibles.length,
        texteVisibles: visibles.map(tr => tr.innerText.replace(/\s+/g, ' ').trim()),
        recap: (document.querySelector('.recap-modes-ca') || {}).innerText || ''
      };
    });
    ok('caisse/recette : plus aucun « + » (ni plugin rowexpander, ni icone) sur le tableau',
      recap.expanders === 0 && recap.pluginExpander === false, JSON.stringify({ e: recap.expanders, p: recap.pluginExpander }));
    // le tableau a une ligne par journee (ventes ET mouvements) ; seule la journee de ventes du
    // mois A porte des paiements mobiles : elle seule montre la ligne de detail mobile. Retours des tests 4 :
    // la journee des mouvements du mois A (entrees 3 000, sortie 500) montre la rubrique « Mouvements de caisse ».
    const texteVisible = recap.texteVisibles.join(' || ');
    ok('caisse/recette : le detail mobile s affiche de lui-meme au pied du jour concerne (mois A), et la rubrique des mouvements de caisse sur la journee qui en a',
      recap.lignes >= 2 && recap.corps === recap.lignes && recap.visibles === 2
      && /Mobile money : (WAVE 5[\s .,]000 · ORANGE 4[\s .,]000|ORANGE 4[\s .,]000 · WAVE 5[\s .,]000) = 9[\s .,]000/.test(texteVisible)
      && /Mouvements de caisse : entrées 3[\s .,]000 · sorties 500/.test(texteVisible),
      JSON.stringify(recap.texteVisibles) + ' lignes=' + recap.lignes + ' corps=' + recap.corps);
    ok('caisse/recette : le recap donne le % de chaque mode dans le CA realise, mobile global puis par operateur',
      /CA réalisé \(53[\s .,]000\)/.test(recap.recap) && /Especes 41,5 %/.test(recap.recap)
      && /Mobile money 17,0 %/.test(recap.recap) && /ORANGE 7,5 %/.test(recap.recap) && /WAVE 9,4 %/.test(recap.recap)
      && /Crédit 41,5 %/.test(recap.recap), recap.recap);

    ok('aucune erreur JavaScript pendant le parcours', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('parcours sans exception', false, e.stack || e.message);
  } finally {
    await b.close();
    retirerJeuDEssai();
    ok('jeu d essai retire', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'") === '0');
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\nTOTAL ' + (res.length - ko) + '/' + res.length + (ko ? '  FAIL=' + ko : '  OK'));
  process.exit(ko ? 1 : 0);
})();
