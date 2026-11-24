/* MESSAGE D'AVOIR : CANAL ET SUIVI DANS LA LISTE DES AVOIRS (plan du 21/11, point 11).
 *
 * Trois entrees en stock par le vrai chemin de l'ecran (Bon de livraison > Detail > ENTREE EN STOCK), une par valeur du
 * parametre KEY_SMS_AVOIR_CANAL, sur des ventes en avoir de clients FICTIFS (numeros 01009902xx) :
 *  - SMS (envoi immediat) : client C1, deux ventes S1 et S2 dans un seul message -> un SMS ;
 *  - WHATSAPP : C3 (accepte WhatsApp) -> envoye par WhatsApp ; C2 (refuse WhatsApp) -> echec, AUCUN SMS ;
 *  - SMS_WHATSAPP : C2 -> WhatsApp refuse, repli SMS (nouvelle notification portant la meme vente).
 * Aucun envoi reel : WhatsApp en mode test (simule) ; SMS recus par un faux fournisseur local (LeTexto sur 127.0.0.1),
 * declare le temps du test puis remis. Le texte des messages n'est jamais affiche.
 * Controles :
 *  - base : ventes rattachees a chaque message (notification_vente), origine « AVOIR » des envois WhatsApp, repli lie a
 *    la meme vente ; SMS recus par le faux fournisseur = attendus (nombre et numeros) ;
 *  - rapprochement : colonne « Message » de la liste des avoirs (etat, canal, date, info-bulle) = reponse de l'API = base,
 *    vente par vente ; puis apres accuses simules (SMS distribue, WhatsApp lu) ;
 *  - une vente sans message affiche « — » ; parametre absent ou inconnu = SMS (comme avant) ;
 *  - 1366x768, 1280x720, 1920x1080 : colonne visible, etat lisible en entier ;
 *  - bilan : par bon, exactement les notifications, envois et liens attendus ; stocks remis, tout retire.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const http = require('http');
const ENV_E2E = require('../outils/poste');
const { connexion, cliquer, attendreMessage, repondre } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-e', s], { encoding: 'utf8' });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const PFX = 'E2E-AVM';
const debut = q('SELECT NOW()');
const CANDIDATS = " FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 0 AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 1 AND 500"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  /* aucune vente en avoir ouverte sur le produit : l'entree en stock ne previent que les clients fictifs */
  + " AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND d.b_IS_AVOIR = 1"
  + " AND d.str_STATUT = 'is_Closed' AND d.int_QUANTITY <> d.int_QUANTITY_SERVED AND d.int_QUANTITY > 0)";
const G = q('SELECT f.lg_GROSSISTE_ID' + CANDIDATS + ' AND f.lg_GROSSISTE_ID IS NOT NULL GROUP BY f.lg_GROSSISTE_ID ORDER BY COUNT(*) DESC LIMIT 1');
const P = q(`SELECT f.lg_FAMILLE_ID${CANDIDATS} AND f.lg_GROSSISTE_ID = '${G}' ORDER BY f.lg_FAMILLE_ID LIMIT 2`).split('\n').map((x) => x.trim()).filter(Boolean);
const LISTE = P.map((x) => "'" + x + "'").join(',');
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste', 't_snapshot_famillesell'];

/* clients fictifs : [id, telephone, consentement WhatsApp, consentement SMS] */
const CLIENTS = [[PFX + '-C1', '0100990201', 1, 1], [PFX + '-C2', '0100990202', 0, 1], [PFX + '-C3', '0100990203', 1, 1], [PFX + '-C4', '0100990204', 1, 1]];
/* ventes en avoir : [id, client, produit] */
const VENTES = [[PFX + '-S1', 0, 0], [PFX + '-S2', 0, 1], [PFX + '-S3', 1, 0], [PFX + '-S4', 2, 0], [PFX + '-S5', 1, 1], [PFX + '-S6', 3, 0]];
const LISTE_VENTES = VENTES.map((v) => "'" + v[0] + "'").join(',');
const TICKET = (v) => 'E2EAVM' + v.slice(-2);
/* essais : canal, ventes servies par le bon, produits du bon */
const ESSAIS = [
  { canal: 'SMS', ventes: ['S1', 'S2'], produits: [0, 1] },
  { canal: 'WHATSAPP', ventes: ['S3', 'S4'], produits: [0] },
  { canal: 'SMS_WHATSAPP', ventes: ['S5'], produits: [1] }
];
ESSAIS.forEach((e, i) => { e.BL = PFX + '-BL' + i; e.ORD = PFX + '-ORD' + i; e.REF = 'E2EAVM' + String(Date.now()).slice(-6) + i; });
const PARAMS = ['KEY_SMS_AVOIR_IMMEDIAT', 'KEY_SMS_AVOIR_CANAL'];
const avant = Object.fromEntries(PARAMS.map((k) => [k, q(`SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${k}'), '#ABSENT#')`)]));
const fournisseurs0 = q("SELECT GROUP_CONCAT(CONCAT_WS(':', code, actif + 0, en_vigueur + 0) ORDER BY code) FROM sms_fournisseur");
const paramsLeTexto0 = q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('=', p.cle, MD5(IFNULL(p.valeur, ''))) ORDER BY p.cle), '') FROM sms_fournisseur_param p JOIN sms_fournisseur f ON f.id = p.fournisseur_id WHERE f.code = 'LETEXTO'");

