/* DEMANDE 66 (applications mobiles, 20/11) : taux des organismes jamais au-dela de 100 % au total, sur TOUS les tickets.
 *
 * Client a deux organismes : principal 80 %, complementaire 30 %. Le complementaire doit s'imprimer a 20 % ; les parts
 * (montants), les taux enregistres et les reponses JSON ne changent pas.
 *
 * Jeu d'essai (marque ZZAUDIT, retire a la fin) :
 *  - A : par le vrai chemin de l'ecran de vente : vente assurance, client, deux bons, deux articles (quantite 2 en
 *    assurance, un article coche « C ») -> vente assurance liee a une vente comptant (ticket client combine) ;
 *  - B : vente assurance seule, memes organismes (non-regression du ticket de vente, deja juste) ;
 *  - C : prevente assurance, memes organismes.
 * Controles :
 *  - base : taux enregistres 80 et 30, parts inchangees (avant / apres lecture des tickets) ;
 *  - ticket de vente (B, et la partie assurance de A) : « [80%] » et « [20%] » ;
 *  - ticket client combine (A) : « ... 80 % » et « ... 20 % », parts = parts en base ;
 *  - ticket de prevente (C) : « Assurance 80% » et « Assurance 20% », part assurance = somme des parts en base ;
 *  - image (58 et 80 mm) : texte des documents dessines (image/texte) = memes taux, memes modeles que l'image PNG ;
 *  - web : reimpression de la vente assurance (apercu du poste, meme construction) = memes taux que l'image ;
 *  - sur chaque ticket, total des taux imprimes <= 100 % ;
 *  - sans session : image/texte -> 401 ;
 *  - bilan : lire les tickets n'ecrit rien (ventes, lignes, parts, mouvements).
 * Lancement seul : node src/test/e2e/mobile/test-demande66-2011.js
 */
const C = require('../ligne-comptant/commun');
const { ok, q, A } = C;

const TP80 = A.tiersPayant('D66P', '1');
const TP30 = A.tiersPayant('D66C', '1');
const NOMS = [TP80, TP30];

/* textes d'un apercu ({ tickets: [{ modele, blocs: [{ elements: [{a,b,c,d}] }] }] }) */
const textes = (t) => t.blocs.flatMap((b) => b.elements.flatMap((e) => [e.a, e.b, e.c, e.d])).filter((x) => x);
const echapper = (s) => s.replace(/[-.]/g, '\\$&');
/* taux imprimes de chaque organisme sur un ticket : « NOM [80%] », « NOM 80 % », « Assurance 80% » + « NOM » */
function tauxImprimes(t) {
  const tx = textes(t);
  const res = {};
  for (const nom of NOMS) {
    const n = echapper(nom);
    for (let i = 0; i < tx.length; i++) {
      const m = tx[i].match(new RegExp(n + '\\s*\\[(\\d+)\\s*%\\]')) || tx[i].match(new RegExp(n + '\\s+(\\d+)\\s*%'));
      if (m) { res[nom] = Number(m[1]); break; }
      /* prevente : « Assurance 80% » ; le nom de l'organisme dans la valeur de la meme paire */
      const pv = tx[i].match(/^(?:Assurance|Carnet)\s+(\d+)\s*%$/);
      if (pv && t.blocs.some((b) => b.elements.some((e) => e.a === tx[i] && e.b === nom))) { res[nom] = Number(pv[1]); break; }
    }
  }
  return res;
}
/* « Ajouter une Assurance complementaire » (meme parcours que prix-reference/commun.ajouterTiersPayant), en attendant
   seulement la reponse de vente/addtp : la relecture des lignes ne passe pas toujours par vente/deatails */
