/* L13 : TELEPHONES (jeton signe, pointage mobile, photos depuis le telephone). Jeu d'essai retire a la fin.
 *
 * API v1/mobile (comme l'application ou la page mobile l'appellent) :
 *  - connexion : mauvais mot de passe refuse ; bon -> jeton signe ; le telephone est enregistre ;
 *  - sans jeton, jeton falsifie, ou anciens en-tetes X-User-Info : 401 (seul le jeton signe ouvre v1/mobile) ;
 *  - les chemins mobiles existants ne changent pas (v1/recap/dashboardmob repond comme avant) ;
 *  - pointage : sans employe rattache refuse ; QR exige : sans code / code faux refuses, code du moment accepte ;
 *    GPS exige : position lointaine refusee avec la distance ; double appui (< 2 min) refuse ; ligne MOBILE en base ;
 *  - photos : recherche produit, photo envoyee -> image du produit en base ;
 *  - telephone retire depuis l'ecran RH -> jeton refuse ; reactive -> accepte ; « deconnecter tous » -> refuse.
 * Ecrans : onglet RH « Pointage mobile » (QR code, code, telephones), page mobile au format telephone (connexion,
 * pointage par code saisi, liste du jour) ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const URL = 'http://localhost:8080/prestige';
const API = URL + '/api/v1/mobile/';
const APPAREIL = 'e2e-mobile-appareil', APPAREIL2 = 'e2e-mobile-page';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const PARAMS = ['KEY_MOBILE_ACTIF', 'KEY_RH_MOBILE_POINTAGE', 'KEY_RH_MOBILE_QR', 'KEY_RH_MOBILE_GPS', 'KEY_RH_MOBILE_LATITUDE', 'KEY_RH_MOBILE_LONGITUDE', 'KEY_RH_MOBILE_RAYON_M'];
const avant = {};
PARAMS.forEach((k) => { avant[k] = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + k + "'"); });
const param = (k, v) => exec("UPDATE t_parameters SET str_VALUE = '" + v + "' WHERE str_KEY = '" + k + "'");
const cleAvant = q("SELECT COUNT(*) FROM t_mobile_cle");

function nettoyer() {
  exec("DELETE FROM t_pointage WHERE employe_id IN (SELECT id FROM t_employe WHERE matricule = 'E2E-MOB');"
    + "DELETE FROM t_employe WHERE matricule = 'E2E-MOB';"
    + "DELETE FROM t_mobile_terminal WHERE appareil IN ('" + APPAREIL + "', '" + APPAREIL2 + "');");
}
async function appel(chemin, o) {
  o = o || {};
  const h = Object.assign({}, o.headers || {});
  if (o.jeton) { h.Authorization = 'Bearer ' + o.jeton; }
  let body = o.body;
  if (o.json !== undefined) { h['Content-Type'] = 'application/json'; body = JSON.stringify(o.json); }
  const r = await fetch(API + chemin, { method: o.method || 'GET', headers: h, body });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch (e) { /* */ }
  return { statut: r.status, j: j || {}, t };
}

