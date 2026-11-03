/* RETOUR DU 03/11 : « pourquoi ne pas rendre la police parametrable dans les modeles ? avec 5 polices dont Segoe UI
 * par defaut ? »
 *
 * Par les vues, avec de vrais clics, dans le menu « Modeles de ticket » (Parametrages). Ce que le test etablit :
 *  - « Vente assurance » (80 mm) : le champ « Police » propose cinq polices, Segoe UI choisie par defaut ;
 *  - chaque choix est ecrit dans sa propre police, et le champ tient dans la colonne des reglages (ergonomie) ;
 *  - un clic sur « Tahoma » : le choix passe sur Tahoma, l'apercu se redessine, « Enregistrer » s'active ;
 *  - « Enregistrer » : police = Tahoma en base pour ce ticket et cette largeur, et le choix reste affiche apres
 *    un aller-retour sur un autre ticket ;
 *  - aucune erreur JavaScript.
 * Reglages remis comme avant.
 *
 * node retours/test-ticket-police.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MENU = q("SELECT str_VALUE FROM t_menu WHERE lg_MENU_ID = '10'");
const AVANT = q("SELECT HEX(reglages) FROM ticket_modele WHERE ticket = 'VENTE_ASSURANCE' AND largeur = 80");
const remettre = () => q(AVANT ? `UPDATE ticket_modele SET reglages = UNHEX('${AVANT}') WHERE ticket = 'VENTE_ASSURANCE' AND largeur = 80`
  : "DELETE FROM ticket_modele WHERE ticket = 'VENTE_ASSURANCE' AND largeur = 80");
const POLICES = ['Segoe UI', 'Arial Narrow', 'Tahoma', 'Calibri', 'Verdana'];

(async () => {
  remettre();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const racine = '.mtk';
  const apresApercu = async (action) => {
    const r = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 30000 });
    await action();
    await r;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    await p.waitForTimeout(400);
  };
  const image = () => p.locator(racine + ' .mtk-feuille img').getAttribute('src');
  const choisie = () => p.evaluate(() => {
    const s = document.querySelector('.mtk [data-choix=police][aria-checked=true]');
    return s ? s.getAttribute('data-valeur') : null;
  });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const premier = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 60000 });
    await ouvrirMenu(p, MENU, 'Modèles de ticket');
    await premier;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    const largeur80 = p.locator(racine + ' .mtk-barre [data-choix=largeur][data-valeur="80"]');
    if (await largeur80.count()) {
      const actif = /mtk-on|actif|pressed|mtk-sel/.test((await largeur80.getAttribute('class')) || '') || await largeur80.getAttribute('aria-checked') === 'true';
      if (!actif) { await apresApercu(() => largeur80.click()); }
    }
    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=VENTE_ASSURANCE]').click());

    const boutons = await p.evaluate(() => Array.from(document.querySelectorAll('.mtk [data-choix=police]')).map((x) => ({
      v: x.getAttribute('data-valeur'), texte: x.textContent.trim(), police: getComputedStyle(x.querySelector('span') || x).fontFamily
    })));
    ok('Champ « Police » : cinq polices proposées', JSON.stringify(boutons.map((x) => x.v)) === JSON.stringify(POLICES), JSON.stringify(boutons.map((x) => x.v)));
    ok('Segoe UI choisie par défaut', await choisie() === 'Segoe UI', await choisie());
    ok('Chaque choix est écrit dans sa propre police', boutons.length === 5 && boutons.every((x) => x.police.replace(/["']/g, '').startsWith(x.v)),
      JSON.stringify(boutons.map((x) => x.police)));
    const tient = await p.evaluate(() => {
      const champ = document.querySelector('.mtk .mtk-police');
      const col = document.querySelector('.mtk .mtk-reglages');
      if (!champ || !col) { return null; }
      const c = col.getBoundingClientRect();
      const dehors = Array.from(champ.querySelectorAll('button')).filter((x) => {
        const r = x.getBoundingClientRect();
        return r.left < c.left - 1 || r.right > c.right + 1;
      }).length;
      const r = Array.from(champ.querySelectorAll('button')).map((x) => x.getBoundingClientRect());
      const rangees = new Set(r.map((x) => Math.round(x.top))).size;
      const hauteurs = new Set(r.map((x) => Math.round(x.height))).size;
      const coupes = Array.from(champ.querySelectorAll('button')).filter((x) => x.scrollWidth > x.clientWidth + 1).length;
      return { dehors, debordeColonne: col.scrollWidth > col.clientWidth + 1, rangees, hauteurs, coupes,
        alignes: Math.abs(r[0].left - r[3].left) < 2 && Math.abs(r[2].right - r[4].right) < 2 };
    });
    ok('Le champ tient dans la colonne des réglages (aucun bouton coupé)', tient && tient.dehors === 0 && !tient.debordeColonne && tient.coupes === 0, JSON.stringify(tient));
    ok('Grille régulière : deux rangées alignées, boutons de même hauteur', tient && tient.rangees === 2 && tient.hauteurs === 1 && tient.alignes, JSON.stringify(tient));

    const avant = await image();
    await apresApercu(() => p.locator(racine + ' [data-choix=police][data-valeur="Tahoma"]').click());
    ok('Clic sur « Tahoma » : le choix passe sur Tahoma', await choisie() === 'Tahoma', await choisie());
    ok('Aperçu redessiné dans la nouvelle police', (await image()) !== avant);
    const enregistrer = p.locator(racine + ' [data-action=enregistrer]');
    ok('« Enregistrer » actif', await enregistrer.isEnabled());
    await enregistrer.click();
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('modelesticket')[0]; return c && !c.etat.brouillons['80:VENTE_ASSURANCE']; }, null, { timeout: 30000 });
    const enBase = JSON.parse(q("SELECT reglages FROM ticket_modele WHERE ticket = 'VENTE_ASSURANCE' AND largeur = 80") || '{}');
    ok('Enregistrer : police = Tahoma en base (vente assurance, 80 mm)', enBase.police === 'Tahoma', JSON.stringify(enBase).slice(0, 250));

    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=VENTE]').click());
    ok('Vente au comptant : toujours Segoe UI (réglage par ticket)', await choisie() === 'Segoe UI', await choisie());
    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=VENTE_ASSURANCE]').click());
    ok('Retour sur la vente assurance : Tahoma reste choisie', await choisie() === 'Tahoma', await choisie());
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    remettre();
    ok('Réglages remis comme avant', q("SELECT COALESCE(HEX(MAX(reglages)), '') FROM ticket_modele WHERE ticket = 'VENTE_ASSURANCE' AND largeur = 80") === AVANT);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
