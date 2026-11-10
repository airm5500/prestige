/* PLAN DU 09/11, POINT 19 : ICONE DU MENU « CAMPAGNES SMS / WHATSAPP ».
 *
 * Avant : le menu prenait la cloche des notifications (la cle « sms » de l'entree des notifications). Par l'ecran,
 * connecte en admin :
 *  - dans le volet du menu, la ligne « CAMPAGNES SMS / WHATSAPP » porte le porte-voix (fa-bullhorn), en violet ;
 *  - la ligne « NOTIFICATIONS » garde la cloche ;
 *  - non-regression : pour chaque menu de la base, l'icone choisie par l'ecran est celle de l'ancienne table
 *    (lue dans le commit de reference), sauf pour les campagnes ;
 *  - aucune erreur JavaScript.
 */
const { execSync } = require('child_process');
const path = require('path');
const C = require('../audits/commun');
const { ok, q } = C;

const REFERENCE = process.env.REF_ICONES || '7d05972ea';

/* l'ancienne table des icones et l'ancien choix (cle la plus longue d'abord) */
function ancienChoix() {
  const racine = path.resolve(__dirname, '../../../..');
  const src = execSync(`git show ${REFERENCE}:src/main/webapp/general/app/view/Navigation.js`, { cwd: racine, encoding: 'utf8', maxBuffer: 1 << 24 });
  const m = src.match(/var PRESTIGE_ICON_MAP = (\[[\s\S]*?\n\]);/);
  const table = new Function('return ' + m[1])();
  const triee = table.slice().sort((a, b) => b.keys[0].length - a.keys[0].length);
  return (texte) => { const l = (texte || '').toLowerCase(); const e = triee.find((x) => x.keys.some((k) => l.indexOf(k) !== -1)); return e ? e.icon : null; };
}

(async () => {
  const { b, p, erreurs } = await C.connecter();
  try {
    const visible = (sel) => p.locator(sel).filter({ visible: true });
    if (await visible('.prestige-nav .x-grid-row').count() === 0) {
      const id = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n.placeholder ? n.placeholder.getId() : null; });
      await p.click('#' + id);
    }
    await visible('.prestige-nav .x-grid-row').first().waitFor({ timeout: 15000 });
    await p.waitForTimeout(800);
    const ligne = async (texte) => p.evaluate((t) => {
      const r = Array.from(document.querySelectorAll('.prestige-nav .x-grid-row')).find((x) => x.offsetParent && x.textContent.trim().toUpperCase() === t);
      if (!r) { return null; }
      const i = r.querySelector('i.fa-solid');
      return { icone: i ? Array.from(i.classList).filter((c) => /^fa-(?!solid)/.test(c)).join(' ') : '', couleur: i ? getComputedStyle(i).color : '' };
    }, texte);
    const camp = await ligne('CAMPAGNES SMS / WHATSAPP');
    ok('Menu « CAMPAGNES SMS / WHATSAPP » : porte-voix (fa-bullhorn) en violet', !!camp && camp.icone === 'fa-bullhorn' && camp.couleur === 'rgb(124, 58, 237)', JSON.stringify(camp));
    const notif = await ligne('NOTIFICATIONS');
    ok('Menu « NOTIFICATIONS » : la cloche reste', !!notif && notif.icone === 'fa-bell', JSON.stringify(notif));

    const menus = q("SELECT GROUP_CONCAT(DISTINCT REPLACE(str_DESCRIPTION, '§', '') SEPARATOR '§') FROM t_menu WHERE str_DESCRIPTION IS NOT NULL").split('§').filter(Boolean);
    const avant = ancienChoix();
    const apres = await p.evaluate((l) => l.map((t) => { const e = testextjs.view.Navigation.prototype._matchIcon(t); return e ? e.icon : null; }), menus);
    const changes = menus.map((t, i) => ({ t, avant: avant(t), apres: apres[i] })).filter((x) => x.avant !== x.apres);
    ok(`Non-régression sur les ${menus.length} menus de la base : seule l'icône des campagnes change`,
      menus.length > 10 && changes.length > 0 && changes.every((x) => /CAMPAGNE/i.test(x.t) && x.apres === 'fa-bullhorn'), JSON.stringify(changes));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    C.nettoyer();
    await b.close();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
