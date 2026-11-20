/* PLAN DU 19/11, POINT 8 : « Ventes terminées », icône « ticket vente modifiée ».
 * Avant : le bouton ressortait le ticket de la seule nouvelle vente, comme « Réimprimer le ticket ». Désormais un seul
 * ticket rappelle la vente d'origine, la vente modifiée et les différences (total, parts des organismes, part du
 * client, déjà payé, reste à payer ou à rendre), puis le règlement de la modification.
 *
 * Deux cas (jeux d'essai variés) :
 *  A. vente assurance à deux organismes (70 % et 20 %), deux lignes (quantités 2 et 1) ; modification : une ligne
 *     ajoutée (quantité 3) -> la part du client augmente : « Reste à payer ».
 *  B. vente assurance à un organisme (60 %), deux lignes (quantités 1 et 2) ; modification : une ligne retirée -> la
 *     part du client baisse : « À rendre au client ».
 * Pour chaque cas :
 *  - rapprochement aperçu (ticket/modifiee/{id}/apercu) / base, ligne par ligne : références des deux ventes, lignes
 *    (désignation, quantité, montant), total, part de chaque organisme, part du client, payé par le client, écarts,
 *    reste ou à rendre, net à payer ;
 *  - image 58 et 80 mm (ticket/modifiee/{id}/image) : même modèle et même nombre de tickets que l'aperçu, PNG de 384
 *    et 576 points ;
 *  - écran : recherche de la vente modifiée, clic sur l'icône « ticket vente modifiée » -> appel de
 *    vente/ticket/modifiee (ancien code : réimpression), délai clic -> réponse sous le plafond ;
 *  - bilan : rien écrit en base par l'aperçu, l'image et l'impression.
 * Une vente non modifiée est refusée avec un message. Jeu d'essai ZZAUDIT retiré à la fin.
 * Lancement seul : node src/test/e2e/vente/test-ticket-vente-modifiee-1911.js
 */
const C = require('../audits/commun');
const vues = require('../outils/vues');
const { ok, q } = C;

const PLAFOND_MS = 4000;
const chiffres = (t) => Number(String(t || '').replace(/[^\d-]/g, '')) || 0;

function largeurPng(b64) {
  const buf = Buffer.from(b64, 'base64');
  return buf.readUInt32BE(16);
}

