/* ETIQUETAGE PRO (retours du 10/10) : menu GESTION DU STOCK, etiquettes de produits importes (CSV, Excel) ou saisis, en
 * code-barres standard, DataMatrix ou QR code ; impression seule.
 * Tout passe par l'ecran (assistant en 4 etapes, sans fenetre) :
 *  - import CSV : apercu, correspondance proposee d'apres les titres, texte fixe, modele, zone ajoutee, zone rendue
 *    obligatoire ; lignes controlees (erreurs en rouge, non imprimees), correction a l'ecran, completer depuis Prestige ;
 *  - import Excel : choix de la feuille, grands nombres (EAN) et dates ;
 *  - saisie directe ;
 *  - impression : PDF des 3 types de code, format libre, position de depart ; codes uniques au registre pour le 2D,
 *    aucun pour le code-barres standard ; page de test ;
 *  - correspondance retenue pour un fichier de meme forme ;
 *  - droit P_SM_ETIQUETAGE_PRO ; rien n'est ecrit dans les fiches articles.
 * Tout est retire a la fin (codes d'etiquettes du test, fichiers, droit remis).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const privilegeEssai = require('../support/privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined && d !== '' ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const exec = q;
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const DOSSIER = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-etqp-'));
const droit = privilegeEssai(q, exec, 'admin', 'P_SM_ETIQUETAGE_PRO');

/* un produit reel de Prestige (CIP unique, designation, prix) pour « Completer depuis Prestige » */
const [PCIP, PNOM, PPRIX] = q("SELECT CONCAT_WS('|', f.int_CIP, f.str_DESCRIPTION, f.int_PRICE) FROM t_famille f WHERE f.str_STATUT='enable' AND f.int_CIP REGEXP '^[0-9]{7}$'"
  + " AND f.int_PRICE > 0 AND f.str_DESCRIPTION <> '' AND (SELECT COUNT(*) FROM t_famille g WHERE g.int_CIP=f.int_CIP)=1 ORDER BY f.str_NAME LIMIT 1").split('|');
const empreinteFamilles = () => q('SELECT CONCAT(COUNT(*), "|", IFNULL(MAX(dt_UPDATED), ""), "|", SUM(CRC32(CONCAT_WS("|", str_DESCRIPTION, int_PRICE, int_CIP, int_EAN13)))) FROM t_famille');
const codesDuTest = () => Number(q(`SELECT COUNT(*) FROM t_etiquette_code WHERE dt_CREATED >= '${DEBUT}'`));
const cle = (d) => { let s = 0; for (let i = d.length - 1, w = 3; i >= 0; i--, w = 4 - w) { s += Number(d[i]) * w; } return (10 - s % 10) % 10; };
const EAN = '340093000001' + cle('340093000001');

const CSV = 'Code produit;Libellé;PV;Fournisseur;N° lot;Exp;Qté;Rayon\r\n'
  + '1234567;PRODUIT ESSAI UN;1 500;LABOREX;A12;03/2030;2;R1\r\n'
  + ';SANS CIP;100;;;;;\r\n'
  + '7654321;PRIX FAUX;abc;;;;1;R2\r\n'
  + PCIP + ';;;;;;1;R3\r\n';

function nettoyer() {
  q(`DELETE FROM t_etiquette_code WHERE dt_CREATED >= '${DEBUT}'`);
  try { fs.rmSync(DOSSIER, { recursive: true, force: true }); } catch (e) { /* rien */ }
}

