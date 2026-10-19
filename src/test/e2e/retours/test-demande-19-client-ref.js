/* DEMANDE 19 DES APPLICATIONS MOBILES : FICHE CLIENT SANS DOUBLON (X-Client-Ref).
 *
 * POST v1/ordonnance-client/client/{id}/mesures et POST v1/ordonnance-client/enregistrer n'etaient pas idempotents :
 * un double envoi (reseau coupe puis repris) creait deux mesures ou deux ordonnances dans le dossier du patient.
 *  - meme X-Client-Ref deux fois : meme reponse, UNE seule mesure / UNE seule ordonnance ;
 *  - autre cle : nouvel enregistrement ; sans cle : comme avant.
 * Seuls des identifiants de client sont lus (aucune colonne nominative). Mesures et ordonnances d'essai retirees.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CLIENT = q("SELECT lg_CLIENT_ID FROM t_client ORDER BY lg_CLIENT_ID LIMIT 1");
const NOTE = 'E2E-D19', LIB = 'E2E D19 PREPARATION';
const ordonnances = () => q(`SELECT IFNULL(GROUP_CONCAT(DISTINCT d.lg_ORDONNANCE_ID), '') FROM t_ordonnance_client_detail d WHERE d.str_LIBELLE = '${LIB}'`);
const retirer = () => {
  const ids = ordonnances().split(',').filter(Boolean).map((x) => `'${x}'`).join(',') || "''";
  q(`DELETE FROM mobile_client_ref WHERE ref LIKE 'e2e-d19-%'; DELETE FROM t_client_mesure WHERE str_COMMENTAIRE = '${NOTE}';`
    + ` DELETE FROM t_ordonnance_client_detail WHERE lg_ORDONNANCE_ID IN (${ids}); DELETE FROM t_ordonnance_client WHERE lg_ORDONNANCE_ID IN (${ids})`);
};

(async () => {
  retirer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage();
  const post = (u, c, cle) => p.evaluate(async ([u, c, k]) => { const r = await fetch(u, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, k ? { 'X-Client-Ref': k } : {}), body: JSON.stringify(c) });
    return r.json(); }, [u, c, cle]);
  const mesures = () => Number(q(`SELECT COUNT(*) FROM t_client_mesure WHERE str_COMMENTAIRE = '${NOTE}'`));
  const nbOrd = () => ordonnances().split(',').filter(Boolean).length;
  try {
    await connexion(p, 'admin', 'e2etest');
    const m = { parametreId: 'PARAM_POIDS', valeur: 70, commentaire: NOTE };
    const u = '../api/v1/ordonnance-client/client/' + encodeURIComponent(CLIENT) + '/mesures';
    const a1 = await post(u, m, 'e2e-d19-m1'), a2 = await post(u, m, 'e2e-d19-m1');
    ok('Mesure, même X-Client-Ref deux fois : une seule mesure, même réponse', a1.success === true && a2.success === true && mesures() === 1
      && JSON.stringify(a1) === JSON.stringify(a2), mesures() + ' ' + JSON.stringify([a1, a2]));
    await post(u, m, 'e2e-d19-m2');
    ok('Mesure, autre clé : nouvelle mesure', mesures() === 2, mesures());
    const o = { clientId: CLIENT, dateOrdonnance: q("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d')"), produits: [{ libelle: LIB, quantite: 1 }] };
    const o1 = await post('../api/v1/ordonnance-client/enregistrer', o, 'e2e-d19-o1');
    const o2 = await post('../api/v1/ordonnance-client/enregistrer', o, 'e2e-d19-o1');
    ok('Ordonnance, même X-Client-Ref deux fois : une seule ordonnance, même identifiant', o1.success === true && o2.success === true && nbOrd() === 1 && o1.id === o2.id,
      nbOrd() + ' ' + JSON.stringify([o1.id, o2.id]));
    await post('../api/v1/ordonnance-client/enregistrer', o);
    ok('Ordonnance sans clé : comme avant (nouvelle ordonnance)', nbOrd() === 2, nbOrd());
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    ok('Mesures et ordonnances d\'essai retirées', mesures() === 0 && nbOrd() === 0);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
