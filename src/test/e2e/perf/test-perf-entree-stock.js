/* ENTREE EN STOCK : temps du clic sur « Oui » (confirmation de l'entree) jusqu'a la question suivante (demande du 03/11).
 *
 * Constat a verifier : « quand on clique sur valider l'entree en stock, c'est lent ».
 * Vrai chemin : menu > Bon de livraison, clic sur l'icone « Detail livraison » du bon d'essai, clic sur « ENTREE EN
 * STOCK », « Oui » aux unites gratuites, « Oui » a la confirmation : chronometre jusqu'a la question « impression des
 * entrees ». Puis « Non », « Non » (etiquettes) et retour a la liste. Les appels de plus de 500 ms sont cites.
 *
 * Jeu d'essai, sur une copie de travail seulement : un bon de LIGNES lignes (40 par defaut, produits en stock au rayon,
 * hors reserve, d'un meme grossiste), repete ESSAIS fois (2 par defaut). Tout est retire a la fin : bons, commandes,
 * lots, mouvements, journal, notifications, historique des prix ; produits, stocks et prix grossiste remis a l'identique.
 * Variables : BASE (adresse de Prestige), DB_TEST + E2E_BASE_LIBRE + MARIADB_OPTIONS (copie de travail), LIGNES, ESSAIS,
 * BUDGET_MS (3000 par defaut).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { BASE, connexion, cliquer, attendreMessage, repondre } = require('../outils/vues');

const LIGNES = Number(process.env.LIGNES || 40);
const ESSAIS = Number(process.env.ESSAIS || 2);
const BUDGET_MS = Number(process.env.BUDGET_MS || 3000);
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-e', s], { encoding: 'utf8' });

const PREFIXE = 'E2E-PERF-BL';
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste'];
const debut = q('SELECT NOW()');
/* grossiste qui a le plus de produits candidats, puis ses produits */
const CANDIDATS = " FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 0 AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 1 AND 500"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1";
const G = q('SELECT f.lg_GROSSISTE_ID' + CANDIDATS + ' AND f.lg_GROSSISTE_ID IS NOT NULL GROUP BY f.lg_GROSSISTE_ID ORDER BY COUNT(*) DESC LIMIT 1');
const PRODUITS = q(`SELECT f.lg_FAMILLE_ID${CANDIDATS} AND f.lg_GROSSISTE_ID = '${G}' ORDER BY f.lg_FAMILLE_ID LIMIT ${LIGNES}`).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const LISTE = PRODUITS.map((x) => "'" + x + "'").join(',');
const bon = (i) => ({ BL: PREFIXE + '-' + i, ORD: PREFIXE + '-ORD-' + i, REF: 'E2EPBL' + String(Date.now()).slice(-6) + i });
const BONS = [];

function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_pbl_${t}; CREATE TABLE e2e_pbl_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID IN (${LISTE});`));
}
function retirer(b) {
  exec(`DELETE FROM HMvtProduit WHERE pkey LIKE '${b.BL}-D%'; DELETE FROM MvtTransaction WHERE pkey = '${b.BL}';`
    /* etiquettes et entrees d'entrepot creees avec chaque lot (addWarehouse) */
    + `DELETE e FROM t_etiquette e JOIN t_warehouse w ON w.str_CODE_ETIQUETTE = e.str_CODE AND w.lg_FAMILLE_ID = e.lg_FAMILLE_ID`
    + ` AND ABS(TIMESTAMPDIFF(SECOND, w.dt_CREATED, e.dt_CREATED)) <= 2 WHERE w.str_REF_LIVRAISON = '${b.REF}';`
    + `DELETE FROM t_warehouse WHERE str_REF_LIVRAISON = '${b.REF}';`
    + `DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${b.REF}'; DELETE FROM notification WHERE entity_ref = '${b.BL}';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE '%${b.REF}%';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${b.BL}'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${b.BL}';`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${b.ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${b.ORD}';`);
}
function remettre() {
  BONS.forEach(retirer);
  if (!PRODUITS.length) { return; }
  const susp = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", s.lg_SUGGESTION_RESERVE_ID, "'")), "''") FROM t_suggestion_reserve s WHERE s.dt_CREATED >= '${debut}' AND s.str_ORIGINE = 'AUTOMATIQUE'`
    + ` AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID AND d.lg_FAMILLE_ID NOT IN (${LISTE}))`);
  exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID IN (${LISTE}) AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID IN (${susp});`);
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_pbl_t_famille'") === '1') {
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_pbl_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_pbl_${t};`);
    });
  }
  /* le declencheur de t_famille ecrit une ligne d'historique a chaque mise a jour, remise comprise */
  exec(`DELETE FROM t_famille_history WHERE lg_FAMILLE_ID IN (${LISTE}) AND dt_CREATED >= '${debut}';`);
}
function creer(b) {
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${b.ORD}', '${b.REF}', ${PRODUITS.length}, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${b.BL}', '${b.REF}', NOW(), SUM(2 * f.int_PAF), 0, SUM(2 * f.int_PAF), '${b.ORD}', 'enable', NOW(), NOW(), MAX(u.lg_USER_ID) FROM t_famille f, t_user u WHERE f.lg_FAMILLE_ID IN (${LISTE}) AND u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
    + ` SELECT CONCAT('${b.BL}-D', f.lg_FAMILLE_ID), '${G}', f.lg_FAMILLE_ID, '${b.BL}', 2, 0, 0, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, s.int_NUMBER_AVAILABLE`
    + ` FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID IN (${LISTE});`);
}

