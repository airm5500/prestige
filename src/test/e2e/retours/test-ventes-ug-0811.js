/* PLAN DU 06/11, POINT 13 (RECAPITULATIF DU 07/11, § 6) : ECRAN « VENTES UNITES GRATUITES » (UG DU FOURNISSEUR).
 *
 * Constats (06/11) : ecran non declare dans correctifs-affichage.js ; le vendeur n'est ni lu ni affiche ; la recherche
 * ne filtre rien ; la pagination est trompeuse (tout est charge d'un coup, total = true).
 * Reponses retenues : colonne Vendeur a l'ecran et sur le PDF ; recherche et pagination corrigees ; les unites offertes
 * par les promotions n'y sont pas melangees.
 * Par les ecrans (compte de test) :
 *  - trois produits : G1 (stock UG 3), G2 (stock UG 10), G3 (sans UG) ; ventes au comptant : V1 = G1 5 + G2 2 + G3 1,
 *    V2 = G2 4, V3 = G2 1 annulee ensuite ;
 *  - base : V1 G1 = 3 UG (stock UG epuise), V1 G2 = 2, V2 G2 = 4 ; G3 sans UG ;
 *  - menu « Ventes unités gratuites » : ecran declare ; colonne Vendeur ; nos lignes = base (CIP, quantite, UG,
 *    montant UG = UG x PU, reference, vendeur), G3 et V3 absentes ;
 *  - recherche (nom de G2) : seules les lignes de G2 ; pagination (2 lignes par page) : total = nombre de lignes en
 *    base, page 2 = lignes suivantes, totaux du bas = toutes les lignes (pas la page) ;
 *  - « imprimer » : le PDF porte la colonne Vendeur et nos lignes, comme l'ecran.
 * Tout est retire a la fin.
 * Lancement seul : node src/test/e2e/retours/test-ventes-ug-0811.js
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const A = require('../audits/commun');
const vues = require('../outils/vues');
const privilegeEssai = require('../support/privilege-essai');
const { ok, q, exec } = A;

const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
const GRILLE = 'doventemanager gridpanel';
const droitAnnuler = privilegeEssai(q, exec, A.ENV_E2E.LOGIN, 'P_BT_ANNULER_VENTE');
const UTIL = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${A.ENV_E2E.LOGIN}'`);
const NOM_UTIL = q(`SELECT TRIM(CONCAT(IFNULL(str_FIRST_NAME, ''), ' ', IFNULL(str_LAST_NAME, ''))) FROM t_user WHERE lg_USER_ID = '${UTIL}'`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ventes-ug-'));
const filtre = " AND f.int_PRICE BETWEEN 1000 AND 5000 AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.str_NAME NOT LIKE '%''%' AND LENGTH(f.str_NAME) >= 8"
  + ' AND NOT EXISTS (SELECT 1 FROM t_promotion_product pp WHERE pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID) AND IFNULL(f.bl_PROMOTED, 0) = 0';
const G1 = A.produit(83, 40, filtre), G2 = A.produit(89, 40, filtre), G3 = A.produit(97, 40, filtre);
for (const x of [G1, G2, G3]) {
  const [cip, nom] = q(`SELECT CONCAT_WS('|', int_CIP, str_NAME) FROM t_famille WHERE lg_FAMILLE_ID = '${x.id}'`).split('|');
  Object.assign(x, { cip, nom });
}
const n = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

(async () => {
  exec(`UPDATE t_famille_stock SET int_UG = 3 WHERE lg_FAMILLE_ID = '${G1.id}' AND lg_EMPLACEMENT_ID = '1';`
    + ` UPDATE t_famille_stock SET int_UG = 10 WHERE lg_FAMILLE_ID = '${G2.id}' AND lg_EMPLACEMENT_ID = '1';`
    + ` UPDATE t_famille_stock SET int_UG = 0 WHERE lg_FAMILLE_ID = '${G3.id}' AND lg_EMPLACEMENT_ID = '1'`);
  ok('Jeu d\'essai : trois produits (stock UG 3, 10, 0), prix différents', [G1, G2, G3].every((x) => x.id && x.nom) && new Set([G1.pu, G2.pu, G3.pu]).size === 3,
    [G1, G2, G3].map((x) => x.cip + ' ' + x.pu).join(', '));
  A.parametre('FORCER_STOCK_VENTE', '0');
  A.ouvrirCaisse();
  droitAnnuler.accorder();
  const b = await A.ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const attendre = async (ms) => { await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(ms); };
  const ventes = [];
  try {
    await vues.connexion(p, A.ENV_E2E.LOGIN, 'e2etest');
    /* ---- ventes au comptant ---- */
    const scanner = async (cip) => { await vues.cliquer(p, CHAMP); await p.keyboard.type(cip, { delay: 30 }); await p.keyboard.press('Enter'); await attendre(1500); };
    const quantite = async (cip, k) => {
      const id = await p.evaluate(([c, sel]) => { const g = Ext.ComponentQuery.query(sel).filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
        const r = g.getStore().findRecord('intCIP', c); const col = g.columns.filter((x) => x.dataIndex === 'intQUANTITY')[0];
        const cel = g.getView().getCell(r, col); cel.dom.id = cel.dom.id || 'e2e-qd-' + c; return cel.dom.id; }, [cip, GRILLE]);
      await p.click('#' + id); await p.waitForTimeout(500);
      await p.keyboard.press('Control+A'); await p.keyboard.type(String(k), { delay: 40 }); await p.keyboard.press('Enter');
      await attendre(2000);
    };
    const vendre = async (lignes) => {
      await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
      await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
      await p.mouse.click(1000, 600); await p.waitForTimeout(800);
      await vues.cliquer(p, 'cloturerventemanager #addBtn');
      await p.waitForFunction((c) => Ext.ComponentQuery.query(c).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 });
      await p.waitForTimeout(1500);
      let v = null;
      for (const [x, k] of lignes) {
        await scanner(x.cip);
        if (!v) { v = await p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID); A.etat.ventes.push(v); }
        if (k !== 1) { await quantite(x.cip, k); }
      }
      await vues.cliquer(p, CHAMP); await p.keyboard.press('Enter'); await attendre(2500);
      const net = await p.evaluate(() => { const f = Ext.ComponentQuery.query('doventemanager #contenu #montantNet')[0]; return f ? Number(String(f.getValue()).replace(/\D/g, '')) : null; });
      await vues.cliquer(p, 'doventemanager #contenu #montantRecu');
      await p.keyboard.press('Control+A'); await p.keyboard.type(String(net), { delay: 20 }); await p.keyboard.press('Tab');
      await p.waitForTimeout(500);
      const rep = p.waitForResponse((x) => /\/vente\/cloturer\/vno/.test(x.url()), { timeout: 120000 });
      await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
      const c = await (await rep).json().catch(() => ({}));
      await p.waitForTimeout(1500);
      if (/imprimer/i.test(await vues.texteMessage(p))) { await vues.repondre(p, 'no').catch(() => {}); }
      return { id: v, ref: q(`SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${v}'`), fini: c.success === true };
    };
    ventes.push(await vendre([[G1, 5], [G2, 2], [G3, 1]]));
    ventes.push(await vendre([[G2, 4]]));
    ventes.push(await vendre([[G2, 1]]));
    ok('Trois ventes au comptant terminées', ventes.every((v) => v.fini), ventes.map((v) => v.ref).join(','));

    /* V3 annulee */
    await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await vues.cliquer(p, 'ventemanager #query');
    await p.keyboard.press('Control+A'); await p.keyboard.type(ventes[2].ref, { delay: 20 }); await p.keyboard.press('Enter');
    await p.waitForFunction((id) => { const s = Ext.ComponentQuery.query('ventemanager gridpanel')[0].getStore(); return !s.isLoading() && s.findExact('lgPREENREGISTREMENTID', id) >= 0; }, ventes[2].id, { timeout: 60000 });
    await p.waitForTimeout(800);
    const rang = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], s = g.getStore();
      return g.getView().getNode(s.getAt(s.findExact('lgPREENREGISTREMENTID', id))).id; }, ventes[2].id);
    await p.locator(`#${rang} img[data-qtip="Annuler.Vente"]`).filter({ visible: true }).first().click();
    await p.waitForTimeout(800);
    await vues.repondre(p, 'yes');
    for (let k = 0; k < 60 && !/impression/i.test(await vues.texteMessage(p)); k++) { await p.waitForTimeout(1000); }
    await vues.repondre(p, 'no').catch(() => {});
    await p.waitForTimeout(1000);
    const annulation = q(`SELECT IFNULL(MAX(lg_PREENREGISTREMENT_ID), '') FROM t_preenregistrement WHERE lg_PARENT_ID = '${ventes[2].id}' AND int_PRICE < 0`);
    if (annulation) { A.etat.ventes.push(annulation); }
    ok('V3 annulée par l\'écran', !!annulation, ventes[2].ref);

    const ug = (v, f) => Number(q(`SELECT IFNULL(SUM(int_UG), 0) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${v.id}' AND lg_FAMILLE_ID = '${f.id}'`));
    ok('Base : UG consommées V1 G1 = 3 (stock UG épuisé), V1 G2 = 2, V2 G2 = 4, G3 = 0', ug(ventes[0], G1) === 3 && ug(ventes[0], G2) === 2 && ug(ventes[1], G2) === 4
      && ug(ventes[0], G3) === 0, [ug(ventes[0], G1), ug(ventes[0], G2), ug(ventes[1], G2), ug(ventes[0], G3)].join(','));

    /* ---- ecran « Ventes unites gratuites » ---- */
    const menu = await p.evaluate(() => { const x = Ext.ComponentQuery.query('navigation')[0].getStore().getNodeById('venteugs');
      return x && x.parentNode ? { parent: x.parentNode.get('text'), texte: x.get('text') } : null; });
    await vues.ouvrirMenu(p, menu.parent, menu.texte);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('venteugs #uggid')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.mouse.click(1000, 700); await p.waitForTimeout(1500);
    const declare = await p.evaluate(() => { const PA = window.PrestigeAffichage || {};
      return [PA.ECRANS_COLLES, PA.ECRANS_STYLE_VENTE].some((l) => (l || []).indexOf('venteugs') >= 0); });
    ok('Écran déclaré dans correctifs-affichage.js', declare);
    const colonnes = await p.evaluate(() => Ext.ComponentQuery.query('venteugs #uggid')[0].columns.filter((c) => !c.hidden).map((c) => c.text.replace(/<[^>]+>/g, '')));
    ok('Colonne « Vendeur »', colonnes.includes('Vendeur'), colonnes.join(' | '));

    const attendreGrille = async () => {
      await p.waitForTimeout(300);
      await p.waitForFunction(() => !Ext.ComponentQuery.query('venteugs #uggid')[0].getStore().isLoading(), null, { timeout: 60000 });
      await p.waitForTimeout(600);
    };
    const lire = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('venteugs #uggid')[0];
      const cols = g.columns.filter((c) => !c.hidden).map((c) => c.dataIndex);
      return { total: g.getStore().getTotalCount(), lignes: g.getStore().getRange().map((r) => { const t = {}; const cel = g.getView().getNode(r).querySelectorAll('td');
        cols.forEach((d, i) => { t[d] = cel[i] ? cel[i].innerText.replace(/\s+/g, ' ').trim() : ''; }); return t; }),
      bas: Ext.ComponentQuery.query('venteugs #nbreVente')[0].getValue() + '|' + Ext.ComponentQuery.query('venteugs #montantAchat')[0].getValue() }; });
    /* toute la journee, grande page */
    await p.evaluate(() => { Ext.ComponentQuery.query('venteugs #uggid')[0].getStore().pageSize = 500; });
    await vues.cliquer(p, 'venteugs #rechercher');
    await attendreGrille();
    let e = await lire();
    const CAS = [[0, G1, 5, 3], [0, G2, 2, 2], [1, G2, 4, 4]];
    for (const [k, f, qte, u] of CAS) {
      const l = e.lignes.find((x) => x.strREF === ventes[k].ref && x.intCIP === f.cip) || {};
      ok(`${ventes[k].ref} ${f.cip} : écran = base (qté ${qte}, UG ${u}, montant UG ${u * f.pu}, vendeur)`, Number((l.intQUANTITY || '').replace(/\D/g, '')) === qte
        && Number((l.uniteGratuite || '').replace(/\D/g, '')) === u && Number((l.montantUg || '').replace(/\D/g, '')) === u * f.pu && l.vendeur === NOM_UTIL, JSON.stringify(l));
    }
    ok('G3 (sans UG) et V3 (annulée) absentes', !e.lignes.some((x) => x.intCIP === G3.cip) && !e.lignes.some((x) => x.strREF === ventes[2].ref), e.lignes.length + ' lignes');
    const enBase = q("SELECT CONCAT_WS('|', COUNT(*), IFNULL(SUM(d.int_UG), 0), IFNULL(SUM(d.int_UG * d.int_PRICE_UNITAIR), 0)) FROM t_preenregistrement_detail d"
      + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID WHERE d.int_UG > 0 AND p.int_PRICE > 0 AND p.b_IS_CANCEL = 0"
      + " AND p.str_STATUT = 'is_Closed' AND p.str_TYPE_VENTE = 'VNO' AND DATE(p.dt_UPDATED) = CURDATE()").split('|').map(Number);
    ok('Total de la pagination = nombre de lignes en base ; totaux du bas = base', e.total === enBase[0] && e.lignes.length === enBase[0]
      && e.bas === enBase[1] + '|' + enBase[2], JSON.stringify({ total: e.total, lignes: e.lignes.length, bas: e.bas, base: enBase }));

    /* pagination : 2 lignes par page */
    await p.evaluate(() => { Ext.ComponentQuery.query('venteugs #uggid')[0].getStore().pageSize = 2; });
    await vues.cliquer(p, 'venteugs #rechercher');
    await attendreGrille();
    const p1 = await lire();
    await vues.cliquer(p, 'venteugs #uggid pagingtoolbar #next');
    await attendreGrille();
    const p2 = await lire();
    const cle = (l) => l.strREF + ' ' + l.intCIP + ' ' + l.dateHeure;
    ok('Pagination : 2 lignes par page, total = base, page 2 = lignes 3 et 4 de la liste complète, totaux du bas = toutes les lignes',
      p1.lignes.length === Math.min(2, enBase[0]) && p1.total === enBase[0] && p2.lignes.map(cle).join('#') === e.lignes.slice(2, 4).map(cle).join('#')
      && p1.lignes.map(cle).join('#') === e.lignes.slice(0, 2).map(cle).join('#') && p2.bas === e.bas,
      JSON.stringify({ p1: p1.lignes.map(cle), p2: p2.lignes.map(cle), total: p1.total, bas: p2.bas }));

    /* recherche : nom de G2 */
    await p.evaluate(() => { Ext.ComponentQuery.query('venteugs #uggid')[0].getStore().pageSize = 500; });
    const champRecherche = await p.evaluate(() => { const c = Ext.ComponentQuery.query('venteugs #query')[0]; return c ? c.id : null; });
    let filtre2 = null;
    if (champRecherche) {
      await p.locator('#' + champRecherche + '-inputEl').fill(G2.nom.slice(0, 10));
      await p.locator('#' + champRecherche + '-inputEl').press('Enter');
      await attendreGrille();
      filtre2 = await lire();
    }
    ok('Recherche (début du nom de G2) : seules ses lignes, dont V1 et V2', !!filtre2 && filtre2.lignes.length > 0 && filtre2.lignes.every((l) => l.strNAME.startsWith(G2.nom.slice(0, 10)))
      && filtre2.lignes.filter((l) => l.intCIP === G2.cip && [ventes[0].ref, ventes[1].ref].includes(l.strREF)).length === 2, JSON.stringify(filtre2 && filtre2.lignes.map(cle)));

    /* PDF */
    await p.locator('#' + champRecherche + '-inputEl').fill('');
    await p.locator('#' + champRecherche + '-inputEl').press('Enter');
    await attendreGrille();
    e = await lire();
    const pop = ctx.waitForEvent('page', { timeout: 30000 });
    await vues.cliquer(p, 'venteugs #imprimer');
    const page = await pop; await page.waitForLoadState().catch(() => {}); const url = page.url(); await page.close().catch(() => {});
    const r = await ctx.request.get(url);
    const f = path.join(TMP, 'ug.pdf'); fs.writeFileSync(f, await r.body());
    const texte = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
    ok('PDF : colonne Vendeur, nos lignes (référence, CIP, UG, montant UG, vendeur) et total = écran', /Vendeur/i.test(texte)
      && CAS.every(([k, x, qte, u]) => texte.includes(ventes[k].ref) && texte.includes(x.cip) && texte.includes(n(u * x.pu)))
      && texte.includes(NOM_UTIL) && texte.includes(n(enBase[2])), texte.slice(0, 600));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    droitAnnuler.reprendre();
    A.nettoyer();
    fs.rmSync(TMP, { recursive: true, force: true });
    process.exit(A.bilan() ? 1 : 0);
  }
})();
