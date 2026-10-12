/* PILOTAGE, besoins du 11/10 (point 11), seconde partie.
 *  - onglet « À suivre » (dernier) : tuiles (rotation, rupture, panier, ruptures de produits vendus, ventes ratees a
 *    commander, ventes a perte, peremptions), alertes, CA par emplacement et par famille (= CA de la periode),
 *    frequentation horaire avec % du CA, courbe du panier moyen ;
 *  - onglet Stock : un clic sur une tuile liste ses produits dans la page ; stock dormant sur 3/6/12/24 mois ;
 *  - KPI : recherche enregistree (par utilisateur), rappelee, supprimee ;
 *  - Comparateur : tranche horaire (2 h) en croisement par heure (memes totaux), dessin en bandes ou en courbe.
 * Jeu d'essai retire a la fin : une vente ratee non commandee ; la preference des recherches de l'admin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const PREF_AVANT = q("SELECT COUNT(*) FROM t_preference_utilisateur WHERE lg_USER_ID = '" + ADMIN + "' AND str_CLE = 'pilotage.kpi.recherches'");
const nettoyer = () => { q("DELETE FROM t_vente_ratee WHERE lg_VENTE_RATEE_ID LIKE 'e2e-p1110b-%'");
  if (PREF_AVANT === '0') { q("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + ADMIN + "' AND str_CLE = 'pilotage.kpi.recherches'"); } };

(async () => {
  nettoyer();
  q("INSERT INTO t_vente_ratee (lg_VENTE_RATEE_ID, str_DESIGNATION, str_DESIGNATION_NORM, int_QUANTITE, bool_COMMANDE, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('e2e-p1110b-1', 'ZZ ESSAI RATE B', 'ZZ ESSAI RATE B', 2, 0, NOW(), NOW(), 'enable')");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (u) => p.evaluate(async (u) => JSON.parse(await (await fetch(u)).text()), u);
  const onglet = async (cle) => {
    await p.evaluate((cle) => { const t = Ext.ComponentQuery.query('pilotage #onglets')[0]; t.setActiveTab(t.down('#onglet-' + cle)); }, cle);
    await p.waitForFunction((cle) => { const e = Ext.ComponentQuery.query('pilotage')[0]; return e.stores[cle].tuiles.getCount() > 0 && !e.down('#onglet-' + cle).getEl().isMasked(); }, cle, { timeout: 120000 }).catch(() => {});
    await p.waitForTimeout(1200);
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForLoadState('networkidle'); await p.waitForTimeout(3000);
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 120000 });
    await p.evaluate(() => { try { localStorage.removeItem('prestige.pilotage.ordreOnglets'); } catch (e) { /* rien */ } });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('pilotage', 'Pilotage', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; return e && e.stores.synthese.mois.getCount() > 0; }, null, { timeout: 120000 });

    /* ------------------------------------------------ A suivre */
    const dernier = await p.evaluate(() => { const t = Ext.ComponentQuery.query('pilotage #onglets')[0], o = t.items.last(); return o.cleOnglet + '|' + o.title + '|' + o.iconCls; });
    ok('« À suivre » : dernier onglet, avec son icône', /^asuivre\|À suivre\|fa-solid fa-bell/.test(dernier), dernier);
    const s = await api('../api/v1/pilotage/onglet/asuivre?axe=MOIS&dtStart=&dtEnd=');
    const cles = (s.tuiles || []).map((x) => x.cle).join(',');
    ok('Tuiles : rotation, rupture, panier, produits vendus en rupture, ratées à commander, ventes à perte, péremptions', cles === 'rotation,tauxRupture,evolPanier,rupturesVendus,rateesACommander,margeNegative,peremption', cles);
    const t = {}; (s.tuiles || []).forEach((x) => { t[x.cle] = x; });
    const aCommander = Number(q("SELECT COUNT(*) FROM t_vente_ratee WHERE str_STATUT = 'enable' AND bool_COMMANDE = 0"));
    ok('Ventes ratées à commander = calcul indépendant (dont la vente d\'essai)', t.rateesACommander.valeur === aCommander && aCommander >= 1, t.rateesACommander.valeur + ' / ' + aCommander);
    const rupt = Number(q("SELECT COUNT(DISTINCT f.lg_FAMILLE_ID) FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
      + " WHERE p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.dt_UPDATED >= CURDATE() - INTERVAL 90 DAY AND f.str_STATUT = 'enable'"
      + " AND NOT EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.int_NUMBER_AVAILABLE > 0)"));
    ok('Produits vendus en rupture = calcul indépendant (90 jours, stock officine à zéro)', t.rupturesVendus.valeur === rupt, t.rupturesVendus.valeur + ' / ' + rupt);
    ok('Alertes en phrases (dont les ventes ratées à commander)', (s.alertes || []).length > 0 && (s.alertes || []).some((a) => /ratée/.test(a.texte)), JSON.stringify(s.alertes).slice(0, 300));
    const somme = (l) => (l || []).reduce((x, y) => x + y.ca, 0);
    ok('CA par emplacement : ' + (s.emplacements || []).length + ' ligne(s), total = CA de la période (si 20 au plus)', (s.emplacements || []).length > 0 && ((s.emplacements || []).length === 20 || Math.abs(somme(s.emplacements) - s.caLignes) <= 1), somme(s.emplacements) + ' / ' + s.caLignes);
    ok('CA par famille : total = CA de la période (si 20 au plus)', (s.familles || []).length > 0 && ((s.familles || []).length === 20 || Math.abs(somme(s.familles) - s.caLignes) <= 1), somme(s.familles) + ' / ' + s.caLignes);
    await onglet('asuivre');
    const ecr = await p.evaluate(() => { const e = Ext.ComponentQuery.query('pilotage')[0];
      return { alertes: e.down('#suiviAlertes').getEl().dom.querySelectorAll('.pilotage-alertes li').length, empl: e.down('#suiviEmplacements').getEl().dom.querySelectorAll('tr').length,
        fam: e.down('#suiviFamilles').getEl().dom.querySelectorAll('tr').length, heures: e.storeSuiviHoraire.getCount(),
        parts: Math.round(e.storeSuiviHoraire.sum('part')), panier: e.down('#graphique-asuivre').series.getAt(0).yField }; });
    ok('Écran : alertes, tableaux emplacement et famille, fréquentation (parts = 100 %), courbe du panier', ecr.alertes === s.alertes.length && ecr.empl === s.emplacements.length + 1
      && ecr.fam === s.familles.length + 1 && ecr.heures === s.horaire.length && (ecr.heures === 0 || ecr.parts === 100) && ecr.panier === 'panier', JSON.stringify(ecr));
    const bulle = await p.evaluate(() => { const g = Ext.ComponentQuery.query('pilotage #suiviHoraire')[0], sr = g.series.getAt(0), st = Ext.ComponentQuery.query('pilotage')[0].storeSuiviHoraire;
      if (!st.getCount()) { return 'vide'; } sr.tooltip.renderer.call(sr.tooltip, st.getAt(0), { series: sr }); return sr.tooltip.title; });
    ok('Infobulle de la fréquentation : % du CA', /% du CA/.test(bulle) || bulle === 'vide', bulle);
    await p.screenshot({ path: SORTIE + '/pilotage-asuivre.png' });

    /* ------------------------------------------------ Stock : listes */
    await onglet('stock');
    const tuile = await p.evaluate(() => { const r = Ext.ComponentQuery.query('pilotage')[0].stores.stock.tuiles; return { ruptures: r.getAt(r.find('cle', 'ruptures')).get('valeur'), dormant: r.getAt(r.find('cle', 'dormant')).get('valeur') }; });
    await p.click('.pilotage-onglet-stock .pilotage-tuile[data-cle="ruptures"]');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('pilotage #listeStock')[0]; return g.isVisible() && /produit\(s\)/.test(g.title); }, null, { timeout: 60000 });
    const liste = await p.evaluate(() => { const g = Ext.ComponentQuery.query('pilotage #listeStock')[0]; return { titre: g.title, n: g.getStore().getCount(), fenetre: !!Ext.WindowManager.getActive() }; });
    const api1 = await api('../api/v1/pilotage/stock/produits?type=ruptures&mois=12');
    ok('Clic sur « Références en rupture » : liste dans la page (sans fenêtre), total = tuile', api1.total === tuile.ruptures && new RegExp('— ' + String(tuile.ruptures).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' produit').test(liste.titre)
      && liste.n === Math.min(200, api1.total) && !liste.fenetre, JSON.stringify(liste) + ' / ' + api1.total);
    const d12 = await api('../api/v1/pilotage/stock/produits?type=dormant&mois=12');
    ok('Stock dormant 12 mois : même valeur que la tuile', Math.abs(d12.valeurAchat - tuile.dormant) <= 1, d12.valeurAchat + ' / ' + tuile.dormant);
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('pilotage #dormantMois')[0]; c.setValue(3); c.fireEvent('select', c); });
    const d3 = await api('../api/v1/pilotage/stock/produits?type=dormant&mois=3');
    await p.waitForFunction(() => { const r = Ext.ComponentQuery.query('pilotage')[0].stores.stock.tuiles; const x = r.getAt(r.find('cle', 'dormant')); return x && /3 mois/.test(x.get('libelle')); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const apres = await p.evaluate(() => { const r = Ext.ComponentQuery.query('pilotage')[0].stores.stock.tuiles, x = r.getAt(r.find('cle', 'dormant')), g = Ext.ComponentQuery.query('pilotage #listeStock')[0];
      return { libelle: x.get('libelle'), valeur: x.get('valeur'), titre: g.title }; });
    ok('Stock dormant sur 3 mois : tuile et liste suivent (valeur = calcul serveur sur 3 mois)', apres.libelle === 'Stock dormant (3 mois)' && Math.abs(apres.valeur - d3.valeurAchat) <= 1 && /3 mois sans vente/.test(apres.titre), JSON.stringify(apres));
    const refus = await api('../api/v1/pilotage/stock/produits?type=xx');
    const refus2 = await api('../api/v1/pilotage/stock/produits?type=dormant&mois=5');
    ok('Refus : liste inconnue, durée hors 3/6/12/24', refus.success === false && refus2.success === false, refus.message + ' | ' + refus2.message);
    await p.screenshot({ path: SORTIE + '/pilotage-stock-liste.png' });

    /* ------------------------------------------------ KPI : recherche enregistree */
    await onglet('kpi');
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #casesKpi checkbox').length >= 18, null, { timeout: 60000 });
    await p.evaluate(() => { Ext.ComponentQuery.query('pilotage #casesKpi checkbox').forEach((c) => { c.suspendEvents(false); c.setValue(['marge', 'tauxRupture'].indexOf(c.cleKpi) >= 0); c.resumeEvents(); });
      Ext.ComponentQuery.query('pilotage #nomRechercheKpi')[0].setValue('ZZ essai marge'); });
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('pilotage #enregistrerRechercheKpi')[0].getId()));
    await p.waitForFunction(() => /enregistrée/.test(Ext.ComponentQuery.query('pilotage #messageRechercheKpi')[0].getEl().dom.textContent), null, { timeout: 20000 });
    const pref = await api('../api/v1/preferences/pilotage.kpi.recherches');
    ok('Recherche enregistrée côté serveur (par utilisateur) : nom, axe, indicateurs', Array.isArray(pref.valeur) && pref.valeur.some((r) => r.nom === 'ZZ essai marge' && r.axe === 'MOIS' && r.kpis.join(',') === 'marge,tauxRupture'), JSON.stringify(pref.valeur));
    await p.evaluate(() => Ext.ComponentQuery.query('pilotage #casesKpi checkbox').forEach((c) => { c.suspendEvents(false); c.setValue(c.cleKpi === 'caTTC'); c.resumeEvents(); }));
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('pilotage #rechercheKpi')[0]; c.setValue('ZZ essai marge'); c.fireEvent('select', c); });
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; return e.stores.kpi.tuiles.collect('cle').join(',') === 'marge,tauxRupture'; }, null, { timeout: 120000 }).catch(() => {});
    const rappel = await p.evaluate(() => ({ coches: Ext.ComponentQuery.query('pilotage #casesKpi checkbox').filter((c) => c.getValue()).map((c) => c.cleKpi).join(','),
      tuiles: Ext.ComponentQuery.query('pilotage')[0].stores.kpi.tuiles.collect('cle').join(',') }));
    ok('Rappel de la recherche : cases recochées, analyse relancée', rappel.coches === 'marge,tauxRupture' && rappel.tuiles === 'marge,tauxRupture', JSON.stringify(rappel));
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('pilotage #supprimerRechercheKpi')[0].getId()));
    await p.waitForFunction(() => /supprimée/.test(Ext.ComponentQuery.query('pilotage #messageRechercheKpi')[0].getEl().dom.textContent), null, { timeout: 20000 });
    const pref2 = await api('../api/v1/preferences/pilotage.kpi.recherches');
    ok('Suppression de la recherche', !(pref2.valeur || []).some((r) => r.nom === 'ZZ essai marge'), JSON.stringify(pref2.valeur));

    /* ------------------------------------------------ Comparateur */
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('pilotage #onglets')[0]; t.setActiveTab(t.down('#onglet-comparateur')); });
    await p.waitForTimeout(1500);
    const choisir = async (type, a, bb, tranche) => {
      await p.evaluate(([type, a, bb, tranche]) => { const barre = Ext.ComponentQuery.query('pilotage #choixComparateur')[0];
        const t = barre.down('#typeComparaison'); t.setValue(type); t.fireEvent('select', t); }, [type, a, bb, tranche]);
      await p.waitForTimeout(300);
      await p.evaluate(([type, a, bb, tranche]) => { const barre = Ext.ComponentQuery.query('pilotage #choixComparateur')[0];
        if (a) { barre.down('#objetA').setValue(a); } if (bb) { barre.down('#objetB').setValue(bb); } if (tranche) { barre.down('#trancheHoraire').setValue(tranche); }
        Ext.ComponentQuery.query('pilotage')[0].stores.comparateur.mois.removeAll(); barre.down('#comparer').el.dom.click(); }, [type, a, bb, tranche]);
      await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pilotage')[0]; return e.stores.comparateur.mois.getCount() > 0 && !e.down('#onglet-comparateur').getEl().isMasked(); }, null, { timeout: 120000 });
      await p.waitForTimeout(800);
    };
    await choisir('CROISER', 'caTTC', 'HEURE', 1);
    const h1 = await p.evaluate(() => { const st = Ext.ComponentQuery.query('pilotage')[0].stores.comparateur.mois; return { n: st.getCount(), total: Math.round(st.sum('a')), visible: Ext.ComponentQuery.query('pilotage #trancheHoraire')[0].isVisible() }; });
    ok('Croisement par heure : choix de la tranche proposé', h1.visible, JSON.stringify(h1));
    await choisir('CROISER', 'caTTC', 'HEURE', 2);
    const h2 = await p.evaluate(() => { const st = Ext.ComponentQuery.query('pilotage')[0].stores.comparateur.mois; return { n: st.getCount(), total: Math.round(st.sum('a')), lib: st.getAt(0).get('libelle') }; });
    ok('Tranche de 2 heures : libellés « 08h-10h », moins de lignes, même total', /^\d\dh-\d\dh$/.test(h2.lib) && h2.n <= Math.ceil(h1.n / 2) + 1 && Math.abs(h2.total - h1.total) <= 2, JSON.stringify(h2) + ' / ' + JSON.stringify(h1));
    const forme = (f) => p.evaluate((f) => { Ext.ComponentQuery.query('pilotage #formeComparateur #forme-' + f)[0].btnEl.dom.click();
      const g = Ext.ComponentQuery.query('pilotage #graphique-comparateur')[0]; return g.series.getAt(0).type + ':' + [].concat(g.series.getAt(0).yField).join('+'); }, f);
    ok('Croisement dessiné en courbe sur demande', (await forme('courbe')) === 'line:a');
    ok('… puis en bandes', (await forme('bandes')) === 'column:a');
    await choisir('GRANDEUR', 'caTTC', 'achatTTC');
    ok('Comparaison de deux grandeurs en bandes : A et B côte à côte', (await forme('bandes')) === 'column:a+b');
    ok('Retour en « Automatique » : les deux courbes d\'origine', (await forme('auto')) === 'line:a');
    await p.screenshot({ path: SORTIE + '/pilotage-comparateur.png' });
    const doublons = await p.evaluate(() => { const vus = {}, d = []; document.querySelectorAll('[id]:not([id=""])').forEach((e) => { if (vus[e.id]) { d.push(e.id); } vus[e.id] = 1; }); return d; });
    ok('Aucun élément en double dans la page', doublons.length === 0, doublons.join(' | '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_vente_ratee WHERE lg_VENTE_RATEE_ID LIKE 'e2e-p1110b-%'") === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
