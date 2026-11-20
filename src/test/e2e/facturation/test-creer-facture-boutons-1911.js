/* PLAN DU 19/11, POINT 10 : FENÊTRE « CRÉER UNE FACTURE », BOUTONS AU NOUVEAU STYLE.
 * Avant : « G&eacute;n&eacute;rer facture » et « RETOUR » a l'ancien style (gris, petits), « RETOUR » en capitales et a
 * droite du geste principal ; les « Rechercher » sans style. Modele : entree en stock d'un BL (bonlivraison/action/add.js) :
 * « Retour » sobre (ordo-btn) a gauche, geste principal en vert (ordo-btn-primaire), taille moyenne.
 * Controles, sur un portable (1366 x 700) et un grand ecran (1600 x 900) :
 *  - les trois barres de la fenetre (organismes, assistant, selection de bons) : « Retour » puis « Générer facture »,
 *    au nouveau style, taille moyenne ; aucun « RETOUR » ni « G&eacute;n... » ecrit en toutes lettres ;
 *  - les deux « Rechercher » au nouveau style ;
 *  - a l'ecran : « Générer facture » vert, texte blanc, cliquable sans defiler, au moins 28 px de haut ; « Retour » a
 *    sa gauche ;
 *  - « Rechercher » puis « Retour » marchent toujours (la fenetre se ferme) ; rien n'est ecrit en base.
 * Lancement seul : node src/test/e2e/facturation/test-creer-facture-boutons-1911.js
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const traces = () => q('SELECT CONCAT_WS(\'|\', (SELECT COUNT(*) FROM t_facture), (SELECT COUNT(*) FROM t_facture_detail), (SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent WHERE str_STATUT_FACTURE = \'charged\'))');

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  const avant = traces();
  try {
    for (const [l, h] of [[1366, 700], [1600, 900]]) {
      const t = l + ' x ' + h;
      const p = await (await b.newContext({ viewport: { width: l, height: h } })).newPage();
      p.on('pageerror', (e) => erreurs.push(e.message));
      await connexion(p, ENV_E2E.LOGIN, 'e2etest');
      await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('facturemanager', 'Factures', ''));
      await p.waitForFunction(() => Ext.ComponentQuery.query('facturemanager').some((x) => x.isVisible(true)), null, { timeout: 30000 });
      await p.evaluate(() => { const bt = Ext.ComponentQuery.query('facturemanager button').find((x) => /^Cr(&eacute;|é)er$/.test(x.text || '') && x.isVisible(true));
        bt.getEl().dom.setAttribute('data-e2e', 'creer'); });
      await p.click('[data-e2e=creer]');
      await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('#fenetreCreerFacture')[0]; return w && w.isVisible() && Ext.getCmp('btn_create_facture'); }, null, { timeout: 30000 });
      await p.waitForTimeout(1200);
      const m = await p.evaluate(() => {
        const w = Ext.ComponentQuery.query('#fenetreCreerFacture')[0];
        const boutons = w.query('button').filter((x) => x.text);
        const barres = w.query('toolbar[dock=bottom]').map((tb) => tb.query('button').filter((x) => x.text).map((x) => ({ texte: x.text, cls: x.cls || '', scale: x.scale }))).filter((x) => x.length);
        const rech = boutons.filter((x) => x.text === 'Rechercher').map((x) => x.cls || '');
        const g = Ext.getCmp('btn_create_facture'), r = Ext.getCmp('btn_cancel');
        const rg = g.getEl().dom.getBoundingClientRect(), rr = r.getEl().dom.getBoundingClientRect(), rw = w.getEl().dom.getBoundingClientRect();
        const dessus = document.elementFromPoint(rg.left + rg.width / 2, rg.top + rg.height / 2);
        const st = getComputedStyle(g.getEl().dom), inner = g.getEl().dom.querySelector('.x-btn-inner');
        return { barres, rech, anciens: boutons.filter((x) => /^RETOUR$|&eacute;/.test(x.text)).map((x) => x.text),
          fond: st.backgroundColor, texte: inner ? getComputedStyle(inner).color : '', hauteur: Math.round(rg.height),
          cliquable: rg.width > 0 && rg.top >= rw.top && rg.bottom <= rw.bottom && !!dessus && g.getEl().dom.contains(dessus),
          retourAGauche: rr.right <= rg.left && Math.abs(rr.top - rg.top) < 6 };
      });
      const attendu = JSON.stringify([{ texte: 'Retour', cls: 'ordo-btn', scale: 'medium' }, { texte: 'Générer facture', cls: 'ordo-btn-primaire', scale: 'medium' }]);
      ok(t + ' : trois barres « Retour » puis « Générer facture », nouveau style, taille moyenne', m.barres.length === 3 && m.barres.every((x) => JSON.stringify(x) === attendu), JSON.stringify(m.barres));
      ok(t + ' : plus de « RETOUR » ni de libellé à entités', m.anciens.length === 0, m.anciens.join(', '));
      ok(t + ' : les deux « Rechercher » au nouveau style', m.rech.length === 2 && m.rech.every((c) => c === 'ordo-btn'), m.rech.join(', '));
      ok(t + ' : « Générer facture » vert, texte blanc', m.fond === 'rgb(23, 152, 126)' && m.texte === 'rgb(255, 255, 255)', m.fond + ' / ' + m.texte);
      ok(t + ' : « Générer facture » cliquable sans défiler, au moins 28 px de haut', m.cliquable && m.hauteur >= 28, JSON.stringify({ c: m.cliquable, h: m.hauteur }));
      ok(t + ' : « Retour » à gauche de « Générer facture »', m.retourAGauche);
      /* les gestes marchent toujours : « Rechercher » puis « Retour » ferme la fenetre */
      await cliquer(p, '#btn_add');
      await p.waitForTimeout(1500);
      await cliquer(p, '#btn_cancel');
      const ferme = await p.waitForFunction(() => !Ext.ComponentQuery.query('#fenetreCreerFacture').some((x) => x.isVisible()), null, { timeout: 15000 }).then(() => true).catch(() => false);
      ok(t + ' : « Rechercher » puis « Retour » ferme la fenêtre', ferme);
      await p.close();
    }
    ok('Bilan : rien d\'écrit en base (factures, détails, bons facturés)', traces() === avant, avant + ' -> ' + traces());
    ok('Aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
