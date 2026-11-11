/* PLAN DU 09/11, POINT 10 : ACTIVITE DES EQUIPES (FENETRE DU TABLEAU DE BORD), BOUTON « 1 MOIS » ET SELECTEUR DE GARDE.
 *
 * Jeu d'essai pose en base (retire a la fin) : une garde de nuit E2E (avant-hier 20 h -> hier 8 h) et 7 ventes au
 * comptant autour d'elle :
 *  - avant la garde (19 h 04), pendant (20 h 33, 23 h 25 -- vente de plus de 10 min --, 2 h 02, 7 h 55), apres (8 h 12) ;
 *  - une vente annulee pendant la garde (annulation a 3 h 30) ;
 *  - quantites et montants varies.
 * Par les vues (compte de test) :
 *  - tableau de bord, clic sur la carte « Activite des equipes » : la fenetre propose Hier, 3 jours, 1 semaine, 1 mois ;
 *  - « 1 mois » : Du = aujourd'hui - 29 jours, Au = aujourd'hui, la requete porte ces dates ;
 *  - choix de la garde dans la liste « Garde » : les dates passent a celles de la garde, la requete porte la garde ;
 *    tuiles « Ventes encaissees », « Ventes annulees » et ventes longues = API = base, comptees de 20 h a 8 h seulement
 *    (rapprochement) ; affluence par heure = heures des 4 ventes de la garde ; libelle de la periode = la garde ;
 *    le tableau « CA par employe et tranche horaire » suit la garde (ventes et CA = base) ;
 *  - coherence : ventes de la garde + ventes hors garde des deux jours = ventes des deux jours entiers ;
 *  - un bouton de periode remet la journee entiere (la garde est quittee) ;
 *  - aucune erreur JavaScript ; bilan : aucune vente ni garde d'essai ne reste.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, choisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const M = 'E2E-AEGM';
const GARDE = 'E2E-GARDE-AEGM';
const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const A2 = q("SELECT lg_USER_ID FROM t_user WHERE str_STATUT = 'enable' AND lg_USER_ID <> '" + U + "' AND lg_USER_ID NOT LIKE 'E2E%' ORDER BY lg_USER_ID LIMIT 1");
const J = q('SELECT CURDATE()'), D1 = q('SELECT CURDATE() - INTERVAL 2 DAY'), D2 = q('SELECT CURDATE() - INTERVAL 1 DAY');
const J29 = q('SELECT CURDATE() - INTERVAL 29 DAY');
const DE = D1 + ' 20:00:00', A = D2 + ' 08:00:00';
const PRODUITS = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY lg_FAMILLE_ID LIMIT 3").split('\n');
const MODELE = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_TYPE_VENTE_ID = '1' AND str_STATUT = 'is_Closed' LIMIT 1");
/* [suffixe, jour, caissiere, ouverture, encaissement, prix, annulee, lignes [quantite, prix]] */
const VENTES = [
  ['1', D1, U, '19:00:00', '19:04:00', 5200, 0, [[2, 5200]]],
  ['2', D1, U, '20:30:00', '20:33:00', 12500, 0, [[3, 7500], [1, 5000]]],
  ['3', D1, A2, '23:10:00', '23:25:00', 3100, 0, [[1, 3100]]],
  ['4', D2, U, '02:00:00', '02:02:00', 8800, 0, [[4, 8800]]],
  ['5', D2, A2, '07:50:00', '07:55:00', 1900, 0, [[1, 1000], [2, 900]]],
  ['6', D2, U, '08:10:00', '08:12:00', 4400, 0, [[1, 4400]]],
  ['7', D2, U, '03:00:00', '03:02:00', 9900, 1, [[1, 9900]]]
];
function retirer() {
  q(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%';`
    + ` DELETE FROM garde WHERE id = '${GARDE}'`);
}
function poser() {
  q(`INSERT INTO garde (id, libelle, date_debut, date_fin, created_at) VALUES ('${GARDE}', 'Garde E2E de nuit', '${DE}', '${A}', NOW())`);
  for (const [s, jour, c, ouv, enc, prix, annulee, lignes] of VENTES) {
    const id = M + '-' + s;
    q(`CREATE TEMPORARY TABLE tmp_v AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${MODELE}';`
      + ` UPDATE tmp_v SET lg_PREENREGISTREMENT_ID = '${id}', str_REF = '${id}', str_REF_TICKET = '${id}', int_PRICE = ${prix}, int_PRICE_REMISE = 0,`
      + ` int_CUST_PART = ${prix}, str_STATUT = 'is_Closed', b_IS_CANCEL = ${annulee}, b_IS_AVOIR = 0, lg_TYPE_VENTE_ID = '1',`
      + ` lg_USER_CAISSIER_ID = '${c}', lg_USER_VENDEUR_ID = '${c}', lg_USER_ID = '${c}', dt_CREATED = '${jour} ${ouv}', dt_UPDATED = '${jour} ${enc}',`
      + ` completion_date = '${jour} ${enc}', dt_ANNULER = ${annulee ? `'${jour} 03:30:00'` : 'NULL'};`
      + ' INSERT INTO t_preenregistrement SELECT * FROM tmp_v; DROP TEMPORARY TABLE tmp_v;');
    lignes.forEach(([qte, montant], i) => q('INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID,'
      + ' int_QUANTITY, int_QUANTITY_SERVED, int_PRICE, int_PRICE_UNITAIR, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, montantTva, valeurTva, prixAchat)'
      + ` VALUES ('${id}-${i}', '${id}', '${PRODUITS[i]}', ${qte}, ${qte}, ${montant}, ${Math.round(montant / qte)}, 'is_Closed', '${jour} ${ouv}', '${jour} ${enc}', 0, 0, 0, 0)`));
  }
}
/* calculs independants depuis la base, sur une plage [de, a[ */
const VALIDE = "p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'"
  + ' AND EXISTS (SELECT 1 FROM t_preenregistrement_detail x WHERE x.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)';
