/* PERSONNALISATION DES ETIQUETTES ET CODES ETENDUS (retours du 11/10), par l'ecran Etiquettage Pro :
 *  - onglet « Personnalisation » : vue reelle (type de code x dimension), nom du produit sous la pharmacie, code geo ;
 *    deplacement a la souris et au clavier, points d'extension, zoom (la dimension ne change pas) ; garde-fous de
 *    lisibilite (chevauchement du code, code trop petit) ; « Valider » enregistre, l'impression suit la disposition ;
 *    sans disposition enregistree, le dessin d'origine ne change pas ; lecture seule sans le droit P_SM_ETIQUETTE_PERSO ;
 *  - codes etendus DataMatrix+ (GS1 + champs internes) et QR+ (texte clair) : contenu choisi (« dans le code »), format
 *    trop petit refuse a l'impression avec la raison ;
 *  - onglet « Lire une etiquette » : toutes les informations d'un coup, produit de Prestige, alertes (prix, inconnu) ;
 *  - a la caisse : DataMatrix+ et QR+ refuses (aucune ligne ajoutee), l'etiquette GS1 habituelle passe toujours.
 * Tout est retire a la fin (dispositions, codes d'etiquettes, vente, parametres, droit).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const privilegeEssai = require('../support/privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined && d !== '' ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const DOSSIER = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-etqperso-'));
const droit = privilegeEssai(q, q, 'admin', 'P_SM_ETIQUETTE_PERSO');
const CAISSE = 'e2e-perso-caisse';
let caisseCreee = false;
const P_LECTURE = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'");
const DISPOS_AVANT = q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', cle, '''')), '''-''') FROM t_etiquette_disposition");
const REGLAGES_AVANT = q("SELECT IFNULL(GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) SEPARATOR ';'), '') FROM t_parameters WHERE str_KEY LIKE 'KEY_ETIQUETTE_%'");

/* un produit de Prestige (CIP unique, prix) ; son code geo d'article (str_CODE_GEO_ARTICLE) est pose le temps du test */
const PGEO = 'E2E-B04';
const [FID, PCIP, PNOM, PPRIX] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.str_DESCRIPTION, f.int_PRICE) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.int_PRICE > 0 AND f.str_DESCRIPTION <> ''"
  + " AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = '' AND f.bool_ACCOUNT = 1"
  + " AND (SELECT COUNT(*) FROM t_famille g WHERE g.int_CIP = f.int_CIP) = 1 ORDER BY f.str_NAME LIMIT 1").split('|');
const GEO_AVANT = q(`SELECT IFNULL(str_CODE_GEO_ARTICLE, '<NULL>') FROM t_famille WHERE lg_FAMILLE_ID = '${FID}'`);
const STOCK = q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${FID}' AND lg_EMPLACEMENT_ID = '1'`).split('|');

function texteDuPdf(binaire) {
  const f = path.join(DOSSIER, 'e' + Date.now() + '.pdf');
  fs.writeFileSync(f, Buffer.from(binaire, 'latin1'));
  return execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' });
}

/* decodeur independant (zxing) des codes imprimes : contenu brut (octets) de chaque code de la premiere page */
function decoderPdf(binaire) {
  const f = path.join(DOSSIER, 'd' + Date.now() + '.pdf');
  fs.writeFileSync(f, Buffer.from(binaire, 'latin1'));
  execFileSync('pdftoppm', ['-r', '600', '-png', '-f', '1', '-l', '1', f, f.replace('.pdf', '')]);
  const png = fs.readdirSync(DOSSIER).filter((x) => x.startsWith(path.basename(f, '.pdf') + '-') && x.endsWith('.png')).map((x) => path.join(DOSSIER, x))[0];
  return JSON.parse(execFileSync('python3', ['-I', '-c', 'import sys, json, zxingcpp\nfrom PIL import Image\nprint(json.dumps([{"format": str(x.format), "texte": bytes(x.bytes).decode("latin-1")}'
    + ' for x in zxingcpp.read_barcodes(Image.open(sys.argv[1]))]))', png], { encoding: 'utf8' }));
}

