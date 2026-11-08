/* LISTES DE L'ONGLET UBIPHARM pour le faux extranet (releve des pages du 08/11) : promotions, produits avec UG,
 * produits supprimes, factures non relevees, derniers releves, recapitulatifs d'avoirs, dernieres commandes par agence,
 * commandes extranet, produits les plus achetes. Valeurs inventees et variees (vides, zero, caracteres speciaux,
 * plusieurs agences, quantites > 1), jamais de donnee reelle. Chaque liste donne aussi les cellules attendues a l'ecran.
 */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const MENU = "<a href='#' class='dropdown-toggle'><i class='fa fa-bars'></i></a><ul class='dropdown-menu'><li><a href='#'>Voir le PDF</a></li></ul>";
const saisie = (i) => "<input type='hidden' name='cip_" + i + "' value='1'><input class='touchspin' name='qtt_" + i + "' value='0'>";
const produit = (des, ps, cip) => "<a class='popup-produit' data-pscode=\"" + ps + "\" data-sheettype=\"\" href='#'>" + esc(des) + '</a>'
  + (cip ? "<div class='td-detail'>" + ps + ' - ' + cip + '</div>' : '');
function dispo(ps, etiquette, agences) {
  let h = "<span class='badge badge-sm badge-primary tooltip-stock-link' data-toggle=\"tooltip-stock\">" + etiquette + '</span>'
    + '<div class="tooltip-stock"><div class="tip-viewStock-cip">CIP: 3000000000000</div><div class="tip-viewStock" id="tip-stock-' + ps + '">';
  for (const [a, d] of agences) {
    h += '<div class="tip-viewStock-lgetlib" data-etcoda="' + a + '" data-colisage="12"><span class="tip-viewStock-etlib">UBIPHARM ' + a
      + '</span><span class="tip-viewStock-dispo text-success">' + d + '</span><span class="tip-viewStock-colisagelib">Colisage</span>'
      + '<span class="tip-viewStock-colisage">12, 24</span></div>';
  }
  return [h + '</div></div>', etiquette + (agences.length ? ' — ' + agences.map(([a, d]) => a + ' : ' + d).join(', ') : '')];
}
function paliers(ps, l) {
  return [l.map(([q, ug]) => "<div class='ml-1'><a href='#' class='link-qtt-promo' data-pscode='" + ps + "' data-qtt='" + q + "'>" + q
    + " <small>U</small></a> <i class='fal fa-arrow-right'></i> " + ug + ' <small>UG</small></div>').join(''),
  l.map(([q, ug]) => q + ' U → ' + ug + ' UG').join(' ; ')];
}
const AGENCES = [[['BKE', 'Oui'], ['YOP', 'Non']], [['GNA', 'N/A']], [], [['BKE', 'Oui'], ['GNA', 'Oui'], ['VRI', 'Faible'], ['YOP', 'Non']]];
const DES = ['PARACETAMOL 500MG B/20', 'GEL DOUCHE ÉCLAT & CIE 1000ML', 'SIROP <ENFANT> 125ML', 'CRÈME "FORTE" 50%'];

