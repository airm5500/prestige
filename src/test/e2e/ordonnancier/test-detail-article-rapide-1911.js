/* PLAN DU 19/11, POINT 6 b : DETAIL ARTICLE (GET api/v1/produit-search/produits/{id}) PLUS RAPIDE, VALEURS IDENTIQUES.
 *
 * Constat : 622 ms chez le pharmacien ; la fiche faisait 12 a 15 requetes (derniere vente, derniere entree, derniere
 * livraison, dernier inventaire, privileges, peremption, etat des commandes, relations chargees).
 *
 * Test de rapprochement avant / apres : 40 produits varies (gros vendeurs, gros achats, livres recemment, en commande, en suggestion, vente ancienne, tires au hasard, jamais vendus, reserve, deconditionne et
 * son parent, sous ordonnancier, sans grossiste...). Premier passage (E2E_PHOTO=fichier) sur l'ancien code : la
 * reponse complete de chaque produit est ecrite. Passage suivant sur le nouveau code : chaque champ de chaque produit
 * = la photo (hors horodatage de la requete). Les vues « Detail » et « Modifier » (vue=modification) sont comparees.
 * Mesure : mediane de 5 appels par produit, puis mediane des produits ; plafond PLAFOND_MS (defaut 250 ms).
 * Lecture seule. Lancement seul :
 *   E2E_PHOTO=D:\projet\p3\wars-plan-1911\photo-detail.json node src/test/e2e/ordonnancier/test-detail-article-rapide-1911.js
 */
const { chromium } = require('playwright-core');
const C = require('./commun');
const fs = require('fs');

const PHOTO = process.env.E2E_PHOTO || 'D:/projet/p3/wars-plan-1911/photo-detail-article.json';
const PLAFOND_MS = Number(process.env.PLAFOND_MS || 250);
const liste = (sql) => C.q(sql).split(/\n/).filter(Boolean);
const IDS = [...new Set([
  ...liste("SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d WHERE d.dt_CREATED >= (SELECT MAX(dt_CREATED) FROM t_preenregistrement_detail) - INTERVAL 60 DAY GROUP BY d.lg_FAMILLE_ID ORDER BY COUNT(*) DESC LIMIT 6"),
  ...liste("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID) ORDER BY f.lg_FAMILLE_ID LIMIT 2"),
  ...liste("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND bool_RESERVE = 1 ORDER BY lg_FAMILLE_ID LIMIT 2"),
  ...liste("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND bool_DECONDITIONNE = 1 ORDER BY lg_FAMILLE_ID LIMIT 1"),
  ...liste("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND bool_DECONDITIONNE = 0 AND bool_DECONDITIONNE_EXIST = 1 ORDER BY lg_FAMILLE_ID LIMIT 1"),
  ...liste("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND is_scheduled = 1 ORDER BY lg_FAMILLE_ID LIMIT 2"),
  ...liste("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND lg_GROSSISTE_ID IS NULL ORDER BY lg_FAMILLE_ID LIMIT 1"),
  ...liste("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_lot l ON l.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE l.dt_PEREMPTION IS NOT NULL AND l.current_stock > 0 GROUP BY f.lg_FAMILLE_ID ORDER BY f.lg_FAMILLE_ID LIMIT 2"),
  ...liste("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_inventaire_famille i ON i.lg_FAMILLE_ID = f.lg_FAMILLE_ID JOIN t_inventaire v ON v.lg_INVENTAIRE_ID = i.lg_INVENTAIRE_ID AND v.str_STATUT = 'is_Closed' GROUP BY f.lg_FAMILLE_ID ORDER BY f.lg_FAMILLE_ID DESC LIMIT 2"),
  ...liste("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY dt_UPDATED DESC LIMIT 2"),
  ...liste("SELECT d.lg_FAMILLE_ID FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.str_STATUT = 'is_Closed' GROUP BY d.lg_FAMILLE_ID ORDER BY COUNT(*) DESC LIMIT 6"),
  ...liste("SELECT d.lg_FAMILLE_ID FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.str_STATUT = 'is_Closed' GROUP BY d.lg_FAMILLE_ID ORDER BY MAX(b.dt_UPDATED) DESC LIMIT 4"),
  ...liste("SELECT d.lg_FAMILLE_ID FROM t_order_detail d JOIN t_order o ON o.lg_ORDER_ID = d.lg_ORDER_ID WHERE o.str_STATUT = 'is_Process' GROUP BY d.lg_FAMILLE_ID ORDER BY d.lg_FAMILLE_ID LIMIT 2"),
  ...liste("SELECT lg_FAMILLE_ID FROM t_suggestion_order_details GROUP BY lg_FAMILLE_ID ORDER BY lg_FAMILLE_ID LIMIT 2"),
  ...liste("SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d GROUP BY d.lg_FAMILLE_ID ORDER BY MAX(d.dt_CREATED) LIMIT 2"),
  ...liste("SELECT d.lg_FAMILLE_ID FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.str_STATUT = 'enable' GROUP BY d.lg_FAMILLE_ID ORDER BY d.lg_FAMILLE_ID LIMIT 2"),
  ...liste("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY MD5(CONCAT(lg_FAMILLE_ID, '20261119')) LIMIT 8")])].slice(0, 42);

