/* CACHET / SIGNATURE des factures du createur de modeles (besoins du 11/10, point 4). Par l'ecran :
 *  - un modele dynamique d'essai est cree et rattache, le temps du test, au tiers payant d'une facture du banc ;
 *  - sans cachet : la facture porte « LE PHARMACIEN » ;
 *  - cachet commun envoye depuis le panneau (PNG) : apercu affiche, la facture porte l'image et plus le texte ;
 *  - cachet propre au modele (autre image) : il prime ; retire, le cachet commun revient ;
 *  - un fichier qui n'est pas une image (renomme en .png) est refuse, rien n'est enregistre ;
 *  - sans le droit du createur de modeles, l'API refuse l'envoi ; aucune fenetre.
 * Tout ce qui est pose est retire : modele, rattachement du tiers payant, cachets (un cachet commun deja en place est
 * sauvegarde et remis).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const NOM = 'ZZ E2E CACHET';
const [FACTURE, TP] = q('SELECT CONCAT_WS(\'|\', f.lg_FACTURE_ID, f.str_CUSTOMER) FROM t_facture f JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = f.str_CUSTOMER LIMIT 1').split('|');
const MODELE_TP = q(`SELECT lg_MODEL_FACTURE_ID FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '${TP}'`);
const droit = privilegeEssai(q, exec, 'admin', 'P_SM_MODEL_FACTURE_DYNAMIQUE');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cachet-'));

/* PNG RVB uni de l x h (sans dependance) */
function png(l, h, rgb) {
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const bloc = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(l, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const ligne = Buffer.concat([Buffer.from([0]), Buffer.from(Array(l).fill(rgb).flat())]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bloc('IHDR', ihdr),
    bloc('IDAT', zlib.deflateSync(Buffer.concat(Array(h).fill(ligne)))), bloc('IEND', Buffer.alloc(0))]);
}
const COMMUN = path.join(dir, 'cachet-commun.png'), PROPRE = path.join(dir, 'cachet-modele.png'), FAUX = path.join(dir, 'pas-une-image.png');
fs.writeFileSync(COMMUN, png(120, 60, [200, 30, 40]));
fs.writeFileSync(PROPRE, png(90, 90, [20, 60, 200]));
fs.writeFileSync(FAUX, 'ceci est un texte, pas une image');

/* le droit du createur de modeles est donne a admin le temps du test s'il ne l'a pas (banc) */
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = 'admin' LIMIT 1");
const PRIV = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_SM_MODEL_FACTURE_DYNAMIQUE'");
const DROIT_AJOUTE = 'E2E-CACHET-DROIT';

