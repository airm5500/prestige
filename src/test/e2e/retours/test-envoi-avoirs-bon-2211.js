/* MESSAGES D'AVOIR : ENVOI DEPUIS LA FENETRE DES PRODUITS EN AVOIR (retours du 22/11, lot 10, point 3).
 *
 * Cinq entrees en stock par le vrai chemin de l'ecran (Bon de livraison > Detail > ENTREE EN STOCK) sur des ventes en
 * avoir de clients FICTIFS (numeros 01009903xx) ; la fenetre « Produits en avoir » s'ouvre apres chacune :
 *  1. canal par defaut SMS : « Envoyer aux clients (2) » -> choix dans le pied (SMS / WhatsApp / Annuler) ; Annuler ne
 *     fait rien ; WhatsApp envoie les 2 messages (C1, C3), trace l'utilisateur ; a la fermeture, rien de plus ;
 *  2. canal par defaut WhatsApp, rien a la main : a la fermeture, WhatsApp (C2 le refuse : echec, aucun SMS) ;
 *  3. canal par defaut SMS, envoi a la main par SMS (C4) : un SMS ; a la fermeture, rien de plus ;
 *  4. SMS sans envoi immediat (KEY_SMS_AVOIR_IMMEDIAT = 0), rien a la main : a la fermeture rien ne part, le message
 *     reste pour le passage planifie, comme avant ;
 *  5. WhatsApp puis SMS, rien a la main : a la fermeture, WhatsApp refuse par C2, repli SMS.
 * Aucun envoi reel : WhatsApp en mode test (simule) ; SMS recus par un faux fournisseur local (LeTexto sur 127.0.0.1),
 * declare le temps du test puis remis. Le texte des messages n'est jamais lu.
 * Controles : rien ne part a l'entree en stock elle-meme ; pied de la fenetre (canal, mode, utilisateur) = API = base
 * (avoir_envoi) ; SMS recus = attendus (nombre, numeros) ; envois WhatsApp = attendus ; bilan par bon (messages,
 * envois WhatsApp, decisions d'envoi, SMS) ; tout retire.
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

const PFX = 'E2E-AVE';
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
const CLIENTS = [[PFX + '-C1', '0100990301', 1, 1], [PFX + '-C2', '0100990302', 0, 1], [PFX + '-C3', '0100990303', 1, 1], [PFX + '-C4', '0100990304', 1, 1]];
/* ventes en avoir : [id, client, produit] */
const VENTES = [[PFX + '-S1', 0, 0], [PFX + '-S2', 2, 1], [PFX + '-S3', 1, 0], [PFX + '-S4', 3, 1], [PFX + '-S5', 0, 0], [PFX + '-S6', 1, 1]];
const LISTE_VENTES = VENTES.map((v) => "'" + v[0] + "'").join(',');
const TICKET = (v) => 'E2EAVE' + v.slice(-2);
/* essais : canal, ventes servies par le bon, produits du bon */
const ESSAIS = [
  /* SMS par defaut ; a la main : Annuler, puis WhatsApp (C1 et C3) ; rien a la fermeture */
  { canal: 'SMS', immediat: '1', ventes: ['S1', 'S2'], produits: [0, 1] },
  /* WhatsApp par defaut ; rien a la main ; a la fermeture : WhatsApp (C2 le refuse : echec, pas de SMS) */
  { canal: 'WHATSAPP', immediat: '1', ventes: ['S3'], produits: [0] },
  /* SMS par defaut ; a la main : SMS (C4) ; rien a la fermeture */
  { canal: 'SMS', immediat: '1', ventes: ['S4'], produits: [1] },
  /* SMS sans envoi immediat ; rien a la main ; a la fermeture : rien (passage planifie, comme avant) */
  { canal: 'SMS', immediat: '0', ventes: ['S5'], produits: [0] },
  /* WhatsApp puis SMS ; rien a la main ; a la fermeture : WhatsApp refuse par C2, repli SMS */
  { canal: 'SMS_WHATSAPP', immediat: '1', ventes: ['S6'], produits: [1] }
];
ESSAIS.forEach((e, i) => { e.BL = PFX + '-BL' + i; e.ORD = PFX + '-ORD' + i; e.REF = 'E2EAVE' + String(Date.now()).slice(-6) + i; });
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
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'avoir_envoi'") === '1') { exec(`DELETE FROM avoir_envoi WHERE bon_id LIKE '${PFX}-BL%';`); }
  exec(`DELETE FROM whatsapp_message WHERE notification_id IN (${NOTIFS}) OR client_id LIKE '${PFX}-C%';`
    + `DELETE FROM notification_vente WHERE lg_PREENREGISTREMENT_ID IN (${LISTE_VENTES});`
    + `DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM (${NOTIFS}) x) OR client_id LIKE '${PFX}-C%';`
    + `DELETE FROM notification WHERE entity_ref LIKE '${PFX}-BL%';`);
  ESSAIS.forEach(retirerBon);
  exec(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${LISTE_VENTES}); DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${LISTE_VENTES});`
    + `DELETE FROM t_client WHERE lg_CLIENT_ID LIKE '${PFX}-C%';`);
  if (P.length && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_ave_t_famille'") === '1') {
    const susp = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", s.lg_SUGGESTION_RESERVE_ID, "'")), "''") FROM t_suggestion_reserve s WHERE s.dt_CREATED >= '${debut}' AND s.str_ORIGINE = 'AUTOMATIQUE'`
      + ` AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID AND d.lg_FAMILLE_ID NOT IN (${LISTE}))`);
    exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID IN (${LISTE}) AND dt_CREATED >= '${debut}'; DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID IN (${susp});`);
    SAUVE.forEach((t) => {
      if (t === 't_snapshot_famillesell') {
        exec(`DELETE FROM ${t} WHERE lg_FAMILLE_ID IN (${LISTE}); INSERT INTO ${t} SELECT * FROM e2e_ave_${t}; DROP TABLE e2e_ave_${t};`);
        return;
      }
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_ave_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_ave_${t};`);
    });
    exec(`DELETE FROM t_famille_history WHERE lg_FAMILLE_ID IN (${LISTE}) AND dt_CREATED >= '${debut}';`);
  }
  PARAMS.forEach((k) => {
    if (avant[k] === '#ABSENT#') { exec(`DELETE FROM t_parameters WHERE str_KEY = '${k}'`); } else { exec(`UPDATE t_parameters SET str_VALUE = '${avant[k]}' WHERE str_KEY = '${k}'`); }
  });
  /* fournisseurs SMS remis */
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_ave_sms_param'") === '1') {
    exec("DELETE p FROM sms_fournisseur_param p JOIN sms_fournisseur f ON f.id = p.fournisseur_id WHERE f.code = 'LETEXTO';"
      + 'INSERT INTO sms_fournisseur_param SELECT * FROM e2e_ave_sms_param; DROP TABLE e2e_ave_sms_param;'
      + 'UPDATE sms_fournisseur f JOIN e2e_ave_sms_f s ON s.id = f.id SET f.actif = s.actif, f.en_vigueur = s.en_vigueur, f.dlr_mode = s.dlr_mode, f.dlr_callback_url = s.dlr_callback_url;'
      + 'DROP TABLE e2e_ave_sms_f;');
  }
}
function preparer(port) {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_ave_${t}; CREATE TABLE e2e_ave_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID IN (${LISTE});`));
  exec("DROP TABLE IF EXISTS e2e_ave_sms_param; CREATE TABLE e2e_ave_sms_param AS SELECT p.* FROM sms_fournisseur_param p JOIN sms_fournisseur f ON f.id = p.fournisseur_id WHERE f.code = 'LETEXTO';"
    + 'DROP TABLE IF EXISTS e2e_ave_sms_f; CREATE TABLE e2e_ave_sms_f AS SELECT * FROM sms_fournisseur;');
  const lt = q("SELECT id FROM sms_fournisseur WHERE code = 'LETEXTO'");
  exec(`UPDATE sms_fournisseur SET en_vigueur = 0; UPDATE sms_fournisseur SET actif = 1, en_vigueur = 1, dlr_callback_url = NULL WHERE id = '${lt}';`
    + `DELETE FROM sms_fournisseur_param WHERE fournisseur_id = '${lt}';`
    + ['base_url=http://127.0.0.1:' + port, 'api_key=essai-e2e', 'sender_name=ESSAI'].map((x) => { const [c, v] = x.split('='); return `INSERT INTO sms_fournisseur_param (id, fournisseur_id, cle, valeur) VALUES (LEFT(UUID(), 36), '${lt}', '${c}', '${v}');`; }).join(''));
  exec(CLIENTS.map(([id, tel, wa, sms], i) => 'INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_TELEPHONE, str_ADRESSE, str_SEXE, lg_TYPE_CLIENT_ID, str_STATUT,'
    + ` dt_CREATED, dt_UPDATED, bool_CONSENT_WHATSAPP, bool_CONSENT_SMS) VALUES ('${id}', 'ZZAVE${i + 1}', 'ESSAI', '${tel}', NULL, 'F', '6', 'enable', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, ${wa}, ${sms});`).join(''));
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
    P.length === 2 && !!modeles && q("SELECT COUNT(*) FROM t_client WHERE str_TELEPHONE LIKE '01009903%' OR str_ADRESSE LIKE '01009903%'") === '0'
    && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'avoir_envoi'") === '1', P.length + ' / ' + modeles);
  if (P.length !== 2 || !modeles) { process.exit(1); }
  await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
  const port = serveur.address().port;
  remettre();
  const stockAvant = stocks();
  let b = null;
  try {
    preparer(port);
    const ouvrir = (courts) => VENTES.filter(([id]) => courts.includes(id.slice(PFX.length + 1))).forEach(([id, c, pr]) => cloner(id, CLIENTS[c][0], P[pr], modeles));
    const servir = (courts) => exec(`UPDATE t_preenregistrement_detail SET int_QUANTITY_SERVED = int_QUANTITY, int_AVOIR_SERVED = int_AVOIR WHERE lg_PREENREGISTREMENT_ID IN (${courts.map((c) => "'" + V(c) + "'").join(',')})`);
    b = await ENV_E2E.lancer(chromium);
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
    const dialogues = []; p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const nomUtilisateur = q(`SELECT TRIM(CONCAT(IFNULL(str_FIRST_NAME, ''), ' ', IFNULL(str_LAST_NAME, ''))) FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
    const attendre2 = async (cond) => { for (let i = 0; i < 40 && !cond(); i++) { await attendre(500); } return cond(); };
    const notifs = (e) => q(`SELECT n.id FROM notification n JOIN categorie_notification c ON c.id = n.type_notification WHERE n.entity_ref = '${e.BL}' AND c.name = 'AVOIR_PRODUIT' ORDER BY n.id`).split('\n').filter(Boolean);
    const wa = (e) => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', w.client_id, w.statut, w.repli_sms) ORDER BY w.client_id), '') FROM whatsapp_message w JOIN notification n ON n.id = w.notification_id WHERE n.entity_ref = '${e.BL}'`);
    const decisions = (e) => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', a.canal, a.mode, IFNULL(TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))), '-')) ORDER BY a.notification_id), '') FROM avoir_envoi a LEFT JOIN t_user u ON u.lg_USER_ID = a.utilisateur_id WHERE a.bon_id = '${e.BL}'`);
    const pied = () => p.evaluate(() => { const w = Ext.ComponentQuery.query('avoirsbonfenetre')[0], z = w && w.getEl().dom.querySelector('.va-envoi');
      return z ? { texte: z.textContent.replace(/\s+/g, ' ').trim(), boutons: Array.from(z.querySelectorAll('button')).map((x) => x.textContent.trim()),
        debordement: (() => { const pd = w.getEl().dom.querySelector('.vc-pied'); return pd ? pd.scrollWidth > pd.clientWidth + 1 : true; })() } : null; });
    const apiEnvoi = (e) => p.evaluate((bl) => fetch('../api/v1/avoirs-bon/' + encodeURIComponent(bl) + '/envoi').then((r) => r.json()), e.BL);

    /* entree en stock jusqu'a la fenetre des avoirs ; « fermer » : apres le travail dans la fenetre */
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
      await p.waitForTimeout(1500);
    };
    const fermer = async () => {
      await p.click('.vc-pied [data-action=fermer]');
      if (await attendreMessage(p, 'impression des entrées', 30000)) { await repondre(p, 'no'); }
      if (await attendreMessage(p, 'imprimer les étiquettes', 20000)) { await repondre(p, 'no'); }
      await p.waitForTimeout(500);
    };
    const comparerPied = async (titre, e, attenduTexte) => {
      const pd = await pied(), api = await apiEnvoi(e), bs = decisions(e);
      const dernier = (api.envois || [])[api.envois.length - 1] || {};
      const bsDernier = bs ? bs.split(',').pop().split('|') : [];
      ok(titre + ' : pied = API = base (canal, mode, utilisateur)', pd && attenduTexte.test(pd.texte) && dernier.canal === bsDernier[0] && dernier.mode === bsDernier[1]
        && (dernier.utilisateur || '-') === bsDernier[2] && pd.texte.includes(dernier.utilisateur || '') && !pd.debordement, JSON.stringify(pd) + ' / ' + JSON.stringify(dernier) + ' / ' + bs);
    };

    /* 1. SMS par defaut ; Annuler ; puis WhatsApp a la main */
    let e = ESSAIS[0];
    exec(`UPDATE t_parameters SET str_VALUE = '${e.canal}' WHERE str_KEY = 'KEY_SMS_AVOIR_CANAL'; UPDATE t_parameters SET str_VALUE = '${e.immediat}' WHERE str_KEY = 'KEY_SMS_AVOIR_IMMEDIAT';`);
    ouvrir(e.ventes);
    await entrer(e);
    ok('1. Rien ne part à l\'entrée en stock elle-même (2 messages préparés, aucun SMS, aucun WhatsApp, aucune décision)', notifs(e).length === 2 && recus.length === 0 && wa(e) === '' && decisions(e) === '',
      notifs(e).length + ' / ' + recus.length + ' / ' + wa(e) + ' / ' + decisions(e));
    let pd = await pied();
    ok('1. Bouton « Envoyer aux clients (2) » dans le pied de la fenêtre', pd && pd.boutons.join('/') === 'Envoyer aux clients (2)', JSON.stringify(pd));
    await p.click('.va-envoi [data-action=envoyer]');
    pd = await pied();
    ok('1. Clic : le choix s\'affiche dans le pied (SMS / WhatsApp / Annuler), sans fenêtre surgissante', pd && pd.boutons.join('/') === 'SMS/WhatsApp/Annuler'
      && await p.evaluate(() => Ext.ComponentQuery.query('messagebox').filter((m) => m.isVisible()).length) === 0, JSON.stringify(pd));
    await p.click('.va-envoi [data-action=annuler-envoi]');
    await p.waitForTimeout(800);
    pd = await pied();
    ok('1. « Annuler » : retour au bouton, rien d\'envoyé ni décidé', pd && pd.boutons.join('/') === 'Envoyer aux clients (2)' && recus.length === 0 && wa(e) === '' && decisions(e) === '', JSON.stringify(pd));
    await p.click('.va-envoi [data-action=envoyer]');
    const [rManuel] = await Promise.all([p.waitForResponse((r) => /\/envoyer\?mode=MANUEL&canal=WHATSAPP/.test(r.url()), { timeout: 30000 }), p.click('.va-envoi [data-action=envoi-whatsapp]')]);
    const oManuel = await rManuel.json();
    await attendre2(() => wa(e).split(',').filter(Boolean).length === 2);
    await p.waitForFunction(() => { const z = document.querySelector('.va-envoi'); return z && /Envoyé par/.test(z.textContent); }, null, { timeout: 30000 });
    ok('1. WhatsApp à la main : 2 messages envoyés (C1, C3, simulés), 2 décisions MANUEL WHATSAPP au nom de l\'utilisateur', oManuel.envoyes === 2
      && wa(e) === `${PFX}-C1|SIMULE|0,${PFX}-C3|SIMULE|0` && decisions(e) === `WHATSAPP|MANUEL|${nomUtilisateur},WHATSAPP|MANUEL|${nomUtilisateur}`, JSON.stringify(oManuel) + ' / ' + wa(e) + ' / ' + decisions(e));
    await comparerPied('1. Après l\'envoi', e, /^Envoyé par WhatsApp/);
    pd = await pied();
    ok('1. Plus de bouton d\'envoi (tout est parti)', pd && pd.boutons.length === 0, JSON.stringify(pd));
    await fermer();
    await attendre(3000);
    ok('1. Fermeture après un envoi à la main : rien ne repart (aucun SMS, toujours 2 WhatsApp, 2 décisions)', recus.length === 0 && wa(e).split(',').length === 2 && decisions(e).split(',').length === 2, recus.length + ' / ' + wa(e));
    servir(e.ventes);

    /* 2. WhatsApp par defaut, rien a la main : a la fermeture */
    e = ESSAIS[1];
    exec(`UPDATE t_parameters SET str_VALUE = '${e.canal}' WHERE str_KEY = 'KEY_SMS_AVOIR_CANAL';`);
    ouvrir(e.ventes);
    await entrer(e);
    pd = await pied();
    ok('2. Avant fermeture : rien n\'est parti ; l\'info-bulle annonce l\'envoi WhatsApp à la fermeture', wa(e) === '' && decisions(e) === '' && pd && pd.boutons.join('/') === 'Envoyer aux clients (1)'
      && /fermeture par WhatsApp/.test(await p.getAttribute('.va-envoi [data-action=envoyer]', 'data-qtip')), JSON.stringify(pd));
    await fermer();
    await attendre2(() => wa(e) !== '');
    await attendre(1500);
    ok('2. Fermeture : WhatsApp par défaut, C2 le refuse (échec), aucun SMS ; décision AUTO WHATSAPP', wa(e) === `${PFX}-C2|ECHEC|0` && recus.length === 0
      && decisions(e) === `WHATSAPP|AUTO|${nomUtilisateur}`, wa(e) + ' / ' + recus.length + ' / ' + decisions(e));
    servir(e.ventes);

    /* 3. SMS a la main */
    e = ESSAIS[2];
    exec(`UPDATE t_parameters SET str_VALUE = '${e.canal}' WHERE str_KEY = 'KEY_SMS_AVOIR_CANAL';`);
    ouvrir(e.ventes);
    await entrer(e);
    await p.click('.va-envoi [data-action=envoyer]');
    await Promise.all([p.waitForResponse((r) => /\/envoyer\?mode=MANUEL&canal=SMS/.test(r.url()), { timeout: 30000 }), p.click('.va-envoi [data-action=envoi-sms]')]);
    await attendre2(() => recus.length >= 1);
    await p.waitForFunction(() => { const z = document.querySelector('.va-envoi'); return z && /Envoyé par/.test(z.textContent); }, null, { timeout: 30000 });
    ok('3. SMS à la main : un SMS au numéro de C4, aucun WhatsApp, décision MANUEL SMS', recus.length === 1 && recus[0].to === '2250100990304' && wa(e) === ''
      && decisions(e) === `SMS|MANUEL|${nomUtilisateur}`, JSON.stringify(recus.map((r) => r.to)) + ' / ' + decisions(e));
    await comparerPied('3. Après l\'envoi', e, /^Envoyé par SMS/);
    await fermer();
    await attendre(3000);
    ok('3. Fermeture : rien ne repart (toujours un SMS)', recus.length === 1, recus.length);
    servir(e.ventes);

    /* 4. SMS sans envoi immediat : a la fermeture rien ne part (comme avant) */
    e = ESSAIS[3];
    exec(`UPDATE t_parameters SET str_VALUE = '${e.canal}' WHERE str_KEY = 'KEY_SMS_AVOIR_CANAL'; UPDATE t_parameters SET str_VALUE = '${e.immediat}' WHERE str_KEY = 'KEY_SMS_AVOIR_IMMEDIAT';`);
    ouvrir(e.ventes);
    await entrer(e);
    ok('4. Info-bulle : sans envoi ici, SMS au prochain passage planifié', /passage planifié/.test(await p.getAttribute('.va-envoi [data-action=envoyer]', 'data-qtip') || ''));
    await fermer();
    await attendre(3000);
    const api4 = await apiEnvoi(e);
    ok('4. Fermeture : aucun envoi, aucune décision ; le message reste « à envoyer » pour le passage planifié', recus.length === 1 && wa(e) === '' && decisions(e) === '' && api4.aEnvoyer === 1
      && q(`SELECT n.statut FROM notification n WHERE n.id = '${notifs(e)[0]}'`) === 'NOT_SEND', JSON.stringify(api4));
    servir(e.ventes);

    /* 5. WhatsApp puis SMS : repli */
    e = ESSAIS[4];
    exec(`UPDATE t_parameters SET str_VALUE = '${e.canal}' WHERE str_KEY = 'KEY_SMS_AVOIR_CANAL'; UPDATE t_parameters SET str_VALUE = '${e.immediat}' WHERE str_KEY = 'KEY_SMS_AVOIR_IMMEDIAT';`);
    ouvrir(e.ventes);
    await entrer(e);
    await fermer();
    await attendre2(() => recus.length >= 2);
    await attendre(1500);
    ok('5. Fermeture : WhatsApp refusé par C2 (repli noté), repli SMS au numéro de C2 ; décision AUTO SMS_WHATSAPP', wa(e) === `${PFX}-C2|ECHEC|1` && recus.length === 2 && recus[1].to === '2250100990302'
      && decisions(e) === `SMS_WHATSAPP|AUTO|${nomUtilisateur}`, wa(e) + ' / ' + JSON.stringify(recus.map((r) => r.to)) + ' / ' + decisions(e));
    servir(e.ventes);

    /* bilan */
    const bilan = ESSAIS.map((x) => [notifs(x).length, wa(x).split(',').filter(Boolean).length, decisions(x).split(',').filter(Boolean).length].join('/')).join(' ; ');
    ok('Bilan par bon (messages d\'avoir / WhatsApp / décisions) : 2/2/2 ; 1/1/1 ; 1/0/1 ; 1/0/0 ; 2/1/1 et 2 SMS au total', bilan === '2/2/2 ; 1/1/1 ; 1/0/1 ; 1/0/0 ; 2/1/1' && recus.length === 2, bilan + ' ; ' + recus.length + ' SMS');
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Exécution sans exception', false, x && x.stack);
  } finally {
    if (b) { await b.close(); }
    serveur.close();
    try { remettre(); } catch (x) { console.log('nettoyage : ' + x.message); }
    ok('Nettoyage : stocks, paramètres et fournisseurs SMS remis, données d\'essai retirées (avoir_envoi compris)', stocks() === stockAvant
      && PARAMS.every((k) => q(`SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${k}'), '#ABSENT#')`) === avant[k])
      && q("SELECT GROUP_CONCAT(CONCAT_WS(':', code, actif + 0, en_vigueur + 0) ORDER BY code) FROM sms_fournisseur") === fournisseurs0
      && q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE '${PFX}-C%'`) === '0' && q(`SELECT COUNT(*) FROM notification WHERE entity_ref LIKE '${PFX}%'`) === '0'
      && q(`SELECT COUNT(*) FROM avoir_envoi WHERE bon_id LIKE '${PFX}%'`) === '0'
      && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'e2e\\_ave\\_%'") === '0');
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
