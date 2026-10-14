/* PRESTIGE VEILLE, par l'ecran (outil lance sur http://127.0.0.1:8099, Prestige du banc sur 8080).
 *  - premiere connexion admin/admin : tout est refuse tant que le mot de passe n'est pas change (8 caracteres) ;
 *  - reglages par l'ecran (jeton de veille, MariaDB, postes, asadmin) : les secrets ne reviennent jamais au navigateur ;
 *  - sondes : Prestige (memoire, pool, base), MariaDB, machine, poste joignable ; poste injoignable -> incident
 *    ouvert apres 2 echecs, puis ferme quand il repond ; alerte et journal ;
 *  - courbes SVG (Prestige, MariaDB, machine), experience utilisateur ;
 *  - actions : confirmation dans le bouton, vidage du pool reel, redemarrage refuse hors Windows ;
 *  - sans session : 401 ; aucune fenetre, aucune erreur JavaScript ; parametre de Prestige remis.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', 'capitale', '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', 'capitale', '-e', s], { encoding: 'utf8' });
const VEILLE = process.env.VEILLE_URL || 'http://127.0.0.1:8099';
const DOMAIN = '/opt/payara5/glassfish/domains/domain1/config/domain.xml';
const JETON = 'E2E-VEILLE-' + Date.now();
const MDP = 'Veille-' + Date.now();
/* identifiants MariaDB du pool du banc (lus a l'execution, jamais ecrits dans le depot) */
const pool = fs.readFileSync(DOMAIN, 'utf8').split('<jdbc-connection-pool').find((x) => x.indexOf('name="laborex_pool"') >= 0) || '';
const prop = (n) => ((pool.match(new RegExp('<property name="' + n + '" value="([^"]*)"', 'i')) || [])[1] || '');
const BDD_USER = prop('user') || prop('User'), BDD_MDP = prop('password') || prop('Password');

