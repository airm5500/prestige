/* PLAN DU 09/11, POINT 10 : CA PAR EMPLOYE ET TRANCHE, ATTRIBUTION « CONSEIL », TRI ET NOMBRE DE VENTES EN VIOLET.
 *
 * Jeu d'essai pose en base (retire a la fin) : 8 ventes au comptant du jour, montants et quantites varies, encaissees a
 * des heures differentes, conseillees par deux employes differents ou sans conseil (une vente annulee conseillee, qui ne
 * doit pas compter).
 * Par les vues (compte de test) : ANALYSE DE GESTION > Activite des equipes > Analyses, jour saisi au clavier :
 *  - « CA attribue a » propose « Conseil » ; choisi, l'en-tete dit « Conseil », la requete porte attribution=CONSEIL ;
 *  - rapprochement : ligne de chaque conseiller et ligne « Sans conseil » (CA, ventes) = API = base ;
 *  - coherence : somme des lignes = total = CA de la periode = total avec l'attribution « Caissiere » ;
 *  - tri : clic sur « Total » -> CA decroissant, second clic -> croissant ; clic sur « Conseil » -> par nom ; le pied
 *    (totaux) ne bouge pas ;
 *  - le nombre de ventes sous chaque montant est en violet, gras, plus grand que l'ancien (10 px) ;
 *  - aucune erreur JavaScript ; bilan : aucune vente d'essai ne reste.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir, choisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const M = 'E2E-AECC';
const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const A2 = q("SELECT lg_USER_ID FROM t_user WHERE str_STATUT = 'enable' AND lg_USER_ID <> '" + U + "' AND lg_USER_ID NOT LIKE 'E2E%' ORDER BY lg_USER_ID LIMIT 1");
const J = q('SELECT CURDATE()');
const JFR = J.split('-').reverse().join('/');
const PRODUITS = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY lg_FAMILLE_ID LIMIT 3").split('\n');
const MODELE = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_TYPE_VENTE_ID = '1' AND str_STATUT = 'is_Closed' LIMIT 1");
/* [suffixe, caissiere, conseil, encaissement, prix, annulee, quantite] */
const VENTES = [
  ['1', U, U, '00:10:00', 12500, 0, 3], ['2', U, A2, '01:20:00', 4300, 0, 1], ['3', A2, A2, '01:40:00', 27800, 0, 2],
  ['4', A2, null, '02:05:00', 1900, 0, 1], ['5', U, null, '03:15:00', 8600, 0, 4], ['6', A2, U, '03:50:00', 15400, 0, 2],
  ['7', U, A2, '04:30:00', 3200, 0, 1], ['8', U, U, '04:45:00', 9900, 1, 1]
];
function retirer() {
  q(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`);
}
function poser() {
  for (const [s, c, cons, enc, prix, annulee, qte] of VENTES) {
    const id = M + '-' + s;
    q(`CREATE TEMPORARY TABLE tmp_v AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${MODELE}';`
      + ` UPDATE tmp_v SET lg_PREENREGISTREMENT_ID = '${id}', str_REF = '${id}', str_REF_TICKET = '${id}', int_PRICE = ${prix}, int_PRICE_REMISE = 0,`
      + ` int_CUST_PART = ${prix}, str_STATUT = 'is_Closed', b_IS_CANCEL = ${annulee}, b_IS_AVOIR = 0, lg_TYPE_VENTE_ID = '1',`
      + ` lg_USER_CAISSIER_ID = '${c}', lg_USER_VENDEUR_ID = '${c}', lg_USER_ID = '${c}', lg_USER_CONSEIL_ID = ${cons ? `'${cons}'` : 'NULL'},`
      + ` dt_CREATED = TIMESTAMP('${J} ${enc}') - INTERVAL 2 MINUTE, dt_UPDATED = '${J} ${enc}', completion_date = '${J} ${enc}', dt_ANNULER = ${annulee ? `'${J} 05:00:00'` : 'NULL'};`
      + ' INSERT INTO t_preenregistrement SELECT * FROM tmp_v; DROP TEMPORARY TABLE tmp_v;');
    q('INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED,'
      + ' int_PRICE, int_PRICE_UNITAIR, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, montantTva, valeurTva, prixAchat)'
      + ` VALUES ('${id}-0', '${id}', '${PRODUITS[0]}', ${qte}, ${qte}, ${prix}, ${Math.round(prix / qte)}, 'is_Closed', '${J} ${enc}', '${J} ${enc}', 0, 0, 0, 0)`);
  }
}
/* reference independante : ventes du jour (memes regles que l'ecran) groupees par conseil */
function base() {
  const m = {};
  for (const l of q("SELECT IFNULL(NULLIF(TRIM(p.lg_USER_CONSEIL_ID), ''), 'SANS_CONSEIL'), p.int_PRICE FROM t_preenregistrement p"
    + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'"
    + ` AND p.dt_UPDATED >= '${J}' AND p.dt_UPDATED < '${J}' + INTERVAL 1 DAY`
    + ' AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)').split('\n').filter(Boolean)) {
    const [c, prix] = l.split('\t');
    const x = m[c] || (m[c] = { ca: 0, ventes: 0 });
    x.ca += Number(prix); x.ventes++;
  }
  return m;
}

