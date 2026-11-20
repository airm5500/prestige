/* MARGES : PRODUITS QUI APPORTENT LE PLUS DE MARGE, TABLEAU DE BORD ET ONGLET ANALYSE (plan du 19/11, point 13).
 *
 * Demande : « produits avec les plus forte marge a ajouter sur le dashboard ; menu marges - onglet analyse : je
 * souhaite avoir aussi les produits qui apportent plus en terme de marge ; l'affichage des données est lent, le délai
 * est long pour 01/11 au 19/11/2026 ; permettre d'imprimer et exporter en excel l'analyse ».
 *
 * Par l'ecran, sur les ventes du banc (octobre 2026, lecture seule) :
 *  - tableau de bord (date forcee au 31/10) : carte « Top 10 des marges du mois » = calcul SQL independant, ligne par
 *    ligne (produit, marge, CA HT, quantite) ; « Voir plus » : la suite, meme ordre, les 10 premiers = la carte ;
 *  - Marges > Analyse, dates saisies au clavier, « Actualiser » : produits (20 premiers) = SQL = carte (10 premiers) ;
 *    familles et periode toujours la ; l'historique (moyennes, six mois) arrive ensuite ;
 *  - delais : premier affichage de la periode et historique sous leur plafond ; 01/11 -> 19/11 aussi ;
 *  - Excel : produits, familles et comparaisons = ecran, ligne par ligne ; impression (cadre invisible) = ecran ;
 *  - bilan : rien n'est ecrit en base ; aucune fenetre surgissante, aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const EMPL = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const PLAFOND_PERIODE_MS = 3000, PLAFOND_HISTORIQUE_MS = 10000, PLAFOND_EXCEL_MS = 8000, PLAFOND_IMPRESSION_MS = 2000, PLAFOND_CARTE_MS = 5000;
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
/* calcul independant : par produit, HT = TTC − remise − TVA, achat = prix d'achat de la vente × quantite */
const topSql = (d, f, n) => q(`SELECT CONCAT_WS('#', TRIM(f.str_NAME), f.int_CIP, x.qte, x.ttc - x.remise - x.tva, x.achat, x.ttc - x.remise - x.tva - x.achat) FROM (`
  + `SELECT d.lg_FAMILLE_ID, SUM(d.int_QUANTITY) qte, SUM(d.int_PRICE) ttc, SUM(IFNULL(d.int_PRICE_REMISE, 0)) remise, SUM(IFNULL(d.montantTva, 0)) tva, SUM(IFNULL(d.prixAchat, 0) * d.int_QUANTITY) achat`
  + ` FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID`
  + ` WHERE p.dt_UPDATED >= '${d}' AND p.dt_UPDATED < '${f}' AND u.lg_EMPLACEMENT_ID = '${EMPL}' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'`
  + ` GROUP BY d.lg_FAMILLE_ID) x JOIN t_famille f ON f.lg_FAMILLE_ID = x.lg_FAMILLE_ID ORDER BY x.ttc - x.remise - x.tva - x.achat DESC, TRIM(f.str_NAME) LIMIT ${n}`)
  .split('\n').filter(Boolean).map((l) => { const [nom, cip, qte, ht, achat, marge] = l.split('#'); return { nom: nom.replace(/\s+/g, ' '), cip, qte: +qte, ht: +ht, achat: +achat, marge: +marge }; });
const empreinte = () => q("SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_preenregistrement), (SELECT COUNT(*) FROM t_preenregistrement_detail), (SELECT COUNT(*) FROM t_bon_livraison),"
  + " (SELECT MD5(GROUP_CONCAT(str_KEY, '=', IFNULL(str_VALUE, '') ORDER BY str_KEY)) FROM t_parameters))");

