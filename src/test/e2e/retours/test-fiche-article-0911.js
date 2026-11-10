/* PLAN DU 09/11, POINT 1 : FICHE ARTICLE EN MODIFICATION, ET ERREUR « componentLayoutCounter » DU JOURNAL.
 *
 * Par l'ecran (admin, 1366 x 768 puis 1280 x 720), sur un article en stock remis a l'identique a la fin :
 *  - erreur du journal du 09/11 : taper une recherche dans la fiche article puis changer d'ecran avant la fin de la
 *    pause de frappe (600 ms) ne leve pas d'erreur JavaScript ; defaut remis a l'essai (un masque de chargement sans
 *    composant reste abonne a la liste, etat de l'erreur) : la recherche tapee charge la liste sans erreur ; revenu
 *    sur la fiche article, la recherche par CIP marche ;
 *  - « Modifier » sur la ligne de l'article : la zone reserve est dans PRIX & STOCK, juste sous « Code tableau » ;
 *    libelles « Quantité en réserve », « Contenance CH », « PSCODE » ;
 *  - une seule largeur de libelle dans les blocs IDENTITE, PRIX & STOCK, GESTION ; aucun champ etire (largeur
 *    plafonnee) ; au moins 8 px entre deux listes deroulantes ; pas de defilement horizontal ; rien ne deborde de son
 *    bloc ;
 *  - bilan : « Enregistrer » sans rien changer laisse la fiche identique en base (rapprochement des valeurs affichees
 *    avec la base : CIP, designation, prix d'achat, prix de vente, code tableau, PSCODE) ;
 *  - aucune erreur JavaScript.
 */
const C = require('../audits/commun');
const { ok, q } = C;
const { ouvrirMenu, cliquer } = require('../outils/vues');

