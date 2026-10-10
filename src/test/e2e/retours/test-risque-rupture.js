/* RISQUE DE RUPTURE (retours du 09/10 (3)) : onglet de Commandes en cours.
 *  - onglet present (droit P_CEC_RISQUE_RUPTURE), apres « Ruptures » ; a l'ouverture : statuts a traiter seulement
 *    (rupture, critique, risque, a surveiller), par ordre d'urgence ;
 *  - chaque ligne recalculee independamment depuis la base (ventes/jour = prevision / 30, stock rayon + reserve,
 *    commandes en cours, delai du grossiste ou par defaut, securite) : couverture, statut, a commander identiques ;
 *  - une commande en cours suffisante fait passer un produit a risque a « Couvert par commande » (rien a commander) ;
 *  - une rupture annoncee par un grossiste apparait (colonne et filtre « Rupture fournisseur seulement ») ;
 *  - compteurs cliquables ; saisie absurde sans erreur ; export Excel ; sans le droit : onglet absent, donnees refusees ;
 *  - mise en page : en-tetes entiers, pas de defilement horizontal ; aucune erreur JavaScript ; donnees retirees.
 */
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const EMP = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = 'admin'");
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID WHERE u.str_LOGIN = 'admin' LIMIT 1");
const CMD = 'E2E-RR-CMD', RUP = 'e2e-rr-rupture';
let droit = null;
const param = (k, d) => { const v = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = '" + k + "'"); return v === '' ? d : Number(v); };
const R = { delaiDefaut: param('KEY_PREVISION_DELAI_JOURS', 3), securite: param('KEY_RISQUE_SECURITE_JOURS', 2), surveillance: param('KEY_RISQUE_SURVEILLANCE_JOURS', 3),
  surstock: param('KEY_PREVISION_SURSTOCK_JOURS', 90), cible: param('KEY_PREVISION_COUVERTURE_JOURS', 15) };

function nettoyer() {
  exec("DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'; DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';"
    + "DELETE FROM rupture_detail WHERE ruptureId = '" + RUP + "'; DELETE FROM rupture WHERE id = '" + RUP + "';");
}
/* calcul independant (meme regle que l'echange du 09/10) depuis la base */
function attendu(id) {
  const r = q("SELECT CONCAT_WS('|', p.prevu_mois, p.ventes_12_mois,"
    + " COALESCE((SELECT s.int_NUMBER_AVAILABLE FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '" + EMP + "' AND s.str_STATUT = 'enable' LIMIT 1), 0)"
    + " + COALESCE((SELECT SUM(t.int_NUMBER) FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_TYPE_STOCK_ID = '2' AND t.lg_EMPLACEMENT_ID = '" + EMP + "'), 0),"
    + " COALESCE((SELECT SUM(od.int_NUMBER) FROM t_order_detail od JOIN t_order o ON o.lg_ORDER_ID = od.lg_ORDER_ID WHERE od.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND o.str_STATUT IN ('is_Process', 'passed') AND o.dt_UPDATED >= CURDATE() - INTERVAL 45 DAY), 0),"
    + " COALESCE(g.int_DELAI_REAPPROVISIONNEMENT, 0))"
    + " FROM t_prevision_produit p JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID"
    + " WHERE p.lg_EMPLACEMENT_ID = '" + EMP + "' AND p.lg_FAMILLE_ID = '" + id + "'").split('|').map(Number);
  const [prevu, ventes12, stock, enCours, dg] = r;
  const vmj = prevu / 30, vendable = Math.max(0, stock), delai = dg > 0 ? dg : R.delaiDefaut, horizon = delai + R.securite;
  if (!(vmj > 0)) { return { statut: vendable > 0 && ventes12 <= 0 ? 'DORMANT' : 'CORRECT', couverture: null, aCommander: 0 }; }
  const couv = Math.round(vendable / vmj * 10) / 10;
  let statut = vendable <= 0 ? 'RUPTURE' : couv <= delai ? 'CRITIQUE' : couv <= horizon ? 'RISQUE' : couv <= horizon + R.surveillance ? 'A_SURVEILLER' : couv > R.surstock ? 'SURSTOCK' : 'CORRECT';
  const manque = Math.ceil(vmj * (horizon + R.cible) - vendable - enCours - 1e-9);
  if (['RUPTURE', 'CRITIQUE', 'RISQUE'].includes(statut) && enCours > 0 && vendable + enCours - vmj * delai >= vmj * R.securite) { statut = 'COUVERT'; }
  return { statut, couverture: couv, aCommander: statut === 'SURSTOCK' || statut === 'COUVERT' ? 0 : Math.max(0, manque), stock: vendable, enCours, delai };
}

(async () => {
  nettoyer();
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  let ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  let p = await ctx.newPage();
  const err = [];
  const connexion = async () => {
    p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('i_order_manager', 'Commande en cours', ''));
    await p.waitForFunction(() => { const h = Ext.ComponentQuery.query('commandesencours')[0]; return h && h.isVisible() && h.droits; }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
  };
  const onglets = () => p.evaluate(() => Ext.ComponentQuery.query('commandesencours')[0].query('button[cls=cec-onglet]').filter((x) => x.isVisible()).map((x) => x.getEl().dom.textContent.trim().replace(/\s*\d+$/, '')).join('|'));
  const charge = () => p.waitForFunction(() => { const r = Ext.ComponentQuery.query('risquerupture')[0]; return r && r.isVisible() && !r.store.isLoading() && r.down('#bandeauRisque').getEl().dom.textContent.length > 0; }, null, { timeout: 120000 });
  const recharger = async (fn, arg) => { await p.evaluate(([f, a]) => { const r = Ext.ComponentQuery.query('risquerupture')[0]; r.down('#bandeauRisque').update(''); (new Function('r', 'a', f))(r, a); }, [fn, arg]); await charge(); };
  const lignes = () => p.evaluate(() => Ext.ComponentQuery.query('risquerupture')[0].store.getRange().map((x) => x.data));
  try {
    await connexion();
    const o1 = await onglets();
    ok('Onglet « Risque de rupture » présent, après « Ruptures »', o1 === 'Commandes en cours|Ruptures|Risque de rupture|Substitutions|Alertes|Tableau de bord', o1);
    const id = await p.evaluate(() => Ext.ComponentQuery.query('commandesencours')[0].down('#cec-risque').getEl().dom.id);
    await p.click('#' + id);
    await charge();
    await p.screenshot({ path: SORTIE + '/risque-rupture.png' });
    let l = await lignes();
    const statuts = [...new Set(l.map((x) => x.statut))];
    ok('Ouverture : seulement les statuts à traiter (rupture, critique, risque, à surveiller)', l.length > 0 && statuts.every((s) => ['RUPTURE', 'CRITIQUE', 'RISQUE', 'A_SURVEILLER'].includes(s)), statuts.join(','));
    const ordre = ['RUPTURE', 'CRITIQUE', 'RISQUE', 'COUVERT', 'A_SURVEILLER', 'CORRECT', 'SURSTOCK', 'DORMANT'];
    ok('Ordre d\'urgence : statut puis couverture croissante', l.every((x, i) => i === 0 || ordre.indexOf(l[i - 1].statut) < ordre.indexOf(x.statut)
      || (l[i - 1].statut === x.statut && (l[i - 1].couverture === null ? Infinity : l[i - 1].couverture) <= (x.couverture === null ? Infinity : x.couverture))), JSON.stringify(l.slice(0, 4).map((x) => x.statut + ':' + x.couverture)));
    const ecarts = [];
    for (const x of l.slice(0, 25)) { const a = attendu(x.id); if (a.statut !== x.statut || a.couverture !== x.couverture || a.aCommander !== x.aCommander) { ecarts.push(x.cip + ' écran ' + x.statut + '/' + x.couverture + '/' + x.aCommander + ' base ' + a.statut + '/' + a.couverture + '/' + a.aCommander); } }
    ok('25 lignes recalculées depuis la base : statut, couverture et quantité à commander identiques', ecarts.length === 0, ecarts.join(' ; '));
    const compteurs = await p.evaluate(() => Ext.ComponentQuery.query('risquerupture')[0].store.getProxy().getReader().rawData.compteurs);
    const total = await p.evaluate(() => Ext.ComponentQuery.query('risquerupture')[0].store.getTotalCount());
    ok('Compteurs : la somme des statuts affichés = total de la liste', compteurs.RUPTURE + compteurs.CRITIQUE + compteurs.RISQUE + compteurs.A_SURVEILLER === total, JSON.stringify(compteurs) + ' total ' + total);

    /* commande en cours suffisante -> couvert */
    /* produit a risque qui se vend (rupture, critique ou risque) : une commande suffisante le couvre */
    const critique = l.find((x) => ['RUPTURE', 'CRITIQUE', 'RISQUE'].includes(x.statut) && x.aCommander > 0 && x.parJour > 0 && x.enCours === 0);
    if (critique) {
      exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
        + " VALUES ('" + CMD + "', '" + CMD + "', 1, '51217123531215794892', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin' LIMIT 1), 'passed', NOW(), NOW(), 0, 0, 0);"
        + "INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
        + " VALUES ('" + CMD + "-1', '" + CMD + "', '" + critique.id + "', '51217123531215794892', " + (critique.aCommander + 5) + ", 0, 0, 0, 'is_Process', NOW(), NOW())");
      await recharger("r.down('#recherche').setValue(a); r.choisis = ['RUPTURE','CRITIQUE','RISQUE','COUVERT','A_SURVEILLER','CORRECT','SURSTOCK','DORMANT']; r.charger();", critique.cip);
      const c = (await lignes()).find((x) => x.id === critique.id);
      ok('Commande en cours suffisante : le produit à risque passe « Couvert par commande », rien à commander', c && c.statut === 'COUVERT' && c.aCommander === 0 && c.enCours >= critique.aCommander + 5, JSON.stringify(c));
      exec("DELETE FROM t_order_detail WHERE lg_ORDER_ID = '" + CMD + "'; DELETE FROM t_order WHERE lg_ORDER_ID = '" + CMD + "';");
    } else {
      ok('Commande en cours suffisante : produit à risque disponible pour l\'essai', false, 'aucun produit à risque');
    }

    /* rupture fournisseur */
    const cible = l[0];
    exec("INSERT INTO rupture (id, reference, statut, dtCreated, dtUpdated, grossisteId, dtHeure) VALUES ('" + RUP + "', 'E2E-RR', 'enable', CURDATE(), CURDATE(), '51217123531215794892', NOW());"
      + "INSERT INTO rupture_detail (id, qty, prixAchat, prixVente, produitId, ruptureId, motif) VALUES ('" + RUP + "-1', 3, 0, 0, '" + cible.id + "', '" + RUP + "', 'Manque fabricant')");
    await recharger("r.down('#recherche').setValue(''); r.choisis = ['RUPTURE','CRITIQUE','RISQUE','COUVERT','A_SURVEILLER','CORRECT','SURSTOCK','DORMANT']; r.down('#ruptureFournisseur').setValue(true);", null);
    l = await lignes();
    ok('Rupture annoncée par un grossiste : colonne renseignée (date, grossiste, motif), filtre « seulement » la retrouve',
      l.some((x) => x.id === cible.id && /TEDIS/.test(x.ruptureFournisseur) && /Manque fabricant/.test(x.ruptureFournisseur)) && l.every((x) => x.ruptureFournisseur), JSON.stringify(l.slice(0, 2).map((x) => x.cip + ' ' + x.ruptureFournisseur)));
    await recharger("r.down('#ruptureFournisseur').setValue(false); r.choisis = ['RUPTURE','CRITIQUE','RISQUE','A_SURVEILLER'];", null);

    /* compteurs cliquables (retours du 10/10) : clic = ce statut seul ; re-clic = statuts a traiter ; Ctrl + clic = ajout */
    const pos = (st) => p.evaluate((x) => { const el = Ext.ComponentQuery.query('risquerupture')[0].down('#bandeauRisque').getEl().dom.querySelector('.rr-filtre[data-statut=' + x + ']'); return el ? el.getBoundingClientRect() : null; }, st);
    const etat = () => p.evaluate(() => { const r = Ext.ComponentQuery.query('risquerupture')[0], raw = r.store.getProxy().getReader().rawData || {};
      return { choisis: r.choisis.join(','), statuts: [...new Set(r.store.getRange().map((x) => x.get('statut')))], total: r.store.getTotalCount(), compteur: (raw.compteurs || {}).RUPTURE }; });
    let c = await pos('RUPTURE');
    await p.mouse.click(c.x + 10, c.y + 5);
    await charge();
    let e = await etat();
    ok('Clic sur « Rupture » : seules les ruptures, autant que le compteur', e.choisis === 'RUPTURE' && e.statuts.every((x) => x === 'RUPTURE') && e.total === e.compteur, JSON.stringify(e));
    c = await pos('RUPTURE');
    await p.mouse.click(c.x + 10, c.y + 5);
    await charge();
    e = await etat();
    ok('Nouveau clic sur « Rupture » : retour aux statuts à traiter', e.choisis === 'RUPTURE,CRITIQUE,RISQUE,A_SURVEILLER', JSON.stringify(e));
    c = await pos('SURSTOCK');
    await p.keyboard.down('Control');
    await p.mouse.click(c.x + 10, c.y + 5);
    await p.keyboard.up('Control');
    await charge();
    e = await etat();
    ok('Ctrl + clic sur « Surstock » : ajouté au filtre', /SURSTOCK/.test(e.choisis) && /RUPTURE/.test(e.choisis), JSON.stringify(e));
    await recharger("r.choisis = ['RUPTURE','CRITIQUE','RISQUE','A_SURVEILLER']; r.charger();", null);

    /* saisie absurde */
    await recharger("r.down('#recherche').setValue(a); r.charger();", 'x'.repeat(150) + "'%;--<b>");
    const vide = await p.evaluate(() => ({ n: Ext.ComponentQuery.query('risquerupture')[0].store.getCount(), b: Ext.ComponentQuery.query('risquerupture')[0].down('#bandeauRisque').getEl().dom.textContent }));
    ok('Recherche longue avec caractères spéciaux : liste vide, pas d\'erreur', vide.n === 0 && /Couverture = stock/.test(vide.b), JSON.stringify(vide).slice(0, 200));
    await recharger("r.down('#recherche').setValue(''); r.charger();", null);

    /* export */
    const x = await p.evaluate(async () => { const c = Ext.Object.toQueryString(Ext.ComponentQuery.query('risquerupture')[0].criteres()); const r = await fetch('/prestige/api/v1/risque-rupture/excel?' + c);
      return { s: r.status, d: r.headers.get('content-disposition'), n: (await r.arrayBuffer()).byteLength }; });
    ok('Export Excel de la liste filtrée', x.s === 200 && /risque-rupture_.*\.xls/.test(x.d) && x.n > 5000, JSON.stringify(x));

    /* mise en page */
    const mp = await p.evaluate(() => { const r = Ext.ComponentQuery.query('risquerupture')[0];
      const coupes = r.down('grid').headerCt.getGridColumns().filter((c) => { const i = c.getEl().dom.querySelector('.x-column-header-inner'); return i && i.scrollWidth > i.clientWidth + 1; }).map((c) => c.text);
      const boutons = r.query('button').filter((b) => b.isVisible()).filter((b) => { const q = b.getEl().dom.getBoundingClientRect(), t = b.getEl().dom.querySelector('.x-btn-inner'); return q.right > window.innerWidth || (t && t.scrollWidth > t.clientWidth + 1); }).map((b) => b.getText());
      const ong = Ext.ComponentQuery.query('commandesencours')[0].query('button[cls=cec-onglet]').filter((b) => { const t = b.getEl().dom.querySelector('.x-btn-inner'); return t.scrollWidth > t.clientWidth + 1 || b.getEl().dom.getBoundingClientRect().right > window.innerWidth; }).map((b) => b.getText());
      return { coupes, boutons, ong, defil: document.body.scrollWidth > document.body.clientWidth + 1 }; });
    ok('Mise en page : onglets, en-têtes et boutons entiers, pas de défilement horizontal', !mp.coupes.length && !mp.boutons.length && !mp.ong.length && !mp.defil, JSON.stringify(mp));

    /* sans le droit */
    droit = q("SELECT CONCAT(rp.lg_ROLE_PRIVILEGE, '|', rp.lg_ROLE_ID, '|', rp.lg_PRIVILEGE_ID) FROM t_role_privelege rp JOIN t_privilege pr ON pr.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
      + " WHERE rp.lg_ROLE_ID = '" + ROLE + "' AND pr.str_NAME = 'P_CEC_RISQUE_RUPTURE' LIMIT 1").split('|');
    exec("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + droit[0] + "'");
    await ctx.close(); ctx = await b.newContext({ viewport: { width: 1366, height: 768 } }); p = await ctx.newPage();
    await connexion();
    const o2 = await onglets();
    const refus = await p.evaluate(async () => (await fetch('/prestige/api/v1/risque-rupture')).json());
    ok('Sans le droit : onglet absent et données refusées par le serveur', o2 === 'Commandes en cours|Ruptures|Substitutions|Alertes|Tableau de bord' && refus.success === false && refus.interdit === true, o2 + ' ' + JSON.stringify(refus));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    if (droit && droit.length === 3) {
      exec("INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('" + droit[0] + "', '" + droit[1] + "', '" + droit[2] + "', NOW(), NOW())");
    }
    nettoyer();
    ok('Données d\'essai retirées, droit remis', q("SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '" + CMD + "'") === '0' && q("SELECT COUNT(*) FROM rupture WHERE id = '" + RUP + "'") === '0'
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege pr ON pr.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + ROLE + "' AND pr.str_NAME = 'P_CEC_RISQUE_RUPTURE'") === '1');
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + ' OK');
    process.exit(k === res.length ? 0 : 1);
  }
})();
