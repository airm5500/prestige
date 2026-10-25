/* VENTE : QUANTITE DECIMALE, PEREMPTION, VIREMENT (retours du 25/10, point 11).
 *
 * Par les vues (admin), SERVICE CLIENT > Ventes > Nouvelle vente, sur un produit du banc en stock :
 *  - quantite modifiee dans la grille a 1,5 : message clair (« nombre entier »), pas de « L'opération a échoué 500 »,
 *    la quantite revient a la valeur precedente, en base comme a l'ecran ;
 *  - le serveur refuse aussi une quantite decimale avec un message clair (sans erreur 500) ;
 *  - apres l'ajout d'un produit, le champ « péremption » est vide en attendant le produit suivant ;
 *  - le mode de reglement « Virement » n'est pas propose a la caisse (les autres modes restent) ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur. Vente d'essai retiree par la route de l'ecran Ventes.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, texteMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [FID, CIP] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 20 AND f.int_CIP REGEXP '^[0-9]{7}$' ORDER BY f.int_CIP LIMIT 1").split('\t');

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  let vente = null;
  const champ = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), champ, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await cliquer(p, champ);
    await p.keyboard.type(CIP, { delay: 5 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(3500);
    for (let i = 0; i < 3 && await texteMessage(p); i++) { await repondre(p, 'ok').catch(() => {}); await p.waitForTimeout(400); }
    vente = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').current; return c && c.lgPREENREGISTREMENTID; });
    const ligne = vente ? q(`SELECT CONCAT_WS('|', lg_PREENREGISTREMENT_DETAIL_ID, int_QUANTITY) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${vente}' AND lg_FAMILLE_ID = '${FID}' LIMIT 1`) : '';
    const [detailId, qteAvant] = ligne.split('|');
    ok('Précondition : produit ajouté à la vente', !!detailId, ligne);
    const peremption = await p.evaluate(() => { const f = Ext.ComponentQuery.query('doventemanager #peremptionProcheId')[0]; return f ? String(f.getValue() || '') : 'absent'; });
    ok('Après l\'ajout du produit : champ péremption vide en attendant le suivant', peremption === '', peremption);

    /* quantite 1,5 tapee dans la cellule de la grille (clic, saisie, Entree) */
    const cellule = await p.evaluate(() => { const g = Ext.ComponentQuery.query('doventemanager #venteGrid')[0]; const col = g.columns.find((c) => c.dataIndex === 'intQUANTITY');
      const idx = g.getView().getHeaderCt().getGridColumns().indexOf(col); const n = g.getView().getCell(g.getStore().getAt(0), g.getView().getHeaderCt().getGridColumns()[idx]); n.dom.setAttribute('data-e2e', 'qte'); return true; });
    await p.click('[data-e2e=qte]');
    await p.waitForTimeout(500);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('1.5', { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    const msg = await texteMessage(p);
    const ecran = await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #venteGrid')[0].getStore().getAt(0).get('intQUANTITY'));
    ok('Quantité 1,5 : message clair (nombre entier), pas « L\'opération a échoué »', /entier/i.test(msg || '') && !/a échoué/.test(msg || ''), msg);
    await repondre(p, 'ok').catch(() => {});
    ok('La quantité revient à la valeur précédente, à l\'écran et en base', String(ecran) === qteAvant && q(`SELECT int_QUANTITY FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${detailId}'`) === qteAvant,
      ecran + ' / ' + qteAvant);
    /* meme chose avec la virgule */
    await p.click('[data-e2e=qte]').catch(async () => { await p.evaluate(() => { const g = Ext.ComponentQuery.query('doventemanager #venteGrid')[0];
      const col = g.getView().getHeaderCt().getGridColumns().find((c) => c.dataIndex === 'intQUANTITY'); g.getView().getCell(g.getStore().getAt(0), col).dom.setAttribute('data-e2e', 'qte'); }); await p.click('[data-e2e=qte]'); });
    await p.waitForTimeout(500);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('2,5', { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    const msg2 = await texteMessage(p);
    await repondre(p, 'ok').catch(() => {});
    const ecran2 = await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #venteGrid')[0].getStore().getAt(0).get('intQUANTITY'));
    ok('Quantité 2,5 (virgule) : même message, quantité inchangée', /entier/i.test(msg2 || '') && String(ecran2) === qteAvant
      && q(`SELECT int_QUANTITY FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${detailId}'`) === qteAvant, msg2 + ' / ' + ecran2);
    const serveur = await p.evaluate(([id, fid]) => fetch('../api/v1/vente/update/item/vno', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: id, itemPu: 1000, qte: 1.5, qteServie: 1.5, produitId: fid }) }).then(async (r) => r.status + ' ' + (await r.text()).slice(0, 200)), [detailId, FID]);
    ok('Le serveur refuse aussi une quantité décimale, avec un message clair (pas d\'erreur 500)', /^(200|400) /.test(serveur) && /entier/i.test(serveur)
      && q(`SELECT int_QUANTITY FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${detailId}'`) === qteAvant, serveur);

    const modes = await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #typeReglement')[0]; c.getStore().load(); return true; })
      .then(() => p.waitForTimeout(1500)).then(() => p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #typeReglement')[0]; const l = []; c.getStore().each((r) => l.push(r.get('strNAME'))); return l; }));
    ok('Caisse : « Virement » n\'est pas proposé, les autres modes restent', modes.length > 3 && !modes.includes('Virement') && modes.includes('Especes'), modes.join(', '));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    if (vente) { await p.evaluate((id) => fetch('../api/v1/ventestats/remove/' + id, { method: 'POST' }), vente).catch(() => {}); }
    await b.close();
    ok('Vente d\'essai retirée', !vente || q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${vente}' AND str_STATUT = 'is_Process' AND b_IS_CANCEL = 0`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
