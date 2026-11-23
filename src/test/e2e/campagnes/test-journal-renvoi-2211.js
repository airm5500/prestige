/* JOURNAL DES MESSAGES : RENVOI D'UN ECHEC PAR SMS OU WHATSAPP (retours du 22/11, lot 10, point 1).
 *
 * Jeu d'essai du jour (prefixe E2E-JMR, clients FICTIFS 01009904xx, numero d'administration 0100990499) :
 *  - W1 : WhatsApp en echec a C1 (message d'avoir lie a une vente d'essai) ;
 *  - S2 : SMS en echec a C1 (code d'erreur du fournisseur) ;
 *  - W3 : WhatsApp envoye a C1 (pas de renvoi) ;
 *  - W4 : WhatsApp en echec a C2, qui refuse WhatsApp ;
 *  - A5 : SMS en echec au numero d'administration (pas de renvoi : pas de client).
 * Par les clics (compte e2e), menu CAMPAGNES SMS / WHATSAPP > « Journal des messages », recherche « 01009904 » :
 *  - colonne « Renvoyer » : boutons SMS et WhatsApp sur les seuls echecs d'un client (W1, S2, W4) ;
 *  - 1er clic : le bouton demande confirmation (« Confirmer SMS ? »), sans fenetre surgissante ; 2e clic : renvoi ;
 *  - sans 2e clic, la confirmation revient d'elle-meme (5 s), rien d'envoye ; (sans fournisseur SMS en vigueur,
 *    l'application passe par le repli Orange, comme tout envoi : pas de refus, et l'essai pose donc son faux
 *    fournisseur local AVANT tout clic SMS, pour qu'aucun SMS ne parte vers un vrai service) ;
 *  - W1 renvoye par SMS (faux fournisseur local) : un SMS au numero de C1, nouveau message au nom de l'utilisateur,
 *    lie a la meme vente ; S2 renvoye par WhatsApp (mode test, simule) ; W4 par WhatsApp : refuse (C2), echec trace ;
 *  - rapprochement : resultat affiche = reponse = base ; nouvelles lignes du journal (canal, etat, destinataire,
 *    utilisateur) = base ; les lignes en echec restent en echec ;
 *  - bilan : exactement 3 nouveaux messages (1 SMS, 2 WhatsApp) et leurs envois ; tout retire, fournisseurs remis.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const http = require('http');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE], { input: s, encoding: 'utf8' });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const PFX = 'E2E-JMR';
const C1 = PFX + '-C1', C2 = PFX + '-C2';
const fournisseurs0 = q("SELECT GROUP_CONCAT(CONCAT_WS(':', code, actif + 0, en_vigueur + 0) ORDER BY code) FROM sms_fournisseur");
const paramsLeTexto0 = q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('=', p.cle, MD5(IFNULL(p.valeur, ''))) ORDER BY p.cle), '') FROM sms_fournisseur_param p JOIN sms_fournisseur f ON f.id = p.fournisseur_id WHERE f.code = 'LETEXTO'");
const NOUVEAUX = `SELECT n.id FROM notification n WHERE n.entity_ref LIKE '${PFX}%' AND n.id NOT LIKE '${PFX}%'`;

const recus = [];
const serveur = http.createServer((req, rep) => {
  let corps = '';
  req.on('data', (c) => { corps += c; });
  req.on('end', () => {
    if (req.method === 'POST' && /\/v1\/messages\/send$/.test(req.url)) {
      let j = {}; try { j = JSON.parse(corps); } catch (e) { j = {}; }
      recus.push({ to: j.to });
      rep.writeHead(200, { 'Content-Type': 'application/json' });
      rep.end(JSON.stringify({ id: 'FAUX-' + recus.length }));
      return;
    }
    rep.writeHead(404); rep.end('{}');
  });
});

function remettre() {
  exec(`DELETE FROM whatsapp_message WHERE client_id LIKE '${PFX}%' OR id LIKE '${PFX}%';`
    + `DELETE FROM notification_vente WHERE lg_PREENREGISTREMENT_ID LIKE '${PFX}%';`
    + `DELETE FROM notification_client WHERE client_id LIKE '${PFX}%';`
    + `DELETE FROM notification WHERE entity_ref LIKE '${PFX}%';`
    + `DELETE FROM message_administration WHERE id LIKE '${PFX}%';`
    + `DELETE FROM t_client WHERE lg_CLIENT_ID LIKE '${PFX}%';`);
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_jmr_sms_param'") === '1') {
    exec("DELETE p FROM sms_fournisseur_param p JOIN sms_fournisseur f ON f.id = p.fournisseur_id WHERE f.code = 'LETEXTO';"
      + 'INSERT INTO sms_fournisseur_param SELECT * FROM e2e_jmr_sms_param; DROP TABLE e2e_jmr_sms_param;'
      + 'UPDATE sms_fournisseur f JOIN e2e_jmr_sms_f s ON s.id = f.id SET f.actif = s.actif, f.en_vigueur = s.en_vigueur, f.dlr_mode = s.dlr_mode, f.dlr_callback_url = s.dlr_callback_url;'
      + 'DROP TABLE e2e_jmr_sms_f;');
  }
}
function fauxFournisseur(port) {
  exec("DROP TABLE IF EXISTS e2e_jmr_sms_param; CREATE TABLE e2e_jmr_sms_param AS SELECT p.* FROM sms_fournisseur_param p JOIN sms_fournisseur f ON f.id = p.fournisseur_id WHERE f.code = 'LETEXTO';"
    + 'DROP TABLE IF EXISTS e2e_jmr_sms_f; CREATE TABLE e2e_jmr_sms_f AS SELECT * FROM sms_fournisseur;');
  const lt = q("SELECT id FROM sms_fournisseur WHERE code = 'LETEXTO'");
  exec(`UPDATE sms_fournisseur SET en_vigueur = 0; UPDATE sms_fournisseur SET actif = 1, en_vigueur = 1, dlr_callback_url = NULL WHERE id = '${lt}';`
    + `DELETE FROM sms_fournisseur_param WHERE fournisseur_id = '${lt}';`
    + ['base_url=http://127.0.0.1:' + port, 'api_key=essai-e2e', 'sender_name=ESSAI'].map((x) => { const [c, v] = x.split('='); return `INSERT INTO sms_fournisseur_param (id, fournisseur_id, cle, valeur) VALUES (LEFT(UUID(), 36), '${lt}', '${c}', '${v}');`; }).join(''));
}
function preparer() {
  const cat = q("SELECT id FROM categorie_notification WHERE name = 'AVOIR_PRODUIT'");
  exec([[C1, '0100990401', 1, 1], [C2, '0100990402', 0, 1]].map(([id, tel, wa, sms], i) => 'INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_ADRESSE, str_SEXE, lg_TYPE_CLIENT_ID, str_STATUT,'
    + ` dt_CREATED, dt_UPDATED, bool_CONSENT_WHATSAPP, bool_CONSENT_SMS) VALUES ('${id}', 'ZZJMR${i + 1}', 'ESSAI', '${tel}', NULL, 'F', '6', 'enable', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, ${wa}, ${sms});`).join('')
    + ['N1', 'N2', 'N3', 'N4'].map((n, i) => `INSERT INTO notification (id, created_at, modfied_at, user_id, message, statut, type_notification, number_attempt, entity_ref)`
      + ` VALUES ('${PFX}-${n}', GREATEST(NOW() - INTERVAL ${3 - i} HOUR, CURDATE()), GREATEST(NOW() - INTERVAL ${3 - i} HOUR, CURDATE()), (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'), 'Essai e2e', 'NOT_SEND', ${cat}, 0, '${PFX}-BL');`).join('')
    + `INSERT INTO notification_vente (notification_id, lg_PREENREGISTREMENT_ID) VALUES ('${PFX}-N1', '${PFX}-V1');`
    + `INSERT INTO whatsapp_message (id, notification_id, client_id, telephone, mode, simule, statut, erreur, repli_sms, created_at, updated_at, origine) VALUES`
    + ` ('${PFX}-W1', '${PFX}-N1', '${C1}', '0100990401', 'WEB', 0, 'ECHEC', 'Compte WhatsApp WEB inactif', 0, GREATEST(NOW() - INTERVAL 170 MINUTE, CURDATE()), GREATEST(NOW() - INTERVAL 170 MINUTE, CURDATE()), 'AVOIR'),`
    + ` ('${PFX}-W3', '${PFX}-N3', '${C1}', '0100990401', 'WEB', 0, 'ENVOYE', NULL, 0, GREATEST(NOW() - INTERVAL 50 MINUTE, CURDATE()), GREATEST(NOW() - INTERVAL 50 MINUTE, CURDATE()), 'AVOIR'),`
    + ` ('${PFX}-W4', '${PFX}-N4', '${C2}', '0100990402', 'WEB', 0, 'ECHEC', 'Compte WhatsApp WEB inactif', 0, GREATEST(NOW() - INTERVAL 40 MINUTE, CURDATE()), GREATEST(NOW() - INTERVAL 40 MINUTE, CURDATE()), 'AVOIR');`
    + `INSERT INTO notification_client (id, notification_id, client_id, statut, sent_at, error_code, error_message) VALUES ('${PFX}-S2', '${PFX}-N2', '${C1}', 'NOT_SEND', GREATEST(NOW() - INTERVAL 110 MINUTE, CURDATE()), 'SVC0004', 'No valid addresses');`
    + `INSERT INTO message_administration (id, created_at, canal, origine, telephone, statut, motif) VALUES ('${PFX}-A5', GREATEST(NOW() - INTERVAL 30 MINUTE, CURDATE()), 'SMS', 'TICKET_Z', '0100990499', 'ECHEC', 'Refusé');`);
}

(async () => {
  remettre();
  await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
  const port = serveur.address().port;
  let b = null;
  const erreurs = [];
  try {
    preparer();
    const user = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
    const nomUser = q(`SELECT TRIM(CONCAT(IFNULL(str_FIRST_NAME, ''), ' ', IFNULL(str_LAST_NAME, ''))) FROM t_user WHERE lg_USER_ID = '${user}'`);
    b = await ENV_E2E.lancer(chromium);
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Journal des messages');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('#jmJournal')[0]; return g && g.isVisible(true) && g.getStore().lastOptions && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    const rechercher = async () => {
      const id = await p.evaluate(() => Ext.ComponentQuery.query('#jmRecherche')[0].inputEl.id);
      await p.fill('#' + id, '01009904');
      await Promise.all([p.waitForResponse((r) => /api\/v1\/journal-messages\?/.test(r.url()) && /query=01009904/.test(r.url()), { timeout: 30000 }), p.press('#' + id, 'Enter')]);
      await p.waitForFunction(() => !Ext.ComponentQuery.query('#jmJournal')[0].getStore().isLoading(), null, { timeout: 30000 });
      await p.waitForTimeout(500);
    };
    const lire = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('#jmJournal')[0], v = g.getView(), col = g.down('#jmColRenvoyer');
      return g.getStore().getRange().map((r) => { const n = v.getNode(r), td = col && n ? n.querySelector(v.getCellSelector(col)) : null;
        return { id: r.get('id'), canal: r.get('canal'), etat: r.get('etat'), dest: r.get('destinataire'), user: r.get('utilisateur') || '',
          boutons: td ? Array.from(td.querySelectorAll('button')).map((x) => x.textContent.trim()) : null, texte: td ? td.textContent.trim() : '', bulle: td ? td.getAttribute('data-qtip') || '' : '' }; }); });
    const ligne = async (id) => (await lire()).find((l) => l.id === id) || {};
    const clic = (id, canal) => p.click(`.jm-renvoi[data-id="${id}"][data-renvoi="${canal}"]`);

    fauxFournisseur(port);
    await rechercher();
    let l = await lire();
    const avecBoutons = l.filter((x) => x.boutons && x.boutons.length).map((x) => x.id).sort();
    ok('Colonne « Renvoyer » : SMS et WhatsApp sur les seuls échecs d\'un client (W1, S2, W4), rien sur l\'envoyé ni sur l\'administration',
      JSON.stringify(avecBoutons) === JSON.stringify(['S' + PFX + '-S2', 'W' + PFX + '-W1', 'W' + PFX + '-W4'].sort()) && l.filter((x) => x.boutons && x.boutons.length).every((x) => x.boutons.join('/') === 'SMS/WhatsApp')
      && l.some((x) => x.id === 'A' + PFX + '-A5') && l.some((x) => x.id === 'W' + PFX + '-W3'), JSON.stringify(l.map((x) => x.id + ':' + (x.boutons || []).join('/'))));

    /* 1er clic : confirmation dans le bouton ; sans fournisseur SMS : refus, rien d'ecrit */
    await clic('S' + PFX + '-S2', 'SMS');
    await p.waitForTimeout(300);
    let x = await ligne('S' + PFX + '-S2');
    ok('1er clic : le bouton demande confirmation (« Confirmer SMS ? »), sans fenêtre surgissante, rien d\'envoyé', x.boutons && x.boutons[0] === 'Confirmer SMS ?' && q(NOUVEAUX.replace('SELECT n.id', 'SELECT COUNT(*)')) === '0'
      && await p.evaluate(() => Ext.ComponentQuery.query('messagebox, window[modal=true]').filter((m) => m.isVisible()).length) === 0, JSON.stringify(x));
    /* sans 2e clic : la confirmation revient d'elle-meme, rien d'envoye */
    await p.waitForTimeout(5600);
    x = await ligne('S' + PFX + '-S2');
    ok("Sans 2e clic : la confirmation revient d'elle-même après 5 s (SMS / WhatsApp), rien d'envoyé",x.boutons && x.boutons.join('/') === 'SMS/WhatsApp'
      && q(NOUVEAUX.replace('SELECT n.id', 'SELECT COUNT(*)')) === '0' && recus.length === 0, JSON.stringify(x));

    /* faux fournisseur (pose avant les clics) : W1 (echec WhatsApp) renvoye par SMS */
    await clic('W' + PFX + '-W1', 'SMS');
    const [r1] = await Promise.all([p.waitForResponse((r) => /journal-messages\/renvoyer/.test(r.url()), { timeout: 60000 }), clic('W' + PFX + '-W1', 'SMS')]);
    const o1 = await r1.json();
    for (let i = 0; i < 20 && recus.length < 1; i++) { await attendre(300); }
    const n1 = q(`SELECT CONCAT_WS('|', n.user_id, n.type_notification, n.message = (SELECT message FROM notification WHERE id = '${PFX}-N1'), nc.client_id, nc.statut,`
      + ` (SELECT GROUP_CONCAT(lg_PREENREGISTREMENT_ID) FROM notification_vente WHERE notification_id = n.id)) FROM notification n JOIN notification_client nc ON nc.notification_id = n.id WHERE n.id = '${o1.notificationId}'`);
    ok('W1 renvoyé par SMS : un SMS au numéro de C1, nouveau message au nom de l\'utilisateur, même texte, lié à la même vente',
      o1.success === true && recus.length === 1 && recus[0].to === '2250100990401' && n1 === `${user}|${q(`SELECT type_notification FROM notification WHERE id = '${PFX}-N1'`)}|1|${C1}|SENT|${PFX}-V1`, JSON.stringify(o1) + ' / ' + n1);

    /* le journal se recharge apres un renvoi : on attend la fin, comme l'utilisateur */
    await p.waitForFunction(() => !Ext.ComponentQuery.query('#jmJournal')[0].getStore().isLoading(), null, { timeout: 30000 });
    /* la souris quitte la ligne renvoyee (son infobulle masquerait le bouton suivant), comme l'utilisateur */
    await p.mouse.move(5, 5);
    await p.waitForTimeout(500);
    /* S2 (echec SMS) renvoye par WhatsApp (mode test) */
    await clic('S' + PFX + '-S2', 'WHATSAPP');
    await p.waitForTimeout(300);
    x = await ligne('S' + PFX + '-S2');
    const confirmeWa = x.boutons && x.boutons.includes('Confirmer WhatsApp ?');
    const entier = await p.evaluate((id) => { const bt = document.querySelector(`.jm-renvoi-arme[data-id="${id}"]`); if (!bt) { return 'absent'; }
      const c = bt.closest('.x-grid-cell-inner').getBoundingClientRect(), r = bt.getBoundingClientRect(), x0 = (r.left + r.right) / 2, y0 = (r.top + r.bottom) / 2;
      return r.left >= c.left - 1 && r.right <= c.right + 1 && bt.contains(document.elementFromPoint(x0, y0)) ? 'ok' : JSON.stringify([c.left, c.right, r.left, r.right]); }, 'S' + PFX + '-S2');
    ok('Bouton armé « Confirmer WhatsApp ? » entier dans sa colonne et cliquable (seul bouton pendant la confirmation)', entier === 'ok' && x.boutons.length === 1, entier + ' ' + JSON.stringify(x.boutons));
    const [r2] = await Promise.all([p.waitForResponse((r) => /journal-messages\/renvoyer/.test(r.url()), { timeout: 60000 }), clic('S' + PFX + '-S2', 'WHATSAPP')]);
    const o2 = await r2.json();
    const w2 = q(`SELECT CONCAT_WS('|', w.client_id, w.statut, w.utilisateur_id, w.origine) FROM whatsapp_message w WHERE w.notification_id = '${o2.notificationId}'`);
    ok('S2 renvoyé par WhatsApp (après « Confirmer WhatsApp ? ») : envoyé (simulé) à C1, au nom de l\'utilisateur', confirmeWa && o2.success === true && w2 === `${C1}|SIMULE|${user}|AVOIR`, JSON.stringify(o2) + ' / ' + w2);

    /* le journal se recharge apres un renvoi : on attend la fin, comme l'utilisateur */
    await p.waitForFunction(() => !Ext.ComponentQuery.query('#jmJournal')[0].getStore().isLoading(), null, { timeout: 30000 });
    await p.mouse.move(5, 5);
    await p.waitForTimeout(500);
    /* W4 : C2 refuse WhatsApp */
    await clic('W' + PFX + '-W4', 'WHATSAPP');
    const [r3] = await Promise.all([p.waitForResponse((r) => /journal-messages\/renvoyer/.test(r.url()), { timeout: 60000 }), clic('W' + PFX + '-W4', 'WHATSAPP')]);
    const o3 = await r3.json();
    const w3 = q(`SELECT CONCAT_WS('|', w.client_id, w.statut, w.erreur) FROM whatsapp_message w WHERE w.notification_id = '${o3.notificationId}'`);
    ok('W4 renvoyé par WhatsApp : refusé (C2 refuse WhatsApp), échec tracé, aucun SMS', o3.success === false && w3 === `${C2}|ECHEC|Le client a refusé WhatsApp` && recus.length === 1, JSON.stringify(o3) + ' / ' + w3);

    /* rapprochement : resultats affiches, nouvelles lignes du journal = base */
    await p.waitForFunction(() => !Ext.ComponentQuery.query('#jmJournal')[0].getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    l = await lire();
    const res1 = (l.find((y) => y.id === 'W' + PFX + '-W1') || {}).texte, res2 = (l.find((y) => y.id === 'S' + PFX + '-S2') || {}).texte, res3 = (l.find((y) => y.id === 'W' + PFX + '-W4') || {}).texte;
    ok('Résultat affiché sur chaque ligne = réponse (renvoyé par SMS, renvoyé par WhatsApp, échec du renvoi par WhatsApp)',
      res1 === 'Renvoyé par SMS' && res2 === 'Renvoyé par WhatsApp' && /^Échec du renvoi par WhatsApp/.test(res3 || ''), [res1, res2, res3].join(' | '));
    ok('Après un échec du renvoi, les boutons restent pour réessayer ; après un renvoi réussi, plus de bouton',
      ((l.find((y) => y.id === 'W' + PFX + '-W4') || {}).boutons || []).join('/') === 'SMS/WhatsApp' && ((l.find((y) => y.id === 'W' + PFX + '-W1') || {}).boutons || ['?']).length === 0);
    const nc1 = q(`SELECT id FROM notification_client WHERE notification_id = '${o1.notificationId}'`);
    const wid2 = q(`SELECT id FROM whatsapp_message WHERE notification_id = '${o2.notificationId}'`), wid3 = q(`SELECT id FROM whatsapp_message WHERE notification_id = '${o3.notificationId}'`);
    const attendu = { ['S' + nc1]: ['SMS', 'Envoyé', 'ZZJMR1 ESSAI', nomUser], ['W' + wid2]: ['WhatsApp', 'Envoyé', 'ZZJMR1 ESSAI', nomUser], ['W' + wid3]: ['WhatsApp', 'Échec', 'ZZJMR2 ESSAI', nomUser] };
    const ecarts = Object.keys(attendu).filter((k) => { const y = l.find((z) => z.id === k); return !y || [y.canal, y.etat, y.dest, y.user].join('|') !== attendu[k].join('|'); });
    ok('Nouvelles lignes du journal = base (canal, état, destinataire, utilisateur qui a renvoyé)', ecarts.length === 0, ecarts.join(', ') + ' / ' + JSON.stringify(l.map((y) => [y.id, y.canal, y.etat, y.dest, y.user].join('|'))));
    ok('Les lignes d\'origine restent en échec', ['W' + PFX + '-W1', 'S' + PFX + '-S2', 'W' + PFX + '-W4'].every((k) => (l.find((y) => y.id === k) || {}).etat === 'Échec'));

    /* bilan */
    const bilan = q(`SELECT CONCAT_WS('/', (SELECT COUNT(*) FROM (${NOUVEAUX}) a), (SELECT COUNT(*) FROM notification_client WHERE notification_id IN (SELECT id FROM (${NOUVEAUX}) b)),`
      + ` (SELECT COUNT(*) FROM whatsapp_message WHERE notification_id IN (SELECT id FROM (${NOUVEAUX}) c)), (SELECT COUNT(*) FROM notification_vente WHERE notification_id IN (SELECT id FROM (${NOUVEAUX}) d)))`);
    ok('Bilan : 3 nouveaux messages, 3 destinataires, 2 envois WhatsApp, 3 liens de vente (copiés du message d\'origine) ; 1 SMS', bilan === '3/3/2/1' && recus.length === 1, bilan + ' ; ' + recus.length + ' SMS');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack || e);
  } finally {
    if (b) { await b.close(); }
    serveur.close();
    try { remettre(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Nettoyage : données d\'essai retirées, fournisseurs SMS remis', q(`SELECT COUNT(*) FROM notification WHERE entity_ref LIKE '${PFX}%'`) === '0'
      && q(`SELECT COUNT(*) FROM whatsapp_message WHERE client_id LIKE '${PFX}%'`) === '0' && q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE '${PFX}%'`) === '0'
      && q("SELECT GROUP_CONCAT(CONCAT_WS(':', code, actif + 0, en_vigueur + 0) ORDER BY code) FROM sms_fournisseur") === fournisseurs0
      && q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('=', p.cle, MD5(IFNULL(p.valeur, ''))) ORDER BY p.cle), '') FROM sms_fournisseur_param p JOIN sms_fournisseur f ON f.id = p.fournisseur_id WHERE f.code = 'LETEXTO'") === paramsLeTexto0);
  }
  const ko = res.filter((y) => !y.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
