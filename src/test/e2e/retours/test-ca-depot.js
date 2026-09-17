/* Evolution 5, point 1 : chiffre d'affaires du depot, et ventilation du ticket Z.
 *
 * Une vente jouee DANS un depot d'extension laisse son argent dans la caisse de l'operateur de l'officine :
 * son mouvement de caisse porte l'officine comme magasin, et c'est necessaire - l'argent est reellement dans
 * ce tiroir, et le ticket Z doit le voir.
 *
 * L'officine a decide que ce chiffre appartient au depot et ne se melange pas au sien. Le test etablit donc,
 * sur la meme vente et le meme jour :
 *  - le CA du DEPOT la compte ;
 *  - le CA de l'OFFICINE ne la compte pas ;
 *  - une vente d'officine ordinaire, elle, est comptee par l'officine et pas par le depot : NON-REGRESSION,
 *    le perimetre de l'officine n'a pas ete casse ;
 *  - le ticket Z de l'operateur la voit (l'argent est dans son tiroir) et la nomme, ligne « dont vente depot ».
 *
 * Tout ce que le test pose est retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

// Texte affiche par un PDF : les flux sont deflates, on en extrait les chaines.
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
    } catch (e) { /* flux non compresse ou police */ }
  }
  return out;
}

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 340) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const DEPOT = 'E2E-CAD-DEPOT';
const NOM_DEPOT = 'DEPOT E2E CA';
const MARQUE = 'E2E-CAD-STOCK';
const CAISSE = 'E2E-CAD-CAISSE';
const STOCK_DEPOT = 60;
const STOCK_OFFICINE = 80;
const QTE_DEPOT = 3;
const QTE_OFFICINE = 2;

const ventes = [];
let officineOrigine = null;
let produitDuTest = null;

function nettoyer() {
  const liste = ventes.length ? "('" + ventes.join("','") + "')" : "('-')";
  exec("CREATE TEMPORARY TABLE e2e_cad_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id"
    + " FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
    + "CREATE TEMPORARY TABLE e2e_cad_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement"
    + " WHERE lg_PREENREGISTREMENT_ID IN " + liste + " AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM vente_reglement WHERE vente_id IN " + liste + ";"
    + "DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN (SELECT id FROM e2e_cad_l);"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_cad_l);"
    + "DELETE FROM hmvtproduit WHERE lg_EMPLACEMENT_ID='" + DEPOT + "';"
    + "DELETE FROM mvttransaction WHERE pkey IN " + liste + ";"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN " + liste + ";"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID=NULL, lg_PARENT_ID=NULL,"
    + " lg_REGLEMENT_ID=NULL WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN " + liste + ";"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_cad_r);"
    + "DELETE FROM t_famille_stock WHERE lg_FAMILLE_STOCK_ID LIKE '" + MARQUE + "%';"
    + "DELETE FROM reference WHERE emplacement_id='" + DEPOT + "';"
    + "DELETE FROM t_emplacement WHERE lg_EMPLACEMENT_ID='" + DEPOT + "';"
    + "DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID='" + CAISSE + "';"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_cad_l; DROP TEMPORARY TABLE IF EXISTS e2e_cad_r;");
  if (produitDuTest && officineOrigine !== null) {
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=" + officineOrigine + ", int_NUMBER=" + officineOrigine
      + " WHERE lg_FAMILLE_ID='" + produitDuTest + "' AND lg_EMPLACEMENT_ID='1';");
  }
}

