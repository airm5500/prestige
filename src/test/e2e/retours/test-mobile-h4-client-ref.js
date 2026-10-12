/* PRESTIGE MOBILE H4 : cle client anti-doublon (X-Client-Ref), patch serveur du 11/10 (v1/app-vente/).
 * Par l'API, avec la session habituelle (cookie) :
 *  - capacites : clientRef true ; relecture d'une cle inconnue : 404 ;
 *  - prevente comptant (add/vno) : meme cle deux fois = meme vente ; 5 envois simultanes = 1 vente ;
 *    sans cle, deux envois = deux ventes (comportement d'origine) ; creation refusee avec cle = cle non gardee ;
 *  - retour fournisseur (retourfournisseur/new) : meme cle deux fois = meme retour ; cle d'une vente refusee ;
 *  - relecture GET v1/app-vente/client-ref/{ref} : type, id, reference, statut ;
 *  - l'ancienne route v1/mobile/capacites reste sous jeton (le filtre n'est pas modifie).
 * Integre le 12/10 sur claude/new-session-xm8ptu (version du 11/10 du patch, prefixe v1/app-vente/).
 * Donnees retirees a la fin (ventes, retours, cles E2E-H4-*, stock du produit remis).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const [PID, PU] = q("SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 500 AND 20000 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
  + " AND f.bool_ACCOUNT = 1 AND s.int_NUMBER_AVAILABLE >= 10 ORDER BY f.str_NAME LIMIT 1").split(':');
const STOCK = q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + PID + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
/* le champ lgBONLIVRAISONID du retour porte le NUMERO du bon (str_REF_LIVRAISON), comme l'ecran */
const [BL, BLPROD] = q("SELECT CONCAT(b.str_REF_LIVRAISON, ':', d.lg_FAMILLE_ID) FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE b.str_STATUT = 'is_Closed' AND d.int_QTE_RECUE >= 1 ORDER BY b.dt_UPDATED DESC LIMIT 1").split(':');
const ventes = new Set(), retours = new Set();
const nettoyer = () => {
  const v = [...ventes].map((x) => "'" + x + "'").join(','), r = [...retours].map((x) => "'" + x + "'").join(',');
  if (v) { q("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + "); DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ")"); }
  if (r) { q("DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (" + r + "); DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (" + r + ")"); }
  q("DELETE FROM mobile_client_ref WHERE ref LIKE 'E2E-H4-%'");
  q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + STOCK[0] + ", int_NUMBER = " + STOCK[1] + " WHERE lg_FAMILLE_ID = '" + PID + "' AND lg_EMPLACEMENT_ID = '1'");
};

