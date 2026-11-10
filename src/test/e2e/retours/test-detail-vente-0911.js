/* PLAN DU 09/11, POINT 9 : VENTES TERMINEES > DETAIL D'UNE VENTE.
 *
 * Avant : les sections (Infos vente, Mode de reglements, Client, Ayant droit, Tiers payant) se chevauchaient et
 * cachaient des informations ; « au comptant », les noms du client, de l'ayant droit et du tiers payant passaient
 * sur deux lignes. Par l'ecran, en 1366 x 768 puis 1280 x 720 :
 *  - vente assurance d'essai (client, ayant droit et tiers payant aux noms longs, 3 boites, especes), ouverte par
 *    l'icone « Voir détail » de sa ligne dans Ventes terminees ;
 *  - aucune section ne chevauche la suivante, chaque champ tient sur une ligne, pas de defilement horizontal ; une
 *    valeur trop longue est raccourcie par « … » et garde son texte complet en info-bulle ;
 *  - rapprochement fenetre = base : reference, montant total, net, part client, montant et taux du tiers payant,
 *    reglement ; libelles « Prénom du client » et « Montant » ;
 *  - aucune erreur JavaScript ; jeu d'essai retire.
 */
const C = require('../audits/commun');
const { MARQUE, ok, q, exec } = C;

