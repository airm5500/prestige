/* PRODUITS EN AVOIR D'UN BON DE LIVRAISON (demande de l'officine du 05/10).
 *
 * « Une fois l'entree validee, afficher dans une fenetre les produits en avoir de cette commande (nom et telephone du
 * client), imprimable ; et un bouton dans l'etat de controle des achats. »
 *
 * Ce que le test etablit :
 *  - l'API rend, pour un bon, les ventes cloturees dont une ligne de ce produit est en avoir non servi, avec le client,
 *    son telephone, la quantite due et la quantite recue sur le bon ; une vente annulee n'y figure pas ;
 *  - un bon sans produit en avoir rend une liste vide ; le PDF s'ouvre dans l'onglet (inline) ;
 *  - apres l'entree en stock : la fenetre ne s'ouvre que s'il y a des avoirs, et la suite habituelle (impressions)
 *    n'est lancee qu'a sa fermeture ; sans avoir, la suite part tout de suite et aucune fenetre ne s'ouvre ;
 *  - l'entree en stock (doEntreeStock) passe bien par la fenetre avant la question d'impression ;
 *  - dans l'etat de controle des achats, la colonne AVOIRS ouvre la fenetre du bon de la ligne.
 *
 * Le jeu d'essai (deux ventes clonees d'une vente client existante) est retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const V1 = 'E2E-AVB-VENTE', V2 = 'E2E-AVB-ANNULEE';
/* Reference de ticket courte : la colonne est limitee a 10 caracteres. */
const REF = { [V1]: 'E2EAVB-V', [V2]: 'E2EAVB-A' };

const SAUVE = 'e2e_avb_snapshot';
let PRODUIT = null;

/* La pose du drapeau d'avoir (comme le fait l'application, par mise a jour : l'insertion le remet a 0) declenche la mise
   a jour des statistiques annuelles du produit (t_snapshot_famillesell) : ses lignes sont sauvegardees avant et
   restaurees a l'identique au nettoyage. */
function nettoyer() {
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='" + SAUVE + "'") === '1') {
    exec("DELETE FROM t_snapshot_famillesell WHERE lg_FAMILLE_ID=(SELECT lg_FAMILLE_ID FROM " + SAUVE + " WHERE lg_FAMILLE_ID IS NOT NULL LIMIT 1)"
      + " OR lg_FAMILLE_ID=(SELECT produit FROM " + SAUVE + "_produit);"
      + "INSERT INTO t_snapshot_famillesell SELECT * FROM " + SAUVE + ";DROP TABLE " + SAUVE + ";DROP TABLE " + SAUVE + "_produit;");
  }
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN ('" + V1 + "','" + V2 + "');"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + V1 + "','" + V2 + "');");
}

