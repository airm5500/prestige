/* ESSAI DU 26/11 : assure en majuscules, ayant droit principal en minuscules (etat de 176 clients de clementine).
 * Parcours a la souris : menu « Bons par organisme », tiers payant choisi, icone « Modifier info client » du bon,
 * puis « Modifier infos ayant droit » et « Modifier infos client » > « Enregistrer ».
 * Jeu d'essai retire a la fin (client, organisme, vente).
 */
const C = require('../audits/commun');
const { ok, q, exec, MARQUE } = C;
const vues = require('../outils/vues');
const path = require('path');
const ECRAN = 'facturesubrogatoireother';
const CAPTURES = process.env.CAPTURES_ESSAI;

async function attendreChargement(p) {
  await p.waitForTimeout(400);
  await p.waitForFunction((e) => { const g = Ext.ComponentQuery.query(e + ' gridpanel')[0]; return g && !g.getStore().isLoading(); }, ECRAN, { timeout: 60000 });
  await p.waitForTimeout(400);
}
const messages = (p) => p.evaluate(() => Ext.ComponentQuery.query('messagebox').filter((m) => m.isVisible(true)).map((m) => (m.msg ? m.msg.getValue() : '') || m.body.dom.innerText));
const toasts = (p) => p.evaluate(() => Array.from(document.querySelectorAll('.prestige-toast, .x-toast, .x-window .x-window-body')).map((e) => e.innerText.trim()).filter(Boolean).slice(0, 5));

