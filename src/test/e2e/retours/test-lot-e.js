/* Lot E - point 16 : recapitulatif caisse / recette.
 *
 * - detail des paiements mobiles sur UNE ligne, au pied de chaque journee ;
 * - colonne Ecart : rouge si comptant < billetage, vert si comptant > billetage, tiret sans billetage ;
 * - lignes mobile money au pied de chaque journee sur la vue, le PDF et le classeur Excel ;
 * - solde = comptant + mobile + reglement tiers payant + reglement differe ;
 * - « Mensuelle » a cote d'« Annuelle » ;
 * - le bouton existant rend un vrai .xlsx.
 *
 * Le banc n'a ni vente_reglement, ni mouvement de caisse, ni billetage : le test pose son propre
 * jeu d'essai autour de ventes reelles, aux montants CHOISIS, de sorte que chaque total attendu se
 * calcule a la main. Tout est retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-LOT-E';
const TMP = '/tmp/lot-e';

/* Deux journees, montants choisis :
   J1 : especes 10 000, ORANGE 3 000, MTN 2 000, cheque 1 000 ; billetage 9 000 -> ecart +1 000 (vert)
   J2 : especes  4 000, WAVE   1 500                          ; billetage 6 000 -> ecart -2 000 (rouge)
   Solde attendu = especes + mobile (aucun reglement TP ni differe pose).
   Retours des tests 4 : J1 porte aussi une entree de caisse de 3 000 et une sortie de 500 (mouvements de caisse) :
   le solde de J1 vaut 15 000 + 3 000 - 500 = 17 500, et la journee porte une rubrique « Mouvements de caisse ». */
const ENTREE = '5', SORTIE = '4';
const MOUVEMENTS_J1 = [[ENTREE, 3000], [SORTIE, 500]];
const ESP = '1', ORANGE = '7', MTN = '9', WAVE = '10', CHEQUE = '2';
const JOURS = [
  { rang: 0, especes: 10000, mobiles: [[ORANGE, 3000], [MTN, 2000]], cheque: 1000, billetage: 9000 },
  { rang: 1, especes: 4000, mobiles: [[WAVE, 1500]], cheque: 0, billetage: 6000 }
];

function ventes(n) {
  return q("SELECT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p WHERE p.str_STATUT='is_Closed'"
    + " AND p.b_IS_CANCEL=0 AND p.imported=0 AND p.int_PRICE>0 AND p.lg_TYPE_VENTE_ID<>'5'"
    + " AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v)"
    + " LIMIT " + n).split('\n').filter(Boolean);
}

