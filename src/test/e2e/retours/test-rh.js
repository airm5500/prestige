/* RESSOURCES HUMAINES, socle (plan d'octobre, section 3, lot L11a).
 *
 * Par l'ecran « Ressources humaines » (menu RESSOURCES HUMAINES), jeu d'essai retire a la fin :
 *  - employes (retours du 10/10) : fiche dans l'onglet (pas de fenetre), creation uniquement a partir d'un utilisateur
 *    existant (fiche pre-remplie) ; matricule et badge uniques (refus motive) ; lien a un utilisateur unique ;
 *  - planning de la semaine : saisie d'une case (travail, pause), « lundi au vendredi », garde de nuit, repos, total
 *    des heures ; copie de la semaine precedente (cases deja saisies gardees ou remplacees) ;
 *  - conges et absences : demande, chevauchement refuse, validation, calendrier du mois, absence validee rappelee
 *    dans le planning ; cloche « Congés et absences à valider » ;
 *  - connexions : la connexion de l'essai est journalisee (poste, adresse) ; filtre par utilisateur ; la deconnexion la clot ;
 *  - calendrier des conges sur toute la largeur ;
 *  - equipes (retours du 10/10) : panneau dans l'onglet Planning, membres et programme commun, programme invalide
 *    refuse, application a une semaine (cases deja saisies gardees ou remplacees), un employe dans une seule equipe ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const URL = 'http://localhost:8080/prestige';
const SEM = '2026-11-02', PREC = '2026-10-26';

/* deux utilisateurs d'essai, sans employe, pour la creation a partir d'un utilisateur (retours du 10/10) */
const UE = ['E2E-RH-U1', 'E2E-RH-U2'];
function nettoyer() {
  exec("DELETE FROM t_equipe_membre WHERE equipe_id IN (SELECT id FROM t_equipe WHERE nom LIKE 'ZZ Équipe E2E%');"
    + "DELETE FROM t_equipe_programme WHERE equipe_id IN (SELECT id FROM t_equipe WHERE nom LIKE 'ZZ Équipe E2E%');"
    + "DELETE FROM t_equipe WHERE nom LIKE 'ZZ Équipe E2E%';");
  exec("DELETE FROM t_employe WHERE lg_USER_ID IN ('" + UE.join("','") + "');"
    + "DELETE FROM t_user WHERE lg_USER_ID IN ('" + UE.join("','") + "');");
  exec("DELETE FROM t_planning WHERE employe_id IN (SELECT id FROM t_employe WHERE matricule LIKE 'E2E-RH%');"
    + "DELETE FROM t_absence WHERE employe_id IN (SELECT id FROM t_employe WHERE matricule LIKE 'E2E-RH%');"
    + "DELETE FROM t_employe WHERE matricule LIKE 'E2E-RH%';");
}