(async () => {
  retirer();
  poser();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const attendre = () => p.waitForFunction(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses;
    return a.rendered && !(a.loadMask && a.loadMask.isVisible()) && document.querySelectorAll('.ae-tuile').length > 0; }, null, { timeout: 180000 })
    .then(() => p.waitForTimeout(1500));
  const tableau = () => p.evaluate(() => { const t = document.querySelector('#' + Ext.ComponentQuery.query('activiteequipes #aeCaTranches')[0].getId() + ' table.ae-ct');
    if (!t) { return null; }
    const n = (s) => Number(String(s).replace(/[^\d]/g, ''));
    const tot = (tr) => { const td = tr.lastElementChild; return { ca: n(td.querySelector('b').textContent), ventes: n(td.querySelector('small').textContent) }; };
    const sm = t.querySelector('tbody small'), st = sm ? getComputedStyle(sm) : null;
    return { attribution: t.getAttribute('data-attribution'), entete: Array.from(t.tHead.rows[0].children).map((x) => x.textContent.trim()),
      lignes: Array.from(t.tBodies[0].rows).map((tr) => Object.assign({ id: tr.getAttribute('data-id'), nom: tr.children[0].textContent.trim() }, tot(tr))),
      total: tot(t.tFoot.rows[0]), style: st ? { couleur: st.color, poids: st.fontWeight, taille: parseFloat(st.fontSize) } : null }; });
  try {
    ok('Jeu d\'essai : 8 ventes du jour, deux conseillers et des ventes sans conseil, une annulée', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`) === '8');
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'activiteequipes #aeDebut', JFR);
    await saisir(p, 'activiteequipes #aeFin', JFR);
    await cliquer(p, 'activiteequipes button[itemId=ae-analyses]');
    await attendre();
    await cliquer(p, 'activiteequipes #aeActualiser');
    await attendre();
    await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #cCaTranches')[0].getEl().dom.scrollIntoView());
    const caCaissiere = (await tableau()).total.ca;
    const [rc] = await Promise.all([p.waitForResponse((x) => /ca-tranches\?.*attribution=CONSEIL/.test(x.url()), { timeout: 180000 }),
      choisir(p, 'activiteequipes #aeTrancheAttribution', 'Conseil')]);
    const api = (await rc.json()).data;
    await p.waitForFunction(() => { const t = document.querySelector('table.ae-ct'); return t && t.getAttribute('data-attribution') === 'CONSEIL'; }, null, { timeout: 60000 });
    let t = await tableau();
    const B = base();
    ok('« CA attribué à » propose « Conseil » : en-tête « Conseil », requête attribution=CONSEIL', t.attribution === 'CONSEIL' && t.entete[0] === 'Conseil', t.entete.join('|'));
    const cle = (l) => l.map((x) => [x.id, x.ca, x.ventes].join('|')).sort();
    const cleBase = Object.entries(B).map(([id, x]) => [id, x.ca, x.ventes].join('|')).sort();
    ok('Rapprochement par conseiller et « Sans conseil » : écran = API = base (CA, ventes)', JSON.stringify(cle(t.lignes)) === JSON.stringify(cleBase)
      && JSON.stringify(cle(api.lignes)) === JSON.stringify(cleBase) && t.lignes.some((x) => x.id === 'SANS_CONSEIL' && x.nom === 'Sans conseil')
      && B[U] && B[A2] && B[U].ventes >= 2 && B[A2].ventes >= 3, JSON.stringify({ ecran: cle(t.lignes), base: cleBase }));
    const somme = t.lignes.reduce((s, x) => s + x.ca, 0);
    ok('Cohérence : somme des lignes = total = CA du jour = total avec l\'attribution « Caissière »', somme === t.total.ca && t.total.ca === api.totaux.ca && api.totaux.ca === caCaissiere,
      JSON.stringify({ somme, total: t.total.ca, caissiere: caCaissiere }));
    ok('Nombre de ventes en violet, gras, plus grand qu\'avant (10 px)', t.style && t.style.couleur === 'rgb(124, 58, 237)' && Number(t.style.poids) >= 700 && t.style.taille > 10,
      JSON.stringify(t.style));

    /* tri au clic sur l'en-tete */
    const clicEntete = async (txt) => { await p.locator('table.ae-ct thead th', { hasText: txt }).first().click(); await p.waitForTimeout(400); return tableau(); };
    const totalAvant = JSON.stringify(t.total);
    t = await clicEntete('Total');
    const cas = t.lignes.map((x) => x.ca);
    ok('Clic sur « Total » : CA décroissant, flèche ▼', cas.every((v, i) => i === 0 || cas[i - 1] >= v) && /▼/.test(t.entete[t.entete.length - 1]), cas.join(','));
    t = await clicEntete('Total');
    const cas2 = t.lignes.map((x) => x.ca);
    ok('Second clic : CA croissant, flèche ▲ ; le pied ne bouge pas', cas2.every((v, i) => i === 0 || cas2[i - 1] <= v) && /▲/.test(t.entete[t.entete.length - 1])
      && JSON.stringify(t.total) === totalAvant, cas2.join(','));
    t = await clicEntete('Conseil');
    const nomsL = t.lignes.map((x) => x.nom.toLowerCase());
    ok('Clic sur « Conseil » : tri par nom', nomsL.every((v, i) => i === 0 || nomsL[i - 1] <= v), nomsL.join(','));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    retirer();
    ok('Bilan : aucune vente d\'essai ne reste', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`) === '0'
      && q(`SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
