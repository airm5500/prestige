/* ETAT DE CONTROLE DES ACHATS, REGLEMENTS FOURNISSEURS PAR GROUPE (retour du 22/11, lot 9, point 3).
 *
 * Copie de travail (laborex_audit) : date de depart des reglements mise au 01/10/2026 le temps du test (avec celle du
 * 01/11/2026 rien n'est du), puis remise.
 *
 * Vrai chemin : menu GESTION DES COMMANDES > « Etat de contrôle Achats », bouton « Règlements fournisseurs ».
 *  1. « À régler », tous les groupes : grossistes regroupes par groupe (groupe du grossiste en base, « Sans groupe »
 *     s'il n'en a pas) ; en-tete de chaque groupe = nombre de grossistes, de BL et du total du de ses lignes ; du par
 *     grossiste = base ; somme des groupes = total de la barre ;
 *  2. un clic sur l'en-tete d'un groupe replie son detail, un second le deplie ;
 *  3. filtre « groupe grossiste » (liste deroulante) : pour chaque groupe, la requete porte le groupe, l'ecran ne
 *     montre que ses grossistes, avec les memes montants que dans la vue de tous les groupes, et la barre donne son
 *     total ; « Tous les groupes » redonne tout ;
 *  4. « Saisir un règlement » : mode par defaut « Chèque » ;
 *  5. onglet « Règlements effectués » (ancien « Historique ») : filtre groupe grossiste, reglements du groupe = base,
 *     groupe par groupe, et somme des groupes = tous ;
 *  bilan : aucune ecriture (BL, reglements, journal des reglements, caisse) ; parametre remis ; aucune erreur JS.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir, choisir } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').replace(/\n$/, '');
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const DEPART = '2026-10-01';
const DEPART0 = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'), '∅')");
const parametre = (v) => q(`UPDATE t_parameters SET str_VALUE = '${v}' WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'`);
const empreinte = () => q(`SELECT CONCAT_WS('|', (SELECT MD5(GROUP_CONCAT(CONCAT_WS('#', lg_BON_LIVRAISON_ID, IFNULL(int_MONTANT_REGLE, '∅'), IFNULL(int_MONTANT_RESTANT, '∅'), IFNULL(STATUS, '∅')) ORDER BY lg_BON_LIVRAISON_ID)) FROM t_bon_livraison),
  (SELECT COUNT(*) FROM reglement_fournisseur), (SELECT COUNT(*) FROM reglement_fournisseur_bl), (SELECT COUNT(*) FROM t_event_log WHERE typeLog IN (46, 47, 48)), (SELECT COUNT(*) FROM t_mvt_caisse))`);
const SANS = 'Sans groupe';
/* groupe de chaque grossiste en base */
const groupeDe = Object.fromEntries(lignes(`SELECT g.lg_GROSSISTE_ID, IFNULL(gf.libelle, '${SANS}') FROM t_grossiste g LEFT JOIN groupefournisseur gf ON gf.id = g.groupeId`));
const chiffres = (t) => Number(String(t).replace(/[^\d]/g, '')) || 0;