(async () => {
  droit.remettre();
  const familles = empreinteFamilles();
  fs.writeFileSync(path.join(DOSSIER, 'produits.csv'), CSV, 'utf8');
  execFileSync('python3', ['-I', '-c', [
    'import openpyxl, sys, datetime',
    'wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Notes"; ws["A1"] = "rien"',
    's = wb.create_sheet("Produits")',
    's.append(["CIP", "Désignation", "Prix", "EAN", "Péremption", "Lot"])',
    `s.append([7777777, "PRODUIT EXCEL", 2500, ${EAN}, datetime.date(2030, 6, 30), "XL1"])`,
    's["E2"].number_format = "dd/mm/yyyy"',
    'wb.save(sys.argv[1])'].join('\n'), path.join(DOSSIER, 'produits.xlsx')]);

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const connexion = async () => {
    await ctx.clearCookies();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
  };
  const ecran = () => p.evaluate(() => !!Ext.ComponentQuery.query('etiquetagepro')[0]);
  const etat = () => p.evaluate(() => { const e = Ext.ComponentQuery.query('etiquetagepro #etat')[0]; return e && e.getEl() ? e.getEl().dom.textContent : ''; });
  const ouvrir = async () => {
    await p.evaluate(() => { Ext.ComponentQuery.query('etiquetagepro').forEach((c) => c.destroy()); testextjs.app.getController('App').onRedirectTo('etiquetagepro', {}); });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('etiquetagepro')[0]; return c && c.cfg; }, null, { timeout: 30000 });
  };
  const importer = async (fichier) => {
    const input = await p.$('.etqp-ecran input[type=file]');
    await input.setInputFiles(fichier);
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('etiquetagepro')[0]; return c.tableau && !Ext.Ajax.isLoading(); }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
  };
  const zones = () => p.evaluate(() => { const o = {}; Ext.ComponentQuery.query('etiquetagepro')[0].zonesStore.each((r) => { o[r.get('libelle')] = [r.get('source'), r.get('obligatoire'), r.get('apercu')]; }); return o; });
  const produits = () => p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro')[0].produitsStore.getRange().map((r) => ({ n: r.get('numero'), cip: r.get('CIP'), nom: r.get('DESIGNATION'),
    prix: r.get('PRIX'), mention: r.get('MENTION'), gros: r.get('GROSSISTE'), e: (r.get('erreurs') || []).join(';'), a: (r.get('avertissements') || []).join(';'), et: r.get('etiquettes') })));
  const cliquer = async (sel) => { await p.evaluate((s) => { const b2 = Ext.ComponentQuery.query('etiquetagepro ' + s)[0]; b2.handler ? b2.handler.call(b2.scope || b2, b2) : b2.fireEvent('click', b2); }, sel); await p.waitForTimeout(300); await p.waitForFunction(() => !Ext.Ajax.isLoading(), null, { timeout: 60000 }); await p.waitForTimeout(500); };
  /* PDF demande par l'ecran (formulaire POST vers un nouvel onglet) : on capture la reponse */
  /* PDF demande par l'ecran (formulaire POST vers un nouvel onglet) : la requete envoyee par l'ecran est capturee, puis
     rejouee telle quelle pour lire le PDF entier (le lecteur PDF du navigateur ne rend pas le fichier au test) */
  const imprimer = async (bouton) => {
    const chemin = bouton === '#pageTest' ? '**/etiquetage-pro/test' : '**/etiquetage-pro/pdf';
    let capture = null;
    await ctx.route(chemin, (route) => {
      if (route.request().resourceType() === 'document') {
        capture = route.request();
        return route.abort();
      }
      return route.continue();
    });
    const onglet = ctx.waitForEvent('page', { timeout: 60000 });
    await cliquer(bouton);
    await onglet.then((o) => o.close()).catch(() => {});
    for (let i = 0; i < 50 && !capture; i++) { await p.waitForTimeout(100); }
    await ctx.unroute(chemin);
    const corps = capture ? capture.postData() || '' : '';
    const r = await p.evaluate(async (a) => {
      const x = await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: a.corps });
      const t = new Uint8Array(await x.arrayBuffer()); let s = ''; for (let i = 0; i < t.length; i++) { s += String.fromCharCode(t[i]); }
      return { type: x.headers.get('content-type') || '', texte: s };
    }, { url: capture ? capture.url() : '', corps });
    const donnees = JSON.parse(decodeURIComponent((corps.split('donnees=')[1] || '').replace(/\+/g, ' ')) || '{}');
    return { type: r.type, taille: r.texte.length, pdf: r.texte.startsWith('%PDF'), pages: (r.texte.match(/\/Type\s*\/Page[^s]/g) || []).length, texte: r.texte, donnees };
  };

  try {
    ok('Précondition : un produit de Prestige à compléter (' + PCIP + ')', !!PCIP && !!PNOM);
    ok('Migration : menu « Étiquettage Pro » dans GESTION DU STOCK, droit donné à l\'administrateur',
      q("SELECT CONCAT(s.str_DESCRIPTION, '|', m.str_VALUE, '|', s.P_KEY) FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID=s.lg_MENU_ID WHERE s.str_COMPOSANT='etiquetagepro'") === 'Étiquettage Pro|GESTION DU STOCK|P_SM_ETIQUETAGE_PRO'
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID=rp.lg_PRIVILEGE_ID JOIN t_role_user ru ON ru.lg_ROLE_ID=rp.lg_ROLE_ID JOIN t_user u ON u.lg_USER_ID=ru.lg_USER_ID WHERE u.str_LOGIN='admin' AND p.str_NAME='P_SM_ETIQUETAGE_PRO'") !== '0');

    /* ---------------------------------------------------------------- droit */
    droit.retirer();
    await connexion();
    const refus = await p.evaluate(async () => (await (await fetch('../api/v1/etiquetage-pro/config')).json()));
    ok('Sans le droit P_SM_ETIQUETAGE_PRO : accès refusé', refus.success === false && refus.interdit === true, JSON.stringify(refus));
    droit.remettre();
    await connexion();

    /* ---------------------------------------------------------- 1. import CSV */
    await ouvrir();
    ok('Écran ouvert par son menu, étape 1 « Source », étapes suivantes verrouillées', await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('etiquetagepro')[0];
      return c.etape === 0 && c.down('#etape1').isDisabled() && c.down('#suivant').isDisabled() && c.cfg.zones.length === 11; /* 11/10 : zone « Code géo » ajoutée */
    }));
    await importer(path.join(DOSSIER, 'produits.csv'));
    const ap = await p.evaluate(() => { const c = Ext.ComponentQuery.query('etiquetagepro')[0]; return { lignes: c.apercuStore.getCount(), cols: c.down('#apercu').headerCt.getGridColumns().map((x) => x.text), info: c.down('#infoFichier').getEl().dom.textContent }; });
    ok('CSV lu : aperçu (4 lignes, 8 colonnes), séparateur et encodage indiqués', ap.lignes === 4 && ap.cols.length === 8 && /séparateur « ; », UTF-8/.test(ap.info), JSON.stringify(ap));
    let z = await zones();
    ok('Correspondance proposée d\'après les titres (CIP, désignation, prix, grossiste, lot, péremption, nombre, mention)',
      z['CIP'][0] === '{Code produit}' && z['Désignation'][0] === '{Libellé}' && z['Prix'][0] === '{PV}' && z['Grossiste'][0] === '{Fournisseur}'
      && z['Lot'][0] === '{N° lot}' && z['Péremption'][0] === '{Exp}' && z["Nombre d'étiquettes"][0] === '{Qté}' && z['Mention libre'][0] === '{Rayon}' && z['EAN'][0] === '',
      JSON.stringify(z));
    ok('Aperçu de la 1re ligne par zone', z['CIP'][2] === '1234567' && z['Prix'][2] === '1 500' && z['Mention libre'][2] === 'R1', JSON.stringify(z['CIP']) + JSON.stringify(z['Prix']));
    const colonnes = () => p.evaluate(() => [...Ext.ComponentQuery.query('etiquetagepro #colonnes')[0].body.dom.querySelectorAll('table.etqp-col')].map((t) => [...t.rows].map((r) => [...r.cells].map((c) => c.textContent.trim()))));
    let cols = await colonnes();
    ok('Indication des colonnes du fichier : exemple et zone reprise (« Code produit » → CIP, « Rayon » → Mention libre)', cols.length === 2
      && JSON.stringify(cols[0][1]) === JSON.stringify(['Code produit', '1234567', '→ CIP']) && cols[0][8][0] === 'Rayon' && cols[0][8][2] === '→ Mention libre', JSON.stringify(cols[0]));
    ok('Titres reconnus par zone affichés (CIP *, « code produit », « libelle »…)', cols[1].length === 12 && cols[1][1][0] === 'CIP *' && /code produit/.test(cols[1][1][1])
      && /libelle/.test(cols[1][2][1]), JSON.stringify(cols[1].slice(0, 3)));
    ok('CIP et désignation obligatoires par défaut, le CIP verrouillé', z['CIP'][1] && z['Désignation'][1] && !z['Prix'][1]
      && await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro')[0].zonesStore.findRecord('id', 'CIP').get('verrouillee')));
    await cliquer('#suivant');

    /* ---------------------------------------------------------------- 2. zones */
    /* zone ajoutee, modele, texte fixe, obligatoires changes (comme a la souris : valeurs du tableau des zones) */
    await cliquer('#ajouterZone');
    await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('etiquetagepro')[0], s = c.zonesStore;
      const ed = c.down('#etapeZones').getPlugin('editionZones'); ed.cancelEdit();
      const a = s.findRecord('ajoutee', true); a.set('libelle', 'Emplacement'); a.set('source', 'Rayon {Rayon}');
      s.findRecord('id', 'MENTION').set('source', '{Emplacement} / lot {N° lot}');
      s.findRecord('id', 'DATE').set('source', 'REÇU LE 10/10');
      s.findRecord('id', 'DESIGNATION').set('obligatoire', false);
      s.findRecord('id', 'CIP').set('obligatoire', false);
      c.majApercuZones();
    });
    /* le CIP ne se decoche pas (case verrouillee) */
    const verrou = await p.evaluate(() => { const g = Ext.ComponentQuery.query('etiquetagepro #etapeZones')[0]; const col = g.headerCt.getGridColumns().find((x) => x.dataIndex === 'obligatoire');
      return col.fireEvent('beforecheckchange', col, g.getStore().indexOf(g.getStore().findRecord('id', 'CIP')), false); });
    ok('La case « obligatoire » du CIP ne se décoche pas', verrou === false);
    await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro')[0].zonesStore.findRecord('id', 'CIP').set('obligatoire', true));
    z = await zones();
    ok('Zone ajoutée (« Rayon {Rayon} ») reprise dans un modèle : aperçu « Rayon R1 / lot A12 » ; texte fixe pour la date', z['Mention libre'][2] === 'Rayon R1 / lot A12' && z['Date imprimée'][2] === 'REÇU LE 10/10', JSON.stringify(z));
    await cliquer('#suivant');

    /* ------------------------------------------------------------ 3. produits */
    let pr = await produits();
    ok('Étape 3 : 4 lignes du fichier, numérotées comme dans le fichier (titres compris)', pr.length === 4 && pr.map((x) => x.n).join(',') === '2,3,4,5', JSON.stringify(pr.map((x) => x.n)));
    ok('Ligne sans CIP : « CIP manquant », non imprimée ; modèle sans valeur → zone vide', pr[1].e === 'CIP manquant' && pr[1].et === 0 && pr[1].mention === '', JSON.stringify(pr[1]));
    ok('Prix illisible : erreur', /Prix illisible : abc/.test(pr[2].e), JSON.stringify(pr[2]));
    ok('Désignation rendue facultative : le produit sans désignation n\'est pas en erreur', pr[3].e === '' && pr[3].nom === '', JSON.stringify(pr[3]));
    ok('Ligne correcte : 2 étiquettes, mention « Rayon R1 / lot A12 »', pr[0].e === '' && pr[0].et === 2 && pr[0].mention === 'Rayon R1 / lot A12', JSON.stringify(pr[0]));
    await p.mouse.move(2, 2);
    const rouge = await p.evaluate(() => { const g = Ext.ComponentQuery.query('etiquetagepro #grilleProduits')[0]; g.getSelectionModel().deselectAll(); const n = g.getView().getNode(1); n.classList.remove('x-grid-row-over', 'x-grid-item-over'); /* survol de la souris : couleur du survol, pas de l'erreur */ return n && /etqp-ligne-erreur/.test(n.className) && getComputedStyle(n.querySelector('.x-grid-cell')).backgroundColor + ' ' + n.className; });
    ok('Lignes en erreur en rouge', String(rouge).startsWith('rgb(253, 236, 234) '), rouge);
    let compte = await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro #compteurs')[0].getEl().dom.textContent);
    ok('Compteurs : 4 lignes, 2 en erreur, 3 étiquettes', /4 ligne\(s\) ; 2 en erreur.*3 étiquette\(s\)/.test(compte), compte);
    /* correction a l'ecran : comme une saisie dans la cellule (edition puis evenement « edit ») */
    await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('etiquetagepro #grilleProduits')[0], ed = g.getPlugin('editionProduits'), r = g.getStore().getAt(2);
      const col = g.headerCt.getGridColumns().find((x) => x.dataIndex === 'PRIX');
      ed.startEdit(r, col); ed.getEditor(r, col).setValue('2 000'); ed.completeEdit();
    });
    await p.waitForFunction(() => !Ext.Ajax.isLoading(), null, { timeout: 15000 }); await p.waitForTimeout(500);
    pr = await produits();
    ok('Prix corrigé dans la cellule → contrôle refait, plus d\'erreur', pr[2].prix === '2 000' && pr[2].e === '' && pr[2].et === 1, JSON.stringify(pr[2]));
    await cliquer('#completer');
    pr = await produits();
    ok('« Compléter depuis Prestige » : désignation et prix du produit ' + PCIP + ' repris (cases vides seulement)', pr[3].nom === PNOM && String(pr[3].prix) === String(PPRIX), JSON.stringify(pr[3]));
    ok('Les cases déjà remplies ne sont pas écrasées', pr[0].nom === 'PRODUIT ESSAI UN' && pr[0].gros === 'LABOREX', JSON.stringify(pr[0]));
    await cliquer('#ajouterLigne');
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('etiquetagepro #grilleProduits')[0]; g.getPlugin('editionProduits').cancelEdit();
      const r = g.getStore().last(); r.set({ CIP: '5555555', DESIGNATION: 'AJOUT MANUEL', PRIX: '300', NOMBRE: '3' }); Ext.ComponentQuery.query('etiquetagepro')[0].controler([r]); });
    await p.waitForFunction(() => !Ext.Ajax.isLoading(), null, { timeout: 15000 }); await p.waitForTimeout(500);
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('etiquetagepro')[0]; const g = c.down('#grilleProduits'); g.getSelectionModel().select(1); });
    await cliquer('#supprimerLigne');
    pr = await produits();
    compte = await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro #compteurs')[0].getEl().dom.textContent);
    ok('Ligne ajoutée (3 étiquettes), ligne en erreur supprimée : 4 lignes, 0 erreur, 7 étiquettes', pr.length === 4 && /4 ligne\(s\) ; 0 en erreur.*7 étiquette\(s\)/.test(compte), compte);
    await p.evaluate(() => { Ext.ComponentQuery.query('etiquetagepro #filtre')[0].setValue('AVERT'); });
    const avert = await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro')[0].produitsStore.getCount());
    await p.evaluate(() => { Ext.ComponentQuery.query('etiquetagepro #filtre')[0].setValue('TOUTES'); });
    ok('Filtre « Avertissements » (aucun ici)', avert === 0, avert);
    await cliquer('#suivant');

    /* ---------------------------------------------------------- 4. impression */
    const resume = await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro #resume')[0].getEl().dom.textContent);
    ok('Étape 4 : 7 étiquettes, 65 par planche, 1 planche', /7 étiquette\(s\), 65 par planche : 1 planche/.test(resume), resume);
    const officine = await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro #officine')[0].getValue());
    ok('Nom de la pharmacie proposé', officine.length > 0, officine);
    let codes = codesDuTest();
    let pdf = await imprimer('#imprimer');
    ok('Code-barres standard : PDF (1 page)', pdf.pdf && /application\/pdf/.test(pdf.type) && pdf.pages === 1, JSON.stringify({ type: pdf.type, taille: pdf.taille, pages: pdf.pages }));
    ok('Code-barres standard : aucun code unique attribué', codesDuTest() === codes, codesDuTest() - codes);
    for (const type of ['DATAMATRIX', 'QR']) {
      await p.evaluate((t) => { Ext.ComponentQuery.query('etiquetagepro #code')[0].setValue({ code: t }); }, type);
      codes = codesDuTest();
      pdf = await imprimer('#imprimer');
      ok(type + ' : PDF, et 7 codes uniques au registre (un par étiquette)', pdf.pdf && pdf.pages === 1 && codesDuTest() - codes === 7, JSON.stringify({ pages: pdf.pages, codes: codesDuTest() - codes }));
    }
    /* format libre 3 x 2 = 6 par page, depart en position 6 : 1 + 6 = 2 pages */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('etiquetagepro')[0]; c.down('#modele').setValue('PERSONNALISE');
      c.down('#KEY_ETIQUETTE_NB_COLONNES').setValue(3); c.down('#KEY_ETIQUETTE_NB_LIGNES').setValue(2); c.down('#KEY_ETIQUETTE_LARGEUR_MM').setValue(63.5); c.down('#KEY_ETIQUETTE_HAUTEUR_MM').setValue(38.1);
      c.down('#position').setValue(6); c.down('#code').setValue({ code: 'CODE128' }); });
    const resume2 = await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro #resume')[0].getEl().dom.textContent);
    ok('Format libre 3 x 2 : 6 par planche, position 6 → 2 planches (1 + 6)', /6 par planche : 2 planche/.test(resume2), resume2);
    pdf = await imprimer('#imprimer');
    ok('Format libre : PDF de 2 pages, réglages de l\'écran envoyés', pdf.pdf && pdf.pages === 2 && pdf.donnees.options.reglages.KEY_ETIQUETTE_NB_COLONNES === '3' && pdf.donnees.options.position === 6, pdf.pages + ' ' + JSON.stringify(pdf.donnees.options));
    const configAvant = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_ETIQUETTE_NB_COLONNES'), '-')");
    pdf = await imprimer('#pageTest');
    ok('Page de test de la planche', pdf.pdf && pdf.pages === 1, pdf.pages);
    ok('Les réglages de l\'écran ne modifient pas la configuration', q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY='KEY_ETIQUETTE_NB_COLONNES'), '-')") === configAvant);

    /* ------------------------------------- correspondance retenue / Excel / saisie */
    await ouvrir();
    await importer(path.join(DOSSIER, 'produits.csv'));
    z = await zones();
    ok('Même forme de fichier : correspondance reprise (zone ajoutée, modèle, obligatoires)', z['Emplacement'] && z['Emplacement'][0] === 'Rayon {Rayon}'
      && z['Mention libre'][0] === '{Emplacement} / lot {N° lot}' && !z['Désignation'][1] && /reprise/.test(await etat()), JSON.stringify(z) + ' ' + await etat());

    /* fichier modele : telecharge depuis l'ecran, puis importe tel quel : chaque colonne va dans sa zone */
    await ouvrir();
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), cliquer('#fichierModele')]);
    const modele = path.join(DOSSIER, 'modele.csv');
    await dl.saveAs(modele);
    const texteModele = fs.readFileSync(modele, 'utf8');
    ok('Fichier modèle téléchargé (une colonne par zone, 2 lignes d\'exemple)', dl.suggestedFilename() === 'etiquettage-pro-modele.csv'
      && texteModele.split(/\r?\n/)[0].replace(/^\ufeff/, '').split(';').length === 11, texteModele.split(/\r?\n/)[0]);
    await importer(modele);
    z = await zones();
    cols = await colonnes();
    ok('Modèle réimporté : toutes les zones prises d\'après les titres, aucune colonne inutilisée', Object.keys(z).every((k) => z[k][0] === '{' + k + '}')
      && cols[0].slice(1).every((r) => r[2].startsWith('→')), JSON.stringify(z));
    await cliquer('#suivant'); await cliquer('#suivant');
    pr = await produits();
    ok('Modèle → 2 produits sans erreur ni avertissement, 4 étiquettes', pr.length === 2 && pr.every((x) => x.e === '' && x.a === '') && pr[0].et + pr[1].et === 4, JSON.stringify(pr));

    await ouvrir();
    await importer(path.join(DOSSIER, 'produits.xlsx'));
    let xl = await p.evaluate(() => { const c = Ext.ComponentQuery.query('etiquetagepro')[0]; return { feuilles: c.down('#feuille').isVisible(), lignes: c.tableau.lignes.length }; });
    ok('Excel : choix de la feuille proposé (2 feuilles), 1re feuille vide', xl.feuilles && xl.lignes === 0, JSON.stringify(xl));
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('etiquetagepro')[0]; c.tableau = null; c.lireFichier('Produits'); });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('etiquetagepro')[0]; return c.tableau && !Ext.Ajax.isLoading(); }, null, { timeout: 30000 });
    await p.waitForTimeout(500);
    xl = await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro')[0].tableau.lignes[0]);
    ok('Excel, feuille « Produits » : EAN entier (jamais en notation scientifique), date jj/mm/aaaa', xl && xl[0] === '7777777' && xl[3] === EAN && xl[4] === '30/06/2030', JSON.stringify(xl));
    await cliquer('#suivant'); await cliquer('#suivant');
    pr = await produits();
    ok('Excel → produits : EAN et péremption repris, sans erreur', pr.length === 1 && pr[0].e === '' && pr[0].cip === '7777777', JSON.stringify(pr));

    await ouvrir();
    await cliquer('#saisie');
    await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro #grilleProduits')[0].getPlugin('editionProduits').cancelEdit());
    await p.evaluate((cip) => { const g = Ext.ComponentQuery.query('etiquetagepro #grilleProduits')[0]; g.getStore().getAt(0).set('CIP', cip); }, PCIP);
    await cliquer('#completer');
    pr = await produits();
    ok('Saisie directe : CIP tapé, complété depuis Prestige', pr.length === 1 && pr[0].nom === PNOM && pr[0].e === '', JSON.stringify(pr));
    await cliquer('#suivant');
    await p.evaluate(() => { Ext.ComponentQuery.query('etiquetagepro #code')[0].setValue({ code: 'QR' }); });
    codes = codesDuTest();
    pdf = await imprimer('#imprimer');
    ok('Saisie directe : QR code imprimé (1 étiquette, 1 code unique)', pdf.pdf && codesDuTest() - codes === 1, codesDuTest() - codes);

    /* ------------------------------------------------------------ garde-fous */
    const vide = await p.evaluate(async () => { const r = await fetch('../api/v1/etiquetage-pro/pdf', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'donnees=' + encodeURIComponent(JSON.stringify({ lignes: [{ valeurs: { DESIGNATION: 'SANS CIP' } }] })) }); return { type: r.headers.get('content-type'), texte: await r.text() }; });
    ok('Rien d\'imprimable : page d\'explication (pas de PDF vide)', /text\/html/.test(vide.type) && /Aucune étiquette à imprimer/.test(vide.texte) && !/Impression impossible/.test(vide.texte), vide.texte.slice(0, 200));
    ok('Rien n\'est écrit dans les fiches articles', empreinteFamilles() === familles);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    try { droit.remettre(); } catch (e) { console.log('droit : ' + e.message); }
    nettoyer();
    ok('Remise en état : codes du test retirés, droit remis', codesDuTest() === 0
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID=rp.lg_PRIVILEGE_ID JOIN t_role_user ru ON ru.lg_ROLE_ID=rp.lg_ROLE_ID JOIN t_user u ON u.lg_USER_ID=ru.lg_USER_ID WHERE u.str_LOGIN='admin' AND p.str_NAME='P_SM_ETIQUETAGE_PRO'") !== '0');
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
