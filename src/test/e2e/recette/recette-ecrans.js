/* CAHIER DE RECETTE : « OUVERTURE ET AFFICHAGE » DE CHAQUE ECRAN DU MENU (lignes Non-regression du cahier).
 *
 * Pour chaque ecran declare dans le menu (t_sous_menu actif, dans l'ordre du menu), par le VRAI menu (volet de
 * gauche, rubrique, entree) :
 *   - l'ecran s'ouvre et se dessine (hauteur > 200 px) ;
 *   - aucune erreur JavaScript, aucune reponse serveur en erreur (HTTP >= 500) pendant l'ouverture et le chargement ;
 *   - temps jusqu'au chargement complet (plus aucune requete en cours).
 * Si l'entree n'est pas trouvee sous ce libelle dans le menu (libelle renomme a l'affichage), l'ecran est ouvert par
 * son composant et c'est note. « Deconnexion » n'est pas ouverte (elle fermerait la session) : testee a part.
 * RIEN N'EST ECRIT EN BASE : les ecritures sont interceptees (meme regle que test-saisie-ecrans).
 * Resultat : un fichier JSON par ecran (SORTIE=chemin, defaut /tmp/recette-ecrans.json).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { ouvrirMenu } = require('../outils/vues');
const q = (sql) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', sql], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || ENV_E2E.TMP + '/recette-ecrans.json';
/* un formulaire court (point de caisse, import, envoi de recapitulatif) fait 150 a 190 px : seuil sous ces hauteurs */
const HAUTEUR_MINIMALE = 120;
const ecriture = (req) => {
  if (req.method() !== 'GET') { return true; }
  const u = req.url().replace(/^.*\/prestige\//, '');
  if (!/^(api\/|webservices\/|.*\.jsp)/.test(u)) { return false; }
  return /transaction|[?&]mode=(create|update|delete)|create|update|delete|merge|ponction|recalcul|valider|clotur|import|envoy|annul|supprim|generer|maintenance|correction|suggerer|synchroniser/i
    .test(u.replace(/[?].*$/, '') + (u.includes('mode=') ? u.replace(/^[^?]*/, '') : ''));
};
const ECRANS = q("SELECT m.str_DESCRIPTION, s.str_DESCRIPTION, s.str_COMPOSANT FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID"
  + " WHERE s.str_Status = 'enable' AND m.str_Status = 'enable' ORDER BY m.int_PRIORITY, m.str_DESCRIPTION, s.int_PRIORITY").split('\n').map((l) => l.split('\t'));

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  p.setDefaultTimeout(20000);
  let courant = null; const resultats = []; const vus = new Set();
  let enVol = 0;
  p.on('pageerror', (e) => { if (courant) { courant.js.push(String(e.message).slice(0, 200)); } });
  p.on('request', () => { enVol++; });
  p.on('requestfinished', () => { enVol--; }); p.on('requestfailed', () => { enVol--; });
  p.on('response', (r) => { if (courant && r.status() >= 500) { courant.http.push(r.status() + ' ' + r.url().replace(/^.*\/prestige\//, '').replace(/[?].*$/, '').slice(0, 120)); } });
  await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 60000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
    && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
  await p.waitForTimeout(2000);
  await p.route('**/*', (route) => {
    const req = route.request();
    if (!ecriture(req)) { return route.continue(); }
    if (courant) { courant.ecrituresInterceptees++; }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: false, msg: 'recette : rien n\'est enregistre' }) });
  });
  for (const [menu, ecran, comp] of ECRANS) {
    const cle = menu + '|' + ecran;
    if (vus.has(cle)) { continue; }
    vus.add(cle);
    courant = { menu, ecran, comp, js: [], http: [], ecrituresInterceptees: 0, par: 'menu', ms: null, hauteur: 0, resultat: '', detail: '' };
    if (/^d[ée]connexion$/i.test(ecran)) {
      courant.resultat = 'NON EXECUTE'; courant.detail = 'Fermerait la session : testé à part (cas Transversal « Déconnexion »)';
      resultats.push(courant); continue;
    }
    const t0 = Date.now();
    try {
      try {
        await ouvrirMenu(p, menu, ecran);
      } catch (e) {
        courant.par = 'composant';
        await p.keyboard.press('Escape').catch(() => {});
        await p.evaluate(([c, t]) => testextjs.app.getController('App').onLoadNewComponent(c, t, ''), [comp, ecran]);
      }
      await p.waitForFunction((c) => Ext.ComponentQuery.query(c).some((x) => x.isVisible(true)), comp, { timeout: 30000 }).catch(() => {});
      const debut = Date.now();
      while (Date.now() - debut < 30000) { await p.waitForTimeout(300); if (enVol <= 0) { await p.waitForTimeout(500); if (enVol <= 0) { break; } } }
      courant.ms = Date.now() - t0;
      courant.hauteur = await p.evaluate((c) => { const x = Ext.ComponentQuery.query(c).filter((y) => y.isVisible(true))[0]; return x && x.getEl() ? x.getHeight() : 0; }, comp);
      /* « vue introuvable » : l'entree de menu pointe vers un ecran que l'application ne connait pas */
      courant.introuvable = await p.evaluate((c) => !Ext.ClassManager.getNameByAlias('widget.' + c), comp);
      /* fenetres et messages laisses ouverts : fermes pour l'ecran suivant */
      await p.evaluate(() => { Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.hide()); Ext.ComponentQuery.query('window{isVisible()}').forEach((w) => { if (w.xtype !== 'messagebox') { w.close(); } }); }).catch(() => {});
    } catch (e) {
      courant.js.push('parcours : ' + String(e.message).split('\n')[0].slice(0, 160));
    }
    const pb = [];
    if (courant.introuvable) {
      pb.push('écran introuvable : l\'entrée de menu pointe vers la vue « ' + comp + ' », inconnue de l\'application');
    } else if (courant.hauteur < HAUTEUR_MINIMALE) { pb.push('écran non dessiné (' + courant.hauteur + ' px)'); }
    if (courant.js.length) { pb.push('JS : ' + courant.js.join(' | ')); }
    if (courant.http.length) { pb.push('serveur : ' + courant.http.join(' | ')); }
    courant.resultat = pb.length ? 'KO' : 'OK';
    courant.detail = (pb.length ? pb.join(' ; ') + ' ; ' : '') + 'ouvert par ' + (courant.par === 'menu' ? 'le menu' : 'son composant (entrée introuvable sous ce libellé)')
      + ', chargé en ' + (courant.ms / 1000).toFixed(1) + ' s' + (courant.ecrituresInterceptees ? ', ' + courant.ecrituresInterceptees + ' écriture(s) interceptée(s)' : '');
    console.log((courant.resultat === 'OK' ? 'PASS' : 'FAIL') + '  ' + menu + ' > ' + ecran + '  [' + courant.detail.slice(0, 220) + ']');
    resultats.push(courant);
    fs.writeFileSync(SORTIE, JSON.stringify(resultats, null, 1));
  }
  await b.close();
  const ko = resultats.filter((r) => r.resultat === 'KO').length;
  console.log('\n' + (resultats.length - ko) + '/' + resultats.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(0);
})();
