/* DEMANDE DU 25/11 : DANS « MODELES DE TICKET », L'APERCU MONTRE LA PHARMACIE DE LA BASE.
 *
 * Question de l'utilisateur : « est il possible que dans le menu modele ticket, le nom de la pharmacie affiche soit
 * celui de la pharmacie dont on utilise la base de donnees ? ». Jusqu'ici l'apercu montrait une officine fictive
 * (« PHARMACIE DU PLATEAU »).
 *
 * Ecran « Modèles de ticket », par les vues, avec de vrais clics (1366 × 768). Ce que le test etablit :
 *  - rapprochement, pour chaque ticket clique (vente, vente assurance, ticket Z, reglement differe) et chaque largeur
 *    (58 et 80 mm) : le nom dessine dans l'apercu = t_officine.str_NOM_COMPLET ; le telephone et l'adresse remplis de la
 *    fiche aussi ; l'officine fictive n'apparait plus ;
 *  - rapprochement avec le vrai ticket : le nom de l'apercu = le nom dessine sur le ticket d'une vente close (texte de
 *    l'image du ticket, rien n'est imprime) ;
 *  - lecture seule : ni la fiche officine ni les reglages de ticket ne changent (bilan avant / apres) ;
 *  - delai d'affichage de l'apercu sous 5 s ; aucune fenetre, aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '--raw', '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const MENU = q("SELECT str_VALUE FROM t_menu WHERE lg_MENU_ID = '10'");
const OFFICINE = () => q("SELECT CONCAT_WS('|', IFNULL(str_NOM_COMPLET,''), IFNULL(str_PHONE,''), IFNULL(str_ADRESSSE_POSTALE,''), IFNULL(str_ENTETE,'')) FROM t_officine WHERE lg_OFFICINE_ID = '1'");
const TABLE = () => q("SELECT CONCAT_WS('|', ticket, largeur, MD5(reglages), maj) FROM ticket_modele ORDER BY ticket, largeur");
const OFF_AVANT = OFFICINE();
const TABLE_AVANT = TABLE();
const [NOM, TEL, ADRESSE] = OFF_AVANT.split('|');
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible()));
  const racine = '.mtk';
  let dernier = null;
  p.on('response', async (x) => { if (/modeles-ticket\/apercu/.test(x.url())) { try { dernier = await x.json(); } catch (e) { /* page fermee */ } } });
  const apresApercu = async (action) => {
    dernier = null;
    const r = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 30000 });
    r.catch(() => null);
    const t0 = Date.now();
    await action();
    await r;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    const duree = Date.now() - t0;
    for (let i = 0; i < 20 && !dernier; i++) { await p.waitForTimeout(100); }
    return duree;
  };
  const tout = (a) => Object.values((a && a.textes) || {}).flat().map(norm);
  try {
    ok('Fiche officine de la base lue (nom rempli)', NOM.length > 0, NOM);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const duree0 = await apresApercu(() => ouvrirMenu(p, MENU, 'Modèles de ticket'));
    ok('Délai d\'affichage du premier aperçu < 5 000 ms', duree0 < 5000, duree0 + ' ms');
    let delaiMax = 0;
    for (const mm of ['58', '80']) {
      const l = p.locator(racine + ` .mtk-barre [data-choix=largeur][data-valeur="${mm}"]`);
      if (await l.getAttribute('aria-checked') !== 'true') { delaiMax = Math.max(delaiMax, await apresApercu(() => l.click())); }
      for (const t of ['VENTE', 'VENTE_ASSURANCE', 'TICKET_Z', 'REGLEMENT_DIFFERE']) {
        const bouton = p.locator(racine + ` .mtk-ticket[data-ticket=${t}]`);
        if (!(await bouton.count())) { ok(`${t} présent dans la liste`, false); continue; }
        delaiMax = Math.max(delaiMax, await apresApercu(() => bouton.click()));
        const textes = tout(dernier);
        const nomDessine = textes.includes(norm(NOM));
        ok(`${t} ${mm} mm : nom de la pharmacie dessiné = base (« ${NOM} »), plus d'officine fictive`,
          nomDessine && !textes.some((x) => /PHARMACIE DU PLATEAU/.test(x)), JSON.stringify((dernier && dernier.textes) || {}).slice(0, 250));
        if (TEL) { ok(`${t} ${mm} mm : téléphone de la fiche présent`, textes.some((x) => x.includes(norm(TEL))), TEL); }
        if (ADRESSE) { ok(`${t} ${mm} mm : adresse de la fiche présente`, textes.some((x) => x.includes(norm(ADRESSE))), ADRESSE); }
      }
    }
    ok('Délai de chaque aperçu < 5 000 ms', delaiMax < 5000, delaiMax + ' ms');

    /* rapprochement avec le ticket d'une vraie vente close */
    const v = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE str_TYPE_VENTE = 'VNO' AND str_STATUT = 'is_Closed' AND int_PRICE > 0 ORDER BY dt_UPDATED DESC LIMIT 1");
    if (v) {
      const ap = await p.evaluate(async (id) => (await fetch('../api/v1/vente/ticket/vno/' + id + '/image/texte?largeur=80')).json(), v);
      const textesVente = ((ap.tickets && ap.tickets[0] && ap.tickets[0].blocs) || []).flatMap((x) => x.elements.flatMap((e) => [e.a, e.b, e.c, e.d])).map(norm);
      ok('Rapprochement : nom de l\'aperçu = nom sur le ticket d\'une vente close', textesVente.includes(norm(NOM)),
        JSON.stringify(textesVente.slice(0, 6)));
    } else {
      ok('Rapprochement : une vente close existe pour comparer', false, 'aucune vente');
    }
    ok('Aucune fenêtre surgissante', !(await fenetres()));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close().catch(() => null);
    ok('Bilan : fiche officine inchangée', OFFICINE() === OFF_AVANT);
    ok('Bilan : réglages de ticket inchangés', TABLE() === TABLE_AVANT);
    const echecs = res.filter((x) => !x.c).length;
    console.log((res.length - echecs) + '/' + res.length + (echecs ? ' ECHEC' : ' OK'));
    process.exit(echecs ? 1 : 0);
  }
})();
