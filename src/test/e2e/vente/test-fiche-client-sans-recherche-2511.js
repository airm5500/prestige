/* RETOUR DU 25/11 (capture) : en vente, « Fiche client » d'un client déjà affiché : la fenêtre propose encore
 * « Client (nom ou téléphone) — Chercher le client ». La fenêtre reprend la vue de l'onglet « Fiche client » des
 * Ordonnances, qui a sa recherche ; ouverte pour un client donné, elle ne doit pas permettre d'en chercher un autre
 * (le titre dirait un client et la fiche en montrerait un autre).
 *
 * Vrai chemin : menu Ventes, vente assurance (organisme 80 %), client tapé puis Entrée, bouton « Fiche client » de la
 * carte du client ; écrans 1280 × 600, 1366 × 768 et 1920 × 1080 (ergonomie de l'écran complet).
 * Contrôles :
 *  - aucune zone de recherche de client dans la fenêtre ; rien de vide à sa place (le dossier commence en haut) ;
 *  - rapprochement : titre = nom affiché dans la fiche = nom du client en base ;
 *  - les messages de la fiche s'affichent toujours : « Compléter la fiche » sans rien saisir -> « Indiquez la date de
 *    naissance ou le sexe. » visible ; rien n'est écrit sur le client (bilan) ;
 *  - fenêtre entière dans l'écran, « Fermer » visible et non recouvert ;
 *  - non-régression : l'onglet « Fiche client » des Ordonnances garde sa recherche (test-fiche-client-fenetre.js et
 *    ici : la vue créée sans client donné garde sa zone de recherche).
 * Lancement seul : node src/test/e2e/vente/test-fiche-client-sans-recherche-2511.js
 */
const L = require('../ligne-comptant/commun');
const { ok, q, exec, MARQUE, vues } = L;
const C = require('../audits/commun');

