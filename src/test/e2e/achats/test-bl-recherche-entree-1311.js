/* ENTREE EN STOCK D'UN BL : RECHERCHE PAR LA TOUCHE ENTREE, TEXTE PRESELECTIONNE AU RETOUR (demande du 13/11 :
 * « recherche sur la vue d'entrée en stock trop rapide, revenir à la validation par la touche Entrée ; au retour dans
 * la zone, présélectionner le texte : je fais une recherche, je clique sur le bouton du produit retrouvé pour mettre
 * les UG, à la validation retour dans ce champ, texte précédemment saisi présélectionné »).
 *
 * Constat : la recherche partait pendant la frappe (des 2 caracteres, 350 ms apres la derniere touche) ; apres
 * l'enregistrement des UG, la liste etait rechargee SANS la recherche (liste complete) alors que le champ gardait le
 * texte, et Entree sur ce texte inchange ne relancait rien.
 *
 * Vrai chemin, sur une COPIE de travail : menu > Bon de livraison, icone « Detail livraison » d'un bon d'essai de
 * 4 produits (quantites 1, 2, 3, 4) ; saisie au clavier dans « Recherche » ; icone « Ajout de lot » du produit
 * retrouve ; UG au clavier ; « Enregistrer » puis « Oui ».
 * Controles :
 *  - frappe lente de 4 caracteres puis attente : aucune requete de recherche ; Entree : une requete, avec ce texte ;
 *    le produit cherche est dans la liste et chaque ligne affichee correspond au texte ;
 *  - UG enregistrees (2 puis 0, quantite > 1) : au retour, le curseur est dans « Recherche », le texte saisi est
 *    entierement selectionne, la liste est toujours celle de la recherche ;
 *  - rapprochement : UG de la ligne dans le tableau = t_bon_livraison_detail = lot du bon = saisie ;
 *  - frappe suivante : remplace le texte selectionne ; Entree sur le champ vide : les 4 lignes ;
 *  - bilan : seules la ligne du produit et son lot changent ; stock du produit inchange ; tout est retire a la fin ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-e', s], { encoding: 'utf8' });

const PREFIXE = 'E2E-BRE';
const CANDIDATS = " FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 500 AND f.int_PAF > 200 AND f.str_NAME REGEXP '^[A-Z]{5}' AND f.bool_DECONDITIONNE = 0";
const G = q('SELECT f.lg_GROSSISTE_ID' + CANDIDATS + ' AND f.lg_GROSSISTE_ID IS NOT NULL GROUP BY f.lg_GROSSISTE_ID ORDER BY COUNT(*) DESC LIMIT 1');
/* 4 produits dont les 5 premieres lettres different deux a deux */
const P = [];
for (const l of q(`SELECT f.lg_FAMILLE_ID, f.str_NAME${CANDIDATS} AND f.lg_GROSSISTE_ID = '${G}' ORDER BY f.lg_FAMILLE_ID LIMIT 60 OFFSET 40`).split('\n')) {
  const [id, nom] = l.split('\t');
  if (P.length < 4 && !P.some((x) => x.nom.substr(0, 5) === nom.substr(0, 5) || nom.indexOf(x.nom.substr(0, 5)) >= 0 || x.nom.indexOf(nom.substr(0, 5)) >= 0)) { P.push({ id, nom }); }
}
const LISTE = P.map((x) => "'" + x.id + "'").join(',');
const BL = PREFIXE + '-BL', ORD = PREFIXE + '-ORD', REF = 'E2EBRE' + String(Date.now()).slice(-6);

