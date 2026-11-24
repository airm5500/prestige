/* DATES FUTURES REFUSEES AU SERVEUR (cahier des charges du 24/11, point 1).
 *
 * Avant, seul le calendrier de l'écran bornait la date (maxValue = date du POSTE) : un poste dont l'horloge avance,
 * ou un appel direct, faisait passer une date de règlement ou une date de vente dans le futur. Le serveur refuse
 * désormais, par rapport à l'heure réelle qu'il suit.
 *
 *  - Changement de la date d'une vente (bouton des ventes terminées) : demain, dans 2 minutes, en 2189 -> refus 400
 *    avec le motif en clair ; la vente et son mouvement de caisse sont inchangés.
 *  - Règlement d'un différé (un client, ou tous) : date de demain -> refus avec le motif ; aucun règlement, aucun
 *    mouvement écrit.
 *  - La minute en cours reste acceptée par le contrôle (pas de faux refus) : vérifié par DatesFuturesTest.
 * Aucune donnée n'est modifiée : les vérifications portent sur des refus. Sur l'ancien code, les appels passent
 * (changement de date accepté sans contrôle) : le test échoue.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const vues = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

(async () => {
  /* une vente comptant terminée : son changement de date ne touche rien sur l'ancien code (assurance et carnet seulement) */
  const vente = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE str_STATUT = 'is_Closed' AND lg_TYPE_VENTE_ID = '1' AND b_IS_CANCEL = 0"
    + ' ORDER BY dt_UPDATED DESC LIMIT 1');
  const empreinte = () => q("SELECT CONCAT_WS('|', p.dt_CREATED, p.dt_UPDATED, p.lg_USER_ID, IFNULL((SELECT GROUP_CONCAT(CONCAT(m.mvtDate, '/', m.createdAt)) FROM mvttransaction m"
    + " WHERE m.vente_id = p.lg_PREENREGISTREMENT_ID), '-')) FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = '" + vente + "'");
  const avant = empreinte();
  const debut = q('SELECT NOW()');
  const ecritures = () => q("SELECT CONCAT((SELECT COUNT(*) FROM t_reglement WHERE dt_CREATED >= '" + debut + "'), '|', (SELECT COUNT(*) FROM mvttransaction WHERE createdAt >= '" + debut + "'),"
    + " '|', (SELECT COUNT(*) FROM vente_modifiee WHERE vente_id = '" + vente + "' AND mvt_date >= '" + debut + "'))");
  const ecritures0 = ecritures();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const poster = (url, corps) => p.evaluate(async ([u, c]) => { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
      const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 300) }; } j.http = r.status; return j; }, [url, corps]);
    const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const hm = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    /* reference : l'heure du serveur, pas celle du poste qui lance le test */
    const serveur = new Date(q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s')"));
    const demain = new Date(serveur.getTime() + 86400000), dans2 = new Date(serveur.getTime() + 180000);

    for (const [nom, date, heure] of [['demain', iso(demain), '09:00'], ['dans 3 minutes', iso(dans2), hm(dans2)], ['en 2189', '2189-01-01', '08:00']]) {
      const r = await poster('../api/v1/vente/update-created-date', { venteId: vente, date, heure });
      ok('Date de vente ' + nom + ' : refusée par le serveur (400), motif en clair', r.http === 400 && r.success === false && /dans le futur/.test(r.msg || ''), JSON.stringify(r));
    }
    ok('La vente et son mouvement de caisse sont inchangés', empreinte() === avant, empreinte() + ' / ' + avant);

    const corps = { montantRecu: 100, montantRemis: 0, montantPaye: 100, clientId: 'E2E-DATES-INEXISTANT', typeRegleId: '1', nom: '', banque: '', lieux: '',
      totalRecap: 100, natureVenteId: iso(demain), commentaire: '[]', restesAttendus: '[]' };
    const r1 = await poster('../api/v1/reglement/reglementdiffere', corps);
    ok('Règlement d\'un différé daté de demain : refusé, motif en clair', r1.success === false && /dans le futur/.test(r1.msg || ''), JSON.stringify(r1));
    const r2 = await poster('../api/v1/reglement/reglementdiffere-all', corps);
    ok('Règlement de tous les différés daté de demain : refusé, motif en clair', r2.success === false && /dans le futur/.test(r2.msg || ''), JSON.stringify(r2));
    ok('Bilan : aucun règlement, aucun mouvement, aucune modification de vente écrits', ecritures() === ecritures0, ecritures() + ' / ' + ecritures0);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
