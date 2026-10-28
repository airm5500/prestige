/* REJEU EN LECTURE SEULE DU SQL DES ECRANS SUR UNE AUTRE BASE (rapport RAPPORT_PERFORMANCES_2026-10-28.md).
 *
 * Entree : le fichier de resultats de mesure-parcours-officine.js lance avec SQL_LOG=1 (le SQL reel de chaque geste,
 * pris dans le journal des requetes lentes). Pour chaque geste, les requetes SELECT d'au moins SEUIL_MS sont rejouees
 * sur la base cible, trois fois (la premiere a froid), dans une transaction READ ONLY bornee par max_statement_time.
 * Les dates litterales sont decalees du dernier jour de la capture (DATE_REF_SOURCE) au dernier jour de la cible
 * (DATE_REF), pour comparer des periodes de meme longueur. Aucune ecriture : tout ce qui n'est pas un SELECT est ignore.
 *
 * Une requete peut echouer sur une base dont le schema est en retard (colonne ou table ajoutee par une migration) :
 * l'erreur est rendue telle quelle, c'est une information du rapport.
 *
 * Variables : CAPTURE (json), CIBLE (base), DATE_REF_SOURCE, DATE_REF, SEUIL_MS (20), SORTIE, MARIADB_OPTIONS,
 * EXPLAIN (1 : plan des trois requetes les plus longues de chaque geste).
 */
const fs = require('fs');
const { execFileSync } = require('child_process');

const CAPTURE = JSON.parse(fs.readFileSync(process.env.CAPTURE, 'utf8'));
const CIBLE = process.env.CIBLE;
const SEUIL = Number(process.env.SEUIL_MS || 20);
const OPTIONS = ['--defaults-extra-file=' + process.env.MARIADB_OPTIONS, '--default-character-set=utf8mb4'];
const jours = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
const DECALAGE = jours(process.env.DATE_REF_SOURCE || CAPTURE.dateRef, process.env.DATE_REF);
if (!CIBLE || !process.env.DATE_REF) { throw new Error('CIBLE et DATE_REF sont obligatoires'); }

function decaler(sql) {
  return sql.replace(/'(\d{4})-(\d{2})-(\d{2})/g, (m, y, mo, d) => {
    const t = new Date(Number(y), Number(mo) - 1, Number(d), 12);
    t.setDate(t.getDate() + DECALAGE);
    return "'" + t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  });
}
const lecture = (sql) => /^\s*(select|with)\b/i.test(sql) && !/\bfor\s+update\b|\binto\s+(out|dump)file\b/i.test(sql);

/* une execution : duree mesuree par le serveur (profilage de session), lignes rendues */
function executer(sql) {
  const script = 'SET SESSION max_statement_time=300; SET SESSION TRANSACTION READ ONLY; START TRANSACTION READ ONLY;\n'
    + 'SET @t0 = NOW(6);\n' + sql.replace(/;\s*$/, '') + ';\n'
    + "SELECT CONCAT('##MS##', ROUND(TIMESTAMPDIFF(MICROSECOND, @t0, NOW(6)) / 1000), '##', FOUND_ROWS());\nROLLBACK;";
  try {
    const out = execFileSync('mariadb', [...OPTIONS, CIBLE, '-sN'], { input: script, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 });
    const m = /##MS##(\d+)##(\d+)/.exec(out);
    return m ? { ms: Number(m[1]), lignes: Number(m[2]) } : { erreur: 'pas de mesure' };
  } catch (e) {
    return { erreur: String(e.stderr || e.message).split('\n').filter(Boolean).slice(-1)[0].slice(0, 300) };
  }
}
function expliquer(sql) {
  try {
    return execFileSync('mariadb', [...OPTIONS, CIBLE, '-s', '-e', 'EXPLAIN ' + sql], { encoding: 'utf8' }).trim().split('\n')
      .map((l) => l.split('\t')).map((c) => ({ table: c[2], type: c[3], cles: c[4], cle: c[5], lignes: c[8], extra: c[9] }));
  } catch (e) { return [{ erreur: String(e.stderr || e.message).slice(0, 200) }]; }
}

const med = (t) => { const s = t.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const res = { cible: CIBLE, dateRef: process.env.DATE_REF, source: CAPTURE.base, decalageJours: DECALAGE, cas: [] };
for (const c of CAPTURE.cas) {
  const diag = c.passages.find((p) => p.diagnostic);
  if (!diag || !diag.sql || !diag.sql.toutes) { continue; }
  const requetes = diag.sql.toutes.filter((x) => x.ms >= SEUIL && lecture(x.sql));
  const r = { parcours: c.parcours, libelle: c.libelle, source: { requetes: diag.sql.requetes, msTotal: diag.sql.msTotal }, requetes: [] };
  for (const x of requetes) {
    const sql = decaler(x.sql);
    const essais = [executer(sql), executer(sql), executer(sql)];
    const ok = essais.filter((e) => e.ms !== undefined);
    r.requetes.push({ sql: sql.slice(0, 400), sourceMs: x.ms, sourceExaminees: x.examinees,
      froid: ok.length ? essais[0].ms : null, mediane: ok.length ? med(ok.map((e) => e.ms)) : null, lignes: ok.length ? ok[0].lignes : null,
      erreur: essais.find((e) => e.erreur) ? essais.find((e) => e.erreur).erreur : undefined, sqlComplet: sql });
  }
  r.requetes.sort((a, b) => (b.mediane || 0) - (a.mediane || 0));
  if (process.env.EXPLAIN === '1') { r.requetes.slice(0, 3).forEach((x) => { if (!x.erreur) { x.plan = expliquer(x.sqlComplet); } }); }
  r.requetes.forEach((x) => { delete x.sqlComplet; });
  r.msTotal = r.requetes.reduce((a, x) => a + (x.mediane || 0), 0);
  res.cas.push(r);
  console.log(('[' + c.parcours + '] ' + c.libelle).padEnd(60) + ' ' + String(r.requetes.length).padStart(3) + ' requetes rejouees, '
    + String(r.msTotal).padStart(7) + ' ms (source ' + CAPTURE.base + ' : ' + diag.sql.msTotal + ' ms)'
    + (r.requetes.some((x) => x.erreur) ? '  erreurs : ' + r.requetes.filter((x) => x.erreur).length : ''));
  fs.writeFileSync(process.env.SORTIE, JSON.stringify(res, null, 1));
}
