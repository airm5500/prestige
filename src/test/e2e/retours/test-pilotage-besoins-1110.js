/* PILOTAGE, besoins du 11/10 (point 11), premiere partie.
 *  - onglets : une icone chacun, une pastille sur l'onglet ouvert, deplacables a la souris ; l'ordre est retenu
 *    sur le poste (rouvrir le menu le retrouve) ;
 *  - boutons de la barre avec icone ;
 *  - Synthese, Ventes : la courbe se choisit (CA TTC, CA HT, ventes, panier moyen, marge, part TP) ; Caisse :
 *    encaisse comptoir, credit, TP regle ; la courbe comparee se cache quand la grandeur n'en a pas ;
 *  - infobulle de la marge : taux de marge ;
 *  - KPI : rotation des stocks, taux de rupture (ventes ratees), evolution du panier moyen = calcul independant.
 * Jeu d'essai (retire a la fin) : une vente ratee de 3 unites aujourd'hui.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || ENV_E2E.TMP;
const nettoyer = () => q("DELETE FROM t_vente_ratee WHERE lg_VENTE_RATEE_ID LIKE 'e2e-p1110-%'");

(async () => {
  nettoyer();
  q("INSERT INTO t_vente_ratee (lg_VENTE_RATEE_ID, str_DESIGNATION, str_DESIGNATION_NORM, int_QUANTITE, bool_COMMANDE, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('e2e-p1110-1', 'ZZ ESSAI RATE', 'ZZ ESSAI RATE', 3, 0, NOW(), NOW(), 'enable')");
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (u) => p.evaluate(async (u) => JSON.parse(await (await fetch(u)).text()), u);
  const ouvrir = async () => {
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('pilotage', 'Pilotage', ''));
    /* l'onglet ouvert d'abord est le premier de l'ordre choisi */
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; const t = e && e.down('#onglets').getActiveTab();
      return t && e.stores[t.cleOnglet].mois.getCount() > 0; }, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForLoadState('networkidle'); await p.waitForTimeout(3000);
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 120000 });
    await p.evaluate(() => { try { localStorage.removeItem('prestige.pilotage.ordreOnglets'); } catch (e) { /* rien */ } });
    await ouvrir();

    /* ------------------------------------------------ onglets */
    const o = await p.evaluate(() => { const t = Ext.ComponentQuery.query('pilotage #onglets')[0], actif = t.getActiveTab().tab.getEl().dom.querySelector('.x-tab-inner');
      const icones = t.items.items.map((c) => [c.cleOnglet, /^fa-solid fa-[a-z-]+ pilotage-icone$/.test(c.iconCls), getComputedStyle(c.tab.getEl().dom.querySelector('.x-tab-icon-el'), '::before').content.length >= 3]);
      const pastille = getComputedStyle(actif, '::after');
      const autre = getComputedStyle(t.items.items[1].tab.getEl().dom.querySelector('.x-tab-inner'), '::after');
      return { n: icones.length, icones: icones.filter((x) => x[1] && x[2]).length, pastille: pastille.backgroundColor + ' ' + pastille.width, autre: autre.content,
        plugin: !!t.plugins && t.plugins.some((x) => x instanceof Ext.ux.TabReorderer), ordre: t.items.items.map((c) => c.cleOnglet).join(',') }; });
    /* 13/10 : un douzieme onglet, « Rentabilite », ajoute a la fin (rentabilite nette) */
    ok('Douze onglets (dont « À suivre » et « Rentabilité »), chacun avec son icône (dessinée)', o.n === 12 && o.icones === 12, JSON.stringify(o));
    ok('Pastille verte sur l\'onglet ouvert seulement', o.pastille === 'rgb(22, 163, 74) 8px' && (o.autre === 'none' || o.autre === 'normal'), o.pastille + ' / ' + o.autre);
    ok('Onglets déplaçables (glisser-déposer)', o.plugin, o.ordre);
    const boutons = await p.evaluate(() => ['actualiser', 'recalculer'].map((i) => { const bt = Ext.ComponentQuery.query('pilotage #barrePeriode #' + i)[0];
      return getComputedStyle(bt.getEl().dom.querySelector('.x-btn-icon-el'), '::before').content; }));
    ok('Boutons Actualiser et Recalculer avec icône', boutons.every((c) => c && c.length >= 3 && c !== 'none' && c !== 'normal'), JSON.stringify(boutons));
    /* glisser « Marge » avant « Synthese » */
    const pos = await p.evaluate(() => { const t = Ext.ComponentQuery.query('pilotage #onglets')[0]; const r = (c) => { const x = c.tab.getEl().dom.getBoundingClientRect(); return [x.x + x.width / 2, x.y + x.height / 2, x.x]; };
      return { marge: r(t.down('#onglet-marge')), synthese: r(t.down('#onglet-synthese')) }; });
    await p.mouse.move(pos.marge[0], pos.marge[1]); await p.mouse.down();
    for (let i = 1; i <= 12; i++) { await p.mouse.move(pos.marge[0] - (pos.marge[0] - pos.synthese[2] + 5) * i / 12, pos.marge[1]); await p.waitForTimeout(40); }
    await p.mouse.up(); await p.waitForTimeout(1500);
    const apres = await p.evaluate(() => ({ ordre: Ext.ComponentQuery.query('pilotage #onglets')[0].items.items.map((c) => c.cleOnglet).join(','), memo: localStorage.getItem('prestige.pilotage.ordreOnglets') }));
    ok('Glisser « Marge » en tête : l\'ordre change et il est mémorisé sur le poste', /^marge,synthese,ventes/.test(apres.ordre) && /^\["marge","synthese"/.test(apres.memo || ''), JSON.stringify(apres));
    await p.evaluate(() => Ext.ComponentQuery.query('pilotage')[0].up('panel, tabpanel') && Ext.ComponentQuery.query('pilotage')[0].destroy());
    await ouvrir();
    const rouvert = await p.evaluate(() => { const t = Ext.ComponentQuery.query('pilotage #onglets')[0]; return t.items.items.map((c) => c.cleOnglet).join(',') + ' / ouvert : ' + t.getActiveTab().cleOnglet; });
    ok('Menu rouvert : l\'ordre choisi est retrouvé, le premier onglet (Marge) ouvert', /^marge,synthese,ventes.* \/ ouvert : marge$/.test(rouvert), rouvert);
    await p.evaluate(() => { localStorage.removeItem('prestige.pilotage.ordreOnglets'); Ext.ComponentQuery.query('pilotage')[0].destroy(); });
    await ouvrir();

    /* ------------------------------------------------ choix de la courbe */
    const synth = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #courbes-synthese button').map((x) => x.text).join('|'));
    ok('Synthèse : CA TTC | CA HT | Ventes | Panier moyen | Marge | Part TP', synth === 'CA TTC|CA HT|Ventes|Panier moyen|Marge|Part TP', synth);
    const etat = (cle) => p.evaluate((cle) => { const g = Ext.ComponentQuery.query('pilotage #graphique-' + cle)[0]; return { y: g.series.getAt(0).yField, y2: g.series.getAt(1).yField,
      cache2: !!g.series.getAt(1).seriesIsHidden, axe: g.axes.getAt(0).fields.join(','), titre: Ext.ComponentQuery.query('pilotage #graphiquePanneau-' + cle)[0].title }; }, cle);
    ok('Par défaut : CA TTC (inchangé)', (await etat('synthese')).y === 'caTTC');
    await p.evaluate(() => Ext.ComponentQuery.query('pilotage #courbes-synthese #courbe-panier')[0].btnEl.dom.click());
    await p.waitForTimeout(500);
    const e1 = await etat('synthese');
    ok('« Panier moyen » : courbe et titre suivent, sans appel serveur', e1.y === 'panier' && e1.y2 === 'panierRef' && e1.titre === 'Panier moyen par mois', JSON.stringify(e1));
    await p.evaluate(() => Ext.ComponentQuery.query('pilotage #courbes-synthese #courbe-partTiersPayant')[0].btnEl.dom.click());
    await p.waitForTimeout(500);
    const e2 = await etat('synthese');
    ok('« Part TP » : pas de valeur comparée, la seconde courbe est cachée et l\'axe ne la compte pas', e2.y === 'partTiersPayant' && e2.cache2 && e2.axe === 'partTiersPayant', JSON.stringify(e2));
    const ventes = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #courbes-ventes button').length);
    ok('Ventes : même sélecteur (6 courbes)', ventes === 6, ventes);
    /* caisse */
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('pilotage #onglets')[0]; t.setActiveTab(t.down('#onglet-caisse')); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage')[0].stores.caisse.mois.getCount() > 0, null, { timeout: 120000 });
    const caisse = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #courbes-caisse button').map((x) => x.text).join('|'));
    ok('Caisse : Encaissé comptoir | Crédit | TP réglé', caisse === 'Encaissé comptoir|Crédit|TP réglé', caisse);
    await p.evaluate(() => Ext.ComponentQuery.query('pilotage #courbes-caisse #courbe-tpRegle')[0].btnEl.dom.click());
    await p.waitForTimeout(500);
    const e3 = await etat('caisse');
    ok('« TP réglé » : la courbe montre le tiers-payant réglé', e3.y === 'tpRegle' && e3.titre === 'Tiers-payant réglé, par mois', JSON.stringify(e3));
    /* marge : infobulle avec le taux */
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('pilotage #onglets')[0]; t.setActiveTab(t.down('#onglet-marge')); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage')[0].stores.marge.mois.getCount() > 0, null, { timeout: 120000 });
    await p.waitForTimeout(800);
    const bulle = await p.evaluate(() => { const g = Ext.ComponentQuery.query('pilotage #graphique-marge')[0], s = g.series.getAt(0), st = Ext.ComponentQuery.query('pilotage')[0].stores.marge.mois;
      const r = st.getAt(st.getCount() - 2); s.tooltip.renderer.call(s.tooltip, r, { series: s }); return { titre: s.tooltip.title, taux: r.get('tauxMarge') }; });
    const tauxTexte = String(bulle.taux.toFixed(1)).replace('.', ',');
    ok('Infobulle de la marge : le taux de marge du mois', new RegExp('taux de marge : <b>' + tauxTexte + ' %').test(bulle.titre), bulle.titre);

    /* ------------------------------------------------ KPI */
    const cat = await api('../api/v1/pilotage/kpis');
    ok('Catalogue : rotation, taux de rupture, évolution du panier', ['rotation', 'tauxRupture', 'evolPanier'].every((k) => cat.data.some((x) => x.cle === k)), cat.data.length);
    const k = await api('../api/v1/pilotage/onglet/kpi?axe=VS_M1&dtStart=&dtEnd=&kpis=caTTC,rotation,tauxRupture,evolPanier,panier');
    const t = {}; (k.tuiles || []).forEach((x) => { t[x.cle] = x; });
    ok('Tuiles dans l\'ordre des coches', (k.tuiles || []).map((x) => x.cle).join(',') === 'caTTC,rotation,tauxRupture,evolPanier,panier', (k.tuiles || []).map((x) => x.cle).join(','));
    const d = new Date(), deb = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
    const lignes = Number(q("SELECT COUNT(*) FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
      + " WHERE p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.lg_TYPE_VENTE_ID <> '5' AND p.dt_UPDATED >= '" + deb + "' AND p.dt_UPDATED < CURDATE() + INTERVAL 1 DAY"));
    const ratees = Number(q("SELECT COALESCE(SUM(int_QUANTITE),0) FROM t_vente_ratee WHERE str_STATUT <> 'delete' AND dt_CREATED >= '" + deb + "' AND dt_CREATED < CURDATE() + INTERVAL 1 DAY"));
    const attRupture = Math.round(ratees * 10000 / (lignes + ratees)) / 100;
    ok('Taux de rupture = quantités ratées ÷ (lignes vendues + ratées) : ' + ratees + ' / ' + (lignes + ratees), t.tauxRupture && t.tauxRupture.valeur === attRupture && ratees >= 3, JSON.stringify(t.tauxRupture) + ' / ' + attRupture);
    const stock = Number(q("SELECT COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PAF), 0) FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID WHERE s.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 0"));
    const cout = Number(q("SELECT COALESCE(SUM(f.int_PAF * d.int_QUANTITY), 0) FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
      + " WHERE p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.lg_TYPE_VENTE_ID <> '5' AND p.dt_UPDATED >= '" + deb + "' AND p.dt_UPDATED < CURDATE() + INTERVAL 1 DAY"));
    const attRot = cout * 365 / d.getDate() / stock;
    ok('Rotation = coût d\'achat des ventes ramené à un an ÷ valeur du stock (à 0,02 près)', t.rotation && Math.abs(t.rotation.valeur - attRot) <= 0.02 && t.rotation.reference !== undefined, t.rotation && t.rotation.valeur + ' / ' + attRot.toFixed(3));
    const pan = t.panier || {};
    const attEvo = pan.reference ? Math.round((pan.valeur - pan.reference) / pan.reference * 10000) / 100 : 0;
    ok('Évolution du panier = (panier − panier comparé) ÷ panier comparé', t.evolPanier && Math.abs(t.evolPanier.valeur - attEvo) <= 0.05, (t.evolPanier && t.evolPanier.valeur) + ' / ' + attEvo);
    const courant = (k.mois || []).find((x) => x.mois === deb.slice(0, 7));
    ok('Mois en cours : sa rotation se calcule sur les jours écoulés (cohérente avec la tuile du mois)', courant && Math.abs(courant.rotation - t.rotation.valeur) <= 0.02, courant && courant.rotation + ' / ' + t.rotation.valeur);
    const m = (k.mois || []).filter((x) => x.rotation !== undefined && x.tauxRupture !== undefined);
    ok('Détail mensuel : rotation, rupture et évolution du panier sur chaque mois', m.length === (k.mois || []).length && (k.mois || []).slice(1).every((x) => x.evolPanier !== undefined), m.length + '/' + (k.mois || []).length);
    /* par l'ecran : cocher les trois cases */
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('pilotage #onglets')[0]; t.setActiveTab(t.down('#onglet-kpi')); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #casesKpi checkbox').length >= 18, null, { timeout: 60000 });
    await p.evaluate(() => Ext.ComponentQuery.query('pilotage #casesKpi checkbox').filter((c) => ['rotation', 'tauxRupture', 'evolPanier'].indexOf(c.cleKpi) >= 0).forEach((c) => c.setValue(true)));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; return e.stores.kpi.tuiles.find('cle', 'tauxRupture') >= 0; }, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const ecran = await p.evaluate(() => ({ cols: Ext.ComponentQuery.query('pilotage #detail-kpi')[0].headerCt.getGridColumns().map((c) => c.text).join('|'),
      tuiles: Ext.ComponentQuery.query('pilotage')[0].stores.kpi.tuiles.collect('cle').join(','),
      val: Ext.ComponentQuery.query('pilotage')[0].stores.kpi.detail.getAt(0).get('tauxRupture') }));
    ok('Écran KPI : tuiles et colonnes ROTATION / TAUX DE RUPTURE / ÉVOLUTION DU PANIER, valeurs lues', /ROTATION DES STOCKS/.test(ecran.cols) && /TAUX DE RUPTURE/.test(ecran.cols) && /ÉVOLUTION DU PANIER MOYEN/.test(ecran.cols)
      && /rotation/.test(ecran.tuiles) && typeof ecran.val === 'number' && !isNaN(ecran.val), JSON.stringify(ecran));
    await p.screenshot({ path: SORTIE + '/pilotage-1110.png' });
    const doublons = await p.evaluate(() => { const vus = {}, d = []; document.querySelectorAll('[id]:not([id=""])').forEach((e) => { if (vus[e.id]) { d.push(e.id); } vus[e.id] = 1; }); return d; });
    ok('Aucun élément en double dans la page', doublons.length === 0, doublons.join(' | '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_vente_ratee WHERE lg_VENTE_RATEE_ID LIKE 'e2e-p1110-%'") === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
