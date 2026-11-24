/* ETAT DE CONTROLE DES ACHATS : FENETRE « MODIFIER LES INFORMATIONS DU BON DE LIVRAISON » (plan du 21/11, point 1).
 *
 * Defaut signale : la fenetre n'est pas modale ; un clic sur un autre BL ouvre une seconde fenetre ; apres
 * « Enregistrer » une vue avec « Enregistrer » reste et ne reagit plus, figee en bas ; des donnees s'affichent sous les
 * champs. Cause : seconde fenetre interne, identifiants fixes, BL garde dans une variable globale (le dernier ouvert).
 *
 * Copie de travail. Deux BL fermes du meme jour (somme des lignes = HT, pour que la modification soit acceptee), remis a
 * l'identique a la fin (BL, commande, mouvement, journal).
 * Vrai chemin : menu GESTION DES COMMANDES > « Etat de contrôle Achats », recherche du jour, icone « Modifier les
 * informations du bon de livraison ».
 *  1. fenetre de A : modale (masque sur l'ecran), une seule fenetre, champs = base de A, aucune suggestion du navigateur
 *     (autocomplete="off") ;
 *  2. clic sur l'icone de B pendant que A est ouverte : rien ne s'ouvre (toujours une seule fenetre) ;
 *  3. TVA de A modifiee, « Enregistrer » : message de succes, plus aucune fenetre de modification ; base : A modifie
 *     (TVA, TTC, mouvement), B inchange ; journal : une ligne pour A, aucune pour B ;
 *  4. fenetre de B : champs = base de B (pas ceux de A) ; « Annuler » : fenetre fermee, rien d'ecrit ;
 *  5. fenetre de B, TVA modifiee, « Enregistrer » : B modifie, A garde sa modification de l'etape 3 (bilan) ;
 *  6. aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir, attendreMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const LOGIN = ENV_E2E.LOGIN, DROIT = 'E2E-MBF-UPDBL';
const PRIVILEGE = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_BTN_UPDATEBL'");
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + LOGIN + "' LIMIT 1");
const DEJA = q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE + "' AND lg_PRIVILEGE_ID = '" + PRIVILEGE + "'") !== '0';
const T_MODIF = 44;
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const ELIGIBLE = "b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON BETWEEN '2026-09-01' AND '2026-09-28' AND b.str_REF_LIVRAISON REGEXP '^[A-Z0-9]{4,15}$'"
  + " AND b.int_MHT > 20000 AND (SELECT COUNT(*) FROM MvtTransaction m WHERE m.pkey = b.lg_BON_LIVRAISON_ID) = 1"
  + " AND (SELECT COUNT(*) FROM t_bon_livraison b2 WHERE b2.str_REF_LIVRAISON = b.str_REF_LIVRAISON) = 1"
  + " AND b.int_MHT = (SELECT SUM(d.int_PAF * d.int_QTE_CMDE) FROM t_bon_livraison_detail d WHERE d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID)";
/* un jour de septembre avec au moins deux BL modifiables */
const JOUR = q(`SELECT DATE(b.dt_DATE_LIVRAISON) FROM t_bon_livraison b WHERE ${ELIGIBLE} GROUP BY DATE(b.dt_DATE_LIVRAISON) HAVING COUNT(*) >= 2 ORDER BY 1 DESC LIMIT 1`);
const [A, B] = JOUR ? q(`SELECT b.lg_BON_LIVRAISON_ID FROM t_bon_livraison b WHERE ${ELIGIBLE} AND DATE(b.dt_DATE_LIVRAISON) = '${JOUR}' ORDER BY b.lg_BON_LIVRAISON_ID LIMIT 2`).split('\n') : [];
const COLS_BON = "str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, STATUS, int_MONTANT_REGLE, int_MONTANT_RESTANT, dt_REGLEMENT_DATE, dt_UPDATED";
const COLS_MVT = "reference, montant, montantNet, montantTva, montantRestant, montantAcc, mvtdate, createdAt, grossisteId";
const ligne = (cols, table, where) => q(`SELECT CONCAT_WS('#', ${cols.split(', ').map((c) => `IFNULL(${c}, '∅')`).join(', ')}) FROM ${table} WHERE ${where}`).split('#');
const objet = (cols, v) => { const o = {}; cols.split(', ').forEach((c, i) => { o[c] = v[i]; }); return o; };
const bon = (id) => objet(COLS_BON, ligne(COLS_BON, 't_bon_livraison', `lg_BON_LIVRAISON_ID = '${id}'`));
const mvt = (id) => objet(COLS_MVT, ligne(COLS_MVT, 'MvtTransaction', `pkey = '${id}'`));
const commande = (id) => q(`SELECT CONCAT_WS('#', o.lg_ORDER_ID, o.lg_GROSSISTE_ID, IFNULL(o.dt_UPDATED, '∅')) FROM t_order o JOIN t_bon_livraison b ON b.lg_ORDER_ID = o.lg_ORDER_ID WHERE b.lg_BON_LIVRAISON_ID = '${id}'`);
const journal = (id) => +q(`SELECT COUNT(*) FROM t_event_log WHERE str_TYPE_LOG = '${id}' AND typeLog = ${T_MODIF}`);
const jj = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);