function page(id, titres, lignes) {
  return '<html><head><script>var faux = \'<table id="' + id + '">\';</script></head><body><form method="post" action="AjoutProduitsCommande">'
    + '<table id="' + id + '"><thead><tr>' + titres.map((t) => '<th>' + esc(t) + '</th>').join('') + '</tr></thead><tbody>'
    + (lignes.length ? lignes.map((l) => '<tr>' + l.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('')
      : '<tr><td colspan="' + titres.length + '">Aucune donnée</td></tr>')
    + '</tbody></table></form></body></html>';
}
const enveloppe = (lignes, total, draw) => ({ msg: [], datatables: { recordsTotal: total, recordsFiltered: total, data: lignes, draw } });

function generer() {
  const L = {};
  /* promotions : page HTML */
  const promos = [];
  for (let i = 0; i < 7; i++) {
    promos.push({ c: [String(7900 + i), i < 2 ? '1' : '999', esc(i === 3 ? 'PROMO L\'ÉTÉ & <OFFRE>' : 'PROMO ESSAI ' + i), i % 2 ? 'Unités gratuites' : 'Remise',
      '0' + (1 + i) + '/11/2026 00:00', '31/01/2027 23:59'], e: [String(7900 + i), i === 3 ? 'PROMO L\'ÉTÉ & <OFFRE>' : 'PROMO ESSAI ' + i,
      i % 2 ? 'Unités gratuites' : 'Remise', '0' + (1 + i) + '/11/2026 00:00', '31/01/2027 23:59'] });
  }
  L.PROMOTIONS = { chemin: '/Promotions', html: page('promotions', ['', '', 'Libellé', 'Type', 'Date de début', 'Date de fin'], promos.map((x) => x.c)),
    attendu: promos.map((x) => x.e) };

  /* produits avec UG : JSON complet, total annonce a 0 */
  const ug = [];
  for (let i = 0; i < 5; i++) {
    const ps = 'UG' + (100 + i), cip = i === 2 ? '' : '30000' + (1000000 + i * 13), des = DES[i % 4];
    const [dh, dt] = dispo(ps, i % 2 ? 'Rupture' : 'En stock', AGENCES[i % 4]);
    const [ph, pt] = paliers(ps, i === 4 ? [] : [[10 * (i + 1), i], [50, 6 + i]].slice(0, 1 + (i % 2)));
    ug.push({ c: ['', ps, produit(des, ps, cip), dh, ph, saisie(i), '<span id="promook_' + i + '"></span>'], e: [ps, des, cip, dt, pt] });
  }
  L.PRODUITS_UG = { chemin: '/ProduitsPromotionsJSON', json: () => enveloppe(ug.map((x) => x.c), 0), attendu: ug.map((x) => x.e) };

  /* produits supprimes : page HTML */
  const sup = [];
  for (let i = 0; i < 4; i++) {
    const ps = 'SUP' + (200 + i), cip = '30000' + (2000000 + i), des = DES[(i + 1) % 4];
    const [dh, dt] = dispo(ps, 'Supprimé', AGENCES[(i + 2) % 4]);
    sup.push({ c: [produit(des, ps, cip), '1' + i + '/10/2026', i ? 'Supprimé' : 'Bloqué', dh, saisie(i)], e: [ps, des, cip, '1' + i + '/10/2026', i ? 'Supprimé' : 'Bloqué', dt] });
  }
  L.PRODUITS_SUPPRIMES = { chemin: '/ProduitsSupprimes', html: page('produits', ['Libellé du produit', 'Date de suppression', 'Statut', 'Dispo', 'Qte'], sup.map((x) => x.c)),
    attendu: sup.map((x) => x.e) };

  /* factures non relevees : page HTML (montant 0 compris) */
  const fac = [];
  for (let i = 0; i < 6; i++) {
    const m = i === 1 ? '0' : (123456 * (i + 1)).toLocaleString('fr-FR').replace(/\s/g, ' ');
    fac.push({ c: [MENU, 'F26' + (1000 + i), i === 2 ? '' : 'CDE-' + i, '0' + (i + 1) + '/11/2026 10:0' + i + ':00', '<span>' + m + '</span>'],
      e: ['F26' + (1000 + i), i === 2 ? '' : 'CDE-' + i, '0' + (i + 1) + '/11/2026 10:0' + i + ':00', m] });
  }
  L.FACTURES = { chemin: '/ListeFactures', html: page('factures', ['', 'N° Facture', 'Ref Commande', 'Date', 'Montant (CFA)'], fac.map((x) => x.c)),
    attendu: fac.map((x) => x.e) };

  /* derniers releves : JSON pagine, 130 lignes (2 pages de 100) ; avoirs : liste vide */
  const rel = [];
  for (let i = 0; i < 130; i++) {
    const m = String((i * 7919) % 900000) + ' CFA';
    rel.push({ c: [MENU, 'R' + String(50000 - i), String(1 + (i % 28)).padStart(2, '0') + '/10/2026', m], e: ['R' + String(50000 - i), String(1 + (i % 28)).padStart(2, '0') + '/10/2026', m] });
  }
  L.RELEVES = { chemin: '/GetRelevesJSON', pagine: rel, attendu: rel.map((x) => x.e) };
  L.AVOIRS = { chemin: '/GetRecapAvoirsJSON', pagine: [], attendu: [] };

  /* dernieres commandes : une liste par agence (BKE 3 lignes, GNA vide, YOP 1) */
  const cdes = { BKE: [], GNA: [], YOP: [] };
  const attCdes = [];
  ['BKE', 'GNA', 'YOP'].forEach((a, k) => {
    for (let i = 0; i < [3, 0, 1][k]; i++) {
      const c = [MENU, String(880000 + k * 10 + i), (45000 * (i + 1)) + ' CFA', i ? 'Extranet' : 'Téléphone', 'Livrée', '0' + (i + 1) + '/11/2026'];
      cdes[a].push(c);
      attCdes.push([a, c[1], c[2], c[3], c[4], c[5]]);
    }
  });
  L.DERNIERES_COMMANDES = { chemin: '/ReturnDernieresCommandesEtabJSON', page: '/DernieresCommandes', parAgence: cdes, attendu: attCdes,
    html: '<html><body>' + Object.keys(cdes).map((a) => "<table class='lastCde' id='" + a + "'><thead><tr><th></th><th>N° commande</th></tr></thead></table>").join('') + '</body></html>' };

  /* commandes extranet : page HTML */
  const ext = [];
  for (let i = 0; i < 4; i++) {
    ext.push({ c: [MENU, String(1408000 + i), ['BKE', 'YOP', 'GNA', 'VRI'][i], String(77000 + i), i === 1 ? '' : 'Commande essai ' + i, 'essai-e2e', '0' + (i + 1) + '/11/2026'],
      e: [String(1408000 + i), ['BKE', 'YOP', 'GNA', 'VRI'][i], String(77000 + i), i === 1 ? '' : 'Commande essai ' + i, 'essai-e2e', '0' + (i + 1) + '/11/2026'] });
  }
  L.COMMANDES_EXTRANET = { chemin: '/DernieresCommandesExtranet', html: page('lastCdeExt', ['', 'N° commande', 'Etablissement', 'Réf. commande', 'Description',
    'Utilisateur', 'Date'], ext.map((x) => x.c)), attendu: ext.map((x) => x.e) };

  /* plus achetes : JSON complet, total annonce */
  const ach = [];
  for (let i = 0; i < 6; i++) {
    const ps = 'ACH' + (300 + i), cip = '30000' + (3000000 + i), des = DES[(i + 2) % 4];
    const [dh, dt] = dispo(ps, 'En stock', AGENCES[i % 4]);
    const prix = "<div class='td-main cell-pspven'>" + (198 + i) + " <small>CFA</small></div><div class='td-detail'>Prix TTC* : <span class='cell-pspttc'>" + (233 + i)
      + ' <small>CFA</small></span></div><input type="hidden" name="pspven_' + i + '" value="198.0" />';
    ach.push({ c: [produit(des, ps, cip), String(6000 - i * 1000), dh, prix, saisie(i)], e: [ps, des, cip, String(6000 - i * 1000), dt,
      (198 + i) + ' CFA Prix TTC* : ' + (233 + i) + ' CFA'] });
  }
  L.PLUS_ACHETES = { chemin: '/ReturnProduitsAchetesJSON', json: () => enveloppe(ach.map((x) => x.c), ach.length), attendu: ach.map((x) => x.e) };
  return L;
}

/** Reponse du faux extranet pour un chemin de liste ; null si le chemin n'est pas une liste. */
function repondre(L, u, json, html) {
  for (const code of Object.keys(L)) {
    const l = L[code];
    if (l.page && u.pathname === l.page) { return html(l.html); }
    if (u.pathname !== l.chemin) { continue; }
    if (l.parAgence) {
      const lignes = l.parAgence[u.searchParams.get('etab')];
      return lignes ? json(Object.assign(enveloppe(lignes, lignes.length), { sDatemaj: '08/11/2026 04:00', sStatut: 'OK' })) : null;
    }
    if (l.html) { return html(l.html); }
    if (l.json) { return json(l.json()); }
    const start = Number(u.searchParams.get('start')), length = Number(u.searchParams.get('length'));
    return json(enveloppe(l.pagine.slice(start, start + length).map((x) => x.c), l.pagine.length, u.searchParams.get('draw')));
  }
  return null;
}

module.exports = { generer, repondre };
