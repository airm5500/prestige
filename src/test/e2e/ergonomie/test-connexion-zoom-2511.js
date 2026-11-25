/* RETOUR DU 25/11 (capture) : la fenêtre de connexion perd sa mise en page quand on augmente le zoom du navigateur :
 * carte réduite à une colonne étroite, bandeau bleu de gauche écrasé en une fine bande, logo « P 3 » posé sur le
 * formulaire.
 * Zoom du navigateur reproduit comme le fait Chromium : fenêtre CSS = écran / zoom, densité de pixels = zoom.
 * Écrans (zone utile du navigateur, barre des tâches et barre d'adresse déduites) : 1280 × 600 (écran 1280 × 720),
 * 1366 × 650 (écran 1366 × 768), 1920 × 960 (écran 1920 × 1080) ; zoom 100, 125, 150, 175 et 200 %.
 * Contrôles, pour chaque cas :
 *  - rien ne dépasse à droite ni à gauche (ni la carte ni la page) ;
 *  - mise en page cohérente : soit deux colonnes côte à côte, chacune d'au moins 300 px, soit une colonne (bandeau
 *    au-dessus du formulaire), de même largeur, d'au moins 300 px, dans la carte ;
 *  - titre, champs, « Se connecter » et « badge » entiers dans le formulaire, champs d'au moins 200 px ;
 *  - le logo ne recouvre ni le titre ni un champ ni un bouton ; carte centrée ; « Prestige » et « Espace produit »
 *    entiers en haut du bandeau ;
 *  - à la molette, le bouton « badge » (le plus bas) vient entier à l'écran.
 * Vrai chemin, au zoom le plus fort de l'écran le plus petit : identifiant, mot de passe, clic sur « Se connecter »,
 * l'application s'ouvre.
 * Lancement seul : node src/test/e2e/ergonomie/test-connexion-zoom-2511.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');

const BASE = process.env.BASE || 'http://localhost:8080/prestige';
const URL = BASE + '/security/index.html?content=panelInfos.jsp&lng=fr';
const ECRANS = [[1280, 600], [1366, 650], [1920, 960]];
const ZOOMS = [1, 1.25, 1.5, 1.75, 2];
let echecs = 0, total = 0;
const ok = (nom, cond, detail) => { total++; if (!cond) { echecs++; } console.log((cond ? 'PASS  ' : 'FAIL  ') + nom + (detail !== undefined && !cond ? '  [' + detail + ']' : '')); };

const mesurer = (p) => p.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) { return null; } const b = e.getBoundingClientRect();
    return { g: Math.round(b.left), d: Math.round(b.right), h: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.width) }; };
  const croise = (a, b) => a && b && a.g < b.d - 1 && b.g < a.d - 1 && a.h < b.b - 1 && b.h < a.b - 1;
  const carte = r('.pl-card'), hero = r('.pl-hero'), panneau = r('.pl-login-panel'), logo = r('.pl-pharmacy-logo');
  const elements = { titre: r('#pl-titre-connexion'), identifiant: r('#str_login'), motDePasse: r('#str_password'), connecter: r('#login'), badge: r('#pl-badge') };
  const W = window.innerWidth;
  const cote = hero.d <= panneau.g + 1 && Math.abs(hero.h - panneau.h) < 2;
  const empile = hero.b <= panneau.h + 1;
  const disposition = cote ? 'deux colonnes' : (empile ? 'une colonne' : 'autre');
  const coherente = (cote && hero.l >= 300 && panneau.l >= 300)
    || (empile && Math.abs(hero.l - panneau.l) <= 2 && hero.l >= 300 && hero.g >= carte.g && hero.d <= carte.d && panneau.g >= carte.g && panneau.d <= carte.d);
  const horsFormulaire = Object.keys(elements).filter((k) => { const e = elements[k];
    return !e || e.g < panneau.g - 1 || e.d > panneau.d + 1 || (k !== 'titre' && e.l < 200); });
  const sousLogo = Object.keys(elements).filter((k) => croise(logo, elements[k]));
  /* en-tête du bandeau : la pilule « Prestige » et « Espace produit » entières (rien de rogné) */
  const dans = (t, c) => { const a = r(t), b = r(c); return !!a && !!b && a.g >= b.g - 1 && a.d <= b.d + 1; };
  const entete = { prestige: dans('.pl-brand__text', '.pl-brand'), espaceProduit: dans('#espaceProduit span:last-child', '#espaceProduit') && dans('#espaceProduit', '.pl-hero') };
  return { W, H: window.innerHeight, disposition, coherente, hero: hero.l, panneau: panneau.l, carte,
    deborde: carte.g < 0 || carte.d > W + 1 || document.documentElement.scrollWidth > W + 1, horsFormulaire, sousLogo,
    centree: Math.abs(carte.g - (W - carte.d)) <= 2, entete };
});

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  try {
    for (const [lg, ht] of ECRANS) {
      for (const z of ZOOMS) {
        const ctx = await b.newContext({ viewport: { width: Math.round(lg / z), height: Math.round(ht / z) }, deviceScaleFactor: z });
        const p = await ctx.newPage();
        const nom = `${lg}×${ht} à ${Math.round(z * 100)} %`;
        try {
          await p.goto(URL, { waitUntil: 'load' });
          await p.waitForTimeout(700);
          const m = await mesurer(p);
          ok(`${nom} : rien ne dépasse à droite ni à gauche`, !m.deborde, JSON.stringify(m));
          ok(`${nom} : mise en page cohérente (${m.disposition})`, m.coherente, JSON.stringify(m));
          ok(`${nom} : titre, champs et boutons entiers dans le formulaire`, m.horsFormulaire.length === 0, JSON.stringify(m.horsFormulaire) + ' ' + JSON.stringify(m));
          ok(`${nom} : le logo ne recouvre rien du formulaire`, m.sousLogo.length === 0, JSON.stringify(m.sousLogo));
          ok(`${nom} : carte centrée`, m.centree, JSON.stringify(m.carte) + ' largeur ' + m.W);
          ok(`${nom} : « Prestige » et « Espace produit » entiers en haut du bandeau`, m.entete.prestige && m.entete.espaceProduit, JSON.stringify(m.entete));
          /* comme l'utilisateur : molette jusqu'en bas */
          await p.mouse.move(Math.round(m.W / 2), Math.round(m.H / 2));
          for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(80); }
          await p.waitForTimeout(300);
          const bas = await p.evaluate(() => { const e = document.getElementById('pl-badge').getBoundingClientRect(); return { h: Math.round(e.top), b: Math.round(e.bottom), H: window.innerHeight }; });
          ok(`${nom} : à la molette, le bouton « badge » vient entier à l'écran`, bas.h >= 0 && bas.b <= bas.H + 1, JSON.stringify(bas));
          if (lg === 1280 && z === 2) {
            await p.mouse.wheel(0, -4000); await p.waitForTimeout(300);
            await p.fill('#str_login', ENV_E2E.LOGIN);
            await p.fill('#str_password', 'e2etest');
            await p.click('#login');
            const ouvert = await p.waitForURL('**/general/**', { timeout: 60000 }).then(() => true).catch(() => false);
            ok(`${nom} : connexion par le formulaire, l'application s'ouvre`, ouvert, p.url());
          }
        } catch (x) {
          ok(`${nom} : parcours sans exception`, false, x.message.split('\n')[0]);
        }
        await ctx.close();
      }
    }
  } finally {
    await b.close().catch(() => {});
  }
  console.log('\n' + (total - echecs) + '/' + total + (echecs ? ' — ' + echecs + ' échec(s)' : ' OK'));
  process.exit(echecs ? 1 : 0);
})();
