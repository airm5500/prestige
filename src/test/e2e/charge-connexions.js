/*
 * Connexions simultanees sur un MEME compte.
 *
 * Reproduit la situation d'une officine ou plusieurs postes ouvrent une session sur
 * le meme identifiant au meme instant. Compte les echecs et les vagues sans erreur.
 *
 *   node charge-connexions.js [nbSimultanees] [nbVagues]
 */
const http = require('http');
const HOTE = 'localhost', PORT = 8080, BASE = '/prestige';
const LOGIN = process.env.LOGIN || 'KGA3';
const MOTDEPASSE = process.env.PASSWORD || 'e2etest';
const NB = parseInt(process.argv[2] || '8', 10);
const VAGUES = parseInt(process.argv[3] || '6', 10);

function connexion() {
  return new Promise(resolve => {
    const corps = JSON.stringify({login: LOGIN, password: MOTDEPASSE});
    const req = http.request({host: HOTE, port: PORT, path: BASE + '/api/v1/user/auth', method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(corps)}}, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        let ok = res.statusCode === 200;
        try { ok = ok && JSON.parse(d).success !== false; } catch (e) { ok = false; }
        resolve({code: res.statusCode, ok: ok});
      });
    });
    req.on('error', e => resolve({code: 0, ok: false, erreur: e.message}));
    req.write(corps); req.end();
  });
}

(async () => {
  console.log(NB + ' connexions simultanees sur le compte ' + LOGIN + ', ' + VAGUES + ' vagues\n');
  let total = 0, echecs = 0;
  const codes = {};
  for (let v = 1; v <= VAGUES; v++) {
    const r = await Promise.all(Array.from({length: NB}, connexion));
    const ko = r.filter(x => !x.ok);
    r.forEach(x => { codes[x.code] = (codes[x.code] || 0) + 1; });
    total += r.length; echecs += ko.length;
    console.log('  vague ' + v + ' : ' + (r.length - ko.length) + '/' + r.length + ' réussies'
        + (ko.length ? '   ECHECS ' + ko.map(x => 'HTTP ' + x.code).join(', ') : ''));
    await new Promise(r2 => setTimeout(r2, 400));
  }
  console.log('\ntotal : ' + (total - echecs) + '/' + total + ' réussies, ' + echecs + ' échec(s)');
  console.log('codes HTTP : ' + JSON.stringify(codes));
  process.exit(echecs ? 1 : 0);
})();
