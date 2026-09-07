/* Lot F - point 17 : factures du carnet depot.
 *
 * - la liste se filtre par tiers payant, PERIODE et numero de facture ;
 * - un seul bouton d'impression, le choix de l'edition etant pose dans la fenetre ;
 * - suppression des factures provisoires, comme sur les factures provisoires ordinaires ;
 * - edition SANS detail alignee sur les factures provisoires : une ligne par bon, la DATE en
 *   premiere colonne, tri par date, ni « M.TOTAL » ni « M.ADHER », pas de page recapitulative ;
 * - edition AVEC detail : modele DETAIL_ARTICLE.
 *
 * Le banc ne porte aucun tiers payant marque « depot » : le test en marque un, le temps du test,
 * et le remet dans son etat d'origine a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const TMP = '/tmp/lot-f';
const FACTURE_ESSAI = 'E2E-LOT-F-FACT';

let tpDepot = null;

function poserJeuDEssai() {
  // une facture reelle, avec plusieurs bons detailles : c'est elle qui sera editee
  const ligne = q("SELECT f.lg_FACTURE_ID, f.tiersPayant, f.str_CODE_FACTURE FROM t_facture f"
    + " WHERE (SELECT COUNT(*) FROM t_facture_detail d WHERE d.lg_FACTURE_ID=f.lg_FACTURE_ID) >= 3"
    + " AND f.tiersPayant IS NOT NULL LIMIT 1").split('\t');
  if (ligne.length < 3) { return null; }
  tpDepot = ligne[1];
  exec("UPDATE t_tiers_payant SET is_depot=1 WHERE lg_TIERS_PAYANT_ID='" + tpDepot + "';");
  // une facture PROVISOIRE d'essai, la seule que le test supprimera
  exec("INSERT INTO t_facture (lg_FACTURE_ID,dt_DATE_FACTURE,dbl_MONTANT_CMDE,str_CODE_FACTURE,str_CODE_COMPTABLE,"
    + "dbl_MONTANT_PAYE,dt_DEBUT_FACTURE,int_NB_DOSSIER,dt_FIN_FACTURE,str_CUSTOMER,dbl_MONTANT_RESTANT,str_STATUT,"
    + "dt_CREATED,lg_TYPE_FACTURE_ID,dbl_MONTANT_REMISE,dbl_MONTANT_FOFETAIRE,dbl_MONTANT_Brut,template,tiersPayant,"
    + "montantTvaVente,montantRemiseVente,montantVente)"
    + " SELECT '" + FACTURE_ESSAI + "',NOW(),1000,'" + FACTURE_ESSAI + "',f.str_CODE_COMPTABLE,0,"
    + "'2026-01-01',1,'2026-01-31',f.str_CUSTOMER,1000,f.str_STATUT,NOW(),f.lg_TYPE_FACTURE_ID,0,0,1000,b'1','"
    + tpDepot + "',0,0,1000 FROM t_facture f WHERE f.lg_FACTURE_ID='" + ligne[0] + "';");
  return { factureId: ligne[0], code: ligne[2] };
}

function retirerJeuDEssai() {
  exec("DELETE FROM t_facture WHERE lg_FACTURE_ID='" + FACTURE_ESSAI + "';");
  if (tpDepot) {
    exec("UPDATE t_tiers_payant SET is_depot=0 WHERE lg_TIERS_PAYANT_ID='" + tpDepot + "';");
  }
}

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const essai = poserJeuDEssai();
  ok('jeu d essai en place : un carnet depot et une facture provisoire', !!essai,
     JSON.stringify(essai) + ' tp=' + tpDepot);
  if (!essai) { retirerJeuDEssai(); process.exit(1); }

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

  const LISTE = '../api/v1/facturation/summary/carnet-depot?start=0&limit=50';

  /* ------------------------------------------------------ filtres de selection */
  const toutes = JSON.parse((await appel(LISTE)).corps);
  ok('la liste des factures du carnet depot repond', (toutes.total || 0) > 0,
     'total=' + toutes.total);
  ok('la facture provisoire d essai y figure',
     (toutes.data || []).some(f => f.strCODEFACTURE === FACTURE_ESSAI),
     (toutes.data || []).map(f => f.strCODEFACTURE).join(','));
  ok('le statut provisoire est publie a l ecran',
     ((toutes.data || []).find(f => f.strCODEFACTURE === FACTURE_ESSAI) || {}).template === true,
     JSON.stringify((toutes.data || []).find(f => f.strCODEFACTURE === FACTURE_ESSAI)));

  const parNumero = JSON.parse((await appel(LISTE + '&query=' + FACTURE_ESSAI)).corps);
  ok('le filtre par numero de facture ne rend que celle-la',
     (parNumero.data || []).length === 1
     && parNumero.data[0].strCODEFACTURE === FACTURE_ESSAI, JSON.stringify(parNumero.data || []).slice(0, 200));

  // periode : la facture d'essai porte janvier 2026
  const dansPeriode = JSON.parse((await appel(LISTE + '&dtStart=2026-01-01&dtEnd=2026-01-31')).corps);
  ok('le filtre de periode retient la facture de janvier 2026',
     (dansPeriode.data || []).some(f => f.strCODEFACTURE === FACTURE_ESSAI),
     (dansPeriode.data || []).map(f => f.strCODEFACTURE + ' ' + f.periode).join(' | '));
  const horsPeriode = JSON.parse((await appel(LISTE + '&dtStart=2030-01-01&dtEnd=2030-12-31')).corps);
  ok('une periode sans facture rend une liste vide',
     (horsPeriode.data || []).length === 0 && horsPeriode.total === 0, JSON.stringify(horsPeriode).slice(0, 150));
  const autreTp = JSON.parse((await appel(LISTE + '&tpid=inexistant')).corps);
  ok('le filtre par tiers payant reste actif', (autreTp.data || []).length === 0);

  /* ------------------------------------------------------ edition SANS detail */
  const pdf = await p.evaluate(async (id) => {
    const rep = await fetch('../api/v1/facturation/facture/' + id + '/carnet-depot/pdf');
    const buf = new Uint8Array(await rep.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i++) { bin += String.fromCharCode(buf[i]); }
    return { statut: rep.status, b64: btoa(bin) };
  }, essai.factureId);
  const f = TMP + '/facture.pdf';
  fs.writeFileSync(f, Buffer.from(pdf.b64, 'base64'));
  ok('edition sans detail : le serveur repond 200', pdf.statut === 200, pdf.statut);
  ok('edition sans detail : le contenu est un PDF', fs.readFileSync(f).slice(0, 5).toString('latin1') === '%PDF-');

  const texte = execSync('pdftotext -layout ' + f + ' -', { encoding: 'latin1' });
  fs.writeFileSync(f + '.txt', texte);
  const lignesTexte = texte.split('\n').map(l => l.trim()).filter(Boolean);

  ok('edition sans detail : le numero de facture est en tete',
     lignesTexte.slice(0, 5).some(l => /FACTURE N/.test(l)), lignesTexte.slice(0, 6).join(' | '));
  ok('edition sans detail : la colonne Date ouvre le tableau',
     /^Date\s+N/.test(lignesTexte.find(l => /^Date/.test(l)) || ''),
     lignesTexte.find(l => /^Date/.test(l)));
  ok('edition sans detail : plus de colonne M.TOTAL', !/M\.?\s?TOTAL/i.test(texte));
  ok('edition sans detail : plus de colonne M.ADHER', !/M\.?\s?ADHER/i.test(texte));
  ok('edition sans detail : pas de page recapitulative avant le tableau',
     !/RECAPITULATIF/i.test(texte) && texte.indexOf('Date') < texte.indexOf('TOTAL'),
     lignesTexte.slice(0, 8).join(' | '));

  /* Le corps du tableau seul : l'en-tete porte lui aussi des dates (la periode facturee), qui
     n'ont rien a voir avec les lignes de bons. */
  const debutTableau = lignesTexte.findIndex(l => /^Date/.test(l));
  const corps = lignesTexte.slice(debutTableau + 1);
  const nbBons = parseInt(q("SELECT COUNT(*) FROM t_facture_detail WHERE lg_FACTURE_ID='" + essai.factureId + "'"), 10);
  const dates = corps.join('\n').match(/\d{2}\/\d{2}\/\d{4}/g) || [];
  ok('edition sans detail : une ligne de bon par bon, ni plus ni moins', dates.length === nbBons,
     dates.length + ' date(s) pour ' + nbBons + ' bon(s) : ' + dates.join(','));
  ok('edition sans detail : le total annonce le nombre de bons',
     texte.indexOf('TOTAL (' + nbBons + ' bon(s))') !== -1,
     (texte.match(/TOTAL.*/g) || []).join(' // '));

  // tri par date : les dates du tableau sont croissantes
  const enJours = dates.map(d => d.slice(6) + d.slice(3, 5) + d.slice(0, 2));
  const triees = enJours.slice().sort();
  ok('edition sans detail : les lignes sont triees par date',
     JSON.stringify(enJours) === JSON.stringify(triees), enJours.join(','));

  // le total edite vaut la somme des bons
  const somme = parseInt(q("SELECT ROUND(SUM(dbl_MONTANT)) FROM t_facture_detail WHERE lg_FACTURE_ID='"
    + essai.factureId + "'"), 10);
  const totalEdite = (texte.match(/TOTAL \([0-9]+ bon\(s\)\)\s+([0-9 ]+)/) || [])[1];
  ok('edition sans detail : le total vaut la somme des bons',
     !!totalEdite && parseInt(totalEdite.replace(/\s/g, ''), 10) === somme,
     'edite=' + totalEdite + ' base=' + somme);

  /* ------------------------------------------------------ edition AVEC detail */
  const detail = JSON.parse((await appel('../api/v1/facturation/facture/' + essai.factureId
    + '/detail-articles')).corps);
  ok('edition avec detail : le modele DETAIL_ARTICLE repond', detail.success === true,
     JSON.stringify(detail).slice(0, 250));
  ok('edition avec detail : une edition a bien ete ecrite',
     !!detail.url && /\.pdf$/i.test(detail.url), detail.url);

  /* ------------------------------------------------------ ecran */
  await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('reglementdepot', {}));
  await p.waitForFunction(() => Ext.ComponentQuery.query('reglementdepot').length > 0, null, { timeout: 20000 });
  await p.waitForTimeout(1000);
  await p.evaluate(() => {
    const vue = Ext.ComponentQuery.query('reglementdepot')[0];
    vue.setActiveTab(vue.down('#facturesPanel'));
  });
  await p.waitForTimeout(2500);

  const ecran = await p.evaluate(() => {
    const vue = Ext.ComponentQuery.query('reglementdepot')[0];
    const grille = vue.down('#grilleFacturesDepot');
    return {
      recherche: !!grille.down('#rechercheFactureDepot'),
      boutonImprimer: !!grille.down('#btnImprimerFactureDepot'),
      boutonSupprimer: !!grille.down('#btnSupprimerFactureDepot'),
      imprimerGrise: grille.down('#btnImprimerFactureDepot').isDisabled(),
      supprimerGrise: grille.down('#btnSupprimerFactureDepot').isDisabled(),
      colonnesAction: grille.columns.filter(c => c.xtype === 'actioncolumn').length,
      colonnes: grille.columns.map(c => c.text || c.header),
      lignes: grille.getStore().getCount()
    };
  });
  ok('ecran : un champ de recherche par numero de facture', ecran.recherche === true, JSON.stringify(ecran));
  ok('ecran : UN SEUL bouton d impression, plus de colonne d icones',
     ecran.boutonImprimer === true && ecran.colonnesAction === 0, JSON.stringify(ecran));
  ok('ecran : un bouton de suppression', ecran.boutonSupprimer === true);
  ok('ecran : les deux boutons sont grises sans selection',
     ecran.imprimerGrise === true && ecran.supprimerGrise === true, JSON.stringify(ecran));
  ok('ecran : le numero de facture est une colonne',
     ecran.colonnes.some(c => /facture/i.test(c || '')), ecran.colonnes.join(' | '));
  ok('ecran : la liste est chargee', ecran.lignes > 0, ecran.lignes);

  // selection d'une facture DEFINITIVE : impression possible, suppression refusee
  const surDefinitive = await p.evaluate(() => {
    const grille = Ext.ComponentQuery.query('reglementdepot #grilleFacturesDepot')[0];
    const definitive = grille.getStore().getRange().find(f => f.get('template') !== true);
    if (!definitive) { return null; }
    grille.getSelectionModel().select([definitive]);
    return {
      imprimer: grille.down('#btnImprimerFactureDepot').isDisabled(),
      supprimer: grille.down('#btnSupprimerFactureDepot').isDisabled()
    };
  });
  ok('ecran : une facture definitive s imprime mais ne se supprime pas',
     surDefinitive && surDefinitive.imprimer === false && surDefinitive.supprimer === true,
     JSON.stringify(surDefinitive));

  const surProvisoire = await p.evaluate((code) => {
    const grille = Ext.ComponentQuery.query('reglementdepot #grilleFacturesDepot')[0];
    const provisoire = grille.getStore().getRange().find(f => f.get('strCODEFACTURE') === code);
    if (!provisoire) { return null; }
    grille.getSelectionModel().select([provisoire]);
    return {
      imprimer: grille.down('#btnImprimerFactureDepot').isDisabled(),
      supprimer: grille.down('#btnSupprimerFactureDepot').isDisabled()
    };
  }, FACTURE_ESSAI);
  ok('ecran : une facture provisoire s imprime ET se supprime',
     surProvisoire && surProvisoire.imprimer === false && surProvisoire.supprimer === false,
     JSON.stringify(surProvisoire));

  // la fenetre d'impression propose les deux editions
  await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot #btnImprimerFactureDepot')[0].fireEvent('click',
      Ext.ComponentQuery.query('reglementdepot #btnImprimerFactureDepot')[0]));
  await p.waitForTimeout(900);
  const fenetre = await p.evaluate(() => {
    const w = Ext.ComponentQuery.query('window{isVisible()}').find(x => !!x.down('#choixEdition'));
    if (!w) { return null; }
    const choix = w.down('#choixEdition').query('radiofield').map(r => r.boxLabel);
    const parDefaut = w.down('#choixEdition').getValue().edition;
    w.destroy();
    return { choix: choix, parDefaut: parDefaut };
  });
  ok('ecran : la fenetre d impression propose « sans » et « avec » le detail',
     fenetre && fenetre.choix.length === 2
     && fenetre.choix.some(l => /sans le d/i.test(l)) && fenetre.choix.some(l => /DETAIL_ARTICLE/.test(l)),
     JSON.stringify(fenetre));
  ok('ecran : l edition sans detail est proposee par defaut',
     fenetre && fenetre.parDefaut === 'simple', JSON.stringify(fenetre));

  /* ------------------------------------------------------ suppression reelle */
  const idEssai = q("SELECT lg_FACTURE_ID FROM t_facture WHERE str_CODE_FACTURE='" + FACTURE_ESSAI + "'");
  const suppression = await p.evaluate(async (id) => {
    const r = await fetch('../api/v1/facturation/provisoires/supprimer', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ids: [id]})
    });
    return { statut: r.status, corps: await r.text() };
  }, idEssai);
  ok('la suppression repond', suppression.statut === 200, suppression.corps.slice(0, 200));
  ok('la facture provisoire a bien ete supprimee',
     q("SELECT COUNT(*) FROM t_facture WHERE str_CODE_FACTURE='" + FACTURE_ESSAI + "'") === '0',
     suppression.corps.slice(0, 200));

  ok('aucune erreur javascript', err.length === 0, err.join(' | '));
  await b.close();
  retirerJeuDEssai();
  ok('jeu d essai entierement retire',
     q("SELECT COUNT(*) FROM t_facture WHERE str_CODE_FACTURE='" + FACTURE_ESSAI + "'") === '0'
     && q("SELECT COUNT(*) FROM t_tiers_payant WHERE is_depot=1") === '0');
  const echecs = res.filter(x => !x.c);
  console.log('\n' + (res.length - echecs.length) + '/' + res.length + ' OK');
  process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); try { retirerJeuDEssai(); } catch (x) { } process.exit(1); });
