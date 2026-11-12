/* CA POUR LES APPLICATIONS MOBILE ET ERP : ca-all, ca-comptant, ws/ca-achats-ventes (lenteurs d'appaul, 12/11).
 *
 * Constat (journal du support d'appaul, 11/11) : ca-all 7,97 s pour une journee, ca-achats-ventes 8,1 s pour onze jours.
 * Cause : le filtre de date etait ecrit DATE(colonne) BETWEEN ..., qui empeche l'index de la date ; MariaDB relisait
 * tout l'historique (3 ans). Correction : bornes directes sur la colonne (mvtdate est deja une date ; dt_UPDATED et
 * dt_CREATED : >= debut et < lendemain de la fin).
 *
 * Ces routes n'ont pas d'ecran : elles sont appelees par les applications (mobile, ERP), et le test les appelle de la
 * meme facon.
 *  - rapprochement : pour des periodes tirees au hasard (graine fixe) et des cas limites (un jour, fin de mois, periode
 *    sans vente, debut = fin), chaque jour de la reponse est compare a la base, calcule par la formule d'origine
 *    (DATE(colonne) BETWEEN) : credit, remise, TVA, especes, ventes, achats ; meme liste de jours ;
 *  - duree : ca-all sur un jour < 1,5 s, ca-achats-ventes sur onze jours < 2 s (avant : 4 a 8 s).
 * Lecture seule : aucune donnee ecrite.
 * Variables : BASE (serveur), DB_TEST, MARIADB_OPTIONS (outils/poste.js), JOUR_MAX (dernier jour de donnees de la
 * copie, defaut 2026-10-27), CAS (8).
 */
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const API = (process.env.BASE || 'http://localhost:8080/prestige').replace(/\/$/, '') + '/api/';
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
const lignes = (s) => { const t = q(s); return t ? t.split(/\r?\n/).map((l) => l.split('\t')) : []; };
const JOUR_MAX = process.env.JOUR_MAX || '2026-10-27';
const CAS = Number(process.env.CAS || 8);

/* generateur a graine fixe (mulberry32) */
let graine = 20261112;
const hasard = () => { graine |= 0; graine = (graine + 0x6D2B79F5) | 0; let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const jour = (d) => d.toISOString().slice(0, 10);
const plus = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const yyyymmdd = (d) => d.replace(/-/g, '');
const ddmmyyyy = (d) => d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4);

async function appeler(route, debut, fin, cookie) {
  const t0 = Date.now();
  const r = await fetch(API + route + '?dtStart=' + debut + '&dtEnd=' + fin, { headers: { Cookie: cookie } });
  const corps = await r.text();
  return { ms: Date.now() - t0, http: r.status, json: (() => { try { return JSON.parse(corps); } catch (e) { return null; } })() };
}

/* reference : formules d'origine (DATE(colonne) BETWEEN) */
const FILTRE_M = "m.checked=1 AND (m.typeTransaction=0 OR m.typeTransaction=1) AND m.lg_EMPLACEMENT_ID='1'";
function refCaAll(a, b) {
  const r = {};
  lignes("SELECT DATE_FORMAT(m.mvtdate, '%Y%m%d'), SUM(m.montantCredit), SUM(m.montantRemise), SUM(m.montantTva) FROM mvttransaction m WHERE "
    + FILTRE_M + " AND DATE(m.mvtdate) BETWEEN '" + a + "' AND '" + b + "' GROUP BY m.mvtdate").forEach(([d, c, rem, tva]) => {
    r[d] = { montantCredit: Number(c), remiseSurCA: Number(rem), totTVA: Number(tva), totEsp: 0 };
  });
  lignes("SELECT DATE_FORMAT(m.mvtdate, '%Y%m%d'), SUM(v.montant_attentu) FROM mvttransaction m, vente_reglement v WHERE m.vente_id=v.vente_id AND "
    + FILTRE_M + " AND DATE(m.mvtdate) BETWEEN '" + a + "' AND '" + b + "' AND v.type_regelement = '1' GROUP BY m.mvtdate").forEach(([d, e]) => {
    r[d] = r[d] || { montantCredit: 0, remiseSurCA: 0, totTVA: 0, totEsp: 0 }; r[d].totEsp = Number(e);
  });
  return r;
}
function refCaComptant(a, b) {
  const r = {};
  lignes("SELECT DATE_FORMAT(m.mvtdate, '%Y%m%d'), SUM(m.montantRemise), SUM(m.montantTva), SUM(CASE WHEN m.typeReglementId = '1' THEN m.montantPaye ELSE 0 END)"
    + " FROM mvttransaction m WHERE " + FILTRE_M + " AND DATE(m.mvtdate) BETWEEN '" + a + "' AND '" + b + "' GROUP BY m.mvtdate").forEach(([d, rem, tva, e]) => {
    r[d] = { remiseSurCA: Number(rem), totTVA: Number(tva), totEsp: Number(e) };
  });
  return r;
}
function refAchatsVentes(a, b) {
  const r = {};
  const j = (d) => (r[d] = r[d] || { montantVente: 0, montantAchat: 0 });
  lignes("SELECT DATE(p.dt_UPDATED), IFNULL(SUM(p.int_PRICE), 0) FROM t_preenregistrement p WHERE p.b_IS_CANCEL=FALSE AND p.int_PRICE > 0 AND p.str_STATUT='is_Closed'"
    + " AND p.lg_TYPE_VENTE_ID <> '5' AND DATE(p.dt_UPDATED) BETWEEN '" + a + "' AND '" + b + "' GROUP BY DATE(p.dt_UPDATED)").forEach(([d, v]) => { j(ddmmyyyy(d)).montantVente = Number(v); });
  lignes("SELECT DATE(b.dt_CREATED), IFNULL(SUM(b.int_HTTC), 0) FROM t_bon_livraison b WHERE DATE(b.dt_CREATED) BETWEEN '" + a + "' AND '" + b
    + "' GROUP BY DATE(b.dt_CREATED)").forEach(([d, v]) => { j(ddmmyyyy(d)).montantAchat = Number(v); });
  return r;
}