async function ajouterComplementaire(p, tpId) {
  await p.locator('text=/Ajouter une Assurance compl/').filter({ visible: true }).first().click();
  const COMBO = 'window[title="TIERS-PAYANTS ASSOCIES"] combobox[name=compteTp]';
  await p.waitForFunction((c) => Ext.ComponentQuery.query(c).some((x) => x.isVisible(true)), COMBO, { timeout: 15000 });
  await C.vues.cliquer(p, COMBO);
  await p.keyboard.type(tpId, { delay: 25 });
  const item = p.locator('.x-boundlist-item').filter({ visible: true, hasText: tpId }).first();
  await item.waitFor({ timeout: 20000 });
  await item.click();
  const rep = p.waitForResponse((r) => /vente\/addtp\//.test(r.url()), { timeout: 30000 });
  await p.locator('.x-window').filter({ visible: true, hasText: 'TIERS-PAYANTS ASSOCIES' }).getByText('Valider', { exact: true }).click();
  const r = await rep;
  await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu #refBon2').some((x) => x.isVisible(true)), null, { timeout: 30000 });
  await p.waitForTimeout(1000);
  return r.status();
}
const somme = (o) => Object.values(o).reduce((s, v) => s + v, 0);
const parts = (v) => q("SELECT GROUP_CONCAT(CONCAT_WS('/', l.lg_TIERS_PAYANT_ID, t.int_PERCENT, t.int_PRICE) ORDER BY l.lg_TIERS_PAYANT_ID SEPARATOR ';')"
  + " FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
  + " WHERE t.lg_PREENREGISTREMENT_ID = '" + v + "'");
const partDe = (v, tp) => Number(q("SELECT t.int_PRICE FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_compte_client_tiers_payant l"
  + " ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID WHERE t.lg_PREENREGISTREMENT_ID = '" + v + "' AND l.lg_TIERS_PAYANT_ID = '" + tp + "'"));
const traces = (ids) => q("SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_preenregistrement), (SELECT COUNT(*) FROM t_preenregistrement_detail),"
  + " (SELECT COUNT(*) FROM mvttransaction), (SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent),"
  + " (SELECT GROUP_CONCAT(CONCAT(lg_PREENREGISTREMENT_ID, '@', dt_UPDATED, '@', str_STATUT, '@', int_PRICE) ORDER BY lg_PREENREGISTREMENT_ID)"
  + " FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + A.liste(ids) + ")))");

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  A.parametre('KEY_PRIX_REF_CAISSE', '0');
  const PA = [C.produitSimple(16), C.produitSimple(17)];
  const PB = C.produitSimple(18);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  const get = (url) => p.evaluate(async (u) => { const r = await fetch(u); const t = await r.text(); try { return Object.assign({ http: r.status }, JSON.parse(t)); } catch (e) { return { http: r.status, texte: t }; } }, url);
  try {
    const cl = await A.clientAssure(api, 'D66', [{ tp: TP80, taux: 80 }, { tp: TP30, taux: 30 }]);

    /* ---- A : vente liee, par l'ecran ---- */
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' D66');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-D66-1');
    const CIP = PA.map(C.cip);
    await C.taperArticle(p, CIP[0]);
    const vA = await C.venteCourante(p);
    C.noterVente(vA);
    /* le complementaire s'ajoute par « Ajouter une Assurance complementaire », puis son numero de bon */
    await ajouterComplementaire(p, TP30);
    await C.saisirBon(p, 2, C.MARQUE + '-BON-D66-2');
    await C.taperArticle(p, CIP[1]);
    await C.cocher(p, CIP[1]);
    await p.evaluate(() => testextjs.app.getController('VenteCtr').autoComputeNetAssurance());
    await p.waitForResponse((x) => /\/vente\/net\/assurance/.test(x.url()), { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1200);
    const rail = await C.rail(p);
    const clot = await C.terminerVente(p, false, { verse: (Math.floor(rail.net.valeur / 1000) + 1) * 1000 });
    const vnoA = clot.venteLiee;
    C.noterVente(vnoA);
    ok('Jeu d\'essai A : vente assurance à deux organismes (80 % + 30 %) liée à une vente comptant, par l\'écran',
      clot.success === true && !!vnoA && parts(vA).split(';').length === 2, JSON.stringify({ succes: clot.success, liee: vnoA, parts: parts(vA) }));

    /* ---- B : vente assurance seule ; C : prevente assurance ---- */
    const va = A.venteAssurance(api);
    const tps = [{ lien: cl.lien(TP80), taux: 80, bon: 'B66-1' }, { lien: cl.lien(TP30), taux: 30, bon: 'B66-2' }];
    const { v: vB } = await va.vendre(cl, tps, PB, 3);
    const rp = await api('POST', '../api/v1/vente/add/assurance', { typeVenteId: '2', natureVenteId: '1', produitId: PB.id, itemPu: PB.pu, qte: 2, qteServie: 2,
      devis: false, remiseId: null, venteId: null, userVendeurId: A.ADMIN, tierspayants: va.params(tps), clientId: cl.clientId, ayantDroitId: cl.ayantDroitId, prevente: true });
    const vC = rp.data && rp.data.lgPREENREGISTREMENTID;
    if (vC) { A.etat.ventes.push(vC); await va.net(vC, tps); await api('PUT', '../api/v1/vente/terminerprevente/' + vC); }
    ok('Jeu d\'essai B et C : vente assurance seule et prévente assurance, 80 % + 30 % en base',
      parts(vB).split(';').length === 2 && !!vC && parts(vC).split(';').length === 2, parts(vB) + ' | ' + (vC && parts(vC)));

    const ventes = [vA, vnoA, vB, vC];
    const avant = traces(ventes);
    const partsAvant = ventes.map((v) => v && parts(v)).join(' | ');
    ok('Base : taux enregistrés = taux des contrats (80 et 30), jamais bornés',
      [vA, vB, vC].every((v) => parts(v).split(';').map((x) => x.split('/')[1]).sort().join(',') === '30,80'), [vA, vB, vC].map(parts).join(' | '));

    const verifierTicket = (nom, t, attendus, partsBase) => {
      const tx = tauxImprimes(t);
      const okTaux = NOMS.every((n) => tx[n] === attendus[n]) && somme(tx) <= 100;
      const okParts = !partsBase || NOMS.every((n) => textes(t).some((s) => C.chiffres(s) === partsBase[n]));
      ok(nom + ' : principal ' + attendus[TP80] + ' %, complémentaire ' + attendus[TP30] + ' %, total ≤ 100 %' + (partsBase ? ', parts = base' : ''),
        okTaux && okParts, JSON.stringify(tx) + (partsBase ? ' parts ' + JSON.stringify(partsBase) : ''));
    };
    const ATT = { [TP80]: 80, [TP30]: 20 };

    /* ---- web : reimpression (apercu du poste, meme construction que l'impression) ---- */
    const webA = await C.apercu(p, vA, false);
    const tA = (webA.tickets || []);
    const assurA = tA.find((t) => t.modele !== 'VENTE_MIXTE');
    const combA = tA.find((t) => t.modele === 'VENTE_MIXTE');
    ok('Web A : réimpression de la vente liée = ticket de vente puis ticket client combiné', !!assurA && !!combA, tA.map((t) => t.modele).join(','));
    const partsA = { [TP80]: partDe(vA, TP80), [TP30]: partDe(vA, TP30) };
    if (assurA) { verifierTicket('Web A, ticket de vente (bloc client)', assurA, ATT); }
    if (combA) { verifierTicket('Web A, ticket client combiné', combA, ATT, partsA); }
    const webB = await C.apercu(p, vB, false);
    const tB = (webB.tickets || [])[0];
    if (tB) { verifierTicket('Web B, ticket de vente (non-régression)', tB, ATT); }

    /* ---- image : texte des documents dessines, 58 et 80 mm, et PNG ---- */
    for (const mm of [58, 80]) {
      for (const [nom, type, id, partsBase] of [['A (vo liée)', 'vo', vA, partsA], ['B (vo)', 'vo', vB, null],
        ['C (prévente)', 'prevente', vC, null]]) {
        const tx = await get('../api/v1/vente/ticket/' + type + '/' + id + '/image/texte?largeur=' + mm);
        const img = await get('../api/v1/vente/ticket/' + type + '/' + id + '/image?largeur=' + mm);
        const modelesTx = (tx.tickets || []).map((t) => t.modele).join(',');
        const modelesImg = (img.tickets || []).map((t) => t.modele).join(',');
        ok('Image ' + mm + ' mm, ' + nom + ' : PNG dessiné, mêmes tickets que son texte', img.success === true && tx.success === true && modelesTx === modelesImg && modelesImg.length > 0,
          modelesImg + ' / ' + modelesTx);
        for (const t of tx.tickets || []) {
          if (type === 'prevente') {
            verifierTicket('Image ' + mm + ' mm, ' + nom, t, ATT);
            const valeur = t.blocs.flatMap((b) => b.elements).find((e) => /^Part assurance/.test(e.a));
            ok('Image ' + mm + ' mm, ' + nom + ' : part assurance = somme des parts en base', !!valeur && C.chiffres(valeur.b) === partDe(vC, TP80) + partDe(vC, TP30),
              (valeur && valeur.b) + ' contre ' + (partDe(vC, TP80) + partDe(vC, TP30)));
          } else {
            verifierTicket('Image ' + mm + ' mm, ' + nom + ', ' + t.modele, t, ATT, t.modele === 'VENTE_MIXTE' ? partsBase : null);
          }
        }
        if (type === 'vo' && id === vA) {
          /* rapprochement web / image : memes taux sur chaque ticket */
          const memes = (tx.tickets || []).every((t, i) => tA[i] && JSON.stringify(tauxImprimes(t)) === JSON.stringify(tauxImprimes(tA[i])));
          ok('Rapprochement ' + mm + ' mm : web (réimpression) et image impriment les mêmes taux', memes && (tx.tickets || []).length === tA.length,
            JSON.stringify((tx.tickets || []).map(tauxImprimes)) + ' / ' + JSON.stringify(tA.map(tauxImprimes)));
        }
      }
    }

    /* ---- sans session ---- */
    const p2 = await (await sess.b.newContext()).newPage();
    await p2.goto(C.vues.BASE + '/security/index.html');
    const anonyme = await p2.evaluate(async (u) => { const r = await fetch(u); return r.status; }, '../api/v1/vente/ticket/vo/' + vB + '/image/texte');
    ok('Sans session : image/texte refusé (401)', anonyme === 401, anonyme);

    ok('Bilan : lire les tickets n\'écrit rien (ventes, lignes, parts, mouvements, taux et parts enregistrés)',
      traces(ventes) === avant && ventes.map((v) => v && parts(v)).join(' | ') === partsAvant, avant + ' / ' + traces(ventes));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    await sess.b.close();
    A.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
