/* REPRODUCTION, PAR L'API, DES ANOMALIES DU CENTRE DE SUPPORT (rapport ANOMALIES_CENTRE_SUPPORT_2026-10-26.md).
 *
 * node support/anomalies-centre/reproduire-api.js [dossier de sortie]
 *
 * Chaque cas est un appel que l'ecran peut envoyer. Aucun n'ecrit de donnees metier : les corps invalides sont refuses
 * a la lecture du JSON, avant la methode, et les identifiants « E2E-INEXISTANT » ne designent rien. Seule trace : un
 * 500 enregistre un evenement au centre de support. Le script releve les evenements avant et apres, et liste ceux
 * qu'il a crees ou incrementes (fichier evenements-touches.json), pour qu'on puisse les retirer.
 *
 * Verdict par cas : DEFAUT_REPRODUIT (l'appel donne encore la reponse fautive), CORRIGE (reponse attendue apres le
 * correctif), AUTRE (a examiner). */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');

const V1 = '/prestige/api/v1/';
const CAS = [
  { id: 'P1', titre: 'monitoringproduct sans dates : NullPointerException « text »', methode: 'GET',
    url: V1 + 'produit/monitoringproduct?start=0&limit=20&produitId=E2E-INEXISTANT',
    defaut: (r) => r.statut === 500, corrige: (r) => r.statut < 500 },
  { id: 'V2a', titre: 'net/assurance, taux du tiers payant vide (null) : IllegalArgumentException sans message', methode: 'POST',
    url: V1 + 'vente/net/assurance',
    corps: { venteId: 'E2E-INEXISTANT', tierspayants: [{ compteTp: 'E2E-INEXISTANT', numBon: 'T1', taux: null, cmu: 'false' }] },
    defaut: (r) => r.statut === 500, corrige: (r) => r.statut === 400 },
  { id: 'V2b', titre: 'add/item, quantite vide (null) : IllegalArgumentException sans message', methode: 'POST',
    url: V1 + 'vente/add/item', corps: { venteId: 'E2E-INEXISTANT', produitId: 'E2E-INEXISTANT', qte: null, qteServie: 1 },
    defaut: (r) => r.statut === 500, corrige: (r) => r.statut === 400 },
  { id: 'V3', titre: 'update/item/vno, quantite decimale : JsonbException (corrige par 974976e0 : 400 attendu)', methode: 'POST',
    url: V1 + 'vente/update/item/vno', corps: { itemId: 'E2E-INEXISTANT', itemPu: 1000, qte: 1.5, qteServie: 1, produitId: 'E2E-INEXISTANT' },
    defaut: (r) => r.statut === 500, corrige: (r) => r.statut === 400 },
  { id: 'C1', titre: 'checked-quantities, quantite decimale : JsonbException (corrige par 974976e0 : 400 attendu)', methode: 'POST',
    url: V1 + 'commande/bon/items/checked-quantities', corps: { id: 'E2E-INEXISTANT', checked: true, checkedQuantity: 2.5 },
    defaut: (r) => r.statut === 500, corrige: (r) => r.statut === 400 },
  { id: 'A1', titre: 'article-vendus, texte dans un filtre entier (stock) : 404 au lieu d\'un refus lisible', methode: 'GET',
    url: V1 + 'ventestats/article-vendus?dtStart=2026-10-01&dtEnd=2026-10-01&start=0&limit=1&nbre=0&stock=abc',
    defaut: (r) => r.statut === 404, corrige: (r) => r.statut === 400 || r.statut === 200 },
  { id: 'A2', titre: 'vente/findone avec « .. » (code scanne) : le navigateur reecrit le chemin, 404', methode: 'GET',
    url: V1 + 'vente/findone/' + encodeURIComponent('..'),
    defaut: (r) => r.statut === 404, corrige: (r) => r.statut !== 404 },
  { id: 'A3', titre: 'client-assurance avec identifiant vide (DevisCtr) : 404', methode: 'GET',
    url: V1 + 'client/client-assurance//0', defaut: (r) => r.statut === 404, corrige: (r) => r.statut !== 404 },
  { id: 'B1', titre: 'billetage/cloture-data sans caisse ouverte (corrige par 2575c3a0/38ba4d65 : pas de 500)', methode: 'GET',
    url: V1 + 'billetage/cloture-data', defaut: (r) => r.statut === 500, corrige: (r) => r.statut === 200 },
  { id: 'C4', titre: 'suppression d\'une commande absente (double envoi) (corrige par f23f4e26 : 200 attendu)', methode: 'DELETE',
    url: V1 + 'commande/order/E2E-INEXISTANT', defaut: (r) => r.statut === 500, corrige: (r) => r.statut < 300 },
  { id: 'S1', titre: 'produit-search/fiche avec un emoji (corrige pour ce declencheur par 45d9a610 : 400 attendu)', methode: 'GET',
    url: V1 + 'produit-search/fiche?start=0&limit=5&search_value=' + encodeURIComponent('\u{1F600}'),
    defaut: (r) => r.statut === 500, corrige: (r) => r.statut === 400 },
  { id: 'F1', titre: 'modification du prix d\'une ligne de BL, PAF vide (JSP) : NumberFormatException, 500', methode: 'POST',
    url: '/prestige/webservices/commandemanagement/bonlivraison/ws_transaction.jsp?mode=modifproductprice'
      + '&lg_BON_LIVRAISON_DETAIL=E2E-INEXISTANT&int_PRIX_REFERENCE=100&int_PRIX_VENTE=100&int_PAF=&int_PA_REEL=50',
    defaut: (r) => r.statut === 500, corrige: (r) => r.statut === 200 },
  /* mesures : le verdict compare la duree au seuil du rapport */
  { id: 'M1', titre: 'details-vente sans identifiant de vente : totaux sur toutes les ventes en cours (mesure, seuil 1 s)',
    methode: 'GET', url: V1 + 'facture-tiers-payant/details-vente', defaut: (r) => r.ms > 1000, corrige: (r) => r.ms <= 1000 },
  { id: 'M2', titre: 'cloche « Ventes en avoir » : ventestats sur un mois (mesure, seuil 200 ms)', methode: 'GET',
    url: V1 + 'ventestats?onlyAvoir=true&sansBon=false&typeVenteId=&avoirStatut=EN_COURS&dtStart=2026-09-26&dtEnd=2026-10-26&start=0&limit=50',
    defaut: (r) => r.ms > 200, corrige: (r) => r.ms <= 200 },
];

