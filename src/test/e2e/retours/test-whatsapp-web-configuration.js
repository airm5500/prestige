/* COMPTES WHATSAPP : VALEURS PAR DEFAUT, « CONFIGURATION DETAILLEE », DEMARRAGE SANS FENETRE (plan avoir du 08/11,
 * point 9).
 *
 *  1. Migration V7.2.100 rejouee sur la base : un compte Web jamais configure recoit http://localhost:3010 et
 *     C:\prestige\whatsapp-web ; rejouee, elle ne change plus rien ; une installation deja configuree (adresse saisie,
 *     ou seulement un jeton, ou deja enregistree depuis l'ecran) n'est pas touchee.
 *  2. Ecran (menu CAMPAGNES SMS / WHATSAPP > Comptes WhatsApp) : les deux valeurs sont de vraies valeurs des champs
 *     (pas des indications grisees), identiques a la base.
 *  3. « Configuration détaillée » (clic) : fenetre de consultation ; mode, etat, adresse, port, dossier, demarrage,
 *     journaux, service Windows = API = base = systeme (sc query) ; etapes des deux modes ; aucun jeton dans la page ni
 *     dans les reponses du serveur.
 *  4. Lancement direct : un faux dossier du service (package.json, src\serveur.js, faux demarrer.bat) ; « Reconnecter »
 *     de la banniere le lance SANS FENETRE (le faux script note GetConsoleWindow = 0) et sa sortie arrive dans
 *     journaux\demarrer.log. Le vrai service du poste n'est ni lance ni arrete : son adresse et son jeton ne sont pas
 *     utilises pendant l'essai (aucune session WhatsApp ouverte). Comptes remis a la fin.
 */
const { chromium } = require('playwright-core');
/* la banniere (« Reconnecter ») est verifiee : elle n'est pas masquee au lancement */
process.env.E2E_BANNIERE_WHATSAPP = '1';
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
/* --raw : les barres obliques inverses des chemins ne sont pas doublees par le client mariadb */
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8' }).replace(/\r?\n$/, '');
const lit = (s) => (s === null ? 'NULL' : "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'");
const MIGRATION = path.join(__dirname, '..', '..', '..', 'main', 'resources', 'db', 'migration', 'V7.2.100__whatsapp_web_defauts.sql');
const DEFAUT_URL = 'http://localhost:3010', DEFAUT_DOSSIER = 'C:\\prestige\\whatsapp-web';
const PORT_ESSAI = 3992, JETON_FAUX = 'jeton-essai-config-' + Date.now();
const web = () => q("SELECT CONCAT_WS('|', IFNULL(web_url, '-'), IFNULL(web_repertoire, '-')) FROM whatsapp_compte WHERE mode = 'WEB'");
const vierge = "UPDATE whatsapp_compte SET actif = 0, mode_test = 1, web_url = NULL, web_repertoire = NULL, web_jeton = NULL, updated_at = NULL, updated_by = NULL WHERE mode = 'WEB';";

/* faux dossier du service compagnon, avec un faux demarrer.bat qui ne lance rien d'autre qu'une sonde */
const ESSAI = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-wa-config-'));
fs.mkdirSync(path.join(ESSAI, 'src'));
fs.writeFileSync(path.join(ESSAI, 'package.json'), JSON.stringify({ name: 'prestige-whatsapp-web', private: true }));
fs.writeFileSync(path.join(ESSAI, 'src', 'serveur.js'), '/* faux service : jamais lance */\n');
fs.writeFileSync(path.join(ESSAI, 'demarrer.bat'), ['@echo off', 'echo FAUX DEMARRAGE %1',
  String.raw`powershell -NoProfile -Command "Add-Type -Name W -Namespace N -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern System.IntPtr GetConsoleWindow();'; 'console=' + [N.W]::GetConsoleWindow()" > "%~dp0sonde.txt"`,
  'echo FIN DU FAUX DEMARRAGE', ''].join('\r\n'));
