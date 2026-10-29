/* VENTES TERMINEES > « Modifier info client » : changement d'organisme et encours affiche (retours de recette du 28/10,
 * CA-09). Constat : apres A -> B sur une vente, l'encours de B lu dans GESTION DES TIERS-PAYANTS > « Tiers-payants »
 * ne bougeait pas (« 0 -> 0 »). Cet ecran additionne le reste du des bons ; le bon recree pour B avait un reste vide.
 *
 * Preparation (hors parcours teste) : tiers payants d'essai A, B, C ; client assure A 90 % (principale) et C 10 % ;
 * une vente assurance encaissee sur A, au nom du compte de test. Parcours de l'utilisateur, a la souris et au clavier :
 *  - « Tiers-payants » : recherche « ZZAUDIT-TP-E », Entree, lecture de la colonne Encours de A et de B ;
 *  - SERVICE CLIENT > « Vente terminées » : dates et reference tapees, « rechercher », icone « Modifier info client » ;
 *    « Modifier le tiers-payant », B tape et choisi dans la liste, « Valider », « Enregistrer », « Non » a l'impression ;
 *  - « Tiers-payants » de nouveau : la part est sortie de A et entree dans B ; aucune priorite en double chez le client.
 * Droit P_BTN_UPDATE_VENTE_CLIENT_TP accorde le temps du test. Jeu d'essai retire a la fin.
 * Lancement seul : node src/test/e2e/audits/test-ecran-modifier-tp-vente-encours.js
 */
