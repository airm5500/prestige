/* Point 6 : ecran Mouvements de caisse.
   - le filtre « Tous les types » porte bien sur les trois types du journal ;
   - le formulaire de creation ne propose que ces trois types ;
   - la date du mouvement est initialisee au jour ;
   - le mode de reglement est masque mais garde sa valeur ;
   - le montant est aligne en face du champ portant « Especes ». */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];

/* Le test pose ses propres mouvements — un par type du journal — puis les retire.
   Sans donnees, le filtre « Tous les types » ne peut pas etre reellement verifie. */
const BASE = process.env.DB_TEST || 'capitale';
const sql = (q) => execFileSync('mariadb', [BASE, '-e', q], { encoding: 'utf8' });
const AUJ = new Date().toISOString().slice(0, 10);
function semer() {
  nettoyer();
  const user = sql("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'").trim().split('\n')[1];
  // Le journal lit t_mvt_caisse, avec bool_CHECKED=1 et la date de creation dans la periode.
  [{t: '5'}, {t: '3'}, {t: '4'}].forEach(function (m, i) {
    sql("INSERT INTO t_mvt_caisse (lg_MVT_CAISSE_ID, lg_TYPE_MVT_CAISSE_ID, lg_USER_ID,"
      + " str_NUM_COMPTE, str_NUM_PIECE_COMPTABLE, lg_MODE_REGLEMENT_ID, int_AMOUNT,"
      + " dt_DATE_MVT, dt_CREATED, str_STATUT, str_REF_TICKET, bool_CHECKED)"
      + " VALUES ('E2E-MVT-" + i + "', '" + m.t + "', '" + user + "', '000', 'E2E-MVT-" + i + "',"
      + " '1', " + ((i + 1) * 1000) + ", NOW(), NOW(), 'enable', 'E2E" + i + "', 1)");
  });
}
function nettoyer() {
  sql("DELETE FROM t_mvt_caisse WHERE lg_MVT_CAISSE_ID LIKE 'E2E-MVT-%'");
}

function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 220) + ']' : '')); }

(async () => {
  semer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  // On observe le parametre typeMvtId reellement envoye par la recherche du journal.
  const requetes = []; p.on('request', r => { if (r.url().indexOf('typeMvtId=') !== -1) requetes.push(r.url()); });
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('mvtcaissemanager', 'Mouvements de caisse', ''));
  const ouvert = await p.waitForFunction(() => Ext.ComponentQuery.query('mvtcaissemanager').length > 0, null, { timeout: 20000 }).then(() => true).catch(() => false);
  ok('ecran mvtcaissemanager ouvert', ouvert);
  await p.waitForTimeout(5000);

  // filtre principal : la liste ne propose que les trois types du journal
  const filtre = await p.evaluate(() => {
    const c = Ext.getCmp('typeMvtFiltre');
    return c ? c.getStore().getRange().map(r => r.get('str_NAME')) : null;
  });
  ok('le filtre Type ne propose que les trois types du journal',
     Array.isArray(filtre) && filtre.length === 3, JSON.stringify(filtre));

  // « Tous les types » : la requete porte les trois identifiants
  const urlTous = requetes.slice(-1)[0] || '';
  const idsEnvoyes = (decodeURIComponent(urlTous).match(/typeMvtId=([^&]*)/) || [])[1];
  ok('Tous les types envoie bien les trois types',
     !!idsEnvoyes && idsEnvoyes.split(',').filter(Boolean).length === 3,
     'typeMvtId=' + idsEnvoyes + '   (' + requetes.length + ' requetes observees)');

  // formulaire de creation
  await p.evaluate(() => Ext.ComponentQuery.query('mvtcaissemanager')[0].onAddClick());
  await p.waitForTimeout(4000);

  const form = await p.evaluate(() => {
    const cmp = (id) => Ext.getCmp(id);
    const typeMvt = cmp('lg_TYPE_MVT_CAISSE_ID');
    const mode = cmp('lg_MODE_REGLEMENT_ID');
    const date = cmp('dt_DATE_MVT');
    const montant = cmp('int_MONTANT_Add_MvtCaisse');
    const typeRegl = cmp('lg_TYPE_REGLEMENT_ID');
    const d = date && date.getValue();
    const auj = new Date();
    return {
      types: typeMvt ? typeMvt.getStore().getRange().map(r => r.get('str_NAME')) : null,
      dateDuJour: !!d && d.getDate() === auj.getDate() && d.getMonth() === auj.getMonth() && d.getFullYear() === auj.getFullYear(),
      modeMasque: !!mode && mode.isHidden(),
      modeValeur: mode ? mode.getValue() : null,
      memeLigne: !!(montant && typeRegl && montant.up('container') === typeRegl.up('container')),
      libelleTypeRegl: typeRegl ? (typeRegl.getRawValue() || typeRegl.getValue()) : null
    };
  });
  ok('le formulaire ne propose que les trois types du journal',
     Array.isArray(form.types) && form.types.length === 3, JSON.stringify(form.types));
  ok('la date du mouvement est initialisee au jour', form.dateDuJour, JSON.stringify(form.dateDuJour));
  ok('le mode de reglement est masque', form.modeMasque, JSON.stringify(form.modeMasque));
  ok('le mode de reglement conserve sa valeur en arriere-plan',
     form.modeValeur !== null && form.modeValeur !== '', JSON.stringify(form.modeValeur));
  ok('le montant est sur la meme ligne que le champ Especes', form.memeLigne,
     JSON.stringify({ memeLigne: form.memeLigne, typeRegl: form.libelleTypeRegl }));

  // fermeture du formulaire, puis controle des lignes reellement ramenees
  await p.evaluate(() => { const w = Ext.getCmp('paydebtID'); if (w) { w.close(); } });
  await p.waitForTimeout(1500);

  const lignes = await p.evaluate(() => {
    const g = Ext.ComponentQuery.query('mvtcaissemanager')[0];
    return g.getStore().getRange().map(r => r.get('typeMvtCaisse'));
  });
  ok('Tous les types ramene bien les trois natures de mouvement',
     new Set(lignes).size === 3, JSON.stringify(lignes));

  // un type precis ne ramene que ce type
  await p.evaluate(() => {
    const c = Ext.getCmp('typeMvtFiltre');
    const rec = c.getStore().getRange().find(r => /entree/i.test(r.get('str_NAME')));
    c.setValue(rec.get('lg_TYPE_MVT_CAISSE_ID'));
    c.fireEvent('select', c, [rec]);
  });
  await p.waitForTimeout(3000);
  const unType = await p.evaluate(() => {
    const g = Ext.ComponentQuery.query('mvtcaissemanager')[0];
    return g.getStore().getRange().map(r => r.get('typeMvtCaisse'));
  });
  ok('un type choisi ne ramene que ce type',
     unType.length > 0 && new Set(unType).size === 1 && /entree/i.test(unType[0]),
     JSON.stringify(unType));

  ok('aucune erreur JavaScript', err.length === 0, err.join(' || '));
  await b.close();
  nettoyer();
  const ko = res.filter(r => !r.c).length;
  console.log('\n===== ' + (res.length - ko) + '/' + res.length + (ko ? ' FAIL' : ' PASS') + ' =====');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('FATAL', e); try { nettoyer(); } catch (_) {} process.exit(2); });
