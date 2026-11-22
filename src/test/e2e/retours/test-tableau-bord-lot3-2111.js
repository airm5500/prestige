/* TABLEAU DE BORD, PLAN DU 21/11 (lot 3) : carte BFR retiree, date de la frequentation au choix, impression des
 * articles en stock negatif. Vrai ecran d'accueil, preferences remises a la fin, rien d'ecrit en base.
 *  1. BFR : aucune carte BFR, aucune lecture de l'API BFR a l'ouverture ; le menu « BFR » reste dans le menu ;
 *  2. Frequentation : « ◀ Veille », calendrier et « Aujourd'hui » sur la carte. Dates variees (un jour vendu, sa
 *     veille, un lundi, un dimanche, une date future refusee, retour a aujourd'hui) : la demande part avec la date
 *     choisie ; dates de la legende = lundi -> jour choisi et semaine precedente ; totaux de la legende et ventes par
 *     heure = base (requete directe) ;
 *  3. Alerte « stock négatif » : bouton « Imprimer » (PDF dans un onglet) ; rapprochement fenetre / PDF / base :
 *     memes produits (CIP), meme stock, meme ordre, nombre et total ; pied et titre.
 *  4. Aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--raw', '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-tb-lot3-'));
const VENTE = "o.int_PRICE > 0 AND o.str_STATUT = 'is_Closed' AND o.b_IS_CANCEL = 0 AND o.lg_TYPE_VENTE_ID <> '5'";

(async () => {
  const D = q("SELECT DATE(dt_UPDATED) FROM t_preenregistrement WHERE str_STATUT = 'is_Closed' AND int_PRICE > 0 AND b_IS_CANCEL = 0 AND dt_UPDATED >= (SELECT MAX(dt_UPDATED) FROM t_preenregistrement) - INTERVAL 60 DAY AND WEEKDAY(dt_UPDATED) BETWEEN 2 AND 4 GROUP BY DATE(dt_UPDATED) ORDER BY COUNT(*) DESC LIMIT 1");
  const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
  const EMPL = q(`SELECT lg_EMPLACEMENT_ID FROM t_user WHERE lg_USER_ID = '${U}'`);
  const prefAvant = q("SELECT COUNT(*) FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'") === '1'
    ? q("SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'") : null;
  q("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'");
  const jourSql = (expr) => q(`SELECT ${expr}`);
  const AUJ = jourSql('CURDATE()');
  /* attendu pour un jour choisi : semaine du lundi au jour, et semaine precedente, par heure */
  const attendu = (j) => {
    const lundi = jourSql(`DATE_SUB('${j}', INTERVAL WEEKDAY('${j}') DAY)`), lundiAvant = jourSql(`DATE_SUB('${lundi}', INTERVAL 7 DAY)`);
    const heures = (deb, finExclue) => { const h = new Array(24).fill(0);
      q(`SELECT HOUR(o.dt_UPDATED), COUNT(*) FROM t_preenregistrement o WHERE ${VENTE} AND o.dt_UPDATED >= '${deb}' AND o.dt_UPDATED < ${finExclue} GROUP BY HOUR(o.dt_UPDATED)`)
        .split('\n').filter(Boolean).forEach((l) => { const [x, n] = l.split('\t'); h[+x] = +n; }); return h; };
    return { lundi, lundiAvant, dimAvant: jourSql(`DATE_SUB('${lundi}', INTERVAL 1 DAY)`), s: heures(lundi, `DATE_ADD('${j}', INTERVAL 1 DAY)`), p: heures(lundiAvant, `'${lundi}'`) };
  };
  const NEG = q(`SELECT CONCAT(f.int_CIP, '\t', s.int_NUMBER_AVAILABLE) FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID WHERE s.lg_EMPLACEMENT_ID = '${EMPL}' AND s.int_NUMBER_AVAILABLE < 0 AND f.str_STATUT = 'enable' ORDER BY s.int_NUMBER_AVAILABLE ASC`)
    .split('\n').filter(Boolean).map((l) => { const [cip, st] = l.split('\t'); return { cip, stock: +st }; });
  ok('Précondition : un jour vendu (' + D + '), des produits en stock négatif (' + NEG.length + ')', !!D && NEG.length > 0);

  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const appels = []; p.on('request', (r) => { if (/tableau-bord\//.test(r.url())) { appels.push(r.url()); } });
  let etape = 'connexion';
  try {
    await p.goto(process.env.BASE + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && testextjs.view.tableaubord && Ext.ComponentQuery.query('tableaubord').length, null, { timeout: 90000 });
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('tableaubord')[0].body.dom.querySelector('[data-tuile="ca"] .tb-v'); return v && v.textContent !== '…'; }, null, { timeout: 60000 });
    /* toutes les cartes lues (defilement jusqu'en bas : lecture a l'affichage) */
    await p.evaluate(async () => { const d = Ext.ComponentQuery.query('tableaubord')[0].body.dom; for (let y = 0; y < d.scrollHeight; y += 400) { d.scrollTop = y; await new Promise((r) => setTimeout(r, 120)); } d.scrollTop = 0; });
    await p.waitForTimeout(2500);

    /* 1. BFR */
    etape = 'bfr';
    const bfr = await p.evaluate(() => ({ carte: !!document.querySelector('[data-carte="bfr"]'), titre: Array.from(document.querySelectorAll('.tb-carte')).some((c) => /BFR/.test(c.textContent.slice(0, 80))),
      menu: Ext.ComponentQuery.query('tableaubord')[0].menu('bfr') }));
    ok('BFR : plus de carte BFR sur le tableau de bord', !bfr.carte && !bfr.titre, JSON.stringify(bfr));
    ok('BFR : aucune lecture de l\'API BFR à l\'ouverture', !appels.some((u) => /tableau-bord\/bfr/.test(u)), appels.filter((u) => /bfr/.test(u)).join(' '));
    ok('BFR : le menu « BFR » reste disponible', bfr.menu === true || !!bfr.menu, JSON.stringify(bfr));

    /* 2. frequentation, date au choix */
    etape = 'frequentation';
    await p.evaluate(() => { document.querySelector('[data-carte="frequentation"]').scrollIntoView(); });
    await p.waitForFunction(() => document.querySelector('[data-outils="frequentation"] [data-tranche]'), null, { timeout: 30000 });
    const outils = await p.evaluate(() => { const o = document.querySelector('[data-outils="frequentation"]');
      return { veille: !!o.querySelector('[data-fd="veille"]'), date: o.querySelector('[data-freqjour]') ? o.querySelector('[data-freqjour]').value : null,
        max: o.querySelector('[data-freqjour]') ? o.querySelector('[data-freqjour]').max : null }; });
    ok('Carte Fréquentation : ◀ Veille et calendrier, sur aujourd\'hui, sans date future', outils.veille && outils.date === AUJ && outils.max === AUJ, JSON.stringify(outils));
    if (outils.date !== null) {
      await p.click('[data-seg="freq"] [data-v="total"]');
      await p.selectOption('[data-tranche]', '1');
      const lire = async () => p.evaluate(() => {
        const c = document.querySelector('[data-corps="frequentation"]'), leg = c.querySelector('.tb-legende');
        const bulles = Array.from(c.querySelectorAll('svg rect title')).map((t) => t.textContent);
        return { legende: leg ? leg.textContent : c.textContent, bulles, date: document.querySelector('[data-freqjour]').value };
      });
      const choisir = async (action, attendueDate) => {
        const rep = p.waitForResponse((r) => /tableau-bord\/frequentation\?/.test(r.url()), { timeout: 30000 });
        await action();
        const r = await rep;
        await p.waitForTimeout(500);
        return { url: r.url(), vue: await lire(), attendueDate };
      };
      const dmy = (iso) => iso.split('-').reverse().join('/');
      const controler = (nom, x) => {
        const j = x.attendueDate, a = attendu(j);
        ok(nom + ' : demande envoyée pour le ' + dmy(j), new RegExp('date=' + j + '(&|$)').test(x.url), x.url);
        ok(nom + ' : calendrier sur le ' + dmy(j), x.vue.date === j, x.vue.date);
        const totS = a.s.reduce((s, v) => s + v, 0), totP = a.p.reduce((s, v) => s + v, 0);
        if (totS + totP === 0) {
          ok(nom + ' : aucune vente sur les deux semaines, dit comme tel', /Aucune vente/.test(x.vue.legende), x.vue.legende.slice(0, 120));
          return;
        }
        const dd = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
        const leg = x.vue.legende.replace(/\s+/g, ' ').replace(/ | /g, ' ');
        ok(nom + ' : légende, semaine du ' + dmy(a.lundi) + ' au ' + dmy(j) + ' et précédente', leg.indexOf(dd(a.lundi)) >= 0 && leg.indexOf(dd(j)) >= 0 && leg.indexOf(dd(a.lundiAvant)) >= 0 && leg.indexOf(dd(a.dimAvant)) >= 0, leg.slice(0, 260));
        const nb = (re) => { const m = leg.match(re); return m ? +m[1].replace(/\s/g, '') : NaN; };
        const lS = nb(/(?:Semaine en cours|Semaine du jour choisi)[^:]*: ([\d ]+) ventes/), lP = nb(/Semaine précédente[^:]*: ([\d ]+) ventes/);
        ok(nom + ' : totaux de la légende = base (' + totS + ' / ' + totP + ')', lS === totS && lP === totP, lS + ' / ' + lP);
        const ecarts = [];
        for (let h = 0; h < 24; h++) {
          const t = h + 'h-' + (h + 1) + 'h';
          const bs = x.vue.bulles.find((v) => v.startsWith('Semaine en cours, ' + t + ' : ') || v.startsWith('Semaine du jour choisi, ' + t + ' : '));
          const bp = x.vue.bulles.find((v) => v.startsWith('Semaine précédente, ' + t + ' : '));
          const vs = bs ? +bs.split(' : ')[1].split(' ')[0].replace(/[^\d]/g, '') : NaN, vp = bp ? +bp.split(' : ')[1].split(' ')[0].replace(/[^\d]/g, '') : NaN;
          if (vs !== a.s[h] || vp !== a.p[h]) { ecarts.push(t + ' ' + vs + '/' + a.s[h] + ' ' + vp + '/' + a.p[h]); }
        }
        ok(nom + ' : chaque heure, deux semaines = base', ecarts.length === 0, ecarts.slice(0, 5).join(' ; '));
      };
      const saisir = (j) => async () => { await p.evaluate((v) => { const i = document.querySelector('[data-freqjour]'); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); }, j); };
      const veille = (j) => jourSql(`DATE_SUB('${j}', INTERVAL 1 DAY)`);
      controler('Jour vendu choisi au calendrier', await choisir(saisir(D), D));
      ok('Légende : « Semaine du jour choisi »', /Semaine du jour choisi/.test((await lire()).legende));
      controler('◀ Veille', await choisir(() => p.click('[data-fd="veille"]'), veille(D)));
      const lundi = jourSql(`DATE_SUB('${D}', INTERVAL WEEKDAY('${D}') DAY)`), dimanche = jourSql(`DATE_ADD('${lundi}', INTERVAL 6 DAY)`);
      controler('Un lundi', await choisir(saisir(lundi), lundi));
      controler('Un dimanche', await choisir(saisir(dimanche), dimanche));
      const demain = jourSql('DATE_ADD(CURDATE(), INTERVAL 1 DAY)');
      controler('Date future : ramenée à aujourd\'hui', await choisir(saisir(demain), AUJ));
      controler('Retour', await choisir(saisir(D), D));
      controler('Aujourd\'hui', await choisir(() => p.click('[data-fd="aujourdhui"]'), AUJ));
      ok('Aujourd\'hui : légende « Semaine en cours », lien Aujourd\'hui retiré', await p.evaluate(() => !document.querySelector('[data-fd="aujourdhui"]')) && /Semaine en cours|Aucune vente/.test((await lire()).legende));
    }

    /* 3. alerte stock negatif : Imprimer */
    etape = 'negatifs';
    await p.evaluate(() => { document.querySelector('[data-carte="alertes"]').scrollIntoView(); });
    await p.waitForFunction(() => document.querySelector('[data-corps="alertes"] [data-liste="negatifs"]'), null, { timeout: 30000 });
    await p.click('[data-corps="alertes"] [data-liste="negatifs"]');
    await p.waitForFunction(() => { let v = false; Ext.WindowManager.each((w) => { if (w.isVisible() && /négatif/i.test(w.title || '')) v = true; }); return v; }, null, { timeout: 30000 });
    const fen = await p.evaluate(() => { let r = null; Ext.WindowManager.each((w) => { if (w.isVisible() && /négatif/i.test(w.title || '')) {
      r = { lignes: Array.from(w.body.dom.querySelectorAll('tr')).slice(1).map((tr) => ({ cip: tr.children[1].textContent.trim(), stock: +tr.children[2].textContent.replace(/[^\d-]/g, '') })),
        boutons: w.query('button').map((x) => x.text) }; } }); return r; });
    ok('Fenêtre : bouton « Imprimer »', fen.boutons.indexOf('Imprimer') >= 0, fen.boutons.join(', '));
    ok('Fenêtre = base (produits, stock, ordre)', JSON.stringify(fen.lignes.map((x) => x.stock)) === JSON.stringify(NEG.slice(0, 500).map((x) => x.stock))
      && fen.lignes.map((x) => x.cip).sort().join() === NEG.slice(0, 500).map((x) => x.cip).sort().join(), fen.lignes.length + ' / ' + NEG.length);
    if (fen.boutons.indexOf('Imprimer') >= 0) {
      const onglet = ctx.waitForEvent('page');
      await p.locator('.x-window').filter({ visible: true, hasText: 'stock négatif' }).locator('.x-btn').filter({ hasText: 'Imprimer' }).first().click();
      const o = await onglet; await o.waitForLoadState('domcontentloaded').catch(() => {});
      const pdfB = await p.evaluate(async (u) => { const x = await fetch(u); return { t: x.headers.get('content-type'), d: x.headers.get('content-disposition'), b: Array.from(new Uint8Array(await x.arrayBuffer())) }; }, o.url());
      const fichier = path.join(TMP, 'negatifs.pdf'); fs.writeFileSync(fichier, Buffer.from(pdfB.b));
      ok('Imprimer : PDF ouvert dans un onglet', pdfB.t === 'application/pdf' && /negatifs\/pdf/.test(o.url()) && /stock_negatif_\d{2}_\d{2}_\d{4}\.pdf/.test(pdfB.d || ''), o.url() + ' ' + pdfB.d);
      const texte = execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', fichier, '-'], { encoding: 'utf8' });
      const lignesPdf = [];
      texte.split('\n').forEach((l) => { const m = l.match(/^\s*(\d{4,})\s+.*?\s(-[\d ]*\d)\s*$/); if (m) { lignesPdf.push({ cip: m[1], stock: +m[2].replace(/\s/g, '') }); } });
      ok('PDF : titre et officine', /ARTICLES EN STOCK NÉGATIF/.test(texte) && texte.indexOf(q('SELECT str_NOM_COMPLET FROM t_officine LIMIT 1')) >= 0, texte.slice(0, 200));
      ok('PDF = base : tous les produits, même stock, même ordre (' + NEG.length + ')', JSON.stringify(lignesPdf.map((x) => x.stock)) === JSON.stringify(NEG.map((x) => x.stock))
        && lignesPdf.map((x) => x.cip).sort().join() === NEG.map((x) => x.cip).sort().join(), lignesPdf.length + ' / ' + NEG.length);
      const total = NEG.reduce((s, x) => s + x.stock, 0);
      const ligneTotal = texte.split('\n').find((l) => /^\s*TOTAL\s/.test(l)) || '';
      ok('PDF : ligne TOTAL (' + NEG.length + ' article(s), ' + total + ')', ligneTotal.indexOf(NEG.length + ' article(s)') >= 0 && +((ligneTotal.match(/(-[\d ]*\d)\s*$/) || [, 'x'])[1].replace(/\s/g, '')) === total, ligneTotal.trim());
      ok('PDF = fenêtre (lignes de la fenêtre au début du PDF, dans le même ordre)', JSON.stringify(lignesPdf.slice(0, fen.lignes.length).map((x) => x.stock)) === JSON.stringify(fen.lignes.map((x) => x.stock)));
      await o.close();
    }
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours sans exception (étape ' + etape + ')', false, e.stack);
  } finally {
    await b.close();
    q("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'");
    if (prefAvant !== null) { q("INSERT INTO t_preference_utilisateur (lg_USER_ID, str_CLE, txt_VALEUR, dt_UPDATED) VALUES ('" + U + "', 'tableau-bord', '" + prefAvant.replace(/\\/g, '\\\\').replace(/'/g, "''") + "', NOW())"); }
    ok('Nettoyage : préférences du tableau de bord remises', (prefAvant === null ? '__AUCUNE__' : prefAvant) === (q("SELECT IFNULL((SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'), '__AUCUNE__')")));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
