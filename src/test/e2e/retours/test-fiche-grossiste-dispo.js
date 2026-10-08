/* FICHE ARTICLE > GERER GROSSISTE : VERIFIER LA DISPONIBILITE (retours du 08/10 (9)). Faux grossiste local :
 *  - l'icone de la ligne interroge vraiment le grossiste (REQ_INFO_PRODUIT avec le code article chez lui, sinon CIP) ;
 *  - message complet, non tronque : produit, grossiste, statut, motif, date de mise a disposition, remplacant, prix ;
 *  - disponible / non disponible ; grossiste sans lien PharmaML : message clair ;
 *  - le resultat est garde dans l'historique de disponibilite (source FICHE) ;
 *  - aucune erreur JavaScript ; tout est retire a la fin.
 */
const { execFileSync } = require('child_process');
const http = require('http');
const archives = require('./archives-pharmaml');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const PORT = 18778, G = '51217123531215794892', FG = 'E2E-FGD-1';
let P = '', cip = '', nom = '', sauve = null, mode = 'non';
const recus = [];
const debutMs = Date.now();
const fsA = require('fs'), pathA = require('path');

const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  recus.push(b);
  const l = [...b.matchAll(/<LIGNE_REQ_INFO_PRODUIT Num_Ligne="(\d+)"[^>]*Code_Produit="([^"]*)"/g)];
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  rep.end('<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>E2E</REF_MESSAGE></ENTETE><CORPS>'
    + '<MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS><REP_INFO_PRODUIT>' + l.map((m) => '<LIGNE_REP_INFO_PRODUIT Num_Ligne="' + m[1] + '" Code_Produit="' + m[2] + '"'
      + (mode === 'non' ? ' Disponibilite="Non"><INDISPONIBILITE Code_Reponse="0004" Additif="Manque fabricant"><INFO_DISPO Date_Mise_Dispo="2026-10-20" Quantite_Dispo="12"/>'
        + '<PRODUIT_REMPLACANT Type_Remplacement="EP" Code_Produit="1234567" Designation="GENERIQUE E2E"/></INDISPONIBILITE></LIGNE_REP_INFO_PRODUIT>'
        : ' Nature="PHAHT" Valeur="1040" Code_Reponse="0000" Libelle="Produit disponible"/>')).join('')
    + '</REP_INFO_PRODUIT></CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>');
}); });

