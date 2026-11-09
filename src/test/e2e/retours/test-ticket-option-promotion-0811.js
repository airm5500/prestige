/* PLAN DU 08/11, POINT 16 : OPTION « AFFICHER L'INFORMATION PROMOTION » DES MODELES DE TICKET (OUI PAR DEFAUT).
 *
 * Jeu d'essai : la derniere vente au comptant close (3 lignes ou plus) ; deux de ses lignes marquees en promotion le
 * temps du test (une « PROMOTION », une « UNITES GRATUITES » 5+1), valeurs d'origine remises a la fin.
 * Par l'ecran « Modeles de ticket » (80 mm, ticket de vente), avec de vrais clics :
 *  - l'option est proposee, sur oui ; elle n'est pas proposee sur le ticket Z ;
 *  - la couper : l'apercu perd la ligne de mention (bloc des articles moins haut) ; « Enregistrer » l'ecrit en base ;
 *  - l'ecran rouvert la relit (coupee) ;
 *  - rapprochement ticket de la vente (apercu de la reimpression) / base, ligne par ligne : avec l'option, une mention
 *    sous chaque ligne en promotion et sous elles seules ; sans l'option, aucune ; designation, quantite x prix et
 *    montant identiques dans les deux cas et egaux a la base ;
 *  - remise sur oui : la mention revient.
 * La table des reglages et les lignes de la vente sont remises comme avant.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const chiffres = (t) => Number(String(t || '').replace(/[^\d-]/g, '')) || 0;

const MENU = q("SELECT str_VALUE FROM t_menu WHERE lg_MENU_ID = '10'");
const TABLE = () => q("SELECT CONCAT_WS('|', ticket, largeur, HEX(reglages), IFNULL(DATE_FORMAT(maj, '%Y-%m-%d %H:%i:%s'), ''), HEX(IFNULL(utilisateur, ''))) FROM ticket_modele ORDER BY ticket, largeur");
const AVANT = TABLE();
const remettreTable = () => {
  q('DELETE FROM ticket_modele;' + AVANT.split('\n').filter(Boolean).map((l) => {
    const [t, lg, r, maj, u] = l.split('|');
    return `INSERT INTO ticket_modele (ticket, largeur, reglages, maj, utilisateur) VALUES ('${t}', ${Number(lg)}, UNHEX('${r}'), ${maj ? `'${maj}'` : 'NOW()'}, UNHEX('${u || ''}'));`;
  }).join(''));
};
const enBase = (t, l) => JSON.parse(q(`SELECT reglages FROM ticket_modele WHERE ticket = '${t}' AND largeur = ${l}`) || '{}');

/* vente au comptant close, 3 lignes ou plus, sans promotion */
const VENTE = q(`SELECT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0
  AND p.str_TYPE_VENTE = 'VNO' AND (SELECT COUNT(*) FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID) BETWEEN 3 AND 8
  ORDER BY p.dt_UPDATED DESC LIMIT 1`);
const COLS = 'promotion_produit_id, promo_type, promo_mode, promo_seuil, promo_gratuites, int_FREE_PACK_NUMBER';
const LIGNES = VENTE ? q(`SELECT d.lg_PREENREGISTREMENT_DETAIL_ID, UPPER(f.str_DESCRIPTION), d.int_QUANTITY, d.int_PRICE_UNITAIR, d.int_PRICE,
  CONCAT_WS('|', IFNULL(d.promotion_produit_id, 'NULL'), IFNULL(d.promo_type, 'NULL'), IFNULL(d.promo_mode, 'NULL'), IFNULL(d.promo_seuil, 'NULL'), IFNULL(d.promo_gratuites, 'NULL'), IFNULL(d.int_FREE_PACK_NUMBER, 'NULL'))
  FROM t_preenregistrement_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_PREENREGISTREMENT_ID = '${VENTE}' ORDER BY d.dt_CREATED`).split('\n').map((l) => l.split('\t')) : [];
