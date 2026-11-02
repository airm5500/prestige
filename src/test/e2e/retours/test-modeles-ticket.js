/* DEMANDE DU 02/11 : MENU « MODELES DE TICKET » (PARAMETRAGES).
 *
 * Par les vues, avec de vrais clics. Ce que le test etablit :
 *  - le menu s'ouvre : dix tickets, l'apercu du ticket choisi s'affiche ; « Ticket Z » reste a l'ancien modele ;
 *  - 58 mm : l'apercu est plus etroit qu'a 80 mm ;
 *  - « Mouvement de caisse » : signatures actives par defaut ; les couper raccourcit l'apercu et active « Enregistrer » ;
 *  - glisser un bloc a la souris le deplace (ordre renvoye par le serveur), sans probleme bloquant ;
 *  - fleche gauche / droite au clavier : alignement du bloc choisi ;
 *  - « Enregistrer » : reglages en base (signatures coupees, disposition) ;
 *  - « Rétablir la disposition par défaut » : le premier clic pose la question dans le bouton, sans fenetre ;
 *  - largeur d'une imprimante changee par son bouton : en base ;
 *  - aucune erreur JavaScript.
 * Reglages et largeur d'imprimante remis comme avant.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MENU = q("SELECT str_VALUE FROM t_menu WHERE lg_MENU_ID = '10'");
const AVANT = q("SELECT HEX(reglages) FROM ticket_modele WHERE ticket = 'MOUVEMENT_CAISSE' AND largeur = 58");
const IMPRIMANTE = q("SELECT CONCAT_WS('|', lg_IMPRIMANTE_ID, int_LARGEUR_PAPIER) FROM t_imprimante WHERE COALESCE(str_STATUT, '') <> 'delete' ORDER BY str_NAME LIMIT 1");
const [IMP_ID, IMP_LARGEUR] = IMPRIMANTE ? IMPRIMANTE.split('|') : [];
const remettre = () => {
  q(AVANT ? `UPDATE ticket_modele SET reglages = UNHEX('${AVANT}') WHERE ticket = 'MOUVEMENT_CAISSE' AND largeur = 58`
    : "DELETE FROM ticket_modele WHERE ticket = 'MOUVEMENT_CAISSE' AND largeur = 58");
  if (IMP_ID) { q(`UPDATE t_imprimante SET int_LARGEUR_PAPIER = ${Number(IMP_LARGEUR)} WHERE lg_IMPRIMANTE_ID = '${IMP_ID}'`); }
};

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const racine = '.mtk';
  const apercu = () => p.evaluate(() => { const c = Ext.ComponentQuery.query('modelesticket')[0]; const a = c.etat.apercu;
    return a && { largeur: a.largeurImage, hauteur: a.hauteurImage, ordre: a.ordre, bloquants: a.bloquants, zones: Object.keys(a.zones) }; });
  /* attend un nouvel apercu (reponse du serveur puis image affichee) apres l'action donnee */
  const apresApercu = async (action) => {
    const r = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 30000 });
    await action();
    await r;
    await p.waitForTimeout(400);
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const premier = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 60000 });
    await ouvrirMenu(p, MENU, 'Modèles de ticket');
    await premier;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    const tickets = await p.locator(racine + ' .mtk-ticket').allInnerTexts();
    const z = tickets.find((t) => /^Ticket Z/.test(t)) || '';
    ok('Menu ouvert : dix tickets, aperçu affiché', tickets.length === 10, tickets.length);
    ok('« Ticket Z » reste à l\'ancien modèle', /Ancien modèle/.test(z), z);
    const a80 = await apercu();

    await apresApercu(() => p.locator(racine + ' .mtk-barre [data-choix=largeur][data-valeur="58"]').click());
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    const a58 = await apercu();
    ok('58 mm : aperçu plus étroit qu\'à 80 mm', a58 && a80 && a58.largeur < a80.largeur, a80 && a58 && a80.largeur + ' → ' + a58.largeur);

    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=MOUVEMENT_CAISSE]').click());
    const sig = p.locator(racine + ' [data-option=signatures]');
    ok('Mouvement de caisse : signatures actives par défaut', await sig.getAttribute('aria-checked') === 'true');
    const avantSig = await apercu();
    await apresApercu(() => sig.click());
    const sansSig = await apercu();
    const enregistrer = p.locator(racine + ' [data-action=enregistrer]');
    ok('Signatures coupées : aperçu plus court, « Enregistrer » actif', sansSig.hauteur < avantSig.hauteur && await enregistrer.isEnabled(),
      avantSig.hauteur + ' → ' + sansSig.hauteur);

    /* glisser le dernier bloc deplacable au-dessus du premier */
    const mobiles = await p.locator(racine + ' .mtk-zone.mtk-mobile').evaluateAll((l) => l.map((e) => e.getAttribute('data-bloc')));
    const [haut, bas] = [mobiles[0], mobiles[mobiles.length - 1]];
    const bh = await p.locator(racine + ` .mtk-zone[data-bloc=${haut}]`).boundingBox();
    const bb = await p.locator(racine + ` .mtk-zone[data-bloc=${bas}]`).boundingBox();
    await apresApercu(async () => {
      await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await p.mouse.down();
      await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2 - 20, { steps: 4 });
      await p.mouse.move(bh.x + bh.width / 2, bh.y + 2, { steps: 12 });
      await p.mouse.up();
    });
    const deplace = await apercu();
    const presents = deplace.ordre.filter((x) => mobiles.includes(x));
    ok('Bloc glissé à la souris : « ' + bas + ' » passe avant « ' + haut + ' », aucun problème bloquant',
      presents.indexOf(bas) < presents.indexOf(haut) && deplace.bloquants.length === 0, presents.join(',') + ' / ' + deplace.bloquants.join(' | '));

    /* bloc choisi (celui qui vient d'etre glisse), puis fleche droite : aligne a droite */
    await p.locator(racine + ' .mtk-papier').focus();
    await apresApercu(() => p.keyboard.press('ArrowRight'));
    const align = await p.evaluate((id) => { const c = Ext.ComponentQuery.query('modelesticket')[0]; const x = (c.reglages().disposition || []).find((d) => d.bloc === id); return x && x.alignement; }, bas);
    ok('Flèche droite au clavier : bloc choisi aligné (' + bas + ')', align === 'C' || align === 'D', align);

    await enregistrer.click();
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('modelesticket')[0]; return c && !c.etat.brouillons['58:MOUVEMENT_CAISSE']; }, null, { timeout: 30000 });
    const enBase = JSON.parse(q("SELECT reglages FROM ticket_modele WHERE ticket = 'MOUVEMENT_CAISSE' AND largeur = 58") || '{}');
    const ordreBase = (enBase.disposition || []).map((d) => d.bloc).filter((x) => mobiles.includes(x));
    ok('Enregistrer : signatures coupées et disposition en base', enBase.signatures === false && ordreBase.indexOf(bas) < ordreBase.indexOf(haut),
      JSON.stringify(enBase).slice(0, 250));

    const defaut = p.locator(racine + ' [data-action=defaut]');
    await defaut.click();
    const question = await defaut.innerText();
    const fenetre = await p.evaluate(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible()));
    ok('« Rétablir la disposition par défaut » : la question est dans le bouton, aucune fenêtre', /Confirmer/.test(question) && !fenetre, question);
    await apresApercu(() => defaut.click());
    const retabli = await p.evaluate(() => Ext.ComponentQuery.query('modelesticket')[0].reglages().disposition.length);
    ok('Second clic : disposition par défaut (brouillon)', retabli === 0, retabli);
    await p.locator(racine + ' [data-action=annuler]').click();

    if (IMP_ID) {
      const autre = Number(IMP_LARGEUR) === 58 ? 80 : 58;
      const rep = p.waitForResponse((x) => /modeles-ticket\/imprimante/.test(x.url()), { timeout: 30000 });
      await p.locator(racine + ` [data-choix="imprimante:${IMP_ID}"][data-valeur="${autre}"]`).click();
      await rep;
      ok('Largeur de l\'imprimante changée par son bouton : ' + autre + ' mm en base',
        q(`SELECT int_LARGEUR_PAPIER FROM t_imprimante WHERE lg_IMPRIMANTE_ID = '${IMP_ID}'`) === String(autre));
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    remettre();
    ok('Réglages et imprimante remis comme avant', q("SELECT COALESCE(HEX(MAX(reglages)), '') FROM ticket_modele WHERE ticket = 'MOUVEMENT_CAISSE' AND largeur = 58") === AVANT
      && (!IMP_ID || q(`SELECT int_LARGEUR_PAPIER FROM t_imprimante WHERE lg_IMPRIMANTE_ID = '${IMP_ID}'`) === IMP_LARGEUR));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
