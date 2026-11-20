/* DEMANDES 67 ET 68 (application Prestige Pharmacien, 20/11), par l'API avec une vraie session.
 *
 * 67 — GET v1/ca-credit : pagination, recherche, filtre tiers payant et totaux cote serveur.
 *  - sans parametre nouveau : reponse identique a aujourd'hui (une liste), octet pour octet entre deux appels ;
 *  - periode vide : total 0, montant 0, data vide ;
 *  - sur le mois de la copie de travail le plus fourni (au moins 120 lignes) : limit=50 -> 50 lignes, total = taille de
 *    la liste, montant = somme de la liste ; pages bout a bout = la liste triee (date decroissante, puis facture) ;
 *    derniere page = le reste ; memes objets (memes champs, memes valeurs) que la liste ;
 *  - query et tiersPayant combines : total, montant et lignes = filtre recalcule sur la liste complete ;
 *  - rapprochement avec la base : nombre de lignes et montant de la liste = calcul SQL independant.
 * 68 — GET v1/tableau-bord/tva : memes montants que api/v3/tvas (TOUT, 1er du mois -> jour), taux par taux ;
 *    second appel servi par le cache (meme corps, bien plus rapide) ; frais=1 recalcule.
 * Retour de l'application (20/11) : luLe et duree glissante (1), tiersPayantsRetenus (2), lecture partagee de deux
 * premieres pages simultanees (3), routes annoncees par tableau-bord/version (6).
 * Lecture seule : rien n'est ecrit (empreinte des tables lues identique avant et apres).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, BASE: URL_PRESTIGE } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();

/* mois le plus fourni en parts tiers payant (ventes closes, non annulees, montant > 0) */
const MOIS = q("SELECT DATE_FORMAT(p.dt_CREATED, '%Y-%m-01') m FROM t_preenregistrement_compte_client_tiers_payent c"
  + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = c.lg_PREENREGISTREMENT_ID"
  + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 GROUP BY m HAVING COUNT(*) >= 120 ORDER BY m DESC LIMIT 1");
const FIN = MOIS ? q("SELECT LAST_DAY('" + MOIS + "')") : '';
const EMPREINTE = () => q("CHECKSUM TABLE t_preenregistrement, t_preenregistrement_compte_client_tiers_payent, t_facture, t_facture_detail").split('\n').map((l) => l.split('\t')[1]).join(',');

(async () => {
  if (!MOIS) { console.log('FAIL  Précondition : un mois avec au moins 120 parts tiers payant'); process.exit(1); }
  const avant = EMPREINTE();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext()).newPage();
  const get = (url) => p.evaluate(async (u) => { const t0 = performance.now(); const r = await fetch(u, { credentials: 'same-origin' });
    const texte = await r.text(); return { statut: r.status, texte, ms: Math.round(performance.now() - t0) }; }, url);
  const json = async (url) => { const r = await get(url); try { return { ...r, json: JSON.parse(r.texte) }; } catch (e) { return { ...r, json: null }; } };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const api = '../api/v1/ca-credit?dtStart=' + MOIS + '&dtEnd=' + FIN;

    /* ---- 67 : sans parametre nouveau, une liste, inchangee */
    const liste1 = await json(api), liste2 = await json(api);
    const liste = liste1.json;
    ok('67 : sans paramètre nouveau, la réponse reste une liste (' + MOIS + ')', Array.isArray(liste) && liste.length >= 120, liste && liste.length);
    ok('67 : deux appels sans paramètre donnent le même corps', liste1.texte === liste2.texte);

    /* rapprochement base : memes lignes que les deux requetes du service (non facturees + facturees) */
    const filtre = "p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND DATE(p.dt_CREATED) BETWEEN '" + MOIS + "' AND '" + FIN + "'";
    const nonFact = q("SELECT CONCAT(COUNT(*), '|', IFNULL(SUM(c.int_PRICE), 0)) FROM t_preenregistrement_compte_client_tiers_payent c JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = c.lg_PREENREGISTREMENT_ID"
      + " WHERE " + filtre + " AND NOT EXISTS (SELECT 1 FROM t_facture_detail f WHERE f.str_REF = c.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID)").split('|');
    const fact = q("SELECT CONCAT(COUNT(*), '|', IFNULL(SUM(c.int_PRICE), 0)) FROM t_preenregistrement_compte_client_tiers_payent c JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = c.lg_PREENREGISTREMENT_ID"
      + " JOIN t_facture_detail f ON f.str_REF = c.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID WHERE " + filtre).split('|');
    const sommeListe = liste.reduce((s, o) => s + o.montant, 0);
    ok('67 : rapprochement base — lignes et montant de la liste = calcul SQL indépendant',
      liste.length === +nonFact[0] + +fact[0] && sommeListe === +nonFact[1] + +fact[1],
      liste.length + ' / ' + sommeListe + ' contre ' + (+nonFact[0] + +fact[0]) + ' / ' + (+nonFact[1] + +fact[1]));

    /* ---- 67 : periode vide */
    const vide = (await json('../api/v1/ca-credit?dtStart=1990-01-01&dtEnd=1990-01-31&limit=50')).json;
    ok('67 : période vide → total 0, montant 0, data vide', vide && vide.total === 0 && vide.montant === 0 && Array.isArray(vide.data) && vide.data.length === 0, JSON.stringify(vide));

    /* ---- 67 : pages de 50 */
    const tri = (l) => l.slice().sort((a, c) => (a.mvtDate < c.mvtDate ? 1 : a.mvtDate > c.mvtDate ? -1 : (a.numFacturation < c.numFacturation ? -1 : a.numFacturation > c.numFacturation ? 1 : 0)));
    const trie = tri(liste);
    const r1 = await json(api + '&start=0&limit=50');
    const p1 = r1.json;
    const r2 = await json(api + '&start=50&limit=50');
    ok('67 : page suivante servie par la période gardée 60 s (plus rapide que la première)', r2.ms < Math.max(80, r1.ms / 2), r1.ms + ' ms puis ' + r2.ms + ' ms');
    ok('67 : limit=50 → 50 lignes, total = taille de la liste, montant = somme de la liste',
      p1 && p1.data.length === 50 && p1.total === liste.length && p1.montant === sommeListe, p1 && (p1.data.length + ' / ' + p1.total + ' / ' + p1.montant));
    const pages = [];
    for (let s = 0; s < liste.length; s += 50) { pages.push(...(await json(api + '&start=' + s + '&limit=50')).json.data); }
    const cle = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
    ok('67 : pages bout à bout = la liste triée (date décroissante, puis facture), mêmes objets',
      pages.length === liste.length && pages.every((o, i) => cle(o) === cle(trie[i])) && Object.keys(p1.data[0]).sort().join() === Object.keys(liste[0]).sort().join(),
      pages.length + ' lignes ; champs ' + Object.keys(p1.data[0]).sort().join());
    const der = (await json(api + '&start=' + (Math.floor((liste.length - 1) / 50) * 50) + '&limit=50')).json;
    ok('67 : dernière page = le reste', der.data.length === liste.length - Math.floor((liste.length - 1) / 50) * 50, der.data.length);
    const tps = Array.from(new Set(liste.map((o) => o.tiersPayantLibelle).filter((v) => v != null))).sort();
    ok('67 : tiersPayants = libellés distincts de la période', JSON.stringify(p1.tiersPayants.slice().sort()) === JSON.stringify(tps), p1.tiersPayants.length + ' contre ' + tps.length);
    const clients = new Set(liste.map((o) => (o.clientId != null ? 'id:' + o.clientId : 'nom:' + o.clientName))).size;
    ok('67 : clients = clients distincts', p1.clients === clients, p1.clients + ' contre ' + clients);

    /* ---- 67 : query et tiersPayant combines */
    const tpChoisi = tps[0];
    const facture = (liste.find((o) => o.tiersPayantLibelle === tpChoisi && o.numFacturation && o.numFacturation !== '0') || {}).numFacturation;
    const motif = (facture || 'a').slice(0, 4);
    const has = (v, m) => v != null && String(v).toLowerCase().includes(m.toLowerCase());
    const attendu = trie.filter((o) => (has(o.clientName, motif) || has(o.ayantDroitName, motif) || has(o.numFacturation, motif) || has(o.tiersPayantLibelle, motif))
      && String(o.tiersPayantLibelle).toLowerCase() === String(tpChoisi).toLowerCase());
    const f = (await json(api + '&start=0&limit=1000&query=' + encodeURIComponent(motif.toUpperCase()) + '&tiersPayant=' + encodeURIComponent(tpChoisi.toLowerCase()))).json;
    ok('67 : query « ' + motif.toUpperCase() + ' » + tiersPayant « ' + tpChoisi + ' » → total, montant et lignes = filtre recalculé',
      f && f.total === attendu.length && f.montant === attendu.reduce((s, o) => s + o.montant, 0) && f.data.every((o, i) => cle(o) === cle(attendu[i]))
      && JSON.stringify(f.tiersPayants.slice().sort()) === JSON.stringify(tps),
      f && (f.total + ' / ' + f.montant + ' contre ' + attendu.length));
    const parId = (await json(api + '&limit=1000&tiersPayant=' + encodeURIComponent(liste.find((o) => o.tiersPayantLibelle === tpChoisi).tiersPayantId))).json;
    ok('67 : tiersPayant par identifiant = par libellé', parId && parId.total === trie.filter((o) => o.tiersPayantLibelle === tpChoisi).length, parId && parId.total);

    /* ---- Retour de l'application (20/11), remarque 2 : tiersPayantsRetenus = libelles distincts des lignes retenues */
    const distincts = (l) => new Set(l.map((o) => o.tiersPayantLibelle).filter((v) => v != null)).size;
    let retenusOk = p1.tiersPayantsRetenus === tps.length && f.tiersPayantsRetenus === distincts(attendu);
    const detailRetenus = ['sans filtre ' + p1.tiersPayantsRetenus + '/' + tps.length, 'filtre ' + f.tiersPayantsRetenus + '/' + distincts(attendu)];
    for (const m of ['a', 'e', 'fac', motif]) {
      const att = trie.filter((o) => has(o.clientName, m) || has(o.ayantDroitName, m) || has(o.numFacturation, m) || has(o.tiersPayantLibelle, m));
      const rr = (await json(api + '&start=0&limit=0&query=' + encodeURIComponent(m))).json;
      retenusOk = retenusOk && !!rr && rr.tiersPayantsRetenus === distincts(att) && rr.total === att.length;
      detailRetenus.push('« ' + m + ' » ' + (rr && rr.tiersPayantsRetenus) + '/' + distincts(att));
    }
    ok('Retour 2 : tiersPayantsRetenus = tiers payants distincts des lignes retenues (sans filtre, recherches variées, tiers payant)', retenusOk, detailRetenus.join(' ; '));

    /* ---- Retour, remarque 1 : repere luLe et duree glissante */
    const r0 = await json(api + '&start=0&limit=50');
    const rA = await json(api + '&start=50&limit=50');
    ok('Retour 1 : luLe (nombre) présent, identique entre la page 0 et la page suivante', !!r0.json && typeof r0.json.luLe === 'number' && !!rA.json && r0.json.luLe === rA.json.luLe,
      r0.json && (r0.json.luLe + ' / ' + (rA.json && rA.json.luLe)));
    await p.waitForTimeout(40000);
    const g1 = await json(api + '&start=100&limit=50');
    await p.waitForTimeout(40000);
    const g2 = await json(api + '&start=150&limit=50');
    ok('Retour 1 : durée glissante — pages à +40 s puis +80 s servies par la même lecture (même luLe, rapides)',
      !!g1.json && !!g2.json && g1.json.luLe !== undefined && g1.json.luLe === r0.json.luLe && g2.json.luLe === r0.json.luLe && g2.ms < Math.max(500, r0.ms / 4),
      (g1.json && g1.json.luLe) + ' / ' + (g2.json && g2.json.luLe) + ' ; ' + g1.ms + ' ms, ' + g2.ms + ' ms (page 0 : ' + r0.ms + ' ms)');
    const rf = await json(api + '&start=0&limit=50');
    ok('Retour 1 : tirer pour rafraîchir (start=0 sans filtre) relit la période : nouveau luLe', !!rf.json && rf.json.luLe > r0.json.luLe, rf.json && rf.json.luLe);

    /* ---- Retour, remarque 3 : deux premieres pages en meme temps -> une seule lecture.
       Deux telephones = deux sessions (deux contextes) : dans un meme navigateur, Chromium met en file deux GET
       identiques (verrou de son cache), ce qui ne dit rien du serveur. La seconde part 1,5 s apres la premiere,
       pendant sa lecture : deux lectures auraient deux reperes distincts. */
    const tel2 = await (await b.newContext()).newPage();
    await connexion(tel2, ENV_E2E.LOGIN, 'e2etest');
    const json2 = async (url) => { const r = await tel2.evaluate(async (u) => { const t0 = performance.now(); const x = await fetch(u, { credentials: 'same-origin' });
      const texte = await x.text(); return { statut: x.status, texte, ms: Math.round(performance.now() - t0) }; }, url);
      try { return { ...r, json: JSON.parse(r.texte) }; } catch (e) { return { ...r, json: null }; } };
    const premiereLecture = json(api + '&start=0&limit=50');
    await p.waitForTimeout(1500);
    const seconde = json2(api + '&start=0&limit=50');
    const [c1, c2] = await Promise.all([premiereLecture, seconde]);
    ok('Retour 3 : deux premières pages en même temps → une seule lecture partagée (même luLe, mêmes lignes)',
      !!c1.json && !!c2.json && c1.json.luLe !== undefined && c1.json.luLe === c2.json.luLe && c1.json.luLe > rf.json.luLe && c1.texte === c2.texte,
      (c1.json && c1.json.luLe) + ' / ' + (c2.json && c2.json.luLe) + ' ; ' + c1.ms + ' ms, ' + c2.ms + ' ms');

    /* ---- Retour, remarque 6 : tableau-bord/version annonce les routes */
    const ver = (await json('../api/v1/tableau-bord/version')).json;
    ok('Retour 6 : tableau-bord/version annonce les routes « tva » et « ca-credit » (pagination), version inchangée',
      !!ver && ver.success === true && Array.isArray(ver.routes) && ver.routes.includes('tva') && ver.routes.includes('ca-credit') && /^(ANCIEN|NOUVEAU)$/.test(ver.version),
      JSON.stringify(ver));

    /* ---- 68 : tableau-bord/tva = api/v3/tvas TOUT, en cache */
    const jour = q('SELECT CURDATE()'), debut = q("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-01')");
    const ref = (await json('../api/v3/tvas?dtStart=' + debut + '&dtEnd=' + jour + '&typeVente=TOUT')).json;
    const t1 = await json('../api/v1/tableau-bord/tva?date=' + jour + '&frais=1');
    const parTaux = (l, k) => l.map((o) => [o[k[0]], o[k[1]], o[k[2]], o[k[3]]].join('|')).sort().join(';');
    ok('68 : la route répond { success, data } avec taux, ht, tva, ttc', t1.json && t1.json.success === true && Array.isArray(t1.json.data)
      && t1.json.data.every((o) => ['taux', 'ht', 'tva', 'ttc'].every((k) => typeof o[k] === 'number')), t1.texte.slice(0, 200));
    ok('68 : mêmes montants que api/v3/tvas (TOUT, ' + debut + ' → ' + jour + '), taux par taux',
      ref && t1.json && parTaux(t1.json.data, ['taux', 'ht', 'tva', 'ttc']) === parTaux(ref.data, ['TAUX', 'Total HT', 'Total TVA', 'Total TTC']),
      t1.json && JSON.stringify(t1.json.data) + ' contre ' + JSON.stringify((ref.data || []).map((o) => [o.TAUX, o['Total HT'], o['Total TVA'], o['Total TTC']])));
    /* mois fourni de la copie de travail : date = dernier jour du mois -> periode du 1er au dernier jour */
    const refMois = (await json('../api/v3/tvas?dtStart=' + MOIS + '&dtEnd=' + FIN + '&typeVente=TOUT')).json;
    const tMois = (await json('../api/v1/tableau-bord/tva?date=' + FIN + '&frais=1')).json;
    const ttcMois = tMois && tMois.data.reduce((s, o) => s + o.ttc, 0);
    ok('68 : sur ' + MOIS.slice(0, 7) + ' (mois fourni), mêmes montants que api/v3/tvas, taux par taux, et ttc > 0',
      refMois && tMois && ttcMois > 0 && parTaux(tMois.data, ['taux', 'ht', 'tva', 'ttc']) === parTaux(refMois.data, ['TAUX', 'Total HT', 'Total TVA', 'Total TTC']),
      tMois && JSON.stringify(tMois.data) + ' contre ' + JSON.stringify((refMois.data || []).map((o) => [o.TAUX, o['Total HT'], o['Total TVA'], o['Total TTC']])));
    const t2 = await json('../api/v1/tableau-bord/tva?date=' + jour);
    ok('68 : second appel servi par le cache (même corps, plus rapide)', t2.texte === t1.texte && t2.ms < Math.max(60, t1.ms / 2), t1.ms + ' ms puis ' + t2.ms + ' ms');
    const t3 = await json('../api/v1/tableau-bord/tva?date=' + jour + '&frais=1');
    ok('68 : frais=1 recalcule (mêmes montants)', t3.json && t3.json.success === true && parTaux(t3.json.data, ['taux', 'ht', 'tva', 'ttc']) === parTaux(t1.json.data, ['taux', 'ht', 'tva', 'ttc']), t3.ms + ' ms');

    /* ---- sans session : refus */
    const p2 = await (await b.newContext()).newPage();
    await p2.goto(URL_PRESTIGE + '/security/index.html');
    const anonyme = await p2.evaluate(async () => (await fetch('../api/v1/tableau-bord/tva')).text());
    ok('68 : sans session, la route refuse (filtre de sécurité commun : « Veuillez vous connecter »)', /Veuillez vous connecter|"success"\s*:\s*false/.test(anonyme) && !/"data"/.test(anonyme), anonyme.slice(0, 120));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    ok('Bilan : lecture seule, rien n\'est écrit (empreinte des tables lues)', EMPREINTE() === avant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
