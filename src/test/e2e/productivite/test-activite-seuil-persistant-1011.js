/* PLAN DU 09/11, POINT 10 : LE CRITERE DES VENTES LONGUES (« PLUS DE 10 MIN ») EST PARAMETRABLE ET PERSISTANT PARTOUT.
 *
 * Jeu d'essai pose en base (retire a la fin, parametres remis comme avant) : 7 ventes au comptant du jour, de durees
 * variees (3 min, 8 min pile, 9 min, 10 min pile, 12 min 30, 25 min, et une vente de 20 min annulee), deux caissieres,
 * montants et quantites varies. Critere enregistre au depart : plus de 10 min.
 * Par les vues (compte de test) :
 *  - carte du tableau de bord : « Ventes de plus de 10 min » et son nombre = base (> 600 s) ;
 *  - fenetre de la carte : la barre montre « plus de » 10, « Enregistrer pour tous » est grise ;
 *  - essai « au moins » 8 (liste puis saisie + Entree) : la requete porte le critere, tuile = base (>= 480 s), la barre
 *    dit « essai, non enregistre », le bouton s'active, la base garde plus de 10 min ;
 *  - premier clic sur « Enregistrer pour tous » : le bouton demande « Confirmer pour tous ? », rien n'est ecrit ;
 *    second clic : parametres = GE / 8 en base, bouton grise, la barre ne dit plus « essai » ;
 *  - autre poste (nouvelle connexion) : la carte du tableau de bord dit « Ventes de 8 min ou plus », nombre = base ;
 *    menu Activite des equipes : la barre montre « au moins » 8 sans rien envoyer, tuile = base sur les dates de l'ecran ;
 *    onglet Anomalies : en-tete « Ventes ≥ 8 min », ventes longues par caissiere = base (rapprochement par employe) ;
 *  - coherence : ventes >= 8 min = ventes > 10 min + ventes de 8 a 10 min pile compris ;
 *  - un critere invalide (0 min, operateur inconnu) est refuse et ne change rien en base ;
 *  - aucune erreur JavaScript ; bilan : ventes d'essai retirees, parametres revenus a leur etat d'avant.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const M = 'E2E-AESL';
const K_OP = 'KEY_TABLEAU_BORD_SEUIL_VENTE_LONGUE_OP', K_MIN = 'KEY_TABLEAU_BORD_SEUIL_VENTE_LONGUE_MIN';
const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const A2 = q("SELECT lg_USER_ID FROM t_user WHERE str_STATUT = 'enable' AND lg_USER_ID <> '" + U + "' AND lg_USER_ID NOT LIKE 'E2E%' ORDER BY lg_USER_ID LIMIT 1");
const J = q('SELECT CURDATE()');
const PRODUITS = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY lg_FAMILLE_ID LIMIT 3").split('\n');
const MODELE = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_TYPE_VENTE_ID = '1' AND str_STATUT = 'is_Closed' LIMIT 1");
/* [suffixe, caissiere, ouverture, encaissement, prix, annulee, lignes [quantite, prix]] */
const VENTES = [
  ['1', U, '01:00:00', '01:03:00', 2500, 0, [[2, 2500]]],
  ['2', U, '01:10:00', '01:18:00', 7300, 0, [[1, 5300], [2, 2000]]],
  ['3', U, '01:30:00', '01:39:00', 4100, 0, [[3, 4100]]],
  ['4', A2, '02:00:00', '02:10:00', 6600, 0, [[1, 6600]]],
  ['5', A2, '02:20:00', '02:32:30', 1800, 0, [[2, 1000], [1, 800]]],
  ['6', U, '03:00:00', '03:25:00', 12000, 0, [[4, 12000]]],
  ['7', U, '04:00:00', '04:20:00', 9900, 1, [[1, 9900]]]
];
const AVANT = q(`SELECT str_KEY, str_VALUE FROM t_parameters WHERE str_KEY IN ('${K_OP}', '${K_MIN}')`).split('\n').filter(Boolean).map((l) => l.split('\t'));
const param = (k) => q(`SELECT IFNULL(MAX(str_VALUE), '') FROM t_parameters WHERE str_KEY = '${k}'`);
function poserParam(k, v) {
  q(`INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${k}', '${v}', 'E2E', 'CUSTOMER', 'enable', NOW(), NOW())`
    + ` ON DUPLICATE KEY UPDATE str_VALUE = '${v}'`);
}
function remettreParams() {
  [K_OP, K_MIN].forEach((k) => { const av = AVANT.find((x) => x[0] === k);
    q(av ? `UPDATE t_parameters SET str_VALUE = '${av[1]}' WHERE str_KEY = '${k}'` : `DELETE FROM t_parameters WHERE str_KEY = '${k}'`); });
}
function retirer() {
  q(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`);
}
function poser() {
  for (const [s, c, ouv, enc, prix, annulee, lignes] of VENTES) {
    const id = M + '-' + s;
    q(`CREATE TEMPORARY TABLE tmp_v AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${MODELE}';`
      + ` UPDATE tmp_v SET lg_PREENREGISTREMENT_ID = '${id}', str_REF = '${id}', str_REF_TICKET = '${id}', int_PRICE = ${prix}, int_PRICE_REMISE = 0,`
      + ` int_CUST_PART = ${prix}, str_STATUT = 'is_Closed', b_IS_CANCEL = ${annulee}, b_IS_AVOIR = 0, lg_TYPE_VENTE_ID = '1',`
      + ` lg_USER_CAISSIER_ID = '${c}', lg_USER_VENDEUR_ID = '${c}', lg_USER_ID = '${c}', dt_CREATED = '${J} ${ouv}', dt_UPDATED = '${J} ${enc}',`
      + ` completion_date = '${J} ${enc}', dt_ANNULER = ${annulee ? `'${J} 04:30:00'` : 'NULL'};`
      + ' INSERT INTO t_preenregistrement SELECT * FROM tmp_v; DROP TEMPORARY TABLE tmp_v;');
    lignes.forEach(([qte, montant], i) => q('INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID,'
      + ' int_QUANTITY, int_QUANTITY_SERVED, int_PRICE, int_PRICE_UNITAIR, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, montantTva, valeurTva, prixAchat)'
      + ` VALUES ('${id}-${i}', '${id}', '${PRODUITS[i]}', ${qte}, ${qte}, ${montant}, ${Math.round(montant / qte)}, 'is_Closed', '${J} ${ouv}', '${J} ${enc}', 0, 0, 0, 0)`));
  }
}
/* calcul independant depuis la base : ventes de la plage [de, a[ dont la duree respecte le critere */
const VALIDE = "p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'"
  + ' AND EXISTS (SELECT 1 FROM t_preenregistrement_detail x WHERE x.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)';
