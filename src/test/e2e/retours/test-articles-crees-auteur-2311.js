/* TABLEAU DE BORD, ALERTE « ARTICLES CREES » : AUTEUR ET DATE SUR UNE LIGNE (retours du 23/11).
 *
 * Defaut : « Créé par » ne se lisait que dans la notification de creation ; les notifications ne sont pas gardees
 * (appaul : rien avant le 12/11), d'ou des lignes sans auteur alors que le journal (t_event_log) le donne. La date et
 * l'heure passaient sur deux lignes.
 *
 * Jeu d'essai (6 articles crees juste avant le test ; leur ligne de journal est datee de l'insertion) :
 *  A  notification (compte e2e) et journal (autre utilisateur) : la notification l'emporte ;
 *  B  journal seul, 2 s apres la creation, meme CIP : auteur du journal ;
 *  C  journal seul avec l'ancien CIP (CIP change depuis), meme nom : auteur du journal ;
 *  D  journal seul, 2 min apres la creation (hors fenetre) : aucun auteur ;
 *  E  journal seul pour un CIP qui commence comme celui de l'article (CIP + « 9 ») et un autre nom : aucun auteur ;
 *  F  article detail, journal « creation de detail » seul : auteur du journal.
 * Par les clics (compte e2e) : tableau de bord, alerte « articles créés », fenetre de la liste, « Imprimer » :
 *  - rapprochement : auteur dans la fenetre = PDF = bandeau de la fiche article (API de l'ecran) = attendu ;
 *  - la date « Créé le » de chaque ligne tient sur une seule ligne (1366×768 et 1280×720) ;
 *  bilan : articles, journal et notifications d'essai retires ; preferences du tableau de bord remises a l'identique.
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
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').replace(/\n$/, '');

const M = 'E2EAUT';
const USER = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const AUTRE = q(`SELECT lg_USER_ID FROM t_user WHERE lg_USER_ID <> '${USER}' AND str_STATUT = 'enable' AND TRIM(CONCAT(IFNULL(str_FIRST_NAME,''),' ',IFNULL(str_LAST_NAME,''))) <> '' ORDER BY lg_USER_ID LIMIT 1`);
const nomDe = (u) => q(`SELECT TRIM(CONCAT(IFNULL(str_FIRST_NAME, ''), ' ', IFNULL(str_LAST_NAME, ''))) FROM t_user WHERE lg_USER_ID = '${u}'`);
const NOM_E2E = nomDe(USER);
const NOM_AUTRE = nomDe(AUTRE);
const prefsAvant = q(`SELECT IFNULL((SELECT CONCAT('=', txt_VALEUR) FROM t_preference_utilisateur WHERE lg_USER_ID = '${USER}' AND str_CLE = 'tableau-bord'), '∅')`);
const MODELE = q(`SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND (lg_FAMILLE_PARENT_ID IS NULL OR lg_FAMILLE_PARENT_ID = '') ORDER BY dt_CREATED DESC LIMIT 1`);

/* id, CIP, nom, (inutilise), detail, journal : [utilisateur, ecart en s entre la creation et le journal, CIP du journal, nom du journal, type], notification, attendu */
const ART = [
  ['A', M + '01', 'E2E AUTEUR ALPHA', 50, 0, [AUTRE, 1, M + '01', 'E2E AUTEUR ALPHA', 34], USER, NOM_E2E],
  ['B', M + '02', 'E2E AUTEUR BRAVO', 40, 0, [AUTRE, 2, M + '02', 'E2E AUTEUR BRAVO', 34], null, NOM_AUTRE],
  ['C', M + '03', 'E2E AUTEUR CHARLIE', 30, 0, [AUTRE, 1, '300000' + M + '03', 'E2E AUTEUR CHARLIE', 34], null, NOM_AUTRE],
  ['D', M + '04', 'E2E AUTEUR DELTA', 20, 0, [AUTRE, 120, M + '04', 'E2E AUTEUR DELTA', 34], null, ''],
  ['E', M + '05', 'E2E AUTEUR ECHO', 10, 0, [AUTRE, 1, M + '059', 'E2E AUTRE NOM', 34], null, ''],
  ['F', M + '06D', 'E2E AUTEUR FOXTROT DET', 5, 1, [AUTRE, 1, M + '06D', 'E2E AUTEUR FOXTROT DET', 35], null, NOM_AUTRE],
];
const id = (a) => M + '-' + a[0];

function nettoyer() {
  q(`DELETE FROM notification WHERE entity_ref LIKE '${M}-%';
     DELETE FROM t_event_log WHERE lg_EVENT_LOG_ID LIKE '${M}-%';
     DELETE FROM t_famille WHERE lg_FAMILLE_ID LIKE '${M}-%';`);
}