(async () => {
  ok('Précondition : deux BL fermés du même jour, lignes = HT, un mouvement chacun', !!A && !!B, JOUR + ' ' + A + ' ' + B);
  if (!A || !B) { process.exit(1); }
  const A0 = bon(A), B0 = bon(B), MA0 = mvt(A), MB0 = mvt(B), CA0 = commande(A), CB0 = commande(B);
  const JA0 = journal(A), JB0 = journal(B);
  if (!DEJA) { q(`INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED) VALUES ('${DROIT}', '${ROLE}', '${PRIVILEGE}', NOW())`); }
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  let etape = 'connexion';
  const ecran = 'etatscontrolemanager';
  try {
    await connexion(p, LOGIN, 'e2etest');
    const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && /Saisie du bon de livraison/.test(w.el.dom.textContent)).map((w) => ({
      modal: !!w.modal, ref: (w.down('[name=str_REF_LIVRAISON]') || {getValue: () => null}).getValue(), ht: String((w.down('[name=int_MHT]') || {getValue: () => null}).getValue()),
      tva: String((w.down('[name=int_TVA]') || {getValue: () => null}).getValue()),
      sansSuggestion: Ext.Array.every(w.query('textfield'), (c) => !c.inputEl || c.inputEl.dom.getAttribute('autocomplete') === 'off') })));
    const masque = () => p.evaluate(() => Ext.query('.x-mask').some((m) => m.offsetWidth > 0 && m.offsetHeight > 0));
    const icone = async (ref) => p.locator('#' + await p.evaluate((e) => Ext.ComponentQuery.query(e)[0].getView().getId(), ecran) + ' .x-grid-row').filter({ hasText: ref }).first()
      .locator('img[data-qtip="Modifier les informations du bon de livraison"]');
    const champ = (nom) => `window[cls~=bl-edition] [name=${nom}], window [name=${nom}]`;

    etape = 'menu';
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await p.mouse.move(1200, 700);
    await p.waitForFunction((e) => Ext.ComponentQuery.query(e).some((g) => g.isVisible(true)) && Ext.getCmp('datedebut'), ecran, { timeout: 60000 });
    await saisir(p, '#datedebut', jj(JOUR));
    await saisir(p, '#datefin', jj(JOUR));
    await cliquer(p, ecran + ' button[text=Rechercher]');
    await p.waitForFunction(([e, r1, r2]) => { const g = Ext.ComponentQuery.query(e)[0]; return !g.getStore().isLoading() && g.getStore().findExact('strREFLIVRAISON', r1) >= 0 && g.getStore().findExact('strREFLIVRAISON', r2) >= 0; },
      [ecran, A0.str_REF_LIVRAISON, B0.str_REF_LIVRAISON], { timeout: 60000 });

    /* 1. fenetre de A */
    etape = 'fenetre A';
    await (await icone(A0.str_REF_LIVRAISON)).click();
    await p.locator('.x-window').filter({ visible: true, hasText: 'Saisie du bon de livraison' }).first().waitFor({ timeout: 15000 });
    await p.waitForTimeout(500);
    let f = await fenetres();
    ok('Fenêtre de A : une seule fenêtre, champs = base de A (numéro, HT, TVA)', f.length === 1 && f[0].ref === A0.str_REF_LIVRAISON && f[0].ht === A0.int_MHT && f[0].tva === A0.int_TVA, JSON.stringify(f));
    ok('Fenêtre de A : modale, l\'écran derrière est masqué', f.length >= 1 && f[0].modal && await masque(), JSON.stringify(f.map((x) => x.modal)));
    ok('Fenêtre de A : aucune suggestion du navigateur sous les champs (autocomplete="off")', f.length >= 1 && f.every((x) => x.sansSuggestion), JSON.stringify(f.map((x) => x.sansSuggestion)));

    /* 2. clic sur B pendant que A est ouverte */
    etape = 'clic sur B';
    await (await icone(B0.str_REF_LIVRAISON)).click({ force: true, timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(800);
    f = await fenetres();
    ok('Clic sur l\'icône de B pendant que A est ouverte : rien ne s\'ouvre, toujours la seule fenêtre de A', f.length === 1 && f[0].ref === A0.str_REF_LIVRAISON, JSON.stringify(f));

    /* 3. enregistrer A */
    etape = 'enregistrer A';
    const tvaA = +A0.int_TVA + 500, ttcA = +A0.int_MHT + tvaA;
    await saisir(p, champ('int_TVA'), String(tvaA));
    await cliquer(p, 'window button[text=Enregistrer]');
    const msgA = await attendreMessage(p, 'succès', 20000);
    ok('« Enregistrer » sur A : message de succès', !!msgA, msgA);
    if (msgA) { await repondre(p, 'ok'); }
    await p.waitForTimeout(600);
    f = await fenetres();
    ok('Après « Enregistrer » : plus aucune fenêtre de modification à l\'écran', f.length === 0, JSON.stringify(f));
    const A1 = bon(A), MA1 = mvt(A), B1 = bon(B);
    ok('Base : A modifié (TVA ' + tvaA + ', TTC ' + ttcA + ', mouvement)', +A1.int_TVA === tvaA && +A1.int_HTTC === ttcA && +MA1.montant === ttcA && +MA1.montantTva === tvaA, JSON.stringify(A1));
    ok('Base : B inchangé (BL, mouvement, commande)', JSON.stringify(B1) === JSON.stringify(B0) && JSON.stringify(mvt(B)) === JSON.stringify(MB0) && commande(B) === CB0, JSON.stringify(B1));
    ok('Journal : une ligne de modification pour A, aucune pour B', journal(A) - JA0 === 1 && journal(B) - JB0 === 0, (journal(A) - JA0) + ' / ' + (journal(B) - JB0));

    /* 4. fenetre de B : ses valeurs, puis Annuler */
    etape = 'fenetre B';
    await p.waitForFunction((e) => !Ext.ComponentQuery.query(e)[0].getStore().isLoading(), ecran, { timeout: 60000 });
    await (await icone(B0.str_REF_LIVRAISON)).click();
    await p.locator('.x-window').filter({ visible: true, hasText: 'Saisie du bon de livraison' }).first().waitFor({ timeout: 15000 });
    await p.waitForTimeout(500);
    f = await fenetres();
    ok('Fenêtre de B : une seule fenêtre, champs = base de B (pas ceux de A)', f.length === 1 && f[0].ref === B0.str_REF_LIVRAISON && f[0].ht === B0.int_MHT && f[0].tva === B0.int_TVA, JSON.stringify(f));
    await cliquer(p, 'window button[text=Annuler]');
    await p.waitForTimeout(500);
    ok('« Annuler » : fenêtre fermée, B inchangé', (await fenetres()).length === 0 && JSON.stringify(bon(B)) === JSON.stringify(B0), JSON.stringify(await fenetres()));

    /* 5. enregistrer B */
    etape = 'enregistrer B';
    await (await icone(B0.str_REF_LIVRAISON)).click();
    await p.locator('.x-window').filter({ visible: true, hasText: 'Saisie du bon de livraison' }).first().waitFor({ timeout: 15000 });
    await p.waitForTimeout(500);
    const tvaB = +B0.int_TVA + 700, ttcB = +B0.int_MHT + tvaB;
    await saisir(p, champ('int_TVA'), String(tvaB));
    await cliquer(p, 'window button[text=Enregistrer]');
    const msgB = await attendreMessage(p, 'succès', 20000);
    if (msgB) { await repondre(p, 'ok'); }
    await p.waitForTimeout(600);
    const B2 = bon(B), A2 = bon(A);
    ok('« Enregistrer » sur B : B modifié (TVA ' + tvaB + ', TTC ' + ttcB + '), plus de fenêtre', !!msgB && +B2.int_TVA === tvaB && +B2.int_HTTC === ttcB && (await fenetres()).length === 0, JSON.stringify(B2));
    ok('Bilan : A garde sa modification de l\'étape 3 (TVA, TTC), journal A +1, B +1', +A2.int_TVA === tvaA && +A2.int_HTTC === ttcA && journal(A) - JA0 === 1 && journal(B) - JB0 === 1, JSON.stringify(A2));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception (étape ' + etape + ')', false, e.stack);
  } finally {
    await b.close();
    const nul = (v) => (v === '∅' ? 'NULL' : `'${v}'`);
    for (const [id, B_, M_, C_] of [[A, A0, MA0, CA0], [B, B0, MB0, CB0]]) {
      q(`UPDATE t_bon_livraison SET ${COLS_BON.split(', ').map((c) => `${c} = ${nul(B_[c])}`).join(', ')} WHERE lg_BON_LIVRAISON_ID = '${id}'`);
      q(`UPDATE MvtTransaction SET ${COLS_MVT.split(', ').map((c) => `${c} = ${nul(M_[c])}`).join(', ')} WHERE pkey = '${id}'`);
      const [ordre, g, d] = C_.split('#');
      q(`UPDATE t_order SET lg_GROSSISTE_ID = '${g}', dt_UPDATED = ${nul(d)} WHERE lg_ORDER_ID = '${ordre}'`);
    }
    q(`DELETE FROM t_event_log WHERE str_TYPE_LOG IN ('${A}', '${B}') AND typeLog = ${T_MODIF} AND dt_CREATED >= '${DEBUT}'`);
    q(`DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '${DROIT}'`);
    ok('Nettoyage : deux BL, mouvements et commandes remis à l\'identique, journal du test retiré',
      JSON.stringify(bon(A)) === JSON.stringify(A0) && JSON.stringify(bon(B)) === JSON.stringify(B0) && JSON.stringify(mvt(A)) === JSON.stringify(MA0)
      && JSON.stringify(mvt(B)) === JSON.stringify(MB0) && commande(A) === CA0 && commande(B) === CB0 && journal(A) === JA0 && journal(B) === JB0);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
