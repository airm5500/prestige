/* TABLEAU DE BORD ET BALANCE VENTE CAISSE (lenteurs d'appaul, journal du 12/11) — lecture seule.
 *
 * Constats :
 *  - tableau de bord : alertes 10,6 s et tuiles 7,1 s chez appaul ; sur la copie de sa base, « articles entres non
 *    vendus » relisait tout l'historique de ventes de chaque article (2,7 a 6,4 s), et les ruptures (jusqu'a 2,4 s)
 *    etaient calculees deux fois, par les tuiles et par les alertes ;
 *  - balance d'un mois : 1 s seule, mais 4 a 5 s juste apres le tableau de bord, qui chassait les ventes du mois de la
 *    memoire de MariaDB en relisant 3 ans de lignes de vente.
 * Le test :
 *  - rapprochement : pour des periodes variees, le nombre et la liste des articles entres non vendus (route des
 *    alertes et liste de la fenetre) sont compares, ligne par ligne, a la base calculee par la FORMULE D'ORIGINE
 *    (NOT EXISTS sur tout l'historique) ; ruptures : tuiles = alertes = base, pour plusieurs periodes ;
 *  - ecran : connexion (tableau de bord), carte Alertes affichee, « Actualiser » ; puis menu Balance Vente/Caisse, un
 *    mois, « rechercher ». Durees lues dans le navigateur : alertes < 1 s, tuiles < 1,5 s, balance d'un mois juste
 *    apres le tableau de bord < 2,5 s au second passage (le premier peut etre la premiere lecture depuis le disque ; le
 *    seuil suppose une memoire tampon qui contient un mois de ventes, voir le rapport). Ce parcours passe AVANT le rapprochement,
 *    qui lit beaucoup et fausserait les durees ;
 *  - cloche : le compteur des avoirs (relu sur chaque poste) = liste des ventes en avoir = base, en moins de 300 ms ;
 *  - aucune erreur JavaScript.
 * Variables : BASE, DB_TEST, MARIADB_OPTIONS (outils/poste.js) ; MOIS_DEBUT / MOIS_FIN (balance, defaut : le dernier
 * mois qui a des ventes).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
const lignes = (s) => { const t = q(s); return t ? t.split(/\r?\n/).map((l) => l.split('\t')) : []; };
const sansMasque = (p) => p.waitForFunction(() => !Array.from(document.querySelectorAll('.x-mask')).some((m) => m.offsetParent !== null), null, { timeout: 60000 });

/* formules d'origine (avant le 12/11) */
const NV_ORIGINE = (j) => "SELECT x.cip, DATE(x.entree), x.quantite FROM (SELECT f.lg_FAMILLE_ID famille, f.str_NAME nom, f.int_CIP cip, MIN(b.dt_UPDATED) entree,"
  + " SUM(COALESCE(bd.int_QTE_RECUE, 0) + COALESCE(bd.int_QTE_UG, 0)) quantite FROM t_bon_livraison_detail bd JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = bd.lg_BON_LIVRAISON_ID"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = bd.lg_FAMILLE_ID WHERE b.str_STATUT = 'is_Closed' AND b.dt_UPDATED >= CURDATE() - INTERVAL " + j + " DAY AND f.str_STATUT = 'enable'"
  + " GROUP BY f.lg_FAMILLE_ID, f.str_NAME, f.int_CIP) x WHERE NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
  + " WHERE d.lg_FAMILLE_ID = x.famille AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.dt_UPDATED >= x.entree)";