const ventesBase = (de, a) => Number(q(`SELECT COUNT(*) FROM t_preenregistrement p WHERE ${VALIDE} AND p.dt_UPDATED >= '${de}' AND p.dt_UPDATED < '${a}'`));
const heuresBase = (de, a) => q(`SELECT DISTINCT HOUR(p.dt_CREATED) FROM t_preenregistrement p WHERE ${VALIDE} AND p.dt_UPDATED >= '${de}' AND p.dt_UPDATED < '${a}' ORDER BY 1`).split('\n').filter(Boolean).map(Number);
const longuesBase = (de, a) => Number(q(`SELECT COUNT(*) FROM t_preenregistrement p WHERE ${VALIDE} AND p.dt_UPDATED >= '${de}' AND p.dt_UPDATED < '${a}'`
  + ' AND TIMESTAMPDIFF(SECOND, p.dt_CREATED, COALESCE(p.completion_date, p.dt_UPDATED)) > 600'));
const annulBase = (de, a) => Number(q(`SELECT COUNT(*) FROM t_preenregistrement p WHERE p.b_IS_CANCEL = 1 AND p.int_PRICE > 0 AND p.dt_ANNULER >= '${de}' AND p.dt_ANNULER < '${a}'`
  + ' AND NOT EXISTS (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID)'));