/* Un bon cloture avec au moins un produit, et une vente client cloturee a cloner. */
function poser() {
  nettoyer();
  const bon = q("SELECT b.lg_BON_LIVRAISON_ID FROM t_bon_livraison b WHERE b.str_STATUT='is_Closed' AND EXISTS"
    + " (SELECT 1 FROM t_bon_livraison_detail d WHERE d.lg_BON_LIVRAISON_ID=b.lg_BON_LIVRAISON_ID AND d.int_QTE_RECUE>0)"
    + " ORDER BY b.dt_UPDATED DESC LIMIT 1");
  const produit = q("SELECT lg_FAMILLE_ID FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID='" + bon
    + "' AND int_QTE_RECUE>0 ORDER BY lg_FAMILLE_ID LIMIT 1");
  const vente = q("SELECT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p JOIN t_client c ON c.lg_CLIENT_ID=p.lg_CLIENT_ID"
    + " WHERE p.str_STATUT='is_Closed' AND COALESCE(p.b_IS_CANCEL,0)=0 AND c.str_TELEPHONE<>'' AND EXISTS"
    + " (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID)"
    + " ORDER BY p.dt_UPDATED DESC LIMIT 1");
  if (!bon || !produit || !vente) { return null; }
  const detail = q("SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='"
    + vente + "' LIMIT 1");
  PRODUIT = produit;
  exec("CREATE TABLE " + SAUVE + " AS SELECT * FROM t_snapshot_famillesell WHERE lg_FAMILLE_ID='" + produit + "';"
    + "CREATE TABLE " + SAUVE + "_produit AS SELECT '" + produit + "' AS produit;");
  const cloner = (id, annulee) => "CREATE TEMPORARY TABLE tp AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='"
    + vente + "';UPDATE tp SET lg_PREENREGISTREMENT_ID='" + id + "', str_REF='" + REF[id] + "', str_REF_TICKET='" + REF[id]
    + "', b_IS_AVOIR=1, b_IS_CANCEL=" + (annulee ? 1 : 0) + ", dt_UPDATED=NOW();"
    + "INSERT INTO t_preenregistrement SELECT * FROM tp;DROP TEMPORARY TABLE tp;"
    + "CREATE TEMPORARY TABLE td AS SELECT * FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID='" + detail
    + "';UPDATE td SET lg_PREENREGISTREMENT_DETAIL_ID='" + id + "-D', lg_PREENREGISTREMENT_ID='" + id + "', lg_FAMILLE_ID='"
    + produit + "', int_QUANTITY=3, int_QUANTITY_SERVED=1, int_AVOIR=2, int_AVOIR_SERVED=0, str_STATUT='is_Closed';"
    + "INSERT INTO t_preenregistrement_detail SELECT * FROM td;DROP TEMPORARY TABLE td;"
    + "UPDATE t_preenregistrement_detail SET b_IS_AVOIR=1 WHERE lg_PREENREGISTREMENT_DETAIL_ID='" + id + "-D';";
  exec(cloner(V1, false) + cloner(V2, true));
  const client = q("SELECT CONCAT(TRIM(CONCAT(COALESCE(c.str_FIRST_NAME,''),' ',COALESCE(c.str_LAST_NAME,''))),'|',c.str_TELEPHONE)"
    + " FROM t_preenregistrement p JOIN t_client c ON c.lg_CLIENT_ID=p.lg_CLIENT_ID WHERE p.lg_PREENREGISTREMENT_ID='" + V1 + "'").split('|');
  const recue = Number(q("SELECT SUM(int_QTE_RECUE) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID='" + bon
    + "' AND lg_FAMILLE_ID='" + produit + "'"));
  const ref = q("SELECT str_REF_LIVRAISON FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID='" + bon + "'");
  const jour = q("SELECT DATE_FORMAT(dt_DATE_LIVRAISON,'%Y-%m-%d') FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID='" + bon + "'");
  /* Un bon qui ne contient pas ce produit, pour le cas « rien en avoir ». */
  const autre = q("SELECT b.lg_BON_LIVRAISON_ID FROM t_bon_livraison b WHERE b.str_STATUT='is_Closed' AND NOT EXISTS"
    + " (SELECT 1 FROM t_bon_livraison_detail d JOIN t_preenregistrement_detail pd ON pd.lg_FAMILLE_ID=d.lg_FAMILLE_ID"
    + " AND pd.b_IS_AVOIR=1 AND pd.str_STATUT='is_Closed' AND pd.int_QUANTITY<>pd.int_QUANTITY_SERVED"
    + " WHERE d.lg_BON_LIVRAISON_ID=b.lg_BON_LIVRAISON_ID) ORDER BY b.dt_UPDATED DESC LIMIT 1");
  return { bon, produit, client: client[0], tel: client[1], recue, ref, jour, autre };
}