function nettoyer() {
  archives.retirer(/E2E-FGD/);
  exec("DELETE FROM t_disponibilite_produit WHERE str_SOURCE = 'FICHE' AND lg_GROSSISTE_ID = '" + G + "'" + (P ? " AND lg_FAMILLE_ID = '" + P + "'" : '') + ";"
    + "DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_GROSSISTE_ID = '" + FG + "';");
}

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  sauve = q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', int_PHARMAML_DISPO, '|', str_PHARMAML_VERSION_INFO) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'").split('|');
  /* produit visible dans la liste des articles (ligne de stock de l'emplacement principal) */
  [P, cip, nom] = q("SELECT CONCAT(f.lg_FAMILLE_ID, '|', f.int_CIP, '|', f.str_NAME) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1"
    + " AND NOT EXISTS (SELECT 1 FROM t_famille_grossiste fg WHERE fg.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND fg.lg_GROSSISTE_ID = '" + G + "') ORDER BY f.str_NAME LIMIT 1").split('|');
  nettoyer();
  exec("INSERT INTO t_famille_grossiste (lg_FAMILLE_GROSSISTE_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, str_CODE_ARTICLE, int_PRICE, int_PAF, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + FG + "', '" + G + "', '" + P + "', 'ART-E2E-77', 2000, 1000, 'enable', NOW(), NOW())");
  exec("UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:" + PORT + "/pml/', int_PHARMAML_DISPO = 1, str_PHARMAML_VERSION_INFO = '1.0.0.0' WHERE lg_GROSSISTE_ID = '" + G + "'");
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const verifier = async () => {
    recus.length = 0;
    await p.evaluate((fg) => { const g = Ext.getCmp('gridpanelGrossisteID'); const st = g.getStore(); const i = st.findExact('lg_FAMILLE_GROSSISTE_ID', fg);
      const n = g.getView().getNode(st.getAt(i)); const icones = n.querySelectorAll('.x-action-col-icon'); icones[icones.length - 1].id = 'e2e-verif-dispo'; }, FG);
    await p.click('#e2e-verif-dispo');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Information seulement|impossible|lien PharmaML|désactivée/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 60000 });
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const box = Ext.MessageBox, m = box.msg.getEl().dom, corps = box.body ? box.body.dom : m.parentNode, vp = Ext.getBody().getViewSize();
      return { texte: m.textContent, statut: (m.querySelector('.dispo-fiche-statut') || {}).textContent || '', coupe: corps.scrollHeight > corps.clientHeight + 2 || m.scrollWidth > m.clientWidth + 2,
        dedans: box.getX() >= 0 && box.getX() + box.getWidth() <= vp.width && box.getY() + box.getHeight() <= vp.height }; });
    await p.screenshot({ path: SORTIE + '/fiche-grossiste-dispo-' + mode + '.png' });
    await p.evaluate(() => Ext.MessageBox.hide());
    return r;
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Fiche Article', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.evaluate((c) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.fmField('rechecher').setValue(c); g.onRechClick(); }, cip);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', id) >= 0; }, P, { timeout: 30000 });
    await p.evaluate((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onAddGrossisteClick(g, g.getStore().findExact('lg_FAMILLE_ID', id)); }, P);
    await p.waitForFunction((fg) => { const g = Ext.getCmp('gridpanelGrossisteID'); return g && g.rendered && !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_GROSSISTE_ID', fg) >= 0; }, FG, { timeout: 30000 });
    await p.waitForTimeout(500);

    const non = await verifier();
    ok('Interrogation réelle du grossiste : REQ_INFO_PRODUIT avec le code article chez lui', recus.length === 1 && /REQ_INFO_PRODUIT/.test(recus[0]) && /Code_Produit="ART-E2E-77"/.test(recus[0]) && !/<COMMANDE[ >]/.test(recus[0]), recus.length);
    ok('Non disponible : produit, grossiste, statut, motif, date et quantité, remplaçant', non.statut === 'Non disponible' && non.texte.includes(nom) && /TEDIS/.test(non.texte)
      && /Manque fabricant/.test(non.texte) && /2026-10-20 \(12\)/.test(non.texte) && /GENERIQUE E2E \(1234567\)/.test(non.texte), non.texte);
    ok('Message entier (ni tronqué ni hors de l\'écran)', !non.coupe && non.dedans, JSON.stringify(non));
    ok('Résultat gardé dans l\'historique de disponibilité (source FICHE)', q("SELECT CONCAT(str_STATUT, '|', str_CODE_ENVOYE) FROM t_disponibilite_produit WHERE str_SOURCE = 'FICHE' AND lg_FAMILLE_ID = '" + P + "' ORDER BY dt_CREATED DESC LIMIT 1") === 'NON|ART-E2E-77');

    mode = 'oui';
    const oui = await verifier();
    ok('Disponible : statut et prix annoncé', oui.statut === 'Disponible' && /Prix d'achat annoncé : 1.040/.test(oui.texte) && !oui.coupe, oui.texte);

    exec("UPDATE t_grossiste SET str_URL_PHARMAML = NULL WHERE lg_GROSSISTE_ID = '" + G + "'");
    mode = 'sans';
    const sans = await verifier();
    ok('Grossiste sans lien PharmaML : message clair, rien envoyé', /n'a pas de lien PharmaML/.test(sans.texte) && recus.length === 0 && !sans.coupe, sans.texte);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    /* archives de disponibilite de l'essai (I_ / RI_ de ce grossiste ecrites pendant le test) */
    archives.fichiers().filter((f) => /^infoproduit\/.*_TEDISPHARMA\.xml$/.test(f) && fsA.statSync(pathA.join(archives.DOSSIER, f)).mtimeMs >= debutMs)
      .forEach((f) => fsA.unlinkSync(pathA.join(archives.DOSSIER, f)));
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (sauve[0] === 'NULL' ? 'NULL' : "'" + sauve[0] + "'") + ", int_PHARMAML_DISPO = " + sauve[1] + ", str_PHARMAML_VERSION_INFO = '" + sauve[2] + "' WHERE lg_GROSSISTE_ID = '" + G + "'");
    ok('Données d\'essai retirées, grossiste remis', q("SELECT COUNT(*) FROM t_famille_grossiste WHERE lg_FAMILLE_GROSSISTE_ID = '" + FG + "'") === '0'
      && q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', int_PHARMAML_DISPO, '|', str_PHARMAML_VERSION_INFO) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'") === sauve.join('|'));
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