const RUPTURES_ORIGINE = (emp, j) => "SELECT COUNT(*), COALESCE(SUM(CASE WHEN x.derniere >= CURDATE() - INTERVAL " + Math.max(1, j) + " DAY THEN 1 ELSE 0 END), 0) FROM ("
  + "SELECT d.lg_FAMILLE_ID famille, MAX(p.dt_UPDATED) derniere FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
  + " WHERE p.dt_UPDATED >= CURDATE() - INTERVAL 90 DAY AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 GROUP BY d.lg_FAMILLE_ID) x"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = x.famille AND s.lg_EMPLACEMENT_ID = '" + emp + "' AND s.int_NUMBER_AVAILABLE <= 0"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = x.famille AND f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0";

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    const emp = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
    /* dernier jour d'activite normale (au moins 100 ventes) : quelques ventes isolees peuvent etre plus recentes */
    const dernier = q("SELECT MAX(j) FROM (SELECT DATE(dt_UPDATED) j FROM t_preenregistrement WHERE dt_UPDATED > NOW() - INTERVAL 400 DAY"
      + " AND str_STATUT = 'is_Closed' AND int_PRICE > 0 GROUP BY DATE(dt_UPDATED) HAVING COUNT(*) >= 100) x");
    /* balance : le dernier mois d'activite normale (au moins 15 jours de 100 ventes), du 1er au dernier jour de vente */
    const mois = q("SELECT MAX(m) FROM (SELECT DATE_FORMAT(j, '%Y-%m') m FROM (SELECT DATE(dt_UPDATED) j FROM t_preenregistrement"
      + " WHERE dt_UPDATED > NOW() - INTERVAL 400 DAY AND str_STATUT = 'is_Closed' AND int_PRICE > 0 GROUP BY DATE(dt_UPDATED) HAVING COUNT(*) >= 100) x"
      + " GROUP BY DATE_FORMAT(j, '%Y-%m') HAVING COUNT(*) >= 15) y");
    const moisFin = process.env.MOIS_FIN || q("SELECT MAX(DATE(dt_UPDATED)) FROM t_preenregistrement WHERE DATE_FORMAT(dt_UPDATED, '%Y-%m') = '" + mois
      + "' AND str_STATUT = 'is_Closed' AND int_PRICE > 0");
    const moisDebut = process.env.MOIS_DEBUT || mois + '-01';
    const fr = (d) => d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4);

    /* ecran : tableau de bord puis balance d'un mois, deux passages */
    const durees = { alertes: [], tuiles: [], balance: [] };
    for (let passage = 1; passage <= 2; passage++) {
      const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => erreurs.push(e.message));
      const debuts = new Map();
      p.on('request', (r) => debuts.set(r, Date.now()));
      const duree = (motif) => p.waitForResponse((r) => motif.test(r.url()), { timeout: 180000 }).then((r) => Date.now() - debuts.get(r.request()));
      await connexion(p, ENV_E2E.LOGIN, 'e2etest');
      await p.waitForFunction(() => Ext.ComponentQuery.query('tableaubord').length > 0 && document.querySelector('[data-carte="alertes"]'), null, { timeout: 60000 });
      await p.evaluate(() => document.querySelector('[data-carte="alertes"]').scrollIntoView());
      await p.waitForFunction(() => document.querySelector('[data-corps="alertes"] [data-liste]'), null, { timeout: 120000 });
      await p.waitForTimeout(1000);
      /* « Actualiser » : comme a l'ouverture du matin ou apres un redemarrage, rien en cache */
      const tA = duree(/tableau-bord\/alertes\?.*frais=1/), tT = duree(/tableau-bord\/tuiles\?.*frais=1/);
      await p.click('[data-tb="actualiser"]');
      durees.alertes.push(await tA); durees.tuiles.push(await tT);
      /* les autres cartes finissent de se recharger : on ouvre la balance ensuite, comme l'utilisateur */
      await p.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});
      await sansMasque(p);

      await ouvrirMenu(p, 'GESTION COURANTE', 'Balance Vente/Caisse2');
      await p.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #balanceGrid').length > 0, null, { timeout: 30000 });
      await p.waitForFunction(() => !Ext.ComponentQuery.query('balancesalecahs #balanceGrid')[0].getStore().isLoading(), null, { timeout: 120000 });
      await sansMasque(p);
      /* la souris quitte le menu de navigation, qui se replie et degage les champs de date */
      await p.mouse.move(1300, 800);
      await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('balancesalecahs #dtStart').filter((x) => x.isVisible(true))[0];
        const r = c.el.dom.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e && c.el.dom.contains(e); }, null, { timeout: 30000 });
      await saisir(p, 'balancesalecahs #dtStart', fr(moisDebut));
      await saisir(p, 'balancesalecahs #dtEnd', fr(moisFin));
      const tB = duree(/\/balancesalecash\?/);
      await cliquer(p, 'balancesalecahs #rechercher');
      durees.balance.push(await tB);
      await p.waitForFunction(() => !Ext.ComponentQuery.query('balancesalecahs #balanceGrid')[0].getStore().isLoading(), null, { timeout: 120000 });
      const lignesBalance = await p.evaluate(() => Ext.ComponentQuery.query('balancesalecahs #balanceGrid')[0].getStore().getCount());
      ok('Passage ' + passage + ' : balance du ' + fr(moisDebut) + ' au ' + fr(moisFin) + ' affichée', lignesBalance > 0, lignesBalance + ' lignes');
      await ctx.close();
    }
    const ctx0 = await b.newContext();
    const p0 = await ctx0.newPage();
    await connexion(p0, ENV_E2E.LOGIN, 'e2etest');
    const api = (u) => p0.evaluate(async (x) => (await fetch(x)).json(), u);

    /* rapprochement : articles entres non vendus, periodes variees (1 semaine a 1 an), nombre et liste ligne par ligne */
    let comparees = 0;
    for (const j of [7, 30, 46, 90, 365]) {
      const base = lignes(NV_ORIGINE(j) + ' ORDER BY 1, 2, 3').map((l) => l.join('|'));
      const al = await api('../api/v1/tableau-bord/alertes?frais=1&nv=' + j);
      const liste = await api('../api/v1/tableau-bord/alertes/liste?type=nonvendus&nv=' + j + '&limite=100000');
      const lu = (liste.data || []).map((x) => [x.cip, x.entree, x.quantite].join('|')).sort();
      const attendu = base.slice().sort();
      const ecarts = attendu.filter((x, i) => x !== lu[i]).slice(0, 3);
      ok('Non vendus depuis ' + j + ' j : nombre (' + base.length + ') et liste identiques à la formule d\'origine',
        al.nonVendus && al.nonVendus.produits === base.length && lu.length === base.length && ecarts.length === 0,
        (al.nonVendus && al.nonVendus.produits) + ' / ' + lu.length + ' / ' + base.length + ' ' + ecarts.join(' ; '));
      comparees += base.length;
    }
    ok('Rapprochement des non vendus sur des articles réels', comparees > 100, comparees + ' lignes comparées');

    /* ruptures : tuiles = alertes = base, plusieurs periodes */
    for (const j of [1, 7, 30, 90]) {
      const [nb, recents] = lignes(RUPTURES_ORIGINE(emp, j))[0].map(Number);
      const t = await api('../api/v1/tableau-bord/tuiles?frais=1&date=' + dernier + '&rup=' + j);
      const a = await api('../api/v1/tableau-bord/alertes?frais=1&rup=' + j);
      ok('Ruptures sur ' + j + ' j : tuiles = alertes = base (' + nb + ', dont ' + recents + ' vendus récemment)',
        t.ruptures.produits === nb && a.ruptures.produits === nb && t.ruptures.vendusRecemment === recents && a.ruptures.vendusRecemment === recents
        && t.ruptures.jours === j && a.ruptures.jours === j,
        JSON.stringify([t.ruptures.produits, t.ruptures.vendusRecemment, a.ruptures.produits, a.ruptures.vendusRecemment]));
    }

    /* cloche : compteur des avoirs = liste des ventes en avoir = base (formule d'origine), et rapide */
    const deb = new Date(); deb.setMonth(deb.getMonth() - 1); deb.setDate(deb.getDate() + 1);
    const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    let tCloche = Infinity, cloche;
    for (let i = 0; i < 3; i++) {
      const t0 = Date.now();
      cloche = await api('../api/v1/notifications-centre/compteurs?cles=avoirs');
      tCloche = Math.min(tCloche, Date.now() - t0);
    }
    const listeAvoirs = await api('../api/v1/ventestats?onlyAvoir=true&sansBon=false&typeVenteId=&avoirStatut=EN_COURS&dtStart=' + iso(deb) + '&dtEnd=' + iso(new Date()) + '&start=0&limit=1');
    const avoirsBase = Number(q("SELECT COUNT(*) FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_AVOIR = TRUE AND p.dt_UPDATED >= '" + iso(deb)
      + "' AND p.dt_UPDATED <= '" + iso(new Date()) + " 23:59:59' AND EXISTS (SELECT 1 FROM t_user uop WHERE uop.lg_USER_ID = p.lg_USER_ID AND uop.lg_EMPLACEMENT_ID = '" + emp + "')"));
    ok('Cloche : avoirs du mois = liste des ventes en avoir = base (' + avoirsBase + ')', cloche.compteurs.avoirs === Number(listeAvoirs.total) && cloche.compteurs.avoirs === avoirsBase,
      cloche.compteurs.avoirs + ' / ' + listeAvoirs.total + ' / ' + avoirsBase);
    ok('Cloche : compteur des avoirs en moins de 300 ms (avant : 1,2 à 2 s par passage, sur chaque poste)', tCloche < 300, tCloche + ' ms');
    await ctx0.close();

    const pire = (t) => Math.max(...t);
    ok('Tableau de bord, « Actualiser » : alertes en moins de 1 s (appaul : 10,6 s)', pire(durees.alertes) < 1000, durees.alertes.join(' / ') + ' ms');
    ok('Tableau de bord, « Actualiser » : tuiles en moins de 1,5 s (appaul : 7,1 s)', pire(durees.tuiles) < 1500, durees.tuiles.join(' / ') + ' ms');
    /* le 1er passage peut etre la toute premiere lecture du mois depuis le demarrage de MariaDB (disque) ; le 2e dit si le
       mois reste en memoire malgre le tableau de bord : c'est le cas si la memoire tampon contient un mois de ventes
       (cles aleatoires : environ 3,7 Go de pages pour un mois chez appaul ; 1,1 s avec 5 Go, 5 a 10 s avec 2 Go) */
    const pool = Math.round(Number(q('SELECT @@innodb_buffer_pool_size')) / 1073741824 * 10) / 10;
    ok('Balance d\'un mois juste après le tableau de bord en moins de 2,5 s (mémoire tampon de MariaDB : ' + pool + ' Go)', durees.balance[1] < 2500,
      durees.balance.join(' / ') + ' ms');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
