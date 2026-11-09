/* RETOURS FOURNISSEURS : RAPPROCHEMENT DE L'ETAT, DU MOTIF ET DE L'AUTEUR (partie 2 de la demande 59, transmission
 * du 07/11). Une meme donnee est lue a six endroits et comparee ligne par ligne :
 *   base (requete independante) = reponse mobile (GET v1/produit/retours-data) = historique (route) = liste de l'ecran
 *   (etat affiche et infobulle) = tableau de bord de l'ecran (tuiles par etat, retours a traiter) = export Excel de la
 *   liste (bouton) = classeur du tableau de bord (bouton).
 * Jeu d'essai, cinq retours sur un meme BL, deux motifs, quantites differentes :
 *   RA en attente (2 lignes : 3 et 2) ; RR refuse (motif 1), puis ligne corrigee de 4 a 3 en etat refuse ;
 *   RB refuse (motif 2) puis abandonne (2 lignes : 2 et 1) ; RV valide (1 ligne : 1), valide par un autre utilisateur
 *   (historique) ; RS en saisie (absent partout).
 * Controles : un retour refuse ou abandonne n'est jamais compte comme valide (tuiles = base, rubriques du tableau =
 * retours valides seuls) ; le refus d'un retour valide est refuse (409 ETAT) et rien ne change ; stock et mouvements
 * du produit inchanges. Les etats sont poses par les routes de l'ecran (mise en attente, refus, abandon, correction) ;
 * leur parcours par les clics est couvert par test-retours-refus-abandon.js. Tout est retire a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOTE = 'E2E-RETOUR-RAPPR';
const MOTIF1 = 'Quantité à revoir (rapprochement)', MOTIF2 = 'Lot erroné (rapprochement)';
const debut = q('SELECT NOW()');
const AUJ = q("SELECT CURDATE()"), AUJ_FR = q("SELECT DATE_FORMAT(CURDATE(), '%d/%m/%Y')");
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const nom = (id) => q(`SELECT TRIM(CONCAT(COALESCE(str_FIRST_NAME, ''), ' ', COALESCE(str_LAST_NAME, ''))) FROM t_user WHERE lg_USER_ID = '${id}'`);
const TIERS = q(`SELECT lg_USER_ID FROM t_user WHERE lg_USER_ID <> '${ADMIN}' AND str_STATUT = 'enable'`
  + ` AND TRIM(CONCAT(COALESCE(str_FIRST_NAME, ''), ' ', COALESCE(str_LAST_NAME, ''))) <> '' ORDER BY lg_USER_ID LIMIT 1`);
/* un BL clos dont deux produits ont au moins 4 boites recues et du stock */
const lignesBl = q("SELECT CONCAT_WS('|', b.str_REF_LIVRAISON, d.lg_FAMILLE_ID) FROM t_bon_livraison b"
  + " JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.int_NUMBER_AVAILABLE > 8"
  + " WHERE d.int_QTE_RECUE >= 4 AND b.str_STATUT <> 'delete'"
  + " AND (SELECT COUNT(*) FROM t_bon_livraison x WHERE x.str_REF_LIVRAISON = b.str_REF_LIVRAISON) = 1"
  + " AND b.lg_BON_LIVRAISON_ID = (SELECT y.lg_BON_LIVRAISON_ID FROM t_bon_livraison_detail y JOIN t_bon_livraison z ON z.lg_BON_LIVRAISON_ID = y.lg_BON_LIVRAISON_ID"
  + "   JOIN t_famille_stock t ON t.lg_FAMILLE_ID = y.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID = '1' AND t.int_NUMBER_AVAILABLE > 8"
  + "   WHERE y.int_QTE_RECUE >= 4 AND z.str_STATUT <> 'delete' AND (SELECT COUNT(*) FROM t_bon_livraison w WHERE w.str_REF_LIVRAISON = z.str_REF_LIVRAISON) = 1"
  + "   GROUP BY y.lg_BON_LIVRAISON_ID HAVING COUNT(DISTINCT y.lg_FAMILLE_ID) >= 2 ORDER BY MAX(z.dt_CREATED) DESC LIMIT 1)"
  + " ORDER BY d.lg_FAMILLE_ID LIMIT 2").split(/\r?\n/).filter(Boolean).map((l) => l.split('|'));
