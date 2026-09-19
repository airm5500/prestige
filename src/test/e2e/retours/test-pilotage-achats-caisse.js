/* Evolution 6, point 1, vague 2 : onglets ACHATS et CAISSE & TIERS-PAYANT du menu de pilotage.
 *
 * Ce que le test etablit :
 *  - les cinq onglets sont la, et les deux nouveaux se chargent quand on les ouvre ;
 *  - ACHATS : le montant sans filtre est EXACTEMENT celui de la base (en-tete des bons) et celui de la tuile
 *    Achats de la synthese - deux onglets du meme ecran ne peuvent pas annoncer deux chiffres ;
 *  - la part de chaque grossiste somme a 100 %, et une colonne par grossiste ayant livre apparait ;
 *  - poser un filtre de grossiste garde la base « en-tete » ; poser un filtre de famille ou d'emplacement fait
 *    passer au calcul sur les LIGNES, et l'ecran LE DIT - sans quoi l'officine croirait avoir perdu 4 % ;
 *  - CAISSE : encaisse + credit = chiffre d'affaires, exactement, mois par mois ;
 *  - le tiers payant regle vient des reglements de dossiers, a leur date de reglement ;
 *  - les editions et l'export des deux onglets repondent et portent leurs colonnes.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 330) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

function texteDuPdf(octets) {
  const zlib = require('zlib');
  const d = Buffer.from(octets);
  const brut = d.toString('latin1');
  let out = '';
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(brut)) !== null) {
    const debut = m.index + m[0].length;
    const fin = brut.indexOf('endstream', debut);
    if (fin < 0) { continue; }
    try {
      const clair = zlib.inflateSync(d.slice(debut, fin)).toString('latin1');
      out += (clair.match(/\((?:[^()\\]|\\.)*\)/g) || []).join(' ');
    } catch (e) { /* flux non compresse */ }
  }
  return out;
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pilotage', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #onglets').length > 0, null,
      { timeout: 30000 });
    await p.waitForTimeout(6000);

    const onglets = await p.evaluate(() =>
      Ext.ComponentQuery.query('pilotage #onglets')[0].items.items.map((o) => o.title));
    /* Le test porte sur les onglets de SA vague, pas sur une liste figee qui casserait a la suivante. */
    ok('Les deux onglets de cette vague sont là, après ceux de la vague précédente',
      ['Achats', 'Caisse & tiers-payant'].every((t) => onglets.indexOf(t) >= 0)
      && onglets.indexOf('Achats') === 3 && onglets.indexOf('Caisse & tiers-payant') === 4,
      JSON.stringify(onglets));

    /* La tuile Achats de la synthese, pour la comparer ensuite a l onglet Achats. */
    const achatSynthese = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      let v = null;
      e.stores.synthese.tuiles.each((r) => { if (r.get('cle') === 'achats') { v = r.get('valeur'); } });
      return v;
    });

    const changerOnglet = async (titre) => {
      await p.evaluate((t) => {
        const ong = Ext.ComponentQuery.query('pilotage #onglets')[0];
        ong.setActiveTab(ong.items.items.filter((o) => o.title === t)[0]);
      }, titre);
      await p.waitForTimeout(9000);
    };

    /* --------------------------------------------------------------- ACHATS */
    await changerOnglet('Achats');
    const achats = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const tuiles = [];
      e.stores.achats.tuiles.each((r) => tuiles.push({ cle: r.get('cle'), valeur: r.get('valeur') }));
      const repartition = [];
      e.storeRepartition.each((r) => repartition.push({ grossiste: r.get('grossiste'),
        montant: r.get('montant'), part: r.get('part') }));
      return { tuiles: tuiles, repartition: repartition,
        colonnes: e.down('#detail-achats').headerCt.getGridColumns().map((c) => c.text),
        note: e.down('#filtresAchats #noteAchats').getValue(),
        titreRepartition: e.down('#repartition') ? e.down('#repartition').title : null,
        grossistesFiltre: e.storeGrossistes.getCount(),
        mois: e.stores.achats.mois.getCount() };
    });
    ok('L onglet Achats se charge avec ses tuiles et son détail',
      achats.tuiles.length === 5 && achats.mois > 0, JSON.stringify(achats.tuiles.map((t) => t.cle)));

    const moisCourant = q("SELECT DATE_FORMAT(CURDATE(),'%Y-%m-01')");
    const lendemain = q("SELECT DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY),'%Y-%m-%d')");
    const achatsBase = Number(q("SELECT COALESCE(SUM(b.int_HTTC),0) FROM t_bon_livraison b"
      + " WHERE b.str_STATUT='is_Closed' AND b.dt_UPDATED>='" + moisCourant + "'"
      + " AND b.dt_UPDATED<'" + lendemain + "'"));
    const tuileAchats = achats.tuiles.filter((t) => t.cle === 'achats')[0];
    ok('Le montant des achats est EXACTEMENT celui de la base',
      Math.abs(tuileAchats.valeur - achatsBase) < 1, tuileAchats.valeur + ' contre ' + achatsBase);
    ok('Et c est le même chiffre que la tuile Achats de la Synthèse : un écran, un chiffre',
      Math.abs(tuileAchats.valeur - achatSynthese) < 1,
      tuileAchats.valeur + ' contre ' + achatSynthese + ' (synthèse)');

    /*
     * LA REPARTITION SUIT LA PERIODE CHOISIE (retour du 19/09). Elle portait auparavant sur les treize ou
     * vingt-cinq mois du graphique pendant que les tuiles parlaient du mois en cours ; elle suit desormais le
     * selecteur, et le titre du tableau nomme la periode qu'il mesure. On controle donc les deux : un mois sans
     * achat rend un tableau vide - et c'est juste - et une fenetre de douze mois glissants le remplit.
     */
    const repartitionMoisCourant = achats.repartition.length;
    const achatsDuMois = achatsBase;
    ok('La répartition suit la période choisie : vide si aucun achat ce mois-ci',
      (achatsDuMois === 0) === (repartitionMoisCourant === 0),
      repartitionMoisCourant + ' grossiste(s) pour ' + achatsDuMois + ' F d achats sur le mois');
    ok('Et le tableau nomme la période qu il mesure',
      /Part de chaque grossiste — .+/.test(achats.titreRepartition || ''), achats.titreRepartition);

    /* Sur douze mois glissants, l officine a forcement achete : la repartition doit etre pleine et sommer a 100 %. */
    await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('pilotage #barrePeriode combobox[itemId=axe]')[0];
      c.setValue('G12');
      c.fireEvent('select', c, [c.findRecordByValue('G12')]);
    });
    await p.waitForTimeout(9000);
    const surDouzeMois = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const repartition = [];
      e.storeRepartition.each((r) => repartition.push({ grossiste: r.get('grossiste'),
        montant: r.get('montant'), part: r.get('part') }));
      return { repartition: repartition,
        colonnes: e.down('#detail-achats').headerCt.getGridColumns().map((c) => c.text) };
    });
    const sommeParts = surDouzeMois.repartition.reduce((s, r) => s + r.part, 0);
    ok('La part de chaque grossiste somme à 100 %',
      surDouzeMois.repartition.length > 0 && Math.abs(sommeParts - 100) < 0.5,
      sommeParts + ' % sur ' + surDouzeMois.repartition.length + ' grossiste(s)');
    ok('Les grossistes sont classés du plus gros au plus petit',
      surDouzeMois.repartition.every((r, i) => i === 0 || surDouzeMois.repartition[i - 1].montant >= r.montant),
      JSON.stringify(surDouzeMois.repartition.slice(0, 3)));
    const premierGrossiste = surDouzeMois.repartition[0].grossiste.toUpperCase();
    ok('Le détail mensuel porte une colonne par grossiste ayant livré',
      surDouzeMois.colonnes.indexOf(premierGrossiste) >= 0, JSON.stringify(surDouzeMois.colonnes));

    /* Le montant de la repartition est celui de la base, sur la MEME periode. */
    const achatsDouzeMois = Number(q("SELECT COALESCE(SUM(b.int_HTTC),0) FROM t_bon_livraison b"
      + " WHERE b.str_STATUT='is_Closed'"
      + " AND b.dt_UPDATED >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 12 MONTH),'%Y-%m-01')"
      + " AND b.dt_UPDATED < DATE_FORMAT(CURDATE(),'%Y-%m-01')"));
    const sommeRepartition = surDouzeMois.repartition.reduce((s, r) => s + r.montant, 0);
    ok('Et son total est EXACTEMENT celui de la base sur cette période',
      Math.abs(sommeRepartition - achatsDouzeMois) < 1,
      sommeRepartition + ' contre ' + achatsDouzeMois);

    /* On revient a l axe par defaut pour la suite du parcours. */
    await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('pilotage #barrePeriode combobox[itemId=axe]')[0];
      c.setValue('MOIS');
      c.fireEvent('select', c, [c.findRecordByValue('MOIS')]);
    });
    await p.waitForTimeout(9000);
    ok('Sans filtre, l écran dit que le montant est celui des bons',
      /bons de livraison clôturés/.test(achats.note), achats.note);
    ok('Le filtre grossiste ne propose que ceux qui ont livré sur la fenêtre',
      achats.grossistesFiltre > 0, achats.grossistesFiltre + ' proposé(s)');

    /* Un filtre de famille fait passer au calcul sur les LIGNES : l ecran doit le dire. */
    const famille = q("SELECT lg_FAMILLEARTICLE_ID FROM t_famillearticle LIMIT 1");
    const avecFamille = await p.evaluate(async (f) => {
      const r = await fetch('../api/v1/pilotage/onglet/achats?axe=MOIS&familleId=' + encodeURIComponent(f));
      const j = JSON.parse(await r.text());
      let valeur = null;
      (j.tuiles || []).forEach((t) => { if (t.cle === 'achats') { valeur = t.valeur; } });
      return { base: j.base, note: j.note, valeur: valeur };
    }, famille);
    ok('Un filtre de famille fait passer le calcul sur les LIGNES',
      avecFamille.base === 'lignes', JSON.stringify(avecFamille.base));
    ok('Et l écran le DIT, pour qu on ne croie pas avoir perdu des achats',
      /LIGNES/.test(avecFamille.note) && /quantité reçue/.test(avecFamille.note), avecFamille.note);
    const lignesBase = Number(q("SELECT COALESCE(SUM(d.int_PAF*d.int_QTE_RECUE),0)"
      + " FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID=d.lg_BON_LIVRAISON_ID"
      + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID=d.lg_FAMILLE_ID"
      + " WHERE b.str_STATUT='is_Closed' AND b.dt_UPDATED>='" + moisCourant + "'"
      + " AND b.dt_UPDATED<'" + lendemain + "' AND f.lg_FAMILLEARTICLE_ID='" + famille + "'"));
    ok('Le montant filtré est exactement la somme des lignes retenues',
      Math.abs(avecFamille.valeur - lignesBase) < 1, avecFamille.valeur + ' contre ' + lignesBase);

    /*
     * Sur DOUZE MOIS GLISSANTS : la repartition suit maintenant la periode choisie, et un mois sans achat rendrait
     * un tableau vide - ce qui ne dirait rien du filtre que l'on veut controler ici.
     */
    const avecGrossiste = await p.evaluate(async (g) => {
      const r = await fetch('../api/v1/pilotage/onglet/achats?axe=G12&grossisteId=' + encodeURIComponent(g));
      const j = JSON.parse(await r.text());
      let valeur = null;
      (j.tuiles || []).forEach((t) => { if (t.cle === 'achats') { valeur = t.valeur; } });
      return { base: j.base, valeur: valeur, repartition: (j.repartition || []).length };
    }, q("SELECT g.lg_GROSSISTE_ID FROM t_grossiste g JOIN t_order o ON o.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID"
      + " JOIN t_bon_livraison b ON b.lg_ORDER_ID=o.lg_ORDER_ID WHERE b.str_STATUT='is_Closed' LIMIT 1"));
    ok('Le filtre grossiste, lui, garde le montant des bons et ne retient qu un fournisseur',
      avecGrossiste.base === 'entete' && avecGrossiste.repartition === 1,
      JSON.stringify(avecGrossiste));

    /* --------------------------------------------------------------- CAISSE ET TIERS-PAYANT */
    await changerOnglet('Caisse & tiers-payant');
    const caisse = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const tuiles = [];
      e.stores.caisse.tuiles.each((r) => tuiles.push({ cle: r.get('cle'), valeur: r.get('valeur') }));
      const lignes = [];
      e.stores.caisse.mois.each((r) => lignes.push({ mois: r.get('mois'), caTTC: r.get('caTTC'),
        encaisse: r.get('encaisse'), credit: r.get('credit'), partComptant: r.get('partComptant'),
        tp: r.get('partTiersPayant'), tpRegle: r.get('tpRegle') }));
      return { tuiles: tuiles, lignes: lignes,
        colonnes: e.down('#detail-caisse').headerCt.getGridColumns().map((c) => c.text) };
    });
    ok('L onglet Caisse & tiers-payant donne l encaissé, le crédit, le TP facturé et le TP réglé',
      caisse.tuiles.map((t) => t.cle).join(',') === 'encaisse,credit,tpFacture,tpRegle,caTTC',
      JSON.stringify(caisse.tuiles.map((t) => t.cle)));
    ok('Encaissé + crédit = chiffre d affaires, mois par mois',
      caisse.lignes.length > 0 && caisse.lignes.every((l) =>
        Math.abs((l.encaisse + l.credit) - l.caTTC) < 1),
      JSON.stringify(caisse.lignes.slice(0, 2)));
    ok('La part comptant est l encaissé rapporté au chiffre d affaires',
      caisse.lignes.every((l) => l.caTTC === 0
        || Math.abs(l.partComptant - (l.encaisse / l.caTTC * 100)) < 0.1),
      JSON.stringify(caisse.lignes.slice(0, 2)));

    const moisAvecTp = caisse.lignes.filter((l) => l.tpRegle > 0)[0];
    if (moisAvecTp) {
      const regleBase = Number(q("SELECT COALESCE(SUM(dbl_AMOUNT),0) FROM t_dossier_reglement"
        + " WHERE DATE_FORMAT(dt_REGLEMENT,'%Y-%m')='" + moisAvecTp.mois + "'"));
      ok('Le tiers payant réglé est exactement celui des règlements de dossiers, à leur date de règlement',
        Math.abs(moisAvecTp.tpRegle - regleBase) < 1, moisAvecTp.tpRegle + ' contre ' + regleBase);
    } else {
      ok('Aucun règlement de tiers payant sur la fenêtre de ce jeu d essai : rien à comparer', true);
    }
    const moisAvecTpFacture = caisse.lignes.filter((l) => l.tp > 0)[0];
    if (moisAvecTpFacture) {
      const factureBase = Number(q("SELECT COALESCE(SUM(CASE WHEN p.str_TYPE_VENTE='VO'"
        + " THEN (p.int_PRICE - COALESCE(p.int_CUST_PART,0)) ELSE 0 END),0) FROM t_preenregistrement p"
        + " WHERE p.int_PRICE>0 AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0"
        + " AND p.lg_TYPE_VENTE_ID<>'5' AND DATE_FORMAT(p.dt_UPDATED,'%Y-%m')='" + moisAvecTpFacture.mois + "'"));
      ok('Le tiers payant facturé est exactement la part non payée au comptoir',
        Math.abs(moisAvecTpFacture.tp - factureBase) < 1, moisAvecTpFacture.tp + ' contre ' + factureBase);
    } else {
      ok('Aucune vente ordonnancière sur la fenêtre : rien à comparer', true);
    }

    /* --------------------------------------------------------------- éditions des deux onglets */
    const pdfAchats = await p.evaluate(async () => {
      const r = await fetch('../api/v1/pilotage/pdf?onglet=achats&axe=VS_M1');
      return { statut: r.status, octets: Array.from(new Uint8Array(await r.arrayBuffer())) };
    });
    const texteAchats = texteDuPdf(pdfAchats.octets);
    ok('L édition des Achats répond et porte son titre, ses colonnes et ses totaux',
      pdfAchats.statut === 200 && /PILOTAGE - ACHATS/.test(texteAchats) && /ACHATS/.test(texteAchats)
      && texteAchats.indexOf('TOTAL') >= 0, texteAchats.slice(0, 260));
    const pdfCaisse = await p.evaluate(async () => {
      const r = await fetch('../api/v1/pilotage/pdf?onglet=caisse&axe=MOIS');
      return { statut: r.status, octets: Array.from(new Uint8Array(await r.arrayBuffer())) };
    });
    const texteCaisse = texteDuPdf(pdfCaisse.octets);
    ok('L édition Caisse & tiers-payant répond et porte ses colonnes',
      pdfCaisse.statut === 200 && /PILOTAGE - CAISSE/.test(texteCaisse) && /TP RÉGLÉ|TP R/.test(texteCaisse),
      texteCaisse.slice(0, 260));
    const excelAchats = await p.evaluate(async () => {
      const r = await fetch('../api/v1/pilotage/excel?onglet=achats&axe=MOIS');
      const octets = new Uint8Array(await r.arrayBuffer());
      let t = '';
      for (let i = 0; i < octets.length; i++) { t += String.fromCharCode(octets[i]); }
      return { statut: r.status, taille: octets.length, texte: t.split(String.fromCharCode(0)).join('') };
    });
    ok('L export Excel des Achats porte les colonnes de grossistes',
      excelAchats.statut === 200 && excelAchats.texte.indexOf('ACHATS') >= 0
      && excelAchats.texte.indexOf(premierGrossiste) >= 0, JSON.stringify(premierGrossiste));

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + String(e.stack).slice(0, 280));
  } finally {
    await b.close();
    const bons = res.filter((x) => x.c).length;
    console.log('\n' + bons + '/' + res.length + ' controles OK');
    process.exit(bons === res.length ? 0 : 1);
  }
})();
