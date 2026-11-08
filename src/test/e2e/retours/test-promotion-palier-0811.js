/* PLAN DU 06/11, POINTS 3.2 ET 3.5 (DEMANDE DU 07/11) : PROMOTION EN UNITES GRATUITES « PAR PALIER DE » ET « A PARTIR DE ».
 *
 * Demande : « pour 4 achetes 1 offert, si le client achete 9 il aura 2 bonus », ticket « PROMOTION 8+2 OFFERT(S) » ;
 * « a partir de 5, 1 gratuite » : « PROMOTION 5+1 OFFERT(S) » au lieu de « PROMOTION DONT 1 OFFERTE(S) ».
 * Reponses retenues (recapitulatif du 07/11, valide) : « a partir de » une seule fois ; par palier, les offertes
 * s'AJOUTENT aux boites payees (9 payees -> 11 boites) ; la caisse les ajoute toute seule, stock controle sur le tout.
 * Par les ecrans (compte de test) :
 *  - Promotions > « Gerer les produits » : UP ajoute « Par palier de » 4, 1 offerte ; UA « A partir de » 5, 1 offerte ;
 *    base : option enregistree (PALIER / A_PARTIR), copiee dans l'historique ; colonne « Option » de la fenetre ;
 *  - vente au comptant : UP scanne, quantite 9 tapee dans la cellule -> ligne de 11, 2 offertes, montant 9 x PU,
 *    « PROMOTION 8+2 OFFERT(S) » ; la cellule rouverte montre 9 (les payees) ; 4 -> 5 (« 4+1 ») ; 3 -> 3 (« PROMOTION ») ;
 *    9 -> 11 ; UA quantite 12 -> 1 offerte seulement (une seule fois), montant 11 x PU, « PROMOTION 5+1 OFFERT(S) » ;
 *  - stock : UQ (par palier de 4, stock 10, FORCER_STOCK_VENTE = 0) : 9 tapees = 11 boites, refuse, ligne inchangee ;
 *    8 tapees = 10 boites, accepte ;
 *  - la ligne garde la promotion du jour de la vente (type, option, seuil, gratuites, prix d'avant) ;
 *  - rapprochement ligne par ligne : attendu = ecran = ticket (apercu) = base ; total = vente = caisse ;
 *  - promotion modifiee puis supprimee apres la vente : la reimpression montre toujours « 8+2 » et « 5+1 » ;
 *  - bilan : stock = avant - quantite de la ligne (offertes comprises), une sortie par ligne ; annulation : tout rendu.
 * Tout est retire a la fin.
 * Lancement seul : node src/test/e2e/retours/test-promotion-palier-0811.js
 */
const { chromium } = require('playwright-core');
const A = require('../audits/commun');
const vues = require('../outils/vues');
const privilegeEssai = require('../support/privilege-essai');
const { ok, q, exec } = A;

const chiffres = (t) => Number(String(t || '').replace(/[^\d-]/g, '')) || 0;
const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
const GRILLE = 'doventemanager gridpanel';
const droitAnnuler = privilegeEssai(q, exec, A.ENV_E2E.LOGIN, 'P_BT_ANNULER_VENTE');

/* trois produits sans promotion, CIP a 7 chiffres, noms sans apostrophe, prix differents */
const filtre = " AND f.int_PRICE BETWEEN 1000 AND 5000 AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.str_NAME NOT LIKE '%''%' AND LENGTH(f.str_NAME) >= 8"
  + ' AND NOT EXISTS (SELECT 1 FROM t_promotion_product pp WHERE pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID)';
