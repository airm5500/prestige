/* ORDONNANCES CLIENTS : TERRAINS CLINIQUES PARAMETRABLES ET POIDS (retour du 30/09).
 *
 *  - onglet « Terrains cliniques » : la liste de depart (diabete, hypertension...), un terrain ajoute par l'officine,
 *    desactivation sans effacement ;
 *  - fiche : une case par terrain actif, le poids ; enregistres avec l'ordonnance, relus en consultation ;
 *  - analyse (mode demonstration) : un AINS sur un terrain « ulcere » donne une contre-indication ;
 *  - un terrain desactive reste visible sur les ordonnances qui le portent ;
 *  - un renouvellement reprend les terrains et le poids de son origine.
 *
 * Joue a la souris et au clavier. Tout ce que le test pose est retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CLIENT = 'E2E-TC-CLIENT';
const NOM = 'ZZTERRAIN';
const NOUVEAU = 'ZZ Drépanocytose E2E';

function nettoyer() {
  exec("DELETE ot FROM t_ordonnance_client_terrain ot JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID = ot.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID = '" + CLIENT + "';"
    + "DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID = d.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID = '" + CLIENT + "';"
    + "UPDATE t_ordonnance_client SET lg_ORDONNANCE_ORIGINE_ID = NULL WHERE lg_CLIENT_ID = '" + CLIENT + "';"
    + "DELETE FROM t_ordonnance_client WHERE lg_CLIENT_ID = '" + CLIENT + "';"
    + "DELETE FROM t_terrain_clinique WHERE str_LIBELLE = '" + NOUVEAU + "';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "';");
}

(async () => {
  nettoyer();
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + CLIENT + "', '" + NOM + "', 'E2E', '6', NOW(), NOW(), 'enable');");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2500);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel, attente) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(attente || 900); };
    const cases = () => p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #terrainsFiche')[0].items.getRange()
      .map((c) => ({ libelle: c.boxLabel, visible: c.isVisible(), coche: c.getValue(), lecture: c.readOnly, id: c.getId() })));

    /* ------------------------------------------------ parametrage : liste de depart + ajout */
    const onglet = await p.evaluate(() => { const t = Ext.ComponentQuery.query('ordonnanceclient #vueTerrains')[0]; return t.tab.isVisible() ? t.tab.getId() : null; });
    ok('Onglet « Terrains cliniques » visible pour qui peut modifier', !!onglet);
    await p.click('#' + onglet);
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeTerrains.getCount() >= 10, null, { timeout: 15000 });
    const liste = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeTerrains.getRange().map((r) => r.get('libelle')));
    ok('Liste de départ : Diabète, Hypertension… Allergie aux sulfamides, dans l\'ordre', liste[0] === 'Diabète' && liste[1] === 'Hypertension artérielle' && liste.indexOf('Allergie aux sulfamides') === 9, liste.join(', '));
    await clic('ordonnanceclient #vueTerrains button[itemId=ajouterTerrain]', 700);
    await p.keyboard.type(NOUVEAU, { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2000);
    const cree = q("SELECT CONCAT_WS('|', lg_TERRAIN_ID, COALESCE(str_CODE, '-'), bool_ACTIF, int_ORDRE) FROM t_terrain_clinique WHERE str_LIBELLE = '" + NOUVEAU + "'").split('|');
    ok('Terrain ajouté dans la grille, enregistré aussitôt (actif, en fin de liste, sans règle d\'analyse)', cree[1] === '-' && cree[2] === '1' && Number(cree[3]) > 100, cree.join(' | '));
    const doublon = await p.evaluate(async () => JSON.parse(await (await fetch('../api/v1/ordonnance-client/terrains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ libelle: 'diabète' }) })).text()));
    ok('Un libellé qui existe déjà est refusé', doublon.success === false && /existe déjà/.test(doublon.message), doublon.message);

    /* ------------------------------------------------ fiche : cases, poids, enregistrement */
    await p.evaluate(() => { Ext.ComponentQuery.query('ordonnanceclient #onglets')[0].setActiveTab(0); });
    await p.waitForTimeout(500);
    await clic('ordonnanceclient #grilleOrdonnances button[itemId=nouvelle]', 1500);
    let c = await cases();
    ok('Fiche : une case par terrain actif, le nouveau compris', c.filter((x) => x.visible).length === 11 && c.some((x) => x.libelle === NOUVEAU && x.visible), c.map((x) => x.libelle).join(', '));
    await p.keyboard.type(NOM, { delay: 40 });
    await p.waitForFunction((nom) => { const cb = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheClient')[0]; return cb.isExpanded && !cb.getStore().isLoading() && cb.getStore().getCount() === 1 && cb.getStore().getAt(0).get('strFIRSTNAME') === nom; }, NOM, { timeout: 15000 });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    await p.waitForTimeout(700);
    /* Produit hors referentiel, tape au clavier : l'analyse reconnait l'ibuprofene a son libelle. */
    await p.keyboard.type('IBUPROFENE 400MG CPR', { delay: 30 });
    await p.waitForTimeout(1500);
    await p.keyboard.press('Escape'); await p.keyboard.press('Enter');
    await p.waitForTimeout(900);
    await p.keyboard.press('Escape');
    const ulcere = c.find((x) => x.libelle === 'Ulcère gastro-duodénal');
    const drepano = c.find((x) => x.libelle === NOUVEAU);
    await p.click('#' + ulcere.id + '-boxLabelEl');
    await p.click('#' + drepano.id + '-boxLabelEl');
    await p.click('#' + (await idDe('ordonnanceclient #vueFiche #poidsPatient')) + '-inputEl');
    await p.keyboard.type('500');
    await clic('ordonnanceclient #vueFiche button[itemId=enregistrer]', 1500);
    const refusPoids = await p.evaluate(() => { const t = Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : ''; if (t) { Ext.MessageBox.msgButtons.ok.el.dom.click(); } return t; });
    ok('Poids hors bornes : refusé, avec la raison', /poids du patient va de 1 à 400/.test(refusPoids), refusPoids);
    await p.click('#' + (await idDe('ordonnanceclient #vueFiche #poidsPatient')) + '-inputEl', { clickCount: 3 });
    await p.keyboard.type('72');
    await clic('ordonnanceclient #vueFiche button[itemId=enregistrer]', 2500);
    const ordId = q("SELECT lg_ORDONNANCE_ID FROM t_ordonnance_client WHERE lg_CLIENT_ID = '" + CLIENT + "'");
    const enBase = q("SELECT CONCAT(o.int_POIDS_PATIENT, '|', GROUP_CONCAT(t.str_LIBELLE ORDER BY t.int_ORDRE SEPARATOR ', ')) FROM t_ordonnance_client o"
      + " JOIN t_ordonnance_client_terrain ot ON ot.lg_ORDONNANCE_ID = o.lg_ORDONNANCE_ID JOIN t_terrain_clinique t ON t.lg_TERRAIN_ID = ot.lg_TERRAIN_ID WHERE o.lg_ORDONNANCE_ID = '" + ordId + "' GROUP BY o.int_POIDS_PATIENT");
    ok('Enregistrée : poids 72 kg, terrains « Ulcère » et le terrain ajouté', enBase === '72|Ulcère gastro-duodénal, ' + NOUVEAU, enBase);

    /* ------------------------------------------------ analyse : AINS sur ulcere */
    await clic('ordonnanceclient #vueFiche button[itemId=analyserPosos]', 3000);
    const alertes = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeAlertesFiche.getRange().map((r) => r.get('type') + ' / ' + r.get('gravite')));
    ok('Analyse : « Terrain : ulcère / Contre-indication » pour l\'ibuprofène', alertes.indexOf('Terrain : ulcère / Contre-indication') >= 0, alertes.join(' ; '));
    const envoi = await p.evaluate(() => JSON.stringify(testextjs.app.getController('OrdonnanceClientCtr').contexteFiche()));
    ok('Le contexte envoyé à l\'analyse porte le CODE du terrain connu (ULCERE), pas de nom de client', /"terrains":\["ULCERE"\]/.test(envoi) && /"poids":72/.test(envoi) && envoi.indexOf(NOM) < 0, envoi);

    /* ------------------------------------------------ desactivation : la fiche nouvelle ne le propose plus, l'ancienne le garde */
    exec("UPDATE t_terrain_clinique SET bool_ACTIF = 0 WHERE str_LIBELLE = '" + NOUVEAU + "'");
    await p.evaluate(() => testextjs.app.getController('OrdonnanceClientCtr').chargerTerrains());
    await p.waitForTimeout(1500);
    await p.evaluate((id) => testextjs.app.getController('OrdonnanceClientCtr').ouvrirParId(id, true), ordId);
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeProduits.getCount() === 1, null, { timeout: 15000 });
    await p.waitForTimeout(1500);
    c = await cases();
    const poids = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #poidsPatient')[0].getValue());
    const d = c.find((x) => x.libelle === NOUVEAU);
    ok('Consultation : terrains cochés et poids relus, en lecture seule', poids === 72 && c.find((x) => x.libelle === 'Ulcère gastro-duodénal').coche && c.every((x) => x.lecture), JSON.stringify(c.filter((x) => x.coche)));
    ok('Le terrain désactivé reste visible et coché sur l\'ordonnance qui le porte', d && d.visible && d.coche, JSON.stringify(d));
    await p.evaluate(() => testextjs.app.getController('OrdonnanceClientCtr').retourHistorique());
    await p.waitForTimeout(800);
    await clic('ordonnanceclient #grilleOrdonnances button[itemId=nouvelle]', 1500);
    c = await cases();
    ok('Fiche neuve : le terrain désactivé n\'est plus proposé', !c.find((x) => x.libelle === NOUVEAU).visible && c.filter((x) => x.visible).length === 10, c.filter((x) => x.visible).length);

    /* ------------------------------------------------ renouvellement : terrains et poids repris */
    await p.evaluate(async (id) => { await fetch('../api/v1/ordonnance-client/enregistrer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, clientId: 'E2E-TC-CLIENT', dateOrdonnance: new Date().toISOString().slice(0, 10), renouvellements: 1, periodicite: 30, poidsPatient: 72, terrains: ['TERRAIN_ULCERE', 'TERRAIN_DIABETE'], produits: [{ libelle: 'IBUPROFENE 400MG CPR', quantite: 1 }] }) }); }, ordId);
    const renouv = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/ordonnance-client/renouvellement/' + id, { method: 'POST' })).text()), ordId);
    const repris = q("SELECT CONCAT(o.int_POIDS_PATIENT, '|', GROUP_CONCAT(ot.lg_TERRAIN_ID ORDER BY ot.lg_TERRAIN_ID)) FROM t_ordonnance_client o JOIN t_ordonnance_client_terrain ot ON ot.lg_ORDONNANCE_ID = o.lg_ORDONNANCE_ID WHERE o.lg_ORDONNANCE_ID = '" + renouv.id + "' GROUP BY o.int_POIDS_PATIENT");
    ok('Le renouvellement reprend les terrains et le poids de son origine', renouv.success === true && repris === '72|TERRAIN_DIABETE,TERRAIN_ULCERE', JSON.stringify(renouv).slice(0, 120) + ' / ' + repris);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré (ordonnances, terrain ajouté, client)', q("SELECT COUNT(*) FROM t_terrain_clinique WHERE str_LIBELLE = '" + NOUVEAU + "'") === '0'
      && q("SELECT COUNT(*) FROM t_ordonnance_client WHERE lg_CLIENT_ID = '" + CLIENT + "'") === '0' && q("SELECT COUNT(*) FROM t_terrain_clinique") === '10');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
