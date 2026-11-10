/* RETOUR DU 10/11 : ENTREE NE REAGIT PLUS DANS LA RECHERCHE DE LA FICHE ARTICLE (« componentLayoutCounter »).
 *
 * Cause : « Detail sur l'article » (icone de ligne) pose le verrou d'ouverture PrestigeChargement.verrou sur la VUE de
 * la grille, qui appelle vue.setLoading(). Dans Ext 4.2.1, setLoading detruit le masque de la vue (celui qui suit les
 * chargements de la liste) sans le desabonner de la liste. Au chargement suivant (Entree, page suivante...), ce masque
 * detruit repond sans composant : « Cannot read properties of undefined (reading 'componentLayoutCounter') », le
 * chargement s'arrete avant la requete. Meme verrou sur une vue : ventes terminees, preventes, commandes, suggestions.
 *
 * Par l'ecran (admin), sans rien ecrire en base :
 *  - cas general : une grille dans une fenetre, setLoading pose puis retire sur sa vue, la liste rechargee : aucune
 *    erreur, le masque de la liste est toujours celui de la vue, aucun masque detruit abonne ;
 *  - fiche article, vrai clic sur l'icone « Détail sur l'article », fenetre fermee par « Fermer » :
 *    aucun masque detruit abonne a la liste ; la vue garde son masque de chargement ;
 *    « page suivante » charge la page 2 sans erreur (rapprochement : grille = reponse du serveur) ;
 *    recherche tapee (6 chiffres) + Entree : la requete part, la grille = la reponse (CIP), le CIP cherche y est ;
 *    quatre Entree de suite : quatre requetes ; le filtre rayon de la fiche existe toujours ;
 *  - aucune erreur JavaScript.
 */
const C = require('../audits/commun');
const { ok } = C;
const { ouvrirMenu, cliquer } = require('../outils/vues');

const masquesGrille = (p) => p.evaluate(() => {
  const g = Ext.ComponentQuery.query('famillemanager')[0], s = g.getStore(), v = g.getView();
  const abonnes = (s.events.beforeload.listeners || []).filter((l) => l.scope instanceof Ext.LoadMask).map((l) => l.scope);
  return { morts: abonnes.filter((m) => m.isDestroyed || !m.getOwner()).length,
    vueSuit: !!(v.loadMask && v.loadMask.isComponent && !v.loadMask.isDestroyed && v.loadMask.store === s && abonnes.indexOf(v.loadMask) >= 0) };
});

