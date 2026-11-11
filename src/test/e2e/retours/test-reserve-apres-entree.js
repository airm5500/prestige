/* SEUIL DE RESERVE ATTEINT APRES UNE ENTREE EN STOCK (retours du 13/10, point 6). Par l'ecran « Bon de livraison », admin.
 * Jeu d'essai : un produit gere en reserve (capacite maxi rayon = son stock rayon), un bon de livraison d'essai de
 * 2 unites de ce produit (commande d'essai). Par l'ecran : detail du bon, « ENTREE EN STOCK », questions habituelles
 * (unites gratuites : oui, confirmer : oui, impression : non). Ensuite :
 *  - la fenetre « Seuil de réserve atteint » montre le produit (rayon -> reserve, quantite a deplacer = 2) et la
 *    reference de la suggestion de reserve automatique ;
 *  - « Ouvrir la suggestion de réserve » ouvre « Gestion des réserves », onglet Suggestions, sur cette suggestion ;
 *  - sans produit concerne, aucune fenetre : la suite habituelle (liste des bons) reprend.
 * Retour du 31/10 : une ligne ancienne du sens inverse (reserve -> rayon, proposee, jamais traitee) est posee avant
 * l'entree ; elle est ecartee quand le produit passe dans l'autre sens : un seul mouvement par produit dans la fenetre.
 * Tout est retire : bon, commande, lots, mouvements, journaux, notifications, suggestion ; produit, stock et
 * grossiste du produit remis a l'identique.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const BL = 'E2E-RAE-BL', DET = 'E2E-RAE-BLD', ORD = 'E2E-RAE-ORD', TSF = 'E2E-RAE-TSF', SR = 'E2E-RAE-SR', SRD = 'E2E-RAE-SRD', SR2 = 'E2E-RAE-SR2', SRD2 = 'E2E-RAE-SRD2';
const REF = 'E2ERAE' + String(Date.now()).slice(-6);
const debut = q('SELECT NOW()');
/* produit actif, stock rayon positif, sans reserve deja, avec un grossiste */
const [P, G, STOCK] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.lg_GROSSISTE_ID, s.int_NUMBER_AVAILABLE) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 0 AND f.int_PRICE > 0 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 3 AND 50"
  + " AND f.lg_GROSSISTE_ID IS NOT NULL AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 1").split('|');
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste'];

