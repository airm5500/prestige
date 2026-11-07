/* PLAN DU 06/11, POINT 14 : « MODELES DE MESSAGES » DANS LE MENU « CAMPAGNES SMS / WHATSAPP ».
 *
 * Avant : le sous-menu etait sous SERVICE CLIENT. Reponse retenue : un sous-menu de Campagnes, juste apres
 * « Campagnes » ; l'ecran ne change pas ; chaque role qui avait « Modeles de messages » recoit le droit du menu
 * Campagnes, pour ne pas perdre l'acces (migration V7.2.40, rejouable).
 * Par les ecrans (compte de test) et la base, en lecture seule :
 *  - menu lu a l'ecran : « Modèles de messages » est sous « Campagnes SMS / WhatsApp », juste apres « Campagnes »,
 *    et n'est plus sous SERVICE CLIENT ;
 *  - ouverture par le volet du menu (clic sur Campagnes puis sur « Modèles de messages ») : l'ecran s'ouvre, sa liste
 *    a autant de modeles que la base ;
 *  - base : le sous-menu est sous 20261014, rang = Campagnes + 1, rangs du menu tous differents et dans l'ordre
 *    Campagnes < Modeles < Comptes WhatsApp ; tout role qui a P_SM_MODELES_MESSAGES a aussi P_M_CAMPAGNES ;
 *  - aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/retours/test-menu-modeles-messages-0611.js
 */
const C = require('../prix-reference/commun');
const { ok, q, A } = C;

(async () => {
  const sess = await C.connecterEtOuvrirVente();
  const { p } = sess;
  try {
    const menu = await p.evaluate(() => {
      const s = Ext.ComponentQuery.query('navigation')[0].getStore();
      const n = s.getNodeById('modelemessagemanager');
      if (!n || !n.parentNode) { return null; }
      const freres = n.parentNode.childNodes.map((x) => x.get('id'));
      return { parent: n.parentNode.get('text'), texte: n.get('text'), freres, rang: freres.indexOf('modelemessagemanager'), campagnes: freres.indexOf('campagnes') };
    });
    ok('Menu : « Modèles de messages » sous « Campagnes SMS / WhatsApp », juste après « Campagnes »',
      menu && /CAMPAGNES/i.test(menu.parent) && menu.texte === 'Modèles de messages' && menu.campagnes >= 0 && menu.rang === menu.campagnes + 1, JSON.stringify(menu));
    ok('Menu : plus sous SERVICE CLIENT', menu && !/SERVICE CLIENT/i.test(menu.parent), menu && menu.parent);

    /* ouverture par le volet, comme l'utilisateur */
    await C.vues.ouvrirMenu(p, menu ? menu.parent : 'CAMPAGNES SMS / WHATSAPP', 'Modèles de messages');
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('modelemessagemanager')[0]; return c && c.isVisible(true); }, null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    const liste = await p.evaluate(() => { const c = Ext.ComponentQuery.query('modelemessagemanager')[0]; const g = c.isXType('grid') ? c : c.down('grid');
      return g ? g.getStore().getTotalCount() || g.getStore().getCount() : null; });
    const enBase = Number(q('SELECT COUNT(*) FROM modele_message'));
    ok('Ouverture par le menu Campagnes : l\'écran s\'ouvre, autant de modèles que la base', liste === enBase, liste + ' / ' + enBase);

    const sm = q("SELECT CONCAT_WS('|', lg_MENU_ID, int_PRIORITY) FROM t_sous_menu WHERE str_COMPOSANT = 'modelemessagemanager'");
    const rangs = q("SELECT GROUP_CONCAT(CONCAT(str_COMPOSANT, ':', int_PRIORITY) ORDER BY int_PRIORITY) FROM t_sous_menu WHERE lg_MENU_ID = '20261014' AND str_Status = 'enable'");
    const r = {}; rangs.split(',').forEach((x) => { const [k, v] = x.split(':'); r[k] = Number(v); });
    const uniques = new Set(Object.values(r)).size === Object.keys(r).length;
    ok('Base : sous-menu sous 20261014, rang Campagnes + 1, rangs distincts, Campagnes < Modèles < Comptes WhatsApp',
      sm === '20261014|' + (r.campagnes + 1) && uniques && r.campagnes < r.modelemessagemanager && (!r.whatsappcomptes || r.modelemessagemanager < r.whatsappcomptes), sm + ' ; ' + rangs);
    const sansMenu = q("SELECT COUNT(DISTINCT rp.lg_ROLE_ID) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE p.str_NAME = 'P_SM_MODELES_MESSAGES'"
      + " AND NOT EXISTS (SELECT 1 FROM t_role_privelege d JOIN t_privilege m ON m.lg_PRIVELEGE_ID = d.lg_PRIVILEGE_ID WHERE d.lg_ROLE_ID = rp.lg_ROLE_ID AND m.str_NAME = 'P_M_CAMPAGNES')");
    ok('Droits : tout rôle qui a « Modèles de messages » a aussi le menu Campagnes (personne ne perd l\'accès)', sansMenu === '0', sansMenu);
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    await sess.b.close().catch(() => {});
    C.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
