/* RETOUR DU 25/11 (capture) : fenetre « Modifier info client » (Gestion courante > Bons par organisme), bloc
 * « INFOS TIERS PAYANTS » : un nom d'organisme long (« MCI SOGEM CORIS ASSURANCE CI ») passait sur deux lignes et
 * decalait encore « Ref.Bon » et « Taux ». Attendu : le nom sur une seule ligne (coupe par « … » s'il ne tient pas),
 * le nom entier au survol ; « Ref.Bon » juste en dessous.
 *
 * Jeu d'essai (retire a la fin) : deux organismes d'essai, l'un au nom long, l'autre au nom court ; une vente
 * assurance du jour a ces deux organismes (80 % et 20 %), quantite 2. Vrai chemin : menu GESTION COURANTE > « Bons par
 * organisme », organisme long choisi, icone « Modifier info client » de la ligne ; a 1280 x 720, 1366 x 768 et
 * 1920 x 1080.
 * Controles, pour chaque organisme de la fenetre : le nom tient sur une ligne (hauteur d'une ligne, rien de cache en
 * hauteur) ; le texte affiche est le debut du nom en base (str_NAME, celui que la fenetre affiche) ; l'info-bulle donne le nom entier ;
 * « Ref.Bon » est sous le nom a moins de 40 px ; le taux affiche = taux de la vente.
 * Lancement seul : node src/test/e2e/vente/test-nom-tp-une-ligne-2511.js
 */
const C = require('../audits/commun');
const { ok, q, exec, MARQUE } = C;
const vues = require('../outils/vues');
const ENV_E2E = require('../outils/poste');
const privilegeEssai = require('../support/privilege-essai');

const DROIT_INFOS = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_BTN_UPDATE_VENTE_CLIENT_TP');
const ECRAN = 'facturesubrogatoireother';
const FEN = 'window[title=Modification vente]';

