/* GESTION DES TIERS-PAYANTS > « Tiers payants désactivés » : LISTE VIDE (journal du 18/10).
 *
 * « Échec Ajax HTTP 404 : ../webservices/tierspayantmanagement/tierspayant/ws_data.jsp?str_STATUT=disable » : l'ecran
 * appelait une page qui n'existe pas ; aucun tiers-payant desactive ne pouvait etre retrouve ni reactive.
 * Parcours par les vues : un tiers-payant du banc est desactive le temps du test (puis remis actif).
 *  - menu ; la liste montre le tiers-payant desactive, et lui seul parmi les actifs n'y figure pas ;
 *  - recherche au clavier sur son nom (Entree) : il reste affiche ;
 *  - aucune erreur JavaScript, aucun appel en echec.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [TP, NOM, STATUT, MAJ] = q("SELECT lg_TIERS_PAYANT_ID, str_NAME, str_STATUT, dt_UPDATED FROM t_tiers_payant WHERE str_STATUT = 'enable' ORDER BY str_NAME DESC LIMIT 1").split('\t');
const remettre = () => q(`UPDATE t_tiers_payant SET str_STATUT = '${STATUT}', dt_UPDATED = ${MAJ === 'NULL' ? 'NULL' : "'" + MAJ + "'"} WHERE lg_TIERS_PAYANT_ID = '${TP}'`);

(async () => {
  q(`UPDATE t_tiers_payant SET str_STATUT = 'disable' WHERE lg_TIERS_PAYANT_ID = '${TP}'`);
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const echecs = []; p.on('response', (r) => { if (r.status() >= 400 && /tierspayant/i.test(r.url())) { echecs.push(r.status() + ' ' + r.url()); } });
  const lignes = () => p.evaluate(() => Ext.getCmp('OGrid').getStore().getRange().map((r) => ({ id: r.get('lg_TIERS_PAYANT_ID'), statut: r.get('str_STATUT') })));
  const charge = () => p.waitForFunction(() => { const g = Ext.getCmp('OGrid'); return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000, polling: 100 });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Tiers payants désactivés');
    await p.waitForFunction(() => Ext.ComponentQuery.query('tierspayantdesactive').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.waitForLoadState('networkidle');
    await charge();
    let l = await lignes();
    ok('La liste montre le tiers-payant désactivé', l.some((x) => x.id === TP), l.length + ' ligne(s) ; ' + echecs.join(' | '));
    ok('Et aucun tiers-payant actif', l.every((x) => x.statut === 'disable'), JSON.stringify(l.slice(0, 3)));

    const recherche = p.waitForResponse((r) => /tierspayant/i.test(r.url()) && r.url().includes('search_value='), { timeout: 30000 });
    await saisir(p, 'tierspayantdesactive #rechecher', NOM);
    await p.keyboard.press('Shift+Tab');
    await p.keyboard.press('Enter');
    await recherche;
    await charge();
    l = await lignes();
    ok('Recherche sur son nom (Entrée) : il reste affiché', l.some((x) => x.id === TP), l.length + ' ligne(s)');
    ok('Aucune erreur JavaScript, aucun appel en échec', erreurs.length === 0 && echecs.length === 0, erreurs.concat(echecs).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    remettre();
    ok('Tiers-payant remis dans son état', q(`SELECT str_STATUT FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '${TP}'`) === STATUT);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
