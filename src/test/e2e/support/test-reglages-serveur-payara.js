/* REGLAGES DE PAYARA APPLIQUES DEPUIS PRESTIGE (Centre de support > Stabilité du serveur > Réglages conseillés).
 *  - super administrateur : « Appliquer et redémarrer Payara », case « avec la mémoire du serveur Java » (décochée
 *    par le test : la machine d'essai manque de mémoire) ;
 *  - confirmation dans le bouton lui-meme, sans aucune fenetre ;
 *  - le script asadmin est lance detache : le domaine EN COURS redemarre (le serveur cesse de repondre puis revient),
 *    son journal finit par « FIN 0 » ; domain.xml est sauvegarde avant, copie identique a l'original ;
 *  - au retour, l'ecran affiche « N / N réglage(s) pris » ; les compteurs de surveillance relus par asadmin sont HIGH ;
 *  - journal des evenements : lancement (avant -> attendu, sauvegarde) et verification (avant -> apres) ;
 *  - tout est remis : domain.xml d'origine (domaine arrete, fichier remis, domaine relance), lignes de journal,
 *    scripts et copies de sauvegarde du test.
 *
 * A LANCER SUR UN DOMAINE D'ESSAI, jamais sur un domaine en service : le test le redemarre deux fois. Refuse domain1
 * sauf E2E_REGLAGES_DOMAINE=domain1.
 *   E2E_URL          adresse de Prestige sur ce domaine (ex. http://localhost:9080/prestige) ;
 *   PAYARA_DOMAINE   dossier du domaine (ex. D:/payara5/payara5/glassfish/domains/domain2) ;
 *   E2E_ADMIN_PORT   port d'administration du domaine (lu dans domain.xml par defaut) ;
 *   ASADMIN          asadmin (defaut : <payara>/bin/asadmin.bat a cote des domaines) ;
 *   DB_TEST, E2E_BASE_LIBRE=1, MARIADB_OPTIONS : base de ce domaine (journal des evenements).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const URL = (process.env.E2E_URL || 'http://localhost:8080/prestige').replace(/\/$/, '');
const DOMAINE = ENV_E2E.PAYARA_DOMAINE.replace(/\\/g, '/').replace(/\/$/, '');
const NOM = path.basename(DOMAINE), DOSSIERS = path.dirname(DOMAINE).replace(/\\/g, '/');
const XML = DOMAINE + '/config/domain.xml';
const ASADMIN = process.env.ASADMIN || path.resolve(DOMAINE, '../../../bin/asadmin' + (ENV_E2E.WINDOWS ? '.bat' : ''));
const PORT_ADMIN = process.env.E2E_ADMIN_PORT
  || ((fs.readFileSync(XML, 'utf8').match(/<network-listener[^>]*name="admin-listener"[^>]*>/) || [''])[0].match(/port="(\d+)"/) || [0, '4848'])[1];
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sNr', '-e', s], { encoding: 'utf8' }).trim();
const asadmin = (...a) => execFileSync(ASADMIN, ['--interactive=false', ...a], { encoding: 'latin1', shell: ENV_E2E.WINDOWS, timeout: 300000 });
const NIVEAUX = 'configs.config.server-config.monitoring-service.module-monitoring-levels.';
const niveau = (m) => (asadmin('--port', PORT_ADMIN, 'get', NIVEAUX + m).match(/=(\w+)/) || [])[1];
const empreinte = (b) => crypto.createHash('sha256').update(b).digest('hex');
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/* code HTTP de la page d'accueil, 0 si le serveur ne repond pas */
const sonde = () => new Promise((r) => {
  const u = new (require('url').URL)(URL + '/security/index.html');
  const req = http.get({ host: u.hostname, port: u.port, path: u.pathname, timeout: 4000 }, (rep) => { rep.resume(); r(rep.statusCode); });
  req.on('error', () => r(0)); req.on('timeout', () => { req.destroy(); r(0); });
});

async function connecter(b) {
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  p.dialogues = []; p.erreurs = [];
  p.on('dialog', (d) => { p.dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('pageerror', (e) => p.erreurs.push(String(e.message)));
  await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', ENV_E2E.LOGIN_SUPPORT); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 120000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 180000 });
  await p.waitForTimeout(2000);
  await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('supportserveur', {}));
  await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur')[0], null, { timeout: 30000 });
  await p.click('text=Réglages conseillés');
  await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('supportserveur #ongletReglages')[0];
    return c && !c.el.down('.x-mask-msg', true) && Ext.ComponentQuery.query('supportserveur #reglages')[0].getStore().getCount() > 0; }, null, { timeout: 90000 });
  await p.waitForTimeout(1000);
  return p;
}

