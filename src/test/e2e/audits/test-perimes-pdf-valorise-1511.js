/* RETOUR DU 15/11 : « pour le PDF (produits périmés) je veux le prix d'achat et le prix de vente avec une valorisation
 * à la dernière page ».
 *
 * Vrai chemin : menu GESTION DU STOCK › Saisie de produits périmés (Liste), dates tapées au clavier, « rechercher »,
 * « Imprimer », puis « Imprimer par groupe › Famille ».
 * Jeu d'essai (laborex_audit, retiré à la fin) : 4 saisies clôturées le 12/03/2019 (aucune autre ce jour-là), 3
 * produits de familles différentes, quantités 1, 3, 2 et 5, prix d'achat et de vente de la base (différents).
 * Contrôles :
 *  - rapprochement ligne par ligne, écran / PDF / base : CIP, lot, quantité, prix de vente ; PDF / base : prix
 *    d'achat, valeur d'achat (quantité × prix d'achat), valeur de vente (quantité × prix de vente) ;
 *  - valorisation à la dernière page seulement : lignes, quantité, valeur d'achat, valeur de vente, marge perdue =
 *    sommes de la base ;
 *  - par famille : un « Sous-total » par famille, même valorisation.
 * Lecture du PDF : pdftotext.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const editions = require('../support/editions');
const { execFileSync } = require('child_process');
const fs = require('fs');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const M = 'E2E-PV15-';
const JOUR = '2019-03-12';
const PROD = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.int_PAF, f.int_PRICE, f.lg_FAMILLEARTICLE_ID) FROM t_famille f"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 0 AND f.int_PAF > 0 AND f.int_PAF <> f.int_PRICE AND f.int_CIP REGEXP '^[0-9]{7}$'"
  + " AND f.lg_FAMILLEARTICLE_ID IS NOT NULL GROUP BY f.lg_FAMILLEARTICLE_ID ORDER BY f.lg_FAMILLEARTICLE_ID LIMIT 3").split('\n').map((l) => l.split('|'));
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
/* lot, produit, quantite */
const SAISIES = [['E2EPV1', 0, 1], ['E2EPV2', 1, 3], ['E2EPV3', 2, 2], ['E2EPV4', 0, 5]];
const base = () => q(`SELECT CONCAT_WS('|', f.int_CIP, w.int_NUM_LOT, w.int_NUMBER, f.int_PAF, f.int_PRICE, w.int_NUMBER * f.int_PAF, w.int_NUMBER * f.int_PRICE)`
  + ` FROM t_warehouse w JOIN t_famille f ON f.lg_FAMILLE_ID = w.lg_FAMILLE_ID WHERE w.str_STATUT = 'delete' AND DATE(w.dt_CREATED) = '${JOUR}' ORDER BY w.int_NUM_LOT`)
  .split('\n').filter(Boolean).map((l) => l.split('|'));
const retirer = () => q(`DELETE FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE '${M}%'`);
/* nombre ecrit avec ou sans separateur de milliers */
const nb = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u00a0\\u202f.,]?');
const texte = (f) => execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f, '-'], { encoding: 'utf8' });

