/* PASSERELLE DES ANCIENS BOUTONS D'IMPRESSION D'ETIQUETTES (retours du 11/10) : « tout le monde passe par Etiquettage
 * Pro ; si aucune donnee, on imprime comme l'existant directement pour eviter de casser un processus fonctionnel ».
 *  - etiquetage massif (panier) : apercu d'Etiquettage Pro, source « panier », position et code de l'ancien ecran ;
 *    l'impression part de l'apercu ; panier vide -> impression historique directe, retour a la liste comme avant ;
 *  - ligne de la gestion des etiquettes : apercu, source « ligne » ;
 *  - etats de controle › reediter les etiquettes d'une entree en stock : apercu, bon de livraison choisi ;
 *  - sans le droit Etiquettage Pro : impression historique directe (ligne, bon de livraison).
 * Etiquettes d'essai retirees et panier d'origine remis a la fin ; droit remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const MARQUE = 'E2E-PASS';
const droitPro = privilegeEssai(q, q, 'admin', 'P_SM_ETIQUETAGE_PRO');
const PANIER_AVANT = q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_ETIQUETTE_ID, '''')), '''-''') FROM t_etiquette WHERE str_STATUT = 'is_Process'");
const PROD = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$' ORDER BY f.str_NAME LIMIT 2").split('\n');
const BL = q("SELECT b.lg_BON_LIVRAISON_ID FROM t_bon_livraison b JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID"
  + " WHERE b.str_STATUT <> 'delete' GROUP BY b.lg_BON_LIVRAISON_ID HAVING SUM(d.int_QTE_RECUE) > 0 ORDER BY b.dt_DATE_LIVRAISON DESC LIMIT 1");
const QTE_BL = q(`SELECT SUM(int_QTE_RECUE) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}'`);

function nettoyer() {
  q(`DELETE FROM t_etiquette WHERE lg_ETIQUETTE_ID LIKE '${MARQUE}%';`
    + `UPDATE t_etiquette SET str_STATUT = 'is_Process' WHERE lg_ETIQUETTE_ID IN (${PANIER_AVANT});`);
}

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const err = [];
  const session = async () => {
    const c = await b.newContext({ viewport: { width: 1500, height: 950 } });
    const p = await c.newPage(); p.on('pageerror', (e) => err.push(String(e.stack || e.message).slice(0, 600)));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    /* les PDF s'ouvrent dans un onglet : on garde l'adresse demandee */
    await p.evaluate(() => { window.__ouverts = []; window.open = function (u) { window.__ouverts.push(u); return null; }; });
    return { c, p };
  };
  const ouverts = (p) => p.evaluate(() => window.__ouverts.slice());
  const apercu = (p) => p.evaluate(() => { const v = Ext.ComponentQuery.query('etqimpression')[0];
    return v && v.isVisible(true) && v.etat ? { source: v.source(), total: v.etat.total, position: v.down('#impPosition').getValue(), code: v.down('#impCode').getValue().impcode,
      bon: v.down('#impBon').getValue(), ecran: Ext.ComponentQuery.query('etiquetagepro').length === 1 } : null; });
  const attendreApercu = (p) => p.waitForFunction(() => { const v = Ext.ComponentQuery.query('etqimpression')[0]; return v && v.isVisible(true) && v.etat && v.etat.total >= 0 && !v.getEl().isMasked(); }, null, { timeout: 20000 });
  /* etiquetage massif : ecran « doEtiquette », position et code, bouton Imprimer puis « Oui » */
  const imprimerPanier = async (p, position, code) => {
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('doEtiquette', 'Etiquettage massif', '0'));
    await p.waitForFunction(() => Ext.getCmp('int_NUMBER') && Ext.getCmp('code_ETIQUETTE_MASSIF') && Ext.getCmp('int_NUMBER').rendered, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.evaluate(([pos, c]) => { Ext.getCmp('int_NUMBER').setValue(pos); Ext.getCmp('code_ETIQUETTE_MASSIF').setValue(c);
      Ext.ComponentQuery.query('doEtiquette button[text=Imprimer]')[0].btnEl.dom.setAttribute('data-e2e', 'imprimer'); }, [position, code]);
    await p.click('[data-e2e=imprimer]');
    await p.waitForFunction(() => Ext.MessageBox.isVisible(), null, { timeout: 10000 });
    await p.evaluate(() => { Ext.MessageBox.msgButtons.yes.btnEl.dom.setAttribute('data-e2e', 'oui'); });
    await p.click('[data-e2e=oui]');
  };
  /* etats de controle › « Reediter les etiquettes de cette entree en stock » : la fenetre de l'ecran, bouton Imprimer */
  const imprimerBon = async (p, position) => {
    await p.evaluate((bl) => new testextjs.view.stockmanagement.etiquette.action.add({ odatasource: bl, parentview: null, mode: 'printer', titre: 'Edition d\'etiquette' }), BL);
    await p.waitForFunction(() => Ext.getCmp('int_NUMBER') && Ext.getCmp('int_NUMBER').isVisible(), null, { timeout: 10000 });
    await p.evaluate((pos) => { Ext.getCmp('int_NUMBER').setValue(pos); Ext.getCmp('int_NUMBER').up('window').down('button[text=Imprimer]').btnEl.dom.setAttribute('data-e2e', 'impbl'); }, position);
    await p.click('[data-e2e=impbl]');
  };
  /* gestion des etiquettes : icone d'edition de la ligne, fenetre, Enregistrer */
  const imprimerLigne = async (p, code) => {
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('etiquette', 'Gestion des étiquettes', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('etiquette')[0] && Ext.getCmp('rechecher') && Ext.getCmp('rechecher').rendered, null, { timeout: 30000 });
    await p.click('#rechecher-inputEl'); await p.keyboard.type(MARQUE); await p.keyboard.press('Enter');
    await p.waitForFunction((et) => { const g = Ext.ComponentQuery.query('etiquette')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_ETIQUETTE_ID', et) >= 0; }, MARQUE + '-L', { timeout: 30000 });
    await p.evaluate((et) => { const g = Ext.ComponentQuery.query('etiquette')[0]; g.getView().getNode(g.getStore().findExact('lg_ETIQUETTE_ID', et)).setAttribute('data-e2e', 'et'); }, MARQUE + '-L');
    await p.locator('[data-e2e=et] img[data-qtip="Editer une etiquette"]').click({ force: true });
    await p.waitForFunction(() => !!Ext.getCmp('code_ETIQUETTE_LIGNE') && Ext.getCmp('intQUANTITY'), null, { timeout: 15000 });
    await p.evaluate((c) => { Ext.getCmp('code_ETIQUETTE_LIGNE').setValue(c); Ext.getCmp('intQUANTITY').setValue(7);
      Ext.getCmp('code_ETIQUETTE_LIGNE').up('window').down('button[text=Enregistrer]').btnEl.dom.setAttribute('data-e2e', 'impl'); }, code);
    await p.click('[data-e2e=impl]');
  };
  try {
    droitPro.remettre();
    nettoyer();
    ok('Préconditions : 2 produits, un bon de livraison reçu (' + QTE_BL + ' boîtes)', PROD.length === 2 && BL && Number(QTE_BL) > 0);
    q(`UPDATE t_etiquette SET str_STATUT = 'e2e_attente' WHERE lg_ETIQUETTE_ID IN (${PANIER_AVANT});`
      + `INSERT INTO t_etiquette (lg_ETIQUETTE_ID, str_CODE, str_NAME, str_STATUT, int_NUMBER, dt_CREATED, dt_UPDATED, lg_TYPEETIQUETTE_ID, lg_FAMILLE_ID, lg_EMPLACEMENT_ID) VALUES`
      + ` ('${MARQUE}-1', '${MARQUE}', 'E2E', 'is_Process', '2', NOW(), NOW(), '2', '${PROD[0]}', '1'),`
      + ` ('${MARQUE}-2', '${MARQUE}', 'E2E', 'is_Process', '1', NOW(), NOW(), '2', '${PROD[1]}', '1'),`
      + ` ('${MARQUE}-L', '${MARQUE}', 'E2E', 'enable', '1', NOW(), NOW(), '2', '${PROD[0]}', '1');`);
    let s = await session(), p = s.p;

    /* ---------------------------------------------------------------- panier */
    await imprimerPanier(p, 3, 'DATAMATRIX');
    await attendreApercu(p);
    let a = await apercu(p);
    ok('Étiquetage massif › Imprimer : l\'aperçu d\'Étiquettage Pro s\'ouvre (source panier, position 3, DataMatrix, 3 étiquettes)',
      a && a.ecran && a.source === 'PANIER' && a.position === 3 && a.code === 'DATAMATRIX' && a.total === 3, JSON.stringify(a));
    ok('… rien n\'est imprimé tant que l\'aperçu n\'est pas validé', (await ouverts(p)).length === 0, JSON.stringify(await ouverts(p)));
    await p.evaluate(() => { Ext.ComponentQuery.query('etqimpression #impPdf')[0].btnEl.dom.setAttribute('data-e2e', 'pdf'); });
    await p.click('[data-e2e=pdf]');
    let u = (await ouverts(p)).pop() || '';
    ok('… « Générer le PDF » : moteur de Prestige avec le panier, la position et le code choisis', /^\.\.\/Etiquete\?/.test(u) && /etiquettes=EN_PREPARATION/.test(u) && /int_NUMBER=3/.test(u) && /code=DATAMATRIX/.test(u), u);
    /* panier vide : le bouton reste grise, comme avant */
    q(`UPDATE t_etiquette SET str_STATUT = 'e2e_vide' WHERE lg_ETIQUETTE_ID IN ('${MARQUE}-1', '${MARQUE}-2')`);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('doEtiquette', 'Etiquettage massif', '0'));
    await p.waitForFunction(() => Ext.getCmp('gridpanelID') && !Ext.getCmp('gridpanelID').getStore().isLoading() && Ext.getCmp('btn_loturer'), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    ok('Panier vide : « Imprimer » grisé, comme avant', await p.evaluate(() => Ext.getCmp('btn_loturer').isDisabled()));
    q(`UPDATE t_etiquette SET str_STATUT = 'is_Process' WHERE lg_ETIQUETTE_ID IN ('${MARQUE}-1', '${MARQUE}-2')`);

    /* ---------------------------------------------------------------- ligne */
    await p.evaluate(() => { window.__ouverts = []; });
    await imprimerLigne(p, 'QR');
    await attendreApercu(p);
    a = await apercu(p);
    ok('Gestion des étiquettes › ligne : aperçu d\'Étiquettage Pro (source ligne, position 7, QR, 1 étiquette)',
      a && a.source === 'LIGNE' && a.position === 7 && a.code === 'QR' && a.total === 1 && (await ouverts(p)).length === 0, JSON.stringify(a));
    const ligneVisible = await p.evaluate(() => Ext.ComponentQuery.query('etqimpression #impSourceLigne')[0].isVisible());
    ok('… le choix « Ligne d\'étiquette choisie » est montré seulement dans ce cas', ligneVisible);
    await p.evaluate(() => { Ext.ComponentQuery.query('etqimpression #impPdf')[0].btnEl.dom.setAttribute('data-e2e', 'pdf'); });
    await p.click('[data-e2e=pdf]');
    u = (await ouverts(p)).pop() || '';
    ok('… PDF de la ligne (lg_ETIQUETTE_ID, position de départ, code)', new RegExp('lg_ETIQUETTE_ID=' + MARQUE + '-L').test(u) && /begin=7/.test(u) && /code=QR/.test(u), u);
    /* outil ouvert ensuite depuis Etiquettage Pro lui-meme : sans preset, retour au panier */
    await p.evaluate(() => { Ext.ComponentQuery.query('etiquetagepro')[0].ouvrirOutil(7); });
    await attendreApercu(p);
    a = await apercu(p);
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('etqimpression')[0]; return v.etat && v.etat.pourSource === 'PANIER'; }, null, { timeout: 15000 });
    a = await apercu(p);
    ok('Aperçu rouvert depuis Étiquettage Pro : source panier (3 étiquettes), position 1, « ligne » masquée', a.source === 'PANIER' && a.position === 1 && a.total === 3
      && !(await p.evaluate(() => Ext.ComponentQuery.query('etqimpression #impSourceLigne')[0].isVisible())), JSON.stringify(a));

    /* ---------------------------------------------------------------- bon de livraison */
    await p.evaluate(() => { window.__ouverts = []; });
    await imprimerBon(p, 5);
    await attendreApercu(p);
    await p.waitForFunction((bl) => { const v = Ext.ComponentQuery.query('etqimpression')[0]; return v.down('#impBon').getValue() === bl && v.etat.pourSource === 'BL' && v.etat.pourId === bl; }, BL, { timeout: 20000 });
    a = await apercu(p);
    ok('États de contrôle › rééditer les étiquettes d\'une entrée : aperçu, bon choisi, position 5, ' + QTE_BL + ' étiquettes',
      a.source === 'BL' && a.bon === BL && a.position === 5 && String(a.total) === QTE_BL && (await ouverts(p)).length === 0
      && await p.evaluate(() => !Ext.ComponentQuery.query('window').some((w) => w.isVisible() && w.down('#int_NUMBER'))), JSON.stringify(a));
    await p.evaluate(() => { Ext.ComponentQuery.query('etqimpression #impPdf')[0].btnEl.dom.setAttribute('data-e2e', 'pdf'); });
    await p.click('[data-e2e=pdf]');
    u = (await ouverts(p)).pop() || '';
    ok('… PDF du bon (moteur de Prestige, bon et position)', new RegExp('lg_BON_LIVRAISON_ID=' + BL).test(u) && /int_NUMBER=5/.test(u), u);
    await s.c.close();

    /* ---------------------------------------------------------------- sans le droit Etiquettage Pro */
    droitPro.retirer();
    s = await session(); p = s.p;
    await imprimerPanier(p, 2, 'QR');
    await p.waitForFunction(() => window.__ouverts.length > 0, null, { timeout: 15000 });
    u = (await ouverts(p))[0];
    await p.waitForTimeout(800);
    const ecranApres = await p.evaluate(() => ({ pro: Ext.ComponentQuery.query('etiquetagepro').length, liste: Ext.ComponentQuery.query('etiquette').length }));
    ok('Sans le droit Étiquettage Pro : le panier s\'imprime comme avant (moteur direct, retour à la liste)',
      u === '../Etiquete?etiquettes=EN_PREPARATION&int_NUMBER=2&code=QR' && ecranApres.pro === 0 && ecranApres.liste === 1, u + ' ' + JSON.stringify(ecranApres));
    await p.evaluate(() => { window.__ouverts = []; });
    await imprimerLigne(p, 'DATAMATRIX');
    await p.waitForFunction(() => window.__ouverts.length > 0, null, { timeout: 15000 });
    u = (await ouverts(p))[0];
    ok('Sans le droit Étiquettage Pro : la ligne s\'imprime comme avant (moteur direct)', u === '../Etiquete?lg_ETIQUETTE_ID=' + MARQUE + '-L&begin=7&code=DATAMATRIX'
      && await p.evaluate(() => Ext.ComponentQuery.query('etiquetagepro').length === 0), u);
    await p.evaluate(() => { window.__ouverts = []; });
    await imprimerBon(p, 4);
    await p.waitForFunction(() => window.__ouverts.length > 0, null, { timeout: 15000 });
    u = (await ouverts(p))[0];
    ok('Sans le droit : les étiquettes du bon s\'impriment comme avant', u === '../webservices/commandemanagement/bonlivraison/ws_generate_etiquette_pdf.jsp?lg_BON_LIVRAISON_ID=' + BL + '&int_NUMBER=4', u);
    await s.c.close();
    droitPro.remettre();
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' / '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    try { droitPro.remettre(); } catch (e) { console.log('droit : ' + e.message); }
    try { nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Nettoyage : étiquettes d\'essai retirées, panier d\'origine remis', q(`SELECT COUNT(*) FROM t_etiquette WHERE lg_ETIQUETTE_ID LIKE '${MARQUE}%'`) === '0'
      && q("SELECT COUNT(*) FROM t_etiquette WHERE str_STATUT IN ('e2e_attente', 'e2e_vide')") === '0');
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + ' OK');
    process.exit(k === res.length ? 0 : 1);
  }
})();
