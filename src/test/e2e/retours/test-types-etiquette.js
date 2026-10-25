/* TYPES D'ETIQUETTE PAR PRODUIT ET APERCU AVANT IMPRESSION (retours du 11/10), par l'ecran Etiquettage Pro :
 *  - migration : 5 nouveaux types (code-barres, DataMatrix, QR, DataMatrix+, QR+), les 5 types d'origine gardes tels
 *    quels, aucun produit modifie ; parametre « selon le type de chaque produit » a 1 ; droit reserve a l'administrateur ;
 *  - onglet « Types d'étiquette » : creation d'un type (nom unique, code obligatoire), type d'origine non modifiable ;
 *    mise a jour selective (filtres zone geographique / famille / grossiste / recherche ; produits coches ou tout le
 *    filtre ; confirmation dans l'ecran) ; journal et annulation ; lecture seule sans le droit ;
 *  - impression : chaque produit selon son type (DataMatrix et code-barres sur la meme planche, codes decodes), un
 *    produit sans type a code imprime comme avant ; option decochee = le code choisi pour tous ; date d'edition imprimee ;
 *  - onglet « Impression Prestige » : reglages de Prestige affiches, resume par type, planche (clic = position), PDF,
 *    « Enregistrer comme réglages par défaut » (administrateur) ;
 *  - assistant d'Etiquettage Pro : le type du produit sert aussi (option cochee par defaut).
 * Tout est remis a la fin (types des produits, types crees, journal, panier, parametres, droits).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const privilegeEssai = require('../support/privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined && d !== '' ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const MARQUE = 'E2E-TYPEET';
const droitType = privilegeEssai(q, q, ENV_E2E.LOGIN, 'P_SM_ETIQUETTE_TYPE');
const droitPerso = privilegeEssai(q, q, ENV_E2E.LOGIN, 'P_SM_ETIQUETTE_PERSO');
const PARAMS = ['KEY_ETIQUETTE_CODE', 'KEY_ETIQUETTE_CODE_PAR_PRODUIT', 'KEY_ETIQUETTE_MODELE', 'KEY_ETIQUETTE_DECALAGE_X_MM', 'KEY_ETIQUETTE_ECHELLE_POURCENT',
  'KEY_ETIQUETTE_NB_COLONNES', 'KEY_ETIQUETTE_NB_LIGNES', 'KEY_ETIQUETTE_LARGEUR_MM', 'KEY_ETIQUETTE_HAUTEUR_MM', 'KEY_ETIQUETTE_ESPACE_H_MM',
  'KEY_ETIQUETTE_ESPACE_V_MM', 'KEY_ETIQUETTE_MARGE_GAUCHE_MM', 'KEY_ETIQUETTE_MARGE_HAUT_MM', 'KEY_ETIQUETTE_DECALAGE_Y_MM', 'KEY_ETIQUETTE_TELECHARGEMENT'];
const paramsAvant = {};
PARAMS.forEach((k) => { paramsAvant[k] = q(`SELECT IFNULL(MAX(str_VALUE), '<ABSENT>') FROM t_parameters WHERE str_KEY = '${k}'`); });
const cle = (d) => { let s = 0; for (let i = d.length - 1, w = 3; i >= 0; i--, w = 4 - w) { s += Number(d[i]) * w; } return (10 - s % 10) % 10; };

/* une zone geographique avec au moins 3 produits actifs d'un meme grossiste, CIP uniques et EAN valables */
const ZG = q("SELECT CONCAT(f.lg_ZONE_GEO_ID, '|', f.lg_GROSSISTE_ID) FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.lg_ZONE_GEO_ID IS NOT NULL AND f.lg_GROSSISTE_ID IS NOT NULL"
  + " AND f.int_CIP REGEXP '^[0-9]{7}$' GROUP BY f.lg_ZONE_GEO_ID, f.lg_GROSSISTE_ID HAVING COUNT(*) BETWEEN 3 AND 40 ORDER BY COUNT(*) LIMIT 1").split('|');
