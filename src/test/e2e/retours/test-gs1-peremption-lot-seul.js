/* CODE « PEREMPTION + LOT » SANS LE PRODUIT (retour du 24/10).
 *
 * La douchette Sunmi lit 1727010110012402264447 : (17) 01/01/2027 et (10) lot 012402264447, sans le produit (ni 01 ni
 * 240). C'est le code-barres lineaire imprime a cote du code produit. La vente disait « Ce code n'est pas une
 * etiquette GS1 » et Etiquetage Pro « Produit inconnu (CIP 1727...) » : l'utilisateur ne comprenait pas.
 * Par les vues (admin), lecture GS1 activee le temps du test :
 *  - vente (SERVICE CLIENT > Ventes > Nouvelle vente) : le code tape comme une douchette + Entree -> message qui dit
 *    ce que contient le code (peremption, lot) et qu'il faut scanner le code du produit ; aucune ligne ajoutee ;
 *  - Etiquetage Pro (GESTION DU STOCK > Étiquettage Pro > Lire une étiquette) : peremption et lot affiches, alerte
 *    « ne contient pas le produit » au lieu de « Produit inconnu (CIP …) » ;
 *  - non-regression : un vrai CIP est toujours trouve a la vente ; aucune vente creee. Parametre remis.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CODE = '1727010110012402264447';
const LECTURE = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'");
const compte = () => q('SELECT COUNT(*) FROM t_preenregistrement_detail');

(async () => {
  q("UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'");
  const avant = compte();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, 'admin', 'e2etest');
    /* --- vente */
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    const champ = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), champ, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await cliquer(p, champ);
    await p.keyboard.type(CODE, { delay: 5 });
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => Ext.Msg.isVisible(), null, { timeout: 20000 }).catch(() => {});
    const boite = await p.evaluate(() => (Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.textContent : ''));
    ok('Vente : le message dit ce que contient le code (péremption 01/01/2027, lot) et qu\'il manque le produit',
      /01\/01\/2027/.test(boite) && /012402264447/.test(boite) && /produit/i.test(boite) && !/n'est pas une étiquette GS1/.test(boite), boite);
    await p.evaluate(() => { if (Ext.Msg.isVisible()) { Ext.Msg.hide(); } });
    ok('Vente : aucune ligne ajoutée', compte() === avant, compte() + ' / ' + avant);

    /* --- Etiquetage Pro */
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Étiquettage Pro');
    await p.waitForFunction(() => Ext.ComponentQuery.query('#outilLecture').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, '#outilLecture');
    await p.waitForFunction(() => Ext.ComponentQuery.query('etqlecture #lectureCode').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await cliquer(p, 'etqlecture #lectureCode');
    await p.keyboard.type(CODE, { delay: 5 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2500);
    const lu = await p.evaluate(() => Ext.ComponentQuery.query('etqlecture #lectureResultat')[0].getEl().dom.textContent);
    ok('Étiquetage Pro : péremption et lot affichés, alerte « ne contient pas le produit », pas de « Produit inconnu (CIP …) »',
      /01\/01\/2027/.test(lu) && /012402264447/.test(lu) && /ne contient pas le produit/.test(lu) && !/Produit inconnu dans Prestige \(CIP 1727/.test(lu), lu.slice(0, 300));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    q(`UPDATE t_parameters SET str_VALUE = '${LECTURE}' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'`);
    ok('Paramètre remis, aucune vente créée', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'") === LECTURE && compte() === avant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