const DUREE = 'TIMESTAMPDIFF(SECOND, p.dt_CREATED, COALESCE(p.completion_date, p.dt_UPDATED))';
const OPS = { GT: '>', GE: '>=', LT: '<', LE: '<=' };
const longuesBase = (de, a, op, min, user) => Number(q(`SELECT COUNT(*) FROM t_preenregistrement p WHERE ${VALIDE} AND p.dt_UPDATED >= '${de}' AND p.dt_UPDATED < '${a}'`
  + ` AND ${DUREE} ${OPS[op]} ${min * 60}` + (user ? ` AND p.lg_USER_ID = '${user}'` : '')));
const lendemain = (d) => q(`SELECT DATE('${d}') + INTERVAL 1 DAY`);

(async () => {
  retirer();
  poserParam(K_OP, 'GT');
  poserParam(K_MIN, '10');
  poser();
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  const JOUR = [J + ' 00:00:00', lendemain(J) + ' 00:00:00'];
  try {
    ok('Jeu d\'essai : 7 ventes du jour de 3 à 25 min (dont 8 et 10 min pile, une annulée), deux caissières ; critère enregistré : plus de 10 min',
      q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`) === '7' && param(K_OP) === 'GT' && param(K_MIN) === '10');
    const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(String(e.message)));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const carte = async (pg) => {
      await pg.waitForFunction(() => Ext.ComponentQuery.query('tableaubord').length && document.querySelector('[data-carte]'), null, { timeout: 90000 });
      await pg.evaluate(() => { const c = document.querySelector('[data-carte="activite"]'); if (c) { c.scrollIntoView(); } });
      await pg.waitForFunction(() => document.querySelector('[data-carte="activite"] .ae-rep[data-rep="LONGUES"]'), null, { timeout: 120000 });
      return pg.evaluate(() => { const t = document.querySelector('[data-carte="activite"] .ae-rep[data-rep="LONGUES"]');
        return { texte: t.querySelector('.l').textContent, v: Number(t.querySelector('.v').textContent.replace(/\D/g, '')) }; });
    };
    const c1 = await carte(p);
    const g10 = longuesBase(JOUR[0], JOUR[1], 'GT', 10);
    ok('Carte du tableau de bord : « Ventes de plus de 10 min », nombre = base (> 600 s)', /Ventes de plus de 10 min/.test(c1.texte) && c1.v === g10 && g10 >= 2,
      JSON.stringify({ c1, base: g10 }));

    /* fenetre de la carte */
    const FEN = 'window[itemId=tbActiviteFenetre] activiteequipes';
    const attendre = () => p.waitForFunction((s) => { const a = Ext.ComponentQuery.query(s)[0];
      return a && a.analyses.rendered && !(a.analyses.loadMask && a.analyses.loadMask.isVisible()) && a.getEl().dom.querySelector('.ae-tuile'); }, FEN, { timeout: 180000 })
      .then(() => p.waitForTimeout(1200));
    await Promise.all([p.waitForResponse((x) => /activite-equipes\/analyses\?/.test(x.url()), { timeout: 180000 }), p.click('[data-carte="activite"] .tb-activite')]);
    await attendre();
    const barre = (s) => p.evaluate((s) => { const a = Ext.ComponentQuery.query(s)[0], b = a.down('#aeSeuilEnregistrer');
      return { op: a.down('#aeSeuilOp').getValue(), min: a.down('#aeSeuilMin').getValue(), bouton: b ? b.getText() : null, actif: b ? !b.isDisabled() : null,
        etat: a.down('#aeSeuilEtat') ? a.down('#aeSeuilEtat').getEl().dom.textContent : null,
        tuile: Number(a.getEl().dom.querySelector('.ae-tuile[data-code="LONGUES"] .v').getAttribute('data-cible')),
        du: a.down('#aeDebut').getSubmitValue(), au: a.down('#aeFin').getSubmitValue() }; }, s);
    let e = await barre(FEN);
    ok('Fenêtre : barre « plus de » 10 min, « Enregistrer pour tous » présent et grisé', e.op === 'GT' && e.min === 10 && e.bouton === 'Enregistrer pour tous' && e.actif === false, JSON.stringify(e));

    /* essai au moins 8 */
    await Promise.all([p.waitForResponse((x) => /activite-equipes\/analyses\?/.test(x.url()) && /seuilOperateur=GE/.test(x.url()), { timeout: 180000 }),
      choisir(p, FEN + ' #aeSeuilOp', 'au moins')]);
    await attendre();
    await cliquer(p, FEN + ' #aeSeuilMin');
    await p.keyboard.press('Control+A');
    await p.keyboard.type('8', { delay: 30 });
    const [r8] = await Promise.all([p.waitForResponse((x) => /activite-equipes\/analyses\?/.test(x.url()) && /seuilMinutes=8/.test(x.url()), { timeout: 180000 }),
      p.keyboard.press('Enter')]);
    await attendre();
    e = await barre(FEN);
    const ge8 = longuesBase(e.du + ' 00:00:00', lendemain(e.au) + ' 00:00:00', 'GE', 8);
    const api8 = (await r8.json()).data;
    ok('Essai « au moins » 8 : requête GE/8, tuile = API = base (≥ 480 s), libellé « Ventes de 8 min ou plus »', e.tuile === ge8 && api8.resume.ventesLongues === ge8
      && api8.seuilLibelle === 'Ventes de 8 min ou plus' && /seuilOperateur=GE/.test(r8.url()), JSON.stringify({ ecran: e.tuile, api: api8.resume.ventesLongues, base: ge8 }));
    ok('Essai : la barre dit « essai, non enregistré », le bouton s\'active, la base garde plus de 10 min', /essai, non enregistré/.test(e.etat) && e.actif && param(K_OP) === 'GT' && param(K_MIN) === '10',
      JSON.stringify({ etat: e.etat, actif: e.actif, base: param(K_OP) + '/' + param(K_MIN) }));

    /* enregistrement : confirmation dans le bouton */
    await cliquer(p, FEN + ' #aeSeuilEnregistrer');
    e = await barre(FEN);
    ok('Premier clic : le bouton demande « Confirmer pour tous ? », aucune fenêtre, rien n\'est écrit', e.bouton === 'Confirmer pour tous ?' && param(K_MIN) === '10'
      && (await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').length)) === 0, JSON.stringify({ bouton: e.bouton, base: param(K_MIN) }));
    await p.waitForTimeout(600);
    const [rs] = await Promise.all([p.waitForResponse((x) => /activite-equipes\/seuil$/.test(x.url().replace(/\?.*/, '')) && x.request().method() === 'POST', { timeout: 60000 }),
      p.waitForResponse((x) => /activite-equipes\/analyses\?/.test(x.url()), { timeout: 180000 }),
      cliquer(p, FEN + ' #aeSeuilEnregistrer')]);
    await attendre();
    const js = await rs.json();
    e = await barre(FEN);
    ok('Second clic : paramètres GE / 8 en base, réponse = base, bouton grisé, plus de mention « essai »', param(K_OP) === 'GE' && param(K_MIN) === '8' && js.success
      && js.seuilOperateur === 'GE' && js.seuilMinutes === 8 && e.actif === false && !/essai/.test(e.etat) && e.bouton === 'Enregistrer pour tous',
      JSON.stringify({ base: param(K_OP) + '/' + param(K_MIN), js, e }));

    /* autre poste : nouvelle connexion */
    const ctx2 = await b.newContext({ viewport: { width: 1600, height: 900 } });
    const p2 = await ctx2.newPage();
    p2.on('pageerror', (x) => erreurs.push(String(x.message)));
    await connexion(p2, ENV_E2E.LOGIN, 'e2etest');
    const c2 = await carte(p2);
    const ge8j = longuesBase(JOUR[0], JOUR[1], 'GE', 8);
    ok('Autre poste, carte du tableau de bord : « Ventes de 8 min ou plus », nombre = base (≥ 480 s)', /Ventes de 8 min ou plus/.test(c2.texte) && c2.v === ge8j && ge8j > g10,
      JSON.stringify({ c2, base: ge8j, avant: g10 }));
    const pile = Number(q(`SELECT COUNT(*) FROM t_preenregistrement p WHERE ${VALIDE} AND p.dt_UPDATED >= '${JOUR[0]}' AND p.dt_UPDATED < '${JOUR[1]}' AND ${DUREE} BETWEEN 480 AND 600`));
    ok('Cohérence : ventes ≥ 8 min = ventes > 10 min + ventes de 8 à 10 min (bornes comprises)', ge8j === g10 + pile, `${ge8j} = ${g10} + ${pile}`);

    const reqs = [];
    p2.on('request', (x) => { if (/activite-equipes\/(analyses|anomalies)\?/.test(x.url())) { reqs.push(x.url()); } });
    await ouvrirMenu(p2, 'ANALYSE DE GESTION', 'Activité des équipes');
    const MENU = 'activiteequipes';
    await p2.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p2, 'activiteequipes button[itemId=ae-analyses]');
    await p2.waitForFunction((s) => { const a = Ext.ComponentQuery.query(s).filter((x) => x.isVisible(true))[0];
      return a && a.analyses.rendered && !(a.analyses.loadMask && a.analyses.loadMask.isVisible()) && a.getEl().dom.querySelector('.ae-tuile[data-code="LONGUES"]'); }, MENU, { timeout: 180000 });
    await p2.waitForTimeout(1200);
    const m = await p2.evaluate(() => { const a = Ext.ComponentQuery.query('activiteequipes').filter((x) => x.isVisible(true))[0];
      return { op: a.down('#aeSeuilOp').getValue(), min: a.down('#aeSeuilMin').getValue(), du: a.down('#aeDebut').getSubmitValue(), au: a.down('#aeFin').getSubmitValue(),
        tuile: Number(a.getEl().dom.querySelector('.ae-tuile[data-code="LONGUES"] .v').getAttribute('data-cible')), titre: a.down('#cLongues').title }; });
    const ge8m = longuesBase(m.du + ' 00:00:00', lendemain(m.au) + ' 00:00:00', 'GE', 8);
    ok('Menu Activité des équipes : barre « au moins » 8, requête sans critère, tuile et titre du graphique = critère enregistré, tuile = base',
      m.op === 'GE' && m.min === 8 && m.tuile === ge8m && m.titre === 'Ventes de 8 min ou plus' && reqs.length > 0 && reqs.every((u) => !/seuil/.test(u)),
      JSON.stringify({ m, base: ge8m, reqs }));

    /* onglet Anomalies */
    const droit = await p2.evaluate(() => Ext.ComponentQuery.query('activiteequipes #ae-anomalies').length);
    if (!droit) {
      ok('Onglet Anomalies présent pour le compte de test', false);
    } else {
      const [ra] = await Promise.all([p2.waitForResponse((x) => /activite-equipes\/anomalies\?/.test(x.url()), { timeout: 180000 }), cliquer(p2, 'activiteequipes #ae-anomalies')]);
      await p2.waitForFunction(() => { const g = Ext.ComponentQuery.query('activiteequipes #anoEmployes')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 120000 });
      const an = await p2.evaluate(([u, a2]) => { const g = Ext.ComponentQuery.query('activiteequipes #anoEmployes')[0], col = g.down('#anoColLongues');
        const v = (id) => { const r = g.getStore().findRecord('id', id, 0, false, true, true); return r ? r.get('ventesLongues') : 0; };
        const cell = (id) => { const i = g.getStore().findExact('id', id); if (i < 0) { return null; } const n = g.getView().getNode(i);
          const td = n && n.querySelector('.x-grid-cell-' + col.getItemId()); return td ? td.textContent.trim() : null; };
        return { entete: col.text, u: v(u), a2: v(a2), cu: cell(u), ca2: cell(a2), du: Ext.ComponentQuery.query('activiteequipes #aeDebut')[0].getSubmitValue(),
          au: Ext.ComponentQuery.query('activiteequipes #aeFin')[0].getSubmitValue() }; }, [U, A2]);
      const de = an.du + ' 00:00:00', a = lendemain(an.au) + ' 00:00:00';
      const bu = longuesBase(de, a, 'GE', 8, U), ba2 = longuesBase(de, a, 'GE', 8, A2);
      ok('Onglet Anomalies : en-tête « Ventes ≥ 8 min », requête sans critère', an.entete === 'Ventes ≥ 8 min' && !/seuil/.test(ra.url()), an.entete + ' ' + ra.url());
      ok('Rapprochement par caissière : ventes longues de l\'onglet Anomalies (cellule = magasin) = base (≥ 480 s)', an.u === bu && an.a2 === ba2 && bu >= 3 && ba2 >= 2
        && String(an.cu) === String(bu) && String(an.ca2) === String(ba2), JSON.stringify({ an, base: { u: bu, a2: ba2 } }));
    }

    /* critere invalide : refuse, rien ne change */
    const inval = await p2.evaluate(async () => {
      const post = (o, m) => fetch('../api/v1/activite-equipes/seuil', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'seuilOperateur=' + o + '&seuilMinutes=' + m }).then((r) => r.json());
      return [await post('GE', 0), await post('XX', 5), await post('GT', 999)].map((x) => x.success);
    });
    ok('Critère invalide (0 min, opérateur inconnu, 999 min) : refusé, la base garde GE / 8', inval.every((x) => x === false) && param(K_OP) === 'GE' && param(K_MIN) === '8',
      JSON.stringify(inval));
    await ctx2.close();
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    retirer();
    remettreParams();
    const apres = q(`SELECT str_KEY, str_VALUE FROM t_parameters WHERE str_KEY IN ('${K_OP}', '${K_MIN}')`).split('\n').filter(Boolean).map((l) => l.split('\t'));
    ok('Bilan : aucune vente d\'essai ne reste, paramètres revenus à leur état d\'avant', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`) === '0'
      && q(`SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`) === '0' && JSON.stringify(apres.sort()) === JSON.stringify(AVANT.slice().sort()),
      JSON.stringify({ avant: AVANT, apres }));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