/* aperçu relu par section : titre -> { lignes [{designation, quantite, montant}], paires {libelle: valeur} } */
function lireSections(t) {
  const sections = [];
  let cur = null;
  const pied = {};
  for (const b of t.blocs) {
    for (const e of b.elements) {
      if (b.id === 'CORPS' && e.genre === 'TEXTE' && /^(VENTE D'ORIGINE|VENTE MODIFIÉE|DIFFÉRENCES)/.test(e.a)) {
        cur = { titre: e.a, lignes: [], paires: {} };
        sections.push(cur);
      } else if (b.id === 'CORPS' && e.genre === 'ARTICLE' && cur) {
        const m = String(e.b).match(/^(-?\d+)\s*×/);
        cur.lignes.push({ designation: e.a, quantite: m ? Number(m[1]) : null, montant: chiffres(e.d) });
      } else if (b.id === 'CORPS' && (e.genre === 'PAIRE' || e.genre === 'ENCADRE') && cur) {
        cur.paires[e.a.replace(/\s*:\s*$/, '').trim()] = e.b;
      } else if (e.genre === 'PAIRE' || e.genre === 'ENCADRE') {
        pied[e.a.replace(/\s*:\s*$/, '').trim()] = e.b;
      }
    }
  }
  return { sections, pied };
}

/* valeur signée d'une paire : « +1 500 F » -> 1500, « -300 F » -> -300 */
const signe = (v) => { const s = String(v || '').replace(/[\s  ]/g, ''); const n = chiffres(s); return s.startsWith('-') ? -Math.abs(n) : Math.abs(n); };

/* regle de l'officine (DateConverter.arrondiModuloOfNumber) : chiffre des unites modulo 5 <= 2 -> en dessous, sinon au-dessus */
const arrondi5 = (x) => { const r = (x % 10) % 5; return r <= 2 ? x - r : x - r + 5; };
const porte = (titre, b) => titre.includes(b.ref) || (!!b.refTicket && titre.includes(b.refTicket));
const cle = (o, re) => Object.keys(o).find((c) => re.test(c));
const venteBase = (id) => {
  const r = q("SELECT CONCAT_WS('|', str_REF, int_PRICE, int_PRICE_REMISE, int_CUST_PART, str_REF_TICKET) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'").split('|');
  const lignes = q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('#', f.str_NAME, d.int_QUANTITY, d.int_PRICE) ORDER BY f.str_NAME SEPARATOR '~'), '') FROM t_preenregistrement_detail d"
    + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_PREENREGISTREMENT_ID = '" + id + "'").split('~').filter(Boolean)
    .map((l) => { const [n, qt, m] = l.split('#'); return { designation: n, quantite: Math.abs(Number(qt)), montant: Math.abs(Number(m)) }; });
  const parts = {};
  q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', tp.str_NAME, t.int_PERCENT, t.int_PRICE) SEPARATOR ';'), '') FROM t_preenregistrement_compte_client_tiers_payent t"
    + " JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
    + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = l.lg_TIERS_PAYANT_ID WHERE t.lg_PREENREGISTREMENT_ID = '" + id + "'").split(';').filter(Boolean)
    .forEach((l) => { const [n, tx, m] = l.split('/'); parts[n] = { taux: Number(tx), part: Math.abs(Number(m)) }; });
  const mvt = q("SELECT CONCAT_WS('|', IFNULL(montantPaye, 0), IFNULL(montantVerse, 0)) FROM mvttransaction WHERE pkey = '" + id + "' LIMIT 1").split('|');
  /* le ticket montre la reference de la vente (str_REF) ou le numero de ticket (str_REF_TICKET) selon le reglage de
     l'officine, comme les autres tickets ; part du client arrondie a 5 comme sur le ticket de la vente (ce que le client
     paie) */
  return { ref: r[0], refTicket: r[4], total: Math.abs(Number(r[1])), remise: Math.abs(Number(r[2])), partClientBase: Math.abs(Number(r[3])),
    partClient: arrondi5(Math.abs(Number(r[3]))), lignes, parts,
    paye: Math.abs(Number(mvt[0] || 0)), verse: Math.abs(Number(mvt[1] || 0)) };
};

const traces = (ids) => q("SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_preenregistrement), (SELECT COUNT(*) FROM mvttransaction), (SELECT COUNT(*) FROM notification),"
  + " (SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_PREENREGISTREMENT_ID, '@', dt_UPDATED, '@', str_STATUT, '@', b_IS_CANCEL) ORDER BY lg_PREENREGISTREMENT_ID), '-')"
  + " FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + C.liste(ids) + ")))");

