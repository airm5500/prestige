/* Correspondance produits grossistes / Prestige, lot 4 : prix lus sur les BL, ecart de prix public, vue par produit.
   Quatre BL poses en base (deux grossistes, prix differents d'une ligne a l'autre, ligne d'unites gratuites a 0, meme
   produit deux fois sur un BL, BL non cloture), puis reception rejouee par l'API (meme methode que la cloture du BL ;
   la cloture reelle entre en stock et n'est pas faite ici) :
   - coherence : une ligne de prix_grossiste seulement quand un prix change, par produit et par grossiste ; un BL non
     cloture, rejoue ou au prix inchange n'ecrit rien ; un prix 0 n'est jamais ecrit ; prix public TTC, prix d'achat de
     nature INCONNUE ;
   - rapprochement BL = base = API = ecran, ligne par ligne : prix d'achat, prix public, code chez le grossiste, date et
     reference du BL ; derniers prix par grossiste ; historique ;
   - ecart de prix public (TTC) = prix du grossiste - prix Prestige ; alerte au-dela du seuil (0 par defaut, puis 100
     regle a l'ecran, confirme dans le bouton) : API ecarts-prix = calcul refait en SQL sur toute la table = ecran ;
   - bilan : exactement les lignes attendues, les autres lignes de prix_grossiste inchangees ;
   - ecran « Correspondance grossistes » : « Par produit » (recherche par CIP, « Voir », tableau par grossiste avec
     l'ecart, historique), « Ecarts de prix publics » (liste, seuil), aide « ? ».
   Tout est retire a la fin (BL, lignes de BL, prix, seuil remis). */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const URL_PRESTIGE = process.env.E2E_URL || 'http://localhost:8080/prestige';
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '--raw', '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r\n/g, '\n').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const M = 'E2E-CG4-';
const BL = ['B1', 'B2', 'B3', 'B4'].map((x) => M + x);
const CLE_SEUIL = 'KEY_CORRESPONDANCE_SEUIL_ECART_PRIX';

const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_LIBELLE = 'COPHARMED' AND str_STATUT = 'enable' LIMIT 1");
const G2 = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_LIBELLE = 'TEDIS PHARMA' AND str_STATUT = 'enable' LIMIT 1");
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const table = q("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'prix_grossiste'") === '1';

/* 4 fiches actives au CIP unique et au prix >= 1 200, avec un code Copharmed, sans prix deja lu */
function fiches() {
  return lignes("SELECT f.lg_FAMILLE_ID, f.int_CIP, MIN(TRIM(fg.str_CODE_ARTICLE)), f.int_PRICE FROM t_famille f JOIN t_famille_grossiste fg ON fg.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
    + " AND fg.lg_GROSSISTE_ID = '" + G + "' AND fg.str_STATUT = 'enable'"
    + " WHERE f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0 AND f.int_CIP REGEXP '^[0-9]{6,8}$' AND f.int_PRICE >= 1200"
    + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP AND x.str_STATUT = 'enable') = 1"
    + (table ? " AND NOT EXISTS (SELECT 1 FROM prix_grossiste p WHERE p.lg_FAMILLE_ID = f.lg_FAMILLE_ID)" : '')
    + " AND TRIM(fg.str_CODE_ARTICLE) <> '' GROUP BY f.lg_FAMILLE_ID, f.int_CIP, f.int_PRICE ORDER BY f.lg_FAMILLE_ID LIMIT 4 OFFSET 500")
    .map(([f, cip, code, prix]) => ({ f, cip, code, prix: Number(prix) }));
}

let seuilAvant = null;
function retirer() {
  const ids = "'" + BL.join("','") + "'";
  if (table) { q(`DELETE FROM prix_grossiste WHERE source = 'BL' AND piece IN (${ids})`); }
  q(`DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (${ids}); DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN (${ids});`);
  if (seuilAvant !== null) {
    q(seuilAvant === '' ? `DELETE FROM t_parameters WHERE str_KEY = '${CLE_SEUIL}'` : `UPDATE t_parameters SET str_VALUE = '${seuilAvant}' WHERE str_KEY = '${CLE_SEUIL}'`);
  }
}

