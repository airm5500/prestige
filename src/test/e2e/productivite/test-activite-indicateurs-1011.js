/* PLAN DU 09/11, POINT 10 : SEPT INDICATEURS D'EQUIPE, MASQUABLES UN PAR UN.
 *
 * Jeu d'essai pose en base (retire a la fin) : 6 ventes au comptant du jour, deux caissieres, montants, remises (dont 0),
 * quantites (> 1) et lignes variees, conseil de l'une ou de l'autre ou sans conseil, deux preventes (attente de 1 min 30
 * et de 7 min), une ligne avec produit du, une vente en avoir, une vente annulee (qui ne doit pas compter).
 * Par les vues (compte de test) : ANALYSE DE GESTION > Activite des equipes > Analyses, du 01/10/2026 a aujourd'hui saisi
 * au clavier, Actualiser :
 *  - rapprochement : pour chacun des 7 indicateurs (remises ; ventes modifiees et ecarts de caisse ; panier ; conseil ;
 *    attente client ; avoirs et retours ; activite par heure de presence), chaque ligne et le total : ecran = API = base
 *    (reference recalculee ici depuis la base, vente par vente, caisse par caisse, session par session) ;
 *  - coherence : taux = part / base, somme des lignes = total, jamais negatif (sauf le manquant), panier = CA / ventes ;
 *  - l'aide de chaque carte dit la mesure, la pertinence et le gain ;
 *  - masquer : la croix d'une carte la cache aussitot (aucune fenetre), « Indicateurs masques (n) » compte les cartes
 *    cachees ; apres reconnexion, elles restent cachees ; le menu ramene une carte seule, puis « Tout reafficher » ;
 *    le choix est enregistre pour l'utilisateur (preference relue en base) ;
 *  - aucune erreur JavaScript ; bilan : aucune vente d'essai ne reste, preference remise a son etat d'origine.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 700) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const lignesSql = (s) => q(s).split('\n').filter(Boolean).map((l) => l.split('\t'));
const M = 'E2E-AEIN';
const CLE = 'activite-indicateurs';
const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const A2 = q("SELECT lg_USER_ID FROM t_user WHERE str_STATUT = 'enable' AND lg_USER_ID <> '" + U + "' AND lg_USER_ID NOT LIKE 'E2E%' ORDER BY lg_USER_ID LIMIT 1");
const J = q('SELECT CURDATE()');
const D = '2026-10-01';
const PRODUITS = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY lg_FAMILLE_ID LIMIT 3").split('\n');
const MODELE = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_TYPE_VENTE_ID = '1' AND str_STATUT = 'is_Closed' LIMIT 1");
/* [suffixe, caissiere, vendeur, conseil, encaissement, prix, remise, annulee, lignes [quantite, avoir], vente en avoir, attente (s)] */
const VENTES = [
  ['1', U, U, A2, '00:10:00', 12500, 500, 0, [[3, 0], [1, 0]], 0, 30],
  ['2', U, A2, null, '00:40:00', 4300, 0, 0, [[1, 0]], 0, 90],
  ['3', A2, A2, U, '01:10:00', 27800, 1200, 0, [[2, 1], [1, 0]], 0, 30],
  ['4', A2, U, A2, '02:00:00', 1900, 0, 0, [[1, 0]], 0, 420],
  ['5', U, U, null, '03:00:00', 8600, 0, 0, [[4, 0], [2, 2]], 1, 30],
  ['6', U, U, U, '04:00:00', 9900, 300, 1, [[1, 0]], 0, 30]
];
function retirer() {
  q(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`);
}
function poser() {
  for (const [s, c, v, cons, enc, prix, remise, annulee, lignes, avoir, attente] of VENTES) {
    const id = M + '-' + s;
    q(`CREATE TEMPORARY TABLE tmp_v AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${MODELE}';`
      + ` UPDATE tmp_v SET lg_PREENREGISTREMENT_ID = '${id}', str_REF = '${id}', str_REF_TICKET = '${id}', int_PRICE = ${prix}, int_PRICE_REMISE = ${remise},`
      + ` int_CUST_PART = ${prix - remise}, str_STATUT = 'is_Closed', b_IS_CANCEL = ${annulee}, b_IS_AVOIR = ${avoir}, lg_TYPE_VENTE_ID = '1',`
      + ` lg_USER_CAISSIER_ID = '${c}', lg_USER_VENDEUR_ID = '${v}', lg_USER_ID = '${c}', lg_USER_CONSEIL_ID = ${cons ? `'${cons}'` : 'NULL'},`
      + ` dt_CREATED = TIMESTAMP('${J} ${enc}') - INTERVAL 10 MINUTE, dt_UPDATED = '${J} ${enc}', completion_date = '${J} ${enc}', dt_ANNULER = ${annulee ? `'${J} 05:00:00'` : 'NULL'};`
      + ' INSERT INTO t_preenregistrement SELECT * FROM tmp_v; DROP TEMPORARY TABLE tmp_v;');
    lignes.forEach(([qte, av], k) => {
      const pu = Math.round(prix / lignes.length / qte);
      q('INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED,'
        + ' int_AVOIR, int_PRICE, int_PRICE_UNITAIR, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, montantTva, valeurTva, prixAchat)'
        + ` VALUES ('${id}-${k}', '${id}', '${PRODUITS[k % PRODUITS.length]}', ${qte}, ${qte - av}, ${av}, ${pu * qte}, ${pu}, 'is_Closed',`
        + ` TIMESTAMP('${J} ${enc}') - INTERVAL ${attente + 60 * (lignes.length - 1 - k)} SECOND, TIMESTAMP('${J} ${enc}') - INTERVAL ${attente + 60 * (lignes.length - 1 - k)} SECOND, 0, 0, 0, 0)`);
    });
  }
}

