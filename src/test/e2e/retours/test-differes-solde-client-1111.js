/* PLAN DU 10/11, POINT 4 : GESTION DES DIFFERES, ONGLET « SOLDE » GROUPE PAR CLIENT, AVEC UN VOLET DE DETAIL.
 *
 * Attendu :
 *  - a l'ouverture de l'onglet, rien n'est charge (aucune demande du releve) ; periode proposee du 01/01/2015 a ce jour ;
 *  - « Rechercher » : le releve est groupe par client, une ligne CLIENT (solde au debut, debit, credit, solde a la fin)
 *    suivie des seules operations de ce client et de ses soldes de fin de mois ; clients dans l'ordre des noms ;
 *  - debits en rouge, credits en vert ; releve et volet de detail cote a cote (3/5 et 2/5 de la largeur) ;
 *  - clic sur une vente : ses produits dans le volet de droite ; clic sur un reglement : son detail (montant, mode,
 *    ventes reglees) ; clic sur une annulation : la vente annulee ; clic sur un client : son resume ;
 *  - impression PDF et export Excel groupes par client, dans le meme ordre que l'ecran.
 *
 * Jeu d'essai (retire a la fin par C.nettoyer) : deux clients « Alpha ZZAUDIT SGA » et « Beta ZZAUDIT SGB » ;
 *  Alpha : vente A1 (1 produit, quantite 1) et vente A2 (deux produits, quantites 3 et 2), mises en differe sans
 *          acompte, puis un reglement partiel (especes) qui solde A1 et entame A2 ;
 *  Beta  : vente B1 (quantite 2) et vente B2 (quantite 1), B2 annulee ensuite.
 * Les ventes passent par l'API de l'ecran de vente (C.venteComptant), le reglement par l'API de « Faire un réglement »
 * (le parcours de reglement par l'ecran est teste par test-recu-differe-numero-1111) ; l'onglet SOLDE est utilise par de
 * vrais clics (menu, onglet, dates tapees, liste des clients, bouton, lignes, boutons d'edition).
 *
 * Rapprochement (ecran, volet, base, PDF, Excel), coherence (somme des lignes CLIENT = totaux du releve ; solde au debut
 * global = somme des soldes au debut des clients, aussi sur les donnees du poste) et bilan (consulter et editer
 * n'ecrit rien en base).
 *
 * Ancien code : pas de ligne CLIENT, pas de volet de detail, releve charge a l'ouverture : les controles echouent.
 * Lancement seul (jamais en meme temps qu'un autre test d'ecran) : node src/test/e2e/retours/test-differes-solde-client-1111.js
 */
const C = require('../audits/commun');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const { q, exec, MARQUE } = C;

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); C.ok(n, c, d); }
const SORTIE = process.env.SORTIE || C.ENV_E2E.TMP;
const chiffres = (t) => Number(String(t || '').replace(/[^\d-]/g, '')) || 0;
const CLIENTS = { A: { id: MARQUE + '-CL-SGA', prenom: 'Alpha', nom: MARQUE + ' SGA' }, B: { id: MARQUE + '-CL-SGB', prenom: 'Beta', nom: MARQUE + ' SGB' } };
Object.values(CLIENTS).forEach((c) => { c.complet = c.prenom + ' ' + c.nom; });
const ROUGE = 'rgb(198, 40, 40)', VERT = 'rgb(46, 125, 50)';

/* traces en base que la consultation ne doit pas toucher */
const traces = () => q("SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_preenregistrement), (SELECT COUNT(*) FROM t_preenregistrement_compte_client),"
  + " (SELECT COUNT(*) FROM t_dossier_reglement), (SELECT COUNT(*) FROM t_dossier_reglement_detail), (SELECT COUNT(*) FROM mvttransaction),"
  + " (SELECT COUNT(*) FROM t_mvt_caisse), (SELECT COUNT(*) FROM t_reglement), (SELECT COALESCE(SUM(int_PRICE_RESTE), 0) FROM t_preenregistrement_compte_client))");