/* ecarts au-dela du seuil, calcules a part en SQL sur toute la table (dernier prix public TTC par produit et grossiste) */
function ecartsSql(seuil) {
  return lignes("SELECT p.id, p.lg_FAMILLE_ID, p.cle_grossiste, p.prix_public - f.int_PRICE FROM prix_grossiste p"
    + " JOIN (SELECT MAX(id) AS id FROM prix_grossiste WHERE prix_public IS NOT NULL GROUP BY lg_FAMILLE_ID, cle_grossiste, nature_public) m ON m.id = p.id"
    + " JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID AND f.str_STATUT = 'enable'"
    + " WHERE p.nature_public = 'TTC' AND p.prix_public > 0 AND f.int_PRICE > 0 AND ABS(p.prix_public - f.int_PRICE) > " + seuil);
}

(async () => {
  const P = fiches();
  if (!G || !G2 || P.length < 4) { console.error('Jeu d\'essai introuvable (Copharmed, Tedis, 4 fiches)'); process.exit(2); }
  const F = P.map((x) => x.f), PP = P.map((x) => x.prix);
  seuilAvant = q(`SELECT IFNULL(MAX(str_VALUE), '') FROM t_parameters WHERE str_KEY = '${CLE_SEUIL}'`);
  retirer();
  ok('table prix_grossiste et parametre du seuil presents (migrations V7.6.3 et V7.6.4)', table && seuilAvant !== '', seuilAvant);
  if (seuilAvant !== '') { q(`UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = '${CLE_SEUIL}'`); }
  const autres = () => (table ? q(`SELECT COUNT(*), IFNULL(SUM(CRC32(CONCAT_WS('|', id, lg_FAMILLE_ID, cle_grossiste, IFNULL(prix_achat,''), IFNULL(prix_public,''), piece))),0)`
    + ` FROM prix_grossiste WHERE lg_FAMILLE_ID NOT IN ('${F.join("','")}')`) : '');
  const autresAvant = autres();

  /* BL : [grossiste, date, statut, lignes [fiche, prix d'achat, prix public]] ; prix publics fixes par rapport au prix Prestige */
  const PIECES = [
    [G, '2026-11-01', 'is_Closed', [[0, 1000, PP[0]], [1, 2000, PP[1] + 100], [2, 0, 0], [3, 700, PP[3] - 30], [3, 700, PP[3] - 30]]],
    [G, '2026-11-05', 'is_Closed', [[0, 1000, PP[0]], [1, 2100, PP[1] + 100], [2, 400, PP[2] + 500], [3, 700, PP[3] + 20]]],
    [G2, '2026-11-06', 'is_Closed', [[0, 1000, PP[0] + 1000]]],
    [G, '2026-11-07', 'enable', [[0, 5000, PP[0] + 9999]]],
  ];
  PIECES.forEach(([g, date, statut, ls], k) => {
    q(`INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, direct_import)`
      + ` VALUES ('${BL[k]}', 'E2E-BL4-${k + 1}', '${date}', 0, 0, 0, NULL, '${statut}', NOW(), NOW(), '${ADMIN}', 1);`
      + ls.map(([i, paf, pu], j) => `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PAF, int_PRIX_VENTE, int_PA_REEL, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK, lg_ZONE_GEO_ID)`
        + ` SELECT '${BL[k]}D${j}', '${g}', '${F[i]}', '${BL[k]}', ${j + 2}, ${paf ? 0 : 3}, ${j + 2}, ${paf}, ${pu}, ${paf}, 'enable', NOW() + INTERVAL ${j} SECOND, NOW(), 0, 0, 0, lg_ZONE_GEO_ID FROM t_famille WHERE lg_FAMILLE_ID = '${F[i]}';`).join(''));
  });

  const b = await ENV_E2E.lancer(chromium);
  try {
    const anonyme = await b.newPage();
    await anonyme.goto(URL_PRESTIGE + '/', { waitUntil: 'domcontentloaded' });
    const st = await anonyme.evaluate(async (u) => [(await fetch(u + '/api/v1/correspondance-grossiste/produit/x/prix')).status,
      (await fetch(u + '/api/v1/correspondance-grossiste/ecarts-prix')).status,
      (await fetch(u + '/api/v1/correspondance-grossiste/seuil-ecart-prix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"seuil":5}' })).status], URL_PRESTIGE);
    ok('prix, ecarts et seuil refuses sans session (401)', st.join(',') === '401,401,401', st.join(','));
    await anonyme.close();

    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    const erreursJs = [];
    p.on('pageerror', (e) => erreursJs.push(String(e)));
    await p.goto(URL_PRESTIGE + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    const api = (chemin, methode, corps) => p.evaluate(async (a) => {
      const r = await fetch(a.u + '/api/v1/correspondance-grossiste/' + a.c, { method: a.m || 'GET', headers: a.b ? { 'Content-Type': 'application/json' } : {}, body: a.b || undefined });
      return { status: r.status, corps: await r.json().catch(() => null) };
    }, { u: URL_PRESTIGE, c: chemin, m: methode, b: corps ? JSON.stringify(corps) : null });

    /* ---- reception des 4 BL, dans l'ordre, puis rejeu */
    const ecrits = [];
    for (const id of BL) {
      const r = await api('reception-bl/' + id, 'POST');
      ecrits.push(r.corps && r.corps.prix);
    }
    ok('prix ecrits par BL : 3 (B1 : 0 et doublon ignores), 3 (B2 : prix inchange ignore), 1 (autre grossiste), 0 (BL non cloture)',
      ecrits.join(',') === '3,3,1,0', ecrits.join(','));
    const rejeu = await api('reception-bl/' + BL[1], 'POST');
    ok('BL rejoue : aucun prix ecrit', rejeu.corps && rejeu.corps.prix === 0, JSON.stringify(rejeu.corps));

    /* ---- rapprochement BL = base, ligne par ligne */
    const base = table ? lignes(`SELECT p.id, p.lg_FAMILLE_ID, p.cle_grossiste, p.lg_GROSSISTE_ID, IFNULL(p.code_grossiste,''), IFNULL(p.prix_achat,''), p.nature_achat,`
      + ` IFNULL(p.prix_public,''), p.nature_public, p.source, p.piece, p.piece_ligne, DATE(p.dt_piece), p.dt_lecture IS NOT NULL FROM prix_grossiste p`
      + ` WHERE p.lg_FAMILLE_ID IN ('${F.join("','")}') ORDER BY p.id`) : [];
    const attendues = [`${BL[0]}D0`, `${BL[0]}D1`, `${BL[0]}D3`, `${BL[1]}D1`, `${BL[1]}D2`, `${BL[1]}D3`, `${BL[2]}D0`];
    ok('bilan : exactement 7 lignes de prix, celles attendues, dans l\'ordre des BL', base.map((x) => x[11]).join(',') === attendues.join(','), base.map((x) => x[11]).join(','));
    const ecarts = [];
    base.forEach((x) => {
      const d = lignes(`SELECT d.lg_FAMILLE_ID, d.lg_GROSSISTE_ID, d.int_PAF, d.int_PRIX_VENTE, DATE(b.dt_DATE_LIVRAISON), d.lg_BON_LIVRAISON_ID FROM t_bon_livraison_detail d`
        + ` JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE d.lg_BON_LIVRAISON_DETAIL = '${x[11]}'`)[0] || [];
      const code = q(`SELECT IFNULL(MIN(str_CODE_ARTICLE),'') FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '${d[0]}' AND lg_GROSSISTE_ID = '${d[1]}' AND str_STATUT = 'enable'`);
      const attendu = [d[0], d[1], d[1], code, d[2], 'INCONNUE', d[3], 'TTC', 'BL', d[5], d[4], '1'].join('|');
      const lu = [x[1], x[2], x[3], x[4], x[5], x[6], x[7], x[8], x[9], x[10], x[12], x[13]].join('|');
      if (attendu !== lu) { ecarts.push(attendu + ' <> ' + lu); }
    });
    ok('BL = base ligne par ligne : fiche, grossiste, code chez le grossiste, prix d\'achat (nature inconnue), prix public TTC, piece, date du BL', base.length && ecarts.length === 0, ecarts.slice(0, 2));
    ok('jamais de prix 0 ni de ligne vide', base.every((x) => x[5] !== '0' && x[7] !== '0' && (x[5] !== '' || x[7] !== '')));
    ok('bilan : les autres lignes de prix_grossiste inchangees', autres() === autresAvant, autres() + ' / ' + autresAvant);

    /* ---- API = base ; derniers prix et ecarts attendus, seuil 0 */
    const ATTENDU = { // fiche -> grossiste -> [achat, public, BL, ecart]
      0: { [G]: [1000, PP[0], 'E2E-BL4-1', 0], [G2]: [1000, PP[0] + 1000, 'E2E-BL4-3', 1000] },
      1: { [G]: [2100, PP[1] + 100, 'E2E-BL4-2', 100] },
      2: { [G]: [400, PP[2] + 500, 'E2E-BL4-2', 500] },
      3: { [G]: [700, PP[3] + 20, 'E2E-BL4-2', 20] },
    };
    const trie = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
    const apiPrix = [];
    for (let i = 0; i < 4; i++) {
      const r = await api('produit/' + encodeURIComponent(F[i]) + '/prix');
      apiPrix.push(r);
      const histBase = base.filter((x) => x[1] === F[i]).reverse();
      const h = (r.corps && r.corps.historique) || [];
      const ecartsH = histBase.filter((x, k) => !h[k] || [h[k].id, h[k].cleGrossiste, h[k].code || '', h[k].prixAchat === null ? '' : h[k].prixAchat, h[k].prixPublic === null ? '' : h[k].prixPublic,
        h[k].piece, h[k].pieceLigne, (h[k].datePiece || '').slice(0, 10)].join('|') !== [x[0], x[2], x[4], x[5], x[7], x[10], x[11], x[12]].join('|'));
      ok('API historique = base, du plus recent au plus ancien (fiche ' + (i + 1) + ')', r.status === 200 && h.length === histBase.length && ecartsH.length === 0, JSON.stringify(h).slice(0, 200));
      const d = (r.corps && r.corps.derniers) || [];
      const vu = {};
      d.forEach((x) => { vu[x.cleGrossiste] = [x.prixAchat, x.prixPublic, x.refAchat, x.ecartPublic]; });
      ok('API derniers prix et ecart par grossiste, prix Prestige = fiche (fiche ' + (i + 1) + ')', trie(vu) === trie(ATTENDU[i]) && r.corps.prixPrestige === PP[i]
        && d.every((x) => x.alerteEcart === (x.ecartPublic !== 0)), JSON.stringify(vu));
    }
    const nos = (data) => data.filter((x) => F.includes(x.familleId)).map((x) => F.indexOf(x.familleId) + '|' + x.cleGrossiste + '|' + x.ecart).sort().join(';');
    const attendusSeuil = (s) => [[0, G2, 1000], [1, G, 100], [2, G, 500], [3, G, 20]].filter((x) => Math.abs(x[2]) > s).map((x) => x.join('|')).sort().join(';');
    let ec = await api('ecarts-prix?limit=1000');
    const sql0 = ecartsSql(0);
    ok('API ecarts (seuil 0) = calcul SQL sur toute la table ; nos 4 ecarts non nuls signales, l\'ecart nul non',
      ec.status === 200 && ec.corps.total === sql0.length && ec.corps.seuilEcart === 0 && nos(ec.corps.data) === attendusSeuil(0)
      && ec.corps.data.every((x) => sql0.some((y) => Number(y[0]) === x.id && Number(y[3]) === x.ecart)), ec.corps && (ec.corps.total + ' / ' + sql0.length + ' ' + nos(ec.corps.data)));
    ok('API ecarts : plus grands ecarts d\'abord', ec.corps.data.every((x, k, t) => k === 0 || Math.abs(t[k - 1].ecart) >= Math.abs(x.ecart)));
    const refus = await api('seuil-ecart-prix', 'POST', { seuil: -3 });
    ok('seuil negatif refuse (400), parametre inchange', refus.status === 400 && q(`SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${CLE_SEUIL}'`) === '0', refus.status);

    /* ---- ecran : Correspondance grossistes > Par produit */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('correspondancesgrossistes', '', '', ''));
    await p.waitForSelector('[data-e2e=nb-ecarts]', { timeout: 20000 });
    const nbBarre = await p.textContent('[data-e2e=nb-ecarts]');
    ok('file : bouton « Écarts de prix publics » avec le nombre d\'ecarts = API', Number(nbBarre) === ec.corps.total, nbBarre);
    await p.click('.cgr-barre [data-action=aide]');
    const aide = await p.textContent('[data-e2e=aide]');
    ok('aide « ? » : prix public TTC, ecart = grossiste - Prestige, seuil 0 par defaut', /TTC/.test(aide) && /seuil/.test(aide) && /0 par défaut/.test(aide), aide.slice(0, 120));
    await p.click('.cgr-barre [data-action=aide]');
    await p.click('.cgr-barre [data-action=vue][data-vue=produit]');
    await p.waitForSelector('[data-action=chercher-produit]', { timeout: 10000 });
    ok('vue par produit : champ de recherche pret, invite affichee', await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-action') === 'chercher-produit'
      && /Choisissez un produit/.test(document.querySelector('.cgr').textContent)));
    const voirFiche = async (i) => {
      await p.fill('[data-action=chercher-produit]', P[i].cip);
      const voir = `[data-e2e=resultats-produit] [data-action=voir-produit][data-famille="${F[i]}"]`;
      await p.waitForSelector(voir, { timeout: 15000 });
      await p.click(voir);
      await p.waitForSelector('[data-e2e=prix-produit], [data-e2e=aucun-grossiste]', { timeout: 15000 });
    };
    for (let i = 0; i < 4; i++) {
      await voirFiche(i);
      const ecran = await p.evaluate(() => {
        const t = {};
        document.querySelectorAll('[data-e2e=ligne-grossiste]').forEach((tr) => {
          const v = (s) => { const c = tr.querySelector('[data-e2e=' + s + ']'); return c ? c.getAttribute('data-valeur') : null; };
          const e = tr.querySelector('[data-e2e=ecart]');
          t[tr.getAttribute('data-grossiste')] = { achat: v('achat'), pub: v('public'), ecart: v('ecart'), alerte: e.getAttribute('data-alerte'), rouge: e.classList.contains('cgr-alerte-ecart'),
            lu: tr.querySelector('[data-e2e=lu]').textContent, code: tr.querySelector('[data-e2e=code]').textContent };
        });
        const h = [...document.querySelectorAll('[data-e2e=ligne-historique]')].map((tr) => tr.getAttribute('data-id') + '|' + [...tr.querySelectorAll('[data-valeur]')].map((c) => c.getAttribute('data-valeur')).join('|'));
        const pp = document.querySelector('[data-e2e=prix-prestige]');
        return { t, h, prestige: pp && pp.getAttribute('data-valeur') };
      });
      const att = ATTENDU[i];
      const derniers = (apiPrix[i].corps && apiPrix[i].corps.derniers) || [];
      const ecartsE = Object.keys(att).filter((g) => {
        const e = ecran.t[g], dd = derniers.find((x) => x.cleGrossiste === g) || {};
        return !e || e.achat !== String(att[g][0]) || e.pub !== String(att[g][1]) || e.lu.indexOf(att[g][2]) < 0 || e.ecart !== String(att[g][3])
          || e.alerte !== (att[g][3] !== 0 ? '1' : '0') || e.rouge !== (att[g][3] !== 0)
          || e.lu.indexOf((dd.dateAchat || '').slice(0, 10)) !== 0 || ((dd.code || '') && e.code !== dd.code);
      });
      ok('ecran = API = BL : derniers prix, ecart (rouge si alerte), code, date et BL par grossiste ; prix Prestige (fiche ' + (i + 1) + ')',
        ecartsE.length === 0 && Object.keys(att).every((g) => ecran.t[g]) && ecran.prestige === String(PP[i]), JSON.stringify(ecran.t).slice(0, 300));
      const histApi = ((apiPrix[i].corps && apiPrix[i].corps.historique) || []).map((x) => x.id + '|' + (x.prixAchat === null ? '' : x.prixAchat) + '|' + (x.prixPublic === null ? '' : x.prixPublic));
      ok('ecran : historique = API ligne par ligne (fiche ' + (i + 1) + ')', ecran.h.join(';') === histApi.join(';') && ecran.h.length > 0, ecran.h.join(';'));
    }
    const lisible = await p.evaluate(() => document.querySelector('[data-e2e=ligne-grossiste] [data-e2e=achat]').textContent);
    ok('ergonomie : prix court sans separateur (700)', /^700/.test(lisible), lisible);
    await voirFiche(1);
    const millier = await p.evaluate(() => document.querySelector('[data-e2e=ligne-grossiste] [data-e2e=achat]').textContent);
    ok('ergonomie : 2 100 affiche avec separateur de milliers', millier.replace(/\s/g, ' ').indexOf('2 100') === 0, millier);

    /* ---- ecran : Ecarts de prix publics, puis seuil regle a 100 dans le bouton */
    const lireEcarts = () => p.evaluate(() => [...document.querySelectorAll('[data-e2e=ligne-ecart]')].map((tr) => ({
      id: Number(tr.getAttribute('data-id')), familleId: tr.getAttribute('data-famille'), cleGrossiste: tr.getAttribute('data-grossiste'),
      ecart: Number(tr.querySelector('[data-e2e=ecart]').getAttribute('data-valeur')) })));
    await p.click('.cgr-barre [data-action=vue][data-vue=ecarts]');
    await p.waitForSelector('[data-e2e=compte-ecarts]', { timeout: 15000 });
    let page1 = await api('ecarts-prix?limit=30');
    let vus = await lireEcarts();
    ok('ecran ecarts = API (premiere page, meme ordre) ; compte affiche = total', JSON.stringify(vus.map((x) => x.id + '|' + x.ecart)) === JSON.stringify(page1.corps.data.map((x) => x.id + '|' + x.ecart))
      && (await p.textContent('[data-e2e=compte-ecarts]')).indexOf(String(page1.corps.total)) === 0, vus.length + ' / ' + page1.corps.data.length);
    await p.fill('[data-e2e=seuil]', '100');
    await p.click('[data-action=seuil]');
    const texteConfirme = await p.textContent('[data-action=seuil]');
    ok('seuil : premier clic, le bouton demande confirmation, rien d\'enregistre', /Confirmer/.test(texteConfirme) && q(`SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${CLE_SEUIL}'`) === '0', texteConfirme);
    const [rs] = await Promise.all([p.waitForResponse((r) => r.url().includes('/seuil-ecart-prix'), { timeout: 15000 }), p.click('[data-action=seuil]')]);
    await p.waitForFunction(() => document.querySelector('[data-e2e=seuil]') && document.querySelector('[data-e2e=seuil]').value === '100', null, { timeout: 15000 });
    ok('seuil enregistre a 100 (base relue)', rs.status() === 200 && q(`SELECT str_VALUE FROM t_parameters WHERE str_KEY = '${CLE_SEUIL}'`) === '100');
    ec = await api('ecarts-prix?limit=1000');
    const sql100 = ecartsSql(100);
    ok('seuil 100 : API = calcul SQL ; restent nos ecarts de 1 000 et 500, ceux de 100 et 20 sortent',
      ec.corps.total === sql100.length && ec.corps.seuilEcart === 100 && nos(ec.corps.data) === attendusSeuil(100), ec.corps.total + ' / ' + sql100.length + ' ' + nos(ec.corps.data));
    vus = await lireEcarts();
    page1 = await api('ecarts-prix?limit=30');
    ok('ecran ecarts apres le seuil = API', JSON.stringify(vus.map((x) => x.id)) === JSON.stringify(page1.corps.data.map((x) => x.id)), vus.length);
    const pr0 = await api('produit/' + encodeURIComponent(F[3]) + '/prix');
    ok('seuil 100 : l\'ecart de 20 reste affiche, sans alerte', pr0.corps.derniers[0].ecartPublic === 20 && pr0.corps.derniers[0].alerteEcart === false && pr0.corps.seuilEcart === 100);
    await p.click('.cgr-barre [data-action=vue][data-vue=file]');
    await p.waitForSelector('[data-filtre=etat]', { timeout: 15000 });
    ok('retour a la file de validation ; aucune erreur JavaScript', erreursJs.length === 0, erreursJs.join(' | '));
    await p.close();
  } catch (e) {
    ok('execution sans exception', false, e && e.stack);
  } finally {
    await b.close();
    retirer();
    ok('remise en etat : BL, lignes et prix retires, seuil remis', q(`SELECT (SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE '${M}%')`
      + ` + (SELECT COUNT(*) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID LIKE '${M}%')`
      + (table ? ` + (SELECT COUNT(*) FROM prix_grossiste WHERE piece LIKE '${M}%')` : '')) === '0'
      && q(`SELECT IFNULL(MAX(str_VALUE), '') FROM t_parameters WHERE str_KEY = '${CLE_SEUIL}'`) === seuilAvant);
  }
  const echecs = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
  process.exit(echecs ? 1 : 0);
})();
