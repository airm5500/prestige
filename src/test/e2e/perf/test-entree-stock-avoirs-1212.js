/* ENTREE EN STOCK D'UN BL ET AVIS D'AVOIR (plan du 12/11, « entree en stock lente pour 1 produit, meme 2 »).
 *
 * Constat chez appaul : PUT validerbl prend 7,2 a 7,8 s quel que soit le bon. Cause : avant l'entree, le serveur lisait
 * TOUS les avoirs non servis de la base (sans index, avec leurs ventes et leurs clients), puis ne gardait que ceux des
 * produits du bon. Correction : seuls les avoirs des produits du bon sont lus.
 *
 * Vrai chemin de l'ecran, sur une COPIE de travail (DB_TEST + E2E_BASE_LIBRE) : menu > Bon de livraison, icone
 * « Detail livraison », « ENTREE EN STOCK », « Oui » aux unites gratuites, « Oui » a la confirmation (chronometre jusqu'a
 * la fenetre « Produits en avoir »), fermeture de la fenetre, « Non » a l'impression, « Non » aux etiquettes.
 *
 * Jeu d'essai varie : un bon de 3 produits (quantites 1, 2, 3) et 4 ventes en avoir clonees de ventes de 2 clients :
 *  - S1 (client 1) : P1 avoir 2, P2 avoir 1      -> annonce au client 1 (P1 et P2, meme message) ;
 *  - S2 (client 2) : P1 avoir 1                  -> annonce au client 2 (P1) ;
 *  - S3 (client 1) : P4 avoir 1, P4 hors du bon  -> rien ;
 *  - S4 (client 2) : P3 deja servi               -> rien.
 * Controles, a chaque essai (ESSAIS bons, 2 par defaut) :
 *  - duree : de « Oui » a la fenetre des avoirs, et duree serveur de validerbl, dans le budget (BUDGET_MS, 2000) ;
 *  - rapprochement : avis en base (produit, ticket, quantite, client) = fenetre « Produits en avoir » = attendu ;
 *  - bilan : stock de chaque produit + quantite du bon, un mouvement par ligne, exactement 1 avis d'entree et 2 avis
 *    d'avoir pour ce bon, 2 destinataires, avoirs des ventes inchanges ; rien d'autre.
 * L'envoi immediat des SMS d'avoir est coupe le temps du test (KEY_SMS_AVOIR_IMMEDIAT), puis remis. Tout est retire.
 * Les noms des clients ne sont jamais lus ni affiches : seuls leurs identifiants sont compares.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { BASE, connexion, cliquer, attendreMessage, repondre } = require('../outils/vues');

const ESSAIS = Number(process.env.ESSAIS || 2);
const BUDGET_MS = Number(process.env.BUDGET_MS || 2000);
const QTES = [1, 2, 3];
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-e', s], { encoding: 'utf8' });

const PREFIXE = 'E2E-AVE-BL';
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste', 't_snapshot_famillesell'];
const debut = q('SELECT NOW()');
const CANDIDATS = " FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 0 AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 1 AND 500"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1";
const G = q('SELECT f.lg_GROSSISTE_ID' + CANDIDATS + ' AND f.lg_GROSSISTE_ID IS NOT NULL GROUP BY f.lg_GROSSISTE_ID ORDER BY COUNT(*) DESC LIMIT 1');
const P = q(`SELECT f.lg_FAMILLE_ID${CANDIDATS} AND f.lg_GROSSISTE_ID = '${G}' ORDER BY f.lg_FAMILLE_ID LIMIT 4`).split('\n').map((x) => x.trim()).filter(Boolean);
const DU_BON = P.slice(0, 3);
const LISTE = P.map((x) => "'" + x + "'").join(',');
const LISTE_BON = DU_BON.map((x) => "'" + x + "'").join(',');
const BONS = [];
const bon = (i) => ({ BL: PREFIXE + '-' + i, ORD: PREFIXE + '-ORD-' + i, REF: 'E2EAVE' + String(Date.now()).slice(-6) + i });
const VENTES = ['E2E-AVE-S1', 'E2E-AVE-S2', 'E2E-AVE-S3', 'E2E-AVE-S4'];
const TICKET = (v) => 'E2EAVE' + v.slice(-2);
const LISTE_VENTES = VENTES.map((x) => "'" + x + "'").join(',');
const SMS_AVANT = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_SMS_AVOIR_IMMEDIAT'), '#ABSENT#')");

function retirerVentes() {
  exec(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${LISTE_VENTES}); DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${LISTE_VENTES});`);
}
function retirer(b) {
  exec(`DELETE FROM HMvtProduit WHERE pkey LIKE '${b.BL}-D%'; DELETE FROM MvtTransaction WHERE pkey = '${b.BL}';`
    + `DELETE e FROM t_etiquette e JOIN t_warehouse w ON w.str_CODE_ETIQUETTE = e.str_CODE AND w.lg_FAMILLE_ID = e.lg_FAMILLE_ID`
    + ` AND ABS(TIMESTAMPDIFF(SECOND, w.dt_CREATED, e.dt_CREATED)) <= 2 WHERE w.str_REF_LIVRAISON = '${b.REF}';`
    + `DELETE FROM t_warehouse WHERE str_REF_LIVRAISON = '${b.REF}';`
    + `DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${b.REF}';`
    + `DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE entity_ref = '${b.BL}');`
    + `DELETE FROM notification WHERE entity_ref = '${b.BL}';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE '%${b.REF}%';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${b.BL}'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${b.BL}';`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${b.ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${b.ORD}';`);
}
function remettre() {
  BONS.forEach(retirer);
  retirerVentes();
  if (!P.length) { return; }
  const susp = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", s.lg_SUGGESTION_RESERVE_ID, "'")), "''") FROM t_suggestion_reserve s WHERE s.dt_CREATED >= '${debut}' AND s.str_ORIGINE = 'AUTOMATIQUE'`
    + ` AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID AND d.lg_FAMILLE_ID NOT IN (${LISTE}))`);
  exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID IN (${LISTE}) AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID IN (${susp});`);
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_ave_t_famille'") === '1') {
    SAUVE.forEach((t) => {
      if (t === 't_snapshot_famillesell') {
        exec(`DELETE FROM ${t} WHERE lg_FAMILLE_ID IN (${LISTE}); INSERT INTO ${t} SELECT * FROM e2e_ave_${t}; DROP TABLE e2e_ave_${t};`);
        return;
      }
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_ave_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_ave_${t};`);
    });
  }
  exec(`DELETE FROM t_famille_history WHERE lg_FAMILLE_ID IN (${LISTE}) AND dt_CREATED >= '${debut}';`);
  if (SMS_AVANT !== '#ABSENT#') { exec(`UPDATE t_parameters SET str_VALUE = '${SMS_AVANT}' WHERE str_KEY = 'KEY_SMS_AVOIR_IMMEDIAT'`); }
}
function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_ave_${t}; CREATE TABLE e2e_ave_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID IN (${LISTE});`));
}
/* deux ventes cloturees recentes de deux clients differents (identifiants seulement) */
function ventesModeles() {
  return q("SELECT MIN(p.lg_PREENREGISTREMENT_ID) FROM t_preenregistrement p WHERE p.dt_UPDATED >= (SELECT MAX(dt_UPDATED) - INTERVAL 30 DAY FROM t_preenregistrement)"
    + " AND p.str_STATUT = 'is_Closed' AND COALESCE(p.b_IS_CANCEL, 0) = 0 AND p.lg_CLIENT_ID IS NOT NULL AND p.lg_CLIENT_ID <> ''"
    + " AND EXISTS (SELECT 1 FROM t_client c WHERE c.lg_CLIENT_ID = p.lg_CLIENT_ID)"
    + " AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)"
    + " GROUP BY p.lg_CLIENT_ID ORDER BY p.lg_CLIENT_ID LIMIT 2").split('\n').map((x) => x.trim()).filter(Boolean);
}
/* une vente en avoir clonee : lignes [produit, quantite, servie] ; avoir = quantite - servie */
function cloner(id, modele, lignes) {
  const detail = q(`SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${modele}' LIMIT 1`);
  let s = `CREATE TEMPORARY TABLE tp AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${modele}';`
    + `UPDATE tp SET lg_PREENREGISTREMENT_ID = '${id}', str_REF = '${TICKET(id)}', str_REF_TICKET = '${TICKET(id)}', b_IS_AVOIR = 1, b_IS_CANCEL = 0, dt_UPDATED = NOW();`
    + 'INSERT INTO t_preenregistrement SELECT * FROM tp; DROP TEMPORARY TABLE tp;';
  lignes.forEach(([prod, qte, servie], i) => {
    s += `CREATE TEMPORARY TABLE td AS SELECT * FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${detail}';`
      + `UPDATE td SET lg_PREENREGISTREMENT_DETAIL_ID = '${id}-D${i}', lg_PREENREGISTREMENT_ID = '${id}', lg_FAMILLE_ID = '${prod}', int_QUANTITY = ${qte},`
      + ` int_QUANTITY_SERVED = ${servie}, int_AVOIR = ${qte - servie}, int_AVOIR_SERVED = 0, str_STATUT = 'is_Closed';`
      + 'INSERT INTO t_preenregistrement_detail SELECT * FROM td; DROP TEMPORARY TABLE td;'
      + `UPDATE t_preenregistrement_detail SET b_IS_AVOIR = 1 WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${id}-D${i}';`;
  });
  exec(s);
}
function creer(b) {
  const qte = (col) => 'CASE f.lg_FAMILLE_ID ' + DU_BON.map((x, i) => `WHEN '${x}' THEN ${QTES[i]}`).join(' ') + ' END';
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${b.ORD}', '${b.REF}', ${DU_BON.length}, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${b.BL}', '${b.REF}', NOW(), SUM(${qte()} * f.int_PAF), 0, SUM(${qte()} * f.int_PAF), '${b.ORD}', 'enable', NOW(), NOW(), MAX(u.lg_USER_ID) FROM t_famille f, t_user u WHERE f.lg_FAMILLE_ID IN (${LISTE_BON}) AND u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
    + ` SELECT CONCAT('${b.BL}-D', f.lg_FAMILLE_ID), '${G}', f.lg_FAMILLE_ID, '${b.BL}', ${qte()}, 0, 0, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, s.int_NUMBER_AVAILABLE`
    + ` FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID IN (${LISTE_BON});`);
}
const stocks = () => q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER_AVAILABLE) ORDER BY lg_FAMILLE_ID) FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID IN (${LISTE})`);
const empreinteAvoirs = () => q(`SELECT IFNULL(MD5(GROUP_CONCAT(CONCAT_WS('|', lg_PREENREGISTREMENT_DETAIL_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, b_IS_AVOIR, str_STATUT) ORDER BY lg_PREENREGISTREMENT_DETAIL_ID)), '')`
  + ` FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${LISTE_VENTES})`);
const tri = (a) => a.slice().sort();

(async () => {
  console.log('Serveur : ' + BASE + ', base ' + DB + ', grossiste ' + G + ', budget ' + BUDGET_MS + ' ms');
  const modeles = ventesModeles();
  ok('Précondition : 4 produits en stock d\'un même grossiste, 2 ventes de 2 clients à cloner', P.length === 4 && modeles.length === 2, P.length + ' produits, ' + modeles.length + ' ventes');
  if (P.length !== 4 || modeles.length !== 2) { process.exit(1); }
  for (let i = 1; i <= ESSAIS; i++) { BONS.push(bon(i)); }
  remettre();
  sauver();
  exec("UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = 'KEY_SMS_AVOIR_IMMEDIAT'");
  cloner(VENTES[0], modeles[0], [[P[0], 3, 1], [P[1], 2, 1]]);
  cloner(VENTES[1], modeles[1], [[P[0], 1, 0]]);
  cloner(VENTES[2], modeles[0], [[P[3], 1, 0]]);
  cloner(VENTES[3], modeles[1], [[P[2], 2, 2]]);
  const CLIENT = VENTES.map((v) => q(`SELECT lg_CLIENT_ID FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${v}'`));
  const NOM = Object.fromEntries(P.map((x) => [x, q(`SELECT str_NAME FROM t_famille WHERE lg_FAMILLE_ID = '${x}'`)]));
  /* attendu : par client, les lignes « produit|ticket|avoir » */
  const ATTENDU = {
    [CLIENT[0]]: tri([NOM[P[0]] + '|' + TICKET(VENTES[0]) + '|2', NOM[P[1]] + '|' + TICKET(VENTES[0]) + '|1']),
    [CLIENT[1]]: tri([NOM[P[0]] + '|' + TICKET(VENTES[1]) + '|1']),
  };
  const ATTENDU_FENETRE = tri([].concat(...Object.values(ATTENDU)));
  const avoirsAvant = empreinteAvoirs();
  const stockAvant = stocks();
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
    const appels = [];
    p.on('requestfinished', (r) => { const t = r.timing(); if (t && t.responseEnd > 0) { appels.push({ quand: Date.now(), ms: Math.round(t.responseEnd), url: r.method() + ' ' + r.url().replace(/^.*\/prestige\//, '') }); } });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    for (const x of BONS) {
      creer(x);
      const stockBon = stocks();
      const libelles = await p.evaluate(() => {
        const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'bonlivraisonmanager', true);
        return n ? { parent: n.parentNode.get('text'), entree: n.get('text') } : null;
      });
      if (!libelles) { throw new Error('menu bonlivraisonmanager absent pour ce compte'); }
      const visible = (sel) => p.locator(sel).filter({ visible: true });
      const exact = (t) => new RegExp('^\\s*' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$');
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      const deplier = async () => {
        const id = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n.placeholder && n.placeholder.isVisible() ? n.placeholder.getId() : null; });
        if (id) { await p.click('#' + id); }
        await visible('.prestige-nav .x-grid-row').first().waitFor({ timeout: 10000 });
      };
      const parent = () => visible('.prestige-nav .x-grid-row').filter({ has: p.getByText(exact(libelles.parent)) }).first();
      await deplier();
      await parent().click({ timeout: 5000 }).catch(async () => { await deplier(); await parent().click(); });
      const item = visible('.prestige-flyout-menu .x-menu-item').filter({ has: p.getByText(exact(libelles.entree)) }).first();
      await item.waitFor({ timeout: 10000 });
      await item.click();
      await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, x.BL, { timeout: 120000 });
      const icone = await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0], v = g.getView();
        const n = v.getNode(g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); n.scrollIntoView();
        const img = n.querySelector('img.x-action-col-0'); img.id = img.id || 'e2e-detail-bl'; return img.id; }, x.BL);
      await p.click('#' + icone);
      await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('btn_enterstock').isVisible(true), null, { timeout: 120000 });
      await p.waitForTimeout(800);

      await cliquer(p, '#btn_enterstock');
      if (!await attendreMessage(p, 'UNITÉS GRATUITES', 20000)) { throw new Error('question des unités gratuites absente'); }
      await repondre(p, 'yes');
      if (!await attendreMessage(p, "Confirmer l'entrée en stock", 20000)) { throw new Error('confirmation absente'); }
      const t0 = Date.now();
      await repondre(p, 'yes');
      await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('avoirsbonfenetre')[0]; return w && /vc-tableau|vc-vide/.test(w.getEl().dom.innerHTML); }, null, { timeout: 600000 });
      const validation = Date.now() - t0;
      const serveur = (appels.filter((a) => a.quand >= t0 && /validerbl/.test(a.url))[0] || {}).ms;
      /* fenetre « Produits en avoir » : produit|ticket|due, lus dans les lignes du tableau affiche */
      const fenetre = await p.evaluate(() => {
        const w = Ext.ComponentQuery.query('avoirsbonfenetre')[0];
        return (w.donnees && w.donnees.data ? w.donnees.data : []).map((l) => l.produit + '|' + l.reference + '|' + l.quantiteDue);
      });
      const affiche = await p.evaluate((refs) => { const t = Ext.ComponentQuery.query('avoirsbonfenetre')[0].getEl().dom.innerText; return refs.filter((r) => t.indexOf(r) >= 0); }, VENTES.map(TICKET));
      await p.click('.vc-pied [data-action=fermer]');
      if (!await attendreMessage(p, 'impression des entrées', 30000)) { throw new Error('pas de question d\'impression après la fenêtre des avoirs'); }
      await repondre(p, 'no');
      if (!await attendreMessage(p, 'imprimer les étiquettes', 20000)) { throw new Error('question des étiquettes absente'); }
      await repondre(p, 'no');
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && g.isVisible(true); }, null, { timeout: 120000 });

      ok(`${x.BL} : du « Oui » à la fenêtre des avoirs dans le budget`, validation <= BUDGET_MS && serveur <= BUDGET_MS, validation + ' ms à l\'écran, validerbl ' + serveur + ' ms');
      /* avis en base pour ce bon */
      const avis = q(`SELECT CONCAT_WS('#', c.name, IFNULL(nc.client_id, '-'), REPLACE(n.message, '\\n', '~')) FROM notification n JOIN categorie_notification c ON c.id = n.type_notification`
        + ` LEFT JOIN notification_client nc ON nc.notification_id = n.id WHERE n.entity_ref = '${x.BL}' ORDER BY c.name`).split('\n').filter(Boolean).map((l) => l.split('#'));
      const parType = (t) => avis.filter((a) => a[0] === t);
      ok(`${x.BL} : exactement 1 avis d'entrée en stock et 2 avis d'avoir`, parType('ENTREE_EN_STOCK').length === 1 && parType('AVOIR_PRODUIT').length === 2 && avis.length === 3,
        avis.map((a) => a[0]).join(','));
      const recus = {};
      parType('AVOIR_PRODUIT').forEach((a) => {
        const lignes = [];
        let produits = [];
        a[2].split('~').forEach((l) => {
          const m = /^-(.*)\( (\d+) \)$/.exec(l);
          if (m) { produits.push([m[1], m[2]]); return; }
          const r = /^Ref:\s+(\S+)\./.exec(l);
          if (r) { produits.forEach(([n, qte]) => lignes.push(n + '|' + r[1] + '|' + qte)); produits = []; }
        });
        recus[a[1]] = tri(lignes);
      });
      const vu = (o) => Object.keys(o).sort().map((k) => (k === CLIENT[0] ? 'client1' : k === CLIENT[1] ? 'client2' : 'autre') + '=' + o[k].join(';')).join(' / ');
      ok(`${x.BL} : avis d'avoir = attendu (bon client, produits du bon seulement, tickets et quantités)`, JSON.stringify(recus) === JSON.stringify(ATTENDU)
        || (Object.keys(recus).length === 2 && JSON.stringify(recus[CLIENT[0]]) === JSON.stringify(ATTENDU[CLIENT[0]]) && JSON.stringify(recus[CLIENT[1]]) === JSON.stringify(ATTENDU[CLIENT[1]])),
        'reçu ' + vu(recus) + ' ; attendu ' + vu(ATTENDU));
      ok(`${x.BL} : fenêtre « Produits en avoir » = avis en base = attendu`, JSON.stringify(tri(fenetre)) === JSON.stringify(ATTENDU_FENETRE)
        && JSON.stringify(tri([].concat(...Object.values(recus)))) === JSON.stringify(ATTENDU_FENETRE)
        && JSON.stringify(tri(affiche)) === JSON.stringify(tri([TICKET(VENTES[0]), TICKET(VENTES[1])])), 'fenêtre ' + tri(fenetre).join(';') + ' ; tickets affichés ' + affiche.join(','));
      /* bilan */
      const attenduStock = stockBon.split(',').map((e) => { const [id, n] = e.split(':'); const i = DU_BON.indexOf(id); return id + ':' + (Number(n) + (i >= 0 ? QTES[i] : 0)); }).join(',');
      const mvts = q(`SELECT CONCAT_WS('|', COUNT(*), IFNULL(GROUP_CONCAT(qteMvt ORDER BY lg_FAMILLE_ID), '')) FROM HMvtProduit WHERE pkey LIKE '${x.BL}-D%'`);
      ok(`${x.BL} : stock + quantité du bon (1, 2, 3), P4 inchangé, un mouvement par ligne`, stocks() === attenduStock
        && mvts === '3|' + DU_BON.slice().sort().map((id) => QTES[DU_BON.indexOf(id)]).join(','), stocks() + ' attendu ' + attenduStock + ' ; mouvements ' + mvts);
      ok(`${x.BL} : bon clôturé`, q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${x.BL}'`) === 'is_Closed');
      ok(`${x.BL} : avoirs des ventes inchangés (rien n'est servi par l'entrée)`, empreinteAvoirs() === avoirsAvant);
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs.slice(0, 3)));
  } catch (e) {
    ok('Le test va jusqu au bout', false, String(e && e.stack).slice(0, 600));
  } finally {
    await b.close();
    remettre();
    ok('Données d\'essai retirées, stocks et paramètre SMS remis', stocks() === stockAvant
      && q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE '${PREFIXE}%'`) === '0'
      && q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${LISTE_VENTES})`) === '0'
      && q(`SELECT COUNT(*) FROM notification WHERE entity_ref LIKE '${PREFIXE}%'`) === '0'
      && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'e2e\\_ave\\_%'") === '0'
      && q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_SMS_AVOIR_IMMEDIAT'), '#ABSENT#')") === SMS_AVANT);
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log((res.length - echecs) + '/' + res.length + ' controles respectes');
  process.exit(echecs ? 1 : 0);
})();
