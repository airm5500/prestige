/* Retour du 08/09 - point 4 : vente ordonnanciere, client puis medecin sur UN SEUL ecran.
 *
 * Le parcours est joue pour de vrai : vente ouverte, produit au panier, ecran du parcours ouvert,
 * client cherche et choisi au clic dans la grille (volet 1), passage automatique au volet 2,
 * medecin cherche et choisi au clic (volet 2), fermeture. A chaque etape, la vente est controlee
 * en base : le client, puis le medecin, y sont rattaches par les memes services qu'avant.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-P4';
let venteId = null;

function nettoyer() {
  if (venteId) {
    exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + venteId + "';"
      + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteId + "';");
  }
  exec("DELETE FROM medecin WHERE nom LIKE '%" + MARQUE + "%' OR num_ordre LIKE '" + MARQUE + "%';"
    + "DELETE FROM t_client WHERE str_FIRST_NAME LIKE '" + MARQUE + "%';");
}

(async () => {
  try { nettoyer(); } catch (e) { }
  exec("INSERT INTO medecin (id, nom, num_ordre, commentaire, created_at) VALUES (UUID(), 'DR " + MARQUE + " HOUSE', '" + MARQUE + "-1', '', NOW());");
  exec("INSERT INTO t_client (lg_CLIENT_ID,str_FIRST_NAME,str_LAST_NAME,str_STATUT,dt_CREATED,dt_UPDATED,lg_TYPE_CLIENT_ID,str_ADRESSE)"
    + " VALUES ('" + MARQUE + "-CLT','" + MARQUE + " KOUASSI','AYA','enable',NOW(),NOW(),'6','0700000000');");

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  const okButton = async () => p.evaluate(() => {
    const box = Ext.ComponentQuery.query('messagebox{isVisible()}')[0];
    if (!box) { return null; }
    const btn = box.query('button{isVisible()}').find(x => /ok|oui/i.test(x.text || ''));
    return btn ? '#' + btn.el.dom.id : null;
  });

  // ---- une vente avec un produit
  await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} }));
  await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').length > 0, null, { timeout: 20000 });
  await p.waitForTimeout(1500);
  let sel = await okButton(); if (sel) { await p.click(sel); await p.waitForTimeout(400); }
  const ci = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit')[0].inputEl.id);
  await p.click(ci); await p.keyboard.type('0000498', { delay: 40 });
  await p.waitForSelector('.x-boundlist-item', { timeout: 20000 }); await p.locator('.x-boundlist-item').first().click();
  await p.waitForTimeout(600);
  const qi = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #qtyField')[0].inputEl.id);
  await p.click(qi); await p.keyboard.press('Control+A'); await p.keyboard.type('1'); await p.keyboard.press('Enter');
  await p.waitForTimeout(2500);
  sel = await okButton(); if (sel) { await p.click(sel); await p.waitForTimeout(400); }
  venteId = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); return c.current ? c.current.lgPREENREGISTREMENTID : null; });
  ok('une vente avec un produit est ouverte', !!venteId, venteId);
  ok('elle n a ni client ni medecin', q("SELECT IFNULL(lg_CLIENT_ID,''), IFNULL(medecin_id,'') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'").trim() === '',
     q("SELECT lg_CLIENT_ID, medecin_id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'"));

  // ---- le parcours s'ouvre (comme a la validation quand le serveur reclame le medecin)
  await p.evaluate(() => testextjs.app.getController('VenteCtr').ouvrirParcoursOrdonnance());
  await p.waitForTimeout(1500);
  const ouverture = await p.evaluate(() => {
    const f = Ext.ComponentQuery.query('ordonnanceparcours{isVisible()}')[0];
    if (!f) { return null; }
    const volets = f.down('#volets').getLayout();
    return {
      modal: f.modal === true,
      volet: volets.getActiveItem().getItemId(),
      suivantGrise: f.down('#btnSuivant').isDisabled(),
      retourCache: !f.down('#btnRetour').isVisible(),
      fenetresVisibles: Ext.ComponentQuery.query('window{isVisible()}').length,
      focus: !!(f.down('#rechercheClient') && f.down('#rechercheClient').hasFocus),
      medecinsCharges: f.medecinStore.getCount()
    };
  });
  ok('un seul ecran modal s ouvre, sur le volet CLIENT', ouverture && ouverture.modal && ouverture.volet === 'voletClient' && ouverture.fenetresVisibles === 1, JSON.stringify(ouverture));
  ok('« Suivant » est grise tant qu aucun client n est rattache', ouverture && ouverture.suivantGrise && ouverture.retourCache, JSON.stringify(ouverture));
  ok('le champ de recherche du client a le focus', ouverture && ouverture.focus, JSON.stringify(ouverture));
  ok('la liste des medecins est deja chargee pour le second volet', ouverture && ouverture.medecinsCharges >= 1, JSON.stringify(ouverture));

  // ---- volet 1 : recherche au clavier, choix au clic
  const champClient = await p.evaluate(() => '#' + Ext.ComponentQuery.query('ordonnanceparcours #rechercheClient')[0].inputEl.id);
  await p.click(champClient); await p.keyboard.type(MARQUE, { delay: 40 });
  await p.waitForTimeout(1800);
  const clientsTrouves = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceparcours')[0].clientStore.getRange().map(r => r.get('strFIRSTNAME')));
  ok('volet 1 : la recherche au clavier trouve le client d essai', clientsTrouves.some(n => n.indexOf(MARQUE) !== -1), clientsTrouves.join(','));
  const iconeClient = await p.evaluate((marque) => {
    const grille = Ext.ComponentQuery.query('ordonnanceparcours #grilleClients')[0];
    const rec = grille.getStore().getRange().find(r => r.get('strFIRSTNAME').indexOf(marque) !== -1);
    const ligne = grille.getView().getNode(rec);
    const icone = ligne.querySelector('.x-action-col-icon');
    return icone ? '#' + (icone.id || (icone.id = 'e2e-icone-client')) : null;
  }, MARQUE);
  await p.click(iconeClient);
  await p.waitForTimeout(2500);
  sel = await okButton(); if (sel) { await p.click(sel); await p.waitForTimeout(400); }
  const apresClient = await p.evaluate(() => {
    const f = Ext.ComponentQuery.query('ordonnanceparcours{isVisible()}')[0];
    const c = testextjs.app.getController('VenteCtr');
    return {
      ouverte: !!f,
      volet: f ? f.down('#volets').getLayout().getActiveItem().getItemId() : null,
      retourVisible: f ? f.down('#btnRetour').isVisible() : null,
      nomAffiche: c.getNomClient() ? c.getNomClient().getValue() : null,
      fenetresVisibles: Ext.ComponentQuery.query('window{isVisible()}').length
    };
  });
  ok('volet 1 : le clic sur le client passe au volet MEDECIN, sans autre fenetre',
     apresClient.ouverte && apresClient.volet === 'voletMedecin' && apresClient.fenetresVisibles === 1, JSON.stringify(apresClient));
  ok('le client est rattache a la vente en base',
     q("SELECT lg_CLIENT_ID FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'") === MARQUE + '-CLT',
     q("SELECT lg_CLIENT_ID FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'"));
  ok('le nom du client est repris sur l ecran de vente', (apresClient.nomAffiche || '').indexOf(MARQUE) !== -1, apresClient.nomAffiche);
  ok('« Retour » permet de revenir au client', apresClient.retourVisible === true);

  // ---- volet 2 : recherche du medecin par « contient », choix au clic
  const champMed = await p.evaluate(() => '#' + Ext.ComponentQuery.query('ordonnanceparcours #rechercheMedecin')[0].inputEl.id);
  await p.click(champMed); await p.keyboard.type('HOUSE', { delay: 40 });
  await p.waitForTimeout(1800);
  const medecins = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceparcours')[0].medecinStore.getRange().map(r => r.get('nom')));
  ok('volet 2 : la recherche par « contient » trouve le medecin d essai', medecins.length >= 1 && medecins.every(n => /HOUSE/.test(n)), medecins.join(','));
  const iconeMed = await p.evaluate(() => {
    const grille = Ext.ComponentQuery.query('ordonnanceparcours #grilleMedecins')[0];
    const ligne = grille.getView().getNode(0);
    const icone = ligne.querySelector('.x-action-col-icon');
    return icone ? '#' + (icone.id || (icone.id = 'e2e-icone-medecin')) : null;
  });
  await p.click(iconeMed);
  await p.waitForTimeout(2500);
  sel = await okButton(); if (sel) { await p.click(sel); await p.waitForTimeout(400); }
  const fin = await p.evaluate(() => ({
    parcoursFerme: Ext.ComponentQuery.query('ordonnanceparcours{isVisible()}').length === 0,
    fenetres: Ext.ComponentQuery.query('window{isVisible()}').map(w => w.title || w.xtype),
    medecinId: testextjs.app.getController('VenteCtr').medecinId
  }));
  ok('volet 2 : le clic sur le medecin ferme le parcours, sans message « veuillez ajouter le client »',
     fin.parcoursFerme && fin.fenetres.length === 0, JSON.stringify(fin));
  const medecinEnBase = q("SELECT medecin_id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'");
  ok('le medecin est rattache a la vente en base',
     medecinEnBase !== '' && medecinEnBase === q("SELECT id FROM medecin WHERE num_ordre='" + MARQUE + "-1'"), medecinEnBase);

  // ---- reouverture : la vente a deja un client, on arrive directement sur le medecin
  await p.evaluate(() => testextjs.app.getController('VenteCtr').ouvrirParcoursOrdonnance());
  await p.waitForTimeout(1200);
  const reouverture = await p.evaluate(() => {
    const f = Ext.ComponentQuery.query('ordonnanceparcours{isVisible()}')[0];
    const volet = f ? f.down('#volets').getLayout().getActiveItem().getItemId() : null;
    if (f) { f.close(); }
    return volet;
  });
  ok('avec un client deja rattache, le parcours s ouvre directement sur le medecin', reouverture === 'voletMedecin', reouverture);

  // ---- les fenetres historiques n'ont pas bouge
  const historiques = await p.evaluate(() => ({
    client: !!Ext.ClassManager.get('testextjs.view.vente.user.ClientLambda'),
    medecin: !!Ext.ClassManager.get('testextjs.view.vente.user.Medecin'),
    ouvrirMedecin: typeof testextjs.app.getController('VenteCtr').showMedicinWindow === 'function',
    ouvrirClient: typeof testextjs.app.getController('VenteCtr').openClientLambdaSearchWindow === 'function'
  }));
  ok('les fenetres historiques client et medecin restent en place pour les autres parcours',
     historiques.client && historiques.medecin && historiques.ouvrirMedecin && historiques.ouvrirClient, JSON.stringify(historiques));

  ok('aucune erreur javascript', err.length === 0, err.join(' | '));
  await b.close();
  nettoyer();
  ok('jeu d essai retire', q("SELECT COUNT(*) FROM medecin WHERE num_ordre LIKE '" + MARQUE + "%'") === '0'
     && q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID='" + MARQUE + "-CLT'") === '0');
  const echecs = res.filter(x => !x.c);
  console.log('\n' + (res.length - echecs.length) + '/' + res.length + ' OK');
  process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); try { nettoyer(); } catch (x) { } process.exit(1); });
