/* VENTES EN SAISIE : CINQ POSTES EN MÊME TEMPS ET SERVEUR REDÉMARRÉ (cahier des charges du 24/11, point 2).
 *
 * Cinq navigateurs = cinq postes, cinq caissières au profil réel « Caisse/Commande/Stock ».
 *  1. Une vente en attente, rappelée par les CINQ postes au même instant (Entrée dans la fenêtre « Ventes en
 *     attente ») : un seul l'obtient ; les quatre autres voient le refus ; la vente est EN_COURS sur une seule
 *     session ; journal : un rappel admis, quatre refusés, rien d'autre.
 *  2. Cinq ventes commencées au même instant : cinq numéros distincts, cinq « début de saisie », chaîne intacte.
 *  3. Serveur redémarré au milieu des saisies : rien n'est perdu (ventes, lignes, montants) ; sans signal, les
 *     saisies passent INTERROMPUE ; chaque caissière se reconnecte, l'écran lui propose SA saisie, elle la reprend ;
 *     chaîne intacte ; aucune saisie reprise par une autre.
 * Tout est retiré à la fin. Le redémarrage vise le domaine d'essai (PAYARA_DOMAINE), jamais un autre.
 */
const C = require('../ligne-comptant/commun');
const { chromium, A, vues, ok, q } = C;
const ENV_E2E = A.ENV_E2E;
const { execFileSync } = require('child_process');
const path = require('path');

const MDP = 'E2e-Saisie-9';
const N = 5;
const COMPTES = Array.from({ length: N }, (_, i) => ['E2E-SK' + (i + 1), 'e2e-sk' + (i + 1)]);
const ROLE_CAISSE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Caisse/Commande/Stock'");
const J0 = Number(q('SELECT IFNULL(MAX(id), 0) FROM vente_journal_saisie'));
const P1 = C.produitSimple(7);
const P2 = C.produitSimple(8);
const CIP1 = C.cip(P1), CIP2 = C.cip(P2);
const STOCK0 = [A.stock(P1), A.stock(P2)];
const ventes = [];
const DOMAINE = process.env.PAYARA_DOMAINE || '';

const etat = (id) => q("SELECT CONCAT_WS('|', IFNULL(etat_saisie, '-'), IFNULL(saisie_session, '-'), IFNULL(saisie_interruption, '-'), lg_USER_ID)"
  + " FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'").split('|');
const photo = (id) => q("SELECT CONCAT_WS('#', str_REF, int_PRICE, lg_USER_ID, (SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, 'x', int_QUANTITY, 'x', int_PRICE) ORDER BY lg_FAMILLE_ID)"
  + " FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)) FROM t_preenregistrement p WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
const journal = (id) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', geste, admis, IFNULL(cause, '-'), IFNULL(utilisateur_id, 'SERVEUR')) ORDER BY id SEPARATOR ' ; '), '')"
  + " FROM vente_journal_saisie WHERE id > " + J0 + " AND vente_id = '" + id + "'");
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const attendre = async (f, delai, pas) => { const fin = Date.now() + delai; let v; while (Date.now() < fin) { v = f(); if (v) { return v; } await pause(pas || 1000); } return f(); };

function nettoyer() {
  const v = A.liste(ventes);
  q("DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + " DELETE FROM vente_suppression WHERE vente_id IN (" + v + ");"
    + " DELETE FROM vente_journal_saisie WHERE id > " + J0 + ";"
    + " DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID LIKE 'E2E-SK%';"
    + " DELETE FROM t_role_user WHERE lg_USER_ID LIKE 'E2E-SK%';"
    + " DELETE FROM t_event_log WHERE lg_USER_ID LIKE 'E2E-SK%';"
    + " DELETE FROM t_user WHERE lg_USER_ID LIKE 'E2E-SK%'");
}

