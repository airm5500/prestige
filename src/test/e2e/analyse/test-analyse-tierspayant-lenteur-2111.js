/* PLAN DU 21/11, POINT 14 : analyse des tiers payants lente (liste, recherche d'un tiers payant, detail, exports,
 * PDF) et PDF bloque par Firefox (onglet ouvert a l'arrivee de la reponse = fenetre surgissante).
 * La requete garde ses tables, ses jointures et ses conditions ; seul l'ordre de lecture change (par la date, ou par
 * les ventes des tiers payants vises quand elles sont moins nombreuses).
 * Rapprochement : pour des periodes, recherches, groupes, tris et tiers payants varies, chaque ligne de l'API
 * (tiers payant ou produit : ventes, quantite, CA TTC, CA HT, achat, marge, part du tiers payant) = l'ANCIENNE
 * requete rejouee en base ; puis ecran, CSV, Excel et PDF = base.
 * Ecran : l'onglet du PDF s'ouvre DANS le clic, avant la reponse du serveur, et recoit le PDF.
 * Lecture seule.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ENV_E2E = require('../outils/poste');
const editions = require('../support/editions');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s.replace(/\s*\n\s*/g, ' ')], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const sql = (v) => "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
const lireXlsx = (f) => JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', `import json,sys,openpyxl
wb=openpyxl.load_workbook(sys.argv[1])
print(json.dumps([[c.value for c in r] for r in wb.worksheets[0].iter_rows()],ensure_ascii=False,default=str))`, f], { encoding: 'utf8' }));

const EMPL = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = " + sql(ENV_E2E.LOGIN));
const TRI = { MARGE: 'marge', CA: 'ca_ttc', QUANTITE: 'quantite' };
/* l'ancienne requete, mot pour mot (jointures dans l'ordre d'origine, sans indication de lecture) */
const VENTES = ` FROM t_preenregistrement p JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID
  JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
  JOIN t_famille f ON f.lg_FAMILLE_ID = pd.lg_FAMILLE_ID
  JOIN t_preenregistrement_compte_client_tiers_payent tpv ON tpv.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
  JOIN t_compte_client_tiers_payant c ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = tpv.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
  JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = c.lg_TIERS_PAYANT_ID`;
const CONDITIONS = (d, f) => ` WHERE p.dt_UPDATED >= '${d}' AND p.dt_UPDATED < DATE_ADD('${f}', INTERVAL 1 DAY)
  AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5' AND u.lg_EMPLACEMENT_ID = '${EMPL}'`;
const AGREGATS = ` SUM(pd.int_QUANTITY) quantite, SUM(pd.int_PRICE) ca_ttc, SUM(pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) ca_ht,
  SUM(pd.prixAchat * pd.int_QUANTITY) achat, SUM(pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) - SUM(pd.prixAchat * pd.int_QUANTITY) marge`;
