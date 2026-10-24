/* TABLEAU DE BORD : CARTE D'AFFLUENCE AVEC SELECTEUR DE SEMAINE (retour du 24/10).
 *
 * Sur le vrai ecran d'accueil (nouveau tableau de bord, preferences et parametre remis a la fin) :
 *  - la carte « Carte d'affluence (jour × heure) » est presente, avec son icone ;
 *  - par defaut : la semaine du jour regarde (lundi -> dimanche), libelle « Semaine du … au … » ;
 *  - chaque case = nombre de ventes de ce jour a cette heure ; total de la carte = ventes de la semaine en base
 *    (meme perimetre que la frequentation) ; la case la plus chargee egale le maximum en base ;
 *  - « ◀ » : semaine precedente (libelle et chiffres suivent) ; « ▶ » revient ; « Cette semaine » revient au jour ;
 *  - l'infobulle d'une case donne jour, heure et nombre de ventes ;
 *  - aucune erreur JavaScript, aucune fenetre.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const PERIMETRE = "p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.lg_TYPE_VENTE_ID <> '5'";
/* jour regarde : un mercredi passe qui a des ventes */
const D = q(`SELECT DATE(MAX(p.dt_UPDATED)) FROM t_preenregistrement p WHERE ${PERIMETRE} AND DAYOFWEEK(p.dt_UPDATED) = 4 AND p.dt_UPDATED < CURDATE()`);
const lundi = (d) => q(`SELECT DATE_SUB('${d}', INTERVAL WEEKDAY('${d}') DAY)`);
const enBase = (l) => {
  const lignes = q(`SELECT WEEKDAY(p.dt_UPDATED) + 1, HOUR(p.dt_UPDATED), COUNT(*) FROM t_preenregistrement p WHERE ${PERIMETRE}`
    + ` AND p.dt_UPDATED >= '${l}' AND p.dt_UPDATED < DATE_ADD('${l}', INTERVAL 7 DAY) GROUP BY 1, 2`).split('\n').filter(Boolean).map((x) => x.split('\t').map(Number));
  return { total: lignes.reduce((s, x) => s + x[2], 0), max: lignes.reduce((m, x) => Math.max(m, x[2]), 0) };
};
const fr = (d) => d.slice(8, 10) + '/' + d.slice(5, 7);

(async () => {
  const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
  const prefAvant = q(`SELECT COUNT(*) FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = 'tableau-bord'`) === '1'
    ? q(`SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = 'tableau-bord'`) : null;
  const versionAvant = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'");
  exec(`DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = 'tableau-bord'`);
  exec("UPDATE t_parameters SET str_VALUE = 'NOUVEAU' WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = [], dialogues = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  /* diagnostic : chaque reponse de la carte (date demandee, semaine rendue, total) */
  const reponses = [];
  p.on('response', async (r) => { if (/tableau-bord\/affluence/.test(r.url())) { try { const o = await r.json(); const d = o.data || o;
    reponses.push(new URL(r.url()).searchParams.get('date') + '>' + d.debut + ':' + (d.cases || []).reduce((x, c) => x + c.ventes, 0) + '@' + Date.now() % 100000); } catch (e) { /* ignoree */ } } });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('tableaubord').length, null, { timeout: 120000 });
    await p.evaluate((d) => { testextjs.view.tableaubord.TableauBord.dateForcee = d; const t = Ext.ComponentQuery.query('tableaubord')[0]; t.chargerPreferences(() => t.construire()); }, D);
    await p.waitForTimeout(1500);
    const carte = await p.evaluate(() => { const c = document.querySelector('[data-carte="affluence"]'); return c ? { titre: c.querySelector('.tb-tete').textContent, icone: !!c.querySelector('.tb-tete > .fa-solid') } : null; });
    ok('Carte « Carte d\'affluence (jour × heure) » présente, avec icône', carte && /Carte d'affluence/.test(carte.titre) && carte.icone, JSON.stringify(carte));
    await p.evaluate(() => document.querySelector('[data-carte="affluence"]').scrollIntoView());
    const lire = async () => {
      await p.waitForFunction(() => { const c = document.querySelector('[data-corps="affluence"]'); return c && c.querySelector('table.tb-aff'); }, null, { timeout: 60000 });
      await p.waitForTimeout(400);
      return p.evaluate(() => { const c = document.querySelector('[data-corps="affluence"]'); const cases = Array.from(c.querySelectorAll('td[data-n]'));
        return { libelle: document.querySelector('[data-outils="affluence"] [data-aff="libelle"]').textContent, lignes: c.querySelectorAll('table.tb-aff tr').length - 1,
          total: cases.reduce((s, x) => s + Number(x.getAttribute('data-n')), 0), max: cases.reduce((m, x) => Math.max(m, Number(x.getAttribute('data-n'))), 0),
          bulle: (cases.find((x) => Number(x.getAttribute('data-n')) > 0) || { title: '' }).title }; });
    };
    const attendu = (l) => { const f = q(`SELECT DATE_ADD('${l}', INTERVAL 6 DAY)`); return 'Semaine du ' + fr(l) + ' au ' + fr(f); };
    const L0 = lundi(D), B0 = enBase(L0);
    let v = await lire();
    ok('Par défaut : semaine du jour regardé (' + attendu(L0) + '), 7 jours', v.libelle === attendu(L0) && v.lignes === 7, JSON.stringify(v));
    ok('Total de la carte = ventes de la semaine en base ; case la plus chargée = maximum en base', v.total === B0.total && v.max === B0.max && B0.total > 0, JSON.stringify({ v, B0 }));
    ok('Infobulle d\'une case : jour, heure et nombre de ventes', /^(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche) \d+ h – \d+ h : \d[\d\s ]* vente/.test(v.bulle), v.bulle);
    await p.click('[data-outils="affluence"] [data-aff="prec"]');
    await p.waitForTimeout(500);
    const L1 = q(`SELECT DATE_SUB('${L0}', INTERVAL 7 DAY)`), B1 = enBase(L1);
    v = await lire();
    ok('« ◀ » : semaine précédente, libellé et chiffres suivent', v.libelle === attendu(L1) && v.total === B1.total && v.max === B1.max, JSON.stringify({ v, B1, reponses }));
    await p.click('[data-outils="affluence"] [data-aff="suiv"]');
    await p.waitForTimeout(500);
    v = await lire();
    ok('« ▶ » : retour à la semaine suivante', v.libelle === attendu(L0) && v.total === B0.total, JSON.stringify(v));
    await p.click('[data-outils="affluence"] [data-aff="prec"]');
    await p.waitForTimeout(300);
    await p.click('[data-outils="affluence"] [data-aff="prec"]');
    await p.waitForTimeout(500);
    await lire();
    await p.click('[data-outils="affluence"] [data-aff="courante"]');
    await p.waitForTimeout(500);
    v = await lire();
    ok('« Cette semaine » : retour à la semaine du jour regardé', v.libelle === attendu(L0) && v.total === B0.total, JSON.stringify(v));
    ok('Aucune erreur JavaScript, aucune fenêtre', err.length === 0 && dialogues.length === 0, err.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    exec(`DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = 'tableau-bord'`);
    if (prefAvant !== null) {
      exec(`INSERT INTO t_preference_utilisateur (lg_USER_ID, str_CLE, txt_VALEUR, dt_UPDATED) VALUES ('${U}', 'tableau-bord', '${prefAvant.replace(/'/g, "''")}', NOW())`);
    }
    exec(`UPDATE t_parameters SET str_VALUE = '${versionAvant}' WHERE str_KEY = 'KEY_TABLEAU_BORD_VERSION'`);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
