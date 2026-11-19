/* « CREER BON DE LIVRAISON » CLIQUE DEUX FOIS (retour support du 18/11, R4).
 *
 * Serveur, 17/11 12:45 : « CREER BON DE LIVRAISON » clique deux fois dans la meme seconde, deux fenetres aux memes
 * identifiants ; « Enregistrer » clique deux fois ; le second clic tombe sur une fenetre detruite :
 * « Ext.getCmp(...) is undefined » (add.js:252, onbtncreerbl).
 *
 * Par les clics de l'utilisateur (admin), GESTION DES COMMANDES > Commande en cours, deux chemins :
 *  A. detail de la commande, double clic sur « CREER BON DE LIVRAISON » ;
 *  B. liste des commandes, double clic sur l'icone « Créer le bon de livraisson ».
 * Attendu pour chacun : une seule fenetre « Creation bon de livraison » ; saisie au clavier ; double clic sur
 * « Enregistrer » : une seule requete creerbl, « Enregistrer » grise pendant l'envoi, aucune erreur JavaScript.
 * Bilan (ni plus ni moins) : un seul BL pour la commande, une ligne de BL par ligne de commande avec sa quantite
 * commandee (2 et 3), commande close, lignes de commande en « entree en stock », stock des produits inchange.
 * Jeu d'essai retire a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SUF = String(Date.now()).slice(-6);
const CA = 'E2E-R4-A', CB = 'E2E-R4-B';
const REFS = { [CA]: 'E2ER4A' + SUF, [CB]: 'E2ER4B' + SUF };
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY lg_GROSSISTE_ID LIMIT 1");
const P = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE BETWEEN 3 AND 80 ORDER BY f.lg_FAMILLE_ID LIMIT 2 OFFSET 7").split(/\r?\n/);
const QTE = [2, 3], PAF = [1000, 1500];
const stocks = () => q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, '=', int_NUMBER_AVAILABLE) ORDER BY lg_FAMILLE_ID) FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID IN ('${P[0]}', '${P[1]}')`);

function nettoyer() {
  q(`DELETE d FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.lg_ORDER_ID IN ('${CA}', '${CB}');`
    + ` DELETE FROM t_bon_livraison WHERE lg_ORDER_ID IN ('${CA}', '${CB}'); DELETE FROM t_order_detail WHERE lg_ORDER_ID IN ('${CA}', '${CB}');`
    + ` DELETE FROM t_order WHERE lg_ORDER_ID IN ('${CA}', '${CB}');`);
}

(async () => {
  nettoyer();
  const stock0 = stocks();
  [CA, CB].forEach((c) => {
    q("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
      + ` VALUES ('${c}', '${c}${SUF}', 2, '${G}', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}' LIMIT 1), 'is_Process', NOW(), NOW(), ${QTE[0] * PAF[0] + QTE[1] * PAF[1]}, 0, 0)`);
    P.forEach((f, i) => q("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, prixAchat, prixUnitaire, str_STATUT, dt_CREATED, dt_UPDATED)"
      + ` VALUES ('${c}-${i}', '${c}', '${f}', '${G}', ${QTE[i]}, ${QTE[i] * PAF[i]}, ${PAF[i]}, ${2 * PAF[i]}, ${PAF[i]}, ${2 * PAF[i]}, 'is_Process', NOW(), NOW())`));
  });
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [], envois = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('request', (r) => { if (r.url().includes('commande/creerbl')) { envois.push(r.postData() || ''); } });

  const listeCommandes = async (cmd) => {
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Commande en cours');
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const champ = p.locator('#rechecher-inputEl');
    await champ.click(); await champ.fill(''); await p.keyboard.type(cmd, { delay: 15 }); await p.keyboard.press('Enter');
    const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: cmd }).first();
    await ligne.waitFor({ timeout: 30000 });
    return ligne;
  };
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && w.title === 'Creation bon de livraison').length);
  /* saisie au clavier, puis double clic sur « Enregistrer » ; rend l'etat du bouton pendant l'envoi */
  const enregistrer = async (ref) => {
    const montant = await p.evaluate(() => String(window.montantachat));
    const saisir = async (id, v) => { const c = p.locator('#' + id + '-inputEl'); await c.click(); await c.fill(''); await p.keyboard.type(v, { delay: 15 }); };
    await saisir('str_REF_LIVRAISON', ref);
    await saisir('int_MHT', montant);
    await saisir('int_TVA', '0');
    const avant = envois.length;
    const bouton = p.locator('.x-window').filter({ visible: true, hasText: 'Saisie du bon de livraison' }).getByText('Enregistrer', { exact: true });
    await bouton.dblclick();
    const grise = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && x.title === 'Creation bon de livraison')[0];
      const bt = w && w.down('button[text=Enregistrer]'); return bt ? bt.isDisabled() : 'fermee'; });
    await p.waitForFunction(() => Ext.ComponentQuery.query('bonlivraisonmanager').some((x) => x.isVisible(true)) || Ext.MessageBox.isVisible(), null, { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(2500);
    return { envois: envois.length - avant, grise, message: await p.evaluate(() => (Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.innerText : '')) };
  };
  const bilan = (c, chemin) => {
    const bls = q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '${c}'`);
    const lignes = q(`SELECT GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, ':', d.int_QTE_CMDE) ORDER BY d.lg_FAMILLE_ID) FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.lg_ORDER_ID = '${c}'`);
    const attendu = P.map((f, i) => f + ':' + QTE[i]).sort().join(',');
    ok(chemin + ' — bilan : un seul BL, avec la référence saisie', bls === '1' && q(`SELECT str_REF_LIVRAISON FROM t_bon_livraison WHERE lg_ORDER_ID = '${c}'`) === REFS[c], bls + ' BL');
    ok(chemin + ' — bilan : une ligne de BL par ligne de commande, quantités 2 et 3', lignes === attendu, lignes + ' / ' + attendu);
    ok(chemin + ' — bilan : commande close, ses deux lignes en entrée en stock', q(`SELECT str_STATUT FROM t_order WHERE lg_ORDER_ID = '${c}'`) === 'is_Closed'
      && q(`SELECT COUNT(*) FROM t_order_detail WHERE lg_ORDER_ID = '${c}' AND str_STATUT = 'ENTREE_STOCK'`) === '2',
      q(`SELECT GROUP_CONCAT(str_STATUT) FROM t_order_detail WHERE lg_ORDER_ID = '${c}'`));
    ok(chemin + ' — bilan : stock des produits inchangé (le BL n\'est pas encore entré)', stocks() === stock0, stocks() + ' / ' + stock0);
  };

  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* A. detail de la commande */
    const la = await listeCommandes(CA + SUF);
    await la.locator('img[data-qtip="Modifier"]').click();
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.locator('#' + await p.evaluate(() => Ext.getCmp('btn_creerbl').btnEl.dom.id)).dblclick();
    await p.waitForFunction(() => Ext.getCmp('str_REF_LIVRAISON') && Ext.getCmp('str_REF_LIVRAISON').isVisible(true), null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    ok('A. Détail, double clic sur « CREER BON DE LIVRAISON » : une seule fenêtre', await fenetres() === 1, await fenetres() + ' fenêtre(s)');
    let r = await enregistrer(REFS[CA]);
    ok('A. Double clic sur « Enregistrer » : une seule requête creerbl', r.envois === 1, JSON.stringify(r));
    ok('A. « Enregistrer » grisé pendant l\'envoi', r.grise === true || r.grise === 'fermee', JSON.stringify(r));
    ok('A. Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    bilan(CA, 'A');

    /* B. liste des commandes, icone de la ligne */
    const nErr = erreurs.length;
    const lb = await listeCommandes(CB + SUF);
    await lb.locator('img[data-qtip="Créer le bon de livraisson"]').dblclick();
    await p.waitForFunction(() => Ext.getCmp('str_REF_LIVRAISON') && Ext.getCmp('str_REF_LIVRAISON').isVisible(true), null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    ok('B. Liste, double clic sur l\'icône : une seule fenêtre', await fenetres() === 1, await fenetres() + ' fenêtre(s)');
    r = await enregistrer(REFS[CB]);
    ok('B. Double clic sur « Enregistrer » : une seule requête creerbl', r.envois === 1, JSON.stringify(r));
    ok('B. Aucune erreur JavaScript', erreurs.length === nErr, erreurs.slice(nErr).join(' | '));
    bilan(CB, 'B');
    ok('Aucune fenêtre du navigateur', dialogues.length === 0, dialogues.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré, stock inchangé', q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID IN ('${CA}', '${CB}')`) === '0'
      && q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID IN ('${CA}', '${CB}')`) === '0' && stocks() === stock0);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
