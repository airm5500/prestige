/* RESSOURCES HUMAINES, socle (plan d'octobre, section 3, lot L11a).
 *
 * Par l'ecran « Ressources humaines » (menu RESSOURCES HUMAINES), jeu d'essai retire a la fin :
 *  - employes : creation par la fenetre ; matricule et badge uniques (refus motive) ; lien a un utilisateur unique ;
 *  - planning de la semaine : saisie d'une case (travail, pause), « lundi au vendredi », garde de nuit, repos, total
 *    des heures ; copie de la semaine precedente (cases deja saisies gardees ou remplacees) ;
 *  - conges et absences : demande, chevauchement refuse, validation, calendrier du mois, absence validee rappelee
 *    dans le planning ; cloche « Congés et absences à valider » ;
 *  - connexions : la connexion de l'essai est journalisee (poste, adresse) ; la deconnexion la clot ;
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

function nettoyer() {
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
    await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.setActiveTab(r.down('#ongletEmployes')); });
    await p.waitForTimeout(1200);
    const creer = async (v) => {
      await clic('rhmanager #btnNouvelEmploye', 1500);
      await remplir('#fenetreEmploye', v);
      await clic('#fenetreEmploye #btnEnregistrerEmploye', 1500);
    };
    await creer({ matricule: 'E2E-RH-1', nom: 'ZZRH', prenoms: 'Awa', poste: 'Pharmacien assistant', badge: 'E2E-B1' });
    await creer({ matricule: 'E2E-RH-2', nom: 'ZZRH', prenoms: 'Koffi', poste: 'Vendeur' });
    ok('Deux employés créés par la fenêtre', q("SELECT COUNT(*) FROM t_employe WHERE matricule LIKE 'E2E-RH%'") === '2');
    await creer({ matricule: 'E2E-RH-1', nom: 'DOUBLON' });
    const doublon = await boite(); await fermerBoite();
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenetreEmploye')[0]; if (w) { w.close(); } });
    ok('Matricule déjà porté : refus qui nomme l\'employé', /Matricule déjà porté par ZZRH Awa/.test(doublon), doublon);
    const badge = await post('../api/v1/rh/employes', { matricule: 'E2E-RH-3', nom: 'ZZRH', badge: 'E2E-B1' });
    ok('Badge déjà porté : refus', badge.success === false && /Badge déjà porté/.test(badge.message), badge.message);
    const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
    const e1 = q("SELECT id FROM t_employe WHERE matricule = 'E2E-RH-1'"), e2 = q("SELECT id FROM t_employe WHERE matricule = 'E2E-RH-2'");
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
    ok('Jeu d\'essai retiré (employés, planning, absences, connexions de l\'essai)', q("SELECT COUNT(*) FROM t_employe") === employesAvant);
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
