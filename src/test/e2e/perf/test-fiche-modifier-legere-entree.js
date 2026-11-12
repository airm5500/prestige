/* FICHE ARTICLE : « Modifier » sans les calculs du detail, et derniere entree lue par index (lenteurs d'appaul, 12/11).
 *
 * Constat (journal de toutes les requetes de produits/{id}, copie d'appaul) : « Détail » et « Modifier » demandaient la
 * meme fiche complete. 54 % du temps venaient de la « dernière entrée » : chaque ligne de BL de l'article (177 a 470)
 * et son mouvement dans hmvtproduit (3,2 millions de lignes), soit 334 a 1 664 lectures disque a froid. Le bandeau
 * d'apercu de la liste (produit-search/apercu) refaisait le meme parcours.
 *  1. « Modifier » (et la creation d'un detail) demande produits/{id}?vue=modification : les memes champs que la fiche
 *     complete, valeur pour valeur, sans dates, lots ni etat des commandes, que le formulaire n'affiche pas ;
 *  2. la derniere entree (fiche et apercu) est lue par l'index (article, type de mouvement, date) : meme resultat que
 *     l'ancienne requete, recalculee ici dans la base pour chaque article.
 * Jeu varie : articles au hasard (graine fixe), les plus livres, jamais livre, lignes de BL sans mouvement seulement,
 * lignes avec et sans mouvement, deconditionne. Vrai chemin pour l'ecran : recherche par CIP, icone « Modifier ».
 * Lecture seule. Variables : BASE, DB_TEST.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const lignes = (s) => q(s).split('\n').filter(Boolean).map((l) => l.split('\t'));
const LOURDS = ['dt_LAST_ENTREE', 'dt_LAST_VENTE', 'dt_LAST_INVENTAIRE', 'dt_PEREMPTION_PROCHE', 'lot_PEREMPTION_PROCHE', 'qte_PEREMPTION_PROCHE', 'dt_DATE_LIVRAISON', 'produitState'];

const articles = [];
const ajouter = (l, quoi) => { if (l && l[0] && !articles.some((a) => a.id === l[0])) { articles.push({ id: l[0], cip: l[1], quoi }); } };
lignes("SELECT lg_FAMILLE_ID, int_CIP FROM t_famille WHERE str_STATUT = 'enable' ORDER BY CRC32(CONCAT(lg_FAMILLE_ID, '20261112')) LIMIT 12").forEach((l) => ajouter(l, 'au hasard'));
lignes("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f JOIN t_bon_livraison_detail d ON d.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE f.str_STATUT = 'enable'"
  + " GROUP BY f.lg_FAMILLE_ID ORDER BY COUNT(*) DESC LIMIT 4").forEach((l) => ajouter(l, 'très livré'));
ajouter(lignes("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f WHERE f.str_STATUT = 'enable' AND NOT EXISTS (SELECT 1 FROM t_bon_livraison_detail d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID)"
  + " ORDER BY CRC32(f.lg_FAMILLE_ID) LIMIT 1")[0], 'jamais livré');
/* lignes closes sans aucun mouvement d'entree (anciennes donnees : la date du BL sert) */
lignes("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f JOIN t_bon_livraison_detail d ON d.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID AND b.str_STATUT = 'is_Closed' WHERE f.str_STATUT = 'enable'"
  + " GROUP BY f.lg_FAMILLE_ID HAVING SUM(EXISTS (SELECT 1 FROM hmvtproduit h WHERE h.pkey = d.lg_BON_LIVRAISON_DETAIL AND h.typeMvt = '01')) = 0"
  + " ORDER BY CRC32(f.lg_FAMILLE_ID) LIMIT 2").forEach((l) => ajouter(l, 'sans mouvement'));
lignes("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f JOIN t_bon_livraison_detail d ON d.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID AND b.str_STATUT = 'is_Closed' WHERE f.str_STATUT = 'enable'"
  + " GROUP BY f.lg_FAMILLE_ID HAVING SUM(EXISTS (SELECT 1 FROM hmvtproduit h WHERE h.pkey = d.lg_BON_LIVRAISON_DETAIL AND h.typeMvt = '01')) BETWEEN 1 AND COUNT(*) - 1"
  + " ORDER BY CRC32(CONCAT(f.lg_FAMILLE_ID, 'mix')) LIMIT 3").forEach((l) => ajouter(l, 'avec et sans mouvement'));
ajouter(lignes("SELECT lg_FAMILLE_ID, int_CIP FROM t_famille WHERE str_STATUT = 'enable' AND bool_DECONDITIONNE_EXIST = 1 ORDER BY CRC32(lg_FAMILLE_ID) LIMIT 1")[0], 'avec déconditionné');

/* l'ancienne regle, recalculee dans la base : toutes les lignes closes de l'article, entree = mouvement « 01 » de la
   ligne, a defaut cloture du BL ; la plus recente (et, pour l'apercu, toutes les lignes a egalite) */
