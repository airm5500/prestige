/* CAMPAGNES : STATUT « RÉPONDU » (plan avoir du 08/11, point 4).
 *
 * Defaut signale : une campagne WhatsApp, le destinataire ouvre seulement la conversation, sans rien ecrire, et le
 * message apparait « répondu ». Cause : tout message entrant du meme numero dans les 7 jours comptait, y compris les
 * evenements sans contenu que le fil garde (« request_welcome » de l'API officielle, envoye quand le client OUVRE la
 * conversation ; messages techniques du service WhatsApp Web, ranges en « [message] »).
 *
 * Jeu d'essai : 6 clients « ZZREP » (numeros fictifs 0100991xxx), une campagne « Infos clients » envoyee par l'ecran
 * en WhatsApp simule (mode test, aucun vrai message). Puis, par le vrai webhook de l'API officielle (signature
 * calculee avec un secret d'essai, remis a la fin) ou directement dans le fil :
 *  R1 ouvre la conversation (request_welcome)              -> pas répondu
 *  R2 message technique WhatsApp Web (« [message] »)       -> pas répondu
 *  R3 a ecrit AVANT l'envoi                                -> pas répondu
 *  R4 repond par un texte                                  -> répondu
 *  R5 repond par une image                                 -> répondu
 *  R6 repond apres le delai (8 jours, delai de 7)          -> pas répondu
 * Journal (colonne « Répondus ») et suivi des messages (colonne « Répondu ») sont compares a l'attendu et entre eux.
 */
const { chromium } = require('playwright-core');
const crypto = require('crypto');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const IDS = ['E2E-REP-1', 'E2E-REP-2', 'E2E-REP-3', 'E2E-REP-4', 'E2E-REP-5', 'E2E-REP-6'];
const clients = "('" + IDS.join("','") + "')";
const TEL = (i) => '010099100' + i;
const SECRET = 'E2E-SECRET-REPONDU';
const CAT = q("SELECT id FROM categorie_notification WHERE name = 'CAMPAGNE'");

function nettoyer(debut) {
  exec("DELETE FROM whatsapp_discussion WHERE numero LIKE '010099100%';"
    + "DELETE FROM whatsapp_message WHERE client_id IN " + clients + ";"
    + "DELETE nc FROM notification_client nc WHERE nc.client_id IN " + clients + ";"
    + "DELETE FROM notification WHERE type_notification = " + CAT + " AND entity_ref IN " + clients + ";"
    + (debut ? "DELETE l FROM t_campagne_ligne l JOIN t_campagne c ON c.id = l.campagne_id WHERE c.created_at >= '" + debut + "' AND l.lg_CLIENT_ID IN " + clients + ";"
      + "DELETE c FROM t_campagne c WHERE c.created_at >= '" + debut + "' AND NOT EXISTS (SELECT 1 FROM t_campagne_ligne l WHERE l.campagne_id = c.id);" : '')
    + "DELETE FROM t_campagne_ligne WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN " + clients + ";");
}