(async () => {
  C.ok('Jeu d\'essai : produits variés', IDS.length >= 30, IDS.length);
  const b = await C.ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    p.on('pageerror', (e) => erreurs.push(e.message));
    await C.vues.connexion(p, C.ENV_E2E.LOGIN, 'e2etest');
    const r = await p.evaluate(async (ids) => {
      const lire = async (u) => { const t = performance.now(); const j = await (await fetch(u)).json(); return { j, d: performance.now() - t }; };
      const out = {};
      for (const id of ids) {
        const u = '../api/v1/produit-search/produits/' + id;
        await lire(u); // chauffe
        const d = []; let j = null;
        for (let i = 0; i < 5; i++) { const x = await lire(u); j = x.j; d.push(x.d); }
        d.sort((a, c) => a - c);
        const m = await lire(u + '?vue=modification');
        out[id] = { detail: j, modification: m.j, ms: Math.round(d[2]) };
      }
      return out;
    }, IDS);
    const temps = Object.values(r).map((x) => x.ms).sort((a, c) => a - c);
    const mediane = temps[Math.floor(temps.length / 2)];
    console.log('MESURE  détail article : médiane ' + mediane + ' ms, min ' + temps[0] + ', max ' + temps[temps.length - 1] + ' (' + IDS.length + ' produits, 5 appels chacun)');
    if (!fs.existsSync(PHOTO)) {
      fs.writeFileSync(PHOTO, JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { detail: v.detail, modification: v.modification }])), null, 1));
      C.ok('Photo de référence écrite (ancien code) : ' + PHOTO, true);
    } else {
      const photo = JSON.parse(fs.readFileSync(PHOTO, 'utf8'));
      const ecarts = [];
      IDS.forEach((id) => ['detail', 'modification'].forEach((vue) => {
        const a = (photo[id] || {})[vue] || {}, n = r[id][vue] || {};
        const da = a.data || {}, dn = n.data || {};
        new Set([...Object.keys(da), ...Object.keys(dn)]).forEach((k) => {
          if (JSON.stringify(da[k]) !== JSON.stringify(dn[k])) { ecarts.push(id + ' ' + vue + ' ' + k + ' : ' + JSON.stringify(da[k]) + ' -> ' + JSON.stringify(dn[k])); }
        });
      }));
      const champs = IDS.reduce((s, id) => s + Object.keys((r[id].detail || {}).data || {}).length + Object.keys((r[id].modification || {}).data || {}).length, 0);
      const couverts = (k) => IDS.filter((id) => ((r[id].detail || {}).data || {})[k]).length;
      console.log('Couverture : ' + ['dt_LAST_VENTE', 'dt_LAST_ENTREE', 'dt_DATE_LIVRAISON', 'dt_LAST_INVENTAIRE', 'lot_PEREMPTION_PROCHE', 'int_STOCK_RESERVE', 'lg_FAMILLE_DECONDITION_ID'].map((k) => k + ' ' + couverts(k)).join(', ')
        + ' ; en commande ' + IDS.filter((id) => (((r[id].detail || {}).data || {}).produitState || {}).enCommande > 0).length
        + ', en suggestion ' + IDS.filter((id) => (((r[id].detail || {}).data || {}).produitState || {}).enSuggestion > 0).length
        + ', entrée en cours ' + IDS.filter((id) => (((r[id].detail || {}).data || {}).produitState || {}).entree > 0).length);
      C.ok('Rapprochement avant / après : ' + champs + ' champs de ' + IDS.length + ' produits (détail et modification) identiques', ecarts.length === 0 && champs > 500, ecarts.slice(0, 10).join(' | '));
      C.ok('Détail article : médiane sous ' + PLAFOND_MS + ' ms', mediane < PLAFOND_MS, mediane + ' ms');
    }
    /* droits de la fiche : la procedure d'origine (table temporaire) et la lecture unique (meme texte que
       SearchProduitServcieImpl.DROITS_PRODUIT_SQL) donnent les memes huit droits, pour CHAQUE utilisateur ; et l'ecran
       recoit ceux de la procedure pour l'utilisateur connecte. */
    const DROITS = ['P_BT_DELETE', 'P_BT_UPDATE', 'P_UPDATE_PAF', 'P_UPDATE_PRIXVENTE', 'P_UPDATE_CODETABLEAU', 'P_UPDATE_CODEREMISE', 'P_UPDATE_CIP', 'P_UPDATE_DESIGNATION'];
    const sqlDroits = 'SELECT ' + DROITS.map((d) => "COALESCE(SUM(p.str_NAME = '" + d + "'), 0) > 0").join(', ')
      + ' FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID JOIN t_role r ON r.lg_ROLE_ID = ru.lg_ROLE_ID'
      + ' JOIN t_role_privelege rp ON rp.lg_ROLE_ID = r.lg_ROLE_ID JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID'
      + " WHERE u.lg_USER_ID = '#' AND p.str_STATUT = 'enable' AND p.str_NAME IN ('" + DROITS.join("', '") + "')";
    const utilisateurs = liste('SELECT lg_USER_ID FROM t_user ORDER BY lg_USER_ID');
    const differents = [];
    const vus = new Set();
    utilisateurs.forEach((u) => {
      const proc = C.q("CALL proc_getprivilege_user_for_product('" + u + "')").split('\t').slice(1).join('');
      const lecture = C.q(sqlDroits.replace('#', u)).split('\t').join('');
      vus.add(proc);
      if (proc !== lecture) { differents.push(u + ' ' + proc + ' / ' + lecture); }
    });
    C.ok('Droits de la fiche : procédure = lecture unique pour les ' + utilisateurs.length + ' utilisateurs (' + vus.size + ' profils de droits différents)',
      differents.length === 0 && utilisateurs.length > 1 && vus.size > 1, differents.slice(0, 5).join(' | '));
    const moi = C.q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + C.ENV_E2E.LOGIN + "'");
    const attendus = C.q("CALL proc_getprivilege_user_for_product('" + moi + "')").split('\t').slice(1).map((x) => x === '1');
    const recus = ['BTNDELETE', ...DROITS.slice(1)].map((k) => r[IDS[0]].detail.data[k]);
    C.ok('Droits reçus par l\'écran = procédure (utilisateur connecté)', JSON.stringify(recus) === JSON.stringify(attendus), JSON.stringify(recus) + ' / ' + JSON.stringify(attendus));
    C.ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    C.ok('Parcours sans exception', false, err.stack);
  } finally {
    await b.close();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
