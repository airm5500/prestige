/* Cloture d'inventaire (13/09) : avancement reel pendant la cloture et recapitulatif chiffre a la fin, joues a
 * l'ecran : ouverture de la fiche d'inventaire depuis la liste, clic sur « Cloturer », confirmation, fenetre
 * d'avancement, recapitulatif, OK. L'inventaire pose (200 lignes, ecarts en plus et en moins) est retire et les
 * stocks remis a l'identique. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ID = 'E2E-INV-ANIM';
const TMP = '/tmp/inv-anim'; fs.mkdirSync(TMP, { recursive: true });
const T0 = q('SELECT NOW()');
function poser() {
  exec("DROP TABLE IF EXISTS e2e_sauvegarde_anim; CREATE TABLE e2e_sauvegarde_anim AS SELECT s.lg_FAMILLE_STOCK_ID, s.lg_FAMILLE_ID, s.int_NUMBER, s.int_NUMBER_AVAILABLE, s.dt_UPDATED, f.dt_LAST_INVENTAIRE AS dt_last, t.int_NUMBER AS type_stock, t.dt_UPDATED AS type_dt FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID=s.lg_FAMILLE_ID LEFT JOIN t_type_stock_famille t ON t.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID='1' AND t.lg_TYPE_STOCK_ID='1' AND t.str_STATUT='enable' WHERE s.lg_EMPLACEMENT_ID='1' AND f.str_STATUT='enable' AND s.int_NUMBER_AVAILABLE > 3 ORDER BY s.lg_FAMILLE_ID DESC LIMIT 200;"
    + "DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + ID + "'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + ID + "';"
    + "INSERT INTO t_inventaire (lg_INVENTAIRE_ID, str_NAME, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, lg_EMPLACEMENT_ID) SELECT '" + ID + "', 'E2E animation', 'E2E animation cloture', 'emplacement', 'enable', NOW(), NOW(), lg_USER_ID, '1' FROM t_user WHERE str_LOGIN='" + (process.env.E2E_LOGIN || 'admin') + "';"
    + "INSERT INTO t_inventaire_famille (lg_INVENTAIRE_ID, lg_FAMILLE_ID, int_NUMBER, int_NUMBER_INIT, str_STATUT, dt_CREATED, dt_UPDATED, bool_INVENTAIRE, str_UPDATED_ID, lg_FAMILLE_STOCK_ID) SELECT '" + ID + "', b.lg_FAMILLE_ID, CASE WHEN RAND(11) < 0.25 THEN b.int_NUMBER_AVAILABLE + 3 WHEN RAND(13) < 0.25 THEN b.int_NUMBER_AVAILABLE - 2 ELSE b.int_NUMBER_AVAILABLE END, b.int_NUMBER_AVAILABLE, 'enable', NOW(), NOW(), 1, '', b.lg_FAMILLE_STOCK_ID FROM e2e_sauvegarde_anim b;");
}
function retablir() {
  exec("UPDATE t_famille_stock s JOIN e2e_sauvegarde_anim b ON b.lg_FAMILLE_STOCK_ID=s.lg_FAMILLE_STOCK_ID SET s.int_NUMBER=b.int_NUMBER, s.int_NUMBER_AVAILABLE=b.int_NUMBER_AVAILABLE, s.dt_UPDATED=b.dt_UPDATED;"
    + "UPDATE t_type_stock_famille t JOIN e2e_sauvegarde_anim b ON b.lg_FAMILLE_ID=t.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID='1' AND t.lg_TYPE_STOCK_ID='1' SET t.int_NUMBER=b.type_stock, t.dt_UPDATED=b.type_dt;"
    + "UPDATE t_famille f JOIN e2e_sauvegarde_anim b ON b.lg_FAMILLE_ID=f.lg_FAMILLE_ID SET f.dt_LAST_INVENTAIRE=b.dt_last;"
    + "DELETE FROM t_mouvement WHERE str_ACTION='INVENTAIRE' AND dt_CREATED >= '" + T0 + "' AND lg_FAMILLE_ID IN (SELECT lg_FAMILLE_ID FROM e2e_sauvegarde_anim);"
    + "DELETE FROM t_mouvement_snapshot WHERE dt_CREATED >= '" + T0 + "' AND lg_FAMILLE_ID IN (SELECT lg_FAMILLE_ID FROM e2e_sauvegarde_anim);"
    + "DELETE FROM HMvtProduit WHERE typeMvt='04' AND createdAt >= '" + T0 + "';"
    + "DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + ID + "'; DELETE FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + ID + "'; DROP TABLE IF EXISTS e2e_sauvegarde_anim;");
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  try {
    poser();
    const attendu = q("SELECT COUNT(*), SUM(int_NUMBER<>int_NUMBER_INIT), SUM(IF(int_NUMBER>int_NUMBER_INIT, int_NUMBER-int_NUMBER_INIT, 0)), SUM(IF(int_NUMBER<int_NUMBER_INIT, int_NUMBER_INIT-int_NUMBER, 0)) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID='" + ID + "'").split('\t').map(Number);
    ok('Jeu d essai : 200 lignes avec des ecarts en plus et en moins', attendu[0] === 200 && attendu[1] > 0 && attendu[2] > 0 && attendu[3] > 0, attendu.join('/'));

    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', process.env.E2E_LOGIN || 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 30000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await p.waitForTimeout(1500);

    /* fiche d inventaire ouverte comme depuis la liste (double-clic sur la ligne) */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('inventaire', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('inventaire').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(2500);
    await p.evaluate((id) => { const g = Ext.ComponentQuery.query('inventaire')[0]; const r = g.getStore().findRecord('lg_INVENTAIRE_ID', id, 0, false, true, true); testextjs.app.getController('App').onLoadNewComponentWithDataSource('editinventaireManager', "Modification de la fiche d'inventaire", id, r ? r.data : { lg_INVENTAIRE_ID: id, etat: 'enable' }); }, ID);
    await p.waitForFunction(() => Ext.ComponentQuery.query('editinventaireManager').length > 0 && !!Ext.getCmp('btn_check_emplacement'), null, { timeout: 20000 });
    await p.waitForTimeout(2500);
    const btn = await p.evaluate(() => { const c = Ext.ComponentQuery.query('editinventaireManager button[cls~=btn-cloturer]')[0] || Ext.ComponentQuery.query('editinventaireManager button')[0]; const b = Ext.ComponentQuery.query('editinventaireManager button').filter(x => /clotur/i.test(x.text || ''))[0]; return b ? b.id : null; });
    ok('Le bouton Cloturer est a l ecran', !!btn, btn);

    /* clic reel, confirmation, fenetre d avancement */
    await p.click('#' + btn);
    await p.waitForFunction(() => Ext.MessageBox.isVisible(), null, { timeout: 5000 });
    await p.evaluate(() => Ext.MessageBox.btnCallback(Ext.MessageBox.msgButtons.yes));
    const vu = await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('window#fenetreCloture')[0]; const r = Ext.ComponentQuery.query('window#recapCloture')[0]; return (w && w.isVisible()) || (r && r.isVisible()); }, null, { timeout: 10000 }).then(() => true).catch(() => false);
    ok('Une fenetre d avancement (ou deja le recapitulatif) s ouvre a la cloture', vu);
    await p.screenshot({ path: TMP + '/avancement.png' }).catch(() => null);

    /* l etat serveur est reel : etapes franchies, lignes traitees, journal */
    await p.waitForFunction(() => { const r = Ext.ComponentQuery.query('window#recapCloture')[0]; return r && r.isVisible(); }, null, { timeout: 30000 });
    const etat = JSON.parse((await p.evaluate(async (id) => (await fetch('../api/v1/commande/clotureinventaire/' + id + '/etat')).text(), ID)));
    ok('L etat serveur decrit des etapes reelles : 8/8, termine, journal par etape', etat.termine === true && etat.succes === true && etat.etape === 8 && etat.totalEtapes === 8 && etat.pourcentage === 100 && Array.isArray(etat.journal) && etat.journal.length === 8 && /Lignes de l'inventaire : \d+ ligne/.test(etat.journal[6]), JSON.stringify(etat).slice(0, 300));
    ok('Les lignes traitees annoncees couvrent au moins les ecarts de chaque etape', etat.lignesTraitees >= attendu[1] * 3, etat.lignesTraitees);

    /* recapitulatif : chiffres reels, compteurs montes a leur valeur */
    await p.waitForTimeout(1500);
    await p.screenshot({ path: TMP + '/recap.png' });
    const recap = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('window#recapCloture')[0].getEl().dom;
      const o = {parts: []};
      Array.prototype.forEach.call(w.querySelectorAll('.rc-val'), (e) => { o[e.getAttribute('data-cle')] = Number(e.textContent.replace(/[^0-9]/g, '')); });
      Array.prototype.forEach.call(w.querySelectorAll('.rc-part'), (e) => o.parts.push(String(e.textContent).trim()));
      o.pied = String(w.querySelector('.rc-pied').textContent);
      o.lignesAffichees = w.querySelectorAll('.rc-ligne').length;
      o.texte = String(w.textContent);
      return o;
    });
    /* retour du 13/09 : la PART des articles en ecart remplace les unites ajoutees / retirees */
    const partEcart = (attendu[1] / attendu[0] * 100).toFixed(2).replace('.', ',') + ' %';
    const partConforme = ((attendu[0] - attendu[1]) / attendu[0] * 100).toFixed(2).replace('.', ',') + ' %';
    ok('Recapitulatif : lignes, ecarts et produits sans ecart = chiffres reels', recap.lignes === attendu[0] && recap.ecarts === attendu[1] && recap.sansEcart === attendu[0] - attendu[1] && recap.lignesAffichees === 3, JSON.stringify(recap.parts) + ' ' + recap.lignesAffichees);
    ok('Recapitulatif : la part que l ecart represente est annoncee', recap.parts.length === 2 && recap.parts[0] === partEcart && recap.parts[1] === partConforme, recap.parts.join(' / ') + ' attendu ' + partEcart + ' / ' + partConforme);
    ok('Recapitulatif : plus d unites ajoutees ni retirees', !/Unités ajoutées|Unités retirées/.test(recap.texte));
    ok('Le pied annonce la duree et ce qui a ete mis a jour', /Durée/.test(recap.pied) && /Stock rayon/.test(recap.pied), recap.pied);
    ok('En base : en-tete cloture, stocks des ecarts a jour', q("SELECT str_STATUT FROM t_inventaire WHERE lg_INVENTAIRE_ID='" + ID + "'") === 'is_Closed' && q("SELECT COUNT(*) FROM t_inventaire_famille i JOIN t_famille_stock s ON s.lg_FAMILLE_STOCK_ID=i.lg_FAMILLE_STOCK_ID WHERE i.lg_INVENTAIRE_ID='" + ID + "' AND i.int_NUMBER<>i.int_NUMBER_INIT AND s.int_NUMBER_AVAILABLE<>i.int_NUMBER") === '0');

    /* OK ramene a la liste */
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('window#recapCloture #okRecapCloture')[0].id));
    await p.waitForTimeout(2500);
    ok('OK referme le recapitulatif et revient a la liste des inventaires', await p.evaluate(() => Ext.ComponentQuery.query('window#recapCloture').length === 0 && Ext.ComponentQuery.query('inventaire').length > 0));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) { ok('Deroulement sans exception', false, e.stack || e.message); }
  retablir();
  await b.close();
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS');
  process.exit(ko ? 1 : 0);
})();
