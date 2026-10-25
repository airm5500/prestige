/* LIBELLES DE MENUS (besoins du 11/10, point 8) : aucun menu actif n'affiche plus de 25 caracteres (libelle =
 * str_DESCRIPTION) ; les menus renommes gardent leur texte long en infobulle ; l'arbre des menus affiche bien les
 * libelles courts. Sert aussi de garde pour les menus a venir.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const LOGIN = ENV_E2E.LOGIN;

(async () => {
  const longs = q("SELECT CONCAT('M:', lg_MENU_ID, '=', str_DESCRIPTION) FROM t_menu WHERE str_Status = 'enable' AND CHAR_LENGTH(str_DESCRIPTION) > 25"
    + " UNION ALL SELECT CONCAT(str_COMPOSANT, '=', str_DESCRIPTION) FROM t_sous_menu WHERE str_Status = 'enable' AND CHAR_LENGTH(str_DESCRIPTION) > 25");
  ok('Aucun libellé de menu actif de plus de 25 caractères', longs === '', longs.replace(/\n/g, ' | '));
  const [fid, fidAide] = q("SELECT str_DESCRIPTION, str_VALUE FROM t_sous_menu WHERE str_COMPOSANT = 'fideliteclients'").split('\t');
  ok('Menu « Points fidélité » (retour du 14/10), texte long en infobulle', fid === 'Points fidélité' && /Points de fidelite des clients/.test(fidAide), fid + ' / ' + fidAide);
  const [ep, epAide] = q("SELECT str_DESCRIPTION, str_VALUE FROM t_sous_menu WHERE str_COMPOSANT = 'etiquetagepro'").split('\t');
  ok('Étiquettes de produits importés → « Étiquettage Pro »', ep === 'Étiquettage Pro' && /produits importes/.test(epAide), ep + ' / ' + epAide);
  ok('Prévisions : infobulle descriptive conservée', /quantit.+recommand/.test(q("SELECT str_VALUE FROM t_sous_menu WHERE str_COMPOSANT = 'analysecommande'")));

  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(2000);
    /* libelles reellement affiches dans l'arbre des menus */
    const textes = await p.evaluate(() => { const out = []; Ext.ComponentQuery.query('treepanel').forEach((tr) => tr.getRootNode()
      .cascadeBy((n) => { if (n.get('text')) out.push(n.get('text')); })); return out; });
    ok('Arbre des menus : « Points fidélité » affiché', textes.includes('Points fidélité'), textes.filter((t) => /fid/i.test(t)).join(','));
    ok('Arbre des menus : « Étiquettage Pro » et « Prévisions » affichés', textes.includes('Étiquettage Pro') && textes.includes('Prévisions'));
    ok('Arbre des menus : aucun libellé de plus de 25 caractères', textes.every((t) => t.length <= 25), textes.filter((t) => t.length > 25).join(' | '));
    ok('Aucune erreur de page', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('deroulement', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications');
    process.exit(ko ? 1 : 0);
  }
})();
