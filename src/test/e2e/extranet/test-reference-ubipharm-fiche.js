/* REFERENCE UBIPHARM (PSCODE) DE LA FICHE ARTICLE ET RAPPROCHEMENT DES NOUVEAUX PRODUITS.
 * Decision du 08/11 : une seule colonne, t_famille.str_PSCODE (V7.2.39, branche integration/recette-2026-10-29,
 * point 15 du plan du 06/11). La saisie sur la fiche article et sa recherche sont testees sur cette branche ; ici la
 * valeur est posee en base a la place de la fiche, puis tout le reste passe par le vrai chemin de l'ecran :
 *  - GESTION DES COMMANDES > Extranets grossistes, Ubipharm > Produits > Nouveaux produits, « Rapprocher avec
 *    Prestige » : statut « référence Ubipharm de la fiche » pour l'article qui porte le PSCODE ;
 *  - rapprochement : base = ecran = API, un seul candidat, les autres produits inchanges ;
 *  - PSCODE retire : le rapprochement ne le trouve plus par la reference ;
 *  - bilan : le rapprochement n'ecrit rien (fiche, t_famille_grossiste) ; donnees du test retirees.
 * Le faux extranet local (faux-extranet.js) sert la page des nouveaux produits : jamais le vrai.
 *
 * Lancement (domain3, laborex_audit, Payara demarre avec -DEXTRANET_UBIPHARM_URL=http://127.0.0.1:18765) :
 *   BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node test-reference-ubipharm-fiche.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const faux = require('./faux-extranet');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : ''));
}

const RESTE = "CONCAT_WS('|', str_NAME, int_CIP, int_PRICE, int_PAF, IFNULL(int_EAN13, ''), IFNULL(code_ean_fabriquant, ''),"
  + " IFNULL(str_CODE_GEO_ARTICLE, ''), lg_ZONE_GEO_ID, str_STATUT, IFNULL(lg_GROSSISTE_ID, ''))";

/* Garde (incident du 08/11) : la base ne doit contenir aucun compte d'extranet. Sinon ce sont des comptes reels :
 * l'ecran des extranets s'y connecterait sur les vrais sites et le nettoyage du test les effacerait. */
if (Number(q('SELECT COUNT(*) FROM extranet_compte')) > 0) {
  console.log('ARRET : ' + ENV_E2E.BASE + ' contient des comptes d’extranet (identifiants réels) : test non lancé.'
    + ' Utiliser une base sans compte enregistré.');
  process.exit(2);
}