const SONDE = path.join(ESSAI, 'sonde.txt'), JOURNAL = path.join(ESSAI, 'journaux', 'demarrer.log');

(async () => {
  q('DROP TABLE IF EXISTS zz_e2e_wacfg_compte; CREATE TABLE zz_e2e_wacfg_compte AS SELECT * FROM whatsapp_compte;');
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  const erreurs = [], dialogues = [], reponses = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('response', async (r) => { if (/\/api\/v1\/whatsapp\//.test(r.url())) { try { reponses.push({ url: r.url(), corps: await r.text() }); } catch (e) { /* redirection */ } } });
  try {
    /* ------------------------------------------------------------ 1. migration */
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    q(vierge + sql);
    const neuve = web();
    q(sql);
    ok('Migration : nouvelle installation -> adresse et dossier par défaut', neuve === DEFAUT_URL + '|' + DEFAUT_DOSSIER, neuve);
    ok('Migration rejouée : rien ne change', web() === neuve, web());
    q(vierge + "UPDATE whatsapp_compte SET web_url = 'http://192.168.1.50:3011' WHERE mode = 'WEB';" + sql);
    const adresseSaisie = web();
    q(vierge + "UPDATE whatsapp_compte SET web_jeton = 'x' WHERE mode = 'WEB';" + sql);
    const jetonSeul = web();
    q(vierge + "UPDATE whatsapp_compte SET updated_at = NOW(), updated_by = 'e2e' WHERE mode = 'WEB';" + sql);
    const dejaEnregistre = web();
    q(vierge + 'UPDATE whatsapp_compte SET web_repertoire = ' + lit('D:\\autre\\service') + " WHERE mode = 'WEB';" + sql);
    const dossierSeul = web();
    ok('Migration : installation déjà configurée non touchée (adresse saisie, jeton seul, déjà enregistrée, dossier seul)',
      adresseSaisie === 'http://192.168.1.50:3011|-' && jetonSeul === '-|-' && dejaEnregistre === '-|-' && dossierSeul === '-|D:\\autre\\service',
      [adresseSaisie, jetonSeul, dejaEnregistre, dossierSeul].join(' / '));
    ok('Migration : le compte API n\'est pas touché', q("SELECT CONCAT_WS('|', IFNULL(web_url, '-'), IFNULL(web_repertoire, '-')) FROM whatsapp_compte WHERE mode = 'API'")
      === q("SELECT CONCAT_WS('|', IFNULL(web_url, '-'), IFNULL(web_repertoire, '-')) FROM zz_e2e_wacfg_compte WHERE mode = 'API'"));

    /* ------------------------------------------------------------ 2. ecran : valeurs par defaut */
    q(vierge + sql);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Comptes WhatsApp');
    await p.waitForFunction(() => Ext.ComponentQuery.query('whatsappcomptes').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForFunction(() => !!Ext.ComponentQuery.query('whatsappcomptes #formWEB [name=webUrl]')[0].getValue(), null, { timeout: 30000 });
    const champs = await p.evaluate(() => { const f = Ext.ComponentQuery.query('whatsappcomptes #formWEB')[0];
      const u = f.down('[name=webUrl]'), r = f.down('[name=webRepertoire]');
      return { url: u.getValue(), rep: r.getValue(), urlAffiche: u.inputEl.dom.value, repAffiche: r.inputEl.dom.value,
        gris: u.inputEl.hasCls(u.emptyCls) || r.inputEl.hasCls(r.emptyCls), actif: f.down('[name=actif]').getValue() }; });
    ok('Écran : « Adresse du service » et « Dossier du service » remplis des vraies valeurs (pas grisées) = base',
      champs.url === DEFAUT_URL && champs.rep === DEFAUT_DOSSIER && champs.urlAffiche === DEFAUT_URL && champs.repAffiche === DEFAUT_DOSSIER && !champs.gris
      && web() === champs.url + '|' + champs.rep, JSON.stringify(champs));
    ok('Écran : le compte n\'est pas activé pour autant', champs.actif === false, champs.actif);

    /* ------------------------------------------------------------ 3. configuration detaillee */
    const lireFenetre = async () => {
      await cliquer(p, 'whatsappcomptes #btnConfigurationWeb');
      await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('#fenConfigurationWeb')[0]; return w && w.isVisible() && document.querySelector('[data-cle=mode]'); }, null, { timeout: 30000 });
      const f = await p.evaluate(() => { const o = {}; document.querySelectorAll('[data-cle]').forEach((e) => { o[e.getAttribute('data-cle')] = e.textContent; });
        o.modes = Array.from(document.querySelectorAll('.wa-cfg-mode')).map((e) => ({ mode: e.getAttribute('data-mode'), actif: e.classList.contains('wa-cfg-actif'), etapes: e.querySelectorAll('li').length, texte: e.textContent }));
        o.page = document.documentElement.innerHTML; return o; });
      const api = await p.evaluate(() => fetch('../api/v1/whatsapp/web/configuration').then((r) => r.json()));
      return { f, api };
    };
    const fermer = async () => {
      await cliquer(p, '#fenConfigurationWeb #btnFermerConfigurationWeb');
      await p.waitForFunction(() => !Ext.ComponentQuery.query('#fenConfigurationWeb').some((w) => w.isVisible()), null, { timeout: 10000 });
    };
    const scQuery = (() => { try { return execFileSync('sc.exe', ['query', 'prestige-whatsapp'], { encoding: 'latin1' }); } catch (e) { return ''; } })();
    const etatSysteme = (/STATE\s*:\s*\d+\s+([A-Z_]+)/.exec(scQuery) || [])[1] || '';
    let { f, api } = await lireFenetre();
    const attendu1 = etatSysteme ? 1 : 2;
    ok('Fenêtre (installation par défaut) : mode = API = système (service Windows ' + (etatSysteme || 'absent') + ')', api.mode === attendu1
      && f.mode === api.mode + ' : ' + api.modeLibelle && f.dossier === DEFAUT_DOSSIER && api.dossier === DEFAUT_DOSSIER
      && f.adresse === DEFAUT_URL && f.port === '3010' && api.port === 3010
      && api.serviceWindows.etat === etatSysteme && (etatSysteme ? f.serviceWindows.includes(etatSysteme) : /non installé/.test(f.serviceWindows))
      && f.journaux === api.journaux && f.demarrage === (api.demarrage || '—'), JSON.stringify({ f: Object.assign({}, f, { page: undefined }), api }));
    ok('Fenêtre : état « Service non configuré » (aucun jeton : le vrai service n\'est pas appelé)', api.etat === 'NON_CONFIGURE' && /non configuré/.test(f.etat), f.etat);
    ok('Fenêtre : étapes des deux modes, celui utilisé en évidence', f.modes.length === 2 && f.modes.every((m) => m.etapes >= 4)
      && f.modes.filter((m) => m.actif).length === 1 && f.modes.find((m) => m.actif).mode === String(api.mode)
      && /installer-service\.bat/.test(f.modes[0].texte) && /demarrer\.bat/.test(f.modes[1].texte) && /sans fenêtre/.test(f.modes[1].texte), JSON.stringify(f.modes.map((m) => m.mode + ':' + m.etapes)));
    await fermer();

    /* faux dossier du service, adresse d'essai (rien n'y repond), jeton d'essai, compte actif : mode 2 */
    q("UPDATE whatsapp_compte SET actif = 1, mode_test = 1, web_url = 'http://127.0.0.1:" + PORT_ESSAI + "', web_jeton = " + lit(JETON_FAUX)
      + ', web_repertoire = ' + lit(ESSAI) + ", updated_at = NOW() WHERE mode = 'WEB';");
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 120000 });
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Comptes WhatsApp');
    await p.waitForFunction((d) => { const c = Ext.ComponentQuery.query('whatsappcomptes #formWEB [name=webRepertoire]')[0]; return c && c.getValue() === d; }, ESSAI, { timeout: 30000 });
    ({ f, api } = await lireFenetre());
    ok('Fenêtre (faux dossier) : mode 2, lancement direct, journal journaux\\demarrer.log du dossier', api.mode === 2 && f.mode === '2 : Par lancement direct'
      && f.dossier === ESSAI && f.journaux === JOURNAL && api.journaux === JOURNAL && f.demarrage === path.join(ESSAI, 'demarrer.bat')
      && f.port === String(PORT_ESSAI) && f.adresse === 'http://127.0.0.1:' + PORT_ESSAI, JSON.stringify(Object.assign({}, f, { page: undefined })));
    ok('Fenêtre : état « Service injoignable » = API', api.etat === 'INJOIGNABLE' && /injoignable/.test(f.etat), f.etat);
    ok('Aucun jeton dans la fenêtre ni dans la page', !f.page.includes(JETON_FAUX) && !JSON.stringify(api).toLowerCase().includes('jeton"'));
    await fermer();

    /* ------------------------------------------------------------ 4. « Reconnecter » : lancement sans fenetre */
    await p.waitForFunction(() => { const e = document.getElementById('pwa-banniere'); return e && /ne répond pas/.test(e.textContent) && e.querySelector('[data-pwa=reconnecter]'); }, null, { timeout: 60000 });
    await p.click('#pwa-banniere [data-pwa=reconnecter]');
    const debut = Date.now();
    while (!fs.existsSync(SONDE) && Date.now() - debut < 30000) { await p.waitForTimeout(500); }
    await p.waitForTimeout(1500);
    const sonde = fs.existsSync(SONDE) ? fs.readFileSync(SONDE, 'latin1').replace(/\0/g, '').trim() : '(pas de sonde)';
    const journal = fs.existsSync(JOURNAL) ? fs.readFileSync(JOURNAL, 'latin1') : '(pas de journal)';
    const raison = await p.evaluate(() => { const e = document.querySelector('#pwa-banniere .pwa-raison'); return e ? e.textContent : ''; });
    ok('« Reconnecter » : le faux demarrer.bat est lancé (mode automatique)', /FAUX DEMARRAGE \/auto/.test(journal) && /lancé/.test(raison), raison + ' / ' + journal.slice(0, 200));
    ok('Lancement SANS FENÊTRE : le script n\'a aucune fenêtre de console (GetConsoleWindow = 0)', /console=0$/.test(sonde), sonde);
    ok('Sortie du script dans journaux\\demarrer.log du dossier', /FIN DU FAUX DEMARRAGE/.test(journal), journal.slice(0, 200));

    ok('Aucune réponse du serveur ne contient le jeton', reponses.length > 0 && reponses.every((r) => !r.corps.includes(JETON_FAUX) && !/"web_?jeton"\s*:/i.test(r.corps)), reponses.length);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close().catch(() => {});
    try {
      q('UPDATE whatsapp_compte c JOIN zz_e2e_wacfg_compte s ON s.mode = c.mode SET c.actif = s.actif, c.mode_test = s.mode_test, c.web_url = s.web_url,'
        + ' c.web_jeton = s.web_jeton, c.web_repertoire = s.web_repertoire, c.updated_at = s.updated_at, c.updated_by = s.updated_by;');
      const remis = q('SELECT COUNT(*) FROM whatsapp_compte c JOIN zz_e2e_wacfg_compte s ON s.mode = c.mode WHERE c.actif <=> s.actif AND c.mode_test <=> s.mode_test'
        + ' AND c.web_url <=> s.web_url AND c.web_jeton <=> s.web_jeton AND c.web_repertoire <=> s.web_repertoire AND c.updated_at <=> s.updated_at');
      q('DROP TABLE zz_e2e_wacfg_compte;');
      ok('Comptes WhatsApp remis à l\'identique', remis === '2', remis);
    } catch (e) { ok('Remise en état', false, e.message); }
    try { fs.rmSync(ESSAI, { recursive: true, force: true }); } catch (e) { /* fichier encore ouvert */ }
    const echecs = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' contrôles réussis');
    process.exit(echecs ? 1 : 0);
  }
})();