const [P, CIP] = q("SELECT CONCAT(f.lg_FAMILLE_ID, '|', f.int_CIP) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_CIP REGEXP '^[0-9]{7}$' AND s.int_NUMBER_AVAILABLE > 0"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1 ORDER BY f.str_NAME LIMIT 1 OFFSET 7").split('|');
const FICHE = "CONCAT_WS('|', int_CIP, str_DESCRIPTION, int_PAF, int_PRICE, IFNULL(int_T, ''), IFNULL(str_PSCODE, ''), str_NAME, lg_ZONE_GEO_ID, lg_GROSSISTE_ID,"
  + " IFNULL(lg_CODE_TVA_ID, ''), IFNULL(bool_RESERVE, ''), IFNULL(int_SEUIL_RESERVE, ''), IFNULL(str_CODE_GEO_ARTICLE, ''), IFNULL(int_COLISAGE, ''), str_STATUT)";
const fiche = () => q(`SELECT ${FICHE} FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`);

(async () => {
  const { b, p, erreurs } = await C.connecter();
  const avant = fiche();
  try {
    /* erreur du journal : recherche tapee puis changement d'ecran pendant la pause de frappe */
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager #rechecher').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await cliquer(p, 'famillemanager #rechecher');
    await p.keyboard.type(CIP.slice(0, 5), { delay: 15 });
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForTimeout(2500);
    ok('Recherche tapée puis changement d\'écran avant la fin de la frappe : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));

    await ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager #rechecher').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    /* defaut remis a l'essai : un masque de chargement sans composant reste abonne a la liste (etat de l'erreur du
       journal : « componentLayoutCounter, a is undefined » dans onBeforeLoad), puis on tape une recherche */
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('famillemanager')[0];
      const m = Ext.create('Ext.LoadMask', { target: g.getView(), store: g.getStore() }); m.ownerCt = undefined; m.floatParent = undefined; window.__masqueOrphelin = m; });
    const avantOrphelin = erreurs.length;
    await cliquer(p, 'famillemanager #rechecher');
    await p.keyboard.press('Control+A');
    const repO = p.waitForResponse((r) => /produit-search\/fiche/.test(r.url()), { timeout: 8000 }).catch(() => null);
    await p.keyboard.type(CIP.slice(0, 5), { delay: 20 });
    const chargee = await repO;
    await p.waitForTimeout(1500);
    ok('Masque orphelin abonné à la liste : la recherche tapée charge la liste sans erreur JavaScript',
      !!chargee && erreurs.length === avantOrphelin, erreurs.slice(avantOrphelin).join(' | '));
    erreurs.splice(avantOrphelin);

    await cliquer(p, 'famillemanager #rechecher');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(CIP, { delay: 20 });
    const rep = p.waitForResponse((r) => /produit-search\/fiche/.test(r.url()), { timeout: 30000 }).catch(() => null);
    await p.keyboard.press('Enter');
    await rep;
    await p.waitForTimeout(1500);
    const trouves = await p.evaluate(() => Ext.ComponentQuery.query('famillemanager')[0].getStore().getRange().map((r) => r.get('lg_FAMILLE_ID')));
    ok('Revenu sur la fiche article : la recherche par CIP trouve l\'article', trouves.includes(P), JSON.stringify(trouves));

    for (const [w, h] of [[1366, 768], [1280, 720]]) {
      await p.setViewportSize({ width: w, height: h });
      await p.waitForTimeout(800);
      const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: CIP }).first();
      await ligne.waitFor({ timeout: 30000 });
      if (await ligne.locator('.fa-action-edit').count() > 0) {
        await ligne.locator('.fa-action-edit').first().click({ timeout: 10000 });
      } else {
        await ligne.locator('.fa-action-plus').first().click({ timeout: 10000 });
        await p.locator('.x-menu-item').filter({ visible: true, hasText: 'Modifier' }).first().click({ timeout: 10000 });
      }
      await p.waitForFunction(() => { const x = window.winModifArticleOuverte; return x && !x.isDestroyed && x.isVisible() && x.down('#int_CIP') && x.down('#int_CIP').getValue(); }, null, { timeout: 30000 });
      await p.waitForTimeout(1500);
      const m = await p.evaluate(() => {
        const win = window.winModifArticleOuverte;
        const blocs = win.query('fieldset').filter((f) => /IDENTIT|PRIX &amp; STOCK|PRIX & STOCK|GESTION/.test(f.title || ''));
        const bloc = (t) => blocs.find((f) => (f.title || '').indexOf(t) >= 0);
        const prix = bloc('PRIX'), reserve = win.down('#info_reserve'), codeT = win.down('#int_T');
        const visibles = (f) => f.query('field').filter((c) => c.isVisible(true) && !c.isXType('checkbox') && !c.isXType('hidden'));
        /* champs de saisie a libelle place a gauche */
        const saisies = [].concat(...blocs.map(visibles)).filter((c) => !c.isXType('displayfield') && c.labelEl && !c.hideLabel && c.fieldLabel
          && c.up('fieldset') && blocs.includes(c.up('fieldset')));
        const largeursLib = Array.from(new Set(saisies.map((c) => Math.round(c.labelEl.dom.getBoundingClientRect().width))));
        const etires = saisies.filter((c) => c.getWidth() > 380).map((c) => c.fieldLabel + '=' + c.getWidth());
        /* ecart entre listes deroulantes consecutives d'un meme bloc */
        const serres = [];
        blocs.forEach((f) => { const l = visibles(f).filter((c) => c.up('fieldset') === f);
          for (let i = 1; i < l.length; i++) { if (l[i].isXType('combobox') && l[i - 1].isXType('combobox')) {
            const e = l[i].getEl().dom.getBoundingClientRect().top - l[i - 1].getEl().dom.getBoundingClientRect().bottom;
            if (e < 8) { serres.push(l[i - 1].fieldLabel + '/' + l[i].fieldLabel + '=' + Math.round(e)); } } } });
        const debord = [].concat(...blocs.map((f) => visibles(f).filter((c) => { const s = f.getEl().dom.getBoundingClientRect(), r = c.getEl().dom.getBoundingClientRect();
          return r.right > s.right + 1 || r.left < s.left - 1; }).map((c) => c.fieldLabel || c.name)));
        const form = win.down('form');
        const corps = form.body.dom;
        const lib = (id) => { const c = win.down('#' + id); return c ? c.fieldLabel : null; };
        const rT = codeT.getEl().dom.getBoundingClientRect(), rR = reserve.getEl().dom.getBoundingClientRect();
        /* rien de visible entre « Code tableau » et la zone reserve */
        const entre = visibles(prix).filter((c) => c.up('#info_reserve') == null && c !== codeT).filter((c) => { const r = c.getEl().dom.getBoundingClientRect(); return r.top >= rT.bottom - 1 && r.bottom <= rR.top + 1; });
        return {
          reserveDansPrix: !!reserve && reserve.up('fieldset') === prix, sousCodeT: rR.top >= rT.bottom - 1 && rR.top - rT.bottom < 20 && entre.length === 0,
          ecart: Math.round(rR.top - rT.bottom),
          libReserve: lib('int_RESERVE'), libCh: lib('int_NUMBERDETAIL'), libPs: lib('str_PSCODE'),
          largeursLib, etires, serres, debord, horizontal: corps.scrollWidth > corps.clientWidth + 1,
          affiche: [win.down('#int_CIP').getValue(), win.down('#str_DESCRIPTION').getValue(), win.down('#int_PAF').getValue(), win.down('#int_PRICE').getValue(),
            win.down('#int_T').getValue() || '', win.down('#str_PSCODE').getValue() || ''].map(String),
        };
      });
      const tag = w + ' x ' + h;
      ok(tag + ' : zone réserve dans PRIX & STOCK, juste sous « Code tableau »', m.reserveDansPrix && m.sousCodeT, JSON.stringify({ dans: m.reserveDansPrix, ecart: m.ecart }));
      ok(tag + ' : libellés « Quantité en réserve », « Contenance CH », « PSCODE »',
        /^Quantité en réserve/.test(m.libReserve || '') && /^Contenance CH/.test(m.libCh || '') && m.libPs === 'PSCODE', JSON.stringify([m.libReserve, m.libCh, m.libPs]));
      ok(tag + ' : une seule largeur de libellé dans les trois blocs', m.largeursLib.length === 1, JSON.stringify(m.largeursLib));
      ok(tag + ' : aucun champ étiré (380 px au plus)', m.etires.length === 0, m.etires.join(', '));
      ok(tag + ' : au moins 8 px entre deux listes déroulantes', m.serres.length === 0, m.serres.join(', '));
      ok(tag + ' : rien ne déborde de son bloc, pas de défilement horizontal', m.debord.length === 0 && !m.horizontal, JSON.stringify({ debord: m.debord, horizontal: m.horizontal }));
      const base = q(`SELECT CONCAT_WS('|', int_CIP, str_DESCRIPTION, int_PAF, int_PRICE, IFNULL(int_T, ''), IFNULL(str_PSCODE, '')) FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`).split('|');
      ok(tag + ' : rapprochement fiche = base (CIP, désignation, prix d\'achat, prix de vente, code tableau, PSCODE)',
        JSON.stringify(m.affiche) === JSON.stringify(base), JSON.stringify({ fiche: m.affiche, base }));
      /* enregistrer sans rien changer */
      const id = await p.evaluate(() => window.winModifArticleOuverte.query('button').filter((x) => x.text === 'Enregistrer')[0].getId());
      const r = p.waitForResponse((x) => /fichearticle\/enregistrer|famille/.test(x.url()) && x.request().method() !== 'GET', { timeout: 30000 }).catch(() => null);
      await p.click('#' + id);
      await r;
      await p.waitForFunction(() => !window.winModifArticleOuverte || window.winModifArticleOuverte.isDestroyed || !window.winModifArticleOuverte.isVisible(), null, { timeout: 30000 });
      await p.waitForTimeout(1500);
      ok(tag + ' : bilan, « Enregistrer » sans changement laisse la fiche identique en base', fiche() === avant, JSON.stringify({ avant, apres: fiche() }));
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (fiche() !== avant) { console.log('ATTENTION : fiche modifiée, avant = ' + avant); }
    C.nettoyer();
    await b.close();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