(async () => {
  const avant = empreinte();
  const sqlOct10 = topSql('2026-10-01', '2026-11-01', 10), sqlOct20 = topSql('2026-10-01', '2026-11-01', 20);
  ok('Précondition : ventes d\'octobre sur le banc (au moins 20 produits)', sqlOct20.length === 20, sqlOct20.length);
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = [], dialogues = [];
  p.on('pageerror', (e) => err.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'marges-'));
  try {
    await p.goto((process.env.BASE || 'http://localhost:8080/prestige') + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && testextjs.view.tableaubord && Ext.ComponentQuery.query('tableaubord').length, null, { timeout: 90000 });

    /* 1. tableau de bord au 31/10 */
    await p.evaluate(() => { testextjs.view.tableaubord.TableauBord.dateForcee = '2026-10-31'; const t = Ext.ComponentQuery.query('tableaubord')[0]; t.body.dom.scrollTop = 0; t.chargerPreferences(() => t.construire()); });
    await p.waitForFunction(() => document.querySelector('[data-carte="topmarges"]'), null, { timeout: 30000 });
    const t0 = Date.now();
    await p.evaluate(() => document.querySelector('[data-carte="topmarges"]').scrollIntoView());
    await p.waitForFunction(() => document.querySelectorAll('[data-corps="topmarges"] table.tb-marges tr').length > 1 && document.querySelector('[data-corps="topmarges"] .tb-note'), null, { timeout: 60000 });
    const dCarte = Date.now() - t0;
    ok('Carte « Top 10 des marges du mois » affichée en moins de ' + PLAFOND_CARTE_MS + ' ms', dCarte < PLAFOND_CARTE_MS, dCarte + ' ms');
    const lireTable = (sel) => p.evaluate((s) => [...document.querySelectorAll(s + ' table.tb-marges tr')].slice(1).map((tr) => { const td = [...tr.querySelectorAll('td')].map((x) => x.innerText.trim());
      return { rang: +td[0], nom: td[1], marge: +td[2].replace(/\s/g, ''), taux: td[4], ht: +td[5].replace(/\s/g, ''), qte: +td[6].replace(/\s/g, '') }; }), sel);
    const carte = await lireTable('[data-corps="topmarges"]');
    const egal = (ecran, sql) => ecran.length === sql.length && ecran.every((x, i) => x.nom === sql[i].nom && x.marge === sql[i].marge && x.ht === sql[i].ht && x.qte === sql[i].qte);
    ok('Rapprochement carte / base : 10 produits, ligne par ligne (nom, marge, CA HT, quantité)', egal(carte, sqlOct10),
      JSON.stringify(carte.slice(0, 2)) + ' / ' + JSON.stringify(sqlOct10.slice(0, 2)));
    ok('Carte : marges décroissantes, rangs 1 à 10', carte.every((x, i) => x.rang === i + 1 && (i === 0 || carte[i - 1].marge >= x.marge)));
    /* la carte peut etre redessinee (preferences relues) : on attend sa note */
    const note = await p.waitForFunction(() => { const n = [...document.querySelectorAll('[data-corps="topmarges"] .tb-note')].map((x) => x.innerText); return n.length ? n.join(' | ') : false; },
      null, { timeout: 30000 }).then((h) => h.jsonValue());
    const instances = await p.evaluate(() => document.querySelectorAll('[data-corps="topmarges"]').length);
    console.log('cartes topmarges dans la page : ' + instances);
    ok('Carte : période et règle de calcul rappelées', /du 01\/10\/2026 au 31\/10\/2026/.test(note) && /Analyse/.test(note), note);
    await p.click('[data-carte="topmarges"] [data-plus="topmarges"]');
    await p.waitForFunction(() => document.querySelectorAll('.tb-fenetre table.tb-marges tr').length > 11, null, { timeout: 30000 });
    const plus = await lireTable('.tb-fenetre');
    const nb = +q(`SELECT COUNT(DISTINCT d.lg_FAMILLE_ID) FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID`
      + ` WHERE p.dt_UPDATED >= '2026-10-01' AND p.dt_UPDATED < '2026-11-01' AND u.lg_EMPLACEMENT_ID = '${EMPL}' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'`);
    ok('« Voir plus » : ' + Math.min(500, nb) + ' produits, les 10 premiers = la carte, ordre décroissant', plus.length === Math.min(500, nb) && egal(plus.slice(0, 10), sqlOct10)
      && plus.every((x, i) => i === 0 || plus[i - 1].marge >= x.marge), plus.length + ' / ' + nb);
    const plus500 = topSql('2026-10-01', '2026-11-01', 500);
    ok('Rapprochement « Voir plus » / base, 500 lignes', egal(plus, plus500), (() => { const i = plus.findIndex((x, k) => !plus500[k] || x.nom !== plus500[k].nom || x.marge !== plus500[k].marge || x.ht !== plus500[k].ht || x.qte !== plus500[k].qte); return i + ' ' + JSON.stringify(plus[i]) + ' / ' + JSON.stringify(plus500[i]) + ' / ' + JSON.stringify(plus500[i + 1]); })());
    await p.evaluate(() => Ext.WindowManager.each((w) => { if (w.isVisible() && /marge/i.test(w.title || '')) { w.close(); } }));

    /* 2. Marges > Analyse, par l'ecran */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('margeproducts', 'Marge sur produits', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('margeonglets #mg-analyse').length > 0, null, { timeout: 30000 });
    await V.cliquer(p, 'margeonglets #mg-analyse');
    await p.waitForFunction(() => { const o = Ext.ComponentQuery.query('margeonglets')[0]; return o.donnees && o.donnees.historique; }, null, { timeout: 60000 });
    const analyser = async (debut, fin) => {
      await V.saisir(p, 'margeonglets #mgDebut', debut);
      await V.saisir(p, 'margeonglets #mgFin', fin);
      const t = Date.now();
      await V.cliquer(p, 'margeonglets #mgActualiser');
      await p.waitForFunction(() => { const d = Ext.ComponentQuery.query('margeonglets #mgContenu')[0].getEl().dom; return d.querySelector('table.mg-par-produit') && !Ext.ComponentQuery.query('margeonglets')[0].analyse.getEl().isMasked(); }, null, { timeout: 60000 });
      const dPeriode = Date.now() - t;
      const attenteVue = await p.evaluate(() => !!Ext.ComponentQuery.query('margeonglets #mgContenu')[0].getEl().dom.querySelector('tr.mg-attente'));
      await p.waitForFunction(() => { const o = Ext.ComponentQuery.query('margeonglets')[0]; return o.donnees && o.donnees.historique && !o.analyse.down('#mgExcel').isDisabled(); }, null, { timeout: 60000 });
      return { dPeriode, dTotal: Date.now() - t, attenteVue };
    };
    const nov = await analyser('01/11/2026', '19/11/2026');
    ok('01/11 → 19/11 : période affichée en moins de ' + PLAFOND_PERIODE_MS + ' ms, historique en moins de ' + PLAFOND_HISTORIQUE_MS + ' ms',
      nov.dPeriode < PLAFOND_PERIODE_MS && nov.dTotal < PLAFOND_HISTORIQUE_MS, nov.dPeriode + ' ms puis ' + nov.dTotal + ' ms');
    const oct = await analyser('01/10/2026', '31/10/2026');
    ok('Octobre : période affichée en moins de ' + PLAFOND_PERIODE_MS + ' ms, puis l\'historique', oct.dPeriode < PLAFOND_PERIODE_MS && oct.dTotal < PLAFOND_HISTORIQUE_MS,
      oct.dPeriode + ' ms puis ' + oct.dTotal + ' ms ; attente visible : ' + oct.attenteVue);
    const ecran = await p.evaluate(() => { const d = Ext.ComponentQuery.query('margeonglets #mgContenu')[0].getEl().dom;
      const lignes = (s) => [...d.querySelectorAll(s)].map((tr) => [...tr.querySelectorAll('td')].map((x) => x.innerText.trim()));
      return { produits: lignes('table.mg-par-produit tr.mg-produit'), familles: lignes('tr.mg-famille'), comparaisons: lignes('tr.mg-comp'), mois: lignes('tr.mg-mois'),
        titre: (d.querySelector('table.mg-par-produit') || {}).previousSibling ? d.querySelector('table.mg-par-produit').previousSibling.innerText : '' }; });
    const prodEcran = ecran.produits.map((t) => ({ nom: t[0].replace(/\s*\([^()]*\)$/, ''), qte: +t[1].replace(/\s/g, ''), ht: +t[2].replace(/\s/g, ''), achat: +t[3].replace(/\s/g, ''), marge: +t[4].replace(/\s/g, '') }));
    const ecartProd = prodEcran.findIndex((x, i) => !sqlOct20[i] || x.nom !== sqlOct20[i].nom || x.qte !== sqlOct20[i].qte || x.ht !== sqlOct20[i].ht || x.achat !== sqlOct20[i].achat || x.marge !== sqlOct20[i].marge);
    ok('Analyse : 20 produits = base, ligne par ligne (nom, quantité, CA HT, achat, marge)', prodEcran.length === 20 && ecartProd < 0,
      ecartProd + ' ' + JSON.stringify(prodEcran[ecartProd]) + ' / ' + JSON.stringify(sqlOct20[ecartProd]));
    ok('Rapprochement Analyse / tableau de bord : les 10 premiers produits identiques (nom, marge, CA HT, quantité)', prodEcran.length >= 10
      && carte.every((x, i) => x.nom === prodEcran[i].nom && x.marge === prodEcran[i].marge && x.ht === prodEcran[i].ht && x.qte === prodEcran[i].qte));
    ok('Analyse : titre « 20 premiers sur N vendus », N = base', new RegExp('20 premiers sur ' + fmt(nb).replace(/ /g, '\\s') + ' vendus').test(ecran.titre), ecran.titre);
    ok('Analyse : comparaisons (4), six mois, familles toujours affichés', ecran.comparaisons.length === 4 && ecran.mois.length === 6 && ecran.familles.length >= 1,
      ecran.comparaisons.length + ' / ' + ecran.mois.length + ' / ' + ecran.familles.length);

    /* 3. Excel */
    const xlsx = path.join(dossier, 'analyse.xlsx');
    const t1 = Date.now();
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), V.cliquer(p, 'margeonglets #mgExcel')]);
    await dl.saveAs(xlsx);
    const dExcel = Date.now() - t1;
    ok('Délai : Excel en moins de ' + PLAFOND_EXCEL_MS + ' ms', dExcel < PLAFOND_EXCEL_MS, dExcel + ' ms');
    ok('Nom du fichier Excel', dl.suggestedFilename() === 'analyse_marges_2026-10-01_2026-10-31.xlsx', dl.suggestedFilename());
    const lu = JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', `import sys,json,openpyxl