const PROMO = LIGNES.length >= 3 ? [LIGNES[0][0], LIGNES[LIGNES.length - 1][0]] : [];
const val = (x) => (x === 'NULL' ? 'NULL' : `'${x}'`);
const remettreLignes = () => q(LIGNES.map(([id, , , , , o]) => { const v = o.split('|');
  return `UPDATE t_preenregistrement_detail SET promotion_produit_id = ${val(v[0])}, promo_type = ${val(v[1])}, promo_mode = ${val(v[2])}, promo_seuil = ${val(v[3])}, promo_gratuites = ${val(v[4])}, int_FREE_PACK_NUMBER = ${val(v[5])} WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${id}';`; }).join(''));

/* ticket relu par l'apercu de la reimpression : articles et mentions qui les suivent dans le bloc des articles */
function lire(t) {
  const articles = [];
  for (const b of (t && t.blocs) || []) {
    for (const e of b.elements) {
      if (e.genre === 'ARTICLE') { articles.push({ designation: e.a, detail: e.b, montant: chiffres(e.d), mentions: [] }); }
      else if (b.id === 'CORPS' && e.genre === 'TEXTE' && articles.length && /^PROMOTION/.test(e.a)) { articles[articles.length - 1].mentions.push(e.a); }
    }
  }
  return articles;
}

