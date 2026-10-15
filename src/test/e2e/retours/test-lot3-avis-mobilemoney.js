/* LECTURES SANS ECRITURE CACHEE ET DETAIL MOBILE MONEY (demandes serveur des applications mobiles, 22 et 25).
 *  - GET avis-clients/avis/{id}?marquerLu=false : l'avis est rendu SANS passer « lu » pour toute l'equipe ;
 *    sans parametre : comportement d'origine (marque lu) ;
 *  - GET ca-all : chaque jour porte detailMobile [{modeId, libelle, montant}] et la somme egale totMobile ;
 *  - POST inventaire/creation (20) : la reponse porte l'identifiant et le libelle de l'inventaire cree.
 * Avis d'essai retire a la fin ; le reste est en lecture seule.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const ID = 'E2E-AVIS-LU';
let inventaireCree = null;
const statut = () => q(`SELECT statut FROM t_avis_client WHERE id = '${ID}'`);

(async () => {
  exec(`DELETE FROM t_avis_client WHERE id = '${ID}'; INSERT INTO t_avis_client (id, dt_CREATED, note, texte, anonyme, rappel, statut) VALUES ('${ID}', NOW(), 4, 'Essai', 1, 0, 'NOUVEAU')`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext()).newPage();
  const get = (u) => p.evaluate(async (u) => (await fetch(u)).json(), u);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const a1 = await get('../api/v1/avis-clients/avis/' + ID + '?marquerLu=false');
    ok('Avis lu avec marquerLu=false : rendu, reste NOUVEAU', a1.success && statut() === 'NOUVEAU', JSON.stringify(a1).slice(0, 120) + ' ' + statut());
    const a2 = await get('../api/v1/avis-clients/avis/' + ID);
    ok('Sans paramètre (poste web) : marqué LU comme avant', a2.success && statut() === 'LU', statut());

    const fin = q("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d')"), debut = q("SELECT DATE_FORMAT(CURDATE() - INTERVAL 20 DAY, '%Y-%m-%d')");
    const ca = await get('../api/v1/ca-all?dtStart=' + debut + '&dtEnd=' + fin);
    const jours = Array.isArray(ca) ? ca : (ca.data || []);
    const ecarts = jours.filter((j) => (j.detailMobile || []).reduce((s, d) => s + d.montant, 0) !== j.totMobile);
    const avec = jours.filter((j) => (j.detailMobile || []).length > 0);
    ok('ca-all : pour chaque jour, Σ detailMobile = totMobile', jours.length > 0 && ecarts.length === 0, JSON.stringify({ jours: jours.length, ecarts: ecarts.slice(0, 2) }));
    ok('ca-all : détail par opérateur (modeId, libellé, montant) sur les jours avec Mobile Money', avec.length > 0 && avec.every((j) => j.detailMobile.every((d) => d.modeId && d.libelle && d.montant !== undefined)),
      JSON.stringify(avec.slice(0, 1).map((j) => j.detailMobile)));
    const rayon = q("SELECT lg_ZONE_GEO_ID FROM t_famille WHERE str_STATUT = 'enable' GROUP BY 1 ORDER BY COUNT(*) LIMIT 1");
    const cr = await p.evaluate(async (r) => (await fetch('../api/v1/inventaire/creation', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ str_NAME: 'E2E-INV-ID', str_TYPE_TRANSACTION: 'Emplacement', valeurs: [r] }) })).json(), rayon);
    inventaireCree = cr.lgInventaireId;
    ok('Création d\'inventaire : identifiant et libellé renvoyés (le terminal ne le cherche plus par son nom)', cr.success === 1 && !!cr.lgInventaireId && cr.libelle === 'E2E-INV-ID'
      && q(`SELECT str_NAME FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${cr.lgInventaireId}'`) === 'E2E-INV-ID', JSON.stringify(cr));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    exec(`DELETE FROM t_avis_client WHERE id = '${ID}'`);
    exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN (SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME = 'E2E-INV-ID'); DELETE FROM t_inventaire WHERE str_NAME = 'E2E-INV-ID'");
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
