/* ETAT DE CONTROLE DES ACHATS : MODIFICATION D'UN BL TRACEE (plan du 19/11, point 12).
 *
 * Demande : « la modification des informations d'un BL (numéro, date de livraison, montant HT, TVA, grossiste) ne
 * laisse aucune trace dans le journal. on doit les retracer aussi dans le journal et dans ce nouvel onglet ».
 * Constat en plus : la modification remettait le reste a payer du mouvement au TTC, meme pour un BL deja regle, et ne
 * recalculait pas le reste a payer du BL quand le TTC changeait.
 *
 * Copie de travail. Un BL ferme de septembre (somme des lignes = HT, pour que la modification soit acceptee), remis a
 * l'identique a la fin (BL, commande, mouvement) ; les lignes de journal du test sont retirees.
 *  1. reglement en partie par le service de l'ecran (le bouton « REGLER UNE SELECTION DE BL » est cache en officine) :
 *     une ligne « Règlement d'un BL » au journal, avec reglement et reste avant / apres ;
 *  2. vrai chemin : menu > « Etat de contrôle Achats », recherche du BL, icone « Modifier les informations du bon de
 *     livraison », saisie au clavier du numero, de la date, de la TVA, choix d'un autre grossiste, « Enregistrer » ;
 *  3. controles :
 *     - base : BL, commande et mouvement modifies ; reste a payer = TTC − regle (BL et mouvement), statut « REGLE EN
 *       PARTIE » garde ;
 *     - journal : UNE ligne « Modification d'un BL », un champ par information changee (avant / apres = base avant /
 *       apres), TTC et reste a payer compris ; le meme detail par l'API du journal (ecran Journal) ;
 *     - rapprochement : onglet « Modifications des BL » = journal = base, ligne par ligne ;
 *     - « Enregistrer » sans rien changer : aucune nouvelle ligne de journal (bilan) ;
 *  4. bilan : journal + 2 lignes exactement (reglement, modification) ; tout est remis a la fin ; aucune erreur JS.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir, saisir, attendreMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const LOGIN = ENV_E2E.LOGIN, DROIT = 'E2E-MBL-UPDBL';
const PRIVILEGE = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_BTN_UPDATEBL'");
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + LOGIN + "' LIMIT 1");
const DEJA = q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE + "' AND lg_PRIVILEGE_ID = '" + PRIVILEGE + "'") !== '0';
const retirerDroit = () => q("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + DROIT + "'");
const T_MODIF = 44, T_REGL = 45; /* rangs de MODIFICATION_BL et REGLEMENT_BL dans TypeLog */

/* BL ferme de septembre, somme des lignes = HT, un mouvement, numero sans caractere special, TVA > 0 */
const BL = q("SELECT b.lg_BON_LIVRAISON_ID FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
  + " WHERE b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON BETWEEN '2026-09-01' AND '2026-09-28' AND b.str_REF_LIVRAISON REGEXP '^[A-Z0-9]{4,15}$'"
  + " AND b.int_MHT > 20000 AND IFNULL(b.int_MONTANT_REGLE, 0) = 0"
  + " AND (SELECT COUNT(*) FROM MvtTransaction m WHERE m.pkey = b.lg_BON_LIVRAISON_ID) = 1"
  + " AND (SELECT COUNT(*) FROM t_bon_livraison b2 WHERE b2.str_REF_LIVRAISON = b.str_REF_LIVRAISON) = 1"
  + " AND b.int_MHT = (SELECT SUM(d.int_PAF * d.int_QTE_CMDE) FROM t_bon_livraison_detail d WHERE d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID)"
  + " ORDER BY b.dt_DATE_LIVRAISON DESC, b.lg_BON_LIVRAISON_ID LIMIT 1");