(async () => {
  droit.remettre();
  exec(`DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '${DROIT_AJOUTE}';`
    + `INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) SELECT '${DROIT_AJOUTE}', '${ROLE}', '${PRIV}', NOW(), NOW()`
    + ` FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege WHERE lg_ROLE_ID = '${ROLE}' AND lg_PRIVILEGE_ID = '${PRIV}')`);
  exec("DROP TABLE IF EXISTS zz_e2e_cachet; CREATE TABLE zz_e2e_cachet AS SELECT * FROM t_cachet_facture WHERE cible = 'COMMUN'; DELETE FROM t_cachet_facture WHERE cible = 'COMMUN';");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const dialogues = [];
  let modele = null;
  try {
    const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    const form = (url, o) => p.evaluate(async ([u, d]) => (await (await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(d).toString() })).json()), [url, o]);
    const API = '../api/v1/model-facture-dynamique/';
    /* modele pose en base, comme un modele existant de l'officine (sur ce banc, l'enregistrement par l'ecran echoue
       avant ce point : generateur d'identifiants d'EclipseLink sur le pilote MariaDB, sans rapport avec le cachet) */
    exec("INSERT INTO model_facture_dynamique (str_NOM, str_DESCRIPTION, str_MODE_TRI, str_STATUT, dt_CREATED, dt_UPDATED, b_AFFICHER_ENTETE,"
      + ` b_AFFICHER_PIED_PAGE, b_DETAILLER_PRODUITS, int_TAILLE_POLICE, int_NB_BONS_PAR_PAGE) VALUES ('${NOM}', 'essai', 'ALPHABETIQUE', 'enable', NOW(), NOW(), 1, 1, 0, 8, 0)`);
    modele = q(`SELECT id FROM model_facture_dynamique WHERE str_NOM = '${NOM}'`);
    exec(`INSERT INTO model_facture_dynamique_colonne (model_id, str_CHAMP, str_LIBELLE, int_ORDRE, str_NIVEAU) VALUES (${modele}, 'NOM_COMPLET', 'Nom', 1, 'BON');`
      + "INSERT INTO t_model_facture (lg_MODEL_FACTURE_ID, str_VALUE, str_DESCRIPTION, str_STATUT, dt_CREATED, dt_UPDATED, model_facture_dynamique_id, nomFichier, nomFichierRemiseTierspayant)"
      + ` SELECT CAST(MAX(CAST(lg_MODEL_FACTURE_ID AS UNSIGNED)) + 1 AS CHAR), 'DYN${modele}', 'Modèle dynamique : ${NOM}', 'enable', NOW(), NOW(), ${modele}, '', '' FROM t_model_facture`);
    const ra = await form(API + 'assigner', { lg_TIERS_PAYANT_ID: TP, modelId: modele });
    ok('Modèle d\'essai créé et rattaché au tiers payant de la facture', modele && ra.success === '1', JSON.stringify(ra));

    const facture = async () => {
      const b64 = await p.evaluate(async (u) => { const r = await fetch(u); return btoa(String.fromCharCode(...new Uint8Array(await r.arrayBuffer()))); }, API + 'pdf/' + FACTURE);
      const f = path.join(dir, 'f.pdf'); fs.writeFileSync(f, Buffer.from(b64, 'base64'));
      const texte = execFileSync('pdftotext', [f, '-'], { encoding: 'utf8' });
      const images = execFileSync('pdfimages', ['-list', f], { encoding: 'utf8' }).split('\n').slice(2).filter(Boolean).map((l) => l.trim().split(/\s+/).slice(3, 5).join('x'));
      return { texte, images };
    };
    let f = await facture();
    const base = f.images.length;
    ok('Sans cachet : la facture porte « LE PHARMACIEN »', /LE PHARMACIEN/.test(f.texte), f.images.join(','));

    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('modelfacturedynamique', 'Modèles de facture', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('modelfacturedynamique #panneauCachet').length > 0
      && Ext.ComponentQuery.query('modelfacturedynamique #grilleModeles')[0].getStore().getCount() > 0, null, { timeout: 60000 });
    const fichier = async (chemin) => { const id = await p.evaluate(() => Ext.ComponentQuery.query('modelfacturedynamique #fichierCachet')[0].fileInputEl.id);
      await p.setInputFiles('#' + id, chemin); };
    const enregistrer = async () => { await p.evaluate(() => Ext.ComponentQuery.query('modelfacturedynamique #enregistrerCachet')[0].getEl().dom.click()); await p.waitForTimeout(2500); };
    const etat = () => p.evaluate(() => Ext.ComponentQuery.query('modelfacturedynamique #etatCachet')[0].text || '');

    /* fichier refuse */
    await fichier(FAUX);
    await enregistrer();
    ok('Fichier qui n\'est pas une image : refusé, rien d\'enregistré', /PNG ou JPEG|illisible|acceptées/.test(await etat()) && q('SELECT COUNT(*) FROM t_cachet_facture') === '0', await etat());

    /* cachet commun */
    await fichier(COMMUN);
    await enregistrer();
    const apercu = await p.evaluate(() => { const i = document.querySelector('.apercu-cachet'); return i ? { l: i.naturalWidth, h: i.naturalHeight } : null; });
    ok('Cachet commun enregistré depuis le panneau, aperçu affiché', q("SELECT COUNT(*) FROM t_cachet_facture WHERE cible = 'COMMUN'") === '1' && apercu && apercu.l === 120,
      (await etat()) + ' ' + JSON.stringify(apercu));
    f = await facture();
    ok('Facture : l\'image du cachet commun à la place de « LE PHARMACIEN »', !/LE PHARMACIEN/.test(f.texte) && f.images.length === base + 1 && f.images.indexOf('120x60') >= 0, f.images.join(','));

    /* cachet propre au modele */
    await p.evaluate((nom) => { const g = Ext.ComponentQuery.query('modelfacturedynamique #grilleModeles')[0]; const r = g.getStore().findRecord('nom', nom); g.getSelectionModel().select(r); }, NOM);
    await p.waitForTimeout(1000);
    await p.evaluate(() => { Ext.ComponentQuery.query('modelfacturedynamique #cibleCachet')[0].setValue({ cibleCachet: 'modele' }); });
    await fichier(PROPRE);
    await enregistrer();
    f = await facture();
    ok('Cachet propre au modèle : il prime sur le commun', q(`SELECT COUNT(*) FROM t_cachet_facture WHERE cible = 'MODELE-${modele}'`) === '1'
      && f.images.indexOf('90x90') >= 0 && f.images.indexOf('120x60') < 0, f.images.join(','));
    await p.evaluate(() => Ext.ComponentQuery.query('modelfacturedynamique #supprimerCachet')[0].getEl().dom.click());
    await p.waitForTimeout(2000);
    f = await facture();
    ok('Cachet du modèle retiré : le cachet commun revient', f.images.indexOf('120x60') >= 0 && f.images.indexOf('90x90') < 0, f.images.join(','));
    const msgModele = await p.evaluate(() => Ext.ComponentQuery.query('modelfacturedynamique #apercuCachet')[0].getEl().dom.textContent);
    ok('Panneau : indique que le cachet commun s\'applique à ce modèle', /cachet commun est imprimé/.test(msgModele), msgModele.slice(0, 100));
    ok('Aucune fenêtre', dialogues.length === 0, dialogues.join(' | '));

    /* sans le droit */
    droit.retirer();
    const p2 = await (await b.newContext()).newPage();
    await p2.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p2.fill('#str_login', 'admin'); await p2.fill('#str_password', 'e2etest'); await p2.click('#login');
    await p2.waitForURL('**/general/**', { timeout: 60000 });
    const refus = await p2.evaluate(async (d) => (await (await fetch('../api/v1/model-facture-dynamique/cachet', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cible: 'commun', donnees: d }) })).json()), fs.readFileSync(COMMUN).toString('base64'));
    ok('Sans le droit du créateur de modèles : envoi refusé par le serveur', refus.success === false && /droit/.test(refus.msg), JSON.stringify(refus));
  } finally {
    droit.remettre();
    exec(`DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '${DROIT_AJOUTE}'`);
    exec(`UPDATE t_tiers_payant SET lg_MODEL_FACTURE_ID = '${MODELE_TP}' WHERE lg_TIERS_PAYANT_ID = '${TP}';`
      + "DELETE FROM t_cachet_facture WHERE cible = 'COMMUN' OR cible LIKE 'MODELE-%' AND created_at >= NOW() - INTERVAL 1 HOUR;"
      + 'INSERT INTO t_cachet_facture SELECT * FROM zz_e2e_cachet; DROP TABLE zz_e2e_cachet;'
      + (modele ? `DELETE FROM t_model_facture WHERE model_facture_dynamique_id = ${modele}; DELETE FROM model_facture_dynamique_colonne WHERE model_id = ${modele}; DELETE FROM model_facture_dynamique WHERE id = ${modele};` : ''));
    await b.close();
    fs.rmSync(dir, { recursive: true, force: true });
    ok('Données retirées (modèle, rattachement, cachets)', q(`SELECT COUNT(*) FROM model_facture_dynamique WHERE str_NOM = '${NOM}'`) === '0'
      && q(`SELECT lg_MODEL_FACTURE_ID FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '${TP}'`) === MODELE_TP);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
