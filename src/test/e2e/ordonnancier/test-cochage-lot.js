/* CAS 3 DU 03/11/2026, TEST D'ECRAN 3 : cochage en lot, confirmation DANS le bouton.
 *
 * Onglet « Produits sensibles », recherche sur un debut de designation qui rend 3 a 5 produits :
 *  - « Cocher tout le résultat » : le premier clic demande le nombre au serveur et l'inscrit dans le bouton
 *    (« Cocher N produit(s) ? Confirmer »), sans aucune fenetre ; sans second clic dans les 10 s, le bouton revient a
 *    l'etat initial et rien n'est ecrit ;
 *  - deux clics : le lot est applique, la grille rechargee, les N produits sont sensibles en base ;
 *  - « Décocher tout le résultat », deux clics : l'etat initial est rendu.
 * Les drapeaux des produits sont remis a leur valeur d'avant, le journal nettoye.
 */
const { chromium } = require('playwright-core');
const C = require('./commun');

const DEBUT = C.q('SELECT NOW()');
/* un debut de designation (6 caracteres, pas un CIP) qui rend entre 3 et 5 produits actifs de l'officine */
const PREFIXE = C.q("SELECT LEFT(f.str_NAME, 6) p FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable' AND LEFT(f.str_NAME, 6) NOT REGEXP '^[0-9]' GROUP BY p HAVING COUNT(*) BETWEEN 3 AND 5 ORDER BY p LIMIT 1");
const produits = C.q("SELECT CONCAT_WS('~', f.lg_FAMILLE_ID, IFNULL(f.is_sensible, 0)) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable' AND f.str_NAME LIKE '" + PREFIXE.replace(/'/g, "''") + "%'")
  .split(/\n/).filter(Boolean).map((l) => { const [id, sensible] = l.split('~'); return { id, sensible }; });
const N = produits.length;
const ids = "('" + produits.map((x) => x.id).join("','") + "')";
const sensibles = () => C.q("SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID IN " + ids + " AND is_sensible = 1");

function nettoyer() {
  produits.forEach((x) => C.q("UPDATE t_famille SET is_sensible = " + x.sensible + " WHERE lg_FAMILLE_ID = '" + x.id + "'"));
  C.q("DELETE FROM t_event_log WHERE str_TYPE_LOG = 'lot' AND str_DESCRIPTION LIKE '%sensible en lot%' AND dt_CREATED >= '" + DEBUT + "'");
}

/* un clic sur un bouton de lot, et la reponse du serveur qu'il provoque */
async function clicLot(p, bouton) {
  const rep = p.waitForResponse((r) => /fichearticle\/ordonnancier\/lot/.test(r.url()), { timeout: 120000 });
  await C.vues.cliquer(p, 'ordonnancier #ongletSensibles #' + bouton);
  const r = await rep;
  const corps = await r.json().catch(() => ({}));
  await p.waitForTimeout(800);
  return corps;
}

(async () => {
  C.ok('Jeu d\'essai : un début de désignation qui rend 3 à 5 produits, aucun sensible', N >= 3 && N <= 5 && sensibles() === '0', PREFIXE + ' -> ' + N);
  const b = await C.ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await C.vues.connexion(p, C.ENV_E2E.LOGIN, 'e2etest');
    await C.ouvrirOnglet(p, 'Produits sensibles', 'ongletSensibles');
    let lignes = await C.chercherProduits(p, 'ongletSensibles', PREFIXE, 'Tous');
    C.ok('La recherche rend les ' + N + ' produits, non cochés', lignes.length === N && lignes.every((l) => l.sensible === false), lignes.length);
    C.ok('Le compteur affiche le nombre', new RegExp('\\b' + N + '\\b').test(await C.texteCompteur(p, 'ongletSensibles')), await C.texteCompteur(p, 'ongletSensibles'));

    /* premier clic : le nombre dans le bouton, aucune fenetre, rien d'ecrit */
    const sim = await clicLot(p, 'btnCocherTout');
    C.ok('Premier clic : le serveur compte sans écrire (simuler)', sim.success === true && sim.nombre === N && sensibles() === '0', JSON.stringify(sim));
    let texte = await C.texteBouton(p, 'ongletSensibles', 'btnCocherTout');
    C.ok('Le bouton demande confirmation avec le nombre, sans fenêtre', new RegExp('Cocher ' + N + ' produit\\(s\\) \\? Confirmer').test(texte)
      && (await C.vues.texteMessage(p)) === '', texte);
    await p.waitForTimeout(10800);
    texte = await C.texteBouton(p, 'ongletSensibles', 'btnCocherTout');
    C.ok('Sans second clic dans les 10 s, le bouton revient à l\'état initial et rien n\'est écrit', texte === 'Cocher tout le résultat' && sensibles() === '0', texte);

    /* deux clics : le lot est applique */
    await clicLot(p, 'btnCocherTout');
    const chargement = p.waitForResponse((r) => /fichearticle\/ordonnancier\?/.test(r.url()), { timeout: 60000 });
    const appli = await clicLot(p, 'btnCocherTout');
    await chargement;
    await p.waitForTimeout(800);
    C.ok('Second clic : le lot est appliqué', appli.success === true && appli.nombre === N && sensibles() === String(N), JSON.stringify(appli));
    texte = await C.texteBouton(p, 'ongletSensibles', 'btnCocherTout');
    C.ok('Le bouton rend compte (« N produit(s) coché(s) »)', new RegExp(N + ' produit\\(s\\) coché\\(s\\)').test(texte), texte);
    lignes = await C.lignesOnglet(p, 'ongletSensibles');
    C.ok('La grille rechargée montre les ' + N + ' produits cochés', lignes.length === N && lignes.every((l) => l.sensible === true));
    C.ok('Le lot est journalisé', C.q("SELECT COUNT(*) FROM t_event_log WHERE str_TYPE_LOG = 'lot' AND str_DESCRIPTION LIKE '" + N + " produit(s) coché(s) sensible en lot%' AND dt_CREATED >= '" + DEBUT + "'") === '1');
    lignes = await C.chercherProduits(p, 'ongletSensibles', PREFIXE, 'Produits cochés');
    C.ok('Filtre « cochés » : les ' + N + ' produits', lignes.length === N);

    /* decocher : etat initial */
    await clicLot(p, 'btnDecocherTout');
    texte = await C.texteBouton(p, 'ongletSensibles', 'btnDecocherTout');
    C.ok('Décocher : le bouton demande confirmation avec le nombre', new RegExp('Décocher ' + N + ' produit\\(s\\) \\? Confirmer').test(texte), texte);
    const chargement2 = p.waitForResponse((r) => /fichearticle\/ordonnancier\?/.test(r.url()), { timeout: 60000 });
    const retire = await clicLot(p, 'btnDecocherTout');
    await chargement2;
    await p.waitForTimeout(800);
    C.ok('« Décocher » remet l\'état initial en base', retire.success === true && retire.nombre === N && sensibles() === '0', JSON.stringify(retire));
    lignes = await C.lignesOnglet(p, 'ongletSensibles');
    C.ok('Filtre « cochés » après décochage : plus rien', lignes.length === 0, lignes.length);
    C.ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    await p.screenshot({ path: C.ENV_E2E.TMP + '/ordonnancier-lot-echec.png' }).catch(() => {});
    C.ok('Parcours sans exception', false, (await C.vues.texteMessage(p).catch(() => '')) + ' ' + e.stack);
  } finally {
    await b.close();
    nettoyer();
    C.ok('Drapeaux des produits remis', sensibles() === String(produits.filter((x) => x.sensible === '1').length));
  }
  process.exit(C.bilan() ? 1 : 0);
})();