const COLS_BON = "str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, STATUS, int_MONTANT_REGLE, int_MONTANT_RESTANT, dt_REGLEMENT_DATE, dt_UPDATED";
const COLS_MVT = "reference, montant, montantNet, montantTva, montantRestant, montantAcc, mvtdate, createdAt, grossisteId";
const ligne = (cols, table, where) => q(`SELECT CONCAT_WS('#', ${cols.split(', ').map((c) => `IFNULL(${c}, '∅')`).join(', ')}) FROM ${table} WHERE ${where}`).split('#');
const bon = () => { const v = ligne(COLS_BON, 't_bon_livraison', `lg_BON_LIVRAISON_ID = '${BL}'`); const o = {}; COLS_BON.split(', ').forEach((c, i) => { o[c] = v[i]; }); return o; };
const mvt = () => { const v = ligne(COLS_MVT, 'MvtTransaction', `pkey = '${BL}'`); const o = {}; COLS_MVT.split(', ').forEach((c, i) => { o[c] = v[i]; }); return o; };
const ORDRE = BL && q(`SELECT lg_ORDER_ID FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`);
const grossisteCmd = () => q(`SELECT lg_GROSSISTE_ID FROM t_order WHERE lg_ORDER_ID = '${ORDRE}'`);
const nomGrossiste = (id) => q(`SELECT str_LIBELLE FROM t_grossiste WHERE lg_GROSSISTE_ID = '${id}'`);
const lignesJournal = () => q(`SELECT CONCAT_WS('#', lg_EVENT_LOG_ID, typeLog, REPLACE(IFNULL(str_DETAIL, ''), '\\n', '¶'), str_DESCRIPTION) FROM t_event_log WHERE str_TYPE_LOG = '${BL}' AND typeLog IN (${T_MODIF}, ${T_REGL}) ORDER BY dt_CREATED, lg_EVENT_LOG_ID`).split('\n').filter(Boolean).map((l) => { const [id, type, detail, desc] = l.split('#'); return { id, type: +type, detail: detail.split('¶').filter(Boolean), desc }; });
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const jjmmaaaa = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
const nombreJournal = () => +q(`SELECT COUNT(*) FROM t_event_log WHERE str_TYPE_LOG = '${BL}'`);