function installer() {
  nettoyer();
  let s = `CREATE TEMPORARY TABLE e2e_modele AS SELECT * FROM t_famille WHERE lg_FAMILLE_ID = '${MODELE}';\n`;
  for (const a of ART) {
    s += `UPDATE e2e_modele SET lg_FAMILLE_ID = '${id(a)}', int_CIP = '${a[1]}', str_NAME = '${a[2]}', str_DESCRIPTION = '${a[2]}', int_EAN13 = NULL,
            lg_FAMILLE_PARENT_ID = ${a[4] ? `'${MODELE}'` : "''"}, bool_DECONDITIONNE = ${a[4]}, str_STATUT = 'enable',
            dt_CREATED = NOW() - INTERVAL ${a[5][1]} SECOND, dt_UPDATED = NOW();
          INSERT INTO t_famille SELECT * FROM e2e_modele;
          /* le declencheur TrgCheckInsert_event_log date la ligne de journal a l'heure de l'insertion (NOW()) : c'est
             l'article qui est date de l'ecart voulu avant elle */
          INSERT INTO t_event_log (lg_EVENT_LOG_ID, lg_USER_ID, dt_CREATED, dt_UPDATED, str_STATUT, str_TABLE_CONCERN, typeLog, str_DESCRIPTION)
            SELECT '${id(a)}', '${a[5][0]}', NOW(), NOW(), 'enable', 'dal.TFamille', ${a[5][4]},
              CONCAT('Création du produit  cip [${a[5][2]} ${a[5][3]} par ', '${nomDe(a[5][0]).replace(/'/g, "''")}', ' ]')
            FROM t_famille f WHERE f.lg_FAMILLE_ID = '${id(a)}';\n`;
    if (a[6]) {
      s += `INSERT INTO notification (id, created_at, modfied_at, user_id, message, statut, type_notification, entity_ref)
              SELECT '${id(a)}', f.dt_CREATED, f.dt_CREATED, '${a[6]}', '', 'SEND', ${a[4] ? 22 : 21}, '${id(a)}' FROM t_famille f WHERE f.lg_FAMILLE_ID = '${id(a)}';\n`;
    }
  }
  q(s);
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'auteur-'));
  try {
    ok('Jeu d\'essai : deux utilisateurs distincts, un modèle d\'article', USER && AUTRE && NOM_E2E && NOM_AUTRE && NOM_E2E !== NOM_AUTRE && MODELE, [NOM_E2E, NOM_AUTRE, MODELE].join(' / '));
    installer();
    ok('Jeu d\'essai : 6 articles, 6 lignes de journal, 1 notification', q(`SELECT CONCAT((SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID LIKE '${M}-%'), '/', (SELECT COUNT(*) FROM t_event_log WHERE lg_EVENT_LOG_ID LIKE '${M}-%'), '/', (SELECT COUNT(*) FROM notification WHERE entity_ref LIKE '${M}-%'))`) === '6/6/1');

    for (const [larg, haut] of [[1366, 768], [1280, 720]]) {
      const ctx = await b.newContext({ viewport: { width: larg, height: haut } });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => err.push(e.message));
      await connexion(p, ENV_E2E.LOGIN, 'e2etest');
      await p.waitForFunction(() => window.testextjs && testextjs.view.tableaubord && Ext.ComponentQuery.query('tableaubord').length, null, { timeout: 90000 });
      const alerte = p.locator('[data-liste="crees"]').filter({ visible: true }).first();
      await alerte.waitFor({ timeout: 120000 });
      /* periode d'un jour : les articles d'essai sont crees aujourd'hui */
      const champ = p.locator('input[data-p="cr"]').first();
      if (!(await champ.isVisible())) { await p.locator('[data-periodes]').first().click(); await champ.waitFor({ state: 'visible', timeout: 10000 }); }
      /* la periode est une preference : deja a 1 au second format d'ecran, la carte ne se recharge pas */
      if ((await champ.inputValue()) !== '1') {
        const [rep] = await Promise.all([
          p.waitForResponse((r) => /tableau-bord\/alertes\?/.test(r.url()) && new URL(r.url()).searchParams.get('cr') === '1', { timeout: 60000 }),
          (async () => { await champ.fill('1'); await champ.press('Tab'); })(),
        ]);
        await rep.finished();
      }
      await p.waitForTimeout(800);
      await p.locator('[data-liste="crees"]').filter({ visible: true }).first().click();
      const fen = p.locator('.tb-fenetre').filter({ visible: true }).last();
      await fen.waitFor({ timeout: 60000 });
      await p.waitForTimeout(500);
      const ecran = await fen.evaluate((f) => Array.from(f.querySelectorAll('table.tb-fixe tr')).slice(1).map((r) => {
        const c = Array.from(r.querySelectorAll('td'));
        const d = c[2];
        const range = document.createRange();
        range.selectNodeContents(d);
        const hauts = new Set(Array.from(range.getClientRects()).map((x) => Math.round(x.top)));
        return { cip: c[1].textContent.trim(), date: d.textContent.trim(), lignesDate: hauts.size, auteur: c[3].textContent.trim(), titre: c[3].getAttribute('title') || '' };
      }));
      const dim = larg + '×' + haut;
      const ecarts = ART.map((a) => {
        const l = ecran.find((x) => x.cip === a[1]);
        const vu = l ? (l.auteur === '—' ? '' : l.auteur) : '(absent)';
        return vu === a[7] ? null : a[0] + ' « ' + vu + ' » / « ' + a[7] + ' »';
      }).filter(Boolean);
      ok(dim + ' : « Créé par » de la fenêtre = attendu, article par article (A notification, B journal, C ancien CIP, D hors fenêtre, E autre CIP, F détail)', ecarts.length === 0, ecarts.join(' | '));
      const tronques = ecran.filter((x) => ART.some((a) => a[1] === x.cip) && x.auteur !== '—' && x.titre !== x.auteur);
      ok(dim + ' : nom de l\'auteur entier en infobulle', tronques.length === 0, tronques.map((x) => x.cip).join(', '));
      const surDeux = ecran.filter((x) => x.lignesDate !== 1);
      ok(dim + ' : « Créé le » sur une seule ligne, pour les ' + ecran.length + ' lignes', ecran.length >= ART.length && surDeux.length === 0, surDeux.slice(0, 3).map((x) => x.cip + ' ' + x.date + ' : ' + x.lignesDate + ' lignes').join(' | '));

      if (larg === 1366) {
        /* PDF de la liste */
        const [rp] = await Promise.all([ctx.waitForEvent('response', { predicate: (r) => /alertes\/crees\/pdf/.test(r.url()), timeout: 60000 }), cliquer(p, 'window button[itemId=tbImprimerListe]')]);
        const fPdf = path.join(dossier, 'crees.pdf');
        fs.writeFileSync(fPdf, await (await ctx.request.get(rp.url())).body());
        const texte = execFileSync('pdftotext', ['-layout', fPdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/[  ]/g, ' ');
        const ecartsPdf = ART.map((a) => {
          const l = texte.split('\n').find((x) => x.trim().startsWith(a[1] + ' ') || x.includes(' ' + a[1] + ' '));
          if (!l) { return a[0] + ' absent'; }
          const debutAuteur = a[7] ? a[7].slice(0, 12) : null;
          const autres = [NOM_E2E, NOM_AUTRE].filter((n) => n !== a[7]).map((n) => n.slice(0, 12));
          return (debutAuteur ? l.includes(debutAuteur) : true) && !autres.some((n) => l.includes(n)) ? null : a[0] + ' : ' + l.trim();
        }).filter(Boolean);
        ok('PDF « Imprimer » : auteur de chaque article d\'essai = fenêtre', ecartsPdf.length === 0, ecartsPdf.join(' | '));
        for (const page of ctx.pages()) { if (page !== p) { await page.close().catch(() => {}); } }

        /* bandeau de la fiche article : meme lecture que l'ecran */
        const ecartsFiche = [];
        for (const a of ART) {
          const r = await p.evaluate((pid) => fetch('../api/v1/produit-search/apercu/' + encodeURIComponent(pid)).then((x) => x.json()), id(a));
          const vu = (r && (r.creePar !== undefined ? r.creePar : (r.data || {}).creePar)) || '';
          if (vu !== a[7]) { ecartsFiche.push(a[0] + ' « ' + vu + ' » / « ' + a[7] + ' »'); }
        }
        ok('Fiche article (bandeau) : « Créé par » = fenêtre = attendu, pour les 6 articles', ecartsFiche.length === 0, ecartsFiche.join(' | '));
      }
      await ctx.close();
    }
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    await b.close();
    nettoyer();
    if (prefsAvant === '∅') {
      q(`DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '${USER}' AND str_CLE = 'tableau-bord'`);
    } else {
      q(`UPDATE t_preference_utilisateur SET txt_VALEUR = '${prefsAvant.slice(1).replace(/'/g, "''").replace(/\\/g, '\\\\')}' WHERE lg_USER_ID = '${USER}' AND str_CLE = 'tableau-bord'`);
    }
    fs.rmSync(dossier, { recursive: true, force: true });
    const reste = q(`SELECT CONCAT((SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID LIKE '${M}-%'), '/', (SELECT COUNT(*) FROM t_event_log WHERE lg_EVENT_LOG_ID LIKE '${M}-%'), '/', (SELECT COUNT(*) FROM notification WHERE entity_ref LIKE '${M}-%'))`);
    const apres = q(`SELECT IFNULL((SELECT CONCAT('=', txt_VALEUR) FROM t_preference_utilisateur WHERE lg_USER_ID = '${USER}' AND str_CLE = 'tableau-bord'), '∅')`);
    ok('Bilan : articles, journal et notifications d\'essai retirés (0/0/0), préférences remises à l\'identique', reste === '0/0/0' && apres === prefsAvant, reste);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
