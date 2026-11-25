/* MENU « VENTES » : BANDE VIDE A DROITE (video du 25/11, poste sur videoprojecteur 1280 x 720, navigateur a 80 %).
 *
 * Constat : ouvert depuis l'ecran de vente par le volet de navigation, l'ecran « Ventes » (onglets « Ventes en
 * attente » / « Ventes en cours et interrompues ») ne prenait qu'une partie de la largeur ; une bande vide restait a
 * droite tant qu'on ne repassait pas par l'accueil.
 * Vrai chemin : volet replie -> SERVICE CLIENT -> Ventes, comme l'utilisateur, en partant de l'ecran de vente
 * (« Nouvelle vente ») puis de l'accueil ; 1600 x 900 (= 1280 x 720 a 80 %), 1280 x 720 et 1366 x 768 ; deux tours.
 * Attendu, 1,5 s puis 4 s apres le choix : le bord droit de l'ecran « Ventes » est au bord droit de la zone de travail
 * (a 40 px pres), la barre d'outils et le tableau aussi ; aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/ergonomie/test-ventes-largeur-2511.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 3000) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const libelle = (composant, defaut) => q(`SELECT str_DESCRIPTION FROM t_sous_menu WHERE str_COMPOSANT = '${composant}' AND str_Status = 'enable' LIMIT 1`) || defaut;

/* largeurs : ecran « Ventes », sa barre, son tableau, et la zone de travail qui le contient */
const mesurer = (p) => p.evaluate(() => {
  const e = Ext.ComponentQuery.query('cloturerventemanager').find((c) => c.isVisible(true));
  if (!e) { return null; }
  const zone = e.getEl().dom.parentElement.closest('.x-panel-body, .x-container, .x-panel') || e.getEl().dom.parentElement;
  const r = (el) => el ? Math.round(el.getBoundingClientRect().right) : null;
  const barre = e.down('#addBtn') ? e.down('#addBtn').up('toolbar') : null, grille = e.down('gridpanel');
  return { zone: r(zone), ecran: r(e.getEl().dom), barre: barre ? r(barre.getEl().dom) : null, grille: grille ? r(grille.getEl().dom) : null,
    fenetre: window.innerWidth };
});

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const VENTES = libelle('cloturerventemanager', 'Ventes');
    const ecarts = [];
    let essais = 0;
    for (const [lg, ht] of [[1600, 900], [1280, 720], [1366, 768]]) {
      await p.setViewportSize({ width: lg, height: ht });
      for (let tour = 1; tour <= 2; tour++) {
        for (const depart of ['écran de vente', 'accueil']) {
          await V.ouvrirMenu(p, 'SERVICE CLIENT', VENTES);
          await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager').some((c) => c.isVisible(true)), null, { timeout: 60000 });
          await p.waitForTimeout(800);
          if (depart === 'écran de vente') {
            /* « Nouvelle vente » : l'ecran de vente s'ouvre, comme dans la video */
            await V.cliquer(p, 'cloturerventemanager #addBtn');
            await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager').some((c) => c.isVisible(true)), null, { timeout: 60000 });
          } else {
            /* clic sur « PRESTIGE 3 » : accueil, comme dans la video */
            await p.click('.hdr-brand-txt');
          }
          await p.waitForTimeout(1500);
          await V.ouvrirMenu(p, 'SERVICE CLIENT', VENTES);
          await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager').some((c) => c.isVisible(true)), null, { timeout: 60000 });
          for (const attente of [1500, 2500]) {
            await p.waitForTimeout(attente);
            const m = await mesurer(p);
            essais++;
            const juste = m && m.fenetre - m.ecran <= 40 && m.zone - m.ecran <= 40 && m.zone - m.barre <= 60 && m.zone - m.grille <= 60;
            if (!juste) { ecarts.push(`${lg}×${ht} tour ${tour} depuis ${depart}, ${attente === 1500 ? '1,5 s' : '4 s'} : ${JSON.stringify(m)}`); }
          }
        }
      }
    }
    ok(`Écran « Ventes » sur toute la largeur de la zone de travail (${essais} mesures : 3 tailles × 2 tours × 2 départs × 2 instants)`,
      ecarts.length === 0, ecarts.length + ' écart(s) : ' + ecarts.slice(0, 6).join(' | '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack);
  } finally {
    await b.close().catch(() => {});
  }
  const ko = res.filter((r) => !r.c).length;
  console.log(`\n===== ${res.length - ko}/${res.length} PASS =====`);
  process.exit(ko ? 1 : 0);
})();