(async () => {
  const { b, p, api, erreurs } = await C.connecter();
  try {
    C.ouvrirCaisse();
    const tp = C.tiersPayant('DV', '1');
    exec(`UPDATE t_tiers_payant SET str_FULLNAME = 'MUTUELLE GENERALE DES AGENTS ESSAI ${MARQUE}' WHERE lg_TIERS_PAYANT_ID = '${tp}'`);
    const cl = await C.clientAssure(api, 'DETAILVENTE', [{ tp, taux: 80 }]);
    exec(`UPDATE t_client SET str_FIRST_NAME = 'ESSAI-NOM-COMPOSE-LONG' WHERE lg_CLIENT_ID = '${cl.clientId}';`
      + ` UPDATE t_ayant_droit SET str_FIRST_NAME = 'ESSAI-AYANT-DROIT-LONG' WHERE lg_AYANTS_DROITS_ID = '${cl.ayantDroitId}'`);
    const pr = C.produit(0, 40);
    const { v } = await C.venteAssurance(api).vendre(cl, [{ lien: cl.lien(tp), taux: 80, bon: 'BON-DV-1' }], pr, 3);
    const base = q(`SELECT CONCAT_WS('|', p.str_REF, p.int_PRICE, p.int_PRICE - p.int_PRICE_REMISE, p.int_CUST_PART, t.int_PRICE, t.int_PERCENT)`
      + ` FROM t_preenregistrement p JOIN t_preenregistrement_compte_client_tiers_payent t ON t.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID`
      + ` WHERE p.lg_PREENREGISTREMENT_ID = '${v}'`).split('|');
    const ref = base[0];

    for (const [w, h] of [[1366, 768], [1280, 720]]) {
      await p.setViewportSize({ width: w, height: h });
      await p.evaluate(() => { Ext.ComponentQuery.query('window').forEach((x) => { if (Ext.getClassName(x) === 'testextjs.view.vente.DetailVente') { try { x.close(); } catch (e) {} } });
        Ext.each(Ext.ComponentQuery.query('[closable=true]'), (c) => { if (c.up && c.up('tabpanel') && c.close) { try { c.close(); } catch (e) {} } });
        testextjs.app.getController('App').onLoadNewComponent('ventemanager', 'Ventes terminées', ''); });
      await p.waitForFunction(() => Ext.ComponentQuery.query('*').some((x) => Ext.getClassName(x) === 'testextjs.view.vente.VentesFinis' && x.rendered && x.isVisible()), null, { timeout: 60000 });
      await p.waitForTimeout(1500);
      /* recherche de la vente d'essai par sa reference */
      await p.evaluate((r) => { const e = Ext.ComponentQuery.query('*').filter((x) => Ext.getClassName(x) === 'testextjs.view.vente.VentesFinis' && x.isVisible())[0];
        e.down('#dtStart').setValue(new Date()); e.down('#dtEnd').setValue(new Date());
        const f = e.query('textfield').filter((x) => x.isVisible() && /search|query|recherche/i.test((x.itemId || '') + (x.emptyText || '')))[0];
        if (f) { f.setValue(r); }
        e.query('button').filter((x) => x.isVisible() && /^\s*rechercher\s*$/i.test(x.text || ''))[0].el.dom.click(); }, ref);
      await p.waitForFunction((r) => { const e = Ext.ComponentQuery.query('*').filter((x) => Ext.getClassName(x) === 'testextjs.view.vente.VentesFinis' && x.isVisible())[0];
        const g = e.down('grid'); return !g.getStore().isLoading() && g.getStore().findBy((x) => JSON.stringify(x.data).indexOf(r) >= 0) >= 0; }, ref, { timeout: 90000 });
      const cible = await p.evaluate((r) => { const e = Ext.ComponentQuery.query('*').filter((x) => Ext.getClassName(x) === 'testextjs.view.vente.VentesFinis' && x.isVisible())[0];
        const g = e.down('grid'), row = g.getStore().findBy((x) => JSON.stringify(x.data).indexOf(r) >= 0);
        let sel = null;
        Ext.each(g.query('actioncolumn'), (col) => { Ext.each(col.items, (it, i) => { if (!sel && /^Voir détail$/.test(it.tooltip || '')) {
          const n = g.getView().getCellByPosition({ row, column: g.headerCt.getHeaderIndex(col) });
          const img = n && n.dom.querySelector('.x-action-col-' + i);
          if (img) { img.setAttribute('data-e2e-detail', '1'); sel = '[data-e2e-detail="1"]'; } } }); });
        return sel; }, ref);
      await p.click(cible);
      await p.waitForFunction(() => Ext.ComponentQuery.query('window').some((x) => Ext.getClassName(x) === 'testextjs.view.vente.DetailVente' && x.isVisible()), null, { timeout: 30000 });
      await p.waitForTimeout(1500);
      const m = await p.evaluate(() => {
        const win = Ext.ComponentQuery.query('window').filter((x) => Ext.getClassName(x) === 'testextjs.view.vente.DetailVente' && x.isVisible())[0];
        const sections = win.query('fieldset').filter((f) => f.isVisible(true) && f.up('fieldset') && f.up('fieldset').title === 'Infos.Generales de la vente');
        const boites = sections.map((f) => { const r = f.getEl().dom.getBoundingClientRect(); return { t: f.title, haut: r.top, bas: r.bottom }; });
        const chevauche = boites.filter((x, i) => i > 0 && x.haut < boites[i - 1].bas - 1).map((x) => x.t);
        const champs = win.query('displayfield').filter((d) => d.isVisible(true)).map((d) => {
          const lab = d.labelEl && d.labelEl.dom, val = d.inputEl && d.inputEl.dom, lh = (el) => parseFloat(getComputedStyle(el).lineHeight) || 18;
          return { l: d.fieldLabel, v: val ? val.textContent.trim() : '', lignesLib: lab ? Math.round(lab.getBoundingClientRect().height / lh(lab)) : 1,
            lignesVal: val ? Math.round(val.getBoundingClientRect().height / lh(val)) : 1, coupe: val ? val.scrollWidth > val.clientWidth + 1 : false,
            bulle: val ? val.getAttribute('data-qtip') || '' : '' };
        });
        const gauche = sections.length ? sections[0].up('fieldset').getEl().dom : null;
        /* chaque champ visible entierement dans sa section */
        const cache = win.query('displayfield').filter((d) => d.isVisible(true)).filter((d) => { const s = d.up('fieldset').getEl().dom.getBoundingClientRect(), r = d.getEl().dom.getBoundingClientRect();
          return r.bottom > s.bottom + 1 || r.top < s.top - 1; }).map((d) => d.fieldLabel);
        return { boites, chevauche, champs, cache, horizontal: gauche ? gauche.scrollWidth > gauche.clientWidth + 1 : true };
      });
      const tag = w + ' x ' + h;
      ok(tag + ' : 5 sections visibles, aucune ne chevauche la suivante', m.boites.length === 5 && m.chevauche.length === 0, JSON.stringify(m.boites));
      ok(tag + ' : aucun champ caché ou coupé par sa section', m.cache.length === 0, m.cache.join(', '));
      const surDeux = m.champs.filter((c) => c.lignesLib > 1 || c.lignesVal > 1).map((c) => c.l);
      ok(tag + ' : chaque libellé et chaque valeur sur une seule ligne (au comptant, noms, tiers payant)', surDeux.length === 0, surDeux.join(', '));
      ok(tag + ' : pas de défilement horizontal', !m.horizontal);
      const val = (l) => (m.champs.find((c) => c.l === l) || {}).v || '';
      const n = (s) => Number(String(s).replace(/[^\d-]/g, ''));
      ok(tag + ' : rapprochement fenêtre = base (référence, total, net, part client, montant et taux du tiers payant)',
        val('Référence') === base[0] && n(val('Montant total')) === Number(base[1]) && n(val('Montant net')) === Number(base[2])
        && n(val('Part du client')) === Number(base[3]) && n(val('Montant')) === Number(base[4]) && n(val('Taux')) === Number(base[5]),
        JSON.stringify({ base, fenetre: m.champs.map((c) => c.l + '=' + c.v) }));
      ok(tag + ' : noms en entier (client, ayant droit, tiers payant)', val('Nom du client') === 'ESSAI-NOM-COMPOSE-LONG' && val('Nom Ayant droit') === 'ESSAI-AYANT-DROIT-LONG'
        && val('Tiers payant') === 'MUTUELLE GENERALE DES AGENTS ESSAI ' + MARQUE, JSON.stringify(m.champs.filter((c) => /Nom|Tiers/.test(c.l))));
      const sansBulle = m.champs.filter((c) => c.coupe && c.bulle !== c.v).map((c) => c.l);
      ok(tag + ' : une valeur raccourcie par « … » a son texte complet en info-bulle', sansBulle.length === 0, sansBulle.join(', '));
      ok(tag + ' : libellés corrigés (« Prénom du client », « Montant »)', m.champs.some((c) => c.l === 'Prénom du client') && !m.champs.some((c) => /Prénon|Motant/.test(c.l)));
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    C.nettoyer();
    await b.close();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