/* ------------------------------------------------------------ reference independante, depuis la base */
const arrondi = (x) => Math.round(x * 10) / 10;
const taux = (n, sur) => (sur > 0 ? arrondi(100 * n / sur) : null);
const ratio = (n, sur) => (sur > 0 ? arrondi(n / sur) : null);
const moyenne = (n, sur) => (sur > 0 ? Math.round(n / sur) : null);
const mediane = (l) => { if (!l.length) { return null; } const d = l.slice().sort((a, b) => a - b); const n = d.length;
  return arrondi(n % 2 ? d[(n - 1) / 2] : (d[n / 2 - 1] + d[n / 2]) / 2); };
const vide = (s) => s === 'NULL' || s === undefined || s.trim() === '';
function base(debut, fin, maintenant) {
  const fin1 = `'${fin}' + INTERVAL 1 DAY`;
  const r = { REMISES: {}, MODIFS_ECARTS: {}, PANIER: {}, CONSEIL: {}, ATTENTE: {}, AVOIRS: {}, PRESENCE: {} };
  const de = (code, id, champs) => r[code][id] || (r[code][id] = Object.fromEntries(champs.map((c) => [c, 0])));
  const att = {};
  let caAvec = 0, nAvec = 0, caSans = 0, nSans = 0;
  for (const [c, v, cons, prix, remise, lignes, qte, avoir, lav, attente] of lignesSql("SELECT p.lg_USER_CAISSIER_ID, p.lg_USER_VENDEUR_ID, p.lg_USER_CONSEIL_ID,"
    + ' p.int_PRICE, IFNULL(p.int_PRICE_REMISE, 0), COUNT(*), IFNULL(SUM(d.int_QUANTITY), 0), p.b_IS_AVOIR, SUM(IFNULL(d.int_AVOIR, 0) > 0),'
    + ' IFNULL(TIMESTAMPDIFF(SECOND, MAX(d.dt_UPDATED), p.completion_date), \'NULL\') FROM t_preenregistrement p'
    + ' JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID'
    + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'"
    + ` AND p.dt_UPDATED >= '${debut}' AND p.dt_UPDATED < ${fin1} GROUP BY p.lg_PREENREGISTREMENT_ID`)) {
    if (vide(c)) { continue; }
    const P = Number(prix), R = Number(remise);
    const x = de('REMISES', c, ['ventes', 'ventesRemisees', 'ca', 'remise']); x.ventes++; x.ca += P; x.remise += R; x.ventesRemisees += R > 0 ? 1 : 0;
    const pa = de('PANIER', c, ['ventes', 'ca', 'lignes', 'quantites']); pa.ventes++; pa.ca += P; pa.lignes += Number(lignes); pa.quantites += Number(qte);
    const av = de('AVOIRS', c, ['ventes', 'ventesAvoir', 'lignesAvoir', 'retoursProduits']); av.ventes++; av.lignesAvoir += Number(lav);
    av.ventesAvoir += avoir === '1' || Number(lav) > 0 ? 1 : 0;
    if (!vide(v) && v !== c) {
      const t = de('ATTENTE', c, ['preventes', 'mesurees', 'longues']); t.preventes++;
      if (attente !== 'NULL' && Number(attente) >= 0 && Number(attente) <= 3600) { t.mesurees++; t.longues += Number(attente) > 300 ? 1 : 0; (att[c] || (att[c] = [])).push(Number(attente)); }
    }
    const co = de('CONSEIL', c, ['ventes', 'ventesConseillees', 'conseils', 'caConseille']); co.ventes++;
    if (!vide(cons)) { co.ventesConseillees++; const k = de('CONSEIL', cons.trim(), ['ventes', 'ventesConseillees', 'conseils', 'caConseille']); k.conseils++; k.caConseille += P; caAvec += P; nAvec++; }
    else { caSans += P; nSans++; }
    const pr = de('PRESENCE', c, ['secondes', 'ventes', 'ca']); pr.ventes++; pr.ca += P;
  }
  const CHM = ['modifications', 'montantModifie', 'caisses', 'sansBilletage', 'manquants', 'montantManquant', 'surplus', 'montantSurplus'];
  for (const [u, type, avant, apres] of lignesSql(`SELECT v.user_id, v.type_modification, IFNULL(v.montant_avant, 0), IFNULL(v.montant_apres, 0) FROM vente_modifiee v WHERE v.mvt_date >= '${debut}' AND v.mvt_date < ${fin1}`)) {
    if (vide(u)) { continue; }
    const x = de('MODIFS_ECARTS', u, CHM); x.modifications++; x.montantModifie += Math.abs(Number(apres) - Number(avant));
    if (type === 'PRODUITS') { de('AVOIRS', u, ['ventes', 'ventesAvoir', 'lignesAvoir', 'retoursProduits']).retoursProduits++; }
  }
  for (const [u, attendu, billetage] of lignesSql("SELECT rc.lg_USER_ID, IFNULL(rc.int_SOLDE_SOIR, 0), IFNULL((SELECT ROUND(SUM(b.int_AMOUNT)) FROM t_billetage b WHERE b.ld_CAISSE_ID = rc.ld_CAISSE_ID"
    + ` AND b.lg_USER_ID = rc.lg_USER_ID), 'NULL') FROM t_resume_caisse rc WHERE rc.str_STATUT <> 'is_Using' AND rc.dt_CREATED >= '${debut}' AND rc.dt_CREATED < ${fin1}`)) {
    if (vide(u)) { continue; }
    const x = de('MODIFS_ECARTS', u, CHM);
    if (billetage === 'NULL') { x.sansBilletage++; continue; }
    x.caisses++;
    const e = Number(billetage) - Number(attendu);
    if (e < 0) { x.manquants++; x.montantManquant += e; } else if (e > 0) { x.surplus++; x.montantSurplus += e; }
  }
  /* presence : plages par employe, fusionnees */
  const d0 = new Date(debut + 'T00:00:00').getTime(), f0 = new Date(fin + 'T00:00:00').getTime() + 86400000;
  const plages = {};
  for (const [u, deb, fi] of lignesSql(`SELECT s.lg_USER_ID, s.debut, IFNULL(s.fin, 'NULL') FROM t_session_utilisateur s WHERE s.debut < ${fin1} AND (s.fin IS NULL OR s.fin > '${debut}')`)) {
    if (vide(u)) { continue; }
    const a = new Date(deb.replace(' ', 'T')).getTime();
    let b = fi === 'NULL' ? Math.min(maintenant, a + 12 * 3600000) : new Date(fi.replace(' ', 'T')).getTime();
    const x = Math.max(a, d0); b = Math.min(b, f0);
    if (b > x) { (plages[u] || (plages[u] = [])).push([x, b]); }
  }
  for (const [u, l] of Object.entries(plages)) {
    l.sort((a, b) => a[0] - b[0]);
    let tot = 0, cd = null, cf = null;
    for (const [a, b] of l) { if (cf === null || a > cf) { if (cf !== null) { tot += cf - cd; } cd = a; cf = b; } else if (b > cf) { cf = b; } }
    if (cf !== null) { tot += cf - cd; }
    de('PRESENCE', u, ['secondes', 'ventes', 'ca']).secondes += Math.round(tot / 1000);
  }
  /* taux et totaux */
  const derives = {
    REMISES: (x) => ({ tauxRemise: taux(x.remise, x.ca), partRemisees: taux(x.ventesRemisees, x.ventes) }),
    MODIFS_ECARTS: (x) => ({ recurrence: taux(x.manquants, x.caisses) }),
    PANIER: (x) => ({ panierMoyen: moyenne(x.ca, x.ventes), lignesParVente: ratio(x.lignes, x.ventes), produitsParVente: ratio(x.quantites, x.ventes) }),
    CONSEIL: (x) => ({ tauxConseil: taux(x.ventesConseillees, x.ventes), panierConseille: moyenne(x.caConseille, x.conseils) }),
    ATTENTE: (x, id) => Object.assign(id ? { attenteMediane: mediane(att[id] || []) } : {}, { partLongues: taux(x.longues, x.mesurees) }),
    AVOIRS: (x) => ({ tauxAvoir: taux(x.ventesAvoir, x.ventes) }),
    PRESENCE: (x) => ({ heures: x.secondes > 0 ? arrondi(x.secondes / 3600) : null, ventesParHeure: x.secondes > 0 ? arrondi(x.ventes * 3600 / x.secondes) : null,
      caParHeure: x.secondes > 0 ? Math.round(x.ca * 3600 / x.secondes) : null })
  };
  const out = {};
  for (const [code, m] of Object.entries(r)) {
    const lignes = Object.entries(m).map(([id, x]) => Object.assign({ id }, x, derives[code](x, id)));
    const champs = Object.keys(Object.values(m)[0] || {});
    const total = Object.fromEntries(champs.map((c) => [c, lignes.reduce((s, x) => s + x[c], 0)]));
    Object.assign(total, derives[code](total, null));
    out[code] = { lignes, total };
  }
  out.CONSEIL.total.panierAvecConseil = moyenne(caAvec, nAvec);
  out.CONSEIL.total.panierSansConseil = moyenne(caSans, nSans);
  out.ATTENTE.total.attenteMediane = mediane([].concat(...Object.values(att)));
  return out;
}
const CODES = ['REMISES', 'MODIFS_ECARTS', 'PANIER', 'CONSEIL', 'ATTENTE', 'AVOIRS', 'PRESENCE'];
const egal = (a, b) => (a === null || a === undefined ? null : a) === (b === null || b === undefined ? null : b);

