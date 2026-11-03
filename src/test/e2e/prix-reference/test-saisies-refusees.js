/* CAS 2 DU 03/11/2026, TEST D'ECRAN 2 : saisies refusees dans la grille (4, 101, prix au-dessus du prix de vente, texte).
 *
 * Pour chaque saisie refusee : cellule rouge, message sous la grille, ancienne valeur retablie, et AUCUNE requete
 * reseau (ni PUT, ni update/item/vno, ni net). Un clic ailleurs (sans Entree) abandonne la saisie en silence. Une
 * saisie valide ensuite prouve que la grille n'est pas bloquee. Tout est retire a la fin.
 * Lancement seul : node src/test/e2e/prix-reference/test-saisies-refusees.js
 */
const C = require('./commun');
const { ok, q, A } = C;

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  const TP = A.tiersPayant('R2', '1');
  const P = C.produitSansReference(4);
  const CIP = C.cip(P);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  let requetes = [];
  p.on('request', (r) => { if (/\/api\//.test(r.url())) { requetes.push(r.request ? r.url() : r.url()); } });
  try {
    const cl = await A.clientAssure(api, 'REF2', [{ tp: TP, taux: 80 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' REF2');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-R2');
    await C.taperArticle(p, CIP);
    const venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    const e0 = await C.entete(p);
    ok('Préparation : vente assurance avec un article, groupe P.REF | TAUX présent', !!venteId && e0 && e0.groupes.length === 1, JSON.stringify(e0 && e0.groupes));

    const refuser = async (champ, texte, attendu) => {
      requetes = [];
      await C.saisirCellule(p, CIP, TP, champ, texte);
      await p.waitForTimeout(500);
      const l = await C.ligne(p, CIP);
      const e = await C.entete(p);
      const rouge = l && l.cellules.some((c) => /vp-ref-erreur/.test(c.classes));
      await p.waitForTimeout(900);
      ok('« ' + texte + ' » en ' + champ.toUpperCase() + ' : cellule rouge, message sous la grille', rouge && attendu.test(e.message), (rouge ? 'rouge' : 'pas rouge') + ' / ' + e.message);
      ok('« ' + texte + ' » : ancienne valeur rétablie (défaut ' + (champ === 'taux' ? 80 : P.pu) + '), rien en base', l && l.refs[0].defaut === true
        && l.refs[0].valeur === P.pu && l.refs[0].taux === 80 && l.cellules.every((c) => /vp-ref-defaut/.test(c.classes)) && C.references(P.id) === 'aucune', JSON.stringify(l && l.refs));
      ok('« ' + texte + ' » : aucune requête réseau', requetes.length === 0, requetes.join(' '));
    };
    await refuser('valeur', '4', /au moins 5/);
    await refuser('taux', '101', /entre 5 et 100/);
    await refuser('taux', '4', /entre 5 et 100/);
    await refuser('valeur', String(P.pu + 1), /dépasse le prix de vente/);
    /* texte : le champ numerique refuse les lettres a la frappe (masque) ; la valeur affichee ne change pas et
       Entree sur une valeur inchangee n'ecrit rien */
    requetes = [];
    await C.saisirCellule(p, CIP, TP, 'valeur', 'abc');
    await p.waitForTimeout(800);
    const lTexte = await C.ligne(p, CIP);
    ok('« abc » en P.REF : lettres refusées à la frappe, valeur inchangée, rien en base, aucune requête', lTexte && lTexte.refs[0].defaut === true
      && lTexte.refs[0].valeur === P.pu && C.references(P.id) === 'aucune' && requetes.length === 0, JSON.stringify(lTexte && lTexte.refs) + ' ' + requetes.join(' '));
    /* Entree sur la valeur par defaut telle quelle : rien n'est ecrit */
    requetes = [];
    await C.saisirCellule(p, CIP, TP, 'taux', '80');
    await p.waitForTimeout(800);
    ok('Entrée sur le taux par défaut (80) sans le changer : rien n\'est écrit, aucune requête', C.references(P.id) === 'aucune' && requetes.length === 0, requetes.join(' '));

    /* un clic ailleurs abandonne la saisie : rien n'est enregistre, pas de message */
    requetes = [];
    await C.saisirCellule(p, CIP, TP, 'valeur', String(P.pu - 50), 'Tab');
    await p.waitForTimeout(800);
    const lAb = await C.ligne(p, CIP);
    ok('Saisie quittée sans Entrée (Tab) : abandonnée, valeur par défaut gardée, aucune requête', lAb && lAb.refs[0].defaut === true && C.references(P.id) === 'aucune'
      && !requetes.some((u) => /prix-reference|update\/item/.test(u)), JSON.stringify(lAb && lAb.refs) + ' ' + requetes.join(' '));

    /* la grille n'est pas bloquee : une saisie valide passe */
    const r = await C.saisirEtEnregistrer(p, CIP, TP, 'taux', 25);
    ok('Saisie valide ensuite (taux 25) : enregistrée', r.success === true && C.references(P.id) === TP + '/MIX_TAUX_PRIX/' + P.pu + '/25/1', C.references(P.id));
    ok('Le prix de référence enregistré avec ce taux est le prix de vente (valeur par défaut)', /^AJOUT\/NULL\/' + P.pu + '\//.test(C.journal(P.id)) || new RegExp('^AJOUT/NULL/' + P.pu + '/NULL/25/').test(C.journal(P.id)), C.journal(P.id));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    C.retirerReferences();
    await sess.b.close();
    C.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
