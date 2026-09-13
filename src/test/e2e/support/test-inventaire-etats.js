/* Sonde d'inventaire des etats d'impression.
 *
 * Un etat reference par le code mais absent du serveur ne se signale nulle part : l'utilisateur
 * clique, le service ecrit dans le journal, et le navigateur affiche un 404 sans explication.
 * Trois l'ont ete - ca_zone_geo, rp_facture_subro, rp_recap_caisse_recette - et rien ne permettait
 * de le savoir avant qu'un utilisateur ne tombe dessus. La sonde repond d'un coup, sur la machine
 * ou l'application tourne.
 */
const { chromium } = require('playwright-core');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs, null, { timeout: 60000 });

  const lire = (url) => p.evaluate(async (u) => {
    const r = await fetch(u);
    return { statut: r.status, corps: await r.text() };
  }, url);

  const r = await lire('../api/v1/etats/inventaire');
  ok('la sonde repond', r.statut === 200, r.statut);
  const json = JSON.parse(r.corps);
  ok('la sonde reussit', json.success === true, r.corps.slice(0, 200));
  ok('elle indique le repertoire d etats consulte', !!json.repertoire, json.repertoire);
  ok('elle couvre tous les etats references par le code', json.total > 150, 'total=' + json.total);

  const par = {};
  (json.data || []).forEach(e => { par[e.nom] = e.origine; });

  ok('un etat embarque dans le war est vu comme disponible',
     ['EMBARQUE', 'COMPILE', 'REPERTOIRE'].indexOf(par.ordonnancier) !== -1,
     'ordonnancier=' + par.ordonnancier);
  ok('les etats ecrits pendant ces travaux sont disponibles',
     ['ca_zone_geo', 'garde', 'facture_detail_articles'].every(n => par[n] && par[n] !== 'ABSENT'),
     JSON.stringify({ca_zone_geo: par.ca_zone_geo, garde: par.garde,
       facture_detail_articles: par.facture_detail_articles}));

  const prefixes = (json.data || []).filter(e => e.origine === 'PREFIXE');
  ok('les noms completes a l execution sont signales comme tels, sans conclure',
     prefixes.length > 0 && prefixes.every(e => e.disponible === true),
     prefixes.slice(0, 4).map(e => e.nom).join(', '));

  ok('rp_facture_subro n est plus reference (edition passee en code)', par.rp_facture_subro === undefined);
  ok('rp_recap_caisse_recette n est plus reference (edition passee en code)',
     par.rp_recap_caisse_recette === undefined);

  const manquants = JSON.parse((await lire('../api/v1/etats/inventaire?manquants=true')).corps);
  ok('le filtre « manquants » ne rend que les absents',
     (manquants.data || []).length === manquants.absents
     && (manquants.data || []).every(e => e.origine === 'ABSENT' && e.disponible === false),
     (manquants.data || []).length + ' / ' + manquants.absents);
  ok('les deux appels comptent la meme chose',
     manquants.total === json.total && manquants.absents === json.absents,
     JSON.stringify({total: manquants.total, absents: manquants.absents}));

  const p2 = await b.newPage();
  const anonyme = await p2.evaluate(async () => {
    const r = await fetch('http://localhost:8080/prestige/api/v1/etats/inventaire');
    return await r.text();
  }).catch(() => '');
  ok('la sonde refuse une requete sans session ouverte',
     anonyme === '' || /"success"\s*:\s*false/.test(anonyme), String(anonyme).slice(0, 150));

  ok('aucune erreur javascript', err.length === 0, err.join(' | '));
  await b.close();
  const echecs = res.filter(x => !x.c);
  console.log('\n' + (res.length - echecs.length) + '/' + res.length + ' OK');
  process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
