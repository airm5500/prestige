/* RELEVE DES FACTURES DE GROUPE EN EXCEL, AVEC LES DEUX SOUS-TOTAUX (plan du 19/11, point 14).
 *
 * Demande : exporter en Excel le releve des factures de groupe (FACTURATION > Factures Compagnies Ass), avec les deux
 * sous-totaux du PDF : par facture de groupe et par tiers payant. L'Excel doit montrer exactement le PDF.
 *
 * Par l'ecran, sur les factures de groupe du banc (lecture seule), deux jeux d'essai :
 *  A. un groupe (WILLIS MEDINOVA), aout -> octobre 2026 : 12 factures de groupe, 1 a 20 organismes chacune ;
 *  B. tous les groupes, janvier 2026 : 27 groupes, factures reglees, en partie reglees et non reglees.
 * Pour chaque jeu et chaque sous-total (bouton « Relevé Excel », puis bouton « Relevé ») :
 *  - Excel / PDF : chaque facture (n°, tiers payant, periode, facture, regle, reste, statut), chaque sous-total, chaque
 *    total de groupe et le total general, ligne par ligne, dans le meme ordre ; autant de lignes de part et d'autre ;
 *  - Excel / base : chaque facture = t_facture (montant, regle, reste), aucune facture perdue ni en double ;
 *  - Excel / ecran (jeu A) : une ligne de la liste par facture de groupe = son sous-total (nombre, facture, regle, reste) ;
 *  - regles : reste = facture − regle a chaque ligne ; sous-totaux = factures du bloc ; total du groupe = ses sous-totaux ;
 *  - delais : Excel et PDF sous leur plafond ;
 *  - bilan : rien n'est ecrit en base ; aucune fenetre surgissante, aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const editions = require('../support/editions');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const PLAFOND_EXCEL_MS = 8000, PLAFOND_PDF_MS = 15000;
const fmt = (n) => String(Math.round(+n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const nombre = (n, mot) => n + ' ' + mot + (n > 1 ? 's' : '');
const empreinte = () => q("SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_facture), (SELECT COUNT(*) FROM t_groupe_factures),"
  + " (SELECT SUM(dbl_MONTANT_PAYE) + SUM(dbl_MONTANT_RESTANT) FROM t_facture), (SELECT COUNT(*) FROM t_event_log),"
  + " (SELECT MD5(GROUP_CONCAT(str_KEY, '=', IFNULL(str_VALUE, '') ORDER BY str_KEY)) FROM t_parameters))");
/* factures du releve, lues en base sans le service : code -> [montant, regle, reste] */
const enBase = (debut, fin, groupe) => {
  const m = new Map();
  q(`SELECT CONCAT_WS('#', f.str_CODE_FACTURE, ROUND(COALESCE(f.dbl_MONTANT_CMDE, 0)), ROUND(COALESCE(f.dbl_MONTANT_PAYE, 0)), ROUND(COALESCE(f.dbl_MONTANT_RESTANT, 0)))`
    + ` FROM t_groupe_factures g JOIN t_facture f ON f.lg_FACTURE_ID = g.lg_FACTURES_ID WHERE DATE(g.dt_CREATED) BETWEEN '${debut}' AND '${fin}'`
    + (groupe ? ` AND g.lg_GROUPE_ID = ${groupe}` : '')).split('\n').filter(Boolean).forEach((l) => {
    const [code, ...v] = l.split('#'); m.set(code, (m.get(code) || []).concat([v.map(Number)]));
  });
  return m;
};
const JEUX = [
  { nom: 'A (WILLIS MEDINOVA, août → octobre 2026)', du: '01/08/2026', au: '05/10/2026', debut: '2026-08-01', fin: '2026-10-05', groupe: 20, libelle: 'WILLIS MEDINOVA' },
  { nom: 'B (tous les groupes, janvier 2026)', du: '01/01/2026', au: '31/01/2026', debut: '2026-01-01', fin: '2026-01-31', groupe: null }
];
const MODES = [
  { cle: 'facture', excel: '#releveExcelFacture', pdf: 0, fichier: 'releve_factures_groupe_par_facture.xlsx', libelle: 'par facture de groupe' },
  { cle: 'tierspayant', excel: '#releveExcelTiers', pdf: 1, fichier: 'releve_factures_groupe_par_tiers_payant.xlsx', libelle: 'par tiers payant' }
];