(async () => {
  nettoyer(null);
  const debut = q('SELECT NOW()');
  const compteAvant = q("SELECT CONCAT_WS('|', actif, mode_test, COALESCE(phone_number_id,'~'), COALESCE(access_token,'~'), COALESCE(app_secret,'~')) FROM whatsapp_compte WHERE mode = 'API'");
  const secretAvant = q("SELECT app_secret IS NULL FROM whatsapp_compte WHERE mode = 'API'");
  const modeAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'");
  const delaiAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CAMPAGNE_DELAI_REPONSE'");
  ok('Numéros fictifs libres, secret du webhook d\'essai posable (aucun secret réel remplacé)', q("SELECT COUNT(*) FROM t_client WHERE str_TELEPHONE LIKE '010099100%'") === '0' && secretAvant === '1');
  exec("UPDATE whatsapp_compte SET actif = 1, mode_test = 1, phone_number_id = COALESCE(phone_number_id, '1234567890'), access_token = COALESCE(access_token, 'E2E-CMP-JETON'), app_secret = '" + SECRET + "' WHERE mode = 'API';"
    + "UPDATE t_parameters SET str_VALUE = 'API' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';"
    + "UPDATE t_parameters SET str_VALUE = '7' WHERE str_KEY = 'KEY_CAMPAGNE_DELAI_REPONSE';"
    + IDS.map((id, i) => "INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED, dt_UPDATED, bool_CONSENT_WHATSAPP)"
      + ` VALUES ('${id}', 'ZZREP', 'R${i + 1}', '${TEL(i + 1)}', '6', 'enable', NOW(), NOW(), 1);`).join(''));

  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  /* webhook de l'API officielle, signe comme Meta */
  const webhook = async (messages) => {
    const corps = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'E2E', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', messages } }] }] });
    const sig = 'sha256=' + crypto.createHmac('sha256', SECRET).update(corps, 'utf8').digest('hex');
    return p.evaluate(async ([c, s]) => (await fetch('../api/v1/whatsapp/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': s }, body: c })).status, [corps, sig]);
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    /* envoi par l'ecran : Infos clients, « ZZREP », WhatsApp, texte saisi */
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS')[0].tab.getEl().dom.id));
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS')[0]; o.down('#recherche').setValue('ZZREP'); o.down('#canal').setValue('WHATSAPP'); });
    await cliquer(p, 'campagnes #onglet-INFO_CLIENTS #voir');
    await p.waitForFunction(() => /Destinataires : 6 joignable/.test(Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #destinataires')[0].title), null, { timeout: 30000 });
    await p.evaluate(() => { const o = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS')[0]; o.down('#modele').clearValue(); o.down('#texte').setValue('Bonjour {prenom}, essai e2e répondu.'); });
    await p.waitForTimeout(600);
    await cliquer(p, 'campagnes #onglet-INFO_CLIENTS #envoyer');
    await p.waitForTimeout(300);
    await cliquer(p, 'campagnes #onglet-INFO_CLIENTS #envoyer');
    for (let i = 0; i < 40 && q(`SELECT COUNT(*) FROM whatsapp_message WHERE client_id IN ${clients}`) !== '6'; i++) { await p.waitForTimeout(500); }
    ok('Campagne envoyée par l\'écran : 6 messages WhatsApp simulés', q(`SELECT COUNT(*) FROM whatsapp_message WHERE client_id IN ${clients} AND statut = 'SIMULE'`) === '6');
    const campagne = q(`SELECT DISTINCT l.campagne_id FROM t_campagne_ligne l WHERE l.lg_CLIENT_ID = 'E2E-REP-1'`);
    await p.waitForTimeout(1200); /* les entrants doivent etre posterieurs a l'envoi (horodatage a la seconde) */

    /* R1 : ouvre la conversation ; R4 : texte ; R5 : image (par le vrai webhook, signe) */
    const st = await webhook([
      { from: '225' + TEL(1), id: 'E2E-REP-W1', timestamp: String(Math.floor(Date.now() / 1000)), type: 'request_welcome' },
      { from: '225' + TEL(4), id: 'E2E-REP-W4', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'Merci, je passe demain' } },
      { from: '225' + TEL(5), id: 'E2E-REP-W5', timestamp: String(Math.floor(Date.now() / 1000)), type: 'image', image: { id: 'E2E', mime_type: 'image/jpeg' } }]);
    ok('Webhook de l\'API officielle accepté (signature d\'essai)', st === 200, st);
    /* R2 : message technique de WhatsApp Web, tel que le service le transmet et que le fil le garde */
    exec(`INSERT INTO whatsapp_discussion (numero, sens, type, texte, message_id, lu, created_at) VALUES ('${TEL(2)}', 'E', 'TEXTE', '[message]', 'E2E-REP-W2', 0, NOW());`
      /* R3 : a ecrit avant l'envoi ; R6 : repond apres le delai */
      + `INSERT INTO whatsapp_discussion (numero, sens, type, texte, message_id, lu, created_at) SELECT '${TEL(3)}', 'E', 'TEXTE', 'Bonjour', 'E2E-REP-W3', 1, w.created_at - INTERVAL 1 HOUR FROM whatsapp_message w WHERE w.client_id = 'E2E-REP-3';`
      + `INSERT INTO whatsapp_discussion (numero, sens, type, texte, message_id, lu, created_at) SELECT '${TEL(6)}', 'E', 'TEXTE', 'Bonjour', 'E2E-REP-W6', 0, w.created_at + INTERVAL 8 DAY FROM whatsapp_message w WHERE w.client_id = 'E2E-REP-6';`);
    const fil = q("SELECT GROUP_CONCAT(CONCAT(numero, ':', type) ORDER BY numero) FROM whatsapp_discussion WHERE numero LIKE '010099100%' AND sens = 'E'");
    ok('Fil : les 6 entrants sont gardés (dont l\'ouverture, de type AUTRE)', fil.split(',').length === 6 && fil.indexOf(TEL(1) + ':AUTRE') >= 0, fil);

    /* journal et suivi, par l'ecran */
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('campagnes #ongletJournal')[0].tab.getEl().dom.id));
    await p.waitForFunction((id) => Ext.ComponentQuery.query('campagnes #journal')[0].getStore().findExact('id', id) >= 0, campagne, { timeout: 30000 });
    const ligneJournal = await p.evaluate((id) => { const s = Ext.ComponentQuery.query('campagnes #journal')[0].getStore(); return s.getAt(s.findExact('id', id)).data; }, campagne);
    ok('Journal : 2 répondus (R4 texte, R5 image), pas l\'ouverture ni le message technique', ligneJournal.repondus === 2, 'repondus=' + ligneJournal.repondus);
    await p.evaluate((id) => { const g = Ext.ComponentQuery.query('campagnes #journal')[0]; g.getSelectionModel().select(g.getStore().getAt(g.getStore().findExact('id', id))); }, campagne);
    await p.waitForFunction(() => Ext.ComponentQuery.query('campagnes #suivi')[0].getStore().getCount() === 6, null, { timeout: 30000 });
    const suivi = await p.evaluate(() => { const l = []; Ext.ComponentQuery.query('campagnes #suivi')[0].getStore().each((r) => l.push(r.get('client') + ':' + (r.get('repondu') ? 'oui' : 'non'))); return l.sort().join(','); });
    const attendu = 'ZZREP R1:non,ZZREP R2:non,ZZREP R3:non,ZZREP R4:oui,ZZREP R5:oui,ZZREP R6:non';
    ok('Suivi : seuls R4 et R5 « Répondu »', suivi === attendu, suivi);
    const totaux = await p.evaluate(() => Ext.ComponentQuery.query('campagnes #suiviTotaux')[0].getEl().dom.innerText);
    ok('Rapprochement : totaux du suivi = journal = lignes du suivi', /Répondus : 2/.test(totaux) && (suivi.match(/oui/g) || []).length === ligneJournal.repondus, totaux);
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer(debut);
    const v = compteAvant.split('|').map((x) => (x === '~' ? 'NULL' : "'" + x.replace(/'/g, "''") + "'"));
    exec(`UPDATE whatsapp_compte SET actif = ${v[0]}, mode_test = ${v[1]}, phone_number_id = ${v[2]}, access_token = ${v[3]}, app_secret = ${v[4]} WHERE mode = 'API';`
      + `UPDATE t_parameters SET str_VALUE = '${modeAvant}' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';`
      + `UPDATE t_parameters SET str_VALUE = '${delaiAvant}' WHERE str_KEY = 'KEY_CAMPAGNE_DELAI_REPONSE';`);
    ok('Jeu d\'essai retiré, compte et paramètres remis', q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN ${clients}`) === '0'
      && q("SELECT COUNT(*) FROM whatsapp_discussion WHERE numero LIKE '010099100%'") === '0'
      && q("SELECT CONCAT_WS('|', actif, mode_test, COALESCE(phone_number_id,'~'), COALESCE(access_token,'~'), COALESCE(app_secret,'~')) FROM whatsapp_compte WHERE mode = 'API'") === compteAvant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