(async () => {
  ok('Précondition : un BL fermé de septembre, lignes = HT, un mouvement', !!BL, BL);
  if (!BL) { process.exit(1); }
  const B0 = bon(), M0 = mvt(), G0 = grossisteCmd(), O0 = q(`SELECT dt_UPDATED FROM t_order WHERE lg_ORDER_ID = '${ORDRE}'`);
  const G1 = q(`SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' AND lg_GROSSISTE_ID <> '${G0}' AND str_LIBELLE REGEXP '^[A-Z]' ORDER BY str_LIBELLE LIMIT 1`);
  const journal0 = nombreJournal();
  q(`DELETE FROM t_event_log WHERE str_TYPE_LOG = '${BL}' AND typeLog IN (${T_MODIF}, ${T_REGL})`);
  retirerDroit();
  if (!DEJA) { q(`INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED) VALUES ('${DROIT}', '${ROLE}', '${PRIVILEGE}', NOW())`); }
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const ttc0 = +B0.int_HTTC, regle = Math.round(ttc0 / 3);
  const tva1 = +B0.int_TVA + 1000, ttc1 = +B0.int_MHT + tva1;
  const ref1 = (B0.str_REF_LIVRAISON + 'M').slice(0, 20);
  const date1 = q(`SELECT DATE_SUB('${B0.dt_DATE_LIVRAISON.slice(0, 10)}', INTERVAL 1 DAY)`);
  let etape = 'connexion';
  try {
    await connexion(p, LOGIN, 'e2etest');
    const api = (methode, url, corps) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined }); return r.json(); }, [methode, url, corps]);

    /* 1. reglement en partie */
    const rr = await api('POST', '../api/v1/etat-control-bon/reglement', { bons: [BL], statut: 'REGLE EN PARTIE', date: '2026-10-05', montantRegle: regle });
    const B1 = bon();
    ok('Règlement en partie enregistré : réglé ' + regle + ', reste ' + (ttc0 - regle), rr.success && +B1.int_MONTANT_REGLE === regle && +B1.int_MONTANT_RESTANT === ttc0 - regle && B1.STATUS === 'REGLE EN PARTIE', JSON.stringify(rr) + ' ' + JSON.stringify(B1));
    let j = lignesJournal();
    const jr = j.filter((x) => x.type === T_REGL);
    ok('Journal : une ligne « Règlement d\'un BL » pour ce BL', jr.length === 1, JSON.stringify(j));
    const dr = jr[0] ? jr[0].detail : [];
    ok('Détail du règlement : statut, montant réglé, reste à payer, date (avant → après)',
      dr.includes('Règlement : avant NON REGLE → après REGLE EN PARTIE') && dr.includes('Montant réglé : avant 0 → après ' + fmt(regle))
      && dr.includes('Reste à payer : avant ' + (B0.int_MONTANT_RESTANT === '∅' ? '(vide)' : fmt(+B0.int_MONTANT_RESTANT)) + ' → après ' + fmt(ttc0 - regle))
      && dr.includes('Réglé le : avant ' + (B0.dt_REGLEMENT_DATE === '∅' ? '(vide)' : jjmmaaaa(B0.dt_REGLEMENT_DATE)) + ' → après 05/10/2026'), JSON.stringify(dr));

    /* 2. modification par l'ecran */
    etape = 'menu';
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await p.mouse.move(1200, 700);
    const ecran = 'etatscontrolemanager';
    await p.waitForFunction((e) => Ext.ComponentQuery.query(e).some((g) => g.isVisible(true)) && Ext.getCmp('datedebut'), ecran, { timeout: 60000 });
    etape = 'recherche';
    await saisir(p, '#datedebut', '01/09/2026');
    await saisir(p, '#datefin', '30/09/2026');
    await saisir(p, '#rechecher', B0.str_REF_LIVRAISON);
    await cliquer(p, ecran + ' button[text=Rechercher]');
    await p.waitForFunction(([e, r]) => { const g = Ext.ComponentQuery.query(e)[0]; return !g.getStore().isLoading() && g.getStore().findExact('strREFLIVRAISON', r) >= 0; }, [ecran, B0.str_REF_LIVRAISON], { timeout: 60000 });
    const vue = await p.evaluate((e) => Ext.ComponentQuery.query(e)[0].getView().getId(), ecran);
    const ligneBl = p.locator('#' + vue + ' .x-grid-row').filter({ hasText: B0.str_REF_LIVRAISON }).first();
    await ligneBl.locator('img[data-qtip="Modifier les informations du bon de livraison"]').click();
    etape = 'fenetre';
    const fen = p.locator('.x-window').filter({ visible: true, hasText: 'Bon de livraison' }).first();
    await fen.waitFor({ timeout: 15000 });
    await p.waitForFunction(() => Ext.getCmp('lgGROSSISTEIDEDIT') && Ext.getCmp('lgGROSSISTEIDEDIT').getStore().getCount() > 0 || true);
    await saisir(p, '#str_REF_LIVRAISON', ref1);
    await saisir(p, '#dt_DATE_LIVRAISON', jjmmaaaa(date1));
    await saisir(p, '#int_TVA', String(tva1));
    const nomG1 = nomGrossiste(G1);
    await saisir(p, '#lgGROSSISTEIDEDIT', nomG1.slice(0, 6));
    await choisir(p, '#lgGROSSISTEIDEDIT', nomG1);
    await cliquer(p, 'window button[text=Enregistrer]');
    const msg = await attendreMessage(p, 'succès', 20000);
    ok('« Enregistrer » : le BL est mis à jour', !!msg, msg);
    if (msg) { await repondre(p, 'ok'); }

    const B2 = bon(), M2 = mvt();
    ok('Base : numéro, date, TVA, TTC et grossiste modifiés', B2.str_REF_LIVRAISON === ref1 && B2.dt_DATE_LIVRAISON.slice(0, 10) === date1
      && +B2.int_TVA === tva1 && +B2.int_HTTC === ttc1 && grossisteCmd() === G1 && M2.grossisteId === G1 && M2.reference === ref1 && +M2.montant === ttc1,
      JSON.stringify(B2) + ' ' + JSON.stringify(M2));
    ok('Reste à payer du BL = TTC modifié − réglé (' + fmt(ttc1) + ' − ' + fmt(regle) + '), statut « REGLE EN PARTIE » gardé',
      +B2.int_MONTANT_RESTANT === ttc1 - regle && +B2.int_MONTANT_REGLE === regle && B2.STATUS === 'REGLE EN PARTIE', JSON.stringify(B2));
    ok('Reste à payer du mouvement = celui du BL (le réglé n\'est pas effacé)', +M2.montantRestant === ttc1 - regle, M2.montantRestant);

    j = lignesJournal();
    const jm = j.filter((x) => x.type === T_MODIF);
    ok('Journal : UNE ligne « Modification d\'un BL » pour ce BL', jm.length === 1, JSON.stringify(j));
    const dm = jm[0] ? jm[0].detail : [];
    const attendu = ['Numéro : avant ' + B0.str_REF_LIVRAISON + ' → après ' + ref1,
      'Date de livraison : avant ' + jjmmaaaa(B0.dt_DATE_LIVRAISON) + ' → après ' + jjmmaaaa(date1),
      'TVA : avant ' + fmt(+B0.int_TVA) + ' → après ' + fmt(tva1),
      'Montant TTC : avant ' + fmt(ttc0) + ' → après ' + fmt(ttc1),
      'Grossiste : avant ' + nomGrossiste(G0) + ' → après ' + nomG1,
      'Reste à payer : avant ' + fmt(ttc0 - regle) + ' → après ' + fmt(ttc1 - regle)];
    ok('Détail : un champ par information changée, avant / après = base avant / après, HT inchangé absent', JSON.stringify(dm) === JSON.stringify(attendu), JSON.stringify(dm) + ' ≠ ' + JSON.stringify(attendu));
    ok('Description lisible : numéro du BL et grossiste', jm[0] && jm[0].desc.indexOf(ref1) >= 0 && jm[0].desc.indexOf(nomG1) >= 0, jm[0] && jm[0].desc);

    /* journal (ecran Journal) : meme detail */
    const jour = new Date().toISOString().slice(0, 10);
    const lj = await api('GET', `../api/v1/common/logs?criteria=${T_MODIF}&dtStart=${jour}&dtEnd=${jour}&start=0&limit=200`);
    const dj = (lj.data || []).filter((x) => x.strTYPELOG === BL);
    ok('Écran Journal (filtre « Modification d\'un BL ») : la ligne, même détail', dj.length === 1 && dj[0].detail.split('\n').join('|') === attendu.join('|'), JSON.stringify(dj).slice(0, 400));

    /* 3. onglet « Modifications des BL » */
    const conteneur = 'controleachats';
    etape = 'onglet';
    await cliquer(p, conteneur + ' button[itemId=ca-modifications]');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('#gridModificationsBl')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    await saisir(p, '#mbDebut', '01/10/2026');
    await saisir(p, '#mbRecherche', ref1);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(300);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('#gridModificationsBl')[0].getStore().isLoading(), null, { timeout: 30000 });
    const onglet = await p.evaluate(() => Ext.ComponentQuery.query('#gridModificationsBl')[0].getStore().getRange().map((r) => r.data));
    const ongletModif = onglet.filter((r) => r.bonId === '__' || r.numero === ref1).filter((r) => r.operation === 'Modification');
    ok('Onglet : une ligne par champ modifié, mêmes avant / après que le journal', ongletModif.map((r) => r.champ + ' : avant ' + r.avant + ' → après ' + r.apres).join('|') === attendu.join('|'), JSON.stringify(onglet).slice(0, 400));
    ok('Onglet : utilisateur et grossiste affichés', ongletModif.length > 0 && ongletModif.every((r) => r.utilisateur && r.grossiste === nomG1), JSON.stringify(ongletModif[0]));
    const ongletRegl = onglet.filter((r) => r.numero === ref1 && r.operation === 'Règlement');
    ok('Onglet : le règlement du BL aussi (4 champs)', ongletRegl.length === 4, JSON.stringify(ongletRegl).slice(0, 300));
    const texteGrille = await p.locator('.ca-modifications').first().innerText();
    ok('Onglet : avant / après visibles à l\'écran', texteGrille.indexOf(fmt(ttc1)) >= 0 && texteGrille.indexOf(nomG1) >= 0, texteGrille.slice(0, 200));

    /* 4. enregistrer sans rien changer : aucune trace */
    await cliquer(p, conteneur + ' button[itemId=ca-liste]');
    await saisir(p, '#rechecher', ref1);
    await cliquer(p, ecran + ' button[text=Rechercher]');
    await p.waitForFunction(([e, r]) => { const g = Ext.ComponentQuery.query(e)[0]; return !g.getStore().isLoading() && g.getStore().findExact('strREFLIVRAISON', r) >= 0; }, [ecran, ref1], { timeout: 60000 });
    await p.locator('#' + vue + ' .x-grid-row').filter({ hasText: ref1 }).first().locator('img[data-qtip="Modifier les informations du bon de livraison"]').click();
    await p.locator('.x-window').filter({ visible: true, hasText: 'Bon de livraison' }).first().waitFor({ timeout: 15000 });
    await p.waitForTimeout(800);
    await cliquer(p, 'window button[text=Enregistrer]');
    const msg2 = await attendreMessage(p, 'succès', 20000);
    if (msg2) { await repondre(p, 'ok'); }
    ok('Enregistrer sans changement : aucune nouvelle ligne de journal', !!msg2 && lignesJournal().length === 2, JSON.stringify(lignesJournal().map((x) => x.type)));
    ok('Bilan : journal + 2 lignes exactement (règlement, modification)', nombreJournal() - journal0 === 2, nombreJournal() - journal0);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    const casses = await p.evaluate(() => { const r = []; Ext.ComponentManager.all.each((k, c) => { try { if (c.getRefItems) { c.getRefItems(true); } } catch (x) { r.push(c.getXType() + ' ' + c.id); } }); return r.join(', '); }).catch(() => '');
    ok('Parcours sans exception (étape ' + etape + ')', false, (casses ? '[composants casses : ' + casses + '] ' : '') + e.stack);
  } finally {
    await b.close();
    const nul = (v) => (v === '∅' ? 'NULL' : `'${v}'`);
    q(`UPDATE t_bon_livraison SET ${COLS_BON.split(', ').map((c) => `${c} = ${nul(B0[c])}`).join(', ')} WHERE lg_BON_LIVRAISON_ID = '${BL}'`);
    q(`UPDATE MvtTransaction SET ${COLS_MVT.split(', ').map((c) => `${c} = ${nul(M0[c])}`).join(', ')} WHERE pkey = '${BL}'`);
    q(`UPDATE t_order SET lg_GROSSISTE_ID = '${G0}', dt_UPDATED = ${nul(O0)} WHERE lg_ORDER_ID = '${ORDRE}'`);
    q(`DELETE FROM t_event_log WHERE str_TYPE_LOG = '${BL}' AND typeLog IN (${T_MODIF}, ${T_REGL})`);
    retirerDroit();
    ok('Nettoyage : BL, mouvement et commande remis à l\'identique, journal du test retiré, droit retiré',
      JSON.stringify(bon()) === JSON.stringify(B0) && JSON.stringify(mvt()) === JSON.stringify(M0) && grossisteCmd() === G0 && nombreJournal() === journal0
      && q(`SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '${ROLE}' AND lg_PRIVILEGE_ID = '${PRIVILEGE}'`) === (DEJA ? '1' : '0'),
      JSON.stringify(bon()) + ' / ' + (nombreJournal() - journal0));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
