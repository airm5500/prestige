/* LISTE DES VENTES ANNULEES : EXPORT EXCEL ET CSV (retour du 22/11, lot 9, point 8).
 *
 * Par les clics (compte e2e), menu SERVICE CLIENT > « Liste des ventes annulées », trois jeux :
 *  A. octobre 2026 entier (plus de 100 ventes, plusieurs pages, montants differents, motifs presents ou non) ;
 *  B. un seul jour (une vente) ;
 *  C. octobre 2026 avec une recherche (debut de reference d'une vente).
 * Pour chacun, bouton « Exporter » > « Excel (.xlsx) » puis « CSV (.csv) » :
 *  - Excel : en-tetes, une ligne par vente dans l'ordre de l'ecran (toutes pages), puis TOTAL (nombre de ventes, somme
 *    des montants) ; la premiere page de l'ecran = les premieres lignes, cellule par cellule (reference, type,
 *    montant, dates, motif) ; les montants sont des nombres ;
 *  - CSV : memes lignes et memes valeurs que l'Excel ;
 *  - base : memes ventes (t_preenregistrement annulee, close, annulee dans la periode), memes references et montants,
 *    nombre et somme ; le nombre = celui de l'ecran (barre de pagination) ;
 *  aucune ecriture en base ; aucune erreur JS.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').replace(/\n$/, '');
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const empreinte = () => q(`SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_preenregistrement WHERE b_IS_CANCEL = 1), (SELECT COUNT(*) FROM vente_motif), (SELECT COUNT(*) FROM mvttransaction))`);
const base = (du, au, rech) => lignes(`SELECT p.str_REF, p.int_PRICE FROM t_preenregistrement p WHERE p.b_IS_CANCEL = 1 AND p.str_STATUT = 'is_Closed' AND DATE(p.dt_ANNULER) BETWEEN '${du}' AND '${au}'
  AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
  ${rech ? `AND (f.int_CIP LIKE '${rech}%' OR p.str_REF_TICKET LIKE '${rech}%' OR p.str_REF LIKE '${rech}%' OR f.str_NAME LIKE '${rech}%' OR f.int_EAN13 LIKE '${rech}%')` : ''})`);
const fr = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
const COLS = ['Référence', 'Type de vente', 'Montant', 'Date vente', 'Heure vente', 'Date annulation', 'Heure annulation', 'Opérateur', 'Vendeur', 'Caissier', 'Motif'];
const CHAMPS = ['strREF', 'strTYPEVENTE', 'intPRICE', 'dtCREATED', 'HEUREVENTE', 'dateAnnulation', 'heureAnnulation', 'userFullName', 'userVendeurName', 'userCaissierName', 'motif'];

function lireXlsx(f) {
  return JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', `
import json, sys, warnings
warnings.simplefilter('ignore')
import openpyxl
f = openpyxl.load_workbook(sys.argv[1], data_only=True).worksheets[0]
print(json.dumps([[('' if x is None else (x if isinstance(x, (int, float)) else str(x))) for x in r] for r in f.iter_rows(values_only=True)]))`, f], { encoding: 'utf8', maxBuffer: 1 << 26 }));
}
function lireCsv(f) {
  const s = fs.readFileSync(f, 'utf8');
  const out = [];
  for (const l of s.replace(/^﻿/, '').split('\r\n').filter(Boolean)) {
    const c = []; let i = 0;
    while (i < l.length) { i++; let v = ''; for (;;) { if (l[i] === '"') { if (l[i + 1] === '"') { v += '"'; i += 2; continue; } i++; break; } v += l[i++]; } c.push(v); if (l[i] === ';') { i++; } }
    out.push(c);
  }
  return { bom: s.charCodeAt(0) === 0xfeff, lignes: out };
}

(async () => {
  const avant = empreinte();
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'va-'));
  try {
    const jourB = q("SELECT DATE(dt_ANNULER) FROM t_preenregistrement WHERE b_IS_CANCEL = 1 AND str_STATUT = 'is_Closed' AND dt_ANNULER >= '2026-10-01' GROUP BY DATE(dt_ANNULER) HAVING COUNT(*) = 1 ORDER BY 1 LIMIT 1");
    const refC = q("SELECT LEFT(str_REF, LENGTH(str_REF) - 2) FROM t_preenregistrement WHERE b_IS_CANCEL = 1 AND str_STATUT = 'is_Closed' AND DATE(dt_ANNULER) BETWEEN '2026-10-01' AND '2026-10-31' ORDER BY dt_ANNULER LIMIT 1");
    const JEUX = [['A. octobre 2026', '2026-10-01', '2026-10-31', ''], ['B. un jour (' + jourB + ')', jourB, jourB, ''], ['C. octobre 2026, recherche « ' + refC + ' »', '2026-10-01', '2026-10-31', refC]];
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Liste des ventes annulées');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('venteannuler')[0]; return v && v.rendered; }, null, { timeout: 60000 });
    const grille = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('venteannuler gridpanel').filter((x) => x.isVisible(true))[0]; return g.getId(); });
    const attendre = () => p.waitForFunction(() => { const g = Ext.ComponentQuery.query('venteannuler gridpanel').filter((x) => x.isVisible(true))[0]; return g && !g.getStore().isLoading(); }, null, { timeout: 120000 }).then(() => p.waitForTimeout(500));
    await attendre();
    for (const [nom, du, au, rech] of JEUX) {
      if (!du) { ok(nom + ' : jeu trouvé', false); continue; }
      await saisir(p, 'venteannuler #dtStart', fr(du));
      await saisir(p, 'venteannuler #dtEnd', fr(au));
      await saisir(p, 'venteannuler #query', rech);
      await cliquer(p, 'venteannuler #rechercher');
      await attendre();
      const ecran = await p.evaluate((id) => { const s = Ext.getCmp(id).getStore(); return { total: s.getTotalCount(), page: s.getRange().map((r) => r.data) }; }, await grille());
      const attendu = base(du, au, rech);
      const telecharger = async (texte, nomFichier) => {
        await cliquer(p, 'venteannuler #exportAnnulees');
        const item = p.locator('.x-menu-item').filter({ hasText: texte }).filter({ visible: true }).first();
        await item.waitFor({ timeout: 10000 });
        const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), item.click()]);
        const f = path.join(dossier, nomFichier);
        await dl.saveAs(f);
        return f;
      };
      const x = lireXlsx(await telecharger('Excel (.xlsx)', 'va.xlsx'));
      const iEnt = x.findIndex((r) => r[0] === 'Référence');
      const corps = x.slice(iEnt + 1).filter((r) => r.some((c) => c !== ''));
      const totalX = corps[corps.length - 1] || [];
      const ventesX = corps.slice(0, -1);
      ok(nom + ' : Excel, en-têtes', iEnt >= 0 && COLS.every((c, i) => x[iEnt][i] === c), JSON.stringify(x[iEnt]));
      const somme = attendu.reduce((s, r) => s + Number(r[1]), 0);
      ok(nom + ' : Excel, ' + ventesX.length + ' vente(s) = écran (' + ecran.total + ') = base (' + attendu.length + '), TOTAL = nombre et somme ' + somme, ventesX.length === ecran.total && ventesX.length === attendu.length
        && totalX[0] === 'TOTAL' && totalX[1] === attendu.length + ' vente(s)' && totalX[2] === somme, JSON.stringify(totalX));
      ok(nom + ' : Excel, montants en nombres', ventesX.every((r) => typeof r[2] === 'number'));
      const refX = ventesX.map((r) => r[0] + '#' + r[2]).sort(), refB = attendu.map((r) => r[0] + '#' + r[1]).sort();
      ok(nom + ' : Excel, mêmes ventes que la base (référence et montant)', JSON.stringify(refX) === JSON.stringify(refB), JSON.stringify(refX.filter((r) => !refB.includes(r))).slice(0, 200) + ' / ' + JSON.stringify(refB.filter((r) => !refX.includes(r))).slice(0, 200));
      const ecartsPage = ecran.page.map((v, i) => { const r = ventesX[i] || []; const e = CHAMPS.map((c, k) => (c === 'intPRICE' ? Number(v[c]) === r[k] : String(v[c] === undefined || v[c] === null ? '' : v[c]) === String(r[k])));
        return e.every(Boolean) ? null : i + ' ' + CHAMPS.filter((c, k) => !e[k]).map((c) => c + ' écran ' + v[c] + ' / xlsx ' + r[CHAMPS.indexOf(c)]).join(', '); }).filter(Boolean);
      ok(nom + ' : première page de l\'écran (' + ecran.page.length + ' ventes) = premières lignes de l\'Excel, cellule par cellule, même ordre', ecran.page.length > 0 && ecartsPage.length === 0, ecartsPage.slice(0, 3).join(' | '));
      const c = lireCsv(await telecharger('CSV (.csv)', 'va.csv'));
      const neutre = (v) => (typeof v === 'string' && v && '=+-@'.includes(v[0]) && !/^-?\d+$/.test(v) ? "'" + v : String(v));
      const ecartsCsv = ventesX.map((r, i) => (JSON.stringify(r.map(neutre)) === JSON.stringify(c.lignes[i + 1]) ? null : i)).filter((v) => v !== null);
      ok(nom + ' : CSV (BOM, « ; ») = Excel, ligne par ligne, puis TOTAL', c.bom && c.lignes.length === ventesX.length + 2 && JSON.stringify(c.lignes[0]) === JSON.stringify(COLS) && ecartsCsv.length === 0
        && c.lignes[c.lignes.length - 1][0] === 'TOTAL' && c.lignes[c.lignes.length - 1][2] === String(somme), 'écarts ' + ecartsCsv.slice(0, 5) + ' ; ' + c.lignes.length);
    }
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    await b.close();
    fs.rmSync(dossier, { recursive: true, force: true });
    ok('Bilan : aucune écriture (ventes, motifs, mouvements)', empreinte() === avant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
