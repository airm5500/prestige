/* PLAN DU 09/11, POINT 3 : POINTAGE BL, PERIODE SELON LA DATE DU BL OU SELON LA DATE D'ENTREE.
 *
 * Par l'ecran « Pointer les BL / Avoirs » (admin, vrais clics), en lecture seule sur les BL du grossiste DPCI :
 *  - un jour J choisi pour que les deux modes different : des BL dates du jour J saisis plus tard, et des BL saisis
 *    le jour J avec une date de BL anterieure (jeu varie, verifie en precondition) ;
 *  - a l'ouverture, le choix vaut « Date du BL » ;
 *  - « Date du BL », du J au J : les pieces de la grille = celles de la base selon la date du BL (BL, retours selon la
 *    date de l'avoir, manquants a la reception), ligne par ligne : type, n° BL, date du BL, date d'entree, montant ;
 *  - « Date d'entree » : idem selon la date d'entree (BL et retours) ;
 *  - coherence : total BL = somme des BL de la grille, net = BL + avoirs, sur les deux modes ;
 *  - l'edition PDF part avec le meme choix (reponse PDF) ;
 *  - aucune erreur JavaScript.
 */
const C = require('../audits/commun');
const { ok, q } = C;
const { ouvrirMenu, cliquer, choisir, saisir } = require('../outils/vues');

const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_LIBELLE = 'DPCI' LIMIT 1");
const BLS = `FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID JOIN t_user u ON u.lg_USER_ID = b.lg_USER_ID
  WHERE o.lg_GROSSISTE_ID = '${G}' AND u.lg_EMPLACEMENT_ID = '1' AND b.str_STATUT IN ('enable', 'is_Closed')`;
/* jour J : au moins 2 BL dates du J saisis apres, et au moins 2 BL saisis le J dates d'avant */
const J = q(`SELECT x.j FROM (SELECT DATE(b.dt_DATE_LIVRAISON) j ${BLS} AND DATE(b.dt_CREATED) > DATE(b.dt_DATE_LIVRAISON)
  GROUP BY 1 HAVING COUNT(*) >= 2) x WHERE (SELECT COUNT(*) ${BLS} AND DATE(b.dt_CREATED) = x.j AND DATE(b.dt_DATE_LIVRAISON) < x.j) >= 2
  ORDER BY x.j DESC LIMIT 1`);
const jj = (d) => d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4);

/* pieces attendues, calculees en base : type|n° BL|date BL|date d'entree|montant HT signe */
function attendu(saisie) {
  const dBl = saisie ? 'b.dt_CREATED' : 'b.dt_DATE_LIVRAISON';
  const dRf = saisie ? 'rf.dt_CREATED' : 'COALESCE(rf.dt_AVOIR, rf.dt_DATE)';
  const f = "DATE_FORMAT(%s, '%d/%m/%Y')";
  const l = [];
  const ajoute = (s) => { if (s) { s.split(/\r?\n/).forEach((x) => l.push(x.trim())); } };
  ajoute(q(`SELECT CONCAT_WS('|', 'BL', b.str_REF_LIVRAISON, ${f.replace('%s', 'b.dt_DATE_LIVRAISON')}, ${f.replace('%s', 'b.dt_CREATED')}, COALESCE(b.int_MHT, 0))
    ${BLS} AND DATE(${dBl}) = '${J}'`));
  ajoute(q(`SELECT CONCAT_WS('|', 'RETOUR', IFNULL(b.str_REF_LIVRAISON, ''), ${f.replace('%s', 'COALESCE(rf.dt_AVOIR, rf.dt_DATE)')}, ${f.replace('%s', 'rf.dt_CREATED')},
      -ABS(COALESCE(rf.int_AVOIR_HT, rf.dl_AMOUNT, 0)))
    FROM t_retour_fournisseur rf LEFT JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = rf.lg_BON_LIVRAISON_ID JOIN t_user ru ON ru.lg_USER_ID = rf.lg_USER_ID
    WHERE rf.lg_GROSSISTE_ID = '${G}' AND ru.lg_EMPLACEMENT_ID = '1' AND rf.str_STATUT IN ('enable', 'is_Closed') AND DATE(${dRf}) = '${J}'`));
  ajoute(q(`SELECT CONCAT_WS('|', 'RECEPTION', b.str_REF_LIVRAISON, ${f.replace('%s', 'b.dt_DATE_LIVRAISON')}, ${f.replace('%s', 'b.dt_CREATED')},
      -ABS(ROUND(SUM(d.int_QTE_RETURN * d.int_PAF))))
    ${BLS.replace('WHERE', 'JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID WHERE')} AND DATE(${dBl}) = '${J}' AND d.int_QTE_RETURN > 0
    GROUP BY b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON, b.dt_DATE_LIVRAISON, b.dt_CREATED`));
  return l.sort();
}

