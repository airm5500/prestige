/* PLAN DU 19/11, POINT 11 : « Liste des Bons par Organisme », onglet « Pointage ».
 * Défaut signalé : « la recherche ne marche plus quand je mets une période, le bouton ne réagit pas ». Cause : sans
 * organisme choisi, « Actualiser » ne fait rien et n'affiche rien (aucun message) ; une date tapée au clavier ne
 * relance pas non plus la liste.
 * Attendu : sans organisme ni groupe, « Actualiser » dit « Choisissez un organisme ou un groupe » et signale le champ ;
 * période inversée : message ; Entrée dans une date relance la liste ; nouveau filtre « Groupe » : les bons de chaque
 * organisme du groupe, l'un après l'autre (un bandeau par organisme), compteurs du groupe = somme des organismes ;
 * un clic sur un bon passe sur son organisme et ouvre sa fiche (le pointage reste par organisme).
 *
 * Jeu d'essai (retiré à la fin) : groupe d'essai avec les organismes PGA (2 bons) et PGC (3 bons), PGB hors groupe
 * (1 bon) ; quantités et produits différents.
 * Contrôles :
 *  - message et champ signalé sans organisme (ancien code : rien) ; période inversée : message ;
 *  - rapprochement liste du groupe / listes par organisme / base, ligne par ligne (organisme, n° de bon, part), dans
 *    l'ordre des organismes ; PGB absent ; bandeaux par organisme ;
 *  - cohérence : compteurs du groupe = somme des compteurs des organismes ;
 *  - délai de la liste du groupe sous le plafond ;
 *  - clic sur un bon de PGC : organisme PGC choisi, groupe vidé, fiche du bon ouverte ;
 *  - bilan : rien n'est écrit (aucun pointage) ; aucune fenêtre surgissante, aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/facturation/test-pointage-bons-groupe-1911.js
 */
const C = require('../audits/commun');
const { ok, q, exec, MARQUE } = C;
const vues = require('../outils/vues');

const GROUPE = MARQUE + '-G1911';
const P = 'pointagebons';
const PLAFOND_LISTE_MS = 5000;
const fmt = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const bonsEnBase = (tp) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(t.str_REF_BON, '=', t.int_PRICE) ORDER BY t.str_REF_BON SEPARATOR ','), '')"
  + " FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_compte_client_tiers_payant l ON l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
  + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID"
  + " WHERE l.lg_TIERS_PAYANT_ID = '" + tp + "' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0");

