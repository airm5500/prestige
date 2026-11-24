/* TABLEAU DE BORD, ALERTES : ARTICLES CREES (retour du 22/11, lot 9, point 7).
 *
 * Par les clics (compte e2e), tableau de bord (ecran d'accueil), carte « Alertes » :
 *  pour quatre periodes reglees par l'ecran (« Périodes », champ « Articles créés ces [n] derniers jours ») : 1 jour
 *  (aucun article), 30, 40 et 365 jours (plus de 500 articles : liste ecourtee, impression complete) :
 *   - nombre de l'alerte = nombre en base (t_famille.dt_CREATED depuis le debut du jour n-1 jours avant) ;
 *   - clic sur l'alerte : titre de la fenetre = meme nombre ; lignes de la fenetre (500 au plus, les plus recentes)
 *     = base, ligne par ligne (CIP, creee le, cree par : utilisateur de la notification de creation, sinon de la ligne
 *     de creation du journal : retours du 23/11) ;
 *   - « Imprimer » : PDF de la liste complete, TOTAL = nombre, CIP du PDF = base, dans le meme ordre ; delai plafonne ;
 *  bilan : preferences du tableau de bord de l'utilisateur remises a l'identique ; aucune erreur JS.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { connexion, cliquer } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').replace(/\n$/, '');
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
/* 30 (la valeur par defaut) en dernier : chaque reglage change la periode et relance la carte */
const PERIODES = [40, 1, 365, 30];
const PDF_MAX_MS = 15000;
const USER = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const prefsAvant = q(`SELECT IFNULL((SELECT CONCAT('=', txt_VALEUR) FROM t_preference_utilisateur WHERE lg_USER_ID = '${USER}' AND str_CLE = 'tableau-bord'), '∅')`);
const debut = (j) => q(`SELECT CURDATE() - INTERVAL ${j - 1} DAY`);
/* Auteur attendu (retours du 23/11) : notification de creation (21 ou 22), sinon ligne de creation du journal (34 ou 35)
 * ecrite de 5 s avant a 60 s apres la creation, pour le meme CIP (\u00ab cip [CIP \u00bb) ou a defaut le meme nom (\u00ab NOM par \u00bb). */
