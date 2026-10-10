/* « SUIVI ÉQUIVALENCE » (plan d'octobre, section 9, lot L7) — retours du 10/10 : onglet de Commandes en cours,
 * entre Alertes et Tableau de bord (il etait dans Analyse article, qui n'a plus que la matrice et les paires).
 *
 * Ce que le test etablit, sur le vrai ecran (lecture seule, aucune ecriture en base) :
 *  - l'onglet s'ouvre dans Commandes en cours, groupe par ensemble de DCI, pagine par groupes ;
 *  - chaque groupe : produits actifs ayant EXACTEMENT les memes DCI (verifie en base), au moins deux ;
 *  - classement du plus vendu au moins vendu, quantites identiques a celles de la matrice marge x rotation ;
 *  - repere « à ne plus commander » : equivalent DIRECT vendu moins que le seuil (% du meneur), jamais un « à adapter » ;
 *  - filtres : DCI, groupes d'au moins N produits, en stock seulement, groupes avec doublons seulement, seuil ;
 *  - la periode de l'ecran est suivie ; Excel (fichier) et PDF (dans l'onglet) ;
 *  - aucune requete .jsp, aucune reponse en erreur, aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CLE = "SELECT GROUP_CONCAT(DISTINCT fd.lg_DCI_ID ORDER BY fd.lg_DCI_ID SEPARATOR ',') FROM t_famille_dci fd"
  + " WHERE (fd.str_STATUT IS NULL OR fd.str_STATUT = '' OR fd.str_STATUT = 'enable') AND fd.lg_FAMILLE_ID = ";

/* Jeu d'essai (le banc n'a aucun lien produit-DCI) : deux groupes temporaires de produits vendus ces 3 derniers mois,
   lies chacun a une DCI ; retires a la fin. Sans effet si la base a deja des liens. */
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE], { encoding: 'utf8', input: s });
let seme = false;
function semerDci() {
  if (q('SELECT COUNT(*) FROM t_famille_dci') !== '0') { return; }
  const dcis = q("SELECT lg_DCI_ID FROM t_dci WHERE str_STATUT = 'enable' ORDER BY str_NAME LIMIT 2").split('\n');
  const vendus = q("SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
    + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0"
    + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.dt_UPDATED >= NOW() - INTERVAL 80 DAY GROUP BY d.lg_FAMILLE_ID ORDER BY SUM(d.int_QUANTITY) DESC LIMIT 5").split('\n');
  if (dcis.length < 2 || vendus.length < 5) { return; }
  let sql = '';
  vendus.forEach((f, i) => { sql += "INSERT INTO t_famille_dci (lg_FAMILLE_DCI_ID, lg_FAMILLE_ID, lg_DCI_ID, str_STATUT, dt_CREATED) VALUES ('E2E-SEQ-" + i + "', '" + f + "', '" + dcis[i < 3 ? 0 : 1] + "', 'enable', NOW());"; });
  exec(sql);
  seme = true;
}
function retirerDci() {
  exec("DELETE FROM t_famille_dci WHERE lg_FAMILLE_DCI_ID LIKE 'E2E-SEQ-%'");
}

(async () => {
  semerDci();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  let connecte = false; const http = [], jsp = [];
  p.on('response', (r) => { if (connecte && r.status() >= 400 && /\/prestige\//.test(r.url())) http.push(r.status() + ' ' + r.url().replace(/\?.*$/, '')); });
  p.on('request', (r) => { if (connecte && /\.jsp/.test(r.url()) && !/index\.jsp|panelInfos|ws_tree_menu/.test(r.url())) jsp.push(r.url().replace(/\?.*$/, '')); });
  const appel = (url) => p.evaluate(async (u) => { const r = await fetch(u); return { s: r.status, t: r.headers.get('content-type') || '', d: r.headers.get('content-disposition') || '', b: /json/.test(r.headers.get('content-type') || '') ? await r.text() : (await r.text()).slice(0, 4000) }; }, url);
  const charger = async () => {
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('suiviequivalence')[0]; return e && !e.equivalenceStore.isLoading(); }, null, { timeout: 600000 });
    return p.evaluate(() => { const e = Ext.ComponentQuery.query('suiviequivalence')[0]; const st = e.equivalenceStore; const brut = st.getProxy().getReader().rawData || {};
      return { total: st.getTotalCount(), lignes: st.getRange().map((r) => r.data), brut: { success: brut.success, total: brut.total, candidats: brut.candidats, periode: brut.periode } }; });
  };
  const poser = async (itemId, v) => { await p.evaluate((a) => { const e = Ext.ComponentQuery.query('suiviequivalence')[0]; e.down('#' + a.i).setValue(a.v); }, { i: itemId, v }); await p.waitForTimeout(1200); return charger(); };
  const parGroupe = (lignes) => { const g = {}; lignes.forEach((l) => { (g[l.groupe] = g[l.groupe] || []).push(l); }); return g; };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    connecte = true;
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('analysearticle', 'Analyse article', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysearticle').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const ongletsAa = await p.evaluate(() => Ext.ComponentQuery.query('analysearticle')[0].down('#ongletsAnalyse').items.getRange().map((t) => t.title));
    ok('Analyse article : matrice et paires seulement', ongletsAa.join('|') === 'Matrice marge × rotation|Achetés ensemble', ongletsAa.join('|'));
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('commandesencours', 'Commandes en cours', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('commandesencours').length > 0, null, { timeout: 30000 });
    const onglets = await p.evaluate(() => Ext.ComponentQuery.query('commandesencours #ongletsCec')[0].query('button').filter((x) => x.isVisible()).map((x) => x.getText().replace(/<[^>]*>/g, '').replace(/\s*\d+$/, '')));
    ok('Commandes en cours : « Suivi équivalence » entre Alertes et Tableau de bord', onglets.slice(-3).join('|') === 'Alertes|Suivi équivalence|Tableau de bord', onglets.join('|'));
    await p.evaluate(() => { const b = Ext.ComponentQuery.query('commandesencours #cec-equivalence')[0]; b.getEl().dom.setAttribute('data-e2e', 'eq'); });
    await p.click('[data-e2e=eq]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('suiviequivalence').length > 0 && Ext.ComponentQuery.query('suiviequivalence')[0].isVisible(), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    let d = await charger();
    ok('Chargement : groupes trouvés (' + d.total + '), pagination par groupes', d.brut.success && d.total > 0 && Object.keys(parGroupe(d.lignes)).length <= 25, JSON.stringify(d.brut));
    const groupes = parGroupe(d.lignes);
    const titres = await p.evaluate(() => Array.from(document.querySelectorAll('.x-grid-group-title')).slice(0, 3).map((x) => x.textContent));
    ok('En-têtes de groupe : DCI et nombre de produits', titres.length > 0 && /\(\d+ produits/.test(titres[0]), JSON.stringify(titres));

    // Groupes : memes DCI exactes, produits actifs, au moins deux
    let memesDci = true, actifs = true, deux = true, detail = '';
    for (const [cle, lignes] of Object.entries(groupes).slice(0, 8)) {
      if (lignes.length < 2) { deux = false; }
      for (const l of lignes) {
        const k = q(CLE + "'" + l.produitId + "'");
        if (k !== cle) { memesDci = false; detail = l.libelle + ' ' + k + ' / ' + cle; }
        if (q("SELECT str_STATUT FROM t_famille WHERE lg_FAMILLE_ID = '" + l.produitId + "'") !== 'enable') actifs = false;
      }
    }
    ok('Chaque groupe : produits avec exactement les mêmes DCI (base)', memesDci, detail);
    ok('Chaque groupe : produits actifs, au moins deux', actifs && deux);

    // Classement et quantites = matrice
    const mat = JSON.parse((await appel('../api/v1/analyse-article/matrice?typePeriode=TROIS_MOIS&limit=0')).b);
    const qMat = {}; (mat.data || []).forEach((a) => { qMat[a.produitId] = a.quantite; });
    let ordre = true, memesQte = true, rangs = true, ecart = '';
    for (const lignes of Object.values(groupes)) {
      lignes.sort((a, b) => a.rang - b.rang);
      lignes.forEach((l, i) => {
        if (l.rang !== i + 1) rangs = false;
        if (i > 0 && lignes[i - 1].quantite < l.quantite) ordre = false;
        if ((qMat[l.produitId] || 0) !== l.quantite) { memesQte = false; ecart = l.libelle + ' ' + l.quantite + ' / ' + qMat[l.produitId]; }
      });
      if (lignes[0].equivalence !== 'meneur') rangs = false;
    }
    ok('Classement du plus vendu au moins vendu, rang 1 = meneur', ordre && rangs);
    ok('Quantités identiques à celles de la matrice marge × rotation', memesQte, ecart);

    // Regle du repere
    let regle = true, vus = 0, info = '';
    for (const lignes of Object.values(groupes)) {
      const men = lignes.find((l) => l.rang === 1);
      for (const l of lignes) {
        const attendu = l.rang > 1 && l.equivalence === 'direct' && men.quantite > 0 && l.quantite * 100 < 20 * men.quantite;
        if (attendu !== l.candidat) { regle = false; info = l.libelle + ' ' + JSON.stringify(l); }
        if (l.candidat) vus++;
      }
    }
    ok('Repère « à ne plus commander » : direct, vendu < 20 % du meneur (' + vus + ' sur la page)', regle, info);
    if (vus) {
      const pastille = await p.evaluate(() => { const e = document.querySelector('#' + Ext.ComponentQuery.query('suiviequivalence #ongletEquivalence')[0].getId() + ' .eq-repere'); return e ? e.textContent : ''; });
      ok('Repère affiché sur la ligne', pastille === 'À ne plus commander', pastille);
    }

    // Filtres
    d = await poser('eqCandidats', true);
    ok('Filtre « groupes avec doublons seulement »', d.total > 0 ? Object.values(parGroupe(d.lignes)).every((l) => l.some((x) => x.candidat)) : d.brut.candidats === 0, d.total + ' groupes');
    d = await poser('eqCandidats', false);
    d = await poser('eqMinProduits', 3);
    ok('Filtre « groupes d\'au moins 3 produits »', Object.values(parGroupe(d.lignes)).every((l) => l.length >= 3), d.total + ' groupes');
    d = await poser('eqMinProduits', 2);
    d = await poser('eqStock', true);
    ok('Filtre « en stock seulement »', d.lignes.every((l) => l.stock > 0), d.total + ' groupes');
    d = await poser('eqStock', false);
    const uneDci = Object.values(groupes)[0][0].dci.split(' + ')[0];
    d = await poser('eqDci', uneDci.slice(0, 6).toLowerCase());
    ok('Filtre DCI (« ' + uneDci.slice(0, 6).toLowerCase() + ' »)', d.total > 0 && d.lignes.every((l) => l.dci.toUpperCase().indexOf(uneDci.slice(0, 6).toUpperCase()) >= 0), d.total + ' groupes');
    d = await poser('eqDci', '');
    const avant = d.brut.candidats;
    d = await poser('eqSeuil', 60);
    ok('Seuil relevé à 60 % : au moins autant de doublons repérés', d.brut.candidats >= avant, avant + ' -> ' + d.brut.candidats);
    d = await poser('eqSeuil', 20);

    // Periode commune
    await p.evaluate(() => { const e = Ext.ComponentQuery.query('suiviequivalence')[0]; const c = e.down('#typePeriode'); c.setValue('SIX_MOIS'); c.fireEvent('select', c, [c.getStore().findRecord('id', 'SIX_MOIS')]); });
    await p.waitForTimeout(1500);
    d = await charger();
    ok('La période de l\'écran est suivie (6 derniers mois)', d.brut.periode && d.brut.periode.debut < new Date(Date.now() - 150 * 864e5).toISOString().slice(0, 10), JSON.stringify(d.brut.periode));

    // Exports
    const x = await appel('../api/v1/suivi-equivalence/excel?typePeriode=TROIS_MOIS&seuil=20&minProduits=2');
    ok('Excel : fichier .xlsx', x.s === 200 && /spreadsheetml/.test(x.t) && /attachment/.test(x.d), x.t + ' ' + x.d);
    const pdf = await appel('../api/v1/suivi-equivalence/pdf?typePeriode=TROIS_MOIS&seuil=20&minProduits=2');
    ok('PDF : rendu dans l\'onglet (inline)', pdf.s === 200 && /pdf/.test(pdf.t) && /inline/.test(pdf.d) && pdf.b.startsWith('%PDF'), pdf.t + ' ' + pdf.d);

    ok('Aucune requête .jsp', jsp.length === 0, JSON.stringify(jsp));
    ok('Aucune réponse en erreur (4xx/5xx)', http.length === 0, JSON.stringify(http));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Déroulé sans exception', false, (e.stack || '').split('\n').filter((l) => /test-suivi|Error/.test(l)).join(' | '));
  } finally {
    await b.close();
    retirerDci();
    if (seme) { ok('Jeu d\'essai DCI retiré', q("SELECT COUNT(*) FROM t_famille_dci WHERE lg_FAMILLE_DCI_ID LIKE 'E2E-SEQ-%'") === '0'); }
    const f = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - f) + '/' + res.length + ' PASS');
    process.exit(f ? 1 : 0);
  }
})();
