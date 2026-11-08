/* PLAN DU 06/11, POINT 3.5 (DEMANDE DU 07/11) : JOURNAL DES PROMOTIONS, ONGLETS HISTORIQUE / VENTES EN PROMOTION /
 * ANALYSE, IMPRESSION ET EXPORT.
 *
 * Demande : « retracer les ventes, les ajouts, les retraits et les changements, avec tri par type et par date,
 * impression et export » ; « historique en onglet » ; « un onglet analyse ».
 * Reponses retenues (recapitulatif du 07/11, valide) : chaque action est journalisee avec l'utilisateur, l'avant et
 * l'apres ; onglets Promotions | Historique | Ventes en promotion | Analyse ; Historique reserve aux utilisateurs qui
 * avaient le menu « Historique des promotions ».
 * Par les ecrans (compte de test), tout au clic :
 *  - le menu Promotions ouvre quatre onglets ; Historique visible avec le droit P_SM_PROMOTION_History ;
 *  - « Creer » une promotion UNITES GRATUITES, la « Modifier » (fin + 1 jour), y ajouter UP (par palier de 4, 1 offerte)
 *    et UA (a partir de 5, 1 offerte), rajouter UA avec 2 offertes (modification), ajouter puis retirer UR (retrait,
 *    confirmation dans l'icone) ; une promotion REMISE (10 %) recoit UM ;
 *  - trois ventes au comptant : V1 = UP 9 tapees (11 boites, 2 offertes) + UA 12 (2 offertes une fois) + UM 3 ;
 *    V2 = UP 4 (5 boites, 1 offerte) ; V3 = UM 1, annulee ensuite ; puis « Cloturer » la promotion UG ;
 *  - bilan du journal (base) : exactement CREATION, MODIFICATION PROMOTION, AJOUT, AJOUT, MODIFICATION, AJOUT, RETRAIT,
 *    CLOTURE, dans l'ordre, chacune avec l'utilisateur du test, l'avant attendu ; rien de plus ;
 *  - onglet Historique : filtre produit -> lignes de l'ecran = base, une a une ; tri par Action (clic sur l'en-tete) ;
 *    filtre Action « Retrait du produit » ; PDF (pdftotext) et Excel = ecran, ligne a ligne ;
 *  - onglet Ventes : lignes de V1 et V2 = base = ticket (mention), montant, payees, offertes, prix d'avant, cout ;
 *    V3 annulee absente ; PDF et Excel = ecran ; ligne TOTAL = totaux de l'ecran ;
 *  - onglet Analyse (filtre vendeur = compte de test, produit) : total = somme des lignes de l'onglet Ventes ; par type
 *    et par jour = sommes ; barres du top 10 dans l'ordre des montants ; PDF et Excel = ecran ;
 *  - sans le droit : onglet Historique cache et service refuse (403), Ventes et Analyse restent.
 * Tout est retire a la fin.
 * Lancement seul : node src/test/e2e/retours/test-promotion-suivi-0811.js
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

const chiffres = (t) => Number(String(t || '').replace(/[^\d-]/g, '')) || 0;
const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
const GRILLE = 'doventemanager gridpanel';
const droitAnnuler = privilegeEssai(q, exec, A.ENV_E2E.LOGIN, 'P_BT_ANNULER_VENTE');
const droitHisto = privilegeEssai(q, exec, A.ENV_E2E.LOGIN, 'P_SM_PROMOTION_History');
const UTIL = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${A.ENV_E2E.LOGIN}'`);
const NOM_UTIL = q(`SELECT TRIM(CONCAT(IFNULL(str_FIRST_NAME, ''), ' ', IFNULL(str_LAST_NAME, ''))) FROM t_user WHERE lg_USER_ID = '${UTIL}'`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'promo-suivi-'));

const filtre = " AND f.int_PRICE BETWEEN 1000 AND 5000 AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.str_NAME NOT LIKE '%''%' AND LENGTH(f.str_NAME) >= 8"
  + ' AND NOT EXISTS (SELECT 1 FROM t_promotion_product pp WHERE pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID)';
const UP = A.produit(53, 60, filtre), UA = A.produit(61, 60, filtre), UR = A.produit(67, 30, filtre), UM = A.produit(71, 40, filtre);
const TOUS = [UP, UA, UR, UM];
for (const x of TOUS) {
  const [cip, nom, drapeau] = q(`SELECT CONCAT_WS('|', int_CIP, str_NAME, IFNULL(bl_PROMOTED + 0, 'NULL')) FROM t_famille WHERE lg_FAMILLE_ID = '${x.id}'`).split('|');
  Object.assign(x, { cip, nom, drapeau });
}
const promos = {};
const maxPromo = Number(q('SELECT IFNULL(MAX(lg_CODE_PROMOTION_ID), 0) FROM t_promotion'));
function retirer() {
  const l = Object.values(promos).filter(Boolean).join(',') || '0';
  exec(`DELETE FROM t_promotion_history WHERE lg_CODE_PROMOTION_ID IN (${l}); DELETE FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID IN (${l});`
    + ` DELETE FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (${l})`);
  for (const x of TOUS) { exec(`UPDATE t_famille SET bl_PROMOTED = ${x.drapeau} WHERE lg_FAMILLE_ID = '${x.id}'`); }
}
const pdfTexte = (b) => { const f = path.join(TMP, 'e' + Date.now() + '.pdf'); fs.writeFileSync(f, b);
  return execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' '); };
const xls = (f) => JSON.parse(execFileSync('python', ['-X', 'utf8', path.resolve(__dirname, '../outils/lire_xls.py'), f], { encoding: 'utf8' }))[0].lignes;
const jj = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0') + '/' + x.getFullYear(); };
const n = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

(async () => {
  droitHisto.remettre();
  ok('Jeu d\'essai : quatre produits, prix différents', TOUS.every((x) => x.id && x.nom) && new Set(TOUS.map((x) => x.pu)).size === 4, TOUS.map((x) => x.cip + ' ' + x.pu).join(', '));
  promos.R = Number(q("INSERT INTO t_promotion (str_TYPE, dt_START_DATE, dt_END_DATE) VALUES ('REMISE', CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 5 DAY); SELECT LAST_INSERT_ID();"));
  A.parametre('FORCER_STOCK_VENTE', '0');
  A.ouvrirCaisse();
  droitAnnuler.accorder();
  droitHisto.accorder();
  const b = await A.ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const attendre = async (ms) => { await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(ms); };
  const message = async () => {
    await p.waitForFunction(() => Ext.Msg.isVisible() && !/patienter/i.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 30000 });
    const t = await p.evaluate(() => Ext.Msg.msg.getEl().dom.innerText);
    await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } });
    await p.waitForTimeout(400);
    return t.replace(/\s+/g, ' ');
  };
  const ventes = [];
  try {
    await vues.connexion(p, A.ENV_E2E.LOGIN, 'e2etest');
    const menu = await p.evaluate(() => { const x = Ext.ComponentQuery.query('navigation')[0].getStore().getNodeById('promotionmanager');
      return x && x.parentNode ? { parent: x.parentNode.get('text'), texte: x.get('text') } : null; });
    const ouvrirPromotions = async () => {
      await vues.ouvrirMenu(p, menu.parent, menu.texte);
      await p.waitForFunction(() => Ext.getCmp('GridPromotionsID') && Ext.getCmp('GridPromotionsID').isVisible(true), null, { timeout: 30000 });
      await p.mouse.click(1000, 700); await p.waitForTimeout(500);
    };
    await ouvrirPromotions();
    await p.waitForTimeout(1500);
    const onglets = await p.evaluate(() => { const c = Ext.ComponentQuery.query('promotionsonglets')[0];
      return c ? c.query('#ongletsPo button').map((x) => (x.isVisible() ? '' : '(cache)') + x.getText()) : []; });
    ok('Menu Promotions : quatre onglets Promotions | Historique | Ventes en promotion | Analyse', onglets.join('|') === 'Promotions|Historique|Ventes en promotion|Analyse', onglets.join('|'));

    const charger = async () => {
      await p.evaluate(() => { const s = Ext.getCmp('GridPromotionsID').getStore(); s.pageSize = 500; s.loadPage(1); });
      await p.waitForFunction(() => !Ext.getCmp('GridPromotionsID').getStore().isLoading(), null, { timeout: 30000 });
      await p.waitForTimeout(600);
    };
    const icone = async (id, qtip) => {
      await charger();
      const i = await p.evaluate((x) => Ext.getCmp('GridPromotionsID').getStore().findExact('lg_CODE_PROMOTION_ID', String(x)), id);
      const row = p.locator('#GridPromotionsID .x-grid-row').nth(i);
      await row.scrollIntoViewIfNeeded();
      await row.locator(`img[data-qtip*="${qtip}"]`).first().click();
    };
    const fenetre = async (titre) => p.locator('.x-window').filter({ hasText: titre }).last();

    /* ---- creation de la promotion UG par « Creer » ---- */
    await p.locator('#GridPromotionsID').getByText('Créer', { exact: true }).first().click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('window combobox[itemId=promoType]').some((c) => c.isVisible(true)), null, { timeout: 15000 });
    const typeId = await p.evaluate(() => Ext.ComponentQuery.query('window combobox[itemId=promoType]').filter((c) => c.isVisible(true))[0].id);
    await p.locator('#' + typeId + '-inputEl').click();
    await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: 'UNITES GRATUITES' }).first().click();
    const finId = await p.evaluate(() => Ext.ComponentQuery.query('window datefield[itemId=promoFin]').filter((c) => c.isVisible(true))[0].id);
    await p.locator('#' + finId + '-inputEl').fill(jj(5)); await p.locator('#' + finId + '-inputEl').press('Tab');
    await (await fenetre('Créer une promotion')).getByText('Enregistrer', { exact: true }).click();
    const tCree = await message();
    promos.U = Number(q(`SELECT IFNULL(MAX(lg_CODE_PROMOTION_ID), 0) FROM t_promotion WHERE str_TYPE = 'UNITES GRATUITES' AND lg_CODE_PROMOTION_ID > ${maxPromo}`)) || null;
    ok('« Créer » : promotion UG enregistrée', !!promos.U, tCree);

    /* ---- modification : fin + 1 jour ---- */
    await icone(promos.U, 'Modifier la promotion');
    await p.waitForFunction(() => Ext.ComponentQuery.query('window datefield[itemId=promoFin]').some((c) => c.isVisible(true)), null, { timeout: 15000 });
    const finM = await p.evaluate(() => Ext.ComponentQuery.query('window datefield[itemId=promoFin]').filter((c) => c.isVisible(true))[0].id);
    await p.locator('#' + finM + '-inputEl').fill(jj(6)); await p.locator('#' + finM + '-inputEl').press('Tab');
    await (await fenetre('Modifier la promotion')).getByText('Enregistrer', { exact: true }).click();
    await message();

    /* ---- produits ---- */
    const champ = async (item) => p.evaluate((c) => { const x = Ext.ComponentQuery.query('window [itemId=' + c + ']').filter((y) => y.isVisible(true))[0]; return x ? x.id : null; }, item);
    const produitsDe = async (id) => {
      await icone(id, 'rer les produits de la promotion');
      await p.waitForFunction(() => Ext.ComponentQuery.query('window combobox[itemId=choixProduit]').some((c) => c.isVisible(true)), null, { timeout: 15000 });
      await p.waitForTimeout(600);
    };
    const fermerProduits = () => p.evaluate(() => { Ext.WindowManager.each((w) => { if (w.isXType && w.isXType('window') && w.isVisible() && /Produits de la promotion/.test(w.title || '')) { w.close(); } }); });
    const ajouter = async (x, valeurs) => {
      const combo = await champ('choixProduit');
      await p.locator('#' + combo + '-inputEl').click();
      await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
      await p.locator('#' + combo + '-inputEl').pressSequentially(x.nom.slice(0, 8), { delay: 40 });
      await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: x.nom }).first().click({ timeout: 20000 });
      await p.waitForTimeout(400);
      let dernier;
      if (valeurs.remise !== undefined) {
        dernier = await champ('champRemise');
        await p.locator('#' + dernier + '-inputEl').fill(String(valeurs.remise));
      } else {
        const m = await champ('champModeUg');
        await p.locator('#' + m + '-inputEl').click();
        await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: valeurs.mode === 'PALIER' ? 'Par palier de' : 'partir de' }).first().click({ timeout: 10000 });
        await p.waitForTimeout(300);
        await p.locator('#' + await champ('champPack') + '-inputEl').fill(String(valeurs.offertes));
        dernier = await champ('champSeuil');
        await p.locator('#' + dernier + '-inputEl').fill(String(valeurs.seuil));
      }
      const rep = p.waitForResponse((r) => r.url().includes('produits/add'), { timeout: 8000 }).catch(() => null);
      await p.locator('#' + dernier + '-inputEl').press('Enter');
      await rep; await p.waitForTimeout(800);
      if (await p.evaluate(() => Ext.Msg.isVisible())) { return message(); }
      return '';
    };
    await produitsDe(promos.U);
    const tAj = [await ajouter(UP, { mode: 'PALIER', seuil: 4, offertes: 1 }), await ajouter(UA, { mode: 'A_PARTIR', seuil: 5, offertes: 1 }),
      await ajouter(UA, { mode: 'A_PARTIR', seuil: 5, offertes: 2 }), await ajouter(UR, { mode: 'A_PARTIR', seuil: 3, offertes: 1 })];
    /* retrait de UR : icone de la ligne, confirmation dans l'icone */
    const rangUR = await p.evaluate((cip) => { const g = Ext.ComponentQuery.query('window gridpanel').filter((x) => x.isVisible(true))[0];
      const r = g.getStore().findRecord('int_CIP', cip); return r ? g.getView().getNode(r).id : null; }, UR.cip);
    await p.locator('#' + rangUR + ' img[data-qtip*="Retirer ce produit"]').first().click();
    await p.waitForTimeout(500);
    await p.locator('.prestige-confirmer-icone').first().click();
    const tRet = await message();
    await fermerProduits();
    await produitsDe(promos.R);
    tAj.push(await ajouter(UM, { remise: 10 }));
    await fermerProduits();
    ok('Ajouts, modification et retrait par l\'écran acceptés', tAj.every((t) => t === '') && /retir/i.test(tRet), tAj.concat(tRet).join(' ; '));

    /* ---- ventes au comptant ---- */
    const nouvelleVente = async () => {
      await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
      await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
      await p.mouse.click(1000, 600); await p.waitForTimeout(800);
      await vues.cliquer(p, 'cloturerventemanager #addBtn');
      await p.waitForFunction((c) => Ext.ComponentQuery.query(c).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 });
      await p.waitForTimeout(1500);
    };
    const scanner = async (cip) => { await vues.cliquer(p, CHAMP); await p.keyboard.type(cip, { delay: 30 }); await p.keyboard.press('Enter'); await attendre(1500); };
    const quantite = async (cip, k) => {
      const id = await p.evaluate(([c, sel]) => { const g = Ext.ComponentQuery.query(sel).filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
        const r = g.getStore().findRecord('intCIP', c); const col = g.columns.filter((x) => x.dataIndex === 'intQUANTITY')[0];
        const cel = g.getView().getCell(r, col); cel.dom.id = cel.dom.id || 'e2e-qd-' + c; return cel.dom.id; }, [cip, GRILLE]);
      await p.click('#' + id); await p.waitForTimeout(500);
      await p.keyboard.press('Control+A'); await p.keyboard.type(String(k), { delay: 40 }); await p.keyboard.press('Enter');
      await attendre(2000);
    };
    const terminer = async () => {
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
      return c.success === true;
    };
    const vendre = async (lignes) => {
      await nouvelleVente();
      let v = null;
      for (const [x, k] of lignes) {
        await scanner(x.cip);
        if (!v) { v = await p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID); A.etat.ventes.push(v); }
        if (k !== 1) { await quantite(x.cip, k); }
      }
      const fini = await terminer();
      return { id: v, ref: q(`SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${v}'`), fini };
    };
    ventes.push(await vendre([[UP, 9], [UA, 12], [UM, 3]]));
    ventes.push(await vendre([[UP, 4]]));
    ventes.push(await vendre([[UM, 1]]));
    ok('Trois ventes au comptant terminées', ventes.every((v) => v.fini && A.vente(v.id).statut === 'is_Closed'), ventes.map((v) => v.ref).join(','));

    /* V3 annulee par l'ecran « Vente terminees » */
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

    /* ---- cloture de la promotion UG ---- */
    await ouvrirPromotions();
    await icone(promos.U, 'turer la promotion');
    await p.waitForTimeout(500);
    await p.locator('.prestige-confirmer-icone').first().click();
    const tClo = await message();
    ok('« Clôturer » la promotion UG', /cl.tur/i.test(tClo), tClo);

    /* ---- bilan du journal en base ---- */
    const journal = q(`SELECT GROUP_CONCAT(CONCAT_WS('~', IFNULL(str_ACTION, ''), int_CIP, IFNULL(lg_USER_ID, ''), IFNULL(str_AVANT, '')) ORDER BY lg_CODE_PROMOTION_HISTORY SEPARATOR '#')`
      + ` FROM t_promotion_history WHERE lg_CODE_PROMOTION_ID = ${promos.U}`).split('#').map((x) => x.split('~'));
    const attendu = [['CREATION', ''], ['MODIFICATION PROMOTION', ''], ['AJOUT', UP.cip], ['AJOUT', UA.cip], ['MODIFICATION', UA.cip], ['AJOUT', UR.cip],
      ['RETRAIT', UR.cip], ['CLOTURE', '']];
    ok('Journal (base) : exactement les 8 actions, dans l\'ordre, sur le bon produit', journal.length === 8 && attendu.every((a, k) => journal[k][0] === a[0] && journal[k][1] === a[1]),
      journal.map((x) => x[0] + ':' + x[1]).join(', '));
    ok('Journal (base) : chaque action porte l\'utilisateur du test', journal.length === 8 && journal.every((x) => x[2] === UTIL), journal.map((x) => x[2]).join(','));
    const avants = journal.map((x) => x[3]);
    ok('Journal (base) : valeurs d\'avant (modification de la promotion, du produit, retrait, clôture)',
      /UNITES GRATUITES du \d\d\/\d\d\/\d{4} au /.test(avants[1]) && avants[1].endsWith(jj(5)) && avants[4] === 'À partir de 5 : 1 offerte(s)'
      && avants[6] === 'À partir de 3 : 1 offerte(s)' && avants[7].endsWith(jj(6)) && avants[0] === '' && avants[2] === '',
      avants.join(' | '));
    const jR = q(`SELECT GROUP_CONCAT(CONCAT_WS('~', str_ACTION, int_CIP, lg_USER_ID) SEPARATOR '#') FROM t_promotion_history WHERE lg_CODE_PROMOTION_ID = ${promos.R}`);
    ok('Journal (base) : l\'ajout de UM à la promotion REMISE, et rien d\'autre', jR === ['AJOUT', UM.cip, UTIL].join('~'), jR);

    /* ---- onglet Historique ---- */
    await ouvrirPromotions();
    await p.locator('promotionsonglets, .po-hub').first().waitFor({ timeout: 10000 }).catch(() => {});
    await vues.cliquer(p, 'promotionsonglets #po-historique');
    const attendreGrille = async (sel) => {
      await p.waitForTimeout(300);
      await p.waitForFunction((s) => { const g = Ext.ComponentQuery.query(s)[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, sel, { timeout: 30000 });
      await p.waitForTimeout(500);
    };
    await attendreGrille('promotionsonglets #promotionHistorique');
    const filtrerProduit = async (prefixe, texte, grille) => {
      await vues.cliquer(p, `promotionsonglets #${prefixe}Produit`);
      await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
      if (texte) { await p.keyboard.type(texte, { delay: 20 }); }
      await p.keyboard.press('Enter');
      await attendreGrille(grille);
    };
    const lireHisto = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('promotionsonglets #promotionHistorique')[0];
      return g.getStore().getRange().map((r) => { const cel = g.getView().getNode(r).querySelectorAll('td');
        return Array.prototype.map.call(cel, (c) => c.innerText.replace(/\s+/g, ' ').trim()); }); });
    await filtrerProduit('ph', UA.nom, 'promotionsonglets #promotionHistorique');
    let h = await lireHisto();
    const baseUA = q(`SELECT GROUP_CONCAT(CONCAT_WS('~', DATE_FORMAT(dt_PROMOTED_DATE, '%d/%m/%Y %H:%i'), str_ACTION, lg_CODE_PROMOTION_ID, IFNULL(str_AVANT, '')) ORDER BY dt_PROMOTED_DATE DESC, lg_CODE_PROMOTION_HISTORY DESC SEPARATOR '#')`
      + ` FROM t_promotion_history WHERE str_NAME LIKE '%${UA.nom.replace(/'/g, "''")}%'`).split('#').map((x) => x.split('~'));
    const LIB = { AJOUT: 'Ajout du produit', MODIFICATION: 'Modification du produit', RETRAIT: 'Retrait du produit' };
    ok('Historique, filtre produit UA : écran = base, ligne à ligne (date, action, promotion, avant, après, utilisateur)', h.length === baseUA.length && h.length === 2
      && h.every((l, k) => l[0] === baseUA[k][0] && l[1] === LIB[baseUA[k][1]] && l[2] === baseUA[k][2] && l[6] === baseUA[k][3] && l[9] === NOM_UTIL)
      && h[0][7] === 'À partir de 5 : 2 offerte(s)' && h[1][7] === 'À partir de 5 : 1 offerte(s)', JSON.stringify(h));

    /* tri par Action : clic sur l'en-tete (tri du serveur) */
    await filtrerProduit('ph', '', 'promotionsonglets #promotionHistorique');
    const entete = await p.evaluate(() => { const g = Ext.ComponentQuery.query('promotionsonglets #promotionHistorique')[0];
      const c = g.columns.filter((x) => x.dataIndex === 'action')[0]; return c.getEl().id; });
    await p.click('#' + entete + ' .x-column-header-text');
    await attendreGrille('promotionsonglets #promotionHistorique');
    const tri = await p.evaluate(() => { const g = Ext.ComponentQuery.query('promotionsonglets #promotionHistorique')[0];
      return { sens: g.getStore().sorters.first().direction, actions: g.getStore().getRange().map((r) => r.get('action')) }; });
    const ordre = q(`SELECT GROUP_CONCAT(IFNULL(str_ACTION, '') ORDER BY str_ACTION ${tri.sens}, lg_CODE_PROMOTION_HISTORY ${tri.sens} SEPARATOR '#') FROM (SELECT * FROM t_promotion_history ORDER BY str_ACTION ${tri.sens}, lg_CODE_PROMOTION_HISTORY ${tri.sens} LIMIT 50) x`).split('#');
    ok('Historique : tri par Action au clic sur l\'en-tête = ordre de la base', tri.actions.length > 0 && tri.actions.join('#') === ordre.slice(0, tri.actions.length).join('#'),
      tri.sens + ' ' + tri.actions.slice(0, 8).join(',') + ' / ' + ordre.slice(0, 8).join(','));

    /* filtre Action « Retrait du produit » + produit UR */
    const actionId = await p.evaluate(() => Ext.ComponentQuery.query('promotionsonglets #phAction')[0].id);
    await p.locator('#' + actionId + '-inputEl').click();
    await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: 'Retrait du produit' }).first().click();
    await filtrerProduit('ph', UR.nom, 'promotionsonglets #promotionHistorique');
    h = await lireHisto();
    ok('Historique, filtre Action « Retrait » et produit UR : une ligne, avant « À partir de 3 : 1 offerte(s) », après « — »',
      h.length === 1 && h[0][1] === 'Retrait du produit' && h[0][6] === 'À partir de 3 : 1 offerte(s)' && h[0][7] === '—', JSON.stringify(h));

    /* PDF et Excel de l'historique, filtre produit UA */
    await p.locator('#' + actionId + '-inputEl').click();
    await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: 'Toutes les actions' }).first().click();
    await filtrerProduit('ph', UA.nom, 'promotionsonglets #promotionHistorique');
    h = await lireHisto();
    const pdf = async (bouton) => {
      const pop = ctx.waitForEvent('page', { timeout: 20000 });
      await vues.cliquer(p, `promotionsonglets #${bouton}`);
      const page = await pop; const url = page.url(); await page.close().catch(() => {});
      const r = await ctx.request.get(url);
      return { type: r.headers()['content-type'], texte: pdfTexte(await r.body()) };
    };
    const excel = async (bouton) => {
      const dl = p.waitForEvent('download', { timeout: 30000 });
      await vues.cliquer(p, `promotionsonglets #${bouton}`);
      const d = await dl; const f = path.join(TMP, 'x' + Date.now() + '.xls'); await d.saveAs(f);
      return { nom: d.suggestedFilename(), lignes: xls(f) };
    };
    const pH = await pdf('historiquePdf');
    ok('Historique : PDF = écran (chaque ligne : date, action, avant, après, utilisateur)', /pdf/.test(pH.type) && /HISTORIQUE DES PROMOTIONS/.test(pH.texte)
      && h.every((l) => pH.texte.includes(l[0]) && pH.texte.includes(l[1]) && pH.texte.includes(l[7]) && pH.texte.includes(NOM_UTIL)) && pH.texte.includes('2 ligne(s)'), pH.texte.slice(0, 400));
    const xH = await excel('historiqueExcel');
    const corpsH = xH.lignes.filter((l) => /^\d\d\/\d\d\/\d{4}/.test(String(l[0])));
    ok('Historique : Excel = écran, ligne à ligne', /historique_promotions\.xls/.test(xH.nom) && corpsH.length === h.length
      && corpsH.every((l, k) => l[0] === h[k][0] && l[1] === h[k][1] && String(l[2]) === h[k][2] && l[6] === h[k][6] && l[7] === h[k][7] && l[9] === h[k][9]), JSON.stringify(corpsH));

    /* ---- onglet Ventes en promotion ---- */
    await vues.cliquer(p, 'promotionsonglets #po-ventes');
    await attendreGrille('promotionsonglets #promotionVentes');
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('promotionsonglets #promotionVentes')[0]; g.getStore().pageSize = 500; });
    await vues.cliquer(p, 'promotionsonglets #pvRechercher');
    await attendreGrille('promotionsonglets #promotionVentes');
    const lireVentes = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('promotionsonglets #promotionVentes')[0];
      return g.getStore().getRange().map((r) => Object.assign({}, r.data, { texte: Array.prototype.map.call(g.getView().getNode(r).querySelectorAll('td'), (c) => c.innerText.replace(/\s+/g, ' ').trim()) })); });
    let lv = await lireVentes();
    const nos = lv.filter((l) => ventes.some((v) => v.ref === l.refVente));
    const CAS = [
      { v: 0, f: UP, qte: 11, off: 2, montant: 9 * UP.pu, avant: UP.pu, mention: 'PROMOTION 8+2 OFFERT(S)' },
      { v: 0, f: UA, qte: 12, off: 2, montant: 10 * UA.pu, avant: UA.pu, mention: 'PROMOTION 5+2 OFFERT(S)' },
      { v: 0, f: UM, qte: 3, off: 0, montant: 3 * Math.round(UM.pu * 0.9), avant: UM.pu, mention: 'PROMOTION' },
      { v: 1, f: UP, qte: 5, off: 1, montant: 4 * UP.pu, avant: UP.pu, mention: 'PROMOTION 4+1 OFFERT(S)' },
    ];
    ok('Ventes en promotion : 4 lignes pour V1 et V2, aucune pour V3 annulée', nos.length === 4 && !lv.some((l) => l.refVente === ventes[2].ref), nos.map((l) => l.refVente + ' ' + l.cip).join(', '));
    for (const c of CAS) {
      const e = nos.find((l) => l.refVente === ventes[c.v].ref && l.cip === c.f.cip) || {};
      const bs = q(`SELECT CONCAT_WS('|', int_QUANTITY, IFNULL(int_FREE_PACK_NUMBER, 0), int_PRICE, int_PRICE_UNITAIR, IFNULL(promo_prix_avant, '')) FROM t_preenregistrement_detail`
        + ` WHERE lg_PREENREGISTREMENT_ID = '${ventes[c.v].id}' AND lg_FAMILLE_ID = '${c.f.id}'`).split('|').map(Number);
      ok(`Ventes, ${ventes[c.v].ref} ${c.f.cip} : attendu = base = écran (qté ${c.qte}, ${c.off} offertes, montant ${c.montant}, « ${c.mention} », coût)`,
        bs[0] === c.qte && bs[1] === c.off && bs[2] === c.montant && bs[4] === c.avant && e.quantite === c.qte && e.offertes === c.off && e.payees === c.qte - c.off
        && e.montant === c.montant && e.prixAvant === c.avant && e.remise === c.avant * c.qte - c.montant && e.mention === c.mention && e.vendeur === NOM_UTIL
        && e.texte[5] === c.mention && chiffres(e.texte[11]) === c.montant, JSON.stringify({ bs, e }));
    }
    /* rapprochement avec le ticket (mention) */
    const apercu = await p.evaluate(async (v) => (await fetch('../api/v1/vente/ticket/vno/' + v + '/apercu')).json(), ventes[0].id);
    const mentions = [];
    for (const bloc of (apercu.tickets && apercu.tickets[0] ? apercu.tickets[0].blocs : [])) {
      for (const x of bloc.elements) { if (x.genre === 'TEXTE' && bloc.id === 'CORPS' && /PROMOTION/.test(x.a)) { mentions.push(String(x.a).trim()); } }
    }
    ok('Rapprochement : mentions de l\'onglet Ventes = mentions du ticket de V1', ['PROMOTION 8+2 OFFERT(S)', 'PROMOTION 5+2 OFFERT(S)', 'PROMOTION'].every((m) => mentions.includes(m)),
      mentions.join(' ; '));
    const totaux = await p.evaluate(() => Ext.ComponentQuery.query('promotionsonglets #pvTotaux')[0].getEl().dom.innerText.replace(/\s+/g, ' '));
    const somme = lv.reduce((s, l) => s + l.montant, 0), cout = lv.reduce((s, l) => s + l.remise, 0);
    ok('Ventes : totaux affichés = somme des lignes (montant, coût)', totaux.includes('montant ' + n(somme) + ' F') && totaux.includes('promotion ' + n(cout) + ' F'), totaux + ' / ' + somme + ' / ' + cout);

    /* PDF et Excel des ventes, filtre produit UP */
    await filtrerProduit('pv', UP.nom, 'promotionsonglets #promotionVentes');
    lv = await lireVentes();
    const pV = await pdf('ventesPdf');
    ok('Ventes : PDF = écran (vente, mention, montant de chaque ligne ; total)', /VENTES EN PROMOTION/.test(pV.texte)
      && lv.every((l) => pV.texte.includes(l.refVente) && pV.texte.includes(l.mention) && pV.texte.includes(n(l.montant)))
      && pV.texte.includes('TOTAL') && pV.texte.includes(n(lv.reduce((s, l) => s + l.montant, 0))), pV.texte.slice(0, 500));
    const xV = await excel('ventesExcel');
    const corpsV = xV.lignes.filter((l) => /^\d\d\/\d\d\/\d{4}/.test(String(l[0])));
    const totV = xV.lignes.find((l) => l[0] === 'TOTAL') || [];
    ok('Ventes : Excel = écran, ligne à ligne, et ligne TOTAL', corpsV.length === lv.length
      && corpsV.every((l, k) => l[1] === lv[k].refVente && l[5] === lv[k].mention && l[6] === lv[k].quantite && l[8] === lv[k].offertes && l[11] === lv[k].montant && l[12] === lv[k].remise)
      && totV[11] === lv.reduce((s, l) => s + l.montant, 0), JSON.stringify(corpsV.slice(0, 3)) + ' ' + JSON.stringify(totV));

    /* ---- onglet Analyse : vendeur = compte de test, sans filtre produit ---- */
    await filtrerProduit('pv', '', 'promotionsonglets #promotionVentes');
    await vues.cliquer(p, 'promotionsonglets #po-analyse');
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('promotionsonglets #paContenu')[0]; return c && /po-tuiles/.test(c.getEl().dom.innerHTML); }, null, { timeout: 30000 });
    const vendeurId = await p.evaluate(() => Ext.ComponentQuery.query('promotionsonglets #paVendeur')[0].id);
    await p.locator('#' + vendeurId + '-inputEl').click();
    await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: NOM_UTIL }).first().click();
    await p.waitForTimeout(500);
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('promotionsonglets')[0]; return c.donneesAnalyse && !c.analyse.getEl().isMasked(); }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const an = await p.evaluate(() => { const c = Ext.ComponentQuery.query('promotionsonglets')[0], dom = c.down('#paContenu').getEl().dom;
      return { o: c.donneesAnalyse, tuiles: Array.prototype.map.call(dom.querySelectorAll('.pml-tuile-valeur'), (x) => x.innerText.trim()),
        barres: Array.prototype.map.call(dom.querySelectorAll('.po-barre-v'), (x) => Number(x.getAttribute('data-montant'))),
        types: Array.prototype.map.call(dom.querySelectorAll('tr.po-par-type-l'), (x) => x.innerText.replace(/\s+/g, ' ').trim()) }; });
    /* lignes du meme vendeur dans l'onglet Ventes (memes filtres) */
    await vues.cliquer(p, 'promotionsonglets #po-ventes');
    await attendreGrille('promotionsonglets #promotionVentes');
    const venId = await p.evaluate(() => Ext.ComponentQuery.query('promotionsonglets #pvVendeur')[0].id);
    await p.locator('#' + venId + '-inputEl').click();
    await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: NOM_UTIL }).first().click();
    await attendreGrille('promotionsonglets #promotionVentes');
    lv = await lireVentes();
    const sum = (f, filt) => lv.filter(filt || (() => true)).reduce((s, l) => s + f(l), 0);
    const t = an.o.total;
    ok('Analyse : total = somme des lignes de l\'onglet Ventes (même vendeur) : ventes, payées, offertes, montant, coût',
      t.lignes === lv.length && t.ventes === new Set(lv.map((l) => l.refVente)).size && t.payees === sum((l) => l.payees) && t.offertes === sum((l) => l.offertes)
      && t.montant === sum((l) => l.montant) && t.remise === sum((l) => l.remise), JSON.stringify(t) + ' / ' + lv.length);
    ok('Analyse : tuiles affichées = total', an.tuiles[0] === n(t.ventes) && an.tuiles[1] === n(t.montant) + ' F' && an.tuiles[2] === n(t.offertes) && an.tuiles[3] === n(t.remise) + ' F', an.tuiles.join(' | '));
    ok('Analyse : par type = somme des lignes de ce type', an.o.parType.every((g) => g.montant === sum((l) => l.montant, (l) => l.type === g.cle)
      && g.offertes === sum((l) => l.offertes, (l) => l.type === g.cle)) && an.o.parType.reduce((s, g) => s + g.montant, 0) === t.montant, JSON.stringify(an.o.parType));
    ok('Analyse : par jour, somme = total ; top 10 : au plus 10 barres, dans l\'ordre des montants', an.o.parJour.reduce((s, g) => s + g.montant, 0) === t.montant
      && an.barres.length === Math.min(10, new Set(lv.map((l) => l.cip)).size) && an.barres.every((v, k) => k === 0 || an.barres[k - 1] >= v), an.barres.join(','));
    await vues.cliquer(p, 'promotionsonglets #po-analyse');
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('promotionsonglets')[0]; return c.donneesAnalyse && !c.analyse.getEl().isMasked(); }, null, { timeout: 30000 });
    const pA = await pdf('analysePdf');
    ok('Analyse : PDF = écran (sections, total, vendeur)', /ANALYSE DES PROMOTIONS/.test(pA.texte) && /Par type/.test(pA.texte) && /Par jour/.test(pA.texte)
      && pA.texte.includes(n(t.montant)) && pA.texte.includes(n(t.remise)) && pA.texte.includes('vendeur : ' + NOM_UTIL), pA.texte.slice(0, 500));
    const xA = await excel('analyseExcel');
    const totA = xA.lignes.find((l) => l[0] === 'Total') || [];
    ok('Analyse : Excel, ligne Total = écran', totA[2] === t.ventes && totA[4] === t.payees && totA[5] === t.offertes && totA[6] === t.montant && totA[7] === t.remise, JSON.stringify(totA));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));

    /* ---- sans le droit Historique : nouvelle session ---- */
    droitHisto.reprendre();
    droitHisto.retirer();
    const p2 = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    await vues.connexion(p2, A.ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p2, menu.parent, menu.texte);
    await p2.waitForFunction(() => Ext.getCmp('GridPromotionsID') && Ext.getCmp('GridPromotionsID').isVisible(true), null, { timeout: 30000 });
    await p2.waitForTimeout(2000);
    const sans = await p2.evaluate(async () => { const c = Ext.ComponentQuery.query('promotionsonglets')[0];
      const r = await fetch('../api/v1/promotions-suivi/historique'), v = await fetch('../api/v1/promotions-suivi/ventes');
      return { historique: c.down('#po-historique').isVisible(), ventes: c.down('#po-ventes').isVisible(), statut: r.status, statutVentes: v.status }; });
    ok('Sans le droit « Historique des promotions » : onglet caché, service refusé (403) ; Ventes et Analyse restent', !sans.historique && sans.ventes && sans.statut === 403
      && sans.statutVentes === 200, JSON.stringify(sans));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    droitAnnuler.reprendre();
    droitHisto.reprendre();
    droitHisto.remettre();
    retirer();
    A.nettoyer();
    fs.rmSync(TMP, { recursive: true, force: true });
    ok('Promotions d\'essai retirées', q(`SELECT COUNT(*) FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (${Object.values(promos).filter(Boolean).join(',') || 0})`) === '0');
    process.exit(A.bilan() ? 1 : 0);
  }
})();
