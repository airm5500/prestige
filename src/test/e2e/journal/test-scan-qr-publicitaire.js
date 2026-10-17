/* QR CODE PUBLICITAIRE SCANNE EN CAISSE (journal du 16/10 : « vente/findone/https://... » en erreur 404, une vingtaine
 * de fois). Le QR de la boite renvoie vers un site internet : ce n'est pas un code produit. Ce que le test etablit (ecran de
 * vente, admin, rien n'est enregistre) :
 *  - lien scanne dans « Produit » + Entree : aucun appel au serveur, message « QR code publicitaire » dans la page (sans
 *    fenetre), champ vide pret pour le scan suivant ;
 *  - un vrai code (CIP) scanne ensuite est cherche normalement ;
 *  - les ecrans dépôt, devis, ajustement et vente en depot reconnaissent aussi le lien (meme fonction commune).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CIP = q("SELECT f.int_CIP FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 5 AND LENGTH(f.int_CIP) = 7 LIMIT 1");
const LIEN = 'https://happymamabybledina.com';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const appels = []; p.on('request', (r) => { if (/\/vente\/findone\//.test(r.url())) { appels.push(decodeURIComponent(r.url())); } });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', {}));
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('doventemanager #produit')[0]; return c && c.isVisible(); }, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const scanner = async (texte) => {
      await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #produit')[0]; c.clearValue(); c.inputEl.dom.setAttribute('data-e2e', 'produit'); c.focus(); });
      await p.click('[data-e2e=produit]');
      await p.keyboard.type(texte, { delay: 5 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(2000);
    };
    await scanner(LIEN);
    const etat = await p.evaluate(() => ({ champ: Ext.ComponentQuery.query('doventemanager #produit')[0].getRawValue(), fenetre: Ext.Msg.isVisible(),
      texte: document.body.innerText.indexOf('QR code publicitaire') >= 0 }));
    ok('Lien scanné : aucun appel au serveur, message « QR code publicitaire » sans fenêtre, champ vidé',
      appels.length === 0 && etat.texte && !etat.fenetre && etat.champ === '', JSON.stringify(etat) + ' appels : ' + appels.join(' '));
    await scanner(CIP);
    ok('Un vrai code scanné ensuite est cherché normalement', appels.some((u) => u.indexOf(CIP) >= 0), appels.join(' '));
    const commun = await p.evaluate(() => ({ fn: !!(window.PrestigeScan && PrestigeScan.estLienInternet),
      lien: window.PrestigeScan && PrestigeScan.estLienInternet('https://www.exphar.be/p/a/10') && PrestigeScan.estLienInternet('http://www.masculan.de/')
        && PrestigeScan.estLienInternet('www.exemple.com/x'),
      code: window.PrestigeScan && !PrestigeScan.estLienInternet('3400936123456') && !PrestigeScan.estLienInternet('(01)18902502124180(412)8902502000026')
        && !PrestigeScan.estLienInternet('0108961102261886GEN-M DS  30MG/180MG100132') }));
    ok('Fonction commune : liens reconnus, codes produits et étiquettes GS1 non', commun.fn && commun.lien && commun.code, JSON.stringify(commun));
    const ecrans = await p.evaluate(() => ['AjustementCtr', 'DepotCtr', 'DevisCtr', 'VenteEnDepotCtr', 'VenteCtr'].map((n) => {
      const c = testextjs.app.getController(n); return n + ':' + (c && /PrestigeScan\.refuserSiLien/.test(String(c.checkDouchette))); }));
    ok('Les cinq écrans de scan utilisent la vérification', ecrans.every((x) => /:true$/.test(x)), ecrans.join(' '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