(async () => {
  const avant = empreinte();
  parametre(DEPART);
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    /* du par grossiste en base (meme regle que le test du 19/11) */
    const baseDu = Object.fromEntries(lignes(`SELECT o.lg_GROSSISTE_ID, CONCAT(COUNT(*), '#', SUM(b.int_HTTC - IFNULL(b.int_MONTANT_REGLE, 0)))
      FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID WHERE b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON >= '${DEPART}'
      AND b.int_HTTC - IFNULL(b.int_MONTANT_REGLE, 0) > 0 GROUP BY o.lg_GROSSISTE_ID`));
    const groupesDus = [...new Set(Object.keys(baseDu).map((g) => groupeDe[g]))].sort();
    ok('Précondition : du chez au moins deux groupes depuis le 01/10/2026', groupesDus.length >= 2, groupesDus.join(', '));

    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const attendreStore = (g) => p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return c && c.isVisible(true) && !c.getStore().isLoading(); }, g, { timeout: 60000 }).then(() => p.waitForTimeout(400));
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await p.mouse.move(1200, 700);
    await p.waitForFunction(() => Ext.ComponentQuery.query('controleachats').some((c) => c.isVisible(true)), null, { timeout: 90000 });
    await cliquer(p, 'controleachats button[itemId=ca-reglements]');
    await attendreStore('#rfARegler');

    /* ---------- 1. tous les groupes ---------- */
    const lire = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('#rfARegler')[0];
      const lignesEcran = g.getStore().getRange().map((r) => ({ id: r.get('grossisteId'), groupe: r.get('groupe'), nombre: r.get('nombre'), total: r.get('total') }));
      const entetes = Array.from(g.getView().el.dom.querySelectorAll('.x-grid-group-hd')).map((e) => e.textContent.replace(/\s+/g, ' ').trim());
      return { lignes: lignesEcran, entetes, barre: (Ext.ComponentQuery.query('#rfTotalARegler')[0].text || '').replace(/<[^>]+>/g, '') }; });
    const tous = await lire();
    const ecartsDu = tous.lignes.filter((l) => baseDu[l.id] !== l.nombre + '#' + l.total).map((l) => l.id + ' ' + l.nombre + '#' + l.total + ' / ' + baseDu[l.id]);
    ok('1. Dû par grossiste = base, ' + tous.lignes.length + ' grossiste(s), aucun en plus ni en moins', tous.lignes.length === Object.keys(baseDu).length && ecartsDu.length === 0, ecartsDu.join(' | '));
    const ecartsGroupe = tous.lignes.filter((l) => l.groupe !== groupeDe[l.id]).map((l) => l.id + ' ' + l.groupe + ' / ' + groupeDe[l.id]);
    ok('1. Chaque grossiste dans le groupe de sa fiche (base)', ecartsGroupe.length === 0, ecartsGroupe.join(' | '));
    const parGroupe = {};
    for (const l of tous.lignes) { const x = parGroupe[l.groupe] || (parGroupe[l.groupe] = { n: 0, bl: 0, du: 0 }); x.n++; x.bl += l.nombre; x.du += l.total; }
    const entetesKo = Object.entries(parGroupe).filter(([nom, x]) => { const e = tous.entetes.find((t) => t.startsWith(nom + ' — '));
      return !e || !e.includes(x.n + ' grossiste(s)') || !e.includes(x.bl + ' BL') || chiffres(e.split('total dû')[1]) !== x.du; }).map(([nom, x]) => nom + ' ' + JSON.stringify(x));
    ok('1. En-tête de chaque groupe (' + Object.keys(parGroupe).length + ') : grossistes, BL et total dû = somme de ses lignes', tous.entetes.length === Object.keys(parGroupe).length && entetesKo.length === 0,
      entetesKo.join(' | ') + ' / ' + tous.entetes.join(' | '));
    const totalTous = Object.values(parGroupe).reduce((s, x) => s + x.du, 0);
    ok('1. Somme des groupes = total dû de la barre', chiffres(tous.barre.split('total dû')[1]) === totalTous, tous.barre + ' / ' + totalTous);

    /* ---------- 2. replier / deplier un groupe par son en-tete ---------- */
    const nomG = groupesDus[0];
    const hd = p.locator('.x-grid-group-hd').filter({ hasText: nomG + ' — ' }).first();
    const lignesVisibles = (nom) => p.evaluate((n) => { const g = Ext.ComponentQuery.query('#rfARegler')[0]; return g.getStore().getRange().filter((r) => r.get('groupe') === n)
      .filter((r) => { const node = g.getView().getNode(r); return node && node.offsetParent !== null && node.getBoundingClientRect().height > 0; }).length; }, nom);
    const n0 = await lignesVisibles(nomG);
    await hd.click(); await p.waitForTimeout(500);
    const n1 = await lignesVisibles(nomG);
    await p.locator('.x-grid-group-hd').filter({ hasText: nomG + ' — ' }).first().click(); await p.waitForTimeout(500);
    const n2 = await lignesVisibles(nomG);
    ok('2. Clic sur l\'en-tête « ' + nomG + ' » : détail replié puis déplié', n0 === parGroupe[nomG].n && n1 === 0 && n2 === n0, [n0, n1, n2].join(' → '));

    /* ---------- 3. filtre groupe ---------- */
    for (const nom of groupesDus) {
      const [req] = await Promise.all([
        p.waitForRequest((r) => /reglements-fournisseurs\/a-regler|a-regler/.test(r.url()) && /groupeId=/.test(r.url()), { timeout: 30000 }),
        choisir(p, '#rfGroupeARegler', nom),
      ]);
      await attendreStore('#rfARegler');
      const vue = await lire();
      const attendu = tous.lignes.filter((l) => l.groupe === nom).map((l) => l.id + '#' + l.nombre + '#' + l.total).sort();
      const ecran = vue.lignes.map((l) => l.id + '#' + l.nombre + '#' + l.total).sort();
      ok('3. Groupe « ' + nom + ' » : requête avec le groupe, ' + attendu.length + ' grossiste(s) du groupe, mêmes montants', new URL(req.url()).searchParams.get('groupeId') !== '' && JSON.stringify(ecran) === JSON.stringify(attendu)
        && vue.lignes.every((l) => groupeDe[l.id] === nom), JSON.stringify(ecran).slice(0, 300) + ' / ' + JSON.stringify(attendu).slice(0, 300));
      ok('3. Groupe « ' + nom + ' » : total de la barre = total du groupe', chiffres(vue.barre.split('total dû')[1]) === parGroupe[nom].du, vue.barre);
    }
    await choisir(p, '#rfGroupeARegler', 'Tous les groupes');
    await attendreStore('#rfARegler');
    const retour = await lire();
    ok('3. « Tous les groupes » redonne tous les grossistes', retour.lignes.length === tous.lignes.length, retour.lignes.length + ' / ' + tous.lignes.length);

    /* ---------- 4. mode par defaut ---------- */
    const sousOnglet = async (id) => { await p.click('#' + await p.evaluate((i) => Ext.ComponentQuery.query('#' + i)[0].tab.getId(), id)); };
    await sousOnglet('rfSaisir');
    await p.waitForTimeout(600);
    const mode = await p.evaluate(() => { const c = Ext.ComponentQuery.query('#rfMode')[0]; return { v: c.getValue(), t: c.getRawValue() }; });
    ok('4. « Saisir un règlement » : mode par défaut Chèque', mode.v === 'CHEQUE' && /ch[eè]que/i.test(mode.t), JSON.stringify(mode));

    /* ---------- 5. reglements effectues ---------- */
    const titre = await p.evaluate(() => { const h = Ext.ComponentQuery.query('#rfHistorique')[0]; return h.tab ? h.tab.getText ? h.tab.getText() : h.tab.text : h.title; });
    ok('5. Onglet « Règlements effectués » (ancien « Historique »)', titre === 'Règlements effectués', titre);
    await sousOnglet('rfHistorique');
    await attendreStore('#rfReglements');
    await saisir(p, '#rfDu', '01/01/2026');
    const du = q("SELECT '2026-01-01'"), au = q('SELECT CURDATE()');
    const base = lignes(`SELECT r.id, r.montant, IFNULL(gf.libelle, '${SANS}') FROM reglement_fournisseur r JOIN t_grossiste g ON g.lg_GROSSISTE_ID = r.grossiste_id LEFT JOIN groupefournisseur gf ON gf.id = g.groupeId
      WHERE r.date_reglement BETWEEN '${du}' AND '${au}'`);
    const groupesHisto = await p.evaluate(() => Ext.ComponentQuery.query('#rfHistoGroupe')[0].getStore().getRange().map((r) => r.get('libelle')));
    const rechercher = async () => { await cliquer(p, '#rfRechercher'); await attendreStore('#rfReglements'); };
    const lireHisto = () => p.evaluate(() => Ext.ComponentQuery.query('#rfReglements')[0].getStore().getRange().map((r) => r.get('id') + '#' + r.get('montant')).sort());
    await rechercher();
    const tousH = await lireHisto();
    let somme = 0;
    const aVerifier = groupesHisto.filter((g) => g && g !== 'Tous les groupes');
    for (const nom of aVerifier) {
      await choisir(p, '#rfHistoGroupe', nom);
      await rechercher();
      const ecran = await lireHisto();
      const attendu = base.filter((r) => r[2] === nom).map((r) => r[0] + '#' + r[1]).sort();
      somme += ecran.length;
      ok('5. Règlements effectués, groupe « ' + nom + ' » : ' + attendu.length + ' règlement(s) = base', JSON.stringify(ecran) === JSON.stringify(attendu), JSON.stringify(ecran).slice(0, 200) + ' / ' + JSON.stringify(attendu).slice(0, 200));
    }
    ok('5. Somme des groupes = tous les règlements de la période (' + tousH.length + ')', somme === tousH.length && tousH.length === base.length, somme + ' / ' + tousH.length + ' / ' + base.length);
    await choisir(p, '#rfHistoGroupe', 'Tous les groupes');
    await rechercher();
    ok('5. « Tous les groupes » redonne tous les règlements', (await lireHisto()).length === tousH.length);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    if (DEPART0 !== '∅') { parametre(DEPART0); }
    ok('Bilan : aucune écriture (BL, règlements, journal, caisse), date de départ remise', empreinte() === avant && q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'), '∅')") === DEPART0);
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
