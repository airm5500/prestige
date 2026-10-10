/* ALERTE D'INTERACTIONS SUR L'ECRAN DE VENTE (retours du 07/10), contre le faux service DS Pharmagora local.
 * Deux articles en stock recoivent les CIP du faux service (A = DOLIPRANE / paracetamol, B = classe Antivitamines K).
 *  - parametre KEY_INTERACTIONS_VENTE = 1 : saisie de A au clavier -> pas de bandeau ; saisie de B -> bandeau non
 *    bloquant « précaution d'emploi » A <-> B avec le conseil, aucune fenetre, la grille reste visible ;
 *  - parametre a 0 (defaut) : le serveur ne calcule rien (active = false) ;
 *  - vente d'essai, cache et parametres retires / remis a la fin ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const faux = require('./faux-pharmagora');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const SORTIE = process.env.SORTIE || '/tmp';
const CLES = ['KEY_MONOGRAPHIE_ACTIF', 'KEY_MONOGRAPHIE_URL', 'KEY_INTERACTIONS_VENTE'];
const avant = {};
CLES.forEach((k) => { avant[k] = q("SELECT IFNULL(MAX(str_VALUE), '') FROM t_parameters WHERE str_KEY = '" + k + "'"); });
const param = (k, v) => exec("UPDATE t_parameters SET str_VALUE = '" + v + "' WHERE str_KEY = '" + k + "'");
const [A, B] = q("SELECT CONCAT(f.lg_FAMILLE_ID, '|', f.int_CIP, '|', TRIM(f.str_NAME)) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 5 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_CIP REGEXP '^[0-9]{7}$'"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1 ORDER BY f.str_NAME LIMIT 2 OFFSET 20").split('\n').map((l) => l.split('|'));
let venteId = null;
function nettoyer() {
  if (venteId) {
    exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
  }
  exec("DELETE FROM t_monographie WHERE str_PRODUIT IN ('506504', '900001');"
    + "DELETE FROM t_monographie_produit WHERE lg_FAMILLE_ID IN ('" + A[0] + "', '" + B[0] + "')");
}

(async () => {
  const site = await faux.demarrer(A[1], B[1]);
  nettoyer();
  param('KEY_MONOGRAPHIE_URL', 'http://127.0.0.1:' + site.port + '/diivision/');
  param('KEY_MONOGRAPHIE_ACTIF', '1');
  param('KEY_INTERACTIONS_VENTE', '1');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', process.env.E2E_LOGIN || 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} }));
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const fermerBoite = async () => { const s = await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; const x = m && m.down('button[itemId=ok]'); return x && x.el ? '#' + x.el.dom.id : null; }); if (s) { await p.click(s); await p.waitForTimeout(400); } };
    await fermerBoite();
    const saisir = async (art) => {
      const champ = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit')[0].inputEl.id);
      await p.click(champ);
      await p.keyboard.type(art[1], { delay: 40 });
      await p.waitForSelector('.x-boundlist-item', { state: 'visible', timeout: 20000 });
      await p.click('.x-boundlist-item >> nth=0');
      await p.waitForTimeout(500);
      const qte = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #qtyField')[0].inputEl.id);
      await p.click(qte); await p.keyboard.press('Control+A'); await p.keyboard.type('1'); await p.keyboard.press('Enter');
      await p.waitForTimeout(2500);
      await fermerBoite();
    };
    const bandeau = () => p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #bandeauInteractions')[0];
      const g = Ext.ComponentQuery.query('doventemanager #venteGrid')[0];
      return { visible: c.isVisible(), txt: c.getEl() ? c.getEl().dom.textContent : '', lignes: c.getEl() ? c.getEl().dom.querySelectorAll('.inter-ligne.g2').length : 0,
        grille: g.getStore().getCount(), grilleH: g.getHeight(), boite: Ext.ComponentQuery.query('messagebox{isVisible()}').length,
        venteId: (testextjs.app.getController('VenteCtr').current || {}).lgPREENREGISTREMENTID }; });
    await saisir(A);
    let v = await bandeau();
    venteId = v.venteId;
    ok('Un seul produit : pas de bandeau', venteId && v.grille === 1 && !v.visible, JSON.stringify(v));
    await saisir(B);
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('doventemanager #bandeauInteractions')[0]; return c && c.isVisible(); }, null, { timeout: 30000 }).catch(() => {});
    v = await bandeau();
    ok('Deuxième produit (AVK) : bandeau « précaution d\'emploi » avec les deux articles et le conseil', v.visible && v.grille === 2 && v.lignes === 1
      && v.txt.includes(A[2]) && v.txt.includes(B[2]) && /INR/.test(v.txt) && /Précaution/.test(v.txt), JSON.stringify(v));
    ok('Alerte non bloquante : aucune fenêtre, la grille reste visible (≥ 200 px)', v.boite === 0 && v.grilleH >= 200, JSON.stringify(v));
    const tronque = await p.evaluate(() => { const l = document.querySelector('.inter-ligne'); const t = document.querySelector('.inter-tete'); return { l: !!(l && l.getAttribute('data-qtip')), tete: t.scrollWidth <= t.clientWidth + 1 }; });
    ok('Ligne longue : texte complet en infobulle, titre non tronqué', tronque.l && tronque.tete, JSON.stringify(tronque));
    await p.screenshot({ path: SORTIE + '/interactions-vente.png' });
    param('KEY_INTERACTIONS_VENTE', '0');
    const r0 = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/monographie/interactions/vente/' + id)).text()), venteId);
    ok('Paramètre à 0 (défaut) : rien n\'est calculé', r0.success && r0.active === false && !r0.alertes, JSON.stringify(r0));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Exécution sans exception', false, x.stack);
  } finally {
    CLES.forEach((k) => param(k, avant[k]));
    nettoyer();
    await b.close();
    await site.fermer();
    const f = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - f) + '/' + res.length + ' OK');
    process.exit(f ? 1 : 0);
  }
})();
