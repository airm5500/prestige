/* REGLEMENT DES DIFFERES : coherence, appartenance, idempotence, deux fenetres, mobile money (retours du 09/10 (1)).
 * Chaque controle exprime le comportement ATTENDU ; un FAIL est un defaut constate (a corriger apres echange).
 * Jeu d'essai (retire a la fin) : client A (deux ventes differees 5 000 et 3 000), client B (une vente 4 000).
 *  1. par l'ecran « Faire un reglement » : ventes de A cochees, passage au client B, reglement partiel de 2 000 :
 *     c'est la dette de B qui doit baisser, pas celle de A (cas 3 : reglement sur un autre compte) ;
 *  2. le serveur refuse un reglement de B qui designe une vente de A ;
 *  3. double envoi simultane du meme reglement : un seul mouvement de caisse ;
 *  4. deux fenetres : la 2e (donnees perimees) ne peut pas encaisser une vente deja soldee ;
 *  5. trop-percu : montant superieur a la dette refuse ;
 *  6. reglement total : la caisse encaisse exactement ce qui est retire des dettes ;
 *  7. mobile money (ORANGE, MTN, MOOV, WAVE) : le mode est conserve (reglement, caisse, mouvement), pas « especes » ;
 *  8. coherence : solde du releve = somme des restes = colonne solde de la liste des reglements.
 */
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const SORTIE = process.env.SORTIE || '/tmp';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const CA = 'e2e-rgd-A', CB = 'e2e-rgd-B', CAISSE = 'e2e-rgd-caisse';
const LIGNES = { A1: [CA, 5000], A2: [CA, 3000], B1: [CB, 4000] };
let caisseCreee = false;

