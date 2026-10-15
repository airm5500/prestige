/* B3 (Prestige Mobile) : PAIEMENTS MOBILE MONEY PAR AGREGATEUR, avec le SIMULATEUR (demandes serveur, point 42).
 *
 * A lancer avec le simulateur configure sur le BANC (proprietes systeme PRESTIGE_PAIEMENTS_FOURNISSEUR=simulateur et
 * PRESTIGE_PAIEMENTS_SIMULATEUR_SECRET, voir docs du patch) ; sans elles, seul le premier point est verifie.
 * Une vente d'essai (assurance, part client 1 500) est posee en base puis retiree. Ce que le test etablit :
 *  - capacites : operateurs annonces quand le simulateur est actif, rien sinon ;
 *  - creation : montant fixe par le serveur (part client), un montant envoye est ignore ; meme X-Client-Ref -> meme
 *    paiement ; operateur inconnu refuse ;
 *  - webhook public non signe : 401, rien ne change ;
 *  - paiement simule : statut paye ; un second « paiement » n'encaisse pas deux fois ;
 *  - annulation d'un autre paiement en attente ;
 *  - sans session : les routes du comptoir repondent « deconnecte ».
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const V = 'E2E-B3-VENTE';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const nettoyer = () => exec(`DELETE FROM paiement_mobile WHERE vente_id = '${V}' OR client_ref LIKE 'e2e-b3-%'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${V}';`);

(async () => {
  nettoyer();
  exec(`INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, lg_USER_ID, int_PRICE, int_PRICE_REMISE, int_CUST_PART, str_STATUT, dt_CREATED, dt_UPDATED, str_TYPE_VENTE, lg_TYPE_VENTE_ID, b_IS_CANCEL, imported)
    VALUES ('${V}', '${V}', 'E2E-B3', '${ADMIN}', 5000, 0, 1500, 'is_Process', NOW(), NOW(), 'VO', '2', 0, 0)`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext()).newPage();
  const api = (m, u, c, h) => p.evaluate(async ([m, u, c, h]) => { const r = await fetch(u, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}), body: c === undefined ? undefined : (typeof c === 'string' ? c : JSON.stringify(c)) });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 120) }; } j.http = r.status; return j; }, [m, u, c, h]);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    const sans = await api('POST', '../api/v1/paiements-mobile', { venteId: V, operateur: 'WAVE' });
    ok('Sans session : création refusée', sans.success === false || sans.http === 401, JSON.stringify(sans).slice(0, 120));
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const cap = await api('GET', '../api/v1/paiements-mobile/capacites');
    const actif = cap.fournisseur === 'simulateur' && (cap.paiementsMobile || []).indexOf('wave') >= 0 && cap.typesReglement.wave === '10';
    ok('Capacités : opérateurs annoncés (simulateur actif sur le banc)', actif, JSON.stringify(cap).slice(0, 250));
    if (!actif) { throw new Error('simulateur non configuré : lancer avec les propriétés système du simulateur'); }

    const c1 = await api('POST', '../api/v1/paiements-mobile', { venteId: V, operateur: 'WAVE', montant: 10, cloturer: false }, { 'X-Client-Ref': 'e2e-b3-1' });
    const id = c1.data && c1.data.id;
    ok('Création : montant fixé par le serveur (1 500), montant envoyé ignoré', c1.success === true && !!id && q(`SELECT montant FROM paiement_mobile WHERE id = '${id}'`) === '1500', JSON.stringify(c1).slice(0, 250));
    const c2 = await api('POST', '../api/v1/paiements-mobile', { venteId: V, operateur: 'WAVE', cloturer: false }, { 'X-Client-Ref': 'e2e-b3-1' });
    ok('Même X-Client-Ref : même paiement, aucun de plus', c2.success === true && c2.deja === true && c2.data.id === id && q(`SELECT COUNT(*) FROM paiement_mobile WHERE vente_id = '${V}'`) === '1', JSON.stringify(c2).slice(0, 160));
    const mauvais = await api('POST', '../api/v1/paiements-mobile', { venteId: V, operateur: 'PAYPAL' });
    ok('Opérateur inconnu : refusé', mauvais.success === false, JSON.stringify(mauvais).slice(0, 160));

    const nonSigne = await p.evaluate(async (id) => (await fetch('../api/v1/paiements-mobile/notification/simulateur', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, statut: 'paye', montant: 1500 }) })).status, id);
    ok('Webhook non signé : 401, paiement toujours en attente', nonSigne === 401 && q(`SELECT statut FROM paiement_mobile WHERE id = '${id}'`) === 'en_attente', nonSigne + ' ' + q(`SELECT statut FROM paiement_mobile WHERE id = '${id}'`));
    const autreFournisseur = await p.evaluate(async () => (await fetch('../api/v1/paiements-mobile/notification/cinetpay', { method: 'POST', body: '{}' })).status);
    ok('Webhook d\'un fournisseur non configuré : 404', autreFournisseur === 404, autreFournisseur);

    const paye = await api('POST', '../api/v1/paiements-mobile/' + id + '/simuler?payer=true');
    ok('Paiement simulé : statut payé', paye.success === true && /pay/.test(q(`SELECT statut FROM paiement_mobile WHERE id = '${id}'`)), JSON.stringify(paye).slice(0, 200));
    const encore = await api('POST', '../api/v1/paiements-mobile/' + id + '/simuler?payer=true');
    ok('Second paiement simulé : jamais deux encaissements (une seule ligne, statut inchangé)', q(`SELECT COUNT(*) FROM paiement_mobile WHERE vente_id = '${V}'`) === '1' && /pay/.test(q(`SELECT statut FROM paiement_mobile WHERE id = '${id}'`)), JSON.stringify(encore).slice(0, 160));

    const c3 = await api('POST', '../api/v1/paiements-mobile', { venteId: V, operateur: 'OM', cloturer: false }, { 'X-Client-Ref': 'e2e-b3-2' });
    const ann = await api('POST', '../api/v1/paiements-mobile/' + c3.data.id + '/annuler');
    ok('Annulation d\'un paiement en attente', ann.success === true && /annul/.test(q(`SELECT statut FROM paiement_mobile WHERE id = '${c3.data.id}'`)), q(`SELECT statut FROM paiement_mobile WHERE id = '${c3.data.id}'`));
    const hist = await api('GET', '../api/v1/paiements-mobile');
    ok('Historique du jour', hist.success === true && (hist.data || []).some((x) => x.id === id), hist.total);
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées', q(`SELECT COUNT(*) FROM paiement_mobile WHERE vente_id = '${V}'`) === '0' && q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${V}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
