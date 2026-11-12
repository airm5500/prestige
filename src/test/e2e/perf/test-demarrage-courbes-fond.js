/* DEMARRAGE DE PAYARA : les courbes « À suivre » du Pilotage sont calculees en tache de fond (lenteurs d'appaul, 12/11).
 *
 * Constat (photos des threads pendant le deploiement, copie d'appaul) : l'etape « Agregats du menu de pilotage » du
 * pipeline de demarrage durait 4 min 11 a 4 min 40, sur 310 s de deploiement, dans PilotageSuiviService.evolution
 * (courbes de 4 annees, toutes grandeurs, lues dans les ventes). Le deploiement l'attendait.
 *
 * A lancer juste apres un deploiement. Controles :
 *  1. bilan du demarrage (journal du domaine) : l'etape du pilotage dure moins de 5 s, le deploiement moins de 120 s ;
 *  2. les courbes sont tout de meme calculees ensuite, une fois, en tache de fond (message du journal) ;
 *  3. vrai chemin : menu ANALYSE DE GESTION > Pilotage de l'officine, clic sur « À suivre » : l'onglet se remplit en
 *     moins de 3 s (cache deja rempli), toutes les courbes repondent ;
 *  4. rapprochement : la courbe du CA par semaine de l'annee en cours (ecran) = la base, semaine par semaine, et le
 *     cumul de l'annee = la somme des semaines.
 * Lecture seule. Variables : BASE, DB_TEST, PAYARA_DOMAINE (dossier du domaine), JOURNAL (autre journal a lire).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { BASE, connexion, ouvrirMenu } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const JOURNAL = process.env.JOURNAL || path.join(process.env.PAYARA_DOMAINE || '', 'logs', 'server.log');

function dernierDemarrage() {
  const t = fs.readFileSync(JOURNAL, 'latin1');
  const i = t.lastIndexOf('[PIPELINE-STARTUP] Demarrage');
  if (i < 0) { return null; }
  const bloc = t.slice(i);
  const etape = /Agregats du menu de pilotage - OK en ([0-9hms.]+)/.exec(bloc);
  const deploie = /prestige was successfully deployed in ([0-9\s .,?]+) milli/.exec(bloc);
  const secondes = (x) => { const m = /(?:(\d+)m)?([\d.]+)s/.exec(x); return m ? (Number(m[1] || 0) * 60 + Number(m[2])) : NaN; };
  return {
    etape: etape ? secondes(etape[1]) : NaN,
    deploiement: deploie ? Number(deploie[1].replace(/[^0-9]/g, '')) / 1000 : NaN,
    courbes: /courbes .{1,4}A suivre.{1,4} calculees d'avance en tache de fond \((\d[\d\s .,]*) ms\)/.exec(bloc),
    echecs: (bloc.match(/non calculee d'avance/g) || []).length,
  };
}

(async () => {
  console.log('Serveur : ' + BASE + ' ; journal : ' + JOURNAL);
  const d = dernierDemarrage();
  ok('Bilan du démarrage : étape « Agrégats du menu de pilotage » en moins de 5 s', d && d.etape < 5, d && d.etape + ' s');
  ok('Bilan du démarrage : déploiement en moins de 120 s', d && d.deploiement < 120, d && d.deploiement + ' s');
  if (process.env.JOURNAL) { return fin(); }

  /* 2. les courbes arrivent ensuite, en tache de fond (jusqu'a 8 min sur la copie d'appaul) */
  let e = dernierDemarrage();
  for (let i = 0; i < 96 && !e.courbes; i++) { await new Promise((r) => setTimeout(r, 5000)); e = dernierDemarrage(); }
  ok('Courbes « À suivre » calculées ensuite, une fois, en tâche de fond, sans échec', !!e.courbes && e.echecs === 0,
    e.courbes ? e.courbes[1] + ' ms' : 'message absent');

  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
  const erreurs = []; p.on('pageerror', (x) => erreurs.push(String(x.message)));
  let enVol = 0, dernier = Date.now();
  const courbes = [];
  const debuts = new Map(), durees = [];
  p.on('request', (r) => { enVol++; dernier = Date.now(); debuts.set(r, Date.now()); });
  p.on('requestfinished', (r) => { if (/api\/v1\/pilotage/.test(r.url()) && debuts.has(r)) { durees.push({ quand: debuts.get(r), ms: Date.now() - debuts.get(r), url: r.url().replace(/^.*api\/v1\//, '').replace(/[?&]_dc=\d+/, '') }); } });
  const fini = () => { enVol = Math.max(0, enVol - 1); dernier = Date.now(); };
  p.on('requestfinished', fini); p.on('requestfailed', fini);
  p.on('response', async (r) => {
    if (!/pilotage\/suivi\/evolution/.test(r.url())) { return; }
    courbes.push({ quand: Date.now(), url: r.url(), statut: r.status(), corps: await r.text().catch(() => '') });
  });
  const calme = async (limite) => {
    const finA = Date.now() + limite;
    while (Date.now() < finA) {
      if (enVol === 0 && Date.now() - dernier >= 400) {
        const masque = await p.evaluate(() => Array.prototype.some.call(document.querySelectorAll('.x-mask-msg'), (m) => m.offsetParent !== null));
        if (!masque) { return Date.now() - 400; }
      }
      await p.waitForTimeout(50);
    }
    throw new Error('onglet toujours en chargement apres ' + limite + ' ms');
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', "Pilotage de l'officine");
    await p.waitForFunction(() => { const x = Ext.ComponentQuery.query('pilotage')[0]; return x && x.isVisible(true) && x.down('#onglet-asuivre'); }, null, { timeout: 120000 });
    await calme(300000);
    const id = await p.evaluate(() => Ext.ComponentQuery.query('pilotage #onglets')[0].items.items.filter((o) => o.itemId === 'onglet-asuivre')[0].tab.getId());
    const t0 = Date.now();
    await p.click('#' + id);
    const t1 = await calme(300000);
    const vues = courbes.filter((c) => c.quand >= t0);
    console.log(durees.filter((x) => x.quand >= t0).sort((x, y) => y.ms - x.ms).slice(0, 8).map((x) => x.ms + ' ms ' + x.url).join(' | '));
    ok('Clic sur « À suivre » : l\'onglet se remplit en moins de 3 s (courbes déjà calculées)', vues.length > 0 && t1 - t0 < 3000,
      (t1 - t0) + ' ms, ' + vues.length + ' courbes');
    ok('Toutes les courbes de l\'onglet répondent', vues.every((c) => c.statut === 200 && JSON.parse(c.corps).success === true),
      vues.map((c) => c.statut).join(','));

    /* 4. rapprochement : CA par semaine de l'annee en cours, ecran (cache rempli en fond) contre base */
    let ca = vues.map((c) => JSON.parse(c.corps)).filter((o) => o.mesure === 'ca' && o.pas === 'SEMAINE')[0];
    if (!ca) {
      const t2 = Date.now();
      ca = await p.evaluate(async () => (await fetch('../api/v1/pilotage/suivi/evolution?mesure=ca&pas=SEMAINE&comparer=3')).json());
      ok('Courbe du CA par semaine servie depuis le cache rempli en fond (moins de 1 s)', Date.now() - t2 < 1000, (Date.now() - t2) + ' ms');
    }
    const s = ca.series[0], an = s.annee;
    const base = {};
    q("SELECT DATE_FORMAT(p.dt_UPDATED, '%v') + 0, SUM(p.int_PRICE - COALESCE(p.int_PRICE_REMISE, 0)) FROM t_preenregistrement p"
      + " WHERE p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.lg_TYPE_VENTE_ID <> '5'"
      + " AND p.dt_UPDATED >= '" + (an - 1) + "-12-25' AND p.dt_UPDATED < CURDATE() + INTERVAL 1 DAY"
      + " AND DATE_FORMAT(p.dt_UPDATED, '%x') + 0 = " + an + " GROUP BY 1").split('\n').filter(Boolean)
      .forEach((l) => { const [k, v] = l.split('\t'); base[+k] = Math.round(Number(v)); });
    const ecarts = [];
    let semaines = 0, somme = 0;
    s.valeurs.forEach((v, i) => {
      if (v === null) { return; }
      semaines++; somme += v;
      if (v !== (base[i + 1] || 0)) { ecarts.push('S' + (i + 1) + ' écran ' + v + ' / base ' + (base[i + 1] || 0)); }
    });
    ok('Rapprochement : CA par semaine ' + an + ', écran = base, semaine par semaine (' + semaines + ' semaines)', semaines > 0 && ecarts.length === 0,
      ecarts.slice(0, 5).join(' ; ') || Object.keys(base).length + ' semaines en base');
    ok('Cohérence : le total de l\'année = la somme des semaines (à l\'arrondi près)', Math.abs(s.total - somme) <= semaines, s.total + ' / ' + somme);
    ok('Aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs.slice(0, 3)));
  } catch (x) {
    ok('Le test va jusqu\'au bout', false, String(x && x.stack).slice(0, 400));
  } finally {
    await b.close();
  }
  fin();
})();

function fin() {
  const echecs = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + (echecs ? ' ECHEC' : ' OK'));
  process.exit(echecs ? 1 : 0);
}
