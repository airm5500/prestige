/* EXPORT CSV / EXCEL ET FILTRE DE DISPONIBILITE DES ONGLETS D'EXTRANET (retour du 08/11, point 2).
 * « Dans chaque grossiste, exporter en CSV et Excel les données de tous les onglets ; exporter l'affichage ou toutes les
 * lignes ; nom du grossiste dans le nom du fichier ; filtre dispo / non dispo quand il y a une colonne pour cette donnée. »
 *
 * Autorise par l'utilisateur le 08/11 : domain3, base laborex_audit telle quelle, CONSULTATION seulement. Ce test ne lit
 * rien sur les extranets (toute lecture de liste est interceptee dans le navigateur), n'enregistre ni n'efface aucun
 * compte et n'ecrit rien en base : l'export renvoie a Prestige les lignes deja affichees et rend le fichier.
 *
 * Vrai chemin : TEDIS > Produits > Notre catalogue produits (liste gardee, colonne Dispo), liste « Disponibilité »,
 * bouton « Exporter » et ses quatre choix ; Ubipharm > Produits > Réapprovisionnements (plusieurs pages) ;
 * Collectes. Fichiers recus par le navigateur (telechargement), relus ici.
 * Rapprochement : lignes affichees = lignes de l'API retenues par un oracle (Oui / Disponible… ; Non / Rupture…) ;
 * fichier CSV relu = grille, ligne par ligne et cellule par cellule ; fichier Excel relu = toutes les lignes de l'API,
 * nombres en nombres ; nom du fichier = « Grossiste - Onglet - date ».
 * Bilan : aucune collecte ajoutee, comptes et lignes gardees inchanges.
 *
 * Lancement : BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node test-ecran-export-0811.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : ''));
}
const ECRAN = 'extranetsgrossistes';
const OUI = /^\s*(oui|disponible|en stock|stock disponible)/i;
const NON = /^\s*(non|indisponible|rupture|en rupture|épuisé|hors stock|pas de stock)/i;
const jour = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();

/* lecteur CSV independant (« ; », guillemets, BOM) */
function lireCsv(s) {
  s = s.replace(/^﻿/, '');
  const r = []; let l = [], v = '', dans = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (dans) { if (c === '"' && s[i + 1] === '"') { v += '"'; i++; } else if (c === '"') { dans = false; } else { v += c; } }
    else if (c === '"') { dans = true; } else if (c === ';') { l.push(v); v = ''; }
    else if (c === '\r' && s[i + 1] === '\n') { l.push(v); v = ''; r.push(l); l = []; i++; } else { v += c; }
  }
  return r;
}
/* classeur Excel relu par openpyxl : [[valeurs]], nombres en nombres */
function lireXlsx(chemin) {
  const py = 'import json,sys,openpyxl\nw=openpyxl.load_workbook(sys.argv[1])\nf=w.worksheets[0]\n'
    + 'print(json.dumps({"feuille":f.title,"lignes":[[c for c in r] for r in f.iter_rows(values_only=True)]},ensure_ascii=False))';
  return JSON.parse(execFileSync('python', ['-X', 'utf8', '-W', 'ignore', '-I', '-c', py, chemin], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }));
}

