/* DATES DE LA FICHE ARTICLE (demande du 12/11) — rapprochement ecran / API / base / recalcul, lecture seule.
 *
 * Derniere vente, derniere entree et dernier inventaire sont maintenant tenus dans t_famille par les declencheurs
 * (R__dates_fiche_article.sql) ; la fiche les lit au lieu de les recalculer. La date de creation est affichee.
 * Pour des articles varies (graine fixe : tres vendu, jamais vendu, sans entree, inventorie, au hasard) :
 *  - ecran « Détail sur l'article » (liste des articles, recherche par CIP, icone de la ligne) = fiche recue ;
 *  - fiche recue = colonnes de t_famille = recalcul independant (MAX sur l'historique, regles de la fiche) ;
 *  - la date de creation est affichee et egale a t_famille.dt_CREATED ;
 *  - aucune erreur JavaScript.
 * Echoue sur l'ancien code : le champ « Date de création » n'existe pas.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const un = (s) => (q(s).split(/\r?\n/)[0] || '').split('\t');
const F = (c) => "IFNULL(DATE_FORMAT(" + c + ", '%d/%m/%Y %H:%i'), '')";

const articles = [];
const ajouter = (l, quoi) => { if (l[0] && !articles.some((a) => a.id === l[0])) { articles.push({ id: l[0], cip: l[1], quoi }); } };
ajouter(un("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.dt_DATE_LAST_SORTIE IS NOT NULL ORDER BY f.dt_DATE_LAST_SORTIE DESC LIMIT 1"), 'vendu en dernier');
ajouter(un("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.dt_DATE_LAST_SORTIE IS NULL ORDER BY CRC32(CONCAT(f.lg_FAMILLE_ID, '1211')) LIMIT 1"), 'jamais vendu');
ajouter(un("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.dt_DATE_LAST_ENTREE IS NULL ORDER BY CRC32(CONCAT(f.lg_FAMILLE_ID, '1211')) LIMIT 1"), 'sans entrée');
ajouter(un("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.dt_LAST_INVENTAIRE IS NOT NULL ORDER BY CRC32(CONCAT(f.lg_FAMILLE_ID, '1211')) LIMIT 1"), 'inventorié');
ajouter(un("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.dt_DATE_LAST_ENTREE IS NOT NULL ORDER BY f.dt_DATE_LAST_ENTREE DESC LIMIT 1"), 'entré en dernier');
q("SELECT lg_FAMILLE_ID, int_CIP FROM t_famille WHERE str_STATUT = 'enable' ORDER BY CRC32(CONCAT(lg_FAMILLE_ID, '20261112')) LIMIT 4")
  .split(/\r?\n/).forEach((l) => ajouter(l.split('\t'), 'au hasard'));

/* recalcul independant, regles de la fiche (officine) */
function attendu(id) {
  const l = un("SELECT " + F('f.dt_CREATED') + ", " + F('f.dt_DATE_LAST_SORTIE') + ", " + F('f.dt_DATE_LAST_ENTREE') + ", " + F('f.dt_LAST_INVENTAIRE') + ","
    + F("(SELECT MAX(p.dt_UPDATED) FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
      + " WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND u.lg_EMPLACEMENT_ID = '1')") + ","
    + F("(SELECT MAX(COALESCE((SELECT MAX(h.createdAt) FROM hmvtproduit h WHERE h.typeMvt = '01' AND h.pkey = bld.lg_BON_LIVRAISON_DETAIL), bl.dt_UPDATED)) FROM t_bon_livraison_detail bld"
      + " JOIN t_bon_livraison bl ON bl.lg_BON_LIVRAISON_ID = bld.lg_BON_LIVRAISON_ID WHERE bld.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND bl.str_STATUT = 'is_Closed')") + ","
    + F("(SELECT MAX(i.dt_UPDATED) FROM t_inventaire_famille l JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = l.lg_INVENTAIRE_ID JOIN t_user u ON u.lg_USER_ID = i.lg_USER_ID"
      + " WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND i.str_STATUT = 'is_Closed' AND u.lg_EMPLACEMENT_ID = '1')")
    + " FROM t_famille f WHERE f.lg_FAMILLE_ID = '" + id + "'");
  return { creation: l[0], vente: l[1], entree: l[2], inventaire: l[3], venteCalc: l[4], entreeCalc: l[5], inventaireCalc: l[6] };
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    ok('Jeu d\'essai : ' + articles.length + ' articles variés', articles.length >= 7, articles.map((a) => a.quoi).join(', '));
    for (const a of articles) {
      a.base = attendu(a.id);
      const t = a.base;
      ok('Base = recalcul, ' + a.quoi + ' (' + a.cip + ')', t.vente === t.venteCalc && t.entree === t.entreeCalc && t.inventaire === t.inventaireCalc, JSON.stringify(t));
    }
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 30000 });
    for (const a of articles) {
      const champ = '#' + await p.evaluate(() => Ext.getCmp('rechecher').inputEl.dom.id);
      await p.click(champ);
      await p.fill(champ, a.cip);
      await p.keyboard.press('Enter');
      await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', id) >= 0; }, a.id, { timeout: 60000 });
      const recue = p.waitForResponse((r) => /produit-search\/produits\//.test(r.url()), { timeout: 60000 });
      await p.evaluate((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onDetailClick(g, g.getStore().findExact('lg_FAMILLE_ID', id)); }, a.id);
      const fiche = ((await (await recue).json()) || {}).data || {};
      await p.waitForFunction(() => { const c = Ext.getCmp('str_DESCRIPTION'); return c && c.isVisible(true) && c.getValue(); }, null, { timeout: 60000 });
      await p.waitForTimeout(1500);
      const vu = await p.evaluate(() => {
        const v = (id) => { const c = Ext.getCmp(id); return c ? String(c.getValue() === null || c.getValue() === undefined ? '' : c.getValue()) : '(absent)'; };
        const c = Ext.getCmp('dt_CREATED_DETAIL_ARTICLE');
        return { vente: v('dt_LAST_VENTE'), entree: v('dt_LAST_ENTREE'), inventaire: v('dt_LAST_INVENTAIRE'), creation: v('dt_CREATED_DETAIL_ARTICLE'),
          libelleCreation: c ? c.getFieldLabel() : '', creationVisible: !!(c && c.isVisible(true)) };
      });
      const t = a.base;
      ok('Fiche reçue = base, ' + a.quoi + ' : vente, entrée, inventaire, création',
        String(fiche.dt_LAST_VENTE || '') === t.vente && String(fiche.dt_LAST_ENTREE || '') === t.entree
        && String(fiche.dt_LAST_INVENTAIRE || '') === t.inventaire && String(fiche.dt_CREATED || '') === t.creation,
        JSON.stringify({ vente: fiche.dt_LAST_VENTE, entree: fiche.dt_LAST_ENTREE, inventaire: fiche.dt_LAST_INVENTAIRE, creation: fiche.dt_CREATED }) + ' / ' + JSON.stringify(t));
      ok('Écran = base, ' + a.quoi + ' : entrée, inventaire, vente',
        vu.entree === t.entree && vu.inventaire === t.inventaire && (t.vente ? vu.vente.indexOf(t.vente) === 0 : /Jamais vendu/.test(vu.vente)), JSON.stringify(vu));
      ok('Écran, ' + a.quoi + ' : « Date de création » visible et égale à la base', vu.creationVisible && /création/i.test(vu.libelleCreation) && vu.creation === t.creation && t.creation !== '',
        JSON.stringify(vu) + ' / ' + t.creation);
      await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => /Detail sur l'article/.test(w.title || '')).forEach((w) => w.close()));
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
