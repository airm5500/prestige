/* ENVOI DE COMMANDE PHARMAML EN 3.0.0.0 (plan d'octobre 1.2, decision Q-B) : aucune regression par rapport a 1.0.0.0.
 *
 * Un faux grossiste (serveur HTTP local) repond a la commande : produit 1 livre en entier (prix achat 1500, vente
 * 2500), produit 2 non livre (indisponible). La MEME commande est envoyee deux fois par le vrai service (PUT
 * v1/pharma/{id}) : une fois avec le grossiste regle en 1.0.0.0, une fois en 3.0.0.0, la reponse etant rendue dans
 * l'enveloppe de la version. Le test compare tout ce que le traitement ecrit : resultat rendu, montant de la commande,
 * lignes (quantites, prix), ruptures creees. Il verifie aussi le message envoye : CSRP 1.0.0.0 puis SRP 3.0.0.0, memes
 * codes et memes quantites. Tout est retire a la fin, le grossiste est remis.
 */
const { execFileSync } = require('child_process');
const http = require('http');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const PORT = 18766, CMD = 'E2E-PMC-CMD';
let G, sauve, P = [];
const recus = [];

const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  recus.push(b);
  const v3 = /<SRP_ENVELOPPE/.test(b);
  const ns = v3 ? 'urn:x-srp:fr.srp.protocole' : 'urn:x-csrp:fr.csrp.protocole', env = v3 ? 'SRP_ENVELOPPE' : 'CSRP_ENVELOPPE';
  const lignes = [...b.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)];
  const corps = lignes.map((m, i) => i === 0
    ? '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="' + Number(m[2]) + '"><PRIX_N Nature="PHAHT" Valeur="1500"/><PRIX_N Nature="PUBTC" Valeur="2500"/></LIGNE_N>'
    : '<LIGNE_N Code_Produit="' + m[1] + '" Quantite_livree="0"><PRIX_N Nature="PHAHT" Valeur="900"/><PRIX_N Nature="PUBTC" Valeur="1400"/><INDISPONIBILITE_N Code_Reponse="2" Additif="PAS EN STOCK"/></LIGNE_N>').join('');
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  rep.end('<?xml version="1.0" encoding="UTF-8"?><' + env + ' xmlns="' + ns + ':enveloppe" Version_Protocole="' + (v3 ? '3.0.0.0' : '1.0.0.0') + '"><CORPS><MESSAGE_REPARTITEUR xmlns="' + ns + ':message"><CORPS><REP_COMMANDE><NORMALE>' + corps + '</NORMALE></REP_COMMANDE></CORPS></MESSAGE_REPARTITEUR></CORPS></' + env + '>');
}); });

function nettoyerCommande() {
  exec("DELETE FROM rupture_detail WHERE ruptureId IN (SELECT id FROM rupture WHERE reference = '" + CMD + "'); DELETE FROM rupture WHERE reference = '" + CMD + "';"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'; DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';"
    + "DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + CMD + "'; DELETE FROM t_pharmaml_reponse_ligne WHERE lg_SOURCE_ID = '" + CMD + "' OR lg_ORDER_ID = '" + CMD + "';");
}
function poserCommande() {
  nettoyerCommande();
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + CMD + "', '" + CMD + "', 2, '" + G + "', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'is_Process', NOW(), NOW(), 0, 0, 0)");
  P.forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + CMD + "-" + i + "', '" + CMD + "', '" + p + "', '" + G + "', " + (i + 2) + ", 0, 1000, 2000, 'is_Process', NOW(), NOW())"));
}
function etat() {
  return {
    commande: q("SELECT CONCAT(int_PRICE, '|', str_STATUT) FROM t_order WHERE lg_ORDER_ID = '" + CMD + "'"),
    lignes: q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_NUMBER, ':', IFNULL(int_QTE_REP_GROSSISTE, ''), ':', IFNULL(prixAchat, ''), ':', IFNULL(prixUnitaire, ''), ':', int_PRICE, ':', int_PAF_DETAIL, ':', int_PRICE_DETAIL) ORDER BY lg_FAMILLE_ID) FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'"),
    ruptures: q("SELECT GROUP_CONCAT(CONCAT(d.produitId, ':', d.qty) ORDER BY d.produitId) FROM rupture r JOIN rupture_detail d ON d.ruptureId = r.id WHERE r.reference = '" + CMD + "'")
  };
}

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
  sauve = q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', str_PHARMAML_VERSION_CMDE) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'").split('|');
  P = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID ORDER BY str_NAME SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID, str_NAME FROM t_famille WHERE str_STATUT='enable' AND int_CIP REGEXP '^[0-9]{7}$' ORDER BY str_NAME LIMIT 2) x").split('|');
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  const resultats = {};
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    for (const v of ['1.0.0.0', '3.0.0.0']) {
      exec("UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:" + PORT + "/', str_PHARMAML_VERSION_CMDE = '" + v + "' WHERE lg_GROSSISTE_ID = '" + G + "'");
      poserCommande();
      recus.length = 0;
      const rep = await p.evaluate(async (id) => (await fetch('../api/v1/pharma/' + id, { method: 'PUT' })).text(), CMD);
      resultats[v] = { rep, etat: etat(), xml: recus[0] || '' };
    }
    const a = resultats['1.0.0.0'], c = resultats['3.0.0.0'];
    ok('1.0.0.0 : enveloppe CSRP 1.0.0.0 envoyée', /<(?:\w+:)?CSRP_ENVELOPPE[^>]*Version_Protocole="1\.0\.0\.0"/.test(a.xml), a.xml.slice(0, 200));
    ok('3.0.0.0 : enveloppe SRP 3.0.0.0, Id_Moteur PRESTIGE, COMMANDE', /<SRP_ENVELOPPE[^>]*Version_Protocole="3\.0\.0\.0"[^>]*Id_Moteur="PRESTIGE"/.test(c.xml) && /<COMMANDE /.test(c.xml), c.xml.slice(0, 300));
    const codes = (x) => [...x.matchAll(/<(?:\w+:)?LIGNE_N [^>]*Code_Produit="([^"]*)"[^>]*Quantite="(\d+)"/g)].map((m) => m[1] + 'x' + Number(m[2])).join(',');
    ok('Mêmes produits et mêmes quantités envoyés dans les deux versions', codes(a.xml) && codes(a.xml) === codes(c.xml), codes(a.xml) + ' / ' + codes(c.xml));
    ok('Même résultat rendu', a.rep === c.rep && /"success":true/.test(a.rep), a.rep + ' / ' + c.rep);
    ok('Même commande, mêmes lignes, mêmes ruptures en base', JSON.stringify(a.etat) === JSON.stringify(c.etat) && a.etat.ruptures, JSON.stringify(a.etat) + ' // ' + JSON.stringify(c.etat));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    serveur.close();
    nettoyerCommande();
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (sauve[0] === 'NULL' ? 'NULL' : "'" + sauve[0] + "'") + ", str_PHARMAML_VERSION_CMDE = '" + sauve[1] + "' WHERE lg_GROSSISTE_ID = '" + G + "'");
    ok('Jeu d\'essai retiré, grossiste remis', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + CMD + "'") === '0' && q("SELECT COUNT(*) FROM rupture WHERE reference = '" + CMD + "'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
