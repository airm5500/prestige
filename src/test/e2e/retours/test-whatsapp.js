/* WHATSAPP (plan d'octobre, section 4.2, lot L10).
 *
 * Jeu d'essai isole (clients fictifs, numeros fictifs), compte en MODE TEST : aucun message reel.
 *  - ecran « Comptes WhatsApp » : enregistrement du compte API par l'ecran ; secrets en ECRITURE SEULE (jamais
 *    renvoyes au navigateur, ni dans la page) ; un champ secret laisse vide garde sa valeur ; mode par defaut ;
 *  - essai : simule en mode test, journalise ;
 *  - rappel « WhatsApp, SMS si WhatsApp échoue » depuis l'ecran des rappels : client A servi par WhatsApp (simule),
 *    client B (refus WhatsApp) repris par SMS, client C (refus des deux) refuse avec motif ;
 *  - webhook Meta : abonnement (hub.challenge) avec le bon jeton seulement ; statut « delivered » applique ;
 *    « STOP » -> consentement WhatsApp retire ; signature fausse -> 401 et rien ne change ; sans session ;
 *  - webhook du service compagnon (jeton partage) ;
 *  - fiche client : case WhatsApp (non renseigne reste non renseigne si on n'y touche pas) ;
 *  - journaux du serveur : ni jeton ni texte de message ;
 *  - comptes, parametre, journal et jeu d'essai remis ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const URL = 'http://localhost:8080/prestige';
const LOG = '/opt/payara5/glassfish/domains/domain1/logs/server.log';

const A = 'E2E-WA-A', B = 'E2E-WA-B', C = 'E2E-WA-C';
const clients = "('" + A + "','" + B + "','" + C + "')";
const JETON = 'JETON-SECRET-E2E-' + Date.now(), VERIF = 'VERIF-E2E-' + Date.now(), APPSECRET = 'APPSECRET-E2E-' + Date.now(), WEBJETON = 'WEBJETON-E2E-' + Date.now();
const P1 = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND str_NAME LIKE 'DOLIPRANE 1000%' ORDER BY str_NAME LIMIT 1");

function nettoyer() {
  exec("DELETE FROM whatsapp_message WHERE client_id IN " + clients + " OR telephone IN ('0707070701');"
    + "DELETE nc FROM notification_client nc WHERE nc.client_id IN " + clients + ";"
    + "DELETE FROM notification WHERE type_notification = 24 AND entity_ref IN " + clients + ";"
    + "DELETE FROM t_rappel_habitude WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_ID IN (SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client WHERE lg_CLIENT_ID IN " + clients + ");"
    + "DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_ayant_droit WHERE lg_CLIENT_ID IN " + clients + ";"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN " + clients + ";");
}

(async () => {
  nettoyer();
  const comptesAvant = q("SELECT CONCAT_WS('|', mode, actif, mode_test, COALESCE(api_version,'~'), COALESCE(phone_number_id,'~'), COALESCE(waba_id,'~'), COALESCE(access_token,'~'), COALESCE(verify_token,'~'), COALESCE(app_secret,'~'), COALESCE(modele_nom,'~'), COALESCE(modele_langue,'~'), COALESCE(web_url,'~'), COALESCE(web_jeton,'~')) FROM whatsapp_compte").split('\n');
  const modeAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'");
  const journalAvant = q("SELECT COUNT(*) FROM whatsapp_message");
  const tailleLog = fs.statSync(LOG).size;
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_ADRESSE, str_NUMERO_SECURITE_SOCIAL, dt_CREATED, dt_UPDATED, str_STATUT) VALUES"
    + " ('" + A + "', 'ZZWHATSAPP', 'AWA', '1', '07 07 07 07 01', 'E2EWA01', NOW(), NOW(), 'enable'),"
    + " ('" + B + "', 'ZZWHATSAPP', 'BINTOU', '1', '0707070702', NULL, NOW(), NOW(), 'enable'),"
    + " ('" + C + "', 'ZZWHATSAPP', 'CHANTAL', '1', '0707070703', NULL, NOW(), NOW(), 'enable');"
    + "UPDATE t_client SET bool_CONSENT_WHATSAPP = 0 WHERE lg_CLIENT_ID IN ('" + B + "','" + C + "');"
    + "UPDATE t_client SET bool_CONSENT_SMS = 0 WHERE lg_CLIENT_ID = '" + C + "';"
    + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, P_KEY, lg_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT, dbl_PLAFOND, dbl_CAUTION)"
    + " VALUES ('E2E-WA-CPT', '" + A + "', '" + A + "', NOW(), NOW(), 'enable', -1, -1);"
    + "INSERT INTO t_compte_client_tiers_payant (lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID, dt_CREATED, dt_UPDATED, str_STATUT, int_POURCENTAGE, int_PRIORITY)"
    + " SELECT 'E2E-WA-CTP', 'E2E-WA-CPT', t.lg_TIERS_PAYANT_ID, NOW(), NOW(), 'enable', 80, 1 FROM t_compte_client_tiers_payant t"
    + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = t.lg_TIERS_PAYANT_ID WHERE t.str_STATUT = 'enable' AND tp.str_STATUT = 'enable' AND tp.lg_TYPE_TIERS_PAYANT_ID = '1' LIMIT 1;"
    + "INSERT INTO t_ayant_droit (lg_AYANTS_DROITS_ID, lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, str_SEXE, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + A + "', '" + A + "', 'ZZWHATSAPP', 'AWA', 'E2EWA01', 'F', NOW(), NOW(), 'enable');"
    + [A, B, C].map((c, i) => "INSERT INTO t_rappel_habitude (id, lg_CLIENT_ID, lg_FAMILLE_ID, dt_DERNIER_ACHAT, dt_PREVU, int_FREQUENCE, int_ACHATS, str_STATUT, dt_CREATED)"
      + " VALUES ('E2E-WA-R" + i + "', '" + c + "', '" + P1 + "', '2026-09-06', '2026-10-06', 30, 4, 'A_PREPARER', NOW());").join(''));

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const reponses = [];
  p.on('response', async (r) => { if (/api\/v1\/whatsapp/.test(r.url())) { try { reponses.push(await r.text()); } catch (e) { /* */ } } });
  const post = (u, corps) => p.evaluate(async ([u, c]) => JSON.parse(await (await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })).text()), [u, corps]);
  const get = (u) => p.evaluate(async (u) => JSON.parse(await (await fetch(u)).text()), u);
  try {
    await p.goto(URL + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel, attente) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(attente || 1500); };

    /* ------------------------------------------------ ecran des comptes */
    const menu = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getNodeById('whatsappcomptes'); return n ? n.get('text') : null; });
    ok('Menu : « Comptes WhatsApp » (à côté des fournisseurs SMS)', /WhatsApp/.test(menu || ''), menu);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('whatsappcomptes', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('whatsappcomptes').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    ok('Mode par défaut : API officielle (KEY_WHATSAPP_MODE_DEFAUT)', await p.evaluate(() => Ext.ComponentQuery.query('whatsappcomptes #modeDefaut')[0].getValue()) === 'API');
    await p.evaluate(([j, v, s]) => {
      const f = Ext.ComponentQuery.query('whatsappcomptes #formAPI')[0];
      f.down('[name=actif]').setValue(true); f.down('[name=modeTest]').setValue(true);
      f.down('[name=phoneNumberId]').setValue('1234567890'); f.down('[name=wabaId]').setValue('99887766');
      f.down('#accessToken').setValue(j); f.down('#verifyToken').setValue(v); f.down('#appSecret').setValue(s);
    }, [JETON, VERIF, APPSECRET]);
    await clic('whatsappcomptes #btnEnregistrerAPI', 2500);
    ok('Compte API enregistré par l\'écran (secrets stockés côté serveur)', q("SELECT CONCAT_WS('|', actif, mode_test, phone_number_id, waba_id, access_token = '" + JETON + "', verify_token = '" + VERIF + "', app_secret = '" + APPSECRET + "') FROM whatsapp_compte WHERE mode = 'API'") === '1|1|1234567890|99887766|1|1|1');
    const comptes = await get('../api/v1/whatsapp/comptes');
    const api = (comptes.comptes || []).find((c) => c.mode === 'API') || {};
    ok('Lecture des comptes : « défini » seulement, aucun secret renvoyé', api.accessTokenDefini === true && api.appSecretDefini === true
      && JSON.stringify(comptes).indexOf(JETON) < 0 && JSON.stringify(comptes).indexOf(APPSECRET) < 0 && JSON.stringify(comptes).indexOf(VERIF) < 0);
    const page = await p.evaluate(() => { const f = Ext.ComponentQuery.query('whatsappcomptes #formAPI')[0]; return { html: document.body.innerHTML, jeton: f.down('#accessToken').getValue(), vide: f.down('#accessToken').emptyText }; });
    ok('Après enregistrement : champs secrets vidés, « défini — laisser vide pour le garder »', page.jeton === '' && /défini/.test(page.vide) && page.html.indexOf(JETON) < 0, page.vide);
    ok('Aucune réponse de l\'API WhatsApp ne contient un secret', reponses.every((t) => t.indexOf(JETON) < 0 && t.indexOf(APPSECRET) < 0 && t.indexOf(VERIF) < 0));
    await clic('whatsappcomptes #btnEnregistrerAPI', 2500);
    ok('Réenregistrer avec les champs secrets vides : secrets inchangés', q("SELECT access_token = '" + JETON + "' AND app_secret = '" + APPSECRET + "' FROM whatsapp_compte WHERE mode = 'API'") === '1');
    const reel = await post('../api/v1/whatsapp/comptes/WEB', { actif: true, modeTest: false });
    ok('Envoi réel sans configuration : refusé (adresse et jeton nécessaires)', reel.success === false && /adresse et jeton/.test(reel.message), JSON.stringify(reel));

    /* ------------------------------------------------ essai */
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('whatsappcomptes')[0]; e.down('#numeroEssai').setValue('07 07 07 07 01'); });
    await clic('whatsappcomptes #btnEssai', 2500);
    const essai = await p.evaluate(() => Ext.ComponentQuery.query('whatsappcomptes #resultatEssai')[0].getValue());
    ok('Essai en mode test : « Message simulé », journalisé sans texte', /simulé/.test(essai) && q("SELECT COUNT(*) FROM whatsapp_message WHERE telephone = '0707070701' AND client_id IS NULL AND statut = 'SIMULE'") === '1', essai);
    ok('Journal à l\'écran : la ligne d\'essai', await p.evaluate(() => Ext.ComponentQuery.query('whatsappcomptes #journal')[0].getStore().getCount() >= 1));

    /* ------------------------------------------------ rappel WhatsApp avec repli SMS, depuis l'ecran des rappels */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('rappelshabitude', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('rappelshabitude').length > 0, null, { timeout: 30000 });
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('rappelshabitude')[0]; g.down('#query').setValue('ZZWHATSAPP'); g.rechercher(); });
    await p.waitForTimeout(2500);
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('rappelshabitude')[0]; g.getSelectionModel().selectAll(); });
    await clic('rappelshabitude #btnSms', 800);
    await clic('rappelshabitude #envWhatsappSms', 800);
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.el.dom.click());
    await p.waitForTimeout(3000);
    const msg = await p.evaluate(() => Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : '');
    await p.evaluate(() => { if (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
    ok('Envoi « WhatsApp, SMS si WhatsApp échoue » : 2 messages préparés, C refusé (WhatsApp et SMS refusés)', /2 message\(s\) WhatsApp préparé\(s\)/.test(msg) && /CHANTAL : Le client a refusé WhatsApp et les SMS/.test(msg), msg);
    for (let i = 0; i < 30 && q("SELECT COUNT(*) FROM whatsapp_message WHERE client_id IN ('" + A + "','" + B + "')") !== '2'; i++) { await p.waitForTimeout(500); }
    const wa = q("SELECT CONCAT(client_id, '|', statut, '|', repli_sms, '|', simule) FROM whatsapp_message WHERE client_id IN " + clients + " ORDER BY client_id").split('\n');
    ok('Client A : WhatsApp simulé (mode test)', wa[0] === A + '|SIMULE|0|1', JSON.stringify(wa));
    ok('Client B (refus WhatsApp) : échec WhatsApp, repris par SMS', wa[1] && wa[1].startsWith(B + '|ECHEC|1|'), JSON.stringify(wa));
    const notifsB = q("SELECT COUNT(DISTINCT n.id) FROM notification n JOIN notification_client nc ON nc.notification_id = n.id WHERE nc.client_id = '" + B + "' AND n.type_notification = 24");
    const notifsA = q("SELECT COUNT(DISTINCT n.id) FROM notification n JOIN notification_client nc ON nc.notification_id = n.id WHERE nc.client_id = '" + A + "'");
    ok('Repli SMS : une notification SMS pour B seul (A n\'est pas doublé)', notifsB === '2' && notifsA === '1', 'B=' + notifsB + ' A=' + notifsA);
    ok('Aucun message pour C', q("SELECT COUNT(*) FROM notification_client WHERE client_id = '" + C + "'") === '0' && q("SELECT COUNT(*) FROM whatsapp_message WHERE client_id = '" + C + "'") === '0');

    /* ------------------------------------------------ webhooks (sans session) */
    const brut = async (methode, chemin, corps, entetes) => { const r = await fetch(URL + '/api/' + chemin, { method: methode, body: corps, headers: entetes || {} }); return { s: r.status, t: await r.text() }; };
    const v1 = await brut('GET', 'v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=' + encodeURIComponent(VERIF) + '&hub.challenge=4242');
    const v2 = await brut('GET', 'v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=faux&hub.challenge=4242');
    ok('Abonnement du webhook : challenge rendu avec le bon jeton, 403 sinon (sans session)', v1.s === 200 && v1.t === '4242' && v2.s === 403, v1.s + ' ' + v1.t + ' / ' + v2.s);
    const midA = q("SELECT message_id FROM whatsapp_message WHERE client_id = '" + A + "'");
    const corps = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: '1', changes: [{ field: 'messages', value: {
      statuses: [{ id: midA, status: 'delivered', recipient_id: '2250707070701' }],
      messages: [{ from: '2250707070701', type: 'text', text: { body: 'Stop' } }] } }] }] });
    const faux = await brut('POST', 'v1/whatsapp/webhook', corps, { 'Content-Type': 'application/json', 'X-Hub-Signature-256': 'sha256=' + crypto.createHmac('sha256', 'mauvais').update(corps).digest('hex') });
    ok('Signature fausse : 401, rien ne change', faux.s === 401 && q("SELECT statut FROM whatsapp_message WHERE client_id = '" + A + "'") === 'SIMULE'
      && q("SELECT COALESCE(bool_CONSENT_WHATSAPP, 'NULL') FROM t_client WHERE lg_CLIENT_ID = '" + A + "'") === 'NULL', String(faux.s));
    const bon = await brut('POST', 'v1/whatsapp/webhook', corps, { 'Content-Type': 'application/json', 'X-Hub-Signature-256': 'sha256=' + crypto.createHmac('sha256', APPSECRET).update(corps).digest('hex') });
    ok('Signature juste : statut « délivré » appliqué', bon.s === 200 && q("SELECT statut FROM whatsapp_message WHERE client_id = '" + A + "'") === 'DELIVRE', bon.s + ' ' + bon.t);
    ok('« Stop » reçu : consentement WhatsApp retiré (numéro saisi avec espaces retrouvé)', q("SELECT bool_CONSENT_WHATSAPP FROM t_client WHERE lg_CLIENT_ID = '" + A + "'") === '0');
    await post('../api/v1/whatsapp/comptes/WEB', { webJeton: WEBJETON, webUrl: 'https://compagnon.invalid' });
    const web = await brut('POST', 'v1/whatsapp/webhook-web', JSON.stringify({ statuts: [{ id: midA, statut: 'read' }] }), { 'Content-Type': 'application/json', Authorization: 'Bearer ' + WEBJETON });
    const webFaux = await brut('POST', 'v1/whatsapp/webhook-web', JSON.stringify({ statuts: [{ id: midA, statut: 'failed' }] }), { 'Content-Type': 'application/json', Authorization: 'Bearer faux' });
    ok('Service compagnon : jeton juste -> statut « lu » ; jeton faux -> 401', web.s === 200 && webFaux.s === 401 && q("SELECT statut FROM whatsapp_message WHERE client_id = '" + A + "'") === 'LU', web.s + '/' + webFaux.s);

    /* ------------------------------------------------ fiche client : consentement WhatsApp */
    exec("UPDATE t_client SET bool_CONSENT_WHATSAPP = NULL WHERE lg_CLIENT_ID = '" + A + "'");
    const ouvrirFiche = async () => {
      await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('clientmanager', {}));
      await p.waitForFunction(() => Ext.getCmp('rechecher'), null, { timeout: 30000 });
      await p.waitForTimeout(1500);
      await p.evaluate(() => { Ext.getCmp('rechecher').setValue('ZZWHATSAPP AWA'); Ext.ComponentQuery.query('clientgestion')[0].onRechClick(); });
      await p.waitForTimeout(3000);
      await p.evaluate((A) => { const g = Ext.ComponentQuery.query('clientgestion')[0]; const i = g.getStore().findExact('lg_CLIENT_ID', A); if (i >= 0) { g.onEditClick(g, i); } }, A);
      await p.waitForTimeout(3000);
    };
    const enregistrerFiche = async () => {
      const btn = await p.evaluate(() => Ext.getCmp('consent_WHATSAPP').up('window').down('button[text=Enregistrer]').getId());
      await p.click('#' + btn); await p.waitForTimeout(3500);
      await p.evaluate(() => { while (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
    };
    await ouvrirFiche();
    const cb = await p.evaluate(() => { const c = Ext.getCmp('consent_WHATSAPP'); return c ? { vue: c.isVisible(), coche: c.getValue() } : null; });
    ok('Fiche client : case « accepte d\'être contacté par WhatsApp » (non cochée si non renseigné)', cb && cb.vue && cb.coche === false, JSON.stringify(cb));
    await enregistrerFiche();
    ok('Enregistrer sans y toucher : le consentement reste « non renseigné »', q("SELECT COALESCE(bool_CONSENT_WHATSAPP, 'NULL') FROM t_client WHERE lg_CLIENT_ID = '" + A + "'") === 'NULL');
    await ouvrirFiche();
    await p.evaluate(() => { Ext.getCmp('consent_WHATSAPP').setValue(true); });
    await enregistrerFiche();
    ok('Cochée puis enregistrée : consentement WhatsApp = 1', q("SELECT bool_CONSENT_WHATSAPP FROM t_client WHERE lg_CLIENT_ID = '" + A + "'") === '1');

    /* ------------------------------------------------ journaux du serveur */
    const fd = fs.openSync(LOG, 'r'); const taille = fs.statSync(LOG).size - tailleLog; const buf = Buffer.alloc(Math.max(0, taille)); fs.readSync(fd, buf, 0, buf.length, tailleLog); fs.closeSync(fd);
    const log = buf.toString('utf8');
    ok('Journaux du serveur : aucun jeton, aucun texte de message', [JETON, VERIF, APPSECRET, WEBJETON].every((s) => log.indexOf(s) < 0) && log.indexOf('sera bientôt à renouveler') < 0);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    exec("DELETE FROM whatsapp_message WHERE telephone = '0707070701'");
    comptesAvant.forEach((l) => {
      const v = l.split('|').map((x) => (x === '~' ? 'NULL' : "'" + x.replace(/'/g, "''") + "'"));
      exec("UPDATE whatsapp_compte SET actif = " + v[1] + ", mode_test = " + v[2] + ", api_version = " + v[3] + ", phone_number_id = " + v[4] + ", waba_id = " + v[5]
        + ", access_token = " + v[6] + ", verify_token = " + v[7] + ", app_secret = " + v[8] + ", modele_nom = " + v[9] + ", modele_langue = " + v[10] + ", web_url = " + v[11] + ", web_jeton = " + v[12]
        + " WHERE mode = " + v[0]);
    });
    exec("UPDATE t_parameters SET str_VALUE = '" + modeAvant + "' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT'");
    ok('Comptes, paramètre, journal et jeu d\'essai remis', q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN " + clients) === '0'
      && q("SELECT COUNT(*) FROM whatsapp_message") === journalAvant && q("SELECT COUNT(*) FROM whatsapp_compte WHERE access_token LIKE 'JETON-SECRET-E2E%' OR web_jeton LIKE 'WEBJETON-E2E%'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
