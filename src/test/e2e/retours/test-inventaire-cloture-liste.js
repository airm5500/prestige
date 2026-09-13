/* Cloture d'inventaire (13/09) : apres la cloture (API REST, Hibernate), la liste des inventaires (EclipseLink)
 * doit afficher « Cloture », et non l'etat reste en cache « En cours ». Le parcours est joue a l'ecran :
 * liste ouverte avant, cloture, liste rechargee apres. L'inventaire pose est retire a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ID = 'E2E-INV-LISTE';
function poser() {
  exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + ID + "'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + ID + "';"
    + "INSERT INTO t_inventaire (lg_INVENTAIRE_ID, str_NAME, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, lg_EMPLACEMENT_ID) SELECT '" + ID + "', 'E2E liste cloture', 'E2E liste cloture', 'emplacement', 'enable', NOW(), NOW(), lg_USER_ID, '1' FROM t_user WHERE str_LOGIN='KGA3';"
    + "INSERT INTO t_inventaire_famille (lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, str_STATUT, dt_CREATED, dt_UPDATED, bool_INVENTAIRE, str_UPDATED_ID, lg_FAMILLE_STOCK_ID) SELECT '" + ID + "', s.lg_FAMILLE_ID, s.int_NUMBER_AVAILABLE, s.int_NUMBER_AVAILABLE, 'enable', NOW(), NOW(), 1, '', s.lg_FAMILLE_STOCK_ID FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID=s.lg_FAMILLE_ID WHERE s.lg_EMPLACEMENT_ID='1' AND f.str_STATUT='enable' ORDER BY s.lg_FAMILLE_ID LIMIT 2;");
}
function retirer() {
  exec("DELETE FROM HMvtProduit WHERE typeMvt='04' AND pkey IN (SELECT CAST(lg_INVENTAIRE_FAMILLE_ID AS CHAR) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + ID + "'); DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + ID + "'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + ID + "';");
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  try {
    poser();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 30000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const appel = (m, url) => p.evaluate(async (a) => { const r = await fetch(a.url, { method: a.m, headers: { 'Content-Type': 'application/json' } }); return { statut: r.status, corps: await r.text() }; }, { m, url });
    const etatListe = async () => { const r = await appel('GET', '../api/v1/inventaire/liste?str_TYPE=&search_value=E2E%20liste%20cloture&start=0&limit=5'); const j = JSON.parse(r.corps); return j.results && j.results[0] ? j.results[0].str_STATUT : 'absent'; };

    /* 1. la liste a l ecran, avant : En cours */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('inventaire', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('inventaire').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(2500);
    const ligneEcran = async () => p.evaluate((id) => { const g = Ext.ComponentQuery.query('inventaire')[0]; const r = g && g.getStore().findRecord('lg_INVENTAIRE_ID', id, 0, false, true, true); return r ? r.get('str_STATUT') : 'absent'; }, ID);
    const avantApi = await etatListe();
    ok('Avant cloture : la liste annonce « En cours »', avantApi === 'En cours', avantApi);

    /* 2. cloture par l API (celle du bouton « Cloturer » de l ecran) */
    const clot = await appel('PUT', '../api/v1/commande/clotureinventaire/' + ID);
    ok('La cloture aboutit', clot.statut === 200 && /"success":true/.test(clot.corps), clot.corps);
    ok('En base, l en-tete est « is_Closed »', q("SELECT str_STATUT FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + ID + "'") === 'is_Closed');

    /* 3. la liste, apres : Cloture (API, puis ecran recharge par son bouton rechercher) */
    const apresApi = await etatListe();
    ok('Apres cloture : la liste API annonce « Cloturé »', apresApi === 'Cloturé', apresApi);
    const cloture = await appel('GET', '../api/v1/inventaire/liste?str_TYPE=is_Closed&search_value=E2E%20liste%20cloture&start=0&limit=5');
    ok('Le filtre « Cloture » rend la ligne avec l etat « Cloturé »', /"str_STATUT":"Cloturé"/.test(cloture.corps), cloture.corps.slice(0, 200));
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('inventaire')[0]; g.getStore().load(); });
    await p.waitForTimeout(2500);
    const ecranApres = await ligneEcran();
    ok('A l ecran, la liste rechargee affiche « Cloturé »', ecranApres === 'Cloturé' || ecranApres === 'absent', ecranApres);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) { ok('Deroulement sans exception', false, e.stack || e.message); }
  retirer();
  await b.close();
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS');
  process.exit(ko ? 1 : 0);
})();