(async () => {
  retirer();
  poser();
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    ok('Jeu d\'essai : garde de nuit et 7 ventes (avant, pendant, après, une annulée), montants et quantités variés',
      q(`SELECT COUNT(*) FROM garde WHERE id = '${GARDE}'`) === '1' && q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`) === '7', '');
    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    p.on('pageerror', (e) => erreurs.push(String(e.message)));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => Ext.ComponentQuery.query('tableaubord').length && document.querySelector('[data-carte]'), null, { timeout: 90000 });
    await p.evaluate(() => { const c = document.querySelector('[data-carte="activite"]'); if (c) { c.scrollIntoView(); } });
    await p.waitForFunction(() => document.querySelector('[data-carte="activite"] .tb-activite'), null, { timeout: 120000 });
    const FEN = 'window[itemId=tbActiviteFenetre] activiteequipes';
    const attendre = () => p.waitForFunction((s) => { const a = Ext.ComponentQuery.query(s)[0];
      return a && a.analyses.rendered && !(a.analyses.loadMask && a.analyses.loadMask.isVisible()) && a.getEl().dom.querySelector('.ae-tuile'); }, FEN, { timeout: 180000 })
      .then(() => p.waitForTimeout(1500));
    await Promise.all([p.waitForResponse((x) => /activite-equipes\/analyses\?/.test(x.url()), { timeout: 180000 }), p.click('[data-carte="activite"] .tb-activite')]);
    await attendre();
    const boutons = await p.evaluate((s) => { const a = Ext.ComponentQuery.query(s)[0]; return ['aeHier', 'ae3Jours', 'aeSemaine', 'aeMois'].map((x) => (a.down('#' + x) ? a.down('#' + x).getText() : null)); }, FEN);
    ok('Fenêtre : boutons Hier, 3 jours, 1 semaine, 1 mois', boutons.join('|') === 'Hier|3 jours|1 semaine|1 mois', boutons.join('|'));

    /* 1 mois */
    const id = await p.evaluate((s) => { const x = Ext.ComponentQuery.query(s)[0].down('#aeMois'); return x ? x.getId() : null; }, FEN);
    if (!id) { throw new Error('bouton 1 mois absent'); }
    const [rMois] = await Promise.all([p.waitForResponse((x) => /activite-equipes\/analyses\?/.test(x.url()), { timeout: 180000 }), p.click('#' + id)]);
    await attendre();
    const mois = await p.evaluate((s) => { const a = Ext.ComponentQuery.query(s)[0]; return { du: a.down('#aeDebut').getSubmitValue(), au: a.down('#aeFin').getSubmitValue(), presse: a.down('#aeMois').pressed }; }, FEN);
    ok('« 1 mois » : Du = aujourd\'hui − 29 jours, Au = aujourd\'hui, bouton enfoncé, requête sur ces dates',
      mois.du === J29 && mois.au === J && mois.presse && rMois.url().includes('debut=' + J29) && rMois.url().includes('fin=' + J), JSON.stringify(mois) + ' ' + rMois.url());

    /* garde */
    await p.waitForFunction((s) => { const c = Ext.ComponentQuery.query(s)[0].down('#aeGardePeriode'); return c && c.getStore().getCount() > 0; }, FEN, { timeout: 60000 });
    const libelle = await p.evaluate(([s, g]) => { const c = Ext.ComponentQuery.query(s)[0].down('#aeGardePeriode'), r = c.getStore().getById(g);
      return r ? r.get(c.displayField) : null; }, [FEN, GARDE]);
    ok('La liste « Garde » de la fenêtre propose la garde d\'essai', !!libelle, libelle);
    const repTranches = p.waitForResponse((x) => /activite-equipes\/ca-tranches\?/.test(x.url()) && /gardeId=/.test(x.url()), { timeout: 180000 });
    const [rG] = await Promise.all([p.waitForResponse((x) => /activite-equipes\/analyses\?/.test(x.url()) && /gardeId=/.test(x.url()), { timeout: 180000 }),
      choisir(p, FEN + ' #aeGardePeriode', libelle)]);
    const tranches = (await (await repTranches).json()).data;
    await attendre();
    const api = (await rG.json()).data;
    const ecran = await p.evaluate((s) => { const a = Ext.ComponentQuery.query(s)[0], el = a.getEl().dom;
      const t = {}; el.querySelectorAll('.ae-tuile').forEach((x) => { t[x.getAttribute('data-code')] = x.querySelector('.v').getAttribute('data-cible'); });
      const titre = el.querySelector('.ae-titre-bloc'); return { du: a.down('#aeDebut').getSubmitValue(), au: a.down('#aeFin').getSubmitValue(), tuiles: t,
        periode: titre ? titre.textContent : '', boutons: ['aeHier', 'ae3Jours', 'aeSemaine', 'aeMois'].filter((x) => a.down('#' + x).pressed) }; }, FEN);
    ok('Garde choisie : Du / Au = jours de la garde, aucun bouton de période enfoncé, requête avec la garde', ecran.du === D1 && ecran.au === D2 && ecran.boutons.length === 0
      && rG.url().includes('gardeId=' + GARDE), JSON.stringify(ecran) + ' ' + rG.url());
    const base = { ventes: ventesBase(DE, A), annul: annulBase(DE, A), longues: longuesBase(DE, A) };
    const tuileApi = (c) => { const i = api.indicateurs.find((x) => x.code === c); return i ? Number(i.valeur) : null; };
    ok('Rapprochement garde : ventes encaissées écran = API = base, de 20 h à 8 h seulement (4)', Number(ecran.tuiles.VENTES) === tuileApi('VENTES') && tuileApi('VENTES') === base.ventes && base.ventes === 4,
      JSON.stringify({ ecran: ecran.tuiles.VENTES, api: tuileApi('VENTES'), base: base.ventes }));
    ok('Rapprochement garde : ventes annulées (1) et ventes longues (1) écran = API = base', Number(ecran.tuiles.ANNULATIONS) === tuileApi('ANNULATIONS') && tuileApi('ANNULATIONS') === base.annul && base.annul === 1
      && Number(ecran.tuiles.LONGUES) === tuileApi('LONGUES') && tuileApi('LONGUES') === base.longues && base.longues === 1, JSON.stringify({ ecran: ecran.tuiles, base }));
    const caBase = Number(q(`SELECT IFNULL(SUM(p.int_PRICE), 0) FROM t_preenregistrement p WHERE ${VALIDE} AND p.dt_UPDATED >= '${DE}' AND p.dt_UPDATED < '${A}'`));
    ok('« CA par employé et tranche horaire » suit la garde : 4 ventes, CA = base', tranches.totaux.ventes === base.ventes && tranches.totaux.ca === caBase,
      JSON.stringify({ api: tranches.totaux.ventes + '/' + tranches.totaux.ca, base: base.ventes + '/' + caBase }));
    const heuresApi = api.heures.map((h) => h.heure).sort((x, y) => x - y);
    ok('Affluence par heure : seules les heures des ventes de la garde (2, 7, 20, 23)', JSON.stringify(heuresApi) === JSON.stringify(heuresBase(DE, A)) && heuresApi.join(',') === '2,7,20,23', heuresApi.join(','));
    ok('Libellé de la période = la garde, avec ses heures', api.garde && api.garde.libelle === 'Garde E2E de nuit' && /Garde E2E de nuit/.test(ecran.periode) && /20:00/.test(ecran.periode) && /08:00/.test(ecran.periode),
      JSON.stringify({ garde: api.garde, periode: ecran.periode }));
    const jours = ventesBase(D1 + ' 00:00:00', J + ' 00:00:00'), hors = ventesBase(D1 + ' 00:00:00', DE) + ventesBase(A, J + ' 00:00:00');
    ok('Cohérence : ventes de la garde + ventes hors garde = ventes des deux jours entiers', base.ventes + hors === jours && jours === 6, `${base.ventes} + ${hors} = ${jours}`);

    /* un bouton de periode quitte la garde */
    const idH = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].down('#ae3Jours').getId(), FEN);
    const [r3] = await Promise.all([p.waitForResponse((x) => /activite-equipes\/analyses\?/.test(x.url()), { timeout: 180000 }), p.click('#' + idH)]);
    await attendre();
    const apres = await p.evaluate((s) => { const a = Ext.ComponentQuery.query(s)[0]; return { garde: a.down('#aeGardePeriode').getValue(), du: a.down('#aeDebut').getSubmitValue() }; }, FEN);
    ok('« 3 jours » après une garde : la garde est quittée, la requête ne la porte plus', !apres.garde && !/gardeId=/.test(r3.url()) && apres.du === D1, JSON.stringify(apres) + ' ' + r3.url());
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    retirer();
    ok('Bilan : aucune vente ni garde d\'essai ne reste', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`) === '0'
      && q(`SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`) === '0' && q(`SELECT COUNT(*) FROM garde WHERE id = '${GARDE}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
