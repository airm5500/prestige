/* PLAN AVOIR DU 08/11, POINT 8 : ICONES ET LIBELLE DE LA GESTION DES INVENTAIRES.
 *
 * Retour : « Effectuer une analyse simple », « Editer un inventaire » et « Valorisation » portent la meme icone (l'oeil
 * du theme, act-voir) : on ne les distingue pas. « Editer un inventaire » devient « Ouvrir l'inventaire ».
 *
 * Par l'ecran (menu GESTION DU STOCK › Travaux d'Inventaire) :
 *   - les trois icones ont chacune un dessin distinct, distinct aussi de toutes les autres icones de la ligne ;
 *   - l'infobulle dit « Ouvrir l'inventaire » (plus « Editer un inventaire ») ;
 *   - non-regression : les autres ecrans qui utilisent les memes images gardent l'oeil (« Me contacter », icone
 *     « Voir le détail » sur application_view_list.png) ;
 *   - un vrai clic sur « Ouvrir l'inventaire » d'un inventaire en cours ouvre la fiche, dont le titre dit « Ouvrir
 *     l'inventaire » (titre du panneau central), sans « Modification » ni « Edition ».
 * Lecture seule : la fiche est ouverte, rien n'est saisi.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }

/* classe du dessin au trait (act-xxx hors act-ico) de chaque icone d'action de la grille, par infobulle */
function icones(xtype) {
  const e = Ext.ComponentQuery.query(xtype)[0], g = e.isXType('gridpanel') ? e : e.down('gridpanel'), r = {}, st = g.getStore();
  const rec = st.getAt(Math.max(0, st.findBy((x) => x.get('etat') === 'enable'))) || { get: () => '' };
  const cols = g.query('actioncolumn');
  cols.forEach((c) => (c.items || []).forEach((it) => {
    const cls = String(it.iconCls || '') + ' ' + String(Ext.isFunction(it.getClass) ? (it.getClass.call(c, null, {}, rec, 0, 0, st) || '') : '');
    const trait = (cls.match(/\bact-(?!ico\b)[a-z-]+/g) || []).join(' ');
    r[String(it.tooltip || '').replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&ocirc;/g, 'ô').replace(/&ecirc;/g, 'ê')] = trait;
  }));
  return r;
}

(async () => {
  let b = null;
  const err = [];
  try {
    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await V.ouvrirMenu(p, 'GESTION DU STOCK', "Travaux d'Inventaire");
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('inventaire')[0]; return g && g.getStore().getCount() > 0 && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    const ic = await p.evaluate(icones, 'inventaire');
    console.log(JSON.stringify(ic));
    const simple = ic['Effectuer une analyse simple'], ouvrir = ic["Ouvrir l'inventaire"], valo = ic["Valorisation d'inventaire"];
    ok('Infobulle « Ouvrir l\'inventaire » (plus « Editer un inventaire »)', ouvrir !== undefined && ic['Editer un inventaire'] === undefined, Object.keys(ic).join(' | '));
    ok('Analyse simple, Ouvrir et Valorisation : trois dessins distincts', simple && ouvrir && valo && new Set([simple, ouvrir, valo]).size === 3, [simple, ouvrir, valo].join(' / '));
    const autres = Object.entries(ic).filter(([k]) => !['Effectuer une analyse simple', "Ouvrir l'inventaire", "Valorisation d'inventaire"].includes(k)).map(([, v]) => v);
    ok('Aucun des trois ne reprend le dessin d\'une autre icône de la ligne', [simple, ouvrir, valo].every((x) => x && !autres.includes(x)), JSON.stringify(ic));
    ok('Aucun des trois n\'est l\'œil (act-voir)', [simple, ouvrir, valo].every((x) => x && x !== 'act-voir'), [simple, ouvrir, valo].join(' / '));
    /* le dessin est bien affiche sur la ligne (image du theme presente dans la cellule) */
    const dom = await p.evaluate(() => [...document.querySelectorAll('.x-action-col-icon')].filter((i) => /analyse simple|Ouvrir l/.test(i.getAttribute('data-qtip') || ''))
      .map((i) => (i.getAttribute('data-qtip') + '=' + (i.className.match(/\bact-(?!ico\b)[a-z-]+/) || [''])[0])).filter((x, k, t) => t.indexOf(x) === k));
    ok('Les icônes affichées sur les lignes portent ces dessins', dom.some((x) => /analyse simple/.test(x)) && dom.some((x) => /Ouvrir l/.test(x))
      && dom.every((x) => !/=act-voir$|=$/.test(x)), dom.join(', '));

    /* vrai clic sur « Ouvrir l'inventaire » du premier inventaire en cours */
    const cible = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('inventaire')[0], i = g.getStore().findBy((r) => r.get('etat') === 'enable');
      if (i < 0) { return null; }
      const row = g.getView().getNode(i), img = [...row.querySelectorAll('.x-action-col-icon')].find((x) => /Ouvrir l|Editer un/.test(x.getAttribute('data-qtip') || ''));
      if (img && !img.id) { img.id = 'e2e-ouvrir-inventaire'; }
      return img ? { id: img.id, nom: g.getStore().getAt(i).get('str_NAME') } : { nom: g.getStore().getAt(i).get('str_NAME') };
    });
    ok('Un inventaire en cours porte l\'icône d\'ouverture', cible && cible.id, JSON.stringify(cible));
    if (cible && cible.id) {
      await p.click('#' + cible.id);
      await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('editinventaireManager')[0]; return c && c.rendered; }, null, { timeout: 60000 });
      await p.waitForTimeout(1500);
      const titre = await p.evaluate(() => { const c = Ext.ComponentQuery.query('editinventaireManager')[0];
        const h = c.header && c.header.rendered ? c.header.getEl().dom.textContent : '';
        const cp = c.ownerCt && c.ownerCt.header && c.ownerCt.header.rendered ? c.ownerCt.header.getEl().dom.textContent : '';
        return { titre: String(c.title || ''), entete: h, panneau: cp }; });
      const vu = titre.entete + ' ' + titre.panneau;
      /* la fiche est un ecran colle : son propre en-tete est masque, le titre affiche est celui du panneau central */
      ok('Titre affiché : « Ouvrir l\'inventaire »', /^\s*Ouvrir l'inventaire/.test(titre.panneau), JSON.stringify(titre));
      ok('Plus de « Modification » ni « Edition » dans le titre', !/Modification de la fiche|Edition d'un inventaire/.test(titre.titre + ' ' + vu), JSON.stringify(titre));
      ok('La fiche charge ses lignes (comportement inchangé)', await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('editinventaireManager')[0];
        const g = c.down('gridpanel'); return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 }).then(() => true).catch(() => false));
    }

    /* non-regression : l'oeil reste sur les autres ecrans qui utilisent application_view_list.png */
    await V.ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Me contacter');
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('supportcontact')[0]; return c && c.rendered; }, null, { timeout: 30000 });
    const sc = await p.evaluate(icones, 'supportcontact');
    ok('« Me contacter » : « Voir le détail » garde l\'œil (act-voir)', sc['Voir le détail'] === 'act-voir', JSON.stringify(sc));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
