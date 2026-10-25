/* CAMPAGNES WHATSAPP : PIECE JOINTE (retour du 24/10, repris du CRM UBIPHARM), par l'ecran.
 *
 * Service WhatsApp Web d'essai (WHATSAPP_FAUX=1, trace des envois sans numero ni texte) lance par le test ; compte WEB
 * pointe dessus, mode WhatsApp par defaut sur Web, mode test coupe pour que le message aille vraiment au service.
 * Un seul client fictif (ZZPIECE) avec accord WhatsApp explicite. Tout est remis en place a la fin.
 *  - onglet « Infos clients » : le bouton « Joindre une image ou un PDF » n'apparait que pour un canal WhatsApp ;
 *  - un fichier texte est refuse avec le motif ; une image PNG est acceptee (nom et taille affiches, « Retirer ») ;
 *  - repasser en SMS retire la piece ;
 *  - envoi (confirmation dans le bouton) : la piece est gardee sur la campagne et le service la recoit intacte
 *    (meme empreinte), le message en legende ;
 *  - l'API refuse une piece pour le canal SMS, un fichier qui n'est ni image ni PDF, et le mode API de Meta ;
 *  - aucune fenetre, aucune erreur JavaScript ; le texte du message n'apparait pas dans les journaux.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync, spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const privilegeEssai = require('../support/privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const URL = 'http://localhost:8080/prestige';
const LOG = '/opt/payara5/glassfish/domains/domain1/logs/server.log';
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_SM_CAMPAGNES');
const JETON = 'jeton-essai-pj-' + Date.now();
const PORT = 3012;
const DOSSIER = fs.mkdtempSync(ENV_E2E.TMP + '/wa-pj-');
const TRACE = path.join(DOSSIER, 'trace.jsonl');
const lit = (s) => (s === undefined || s === 'NULL' || s === '' ? 'NULL' : "'" + s.replace(/'/g, "''") + "'");

const A = 'E2E-PJ-A';
const CAT = q("SELECT id FROM categorie_notification WHERE name = 'CAMPAGNE'");
const TEXTE = 'Promo e2e ' + Date.now() + ' : voir le visuel.';
/* vraie image PNG 1 x 1 */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const SHA = crypto.createHash('sha256').update(PNG).digest('hex');

function nettoyer(debut) {
  exec(`DELETE FROM whatsapp_message WHERE client_id = '${A}';`
    + `DELETE FROM notification_client WHERE client_id = '${A}';`
    + `DELETE FROM notification WHERE type_notification = ${CAT} AND entity_ref = '${A}';`
    + (debut ? `DELETE l FROM t_campagne_ligne l JOIN t_campagne c ON c.id = l.campagne_id WHERE c.created_at >= '${debut}';`
      + `DELETE FROM t_campagne WHERE created_at >= '${debut}';` : '')
    + `DELETE FROM t_campagne_ligne WHERE lg_CLIENT_ID = '${A}';`
    + `DELETE FROM t_client WHERE lg_CLIENT_ID = '${A}';`);
}

