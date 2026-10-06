/* RESSOURCES HUMAINES, pointage (plan d'octobre, section 3, lot L11b).
 *
 * Jeu d'essai isole (deux employes, planning, un conge valide, un vrai fichier de pointeuse), retire a la fin :
 *  - import en trois etapes par l'ecran : lecture (apercu des colonnes), controle sans ecriture (retenues, badge
 *    inconnu, date impossible, ligne repetee), enregistrement (lot historise) ; reimport : rien n'est double ;
 *  - modele de pointeuse cree par la fenetre ; marque en double refusee ;
 *  - presence du jour : entree, sortie, presence, retard, heures sup. ; doublon a 1 minute signale ; garde de nuit
 *    rattachee a son jour ; pointage pendant un conge ; absent non justifie ;
 *  - pointage manuel par la fenetre (motif obligatoire, trace) ;
 *  - tableau de la periode = calcul attendu ; Excel et PDF (dans l'onglet) ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const URL = 'http://localhost:8080/prestige';
const FICHIER = path.join(require('os').tmpdir(), 'e2e-pointeuse-' + Date.now() + '.csv');

function nettoyer() {
  exec("DELETE FROM t_pointage WHERE employe_id IN (SELECT id FROM t_employe WHERE matricule LIKE 'E2E-PT%');"
    + "DELETE FROM t_pointage_lot WHERE fichier LIKE 'e2e-pointeuse-%';"
    + "DELETE FROM t_pointage_modele WHERE marque LIKE 'E2E%';"
    + "DELETE FROM t_planning WHERE employe_id IN (SELECT id FROM t_employe WHERE matricule LIKE 'E2E-PT%');"
    + "DELETE FROM t_absence WHERE employe_id IN (SELECT id FROM t_employe WHERE matricule LIKE 'E2E-PT%');"
    + "DELETE FROM t_employe WHERE matricule LIKE 'E2E-PT%';");
}

(async () => {
  nettoyer();
  const employesAvant = q('SELECT COUNT(*) FROM t_employe'), lotsAvant = q('SELECT COUNT(*) FROM t_pointage_lot');
  /* lundi 28/09 : A travaille 08-17 (pause 60), B de garde 20-08 ; mercredi 30/09 : A en conge valide ; jeudi 01/10 : B prevu, absent */
  exec("INSERT INTO t_employe (id, matricule, badge, nom, prenoms, statut, created_at) VALUES"
    + " ('E2E-PT-A', 'E2E-PT-1', 'E2EB1', 'ZZPOINT', 'Awa', 'ACTIF', NOW()), ('E2E-PT-B', 'E2E-PT-2', 'E2EB2', 'ZZPOINT', 'Bakary', 'ACTIF', NOW());"
    + "INSERT INTO t_planning (id, employe_id, jour, type, debut, fin, pause_minutes) VALUES"
    + " ('E2E-PL1', 'E2E-PT-A', '2026-09-28', 'TRAVAIL', '08:00', '17:00', 60), ('E2E-PL2', 'E2E-PT-B', '2026-09-28', 'GARDE', '20:00', '08:00', 0),"
    + " ('E2E-PL3', 'E2E-PT-B', '2026-10-01', 'TRAVAIL', '08:00', '17:00', 60);"
    + "INSERT INTO t_absence (id, employe_id, type, debut, fin, statut, created_at) VALUES ('E2E-AB1', 'E2E-PT-A', 'CONGE', '2026-09-30', '2026-09-30', 'VALIDE', NOW());");
  fs.writeFileSync(FICHIER, ['Badge;Date;Heure;Etat', 'E2EB1;28/09/2026;08:12;IN', 'E2EB1;28/09/2026;12:00;OUT', 'E2EB1;28/09/2026;13:00;IN',
    'E2EB1;28/09/2026;18:30;OUT', 'E2EB1;28/09/2026;18:31;OUT', 'E2EB2;28/09/2026;20:00;IN', 'E2EB2;29/09/2026;08:05;OUT',
    'E2EB9;28/09/2026;08:00;IN', 'E2EB1;31/02/2026;08:00;IN', 'E2EB1;28/09/2026;08:12;IN', 'E2EB1;30/09/2026;09:00;IN'].join('\r\n'));

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const post = (u, c) => p.evaluate(async ([u, c]) => JSON.parse(await (await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })).text()), [u, c]);
  const get = (u) => p.evaluate(async (u) => JSON.parse(await (await fetch(u)).text()), u);
  try {
    await p.goto(URL + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length
      && Ext.ComponentQuery.query('navigation')[0].getStore()._menuCharge, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel, attente) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(attente || 1200); };
    const boite = () => p.evaluate(() => Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : '');
    const fermerBoite = () => p.evaluate(() => { if (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
    const onglet = (id) => p.evaluate((i) => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.setActiveTab(r.down('#' + i)); }, id);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('rhmanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('rhmanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);

    /* ------------------------------------------------ modele par la fenetre */
    await onglet('ongletPointages'); await p.waitForTimeout(1500);
    const generique = await p.evaluate(() => { const c = Ext.ComponentQuery.query('rhmanager #modeleImport')[0]; return c.getStore().getAt(0) && c.getRawValue(); });
    ok('Modèle de départ « Générique (badge ; date ; heure ; sens) » proposé', /Générique/.test(generique || ''), generique);
    await clic('rhmanager #btnNouveauModele', 1200);
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenetreModele')[0]; w.down('[name=marque]').setValue('E2E ZKTeco'); w.down('[name=colHeure]').setValue(0);
      w.down('[name=formatDate]').setValue('yyyy-MM-dd HH:mm:ss'); w.down('[name=colSens]').setValue(0); });
    await clic('#fenetreModele #btnEnregistrerModele', 1800);
    ok('Nouveau modèle enregistré par la fenêtre (heure dans la date, sans sens)', q("SELECT CONCAT(col_heure, '|', col_sens, '|', format_date) FROM t_pointage_modele WHERE marque = 'E2E ZKTeco'") === '0|0|yyyy-MM-dd HH:mm:ss');
    const double = await post('../api/v1/rh/pointages/modeles', { marque: 'E2E ZKTeco' });
    ok('Marque en double refusée', double.success === false && /existe déjà/.test(double.message), double.message);
    const mauvais = await post('../api/v1/rh/pointages/modeles', { marque: 'E2E Faux', formatDate: 'pas {' });
    ok('Format de date invalide refusé', mauvais.success === false && /Format/.test(mauvais.message), mauvais.message);
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('rhmanager #modeleImport')[0]; c.setValue(c.getStore().findRecord('marque', 'Générique', 0, true).get('id')); });

    /* ------------------------------------------------ import en trois etapes */
    const input = await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #fichierImport')[0].fileInputEl.dom.id);
    await p.setInputFiles('#' + input, FICHIER);
    await clic('rhmanager #btnLire', 2500);
    const apercu = await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #apercuImport')[0].getEl().dom.textContent);
    ok('1. Lire : aperçu (12 lignes dont les titres, 4 colonnes, premières lignes)', /12 ligne\(s\), 4 colonne\(s\)/.test(apercu) && /E2EB1/.test(apercu), apercu.slice(0, 120));
    await clic('rhmanager #btnControler', 2500);
    const ctl = await p.evaluate(() => ({ titre: Ext.ComponentQuery.query('rhmanager #grilleRapport')[0].title,
      lignes: Ext.ComponentQuery.query('rhmanager #grilleRapport')[0].getStore().getRange().map((r) => r.get('ligne') + ':' + r.get('statut') + ':' + r.get('motif')) }));
    ok('2. Contrôler : 8 retenus, 2 rejetés, 1 répété — rien enregistré', /8 pointage\(s\) à enregistrer, 2 rejeté\(s\), 1 déjà connu\(s\) ou répété\(s\)/.test(ctl.titre)
      && q("SELECT COUNT(*) FROM t_pointage WHERE employe_id LIKE 'E2E-PT%'") === '0', ctl.titre);
    ok('Contrôle : badge inconnu, date impossible (31/02), ligne répétée nommés', ctl.lignes.some((l) => /^9:REJETEE:badge inconnu \(E2EB9\)/.test(l))
      && ctl.lignes.some((l) => /^10:REJETEE:date ou heure illisible/.test(l)) && ctl.lignes.some((l) => /^11:DOUBLON:/.test(l)), JSON.stringify(ctl.lignes.filter((l) => !/RETENUE/.test(l))));
    await clic('rhmanager #btnExecuter', 800);
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.el.dom.click());
    await p.waitForTimeout(2500);
    ok('3. Enregistrer : 8 pointages (source pointeuse, lot historisé)', q("SELECT COUNT(*) FROM t_pointage WHERE employe_id LIKE 'E2E-PT%' AND source = 'POINTEUSE' AND lot_id IS NOT NULL") === '8'
      && q("SELECT CONCAT(lignes_lues, '|', retenues, '|', rejetees, '|', deja_connues) FROM t_pointage_lot WHERE fichier LIKE 'e2e-pointeuse-%'") === '11|8|2|1');
    ok('Historique des imports à l\'écran', await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #grilleLots')[0].getStore().getRange().some((r) => /e2e-pointeuse/.test(r.get('fichier')))));
    await p.setInputFiles('#' + input, FICHIER);
    await clic('rhmanager #btnLire', 2500);
    await clic('rhmanager #btnControler', 2500);
    const re = await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #grilleRapport')[0].title);
    ok('Réimporter le même fichier : rien à enregistrer (9 déjà connus ou répétés)', /0 pointage\(s\) à enregistrer, 2 rejeté\(s\), 9 déjà connu/.test(re)
      && await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #btnExecuter')[0].isDisabled()), re);

    /* ------------------------------------------------ presence */
    await onglet('ongletPresence');
    const presence = async (jour) => {
      await p.evaluate((j) => { const g = Ext.ComponentQuery.query('rhmanager #ongletPresence')[0]; g.down('#jourPresence').setValue(Ext.Date.parse(j, 'Y-m-d')); Ext.ComponentQuery.query('rhmanager')[0].chargerPresence(); }, jour);
      await p.waitForTimeout(1800);
      return p.evaluate(() => Ext.ComponentQuery.query('rhmanager #ongletPresence')[0].getStore().getRange().filter((r) => /ZZPOINT/.test(r.get('employe'))).map((r) => r.data));
    };
    const j28 = await presence('2026-09-28');
    const a = j28.find((x) => /Awa/.test(x.employe)) || {}, bk = j28.find((x) => /Bakary/.test(x.employe)) || {};
    ok('Lundi, A : entrée 08:12, sortie 18:30, présence 9 h 18, retard 12 min, heures sup. 1 h 18', a.entree === '08:12' && a.sortie === '18:30' && a.minutesPresence === 558 && a.retard === 12 && a.heuresSup === 78, JSON.stringify(a));
    ok('Lundi, A : sortie répétée à 1 minute signalée « doublon »', /DOUBLON/.test(a.anomalies), a.anomalies);
    ok('Garde de nuit de B : la sortie du mardi 08:05 rattachée au lundi (12 h 05, 5 min sup.)', bk.entree === '20:00' && bk.sortie === '08:05' && bk.minutesPresence === 725 && bk.heuresSup === 5 && !bk.anomalies, JSON.stringify(bk));
    const texte = await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #ongletPresence')[0].getView().getEl().dom.textContent);
    ok('Feuille de présence affichée (pointages, retard, heures sup., anomalie en clair)', /08:12↑ 12:00↓ 13:00↑ 18:30↓/.test(texte) && /12 min/.test(texte) && /doublon/.test(texte), texte.slice(0, 200));
    const j30 = await presence('2026-09-30');
    ok('Mercredi, A en congé validé et pointé : « pointage pendant une absence »', j30.some((x) => /Awa/.test(x.employe) && /POINTAGE_EN_CONGE/.test(x.anomalies) && /CONGE/.test(x.absence)), JSON.stringify(j30));
    const j01 = await presence('2026-10-01');
    ok('Jeudi, B prévu sans pointage ni absence : « absent (non justifié) »', j01.some((x) => /Bakary/.test(x.employe) && x.anomalies === 'ABSENT'), JSON.stringify(j01));

    /* ------------------------------------------------ pointage manuel */
    await presence('2026-09-30');
    await clic('rhmanager #btnPointageManuel', 1500);
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenetrePointage')[0]; w.down('[name=employeId]').setValue('E2E-PT-A'); w.down('[name=heure]').setValue('12:00'); w.down('[name=sens]').setValue('SORTIE'); });
    await clic('#fenetrePointage #btnEnregistrerPointage', 1200);
    ok('Pointage manuel sans motif : refusé (fenêtre toujours ouverte)', q("SELECT COUNT(*) FROM t_pointage WHERE employe_id = 'E2E-PT-A' AND source = 'MANUEL'") === '0'
      && await p.evaluate(() => !!Ext.ComponentQuery.query('#fenetrePointage')[0]));
    await p.evaluate(() => { Ext.ComponentQuery.query('#fenetrePointage')[0].down('[name=motif]').setValue('Oubli de badge'); });
    await clic('#fenetrePointage #btnEnregistrerPointage', 2000);
    const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
    ok('Pointage manuel enregistré (motif, saisi par, source MANUEL)', q("SELECT CONCAT(DATE_FORMAT(horodatage, '%Y-%m-%d %H:%i'), '|', sens, '|', motif, '|', saisi_par) FROM t_pointage WHERE employe_id = 'E2E-PT-A' AND source = 'MANUEL'")
      === '2026-09-30 12:00|SORTIE|Oubli de badge|' + U);
    const futur = await post('../api/v1/rh/pointages', { employeId: 'E2E-PT-A', jour: '2027-01-01', heure: '08:00', sens: 'ENTREE', motif: 'x' });
    ok('Pointage manuel dans le futur : refusé', futur.success === false && /futur/.test(futur.message), futur.message);
    const supPointeuse = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/rh/pointages/' + id, { method: 'DELETE' })).text()), q("SELECT id FROM t_pointage WHERE source = 'POINTEUSE' AND employe_id = 'E2E-PT-A' LIMIT 1"));
    ok('Un pointage de la pointeuse ne se supprime pas', supPointeuse.success === false);

    /* ------------------------------------------------ tableau */
    await onglet('ongletTableau');
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('rhmanager #ongletTableau')[0]; t.down('#tabDu').setValue(new Date(2026, 8, 28)); t.down('#tabAu').setValue(new Date(2026, 9, 1)); });
    await clic('rhmanager #btnTableau', 2500);
    const tab = await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #ongletTableau')[0].getStore().getRange().filter((r) => /ZZPOINT/.test(r.get('employe'))).map((r) => r.data));
    const ta = tab.find((x) => /Awa/.test(x.employe)) || {}, tb = tab.find((x) => /Bakary/.test(x.employe)) || {};
    ok('Tableau, A : 1 jour prévu, 2 présents, 1 j d\'absence justifiée, 1 retard (12 min), 1 h 18 sup., 2 anomalies',
      ta.joursPrevus === 1 && ta.joursPresents === 2 && ta.joursAbsenceJustifiee === 1 && ta.retards === 1 && ta.minutesRetard === 12 && ta.heuresSup === 78 && ta.anomalies === 2, JSON.stringify(ta));
    ok('Tableau, B : 2 jours prévus, 1 présent, 1 absence non justifiée, 5 min sup.', tb.joursPrevus === 2 && tb.joursPresents === 1 && tb.absencesNonJustifiees === 1 && tb.heuresSup === 5, JSON.stringify(tb));
    const xl = await p.evaluate(async () => { const r = await fetch('../api/v1/rh/tableau/excel?du=2026-09-28&au=2026-10-01'); return r.status + '|' + r.headers.get('content-type') + '|' + (await r.arrayBuffer()).byteLength; });
    const xlj = await p.evaluate(async () => { const r = await fetch('../api/v1/rh/tableau/excel?detail=true&du=2026-09-28&au=2026-10-01'); return r.status + '|' + (await r.arrayBuffer()).byteLength; });
    ok('Excel : tableau et détail par jour', /^200\|application\/vnd.openxmlformats/.test(xl) && Number(xl.split('|')[2]) > 3000 && /^200\|/.test(xlj), xl + ' / ' + xlj);
    const pdf = await p.evaluate(async () => { const r = await fetch('../api/v1/rh/tableau/pdf?du=2026-09-28&au=2026-10-01'); const t = new Uint8Array(await r.arrayBuffer()); return r.headers.get('content-type') + '|' + r.headers.get('content-disposition') + '|' + String.fromCharCode(t[0], t[1], t[2], t[3]); });
    ok('PDF : ouvert dans l\'onglet (inline)', /application\/pdf\|inline.*\|%PDF/.test(pdf), pdf);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    try { fs.unlinkSync(FICHIER); } catch (e) { /* */ }
    ok('Jeu d\'essai retiré (employés, planning, absence, pointages, lots, modèle)', q('SELECT COUNT(*) FROM t_employe') === employesAvant && q('SELECT COUNT(*) FROM t_pointage_lot') === lotsAvant
      && q("SELECT COUNT(*) FROM t_pointage_modele WHERE marque LIKE 'E2E%'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