function poserJeuDEssai(dates) {
  const ids = ventes(JOURS.length);
  if (ids.length < JOURS.length) { return 0; }
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  JOURS.forEach(function (jour, i) {
    const venteId = ids[i];
    const date = dates[i];
    let n = 0;
    const reglement = function (mode, montant) {
      exec("INSERT INTO vente_reglement (id,flaged_amount,montant,montant_attentu,mvtDate,vente_id,type_regelement,"
        + "ug_amount,ug_amount_net,amount_non_ca,montant_verse) VALUES ('" + MARQUE + '-' + i + '-' + (n++)
        + "',0," + montant + "," + montant + ",'" + date + " 10:0" + n + ":00','" + venteId + "','" + mode
        + "',0,0,0," + montant + ");");
    };
    const total = jour.especes + jour.mobiles.reduce((t, m) => t + m[1], 0) + jour.cheque;
    reglement(ESP, jour.especes);
    jour.mobiles.forEach(function (m) { reglement(m[0], m[1]); });
    if (jour.cheque) { reglement(CHEQUE, jour.cheque); }
    // le mouvement rattache la vente a l'emplacement et a la journee
    /* Les montants du mouvement ne sont pas facultatifs pour le recapitulatif : la requete les
       additionne, et un NULL y ferait echouer la lecture de toute la journee. */
    exec("INSERT INTO mvttransaction (uuid,categorie,createdAt,mvtdate,pkey,reference,typeTransaction,caisse,"
      + "lg_EMPLACEMENT_ID,lg_USER_ID,montant,vente_id,montantRestant,montantNet,montantTva,montantCredit)"
      + " VALUES ('" + MARQUE + '-M-' + i + "',1,'" + date + " 10:00:00','" + date + "','" + venteId + "','"
      + MARQUE + "',1,'1','1','" + user + "',0,'" + venteId + "',0," + total + ",0,0);");
    exec("UPDATE t_preenregistrement SET dt_UPDATED='" + date + " 10:00:00' WHERE lg_PREENREGISTREMENT_ID='"
      + venteId + "';");
    if (i === 0) {
      MOUVEMENTS_J1.forEach(function (m, k) {
        exec("INSERT INTO mvttransaction (uuid,categorie,createdAt,mvtdate,pkey,reference,typeTransaction,caisse,"
          + "lg_EMPLACEMENT_ID,lg_USER_ID,montant,typeMvtCaisseId,typeReglementId)"
          + " VALUES ('" + MARQUE + '-MV-' + k + "',3,'" + date + " 11:00:00','" + date + "','" + MARQUE + '-MV-' + k + "','"
          + MARQUE + "',3,'1','1','" + user + "'," + m[1] + ",'" + m[0] + "','1');");
      });
    }
    exec("INSERT INTO t_billetage (lg_BILLETAGE_ID,ld_CAISSE_ID,int_AMOUNT,lg_USER_ID,dt_CREATED,dt_UPDATED)"
      + " VALUES ('" + MARQUE + '-B-' + i + "','1'," + jour.billetage + ",'" + user + "','" + date
      + " 20:00:00','" + date + " 20:00:00');");
  });
  fs.writeFileSync(TMP + '/ventes.json', JSON.stringify(ids));
  return ids.length;
}