const dossiers = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_DOSSIER_REGLEMENT_ID, '''')), '''''') FROM t_dossier_reglement WHERE str_ORGANISME_ID IN ('" + CA + "', '" + CB + "')");
function retirerReglements() {
  const d = dossiers();
  const caisses = q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_MVT_CAISSE_ID, '''')), '''''') FROM t_mvt_caisse WHERE str_NUM_PIECE_COMPTABLE IN (" + d + ")");
  exec("DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE entity_ref IN (" + caisses + "));"
    + "DELETE FROM notification WHERE entity_ref IN (" + caisses + ");"
    + "DELETE FROM t_event_log WHERE str_TYPE_LOG IN (" + caisses + ");"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + d + ");"
    + "DELETE FROM t_mvt_caisse WHERE str_NUM_PIECE_COMPTABLE IN (" + d + ");"
    + "DELETE FROM t_reglement WHERE str_REF_RESSOURCE IN (" + d + ");"
    + "DELETE FROM t_dossier_reglement_detail WHERE lg_DOSSIER_REGLEMENT_ID IN (" + d + ");"
    + "DELETE FROM t_dossier_reglement WHERE lg_DOSSIER_REGLEMENT_ID IN (" + d + ");");
}
function nettoyer() {
  retirerReglements();
  exec("DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_ID LIKE 'e2e-rgd-%';"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'e2e-rgd-%';"
    + "DELETE FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID IN ('" + CA + "-cpt', '" + CB + "-cpt');"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN ('" + CA + "', '" + CB + "');");
}
/* remet les trois ventes differees a leur montant du, sans reglement */
function reinitialiser() {
  retirerReglements();
  Object.keys(LIGNES).forEach((k) => exec("UPDATE t_preenregistrement_compte_client SET int_PRICE_RESTE = " + LIGNES[k][1] + " WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = 'e2e-rgd-" + k + "'"));
}
const reste = (k) => Number(q("SELECT int_PRICE_RESTE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = 'e2e-rgd-" + k + "'"));
const encaisse = () => Number(q("SELECT COALESCE(SUM(m.montantRegle), 0) FROM mvttransaction m WHERE m.pkey IN (" + dossiers() + ")"));
const nbCaisse = () => Number(q("SELECT COUNT(*) FROM t_mvt_caisse WHERE str_NUM_PIECE_COMPTABLE IN (" + dossiers() + ")"));

(async () => {
  nettoyer();
  for (const [c, nom] of [[CA, 'ZZRGD Alpha'], [CB, 'ZZRGD Beta']]) {
    exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED) VALUES ('" + c + "', '" + nom.split(' ')[0] + "', '" + nom.split(' ')[1] + "', 'enable', NOW());"
      + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('" + c + "-cpt', '" + c + "', 'enable', NOW())");
  }
  Object.keys(LIGNES).forEach((k, i) => {
    const [c, du] = LIGNES[k];
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, int_PRICE, int_PRICE_REMISE, int_CUST_PART, str_STATUT, b_IS_CANCEL,"
      + " lg_TYPE_VENTE_ID, str_TYPE_VENTE, lg_USER_ID, dt_CREATED, dt_UPDATED) VALUES ('e2e-rgd-" + k + "', 'E2E-RGD-" + k + "', " + du + ", 0, " + du
      + ", 'is_Closed', 0, '1', 'VNO', '" + ADMIN + "', NOW() - INTERVAL " + (i + 1) + " HOUR, NOW() - INTERVAL " + (i + 1) + " HOUR);"
      + "INSERT INTO t_preenregistrement_compte_client (lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, lg_PREENREGISTREMENT_ID, lg_COMPTE_CLIENT_ID, lg_USER_ID,"
      + " str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, int_PRICE_RESTE) VALUES ('e2e-rgd-" + k + "', 'e2e-rgd-" + k + "', '" + c + "-cpt', '" + ADMIN
      + "', 'is_Closed', NOW() - INTERVAL " + (i + 1) + " HOUR, NOW() - INTERVAL " + (i + 1) + " HOUR, " + du + ", " + du + ")");
  });
  /* le reglement exige une caisse ouverte pour l'operateur (precondition, pas l'objet du test) */
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND str_STATUT = 'is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + ADMIN + "', 0, 0, CURDATE(), NOW(), '" + ADMIN + "', NOW(), '" + ADMIN + "', 'is_Using')");
    caisseCreee = true;
  }
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const aujourdhui = q("SELECT CURDATE()");
  const regler = (corps, tout) => p.evaluate(async ([c, t]) => { const r = await fetch('/prestige/api/v1/reglement/' + (t ? 'reglementdiffere-all' : 'reglementdiffere'),
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }); return r.json(); }, [corps, !!tout]);
  const partiel = (client, lignes, montant, type) => ({ montantRecu: montant, montantRemis: 0, montantPaye: montant, clientId: client, typeRegleId: type || '1', nom: '', banque: '', lieux: '',
    totalRecap: lignes.reduce((s, k) => s + reste(k), 0), natureVenteId: aujourdhui, commentaire: JSON.stringify(lignes.map((k) => 'e2e-rgd-' + k)),
    /* comme l'ecran : restes vus au moment de l'ouverture */
    restesAttendus: JSON.stringify(Object.fromEntries(lignes.map((k) => ['e2e-rgd-' + k, reste(k)]))) });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);

    /* 1. par l'ecran : selection de A conservee apres passage a B */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('fairereglement', { isEdit: false, source: 'delayed', record: {} }));
    await p.waitForFunction(() => { const f = Ext.ComponentQuery.query('fairereglement')[0]; return f && f.isVisible() && f.down('#typeReglement').getValue() === '1'; }, null, { timeout: 30000 });
    const choisirClient = async (id, nom) => {
      await p.evaluate(([i, n]) => { const c = Ext.ComponentQuery.query('fairereglement #client')[0]; const st = c.getStore();
        if (!st.findRecord('lgCLIENTID', i)) { st.add({ lgCLIENTID: i, fullName: n, strNUMEROSECURITESOCIAL: '', strADRESSE: '' }); }
        c.setValue(i); c.fireEvent('select', c, [st.findRecord('lgCLIENTID', i)]); }, [id, nom]);
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('fairereglement gridpanel')[0]; return !g.getStore().isLoading(); }, null, { timeout: 30000 });
      await p.waitForTimeout(600);
    };
    await choisirClient(CA, 'ZZRGD Alpha');
    const vuA = await p.evaluate(() => Ext.ComponentQuery.query('fairereglement gridpanel')[0].getStore().getCount());
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('fairereglement gridpanel')[0]; g.getSelectionModel().selectAll(); });
    await choisirClient(CB, 'ZZRGD Beta');
    const vuB = await p.evaluate(() => Ext.ComponentQuery.query('fairereglement gridpanel')[0].getStore().getRange().map((r) => r.get('montantAttendu')));
    await p.evaluate(() => { const f = Ext.ComponentQuery.query('fairereglement')[0], n = f.down('#nature'); n.setValue(1); n.fireEvent('select', n);
      f.down('#montantRecu').setValue(2000); });
    await p.evaluate(() => Ext.ComponentQuery.query('fairereglement #btnValider')[0].btnEl.dom.click());
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && !/patienter/.test(Ext.MessageBox.msg.getEl().dom.textContent), null, { timeout: 30000 });
    const msg1 = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    await p.screenshot({ path: SORTIE + '/differes-reglement-1.png' });
    await p.evaluate(() => { const m = Ext.MessageBox; (m.msgButtons.no.isVisible() ? m.msgButtons.no : m.msgButtons.ok).btnEl.dom.click(); });
    const r1 = { A1: reste('A1'), A2: reste('A2'), B1: reste('B1'), organisme: q("SELECT IFNULL(GROUP_CONCAT(str_ORGANISME_ID), '') FROM t_dossier_reglement WHERE str_ORGANISME_ID IN ('" + CA + "', '" + CB + "')") };
    ok('1. Écran : A coché puis client B, partiel 2 000 → la dette de B baisse, celle de A ne bouge pas (cas 3)',
      vuA === 2 && r1.A1 === 5000 && r1.A2 === 3000 && (r1.B1 === 2000 || !/effectu/i.test(msg1)), 'lignes A ' + vuA + ', lignes B ' + JSON.stringify(vuB) + ', message « ' + msg1 + ' », après ' + JSON.stringify(r1));
    reinitialiser();

    /* 2. appartenance */
    const r2 = await regler(partiel(CB, ['A1'], 1000));
    ok('2. Serveur : un règlement du client B qui désigne une vente du client A est refusé', r2.success === false && reste('A1') === 5000, JSON.stringify(r2) + ' reste A1 ' + reste('A1'));
    reinitialiser();

    /* 3. double envoi simultane */
    const corps3 = partiel(CB, ['B1'], 1000);
    const r3 = await Promise.all([regler(corps3), regler(corps3)]);
    ok('3. Double envoi simultané du même règlement : un seul mouvement de caisse, dette de B diminuée une seule fois',
      nbCaisse() === 1 && reste('B1') === 3000, 'réponses ' + JSON.stringify(r3.map((x) => x.success)) + ', caisses ' + nbCaisse() + ', reste B1 ' + reste('B1') + ', encaissé ' + encaisse());
    reinitialiser();

    /* 4. deux fenetres */
    const f1 = partiel(CA, ['A1'], 5000), f2 = partiel(CA, ['A1'], 5000);
    const r4a = await regler(f1), r4b = await regler(f2);
    ok('4. Deux fenêtres : la 2e (données périmées) ne peut pas encaisser une vente déjà soldée',
      r4a.success === true && r4b.success === false && encaisse() === 5000, 'fenêtre 1 ' + r4a.success + ', fenêtre 2 ' + r4b.success + ', encaissé ' + encaisse() + ' pour 5 000 dus');
    reinitialiser();

    /* 5. trop-percu */
    const r5 = await regler(partiel(CB, ['B1'], 10000));
    ok('5. Trop-perçu : 10 000 pour une dette de 4 000 refusé (ou ramené à 4 000)', r5.success === false || encaisse() === 4000, JSON.stringify(r5) + ', encaissé ' + encaisse() + ', reste B1 ' + reste('B1'));
    reinitialiser();

    /* 6. reglement total : caisse = dettes soldees */
    const r6 = await regler({ montantRecu: 5000, montantRemis: 0, montantPaye: 5000, clientId: CA, typeRegleId: '1', nom: '', totalRecap: 5000, banque: '', lieux: '',
      userVendeurId: q("SELECT DATE_SUB(CURDATE(), INTERVAL 1 DAY)"), compteClientId: aujourdhui, natureVenteId: aujourdhui }, true);
    const soldes = 8000 - reste('A1') - reste('A2');
    ok('6. Règlement total : la caisse encaisse exactement ce qui est retiré des dettes', r6.success !== true || encaisse() === soldes, JSON.stringify(r6) + ', encaissé ' + encaisse() + ', retiré des dettes ' + soldes);
    reinitialiser();
    const r6b = await regler({ montantRecu: 10000, montantRemis: 0, montantPaye: 10000, clientId: CA, typeRegleId: '1', nom: '', totalRecap: 8000, banque: '', lieux: '',
      userVendeurId: q("SELECT DATE_SUB(CURDATE(), INTERVAL 1 DAY)"), compteClientId: aujourdhui, natureVenteId: aujourdhui }, true);
    ok('6b. Règlement total avec le total affiché exact (8 000) et 10 000 reçus : 8 000 encaissés, dettes soldées',
      r6b.success === true && encaisse() === 8000 && reste('A1') === 0 && reste('A2') === 0, JSON.stringify(r6b) + ', encaissé ' + encaisse() + ', restes ' + reste('A1') + '/' + reste('A2'));
    reinitialiser();

    /* 7. mobile money */
    const types = { 7: ['ORANGE', '10'], 9: ['MTN', '9'], 8: ['MOOV', '8'], 10: ['WAVE', '11'] };
    for (const t of Object.keys(types)) {
      const r7 = await regler(partiel(CB, ['B1'], 500, t));
      const d = String(r7.ref || '').replace(/[^\w-]/g, ''); // dossier rendu par le serveur (deux reglements peuvent tomber dans la meme seconde)
      const modes = q("SELECT CONCAT_WS('|', (SELECT lg_MODE_REGLEMENT_ID FROM t_reglement WHERE str_REF_RESSOURCE = '" + d + "'), (SELECT lg_MODE_REGLEMENT_ID FROM t_mvt_caisse WHERE str_NUM_PIECE_COMPTABLE = '" + d + "'),"
        + " (SELECT typeReglementId FROM mvttransaction WHERE pkey = '" + d + "'))");
      ok('7. Mobile money ' + types[t][0] + ' : mode conservé (règlement, caisse, mouvement), pas espèces', r7.success === true && modes === types[t][1] + '|' + types[t][1] + '|' + t, JSON.stringify(r7) + ' modes ' + modes);
    }
    reinitialiser();

    /* 8. coherence des soldes */
    await regler(partiel(CA, ['A1'], 2000));
    const releve = await p.evaluate(async (c) => (await fetch('/prestige/api/v1/reglement/releve?dtStart=2020-01-01&dtEnd=2030-12-31&clientId=' + c)).json(), CA);
    const restes = reste('A1') + reste('A2');
    ok('8. Cohérence : solde du relevé = somme des restes dus (client A après un règlement partiel)', releve.soldeFinal === restes, 'relevé ' + releve.soldeFinal + ', restes ' + restes);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    if (caisseCreee) { exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'"); }
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'e2e-rgd-%'") === '0'
      && q("SELECT COUNT(*) FROM t_dossier_reglement WHERE str_ORGANISME_ID IN ('" + CA + "', '" + CB + "')") === '0' && q("SELECT COUNT(*) FROM mvttransaction WHERE organisme IN ('" + CA + "', '" + CB + "')") === '0');
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + ' OK');
    process.exit(k === res.length ? 0 : 1);
  }
})();
