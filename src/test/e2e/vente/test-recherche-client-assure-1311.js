/* DEMANDE DU 13/11 : RECHERCHE DE CLIENT A LA VENTE ASSURANCE OU CARNET.
 *
 * La recherche (GET v1/client/all) lisait les tiers-payants puis les ayants droit de CHAQUE client trouve, par deux
 * requetes par client : jusqu'a 201 requetes pour 100 clients, a chaque recherche. Elle les lit desormais en deux
 * requetes pour tous les clients. Le test verifie que rien ne change dans ce que la caissiere voit, et que c'est
 * plus rapide.
 *
 * Parcours par les vues : SERVICE CLIENT > Ventes, « Nouvelle vente », type « Assurance » puis « Carnet », nom tape
 * dans la recherche du client puis Entree.
 *   A. Jeu d'essai varie (clients E2EZRCH, retires a la fin) : 3 tiers-payants saisis dans le desordre des priorites,
 *      lien desactive, organisme desactive, client sans lien actif (non propose), 0, 1 et 3 ayants droit dont un
 *      desactive, un client carnet. Rapprochement ECRAN (liste des clients) = REPONSE = BASE, client par client :
 *      tiers-payants (comptes, dans l'ordre des priorites), ayants droit actifs ; type de vente respecte.
 *   B. Donnees reelles : recherche large (100 clients) ; meme rapprochement REPONSE = BASE sur les identifiants
 *      seulement (aucune colonne nominative lue) ; duree mesuree, budget 800 ms cote serveur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const DB = process.env.DB_TEST || ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '--raw', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const P = 'E2EZRCH';
const BUDGET_MS = 800;

function nettoyer() {
  q(`DELETE FROM t_ayant_droit WHERE lg_AYANTS_DROITS_ID LIKE '${P}%';
     DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID LIKE '${P}%';
     DELETE FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID LIKE '${P}%';
     DELETE FROM t_client WHERE lg_CLIENT_ID LIKE '${P}%';`);
}

/* tiers-payants et ayants droit attendus, par les regles : liens actifs vers un organisme actif ; ayants droit actifs */
function attendus(ids) {
  const liste = ids.map((x) => `'${x}'`).join(',');
  const tp = {}, ad = {};
  q(`SELECT c.lg_CLIENT_ID, o.lg_COMPTE_CLIENT_TIERS_PAYANT_ID, o.int_PRIORITY FROM t_compte_client_tiers_payant o
     JOIN t_compte_client c ON c.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = o.lg_TIERS_PAYANT_ID
     WHERE c.lg_CLIENT_ID IN (${liste}) AND o.str_STATUT = 'enable' AND t.str_STATUT = 'enable'`).split('\n').filter(Boolean)
    .forEach((l) => { const [c, id, pr] = l.split('\t'); (tp[c] = tp[c] || []).push({ id, pr: Number(pr) }); });
  q(`SELECT lg_CLIENT_ID, lg_AYANTS_DROITS_ID FROM t_ayant_droit WHERE lg_CLIENT_ID IN (${liste}) AND str_STATUT = 'enable'`)
    .split('\n').filter(Boolean).forEach((l) => { const [c, id] = l.split('\t'); (ad[c] = ad[c] || []).push(id); });
  return { tp, ad };
}

/* ecarts entre la reponse et la base, client par client */
function ecarts(data) {
  const ids = data.map((c) => c.lgCLIENTID), a = attendus(ids), e = [];
  data.forEach((c) => {
    const tpRecu = (c.tiersPayants || []).map((t) => t.compteTp), tpAttendu = (a.tp[c.lgCLIENTID] || []);
    if (JSON.stringify(tpRecu.slice().sort()) !== JSON.stringify(tpAttendu.map((t) => t.id).sort())) {
      e.push(c.lgCLIENTID + ' tiers-payants ' + tpRecu.join(',') + ' au lieu de ' + tpAttendu.map((t) => t.id).join(','));
    }
    const pr = (c.tiersPayants || []).map((t) => t.order);
    if (pr.some((x, i) => i > 0 && x < pr[i - 1])) { e.push(c.lgCLIENTID + ' priorités dans le désordre ' + pr.join(',')); }
    const adRecu = (c.ayantDroits || []).map((x) => x.lgAYANTSDROITSID).sort(), adAttendu = (a.ad[c.lgCLIENTID] || []).sort();
    if (JSON.stringify(adRecu) !== JSON.stringify(adAttendu)) { e.push(c.lgCLIENTID + ' ayants droit ' + adRecu.length + ' au lieu de ' + adAttendu.length); }
    if (pr.length && c.lgTIERSPAYANTID !== c.tiersPayants[0].lgTIERSPAYANTID) { e.push(c.lgCLIENTID + ' tiers-payant principal différent du premier'); }
  });
  return e;
}

