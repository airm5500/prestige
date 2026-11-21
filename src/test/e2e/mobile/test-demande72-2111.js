/* DEMANDE 72 (Prestige Inventaire V3 5.0.3, 21/11) : PUT v1/ws/inventaires/details repondait 200 SANS CORPS quand la
 * quantite etait enregistree. Un intermediaire (portail captif, relais, box) qui repond 200 sans corps ne se distinguait
 * donc pas de Prestige : la saisie pouvait sortir de la file du terminal sans etre arrivee.
 *
 * Correctif : 200 avec le corps JSON {"success":1,"id":<id recu>,"quantite":<quantite enregistree>}
 * (Content-Type application/json). Les refus (400, 404, 409, 401) ne changent pas.
 *
 * Controles, par la route de l'application d'inventaire avec une vraie session (v1/user/auth) :
 *  - quatre lignes d'un inventaire ouvert, quantites differentes (0, 1, 7, 23), puis 1250 sur la premiere et un renvoi
 *    a l'identique : 200, application/json, success 1, id et quantite = ceux envoyes ;
 *  - rapprochement : reponse = base (int_NUMBER, auteur) = liste de l'application (detailsAll, quantiteSaisie, auteur) ;
 *  - refus inchanges : 404 LIGNE_INCONNUE, 400 QUANTITE_INVALIDE (absente, negative), 409 INVENTAIRE_CLOTURE, 401 sans
 *    session ; aucun ne porte « success: 1 » ;
 *  - bilan : seules les lignes saisies changent ; tout est remis a l'identique (CHECKSUM des tables).
 * Lancement seul : node src/test/e2e/mobile/test-demande72-2111.js
 */
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const API = (process.env.BASE || 'http://localhost:8080/prestige') + '/api/';
const sqlv = (v) => (v === 'NULL' ? 'NULL' : `'${v}'`);
const EMPREINTE = () => q('CHECKSUM TABLE t_inventaire_famille, t_inventaire, t_famille_stock, mvttransaction')
  .split('\n').map((l) => l.split('\t')[1]).join(',');

const ADMIN = q(`SELECT CONCAT_WS('|', lg_USER_ID, str_LOGIN) FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`).split('|');
/* inventaire ouvert ; quatre lignes ouvertes et comptees (bool_INVENTAIRE), produits differents */
const INV = q(`SELECT i.lg_INVENTAIRE_ID FROM t_inventaire i JOIN t_inventaire_famille f ON f.lg_INVENTAIRE_ID = i.lg_INVENTAIRE_ID
  WHERE i.str_STATUT = 'enable' AND f.str_STATUT = 'enable' AND f.bool_INVENTAIRE = 1 GROUP BY i.lg_INVENTAIRE_ID HAVING COUNT(*) >= 4
  ORDER BY COUNT(*) LIMIT 1`);
const LIGNES = INV ? q(`SELECT CONCAT_WS('|', f.lg_INVENTAIRE_FAMILLE_ID, p.int_CIP, f.int_NUMBER, IFNULL(f.dt_UPDATED, 'NULL'), IFNULL(f.str_UPDATED_ID, 'NULL'))
  FROM t_inventaire_famille f JOIN t_famille p ON p.lg_FAMILLE_ID = f.lg_FAMILLE_ID
  WHERE f.lg_INVENTAIRE_ID = '${INV}' AND f.str_STATUT = 'enable' AND f.bool_INVENTAIRE = 1 AND p.int_CIP IS NOT NULL AND p.int_CIP <> ''
  ORDER BY f.lg_INVENTAIRE_FAMILLE_ID LIMIT 4`).split('\n').filter(Boolean).map((l) => l.split('|')) : [];
const AVANT_I = INV ? q(`SELECT CONCAT_WS('|', str_STATUT, IFNULL(dt_UPDATED, 'NULL')) FROM t_inventaire WHERE lg_INVENTAIRE_ID = '${INV}'`).split('|') : [];
const remettre = () => {
  for (const [id, , n, dt, u] of LIGNES) {
    q(`UPDATE t_inventaire_famille SET int_NUMBER = ${n}, dt_UPDATED = ${sqlv(dt)}, str_UPDATED_ID = ${sqlv(u)} WHERE lg_INVENTAIRE_FAMILLE_ID = ${id}`);
  }
  if (INV) { q(`UPDATE t_inventaire SET str_STATUT = '${AVANT_I[0]}', dt_UPDATED = ${sqlv(AVANT_I[1])} WHERE lg_INVENTAIRE_ID = '${INV}'`); }
};
const base = (id) => q(`SELECT CONCAT_WS('|', int_NUMBER, IFNULL(str_UPDATED_ID, '')) FROM t_inventaire_famille WHERE lg_INVENTAIRE_FAMILLE_ID = ${id}`);