(async () => {
  C.ouvrirCaisse();
  DROIT_INFOS.accorder();
  const LONG = MARQUE + ' MCI SOGEM CORIS ASSURANCE CI GRANDS COMPTES';
  const TPL = C.tiersPayant('NL', '1', "str_NAME = '" + LONG + "', str_FULLNAME = '" + LONG + "'");
  const TPC = C.tiersPayant('NC', '1');
  const P1 = C.produit(19, 200);
  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  const VO = C.venteAssurance(api);
  try {
    const cl = await C.clientAssure(api, 'NL', [{ tp: TPL, taux: 80 }, { tp: TPC, taux: 20 }]);
    const BON = MARQUE + '-NL', BON2 = MARQUE + '-NC';
    await VO.vendre(cl, [{ lien: cl.lien(TPL), taux: 80, bon: BON }, { lien: cl.lien(TPC), taux: 20, bon: BON2 }], P1, 2);
    const noms = {};
    noms[TPL] = q("SELECT str_NAME FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '" + TPL + "'");
    noms[TPC] = q("SELECT str_NAME FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '" + TPC + "'");
    ok('Jeu d\'essai : vente assurance à deux organismes, l\'un au nom long', noms[TPL] === LONG && noms[TPC].length < 30
      && q("SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent WHERE str_REF_BON IN ('" + BON + "', '" + BON2 + "')") === '2', JSON.stringify(noms));

    const lire = () => p.evaluate((f) => {
      const w = Ext.ComponentQuery.query(f).filter((x) => x.isVisible())[0];
      return w.down('#tpContainerform').items.items.map((bloc) => {
        const nom = bloc.down('displayfield'), bon = bloc.down('#refBon'), taux = bloc.down('#taux');
        const el = nom.inputEl ? nom.inputEl.dom : nom.getEl().dom, r = el.getBoundingClientRect(), rb = bon.getEl().dom.getBoundingClientRect();
        const s = getComputedStyle(el), ligne = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.3;
        const bulle = el.getAttribute('data-qtip') || el.getAttribute('title') || (el.querySelector('[data-qtip]') || el.querySelector('[title]') || {}).getAttribute?.('data-qtip') || '';
        return { texte: el.innerText.trim(), hauteur: Math.round(r.height), ligne: Math.round(ligne), deborde: el.scrollHeight > el.clientHeight + 2,
          bulle, ecartBon: Math.round(rb.top - r.bottom), taux: taux ? String(taux.getValue()) : null };
      });
    }, FEN);

    await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Bons par organisme');
    await p.waitForFunction((e) => Ext.ComponentQuery.query(e).some((c) => c.isVisible(true)), ECRAN, { timeout: 60000 });
    const chargee = async () => {
      await p.waitForTimeout(400);
      await p.waitForFunction((e) => { const g = Ext.ComponentQuery.query(e + ' gridpanel')[0]; return g && !g.getStore().isLoading(); }, ECRAN, { timeout: 60000 });
      await p.waitForTimeout(400);
    };
    await chargee();
    /* organisme tape dans la liste deroulante, puis choisi dans les propositions (le libelle est le nom complet) */
    const combo = await p.evaluate((r) => { const c = Ext.ComponentQuery.query(r).filter((x) => x.isVisible(true))[0]; return { champ: c.inputEl.id, liste: c.getPicker().getId() }; }, ECRAN + ' #tiersPayantId');
    await p.click('#' + combo.champ);
    await p.keyboard.type('SOGEM CORIS ASSURANCE CI GRANDS', { delay: 30 });
    const proposition = p.locator('#' + combo.liste + ' .x-boundlist-item').filter({ hasText: LONG }).first();
    await proposition.waitFor({ timeout: 20000 });
    await proposition.click();
    await chargee();
    for (const [lg, ht] of [[1280, 720], [1366, 768], [1920, 1080]]) {
      await p.setViewportSize({ width: lg, height: ht });
      await p.waitForTimeout(600);
      const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: BON }).first();
      await ligne.waitFor({ timeout: 30000 });
      await ligne.locator('img[data-qtip="Modifier info client"]').click();
      await p.waitForFunction((f) => { const w = Ext.ComponentQuery.query(f).filter((x) => x.isVisible())[0];
        return w && w.down('#tpContainerform') && w.down('#tpContainerform').items.getCount() === 2; }, FEN, { timeout: 60000 });
      await p.waitForTimeout(800);
      const blocs = await lire();
      const attendus = [[TPL, '80'], [TPC, '20']];
      for (let i = 0; i < 2; i++) {
        const b = blocs[i] || {}, [tp, taux] = attendus[i], nom = noms[tp];
        const debut = b.texte ? b.texte.replace(/…$/, '').trim() : '';
        ok(`${lg}×${ht}, ${i ? 'nom court' : 'nom long'} : sur une seule ligne`, b.hauteur <= b.ligne + 6 && !b.deborde, JSON.stringify(b));
        ok(`${lg}×${ht}, ${i ? 'nom court' : 'nom long'} : texte affiché = début du nom en base, nom entier au survol`,
          debut.length > 0 && nom.indexOf(debut) === 0 && b.bulle.indexOf(nom) >= 0, JSON.stringify(b) + ' / base : ' + nom);
        ok(`${lg}×${ht}, ${i ? 'nom court' : 'nom long'} : « Ref.Bon » juste sous le nom, taux ${taux} %`, b.ecartBon >= 0 && b.ecartBon < 40 && b.taux === taux, JSON.stringify(b));
      }
      await p.keyboard.press('Escape');
      await p.waitForFunction((f) => !Ext.ComponentQuery.query(f).some((x) => x.isVisible()), FEN, { timeout: 15000 }).catch(async () => {
        await p.evaluate((f) => Ext.ComponentQuery.query(f).forEach((w) => w.close()), FEN);
      });
      await p.waitForTimeout(600);
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack);
  } finally {
    await Promise.race([sess.b.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]);
    DROIT_INFOS.reprendre();
    C.nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent WHERE str_REF_BON LIKE '" + MARQUE + "-N%'") === '0'
      && q("SELECT COUNT(*) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID LIKE '" + MARQUE + "-TP-N%'") === '0');
  }
  process.exit(C.bilan() ? 1 : 0);
})();