(async () => {
  const TA = C.tiersPayant('FSR', '1');
  const cl = await C.clientAssure(null, 'FSRCL', [{ tp: TA, taux: 80 }]);
  /* fiche incomplete : « Compléter la fiche » visible */
  exec("UPDATE t_client SET dt_NAISSANCE = NULL, str_SEXE = NULL WHERE lg_CLIENT_ID = '" + cl.clientId + "'");
  const empreinte = () => q("SELECT CONCAT_WS('|', IFNULL(dt_NAISSANCE, '-'), IFNULL(str_SEXE, '-'), str_FIRST_NAME, str_LAST_NAME) FROM t_client WHERE lg_CLIENT_ID = '" + cl.clientId + "'");
  const avant = empreinte();
  const sess = await L.connecterEtOuvrirVente();
  const { p, erreurs } = sess;
  const fermerMessages = async () => {
    for (let i = 0; i < 4; i++) {
      const id = await p.evaluate(() => { const m = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; if (!m) { return null; }
        const b = ['ok', 'no'].map((x) => m.down('button[itemId=' + x + ']')).find((x) => x && x.isVisible()); return b ? b.getId() : null; });
      if (!id) { return; }
      await p.click('#' + id); await p.waitForTimeout(400);
    }
  };
  const lire = () => p.evaluate(() => {
    const w = Ext.ComponentQuery.query('#fenFicheClient').filter((x) => x.isVisible())[0];
    if (!w) { return null; }
    const v = w.down('ordofichesclient'), combo = v.down('#fcClient');
    const rw = w.getEl().dom.getBoundingClientRect(), corps = v.down('#fcCorps'), rc = corps.getEl().dom.getBoundingClientRect();
    const rb = v.body ? v.body.dom.getBoundingClientRect() : v.getEl().dom.getBoundingClientRect();
    const fermer = w.query('button').find((b) => b.getText() === 'Fermer'), rf = fermer.getEl().dom.getBoundingClientRect();
    const cible = document.elementFromPoint(rf.left + rf.width / 2, rf.top + rf.height / 2);
    return { titre: w.title, recherche: !!(combo && combo.isVisible(true)), ecartHaut: Math.round(rc.top - rb.top),
      identite: v.down('#fcIdentite').getEl().dom.innerText, message: v.down('#fcMessage').isVisible(true) ? v.down('#fcMessage').getEl().dom.innerText.trim() : '',
      dansEcran: rw.left >= 0 && rw.top >= 0 && rw.right <= window.innerWidth && rw.bottom <= window.innerHeight,
      fermer: rf.width > 0 && !!cible && fermer.getEl().dom.contains(cible), fermerId: fermer.getId() };
  });
  try {
    await L.choisirType(p, 'Assurance', '2');
    await vues.cliquer(p, 'doventemanager #contenu #clientSearchTextField');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(MARQUE + ' FSRCL', { delay: 20 });
    await p.keyboard.press('Enter');
    const matricule = MARQUE + '-FSRCL';
    const ligne = p.locator('.x-window .x-grid-row').filter({ visible: true, hasText: matricule }).first();
    const pose = p.locator('text=(' + matricule + ')').filter({ visible: true }).first();
    await Promise.race([ligne.waitFor({ timeout: 30000 }), pose.waitFor({ timeout: 30000 })]);
    if (await ligne.isVisible().catch(() => false)) { await ligne.click(); }
    await p.waitForTimeout(2000);
    await fermerMessages();
    const nomBase = q("SELECT CONCAT(str_FIRST_NAME, ' ', str_LAST_NAME) FROM t_client WHERE lg_CLIENT_ID = '" + cl.clientId + "'");
    for (const [l, h] of [[1280, 600], [1366, 768], [1920, 1080]]) {
      await p.setViewportSize({ width: l, height: h });
      await p.waitForTimeout(700);
      const id = await p.evaluate(() => { const b = Ext.ComponentQuery.query('doventemanager #ficheClientAssure')[0]; return b && b.isVisible(true) ? b.getEl().dom.id : null; });
      await p.click('#' + id);
      await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('#fenFicheClient').filter((x) => x.isVisible())[0];
        return w && w.down('#fcCorps').isVisible(true); }, null, { timeout: 30000 });
      await p.waitForTimeout(600);
      const f = await lire();
      ok(`${l}×${h} : aucune recherche de client dans la fiche d'un client déjà choisi, le dossier commence en haut`, !!f && !f.recherche && f.ecartHaut < 20, JSON.stringify(f));
      ok(`${l}×${h} : rapprochement : titre = nom dans la fiche = nom en base (${nomBase})`, !!f && f.titre.indexOf(nomBase) >= 0
        && f.identite.toUpperCase().indexOf(nomBase.toUpperCase()) >= 0, f && (f.titre + ' / ' + f.identite.split('\n')[0]));
      ok(`${l}×${h} : fenêtre entière dans l'écran, « Fermer » visible et non recouvert`, !!f && f.dansEcran && f.fermer, JSON.stringify(f));
      if (l === 1366) {
        const btn = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenFicheClient').filter((x) => x.isVisible())[0];
          const b = w.down('#fcCompleterBtn'); return b && b.isVisible(true) ? b.getId() : null; });
        if (btn) { await p.click('#' + btn); await p.waitForTimeout(500); }
        const g = await lire();
        ok('« Compléter la fiche » sans rien saisir : le message « Indiquez la date de naissance ou le sexe. » s\'affiche', !!btn && /Indiquez la date de naissance ou le sexe/.test(g.message), JSON.stringify({ btn, message: g.message }));
      }
      await p.click('#' + f.fermerId);
      await p.waitForTimeout(500);
    }
    ok('Bilan : rien n\'est écrit sur le client', empreinte() === avant, avant + ' => ' + empreinte());
    /* non-regression : la vue sans client donne (onglet des Ordonnances) garde sa recherche */
    const onglet = await p.evaluate(() => {
      const ctx = testextjs.view.serviceclient.ordonnance.FenetreFicheClient.contexte(false);
      const v = Ext.create('testextjs.view.serviceclient.ordonnance.FicheClientVue', { ecran: ctx, renderTo: document.body, width: 900, height: 500 });
      const r = !!v.down('#fcClient') && !v.down('#fcClient').hidden; v.destroy(); return r;
    });
    ok('Non-régression : la fiche de l\'onglet Ordonnances (sans client donné) garde sa recherche', onglet);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    ok('Déroulé sans exception', false, err.stack);
  } finally {
    await Promise.race([sess.b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]);
    C.nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_client WHERE str_LAST_NAME LIKE '" + MARQUE + "%'") === '0');
  }
  process.exit(C.bilan() ? 1 : 0);
})();