function lireExcel(f) {
  return JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', `import sys,json,openpyxl
ws=openpyxl.load_workbook(sys.argv[1]).active
print(json.dumps([[('' if c is None else (str(int(c)) if isinstance(c,(int,float)) and c==int(c) else str(c))) for c in r] for r in ws.iter_rows(values_only=True)]))`, f], { encoding: 'utf8', maxBuffer: 1 << 26 }));
}

/* lignes attendues dans le PDF (texte brut, une ligne par ligne du releve), a partir des lignes de l'Excel ; le texte
   extrait du PDF ramene les espaces multiples a un seul (« AMGS SA  SONAPIE » en base) : meme chose cote Excel */
const espaces = (s) => String(s || '').replace(/\s+/g, ' ').trim();
function attendu(ligne, mode) {
  const x = Object.assign({}, ligne);
  ['groupe', 'factureGroupe', 'facture', 'tiersPayant', 'periode', 'statut'].forEach((k) => { x[k] = espaces(x[k]); });
  const montants = ' ' + fmt(x.montant) + ' ' + fmt(x.regle) + ' ' + fmt(x.reste);
  if (x.nature === 'Facture') {
    const debut = mode === 'facture' ? x.facture + ' ' : x.facture + ' N° ' + x.factureGroupe + ' du ';
    return { nature: x.nature, test: (l) => l.startsWith(debut) && l.endsWith(x.periode + montants + ' ' + x.statut)
      && (mode === 'tierspayant' || x.tiersPayant.startsWith(l.slice(debut.length, l.length - (x.periode + montants + ' ' + x.statut).length - 1))), texte: debut + '… ' + x.periode + montants + ' ' + x.statut };
  }
  if (x.nature === 'Sous-total') {
    if (mode === 'facture') {
      const t = 'Sous-total Facture N° ' + x.factureGroupe + ' ' + x.facture + montants;
      return { nature: x.nature, test: (l) => l === t, texte: t };
    }
    /* le PDF coupe un nom d'organisme trop long dans la ligne de sous-total ; l'Excel le garde entier */
    const fin = ' ' + x.facture + montants;
    return { nature: x.nature, texte: 'Sous-total ' + x.tiersPayant + fin,
      test: (l) => { if (!l.startsWith('Sous-total ') || !l.endsWith(fin)) { return false; } const nom = l.slice(11, l.length - fin.length);
        return nom === x.tiersPayant || (nom.length >= 20 && x.tiersPayant.startsWith(nom)); } };
  }
  if (x.nature === 'Total groupe') {
    const t = 'TOTAL ' + x.groupe + ' ' + x.facture + montants;
    return { nature: x.nature, test: (l) => l === t, texte: t };
  }
  const t = 'TOTAL GÉNÉRAL (' + x.facture + ') Facturé ' + fmt(x.montant) + ' Réglé ' + fmt(x.regle) + ' Reste ' + fmt(x.reste);
  return { nature: x.nature, test: (l) => l === t, texte: t };
}

(async () => {
  let avant = null;
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = [], dialogues = [];
  p.on('pageerror', (e) => err.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'releve-groupe-'));
  const pdfs = [];
  try {
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    /* apres la connexion, qui est journalisee */
    avant = empreinte();
    await V.ouvrirMenu(p, 'FACTURATION', 'Factures Compagnies Ass');
    await p.waitForFunction(() => Ext.ComponentQuery.query('groupeInvoices').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    ok('Bouton « Relevé Excel » présent, avec ses deux sous-totaux', await p.evaluate(() => { const b = Ext.ComponentQuery.query('groupeInvoices #releveExcel')[0];
      return !!b && b.menu && b.menu.items.getCount() === 2; }));

    for (const jeu of JEUX) {
      console.log('\n--- Jeu ' + jeu.nom);
      await V.saisir(p, 'groupeInvoices #dt_start', jeu.du);
      await V.saisir(p, 'groupeInvoices #dt_end', jeu.au);
      if (jeu.groupe) {
        await V.cliquer(p, 'groupeInvoices #cmb_fact_GROUPECOMPAGNIES');
        await p.keyboard.press('Control+A');
        await p.keyboard.type(jeu.libelle.slice(0, 8), { delay: 30 });
        const item = p.locator('.x-boundlist-item').filter({ visible: true }).filter({ hasText: new RegExp('^\\s*' + jeu.libelle + '\\s*$') }).first();
        await item.waitFor({ timeout: 15000 });
        await item.click();
      } else {
        await p.evaluate(() => Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').clearValue());
      }
      const choisi = await p.evaluate(() => Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').getValue());
      ok('Jeu ' + jeu.nom + ' : groupe choisi à l\'écran', String(choisi || '') === String(jeu.groupe || ''), choisi);
      await V.cliquer(p, 'groupeInvoices button[text=rechercher]');
      await p.waitForFunction(() => { const s = Ext.getCmp('invoiceGRID').getStore(); return !s.isLoading(); }, null, { timeout: 30000 });
      await p.waitForTimeout(300);
      const liste = await p.evaluate(() => { const s = Ext.getCmp('invoiceGRID').getStore();
        return { total: s.getTotalCount(), lignes: s.getRange().map((r) => r.getData()) }; });
      const base = enBase(jeu.debut, jeu.fin, jeu.groupe);
      const nbBase = [...base.values()].reduce((a, v) => a + v.length, 0);
      ok('Jeu ' + jeu.nom + ' : précondition, factures en base', nbBase > 10, nbBase);

      for (const mode of MODES) {
        const ici = 'Jeu ' + jeu.nom.split(' ')[0] + ', ' + mode.libelle;
        /* Excel */
        const t0 = Date.now();
        await V.cliquer(p, 'groupeInvoices #releveExcel');
        const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), V.cliquer(p, 'menuitem' + mode.excel)]);
        const xlsx = path.join(dossier, jeu.debut + '-' + mode.cle + '.xlsx');
        await dl.saveAs(xlsx);
        const dExcel = Date.now() - t0;
        ok(ici + ' : Excel en moins de ' + PLAFOND_EXCEL_MS + ' ms', dExcel < PLAFOND_EXCEL_MS, dExcel + ' ms');
        ok(ici + ' : nom du fichier', dl.suggestedFilename() === mode.fichier, dl.suggestedFilename());
        const lu = lireExcel(xlsx);
        const entete = lu.findIndex((r) => r[0] === 'Ligne');
        ok(ici + ' : titre, période et sous-total rappelés', lu[0][0] === 'RELEVÉ DES FACTURES DE GROUPE'
          && lu.slice(0, entete).some((r) => r.join(' ').indexOf(jeu.du + ' au ' + jeu.au) >= 0)
          && lu.slice(0, entete).some((r) => r.join(' ').indexOf(mode.libelle) >= 0), JSON.stringify(lu.slice(0, entete)));
        const xl = lu.slice(entete + 1).filter((r) => r[0]).map((r) => ({ nature: r[0], groupe: r[1], factureGroupe: r[2], facture: r[3], tiersPayant: r[4], periode: r[5],
          montant: +r[6], regle: +r[7], reste: +r[8], statut: r[9] }));
        const fact = xl.filter((x) => x.nature === 'Facture');

        /* regles */
        let regles = true, detail = '';
        let bloc = [0, 0, 0], groupe = [0, 0, 0], general = [0, 0, 0], nbGroupe = 0;
        for (const x of xl) {
          if (x.montant - x.regle !== x.reste) { regles = false; detail = 'reste ' + JSON.stringify(x); }
          if (x.nature === 'Facture') { bloc = bloc.map((v, i) => v + [x.montant, x.regle, x.reste][i]); nbGroupe++; }
          if (x.nature === 'Sous-total') {
            if (bloc.join() !== [x.montant, x.regle, x.reste].join()) { regles = false; detail = 'sous-total ' + JSON.stringify(x) + ' / ' + bloc; }
            groupe = groupe.map((v, i) => v + bloc[i]); bloc = [0, 0, 0];
          }
          if (x.nature === 'Total groupe') {
            if (groupe.join() !== [x.montant, x.regle, x.reste].join() || x.facture !== nombre(nbGroupe, 'facture')) { regles = false; detail = 'groupe ' + JSON.stringify(x) + ' / ' + groupe; }
            general = general.map((v, i) => v + groupe[i]); groupe = [0, 0, 0]; nbGroupe = 0;
          }
          if (x.nature === 'Total général' && (general.join() !== [x.montant, x.regle, x.reste].join() || x.facture !== nombre(fact.length, 'facture'))) { regles = false; detail = 'général ' + JSON.stringify(x) + ' / ' + general; }
        }
        ok(ici + ' : règles (reste = facturé − réglé ; sous-totaux = leurs factures ; total du groupe = ses sous-totaux ; total général)', regles, detail);

        /* Excel / base */
        const vus = new Map();
        let egalBase = fact.length === nbBase, ecartBase = '';
        for (const x of fact) {
          const k = vus.get(x.facture) || 0; vus.set(x.facture, k + 1);
          const v = (base.get(x.facture) || [])[k];
          if (!v || v.join() !== [x.montant, x.regle, x.reste].join()) { egalBase = false; ecartBase = x.facture + ' : ' + [x.montant, x.regle, x.reste] + ' / base ' + v; }
        }
        ok(ici + ' : rapprochement Excel / base, facture par facture (montant, réglé, reste), aucune perdue ni en double', egalBase,
          fact.length + ' / ' + nbBase + ' ' + ecartBase);
        const reglees = fact.filter((x) => x.reste === 0 && x.montant > 0).length, partielles = fact.filter((x) => x.regle > 0 && x.reste > 0).length;
        console.log('       factures : ' + fact.length + ' (réglées ' + reglees + ', en partie ' + partielles + ') ; sous-totaux : ' + xl.filter((x) => x.nature === 'Sous-total').length
          + ' ; groupes : ' + xl.filter((x) => x.nature === 'Total groupe').length);

        /* Excel / ecran, jeu A : une ligne de la liste par facture de groupe */
        if (jeu.groupe && mode.cle === 'facture') {
          const st = xl.filter((x) => x.nature === 'Sous-total');
          const ecran = liste.lignes.map((r) => [String(r.CODEFACTURE), Math.round(+r.NBFACTURES), Math.round(+r.AMOUNT), Math.round(+r.AMOUNTPAYE), Math.round(+r.MONTANTRESTANT)].join('|')).sort();
          const xls = st.map((x) => [x.factureGroupe, parseInt(x.facture, 10), x.montant, x.regle, x.reste].join('|')).sort();
          ok(ici + ' : rapprochement Excel / écran, une ligne de la liste par facture de groupe (nombre, facturé, réglé, reste)',
            liste.total === st.length && JSON.stringify(ecran) === JSON.stringify(xls), liste.total + ' / ' + st.length + ' ' + ecran.slice(0, 2) + ' | ' + xls.slice(0, 2));
        }

        /* PDF, par le meme ecran */
        const t1 = Date.now();
        await V.cliquer(p, 'groupeInvoices button[text=Relevé]');
        const idItem = await p.evaluate((i) => Ext.ComponentQuery.query('groupeInvoices button[text=Relevé]')[0].menu.items.getAt(i).getId(), mode.pdf);
        const [rep, fenetre] = await Promise.all([ctx.waitForEvent('response', { predicate: (r) => /releveFactureGroupeServlet/.test(r.url()), timeout: 60000 }),
          ctx.waitForEvent('page', { timeout: 60000 }), p.click('#' + idItem)]);
        const dPdf = Date.now() - t1;
        ok(ici + ' : PDF en moins de ' + PLAFOND_PDF_MS + ' ms', dPdf < PLAFOND_PDF_MS, dPdf + ' ms');
        const fichier = editions.fichierEdition(rep.headers().location || '');
        await fenetre.close().catch(() => {});
        pdfs.push(fichier);
        const brut = fs.existsSync(fichier) ? execFileSync('pdftotext', ['-enc', 'UTF-8', '-raw', fichier, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }) : '';
        ok(ici + ' : PDF produit, mêmes critères que l\'Excel', /^%PDF/.test(fs.existsSync(fichier) ? fs.readFileSync(fichier).slice(0, 4).toString() : '')
          && new RegExp('PERIODE DU ' + jeu.du + ' AU ' + jeu.au).test(brut), path.basename(fichier));
        const lignesPdf = brut.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
        /* Excel -> PDF, dans l'ordre */
        let k = 0, ecart = '';
        for (const x of xl) {
          const a = attendu(x, mode.cle);
          while (k < lignesPdf.length && !a.test(lignesPdf[k])) { k++; }
          if (k >= lignesPdf.length) { ecart = 'absent du PDF (ou hors ordre) : ' + a.texte; break; }
          k++;
        }
        ok(ici + ' : rapprochement Excel / PDF, ligne par ligne, dans le même ordre (factures, sous-totaux, totaux)', !ecart, ecart);
        /* PDF -> Excel : rien de plus dans le PDF */
        const nbPdf = { f: lignesPdf.filter((l) => /^\S+ .* \d{2}\/\d{2}\/\d{4} - \d{2}\/\d{2}\/\d{4} [\d ]+ \D+$/.test(l) && !/^Sous-total|^TOTAL/.test(l)).length,
          st: lignesPdf.filter((l) => /^Sous-total /.test(l)).length, g: lignesPdf.filter((l) => /^TOTAL (?!GÉNÉRAL)/.test(l)).length };
        const nbXl = { f: fact.length, st: xl.filter((x) => x.nature === 'Sous-total').length, g: xl.filter((x) => x.nature === 'Total groupe').length };
        ok(ici + ' : autant de factures, de sous-totaux et de totaux de groupe dans le PDF que dans l\'Excel', JSON.stringify(nbPdf) === JSON.stringify(nbXl),
          JSON.stringify(nbPdf) + ' / ' + JSON.stringify(nbXl));
      }
    }

    ok('Bilan : rien n\'est écrit en base (factures, factures de groupe, journal, paramètres)', empreinte() === avant);
    ok('Aucune fenêtre surgissante', dialogues.length === 0 && await p.evaluate(() => !Ext.ComponentQuery.query('messagebox').some((w) => w.isVisible())), dialogues.join(' | '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    fs.rmSync(dossier, { recursive: true, force: true });
    pdfs.forEach((f) => { try { fs.unlinkSync(f); } catch (e) { /* deja retire */ } });
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
