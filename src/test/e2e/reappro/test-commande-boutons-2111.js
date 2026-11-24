/* COMMANDE EN COURS, COMMANDE OUVERTE : BOUTONS DU BAS AU NOUVEAU STYLE (plan du 21/11, point 16).
 *
 * Jeu d'essai : une commande « en cours » de deux lignes (retiree a la fin). Par l'ecran (GESTION DES COMMANDES >
 * Commande en cours > Modifier), a 1366×768, 1280×720 et 1920×1080 :
 *  - barre du bas : « ⬇ Exporter CSV », « ⬆ Réponse du grossiste », « ✔ Vérifier la disponibilité »,
 *    « ⟳ Revérifier les indisponibles », « 🖨 Imprimer la disponibilité », « 📦 Créer bon de livraison » (vert) et
 *    « ↩ Retour » ; nouveau style (ordo-btn / ordo-btn-primaire), taille normale, plus d'icone de groupement de lignes,
 *    plus de libelle en capitales ; tous visibles, sur une ligne, dans l'ecran (en 1366 px, « Commander par PharmaML »
 *    affiche compris) ;
 *  - info-bulle de « Vérifier la disponibilité » : toute la commande, et le ⟳ de la colonne Dispo pour un produit ;
 *  - « ↩ Retour » ramene a la liste des commandes.
 * Bilan : la commande et ses lignes sont inchangees (statut, quantites), aucun BL cree.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SUF = String(Date.now()).slice(-6);
const CMD = 'E2E-B16';
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY lg_GROSSISTE_ID LIMIT 1");
const P = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE BETWEEN 3 AND 80 ORDER BY f.lg_FAMILLE_ID LIMIT 2 OFFSET 11").split(/\r?\n/);
const QTE = [2, 5], PAF = [1200, 800];
const ATTENDU = [['btn_export_cmd_csv', '⬇ Exporter CSV', 'ordo-btn'], ['btn_import_reponse', '⬆ Réponse du grossiste', 'ordo-btn'],
  ['btn_cmd_dispo_verifier', '✔ Vérifier la disponibilité', 'ordo-btn'], ['btn_cmd_dispo_reverifier', '⟳ Revérifier les indisponibles', 'ordo-btn'],
  ['btn_cmd_dispo_imprimer', '🖨 Imprimer la disponibilité', 'ordo-btn'], ['btn_creerbl', '📦 Créer bon de livraison', 'ordo-btn-primaire'],
  ['btn_cancel', '↩ Retour', 'ordo-btn']];
const nettoyer = () => q(`DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${CMD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${CMD}';`);
const etat = () => q(`SELECT CONCAT((SELECT str_STATUT FROM t_order WHERE lg_ORDER_ID = '${CMD}'), '|', (SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER, ':', str_STATUT) ORDER BY lg_FAMILLE_ID)`
  + ` FROM t_order_detail WHERE lg_ORDER_ID = '${CMD}'), '|', (SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '${CMD}'))`);

(async () => {
  nettoyer();
  q("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + ` VALUES ('${CMD}', '${CMD}${SUF}', 2, '${G}', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}' LIMIT 1), 'is_Process', NOW(), NOW(), ${QTE[0] * PAF[0] + QTE[1] * PAF[1]}, 0, 0)`);
  P.forEach((f, i) => q("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, prixAchat, prixUnitaire, str_STATUT, dt_CREATED, dt_UPDATED)"
    + ` VALUES ('${CMD}-${i}', '${CMD}', '${f}', '${G}', ${QTE[i]}, ${QTE[i] * PAF[i]}, ${PAF[i]}, ${2 * PAF[i]}, ${PAF[i]}, ${2 * PAF[i]}, 'is_Process', NOW(), NOW())`));
  const etat0 = etat();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const ouvrir = async () => {
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Commande en cours');
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const champ = p.locator('#rechecher-inputEl');
    await champ.click(); await champ.fill(''); await p.keyboard.type(CMD + SUF, { delay: 15 }); await p.keyboard.press('Enter');
    const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: CMD + SUF }).first();
    await ligne.waitFor({ timeout: 30000 });
    await ligne.locator('img[data-qtip="Modifier"]').click();
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 30000 });
    await p.waitForTimeout(1000);
  };
  const mesure = () => p.evaluate((att) => att.map(([id]) => { const x = Ext.getCmp(id); if (!x) { return { id, absent: true }; }
    const r = x.getEl().dom.getBoundingClientRect();
    return { id, texte: x.text, cls: x.cls || '', scale: x.scale, icone: x.iconCls || '', visible: x.isVisible(true), haut: Math.round(r.top), droite: Math.round(r.right),
      large: Math.round(r.width), ecran: window.innerWidth, aide: String((x.initialConfig || {}).tooltip || '') }; }), ATTENDU);
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrir();
    for (const [l, h] of [[1366, 768], [1280, 720], [1920, 1080]]) {
      await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(900);
      const m = await mesure();
      const ecarts = m.filter((x, i) => x.absent || x.texte !== ATTENDU[i][1] || x.cls !== ATTENDU[i][2] || (x.scale && x.scale !== 'small') || /icon-clear-group/.test(x.icone));
      ok(`${l}×${h} : boutons du bas au nouveau style, icône de leur action, plus de capitales ni d'icône de groupement`, ecarts.length === 0, JSON.stringify(ecarts));
      const vus = m.filter((x) => !x.absent && x.visible);
      ok(`${l}×${h} : tous visibles, sur une ligne, dans l'écran`, vus.length === ATTENDU.length && Math.max(...vus.map((x) => x.haut)) - Math.min(...vus.map((x) => x.haut)) <= 4
        && vus.every((x) => x.droite <= x.ecran + 1 && x.large > 30), JSON.stringify(vus.map((x) => [x.id, x.haut, x.droite, x.large])));
      if (l === 1366) {
        /* grossiste relie a PharmaML : « Commander par PharmaML » s'ajoute a la barre */
        const pml = await p.evaluate(() => { const x = Ext.getCmp('btn_cmd_envoyer_pml'), avant = x.isVisible(); x.show(); x.up('toolbar').updateLayout();
          const ids = ['btn_export_cmd_csv', 'btn_import_reponse', 'btn_cmd_dispo_verifier', 'btn_cmd_dispo_reverifier', 'btn_cmd_dispo_imprimer', 'btn_cmd_envoyer_pml', 'btn_creerbl', 'btn_cancel'];
          const r = ids.map((i) => { const e = Ext.getCmp(i).getEl().dom.getBoundingClientRect(); return [i, Math.round(e.top), Math.round(e.right), Math.round(e.width)]; });
          const texte = x.text, cls = x.cls;
          if (!avant) { x.hide(); x.up('toolbar').updateLayout(); }
          return { r, texte, cls, ecran: window.innerWidth }; });
        ok('1366×768, grossiste PharmaML : « 📨 Commander par PharmaML » au nouveau style, la barre tient sur une ligne dans l\'écran', pml.texte === '📨 Commander par PharmaML'
          && /ordo-btn/.test(pml.cls) && pml.r.every(([, , d, w]) => d <= pml.ecran + 1 && w > 30)
          && Math.max(...pml.r.map((x) => x[1])) - Math.min(...pml.r.map((x) => x[1])) <= 4, JSON.stringify(pml));
        const v = m.find((x) => x.id === 'btn_cmd_dispo_verifier');
        ok('Info-bulle de « Vérifier la disponibilité » : toute la commande, et le ⟳ de la colonne Dispo pour un seul produit',
          !!v && /TOUS les produits de la commande/.test(v.aide) && /⟳ de la colonne Dispo vérifie un seul produit/.test(v.aide), v && v.aide);
      }
    }
    await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(700);
    await p.click('#' + await p.evaluate(() => Ext.getCmp('btn_cancel').btnEl.dom.id));
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').some((x) => x.isVisible(true)), null, { timeout: 30000 }).catch(() => {});
    ok('« ↩ Retour » ramène à la liste des commandes', await p.evaluate(() => Ext.ComponentQuery.query('i_order_manager').some((x) => x.isVisible(true))));
    ok('Bilan : commande et lignes inchangées, aucun BL', etat() === etat0, etat0 + ' -> ' + etat());
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
