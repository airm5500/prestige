/* RETOUR DU 22/11, FACTURATION > FACTURES : selecteur de groupe de tiers payant, bouton Rechercher apres la recherche,
 * champ periode plus court, icones de « Supprimer la sélection » et « Relevé FNE », colonnes renommees et en couleur.
 *
 * Par le vrai menu (FACTURATION > Factures), en 1366×768 :
 *  - barre : Rechercher juste apres le champ de recherche ; selecteur de groupe avant le tiers payant ; champ periode
 *    de 190 a 215 px (il prenait la place des deux anciens champs) ;
 *  - icones : « Supprimer la sélection » et « Relevé FNE » portent une image dessinee, chargee ;
 *  - colonnes : « NUMERO » et « BONS » (plus « Code Facture » ni « Nombre de Dossiers ») ; numero, organisme, periode et
 *    date en gras ; montant brut bleu gras, paye vert gras, restant rouge gras ;
 *  - rapprochement, groupe choisi au clavier dans sa liste, sur une periode : total de la liste = factures du groupe en
 *    base (memes regles : modeles exclus, date de creation dans la periode), chaque ligne d'un tiers payant du groupe ;
 *    liste des tiers payants = tiers payants actifs du groupe en base ; export Excel = memes factures (numeros) ; releve
 *    imprime (PDF) = memes numeros ;
 *  - compatibilite : un tiers payant du groupe reste choisi quand on choisit le groupe ; un tiers payant d'un autre
 *    groupe est retire ; groupe vide = toutes les factures de la periode (total = base) ;
 *  - bilan : aucune ecriture (t_facture inchangee), aucune fenetre surgissante, aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const editions = require('../support/editions');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const DU = '2025-01-01';
const auj = new Date(); const AU = auj.getFullYear() + '-' + String(auj.getMonth() + 1).padStart(2, '0') + '-' + String(auj.getDate()).padStart(2, '0');
const fr = (d) => d.split('-').reverse().join('/');
const FACTURES = (filtre) => `FROM t_facture t WHERE (t.template <> 1 OR t.template IS NULL) AND t.dt_CREATED >= '${DU} 00:00:00' AND t.dt_CREATED <= '${AU} 23:59:00' ${filtre || ''}`;
function lireClasseur(f) {
  const debut = fs.readFileSync(f).slice(0, 2).toString();
  if (debut === 'PK') {
    return JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', `import sys,json,openpyxl
ws=openpyxl.load_workbook(sys.argv[1]).active
print(json.dumps([[('' if c is None else str(c)) for c in r] for r in ws.iter_rows(values_only=True)]))`, f], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  }
  return JSON.parse(execFileSync('python', ['-X', 'utf8', path.join(__dirname, '..', 'outils', 'lire_xls.py'), f], { encoding: 'utf8', maxBuffer: 1 << 26 }))[0].lignes.map((l) => l.map(String));
}

(async () => {
  /* groupe d'essai : le plus fourni en factures sur la periode, avec au moins 2 tiers payants factures */
  const g = lignes(`SELECT tp.lg_GROUPE_ID, gr.str_LIBELLE, COUNT(*), COUNT(DISTINCT t.str_CUSTOMER) ${FACTURES()}`.replace('FROM t_facture t', 'FROM t_facture t JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = t.str_CUSTOMER JOIN t_groupe_tierspayant gr ON gr.lg_GROUPE_ID = tp.lg_GROUPE_ID')
    + ' GROUP BY tp.lg_GROUPE_ID, gr.str_LIBELLE HAVING COUNT(DISTINCT t.str_CUSTOMER) >= 2 ORDER BY COUNT(*) DESC LIMIT 1')[0];
  if (!g) { ok('Jeu d\'essai : un groupe de tiers payants avec des factures sur la période', false); process.exit(1); }
  const [GID, GNOM] = g;
  const DANS_G = `AND t.str_CUSTOMER IN (SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE lg_GROUPE_ID = ${GID})`;
  const nGroupe = Number(q(`SELECT COUNT(*) ${FACTURES(DANS_G)}`));
  const nTous = Number(q(`SELECT COUNT(*) ${FACTURES()}`));
  const codesGroupe = q(`SELECT t.str_CODE_FACTURE ${FACTURES(DANS_G)}`).split('\n').filter(Boolean).sort();
  const tpsGroupe = lignes(`SELECT lg_TIERS_PAYANT_ID, str_FULLNAME FROM t_tiers_payant WHERE lg_GROUPE_ID = ${GID} AND str_STATUT = 'enable'`);
  const nomsGroupe = new Set(lignes(`SELECT str_FULLNAME FROM t_tiers_payant WHERE lg_GROUPE_ID = ${GID}`).map((x) => x[0]));
  /* un tiers payant du groupe avec des factures, et un d'un autre groupe */
  const tpDedans = lignes(`SELECT tp.lg_TIERS_PAYANT_ID, tp.str_FULLNAME ${FACTURES(DANS_G)}`.replace('FROM t_facture t', 'FROM t_facture t JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = t.str_CUSTOMER') + ` AND tp.str_STATUT = 'enable' GROUP BY tp.lg_TIERS_PAYANT_ID ORDER BY COUNT(*) DESC LIMIT 1`)[0];
  const tpDehors = lignes(`SELECT tp.lg_TIERS_PAYANT_ID, tp.str_FULLNAME FROM t_tiers_payant tp WHERE tp.str_STATUT = 'enable' AND (tp.lg_GROUPE_ID IS NULL OR tp.lg_GROUPE_ID <> ${GID})`
    + ` AND tp.str_FULLNAME NOT IN (SELECT str_FULLNAME FROM t_tiers_payant WHERE lg_GROUPE_ID = ${GID}) AND EXISTS (SELECT 1 ${FACTURES('AND t.str_CUSTOMER = tp.lg_TIERS_PAYANT_ID')}) LIMIT 1`)[0];
  const factures0 = q('SELECT COUNT(*), COALESCE(SUM(dbl_MONTANT_RESTANT), 0), MAX(dt_UPDATED) FROM t_facture');
  console.log(`groupe ${GID} ${GNOM} : ${nGroupe} factures sur ${nTous} ; ${tpsGroupe.length} tiers payants actifs`);

  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'facture-groupe-'));
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await V.ouvrirMenu(p, 'FACTURATION', 'Factures');
    await p.waitForFunction(() => Ext.ComponentQuery.query('facturemanager').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('facturemanager')[0]; return g && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(2500);

    /* barre : ordre, largeur du champ periode */
    const barre = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('facturemanager')[0], rech = Ext.getCmp('rechecherFacture'), t = rech.ownerCt, items = t.items.items;
      const visibles = items.filter((x) => x.isVisible());
      const i = visibles.indexOf(rech), suivant = visibles[i + 1];
      const groupe = Ext.getCmp('groupeFacture'), tp = Ext.getCmp('lg_TIERS_PAYANT_ID');
      const per = Ext.getCmp('datefin').champPeriode;
      return { suivant: suivant ? (suivant.itemId || suivant.id) + ' ' + (suivant.text || '') : null, groupe: !!groupe && groupe.isVisible(true),
        groupeAvantTp: !!groupe && visibles.indexOf(groupe) >= 0 && visibles.indexOf(groupe) < visibles.indexOf(tp),
        largeurPeriode: per ? per.getWidth() : null, deborde: t.layout.innerCt.dom.scrollWidth > t.getEl().dom.clientWidth + 2 };
    });
    ok('Barre : « Rechercher » juste après le champ de recherche', /^btnRechercherFactures rechercher$/i.test(barre.suivant), barre.suivant);
    ok('Barre : sélecteur de groupe de tiers payant visible, avant le tiers payant', barre.groupe && barre.groupeAvantTp, JSON.stringify(barre));
    ok('Barre : champ période de 190 à 215 px (il prenait la place des deux anciens champs), barre sans débordement',
      barre.largeurPeriode >= 190 && barre.largeurPeriode <= 215 && !barre.deborde, JSON.stringify(barre));

    /* icones */
    const icones = await p.evaluate(async () => {
      const g = Ext.ComponentQuery.query('facturemanager')[0], out = {};
      for (const [cle, bt] of [['supprimer', Ext.getCmp('btnSupprimerSelectionFacture')], ['fne', g.query('button').find((x) => /Relev(é|&eacute;) FNE/.test(x.text || ''))]]) {
        if (!bt) { out[cle] = { absent: true }; continue; }
        const temoin = Ext.create('Ext.button.Button', { text: 'T', iconCls: bt.iconCls, renderTo: Ext.getBody(), style: 'position:absolute;left:-500px' });
        const bg = getComputedStyle(temoin.btnIconEl.dom).backgroundImage, m = /^url\("?(.*?)"?\)$/.exec(bg);
        const charge = m ? await new Promise((ok) => { const i = new Image(); i.onload = () => ok(true); i.onerror = () => ok(false); i.src = m[1]; }) : false;
        temoin.destroy();
        out[cle] = { iconCls: bt.iconCls || '', svg: /data:image\/svg\+xml/.test(bg), charge, visible: bt.isVisible(true) };
      }
      return out;
    });
    ok('« Supprimer la sélection » : icône dessinée (ic7-supprimer), chargée', icones.supprimer && /ic7-supprimer/.test(icones.supprimer.iconCls) && icones.supprimer.svg && icones.supprimer.charge, JSON.stringify(icones.supprimer));
    ok('« Relevé FNE » : icône dessinée (ic7-fne), chargée', icones.fne && /ic7-fne/.test(icones.fne.iconCls) && icones.fne.svg && icones.fne.charge, JSON.stringify(icones.fne));

    /* periode d'essai */
    await V.saisirPeriode(p, 'facturemanager #datefin', fr(DU), fr(AU));
    await Promise.all([p.waitForResponse((r) => /facture-tiers-payant\/list/.test(r.url()) && r.url().indexOf(DU) >= 0, { timeout: 60000 }), V.cliquer(p, 'facturemanager #btnRechercherFactures')]);
    await p.waitForTimeout(800);

    /* colonnes et styles */
    const cols = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('facturemanager')[0], v = g.getView(), entetes = g.headerCt.getGridColumns().filter((c) => !c.hidden).map((c) => c.text);
      const row = v.getNode(g.getStore().findBy((r) => r.get('str_STATUT') !== 'avoir'));
      const style = (di) => { const c = g.headerCt.getGridColumns().find((x) => x.dataIndex === di); if (!c || !row) { return null; }
        const td = row.querySelector('.x-grid-cell-' + c.getId()), s = td && (td.querySelector('.facture-gras') || td.querySelector('.x-grid-cell-inner'));
        const cs = s ? getComputedStyle(s) : null; return cs ? { gras: Number(cs.fontWeight) >= 700 || cs.fontWeight === 'bold', couleur: cs.color } : null; };
      return { entetes, numero: style('str_CODE_FACTURE'), organisme: style('str_CUSTOMER_NAME'), periode: style('str_PERIODE'), date: style('dt_CREATED'),
        brut: style('MONTANTBRUT'), paye: style('dbl_MONTANT_PAYE'), restant: style('dbl_MONTANT_RESTANT'), bons: style('int_NB_DOSSIER') };
    });
    ok('Colonnes « NUMERO » et « BONS » ; plus « Code Facture » ni « Nombre de Dossiers »', cols.entetes.includes('NUMERO') && cols.entetes.includes('BONS')
      && !cols.entetes.some((t) => /Code Facture|Nombre de Dossiers/i.test(t)), cols.entetes.join(' | '));
    ok('Numéro, organisme, période et date de facture en gras', ['numero', 'organisme', 'periode', 'date'].every((k) => cols[k] && cols[k].gras), JSON.stringify(cols));
    ok('Montant brut bleu gras, payé vert gras, restant rouge gras', cols.brut && cols.brut.gras && cols.brut.couleur === 'rgb(21, 101, 192)'
      && cols.paye && cols.paye.gras && cols.paye.couleur === 'rgb(46, 125, 50)' && cols.restant && cols.restant.gras && cols.restant.couleur === 'rgb(198, 40, 40)',
      JSON.stringify({ brut: cols.brut, paye: cols.paye, restant: cols.restant }));

    const etatListe = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('facturemanager')[0], st = g.getStore();
      return { total: st.getTotalCount(), organismes: st.getRange().map((r) => r.get('str_CUSTOMER_NAME')), tp: Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() || null,
        groupe: Ext.getCmp('groupeFacture').getValue(), tps: Ext.getCmp('lg_TIERS_PAYANT_ID').getStore().getRange().map((r) => r.get('lg_TIERS_PAYANT_ID')) }; });
    const choisirGroupe = async () => {
      const id = await p.evaluate(() => Ext.getCmp('groupeFacture').inputEl.dom.id);
      await p.click('#' + id); await p.keyboard.press('Control+A'); await p.keyboard.type(GNOM.slice(0, Math.min(GNOM.length, 6)), { delay: 40 });
      const picker = await p.evaluate(() => Ext.getCmp('groupeFacture').getPicker().getId());
      const item = p.locator('#' + picker + ' .x-boundlist-item').filter({ hasText: new RegExp('^\\s*' + GNOM.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$') }).first();
      await item.waitFor({ timeout: 15000 });
      const [rep] = await Promise.all([p.waitForResponse((r) => /facture-tiers-payant\/list/.test(r.url()) && /groupe=\d+/.test(r.url()), { timeout: 60000 }).catch(() => null), item.click()]);
      await p.waitForTimeout(800);
      return rep;
    };
    const choisirTp = async (nom) => {
      const id = await p.evaluate(() => Ext.getCmp('lg_TIERS_PAYANT_ID').inputEl.dom.id);
      await p.click('#' + id); await p.keyboard.press('Control+A'); await p.keyboard.type(nom.slice(0, 8), { delay: 40 });
      const picker = await p.evaluate(() => Ext.getCmp('lg_TIERS_PAYANT_ID').getPicker().getId());
      const item = p.locator('#' + picker + ' .x-boundlist-item').filter({ hasText: nom }).first();
      await item.waitFor({ timeout: 15000 });
      await Promise.all([p.waitForResponse((r) => /facture-tiers-payant\/list/.test(r.url()), { timeout: 60000 }).catch(() => null), item.click()]);
      await p.waitForTimeout(800);
    };

    /* rapprochement groupe */
    const rep = await choisirGroupe();
    const e1 = await etatListe();
    ok(`Groupe « ${GNOM} » choisi : requête avec le groupe ${GID}`, rep && new URL(rep.url()).searchParams.get('groupe') === GID, rep && rep.url().replace(/^.*\/prestige\//, ''));
    ok(`Rapprochement : total de la liste = factures du groupe en base (${nGroupe})`, e1.total === nGroupe, e1.total + ' / ' + nGroupe);
    const horsGroupe = e1.organismes.filter((o) => !nomsGroupe.has(o));
    ok('Chaque ligne affichée est d\'un tiers payant du groupe', e1.organismes.length > 0 && horsGroupe.length === 0, horsGroupe.slice(0, 5).join(' | '));
    const attendusTp = tpsGroupe.map((x) => x[0]).sort();
    ok(`Liste des tiers payants = tiers payants actifs du groupe en base (${attendusTp.length})`, JSON.stringify(e1.tps.slice().sort()) === JSON.stringify(attendusTp), e1.tps.length + ' / ' + attendusTp.length);

    /* export Excel */
    const exp = await p.evaluate(() => Ext.ComponentQuery.query('facturemanager')[0].query('button').find((x) => x.text === 'Exporter').getId());
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }).catch(() => null), p.click('#' + exp)]);
    let codesExport = null;
    if (dl) {
      const f = path.join(dossier, 'export' + path.extname(dl.suggestedFilename() || '.xls')); await dl.saveAs(f);
      /* une ligne d'en-tete par facture (numero en colonne 1, « Du … Au … » en colonne 3), puis ses bons : on ne lit
       * le numero que sur les lignes de facture (les montants des bons peuvent ressembler a un numero) */
      const numeros = lireClasseur(f).filter((l) => /^Du \d/.test(String(l[2] || ''))).map((l) => String(l[0]).trim());
      codesExport = codesGroupe.filter((c) => numeros.includes(c));
      ok(`Export Excel : les ${nGroupe} factures du groupe, et seulement elles`, dl.url().indexOf('groupe=' + GID) >= 0 && codesExport.length === codesGroupe.length
        && numeros.length === codesGroupe.length, `${codesExport.length}/${codesGroupe.length} codes ; ${numeros.length} factures ; ${dl.url().replace(/^.*\/prestige\//, '')}`);
      const autres = q(`SELECT t.str_CODE_FACTURE ${FACTURES('AND t.str_CUSTOMER NOT IN (SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE lg_GROUPE_ID = ' + GID + ')')} LIMIT 200`).split('\n').filter(Boolean);
      const intrus = autres.filter((c) => numeros.includes(c));
      ok('Export Excel : aucune facture d\'un autre groupe', intrus.length === 0, intrus.slice(0, 5).join(' | '));
    } else { ok('Export Excel téléchargé', false); }

    /* releve imprime : meme filtre (sans tiers payant : tout le groupe) */
    const url = await p.evaluate(() => { let u = null; const w = window.open; window.open = (x) => { u = x; return null; };
      try { Ext.ComponentQuery.query('facturemanager')[0].onPrint(); } finally { window.open = w; } return u; });
    /* la servlet renvoie vers le fichier produit dans le dossier des editions : on le lit sur le disque, comme le test
     * du releve des groupes (facturation/test-releve-groupe-excel-1911.js) */
    const pdf = await ctx.request.get(new URL(url, p.url()).href, { timeout: 180000, maxRedirects: 0 });
    const fpdf = editions.fichierEdition(pdf.headers().location || '');
    const corpsPdf = fs.existsSync(fpdf) ? fs.readFileSync(fpdf) : Buffer.from('');
    const estPdf = corpsPdf.slice(0, 4).toString() === '%PDF';
    ok('Relevé imprimé : un PDF est produit', pdf.status() === 302 && estPdf, pdf.status() + ' ' + (pdf.headers().location || '') + ' ; ' + url);
    const texte = estPdf ? execFileSync('pdftotext', ['-layout', fpdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }) : '';
    const manquants = codesGroupe.filter((c) => texte.indexOf(c) < 0);
    ok(`Relevé imprimé : requête avec le groupe, tous les numéros du groupe (${codesGroupe.length})`, /groupe=\d+/.test(url) && manquants.length === 0, manquants.length + ' manquants : ' + manquants.slice(0, 5).join(' | ') + ' ; ' + url);

    /* compatibilite avec le tiers payant */
    await choisirTp(tpDedans[1]);
    const e2 = await etatListe();
    const nTp = Number(q(`SELECT COUNT(*) ${FACTURES(DANS_G + " AND t.str_CUSTOMER = '" + tpDedans[0] + "'")}`));
    ok(`Groupe + tiers payant du groupe (${tpDedans[1]}) : total = factures de ce tiers payant en base (${nTp})`, e2.tp === tpDedans[0] && e2.total === nTp, JSON.stringify({ tp: e2.tp, total: e2.total }));
    /* groupe vide : retour a tous */
    const idg = await p.evaluate(() => Ext.getCmp('groupeFacture').inputEl.dom.id);
    await p.click('#' + idg); await p.keyboard.press('Control+A');
    await Promise.all([p.waitForResponse((r) => /facture-tiers-payant\/list/.test(r.url()) && !/groupe=\d/.test(r.url()), { timeout: 60000 }).catch(() => null), p.keyboard.press('Delete')]);
    await p.keyboard.press('Escape'); await p.waitForTimeout(1200);
    const e3 = await etatListe();
    ok('Groupe effacé : le tiers payant reste, la liste des tiers payants redevient complète', e3.tp === tpDedans[0] && e3.tps.length > attendusTp.length, JSON.stringify({ tp: e3.tp, tps: e3.tps.length }));
    /* tiers payant d'un autre groupe, puis le groupe : le tiers payant est retire */
    if (tpDehors) {
      await choisirTp(tpDehors[1]);
      const rep2 = await choisirGroupe();
      const e4 = await etatListe();
      ok(`Tiers payant d'un autre groupe (${tpDehors[1]}) puis groupe : tiers payant retiré, total = factures du groupe (${nGroupe})`, rep2 && e4.tp === null && e4.total === nGroupe, JSON.stringify({ tp: e4.tp, total: e4.total }));
    } else { ok('Jeu d\'essai : un tiers payant d\'un autre groupe', false); }
    /* tout effacer : toutes les factures de la periode */
    await p.evaluate(() => { Ext.getCmp('lg_TIERS_PAYANT_ID').clearValue(); });
    await p.click('#' + idg); await p.keyboard.press('Control+A');
    await Promise.all([p.waitForResponse((r) => /facture-tiers-payant\/list/.test(r.url()) && !/groupe=\d/.test(r.url()), { timeout: 60000 }).catch(() => null), p.keyboard.press('Delete')]);
    await p.keyboard.press('Escape'); await p.waitForTimeout(1200);
    const e5 = await etatListe();
    ok(`Sans groupe ni tiers payant : total = toutes les factures de la période en base (${nTous})`, e5.total === nTous, e5.total + ' / ' + nTous);

    const fenetres = await p.evaluate(() => Ext.ComponentQuery.query('messagebox').filter((x) => x.isVisible()).length);
    ok('Aucune fenêtre surgissante', fenetres === 0, fenetres);
    ok('Bilan : aucune écriture (factures inchangées)', q('SELECT COUNT(*), COALESCE(SUM(dbl_MONTANT_RESTANT), 0), MAX(dt_UPDATED) FROM t_facture') === factures0);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    fs.rmSync(dossier, { recursive: true, force: true });
  }
  const n = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - n) + '/' + res.length + (n ? ' ECHEC' : ' OK'));
  process.exit(n ? 1 : 0);
})();