(async () => {
  const avant = { collectes: q('SELECT COUNT(*) FROM extranet_collecte'), comptes: q('CHECKSUM TABLE extranet_compte'),
    lignes: q('CHECKSUM TABLE extranet_liste_ligne') };
  const navigateur = await ENV_E2E.lancer(chromium);
  const ctx = await navigateur.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  await p.route(/\/collecte|\/lectures\//, (r) => (r.request().method() === 'GET' && /\/lectures\//.test(r.request().url()) ? r.continue() : r.abort()));
  const fichiers = [];
  const telecharger = async (bouton, choix) => {
    const attente = p.waitForEvent('download', { timeout: 120000 });
    await vues.cliquer(p, ECRAN + ' #' + bouton);
    await p.waitForTimeout(300);
    await vues.cliquer(p, 'menuitem#' + bouton + choix);
    const d = await attente;
    const chemin = require('path').join(ENV_E2E.TMP, 'e2e-export-' + Date.now() + '-' + d.suggestedFilename().replace(/[^\w.-]/g, '_'));
    await d.saveAs(chemin);
    fichiers.push(chemin);
    return { nom: d.suggestedFilename(), chemin };
  };
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.mouse.move(1200, 600);
    await p.waitForTimeout(1500);

    /* ---- TEDIS, catalogue garde */
    for (const t of ['TEDIS', 'Produits', 'Notre catalogue produits']) { await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']'); await p.waitForTimeout(400); }
    await p.waitForFunction(() => { const me = Ext.ComponentQuery.query('extranetsgrossistes')[0];
      return me.donnees && me.donnees.TEDIS_CATALOGUE !== undefined && !me.down('#exListeTEDIS_CATALOGUE').el.isMasked(); }, null, { timeout: 120000 });
    await p.waitForTimeout(1000);
    const api = await p.evaluate(() => fetch('../api/v1/extranet/tedis/listes/TEDIS_CATALOGUE').then((r) => r.json()));
    const titres = api.colonnes || [], total = (api.lignes || []).length, kd = titres.findIndex((t) => /Dispo/.test(t));
    if (!total || kd < 0) { throw new Error('catalogue TEDIS gardé vide ou sans colonne Dispo : ' + total + ' / ' + kd); }
    const parPos = (l) => l.map((x) => x.position);
    const grille = () => p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exListeTEDIS_CATALOGUEGrille')[0].getStore().getRange()
      .map((r) => ({ position: r.get('position'), cellules: r.get('cellules') })));
    ok('filtre « Disponibilité » visible (colonne ' + titres[kd] + ')', await p.evaluate(() =>
      Ext.ComponentQuery.query('extranetsgrossistes #exListeTEDIS_CATALOGUEDispo')[0].isVisible()));
    /* toute la periode, pour ne filtrer que la disponibilite */
    if (await p.evaluate(() => { const c = Ext.ComponentQuery.query('extranetsgrossistes #exListeTEDIS_CATALOGUETout')[0]; return !!c && c.isVisible() && !c.pressed; })) {
      await vues.cliquer(p, ECRAN + ' #exListeTEDIS_CATALOGUETout');
      await p.waitForTimeout(800);
    }
    const nOui = api.lignes.filter((l) => OUI.test(l.cellules[kd] || '')), nNon = api.lignes.filter((l) => NON.test(l.cellules[kd] || ''));
    await vues.choisir(p, ECRAN + ' #exListeTEDIS_CATALOGUEDispo', 'Disponibles');
    await p.waitForTimeout(1200);
    let g = await grille();
    ok('Disponibles : écran = lignes « oui » de l\'API (' + nOui.length + ')', JSON.stringify(parPos(g)) === JSON.stringify(parPos(nOui)), g.length);
    ok('Disponibles : compteur « ' + nOui.length + ' / ' + total + ' »', (await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exListeTEDIS_CATALOGUENombre')[0]
      .el.dom.textContent)).indexOf(nOui.length + ' / ' + total + ' ligne') === 0);
    await vues.choisir(p, ECRAN + ' #exListeTEDIS_CATALOGUEDispo', 'Non disponibles');
    await p.waitForTimeout(1200);
    g = await grille();
    ok('Non disponibles : écran = lignes « non » de l\'API (' + nNon.length + ')', JSON.stringify(parPos(g)) === JSON.stringify(parPos(nNon)), g.length);
    ok('disponibles + non disponibles ≤ total, aucune ligne dans les deux', nOui.length + nNon.length <= total
      && !nOui.some((l) => NON.test(l.cellules[kd] || '')), nOui.length + ' + ' + nNon.length + ' / ' + total);

    /* export de l'affichage (non disponibles) en CSV : fichier = grille */
    const f1 = await telecharger('exListeTEDIS_CATALOGUEExport', 'AffichageCsv');
    ok('CSV affiché : nom « TEDIS - Notre catalogue produits - ' + jour + '.csv »', f1.nom === 'TEDIS - Notre catalogue produits - ' + jour + '.csv', f1.nom);
    const csv = lireCsv(fs.readFileSync(f1.chemin, 'utf8'));
    ok('CSV affiché : titres = colonnes de la grille', JSON.stringify(csv[0]) === JSON.stringify(titres), JSON.stringify(csv[0]));
    const corps = csv.slice(1);
    ok('CSV affiché : ' + g.length + ' lignes = grille, cellule par cellule', corps.length === g.length
      && corps.every((l, i) => JSON.stringify(l) === JSON.stringify(titres.map((t, k) => (g[i].cellules[k] === null || g[i].cellules[k] === undefined ? '' : String(g[i].cellules[k]))))),
    corps.length + ' / ' + g.length);

    /* export de toutes les lignes en Excel : filtre ignore, nombres en nombres */
    const f2 = await telecharger('exListeTEDIS_CATALOGUEExport', 'ToutesExcel');
    ok('Excel toutes : nom en .xlsx avec le grossiste', f2.nom === 'TEDIS - Notre catalogue produits - ' + jour + '.xlsx', f2.nom);
    const x = lireXlsx(f2.chemin);
    const xl = x.lignes.slice(1);
    const numeriques = titres.map((t) => /Prix|HT|TTC|Total|Montant|Cession|Public|TVA|Solde|Qté|Quantité|Colisage|Stock|Nbre/.test(t)
      && !/Désignation|Produit|Libellé|Promotion$|Description|Nom|Dispo|Unités gratuites|Paliers|UG|Remise|Taux|%/.test(t));
    let ecarts = [];
    for (let i = 0; i < api.lignes.length && ecarts.length < 3; i++) {
      for (let k = 0; k < titres.length; k++) {
        const v = api.lignes[i].cellules[k] === null || api.lignes[i].cellules[k] === undefined ? '' : String(api.lignes[i].cellules[k]);
        const c = xl[i] ? xl[i][k] : undefined;
        const nombre = numeriques[k] && /^-?(0|[1-9]\d{0,14})(\.\d{1,6})?$/.test(v);
        const attendu = nombre ? Number(v) : (v === '' ? null : v);
        if (!(c === attendu || (c === '' && attendu === null))) { ecarts.push(i + ':' + titres[k] + ' ' + JSON.stringify(c) + ' ≠ ' + JSON.stringify(attendu)); break; }
      }
    }
    ok('Excel toutes : ' + total + ' lignes = API, cellule par cellule (nombres en nombres)', xl.length === total && ecarts.length === 0
      && JSON.stringify(x.lignes[0]) === JSON.stringify(titres), xl.length + ' ; ' + ecarts.join(' | '));
    await vues.choisir(p, ECRAN + ' #exListeTEDIS_CATALOGUEDispo', 'toutes');
    await p.waitForTimeout(1200);
    ok('Disponibilité : toutes → ' + total + ' lignes', (await grille()).length === total);

    /* ---- Ubipharm, reapprovisionnements gardes : toutes les lignes, au-dela de la page affichee */
    for (const t of ['Ubipharm', 'Produits', 'Réapprovisionnements']) { await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']'); await p.waitForTimeout(400); }
    await p.waitForTimeout(2500);
    const totalR = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes')[0].reappro.getTotalCount());
    if (totalR > 0) {
      const f3 = await telecharger('exReapproExport', 'ToutesCsv');
      const r3 = lireCsv(fs.readFileSync(f3.chemin, 'utf8'));
      ok('Réappros, toutes (CSV) : ' + totalR + ' lignes, plus que la page affichée', r3.length - 1 === totalR, (r3.length - 1) + ' / ' + totalR + ' ; ' + f3.nom);
      ok('Réappros : nom « Ubipharm - Réapprovisionnements - date.csv »', f3.nom === 'Ubipharm - Réapprovisionnements - ' + jour + '.csv', f3.nom);
      const f4 = await telecharger('exReapproExport', 'AffichageCsv');
      const page = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes')[0].reappro.getCount());
      ok('Réappros, affichées (CSV) : ' + page + ' lignes = page affichée', lireCsv(fs.readFileSync(f4.chemin, 'utf8')).length - 1 === page);
    } else {
      ok('Réappros : aucun gardé, export non vérifié ici', true, 'ignoré');
    }

    /* ---- Collectes : journal exporte, nom du grossiste choisi */
    await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=Collectes]');
    await p.waitForTimeout(2000);
    const nC = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes')[0].collectes.getCount());
    const f5 = await telecharger('exCollectesExport', 'AffichageCsv');
    ok('Collectes (CSV) : ' + nC + ' lignes, nom « Ubipharm - Collectes - date.csv »', lireCsv(fs.readFileSync(f5.chemin, 'utf8')).length - 1 === nC
      && f5.nom === 'Ubipharm - Collectes - ' + jour + '.csv', f5.nom);
    ok('aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'export-erreur').catch(() => {});
  } finally {
    const apres = { collectes: q('SELECT COUNT(*) FROM extranet_collecte'), comptes: q('CHECKSUM TABLE extranet_compte'),
      lignes: q('CHECKSUM TABLE extranet_liste_ligne') };
    ok('bilan : aucune collecte ajoutée, comptes et lignes gardées inchangés', JSON.stringify(avant) === JSON.stringify(apres), JSON.stringify(apres));
    await navigateur.close();
    fichiers.forEach((f) => { try { fs.unlinkSync(f); } catch (e) { /* deja retire avec le navigateur */ } });
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
