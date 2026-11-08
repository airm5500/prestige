/* PLAN DU 08/11, POINT 15.3 : PRISE EN CAISSE D'UNE PREVENTE ET VITESSE DES CAISSIERES.
 *
 * Le temps de la caissiere se mesure de la prise en caisse (ouverture de la prevente a l'ecran de vente) a
 * l'encaissement ; le temps de saisie de la prevente reste au vendeur. Par les vues (admin) :
 *  - SERVICE CLIENT > Ventes > Nouvelle vente, numero de la prevente tape dans « N° ticket / scan » : la prevente est
 *    chargee et sa prise en caisse enregistree (vente, caissiere, heure), une seule fois meme si elle est rechargee ;
 *  - une vente dont le vendeur est la caissiere elle-meme n'est pas une prevente : rien n'est enregistre ;
 *  - bilan : la prise en caisse ne touche ni la vente (statut, montant, lignes) ni le stock ;
 *  - ANALYSE DE GESTION > Activite des equipes > Analyses, jour du test, employe = caissiere, Actualiser : carte
 *    « Vitesse des caissieres » ; rapprochement ecran = API = calcul refait ici depuis la base (preventes encaissees,
 *    mesurees, temps moyen et median de la prise a l'encaissement, CA) ;
 *  - cas varies : deux preventes de montants differents, quantites > 1, attentes differentes, une rechargee deux fois,
 *    une vente sans prevente ; aucune erreur JavaScript ; jeu d'essai retire (ventes, prises, stock).
 */
const C = require('../audits/commun');
const { ENV_E2E, ADMIN, AUTRE_VENDEUR, ok, q, etat } = C;
const { ouvrirMenu, cliquer, saisir, texteMessage, repondre } = require('../outils/vues');

const TABLE = () => q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vente_prise_caisse'") === '1';
const prises = (ids) => (TABLE() ? q(`SELECT CONCAT(vente_id, '|', user_id, '|', pris_le) FROM vente_prise_caisse WHERE vente_id IN (${C.liste(ids)}) ORDER BY vente_id`)
  .split('\n').filter(Boolean) : null);
const empreinte = (id) => q(`SELECT CONCAT(str_STATUT, '|', int_PRICE, '|', b_IS_CANCEL, '|', (SELECT COUNT(*) FROM t_preenregistrement_detail d`
  + ` WHERE d.lg_PREENREGISTREMENT_ID = '${id}')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${id}'`);
const MAX = 3600;

/* calcul independant pour une caissiere et un jour, vente par vente */
function attendu(caissiere, jour) {
  const l = q(`SELECT p.int_PRICE, IFNULL(TIMESTAMPDIFF(SECOND, pc.pris_le, p.completion_date), 'NULL')`
    + ` FROM t_preenregistrement p LEFT JOIN vente_prise_caisse pc ON pc.vente_id = p.lg_PREENREGISTREMENT_ID AND pc.user_id = p.lg_USER_CAISSIER_ID`
    + ` WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'`
    + ` AND p.lg_USER_CAISSIER_ID = '${caissiere}' AND p.lg_USER_VENDEUR_ID IS NOT NULL AND p.lg_USER_VENDEUR_ID <> p.lg_USER_CAISSIER_ID`
    + ` AND p.completion_date >= '${jour}' AND p.completion_date < '${jour}' + INTERVAL 1 DAY`)
    .split('\n').filter(Boolean).map((x) => x.split('\t'));
  const d = l.map((x) => x[1]).filter((x) => x !== 'NULL').map(Number).filter((x) => x >= 0 && x <= MAX).sort((a, b) => a - b);
  const mediane = !d.length ? 0 : d.length % 2 ? d[(d.length - 1) / 2] : Math.round((d[d.length / 2 - 1] + d[d.length / 2]) / 2);
  return { encaissees: l.length, chiffreAffaires: l.reduce((s, x) => s + Number(x[0]), 0), mesurees: d.length,
    tempsMoyen: d.length ? Math.round(d.reduce((s, x) => s + x, 0) / d.length) : 0, tempsMedian: mediane };
}

