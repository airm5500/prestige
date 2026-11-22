/* RETOUR DU 15/11 : « Suivi des bons » (Facturation, et onglet « Bordereaux / suivi ») : la requete
 * GET /api/v1/client/ventes-tierspayant attendait ~500 ms pour 2 bons.
 *
 * Cause : DATE(p.dt_CREATED) BETWEEN ... empechait l'index sur la date de vente ; toutes les ventes a tiers payant
 * etaient parcourues quelle que soit la periode. Correction : meme periode ecrite en intervalle [debut 0 h ; lendemain
 * de fin 0 h[.
 *
 * Vrai chemin : menu FACTURATION › Suivi des bons ; dates tapees au clavier dans « Du » et « Au », clic sur
 * « rechercher ». Cinq periodes variees autour de la derniere vente a tiers payant de la base d'essai : un jour, une
 * semaine, un mois, une periode passee de 3 semaines, un an.
 * Controles, pour chaque periode :
 *  - rapprochement ligne par ligne : grille (organisme, nombre de dossiers, montant) = base, calculee avec l'ANCIENNE
 *    definition de la periode (DATE() BETWEEN) : la correction ne change aucun resultat ;
 *  - coherence : « Nombre de dossiers » et « Montant total » affiches = somme des lignes ;
 *  - delai : temps de reponse du serveur (mesure du navigateur) < 100 ms sur un jour, < 200 ms sur une semaine,
 *    < 300 ms sur un mois et sur 3 semaines passees, < 1 500 ms sur un an (ancien code : 445, 529, 640, 575, 879 ms) ;
 *    affichage (clic -> grille remplie) < 1 500 ms.
 * Lecture seule : rien n'est ecrit.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const iso = (d) => d.toISOString().slice(0, 10);
const fr = (s) => s.split('-').reverse().join('/');
const DERNIER = q("SELECT DATE(MAX(p.dt_CREATED)) FROM t_preenregistrement_compte_client_tiers_payent r JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = r.lg_PREENREGISTREMENT_ID"
  + " WHERE p.str_STATUT = 'is_Closed' AND r.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.dt_CREATED <= NOW()");
const decale = (j) => { const d = new Date(DERNIER + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + j); return iso(d); };
const PERIODES = [
  { nom: 'un jour', du: DERNIER, au: DERNIER, max: 100 },
  { nom: 'une semaine', du: decale(-6), au: DERNIER, max: 200 },
  { nom: 'un mois', du: decale(-30), au: DERNIER, max: 300 },
  { nom: '3 semaines passées', du: decale(-75), au: decale(-55), max: 300 },
  { nom: 'un an', du: decale(-365), au: DERNIER, max: 1500 }
];
/* base, ancienne definition de la periode */
const enBase = (du, au) => q("SELECT CONCAT(IFNULL(t.str_CODE_ORGANISME, ''), '|', COUNT(*), '|', SUM(r.int_PRICE)) FROM t_preenregistrement_compte_client_tiers_payent r"
  + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = r.lg_PREENREGISTREMENT_ID"
  + " JOIN t_compte_client_tiers_payant c ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = r.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
  + " JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = c.lg_TIERS_PAYANT_ID"
  + ` WHERE DATE(p.dt_CREATED) BETWEEN '${du}' AND '${au}' AND p.str_STATUT = 'is_Closed' AND r.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0`
  + ' AND p.int_PRICE > 0 AND r.int_PRICE > 0 GROUP BY t.lg_TIERS_PAYANT_ID').split('\n').filter(Boolean).sort();

(async () => {
  ok('Précondition : ventes à tiers payant en base d\'essai (dernière le ' + DERNIER + ')', /^\d{4}-\d{2}-\d{2}$/.test(DERNIER));
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    const reponses = [];
    p.on('requestfinished', (r) => { if (/\/api\/v1\/client\/ventes-tierspayant\?/.test(r.url())) { const t = r.timing(); reponses.push({ url: r.url(), serveur: Math.round(t.responseStart - t.requestStart), total: Math.round(t.responseEnd - t.requestStart) }); } });
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'FACTURATION', 'Suivi des bons');
    await p.waitForFunction(() => Ext.ComponentQuery.query('tpventes').some((c) => c.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const bouton = await p.evaluate(() => '#' + Ext.ComponentQuery.query('tpventes #rechercher')[0].getEl().id);
    for (const per of PERIODES) {
      /* plan du 21/11, point 7.2 (retour du 22/11) : la periode se tape d'un coup dans le selecteur unique */
      await vues.saisirPeriode(p, 'tpventes #dtEnd', fr(per.du), fr(per.au));
      reponses.length = 0;
      const t0 = Date.now();
      await p.click(bouton);
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('tpventes #uggid')[0]; return g && !g.getStore().isLoading() && g.getView().getNode(0) !== undefined || (g && !g.getStore().isLoading() && g.getStore().getCount() === 0); }, null, { timeout: 60000 });
      const affichage = Date.now() - t0;
      await p.waitForTimeout(300);
      const ecran = await p.evaluate(() => { const v = Ext.ComponentQuery.query('tpventes')[0], g = v.down('#uggid');
        return { lignes: g.getStore().getRange().map((r) => (r.get('codeTiersPayant') || '') + '|' + r.get('nbreDossier') + '|' + r.get('montant')).sort(),
          dossiers: v.down('#nbre').getValue(), montant: v.down('#montant').getValue(), du: v.down('#dtStart').getSubmitValue(), au: v.down('#dtEnd').getSubmitValue() }; });
      const base = enBase(per.du, per.au);
      const somme = (k) => ecran.lignes.reduce((s, l) => s + Number(l.split('|')[k]), 0);
      const nombre = (x) => Number(String(x).replace(/[^\d-]/g, ''));
      const diff = base.filter((l) => !ecran.lignes.includes(l)).concat(ecran.lignes.filter((l) => !base.includes(l)).map((l) => 'écran ' + l));
      ok(`${per.nom} (${fr(per.du)} → ${fr(per.au)}) : grille = base ligne par ligne (${base.length} organisme(s))`,
        ecran.du === per.du && ecran.au === per.au && diff.length === 0 && base.length > 0, diff.slice(0, 3).join(' ; ') + ' ' + ecran.du + ' ' + ecran.au);
      ok(`${per.nom} : « Nombre de dossiers » et « Montant total » = somme des lignes`, nombre(ecran.dossiers) === somme(1) && nombre(ecran.montant) === somme(2),
        ecran.dossiers + ' / ' + somme(1) + ' ; ' + ecran.montant + ' / ' + somme(2));
      const r = reponses[reponses.length - 1] || { serveur: -1, total: -1 };
      ok(`${per.nom} : réponse du serveur < ${per.max} ms, affichage < 1 500 ms`, r.serveur >= 0 && r.serveur < per.max && affichage < 1500,
        'serveur ' + r.serveur + ' ms, réception ' + r.total + ' ms, affichage ' + affichage + ' ms');
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Déroulement', false, x.stack);
  } finally {
    await b.close();
    const n = res.filter(Boolean).length;
    console.log(n + '/' + res.length + (n === res.length ? ' OK' : ' ÉCHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