const bornes = (d, f) => (d <= f ? [d, f] : [f, d]);
function ancienneTp({ d, f, recherche = '', groupe = '', tri = 'MARGE' }) {
  [d, f] = bornes(d, f);
  const parts = new Map(lignes(`SELECT c.lg_TIERS_PAYANT_ID, SUM(tpv.int_PRICE) FROM t_preenregistrement_compte_client_tiers_payent tpv
    JOIN t_compte_client_tiers_payant c ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = tpv.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
    JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tpv.lg_PREENREGISTREMENT_ID JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID
    ${CONDITIONS(d, f)} GROUP BY c.lg_TIERS_PAYANT_ID`).map((l) => [l[0], Number(l[1])]));
  return lignes(`SELECT tp.lg_TIERS_PAYANT_ID, tp.str_NAME, COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID), ${AGREGATS} ${VENTES} ${CONDITIONS(d, f)}
    AND (${sql(recherche.trim())} = '' OR tp.str_NAME LIKE ${sql('%' + recherche.trim() + '%')})
    AND (${sql(groupe)} = '' OR tp.lg_GROUPE_ID = ${sql(groupe)})
    GROUP BY tp.lg_TIERS_PAYANT_ID, tp.str_NAME ORDER BY ${TRI[tri]} DESC`).map((l) => ({
    id: l[0], nom: l[1], nbVentes: +l[2], quantite: +l[3], caTtc: +l[4], caHt: +l[5], achat: +l[6], marge: +l[7], part: parts.get(l[0]) || 0 }));
}
function ancienneProduit({ d, f, tp = '', recherche = '', groupe = '', tri = 'MARGE' }) {
  [d, f] = bornes(d, f);
  const r = recherche.trim();
  return lignes(`SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_DESCRIPTION, ${AGREGATS} ${VENTES} ${CONDITIONS(d, f)}
    AND (${sql(tp)} = '' OR c.lg_TIERS_PAYANT_ID = ${sql(tp)})
    AND (${sql(r)} = '' OR f.str_DESCRIPTION LIKE ${sql('%' + r + '%')} OR f.int_CIP LIKE ${sql('%' + r + '%')})
    AND (${sql(groupe)} = '' OR tp.lg_GROUPE_ID = ${sql(groupe)})
    GROUP BY f.lg_FAMILLE_ID, f.int_CIP, f.str_DESCRIPTION ORDER BY ${TRI[tri]} DESC`).map((l) => ({
    id: l[0], cip: l[1], designation: l[2], quantite: +l[3], caTtc: +l[4], caHt: +l[5], achat: +l[6], marge: +l[7] }));
}
const cleTp = (x) => [x.id, x.nom, x.nbVentes, x.quantite, x.caTtc, x.caHt, x.achat, x.marge, x.part].join('|');
const cleProduit = (x) => [x.id, x.cip, x.designation, x.quantite, x.caTtc, x.caHt, x.achat, x.marge].join('|');
const depuisApiTp = (x) => ({ id: x.tiersPayantId, nom: x.tiersPayant, nbVentes: x.nbVentes, quantite: x.quantite, caTtc: x.caTtc, caHt: x.caHt, achat: x.montantAchat, marge: x.marge, part: x.partTiersPayant });
const depuisApiProduit = (x) => ({ id: x.produitId, cip: x.cip, designation: x.designation, quantite: x.quantite, caTtc: x.caTtc, caHt: x.caHt, achat: x.montantAchat, marge: x.marge });
/* memes lignes (l'ordre entre ex aequo est libre), et liste triee sur la cle demandee */
function compare(api, base, cle, tri) {
  const a = api.map(cle).sort(), b = base.map(cle).sort();
  const manquants = b.filter((x) => a.indexOf(x) < 0), enTrop = a.filter((x) => b.indexOf(x) < 0);
  const champ = { MARGE: 'marge', CA: 'caTtc', QUANTITE: 'quantite' }[tri];
  const trie = api.every((x, i) => i === 0 || api[i - 1][champ] >= x[champ]);
  return { egal: a.length === b.length && !manquants.length && !enTrop.length && trie, detail: api.length + ' / ' + base.length + ' lignes' + (trie ? '' : ', ordre faux') + (manquants.length ? ' ; manque ' + manquants[0] : '') + (enTrop.length ? ' ; en trop ' + enTrop[0] : '') };
}
/* chemin que le serveur doit prendre : memes comptes que le service */
function chemin({ d, f, ids }) {
  if (!ids || ids.length > 50) { return 'date'; }
  [d, f] = bornes(d, f);
  if (!ids.length) { return 'vide'; }
  const ventes = +q(`SELECT COUNT(*) FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.dt_UPDATED >= '${d}' AND p.dt_UPDATED < DATE_ADD('${f}', INTERVAL 1 DAY)`);
  const tpv = +q(`SELECT COUNT(*) FROM t_compte_client_tiers_payant c JOIN t_preenregistrement_compte_client_tiers_payent tpv ON tpv.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID WHERE c.lg_TIERS_PAYANT_ID IN (${ids.map(sql).join(',')})`);
  return tpv < ventes ? 'tiers payant' : 'date';
}
const idsTp = ({ id = '', recherche = '', groupe = '' }) => (!id && !recherche.trim() && !groupe ? null
  : lignes(`SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant tp WHERE (${sql(id)} = '' OR tp.lg_TIERS_PAYANT_ID = ${sql(id)})
    AND (${sql(recherche.trim())} = '' OR tp.str_NAME LIKE ${sql('%' + recherche.trim() + '%')}) AND (${sql(groupe)} = '' OR tp.lg_GROUPE_ID = ${sql(groupe)})`).map((l) => l[0]));

const MOIS = ['2026-10-01', '2026-10-31'], AN = ['2025-11-01', '2026-10-31'], SEMAINE = ['2026-10-06', '2026-10-12'], VIDE = ['2001-01-01', '2001-01-31'];

