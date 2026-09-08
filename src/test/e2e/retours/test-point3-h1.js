/* Retours du 08/09 - point 3, lot H1 : l'ecran des gardes, joue au clavier et a la souris.
 *
 *  - liste : filtre par annee, cases a cocher, suppression massive, debut et fin sans la duree ;
 *  - tranches horaires : heures du jour cumulees sur TOUTE la periode, nombre de clients et
 *    chiffre d'affaires, plus de quantite ;
 *  - classification ABC : resume visible au-dessus de la liste, filtre par classe, N premiers,
 *    tri par chiffre / quantite / marge, marge en valeur et en pourcentage.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-H1';

let PRODUITS = [], USER = '';

/* Une garde de DEUX nuits (du 5 au 7 septembre 2026, 20 h a 8 h). Les ventes de 20h30 le 5 et de
   21h00 le 6 doivent se retrouver dans la MEME tranche 20h - 22h : c'est le cumul sur la periode.
   Couts renseignes pour la marge : (montant - remise - tva) - prixAchat x quantite. */
const VENTES = [
  { id: MARQUE + '-1', quand: '2026-09-05 20:30:00', prod: 0, qte: 2, montant: 1000, remise: 0, tva: 0, achat: 300 },
  { id: MARQUE + '-2', quand: '2026-09-06 21:00:00', prod: 0, qte: 1, montant: 500, remise: 0, tva: 0, achat: 300 },
  { id: MARQUE + '-3', quand: '2026-09-05 23:15:00', prod: 1, qte: 10, montant: 4000, remise: 400, tva: 600, achat: 200 },
  { id: MARQUE + '-4', quand: '2026-09-07 03:00:00', prod: 2, qte: 1, montant: 600, remise: 0, tva: 0, achat: 900 }
];
/* Marges attendues : P0 = (1500 - 0 - 0) - 300 x 3 = 600 ; P1 = (4000 - 400 - 600) - 200 x 10 = 1000 ;
   P2 = 600 - 900 = -300. Chiffre : P1 4000 et P0 1500 en classe A (cumul avant P0 : 65,6 %), P2 600 en B. */

function purger() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'");
  exec("DELETE FROM garde WHERE libelle LIKE '" + MARQUE + " %'");
}

function semer() {
  purger();
  USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' ORDER BY str_NAME LIMIT 3")
    .split('\n').filter(Boolean).forEach(id => PRODUITS.push(id.trim()));
  if (!USER || PRODUITS.length !== 3) { return false; }
  VENTES.forEach(v => {
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
      + " int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
      + " lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER,"
      + " int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
      + " montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + v.id + "','" + v.id + "','0'," + v.montant + "," + v.remise + ",'is_Closed','" + v.quand + "','"
      + v.quand + "',1,'" + USER + "','" + USER + "','" + USER + "',0,0,0,0,0,0," + v.tva + ",1,0,0,0,0,0,0)");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
      + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
      + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
      + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + v.id + "-D','" + v.id + "','" + PRODUITS[v.prod] + "'," + v.qte + ",0,0,0,"
      + v.montant + "," + Math.round(v.montant / v.qte) + ",0,'" + v.quand + "','" + v.quand
      + "'," + v.remise + ",0,0,0,0,0,1," + v.tva + ",0," + v.achat + ",0,0)");
  });
  return true;
}

