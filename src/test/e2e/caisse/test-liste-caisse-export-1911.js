/* LISTE DE CAISSE ET VISUALISATION DE CAISSE : EXPORT CSV / EXCEL (plan du 19/11, point 15).
 *
 * Demande : « Ajouter exportation csv/excel sur le menu liste de caisse et visualisation de caisse ».
 *
 * Par l'ecran (GESTION COURANTE > Liste de Caisse, Visualiser la caisse), sur les mouvements du banc (lecture seule),
 * trois jeux d'essai :
 *  A. Liste de caisse, 27/10 -> 29/10/2026 : ventes comptant et assurance, reglements differes et de tiers payants,
 *     montants negatifs (une seule page) ;
 *  B. Liste de caisse, 12/09/2026 de 08:00 a 11:30 : 143 mouvements, 8 pages a l'ecran ;
 *  C. Visualiser la caisse, septembre 2026, type de reglement « Carte Bancaire » (filtre), 3 pages.
 * Pour chaque jeu, bouton « Exporter » > Excel puis > CSV :
 *  - export / ecran : chaque page de l'ecran parcourue a la souris ; chaque mouvement (type affiche, reference,
 *    operateur, client, date, heure, montant, detail des reglements de la ligne depliee) = sa ligne de l'export, dans
 *    le meme ordre ; totaux par mode de reglement = barre du bas de l'ecran ;
 *  - Excel = CSV, cellule par cellule ; criteres rappeles dans l'Excel ;
 *  - export / base : memes mouvements que MvtTransaction (reference, montant), aucun perdu ni en double ;
 *  - delais sous plafond ; bilan : rien n'est ecrit en base ; aucune fenetre surgissante ni erreur JavaScript.
 * La colonne Client est nominative : elle est comparee sans jamais etre affichee.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 1500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const PLAFOND_EXPORT_MS = 10000;
const EMPL = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const empreinte = () => q("SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM MvtTransaction), (SELECT COUNT(*) FROM t_preenregistrement), (SELECT COUNT(*) FROM vente_reglement),"
  + " (SELECT COUNT(*) FROM t_event_log), (SELECT MD5(GROUP_CONCAT(str_KEY, '=', IFNULL(str_VALUE, '') ORDER BY str_KEY)) FROM t_parameters))");
/* mouvements en base, comme le service les choisit : emplacement, hors achats, heure de creation dans la plage, reglement */
const enBase = (j) => q(`SELECT CONCAT_WS('#', m.reference, CASE WHEN m.typeMvtCaisseId IN ('8', '9') THEN m.montantRegle ELSE m.montant END) FROM MvtTransaction m`
  + ` WHERE m.lg_EMPLACEMENT_ID = '${EMPL}' AND m.typeTransaction <> 2 AND m.createdAt BETWEEN '${j.debut} ${j.de}:00' AND '${j.fin} ${j.a}:00'`
  + (j.reglementId ? ` AND m.pkey IN (SELECT r.vente_id FROM vente_reglement r WHERE r.type_regelement = '${j.reglementId}')` : '')
  + ' ORDER BY m.createdAt').split('\n').filter(Boolean).sort();