(async () => {
  const [P, cip, nom] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME) FROM t_famille f WHERE f.str_STATUT = 'enable'"
    + " AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.str_PSCODE IS NULL"
    + " ORDER BY f.str_NAME LIMIT 1 OFFSET 5").split('|');
  const code = () => q("SELECT IFNULL(str_PSCODE, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'");
  const reste = () => q('SELECT ' + RESTE + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'");
  const resteAvant = reste();
  const grossisteAvant = q('CHECKSUM TABLE t_famille_grossiste');
  const autresAvant = q("SELECT COUNT(*) FROM t_famille WHERE str_PSCODE IS NOT NULL");
  const premiereCollecte = Number(q('SELECT IFNULL(MAX(id), 0) + 1 FROM extranet_collecte'));
  const srv = await faux.demarrer(18765);
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));

  /* a la place de la fiche article (branche d'integration) : PSCODE pose ou retire en base */
  const poser = (v) => q("UPDATE t_famille SET str_PSCODE = " + (v ? "'" + v + "'" : 'NULL') + " WHERE lg_FAMILLE_ID = '" + P + "'");

  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* ---- cache des nouveaux produits (FAIR248 en fait partie), par l'ecran des extranets */
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await vues.saisir(p, 'extranetsgrossistes #exCookieUBIPHARM', srv.COOKIE);
    await vues.cliquer(p, 'extranetsgrossistes #exSaisieUBIPHARM button[text=Enregistrer]');
    await p.waitForTimeout(1200);
    for (const t of ['Ubipharm', 'Produits', 'Nouveaux produits']) { await vues.cliquer(p, 'extranetsgrossistes #exOnglets tab[text=' + t + ']'); await p.waitForTimeout(300); }
    const collecte = p.waitForResponse((x) => x.url().indexOf('/nouveaux/collecte') >= 0, { timeout: 120000 });
    await vues.cliquer(p, 'extranetsgrossistes #exNouveauxCollecter');
    ok('nouveaux produits lus (faux extranet)', (await (await collecte).json()).success === true);
    await p.waitForTimeout(1000);

    async function rapprocher() {
      for (const t of ['Ubipharm', 'Produits', 'Nouveaux produits']) { await vues.cliquer(p, 'extranetsgrossistes #exOnglets tab[text=' + t + ']'); await p.waitForTimeout(300); }
      await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('extranetsgrossistes')[0].nouveaux;
        return !st.isLoading() && st.getCount() > 0; }, null, { timeout: 30000 });
      const r = p.waitForResponse((x) => x.url().indexOf('/nouveaux/rapprochement') >= 0, { timeout: 60000 });
      await vues.cliquer(p, 'extranetsgrossistes #exRapprocher');
      const api = await (await r).json();
      await p.waitForTimeout(800);
      const ecran = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes')[0].nouveaux.getRange()
        .map((x) => ({ pscode: x.get('pscode'), prestige: x.get('prestige') })));
      const cellule = await p.evaluate(() => { const g = Ext.ComponentQuery.query('extranetsgrossistes #exOngletNouveaux gridpanel')[0];
        const i = g.getStore().findExact('pscode', 'FAIR248'); const n = i >= 0 && g.getView().getNode(i); return n ? n.textContent : ''; });
      return { api, ecran, cellule, fair: ecran.find((x) => x.pscode === 'FAIR248') };
    }
    const avant = await rapprocher();
    ok('avant saisie : FAIR248 absent de Prestige par la référence', avant.fair && avant.fair.prestige
      && avant.fair.prestige.statut !== 'PSCODE', JSON.stringify(avant.fair));

    /* ---- PSCODE pose sur l'article */
    poser('FAIR248');
    ok('base : str_PSCODE = FAIR248 sur l’article choisi', code() === 'FAIR248', code());

    /* ---- rapprochement : base = ecran des extranets = API */
    const apres = await rapprocher();
    const pApi = apres.api.data.find((x) => x.pscode === 'FAIR248');
    ok('rapprochement : FAIR248 trouvé par la référence de la fiche, un seul article = celui modifié', apres.fair && apres.fair.prestige
      && apres.fair.prestige.statut === 'PSCODE' && apres.fair.prestige.candidats.length === 1
      && apres.fair.prestige.candidats[0].familleId === P, JSON.stringify(apres.fair));
    ok('rapprochement : écran = API', JSON.stringify(pApi) === JSON.stringify(apres.fair.prestige));
    ok('rapprochement : libellé et nom de l\'article affichés', apres.cellule.indexOf('référence Ubipharm de la fiche') >= 0
      && apres.cellule.indexOf(nom.slice(0, 15)) >= 0, apres.cellule);
    ok('rapprochement : les autres produits ne changent pas', JSON.stringify(apres.ecran.filter((x) => x.pscode !== 'FAIR248'))
      === JSON.stringify(avant.ecran.filter((x) => x.pscode !== 'FAIR248')));

    /* ---- PSCODE retire : plus trouve par la reference */
    poser(null);
    const fin = await rapprocher();
    ok('PSCODE retiré : FAIR248 n’est plus trouvé par la référence', fin.fair && fin.fair.prestige
      && fin.fair.prestige.statut !== 'PSCODE' && JSON.stringify(fin.fair) === JSON.stringify(avant.fair), JSON.stringify(fin.fair));
    ok('bilan : le rapprochement n’écrit rien sur la fiche', reste() === resteAvant && code() === 'NULL');
    ok('bilan : aucun autre article ne reçoit de PSCODE', q("SELECT COUNT(*) FROM t_famille WHERE str_PSCODE IS NOT NULL") === autresAvant);
    ok('bilan : t_famille_grossiste inchangée', q('CHECKSUM TABLE t_famille_grossiste') === grossisteAvant);
    ok('aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'reference-ubipharm-erreur').catch(() => {});
  } finally {
    poser(null);
    q('DELETE FROM extranet_nouveau_produit WHERE collecte_id >= ' + premiereCollecte + '; DELETE FROM extranet_collecte WHERE id >= ' + premiereCollecte);
    await p.evaluate(() => fetch('../api/v1/extranet/sessions/UBIPHARM', { method: 'DELETE' })).catch(() => {});
    ok('nettoyage : article remis à l\'identique', code() === 'NULL' && reste() === resteAvant);
    await navigateur.close();
    await srv.arreter();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