function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_rae_${t}; CREATE TABLE e2e_rae_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID = '${P}';`));
}
function remettre() {
  const susp = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", s.lg_SUGGESTION_RESERVE_ID, "'")), "''") FROM t_suggestion_reserve s WHERE s.dt_CREATED >= '${debut}' AND s.str_ORIGINE = 'AUTOMATIQUE'`
    + ` AND NOT EXISTS (SELECT 1 FROM t_suggestion_reserve_detail d WHERE d.lg_SUGGESTION_RESERVE_ID = s.lg_SUGGESTION_RESERVE_ID AND d.lg_FAMILLE_ID <> '${P}')`);
  exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID IN ('${SR}', '${SR2}'); DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID IN ('${SR}', '${SR2}');`
    + `DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID IN (${susp});`
    + `DELETE FROM HMvtProduit WHERE pkey = '${DET}'; DELETE FROM MvtTransaction WHERE pkey = '${BL}';`
    + `DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${REF}'; DELETE FROM notification WHERE entity_ref = '${BL}';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE '%${REF}%';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}';`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${ORD}';`
    + `DELETE FROM t_type_stock_famille WHERE lg_TYPE_STOCK_FAMILLE_ID = '${TSF}';`);
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_rae_t_famille'") === '1') {
    /* mise a jour depuis la copie (une suppression bute sur les cles etrangeres) */
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_rae_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_rae_${t};`);
    });
  }
}

(async () => {
  remettre();
  ok('Précondition : un produit en stock au rayon, avec grossiste', !!P && !!G && Number(STOCK) >= 3, P + ' stock ' + STOCK);
  sauver();
  /* produit gere en reserve, capacite maxi rayon = stock actuel : 2 unites de plus le font deborder */
  exec(`UPDATE t_famille SET bool_RESERVE = 1, int_SEUIL_RESERVE = ${STOCK}, int_SEUIL_MINI_RAYON = 1 WHERE lg_FAMILLE_ID = '${P}';`
    + `INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, str_STATUT, int_NUMBER)`
    + ` SELECT '${TSF}', '${P}', '2', '1', 'reserve', 'reserve', NOW(), 'enable', 0 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_type_stock_famille WHERE lg_FAMILLE_ID = '${P}' AND lg_TYPE_STOCK_ID = '2' AND lg_EMPLACEMENT_ID = '1');`
    + `INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${ORD}', '${REF}', 1, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${BL}', '${REF}', NOW(), 2 * f.int_PAF, 0, 2 * f.int_PAF, '${ORD}', 'enable', NOW(), NOW(), u.lg_USER_ID FROM t_famille f, t_user u WHERE f.lg_FAMILLE_ID = '${P}' AND u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
    + ` SELECT '${DET}', '${G}', f.lg_FAMILLE_ID, '${BL}', 2, 0, 0, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, ${STOCK} FROM t_famille f WHERE f.lg_FAMILLE_ID = '${P}';`
    /* ligne ancienne du sens inverse (reserve -> rayon), stocks d'une evaluation precedente, jamais traitee */
    + `INSERT INTO t_suggestion_reserve (lg_SUGGESTION_RESERVE_ID, str_REF, str_CATEGORIE, str_ORIGINE, str_STATUT, lg_EMPLACEMENT_ID, lg_USER_CREATEUR_ID, dt_CREATED, dt_UPDATED)`
    + ` SELECT '${SR}', '${SR}', 'RAYON', 'AUTOMATIQUE', 'A_TRAITER', '1', u.lg_USER_ID, NOW(), NOW() FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_suggestion_reserve_detail (lg_SUGGESTION_RESERVE_DETAIL_ID, lg_SUGGESTION_RESERVE_ID, lg_FAMILLE_ID, int_QTE_PROPOSEE, int_QTE_RETENUE, int_QTE_DEPLACEE,`
    + ` int_STOCK_RAYON, int_STOCK_RESERVE, int_SEUIL_DECLENCHEUR, str_ETAT, dt_CREATED) VALUES ('${SRD}', '${SR}', '${P}', 3, 3, 0, 1, 9, 1, 'PROPOSEE', NOW());`
    /* retour du 04/11 : une suggestion automatique ancienne (meme sens, rayon -> reserve), encore ouverte, contient deja
       le produit ; l'entree doit creer SA suggestion et y reprendre la ligne, sans la laisser en double dans l'ancienne */
    + `INSERT INTO t_suggestion_reserve (lg_SUGGESTION_RESERVE_ID, str_REF, str_CATEGORIE, str_ORIGINE, str_STATUT, lg_EMPLACEMENT_ID, lg_USER_CREATEUR_ID, dt_CREATED, dt_UPDATED)`
    + ` SELECT '${SR2}', '${SR2}', 'RESERVE', 'AUTOMATIQUE', 'A_TRAITER', '1', u.lg_USER_ID, NOW() - INTERVAL 80 DAY, NOW() - INTERVAL 80 DAY FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_suggestion_reserve_detail (lg_SUGGESTION_RESERVE_DETAIL_ID, lg_SUGGESTION_RESERVE_ID, lg_FAMILLE_ID, int_QTE_PROPOSEE, int_QTE_RETENUE, int_QTE_DEPLACEE,`
    + ` int_STOCK_RAYON, int_STOCK_RESERVE, int_SEUIL_DECLENCHEUR, str_ETAT, dt_CREATED) VALUES ('${SRD2}', '${SR2}', '${P}', 1, 1, 0, 1, 0, 1, 'PROPOSEE', NOW() - INTERVAL 80 DAY);`);
  const ANCIENNES = q("SELECT IFNULL(GROUP_CONCAT(lg_SUGGESTION_RESERVE_ID), '') FROM t_suggestion_reserve WHERE str_ORIGINE = 'AUTOMATIQUE' AND str_STATUT IN ('A_TRAITER', 'EN_COURS')").split(',');
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message + ' @ ' + String(e.stack).split(/\r?\n/).slice(1, 4).join(' | ')));
    await p.goto((process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* liste des bons -> detail du bon d'essai */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('bonlivraisonmanager', 'Bon de livraison', ''));
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, BL, { timeout: 60000 });
    await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); }, BL);
    await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('int_NUMBER_ETIQUETTE'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    /* retour du 31/10 (point 5) : libelles du cadre etiquette (16 px gras) entiers, sans empieter sur les valeurs */
    const libelles = await p.evaluate(() => ['int_NUMBER_ETIQUETTE', 'modele_ETIQUETTE_BL', 'code_ETIQUETTE_BL'].map((id) => { const c = Ext.getCmp(id);
      const l = c.labelEl.dom, lr = l.getBoundingClientRect(), v = c.bodyEl.dom.getBoundingClientRect();
      return { id, entier: l.scrollWidth <= l.clientWidth + 1, separe: lr.left + l.scrollWidth <= v.left + 1, valeur: Math.round(v.width) }; }));
    ok('Cadre étiquette : libellés entiers, sans chevaucher leurs valeurs', libelles.every((x) => x.entier && x.separe && x.valeur >= 120), JSON.stringify(libelles));
    const repondre = async (motif, bouton) => {
      await p.waitForFunction((m) => Ext.Msg.isVisible() && new RegExp(m).test(Ext.Msg.msg.getEl().dom.innerText), motif, { timeout: 60000 });
      await p.evaluate((b) => { Ext.Msg.down('button[itemId=' + b + ']').btnEl.dom.click(); }, bouton);
      await p.waitForTimeout(300);
    };
    await p.evaluate(() => { if (!Ext.getCmp('int_NUMBER_ETIQUETTE').getValue()) { Ext.getCmp('int_NUMBER_ETIQUETTE').setValue(1); } Ext.getCmp('btn_enterstock').btnEl.dom.click(); });
    await repondre('UNITÉS GRATUITES', 'yes');
    await repondre("Confirmer l'entrée en stock", 'yes');
    await repondre('impression des entrées', 'no');
    /* demande du 28/10 (point 2) : apres « Non », la question des étiquettes est posée ; « Non » aussi */
    await repondre('imprimer les étiquettes', 'no');
    await p.waitForFunction(() => Ext.ComponentQuery.query('reserveapresentree').some((w) => w.isVisible()), null, { timeout: 30000 });
    const f = await p.evaluate(() => { const w = Ext.ComponentQuery.query('reserveapresentree')[0];
      return { titre: w.title, texte: w.getEl().dom.innerText.replace(/\s+/g, ' '), lignes: w.down('grid').getStore().getRange().map((r) => r.data), suggestion: w.suggestionId }; });
    const auto = q(`SELECT CONCAT_WS('|', s.lg_SUGGESTION_RESERVE_ID, s.str_REF, s.str_CATEGORIE, d.int_QTE_PROPOSEE) FROM t_suggestion_reserve_detail d JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID`
      + ` WHERE d.lg_FAMILLE_ID = '${P}' AND s.str_ORIGINE = 'AUTOMATIQUE' AND s.str_STATUT IN ('A_TRAITER', 'EN_COURS') ORDER BY d.dt_CREATED DESC LIMIT 1`).split('|');
    ok('Entrée en stock faite (bon clôturé, +2 au rayon)', q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === 'is_Closed'
      && Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${P}' AND lg_EMPLACEMENT_ID = '1'`)) === Number(STOCK) + 2);
    const l = f.lignes.find((x) => x.produitId === P || x.cip === q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`));
    ok('Fenêtre « Seuil de réserve atteint » : le produit, rayon → réserve, 2 à déplacer', /Seuil de réserve atteint/.test(f.titre) && l && l.categorie === 'RESERVE' && l.quantite === 2,
      JSON.stringify(f.lignes));
    const cipP = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`), duProduit = f.lignes.filter((x) => x.cip === cipP);
    ok('Un seul mouvement pour le produit : la ligne ancienne du sens inverse disparaît', duProduit.length === 1 && duProduit[0].categorie === 'RESERVE',
      JSON.stringify(duProduit.map((x) => x.categorie)));
    ok('Ligne ancienne écartée (retirée de la suggestion, avec son motif)', q(`SELECT str_ETAT FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_DETAIL_ID = '${SRD}'`) === 'SUPPRIMEE',
      q(`SELECT CONCAT_WS(' | ', str_ETAT, str_MOTIF_LIGNE) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_DETAIL_ID = '${SRD}'`));
    /* retour du 04/11 : « une suggestion par bon » : nouvelle, datee du jour, au numero du bon, avec les seuls produits du bon */
    const nouv = q(`SELECT CONCAT_WS('|', DATE(dt_CREATED) = CURDATE(), dt_CREATED >= '${debut}', IFNULL(str_COMMENTAIRE, ''), str_REF) FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = '${f.suggestion}'`).split('|');
    ok('Une suggestion par bon : nouvelle suggestion, pas une suggestion déjà ouverte', !!f.suggestion && !ANCIENNES.includes(f.suggestion) && nouv[1] === '1',
      f.suggestion + ' ; déjà ouvertes : ' + ANCIENNES.length);
    ok('Elle est datée du jour et porte le numéro du bon (' + REF + ')', nouv[0] === '1' && nouv[2].includes(REF) && f.texte.includes(REF), nouv.join(' | ') + ' / ' + f.texte);
    ok('Elle ne contient que les produits du bon', q(`SELECT COUNT(*) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_ID = '${f.suggestion}' AND lg_FAMILLE_ID <> '${P}'`) === '0');
    ok("La ligne de l'ancienne suggestion est reprise dans celle du bon (retirée de l'ancienne, avec son motif)",
      q(`SELECT str_ETAT FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_DETAIL_ID = '${SRD2}'`) === 'SUPPRIMEE'
      && /BL/.test(q(`SELECT IFNULL(str_MOTIF_LIGNE, '') FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_DETAIL_ID = '${SRD2}'`)),
      q(`SELECT CONCAT_WS(' | ', str_ETAT, str_MOTIF_LIGNE) FROM t_suggestion_reserve_detail WHERE lg_SUGGESTION_RESERVE_DETAIL_ID = '${SRD2}'`));
    ok("Le produit n'est proposé qu'une fois dans le sens rayon → réserve (lignes ouvertes)", q(`SELECT COUNT(*) FROM t_suggestion_reserve_detail d JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID`
      + ` WHERE d.lg_FAMILLE_ID = '${P}' AND s.str_CATEGORIE = 'RESERVE' AND s.str_STATUT IN ('A_TRAITER', 'EN_COURS') AND d.str_ETAT IN ('PROPOSEE', 'MODIFIEE')`) === '1');
    ok('Elle nomme la suggestion de réserve automatique où le produit est rangé', auto[2] === 'RESERVE' && f.texte.includes(auto[1]) && f.suggestion === auto[0], f.texte + ' / ' + auto.join('|'));
    /* retour du 03/11 : « elle tourne jusqu'a ne rien afficher » (Erreur / Chargement impossible) */
    const t0 = Date.now();
    const repOuvrir = p.waitForResponse((x) => /suggestion-reserve\/[^/]+\/ouvrir/.test(x.url()), { timeout: 120000 })
      .then(async (x) => { const corps = await x.text().catch(() => ''); const j = (() => { try { return JSON.parse(corps); } catch (e) { return {}; } })();
        await x.finished().catch(() => {}); const t = x.request().timing();
        return { http: x.status(), ms: Date.now() - t0, serveur: Math.round(t.responseEnd >= 0 ? t.responseEnd : t.responseStart), lignes: (j.lignes || []).length, corps: corps.slice(0, 120) }; }).catch((e) => ({ http: 0, ms: Date.now() - t0, corps: String(e).slice(0, 200) }));
    await p.locator('.x-window:has-text("Seuil de réserve atteint") a, .x-window:has-text("Seuil de réserve atteint") button').filter({ hasText: 'Ouvrir la suggestion de réserve' }).first().click();
    await p.waitForFunction(() => { const m = Ext.getCmp('reservemanagerID'); return m && m.getActiveTab() && m.getActiveTab().itemId === 'ongletSuggestions'; }, null, { timeout: 30000 }).catch(() => {});
    /* la fenetre de traitement affiche sa propre fenetre interne (win) */
    await p.waitForFunction(() => Ext.ComponentQuery.query('reservetraitementsuggestion').some((w) => w.win && w.win.isVisible()), null, { timeout: 30000 }).catch(() => {});
    const ouvert = await p.evaluate(() => { const m = Ext.getCmp('reservemanagerID'), w = Ext.ComponentQuery.query('reservetraitementsuggestion').find((x) => x.win && x.win.isVisible());
      return { onglet: m && m.getActiveTab() && m.getActiveTab().itemId, suggestion: w ? w.getSuggestionid() : null }; });
    ok('« Ouvrir la suggestion de réserve » : Gestion des réserves, onglet Suggestions, la suggestion ouverte', ouvert.onglet === 'ongletSuggestions' && ouvert.suggestion === auto[0], JSON.stringify(ouvert));
    const ouverture = await repOuvrir;
    /* retour du 03/11 : « l'onglet Suggestions demeure vide » : la suggestion automatique (creee un autre jour, le bon
       y ajoute ses produits) doit figurer dans la liste affichee par defaut */
    await p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions'); return g && !g.getStore().isLoading() && g.filtreInitialise; }, null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(800);
    const liste = await p.evaluate(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletSuggestions');
      return { ids: g.getStore().getRange().map((r) => r.get('lg_SUGGESTION_RESERVE_ID')), refs: g.getStore().getRange().map((r) => r.get('str_REF') + ' ' + r.get('str_STATUT') + ' ' + r.get('dt_CREATED')) }; });
    ok('Onglet Suggestions : la suggestion du bon est dans la liste affichée par défaut', liste.ids.includes(auto[0]) && auto[0] === f.suggestion,
      auto[1] + ' créée le ' + q(`SELECT dt_CREATED FROM t_suggestion_reserve WHERE lg_SUGGESTION_RESERVE_ID = '${auto[0]}'`) + ' ; liste : ' + JSON.stringify(liste.refs.slice(0, 5)));
    await p.waitForTimeout(1500);
    const charge = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('reservetraitementsuggestion').find((x) => x.win && x.win.isVisible());
      const g = w && w.win.down('grid');
      const erreur = Ext.ComponentQuery.query('messagebox').some((m) => m.isVisible() && /Chargement impossible/.test(m.getEl().dom.innerText));
      const vides = Array.from(document.querySelectorAll('.x-window')).filter((x) => x.offsetParent && /Aucune ligne/.test(x.innerText)).length;
      return { lignes: g ? g.getStore().getCount() : -1, erreur, vides, masque: !!document.querySelector('.x-mask-msg:not([style*="display: none"])'),
        produit: g ? (g.getStore().getRange().map((r) => r.data).filter((x) => x.int_STOCK_RAYON_ACTUEL !== undefined)) : [] };
    });
    /* stock actuel affiche a cote du stock a la creation : celui de la base, pour le produit du bon */
    const ligneP = (charge.produit || []).find((x) => x.lg_FAMILLE_ID === P);
    ok('Stock actuel du produit = stock de la base (rayon ' + (Number(STOCK) + 2) + ')', ligneP && ligneP.int_STOCK_RAYON_ACTUEL === Number(STOCK) + 2,
      ligneP ? JSON.stringify({ rayon: ligneP.int_STOCK_RAYON_ACTUEL, reserve: ligneP.int_STOCK_RESERVE_ACTUEL, proposition: ligneP.int_PROPOSITION_ACTUELLE }) : 'ligne absente');
    ok('Le serveur rend la suggestion (' + ouverture.lignes + ' lignes) en moins de 2 s : plus de « Chargement impossible »', ouverture.http === 200 && ouverture.serveur < 2000,
      ouverture.serveur + ' ms au serveur, ' + ouverture.ms + ' ms depuis le clic');
    ok('La suggestion se charge : réponse du serveur sans erreur', ouverture.http === 200, JSON.stringify(ouverture));
    ok('Ses lignes s\'affichent (au moins le produit du bon), sans « Chargement impossible »', charge.lignes >= 1 && !charge.erreur, JSON.stringify(charge) + ' ' + ouverture.ms + ' ms');
    /* fermeture comme l'utilisateur, une fois la suggestion chargee */
    await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox').find((x) => x.isVisible()); if (m) { m.close(); } });
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('reservetraitementsuggestion').find((x) => x.win && x.win.isVisible()); if (w) { w.win.close(); } });

    /* sans produit concerne : aucune fenetre, la suite part tout de suite */
    const sans = await p.evaluate(() => new Promise((ok) => { let suite = 0; testextjs.view.commandemanagement.ReserveApresEntreeFenetre.afficherPuis([], () => { suite++; });
      setTimeout(() => ok({ suite, fenetres: Ext.ComponentQuery.query('reserveapresentree').length }), 300); }));
    ok('Sans produit concerné : aucune fenêtre, la suite habituelle reprend', sans.suite === 1 && sans.fenetres === 0, JSON.stringify(sans));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
    remettre();
    ok('Données d\'essai retirées, produit remis à l\'identique', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === '0'
      && q(`SELECT CONCAT_WS('|', bool_RESERVE, int_NUMBER_AVAILABLE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID = '${P}'`) === '0|' + STOCK
      && q(`SELECT COUNT(*) FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID = '${P}' AND dt_CREATED >= '${debut}'`) === '0' && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_NAME LIKE 'e2e_rae%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
