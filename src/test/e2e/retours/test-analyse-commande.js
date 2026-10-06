/* L12 — ANALYSE SUGGESTION / COMMANDE (plan d'octobre, section 5), par l'ecran.
 *
 * 1. Menu GESTION DES COMMANDES > « Analyse Suggestion / Commande » ; « Recalculer maintenant » : un calcul trace,
 *    une prevision par produit suivi.
 * 2. Les chiffres sont recoupes par des requetes independantes : ventes mensuelles, stock rayon + reserve, quantite
 *    recommandee (formule refaite ici), taux de rupture, valeur des invendus.
 * 3. Previsions : filtres, recherche, detail d'un produit (graphique, calcul explique).
 * 4. Analyse : une suggestion d'essai (creee puis supprimee) avec une quantite aberrante, un produit en surstock, un
 *    produit indisponible chez le grossiste et un prix anormal : chaque alerte apparait sur la bonne ligne.
 * 5. Saisie absurde dans les parametres : refus propre, jamais d'erreur interne.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const q = (sql) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN', '-e', sql], { encoding: 'utf8' }).trim();

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const SUG = 'e2e-l12-' + Date.now();

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.stack || e.message).slice(0, 600)));
  const calculAvant = Number(q('SELECT COALESCE(MAX(id), 0) FROM t_prevision_calcul'));
  const get = (u) => p.evaluate(async (u) => { const r = await fetch(u); return { s: r.status, o: JSON.parse(await r.text()) }; }, u);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });

    /* ------------------------------------------------ 1. menu et calcul */
    const menu = q("SELECT CONCAT(m.str_VALUE, '|', s.str_VALUE, '|', s.P_KEY) FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID WHERE s.str_COMPOSANT = 'analysecommande'");
    ok('Menu : sous GESTION DES COMMANDES, droit P_SM_ANALYSE_COMMANDE', /COMMANDE/i.test(menu.split('|')[0]) && menu.endsWith('|Analyse Suggestion / Commande|P_SM_ANALYSE_COMMANDE'), menu);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('analysecommande', 'Analyse Suggestion / Commande', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysecommande').length, null, { timeout: 20000 });
    const onglets = await p.evaluate(() => Ext.ComponentQuery.query('analysecommande')[0].items.getRange().map((t) => t.title));
    ok('Trois onglets : Tableau, Prévisions, Analyse', onglets.join('|') === "Tableau|Prévisions|Analyse d'une suggestion / commande", onglets.join('|'));
    await p.evaluate(() => { const b = Ext.ComponentQuery.query('analysecommande #btnRecalculer')[0]; b.btnEl.dom.click(); });
    await p.waitForFunction(() => { const b = Ext.ComponentQuery.query('analysecommande #btnRecalculer')[0]; return b && !b.isDisabled(); }, null, { timeout: 300000 });
    await p.waitForTimeout(1500);
    const calc = q('SELECT CONCAT(produits, \'|\', origine, \'|\', fin IS NOT NULL) FROM t_prevision_calcul WHERE id > ' + calculAvant + ' ORDER BY id DESC LIMIT 1');
    const lignesPrev = q("SELECT COUNT(*) FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '1'");
    ok('Recalculer : calcul tracé (à la demande), une prévision par produit suivi', calc === lignesPrev + '|DEMANDE|1' && Number(lignesPrev) > 100, calc + ' / ' + lignesPrev);
    const tuiles = await p.evaluate(() => Array.from(Ext.ComponentQuery.query('analysecommande #tuiles')[0].getEl().dom.querySelectorAll('.ac-tuile')).map((t) => t.querySelector('.ac-t').textContent + '=' + t.querySelector('.ac-v').textContent));
    ok('Tableau : 5 tuiles (rupture, invendus, couverture, fiabilité, à commander)', tuiles.length === 5, tuiles.join(' ; '));

    /* ------------------------------------------------ 2. recoupements */
    const t = (await get('../api/v1/analyse-commande/tableau')).o;
    const rupt = q("SELECT CONCAT(SUM(prevu_mois >= 1), '|', SUM(prevu_mois >= 1 AND stock <= 0)) FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '1'").split('|').map(Number);
    ok('Taux de rupture = produits vendus ≥ 1/mois sans stock / produits vendus ≥ 1/mois', t.ruptures === rupt[1] && Math.abs(t.tauxRupture - Math.round(rupt[1] * 1000 / rupt[0]) / 10) < 0.01, JSON.stringify([t.tauxRupture, t.ruptures, rupt]));
    ok('Tuile taux de rupture affichée = API', tuiles[0].includes(String(t.tauxRupture).replace('.', ',')), tuiles[0]);
    const inv = Number(q("SELECT COALESCE(SUM(p.stock * f.int_PAF), 0) FROM t_prevision_produit p JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID WHERE p.lg_EMPLACEMENT_ID = '1' AND p.stock > 0 AND (p.derniere_vente IS NULL OR p.derniere_vente < CURDATE() - INTERVAL " + t.joursLente + ' DAY)'));
    ok('Valeur des invendus = stock × prix d\'achat des produits sans vente depuis ' + t.joursLente + ' j', t.valeurInvendus === inv, t.valeurInvendus + ' / ' + inv);
    /* un produit vendu regulierement : ventes du mois dernier et stock recoupes a la source */
    const echant = q("SELECT lg_FAMILLE_ID FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '1' AND ventes_12_mois > 30 ORDER BY ventes_12_mois DESC LIMIT 1 OFFSET 5");
    const pr = q("SELECT CONCAT_WS('|', historique, stock, en_cours, equivalents, delai_jours, prevu_mois, ecart_type_mois, recommande) FROM t_prevision_produit WHERE lg_FAMILLE_ID = '" + echant + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
    const hist = pr[0].split(',').map(Number);
    const moisDernier = Number(q("SELECT COALESCE(SUM(d.int_QUANTITY), 0) FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
      + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID AND u.lg_EMPLACEMENT_ID = '1' WHERE d.lg_FAMILLE_ID = '" + echant + "' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
      + " AND p.dt_UPDATED >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01') AND p.dt_UPDATED < DATE_FORMAT(CURDATE(), '%Y-%m-01')"));
    const ilYa3 = Number(q("SELECT COALESCE(SUM(d.int_QUANTITY), 0) FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
      + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID AND u.lg_EMPLACEMENT_ID = '1' WHERE d.lg_FAMILLE_ID = '" + echant + "' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
      + " AND p.dt_UPDATED >= DATE_FORMAT(CURDATE() - INTERVAL 3 MONTH, '%Y-%m-01') AND p.dt_UPDATED < DATE_FORMAT(CURDATE() - INTERVAL 2 MONTH, '%Y-%m-01')"));
    ok('Historique : ventes du mois dernier et d\'il y a 3 mois = ventes en base', hist[hist.length - 1] === moisDernier && hist[hist.length - 3] === ilYa3, JSON.stringify([hist.slice(-3), moisDernier, ilYa3]));
    const stock = Number(q("SELECT GREATEST(COALESCE((SELECT SUM(int_NUMBER_AVAILABLE) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + echant + "' AND lg_EMPLACEMENT_ID = '1'), 0), 0)"
      + " + COALESCE((SELECT SUM(GREATEST(int_NUMBER, 0)) FROM t_type_stock_famille WHERE lg_FAMILLE_ID = '" + echant + "' AND lg_EMPLACEMENT_ID = '1' AND lg_TYPE_STOCK_ID = '2'), 0)"));
    ok('Stock pris en compte = rayon + réserve', Number(pr[1]) === stock, pr[1] + ' / ' + stock);
    const couv = Number(q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_PREVISION_COUVERTURE_JOURS'"));
    const [st, ec, eq, dl, pm, et] = [1, 2, 3, 4, 5, 6].map((i) => Number(pr[i]));
    const besoin = pm / 30 * (dl + couv), secu = 1.65 * (et / Math.sqrt(30)) * Math.sqrt(Math.max(1, dl));
    const attendu = Math.max(0, Math.ceil(besoin + secu - 1e-9) - st - ec - eq);
    ok('Quantité recommandée = formule (prévision × (délai + couverture) + sécurité − stock − en cours − équivalents)', attendu === Number(pr[7]), JSON.stringify({ pm, dl, couv, et, st, ec, eq, attendu, enBase: pr[7] }));

    /* ------------------------------------------------ 3. previsions */
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('analysecommande')[0]; Array.from(a.down('#tuiles').getEl().dom.querySelectorAll('.ac-tuile'))[4].click(); });
    await p.waitForTimeout(2500);
    const prev = await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0];
      return { actif: Ext.ComponentQuery.query('analysecommande')[0].getActiveTab() === g, filtre: g.down('#filtre').getValue(), total: g.getStore().getTotalCount(), recos: g.getStore().getRange().map((r) => r.get('recommande')) }; });
    ok('Clic sur la tuile « À commander » : onglet Prévisions filtré, total = produits à commander', prev.actif && prev.filtre === 'ACOMMANDER' && prev.total === t.aCommander && prev.recos.length && prev.recos.every((x) => x > 0), JSON.stringify([prev.total, t.aCommander, prev.recos.slice(0, 5)]));
    const cip = q("SELECT f.int_CIP FROM t_famille f WHERE f.lg_FAMILLE_ID = '" + echant + "'");
    await p.evaluate((c) => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; g.down('#filtre').setValue(''); g.down('#query').setValue(c); g.getStore().loadPage(1); }, cip);
    await p.waitForTimeout(2000);
    const trouve = await p.evaluate(() => Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0].getStore().getRange().map((r) => r.get('id')));
    ok('Recherche par CIP : le produit est trouvé', trouve.includes(echant), JSON.stringify(trouve));
    await p.evaluate((id) => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0]; const r = g.getStore().getById ? g.getStore().findRecord('id', id) : null; g.fireEvent('itemclick', g.getView(), r); }, echant);
    await p.waitForTimeout(2000);
    const det = await p.evaluate(() => { const w = Ext.WindowManager.getActive(); if (!w || !w.getEl()) { return null; } const d = w.getEl().dom;
      return { titre: w.title, barres: d.querySelectorAll('svg rect').length, texte: d.textContent }; });
    ok('Détail : graphique (mois + prévision), méthodes essayées, calcul expliqué', det && det.barres === hist.length + 1 && /Méthodes essayées/.test(det.texte) && /= à commander/.test(det.texte) && det.texte.includes('− stock rayon et réserve'), det && JSON.stringify({ t: det.titre, b: det.barres, h: hist.length }));
    await p.evaluate(() => { const w = Ext.WindowManager.getActive(); if (w && w.close) { w.close(); } });

    /* ------------------------------------------------ 4. analyse d'une suggestion d'essai */
    const gros = q('SELECT lg_GROSSISTE_ID FROM t_grossiste LIMIT 1');
    /* aberrante : un produit vendu ~2/mois commande par 500 ; surstock : beaucoup de stock, peu de ventes ;
       indisponible : resultat PharmaML « NON » ; prix : 3 fois le dernier prix d'achat */
    const ab = q("SELECT lg_FAMILLE_ID FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '1' AND prevu_mois BETWEEN 1 AND 5 AND stock < 5 LIMIT 1");
    const sur = q("SELECT lg_FAMILLE_ID FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '1' AND prevu_mois > 0 AND couverture_jours > 200 AND lg_FAMILLE_ID <> '" + ab + "' LIMIT 1");
    const ind = q("SELECT lg_FAMILLE_ID FROM t_prevision_produit WHERE lg_EMPLACEMENT_ID = '1' AND prevu_mois >= 3 AND lg_FAMILLE_ID NOT IN ('" + ab + "', '" + sur + "') LIMIT 1");
    const px = q("SELECT bd.lg_FAMILLE_ID FROM t_bon_livraison_detail bd JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = bd.lg_BON_LIVRAISON_ID JOIN t_prevision_produit p ON p.lg_FAMILLE_ID = bd.lg_FAMILLE_ID AND p.lg_EMPLACEMENT_ID = '1'"
      + " WHERE b.str_STATUT = 'is_Closed' AND bd.int_PAF > 100 AND bd.lg_FAMILLE_ID NOT IN ('" + ab + "', '" + sur + "', '" + ind + "') ORDER BY b.dt_UPDATED DESC LIMIT 1");
    const dernierPx = Number(q("SELECT bd.int_PAF FROM t_bon_livraison_detail bd JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = bd.lg_BON_LIVRAISON_ID WHERE b.str_STATUT = 'is_Closed' AND bd.lg_FAMILLE_ID = '" + px + "' AND bd.int_PAF > 0 ORDER BY b.dt_UPDATED DESC LIMIT 1"));
    q("INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, dt_CREATED, dt_UPDATED, str_STATUT) VALUES ('" + SUG + "', 'E2E-L12', '" + gros + "', NOW(), NOW(), 'auto')");
    const ligne = (n, f, qte, paf) => q("INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PAF_DETAIL, dt_CREATED, dt_UPDATED, str_STATUT)"
      + " VALUES ('" + SUG + '-' + n + "', '" + SUG + "', '" + gros + "', '" + f + "', " + qte + ', ' + (paf === null ? 'NULL' : paf) + ", NOW(), NOW(), 'is_Process')");
    ligne(1, ab, 500, null); ligne(2, sur, 2, null); ligne(3, ind, 1, null); ligne(4, px, 1, dernierPx * 3);
    q("INSERT INTO t_disponibilite_produit (lg_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, str_SOURCE, lg_SOURCE_ID, str_STATUT) VALUES ('" + SUG + "-d', '" + gros + "', '" + ind + "', 'SUGGESTION', '" + SUG + "', 'NON')");
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('analysecommande')[0]; a.setActiveTab(a.down('#ongletAnalyse')); });
    await p.waitForTimeout(2000);
    await p.evaluate((id) => { const c = Ext.ComponentQuery.query('analysecommande #choix')[0]; const r = c.getStore().findRecord('cle', 'SUGGESTION|' + id); c.select(r); c.fireEvent('select', c, [r]); }, SUG);
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysecommande #ongletAnalyse')[0].getStore().getCount() === 4, null, { timeout: 30000 });
    const an = await p.evaluate(() => { const g = Ext.ComponentQuery.query('analysecommande #ongletAnalyse')[0]; const m = {};
      g.getStore().getRange().forEach((r) => { m[r.get('id')] = { q: r.get('quantite'), reco: r.get('recommande'), a: (r.get('alertes') || []).map((x) => x.code), t: (r.get('alertes') || []).map((x) => x.texte) }; });
      return { m, resume: g.down('#resumeTexte').getEl().dom.textContent, puces: g.getView().getEl().dom.querySelectorAll('.ac-puce').length }; });
    ok('Ligne à 500 : « Quantité aberrante »', an.m[ab] && an.m[ab].a.includes('ABERRANTE'), JSON.stringify(an.m[ab]));
    ok('Produit déjà couvert > 90 j : « Surstock »', an.m[sur] && an.m[sur].a.includes('SURSTOCK'), JSON.stringify(an.m[sur]));
    ok('Résultat PharmaML « NON » : « Indisponible »', an.m[ind] && an.m[ind].a.includes('INDISPONIBLE'), JSON.stringify(an.m[ind]));
    ok('Prix 3 × le dernier achat : « Prix anormal » (+200 %)', an.m[px] && an.m[px].a.includes('PRIX') && an.m[px].t.some((x) => /\+200 %/.test(x)), JSON.stringify(an.m[px]));
    ok('Résumé : 4 lignes, valeurs proposée / recommandée, puces d\'alerte affichées', /4 lignes/.test(an.resume) && /valeur proposée/.test(an.resume) && an.puces >= 4, an.resume);
    await p.evaluate(() => { Ext.ComponentQuery.query('analysecommande #seulementAlertes')[0].setValue(true); });
    const filtre = await p.evaluate(() => Ext.ComponentQuery.query('analysecommande #ongletAnalyse')[0].getStore().getRange().every((r) => (r.get('alertes') || []).length > 0));
    ok('« Lignes avec alerte seulement »', filtre);
    ok('Analyse en lecture seule : la suggestion n\'est pas modifiée', q("SELECT GROUP_CONCAT(int_NUMBER ORDER BY lg_SUGGESTION_ORDER_DETAILS_ID) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + SUG + "'") === '500,2,1,1');

    /* ------------------------------------------------ 5. saisie absurde */
    const absurdes = await Promise.all(['previsions?limit=abc&start=-5&filtre=%3Cscript%3E&query=%27%20OR%201%3D1', 'analyse?type=XYZ&id=%27', 'analyse?type=SUGGESTION&id=',
      'produit/' + encodeURIComponent("l'inexistant"), 'previsions?query=' + 'x'.repeat(3000)].map((u) => get('../api/v1/analyse-commande/' + u)));
    ok('Paramètres absurdes : réponses propres (jamais d\'erreur interne)', absurdes.every((r) => r.s === 200) && absurdes[1].o.success === false && absurdes[2].o.success === false && absurdes[3].o.success === false && absurdes[0].o.success === true,
      JSON.stringify(absurdes.map((r) => [r.s, r.o.success, r.o.message])));
    const anonyme = await (await b.newContext()).request.get('http://localhost:8080/prestige/api/v1/analyse-commande/tableau', { failOnStatusCode: false });
    ok('Sans connexion : refusé', anonyme.status() === 401 || /connect/i.test(await anonyme.text()), anonyme.status());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    q("DELETE FROM t_disponibilite_produit WHERE lg_SOURCE_ID = '" + SUG + "'");
    q("DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + SUG + "'");
    q("DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + SUG + "'");
    q('DELETE FROM t_prevision_calcul WHERE id > ' + calculAvant);
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