const NOM_U = "NULLIF(TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))), '')";
const base = (j) => {
  const fiches = lignes(`SELECT f.lg_FAMILLE_ID, f.int_CIP, DATE_FORMAT(f.dt_CREATED, '%d/%m/%Y %H:%i'), UNIX_TIMESTAMP(f.dt_CREATED), f.str_NAME
    FROM t_famille f WHERE f.dt_CREATED >= '${debut(j)}' ORDER BY f.dt_CREATED DESC, f.int_CIP`);
  const notif = new Map();
  lignes(`SELECT nt.entity_ref, ${NOM_U} FROM notification nt JOIN t_user u ON u.lg_USER_ID = nt.user_id
    WHERE nt.type_notification IN (21, 22) AND nt.created_at >= '${debut(j)}' - INTERVAL 1 DAY ORDER BY nt.created_at`).forEach((r) => { if (!notif.has(r[0]) && r[1] !== 'NULL') { notif.set(r[0], r[1]); } });
  const journal = lignes(`SELECT UNIX_TIMESTAMP(e.dt_CREATED), e.str_DESCRIPTION, ${NOM_U} FROM t_event_log e JOIN t_user u ON u.lg_USER_ID = e.lg_USER_ID
    WHERE e.dt_CREATED >= '${debut(j)}' - INTERVAL 5 SECOND AND e.typeLog IN (34, 35) AND e.str_TABLE_CONCERN = 'dal.TFamille' ORDER BY e.dt_CREATED`).filter((r) => r[2] !== 'NULL');
  const dans = (e, f) => { const d = Number(e[0]) - Number(f[3]); return d >= -5 && d <= 60 && e[1].includes('cip ['); };
  const reste = (e) => e[1].slice(e[1].indexOf('cip [') + 5);
  return fiches.map((f) => {
    let a = notif.get(f[0]);
    if (!a) { const e = journal.find((x) => dans(x, f) && reste(x).startsWith(f[1].trim() + ' ')) || journal.find((x) => dans(x, f) && reste(x).includes(' ' + f[4].trim() + ' par ')); a = e ? e[2] : ''; }
    return [f[1].replace(/[\s\u00a0]+/g, ''), f[2], a];
  });
};

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'crees-'));
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    /* le tableau de bord est l'ecran d'accueil apres la connexion */
    await p.waitForFunction(() => window.testextjs && testextjs.view.tableaubord && Ext.ComponentQuery.query('tableaubord').length, null, { timeout: 90000 });
    const alerte = p.locator('[data-liste="crees"]').filter({ visible: true }).first();
    await alerte.waitFor({ timeout: 120000 });

    for (const j of PERIODES) {
      /* periode reglee par l'ecran */
      const champ = p.locator('input[data-p="cr"]').first();
      if (!(await champ.isVisible())) { await p.locator('[data-periodes]').first().click(); await champ.waitFor({ state: 'visible', timeout: 10000 }); }
      const [rep] = await Promise.all([
        p.waitForResponse((r) => /tableau-bord\/alertes\?/.test(r.url()) && new URL(r.url()).searchParams.get('cr') === String(j), { timeout: 60000 }),
        (async () => { await champ.fill(String(j)); await champ.press('Tab'); })(),
      ]);
      await rep.finished();
      await p.waitForTimeout(800);
      const attendu = base(j);
      const texteAlerte = (await p.locator('[data-liste="crees"]').filter({ visible: true }).first().textContent()).replace(/\s+/g, ' ').trim();
      const nAlerte = Number((texteAlerte.match(/([\d\s]+) articles créés/) || [, ''])[1].replace(/\s/g, ''));
      ok(j + ' j : alerte « ' + texteAlerte.slice(0, 60) + ' » = base (' + attendu.length + ')', nAlerte === attendu.length && texteAlerte.includes('ces ' + j + ' derniers jours'), texteAlerte);

      /* fenetre de la liste */
      await p.locator('[data-liste="crees"]').filter({ visible: true }).first().click();
      const fen = p.locator('.tb-fenetre').filter({ visible: true }).last();
      await fen.waitFor({ timeout: 60000 });
      await p.waitForTimeout(500);
      const ecran = await fen.evaluate((f) => ({ titre: f.querySelector('.x-window-header-text, .x-title-text, .x-header-text').textContent.trim(),
        lignes: Array.from(f.querySelectorAll('table.tb-fixe tr')).slice(1).map((r) => Array.from(r.querySelectorAll('td')).map((c) => c.textContent.trim())),
        note: (f.querySelector('div.tb-note') || {}).textContent || '' }));
      ok(j + ' j : titre de la fenêtre = même nombre', ecran.titre === 'Articles créés ces ' + j + ' derniers jours (' + attendu.length + ')', ecran.titre);
      const attenduFen = attendu.slice(0, 500).map((r) => [r[0], r[1], r[2] || '—'].join('#'));
      const ecranFen = ecran.lignes.map((c) => [c[1], c[2], c[3]].join('#'));
      const ecarts = attenduFen.map((a, i) => (a === ecranFen[i] ? null : i + ' ' + ecranFen[i] + ' / ' + a)).filter(Boolean);
      ok(j + ' j : ' + ecran.lignes.length + ' ligne(s) de la fenêtre = base, ligne par ligne (CIP, créé le, créé par)', ecranFen.length === attenduFen.length && ecarts.length === 0, ecarts.slice(0, 3).join(' | '));
      if (attendu.length > 500) { ok(j + ' j : liste écourtée signalée (500 plus récents, impression complète)', /500 plus récents/.test(ecran.note), ecran.note); }
      if (attendu.length > 0) {
        const n = attendu.filter((r) => r[2]).length;
        ok(j + ' j : jeu varié, articles avec et sans auteur (' + n + ' avec / ' + (attendu.length - n) + ' sans)', n > 0 || attendu.length < 3);
      }

      /* impression */
      const t0 = Date.now();
      const [rp] = await Promise.all([ctx.waitForEvent('response', { predicate: (r) => /alertes\/crees\/pdf/.test(r.url()), timeout: 60000 }), cliquer(p, 'window button[itemId=tbImprimerListe]')]);
      const delai = Date.now() - t0;
      const fPdf = path.join(dossier, 'crees-' + j + '.pdf');
      fs.writeFileSync(fPdf, await (await ctx.request.get(rp.url())).body());
      const texte = execFileSync('pdftotext', ['-layout', fPdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/[  ]/g, ' ');
      const cipsPdf = texte.split('\n').map((l) => l.trim().split(/\s+/)[0]).filter((c) => attendu.some((r) => r[0] === c) || /^\d{7,13}$/.test(c));
      const total = (texte.match(/TOTAL\s+(\d+) article\(s\)/) || [, '-1'])[1];
      ok(j + ' j : PDF « Imprimer » : TOTAL ' + total + ' = base, CIP = base dans le même ordre, en ' + delai + ' ms', +total === attendu.length && JSON.stringify(cipsPdf) === JSON.stringify(attendu.map((r) => r[0])) && delai < PDF_MAX_MS,
        cipsPdf.length + ' CIP / ' + attendu.length + ' ; premier écart : ' + (() => { const i = cipsPdf.findIndex((c, k) => c !== (attendu[k] || [])[0]); return i < 0 ? 'aucun' : i + ' ' + cipsPdf.slice(i, i + 3) + ' / ' + attendu.slice(i, i + 3).map((r) => r[0] + ' ' + r[1]); })());
      for (const page of ctx.pages()) { if (page !== p) { await page.close().catch(() => {}); } }
      await p.evaluate(() => Ext.WindowManager.each((w) => { if (w.isXType && w.isXType('window') && w.hasCls && w.hasCls('tb-fenetre')) { w.close(); } }));
      await p.waitForTimeout(400);
    }
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    await b.close();
    if (prefsAvant === '∅') {
      q(`DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '${USER}' AND str_CLE = 'tableau-bord'`);
    } else {
      q(`UPDATE t_preference_utilisateur SET txt_VALEUR = '${prefsAvant.slice(1).replace(/'/g, "''").replace(/\\/g, '\\\\')}' WHERE lg_USER_ID = '${USER}' AND str_CLE = 'tableau-bord'`);
    }
    fs.rmSync(dossier, { recursive: true, force: true });
    const apres = q(`SELECT IFNULL((SELECT CONCAT('=', txt_VALEUR) FROM t_preference_utilisateur WHERE lg_USER_ID = '${USER}' AND str_CLE = 'tableau-bord'), '∅')`);
    ok('Bilan : préférences du tableau de bord remises à l\'identique', apres === prefsAvant, apres + ' / ' + prefsAvant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
