/* ETAT DE CONTROLE DES ACHATS : ONGLET « REGLEMENTS FOURNISSEURS » (plan du 19/11, point 16).
 *
 * Copie de travail (laborex_audit) : tous les BL y sont NON REGLE et le dernier date du 24/10/2026 ; avec la date de
 * depart par defaut (01/11/2026) rien n'est du. Le test passe la date au 01/10/2026 par l'ecran, puis la remet.
 *
 * Vrai chemin : menu GESTION DES COMMANDES > « Etat de contrôle Achats », onglet « Règlements fournisseurs ».
 *  1. date de depart : champ + « Appliquer » (premier clic : « Confirmer : les BL avant le 01/10/2026 seront consideres
 *     comme regles », second clic) ; bilan : 1 ligne de journal (avant, apres, auteur), 0 BL modifie, 0 mouvement de
 *     caisse ; « À régler » recalcule aussitot ; meme date en base, dans le bandeau et dans « Liste des BL » (un BL de
 *     septembre y vaut 0, un BL d'octobre TTC − regle) ;
 *  2. « À régler » : du par grossiste et par tranche d'age = base (BL clos dates du 01/10 ou apres) ;
 *  3. reglements par « Saisir » (grossiste choisi par double-clic, montant, date, mode, reference, confirmation dans le
 *     bouton), jeux varies :
 *     A. especes, parametre a 1, les plus anciens d'abord (BL1 en entier, BL2 en partie) : 1 reglement, 2 parts,
 *        1 journal, 1 sortie de caisse (libelle : reglement et grossiste) ; meme sortie dans la liste de caisse, la
 *        visualisation, le ticket Z et en base ;
 *     B. cheque, BL coches (BL4 puis BL3, dans l'ordre de l'ecran) : 0 mouvement de caisse ;
 *     C. especes, parametre a 0 (ecran des parametres : le parametre y est liste) : second reglement sur BL2, regle
 *        cumule, 0 mouvement de caisse ;
 *     D. especes, caisse fermee : « Ouvrez votre caisse pour régler en espèces », rien n'est ecrit ;
 *     E. montant superieur au du : refuse a l'ecran et par le serveur, rien n'est ecrit ;
 *  4. « Historique » : les reglements et leur repartition = base ; annulation de A (confirmation dans le bouton) : parts
 *     rendues exactement, entree de caisse du meme montant (net 0), 1 journal ;
 *  5. rapprochement du reste a payer : onglet = « Liste des BL » = releve Excel = releve PDF = base, BL par BL ;
 *     delai d'affichage du releve PDF plafonne ;
 *  6. droits : sans P_REGLEMENT_FRS_DATE_DEPART, la date est en lecture seule et le serveur refuse le changement.
 * Tout est remis a la fin (BL, mouvements, parametres, caisse, journal, droit).
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const LOGIN = ENV_E2E.LOGIN;
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${LOGIN}'`);
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const AUJ = q('SELECT CURDATE()');
const DEPART0 = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'), '∅')");
const CAISSE0 = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_SORTIE_CAISSE'), '∅')");
const DEPART = '2026-10-01';
const T = { REGL: 46, ANNUL: 47, DATE: 48 }; /* rangs de REGLEMENT_FOURNISSEUR, ANNULATION_..., DATE_DEPART_... */
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const fmtE = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); /* montants a l'ecran (Ext.util.Format) */
const jj = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
const MARQUE = 'E2E-RF-1911';
const PDF_MAX_MS = 10000;

/* grossiste avec au moins 5 BL clos dates du 01/10 au 24/10, TTC > 5 000, sans reglement */
const G = q(`SELECT o.lg_GROSSISTE_ID FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID
  WHERE b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON >= '${DEPART}' AND b.int_HTTC > 5000
  GROUP BY o.lg_GROSSISTE_ID HAVING COUNT(*) >= 5 AND SUM(IFNULL(b.int_MONTANT_REGLE, 0)) = 0 ORDER BY COUNT(*) LIMIT 1`);
const NOM_G = G && q(`SELECT str_LIBELLE FROM t_grossiste WHERE lg_GROSSISTE_ID = '${G}'`);
/* tous les BL clos du grossiste depuis le depart, les plus anciens d'abord */
const COLS = 'b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON, DATE(b.dt_DATE_LIVRAISON), IFNULL(b.int_HTTC, 0), IFNULL(b.int_MONTANT_REGLE, -1), IFNULL(b.int_MONTANT_RESTANT, -1), IFNULL(b.STATUS, \'∅\'), IFNULL(b.dt_REGLEMENT_DATE, \'∅\'), IFNULL((SELECT m.montantRestant FROM MvtTransaction m WHERE m.pkey = b.lg_BON_LIVRAISON_ID AND m.typeTransaction = 2 LIMIT 1), \'∅\')';
const bls = () => q(`SELECT CONCAT_WS('#', ${COLS}) FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID
  WHERE o.lg_GROSSISTE_ID = '${G}' AND b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON >= '${DEPART}' ORDER BY b.dt_DATE_LIVRAISON, b.lg_BON_LIVRAISON_ID`)
  .split('\n').filter(Boolean).map((l) => { const [id, numero, date, ttc, regle, restant, statut, regleLe, mvtRestant] = l.split('#');
    return { id, numero, date, ttc: +ttc, regle: +regle, restant: +restant, statut, regleLe, mvtRestant }; });
const regleDe = (b) => (b.regle < 0 ? 0 : b.regle);
const empreinteBls = () => q(`SELECT MD5(GROUP_CONCAT(CONCAT_WS('#', lg_BON_LIVRAISON_ID, IFNULL(int_MONTANT_REGLE, '∅'), IFNULL(int_MONTANT_RESTANT, '∅'), IFNULL(STATUS, '∅'), IFNULL(dt_REGLEMENT_DATE, '∅')) ORDER BY lg_BON_LIVRAISON_ID)) FROM t_bon_livraison`);
const compte = (sql) => +q(`SELECT COUNT(*) FROM ${sql}`);
const traces = () => ({
  reglements: compte(`reglement_fournisseur WHERE created_at >= '${DEBUT}'`),
  parts: compte(`reglement_fournisseur_bl p JOIN reglement_fournisseur f ON f.id = p.reglement_id WHERE f.created_at >= '${DEBUT}'`),
  journal: compte(`t_event_log WHERE dt_CREATED >= '${DEBUT}' AND typeLog IN (${T.REGL}, ${T.ANNUL}, ${T.DATE})`),
  caisse: compte(`t_mvt_caisse WHERE lg_USER_ID = '${ADMIN}' AND dt_CREATED >= '${DEBUT}'`),
  mvtCaisse: compte(`MvtTransaction WHERE caisse = '${ADMIN}' AND createdAt >= '${DEBUT}' AND typeTransaction IN (3, 4)`),
});
const diff = (a, b) => Object.keys(a).reduce((o, k) => { o[k] = b[k] - a[k]; return o; }, {});
/* caisse du test : une caisse ouverte d'avant est suspendue le temps du test (sa cloture compterait ses mouvements) ;
   le test ouvre la sienne, la cloture par le billetage (controle de la sortie), puis en rouvre une seconde */
