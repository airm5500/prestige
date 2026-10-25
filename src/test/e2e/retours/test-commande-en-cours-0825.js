/* COMMANDE EN COURS (retours du 25/10, point 8). Par les vues (admin), GESTION DES COMMANDES > Commande en cours.
 * Jeu d'essai : deux commandes d'essai du meme grossiste (2 lignes chacune), retirees a la fin avec leurs BL.
 *  - detail d'une commande : « Scan : 1 boîte par scan / Scan puis quantité » sur la ligne de « Voir infos produit »,
 *    a sa droite ; plus de ligne a part pour ce choix (l'etat du scan n'apparait qu'avec un message) ;
 *  - « CREER BON DE LIVRAISON » : BL cree sans message « operation effectuee avec succes » ; la fenetre se ferme et
 *    la liste des bons s'ouvre ;
 *  - meme reference de BL sur la seconde commande (refusee par le serveur) : le message d'echec s'affiche, la fenetre
 *    reste ouverte avec la saisie ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const C1 = 'E2E-CEC8-C1', C2 = 'E2E-CEC8-C2', REF = 'E2EBL' + String(Date.now()).slice(-8);
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY lg_GROSSISTE_ID LIMIT 1");
const P = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY lg_FAMILLE_ID LIMIT 2 OFFSET 21").split('\n');

function nettoyer() {
  q(`DELETE d FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.lg_ORDER_ID IN ('${C1}', '${C2}');`
    + ` DELETE FROM t_bon_livraison WHERE lg_ORDER_ID IN ('${C1}', '${C2}'); DELETE FROM t_order_detail WHERE lg_ORDER_ID IN ('${C1}', '${C2}');`
    + ` DELETE FROM t_order WHERE lg_ORDER_ID IN ('${C1}', '${C2}');`);
}

(async () => {
  nettoyer();
  [C1, C2].forEach((c) => {
    q("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
      + ` VALUES ('${c}', '${c}', 2, '${G}', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)`);
    P.forEach((f, i) => q("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, prixAchat, prixUnitaire, str_STATUT, dt_CREATED, dt_UPDATED)"
      + ` VALUES ('${c}-${i}', '${c}', '${f}', '${G}', ${i + 2}, 0, 1000, 2000, 1000, 2000, 'is_Process', NOW(), NOW())`));
  });
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const ouvrirCommande = async (cmd) => {
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Commande en cours');
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    await p.evaluate((r) => { Ext.getCmp('rechecher').setValue(r); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); }, cmd);
    await p.waitForFunction((r) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', r) >= 0; }, cmd, { timeout: 30000 });
    await p.evaluate((r) => { const g = Ext.ComponentQuery.query('i_order_manager')[0]; g.onManageDetailsClick(g, g.getStore().findExact('str_REF_ORDER', r)); }, cmd);
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
  };
  const creerBL = async () => {
    await p.click('#' + await p.evaluate(() => Ext.getCmp('btn_creerbl').btnEl.dom.id));
    await p.waitForFunction(() => Ext.getCmp('str_REF_LIVRAISON') && Ext.getCmp('str_REF_LIVRAISON').isVisible(true), null, { timeout: 20000 });
    await p.waitForTimeout(800);
    await p.evaluate((ref) => { Ext.getCmp('str_REF_LIVRAISON').setValue(ref); Ext.getCmp('dt_DATE_LIVRAISON').setValue(new Date()); Ext.getCmp('int_MHT').setValue(window.montantachat); Ext.getCmp('int_TVA').setValue(0); }, REF);
    await p.click('#' + await p.evaluate(() => Ext.getCmp('str_REF_LIVRAISON').up('window').down('button[text=Enregistrer]').btnEl.dom.id));
    await p.waitForFunction(() => !Ext.ComponentQuery.query('window').some((w) => w.isVisible() && /Waiting|patienter/i.test(w.getEl().dom.innerText)), null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(3000);
    return p.evaluate(() => ({ message: Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.innerText : '',
      fenetre: !!(Ext.getCmp('str_REF_LIVRAISON') && Ext.getCmp('str_REF_LIVRAISON').isVisible(true)),
      saisie: Ext.getCmp('str_REF_LIVRAISON') ? Ext.getCmp('str_REF_LIVRAISON').getValue() : null,
      liste: Ext.ComponentQuery.query('bonlivraisonmanager').some((x) => x.isVisible(true)) }));
  };
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirCommande(C1);
    const l = await p.evaluate(() => {
      const d = Ext.getCmp('btn_detail').getEl().dom.getBoundingClientRect(), s = Ext.getCmp('scanMode').getEl().dom.getBoundingClientRect();
      return { memeLigne: Math.abs((d.top + d.bottom) / 2 - (s.top + s.bottom) / 2) < 12, aDroite: s.left > d.right, dansEcran: s.right <= window.innerWidth,
        ligneEtat: Ext.getCmp('scanEtatLigne') ? Ext.getCmp('scanEtatLigne').isVisible() : true };
    });
    ok('« Scan : 1 boîte par scan / Scan puis quantité » sur la ligne de « Voir infos produit », à droite ; pas de ligne à part', l.memeLigne && l.aDroite && l.dansEcran && !l.ligneEtat, JSON.stringify(l));

    let r = await creerBL();
    ok('BL créé : aucun message de succès, fenêtre fermée, liste des bons ouverte', !r.message && !r.fenetre && r.liste
      && q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '${C1}' AND str_REF_LIVRAISON = '${REF}'`) === '1', JSON.stringify(r));

    await ouvrirCommande(C2);
    r = await creerBL();
    ok('Même référence de BL : message d\'échec affiché, fenêtre gardée avec la saisie', /déjà été utilisé/.test(r.message) && r.fenetre && r.saisie === REF
      && q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '${C2}'`) === '0', JSON.stringify(r));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID IN ('${C1}', '${C2}')`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
