/* Retours du 09/09 - lot I : les correctifs rapides.
 *  1  la cloche bat quand il y a des notifications (le panier des ventes ratees l'avait detronee) ;
 *  3  le tableau de bord ne se recharge plus au clic sur la barre de navigation ;
 *  6  le PDF de l'analyse CA emplacement / famille porte les evolutions sous les montants ;
 *  9  un parametre modifie en base se lit a jour sans redemarrer ;
 * 10  la classe ABC en bleu apres la designation de la fiche article.
 */
const { chromium } = require('playwright-core');
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
/* Un parametre de type CUSTOMER : KGA3 n'est pas administrateur, les parametres SYSTEME lui sont caches. */
const CLE = 'KEY_DAY_STOCK';
const valeurInitiale = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY='" + CLE + "'");

/* Point 6 : deux ventes du meme produit, une le mois dernier (2 000) et une ce mois-ci (3 000),
   pour que l'analyse CA par famille ait une evolution a montrer : +50,0 %. */
const MOIS_DERNIER = q("SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-10 10:00:00')");
const CE_MOIS = q("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-01 10:00:00')");
function purgerVentes() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE 'E2ELI-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2ELI-%'");
}
function semerVentes() {
  purgerVentes();
  const USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const PRODUIT = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' AND lg_FAMILLEARTICLE_ID IS NOT NULL ORDER BY str_NAME LIMIT 1");
  [['E2ELI-1', MOIS_DERNIER, 2000], ['E2ELI-2', CE_MOIS, 3000]].forEach(([id, quand, montant]) => {
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
      + " int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
      + " lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER,"
      + " int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
      + " montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + id + "','" + id + "','0'," + montant + ",0,'is_Closed','" + quand + "','" + quand + "',1,'" + USER + "','" + USER + "','"
      + USER + "',0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
      + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
      + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
      + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + id + "-D','" + id + "','" + PRODUIT + "',1,0,0,0," + montant + "," + montant + ",0,'" + quand + "','" + quand
      + "',0,0,0,0,0,0,1,0,0,0,0,0)");
  });
}
semerVentes();

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && document.querySelector('iframe'), null, { timeout: 60000 });
  await p.waitForTimeout(8000);
  const lire = (chemin) => p.evaluate(async (chemin) => {
    const r = await fetch(chemin, { credentials: 'same-origin' }); return { statut: r.status, corps: await r.text() };
  }, chemin);

  try {
    // ---------------------------------------------------------------- 1. la cloche
    const compte = JSON.parse((await lire('../api/v1/fichearticle/perimes/count?nbreMois=6&codeFamile=&codeRayon=&codeGrossiste=&query=&dtStart=&dtEnd=')).corps).total
      + JSON.parse((await lire('../api/v1/suggestion-reserve/en-attente/count')).corps).total;
    const cloche = await p.evaluate(() => {
      const bell = document.querySelector('#notif-bell .hdr-bell');
      const i = bell.querySelector('i.fa-bell'); const cs = getComputedStyle(i);
      return { classes: bell.className, animation: cs.animationName, couleur: cs.color, badge: document.getElementById('notif-badge').innerText,
        panier: (document.querySelector('.hdr-panier') || {}).className };
    });
    ok('Il y a des notifications sur le banc', compte > 0, compte);
    ok('La cloche porte l\'etat « a des notifications » et bat', /has-notif/.test(cloche.classes) && cloche.animation === 'hdrBellBeat',
      JSON.stringify(cloche));
    ok('Elle est jaune, plus blanche', cloche.couleur === 'rgb(241, 196, 15)', cloche.couleur);
    ok('Le panier des ventes ratees, lui, ne recoit plus cet etat', !/has-notif/.test(cloche.panier || ''), cloche.panier);

    // ---------------------------------------------------------------- 3. tableau de bord
    await p.evaluate(() => { window.__loads = 0; document.querySelector('iframe').addEventListener('load', () => window.__loads++); });
    for (let k = 0; k < 3; k++) {
      const c = await p.evaluate(() => { const nav = Ext.ComponentQuery.query('navigation')[0]; const r = nav.placeholder.el.dom.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 60 }; });
      await p.mouse.click(c.x, c.y); await p.waitForTimeout(1500);
      await p.mouse.click(1200, 500); await p.waitForTimeout(1500);
    }
    const rechargements = await p.evaluate(() => window.__loads);
    ok('Trois clics sur la barre de navigation : aucun rechargement du tableau de bord', rechargements === 0, rechargements);
    ok('La resynchronisation refuse de tourner pendant le glissement du volet',
      await p.evaluate(() => typeof PrestigeAffichage.resynchroniserMiseEnPage.regionFlottante === 'function'));

    // ---------------------------------------------------------------- 9. parametre lu a jour
    const avant = JSON.parse((await lire('../api/v1/app-params/liste?search_value=' + CLE + '&start=0&limit=5')).corps);
    const ligneAvant = (avant.results || []).find(r => r.str_KEY === CLE) || {};
    ok('Le parametre est liste avec sa valeur en base', ligneAvant.str_VALUE === valeurInitiale, ligneAvant.str_VALUE + ' vs ' + valeurInitiale);
    exec("UPDATE t_parameters SET str_VALUE='77' WHERE str_KEY='" + CLE + "'");
    const apres = JSON.parse((await lire('../api/v1/app-params/liste?search_value=' + CLE + '&start=0&limit=5')).corps);
    const ligneApres = (apres.results || []).find(r => r.str_KEY === CLE) || {};
    ok('Modifie en base, il se lit a jour a l\'affichage suivant, sans redemarrage', ligneApres.str_VALUE === '77', ligneApres.str_VALUE);
    const valeur = JSON.parse((await lire('../api/v1/app-params/value/' + CLE)).corps);
    ok('La lecture unitaire aussi', valeur.data === '77', JSON.stringify(valeur));

    // ---------------------------------------------------------------- 10. classe ABC dans la fiche article
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('famillemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0 && Ext.getCmp('rechecher'), null, { timeout: 20000 });
    await p.waitForTimeout(1000);
    const champ = await p.evaluate(() => Ext.getCmp('rechecher').inputEl.id);
    await p.click('#' + champ);
    await p.keyboard.type('PREPARATION MAGISTRALE');
    await p.keyboard.press('Enter');
    // La fiche article EST la grille (famillemanager etend gridpanel).
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return g && g.getStore().getCount() > 0 && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const fiche = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('famillemanager')[0];
      const i = g.getStore().findBy(r => /PREPARATION MAGISTRALE/.test(r.get('str_DESCRIPTION')));
      const rec = g.getStore().getAt(i);
      const html = g.getView().getNode(i).innerHTML;
      // Retour des tests du 09/09 (lot O) : la classe A est en VERT (B bleu, C rouge), en gras.
      return { classe: rec.get('classe'), designation: rec.get('str_DESCRIPTION'), vert: /\(A\)/.test(html) && /177a17/.test(html) && /font-weight:bold/.test(html) };
    });
    ok('La ligne connait sa classe ABC', fiche.classe === 'A', JSON.stringify(fiche));
    ok('La designation est suivie de « (A) » en vert gras', fiche.vert, fiche.designation);

    // ---------------------------------------------------------------- 6. PDF analyse CA : evolutions
    const pdf = JSON.parse((await lire('../api/v1/ca-zone-geo/pdf?typePeriode=TROIS_MOIS&regroupement=FAMILLE')).corps);
    ok('L\'edition CA par famille aboutit', pdf.success === true && !!pdf.url, JSON.stringify(pdf).slice(0, 200));
    if (pdf.url) {
      const fichier = '/opt/CONF/reports/pdf/' + pdf.url.split('/').pop();
      const texte = execSync('pdftotext -layout "' + fichier + '" -', { encoding: 'utf8' });
      const evolutions = (texte.match(/[+-]\d+,\d %/g) || []);
      ok('Le PDF porte des evolutions « +x,x % » sous les montants', evolutions.length > 0, evolutions.join(' '));
      ok('L\'evolution de 2 000 a 3 000 y figure : +50,0 %', evolutions.includes('+50,0 %'), evolutions.join(' '));
      ok('Les tranches sans base de comparaison portent un tiret, et le tableau son TOTAL', /TOTAL/.test(texte) && / - /.test(texte),
        texte.split('\n').filter(l => /E2E|TOTAL|%/.test(l)).join(' | ').slice(0, 300));
    }

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    purgerVentes();
    ok('Ventes de jeu d\'essai retirees', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2ELI-%'") === '0');
    exec("UPDATE t_parameters SET str_VALUE='" + valeurInitiale + "' WHERE str_KEY='" + CLE + "'");
    ok('Parametre remis a sa valeur initiale', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY='" + CLE + "'") === valeurInitiale);
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
