/* § 21 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 : L23, « Etat de contrôle Achats » bloque plus de 20 s.
 *
 * La liste chargeait les lignes de chaque bon, puis le produit et l'emplacement de chaque ligne, une requete a la fois ;
 * avec un filtre de statut, toute la periode etait chargee ainsi avant d'etre paginee.
 *
 * Parcours par les vues (compte e2e) : GESTION DES COMMANDES > « Etat de contrôle Achats », periode longue saisie au
 * clavier, Rechercher, puis filtre « Non contrôlés » (liste complete chargee cote serveur). Mesure de la reponse de
 * etat-control-bon/list ; total et premiere page compares a une reference si REF_L23 est fourni. Lecture seule.
 *
 * node support/anomalies-centre/test-l23-controle-achats.js   (BASE=http://localhost:9080/prestige ; DEBUT=01/01/2025 ;
 *   SEUIL_S=8 ; REF_L23=<fichier json ecrit au premier passage>)
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer, choisir, saisir } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const SEUIL = Number(process.env.SEUIL_S || 8) * 1000;
const DEBUT = process.env.DEBUT || '01/01/2025';
const z = (n) => String(n).padStart(2, '0');
const AUJ = (() => { const d = new Date(); return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear(); })();

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  const mesurer = async (action) => {
    const t0 = Date.now();
    const rep = p.waitForResponse((r) => /api\/v1\/etat-control-bon\/list/.test(r.url()), { timeout: 300000 });
    await action();
    const r = await rep;
    const corps = await r.json().catch(() => ({}));
    return { ms: Date.now() - t0, statut: r.status(), total: corps.total, page: (corps.data || []).map((x) => x.lgBONLIVRAISONID + ':' + x.checked + ':' + (x.items || '').length) };
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await p.waitForFunction(() => Ext.ComponentQuery.query('#datedebut').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await saisir(p, '#datedebut', DEBUT);
    await saisir(p, '#datefin', AUJ);
    const liste = await mesurer(() => cliquer(p, 'etatscontrolemanager button[text=Rechercher]'));
    ok('L23 liste paginée (' + DEBUT + ' → ' + AUJ + ') : ' + liste.total + ' bons en ' + liste.ms + ' ms', liste.statut === 200 && liste.ms < SEUIL, liste.ms);
    const filtre = await mesurer(() => choisir(p, '#filtreStatutControle', 'Non contrôlés'));
    ok('L23 filtre « Non contrôlés » (liste complète côté serveur) : ' + filtre.total + ' bons en ' + filtre.ms + ' ms', filtre.statut === 200 && filtre.ms < SEUIL, filtre.ms);
    const mesure = { liste, filtre };
    if (process.env.REF_L23 && fs.existsSync(process.env.REF_L23)) {
      const ref = JSON.parse(fs.readFileSync(process.env.REF_L23, 'utf8'));
      /* Le tri ne porte que sur la date : deux bons de meme date sortent dans un ordre libre, et la premiere page peut
       * en montrer d'autres. On compare les totaux, puis, bon par bon, le statut et le texte des lignes des bons vus
       * dans les deux passages. */
      const ecarts = []; let communs = 0;
      for (const k of ['liste', 'filtre']) {
        const avant = new Map(ref[k].page.map((x) => [x.split(':')[0], x]));
        for (const x of mesure[k].page) {
          const v = avant.get(x.split(':')[0]);
          if (v !== undefined) { communs++; if (v !== x) { ecarts.push([k, v, x]); } }
        }
      }
      ok('L23 mêmes résultats qu\'avant la correction (totaux ; statut et texte des lignes de ' + communs + ' bons)',
        ref.liste.total === liste.total && ref.filtre.total === filtre.total && ecarts.length === 0 && communs > 0,
        JSON.stringify({ avant: [ref.liste.total, ref.filtre.total], apres: [liste.total, filtre.total], ecarts: ecarts.slice(0, 6) }));
    } else if (process.env.REF_L23) {
      fs.writeFileSync(process.env.REF_L23, JSON.stringify(mesure));
      console.log('référence écrite : ' + process.env.REF_L23);
    }
    ok('L23 aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (x) { ok('parcours sans exception', false, x.message); } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
