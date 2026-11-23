/* VENTE : LIGNE RETIREE PENDANT LA SAISIE DE SA QUANTITE (journal d'appaul du 21/11, N1 ; DESKTOP-CEPK07B 14:17:59,
 * CAISSE22 22:39).
 *
 * La quantite tapee dans une ligne part a la validation de la cellule, au meme clic que l'icone « Supprimer le
 * produit » de cette ligne : remove/vno/item puis update/item/vno sur la ligne retiree, refus 500
 * (StaleObjectStateException) ou message d'echec, alors que la caissiere voulait seulement retirer le produit.
 *
 * Parcours reel (compte e2e) : SERVICE CLIENT > Ventes, « Nouvelle vente », deux articles scannes (CIP tape + Entree),
 * clic dans la quantite de la 1re ligne, nouvelle quantite tapee, puis clic direct sur l'icone de suppression de cette
 * ligne :
 *  - une seule requete de retrait ; aucune requete de modification pour la ligne retiree ; aucune reponse >= 400 ;
 *  - aucune fenetre d'erreur, aucune erreur JavaScript ;
 *  - rapprochement ecran / base : une ligne restante (le 2e article, quantite 1), total de l'ecran = montant de la
 *    vente en base = somme des lignes ;
 *  - bilan : le 2e article reste modifiable (quantite 3 tapee + Entree : une modification envoyee, acceptee, montant =
 *    prix x 3 a l'ecran et en base) ;
 *  - vente d'essai retiree, stocks remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ARTICLES = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 50 AND LENGTH(f.int_CIP) = 7 AND IFNULL(f.bool_DECONDITIONNE, 0) = 0"
  + " ORDER BY f.int_CIP DESC LIMIT 2 OFFSET 5").split(/\r?\n/).map((l) => l.split('\t'));
const ventes = [];

function nettoyer() {
  for (const v of ventes) {
    const det = "(SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "')";
    q("DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN " + det + "; DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  }
  for (const [id, , dispo, total] of ARTICLES.filter((a) => a.length === 4)) {
    q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + dispo + ", int_NUMBER = " + total + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + id + "'");
  }
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const appels = []; p.on('request', (r) => { if (/vente\/(update\/item\/vno|remove\/vno\/item)/.test(r.url())) { appels.push({ url: r.url(), corps: r.postData() || '' }); } });
  const refus = []; p.on('response', (r) => { if (/vente\/(update|remove)\//.test(r.url()) && r.status() >= 400) { refus.push(r.status() + ' ' + r.url()); } });
  const boites = () => p.evaluate(() => (Ext.MessageBox.isVisible() ? [Ext.MessageBox.msg.getEl().dom.innerText] : []));
  const GRILLE = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('doventemanager #contenu gridpanel').filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
    return g ? g.getStore().getRange().map((r) => ({ id: r.get('lgPREENREGISTREMENTDETAILID'), produit: r.get('lgFAMILLEID'), qte: r.get('intQUANTITY'), pu: r.get('intPRICEUNITAIR'), montant: r.get('intPRICE') })) : []; });
  const cellule = (ligne, champ) => p.evaluate(([l, c]) => { const g = Ext.ComponentQuery.query('doventemanager #contenu gridpanel').filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
    const col = c === 'suppr' ? g.columns.filter((x) => x.xtype === 'actioncolumn')[0] : g.columns.filter((x) => x.dataIndex === c)[0];
    const cell = g.getView().getCell(g.getStore().getAt(l), col); const el = c === 'suppr' ? cell.down('img', true) || cell.dom : cell.dom;
    el.id = el.id || ('e2e-' + c + '-' + l); return el.id; }, [ligne, champ]);
  try {
    ok('Jeu d\'essai : deux articles en stock', ARTICLES.length === 2 && ARTICLES.every((a) => a[1]), ARTICLES.map((a) => a[1]).join(' '));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 });
    await p.waitForTimeout(1500);
    for (const [, cip] of ARTICLES) {
      await cliquer(p, CHAMP);
      await p.keyboard.type(cip, { delay: 30 });
      await p.keyboard.press('Enter');
      await p.waitForLoadState('networkidle').catch(() => {});
      await p.waitForTimeout(1500);
    }
    await p.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr').current; return c && parseInt(c.intPRICE, 10) > 0; }, null, { timeout: 20000 });
    const vente = await p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID);
    ventes.push(vente);
    await p.waitForTimeout(1000);
    const lignes0 = await GRILLE();
    ok('Deux lignes à l\'écran, deux en base', lignes0.length === 2 && q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + vente + "'") === '2', JSON.stringify(lignes0));
    const retiree = lignes0[0], restante = lignes0[1];

    /* quantite tapee dans la 1re ligne, puis clic direct sur « Supprimer le produit » de cette ligne */
    const n0 = appels.length;
    await p.click('#' + (await cellule(0, 'intQUANTITY')));
    await p.waitForTimeout(500);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('4', { delay: 40 });
    await p.click('#' + (await cellule(0, 'suppr')));
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(3000);
    const apres = appels.slice(n0);
    const retraits = apres.filter((a) => /remove\/vno\/item\//.test(a.url));
    const modifsRetiree = apres.filter((a) => /update\/item\/vno/.test(a.url) && a.corps.indexOf(retiree.id) >= 0);
    ok('Une seule requête de retrait, aucune modification de la ligne retirée, aucun refus', retraits.length === 1 && retraits[0].url.endsWith(retiree.id)
      && modifsRetiree.length === 0 && refus.length === 0, `retraits ${retraits.length} modifs ${modifsRetiree.length} refus ${refus.join(',')}`);
    const mb = await boites();
    ok('Aucune fenêtre d\'erreur, aucune erreur JavaScript', mb.length === 0 && erreurs.length === 0, mb.join(' | ') + ' ' + erreurs.join(' | '));
    if (mb.length) { await p.keyboard.press('Enter').catch(() => {}); await p.waitForTimeout(500); }

    const lignes1 = await GRILLE();
    const base1 = q("SELECT CONCAT(lg_FAMILLE_ID, '/', int_QUANTITY, '/', int_PRICE) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + vente + "'").split(/\r?\n/).filter(Boolean);
    const montantVente = Number(q("SELECT int_PRICE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vente + "'"));
    const totalEcran = await p.evaluate(() => Number(String(testextjs.app.getController('VenteCtr').getTotalField().getValue()).replace(/\D/g, '')));
    ok('Rapprochement : une ligne restante, le 2e article, quantité 1, à l\'écran et en base', lignes1.length === 1 && lignes1[0].produit === restante.produit && Number(lignes1[0].qte) === 1
      && base1.length === 1 && base1[0] === `${restante.produit}/1/${lignes1[0].montant}`, JSON.stringify(lignes1) + ' ' + base1.join(','));
    ok('Rapprochement : total de l\'écran = montant de la vente en base = somme des lignes', totalEcran === montantVente && montantVente === Number(lignes1[0] && lignes1[0].montant),
      `${totalEcran} / ${montantVente} / ${lignes1[0] && lignes1[0].montant}`);

    /* la ligne restante reste modifiable */
    const n1 = appels.length;
    await p.click('#' + (await cellule(0, 'intQUANTITY')));
    await p.waitForTimeout(500);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('3', { delay: 40 });
    await p.keyboard.press('Enter');
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(2000);
    const modifs = appels.slice(n1).filter((a) => /update\/item\/vno/.test(a.url));
    const [qte2, mt2] = q("SELECT CONCAT(int_QUANTITY, '/', int_PRICE) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + vente + "'").split('/').map(Number);
    const ecran2 = (await GRILLE())[0] || {};
    ok('Ligne restante modifiable : une modification envoyée, quantité 3, montant = prix × 3 à l\'écran et en base', modifs.length === 1 && refus.length === 0
      && qte2 === 3 && mt2 === Number(restante.pu) * 3 && Number(ecran2.qte) === 3 && Number(ecran2.montant) === mt2, `${modifs.length} ${qte2}/${mt2} écran ${JSON.stringify(ecran2)}`);
    ok('Aucune erreur JavaScript en fin de parcours', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Vente d\'essai retirée, stocks remis', ventes.every((v) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'") === '0')
      && ARTICLES.every(([id, , dispo]) => q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + id + "'") === dispo));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
