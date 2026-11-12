/* SAUVEGARDE SUR LE SERVEUR SEULEMENT, AUX HORAIRES CHOISIS (retour du 12/11, lenteurs d'appaul), Centre de support,
 * ecran « Stabilité du serveur », onglet « Sauvegardes ».
 *
 * Defaut constate chez appaul le 11/11 : sept Payara (serveur, quatre caisses, deux autres postes) branches sur la meme
 * base lancaient chacun leur sauvegarde complete a hh:05, chacun marquant « interrompues » celles des autres (15
 * sauvegardes en echec entre 23:05 et 01:05, requetes de sauvegarde de plus de 10 s sans arret de 00:05 a 01:15).
 *  - horaires saisis dans l'ecran (« 20:00, 12:00 ») : ranges et enregistres, affiches avec la prochaine sauvegarde ;
 *    un horaire impossible (« 12:07 ») est refuse dans la barre, rien n'est ecrit ;
 *  - poste serveur designe par son nom : sur un autre poste, « Sauvegarder maintenant » est grise et l'etat dit
 *    « poste client » ;
 *  - sauvegarde en cours sur un autre poste (verrou de la base tenu par une autre connexion, ligne « En cours » d'un
 *    autre poste) : affichee ; « Sauvegarder maintenant » refuse sans rien lancer, la ligne de l'autre poste n'est pas
 *    marquee « interrompue » ;
 *  - bilan : aucune ligne de sauvegarde creee, aucun fichier ; reglages remis comme avant ; aucune fenetre, aucune
 *    erreur JavaScript.
 * Le dossier des sauvegardes est remplace le temps du test par un chemin impossible : sur l'ancien code, la
 * sauvegarde lancee a tort echoue tout de suite au lieu de copier toute la base (l'outil, lui, est toujours retrouve
 * dans le dossier de MariaDB).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync, spawn } = require('child_process');
const privilegeEssai = require('./privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN_SUPPORT, 'P_SM_SUPPORT_SERVEUR');
const CLES = ['KEY_SAUVEGARDE_ACTIVE', 'KEY_SAUVEGARDE_HORAIRES', 'KEY_SAUVEGARDE_POSTE', 'KEY_SAUVEGARDE_DOSSIER'];
const reglages = () => q("SELECT COALESCE(GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) ORDER BY str_KEY SEPARATOR '|'), 'NULL') FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')");
const param = (k) => q("SELECT COALESCE(MAX(str_VALUE), '(absent)') FROM t_parameters WHERE str_KEY = '" + k + "'");
const poser = (k, v) => exec("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + k + "', '"
  + v.replace(/\\/g, '\\\\').replace(/'/g, "''") + "', 'essai e2e', 'SYSTEME', 'enable', NOW()) ON DUPLICATE KEY UPDATE str_VALUE = VALUES(str_VALUE)");
const AUTRE = 'CAISSE-E2E-AUTRE';

(async () => {
  droit.remettre();
  const idAvant = Number(q('SELECT COALESCE(MAX(id), 0) FROM t_sauvegarde'));
  const reglagesAvant = reglages();
  /* dossier impossible (sous un fichier) : une sauvegarde lancee a tort echoue tout de suite sans copier la base */
  poser('KEY_SAUVEGARDE_DOSSIER', (ENV_E2E.WINDOWS ? 'C:/Windows/win.ini' : '/etc/hostname') + '/e2e-impossible');
  poser('KEY_SAUVEGARDE_ACTIVE', '0');
  let verrou = null, idAutre = 0;
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [], err = [];
  const S = (sel) => 'supportserveur #ongletSauvegardes ' + sel;
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto((process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN_SUPPORT); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const ouvrirOnglet = async () => {
      /* l'ecran est ferme puis rouvert par le menu du Centre de support : etat et reglages relus */
      await p.evaluate(() => { Ext.ComponentQuery.query('supportserveur').forEach((c) => c.destroy());
        testextjs.app.getController('App').onRedirectTo('supportserveur', {}); });
      await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur').length > 0, null, { timeout: 30000 });
      await p.click('.supportserveur .x-tab:has-text("Sauvegardes")');
      await p.waitForFunction((s) => { const e = Ext.ComponentQuery.query(s)[0]; return e && /Dernière sauvegarde/.test(e.getEl().dom.textContent); }, S('#sauvEtat'), { timeout: 30000 });
      await p.waitForTimeout(500);
    };
    const texte = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? (c.getEl().dom.textContent || '') : '(absent)'; }, S(sel));
    const champ = (sel) => p.evaluate((s) => !!Ext.ComponentQuery.query(s)[0], S(sel));
    /* saisie au clavier dans le champ visible, comme l'utilisateur */
    const taper = async (sel, valeur) => {
      const id = await p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.inputEl.dom.id : null; }, S(sel));
      if (!id) { throw new Error('champ absent : ' + sel); }
      await p.click('#' + id); await p.fill('#' + id, ''); await p.type('#' + id, valeur);
    };
    const cliquer = async (sel) => p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), S(sel)));
    await ouvrirOnglet();

    /* 1. horaires */
    ok('Champ « Horaires » dans l\'onglet', await champ('#sauvHoraires'));
    ok('Champ « Poste serveur » dans l\'onglet', await champ('#sauvPoste'));
    try {
      await taper('#sauvHoraires', '20:00, 12:00');
      await cliquer('#btnSauvReglages');
      await p.waitForTimeout(1500);
    } catch (e) { ok('Saisie des horaires', false, e.message); }
    ok('Horaires enregistrés, rangés : « 12:00, 20:00 »', param('KEY_SAUVEGARDE_HORAIRES') === '12:00, 20:00', param('KEY_SAUVEGARDE_HORAIRES'));
    ok('Sauvegarde automatique laissée coupée par l\'écran', param('KEY_SAUVEGARDE_ACTIVE') === '0');
    await ouvrirOnglet();
    ok('Horaires relus dans le champ', await p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c && c.getValue(); }, S('#sauvHoraires')) === '12:00, 20:00');
    try {
      await taper('#sauvHoraires', '12:07');
      await cliquer('#btnSauvReglages');
      await p.waitForTimeout(1500);
    } catch (e) { /* champ absent : deja compte */ }
    const msg = await texte('#sauvMessage');
    ok('Horaire impossible (12:07) refusé dans la barre, rien d\'écrit', /multiple de 5/.test(msg) && param('KEY_SAUVEGARDE_HORAIRES') === '12:00, 20:00', msg);

    /* 2. ce poste n'est pas le serveur */
    try {
      await taper('#sauvHoraires', '12:00, 20:00');
      await taper('#sauvPoste', AUTRE);
      await cliquer('#btnSauvReglages');
      await p.waitForTimeout(1500);
    } catch (e) { ok('Saisie du poste serveur', false, e.message); }
    ok('Poste serveur enregistré', param('KEY_SAUVEGARDE_POSTE') === AUTRE, param('KEY_SAUVEGARDE_POSTE'));
    await ouvrirOnglet();
    const etatClient = await texte('#sauvEtat');
    const griseClient = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].isDisabled(), S('#btnSauvMaintenant'));
    ok('Sur un autre poste que le serveur : « Sauvegarder maintenant » grisé, « poste client » affiché', griseClient && /poste client/.test(etatClient), etatClient.slice(0, 300));
    if (!griseClient) {
      await cliquer('#btnSauvMaintenant');
      await p.waitForTimeout(2500);
    }
    ok('Aucune sauvegarde lancée depuis le poste client', Number(q('SELECT COUNT(*) FROM t_sauvegarde WHERE id > ' + idAvant)) === 0);

    /* 3. une sauvegarde tourne sur un autre poste (verrou de la base tenu ailleurs) */
    try {
      await taper('#sauvPoste', '');
      await cliquer('#btnSauvReglages');
      await p.waitForTimeout(1500);
    } catch (e) { /* */ }
    poser('KEY_SAUVEGARDE_POSTE', '');
    exec("INSERT INTO t_sauvegarde (debut, origine, statut, hote) VALUES (NOW() - INTERVAL 2 MINUTE, 'AUTOMATIQUE', 'EN_COURS', '" + AUTRE + "')");
    idAutre = Number(q("SELECT MAX(id) FROM t_sauvegarde WHERE hote = '" + AUTRE + "'"));
    verrou = spawn('mariadb', [...ENV_E2E.MARIADB, BASE, '-sN', '-e', "SELECT GET_LOCK(CONCAT('prestige_sauvegarde_', DATABASE()), 0); DO SLEEP(600);"], { stdio: 'ignore' });
    for (let i = 0; i < 50 && q("SELECT IS_FREE_LOCK(CONCAT('prestige_sauvegarde_', DATABASE()))") !== '0'; i++) { await p.waitForTimeout(200); }
    await ouvrirOnglet();
    const etatVerrou = await texte('#sauvEtat');
    ok('Sauvegarde d\'un autre poste affichée « en cours »', /en cours sur un autre poste/i.test(etatVerrou), etatVerrou.slice(0, 200));
    ok('Ce poste (base locale) est le serveur : bouton actif', !(await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].isDisabled(), S('#btnSauvMaintenant'))));
    await cliquer('#btnSauvMaintenant');
    await p.waitForTimeout(3000);
    const refus = await texte('#sauvMessage');
    ok('« Sauvegarder maintenant » refusé : déjà en cours sur un autre poste', /déjà en cours.*autre poste/.test(refus), refus);
    ok('Aucune sauvegarde lancée par-dessus celle de l\'autre poste', Number(q('SELECT COUNT(*) FROM t_sauvegarde WHERE id > ' + idAvant + ' AND id <> ' + idAutre)) === 0,
      q("SELECT COALESCE(GROUP_CONCAT(CONCAT(id, ':', statut, ':', COALESCE(hote, '')) SEPARATOR ' '), '') FROM t_sauvegarde WHERE id > " + idAvant));
    ok('La sauvegarde de l\'autre poste n\'est pas marquée « interrompue »', q('SELECT statut FROM t_sauvegarde WHERE id = ' + idAutre) === 'EN_COURS',
      q('SELECT CONCAT(statut, \' \', COALESCE(message, \'\')) FROM t_sauvegarde WHERE id = ' + idAutre));
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    if (verrou) { verrou.kill(); }
    droit.remettre();
    await b.close();
    exec("DELETE FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "');"
      + (reglagesAvant !== 'NULL' ? reglagesAvant.split('|').map((kv) => { const i = kv.indexOf('=');
        return "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + kv.slice(0, i) + "', '" + kv.slice(i + 1).replace(/\\/g, '\\\\').replace(/'/g, "''") + "', 'Sauvegardes', 'SYSTEME', 'enable', NOW());"; }).join('') : '')
      + 'DELETE FROM t_sauvegarde WHERE id > ' + idAvant + ';');
    ok('Bilan : réglages remis comme avant, aucune ligne de sauvegarde restante', reglages() === reglagesAvant
      && Number(q('SELECT COUNT(*) FROM t_sauvegarde WHERE id > ' + idAvant)) === 0, reglages() + ' / ' + reglagesAvant);
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
