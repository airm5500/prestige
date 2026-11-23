/* VOLET DU MENU REFERME APRES LE CHOIX D'UN ECRAN (non-regression du lot 9, 22/11).
 *
 * Defaut : le volet « Prestige Navigation » replie s'ouvre par-dessus l'ecran ; la souris sur le sous-menu suspend sa
 * fermeture, et le choix d'une entree cachait le sous-menu sans la relancer. Le volet restait ouvert par-dessus le haut
 * gauche de l'ecran choisi et prenait les clics destines a ses champs (vu par test-champ-periode-7-ecrans-2211 :
 * « navigation subtree intercepts pointer events » sur le champ periode). Plus frequent depuis le tri alphabetique des
 * sous-menus (les longs volets defilent jusqu'a l'entree).
 * Vrai chemin : clic sur le volet replie, sur le menu parent, sur l'entree du sous-menu (comme l'utilisateur), sans
 * bouger la souris ensuite ; entre deux ecrans, la fenetre est agrandie puis remise. 3 tours sur 6 ecrans de 3 menus (dont des longs volets), a 1366x768 et 1280x720.
 * Attendu : 1,5 s apres le choix, le volet est referme ; au centre du premier champ de l'ecran, c'est le champ qu'on
 * touche, pas le volet ; le sous-menu est ferme.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 3000) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const libelle = (composant, defaut) => q(`SELECT str_DESCRIPTION FROM t_sous_menu WHERE str_COMPOSANT = '${composant}' AND str_Status = 'enable' LIMIT 1`) || defaut;
const ECRANS = [
  { parent: 'GESTION COURANTE', menu: libelle('articlevendurecapitulatif', 'Articles vendus récap'), xtype: 'articlevendurecapitulatif' },
  { parent: 'GESTION COURANTE', menu: libelle('articlevendumanager', 'Liste des articles vendus'), xtype: 'articlevendumanager' },
  { parent: 'ANALYSE DE GESTION', menu: libelle('tvastat', 'Statistique sur TVA2'), xtype: 'tvastat' },
  { parent: 'ANALYSE DE GESTION', menu: libelle('tableauPhama', 'Tableau de bord du pharmacien2'), xtype: 'tableauPhama' },
  { parent: 'ANALYSE DE GESTION', menu: libelle('activitiessummary', 'Récapitulatif activité'), xtype: 'activitiessummary' },
  { parent: 'SERVICE CLIENT', menu: libelle('ventemanager', 'Vente terminées'), xtype: 'ventemanager' }
];

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const restes = [];
    const orphelins = [];
    let essais = 0;
    for (const [lg, ht] of [[1366, 768], [1280, 720]]) {
      await p.setViewportSize({ width: lg, height: ht });
      for (let tour = 1; tour <= 3; tour++) {
        for (const E of ECRANS) {
          /* la fenetre change de taille entre deux ecrans (agrandie, puis remise), comme dans test-champ-periode-7-ecrans */
          for (const [l, h] of [[1280, 720], [1920, 1080], [lg, ht]]) { await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(500); }
          await V.ouvrirMenu(p, E.parent, E.menu);
          /* 0,6 s apres le choix, souris immobile : le volet est deja referme (sa fermeture ne depend plus de la souris) */
          await p.waitForTimeout(600);
          const juste = await p.evaluate(() => { const nav = Ext.ComponentQuery.query('navigation')[0];
            return /x-border-region-slide-in/.test(nav.getEl().dom.className) && nav.getEl().isVisible() && nav.getEl().dom.getBoundingClientRect().width > 40; });
          if (juste) { orphelins.push(`${lg}×${ht} tour ${tour} ${E.menu}`); }
          await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), E.xtype, { timeout: 60000 });
          await p.waitForTimeout(1500);
          const e = await p.evaluate((x) => {
            const nav = Ext.ComponentQuery.query('navigation')[0], ecran = Ext.ComponentQuery.query(x).find((c) => c.isVisible(true));
            const champ = ecran.query('field').find((f) => f.isVisible(true) && f.inputEl && f.inputEl.dom.getBoundingClientRect().width > 20);
            const r = champ ? champ.inputEl.dom.getBoundingClientRect() : ecran.getEl().dom.getBoundingClientRect();
            const cx = r.left + Math.min(r.width / 2, 40), cy = r.top + r.height / 2, el = document.elementFromPoint(cx, cy);
            const flotte = !!nav.getEl().dom.className.match(/x-border-region-slide-in/) && nav.getEl().isVisible() && nav.getEl().dom.getBoundingClientRect().width > 40;
            return { volet: flotte, prisParLeVolet: !!(el && nav.getEl().dom.contains(el)), sousMenu: Ext.ComponentQuery.query('menu[cls~=prestige-flyout-menu]').some((m) => m.isVisible()) };
          }, E.xtype);
          essais++;
          if (e.volet || e.prisParLeVolet || e.sousMenu) { restes.push(`${lg}×${ht} tour ${tour} ${E.menu} ${JSON.stringify(e)}`); }
        }
      }
    }
    ok(`0,6 s après chaque choix d'écran (${essais} choix), souris immobile : le volet est déjà refermé`,
      orphelins.length === 0, orphelins.length + ' fois : ' + orphelins.slice(0, 4).join(' | '));
    ok(`Après chaque choix d'écran (${essais} choix, 6 écrans × 3 tours × 2 tailles) : volet refermé, sous-menu fermé, le premier champ de l'écran reçoit le clic`,
      restes.length === 0, restes.length + ' fois : ' + restes.slice(0, 4).join(' | '));
    /* le volet s'ouvre toujours a la demande */
    await V.ouvrirMenu(p, ECRANS[0].parent, ECRANS[0].menu);
    await p.waitForTimeout(1500);
    const id = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n.placeholder ? n.placeholder.getId() : null; });
    await p.click('#' + id);
    await p.waitForTimeout(600);
    ok('Le volet se rouvre au clic sur sa barre', await p.locator('.prestige-nav .x-grid-row').filter({ visible: true }).count() > 0);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