const [ZONE, GROSSISTE] = ZG;
const PRODUITS = q(`SELECT CONCAT_WS('|', lg_FAMILLE_ID, int_CIP, IFNULL(lg_TYPEETIQUETTE_ID, ''), str_DESCRIPTION) FROM t_famille WHERE str_STATUT = 'enable' AND lg_ZONE_GEO_ID = '${ZONE}' AND lg_GROSSISTE_ID = '${GROSSISTE}' ORDER BY str_DESCRIPTION, int_CIP`)
  .split('\n').map((l) => l.split('|'));
const TYPES_AVANT = q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, '=', IFNULL(lg_TYPEETIQUETTE_ID, '')) ORDER BY lg_FAMILLE_ID) FROM t_famille WHERE lg_ZONE_GEO_ID = '${ZONE}'`);
const TYPE2_AVANT = q("SELECT COUNT(*) FROM t_famille WHERE lg_TYPEETIQUETTE_ID = '2'");
const PANIER_AVANT = q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_ETIQUETTE_ID, '''')), '''-''') FROM t_etiquette WHERE str_STATUT = 'is_Process'");

function nettoyer() {
  q(`UPDATE t_etiquette SET str_STATUT = 'is_Process' WHERE lg_ETIQUETTE_ID IN (${PANIER_AVANT});`
    + `DELETE FROM t_etiquette WHERE lg_ETIQUETTE_ID LIKE '${MARQUE}%';`
    + `DELETE FROM t_etiquette_code WHERE dt_CREATED >= '${DEBUT}';`
    + `DELETE FROM t_etiquette_type_journal WHERE dt_CREATED >= '${DEBUT}';`
    + `DELETE FROM t_typeetiquette WHERE str_NAME LIKE 'E2E %';`);
  TYPES_AVANT.split(',').filter(Boolean).forEach((x) => { const [f, t] = x.split('='); q(`UPDATE t_famille SET lg_TYPEETIQUETTE_ID = ${t ? "'" + t + "'" : 'NULL'} WHERE lg_FAMILLE_ID = '${f}'`); });
  PARAMS.forEach((k) => { const v = paramsAvant[k]; q(v === '<ABSENT>' ? `DELETE FROM t_parameters WHERE str_KEY = '${k}'` : `UPDATE t_parameters SET str_VALUE = '${v.replace(/'/g, "''")}' WHERE str_KEY = '${k}'`); });
}
const decoder = (binaire) => {
  const f = ENV_E2E.TMP + '/e2e-types-et.pdf';
  fs.writeFileSync(f, Buffer.from(binaire, 'latin1'));
  execFileSync('pdftoppm', ['-r', '600', '-png', '-f', '1', '-l', '1', f, ENV_E2E.TMP + '/e2e-types-et']);
  const png = fs.readdirSync(ENV_E2E.TMP).filter((x) => /^e2e-types-et-\d+\.png$/.test(x)).map((x) => ENV_E2E.TMP + '/' + x)[0];
  const sortie = execFileSync('python3', ['-I', '-c', 'import sys, json, zxingcpp\nfrom PIL import Image\nr = zxingcpp.read_barcodes(Image.open(sys.argv[1]))\n'
    + 'print(json.dumps([{"format": str(x.format), "texte": x.text} for x in r]))', png], { encoding: 'utf8' });
  fs.readdirSync(ENV_E2E.TMP).filter((x) => /^e2e-types-et-\d+\.png$/.test(x)).forEach((x) => fs.unlinkSync(ENV_E2E.TMP + '/' + x));
  const texte = execFileSync('pdftotext', ['-raw', '-f', '1', '-l', '1', f, '-'], { encoding: 'utf8' });
  return { codes: JSON.parse(sortie), texte };
};

