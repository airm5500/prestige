/* PLAN DU 19/11, POINT 6 a : FICHE ARTICLE EN MODIFICATION, ZONE « ORDONNANCIER ».
 *
 * Constat du pharmacien : on lit « Ordonnancier » puis « inscrit à l'ordonnancier ? », comme deux zones, et la case
 * « produit sensible » n'est pas visible. Cause : libelle et deux cases sur une seule ligne, dans un bloc borne a
 * 380 px : la seconde case sortait du bloc.
 *
 * Attendu (ergonomie, par l'ecran : menu Fiche Article, recherche du CIP, action « Modifier ») :
 *  - une seule zone, libellee « Ordonnancier », qui porte les deux cases « Inscrit à l'ordonnancier » et « Produit
 *    sensible » ;
 *  - chaque case entiere dans son bloc et dans la fenetre (ni coupee ni masquee), a 1366 x 768 et a 1600 x 900 ;
 *  - aucune autre case ni zone ne parle d'ordonnancier dans la fenetre ;
 *  - la case « Produit sensible » se coche a la souris (clic sur son libelle), puis la fenetre est fermee sans
 *    enregistrer : rien n'est ecrit (base inchangee).
 * Lancement seul : node src/test/e2e/ordonnancier/test-fiche-ordonnancier-zone-1911.js
 */
const { chromium } = require('playwright-core');
const C = require('./commun');

const P = C.q("SELECT CONCAT_WS('~', f.lg_FAMILLE_ID, f.int_CIP, IFNULL(f.is_scheduled, 0), IFNULL(f.is_sensible, 0)) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable'"
  + " AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.bool_DECONDITIONNE = 0 AND IFNULL(f.bool_DECONDITIONNE_EXIST, 0) = 0 AND IFNULL(f.is_sensible, 0) = 0"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1 ORDER BY f.int_CIP LIMIT 1").split('~');
const drapeaux = () => C.q("SELECT CONCAT(IFNULL(is_scheduled, 0), IFNULL(is_sensible, 0)) FROM t_famille WHERE lg_FAMILLE_ID = '" + P[0] + "'");

async function ouvrir(p) {
  await C.vues.ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
  await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').some((c) => c.isVisible(true)), null, { timeout: 60000 });
  await p.mouse.move(1000, 600);
  await C.vues.cliquer(p, 'famillemanager #rechecher');
  await p.keyboard.press('Control+A');
  await p.keyboard.type(P[1], { delay: 20 });
  await p.keyboard.press('Enter');
  const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: P[1] }).first();
  await ligne.waitFor({ timeout: 60000 });
  await p.waitForTimeout(600);
  const icone = ligne.locator('img[data-qtip="Modifier"]');
  if (await icone.count() && await icone.first().isVisible()) {
    await icone.first().click();
  } else {
    await ligne.locator('img[data-qtip="Autres actions"]').click();
    await p.locator('.x-menu-item').filter({ visible: true, hasText: 'Modifier' }).first().click();
  }
  await p.waitForFunction(() => Ext.ComponentQuery.query('window').some((x) => x.isVisible(true) && x.down('#cb_ordonnancier')), null, { timeout: 60000 });
  await p.waitForTimeout(1500);
}

const zone = (p) => p.evaluate(() => {
  const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible(true) && x.down('#cb_ordonnancier')).pop();
  const ct = w.down('#ordo_container'), bloc = ct.up('fieldset');
  const r = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
  const dedans = (x, y) => x.l >= y.l - 1 && x.r <= y.r + 1 && x.t >= y.t - 1 && x.b <= y.b + 1;
  const vue = r(w.body.dom), rb = r(bloc.getEl().dom);
  const cases = ['cb_ordonnancier', 'cb_sensible'].map((id) => {
    const c = w.down('#' + id), rc = r(c.getEl().dom);
    /* l'element visible au centre de la case est bien la case (rien ne la recouvre) */
    const cx = (rc.l + rc.r) / 2, cy = (rc.t + rc.b) / 2, dessus = document.elementFromPoint(cx, cy);
    return { id, libelle: c.boxLabel, visible: c.isVisible(true), dansBloc: dedans(rc, rb), dansFenetre: dedans(rc, vue),
      nonMasquee: !!dessus && c.getEl().dom.contains(dessus), largeur: Math.round(rc.r - rc.l) };
  });
  const textes = Ext.ComponentQuery.query('checkbox, fieldcontainer', w).filter((x) => x.isVisible(true))
    .map((x) => (x.boxLabel || '') + ' ' + (x.getFieldLabel ? x.getFieldLabel() || '' : '')).filter((t) => /ordonnancier/i.test(t));
  return { libelle: ct.getFieldLabel(), cases, textes };
});

(async () => {
  C.ok('Jeu d\'essai : un produit simple, non sensible', P.length === 4, P.join(' '));
  const depart = drapeaux();
  const b = await C.ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    for (const [l, h] of [[1366, 768], [1600, 900]]) {
      const p = await b.newPage({ viewport: { width: l, height: h } });
      p.on('pageerror', (e) => erreurs.push(e.message));
      await C.vues.connexion(p, C.ENV_E2E.LOGIN, 'e2etest');
      await ouvrir(p);
      const z = await zone(p);
      const t = l + ' x ' + h + ' : ';
      C.ok(t + 'une zone libellée « Ordonnancier »', z.libelle === 'Ordonnancier', z.libelle);
      C.ok(t + 'ses deux cases : « Inscrit à l\'ordonnancier » et « Produit sensible »',
        z.cases[0].libelle === 'Inscrit à l\'ordonnancier' && z.cases[1].libelle === 'Produit sensible', JSON.stringify(z.cases.map((c) => c.libelle)));
      C.ok(t + 'chaque case entière dans son bloc et dans la fenêtre, rien ne la recouvre',
        z.cases.every((c) => c.visible && c.dansBloc && c.dansFenetre && c.nonMasquee), JSON.stringify(z.cases));
      C.ok(t + 'aucune autre case ni zone ne parle d\'ordonnancier', z.textes.length === 2, JSON.stringify(z.textes));
      if (l === 1366) {
        await p.locator('label').filter({ visible: true, hasText: /^Produit sensible$/ }).first().click();
        const coche = await p.evaluate(() => Ext.ComponentQuery.query('window').filter((x) => x.isVisible(true) && x.down('#cb_sensible')).pop().down('#cb_sensible').getValue());
        C.ok(t + '« Produit sensible » se coche au clic sur son libellé', coche === true, coche);
        await p.evaluate(() => Ext.ComponentQuery.query('window').filter((x) => x.isVisible(true) && x.down('#cb_sensible')).pop().close());
        await p.waitForTimeout(1500);
        C.ok(t + 'fenêtre fermée sans enregistrer : base inchangée', drapeaux() === depart, drapeaux() + ' / ' + depart);
      }
      await p.close();
    }
    C.ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    C.ok('Parcours sans exception', false, err.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    C.q("UPDATE t_famille SET is_scheduled = " + depart[0] + ", is_sensible = " + depart[1] + " WHERE lg_FAMILLE_ID = '" + P[0] + "'");
  }
  process.exit(C.bilan() ? 1 : 0);
})();