(async () => {
  let sess = null;
  try {
    /* ---------------------------------------------------------------- mise en place */
    C.ouvrirCaisse();
    const P1 = C.produit(0, 500), P2 = C.produit(1, 500);
    for (const c of Object.values(CLIENTS)) {
      exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED) VALUES ('" + c.id + "', '" + c.prenom + "', '" + c.nom + "', 'enable', NOW());"
        + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('" + c.id + "-cpt', '" + c.id + "', 'enable', NOW())");
    }
    sess = await C.connecter();
    const { p, api } = sess;
    const V = C.venteComptant(api);
    const differe = async (lignes, client) => {
      let id = null;
      for (const [P, qte] of lignes) { id = await V.ajouter(P, qte, id); }
      const r = await V.cloturer(id, { mode: '4', clientId: client, recu: 0 });
      if (!r.success) { throw new Error('vente différée non clôturée : ' + JSON.stringify(r).slice(0, 200)); }
      return id;
    };
    const ventes = {
      A1: await differe([[P1, 1]], CLIENTS.A.id),
      A2: await differe([[P1, 3], [P2, 2]], CLIENTS.A.id),
      B1: await differe([[P2, 2]], CLIENTS.B.id),
      B2: await differe([[P1, 1]], CLIENTS.B.id),
    };
    const dette = (v) => { const r = q("SELECT CONCAT_WS('|', tp.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, tp.int_PRICE, tp.int_PRICE_RESTE, p.str_REF, p.int_PRICE)"
      + " FROM t_preenregistrement_compte_client tp JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID"
      + " WHERE tp.lg_PREENREGISTREMENT_ID = '" + v + "' LIMIT 1").split('|');
    return { id: r[0], du: Number(r[1]), reste: Number(r[2]), ref: r[3], prix: Number(r[4]) }; };
    const D0 = {}; Object.keys(ventes).forEach((k) => { D0[k] = dette(ventes[k]); });
    ok('Mise en place : quatre ventes différées sans acompte, montants différents, dette = montant de la vente',
      Object.values(D0).every((d) => d.du > 0 && d.du === d.reste && d.du === d.prix) && new Set(Object.values(D0).map((d) => d.du)).size >= 3,
      Object.keys(D0).map((k) => k + ' ' + D0[k].du).join(', '));
    /* reglement partiel d'Alpha : solde A1 et entame A2 */
    const montantRegle = D0.A1.du + Math.max(5, 5 * Math.floor(D0.A2.du / 15));
    const reg = await api('POST', '../api/v1/reglement/reglementdiffere', { montantRecu: montantRegle, montantRemis: 0, montantPaye: montantRegle, clientId: CLIENTS.A.id,
      typeRegleId: '1', nom: '', banque: '', lieux: '', totalRecap: D0.A1.du + D0.A2.du, natureVenteId: q('SELECT CURDATE()'),
      commentaire: JSON.stringify([D0.A1.id, D0.A2.id]), restesAttendus: JSON.stringify({ [D0.A1.id]: D0.A1.du, [D0.A2.id]: D0.A2.du }) });
    const dossier = String(reg.ref || '');
    ok('Mise en place : règlement partiel d\'Alpha (' + montantRegle + ') accepté, un dossier', reg.success === true && dossier !== '', JSON.stringify(reg).slice(0, 200));
    const ann = await api('GET', '../api/v1/vente/annulation/' + ventes.B2);
    ok('Mise en place : vente B2 de Beta annulée', ann.success === true && q("SELECT b_IS_CANCEL FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + ventes.B2 + "'") === '1', JSON.stringify(ann).slice(0, 200));
    const D1 = {}; Object.keys(ventes).forEach((k) => { D1[k] = dette(ventes[k]); });
    /* attendu, lu en base : par client, debit = dettes nees dans la periode, credit = reglements + annulations, solde = restes dus */
    const regleBase = Number(q("SELECT ROUND(dbl_AMOUNT) FROM t_dossier_reglement WHERE lg_DOSSIER_REGLEMENT_ID = '" + dossier + "'"));
    const attendu = {
      A: { debit: D0.A1.du + D0.A2.du, credit: regleBase, solde: D1.A1.reste + D1.A2.reste },
      B: { debit: D0.B1.du + D0.B2.du, credit: D0.B2.du, solde: D1.B1.reste },
    };
    ok('Base : le règlement solde A1 et entame A2 (reste A2 = dû − part), restes jamais négatifs',
      D1.A1.reste === 0 && D1.A2.reste === D0.A2.du - (regleBase - D0.A1.du) && D1.A2.reste > 0 && regleBase === montantRegle, JSON.stringify({ D1, regleBase }));

    /* ---------------------------------------------------------------- ouverture de l'onglet : rien n'est charge */
    const demandes = [];
    p.on('request', (r) => { if (/\/api\/v1\/reglement\/releve(\?|$)/.test(r.url())) { demandes.push(r.url()); } });
    const t0 = traces();
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0];
      return n && n.getStore().getRootNode().childNodes.length > 0 && !n.getStore().isLoading(); }, null, { timeout: 120000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await vues.ouvrirMenu(p, 'FACTURATION', 'Gestion des différés');
    await p.waitForFunction(() => Ext.ComponentQuery.query('delayed #ongletSolde').length > 0, null, { timeout: 30000 });
    const onglet = await p.evaluate(() => Ext.ComponentQuery.query('delayed #ongletSolde')[0].tab.getId());
    await p.click('#' + onglet);
    await p.waitForTimeout(1500);
    const ouverture = await p.evaluate(() => {
      const o = Ext.ComponentQuery.query('delayed #ongletSolde')[0], g = o.down('#grilleSolde');
      return { lignes: g.getStore().getCount(), vide: g.getView().getEl().dom.textContent.trim(), du: o.down('#soldeDu').getRawValue(), au: o.down('#soldeAu').getRawValue(),
        visible: o.isVisible(true), detail: o.down('#soldeDetail').body.dom.textContent.trim() };
    });
    const jour = q("SELECT DATE_FORMAT(CURDATE(), '%d/%m/%Y')");
    ok('Ouverture de l\'onglet SOLDE : rien n\'est chargé (aucune demande du relevé, grille vide avec une invitation)',
      ouverture.visible && ouverture.lignes === 0 && demandes.length === 0 && /Rechercher/.test(ouverture.vide), JSON.stringify(ouverture) + ' demandes ' + demandes.length);
    ok('Période proposée : du 01/01/2015 à ce jour', ouverture.du === '01/01/2015' && ouverture.au === jour, ouverture.du + ' → ' + ouverture.au);
    const largeurs = await p.evaluate(() => { const o = Ext.ComponentQuery.query('delayed #ongletSolde')[0];
      return { g: o.down('#grilleSolde').getWidth(), d: o.down('#soldeDetail').getWidth(), t: o.body.getWidth() }; });
    ok('Disposition proportionnelle : relevé 3/5 et volet de détail 2/5 de la largeur', Math.abs(largeurs.g / largeurs.d - 1.5) < 0.08 && largeurs.g + largeurs.d >= largeurs.t - 4, JSON.stringify(largeurs));

    /* ---------------------------------------------------------------- recherche du jour, tous les clients */
    const chargement = async (action) => {
      const rep = p.waitForResponse((r) => /\/api\/v1\/reglement\/releve\?/.test(r.url()), { timeout: 120000 });
      await action();
      const r = await (await rep).json();
      await p.waitForFunction(() => !Ext.ComponentQuery.query('delayed #grilleSolde')[0].getStore().isLoading(), null, { timeout: 60000 });
      await p.waitForTimeout(500);
      return r;
    };
    await vues.saisir(p, 'delayed #soldeDu', jour);
    await vues.saisir(p, 'delayed #soldeAu', jour);
    const R = await chargement(() => vues.cliquer(p, 'delayed #soldeRechercher'));
    const ecran = await p.evaluate(() => { const g = Ext.ComponentQuery.query('delayed #grilleSolde')[0], v = g.getView();
      const cell = (n, item) => { const c = g.down('#' + item); const td = n.querySelector('.x-grid-cell-' + c.getItemId() + ' .x-grid-cell-inner');
        const s = td && td.querySelector('span'); return { t: td ? td.textContent.trim() : '', couleur: s ? getComputedStyle(s).color : '' }; };
      return g.getStore().getRange().map((r, i) => { const n = v.getNode(i);
        return { type: r.get('type'), clientId: r.get('clientId'), piece: r.get('piece'), client: r.get('client'), reference: r.get('reference'), soldeDebut: r.get('soldeDebut'),
          debit: r.get('debit'), credit: r.get('credit'), solde: r.get('solde'), classe: n.className, op: cell(n, 'colOperation'), d: cell(n, 'colDebit'), c: cell(n, 'colCredit'), s: cell(n, 'colSolde') }; }); });
    const resume = await p.evaluate(() => Ext.ComponentQuery.query('delayed #soldeResume')[0].getEl().dom.textContent);
    const clientsEcran = ecran.filter((l) => l.type === 'CLIENT');
    const ligneClient = (k) => clientsEcran.find((l) => l.clientId === CLIENTS[k].id);
    const iA = ecran.indexOf(ligneClient('A')), iB = ecran.indexOf(ligneClient('B'));
    const groupe = (i) => { const out = []; for (let j = i + 1; j < ecran.length && ecran[j].type !== 'CLIENT'; j++) { out.push(ecran[j]); } return out; };
    ok('Groupé par client : une ligne CLIENT pour Alpha et une pour Beta, Alpha avant Beta (ordre des noms), clients triés',
      iA >= 0 && iB > iA && clientsEcran.map((l) => l.client.toLowerCase()).every((n, i, t) => i === 0 || t[i - 1] <= n), clientsEcran.map((l) => l.client).join(' / '));
    const gA = groupe(iA), gB = groupe(iB);
    ok('Sous chaque client, uniquement ses opérations : Alpha 2 ventes + 1 règlement (+ fin de mois), Beta 2 ventes + 1 annulation (+ fin de mois)',
      gA.every((l) => l.clientId === CLIENTS.A.id || l.type === 'MOIS') && gB.every((l) => l.clientId === CLIENTS.B.id || l.type === 'MOIS')
      && gA.filter((l) => l.type === 'VENTE').length === 2 && gA.filter((l) => l.type === 'REGLEMENT').length === 1
      && gB.filter((l) => l.type === 'VENTE').length === 2 && gB.filter((l) => l.type === 'ANNULATION').length === 1
      && gA.filter((l) => l.type === 'MOIS').length === 1 && gB.filter((l) => l.type === 'MOIS').length === 1,
      'Alpha ' + gA.map((l) => l.type).join(',') + ' ; Beta ' + gB.map((l) => l.type).join(','));
    for (const k of ['A', 'B']) {
      const l = ligneClient(k), a = attendu[k];
      ok('Rapprochement ligne CLIENT ' + CLIENTS[k].prenom + ' (écran = base) : début 0, débit ' + a.debit + ', crédit ' + a.credit + ', solde ' + a.solde,
        l && l.soldeDebut === 0 && l.debit === a.debit && l.credit === a.credit && l.solde === a.solde
        && chiffres(l.d.t) === a.debit && chiffres(l.c.t) === a.credit && chiffres(l.s.t) === a.solde && l.op.t.indexOf(CLIENTS[k].complet) === 0,
        JSON.stringify(l && { d: l.debit, c: l.credit, s: l.solde, aff: [l.d.t, l.c.t, l.s.t, l.op.t] }));
    }
    const refsA = gA.filter((l) => l.type === 'VENTE').map((l) => l.reference).sort().join(','), refsB = gB.filter((l) => l.type !== 'MOIS').map((l) => l.reference);
    ok('Rapprochement des opérations (écran = base) : numéros des ventes, débit de chaque vente = sa dette, solde après chaque opération = précédent + débit − crédit',
      refsA === [D0.A1.ref, D0.A2.ref].sort().join(',') && refsB.filter((r) => r === D0.B2.ref).length === 2 && refsB.includes(D0.B1.ref)
      && [[gA, ligneClient('A')], [gB, ligneClient('B')]].every(([g, c]) => { let s = c.soldeDebut; return g.every((l) => { if (l.type === 'MOIS') { return l.solde === s; } s += l.debit - l.credit; return l.solde === s; }) && s === c.solde; })
      && gA.filter((l) => l.type === 'VENTE').every((l) => l.debit === (l.piece === ventes.A1 ? D0.A1.du : D0.A2.du)),
      'Alpha ' + gA.map((l) => l.reference + ':' + l.debit + '/' + l.credit + '=' + l.solde).join(' ') + ' ; Beta ' + gB.map((l) => l.reference + ':' + l.debit + '/' + l.credit + '=' + l.solde).join(' '));
    const op = ecran.filter((l) => l.type !== 'CLIENT' && l.type !== 'MOIS');
    ok('Couleurs : débits en rouge, crédits en vert (lignes d\'opération et lignes client)',
      op.filter((l) => l.debit).every((l) => l.d.couleur === ROUGE) && op.filter((l) => l.credit).every((l) => l.c.couleur === VERT)
      && clientsEcran.every((l) => (!l.debit || l.d.couleur === ROUGE) && (!l.credit || l.c.couleur === VERT)) && /differe-ligne-client/.test(ligneClient('A').classe),
      JSON.stringify(op.slice(0, 3).map((l) => [l.d.couleur, l.c.couleur])));
    const somme = (cle) => clientsEcran.reduce((s, l) => s + l[cle], 0);
    ok('Cohérence : somme des lignes CLIENT = totaux du relevé (début, débit, crédit, fin) ; début des clients = solde au début global',
      somme('soldeDebut') === R.soldeInitial && somme('debit') === R.totalDebit && somme('credit') === R.totalCredit && somme('solde') === R.soldeFinal
      && R.soldeInitial === R.soldeGlobalDebut && R.clients === clientsEcran.length,
      JSON.stringify({ debut: [somme('soldeDebut'), R.soldeInitial, R.soldeGlobalDebut], debit: [somme('debit'), R.totalDebit], credit: [somme('credit'), R.totalCredit], fin: [somme('solde'), R.soldeFinal], clients: [R.clients, clientsEcran.length] }));
    ok('Résumé de l\'écran = totaux du relevé', resume.indexOf(R.clients + ' client(s)') === 0 && resume.includes('Solde à la fin : ' + String(R.soldeFinal).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')), resume);

    /* ---------------------------------------------------------------- volet de droite, par des clics sur les lignes */
    const cliquerLigne = async (filtre) => {
      const pos = await p.evaluate((f) => { const g = Ext.ComponentQuery.query('delayed #grilleSolde')[0], st = g.getStore();
        const i = st.findBy((r) => Object.keys(f).every((k) => r.get(k) === f[k])); if (i < 0) { return null; }
        const n = g.getView().getNode(i).querySelector('.x-grid-cell-' + g.down('#colOperation').getItemId()); n.scrollIntoView({ block: 'center' });
        const b = n.getBoundingClientRect(); return { x: b.left + 20, y: b.top + b.height / 2 }; }, filtre);
      if (!pos) { throw new Error('ligne introuvable ' + JSON.stringify(filtre)); }
      await p.mouse.click(pos.x, pos.y);
      await p.waitForFunction(() => { const d = Ext.ComponentQuery.query('delayed #soldeDetail')[0].body.dom; return !/Chargement/.test(d.textContent) && (d.querySelector('.sd[data-type]') || !/Cliquez sur une vente/.test(d.textContent)); }, null, { timeout: 20000 });
      return p.evaluate(() => { const d = Ext.ComponentQuery.query('delayed #soldeDetail')[0].body.dom, t = (s) => { const e = d.querySelector(s); return e ? e.textContent.trim() : null; };
        return { type: d.querySelector('.sd') ? d.querySelector('.sd').getAttribute('data-type') : null, texte: d.textContent, titre: t('.sd-titre'), montant: t('.sd-montant'), part: t('.sd-part'), mode: t('.sd-mode'),
          debut: t('.sd-debut'), solde: t('.sd-solde'), total: t('.sd-total td:last-child') || t('.sd-total .n'),
          produits: Array.from(d.querySelectorAll('tr.sd-produit')).map((tr) => Array.from(tr.cells).map((c) => c.textContent.trim())),
          ventes: Array.from(d.querySelectorAll('tr.sd-vente')).map((tr) => Array.from(tr.cells).map((c) => c.textContent.trim())),
          totalLigne: Array.from(d.querySelectorAll('tr.sd-total td')).map((c) => c.textContent.trim()) }; });
    };
    /* vente A2 : deux produits */
    const vA2 = await cliquerLigne({ type: 'VENTE', piece: ventes.A2 });
    const produitsBase = q("SELECT CONCAT_WS('|', f.int_CIP, f.str_NAME, d.int_QUANTITY, d.int_PRICE_UNITAIR, d.int_PRICE) FROM t_preenregistrement_detail d"
      + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_PREENREGISTREMENT_ID = '" + ventes.A2 + "' ORDER BY d.dt_CREATED, d.lg_PREENREGISTREMENT_DETAIL_ID")
      .split(/\r?\n/).filter(Boolean).map((l) => l.split('|'));
    ok('Clic sur la vente A2 : ses produits dans le volet, ligne par ligne = base (CIP, libellé, quantité, P.U., montant)',
      vA2.type === 'VENTE' && vA2.titre === 'Vente N° ' + D0.A2.ref && vA2.produits.length === 2 && produitsBase.length === 2
      && vA2.produits.every((l, i) => l[0] === produitsBase[i][0] && l[1] === produitsBase[i][1] && chiffres(l[2]) === Number(produitsBase[i][2])
        && chiffres(l[3]) === Number(produitsBase[i][3]) && chiffres(l[4]) === Number(produitsBase[i][4])) && vA2.produits.map((l) => chiffres(l[2])).join(',') === '3,2',
      JSON.stringify({ ecran: vA2.produits, base: produitsBase }));
    ok('Volet de la vente A2 : total des produits = montant de la vente = débit de la ligne ; part en différé ; reste dû = base',
      chiffres(vA2.total) === D0.A2.prix && chiffres(vA2.montant) === D0.A2.prix && chiffres(vA2.part) === D0.A2.du && vA2.texte.includes(String(D1.A2.reste).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')),
      JSON.stringify({ total: vA2.total, montant: vA2.montant, part: vA2.part, reste: D1.A2.reste }));
    /* reglement d'Alpha */
    const vR = await cliquerLigne({ type: 'REGLEMENT', clientId: CLIENTS.A.id });
    const detailsBase = q("SELECT CONCAT_WS('|', p.str_REF, ROUND(d.dbl_AMOUNT), tp.int_PRICE_RESTE) FROM t_dossier_reglement_detail d"
      + " JOIN t_preenregistrement_compte_client tp ON tp.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = d.str_REF JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID"
      + " WHERE d.lg_DOSSIER_REGLEMENT_ID = '" + dossier + "' ORDER BY p.dt_UPDATED, p.str_REF").split(/\r?\n/).filter(Boolean).map((l) => l.split('|'));
    const modeBase = q("SELECT mr.str_NAME FROM t_reglement r JOIN t_mode_reglement mr ON mr.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID WHERE r.str_REF_RESSOURCE = '" + dossier + "' LIMIT 1");
    ok('Clic sur le règlement : montant réglé, mode et ventes réglées (numéro, part, reste dû) = base, ligne par ligne',
      vR.type === 'REGLEMENT' && chiffres(vR.montant) === regleBase && vR.mode === modeBase && vR.ventes.length === 2 && detailsBase.length === 2
      && vR.ventes.every((l, i) => l[0] === 'Vente N° ' + detailsBase[i][0] && chiffres(l[2]) === Number(detailsBase[i][1]) && chiffres(l[3]) === Number(detailsBase[i][2])),
      JSON.stringify({ ecran: vR.ventes, base: detailsBase, montant: vR.montant, mode: [vR.mode, modeBase] }));
    ok('Volet du règlement : somme des parts = montant réglé = crédit de la ligne', chiffres(vR.totalLigne[1]) === regleBase
      && Number(detailsBase.reduce((s, l) => s + Number(l[1]), 0)) === regleBase && gA.find((l) => l.type === 'REGLEMENT').credit === regleBase, JSON.stringify(vR.totalLigne));
    /* annulation de B2 */
    const vAn = await cliquerLigne({ type: 'ANNULATION', piece: ventes.B2 });
    ok('Clic sur l\'annulation : la vente annulée, ses produits et la mention « Vente annulée »', vAn.type === 'VENTE' && vAn.titre === 'Vente N° ' + D0.B2.ref
      && /Vente annulée/.test(vAn.texte) && vAn.produits.length === 1 && chiffres(vAn.produits[0][2]) === 1 && chiffres(vAn.total) === D0.B2.prix, JSON.stringify(vAn).slice(0, 300));
    /* client Beta */
    const vC = await cliquerLigne({ type: 'CLIENT', clientId: CLIENTS.B.id });
    ok('Clic sur le client Beta : son résumé (début, solde à la fin) = sa ligne = base', vC.type === 'CLIENT' && vC.titre === CLIENTS.B.complet
      && chiffres(vC.debut) === 0 && chiffres(vC.solde) === attendu.B.solde, JSON.stringify({ titre: vC.titre, debut: vC.debut, solde: vC.solde }));
    await p.screenshot({ path: SORTIE + '/differes-solde-client.png' });

    /* ---------------------------------------------------------------- impression PDF et export Excel (tous les clients) */
    const demandePdf = p.context().waitForEvent('request', { predicate: (r) => /releve\/pdf\?/.test(r.url()), timeout: 30000 });
    const [popup] = await Promise.all([p.waitForEvent('popup', { timeout: 30000 }), vues.cliquer(p, 'delayed #soldePdf')]);
    const urlPdf = (await demandePdf).url(); await popup.close().catch(() => {});
    const pdf = await p.evaluate(async (u) => { const r = await fetch(u); return { s: r.status, t: r.headers.get('content-type'), b: Array.from(new Uint8Array(await r.arrayBuffer())) }; }, urlPdf);
    require('fs').writeFileSync(SORTIE + '/releve-differes-clients.pdf', Buffer.from(pdf.b));
    const texte = pdf.s === 200 && /pdf/.test(pdf.t) ? execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', SORTIE + '/releve-differes-clients.pdf', '-'], { encoding: 'utf8' }) : '';
    const pos = (s, depuis) => texte.indexOf(s, depuis || 0);
    const pA = pos(CLIENTS.A.complet), pB = pos(CLIENTS.B.complet);
    const milliers = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const ligneDe = (k) => (texte.split('\n').find((l) => l.includes(CLIENTS[k].complet)) || '');
    ok('PDF : période de l\'écran, groupé par client (Alpha puis ses opérations, puis Beta et les siennes)',
      /dtStart=\d{4}-\d{2}-\d{2}/.test(urlPdf) && pA >= 0 && pB > pA && pos(D0.A2.ref, pA) > pA && pos(D0.A2.ref, pA) < pB && pos(D0.B1.ref, pB) > pB
      && /Solde au début/.test(texte) && /RELEVÉ DES DIFFÉRÉS/.test(texte), 'Alpha ' + pA + ', Beta ' + pB + ' ; ' + texte.slice(0, 300));
    ok('PDF : ligne de chaque client = écran (débit, crédit, solde à la fin)', ['A', 'B'].every((k) => { const l = ligneDe(k), a = attendu[k];
      return l.includes(milliers(a.debit)) && l.includes(milliers(a.credit)) && l.includes(milliers(a.solde)); }), ligneDe('A') + ' || ' + ligneDe('B'));
    const urlX = await p.evaluate(() => { const o = window.open, vus = []; window.open = (u) => { vus.push(u); return null; };
      try { Ext.ComponentQuery.query('delayed #soldeExcel')[0].btnEl.dom.click(); } finally { window.open = o; } return vus[0] || ''; });
    const xls = await p.evaluate(async (u) => { const r = await fetch(u); const b = new Uint8Array(await r.arrayBuffer());
      return { s: r.status, d: r.headers.get('content-disposition'), txt: Array.from(b).map((c) => (c >= 32 && c < 127 ? String.fromCharCode(c) : ' ')).join('') }; }, urlX);
    const xA = xls.txt.indexOf('Client : ' + CLIENTS.A.complet), xB = xls.txt.indexOf('Client : ' + CLIENTS.B.complet);
    ok('Export Excel : groupé par client, même ordre que l\'écran (Alpha avant Beta), opérations présentes', xls.s === 200 && /\.xls/.test(xls.d || '')
      && xA >= 0 && xB > xA && xls.txt.includes(D0.A2.ref) && xls.txt.includes(D0.B1.ref), JSON.stringify({ s: xls.s, d: xls.d, xA, xB }));

    /* ---------------------------------------------------------------- choix d'un client dans la liste : seul son groupe */
    const champ = await p.evaluate(() => Ext.ComponentQuery.query('delayed #soldeClient')[0].inputEl.dom.id);
    await p.click('#' + champ);
    await p.waitForTimeout(300);
    const R2p = p.waitForResponse((r) => /\/api\/v1\/reglement\/releve\?.*clientId=/.test(r.url()) && !/clientId=&|clientId=$/.test(r.url()), { timeout: 60000 });
    await p.keyboard.type(CLIENTS.A.nom, { delay: 40 });
    const prop = p.locator('.x-boundlist-item').filter({ visible: true }).filter({ hasText: CLIENTS.A.nom }).first();
    await prop.waitFor({ timeout: 20000 });
    await prop.click();
    const R2 = await (await R2p).json();
    await p.waitForTimeout(800);
    const filtre = await p.evaluate(() => Ext.ComponentQuery.query('delayed #grilleSolde')[0].getStore().getRange().map((r) => r.get('type') + ':' + r.get('clientId')));
    ok('Client choisi dans la liste : le relevé se recharge avec son seul groupe (une ligne CLIENT, ses opérations)',
      filtre.filter((x) => /^CLIENT:/.test(x)).length === 1 && filtre.every((x) => x.endsWith(':' + CLIENTS.A.id) || /^MOIS:/.test(x)) && R2.soldeFinal === attendu.A.solde,
      filtre.join(', '));

    /* ---------------------------------------------------------------- dates inversees */
    await vues.saisir(p, 'delayed #soldeDu', '31/12/2030');
    const avantInv = demandes.length;
    await vues.cliquer(p, 'delayed #soldeRechercher');
    await p.waitForTimeout(800);
    const msg = await p.evaluate(() => Ext.ComponentQuery.query('delayed #soldeMessage')[0].getEl().dom.textContent);
    ok('Dates inversées : message, aucune demande au serveur', /début est après/.test(msg) && demandes.length === avantInv, msg);

    /* ---------------------------------------------------------------- coherence sur les donnees du poste */
    const debutMois = q("SELECT DATE_FORMAT(CURDATE() - INTERVAL 2 MONTH, '%Y-%m-01')"), auj = q('SELECT CURDATE()');
    const debutT = Date.now();
    const RP = await api('GET', '../api/v1/reglement/releve?dtStart=' + debutMois + '&dtEnd=' + auj + '&clientId=');
    const duree = Date.now() - debutT;
    const cl = (RP.data || []).filter((l) => l.type === 'CLIENT');
    const tot = (k) => cl.reduce((s, l) => s + (l[k] || 0), 0);
    ok('Données du poste (' + debutMois + ' → ' + auj + ', ' + cl.length + ' clients, ' + duree + ' ms) : début global = somme des débuts des clients ; totaux = somme des lignes CLIENT',
      RP.success !== false && RP.soldeInitial === RP.soldeGlobalDebut && tot('soldeDebut') === RP.soldeInitial && tot('debit') === RP.totalDebit
      && tot('credit') === RP.totalCredit && tot('solde') === RP.soldeFinal && cl.every((l) => l.solde === l.soldeDebut + l.debit - l.credit),
      JSON.stringify({ debut: [RP.soldeInitial, RP.soldeGlobalDebut, tot('soldeDebut')], fin: [RP.soldeFinal, tot('solde')] }));

    /* ---------------------------------------------------------------- bilan : consulter et editer n'ecrit rien */
    const t1 = traces();
    ok('Bilan : consultation, détail, PDF et Excel n\'écrivent rien (ventes, dettes, règlements, mouvements, caisse, restes inchangés)', t0 === t1, t0 + ' → ' + t1);
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    if (sess) { await sess.b.close().catch(() => {}); }
    C.nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID IN ('" + CLIENTS.A.id + "', '" + CLIENTS.B.id + "')") === '0'
      && q("SELECT COUNT(*) FROM t_dossier_reglement WHERE str_ORGANISME_ID IN ('" + CLIENTS.A.id + "', '" + CLIENTS.B.id + "')") === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