(async () => {
  C.ouvrirCaisse();
  const P1 = C.produit(41, 400), P2 = C.produit(42, 400), P3 = C.produit(43, 400);
  const sess = await C.connecter();
  const { p, api } = sess;
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  try {
    const va = C.venteAssurance(api);
    /* modification par l'API de l'ecran de vente : ouverture (copie), changement, cloture de la copie */
    const modifier = async (cl, tps, v, changer) => {
      await api('PUT', '../api/v1/vente/modifier-vente-terme/' + v);
      const copie = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_PARENT_ID = '" + v + "' AND copy = 1 AND str_STATUT = 'is_Process' LIMIT 1");
      if (copie) { C.etat.ventes.push(copie); }
      await changer(copie);
      const c = await va.cloturer(cl, copie, tps);
      return { copie, c };
    };

    const cas = [];
    /* A : deux organismes, une ligne ajoutee */
    const TPA = C.tiersPayant('TVMA', '1'), TPB = C.tiersPayant('TVMB', '1');
    const clA = await C.clientAssure(api, 'TVMA', [{ tp: TPA, taux: 70 }, { tp: TPB, taux: 20 }]);
    const tpsA = [{ lien: clA.lien(TPA), taux: 70, bon: 'TVM-A1' }, { lien: clA.lien(TPB), taux: 20, bon: 'TVM-A2' }];
    const VA = await va.ajouter(clA, tpsA, P1, 2);
    await va.ajouter(clA, tpsA, P2, 1, VA);
    const cA = await va.cloturer(clA, VA, tpsA);
    const mA = await modifier(clA, tpsA, VA, (copie) => va.ajouter(clA, tpsA, P3, 3, copie));
    ok('A. jeu d\'essai : vente à deux organismes modifiée (ligne ajoutée)', cA.success && mA.c.success && !!mA.copie,
      JSON.stringify({ v: cA.success, m: mA.c.success, msg: mA.c.msg }).slice(0, 200));
    cas.push({ nom: 'A', origine: VA, copie: mA.copie, attendu: 'reste' });

    /* B : un organisme, une ligne retiree */
    const TPC = C.tiersPayant('TVMC', '1');
    const clB = await C.clientAssure(api, 'TVMB', [{ tp: TPC, taux: 60 }]);
    const tpsB = [{ lien: clB.lien(TPC), taux: 60, bon: 'TVM-B1' }];
    const VB = await va.ajouter(clB, tpsB, P1, 1);
    await va.ajouter(clB, tpsB, P2, 2, VB);
    const cB = await va.cloturer(clB, VB, tpsB);
    const mB = await modifier(clB, tpsB, VB, async (copie) => {
      const ligne = q("SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + copie + "' AND lg_FAMILLE_ID = '" + P2.id + "'");
      return api('POST', '../api/v1/vente/remove/vno/item/' + ligne);
    });
    ok('B. jeu d\'essai : vente à un organisme modifiée (ligne retirée)', cB.success && mB.c.success && !!mB.copie,
      JSON.stringify({ v: cB.success, m: mB.c.success, msg: mB.c.msg }).slice(0, 200));
    cas.push({ nom: 'B', origine: VB, copie: mB.copie, attendu: 'rendre' });

    for (const k of cas) {
      const o = venteBase(k.origine), m = venteBase(k.copie);
      k.ref = m.ref;
      k.jour = q("SELECT DATE_FORMAT(dt_UPDATED, '%d/%m/%Y') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + k.copie + "'");
      const avant = traces([k.origine, k.copie]);
      const ap = await api('GET', '../api/v1/vente/ticket/modifiee/' + k.copie + '/apercu');
      const t = (ap.tickets || [])[0];
      ok(k.nom + '. aperçu : un ticket', ap.success === true && (ap.tickets || []).length === 1, JSON.stringify(ap).slice(0, 200));
      if (!t) { continue; }
      const { sections, pied } = lireSections(t);
      const [so, sm, sd] = sections;
      ok(k.nom + '. trois sections : origine (réf. ' + o.ref + '), modifiée (réf. ' + m.ref + '), différences', sections.length === 3
        && porte(so.titre, o) && /^VENTE D'ORIGINE/.test(so.titre) && porte(sm.titre, m) && /^VENTE MODIFIÉE/.test(sm.titre) && /^DIFFÉRENCES/.test(sd.titre),
        sections.map((s) => s.titre).join(' / '));
      /* rapprochement ligne par ligne avec la base */
      for (const [nom, s, b] of [['origine', so, o], ['modifiée', sm, m]]) {
        const lignesTicket = s.lignes.map((l) => l.quantite + '/' + l.montant).sort().join(';');
        const lignesBase = b.lignes.map((l) => l.quantite + '/' + l.montant).sort().join(';');
        ok(k.nom + '. vente ' + nom + ' : lignes du ticket = lignes en base (quantité, montant)', lignesTicket === lignesBase && s.lignes.length > 0,
          lignesTicket + ' / ' + lignesBase);
        ok(k.nom + '. vente ' + nom + ' : total = base', chiffres(s.paires.Total) === b.total, s.paires.Total + ' / ' + b.total);
        ok(k.nom + '. vente ' + nom + ' : part du client = base arrondie à 5', chiffres(s.paires['Part du client']) === b.partClient,
          s.paires['Part du client'] + ' / ' + b.partClientBase + ' -> ' + b.partClient);
        for (const [n, x] of Object.entries(b.parts)) {
          const cle = Object.keys(s.paires).find((c) => c.startsWith(n + ' ['));
          ok(k.nom + '. vente ' + nom + ' : part ' + n + ' (' + x.taux + ' %) = base', !!cle && chiffres(s.paires[cle]) === x.part && cle.includes(x.taux + '%'),
            (cle || 'absente') + ' ' + (cle ? s.paires[cle] : '') + ' / ' + x.part);
        }
        ok(k.nom + '. vente ' + nom + ' : cohérence total = parts + client + remise', b.total === Object.values(b.parts).reduce((a, x) => a + x.part, 0) + b.partClientBase + b.remise, JSON.stringify(b).slice(0, 200));
      }
      ok(k.nom + '. payé par le client (origine) = mouvement de caisse de la vente d\'origine', chiffres(so.paires['Payé par le client']) === o.paye,
        so.paires['Payé par le client'] + ' / ' + o.paye);
      /* differences = valeurs de la base */
      ok(k.nom + '. écart du total = total modifié - total d\'origine', signe(sd.paires['Écart du total']) === m.total - o.total, sd.paires['Écart du total'] + ' / ' + (m.total - o.total));
      const noms = new Set([...Object.keys(o.parts), ...Object.keys(m.parts)]);
      for (const n of noms) {
        const e = (m.parts[n] ? m.parts[n].part : 0) - (o.parts[n] ? o.parts[n].part : 0);
        ok(k.nom + '. écart part ' + n + ' = ' + e, signe(sd.paires['Écart part ' + n]) === e, sd.paires['Écart part ' + n]);
      }
      ok(k.nom + '. écart part du client', signe(sd.paires['Écart part du client']) === m.partClient - o.partClient,
        sd.paires['Écart part du client'] + ' / ' + (m.partClient - o.partClient));
      ok(k.nom + '. déjà payé = payé à l\'origine', chiffres(sd.paires['Déjà payé par le client']) === o.paye, sd.paires['Déjà payé par le client']);
      const solde = m.partClient - o.paye;
      if (k.attendu === 'reste') {
        ok(k.nom + '. reste à payer = part client modifiée - déjà payé (> 0)', solde > 0 && chiffres(sd.paires['Reste à payer']) === solde
          && !sd.paires['À rendre au client'], JSON.stringify(sd.paires) + ' solde ' + solde);
      } else {
        ok(k.nom + '. à rendre = déjà payé - part client modifiée (> 0)', solde < 0 && chiffres(sd.paires['À rendre au client']) === -solde
          && !sd.paires['Reste à payer'], JSON.stringify(sd.paires) + ' solde ' + solde);
      }
      const net = cle(pied, /net à payer/i), verse = cle(pied, /vers/i), monnaie = cle(pied, /monnaie/i);
      ok(k.nom + '. pied : net à payer = reste à payer', !!net && chiffres(pied[net]) === Math.max(0, solde), JSON.stringify(pied).slice(0, 200));
      ok(k.nom + '. pied : montant versé = mouvement de la modification', !!verse && chiffres(pied[verse]) === m.verse, pied[verse] + ' / ' + m.verse);
      ok(k.nom + '. pied : monnaie = versé - payé à la modification (jamais négative)', !!monnaie && chiffres(pied[monnaie]) === Math.max(0, m.verse - m.paye),
        pied[monnaie] + ' / ' + m.verse + ' - ' + m.paye);

      /* image 58 et 80 mm : meme ticket que l'apercu */
      for (const [largeur, points] of [[58, 384], [80, 576]]) {
        const im = await api('GET', '../api/v1/vente/ticket/modifiee/' + k.copie + '/image?largeur=' + largeur + '&dpi=203');
        const ti = (im.tickets || [])[0];
        ok(k.nom + '. image ' + largeur + ' mm : même modèle que l\'aperçu, PNG de ' + points + ' points', im.success === true && (im.tickets || []).length === 1
          && ti.modele === t.modele && largeurPng(ti.png) === points && ti.hauteurPoints > 300, JSON.stringify(Object.assign({}, im, { tickets: (im.tickets || []).map((x) => x.modele + ' ' + x.largeurPoints + 'x' + x.hauteurPoints) })).slice(0, 200));
      }
      ok(k.nom + '. bilan : aperçu et image n\'écrivent rien en base', traces([k.origine, k.copie]) === avant, avant + ' -> ' + traces([k.origine, k.copie]));
    }

    /* vente non modifiee : refus avec message, rien imprime */
    const refus = await api('POST', '../api/v1/vente/ticket/modifiee/' + VA);
    ok('Vente non modifiée : refus avec message', refus.success === false && /pas une vente modifiée/.test(refus.msg || ''), JSON.stringify(refus).slice(0, 200));

    /* ecran : « Ventes terminées », icone « ticket vente modifiée » de la ligne de la vente modifiee */
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0];
      return n && n.getStore().getRootNode().childNodes.length > 0 && !n.getStore().isLoading(); }, null, { timeout: 120000 });
    await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventemanager #query').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    /* comme l'utilisateur : la souris quitte le menu flottant, qui se replie (sinon il couvre les dates) */
    await p.mouse.move(1200, 700);
    await p.locator('.prestige-nav .x-grid-row').filter({ visible: true }).first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    const delais = [];
    for (const k of cas) {
      const avant = traces([k.origine, k.copie]);
      await vues.saisir(p, 'ventemanager #dtStart', k.jour);
      await vues.saisir(p, 'ventemanager #dtEnd', k.jour);
      await vues.saisir(p, 'ventemanager #query', k.ref);
      await vues.cliquer(p, 'ventemanager #rechercher');
      const icone = 'img[data-qtip="ticket vente modifiée"]';
      const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: k.ref }).filter({ has: p.locator(icone + ':visible') }).first();
      await ligne.waitFor({ timeout: 60000 });
      await p.waitForTimeout(800);
      const reponse = p.waitForResponse((r) => r.url().includes('/vente/ticket/modifiee/' + k.copie) && r.request().method() === 'POST', { timeout: 20000 })
        .catch(() => null);
      const debut = Date.now();
      await ligne.locator(icone).click();
      const r = await reponse;
      const delai = Date.now() - debut;
      const corps = r ? await r.json().catch(() => ({})) : null;
      ok(k.nom + '. écran : l\'icône « ticket vente modifiée » demande le ticket de la modification', !!r && r.status() === 200,
        r ? r.status() + ' ' + JSON.stringify(corps).slice(0, 160) : 'aucun appel de vente/ticket/modifiee (ancien code : réimpression du ticket)');
      /* sans imprimante sur le poste d'essai : refus explicite ; avec : succes */
      ok(k.nom + '. écran : réponse imprimée ou imprimante absente signalée', !!corps && (corps.success === true || (corps.success === false && !!corps.msg)),
        JSON.stringify(corps).slice(0, 160));
      ok(k.nom + '. délai clic -> réponse ≤ ' + PLAFOND_MS + ' ms', !!r && delai <= PLAFOND_MS, delai + ' ms');
      delais.push(delai);
      await p.waitForTimeout(800);
      if (await vues.texteMessage(p)) { await vues.repondre(p, 'ok').catch(() => {}); }
      ok(k.nom + '. bilan : l\'impression n\'écrit rien en base', traces([k.origine, k.copie]) === avant, avant + ' -> ' + traces([k.origine, k.copie]));
    }
    console.log('MESURE délais clic -> réponse (ms) : ' + delais.join(', '));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
    if (process.env.E2E_ECHEC_PNG) { await p.screenshot({ path: process.env.E2E_ECHEC_PNG }).catch(() => {}); }
  } finally {
    await sess.b.close().catch(() => {});
    C.nettoyer();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