(async () => {
  nettoyer();
  const famille = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND int_CIP REGEXP '^[0-9]{7}$' ORDER BY lg_FAMILLE_ID LIMIT 1");
  const cip = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + famille + "'");
  const imagesAvant = q("SELECT IFNULL(GROUP_CONCAT(lg_ID), '') FROM t_famille_image WHERE lg_FAMILLE_ID = '" + famille + "'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const err = [];
  try {
    PARAMS.forEach((k) => param(k, { KEY_MOBILE_ACTIF: '1', KEY_RH_MOBILE_POINTAGE: '1', KEY_RH_MOBILE_QR: '1', KEY_RH_MOBILE_GPS: '0', KEY_RH_MOBILE_LATITUDE: '', KEY_RH_MOBILE_LONGITUDE: '', KEY_RH_MOBILE_RAYON_M: '150' }[k]));

    /* ------------------------------------------------ connexion et jeton */
    let r = await appel('connexion', { method: 'POST', json: { login: 'admin', motDePasse: 'faux', appareil: APPAREIL } });
    ok('Connexion : mauvais mot de passe refusé', r.j.success === false && !r.j.jeton, r.t);
    r = await appel('connexion', { method: 'POST', json: { login: 'admin', motDePasse: 'e2etest' } });
    ok('Connexion : appareil obligatoire', r.j.success === false, r.t);
    r = await appel('connexion', { method: 'POST', json: { login: 'admin', motDePasse: 'e2etest', appareil: APPAREIL, nomAppareil: 'Téléphone essai' } });
    const jeton = r.j.jeton;
    ok('Connexion : jeton signé délivré, téléphone enregistré', r.j.success === true && /^[\w-]+\.[\w-]+$/.test(jeton || '')
      && q("SELECT CONCAT(statut, '|', nom) FROM t_mobile_terminal WHERE appareil = '" + APPAREIL + "' AND lg_USER_ID = '" + ADMIN + "'") === 'ACTIF|Téléphone essai', r.t.replace(jeton, '<jeton>'));
    ok('Le jeton ne contient pas le mot de passe', !Buffer.from(jeton.split('.')[0], 'base64').toString().includes('e2etest'));
    ok('Clé de signature hors de t_parameters', q("SELECT COUNT(*) FROM t_parameters WHERE str_VALUE = (SELECT valeur FROM t_mobile_cle WHERE id = 'JETON')") === '0');

    r = await appel('moi');
    ok('Sans jeton : 401', r.statut === 401 && r.j.expire === true, r.statut + ' ' + r.t);
    const [c64, s64] = jeton.split('.');
    const contenu = Buffer.from(c64, 'base64url').toString().split('|');
    const falsifie = Buffer.from(contenu[0] + '|00|' + contenu[2]).toString('base64url') + '.' + s64;
    r = await appel('moi', { jeton: falsifie });
    ok('Jeton falsifié (autre utilisateur) : 401', r.statut === 401, r.statut);
    r = await appel('moi', { headers: { 'X-User-Info': JSON.stringify({ id: ADMIN }), 'X-Token-Exp': '2099-01-01T00:00:00Z', 'X-client': 'mobile' } });
    ok('Anciens en-têtes X-User-Info refusés sur v1/mobile', r.statut === 401, r.statut);
    const ancien = await fetch(URL + '/api/v1/recap/dashboardmob?dtStart=2026-10-01&dtEnd=2026-10-06', { headers: { 'X-User-Info': JSON.stringify({ id: ADMIN }), 'X-Token-Exp': '2099-01-01T00:00:00Z', 'X-client': 'mobile' } });
    ok('Chemin mobile existant inchangé (v1/recap/dashboardmob répond)', ancien.status !== 401 && ancien.status < 500, ancien.status);
    r = await appel('moi', { jeton });
    ok('Avec le jeton : profil, droit photos, pas de pointage sans employé', r.j.success === true && r.j.droits.photos === true
      && r.j.droits.pointage === false && r.j.employe === null, r.t);

    /* ------------------------------------------------ pointage */
    r = await appel('pointages', { method: 'POST', jeton, json: { sens: 'ENTREE' } });
    ok('Pointage refusé sans employé rattaché', r.j.success === false && /rattach/.test(r.j.message), r.t);
    exec("INSERT INTO t_employe (id, matricule, nom, prenoms, statut, lg_USER_ID, created_at) VALUES (UUID(), 'E2E-MOB', 'ZZMOBILE', 'Essai', 'ACTIF', '" + ADMIN + "', NOW())");
    r = await appel('moi', { jeton });
    ok('Employé rattaché : pointage autorisé, QR exigé', r.j.droits.pointage === true && r.j.pointage.qr === true && r.j.employe.matricule === 'E2E-MOB', r.t);
    r = await appel('pointages', { method: 'POST', jeton, json: { sens: 'ENTREE' } });
    ok('QR exigé : sans code refusé', r.j.success === false && /QR/.test(r.j.message), r.t);
    r = await appel('pointages', { method: 'POST', jeton, json: { sens: 'ENTREE', code: 'AAAAAA' } });
    ok('QR exigé : code faux refusé', r.j.success === false, r.t);

    /* le code du moment, tel que l'ecran RH l'affiche (session de l'administrateur) */
    const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push('RH: ' + e.message));
    await p.goto(URL + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    const code = async () => p.evaluate(async () => JSON.parse(await (await fetch('../api/v1/rh/mobile/code')).text()));
    let c = await code();
    ok('Écran RH : code de pointage (6 caractères) et contenu du QR', c.success && /^[A-Z2-9]{6}$/.test(c.code) && c.contenu === 'PRESTIGE-POINTAGE:' + c.code, JSON.stringify(c));

    param('KEY_RH_MOBILE_GPS', '1'); param('KEY_RH_MOBILE_LATITUDE', '5.3200000'); param('KEY_RH_MOBILE_LONGITUDE', '-4.0200000');
    r = await appel('pointages', { method: 'POST', jeton, json: { sens: 'ENTREE', code: c.code } });
    ok('GPS exigé : sans position refusé', r.j.success === false && /localisation/.test(r.j.message), r.t);
    r = await appel('pointages', { method: 'POST', jeton, json: { sens: 'ENTREE', code: c.code, latitude: 5.33, longitude: -4.02, precision: 10 } });
    ok('GPS exigé : à 1,1 km refusé avec la distance', r.j.success === false && /1112 m|111\d m/.test(r.j.message), r.t);
    r = await appel('pointages', { method: 'POST', jeton, json: { sens: 'ENTREE', code: c.code, latitude: 5.3205, longitude: -4.02, precision: 12 } });
    ok('Pointage accepté (code du moment, à 56 m)', r.j.success === true && r.j.sens === 'ENTREE', r.t);
    const ligne = q("SELECT CONCAT(sens, '|', source, '|', terminal, '|', saisi_par, '|', ROUND(latitude, 4), '|', precision_m) FROM t_pointage p JOIN t_employe e ON e.id = p.employe_id WHERE e.matricule = 'E2E-MOB'");
    ok('Ligne en base : ENTREE, source MOBILE, téléphone, position', ligne === 'ENTREE|MOBILE|Téléphone essai|' + ADMIN + '|5.3205|12', ligne);
    r = await appel('pointages', { method: 'POST', jeton, json: { code: c.code, latitude: 5.3205, longitude: -4.02 } });
    ok('Double appui (< 2 min) refusé', r.j.success === false && /deux minutes/.test(r.j.message), r.t);
    param('KEY_RH_MOBILE_GPS', '0');
    /* sens deduit : apres l'entree, la sortie (le pointage precedent est recule de 3 minutes pour l'essai) */
    exec("UPDATE t_pointage p JOIN t_employe e ON e.id = p.employe_id SET p.horodatage = p.horodatage - INTERVAL 3 MINUTE WHERE e.matricule = 'E2E-MOB'");
    c = await code();
    r = await appel('pointages', { method: 'POST', jeton, json: { code: 'prestige-pointage:' + c.code.toLowerCase() } });
    ok('Sens non choisi : sortie déduite après l\'entrée (QR lu avec son préfixe)', r.j.success === true && r.j.sens === 'SORTIE', r.t);
    r = await appel('pointages', { jeton });
    ok('Pointages du jour sur le téléphone', (r.j.data || []).map((x) => x.sens).join(',') === 'ENTREE,SORTIE', r.t);

    /* ------------------------------------------------ photos */
    r = await appel('produits?q=' + encodeURIComponent(cip), { jeton });
    ok('Recherche produit par CIP', (r.j.data || [])[0] && r.j.data[0].id === famille, r.t.slice(0, 200));
    r = await appel('produits?q=' + encodeURIComponent("%'\"<b>"), { jeton });
    ok('Recherche avec caractères spéciaux : pas d\'erreur', r.statut === 200 && r.j.success === true, r.statut + ' ' + r.t.slice(0, 100));
    /* PNG 1x1 */
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const fd = new FormData(); fd.append('principale', 'false'); fd.append('fichier', new Blob([png], { type: 'image/png' }), 'photo.png');
    r = await appel('produits/' + famille + '/images', { method: 'POST', jeton, body: fd });
    const nouvelles = q("SELECT IFNULL(GROUP_CONCAT(lg_ID), '') FROM t_famille_image WHERE lg_FAMILLE_ID = '" + famille + "'" + (imagesAvant ? " AND lg_ID NOT IN ('" + imagesAvant.split(',').join("','") + "')" : ''));
    ok('Photo envoyée depuis le téléphone : image du produit en base', r.j.success === true && !!nouvelles, r.t);
    const faux = new FormData(); faux.append('fichier', new Blob([Buffer.from('pas une image')], { type: 'image/png' }), 'x.png');
    r = await appel('produits/' + famille + '/images', { method: 'POST', jeton, body: faux });
    ok('Fichier qui n\'est pas une image refusé', r.j.success === false, r.t);
    for (const id of (nouvelles || '').split(',').filter(Boolean)) {
      await p.evaluate(async ([f, i]) => fetch('../api/v1/produit-images/' + f + '/' + i, { method: 'DELETE' }), [famille, id]);
    }
    ok('Photo d\'essai retirée', q("SELECT COUNT(*) FROM t_famille_image WHERE lg_FAMILLE_ID = '" + famille + "'") === String(imagesAvant ? imagesAvant.split(',').length : 0));

    /* ------------------------------------------------ ecran RH : onglet Pointage mobile */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('rhmanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('rhmanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.setActiveTab(r.down('#ongletMobile')); });
    await p.waitForFunction(() => { const z = Ext.ComponentQuery.query('rhmanager #zoneQr')[0]; return z && z.getEl().down('svg'); }, null, { timeout: 20000 });
    await p.waitForTimeout(1200);
    const ecran = await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; const z = r.down('#zoneQr').getEl().dom;
      const g = r.down('#grilleTerminaux'); return { code: (z.querySelector('.rh-qr-code') || {}).textContent, svg: !!z.querySelector('svg rect, svg path'),
        tel: g.getStore().findBy((x) => x.get('appareil') === 'Téléphone essai') >= 0 }; });
    ok('Onglet « Pointage mobile » : QR code, code lisible, téléphone listé', ecran.svg && /^[A-Z2-9]{6}$/.test(ecran.code || '') && ecran.tel, JSON.stringify(ecran));
    await p.screenshot({ path: (process.env.SORTIE || '/tmp') + '/mobile-rh.png' });

    /* retirer / reactiver le telephone depuis l'ecran */
    const tid = q("SELECT id FROM t_mobile_terminal WHERE appareil = '" + APPAREIL + "'");
    const bouton = async (cls) => { await p.click('#' + (await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #grilleTerminaux')[0].getId())) + ' tr:has-text("Téléphone essai") .' + cls); await p.waitForTimeout(1500); };
    await bouton('rh-bouton-retirer');
    ok('Bouton « Retirer » à l\'écran : téléphone retiré', q("SELECT statut FROM t_mobile_terminal WHERE id = '" + tid + "'") === 'REVOQUE'
      && await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #grilleTerminaux')[0].getEl().dom.textContent.includes('retiré')));
    r = await appel('moi', { jeton });
    ok('Téléphone retiré : jeton refusé', r.statut === 401, r.statut);
    r = await appel('connexion', { method: 'POST', json: { login: 'admin', motDePasse: 'e2etest', appareil: APPAREIL } });
    ok('Téléphone retiré : reconnexion refusée', r.j.success === false && /retiré/.test(r.j.message), r.t);
    await bouton('rh-bouton-reactiver');
    r = await appel('moi', { jeton });
    ok('Téléphone réactivé : jeton accepté', r.statut === 200 && r.j.success === true, r.statut);

    /* ------------------------------------------------ page mobile, format telephone */
    const tel = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const m = await tel.newPage();
    m.on('pageerror', (e) => err.push('mobile: ' + e.message));
    await m.addInitScript((a) => { try { localStorage.setItem('prestigeMobileAppareil', a); } catch (e) { /* */ } }, APPAREIL2);
    await m.goto(URL + '/mobile/index.html', { waitUntil: 'domcontentloaded' });
    await m.waitForSelector('#vConnexion:not([hidden])');
    await m.fill('[name=login]', 'admin'); await m.fill('[name=motDePasse]', 'e2etest'); await m.click('#fConnexion button');
    await m.waitForSelector('#vAccueil:not([hidden])', { timeout: 15000 });
    await m.waitForFunction(() => document.querySelectorAll('#lPointages li:not(.vide)').length > 0, null, { timeout: 10000 }).catch(() => {});
    const accueil = await m.evaluate(() => ({ qui: document.getElementById('qui').textContent, pointage: !document.getElementById('cPointage').hidden,
      photos: !document.getElementById('cPhotos').hidden, n: document.querySelectorAll('#lPointages li:not(.vide)').length,
      large: document.documentElement.scrollWidth <= window.innerWidth }));
    ok('Page mobile : connexion, pointage et photos proposés, pointages du jour, pas de défilement horizontal', accueil.pointage && accueil.photos && accueil.n === 2 && accueil.large && accueil.qui.length > 0, JSON.stringify(accueil));
    exec("UPDATE t_pointage p JOIN t_employe e ON e.id = p.employe_id SET p.horodatage = p.horodatage - INTERVAL 3 MINUTE WHERE e.matricule = 'E2E-MOB'");
    await m.click('[data-sens=ENTREE]');
    await m.waitForSelector('#vScan:not([hidden])');
    await m.fill('#fCode [name=code]', 'ZZZZZZ'); await m.click('#fCode button');
    await m.waitForFunction(() => !document.getElementById('message').hidden && document.getElementById('message').className === 'erreur', null, { timeout: 10000 });
    const msgFaux = await m.textContent('#message');
    const resteSurScan = await m.isVisible('#vScan');
    c = await code();
    await m.evaluate(() => { document.getElementById('message').hidden = true; });
    await m.fill('#fCode [name=code]', c.code); await m.click('#fCode button');
    await m.waitForFunction(() => !document.getElementById('message').hidden && document.getElementById('message').className === 'ok', null, { timeout: 10000 });
    await m.waitForTimeout(800);
    const apres = await m.evaluate(() => ({ msg: document.getElementById('message').textContent, n: document.querySelectorAll('#lPointages li:not(.vide)').length, accueil: !document.getElementById('vAccueil').hidden }));
    ok('Page mobile : code faux refusé, code du moment accepté, liste à jour', resteSurScan && /invalide/.test(msgFaux) && /Entrée enregistrée/.test(apres.msg) && apres.n === 3 && apres.accueil, msgFaux + ' / ' + JSON.stringify(apres));
    await m.screenshot({ path: (process.env.SORTIE || '/tmp') + '/mobile-page.png' });
    await m.fill('#rProduit', cip);
    await m.waitForSelector('#lProduits li.produit', { timeout: 10000 });
    await m.click('#lProduits li.produit');
    const vuePhoto = await m.evaluate(() => ({ titre: document.getElementById('tPhoto').textContent, envoyer: document.getElementById('btnEnvoyer').disabled }));
    ok('Page mobile : produit trouvé, écran photo (envoi bloqué tant qu\'aucune photo)', vuePhoto.titre.length > 0 && vuePhoto.envoyer === true, JSON.stringify(vuePhoto));
    await m.click('#btnAnnulerPhoto');

    /* deconnecter tous les telephones */
    await p.evaluate(async () => fetch('../api/v1/rh/mobile/deconnecter-tous', { method: 'POST' }));
    r = await appel('moi', { jeton });
    ok('« Déconnecter tous les téléphones » : ancien jeton refusé', r.statut === 401, r.statut);
    await m.reload(); await m.waitForSelector('#vConnexion:not([hidden])', { timeout: 10000 });
    ok('Page mobile : retour à la connexion', true);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    PARAMS.forEach((k) => param(k, avant[k]));
    ok('Jeu d\'essai retiré (employé, pointages, téléphones, paramètres)', q("SELECT COUNT(*) FROM t_employe WHERE matricule = 'E2E-MOB'") === '0'
      && q("SELECT COUNT(*) FROM t_mobile_terminal WHERE appareil IN ('" + APPAREIL + "', '" + APPAREIL2 + "')") === '0', cleAvant);
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
