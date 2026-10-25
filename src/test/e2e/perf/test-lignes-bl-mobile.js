/* LIGNES D'UN BL DEMANDEES EN UNE FOIS (application mobile de reception) : LENTEUR (journal du 21/10, 5,5 s).
 *
 * « Requete lente : GET /prestige/api/v1/commande/bon/items/{id}?page=1&start=0&limit=9999 ». Sur le banc, le plus
 * gros BL (492 lignes) prenait 43 a 47 s : chaque petite requete de la boucle faisait reverifier par Hibernate toutes
 * les lignes deja chargees (temps en carre du nombre de lignes).
 * Meme appel que l'application mobile, session ouverte par la page de connexion :
 *  - toutes les lignes en moins de 8 s ;
 *  - nombre de lignes et quantite commandee de chaque ligne = base ;
 *  - la page de 10 lignes de l'ecran « Gestion des entrees » reste sous 2 s.
 * Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [BL, NB] = q('SELECT lg_BON_LIVRAISON_ID, COUNT(*) FROM t_bon_livraison_detail GROUP BY lg_BON_LIVRAISON_ID ORDER BY COUNT(*) DESC LIMIT 1').split('\t');
const QTES = new Map(q(`SELECT lg_BON_LIVRAISON_DETAIL, int_QTE_CMDE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}'`)
  .split('\n').map((l) => l.split('\t')));

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage();
  const appel = (u) => p.evaluate(async (u) => { const t = performance.now(); const r = await fetch(u); const j = await r.json(); return { ms: Math.round(performance.now() - t), j }; }, u);
  try {
    ok('Jeu d\'essai : un gros BL', Number(NB) >= 300, NB + ' lignes');
    await connexion(p, 'admin', 'e2etest');
    const tout = await appel('../api/v1/commande/bon/items/' + BL + '?page=1&start=0&limit=9999');
    ok('Toutes les lignes (limit=9999) en moins de 8 s', tout.ms < 8000, tout.ms + ' ms');
    const lignes = tout.j.data || [];
    ok('Nombre de lignes = base', tout.j.total === Number(NB) && lignes.length === Number(NB), tout.j.total + ' / ' + lignes.length + ' / ' + NB);
    const ecarts = lignes.filter((l) => String(l.int_QTE_CMDE) !== QTES.get(l.lg_BON_LIVRAISON_DETAIL));
    ok('Quantité commandée de chaque ligne = base', lignes.length > 0 && ecarts.length === 0, ecarts.length + ' écart(s)');
    const page = await appel('../api/v1/commande/bon/items/' + BL + '?page=1&start=0&limit=10&sort=lg_FAMILLE_NAME&dir=ASC');
    ok('Page de 10 lignes de l\'écran : moins de 2 s', page.ms < 2000 && (page.j.data || []).length === 10, page.ms + ' ms');
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