(async () => {
  let b = null;
  nettoyer();
  try {
    const tpActifs = q(`SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT = 'enable' ORDER BY lg_TIERS_PAYANT_ID LIMIT 3`).split('\n');
    const tpInactif = q(`SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT <> 'enable' ORDER BY lg_TIERS_PAYANT_ID LIMIT 1`);
    ok('Précondition : 3 organismes actifs et 1 désactivé', tpActifs.length === 3 && !!tpInactif, tpActifs.length);
    const [T1, T2, T3] = tpActifs;
    /* client : [n, type, liens [tp, priorite, statut], ayants droit [statut...]] */
    const CLIENTS = [
      [1, '1', [[T1, 2, 'enable'], [T2, 1, 'enable'], [T3, 3, 'enable']], ['enable', 'enable', 'enable', 'disable']],
      [2, '1', [[T1, 1, 'enable'], [T2, 2, 'disable']], []],
      [3, '1', [[T2, 1, 'enable'], [tpInactif, 2, 'enable']], ['enable']],
      [4, '1', [[T1, 1, 'disable']], ['enable']],
      [5, '2', [[T3, 1, 'enable']], ['enable', 'enable']],
      [6, '1', [[T3, 2, 'enable'], [T1, 1, 'enable']], ['disable']]
    ];
    const sql = [];
    CLIENTS.forEach(([n, type, liens, ads]) => {
      const c = `${P}-C${n}`, cpt = `${P}-K${n}`;
      sql.push(`INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, lg_TYPE_CLIENT_ID,
        dt_CREATED, dt_UPDATED, str_STATUT) VALUES ('${c}', '${P}${n}', '${P}', 'ESSAI ${n}', '${P}MAT${n}', '${type}', NOW(), NOW(), 'enable')`);
      sql.push(`INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED, dt_UPDATED, dbl_PLAFOND, dbl_QUOTA_CONSO_MENSUELLE)
        VALUES ('${cpt}', '${c}', 'enable', NOW(), NOW(), 0, 0)`);
      liens.forEach(([tp, pr, st], i) => sql.push(`INSERT INTO t_compte_client_tiers_payant (lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_COMPTE_CLIENT_ID,
        lg_TIERS_PAYANT_ID, dt_CREATED, dt_UPDATED, str_STATUT, int_POURCENTAGE, int_PRIORITY, dbl_PLAFOND, dbl_QUOTA_CONSO_MENSUELLE,
        str_NUMERO_SECURITE_SOCIAL, db_PLAFOND_ENCOURS, db_CONSOMMATION_MENSUELLE, b_IsAbsolute, b_CANBEUSE)
        VALUES ('${P}-L${n}${i}', '${cpt}', '${tp}', NOW(), NOW(), '${st}', ${pr === 1 ? 70 : 15 + i}, ${pr}, 0, 0, '${P}MAT${n}', 0, 0, 0, 1)`));
      ads.forEach((st, i) => sql.push(`INSERT INTO t_ayant_droit (lg_AYANTS_DROITS_ID, lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME,
        str_NUMERO_SECURITE_SOCIAL, dt_CREATED, dt_UPDATED, str_STATUT) VALUES ('${P}-A${n}${i}', '${c}', '${P}A${n}${i}', '${P}', 'AD ${n}${i}',
        '${P}AD${n}${i}', NOW(), NOW(), '${st}')`));
    });
    q(sql.join(';\n'));

    b = await ENV_E2E.lancer(chromium);
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #typeVente').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);

    const rechercher = async (texte) => {
      const reponse = p.waitForResponse((r) => r.url().includes('/api/v1/client/all'), { timeout: 60000 });
      const t0 = Date.now();
      await cliquer(p, 'doventemanager #contenu #clientSearchTextField');
      await p.keyboard.type(texte, { delay: 20 });
      await p.keyboard.press('Enter');
      const r = await reponse;
      const corps = await r.json();
      const timing = r.request().timing();
      await p.waitForTimeout(1500);
      return { data: corps.data || [], ms: Math.round(timing.responseEnd > 0 ? timing.responseEnd - timing.requestStart : Date.now() - t0) };
    };
    const fermerListe = async () => { await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && /client/i.test(w.xtype || '') || (w.isVisible() && w.down && w.down('gridpanel') && w.title && /client/i.test(w.title))).forEach((w) => w.close())); await p.waitForTimeout(500); };

    /* ---- A. Assurance ---- */
    await p.locator('text=/^\\s*Assurance\\s*$/').filter({ visible: true }).first().click();
    await p.waitForTimeout(1500);
    const a = await rechercher(P);
    const idsA = a.data.map((c) => c.lgCLIENTID).sort();
    ok('A. Assurance : clients proposés = assurés ayant un lien actif (C1, C2, C3, C6 ; ni C4 sans lien actif, ni C5 carnet)',
      JSON.stringify(idsA) === JSON.stringify([1, 2, 3, 6].map((n) => `${P}-C${n}`)), idsA.join(','));
    ok('A. Réponse = base, client par client (tiers-payants dans l\'ordre des priorités, ayants droit actifs)', ecarts(a.data).length === 0, ecarts(a.data).join(' | '));
    const c1 = a.data.find((c) => c.lgCLIENTID === `${P}-C1`) || {};
    ok('A. C1 : 3 tiers-payants saisis dans le désordre, rendus par priorité 1, 2, 3 ; 3 ayants droit actifs sur 4',
      JSON.stringify((c1.tiersPayants || []).map((t) => t.order)) === '[1,2,3]' && (c1.ayantDroits || []).length === 3, JSON.stringify((c1.tiersPayants || []).map((t) => t.order)));
    const ecran = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && x.down('gridpanel'))[0];
      return w ? w.down('gridpanel').getStore().getRange().map((r) => ({ id: r.get('lgCLIENTID'), tp: (r.get('tiersPayants') || []).length, ad: (r.get('ayantDroits') || []).length })) : null; });
    const attenduEcran = a.data.map((c) => ({ id: c.lgCLIENTID, tp: c.tiersPayants.length, ad: c.ayantDroits.length }));
    ok('A. Écran = réponse : la liste des clients montre les mêmes clients, mêmes nombres de tiers-payants et d\'ayants droit',
      ecran && JSON.stringify(ecran.slice().sort((x, y) => x.id.localeCompare(y.id))) === JSON.stringify(attenduEcran.slice().sort((x, y) => x.id.localeCompare(y.id))), JSON.stringify(ecran));
    await fermerListe();

    /* ---- A. Carnet ---- */
    await p.locator('text=/^\\s*Carnet\\s*$/').filter({ visible: true }).first().click().catch(() => {});
    await p.waitForTimeout(1500);
    const k = await rechercher(P);
    ok('A. Carnet : seul le client carnet C5 est proposé', k.data.length === 1 && k.data[0].lgCLIENTID === `${P}-C5`, k.data.map((c) => c.lgCLIENTID).join(','));
    ok('A. Carnet : réponse = base', ecarts(k.data).length === 0, ecarts(k.data).join(' | '));
    const pris = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').getClient(); return c ? c.get('lgCLIENTID') : null; });
    ok('A. Carnet : un seul client trouvé, il est pris pour la vente', pris === `${P}-C5`, pris);

    /* ---- B. donnees reelles ---- */
    await p.locator('text=/^\\s*Assurance\\s*$/').filter({ visible: true }).first().click();
    await p.waitForTimeout(1500);
    const mesures = [];
    for (const lettre of ['A', 'K', 'M']) {
      const r = await rechercher(lettre);
      mesures.push({ lettre, n: r.data.length, ms: r.ms, ecarts: ecarts(r.data) });
      await fermerListe();
    }
    console.log('MESURES ' + JSON.stringify(mesures.map((m) => ({ lettre: m.lettre, n: m.n, ms: m.ms }))));
    ok('B. Données réelles : recherches larges (jusqu\'à 100 clients), réponse = base pour chaque client',
      mesures.some((m) => m.n >= 50) && mesures.every((m) => m.ecarts.length === 0), JSON.stringify(mesures.map((m) => [m.lettre, m.n, m.ecarts.slice(0, 2)])));
    ok(`B. Durée d'une recherche large dans le budget (${BUDGET_MS} ms)`, mesures.every((m) => m.ms <= BUDGET_MS), JSON.stringify(mesures.map((m) => [m.lettre, m.n, m.ms + ' ms'])));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
    nettoyer();
    ok('Données d\'essai retirées', q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE '${P}%'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