(async () => {
  const prefAvant = q(`SELECT IFNULL((SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = '${CLE}'), 'NULL')`);
  q(`DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = '${CLE}'`);
  retirer();
  poser();
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  const ouvrir = async () => {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'activiteequipes button[itemId=ae-analyses]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes #aeMasques').length > 0, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    return p;
  };
  const etatCartes = (p) => p.evaluate(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0];
    const cartes = a.analyses.query('panel').filter((x) => x.aeCadre);
    const bt = a.down('#aeMasques');
    return { caches: cartes.filter((x) => !x.isVisible()).map((x) => x.itemId).sort(), total: cartes.length, bouton: bt.getText(), actif: !bt.isDisabled(),
      fenetres: Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length }; });
  const pref = () => { const v = q(`SELECT IFNULL((SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = '${CLE}'), 'NULL')`);
    return v === 'NULL' ? null : JSON.parse(v); };
  try {
    ok('Jeu d\'essai : 6 ventes du jour (remises, conseils, préventes, avoirs, une annulée)', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`) === '6');
    let p = await ouvrir();
    await saisir(p, 'activiteequipes #aeDebut', '01/10/2026');
    await saisir(p, 'activiteequipes #aeFin', J.split('-').reverse().join('/'));
    const t0 = Date.now();
    const [rep] = await Promise.all([p.waitForResponse((r) => /activite-equipes\/indicateurs\?/.test(r.url()) && /debut=2026-10-01/.test(r.url()), { timeout: 240000 }),
      cliquer(p, 'activiteequipes #aeActualiser')]);
    const api = (await rep.json()).data;
    const t1 = Date.now();
    const affiche = await p.waitForFunction(() => document.querySelectorAll('table.ae-ind').length >= 7, null, { timeout: 120000 }).then(() => true, () => false);
    const etatInd = await p.evaluate(() => ['REMISES', 'MODIFS_ECARTS', 'PANIER', 'CONSEIL', 'ATTENTE', 'AVOIRS', 'PRESENCE'].map((c) => {
      const z = Ext.ComponentQuery.query('activiteequipes #aeInd' + c)[0]; return c + ':' + (z && z.getEl() ? z.getEl().dom.innerText.slice(0, 60) : 'absent'); }));
    ok('Les 7 tableaux sont affichés après « Actualiser »', affiche, etatInd.join(' | ') + ' | erreurs JS : ' + erreurs.join(' / '));
    await p.waitForTimeout(1000);
    const B0 = base(D, J, t0), B1 = base(D, J, t1);

    /* rapprochement API = base, ligne par ligne et total */
    for (const code of CODES) {
      const ecarts = [];
      const ref = Object.fromEntries(B0[code].lignes.map((x) => [x.id, x])), ref1 = Object.fromEntries(B1[code].lignes.map((x) => [x.id, x]));
      const ids = api[code].lignes.map((x) => x.id).sort().join(','), idsRef = Object.keys(ref).sort().join(',');
      if (ids !== idsRef) { ecarts.push('employés ' + ids.length + ' / ' + idsRef.length); }
      for (const x of api[code].lignes.concat([Object.assign({ id: '__total' }, api[code].total)])) {
        const r = x.id === '__total' ? B0[code].total : ref[x.id], r1 = x.id === '__total' ? B1[code].total : ref1[x.id];
        if (!r) { continue; }
        for (const k of Object.keys(r)) {
          if (k === 'id') { continue; }
          if (code === 'PRESENCE' && ['secondes', 'heures', 'ventesParHeure', 'caParHeure'].includes(k)) {
            /* sessions ouvertes : la reference est prise avant et apres l'appel */
            if (k === 'secondes' && !(x.secondes >= r.secondes - 1 && x.secondes <= r1.secondes + 1)) { ecarts.push(x.id.slice(0, 6) + '.secondes ' + x.secondes + ' ∉ [' + r.secondes + ',' + r1.secondes + ']'); }
            continue;
          }
          if (!egal(x[k], r[k])) { ecarts.push(x.id.slice(0, 6) + '.' + k + ' api ' + x[k] + ' base ' + r[k]); }
        }
      }
      ok(`Rapprochement ${code} : API = base, employé par employé et total`, ecarts.length === 0 && api[code].lignes.length > 0, ecarts.slice(0, 6).join(' ; '));
    }
    /* presence : ratios coherents avec le temps de l'API */
    const pres = api.PRESENCE.lignes.concat([api.PRESENCE.total]);
    ok('Cohérence présence : heures = secondes ÷ 3600, ventes et CA par heure = ventes, CA ÷ heures ; jamais plus que la période',
      pres.every((x) => (x.secondes > 0 ? x.heures === arrondi(x.secondes / 3600) && x.ventesParHeure === arrondi(x.ventes * 3600 / x.secondes)
        && x.caParHeure === Math.round(x.ca * 3600 / x.secondes) : x.heures == null)) && api.PRESENCE.lignes.every((x) => x.secondes <= 41 * 86400)
        && api.PRESENCE.lignes.some((x) => x.secondes > 0), JSON.stringify(api.PRESENCE.lignes.slice(0, 2)));
    /* coherence generale */
    const negatifs = [];
    for (const code of CODES) {
      for (const x of api[code].lignes) {
        for (const [k, v] of Object.entries(x)) { if (typeof v === 'number' && v < 0 && k !== 'montantManquant') { negatifs.push(code + '.' + k); } }
        if (x.montantManquant > 0) { negatifs.push(code + '.montantManquant>0'); }
      }
      for (const [k, v] of Object.entries(api[code].total)) {
        if (typeof v === 'number' && Number.isInteger(v) && !/panier|caParHeure|attente/i.test(k) && ['ventes', 'ca', 'remise', 'modifications', 'caisses', 'conseils', 'preventes', 'ventesAvoir', 'secondes'].includes(k)
          && api[code].lignes.reduce((s, x) => s + (x[k] || 0), 0) !== v) { negatifs.push(code + '.' + k + ' somme≠total'); }
      }
    }
    ok('Cohérence : somme des lignes = total, jamais négatif (sauf le manquant) ; taux et panier recalculés plus haut', negatifs.length === 0, negatifs.join(' ; '));
    /* cas varies dans la periode */
    const E = (code, id) => api[code].lignes.find((x) => x.id === id) || {};
    ok('Cas variés : remises chez deux caissières, deux conseillers, une attente de plus de 5 min, des avoirs, quantités > 1, modifications et caisses en manquant',
      E('REMISES', U).remise >= 500 && E('REMISES', A2).remise >= 1200 && E('CONSEIL', U).conseils >= 1 && E('CONSEIL', A2).conseils >= 2
      && api.ATTENTE.total.longues >= 1 && api.AVOIRS.total.ventesAvoir >= 2 && api.PANIER.total.quantites > api.PANIER.total.lignes
      && api.MODIFS_ECARTS.total.modifications > 0 && api.MODIFS_ECARTS.total.manquants > 0,
      JSON.stringify({ remU: E('REMISES', U).remise, remA: E('REMISES', A2).remise, cons: [E('CONSEIL', U).conseils, E('CONSEIL', A2).conseils], att: api.ATTENTE.total, av: api.AVOIRS.total.ventesAvoir }));

    /* ecran = API, cellule par cellule */
    const ecran = await p.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('table.ae-ind')).map((t) => [t.getAttribute('data-code'), {
      lignes: Array.from(t.tBodies[0].rows).map((tr) => ({ id: tr.getAttribute('data-id'), v: Object.fromEntries(Array.from(tr.querySelectorAll('[data-cle]')).map((c) => [c.getAttribute('data-cle'), c.getAttribute('data-v')])) })),
      total: Object.fromEntries(Array.from(t.tFoot.rows[0].querySelectorAll('[data-cle]')).map((c) => [c.getAttribute('data-cle'), c.getAttribute('data-v')])),
      pied: Object.fromEntries(Array.from((t.nextElementSibling || document.createElement('i')).querySelectorAll('[data-cle]')).map((c) => [c.getAttribute('data-cle'), c.textContent])) }])));
    const enTexte = (v) => (v === null || v === undefined ? '' : String(v));
    for (const code of CODES) {
      const e = ecran[code], ecarts = [];
      if (!e) { ok(`Écran ${code} : tableau affiché`, false); continue; }
      if (e.lignes.map((x) => x.id).join(',') !== api[code].lignes.map((x) => x.id).join(',')) { ecarts.push('ordre ou lignes'); }
      e.lignes.forEach((x, i) => { for (const [k, v] of Object.entries(x.v)) { if (v !== enTexte(api[code].lignes[i] && api[code].lignes[i][k])) { ecarts.push(x.id.slice(0, 6) + '.' + k + ' ' + v); } } });
      for (const [k, v] of Object.entries(e.total)) { if (v !== enTexte(api[code].total[k])) { ecarts.push('total.' + k + ' ' + v); } }
      ok(`Écran ${code} = API, cellule par cellule (lignes et total)`, ecarts.length === 0 && Object.keys(e.total).length >= 4, ecarts.slice(0, 5).join(' ; '));
    }
    ok('Écran : panier avec et sans conseil sous le tableau du conseil', /\d/.test(ecran.CONSEIL.pied.panierAvecConseil || '') && /\d/.test(ecran.CONSEIL.pied.panierSansConseil || ''), JSON.stringify(ecran.CONSEIL.pied));

    /* aides */
    const aides = await p.evaluate(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0];
      return ['REMISES', 'MODIFS_ECARTS', 'PANIER', 'CONSEIL', 'ATTENTE', 'AVOIRS', 'PRESENCE'].map((c) => { const x = a.down('#cInd' + c), t = x && x.tools && (x.tools[0] || (x.tools.items && x.tools.items[0]));
        return t ? String(t.tooltip || (t.initialConfig && t.initialConfig.tooltip) || '') : ''; }); });
    ok('Aide de chaque carte : mesure, pertinence et gain', aides.every((t) => /Mesure/.test(t) && /Pertinence/.test(t) && /Gain/.test(t)), aides.map((t) => t.length).join(','));

    /* masquer / ramener */
    const e0 = await etatCartes(p);
    ok('Au départ : aucune carte masquée, bouton « Indicateurs masqués (0) » inactif', e0.caches.length === 0 && /\(0\)/.test(e0.bouton) && !e0.actif && e0.total >= 22, JSON.stringify(e0));
    for (const id of ['cIndREMISES', 'cIndPRESENCE', 'cHeures']) {
      await cliquer(p, `activiteequipes #${id} tool[itemId=aeMasquer]`);
      await p.waitForTimeout(600);
    }
    const e1 = await etatCartes(p);
    ok('Croix : trois cartes masquées aussitôt (dont une ancienne), le bouton dit (3), aucune fenêtre',
      e1.caches.join(',') === 'cHeures,cIndPRESENCE,cIndREMISES' && /\(3\)/.test(e1.bouton) && e1.actif && e1.fenetres === 0, JSON.stringify(e1));
    await p.waitForTimeout(1500);
    ok('Choix enregistré pour l\'utilisateur (préférence relue en base)', JSON.stringify((pref() || {}).masques) === JSON.stringify(['cIndREMISES', 'cIndPRESENCE', 'cHeures']), JSON.stringify(pref()));
    await p.context().close();
    p = await ouvrir();
    await p.waitForFunction(() => /\(3\)/.test(Ext.ComponentQuery.query('activiteequipes #aeMasques')[0].getText()), null, { timeout: 30000 }).catch(() => {});
    const e2 = await etatCartes(p);
    ok('Après reconnexion : les trois cartes restent masquées', e2.caches.join(',') === 'cHeures,cIndPRESENCE,cIndREMISES' && /\(3\)/.test(e2.bouton), JSON.stringify(e2));
    await cliquer(p, 'activiteequipes #aeMasques');
    await cliquer(p, 'menuitem[itemId=aeRamener-cIndREMISES]');
    await p.waitForTimeout(800);
    const e3 = await etatCartes(p);
    ok('Menu : « Remises accordées » revient seule, les deux autres restent masquées (2)', e3.caches.join(',') === 'cHeures,cIndPRESENCE' && /\(2\)/.test(e3.bouton), JSON.stringify(e3));
    await cliquer(p, 'activiteequipes #aeMasques');
    await cliquer(p, 'menuitem[itemId=aeRamenerTout]');
    await p.waitForTimeout(1500);
    const e4 = await etatCartes(p);
    ok('« Tout réafficher » : plus aucune carte masquée, bouton (0) inactif ; préférence vide en base', e4.caches.length === 0 && /\(0\)/.test(e4.bouton) && !e4.actif
      && JSON.stringify((pref() || {}).masques) === '[]', JSON.stringify({ e4, pref: pref() }));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    q(`DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = '${CLE}'`);
    if (prefAvant !== 'NULL') {
      q(`INSERT INTO t_preference_utilisateur (lg_USER_ID, str_CLE, txt_VALEUR, dt_UPDATED) VALUES ('${U}', '${CLE}', '${prefAvant.replace(/'/g, "''")}', NOW())`);
    }
    ok('Bilan : aucune vente d\'essai ne reste ; préférence remise à son état d\'origine',
      q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`) === '0'
      && q(`SELECT IFNULL((SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = '${CLE}'), 'NULL')`) === prefAvant);
    const ko = res.filter((x) => !x.c).length;
    console.log(`\n${res.length - ko}/${res.length} OK`);
    process.exit(ko ? 1 : 0);
  }
})();