(async () => {
  const { b, p, api, erreurs } = await C.connecter();
  const dialogues = []; p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const champ = 'doventemanager #preventeSearchField';
  const jour = q('SELECT CURDATE()');
  try {
    C.ouvrirCaisse();
    const v = C.venteComptant(api);
    const pa = C.produit(0, 40), pb = C.produit(1, 40);
    const stockAvant = [C.stock(pa), C.stock(pb)];
    /* prevente saisie par un autre vendeur, terminee (en attente de la caisse) */
    const prevente = async (lignes, vendeur) => {
      let id = null;
      for (const [prod, qte] of lignes) { id = await v.ajouter(prod, qte, id, { prevente: true, userVendeurId: vendeur }); }
      await api('PUT', '../api/v1/vente/terminerprevente/' + id);
      return { id, ref: q(`SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${id}'`) };
    };
    const nouvelleVente = async () => {
      await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
      await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
      await cliquer(p, 'cloturerventemanager #addBtn');
      await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), champ, { timeout: 60000 });
      await p.waitForTimeout(1500);
    };
    const scanner = async (ref) => {
      await nouvelleVente();
      await cliquer(p, champ);
      await p.waitForTimeout(300);
      await p.keyboard.type(ref, { delay: 10 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(3500);
      if (await texteMessage(p)) { await repondre(p, 'ok').catch(() => {}); }
      return p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').current; return c && c.lgPREENREGISTREMENTID; });
    };

    const p1 = await prevente([[pa, 2], [pb, 3]], AUTRE_VENDEUR);
    const p2 = await prevente([[pb, 1]], ADMIN);
    const p3 = await prevente([[pa, 4]], AUTRE_VENDEUR);
    const avant = [p1, p2, p3].map((x) => empreinte(x.id));
    const t0 = q('SELECT NOW() - INTERVAL 1 SECOND');

    ok('Prévente d\'un autre vendeur chargée par « N° ticket / scan »', (await scanner(p1.ref)) === p1.id, p1.ref);
    let l = prises([p1.id]);
    ok('Prise en caisse enregistrée : vente, caissière, heure du chargement', l !== null && l.length === 1 && l[0].split('|')[1] === ADMIN
      && l[0].split('|')[2] >= t0 && l[0].split('|')[2] <= q('SELECT NOW()'), JSON.stringify(l));
    const premiere = l && l[0];
    await p.waitForTimeout(1500);
    ok('Prévente rechargée : chargée de nouveau', (await scanner(p1.ref)) === p1.id);
    l = prises([p1.id]);
    ok('Rechargée : une seule prise, la première heure gardée', l !== null && l.length === 1 && l[0] === premiere, JSON.stringify(l));
    ok('Vente dont le vendeur est la caissière : chargée, aucune prise enregistrée', (await scanner(p2.ref)) === p2.id && (prises([p2.id]) || ['x']).length === 0,
      JSON.stringify(prises([p2.id])));
    await scanner(p3.ref);
    ok('Bilan : la prise en caisse ne change ni la vente (statut, montant, annulation, lignes) ni le stock',
      JSON.stringify([p1, p2, p3].map((x) => empreinte(x.id))) === JSON.stringify(avant) && C.stock(pa) === stockAvant[0] && C.stock(pb) === stockAvant[1],
      JSON.stringify({ avant, apres: [p1, p2, p3].map((x) => empreinte(x.id)) }));

    /* encaissement : p1 apres 3 s, p3 apres 7 s (attentes differentes) */
    await p.waitForTimeout(3000);
    const c1 = await v.cloturer(p1.id, { vendeur: AUTRE_VENDEUR });
    await p.waitForTimeout(4000);
    const c3 = await v.cloturer(p3.id, { vendeur: AUTRE_VENDEUR });
    ok('Précondition : deux préventes encaissées par la caissière', c1.success && c3.success
      && q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('${p1.id}', '${p3.id}') AND str_STATUT = 'is_Closed' AND lg_USER_CAISSIER_ID = '${ADMIN}'`) === '2',
    JSON.stringify([c1.success, c1.msg, c3.success, c3.msg]));
    const base = attendu(ADMIN, jour);
    const durees = q(`SELECT TIMESTAMPDIFF(SECOND, pc.pris_le, p.completion_date) FROM vente_prise_caisse pc JOIN t_preenregistrement p`
      + ` ON p.lg_PREENREGISTREMENT_ID = pc.vente_id WHERE pc.vente_id IN ('${p1.id}', '${p3.id}') ORDER BY 1`).split('\n').map(Number);
    ok('Durées mesurées : de la prise à l\'encaissement, plausibles', durees.length === 2 && durees.every((d) => d >= 3 && d < 600), JSON.stringify(durees));

    /* carte de l'activite des equipes */
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    const j = jour.split('-').reverse().join('/');
    await saisir(p, 'activiteequipes #aeDebut', j);
    await saisir(p, 'activiteequipes #aeFin', j);
    await cliquer(p, 'activiteequipes button[itemId=ae-analyses]');
    await p.waitForTimeout(3000);
    await p.evaluate((id) => { Ext.ComponentQuery.query('activiteequipes #aeEmploye')[0].setValue(id); }, ADMIN);
    const [rep] = await Promise.all([p.waitForResponse((r) => /activite-equipes\/analyses/.test(r.url()), { timeout: 180000 }), cliquer(p, 'activiteequipes #aeActualiser')]);
    const apiL = ((await rep.json()).data || {}).vitesseCaissieres || [];
    await p.waitForFunction(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses; return a.rendered && !(a.loadMask && a.loadMask.isVisible()); },
      null, { timeout: 180000 });
    await p.waitForTimeout(1500);
    const e = await p.evaluate(() => { const a = Ext.ComponentQuery.query('activiteequipes')[0].analyses, c = a.down('#cCaissieres'), t = document.querySelector('table.ae-caiss');
      const lire = (tr) => Array.from(tr.children).map((x) => ({ t: x.innerText.trim(), s: x.getAttribute('data-secondes') }));
      return { present: !!c && c.isVisible(true), titre: c ? c.title : '', aide: c ? c.query('tool[type=help]').length : 0,
        entete: t ? lire(t.tHead.rows[0]).map((x) => x.t) : [], lignes: t ? Array.from(t.tBodies[0].rows).map((tr) => ({ id: tr.getAttribute('data-id'), c: lire(tr) })) : [] }; });
    ok('Carte « Vitesse des caissières », avec son aide « ? » et ses colonnes', e.present && e.titre === 'Vitesse des caissières' && e.aide === 1
      && e.entete.join('|') === 'Caissière|Préventes encaissées|Mesurées|Temps moyen|Temps médian|CA', JSON.stringify(e).slice(0, 300));
    const a = apiL.find((x) => x.id === ADMIN) || {};
    ok('Rapprochement API = base (encaissées, mesurées, temps moyen, temps médian, CA)',
      [a.encaissees, a.mesurees, a.tempsMoyen, a.tempsMedian, a.chiffreAffaires].join('|')
      === [base.encaissees, base.mesurees, base.tempsMoyen, base.tempsMedian, base.chiffreAffaires].join('|'), JSON.stringify({ api: a, base }));
    const ligne = e.lignes.find((x) => x.id === ADMIN);
    const nombre = (s) => Number(String(s).replace(/[^\d]/g, ''));
    ok('Rapprochement écran = API, ligne de la caissière', !!ligne && nombre(ligne.c[1].t) === a.encaissees && nombre(ligne.c[2].t) === a.mesurees
      && Number(ligne.c[3].s) === a.tempsMoyen && Number(ligne.c[4].s) === a.tempsMedian && nombre(ligne.c[5].t) === a.chiffreAffaires
      && /\d/.test(ligne.c[3].t), JSON.stringify(ligne));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    const ids = C.ventesDuTest();
    if (TABLE()) { C.exec(`DELETE FROM vente_prise_caisse WHERE vente_id IN (${C.liste(ids)})`); }
    C.nettoyer();
    ok('Prises en caisse d\'essai retirées', !TABLE() || q(`SELECT COUNT(*) FROM vente_prise_caisse WHERE vente_id IN (${C.liste(ids)})`) === '0');
    await b.close();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
