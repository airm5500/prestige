/* O5 (Prestige Mobile) : LECTURE AVANCEE DES ORDONNANCES PAR UN SERVICE EN LIGNE (demandes serveur, point 41).
 *
 * Aucun appel exterieur : un faux service local (http://127.0.0.1) repond comme le fournisseur ; la configuration du
 * BANC (lecture-avancee.properties) est posee le temps du test puis retiree. Ce que le test etablit :
 *  - sans configuration : capacite lectureAvancee fausse, route 503 ;
 *  - configuration sans modele : toujours desactivee (aucun modele n'est ecrit dans le code) ;
 *  - configuree : JPEG lu -> lignes de medicaments ; la ligne « Dr ... » et le telephone renvoyes par le service sont
 *    retires ; le fichier qui n'est pas un JPEG -> 400 ; deux envois simultanes -> 429 pour le second ;
 *  - journal : une ligne par lecture, sans image ni texte (taille, fournisseur, resultat, lignes) ;
 *  - sans session : 401.
 * Les lignes de journal du test sont retirees.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CONF = process.env.LECTURE_CONF || '/root/prestige/config/lecture-avancee.properties';
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const PORT = 18734;
let lent = 0, recus = [];

/* faux fournisseur : reponse au format de la Messages API, avec une ligne personnelle a filtrer */
const faux = http.createServer((req, rep) => {
  let corps = '';
  req.on('data', (d) => { corps += d; });
  req.on('end', () => {
    recus.push(corps.length);
    const lignes = { lignes: [
      { nom: 'AMOXICILLINE', dosage: '1 g', forme: 'cp', posologie: '1 matin et soir', quantite: '2', confiance: 0.9 },
      { nom: 'Dr Kouassi Jean', dosage: '', forme: '', posologie: '', quantite: '', confiance: 0.8 },
      { nom: 'DOLIPRANE', dosage: '500 mg', forme: 'cp', posologie: 'appeler le 07 07 07 07 07', quantite: '1', confiance: 0.7 }] };
    setTimeout(() => {
      rep.writeHead(200, { 'Content-Type': 'application/json' });
      rep.end(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(lignes) }], usage: { input_tokens: 1500, output_tokens: 120 } }));
    }, lent);
  });
});

(async () => {
  const avant = fs.existsSync(CONF) ? fs.readFileSync(CONF) : null;
  await new Promise((r) => faux.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext()).newPage();
  const lire = (type, taille) => p.evaluate(async ([type, taille]) => {
    const c = document.createElement('canvas'); c.width = taille; c.height = taille; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, taille, taille); x.fillStyle = '#000'; x.fillText('AMOXICILLINE 1g', 5, 20);
    const blob = await new Promise((r) => c.toBlob(r, type, 0.8));
    const r = await fetch('../api/v1/app-vente/ordonnances/lecture-avancee', { method: 'POST', headers: { 'Content-Type': type }, body: blob });
    return { s: r.status, j: await r.json().catch(() => null) };
  }, [type, taille]);
  const cap = () => p.evaluate(async () => (await fetch('../api/v1/app-vente/capacites')).json());
  try {
    if (avant !== null) { fs.unlinkSync(CONF); }
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    const sans = await lire('image/jpeg', 50);
    ok('Sans session : 401', sans.s === 401, sans.s);
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });

    const c0 = await cap(), l0 = await lire('image/jpeg', 50);
    ok('Sans configuration : capacité fausse, 503', c0.lectureAvancee === false && l0.s === 503, JSON.stringify([c0.lectureAvancee, l0.s]));
    fs.writeFileSync(CONF, 'LECTURE_AVANCEE_FOURNISSEUR=claude\nLECTURE_AVANCEE_URL=http://127.0.0.1:' + PORT + '/v1/messages\n');
    const c1 = await cap();
    ok('Configurée sans modèle : toujours désactivée (aucun modèle dans le code)', c1.lectureAvancee === false, c1.lectureAvancee);
    fs.writeFileSync(CONF, 'LECTURE_AVANCEE_FOURNISSEUR=claude\nLECTURE_AVANCEE_URL=http://127.0.0.1:' + PORT + '/v1/messages\nLECTURE_AVANCEE_MODELE=modele-essai-local\nLECTURE_AVANCEE_QUOTA_JOUR=50\n');
    const c2 = await cap();
    ok('Configurée : capacité vraie', c2.lectureAvancee === true && c2.lectureAvanceeVersion === 1, JSON.stringify(c2));

    const l1 = await lire('image/jpeg', 200);
    const noms = ((l1.j || {}).lignes || []).map((x) => x.nom);
    ok('Lecture : lignes de médicaments rendues', l1.s === 200 && noms.indexOf('AMOXICILLINE') >= 0 && noms.indexOf('DOLIPRANE') >= 0, JSON.stringify(l1.j).slice(0, 250));
    ok('Ligne « Dr … » retirée, posologie portant un téléphone vidée', noms.every((n) => !/Dr /.test(n)) && ((l1.j.lignes.find((x) => x.nom === 'DOLIPRANE') || {}).posologie === ''), JSON.stringify(l1.j.lignes));
    ok('Le service a bien reçu l\'image (et rien n\'est gardé : voir le journal)', recus.length === 1 && recus[0] > 500, recus.join(','));
    const png = await lire('image/png', 50);
    ok('Fichier qui n\'est pas un JPEG : 400', png.s === 400, png.s);
    lent = 3500;
    const [a, z] = await Promise.all([lire('image/jpeg', 100), new Promise((r) => setTimeout(r, 300)).then(() => lire('image/jpeg', 100))]);
    lent = 0;
    ok('Deux envois simultanés : le second refusé (429)', [a.s, z.s].sort().join(',') === '200,429', a.s + ' / ' + z.s);

    const journal = q(`SELECT CONCAT_WS('|', COUNT(*), SUM(resultat = 'ok'), SUM(resultat = 'occupe'), MAX(lignes), MIN(taille_octets) > 0, MAX(fournisseur)) FROM mobile_lecture_avancee_journal WHERE horodatage >= '${DEBUT}'`);
    ok('Journal : une ligne par demande (2 lues, 1 occupée), lignes et taille, sans texte', journal === '3|2|1|2|1|claude', journal);
    const colonnes = q("SELECT GROUP_CONCAT(COLUMN_NAME) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mobile_lecture_avancee_journal'");
    ok('Le journal n\'a aucune colonne pour l\'image ou le texte lu', !/image|texte|contenu|photo/i.test(colonnes), colonnes);
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    if (avant !== null) { fs.writeFileSync(CONF, avant); } else if (fs.existsSync(CONF)) { fs.unlinkSync(CONF); }
    await b.close();
    faux.close();
    execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '-e', `DELETE FROM mobile_lecture_avancee_journal WHERE horodatage >= '${DEBUT}'`]);
    ok('Configuration et journal du test retirés', !fs.existsSync(CONF) || avant !== null);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