const JEUX = [
  { nom: 'A', titre: 'Liste de caisse, 27/10 → 29/10/2026', menu: 'Liste de Caisse', xtype: 'listecaissemanager', grille: 'listeCaisseGrid', ecran: 'liste',
    du: '27/10/2026', au: '29/10/2026', de: '00:00', a: '23:59', debut: '2026-10-27', fin: '2026-10-29' },
  { nom: 'B', titre: 'Liste de caisse, 12/09/2026 08:00 → 11:30 (plusieurs pages)', menu: 'Liste de Caisse', xtype: 'listecaissemanager', grille: 'listeCaisseGrid', ecran: 'liste',
    du: '12/09/2026', au: '12/09/2026', de: '08:00', a: '11:30', debut: '2026-09-12', fin: '2026-09-12' },
  { nom: 'C', titre: 'Visualiser la caisse, septembre 2026, Carte Bancaire', menu: 'Visualiser la caisse', xtype: 'visualisercaissemanager', grille: 'visualisationGrid', ecran: 'visualisation',
    du: '01/09/2026', au: '30/09/2026', de: '00:00', a: '23:59', debut: '2026-09-01', fin: '2026-09-30', reglement: 'Carte Bancaire', reglementId: '3' },
  /* un mois entier, sans filtre : l'ecran n'en est compare que sur sa premiere page et ses totaux, la base en entier */
  { nom: 'D', titre: 'Liste de caisse, septembre 2026 entier (premiere page)', menu: 'Liste de Caisse', xtype: 'listecaissemanager', grille: 'listeCaisseGrid', ecran: 'liste',
    du: '01/09/2026', au: '30/09/2026', de: '00:00', a: '23:59', debut: '2026-09-01', fin: '2026-09-30', premierePage: true }
];
const esp = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const entier = (t) => { const s = String(t || '').replace(/[^\d-]/g, ''); return s === '' || s === '-' ? 0 : Number(s); };
/* detail des reglements : a l'ecran une ligne « Especes  5 000 » par reglement ; dans l'export « Especes : 5000 | ... » */
const pairesEcran = (spans) => { const r = []; for (let k = 0; k + 1 < spans.length; k += 2) { r.push([esp(spans[k]), entier(spans[k + 1])]); } return r; };
const pairesExport = (t) => String(t || '').split(' | ').filter((x) => x.trim()).map((x) => { const m = /^(.*) : (-?\d+)$/.exec(x); return m ? [esp(m[1]), Number(m[2])] : [esp(x), null]; });