(async () => {
  const jetonAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'SUPPORT_VEILLE_JETON'");
  exec(`UPDATE t_parameters SET str_VALUE = '${JETON}' WHERE str_KEY = 'SUPPORT_VEILLE_JETON'`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const dialogues = [], err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.on('pageerror', (e) => err.push(String(e.message)));
    const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const x = document.cookie.match(/XSRF-TOKEN=([^;]*)/);
      const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': x ? decodeURIComponent(x[1]) : '' }, body: c ? JSON.stringify(c) : undefined });
      return { status: r.status, corps: await r.text() }; }, [m, u, c]);

    await p.goto(VEILLE, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#connexion:not([hidden])');
    ok('Sans session : écran de connexion, API refusée', !(await p.isVisible('#application')) && (await api('GET', '/api/tableau')).status === 401);
    await p.fill('#login', 'admin'); await p.fill('#motDePasse', 'admin'); await p.click('#formConnexion button');
    await p.waitForSelector('#changement:not([hidden])');
    ok('Première connexion : changement du mot de passe imposé, tableau refusé', (await api('GET', '/api/tableau')).status === 403);
    await p.fill('#mdpActuel', 'admin'); await p.fill('#mdpNouveau', 'court'); await p.evaluate(() => { document.getElementById('mdpNouveau').removeAttribute('minlength'); });
    await p.click('#formChangement button');
    await p.waitForTimeout(800);
    ok('Mot de passe trop court refusé', /8 caractères/.test(await p.textContent('#erreurChangement')), await p.textContent('#erreurChangement'));
    await p.fill('#mdpNouveau', MDP); await p.click('#formChangement button');
    await p.waitForSelector('#application:not([hidden])');
    ok('Mot de passe changé : tableau de bord ouvert, écrans de connexion masqués', (await api('GET', '/api/tableau')).status === 200
      && !(await p.isVisible('#changement')) && !(await p.isVisible('#connexion')) && await p.evaluate(() => document.querySelector('.entete').getBoundingClientRect().top) === 0);

    /* reglages par l'ecran */
    await p.click('[data-onglet="reglages"]');
    await p.waitForSelector('#r-prestige-jeton');
    await p.fill('#r-prestige-jeton', JETON);
    await p.fill('#r-mariadb-utilisateur', BDD_USER);
    await p.fill('#r-mariadb-motdepasse', 'mauvais-mot-de-passe');
    await p.click('#enregistrerReglages');
    await p.waitForFunction(() => /enregistré/.test(document.getElementById('resultatReglages').textContent));
    await p.click('[data-onglet="ensemble"]'); await p.click('#sonder');
    await p.waitForFunction(() => /MariaDB/.test(document.getElementById('tuiles').textContent), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const tm = await p.evaluate(() => (document.querySelector('.tuile[data-cible="MariaDB"]') || {}).textContent || '');
    ok('MariaDB : mot de passe refusé expliqué en clair', /Identifiant ou mot de passe MariaDB refusé/.test(tm), tm);
    await p.click('[data-onglet="reglages"]'); await p.waitForSelector('#r-mariadb-motdepasse');
    await p.fill('#r-mariadb-motdepasse', BDD_MDP);
    await p.click('#enregistrerReglages');
    await p.waitForTimeout(800);
    await p.fill('#r-postes', 'CAISSE-TEST=http://127.0.0.1:8080/prestige\nCAISSE-ARRETEE=http://127.0.0.1:9/prestige');
    await p.fill('#r-payara-asadmin', '/opt/payara5/bin/asadmin');
    await p.fill('#r-disque', '/');
    await p.evaluate(() => { document.getElementById('resultatReglages').textContent = ''; });
    await p.click('#enregistrerReglages');
    await p.waitForFunction(() => /enregistré/.test(document.getElementById('resultatReglages').textContent));
    const reg = JSON.parse((await api('GET', '/api/reglages')).corps);
    const jet = reg.find((r) => r.cle === 'prestige.jeton'), mdp = reg.find((r) => r.cle === 'mariadb.motdepasse');
    const html = await p.content();
    ok('Secrets en écriture seule : jamais renvoyés au navigateur', jet.valeur === '' && jet.renseigne && mdp.valeur === '' && mdp.renseigne
      && html.indexOf(JETON) < 0 && (BDD_MDP === '' || html.indexOf(BDD_MDP) < 0));

    /* sondes */
    await p.click('[data-onglet="ensemble"]');
    for (let i = 0; i < 3; i++) { await p.click('#sonder'); await p.waitForTimeout(1500); await p.waitForFunction(() => !document.getElementById('sonder').disabled, null, { timeout: 60000 }); }
    const tuiles = await p.evaluate(() => Array.from(document.querySelectorAll('.tuile')).map((t) => ({ nom: t.dataset.cible, cls: t.className, texte: t.textContent })));
    const t = (n) => tuiles.find((x) => x.nom === n) || { cls: 'absent', texte: '' };
    ok('Prestige : OK, mémoire Java, pool, connexions à la base (via le jeton)', !/ko/.test(t('Prestige (serveur)').cls) && /Mémoire Java/.test(t('Prestige (serveur)').texte)
      && /Pool/.test(t('Prestige (serveur)').texte) && /Connexions base/.test(t('Prestige (serveur)').texte), t('Prestige (serveur)').texte);
    ok('MariaDB (connexion directe) : OK, connexions et pic', !/ko/.test(t('MariaDB').cls) && /pic/.test(t('MariaDB').texte), t('MariaDB').texte);
    ok('Machine : processeur, mémoire libre, disque', /Processeur/.test(t('Machine').texte) && /Mémoire libre/.test(t('Machine').texte) && /Disque libre/.test(t('Machine').texte), t('Machine').texte);
    ok('Poste joignable OK, poste injoignable EN PANNE', !/ko/.test(t('Poste CAISSE-TEST').cls) && /ko/.test(t('Poste CAISSE-ARRETEE').cls), t('Poste CAISSE-ARRETEE').texte);
    const bandeau = await p.textContent('#bandeauIncidents');
    ok('Incident ouvert après 2 échecs, pastille rouge', /incident\(s\) en cours/.test(bandeau) && /CAISSE-ARRETEE ne répond pas/.test(bandeau)
      && /ko/.test(await p.getAttribute('#pastilleGlobale', 'class')), bandeau.slice(0, 160));

    /* retablissement */
    await p.click('[data-onglet="reglages"]');
    await p.waitForSelector('#r-postes');
    await p.fill('#r-postes', 'CAISSE-TEST=http://127.0.0.1:8080/prestige\nCAISSE-ARRETEE=http://127.0.0.1:8080/prestige');
    await p.click('#enregistrerReglages');
    await p.waitForTimeout(800);
    await p.click('[data-onglet="ensemble"]');
    await p.click('#sonder'); await p.waitForTimeout(1500); await p.waitForFunction(() => !document.getElementById('sonder').disabled, null, { timeout: 60000 });
    await p.click('[data-onglet="incidents"]');
    await p.waitForTimeout(1200);
    const inc = await p.evaluate(() => Array.from(document.querySelectorAll('#incidents tbody tr')).map((r) => r.textContent));
    ok('Incident fermé quand le poste répond (fin et durée)', inc.some((x) => /CAISSE-ARRETEE/.test(x) && !/en cours/.test(x)), inc.join(' | ').slice(0, 200));

    /* courbes */
    await p.click('[data-onglet="courbes"]');
    await p.selectOption('#cibleCourbes', 'Prestige (serveur)');
    await p.waitForTimeout(1500);
    const c1 = await p.evaluate(() => Array.from(document.querySelectorAll('#courbes .courbe h3')).map((h) => h.firstChild.textContent));
    ok('Courbes Prestige : réponse, mémoire Java, pool, requêtes, processeur, base', ['Temps de réponse', 'Mémoire du serveur Java', 'Pool de connexions (temps d\'obtention)', 'Connexions à la base'].every((x) => c1.indexOf(x) >= 0)
      && await p.evaluate(() => document.querySelectorAll('#courbes svg path').length) >= 5, c1.join(' | '));
    await p.hover('#courbes svg');
    ok('Infobulle sur la courbe', await p.isVisible('#infobulle'));
    await p.selectOption('#cibleCourbes', 'Machine');
    await p.waitForTimeout(1500);
    const c2 = await p.evaluate(() => Array.from(document.querySelectorAll('#courbes .courbe h3')).map((h) => h.firstChild.textContent));
    ok('Courbes Machine : processeur, mémoire libre, disque, sans courbe vide de temps de réponse', c2.indexOf('Espace disque libre') >= 0 && c2.indexOf('Temps de réponse') < 0, c2.join(' | '));
    const dispo = await p.evaluate(() => Array.from(document.querySelectorAll('#disponibilite tbody tr')).map((r) => r.textContent).join(' | '));
    ok('Disponibilité : pas de « — ms »', dispo.indexOf('— ms') < 0 && /Machine/.test(dispo), dispo);
    await p.click('[data-onglet="experience"]');
    await p.waitForTimeout(1500);
    ok('Expérience utilisateur : 4 courbes', await p.evaluate(() => document.querySelectorAll('#courbesExperience .courbe').length) === 4);

    /* actions */
    await p.click('[data-onglet="actions"]');
    await p.click('[data-action="vider-pool"]');
    ok('Confirmation dans le bouton (sans fenêtre)', /Confirmer le vidage/.test(await p.textContent('[data-action="vider-pool"]')));
    await p.click('[data-action="vider-pool"]');
    await p.waitForFunction(() => /Vidage du pool/.test(document.getElementById('resultatAction').textContent), null, { timeout: 120000 });
    ok('Vidage du pool réel (asadmin)', /réussi/.test(await p.textContent('#resultatAction')), await p.textContent('#resultatAction'));
    await p.click('[data-action="redemarrer-payara"]'); await p.click('[data-action="redemarrer-payara"]');
    await p.waitForFunction(() => /Windows seulement/.test(document.getElementById('resultatAction').textContent), null, { timeout: 30000 });
    ok('Redémarrage du service : refusé hors Windows (banc Linux)', true);
    ok('Redémarrage automatique désactivé par défaut', /désactivé/.test(await p.textContent('#etatRedemarrageAuto')));

    await p.click('[data-onglet="journal"]');
    await p.waitForTimeout(1000);
    const j = await p.textContent('#journal');
    ok('Journal : connexion, mot de passe, réglages, alertes, vidage', ['CONNEXION', 'MOT_DE_PASSE', 'REGLAGES', 'ALERTE', 'VIDER_POOL'].every((x) => j.indexOf(x) >= 0));
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    await b.close();
    exec(`UPDATE t_parameters SET str_VALUE = '${jetonAvant}' WHERE str_KEY = 'SUPPORT_VEILLE_JETON'`);
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
