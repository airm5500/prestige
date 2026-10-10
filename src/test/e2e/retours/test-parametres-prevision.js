/* PARAMETRES DES PREVISIONS ET DU RISQUE DE RUPTURE DANS L'ECRAN (retours du 10/10, lot 3).
 *  - Onglet Tableau : definition de chaque methode ; panneau « Parametres de calcul » (10 parametres) avec les valeurs
 *    de la base ; modification dans l'ecran (pas de fenetre) et enregistrement ; saisie hors bornes refusee (ecran et
 *    serveur) ; effet reel : filtre « Prevision peu fiable » suit le nouveau seuil ;
 *  - Risque de rupture : panneau des 7 parametres du risque ; modification enregistree et liste rechargee ;
 *  - sans le droit P_PREVISION_PARAMETRER : lecture seule et enregistrement refuse par le serveur.
 * Valeurs d'origine et droit remis a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE], { encoding: 'utf8', input: s });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CLES = ['KEY_PREVISION_SEUIL_PEU_FIABLE', 'KEY_RISQUE_SECURITE_JOURS', 'KEY_PREVISION_MOIS_TEST'];
const origine = {};
CLES.forEach((c) => { origine[c] = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + c + "'), 'ABSENT')"); });
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = 'admin' LIMIT 1");
let droit = null;
const valeur = (c) => q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + c + "'");

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  let ctx = await b.newContext({ viewport: { width: 1366, height: 768 } }), p = await ctx.newPage();
  const err = []; const suivre = (pg) => pg.on('pageerror', (e) => err.push(String(e.message)));
  suivre(p);
  const connexion = async () => {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1000);
  };
  const ouvrirPrevisions = async () => {
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('analysecommande', 'Prévisions', ''));
    await p.waitForFunction(() => { const pc = Ext.ComponentQuery.query('analysecommande #parametresCalcul')[0]; return pc && pc.query('numberfield').length > 0; }, null, { timeout: 60000 });
  };
  const poster = (corps) => p.evaluate(async (c) => (await fetch('../api/v1/analyse-commande/parametres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })).json(), corps);
  try {
    await connexion();
    await ouvrirPrevisions();
    const vue = await p.evaluate(() => {
      const pc = Ext.ComponentQuery.query('analysecommande #parametresCalcul')[0], f = pc.query('numberfield');
      return { methodes: document.querySelector('.ac-methodes') ? document.querySelector('.ac-methodes').textContent : '', n: f.length,
        valeurs: f.reduce((o, c) => { o[c.cle] = c.getValue(); return o; }, {}), lecture: f.some((c) => c.readOnly), enregistrer: pc.down('#btnEnregistrer').isVisible(),
        fenetres: Ext.ComponentQuery.query('window[hidden=false]').length };
    });
    ok('Tableau : définition des 4 méthodes affichée', ['Moyenne 3 mois', 'Saisonnière', 'Tendance (Holt)', 'Tendance + saison'].every((m) => vue.methodes.indexOf(m) >= 0) && /mois d'essai/.test(vue.methodes), vue.methodes.slice(0, 200));
    const attendus = ['KEY_PREVISION_COUVERTURE_JOURS', 'KEY_PREVISION_DELAI_JOURS', 'KEY_PREVISION_JOURS_EN_COURS', 'KEY_PREVISION_SURSTOCK_JOURS', 'KEY_PREVISION_ROTATION_LENTE_JOURS',
      'KEY_PREVISION_ECART_ABERRANT', 'KEY_PREVISION_PRIX_ECART', 'KEY_PREVISION_MOIS_TEST', 'KEY_PREVISION_PLAFOND_COUVERTURE', 'KEY_PREVISION_SEUIL_PEU_FIABLE'];
    ok('Paramètres de calcul : les 10 paramètres, valeurs de la base, modifiables (droit admin), dans l\'écran (aucune fenêtre)',
      vue.n === 10 && attendus.every((c) => String(vue.valeurs[c]) === valeur(c)) && !vue.lecture && vue.enregistrer && vue.fenetres === 0, JSON.stringify(vue));

    /* saisie hors bornes : champ invalide ; le serveur refuse aussi */
    const invalide = await p.evaluate(() => { const c = Ext.ComponentQuery.query('analysecommande #p-KEY_PREVISION_SEUIL_PEU_FIABLE')[0]; c.setValue(150); return !c.isValid(); });
    let r = await poster({ KEY_PREVISION_SEUIL_PEU_FIABLE: 150 });
    ok('150 % refusé : champ en erreur, serveur refuse, base inchangée', invalide && r.success === false && /entre 0 et 100/.test(r.msg) && valeur('KEY_PREVISION_SEUIL_PEU_FIABLE') === origine.KEY_PREVISION_SEUIL_PEU_FIABLE, JSON.stringify(r));
    r = await poster({ KEY_PREVISION_SEUIL_PEU_FIABLE: 60, KEY_PREVISION_ACTIF: 0 });
    ok('Clé hors catalogue refusée et rien écrit (tout est contrôlé avant d\'écrire)', r.success === false && valeur('KEY_PREVISION_SEUIL_PEU_FIABLE') === origine.KEY_PREVISION_SEUIL_PEU_FIABLE && valeur('KEY_PREVISION_ACTIF') !== '0', JSON.stringify(r));

    /* modification par l'ecran */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('analysecommande #p-KEY_PREVISION_SEUIL_PEU_FIABLE')[0]; c.setValue(0); });
    const etat = await p.evaluate(() => Ext.ComponentQuery.query('analysecommande #etatParam')[0].getEl().dom.textContent);
    await p.evaluate(() => { const bt = Ext.ComponentQuery.query('analysecommande #btnEnregistrer')[0]; bt.getEl().dom.setAttribute('data-e2e', 'enr'); });
    await p.click('[data-e2e=enr]');
    await p.waitForFunction(() => /Enregistré/.test(Ext.ComponentQuery.query('analysecommande #etatParam')[0].getEl().dom.textContent), null, { timeout: 20000 });
    ok('Modification signalée avant enregistrement, puis « Enregistré » ; base à 0', /1 modification/.test(etat) && valeur('KEY_PREVISION_SEUIL_PEU_FIABLE') === '0', etat);
    const filtre = await p.evaluate(async () => (await fetch('../api/v1/analyse-commande/previsions?filtre=PEU_FIABLE&start=0&limit=5')).json());
    const sql = q("SELECT COUNT(*) FROM t_prevision_produit p JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID AND f.str_STATUT = 'enable' WHERE p.lg_EMPLACEMENT_ID = '1' AND p.ventes_12_mois > 0 AND p.fiabilite < 0");
    const sql50 = q("SELECT COUNT(*) FROM t_prevision_produit p JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID AND f.str_STATUT = 'enable' WHERE p.lg_EMPLACEMENT_ID = '1' AND p.ventes_12_mois > 0 AND p.fiabilite < 50");
    ok('Effet : « Prévision peu fiable » = fiabilité < 0 % (' + filtre.total + ' produits, contre ' + sql50 + ' à 50 %)', filtre.total === Number(sql) && Number(sql) !== Number(sql50), 'sql=' + sql + ' total=' + filtre.total + ' a50=' + sql50);
    const tab = await p.evaluate(async () => (await fetch('../api/v1/analyse-commande/tableau')).json());
    ok('Tableau : le seuil affiché suit le paramètre (0)', tab.seuilPeuFiable === 0 && tab.plafondCouverture === Number(valeur('KEY_PREVISION_PLAFOND_COUVERTURE')), JSON.stringify({ s: tab.seuilPeuFiable, p: tab.plafondCouverture }));
    await p.evaluate(() => { Ext.ComponentQuery.query('analysecommande #btnDefauts')[0].handler(); });
    const defauts = await p.evaluate(() => Ext.ComponentQuery.query('analysecommande #p-KEY_PREVISION_SEUIL_PEU_FIABLE')[0].getValue());
    ok('« Valeurs par défaut » remet 50 dans le champ sans enregistrer', defauts === 50 && valeur('KEY_PREVISION_SEUIL_PEU_FIABLE') === '0', defauts);

    /* risque de rupture */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('commandesencours', 'Commandes en cours', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('commandesencours').length > 0, null, { timeout: 30000 });
    await p.evaluate(() => { Ext.ComponentQuery.query('commandesencours')[0].afficher('risque'); });
    await p.waitForFunction(() => { const pc = Ext.ComponentQuery.query('risquerupture #parametresRisque')[0]; return pc && pc.query('numberfield').length > 0; }, null, { timeout: 120000 });
    const rr = await p.evaluate(() => { const pc = Ext.ComponentQuery.query('risquerupture #parametresRisque')[0]; return { n: pc.query('numberfield').length, replie: pc.collapsed, cles: pc.query('numberfield').map((c) => c.cle) }; });
    ok('Risque de rupture : panneau replié des 7 paramètres du risque', rr.n === 7 && rr.replie && rr.cles.indexOf('KEY_RISQUE_SECURITE_JOURS') >= 0 && rr.cles.indexOf('KEY_RISQUE_JOURS_RUPTURE_FOURNISSEUR') >= 0, JSON.stringify(rr));
    await p.waitForFunction(() => !Ext.ComponentQuery.query('risquerupture')[0].store.isLoading(), null, { timeout: 180000 });
    await p.evaluate(() => { const r = Ext.ComponentQuery.query('risquerupture')[0], pc = r.down('#parametresRisque'); pc.expand(false); r.__recharge = 0; r.store.on('load', () => { r.__recharge++; });
      pc.down('#p-KEY_RISQUE_SECURITE_JOURS').setValue(Number(pc.down('#p-KEY_RISQUE_SECURITE_JOURS').getValue()) + 1); pc.enregistrer(); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('risquerupture')[0].__recharge > 0, null, { timeout: 180000 });
    ok('Risque : marge de sécurité enregistrée et liste rechargée', valeur('KEY_RISQUE_SECURITE_JOURS') === String(Number(origine.KEY_RISQUE_SECURITE_JOURS === 'ABSENT' ? 2 : origine.KEY_RISQUE_SECURITE_JOURS) + 1), valeur('KEY_RISQUE_SECURITE_JOURS'));

    /* sans le droit */
    droit = q("SELECT CONCAT(rp.lg_ROLE_PRIVILEGE, '|', rp.lg_ROLE_ID, '|', rp.lg_PRIVILEGE_ID) FROM t_role_privelege rp JOIN t_privilege pr ON pr.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
      + " WHERE rp.lg_ROLE_ID = '" + ROLE + "' AND pr.str_NAME = 'P_PREVISION_PARAMETRER' LIMIT 1").split('|');
    exec("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + droit[0] + "'");
    await ctx.close(); ctx = await b.newContext({ viewport: { width: 1366, height: 768 } }); p = await ctx.newPage(); suivre(p);
    await connexion();
    await ouvrirPrevisions();
    const lect = await p.evaluate(() => { const pc = Ext.ComponentQuery.query('analysecommande #parametresCalcul')[0]; return { tous: pc.query('numberfield').every((c) => c.readOnly), enr: pc.down('#btnEnregistrer').isVisible(), etat: pc.down('#etatParam').getEl().dom.textContent }; });
    r = await poster({ KEY_PREVISION_SEUIL_PEU_FIABLE: 55 });
    ok('Sans le droit : lecture seule, pas de bouton Enregistrer, serveur refuse', lect.tous && !lect.enr && /Lecture seule/.test(lect.etat) && r.success === false && valeur('KEY_PREVISION_SEUIL_PEU_FIABLE') === '0', JSON.stringify(lect) + JSON.stringify(r));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    if (droit && droit.length === 3) {
      exec("INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('" + droit[0] + "', '" + droit[1] + "', '" + droit[2] + "', NOW(), NOW())");
    }
    CLES.forEach((c) => {
      exec(origine[c] === 'ABSENT' ? "DELETE FROM t_parameters WHERE str_KEY = '" + c + "'" : "UPDATE t_parameters SET str_VALUE = '" + origine[c] + "' WHERE str_KEY = '" + c + "'");
    });
    ok('Valeurs d\'origine et droit remis', CLES.every((c) => (origine[c] === 'ABSENT' ? q("SELECT COUNT(*) FROM t_parameters WHERE str_KEY = '" + c + "'") === '0' : valeur(c) === origine[c]))
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege pr ON pr.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + ROLE + "' AND pr.str_NAME = 'P_PREVISION_PARAMETRER'") === '1');
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