async function poste(login, mdp) {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1400, height: 860 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  await vues.connexion(p, login, mdp || MDP);
  return { b, ctx, p, erreurs, login };
}
const bandeau = (p) => p.evaluate(() => { const b = document.getElementById('psv-bandeau'); return b && b.style.display !== 'none' ? b.textContent : ''; });
/* vérification de toute la chaîne par le serveur (empreintes recalculées), avec le compte admin qui a le droit au journal */
const verifierChaine = (s) => s.p.evaluate(async () => { const r = await fetch('../api/v1/vente-saisie/journal'); return r.status === 200 ? r.json() : { http: r.status }; });
const session = async (s) => ((await s.ctx.cookies()).find((c) => c.name === 'JSESSIONID') || {}).value || '';

async function redemarrerServeur() {
  if (!/domain3|domain4|domain2/.test(DOMAINE)) { throw new Error('Domaine d\'essai inconnu : ' + DOMAINE); }
  const asadmin = path.join(DOMAINE, '..', '..', '..', 'bin', 'asadmin.bat');
  execFileSync('cmd', ['/c', asadmin, 'restart-domain', '--domaindir', path.dirname(DOMAINE), path.basename(DOMAINE)], { encoding: 'utf8', timeout: 600000 });
  const fin = Date.now() + 300000;
  while (Date.now() < fin) {
    try {
      const r = await fetch(vues.BASE + '/api/v1/horloge/public');
      if (r.status === 200) { return; }
    } catch (e) { /* pas encore */ }
    await pause(3000);
  }
  throw new Error('Serveur non revenu après redémarrage');
}