const ventes = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventes();
  q(`DELETE FROM t_etiquette_disposition WHERE cle NOT IN (${DISPOS_AVANT});`
    + `DELETE FROM t_etiquette_code WHERE dt_CREATED >= '${DEBUT}';`
    + `DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK[0]}, int_NUMBER = ${STOCK[1]} WHERE lg_FAMILLE_ID = '${FID}' AND lg_EMPLACEMENT_ID = '1';`
    + `UPDATE t_parameters SET str_VALUE = '${P_LECTURE}' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1';`
    + `UPDATE t_famille SET str_CODE_GEO_ARTICLE = ${GEO_AVANT === '<NULL>' ? 'NULL' : "'" + GEO_AVANT.replace(/'/g, "''") + "'"} WHERE lg_FAMILLE_ID = '${FID}';`
    + (caisseCreee ? `DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '${CAISSE}';` : ''));
}

(async () => {
  droit.remettre();
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const attendre = async () => { await p.waitForTimeout(250); await p.waitForFunction(() => !Ext.Ajax.isLoading(), null, { timeout: 60000 }); await p.waitForTimeout(400); };
  const connexion = async () => {
    await ctx.clearCookies();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1200);
  };
  const ouvrir = async () => {
    await p.evaluate(() => { Ext.ComponentQuery.query('etiquetagepro').forEach((c) => c.destroy()); testextjs.app.getController('App').onRedirectTo('etiquetagepro', {}); });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('etiquetagepro')[0]; return c && c.cfg; }, null, { timeout: 30000 });
  };
  const bouton = async (sel) => { await p.evaluate((s) => { const x = Ext.ComponentQuery.query('etiquetagepro ' + s)[0]; x.handler ? x.handler.call(x.scope || x, x) : x.fireEvent('click', x); }, sel); await attendre(); };
  const perso = () => p.evaluate(() => {
    const c = Ext.ComponentQuery.query('etqpersonnalisation')[0], t = (s) => { const x = c.down(s); return x && x.getEl() ? x.getEl().dom.textContent : ''; };
    const plan = document.querySelector('.etqp-plan'), el = {};
    document.querySelectorAll('.etqp-el').forEach((e) => { el[e.getAttribute('data-el')] = { cls: e.className, txt: e.textContent, top: parseFloat(e.style.top), h: parseFloat(e.style.height), left: parseFloat(e.style.left) }; });
    return { source: t('#persoSource'), controle: t('#persoControle'), scan: t('#persoScan'), dim: t('#persoDim'), valider: !c.down('#persoValider').isDisabled() && c.down('#persoValider').isVisible(),
      valideVisible: c.down('#persoValider').isVisible(), planL: plan ? parseFloat(plan.style.width) : 0, el, disp: c.disp, ctrl: c.ctrl, dansLeCodeVisible: c.down('#colDansLeCode').isVisible(),
      types: c.typesStore.getRange().map((r) => r.get('id')).join(',') };
  });
  const choisirType = async (t) => { await p.evaluate((x) => { const c = Ext.ComponentQuery.query('etqpersonnalisation')[0]; const f = c.down('#persoType'); f.setValue(x); f.fireEvent('select', f); }, t); await attendre(); };
  const centre = async (id) => { const bx = await p.locator('.etqp-el[data-el="' + id + '"]').boundingBox(); return { x: bx.x + bx.width / 2, y: bx.y + bx.height / 2, b: bx }; };
  const glisser = async (de, vers) => { await p.mouse.move(de.x, de.y); await p.mouse.down(); await p.mouse.move((de.x + vers.x) / 2, (de.y + vers.y) / 2, { steps: 4 }); await p.mouse.move(vers.x, vers.y, { steps: 4 }); await p.mouse.up(); await attendre(); };
  /* PDF ouvert par l'ecran dans un nouvel onglet : requete capturee puis rejouee pour lire le fichier */
  const pdfDe = async (chemin, action) => {
    let capture = null;
    await ctx.route(chemin, (route) => { if (route.request().resourceType() === 'document') { capture = route.request(); return route.abort(); } return route.continue(); });
    const onglet = ctx.waitForEvent('page', { timeout: 30000 });
    await action();
    await onglet.then((o) => o.close()).catch(() => {});
    for (let i = 0; i < 50 && !capture; i++) { await p.waitForTimeout(100); }
    await ctx.unroute(chemin);
    const r = await p.evaluate(async (a) => { const x = await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: a.corps });
      const t = new Uint8Array(await x.arrayBuffer()); let s = ''; for (let i = 0; i < t.length; i++) { s += String.fromCharCode(t[i]); } return { type: x.headers.get('content-type') || '', texte: s }; },
    { url: capture ? capture.url() : '', corps: capture ? capture.postData() || '' : '' });
    return { pdf: r.texte.startsWith('%PDF'), type: r.type, brut: r.texte, texte: r.texte.startsWith('%PDF') ? texteDuPdf(r.texte) : r.texte };
  };

  try {
    nettoyer();
    q(`UPDATE t_famille SET str_CODE_GEO_ARTICLE = '${PGEO}' WHERE lg_FAMILLE_ID = '${FID}'`);
    ok('Précondition : produit avec un code géo d\'article (' + PCIP + ', ' + PGEO + ')', !!FID);
    ok('Migration : table des dispositions, droit P_SM_ETIQUETTE_PERSO donné à l\'administrateur seulement',
      q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_etiquette_disposition'") === '1'
      && q("SELECT COUNT(DISTINCT rp.lg_ROLE_ID) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE p.str_NAME = 'P_SM_ETIQUETTE_PERSO'") === '1');

    await connexion();
    await ouvrir();
    /* ------------------------------------------------ 1. personnalisation DataMatrix 38 x 21,2 */
    await bouton('#outilPerso');
    await choisirType('DATAMATRIX');
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqpersonnalisation')[0]; const f = c.down('#persoModele'); f.setValue('CARRE_38X21_2'); f.fireEvent('select', f); });
    await attendre();
    let s = await perso();
    ok('Onglet Personnalisation : 5 types de code (dont DataMatrix+ et QR+), dimension réelle affichée', s.types === 'CODE128,DATAMATRIX,QR,DATAMATRIX_PLUS,QR_PLUS' && /38,0 × 21,2 mm/.test(s.dim), s.types + ' / ' + s.dim);
    ok('Sans disposition enregistrée : « l\'impression utilise le dessin d\'origine », proposition affichée', /Aucune disposition enregistrée/.test(s.source) && /dessin d'origine/.test(s.source), s.source);
    ok('Vue réelle : pharmacie, désignation dessous, code, CIP, prix, date d\'édition, grossiste ; code géo facultatif (non affiché)',
      ['PHARMACIE', 'DESIGNATION', 'CODE', 'CIP', 'PRIX', 'DATE', 'GROSSISTE'].every((k) => s.el[k]) && !s.el.CODE_GEO
      && s.el.DESIGNATION.top >= s.el.PHARMACIE.top + s.el.PHARMACIE.h - 1, JSON.stringify(Object.keys(s.el)));
    ok('Proposition lisible (point du code affiché)', /Lisible : code et informations/.test(s.controle) && /Point du code : 0,\d+ mm/.test(s.controle), s.controle);
    ok('Code dessiné module par module (canvas) avec sa zone de silence', await p.evaluate(() => !!document.querySelector('.etqp-el[data-el=CODE] canvas') && !!document.querySelector('.etqp-silence')));

    /* exemple : le vrai produit (designation de Prestige, code geo) */
    await p.evaluate((cip) => { Ext.ComponentQuery.query('etqpersonnalisation #persoCip')[0].setValue(cip); }, PCIP);
    await bouton('#persoExemple');
    s = await perso();
    ok('Aperçu avec le produit : désignation de Prestige, texte tel qu\'imprimé', s.el.DESIGNATION.txt.replace(/\s+/g, ' ').includes(PNOM.split(' ')[0]), s.el.DESIGNATION.txt);
    /* le code geo, facultatif, se coche (colonne « Imprimée ») apres avoir retire le code de l'etiquette : il se pose sur une place libre */
    const cocher = async (id) => {
      await p.evaluate((x) => { const c2 = Ext.ComponentQuery.query('etqpersonnalisation')[0], g2 = c2.down('#persoElements');
        const n = g2.getView().getNode(c2.elementsStore.findRecord('id', x)); n.querySelector('.x-grid-cell-colImprime').setAttribute('data-e2e', 'imp-' + x); }, id);
      await p.click('[data-e2e=imp-' + id + '] .x-grid-checkcolumn'); await attendre();
    };
    await cocher('CODE_UNIQUE');
    await cocher('CODE_GEO');
    s = await perso();
    ok('Code géo coché : posé sur une place libre, avec le code géo de l\'article, lisible', !!s.el.CODE_GEO && s.el.CODE_GEO.txt === PGEO && !/etqp-bloquant/.test(s.el.CODE_GEO.cls)
      && !s.el.CODE_UNIQUE && /Lisible/.test(s.controle), (s.el.CODE_GEO ? s.el.CODE_GEO.txt + ' ' + s.el.CODE_GEO.cls : 'absent') + ' / ' + s.controle);

    /* zoom : l'affichage grandit, la dimension de l'etiquette non */
    await p.evaluate(() => { Ext.ComponentQuery.query('etqpersonnalisation #persoZoom')[0].setValue(300); });
    await attendre();
    const largeurAvant = (await perso()).planL;
    await p.evaluate(() => { Ext.ComponentQuery.query('etqpersonnalisation #persoZoom')[0].setValue(600); });
    await attendre();
    let s2 = await perso();
    ok('Zoom : la zone de travail grandit, l\'étiquette garde 38 × 21,2 mm', s2.planL > largeurAvant * 1.2 && s2.disp.largeur === 38 && s2.disp.hauteur === 21.2 && /38,0 × 21,2 mm/.test(s2.dim),
      largeurAvant + ' -> ' + s2.planL);
    await p.evaluate(() => { Ext.ComponentQuery.query('etqpersonnalisation #persoZoom')[0].setValue(500); });
    await attendre();

    /* glisser le prix sur le code : refuse (rouge), Valider grise */
    let c = await centre('CODE'), pr = await centre('PRIX');
    await glisser(pr, c);
    s = await perso();
    ok('Prix glissé sur le code : en rouge, « chevauche le code », Valider grisé', /etqp-bloquant/.test(s.el.PRIX.cls) && /chevauche le code/.test(s.controle) && !s.valider, s.controle);
    await bouton('#persoAnnuler');
    s = await perso();
    ok('Annuler les modifications : disposition d\'origine, lisible', /Lisible/.test(s.controle) && !/etqp-bloquant/.test(JSON.stringify(s.el)) && !s.el.CODE_GEO, s.controle);

    /* point d'extension : code reduit a l'extreme -> trop petit pour etre lu */
    await p.evaluate(() => { const c2 = Ext.ComponentQuery.query('etqpersonnalisation')[0]; c2.selectionner('CODE'); });
    await p.waitForTimeout(300);
    const coin = await p.locator('.etqp-poignee-nw').boundingBox();
    c = await centre('CODE');
    await glisser({ x: coin.x + 5, y: coin.y + 5 }, { x: c.b.x + c.b.width - 12, y: c.b.y + c.b.height - 12 });
    s = await perso();
    const code = s.disp.elements.find((x) => x.element === 'CODE');
    ok('Point d\'extension du code : il reste carré, trop petit = « trop petit pour être lu »', Math.abs(code.l - code.h) < 0.05 && /trop petit pour être lu/.test(s.controle) && !s.valider,
      JSON.stringify(code) + ' ' + s.controle);
    await bouton('#persoAnnuler');

    /* point d'extension d'un texte (bas de la designation) : la police grossit */
    await p.evaluate(() => { Ext.ComponentQuery.query('etqpersonnalisation')[0].selectionner('PHARMACIE'); });
    await p.waitForTimeout(300);
    const avantPolice = (await perso()).disp.elements.find((x) => x.element === 'PHARMACIE').police;
    const bas = await p.locator('.etqp-poignee-s').boundingBox();
    await glisser({ x: bas.x + 5, y: bas.y + 5 }, { x: bas.x + 5, y: bas.y + 12 });
    s = await perso();
    const apresPolice = s.disp.elements.find((x) => x.element === 'PHARMACIE').police;
    ok('Point d\'extension d\'un texte agrandi en hauteur : la police grossit', apresPolice > avantPolice, avantPolice + ' -> ' + apresPolice);
    await bouton('#persoAnnuler');

    /* clavier : le code geo (recoche) deplace de 0,5 mm a droite, puis Valider */
    await cocher('CODE_UNIQUE');
    await cocher('CODE_GEO');
    await p.evaluate(() => { Ext.ComponentQuery.query('etqpersonnalisation')[0].selectionner('CODE_GEO'); });
    await p.waitForTimeout(300);
    const geoAvant = (await perso()).disp.elements.find((x) => x.element === 'CODE_GEO');
    for (let i = 0; i < 5; i++) { await p.keyboard.press('ArrowRight'); }
    await p.waitForTimeout(600); await attendre();
    s = await perso();
    const geoApres = s.disp.elements.find((x) => x.element === 'CODE_GEO');
    ok('Clavier : flèche = 0,1 mm (5 fois → 0,5 mm), « Modifications non enregistrées »', Math.abs(geoApres.x - geoAvant.x - 0.5) < 0.011 && /non enregistrées/.test(s.source),
      geoAvant.x + ' -> ' + geoApres.x);
    ok('Lisible : Valider possible', s.valider, s.controle);
    await bouton('#persoValider');
    s = await perso();
    const enBase = q("SELECT contenu FROM t_etiquette_disposition WHERE cle = 'DATAMATRIX|38.0x21.2'");
    ok('Valider : disposition enregistrée (type et dimension), « utilisée à l\'impression »', !!enBase && /Disposition enregistrée/.test(s.source)
      && Math.abs(JSON.parse(enBase).elements.find((x) => x.element === 'CODE_GEO').x - geoApres.x) < 0.011, s.source);

    /* essai : une etiquette d'exemple comme a l'impression */
    let pdf = await pdfDe('**/etiquetage-pro/disposition/pdf', () => bouton('#persoEssai'));
    const lignesPdf = pdf.texte.split('\n').map((x) => x.trim()).filter(Boolean);
    const iPh = lignesPdf.findIndex((x) => /PHARMACIE|PHCIE|PHIE/i.test(x) || x === (s.disp && ''));
    ok('Essai (PDF) : nom du produit sous le nom de la pharmacie, code géo, prix', pdf.pdf && lignesPdf.some((x) => x.includes(PNOM.split(' ')[0])) && pdf.texte.includes(PGEO),
      lignesPdf.slice(0, 8).join(' | '));

    /* impression par l'assistant : la disposition validee sert (designation + code geo sur le DataMatrix) */
    await bouton('#etape0');
    await bouton('#saisie');
    await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro #grilleProduits')[0].getPlugin('editionProduits').cancelEdit());
    await p.evaluate((cip) => { Ext.ComponentQuery.query('etiquetagepro #grilleProduits')[0].getStore().getAt(0).set('CIP', cip); }, PCIP);
    await bouton('#completer');
    const ligne = await p.evaluate(() => { const r = Ext.ComponentQuery.query('etiquetagepro #grilleProduits')[0].getStore().getAt(0); return { nom: r.get('DESIGNATION'), geo: r.get('CODE_GEO') }; });
    ok('Compléter depuis Prestige : le code géo est repris', ligne.geo === PGEO, JSON.stringify(ligne));
    await bouton('#suivant');
    await p.evaluate(() => { Ext.ComponentQuery.query('etiquetagepro #code')[0].setValue({ code: 'DATAMATRIX' }); Ext.ComponentQuery.query('etiquetagepro #modele')[0].setValue('CARRE_38X21_2'); });
    pdf = await pdfDe('**/etiquetage-pro/pdf', () => bouton('#imprimer'));
    ok('Impression DataMatrix : la disposition validée sert (désignation et code géo imprimés)', pdf.pdf && pdf.texte.includes(PGEO) && pdf.texte.includes(PNOM.split(' ')[0]), pdf.texte.slice(0, 300));
    const dmLu = decoderPdf(pdf.brut);
    ok('… le DataMatrix imprimé avec la disposition se lit (décodeur indépendant) : GS1 avec le CIP', dmLu.some((x) => /Data ?Matrix/.test(x.format) && x.texte.includes('240' + PCIP)), JSON.stringify(dmLu).slice(0, 200));
    /* QR avec une disposition validee : se lit aussi */
    await bouton('#outilPerso');
    await choisirType('QR');
    await bouton('#persoValider');
    await bouton('#etape3');
    await p.evaluate(() => { Ext.ComponentQuery.query('etiquetagepro #code')[0].setValue({ code: 'QR' }); Ext.ComponentQuery.query('etiquetagepro #modele')[0].setValue('CARRE_38X21_2'); });
    pdf = await pdfDe('**/etiquetage-pro/pdf', () => bouton('#imprimer'));
    const qrLu = decoderPdf(pdf.brut);
    const dateEdition = await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro #date')[0].getValue());
    ok('QR avec la disposition proposée validée : date d\'édition imprimée, code géo absent (facultatif), et se lit (décodeur indépendant)', pdf.texte.includes(dateEdition) && !pdf.texte.includes(PGEO)
      && qrLu.some((x) => /QR/.test(x.format) && x.texte.includes('240' + PCIP)), JSON.stringify(qrLu).slice(0, 200));
    /* code-barres classique : pas de disposition enregistree -> dessin d'origine (sans code geo) */
    await p.evaluate(() => { Ext.ComponentQuery.query('etiquetagepro #code')[0].setValue({ code: 'CODE128' }); });
    pdf = await pdfDe('**/etiquetage-pro/pdf', () => bouton('#imprimer'));
    ok('Code-barres sans disposition enregistrée : dessin d\'origine (pas de code géo ajouté)', pdf.pdf && !pdf.texte.includes(PGEO) && pdf.texte.includes(PCIP), pdf.texte.slice(0, 200));

    /* ------------------------------------------------ 2. DataMatrix+ : contenu du code */
    await bouton('#outilPerso');
    await choisirType('DATAMATRIX_PLUS');
    s = await perso();
    ok('DataMatrix+ : colonne « Dans le code », disposition proposée utilisée à l\'impression', s.dansLeCodeVisible && /Disposition proposée/.test(s.source), s.source);
    ok('DataMatrix+ : au scan, GS1 habituel puis 91 EPLUS1 et les informations', /91EPLUS1/.test(s.scan) && new RegExp('240' + PCIP).test(s.scan), s.scan);
    const dansCode = s.disp.elements.filter((x) => x.dansLeCode).map((x) => x.element).sort().join(',');
    ok('Contenu par défaut : désignation (et ce qui tient lisiblement)', /DESIGNATION/.test(dansCode), dansCode);
    /* decocher la designation du code */
    /* clic dans la case de la grille, comme a la souris */
    const caseCode = await p.evaluate(() => { const c2 = Ext.ComponentQuery.query('etqpersonnalisation')[0], g = c2.down('#persoElements'), col = c2.down('#colDansLeCode');
      const r = c2.elementsStore.findRecord('id', 'DESIGNATION'), n = g.getView().getNode(r), cell = n && n.querySelector('.x-grid-cell-colDansLeCode');
      if (!cell) { return null; } cell.setAttribute('data-e2e', 'case-designation-code'); return true; });
    if (caseCode) { await p.click('[data-e2e=case-designation-code] .x-grid-checkcolumn, [data-e2e=case-designation-code]'); }
    await attendre();
    s = await perso();
    ok('Case « dans le code » décochée : la désignation sort du code', !/<GS>92/.test(s.scan), s.scan);
    await bouton('#persoAnnuler');
    s = await perso();
    const contenuDm = s.scan.replace(/^.*Au scan, le code rend :/, '').replace(/\d+ caractère\(s\)\s*$/, '').trim();

    /* ------------------------------------------------ 3. Lire une etiquette */
    await bouton('#outilLecture');
    const lire = async (texte) => {
      await p.evaluate((t) => { const f = Ext.ComponentQuery.query('etqlecture #lectureCode')[0]; f.setValue(t); f.fireEvent('specialkey', f, { getKey: () => 13, ENTER: 13, stopEvent: () => {} }); }, texte);
      await attendre();
      return p.evaluate(() => { const r = Ext.ComponentQuery.query('etqlecture #lectureResultat')[0]; return r.getEl().dom.textContent; });
    };
    let lu = await lire(contenuDm);
    ok('Lire un DataMatrix+ : toutes les informations d\'un coup (désignation, prix, CIP, lot, péremption)', /DataMatrix\+ \(étendu\)/.test(lu) && lu.includes(PCIP) && /Désignation/.test(lu) && /Péremption/.test(lu)
      && /hors vente/.test(lu), lu.slice(0, 400));
    ok('… produit de Prestige et prix actuel, aucune alerte (prix étiqueté = prix actuel)', lu.includes('Dans Prestige') && /Aucune alerte/.test(lu), lu.slice(0, 400));
    const qrFaux = 'EP1|CIP:' + PCIP + '|NOM:ESSAI|PRIX:' + (Number(PPRIX) + 100) + '|LOT:A1|PER:01/01/2020';
    lu = await lire(qrFaux);
    ok('QR+ avec un prix dépassé et un lot périmé : alertes « étiquette à refaire » et « périmé »', /QR\+/.test(lu) && /étiquette à refaire/.test(lu) && /périmé/.test(lu), lu.slice(0, 400));
    lu = await lire('EP1|CIP:9999999|NOM:INCONNU');
    ok('Produit inconnu : signalé', /Produit inconnu/.test(lu), lu.slice(0, 200));
    lu = await lire(PCIP);
    ok('Simple CIP : lu (code simple), produit de Prestige', /Code simple/.test(lu) && lu.includes('Dans Prestige'), lu.slice(0, 200));

    /* ------------------------------------------------ 4. QR+ et format trop petit */
    await bouton('#outilPerso');
    await choisirType('QR_PLUS');
    s = await perso();
    ok('QR+ : texte clair « EP1|CIP:… » au scan, proposition lisible sur 38 × 21,2', /EP1\|CIP:/.test(s.scan) && /Lisible/.test(s.controle), s.scan + ' ' + s.controle);
    /* format libre 20 x 12 mm : un DataMatrix+ n'y est pas lisible -> refuse a l'impression avec la raison */
    await bouton('#etape3');
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('etiquetagepro')[0]; e.down('#modele').setValue('PERSONNALISE'); e.down('#KEY_ETIQUETTE_LARGEUR_MM').setValue(20); e.down('#KEY_ETIQUETTE_HAUTEUR_MM').setValue(12);
      e.down('#code').setValue({ code: 'DATAMATRIX_PLUS' }); });
    pdf = await pdfDe('**/etiquetage-pro/pdf', () => bouton('#imprimer'));
    ok('DataMatrix+ sur 20 × 12 mm : pas de PDF, « illisible sur ce format » avec la raison', !pdf.pdf && /illisible sur ce format/.test(pdf.texte) && /Personnalisation/.test(pdf.texte), pdf.texte.replace(/<[^>]+>/g, ' ').slice(0, 300));
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('etiquetagepro')[0]; e.down('#modele').setValue('CARRE_38X21_2'); e.down('#code').setValue({ code: 'QR_PLUS' }); });
    pdf = await pdfDe('**/etiquetage-pro/pdf', () => bouton('#imprimer'));
    ok('QR+ sur 38 × 21,2 : PDF imprimé', pdf.pdf, pdf.texte.slice(0, 200));
    /* le code imprime se lit vraiment (decodeur independant) : texte clair EP1|CIP:... */
    const decode = decoderPdf(pdf.brut);
    ok('QR+ imprimé : décodé par un lecteur indépendant, « EP1|CIP:… »', decode.some((c) => /QR/.test(c.format) && c.texte.startsWith('EP1|CIP:' + PCIP)), JSON.stringify(decode).slice(0, 300));

    /* ------------------------------------------------ 5. lecture seule sans le droit */
    droit.retirer();
    await connexion();
    await ouvrir();
    await bouton('#outilPerso');
    await choisirType('DATAMATRIX');
    s = await perso();
    ok('Sans le droit : lecture seule (pas de Valider), message', !s.valideVisible && /Lecture seule/.test(s.source), s.source);
    c = await centre('PRIX');
    await glisser(c, { x: c.x + 40, y: c.y });
    const prixApres = (await perso()).disp.elements.find((x) => x.element === 'PRIX');
    ok('… glisser ne déplace rien', JSON.parse(enBase).elements.find((x) => x.element === 'PRIX').x === prixApres.x, prixApres.x);
    const refus = await p.evaluate(async (d) => (await (await fetch('../api/v1/etiquetage-pro/disposition/enregistrer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disposition: d }) })).json()), s.disp);
    ok('… et le serveur refuse l\'enregistrement', refus.success === false && refus.interdit === true, JSON.stringify(refus));
    droit.remettre();

    /* ------------------------------------------------ 6. a la caisse */
    if (q(`SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '${ADMIN}' AND str_STATUT = 'is_Using'`) === '0') {
      q(`INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)`
        + ` VALUES ('${CAISSE}', '${ADMIN}', 0, 0, CURDATE(), NOW(), '${ADMIN}', NOW(), '${ADMIN}', 'is_Using')`);
      caisseCreee = true;
    }
    q(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 50, int_NUMBER = 50 WHERE lg_FAMILLE_ID = '${FID}' AND lg_EMPLACEMENT_ID = '1'`);
    await connexion();
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', {}));
    await p.waitForFunction(() => { const x = Ext.ComponentQuery.query('doventemanager #produit')[0]; return x && x.isVisible(); }, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const scanner = async (texte) => {
      await p.evaluate(() => { const x = Ext.ComponentQuery.query('doventemanager #produit')[0]; x.clearValue(); x.inputEl.dom.setAttribute('data-e2e', 'produit'); x.focus(); });
      await p.click('[data-e2e=produit]');
      await p.keyboard.type(texte, { delay: 3 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(1200);
      await p.waitForFunction(() => !Ext.Ajax.isLoading(), null, { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(600);
      const boite = await p.evaluate(() => (Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.textContent : ''));
      await p.evaluate(() => { if (Ext.Msg.isVisible()) { Ext.Msg.hide(); } });
      return boite;
    };
    const lignesVente = () => { const v = ventes(); return Number(q(`SELECT IFNULL(SUM(int_QUANTITY), 0) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${v})`)); };
    for (const lect of ['1', '0']) {
      q(`UPDATE t_parameters SET str_VALUE = '${lect}' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'`);
      await p.reload({ waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
      await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', {}));
      await p.waitForFunction(() => { const x = Ext.ComponentQuery.query('doventemanager #produit')[0]; return x && x.isVisible(); }, null, { timeout: 30000 });
      await p.waitForTimeout(1500);
      const avant = lignesVente();
      let boite = await scanner(contenuDm.replace(/<GS>/g, '|'));
      ok('Caisse (lecture GS1 = ' + lect + ') : DataMatrix+ refusé, rien d\'ajouté', /Étiquette étendue|DataMatrix\+ ou QR\+/.test(boite) && lignesVente() === avant, boite);
      boite = await scanner('EP1|CIP:' + PCIP + '|NOM:ESSAI|PRIX:' + PPRIX);
      ok('Caisse (lecture GS1 = ' + lect + ') : QR+ refusé, rien d\'ajouté', /ne passe pas à la vente/.test(boite) && lignesVente() === avant, boite);
      boite = await scanner('240' + PCIP + '|91EPLUS1');
      ok('Caisse (lecture GS1 = ' + lect + ') : même un DataMatrix+ réduit au CIP est refusé', /ne passe pas à la vente/.test(boite) && lignesVente() === avant, boite);
      await scanner('10LOTE2E|240' + PCIP);
      ok('Caisse (lecture GS1 = ' + lect + ') : l\'étiquette GS1 habituelle passe toujours', lignesVente() === avant + 1, (avant) + ' -> ' + lignesVente());
    }
    const serveur = await p.evaluate(async (t) => (await (await fetch('../api/v1/vente/gs1?code=' + encodeURIComponent(t))).json()), contenuDm.replace(/<GS>/g, '\u001d'));
    ok('Serveur de la vente : un DataMatrix+ est refusé (« étendue »)', serveur.success === false && serveur.etendu === true, JSON.stringify(serveur).slice(0, 200));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    try { droit.remettre(); nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    try { fs.rmSync(DOSSIER, { recursive: true, force: true }); } catch (e) { /* rien */ }
    ok('Remise en état : dispositions, codes, vente, paramètres, droit, réglages de planche, code géo du produit', q(`SELECT COUNT(*) FROM t_etiquette_disposition WHERE cle NOT IN (${DISPOS_AVANT})`) === '0'
      && q(`SELECT IFNULL(str_CODE_GEO_ARTICLE, '<NULL>') FROM t_famille WHERE lg_FAMILLE_ID = '${FID}'`) === GEO_AVANT
      && q(`SELECT COUNT(*) FROM t_etiquette_code WHERE dt_CREATED >= '${DEBUT}'`) === '0' && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'") === P_LECTURE
      && q("SELECT IFNULL(GROUP_CONCAT(CONCAT(str_KEY, '=', str_VALUE) SEPARATOR ';'), '') FROM t_parameters WHERE str_KEY LIKE 'KEY_ETIQUETTE_%'") === REGLAGES_AVANT
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE p.str_NAME = 'P_SM_ETIQUETTE_PERSO'") === '1');
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