(async () => {
  if (!semer()) { console.log('FATAL : jeu d\'essai incomplet'); purger(); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(2500);

  const poster = (params) => p.evaluate(async (params) => {
    const corps = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    const r = await fetch('../api/v1/gardes', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps
    });
    return await r.json();
  }, params);
  const lire = (chemin) => p.evaluate(async (chemin) => {
    const r = await fetch('../api/v1/gardes' + chemin, { credentials: 'same-origin' });
    return await r.json();
  }, chemin);
  const attendreStore = (expr) => p.waitForFunction((expr) => {
    const s = eval(expr); return s && !s.isLoading();
  }, expr, { timeout: 20000 });
  /* Un choix dans une liste deroulante, a la souris : ouverture par le declencheur, clic sur la ligne. */
  const choisir = async (selecteur, texte) => {
    const id = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getId(), selecteur);
    await p.click('#' + id + ' .x-form-trigger');
    await p.waitForSelector('.x-boundlist:visible .x-boundlist-item', { timeout: 5000 });
    await p.click('.x-boundlist:visible .x-boundlist-item:text-is("' + texte + '")');
  };
  const analyseFinie = async () => {
    await p.waitForFunction(() => !/Analyse en cours/.test(Ext.ComponentQuery.query('gardemanager #gardeIndicateurs')[0].el.dom.innerHTML),
      null, { timeout: 20000 });
    await p.waitForTimeout(400);
  };

  try {
    // ---------------------------------------------------------------- jeu d'essai : 4 gardes sur 2 ans
    const g26 = await poster({ libelle: MARQUE + ' deux nuits 2026', dateDebut: '2026-09-05 20:00', dateFin: '2026-09-07 08:00' });
    const g26b = await poster({ libelle: MARQUE + ' nuit vide 2026', dateDebut: '2026-08-01 20:00', dateFin: '2026-08-02 08:00' });
    const g25 = await poster({ libelle: MARQUE + ' nuit A 2025', dateDebut: '2025-03-01 20:00', dateFin: '2025-03-02 08:00' });
    const g25b = await poster({ libelle: MARQUE + ' nuit B 2025', dateDebut: '2025-04-01 20:00', dateFin: '2025-04-02 08:00' });
    ok('Quatre gardes de jeu d\'essai enregistrees',
      [g26, g26b, g25, g25b].every(r => r.success), JSON.stringify([g26, g26b, g25, g25b].map(r => r.msg)));
    const annees = await lire('/annees');
    ok('Les annees proposees couvrent 2025 et 2026',
      (annees.data || []).some(a => a.annee === 2025) && (annees.data || []).some(a => a.annee === 2026),
      JSON.stringify(annees.data));
    ok('Le filtre par annee ne rend que les gardes de l\'annee',
      ((await lire('?annee=2025')).data || []).every(g => g.dateDebut.startsWith('2025')),
      'lecture API');

    // ---------------------------------------------------------------- l'ecran, par le menu
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('gardemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('gardemanager').length > 0, null, { timeout: 20000 });
    await attendreStore("Ext.ComponentQuery.query('gardemanager')[0].gardeStore");
    await attendreStore("Ext.ComponentQuery.query('gardemanager')[0].anneeStore");
    await p.waitForTimeout(800);

    const liste = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0];
      const entetes = g.headerCt.getGridColumns().map(c => (c.text || '').replace(/&eacute;/g, 'é'));
      return {
        entetes: entetes,
        cases: g.el.query('.x-grid-row-checker').length,
        lignes: g.getStore().getCount(),
        hauteur: g.getHeight()
      };
    });
    ok('La liste montre le debut et la fin, sans la duree',
      liste.entetes.includes('Début') && liste.entetes.includes('Fin') && !liste.entetes.some(e => /Dur/.test(e)),
      liste.entetes.join(' | '));
    ok('Chaque garde porte une case a cocher', liste.cases === liste.lignes && liste.cases >= 4,
      liste.cases + ' cases / ' + liste.lignes + ' lignes');
    ok('L\'ecran est dessine', liste.hauteur > 300, liste.hauteur);

    // ---------------------------------------------------------------- filtre par annee, a la souris
    await choisir('gardemanager #gardeAnnee', '2025');
    await attendreStore("Ext.ComponentQuery.query('gardemanager')[0].gardeStore");
    await p.waitForTimeout(500);
    const en2025 = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleGardes')[0].getStore()
      .getRange().map(g => g.get('dateDebut')));
    ok('Le filtre 2025 ne laisse que les gardes de 2025',
      en2025.length >= 2 && en2025.every(d => d.startsWith('2025')), en2025.join(' | '));
    await choisir('gardemanager #gardeAnnee', 'Toutes les années');
    await attendreStore("Ext.ComponentQuery.query('gardemanager')[0].gardeStore");
    await p.waitForTimeout(500);
    const toutes = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleGardes')[0].getStore().getCount());
    ok('« Toutes les annees » les ramene', toutes > en2025.length, toutes);

    // ---------------------------------------------------------------- analyse : clic sur la garde
    const ligne = await p.evaluate((libelle) => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0];
      const i = g.getStore().findExact('libelle', libelle);
      const cellule = g.getView().getNode(i).querySelector('.x-grid-cell:not(.x-grid-cell-row-checker) .x-grid-cell-inner');
      cellule.scrollIntoView();
      const r = cellule.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, MARQUE + ' deux nuits 2026');
    await p.mouse.click(ligne.x, ligne.y);
    await analyseFinie();

    const analyse = await p.evaluate(() => {
      const v = Ext.ComponentQuery.query('gardemanager')[0];
      const tr = v.down('#grilleTranches');
      const tranches = tr.getStore().getRange().map(t => t.getData());
      const abc = v.down('#grilleAbc');
      const resume = v.down('#grilleResumeAbc');
      const ent = (g) => g.headerCt.getGridColumns().map(c => (c.text || '').replace(/&eacute;/g, 'é'));
      return {
        entetesTranches: ent(tr),
        tranches: tranches,
        t20: tranches.find(t => t.libelle === '20h - 22h'),
        indicateurs: v.down('#gardeIndicateurs').el.dom.innerText,
        entetesAbc: ent(abc),
        abc: abc.getStore().getRange().map(l => l.getData()),
        entetesResume: ent(resume),
        resume: resume.getStore().getRange().map(l => l.getData()),
        resumeY: resume.el.getY(), resumeH: resume.getHeight(), abcY: abc.el.getY(),
        resumeVisible: resume.isVisible(true) && resume.getHeight() > 60,
        compte: v.down('#abcCompte').el.dom.innerText
      };
    });
    ok('Les tranches affichent Clients et Chiffre d\'affaires, sans quantite',
      analyse.entetesTranches.includes('Clients') && analyse.entetesTranches.some(e => /Chiffre/.test(e))
      && !analyse.entetesTranches.some(e => /Qt/.test(e)), analyse.entetesTranches.join(' | '));
    ok('Vingt-quatre heures en tranches de deux : douze lignes', analyse.tranches.length === 12, analyse.tranches.length);
    ok('20h30 le 5 et 21h00 le 6 se cumulent dans la tranche 20h - 22h : 2 clients, 1 500',
      analyse.t20 && analyse.t20.clients === 2 && analyse.t20.montant === 1500 && analyse.t20.heuresCouvertes === 4, JSON.stringify(analyse.t20));
    ok('La barre d\'indicateurs annonce la marge et son taux',
      /marge\s+1[\s .,]?300/.test(analyse.indicateurs) && /21[.,]31\s*%/.test(analyse.indicateurs),
      analyse.indicateurs);
    ok('Le classement ABC porte Marge et Taux %',
      analyse.entetesAbc.includes('Marge') && analyse.entetesAbc.includes('Taux %'), analyse.entetesAbc.join(' | '));
    const p1 = analyse.abc[0] || {};
    ok('Le premier produit (4 000) a une marge de 1 000, soit 25 %',
      p1.montant === 4000 && p1.marge === 1000 && Math.abs(p1.tauxMarge - 25) < 0.01, JSON.stringify(p1));
    ok('Une marge negative est rendue telle quelle',
      analyse.abc.some(l => l.montant === 600 && l.marge === -300), JSON.stringify(analyse.abc.map(l => [l.montant, l.marge])));
    ok('Le resume par classe est VISIBLE, au-dessus de la liste',
      analyse.resumeVisible && analyse.resumeY < analyse.abcY,
      'visible=' + analyse.resumeVisible + ' y=' + analyse.resumeY + ' liste y=' + analyse.abcY);
    ok('Le resume porte la marge et son taux par classe',
      analyse.entetesResume.includes('Marge') && analyse.resume.length === 3
      && analyse.resume.find(c => c.classe === 'A').marge === 1600
      && analyse.resume.find(c => c.classe === 'B').marge === -300, JSON.stringify(analyse.resume));
    ok('Le compte annonce les 3 produits', /3/.test(analyse.compte), analyse.compte);

    // ---------------------------------------------------------------- tri, N premiers, classe : a la souris et au clavier
    await choisir('gardemanager #abcTri', 'Quantité');
    await analyseFinie();
    const parQuantite = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleAbc')[0].getStore()
      .getRange().map(l => l.get('quantite')));
    ok('Trie par quantite : 10, 3, 1', parQuantite.join(',') === '10,3,1', parQuantite.join(','));

    await choisir('gardemanager #abcTri', 'Marge');
    await analyseFinie();
    const parMarge = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleAbc')[0].getStore()
      .getRange().map(l => l.get('marge')));
    ok('Trie par marge : 1 000, 600, -300', parMarge.join(',') === '1000,600,-300', parMarge.join(','));

    const idLimite = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #abcLimite')[0].inputEl.id);
    await p.fill('#' + idLimite, '2');
    await p.waitForTimeout(900);
    await analyseFinie();
    const deux = await p.evaluate(() => ({
      n: Ext.ComponentQuery.query('gardemanager #grilleAbc')[0].getStore().getCount(),
      compte: Ext.ComponentQuery.query('gardemanager #abcCompte')[0].el.dom.innerText,
      resume: Ext.ComponentQuery.query('gardemanager #grilleResumeAbc')[0].getStore().getCount()
    }));
    ok('« N premiers = 2 » limite la liste a deux produits', deux.n === 2, deux.n);
    ok('...et le dit : 2 affiches sur 3', /2/.test(deux.compte) && /sur 3/.test(deux.compte), deux.compte);
    ok('Le resume reste calcule sur tout le classement', deux.resume === 3, deux.resume);

    await choisir('gardemanager #abcClasse', 'A');
    await analyseFinie();
    const classeA = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleAbc')[0].getStore()
      .getRange().map(l => l.get('classe')));
    ok('Le filtre de classe ne laisse que la classe A', classeA.length >= 1 && classeA.every(c => c === 'A'),
      classeA.join(','));

    const excel = await p.evaluate(async (id) => {
      const r2 = await fetch('../api/v1/gardes/' + id + '/excel?heures=2&classe=A&tri=marge&limite=1', { credentials: 'same-origin' });
      return { statut: r2.status, taille: (await r2.arrayBuffer()).byteLength };
    }, g26.data.id);
    ok('L\'export ABC accepte la meme lecture (classe, tri, N premiers)', excel.statut === 200 && excel.taille > 2000,
      JSON.stringify(excel));

    // ---------------------------------------------------------------- suppression massive : deux cases, un bouton
    const cases = await p.evaluate((libelles) => {
      const g = Ext.ComponentQuery.query('gardemanager #grilleGardes')[0];
      g.getSelectionModel().deselectAll();
      return libelles.map(l => {
        const n = g.getView().getNode(g.getStore().findExact('libelle', l)).querySelector('.x-grid-row-checker');
        n.scrollIntoView();
        const r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    }, [MARQUE + ' nuit A 2025', MARQUE + ' nuit B 2025']);
    await p.mouse.click(cases[0].x, cases[0].y);
    await p.mouse.click(cases[1].x, cases[1].y);
    await p.waitForTimeout(400);
    const cochees = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #grilleGardes')[0]
      .getSelectionModel().getSelection().map(g => g.get('libelle')));
    ok('Deux gardes cochees', cochees.length === 2, cochees.join(' | '));
    const idSupprimer = await p.evaluate(() => Ext.ComponentQuery.query('gardemanager #gardeSupprimer')[0].getId());
    await p.click('#' + idSupprimer);
    await p.waitForSelector('.x-message-box:visible', { timeout: 5000 });
    const confirmation = await p.evaluate(() => ({
      texte: Ext.MessageBox.msg.el.dom.innerText,
      oui: Ext.MessageBox.msgButtons.yes.getId()
    }));
    ok('La confirmation annonce les 2 gardes cochees', /2/.test(confirmation.texte) && /nuit A 2025/.test(confirmation.texte),
      confirmation.texte);
    await p.click('#' + confirmation.oui);
    await p.waitForTimeout(1500);
    await attendreStore("Ext.ComponentQuery.query('gardemanager')[0].gardeStore");
    ok('Les deux gardes de 2025 sont supprimees en base',
      q("SELECT COUNT(*) FROM garde WHERE libelle LIKE '" + MARQUE + " nuit % 2025'") === '0');
    ok('...et la garde analysee est toujours la',
      q("SELECT COUNT(*) FROM garde WHERE libelle='" + MARQUE + " deux nuits 2026'") === '1');
    const apres = await p.evaluate(() => ({
      lignes: Ext.ComponentQuery.query('gardemanager #grilleGardes')[0].getStore().getRange().map(g => g.get('libelle')),
      annees: Ext.ComponentQuery.query('gardemanager')[0].anneeStore.getRange().map(a => a.get('libelle'))
    }));
    ok('La liste ne les montre plus', !apres.lignes.some(l => /2025/.test(l)), apres.lignes.filter(l => /E2E-H1/.test(l)).join(' | '));
    ok('Aucune vente n\'a ete touchee',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'") === '4');

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    purger();
    ok('Jeu d\'essai entierement retire',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%'") === '0'
      && q("SELECT COUNT(*) FROM garde WHERE libelle LIKE '" + MARQUE + " %'") === '0');
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
