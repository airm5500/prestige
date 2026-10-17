/* SUPPRESSION D'UNE COMMANDE ENVOYEE DEUX FOIS (journal du 16/10, 10:31:44 : deux DELETE dans la meme seconde).
 *
 * Le second appel ne trouvait plus la commande et finissait en erreur 500 (« attempt to create delete event with null
 * entity »), affichee a l'utilisateur dans « Error Message ».
 *
 * Parcours par les vues, deux postes (deux sessions du meme utilisateur) sur GESTION DES COMMANDES > « Commande en
 * cours », reference tapee dans « Recherche » puis Entree, icone « Supprimer » de la ligne puis « Oui ». Les
 * commandes d'essai (une ligne chacune, sinon la liste ne les montre pas) sont creees avant et retirees a la fin.
 *  - ergonomie : a 1600 et 1920 px, toutes les icones de la ligne (dont « Supprimer ») sont dans la zone visible de
 *    la liste ; a 1366 px, la liste defile horizontalement (molette + Maj) jusqu'a elles ; un clic ne doit jamais
 *    dependre d'un defilement qu'un utilisateur ne peut pas faire ;
 *  - reference tapee vite puis Entree (douchette, saisie rapide) : la liste montre cette commande ;
 *  - un poste supprime : « Opération terminée », la commande et sa ligne disparaissent de la liste et de la base ;
 *  - liste perimee : le poste 1 supprime, puis le poste 2, qui affiche encore la commande, la supprime a son tour :
 *    « Opération terminée », aucun message d'erreur ;
 *  - les deux postes confirment en meme temps : aucun message d'erreur, commande supprimee.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, attendreMessage, repondre, texteMessage } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const IDS = ['E2E-CMD-DBL-1', 'E2E-CMD-DBL-2', 'E2E-CMD-DBL-3'];
const REF = (id) => id.replace(/-/g, '');
const liste = "('" + IDS.join("', '") + "')";
const nettoyer = () => q('DELETE FROM t_order_detail WHERE lg_ORDER_ID IN ' + liste + '; DELETE FROM t_order WHERE lg_ORDER_ID IN ' + liste);
const existe = (id) => q("SELECT (SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + id + "') + (SELECT COUNT(*) FROM t_order_detail WHERE lg_ORDER_ID = '" + id + "')") !== '0';

function creer() {
  const g = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' LIMIT 1");
  const u = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
  for (const id of IDS) {
    q("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, lg_GROSSISTE_ID, lg_USER_ID) VALUES ('"
      + id + "', '" + REF(id) + "', 1, 'is_Process', NOW(), NOW(), 0, '" + g + "', '" + u + "')");
    q("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID) SELECT '" + id + "-L', '" + id + "', f.lg_FAMILLE_ID, '" + g
      + "' FROM t_famille f WHERE f.str_STATUT = 'enable' LIMIT 1");
  }
}

/* un poste : connexion, menu, liste des commandes en cours */
async function poste(b, largeur) {
  const p = await (await b.newContext({ viewport: { width: largeur || 1600, height: 900 } })).newPage();
  p.erreurs = []; p.on('pageerror', (e) => p.erreurs.push(e.message));
  await connexion(p, 'admin', 'e2etest');
  await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Commande en cours');
  await p.waitForFunction(() => Ext.getCmp('OderGrid') && Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
  return p;
}

/* reference tapee dans « Recherche » puis Entree (delai de frappe : 5 ms douchette, 40 ms clavier) */
async function chercher(p, id, delai) {
  await cliquer(p, '#rechecher');
  await p.keyboard.press('Control+A');
  await p.keyboard.type(REF(id), { delay: delai === undefined ? 40 : delai });
  await p.keyboard.press('Enter');
  /* la liste ne montre que la commande cherchee */
  await p.waitForFunction((ref) => { const st = Ext.getCmp('OderGrid').getStore();
    return !st.isLoading() && st.getCount() === 1 && st.getAt(0).get('str_REF_ORDER') === ref; }, REF(id), { timeout: 30000 });
  return p.locator('#OderGrid .x-grid-row').filter({ hasText: REF(id) }).first();
}

/* icones de la premiere ligne hors de la zone visible de la liste */
const iconesHorsVue = (p) => p.evaluate(() => {
  const vue = Ext.getCmp('OderGrid').getView().el.dom.getBoundingClientRect();
  const ligne = document.querySelector('#OderGrid .x-grid-row');
  return Array.from(ligne.querySelectorAll('img[data-qtip]')).filter((i) => i.offsetWidth > 0 && getComputedStyle(i).visibility !== 'hidden')
    .filter((i) => { const r = i.getBoundingClientRect(); return r.left < vue.left || r.right > vue.right; })
    .map((i) => i.getAttribute('data-qtip').slice(0, 20));
});

/* icone Supprimer de la ligne : la confirmation s'affiche */
async function demanderSuppression(p, ligne) {
  await ligne.locator('img[data-qtip="Supprimer"]').click();
  return !!(await attendreMessage(p, 'Confirmer la suppresssion', 10000));
}

/* « Oui », puis le message de fin (confirmation ou erreur) */
async function confirmer(p) {
  await repondre(p, 'yes');
  const fin = Date.now() + 30000;
  let t = '';
  while (Date.now() < fin) { t = await texteMessage(p); if (/Opération terminée|Error Message/.test(t)) { break; } await p.waitForTimeout(200); }
  if (/Opération terminée|Error Message/.test(t)) { await repondre(p, 'ok').catch(() => {}); }
  return t;
}

(async () => {
  nettoyer(); creer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  try {
    for (const largeur of [1366, 1600, 1920]) {
      const p = await poste(b, largeur);
      await chercher(p, IDS[0]);
      let hors = await iconesHorsVue(p), geste = '';
      if (largeur < 1600 && hors.length) {
        /* ecran etroit : vrai defilement horizontal de la liste, a la molette avec Maj */
        const r = await p.evaluate(() => { const v = Ext.getCmp('OderGrid').getView().el.dom.getBoundingClientRect(); return { x: v.left + v.width / 2, y: v.top + 30 }; });
        await p.mouse.move(r.x, r.y); await p.keyboard.down('Shift'); await p.mouse.wheel(0, 2000); await p.keyboard.up('Shift'); await p.waitForTimeout(500);
        hors = await iconesHorsVue(p); geste = ' après défilement horizontal';
      }
      ok('Ergonomie ' + largeur + ' px : toutes les icônes de la ligne, dont « Supprimer », dans la zone visible' + geste, hors.length === 0, hors.join(', '));
      await p.context().close();
    }
    const p1 = await poste(b), p2 = await poste(b);
    const rapide = await chercher(p1, IDS[0], 5).then(() => true).catch(() => false);
    ok('Référence tapée vite puis Entrée (douchette) : la liste montre la commande', rapide);

    /* 1. un poste supprime */
    let l1 = await chercher(p1, IDS[0]);
    ok('Poste 1 : icône « Supprimer » → confirmation', await demanderSuppression(p1, l1));
    let t = await confirmer(p1);
    await p1.waitForTimeout(1500);
    ok('Poste 1 : « Oui » → « Opération terminée », commande et ligne supprimées, ligne retirée de la liste',
      /Opération terminée/.test(t) && !existe(IDS[0]) && await p1.locator('#OderGrid .x-grid-row').filter({ hasText: REF(IDS[0]) }).count() === 0, t);

    /* 2. liste perimee sur le poste 2 */
    l1 = await chercher(p1, IDS[1]);
    const l2 = await chercher(p2, IDS[1]);
    await demanderSuppression(p1, l1);
    t = await confirmer(p1);
    ok('Liste périmée : le poste 1 supprime la commande', /Opération terminée/.test(t) && !existe(IDS[1]), t);
    ok('Liste périmée : le poste 2 l\'affiche encore et demande sa suppression', await demanderSuppression(p2, l2));
    t = await confirmer(p2);
    ok('Liste périmée : le poste 2 confirme → « Opération terminée », aucun message d\'erreur', /Opération terminée/.test(t) && !/Error Message/.test(t), t);

    /* 3. les deux postes confirment en meme temps */
    const a1 = await chercher(p1, IDS[2]), a2 = await chercher(p2, IDS[2]);
    await demanderSuppression(p1, a1); await demanderSuppression(p2, a2);
    const [r1, r2] = await Promise.all([confirmer(p1), confirmer(p2)]);
    ok('Les deux postes confirment en même temps : aucun message d\'erreur, commande et ligne supprimées',
      !/Error Message/.test(r1 + r2) && /Opération terminée/.test(r1) && /Opération terminée/.test(r2) && !existe(IDS[2]), r1 + ' || ' + r2);
    ok('Aucune erreur JavaScript', !p1.erreurs.length && !p2.erreurs.length, p1.erreurs.concat(p2.erreurs).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Commandes d\'essai retirées', IDS.every((id) => !existe(id)));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