(async () => {
  console.log('Serveur : ' + BASE + ', base ' + DB + ', ' + PRODUITS.length + ' lignes, grossiste ' + G);
  ok('Précondition : ' + LIGNES + ' produits en stock au rayon, hors réserve, d\'un même grossiste', PRODUITS.length === LIGNES, PRODUITS.length);
  if (PRODUITS.length !== LIGNES) { process.exit(1); }
  /* la procedure de l'indicateur doit etre la version remise sur l'index (R__proc_indicateur_sugges.sql) */
  const proc = q("SELECT CONCAT_WS(' | ', p.CHARACTER_SET_NAME, r.ROUTINE_DEFINITION LIKE '%vFamille%', r.LAST_ALTERED) FROM information_schema.ROUTINES r"
    + " LEFT JOIN information_schema.PARAMETERS p ON p.SPECIFIC_SCHEMA = r.ROUTINE_SCHEMA AND p.SPECIFIC_NAME = r.ROUTINE_NAME AND p.ORDINAL_POSITION = 1"
    + " WHERE r.ROUTINE_SCHEMA = DATABASE() AND r.ROUTINE_NAME = 'proc_indicateur_sugges'");
  const flyway = q("SELECT IFNULL(MAX(CONCAT_WS(' ', installed_on, success)), 'absent') FROM flyway_schema_history WHERE script = 'R__proc_indicateur_sugges.sql'");
  ok('Procédure de l\'indicateur à jour (variables du type des colonnes)', / \| 1 \| /.test(proc), 'paramètre | à jour | modifiée : ' + proc + ' ; Flyway : ' + flyway);
  for (let i = 1; i <= ESSAIS; i++) { BONS.push(bon(i)); }
  remettre();
  sauver();
  const stockAvant = q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER_AVAILABLE) ORDER BY lg_FAMILLE_ID) FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID IN (${LISTE})`);
  const b = await ENV_E2E.lancer(chromium);
  const mesures = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
    const etat = { enVol: 0, dernier: Date.now(), appels: [] };
    p.on('request', () => { etat.enVol++; etat.dernier = Date.now(); });
    const fini = (r) => {
      etat.enVol = Math.max(0, etat.enVol - 1); etat.dernier = Date.now();
      const t = r.timing();
      if (t && t.responseEnd > 0) { etat.appels.push({ quand: Date.now(), ms: Math.round(t.responseEnd), url: r.method() + ' ' + r.url().replace(/^.*\/prestige\//, '').replace(/[?&]_dc=\d+/, '') }); }
    };
    p.on('requestfinished', fini); p.on('requestfailed', fini);
    const calme = async (limite) => {
      const fin = Date.now() + limite;
      while (Date.now() < fin) {
        if (etat.enVol === 0 && Date.now() - etat.dernier >= 400) {
          const masque = await p.evaluate(() => Array.prototype.some.call(document.querySelectorAll('.x-mask-msg'), (m) => m.offsetParent !== null)).catch(() => false);
          if (!masque) { return Date.now() - 400; }
        }
        await p.waitForTimeout(50);
      }
      throw new Error('toujours en chargement apres ' + limite + ' ms');
    };
    const lents = (depuis) => etat.appels.filter((a) => a.quand >= depuis && a.ms >= 500).map((a) => a.ms + ' ms ' + a.url.slice(0, 120)).join(' | ');

    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    for (const x of BONS) {
      creer(x);
      /* menu > Bon de livraison */
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
      let t0 = Date.now();
      await item.click();
      await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, x.BL, { timeout: 120000 });
      const liste = (await calme(120000)) - t0;

      /* icone « Detail livraison » de la ligne du bon */
      const icone = await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0], v = g.getView();
        const n = v.getNode(g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); n.scrollIntoView();
        const img = n.querySelector('img.x-action-col-0'); img.id = img.id || 'e2e-detail-bl'; return img.id; }, x.BL);
      t0 = Date.now();
      await p.click('#' + icone);
      await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('btn_enterstock').isVisible(true), null, { timeout: 120000 });
      const detail = (await calme(120000)) - t0;

      await cliquer(p, '#btn_enterstock');
      if (!await attendreMessage(p, 'UNITÉS GRATUITES', 20000)) { throw new Error('question des unités gratuites absente'); }
      await repondre(p, 'yes');
      if (!await attendreMessage(p, "Confirmer l'entrée en stock", 20000)) { throw new Error('confirmation absente'); }
      t0 = Date.now();
      await repondre(p, 'yes');
      /* un produit du bon peut avoir un avoir client ouvert : la fenetre « Produits en avoir » passe alors d'abord
         (elle arrive a la reponse de l'entree, c'est la que s'arrete le chronometre) ; on la ferme */
      await p.waitForFunction(() => Ext.ComponentQuery.query('avoirsbonfenetre').length > 0
        || Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /impression des entrées/.test(m.el.dom.textContent)), null, { timeout: 600000 }).catch(() => {});
      const validation = Date.now() - t0;
      if (await p.evaluate(() => Ext.ComponentQuery.query('avoirsbonfenetre').length > 0)) {
        await p.waitForFunction(() => /vc-tableau|vc-vide/.test(Ext.ComponentQuery.query('avoirsbonfenetre')[0].getEl().dom.innerHTML), null, { timeout: 60000 });
        await p.click('.vc-pied [data-action=fermer]');
      }
      const suite = await attendreMessage(p, 'impression des entrées', 60000);
      if (!suite) { throw new Error('pas de question d\'impression après l\'entrée : ' + await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').map((m) => m.el.dom.textContent).join(' | '))); }
      const appelsValidation = lents(t0);
      const serveur = (etat.appels.filter((a) => a.quand >= t0 && /validerbl/.test(a.url))[0] || {}).ms;
      await repondre(p, 'no');
      if (!await attendreMessage(p, 'imprimer les étiquettes', 20000)) { throw new Error('question des étiquettes absente'); }
      t0 = Date.now();
      await repondre(p, 'no');
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && g.isVisible(true); }, null, { timeout: 120000 });
      const retour = (await calme(120000)) - t0;
      const m = { bon: x.BL, liste, detail, validation, serveur, retour, lents: appelsValidation };
      mesures.push(m);
      console.log(JSON.stringify(m));
      const cloture = q(`SELECT CONCAT_WS('|', b.str_STATUT, (SELECT COUNT(*) FROM HMvtProduit h WHERE h.pkey LIKE '${x.BL}-D%'), (SELECT COUNT(*) FROM t_lot l WHERE l.str_REF_LIVRAISON = '${x.REF}'),`
        + ` (SELECT COUNT(*) FROM HMvtProduit h WHERE h.createdAt >= '${debut}'), (SELECT GROUP_CONCAT(DISTINCT h.pkey) FROM HMvtProduit h WHERE h.createdAt >= '${debut}')) FROM t_bon_livraison b WHERE b.lg_BON_LIVRAISON_ID = '${x.BL}'`);
      ok('Le bon ' + x.BL + ' est clôturé, ses ' + LIGNES + ' lignes entrées', cloture.startsWith('is_Closed|' + LIGNES + '|'), cloture);
    }
    mesures.forEach((m) => ok('Entrée en stock de ' + LIGNES + ' lignes (' + m.bon + ') : du « Oui » à la question suivante dans le budget', m.validation <= BUDGET_MS,
      m.validation + ' ms (validerbl ' + m.serveur + ' ms), budget ' + BUDGET_MS + ' ms ; liste ' + m.liste + ', détail ' + m.detail + ', retour ' + m.retour + (m.lents ? ' ; lents : ' + m.lents : '')));
    ok('Aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs.slice(0, 3)));
  } catch (e) {
    ok('Le test va jusqu au bout', false, String(e && e.stack).slice(0, 600));
  } finally {
    await b.close();
    remettre();
    const stockApres = q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER_AVAILABLE) ORDER BY lg_FAMILLE_ID) FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID IN (${LISTE})`);
    ok('Données d\'essai retirées, stocks remis', stockApres === stockAvant
      && q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE '${PREFIXE}%'`) === '0'
      && q(`SELECT COUNT(*) FROM HMvtProduit WHERE pkey LIKE '${PREFIXE}%'`) === '0'
      && q("SELECT COUNT(*) FROM t_warehouse WHERE str_REF_LIVRAISON LIKE 'E2EPBL%'") === '0');
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log((res.length - echecs) + '/' + res.length + ' controles respectes');
  process.exit(echecs ? 1 : 0);
})();
