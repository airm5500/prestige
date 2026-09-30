/* ECRAN DE VENTE (retour du 30/09, suite) : modifier le client standard depuis la caisse, reserve au droit
 * P_CLIENT_STANDARD_MAJ ; suivi de consommation depuis la carte de l'assure.
 *
 * 1. Caissier KGA3 (sans le droit) : le bouton « Modifier » n'apparait pas, le service refuse.
 * 2. admin (droit donne par la migration) : vente comptant, client standard de TEST (ZZVCS) associe par la fenetre de
 *    la caisse, « Modifier », saisie au clavier, Entree : fiche client, vente et caisse a jour. Numero deja pris refuse.
 * 3. admin : vente assurance, assure choisi, bouton suivi de consommation sur sa carte.
 * Ventes et clients de test retires a la fin ; les clients reels ne sont que lus.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOM = 'ZZVCS';
const suffixe = Date.now().toString().slice(-6);
const TEL = '0731' + suffixe;
const TEL2 = '0532' + suffixe;
const ventes = [];
const DROIT = "(SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_CLIENT_STANDARD_MAJ')";
const ROLE = "(SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = 'KGA3' LIMIT 1)";
const RETIRER = 'DELETE FROM t_role_privelege WHERE lg_PRIVILEGE_ID = ' + DROIT + ' AND lg_ROLE_ID = ' + ROLE;
const RENDRE = 'INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)'
  + ' SELECT LEFT(UUID(), 40), ' + ROLE + ', ' + DROIT + ', NOW(), NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege'
  + ' WHERE lg_PRIVILEGE_ID = ' + DROIT + ' AND lg_ROLE_ID = ' + ROLE + ')';

async function connecter(b, login) {
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  p.err = []; p.on('pageerror', (e) => p.err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', login); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 60000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
  await p.waitForTimeout(2500);
  return p;
}
const okButton = (p) => p.evaluate(() => {
  const box = Ext.ComponentQuery.query('messagebox{isVisible()}')[0];
  if (!box) { return null; }
  const btn = box.query('button{isVisible()}').find((x) => /ok|oui/i.test(x.text || ''));
  return btn ? '#' + btn.el.dom.id : null;
});
async function fermerMessages(p) { for (let i = 0; i < 3; i++) { const s = await okButton(p); if (!s) { return; } await p.click(s); await p.waitForTimeout(400); } }

/* Vente comptant ouverte avec un produit. */
async function venteComptant(p) {
  await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} }));
  await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').length > 0, null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  await fermerMessages(p);
  const cip = q("SELECT f.int_CIP FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE f.str_STATUT = 'enable'"
    + " AND s.int_NUMBER_AVAILABLE > 20 AND f.int_PRICE > 0 AND f.int_CIP IS NOT NULL AND f.int_CIP <> '' ORDER BY s.int_NUMBER_AVAILABLE DESC LIMIT 1");
  const ci = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit')[0].inputEl.id);
  await p.click(ci); await p.keyboard.type(cip, { delay: 40 });
  await p.waitForSelector('.x-boundlist-item', { timeout: 20000 }); await p.locator('.x-boundlist-item').first().click();
  await p.waitForTimeout(600);
  const qi = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #qtyField')[0].inputEl.id);
  await p.click(qi); await p.keyboard.press('Control+A'); await p.keyboard.type('1'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr'); return c.getCurrent && c.getCurrent(); }, null, { timeout: 20000 });
  await fermerMessages(p);
  const id = await p.evaluate(() => testextjs.app.getController('VenteCtr').getCurrent().lgPREENREGISTREMENTID);
  ventes.push(id);
  return id;
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  let clientId = null;
  try {
    /* ---------------------------------------------------------------- 1. caissier sans le droit */
    /* Sur le banc, KGA3 a le role Administrateur : le droit lui est retire le temps de sa connexion (les droits sont
       lus a la connexion), puis rendu aussitot, et dans tous les cas en fin de test. */
    exec(RETIRER);
    const caisse = await connecter(b, 'KGA3');
    exec(RENDRE);
    const droitCaisse = await caisse.evaluate(async () => JSON.parse(await (await fetch('../api/v1/vente-client-standard/droit')).text()));
    ok('Caissier sans le droit : le service le dit', droitCaisse.success === true && droitCaisse.modifier === false, JSON.stringify(droitCaisse));
    const refus = await caisse.evaluate(async () => JSON.parse(await (await fetch('../api/v1/vente-client-standard/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"nom":"A"}' })).text()));
    ok('Caissier sans le droit : l\'enregistrement est refusé par le serveur', refus.success === false && /profil/.test(refus.message), refus.message);
    await venteComptant(caisse);
    const bouton = await caisse.evaluate(() => { const x = Ext.ComponentQuery.query('doventemanager #contenu #infosClientStandard #modifierClientStandard')[0]; return x ? { rendu: x.rendered, visible: x.isVisible(true) || !x.hidden } : null; });
    ok('Caissier sans le droit : pas de bouton « Modifier »', bouton && bouton.visible === false, JSON.stringify(bouton));
    ok('Caissier : aucune erreur JavaScript', caisse.err.length === 0, JSON.stringify(caisse.err));
    await caisse.close();

    /* ---------------------------------------------------------------- 2. admin : modification */
    const p = await connecter(b, 'admin');
    const cree = await p.evaluate(async (a) => JSON.parse(await (await fetch('../api/v1/client/add/lambda', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strFIRSTNAME: a.nom, strLASTNAME: 'AVANT', strADRESSE: a.tel, lgTYPECLIENTID: '6', consentSms: 'true' }) })).text()), { nom: NOM, tel: TEL });
    clientId = cree.data && cree.data.lgCLIENTID;
    ok('Client standard de test créé', !!clientId, JSON.stringify(cree).slice(0, 200));
    const venteId = await venteComptant(p);
    const assoc = await p.evaluate(() => { const b = Ext.ComponentQuery.query('doventemanager #contenu #btnClientComptant')[0]; return b && b.isVisible() ? b.getId() : null; });
    await p.click('#' + assoc); await p.waitForTimeout(1500);
    await p.evaluate((nom) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; const st = g.getStore(); st.getProxy().extraParams = Ext.apply(st.getProxy().extraParams || {}, { query: nom }); st.load(); }, NOM);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lgCLIENTID', id) >= 0; }, clientId, { timeout: 20000 });
    await p.evaluate((id) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; const i = g.getStore().findExact('lgCLIENTID', id); testextjs.app.getController('VenteCtr').btnAjouterClientLambda(g, i, i); }, clientId);
    await p.waitForTimeout(2000);
    await fermerMessages(p);
    const modif = await p.evaluate(() => { const x = Ext.ComponentQuery.query('doventemanager #contenu #infosClientStandard #modifierClientStandard')[0]; const s = Ext.ComponentQuery.query('doventemanager #contenu #infosClientStandard #suiviConsoClient')[0];
      return x && x.isVisible() ? { id: x.getId(), apresSuivi: x.getEl().getLeft() > s.getEl().getLeft() } : null; });
    ok('admin : « Modifier » apparaît sur la ligne du client, après « Suivi conso »', modif && modif.apresSuivi, JSON.stringify(modif));
    await p.click('#' + modif.id);
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('clientstandardfenetre')[0]; return w && w.down('#csNom').getValue() !== ''; }, null, { timeout: 15000 });
    await p.waitForTimeout(400);
    const fen = await p.evaluate(() => { const w = Ext.ComponentQuery.query('clientstandardfenetre')[0]; const d = w.getEl().dom;
      return { modal: w.modal, nom: w.down('#csNom').getValue(), prenoms: w.down('#csPrenoms').getValue(), tel: w.down('#csTelephone').getValue(), focus: document.activeElement === w.down('#csNom').inputEl.dom,
        boutonsExt: d.querySelectorAll('.x-btn').length, barre: !!d.querySelector('.x-window-header') }; });
    ok('Fenêtre modale remplie avec la fiche, curseur dans le Nom', fen.modal && fen.nom === NOM && fen.prenoms === 'AVANT' && fen.tel === TEL && fen.focus, JSON.stringify(fen));
    ok('Dessin propre : ni barre de titre ni bouton ExtJS standard', fen.boutonsExt === 0 && !fen.barre, JSON.stringify(fen));
    await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    await p.keyboard.press('Control+A'); await p.keyboard.type('APRES AWA'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    await p.keyboard.press('Control+A'); await p.keyboard.type(TEL2); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    await p.keyboard.type('5'); await p.keyboard.press('Enter'); await p.keyboard.type('11'); await p.keyboard.press('Enter');
    const partiel = await p.evaluate(() => Ext.ComponentQuery.query('clientstandardfenetre #csNaissance')[0].getRawValue());
    ok('Date guidée dans la fenêtre : « 05/11/ »', partiel === '05/11/', partiel);
    await p.keyboard.type('90'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => Ext.ComponentQuery.query('clientstandardfenetre').length === 0, null, { timeout: 15000 });
    await p.waitForTimeout(600);
    const base = q("SELECT CONCAT_WS('|', str_FIRST_NAME, str_LAST_NAME, str_ADRESSE, str_TELEPHONE, DATE(dt_NAISSANCE), lg_TYPE_CLIENT_ID) FROM t_client WHERE lg_CLIENT_ID='" + clientId + "'");
    ok('Entrée sur l\'année : fiche enregistrée (nom, prénoms, téléphone, né le 05/11/1990)', base === NOM + '|APRES AWA|' + TEL2 + '|' + TEL2 + '|1990-11-05|6', base);
    const vente = q("SELECT CONCAT_WS('|', str_LAST_NAME_CUSTOMER, str_PHONE_CUSTOME, str_STATUT) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'");
    ok('La vente en cours porte le nom et le téléphone corrigés', vente === 'APRES AWA|' + TEL2 + '|is_Process', vente);
    const ecran = await p.evaluate(() => { const z = Ext.ComponentQuery.query('doventemanager #contenu #infosClientStandard')[0]; return [z.down('#prenomClient').getValue(), z.down('#telephoneClient').getValue(), testextjs.app.getController('VenteCtr').getClient().get('strLASTNAME')].join('|'); });
    ok('La caisse affiche aussitôt la fiche corrigée', ecran === 'APRES AWA|' + TEL2 + '|APRES AWA', ecran);
    const autre = q("SELECT str_TELEPHONE FROM t_client WHERE lg_TYPE_CLIENT_ID='6' AND str_TELEPHONE IS NOT NULL AND str_TELEPHONE <> '' AND lg_CLIENT_ID <> '" + clientId + "' LIMIT 1");
    const doublon = await p.evaluate(async (a) => JSON.parse(await (await fetch('../api/v1/vente-client-standard/' + a.id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: 'X', prenoms: 'Y', telephone: a.tel }) })).text()), { id: clientId, tel: autre });
    ok('Numéro déjà porté par un autre client standard : refusé', doublon.success === false && /déjà/.test(doublon.message), doublon.message);
    const assureId = q("SELECT lg_CLIENT_ID FROM t_client WHERE lg_TYPE_CLIENT_ID='1' AND str_STATUT='enable' LIMIT 1");
    const pasStandard = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/vente-client-standard/' + id)).text()), assureId);
    ok('Un client assurance ne se modifie pas depuis la caisse', pasStandard.success === false && /standard/.test(pasStandard.message), pasStandard.message);
    const invalide = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/vente-client-standard/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: '', prenoms: 'Y', telephone: '12', naissance: '2031-01-01' }) })).text()), clientId);
    ok('Saisie invalide : toutes les raisons d\'un coup', invalide.success === false && /nom est obligatoire/.test(invalide.message) && /téléphone invalide/.test(invalide.message) && /futur/.test(invalide.message), invalide.message);
    await p.click('#' + modif.id);
    await p.waitForFunction(() => Ext.ComponentQuery.query('clientstandardfenetre').length === 1, null, { timeout: 10000 });
    await p.waitForTimeout(800);
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    ok('Échap ferme la fenêtre sans rien changer', (await p.evaluate(() => Ext.ComponentQuery.query('clientstandardfenetre').length)) === 0 && q("SELECT str_LAST_NAME FROM t_client WHERE lg_CLIENT_ID='" + clientId + "'") === 'APRES AWA');

    /* ---------------------------------------------------------------- 3. vente assurance : suivi conso de l'assure */
    const assure = q("SELECT CONCAT_WS('|', c.lg_CLIENT_ID, c.str_FIRST_NAME) FROM t_client c JOIN t_compte_client cc ON cc.lg_CLIENT_ID=c.lg_CLIENT_ID"
      + " JOIN t_compte_client_tiers_payant ctp ON ctp.lg_COMPTE_CLIENT_ID=cc.lg_COMPTE_CLIENT_ID WHERE c.lg_TYPE_CLIENT_ID='1' AND c.str_STATUT='enable'"
      + " AND ctp.str_STATUT='enable' LIMIT 1").split('|');
    await p.evaluate((a) => {
      const ctr = testextjs.app.getController('VenteCtr');
      const combo = ctr.getTypeVenteCombo();
      const rec = combo.getStore().findRecord('lgTYPEVENTEID', '2') || combo.getStore().getAt(1);
      combo.select(rec); combo.fireEvent('select', combo, [rec]);
    }, assure);
    await p.waitForTimeout(1500);
    await fermerMessages(p);
    const carte = await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #contenu #assureContainer')[0]; return c && c.isVisible(); });
    ok('Vente assurance : la carte de l\'assuré s\'affiche', carte, String(carte));
    const champ = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu #clientSearchTextField')[0].inputEl.id);
    await p.click(champ); await p.keyboard.type(assure[1], { delay: 30 }); await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    /* La fenetre de choix du client : on prend l'assure vise dans sa grille. */
    const choisi = await p.evaluate((id) => {
      const g = Ext.ComponentQuery.query('window gridpanel{isVisible()}').find((x) => x.getStore().findExact('lgCLIENTID', id) >= 0);
      if (!g) { return 'grille introuvable : ' + Ext.ComponentQuery.query('window{isVisible()}').map((w) => w.xtype + '/' + (w.title || '')).join(','); }
      const rec = g.getStore().getAt(g.getStore().findExact('lgCLIENTID', id));
      g.getSelectionModel().select(rec); g.fireEvent('itemdblclick', g.getView(), rec);
      return 'ok';
    }, assure[0]);
    await p.waitForTimeout(2500);
    await fermerMessages(p);
    const suivi = await p.evaluate(() => { const b = Ext.ComponentQuery.query('doventemanager #contenu #assureCmp #suiviConsoAssure')[0]; const m = Ext.ComponentQuery.query('doventemanager #contenu #assureCmp #btnModifierInfo')[0];
      return b && b.isVisible() ? { id: b.getId(), apresModifier: b.getEl().getLeft() > m.getEl().getLeft(), client: testextjs.app.getController('VenteCtr').getClient() && testextjs.app.getController('VenteCtr').getClient().get('lgCLIENTID') } : null; });
    ok('Assuré choisi : bouton suivi de consommation sur sa carte, après le crayon', suivi && suivi.apresModifier && suivi.client === assure[0], choisi + ' ' + JSON.stringify(suivi));
    await p.click('#' + suivi.id);
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('suiviconsofenetre')[0]; return w && w.getEl().dom.querySelector('.vc-tuiles, .vc-vide'); }, null, { timeout: 20000 });
    const nomSuivi = await p.evaluate(() => Ext.ComponentQuery.query('suiviconsofenetre')[0].getEl().dom.querySelector('.vc-nom').textContent);
    ok('La fenêtre de suivi s\'ouvre au nom de l\'assuré', nomSuivi.indexOf(assure[1]) >= 0, nomSuivi);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    const venteAssurance = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').getCurrent(); return c ? c.lgPREENREGISTREMENTID : null; });
    if (venteAssurance && ventes.indexOf(venteAssurance) < 0) { ventes.push(venteAssurance); }
    ok('admin : aucune erreur JavaScript', p.err.length === 0, JSON.stringify(p.err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    exec(RENDRE);
    ok('Droit rendu au rôle du banc', q('SELECT COUNT(*) FROM t_role_privelege WHERE lg_PRIVILEGE_ID = ' + DROIT + ' AND lg_ROLE_ID = ' + ROLE) === '1');
    for (const v of ventes) {
      for (const t of ['t_preenregistrement_compte_client_tiers_payent', 't_preenregistrement_compte_client', 't_preenregistrement_detail']) {
        exec('DELETE FROM ' + t + " WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
      }
      exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
    }
    ok('Ventes de test retirées', ventes.every((v) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'") === '0'), ventes.join(','));
    const ids = q("SELECT GROUP_CONCAT(CONCAT(\"'\", lg_CLIENT_ID, \"'\")) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'");
    if (ids && ids !== 'NULL') {
      exec('DELETE FROM t_preenregistrement WHERE lg_CLIENT_ID IN (' + ids + ") AND str_STATUT = 'is_Process'");
      exec('DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_client WHERE lg_CLIENT_ID IN (' + ids + ')');
    }
    ok('Client de test retiré', q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
