/* VENTES TERMINEES > « Modifier info client » : case « Nouveau TP principal » (regle M3 fixee le 29/10 dans le cahier de
 * recette). Si la nouvelle assurance est cochee « Nouveau TP principal », elle prend la priorite 1 et les autres sont
 * decalees ; dans la fiche du client, l'ancienne garde sa priorite (deja couvert par test-ecran-assurances-client-priorites).
 *
 * Preparation (hors parcours teste) : tiers payants d'essai A, B, C ; deux clients assures A 90 % (principale, priorite 1)
 * et C 10 % (priorite 2) ; une vente assurance encaissee par client. Parcours de l'utilisateur, a la souris et au clavier :
 *  - cas 1 : vente sur A ; A remplace par B, case « Nouveau TP principal » laissee cochee ;
 *  - cas 2 : vente sur A et C ; C remplace par B, case cochee sur B et decochee sur A ;
 *  - SERVICE CLIENT > « Vente terminées » : dates et reference tapees, « rechercher », icone « Modifier info client »,
 *    « Modifier le tiers-payant », B tape et choisi dans la liste, « Valider », cases, « Enregistrer », « Non ».
 * Attendu dans les deux cas : B en priorite 1 et principal, A en 2, C en 3, aucune priorite en double.
 * Droit P_BTN_UPDATE_VENTE_CLIENT_TP accorde le temps du test. Jeu d'essai retire a la fin.
 * Lancement seul : node src/test/e2e/audits/test-ecran-nouveau-tp-principal.js
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
  const A = C.tiersPayant('PA', '1'), B = C.tiersPayant('PB', '1'), TC = C.tiersPayant('PC', '1');
  const P = C.produit(11, 50);
  C.ouvrirCaisse();
  const sess = await C.connecter();
  const { p, api } = sess;

  /* bandeau d'alerte WhatsApp : il intercepte les clics, on le masque s'il est affiche */
  const masquerBandeau = async () => {
    const m = p.locator('text=Masquer').filter({ visible: true }).first();
    if (await m.count()) { await m.click().catch(() => {}); }
  };

  /* ouvre « Modifier info client » sur la vente, remplace le tiers payant de la ligne `rang` par B, coche la case
     « Nouveau TP principal » de cette ligne et decoche les autres, puis enregistre */
  const remplacerParB = async (ref, jour, rang) => {
    await masquerBandeau();
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
    await p.locator('.x-window').filter({ visible: true }).getByText('Modifier le tiers-payant', { exact: true }).nth(rang).click();
    const COMBO = 'window[title="TIERS-PAYANTS ASSOCIES"] #compteTp';
    await p.waitForFunction((c) => Ext.ComponentQuery.query(c).some((x) => x.isVisible(true)), COMBO, { timeout: 15000 });
    await cliquer(p, COMBO);
    await p.keyboard.type(B, { delay: 25 });
    const item = p.locator('.x-boundlist-item').filter({ visible: true, hasText: B }).first();
    await item.waitFor({ timeout: 20000 });
    await item.click();
    await p.locator('.x-window').filter({ visible: true, hasText: 'TIERS-PAYANTS ASSOCIES' }).getByText('Valider', { exact: true }).click();
    await p.waitForTimeout(600);
    /* cases « Nouveau TP principal », cliquees comme l'utilisateur : cochee sur la ligne remplacee, decochees ailleurs */
    const cases = await p.evaluate(() => Ext.ComponentQuery.query('updateClientTpform{isVisible()} checkboxfield[name=nouveauTpPrincipal]')
      .map((c) => ({ id: c.inputEl.dom.id, coche: c.getValue() })));
    for (let i = 0; i < cases.length; i++) {
      if (cases[i].coche !== (i === rang)) { await p.click('#' + cases[i].id); }
    }
    const reponse = p.waitForResponse((r) => r.url().includes('vente/updateclientortierpayant'), { timeout: 30000 });
    await cliquer(p, 'updateClientTpform #btnAddClientAssurance');
    const r = await (await reponse).json();
    await p.waitForTimeout(800);
    const non = await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; const x = m && m.down('button[itemId=no]'); return x ? x.getId() : null; });
    if (non) { await p.click('#' + non); }
    return { r, cases: cases.length };
  };

  const controler = (cas, clientId, res) => {
    ok(cas + ' : « Enregistrer » accepté', res.r && res.r.success, JSON.stringify(res.r).slice(0, 200));
    const l = liens(clientId);
    const attendu = [B + '/1/1', A + '/2/0', TC + '/3/0'];
    ok(cas + ' : B en priorité 1 et principal, A en 2, C en 3', JSON.stringify(l) === JSON.stringify(attendu), l.join(' ; '));
    const prio = l.map((x) => x.split('/')[1]);
    ok(cas + ' : aucune priorité portée par deux tiers payants', prio.every((x, i) => prio.indexOf(x) === i), l.join(' ; '));
  };

  try {
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0];
      return n && n.getStore().getRootNode().childNodes.length > 0 && !n.getStore().isLoading(); }, null, { timeout: 120000 });
    const lireVente = (v) => q("SELECT CONCAT_WS('|', str_REF, DATE_FORMAT(dt_UPDATED, '%d/%m/%Y')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'").split('|');

    /* cas 1 : la principale A est remplacee par B */
    const c1 = await C.clientAssure(api, 'PR1', [{ tp: A, taux: 90 }, { tp: TC, taux: 10 }]);
    const v1 = (await C.venteAssurance(api).vendre(c1, [{ lien: c1.lien(A), taux: 90, bon: MARQUE + '-BONP1' }], P, 1)).v;
    const [ref1, jour1] = lireVente(v1);
    ok('Cas 1, préparation : vente sur A encaissée', !!ref1, ref1);
    controler('Cas 1 (A → B, case cochée)', c1.clientId, await remplacerParB(ref1, jour1, 0));

    /* cas 2 : la complementaire C est remplacee par B, B coche principal */
    const c2 = await C.clientAssure(api, 'PR2', [{ tp: A, taux: 90 }, { tp: TC, taux: 10 }]);
    const v2 = (await C.venteAssurance(api).vendre(c2, [{ lien: c2.lien(A), taux: 90, bon: MARQUE + '-BONP2A' },
      { lien: c2.lien(TC), taux: 10, bon: MARQUE + '-BONP2C' }], P, 1)).v;
    const [ref2, jour2] = lireVente(v2);
    ok('Cas 2, préparation : vente sur A et C encaissée', !!ref2, ref2);
    controler('Cas 2 (C → B, B coché principal)', c2.clientId, await remplacerParB(ref2, jour2, 1));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    await sess.b.close();
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
