/* Retours des tests du 09/09 (2e) - lot O :
 *  7. carnet depot : Imprimer (onglet Factures) donne le recapitulatif des factures affichees (jrxml, en flux) ;
 *     le bouton actualiser du bas relit le solde ; « Nouveau reglement » ouvre le formulaire avec le solde a jour ;
 *  2. caisse / recette : le recap des modes de reglement figure sur le PDF ;
 *  3. feuille de match simple : les quantites vendues sur le PDF (et le classeur) ;
 *  5. suggestions : tout cocher / tout decocher sur toutes les pages, compteur de selection ;
 *  6. fiche article : classe A verte, B bleue, C rouge en gras ; prix d'achat et de vente agrandis en gras.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const { q, exec, MOIS_A, FIN_B, fr, poserJeuDEssai, retirerJeuDEssai } = require('../support/jeu-balance');
const TMP = '/tmp/claude-0/lot-o';
const TP = '1619143351587397512';
let compteAvant = '', typeAvant = '', depotAvant = '';

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  poserJeuDEssai();
  compteAvant = q("SELECT IFNULL(account,0) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + TP + "'");
  typeAvant = q("SELECT lg_TYPE_TIERS_PAYANT_ID FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + TP + "'");
  depotAvant = q("SELECT IFNULL(is_depot,0) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + TP + "'");
  exec("UPDATE t_tiers_payant SET is_depot=1, account=15400, lg_TYPE_TIERS_PAYANT_ID='2' WHERE lg_TIERS_PAYANT_ID='" + TP + "';");
  const libelleTp = q("SELECT str_FULLNAME FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + TP + "'").split(' ')[0];

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1800, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  const popups = []; ctx.on('page', pg => popups.push(pg));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  const octets = (url) => p.evaluate(async (u) => {
    const r = await fetch(u, { credentials: 'same-origin' });
    const buf = await r.arrayBuffer();
    return { statut: r.status, type: r.headers.get('content-type'), octets: Array.from(new Uint8Array(buf)) };
  }, url);
  const pdfTexte = async (url, nom) => {
    const r = await octets(url);
    fs.writeFileSync(TMP + '/' + nom, Buffer.from(r.octets));
    return { type: r.type, texte: execFileSync('pdftotext', ['-layout', TMP + '/' + nom, '-'], { encoding: 'utf8' }) };
  };
  const cliquerOnglet = async (itemId) => {
    const id = await p.evaluate((i) => Ext.ComponentQuery.query('reglementdepot #' + i)[0].tab.getId(), itemId);
    await p.click('#' + id);
    await p.waitForTimeout(1500);
  };

  try {
    /* ------------------------------------------------ 2. PDF caisse / recette avec le recap des modes */
    const recap = await pdfTexte('../RecapRecetteCaisseServlet?typeRglementId=&dtStart=' + MOIS_A + '&dtEnd=' + FIN_B + '&granularite=jour', 'recap.pdf');
    ok('PDF caisse/recette : le recap des modes du bas de l ecran est sur le PDF (CA 53 000, especes 41,5 %, mobile 17,0 % avec operateurs, credit 41,5 %)',
      /pdf/.test(recap.type || '') && /Part des modes de règlement dans le CA réalisé \(53[\s .]000\)/.test(recap.texte)
      && /Especes 41,5 %/.test(recap.texte) && /Mobile money 17,0 %/.test(recap.texte) && /WAVE 9,4 %/.test(recap.texte) && /Crédit 41,5 %/.test(recap.texte),
      recap.texte.replace(/\n/g, ' | ').slice(-500));

    /* ------------------------------------------------ 3. feuille de match simple : quantites vendues */
    const feuille = await pdfTexte('../api/v1/articles/abc/feuille-match/simple/pdf?dtStart=' + MOIS_A + '&dtEnd=' + FIN_B, 'feuille.pdf');
    ok('PDF feuille de match simple : colonne « Quantités vendues » et le produit du jeu d essai vendu 5 fois',
      // l'en-tete de colonne se replie sur deux lignes dans le PDF : « Quantités » puis « vendues »
      /pdf/.test(feuille.type || '') && (feuille.texte.match(/Quantités/g) || []).length >= 2 && /vendues/.test(feuille.texte)
      && /\b5\b/.test(feuille.texte), feuille.texte.replace(/\n/g, ' | ').slice(0, 500));
    const xlsx = await octets('../api/v1/articles/abc/feuille-match/simple/xlsx?dtStart=' + MOIS_A + '&dtEnd=' + FIN_B);
    fs.writeFileSync(TMP + '/feuille.xlsx', Buffer.from(xlsx.octets));
    const classeur = execFileSync('python3', ['-c', "import openpyxl,sys,warnings\nwarnings.simplefilter('ignore')\nwb=openpyxl.load_workbook(sys.argv[1])\nws=wb.active\nprint('\\n'.join(' ; '.join('' if c.value is None else str(c.value) for c in row) for row in ws.iter_rows()))", TMP + '/feuille.xlsx'], { encoding: 'utf8' });
    ok('classeur feuille simple : colonne « Quantités vendues » a cote des quantites achetees', /Quantités achetées ; Quantités vendues ; Fréquence/.test(classeur), classeur.replace(/\n/g, ' | ').slice(0, 300));

    /* ------------------------------------------------ 7. carnet depot */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('reglementdepot', {}));
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('reglementdepot #tiersPayantsExclus')[0]; return c && c.getStore().getCount() > 0 && !c.getStore().isLoading(); }, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const idCombo = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot #tiersPayantsExclus')[0].getId());
    await p.click('#' + idCombo + ' .x-form-trigger');
    await p.waitForSelector('.x-boundlist:visible .x-boundlist-item', { timeout: 5000 });
    await p.click('.x-boundlist:visible .x-boundlist-item:has-text("' + libelleTp + '")', { timeout: 10000 });
    await p.waitForTimeout(1500);
    await cliquerOnglet('reglementPanel');
    const soldeInitial = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot #accountReglement')[0].getValue());
    ok('carnet : le solde du carnet est affiche (15 400)', Number(soldeInitial) === 15400, soldeInitial);
    // le compte change en base ; le bouton « actualiser » de la barre du bas doit relire le solde
    exec("UPDATE t_tiers_payant SET account=9990 WHERE lg_TIERS_PAYANT_ID='" + TP + "';");
    const idRefresh = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot #reglementPanel gridpanel pagingtoolbar')[0].down('#refresh').getId());
    await p.click('#' + idRefresh);
    await p.waitForFunction(() => Number(Ext.ComponentQuery.query('reglementdepot #accountReglement')[0].getValue()) === 9990, null, { timeout: 15000 }).catch(() => {});
    const soldeApresRefresh = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot #accountReglement')[0].getValue());
    ok('carnet : le bouton actualiser du bas relit le solde (9 990)', Number(soldeApresRefresh) === 9990, soldeApresRefresh);
    // Nouveau reglement : le formulaire porte le solde a jour, meme si le compte vient de changer
    exec("UPDATE t_tiers_payant SET account=7777 WHERE lg_TIERS_PAYANT_ID='" + TP + "';");
    const idBtnReglement = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot #reglementPanel gridpanel #btnReglement')[0].getId());
    await p.click('#' + idBtnReglement);
    await p.waitForFunction(() => {
      const w = Ext.ComponentQuery.query('window[title="Nouveau règlement"] #rappelSolde')[0];
      return w && /7[\s .,]?777/.test(String(w.getValue()));
    }, null, { timeout: 15000 }).catch(() => {});
    const rappel = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('window[title="Nouveau règlement"] #rappelSolde')[0];
      const valeur = w ? String(w.getValue()) : null;
      Ext.each(Ext.ComponentQuery.query('window[title="Nouveau règlement"]'), function (f) { f.destroy(); });
      return valeur;
    });
    ok('carnet : « Nouveau reglement » ouvre le formulaire avec le solde relu (7 777)', /7[\s .,]?777/.test(rappel || ''), rappel);
    // onglet Factures : Imprimer donne le recapitulatif des factures affichees, en flux
    await cliquerOnglet('facturesPanel');
    const nbPopups = popups.length;
    const idImprimer = await p.evaluate(() => Ext.ComponentQuery.query('reglementdepot #imprimer')[0].getId());
    await p.click('#' + idImprimer);
    await p.waitForTimeout(3000);
    const popup = popups[popups.length - 1];
    ok('carnet : Imprimer sur l onglet Factures ouvre UNE fois le recapitulatif PDF, en flux',
      popups.length === nbPopups + 1 && /carnet-depot\/recap\/pdf\?/.test(popup ? popup.url() : '') && /tpid=/.test(popup ? popup.url() : ''), popup ? popup.url() : '');
    const recapFactures = await pdfTexte('../api/v1/facturation/carnet-depot/recap/pdf?tpid=' + TP + '&dtStart=' + MOIS_A + '&dtEnd=' + FIN_B + '&query=', 'recap-factures.pdf');
    ok('carnet : le PDF est le recapitulatif des factures (modele facture_carnet_depot_recap, total general)',
      /pdf/.test(recapFactures.type || '') && /RÉCAPITULATIF DES FACTURES DE CARNET DÉPÔT/.test(recapFactures.texte) && /TOTAL GÉNÉRAL/.test(recapFactures.texte),
      recapFactures.texte.replace(/\n/g, ' | ').slice(0, 300));

    /* ------------------------------------------------ 5. suggestions : toutes les pages, compteur */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; return g && !g.getStore().isLoading() && g.getStore().getTotalCount() >= 0; }, null, { timeout: 20000 });
    await p.waitForTimeout(1200);
    const total = await p.evaluate(() => Ext.ComponentQuery.query('i_sugg_manager')[0].getStore().getTotalCount());
    const idToutCocher = await p.evaluate(() => Ext.ComponentQuery.query('i_sugg_manager #btnToutCocher')[0].getId());
    await p.click('#' + idToutCocher);
    await p.waitForFunction((t) => /<b>\d+<\/b>/.test(Ext.ComponentQuery.query('i_sugg_manager #compteurCoches')[0].text) && parseInt(Ext.ComponentQuery.query('i_sugg_manager #compteurCoches')[0].text.replace(/<[^>]+>/g, ''), 10) === t, total, { timeout: 15000 }).catch(() => {});
    const apresCocher = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('i_sugg_manager')[0];
      return { compteur: g.down('#compteurCoches').text.replace(/<[^>]+>/g, ''), coches: g.getStore().getRange().filter(r => r.get('isChecked')).length, page: g.getStore().getCount() };
    });
    ok('suggestions : « Tout cocher (toutes les pages) » coche tout et le compteur donne le total (' + total + ')',
      apresCocher.compteur.indexOf(String(total)) === 0 && apresCocher.coches === apresCocher.page, JSON.stringify(apresCocher) + ' total=' + total);
    const idToutDecocher = await p.evaluate(() => Ext.ComponentQuery.query('i_sugg_manager #btnToutDecocher')[0].getId());
    await p.click('#' + idToutDecocher);
    await p.waitForTimeout(500);
    const apresDecocher = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('i_sugg_manager')[0];
      return { compteur: g.down('#compteurCoches').text.replace(/<[^>]+>/g, ''), coches: g.getStore().getRange().filter(r => r.get('isChecked')).length };
    });
    ok('suggestions : « Tout decocher » remet le compteur a 0', apresDecocher.compteur.indexOf('0') === 0 && apresDecocher.coches === 0, JSON.stringify(apresDecocher));

    /* ------------------------------------------------ 6. fiche article */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    // La fiche article EST la grille ; sans ligne chargee d'elle-meme, on lance la recherche.
    const chargee = await p.evaluate(() => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return g.getStore().getCount() > 0; });
    if (!chargee) {
      await p.evaluate(() => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.getStore().load({params: {query: ''}}); });
    }
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return g && g.getStore().getCount() > 0 && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const fiche = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('famillemanager')[0];
      const el = g.getView().getEl().dom;
      const prix = el.querySelectorAll('.fa-prix');
      const cs = prix.length ? getComputedStyle(prix[0]) : null;
      const classes = Array.from(el.querySelectorAll('td span[style*="font-weight:bold"]')).map(s => ({ t: s.innerText, c: s.style.color })).filter(x => /^\([ABC]\)$/.test(x.t));
      return { prix: prix.length, taille: cs && cs.fontSize, gras: cs && cs.fontWeight, classes: classes.slice(0, 6) };
    });
    const couleurs = { '(A)': 'rgb(23, 122, 23)', '(B)': 'rgb(21, 101, 192)', '(C)': 'rgb(160, 0, 0)' };
    ok('fiche article : prix d achat et de vente agrandis (13px) et en gras', fiche.prix >= 2 && fiche.taille === '13px' && (fiche.gras === 'bold' || fiche.gras === '700'), JSON.stringify(fiche));
    ok('fiche article : la classe ABC porte sa couleur (A vert, B bleu, C rouge)',
      fiche.classes.every(x => x.c === couleurs[x.t]), JSON.stringify(fiche.classes));

    ok('aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('parcours sans exception', false, e.stack || e.message);
  } finally {
    await b.close();
    exec("UPDATE t_tiers_payant SET is_depot=" + (depotAvant || 0) + ", account=" + (compteAvant || 0) + (typeAvant ? ", lg_TYPE_TIERS_PAYANT_ID='" + typeAvant + "'" : "") + " WHERE lg_TIERS_PAYANT_ID='" + TP + "';");
    retirerJeuDEssai();
    ok('jeu d essai retire', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-LL-%'") === '0'
      && q("SELECT IFNULL(account,0) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + TP + "'") === compteAvant);
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\nTOTAL ' + (res.length - ko) + '/' + res.length + (ko ? '  FAIL=' + ko : '  OK'));
  process.exit(ko ? 1 : 0);
})();
