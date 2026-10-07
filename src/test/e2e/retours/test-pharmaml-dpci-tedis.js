/* PHARMAML 3.0.0.0 AVEC LES REGLAGES DE DPCI ET TEDIS PHARMA (retours du 07/10).
 * Les serveurs reels ne sont pas joignables depuis le banc : la commande part vers un faux grossiste local, avec les
 * VRAIS reglages de chaque grossiste (codes, identifiants) ; seule l'adresse est detournee pendant le test.
 *  - enveloppe SRP 3.0.0.0 ; EMETTEUR Id_Officine = identifiant de l'officine chez le grossiste ; RECEPTEUR Code et
 *    Id_Repartiteur du grossiste ; memes lignes ; reponse traitee (success) ;
 *  - serveur injoignable (port ferme) : message clair « ne répond pas … n'a pas été envoyée », en moins de
 *    25 s, plus de blocage ; adresse inconnue : « adresse introuvable » ;
 *  - commandes d'essai retirees, adresses des grossistes remises.
 */
const { execFileSync } = require('child_process');
const http = require('http');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const PORT = 18767, CMD = 'E2E-PM2-CMD';
const GROSSISTES = { DPCI: '51217123242587374880', TEDIS: '51217123531215794892' };
const recus = [];
const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  recus.push(b);
  if (/refus/.test(req.url)) { rep.writeHead(403, { 'Content-Type': 'text/html' }); rep.end('<html>Forbidden</html>'); return; }
  const lignes = [...b.matchAll(/<LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
  const corps = lignes.map((m) => '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + Number(m[2]) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/></LIGNE_N>').join('');
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  rep.end('<?xml version="1.0" encoding="UTF-8"?><SRP_ENVELOPPE xmlns="urn:x-srp:fr.srp.protocole:enveloppe" Version_Protocole="3.0.0.0"><CORPS><MESSAGE_REPARTITEUR xmlns="urn:x-srp:fr.srp.protocole:message"><CORPS><REP_COMMANDE><NORMALE>' + corps + '</NORMALE></REP_COMMANDE></CORPS></MESSAGE_REPARTITEUR></CORPS></SRP_ENVELOPPE>');
}); });
let P = [];
const sauves = {};
function nettoyer() {
  exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference = '" + CMD + "'); DELETE FROM rupture WHERE reference = '" + CMD + "';"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'; DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';");
}
function poser(G) {
  nettoyer();
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + CMD + "', '" + CMD + "', 2, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
  P.forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + CMD + "-" + i + "', '" + CMD + "', '" + p + "', '" + G + "', " + (i + 2) + ", 0, 1000, 2000, 'is_Process', NOW(), NOW())"));
}
const url = (G, u) => exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (u === null ? 'NULL' : "'" + u + "'") + " WHERE lg_GROSSISTE_ID = '" + G + "'");

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  for (const [n, G] of Object.entries(GROSSISTES)) {
    const v = q("SELECT CONCAT_WS('|', IFNULL(str_URL_PHARMAML, 'NULL'), str_CODE_RECEPTEUR_PHARMA, str_ID_RECEPTEUR_PHARMA, idrepartiteur, str_PHARMAML_VERSION_CMDE) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'").split('|');
    sauves[n] = { url: v[0] === 'NULL' ? null : v[0], code: v[1], id: v[2], rep: v[3], version: v[4] };
  }
  P = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, str_NAME FROM t_famille WHERE str_STATUT='enable' AND int_CIP REGEXP '^[0-9]{7}$' ORDER BY str_NAME LIMIT 2) x").split('|');
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  const envoyer = () => p.evaluate(async (id) => { const t0 = Date.now(); const r = await (await fetch('../api/v1/pharma/' + id, { method: 'PUT' })).text(); return { r, ms: Date.now() - t0 }; }, CMD);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    for (const [n, G] of Object.entries(GROSSISTES)) {
      const s = sauves[n];
      ok(n + ' : version de commande réglée sur 3.0.0.0', s.version === '3.0.0.0', s.version);
      url(G, 'http://127.0.0.1:' + PORT + '/PharmaML/');
      poser(G);
      recus.length = 0;
      const e = await envoyer();
      const x = recus[0] || '';
      const att = (bal, a) => ((x.match(new RegExp('<' + bal + ' [^>]*' + a + '="([^"]*)"')) || [])[1]);
      ok(n + ' : SRP 3.0.0.0, émetteur Id_Officine = ' + s.id + ', récepteur Code ' + s.code + ' / Id_Repartiteur ' + s.rep,
        /<SRP_ENVELOPPE[^>]*Version_Protocole="3\.0\.0\.0"/.test(x) && att('EMETTEUR', 'Id_Officine') === s.id && att('RECEPTEUR', 'Code') === s.code && att('RECEPTEUR', 'Id_Repartiteur') === s.rep
        && att('DESTINATAIRE', 'Id_Repartiteur') === s.rep, x.slice(0, 600));
      ok(n + ' : 2 lignes envoyées, réponse traitée', (x.match(/<LIGNE_N /g) || []).length === 2 && /"success":true/.test(e.r), e.r);
      /* serveur injoignable : port ferme */
      url(G, 'http://127.0.0.1:1/PharmaML/');
      poser(G);
      const k = await envoyer();
      const j = JSON.parse(k.r);
      ok(n + ' : serveur injoignable → message clair en moins de 25 s', j.success === false && /ne répond pas/.test(j.msg) && /n'a pas été envoyée/.test(j.msg) && k.ms < 25000, k.ms + ' ms ' + k.r);
    }
    url(GROSSISTES.TEDIS, 'http://127.0.0.1:' + PORT + '/refus/');
    poser(GROSSISTES.TEDIS);
    const r403 = JSON.parse((await envoyer()).r);
    ok('Grossiste qui refuse (HTTP 403) → message avec le code et la réponse archivée', r403.success === false && /a répondu HTTP 403/.test(r403.msg) && /accès refusé/.test(r403.msg) && /R_LOG_/.test(r403.msg), JSON.stringify(r403));
    url(GROSSISTES.DPCI, 'http://grossiste-inexistant.invalid/PharmaML/');
    poser(GROSSISTES.DPCI);
    const u = JSON.parse((await envoyer()).r);
    ok('Adresse inconnue → « adresse introuvable »', u.success === false && /adresse introuvable/.test(u.msg), JSON.stringify(u));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    for (const [n, G] of Object.entries(GROSSISTES)) { url(G, sauves[n].url); }
    ok('Commandes d\'essai retirées, adresses remises', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + CMD + "'") === '0'
      && q("SELECT IFNULL(str_URL_PHARMAML, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + GROSSISTES.DPCI + "'") === 'http://dpciml.resocerp.net/PharmaML/');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