(async () => {
  if (NOM === 'domain1' && process.env.E2E_REGLAGES_DOMAINE !== 'domain1') {
    console.log('FAIL  domain1 refusé : ce test redémarre le domaine deux fois (voir l\'en-tête)');
    process.exit(1);
  }
  const debut = q('SELECT NOW()');
  const xmlAvant = fs.readFileSync(XML);
  const copieTest = path.join(ENV_E2E.TMP, 'domain.xml.e2e-' + Date.now());
  fs.writeFileSync(copieTest, xmlAvant);
  const sauvegardesAvant = new Set(fs.readdirSync(DOMAINE + '/config').filter((f) => /^domain\.xml\.avant-prestige-/.test(f)));
  const scripts = path.join(ENV_E2E.STOCKAGE, 'reglages-payara', NOM);
  const scriptsAvant = new Set(fs.existsSync(scripts) ? fs.readdirSync(scripts) : []);
  /* reglage volontairement mal place, a corriger par l'ecran (pris a chaud par asadmin set) */
  asadmin('--port', PORT_ADMIN, 'set', NIVEAUX + 'jdbc-connection-pool=OFF');
  asadmin('--port', PORT_ADMIN, 'set', NIVEAUX + 'thread-pool=OFF');
  const xmlPrepare = fs.readFileSync(XML);

  const b = await ENV_E2E.lancer(chromium);
  let redemarre = false;
  try {
    let p = await connecter(b);
    const bouton = () => p.evaluate(() => { const x = Ext.ComponentQuery.query('supportserveur #appliquerPayara')[0];
      return { visible: x.isVisible(), actif: !x.isDisabled(), texte: x.getText(), id: x.getEl() && x.getEl().id }; });
    const texte = (id) => p.evaluate((i) => Ext.ComponentQuery.query('supportserveur #' + i)[0].getEl().dom.textContent, id);
    const bp = await bouton();
    ok('Super administrateur : « Appliquer et redémarrer Payara » visible et actif', bp.visible && bp.actif, JSON.stringify(bp) + ' ' + await texte('etatPayara'));
    const surveillance = await p.evaluate(() => (Ext.ComponentQuery.query('supportserveur #reglages')[0].getStore().findRecord('cle', 'surveillance') || { get: () => '' }).get('niveau'));
    ok('Compteurs du pool et des fils « à ajuster » avant', surveillance === 'A_AJUSTER', surveillance);
    /* la machine d'essai manque de memoire : pas de -Xms/-Xmx */
    await p.evaluate(() => Ext.ComponentQuery.query('supportserveur #avecMemoireJava')[0].setValue(false));

    await p.click('#' + bp.id);
    const arme = await bouton();
    ok('1er clic : confirmation dans le bouton lui-même', /^Confirmer : \d+ réglage\(s\), Payara redémarre$/.test(arme.texte), arme.texte);
    await p.waitForTimeout(400); await p.click('#' + bp.id);
    await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('supportserveur #etatReglages')[0].getEl().dom.textContent;
      return /redémarre \(environ une minute\)/.test(t) || /script à copier|impossible|introuvable/i.test(t); }, null, { timeout: 180000 });
    const lance = await texte('etatReglages');
    ok('Lancement : « Payara applique N réglage(s) puis redémarre »', /Payara applique \d+ réglage\(s\) puis redémarre/.test(lance), lance);
    ok('Aucune fenêtre surgissante, aucune erreur JavaScript', p.dialogues.length === 0 && p.erreurs.length === 0, p.dialogues.concat(p.erreurs).join(' | '));

    /* le serveur cesse de repondre, puis revient */
    let tombe = false, t0 = Date.now();
    while (Date.now() - t0 < 300000) {
      const s = await sonde();
      if (!s) { tombe = true; } else if (tombe && s === 200) { break; }
      await attendre(3000);
    }
    redemarre = tombe;
    ok('Le domaine en cours a redémarré (arrêt puis reprise)', tombe && await sonde() === 200, 'en ' + Math.round((Date.now() - t0) / 1000) + ' s');
    const ecran = await p.evaluate(() => Ext.ComponentQuery.query('supportserveur #etatPayara')[0].getEl().dom.textContent).catch(() => '');
    ok('L\'écran suit le redémarrage', /Payara a redémarré|Redémarrage en cours/.test(ecran), ecran);
    const journalScript = fs.readdirSync(scripts).filter((f) => /^appliquer-.*\.log$/.test(f) && !scriptsAvant.has(f));
    const contenu = journalScript.length ? fs.readFileSync(path.join(scripts, journalScript[0]), 'latin1') : '';
    ok('Journal du script : commandes passées, « FIN 0 »', /FIN 0/.test(contenu) && /executed successfully/i.test(contenu), contenu.slice(-300));
    const nouvelles = fs.readdirSync(DOMAINE + '/config').filter((f) => /^domain\.xml\.avant-prestige-/.test(f) && !sauvegardesAvant.has(f));
    ok('domain.xml sauvegardé avant, copie identique', nouvelles.length === 1
      && empreinte(fs.readFileSync(DOMAINE + '/config/' + nouvelles[0])) === empreinte(xmlPrepare), nouvelles.join(','));
    ok('Compteurs relus par asadmin : HIGH', niveau('jdbc-connection-pool') === 'HIGH' && niveau('thread-pool') === 'HIGH');

    /* retour : nouvelle connexion (la session a ete perdue), verification affichee */
    await p.close();
    p = await connecter(b);
    const verif = await texte('etatPayara');
    ok('Au retour : « Vérifié le ... : N / N réglage(s) pris »', /Vérifié le .* : (\d+) \/ \1 réglage\(s\) pris/.test(verif), verif);
    const lignes = q("SELECT CONCAT(str_CREATEDBY, ' | ', REPLACE(str_DETAIL, '\\n', ' ; ')) FROM t_event_log WHERE str_TABLECONCERN = 'payara'"
      + " AND dt_CREATED >= '" + debut + "' ORDER BY dt_CREATED").split('\n').filter(Boolean);
    ok('Journal : lancement (qui, avant -> attendu, sauvegarde) puis vérification (avant -> après)', lignes.length === 2
      && lignes[0].startsWith(ENV_E2E.LOGIN_SUPPORT + ' |') && /Sauvegarde : .*domain\.xml\.avant-prestige-/.test(lignes[0])
      && /surveillance : pool OFF, fils OFF -> HIGH/.test(lignes[0]) && /surveillance : pool OFF, fils OFF -> pool HIGH, fils HIGH/.test(lignes[1]), lignes.join(' || '));
    ok('Au retour : aucune fenêtre, aucune erreur JavaScript', p.dialogues.length === 0 && p.erreurs.length === 0, p.dialogues.concat(p.erreurs).join(' | '));
  } catch (e) {
    ok('Déroulement sans exception', false, e.stack);
  } finally {
    await b.close();
    /* remise en etat : domain.xml d'origine (domaine arrete pendant la copie), journal, fichiers du test */
    try {
      asadmin('stop-domain', '--domaindir', DOSSIERS, NOM);
      fs.writeFileSync(XML, fs.readFileSync(copieTest));
      asadmin('start-domain', '--domaindir', DOSSIERS, NOM);
    } catch (e) { ok('Remise en état du domaine', false, e.message); }
    fs.unlinkSync(copieTest);
    fs.readdirSync(DOMAINE + '/config').filter((f) => /^domain\.xml\.avant-prestige-/.test(f) && !sauvegardesAvant.has(f)).forEach((f) => fs.unlinkSync(DOMAINE + '/config/' + f));
    if (fs.existsSync(scripts)) {
      fs.readdirSync(scripts).filter((f) => !scriptsAvant.has(f)).forEach((f) => fs.unlinkSync(path.join(scripts, f)));
    }
    q("DELETE FROM t_event_log WHERE str_TABLECONCERN = 'payara' AND dt_CREATED >= '" + debut + "'");
    ok('Remise en état : domain.xml d\'origine, journal et fichiers du test retirés', empreinte(fs.readFileSync(XML)) === empreinte(xmlAvant)
      && await sonde() === 200, NOM + (redemarre ? '' : ' (pas de redémarrage constaté)'));
    const n = res.filter((x) => x.c).length;
    console.log(`\n${n}/${res.length} PASS`);
    process.exit(n === res.length ? 0 : 1);
  }
})();