function poser() {
  nettoyer();
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='admin'");
  const compte = q("SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client LIMIT 1");
  exec("INSERT INTO t_emplacement (lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID, str_NAME, str_DESCRIPTION, str_LOCALITE,"
    + " str_FIRST_NAME, str_LAST_NAME, str_PHONE, dt_CREATED, dt_UPDATED, str_STATUT, lg_TYPEDEPOT_ID,"
    + " bool_SAME_LOCATION)"
    + " VALUES ('" + DEPOT + "', '" + compte + "', '" + NOM_DEPOT + "', 'E2E', 'ABOBO', 'KOFFI', 'Jean',"
    + " '0708473750', NOW(), NOW(), 'enable', '2', 0);");
  const a = q("SELECT CONCAT(f.lg_FAMILLE_ID,':',f.int_PRICE) FROM t_famille f JOIN t_famille_stock s"
    + " ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE f.str_STATUT='enable' AND f.int_PRICE>0 AND COALESCE(f.bool_DECONDITIONNE,0)=0"
    + " AND COALESCE(f.lg_FAMILLE_PARENT_ID,'')='' AND f.bool_ACCOUNT=1"
    + " ORDER BY f.str_NAME LIMIT 1").split(':');
  const produit = { id: a[0], pu: parseInt(a[1], 10) };
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

(async () => {
  const ctx0 = poser();
  const JOUR = q("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d')");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    const json = (url, corps) => p.evaluate(async (a) => {
      const r = a.corps
        ? await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a.corps) })
        : await fetch(a.url);
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { return { success: false, brut: t.slice(0, 300) }; }
    }, { url: url, corps: corps });

    const creerEtCloturer = async (depotVenteId, qte) => {
      const corps = {
        typeVenteId: '1', natureVenteId: '1', produitId: ctx0.produit.id, itemPu: ctx0.produit.pu,
        qte: qte, qteServie: qte, devis: false, prevente: false, remiseId: '', userVendeurId: ctx0.user
      };
      if (depotVenteId) { corps.depotVenteId = depotVenteId; }
      const r = await json('../api/v1/vente/add/vno', corps);
      const id = r.data ? r.data.lgPREENREGISTREMENTID : null;
      if (id) { ventes.push(id); }
      // La cloture porte ses reglements, comme le fait l'ecran de vente : sans eux aucune ligne
      // vente_reglement n'est ecrite, et la balance - qui les lit - ne voit pas la vente.
      const montant = qte * ctx0.produit.pu;
      const c = await json('../api/v1/vente/cloturer/vno', {
        venteId: id, typeVenteId: '1', typeRegleId: '1', montantRecu: montant, montantRendu: 0,
        montantPaye: montant, montantVerse: montant,
        reglements: [{ typeReglement: '1', montant: montant, montantAttentu: montant, montantVerse: montant }]
      });
      return { id: id, montant: montant, cloture: c };
    };

    const vDepot = await creerEtCloturer(DEPOT, QTE_DEPOT);
    ok('la vente en depot est validee', vDepot.cloture.success === true, JSON.stringify(vDepot.cloture).slice(0, 200));
    const vOfficine = await creerEtCloturer(null, QTE_OFFICINE);
    ok('la vente d officine est validee', vOfficine.cloture.success === true, JSON.stringify(vOfficine.cloture).slice(0, 200));

    // Les deux mouvements de caisse sont bien sur l'officine : l'argent est dans le meme tiroir.
    ok('les deux encaissements sont dans la caisse de l operateur',
      q("SELECT COUNT(*) FROM mvttransaction WHERE pkey IN ('" + vDepot.id + "','" + vOfficine.id + "')"
        + " AND lg_EMPLACEMENT_ID='1' AND caisse='" + ctx0.user + "'") === '2');

    /* ------------------------------------------------- le CA du depot, et celui de l officine */
    const balance = (empl) => json('../api/v1/balance/balancesalecashdepot?dtStart=' + JOUR + '&dtEnd=' + JOUR
      + '&emplacementId=' + encodeURIComponent(empl));
    const totalVentes = (r) => {
      if (!r || !r.metaData) { return null; }
      // metaData porte le recapitulatif de la periode ; on lit le montant TTC des ventes.
      const m = r.metaData;
      return Number(m.montantTTC !== undefined ? m.montantTTC : (m.montantNet !== undefined ? m.montantNet : NaN));
    };
    const bDepot = await balance(DEPOT);
    const bOfficine = await balance('1');
    ok('la balance du depot repond', !!bDepot && !bDepot.brut, JSON.stringify(bDepot).slice(0, 200));
    ok('la balance de l officine repond', !!bOfficine && !bOfficine.brut, JSON.stringify(bOfficine).slice(0, 200));

    const montantDepot = totalVentes(bDepot);
    const montantOfficine = totalVentes(bOfficine);
    ok('le CA du depot vaut exactement la vente jouee dans le depot',
      montantDepot === vDepot.montant, 'depot=' + montantDepot + ' attendu ' + vDepot.montant
      + ' / metaData=' + JSON.stringify(bDepot && bDepot.metaData).slice(0, 200));
    ok('le CA de l officine ne compte QUE sa propre vente : la vente de depot en est retiree',
      montantOfficine === vOfficine.montant, 'officine=' + montantOfficine + ' attendu ' + vOfficine.montant
      + ' (la vente de depot vaut ' + vDepot.montant + ')');
    ok('les deux CA ne se recouvrent pas',
      montantDepot !== null && montantOfficine !== null && montantDepot + montantOfficine
      === vDepot.montant + vOfficine.montant,
      montantDepot + ' + ' + montantOfficine + ' = ' + (montantDepot + montantOfficine));

    /* ------------------------------------------- l edition du chiffre d affaires (retour du 17/09) */
    // « on doit pouvoir imprimer le chiffre d'affaire, prevoir le fichier jrxml ». L'edition doit porter
    // EXACTEMENT les chiffres de l'ecran : elle repart de la meme balance, sans recalcul.
    const pdfCa = await p.evaluate(async (a) => {
      const r = await fetch('../api/v1/depot-extension/ca/pdf?depotId=' + encodeURIComponent(a.depot)
        + '&dtStart=' + a.jour + '&dtEnd=' + a.jour);
      const b = await r.arrayBuffer();
      return { statut: r.status, type: r.headers.get('content-type'),
        disposition: r.headers.get('content-disposition'), octets: Array.from(new Uint8Array(b)) };
    }, { depot: DEPOT, jour: JOUR });
    ok('le chiffre d affaires du depot s imprime, servi en flux dans l onglet',
      pdfCa.statut === 200 && /application\/pdf/.test(pdfCa.type) && /inline/.test(pdfCa.disposition),
      JSON.stringify({ statut: pdfCa.statut, type: pdfCa.type, disposition: pdfCa.disposition }));
    ok('c est un vrai PDF', Buffer.from(pdfCa.octets).slice(0, 5).toString() === '%PDF-');
    const texteCa = texteDuPdf(pdfCa.octets);
    ok('l edition nomme le depot, la periode, et porte les colonnes demandees',
      texteCa.indexOf('CHIFFRE D\'AFFAIRES - ' + NOM_DEPOT) >= 0 && /p.riode du/.test(texteCa)
      && /MONTANT TTC/.test(texteCa) && /MONTANT NET/.test(texteCa) && /MARGE/.test(texteCa)
      && /NBRE VENTES/.test(texteCa) && /MONTANT ESP/.test(texteCa) && /TIERS PAYANT/.test(texteCa),
      texteCa.slice(0, 340));
    ok('l edition ne reprend pas la colonne « reglement », qui n etait jamais renseignee',
      !/R.GLEMENT/.test(texteCa), texteCa.slice(0, 340));
    ok('l edition porte sa ligne TOTAL et le montant de la vente du depot',
      /TOTAL/.test(texteCa) && texteCa.replace(/[^0-9]/g, '').indexOf(String(vDepot.montant)) >= 0,
      'attendu ' + vDepot.montant + ' dans ' + texteCa.slice(-340));
    ok('l edition est paginee et rappelle ou est l argent',
      /Page 1/.test(texteCa) && /caisse de l'op.rateur/.test(texteCa), texteCa.slice(-260));

    /* ------------------------------------------------------------- la ventilation du ticket Z */
    // « fetch-tickez » rend le recapitulatif affiche a l'ecran (le ticket Z imprime, lui, part sur
    // l'imprimante et ne renvoie pas de donnees). Les bornes horaires sont exigees par le service.
    const z = await json('../api/v1/caisse/fetch-tickez', {
      dtStart: JOUR, dtEnd: JOUR, hrStart: '00:00', hrEnd: '23:59', userId: ctx0.user, description: 'VENTE'
    });
    ok('le ticket Z repond', !!z, JSON.stringify(z).slice(0, 200));
    const texteZ = JSON.stringify(z);
    ok('le ticket Z nomme la vente en depot (ligne « dont vente depot »)',
      /dont vente dépôt/i.test(texteZ) && texteZ.indexOf(NOM_DEPOT) >= 0,
      texteZ.slice(0, 400));
    ok('le montant ventile est celui de la vente en depot',
      texteZ.indexOf(String(vDepot.montant)) >= 0
      || texteZ.indexOf(new Intl.NumberFormat('fr-FR').format(vDepot.montant).replace(/ | /g, ' ')) >= 0
      || texteZ.replace(/[^0-9]/g, '').indexOf(String(vDepot.montant)) >= 0,
      'attendu ' + vDepot.montant + ' dans ' + texteZ.slice(0, 400));

    // La garantie de non-regression du ticket Z : la ventilation ne modifie AUCUN total. Le total
    // espece doit valoir les deux ventes, celle du depot comprise, puisque l'argent est dans ce tiroir.
    const chiffres = (t) => String(t).replace(/[^0-9]/g, '');
    const totalAttendu = vDepot.montant + vOfficine.montant;
    const totaux = z && z.data && z.data.totaux ? z.data.totaux : [];
    ok('le total du ticket Z est inchange : il comprend toujours l argent de la vente en depot',
      totaux.some((t) => chiffres(t.montant) === String(totalAttendu)),
      'attendu ' + totalAttendu + ' dans ' + JSON.stringify(totaux));
    ok('la ventilation ne s ajoute pas au total : elle en fait partie',
      totalAttendu > vDepot.montant && totaux.every((t) => chiffres(t.montant) !== String(totalAttendu + vDepot.montant)),
      JSON.stringify(totaux));

    ok('aucune erreur de page', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    console.log('\n' + res.filter(r => r.c).length + '/' + res.length + ' verifications');
    try { nettoyer(); } catch (e) { console.log('NETTOYAGE INCOMPLET : ' + String(e.message).slice(0, 400)); }
    process.exit(res.every(r => r.c) ? 0 : 1);
  }
})();
