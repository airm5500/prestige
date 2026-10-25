/* STABILITE DU SERVEUR (besoins du 11/10, lot 4), Centre de support, par l'ecran.
 *  - menu « Stabilité du serveur » (CENTRE DE SUPPORT) ; onglets Etat, Arrets, Reglages conseilles ;
 *  - Etat : tuiles (memoire du serveur Java, machine, processeur, requetes, base) et courbes des releves ;
 *  - Arrets : la session en cours apparait « En marche » ; un arret brutal enregistre (insere par le test) apparait
 *    avec sa cause et son conseil ;
 *  - Reglages : fils HTTP de Payara lus dans domain.xml (valeur en place), conseils dimensionnes par le nombre de
 *    postes (enregistre dans les parametres puis remis), bloc my.ini et commandes asadmin sans aucun mot de passe ;
 *  - lecture seule : domain.xml et variables MariaDB inchanges ; sans le droit, l'API refuse ;
 *  - aucune fenetre, aucune erreur JavaScript ; donnees du test retirees.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const privilegeEssai = require('./privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const DOMAIN = '/opt/payara5/glassfish/domains/domain1/config/domain.xml';
const empreinte = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_SM_SUPPORT_SERVEUR');
const HOTE_ESSAI = 'E2E-SERVEUR';

(async () => {
  droit.remettre();
  exec(`DELETE FROM t_serveur_vie WHERE hote = '${HOTE_ESSAI}'`);
  const postesAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'SUPPORT_SERVEUR_POSTES'");
  const domaineAvant = empreinte(DOMAIN);
  const varsAvant = q("SELECT GROUP_CONCAT(CONCAT(VARIABLE_NAME, '=', VARIABLE_VALUE) ORDER BY VARIABLE_NAME) FROM information_schema.GLOBAL_VARIABLES WHERE VARIABLE_NAME IN ('INNODB_BUFFER_POOL_SIZE','MAX_CONNECTIONS','SLOW_QUERY_LOG','THREAD_CACHE_SIZE')");
  exec(`INSERT INTO t_serveur_vie (hote, pid, demarre_at, dernier_signe_at, arret, cause_code, cause_libelle, cause_explication, cause_conseil, indisponibilite_min, java_version, memoire_max_mo)
        VALUES ('${HOTE_ESSAI}', 1, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY + INTERVAL 2 HOUR, 'BRUTAL', 'COUPURE_COURANT', 'Coupure de courant ou arrêt brutal de la machine',
        'Windows a redémarré sans arrêt propre (événement 41 Kernel-Power).', 'Un onduleur protège la base et les ventes en cours.', 12, '11', 2048)`);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const dialogues = [], err = [];
  const ouvrir = async (p) => {
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
  };
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    await ouvrir(p);
    const menu = await p.evaluate(() => { let t = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { if (n.get('id') === 'supportserveur') { t = n.parentNode.get('text') + ' > ' + n.get('text'); } }); return t; });
    ok('Menu CENTRE DE SUPPORT > Stabilité du serveur', /SUPPORT > Stabilité du serveur$/i.test(menu), menu);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('supportserveur', {}));
    await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('supportserveur #tuiles')[0]; return t && /Mémoire du serveur Java/.test(t.getEl().dom.textContent); }, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const etat = await p.evaluate(() => ({ tuiles: Ext.ComponentQuery.query('supportserveur #tuiles')[0].getEl().dom.textContent,
      mesures: Ext.ComponentQuery.query('supportserveur #ongletEtat')[0].mesures.getCount() }));
    ok('État : tuiles mémoire, machine, processeur, requêtes, base', ['En marche depuis', 'Mémoire du serveur Java', 'Mémoire de la machine', 'Processeur', 'Requêtes en traitement', 'Connexions à la base'].every((x) => etat.tuiles.indexOf(x) >= 0), etat.tuiles.slice(0, 200));
    ok('État : tuile du pool de connexions (temps de réponse) et actualisation automatique cochée', /Pool de connexions\d+ ms/.test(etat.tuiles)
      && await p.evaluate(() => Ext.ComponentQuery.query('supportserveur #auto')[0].getValue() === true), etat.tuiles.slice(etat.tuiles.indexOf('Pool'), etat.tuiles.indexOf('Pool') + 60));
    ok('État : courbes alimentées par les relevés', etat.mesures === Number(q("SELECT COUNT(*) FROM t_serveur_mesure WHERE mesure_at >= NOW() - INTERVAL 24 HOUR")) && etat.mesures > 0, etat.mesures);

    await p.click('.supportserveur .x-tab:has-text("Arrêts")');
    await p.waitForTimeout(2500);
    const arrets = await p.evaluate(() => { const l = []; Ext.ComponentQuery.query('supportserveur #arrets')[0].getStore().each((r) => l.push(r.get('hote') + '|' + r.get('arret') + '|' + r.get('cause') + '|' + r.get('conseil'))); return l; });
    ok('Arrêts : session en cours « En marche »', arrets[0] && arrets[0].split('|')[1] === 'EN_COURS', arrets[0]);
    ok('Arrêts : arrêt brutal avec cause et conseil', arrets.some((x) => x === HOTE_ESSAI + '|BRUTAL|Coupure de courant ou arrêt brutal de la machine|Un onduleur protège la base et les ventes en cours.'), arrets.join(' ; ').slice(0, 300));

    await p.click('.supportserveur .x-tab:has-text("Réglages conseillés")');
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur #reglages')[0].getStore().getCount() > 0, null, { timeout: 30000 });
    const lire = () => p.evaluate(() => { const o = {}; Ext.ComponentQuery.query('supportserveur #reglages')[0].getStore().each((r) => { o[r.get('cle')] = r.get('actuel') + '|' + r.get('conseille') + '|' + r.get('niveau'); });
      return { o, myIni: Ext.ComponentQuery.query('supportserveur #myIni')[0].getValue(), asadmin: Ext.ComponentQuery.query('supportserveur #asadmin')[0].getValue(),
        postes: Ext.ComponentQuery.query('supportserveur #postes')[0].getValue() }; });
    let r = await lire();
    const filsDomaine = (fs.readFileSync(DOMAIN, 'utf8').match(/<config name="server-config"[\s\S]*?<thread-pool name="http-thread-pool"([^>]*)>/) || [])[1] || '';
    const filsAttendus = (filsDomaine.match(/max-thread-pool-size="(\d+)"/) || [])[1] || '5';
    ok('Fils HTTP lus dans domain.xml (' + filsAttendus + ')', r.o['http-thread-pool'] && r.o['http-thread-pool'].split('|')[0] === filsAttendus, r.o['http-thread-pool']);
    ok('Tampon InnoDB en place = valeur de MariaDB', r.o.innodb_buffer_pool_size && r.o.innodb_buffer_pool_size.split('|')[0] !== '?', r.o.innodb_buffer_pool_size);
    ok('Bloc my.ini et commandes asadmin, sans mot de passe', /^\[mysqld\]\ninnodb_buffer_pool_size=/.test(r.myIni) && /call asadmin set configs\.config\.server-config\.thread-pools/.test(r.asadmin)
      && !/password/i.test(r.myIni + r.asadmin), r.asadmin.slice(0, 200));
    /* nombre de postes : 40 -> MariaDB doit accepter 39 caisses x 32 + serveur 50 + marge 50 ; fils et pool restent ceux d'UN poste */
    await p.evaluate(() => { Ext.ComponentQuery.query('supportserveur #postes')[0].setValue(40); });
    await p.click('.supportserveur .x-btn:has-text("Recalculer")');
    await p.waitForTimeout(3000);
    r = await lire();
    ok('40 postes : max_connections conseillé 1348 ; fils (100) et pool (50) du serveur inchangés ; enregistré',
      r.o.max_connections.split('|')[1] === '1348' && r.o['http-thread-pool'].split('|')[1] === '100' && r.o['max-pool-size'].split('|')[1] === '50'
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'SUPPORT_SERVEUR_POSTES'") === '40' && r.postes === 40,
      JSON.stringify([r.o.max_connections, r.o['http-thread-pool'], r.o['max-pool-size']]));
    /* lexique */
    await p.click('.supportserveur .x-tab:has-text("Lexique")');
    await p.waitForFunction(() => /Sur cette machine/.test(Ext.ComponentQuery.query('supportserveur #lexique')[0].getEl().dom.textContent), null, { timeout: 30000 });
    const lex = await p.evaluate(() => { const t = Ext.ComponentQuery.query('supportserveur #lexique')[0].getEl().dom;
      return { n: t.querySelectorAll('.srv-lex').length, total: testextjs.view.support.LexiqueServeur.ENTREES.length, texte: t.textContent }; });
    ok('Lexique : toutes les entrées, image du restaurant, cas Prestige, valeur pour cette machine', lex.n === lex.total && lex.n >= 25
      && /imaginez un restaurant/.test(lex.texte) && /Dans Prestige/.test(lex.texte) && /Sur cette machine : en place/.test(lex.texte), lex.n + '/' + lex.total);
    await p.evaluate(() => { Ext.ComponentQuery.query('supportserveur #filtreLexique')[0].setValue('coupure'); });
    await p.waitForTimeout(800);
    const filtre = await p.evaluate(() => Array.from(Ext.ComponentQuery.query('supportserveur #lexique')[0].getEl().dom.querySelectorAll('.srv-lex-terme')).map((x) => x.textContent));
    ok('Lexique : recherche « coupure »', filtre.length >= 3 && filtre.length < lex.n && filtre.some((x) => /Onduleur/.test(x)), filtre.join(' | ').slice(0, 200));

    /* Maintenance : connexions a la base par poste */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('supportmaintenance', {}));
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('supportmaintenance #resumeConnexions')[0]; return c && /max_connections/.test(c.getEl().dom.textContent); }, null, { timeout: 30000 });
    const cx = await p.evaluate(() => ({ resume: Ext.ComponentQuery.query('supportmaintenance #resumeConnexions')[0].getEl().dom.textContent,
      lignes: Ext.ComponentQuery.query('supportmaintenance #grilleConnexions')[0].getStore().getCount(),
      requetes: Ext.ComponentQuery.query('supportmaintenance #requetesConnexions')[0].getEl().dom.textContent }));
    const max = q("SELECT @@max_connections");
    ok('Maintenance : limite, pic, connexions par poste, calcul et requêtes affichés', cx.resume.indexOf('(max_connections) : ' + max) >= 0 && /Pic depuis son démarrage/.test(cx.resume)
      && /caisse\(s\) × 32 \+ serveur 50 \+ marge 50/.test(cx.resume) && cx.lignes >= 1 && /Max_used_connections/.test(cx.requetes), cx.resume.slice(0, 250));
    ok('Lecture seule : domain.xml et MariaDB inchangés', empreinte(DOMAIN) === domaineAvant
      && q("SELECT GROUP_CONCAT(CONCAT(VARIABLE_NAME, '=', VARIABLE_VALUE) ORDER BY VARIABLE_NAME) FROM information_schema.GLOBAL_VARIABLES WHERE VARIABLE_NAME IN ('INNODB_BUFFER_POOL_SIZE','MAX_CONNECTIONS','SLOW_QUERY_LOG','THREAD_CACHE_SIZE')") === varsAvant);

    droit.retirer();
    const p2 = await (await b.newContext()).newPage();
    await ouvrir(p2);
    const refus = await p2.evaluate(async () => Promise.all(['etat', 'historique', 'reglages'].map(async (u) => (await (await fetch('../api/v1/support/serveur/' + u)).json()))));
    ok('Sans le droit : l\'API refuse', refus.every((x) => x.success === false && /stabilité du serveur/.test(x.message)), JSON.stringify(refus[0]));
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    droit.remettre();
    await b.close();
    exec(`DELETE FROM t_serveur_vie WHERE hote = '${HOTE_ESSAI}'; UPDATE t_parameters SET str_VALUE = '${postesAvant}' WHERE str_KEY = 'SUPPORT_SERVEUR_POSTES';`);
    ok('Données du test retirées', q(`SELECT COUNT(*) FROM t_serveur_vie WHERE hote = '${HOTE_ESSAI}'`) === '0' && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'SUPPORT_SERVEUR_POSTES'") === postesAvant);
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
