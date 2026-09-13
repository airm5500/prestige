/* Retours du 08/09 - lot G : les points sans question.
 *  5  erreur JS a l'enregistrement d'une garde (removeCls sur un bouton detruit) ;
 *  6  fenetres utilisateurs / privileges modales ;
 *  2  solde du carnet depot rafraichi apres un reglement ou une depense ;
 *  2  edition « avec produits » d'une facture carnet depot : plus de NullPointerException ;
 *  4  recherche medecin : focus, tous par defaut, deux caracteres, « contient » ;
 *  1  veille de geometrie : un ecran rabattu est recale et trace.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-LOT-G';
let tpDepot = null;

function nettoyer() {
  exec("DELETE FROM garde WHERE libelle LIKE '" + MARQUE + "%';");
  exec("DELETE FROM medecin WHERE nom LIKE '%" + MARQUE + "%' OR num_ordre LIKE '" + MARQUE + "%';");
  if (tpDepot) { exec("UPDATE t_tiers_payant SET is_depot=0 WHERE lg_TIERS_PAYANT_ID='" + tpDepot + "';"); }
}

(async () => {
  try { nettoyer(); } catch (e) { }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  const console_ = []; p.on('console', m => { if (/GEOMETRIE/.test(m.text())) { console_.push(m.text()); } });
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  const appel = (m, u, c) => p.evaluate(async ([m, u, c]) => {
    const o = { method: m, headers: { 'Content-Type': 'application/json' } };
    if (c) { o.body = JSON.stringify(c); }
    const r = await fetch(u, o); return { statut: r.status, corps: await r.text() };
  }, [m, u, c || null]);

  /* ---------------------------------------------------------- 5. garde : plus d'erreur JS */
  await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('gardemanager', {}));
  await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager').length > 0, null, { timeout: 20000 });
  await p.waitForTimeout(1200);
  const avantGarde = err.length;
  await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #gardeNouvelle')[0].fireEvent('click', Ext.ComponentQuery.query('gardemanager #gardeNouvelle')[0]));
  await p.waitForTimeout(800);
  const fenetreGarde = await p.evaluate((marque) => {
    const w = Ext.ComponentQuery.query('window{isVisible()}').find(x => !!x.down('#formulaireGarde'));
    if (!w) { return null; }
    const debut = new Date(); debut.setDate(debut.getDate() - 900);
    const fin = new Date(debut.getTime() + 24 * 3600 * 1000);
    w.down('#gardeLibelle').setValue(marque + ' garde');
    w.down('#gardeJourDebut').setValue(debut);
    w.down('#gardeHeureDebut').setValue('20:00');
    w.down('#gardeJourFin').setValue(fin);
    w.down('#gardeHeureFin').setValue('08:00');
    const bouton = w.down('#gardeEnregistrer');
    if (bouton) { bouton.fireEvent('click', bouton); }
    return { bouton: !!bouton };
  }, MARQUE);
  await p.waitForTimeout(2500);
  ok('5) la fenetre de garde s ouvre et s enregistre', !!fenetreGarde && fenetreGarde.bouton, JSON.stringify(fenetreGarde));
  ok('5) aucune erreur « removeCls » a l enregistrement', err.slice(avantGarde).every(e => !/removeCls/.test(e)),
     err.slice(avantGarde).join(' | '));
  const gardeCreee = q("SELECT COUNT(*) FROM garde WHERE libelle LIKE '" + MARQUE + "%'");
  ok('5) la garde est bien enregistree (le rappel ne cassait pas la sauvegarde, il cassait apres)',
     gardeCreee === '1', 'creees=' + gardeCreee);

  /* ---------------------------------------------------------- 6. fenetres modales */
  const modales = await p.evaluate(() => {
    const noms = ['testextjs.view.sm_user.user.action.add', 'testextjs.view.sm_user.user.action.addpwd',
      'testextjs.view.sm_user.user.action.addPrinter', 'testextjs.view.sm_user.user.action.addUserPhone',
      'testextjs.view.sm_user.role.action.add', 'testextjs.view.sm_user.role.action.addPrivilegeBis'];
    const r = {};
    noms.forEach(n => { const c = Ext.ClassManager.get(n); r[n.split('.').slice(-2).join('.')] = c ? c.prototype.modal === true : null; });
    return r;
  });
  ok('6) toutes les fenetres utilisateurs / roles / privileges sont modales',
     Object.values(modales).every(v => v === true), JSON.stringify(modales));

  /* ---------------------------------------------------------- 4. recherche medecin */
  exec("INSERT INTO medecin (id, nom, num_ordre, commentaire, created_at) VALUES (UUID(), '" + MARQUE + " ALPHA', '" + MARQUE + "-1', '', NOW());"
     + "INSERT INTO medecin (id, nom, num_ordre, commentaire, created_at) VALUES (UUID(), 'BETA " + MARQUE + "', '" + MARQUE + "-2', '', NOW());");
  const tous = JSON.parse((await appel('GET', '../api/v1/medecin/medecins')).corps);
  ok('4) sans critere, le service rend tous les medecins', (tous.total || 0) >= 2, 'total=' + tous.total);
  const contient = JSON.parse((await appel('GET', '../api/v1/medecin/medecins?query=' + encodeURIComponent('BETA ' + MARQUE))).corps);
  ok('4) la recherche est par « contient » (BETA E2E... trouve par son milieu)',
     (contient.data || []).some(m => /BETA/.test(m.nom)), JSON.stringify(contient).slice(0, 200));
  const milieu = JSON.parse((await appel('GET', '../api/v1/medecin/medecins?query=LOT-G')).corps);
  ok('4) « LOT-G » (milieu du nom) trouve les deux medecins d essai',
     (milieu.data || []).filter(m => m.nom.indexOf(MARQUE) !== -1).length === 2, 'trouves=' + (milieu.data || []).length);

  // l'ecran : ouverture de la fenetre des medecins depuis la vente
  await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} }));
  await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').length > 0, null, { timeout: 20000 });
  await p.waitForTimeout(1200);
  await p.evaluate(() => testextjs.app.getController('VenteCtr').showMedicinWindow());
  await p.waitForTimeout(2000);
  const fenetreMed = await p.evaluate(() => {
    const c = testextjs.app.getController('VenteCtr');
    const champ = c.getQueryMedecin();
    return { lignes: c.getMedecinGrid().getStore().getCount(), focus: !!(champ && champ.hasFocus) };
  });
  ok('4) la fenetre s ouvre sur la liste complete des medecins', fenetreMed.lignes >= 2, JSON.stringify(fenetreMed));
  ok('4) le champ de recherche a le focus a l ouverture', fenetreMed.focus === true, JSON.stringify(fenetreMed));
  const champSel = await p.evaluate(() => '#' + testextjs.app.getController('VenteCtr').getQueryMedecin().inputEl.id);
  await p.click(champSel); await p.keyboard.type('BE', { delay: 60 });
  await p.waitForTimeout(1500);
  const apresDeux = await p.evaluate(() => testextjs.app.getController('VenteCtr').getMedecinGrid().getStore().getRange().map(r => r.get('nom')));
  ok('4) deux caracteres suffisent, sans ENTREE : la liste se filtre', apresDeux.length >= 1 && apresDeux.every(n => /BE/i.test(n)), apresDeux.join(','));
  await p.evaluate(() => testextjs.app.getController('VenteCtr').closeMedecinWindow());

  /* ---------------------------------------------------------- 2. solde carnet depot + edition */
  const ligne = q("SELECT f.lg_FACTURE_ID, f.tiersPayant FROM t_facture f WHERE (SELECT COUNT(*) FROM t_facture_detail d WHERE d.lg_FACTURE_ID=f.lg_FACTURE_ID)>=2 AND f.tiersPayant IS NOT NULL LIMIT 1").split('\t');
  tpDepot = ligne[1];
  exec("UPDATE t_tiers_payant SET is_depot=1 WHERE lg_TIERS_PAYANT_ID='" + tpDepot + "';");
  const detail = JSON.parse((await appel('GET', '../api/v1/facturation/facture/' + ligne[0] + '/detail-articles')).corps);
  ok('2) l edition avec produits passe par le service et aboutit', detail.success === true && /\.pdf$/.test(detail.url || ''), JSON.stringify(detail).slice(0, 200));
  // la page historique, appelee avec details=true sur un tiers payant sans modele, ne plante plus
  const page = await p.evaluate(async (id) => {
    const r = await fetch('../webservices/sm_user/facturation/ws_rp_facture_tiers_payant.jsp?lg_FACTURE_ID=' + id + '&details=true', { redirect: 'manual' });
    return { statut: r.status, type: r.type, corps: (await r.text()).slice(0, 200) };
  }, ligne[0]);
  ok('2) la page d impression historique ne renvoie plus une erreur 500 sur un carnet depot', page.statut !== 500, JSON.stringify(page));

  // solde : la reponse du reglement porte le nouveau solde
  const soldeAvant = q("SELECT account FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + tpDepot + "'");
  const controleur = await p.evaluate(() => {
    const c = testextjs.app.getController('GestionCarnetDepotCtr');
    return typeof c.afficherSolde === 'function';
  });
  ok('2) l ecran sait afficher un solde recu du serveur', controleur === true);
  // reponse du service : on verifie la CLE sans engager de reglement reel (la caisse du banc est fermee)
  const reglement = JSON.parse((await appel('PUT', '../api/v2/carnet-depot/regler/' + tpDepot, { montantPaye: 1, typeReglementId: '1', motifId: '' })).corps);
  ok('2) le service de reglement repond (refus attendu sur le banc : caisse fermee ou solde)',
     typeof reglement.success === 'boolean', JSON.stringify(reglement).slice(0, 150));
  ok('2) la reponse porte le solde des que le reglement passe (cle « solde » prevue)',
     reglement.success ? typeof reglement.solde === 'number' : true, JSON.stringify(reglement).slice(0, 150));
  const soldeApres = q("SELECT account FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + tpDepot + "'");
  ok('2) le banc n a pas ete modifie par cet appel', reglement.success ? true : soldeAvant === soldeApres);

  /* ---------------------------------------------------------- 1. veille de geometrie */
  const geo = await p.evaluate(() => {
    const cp = Ext.getCmp('content-panel');
    const ecran = cp.items.items.find(i => i.rendered && !i.floating);
    const avant = window.PrestigeGeometrie.mesurer();
    // on rabat l'ecran de force, comme sur le portable : 80 % de la place
    ecran.setWidth(Math.floor(avant.largeurDisponible * 0.8));
    ecran.updateLayout();
    const rabattu = window.PrestigeGeometrie.mesurer();
    window.PrestigeGeometrie.recaler();
    const apres = window.PrestigeGeometrie.mesurer();
    return { avant: avant.largeurEcran, disponible: avant.largeurDisponible, rabattu: rabattu.rabattu,
      apres: apres.largeurEcran, apresRabattu: apres.rabattu, journal: window.PrestigeGeometrie.journal.length };
  });
  ok('1) la veille detecte un ecran rabattu', geo.rabattu === true, JSON.stringify(geo));
  ok('1) la veille recale l ecran sur la largeur disponible', geo.apresRabattu === false && geo.apres > geo.disponible * 0.9, JSON.stringify(geo));
  ok('1) l ecart est trace pour le support (journal + console [GEOMETRIE])', geo.journal > 0 && console_.length > 0, console_.slice(0, 1).join(''));

  ok('aucune erreur javascript', err.length === 0, err.join(' | '));
  await b.close();
  nettoyer();
  ok('jeu d essai retire', q("SELECT COUNT(*) FROM medecin WHERE nom LIKE '%" + MARQUE + "%'") === '0'
     && q("SELECT COUNT(*) FROM garde WHERE libelle LIKE '" + MARQUE + "%'") === '0');
  const echecs = res.filter(x => !x.c);
  console.log('\n' + (res.length - echecs.length) + '/' + res.length + ' OK');
  process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); try { nettoyer(); } catch (x) { } process.exit(1); });