(async () => {
  ok('Préconditions : 3 produits de familles différentes (prix d\'achat ≠ prix de vente), aucun périmé le ' + JOUR,
    PROD.length === 3 && q(`SELECT COUNT(*) FROM t_warehouse WHERE DATE(dt_CREATED) = '${JOUR}' OR DATE(dt_PEREMPTION) = '${JOUR}'`) === '0', PROD.map((x) => x[1]).join(', '));
  retirer();
  q('INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, int_NUMBER_DELETE, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, stock_initial, stock_final) VALUES '
    + SAISIES.map(([lot, i, n], k) => `('${M}${k}', '${ADMIN}', '${PROD[i][0]}', '${lot}', ${n}, ${n}, '${JOUR} 1${k}:00:00', '${JOUR} 1${k}:00:00', '2019-02-28', 'delete', 20, ${20 - n})`).join(', '));
  const B = base();
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lib = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'saisieperime', true);
      return n ? [n.parentNode.get('text'), n.get('text')] : null; });
    await vues.ouvrirMenu(p, lib[0], lib[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('saisieperime').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    for (const id of ['dt_start', 'dt_end']) {
      await p.click('#' + id + '-inputEl'); await p.keyboard.press('Control+A'); await p.keyboard.type('12/03/2019'); await p.keyboard.press('Tab');
    }
    await vues.cliquer(p, 'saisieperime button[text=rechercher]');
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('saisieperime')[0].getStore(); return !s.isLoading() && s.getCount() > 0; }, null, { timeout: 30000 });
    const grille = await p.evaluate(() => Ext.ComponentQuery.query('saisieperime')[0].getStore().getRange().map((r) => [r.get('intCIP'), r.get('ticketNum'), r.get('intQUANTITY'), r.get('intPRICEUNITAIR')].join('|')).sort());
    const attendu = B.map((l) => [l[0], l[1], l[2], l[4]].join('|')).sort();
    ok('Rapprochement écran / base : CIP, lot, quantité, prix de vente des 4 saisies', JSON.stringify(grille) === JSON.stringify(attendu), JSON.stringify(grille) + ' / ' + JSON.stringify(attendu));

    const imprimer = async (selecteur, menu) => {
      const redirige = ctx.waitForEvent('response', { predicate: (r) => /BalancePdfServlet/.test(r.url()) && r.status() === 302, timeout: 120000 });
      const popup = ctx.waitForEvent('page', { timeout: 30000 }).catch(() => null);
      await vues.cliquer(p, selecteur);
      if (menu) { await p.locator('.x-menu-item').filter({ visible: true, hasText: menu }).first().click(); }
      const r = await redirige;
      const pg = await popup; if (pg) { await pg.close().catch(() => {}); }
      const f = editions.fichierEdition(r.headers().location || '');
      await p.waitForTimeout(800);
      return fs.existsSync(f) ? texte(f) : null;
    };
    const verifier = (t, nom) => {
      ok(nom + ' : PDF produit', !!t, '');
      if (!t) { return; }
      const lignes = t.split('\n');
      const ko = B.filter(([cip, lot, n, pa, pv, va, vv]) => { const l = lignes.find((x) => x.includes(cip) && x.includes(lot));
        return !l || !new RegExp(`\\b${n}\\s+${nb(pa)}\\s+${nb(pv)}\\s+${nb(va)}\\s+${nb(vv)}\\b`).test(l); });
      ok(nom + ' : chaque ligne (CIP, lot) porte quantité, prix d\'achat, prix de vente, valeur d\'achat, valeur de vente de la base', ko.length === 0, JSON.stringify(ko));
      const pages = t.split('\f').filter((x) => x.trim());
      const der = pages[pages.length - 1];
      const somme = (k) => B.reduce((s, l) => s + Number(l[k]), 0);
      const val = (lib, v) => new RegExp(lib.replace(/[()]/g, '\\$&') + '\\s+' + nb(v) + '\\b').test(der);
      ok(nom + ' : valorisation à la dernière page (seulement) = sommes de la base', t.split('VALORISATION DES PRODUITS PÉRIMÉS').length === 2 && /VALORISATION DES PRODUITS PÉRIMÉS/.test(der)
        && val('Lignes', B.length) && val('Quantité totale', somme(2)) && val('Valeur au prix d\'achat', somme(5)) && val('Valeur au prix de vente', somme(6))
        && val('Marge perdue (vente - achat)', somme(6) - somme(5)), der.replace(/\s+/g, ' ').slice(-400));
      return t;
    };
    const t1 = verifier(await imprimer('saisieperime button[text=Imprimer]'), 'Imprimer');
    ok('Imprimer : en-têtes « Prix d\'achat », « Prix de vente », « Valeur achat », « Valeur vente », sans sous-total', !!t1 && /Prix\s/.test(t1) && /d'achat/.test(t1) && /Prix de/.test(t1)
      && /Valeur achat/.test(t1) && /Valeur vente/.test(t1) && !/Sous-total/.test(t1));
    const t2 = verifier(await imprimer('saisieperime button[text=Imprimer par groupe]', 'Famille'), 'Par famille');
    ok('Par famille : un sous-total par famille (3)', !!t2 && (t2.match(/Sous-total/g) || []).length === 3, t2 && (t2.match(/Sous-total/g) || []).length);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulement', false, x.stack);
  } finally {
    await b.close();
    retirer();
    ok('Données d\'essai retirées', q(`SELECT COUNT(*) FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE '${M}%'`) === '0');
    const n = res.filter(Boolean).length;
    console.log(n + '/' + res.length + (n === res.length ? ' OK' : ' ÉCHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
