/* PHARMAML 3.0.0.0 AVEC LES REGLAGES DE DPCI ET TEDIS PHARMA (retours du 07/10).
 * Les serveurs reels ne sont pas joignables depuis le banc : la commande part vers un faux grossiste local, avec les
 * VRAIS reglages de chaque grossiste (codes, identifiants) ; seule l'adresse est detournee pendant le test.
 *  - enveloppe SRP 3.0.0.0 ; EMETTEUR Id_Officine = identifiant de l'officine chez le grossiste ; RECEPTEUR Code et
 *    Id_Repartiteur du grossiste ; memes lignes ; reponse traitee (success) ;
 *  - serveur injoignable (port ferme) : message clair « ne répond pas … n'a pas été envoyée », en moins de
 *    25 s, plus de blocage ; adresse inconnue : « adresse introuvable » ;
 *  - adresse de secours (DPCI) : principale injoignable -> commande envoyee par le secours ; principale qui REPOND
 *    (403) -> pas de second envoi ; les deux injoignables -> message citant les deux ; fiche grossiste : champ
 *    « Lien PharmaML de secours » rempli, adresse invalide refusee (ecran et serveur) ;
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
const recus = [], entetes = [];
const REFUS_DPCI = require('fs').readFileSync(require('path').join(__dirname, '../../resources/pharmaml/R_DPCI_refus_v3.xml'), 'utf8');
const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  recus.push(b); entetes.push(req.headers['content-pharmaml'] || null);
  if (/refus/.test(req.url)) { rep.writeHead(403, { 'Content-Type': 'text/html' }); rep.end('<html>Forbidden</html>'); return; }
  const v3 = /<SRP_ENVELOPPE/.test(b);
  /* comme le vrai serveur DPCI (reponse du 07/10) : enveloppe 3.0.0.0 refusee, 1.0.0.0 acceptee */
  /* reponse sans aucune ligne (comme le fichier R_ du 07/10 en 1.0.0.0) */
  if (/vide/.test(req.url)) { rep.writeHead(200, { 'Content-Type': 'text/xml' }); rep.end('<?xml version="1.0" encoding="UTF-8"?><ns2:CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:message" xmlns:ns2="urn:x-csrp:fr.csrp.protocole:enveloppe"><ns2:CORPS><MESSAGE_REPARTITEUR><CORPS/></MESSAGE_REPARTITEUR></ns2:CORPS></ns2:CSRP_ENVELOPPE>'); return; }
  if (/dpci-v1-seulement/.test(req.url) && v3) { rep.writeHead(200, { 'Content-Type': 'text/xml' }); rep.end(REFUS_DPCI); return; }
  const lignes = [...b.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
  const corps = lignes.map((m) => '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + Number(m[2]) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/></LIGNE_N>').join('');
  const ns = v3 ? 'urn:x-srp:fr.srp.protocole' : 'urn:x-csrp:fr.csrp.protocole', env = v3 ? 'SRP_ENVELOPPE' : 'CSRP_ENVELOPPE';
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  rep.end('<?xml version="1.0" encoding="UTF-8"?><' + env + ' xmlns="' + ns + ':enveloppe" Version_Protocole="' + (v3 ? '3.0.0.0' : '1.0.0.0') + '"><CORPS><MESSAGE_REPARTITEUR xmlns="' + ns + ':message"><CORPS><REP_COMMANDE><NORMALE>' + corps + '</NORMALE></REP_COMMANDE></CORPS></MESSAGE_REPARTITEUR></CORPS></' + env + '>');
}); });
let P = [];
const sauves = {};
function nettoyer() {
  exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference = '" + CMD + "'); DELETE FROM rupture WHERE reference = '" + CMD + "';"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'; DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';"
    + "DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + CMD + "';");
}
function poser(G) {
  nettoyer();
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + CMD + "', '" + CMD + "', 2, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
  P.forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + CMD + "-" + i + "', '" + CMD + "', '" + p + "', '" + G + "', " + (i + 2) + ", 0, 1000, 2000, 'is_Process', NOW(), NOW())"));
}
const secours = (G, u) => exec("UPDATE t_grossiste SET str_URL_PHARMAML_SECOURS = " + (u === null ? 'NULL' : "'" + u + "'") + " WHERE lg_GROSSISTE_ID = '" + G + "'");
const url = (G, u) => exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (u === null ? 'NULL' : "'" + u + "'") + " WHERE lg_GROSSISTE_ID = '" + G + "'");

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  for (const [n, G] of Object.entries(GROSSISTES)) {
    const v = q("SELECT CONCAT_WS('|', IFNULL(str_URL_PHARMAML, 'NULL'), str_CODE_RECEPTEUR_PHARMA, str_ID_RECEPTEUR_PHARMA, idrepartiteur, str_PHARMAML_VERSION_CMDE, IFNULL(str_URL_PHARMAML_SECOURS, 'NULL')) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'").split('|');
    sauves[n] = { url: v[0] === 'NULL' ? null : v[0], code: v[1], id: v[2], rep: v[3], version: v[4], secours: v[5] === 'NULL' ? null : v[5] };
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
      exec("UPDATE t_grossiste SET str_PHARMAML_VERSION_CMDE = '3.0.0.0' WHERE lg_GROSSISTE_ID = '" + G + "'");
      secours(G, null);
      url(G, 'http://127.0.0.1:' + PORT + '/PharmaML/');
      poser(G);
      recus.length = 0; entetes.length = 0;
      const e = await envoyer();
      const x = recus[0] || '';
      const att = (bal, a) => ((x.match(new RegExp('<' + bal + ' [^>]*' + a + '="([^"]*)"')) || [])[1]);
      ok(n + ' : SRP 3.0.0.0, émetteur Id_Officine = ' + s.id + ', récepteur Code ' + s.code + ' / Id_Repartiteur ' + s.rep,
        /<SRP_ENVELOPPE[^>]*Version_Protocole="3\.0\.0\.0"/.test(x) && att('EMETTEUR', 'Id_Officine') === s.id && att('RECEPTEUR', 'Code') === s.code && att('RECEPTEUR', 'Id_Repartiteur') === s.rep
        && att('DESTINATAIRE', 'Id_Repartiteur') === s.rep, x.slice(0, 600));
      const cle = q("SELECT IFNULL(str_CLE_RECEPTEUR, '') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'");
      /* specification Pharma-ML v4.8 § 4.4.3 : MD5(corps + identifiant officine sur 16 car. completes de « 0 » + cle) */
      const attendu = require('crypto').createHash('md5').update(Buffer.from(x, 'utf8')).update(s.id.padEnd(16, '0') + cle).digest('base64');
      ok(n + ' : en-tête Content-PharmaML = calcul de la spécification (MD5 corps + identifiant + clé)', cle !== '' && entetes[0] === attendu, entetes[0] + ' / ' + attendu);
      ok(n + ' : 2 lignes envoyées, réponse traitée', (x.match(/<LIGNE_N /g) || []).length === 2 && /"success":true/.test(e.r), e.r);
      /* serveur injoignable : port ferme */
      url(G, 'http://127.0.0.1:1/PharmaML/');
      poser(G);
      const k = await envoyer();
      const j = JSON.parse(k.r);
      ok(n + ' : serveur injoignable → message clair en moins de 25 s', j.success === false && /ne répond pas/.test(j.msg) && /n'a pas été envoyée/.test(j.msg) && k.ms < 25000, k.ms + ' ms ' + k.r);
    }
    /* ---- vraie reponse de DPCI a une commande 3.0.0.0 (07/10) : refus, puis acceptee en 1.0.0.0 */
    {
      const D = GROSSISTES.DPCI;
      url(D, 'http://127.0.0.1:' + PORT + '/dpci-v1-seulement/'); secours(D, null);
      const avant = () => q("SELECT CONCAT(int_PRICE, '|', str_STATUT, '|', (SELECT COUNT(*) FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'), '|', (SELECT COUNT(*) FROM rupture WHERE reference = '" + CMD + "')) FROM t_order WHERE lg_ORDER_ID = '" + CMD + "'");
      poser(D); const etat0 = avant();
      const r3 = JSON.parse((await envoyer()).r);
      ok('DPCI en 3.0.0.0 : refus du grossiste affiché (plus de faux « succès »), conseil de passer en 1.0.0.0', r3.success === false && /DPCI a refusé la commande/.test(r3.msg)
        && /CSRP enveloppe invalide/.test(r3.msg) && /réglez « PharmaML : commande » sur 1\.0\.0\.0/.test(r3.msg), JSON.stringify(r3));
      ok('DPCI en 3.0.0.0 : commande intacte (montant, statut, lignes, aucune rupture)', avant() === etat0, etat0 + ' / ' + avant());
      exec("UPDATE t_grossiste SET str_PHARMAML_VERSION_CMDE = '1.0.0.0' WHERE lg_GROSSISTE_ID = '" + D + "'");
      poser(D); recus.length = 0;
      const r1 = JSON.parse((await envoyer()).r);
      url(D, 'http://127.0.0.1:' + PORT + '/vide/');
      poser(D); const etatV = avant();
      const rv = JSON.parse((await envoyer()).r);
      exec("UPDATE t_grossiste SET str_PHARMAML_VERSION_CMDE = '3.0.0.0' WHERE lg_GROSSISTE_ID = '" + D + "'");
      ok('Réponse sans aucune ligne : signalée (plus de faux « succès »), commande intacte', rv.success === false && /sans aucune ligne/.test(rv.msg) && avant() === etatV, JSON.stringify(rv));
      ok('DPCI en 1.0.0.0 : enveloppe CSRP acceptée, commande traitée', r1.success === true && /<(?:\w+:)?CSRP_ENVELOPPE[^>]*Version_Protocole="1\.0\.0\.0"/.test(recus[0] || '') && r1.nbreproduit === 2, JSON.stringify(r1));
    }
    /* ---- adresse de secours (DPCI) */
    const D = GROSSISTES.DPCI;
    url(D, 'http://127.0.0.1:1/PharmaML/'); secours(D, 'http://127.0.0.1:' + PORT + '/secours/');
    poser(D); recus.length = 0;
    const s1 = JSON.parse((await envoyer()).r);
    ok('Secours : principale injoignable → commande envoyée par l\'adresse de secours et traitée', s1.success === true && recus.length === 1, JSON.stringify(s1));
    url(D, 'http://127.0.0.1:' + PORT + '/refus/');
    poser(D); recus.length = 0;
    const s2 = JSON.parse((await envoyer()).r);
    ok('Secours : principale qui répond (403) → pas de second envoi', s2.success === false && /HTTP 403/.test(s2.msg) && recus.length === 1, recus.length + ' ' + JSON.stringify(s2));
    url(D, 'http://127.0.0.1:1/PharmaML/'); secours(D, 'http://127.0.0.1:2/PharmaML/');
    poser(D);
    const s3 = JSON.parse((await envoyer()).r);
    ok('Secours : les deux injoignables → message citant les deux adresses', s3.success === false && /ne répond pas/.test(s3.msg) && /adresse de secours http:\/\/127\.0\.0\.1:2/.test(s3.msg), JSON.stringify(s3));
    /* API de la fiche : adresse invalide refusee, vide = retiree */
    const api = (u) => p.evaluate(async (a) => (await fetch('../api/v1/grossistes/pharmaml-version', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ lg_GROSSISTE_ID: a.g, versionInfo: '3.0.0.0', versionCommande: '3.0.0.0', urlSecours: a.u }).toString() })).text(), { g: D, u });
    const a1 = JSON.parse(await api('ftp://x'));
    const a2 = JSON.parse(await api('javascript:alert(1)'));
    ok('Fiche (serveur) : adresse de secours invalide refusée', a1.success === false && a2.success === false && /http:\/\//.test(a1.msg), JSON.stringify([a1, a2]));
    const a3 = JSON.parse(await api('  http://dpciml.dpci.ci/PharmaML/  '));
    ok('Fiche (serveur) : adresse valide enregistrée sans espaces', a3.success === true && q("SELECT str_URL_PHARMAML_SECOURS FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + D + "'") === 'http://dpciml.dpci.ci/PharmaML/', JSON.stringify(a3));
    /* Ecran : fiche grossiste en modification (version commande mise a 1.0.0.0 pour verifier qu'elle est bien lue) */
    exec("UPDATE t_grossiste SET str_PHARMAML_VERSION_CMDE = '1.0.0.0' WHERE lg_GROSSISTE_ID = '" + D + "'");
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('grossistemanager', 'Grossistes', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; return g && g.getStore && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.evaluate((D) => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; const st = g.getStore(); let i = st.findExact('lg_GROSSISTE_ID', D);
      if (i < 0) { st.getProxy().extraParams.search_value = 'DPCI'; } }, D);
    await p.waitForTimeout(500);
    const ouvert = await p.evaluate((D) => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; const st = g.getStore(); const i = st.findExact('lg_GROSSISTE_ID', D);
      if (i < 0) { return 'absent'; } g.onEditClick(g, i); return 'ok'; }, D);
    await p.waitForFunction(() => Ext.getCmp('str_URL_PHARMAML_SECOURS') && Ext.getCmp('str_URL_PHARMAML_SECOURS').rendered, null, { timeout: 20000 });
    await p.waitForTimeout(500);
    const ecran = await p.evaluate(() => { const c = Ext.getCmp('str_URL_PHARMAML_SECOURS'); const v = c.getValue(); const lab = c.labelEl ? c.labelEl.dom : null;
      c.setValue('ftp://x'); const inval = !c.isValid(); c.setValue(v);
      const box = c.getEl().dom.getBoundingClientRect(), corps = c.up('window').body.dom.getBoundingClientRect();
      const visible = box.bottom <= corps.bottom + 1 && box.right <= corps.right + 1 && box.width > 150;
      return { v, visible, cmde: Ext.getCmp('str_PHARMAML_VERSION_CMDE').getValue(), actif: !c.isDisabled(), inval, valide: c.isValid(), tronque: lab ? lab.scrollWidth > lab.clientWidth + 1 : true }; });
    exec("UPDATE t_grossiste SET str_PHARMAML_VERSION_CMDE = '3.0.0.0' WHERE lg_GROSSISTE_ID = '" + D + "'");
    ok('Fiche (écran) : la version réellement réglée est affichée (1.0.0.0), plus de retour forcé à 3.0.0.0', ecran.cmde === '1.0.0.0', JSON.stringify(ecran));
    ok('Fiche (écran) : champ « Lien PharmaML de secours » visible sans défiler, rempli, modifiable, adresse invalide signalée, libellé entier', ouvert === 'ok' && ecran.v === 'http://dpciml.dpci.ci/PharmaML/' && ecran.visible && ecran.actif && ecran.inval && ecran.valide && !ecran.tronque, ouvert + ' ' + JSON.stringify(ecran));
    await p.screenshot({ path: (process.env.SORTIE || '/tmp') + '/grossiste-url-secours.png' });
    await p.evaluate(() => { const w = Ext.getCmp('str_URL_PHARMAML_SECOURS').up('window'); if (w) { w.close(); } });
    url(GROSSISTES.TEDIS, 'http://127.0.0.1:' + PORT + '/refus/');
    poser(GROSSISTES.TEDIS);
    const r403 = JSON.parse((await envoyer()).r);
    ok('Grossiste qui refuse (HTTP 403) → message avec le code et la réponse archivée', r403.success === false && /a répondu HTTP 403/.test(r403.msg) && /accès refusé/.test(r403.msg) && /R_LOG_/.test(r403.msg), JSON.stringify(r403));
    secours(GROSSISTES.DPCI, null);
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
    for (const [n, G] of Object.entries(GROSSISTES)) {
      url(G, sauves[n].url); secours(G, sauves[n].secours);
      exec("UPDATE t_grossiste SET str_PHARMAML_VERSION_CMDE = '" + sauves[n].version + "' WHERE lg_GROSSISTE_ID = '" + G + "'");
    }
    ok('Commandes d\'essai retirées, adresses remises', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + CMD + "'") === '0'
      && q("SELECT IFNULL(str_URL_PHARMAML, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + GROSSISTES.DPCI + "'") === (sauves.DPCI.url || 'NULL')
      && q("SELECT IFNULL(str_URL_PHARMAML_SECOURS, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + GROSSISTES.DPCI + "'") === (sauves.DPCI.secours || 'NULL'));
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