function retirerJeuDEssai() {
  exec("DELETE FROM vente_reglement WHERE id LIKE '" + MARQUE + "-%';"
    + "DELETE FROM mvttransaction WHERE reference='" + MARQUE + "';"
    + "DELETE FROM t_billetage WHERE lg_BILLETAGE_ID LIKE '" + MARQUE + "-B-%';");
}

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  retirerJeuDEssai();
  // deux journees consecutives dans le passe proche, hors de toute donnee existante
  const j1 = q("SELECT DATE_SUB(CURDATE(), INTERVAL 400 DAY)");
  const j2 = q("SELECT DATE_SUB(CURDATE(), INTERVAL 399 DAY)");
  const poses = poserJeuDEssai([j1, j2]);
  ok('jeu d essai en place (2 journees aux montants choisis)', poses === 2, j1 + ' / ' + j2);

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2500);

  const appel = (url) => p.evaluate(async (u) => {
    const r = await fetch(u);
    return { statut: r.status, corps: await r.text() };
  }, url);

  const periode = '&dtStart=' + j1 + '&dtEnd=' + j2 + '&typeRglementId=';

  /* ------------------------------------------------- donnees du tableau */
  const r = await appel('../api/v1/stats-recette-caisse/data?granularite=jour' + periode);
  const json = JSON.parse(r.corps);
  const lignes = json.data || [];
  ok('le recapitulatif rend les deux journees', lignes.length === 2, JSON.stringify(lignes).slice(0, 400));

  const l1 = lignes[0] || {}, l2 = lignes[1] || {};
  ok('journee 1 : comptant = 10 000', l1.montantEspece === 10000, JSON.stringify(l1));
  ok('journee 1 : mobile = 5 000 (Orange 3 000 + MTN 2 000)', l1.montantMobile === 5000, JSON.stringify(l1));
  ok('journee 1 : le detail mobile porte les deux operateurs',
     l1.detailMobile && Object.keys(l1.detailMobile).length === 2, JSON.stringify(l1.detailMobile));
  ok('journee 1 : la somme du detail vaut le montant mobile',
     Object.values(l1.detailMobile || {}).reduce((t, v) => t + v, 0) === l1.montantMobile);
  ok('journee 1 : billetage = 9 000', l1.montantBilletage === 9000);
  ok('journee 1 : ecart = +1 000 (comptant superieur au billetage)', l1.montantEcart === 1000, l1.montantEcart);
  ok('journee 1 : le billetage est signale comme saisi', l1.billetageSaisi === true);
  // solde = comptant + mobile + reglement TP + reglement differe ; le cheque n'y entre PAS
  ok('journee 1 : entree de caisse 3 000 et sortie 500 lues', l1.montantEntre === 3000 && l1.montantSortie === 500,
     'entree=' + l1.montantEntre + ' sortie=' + l1.montantSortie);
  ok('journee 1 : solde = 17 500 (comptant + mobile + entrees - sorties, sans le cheque)', l1.montantSolde === 17500,
     'solde=' + l1.montantSolde + ' cheque=' + l1.montantCheque);
  ok('journee 1 : le cheque est bien encaisse par ailleurs', l1.montantCheque === 1000);

  ok('journee 2 : comptant = 4 000', l2.montantEspece === 4000, JSON.stringify(l2));
  ok('journee 2 : mobile = 1 500', l2.montantMobile === 1500);
  ok('journee 2 : ecart = -2 000 (comptant inferieur au billetage)', l2.montantEcart === -2000, l2.montantEcart);
  ok('journee 2 : solde = 5 500 (aucun mouvement de caisse)', l2.montantSolde === 5500 && !l2.montantEntre && !l2.montantSortie, l2.montantSolde);

  /* ------------------------------------------------- regroupement mensuel */
  const mensuel = JSON.parse((await appel('../api/v1/stats-recette-caisse/data?granularite=mois' + periode)).corps);
  const lm = mensuel.data || [];
  ok('regroupement mensuel : une seule ligne pour le mois', lm.length === 1, JSON.stringify(lm).slice(0, 250));
  ok('regroupement mensuel : le libelle est MM/aaaa', /^\d{2}\/\d{4}$/.test((lm[0] || {}).displayMvtDate || ''),
     (lm[0] || {}).displayMvtDate);
  ok('regroupement mensuel : comptant = 14 000', (lm[0] || {}).montantEspece === 14000, (lm[0] || {}).montantEspece);
  ok('regroupement mensuel : mobile = 6 500', (lm[0] || {}).montantMobile === 6500);
  ok('regroupement mensuel : les trois operateurs sont dans le detail',
     Object.keys((lm[0] || {}).detailMobile || {}).length === 3, JSON.stringify((lm[0] || {}).detailMobile));
  ok('regroupement mensuel : solde = 23 000 (20 500 + 3 000 - 500)', (lm[0] || {}).montantSolde === 23000, (lm[0] || {}).montantSolde);

  const annuel = JSON.parse((await appel('../api/v1/stats-recette-caisse/data?granularite=annee' + periode)).corps);
  ok('regroupement annuel : une seule ligne, libelle = annee',
     (annuel.data || []).length === 1 && /^\d{4}$/.test(((annuel.data || [])[0] || {}).displayMvtDate || ''),
     JSON.stringify((annuel.data || [])[0] || {}).slice(0, 150));

  /* ------------------------------------------------- PDF */
  const pdf = await p.evaluate(async ([a, z]) => {
    const rep = await fetch('../RecapRecetteCaisseServlet?typeRglementId=&dtStart=' + a + '&dtEnd=' + z
      + '&groupByYear=false&granularite=jour', { redirect: 'follow' });
    const buf = new Uint8Array(await rep.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i++) { bin += String.fromCharCode(buf[i]); }
    return { statut: rep.status, b64: btoa(bin) };
  }, [j1, j2]);
  const fpdf = TMP + '/recap.pdf';
  fs.writeFileSync(fpdf, Buffer.from(pdf.b64, 'base64'));
  ok('PDF : le serveur repond 200 (et non un 404 d edition manquante)', pdf.statut === 200, pdf.statut);
  ok('PDF : le contenu recu est bien un PDF', fs.readFileSync(fpdf).slice(0, 5).toString('latin1') === '%PDF-');
  const texte = execSync('pdftotext -layout ' + fpdf + ' -', { encoding: 'latin1' });
  ok('PDF : la colonne Ecart est presente', /\bcart\b/.test(texte), texte.split('\n').slice(0, 8).join(' | '));
  ok('PDF : les lignes mobile money sont au pied de chaque journee',
     (texte.match(/Mobile money :/g) || []).length === 2, (texte.match(/Mobile money :/g) || []).length);
  ok('PDF : le detail mobile tient sur une ligne, operateurs et montants',
     /Mobile money :.*ORANGE.*MTN/.test(texte) || /Mobile money :.*MTN.*ORANGE/.test(texte),
     (texte.match(/Mobile money :.*/g) || []).join(' // '));
  ok('PDF : la rubrique « Mouvements de caisse » n est editee que pour J1, avec entrees 3 000 et sorties 500',
     (texte.match(/Mouvements de caisse :/g) || []).length === 1 && /Mouvements de caisse :\s*entr.{1,2}es 3\s?000.*sorties 500/.test(texte),
     (texte.match(/Mouvements de caisse :.*/g) || []).join(' // '));
  ok('PDF : le solde de J1 edite vaut 17 500', /17\s?500/.test(texte), texte.split('\n').filter(l => /17\s?500/.test(l)).join(' | ').slice(0, 200));
  ok('PDF : le total general est edite', /TOTAL/.test(texte));

  /* ------------------------------------------------- Excel */
  const xls = await p.evaluate(async ([a, z]) => {
    const rep = await fetch('../api/v1/stats-recette-caisse/export-excel?typeRglementId=&dtStart=' + a
      + '&dtEnd=' + z + '&groupByYear=false&granularite=jour');
    const buf = new Uint8Array(await rep.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i++) { bin += String.fromCharCode(buf[i]); }
    return { statut: rep.status, type: rep.headers.get('content-type') || '', b64: btoa(bin) };
  }, [j1, j2]);
  const fxls = TMP + '/recap.xlsx';
  fs.writeFileSync(fxls, Buffer.from(xls.b64, 'base64'));
  ok('Excel : le serveur repond 200', xls.statut === 200, xls.statut + ' ' + xls.type);
  ok('Excel : le fichier est un vrai classeur .xlsx (et non un csv)',
     fs.readFileSync(fxls).slice(0, 2).toString('latin1') === 'PK', xls.type);
  const feuille = execSync("cd " + TMP + " && unzip -p recap.xlsx xl/sharedStrings.xml", { encoding: 'utf8' });
  ok('Excel : la colonne Ecart figure dans l en-tete', /crit|Écart|cart/.test(feuille));
  ok('Excel : le detail mobile money est present', /Mobile money|ORANGE/.test(feuille), feuille.slice(0, 200));
  ok('Excel : la rubrique des mouvements de caisse est presente', /Mouvements de caisse/.test(feuille), feuille.slice(0, 200));

  /* ------------------------------------------------- ecran */
  await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('caisserecetterecap', {}));
  await p.waitForFunction(() => Ext.ComponentQuery.query('caisserecetterecap #caisserecetterecapGrid').length > 0,
    null, { timeout: 20000 });
  await p.waitForTimeout(1500);
  const ecran = await p.evaluate(() => {
    const vue = Ext.ComponentQuery.query('caisserecetterecap')[0];
    const grille = vue.down('#caisserecetterecapGrid');
    return {
      annuelle: !!vue.down('#groupByYear'),
      mensuelle: !!vue.down('#groupByMonth'),
      colonnes: grille.columns.map(c => c.text || c.header),
      boutonExcel: !!vue.down('#btnExcel')
    };
  });
  ok('ecran : la case « Mensuelle » est a cote d « Annuelle »', ecran.annuelle && ecran.mensuelle,
     JSON.stringify(ecran));
  ok('ecran : la colonne Ecart est presente, entre le billetage et le solde',
     ecran.colonnes.indexOf('Écart') !== -1
     && ecran.colonnes.findIndex(c => /Billetage/i.test(c || '')) < ecran.colonnes.indexOf('Écart')
     && ecran.colonnes.indexOf('Écart') < ecran.colonnes.findIndex(c => /Solde/i.test(c || '')),
     ecran.colonnes.join(' | '));
  ok('ecran : le bouton d export est toujours la', ecran.boutonExcel === true);

  // les deux cases s'excluent
  const exclusion = await p.evaluate(() => {
    const vue = Ext.ComponentQuery.query('caisserecetterecap')[0];
    const an = vue.down('#groupByYear'), mo = vue.down('#groupByMonth');
    an.setValue(true); mo.setValue(true);
    const apresMois = { an: an.getValue(), mo: mo.getValue() };
    an.setValue(true);
    const apresAnnee = { an: an.getValue(), mo: mo.getValue() };
    an.setValue(false); mo.setValue(false);
    return { apresMois, apresAnnee };
  });
  ok('ecran : cocher « Mensuelle » decoche « Annuelle »',
     exclusion.apresMois.mo === true && exclusion.apresMois.an === false, JSON.stringify(exclusion));
  ok('ecran : cocher « Annuelle » decoche « Mensuelle »',
     exclusion.apresAnnee.an === true && exclusion.apresAnnee.mo === false, JSON.stringify(exclusion));

  // le rendu du detail mobile, tel que la ligne l'affiche
  const rendu = await p.evaluate((donnees) => {
    const grille = Ext.ComponentQuery.query('caisserecetterecap #caisserecetterecapGrid')[0];
    /* Retour du 09/09 (point 7) : plus de plugin « + » ; le detail est rendu par la fonctionnalite
       rowbody, toujours visible au pied de la journee. */
    const corps = grille.features.filter(function (f) { return f.ftype === 'rowbody' || f.detailTpl; })[0];
    const modele = Ext.create(grille.getStore().model, donnees);
    const html = corps.getAdditionalData(modele.getData(), 0, modele).rowBody;
    return { html: html, lignes: (html.match(/<div/g) || []).length };
  }, l1);
  ok('ecran : le detail mobile tient sur une ligne, suivi de la rubrique « Mouvements de caisse » (J1)',
     rendu.lignes === 2 && /ORANGE/.test(rendu.html) && /MTN/.test(rendu.html) && /Mouvements de caisse/.test(rendu.html)
     && /entr\u00e9es <b[^>]*>3[\s.,]?000/.test(rendu.html) && /sorties <b[^>]*>500/.test(rendu.html), rendu.html);
  // le total mobile est rappele apres le signe « = », en gras, avant la rubrique des mouvements
  ok('ecran : le total mobile est rappele au bout de sa ligne',
     rendu.html.indexOf(' = ') !== -1 && /5[\s.,]?000<\/span>\s*<\/div>/.test(rendu.html), rendu.html);
  const renduJ2 = await p.evaluate((donnees) => {
    const grille = Ext.ComponentQuery.query('caisserecetterecap #caisserecetterecapGrid')[0];
    const corps = grille.features.filter(function (f) { return f.ftype === 'rowbody' || f.detailTpl; })[0];
    const modele = Ext.create(grille.getStore().model, donnees);
    return corps.getAdditionalData(modele.getData(), 0, modele).rowBody;
  }, l2);
  ok('ecran : sans mouvement de caisse (J2), la rubrique n apparait pas', /WAVE/.test(renduJ2) && !/Mouvements de caisse/.test(renduJ2), renduJ2);
  const soldeTooltip = await p.evaluate(() => {
    const grille = Ext.ComponentQuery.query('caisserecetterecap #caisserecetterecapGrid')[0];
    return (grille.columns.find(c => /Solde/.test(c.text || '')) || {}).tooltip || '';
  });
  ok('ecran : l infobulle du solde dit que les entrees et sorties de caisse y entrent', /entr\u00e9es de caisse/.test(soldeTooltip) && /sorties de caisse/.test(soldeTooltip), soldeTooltip);

  ok('aucune erreur javascript', err.length === 0, err.join(' | '));
  await b.close();
  retirerJeuDEssai();
  ok('jeu d essai entierement retire',
     q("SELECT COUNT(*) FROM vente_reglement WHERE id LIKE '" + MARQUE + "-%'") === '0'
     && q("SELECT COUNT(*) FROM t_billetage WHERE lg_BILLETAGE_ID LIKE '" + MARQUE + "-B-%'") === '0');
  const echecs = res.filter(x => !x.c);
  console.log('\n' + (res.length - echecs.length) + '/' + res.length + ' OK');
  process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); try { retirerJeuDEssai(); } catch (x) { } process.exit(1); });