function retirer() {
  exec(`DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${REF}'; DELETE FROM t_warehouse WHERE str_REF_LIVRAISON = '${REF}';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}';`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${ORD}';`);
}
function creer() {
  const qte = 'CASE f.lg_FAMILLE_ID ' + P.map((x, i) => `WHEN '${x.id}' THEN ${i + 1}`).join(' ') + ' END';
  const idx = 'CASE f.lg_FAMILLE_ID ' + P.map((x, i) => `WHEN '${x.id}' THEN ${i}`).join(' ') + ' END';
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${ORD}', '${REF}', ${P.length}, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${BL}', '${REF}', NOW(), SUM(${qte} * f.int_PAF), 0, SUM(${qte} * f.int_PAF), '${ORD}', 'enable', NOW(), NOW(), MAX(u.lg_USER_ID) FROM t_famille f, t_user u WHERE f.lg_FAMILLE_ID IN (${LISTE}) AND u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
    + ` SELECT CONCAT('${BL}-D', ${idx}), '${G}', f.lg_FAMILLE_ID, '${BL}', ${qte}, 0, ${qte}, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, s.int_NUMBER_AVAILABLE`
    + ` FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID IN (${LISTE});`);
}
const lignes = () => q(`SELECT GROUP_CONCAT(CONCAT_WS('|', lg_FAMILLE_ID, int_QTE_CMDE, int_QTE_RECUE, int_QTE_UG) ORDER BY lg_FAMILLE_ID) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}'`);
const ugBase = (id) => q(`SELECT int_QTE_UG FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}' AND lg_FAMILLE_ID = '${id}'`);
const ugLot = (id) => q(`SELECT IFNULL(SUM(int_NUMBER_GRATUIT), 0) FROM t_lot WHERE str_REF_LIVRAISON = '${REF}' AND lg_FAMILLE_ID = '${id}'`);
const stocks = () => q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER_AVAILABLE) ORDER BY lg_FAMILLE_ID) FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID IN (${LISTE})`);

(async () => {
  ok('Précondition : 4 produits d\'un même grossiste, noms distincts', P.length === 4, JSON.stringify(P.map((x) => x.nom)));
  if (P.length !== 4) { process.exit(1); }
  retirer();
  creer();
  const stockAvant = stocks();
  const lignesAvant = lignes();
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
    const recherches = [];
    p.on('request', (r) => { const m = r.url().match(/commande\/bon\/items\/[^?]*\?(.*)$/); if (m) { recherches.push(new URLSearchParams(m[1]).get('query')); } });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lib = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'bonlivraisonmanager', true);
      return n ? [n.parentNode.get('text'), n.get('text')] : null; });
    if (!lib) { throw new Error('menu bonlivraisonmanager absent'); }
    await ouvrirMenu(p, lib[0], lib[1]);
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, BL, { timeout: 120000 });
    const icone = await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0], v = g.getView();
      const n = v.getNode(g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); n.scrollIntoView();
      const img = n.querySelector('img.x-action-col-0'); img.id = img.id || 'e2e-detail-bl'; return img.id; }, BL);
    await p.click('#' + icone);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() === 4; }, null, { timeout: 120000 });
    await p.waitForTimeout(1000);

    const champ = '#' + await p.evaluate(() => Ext.getCmp('rechercherDetail').inputEl.dom.id);
    const affiches = () => p.evaluate(() => Ext.getCmp('gridpanelID').getStore().getRange().map((r) => r.get('lg_FAMILLE_ID')));
    const cible = P[1], texte = cible.nom.substr(0, 5);
    /* frappe lente : aucune recherche pendant la frappe */
    recherches.length = 0;
    await p.click(champ);
    await p.keyboard.type(texte.substr(0, 4), { delay: 450 });
    await p.waitForTimeout(1500);
    ok('Frappe lente de 4 caractères puis attente : aucune recherche', recherches.length === 0, JSON.stringify(recherches));
    await p.keyboard.type(texte.substr(4), { delay: 50 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    let vus = await affiches();
    ok(`Entrée : une recherche, avec le texte « ${texte} »`, recherches.length === 1 && recherches[0] === texte, JSON.stringify(recherches));
    ok('Entrée : le produit cherché est dans la liste, les autres produits du bon n\'y sont pas', vus.includes(cible.id) && P.filter((x) => x !== cible).every((x) => !vus.includes(x.id)), JSON.stringify(vus));

    const saisirUg = async (ug) => {
      const id = await p.evaluate((pr) => {
        const g = Ext.getCmp('gridpanelID'), col = g.headerCt.getGridColumns().find((c) => c.items && c.items[0] && c.items[0].tooltip === 'Ajout de lot');
        const n = g.getView().getNode(g.getStore().findExact('lg_FAMILLE_ID', pr));
        const img = n.querySelector('.x-grid-cell-' + col.id + ' img'); img.id = 'e2e-lot-' + pr.replace(/[^A-Za-z0-9]/g, ''); return img.id; }, cible.id);
      await p.click('#' + id);
      await p.waitForFunction(() => Ext.getCmp('int_QUANTITE_FREE') && Ext.getCmp('int_QUANTITE_FREE').isVisible(true), null, { timeout: 15000 });
      await p.click('#' + await p.evaluate(() => Ext.getCmp('int_QUANTITE_FREE').inputEl.dom.id), { clickCount: 3 });
      await p.keyboard.press('Control+A');
      await p.keyboard.type(String(ug));
      recherches.length = 0;
      await p.click('#' + await p.evaluate(() => { const f = Ext.getCmp('int_QUANTITE_FREE'), w = f.up('window') || f.up('form');
        return (w.down('button[text=Enregistrer]') || Ext.getCmp('addStockID').up('window').down('button[text=Enregistrer]')).getId(); }));
      await p.locator('.x-message-box .x-btn').filter({ visible: true, hasText: /^\s*(Oui|Yes)\s*$/ }).first().click({ timeout: 10000 });
      await p.waitForFunction(() => !Ext.getCmp('int_QUANTITE_FREE'), null, { timeout: 20000 }).catch(() => {});
      await p.waitForTimeout(2500);
      const etat = await p.evaluate(() => { const c = Ext.getCmp('rechercherDetail'), el = c.inputEl.dom;
        const g = Ext.getCmp('gridpanelID'), st = g.getStore();
        return { focus: document.activeElement === el, debut: el.selectionStart, fin: el.selectionEnd, valeur: el.value,
          lignes: st.getRange().map((r) => r.get('lg_FAMILLE_ID')), ug: st.getRange().map((r) => r.get('lg_FAMILLE_ID') + '=' + r.get('lg_FAMILLE_PRIX_ACHAT')) }; });
      ok(`UG ${ug} : retour dans « Recherche », texte « ${texte} » entièrement sélectionné`, etat.focus && etat.valeur === texte && etat.debut === 0 && etat.fin === texte.length, JSON.stringify(etat));
      ok(`UG ${ug} : la liste reste celle de la recherche`, etat.lignes.includes(cible.id) && P.filter((x) => x !== cible).every((x) => !etat.lignes.includes(x.id))
        && recherches.every((x) => x === texte), JSON.stringify({ lignes: etat.lignes, recherches }));
      const ecran = (etat.ug.find((x) => x.startsWith(cible.id + '=')) || '').split('=')[1];
      ok(`UG ${ug} : rapprochement tableau = ligne du bon = lot du bon = saisie`, String(ecran) === String(ug) && ugBase(cible.id) === String(ug) && ugLot(cible.id) === String(ug),
        `tableau ${ecran} / base ${ugBase(cible.id)} / lot ${ugLot(cible.id)}`);
    };
    await saisirUg(2);
    await saisirUg(0);

    /* la frappe suivante remplace le texte selectionne */
    const autre = P[2].nom.substr(0, 5);
    recherches.length = 0;
    await p.keyboard.type(autre, { delay: 40 });
    ok('Frappe après retour : remplace le texte sélectionné', await p.evaluate(() => Ext.getCmp('rechercherDetail').getValue()) === autre);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    vus = await affiches();
    ok(`Nouvelle recherche « ${autre} » par Entrée`, recherches.length === 1 && vus.includes(P[2].id) && !vus.includes(cible.id), JSON.stringify({ recherches, vus }));
    await p.keyboard.press('Control+A');
    await p.keyboard.press('Delete');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    vus = await affiches();
    ok('Champ vidé puis Entrée : les 4 lignes du bon', P.every((x) => vus.includes(x.id)) && vus.length === 4, JSON.stringify(vus));
    const attendu = lignesAvant.split(',').map((l) => l).join(',');
    ok('Bilan : lignes du bon comme au départ (UG remises à 0), stock inchangé', lignes() === attendu && stocks() === stockAvant, lignes() + ' / ' + attendu);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    ok('Remise en état : bon, commande, lots retirés', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === '0' && q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF}'`) === '0');
  }
  const n = res.filter((r) => r.c).length;
  console.log('===== ' + n + '/' + res.length + (n === res.length ? ' PASS' : ' ECHEC') + ' =====');
  process.exit(n === res.length ? 0 : 1);
})();