const UP = A.produit(13, 60, filtre), UA = A.produit(29, 60, filtre), UQ = A.produit(47, 10, filtre);
for (const x of [UP, UA, UQ]) {
  const [cip, nom, drapeau] = q(`SELECT CONCAT_WS('|', int_CIP, str_NAME, IFNULL(bl_PROMOTED + 0, 'NULL')) FROM t_famille WHERE lg_FAMILLE_ID = '${x.id}'`).split('|');
  Object.assign(x, { cip, nom, drapeau });
}
let promo = null;
function retirer() {
  if (promo) {
    exec(`DELETE FROM t_promotion_history WHERE lg_CODE_PROMOTION_ID = ${promo}; DELETE FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID = ${promo};`
      + ` DELETE FROM t_promotion WHERE lg_CODE_PROMOTION_ID = ${promo}`);
  }
  for (const x of [UP, UA, UQ]) {
    exec(`UPDATE t_famille SET bl_PROMOTED = ${x.drapeau} WHERE lg_FAMILLE_ID = '${x.id}'`);
  }
}
const ligneBase = (v, f) => {
  const r = q(`SELECT CONCAT_WS('|', int_QUANTITY, int_QUANTITY_SERVED, int_PRICE_UNITAIR, int_PRICE, IFNULL(int_FREE_PACK_NUMBER, 0), IFNULL(promotion_produit_id, ''),`
    + ` IFNULL(promo_type, ''), IFNULL(promo_mode, ''), IFNULL(promo_seuil, ''), IFNULL(promo_gratuites, ''), IFNULL(promo_prix_avant, ''), IFNULL(int_AVOIR, 0))`
    + ` FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${v}' AND lg_FAMILLE_ID = '${f.id}'`).split('|');
  return { qte: Number(r[0]), servie: Number(r[1]), pu: Number(r[2]), montant: Number(r[3]), offertes: Number(r[4]), promo: r[5] !== '',
    type: r[6], mode: r[7], seuil: r[8], gratuites: r[9], prixAvant: r[10], avoir: Number(r[11]) };
};

