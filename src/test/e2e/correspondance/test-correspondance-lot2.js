/* Correspondance produits grossistes / Prestige, lot 2 : trace des lignes importees et reception a la cloture du BL.
   1) Import d'un fichier Copharmed par la vraie fenetre « IMPORTER UNE COMMANDE » (liste des commandes) : 9 lignes,
      codes varies (doublon, espaces, code inconnu), quantites et prix differents d'une ligne a l'autre.
      - rapprochement fichier = ligne_import_grossiste = API import/{commande} = t_order_detail, ligne par ligne ;
      - bilan : une trace par ligne du fichier, une ligne de commande par fiche, rien d'autre dans les correspondances.
   2) BL de cette commande pose en base (6 fiches sur 7 recues), puis reception rejouee par l'API (meme methode que
      la cloture du BL ; la cloture reelle entre en stock et n'est pas faite ici) :
      - BL non cloture : rien ; BL cloture : creation (source BL), confirmation (AUTO et PROPOSEE), contradiction
        (AUTO -> CONTREDITE), signalement (VALIDEE, REJETEE : etat et fiche inchanges) ;
      - bilan : exactement une correspondance creee, les autres lignes de la table inchangees ; traces marquees
        (detail du BL, date, resultat) sauf la fiche non recue et le code inconnu ;
      - second passage : rien ; calcul du lot 1 ensuite : les correspondances apprises ou decidees restent ;
      - API produit, liste et import = base.
   Tout est retire a la fin (commande, BL, traces, correspondances, numero de commande, fichier de reconciliation). */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const URL_PRESTIGE = process.env.E2E_URL || (process.env.BASE || 'http://localhost:8080/prestige');
const WEB_INF = process.env.E2E_WEB_INF || 'D:\\payara5\\payara5\\glassfish\\domains\\domain1\\applications\\prestige\\WEB-INF';
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '--raw', '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r\n/g, '\n').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const SAUVE = 'e2e_correspondance_sauve2';
const M = 'E2E-CG2-';
const NOM_FICHIER = 'e2e-copharmed-lot2';

const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_LIBELLE = 'COPHARMED' AND str_STATUT = 'enable' LIMIT 1");
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");

/* 8 fiches Copharmed dont le code (CIP chez ce grossiste) ne designe qu'une fiche active a l'import (recherche par
   prefixe) : P[0..6] importees, P[7] sert d'« autre fiche » dans les correspondances existantes. */
function fiches() {
  const cand = lignes("SELECT fg.lg_FAMILLE_ID, TRIM(fg.str_CODE_ARTICLE) FROM t_famille_grossiste fg JOIN t_famille f ON f.lg_FAMILLE_ID = fg.lg_FAMILLE_ID"
    + " WHERE fg.lg_GROSSISTE_ID = '" + G + "' AND fg.str_STATUT = 'enable' AND f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0"
    + " AND TRIM(fg.str_CODE_ARTICLE) REGEXP '^[0-9]{7}$' ORDER BY f.lg_FAMILLE_ID LIMIT 30 OFFSET 300");
  const P = [];
  for (const [f, c] of cand) {
    if (P.length === 8) { break; }
    const n = q("SELECT COUNT(DISTINCT f.lg_FAMILLE_ID) FROM t_famille_grossiste fg JOIN t_famille f ON f.lg_FAMILLE_ID = fg.lg_FAMILLE_ID"
      + " WHERE fg.str_STATUT = 'enable' AND f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0"
      + " AND (f.int_CIP LIKE '" + c + "%' OR f.int_EAN13 LIKE '" + c + "%' OR fg.str_CODE_ARTICLE LIKE '" + c + "%')");
    if (n === '1' && !P.some((x) => x.f === f || x.c === c)) { P.push({ f, c }); }
  }
  return P;
}

let parametre = null;
let commande = '';
let calculMax = 0;

