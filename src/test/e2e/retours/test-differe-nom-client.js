/* NOM DU CLIENT D'UN DIFFERE (besoins du 11/10, point 3) : « MOUSSA » saisi par erreur, corrige en « INOUSSA ».
 * Jeu d'essai (retire a la fin) : un client et une vente mise en differe portant son nom recopie.
 *  - API v1/differe-client : lecture de la fiche, refus (nom vide, trop long, client inconnu ou sans differe) ;
 *  - correction : fiche client et nom recopie sur ses ventes, sans toucher a une vente portant un autre nom ;
 *  - par l'ecran « Gestion des différés » : bandeau sous la liste (pas de fenetre), ligne choisie, nom corrige,
 *    liste rechargee avec le nouveau nom ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const SORTIE = process.env.SORTIE || ENV_E2E.TMP;
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const CLIENT = 'e2e-dnom-client', COMPTE = 'e2e-dnom-compte', SANS = 'e2e-dnom-sans';

function nettoyer() {
  exec("DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_ID LIKE 'e2e-dnom-%';"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'e2e-dnom-%';"
    + "DELETE FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID = '" + COMPTE + "';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN ('" + CLIENT + "', '" + SANS + "');");
}
function vente(id, quand, du, nom, prenoms, differe) {
  exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, int_PRICE, int_PRICE_REMISE, int_CUST_PART, str_STATUT, b_IS_CANCEL,"
    + " lg_TYPE_VENTE_ID, str_TYPE_VENTE, lg_USER_ID, lg_CLIENT_ID, str_FIRST_NAME_CUSTOMER, str_LAST_NAME_CUSTOMER, dt_CREATED, dt_UPDATED)"
    + " VALUES ('e2e-dnom-" + id + "', 'E2E-N" + id + "', " + du + ", 0, " + du + ", 'is_Closed', 0, '1', 'VNO', '" + ADMIN + "', '" + CLIENT
    + "', '" + nom + "', '" + prenoms + "', '" + quand + "', '" + quand + "')");
  if (differe) {
    exec("INSERT INTO t_preenregistrement_compte_client (lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, lg_PREENREGISTREMENT_ID, lg_COMPTE_CLIENT_ID, lg_USER_ID,"
      + " str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, int_PRICE_RESTE) VALUES ('e2e-dnom-" + id + "', 'e2e-dnom-" + id + "', '" + COMPTE + "', '" + ADMIN
      + "', 'is_Closed', '" + quand + "', '" + quand + "', " + du + ", " + du + ")");
  }
}

(async () => {
  nettoyer();
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, lg_TYPE_CLIENT_ID, dt_CREATED) VALUES ('" + CLIENT + "', 'MOUSSA', 'ALI', 'enable', '6', NOW()),"
    + " ('" + SANS + "', 'ZZSANS', 'DIFFERE', 'enable', '6', NOW());"
    + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('" + COMPTE + "', '" + CLIENT + "', 'enable', NOW())");
  vente('A', '2026-10-05 10:00:00', 5000, 'MOUSSA', 'ALI', true);
  vente('B', '2026-10-06 10:00:00', 1500, 'MOUSSA', 'ALI', false);
  vente('C', '2026-10-07 10:00:00', 1000, 'AUTRE', 'PORTEUR', false);   // nom d'un autre porteur : non touche
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (u, corps) => p.evaluate(async ([u, corps]) => JSON.parse(await (await fetch(u, corps ? { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) } : undefined)).text()), [u, corps]);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForLoadState('networkidle'); await p.waitForTimeout(3000);
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 120000 });
    await p.waitForTimeout(1500);

    /* ------------------------------------------------ API */
    const lu = await api('../api/v1/differe-client/' + CLIENT);
    ok('Lecture de la fiche : nom et prénoms séparés, droit de modifier', lu.success === true && lu.client && lu.client.nom === 'MOUSSA' && lu.client.prenoms === 'ALI' && lu.modifier === true, JSON.stringify(lu));
    const vide = await api('../api/v1/differe-client/' + CLIENT, { nom: '  ', prenoms: 'ALI' });
    ok('Nom vide : refus expliqué', vide.success === false && /nom/i.test(vide.message), JSON.stringify(vide));
    const long = await api('../api/v1/differe-client/' + CLIENT, { nom: 'X'.repeat(51), prenoms: 'ALI' });
    ok('Nom trop long (51) : refus expliqué', long.success === false && /50/.test(long.message), JSON.stringify(long));
    const inconnu = await api('../api/v1/differe-client/e2e-dnom-inconnu', { nom: 'A', prenoms: 'B' });
    ok('Client inconnu : refus', inconnu.success === false, JSON.stringify(inconnu));
    const sans = await api('../api/v1/differe-client/' + SANS, { nom: 'A', prenoms: 'B' });
    ok('Client sans différé : refus (le correctif ne vaut que pour les différés)', sans.success === false && /différé/.test(sans.message), JSON.stringify(sans));
    ok('Aucun refus n\'a rien changé', q("SELECT CONCAT(str_FIRST_NAME,' ',str_LAST_NAME) FROM t_client WHERE lg_CLIENT_ID='" + CLIENT + "'") === 'MOUSSA ALI'
      && q("SELECT str_FIRST_NAME FROM t_client WHERE lg_CLIENT_ID='" + SANS + "'") === 'ZZSANS');

    /* ------------------------------------------------ ecran */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('delayed', 'Gestion des différés', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('delayed #liste').length > 0, null, { timeout: 30000 });
    await p.evaluate((c) => { const d = Ext.ComponentQuery.query('delayed')[0]; d.down('#dtStart').setValue(new Date(2026, 9, 1)); d.down('#dtEnd').setValue(new Date(2026, 9, 31));
      const cb = d.down('#user'); cb.getStore().add({ lgCLIENTID: c, fullName: 'MOUSSA ALI' }); cb.setValue(c); }, CLIENT);
    await p.evaluate(() => Ext.ComponentQuery.query('delayed #rechercher')[0].btnEl.dom.click());
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('delayed #liste')[0]; return !g.getStore().isLoading() && g.getStore().getCount() === 1; }, null, { timeout: 20000 });
    const bandeau0 = await p.evaluate(() => { const b = Ext.ComponentQuery.query('delayed #liste #corrigerClient')[0]; return b ? { vu: b.isVisible(), dis: b.down('#corrNom').isDisabled() } : null; });
    ok('Bandeau « Corriger le client » sous la liste, inactif tant qu\'aucune ligne n\'est choisie', bandeau0 && bandeau0.vu && bandeau0.dis, JSON.stringify(bandeau0));
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('delayed #liste')[0]; g.getView().getEl().dom.querySelector('.x-grid-row .x-grid-cell').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('delayed #liste #corrNom')[0].getValue() === 'MOUSSA', null, { timeout: 10000 });
    const pre = await p.evaluate(() => { const b = Ext.ComponentQuery.query('delayed #liste #corrigerClient')[0];
      return { nom: b.down('#corrNom').getValue(), pre: b.down('#corrPrenoms').getValue(), actif: !b.down('#corrNom').isDisabled(), fenetres: Ext.WindowManager.getActive() ? 1 : 0 }; });
    ok('Ligne choisie : nom et prénoms du client repris dans le bandeau, sans fenêtre', pre.nom === 'MOUSSA' && pre.pre === 'ALI' && pre.actif && pre.fenetres === 0, JSON.stringify(pre));
    await p.click('.differe-corr-nom input'); await p.keyboard.press('Control+A'); await p.keyboard.type('inoussa');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('delayed #liste')[0]; return !g.getStore().isLoading() && g.getStore().getCount() === 1
      && g.getStore().getAt(0).get('clientFullName') === 'INOUSSA ALI'; }, null, { timeout: 20000 });
    const msg = await p.evaluate(() => Ext.ComponentQuery.query('delayed #liste #corrMessage')[0].getEl().dom.textContent);
    ok('Entrée enregistre : message dans le bandeau, liste rechargée avec « INOUSSA ALI »', /INOUSSA ALI/.test(msg), msg);
    ok('Fiche client corrigée (majuscules)', q("SELECT CONCAT(str_FIRST_NAME,' ',str_LAST_NAME) FROM t_client WHERE lg_CLIENT_ID='" + CLIENT + "'") === 'INOUSSA ALI');
    ok('Nom recopié corrigé sur ses ventes (différée et comptant) portant l\'ancien nom',
      q("SELECT GROUP_CONCAT(str_FIRST_NAME_CUSTOMER ORDER BY lg_PREENREGISTREMENT_ID) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('e2e-dnom-A','e2e-dnom-B')") === 'INOUSSA,INOUSSA');
    ok('Vente portant le nom d\'un autre porteur : inchangée', q("SELECT str_FIRST_NAME_CUSTOMER FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='e2e-dnom-C'") === 'AUTRE');
    await p.screenshot({ path: SORTIE + '/differe-nom-client.png' });
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'e2e-dnom-%'") === '0' && q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE 'e2e-dnom-%'") === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
