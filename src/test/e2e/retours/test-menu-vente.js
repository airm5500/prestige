/* MENU VENTE (maquette validee le 30/09) : ventes en attente du service client au dessin commun.
 *
 * Caissier KGA3 : deux ventes au comptant mises en attente, puis le menu. Controles : bouton principal, puces de type
 * (le filtre du controleur suit), tuiles, colonnes client et type en pastille, icones d'action au trait, « Voir » ouvre le
 * detail, « Modifier » rappelle la vente dans la caisse. Ventes de test retirees a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const crees = [];

(async () => {
  const produits = q("SELECT f.lg_FAMILLE_ID, f.int_PRICE FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE s.int_NUMBER_AVAILABLE>10 AND f.int_PRICE>0 AND f.str_STATUT='enable' ORDER BY f.str_NAME LIMIT 2").split('\n').map((l) => l.split('\t'));
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    const ajouter = (produit) => p.evaluate(async (a) => JSON.parse(await (await fetch('../api/v1/vente/add/vno', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) })).text()),
      { typeVenteId: '1', natureVenteId: '1', produitId: produit[0], itemPu: Number(produit[1]), qte: 1, qteServie: 1, devis: false, remiseId: '', venteId: null, userVendeurId: user, prevente: false });
    const v1 = (await ajouter(produits[0])).data.lgPREENREGISTREMENTID; crees.push(v1);
    await p.waitForTimeout(1100);
    const v2 = (await ajouter(produits[1])).data.lgPREENREGISTREMENTID; crees.push(v2);
    const refs = q("SELECT GROUP_CONCAT(str_REF ORDER BY dt_CREATED) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + v1 + "','" + v2 + "')").split(',');
    ok('Deux ventes en attente créées', refs.length === 2, refs.join(','));

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('cloturerventemanager', {}));
    await p.waitForFunction((r) => { const g = Ext.ComponentQuery.query('cloturerventemanager gridpanel')[0]; return g && g.getStore().findExact('strREF', r) >= 0; }, refs[1], { timeout: 30000 });
    await p.waitForTimeout(600);
    const e = await p.evaluate((r) => { const m = Ext.ComponentQuery.query('cloturerventemanager')[0]; const d = m.getEl().dom; const g = m.down('gridpanel');
      const i = g.getStore().findExact('strREF', r); const ligne = g.getView().getNode(i);
      return { principal: m.down('#addBtn').hasCls('ordo-btn-primaire'), puces: [...d.querySelectorAll('.ordo-puce .x-btn-inner')].map((x) => x.textContent),
        comboVisible: m.down('#typeVente').isVisible(), tuiles: [...d.querySelectorAll('.vc-tuile')].map((t) => t.textContent), total: g.getStore().getCount(),
        entetes: g.headerCt.getVisibleGridColumns().map((c) => c.text), pastille: (ligne.querySelector('.va-pill') || {}).textContent,
        icones: ligne.querySelectorAll('.act-ico').length, chargement: g.hasCls('theme-chargement') }; }, refs[1]);
    ok('Nouvelle vente en bouton principal, type en puces (le combo reste caché)', e.principal && e.puces.join('|') === 'Toutes|Au comptant|Assurance / carnet' && !e.comboVisible, JSON.stringify(e));
    ok('Tuiles : nombre de ventes, montant, panier moyen, la plus ancienne', e.tuiles.length === 4 && e.tuiles[0].indexOf(String(e.total)) === 0, JSON.stringify(e.tuiles));
    ok('Colonnes : client, type en pastille « Au comptant », deux icônes au trait', e.entetes.indexOf('Client') >= 0 && e.pastille === 'Au comptant' && e.icones === 2 && !e.chargement, JSON.stringify(e));
    /* Puce « Assurance / carnet » : le filtre du controleur suit, nos ventes au comptant disparaissent. */
    const clic = async (texte) => { await p.evaluate((t) => { const bt = Ext.ComponentQuery.query('cloturerventemanager button[cls=ordo-puce]').find((x) => x.getText() === t); document.getElementById(bt.getId()).id = bt.getId(); window.__cible = bt.getId(); }, texte); await p.click('#' + await p.evaluate(() => window.__cible)); await p.waitForTimeout(1200); };
    await clic('Assurance / carnet');
    const vo = await p.evaluate((r) => { const m = Ext.ComponentQuery.query('cloturerventemanager')[0]; return { combo: m.down('#typeVente').getValue(), trouve: m.down('gridpanel').getStore().findExact('strREF', r) }; }, refs[1]);
    ok('Puce « Assurance / carnet » : filtre VO appliqué, les ventes au comptant sortent de la liste', vo.combo === 'VO' && vo.trouve < 0, JSON.stringify(vo));
    await clic('Toutes');
    const tout = await p.evaluate((r) => { const m = Ext.ComponentQuery.query('cloturerventemanager')[0]; return { combo: m.down('#typeVente').getValue(), trouve: m.down('gridpanel').getStore().findExact('strREF', r) }; }, refs[1]);
    ok('Puce « Toutes » : filtre retiré, les ventes reviennent', !tout.combo && tout.trouve >= 0, JSON.stringify(tout));
    /* Recherche par Entree. */
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('cloturerventemanager #query')[0].inputEl.id));
    await p.keyboard.type(refs[0]); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    const rech = await p.evaluate(() => Ext.ComponentQuery.query('cloturerventemanager gridpanel')[0].getStore().collect('strREF'));
    ok('Recherche (Entrée) : seule la vente cherchée reste', rech.length === 1 && rech[0] === refs[0], rech.join(','));
    /* Voir : detail. */
    const icone = async (cls) => { const id = await p.evaluate((c) => { const g = Ext.ComponentQuery.query('cloturerventemanager gridpanel')[0]; const n = g.getView().getNode(0).querySelector('.' + c); n.id = 'icone-visee'; return n.id; }, cls); await p.click('#' + id); };
    await icone('act-voir');
    await p.waitForFunction(() => Ext.ComponentQuery.query('preventeDetail').length > 0, null, { timeout: 15000 });
    ok('« Voir » ouvre le détail de la vente', true);
    await p.evaluate(() => Ext.ComponentQuery.query('preventeDetail')[0].destroy());
    await icone('act-modifier');
    await p.waitForFunction((id) => { const c = testextjs.app.getController('VenteCtr'); return Ext.ComponentQuery.query('doventemanager').length > 0 && c.getCurrent && c.getCurrent() && c.getCurrent().lgPREENREGISTREMENTID === id; }, v1, { timeout: 20000 });
    ok('« Modifier » rappelle la vente dans la caisse', true);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (ex) {
    ok('Parcours sans exception', false, ex.message);
  } finally {
    await b.close();
    for (const id of crees) {
      exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + id + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + id + "';");
    }
    ok('Ventes de test retirées', crees.every((id) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + id + "'") === '0'));
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