(async () => {
  C.ouvrirCaisse();
  exec("DELETE FROM t_groupe_tierspayant WHERE str_LIBELLE = '" + GROUPE + "'; INSERT INTO t_groupe_tierspayant (str_LIBELLE) VALUES ('" + GROUPE + "')");
  const groupeId = q("SELECT lg_GROUPE_ID FROM t_groupe_tierspayant WHERE str_LIBELLE = '" + GROUPE + "'");
  const TPA = C.tiersPayant('PGA', '1', 'lg_GROUPE_ID = ' + groupeId), TPC = C.tiersPayant('PGC', '1', 'lg_GROUPE_ID = ' + groupeId);
  const TPB = C.tiersPayant('PGB', '1');
  const P1 = C.produit(12, 200), P2 = C.produit(13, 200), P3 = C.produit(14, 200);
  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  const VO = C.venteAssurance(api);
  const pointages = () => q(`SELECT COUNT(*) FROM t_pointage_bon WHERE lg_TIERS_PAYANT_ID IN ('${TPA}', '${TPB}', '${TPC}')`);
  try {
    const clA = await C.clientAssure(api, 'PGA', [{ tp: TPA, taux: 80 }]);
    const clC = await C.clientAssure(api, 'PGC', [{ tp: TPC, taux: 70 }]);
    const clB = await C.clientAssure(api, 'PGB', [{ tp: TPB, taux: 90 }]);
    await VO.vendre(clA, [{ lien: clA.lien(TPA), taux: 80, bon: 'PGA-1' }], P1, 2);
    await VO.vendre(clA, [{ lien: clA.lien(TPA), taux: 80, bon: 'PGA-2' }], P2, 1);
    await VO.vendre(clC, [{ lien: clC.lien(TPC), taux: 70, bon: 'PGC-1' }], P1, 1);
    await VO.vendre(clC, [{ lien: clC.lien(TPC), taux: 70, bon: 'PGC-2' }], P3, 3);
    await VO.vendre(clC, [{ lien: clC.lien(TPC), taux: 70, bon: 'PGC-3' }], P2, 2);
    await VO.vendre(clB, [{ lien: clB.lien(TPB), taux: 90, bon: 'PGB-1' }], P3, 1);
    const baseA = bonsEnBase(TPA), baseC = bonsEnBase(TPC);
    ok('Jeu d\'essai : PGA 2 bons, PGC 3 bons (groupe), PGB 1 bon (hors groupe)', baseA.split(',').length === 2 && baseC.split(',').length === 3 && bonsEnBase(TPB).split(',').length === 1,
      baseA + ' | ' + baseC);
    const avant = pointages();

    await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Bons par organisme');
    await p.mouse.move(1200, 700);
    await p.waitForFunction(() => Ext.ComponentQuery.query('bonsorganismeonglets').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await vues.cliquer(p, 'bonsorganismeonglets #bo-pointage');
    await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), P, { timeout: 30000 });
    const charge = async () => {
      await p.waitForTimeout(300);
      await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return c && !c.store.isLoading(); }, P, { timeout: 60000 });
      await p.waitForTimeout(300);
    };
    const etat = () => p.evaluate((x) => { const c = Ext.ComponentQuery.query(x)[0];
      return { message: c.down('#ptMessage').el.dom.innerText, compteurs: c.down('#ptCompteurs').el.dom.innerText,
        invalide: !!c.down('#ptOrganisme').el.down('.x-form-invalid-field, .x-form-trigger-wrap-invalid') || c.down('#ptOrganisme').hasActiveError(),
        lignes: c.store.getCount(), chargements: c.chargements || 0 }; }, P);
    const hier = new Date(Date.now() - 86400000), demain = new Date(Date.now() + 86400000);

    /* 1. periode tapee au clavier, aucun organisme, « Actualiser » */
    await vues.saisir(p, P + ' #ptDebut', fmt(hier));
    await vues.saisir(p, P + ' #ptFin', fmt(demain));
    await vues.cliquer(p, P + ' #ptActualiser');
    await p.waitForTimeout(800);
    let e = await etat();
    ok('Sans organisme, « Actualiser » : message « Choisissez un organisme ou un groupe »', /Choisissez un organisme ou un groupe/.test(e.message + ' ' + e.compteurs), JSON.stringify(e));
    ok('Sans organisme : le champ Organisme est signalé', e.invalide, JSON.stringify(e));

    /* 2. periode inversee */
    await vues.saisir(p, P + ' #ptDebut', fmt(demain));
    await vues.saisir(p, P + ' #ptFin', fmt(hier));
    await vues.choisir(p, P + ' #ptOrganisme', TPA);
    await p.waitForTimeout(800);
    e = await etat();
    ok('Période inversée : message « la date de fin précède la date de début »', /fin précède/.test(e.message + ' ' + e.compteurs), JSON.stringify(e));
    await vues.saisir(p, P + ' #ptDebut', fmt(hier));
    await vues.saisir(p, P + ' #ptFin', fmt(demain));
    await p.keyboard.press('Shift+Tab');
    await p.keyboard.press('Enter');
    await charge();
    const lignesA = await p.evaluate((x) => Ext.ComponentQuery.query(x)[0].store.getRange().map((r) => r.get('bon') + '=' + r.get('part')).sort().join(','), P);
    ok('Organisme PGA, Entrée dans la date : la liste se recharge (rapprochement / base)', lignesA === baseA, lignesA + ' / ' + baseA);

    /* 3. filtre par groupe */
    const t0 = Date.now();
    await vues.choisir(p, P + ' #ptGroupeFiltre', GROUPE);
    await charge();
    const dGroupe = Date.now() - t0;
    const g = await p.evaluate((x) => { const c = Ext.ComponentQuery.query(x)[0];
      const vis = (id) => { const b = c.down(id); return !!b && !b.isDisabled(); };
      return { organisme: c.down('#ptOrganisme').getValue(), lignes: c.store.getRange().map((r) => [r.get('organisme'), r.get('bon'), r.get('part')]),
        bandeaux: Array.from(c.grille.getEl().dom.querySelectorAll('.x-grid-group-title')).map((d) => d.innerText.trim()),
        compteurs: c.dernierCompteurs, actifs: ['#ptAnnoncesOk', '#ptReleve', '#ptDelaiOk', '#ptExcel', '#ptPdf'].filter(vis) }; }, P);
    ok('Délai : liste du groupe en moins de ' + PLAFOND_LISTE_MS + ' ms', dGroupe < PLAFOND_LISTE_MS, dGroupe + ' ms');
    ok('Groupe choisi : le champ Organisme est vidé', !g.organisme, g.organisme);
    const ordre = g.lignes.map((l) => l[0]);
    ok('Les bons de PGA puis ceux de PGC, l\'un après l\'autre ; PGB absent', ordre.join(',') === [TPA, TPA, TPC, TPC, TPC].join(','), JSON.stringify(g.lignes));
    const parOrg = (tp) => g.lignes.filter((l) => l[0] === tp).map((l) => l[1] + '=' + l[2]).sort().join(',');
    ok('Rapprochement liste du groupe / base, ligne par ligne (organisme, n° de bon, part)', parOrg(TPA) === baseA && parOrg(TPC) === baseC, parOrg(TPA) + ' | ' + parOrg(TPC));
    ok('Un bandeau par organisme, avec son nombre de bons', g.bandeaux.length === 2 && g.bandeaux[0].includes(TPA) && /2 bon/.test(g.bandeaux[0]) && g.bandeaux[1].includes(TPC) && /3 bon/.test(g.bandeaux[1]),
      JSON.stringify(g.bandeaux));
    /* coherence : compteurs du groupe = somme des organismes (meme API que l'ecran) */
    const periode = { dtStart: hier.toISOString().slice(0, 10), dtEnd: demain.toISOString().slice(0, 10), filtre: 'TOUS' };
    const qs = (o) => Object.entries(o).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
    const lA = await api('GET', '../api/v1/pointage-bons/liste?' + qs(Object.assign({ tiersPayantId: TPA }, periode)));
    const lC = await api('GET', '../api/v1/pointage-bons/liste?' + qs(Object.assign({ tiersPayantId: TPC }, periode)));
    const somme = ['enBase', 'pointes', 'aPointer', 'conformes', 'anomalies', 'alertes', 'montant'].map((k) => [k, (lA.compteurs || {})[k] + (lC.compteurs || {})[k]]);
    ok('Cohérence : compteurs du groupe = somme des compteurs des organismes', somme.every(([k, v]) => g.compteurs && g.compteurs[k] === v), JSON.stringify(g.compteurs) + ' / ' + JSON.stringify(somme));
    const lG = await api('GET', '../api/v1/pointage-bons/liste?' + qs(Object.assign({ groupeId }, periode)));
    ok('Rapprochement : liste du groupe = listes des organismes mises bout à bout', JSON.stringify((lG.data || []).map((x) => x.id)) === JSON.stringify([...(lA.data || []), ...(lC.data || [])].map((x) => x.id)),
      (lG.data || []).length + ' / ' + ((lA.data || []).length + (lC.data || []).length));
    ok('Groupe : les actions propres à un organisme sont grisées (annonces, relevé, délai, Excel, PDF)', g.actifs.length === 0, g.actifs.join(', '));

    /* 4. clic sur un bon de PGC : passe sur PGC et ouvre la fiche */
    const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: 'PGC-2' }).first();
    await ligne.click();
    await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return c.fiche && c.fiche.bon && c.fiche.bon.bon === 'PGC-2'; }, P, { timeout: 30000 });
    await charge();
    const f = await p.evaluate((x) => { const c = Ext.ComponentQuery.query(x)[0];
      return { organisme: c.down('#ptOrganisme').getValue(), groupe: c.down('#ptGroupeFiltre').getValue(), bon: c.fiche.bon.bon, lignes: c.store.getCount() }; }, P);
    ok('Clic sur PGC-2 : organisme PGC choisi, groupe vidé, fiche du bon ouverte', f.organisme === TPC && !f.groupe && f.bon === 'PGC-2' && f.lignes === 3, JSON.stringify(f));

    ok('Bilan : aucun pointage écrit', pointages() === avant, avant + ' -> ' + pointages());
    ok('Aucune fenêtre surgissante', await p.evaluate(() => !Ext.ComponentQuery.query('messagebox, window').some((w) => w.isVisible() && w.modal)));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    ok('Déroulé sans exception', false, err.stack);
  } finally {
    await sess.b.close().catch(() => {});
    exec(`DELETE FROM t_pointage_bon WHERE lg_TIERS_PAYANT_ID IN ('${TPA}', '${TPB}', '${TPC}')`);
    C.nettoyer();
    exec("DELETE FROM t_groupe_tierspayant WHERE str_LIBELLE = '" + GROUPE + "'");
    ok('Nettoyage : groupe d\'essai retiré', q("SELECT COUNT(*) FROM t_groupe_tierspayant WHERE str_LIBELLE = '" + GROUPE + "'") === '0');
    process.exit(C.bilan() ? 1 : 0);
  }
})();