ws=openpyxl.load_workbook(sys.argv[1]).active
print(json.dumps([[('' if c is None else (str(int(c)) if isinstance(c,float) and c==int(c) else str(c))) for c in r] for r in ws.iter_rows(values_only=True)]))`, xlsx], { encoding: 'utf8' }));
    const entete = lu.findIndex((r) => r[0] === 'Rubrique');
    const xl = lu.slice(entete + 1).filter((r) => r[0]);
    const xlProd = xl.filter((r) => r[0] === 'Produit').map((r) => ({ nom: r[1].replace(/\s*\([^()]*\)$/, ''), qte: +r[2], ht: +r[3], achat: +r[4], marge: +r[5] }));
    ok('Rapprochement Excel / écran : produits, ligne par ligne', JSON.stringify(xlProd) === JSON.stringify(prodEcran), JSON.stringify(xlProd.slice(0, 2)));
    const xlFam = xl.filter((r) => r[0] === 'Famille').map((r) => [r[1], fmt(+r[3]), fmt(+r[4]), fmt(+r[5])]);
    ok('Rapprochement Excel / écran : familles (libellé, CA HT, achat, marge)', JSON.stringify(xlFam) === JSON.stringify(ecran.familles.map((t) => t.slice(0, 4))), JSON.stringify(xlFam.slice(0, 2)));
    const xlComp = xl.filter((r) => r[0] === 'Comparaison').map((r) => fmt(+r[5]));
    ok('Rapprochement Excel / écran : comparaisons (4 marges), six mois', JSON.stringify(xlComp) === JSON.stringify(ecran.comparaisons.map((t) => t[3]))
      && xl.filter((r) => r[0] === 'Mois').map((r) => fmt(+r[5])).join('|') === ecran.mois.map((t) => t[3]).join('|'), JSON.stringify(xlComp));
    ok('Excel : titre et période', lu[0][0] === 'ANALYSE DES MARGES' && lu.some((r) => /01\/10\/2026 au 31\/10\/2026/.test(r[0])), JSON.stringify(lu.slice(0, 3)));

    /* 4. impression */
    const t2 = Date.now();
    await V.cliquer(p, 'margeonglets #mgImprimer');
    await p.waitForFunction(() => { const f = document.getElementById('mg-impression-analyse'); return f && f.contentDocument && f.contentDocument.querySelectorAll('table.mg-par-produit tr.mg-produit').length > 0; }, null, { timeout: 15000 });
    const dImp = Date.now() - t2;
    ok('Délai : impression prête en moins de ' + PLAFOND_IMPRESSION_MS + ' ms', dImp < PLAFOND_IMPRESSION_MS, dImp + ' ms');
    const imp = await p.evaluate(() => { const d = document.getElementById('mg-impression-analyse').contentDocument;
      return { titre: d.querySelector('h3').innerText, entete: d.querySelector('p').innerText, produits: [...d.querySelectorAll('tr.mg-produit')].map((tr) => [...tr.querySelectorAll('td')].map((x) => x.innerText.trim())),
        comparaisons: d.querySelectorAll('tr.mg-comp').length, familles: d.querySelectorAll('tr.mg-famille').length }; });
    ok('Impression : titre et période', imp.titre === 'ANALYSE DES MARGES' && /01\/10\/2026 au 31\/10\/2026/.test(imp.entete), imp.entete);
    ok('Rapprochement impression / écran : produits, comparaisons, familles', JSON.stringify(imp.produits) === JSON.stringify(ecran.produits) && imp.comparaisons === 4 && imp.familles === ecran.familles.length);

    ok('Bilan : rien n\'est écrit en base (ventes, BL, paramètres)', empreinte() === avant);
    ok('Aucune fenêtre surgissante', dialogues.length === 0 && await p.evaluate(() => !Ext.ComponentQuery.query('messagebox').some((w) => w.isVisible())), dialogues.join(' | '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    fs.rmSync(dossier, { recursive: true, force: true });
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