(async () => {
  const { b, p, erreurs } = await C.connecter();
  try {
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager #rechecher').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(2000);

    /* 1. cas general : setLoading sur la vue d'une grille */
    const general = await p.evaluate(async () => {
      const store = Ext.create('Ext.data.Store', { fields: ['id'], proxy: { type: 'ajax', url: '../api/v1/common/rayons', reader: { type: 'json', root: 'data' } } });
      const w = Ext.create('Ext.window.Window', { title: 'essai masque', width: 300, height: 200, layout: 'fit', items: [{ xtype: 'gridpanel', store: store, columns: [{ dataIndex: 'id', flex: 1 }] }] });
      w.show();
      await new Promise((r) => store.load({ callback: r }));
      const vue = w.down('gridpanel').getView(), masque = vue.loadMask;
      const ponctuel = vue.setLoading('Ouverture…');
      const pose = !!(ponctuel && ponctuel.isVisible() && ponctuel !== masque);
      vue.setLoading(false);
      let erreur = null;
      try { await new Promise((r) => store.load({ callback: r })); } catch (e) { erreur = e.message; }
      const abonnes = (store.events.beforeload.listeners || []).filter((l) => l.scope instanceof Ext.LoadMask).map((l) => l.scope);
      const res = { pose, erreur, memeMasque: vue.loadMask === masque && !masque.isDestroyed, morts: abonnes.filter((m) => m.isDestroyed || !m.getOwner()).length, charge: store.getCount() };
      w.close();
      res.apresFermeture = (store.events.beforeload.listeners || []).filter((l) => l.scope instanceof Ext.LoadMask).length;
      return res;
    });
    ok('Cas général : le message d\'ouverture s\'affiche sur la vue', general.pose, JSON.stringify(general));
    ok('Cas général : liste rechargée après setLoading sur la vue, sans erreur', !general.erreur && general.charge > 0, JSON.stringify(general));
    ok('Cas général : la vue garde le masque de sa liste, aucun masque détruit abonné', general.memeMasque && general.morts === 0, JSON.stringify(general));
    ok('Cas général : grille fermée, plus aucun masque abonné à la liste', general.apresFermeture === 0, JSON.stringify(general));

    /* 2. fiche article : liste complete (recherche vide + Entree), vrai clic sur « Detail sur l'article » */
    await cliquer(p, 'famillemanager #rechecher');
    const rep0 = p.waitForResponse((r) => /produit-search\/fiche/.test(r.url()), { timeout: 15000 });
    await p.keyboard.press('Enter');
    await rep0;
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager')[0].getStore().getCount() > 0, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const icone = await p.evaluate(() => { const v = Ext.ComponentQuery.query('famillemanager')[0].getView(), n = v.getNode(0);
      const i = n && n.querySelector('img[data-qtip="Détail sur l\'article"]'); if (!i) { return null; } i.id = i.id || 'e2e-icone-detail'; return '#' + i.id; });
    ok('L\'icône « Détail sur l\'article » est sur la première ligne', !!icone, '');
    await p.click(icone);
    await p.waitForFunction(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible() && /Detail sur/.test(w.title || '')), null, { timeout: 15000 });
    await p.waitForTimeout(2500);
    const fermer = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && /Detail sur/.test(x.title || ''))[0];
      const bt = w.query('button').filter((x) => x.text === 'Fermer')[0]; return bt ? '#' + bt.getEl().id : null; });
    await p.click(fermer);
    await p.waitForTimeout(1000);
    const apres = await masquesGrille(p);
    ok('Après le détail : aucun masque détruit abonné à la liste de la grille', apres.morts === 0, JSON.stringify(apres));
    ok('Après le détail : la vue garde son masque de chargement', apres.vueSuit, JSON.stringify(apres));

    /* page suivante (chemin sans le nettoyage du point 1) */
    const avant = erreurs.length;
    const suivant = await p.evaluate(() => { const t = Ext.ComponentQuery.query('famillemanager pagingtoolbar')[0], bt = t.down('#next'); return bt && !bt.disabled ? '#' + bt.getEl().id : null; });
    ok('Le bouton « page suivante » est actif (plus d\'une page)', !!suivant, '');
    const rep1 = p.waitForResponse((r) => /produit-search\/fiche/.test(r.url()), { timeout: 8000 }).catch(() => null);
    await p.click(suivant);
    const r1 = await rep1;
    await p.waitForTimeout(1200);
    ok('Page suivante après le détail : la requête part, sans erreur', !!r1 && erreurs.length === avant, (r1 ? '' : 'aucune requête ; ') + erreurs.slice(avant).join(' | '));
    const s1 = r1 ? (await r1.json()).results.map((x) => String(x.int_CIP)) : [];
    const e1 = await p.evaluate(() => Ext.ComponentQuery.query('famillemanager')[0].getStore().getRange().map((r) => String(r.get('int_CIP'))));
    ok('Rapprochement page 2 : la grille affiche exactement les CIP renvoyés', s1.length > 0 && JSON.stringify(s1) === JSON.stringify(e1), s1.length + ' / ' + e1.length);

    /* Entree avec 6 chiffres, comme le journal */
    const cip = C.q("SELECT f.int_CIP FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{6,7}$' ORDER BY f.str_NAME LIMIT 1 OFFSET 3");
    await cliquer(p, 'famillemanager #rechecher');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(cip, { delay: 15 });
    const rep2 = p.waitForResponse((r) => /produit-search\/fiche/.test(r.url()), { timeout: 8000 }).catch(() => null);
    await p.keyboard.press('Enter');
    const r2 = await rep2;
    await p.waitForTimeout(1200);
    ok('Entrée après le détail : la recherche part, sans erreur', !!r2 && erreurs.length === avant, (r2 ? '' : 'aucune requête ; ') + erreurs.slice(avant).join(' | '));
    const s2 = r2 ? (await r2.json()).results.map((x) => String(x.int_CIP)) : [];
    const e2 = await p.evaluate(() => Ext.ComponentQuery.query('famillemanager')[0].getStore().getRange().map((r) => String(r.get('int_CIP'))));
    ok('Rapprochement : la grille affiche exactement les CIP renvoyés par le serveur', s2.length > 0 && JSON.stringify(s2) === JSON.stringify(e2), s2.join(',') + ' / ' + e2.join(','));
    ok('Rapprochement : le CIP cherché est dans la grille', e2.indexOf(String(cip)) >= 0, cip + ' / ' + e2.join(','));
    let n = 0;
    const compter = (r) => { if (/produit-search\/fiche/.test(r.url())) { n++; } };
    p.on('request', compter);
    for (let i = 0; i < 4; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(500); }
    await p.waitForTimeout(1500);
    p.off('request', compter);
    ok('Quatre Entrée de suite : quatre recherches, aucune erreur', n === 4 && erreurs.length === avant, n + ' requête(s) ; ' + erreurs.slice(avant).join(' | '));
    const fin = await masquesGrille(p);
    ok('Fin : la vue suit toujours la liste, aucun masque détruit abonné', fin.vueSuit && fin.morts === 0, JSON.stringify(fin));
    const rayon = await p.evaluate(() => { const z = Ext.ComponentQuery.query('famillemanager #lg_ZONE_GEO_ID')[0]; return !!z && !z.isDestroyed; });
    ok('« Détail sur l\'article » ouvert puis fermé : le filtre rayon de la fiche article existe toujours', rayon, '');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } finally {
    await b.close();
    C.bilan();
  }
})();