(async () => {
  droit.remettre();
  nettoyer(null);
  const debut = q('SELECT NOW()');
  const sauve = q("SELECT CONCAT_WS('#~#', actif, mode_test, IFNULL(web_url, 'NULL'), IFNULL(web_jeton, 'NULL'), IFNULL(web_regles, 'NULL')) FROM whatsapp_compte WHERE mode = 'WEB'").split('#~#');
  const modeAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'");
  const tailleLog = fs.statSync(LOG).size;
  const srv = spawn('/opt/node22/bin/node', [path.join(__dirname, '../../../../outils/whatsapp-web/src/serveur.js')],
    { env: Object.assign({}, process.env, { WHATSAPP_FAUX: '1', WHATSAPP_FAUX_CONNECTE: '1', WHATSAPP_FAUX_TRACE: TRACE, JETON, PORT: String(PORT), DOSSIER }), stdio: ['ignore', 'pipe', 'pipe'] });
  let journalService = ''; srv.stdout.on('data', (d) => { journalService += d; }); srv.stderr.on('data', (d) => { journalService += d; });
  const service = (methode, route, corps) => fetch('http://127.0.0.1:' + PORT + route, { method: methode,
    headers: { Authorization: 'Bearer ' + JETON, 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined }).then((r) => r.json());

  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [], err = [];
  try {
    await new Promise((r) => setTimeout(r, 1500));
    /* service : connexion simulee (QR vu, puis 3 s), horaires ouverts toute la journee pour l'essai */
    await service('GET', '/qr');
    await service('PUT', '/regles', { heureDebut: 0, heureFin: 24 });
    exec("UPDATE whatsapp_compte SET actif = 1, mode_test = 0, web_url = 'http://127.0.0.1:" + PORT + "', web_jeton = '" + JETON + "', web_regles = NULL WHERE mode = 'WEB';"
      + "UPDATE t_parameters SET str_VALUE = 'WEB' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';"
      + "INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_ADRESSE, str_SEXE, dt_NAISSANCE, dt_CREATED, dt_UPDATED, str_STATUT) VALUES"
      + ` ('${A}', 'ZZPIECE', 'AMI', '1', '0707070721', 'F', '1990-03-03', NOW(), NOW(), 'enable');`
      + `UPDATE t_client SET bool_CONSENT_WHATSAPP = 1 WHERE lg_CLIENT_ID = '${A}';`);

    const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('campagnes', {}));
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    await p.click('.campagnes .x-tab:has-text("Infos clients")');
    await p.waitForTimeout(1500);
    const O = 'campagnes #onglet-INFO_CLIENTS';
    const cliquer = async (requete) => {
      const id = await p.evaluate((r) => { const c = Ext.ComponentQuery.query(r)[0]; return c && c.getEl() ? c.getEl().id : null; }, requete);
      if (!id) { throw new Error('Composant introuvable : ' + requete); }
      await p.click('#' + id);
    };
    const visible = (requete) => p.evaluate((r) => { const c = Ext.ComponentQuery.query(r)[0]; return !!(c && c.isVisible(true)); }, requete);
    const texte = (requete) => p.evaluate((r) => Ext.ComponentQuery.query(r)[0].getEl().dom.textContent, requete);
    const canal = async (v) => { await p.evaluate((x) => { Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #canal')[0].setValue(x); }, v); await p.waitForTimeout(800); };
    const joindre = async (nom, mimeType, buffer) => {
      const id = await p.evaluate((r) => Ext.ComponentQuery.query(r)[0].fileInputEl.id, O + ' #piece');
      await p.setInputFiles('#' + id, { name: nom, mimeType, buffer });
      await p.waitForTimeout(1200);
    };

    /* --- le bouton n'existe que pour WhatsApp */
    await canal('SMS');
    ok('Canal SMS : pas de bouton « Joindre une image ou un PDF »', !(await visible(O + ' #zonePiece')));
    await canal('WHATSAPP');
    ok('Canal WhatsApp : bouton « Joindre une image ou un PDF » affiché', await visible(O + ' #zonePiece')
      && await p.evaluate((r) => Ext.ComponentQuery.query(r)[0].button.getText(), O + ' #piece') === 'Joindre une image ou un PDF');

    /* --- fichier refuse, image acceptee */
    await joindre('notes.txt', 'text/plain', Buffer.from('pas une image'));
    ok('Fichier texte refusé avec le motif, rien de joint', /image JPEG, PNG ou un document PDF/.test(await texte(O + ' #etat'))
      && await p.evaluate((r) => !Ext.ComponentQuery.query(r)[0].pieceJointe, O) && !(await visible(O + ' #retirerPiece')), await texte(O + ' #etat'));
    await joindre('visuel-promo.png', 'image/png', PNG);
    const nom = await texte(O + ' #nomPiece');
    ok('Image PNG jointe : nom et taille affichés, « Retirer » proposé, motif effacé', /visuel-promo\.png \(1 Ko\)/.test(nom) && await visible(O + ' #retirerPiece')
      && (await texte(O + ' #etat')).trim() === '', nom);

    /* --- repasser en SMS retire la piece */
    await canal('SMS');
    ok('Retour au canal SMS : pièce retirée', await p.evaluate((r) => !Ext.ComponentQuery.query(r)[0].pieceJointe, O) && (await texte(O + ' #nomPiece')) === '');
    await canal('WHATSAPP');
    await joindre('visuel-promo.png', 'image/png', PNG);

    /* --- destinataire, message, envoi confirme dans le bouton */
    await p.evaluate((r) => { const o = Ext.ComponentQuery.query(r)[0]; o.down('#recherche').setValue('ZZPIECE'); o.down('#sexe').setValue(''); o.down('#accord').setValue(true); }, O);
    await cliquer(O + ' #voir');
    await p.waitForTimeout(2500);
    const coches = await p.evaluate((r) => Ext.ComponentQuery.query(r)[0].getSelectionModel().getCount(), O + ' #destinataires');
    ok('Un destinataire joignable (accord WhatsApp explicite)', coches === 1, coches);
    await p.evaluate((x) => { Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #texte')[0].setValue(x); }, TEXTE);
    await p.waitForTimeout(1500);
    ok('La pièce reste jointe après la recherche et la saisie du message', /visuel-promo\.png/.test(await texte(O + ' #nomPiece')));
    await cliquer(O + ' #envoyer');
    await p.waitForTimeout(300);
    const conf = await p.evaluate((r) => Ext.ComponentQuery.query(r)[0].getText(), O + ' #envoyer');
    ok('Confirmation dans le bouton (sans fenêtre)', /Confirmer l'envoi à 1 client/.test(conf), conf);
    await cliquer(O + ' #envoyer');
    await p.waitForFunction(() => /en cours d'envoi/.test(Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #etat')[0].getEl().dom.textContent), null, { timeout: 30000 }).catch(() => {});
    ok('Envoi accepté ; la pièce est retirée de l\'écran après l\'envoi', /en cours d'envoi/.test(await texte(O + ' #etat')) && (await texte(O + ' #nomPiece')) === '', await texte(O + ' #etat'));
    const camp = q(`SELECT CONCAT_WS('|', canal, piece_jointe_type, piece_jointe_mime, piece_jointe_nom, SHA2(piece_jointe, 256)) FROM t_campagne WHERE categorie = 'INFO_CLIENTS' AND created_at >= '${debut}'`);
    ok('Campagne : pièce gardée intacte (type, nom, empreinte)', camp === `WHATSAPP|image|image/png|visuel-promo.png|${SHA}`, camp);

    /* --- le service recoit l'image (frappe simulee : quelques secondes) */
    const fin = Date.now() + 40000;
    let trace = [];
    while (Date.now() < fin) {
      trace = fs.existsSync(TRACE) ? fs.readFileSync(TRACE, 'utf8').trim().split('\n').filter(Boolean).map((x) => JSON.parse(x)) : [];
      if (trace.length) { break; }
      await new Promise((r) => setTimeout(r, 1000));
    }
    ok('Service WhatsApp Web : image reçue intacte, message en légende, un seul envoi', trace.length === 1 && trace[0].nature === 'media' && trace[0].type === 'image'
      && trace[0].mimeType === 'image/png' && trace[0].nomFichier === 'visuel-promo.png' && trace[0].sha256 === SHA && trace[0].legende === true, JSON.stringify(trace));
    await p.waitForTimeout(1500);
    ok('Message WhatsApp du client : envoyé (pas simulé)', q(`SELECT CONCAT(statut, ':', simule + 0) FROM whatsapp_message WHERE client_id = '${A}'`) === 'ENVOYE:0',
      q(`SELECT CONCAT(statut, ':', simule + 0) FROM whatsapp_message WHERE client_id = '${A}'`));
    ok('La pièce n\'est pas gardée sur le poste du service après l\'envoi', !fs.existsSync(path.join(DOSSIER, 'medias')) || fs.readdirSync(path.join(DOSSIER, 'medias')).length === 0);

    /* --- refus de l'API */
    const api = (corps) => p.evaluate(async (c) => (await (await fetch('../api/v1/campagnes/envoyer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })).json()), corps);
    const piece = { base64: PNG.toString('base64'), nomFichier: 'v.png' };
    const base = { categorie: 'INFO_CLIENTS', clientIds: [A], message: TEXTE, accordExplicite: true };
    const rSms = await api(Object.assign({ canal: 'SMS', pieceJointe: piece }, base));
    ok('API : pièce jointe refusée pour le canal SMS', rSms.success === false && /ne part que par WhatsApp/.test(rSms.message), JSON.stringify(rSms));
    const rTxt = await api(Object.assign({ canal: 'WHATSAPP', pieceJointe: { base64: Buffer.from('bonjour').toString('base64'), nomFichier: 'x.png' } }, base));
    ok('API : fichier ni image ni PDF refusé (reconnu à son contenu, pas à son nom)', rTxt.success === false && /image JPEG, PNG ou un document PDF/.test(rTxt.message), JSON.stringify(rTxt));
    exec("UPDATE t_parameters SET str_VALUE = 'API' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'");
    const rApi = await api(Object.assign({ canal: 'WHATSAPP', pieceJointe: piece }, base));
    ok('API : mode WhatsApp « API de Meta » -> pièce refusée, avec la marche à suivre', rApi.success === false && /WhatsApp Web seulement/.test(rApi.message), JSON.stringify(rApi));
    ok('Les refus ne créent aucune campagne', q(`SELECT COUNT(*) FROM t_campagne WHERE created_at >= '${debut}'`) === '1');

    /* --- confidentialite, ergonomie */
    const log = fs.readFileSync(LOG, 'utf8').slice(tailleLog);
    ok('Le texte du message n\'apparaît ni dans le journal du serveur ni dans celui du service', !log.includes(TEXTE) && !journalService.includes(TEXTE) && !journalService.includes(JETON));
    ok('Aucune fenêtre', dialogues.length === 0, dialogues.join(' | '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    srv.kill();
    nettoyer(debut);
    exec("UPDATE whatsapp_compte SET actif = " + sauve[0] + ", mode_test = " + sauve[1] + ", web_url = " + lit(sauve[2]) + ", web_jeton = " + lit(sauve[3]) + ", web_regles = " + lit(sauve[4]) + " WHERE mode = 'WEB';"
      + "UPDATE t_parameters SET str_VALUE = " + lit(modeAvant) + " WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';");
    droit.remettre();
    fs.rmSync(DOSSIER, { recursive: true, force: true });
    ok('Tout est remis en état', q("SELECT IFNULL(web_url, 'NULL') FROM whatsapp_compte WHERE mode = 'WEB'") === sauve[2]
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'") === modeAvant
      && q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '${A}'`) === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