(async () => {
  ok('Jeu d\'essai : trois produits de prix différents', [UP, UA, UQ].every((x) => x.id && x.cip && x.nom) && new Set([UP.pu, UA.pu, UQ.pu]).size === 3,
    [UP, UA, UQ].map((x) => x.cip + ' ' + x.pu).join(', '));
  promo = Number(q("INSERT INTO t_promotion (str_TYPE, dt_START_DATE, dt_END_DATE) VALUES ('UNITES GRATUITES', CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 5 DAY); SELECT LAST_INSERT_ID();"));
  A.parametre('FORCER_STOCK_VENTE', '0');
  A.ouvrirCaisse();
  droitAnnuler.accorder();
  const stockAvant = { UP: A.stock(UP), UA: A.stock(UA), UQ: A.stock(UQ) };
  const b = await A.ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  let vente = null;
  const attendre = async (ms) => { await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(ms); };
  const message = async () => {
    await p.waitForFunction(() => Ext.Msg.isVisible() && !/patienter/i.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 30000 });
    const t = await p.evaluate(() => Ext.Msg.msg.getEl().dom.innerText);
    await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } });
    await p.waitForTimeout(400);
    return t.replace(/\s+/g, ' ');
  };
  try {
    await vues.connexion(p, A.ENV_E2E.LOGIN, 'e2etest');

    /* ---- 1. Promotions > Gerer les produits : option par palier / a partir de ---- */
    const menu = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getNodeById('promotionmanager');
      return n && n.parentNode ? { parent: n.parentNode.get('text'), texte: n.get('text') } : null; });
    await vues.ouvrirMenu(p, menu.parent, menu.texte);
    await p.waitForFunction(() => Ext.getCmp('GridPromotionsID') && Ext.getCmp('GridPromotionsID').isVisible(true), null, { timeout: 30000 });
    await p.evaluate(() => { const s = Ext.getCmp('GridPromotionsID').getStore(); s.pageSize = 500; s.loadPage(1); });
    await p.waitForFunction(() => !Ext.getCmp('GridPromotionsID').getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(600);
    const i = await p.evaluate((x) => Ext.getCmp('GridPromotionsID').getStore().findExact('lg_CODE_PROMOTION_ID', String(x)), promo);
    const row = p.locator('#GridPromotionsID .x-grid-row').nth(i);
    await row.scrollIntoViewIfNeeded();
    await row.locator('img[data-qtip*="rer les produits de la promotion"]').first().click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('window combobox[itemId=choixProduit]').some((c) => c.isVisible(true)), null, { timeout: 15000 });
    await p.waitForTimeout(600);
    const champ = async (item) => p.evaluate((c) => Ext.ComponentQuery.query('window [itemId=' + c + ']').filter((x) => x.isVisible(true))[0].id, item);
    const optionVisible = await p.evaluate(() => Ext.ComponentQuery.query('window combobox[itemId=champModeUg]').some((c) => c.isVisible(true)));
    ok('Fenêtre des produits : liste « À partir de / Par palier de » visible pour une promotion en unités gratuites', optionVisible);
    const ajouter = async (x, mode, seuil, offertes) => {
      const combo = await champ('choixProduit');
      await p.locator('#' + combo + '-inputEl').click();
      await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
      await p.locator('#' + combo + '-inputEl').pressSequentially(x.nom.slice(0, 8), { delay: 40 });
      await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: x.nom }).first().click({ timeout: 20000 });
      await p.waitForTimeout(400);
      if (optionVisible) {
        const m = await champ('champModeUg');
        await p.locator('#' + m + '-inputEl').click();
        await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: mode === 'PALIER' ? 'Par palier de' : 'partir de' }).first().click({ timeout: 10000 });
        await p.waitForTimeout(300);
      }
      const pk = await champ('champPack');
      await p.locator('#' + pk + '-inputEl').fill(String(offertes));
      const sl = await champ('champSeuil');
      await p.locator('#' + sl + '-inputEl').fill(String(seuil));
      const rep = p.waitForResponse((r) => r.url().includes('produits/add'), { timeout: 8000 }).catch(() => null);
      await p.locator('#' + sl + '-inputEl').press('Enter');
      const r = await rep;
      await p.waitForTimeout(800);
      /* un ajout reussi ne montre pas de message ; un refus en montre un */
      const visible = await p.evaluate(() => Ext.Msg.isVisible());
      return (r ? r.status() : 'pas d\'appel') + (visible ? ' ' + await message() : '');
    };
    const tUP = await ajouter(UP, 'PALIER', 4, 1);
    const tUA = await ajouter(UA, 'A_PARTIR', 5, 1);
    const tUQ = await ajouter(UQ, 'PALIER', 4, 1);
    const champPack = await p.evaluate(() => { const c = Ext.ComponentQuery.query('window numberfield[itemId=champPack]').filter((x) => x.isVisible(true))[0];
      return c ? c.inputEl.dom.getAttribute('placeholder') || c.emptyText : null; });
    ok('Texte d\'attente « Unités gratuites » lisible (plus de « &eacute; » affiché)', champPack === 'Unités gratuites', champPack);
    const enBase = (x) => q(`SELECT CONCAT_WS('|', int_ACTIVE_AT, int_PACK_NUMBER, IFNULL(str_MODE_UG, 'NULL')) FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID = ${promo} AND lg_FAMILLE_ID = '${x.id}'`);
    ok('Ajout par l\'écran : UP « par palier de 4, 1 offerte », UA « à partir de 5, 1 offerte » enregistrés avec leur option',
      enBase(UP) === '4|1|PALIER' && enBase(UA) === '5|1|A_PARTIR' && enBase(UQ) === '4|1|PALIER', [tUP, enBase(UP), enBase(UA), enBase(UQ)].join(' ; '));
    const histo = q(`SELECT GROUP_CONCAT(CONCAT(int_CIP, ':', IFNULL(str_MODE_UG, 'NULL')) ORDER BY int_CIP) FROM t_promotion_history WHERE lg_CODE_PROMOTION_ID = ${promo}`);
    ok('Historique : l\'option est gardée avec chaque ajout', histo === [UP, UA, UQ].map((x) => x.cip + ':' + (x === UA ? 'A_PARTIR' : 'PALIER')).sort().join(','), histo);
    const colonne = await p.evaluate(() => { const g = Ext.ComponentQuery.query('window gridpanel').filter((x) => x.isVisible(true))[0];
      return g.getStore().getRange().map((r) => g.getView().getNode(r).innerText.replace(/\s+/g, ' ')); });
    ok('Fenêtre : colonne « Option » lue à l\'écran (Par palier de / À partir de)', colonne.some((t) => t.includes(UP.cip) && /Par palier de/.test(t))
      && colonne.some((t) => t.includes(UA.cip) && /partir de/.test(t) && !/palier/i.test(t)), colonne.join(' || '));
    await p.evaluate(() => { Ext.WindowManager.each((w) => { if (w.isXType && w.isXType('window') && w.isVisible() && /Produits de la promotion/.test(w.title || '')) { w.close(); } }); });

    /* ---- 2. vente au comptant ---- */
    await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    /* le volet du menu peut rester deplie par-dessus la barre : un clic dans la page le replie, comme a la main */
    await p.mouse.click(1000, 600); await p.waitForTimeout(800);
    await vues.cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction((c) => Ext.ComponentQuery.query(c).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const scanner = async (cip) => { await vues.cliquer(p, CHAMP); await p.keyboard.type(cip, { delay: 30 }); await p.keyboard.press('Enter'); await attendre(1500); };
    /* clic dans la cellule QD ; rend la valeur montree par l'editeur, puis tape la nouvelle quantite */
    const quantite = async (cip, n) => {
      const id = await p.evaluate(([c, sel]) => { const g = Ext.ComponentQuery.query(sel).filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
        const r = g.getStore().findRecord('intCIP', c); const col = g.columns.filter((x) => x.dataIndex === 'intQUANTITY')[0];
        const cel = g.getView().getCell(r, col); cel.dom.id = cel.dom.id || 'e2e-qd-' + c; return cel.dom.id; }, [cip, GRILLE]);
      await p.click('#' + id); await p.waitForTimeout(500);
      const montree = await p.evaluate(() => { const e = Ext.ComponentQuery.query('numberfield, textfield').filter((x) => x.isVisible(true) && x.hasFocus)[0]; return e ? String(e.getRawValue()) : null; });
      await p.keyboard.press('Control+A'); await p.keyboard.type(String(n), { delay: 40 }); await p.keyboard.press('Enter');
      await attendre(2000);
      return montree;
    };
    const ecran = () => p.evaluate((sel) => { const g = Ext.ComponentQuery.query(sel).filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
      return g.getStore().getRange().map((r) => ({ cip: String(r.get('intCIP')), qte: r.get('intQUANTITY'), pu: r.get('intPRICEUNITAIR'), montant: r.get('intPRICE'),
        offertes: r.get('unitesOffertes') || 0, texte: g.getView().getNode(r).innerText.replace(/\s+/g, ' ') })); }, GRILLE);
    const ligneEcran = async (x) => (await ecran()).find((l) => l.cip === x.cip) || {};

    await scanner(UP.cip);
    vente = await p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID);
    A.etat.ventes.push(vente);
    await quantite(UP.cip, 9);
    let e = await ligneEcran(UP), base = ligneBase(vente, UP);
    ok('Par palier de 4, 9 tapées : ligne de 11 boîtes, 2 offertes, montant 9 × PU (base)', base.qte === 11 && base.offertes === 2 && base.montant === 9 * UP.pu
      && base.servie === 11 && base.avoir === 0, JSON.stringify(base));
    ok('Écran = base, mention « PROMOTION 8+2 OFFERT(S) »', e.qte === 11 && e.montant === base.montant && e.offertes === 2 && /PROMOTION 8\+2 OFFERT\(S\)/.test(e.texte), JSON.stringify(e));
    ok('La ligne garde la promotion : type, option, seuil, offertes, prix d\'avant', base.type === 'UNITES GRATUITES' && base.mode === 'PALIER' && base.seuil === '4'
      && base.gratuites === '1' && base.prixAvant === String(UP.pu), JSON.stringify(base));
    const montree = await quantite(UP.cip, 4);
    e = await ligneEcran(UP); base = ligneBase(vente, UP);
    ok('Cellule rouverte : elle montre les 9 boîtes payées, pas les 11', montree === '9', montree);
    ok('4 tapées : 5 boîtes, 1 offerte, « PROMOTION 4+1 OFFERT(S) », montant 4 × PU', base.qte === 5 && base.offertes === 1 && base.montant === 4 * UP.pu
      && /PROMOTION 4\+1 OFFERT\(S\)/.test(e.texte) && e.qte === 5, JSON.stringify(base) + ' ' + e.texte);
    await quantite(UP.cip, 3);
    e = await ligneEcran(UP); base = ligneBase(vente, UP);
    ok('3 tapées : 3 boîtes, rien d\'offert, « PROMOTION » seul', base.qte === 3 && base.offertes === 0 && base.montant === 3 * UP.pu
      && /PROMOTION/.test(e.texte) && !/OFFERT/.test(e.texte), JSON.stringify(base) + ' ' + e.texte);
    await quantite(UP.cip, 9);
    base = ligneBase(vente, UP);
    ok('9 tapées de nouveau : 11 boîtes, 2 offertes', base.qte === 11 && base.offertes === 2 && base.montant === 9 * UP.pu, JSON.stringify(base));

    await scanner(UA.cip);
    await quantite(UA.cip, 12);
    e = await ligneEcran(UA); base = ligneBase(vente, UA);
    ok('À partir de 5, 12 boîtes : 1 offerte une seule fois, montant 11 × PU', base.qte === 12 && base.offertes === 1 && base.montant === 11 * UA.pu
      && base.mode === 'A_PARTIR' && base.seuil === '5', JSON.stringify(base));
    ok('Écran : « PROMOTION 5+1 OFFERT(S) »', e.qte === 12 && e.montant === base.montant && /PROMOTION 5\+1 OFFERT\(S\)/.test(e.texte), e.texte);

    /* stock : UQ, stock 10, par palier de 4 ; 9 tapees = 11 boites */
    await scanner(UQ.cip);
    await quantite(UQ.cip, 9);
    const refus = await vues.texteMessage(p).catch(() => '');
    if (refus) { await vues.repondre(p, 'ok').catch(() => {}); await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x && Ext.Msg.isVisible()) { x.btnEl.dom.click(); } }); }
    base = ligneBase(vente, UQ);
    ok('Stock 10, par palier : 9 tapées (11 boîtes) refusées, la ligne reste à 1', base.qte === 1 && base.offertes === 0, JSON.stringify(base) + ' ' + refus);
    await quantite(UQ.cip, 8);
    base = ligneBase(vente, UQ);
    ok('Stock 10 : 8 tapées (10 boîtes, 2 offertes) acceptées', base.qte === 10 && base.offertes === 2 && base.montant === 8 * UQ.pu, JSON.stringify(base));

    /* ---- cloture ---- */
    await vues.cliquer(p, CHAMP);
    await p.keyboard.press('Enter');
    await attendre(2500);
    const lignesEcran = await ecran();
    const rail = await p.evaluate(() => { const lire = (x) => { const f = Ext.ComponentQuery.query('doventemanager #contenu #' + x)[0]; return f ? Number(String(f.getValue()).replace(/\D/g, '')) : null; };
      const c = testextjs.app.getController('VenteCtr'); return { total: Number(String(c.getTotalField().getValue()).replace(/\D/g, '')), net: lire('montantNet') }; });
    await vues.cliquer(p, 'doventemanager #contenu #montantRecu');
    await p.keyboard.press('Control+A'); await p.keyboard.type(String(rail.net), { delay: 20 }); await p.keyboard.press('Tab');
    await p.waitForTimeout(500);
    const rep = p.waitForResponse((x) => /\/vente\/cloturer\/vno/.test(x.url()), { timeout: 120000 });
    await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
    const clot = await (await rep).json().catch(() => ({}));
    await p.waitForTimeout(1500);
    if (/imprimer/i.test(await vues.texteMessage(p))) { await vues.repondre(p, 'no').catch(() => {}); }
    ok('« TERMINER LA VENTE » : vente close', clot.success === true && A.vente(vente).statut === 'is_Closed', JSON.stringify(clot).slice(0, 200));

    /* ---- rapprochement : attendu = ecran = ticket = base ---- */
    const CAS = [
      { f: UP, qte: 11, offertes: 2, montant: 9 * UP.pu, mention: 'PROMOTION 8+2 OFFERT(S)' },
      { f: UA, qte: 12, offertes: 1, montant: 11 * UA.pu, mention: 'PROMOTION 5+1 OFFERT(S)' },
      { f: UQ, qte: 10, offertes: 2, montant: 8 * UQ.pu, mention: 'PROMOTION 8+2 OFFERT(S)' },
    ];
    const lireTicket = async () => {
      const apercu = await p.evaluate(async (v) => (await fetch('../api/v1/vente/ticket/vno/' + v + '/apercu')).json(), vente);
      const t = [];
      for (const bloc of (apercu.tickets && apercu.tickets[0] ? apercu.tickets[0].blocs : [])) {
        for (const x of bloc.elements) {
          if (x.genre === 'ARTICLE') { const [qte, pu] = String(x.b).split('×'); t.push({ qte: chiffres(qte), pu: chiffres(pu), montant: chiffres(x.d), mention: '' }); }
          else if (x.genre === 'TEXTE' && bloc.id === 'CORPS' && t.length && /PROMOTION/.test(x.a)) { t[t.length - 1].mention = String(x.a).trim(); }
        }
      }
      return t;
    };
    let ticket = await lireTicket();
    ok('Ticket : trois lignes', ticket.length === 3, JSON.stringify(ticket));
    for (const c of CAS) {
      const bs = ligneBase(vente, c.f), ec = lignesEcran.find((x) => x.cip === c.f.cip) || {}, t = ticket.find((x) => x.qte === c.qte && x.montant === c.montant) || {};
      ok(`${c.f.cip} : attendu = base = écran = ticket (quantité ${c.qte}, ${c.offertes} offertes, montant ${c.montant}, « ${c.mention} »)`,
        bs.qte === c.qte && bs.offertes === c.offertes && bs.montant === c.montant && ec.qte === c.qte && ec.montant === c.montant && ec.texte.includes(c.mention)
        && t.qte === c.qte && t.pu === bs.pu && t.mention === c.mention, JSON.stringify({ bs, ec: ec.texte, t }));
    }
    const total = CAS.reduce((s, c) => s + c.montant, 0);
    const mvt = q(`SELECT montant FROM mvttransaction WHERE pkey = '${vente}'`);
    ok('Total : attendu = écran = vente = mouvement de caisse', rail.total === total && A.vente(vente).prix === total && Number(mvt) === total,
      `attendu ${total} / écran ${rail.total} / vente ${A.vente(vente).prix} / caisse ${mvt}`);

    /* promotion modifiee puis supprimee apres la vente : la reimpression ne change pas */
    exec(`UPDATE t_promotion_product SET int_ACTIVE_AT = 7, int_PACK_NUMBER = 3, str_MODE_UG = 'A_PARTIR' WHERE lg_CODE_PROMOTION_ID = ${promo}`);
    ticket = await lireTicket();
    ok('Promotion modifiée après la vente : la réimpression garde « 8+2 » et « 5+1 »', CAS.every((c) => ticket.some((t) => t.qte === c.qte && t.mention === c.mention)), JSON.stringify(ticket));
    exec(`DELETE FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID = ${promo}`);
    ticket = await lireTicket();
    ok('Promotion supprimée : la réimpression garde « 8+2 » et « 5+1 »', CAS.every((c) => ticket.some((t) => t.qte === c.qte && t.mention === c.mention)), JSON.stringify(ticket));

    /* ---- bilan ---- */
    const sorties = CAS.map((c) => q(`SELECT IFNULL(GROUP_CONCAT(h.qteMvt), '') FROM hmvtproduit h JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID IN (h.pkey, h.lg_PREENREGISTREMENT_DETAIL_ID)`
      + ` WHERE d.lg_PREENREGISTREMENT_ID = '${vente}' AND d.lg_FAMILLE_ID = '${c.f.id}'`));
    ok('Bilan : stock = avant - boîtes de la ligne (offertes comprises)', A.stock(UP) === stockAvant.UP - 11 && A.stock(UA) === stockAvant.UA - 12 && A.stock(UQ) === stockAvant.UQ - 10,
      `${A.stock(UP)}/${stockAvant.UP} ${A.stock(UA)}/${stockAvant.UA} ${A.stock(UQ)}/${stockAvant.UQ}`);
    ok('Bilan : une seule sortie par ligne, de la quantité de la ligne', CAS.every((c, k) => sorties[k] === String(c.qte)), sorties.join(' ; '));
    ok('Bilan : aucune autre vente créée', A.ventesDuTest().length === 1, A.ventesDuTest().join(','));

    /* ---- annulation par l'ecran ---- */
    await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await vues.cliquer(p, 'ventemanager #query');
    await p.keyboard.press('Control+A'); await p.keyboard.type(q(`SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${vente}'`), { delay: 20 }); await p.keyboard.press('Enter');
    await p.waitForFunction((id) => { const s = Ext.ComponentQuery.query('ventemanager gridpanel')[0].getStore(); return !s.isLoading() && s.findExact('lgPREENREGISTREMENTID', id) >= 0; }, vente, { timeout: 60000 });
    await p.waitForTimeout(800);
    const rang = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], s = g.getStore();
      return g.getView().getNode(s.getAt(s.findExact('lgPREENREGISTREMENTID', id))).id; }, vente);
    await p.locator(`#${rang} img[data-qtip="Annuler.Vente"]`).filter({ visible: true }).first().click();
    await p.waitForTimeout(800);
    await vues.repondre(p, 'yes');
    for (let k = 0; k < 60 && !/impression/i.test(await vues.texteMessage(p)); k++) { await p.waitForTimeout(1000); }
    await vues.repondre(p, 'no').catch(() => {});
    await p.waitForTimeout(1000);
    const annulation = q(`SELECT IFNULL(MAX(lg_PREENREGISTREMENT_ID), '') FROM t_preenregistrement WHERE lg_PARENT_ID = '${vente}' AND int_PRICE < 0`);
    if (annulation) { A.etat.ventes.push(annulation); }
    for (let k = 0; k < 20 && A.stock(UP) !== stockAvant.UP; k++) { await p.waitForTimeout(500); }
    ok('Annulation : stock rendu à l\'identique (offertes comprises)', !!annulation && A.stock(UP) === stockAvant.UP && A.stock(UA) === stockAvant.UA && A.stock(UQ) === stockAvant.UQ,
      `${A.stock(UP)}/${stockAvant.UP} ${A.stock(UA)}/${stockAvant.UA} ${A.stock(UQ)}/${stockAvant.UQ}`);
    const copie = q(`SELECT GROUP_CONCAT(CONCAT_WS(':', int_QUANTITY, IFNULL(promo_mode, ''), IFNULL(promo_seuil, '')) ORDER BY int_QUANTITY) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${annulation}'`);
    ok('Annulation : les lignes d\'annulation gardent la promotion de la vente', copie === '-12:A_PARTIR:5,-11:PALIER:4,-10:PALIER:4', copie);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    droitAnnuler.reprendre();
    retirer();
    A.nettoyer();
    ok('Promotion d\'essai retirée', q(`SELECT COUNT(*) FROM t_promotion WHERE lg_CODE_PROMOTION_ID = ${promo || 0}`) === '0');
    process.exit(A.bilan() ? 1 : 0);
  }
})();