(async () => {
  let b = null;
  const erreurs = [];
  try {
    ok('Jeu d\'essai : une vente au comptant close de 3 lignes ou plus', !!VENTE && LIGNES.length >= 3, VENTE + ' ' + LIGNES.length);
    q(`UPDATE t_preenregistrement_detail SET promotion_produit_id = -1, promo_type = NULL, promo_mode = NULL, promo_seuil = NULL, promo_gratuites = NULL WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${PROMO[0]}';`
      + `UPDATE t_preenregistrement_detail SET promotion_produit_id = -2, promo_type = 'UNITES GRATUITES', promo_mode = NULL, promo_seuil = 5, promo_gratuites = 1, int_FREE_PACK_NUMBER = 1 WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${PROMO[1]}';`);
    q('DELETE FROM ticket_modele WHERE largeur = 80 AND ticket = \'VENTE\'');

    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    const racine = '.mtk';
    const apresApercu = async (action) => {
      const r = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 30000 });
      await action();
      await r;
      await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
      await p.waitForTimeout(400);
    };
    const hauteurCorps = () => p.evaluate(() => { const z = Ext.ComponentQuery.query('modelesticket')[0].etat.apercu.zones.CORPS; return z ? z[1] - z[0] : null; });
    const option = () => p.locator(racine + ' [data-option=promotion]');
    const ouvrir = async () => {
      const premier = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 60000 });
      await ouvrirMenu(p, MENU, 'Modèles de ticket');
      await premier;
      await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
      const l80 = p.locator(racine + ' .mtk-barre [data-choix=largeur][data-valeur="80"]');
      if (await l80.getAttribute('aria-checked') !== 'true') { await apresApercu(() => l80.click()); }
      await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=VENTE]').click());
    };
    /* « Enregistrer » : PUT ; le rechargement (GET) ne suit que si des reglages communs sont reportes ailleurs */
    const enregistrer = async () => {
      const put = p.waitForResponse((x) => /modeles-ticket/.test(x.url()) && x.request().method() === 'PUT', { timeout: 30000 });
      await p.locator(racine + ' [data-action=enregistrer]').click();
      await put;
      await p.waitForTimeout(1500);
    };
    const ticket = async () => {
      const a = await p.evaluate(async (v) => (await fetch('../api/v1/vente/ticket/vno/' + v + '/apercu')).json(), VENTE);
      return { ok: a.success === true && a.tickets && a.tickets.length === 1, articles: lire(a.tickets && a.tickets[0]) };
    };
    /* base, ligne par ligne, dans l'ordre du ticket */
    const attendu = LIGNES.map(([id, nom, qte, pu, mt]) => ({ id, nom, qte: Number(qte), pu: Number(pu), mt: Number(mt), promo: PROMO.includes(id) }));
    const rapprocher = (articles, avecMention) => {
      const ecarts = [];
      if (articles.length !== attendu.length) { ecarts.push('lignes ' + articles.length + ' / ' + attendu.length); }
      attendu.forEach((x, i) => {
        const a = articles[i] || {};
        const mentions = a.mentions || [];
        if (!String(a.designation || '').startsWith(x.nom.slice(0, 15)) || chiffres(String(a.detail).split('×')[0]) !== x.qte || a.montant !== x.mt) { ecarts.push(i + ' ligne ' + JSON.stringify(a) + ' / ' + JSON.stringify(x)); }
        if (mentions.length !== (avecMention && x.promo ? 1 : 0)) { ecarts.push(i + ' mentions ' + JSON.stringify(mentions)); }
      });
      return ecarts;
    };

    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrir();
    ok('Ticket de vente : option « Afficher l\'information promotion » proposée, sur oui', await option().count() === 1 && await option().getAttribute('aria-checked') === 'true',
      await option().count());
    const avant = await ticket();
    const ecartsAvant = rapprocher(avant.articles, true);
    ok(`Avec l'option : ticket = base ligne par ligne (${attendu.length} lignes), une mention sous les 2 lignes en promotion et sous elles seules`, avant.ok && ecartsAvant.length === 0,
      JSON.stringify(ecartsAvant.length ? ecartsAvant : avant.articles.map((x) => x.mentions)));
    ok('Mention de la ligne « unités gratuites » : « PROMOTION 5+1 OFFERT(S) »', (avant.articles[attendu.length - 1] || { mentions: [] }).mentions[0] === 'PROMOTION 5+1 OFFERT(S)',
      JSON.stringify((avant.articles[attendu.length - 1] || {}).mentions));

    const h1 = await hauteurCorps();
    await apresApercu(() => option().click());
    const h2 = await hauteurCorps();
    ok('Option coupée : l\'aperçu perd la ligne de mention (bloc des articles moins haut)', await option().getAttribute('aria-checked') === 'false' && h2 < h1, h1 + ' → ' + h2);
    await enregistrer();
    ok('« Enregistrer » : promotion = false en base (ticket de vente, 80 mm)', enBase('VENTE', 80).promotion === false, JSON.stringify(enBase('VENTE', 80)).slice(0, 200));
    const sans = await ticket();
    const ecartsSans = rapprocher(sans.articles, false);
    ok('Sans l\'option : aucune mention, lignes identiques (désignation, quantité × prix, montant) = base', sans.ok && ecartsSans.length === 0
      && JSON.stringify(sans.articles.map((x) => [x.designation, x.detail, x.montant])) === JSON.stringify(avant.articles.map((x) => [x.designation, x.detail, x.montant])),
      JSON.stringify(ecartsSans));

    /* ecran rouvert : la valeur enregistree est relue */
    await p.reload();
    await ouvrir();
    ok('Écran rouvert : l\'option est relue, coupée', await option().getAttribute('aria-checked') === 'false');
    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=TICKET_Z]').click());
    ok('Ticket Z : option non proposée', await option().count() === 0);
    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=VENTE]').click());
    await apresApercu(() => option().click());
    await enregistrer();
    const apres = await ticket();
    ok('Option remise sur oui : enregistrée, la mention revient sous les 2 lignes en promotion', enBase('VENTE', 80).promotion === true && rapprocher(apres.articles, true).length === 0,
      JSON.stringify(rapprocher(apres.articles, true)));
    ok('Aucune fenêtre surgissante', !(await p.evaluate(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible()))));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    if (b) { await b.close(); }
    remettreTable();
    if (LIGNES.length) { remettreLignes(); }
    ok('Réglages et lignes de la vente remis comme avant', TABLE() === AVANT && LIGNES.every(([id, , , , , o]) => q(`SELECT CONCAT_WS('|', IFNULL(promotion_produit_id, 'NULL'), IFNULL(promo_type, 'NULL'), IFNULL(promo_mode, 'NULL'), IFNULL(promo_seuil, 'NULL'), IFNULL(promo_gratuites, 'NULL'), IFNULL(int_FREE_PACK_NUMBER, 'NULL')) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${id}'`) === o));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