const CAISSES_OUVERTES = q(`SELECT ld_CAISSE_ID FROM t_resume_caisse WHERE lg_USER_ID = '${ADMIN}' AND str_STATUT = 'is_Using'`).split('\n').filter(Boolean);
const SOLDE_CAISSE0 = q(`SELECT IFNULL((SELECT int_SOLDE FROM t_caisse WHERE lg_USER_ID = '${ADMIN}' LIMIT 1), '∅')`);
let caisseTest = MARQUE + '-c1';
const creerCaisse = (id) => q(`INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT) VALUES ('${id}', '${ADMIN}', 0, 0, CURDATE(), NOW(), '${ADMIN}', NOW(), '${ADMIN}', 'is_Using')`);
const ouvrirCaisse = () => q(`UPDATE t_resume_caisse SET str_STATUT = 'is_Using' WHERE ld_CAISSE_ID = '${caisseTest}'`);
const fermerCaisse = () => q(`UPDATE t_resume_caisse SET str_STATUT = 'E2E_FERMEE' WHERE ld_CAISSE_ID = '${caisseTest}'`);
const PRIV = q("SELECT IFNULL((SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_REGLEMENT_FRS_DATE_DEPART'), '')");
const ROLES = q(`SELECT ru.lg_ROLE_ID FROM t_role_user ru WHERE ru.lg_USER_ID = '${ADMIN}'`).split('\n').filter(Boolean);
const droitsAvant = PRIV ? q(`SELECT CONCAT_WS('#', lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, IFNULL(dt_CREATED, NOW()), IFNULL(dt_UPDATED, NOW())) FROM t_role_privelege WHERE lg_PRIVILEGE_ID = '${PRIV}' AND lg_ROLE_ID IN (${ROLES.map((r) => `'${r}'`).join(',') || "''"})`).split('\n').filter(Boolean) : [];
const parametre = (cle, v) => q(`UPDATE t_parameters SET str_VALUE = '${v}' WHERE str_KEY = '${cle}'`);

