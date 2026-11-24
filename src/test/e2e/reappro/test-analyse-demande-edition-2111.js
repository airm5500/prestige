/* PREVISIONS, ONGLET « ANALYSE DE LA DEMANDE » : IMPRIMER ET EXCEL (plan du 21/11, point 15).
 *
 * Jeu d'essai (retire a la fin) : un produit sans vente recoit, sur les 24 derniers mois complets, des ventes variees
 * (deux ventes le meme mois, quantites de 2 a 25, des mois a zero, le dernier mois complet) et une vente du mois en
 * cours (exclue). Par l'ecran (GESTION DES COMMANDES > Prévisions > onglet « Analyse de la demande »), a 1366×768,
 * 1280×720 et 1920×1080 :
 *  - « 🖨 Imprimer » et « ⬇ Excel » dans la barre de l'onglet, comme les deux autres onglets ; grises tant que
 *    l'analyse n'est pas affichee, actifs ensuite ; la barre tient dans l'ecran ;
 *  - recherche du produit (saisie + Entree), puis clic sur chaque bouton : l'edition reprend les criteres affiches ;
 *  - rapprochement ligne a ligne : ecran (tuiles, matrice, indices, produits) = PDF = Excel = API = base (unites) ;
 *  - delai d'affichage de l'impression sous le plafond.
 * Bilan : lecture seule, aucune vente ni ligne ajoutee ou modifiee par l'edition.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const PLAFOND_MS = 15000;
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const [FAM, CIP] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f WHERE f.str_STATUT='enable' AND f.int_CIP REGEXP '^[0-9]{7}$'"
  + " AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_FAMILLE_ID=f.lg_FAMILLE_ID)"
  + " AND (SELECT COUNT(*) FROM t_famille g WHERE g.int_CIP LIKE CONCAT(f.int_CIP,'%'))=1 ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 3").split('\t');
const nettoyer = () => q("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID LIKE 'e2e-ded-%';"
  + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'e2e-ded-%'");
const vente = (id, quand, qte) => q("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, int_PRICE, int_PRICE_REMISE, int_CUST_PART, str_STATUT, b_IS_CANCEL,"
  + " lg_TYPE_VENTE_ID, str_TYPE_VENTE, lg_USER_ID, dt_CREATED, dt_UPDATED) VALUES ('e2e-ded-" + id + "', 'E2E-DED-" + id + "', " + qte * 100 + ", 0, " + qte * 100
  + ", 'is_Closed', 0, '1', 'VNO', '" + ADMIN + "', '" + quand + "', '" + quand + "');"
  + "INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_PRICE,"
  + " int_PRICE_UNITAIR, int_PRICE_REMISE, str_STATUT, prixAchat, dt_CREATED, dt_UPDATED) VALUES ('e2e-ded-" + id + "', 'e2e-ded-" + id + "', '" + FAM + "', " + qte + ", " + qte
  + ", " + qte * 100 + ", 100, 0, 'is_Closed', 60, '" + quand + "', '" + quand + "')");
const J = new Date(), DEB = new Date(J.getFullYear(), J.getMonth() - 24, 1), FIN = new Date(J.getFullYear(), J.getMonth() - 1, 1);
const dansMoitie = (mois, moitie) => { for (let i = 0; i < 12; i++) { const x = new Date(DEB.getFullYear(), DEB.getMonth() + moitie * 12 + i, 1); if (x.getMonth() === mois) { return x; } } return null; };
/* pic au mois prochain : le produit est « a anticiper » ; le dernier mois complet a sa vente */
const PROCHAIN = (J.getMonth() + 1) % 12;
const VENTES = [{ id: 'P1a', d: dansMoitie(PROCHAIN, 0), jour: 3, qte: 25 }, { id: 'P1b', d: dansMoitie(PROCHAIN, 0), jour: 17, qte: 6 },
  { id: 'P2', d: dansMoitie(PROCHAIN, 1), jour: 9, qte: 22 }, { id: 'A', d: dansMoitie((PROCHAIN + 5) % 12, 0), jour: 5, qte: 3 },
  { id: 'B', d: dansMoitie((PROCHAIN + 3) % 12, 1), jour: 21, qte: 5 }, { id: 'F', d: FIN, jour: 28, qte: 2 }];
