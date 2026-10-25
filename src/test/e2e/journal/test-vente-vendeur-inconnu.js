/* VENTE : VENDEUR NON RECONNU SIGNALE DES LA SAISIE (retour du 23/10).
 *
 * La liste « Vendeur » reste en saisie libre ; un nom tape qui ne correspond a aucun utilisateur faisait enregistrer la
 * vente au nom de l'utilisateur connecte, sans que personne ne le sache avant la fin. Desormais on le dit juste apres
 * la saisie. Parcours par les vues (admin, SERVICE CLIENT > Ventes > nouvelle vente) :
 *  - « ZZZ PERSONNE » tape, Tab : le champ est signale aussitot (avant tout article), avec le message « Vendeur non
 *    reconnu » qui dit au nom de qui la vente sera enregistree ; le focus suit son cours (pas de fenetre) ;
 *  - le nom complet d'un vendeur tape sans le choisir, Tab : il est reconnu et retenu (son identifiant), plus de signal ;
 *  - aucune vente creee par ces saisies, aucune erreur JavaScript.
 * Lecture seule (aucune vente creee).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [VID, VNOM] = q("SELECT lg_USER_ID, TRIM(CONCAT(str_FIRST_NAME, ' ', str_LAST_NAME)) FROM t_user WHERE str_STATUT = 'enable' AND str_LOGIN <> 'admin'"
  + " AND IFNULL(str_FIRST_NAME, '') <> '' ORDER BY str_LOGIN LIMIT 1").split('\t');

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const ajouts = []; p.on('request', (r) => { if (/vente\/add\//.test(r.url())) { ajouts.push(r.url()); } });
  const etat = () => p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #user')[0]; const t = document.querySelector('.vente-toast');
    const i = c.inputEl.dom; return { valeur: c.getValue(), invalide: c.inputEl.hasCls('vente-vendeur-inconnu') && getComputedStyle(i).borderTopColor === 'rgb(198, 40, 40)',
      erreur: i.getAttribute('data-qtip') || '', formulaireValide: c.up('form') ? c.up('form').getForm().isValid() : true,
      toast: t ? t.textContent : '', focus: document.activeElement ? (document.activeElement.id || document.activeElement.name || '') : '', userAFocus: c.hasFocus }; });
  try {
    ok('Jeu d\'essai : un vendeur avec un nom', !!VNOM, VNOM);
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #user').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);

    await cliquer(p, 'doventemanager #user');
    await p.keyboard.type('ZZZ PERSONNE', { delay: 20 });
    await p.keyboard.press('Tab');
    await p.waitForTimeout(1500);
    const e1 = await etat();
    ok('« ZZZ PERSONNE » + Tab : signalé aussitôt « Vendeur non reconnu », au nom de qui la vente sera enregistrée',
      e1.invalide && /Vendeur non reconnu/i.test(e1.erreur) && /connecté/i.test(e1.erreur) && /Vendeur non reconnu/i.test(e1.toast) && e1.formulaireValide, JSON.stringify(e1));
    ok('Pas de fenêtre, le focus a quitté le champ', !e1.userAFocus && (await p.evaluate(() => Ext.WindowManager.getActive() === null || !Ext.WindowManager.getActive().modal)), e1.focus);

    await cliquer(p, 'doventemanager #user');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(VNOM, { delay: 20 });
    await p.waitForTimeout(1200);
    await p.keyboard.press('Tab');
    await p.waitForTimeout(1500);
    const e2 = await etat();
    ok('Nom complet d\'un vendeur tapé sans le choisir + Tab : reconnu et retenu, plus de signal', e2.valeur === VID && !e2.invalide, JSON.stringify(e2));
    ok('Aucune vente créée par ces saisies, aucune erreur JavaScript', ajouts.length === 0 && erreurs.length === 0, ajouts.concat(erreurs).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