function retirer() {
  if (commande) {
    q(`DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${M}B1'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${M}B1';`
      + ` DELETE FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${commande}'; DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${commande}';`
      + ` DELETE FROM t_order WHERE lg_ORDER_ID = '${commande}';`);
  }
  // lot 4 : la reception du BL ecrit aussi ses prix
  if (q("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'prix_grossiste'") === '1') {
    q(`DELETE FROM prix_grossiste WHERE source = 'BL' AND piece = '${M}B1'`);
  }
  if (parametre !== null) {
    q("UPDATE t_parameters SET str_VALUE = '" + parametre.replace(/'/g, "''") + "' WHERE str_KEY = 'KEY_LAST_ORDER_COMMAND_NUMBER'");
  }
  if (q("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '" + SAUVE + "'") === '1') {
    q('DELETE FROM correspondance_grossiste; INSERT INTO correspondance_grossiste SELECT * FROM ' + SAUVE + ';'
      + ' DROP TABLE ' + SAUVE + '; DELETE FROM correspondance_calcul WHERE id > ' + calculMax + ';');
  }
  try {
    for (const f of fs.readdirSync(WEB_INF).filter((x) => x.startsWith(NOM_FICHIER + '-verif'))) { fs.unlinkSync(path.join(WEB_INF, f)); }
  } catch (e) { /* dossier absent : rien a retirer */ }
}

(async () => {
  for (const t of ['correspondance_grossiste', 'ligne_import_grossiste']) {
    if (q("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '" + t + "'") !== '1') {
      console.error('Table ' + t + ' absente : deployer la branche (migrations V7.6.0 et V7.6.1)'); process.exit(2);
    }
  }
  const P = fiches();
  if (!G || P.length < 8) { console.error('Jeu d\'essai introuvable (Copharmed, 8 fiches)'); process.exit(2); }
  const F = P.map((x) => x.f), C = P.map((x) => x.c);
  parametre = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_LAST_ORDER_COMMAND_NUMBER'");
  calculMax = Number(q('SELECT IFNULL(MAX(id),0) FROM correspondance_calcul'));
  q('DROP TABLE IF EXISTS ' + SAUVE + '; CREATE TABLE ' + SAUVE + ' AS SELECT * FROM correspondance_grossiste;');

  /* correspondances existantes (l'ecran de validation viendra au lot 3) */
  q(`DELETE FROM correspondance_grossiste WHERE cle_grossiste = '${G}' AND code_grossiste IN ('${C.join("','")}', 'E2EINCONNU9');`);
  const poser = (code, famille, etat, source, motif, candidats) => q('INSERT INTO correspondance_grossiste (cle_grossiste, lg_GROSSISTE_ID, code_grossiste, lg_FAMILLE_ID, etat, source, motif, score, candidats, dt_creation, dt_maj)'
    + ` VALUES ('${G}', '${G}', '${code}', ${famille ? "'" + famille + "'" : 'NULL'}, '${etat}', '${source}', '${motif}', 1.000, '${JSON.stringify(candidats)}', NOW(3) - INTERVAL 1 DAY, NOW(3) - INTERVAL 1 DAY)`);
  poser(C[0], F[0], 'AUTO_EXACTE', 'CODE_GROSSISTE', 'CODE_GROSSISTE_CONNU', [F[0]]); // confirmee
  poser(C[1], F[7], 'AUTO_EXACTE', 'CODE_GROSSISTE', 'CODE_GROSSISTE_CONNU', [F[7]]); // contredite
  // C[2] : validee pour une autre fiche APRES l'import (l'import suit une validation : voir plus bas)
  poser(C[4], null, 'PROPOSEE', 'CODE_GROSSISTE', 'CODE_AMBIGU', [F[7], F[4]]); // confirmee (candidate)
  poser(C[5], null, 'REJETEE', 'HUMAIN', 'CONSERVEE', [F[5]]); // signalee, reste rejetee
  poser(C[6], F[6], 'AUTO_EXACTE', 'CODE_GROSSISTE', 'CODE_GROSSISTE_CONNU', [F[6]]); // importee, non recue
  // C[3] : aucune correspondance -> creee par le BL
  const ligneCorr = (code) => lignes(`SELECT etat, source, IFNULL(motif,''), IFNULL(lg_FAMILLE_ID,''), nb_confirmations, nb_contradictions, IFNULL(famille_contradiction,''),`
    + ` dt_derniere_confirmation IS NOT NULL, dt_derniere_contradiction IS NOT NULL, IFNULL(designation_grossiste,''), score, dt_maj FROM correspondance_grossiste WHERE cle_grossiste = '${G}' AND code_grossiste = '${code}'`)[0] || [];
  const autres = () => q(`SELECT COUNT(*), IFNULL(SUM(CRC32(CONCAT_WS('|', id, etat, source, IFNULL(lg_FAMILLE_ID,''), nb_confirmations, nb_contradictions, dt_maj))),0) FROM correspondance_grossiste`
    + ` WHERE NOT (cle_grossiste = '${G}' AND code_grossiste IN ('${C.join("','")}'))`);
  const autresAvant = autres();

  /* fichier Copharmed : [0] date, [1] facture, [2] ligne, [4] code, [6] designation, [8] commandee, [9] livree,
     [10] UG, [11] prix de cession HT, [13] prix public */
  const L = [
    { code: C[0], des: 'E2E LIGNE UN', qte: 2, ug: 0, paf: 1037, pu: 1550, f: F[0] },
    { code: C[1], des: 'E2E LIGNE DEUX', qte: 1, ug: 1, paf: 2210, pu: 3100, f: F[1] },
    { code: C[2], des: 'E2E LIGNE TROIS', qte: 4, ug: 0, paf: 845, pu: 1200, f: F[2] },
    { code: ' ' + C[3] + ' ', des: 'E2E LIGNE QUATRE', qte: 1, ug: 0, paf: 12990, pu: 17800, f: F[3] },
    { code: C[4], des: 'E2E LIGNE CINQ', qte: 2, ug: 0, paf: 505, pu: 700, f: F[4] },
    { code: C[5], des: 'E2E LIGNE SIX', qte: 1, ug: 0, paf: 3333, pu: 4600, f: F[5] },
    { code: C[6], des: 'E2E LIGNE SEPT', qte: 6, ug: 2, paf: 150, pu: 210, f: F[6] },
    { code: 'E2EINCONNU9', des: 'E2E PRODUIT INCONNU', qte: 1, ug: 0, paf: 999, pu: 1400, f: '' },
    { code: C[0], des: 'E2E LIGNE UN BIS', qte: 3, ug: 0, paf: 1037, pu: 1550, f: F[0] },
  ];
  const csv = ['Date;Facture;Ligne;Rubrique;Code;Ref;Designation;Lot;Commandee;Livree;UG;PrixHT;Taxe;PrixPublic']
    .concat(L.map((l, i) => ['08/11/2026', 'E2E-F1', i + 1, '', l.code, '', l.des, '', l.qte, l.qte, l.ug, l.paf + '.0', '0', l.pu].join(';'))).join('\r\n') + '\r\n';
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-cg2-'));
  const fichier = path.join(dossier, NOM_FICHIER + '.csv');
  fs.writeFileSync(fichier, csv);

  const b = await ENV_E2E.lancer(chromium);
  try {
    const anonyme = await b.newPage();
    await anonyme.goto(URL_PRESTIGE + '/', { waitUntil: 'domcontentloaded' });
    const st = await anonyme.evaluate(async (u) => (await fetch(u + '/api/v1/correspondance-grossiste/reception-bl/x', { method: 'POST' })).status, URL_PRESTIGE);
    const st2 = await anonyme.evaluate(async (u) => (await fetch(u + '/api/v1/correspondance-grossiste/import/x')).status, URL_PRESTIGE);
    ok('reception et lecture des imports refusees sans session (401)', st === 401 && st2 === 401, st + ' ' + st2);
    await anonyme.close();

    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    await p.goto(URL_PRESTIGE + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    const api = (chemin, methode) => p.evaluate(async (a) => {
      const r = await fetch(a.u + '/api/v1/correspondance-grossiste/' + a.c, { method: a.m || 'GET' });
      return { status: r.status, corps: await r.json().catch(() => null) };
    }, { u: URL_PRESTIGE, c: chemin, m: methode });

    /* ---- 1) import par l'ecran : commandes en cours > IMPORTER UNE COMMANDE */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('i_order_manager', '', '', ''));
    await p.locator('text=IMPORTER UNE COMMANDE').first().click({ timeout: 30000 });
    await p.waitForFunction(() => Ext.getCmp('xlsxdialog') && Ext.getCmp('formImport') && Ext.getCmp('formImport').rendered, null, { timeout: 15000 });
    await p.setInputFiles('#xlsxdialog input[type=file]', fichier);
    const champ = (nom) => p.evaluate((n) => Ext.getCmp('formImport').down('[name=' + n + ']').inputEl.id, nom);
    await p.click('#' + await champ('modeBL'));
    await p.keyboard.type('COPH');
    await p.locator('.x-boundlist-item:visible', { hasText: /^COPHARMED$/ }).first().click();
    await p.click('#' + await champ('lg_GROSSISTE_ID'));
    await p.keyboard.type('COPHARMED');
    await p.locator('.x-boundlist-item:visible', { hasText: /^COPHARMED$/ }).first().click({ timeout: 20000 });
    const choix = await p.evaluate(() => { const f = Ext.getCmp('formImport'); return f.down('[name=modeBL]').getValue() + '|' + f.down('[name=lg_GROSSISTE_ID]').getValue(); });
    ok('fenetre d\'import : modele COPHARMED et grossiste COPHARMED choisis', choix === 'COPHARMED|' + G, choix);
    const bouton = await p.evaluate(() => Ext.getCmp('formImport').down('button[text=Importer]').id);
    const [reponse] = await Promise.all([
      p.waitForResponse((r) => r.url().includes('/commande?action=import'), { timeout: 120000 }),
      p.click('#' + bouton),
    ]);
    const corps = JSON.parse(await reponse.text());
    commande = corps.orderId || '';
    ok('import accepte : 8 lignes reconnues sur 9, le code inconnu non reconnu', commande && corps.nbReconnus === 8 && corps.nbTotal === 9
      && corps.nonReconnus.length === 1 && corps.nonReconnus[0].cip === 'E2EINCONNU9', JSON.stringify(corps).slice(0, 250));

    /* rapprochement fichier = traces = API = commande */
    const traces = lignes(`SELECT rang, lg_GROSSISTE_ID, code_brut, IFNULL(code_normalise,''), IFNULL(designation_brute,''), IFNULL(lg_FAMILLE_ID,''), IFNULL(lg_ORDERDETAIL_ID,''),`
      + ` quantite, prix_achat, IFNULL(lg_BON_LIVRAISON_DETAIL,''), dt_application IS NULL, IFNULL(resultat,''), id FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${commande}' ORDER BY rang`);
    ok('une trace par ligne du fichier (9), rangs 1 a 9', traces.length === 9 && traces.every((t, i) => Number(t[0]) === i + 1), traces.length);
    const ecarts = [];
    L.forEach((l, i) => {
      const t = traces[i] || [];
      const attendu = [G, l.code.trim(), l.code.trim(), l.des, l.f, l.qte, l.paf].join('|');
      const lu = [t[1], t[2], t[3], t[4], t[5], t[7], t[8]].join('|');
      if (attendu !== lu) { ecarts.push((i + 1) + ': ' + attendu + ' <> ' + lu); }
    });
    ok('fichier = traces ligne par ligne (grossiste, code brut et normalise, designation, fiche, quantite, prix)', ecarts.length === 0, ecarts.slice(0, 3));
    const details = new Map(lignes(`SELECT lg_FAMILLE_ID, lg_ORDERDETAIL_ID, int_NUMBER, int_PAF_DETAIL FROM t_order_detail WHERE lg_ORDER_ID = '${commande}'`).map((x) => [x[0], x]));
    ok('bilan commande : une ligne par fiche reconnue (7), doublon cumule (2 + 3 = 5)', details.size === 7 && details.get(F[0]) && details.get(F[0])[2] === '5', [...details.values()].map((x) => x[2]).join(','));
    const ecartsDetail = [];
    traces.forEach((t, i) => {
      const d = details.get(t[5]);
      if (L[i].f ? !d || d[1] !== t[6] : t[6] !== '') { ecartsDetail.push(i + 1); }
    });
    const qteParFiche = {};
    L.forEach((l) => { if (l.f) { qteParFiche[l.f] = (qteParFiche[l.f] || 0) + l.qte; } });
    ok('trace -> ligne de commande de la meme fiche ; somme des quantites tracees = quantite commandee',
      ecartsDetail.length === 0 && Object.keys(qteParFiche).every((f) => details.get(f) && Number(details.get(f)[2]) === qteParFiche[f]), ecartsDetail);
    ok('aucune trace appliquee avant la reception', traces.every((t) => t[10] === '1' && t[9] === '' && t[11] === ''));
    let r = await api('import/' + commande);
    const ecartsApi = [];
    (r.corps && r.corps.data || []).forEach((x, i) => {
      const t = traces[i];
      const lu = [x.rang, x.grossisteId, x.codeBrut, x.codeNormalise || '', x.designation || '', x.familleId || '', x.commandeDetailId || '', x.quantite, x.prixAchat].join('|');
      if (lu !== t.slice(0, 9).join('|') || (x.familleId && !x.famille)) { ecartsApi.push(lu + ' <> ' + t.slice(0, 9).join('|')); }
    });
    ok('API import/{commande} = base, ligne par ligne', r.status === 200 && r.corps.data.length === 9 && ecartsApi.length === 0, ecartsApi.slice(0, 2));
    ok('l\'import ne touche pas aux correspondances', autres() === autresAvant && ligneCorr(C[0])[4] === '0' && ligneCorr(C[3]).length === 0);

    /* validation faite entre l'import et la reception : C[2] valide pour une autre fiche que celle du fichier */
    poser(C[2], F[7], 'VALIDEE', 'HUMAIN', 'CONSERVEE', [F[7]]);
    /* ---- 2) BL de la commande : F0..F5 recues, F6 non recue */
    q(`INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, direct_import)
      VALUES ('${M}B1', '${M}BL1', CURDATE(), 0, 0, 0, '${commande}', 'enable', NOW(), NOW(), '${ADMIN}', 1);`
      + F.slice(0, 6).map((f, i) => `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PAF, int_PRIX_VENTE, int_PA_REEL, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK, lg_ZONE_GEO_ID)
      SELECT '${M}D${i}', '${G}', '${f}', '${M}B1', 1, 0, 1, 1000, 1500, 1000, 'enable', NOW(), NOW(), 0, 0, 0, lg_ZONE_GEO_ID FROM t_famille WHERE lg_FAMILLE_ID = '${f}';`).join(''));
    r = await api('reception-bl/' + M + 'B1', 'POST');
    ok('BL non cloture : aucune reception, rien d\'ecrit', r.status === 200 && r.corps.receptions === 0
      && q(`SELECT COUNT(*) FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${commande}' AND dt_application IS NOT NULL`) === '0', JSON.stringify(r.corps));
    q(`UPDATE t_bon_livraison SET str_STATUT = 'is_Closed' WHERE lg_BON_LIVRAISON_ID = '${M}B1'`);
    const avant = C.map(ligneCorr);
    const nbAvant = Number(q('SELECT COUNT(*) FROM correspondance_grossiste'));
    r = await api('reception-bl/' + M + 'B1', 'POST');
    ok('BL cloture : 6 receptions = 1 creee + 2 confirmees + 1 contredite + 2 signalees', r.status === 200 && r.corps.receptions === 6 && r.corps.creer === 1
      && r.corps.confirmer === 2 && r.corps.contredire === 1 && r.corps.signaler === 2, JSON.stringify(r.corps));
    const apres = C.map(ligneCorr);
    const resume = (x) => x.slice(0, 9).join('|');
    ok('AUTO confirmee : meme fiche, 1 confirmation datee, aucune contradiction', resume(apres[0]) === ['AUTO_EXACTE', 'CODE_GROSSISTE', 'CODE_GROSSISTE_CONNU', F[0], 1, 0, '', 1, 0].join('|'), resume(apres[0]));
    ok('AUTO contredite : CONTREDITE, fiche d\'origine gardee, fiche recue notee, 1 contradiction datee',
      resume(apres[1]) === ['CONTREDITE', 'CODE_GROSSISTE', 'CODE_GROSSISTE_CONNU', F[7], 0, 1, F[1], 0, 1].join('|'), resume(apres[1]));
    ok('VALIDEE recue pour une autre fiche : reste VALIDEE sur sa fiche, contradiction signalee',
      resume(apres[2]) === ['VALIDEE', 'HUMAIN', 'CONSERVEE', F[7], 0, 1, F[2], 0, 1].join('|'), resume(apres[2]));
    ok('code inconnu des correspondances : cree AUTO, source BL, RECU_EN_BL, score 0,95, designation du fichier, 1 confirmation',
      resume(apres[3]) === ['AUTO_EXACTE', 'BL', 'RECU_EN_BL', F[3], 1, 0, '', 1, 0].join('|') && apres[3][9] === 'E2E LIGNE QUATRE' && Number(apres[3][10]) === 0.95, apres[3].join('|'));
    ok('PROPOSEE recue pour une candidate : reste a valider, 1 confirmation', resume(apres[4]) === ['PROPOSEE', 'CODE_GROSSISTE', 'CODE_AMBIGU', '', 1, 0, '', 1, 0].join('|'), resume(apres[4]));
    ok('REJETEE recue : reste REJETEE, contradiction signalee', resume(apres[5]) === ['REJETEE', 'HUMAIN', 'CONSERVEE', '', 0, 1, F[5], 0, 1].join('|'), resume(apres[5]));
    ok('fiche importee mais non recue : correspondance inchangee', apres[6].join('|') === avant[6].join('|'), apres[6].join('|'));
    ok('bilan : une seule correspondance creee, toutes les autres lignes de la table inchangees',
      autres() === autresAvant && Number(q('SELECT COUNT(*) FROM correspondance_grossiste')) === nbAvant + 1, autres() + ' / ' + autresAvant);
    const attenduTrace = ['CONFIRMER', 'CONTREDIRE', 'SIGNALER', 'CREER', 'CONFIRMER', 'SIGNALER', '', '', 'CONFIRMER'];
    const traces2 = lignes(`SELECT rang, IFNULL(lg_BON_LIVRAISON_DETAIL,''), dt_application IS NOT NULL, IFNULL(resultat,''), IFNULL(lg_FAMILLE_ID,'') FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${commande}' ORDER BY rang`);
    const ecartsTrace = traces2.filter((t, i) => {
      const k = F.indexOf(t[4]);
      return t[3] !== attenduTrace[i] || t[2] !== (attenduTrace[i] ? '1' : '0') || t[1] !== (attenduTrace[i] ? M + 'D' + k : '');
    }).map((t) => t.join('|'));
    ok('traces : detail du BL, date et resultat sur les 7 lignes recues (doublon compris), rien sur la fiche non recue ni le code inconnu', ecartsTrace.length === 0, ecartsTrace);

    /* rapprochement API */
    r = await api('import/' + commande);
    ok('API import : resultat et detail du BL = base', r.corps.data.every((x, i) => (x.resultat || '') === traces2[i][3] && (x.blDetailId || '') === traces2[i][1] && (!x.resultat || x.dateApplication)));
    const idCorr = (code) => Number(q(`SELECT id FROM correspondance_grossiste WHERE cle_grossiste = '${G}' AND code_grossiste = '${code}'`));
    const pr7 = await api('produit/' + encodeURIComponent(F[7]));
    const pr1 = await api('produit/' + encodeURIComponent(F[1]));
    const c1 = (pr1.corps.data || []).find((x) => x.id === idCorr(C[1])) || {};
    ok('API produit : la correspondance contredite apparait sur sa fiche et sur la fiche recue, avec la contradiction',
      [idCorr(C[1]), idCorr(C[2]), idCorr(C[4])].every((id) => pr7.corps.data.some((x) => x.id === id)) && c1.etat === 'CONTREDITE'
      && c1.familleContradictionId === F[1] && !!c1.familleContradiction && !!c1.dateDerniereContradiction && c1.nbContradictions === 1, JSON.stringify(c1).slice(0, 250));
    const lc = await api('liste?etat=CONTREDITE&grossiste=' + G + '&limit=500');
    ok('API liste CONTREDITE = base', lc.corps.total === Number(q(`SELECT COUNT(*) FROM correspondance_grossiste WHERE etat = 'CONTREDITE' AND cle_grossiste = '${G}'`))
      && lc.corps.data.some((x) => x.id === idCorr(C[1]) && x.familleContradictionId === F[1]), lc.corps.total);

    /* second passage : rien */
    const fige = C.map(ligneCorr).map((x) => x.join('|')).join(';');
    r = await api('reception-bl/' + M + 'B1', 'POST');
    ok('second passage : aucune reception, aucune ligne reecrite', r.corps.receptions === 0 && C.map(ligneCorr).map((x) => x.join('|')).join(';') === fige, JSON.stringify(r.corps));

    /* calcul du lot 1 ensuite : appris (BL) et decides restent */
    r = await api('calculer', 'POST');
    const apresCalcul = C.slice(0, 6).map(ligneCorr);
    ok('calcul du lot 1 apres reception : correspondance apprise du BL, contredite et validee inchangees',
      r.status === 200 && [1, 2, 3, 5].every((i) => apresCalcul[i].join('|') === apres[i].join('|')), r.corps && JSON.stringify(r.corps.calcul).slice(0, 200));

    /* reconciliation laissee par l'import : fermee par le vrai chemin (liste vide) */
    const rec = await p.evaluate(async (a) => (await fetch(a.u + '/commande?action=reconciliation-save&orderId=' + a.o, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nonReconnus: [] }) })).json(), { u: URL_PRESTIGE, o: commande });
    ok('reconciliation de la commande d\'essai fermee', rec && rec.success === true, JSON.stringify(rec));
    await p.close();
  } catch (e) {
    ok('execution sans exception', false, e && e.stack);
  } finally {
    await b.close();
    retirer();
    fs.rmSync(dossier, { recursive: true, force: true });
    ok('remise en etat : commande, BL, traces, correspondances, journal et numero de commande',
      (!commande || q(`SELECT (SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${commande}') + (SELECT COUNT(*) FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${commande}')`
        + ` + (SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${M}B1')`) === '0')
      && Number(q('SELECT COUNT(*) FROM correspondance_calcul WHERE id > ' + calculMax)) === 0
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_LAST_ORDER_COMMAND_NUMBER'") === parametre);
  }
  const echecs = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
  process.exit(echecs ? 1 : 0);
})();