(async () => {
  /* tiers payants du jeu d'essai, lus sur l'annee : le plus gros, un moyen, un petit, et un sans vente sur la periode */
  const annee = ancienneTp({ d: AN[0], f: AN[1], tri: 'CA' });
  const GROS = annee[0], PETIT = annee[annee.length - 1], MOYEN = annee[Math.floor(annee.length / 2)];
  const SANS = q(`SELECT tp.lg_TIERS_PAYANT_ID FROM t_tiers_payant tp WHERE tp.lg_TIERS_PAYANT_ID NOT IN (${annee.map((x) => sql(x.id)).join(',') || "''"}) LIMIT 1`);
  const groupe = q(`SELECT tp.lg_GROUPE_ID FROM t_tiers_payant tp WHERE tp.lg_TIERS_PAYANT_ID = ${sql(GROS.id)}`);
  const autreGroupe = q(`SELECT lg_GROUPE_ID FROM t_tiers_payant WHERE lg_GROUPE_ID IS NOT NULL AND lg_GROUPE_ID <> ${sql(groupe || '')} LIMIT 1`);
  const motNom = GROS.nom.trim().split(/\s+/).sort((a, b) => b.length - a.length)[0].slice(0, 5);
  ok('Jeu d\'essai : au moins 5 tiers payants vendus sur l\'année, un gros, un petit, un sans vente', annee.length >= 5 && GROS.caTtc > PETIT.caTtc && !!SANS, annee.length + ' tiers payants ; gros ' + GROS.nom + ', petit ' + PETIT.nom + ', motif « ' + motNom + ' »');

  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tp2111-'));
  try {
    const ctx = await b.newContext({ viewport: { width: 1700, height: 950 }, acceptDownloads: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const api = (u) => p.evaluate((x) => fetch(x).then((r) => r.json()), '../api/v1/analyse-tierspayant/' + u);
    const prm = (o) => Object.entries(o).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
    const chemins = new Set();

    /* 1. liste des tiers payants */
    const casTp = [
      { d: MOIS[0], f: MOIS[1] }, { d: AN[0], f: AN[1] }, { d: SEMAINE[0], f: SEMAINE[1], tri: 'CA' }, { d: VIDE[0], f: VIDE[1] },
      { d: AN[1], f: AN[0], tri: 'QUANTITE' }, { d: MOIS[0], f: MOIS[1], recherche: motNom }, { d: AN[0], f: AN[1], recherche: motNom, tri: 'CA' },
      { d: AN[0], f: AN[1], recherche: PETIT.nom }, { d: AN[0], f: AN[1], recherche: 'A' }, { d: AN[0], f: AN[1], recherche: 'zzz-aucun' },
      { d: AN[0], f: AN[1], groupe }, { d: MOIS[0], f: MOIS[1], groupe, recherche: motNom, tri: 'QUANTITE' }, { d: AN[0], f: AN[1], groupe: autreGroupe, recherche: GROS.nom }];
    const ecartsTp = [];
    let nonVides = 0;
    for (const c of casTp) {
      const r = await api('tiers-payants?' + prm({ dtStart: c.d, dtEnd: c.f, query: c.recherche || '', tri: c.tri || 'MARGE', groupeId: c.groupe || '' }));
      const attendu = ancienneTp(c);
      const cmp = compare((r.data || []).map(depuisApiTp), attendu, cleTp, c.tri || 'MARGE');
      chemins.add(chemin({ d: c.d, f: c.f, ids: idsTp(c) }));
      if (attendu.length) { nonVides++; }
      if (!cmp.egal || r.total !== attendu.length) { ecartsTp.push(JSON.stringify(c) + ' : ' + cmp.detail); }
    }
    ok('Liste des tiers payants = ancienne requête (13 cas : périodes, bornes inversées, recherches, groupes, tris, parts)', ecartsTp.length === 0 && nonVides >= 9, ecartsTp.slice(0, 3).join(' / ') + ' ; ' + nonVides + ' cas non vides');

    /* 2. detail par produit, toute la liste puis par pages */
    const casProduit = [
      { d: MOIS[0], f: MOIS[1], tp: GROS.id }, { d: AN[0], f: AN[1], tp: GROS.id, tri: 'CA' }, { d: AN[0], f: AN[1], tp: PETIT.id },
      { d: AN[0], f: AN[1], tp: MOYEN.id, tri: 'QUANTITE' }, { d: AN[0], f: AN[1], tp: SANS }, { d: MOIS[0], f: MOIS[1] },
      { d: AN[0], f: AN[1], tp: GROS.id, recherche: 'A' }, { d: AN[0], f: AN[1], tp: GROS.id, groupe: autreGroupe },
      { d: MOIS[0], f: MOIS[1], groupe }, { d: SEMAINE[1], f: SEMAINE[0], tp: GROS.id }];
    const ecartsP = [];
    let pagesOk = true;
    for (const c of casProduit) {
      const r = await api('produits?' + prm({ dtStart: c.d, dtEnd: c.f, tiersPayantId: c.tp || '', query: c.recherche || '', tri: c.tri || 'MARGE', groupeId: c.groupe || '' }));
      const attendu = ancienneProduit(c);
      const cmp = compare((r.data || []).map(depuisApiProduit), attendu, cleProduit, c.tri || 'MARGE');
      chemins.add(chemin({ d: c.d, f: c.f, ids: idsTp({ id: c.tp || '', groupe: c.groupe || '' }) }));
      if (!cmp.egal || r.total !== attendu.length) { ecartsP.push(JSON.stringify(c) + ' : ' + cmp.detail); }
      const somme = (k) => attendu.reduce((s, x) => s + x[k], 0);
      if (r.totaux && (r.totaux.caTtc !== somme('caTtc') || r.totaux.marge !== somme('marge') || r.totaux.quantite !== somme('quantite'))) { ecartsP.push(JSON.stringify(c) + ' : totaux ' + JSON.stringify(r.totaux)); }
      if (attendu.length > 25) {
        const p2 = await api('produits?' + prm({ dtStart: c.d, dtEnd: c.f, tiersPayantId: c.tp || '', query: c.recherche || '', tri: c.tri || 'MARGE', groupeId: c.groupe || '', start: 25, limit: 25 }));
        pagesOk = pagesOk && p2.total === attendu.length && (p2.data || []).length === Math.min(25, attendu.length - 25) && p2.totaux.caTtc === somme('caTtc');
      }
    }
    ok('Détail par produit = ancienne requête (10 cas : gros, moyen, petit, sans vente, tous, recherche, groupe, bornes inversées), totaux = somme', ecartsP.length === 0, ecartsP.slice(0, 3).join(' / '));
    ok('Détail par pages : nombre total et totaux de toute la liste sur la page 2', pagesOk);
    ok('Les deux chemins de lecture sont exercés (par la date, par le tiers payant)', chemins.has('date') && chemins.has('tiers payant'), [...chemins].join(', '));

    /* 3. ecran : periode de l'annee, liste, puis detail du gros tiers payant */
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Analyse tiers payants');
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysetierspayant').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(2000);
    await saisir(p, 'analysetierspayant #dtStart', '01/11/2025');
    await saisir(p, 'analysetierspayant #dtEnd', '31/10/2026');
    const chargeTp = p.waitForResponse((r) => /analyse-tierspayant\/tiers-payants\?/.test(r.url()), { timeout: 60000 }).catch(() => null);
    await cliquer(p, 'analysetierspayant #btnRechercher');
    await chargeTp; await p.waitForTimeout(1500);
    const grilleTp = await p.evaluate(() => Ext.ComponentQuery.query('analysetierspayant')[0].storeTiersPayants.getRange().map((r) => r.data));
    const annee2 = ancienneTp({ d: AN[0], f: AN[1] });
    const cmpEcran = compare(grilleTp.map(depuisApiTp), annee2, cleTp, 'MARGE');
    ok('Écran : grille des tiers payants = base, ligne par ligne', cmpEcran.egal, cmpEcran.detail);
    const ligne = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('analysetierspayant #grilleTiersPayants')[0];
      const i = g.getStore().findExact('tiersPayantId', id); const n = i >= 0 ? g.getView().getNode(i) : null;
      if (n) { n.id = n.id || 'e2e-ligne-tp'; } return n ? '#' + n.id + ' td' : null; }, GROS.id);
    const chargeP = p.waitForResponse((r) => /analyse-tierspayant\/produits\?/.test(r.url()), { timeout: 60000 }).catch(() => null);
    if (ligne) { await p.locator(ligne).first().click(); }
    const repP = await chargeP; await p.waitForTimeout(1500);
    const demande = repP ? Object.fromEntries(new URL(repP.url()).searchParams) : {};
    const grilleP = await p.evaluate(() => { const e = Ext.ComponentQuery.query('analysetierspayant')[0]; return { lignes: e.storeProduits.getRange().map((r) => r.data), total: e.storeProduits.getTotalCount() }; });
    const triEcran = String(demande.tri || 'MARGE').toUpperCase();
    const detail = ancienneProduit({ d: AN[0], f: AN[1], tp: GROS.id, tri: TRI[triEcran] ? triEcran : 'MARGE' });
    const triD = TRI[triEcran] ? triEcran : 'MARGE', champD = { MARGE: 'marge', CA: 'caTtc', QUANTITE: 'quantite' }[triD];
    const premiere = detail.slice(0, grilleP.lignes.length);
    /* la grille ne garde pas toujours l'identifiant du produit : comparaison sur le CIP, la designation et les montants */
    const sansId = (x) => cleProduit(Object.assign({}, x, { id: '' }));
    const cmpP = compare(grilleP.lignes.map(depuisApiProduit), premiere, sansId, triD);
    const exAequo = detail.length > grilleP.lignes.length && grilleP.lignes.length > 0 && detail[grilleP.lignes.length][champD] === detail[grilleP.lignes.length - 1][champD];
    ok('Écran : détail du tiers payant cliqué = base (première page, et nombre total)', !!ligne && demande.tiersPayantId === GROS.id && demande.dtStart === AN[0] && demande.dtEnd === AN[1] && !demande.query && grilleP.total === detail.length && (cmpP.egal || exAequo), JSON.stringify(demande) + ', ' + cmpP.detail + ' ; total ' + grilleP.total + ' / ' + detail.length);

    /* 4. CSV et Excel de l'annee */
    const brut = async (u) => (await ctx.request.get((process.env.BASE || 'http://localhost:8080/prestige') + '/api/v1/analyse-tierspayant/' + u)).body();
    const csv = (await brut('csv?' + prm({ dtStart: AN[0], dtEnd: AN[1], niveau: 'TIERS', query: '', tri: 'MARGE', groupeId: '' }))).toString('utf8').replace(/\r/g, '').trim().split('\n').slice(1).map((l) => l.split(';'));
    const csvTp = csv.map((c) => [c[0].replace(/^"|"$/g, '').replace(/""/g, '"'), c[1], c[2], c[3], c[6], c[7], c[8], c[4]].join('|'));
    const baseTp = annee2.map((x) => [x.nom, x.nbVentes, x.quantite, x.caTtc, x.caHt, x.achat, x.marge, x.part].join('|'));
    ok('CSV des tiers payants = base, ligne par ligne', csvTp.length === baseTp.length && csvTp.slice().sort().join('\n') === baseTp.slice().sort().join('\n'), csvTp.length + ' / ' + baseTp.length + ' ; ' + (csvTp.find((x) => baseTp.indexOf(x) < 0) || ''));
    const csvP = (await brut('csv?' + prm({ dtStart: AN[0], dtEnd: AN[1], niveau: 'PRODUIT', tiersPayantId: GROS.id, query: '', tri: 'MARGE', groupeId: '' }))).toString('utf8').replace(/\r/g, '').trim().split('\n').slice(1).map((l) => l.split(';'));
    const csvProd = csvP.map((c) => [c[0], c[2], c[3], c[4], c[5], c[6]].join('|')).sort();
    const baseProd = detail.map((x) => [x.cip, x.quantite, x.caTtc, x.caHt, x.achat, x.marge].join('|')).sort();
    ok('CSV du détail = base, ligne par ligne', csvProd.join('\n') === baseProd.join('\n'), csvProd.length + ' / ' + baseProd.length);
    const fx = path.join(tmp, 'tp.xlsx');
    fs.writeFileSync(fx, await brut('excel?' + prm({ dtStart: AN[0], dtEnd: AN[1], niveau: 'TIERS', query: '', tri: 'MARGE', groupeId: '' })));
    const feuille = lireXlsx(fx);
    const iEntete = feuille.findIndex((r) => r[0] === 'Tiers payant' && r[1] === 'Nb ventes');
    const xl = feuille.slice(iEntete + 1).filter((r) => r[0] && baseTp.some((x) => x.startsWith(r[0] + '|'))).map((r) => r.slice(0, 8).map((v) => (typeof v === 'number' ? String(Math.round(v)) : v)).join('|'));
    ok('Excel des tiers payants = base, ligne par ligne', iEntete >= 0 && xl.length === baseTp.length && xl.slice().sort().join('\n') === baseTp.slice().sort().join('\n'), xl.length + ' / ' + baseTp.length + ' ; ' + (xl.find((x) => baseTp.indexOf(x) < 0) || ''));
    const fxp = path.join(tmp, 'tpp.xlsx');
    fs.writeFileSync(fxp, await brut('excel?' + prm({ dtStart: AN[0], dtEnd: AN[1], niveau: 'PRODUIT', tiersPayantId: GROS.id, query: '', tri: 'MARGE', groupeId: '' })));
    const critere = lireXlsx(fxp).find((r) => typeof r[0] === 'string' && r[0].indexOf('Tiers payant :') === 0) || [];
    ok('Excel du détail : le critère « Tiers payant » porte son nom', critere.some((v) => typeof v === 'string' && v.indexOf(GROS.nom.trim()) >= 0), JSON.stringify(critere));

    /* 5. PDF depuis l'ecran : onglet ouvert au clic, avant la reponse, puis PDF = base */
    const imprimer = async (item) => {
      let tReponse = 0, tOnglet = 0, urlPdf = '';
      const surReponse = (r) => { if (/analyse-tierspayant\/print\?/.test(r.url())) { tReponse = Date.now(); r.json().then((j) => { urlPdf = j.msg || ''; }).catch(() => {}); } };
      p.on('response', surReponse);
      const onglet = ctx.waitForEvent('page', { timeout: 120000 }).then((x) => { tOnglet = Date.now(); return x; }).catch(() => null);
      await cliquer(p, 'analysetierspayant #btnImprimer');
      await p.waitForTimeout(400);
      await cliquer(p, 'menuitem#' + item);
      const pg = await onglet;
      const t0 = Date.now();
      while (!tReponse && Date.now() - t0 < 120000) { await p.waitForTimeout(200); }
      await p.waitForTimeout(1500);
      const final = pg ? pg.url() : '';
      if (pg) { await pg.close().catch(() => {}); }
      p.off('response', surReponse);
      const fichier = editions.fichierEdition(urlPdf);
      /* espaces ramenes a un seul : la mise en page du PDF les resserre */
      const texte = fs.existsSync(fichier) ? execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', fichier, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ') : '';
      return { avant: !!pg && tOnglet > 0 && tReponse > 0 && tOnglet <= tReponse, final, urlPdf, texte, ecart: tReponse - tOnglet };
    };
    const pdf = await imprimer('btnPrintTiersPayants');
    ok('PDF : l\'onglet s\'ouvre dans le clic, avant la réponse du serveur (pas de fenêtre surgissante)', pdf.avant, 'onglet ' + pdf.ecart + ' ms avant la réponse');
    ok('PDF : l\'onglet reçoit le PDF', /\.pdf$/i.test(pdf.urlPdf) && pdf.final.indexOf(pdf.urlPdf.split('/').pop()) >= 0, pdf.final);
    const nombre = (n) => n.toLocaleString('de-DE');
    const absents = annee2.filter((x) => pdf.texte.indexOf(x.nom.trim().replace(/\s+/g, ' ').slice(0, 18)) < 0 || pdf.texte.indexOf(nombre(x.caTtc)) < 0).map((x) => x.nom);
    ok('PDF des tiers payants : chaque tiers payant et son CA TTC = base', pdf.texte.length > 0 && absents.length === 0, absents.slice(0, 4).join(', ') + ' ; ' + pdf.texte.length + ' caractères');
    const pdfP = await imprimer('btnPrintProduits');
    ok('PDF du détail : onglet ouvert au clic, sous-titre « Tiers payant : ' + GROS.nom.trim() + ' », nombre de lignes = base', pdfP.avant && pdfP.texte.indexOf('Tiers payant : ' + GROS.nom.trim()) >= 0 && pdfP.texte.indexOf(detail.length + (detail.length > 1 ? ' lignes' : ' ligne')) >= 0, pdfP.texte.split('\n').slice(0, 6).join(' / '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
