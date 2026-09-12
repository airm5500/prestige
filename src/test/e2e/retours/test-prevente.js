/* Retours des tests du 12/09 - point 13 : prevente.
 *
 * La caissiere cree une prevente (statut « pending »), ajoute un produit puis un deuxieme : le serveur repondait
 * « Cette vente a ete cloturee ... » parce que le controle de vente modifiable n'acceptait que « is_Process ».
 *
 * Le test rejoue exactement les appels de l'ecran de vente (memes routes, memes parametres que VenteCtr) depuis la
 * session du navigateur, et verifie que :
 *  - le deuxieme produit s'ajoute sur une prevente et la vente reste « pending » avec deux lignes ;
 *  - une vente ordinaire (is_Process) s'enrichit toujours ;
 *  - une vente cloturee reste refusee (le garde-fou d'origine n'est pas perdu) ;
 *  - le retrait d'une ligne de prevente passe aussi.
 * Les ventes creees sont retirees a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });

const crees = [];
function purger() {
  crees.forEach(function (id) {
    exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + id + "';"
      + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + id + "';");
  });
}

(async () => {
  const produits = q("SELECT f.lg_FAMILLE_ID, f.int_PRICE FROM t_famille f JOIN t_famille_stock s"
    + " ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
    + " WHERE s.int_NUMBER_AVAILABLE>10 AND f.int_PRICE>0 AND f.str_STATUT='enable' LIMIT 2")
    .split('\n').map(l => l.split('\t'));
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  ok('deux produits en stock', produits.length === 2, JSON.stringify(produits));

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(1500);

  const poster = (url, corps) => p.evaluate(async (a) => {
    const r = await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a.corps) });
    return { statut: r.status, corps: await r.text() };
  }, { url, corps });
  const params = (produit, venteId, prevente) => ({
    typeVenteId: '1', natureVenteId: '1', produitId: produit[0], itemPu: Number(produit[1]), qte: 1, qteServie: 1,
    devis: false, remiseId: '', venteId: venteId, userVendeurId: user, prevente: prevente
  });
  const lire = (r) => { try { return JSON.parse(r.corps); } catch (e) { return { success: false, msg: r.corps.slice(0, 200) }; } };

  try {
    /* ------------------------------------------------- prevente : premier puis deuxieme produit */
    let r = lire(await poster('../api/v1/vente/add/vno', params(produits[0], null, true)));
    const preventeId = r.success && r.data ? r.data.lgPREENREGISTREMENTID : null;
    if (preventeId) { crees.push(preventeId); }
    ok('la prevente se cree avec son premier produit', !!preventeId, JSON.stringify(r).slice(0, 200));
    ok('la prevente porte le statut pending', preventeId && q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + preventeId + "'") === 'pending');

    r = lire(await poster('../api/v1/vente/add/item', params(produits[1], preventeId, true)));
    ok('le deuxieme produit s ajoute a la prevente (point 13)', r.success === true, JSON.stringify(r).slice(0, 200));
    ok('aucun message de vente cloturee', !/clôturée|cloturee/i.test(r.msg || ''), r.msg);
    ok('la prevente compte deux lignes et reste pending', preventeId
      && q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + preventeId + "'") === '2'
      && q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + preventeId + "'") === 'pending');

    // le meme produit une deuxieme fois : la quantite se cumule sur la ligne existante
    r = lire(await poster('../api/v1/vente/add/item', params(produits[1], preventeId, true)));
    ok('le meme produit rejoue cumule la quantite sur la prevente', r.success === true
      && q("SELECT int_QUANTITY FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + preventeId
        + "' AND lg_FAMILLE_ID='" + produits[1][0] + "'") === '2', JSON.stringify(r).slice(0, 200));

    // retrait d'une ligne de la prevente : passe aussi par le controle de vente en cours
    const ligne = q("SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='"
      + preventeId + "' AND lg_FAMILLE_ID='" + produits[1][0] + "'");
    r = lire(await poster('../api/v1/vente/remove/vno/item/' + ligne, {}));
    ok('le retrait d une ligne de prevente est accepte', r.success !== false
      && q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + preventeId + "'") === '1', JSON.stringify(r).slice(0, 200));

    /* ------------------------------------------------- vente ordinaire : inchangee */
    r = lire(await poster('../api/v1/vente/add/vno', params(produits[0], null, false)));
    const venteId = r.success && r.data ? r.data.lgPREENREGISTREMENTID : null;
    if (venteId) { crees.push(venteId); }
    ok('une vente ordinaire se cree (is_Process)', venteId
      && q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'") === 'is_Process');
    r = lire(await poster('../api/v1/vente/add/item', params(produits[1], venteId, false)));
    ok('le deuxieme produit s ajoute toujours a une vente ordinaire', r.success === true, JSON.stringify(r).slice(0, 200));

    /* ------------------------------------------------- vente cloturee : toujours refusee, sans erreur 500
       (les ventes cloturees du banc appartiennent a des utilisateurs disparus, illisibles par JPA :
        le test cloture donc lui-meme la vente ordinaire qu'il vient de creer) */
    const cloturee = venteId;
    exec("UPDATE t_preenregistrement SET str_STATUT='is_Closed' WHERE lg_PREENREGISTREMENT_ID='" + cloturee + "';");
    const brut = await poster('../api/v1/vente/add/item', params(produits[1], cloturee, false));
    r = lire(brut);
    ok('une vente cloturee reste refusee proprement', brut.statut === 200 && r.success === false
      && /clôturée|cloturee|modifiée|modifiee/i.test(r.msg || ''), JSON.stringify(r).slice(0, 200));
    ok('la vente cloturee n a pas ete touchee', q("SELECT int_QUANTITY FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='"
      + cloturee + "' AND lg_FAMILLE_ID='" + produits[1][0] + "'") === '1');
  } finally {
    purger();
    ok('les ventes d essai sont retirees', crees.length === 0
      || q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + crees.join("','") + "')") === '0');
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS' + (ko ? '  (' + ko + ' FAIL)' : ''));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); purger(); process.exit(2); });