const BL = lignesBl[0] && lignesBl[0][0], P1 = lignesBl[0] && lignesBl[0][1], P2 = lignesBl[1] && lignesBl[1][1];
const [M1, M2] = q("SELECT lg_MOTIF_RETOUR FROM t_motif_retour ORDER BY lg_MOTIF_RETOUR LIMIT 2").split(/\r?\n/);
const stocks = () => q(`SELECT GROUP_CONCAT(int_NUMBER_AVAILABLE ORDER BY lg_FAMILLE_ID) FROM t_famille_stock WHERE lg_FAMILLE_ID IN ('${P1}', '${P2}') AND lg_EMPLACEMENT_ID = '1'`);
const mvts = () => q(`SELECT COUNT(*) FROM HMvtProduit WHERE lg_FAMILLE_ID IN ('${P1}', '${P2}')`);
const STOCK0 = stocks(), MVT0 = mvts();

/* retours du test : par leur commentaire, et par leur identifiant (un commentaire efface ne laisse rien) */
const idsCrees = [];
const parId = () => (idsCrees.length ? ` OR lg_RETOUR_FRS_ID IN (${idsCrees.map((x) => `'${x}'`).join(',')})` : '');
function retirer() {
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'${parId()}`);
  const refs = q(`SELECT IFNULL(GROUP_CONCAT(str_REF_RETOUR_FRS SEPARATOR '|'), '') FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'${parId()}`).split('|').filter(Boolean);
  const det = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_DETAIL, "'")), "''") FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids})`);
  exec(`DELETE FROM HMvtProduit WHERE pkey IN (${det});`
    + `DELETE FROM notification WHERE entity_ref IN (${ids});`
    + `DELETE FROM t_retour_fournisseur_historique WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + (refs.length ? `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND (` + refs.map((r) => `str_DESCRIPTION LIKE '%${r}%' OR str_TYPE_LOG = '${r}'`).join(' OR ') + ');' : '')
    + `DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${ids});`);
}