const TOTAL = VENTES.reduce((s, v) => s + v.qte, 0);
const ymd = (x, jour) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(jour).padStart(2, '0') + ' 10:00:00';
const comptes = () => q("SELECT CONCAT((SELECT COUNT(*) FROM t_preenregistrement), '|', (SELECT COUNT(*) FROM t_preenregistrement_detail), '|',"
  + " (SELECT COALESCE(SUM(int_QUANTITY),0) FROM t_preenregistrement_detail WHERE lg_FAMILLE_ID = '" + FAM + "'))");
const norm = (s) => String(s === null || s === undefined ? '' : s).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

(async () => {
  nettoyer();
  VENTES.forEach((v) => vente(v.id, ymd(v.d, v.jour), v.qte));
  vente('X', new Date().toISOString().slice(0, 8) + '02 10:00:00', 500);
  const avant = comptes();
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-ded-'));
  /* clic sur un bouton d'edition : la fenetre ouverte, son adresse, puis le fichier lu dans la session */
  const editer = async (itemId, nom) => {
    const btn = await p.evaluate((i) => Ext.ComponentQuery.query('analysecommande #' + i)[0].btnEl.dom.id, itemId);
    const t0 = Date.now();
    const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 30000 }), p.click('#' + btn)]);
    const url = popup.url() !== 'about:blank' ? popup.url() : await popup.waitForEvent('framenavigated', { timeout: 30000 }).then((f) => f.url()).catch(() => popup.url());
    const f = await p.evaluate(async (u) => { const r = await fetch(u); const a = new Uint8Array(await r.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i++) { s += String.fromCharCode(a[i]); }
      return { type: r.headers.get('content-type') || '', b64: btoa(s) }; }, url);
    const ms = Date.now() - t0;
    await popup.close().catch(() => {});
    const fichier = path.join(tmp, nom);
    fs.writeFileSync(fichier, Buffer.from(f.b64, 'base64'));
    return { url, type: f.type, fichier, ms };
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Prévisions');
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysecommande').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const avantChargement = await p.evaluate(() => ['demImprimer', 'demExcel'].map((i) => { const x = Ext.ComponentQuery.query('analysecommande #' + i)[0]; return x ? x.isDisabled() : 'absent'; }));
    ok('Avant l\'analyse : « Imprimer » et « Excel » grisés', avantChargement.every((x) => x === true), JSON.stringify(avantChargement));
    await p.locator('.x-tab').filter({ hasText: 'Analyse de la demande' }).first().click();
    await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('analysecommande')[0]; return t.demande && !t.demandeEnCours; }, null, { timeout: 180000 });
    /* recherche du produit, comme l'utilisateur */
    const champ = p.locator(await p.evaluate(() => '#' + Ext.ComponentQuery.query('analysecommande #demRecherche')[0].inputEl.dom.id));
    await champ.click(); await champ.fill(''); await p.keyboard.type(CIP, { delay: 20 }); await p.keyboard.press('Enter');
    await p.waitForFunction((cip) => { const t = Ext.ComponentQuery.query('analysecommande')[0]; return t.demande && !t.demandeEnCours && t.demandeCriteres && t.demandeCriteres.query === cip; }, CIP, { timeout: 120000 });
    await p.waitForTimeout(700);

    for (const [l, h] of [[1366, 768], [1280, 720], [1920, 1080]]) {
      await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(700);
      const m = await p.evaluate(() => ['demAnalyser', 'demImprimer', 'demExcel'].map((i) => { const x = Ext.ComponentQuery.query('analysecommande #' + i)[0];
        const r = x.getEl().dom.getBoundingClientRect(); return { i, texte: x.text, cls: x.cls || '', actif: !x.isDisabled(), visible: x.isVisible(true), haut: Math.round(r.top), droite: Math.round(r.right), ecran: window.innerWidth,
          aide: String((x.initialConfig || {}).tooltip || '') }; }));
      const [, imp, xls] = m;
      ok(`${l}×${h} : « 🖨 Imprimer » et « ⬇ Excel » au nouveau style, actifs, info-bulle, sur la ligne de la recherche, dans l'écran`,
        imp.texte === '🖨 Imprimer' && xls.texte === '⬇ Excel' && /ordo-btn/.test(imp.cls) && /ordo-btn/.test(xls.cls) && imp.actif && xls.actif
        && /Imprimer l'analyse affichée/.test(imp.aide) && /Excel/.test(xls.aide) && m.every((x) => x.visible && x.droite <= x.ecran && Math.abs(x.haut - m[0].haut) <= 4), JSON.stringify(m));
    }
    await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(600);

    /* ------------------------------------------------ ecran */
    const ecran = await p.evaluate(() => { const d = Ext.ComponentQuery.query('analysecommande #ongletDemande')[0].getEl().dom;
      const txt = (e) => (e ? e.textContent : '');
      return {
        tuiles: [...d.querySelectorAll('.dem-tuiles .pml-tuile')].map((t) => [txt(t.querySelector('.pml-tuile-titre')), txt(t.querySelector('.pml-tuile-valeur')), txt(t.querySelector('.pml-tuile-detail'))]),
        matrice: [...d.querySelectorAll('table.dem-matrice tr')].slice(1).map((tr) => [...tr.querySelectorAll('td')].map((td) => (td.textContent === '·' ? '' : td.textContent))),
        anticiper: [...d.querySelectorAll('table.dem-anticiper tr')].slice(1).map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent)),
        saisonniers: [...d.querySelectorAll('table.dem-saisonniers tr')].slice(1).map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent)),
        titres: [...d.querySelectorAll('.ac-bloc-t')].map((x) => x.textContent) }; });
    ok('Écran : 4 tuiles, matrice (années + indices), un produit à anticiper et saisonnier', ecran.tuiles.length === 4 && ecran.matrice.length >= 3
      && ecran.anticiper.length === 1 && ecran.saisonniers.length === 1 && ecran.anticiper[0][0] === CIP, JSON.stringify(ecran).slice(0, 400));

    /* ------------------------------------------------ API et base */
    const api = await p.evaluate(async (cip) => JSON.parse(await (await fetch('../api/v1/analyse-commande/demande?mois=24&query=' + cip)).text()), CIP);
    const enBase = Number(q("SELECT COALESCE(SUM(d.int_QUANTITY),0) FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
      + " WHERE d.lg_FAMILLE_ID = '" + FAM + "' AND p.dt_UPDATED >= '" + api.debut + "-01' AND p.dt_UPDATED < DATE_ADD('" + api.fin + "-01', INTERVAL 1 MONTH)"));
    ok(`Unités : écran = API = base = jeu d'essai (${TOTAL}, le mois en cours exclu)`, Number(ecran.tuiles[0][1].replace(/\s/g, '')) === TOTAL && api.total === TOTAL && enBase === TOTAL,
      JSON.stringify({ ecran: ecran.tuiles[0][1], api: api.total, base: enBase }));
    const totAnnees = ecran.matrice.slice(0, -1).reduce((s, r) => s + Number(r[13].replace(/\s/g, '')), 0);
    const parLigne = ecran.matrice.slice(0, -1).every((r) => r.slice(1, 13).reduce((s, v) => s + (v === '' ? 0 : Number(v.replace(/\s/g, ''))), 0) === Number(r[13].replace(/\s/g, '')));
    ok('Écran : somme des mois = total de l\'année, somme des années = unités vendues', parLigne && totAnnees === TOTAL, totAnnees);

    /* ------------------------------------------------ Imprimer */
    const pdf = await editer('demImprimer', 'demande.pdf');
    ok('« Imprimer » : PDF des critères affichés (24 mois, le produit cherché)', /pdf/.test(pdf.type) && /format=pdf/.test(pdf.url) && /mois=24/.test(pdf.url) && new RegExp('query=' + CIP).test(pdf.url), pdf.url + ' ' + pdf.type);
    ok(`Impression affichée en moins de ${PLAFOND_MS / 1000} s`, pdf.ms < PLAFOND_MS, pdf.ms + ' ms');
    const texte = execFileSync('pdftotext', ['-layout', pdf.fichier, '-'], { encoding: 'utf8' }).replace(/\r/g, '');
    const lignesPdf = texte.split('\n').map(norm).filter((x) => x);
    const manquants = [];
    ecran.tuiles.forEach(([t, v, d]) => { if (!lignesPdf.some((x) => x === norm(t + ' ' + v + ' ' + d))) { manquants.push('tuile ' + t); } });
    ecran.matrice.forEach((r) => { if (!lignesPdf.some((x) => x === norm(r.filter((c) => c !== '').join(' ')))) { manquants.push('matrice ' + r[0]); } });
    [...ecran.anticiper, ...ecran.saisonniers].forEach((r) => { if (!lignesPdf.some((x) => x.startsWith(norm(r[0])) && x.includes(norm(r[2]) + ' ' + norm(r[3]) + ' ' + norm(r[4]) + ' ' + norm(r[5])))) { manquants.push('produit ' + r[0]); } });
    ecran.titres.forEach((t) => { if (!lignesPdf.some((x) => x === norm(t))) { manquants.push('titre ' + t); } });
    const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const PERIODE = 'Sur les 24 derniers mois complets : ' + MOIS[DEB.getMonth()] + ' ' + DEB.getFullYear() + ' à ' + MOIS[FIN.getMonth()] + ' ' + FIN.getFullYear() + ' · Produit : ' + CIP;
    ok('Rapprochement écran = PDF : tuiles, chaque ligne de la matrice et des indices, produits, titres des blocs ; période et critères lisibles', manquants.length === 0 && /ANALYSE DE LA DEMANDE/.test(texte)
      && lignesPdf.includes(PERIODE), PERIODE + ' // ' +manquants.join(' | ') + ' // ' + lignesPdf.slice(0, 30).join(' ¶ '));

    /* ------------------------------------------------ Excel */
    const xls = await editer('demExcel', 'demande.xls');
    ok('« Excel » : classeur des critères affichés', /excel/.test(xls.type) && /format=excel/.test(xls.url) && new RegExp('query=' + CIP).test(xls.url), xls.url + ' ' + xls.type);
    const feuille = JSON.parse(execFileSync('python', ['-I', '-c', 'import xlrd,json,sys\nb=xlrd.open_workbook(sys.argv[1]).sheet_by_index(0)\n'
      + 'def v(c):\n  return (str(int(c.value)) if c.value==int(c.value) else str(c.value)) if c.ctype==2 else c.value\n'
      + 'print(json.dumps([[v(b.cell(r,c)) for c in range(b.ncols)] for r in range(b.nrows)]))', xls.fichier], { encoding: 'utf8' }));
    const trouver = (titre) => feuille.findIndex((r) => r[0] === titre);
    const bloc = (titre, n) => { const i = trouver(titre); return i < 0 ? [] : feuille.slice(i + 2, i + 2 + n); };
    const chiffre = (s) => String(s).replace(/[\s  ]/g, '').replace(',', '.');
    const egal = (a, b) => (chiffre(a) !== '' && !isNaN(Number(chiffre(a))) && !isNaN(Number(chiffre(b))) ? Number(chiffre(a)) === Number(chiffre(b)) : norm(a) === norm(b));
    const ecarts = [];
    bloc('Synthèse', 4).forEach((r, i) => { const t = ecran.tuiles[i]; if (!(r[0] === t[0] && egal(r[1], t[1]) && r[2] === t[2])) { ecarts.push('synthèse ' + JSON.stringify([r, t])); } });
    bloc('Unités vendues par mois et indice saisonnier', ecran.matrice.length).forEach((r, i) => { ecran.matrice[i].forEach((c, k) => { if (!egal(r[k] === undefined ? '' : r[k], c)) { ecarts.push('matrice ' + i + ',' + k + ' ' + r[k] + '≠' + c); } }); });
    bloc(ecran.titres[1], 1).concat(bloc(ecran.titres[2], 1)).forEach((r, i) => { const e = i === 0 ? ecran.anticiper[0] : ecran.saisonniers[0];
      e.forEach((c, k) => { if (!egal(r[k], c)) { ecarts.push('produit ' + i + ',' + k + ' ' + r[k] + '≠' + c); } }); });
    ok('Rapprochement écran = Excel, cellule par cellule (synthèse, matrice, indices, produits) ; nombres en cellules numériques', ecarts.length === 0 && trouver('Synthèse') > 0
      && feuille[0][0] === 'Analyse de la demande' && feuille[1][0] === PERIODE, feuille[1][0] + ' // ' +ecarts.slice(0, 8).join(' | '));
    ok('Excel = API : unités vendues et total de chaque année', Number(bloc('Synthèse', 1)[0][1]) === api.total
      && api.annees.every((a, i) => Number(bloc('Unités vendues par mois et indice saisonnier', api.annees.length)[i][13]) === a.total), JSON.stringify(api.annees.map((a) => a.total)));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    const apres = comptes();
    ok('Bilan : l\'édition n\'écrit rien (ventes, lignes, unités du produit inchangées)', apres === avant, avant + ' -> ' + apres);
    await b.close();
    nettoyer();
    fs.rmSync(tmp, { recursive: true, force: true });
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'e2e-ded-%'") === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
