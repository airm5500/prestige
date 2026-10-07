/* WHATSAPP WEB ET MODELES (retours du 07/10). Service compagnon d'essai (WHATSAPP_FAUX=1) lance par le test, compte
 * WEB pointe dessus le temps de l'essai, tout est remis en place a la fin.
 *
 *  - onglet « WhatsApp Web : connexion et règles » : etat « En attente du scan » + QR code, puis « Connecté » (le
 *    service d'essai se connecte apres 3 s) ; le jeton du service n'est jamais renvoye au navigateur ;
 *  - regles : valeur hors bornes ramenee a la valeur conseillee, enregistrees en base ET transmises au service ;
 *  - onglet « Modèles (API officielle) » : fenetre au nouveau design avec apercu ; nom invalide refuse avec le motif ;
 *    modele valide -> Brouillon ; soumission (mode test) -> En attente ; actualisation -> Approuvé ; un modele
 *    approuve ne se modifie plus ; suppression ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const URL = 'http://localhost:8080/prestige';
const JETON = 'jeton-essai-e2e-' + Date.now();
const PORT = 3011;
const DOSSIER = fs.mkdtempSync('/tmp/wa-e2e-');
const lit = (s) => (s === undefined || s === 'NULL' || s === '' ? 'NULL' : "'" + s.replace(/'/g, "''") + "'");

(async () => {
  const sauve = q("SELECT CONCAT_WS('#~#', actif, mode_test, IFNULL(web_url, 'NULL'), IFNULL(web_jeton, 'NULL'), IFNULL(web_regles, 'NULL')) FROM whatsapp_compte WHERE mode = 'WEB'").split('#~#');
  exec("DELETE FROM whatsapp_modele WHERE nom LIKE 'e2e_%'");
  const srv = spawn('/opt/node22/bin/node', [path.join(__dirname, '../../../../outils/whatsapp-web/src/serveur.js')],
    { env: Object.assign({}, process.env, { WHATSAPP_FAUX: '1', WHATSAPP_FAUX_CONNECTE: '1', JETON, PORT: String(PORT), DOSSIER }), stdio: ['ignore', 'pipe', 'pipe'] });
  let journal = ''; srv.stdout.on('data', (d) => { journal += d; }); srv.stderr.on('data', (d) => { journal += d; });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const reponses = []; p.on('response', async (r) => { if (/whatsapp/.test(r.url())) { try { reponses.push(await r.text()); } catch (e) { /* */ } } });
  try {
    await new Promise((r) => setTimeout(r, 1500));
    exec("UPDATE whatsapp_compte SET actif = 1, mode_test = 1, web_url = 'http://127.0.0.1:" + PORT + "', web_jeton = '" + JETON + "', web_regles = NULL WHERE mode = 'WEB'");
    await p.goto(URL + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('whatsappcomptes', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('whatsappcomptes').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel, attente) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(attente || 1200); };
    const boite = () => p.evaluate(() => Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : '');
    const fermerBoite = () => p.evaluate(() => { if (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });

    /* ------------------------------------------------ connexion par QR */
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('whatsappcomptes #ongletsWhatsApp')[0]; t.setActiveTab(t.down('#ongletWeb')); });
    await p.waitForFunction(() => { const q = Ext.ComponentQuery.query('whatsappcomptes #qrWeb')[0]; return q && q.getEl().down('img.wa-qr'); }, null, { timeout: 20000 }).catch(() => {});
    const qr = await p.evaluate(() => ({ etat: Ext.ComponentQuery.query('whatsappcomptes #etatWeb')[0].getEl().dom.textContent,
      img: !!Ext.ComponentQuery.query('whatsappcomptes #qrWeb')[0].getEl().down('img.wa-qr') }));
    ok('Avant le scan : « En attente du scan » et QR code affiché', /En attente du scan/.test(qr.etat) && qr.img, JSON.stringify(qr));
    await p.screenshot({ path: (process.env.SORTIE || '/tmp') + '/wa-qr.png' });
    await p.waitForFunction(() => /Connecté/.test(Ext.ComponentQuery.query('whatsappcomptes #etatWeb')[0].getEl().dom.textContent), null, { timeout: 20000 }).catch(() => {});
    const co = await p.evaluate(() => ({ etat: Ext.ComponentQuery.query('whatsappcomptes #etatWeb')[0].getEl().dom.textContent,
      deco: !Ext.ComponentQuery.query('whatsappcomptes #btnDeconnecterWeb')[0].isDisabled() }));
    ok('Après le scan : « Connecté » avec le numéro, l\'écran se rafraîchit seul', /Connecté/.test(co.etat) && /2250700000000/.test(co.etat) && co.deco, JSON.stringify(co));

    /* ------------------------------------------------ regles */
    await p.evaluate(() => { const f = Ext.ComponentQuery.query('whatsappcomptes #formRegles')[0]; f.down('[name=delaiMinSec]').setValue(1); f.down('[name=plafondJour]').setValue(90); });
    await clic('whatsappcomptes #btnEnregistrerRegles', 2000);
    const msgRegles = await boite(); await fermerBoite();
    const form = await p.evaluate(() => { const f = Ext.ComponentQuery.query('whatsappcomptes #formRegles')[0]; return { min: f.down('[name=delaiMinSec]').getValue(), jour: f.down('[name=plafondJour]').getValue() }; });
    const enBase = JSON.parse(q("SELECT web_regles FROM whatsapp_compte WHERE mode = 'WEB'") || '{}');
    const auService = await (await fetch('http://127.0.0.1:' + PORT + '/regles', { headers: { Authorization: 'Bearer ' + JETON } })).json();
    ok('Règles : 1 s ramené à la valeur conseillée, plafond 90 gardé', form.jour === 90 && form.min >= 5, JSON.stringify(form) + ' ' + msgRegles);
    ok('Règles enregistrées en base et transmises au service', enBase.plafondJour === 90 && (auService.regles || auService).plafondJour === 90, JSON.stringify(enBase) + ' / ' + JSON.stringify(auService).slice(0, 200));

    /* ------------------------------------------------ modeles */
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('whatsappcomptes #ongletsWhatsApp')[0]; t.setActiveTab(t.down('#ongletModeles')); });
    await p.waitForTimeout(1200);
    const ouvrir = async () => { await clic('whatsappcomptes #btnNouveauModele', 1500); };
    const remplir = (v) => p.evaluate((v) => { const w = Ext.ComponentQuery.query('#fenetreModele')[0]; Object.keys(v).forEach((k) => w.down('[name=' + k + ']').setValue(v[k])); }, v);
    await ouvrir();
    const fen = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenetreModele')[0]; return { theme: w.hasCls('fen-theme'),
      sans: w.query('textfield').filter((f) => f.isVisible() && !f.emptyText && f.xtype !== 'combobox' && f.name !== 'categorie').map((f) => f.name) }; });
    ok('Fenêtre « Nouveau modèle » : nouveau design, aide dans les champs', fen.theme && fen.sans.length === 0, JSON.stringify(fen));
    await remplir({ nom: 'E2E Rappel', categorie: 'UTILITY', langue: 'fr', corps: 'Bonjour {{1}}, votre traitement est prêt.', exemples: 'Awa' });
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenetreModele')[0]; w.down('[name=nom]').validate = () => true; });
    await clic('#fenetreModele #btnEnregistrerModele', 1800);
    const refus = await boite(); await fermerBoite();
    ok('Nom invalide (majuscules, espace) refusé avec le motif', /minuscules/i.test(refus) && q("SELECT COUNT(*) FROM whatsapp_modele WHERE nom LIKE 'e2e%' OR nom LIKE 'E2E%'") === '0', refus);
    await remplir({ nom: 'e2e_rappel' });
    const apercu = await p.evaluate(() => Ext.ComponentQuery.query('#fenetreModele #apercuModele')[0].getEl().dom.textContent);
    ok('Aperçu du message (variable remplacée par l\'exemple)', /Bonjour Awa/.test(apercu), apercu);
    await clic('#fenetreModele #btnEnregistrerModele', 1800);
    await fermerBoite();
    ok('Modèle valide enregistré en Brouillon', q("SELECT statut FROM whatsapp_modele WHERE nom = 'e2e_rappel'") === 'BROUILLON');
    const selectionner = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('whatsappcomptes #ongletModeles')[0]; const i = g.getStore().findBy((r) => r.get('nom') === 'e2e_rappel'); g.getSelectionModel().select(i); });
    await p.waitForTimeout(800); await selectionner();
    await clic('whatsappcomptes #btnSoumettreModele', 1800);
    const msgSoumis = await boite(); await fermerBoite();
    ok('Soumission (mode test) : En attente de Meta', q("SELECT statut FROM whatsapp_modele WHERE nom = 'e2e_rappel'") === 'PENDING', msgSoumis);
    await clic('whatsappcomptes #btnSynchroniserModeles', 1800); await fermerBoite();
    ok('Actualisation des statuts : Approuvé', q("SELECT statut FROM whatsapp_modele WHERE nom = 'e2e_rappel'") === 'APPROVED');
    const modif = await p.evaluate(async () => JSON.parse(await (await fetch('../api/v1/whatsapp/modeles', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Ext.ComponentQuery.query('whatsappcomptes #ongletModeles')[0].getStore().findRecord('nom', 'e2e_rappel').get('id'), nom: 'e2e_rappel', langue: 'fr', categorie: 'UTILITY', corps: 'autre' }) })).text()));
    ok('Un modèle approuvé ne se modifie plus', modif.success === false, JSON.stringify(modif));
    await p.waitForTimeout(500); await selectionner();
    await clic('whatsappcomptes #btnSupprimerModele', 800);
    await p.evaluate(() => { const b = Ext.MessageBox.down('button[itemId=yes]'); if (b) { b.btnEl.dom.click(); } });
    await p.waitForTimeout(1500);
    ok('Suppression du modèle', q("SELECT COUNT(*) FROM whatsapp_modele WHERE nom = 'e2e_rappel'") === '0');

    /* ------------------------------------------------ secrets */
    ok('Le jeton du service n\'est jamais renvoyé au navigateur', reponses.length > 0 && !reponses.some((t) => t.includes(JETON)), reponses.length + ' réponses');
    ok('Aucun texte de message ni jeton dans le journal du service', !journal.includes(JETON), journal.slice(0, 200));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    srv.kill();
    exec("DELETE FROM whatsapp_modele WHERE nom LIKE 'e2e_%'");
    exec("UPDATE whatsapp_compte SET actif = " + sauve[0] + ", mode_test = " + sauve[1] + ", web_url = " + lit(sauve[2]) + ", web_jeton = " + lit(sauve[3]) + ", web_regles = " + lit(sauve[4]) + " WHERE mode = 'WEB'");
    fs.rmSync(DOSSIER, { recursive: true, force: true });
    ok('Compte WEB remis en état', q("SELECT IFNULL(web_url, 'NULL') FROM whatsapp_compte WHERE mode = 'WEB'") === sauve[2]);
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