(async () => {
  nettoyer();
  const debutEssai = q('SELECT NOW()');
  const employesAvant = q("SELECT COUNT(*) FROM t_employe");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const get = (u) => p.evaluate(async (u) => JSON.parse(await (await fetch(u)).text()), u);
  const post = (u, c) => p.evaluate(async ([u, c]) => JSON.parse(await (await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })).text()), [u, c]);
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
    const remplir = (sel, valeurs) => p.evaluate(([s, v]) => { const w = Ext.ComponentQuery.query(s)[0]; Object.keys(v).forEach((k) => { w.down('[name=' + k + ']').setValue(v[k]); }); }, [sel, valeurs]);

    /* ------------------------------------------------ connexion journalisee */
    const ses = q("SELECT CONCAT(COUNT(*), '|', MAX(ip IS NOT NULL), '|', MAX(fin IS NULL)) FROM t_session_utilisateur s JOIN t_user u ON u.lg_USER_ID = s.lg_USER_ID WHERE u.str_LOGIN = 'admin' AND s.debut >= '" + debutEssai + "'");
    ok('Connexion journalisée (adresse, session ouverte)', ses === '1|1|1', ses);

    /* ------------------------------------------------ menu et ecran */
    const menu = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getNodeById('rhmanager'); return n ? n.get('text') : null; });
    ok('Menu RESSOURCES HUMAINES : « Ressources humaines »', !!menu, menu);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('rhmanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('rhmanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);

    /* ------------------------------------------------ employes */
    /* retours du 07/10 : a l'ouverture, chaque utilisateur actif (hors « admin ») est un employe rattache */
    const sansEmploye = q("SELECT COUNT(*) FROM t_user u WHERE u.str_STATUT = 'enable' AND u.str_LOGIN <> 'admin' AND NOT EXISTS (SELECT 1 FROM t_employe e WHERE e.lg_USER_ID = u.lg_USER_ID)");
    ok('Utilisateurs actifs créés et rattachés comme employés à l\'ouverture (hors admin)', sansEmploye === '0'
      && q("SELECT COUNT(*) FROM t_employe e JOIN t_user u ON u.lg_USER_ID = e.lg_USER_ID WHERE u.str_LOGIN = 'admin'") === '0', sansEmploye);
    const resync = await post('../api/v1/rh/employes/synchroniser', {});
    ok('Rattachement relancé : aucun doublon', resync.success === true && resync.crees === 0, JSON.stringify(resync));
    /* les utilisateurs d'essai arrivent apres le rattachement automatique : ils restent sans employe */
    exec("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_PHONE, str_STATUT, lg_EMPLACEMENT_ID, str_TYPE, dt_CREATED)"
      + " VALUES ('E2E-RH-U1', 'e2erhawa', 'ZZRH', 'Awa', 'Pharmacien assistant', '0707070701', 'enable', '1', 'CUSTOMER', NOW()),"
      + " ('E2E-RH-U2', 'e2erhkoffi', 'ZZRH', 'Koffi', 'Vendeur', '0707070702', 'enable', '1', 'CUSTOMER', NOW())");
    await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.setActiveTab(r.down('#ongletEmployes')); });
    await p.waitForTimeout(1200);
    const sansUtilisateur = await post('../api/v1/rh/employes', { matricule: 'E2E-RH-9', nom: 'ZZRH' });
    ok('Création sans utilisateur refusée (un employé se crée à partir d\'un utilisateur)', sansUtilisateur.success === false
      && /à partir d'un utilisateur existant/.test(sansUtilisateur.message) && q("SELECT COUNT(*) FROM t_employe WHERE matricule = 'E2E-RH-9'") === '0', sansUtilisateur.message);
    await clic('rhmanager #btnNouvelEmploye', 1500);
    const fiche = await p.evaluate(() => { const f = Ext.ComponentQuery.query('rhmanager #ficheEmploye')[0], t = f.query('textfield').filter((x) => x.isVisible() && x.editable !== false && x.xtype !== 'hiddenfield');
      return { visible: f.isVisible(), dansOnglet: f.up('#ongletEmployes') !== undefined && !f.up('window'), fenetres: Ext.ComponentQuery.query('window[modal=true]').filter((w) => w.isVisible()).length,
        sans: t.filter((x) => !x.emptyText).map((x) => x.name), utilisateurObligatoire: f.down('#userEmploye').allowBlank === false }; });
    ok('« Nouvel employé » : fiche dans l\'onglet (pas de fenêtre), utilisateur obligatoire, texte d\'aide dans chaque champ', fiche.visible && fiche.dansOnglet && fiche.fenetres === 0
      && fiche.utilisateurObligatoire && fiche.sans.length === 0, JSON.stringify(fiche));
    await clic('rhmanager #btnEnregistrerEmploye', 800);
    ok('Sans utilisateur choisi : rien n\'est créé', q("SELECT COUNT(*) FROM t_employe WHERE lg_USER_ID IN ('" + UE.join("','") + "')") === '0');
    await fermerBoite();
    const choisirUtilisateur = async (u) => {
      await p.waitForFunction((u) => { const c = Ext.ComponentQuery.query('rhmanager #userEmploye')[0]; return !c.getStore().isLoading() && c.getStore().getById(u); }, u, { timeout: 15000 });
      await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #userEmploye')[0].expand());
      await p.evaluate((u) => { const c = Ext.ComponentQuery.query('rhmanager #userEmploye')[0]; c.getPicker().getNode(c.getStore().getById(u)).setAttribute('data-e2e', 'u'); }, u);
      await p.click('[data-e2e=u]'); await p.waitForTimeout(300);
    };
    await choisirUtilisateur(UE[0]);
    const prerempli = await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #ficheEmploye')[0].getForm().getValues());
    ok('Utilisateur choisi : la fiche reprend son identifiant, son nom, son poste et son téléphone', prerempli.matricule === 'e2erhawa' && prerempli.nom === 'ZZRH'
      && prerempli.prenoms === 'Awa' && prerempli.poste === 'Pharmacien assistant' && prerempli.telephone === '0707070701', JSON.stringify(prerempli));
    const creer = async (u, v) => {
      await clic('rhmanager #btnNouvelEmploye', 1200);
      await choisirUtilisateur(u);
      await remplir('rhmanager #ficheEmploye', v);
      await clic('rhmanager #btnEnregistrerEmploye', 1500);
    };
    await creer(UE[0], { matricule: 'E2E-RH-1', badge: 'E2E-B1' });
    await creer(UE[1], { matricule: 'E2E-RH-2' });
    ok('Deux employés créés à partir de leur utilisateur, fiche refermée', q("SELECT GROUP_CONCAT(CONCAT(matricule, ':', lg_USER_ID, ':', nom, ' ', prenoms) ORDER BY matricule) FROM t_employe WHERE matricule LIKE 'E2E-RH%'")
      === 'E2E-RH-1:E2E-RH-U1:ZZRH Awa,E2E-RH-2:E2E-RH-U2:ZZRH Koffi' && !(await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #ficheEmploye')[0].isVisible())));
    const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
    const e1 = q("SELECT id FROM t_employe WHERE matricule = 'E2E-RH-1'"), e2 = q("SELECT id FROM t_employe WHERE matricule = 'E2E-RH-2'");
    /* modification dans la fiche : matricule deja porte */
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('rhmanager #ongletEmployes')[0]; g.down('#rechercheEmploye').setValue('ZZRH'); g.getStore().load(); });
    await p.waitForTimeout(1500);
    await p.evaluate((e) => { const g = Ext.ComponentQuery.query('rhmanager')[0]; g.editerEmploye(g.down('#ongletEmployes').getStore().findRecord('id', e)); }, e2);
    await p.waitForTimeout(800);
    await remplir('rhmanager #ficheEmploye', { matricule: 'E2E-RH-1' });
    await clic('rhmanager #btnEnregistrerEmploye', 1500);
    const doublon = await boite(); await fermerBoite();
    ok('Matricule déjà porté : refus qui nomme l\'employé', /Matricule déjà porté par ZZRH Awa/.test(doublon), doublon);
    await clic('rhmanager #btnFermerEmploye', 500);
    const badge = await post('../api/v1/rh/employes', { id: e2, matricule: 'E2E-RH-2', nom: 'ZZRH', badge: 'E2E-B1', userId: UE[1] });
    ok('Badge déjà porté : refus', badge.success === false && /Badge déjà porté/.test(badge.message), badge.message);
    const lienDeja = q("SELECT COUNT(*) FROM t_employe WHERE lg_USER_ID = '" + U + "'") !== '0';
    if (!lienDeja) {
      const l1 = await post('../api/v1/rh/employes', { id: e1, matricule: 'E2E-RH-1', nom: 'ZZRH', prenoms: 'Awa', badge: 'E2E-B1', userId: U });
      const l2 = await post('../api/v1/rh/employes', { id: e2, matricule: 'E2E-RH-2', nom: 'ZZRH', prenoms: 'Koffi', userId: U });
      ok('Un utilisateur n\'est lié qu\'à un seul employé', l1.success && l2.success === false && /déjà lié à ZZRH Awa/.test(l2.message), l2.message);
    }
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('rhmanager #ongletEmployes')[0]; g.down('#rechercheEmploye').setValue('ZZRH'); g.getStore().load(); });
    await p.waitForTimeout(1500);
    ok('Liste des employés : recherche', await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #ongletEmployes')[0].getStore().getCount()) === 2);

    /* ------------------------------------------------ planning */
    await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.setActiveTab(r.down('#ongletPlanning')); });
    await p.waitForTimeout(800);
    await p.evaluate((d) => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.lundi = Ext.Date.parse(d, 'Y-m-d'); r.chargerPlanning(); }, PREC);
    await p.waitForTimeout(1500);
    const titre = await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #titreSemaine')[0].text);
    ok('Planning : semaine du lundi au dimanche', titre === 'Semaine du 26/10/2026 au 01/11/2026', titre);
    const cellule = async (employe, jour) => {
      const pos = await p.evaluate(([e, j]) => { const g = Ext.ComponentQuery.query('rhmanager #ongletPlanning')[0]; const i = g.getStore().findExact('employeId', e);
        const col = g.down('#col' + j); const td = g.getView().getCell(g.getStore().getAt(i), col); return td ? td.id || (td.dom && td.dom.id) : null; }, [employe, jour]);
      await p.click('#' + pos); await p.waitForTimeout(800);
    };
    await cellule(e1, 0);
    await remplir('#fenetreCase', { type: 'TRAVAIL', debut: '8h', fin: '17:00', pause: 60, semaine: true });
    await clic('#fenetreCase #btnEnregistrerCase', 1800);
    ok('Case « lundi au vendredi » : 5 jours de travail 08:00-17:00, pause 60', q("SELECT GROUP_CONCAT(CONCAT(DAYOFWEEK(jour), type, TIME_FORMAT(debut, '%H:%i'), TIME_FORMAT(fin, '%H:%i'), pause_minutes) ORDER BY jour) FROM t_planning WHERE employe_id = '" + e1 + "'")
      === '2TRAVAIL08:0017:0060,3TRAVAIL08:0017:0060,4TRAVAIL08:0017:0060,5TRAVAIL08:0017:0060,6TRAVAIL08:0017:0060');
    await cellule(e2, 5);
    await remplir('#fenetreCase', { type: 'GARDE', debut: '20:00', fin: '08:00', pause: 0 });
    await clic('#fenetreCase #btnEnregistrerCase', 1800);
    await cellule(e2, 6);
    await remplir('#fenetreCase', { type: 'REPOS' });
    await clic('#fenetreCase #btnEnregistrerCase', 1800);
    const totaux = await p.evaluate(([a, c]) => { const s = Ext.ComponentQuery.query('rhmanager #ongletPlanning')[0].getStore(); return [s.getAt(s.findExact('employeId', a)).get('minutes'), s.getAt(s.findExact('employeId', c)).get('minutes')]; }, [e1, e2]);
    ok('Heures prévues : 5 × 8 h = 40 h ; garde de nuit 20:00-08:00 = 12 h ; repos 0', totaux[0] === 2400 && totaux[1] === 720, JSON.stringify(totaux));
    const texteCase = await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #ongletPlanning')[0].getView().getEl().dom.textContent);
    ok('Planning affiché : Travail 08:00 – 17:00 (pause 60 min), Garde, Repos, 40 h', /Travail08:00 – 17:00 \(pause 60 min\)/.test(texteCase) && /Garde20:00 – 08:00/.test(texteCase) && /Repos/.test(texteCase) && /40 h/.test(texteCase));
    await cellule(e1, 2);
    await remplir('#fenetreCase', { type: 'TRAVAIL', debut: '08:00', fin: '09:00', pause: 90 });
    await clic('#fenetreCase #btnEnregistrerCase', 1500);
    const pause = await boite(); await fermerBoite();
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenetreCase')[0]; if (w) { w.close(); } });
    ok('Pause plus longue que la journée : refus', /pause doit être plus courte/.test(pause), pause);

    /* copie sur la semaine suivante */
    await p.evaluate((d) => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.lundi = Ext.Date.parse(d, 'Y-m-d'); r.chargerPlanning(); }, SEM);
    await p.waitForTimeout(1500);
    await post('../api/v1/rh/planning', [{ employeId: e1, jour: '2026-11-02', type: 'REPOS' }]);
    await clic('rhmanager #btnCopier', 800);
    await p.evaluate(() => Ext.MessageBox.msgButtons.yes.el.dom.click());
    await p.waitForTimeout(2000);
    const copie = await boite(); await fermerBoite();
    ok('Copier la semaine précédente (garder les cases saisies) : 6 copiées, 1 gardée', /6 case\(s\) copiée\(s\), 1 case\(s\) déjà saisie\(s\) gardée\(s\)/.test(copie)
      && q("SELECT type FROM t_planning WHERE employe_id = '" + e1 + "' AND jour = '2026-11-02'") === 'REPOS'
      && q("SELECT COUNT(*) FROM t_planning WHERE jour BETWEEN '2026-11-02' AND '2026-11-08' AND employe_id IN ('" + e1 + "','" + e2 + "')") === '7', copie);
    const rempl = await post('../api/v1/rh/planning/copier?source=' + PREC + '&cible=' + SEM + '&remplacer=true');
    ok('Copier en remplaçant : la case saisie est écrasée', rempl.success && q("SELECT type FROM t_planning WHERE employe_id = '" + e1 + "' AND jour = '2026-11-02'") === 'TRAVAIL', rempl.message);

    /* ------------------------------------------------ equipes (retours du 10/10) */
    const EQ = '2026-11-16';
    await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.setActiveTab(r.down('#ongletPlanning')); });
    await p.evaluate((d) => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.lundi = Ext.Date.parse(d, 'Y-m-d'); r.chargerPlanning(); }, EQ);
    await p.waitForTimeout(1200);
    await clic('rhmanager #btnEquipes', 1500);
    const panneau = await p.evaluate(() => { const x = Ext.ComponentQuery.query('rhmanager #panneauEquipes')[0];
      return { visible: x.isVisible(), dansOnglet: !!x.up('#ongletPlanning'), fenetres: Ext.ComponentQuery.query('window[modal=true]').filter((w) => w.isVisible()).length }; });
    ok('« Équipes » : panneau dans l\'onglet Planning (pas de fenêtre)', panneau.visible && panneau.dansOnglet && panneau.fenetres === 0, JSON.stringify(panneau));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('rhmanager #equipeMembres')[0]; return !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 15000 });
    const membres = async (ids) => {
      await p.evaluate(() => { Ext.ComponentQuery.query('rhmanager #equipeMembres')[0].getSelectionModel().deselectAll(); });
      for (const id of ids) {
        await p.evaluate((i) => { const g = Ext.ComponentQuery.query('rhmanager #equipeMembres')[0]; g.getView().focusRow(g.getStore().findExact('id', i));
          g.getView().getNode(g.getStore().findExact('id', i)).setAttribute('data-e2e', 'membre'); }, id);
        await p.click('[data-e2e=membre] .x-grid-row-checker');
        await p.evaluate(() => document.querySelectorAll('[data-e2e=membre]').forEach((n) => n.removeAttribute('data-e2e')));
      }
    };
    const programme = (lignes) => p.evaluate((l) => { const st = Ext.ComponentQuery.query('rhmanager #equipeProgramme')[0].getStore();
      l.forEach((x) => { const r = st.findRecord('jour', x[0]); r.set({ type: x[1], debut: x[2] || '', fin: x[3] || '', pause: x[4] || 0 }); }); }, lignes);
    await clic('rhmanager #btnNouvelleEquipe', 500);
    await p.evaluate(() => { Ext.ComponentQuery.query('rhmanager #equipeNom')[0].setValue('ZZ Équipe E2E matin'); });
    await membres([e1, e2]);
    await programme([[1, 'TRAVAIL', '08:00', '16:00', 30], [2, 'TRAVAIL', '08:00', '16:00', 30], [3, 'TRAVAIL', '08:00', '16:00', 30], [4, 'TRAVAIL', '08:00', '16:00', 30],
      [5, 'TRAVAIL', '08:00', '16:00', 30], [6, 'GARDE', '20:00', '08:00', 0], [7, 'TRAVAIL', '09:00', '09:00', 0]]);
    await clic('rhmanager #btnEnregistrerEquipe', 1500);
    const invalide = await boite(); await fermerBoite();
    ok('Programme invalide (dimanche 09:00-09:00) : refus qui nomme le jour, rien n\'est créé', /dimanche : Le début et la fin sont identiques/.test(invalide)
      && q("SELECT COUNT(*) FROM t_equipe WHERE nom LIKE 'ZZ Équipe E2E%'") === '0', invalide);
    await programme([[7, 'REPOS']]);
    await clic('rhmanager #btnEnregistrerEquipe', 2000);
    const eq = q("SELECT id FROM t_equipe WHERE nom = 'ZZ Équipe E2E matin'");
    ok('Équipe enregistrée : 2 membres, 7 jours de programme', eq && q("SELECT COUNT(*) FROM t_equipe_membre WHERE equipe_id = '" + eq + "'") === '2'
      && q("SELECT GROUP_CONCAT(CONCAT(jour_semaine, type, IFNULL(TIME_FORMAT(debut, '%H%i'), '-'), IFNULL(TIME_FORMAT(fin, '%H%i'), '-'), pause_minutes) ORDER BY jour_semaine) FROM t_equipe_programme WHERE equipe_id = '" + eq + "'")
        === '1TRAVAIL0800160030,2TRAVAIL0800160030,3TRAVAIL0800160030,4TRAVAIL0800160030,5TRAVAIL0800160030,6GARDE200008000,7REPOS--0');
    /* une case deja saisie, gardee sans « remplacer » */
    await post('../api/v1/rh/planning', [{ employeId: e1, jour: EQ, type: 'REPOS' }]);
    await clic('rhmanager #btnAppliquerEquipe', 2000);
    const titre1 = await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #panneauEquipes')[0].title);
    ok('Appliquer à la semaine : 13 cases écrites, la case déjà saisie gardée', /13 case\(s\) écrite\(s\), 1 case\(s\) déjà saisie\(s\) gardée/.test(titre1)
      && q("SELECT type FROM t_planning WHERE employe_id = '" + e1 + "' AND jour = '" + EQ + "'") === 'REPOS'
      && q("SELECT COUNT(*) FROM t_planning WHERE jour BETWEEN '2026-11-16' AND '2026-11-22' AND employe_id IN ('" + e1 + "','" + e2 + "')") === '14', titre1);
    ok('Planning de la semaine rechargé : garde du samedi affichée', await p.evaluate((e) => { const s = Ext.ComponentQuery.query('rhmanager #ongletPlanning')[0].getStore();
      const r = s.getAt(s.findExact('employeId', e)); return !!r && r.get('j5') && r.get('j5').type === 'GARDE'; }, e2));
    await p.evaluate(() => { Ext.ComponentQuery.query('rhmanager #equipeRemplacer')[0].setValue(true); });
    await clic('rhmanager #btnAppliquerEquipe', 2000);
    ok('Avec « remplacer » : la case saisie prend le programme', q("SELECT CONCAT(type, TIME_FORMAT(debut, '%H:%i')) FROM t_planning WHERE employe_id = '" + e1 + "' AND jour = '" + EQ + "'") === 'TRAVAIL08:00');
    /* un employe dans une seule equipe */
    await clic('rhmanager #btnNouvelleEquipe', 500);
    await p.evaluate(() => { Ext.ComponentQuery.query('rhmanager #equipeNom')[0].setValue('ZZ Équipe E2E soir'); });
    await membres([e1]);
    await programme([[1, 'TRAVAIL', '14:00', '22:00', 30]]);
    await clic('rhmanager #btnEnregistrerEquipe', 2000);
    ok('Un employé ne fait partie que d\'une équipe : il rejoint la nouvelle et quitte l\'ancienne', q("SELECT e.nom FROM t_equipe_membre m JOIN t_equipe e ON e.id = m.equipe_id WHERE m.employe_id = '" + e1 + "'") === 'ZZ Équipe E2E soir'
      && q("SELECT COUNT(*) FROM t_equipe_membre WHERE equipe_id = '" + eq + "'") === '1');
    await clic('rhmanager #btnEquipes', 500);

    /* ------------------------------------------------ conges et absences */
    await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.mois = new Date(2026, 10, 1); r.setActiveTab(r.down('#ongletAbsences')); });
    await p.waitForTimeout(2000);
    await clic('rhmanager #btnNouvelleAbsence', 1200);
    await p.evaluate((e) => { const w = Ext.ComponentQuery.query('#fenetreAbsence')[0]; w.down('[name=employeId]').setValue(e); w.down('[name=type]').setValue('CONGE');
      w.down('[name=debut]').setValue(new Date(2026, 10, 3)); w.down('[name=fin]').setValue(new Date(2026, 10, 6)); w.down('[name=motif]').setValue('Congé annuel'); }, e1);
    await clic('#fenetreAbsence #btnEnregistrerAbsence', 2000);
    ok('Demande de congé enregistrée (statut « demandée »)', q("SELECT CONCAT(type, '|', debut, '|', fin, '|', statut, '|', demande_par) FROM t_absence WHERE employe_id = '" + e1 + "'") === 'CONGE|2026-11-03|2026-11-06|DEMANDE|' + U);
    const chev = await post('../api/v1/rh/absences', { employeId: e1, type: 'MALADIE', debut: '2026-11-05', fin: '2026-11-09' });
    ok('Chevauchement refusé (nomme l\'absence existante)', chev.success === false && /Chevauche.*CONGE du 03\/11\/2026 au 06\/11\/2026/.test(chev.message), chev.message);
    const demi = await post('../api/v1/rh/absences', { employeId: e2, type: 'AUTRE', debut: '2026-11-10', fin: '2026-11-10', demiJournee: 'MATIN', motif: 'Rendez-vous' });
    ok('Demi-journée acceptée (0,5 jour)', demi.success === true);
    const cl = await get('../api/v1/notifications-centre/compteurs?cles=conges');
    ok('Cloche « Congés et absences à valider » = demandes en base', cl.compteurs.conges === Number(q("SELECT COUNT(*) FROM t_absence a JOIN t_employe e ON e.id = a.employe_id WHERE a.statut = 'DEMANDE'")), JSON.stringify(cl.compteurs));
    await p.evaluate(() => Ext.ComponentQuery.query('rhmanager')[0].chargerAbsences());
    await p.waitForTimeout(2000);
    const cal = await p.evaluate(() => { const c = Ext.ComponentQuery.query('rhmanager #calendrier')[0].getEl().dom; return { cases: c.querySelectorAll('td[data-abs]').length, titres: Array.from(c.querySelectorAll('td[data-abs]')).map((t) => t.title) }; });
    ok('Calendrier du mois : 4 jours de congé demandé + 1 demi-journée, hachurés « demandé »', cal.cases === 5 && cal.titres.every((t) => /demandé/.test(t)), JSON.stringify(cal));
    const largeur = await p.evaluate(() => { const c = Ext.ComponentQuery.query('rhmanager #calendrier')[0], t = c.getEl().dom.querySelector('table.rh-cal');
      return { table: t.getBoundingClientRect().width, zone: c.getEl().dom.clientWidth }; });
    ok('Calendrier des congés : toute la largeur (plus de jours condensés)', largeur.table >= largeur.zone - 30, JSON.stringify(largeur));
    const valider = await p.evaluate(() => { const g = Ext.ComponentQuery.query('rhmanager #grilleAbsences')[0]; const i = g.getStore().findExact('type', 'CONGE');
      const td = g.getView().getNode(i).querySelector('.rh-act-valider'); if (td) { td.click(); return true; } return false; });
    await p.waitForTimeout(2000);
    ok('Valider depuis la liste : statut VALIDE, validé par l\'utilisateur', valider && q("SELECT CONCAT(statut, '|', valide_par, '|', dt_validation IS NOT NULL) FROM t_absence WHERE employe_id = '" + e1 + "'") === 'VALIDE|' + U + '|1');
    const cal2 = await p.evaluate(() => Array.from(Ext.ComponentQuery.query('rhmanager #calendrier')[0].getEl().dom.querySelectorAll('td[data-abs]')).filter((t) => /validé/.test(t.title)).length);
    ok('Calendrier : le congé validé en couleur pleine (4 jours)', cal2 === 4, String(cal2));
    const plan = await get('../api/v1/rh/planning?semaine=' + SEM);
    const l1 = plan.data.find((x) => x.employeId === e1);
    ok('Planning : congé validé rappelé sur les jours concernés (mar → ven)', l1 && !l1.a0 && /CONGE/.test(l1.a1) && /CONGE/.test(l1.a4) && !l1.a5, JSON.stringify(l1 && [l1.a0, l1.a1, l1.a4, l1.a5]));
    const supValide = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/rh/absences/' + id, { method: 'DELETE' })).text()), q("SELECT id FROM t_absence WHERE employe_id = '" + e2 + "'"));
    ok('Supprimer une demande', supValide.success === true && q("SELECT COUNT(*) FROM t_absence WHERE employe_id = '" + e2 + "'") === '0');

    /* ------------------------------------------------ connexions */
    await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.setActiveTab(r.down('#ongletConnexions')); });
    await p.waitForTimeout(2000);
    const lignesSes = await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #ongletConnexions')[0].getStore().getRange().map((r) => r.get('login') + '|' + r.get('ouverte')));
    ok('Onglet Connexions : la connexion de l\'essai « en cours »', lignesSes.indexOf('admin|true') >= 0, JSON.stringify(lignesSes.slice(0, 3)));
    /* filtre par utilisateur : un utilisateur sans connexion, puis admin */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('rhmanager #sesUtilisateur')[0]; return c.getStore().getCount(); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('rhmanager #sesUtilisateur')[0].getStore().getCount() > 1, null, { timeout: 15000 });
    const filtre = async (u) => { await p.evaluate((u) => { const c = Ext.ComponentQuery.query('rhmanager #sesUtilisateur')[0]; c.setValue(u); }, u);
      await clic('rhmanager #sesRechercher', 1500);
      return p.evaluate(() => Ext.ComponentQuery.query('rhmanager #ongletConnexions')[0].getStore().getRange().map((r) => r.get('login'))); };
    const sesU1 = await filtre(UE[0]), sesAdmin = await filtre(U);
    ok('Connexions : filtre par utilisateur (aucune pour l\'utilisateur d\'essai, seulement admin pour admin)', sesU1.length === 0 && sesAdmin.length > 0 && sesAdmin.every((l) => l === 'admin'),
      sesU1.length + ' / ' + JSON.stringify(sesAdmin.slice(0, 3)));
    await filtre('');
    /* la session de CET essai (d'autres essais peuvent se connecter en meme temps avec le meme compte) */
    const sesHttp = (await p.context().cookies()).find((c) => c.name === 'JSESSIONID').value.split('.')[0];
    await p.evaluate(async () => { await fetch('../api/v1/user/logout', { method: 'POST' }); });
    await p.waitForTimeout(1000);
    ok('Déconnexion : la session est close (fin par « déconnexion »)', q("SELECT CONCAT(fin IS NOT NULL, '|', fin_par) FROM t_session_utilisateur s JOIN t_user u ON u.lg_USER_ID = s.lg_USER_ID WHERE u.str_LOGIN = 'admin' AND s.session_http = '" + sesHttp + "' ORDER BY s.debut DESC LIMIT 1") === '1|DECONNEXION');
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    exec("DELETE s FROM t_session_utilisateur s JOIN t_user u ON u.lg_USER_ID = s.lg_USER_ID WHERE u.str_LOGIN = 'admin' AND s.debut >= '" + debutEssai + "'");
    ok('Jeu d\'essai retiré (employés, planning, absences, équipes, connexions de l\'essai)', q("SELECT COUNT(*) FROM t_employe") === employesAvant
      && q("SELECT COUNT(*) FROM t_equipe WHERE nom LIKE 'ZZ Équipe E2E%'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