/* attendu, calcule en base sans le code du serveur : etat, motif, auteur et date de l'etat, lignes, quantite */
const LIB = { is_Waiting: 'En attente de validation', is_Refused: 'Refusé', is_Abandoned: 'Abandonné', enable: 'Validé', is_Process: 'En saisie' };
function attendu(id) {
  const derniere = (action, champ) => `(SELECT ${champ} FROM t_retour_fournisseur_historique h LEFT JOIN t_user u ON u.lg_USER_ID = h.lg_USER_ID`
    + ` WHERE h.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID AND h.action = '${action}' ORDER BY h.dt_ACTION DESC LIMIT 1)`;
  const nomU = (a) => `TRIM(CONCAT(COALESCE(${a}.str_FIRST_NAME, ''), ' ', COALESCE(${a}.str_LAST_NAME, '')))`;
  const l = q("SELECT CONCAT_WS('~#~', r.str_REF_RETOUR_FRS, r.str_STATUT, IFNULL(r.str_MOTIF_REFUS, ''),"
    + ` CASE r.str_STATUT WHEN 'is_Refused' THEN ${nomU('ur')} WHEN 'is_Waiting' THEN ${nomU('ua')}`
    + `   WHEN 'is_Abandoned' THEN ${derniere('ABANDON', nomU('u'))} WHEN 'enable' THEN ${derniere('VALIDATION', nomU('u'))} END,`
    + ` CASE r.str_STATUT WHEN 'is_Refused' THEN DATE_FORMAT(r.dt_REFUS, '%d/%m/%Y %H:%i') WHEN 'is_Waiting' THEN DATE_FORMAT(r.dt_ATTENTE, '%d/%m/%Y %H:%i')`
    + `   WHEN 'is_Abandoned' THEN ${derniere('ABANDON', "DATE_FORMAT(h.dt_ACTION, '%d/%m/%Y %H:%i')")}`
    + `   WHEN 'enable' THEN ${derniere('VALIDATION', "DATE_FORMAT(h.dt_ACTION, '%d/%m/%Y %H:%i')")} END,`
    + ` (SELECT COUNT(*) FROM t_retour_fournisseur_detail d WHERE d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID),`
    + ` (SELECT IFNULL(SUM(d.int_NUMBER_RETURN), 0) FROM t_retour_fournisseur_detail d WHERE d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID),`
    + ` (SELECT GROUP_CONCAT(CONCAT(f.int_CIP, ':', d.int_NUMBER_RETURN) ORDER BY f.int_CIP, d.int_NUMBER_RETURN SEPARATOR ',') FROM t_retour_fournisseur_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID))`
    + ` FROM t_retour_fournisseur r LEFT JOIN t_user ur ON ur.lg_USER_ID = r.lg_USER_REFUS LEFT JOIN t_user ua ON ua.lg_USER_ID = r.lg_USER_ATTENTE WHERE r.lg_RETOUR_FRS_ID = '${id}'`).split('~#~');
  return { id, ref: l[0], statut: l[1], etat: LIB[l[1]], motif: l[2], auteur: l[3], date: l[4], lignes: Number(l[5]), quantite: Number(l[6]), detail: l[7] };
}
/* tuiles par etat, en base : regle de la liste par defaut (valides et abandonnes du jour, attente et refuses toujours) */
const compteBase = (statut, periode) => Number(q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_STATUT = '${statut}'` + (periode ? ` AND DATE(dt_UPDATED) = '${AUJ}'` : '')));
const quantiteBase = (statut, periode) => Number(q(`SELECT IFNULL(SUM(d.int_NUMBER_RETURN), 0) FROM t_retour_fournisseur r JOIN t_retour_fournisseur_detail d ON d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID`
  + ` WHERE r.str_STATUT = '${statut}'` + (periode ? ` AND DATE(r.dt_UPDATED) = '${AUJ}'` : '')));
/* lecture d'un classeur (xls ou xlsx) : toutes les feuilles, cellules en texte */
function lireClasseur(chemin) {
  const code = "import sys, json\np = sys.argv[1]\nout = {}\n"
    + "try:\n import openpyxl\n wb = openpyxl.load_workbook(p, read_only=True, data_only=True)\n"
    + " for ws in wb.worksheets:\n  out[ws.title] = [['' if v is None else (str(int(v)) if isinstance(v, float) and v == int(v) else str(v)) for v in r] for r in ws.iter_rows(values_only=True)]\n"
    + "except Exception:\n import xlrd\n wb = xlrd.open_workbook(p)\n"
    + " for ws in wb.sheets():\n  out[ws.name] = [[(str(int(c.value)) if isinstance(c.value, float) and c.value == int(c.value) else str(c.value)) for c in ws.row(i)] for i in range(ws.nrows)]\n"
    + "sys.stdout.buffer.write(json.dumps(out, ensure_ascii=False).encode('utf-8'))\n";
  return JSON.parse(execFileSync('python', ['-I', '-c', code, chemin], { encoding: 'utf8' }));
}

(async () => {
  retirer();
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  let p;
  const ids = {};
  try {
    ok('Précondition : un BL avec deux produits en stock, deux motifs, un autre utilisateur', !!BL && !!P1 && !!P2 && !!M1 && !!M2 && !!TIERS, [BL, P1, P2, M1, M2, TIERS].join(' '));
    p = await (await b.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
      let j = null; try { j = await r.json(); } catch (e) { /* vide */ } return { status: r.status, j }; }, [m, u, c]);
    /* creation comme l'ecran : premiere ligne par « new », les suivantes par « add-item » */
    const creer = async (items) => { const r = await api('POST', '../api/v1/retourfournisseur/new', { lgBONLIVRAISONID: BL, strCOMMENTAIRE: NOTE, items: items.slice(0, 1) });
      const id = r.j && r.j.data && r.j.data.lgRETOURFRSID;
      for (const it of items.slice(1)) { if (id) { await api('POST', '../api/v1/retourfournisseur/add-item', { lgRETOURFRSID: id, ...it }); } }
      if (id) { idsCrees.push(id); }
      return id; };
    const enAttente = (id) => api('POST', '../api/v1/retourfournisseur/mettre-en-attente', { description: NOTE, ref: id });

    /* ----- jeu d'essai ----- */
    ids.RA = await creer([{ produitId: P1, lgMOTIFRETOUR: M1, intNUMBERRETURN: 3 }, { produitId: P2, lgMOTIFRETOUR: M2, intNUMBERRETURN: 2 }]);
    ids.RR = await creer([{ produitId: P1, lgMOTIFRETOUR: M2, intNUMBERRETURN: 4 }]);
    ids.RB = await creer([{ produitId: P2, lgMOTIFRETOUR: M1, intNUMBERRETURN: 2 }, { produitId: P1, lgMOTIFRETOUR: M2, intNUMBERRETURN: 1 }]);
    ids.RV = await creer([{ produitId: P2, lgMOTIFRETOUR: M1, intNUMBERRETURN: 1 }]);
    ids.RS = await creer([{ produitId: P1, lgMOTIFRETOUR: M1, intNUMBERRETURN: 1 }]);
    const lignesCreees = q(`SELECT GROUP_CONCAT(n ORDER BY c SEPARATOR ',') FROM (SELECT r.str_REF_RETOUR_FRS c, COUNT(d.lg_RETOUR_FRS_DETAIL) n FROM t_retour_fournisseur r`
      + ` LEFT JOIN t_retour_fournisseur_detail d ON d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID WHERE r.str_COMMENTAIRE = '${NOTE}' GROUP BY r.lg_RETOUR_FRS_ID) x`);
    ok('Cinq retours créés (2, 1, 2, 1 et 1 lignes)', Object.values(ids).every(Boolean) && lignesCreees.split(',').map(Number).reduce((a, x) => a + x, 0) === 7, JSON.stringify(ids) + ' ' + lignesCreees);
    for (const k of ['RA', 'RR', 'RB']) { await enAttente(ids[k]); }
    const ref1 = await api('POST', '../api/v1/retourfournisseur/refuser/' + ids.RR, { motif: MOTIF1 });
    const ref2 = await api('POST', '../api/v1/retourfournisseur/refuser/' + ids.RB, { motif: MOTIF2 });
    const ab = await api('POST', '../api/v1/retourfournisseur/abandonner/' + ids.RB);
    ok('États posés : attente, refusé, refusé puis abandonné', ref1.j && ref1.j.success && ref2.j && ref2.j.success && ab.j && ab.j.success, JSON.stringify([ref1.j, ab.j]));
    /* retour valide : statut pose en base (aucune sortie de stock simulee), validation tracee par un autre utilisateur */
    exec(`UPDATE t_retour_fournisseur SET str_STATUT = 'enable', dt_UPDATED = NOW() WHERE lg_RETOUR_FRS_ID = '${ids.RV}';`
      + `UPDATE t_retour_fournisseur_detail SET str_STATUT = 'enable' WHERE lg_RETOUR_FRS_ID = '${ids.RV}';`
      + `INSERT INTO t_retour_fournisseur_historique (id, lg_RETOUR_FRS_ID, action, motif, lg_USER_ID, dt_ACTION) VALUES (UUID(), '${ids.RV}', 'VALIDATION', NULL, '${TIERS}', NOW());`);
    /* refus d'un retour valide : refuse, rien ne change */
    const histoRV = q(`SELECT COUNT(*) FROM t_retour_fournisseur_historique WHERE lg_RETOUR_FRS_ID = '${ids.RV}'`);
    const refV = await api('POST', '../api/v1/retourfournisseur/refuser/' + ids.RV, { motif: 'non' });
    ok('Refus d\'un retour validé : 409 ETAT, statut, motif et historique inchangés', refV.status === 409 && refV.j && refV.j.code === 'ETAT'
      && q(`SELECT CONCAT_WS('|', str_STATUT, IFNULL(str_MOTIF_REFUS, '-')) FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${ids.RV}'`) === 'enable|-'
      && q(`SELECT COUNT(*) FROM t_retour_fournisseur_historique WHERE lg_RETOUR_FRS_ID = '${ids.RV}'`) === histoRV, JSON.stringify(refV));
    /* correction des lignes d'un retour refuse (4 -> 3), par la route de la grille */
    const ligneRR = q(`SELECT lg_RETOUR_FRS_DETAIL FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${ids.RR}'`);
    const corr = await api('POST', '../api/v1/retourfournisseur/update-item', { lgRETOURFRSDETAIL: ligneRR, intNUMBERRETURN: 3 });
    ok('Correction d\'une ligne du retour refusé : 4 → 3, toujours refusé', corr.j && corr.j.success !== false
      && q(`SELECT CONCAT_WS('|', d.int_NUMBER_RETURN, r.str_STATUT) FROM t_retour_fournisseur_detail d JOIN t_retour_fournisseur r ON r.lg_RETOUR_FRS_ID = d.lg_RETOUR_FRS_ID WHERE d.lg_RETOUR_FRS_DETAIL = '${ligneRR}'`) === '3|is_Refused', JSON.stringify(corr.j));

    const A = {};
    for (const k of ['RA', 'RR', 'RB', 'RV']) { A[k] = attendu(ids[k]); }
    const NA = nom(ADMIN), NT = nom(TIERS);
    /* 1. base : la regle (auteur de l'etat) sur le jeu d'essai */
    ok('1. Base : attente (admin), refusé (admin, motif 1), abandonné (admin, motif 2 gardé), validé (validé par un autre)',
      A.RA.statut === 'is_Waiting' && A.RA.auteur === NA && A.RA.motif === '' && A.RA.quantite === 5
      && A.RR.statut === 'is_Refused' && A.RR.auteur === NA && A.RR.motif === MOTIF1 && A.RR.quantite === 3
      && A.RB.statut === 'is_Abandoned' && A.RB.auteur === NA && A.RB.motif === MOTIF2 && A.RB.quantite === 3
      && A.RV.statut === 'enable' && A.RV.auteur === NT && NT !== NA && A.RV.quantite === 1
      && Object.values(A).every((a) => /^\d\d\/\d\d\/\d{4} \d\d:\d\d$/.test(a.date)), JSON.stringify(A));

    /* 2. reponse mobile : GET v1/produit/retours-data (tous les etats, periode du jour) */
    const mob = await api('GET', `../api/v1/produit/retours-data?dtStart=${AUJ}&dtEnd=${AUJ}&start=0&limit=1000&etat=`);
    const rows = (mob.j && (mob.j.results || mob.j.data)) || [];
    for (const k of ['RA', 'RR', 'RB', 'RV']) {
      const r = rows.find((x) => x.lg_RETOUR_FRS_ID === ids[k]) || {};
      ok(`2. Réponse mobile ${k} : état, motif, auteur, date = base`, r.etat === A[k].etat && (r.motifRefus || '') === A[k].motif && r.auteur === A[k].auteur && r.dateEtat === A[k].date,
        JSON.stringify({ etat: r.etat, motif: r.motifRefus, auteur: r.auteur, date: r.dateEtat }) + ' / ' + JSON.stringify(A[k]));
    }
    ok('2. Réponse mobile : le retour en saisie n\'y est pas', !rows.some((x) => x.lg_RETOUR_FRS_ID === ids.RS));

    /* 3. historique : la derniere action porte l'auteur de l'etat */
    for (const [k, action] of [['RA', 'MISE_EN_ATTENTE'], ['RB', 'ABANDON'], ['RV', 'VALIDATION'], ['RR', 'REFUS']]) {
      const h = await api('GET', `../api/v1/retourfournisseur/${ids[k]}/historique`);
      const d = (h.j && h.j.data) || [];
      const der = d.filter((x) => x.action === action).pop() || {};
      ok(`3. Historique ${k} : dernière action ${action} par l'auteur de l'état` + (k === 'RR' ? ', avec le motif' : ''), der.par === A[k].auteur && (k !== 'RR' || der.motif === MOTIF1), JSON.stringify(der));
    }

    /* 4. liste de l'ecran : periode du jour, tous les etats ; etat affiche et infobulle */
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Retour fournisseur');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && Ext.getCmp('retourFrsEtat'); }, null, { timeout: 60000 });
    await saisir(p, '#datedebut', AUJ_FR);
    await saisir(p, '#datefin', AUJ_FR);
    await choisir(p, '#retourFrsEtat', 'Tous les états');
    await p.waitForTimeout(600);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('retourfrsmanager')[0].getStore().isLoading(), null, { timeout: 60000 });
    const lignesListe = await p.evaluate((ids) => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0], st = g.getStore(), o = {}, colonne = g.down('#colEtatRetour');
      Object.keys(ids).forEach((k) => { const i = st.findExact('lg_RETOUR_FRS_ID', ids[k]); if (i < 0) { return; }
        const n = g.getView().getNode(st.getAt(i)), td = n && n.querySelector('td.x-grid-cell-' + colonne.id);
        o[k] = { texte: td ? td.innerText.replace(/\s+/g, ' ').trim() : '', tip: td ? (td.getAttribute('data-qtip') || '') : '' }; });
      return o; }, ids);
    const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    for (const k of ['RA', 'RR', 'RB', 'RV']) {
      const l = lignesListe[k] || {}, tip = decode(l.tip || '');
      ok(`4. Liste ${k} : « ${A[k].etat} » affiché, infobulle avec l'auteur, la date` + (A[k].motif ? ' et le motif' : ''),
        l.texte.startsWith(A[k].etat) && tip.includes('par ' + A[k].auteur) && tip.includes(A[k].date) && (!A[k].motif || tip.includes(A[k].motif)), JSON.stringify(l));
    }
    ok('4. Liste : le retour en saisie n\'y est pas', !lignesListe.RS);

    /* 5. export Excel de la liste (bouton) : une ligne par produit, etat, motif, auteur, date, quantite */
    const telecharger = async (action) => {
      const t = new Promise((res) => {
        const minuterie = setTimeout(() => res(null), 120000);
        const fini = (d) => { clearTimeout(minuterie); res(d); };
        p.once('download', fini);
        p.context().once('page', (pg) => pg.waitForEvent('download', { timeout: 120000 }).then(fini, () => {}));
      });
      await action();
      const dl = await t;
      if (!dl) { return null; }
      const chemin = await dl.path();
      const copie = require('path').join(require('os').tmpdir(), 'e2e-rappr-' + Date.now() + '-' + dl.suggestedFilename());
      fs.copyFileSync(chemin, copie);
      return { nom: dl.suggestedFilename(), feuilles: lireClasseur(copie) };
    };
    const x1 = await telecharger(() => p.locator('.x-btn').filter({ visible: true }).filter({ hasText: /^\s*Export Excel\s*$/ }).first().click());
    const f1 = x1 ? Object.values(x1.feuilles)[0] : [];
    const iEntete = f1.findIndex((r) => r.includes('Etat'));
    const ent = f1[iEntete] || [], col = (n) => ent.indexOf(n);
    ok('5. Export Excel de la liste : colonnes d\'origine gardées, puis État, Motif du refus, Auteur, Date, Référence', x1 && iEntete >= 0
      && ent.slice(0, 8).join('|') === 'N° BL|Date retour|Heure|Fournisseur|Code produit|Libelle|Quantite retournee|Utilisateur'
      && col('Motif du refus') > 7 && col("Auteur de l'etat") > 7 && col("Date de l'etat") > 7 && col('Reference du retour') > 7, JSON.stringify(ent));
    for (const k of ['RA', 'RR', 'RB', 'RV']) {
      const lx = f1.slice(iEntete + 1).filter((r) => r[col('Reference du retour')] === A[k].ref);
      const detail = lx.map((r) => r[col('Code produit')] + ':' + r[col('Quantite retournee')]).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).join(',');
      const attenduDetail = A[k].detail.split(',').sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).join(',');
      ok(`5. Export ${k} : ${A[k].lignes} ligne(s), chacune avec état, motif, auteur et date = base, quantités = base`, lx.length === A[k].lignes && detail === attenduDetail
        && lx.every((r) => r[col('Etat')] === A[k].etat && r[col('Motif du refus')] === A[k].motif && r[col("Auteur de l'etat")] === A[k].auteur && r[col("Date de l'etat")] === A[k].date),
        JSON.stringify(lx.map((r) => r.slice(4))) + ' / ' + attenduDetail);
    }
    ok('5. Export : le retour en saisie n\'y est pas', !f1.some((r) => iEntete >= 0 && r[col('Reference du retour')] === q(`SELECT str_REF_RETOUR_FRS FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${ids.RS}'`)));

    /* 6. tableau de bord de l'ecran : tuiles par etat = base ; retours a traiter = base ; valides seuls ailleurs */
    await p.locator('.x-btn').filter({ visible: true }).filter({ hasText: 'Tableau de bord' }).first().click();
    await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('retoursfournisseur #tableauRetours')[0]; return t && t.isVisible(true); }, null, { timeout: 30000 });
    await saisir(p, 'retoursfournisseur #tbDebut', AUJ_FR);
    await saisir(p, 'retoursfournisseur #tbFin', AUJ_FR);
    await cliquer(p, 'retoursfournisseur #tbActualiser');
    await p.waitForTimeout(500);
    await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('retoursfournisseur #tableauRetours')[0];
      return !(t.loadMask && t.loadMask.isVisible()) && /Retours par utilisateur/.test(t.down('#tbContenu').getEl().dom.innerText); }, null, { timeout: 240000 });
    const tb = await p.evaluate(() => { const el = Ext.ComponentQuery.query('retoursfournisseur #tbContenu')[0].getEl().dom;
      const tuile = (c) => { const t = el.querySelector('.rf-etats .' + c); return t ? { n: Number(t.querySelector('.pml-tuile-valeur').innerText.replace(/\s/g, '')), detail: t.querySelector('.pml-tuile-detail').innerText } : null; };
      const retours = el.querySelector('.rf-tuiles .pml-tuile .pml-tuile-valeur');
      return { attente: tuile('rf-etat-attente'), refuse: tuile('rf-etat-refuse'), abandonne: tuile('rf-etat-abandonne'), valide: tuile('rf-etat-valide'),
        retours: retours ? Number(retours.innerText.replace(/\s/g, '')) : null,
        lignes: [...el.querySelectorAll('tr.rf-a-traiter-ligne')].map((tr) => [...tr.cells].map((c) => c.innerText.trim())) }; });
    const base = { attente: compteBase('is_Waiting', false), refuse: compteBase('is_Refused', false), abandonne: compteBase('is_Abandoned', true), valide: compteBase('enable', true) };
    const qte = { attente: quantiteBase('is_Waiting', false), refuse: quantiteBase('is_Refused', false), abandonne: quantiteBase('is_Abandoned', true), valide: quantiteBase('enable', true) };
    ok('6. Tableau de bord : tuiles En attente, Refusés, Abandonnés, Validés = base (retours et quantités)', ['attente', 'refuse', 'abandonne', 'valide'].every((k) => tb[k] && tb[k].n === base[k]
      && Number(tb[k].detail.replace(/\D/g, '')) === qte[k]), JSON.stringify({ tb: [tb.attente, tb.refuse, tb.abandonne, tb.valide], base, qte }));
    const validesAvecLignes = Number(q(`SELECT COUNT(DISTINCT r.lg_RETOUR_FRS_ID) FROM t_retour_fournisseur r JOIN t_retour_fournisseur_detail d ON d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID WHERE r.str_STATUT = 'enable' AND DATE(r.dt_UPDATED) = '${AUJ}'`));
    ok('6. Tableau de bord : « Retours » ne compte que les validés (refusés et abandonnés exclus) ; tuile Validés cohérente', tb.retours === validesAvecLignes && tb.valide && tb.valide.n >= tb.retours,
      tb.retours + ' / ' + validesAvecLignes);
    for (const k of ['RA', 'RR', 'RB']) {
      const l = tb.lignes.find((c) => c[0] === A[k].ref);
      ok(`6. Tableau de bord, retours à traiter ${k} : état, motif, auteur, date, lignes, quantité = base`, l && l[1] === A[k].etat && l[2] === A[k].motif && l[3] === A[k].auteur && l[4] === A[k].date
        && Number(l[5]) === A[k].lignes && Number(l[6].replace(/\s/g, '')) === A[k].quantite, JSON.stringify(l));
    }
    ok('6. Tableau de bord : ni le validé ni celui en saisie parmi les retours à traiter', !tb.lignes.some((c) => c[0] === A.RV.ref));

    /* 7. classeur du tableau de bord (bouton) : feuilles « États » et « Retours à traiter » = ecran */
    const x2 = await telecharger(() => cliquer(p, 'retoursfournisseur #tbExcel'));
    const fe = (x2 && x2.feuilles['États']) || [], ft = (x2 && x2.feuilles['Retours à traiter']) || [];
    const parLib = (lib) => fe.find((r) => r[0] === lib) || [];
    ok('7. Classeur du tableau : feuilles d\'origine gardées, feuille « États » = tuiles', x2 && ['Synthèse', 'Par mois', 'Produits', 'Motifs', 'Utilisateurs'].every((n) => x2.feuilles[n])
      && Number(parLib('En attente de validation')[1]) === base.attente && Number(parLib('Refusé')[1]) === base.refuse && Number(parLib('Abandonné')[1]) === base.abandonne
      && Number(parLib('Validé')[1]) === base.valide && Number(parLib('Validé')[3]) === qte.valide, JSON.stringify({ feuilles: x2 && Object.keys(x2.feuilles), fe }));
    ok('7. Classeur : « Synthèse » compte les seuls retours validés (= écran)', x2 && Number((x2.feuilles['Synthèse'][3] || [])[0]) === tb.retours, JSON.stringify(x2 && x2.feuilles['Synthèse']));
    for (const k of ['RA', 'RR', 'RB']) {
      const l = ft.find((r) => r[0] === A[k].ref);
      ok(`7. Classeur, retours à traiter ${k} = base`, l && l[1] === A[k].etat && l[2] === A[k].motif && l[3] === A[k].auteur && l[4] === A[k].date && Number(l[5]) === A[k].lignes && Number(l[6]) === A[k].quantite, JSON.stringify(l));
    }

    /* bilan : rien n'a bouge dans le stock */
    ok('Bilan : stock et mouvements des deux produits inchangés', stocks() === STOCK0 && mvts() === MVT0, stocks() + ' / ' + STOCK0 + ' ; ' + mvts() + ' / ' + MVT0);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Exception', false, e.stack);
  } finally {
    await b.close().catch(() => {});
    retirer();
    ok('Nettoyage : aucun retour d\'essai ni historique restant', q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'${parId()}`) === '0'
      && Object.values(ids).filter(Boolean).every((id) => q(`SELECT COUNT(*) FROM t_retour_fournisseur_historique WHERE lg_RETOUR_FRS_ID = '${id}'`) === '0'));
    const kos = res.filter((r) => !r.c).length;
    console.log(`\n${res.length - kos}/${res.length} PASS`);
    process.exit(kos ? 1 : 0);
  }
})();