(async () => {
  const avant = EMPREINTE();
  const debut = q('SELECT NOW()');
  let cookie = '';
  const appel = async (u, m, corps, sansSession) => {
    const r = await fetch(API + u, { method: m || 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, sansSession ? {} : { Cookie: cookie }),
      body: corps === undefined ? undefined : JSON.stringify(corps) });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { /* vide ou texte */ }
    return { http: r.status, type: r.headers.get('content-type') || '', brut: t, j };
  };
  try {
    ok('Précondition : un inventaire ouvert avec quatre lignes comptées', LIGNES.length === 4, INV + ' : ' + LIGNES.length + ' lignes');
    const sans = await appel('v1/ws/inventaires/details', 'PUT', { id: Number(LIGNES[0][0]), quantite: 3 }, true);
    ok('Sans session : 401, rien d\'écrit', sans.http === 401 && base(LIGNES[0][0]).split('|')[0] === LIGNES[0][2], sans.http + ' ' + sans.brut.slice(0, 120));
    const login = await fetch(API + 'v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: ENV_E2E.LOGIN, password: 'e2etest' }) });
    cookie = (login.headers.get('set-cookie') || '').split(';')[0];

    /* saisies variees : chaque ligne une quantite differente, puis 1250 et un renvoi a l'identique sur la premiere */
    const saisies = LIGNES.map(([id], i) => [id, [0, 1, 7, 23][i]]).concat([[LIGNES[0][0], 1250], [LIGNES[0][0], 1250]]);
    const recues = [];
    for (const [id, qte] of saisies) {
      const r = await appel('v1/ws/inventaires/details', 'PUT', { id: Number(id), quantite: qte });
      recues.push([id, qte, r]);
      ok('Saisie de ' + qte + ' sur la ligne ' + id + ' : 200, application/json, {success:1, id, quantite} = envoyés',
        r.http === 200 && /application\/json/.test(r.type) && r.j && r.j.success === 1 && String(r.j.id) === id && r.j.quantite === qte
          && Object.keys(r.j).sort().join(',') === 'id,quantite,success',
        r.http + ' ' + r.type + ' ' + JSON.stringify(r.brut));
      ok('  rapprochement base : quantité ' + qte + ' et auteur ' + ADMIN[1], base(id) === qte + '|' + ADMIN[0], base(id));
    }
    /* rapprochement avec la liste de l'application (detailsAll), pour l'etat final de chaque ligne */
    for (const [id, cip] of LIGNES) {
      const finale = recues.filter((x) => x[0] === id).pop();
      const l = await appel('v1/ws/inventaires/detailsAll?idInventaire=' + INV + '&query=' + encodeURIComponent(cip));
      const d = (l.j || []).find((x) => String(x.id) === id);
      ok('Rapprochement liste ' + id + ' : réponse PUT = quantiteSaisie de detailsAll = base, auteur ' + ADMIN[1],
        d && d.quantiteSaisie === finale[1] && !!finale[2].j && finale[2].j.quantite === d.quantiteSaisie &&String(d.quantiteSaisie) === base(id).split('|')[0] && d.auteurLogin === ADMIN[1],
        JSON.stringify(d || l.brut.slice(0, 200)));
    }
    /* bilan pendant : seules les lignes saisies ont bouge */
    const touchees = q(`SELECT GROUP_CONCAT(lg_INVENTAIRE_FAMILLE_ID ORDER BY lg_INVENTAIRE_FAMILLE_ID) FROM t_inventaire_famille WHERE dt_UPDATED >= '${debut}'`);
    ok('Bilan : seules les quatre lignes saisies sont modifiées', touchees === LIGNES.map((x) => x[0]).sort().join(','), touchees);

    /* refus inchanges */
    const inconnue = await appel('v1/ws/inventaires/details', 'PUT', { id: 999999999, quantite: 1 });
    const negative = await appel('v1/ws/inventaires/details', 'PUT', { id: Number(LIGNES[1][0]), quantite: -2 });
    const absente = await appel('v1/ws/inventaires/details', 'PUT', { id: Number(LIGNES[1][0]) });
    ok('Refus inchangés : 404 LIGNE_INCONNUE, 400 QUANTITE_INVALIDE (négative, absente), success 0, rien d\'écrit',
      inconnue.http === 404 && inconnue.j.code === 'LIGNE_INCONNUE' && inconnue.j.success === 0
        && [negative, absente].every((x) => x.http === 400 && x.j.code === 'QUANTITE_INVALIDE' && x.j.success === 0)
        && base(LIGNES[1][0]).startsWith('1|'),
      JSON.stringify([inconnue.j, negative.j, absente.j]));
    q(`UPDATE t_inventaire SET str_STATUT = 'is_Closed' WHERE lg_INVENTAIRE_ID = '${INV}'`);
    const close = await appel('v1/ws/inventaires/details', 'PUT', { id: Number(LIGNES[2][0]), quantite: 12 });
    ok('Inventaire clôturé : 409 INVENTAIRE_CLOTURE, success 0, quantité inchangée (7)',
      close.http === 409 && close.j && close.j.code === 'INVENTAIRE_CLOTURE' && close.j.success === 0 && base(LIGNES[2][0]).startsWith('7|'),
      JSON.stringify(close.j) + ' ' + base(LIGNES[2][0]));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    remettre();
    ok('Bilan : lignes et inventaire remis à l\'identique (CHECKSUM)', EMPREINTE() === avant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