(async () => {
  const sortie = process.argv[2] || path.join(ENV_E2E.TMP, 'anomalies-centre');
  fs.mkdirSync(sortie, { recursive: true });
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage();
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', ENV_E2E.LOGIN_SUPPORT); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 60000 });
  const appel = (a) => p.evaluate(async (a) => {
    const t0 = Date.now();
    const x = await fetch(a.url, { method: a.methode, headers: { 'Content-Type': 'application/json' },
      body: a.corps ? JSON.stringify(a.corps) : undefined });
    return { statut: x.status, url: x.url, ms: Date.now() - t0, corps: (await x.text()).slice(0, 300) };
  }, a);
  const evenements = async () => {
    const j = JSON.parse((await p.evaluate(async (u) => (await fetch(u)).text(), V1 + 'support/events?start=0&limit=5000')));
    return new Map((j.data || []).map((e) => [e.id, e]));
  };
  const avant = await evenements();
  const resultats = [];
  for (const c of CAS) {
    const r = await appel(c);
    const verdict = c.defaut(r) ? 'DEFAUT_REPRODUIT' : c.corrige(r) ? 'CORRIGE' : 'AUTRE';
    resultats.push({ id: c.id, titre: c.titre, methode: c.methode, url: c.url, corps: c.corps, statut: r.statut,
      urlFinale: r.url, ms: r.ms, reponse: r.corps, verdict });
    console.log(c.id.padEnd(4), verdict.padEnd(16), r.statut, c.titre);
  }
  await p.waitForTimeout(3000); // les evenements sont enregistres en asynchrone
  const apres = await evenements();
  const touches = [];
  for (const [id, e] of apres) {
    const a = avant.get(id);
    if (!a || a.occurrences !== e.occurrences) {
      touches.push({ id, nouveau: !a, occurrencesAvant: a ? a.occurrences : 0, occurrencesApres: e.occurrences,
        module: e.module, message: e.messageCourt.slice(0, 160), url: e.urlOuEcran });
    }
  }
  fs.writeFileSync(path.join(sortie, 'resultats.json'), JSON.stringify(resultats, null, 1));
  fs.writeFileSync(path.join(sortie, 'evenements-touches.json'), JSON.stringify(touches, null, 1));
  console.log('evenements crees ou incrementes :', touches.length, '->', path.join(sortie, 'evenements-touches.json'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(2); });