(async () => {
  ok('Jeu d\'essai : grossiste DPCI et jour J où les deux dates diffèrent', !!G && /^\d{4}-\d{2}-\d{2}$/.test(J), G + ' ' + J);
  const parBl = attendu(false), parSaisie = attendu(true);
  ok('Jeu varié : les deux modes donnent des pièces différentes, plusieurs montants', JSON.stringify(parBl) !== JSON.stringify(parSaisie)
    && parBl.length >= 2 && parSaisie.length >= 2 && new Set(parBl.map((x) => x.split('|')[4])).size >= 2, parBl.length + ' / ' + parSaisie.length);
  const menu = q("SELECT str_DESCRIPTION FROM t_sous_menu WHERE str_COMPOSANT = 'pointagebl' LIMIT 1");
  const { b, p, erreurs } = await C.connecter();
  const grille = () => p.evaluate(() => Ext.ComponentQuery.query('pointagebl')[0].pieces.getRange()
    .map((r) => [r.get('type'), r.get('reference'), r.get('date'), r.get('dateSaisie'), Math.round(r.get('montantHt'))].join('|')).sort());
  const totaux = () => p.evaluate(() => { const e = Ext.ComponentQuery.query('pointagebl')[0], o = e.pieces.getProxy().getReader().rawData || {};
    const bl = e.pieces.getRange().filter((r) => r.get('type') === 'BL').reduce((a, r) => a + r.get('montantHt'), 0);
    return { totalBl: o.totalBl, totalAvoirs: o.totalAvoirs, net: o.net, sommeBl: Math.round(bl) }; });
  const rechercher = async () => {
    const rep = p.waitForResponse((r) => /api\/v1\/pointage-bl\?/.test(r.url()), { timeout: 20000 });
    await cliquer(p, 'pointagebl #rechercherPointage');
    const r = await rep;
    await p.waitForFunction(() => !Ext.ComponentQuery.query('pointagebl')[0].pieces.isLoading(), null, { timeout: 20000 });
    await p.waitForTimeout(500);
    return r.url();
  };
  try {
    await ouvrirMenu(p, 'GESTION DES COMMANDES', menu);
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('pointagebl')[0]; return e && e.isVisible(true) && e.down('#grossiste').getStore().getCount() > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const defaut = await p.evaluate(() => { const c = Ext.ComponentQuery.query('pointagebl #selon')[0]; return c ? c.getValue() + '|' + c.getRawValue() : null; });
    ok('À l\'ouverture, la période porte sur « Date du BL »', defaut === 'BL|Date du BL', defaut);
    await choisir(p, 'pointagebl #grossiste', 'DPCI');
    await saisir(p, 'pointagebl #du', jj(J));
    await saisir(p, 'pointagebl #au', jj(J));

    const u1 = await rechercher();
    const g1 = await grille();
    ok('Date du BL : la requête porte le choix', /selon=BL/.test(u1), u1);
    ok('Date du BL : grille = base, ligne par ligne (type, n° BL, date BL, date d\'entrée, montant)', JSON.stringify(g1) === JSON.stringify(parBl),
      'écran ' + g1.join(' ; ').slice(0, 400) + ' // base ' + parBl.join(' ; ').slice(0, 400));
    ok('Date du BL : toutes les pièces ont leur date du BL au jour J', g1.every((x) => x.split('|')[2] === jj(J)), '');
    const t1 = await totaux();
    ok('Cohérence (date du BL) : total BL = somme des BL, net = BL + avoirs', t1.totalBl === t1.sommeBl && t1.net === t1.totalBl + t1.totalAvoirs, JSON.stringify(t1));

    await choisir(p, 'pointagebl #selon', 'Date d\'entrée');
    await p.waitForTimeout(300);
    const u2 = await rechercher();
    const g2 = await grille();
    ok('Date d\'entrée : la requête porte le choix', /selon=SAISIE/.test(u2), u2);
    ok('Date d\'entrée : grille = base, ligne par ligne', JSON.stringify(g2) === JSON.stringify(parSaisie),
      'écran ' + g2.join(' ; ').slice(0, 400) + ' // base ' + parSaisie.join(' ; ').slice(0, 400));
    ok('Date d\'entrée : toutes les pièces ont été saisies le jour J', g2.every((x) => x.split('|')[3] === jj(J)), '');
    ok('Date d\'entrée : des BL datés d\'avant le jour J apparaissent', g2.some((x) => x.split('|')[0] === 'BL' && x.split('|')[2] !== jj(J)), '');
    const t2 = await totaux();
    ok('Cohérence (date d\'entrée) : total BL = somme des BL, net = BL + avoirs', t2.totalBl === t2.sommeBl && t2.net === t2.totalBl + t2.totalAvoirs, JSON.stringify(t2));

    const pdf = await p.evaluate(async () => { const e = Ext.ComponentQuery.query('pointagebl')[0];
      const r = await fetch('../api/v1/pointage-bl/pdf?' + Ext.Object.toQueryString(e.criteres()));
      return { statut: r.status, type: r.headers.get('content-type'), url: Ext.Object.toQueryString(e.criteres()) }; });
    ok('Édition PDF : même choix envoyé, PDF rendu', pdf.statut === 200 && /pdf/.test(pdf.type) && /selon=SAISIE/.test(pdf.url), JSON.stringify(pdf));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } finally {
    await b.close();
    C.bilan();
  }
})();