(async () => {
  const j = poser();
  if (!j) { console.log('FATAL : jeu d\'essai incomplet'); nettoyer(); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const lire = (id) => p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/avoirs-bon/' + encodeURIComponent(id))).text()), id);

    const r = await lire(j.bon);
    const nous = (r.data || []).filter((l) => l.reference === REF[V1]);
    ok('API : la vente en avoir du produit figure, avec client, téléphone, due et reçue',
      r.success && r.reference === j.ref && nous.length === 1 && nous[0].client === j.client && nous[0].telephone.indexOf(j.tel) >= 0
      && nous[0].quantiteDue === 2 && nous[0].quantiteRecue === j.recue, JSON.stringify(r.data) + ' attendu ' + JSON.stringify(j));
    ok('API : la vente annulée n\'y figure pas', !(r.data || []).some((l) => l.reference === REF[V2]));
    ok('API : total = nombre de lignes', r.total === r.data.length, r.total);
    const vide = j.autre ? await lire(j.autre) : null;
    ok('API : un bon sans produit en avoir rend une liste vide', vide && vide.success && vide.total === 0 && vide.data.length === 0, JSON.stringify(vide));
    const pdf = await p.evaluate(async (id) => { const x = await fetch('../api/v1/avoirs-bon/' + encodeURIComponent(id) + '/pdf');
      const t = new Uint8Array(await x.arrayBuffer()); return { type: x.headers.get('content-type'), dispo: x.headers.get('content-disposition'), debut: String.fromCharCode.apply(null, t.slice(0, 5)) }; }, j.bon);
    ok('PDF imprimable, ouvert dans l\'onglet (inline)', /pdf/.test(pdf.type) && /^inline/.test(pdf.dispo || '') && pdf.debut === '%PDF-', JSON.stringify(pdf));

    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    /* Apres l'entree en stock : fenetre d'abord, la suite (impressions) a la fermeture. */
    await p.evaluate((bon) => { window.__suite = 0; Ext.syncRequire('testextjs.view.commandemanagement.AvoirsBonFenetre');
      testextjs.view.commandemanagement.AvoirsBonFenetre.afficherPuis(bon, function () { window.__suite++; }); }, j.bon);
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('avoirsbonfenetre')[0]; return w && /vc-tableau/.test(w.getEl().dom.innerHTML); }, null, { timeout: 30000 });
    const f1 = await p.evaluate((v) => { const w = Ext.ComponentQuery.query('avoirsbonfenetre')[0]; const h = w.getEl().dom;
      return { suite: window.__suite, ligne: h.innerText.indexOf(v) >= 0, imprimer: !!h.querySelector('[data-action=imprimer]'), modal: w.modal }; }, REF[V1]);
    ok('Entrée validée : la fenêtre s\'ouvre avec la vente, bouton Imprimer, et la suite attend', f1.ligne && f1.imprimer && f1.suite === 0, JSON.stringify(f1));
    await p.click('.vc-pied [data-action=fermer]');
    await p.waitForTimeout(400);
    const f2 = await p.evaluate(() => ({ suite: window.__suite, ouvertes: Ext.ComponentQuery.query('avoirsbonfenetre').length }));
    ok('À la fermeture, la suite habituelle reprend une seule fois', f2.suite === 1 && f2.ouvertes === 0, JSON.stringify(f2));
    await p.evaluate((bon) => { window.__suite = 0; testextjs.view.commandemanagement.AvoirsBonFenetre.afficherPuis(bon, function () { window.__suite++; }); }, j.autre);
    await p.waitForFunction(() => window.__suite === 1, null, { timeout: 30000 });
    await p.waitForTimeout(300);
    ok('Sans avoir : aucune fenêtre, la suite part tout de suite', await p.evaluate(() => Ext.ComponentQuery.query('avoirsbonfenetre').length === 0));
    const branche = await p.evaluate(() => { Ext.syncRequire('testextjs.view.commandemanagement.bonlivraison.action.add');
      const src = String(window.doEntreeStock || '');
      const i = src.indexOf('AvoirsBonFenetre.afficherPuis'), k = src.indexOf("Confirmation de l'impression des entrées");
      return { i, k, apres: i > 0 && k > i }; });
    ok('Entrée en stock (doEntreeStock) : la fenêtre passe avant la question d\'impression', branche.apres, JSON.stringify(branche));

    /* Etat de controle des achats : colonne AVOIRS. */
    await p.evaluate(() => { testextjs.app.getController('App').onLoadNewComponent('etatscontrolemanager', 'Etat de controle des achats', ''); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('etatscontrolemanager')[0] && Ext.getCmp('datedebut'), null, { timeout: 60000 });
    await p.waitForTimeout(800);
    await p.evaluate((x) => { Ext.getCmp('datedebut').setValue(Ext.Date.parse(x.jour, 'Y-m-d')); Ext.getCmp('datefin').setValue(Ext.Date.parse(x.jour, 'Y-m-d'));
      Ext.getCmp('rechecher').setValue(x.ref); Ext.ComponentQuery.query('etatscontrolemanager')[0].onRechClick(); }, j);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore().isLoading(), null, { timeout: 60000 });
    await p.waitForTimeout(500);
    const vu = await p.evaluate((id) => { const st = Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore();
      return { trouve: st.findExact('lgBONLIVRAISONID', id) >= 0, n: st.getCount(), ids: st.collect('lgBONLIVRAISONID').slice(0, 3), params: criteresControleAchat() }; }, j.bon);
    if (!vu.trouve) { throw new Error('bon absent de l\'etat de controle ' + JSON.stringify(vu)); }
    const col = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('etatscontrolemanager')[0]; const c = g.down('#avoirsDuBon');
      const row = g.getStore().findExact('lgBONLIVRAISONID', id); const node = g.getView().getNode(row);
      const img = node && node.querySelector('.x-grid-cell-avoirsDuBon .x-action-col-icon');
      if (img) { img.setAttribute('data-e2e', 'avoirs'); }
      return { entete: c && c.text, icone: !!img }; }, j.bon);
    ok('État de contrôle : colonne « AVOIRS » avec une icône par bon', col.entete === 'AVOIRS' && col.icone, JSON.stringify(col));
    await p.click('[data-e2e=avoirs]');
    await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('avoirsbonfenetre')[0]; return w && /vc-tableau|vc-vide/.test(w.getEl().dom.innerHTML); }, null, { timeout: 30000 });
    const f3 = await p.evaluate((v) => { const w = Ext.ComponentQuery.query('avoirsbonfenetre')[0]; return { bon: w.bonId, ligne: w.getEl().dom.innerText.indexOf(v) >= 0 }; }, REF[V1]);
    ok('Le clic ouvre la fenêtre du bon de la ligne, avec la vente en avoir', f3.bon === j.bon && f3.ligne, JSON.stringify(f3));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
    ok('Échap ferme la fenêtre', await p.evaluate(() => Ext.ComponentQuery.query('avoirsbonfenetre').length === 0));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré, statistiques du produit restaurées', q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_NAME LIKE 'e2e_avb%'") === '0' && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + V1 + "','" + V2 + "')") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