(async () => {
  ok('Précondition : un grossiste avec au moins 5 BL clos depuis le 01/10/2026, aucun réglé', !!G, NOM_G);
  ok('Précondition : migration passée (paramètres, droit, tables)', DEPART0 !== '∅' && CAISSE0 !== '∅' && !!PRIV && compte("information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reglement_fournisseur_bl'") === 1, DEPART0 + ' / ' + CAISSE0 + ' / ' + PRIV);
  if (!G || !PRIV) { process.exit(1); }
  const B0 = bls();
  const empreinte0 = empreinteBls();
  parametre('KEY_REGLEMENT_FRS_DATE_DEPART', '2026-11-01');
  parametre('KEY_REGLEMENT_FRS_SORTIE_CAISSE', '1');
  if (!droitsAvant.length) { ROLES.forEach((r, i) => q(`INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('${MARQUE}-${i}', '${r}', '${PRIV}', NOW(), NOW())`)); }
  CAISSES_OUVERTES.forEach((c) => q(`UPDATE t_resume_caisse SET str_STATUT = 'E2E_SUSPENDUE' WHERE ld_CAISSE_ID = '${c}'`));
  creerCaisse(caisseTest);
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  let etape = 'connexion';
  const ids = { A: null, B: null, C: null };
  try {
    await connexion(p, LOGIN, 'e2etest');
    const api = (methode, url, corps) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined }); const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { brut: t.slice(0, 300), http: r.status }; } }, [methode, url, corps]);
    const etat = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? { visible: c.isVisible(true), texte: c.getText ? c.getText() : (c.text || ''), valeur: c.getValue ? c.getValue() : null } : null; }, sel);
    const attendreStore = (grille) => p.waitForFunction((g) => { const c = Ext.ComponentQuery.query(g)[0]; return c && !c.getStore().isLoading(); }, grille, { timeout: 60000 }).then(() => p.waitForTimeout(300));
    const enregistrer = async () => {
      await cliquer(p, '#rfEnregistrer');
      const arme = (await etat('#rfEnregistrer')).texte;
      await p.waitForTimeout(600);
      await cliquer(p, '#rfEnregistrer');
      await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('#rfMessage')[0].text || ''; return t && t.indexOf('Enregistrement') < 0; }, null, { timeout: 60000 });
      return { arme, message: (await etat('#rfMessage')).texte.replace(/<[^>]+>/g, '') };
    };

    /* 1. onglet, date de depart */
    etape = 'menu';
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await p.mouse.move(1200, 700);
    await p.waitForFunction(() => Ext.ComponentQuery.query('controleachats').some((c) => c.isVisible(true)), null, { timeout: 90000 });
    etape = 'onglet';
    await cliquer(p, 'controleachats button[itemId=ca-reglements]');
    await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('#rfDepartTexte')[0]; return t && /\d\d\/\d\d\/\d{4}/.test(t.text || ''); }, null, { timeout: 30000 });
    await attendreStore('#rfARegler');
    const bandeau0 = (await etat('#rfDepartTexte')).texte.replace(/<[^>]+>/g, '');
    ok('Bandeau : « Suivi des règlements depuis le 01/11/2026 » (= base)', bandeau0 === 'Suivi des règlements depuis le 01/11/2026', bandeau0);
    const vide0 = await p.evaluate(() => Ext.ComponentQuery.query('#rfARegler')[0].getStore().getCount());
    ok('À régler : rien de dû avec le départ au 01/11/2026 (aucun BL après)', vide0 === 0, vide0);
    ok('Droit présent : date et « Appliquer » affichés', (await etat('#rfDepart')).visible && (await etat('#rfAppliquer')).visible);

    etape = 'date';
    const avantDate = traces();
    await saisir(p, '#rfDepart', jj(DEPART));
    await cliquer(p, '#rfAppliquer');
    const armeDate = (await etat('#rfAppliquer')).texte;
    ok('« Appliquer » : la confirmation est dans le bouton', armeDate === 'Confirmer : les BL avant le 01/10/2026 seront considérés comme réglés', armeDate);
    ok('Rien n\'est écrit avant la confirmation', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'") === '2026-11-01');
    await p.waitForTimeout(600);
    await cliquer(p, '#rfAppliquer');
    await p.waitForFunction(() => /01\/10\/2026/.test(Ext.ComponentQuery.query('#rfDepartTexte')[0].text || ''), null, { timeout: 30000 });
    await attendreStore('#rfARegler');
    const apresDate = traces();
    ok('Date en base : 2026-10-01', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'") === DEPART);
    const jd = q(`SELECT CONCAT_WS('#', lg_USER_ID, REPLACE(str_DETAIL, '\\n', '|')) FROM t_event_log WHERE typeLog = ${T.DATE} AND dt_CREATED >= '${DEBUT}'`);
    ok('Bilan du changement de date : 1 journal (ancienne, nouvelle date, auteur), 0 BL modifié, 0 mouvement de caisse',
      JSON.stringify(diff(avantDate, apresDate)) === JSON.stringify({ reglements: 0, parts: 0, journal: 1, caisse: 0, mvtCaisse: 0 }) && empreinteBls() === empreinte0
      && jd.startsWith(ADMIN + '#Avant : 01/11/2026|Après : 01/10/2026|Par : '), JSON.stringify(diff(avantDate, apresDate)) + ' ' + jd);

    /* 2. a regler = base */
    etape = 'a regler';
    const aRegler = await p.evaluate(() => Ext.ComponentQuery.query('#rfARegler')[0].getStore().getRange().map((r) => r.data));
    const baseDu = q(`SELECT CONCAT_WS('#', o.lg_GROSSISTE_ID, COUNT(*),
        SUM(CASE WHEN DATEDIFF(CURDATE(), b.dt_DATE_LIVRAISON) <= 30 THEN b.int_HTTC - IFNULL(b.int_MONTANT_REGLE, 0) ELSE 0 END),
        SUM(CASE WHEN DATEDIFF(CURDATE(), b.dt_DATE_LIVRAISON) BETWEEN 31 AND 60 THEN b.int_HTTC - IFNULL(b.int_MONTANT_REGLE, 0) ELSE 0 END),
        SUM(CASE WHEN DATEDIFF(CURDATE(), b.dt_DATE_LIVRAISON) BETWEEN 61 AND 90 THEN b.int_HTTC - IFNULL(b.int_MONTANT_REGLE, 0) ELSE 0 END),
        SUM(CASE WHEN DATEDIFF(CURDATE(), b.dt_DATE_LIVRAISON) > 90 THEN b.int_HTTC - IFNULL(b.int_MONTANT_REGLE, 0) ELSE 0 END),
        SUM(b.int_HTTC - IFNULL(b.int_MONTANT_REGLE, 0)))
      FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID
      WHERE b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON >= '${DEPART}' AND b.int_HTTC - IFNULL(b.int_MONTANT_REGLE, 0) > 0 GROUP BY o.lg_GROSSISTE_ID ORDER BY o.lg_GROSSISTE_ID`).split('\n').filter(Boolean);
    const ecranDu = aRegler.map((r) => [r.grossisteId, r.nombre, r.t0, r.t1, r.t2, r.t3, r.total].join('#')).sort();
    ok('À régler recalculé aussitôt : ' + aRegler.length + ' grossiste(s), nombre de BL, tranches et total = base, grossiste par grossiste', aRegler.length > 0 && JSON.stringify(ecranDu) === JSON.stringify(baseDu.sort()),
      JSON.stringify(ecranDu.filter((x) => !baseDu.includes(x))).slice(0, 200) + ' / ' + JSON.stringify(baseDu.filter((x) => !ecranDu.includes(x))).slice(0, 200));
    const totalBarre = (await etat('#rfTotalARegler')).texte.replace(/<[^>]+>/g, '');
    const totalBase = aRegler.reduce((s, r) => s + r.total, 0);
    ok('Total dû de la barre = somme des grossistes', totalBarre.indexOf('total dû ' + fmtE(totalBase)) >= 0, totalBarre);

    /* 3A. especes, plus anciens d'abord */
    etape = 'saisie A';
    const vue = await p.evaluate(() => Ext.ComponentQuery.query('#rfARegler')[0].getView().getId());
    await p.locator('#' + vue + ' .x-grid-row').filter({ hasText: NOM_G }).first().dblclick();
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('#rfSaisir')[0]; return g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(300);
    const [b1, b2, b3, b4] = B0;
    const ecranBls = await p.evaluate(() => Ext.ComponentQuery.query('#rfSaisir')[0].getStore().getRange().map((r) => r.data));
    ok('Saisir : BL du grossiste, les plus anciens d\'abord, reste à payer = base', JSON.stringify(ecranBls.map((r) => r.id + '#' + r.restant)) === JSON.stringify(B0.map((x) => x.id + '#' + (x.ttc - regleDe(x)))), JSON.stringify(ecranBls.map((r) => r.numero)).slice(0, 200));
    const montantA = b1.ttc + Math.floor(b2.ttc / 2);
    await saisir(p, '#rfMontant', String(montantA));
    await saisir(p, '#rfReference', MARQUE + '-A');
    /* retour du 22/11 (lot 9) : le mode par defaut est le cheque ; A se regle en especes, choisi a l'ecran */
    await p.evaluate(() => { Ext.ComponentQuery.query('#rfMode')[0].setValue('ESPECES'); });
    const apercu = await p.evaluate(() => Ext.ComponentQuery.query('#rfSaisir')[0].getStore().getRange().filter((r) => r.get('part') > 0).map((r) => r.get('id') + '#' + r.get('part')));
    ok('Aperçu « Part du règlement » : BL1 en entier, BL2 en partie', JSON.stringify(apercu) === JSON.stringify([b1.id + '#' + b1.ttc, b2.id + '#' + (montantA - b1.ttc)]), JSON.stringify(apercu));
    const t0 = traces();
    const tzAvant = await api('POST', '../api/v1/caisse/fetch-tickez', { dtStart: AUJ, dtEnd: AUJ, hrStart: '00:00', hrEnd: '23:59', userId: ADMIN, description: 'ALL' });
    const rA = await enregistrer();
    ok('A : confirmation dans le bouton (montant, grossiste, BL, mode)', rA.arme === 'Confirmer : régler ' + fmtE(montantA) + ' à ' + NOM_G + ' (2 BL, espèces)', rA.arme);
    ok('A : règlement enregistré, sorti de la caisse', /enregistré/.test(rA.message) && /caisse/.test(rA.message), rA.message);
    const tA = traces();
    ok('A : bilan = 1 règlement, 2 parts, 1 journal, 1 sortie de caisse', JSON.stringify(diff(t0, tA)) === JSON.stringify({ reglements: 1, parts: 2, journal: 1, caisse: 1, mvtCaisse: 1 }), JSON.stringify(diff(t0, tA)));
    const RA = q(`SELECT CONCAT_WS('#', id, reference, montant, mode, IFNULL(mvt_caisse_id, '∅'), reference_paiement, date_reglement) FROM reglement_fournisseur WHERE created_at >= '${DEBUT}' AND reference_paiement = '${MARQUE}-A'`).split('#');
    ids.A = RA[0];
    ok('A : règlement en base (montant, espèces, référence, date du jour, sortie de caisse liée)', +RA[2] === montantA && RA[3] === 'ESPECES' && RA[4] !== '∅' && RA[6] === AUJ, RA.join(' '));
    const partsA = q(`SELECT CONCAT_WS('#', bl_id, montant) FROM reglement_fournisseur_bl WHERE reglement_id = '${ids.A}' ORDER BY montant DESC`).split('\n');
    ok('A : parts en base = aperçu, somme = montant', JSON.stringify(partsA.slice().sort()) === JSON.stringify(apercu.slice().sort()), partsA.join(' '));
    const BA = bls();
    ok('A : BL1 réglé (réglé = TTC, reste 0, REGLE), BL2 en partie (REGLE EN PARTIE), mouvement d\'achat = reste',
      BA[0].regle === b1.ttc && BA[0].restant === 0 && BA[0].statut === 'REGLE' && BA[0].regleLe.startsWith(AUJ) && +BA[0].mvtRestant === 0
      && BA[1].regle === montantA - b1.ttc && BA[1].restant === b2.ttc - (montantA - b1.ttc) && BA[1].statut === 'REGLE EN PARTIE' && +BA[1].mvtRestant === BA[1].restant
      && BA.slice(2).every((x, i) => JSON.stringify(x) === JSON.stringify(B0[i + 2])), JSON.stringify(BA.slice(0, 2)));
    const sortie = q(`SELECT CONCAT_WS('#', m.lg_MVT_CAISSE_ID, m.int_AMOUNT, m.str_COMMENTAIRE, m.str_REF_TICKET, m.lg_TYPE_MVT_CAISSE_ID, m.lg_MODE_REGLEMENT_ID) FROM t_mvt_caisse m WHERE m.lg_MVT_CAISSE_ID = '${RA[4]}'`).split('#');
    ok('A : sortie de caisse (type 4, espèces) de −' + fmt(montantA) + ', libellé = règlement et grossiste', +sortie[1] === -montantA && sortie[4] === '4' && sortie[5] === '1' && sortie[2] === 'Règlement fournisseur ' + RA[1] + ' - ' + NOM_G, sortie.join(' | '));
    const mvtA = q(`SELECT CONCAT_WS('#', montant, typeTransaction, typeMvtCaisseId, reference) FROM MvtTransaction WHERE pkey = '${RA[4]}'`).split('#');
    ok('A : mouvement de caisse en base (SORTIE, type 4, même montant)', +mvtA[0] === -montantA && mvtA[1] === '4' && mvtA[2] === '4', mvtA.join(' '));
    /* rapprochement de la sortie : liste de caisse, visualisation, ticket Z, billetage */
    const liste = await api('GET', `../api/v1/caisse/listecaisse?start=0&limit=500&page=1&user=${ADMIN}&startDate=${AUJ}&endDate=${AUJ}`);
    const ligneListe = (liste.data || []).filter((x) => x.reference === mvtA[3]);
    ok('Liste de caisse : la sortie, même montant', ligneListe.length === 1 && +ligneListe[0].montant === -montantA, JSON.stringify(ligneListe).slice(0, 300));
    const csv = await p.evaluate(async (u) => (await fetch(u)).text(), `../api/v1/caisse/listecaisse/export?format=csv&ecran=visualisation&user=${ADMIN}&startDate=${AUJ}&endDate=${AUJ}`);
    const ligneCsv = csv.split('\n').filter((l) => l.indexOf(mvtA[3]) >= 0);
    ok('Visualiser la caisse (export) : la sortie, même montant', ligneCsv.length === 1 && ligneCsv[0].replace(/[\s  ]/g, '').indexOf('-' + montantA) >= 0, ligneCsv.join(' / ').slice(0, 300));
    const tzApres = await api('POST', '../api/v1/caisse/fetch-tickez', { dtStart: AUJ, dtEnd: AUJ, hrStart: '00:00', hrEnd: '23:59', userId: ADMIN, description: 'ALL' });
    /* ticket Z : ligne « Espèce Sortie » du caissier */
    const sortiesZ = (t) => { let v = 0; (((t || {}).data || {}).datas || []).forEach((d) => (d.modePaymentAmounts || []).forEach((m) => {
      if (m.modeCode === 'Espèce Sortie' || m.modeLibelle === 'Espèce Sortie') { v += Math.abs(+String(m.montant).replace(/[^\d-]/g, '')); } })); return v; };
    ok('Ticket Z : « Espèce Sortie » du caissier + ' + fmt(montantA), sortiesZ(tzApres) - sortiesZ(tzAvant) === montantA, sortiesZ(tzAvant) + ' → ' + sortiesZ(tzApres) + ' ' + JSON.stringify(tzApres).slice(0, 300));
    /* billetage : cloture de la caisse du test par l'API de l'ecran ; la ligne « règlement » espèces = la sortie */
    const resume = (await api('GET', '../api/v1/billetage/cloture-data')).data || {};
    ok('Billetage : la caisse à clôturer est celle du test', resume.resumeCaisseId === caisseTest, JSON.stringify(resume).slice(0, 200));
    const clo = await api('POST', '../api/v1/billetage/cloture', { resumeCaisseId: caisseTest, dixMille: 0, cinqMille: 0, deuxMille: 0, mille: 0, cinqCent: 0, autre: 0 });
    const lignesBillet = q(`SELECT CONCAT_WS('#', type_ligne, type_reglement_id, montant) FROM ligne_resume_caisse WHERE resume_caisse_id = '${caisseTest}' ORDER BY type_ligne, type_reglement_id`);
    const soldeSoir = q(`SELECT int_SOLDE_SOIR FROM t_resume_caisse WHERE ld_CAISSE_ID = '${caisseTest}'`);
    ok('Billetage (clôture) : ligne règlement espèces = −' + fmt(montantA) + ', montant de clôture = −' + fmt(montantA), clo.success !== false && lignesBillet === '1#1#-' + montantA && +soldeSoir === -montantA, JSON.stringify(clo).slice(0, 120) + ' ' + lignesBillet + ' / ' + soldeSoir);
    caisseTest = MARQUE + '-c2';
    creerCaisse(caisseTest);

    /* 3B. cheque, BL coches (BL4 puis BL3) */
    etape = 'saisie B';
    await attendreStore('#rfSaisir');
    const vueS = await p.evaluate(() => Ext.ComponentQuery.query('#rfSaisir')[0].getView().getId());
    for (const x of [b4, b3]) { await p.locator('#' + vueS + ' .x-grid-row').filter({ hasText: x.numero }).first().locator('.x-grid-row-checker').click(); }
    const montantB = b3.ttc + 1000;
    await saisir(p, '#rfMontant', String(montantB));
    await p.evaluate(() => { Ext.ComponentQuery.query('#rfMode')[0].setValue('CHEQUE'); });
    await saisir(p, '#rfReference', MARQUE + '-B');
    const apercuB = await p.evaluate(() => Ext.ComponentQuery.query('#rfSaisir')[0].getStore().getRange().filter((r) => r.get('part') > 0).map((r) => r.get('id') + '#' + r.get('part')));
    ok('B : aperçu sur les BL cochés seulement, dans l\'ordre de la liste (BL3 en entier, BL4 1 000)', JSON.stringify(apercuB) === JSON.stringify([b3.id + '#' + b3.ttc, b4.id + '#1000']), JSON.stringify(apercuB));
    const tB0 = traces();
    const rB = await enregistrer();
    const tB = traces();
    ok('B : confirmation (2 BL, chèque), bilan = 1 règlement, 2 parts, 1 journal, 0 mouvement de caisse', rB.arme === 'Confirmer : régler ' + fmtE(montantB) + ' à ' + NOM_G + ' (2 BL, chèque)'
      && JSON.stringify(diff(tB0, tB)) === JSON.stringify({ reglements: 1, parts: 2, journal: 1, caisse: 0, mvtCaisse: 0 }), rB.arme + ' ' + JSON.stringify(diff(tB0, tB)));
    ids.B = q(`SELECT id FROM reglement_fournisseur WHERE reference_paiement = '${MARQUE}-B'`);

    /* 3C. especes, parametre a 0 (liste dans l'ecran des parametres), second reglement sur BL2 */
    etape = 'saisie C';
    const params = await api('GET', '../api/v1/app-params/liste?start=0&limit=1000&page=1');
    const tous = JSON.stringify(params);
    ok('Écran des paramètres : KEY_REGLEMENT_FRS_SORTIE_CAISSE listé, la date de départ non (elle se change dans l’onglet)', tous.indexOf('KEY_REGLEMENT_FRS_SORTIE_CAISSE') >= 0 && tous.indexOf('KEY_REGLEMENT_FRS_DATE_DEPART') < 0, tous.slice(0, 200));
    parametre('KEY_REGLEMENT_FRS_SORTIE_CAISSE', '0');
    await attendreStore('#rfSaisir');
    const restantB2 = bls()[1].restant;
    const montantC = Math.min(2000, restantB2);
    await saisir(p, '#rfMontant', String(montantC));
    await p.evaluate(() => { Ext.ComponentQuery.query('#rfMode')[0].setValue('ESPECES'); });
    await saisir(p, '#rfReference', MARQUE + '-C');
    const tC0 = traces();
    const rC = await enregistrer();
    const tC = traces();
    ok('C : espèces, paramètre à 0 : 1 règlement, 1 part, 1 journal, 0 mouvement de caisse', /enregistré/.test(rC.message) && JSON.stringify(diff(tC0, tC)) === JSON.stringify({ reglements: 1, parts: 1, journal: 1, caisse: 0, mvtCaisse: 0 }), rC.message + ' ' + JSON.stringify(diff(tC0, tC)));
    ids.C = q(`SELECT id FROM reglement_fournisseur WHERE reference_paiement = '${MARQUE}-C'`);
    const BC = bls();
    ok('C : réglé du BL2 cumulé (A + C), reste = TTC − cumul', BC[1].regle === (montantA - b1.ttc) + montantC && BC[1].restant === b2.ttc - BC[1].regle, JSON.stringify(BC[1]));
    parametre('KEY_REGLEMENT_FRS_SORTIE_CAISSE', '1');

    /* 3D. caisse fermee */
    etape = 'saisie D';
    fermerCaisse();
    await saisir(p, '#rfMontant', '1500');
    await saisir(p, '#rfReference', MARQUE + '-D');
    const tD0 = traces(), eD0 = empreinteBls();
    const rD = await enregistrer();
    ok('D : caisse fermée, espèces : « Ouvrez votre caisse pour régler en espèces », rien n\'est écrit', rD.message === 'Ouvrez votre caisse pour régler en espèces.' && JSON.stringify(diff(tD0, traces())) === JSON.stringify({ reglements: 0, parts: 0, journal: 0, caisse: 0, mvtCaisse: 0 }) && empreinteBls() === eD0, rD.message);
    ouvrirCaisse();

    /* 3E. montant au-dela du du */
    etape = 'saisie E';
    await attendreStore('#rfSaisir');
    const du = bls().reduce((s, x) => s + Math.max(0, x.ttc - regleDe(x)), 0);
    await saisir(p, '#rfMontant', String(du + 1));
    await cliquer(p, '#rfEnregistrer');
    const msgE = (await etat('#rfMessage')).texte.replace(/<[^>]+>/g, '');
    const armeE = (await etat('#rfEnregistrer')).texte;
    const serveurE = await api('POST', '../api/v1/reglements-fournisseurs/regler', { grossisteId: G, montant: du + 1, date: AUJ, mode: 'CHEQUE' });
    ok('E : montant > dû refusé à l\'écran (bouton non armé) et par le serveur, rien n\'est écrit', msgE.indexOf('dépasse le total dû') >= 0 && armeE === 'Enregistrer le règlement'
      && serveurE.success === false && /dépasse le total dû/.test(serveurE.msg) && JSON.stringify(diff(tD0, traces())) === JSON.stringify({ reglements: 0, parts: 0, journal: 0, caisse: 0, mvtCaisse: 0 }), msgE + ' / ' + serveurE.msg);
    await saisir(p, '#rfMontant', '');

    /* 4. historique et annulation de A */
    etape = 'historique';
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('#rfHistorique')[0].tab.getId()));
    await attendreStore('#rfReglements');
    const histo = await p.evaluate(() => Ext.ComponentQuery.query('#rfReglements')[0].getStore().getRange().map((r) => r.data));
    const nos = histo.filter((r) => [ids.A, ids.B, ids.C].includes(r.id));
    ok('Historique : les 3 règlements du test (montants, modes, BL) = base', nos.length === 3 && nos.every((r) => +q(`SELECT montant FROM reglement_fournisseur WHERE id = '${r.id}'`) === r.montant
      && r.parts.map((x) => x.blId + '#' + x.montant).sort().join(',') === q(`SELECT GROUP_CONCAT(CONCAT(bl_id, '#', montant) ORDER BY CONCAT(bl_id, '#', montant)) FROM reglement_fournisseur_bl WHERE reglement_id = '${r.id}'`)), JSON.stringify(nos.map((r) => r.reference + ' ' + r.montant)));
    const vueH = await p.evaluate(() => Ext.ComponentQuery.query('#rfReglements')[0].getView().getId());
    const refA = q(`SELECT reference FROM reglement_fournisseur WHERE id = '${ids.A}'`);
    await p.locator('#' + vueH + ' .x-grid-row').filter({ hasText: refA }).first().click();
    await p.waitForTimeout(300);
    const partsEcran = await p.evaluate(() => Ext.ComponentQuery.query('#rfParts')[0].getStore().getRange().map((r) => r.get('blId') + '#' + r.get('montant')));
    ok('Historique : répartition de A affichée = base', JSON.stringify(partsEcran.sort()) === JSON.stringify(partsA.slice().sort()), JSON.stringify(partsEcran));
    const avantAnnul = bls(), tAn0 = traces();
    await cliquer(p, '#rfAnnuler');
    const armeAn = (await etat('#rfAnnuler')).texte;
    await p.waitForTimeout(600);
    await cliquer(p, '#rfAnnuler');
    await p.waitForFunction(() => /annulé/.test(Ext.ComponentQuery.query('#rfHistoMessage')[0].text || ''), null, { timeout: 30000 });
    ok('Annulation : confirmation dans le bouton', armeAn === 'Confirmer : annuler ' + refA + ' (' + fmtE(montantA) + '), rendu à la caisse', armeAn);
    const tAn = traces(), apresAnnul = bls();
    ok('Annulation : bilan = 0 règlement, 1 journal, 1 entrée de caisse', JSON.stringify(diff(tAn0, tAn)) === JSON.stringify({ reglements: 0, parts: 0, journal: 1, caisse: 1, mvtCaisse: 1 }), JSON.stringify(diff(tAn0, tAn)));
    const pA = Object.fromEntries(partsA.map((x) => x.split('#')).map(([i, m]) => [i, +m]));
    const attenduAnnul = (x, i) => (pA[x.id] ? x.regle === regleDe(avantAnnul[i]) - pA[x.id] && x.restant === x.ttc - x.regle
      && x.statut === (x.regle === 0 ? 'NON REGLE' : x.regle >= x.ttc ? 'REGLE' : 'REGLE EN PARTIE') : JSON.stringify(x) === JSON.stringify(avantAnnul[i]));
    ok('Annulation : chaque BL perd exactement sa part de A (réglé, reste, statut), les autres ne bougent pas', apresAnnul.every(attenduAnnul), JSON.stringify(apresAnnul.slice(0, 2)));
    const entree = q(`SELECT CONCAT_WS('#', f.annule, f.annule_par, m.int_AMOUNT, m.lg_TYPE_MVT_CAISSE_ID, m.str_COMMENTAIRE) FROM reglement_fournisseur f JOIN t_mvt_caisse m ON m.lg_MVT_CAISSE_ID = f.mvt_caisse_annulation_id WHERE f.id = '${ids.A}'`).split('#');
    ok('Annulation : règlement marqué annulé, entrée de caisse (type 5) de +' + fmt(montantA) + ' : net 0', entree[0] === '1' && entree[1] === ADMIN && +entree[2] === montantA && entree[3] === '5' && /Annulation du règlement fournisseur/.test(entree[4]), entree.join(' | '));
    const net = +q(`SELECT IFNULL(SUM(montant), 0) FROM MvtTransaction WHERE pkey IN (SELECT mvt_caisse_id FROM reglement_fournisseur WHERE id = '${ids.A}' UNION SELECT mvt_caisse_annulation_id FROM reglement_fournisseur WHERE id = '${ids.A}')`);
    ok('Annulation : mouvements de caisse du règlement A, somme = 0', net === 0, net);
    const deja = await api('POST', '../api/v1/reglements-fournisseurs/annuler/' + ids.A);
    ok('Annulation répétée refusée', deja.success === false && /déjà annulé/.test(deja.msg), deja.msg);

    /* 5. rapprochement du reste a payer : onglet = liste des BL = releve Excel = releve PDF = base */
    etape = 'rapprochement';
    const base = bls();
    const onglet = (await api('GET', '../api/v1/reglements-fournisseurs/bls?grossisteId=' + G)).data;
    const parOnglet = Object.fromEntries(onglet.map((x) => [x.id, x.restant]));
    const listeBl = await api('GET', `../api/v1/etat-control-bon/list?start=0&limit=500&dtStart=${DEPART}&dtEnd=${AUJ}&grossisteId=${G}&search=`);
    const parListe = Object.fromEntries((listeBl.data || []).map((x) => [x.lgBONLIVRAISONID, x.resteAPayer]));
    await p.evaluate((g) => { const c = Ext.ComponentQuery.query('#rfHistoGrossiste')[0]; c.getStore().load({ callback: () => c.setValue(g) }); }, G);
    await p.waitForFunction((g) => Ext.ComponentQuery.query('#rfHistoGrossiste')[0].getValue() === g, G, { timeout: 30000 });
    await saisir(p, '#rfDu', jj(DEPART));
    const telechargement = p.waitForEvent('download', { timeout: 60000 });
    await cliquer(p, '#rfReleve');
    await p.locator('.x-menu-item').filter({ hasText: 'Excel' }).filter({ visible: true }).first().click();
    const fichier = path.join(os.tmpdir(), MARQUE + '.xlsx');
    await (await telechargement).saveAs(fichier);
    const excel = JSON.parse(execFileSync('python', ['-c', `import openpyxl,json,sys
w=openpyxl.load_workbook(sys.argv[1]).active
r=[[c for c in l] for l in w.iter_rows(values_only=True)]
print(json.dumps(r, default=str))`, fichier], { encoding: 'utf8' }));
    const ent = excel.findIndex((l) => l[0] === 'Nature');
    const lignesBl = excel.slice(ent + 1).filter((l) => l[0] === 'BL');
    const parExcel = Object.fromEntries(lignesBl.map((l) => [l[2], l[5]]));
    let ecarts = [];
    for (const x of base) {
      const attendu = x.ttc - regleDe(x);
      const v = [parOnglet[x.id] === undefined ? 0 : parOnglet[x.id], parListe[x.id], parExcel[x.numero]];
      if (!(v[0] === attendu && v[1] === attendu && v[2] === attendu)) { ecarts.push(x.numero + ' base ' + attendu + ' / onglet ' + v[0] + ' / liste ' + v[1] + ' / excel ' + v[2]); }
    }
    ok('Rapprochement du reste à payer, ' + base.length + ' BL : onglet = Liste des BL = relevé Excel = base', ecarts.length === 0 && lignesBl.length === base.length, ecarts.join(' ; ') || lignesBl.length);
    const totalExcel = excel.find((l) => l[0] === 'TOTAL BL');
    ok('Relevé Excel : total reste à payer = somme des BL = base', totalExcel && totalExcel[5] === base.reduce((s, x) => s + x.ttc - regleDe(x), 0), JSON.stringify(totalExcel));
    const regExcel = excel.filter((l) => /^RÈGLEMENT/.test(l[0] || '')).map((l) => l[0] + '#' + l[10]);
    ok('Relevé Excel : règlements B et C actifs, A annulé', regExcel.includes('RÈGLEMENT#' + montantB) && regExcel.includes('RÈGLEMENT#' + montantC) && regExcel.includes('RÈGLEMENT ANNULÉ#' + montantA), JSON.stringify(regExcel));
    const blSept = q(`SELECT b.lg_BON_LIVRAISON_ID FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID WHERE o.lg_GROSSISTE_ID = '${G}' AND b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON < '${DEPART}' AND b.int_HTTC > 0 ORDER BY b.dt_DATE_LIVRAISON DESC LIMIT 1`);
    if (blSept) {
      const ls = await api('GET', `../api/v1/etat-control-bon/list?start=0&limit=500&dtStart=2026-08-01&dtEnd=2026-09-30&grossisteId=${G}&search=`);
      const x = (ls.data || []).find((y) => y.lgBONLIVRAISONID === blSept);
      ok('Liste des BL : un BL d\'avant le départ vaut 0 (considéré comme réglé)', x && x.resteAPayer === 0 && x.avantSuivi === true, JSON.stringify(x && { r: x.resteAPayer, a: x.avantSuivi }));
    }
    /* releve PDF : delai et memes restes */
    const t1 = Date.now();
    const popup = p.waitForEvent('popup', { timeout: 60000 });
    await cliquer(p, '#rfReleve');
    await p.locator('.x-menu-item').filter({ hasText: 'PDF' }).filter({ visible: true }).first().click();
    const fen = await popup;
    const urlPdf = fen.url();
    await fen.close().catch(() => {});
    const pdf = await p.evaluate(async (u) => { const r = await fetch(u); const a = new Uint8Array(await r.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i++) { s += String.fromCharCode(a[i]); } return { type: r.headers.get('content-type'), b64: btoa(s) }; }, urlPdf);
    const ms = Date.now() - t1;
    const fpdf = path.join(os.tmpdir(), MARQUE + '.pdf');
    fs.writeFileSync(fpdf, Buffer.from(pdf.b64, 'base64'));
    ok('Relevé PDF affiché en moins de ' + PDF_MAX_MS / 1000 + ' s', /pdf/.test(pdf.type) && ms < PDF_MAX_MS, ms + ' ms');
    const texte = execFileSync('pdftotext', ['-raw', fpdf, '-'], { encoding: 'utf8' }).replace(/\r/g, '');
    const lignesPdf = texte.split('\n').filter((l) => /^BL /.test(l));
    ecarts = [];
    for (const x of base) {
      const l = lignesPdf.find((y) => y.indexOf(' ' + x.numero + ' ') >= 0);
      const attendu = fmt(x.ttc - regleDe(x));
      if (!l || l.indexOf(fmt(x.ttc) + ' ' + fmt(regleDe(x)) + ' ' + attendu) < 0) { ecarts.push(x.numero + ' : ' + (l || 'absent')); }
    }
    ok('Relevé PDF : TTC, réglé et reste de chaque BL = base', ecarts.length === 0 && lignesPdf.length === base.length, ecarts.join(' ; ').slice(0, 400) || lignesPdf.length);
    ok('Relevé PDF : suivi depuis le 01/10/2026', texte.indexOf('suivi des règlements depuis le 01/10/2026') >= 0);

    /* 6. droits : sans le droit, lecture seule et refus du serveur */
    etape = 'droits';
    q(`DELETE FROM t_role_privelege WHERE lg_PRIVILEGE_ID = '${PRIV}' AND lg_ROLE_ID IN (${ROLES.map((r) => `'${r}'`).join(',')})`);
    const ctx2 = await b.newContext({ viewport: { width: 1600, height: 900 } });
    const p2 = await ctx2.newPage();
    p2.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p2, LOGIN, 'e2etest');
    await ouvrirMenu(p2, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await p2.mouse.move(1200, 700);
    await p2.waitForFunction(() => Ext.ComponentQuery.query('controleachats').some((c) => c.isVisible(true)), null, { timeout: 90000 });
    await cliquer(p2, 'controleachats button[itemId=ca-reglements]');
    await p2.waitForFunction(() => /\d\d\/\d\d\/\d{4}/.test((Ext.ComponentQuery.query('#rfDepartTexte')[0] || {}).text || ''), null, { timeout: 30000 });
    const lecture = await p2.evaluate(() => ({ champ: Ext.ComponentQuery.query('#rfDepart')[0].isVisible(true), bouton: Ext.ComponentQuery.query('#rfAppliquer')[0].isVisible(true),
      bandeau: Ext.ComponentQuery.query('#rfDepartTexte')[0].text, aide: Ext.ComponentQuery.query('#rfDepartAide')[0].text }));
    ok('Sans le droit : date et « Appliquer » masqués, bandeau en lecture seule (même date)', !lecture.champ && !lecture.bouton && /01\/10\/2026/.test(lecture.bandeau) && /lecture seule/.test(lecture.aide), JSON.stringify(lecture));
    const refus = await p2.evaluate(async () => (await fetch('../api/v1/reglements-fournisseurs/depart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: '2026-09-01' }) })).json());
    ok('Sans le droit : le serveur refuse le changement, date inchangée, aucun journal', refus.success === false && refus.interdit === true && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'") === DEPART
      && compte(`t_event_log WHERE typeLog = ${T.DATE} AND dt_CREATED >= '${DEBUT}'`) === 1, JSON.stringify(refus));
    await ctx2.close();
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception (étape ' + etape + ')', false, e.stack);
  } finally {
    await b.close();
    /* nettoyage */
    const regs = q(`SELECT GROUP_CONCAT(CONCAT('''', id, '''')) FROM reglement_fournisseur WHERE created_at >= '${DEBUT}' AND user_id = '${ADMIN}'`);
    if (regs && regs !== 'NULL') {
      q(`DELETE FROM reglement_fournisseur_bl WHERE reglement_id IN (${regs})`);
      q(`DELETE FROM reglement_fournisseur WHERE id IN (${regs})`);
    }
    const nul = (v) => (v === '∅' ? 'NULL' : `'${v}'`);
    for (const x of B0) {
      q(`UPDATE t_bon_livraison SET int_MONTANT_REGLE = ${x.regle < 0 ? 'NULL' : x.regle}, int_MONTANT_RESTANT = ${x.restant < 0 ? 'NULL' : x.restant}, STATUS = ${nul(x.statut)}, dt_REGLEMENT_DATE = ${nul(x.regleLe)} WHERE lg_BON_LIVRAISON_ID = '${x.id}'`);
      q(`UPDATE MvtTransaction SET montantRestant = ${x.mvtRestant === '∅' ? 'NULL' : x.mvtRestant} WHERE pkey = '${x.id}' AND typeTransaction = 2`);
    }
    q(`CREATE TEMPORARY TABLE IF NOT EXISTS za_rf (id VARCHAR(40)); DELETE FROM za_rf; INSERT INTO za_rf SELECT lg_MVT_CAISSE_ID FROM t_mvt_caisse WHERE lg_USER_ID = '${ADMIN}' AND dt_CREATED >= '${DEBUT}';
      DELETE FROM MvtTransaction WHERE pkey IN (SELECT id FROM za_rf); DELETE FROM t_reglement WHERE str_REF_RESSOURCE IN (SELECT id FROM za_rf); DELETE FROM t_mvt_caisse WHERE lg_MVT_CAISSE_ID IN (SELECT id FROM za_rf);
      DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE user_id = '${ADMIN}' AND created_at >= '${DEBUT}');
      DELETE FROM notification WHERE user_id = '${ADMIN}' AND created_at >= '${DEBUT}';
      DELETE FROM t_event_log WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`);
    parametre('KEY_REGLEMENT_FRS_DATE_DEPART', DEPART0);
    parametre('KEY_REGLEMENT_FRS_SORTIE_CAISSE', CAISSE0);
    q(`DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE LIKE '${MARQUE}%'`);
    for (const d of droitsAvant) {
      const [id, role, priv, c, u] = d.split('#');
      q(`INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('${id}', '${role}', '${priv}', '${c}', '${u}')`);
    }
    q(`DELETE FROM t_billetage_details WHERE lg_BILLETAGE_ID IN (SELECT lg_BILLETAGE_ID FROM t_billetage WHERE ld_CAISSE_ID LIKE '${MARQUE}%')`);
    q(`DELETE FROM t_billetage WHERE ld_CAISSE_ID LIKE '${MARQUE}%'`);
    q(`DELETE FROM ligne_resume_caisse WHERE resume_caisse_id LIKE '${MARQUE}%'`);
    q(`DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE '${MARQUE}%'`);
    CAISSES_OUVERTES.forEach((c) => q(`UPDATE t_resume_caisse SET str_STATUT = 'is_Using' WHERE ld_CAISSE_ID = '${c}'`));
    if (SOLDE_CAISSE0 !== '∅') { q(`UPDATE t_caisse SET int_SOLDE = ${SOLDE_CAISSE0} WHERE lg_USER_ID = '${ADMIN}'`); }
    ok('Nettoyage : BL et mouvements remis, règlements, caisse, journal, paramètres et droits remis',
      JSON.stringify(bls()) === JSON.stringify(B0) && empreinteBls() === empreinte0 && compte(`reglement_fournisseur WHERE created_at >= '${DEBUT}'`) === 0
      && compte(`t_mvt_caisse WHERE lg_USER_ID = '${ADMIN}' AND dt_CREATED >= '${DEBUT}'`) === 0
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'") === DEPART0
      && compte(`t_role_privelege WHERE lg_PRIVILEGE_ID = '${PRIV}' AND lg_ROLE_ID IN (${ROLES.map((r) => `'${r}'`).join(',')})`) === droitsAvant.length);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
