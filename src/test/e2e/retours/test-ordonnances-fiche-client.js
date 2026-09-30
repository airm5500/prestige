/* ORDONNANCES, RETOURS DU 30/09 (suite) : FICHE CLIENT (2e onglet), paramètres suivis et normes, terrains et
 * allergies du dossier, consultation en lecture, recherche produit rapide, onglet « Terrains, allergies et
 * paramètres ».
 *
 * Joue par admin, au clavier et a la souris. Client, mesures, ordonnance et parametre de test (ZZFICHE) retires a la
 * fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOM = 'ZZFICHE';

(async () => {
  const produit = q("SELECT f.str_NAME FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID WHERE f.str_STATUT='enable'"
    + " AND s.int_NUMBER_AVAILABLE > 5 AND f.str_NAME REGEXP '^[A-Z]{5,} ' ORDER BY s.int_NUMBER_AVAILABLE DESC LIMIT 1");
  const diabete = q("SELECT lg_TERRAIN_ID FROM t_terrain_clinique WHERE str_CODE='DIABETE'");
  const penicilline = q("SELECT lg_TERRAIN_ID FROM t_terrain_clinique WHERE str_CODE='ALLERGIE_PENICILLINE'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  let clientId = null;
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel, t) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(t || 900); };
    const saisir = async (sel, texte) => { await p.click('#' + (await idDe(sel)) + '-inputEl', { clickCount: 3 }); await p.keyboard.type(String(texte)); };

    /* ------------------------------------------------ recherche produit rapide */
    const mot = produit.split(' ')[0];
    const vitesse = await p.evaluate(async (m) => { const t0 = performance.now(); const r = JSON.parse(await (await fetch('../api/v1/ordonnance-client/produits?query=' + encodeURIComponent(m.slice(0, 5)))).text());
      return { ms: Math.round(performance.now() - t0), n: r.data.length, stock: r.data.length ? r.data[0].intNUMBERAVAILABLE : null, nom: r.data.length ? r.data[0].strNAME : '' }; }, mot);
    ok('Recherche produit des ordonnances : moins de 300 ms, avec le stock', vitesse.ms < 300 && vitesse.n > 0 && vitesse.stock !== null, JSON.stringify(vitesse));
    ok('« Ajouter un produit » est retiré de la fiche', (await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #grilleProduits button[itemId=ajouterProduit]').length)) === 0);

    /* ------------------------------------------------ onglets */
    const onglets = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #onglets')[0].items.getRange().map((x) => x.title));
    ok('Onglets : Historique, Fiche client (2e), Analyse, Terrains, allergies et paramètres', onglets.join('|') === 'Historique|Fiche client|Analyse des ordonnances|Terrains, allergies et paramètres', onglets.join('|'));

    /* Client de test, ne le 10/05/1980. */
    const cree = await p.evaluate(async (n) => JSON.parse(await (await fetch('../api/v1/client/add/lambda', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strFIRSTNAME: n, strLASTNAME: 'AWA', strADRESSE: '0707123456', lgTYPECLIENTID: '6', consentSms: 'true', dtNAISSANCE: '1980-05-10' }) })).text()), NOM);
    clientId = cree.data.lgCLIENTID;

    /* ------------------------------------------------ fiche client */
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('ordonnanceclient #onglets')[0]; t.setActiveTab(t.down('#vueFicheClient')); });
    await p.waitForTimeout(1200);
    await saisir('ordonnanceclient #vueFicheClient #fcClient', NOM);
    await p.waitForFunction((id) => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFicheClient #fcClient')[0]; return c.isExpanded && c.getStore().findExact('lgCLIENTID', id) >= 0; }, clientId, { timeout: 15000 });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('ordonnanceclient #vueFicheClient')[0]; return v.down('#fcCorps').isVisible() && /ZZFICHE/.test(v.down('#fcIdentite').getEl().dom.textContent); }, null, { timeout: 15000 });
    await p.waitForTimeout(800);
    const age = new Date().getFullYear() - 1980 - ((new Date().getMonth() < 4 || (new Date().getMonth() === 4 && new Date().getDate() < 10)) ? 1 : 0);
    const ident = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFicheClient #fcIdentite')[0].getEl().dom.textContent);
    ok('Fiche : identité (nom, type, téléphone, né le, âge)', /ZZFICHE AWA/.test(ident) && /Standard/.test(ident) && /0707123456/.test(ident) && /10\/05\/1980/.test(ident) && new RegExp(age + ' ans').test(ident), ident);
    const tuiles = await p.evaluate(() => [...document.querySelectorAll('#' + Ext.ComponentQuery.query('ordonnanceclient #vueFicheClient #fcTuiles')[0].getEl().id + ' .fc-tuile-libelle')].map((x) => x.textContent));
    ok('Une tuile par paramètre actif (8 au départ)', tuiles.length === 8 && tuiles.indexOf('Tension artérielle') >= 0 && tuiles.indexOf('Glycémie à jeun') >= 0, tuiles.join(','));

    /* Terrains et allergies du dossier. */
    await p.click('.fc-puce[data-id="' + diabete + '"]'); await p.waitForTimeout(200);
    await p.click('.fc-puce[data-id="' + penicilline + '"]'); await p.waitForTimeout(200);
    await saisir('ordonnanceclient #vueFicheClient #fcAllergies', 'Iode (examen 2024)');
    await clic('ordonnanceclient #vueFicheClient button[itemId=fcEnregistrerDossier]', 1200);
    const dossier = q("SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_client_terrain WHERE lg_CLIENT_ID='" + clientId + "'), (SELECT str_ALLERGIES FROM t_client_dossier WHERE lg_CLIENT_ID='" + clientId + "'))");
    const couleurs = await p.evaluate((ids) => ids.map((i) => document.querySelector('.fc-puce[data-id="' + i + '"]').className), [diabete, penicilline]);
    ok('Dossier : un terrain et une allergie cochés, allergie en texte libre, enregistrés', dossier === '2|Iode (examen 2024)' && /fc-puce-terrain/.test(couleurs[0]) && /fc-puce-allergie/.test(couleurs[1]), dossier + ' ' + couleurs.join(' / '));

    /* Tension : bras gauche seul, puis bras droit seul. */
    const choisir = async (libelle) => { await p.evaluate((l) => { const b = [...document.querySelectorAll('.fc-tuile')].find((x) => x.querySelector('.fc-tuile-libelle').textContent === l); b.id = 'tuile-choisie'; }, libelle); await p.click('#tuile-choisie'); await p.waitForTimeout(900); await p.evaluate(() => { const t = document.getElementById('tuile-choisie'); if (t) { t.removeAttribute('id'); } }); };
    await choisir('Tension artérielle');
    const champs = await p.evaluate(() => { const v = Ext.ComponentQuery.query('ordonnanceclient #vueFicheClient')[0]; return { tension: v.down('#fcTension').isVisible(), valeur: v.down('#fcValeur').isVisible(), titre: v.down('#fcSuivi').title }; });
    ok('Tension choisie : champs gauche / droit (systolique, diastolique), pas de valeur unique', champs.tension && !champs.valeur && /Tension/.test(champs.titre), JSON.stringify(champs));
    await saisir('ordonnanceclient #vueFicheClient #fcGSys', 150);
    await clic('ordonnanceclient #vueFicheClient button[itemId=fcAjouter]', 1000);
    const incomplet = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFicheClient #fcMessage')[0].getEl().dom.textContent);
    ok('Systolique sans diastolique : refus expliqué', /systolique ET la diastolique/.test(incomplet), incomplet);
    await saisir('ordonnanceclient #vueFicheClient #fcGDia', 95);
    await saisir('ordonnanceclient #vueFicheClient #fcCommentaire', 'au repos');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1800);
    await saisir('ordonnanceclient #vueFicheClient #fcDSys', 120);
    await saisir('ordonnanceclient #vueFicheClient #fcDDia', 80);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1800);
    const ta = q("SELECT GROUP_CONCAT(CONCAT(m.str_COTE, m.dbl_VALEUR, '/', m.dbl_VALEUR2) ORDER BY m.dt_CREATED) FROM t_client_mesure m JOIN t_parametre_clinique p ON p.lg_PARAMETRE_ID=m.lg_PARAMETRE_ID WHERE m.lg_CLIENT_ID='" + clientId + "' AND p.str_CODE='TENSION'");
    ok('Tension : bras gauche seul (150/95), puis bras droit seul (120/80), sans obligation de saisir les deux', ta === 'G150/95,D120/80', ta);
    const tension = await p.evaluate(() => { const v = Ext.ComponentQuery.query('ordonnanceclient #vueFicheClient')[0]; const d = v.getEl().dom;
      return { etats: [...d.querySelectorAll('#' + v.down('#fcMesures').getEl().id + ' .fc-etat')].map((x) => x.textContent), points: d.querySelectorAll('.fc-svg .fc-point').length, bande: !!d.querySelector('.fc-svg .fc-bande'), legende: v.down('#fcCourbe').getEl().dom.textContent }; });
    ok('Analyse selon la norme adulte : 150/95 élevée, 120/80 normale', tension.etats.join(',') === 'Normale,Élevée', JSON.stringify(tension));
    ok('Courbe : bande des valeurs normales, 4 points (systolique et diastolique des deux prises)', tension.bande && tension.points === 4 && /90 - 139 \/ 60 - 89/.test(tension.legende), JSON.stringify(tension));

    /* Glycemie, poids, taille : IMC. */
    await choisir('Glycémie à jeun');
    await saisir('ordonnanceclient #vueFicheClient #fcValeur', '1,32'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    await choisir('Poids');
    await saisir('ordonnanceclient #vueFicheClient #fcValeur', '80'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    await choisir('Taille');
    await saisir('ordonnanceclient #vueFicheClient #fcValeur', '175'); await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
    await saisir('ordonnanceclient #vueFicheClient #fcValeur', '1750'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
    const faute = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFicheClient #fcMessage')[0].getEl().dom.textContent);
    ok('Faute de frappe (taille 1750 cm) : refusée par les bornes de saisie', /hors des valeurs possibles/.test(faute), faute);
    const tu = await p.evaluate(() => [...document.querySelectorAll('.fc-tuile')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    const gly = tu.find((t) => /Glycémie à jeun/.test(t)); const imc = tu.find((t) => /IMC/.test(t));
    ok('Glycémie à jeun 1,32 g/L : élevée', /1,32/.test(gly) && /Élevée/.test(gly), gly);
    ok('IMC calculé (80 kg, 175 cm) : 26,1, surpoids', /26,1/.test(imc) && /Surpoids/.test(imc), imc);
    const tPoids = tu.find((t) => /^Poids/.test(t)); const tTaille = tu.find((t) => /^Taille/.test(t));
    ok('Poids et taille : plus de « Pas de norme », renvoi vers l\'IMC', /IMC 26,1 · Surpoids/.test(tPoids) && /IMC 26,1/.test(tTaille) && !/Pas de norme/.test(tPoids + tTaille), tPoids + ' / ' + tTaille);

    /* Retrait d'une mesure erronee. */
    await choisir('Glycémie à jeun');
    await p.click('.fc-retirer');
    await p.waitForTimeout(600);
    const oui = await p.evaluate(() => { const box = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; const btn = box && box.query('button{isVisible()}').find((x) => /oui|yes/i.test(x.text || x.itemId || '')); return btn ? '#' + btn.el.dom.id : null; });
    await p.click(oui); await p.waitForTimeout(1500);
    ok('Une mesure erronée se retire', q("SELECT COUNT(*) FROM t_client_mesure m JOIN t_parametre_clinique p ON p.lg_PARAMETRE_ID=m.lg_PARAMETRE_ID WHERE m.lg_CLIENT_ID='" + clientId + "' AND p.str_CODE='GLYCEMIE_JEUN'") === '0');

    /* ------------------------------------------------ fiche ordonnance : le dossier est repris */
    await p.evaluate(() => { Ext.ComponentQuery.query('ordonnanceclient #onglets')[0].setActiveTab(0); });
    await p.waitForTimeout(800);
    await clic('ordonnanceclient #grilleOrdonnances button[itemId=nouvelle]', 1500);
    await p.keyboard.type(NOM, { delay: 40 });
    await p.waitForFunction((id) => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheClient')[0]; return c.isExpanded && c.getStore().findExact('lgCLIENTID', id) >= 0; }, clientId, { timeout: 15000 });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    await p.waitForTimeout(1800);
    const repris = await p.evaluate((ids) => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const c = testextjs.app.getController('OrdonnanceClientCtr');
      const coches = c.terrainsCoches(); const a = e.down('#vueFiche #allergiesClient'); return { d: coches.indexOf(ids[0]) >= 0, p: coches.indexOf(ids[1]) >= 0, allergies: a.isVisible() ? a.getEl().dom.textContent : '' }; }, [diabete, penicilline]);
    ok('Fiche ordonnance : terrains et allergies du dossier cochés, allergies en texte libre rappelées', repris.d && repris.p && /Iode/.test(repris.allergies), JSON.stringify(repris));
    await p.evaluate(() => { Ext.ComponentQuery.query('ordonnanceclient #vueFiche #poidsPatient')[0].setValue(82); });
    await p.click('#' + (await idDe('ordonnanceclient #vueFiche #rechercheProduit')) + '-inputEl');
    await p.keyboard.type(mot, { delay: 40 });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #rechercheProduit')[0]; return c.isExpanded && c.getStore().getCount() > 0; }, null, { timeout: 15000 });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
    await p.keyboard.type('1 cp le soir'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    await clic('ordonnanceclient #vueFiche button[itemId=enregistrer]', 1500);
    const ordo = q("SELECT lg_ORDONNANCE_ID FROM t_ordonnance_client WHERE lg_CLIENT_ID='" + clientId + "'");
    const poids = q("SELECT CONCAT_WS('|', m.dbl_VALEUR, m.lg_ORDONNANCE_ID) FROM t_client_mesure m JOIN t_parametre_clinique p ON p.lg_PARAMETRE_ID=m.lg_PARAMETRE_ID WHERE m.lg_CLIENT_ID='" + clientId + "' AND p.str_CODE='POIDS' AND m.lg_ORDONNANCE_ID IS NOT NULL");
    ok('Le poids saisi sur l\'ordonnance rejoint le suivi du client (lié à l\'ordonnance)', ordo && poids === '82|' + ordo, poids);

    /* ------------------------------------------------ consultation : seulement ce qui est renseigne */
    await p.evaluate((id) => { testextjs.app.getController('OrdonnanceClientCtr').ouvrirParId(id, true); }, ordo);
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #resumeClinique')[0].isVisible(), null, { timeout: 15000 });
    const lecture = await p.evaluate(() => { const f = Ext.ComponentQuery.query('ordonnanceclient #vueFiche')[0];
      return { resume: f.down('#resumeClinique').getEl().dom.textContent, cases: f.down('#casesContexte').isVisible(), terrains: f.down('#terrainsFiche').isVisible(), naissance: f.down('#ligneNaissance').isVisible() }; });
    ok('Consulter : contexte en texte (né le, poids, terrains cochés), sans case ni champ à cocher', /Poids82kg/.test(lecture.resume.replace(/\s/g, '')) && /Diabète/.test(lecture.resume) && /10\/05\/1980/.test(lecture.resume)
      && !lecture.cases && !lecture.terrains && !lecture.naissance && !/Grossesse/.test(lecture.resume), JSON.stringify(lecture));
    await p.evaluate(() => { testextjs.app.getController('OrdonnanceClientCtr').retourHistorique(); });
    await p.waitForTimeout(800);

    /* ------------------------------------------------ parametrage */
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('ordonnanceclient #onglets')[0]; t.setActiveTab(t.down('#vueParametrage')); });
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; return e.storeParametres.getCount() >= 8 && e.storeTerrains.getCount() >= 10; }, null, { timeout: 15000 });
    const para = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const t = e.storeParametres.findRecord('code', 'TENSION');
      return { normes: t.get('normes').length, alle: e.storeTerrains.queryBy((r) => r.get('categorie') === 'allergie').getCount(), col: !!e.down('#vueTerrains #colTerrainCategorie') }; });
    ok('Onglet paramétrage : terrains avec catégorie (3 allergies), paramètres avec leurs normes (tension : 3 tranches d\'âge)', para.normes === 3 && para.alle === 3 && para.col, JSON.stringify(para));
    await clic('ordonnanceclient #grilleParametres button[itemId=ajouterParametre]', 600);
    await p.keyboard.type('ZZFICHE Cholestérol total'); await p.keyboard.press('Enter');
    await p.waitForTimeout(1500);
    ok('« Ajouter un paramètre » : créé aussitôt, actif', q("SELECT bool_ACTIF FROM t_parametre_clinique WHERE str_LIBELLE='ZZFICHE Cholestérol total'") === '1');
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    await b.close();
    exec("DELETE FROM t_parametre_clinique WHERE str_LIBELLE LIKE 'ZZFICHE%'");
    const ids = q("SELECT GROUP_CONCAT(CONCAT(\"'\", lg_CLIENT_ID, \"'\")) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'");
    if (ids && ids !== 'NULL') {
      const o = '(SELECT lg_ORDONNANCE_ID FROM t_ordonnance_client WHERE lg_CLIENT_ID IN (' + ids + '))';
      exec('DELETE FROM t_client_mesure WHERE lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_client_terrain WHERE lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_client_dossier WHERE lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_ordonnance_client_terrain WHERE lg_ORDONNANCE_ID IN ' + o);
      exec('DELETE FROM t_ordonnance_client_detail WHERE lg_ORDONNANCE_ID IN ' + o);
      exec('DELETE FROM t_ordonnance_client WHERE lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_client WHERE lg_CLIENT_ID IN (' + ids + ')');
    }
    ok('Remise en état : client, mesures, dossier, ordonnance et paramètre de test retirés', q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'") === '0'
      && q("SELECT COUNT(*) FROM t_parametre_clinique WHERE str_LIBELLE LIKE 'ZZFICHE%'") === '0');
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