function comparer(nom, reponse, ref, cle, champs) {
  const lu = {};
  (reponse || []).forEach((x) => { lu[x[cle]] = x; });
  const jours = Object.keys(ref).sort(), joursLus = Object.keys(lu).sort();
  const ecarts = [];
  if (jours.join() !== joursLus.join()) { ecarts.push('jours : base ' + jours.length + ', reponse ' + joursLus.length); }
  jours.forEach((d) => champs.forEach((c) => { if (lu[d] && Number(lu[d][c]) !== ref[d][c]) { ecarts.push(d + ' ' + c + ' : base ' + ref[d][c] + ', reponse ' + lu[d][c]); } }));
  return { ecarts, jours: jours.length };
}

(async () => {
  const auth = await fetch(API + 'v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: ENV_E2E.LOGIN, password: 'e2etest' }) });
  const cookie = (auth.headers.get('set-cookie') || '').split(';')[0];
  const fin = JOUR_MAX;
  const periodes = [[fin, fin], [plus(fin, -10), fin], ['2025-12-31', '2025-12-31'], ['2025-02-01', '2025-02-28'], ['2027-03-01', '2027-03-05']];
  const debutHistorique = Date.parse('2024-01-01T00:00:00Z'), etendue = (Date.parse(fin + 'T00:00:00Z') - debutHistorique) / 86400000;
  for (let i = 0; i < CAS; i++) {
    const a = jour(new Date(debutHistorique + Math.floor(hasard() * etendue) * 86400000));
    periodes.push([a, plus(a, Math.floor(hasard() * 20))]);
  }
  let joursCompares = 0;
  for (const [a, b] of periodes) {
    const all = await appeler('v1/ca-all', a, b, cookie);
    const c1 = comparer('ca-all', all.json, refCaAll(a, b), 'mvtDate', ['montantCredit', 'remiseSurCA', 'totTVA', 'totEsp']);
    ok('ca-all ' + a + ' → ' + b + ' : ' + c1.jours + ' jour(s) identiques à la base', all.http === 200 && c1.ecarts.length === 0, c1.ecarts.slice(0, 3).join(' ; '));
    const comptant = await appeler('v1/ca-comptant', a, b, cookie);
    const c2 = comparer('ca-comptant', comptant.json, refCaComptant(a, b), 'mvtDate', ['remiseSurCA', 'totTVA', 'totEsp']);
    ok('ca-comptant ' + a + ' → ' + b + ' : ' + c2.jours + ' jour(s) identiques à la base', comptant.http === 200 && c2.ecarts.length === 0, c2.ecarts.slice(0, 3).join(' ; '));
    const av = await appeler('v1/ws/ca-achats-ventes', a, b, cookie);
    const c3 = comparer('ca-achats-ventes', av.json, refAchatsVentes(a, b), 'dateMvt', ['montantVente', 'montantAchat']);
    ok('ca-achats-ventes ' + a + ' → ' + b + ' : ' + c3.jours + ' jour(s) identiques à la base', av.http === 200 && c3.ecarts.length === 0, c3.ecarts.slice(0, 3).join(' ; '));
    joursCompares += c1.jours + c2.jours + c3.jours;
  }
  ok('Rapprochement sur des jours réellement remplis', joursCompares > 50, joursCompares + ' jours comparés');

  /* duree : meilleur de trois appels (le premier peut lire le disque) */
  const meilleur = async (route, a, b) => { let m = Infinity; for (let i = 0; i < 3; i++) { m = Math.min(m, (await appeler(route, a, b, cookie)).ms); } return m; };
  const tAll = await meilleur('v1/ca-all', fin, fin);
  ok('ca-all sur un jour en moins de 1,5 s (journal d\'appaul : 7,97 s)', tAll < 1500, tAll + ' ms');
  const tAv = await meilleur('v1/ws/ca-achats-ventes', plus(fin, -10), fin);
  ok('ca-achats-ventes sur onze jours en moins de 2 s (journal d\'appaul : 8,1 s)', tAv < 2000, tAv + ' ms');
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
