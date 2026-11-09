/* PLAN DU 08/11, POINT 14 : CODE PIN APRES LE BADGE (optionnel, desactive par defaut).
 *
 * Badge d'essai de l'utilisateur admin (retire a la fin, comme test-connexion-badge.js). Par l'ecran (1366 x 768) :
 *  - par defaut (KEY_CONNEXION_BADGE_PIN = 0 apres la migration) : le badge seul connecte, aucun champ de code ;
 *  - Mon compte (menu Options > Mon compte) : section « Code PIN du badge » ; etat = API = base ; refus montres sous le
 *    bouton, sans fenetre : mot de passe faux, codes differents, code trop facile (1111) ; confirmation dans le bouton
 *    (deux clics) ; code 2580 enregistre : empreinte salee en base (jamais le code), date affichee = base ;
 *  - parametre a 1 : badge -> « Badge reconnu » + champ du code (focus, masque), aucune session ; code faux -> « Code
 *    PIN incorrect », aucune session ; bon code -> accueil ; code tape en AZERTY sans Maj (é(_à) -> accepte ; autre
 *    badge passe pendant le code -> la lecture reprend ; utilisateur sans code -> « Code PIN non défini » ;
 *  - cas varies par l'API : sans code, code faux, code mal forme, bon code ; 10 codes faux -> bloque meme avec le bon ;
 *  - parametre remis a 0 : le badge seul connecte de nouveau, meme avec un code defini ;
 *  - bilan : t_badge_pin gagne exactement la ligne de l'admin ; journal : 5 connexions « par badge », dont 3 « et code
 *    PIN » ; ni le code ni le mot de passe dans le journal ni dans les traces du serveur ; tout est remis a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const qs = (s) => { try { return q(s); } catch (e) { return 'ERREUR'; } };
const LOG = ENV_E2E.JOURNAL_SERVEUR;
const E = 'E2E-PIN-1', B = 'E2E-PIN-B1', PIN = '2580', PARAM_PIN = 'KEY_CONNEXION_BADGE_PIN';
let rang = 0;
const nouveauNum = () => 'ZZP-26-' + String(Date.now() + rang++).slice(-5) + '-A';
let NUM = nouveauNum();
const SECRET = crypto.randomBytes(32).toString('base64url');
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const LIEN = q("SELECT IFNULL((SELECT id FROM t_employe WHERE lg_USER_ID = '" + ADMIN + "'), '')");
const TABLE = q("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 't_badge_pin'") === '1';
const PARAM_AVANT = qs("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + PARAM_PIN + "'), 'ABSENT')");
const PARAM_BADGE = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CONNEXION_BADGE'), 'ABSENT')");
const PIN_AVANT = TABLE ? q("SELECT IFNULL((SELECT CONCAT(sel, '|', empreinte, '|', dt_maj) FROM t_badge_pin WHERE lg_USER_ID = '" + ADMIN + "'), '')") : '';
const contenu = () => 'PRESTIGE-BADGE|1|' + NUM + '|' + ENV_E2E.LOGIN + '|' + SECRET;
const renumeroter = () => { NUM = nouveauNum(); q("UPDATE t_rh_badge SET numero = '" + NUM + "' WHERE id = '" + B + "'; UPDATE t_employe SET badge = '" + NUM + "' WHERE id = '" + E + "'"); };
const parametre = (v) => { if (TABLE) { q("UPDATE t_parameters SET str_VALUE = '" + v + "' WHERE str_KEY = '" + PARAM_PIN + "'"); } };
function nettoyer() {
  q("DELETE FROM t_rh_badge WHERE id = '" + B + "'; DELETE FROM t_employe WHERE id = '" + E + "'");
  if (LIEN) { q("UPDATE t_employe SET lg_USER_ID = '" + ADMIN + "' WHERE id = '" + LIEN + "'"); }
  if (PARAM_BADGE !== 'ABSENT') { q("UPDATE t_parameters SET str_VALUE = '" + PARAM_BADGE + "' WHERE str_KEY = 'KEY_CONNEXION_BADGE'"); }
  if (TABLE) {
    q("DELETE FROM t_badge_pin WHERE lg_USER_ID = '" + ADMIN + "'");
    if (PIN_AVANT) { const [s, e, d] = PIN_AVANT.split('|'); q("INSERT INTO t_badge_pin (lg_USER_ID, sel, empreinte, dt_maj) VALUES ('" + ADMIN + "', '" + s + "', '" + e + "', '" + d + "')"); }
    if (PARAM_AVANT !== 'ABSENT' && PARAM_AVANT !== 'ERREUR') { q("UPDATE t_parameters SET str_VALUE = '" + PARAM_AVANT + "' WHERE str_KEY = '" + PARAM_PIN + "'"); }
  }
}

(async () => {
  nettoyer();
  if (TABLE) { q("DELETE FROM t_badge_pin WHERE lg_USER_ID = '" + ADMIN + "'"); }
  if (LIEN) { q("UPDATE t_employe SET lg_USER_ID = NULL WHERE id = '" + LIEN + "'"); }
  if (PARAM_BADGE !== 'ABSENT') { q("UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = 'KEY_CONNEXION_BADGE'"); }
  q("INSERT INTO t_employe (id, matricule, nom, prenoms, statut, lg_USER_ID, badge, created_at) VALUES ('" + E + "', 'E2E-PIN-M1', 'ESSAI', 'Badge code PIN', 'ACTIF', '" + ADMIN + "', '" + NUM + "', NOW())");
  q("INSERT INTO t_rh_badge (id, employe_id, numero, statut, dt_emission, created_at, secret_hash, dt_secret) VALUES ('" + B + "', '" + E + "', '" + NUM + "', 'ACTIF', CURDATE(), NOW(), '"
    + crypto.createHash('sha256').update(SECRET).digest('hex') + "', NOW())");
  const debut = q('SELECT NOW()');
  const lignesAvant = TABLE ? q('SELECT COUNT(*) FROM t_badge_pin') : '0';
  const tailleLog = fs.existsSync(LOG) ? fs.statSync(LOG).size : 0;
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  const page = async () => { const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage(); p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'networkidle' }); return p; };
  const connecte = (p) => p.evaluate(async () => { try { return !!(await (await fetch('../api/v1/app/info', { cache: 'no-store' })).json()).connecte; } catch (e) { return false; } });
  const zone = (p) => p.evaluate(() => { const z = document.getElementById('pl-badge-zone'), pin = document.getElementById('pl-bz-pin'), c = document.getElementById('pl-badge-pin');
    return { etat: z.getAttribute('data-etat'), titre: document.getElementById('pl-bz-titre').textContent, texte: document.getElementById('pl-bz-texte').innerText.replace(/\s+/g, ' '),
      pinVisible: !!pin && !pin.hidden && pin.getBoundingClientRect().height > 0, focus: !!c && document.activeElement === c, type: c ? c.type : null, mode: c ? c.getAttribute('inputmode') : null }; });
  const passerBadge = async (p) => {
    if (await p.isVisible('#pl-badge')) { await p.click('#pl-badge'); }
    await p.waitForSelector('#pl-badge-zone', { state: 'visible', timeout: 5000 });
    await p.keyboard.type(contenu(), { delay: 2 }); await p.keyboard.press('Enter');
  };
  const attendreReponse = (p) => p.waitForResponse((r) => /auth-badge/.test(r.url()), { timeout: 30000 });
  const essai = (p, pin) => p.evaluate(async ([c, pin]) => { const corps = { contenu: c }; if (pin !== undefined) { corps.pin = pin; }
    const r = await fetch('../api/v1/user/auth-badge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    const j = await r.json(); const s = await (await fetch('../api/v1/app/info', { cache: 'no-store' })).json(); return { j, connecte: !!s.connecte }; }, [contenu(), pin]);
  try {
    /* 0. desactive par defaut */
    ok('Migration : KEY_CONNEXION_BADGE_PIN = 0 (désactivé par défaut), table t_badge_pin', TABLE && PARAM_AVANT === '0', JSON.stringify({ TABLE, PARAM_AVANT }));
    parametre('0');

    /* 1. badge seul, par defaut */
    const p1 = await page();
    await Promise.all([attendreReponse(p1), passerBadge(p1)]);
    await p1.waitForURL('**/general/**', { timeout: 30000 }).catch(() => null);
    ok('Par défaut : le badge seul connecte (aucun code demandé)', /general/.test(p1.url()) && await connecte(p1), p1.url());

    /* 2. Mon compte : par le menu Options */
    const pc = await page();
    await pc.fill('#str_login', ENV_E2E.LOGIN); await pc.fill('#str_password', 'e2etest'); await pc.click('#login');
    await pc.waitForURL('**/general/**', { timeout: 60000 });
    await pc.waitForFunction(() => window.Ext && Ext.getCmp('commonsettingapp') && Ext.getCmp('commonsettingapp').rendered, null, { timeout: 90000 });
    await pc.waitForTimeout(1500);
    const bt = await pc.evaluate(() => { const r = Ext.getCmp('commonsettingapp').getEl().dom.getBoundingClientRect(); return { x: r.right - 5, y: r.top + r.height / 2 }; });
    await pc.mouse.click(bt.x, bt.y);
    await pc.waitForSelector('.pft-item:has-text("Mon compte")', { state: 'visible', timeout: 10000 });
    await pc.click('.pft-item:has-text("Mon compte")');
    await pc.waitForFunction(() => { const e = document.querySelector('.pin-etat'); return !!e; }, null, { timeout: 30000 }).catch(() => null);
    const etatEcran = () => pc.evaluate(() => { const e = document.querySelector('.pin-etat'); return e ? { defini: e.getAttribute('data-defini'), demande: e.getAttribute('data-demande'), texte: e.innerText.replace(/\s+/g, ' ') } : null; });
    const apiPin = () => pc.evaluate(async () => (await fetch('../api/v1/user/badge-pin')).json());
    let ec = await etatEcran(), api = await apiPin().catch(() => null);
    ok('Mon compte : section « Code PIN du badge », « non défini », « Demandé … : non » = API = base', ec && ec.defini === '0' && ec.demande === '0' && /non défini/.test(ec.texte) && api && api.defini === false && api.demande === false,
      JSON.stringify({ ec, api }));
    const champ = (id) => pc.evaluate((id) => Ext.ComponentQuery.query('myaccountmanager #' + id)[0].inputEl.dom.id, id);
    const remplir = async (mdp, a, c) => { await pc.fill('#' + await champ('pinMotDePasse'), mdp); await pc.fill('#' + await champ('pinCode'), a); await pc.fill('#' + await champ('pinConfirme'), c);
      /* ExtJS signale la saisie 50 ms apres (checkChangeBuffer) : un humain ne clique pas plus vite */
      await pc.waitForTimeout(400); };
    const bouton = async () => pc.evaluate(() => Ext.ComponentQuery.query('myaccountmanager #pinEnregistrer')[0].getEl().dom.id);
    const texteBouton = () => pc.evaluate(() => Ext.ComponentQuery.query('myaccountmanager #pinEnregistrer')[0].getText());
    const resultat = () => pc.evaluate(() => { const r = document.querySelector('.pin-resultat'); return r ? { ok: r.getAttribute('data-ok'), texte: r.innerText.trim() } : null; });
    const fenetres = () => pc.evaluate(() => Ext.ComponentQuery.query('messagebox, window').filter((w) => w.isVisible()).length);
    const deuxClics = async () => { await pc.click('#' + await bouton()); const t1 = await texteBouton(); await pc.waitForTimeout(500);
      const [r] = await Promise.all([pc.waitForResponse((x) => /badge-pin/.test(x.url()) && x.request().method() === 'POST', { timeout: 30000 }), pc.click('#' + await bouton())]);
      await pc.waitForTimeout(800); return { t1, j: await r.json() }; };
    const lignePin = () => (TABLE ? q("SELECT IFNULL((SELECT CONCAT(sel, '|', empreinte, '|', DATE_FORMAT(dt_maj, '%d/%m/%Y %H:%i')) FROM t_badge_pin WHERE lg_USER_ID = '" + ADMIN + "'), '')") : '');

    await remplir('mauvais-mdp', PIN, PIN);
    let d = await deuxClics();
    let r = await resultat();
    ok('Mot de passe actuel faux : « Confirmer » dans le bouton, puis refus sous le bouton, rien en base, aucune fenêtre', /Confirmer/.test(d.t1) && r && r.ok === '0' && /Mot de passe actuel incorrect/.test(r.texte) && lignePin() === '' && await fenetres() === 0,
      JSON.stringify({ d, r }));
    await remplir('e2etest', PIN, '2581');
    await pc.click('#' + await bouton());
    r = await resultat();
    ok('Codes différents : refus sous le bouton, le bouton ne passe pas en « Confirmer »', r && /différents/.test(r.texte) && !/Confirmer/.test(await texteBouton()) && lignePin() === '', JSON.stringify(r));
    await remplir('e2etest', '1111', '1111');
    d = await deuxClics(); r = await resultat();
    ok('Code trop facile (1111) : refusé par le serveur, rien en base', r && r.ok === '0' && /trop facile/.test(r.texte) && lignePin() === '', JSON.stringify({ d: d.j, r }));
    await remplir('e2etest', PIN, PIN);
    d = await deuxClics(); r = await resultat();
    const ligne = lignePin().split('|');
    ec = await etatEcran(); api = await apiPin();
    ok('Bon mot de passe, code 2580 : enregistré, message avec la date = base', d.j.success === true && r && r.ok === '1' && r.texte === 'Code PIN enregistré le ' + ligne[2] + '.', JSON.stringify({ r, ligne: ligne[2] }));
    ok('Base : empreinte salée (64 car.), jamais le code en clair', ligne.length === 3 && ligne[1].length === 64 && ligne[0].length >= 16 && ligne.join('|').indexOf(PIN) < 0, JSON.stringify(ligne.map((x) => x.slice(0, 12))));
    ok('Rapprochement : état « défini le <date> » à l\'écran = API = base', ec && ec.defini === '1' && ec.texte.indexOf('défini le ' + ligne[2]) >= 0 && api.defini === true && api.date === ligne[2], JSON.stringify({ ec, api, base: ligne[2] }));
    const champs = await pc.evaluate(() => ['pinMotDePasse', 'pinCode', 'pinConfirme'].map((i) => { const c = Ext.ComponentQuery.query('myaccountmanager #' + i)[0]; return { type: c.inputEl.dom.type, vide: c.getRawValue() === '' }; }));
    const visible = await pc.evaluate(() => { const bt = Ext.ComponentQuery.query('myaccountmanager #pinEnregistrer')[0].getEl().dom; bt.scrollIntoView({ block: 'nearest' }); const r = bt.getBoundingClientRect(); return r.bottom <= window.innerHeight && r.width > 0 && bt.scrollWidth <= bt.clientWidth + 1; });
    ok('Ergonomie : champs masqués et vidés après l\'enregistrement ; bouton entier et visible (1366 × 768)', champs.every((c) => c.type === 'password' && c.vide) && visible, JSON.stringify({ champs, visible }));

    /* 3. code demande */
    parametre('1');
    await pc.evaluate(() => Ext.ComponentQuery.query('myaccountmanager')[0].lirePin());
    await pc.waitForTimeout(1500);
    ec = await etatEcran();
    ok('Paramètre à 1 : « Demandé après le badge : oui » à l\'écran = API = base', ec && ec.demande === '1' && /Demandé après le badge à la connexion : oui/.test(ec.texte) && (await apiPin()).demande === true, JSON.stringify(ec));

    const p3 = await page();
    await Promise.all([attendreReponse(p3), passerBadge(p3)]);
    await p3.waitForTimeout(500);
    let z = await zone(p3);
    ok('Badge seul : « Badge reconnu », champ du code visible, focus, masqué, numérique ; aucune session', z.titre === 'Badge reconnu' && z.pinVisible && z.focus && z.type === 'password' && z.mode === 'numeric' && !(await connecte(p3)) && /general/.test(p3.url()) === false,
      JSON.stringify(z));
    await Promise.all([attendreReponse(p3), p3.keyboard.type('1357', { delay: 30 })]);
    await p3.waitForTimeout(500);
    z = await zone(p3);
    ok('Code faux : « Code PIN incorrect », le champ du code revient, aucune session', z.titre === 'Code PIN incorrect' && z.pinVisible && z.focus && !(await connecte(p3)), JSON.stringify(z));
    await Promise.all([attendreReponse(p3), p3.keyboard.type(PIN, { delay: 30 })]);
    await p3.waitForURL('**/general/**', { timeout: 30000 }).catch(() => null);
    ok('Bon code : accueil ouvert, session de l\'utilisateur du badge', /general/.test(p3.url()) && await connecte(p3), p3.url());

    const p4 = await page();
    await Promise.all([attendreReponse(p4), passerBadge(p4)]);
    await p4.waitForTimeout(400);
    await Promise.all([attendreReponse(p4), p4.keyboard.type('é(_à', { delay: 30 })]);
    await p4.waitForURL('**/general/**', { timeout: 30000 }).catch(() => null);
    ok('Code tapé en AZERTY sans Maj (é ( _ à = 2 5 8 0) : accepté', /general/.test(p4.url()), p4.url());

    const p5 = await page();
    await Promise.all([attendreReponse(p5), passerBadge(p5)]);
    await p5.waitForTimeout(400);
    await Promise.all([attendreReponse(p5), (async () => { await p5.keyboard.type(contenu(), { delay: 2 }); await p5.keyboard.press('Enter'); })()]);
    await p5.waitForTimeout(500);
    z = await zone(p5);
    ok('Autre badge passé pendant le code : la lecture reprend, le code est redemandé (aucun code faux compté)', z.titre === 'Badge reconnu' && z.pinVisible && !(await connecte(p5)), JSON.stringify(z));

    q("DELETE FROM t_badge_pin WHERE lg_USER_ID = '" + ADMIN + "'");
    const p6 = await page();
    await Promise.all([attendreReponse(p6), passerBadge(p6)]);
    await p6.waitForTimeout(500);
    z = await zone(p6);
    ok('Utilisateur sans code (paramètre à 1) : « Code PIN non défini », pas de champ de code, aucune session', z.titre === 'Code PIN non défini' && /Mon compte/.test(z.texte) && !z.pinVisible && !(await connecte(p6)), JSON.stringify(z));

    /* 4. cas varies par l'API (code redefini par l'ecran) */
    await remplir('e2etest', PIN, PIN);
    d = await deuxClics();
    const pa = await page();
    let e = await essai(pa);
    ok('API : sans code -> pinRequis, aucune session', e.j.success === false && e.j.pinRequis === true && !e.connecte, JSON.stringify(e.j));
    e = await essai(pa, '0000');
    ok('API : code faux -> pinFaux « Code PIN incorrect », aucune session', e.j.success === false && e.j.pinFaux === true && /Code PIN incorrect/.test(e.j.message) && !e.connecte, JSON.stringify(e.j));
    e = await essai(pa, '25a0');
    ok('API : code mal formé -> refusé, aucune session', e.j.success === false && !e.connecte, JSON.stringify(e.j));
    e = await essai(pa, PIN);
    ok('API : bon code -> session ouverte', e.j.success === true && e.connecte, JSON.stringify(e.j).slice(0, 80));

    /* 5. parametre remis a 0 : le badge seul suffit, meme avec un code defini */
    parametre('0');
    const p7 = await page();
    await Promise.all([attendreReponse(p7), passerBadge(p7)]);
    await p7.waitForURL('**/general/**', { timeout: 30000 }).catch(() => null);
    ok('Paramètre remis à 0 : le badge seul connecte de nouveau (code défini ignoré)', /general/.test(p7.url()), p7.url());

    /* 6. bilan */
    const lignesApres = q('SELECT COUNT(*) FROM t_badge_pin');
    ok('Bilan t_badge_pin : exactement une ligne de plus (l\'admin)', Number(lignesApres) === Number(lignesAvant) + 1 && lignePin() !== '', lignesAvant + ' -> ' + lignesApres);
    const journal = q("SELECT IFNULL(GROUP_CONCAT(str_DESCRIPTION SEPARATOR ' || '), '') FROM t_event_log WHERE dt_CREATED >= '" + debut + "' AND str_DESCRIPTION LIKE '%par badge ZZP-%'");
    const n = (journal.match(/par badge ZZP-/g) || []).length, nPin = (journal.match(/et code PIN/g) || []).length;
    ok('Journal : 5 connexions « par badge », dont 3 « et code PIN » (écran, AZERTY, API)', n === 5 && nPin === 3, n + ' / ' + nPin + ' ' + journal.slice(0, 200));
    const ajout = fs.existsSync(LOG) ? fs.readFileSync(LOG).slice(tailleLog).toString('utf8') : '';
    ok('Traces du serveur : ni le secret, ni le code, ni le mot de passe', ajout.indexOf(SECRET.slice(0, 20)) < 0 && !/pin\W{0,4}(2580|1357|1111)/i.test(ajout) && ajout.indexOf('e2etest') < 0 && ajout.indexOf('mauvais-mdp') < 0);

    /* 7. limite d'essais (en dernier) */
    parametre('1');
    renumeroter();
    const pl = await page();
    for (let i = 0; i < 10; i++) { await essai(pl, String(1000 + i * 3)); }
    e = await essai(pl, PIN);
    ok('10 codes faux sur un badge : le suivant est refusé avec délai, même avec le bon code', e.j.success === false && e.j.attente > 0 && !e.connecte, JSON.stringify(e.j));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Remise en état : badge, employé, code et paramètres d\'avant', q("SELECT COUNT(*) FROM t_employe WHERE id = '" + E + "'") === '0'
      && (!TABLE || q("SELECT IFNULL((SELECT CONCAT(sel, '|', empreinte, '|', dt_maj) FROM t_badge_pin WHERE lg_USER_ID = '" + ADMIN + "'), '')") === PIN_AVANT)
      && qs("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + PARAM_PIN + "'), 'ABSENT')") === PARAM_AVANT);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