(async () => {
  q("DELETE FROM mobile_client_ref WHERE ref LIKE 'E2E-H4-%'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext()).newPage();
  const appel = (methode, url, corps, cle) => p.evaluate(async ([methode, url, corps, cle]) => {
    const h = { 'Content-Type': 'application/json' }; if (cle) { h['X-Client-Ref'] = cle; }
    const r = await fetch(url, { method: methode, headers: h, body: corps ? JSON.stringify(corps) : undefined });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { j = null; }
    return { s: r.status, t, j };
  }, [methode, url, corps, cle]);
  const vente = (qte) => ({ typeVenteId: '1', natureVenteId: '1', produitId: PID, itemPu: Number(PU), qte, qteServie: qte, devis: false, venteId: null,
    prevente: true, remiseId: null, userVendeurId: ADMIN });
  const id = (r) => r.j && r.j.data ? r.j.data.lgPREENREGISTREMENTID : null;
  const garder = (r) => { if (id(r)) { ventes.add(id(r)); } return r; };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 }); await p.waitForLoadState('networkidle'); await p.waitForTimeout(2000);

    const cap = await appel('GET', '../api/v1/app-vente/capacites');
    ok('Capacités (session habituelle) : clientRef true', cap.s === 200 && cap.j.clientRef === true && cap.j.clientRefVersion === 1, cap.t);
    const ancien = await appel('GET', '../api/v1/mobile/capacites');
    ok('Ancienne route v1/mobile/capacites : toujours sous jeton (filtre non modifié)', ancien.s === 401 || ancien.s === 404, ancien.s + ' ' + ancien.t.slice(0, 80));
    const inconnue = await appel('GET', '../api/v1/app-vente/client-ref/E2E-H4-INCONNUE');
    ok('Relecture d\'une clé inconnue : 404', inconnue.s === 404 && inconnue.j.success === false, inconnue.s);

    const a1 = garder(await appel('POST', '../api/v1/vente/add/vno', vente(1), 'E2E-H4-V1'));
    const a2 = garder(await appel('POST', '../api/v1/vente/add/vno', vente(1), 'E2E-H4-V1'));
    ok('Prévente, même clé deux fois : même vente, réponse identique', id(a1) && id(a1) === id(a2) && a1.t === a2.t, id(a1) + ' / ' + id(a2));
    ok('… une seule vente en base', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id(a1) + "'") === '1');
    const lu = await appel('GET', '../api/v1/app-vente/client-ref/E2E-H4-V1');
    ok('Relecture : type VENTE, id, référence, statut pending', lu.s === 200 && lu.j.type === 'VENTE' && lu.j.id === id(a1) && lu.j.reference === a1.j.data.strREF && lu.j.statut === 'pending', lu.t);

    const avant = Number(q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_USER_ID = '" + ADMIN + "' AND dt_CREATED >= NOW() - INTERVAL 1 HOUR"));
    const par = await Promise.all([1, 2, 3, 4, 5].map(() => appel('POST', '../api/v1/vente/add/vno', vente(1), 'E2E-H4-SIMUL')));
    par.forEach(garder);
    const ids = new Set(par.map(id));
    const apres = Number(q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_USER_ID = '" + ADMIN + "' AND dt_CREATED >= NOW() - INTERVAL 1 HOUR"));
    ok('5 envois simultanés de la même clé : 5 réponses, une seule vente créée', ids.size === 1 && !ids.has(null) && apres - avant === 1, [...ids].join(',') + ' / +' + (apres - avant));

    const s1 = garder(await appel('POST', '../api/v1/vente/add/vno', vente(1)));
    const s2 = garder(await appel('POST', '../api/v1/vente/add/vno', vente(1)));
    ok('Sans clé, deux envois : deux ventes (comportement d\'origine)', id(s1) && id(s2) && id(s1) !== id(s2), id(s1) + ' / ' + id(s2));

    const refus = garder(await appel('POST', '../api/v1/vente/add/vno', vente(0), 'E2E-H4-REFUS'));
    const luRefus = await appel('GET', '../api/v1/app-vente/client-ref/E2E-H4-REFUS');
    ok('Création refusée avec clé : refus d\'origine renvoyé, clé non gardée (404)', refus.j && refus.j.success === false && luRefus.s === 404
      && q("SELECT COUNT(*) FROM mobile_client_ref WHERE ref = 'E2E-H4-REFUS'") === '0', refus.t.slice(0, 120));
    const sansRefus = garder(await appel('POST', '../api/v1/vente/add/vno', vente(0)));
    ok('… même refus que sans clé (texte identique)', sansRefus.j && sansRefus.j.success === false && sansRefus.t === refus.t, sansRefus.t.slice(0, 120));

    const ret = { lgBONLIVRAISONID: BL, strCOMMENTAIRE: 'E2E H4', strREPONSEFRS: '', items: [{ produitId: BLPROD, intNUMBERRETURN: 1, lgMOTIFRETOUR: '' }] };
    const r1 = await appel('POST', '../api/v1/retourfournisseur/new', ret, 'E2E-H4-R1');
    const r2 = await appel('POST', '../api/v1/retourfournisseur/new', ret, 'E2E-H4-R1');
    const rid = (r) => r.j && r.j.data ? (r.j.data.lgRETOURFRSID || (r.j.data[0] || {}).lgRETOURFRSID) : null;
    [r1, r2].forEach((r) => { if (rid(r)) { retours.add(rid(r)); } });
    ok('Retour fournisseur, même clé deux fois : même retour, un seul en base', rid(r1) && rid(r1) === rid(r2)
      && q("SELECT COUNT(*) FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '" + rid(r1) + "'") === '1', rid(r1) + ' / ' + rid(r2) + ' ' + r1.t.slice(0, 100));
    const r3 = await appel('POST', '../api/v1/retourfournisseur/new', ret);
    if (rid(r3)) { retours.add(rid(r3)); }
    ok('Retour sans clé : nouveau retour (inchangé)', rid(r3) && rid(r3) !== rid(r1), rid(r3));
    const autre = await appel('POST', '../api/v1/retourfournisseur/new', ret, 'E2E-H4-V1');
    if (rid(autre)) { retours.add(rid(autre)); }
    ok('Clé d\'une vente réutilisée pour un retour : refus explicite, rien créé', autre.j && autre.j.success === false && /autre opération/.test(autre.t) && !rid(autre), autre.t.slice(0, 160));
    const luR = await appel('GET', '../api/v1/app-vente/client-ref/E2E-H4-R1');
    ok('Relecture du retour : type RETOUR_FRS, statut', luR.s === 200 && luR.j.type === 'RETOUR_FRS' && luR.j.id === rid(r1) && luR.j.existe === true, luR.t);
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées', q("SELECT COUNT(*) FROM mobile_client_ref WHERE ref LIKE 'E2E-H4-%'") === '0'
      && (ventes.size === 0 || q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + [...ventes].map((x) => "'" + x + "'").join(',') + ")") === '0'));
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