(async () => {
  C.ouvrirCaisse();
  const TP = C.tiersPayant('CAS', '1');
  const P1 = C.produit(3, 200);
  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  const VO = C.venteAssurance(api);
  const fenetres = [];
  p.on('dialog', (d) => { fenetres.push(d.message()); d.dismiss().catch(() => {}); });
  const reponses = [];
  p.on('response', async (r) => { if (/client\/update-infos|vente\/update|facture-subro\/list/.test(r.url()) && r.request().method() !== 'GET') {
    let t = ''; try { t = (await r.text()).slice(0, 160); } catch (e) { /* rien */ } reponses.push(r.status() + ' ' + r.url().replace(/^.*api\/v1\//, '') + ' ' + t.replace(/"str(FIRST|LAST)NAME":"[^"]*"/g, '"nom":"…"')); } });
  try {
    const cl = await C.clientAssure(api, 'CASSE', [{ tp: TP, taux: 70 }]);
    exec("UPDATE t_ayant_droit SET str_FIRST_NAME = LOWER(str_FIRST_NAME), str_LAST_NAME = LOWER(str_LAST_NAME) WHERE lg_AYANTS_DROITS_ID = '" + cl.ayantDroitId + "'");
    const casse = () => q("SELECT CONCAT((SELECT BINARY CONCAT(str_FIRST_NAME, str_LAST_NAME) = BINARY UPPER(CONCAT(str_FIRST_NAME, str_LAST_NAME)) FROM t_client WHERE lg_CLIENT_ID = '" + cl.clientId + "'), '/',"
      + " (SELECT CONCAT(BINARY CONCAT(str_FIRST_NAME, str_LAST_NAME) = BINARY UPPER(CONCAT(str_FIRST_NAME, str_LAST_NAME)), ' ', str_FIRST_NAME, ' ', str_LAST_NAME) FROM t_ayant_droit WHERE lg_AYANTS_DROITS_ID = '" + cl.ayantDroitId + "'))");
    const BON = MARQUE + '-CASSE1';
    await VO.vendre(cl, [{ lien: cl.lien(TP), taux: 70, bon: BON }], P1, 1);
    ok('Départ : assuré en majuscules (1), ayant droit principal en minuscules (0)', /^1\/0 /.test(casse()), casse());

    await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Bons par organisme');
    await p.waitForFunction((e) => Ext.ComponentQuery.query(e).some((c) => c.isVisible(true)), ECRAN, { timeout: 60000 });
    await p.mouse.move(1000, 600); await p.mouse.click(1000, 33);
    await attendreChargement(p);
    await vues.choisir(p, ECRAN + ' #tiersPayantId', TP);
    await attendreChargement(p);
    const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: BON }).first();
    await ligne.waitFor({ timeout: 30000 });
    ok('Le bon de l\'assuré d\'essai est dans la liste', true, (await ligne.innerText()).replace(/\s+/g, ' ').slice(0, 160));
    await p.screenshot({ path: path.join(CAPTURES, '1-liste-bons.png') });

    await ligne.locator('img[data-qtip="Modifier info client"]').click();
    await p.waitForFunction((b) => Ext.ComponentQuery.query('window[title=Modification vente] #refBon').some((f) => f.isVisible(true) && f.getValue() === b), BON, { timeout: 60000 });
    const lire = () => p.evaluate(() => { const w = Ext.ComponentQuery.query('window[title=Modification vente]').filter((x) => x.isVisible(true))[0];
      const v = (i) => { const c = w.down('#' + i); return c ? c.getValue() : 'absent'; };
      return { nomAyantDroit: v('nomAyantDroit'), prenomAyantDroit: v('prenomAyantDroit'), numAyantDroit: v('numAyantDroit') }; });
    const avant = await lire();
    ok('Fenêtre « Modification vente » ouverte : l\'ayant droit s\'affiche en minuscules', avant.nomAyantDroit === String(avant.nomAyantDroit).toLowerCase(), JSON.stringify(avant));
    await p.screenshot({ path: path.join(CAPTURES, '2-modification-vente.png') });

    /* 1. « Modifier infos ayant droit » */
    await vues.cliquer(p, 'window[title=Modification vente] #btnModifierAyantDroit');
    await p.waitForTimeout(1200);
    const refus = await messages(p);
    const sousFenetreAd = await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible(true) && /AYANT DROIT/.test(w.title || '')).length);
    ok('« Modifier infos ayant droit » sur l\'ayant droit principal : refusé par un message, aucune fiche ouverte', refus.length === 1 && /principal/.test(refus[0]) && sousFenetreAd === 0,
      JSON.stringify(refus) + ' ; fiches ouvertes ' + sousFenetreAd);
    await p.screenshot({ path: path.join(CAPTURES, '3-refus-ayant-droit.png') });
    await vues.repondre(p, 'ok');
    await p.waitForTimeout(500);
    ok('Après ce refus, l\'ayant droit est toujours en minuscules en base', /^1\/0 /.test(casse()), casse());

    /* 2. « Modifier infos client » > Enregistrer, sans rien changer */
    await vues.cliquer(p, 'window[title=Modification vente] #btnModifierClient');
    await p.waitForFunction(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible(true) && w.title === 'MODIFICATION DES INFORMATIONS GENERALES'), null, { timeout: 30000 });
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(CAPTURES, '4-infos-client.png') });
    const idBouton = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible(true) && x.title === 'MODIFICATION DES INFORMATIONS GENERALES')[0];
      return w.query('button').filter((b) => b.getText() === 'Enregistrer' && b.isVisible(true))[0].getId(); });
    await p.click('#' + idBouton);
    await p.waitForTimeout(2500);
    const apresMsg = await messages(p);
    const apres = await lire();
    ok('« Modifier infos client » > « Enregistrer » sans rien changer : l\'ayant droit principal passe en majuscules en base', /^1\/1 /.test(casse()), casse() + ' ; messages ' + JSON.stringify(apresMsg));
    ok('La fenêtre « Modification vente » affiche l\'ayant droit en majuscules', apres.nomAyantDroit === String(apres.nomAyantDroit).toUpperCase() && apres.nomAyantDroit !== avant.nomAyantDroit, JSON.stringify(apres));
    await p.screenshot({ path: path.join(CAPTURES, '5-apres-enregistrer.png') });
    console.log('INFO  réponses du serveur : ' + JSON.stringify(reponses));
    console.log('INFO  fenêtres du navigateur : ' + JSON.stringify(fenetres) + ' ; erreurs de page : ' + JSON.stringify(erreurs.slice(0, 5)));
    console.log('INFO  autres textes : ' + JSON.stringify(await toasts(p)).slice(0, 300));
  } catch (e) {
    console.log('ERREUR  ' + (e && e.stack || e));
    try { await p.screenshot({ path: path.join(CAPTURES, 'erreur.png') }); } catch (x) { /* rien */ }
    console.log('INFO  réponses du serveur : ' + JSON.stringify(reponses));
  } finally {
    try { C.nettoyer(); } catch (e) { console.log('NETTOYAGE  ' + e.message); }
    await sess.b.close();
    C.bilan();
  }
})();
