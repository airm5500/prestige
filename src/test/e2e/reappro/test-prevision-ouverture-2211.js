/* RETOUR DU 22/11, POINT 3 : « a l'ouverture d'une suggestion ou commande en cours, les previsions des produits
 * contenus [doivent etre] calculees » (avant : « disponible au prochain recalcul »).
 *
 * Jeu d'essai (retire a la fin) : une commande en cours de 3 produits et une suggestion de 3 autres produits, produits
 * vendus de methodes variees, quantites differentes (1, 2, 5…). Un 7e produit, hors commande et hors suggestion, sert
 * de temoin.
 * Parcours :
 *  1. calcul complet (« Recalculer maintenant » de l'ecran Prévisions) : lignes de reference ;
 *  2. les lignes des 7 produits sont vieillies (calcul d'avant-hier) et celles de la commande et de la suggestion
 *     perdent leur detail du calcul (explication vide, comme les lignes calculees avant le 22/11) ;
 *  3. GESTION DES COMMANDES > Commande en cours > recherche > « Modifier » : les 3 produits sont recalcules ;
 *     rapprochement ligne par ligne avec le calcul complet (methode, prevu, ecart type, fiabilite, historique, ventes,
 *     stock, en cours, equivalents, couverture, recommande, explication) ; le temoin n'est pas touche ; aucune autre
 *     ligne n'est touchee ;
 *  4. reouverture : rien a recalculer (0 produit) ;
 *  5. icone « Prévision du produit » d'une ligne dont le detail a de nouveau ete efface : la fenetre montre le detail du
 *     calcul (valeur = prevision en base), sans le message « prochain recalcul » ;
 *  6. meme chose a l'ouverture de la suggestion (liste des suggestions > « Modifier ») ;
 *  bilan : une ligne de prevision par produit (jamais en double), commande, suggestion et stocks inchanges ; aucune
 *  fenetre surgissante ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const EMPL = '1';
const CMD = 'E2E-PO-CMD', SUGG = 'E2E-PO-SUGG', REF = 'E2E-PO-REF', SUF = String(Date.now()).slice(-6);
const COLONNES = "CONCAT_WS('|', methode, prevu_mois, ecart_type_mois, fiabilite, IFNULL(erreurs, ''), historique, ventes_12_mois, IFNULL(derniere_vente, ''), stock, en_cours, equivalents, delai_jours, IFNULL(couverture_jours, ''), recommande, IFNULL(explication, 'NULL'))";
const ligne = (f) => q(`SELECT ${COLONNES} FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '${EMPL}' AND lg_FAMILLE_ID = '${f}'`);
const ligneDate = (f) => q(`SELECT CONCAT(${COLONNES}, '#', dt_CALCUL) FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '${EMPL}' AND lg_FAMILLE_ID = '${f}'`);
const autres = (ids) => q(`SELECT MD5(GROUP_CONCAT(CONCAT_WS('#', lg_FAMILLE_ID, ${COLONNES}, dt_CALCUL) ORDER BY lg_FAMILLE_ID)) FROM t_prevision_produit
  WHERE lg_EMPLACEMENT_ID = '${EMPL}' AND lg_FAMILLE_ID NOT IN ('${ids.join("','")}')`);
const nettoyer = () => q(`DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${CMD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${CMD}';
  DELETE FROM t_suggestion_ligne_retiree WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}';
  DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'; DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}';`);
const vieillir = (ids, effacer) => q(`UPDATE t_prevision_produit SET dt_CALCUL = dt_CALCUL - INTERVAL 2 DAY${effacer ? ', explication = NULL' : ''}
  WHERE lg_EMPLACEMENT_ID = '${EMPL}' AND lg_FAMILLE_ID IN ('${ids.join("','")}')`);

(async () => {
  nettoyer();
  /* produits vendus, prevus, sans autre commande ni suggestion en cours, methodes variees */
  const libres = (methode, n, exclus) => q(`SELECT pp.lg_FAMILLE_ID FROM t_prevision_produit pp JOIN t_famille f ON f.lg_FAMILLE_ID = pp.lg_FAMILLE_ID
    WHERE pp.lg_EMPLACEMENT_ID = '${EMPL}' AND pp.methode = '${methode}' AND pp.prevu_mois > 0 AND f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{6,13}$'
    AND (SELECT COUNT(*) FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '${EMPL}') = 1
    AND NOT EXISTS (SELECT 1 FROM t_order_detail od JOIN t_order o ON o.lg_ORDER_ID = od.lg_ORDER_ID WHERE od.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND o.str_STATUT IN ('is_Process', 'passed', 'pharma'))
    AND NOT EXISTS (SELECT 1 FROM t_suggestion_order_details d JOIN t_suggestion_order so ON so.lg_SUGGESTION_ORDER_ID = d.lg_SUGGESTION_ORDER_ID WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND so.str_STATUT <> 'is_Closed')
    AND pp.lg_FAMILLE_ID NOT IN ('${exclus.join("','") || '-'}') ORDER BY pp.ventes_12_mois DESC LIMIT ${n}`).split('\n').filter(Boolean);
  const pris = [];
  for (const m of ['MOYENNE', 'SAISON', 'HOLT', 'HOLT_WINTERS', 'MOYENNE', 'SAISON', 'MOYENNE']) { pris.push(...libres(m, 1, pris)); }
  if (pris.length < 7) { pris.push(...libres('MOYENNE', 7 - pris.length, pris)); }
  const C3 = pris.slice(0, 3), S3 = pris.slice(3, 6), TEMOIN = pris[6], TOUS = pris.slice(0, 7);
  ok('Jeu d\'essai : 7 produits prévus et vendus (méthodes variées), libres de toute commande ou suggestion', pris.length >= 7 && new Set(TOUS).size === 7, TOUS.join(' '));
  if (pris.length < 7) { process.exit(1); }
  const QC = [1, 5, 2], QS = [3, 1, 4];
  const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY lg_GROSSISTE_ID LIMIT 1");
  q(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)
    VALUES ('${CMD}', '${CMD}${SUF}', 3, '${G}', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)`);
  C3.forEach((f, i) => q(`INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, prixAchat, prixUnitaire, str_STATUT, dt_CREATED, dt_UPDATED)
    VALUES ('${CMD}-${i}', '${CMD}', '${f}', '${G}', ${QC[i]}, ${QC[i] * 1000}, 1000, 2000, 1000, 2000, 'is_Process', NOW(), NOW())`));
  q(`INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${SUGG}', '${REF}${SUF}', '${G}', 'is_Process', NOW(), NOW())`);
  S3.forEach((f, i) => q(`INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE,
    int_PRICE_DETAIL, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT, b_falg) VALUES ('${SUGG}-${i}', '${SUGG}', '${G}', '${f}', ${QS[i]}, ${QS[i] * 100}, 150, 100, NOW(), NOW(), 'is_Process', 0)`));
  const pieces = () => q(`SELECT CONCAT((SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER) ORDER BY lg_FAMILLE_ID) FROM t_order_detail WHERE lg_ORDER_ID = '${CMD}'), '/',
    (SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER) ORDER BY lg_FAMILLE_ID) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '${SUGG}'), '/',
    (SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER_AVAILABLE) ORDER BY lg_FAMILLE_ID) FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '${EMPL}' AND lg_FAMILLE_ID IN ('${TOUS.join("','")}')))`);
  const pieces0 = pieces();

  const b = await ENV_E2E.lancer(chromium);
  const err = [], dialogues = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* 1. calcul complet par l'ecran Prévisions */
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Prévisions');
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysecommande').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('analysecommande')[0]; const t = a.isXType('tabpanel') ? a : a.down('tabpanel'); t.setActiveTab(t.down('#ongletTableau')); });
    await p.waitForTimeout(800);
    const [calcul] = await Promise.all([p.waitForResponse((r) => /analyse-commande\/recalculer/.test(r.url()), { timeout: 600000 }), cliquer(p, 'analysecommande #btnRecalculer')]);
    ok('Calcul complet de référence', calcul.status() === 200 && (await calcul.json()).success !== false, calcul.status());
    const reference = {};
    TOUS.forEach((f) => { reference[f] = ligne(f); });
    ok('Référence : chaque produit a sa ligne avec le détail du calcul', TOUS.every((f) => reference[f] && !reference[f].endsWith('|NULL')), TOUS.map((f) => f + ' ' + (reference[f] || '').slice(0, 30)).join(' / '));

    /* 2. lignes vieillies ; detail efface pour la commande et la suggestion */
    vieillir(TOUS, false);
    vieillir(C3.concat(S3), true);
    const temoin0 = ligneDate(TEMOIN), suggAvant = S3.map(ligneDate), autres0 = autres(TOUS);

    /* 3. ouverture de la commande en cours par l'ecran */
    const actualisations = [];
    p.on('response', (r) => { if (/analyse-commande\/actualiser/.test(r.url())) { actualisations.push(r); } });
    const ouvrirCommande = async () => {
      await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Commande en cours');
      await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').some((x) => x.isVisible(true)), null, { timeout: 30000 });
      await p.waitForTimeout(800);
      const champ = p.locator('#rechecher-inputEl');
      await champ.click(); await champ.fill(''); await p.keyboard.type(CMD + SUF, { delay: 15 }); await p.keyboard.press('Enter');
      const rangee = p.locator('.x-grid-row').filter({ visible: true, hasText: CMD + SUF }).first();
      await rangee.waitFor({ timeout: 30000 });
      const n = actualisations.length;
      await rangee.locator('img[data-qtip="Modifier"]').click();
      await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === 3; }, null, { timeout: 30000 });
      const t0 = Date.now();
      while (actualisations.length === n && Date.now() - t0 < 30000) { await p.waitForTimeout(250); }
      const r = actualisations[n];
      return r ? { http: r.status(), corps: await r.json().catch(() => ({})) } : null;
    };
    const a1 = await ouvrirCommande();
    ok('Ouverture de la commande en cours : les prévisions de ses 3 produits sont recalculées', !!a1 && a1.http === 200 && a1.corps.success === true && a1.corps.produits === 3, JSON.stringify(a1));
    const ecartsC = C3.filter((f) => ligne(f) !== reference[f]);
    ok('Rapprochement : chaque ligne recalculée = ligne du calcul complet (méthode, prévu, historique, stock, en cours, recommandé, détail…)', ecartsC.length === 0,
      ecartsC.map((f) => f + ' : ' + reference[f].slice(0, 120) + ' ≠ ' + ligne(f).slice(0, 120)).join(' / '));
    ok('… calculées aujourd\'hui', Number(q(`SELECT COUNT(*) FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '${EMPL}' AND lg_FAMILLE_ID IN ('${C3.join("','")}') AND dt_CALCUL >= CURDATE()`)) === 3);
    ok('Le témoin hors commande et les produits de la suggestion ne sont pas touchés', ligneDate(TEMOIN) === temoin0 && JSON.stringify(S3.map(ligneDate)) === JSON.stringify(suggAvant));
    ok('Aucune autre ligne de prévision touchée', autres(TOUS) === autres0);

    /* 4. reouverture : rien a refaire */
    await cliquer(p, '#btn_cancel').catch(() => {});
    await p.waitForTimeout(800);
    const a2 = await ouvrirCommande();
    ok('Réouverture : rien à recalculer (0 produit)', !!a2 && a2.corps.success === true && a2.corps.produits === 0, JSON.stringify(a2));

    /* 5. fenetre d'un produit dont le detail a ete efface : detail refait a l'ouverture de la fenetre */
    /* produit de methode Holt ou Holt-Winters : le detail de la moyenne et de la saison se refait a la lecture ; c'est
     * pour Holt que la fenetre disait « disponible au prochain recalcul » */
    const F = C3.find((f) => /^HOLT/.test(reference[f])) || C3[2];
    ok('Fenêtre : produit de la commande calculé par Holt ou Holt-Winters', /^HOLT/.test(reference[F]), reference[F].slice(0, 20));
    vieillir([F], true);
    /* la ligne garde son identifiant (ExtJS s'en sert pour retrouver l'enregistrement au clic) : on la vise par son rang */
    const cible = await p.evaluate((f) => { const g = Ext.getCmp('gridpanelID'); const i = g.getStore().findBy((r) => r.get('lg_FAMILLE_ID') === f);
      const n = g.getView().getNode(i); return n ? { i, sel: '#' + g.getView().getEl().dom.id + ' [data-recordindex="' + n.getAttribute('data-recordindex') + '"]' } : null; }, F);
    const rang = cible ? cible.i : -1;
    const [repProduit] = await Promise.all([p.waitForResponse((r) => /analyse-commande\/produit\//.test(r.url()), { timeout: 60000 }).catch(() => null),
      p.locator(cible.sel + ' img[data-qtip^="Prévision du produit"]').first().click()]);
    ok('Icône « Prévision du produit » : la fiche du produit est demandée au serveur', !!repProduit && repProduit.status() === 200, repProduit ? repProduit.status() : 'aucune requête');
    await p.waitForFunction(() => Ext.ComponentQuery.query('#fenPrevision').some((w) => w.isVisible() && w.body && w.body.dom.textContent.length > 50), null, { timeout: 30000 });
    await p.waitForTimeout(600);
    const fen = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenPrevision').find((x) => x.isVisible()); const d = w.body.dom;
      const e = d.querySelector('.pv-explication'); const barre = d.querySelector('rect.pv-barre-prevue');
      return { explication: e ? e.textContent.replace(/\s+/g, ' ').trim() : '', bulle: barre ? barre.getAttribute('data-qtip') || '' : '', texte: d.textContent }; });
    const prevu = String(Math.round(Number(q(`SELECT prevu_mois FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '${EMPL}' AND lg_FAMILLE_ID = '${F}'`)) * 10) / 10).replace('.', ',');
    ok(`Fenêtre du produit (ligne ${rang + 1}) : détail du calcul affiché, valeur = prévision en base (${prevu}), sans « prochain recalcul »`,
      fen.explication.endsWith('= ' + prevu + ' ⓘ détail') && /Prévu en/.test(fen.bulle) && !/prochain (re)?calcul|n'a pas pu être refait/.test(fen.texte), fen.explication);
    ok('… et la ligne est de nouveau complète en base, identique au calcul complet', ligne(F) === reference[F]);
    await p.evaluate(() => Ext.ComponentQuery.query('#fenPrevision').forEach((w) => w.close()));
    await cliquer(p, '#btn_cancel').catch(() => {});
    await p.waitForTimeout(800);

    /* 6. ouverture de la suggestion */
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.click('#rechecher-inputEl'); await p.keyboard.press('Control+A'); await p.keyboard.type(REF + SUF, { delay: 20 }); await p.keyboard.press('Enter');
    const rs = p.locator('.x-grid-row').filter({ visible: true, hasText: REF + SUF }).first();
    await rs.waitFor({ timeout: 30000 });
    const n = actualisations.length;
    await rs.locator('img[data-qtip="Modifier"], .x-action-col-icon[data-qtip="Modifier"]').first().click({ timeout: 10000 });
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelSuggestionID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    const t0 = Date.now();
    while (actualisations.length === n && Date.now() - t0 < 30000) { await p.waitForTimeout(250); }
    const a3 = actualisations[n] ? await actualisations[n].json().catch(() => ({})) : null;
    ok('Ouverture de la suggestion : les prévisions de ses 3 produits sont recalculées', !!a3 && a3.success === true && a3.produits === 3, JSON.stringify(a3));
    const ecartsS = S3.filter((f) => ligne(f) !== reference[f]);
    ok('Rapprochement suggestion : chaque ligne recalculée = ligne du calcul complet', ecartsS.length === 0, ecartsS.map((f) => f + ' : ' + reference[f].slice(0, 120) + ' ≠ ' + ligne(f).slice(0, 120)).join(' / '));
    ok('Le témoin n\'est toujours pas touché', ligneDate(TEMOIN) === temoin0);

    ok('Bilan : une seule ligne de prévision par produit (jamais en double)', q(`SELECT COUNT(*) FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '${EMPL}' AND lg_FAMILLE_ID IN ('${TOUS.join("','")}')`) === '7');
    ok('Bilan : commande, suggestion et stocks inchangés', pieces() === pieces0, pieces0 + ' -> ' + pieces());
    const boites = await p.evaluate(() => Ext.ComponentQuery.query('messagebox').filter((m) => m.isVisible()).length);
    ok('Aucune fenêtre surgissante, aucune fenêtre du navigateur', boites === 0 && dialogues.length === 0, boites + ' ' + dialogues.join(' | '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    /* le temoin retrouve sa date de calcul */
    q(`UPDATE t_prevision_produit SET dt_CALCUL = dt_CALCUL + INTERVAL 2 DAY WHERE lg_EMPLACEMENT_ID = '${EMPL}' AND lg_FAMILLE_ID = '${TEMOIN}' AND dt_CALCUL < CURDATE()`);
  }
  const k = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - k) + '/' + res.length + (k ? ' ECHEC' : ' OK'));
  process.exit(k ? 1 : 0);
})();