(async () => {
  nettoyer();
  for (const [id, login] of COMPTES) {
    q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
      + " VALUES ('" + id + "', '" + login + "', MD5('" + MDP + "'), 'E2E', '" + id + "', 'Caissier', 'enable', '1', NOW(), 0)");
    q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + id + "', '" + ROLE_CAISSE + "', '" + id + "', NOW())");
    q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_CREATED, lg_CREATED_BY, str_STATUT) VALUES ('" + id + "-RC', '" + id + "', 0, 0, NOW(), '" + id + "', 'is_Using')");
  }
  const postes = [];
  try {
    for (const [, login] of COMPTES) { postes.push(await poste(login)); }

    /* 1. une vente en attente, cinq rappels au meme instant */
    const s1 = postes[0];
    await C.nouvelleVente(s1.p);
    await C.taperArticle(s1.p, CIP1);
    const v0 = await C.venteCourante(s1.p); ventes.push(v0);
    const ref0 = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v0 + "'");
    await attendre(() => etat(v0)[0] === 'EN_COURS', 10000, 300);
    await vues.cliquer(s1.p, 'doventemanager #contenu [xtype=toolbar] #btnStandBy');
    await attendre(() => etat(v0)[0] === 'EN_ATTENTE', 10000, 300);
    await s1.p.waitForTimeout(1500);
    const photo0 = photo(v0);
    for (const s of postes) {
      if (s !== s1) { await C.nouvelleVente(s.p); }
      await s.p.click('#' + await s.p.evaluate(() => Ext.ComponentQuery.query('doventemanager #preventeSearchBtn')[0].getId()));
      await s.p.waitForFunction((r) => [...document.querySelectorAll('.va-carte .va-ticket')].some((x) => x.textContent === r), ref0, { timeout: 30000 });
      await s.p.evaluate((r) => { const c = [...document.querySelectorAll('.va-carte')].find((x) => x.querySelector('.va-ticket').textContent === r); c.id = 'carte-visee'; }, ref0);
      await s.p.click('#carte-visee'); await s.p.waitForTimeout(500);
    }
    await Promise.all(postes.map((s) => s.p.keyboard.press('Enter')));
    await pause(6000);
    const obtenu = [];
    for (const s of postes) { if ((await C.venteCourante(s.p)) === v0) { obtenu.push(s); } }
    const refus = [];
    for (const s of postes) { if (obtenu.indexOf(s) < 0 && /en cours de saisie/i.test(await bandeau(s.p))) { refus.push(s.login); } }
    ok('1. Cinq rappels au même instant : un seul poste obtient la vente', obtenu.length === 1, obtenu.map((s) => s.login).join(','));
    ok('1. Les quatre autres voient le refus (« en cours de saisie »)', refus.length === N - 1, refus.join(','));
    const e1 = etat(v0);
    const sessionGagnante = obtenu.length === 1 ? await session(obtenu[0]) : '';
    ok('1. En base : EN_COURS, tenue par la session du poste qui l\'a obtenue, et par elle seule', e1[0] === 'EN_COURS' && obtenu.length === 1 && e1[1] !== '-'
      && sessionGagnante.indexOf(e1[1]) === 0, e1.join('|') + ' / ' + sessionGagnante.slice(0, 12));
    const j1 = q("SELECT CONCAT(SUM(geste = 'REPRENDRE_ATTENTE' AND admis = 1), '/', SUM(geste = 'REPRENDRE_ATTENTE' AND admis = 0), '/', COUNT(*)) FROM vente_journal_saisie WHERE id > " + J0 + " AND vente_id = '" + v0 + "'");
    ok('1. Journal : un rappel admis, quatre refusés ; avec le début et la mise en attente : 7 lignes, ni plus ni moins', j1 === '1/4/7', j1 + ' ; ' + journal(v0));
    ok('1. Vente intacte (numéro, montant, lignes)', photo(v0).replace(/#E2E-SK\d#/, '#') === photo0.replace(/#E2E-SK\d#/, '#'), photo(v0) + ' / ' + photo0);
    /* la gagnante remet la vente en attente pour la suite */
    if (obtenu[0]) {
      await vues.cliquer(obtenu[0].p, 'doventemanager #contenu [xtype=toolbar] #btnStandBy');
      await attendre(() => etat(v0)[0] === 'EN_ATTENTE', 10000, 300);
    }
    for (const s of postes) { await C.nouvelleVente(s.p); }

    /* 2. cinq ventes commencees au meme instant */
    await Promise.all(postes.map((s, i) => C.taperArticle(s.p, i % 2 ? CIP2 : CIP1)));
    const vs = [];
    for (const s of postes) { const v = await C.venteCourante(s.p); vs.push(v); ventes.push(v); }
    await attendre(() => vs.every((v) => v && etat(v)[0] === 'EN_COURS'), 15000, 500);
    const numeros = new Set(vs.map((v) => q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'")));
    ok('2. Cinq ventes commencées en même temps : cinq ventes, cinq numéros distincts, toutes EN_COURS', vs.every(Boolean) && new Set(vs).size === N && numeros.size === N
      && vs.every((v) => etat(v)[0] === 'EN_COURS'), vs.map((v) => v && etat(v)[0]).join(','));
    ok('2. Cinq « début de saisie », chacune au nom de sa caissière', vs.every((v, i) => journal(v) === 'DEBUT_SAISIE/1/-/E2E-SK' + (i + 1)), vs.map(journal).join(' || '));
    const admin = await poste(ENV_E2E.LOGIN, 'e2etest');
    const ch2 = await verifierChaine(admin);
    await admin.b.close();
    ok('2. Chaîne du journal intacte après les écritures simultanées (empreintes recalculées par le serveur)', ch2.intact === true, JSON.stringify({ intact: ch2.intact, rupture: ch2.rupture, http: ch2.http }));
    const ch2b = q('SELECT COUNT(*) FROM vente_journal_saisie a JOIN vente_journal_saisie b ON b.id = (SELECT MIN(id) FROM vente_journal_saisie WHERE id > a.id)'
      + ' WHERE a.id > ' + J0 + ' AND b.empreinte_precedente <> a.empreinte');
    ok('2. En base : chaque ligne du test enchaîne sur la précédente (aucune fourche)', ch2b === '0', ch2b);
    const photos = vs.map(photo);

    /* 3. serveur redemarre au milieu */
    const avantRedemarrage = Date.now();
    await redemarrerServeur();
    ok('3. Serveur redémarré et de nouveau joignable', true, Math.round((Date.now() - avantRedemarrage) / 1000) + ' s');
    ok('3. Rien n\'est perdu au redémarrage : ventes, lignes, montants identiques', vs.every((v, i) => photo(v) === photos[i]), vs.map(photo).join(' || '));
    const interrompues = await attendre(() => vs.every((v) => etat(v)[0] === 'INTERROMPUE'), 240000, 5000);
    ok('3. Sans signal (sessions perdues), les cinq saisies passent INTERROMPUE (« SIGNAL_PERDU »)', interrompues && vs.every((v) => etat(v)[2] === 'SIGNAL_PERDU'), vs.map((v) => etat(v).slice(0, 3).join('|')).join(','));
    for (const s of postes) {
      await vues.connexion(s.p, s.login, MDP);
      await C.nouvelleVente(s.p);
    }
    let proposees = 0;
    for (let i = 0; i < N; i++) {
      const s = postes[i];
      await s.p.waitForFunction(() => !!document.getElementById('psv-action'), null, { timeout: 20000 }).catch(() => {});
      const ref = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vs[i] + "'");
      if ((await bandeau(s.p)).indexOf(ref) >= 0) { proposees++; }
    }
    ok('3. Reconnexion : chaque caissière se voit proposer SA saisie (numéro)', proposees === N, proposees + '/' + N);
    await Promise.all(postes.map(async (s, i) => {
      await s.p.click('#psv-action'); await s.p.waitForTimeout(400);
      await s.p.click('#psv-action');
      await s.p.waitForFunction((v) => { const c = testextjs.app.getController('VenteCtr'); return c.current && c.current.lgPREENREGISTREMENTID === v; }, vs[i], { timeout: 20000 }).catch(() => {});
    }));
    await attendre(() => vs.every((v) => etat(v)[0] === 'EN_COURS'), 15000, 500);
    const repris = [];
    for (let i = 0; i < N; i++) { repris.push((await C.venteCourante(postes[i].p)) === vs[i] && etat(vs[i])[0] === 'EN_COURS' && etat(vs[i])[3] === 'E2E-SK' + (i + 1)); }
    ok('3. Reprises simultanées : chacune retrouve SA vente à l\'écran, EN_COURS ; aucune reprise croisée', repris.every(Boolean), JSON.stringify(repris));
    ok('3. Ventes reprises intactes (lignes, montants)', vs.every((v, i) => photo(v) === photos[i]));
    ok('3. Journal de chaque vente : début, signal perdu (serveur), reprise par son autrice — ni plus ni moins',
      vs.every((v, i) => journal(v) === 'DEBUT_SAISIE/1/-/E2E-SK' + (i + 1) + ' ; INTERROMPRE/1/SIGNAL_PERDU/SERVEUR ; REPRENDRE_INTERROMPUE/1/-/E2E-SK' + (i + 1)), vs.map(journal).join(' || '));
    const ch3 = q('SELECT COUNT(*) FROM vente_journal_saisie a JOIN vente_journal_saisie b ON b.id = (SELECT MIN(id) FROM vente_journal_saisie WHERE id > a.id)'
      + ' WHERE a.id > ' + J0 + ' AND b.empreinte_precedente <> a.empreinte');
    ok('3. Chaîne du journal intacte à travers le redémarrage', ch3 === '0', ch3);
    const admin3 = await poste(ENV_E2E.LOGIN, 'e2etest');
    const ch3b = await verifierChaine(admin3);
    await admin3.b.close();
    ok('3. Empreintes recalculées par le serveur après le redémarrage : chaîne intacte', ch3b.intact === true, JSON.stringify({ intact: ch3b.intact, rupture: ch3b.rupture, http: ch3b.http }));
    ok('Stock inchangé (aucune vente clôturée)', A.stock(P1) === STOCK0[0] && A.stock(P2) === STOCK0[1], [A.stock(P1), A.stock(P2), STOCK0].join(' '));
    ok('Aucune erreur JavaScript sur les cinq postes', postes.every((s) => s.erreurs.length === 0), postes.map((s) => s.erreurs.join(' | ')).join(' || '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    for (const s of postes) { await s.b.close().catch(() => {}); }
    nettoyer();
    A.nettoyer();
    ok('Nettoyage : ventes, journal du test, comptes retirés',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + A.liste(ventes) + ")") === '0'
      && q('SELECT COUNT(*) FROM vente_journal_saisie WHERE id > ' + J0) === '0' && q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID LIKE 'E2E-SK%'") === '0');
    process.exit(A.bilan() ? 1 : 0);
  }
})();
