/* ESSAI DU 26/11 (suite) : deux assures portent le meme numero (4 des 176 clients de clementine sont dans ce cas).
 * « Modifier infos client » > « Enregistrer » sur le second : quel ayant droit est reecrit ? Jeu d'essai retire a la fin. */
const C = require('../audits/commun');
const { ok, q, exec, MARQUE } = C;
const vues = require('../outils/vues');
const ECRAN = 'facturesubrogatoireother';
async function attendreChargement(p) {
  await p.waitForTimeout(400);
  await p.waitForFunction((e) => { const g = Ext.ComponentQuery.query(e + ' gridpanel')[0]; return g && !g.getStore().isLoading(); }, ECRAN, { timeout: 60000 });
  await p.waitForTimeout(400);
}
(async () => {
  C.ouvrirCaisse();
  const TP = C.tiersPayant('CAS', '1'), TP2 = C.tiersPayant('CAT', '1');
  const P1 = C.produit(3, 200);
  const sess = await C.connecter();
  const { p, api } = sess;
  const VO = C.venteAssurance(api);
  try {
    const a = await C.clientAssure(api, 'DOUBLEA', [{ tp: TP2, taux: 70 }]);
    const b = await C.clientAssure(api, 'DOUBLEB', [{ tp: TP, taux: 70 }]);
    const nom = (id) => q("SELECT CONCAT(str_FIRST_NAME, ' ', str_LAST_NAME) FROM t_ayant_droit WHERE lg_AYANTS_DROITS_ID = '" + id + "'");
    const BON = MARQUE + '-DOUBLE1';
    await VO.vendre(b, [{ lien: b.lien(TP), taux: 70, bon: BON }], P1, 1);
    /* meme numero pour les deux assures et leurs ayants droit ; ayant droit de B en minuscules */
    const NUM = MARQUE + '-DOUBLE';
    exec("UPDATE t_client SET str_NUMERO_SECURITE_SOCIAL = '" + NUM + "' WHERE lg_CLIENT_ID IN ('" + a.clientId + "', '" + b.clientId + "');"
      + "UPDATE t_ayant_droit SET str_NUMERO_SECURITE_SOCIAL = '" + NUM + "' WHERE lg_CLIENT_ID IN ('" + a.clientId + "', '" + b.clientId + "');"
      + "UPDATE t_ayant_droit SET str_FIRST_NAME = LOWER(str_FIRST_NAME), str_LAST_NAME = LOWER(str_LAST_NAME) WHERE lg_AYANTS_DROITS_ID = '" + b.ayantDroitId + "'");
    const A0 = nom(a.ayantDroitId), B0 = nom(b.ayantDroitId);
    await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Bons par organisme');
    await p.waitForFunction((e) => Ext.ComponentQuery.query(e).some((c) => c.isVisible(true)), ECRAN, { timeout: 60000 });
    await p.mouse.move(1000, 600); await p.mouse.click(1000, 33);
    await attendreChargement(p);
    await vues.choisir(p, ECRAN + ' #tiersPayantId', TP);
    await attendreChargement(p);
    const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: BON }).first();
    await ligne.waitFor({ timeout: 30000 });
    await ligne.locator('img[data-qtip="Modifier info client"]').click();
    await p.waitForFunction((x) => Ext.ComponentQuery.query('window[title=Modification vente] #refBon').some((f) => f.isVisible(true) && f.getValue() === x), BON, { timeout: 60000 });
    await vues.cliquer(p, 'window[title=Modification vente] #btnModifierClient');
    await p.waitForFunction(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible(true) && w.title === 'MODIFICATION DES INFORMATIONS GENERALES'), null, { timeout: 30000 });
    await p.waitForTimeout(600);
    const idBouton = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible(true) && x.title === 'MODIFICATION DES INFORMATIONS GENERALES')[0];
      return w.query('button').filter((x) => x.getText() === 'Enregistrer' && x.isVisible(true))[0].getId(); });
    await p.click('#' + idBouton);
    await p.waitForTimeout(2500);
    const A1 = nom(a.ayantDroitId), B1 = nom(b.ayantDroitId);
    ok('L\'ayant droit du client modifié (B) passe en majuscules', B1 === B0.toUpperCase() && B1 !== B0, B0 + ' -> ' + B1);
    ok('L\'ayant droit de l\'autre client (A), de même numéro, n\'est pas touché', A1 === A0, A0 + ' -> ' + A1);
  } catch (e) {
    console.log('ERREUR  ' + (e && e.stack || e));
  } finally {
    try { C.nettoyer(); } catch (e) { console.log('NETTOYAGE  ' + e.message); }
    await sess.b.close();
    C.bilan();
  }
})();