const C = require('./commun');
const { ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const { ok, q, exec, MARQUE } = C;

const DROIT = MARQUE + '-DROIT-UPDTP';
const liens = (clientId) => q("SELECT CONCAT_WS('/', l.lg_TIERS_PAYANT_ID, l.int_PRIORITY, l.b_IS_RO) FROM t_compte_client_tiers_payant l"
  + " JOIN t_compte_client c ON c.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID WHERE c.lg_CLIENT_ID = '" + clientId + "' AND l.str_STATUT = 'enable'"
  + " ORDER BY l.int_PRIORITY").split(/\r?\n/).filter(Boolean);

(async () => {
  const PRIVILEGE = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_BTN_UPDATE_VENTE_CLIENT_TP'");
  const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.lg_USER_ID = '" + C.ADMIN + "' LIMIT 1");
  if (q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE + "' AND lg_PRIVILEGE_ID = '" + PRIVILEGE + "'") === '0') {
    exec("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED) VALUES ('" + DROIT + "', '" + ROLE + "', '" + PRIVILEGE + "', NOW())");
  }
  C.etat.restaurations.push("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + DROIT + "'");
  const A = C.tiersPayant('EA', '1'), B = C.tiersPayant('EB', '1'), TC = C.tiersPayant('EC', '1');
  const P = C.produit(11, 50);
  C.ouvrirCaisse();
  const sess = await C.connecter();
  const { p, api } = sess;
  /* encours affiches par l'ecran « Tiers-payants », par tiers payant d'essai */
  const lireEncours = async () => {
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Tiers-payants');
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await cliquer(p, '#rechecher');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(MARQUE + '-TP-E', { delay: 20 });
    await p.keyboard.press('Enter');
    await p.locator('.x-grid-row').filter({ visible: true, hasText: B }).first().waitFor({ timeout: 30000 });
    await p.waitForTimeout(800);
    return p.evaluate(([a, bb]) => {
      const g = Ext.ComponentQuery.query('gridpanel{isVisible()}').find((x) => x.columns.some((c) => c.text === 'Encours'));
      const i = g.columns.filter((c) => !c.hidden).findIndex((c) => c.text === 'Encours');
      const lire = (id) => { const r = g.getStore().findRecord('lg_TIERS_PAYANT_ID', id, 0, false, true, true);
        if (!r) { return null; } const td = g.getView().getNode(r).querySelectorAll('td')[i]; return Number(td.textContent.replace(/\D/g, '')); };
      return { A: lire(a), B: lire(bb) };
    }, [A, B]);
  };
  try {
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0];
      return n && n.getStore().getRootNode().childNodes.length > 0 && !n.getStore().isLoading(); }, null, { timeout: 120000 });
    /* preparation : client et vente assurance encaissee sur A */
    const cl = await C.clientAssure(api, 'ENC', [{ tp: A, taux: 90 }, { tp: TC, taux: 10 }]);
    const { v } = await C.venteAssurance(api).vendre(cl, [{ lien: cl.lien(A), taux: 90, bon: MARQUE + '-BON1' }], P, 1);
    const [ref, jour, part] = q("SELECT CONCAT_WS('|', p.str_REF, DATE_FORMAT(p.dt_UPDATED, '%d/%m/%Y'), t.int_PRICE) FROM t_preenregistrement p"
      + " JOIN t_preenregistrement_compte_client_tiers_payent t ON t.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID WHERE p.lg_PREENREGISTREMENT_ID = '" + v + "'").split('|');
    ok('Préparation : vente assurance encaissée sur A', !!ref && Number(part) > 0, ref + ', part A ' + part);

    const avant = await lireEncours();
    ok('« Tiers-payants » avant : A porte la part, B à 0', avant.A === Number(part) && avant.B === 0, JSON.stringify(avant));

    await ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventemanager #query').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'ventemanager #dtStart', jour);
    await saisir(p, 'ventemanager #dtEnd', jour);
    await saisir(p, 'ventemanager #query', ref);
    await cliquer(p, 'ventemanager #rechercher');
    const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: ref }).first();
    await ligne.waitFor({ timeout: 60000 });
    await ligne.locator('img[data-qtip="Modifier info client"]').click();
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('updateClientTpform').filter((x) => x.isVisible())[0];
      return w && !w.down('#btnModifierClient').isDisabled(); }, null, { timeout: 30000 });
    await p.locator('.x-window').filter({ visible: true }).getByText('Modifier le tiers-payant', { exact: true }).first().click();
    const COMBO = 'window[title="TIERS-PAYANTS ASSOCIES"] #compteTp';
    await p.waitForFunction((c) => Ext.ComponentQuery.query(c).some((x) => x.isVisible(true)), COMBO, { timeout: 15000 });
    await cliquer(p, COMBO);
    await p.keyboard.type(B, { delay: 25 });
    const item = p.locator('.x-boundlist-item').filter({ visible: true, hasText: B }).first();
    await item.waitFor({ timeout: 20000 });
    await item.click();
    await p.locator('.x-window').filter({ visible: true, hasText: 'TIERS-PAYANTS ASSOCIES' }).getByText('Valider', { exact: true }).click();
    await p.waitForTimeout(600);
    const reponse = p.waitForResponse((r) => r.url().includes('vente/updateclientortierpayant'), { timeout: 30000 });
    await cliquer(p, 'updateClientTpform #btnAddClientAssurance');
    const r = await (await reponse).json();
    ok('« Enregistrer » : modification acceptée', r && r.success, JSON.stringify(r).slice(0, 200));
    await p.waitForTimeout(800);
    const non = await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; const x = m && m.down('button[itemId=no]'); return x ? x.getId() : null; });
    if (non) { await p.click('#' + non); }

    const bon = q("SELECT CONCAT_WS('|', l.lg_TIERS_PAYANT_ID, t.int_PRICE, IFNULL(t.int_PRICE_RESTE, 'vide')) FROM t_preenregistrement_compte_client_tiers_payent t"
      + " JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID WHERE t.lg_PREENREGISTREMENT_ID = '" + v + "'");
    const [tpBon, partB, resteB] = bon.split('|');
    ok('Bon de la vente : porté par B, reste dû égal à sa part', tpBon === B && Number(partB) > 0 && resteB === partB, bon);
    /* decision du 29/10 : meme taux, seul l'organisme change, la part de la vente est gardee (elle etait recalculee,
       a 1 F pres : 2 551 a la vente, 2 552 apres) */
    ok('Bon de B : même part que celle de A à la vente', partB === part, 'A ' + part + ' → B ' + partB);
    const apres = await lireEncours();
    ok('« Tiers-payants » après : la part sort de A', apres.A === avant.A - Number(part), JSON.stringify(avant) + ' → ' + JSON.stringify(apres));
    ok('« Tiers-payants » après : la part entre dans B (constat « B : 0 → 0 »)', apres.B === avant.B + Number(partB), JSON.stringify(avant) + ' → ' + JSON.stringify(apres));
    const [prix, partClient] = q("SELECT CONCAT_WS('|', int_PRICE, int_CUST_PART) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'").split('|').map(Number);
    ok('Vente : part du client + part de B = prix de la vente', partClient + Number(partB) === prix, 'client ' + partClient + ' + B ' + partB + ' / prix ' + prix);
    const l = liens(cl.clientId), prio = l.map((x) => x.split('/')[1]);
    ok('Client : aucune priorité portée par deux tiers payants', prio.every((x, i) => prio.indexOf(x) === i), l.join(' ; '));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
