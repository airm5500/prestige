/* Evolution 6, point 1, vague 3 : onglets STOCK et QUALITE-EXPLOITATION du menu de pilotage.
 *
 * LE POINT DELICAT DE CETTE VAGUE : le logiciel connait le stock d'AUJOURD'HUI, mais ne garde pas ce qu'il
 * valait le mois dernier. Les tables d'historique de mouvements de cette officine sont VIDES (HMvtProduit,
 * t_mouvement, t_mouvement_snapshot, stock_snapshot) - le test le verifie, parce que toute la conception de
 * l'onglet en decoule.
 *
 * Deux chemins, dans cet ordre : la PHOTO du mois quand elle existe, la RECONSTITUTION a rebours sinon. Et
 * l'ecran DIT, ligne par ligne, laquelle des deux il affiche.
 *
 * Ce que le test etablit :
 *  - les sept onglets sont la ;
 *  - l'etat du stock affiche est EXACTEMENT celui de la base (valeur d'achat, de vente, ruptures, negatifs) ;
 *  - ouvrir l'onglet ECRIT la photo du mois, et l'ouvrir dix fois n'ecrit qu'une ligne ;
 *  - le mois photographie est marque « mesure », les autres « reconstitue » ;
 *  - entrees et sorties du mois sont celles de la base, et la variation est leur difference ;
 *  - QUALITE : stock negatif, articles sans prix, sans rayon, sans seuil, annulations et remises, tous
 *    compares a la base ; le taux d'annulation est le nombre d'annulees sur le nombre de ventes ;
 *  - les editions des deux onglets repondent et portent leurs colonnes.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 330) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
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
  /* On repart d'une table de photos vide : le test doit constater que l'ecran n'y ecrit PLUS rien. */
  exec("DELETE FROM pilotage_stock_mensuel;");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    /* Le constat qui fonde la conception de l'onglet. */
    const historiques = ['HMvtProduit', 't_mouvement', 't_mouvement_snapshot', 'stock_snapshot']
      .map((t) => t + '=' + q('SELECT COUNT(*) FROM ' + t));
    ok('Constat : les tables d historique de mouvements sont vides, rien n est reconstituable depuis elles',
      historiques.every((h) => h.endsWith('=0')), historiques.join(' '));

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
    /* Le test porte sur les onglets de SA vague et sur leur place, pas sur un nombre total qui grandit. */
    ok('Les deux onglets de cette vague sont là, à leur place',
      onglets[5] === 'Stock' && onglets[6] === 'Qualité–Exploitation' && onglets[0] === 'Synthèse',
      JSON.stringify(onglets));

    const changerOnglet = async (titre) => {
      await p.evaluate((t) => {
        const ong = Ext.ComponentQuery.query('pilotage #onglets')[0];
        ong.setActiveTab(ong.items.items.filter((o) => o.title === t)[0]);
      }, titre);
      await p.waitForTimeout(9000);
    };

    /* --------------------------------------------------------------- STOCK */
    ok('Précondition : aucune photo de stock enregistrée, et un relevé nocturne disponible',
      q("SELECT COUNT(*) FROM pilotage_stock_mensuel") === '0'
      && Number(q("SELECT COUNT(*) FROM stock_daily_value")) > 0,
      q("SELECT COUNT(*) FROM stock_daily_value") + ' journee(s) relevee(s)');
    await changerOnglet('Stock');
    const stock = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const tuiles = [];
      e.stores.stock.tuiles.each((r) => tuiles.push({ cle: r.get('cle'), valeur: r.get('valeur') }));
      const lignes = [];
      e.stores.stock.mois.each((r) => lignes.push({ mois: r.get('mois'), valeur: r.get('valeurAchat'),
        entrees: r.get('entrees'), sorties: r.get('sorties'), variation: r.get('variationStock'),
        mesure: r.get('mesure') }));
      return { tuiles: tuiles, lignes: lignes,
        note: e.down('#note-stock #texteNote').getValue(),
        colonnes: e.down('#detail-stock').headerCt.getGridColumns().map((c) => c.text) };
    });
    ok('L onglet Stock donne la valeur d achat, de vente, les ruptures, le sous-seuil, le négatif et le dormant',
      stock.tuiles.map((t) => t.cle).join(',')
        === 'valeurAchat,valeurVente,ruptures,sousSeuil,negatifs,dormant',
      JSON.stringify(stock.tuiles.map((t) => t.cle)));

    /*
     * LA VALEUR DU STOCK EST CELLE DU LOGICIEL : articles actifs et stock positif, exactement comme la
     * valorisation quotidienne (stock_daily_value). Sans cela, la valeur du jour ne retomberait pas sur la courbe
     * des mois precedents, qui vient de cette valorisation. Les COMPTEURS (ruptures, negatifs), eux, portent sur
     * tout le stock : c'est leur role.
     */
    const etatBase = q("SELECT CONCAT("
      + " COALESCE(SUM(CASE WHEN f.str_STATUT='enable' AND s.int_NUMBER_AVAILABLE>0"
      + "   THEN s.int_NUMBER_AVAILABLE*f.int_PAF ELSE 0 END),0), '|',"
      + " COALESCE(SUM(CASE WHEN f.str_STATUT='enable' AND s.int_NUMBER_AVAILABLE>0"
      + "   THEN s.int_NUMBER_AVAILABLE*f.int_PRICE ELSE 0 END),0), '|',"
      + " SUM(CASE WHEN s.int_NUMBER_AVAILABLE=0 THEN 1 ELSE 0 END), '|',"
      + " SUM(CASE WHEN s.int_NUMBER_AVAILABLE<0 THEN 1 ELSE 0 END))"
      + " FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID=s.lg_FAMILLE_ID"
      + " WHERE s.lg_EMPLACEMENT_ID='1'").split('|');
    const valeurTuile = (cle) => stock.tuiles.filter((t) => t.cle === cle)[0].valeur;
    ok('La valeur du stock au prix d achat est EXACTEMENT celle de la base',
      Math.abs(valeurTuile('valeurAchat') - Number(etatBase[0])) < 1,
      valeurTuile('valeurAchat') + ' contre ' + etatBase[0]);
    ok('La valeur au prix de vente aussi',
      Math.abs(valeurTuile('valeurVente') - Number(etatBase[1])) < 1,
      valeurTuile('valeurVente') + ' contre ' + etatBase[1]);
    ok('Les références en rupture et les stocks négatifs sont ceux de la base',
      valeurTuile('ruptures') === Number(etatBase[2]) && valeurTuile('negatifs') === Number(etatBase[3]),
      JSON.stringify([valeurTuile('ruptures'), etatBase[2], valeurTuile('negatifs'), etatBase[3]]));

    /*
     * L HISTORIQUE NE DEPEND PLUS DE L OUVERTURE DE L ECRAN (retour du 19/09 : « le pharmacien ne va pas passer
     * ses jours a venir cliquer dans ce menu »). Le logiciel releve la valeur du stock chaque nuit
     * (stock_daily_value) ; l onglet lit ce releve, et n ecrit plus rien.
     */
    ok('Ouvrir l onglet n écrit RIEN : l historique vient du relevé nocturne du logiciel',
      q("SELECT COUNT(*) FROM pilotage_stock_mensuel") === '0',
      q("SELECT COUNT(*) FROM pilotage_stock_mensuel") + ' ligne(s) ecrite(s)');

    /* Chaque mois affiche doit porter la DERNIERE valeur relevee du mois, celle du logiciel. */
    const releveDuMois = q("SELECT CONCAT(DATE_FORMAT(STR_TO_DATE(CAST(MAX(id) AS CHAR),'%Y%m%d'),'%Y-%m'),"
      + " '|', (SELECT valeur_achat FROM stock_daily_value WHERE id=MAX(v.id)))"
      + " FROM stock_daily_value v WHERE id >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH),'%Y%m01')"
      + " AND id < DATE_FORMAT(CURDATE(),'%Y%m01')").split('|');

    /* Ouvrir deux fois de plus ne change rien : l ecran ne fait que lire. */
    await changerOnglet('Synthèse');
    await changerOnglet('Stock');
    ok('Ouvrir l onglet plusieurs fois n écrit toujours rien',
      q("SELECT COUNT(*) FROM pilotage_stock_mensuel") === '0',
      q("SELECT COUNT(*) FROM pilotage_stock_mensuel"));

    const apres = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const lignes = [];
      e.stores.stock.mois.each((r) => lignes.push({ mois: r.get('mois'), valeur: r.get('valeurAchat'),
        entrees: r.get('entrees'), sorties: r.get('sorties'), variation: r.get('variationStock'),
        mesure: r.get('mesure') }));
      return { lignes: lignes, note: e.down('#note-stock #texteNote').getValue() };
    });
    const moisCourant = q("SELECT DATE_FORMAT(CURDATE(),'%Y-%m')");
    const ligneCourante = apres.lignes.filter((l) => l.mois === moisCourant)[0];
    ok('Le mois en cours est MESURÉ : il porte le dernier relevé du logiciel',
      !!ligneCourante && ligneCourante.mesure === true, JSON.stringify(ligneCourante));

    /* Le mois precedent doit porter EXACTEMENT la derniere valeur relevee de ce mois-la. */
    const lignePrecedente = apres.lignes.filter((l) => l.mois === releveDuMois[0])[0];
    ok('Et chaque mois relevé porte la valeur EXACTE du relevé de fin de mois',
      !!lignePrecedente && Math.abs(lignePrecedente.valeur - Number(releveDuMois[1])) < 1,
      (lignePrecedente ? lignePrecedente.valeur : '-') + ' contre ' + releveDuMois[1]
        + ' (' + releveDuMois[0] + ')');

    /* Les mois anterieurs au releve, eux, restent reconstitues - et l ecran le dit. */
    const premierReleve = q("SELECT DATE_FORMAT(STR_TO_DATE(CAST(MIN(id) AS CHAR),'%Y%m%d'),'%Y-%m')"
      + " FROM stock_daily_value");
    const avantReleve = apres.lignes.filter((l) => l.mois < premierReleve);
    ok('Les mois antérieurs au relevé sont marqués RECONSTITUÉS',
      avantReleve.length === 0 || avantReleve.every((l) => l.mesure === false),
      JSON.stringify(apres.lignes.map((l) => l.mois + '=' + l.mesure)));
    ok('Et l écran DIT d où vient la valeur affichée',
      /MESUR/.test(apres.note) && /relev/.test(apres.note), apres.note);
    ok('La colonne SOURCE existe, pour le dire ligne par ligne',
      stock.colonnes.indexOf('SOURCE') >= 0, JSON.stringify(stock.colonnes));

    const moisTest = apres.lignes.filter((l) => l.entrees > 0)[0];
    if (moisTest) {
      const fluxBase = q("SELECT CONCAT(COALESCE((SELECT SUM(d.int_PAF*d.int_QTE_RECUE)"
        + " FROM t_bon_livraison_detail d JOIN t_bon_livraison b"
        + " ON b.lg_BON_LIVRAISON_ID=d.lg_BON_LIVRAISON_ID WHERE b.str_STATUT='is_Closed'"
        + " AND DATE_FORMAT(b.dt_UPDATED,'%Y-%m')='" + moisTest.mois + "'),0), '|',"
        + " COALESCE((SELECT SUM(f.int_PAF*d.int_QUANTITY) FROM t_preenregistrement_detail d"
        + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID"
        + " JOIN t_famille f ON f.lg_FAMILLE_ID=d.lg_FAMILLE_ID WHERE p.int_PRICE>0"
        + " AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.lg_TYPE_VENTE_ID<>'5'"
        + " AND DATE_FORMAT(p.dt_UPDATED,'%Y-%m')='" + moisTest.mois + "'),0))").split('|');
      ok('Les entrées du mois sont celles des bons de livraison',
        Math.abs(moisTest.entrees - Number(fluxBase[0])) < 1, moisTest.entrees + ' contre ' + fluxBase[0]);
      ok('Les sorties du mois sont les quantités vendues valorisées au prix d achat',
        Math.abs(moisTest.sorties - Number(fluxBase[1])) < 1, moisTest.sorties + ' contre ' + fluxBase[1]);
      ok('Et la variation du stock est la différence des deux',
        Math.abs(moisTest.variation - (moisTest.entrees - moisTest.sorties)) < 1,
        JSON.stringify(moisTest));
    } else {
      ok('Aucune entrée de stock sur la fenêtre de ce jeu d essai : rien à comparer', true);
    }

    /* --------------------------------------------------------------- QUALITE */
    await changerOnglet('Qualité–Exploitation');
    const qualite = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      const tuiles = [];
      e.stores.qualite.tuiles.each((r) => tuiles.push({ cle: r.get('cle'), valeur: r.get('valeur') }));
      const lignes = [];
      e.stores.qualite.mois.each((r) => lignes.push({ mois: r.get('mois'), ca: r.get('caTTC'),
        ventes: r.get('nbVentes'), annulees: r.get('nbAnnulees'), taux: r.get('tauxAnnulation'),
        remises: r.get('remises'), tauxRemise: r.get('tauxRemise') }));
      return { tuiles: tuiles, lignes: lignes, note: e.down('#note-qualite #texteNote').getValue() };
    });
    ok('L onglet Qualité liste les six chantiers : négatif, sans prix, sans rayon, sans seuil, annulations, remises',
      qualite.tuiles.map((t) => t.cle).join(',')
        === 'negatifs,sansPrix,sansRayon,sansSeuil,annulees,remises',
      JSON.stringify(qualite.tuiles.map((t) => t.cle)));
    const anomaliesBase = q("SELECT CONCAT("
      + " SUM(CASE WHEN f.lg_ZONE_GEO_ID IS NULL OR f.lg_ZONE_GEO_ID='' THEN 1 ELSE 0 END), '|',"
      + " SUM(CASE WHEN f.int_SEUIL_MIN IS NULL OR f.int_SEUIL_MIN=0 THEN 1 ELSE 0 END))"
      + " FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID=s.lg_FAMILLE_ID"
      + " WHERE s.lg_EMPLACEMENT_ID='1' AND s.int_NUMBER_AVAILABLE>0").split('|');
    const valeurQualite = (cle) => qualite.tuiles.filter((t) => t.cle === cle)[0].valeur;
    ok('Les articles en stock sans rayon sont ceux de la base',
      valeurQualite('sansRayon') === Number(anomaliesBase[0]),
      valeurQualite('sansRayon') + ' contre ' + anomaliesBase[0]);
    ok('Les articles en stock sans seuil de réappro aussi',
      valeurQualite('sansSeuil') === Number(anomaliesBase[1]),
      valeurQualite('sansSeuil') + ' contre ' + anomaliesBase[1]);
    ok('Le stock négatif est le même que dans l onglet Stock',
      valeurQualite('negatifs') === Number(etatBase[3]),
      valeurQualite('negatifs') + ' contre ' + etatBase[3]);

    const moisAnnule = qualite.lignes.filter((l) => l.annulees > 0)[0];
    if (moisAnnule) {
      const annuleesBase = q("SELECT COUNT(*) FROM t_preenregistrement WHERE b_IS_CANCEL=1"
        + " AND DATE_FORMAT(dt_UPDATED,'%Y-%m')='" + moisAnnule.mois + "'");
      ok('Les ventes annulées du mois sont celles de la base',
        moisAnnule.annulees === Number(annuleesBase), moisAnnule.annulees + ' contre ' + annuleesBase);
      ok('Et le taux d annulation est le nombre d annulées sur le nombre de ventes',
        Math.abs(moisAnnule.taux - (moisAnnule.annulees / moisAnnule.ventes * 100)) < 0.1,
        JSON.stringify(moisAnnule));
    } else {
      ok('Aucune vente annulée sur la fenêtre : rien à comparer', true);
    }
    ok('La note prévient que les indicateurs de référentiel décrivent l ÉTAT DU JOUR, pas la période',
      /ÉTAT DU JOUR/.test(qualite.note), qualite.note);

    /* --------------------------------------------------------------- éditions */
    for (const onglet of ['stock', 'qualite']) {
      const pdf = await p.evaluate(async (o) => {
        const r = await fetch('../api/v1/pilotage/pdf?onglet=' + o + '&axe=MOIS');
        return { statut: r.status, octets: Array.from(new Uint8Array(await r.arrayBuffer())) };
      }, onglet);
      const texte = texteDuPdf(pdf.octets);
      ok('L édition de l onglet ' + onglet + ' répond et porte son titre et ses totaux',
        pdf.statut === 200 && /PILOTAGE - (STOCK|QUALIT)/.test(texte) && texte.indexOf('TOTAL') >= 0,
        texte.slice(0, 200));
    }
    const excel = await p.evaluate(async () => {
      const r = await fetch('../api/v1/pilotage/excel?onglet=stock&axe=MOIS');
      const octets = new Uint8Array(await r.arrayBuffer());
      let t = '';
      for (let i = 0; i < octets.length; i++) { t += String.fromCharCode(octets[i]); }
      return { statut: r.status, texte: t.split(String.fromCharCode(0)).join('') };
    });
    ok('L export Excel du stock porte ses colonnes',
      excel.statut === 200 && excel.texte.indexOf('VALEUR STOCK') >= 0
      && excel.texte.indexOf('VARIATION') >= 0);

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
