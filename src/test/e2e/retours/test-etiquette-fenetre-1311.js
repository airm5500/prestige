/* GESTION ETIQUETTE > « Creer » (etiquetage massif, ecran doEtiquette) : FENETRE MODALE ET RECHERCHE A PARTIR DE
 * 3 CARACTERES (plan du 12/11).
 *
 * Constat : « Creer » remplacait la liste des etiquettes par l'ecran d'etiquetage massif ; a l'ouverture, la liste
 * d'articles etait chargee sans aucun texte (tous les articles), et un clic sur la fleche du champ « Article » la
 * redemandait sans texte.
 * Attendu : une fenetre modale au-dessus de la liste des etiquettes, entiere dans l'ecran, le curseur dans « Article » ;
 * aucune recherche d'article avant 3 caracteres (ni a l'ouverture, ni par la fleche) ; « Annuler » ou Echap ferment la
 * fenetre et la liste des etiquettes est toujours la, rechargee.
 *
 * Vrai chemin (admin) : menu de la gestion des etiquettes, bouton « Creer », saisie au clavier, choix a la souris dans
 * la liste, quantite au clavier puis Entree. Deux articles, quantites 2 et 3, plus une quantite modifiee dans la grille.
 * Controles :
 *  - fenetre modale, au-dessus de la liste des etiquettes (toujours affichee derriere), entiere dans l'ecran ;
 *  - requetes « produits » : aucune a l'ouverture, aucune a 1 et 2 caracteres, aucune par la fleche avec 2 caracteres ;
 *    a 3 caracteres, une requete dont le texte est celui saisi ; chaque article propose commence par ce texte ;
 *  - rapprochement : lignes du panier dans la grille (CIP, designation, quantite) = t_etiquette en preparation =
 *    API du panier ;
 *  - bilan : seules les lignes de ces deux articles sont ajoutees au panier ; retirees a la fin ;
 *  - Annuler : la fenetre se ferme, la liste des etiquettes reste ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const EMP = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'") || '1';

/* articles actifs du depot, dont les 6 premieres lettres designent moins de 15 articles */
function articles() {
  const l = q(`SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_DESCRIPTION FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '${EMP}'
    WHERE f.str_STATUT = 'enable' AND f.str_DESCRIPTION REGEXP '^[A-Z]{6}' AND f.int_CIP REGEXP '^[0-9]{7}$'
    AND NOT EXISTS (SELECT 1 FROM t_etiquette e WHERE e.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND e.str_STATUT = 'is_Process')
    ORDER BY f.lg_FAMILLE_ID LIMIT 40 OFFSET 100`).split('\n').map((x) => x.split('\t'));
  const choisis = [];
  for (const [id, cip, des] of l) {
    const debut = des.substr(0, 6);
    if (choisis.some((c) => c.debut.substr(0, 3) === debut.substr(0, 3))) { continue; }
    if (Number(q(`SELECT COUNT(*) FROM t_famille WHERE str_DESCRIPTION LIKE '${debut}%'`)) < 15) { choisis.push({ id, cip, des, debut }); }
    if (choisis.length === 2) { break; }
  }
  return choisis;
}
const A = articles();
const panier = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(f.int_CIP, '|', e.int_NUMBER) ORDER BY f.int_CIP), '') FROM t_etiquette e JOIN t_famille f ON f.lg_FAMILLE_ID = e.lg_FAMILLE_ID
  WHERE e.str_STATUT = 'is_Process' AND e.lg_FAMILLE_ID IN ('${A.map((a) => a.id).join("','")}')`);
const totalPanier = () => q("SELECT COUNT(*) FROM t_etiquette WHERE str_STATUT = 'is_Process'");
function retirer() { if (A.length) { q(`DELETE FROM t_etiquette WHERE str_STATUT IN ('is_Process', 'delete') AND lg_FAMILLE_ID IN ('${A.map((a) => a.id).join("','")}') AND dt_CREATED >= CURDATE()`); } }

(async () => {
  ok('Précondition : deux articles d\'essai', A.length === 2, JSON.stringify(A));
  if (A.length !== 2) { process.exit(1); }
  const total0 = totalPanier();
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    const erreurs = [], dialogues = [], produits = [];
    p.on('pageerror', (e) => erreurs.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.on('request', (r) => { const m = r.url().match(/etiquette-panier\/produits\?(.*)$/); if (m) { produits.push(new URLSearchParams(m[1]).get('query')); } });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lib = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'etiquette', true);
      return n ? [n.parentNode.get('text'), n.get('text')] : null; });
    if (!lib) { throw new Error('menu etiquette absent pour ce compte'); }
    await ouvrirMenu(p, lib[0], lib[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('etiquette').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(2500);
    const voilesAvant = await p.evaluate(() => Array.prototype.filter.call(document.querySelectorAll('.x-mask'), (m) => m.offsetParent !== null && getComputedStyle(m).display !== 'none'
        && m.getBoundingClientRect().width > 0).map((m) => (m.parentNode.id || m.parentNode.className).slice(0, 60) + ' ' + Math.round(m.getBoundingClientRect().width)
        + ' ' + (m.innerText || '').slice(0, 30) + ' ' + getComputedStyle(m).opacity + ' ' + getComputedStyle(m).backgroundColor));
    produits.length = 0;
    await cliquer(p, 'etiquette button[text=Creer]');
    await p.waitForFunction(() => Ext.getCmp('str_NAME') && Ext.getCmp('str_NAME').isVisible(true) && Ext.getCmp('gridpanelID') && !Ext.getCmp('gridpanelID').getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const fen = await p.evaluate(() => {
      const d = Ext.ComponentQuery.query('doEtiquette')[0], w = d && d.up('window'), liste = Ext.ComponentQuery.query('etiquette')[0];
      const r = w ? w.getEl().dom.getBoundingClientRect() : null;
      return { fenetre: !!w, modale: !!w && w.modal === true && w.isVisible(), dedans: !!r && r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth,
        liste: !!liste && !liste.isDestroyed && liste.isVisible(true), focus: document.activeElement === Ext.getCmp('str_NAME').inputEl.dom };
    });
    ok('« Creer » : fenêtre modale au-dessus de la liste des étiquettes, entière dans l\'écran', fen.fenetre && fen.modale && fen.dedans && fen.liste, JSON.stringify(fen));
    ok('Curseur dans « Article » à l\'ouverture', fen.focus);
    ok('Ouverture : aucune recherche d\'article', produits.length === 0, JSON.stringify(produits));

    const champ = '#' + await p.evaluate(() => Ext.getCmp('str_NAME').inputEl.dom.id);
    const ajouter = async (a, qte) => {
      produits.length = 0;
      await p.click(champ);
      await p.keyboard.press('Control+A');
      await p.keyboard.press('Delete');
      await p.keyboard.type(a.debut.substr(0, 1), { delay: 30 });
      await p.waitForTimeout(900);
      const apres1 = produits.length;
      await p.keyboard.type(a.debut.substr(1, 1), { delay: 30 });
      await p.waitForTimeout(900);
      const apres2 = produits.length;
      /* fleche du champ avec 2 caracteres */
      await p.click('#' + await p.evaluate(() => Ext.getCmp('str_NAME').triggerEl.first().dom.id));
      await p.waitForTimeout(900);
      const fleche = produits.length;
      await p.click(champ);
      await p.keyboard.press('End');
      await p.keyboard.type(a.debut.substr(2), { delay: 30 });
      /* la liste doit montrer les articles de CE texte (pas ceux d'une recherche precedente) */
      await p.waitForFunction((c) => Array.from(document.querySelectorAll('.x-boundlist-item')).some((x) => x.offsetParent !== null && x.innerText.indexOf(c) >= 0), a.cip, { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(400);
      const propose = await p.$$eval('.x-boundlist-item', (l) => l.filter((x) => x.offsetParent !== null).map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
      ok(`${a.debut} : aucune recherche à 1 et 2 caractères, ni par la flèche`, apres1 === 0 && apres2 === 0 && fleche === 0, JSON.stringify(produits));
      ok(`${a.debut} : recherche lancée à partir de 3 caractères, avec le texte saisi`, produits.length >= 1 && produits.every((x) => x && x.length >= 3)
        && produits[produits.length - 1] === a.debut, JSON.stringify(produits));
      ok(`${a.debut} : articles proposés trouvés par ce texte, dont ${a.cip}`, propose.some((x) => x.indexOf(a.cip) >= 0), propose.slice(0, 5).join(' / '));
      await p.locator('.x-boundlist-item:visible', { hasText: a.cip }).first().click();
      await p.waitForTimeout(500);
      await p.keyboard.press('Control+A');
      await p.keyboard.type(String(qte));
      await p.keyboard.press('Enter');
      await p.waitForFunction((c) => Ext.getCmp('gridpanelID').getStore().findExact('int_CIP', c) >= 0, a.cip, { timeout: 15000 });
      await p.waitForTimeout(500);
    };
    await ajouter(A[0], 2);
    await ajouter(A[1], 3);
    /* quantite modifiee dans la grille : 3 -> 4 */
    const rang = await p.evaluate((c) => Ext.getCmp('gridpanelID').getStore().findExact('int_CIP', c), A[1].cip);
    await p.locator('#gridpanelID .x-grid-row').nth(rang).locator('.x-grid-cell').nth(3).click();
    await p.waitForTimeout(400);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('4');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(2000);

    if (process.env.CAPTURE_FENETRE) { await p.screenshot({ path: process.env.CAPTURE_FENETRE }); }
    /* ergonomie : aucun champ ni bouton de la fenetre ne deborde a droite */
    const deborde = await p.evaluate(() => { const w = Ext.ComponentQuery.query('doEtiquette')[0].up('window'), d = w.body.dom.getBoundingClientRect().right;
      return Ext.ComponentQuery.query('field, button', w).filter((c) => c.isVisible(true) && c.getEl().dom.getBoundingClientRect().right > d + 1).map((c) => c.name || c.text || c.id); });
    ok('Ergonomie : aucun champ ni bouton ne déborde de la fenêtre', deborde.length === 0, deborde.join(', '));
    const attendu = [[A[0].cip, 2], [A[1].cip, 4]].sort().map((x) => x.join('|')).join(',');
    const grille = await p.evaluate((cips) => Ext.getCmp('gridpanelID').getStore().getRange().filter((r) => cips.includes(String(r.get('int_CIP'))))
      .map((r) => r.get('int_CIP') + '|' + r.get('int_NUMBER')).sort().join(','), A.map((a) => a.cip));
    const api = await p.evaluate(async (cips) => { const r = await (await fetch('../api/v1/etiquette-panier?start=0&limit=200')).json();
      return (r.results || []).filter((x) => cips.includes(String(x.int_CIP))).map((x) => x.int_CIP + '|' + x.int_NUMBER).sort().join(','); }, A.map((a) => a.cip));
    ok('Rapprochement : grille = base (t_etiquette en préparation) = API du panier = saisi (2 et 4)', grille === attendu && panier() === attendu && api === attendu,
      `grille ${grille} / base ${panier()} / api ${api} / attendu ${attendu}`);
    ok('Bilan : exactement deux lignes ajoutées au panier', Number(totalPanier()) === Number(total0) + 2, total0 + ' -> ' + totalPanier());

    await cliquer(p, 'doEtiquette button[text=Annuler]');
    await p.waitForTimeout(3000);
    const apres = await p.evaluate(() => ({ fenetre: Ext.ComponentQuery.query('doEtiquette').length, liste: Ext.ComponentQuery.query('etiquette').some((x) => x.isVisible(true)),
      masque: (() => Array.prototype.filter.call(document.querySelectorAll('.x-mask'), (m) => m.offsetParent !== null && getComputedStyle(m).display !== 'none'
        && m.getBoundingClientRect().width > 0).map((m) => (m.parentNode.id || m.parentNode.className).slice(0, 60) + ' ' + Math.round(m.getBoundingClientRect().width)
        + ' ' + (m.innerText || '').slice(0, 30) + ' ' + getComputedStyle(m).opacity + ' ' + getComputedStyle(m).backgroundColor))() }));
    ok('Annuler : fenêtre fermée, liste des étiquettes affichée, sans voile', apres.fenetre === 0 && apres.liste && JSON.stringify(apres.masque) === JSON.stringify(voilesAvant), JSON.stringify(apres) + ' avant ' + JSON.stringify(voilesAvant));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    ok('Remise en état : panier comme avant', totalPanier() === total0 && panier() === '', totalPanier() + ' / ' + total0);
  }
  const n = res.filter((r) => r.c).length;
  console.log('===== ' + n + '/' + res.length + (n === res.length ? ' PASS' : ' ECHEC') + ' =====');
  process.exit(n === res.length ? 0 : 1);
})();
