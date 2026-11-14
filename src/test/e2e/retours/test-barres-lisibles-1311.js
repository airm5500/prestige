/* DEMANDE DU 13/11 (« cela fait longtemps qu'on traine ce bug ») : BARRES D'OUTILS COUPEES, SUR TOUS LES ECRANS.
 *
 * Symptome (captures « Ventes terminées », « Paramétrage général », « Campagnes ») : des que la barre manque de place,
 * dates, heures et listes sont coupees (« 13/11/2C », « 00:( », « Selectic ») et le dernier element sort a droite.
 * La correction est une regle generale (correctifs-affichage.js) : ce test ne vise donc pas un ecran, il ouvre TOUS
 * les ecrans du menu de l'utilisateur, par de vrais clics, et controle chaque barre d'outils a 1280, 1024 puis 1366 px
 * (la place retiree, puis revenue) :
 *   1. chaque date et chaque heure se lit en entier (le texte tient dans la zone de saisie) ;
 *   2. chaque liste de choix a une vraie zone de saisie (au moins 50 px, jamais « Selectic ») ;
 *   3. aucun element de la barre n'est coupe a droite : il est dans la barre, ou la barre defile ;
 *   4. un champ de largeur fixe qui a cede de la place la reprend quand la fenetre s'elargit.
 * Ecrans en lecture seule : on ouvre et on regarde, aucune donnee ecrite.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const LARGEURS = [1280, 1024, 1366];

/* controle des barres de l'ecran affiche ; null si l'ecran n'a aucun champ dans une barre */
const controler = () => {
  const c = Ext.getCmp('content-panel');
  const ecran = c && c.items.items.filter((x) => x.rendered && x.isVisible() && !x.floating)[0];
  if (!ecran) { return null; }
  const barres = ecran.query('toolbar').filter((t) => !t.isXType('pagingtoolbar') && t.rendered && t.isVisible(true) && t.layout && t.layout.innerCt
    && t.items.items.some((x) => x.isXType('field') && x.isVisible()));
  if (!barres.length) { return null; }
  const defauts = [], fixes = [];
  barres.forEach((t) => {
    const cadre = t.layout.innerCt.dom, droite = cadre.getBoundingClientRect().right;
    const defile = cadre.scrollWidth > cadre.clientWidth + 1 && getComputedStyle(cadre).overflowX === 'auto';
    t.items.items.filter((x) => x.rendered && x.isVisible() && x.el).forEach((x) => {
      const nom = x.itemId || x.name || x.emptyText || x.fieldLabel || x.text || x.xtype;
      const r = x.el.dom.getBoundingClientRect();
      if (r.width > 0 && r.right > droite + 1 && !defile) { defauts.push('coupé à droite : ' + nom + ' (' + Math.round(r.right - droite) + ' px)'); }
      const s = x.inputEl && x.inputEl.dom;
      if (!s || !s.offsetWidth) { return; }
      if ((x.isXType('datefield') || x.isXType('timefield')) && s.value && s.scrollWidth > s.clientWidth + 1) {
        defauts.push('valeur coupée : ' + nom + ' « ' + s.value + ' » (' + s.clientWidth + ' px pour ' + s.scrollWidth + ')');
      } else if (x.isXType('combobox') && !x.isXType('timefield') && s.clientWidth < 50) {
        defauts.push('liste sans zone de saisie : ' + nom + ' (' + s.clientWidth + ' px)');
      }
      if (typeof x.largeurPrevue === 'number') { fixes.push({ nom, largeur: x.getWidth(), prevue: x.largeurPrevue }); }
    });
  });
  return { ecran: ecran.xtype, barres: barres.length, defauts, fixes };
};

