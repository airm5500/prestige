/* VENTES TERMINEES : LISTE DES POSTES RELUE A CHAQUE OUVERTURE (retours du 25/10, point 4).
 *
 * Par les vues (admin), SERVICE CLIENT > Vente terminées : la liste « Poste » etait chargee une fois a l'ouverture de
 * l'ecran ; un poste apparu ensuite (nouvelle vente d'un autre poste) n'y figurait qu'apres reouverture de l'ecran.
 *  - ouverture de la liste : les postes connus ;
 *  - une vente est faite depuis un nouveau poste (ligne d'essai, retiree a la fin) ;
 *  - nouvelle ouverture de la liste, sans quitter l'ecran : le nouveau poste y est ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const V = 'E2E-POSTES-V1', POSTE = 'E2E-SUNMI-' + Date.now().toString().slice(-6);
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");

(async () => {
  q(`DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${V}'`);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  /* clic sur la fleche de la liste, comme l'utilisateur, puis lecture des postes proposes */
  const ouvrirListe = async () => {
    const id = await p.evaluate(() => { const c = Ext.ComponentQuery.query('ventemanager #posteVente')[0]; if (c.isExpanded) { c.collapse(); } return c.triggerEl.first().dom.id; });
    await p.click('#' + id);
    await p.waitForTimeout(1500);
    return p.evaluate(() => { const c = Ext.ComponentQuery.query('ventemanager #posteVente')[0]; const l = c.getStore().collect('poste'); c.collapse(); return l; });
  };
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('ventemanager')[0]; return v && v.down('#posteVente') && v.down('#posteVente').isVisible(true); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const avant = await ouvrirListe();
    ok('Ouverture de la liste : sans le nouveau poste', !avant.includes(POSTE), avant.length + ' poste(s)');
    q("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, lg_USER_ID, int_PRICE, str_STATUT, dt_CREATED, dt_UPDATED, str_TYPE_VENTE, lg_TYPE_VENTE_ID, b_IS_CANCEL, str_POSTE, str_POSTE_SAISIE)"
      + ` VALUES ('${V}', '${V}', '${ADMIN}', 0, 'is_Process', NOW(), NOW(), 'VNO', '1', 0, '${POSTE}', '${POSTE}')`);
    const apres = await ouvrirListe();
    ok('Nouvelle ouverture, sans quitter l\'écran : le nouveau poste est proposé', apres.includes(POSTE), apres.slice(0, 5).join(', '));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    q(`DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${V}'`);
    ok('Vente d\'essai retirée', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${V}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
