/* VENTE : QUANTITE DECIMALE SAISIE DANS LA GRILLE (journal du poste caisse 3, 03/09).
 *
 * « JsonbException : Unable to deserialize property 'qte' ... Integer » sur vente/update/item/vno : la colonne QD de
 * la grille acceptait le point, une quantite 1.5 partait au serveur, qui repondait « erreur interne » et ouvrait un
 * incident au Centre de support.
 * Parcours par les vues (admin, SERVICE CLIENT > Ventes > nouvelle vente, un article) :
 *  - clic sur la cellule QD de la ligne, « 1.5 » tape au clavier, Entree : la modification part en nombre entier, sans
 *    erreur serveur ni message d'echec ;
 *  - une quantite decimale envoyee malgre tout (autre poste, application) est refusee proprement (HTTP 400) avec le
 *    nom du champ, sans « erreur interne ».
 * La vente d'essai et le stock de l'article sont remis a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, texteMessage } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [PRODUIT, CIP, STOCK, STOCK_TOTAL] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 50 AND LENGTH(f.int_CIP) = 7 AND IFNULL(f.bool_DECONDITIONNE, 0) = 0"
  + " ORDER BY f.int_CIP DESC LIMIT 1").split('\t');
const ventes = [];

function nettoyer() {
  for (const v of ventes) {
    const det = "(SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "')";
    q("DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN " + det + "; DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  }
  q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + STOCK + ", int_NUMBER = " + STOCK_TOTAL + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'");
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const modifs = []; p.on('request', (r) => { if (/vente\/update\/item\/vno/.test(r.url())) { modifs.push(r.postData()); } });
  const echecs = []; p.on('response', (r) => { if (/vente\/update\/item\/vno/.test(r.url()) && r.status() >= 400) { echecs.push(r.status()); } });
  try {
    ok('Jeu d\'essai : un article en stock', !!CIP, CIP);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await cliquer(p, CHAMP);
    await p.keyboard.type(CIP, { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr').current; return c && parseInt(c.intPRICE, 10) > 0; }, null, { timeout: 20000 });
    const vente = await p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID);
    ventes.push(vente);
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(1200);

    /* cellule QD de la ligne : vrai clic, frappe, Entree */
    const id = await p.evaluate(() => { const g = Ext.ComponentQuery.query('doventemanager gridpanel').filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
      const col = g.columns.filter((c) => c.dataIndex === 'intQUANTITY')[0]; const cell = g.getView().getCell(g.getStore().getAt(0), col);
      cell.dom.id = cell.dom.id || 'e2e-qd'; return cell.dom.id; });
    await p.click('#' + id);
    await p.waitForTimeout(500);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('1.5', { delay: 40 });
    await p.keyboard.press('Enter');
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(1500);
    const corps = modifs.map((m) => { try { return JSON.parse(m).qte; } catch (e) { return m; } });
    const message = await texteMessage(p);
    ok('QD « 1.5 » tapé dans la grille : la modification part en nombre entier, sans erreur serveur ni message d\'échec',
      corps.length > 0 && corps.every((x) => Number.isInteger(x)) && echecs.length === 0 && !/échoué|erreur/i.test(message), JSON.stringify(corps) + ' ' + echecs.join(',') + ' ' + message);

    const ligne = q("SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + vente + "' LIMIT 1");
    const r = await p.evaluate(async (l) => { const x = await fetch('../api/v1/vente/update/item/vno', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: l, qte: 1.5, qteServie: 1.5 }) }); return { s: x.status, t: await x.text() }; }, ligne);
    ok('Quantité décimale envoyée malgré tout : refus 400 qui nomme le champ, pas d\'« erreur interne »', r.s === 400 && /qte/.test(r.t) && !/erreur interne/i.test(r.t), r.s + ' ' + r.t.slice(0, 160));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Vente d\'essai retirée, stock remis', ventes.every((v) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'") === '0')
      && q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'") === STOCK);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