function lireExcel(f) {
  return JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', `import sys,json,openpyxl
ws=openpyxl.load_workbook(sys.argv[1]).active
print(json.dumps([[('' if c is None else (str(int(c)) if isinstance(c,(int,float)) and c==int(c) else str(c))) for c in r] for r in ws.iter_rows(values_only=True)]))`, f], { encoding: 'utf8', maxBuffer: 1 << 26 }));
}
function lireCsv(f) {
  return JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', `import sys,json,csv
with open(sys.argv[1], encoding='utf-8-sig', newline='') as h:
    print(json.dumps([r for r in csv.reader(h, delimiter=';')]))`, f], { encoding: 'utf8', maxBuffer: 1 << 26 }));
}

(async () => {
  let avant = null;
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = [], dialogues = [];
  p.on('pageerror', (e) => err.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'liste-caisse-'));
  try {
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    avant = empreinte();
    for (const j of JEUX) {
      console.log('\n--- Jeu ' + j.nom + ' : ' + j.titre);
      /* ecran deja ouvert (jeu precedent) : on reste dessus ; sinon par le menu */
      if (!await p.evaluate((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), j.xtype)) { await V.ouvrirMenu(p, 'GESTION COURANTE', j.menu); }
      /* le volet du menu, s'il est reste deplie, se replie quand la souris le quitte */
      await p.mouse.move(1200, 600); await p.waitForTimeout(800);
      await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), j.xtype, { timeout: 60000 });
      const sel = j.xtype + '{isVisible(true)}';
      ok('Jeu ' + j.nom + ' : bouton « Exporter » (Excel, CSV) présent', await p.evaluate((s) => { const b = Ext.ComponentQuery.query(s + ' #exporter')[0];
        return !!b && b.menu && b.menu.items.getCount() === 2; }, sel));
      await V.saisir(p, sel + ' #startDate', j.du);
      await V.saisir(p, sel + ' #endDate', j.au);
      await V.saisir(p, sel + ' #startH', j.de);
      await V.saisir(p, sel + ' #endH', j.a);
      if (j.reglement) { await V.choisir(p, sel + ' #reglement', j.reglement); }
      await V.cliquer(p, sel + ' #rechercher');
      const grille = sel + ' ' + j.grille;
      const charge = () => p.waitForFunction((g) => { const x = Ext.ComponentQuery.query(g)[0]; return x && !x.getStore().isLoading(); }, grille, { timeout: 60000 });
      await charge(); await p.waitForTimeout(400);

      /* toutes les pages de l'ecran, a la souris */
      const ecran = [];
      let pages = 0;
      for (;;) {
        pages++;
        const page = await p.evaluate((g) => { const x = Ext.ComponentQuery.query(g)[0]; const v = x.getView();
          const cols = x.columns.filter((c) => !c.hidden && c.dataIndex).map((c) => c.dataIndex);
          return x.getStore().getRange().map((r, i) => { const n = v.getNode(i); const cells = [...n.querySelectorAll('td.x-grid-cell')].filter((td) => td.offsetParent !== null || true);
            const valeurs = {}; x.columns.filter((c) => !c.hidden && c.dataIndex).forEach((c) => { const td = n.querySelector('td.x-grid-cell-' + c.getItemId() + ', td.x-grid-cell-' + c.id); valeurs[c.dataIndex] = td ? td.innerText.trim() : null; });
            let corps = n.nextElementSibling;
            if (!(corps && /rowbody/.test(corps.className))) { corps = n.querySelector('.x-grid-rowbody'); }
            /* ligne depliee : un span pour le mode, un span pour le montant, par reglement */
            const detail = corps ? [...corps.querySelectorAll('span')].map((x) => x.innerText.trim()) : [];
            return { valeurs, detail, cols: cols.length, cellules: cells.length }; }); }, grille);
        ecran.push(...page);
        const suivant = await p.evaluate((g) => { const t = Ext.ComponentQuery.query(g + ' pagingtoolbar')[0]; const n = t.down('#next'); return n && !n.isDisabled() ? n.getId() : null; }, grille);
        if (!suivant || j.premierePage) { break; }
        await p.click('#' + suivant);
        await charge(); await p.waitForTimeout(300);
      }
      const totalEcran = await p.evaluate((g) => Ext.ComponentQuery.query(g)[0].getStore().getTotalCount(), grille);
      const barre = await p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; const b = c.getDockedItems('#caisseTotauxBar')[0]; return b ? b.getEl().dom.innerText : ''; }, sel);
      const totauxEcran = (barre.match(/[^:\n]+:\s*-?[\d\s  .,]+/g) || []).map((x) => { const i = x.lastIndexOf(':'); return [x.slice(0, i).trim(), entier(x.slice(i + 1))]; });
      const base = enBase(j);
      ok('Jeu ' + j.nom + ' : écran parcouru ' + (j.premierePage ? '(première page)' : 'en entier (' + pages + ' page(s))') + ', total = base', (j.premierePage || ecran.length === totalEcran) && totalEcran === base.length && ecran.length > 0,
        ecran.length + ' lignes / total ' + totalEcran + ' / base ' + base.length);

      for (const format of ['xlsx', 'csv']) {
        const ici = 'Jeu ' + j.nom + ', ' + (format === 'xlsx' ? 'Excel' : 'CSV');
        const t0 = Date.now();
        await V.cliquer(p, sel + ' #exporter');
        const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), V.cliquer(p, 'menuitem#' + (format === 'xlsx' ? 'exporterExcel' : 'exporterCsv') + '{isVisible(true)}')]);
        const f = path.join(dossier, j.nom + '.' + format);
        await dl.saveAs(f);
        const d = Date.now() - t0;
        ok(ici + ' : fichier en moins de ' + PLAFOND_EXPORT_MS + ' ms', d < PLAFOND_EXPORT_MS, d + ' ms');
        const nomAttendu = (j.ecran === 'visualisation' ? 'visualisation_caisse_' : 'liste_caisse_') + j.debut + '_' + j.fin + '.' + format;
        ok(ici + ' : nom du fichier', dl.suggestedFilename() === nomAttendu, dl.suggestedFilename());
        let lignes;
        if (format === 'xlsx') {
          const lu = lireExcel(f);
          const e = lu.findIndex((r) => r[0] === 'Ligne');
          const tete = lu.slice(0, e).map((r) => r.join(' ')).join(' | ');
          ok(ici + ' : titre et critères (période, heures' + (j.reglement ? ', type de règlement' : '') + ')',
            lu[0][0] === (j.ecran === 'visualisation' ? 'VISUALISATION DE LA CAISSE' : 'LISTE DE CAISSE') && tete.indexOf('du ' + j.du + ' ' + j.de + ' au ' + j.au + ' ' + j.a) >= 0
            && (!j.reglement || tete.indexOf('Type de règlement : ' + j.reglement) >= 0), tete);
          lignes = lu.slice(e + 1).filter((r) => r[0]);
          j.excel = lignes;
        } else {
          const lu = lireCsv(f);
          ok(ici + ' : en-tête du CSV', lu[0].join(';') === 'Ligne;Type mouvement;Référence;Opérateur;Client;Date;Heure;Montant;Règlements', lu[0].join(';'));
          lignes = lu.slice(1);
          ok('Jeu ' + j.nom + ' : CSV = Excel, cellule par cellule', JSON.stringify(lignes) === JSON.stringify(j.excel), lignes.length + ' / ' + (j.excel || []).length);
        }
        const mvts = lignes.filter((r) => r[0] === 'Mouvement');
        const tot = lignes.filter((r) => r[0] === 'Total').map((r) => [r[1], entier(r[7])]);
        /* export / ecran, ligne par ligne (client compare sans etre affiche) */
        let ecart = '';
        if (mvts.length !== (j.premierePage ? totalEcran : ecran.length)) { ecart = mvts.length + ' lignes exportées / ' + ecran.length + ' à l\'écran'; }
        for (let i = 0; !ecart && i < ecran.length; i++) {
          const s = ecran[i].valeurs, x = mvts[i];
          const champs = [['type', s.typeMouvement, x[1]], ['référence', s.reference, x[2]], ['opérateur', s.operateur, x[3]], ['date', s.taskDate, x[5]], ['heure', s.taskHeure, x[6]]];
          for (const [nom, a, bb] of champs) { if (esp(a) !== esp(bb)) { ecart = 'ligne ' + (i + 1) + ' ' + nom + ' : écran « ' + a + ' » / export « ' + bb + ' »'; break; } }
          /* l'ecran (HTML) ramene les espaces multiples a un seul : comparaison a espaces normalises */
          if (!ecart && esp(s.client) !== esp(x[4])) { ecart = 'ligne ' + (i + 1) + ' : client différent (non affiché ; longueurs ' + esp(s.client).length + ' / ' + esp(x[4]).length + ')'; }
          if (!ecart && entier(s.montant) !== entier(x[7])) { ecart = 'ligne ' + (i + 1) + ' montant : ' + s.montant + ' / ' + x[7]; }
          if (!ecart && JSON.stringify(pairesEcran(ecran[i].detail)) !== JSON.stringify(pairesExport(x[8]))) { ecart = 'ligne ' + (i + 1) + ' règlements : ' + JSON.stringify(pairesEcran(ecran[i].detail)) + ' / ' + JSON.stringify(pairesExport(x[8])); }
        }
        ok(ici + ' : rapprochement export / écran' + (j.premierePage ? ' (première page)' : '') + ', mouvement par mouvement, dans l\'ordre (type, référence, opérateur, client, date, heure, montant, règlements)', !ecart, ecart);
        ok(ici + ' : totaux par mode de règlement = barre du bas de l\'écran', JSON.stringify(tot) === JSON.stringify(totauxEcran) && tot.length > 0, JSON.stringify(tot) + ' / ' + JSON.stringify(totauxEcran));
        const exp = mvts.map((r) => r[2] + '#' + entier(r[7])).sort();
        ok(ici + ' : rapprochement export / base (référence, montant), aucun mouvement perdu ni en double', JSON.stringify(exp) === JSON.stringify(base),
          exp.length + ' / ' + base.length + ' ' + exp.filter((x, i) => x !== base[i]).slice(0, 2));
        if (format === 'xlsx') {
          const types = [...new Set(mvts.map((r) => r[1]))];
          console.log('       mouvements : ' + mvts.length + ' ; types : ' + types.join(', ') + ' ; montants négatifs : ' + mvts.filter((r) => entier(r[7]) < 0).length
            + ' ; avec plusieurs règlements : ' + mvts.filter((r) => (r[8] || '').indexOf('|') >= 0).length + ' ; totaux : ' + tot.length);
        }
      }
    }
    ok('Bilan : rien n\'est écrit en base (mouvements, ventes, règlements, journal, paramètres)', empreinte() === avant);
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
