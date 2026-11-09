/* PLAN AVOIR DU 08/11, POINT 7 : « FICHIER JOURNAL » ET « ME CONTACTER » NE PRENNENT PAS TOUT L'ECRAN.
 *
 * Fichier journal (logfile) declare 570 px de haut : l'ajustement des ecrans colles relevait la borne sans relancer la
 * mise en page (meme defaut que « Facture de groupe », corrige par 66de696fd). « Me contacter » (supportcontact) a en
 * plus une grille « Mes demandes » de 320 px fixes : sous elle, une bande vide jusqu'au bas de l'ecran.
 *
 * Par l'ecran, ouvert par le vrai menu, a quatre tailles de fenetre (portable 15 pouces : 1366 x 768, 1920 x 1080 a
 * 125 % = 1536 x 864, a 150 % = 1280 x 720 ; petit ecran 1024 x 600), a la PREMIERE ouverture, sans autre clic :
 *   - le bas de l'ecran touche le bas du panneau central (ecart <= 2 px) ;
 *   - « Me contacter » : le bas de la grille « Mes demandes » touche le bas de l'ecran (<= 18 px : marge de 10 px du theme et cadre, comme la grille du
 *     Fichier journal : 16 px), sans le depasser (sinon sa pagination est coupee), et la grille garde au moins 120 px (son en-tete, une
 *     ligne et la pagination) ;
 *   - aucun defilement horizontal de la page.
 * Lecture seule : aucune demande n'est envoyee.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const ECRANS = [['logfile', 'MENU PHARMACIEN', 'Fichier Journal'], ['supportcontact', 'CENTRE DE SUPPORT', 'Me contacter']];
const TAILLES = [[1366, 768], [1536, 864], [1280, 720], [1024, 600]];

(async () => {
  let b = null;
  const err = [];
  try {
    b = await ENV_E2E.lancer(chromium);
    for (const [l, h] of TAILLES) {
      const p = await (await b.newContext({ viewport: { width: l, height: h } })).newPage();
      p.on('pageerror', (e) => err.push(e.message));
      await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
      for (const [xtype, parent, titre] of ECRANS) {
        await V.ouvrirMenu(p, parent, titre);
        await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return c && c.rendered && c.isVisible(true); }, xtype, { timeout: 30000 });
        await p.waitForTimeout(1500);
        const m = await p.evaluate((x) => {
          const c = Ext.ComponentQuery.query(x)[0], cont = c.ownerCt;
          const r = c.getEl().dom.getBoundingClientRect(), z = (cont.body || cont.getEl()).dom.getBoundingClientRect();
          const g = c.down('gridpanel'), rg = g ? g.getEl().dom.getBoundingClientRect() : null;
          return { basEcran: Math.round(r.bottom), basPanneau: Math.round(z.bottom), hauteur: Math.round(r.height), place: Math.round(z.height),
            basGrille: rg ? Math.round(rg.bottom) : null, hauteurGrille: rg ? Math.round(rg.height) : null,
            defilementH: document.documentElement.scrollWidth > window.innerWidth + 1 };
        }, xtype);
        ok(`${l}x${h} — ${titre} : pleine hauteur dès l'ouverture`, Math.abs(m.basPanneau - m.basEcran) <= 2 && m.hauteur >= m.place - 2, JSON.stringify(m));
        if (xtype === 'supportcontact') {
          ok(`${l}x${h} — ${titre} : la grille « Mes demandes » descend jusqu'au bas`, m.basEcran - m.basGrille <= 18 && m.basGrille <= m.basEcran + 1 && m.hauteurGrille >= 120, JSON.stringify(m));
        }
        ok(`${l}x${h} — ${titre} : aucun défilement horizontal`, !m.defilementH, JSON.stringify(m));
      }
      await p.context().close();
    }
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