const ancienne = (id) => lignes("SELECT DATE_FORMAT(x.entree, '%d/%m/%Y %H:%i'), IFNULL(DATE_FORMAT(x.dateBl, '%d/%m/%Y'), ''), IFNULL(x.qte, 0), IFNULL(x.grossiste, '') FROM ("
  + "SELECT IFNULL((SELECT MAX(h.createdAt) FROM hmvtproduit h WHERE h.pkey = bld.lg_BON_LIVRAISON_DETAIL AND h.typeMvt = '01'), bl.dt_UPDATED) AS entree,"
  + " bl.dt_DATE_LIVRAISON dateBl, bld.int_QTE_RECUE qte, g.str_LIBELLE grossiste FROM t_bon_livraison_detail bld"
  + " INNER JOIN t_bon_livraison bl ON bl.lg_BON_LIVRAISON_ID = bld.lg_BON_LIVRAISON_ID LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = bld.lg_GROSSISTE_ID"
  + " WHERE bld.lg_FAMILLE_ID = '" + id + "' AND bl.str_STATUT = 'is_Closed') x WHERE x.entree IS NOT NULL ORDER BY x.entree DESC")
  .filter((l, i, t) => l[0] === t[0][0]);

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [], appels = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('request', (r) => { if (/produit-search\/produits\//.test(r.url())) { appels.push(r.url().replace(/^.*produit-search\//, '').replace(/[?&]_dc=\d+/, '')); } });
  try {
    const quoi = {};
    articles.forEach((a) => { quoi[a.quoi] = (quoi[a.quoi] || 0) + 1; });
    ok('Jeu d\'essai : ' + articles.length + ' articles variés', articles.length >= 18 && Object.keys(quoi).length >= 6, JSON.stringify(quoi));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    for (const a of articles) {
      const r = await p.evaluate(async (id) => {
        const j = async (u) => (await fetch(u)).json();
        return { complete: (await j('../api/v1/produit-search/produits/' + id)).data, legere: (await j('../api/v1/produit-search/produits/' + id + '?vue=modification')).data,
          apercu: await j('../api/v1/produit-search/apercu/' + id) };
      }, a.id);
      /* 1. rapprochement fiche legere / fiche complete, champ par champ */
      const cles = Object.keys(r.complete || {}).filter((k) => !LOURDS.includes(k));
      const ecarts = cles.filter((k) => JSON.stringify(r.complete[k]) !== JSON.stringify((r.legere || {})[k]));
      const enTrop = Object.keys(r.legere || {}).filter((k) => !cles.includes(k));
      ok('Fiche de « Modifier », ' + a.quoi + ' (' + a.cip + ') : ' + cles.length + ' champs = fiche complète, sans dates, lots ni état des commandes',
        cles.length > 40 && ecarts.length === 0 && enTrop.length === 0, 'écarts ' + ecarts.join(',') + ' ; en trop ' + enTrop.join(','));
      /* 2. derniere entree, fiche et apercu, contre l'ancienne regle recalculee */
      const att = ancienne(a.id);
      const date = att.length ? att[0][0] : '';
      ok('Dernière entrée de la fiche, ' + a.quoi + ' : ' + (date || 'aucune') + ' (ancienne règle)', (r.complete || {}).dt_LAST_ENTREE === date, (r.complete || {}).dt_LAST_ENTREE);
      const ap = r.apercu || {};
      const memeLigne = !att.length ? !ap.derniereEntree : att.some((l) => ap.derniereEntree === l[0] && (ap.dateBl || '') === l[1] && String(ap.qteEntree) === String(l[2]) && (ap.grossiste || '') === l[3]);
      ok('Aperçu, ' + a.quoi + ' : dernière entrée, date du BL, quantité et grossiste = ancienne règle' + (att.length > 1 ? ' (' + att.length + ' lignes à égalité)' : ''), memeLigne,
        JSON.stringify({ ap: [ap.derniereEntree, ap.dateBl, ap.qteEntree, ap.grossiste], attendu: att.slice(0, 2) }));
    }

    /* ecran : « Modifier » par l'icone de la ligne, formulaire = base */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 30000 });
    for (const a of articles.filter((x) => /^[0-9]{6,8}$/.test(x.cip || '')).slice(0, 4)) {
      const champ = '#' + await p.evaluate(() => Ext.getCmp('rechecher').inputEl.dom.id);
      await p.click(champ);
      await p.fill(champ, a.cip);
      await p.keyboard.press('Enter');
      await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', id) >= 0; }, a.id, { timeout: 60000 });
      const l = p.locator('.x-grid-row').filter({ visible: true, hasText: a.cip }).first();
      await l.waitFor({ timeout: 30000 });
      appels.length = 0;
      const icone = l.locator('img[data-qtip="Modifier"]');
      if (await icone.count() > 0) { await icone.first().click(); } else {
        await l.locator('.fa-action-plus').last().click();
        await p.locator('.x-menu-item').filter({ visible: true, hasText: 'Modifier' }).first().click();
      }
      await p.waitForFunction(() => { const w = Ext.WindowManager.getActive(); return w && w.isVisible() && /Modification Article/.test(w.title || ''); }, null, { timeout: 60000 });
      await p.waitForTimeout(1500);
      const vu = await p.evaluate(() => { const w = Ext.WindowManager.getActive(); const v = (n) => { const c = w.down('[name=' + n + ']') || Ext.getCmp(n); return c ? String(c.getValue()) : '(absent)'; };
        return { cip: v('int_CIP'), nom: v('str_DESCRIPTION'), prix: v('int_PRICE'), paf: v('int_PAF') }; });
      const bd = lignes("SELECT int_CIP, str_DESCRIPTION, int_PRICE, int_PAF FROM t_famille WHERE lg_FAMILLE_ID = '" + a.id + "'")[0];
      ok('Écran « Modifier », ' + a.quoi + ' : une seule fiche demandée, la fiche allégée', appels.length === 1 && appels[0] === 'produits/' + a.id + '?vue=modification', JSON.stringify(appels));
      ok('Écran « Modifier », ' + a.quoi + ' : CIP, nom, prix et prix d\'achat du formulaire = base', vu.cip === bd[0] && vu.nom === bd[1] && Number(vu.prix) === Number(bd[2]) && Number(vu.paf) === Number(bd[3]),
        JSON.stringify({ vu, bd }));
      await p.evaluate(() => { const w = Ext.WindowManager.getActive(); if (w && /Modification Article/.test(w.title || '')) { w.close(); } });
      await p.waitForTimeout(400);
    }
    ok('Aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