/* faux fournisseur SMS : rien ne sort du poste */
const recus = [];
const serveur = http.createServer((req, rep) => {
  let corps = '';
  req.on('data', (c) => { corps += c; });
  req.on('end', () => {
    if (req.method === 'POST' && /\/v1\/messages\/send$/.test(req.url)) {
      let j = {}; try { j = JSON.parse(corps); } catch (e) { j = {}; }
      recus.push({ to: j.to, customData: j.customData, quand: Date.now() });
      rep.writeHead(200, { 'Content-Type': 'application/json' });
      rep.end(JSON.stringify({ id: 'FAUX-' + recus.length }));
      return;
    }
    rep.writeHead(404); rep.end('{}');
  });
});

function retirerBon(b) {
  exec(`DELETE FROM HMvtProduit WHERE pkey LIKE '${b.BL}-D%'; DELETE FROM MvtTransaction WHERE pkey = '${b.BL}';`
    + `DELETE e FROM t_etiquette e JOIN t_warehouse w ON w.str_CODE_ETIQUETTE = e.str_CODE AND w.lg_FAMILLE_ID = e.lg_FAMILLE_ID`
    + ` AND ABS(TIMESTAMPDIFF(SECOND, w.dt_CREATED, e.dt_CREATED)) <= 2 WHERE w.str_REF_LIVRAISON = '${b.REF}';`
    + `DELETE FROM t_warehouse WHERE str_REF_LIVRAISON = '${b.REF}'; DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${b.REF}';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE '%${b.REF}%';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${b.BL}'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${b.BL}';`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${b.ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${b.ORD}';`);
}
const NOTIFS = `SELECT n.id FROM notification n WHERE n.entity_ref LIKE '${PFX}-BL%'`;
function remettre() {
  /* retours du 22/11 (lot 10) : decisions d'envoi de la fenetre des avoirs */
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'avoir_envoi'") === '1') { exec(`DELETE FROM avoir_envoi WHERE bon_id LIKE '${PFX}-BL%';`); }
  exec(`DELETE FROM whatsapp_message WHERE notification_id IN (${NOTIFS}) OR client_id LIKE '${PFX}-C%';`
    + `DELETE FROM notification_vente WHERE lg_PREENREGISTREMENT_ID IN (${LISTE_VENTES});`
    + `DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM (${NOTIFS}) x) OR client_id LIKE '${PFX}-C%';`
    + `DELETE FROM notification WHERE entity_ref LIKE '${PFX}-BL%';`);
  ESSAIS.forEach(retirerBon);
  exec(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${LISTE_VENTES}); DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${LISTE_VENTES});`
    + `DELETE FROM t_client WHERE lg_CLIENT_ID LIKE '${PFX}-C%';`);
  if (P.length && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_avm_t_famille'") === '1') {
    const susp = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", s.lg_SUGGESTION_RESERVE_ID, "'")), "''") FROM t_suggestion_reserve s WHERE s.dt_CREATED >= '${debut}' AND s.str_ORIGINE = 'AUTOMATIQUE'`
      + ` AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID AND d.lg_FAMILLE_ID NOT IN (${LISTE}))`);
    exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID IN (${LISTE}) AND dt_CREATED >= '${debut}'; DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID IN (${susp});`);
    SAUVE.forEach((t) => {
      if (t === 't_snapshot_famillesell') {
        exec(`DELETE FROM ${t} WHERE lg_FAMILLE_ID IN (${LISTE}); INSERT INTO ${t} SELECT * FROM e2e_avm_${t}; DROP TABLE e2e_avm_${t};`);
        return;
      }
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_avm_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_avm_${t};`);
    });
    exec(`DELETE FROM t_famille_history WHERE lg_FAMILLE_ID IN (${LISTE}) AND dt_CREATED >= '${debut}';`);
  }
  PARAMS.forEach((k) => {
    if (avant[k] === '#ABSENT#') { exec(`DELETE FROM t_parameters WHERE str_KEY = '${k}'`); } else { exec(`UPDATE t_parameters SET str_VALUE = '${avant[k]}' WHERE str_KEY = '${k}'`); }
  });
  /* fournisseurs SMS remis */
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_avm_sms_param'") === '1') {
    exec("DELETE p FROM sms_fournisseur_param p JOIN sms_fournisseur f ON f.id = p.fournisseur_id WHERE f.code = 'LETEXTO';"
      + 'INSERT INTO sms_fournisseur_param SELECT * FROM e2e_avm_sms_param; DROP TABLE e2e_avm_sms_param;'
      + 'UPDATE sms_fournisseur f JOIN e2e_avm_sms_f s ON s.id = f.id SET f.actif = s.actif, f.en_vigueur = s.en_vigueur, f.dlr_mode = s.dlr_mode, f.dlr_callback_url = s.dlr_callback_url;'
      + 'DROP TABLE e2e_avm_sms_f;');
  }
}
function preparer(port) {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_avm_${t}; CREATE TABLE e2e_avm_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID IN (${LISTE});`));
  exec("DROP TABLE IF EXISTS e2e_avm_sms_param; CREATE TABLE e2e_avm_sms_param AS SELECT p.* FROM sms_fournisseur_param p JOIN sms_fournisseur f ON f.id = p.fournisseur_id WHERE f.code = 'LETEXTO';"
    + 'DROP TABLE IF EXISTS e2e_avm_sms_f; CREATE TABLE e2e_avm_sms_f AS SELECT * FROM sms_fournisseur;');
  const lt = q("SELECT id FROM sms_fournisseur WHERE code = 'LETEXTO'");
  exec(`UPDATE sms_fournisseur SET en_vigueur = 0; UPDATE sms_fournisseur SET actif = 1, en_vigueur = 1, dlr_callback_url = NULL WHERE id = '${lt}';`
    + `DELETE FROM sms_fournisseur_param WHERE fournisseur_id = '${lt}';`
    + ['base_url=http://127.0.0.1:' + port, 'api_key=essai-e2e', 'sender_name=ESSAI'].map((x) => { const [c, v] = x.split('='); return `INSERT INTO sms_fournisseur_param (id, fournisseur_id, cle, valeur) VALUES (LEFT(UUID(), 36), '${lt}', '${c}', '${v}');`; }).join(''));
  exec(CLIENTS.map(([id, tel, wa, sms], i) => 'INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_ADRESSE, str_SEXE, lg_TYPE_CLIENT_ID, str_STATUT,'
    + ` dt_CREATED, dt_UPDATED, bool_CONSENT_WHATSAPP, bool_CONSENT_SMS) VALUES ('${id}', 'ZZAVM${i + 1}', 'ESSAI', '${tel}', NULL, 'F', '6', 'enable', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, ${wa}, ${sms});`).join(''));
}
/* vente en avoir clonee d'une vente cloturee recente, rattachee au client fictif */
function cloner(id, client, produit, modele) {
  const detail = q(`SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${modele}' LIMIT 1`);
  exec(`CREATE TEMPORARY TABLE tp AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${modele}';`
    + `UPDATE tp SET lg_PREENREGISTREMENT_ID = '${id}', lg_CLIENT_ID = '${client}', str_REF = '${TICKET(id)}', str_REF_TICKET = '${TICKET(id)}', b_IS_AVOIR = 1, b_IS_CANCEL = 0, dt_UPDATED = NOW();`
    + 'INSERT INTO t_preenregistrement SELECT * FROM tp; DROP TEMPORARY TABLE tp;'
    + `CREATE TEMPORARY TABLE td AS SELECT * FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${detail}';`
    + `UPDATE td SET lg_PREENREGISTREMENT_DETAIL_ID = '${id}-D0', lg_PREENREGISTREMENT_ID = '${id}', lg_FAMILLE_ID = '${produit}', int_QUANTITY = 2,`
    + ' int_QUANTITY_SERVED = 1, int_AVOIR = 1, int_AVOIR_SERVED = 0, str_STATUT = \'is_Closed\';'
    + 'INSERT INTO t_preenregistrement_detail SELECT * FROM td; DROP TEMPORARY TABLE td;'
    + `UPDATE t_preenregistrement_detail SET b_IS_AVOIR = 1 WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${id}-D0';`);
}
function creerBon(b) {
  const prods = b.produits.map((i) => "'" + P[i] + "'").join(',');
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${b.ORD}', '${b.REF}', ${b.produits.length}, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${b.BL}', '${b.REF}', NOW(), SUM(2 * f.int_PAF), 0, SUM(2 * f.int_PAF), '${b.ORD}', 'enable', NOW(), NOW(), MAX(u.lg_USER_ID) FROM t_famille f, t_user u WHERE f.lg_FAMILLE_ID IN (${prods}) AND u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
    + ` SELECT CONCAT('${b.BL}-D', f.lg_FAMILLE_ID), '${G}', f.lg_FAMILLE_ID, '${b.BL}', 2, 0, 0, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, s.int_NUMBER_AVAILABLE`
    + ` FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID IN (${prods});`);
}
const stocks = () => q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER_AVAILABLE) ORDER BY lg_FAMILLE_ID) FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID IN (${LISTE})`);
const V = (court) => PFX + '-' + court;
/* etat attendu en base pour une vente : messages lies, envois WhatsApp et SMS */
const liens = (v) => q(`SELECT COUNT(*) FROM notification_vente WHERE lg_PREENREGISTREMENT_ID = '${v}'`);

(async () => {
  const modeles = q("SELECT MIN(p.lg_PREENREGISTREMENT_ID) FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND COALESCE(p.b_IS_CANCEL, 0) = 0"
    + " AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID) AND p.dt_UPDATED >= (SELECT MAX(dt_UPDATED) - INTERVAL 30 DAY FROM t_preenregistrement)");
  ok('Préalable : 2 produits en stock d\'un grossiste, une vente modèle, numéros fictifs libres, migration passée',
    P.length === 2 && !!modeles && q("SELECT COUNT(*) FROM t_client WHERE str_TELEPHONE LIKE '01009902%' OR str_ADRESSE LIKE '01009902%'") === '0'
    && q("SELECT COUNT(*) FROM t_parameters WHERE str_KEY = 'KEY_SMS_AVOIR_CANAL'") === '1'
    && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_vente'") === '1', P.length + ' / ' + modeles);
  if (P.length !== 2 || !modeles) { process.exit(1); }
  await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
  const port = serveur.address().port;
  remettre();
  const stockAvant = stocks();
  let b = null;
  try {
    preparer(port);
    /* ventes d'un essai creees juste avant son bon, puis servies : chaque bon ne previent que les siennes */
    const ouvrir = (courts) => VENTES.filter(([id]) => courts.includes(id.slice(PFX.length + 1))).forEach(([id, c, pr]) => cloner(id, CLIENTS[c][0], P[pr], modeles));
    const servir = (courts) => exec(`UPDATE t_preenregistrement_detail SET int_QUANTITY_SERVED = int_QUANTITY, int_AVOIR_SERVED = int_AVOIR WHERE lg_PREENREGISTREMENT_ID IN (${courts.map((c) => "'" + V(c) + "'").join(',')})`);
    exec("UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = 'KEY_SMS_AVOIR_IMMEDIAT'");
    b = await ENV_E2E.lancer(chromium);
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
    const dialogues = []; p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    const entrer = async (e) => {
      creerBon(e);
      await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('bonlivraisonmanager', 'Bon de livraison', ''));
      await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, e.BL, { timeout: 120000 });
      const icone = await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0], v = g.getView();
        const n = v.getNode(g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); n.scrollIntoView();
        const img = n.querySelector('img.x-action-col-0'); img.id = 'e2e-detail-' + bl; return img.id; }, e.BL);
      await p.click('#' + icone);
      await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('btn_enterstock').isVisible(true), null, { timeout: 120000 });
      await p.waitForTimeout(800);
      await cliquer(p, '#btn_enterstock');
      if (!await attendreMessage(p, 'UNITÉS GRATUITES', 20000)) { throw new Error('question des unités gratuites absente'); }
      await repondre(p, 'yes');
      if (!await attendreMessage(p, "Confirmer l'entrée en stock", 20000)) { throw new Error('confirmation absente'); }
      await repondre(p, 'yes');
      await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('avoirsbonfenetre')[0]; return w && /vc-tableau|vc-vide/.test(w.getEl().dom.innerHTML); }, null, { timeout: 120000 });
      await p.click('.vc-pied [data-action=fermer]');
      if (await attendreMessage(p, 'impression des entrées', 30000)) { await repondre(p, 'no'); }
      if (await attendreMessage(p, 'imprimer les étiquettes', 20000)) { await repondre(p, 'no'); }
      await p.waitForTimeout(500);
    };
    /* attend la fin des envois asynchrones d'un bon (WhatsApp journalise, SMS partis) */
    const attendreEnvois = async (cond) => { for (let i = 0; i < 60 && !cond(); i++) { await attendre(500); } return cond(); };

    /* 1. SMS : S1 et S2 du client C1, un seul message, un SMS */
    exec("UPDATE t_parameters SET str_VALUE = 'SMS' WHERE str_KEY = 'KEY_SMS_AVOIR_CANAL'");
    const e1 = ESSAIS[0];
    ouvrir(e1.ventes);
    await entrer(e1);
    await attendreEnvois(() => recus.length >= 1 && q(`SELECT COUNT(*) FROM notification_client nc JOIN notification n ON n.id = nc.notification_id WHERE n.entity_ref = '${e1.BL}' AND nc.statut = 'SENT'`) === '1');
    const n1 = q(`SELECT n.id FROM notification n JOIN categorie_notification c ON c.id = n.type_notification WHERE n.entity_ref = '${e1.BL}' AND c.name = 'AVOIR_PRODUIT'`).split('\n').filter(Boolean);
    ok('SMS : un seul message pour les deux ventes de C1, rattaché à S1 et S2', n1.length === 1
      && q(`SELECT GROUP_CONCAT(lg_PREENREGISTREMENT_ID ORDER BY lg_PREENREGISTREMENT_ID) FROM notification_vente WHERE notification_id = '${n1[0]}'`) === V('S1') + ',' + V('S2'), n1.join(','));
    ok('SMS : un SMS reçu par le fournisseur, au numéro fictif de C1, aucun WhatsApp', recus.length === 1 && recus[0].to === '2250100990201'
      && q(`SELECT COUNT(*) FROM whatsapp_message WHERE notification_id IN (${NOTIFS})`) === '0', JSON.stringify(recus.map((r) => r.to)));

    /* 2. WHATSAPP : C2 refuse WhatsApp (echec, pas de SMS), C3 l'accepte (envoye, simule) */
    exec("UPDATE t_parameters SET str_VALUE = 'WHATSAPP' WHERE str_KEY = 'KEY_SMS_AVOIR_CANAL'");
    servir(e1.ventes);
    const e2 = ESSAIS[1];
    ouvrir(e2.ventes);
    await entrer(e2);
    const wa2 = () => q(`SELECT GROUP_CONCAT(CONCAT_WS('|', w.client_id, w.statut, w.origine, w.repli_sms) ORDER BY w.client_id) FROM whatsapp_message w JOIN notification n ON n.id = w.notification_id WHERE n.entity_ref = '${e2.BL}'`);
    await attendreEnvois(() => wa2().split(',').filter(Boolean).length === 2);
    await attendre(1500);
    ok('WhatsApp : C2 refuse WhatsApp -> échec ; C3 -> envoyé (mode test) ; origine « AVOIR » ; aucun repli', wa2() === `${PFX}-C2|ECHEC|AVOIR|0,${PFX}-C3|SIMULE|AVOIR|0`, wa2());
    ok('WhatsApp : aucun SMS envoyé (ni tout de suite, ni en repli)', recus.length === 1
      && q(`SELECT COUNT(*) FROM notification n WHERE n.entity_ref = '${e2.BL}'`) === '3', recus.length + ' SMS ; ' + q(`SELECT COUNT(*) FROM notification n WHERE n.entity_ref = '${e2.BL}'`) + ' notifications');
    ok('WhatsApp : chaque message rattaché à sa vente (S3, S4)', liens(V('S3')) === '1' && liens(V('S4')) === '1');

    /* 3. SMS_WHATSAPP : C2 refuse WhatsApp -> repli SMS, porte la meme vente */
    exec("UPDATE t_parameters SET str_VALUE = 'SMS_WHATSAPP' WHERE str_KEY = 'KEY_SMS_AVOIR_CANAL'");
    servir(e2.ventes);
    const e3 = ESSAIS[2];
    ouvrir(e3.ventes);
    await entrer(e3);
    await attendreEnvois(() => recus.length >= 2);
    await attendre(1500);
    const n3 = q(`SELECT GROUP_CONCAT(CONCAT_WS('|', (SELECT COUNT(*) FROM whatsapp_message w WHERE w.notification_id = n.id), (SELECT GROUP_CONCAT(nc.statut) FROM notification_client nc WHERE nc.notification_id = n.id)) ORDER BY (SELECT COUNT(*) FROM whatsapp_message w WHERE w.notification_id = n.id) DESC)`
      + ` FROM notification n JOIN categorie_notification c ON c.id = n.type_notification WHERE n.entity_ref = '${e3.BL}' AND c.name = 'AVOIR_PRODUIT'`);
    ok('WhatsApp puis SMS : WhatsApp refusé (repli noté), une notification de repli envoyée par SMS au numéro de C2', recus.length === 2 && recus[1].to === '2250100990202'
      && q(`SELECT CONCAT_WS('|', w.statut, w.repli_sms, w.origine) FROM whatsapp_message w JOIN notification n ON n.id = w.notification_id WHERE n.entity_ref = '${e3.BL}'`) === 'ECHEC|1|AVOIR'
      && n3 === '1|NOT_SEND,0|SENT', n3 + ' ; SMS ' + JSON.stringify(recus.map((r) => r.to)));
    ok('WhatsApp puis SMS : le repli est rattaché à la même vente (S5 : 2 messages liés)', liens(V('S5')) === '2', liens(V('S5')));

    servir(['S5']);
    ouvrir(['S6']);   /* vente en avoir sans message : « — » dans la liste */
    servir(['S6']);
    /* 4. liste des avoirs : colonne Message = API = base */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('venteavoirmanager', 'Liste des avoirs', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('venteavoirmanager')[0]; return e && e.down('#gridEnCours') && e.down('#query'); }, null, { timeout: 30000 });
    const chercher = async () => {
      /* le premier chargement de la grille (sans recherche) doit etre fini : sinon il ecrase le resultat */
      await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('venteavoirmanager #gridEnCours')[0].getStore(); return !!st.lastOptions && !st.isLoading(); }, null, { timeout: 60000 });
      const id = await p.evaluate(() => Ext.ComponentQuery.query('venteavoirmanager #query')[0].inputEl.id);
      await p.click('#' + id); await p.keyboard.press('Control+A'); await p.keyboard.type('E2EAVM', { delay: 20 });
      const r = p.waitForResponse((x) => /api\/v1\/ventestats\?/.test(x.url()) && /onlyAvoir=true/.test(x.url()) && /query=E2EAVM/.test(x.url()) && /avoirStatut=EN_COURS/.test(x.url()), { timeout: 30000 });
      await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('venteavoirmanager #rechercher')[0].getId()));
      const rep = await (await r).json().catch(() => ({}));
      await p.waitForFunction(() => !Ext.ComponentQuery.query('venteavoirmanager #gridEnCours')[0].getStore().isLoading(), null, { timeout: 30000 });
      await p.waitForTimeout(600);
      return rep;
    };
    const lireEcran = () => p.evaluate(() => {
      const g = Ext.ComponentQuery.query('venteavoirmanager #gridEnCours')[0], col = g.down('#colMessage'), o = {};
      g.getStore().each((r) => {
        const n = g.getView().getNode(r), td = n && n.querySelector(g.getView().getCellSelector(col));
        const etat = td && td.querySelector('.av-msg, .av-msg-aucun'), canal = td && td.querySelector('.av-msg-canal');
        const inner = td && td.querySelector('.x-grid-cell-inner');
        o[r.get('lgPREENREGISTREMENTID')] = { etat: etat ? etat.textContent : null, canal: canal ? canal.textContent : '', bulle: td ? td.getAttribute('data-qtip') || '' : '',
          entier: !!etat && etat.getBoundingClientRect().right <= td.getBoundingClientRect().right + 1 && (!inner || inner.scrollWidth <= inner.clientWidth + 1 || !!canal) };
      });
      return o;
    });
    /* base : etat attendu de chaque vente, calcule par la regle (dernier envoi, repli apres WhatsApp) */
    const attenduBase = () => {
      const o = {};
      VENTES.forEach(([v]) => {
        const lignes = q(`SELECT CONCAT_WS('|', n.created_at, IFNULL(w.statut, '-'), IFNULL(nc.statut, '-'), IFNULL(nc.delivery_status, '-'), IFNULL(nc.error_code, '-'), n.statut, n.id)`
          + ` FROM notification_vente nv JOIN notification n ON n.id = nv.notification_id LEFT JOIN whatsapp_message w ON w.notification_id = n.id`
          + ` LEFT JOIN notification_client nc ON nc.notification_id = n.id WHERE nv.lg_PREENREGISTREMENT_ID = '${v}'`).split('\n').filter(Boolean).map((l) => l.split('|'));
        if (!lignes.length) { o[v] = { etat: '—', canal: '' }; return; }
        lignes.sort((a, b2) => (a[0] < b2[0] ? -1 : a[0] > b2[0] ? 1 : (a[1] !== '-' ? 0 : 1) - (b2[1] !== '-' ? 0 : 1)));
        const d = lignes[lignes.length - 1];
        const wa = d[1] !== '-';
        const etat = wa ? ({ ECHEC: 'Échec', LU: 'Lu', DELIVRE: 'Distribué', ENVOYE: 'Envoyé', SIMULE: 'Envoyé' }[d[1]] || 'En attente')
          : d[3] === 'DELIVERED_TO_TERMINAL' ? 'Distribué' : d[3] === 'DELIVERY_IMPOSSIBLE' ? 'Échec' : d[2] === 'SENT' ? 'Envoyé' : (d[5] === 'LOCK' || d[4] !== '-') ? 'Échec' : 'En attente';
        o[v] = { etat, canal: wa ? 'WhatsApp' : 'SMS' };
      });
      return o;
    };
    const comparer = async (titre, voulu) => {
      const rep = await chercher();
      const api = Object.fromEntries((rep.data || []).map((x) => [x.lgPREENREGISTREMENTID, { etat: x.messageEtat || '—', canal: x.messageCanal || '', date: x.messageDate || '', motif: x.messageMotif || '' }]));
      const ecran = await lireEcran();
      const base = attenduBase();
      const ecarts = [];
      VENTES.forEach(([v]) => {
        const e = ecran[v] || {}, a = api[v] || {}, bs = base[v];
        const canalEcran = (e.canal || '').split(' · ')[0];
        if (!e.etat || e.etat !== a.etat || e.etat !== bs.etat || canalEcran !== a.canal || a.canal !== bs.canal || e.etat !== voulu[v]
          || (a.date && (e.canal || '').indexOf(a.date) < 0) || (a.motif && e.bulle.indexOf(a.motif) < 0)) {
          ecarts.push(v.slice(-2) + ' écran ' + e.etat + '/' + e.canal + ' api ' + a.etat + '/' + a.canal + ' base ' + bs.etat + '/' + bs.canal + ' voulu ' + voulu[v]);
        }
      });
      ok(titre, ecarts.length === 0 && Object.keys(ecran).filter((k) => k.startsWith(PFX)).length === VENTES.length,
        'API ' + rep.total + ' ligne(s), grille ' + Object.keys(ecran).length + ' : ' + ecarts.join(' ; '));
      return { ecran, api };
    };
    const voulu1 = { [V('S1')]: 'Envoyé', [V('S2')]: 'Envoyé', [V('S3')]: 'Échec', [V('S4')]: 'Envoyé', [V('S5')]: 'Envoyé', [V('S6')]: '—' };
    const r1 = await comparer('Liste des avoirs : colonne Message = API = base, vente par vente (SMS envoyé ×2, WhatsApp échec et envoyé, repli SMS envoyé, sans message « — »)', voulu1);
    ok('Liste : canal affiché (SMS pour S1, S2, S5 ; WhatsApp pour S3, S4), motif de l\'échec en info-bulle', r1.api[V('S1')].canal === 'SMS' && r1.api[V('S5')].canal === 'SMS'
      && r1.api[V('S3')].canal === 'WhatsApp' && r1.api[V('S4')].canal === 'WhatsApp' && /refusé WhatsApp/.test(r1.ecran[V('S3')].bulle) && /Aucun message/.test(r1.ecran[V('S6')].bulle),
      JSON.stringify([r1.ecran[V('S3')], r1.ecran[V('S6')]]));

    /* 5. accuses simules : SMS de C1 distribue, WhatsApp de C3 lu */
    exec(`UPDATE notification_client nc JOIN notification n ON n.id = nc.notification_id SET nc.delivery_status = 'DELIVERED_TO_TERMINAL' WHERE n.entity_ref = '${e1.BL}' AND nc.client_id = '${PFX}-C1';`
      + `UPDATE whatsapp_message w JOIN notification n ON n.id = w.notification_id SET w.statut = 'LU', w.updated_at = NOW() WHERE n.entity_ref = '${e2.BL}' AND w.client_id = '${PFX}-C3';`);
    const voulu2 = Object.assign({}, voulu1, { [V('S1')]: 'Distribué', [V('S2')]: 'Distribué', [V('S4')]: 'Lu' });
    await comparer('Après accusés : SMS distribué (S1, S2), WhatsApp lu (S4), le reste inchangé ; écran = API = base', voulu2);

    /* 6. tailles d'ecran */
    for (const [lg, ht] of [[1366, 768], [1280, 720], [1920, 1080]]) {
      await p.setViewportSize({ width: lg, height: ht }); await p.waitForTimeout(900);
      const e = await lireEcran();
      const mauvais = VENTES.filter(([v]) => !e[v] || !e[v].entier).map(([v]) => v.slice(-2));
      ok(`${lg}×${ht} : colonne Message visible, état lisible en entier pour chaque vente`, mauvais.length === 0, mauvais.join(','));
    }

    /* 7. parametre inconnu = SMS */
    exec("UPDATE t_parameters SET str_VALUE = 'PIGEON' WHERE str_KEY = 'KEY_SMS_AVOIR_CANAL'");
    const smsAvant = recus.length;
    const e4 = { canal: 'PIGEON', ventes: ['S6'], produits: [0], BL: PFX + '-BL3', ORD: PFX + '-ORD3', REF: 'E2EAVM' + String(Date.now()).slice(-6) + '3' };
    ESSAIS.push(e4);
    exec(`UPDATE t_preenregistrement_detail SET int_QUANTITY_SERVED = 1, int_AVOIR_SERVED = 0 WHERE lg_PREENREGISTREMENT_ID = '${V('S6')}'`);
    await entrer(e4);
    await attendreEnvois(() => recus.length > smsAvant);
    await attendre(1000);
    ok('Valeur inconnue du paramètre : le message part par SMS, comme avant (C4)', recus.length === smsAvant + 1 && recus[recus.length - 1].to === '2250100990204'
      && q(`SELECT COUNT(*) FROM whatsapp_message w JOIN notification n ON n.id = w.notification_id WHERE n.entity_ref = '${e4.BL}'`) === '0', JSON.stringify(recus.slice(smsAvant).map((r) => r.to)));

    /* 8. bilan */
    const bilan = ESSAIS.map((e) => q(`SELECT CONCAT_WS('/', (SELECT COUNT(*) FROM notification n JOIN categorie_notification c ON c.id = n.type_notification WHERE n.entity_ref = '${e.BL}' AND c.name = 'AVOIR_PRODUIT'),`
      + ` (SELECT COUNT(*) FROM whatsapp_message w JOIN notification n ON n.id = w.notification_id WHERE n.entity_ref = '${e.BL}'),`
      + ` (SELECT COUNT(*) FROM notification_vente nv JOIN notification n ON n.id = nv.notification_id WHERE n.entity_ref = '${e.BL}'))`)).join(' ; ');
    ok('Bilan par bon (messages d\'avoir / envois WhatsApp / liens vente) : SMS 1/0/2, WhatsApp 2/2/2, repli 2/1/2, inconnu 1/0/1 ; 3 SMS au total', bilan === '1/0/2 ; 2/2/2 ; 2/1/2 ; 1/0/1' && recus.length === 3, bilan + ' ; ' + recus.length + ' SMS');
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e && e.stack);
  } finally {
    if (b) { await b.close(); }
    serveur.close();
    try { remettre(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Nettoyage : stocks, paramètres et fournisseurs SMS remis, données d\'essai retirées', stocks() === stockAvant
      && PARAMS.every((k) => q(`SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${k}'), '#ABSENT#')`) === avant[k])
      && q("SELECT GROUP_CONCAT(CONCAT_WS(':', code, actif + 0, en_vigueur + 0) ORDER BY code) FROM sms_fournisseur") === fournisseurs0
      && q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('=', p.cle, MD5(IFNULL(p.valeur, ''))) ORDER BY p.cle), '') FROM sms_fournisseur_param p JOIN sms_fournisseur f ON f.id = p.fournisseur_id WHERE f.code = 'LETEXTO'") === paramsLeTexto0
      && q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE '${PFX}-C%'`) === '0' && q(`SELECT COUNT(*) FROM notification WHERE entity_ref LIKE '${PFX}%'`) === '0'
      && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'e2e\\_avm\\_%'") === '0');
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