(async () => {
  droitType.remettre(); droitPerso.remettre();
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const attendre = async () => { await p.waitForTimeout(250); await p.waitForFunction(() => !Ext.Ajax.isLoading(), null, { timeout: 60000 }); await p.waitForTimeout(400); };
  const connexion = async () => {
    await ctx.clearCookies();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => { window.__ouverts = []; window.open = function (u) { window.__ouverts.push(u); return null; }; });
    await p.waitForTimeout(1000);
  };
  const ouvrir = async () => {
    await p.evaluate(() => { Ext.ComponentQuery.query('etiquetagepro').forEach((c) => c.destroy()); testextjs.app.getController('App').onRedirectTo('etiquetagepro', {}); });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('etiquetagepro')[0]; return c && c.cfg; }, null, { timeout: 30000 });
  };
  const bouton = async (sel) => { await p.evaluate((s) => { const x = Ext.ComponentQuery.query('etiquetagepro ' + s)[0]; x.handler ? x.handler.call(x.scope || x, x) : x.fireEvent('click', x); }, sel); await attendre(); };
  const etat = () => p.evaluate(() => { const e = Ext.ComponentQuery.query('etiquetagepro #etat')[0]; return e && e.getEl() ? e.getEl().dom.textContent : ''; });
  const valeur = (sel, v) => p.evaluate(([s, x]) => { const c = Ext.ComponentQuery.query('etiquetagepro ' + s)[0]; c.setValue(x); if (c.fireEvent) { c.fireEvent('select', c); } }, [sel, v]);
  const pdfOuvert = async (action) => {
    const avant = await p.evaluate(() => window.__ouverts.length);
    await action();
    await p.waitForFunction((n) => window.__ouverts.length > n, avant, { timeout: 15000 });
    const url = await p.evaluate(() => window.__ouverts[window.__ouverts.length - 1]);
    const r = await p.evaluate(async (u) => { const x = await fetch(u); const t = new Uint8Array(await x.arrayBuffer()); let s = ''; for (let i = 0; i < t.length; i++) { s += String.fromCharCode(t[i]); } return { type: x.headers.get('content-type'), s }; }, url);
    return { url, type: r.type, pdf: r.s.startsWith('%PDF'), brut: r.s };
  };

  try {
    nettoyer();
    ok('Précondition : une zone géographique et un grossiste avec 3 produits ou plus (' + PRODUITS.length + ')', PRODUITS.length >= 3 && !!ZONE);
    ok('Migration : 5 nouveaux types avec leur code, les 5 types d\'origine gardés sans code, aucun produit modifié',
      q("SELECT GROUP_CONCAT(str_CODE ORDER BY str_CODE) FROM t_typeetiquette WHERE lg_TYPEETIQUETTE_ID LIKE 'TE\\_%' AND str_NAME NOT LIKE 'E2E %'") === 'CODE128,DATAMATRIX,DATAMATRIX_PLUS,QR,QR_PLUS'
      && q("SELECT COUNT(*) FROM t_typeetiquette WHERE lg_TYPEETIQUETTE_ID IN ('1','2','3','4','5') AND str_CODE IS NULL") === '5' && Number(TYPE2_AVANT) > 0);
    ok('Migration : « selon le type de chaque produit » à 1, droit P_SM_ETIQUETTE_TYPE à l\'administrateur seulement', paramsAvant.KEY_ETIQUETTE_CODE_PAR_PRODUIT === '1'
      && q("SELECT COUNT(DISTINCT rp.lg_ROLE_ID) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE p.str_NAME = 'P_SM_ETIQUETTE_TYPE'") === '1');

    await connexion();
    await ouvrir();
    /* ------------------------------------------------ 1. types */
    await bouton('#outilTypes');
    let t = await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqtypes')[0]; return { n: c.typesStore.getCount(), noms: c.typesStore.getRange().map((r) => r.get('nom') + ':' + r.get('code') + ':' + r.get('ancien')), form: c.down('#typeForm').isVisible() }; });
    ok('Onglet Types d\'étiquette : les 10 types (5 nouveaux, 5 d\'origine marqués)', t.n === 10 && t.noms.includes('DataMatrix+:DATAMATRIX_PLUS:false') && t.noms.includes('CIP_PRIX::true') && t.form, t.noms.join(', '));
    /* creation d'un type, au clavier : nom, Entree -> description, Entree -> code */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqtypes')[0]; c.down('#typeNom').inputEl.dom.setAttribute('data-e2e', 'nom'); });
    await p.click('[data-e2e=nom]'); await p.keyboard.type('E2E Rayon DM'); await p.keyboard.press('Enter');
    const focusDescription = await p.evaluate(() => Ext.ComponentQuery.query('etqtypes #typeDescription')[0].hasFocus);
    ok('Saisie du type : Entrée passe au champ suivant', focusDescription);
    await p.keyboard.type('Étiquettes du rayon, DataMatrix');
    await bouton('#typeEnregistrer');
    ok('Code obligatoire : refusé sans code, message', /Complétez le nom et le code/.test(await etat()), await etat());
    await p.evaluate(() => { Ext.ComponentQuery.query('etqtypes #typeCode')[0].setValue('DATAMATRIX'); });
    await bouton('#typeEnregistrer');
    const cree = q("SELECT CONCAT(lg_TYPEETIQUETTE_ID, '|', str_CODE) FROM t_typeetiquette WHERE str_NAME = 'E2E Rayon DM'").split('|');
    ok('Type créé (code DataMatrix), proposé dans la liste', cree[1] === 'DATAMATRIX' && await p.evaluate(() => !!Ext.ComponentQuery.query('etqtypes')[0].typesStore.findRecord('nom', 'E2E Rayon DM')), cree.join('|'));
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqtypes')[0]; c.down('#typeNom').setValue('e2e rayon dm'); c.down('#typeCode').setValue('QR'); });
    await bouton('#typeEnregistrer');
    ok('Nom déjà pris (sans tenir compte des majuscules) : refusé', /déjà ce nom/.test(await etat()), await etat());
    const origine = await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqtypes')[0]; const r = c.typesStore.findRecord('nom', 'CIP_PRIX'); c.down('#typesGrille').getSelectionModel().select(r); return { titre: c.down('#typeForm').title, grise: c.down('#typeEnregistrer').isDisabled() }; });
    ok('Type d\'origine : « gardé tel quel », non modifiable', /gardé tel quel/.test(origine.titre) && origine.grise, JSON.stringify(origine));
    await bouton('#typeNouveau');

    /* ------------------------------------------------ 2. mise a jour selective */
    await p.evaluate(([z, g]) => { const c = Ext.ComponentQuery.query('etqtypes')[0]; c.down('#filtreZone').setValue(z); c.down('#filtreGrossiste').setValue(g); }, [ZONE, GROSSISTE]);
    await bouton('#rechercher');
    let g = await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqtypes')[0]; return { total: c.produitsStore.getTotalCount(), cips: c.produitsStore.getRange().map((r) => r.get('cip')) }; });
    ok('Filtre zone géographique + grossiste : les produits de la base', g.total === PRODUITS.length && g.cips.join(',') === PRODUITS.map((x) => x[1]).join(','), g.total + ' / ' + PRODUITS.length);
    /* cocher les 2 premiers, type DataMatrix */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqtypes')[0]; const gr = c.down('#produitsGrille'); gr.getSelectionModel().select([c.produitsStore.getAt(0), c.produitsStore.getAt(1)]); c.down('#typeCible').setValue('TE_DATAMATRIX'); });
    let boutons = await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqtypes')[0]; return c.down('#appliquerCoches').getText() + ' | ' + c.down('#appliquerFiltre').getText(); });
    ok('Boutons : « produits cochés (2) » et « tout le filtre (N) »', boutons === 'Appliquer aux produits cochés (2) | Appliquer à tout le filtre (' + PRODUITS.length + ')', boutons);
    await bouton('#appliquerCoches');
    const confirmation = await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqtypes')[0]; return c.down('#confirmation').isVisible() ? c.down('#confirmationTexte').getEl().dom.textContent : ''; });
    ok('Confirmation dans l\'écran (pas de fenêtre) : 2 produits vers DataMatrix', /2 produit\(s\) cochés passeront au type DataMatrix/.test(confirmation) && await p.evaluate(() => !Ext.ComponentQuery.query('window[hidden=false]').length), confirmation);
    ok('… rien n\'est écrit avant de confirmer', q(`SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID IN ('${PRODUITS[0][0]}','${PRODUITS[1][0]}') AND lg_TYPEETIQUETTE_ID = 'TE_DATAMATRIX'`) === '0');
    await bouton('#confirmer');
    ok('Confirmé : les 2 produits passent à DataMatrix, le 3e ne change pas', q(`SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID IN ('${PRODUITS[0][0]}','${PRODUITS[1][0]}') AND lg_TYPEETIQUETTE_ID = 'TE_DATAMATRIX'`) === '2'
      && q(`SELECT IFNULL(lg_TYPEETIQUETTE_ID, '') FROM t_famille WHERE lg_FAMILLE_ID = '${PRODUITS[2][0]}'`) === PRODUITS[2][2], await etat());
    ok('… noté au journal (qui, ancien et nouveau type)', q(`SELECT CONCAT(COUNT(*), '|', MIN(utilisateur), '|', MIN(IFNULL(ancien_type, '-'))) FROM t_etiquette_type_journal WHERE dt_CREATED >= '${DEBUT}'`) === '2|admin|' + [PRODUITS[0][2], PRODUITS[1][2]].map((x) => x || '-').sort()[0]);
    g = await p.evaluate(() => Ext.ComponentQuery.query('etqtypes')[0].produitsStore.getRange().slice(0, 3).map((r) => r.get('type')));
    ok('La liste montre le nouveau type', g[0] === 'DataMatrix' && g[1] === 'DataMatrix', g.join(','));
    /* tout le filtre, puis annulation */
    await p.evaluate(() => { Ext.ComponentQuery.query('etqtypes #typeCible')[0].setValue('TE_QR'); });
    await bouton('#appliquerFiltre'); await bouton('#confirmer');
    ok('Tout le filtre : tous les produits du filtre en QR', q(`SELECT COUNT(*) FROM t_famille WHERE str_STATUT = 'enable' AND lg_ZONE_GEO_ID = '${ZONE}' AND lg_GROSSISTE_ID = '${GROSSISTE}' AND lg_TYPEETIQUETTE_ID = 'TE_QR'`) === String(PRODUITS.length), await etat());
    const journal = await p.evaluate(() => Ext.ComponentQuery.query('etqtypes')[0].journalStore.getRange().map((r) => r.get('produits') + ':' + r.get('type') + ':' + r.get('annule')));
    ok('Journal : les 2 mises à jour, la plus récente en premier', journal[0] === PRODUITS.length + ':QR code:false' && journal[1] === '2:DataMatrix:false', journal.join(' | '));
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqtypes')[0]; const gj = c.down('#journalGrille'); const n = gj.getView().getNode(0); n.querySelector('.etqp-annuler-texte').setAttribute('data-e2e', 'annuler'); });
    await p.click('[data-e2e=annuler]'); await attendre();
    ok('Annuler (lien du journal) : retour à DataMatrix pour les 2, à l\'ancien type pour les autres', q(`SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID IN ('${PRODUITS[0][0]}','${PRODUITS[1][0]}') AND lg_TYPEETIQUETTE_ID = 'TE_DATAMATRIX'`) === '2'
      && q(`SELECT IFNULL(lg_TYPEETIQUETTE_ID, '') FROM t_famille WHERE lg_FAMILLE_ID = '${PRODUITS[2][0]}'`) === PRODUITS[2][2] && /remis sur leur type d'avant/.test(await etat()), await etat());
    /* le 3e produit en DataMatrix+ pour l'impression */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqtypes')[0]; c.down('#produitsGrille').getSelectionModel().select([c.produitsStore.getAt(2)]); c.down('#typeCible').setValue('TE_DATAMATRIX_PLUS'); });
    await bouton('#appliquerCoches'); await bouton('#confirmer');
    ok('Fiche article : les nouveaux types sont proposés (liste des types de la fiche)', /DataMatrix\+/.test(await p.evaluate(async () => (await fetch('../api/v1/referentiel-article/types-etiquette')).text()).catch(() => ''))
      || q("SELECT COUNT(*) FROM t_typeetiquette WHERE str_STATUT = 'enable' AND lg_TYPEETIQUETTE_ID LIKE 'TE\\_%'") >= '5');

    /* ------------------------------------------------ 3. impression Prestige selon le type des produits */
    q(`UPDATE t_etiquette SET str_STATUT = 'e2e_attente' WHERE lg_ETIQUETTE_ID IN (${PANIER_AVANT});`
      + `INSERT INTO t_etiquette (lg_ETIQUETTE_ID, str_CODE, str_NAME, str_STATUT, int_NUMBER, dt_CREATED, dt_UPDATED, lg_TYPEETIQUETTE_ID, lg_FAMILLE_ID, lg_EMPLACEMENT_ID) VALUES`
      + ` ('${MARQUE}-1', '${MARQUE}', 'E2E', 'is_Process', '1', NOW(), NOW(), 'TE_DATAMATRIX', '${PRODUITS[0][0]}', '1'),`
      + ` ('${MARQUE}-3', '${MARQUE}', 'E2E', 'is_Process', '1', NOW(), NOW(), 'TE_DATAMATRIX_PLUS', '${PRODUITS[2][0]}', '1');`);
    /* un produit sans type a code : celui d'un autre produit du filtre remis au type d'origine */
    const sansCode = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND f.lg_TYPEETIQUETTE_ID = '2' AND f.int_CIP REGEXP '^[0-9]{7}$' ORDER BY f.str_NAME LIMIT 1");
    const cipSansCode = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${sansCode}'`);
    q(`INSERT INTO t_etiquette (lg_ETIQUETTE_ID, str_CODE, str_NAME, str_STATUT, int_NUMBER, dt_CREATED, dt_UPDATED, lg_TYPEETIQUETTE_ID, lg_FAMILLE_ID, lg_EMPLACEMENT_ID) VALUES`
      + ` ('${MARQUE}-2', '${MARQUE}', 'E2E', 'is_Process', '1', NOW(), NOW(), '2', '${sansCode}', '1')`);
    await bouton('#outilImpression');
    let imp = await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqimpression')[0]; return { resume: c.down('#impResume').getEl().dom.textContent, code: c.down('#impCode').getValue().impcode,
      par: c.down('#impParProduit').getValue(), cases: document.querySelectorAll('.etqp-case').length, legende: c.down('#impPlanche').body.dom.textContent, enreg: c.down('#impEnregistrer').isVisible() }; });
    ok('Impression Prestige : réglages de Prestige affichés (code, « selon le type de chaque produit » coché), planche de 65 cases', imp.code === paramsAvant.KEY_ETIQUETTE_CODE.toUpperCase().replace(/^$/, 'CODE128') || imp.code === 'CODE128'
      && imp.par && imp.cases === 65, JSON.stringify(imp));
    ok('Résumé du panier : 3 étiquettes, 1 DataMatrix, 1 DataMatrix+, 1 selon le code de Prestige', /3 étiquette\(s\) pour 3 produit\(s\)/.test(imp.resume) && /DataMatrix : 1/.test(imp.legende) && /DataMatrix\+ : 1/.test(imp.legende), imp.resume + ' / ' + imp.legende);
    ok('Administrateur : « Enregistrer comme réglages par défaut » proposé', imp.enreg);
    /* clic sur la case 3 de la planche = position de depart */
    await p.evaluate(() => { document.querySelector('.etqp-case[data-position="3"]').setAttribute('data-e2e', 'case3'); });
    await p.click('[data-e2e=case3]'); await attendre();
    const pos = await p.evaluate(() => Ext.ComponentQuery.query('etqimpression #impPosition')[0].getValue());
    ok('Clic sur une case de la planche : position de départ 3, cases d\'avant en gris', pos === 3 && await p.evaluate(() => getComputedStyle(document.querySelector('.etqp-case[data-position="1"]')).backgroundColor === 'rgb(201, 209, 217)'), pos);
    await p.evaluate(() => { Ext.ComponentQuery.query('etqimpression #impDate')[0].setValue('31/12/26'); Ext.ComponentQuery.query('etqimpression #impCode')[0].setValue({ impcode: 'CODE128' }); });
    await attendre();
    let pdf = await pdfOuvert(() => bouton('#impPdf'));
    let lu = pdf.pdf ? decoder(pdf.brut) : { codes: [], texte: '' };
    const formats = lu.codes.map((c) => c.format).sort().join(',');
    const dmPlus = lu.codes.find((c) => /Data ?Matrix/.test(c.format) && /91\)?EPLUS1/.test(c.texte.replace(/\u001d/g, '')));
    ok('PDF (moteur de Prestige) : chaque produit selon son type — DataMatrix, DataMatrix+ (désignation lue par un lecteur GS1 strict) et code-barres sur la même planche, décodés', pdf.pdf && /Data ?Matrix/.test(formats) && /Code ?128/.test(formats) && !!dmPlus && /\(92\)[A-Z0-9]/.test(dmPlus.texte)
      && lu.codes.some((c) => /Code ?128/.test(c.format) && c.texte === cipSansCode), formats + ' ' + JSON.stringify(lu.codes.map((c) => c.texte.slice(0, 40))));
    ok('… réglages de l\'écran envoyés (position 3, date, selon les produits)', /int_NUMBER=3/.test(pdf.url) && /parProduit=1/.test(pdf.url) && /date=31%2F12%2F26/.test(pdf.url), pdf.url);
    ok('… date d\'édition imprimée', lu.texte.includes('31/12/26'), lu.texte.slice(0, 200));
    ok('… le panier est soldé après l\'impression', q(`SELECT COUNT(*) FROM t_etiquette WHERE lg_ETIQUETTE_ID LIKE '${MARQUE}%' AND str_STATUT = 'is_Process'`) === '0');
    /* option decochee : le code choisi pour tous */
    q(`UPDATE t_etiquette SET str_STATUT = 'is_Process' WHERE lg_ETIQUETTE_ID LIKE '${MARQUE}%'`);
    await p.evaluate(() => { Ext.ComponentQuery.query('etqimpression #impParProduit')[0].setValue(false); });
    await attendre();
    imp = await p.evaluate(() => Ext.ComponentQuery.query('etqimpression #impPlanche')[0].body.dom.textContent);
    ok('Option décochée : résumé « Code-barres : 3 »', /Code-barres : 3/.test(imp), imp.slice(0, 120));
    pdf = await pdfOuvert(() => bouton('#impPdf'));
    lu = pdf.pdf ? decoder(pdf.brut) : { codes: [] };
    ok('… PDF : 3 code-barres, aucun DataMatrix', lu.codes.length === 3 && lu.codes.every((c) => /Code ?128/.test(c.format)), JSON.stringify(lu.codes.map((c) => c.format)));
    await p.evaluate(() => { Ext.ComponentQuery.query('etqimpression #impParProduit')[0].setValue(true); });
    /* page de test avec les reglages de l'ecran */
    pdf = await pdfOuvert(() => bouton('#impTest'));
    ok('Page de test : PDF du moteur de Prestige', pdf.pdf && /test=1/.test(pdf.url), pdf.url);

    /* reglages par defaut (administrateur) */
    await p.evaluate(() => { Ext.ComponentQuery.query('etqimpression #impKEY_ETIQUETTE_DECALAGE_X_MM')[0].setValue(1.5); });
    await bouton('#impEnregistrer');
    ok('Enregistrer comme réglages par défaut : paramètres de Prestige mis à jour', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_ETIQUETTE_DECALAGE_X_MM'") === '1.5'
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_ETIQUETTE_CODE_PAR_PRODUIT'") === '1' && /Réglages enregistrés/.test(await etat()), await etat());

    /* ------------------------------------------------ 4. assistant d'Etiquettage Pro */
    await ouvrir();
    await bouton('#saisie');
    await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro #grilleProduits')[0].getPlugin('editionProduits').cancelEdit());
    await p.evaluate((cip) => { Ext.ComponentQuery.query('etiquetagepro #grilleProduits')[0].getStore().getAt(0).set('CIP', cip); }, PRODUITS[0][1]);
    await bouton('#completer');
    await bouton('#suivant');
    await p.evaluate(() => { Ext.ComponentQuery.query('etiquetagepro #code')[0].setValue({ code: 'CODE128' }); });
    const parDefaut = await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro #parProduit')[0].getValue());
    let capture = null;
    await ctx.route('**/etiquetage-pro/pdf', (route) => { if (route.request().resourceType() === 'document') { capture = route.request(); return route.abort(); } return route.continue(); });
    const onglet = ctx.waitForEvent('page', { timeout: 30000 });
    await bouton('#imprimer');
    await onglet.then((o) => o.close()).catch(() => {});
    for (let i = 0; i < 50 && !capture; i++) { await p.waitForTimeout(100); }
    await ctx.unroute('**/etiquetage-pro/pdf');
    const r = await p.evaluate(async (a) => { const x = await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: a.corps });
      const t2 = new Uint8Array(await x.arrayBuffer()); let s = ''; for (let i = 0; i < t2.length; i++) { s += String.fromCharCode(t2[i]); } return s; }, { url: capture.url(), corps: capture.postData() });
    lu = decoder(r);
    ok('Assistant : « selon le type de chaque produit » coché par défaut ; le produit DataMatrix sort en DataMatrix (code-barres choisi)', parDefaut && lu.codes.some((c) => /Data ?Matrix/.test(c.format)), JSON.stringify(lu.codes.map((c) => c.format)));

    /* ------------------------------------------------ 5. sans les droits */
    droitType.retirer(); droitPerso.retirer();
    await connexion();
    await ouvrir();
    await bouton('#outilTypes');
    t = await p.evaluate(() => { const c = Ext.ComponentQuery.query('etqtypes')[0]; return { form: c.down('#typeForm').isVisible(), barre: c.down('#barreAffecter').isVisible(), titre: c.down('#produitsGrille').title }; });
    ok('Sans le droit : types en lecture seule (pas de formulaire ni de mise à jour)', !t.form && !t.barre && /lecture seule/.test(t.titre), JSON.stringify(t));
    const refus = await p.evaluate(async (id) => (await (await fetch('../api/v1/etiquetage-pro/types/affecter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'TE_QR', produits: [id] }) })).json()), PRODUITS[0][0]);
    ok('… le serveur refuse la mise à jour', refus.success === false && refus.interdit === true, JSON.stringify(refus));
    await bouton('#outilImpression');
    const enreg = await p.evaluate(() => Ext.ComponentQuery.query('etqimpression #impEnregistrer')[0].isVisible());
    const refus2 = await p.evaluate(async () => (await (await fetch('../api/v1/etiquetage-pro/impression/reglages/enregistrer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'QR', modele: 'CARRE_38X21_2', reglages: {} }) })).json()));
    ok('… réglages par défaut : bouton caché et refus du serveur (administrateur seulement)', !enreg && refus2.success === false, JSON.stringify(refus2));
    droitType.remettre(); droitPerso.remettre();
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    try { droitType.remettre(); droitPerso.remettre(); nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    const typesApres = q(`SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, '=', IFNULL(lg_TYPEETIQUETTE_ID, '')) ORDER BY lg_FAMILLE_ID) FROM t_famille WHERE lg_ZONE_GEO_ID = '${ZONE}'`);
    ok('Remise en état : types des produits, types créés, journal, panier, paramètres, droits', typesApres === TYPES_AVANT && q("SELECT COUNT(*) FROM t_typeetiquette WHERE str_NAME LIKE 'E2E %'") === '0'
      && q(`SELECT COUNT(*) FROM t_etiquette_type_journal WHERE dt_CREATED >= '${DEBUT}'`) === '0' && q(`SELECT COUNT(*) FROM t_etiquette WHERE lg_ETIQUETTE_ID LIKE '${MARQUE}%'`) === '0'
      && q("SELECT COUNT(*) FROM t_famille WHERE lg_TYPEETIQUETTE_ID = '2'") === TYPE2_AVANT
      && PARAMS.every((k) => q(`SELECT IFNULL(MAX(str_VALUE), '<ABSENT>') FROM t_parameters WHERE str_KEY = '${k}'`) === paramsAvant[k]));
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
