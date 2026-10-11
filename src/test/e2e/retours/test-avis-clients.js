/* AVIS CLIENTS (retours du 11/10) - chemin reel :
 *  - Reglages (ecran) : adresse IP publique, port public, limite ; nouveau QR code ; affiche A4 dont le QR est relu ;
 *  - page publique sur le PORT PUBLIC, dans un navigateur de telephone : note, criteres, ressenti, employe, coordonnees,
 *    remerciement ; lien invalide ; robot ignore ; limite d'envois ; saisies piegees (SQL, script, formule tableur)
 *    nettoyees, jamais executees ; tout le reste du serveur ferme sur ce port ;
 *  - ecran Avis : nouveaux, filtres (note, statut, contient, mot cle, theme, employe, reponse attendue), tri par note,
 *    detail (marque lu), traitement, reponse WhatsApp (simulee sur le banc), impression PDF, export Excel ;
 *  - Analyse : synthese, alertes, employe rapproche malgre les variantes, mots cles, clic -> liste filtree, PDF ;
 *  - droits : sans P_AVIS_REPONDRE, lecture seule et refus serveur ; sans P_AVIS_REGLAGES, onglet masque.
 * Avis, messages WhatsApp et reglages d'essai retires / remis a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const privilegeEssai = require('../support/privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN'], { input: s, encoding: 'utf8' }).trim();
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const PORT = 8090, PUBLIC = 'http://127.0.0.1:' + PORT;
const CLES = ['KEY_AVIS_ADRESSE_PUBLIQUE', 'KEY_AVIS_PORT_PUBLIC', 'KEY_AVIS_JETON', 'KEY_AVIS_ACTIF', 'KEY_AVIS_MAX_HEURE', 'KEY_AVIS_ADRESSE_AFFICHEE'];
const origine = {};
CLES.forEach((k) => { origine[k] = q("SELECT IFNULL(str_VALUE, '') FROM t_parameters WHERE str_KEY = '" + k + "'"); });
const repondre = privilegeEssai(q, q, 'admin', 'P_AVIS_REPONDRE');
const reglages = privilegeEssai(q, q, 'admin', 'P_AVIS_REGLAGES');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-avis-'));

function nettoyer() {
  q("DELETE FROM t_avis_client WHERE dt_CREATED >= '" + DEBUT + "';"
    + "DELETE FROM whatsapp_message WHERE created_at >= '" + DEBUT + "' AND notification_id IS NULL AND client_id IS NULL;");
  CLES.forEach((k) => q("UPDATE t_parameters SET str_VALUE = '" + origine[k].replace(/'/g, "''") + "' WHERE str_KEY = '" + k + "'"));
}
const decoder = (fichierPng) => execFileSync('python3', ['-I', '-c',
  "import sys,zxingcpp\nfrom PIL import Image\nr=zxingcpp.read_barcodes(Image.open(sys.argv[1]))\nprint('\\n'.join(x.text for x in r))", fichierPng], { encoding: 'utf8' }).trim();
const texteXls = (f) => execFileSync('python3', ['-I', '-c', "import sys,xlrd;s=xlrd.open_workbook(sys.argv[1]).sheet_by_index(0);print('\\n'.join('\\t'.join(str(c.value) for c in s.row(r)) for r in range(s.nrows)))", f], { encoding: 'utf8' });

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  p.on('dialog', (d) => { err.push('DIALOGUE ' + d.message()); d.dismiss(); });
  const tel = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const errTel = [];
  const api = (m, u, c) => p.evaluate(([m, u, c]) => new Promise((ok2) => Ext.Ajax.request({ url: u, method: m, jsonData: c || undefined,
    success: (r) => { try { ok2(JSON.parse(r.responseText)); } catch (e) { ok2({ brut: r.responseText }); } }, failure: (r) => ok2({ success: false, status: r.status }) })), [m, u, c]);
  const vue = (f, arg) => p.evaluate(f, arg);
  const attendre = () => p.waitForFunction(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; return v && v.getEl() && !v.getEl().isMasked() && !v.down('#grilleAvis').getStore().isLoading(); }, null, { timeout: 30000 });
  /* envoi direct a l'API publique (pour les cas limites), depuis le port public */
  const publier = async (corps) => {
    const r = await fetch(PUBLIC + '/prestige/api/v1/avis-public/envoyer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof corps === 'string' ? corps : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    return { statut: r.status, j };
  };
  try {
    repondre.remettre(); reglages.remettre();
    nettoyer();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });

    /* ---------------------------------------------------------------- menu et migration */
    ok('Migration : menu AVIS CLIENTS, 4 droits à l\'administrateur seulement', q("SELECT COUNT(*) FROM t_sous_menu WHERE str_COMPOSANT = 'avisclients'") === '1'
      && q("SELECT COUNT(DISTINCT rp.lg_ROLE_ID) FROM t_role_privelege rp JOIN t_privilege x ON x.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE x.str_NAME = 'P_AVIS_REPONDRE'") === '1');
    await vue(() => testextjs.app.getController('App').onLoadNewComponent('avisclients', 'Avis clients', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('avisclients')[0] && Ext.ComponentQuery.query('avisclients')[0].droits.success, null, { timeout: 30000 });
    await attendre();
    const onglets = await vue(() => Ext.ComponentQuery.query('avisclients')[0].items.getRange().map((t) => t.title + (t.tab.isVisible() ? '' : ' (masqué)')));
    ok('Écran : 3 onglets Avis / Analyse / Réglages et affiche', onglets.join('|') === 'Avis|Analyse|Réglages et affiche', onglets.join('|'));
    ok('Page non publiée : bandeau qui renvoie aux réglages', origine.KEY_AVIS_ADRESSE_PUBLIQUE !== '' || await vue(() => Ext.ComponentQuery.query('avisclients #bandeauPublication')[0].isVisible()));

    /* ---------------------------------------------------------------- reglages (ecran) */
    await vue(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; v.setActiveTab(v.down('#ongletReglages')); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('avisclients #rgPort')[0].getValue() > 0, null, { timeout: 30000 });
    const remplir = async (itemId, valeur) => {
      await vue((id) => Ext.ComponentQuery.query('avisclients #' + id)[0].inputEl.dom.setAttribute('data-e2e', id), itemId);
      await p.click('[data-e2e=' + itemId + ']'); await p.keyboard.press('Control+A'); await p.keyboard.type(String(valeur));
    };
    const cliquer = async (itemId) => {
      await vue((id) => Ext.ComponentQuery.query('avisclients #' + id)[0].btnEl.dom.setAttribute('data-e2e', id), itemId);
      await p.click('[data-e2e=' + itemId + ']');
    };
    await remplir('rgAdresse', '999.1.1.1'); await cliquer('rgEnregistrer');
    await p.waitForFunction(() => /invalide/.test(Ext.ComponentQuery.query('avisclients #rgEtat')[0].getEl().dom.textContent), null, { timeout: 15000 });
    ok('Réglages : adresse IP invalide refusée, message dans l\'écran (pas de fenêtre)', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_AVIS_ADRESSE_PUBLIQUE'") === origine.KEY_AVIS_ADRESSE_PUBLIQUE);
    await remplir('rgAdresse', '127.0.0.1'); await remplir('rgPort', PORT); await remplir('rgMax', 8);
    await cliquer('rgEnregistrer');
    await p.waitForFunction(() => /enregistrés/.test(Ext.ComponentQuery.query('avisclients #rgEtat')[0].getEl().dom.textContent), null, { timeout: 15000 });
    const lien1 = await vue(() => Ext.ComponentQuery.query('avisclients #rgLien')[0].getEl().dom.querySelector('.rg-lien').textContent);
    ok('Réglages enregistrés ; lien du QR = http://IP:port/prestige/avis/?t=jeton (jeton de 48 caractères tiré par Prestige)',
      /^http:\/\/127\.0\.0\.1:8090\/prestige\/avis\/\?t=[0-9a-f]{48}$/.test(lien1), lien1);
    /* nouveau QR : confirmation dans l'ecran */
    await cliquer('rgNouveauQr');
    ok('Nouveau QR : bandeau de confirmation (pas de fenêtre)', await vue(() => Ext.ComponentQuery.query('avisclients #rgConfirmation')[0].isVisible()));
    await cliquer('rgConfirmer');
    await p.waitForFunction(() => /Nouveau QR/.test(Ext.ComponentQuery.query('avisclients #rgEtat')[0].getEl().dom.textContent), null, { timeout: 15000 });
    const lien = await vue(() => Ext.ComponentQuery.query('avisclients #rgLien')[0].getEl().dom.querySelector('.rg-lien').textContent);
    const jeton = lien.split('?t=')[1];
    ok('Nouveau QR : nouveau jeton', jeton && lien !== lien1, lien);
    const ancien = await fetch(PUBLIC + '/prestige/api/v1/avis-public/contexte?t=' + lien1.split('?t=')[1]);
    ok('Ancien QR : refusé (403) après régénération', ancien.status === 403, ancien.status);
    /* affiche : PDF, QR relu */
    const aff = await p.evaluate(async () => { const r = await fetch('../api/v1/avis-clients/affiche?format=A4'); const a = new Uint8Array(await r.arrayBuffer()); return { t: r.headers.get('content-type'), b: Array.from(a) }; });
    fs.writeFileSync(path.join(TMP, 'affiche.pdf'), Buffer.from(aff.b));
    execFileSync('pdftoppm', ['-r', '200', '-png', '-singlefile', path.join(TMP, 'affiche.pdf'), path.join(TMP, 'affiche')]);
    const lu = decoder(path.join(TMP, 'affiche.png'));
    const txtAffiche = execFileSync('pdftotext', [path.join(TMP, 'affiche.pdf'), '-'], { encoding: 'utf8' });
    ok('Affiche A4 : PDF, le QR imprimé redonne exactement le lien', aff.t === 'application/pdf' && lu === lien, lu);
    ok('Affiche : nom de la pharmacie et invitation', /Votre avis nous intéresse/.test(txtAffiche) && txtAffiche.indexOf(q('SELECT str_NOM_COMPLET FROM t_officine LIMIT 1').toUpperCase()) >= 0, txtAffiche.slice(0, 200));
    fs.copyFileSync(path.join(TMP, 'affiche.png'), process.env.CAPTURE_AFFICHE || path.join(TMP, 'affiche-copie.png'));
    const a5 = await p.evaluate(async () => (await fetch('../api/v1/avis-clients/affiche?format=A5')).headers.get('content-type'));
    ok('Affiche A5 disponible', a5 === 'application/pdf');

    /* ---------------------------------------------------------------- port public : tout est ferme sauf la page d'avis */
    const statut = async (u, m) => (await fetch(PUBLIC + u, { method: m || 'GET', redirect: 'manual' })).status;
    const fermes = {};
    for (const u of ['/', '/prestige/', '/prestige/general/', '/prestige/security/index.jsp', '/prestige/api/v1/stock', '/prestige/api/v1/officine',
      '/prestige/api/v1/avis-clients/liste', '/prestige/api/v1/avis-clients/reglages', '/prestige/api/v1/espace-produit/recherche', '/prestige/webservices/sm_user/famille/ws_data.jsp']) {
      fermes[u] = await statut(u);
    }
    ok('Port public : écrans, API (y compris sans connexion) et JSP fermés (404)', Object.values(fermes).every((s) => s === 404), JSON.stringify(fermes));
    ok('Port public : GET sur « envoyer » et POST sur « contexte » refusés', await statut('/prestige/api/v1/avis-public/envoyer') === 404 && await statut('/prestige/api/v1/avis-public/contexte', 'POST') === 404);
    const pageRep = await fetch(PUBLIC + '/prestige/avis/?t=' + jeton);
    ok('Port public : page d\'avis servie avec CSP stricte, anti-iframe, nosniff', pageRep.status === 200 && /default-src 'none'/.test(pageRep.headers.get('content-security-policy'))
      && pageRep.headers.get('x-frame-options') === 'DENY' && pageRep.headers.get('x-content-type-options') === 'nosniff');
    ok('Port habituel (8080) : Prestige inchangé', (await fetch('http://localhost:8080/prestige/security/index.jsp')).status === 200);

    /* ---------------------------------------------------------------- page publique sur telephone */
    const t = await tel.newPage(); t.on('pageerror', (e) => errTel.push(String(e.message)));
    await t.goto(PUBLIC + '/prestige/avis/?t=faux');
    await t.waitForSelector('#etatLien:not([hidden])');
    ok('Téléphone : QR invalide → message clair, pas de formulaire', /plus valide/.test(await t.textContent('#etatTexte')) && await t.isHidden('#formulaire'));
    const donnerAvis = async (a) => {
      await t.goto(lien.replace('http://127.0.0.1:8090', PUBLIC));
      await t.waitForSelector('#formulaire:not([hidden])');
      const debut = Date.now();
      await t.tap('#etoiles button[data-note="' + a.note + '"]');
      for (const [c, n] of a.criteres || []) { for (let i = 0; i < n; i++) { await t.tap('[data-critere=' + c + ']'); } }
      if (a.texte) { await t.fill('#texte', a.texte); }
      if (a.employe) { await t.tap('label.bascule:has(#probleme)'); await t.fill('#employe', a.employe); }
      if (a.nom || a.tel) {
        await t.tap('.choix-deux label:nth-child(2)');
        if (a.nom) { await t.fill('#nom', a.nom); }
        if (a.tel) { await t.fill('#telephone', a.tel); }
        if (a.rappel) { await t.tap('label.bascule:has(#rappel)'); }
      }
      const reste = 2200 - (Date.now() - debut);
      if (reste > 0) { await t.waitForTimeout(reste); }
      await t.tap('#envoyer');
      await t.waitForSelector('#merci:not([hidden]), #erreur:not([hidden])', { timeout: 20000 });
      return t.isVisible('#merci');
    };
    const entete = await (async () => { await t.goto(lien); await t.waitForSelector('#formulaire:not([hidden])'); return { nom: await t.textContent('#pharmacie'), envoi: await t.isDisabled('#envoyer') }; })();
    ok('Téléphone : en-tête avec le nom de la pharmacie ; « Envoyer » grisé tant qu\'aucune étoile', entete.nom === q('SELECT str_NOM_COMPLET FROM t_officine LIMIT 1') && entete.envoi, JSON.stringify(entete));
    const a1 = await donnerAvis({ note: 1, criteres: [['ACCUEIL', 2], ['ATTENTE', 2]], texte: 'Caissière très impolie, attente de 30 minutes à la caisse.', employe: 'Mme Awa', nom: 'Kouassi A.', tel: '07 08 09 10 11', rappel: true });
    await t.screenshot({ path: path.join(TMP, 'merci.png') });
    ok('Téléphone : avis complet envoyé → écran de remerciement (réponse possible annoncée)', a1 && /pourra vous répondre/.test(await t.textContent('#merciTexte')));
    const a2 = await donnerAvis({ note: 2, criteres: [['ACCUEIL', 2]], texte: 'Awa m\'a mal parlé, accueil désagréable.', employe: 'awah' });
    const a3 = await donnerAvis({ note: 5, criteres: [['CONSEIL', 1], ['ACCUEIL', 1]], texte: 'Excellents conseils du pharmacien, accueil chaleureux.' });
    const a4 = await donnerAvis({ note: 4, criteres: [['CONSEIL', 1]], texte: 'Bons conseils, mais produit en rupture.' });
    ok('Téléphone : 4 avis envoyés par le formulaire', a1 && a2 && a3 && a4);
    const en = q("SELECT CONCAT_WS('|', note, criteres, employe, anonyme, nom, telephone, rappel, statut, empreinte IS NOT NULL) FROM t_avis_client WHERE dt_CREATED >= '" + DEBUT + "' AND note = 1");
    ok('Base : avis enregistré tel que saisi (critères, employé, coordonnées, rappel, statut NOUVEAU, empreinte et non adresse)',
      en === '1|ACCUEIL=MOINS,ATTENTE=MOINS|Mme Awa|0|Kouassi A.|07 08 09 10 11|1|NOUVEAU|1', en);
    ok('Base : avis sans coordonnées = anonyme', q("SELECT CONCAT_WS('|', anonyme, IFNULL(nom,'-'), rappel) FROM t_avis_client WHERE dt_CREATED >= '" + DEBUT + "' AND note = 5") === '1|-|0');

    /* ---------------------------------------------------------------- cas limites de l'API publique */
    const base = { jeton, note: 3, criteres: {}, duree: 5000, site: '', anonyme: true };
    let r = await publier(Object.assign({}, base, { jeton: 'x' }));
    ok('API publique : jeton faux → 403', r.statut === 403);
    r = await publier(Object.assign({}, base, { note: 9 }));
    ok('API publique : note hors 1..5 → 400 avec message', r.statut === 400 && /note/.test(r.j.message));
    r = await publier('{"jeton":');
    ok('API publique : JSON illisible → 400', r.statut === 400);
    r = await publier(JSON.stringify(Object.assign({}, base, { texte: 'x'.repeat(9000) })));
    ok('API publique : corps trop gros → 413', r.statut === 413);
    const avantRobot = q("SELECT COUNT(*) FROM t_avis_client WHERE dt_CREATED >= '" + DEBUT + "'");
    r = await publier(Object.assign({}, base, { site: 'http://spam.example', texte: 'ACHETEZ' }));
    const r2 = await publier(Object.assign({}, base, { duree: 200, texte: 'trop rapide' }));
    ok('API publique : robot (piège rempli, envoi en 0,2 s) → succès apparent, rien enregistré', r.statut === 200 && r.j.success && r2.statut === 200
      && q("SELECT COUNT(*) FROM t_avis_client WHERE dt_CREATED >= '" + DEBUT + "'") === avantRobot);
    const piege = { texte: "'; DROP TABLE t_avis_client; -- <script>window.__xss=1</script><img src=x onerror=\"window.__xss=2\"> =HYPERLINK(\"http://x\") ‮attente longue",
      employe: '=cmd|\' /C calc\'!A0', anonyme: false, nom: '<b>Robert\'); DELETE FROM t_user;--</b>', telephone: '0102030405', rappel: false };
    r = await publier(Object.assign({}, base, piege, { note: 2 }));
    const stocke = q("SELECT CONCAT_WS('|', texte, employe, nom) FROM t_avis_client WHERE dt_CREATED >= '" + DEBUT + "' AND telephone = '0102030405'");
    ok('API publique : saisie piégée acceptée mais nettoyée (balises et caractères invisibles retirés), tables intactes',
      r.statut === 200 && stocke.indexOf('<script') < 0 && stocke.indexOf('<img') < 0 && stocke.indexOf('‮') < 0 && stocke.indexOf("DROP TABLE t_avis_client") >= 0
      && q("SELECT COUNT(*) FROM t_user") !== '0' && q("SHOW TABLES LIKE 't_avis_client'") === 't_avis_client', stocke);
    /* limite d'envois : 8 par heure et par appareil (5 deja faits depuis ce poste) */
    let limite = null;
    for (let i = 0; i < 6 && !limite; i++) {
      const x = await publier(Object.assign({}, base, { note: 3, texte: 'Avis de série ' + i }));
      if (x.statut === 429) { limite = { i, m: x.j.message }; }
    }
    ok('API publique : au-delà de 8 avis par heure depuis un même appareil → 429 avec message', limite && /plus tard/.test(limite.m), JSON.stringify(limite));
    q("DELETE FROM t_avis_client WHERE dt_CREATED >= '" + DEBUT + "' AND texte LIKE 'Avis de série%'");
    ok('Téléphone : aucune erreur JavaScript, aucune ressource externe', errTel.length === 0, errTel.join(' / '));

    /* ---------------------------------------------------------------- ecran Avis */
    await vue(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; v.setActiveTab(v.down('#ongletAvis')); v.down('#effacerFiltres').handler(); });
    await attendre();
    const titre = await vue(() => Ext.ComponentQuery.query('avisclients')[0].down('#ongletAvis').title);
    await vue(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; v.appel('GET', '../api/v1/avis-clients/droits', null, (d) => v.majTitreAvis(d.nouveaux)); });
    await p.waitForFunction(() => /nouveau/.test(Ext.ComponentQuery.query('avisclients')[0].down('#ongletAvis').title), null, { timeout: 10000 });
    const titre2 = await vue(() => Ext.ComponentQuery.query('avisclients')[0].down('#ongletAvis').title);
    ok('Onglet Avis : nombre de nouveaux avis dans le titre', /\(\d+ nouveaux\)/.test(titre2), titre + ' → ' + titre2);
    const liste = await vue(() => { const g = Ext.ComponentQuery.query('avisclients #grilleAvis')[0]; return { n: g.getStore().getCount(), html: g.getView().getEl().dom.innerHTML, cols: g.headerCt.getGridColumns().map((c) => c.text) }; });
    ok('Liste : colonnes Date, Note, Ressenti, Employé cité, Client, Statut, Réponse', liste.cols.join('|') === 'Date|Note|Ressenti|Employé cité|Client|Statut|Réponse', liste.cols.join('|'));
    ok('Liste : les 5 avis de l\'essai', liste.n >= 5);
    ok('Liste : saisie piégée affichée comme du texte (encodée), jamais exécutée', await p.evaluate(() => window.__xss === undefined) && liste.html.indexOf('<script>window.__xss') < 0, liste.html.match(/DROP TABLE[^<]{0,80}/));
    const filtrer = async (f) => {
      await vue((f) => Ext.ComponentQuery.query('avisclients')[0].filtrer(f), f);
      await p.waitForTimeout(300); await attendre();
      return vue(() => Ext.ComponentQuery.query('avisclients #grilleAvis')[0].getStore().getRange().map((r) => r.get('note') + ':' + (r.get('texte') || '').slice(0, 25)));
    };
    let l = await filtrer({ note: 'NEGATIF' });
    ok('Filtre note « 1–2 ★ » : seulement les mécontents', l.length >= 3 && l.every((x) => /^[12]:/.test(x)), l.join(' / '));
    l = await filtrer({ contient: 'rupture' });
    ok('Filtre « contient » : rupture → l\'avis du produit en rupture', l.length === 1 && /^4:Bons conseils/.test(l[0]), l.join(' / '));
    l = await filtrer({ contient: 'kouassi' });
    ok('Filtre « contient » : cherche aussi dans le nom du client', l.length === 1 && /^1:/.test(l[0]), l.join(' / '));
    l = await filtrer({ motCle: 'conseil' });
    ok('Filtre mot clé : « conseil » retrouve « conseils »', l.length === 2 && l.every((x) => /^[45]:/.test(x)), l.join(' / '));
    l = await filtrer({ theme: 'Attente' });
    const textesAttente = await vue(() => Ext.ComponentQuery.query('avisclients #grilleAvis')[0].getStore().getRange().map((r) => r.get('texte')));
    ok('Filtre thème « Attente » : les avis qui parlent d\'attente, et seulement eux', l.length === 2 && textesAttente.every((x) => /attente/i.test(x)), textesAttente.join(' / '));
    l = await filtrer({ reponse: 'ATTENDUE' });
    ok('Filtre « réponse attendue » : le client qui accepte d\'être recontacté', l.length === 1 && /^1:/.test(l[0]), l.join(' / '));
    /* tri par note (clic sur l'en-tete) */
    await filtrer({});
    await vue(() => { const g = Ext.ComponentQuery.query('avisclients #grilleAvis')[0]; g.headerCt.getGridColumns()[1].getEl().dom.setAttribute('data-e2e', 'colNote'); });
    await p.click('[data-e2e=colNote] .x-column-header-text'); await p.waitForTimeout(300); await attendre();
    const n1 = await vue(() => Ext.ComponentQuery.query('avisclients #grilleAvis')[0].getStore().getRange().map((r) => r.get('note')));
    await p.click('[data-e2e=colNote] .x-column-header-text'); await p.waitForTimeout(300); await attendre();
    const n2 = await vue(() => Ext.ComponentQuery.query('avisclients #grilleAvis')[0].getStore().getRange().map((r) => r.get('note')));
    const croissant = (a) => a.every((x, i) => i === 0 || a[i - 1] <= x), decroissant = (a) => a.every((x, i) => i === 0 || a[i - 1] >= x);
    ok('Tri par note (clic sur l\'en-tête, dans les deux sens)', (croissant(n1) && decroissant(n2) || decroissant(n1) && croissant(n2)) && n1.join() !== n2.join(), n1.join() + ' / ' + n2.join());

    /* detail, traitement, reponse */
    await filtrer({ reponse: 'ATTENDUE' });
    await vue(() => { const g = Ext.ComponentQuery.query('avisclients #grilleAvis')[0]; g.getView().getNode(0).setAttribute('data-e2e', 'ligne0'); });
    await p.click('[data-e2e=ligne0]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('avisclients #traitement')[0].isVisible(), null, { timeout: 15000 });
    const det = await vue(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; return { html: v.down('#detail').getEl().dom.textContent, rep: v.down('#blocReponse').isVisible(),
      canal: v.down('#canal').getValue().avCanal, modele: v.down('#texteReponse').getValue(), emailDesactive: v.down('#canalEmail').isDisabled() }; });
    ok('Détail : texte, employé cité, coordonnées, « accepte une réponse »', /Caissière très impolie/.test(det.html) && /Mme Awa/.test(det.html) && /07 08 09 10 11/.test(det.html) && /accepte une réponse/.test(det.html), det.html.slice(0, 300));
    ok('Ouvrir l\'avis le marque « Lu »', q("SELECT statut FROM t_avis_client WHERE dt_CREATED >= '" + DEBUT + "' AND note = 1") === 'LU');
    ok('Réponse : WhatsApp proposé (numéro laissé), e-mail grisé, modèle d\'excuse pré-rempli pour un avis négatif', det.rep && det.canal === 'WHATSAPP' && det.emailDesactive && /désolés/.test(det.modele), JSON.stringify(det).slice(0, 300));
    await vue(() => Ext.ComponentQuery.query('avisclients #noteInterne')[0].inputEl.dom.setAttribute('data-e2e', 'noteInterne'));
    await p.fill('[data-e2e=noteInterne]', 'Vu avec Awa le 11/10.');
    await vue(() => Ext.ComponentQuery.query('avisclients #enregistrerTraitement')[0].btnEl.dom.setAttribute('data-e2e', 'enrTrait'));
    await p.click('[data-e2e=enrTrait]');
    await p.waitForFunction(() => /✓/.test(Ext.ComponentQuery.query('avisclients #enregistrerTraitement')[0].getText()), null, { timeout: 15000 });
    ok('Traitement : note interne enregistrée', q("SELECT note_interne FROM t_avis_client WHERE dt_CREATED >= '" + DEBUT + "' AND note = 1") === 'Vu avec Awa le 11/10.');
    await vue(() => Ext.ComponentQuery.query('avisclients #envoyerReponse')[0].btnEl.dom.setAttribute('data-e2e', 'envoyer'));
    await p.click('[data-e2e=envoyer]');
    await p.waitForFunction(() => /simulé|accepté/.test(Ext.ComponentQuery.query('avisclients #etatReponse')[0].getEl().dom.textContent), null, { timeout: 20000 });
    const apres = q("SELECT CONCAT_WS('|', statut, canal_reponse, statut_reponse, auteur_reponse, reponse LIKE 'Bonjour Kouassi A.,%') FROM t_avis_client WHERE dt_CREATED >= '" + DEBUT + "' AND note = 1");
    ok('Réponse WhatsApp (simulée sur le banc) : gardée avec l\'avis, avis « Traité », auteur noté', apres === 'TRAITE|WHATSAPP|SIMULE|Super Admin|1', apres);
    ok('Réponse : message WhatsApp journalisé sans son texte', q("SELECT COUNT(*) FROM whatsapp_message WHERE created_at >= '" + DEBUT + "' AND telephone LIKE '%0708091011%' AND statut = 'SIMULE'") === '1');
    const ligneMaj = await vue(() => { const g = Ext.ComponentQuery.query('avisclients #grilleAvis')[0]; return g.getView().getNode(0).textContent; });
    ok('Liste mise à jour sans recharger : « Traité » et « ✓ WhatsApp »', /Traité/.test(ligneMaj) && /✓ WhatsApp/.test(ligneMaj), ligneMaj);
    /* refus serveur : reponse a un client qui ne l'a pas demandee */
    const idAnonyme = q("SELECT id FROM t_avis_client WHERE dt_CREATED >= '" + DEBUT + "' AND note = 5");
    const refus = await api('POST', '../api/v1/avis-clients/avis/' + idAnonyme + '/repondre', { canal: 'WHATSAPP', texte: 'Bonjour' });
    ok('Serveur : pas de réponse à un client qui ne l\'a pas acceptée', refus.success === false && /pas accepté/.test(refus.message), JSON.stringify(refus));
    await p.screenshot({ path: process.env.CAPTURE_LISTE || path.join(TMP, 'liste.png') });

    /* impression et Excel */
    await filtrer({});
    const pdfListe = await p.evaluate(async () => { const v = Ext.ComponentQuery.query('avisclients')[0]; const r = await fetch('../api/v1/avis-clients/liste/pdf?' + Ext.Object.toQueryString(v.parametresFiltres()));
      return { t: r.headers.get('content-type'), b: Array.from(new Uint8Array(await r.arrayBuffer())) }; });
    fs.writeFileSync(path.join(TMP, 'liste.pdf'), Buffer.from(pdfListe.b));
    const txtListe = execFileSync('pdftotext', ['-layout', path.join(TMP, 'liste.pdf'), '-'], { encoding: 'utf8' });
    ok('Impression : PDF de la liste filtrée (avis, réponse, employé)', pdfListe.t === 'application/pdf' && /Avis clients/.test(txtListe) && /Caissière très impolie/.test(txtListe) && /Réponse/.test(txtListe), txtListe.slice(0, 300));
    await vue(() => Ext.ComponentQuery.query('avisclients #excelAvis')[0].btnEl.dom.setAttribute('data-e2e', 'xls'));
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('[data-e2e=xls]')]);
    const xls = texteXls(await dl.path());
    const lignePiege = xls.split('\n').find((x) => x.indexOf('0102030405') >= 0) || '';
    ok('Excel : avis exportés avec en-têtes', /Date\tNote\tApprécié\tÀ améliorer\tRessenti\tEmployé cité/.test(xls) && /Caissière très impolie/.test(xls));
    ok('Excel : cellule commençant par « = » neutralisée (pas de formule)', lignePiege.indexOf("\t'=cmd") >= 0, lignePiege.slice(0, 200));

    /* ---------------------------------------------------------------- analyse */
    await vue(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; v.setActiveTab(v.down('#ongletAnalyse')); v.chargerAnalyse(true); });
    await p.waitForFunction(() => /an-tuiles/.test(Ext.ComponentQuery.query('avisclients #analyse')[0].getEl().dom.innerHTML), null, { timeout: 20000 });
    const an = await api('GET', '../api/v1/avis-clients/analyse?du=' + q('SELECT CURDATE() - INTERVAL 29 DAY') + '&au=' + q('SELECT CURDATE()'));
    const awa = (an.employes || []).find((e) => e.cle === 'awa');
    ok('Analyse : « Mme Awa » et « awah » regroupés en un seul employé, 2 avis négatifs', awa && awa.nombre === 2 && awa.negatifs === 2, JSON.stringify(awa).slice(0, 300));
    ok('Analyse : alerte sur l\'employé cité dans des avis négatifs', (an.alertes || []).some((a) => /Awa.*2 avis négatifs/.test(a.texte)), JSON.stringify(an.alertes));
    ok('Analyse : critère Accueil en « à améliorer », thème Attente reconnu', an.criteres.find((c) => c.cle === 'ACCUEIL').moins >= 2 && an.themes.some((x) => x.theme === 'Attente'));
    const htmlAn = await vue(() => Ext.ComponentQuery.query('avisclients #analyse')[0].getEl().dom.innerHTML);
    ok('Analyse : tuiles, alertes, répartition, évolution (graphique), critères, thèmes, mots clés, employés', ['an-tuiles', 'Alertes', 'Répartition des notes', '<svg', 'Critères cochés', 'Thèmes évoqués', 'Mots clés', 'Récapitulatif par employé'].every((x) => htmlAn.indexOf(x) >= 0));
    ok('Analyse : texte des clients encodé (pas de balise injectée)', htmlAn.indexOf('<script') < 0 && await p.evaluate(() => window.__xss === undefined));
    await p.screenshot({ path: process.env.CAPTURE_ANALYSE || path.join(TMP, 'analyse.png'), fullPage: false });
    /* clic sur « Voir les avis » de l'employe -> liste filtree */
    await vue(() => { const el = Ext.ComponentQuery.query('avisclients #analyse')[0].getEl().dom.querySelector('a.an-lien[data-filtre*="awa"]'); el.setAttribute('data-e2e', 'voirAwa'); });
    await p.click('[data-e2e=voirAwa]'); await p.waitForTimeout(300); await attendre();
    const apresClic = await vue(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; return { onglet: v.getActiveTab().itemId, employe: v.down('#employe').getValue(),
      notes: v.down('#grilleAvis').getStore().getRange().map((r) => r.get('employe')) }; });
    ok('Analyse → « Voir les avis » de l\'employé : liste filtrée sur ses 2 avis', apresClic.onglet === 'ongletAvis' && apresClic.employe === 'awa' && apresClic.notes.length === 2, JSON.stringify(apresClic));
    await vue(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; v.setActiveTab(v.down('#ongletAnalyse')); });
    await vue(() => { const el = Ext.ComponentQuery.query('avisclients #analyse')[0].getEl().dom.querySelector('.an-mot[data-filtre*="conseil"]'); el.setAttribute('data-e2e', 'motConseil'); });
    await p.click('[data-e2e=motConseil]'); await p.waitForTimeout(300); await attendre();
    const apresMot = await vue(() => Ext.ComponentQuery.query('avisclients #grilleAvis')[0].getStore().getCount());
    ok('Analyse → clic sur un mot clé : liste filtrée', apresMot === 2, apresMot);
    const pdfAn = await p.evaluate(async () => { const r = await fetch('../api/v1/avis-clients/analyse/pdf'); return { t: r.headers.get('content-type'), b: Array.from(new Uint8Array(await r.arrayBuffer())) }; });
    fs.writeFileSync(path.join(TMP, 'analyse.pdf'), Buffer.from(pdfAn.b));
    const txtAn = execFileSync('pdftotext', ['-layout', path.join(TMP, 'analyse.pdf'), '-'], { encoding: 'utf8' });
    ok('Impression de l\'analyse : PDF avec alertes, critères, employés', pdfAn.t === 'application/pdf' && /Analyse des avis clients/.test(txtAn) && /Employés cités/.test(txtAn) && /Awa/.test(txtAn), txtAn.slice(0, 200));

    /* ---------------------------------------------------------------- droits (lus a la connexion : nouvelle session) */
    const session = async () => {
      const c = await b.newContext({ viewport: { width: 1500, height: 950 } });
      const x = await c.newPage(); x.on('pageerror', (e) => err.push('session : ' + e.message));
      await x.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
      await x.fill('#str_login', 'admin'); await x.fill('#str_password', 'e2etest'); await x.click('#login');
      await x.waitForURL('**/general/**', { timeout: 60000 });
      await x.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
      await x.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('avisclients', 'Avis clients', ''));
      await x.waitForFunction(() => Ext.ComponentQuery.query('avisclients')[0] && Ext.ComponentQuery.query('avisclients')[0].droits.success, null, { timeout: 30000 });
      return { c, x };
    };
    repondre.retirer();
    let s1 = await session();
    const sansRep = await s1.x.evaluate((id) => fetch('../api/v1/avis-clients/avis/' + id + '/traiter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"statut":"TRAITE"}' }).then((r) => r.json()), idAnonyme);
    await s1.x.waitForFunction(() => !Ext.ComponentQuery.query('avisclients #grilleAvis')[0].getStore().isLoading() && Ext.ComponentQuery.query('avisclients #grilleAvis')[0].getStore().getCount() > 0, null, { timeout: 30000 });
    await s1.x.evaluate(() => { Ext.ComponentQuery.query('avisclients #grilleAvis')[0].getSelectionModel().select(0); });
    await s1.x.waitForFunction(() => Ext.ComponentQuery.query('avisclients #traitement')[0].isVisible(), null, { timeout: 15000 });
    const lecture = await s1.x.evaluate(() => { const v = Ext.ComponentQuery.query('avisclients')[0];
      return { enr: v.down('#enregistrerTraitement').isVisible(), rep: v.down('#blocReponse').isVisible(), note: v.down('#noteInterne').readOnly, st: v.down('#statutBoutons').isDisabled() }; });
    await s1.c.close();
    repondre.remettre();
    ok('Sans P_AVIS_REPONDRE : traitement refusé par le serveur', sansRep.success === false && sansRep.interdit === true, JSON.stringify(sansRep));
    ok('Sans P_AVIS_REPONDRE : avis en lecture seule à l\'écran (pas de traitement ni de réponse)', !lecture.enr && !lecture.rep && lecture.note && lecture.st, JSON.stringify(lecture));
    reglages.retirer();
    s1 = await session();
    const sansRg = await s1.x.evaluate(async () => ({ r: await (await fetch('../api/v1/avis-clients/reglages')).json(), a: (await fetch('../api/v1/avis-clients/affiche')).status,
      onglet: Ext.ComponentQuery.query('avisclients #ongletReglages')[0].tab.isVisible() }));
    await s1.c.close();
    reglages.remettre();
    ok('Sans P_AVIS_REGLAGES : onglet masqué, réglages et affiche (qui contient le jeton) refusés', sansRg.r.success === false && sansRg.a === 403 && !sansRg.onglet, JSON.stringify(sansRg));
    ok('Aucune erreur JavaScript, aucune fenêtre', err.length === 0, err.join(' / '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    try { repondre.remettre(); reglages.remettre(); } catch (e) { console.log('droits : ' + e.message); }
    try { nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Nettoyage : avis d\'essai retirés, réglages remis', q("SELECT COUNT(*) FROM t_avis_client WHERE dt_CREATED >= '" + DEBUT + "'") === '0'
      && CLES.every((k) => q("SELECT IFNULL(str_VALUE, '') FROM t_parameters WHERE str_KEY = '" + k + "'") === origine[k]));
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + ' OK');
    process.exit(k === res.length ? 0 : 1);
  }
})();
