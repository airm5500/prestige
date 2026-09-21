/* Evolution 6, point 1 : LES AGREGATS DU PILOTAGE SUIVENT LES CORRECTIONS TARDIVES.
 *
 * La question posee par l'officine le 19/09 : « et si les donnees sont modifiees - une annulation de vente, une
 * vente courante modifiee, des bons d'assurance saisis a des jours passes qu'il faut rattraper ? »
 *
 * Un mois clos n'est plus recalcule a chaque clic : c'est ce qui rend l'ecran rapide. Mais un chiffre rapide et faux
 * ne vaut rien. Ce test etablit donc, en jouant l'ecran, qu'une correction portant sur un mois DEJA CALCULE est vue
 * et reprise sans que personne n'ait rien a demander :
 *
 *  - on ouvre l'ecran pour que le mois soit calcule et enregistre ;
 *  - on annule une vente d'un mois passe, DIRECTEMENT EN BASE, comme le ferait une correction tardive ;
 *  - on rouvre l'ecran : le chiffre d'affaires du mois doit avoir baisse d'exactement le montant de cette vente ;
 *  - on remet la vente en etat, et le chiffre revient a sa valeur d'origine.
 *
 * La vente est remise en etat quoi qu'il arrive : ce test ne laisse pas la base modifiee derriere lui.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 330) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

(async () => {
  /* Une vente d'un mois DEJA CLOS : c'est le cas qui pose question, celui qu'on ne recalcule plus. */
  const vente = q("SELECT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p"
    + " WHERE p.int_PRICE>0 AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.lg_TYPE_VENTE_ID<>'5'"
    + " AND p.dt_UPDATED >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH),'%Y-%m-01')"
    + " AND p.dt_UPDATED < DATE_FORMAT(CURDATE(),'%Y-%m-01') ORDER BY p.int_PRICE DESC LIMIT 1");
  if (!vente) {
    console.log('Aucune vente sur le mois precedent : controle impossible sur ce jeu d essai.');
    console.log('0/0 controles OK');
    return;
  }
  const moisVente = q("SELECT DATE_FORMAT(dt_UPDATED,'%Y-%m') FROM t_preenregistrement"
    + " WHERE lg_PREENREGISTREMENT_ID='" + vente + "'");
  const montantVente = Number(q("SELECT int_PRICE - COALESCE(int_PRICE_REMISE,0) FROM t_preenregistrement"
    + " WHERE lg_PREENREGISTREMENT_ID='" + vente + "'"));

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  let remise = false;
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr',
      { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* Le mois lu par l'ecran, avant toute correction. L'axe « 12 mois glissants » couvre le mois precedent. */
    const lireMois = async (mois) => p.evaluate(async (m) => {
      const r = await fetch('../api/v1/pilotage/onglet/synthese?axe=G12&_=' + Math.random());
      const j = JSON.parse(await r.text());
      const ligne = (j.mois || []).filter((x) => x.mois === m)[0];
      return ligne ? ligne.caTTC : null;
    }, mois);

    const avant = await lireMois(moisVente);
    ok('Précondition : le mois est calculé et affiché', avant !== null && avant > 0,
      moisVente + ' = ' + avant);
    const enregistre = Number(q("SELECT int_CA_TTC FROM pilotage_agregat_mensuel WHERE str_MOIS='" + moisVente + "'"));
    ok('Et il est bien ENREGISTRÉ comme agrégat : c est ce qui rend l écran rapide',
      Math.abs(enregistre - avant) < 1, enregistre + ' en base contre ' + avant + ' à l écran');

    /* LA CORRECTION TARDIVE : on annule une vente d un mois deja calcule, comme l officine le ferait. */
    exec("UPDATE t_preenregistrement SET b_IS_CANCEL=1, dt_ANNULER=NOW()"
      + " WHERE lg_PREENREGISTREMENT_ID='" + vente + "'");
    remise = true;

    await p.waitForTimeout(3000);
    /*
     * LE CONTROLE NE SE FAIT PLUS A CHAQUE AFFICHAGE (21/09) : il coutait trois secondes et demie sur treize
     * mois chez l'officine, et le payer a chaque changement d'onglet n'avait aucun sens - « je ne peux pas
     * etre dans ce menu et etre en train de faire des annulations au meme moment ». Il se declenche
     * desormais a l'OUVERTURE du menu et au clic sur « Actualiser ».
     *
     * On verifie donc les deux faces de cette regle : un simple affichage sert ce qui est enregistre, et
     * c'est le controle qui fait apparaitre la correction.
     */
    const sansControle = await p.evaluate(async (m) => {
      const r = await fetch('../api/v1/pilotage/onglet/marge?axe=G12&_=' + Math.random());
      const j = JSON.parse(await r.text());
      const ligne = (j.mois || []).filter((x) => x.mois === m)[0];
      return ligne ? ligne.caTTC : null;
    }, moisVente);
    ok('Un simple affichage sert ce qui est enregistré : il ne revérifie plus rien',
      sansControle !== null && Math.abs(sansControle - avant) < 1,
      'affiché ' + sansControle + ', enregistré ' + avant);

    const apres = await p.evaluate(async (m) => {
      /* C'est ce que fait l'ecran a l'ouverture du menu et au clic sur « Actualiser ». */
      await fetch('../api/v1/pilotage/controler?axe=G12&_=' + Math.random());
      const r = await fetch('../api/v1/pilotage/onglet/marge?axe=G12&_=' + Math.random());
      const j = JSON.parse(await r.text());
      const ligne = (j.mois || []).filter((x) => x.mois === m)[0];
      return ligne ? ligne.caTTC : null;
    }, moisVente);
    ok('Une vente annulée APRÈS coup sur un mois déjà calculé est vue, et le mois est repris',
      apres !== null && Math.abs((avant - apres) - montantVente) < 1,
      'avant ' + avant + ', après ' + apres + ', vente annulée ' + montantVente);

    const reprisEnBase = Number(q("SELECT int_CA_TTC FROM pilotage_agregat_mensuel WHERE str_MOIS='"
      + moisVente + "'"));
    ok('Et l agrégat ENREGISTRÉ est corrigé, pas seulement l affichage',
      Math.abs(reprisEnBase - (avant - montantVente)) < 1,
      reprisEnBase + ' en base, attendu ' + (avant - montantVente));

    /* On remet la vente en etat : le mois doit revenir a sa valeur d origine, tout seul. */
    exec("UPDATE t_preenregistrement SET b_IS_CANCEL=0, dt_ANNULER=NULL"
      + " WHERE lg_PREENREGISTREMENT_ID='" + vente + "'");
    remise = false;
    await p.evaluate(async () => {
      await fetch('../api/v1/pilotage/controler?axe=G12&_=' + Math.random());
    });
    await p.waitForTimeout(7000);
    const retabli = await p.evaluate(async (m) => {
      const r = await fetch('../api/v1/pilotage/onglet/ventes?axe=G12&_=' + Math.random());
      const j = JSON.parse(await r.text());
      const ligne = (j.mois || []).filter((x) => x.mois === m)[0];
      return ligne ? ligne.caTTC : null;
    }, moisVente);
    ok('La correction inverse est vue elle aussi : le mois revient à sa valeur d origine',
      retabli !== null && Math.abs(retabli - avant) < 1, retabli + ' contre ' + avant);

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + e.stack);
  } finally {
    if (remise) {
      exec("UPDATE t_preenregistrement SET b_IS_CANCEL=0, dt_ANNULER=NULL"
        + " WHERE lg_PREENREGISTREMENT_ID='" + vente + "'");
    }
    await b.close();
  }
  const okc = res.filter((r) => r.c).length;
  console.log('\n' + okc + '/' + res.length + ' controles OK');
  process.exit(okc === res.length ? 0 : 1);
})();