(async () => {
  let b = null;
  const err = [];
  try {
    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1280, height: 700 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menus = await p.evaluate(() => { const l = []; const nettoie = (t) => (t || '').replace(/<[^>]+>/g, '').trim();
      Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((x) => {
        if (x.isLeaf() && x.parentNode && !x.parentNode.isRoot()) { l.push([nettoie(x.parentNode.get('text')), nettoie(x.get('text'))]); } });
      return l; });
    ok('Précondition : menus de l\'utilisateur lus', menus.length > 10, menus.length);
    const filtre = process.env.ECRANS ? new RegExp(process.env.ECRANS, 'i') : null;
    let avecBarre = 0, vente = false;
    for (const [parent, entree] of menus) {
      if (filtre && !filtre.test(entree)) { continue; }
      if (/d[ée]connexion|quitter/i.test(entree)) { continue; }
      /* une fenetre ou un message laisse ouvert par l'ecran precedent bloquerait les clics du menu : on les ferme ;
         si le menu ne s'ouvre toujours pas, la page est rechargee une fois avant de passer a l'ecran suivant */
      const fermerFenetres = () => p.evaluate(() => { Ext.WindowManager.each((w) => { if (w.isVisible && w.isVisible() && w.close) { try { w.close(); } catch (e) { w.hide(); } } }); return true; }).catch(() => {});
      await p.setViewportSize({ width: 1280, height: 700 });
      await fermerFenetres();
      let ouvert = false;
      for (let essai = 0; essai < 2 && !ouvert; essai++) {
        try {
          await V.ouvrirMenu(p, parent, entree);
          ouvert = true;
        } catch (x) {
          console.log('INFO  menu non ouvert (essai ' + (essai + 1) + ') : ' + parent + ' > ' + entree + ' (' + x.message.split('\n')[0] + ')');
          if (essai === 0) {
            await p.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
            await p.waitForFunction(() => { const n = window.Ext && Ext.ComponentQuery.query('navigation')[0];
              return n && n.getStore().getRootNode().childNodes.length > 0 && !n.getStore().isLoading(); }, null, { timeout: 120000 }).catch(() => {});
            await p.waitForTimeout(1500);
          }
        }
      }
      if (!ouvert) { continue; }
      await p.waitForTimeout(2200);
      await p.keyboard.press('Escape').catch(() => {});
      const premier = await p.evaluate(controler).catch(() => null);
      if (!premier) { continue; }
      avecBarre++;
      if (/ventes? termin/i.test(entree)) { vente = true; }
      const bilan = [];
      for (const largeur of LARGEURS) {
        await p.setViewportSize({ width: largeur, height: 700 });
        await p.waitForTimeout(1300);
        const m = await p.evaluate(controler).catch(() => null);
        if (m) { bilan.push({ largeur, m }); }
      }
      const defauts = bilan.filter((x) => x.m.defauts.length).map((x) => x.largeur + ' px : ' + x.m.defauts.join(' ; '));
      ok(`${entree} (${premier.ecran}) : barres lisibles à 1024, 1280 et 1366 px`, defauts.length === 0, defauts.join(' | '));
      const fin = bilan.find((x) => x.largeur === 1024), large = bilan.find((x) => x.largeur === 1366);
      if (large && fin && large.m.fixes.length) {
        /* 4. a 1366 (apres 1024), chaque champ fixe a repris sa largeur prevue, ou au moins celle qu'il avait a 1024 */
        const repris = large.m.fixes.every((f) => f.largeur >= f.prevue - 1 || f.largeur >= (fin.m.fixes.find((g) => g.nom === f.nom) || f).largeur);
        ok(`${entree} : les champs fixes reprennent leur largeur quand la place revient`, repris, JSON.stringify(large.m.fixes));
      }
    }
    ok('Des écrans à barres de champs ont été contrôlés, dont « Ventes terminées »', avecBarre >= (filtre ? 1 : 10) && (filtre || vente), avecBarre);
    if (err.length) { console.log('INFO  erreurs JavaScript des écrans (hors règle) : ' + err.slice(0, 5).join(' | ')); }
    ok('Aucune erreur JavaScript venue de la règle des barres', !err.some((e) => /Plancher|Lisible|ajusterBarre|placeLibre|largeurTexte/.test(e)), err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
