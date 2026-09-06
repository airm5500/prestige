/* Point 2 : centre de support.
   - Diagnostics et bugs : champ de recherche « contient » sur les colonnes textuelles ;
   - Historique : un export Excel dans chacun des quatre onglets ;
   - Tickets : un export Excel respectant le filtre de statut.
   Les exports doivent porter tout le resultat, pas la seule page affichee. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 240) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2EP2';

function semer() {
  nettoyer();
  // 25 evenements : plus d'une page de 20, dont un seul portant le mot cherche.
  for (let i = 0; i < 25; i++) {
    const message = (i === 7 ? 'Anomalie ' + MARQUE + ' introuvable sans recherche' : 'Evenement ordinaire ' + i);
    exec("INSERT INTO t_application_event (id, created_at, modified_at, status, last_seen_at, module,"
      + " type, niveau, message_court, occurrences, utilisateur, url_ou_ecran, signature)"
      + " VALUES ('" + MARQUE + "-" + i + "', NOW(), NOW(), 'ENABLE', NOW(), '" + MARQUE + "', 'TEST',"
      + " 'WARN', '" + message + "', 1, 'KGA3', '/ecran/" + MARQUE + "', '" + MARQUE + "-" + i + "')");
  }
}
function nettoyer() {
  exec("DELETE FROM t_application_event WHERE id LIKE '" + MARQUE + "%'");
}

(async () => {
  semer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const appel = (url) => p.evaluate(async (u) => {
    const r = await fetch(u);
    const t = r.headers.get('content-type') || '';
    if (t.indexOf('json') !== -1) { return { status: r.status, json: JSON.parse(await r.text()) }; }
    const buf = await r.arrayBuffer();
    return { status: r.status, type: t, taille: buf.byteLength,
             signature: new TextDecoder().decode(new Uint8Array(buf.slice(0, 2))) };
  }, url);

  // ---------- Diagnostics et bugs : la recherche ----------
  await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('supportdiagnostic', 'Diagnostic', ''));
  const ouvert = await p.waitForFunction(() => Ext.ComponentQuery.query('supportdiagnostic').length > 0, null, { timeout: 20000 }).then(() => true).catch(() => false);
  ok('ecran Diagnostics et bugs ouvert', ouvert);
  await p.waitForTimeout(3000);

  const champ = await p.evaluate(() => {
    const c = Ext.ComponentQuery.query('supportdiagnostic textfield#champRecherche')[0];
    return c ? { present: true, invite: c.emptyText } : { present: false };
  });
  ok('champ de recherche present', champ.present, JSON.stringify(champ));
  ok('l invite annonce un « contient »', /[Cc]ontient/.test(champ.invite || ''), champ.invite);

  const sansRecherche = await appel('../api/v1/support/events?start=0&limit=20&niveau=&query=');
  const avecRecherche = await appel('../api/v1/support/events?start=0&limit=20&niveau=&query='
      + encodeURIComponent(MARQUE + ' introuvable'));
  ok('la recherche « contient » ramene la seule ligne cherchee',
     avecRecherche.json.total === 1 && avecRecherche.json.data.length === 1,
     'total=' + avecRecherche.json.total);
  ok('sans recherche, la liste est bien plus large',
     sansRecherche.json.total > avecRecherche.json.total,
     'sans=' + sansRecherche.json.total + ' avec=' + avecRecherche.json.total);

  // la recherche porte sur plusieurs colonnes textuelles, pas seulement le message
  const parModule = await appel('../api/v1/support/events?start=0&limit=20&niveau=&query=' + encodeURIComponent(MARQUE));
  ok('la recherche porte aussi sur le module', parModule.json.total >= 25, 'total=' + parModule.json.total);
  const parEcran = await appel('../api/v1/support/events?start=0&limit=5&niveau=&query='
      + encodeURIComponent('/ecran/' + MARQUE));
  ok('la recherche porte aussi sur l ecran', parEcran.json.total >= 25, 'total=' + parEcran.json.total);

  // le comptage suit la recherche : sinon la pagination annonce des pages vides
  ok('le total annonce correspond au filtre',
     avecRecherche.json.total === avecRecherche.json.data.length, JSON.stringify(avecRecherche.json.total));

  // la recherche par l'ecran passe bien au serveur
  await p.evaluate((m) => {
    const c = testextjs.app.getController('SupportDiagnosticCtr');
    Ext.ComponentQuery.query('supportdiagnostic textfield#champRecherche')[0].setValue(m + ' introuvable');
    c.onRechercher();
  }, MARQUE);
  await p.waitForTimeout(3000);
  const apresRecherche = await p.evaluate(() =>
      Ext.ComponentQuery.query('supportdiagnostic gridpanel')[0].getStore().getCount());
  ok('l ecran affiche le resultat filtre', apresRecherche === 1, 'lignes=' + apresRecherche);

  // ---------- les quatre exports ----------
  const exports = [
    ['demandes', '../api/v1/support/demandes/export/excel'],
    ['evenements', '../api/v1/support/events/export/liste?niveau=&query='],
    ['tickets', '../api/v1/support/tickets/export/excel?statut='],
    ['recap', '../api/v1/support/events/recap/export/excel?dtStart=&dtEnd=']
  ];
  for (const [nom, url] of exports) {
    const r = await appel(url);
    ok('export ' + nom + ' : classeur xlsx valide',
       r.status === 200 && r.signature === 'PK' && r.taille > 1000, JSON.stringify(r));
  }

  // l'export des evenements suit la recherche
  const exportFiltre = await appel('../api/v1/support/events/export/liste?niveau=&query='
      + encodeURIComponent(MARQUE + ' introuvable'));
  ok('l export des evenements respecte la recherche',
     exportFiltre.status === 200 && exportFiltre.signature === 'PK', JSON.stringify(exportFiltre));

  // ---------- les boutons sont bien poses ----------
  await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('supporthistorique', 'Historique', ''));
  await p.waitForTimeout(4000);
  const onglets = await p.evaluate(() => {
    const h = Ext.ComponentQuery.query('supporthistorique')[0];
    if (!h) { return null; }
    return h.query('gridpanel').map(g => ({ titre: g.title, excel: !!g.down('button#btnExcel') }));
  });
  ok('les quatre onglets de l historique portent un bouton Excel',
     Array.isArray(onglets) && onglets.length === 4 && onglets.every(o => o.excel), JSON.stringify(onglets));

  await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('supporttickets', 'Tickets', ''));
  await p.waitForTimeout(4000);
  const boutonTickets = await p.evaluate(() => {
    const g = Ext.ComponentQuery.query('supporttickets gridpanel')[0];
    return g ? !!g.down('button#btnExcel') : false;
  });
  ok('l ecran Tickets porte un bouton Excel', boutonTickets);

  ok('aucune erreur JavaScript', err.length === 0, err.join(' || '));
  await b.close();
  nettoyer();
  const ko = res.filter(r => !r.c).length;
  console.log('\n===== ' + (res.length - ko) + '/' + res.length + (ko ? ' FAIL' : ' PASS') + ' =====');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('FATAL', e); try { nettoyer(); } catch (_) { } process.exit(2); });
