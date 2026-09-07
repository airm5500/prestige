/* Point 12 : un mode de reglement cree par l'officine doit ouvrir le meme parcours client que
   cheque, carte bancaire ou mobile money, sans que sa liste soit codee en dur.
   Le test cree un mode (« WYZALLTEST »), verifie le comportement de l'ecran de vente, puis le
   retire. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 250) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const NOM = 'WYZALLTEST';
function nettoyer() {
  exec("DELETE FROM t_mode_reglement WHERE str_NAME='" + NOM + "';"
     + "DELETE FROM t_type_reglement WHERE str_NAME='" + NOM + "';");
}

(async () => {
  nettoyer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const appel = (methode, url, corps) => p.evaluate(async ([m, u, c]) => {
    const opts = { method: m, headers: { 'Content-Type': 'application/json' } };
    if (c) { opts.body = JSON.stringify(c); }
    const r = await fetch(u, opts);
    return { status: r.status, body: await r.text() };
  }, [methode, url, corps || null]);

  // --- creation d'un mode standard exigeant un client ---
  let r = await appel('POST', '../api/v1/modereglement', { name: NOM, mobileMoney: false, clientRequis: true });
  const cree = JSON.parse(r.body);
  ok('mode de reglement cree', cree.success === true, r.body);
  const modeId = cree.id;

  ok('le mode est enregistre comme exigeant un client',
     q("SELECT bool_CLIENT_REQUIS FROM t_type_reglement WHERE lg_TYPE_REGLEMENT_ID='" + modeId + "'") === '1',
     'id=' + modeId);
  ok('le mode reste de categorie standard',
     q("SELECT str_CATEGORIE FROM t_type_reglement WHERE lg_TYPE_REGLEMENT_ID='" + modeId + "'") === 'STANDARD');

  // --- le service publie bien le nouveau mode ---
  const requis = JSON.parse((await appel('GET', '../api/v1/type-reglements/client-requis')).body);
  ok('le nouveau mode figure dans les types exigeant un client',
     requis.data.map(String).indexOf(String(modeId)) !== -1, JSON.stringify(requis.data));
  ['2', '3', '4', '6'].forEach(function (id) {
    ok('type historique ' + id + ' toujours present', requis.data.map(String).indexOf(id) !== -1);
  });
  ok('les especes ne demandent toujours pas de client', requis.data.map(String).indexOf('1') === -1);

  // --- l'ecran de vente reconnait le mode sans redemarrage du code ---
  await p.evaluate(() => testextjs.app.getController('VenteCtr').chargerTypesClientRequis());
  await p.waitForTimeout(2500);

  const verdicts = await p.evaluate((id) => {
    const c = testextjs.app.getController('VenteCtr');
    return {
      liste: c.clientRequisIds,
      nouveau: c.modeExigeClient(id),
      cheque: c.modeExigeClient('2'),
      especes: c.modeExigeClient('1'),
      mobile: c.modeExigeClient('7')
    };
  }, modeId);
  ok('l ecran de vente exige un client pour le nouveau mode', verdicts.nouveau === true, JSON.stringify(verdicts));
  ok('le cheque continue d exiger un client', verdicts.cheque === true);
  ok('le mobile money continue d exiger un client', verdicts.mobile === true);
  ok('les especes n en exigent toujours pas', verdicts.especes === false);

  // --- le reglage se retire depuis l ecran des modes de reglement ---
  r = await appel('POST', '../api/v1/modereglement/client-requis/' + modeId + '?requis=false');
  ok('le reglage peut etre retire', JSON.parse(r.body).success === true, r.body);
  ok('la base suit le reglage',
     q("SELECT bool_CLIENT_REQUIS FROM t_type_reglement WHERE lg_TYPE_REGLEMENT_ID='" + modeId + "'") === '0');
  const apres = JSON.parse((await appel('GET', '../api/v1/type-reglements/client-requis')).body);
  ok('le mode ne figure plus dans la liste', apres.data.map(String).indexOf(String(modeId)) === -1,
     JSON.stringify(apres.data));

  ok('aucune erreur JavaScript', err.length === 0, err.join(' || '));
  await b.close();
  nettoyer();
  const ko = res.filter(x => !x.c).length;
  console.log('\n===== ' + (res.length - ko) + '/' + res.length + (ko ? ' FAIL' : ' PASS') + ' =====');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('FATAL', e); try { nettoyer(); } catch (_) {} process.exit(2); });
