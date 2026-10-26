/* CENTRE DE SUPPORT, V2 : « Data too long for column 'str_PHONE_CUSTOME' » sur vente/add/assurance et
 * PUT vente/client/{id} (19 occurrences, 17/10).
 *
 * L'ADRESSE du client (50 caracteres) etait copiee dans le TELEPHONE de la vente (20 caracteres) : une adresse longue
 * faisait echouer la vente. Le telephone de la vente est desormais le telephone du client ; a defaut, l'ancien champ
 * « adresse » s'il porte un numero (clients standards : la caisse y range le numero) ; jamais une adresse postale.
 * Par les routes de l'ecran de vente (memes corps que VenteCtr.buildSaleParams et buildAssuranceData) :
 *  - client assure a adresse longue et telephone : la vente assurance est creee ; telephone de la vente = son
 *    telephone ;
 *  - rattacher a la vente un client sans telephone dont l'« adresse » est un numero : ce numero est garde ;
 *  - rattacher a nouveau le client a adresse longue : accepte, son telephone est repris ;
 *  - client a telephone de plus de 20 caracteres : coupe a 20, vente creee.
 * Clients, vente et stock d'essai retires a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const M = 'E2E-V2';
const ADRESSE = 'Cocody Riviera 3, rue des Jardins, villa 42';
const TEL = '07 00 00 00 01';
const NUMERO = '0700000002';
const TEL_LONG = '+225 07 00 00 00 03 poste 12';
const [PRODUIT, STOCK, STOCK_TOTAL] = q("SELECT f.lg_FAMILLE_ID, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 5 ORDER BY f.lg_FAMILLE_ID LIMIT 1").split('\t');
const TP = q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE lg_TYPE_TIERS_PAYANT_ID = '1' AND str_STATUT = 'enable' ORDER BY lg_TIERS_PAYANT_ID LIMIT 1");
const ventes = [];

function client(n, adresse, tel) {
  const c = M + '-C' + n, cc = M + '-CC' + n, tp = M + '-TP' + n, ad = M + '-AD' + n;
  const v = (x) => (x === null ? 'NULL' : "'" + x.replace(/'/g, "''") + "'");
  q(`INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, str_ADRESSE, str_TELEPHONE, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED, dt_UPDATED)`
    + ` VALUES ('${c}', '${c}', 'ESSAI', '${M}', ${v(adresse)}, ${v(tel)}, '1', 'enable', NOW(), NOW());`
    + ` INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${cc}', '${c}', 'enable', NOW(), NOW());`
    + ` INSERT INTO t_compte_client_tiers_payant (lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID, int_POURCENTAGE, int_PRIORITY, str_STATUT, dt_CREATED, dt_UPDATED)`
    + ` VALUES ('${tp}', '${cc}', '${TP}', 80, 1, 'enable', NOW(), NOW());`
    + ` INSERT INTO t_ayant_droit (lg_AYANTS_DROITS_ID, lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED, dt_UPDATED) VALUES ('${ad}', '${c}', 'ESSAI', '${M}', 'enable', NOW(), NOW())`);
  return { c, tp, ad };
}

function nettoyer() {
  for (const v of ventes) {
    const det = "(SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "')";
    q("DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN " + det + "; DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  }
  q(`DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID LIKE '${M}-%';`
    + ` DELETE FROM t_ayant_droit WHERE lg_AYANTS_DROITS_ID LIKE '${M}-%'; DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID LIKE '${M}-%';`
    + ` DELETE FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID LIKE '${M}-%'; DELETE FROM t_client WHERE lg_CLIENT_ID LIKE '${M}-%'`);
  if (PRODUIT) {
    q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + STOCK + ", int_NUMBER = " + STOCK_TOTAL + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'");
  }
}

(async () => {
  nettoyer();
  const b = await ENV_E2E.lancer(chromium);
  try {
    ok('Jeu d\'essai : un article en stock et une assurance', !!PRODUIT && !!TP, PRODUIT + ' / ' + TP);
    const assure = client(1, ADRESSE, TEL), standard = client(2, NUMERO, null), long = client(3, null, TEL_LONG);
    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const appel = (methode, url, corps) => p.evaluate(async ([m, u, c]) => {
      const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
      const t = await r.text();
      try { return { statut: r.status, j: JSON.parse(t) }; } catch (e) { return { statut: r.status, t: t.slice(0, 300) }; }
    }, [methode, url, corps]);
    const vendeur = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
    const corps = (cl) => ({
      typeVenteId: '2', natureVenteId: '1', produitId: PRODUIT, itemPu: 1000, qte: 1, qteServie: 1, devis: false,
      remiseId: null, venteId: null, userVendeurId: vendeur, prevente: false, lotScanne: null, clientId: cl.c, ayantDroitId: cl.ad,
      tierspayants: [{ compteTp: cl.tp, numBon: '', taux: 80, cmu: 'false' }]
    });
    const telVente = (v) => q(`SELECT IFNULL(str_PHONE_CUSTOME, 'NULL') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${v}'`);

    const r1 = await appel('POST', '../api/v1/vente/add/assurance', corps(assure));
    const v1 = r1.j && r1.j.data && r1.j.data.lgPREENREGISTREMENTID;
    if (v1) { ventes.push(v1); }
    ok('Client à adresse longue (' + ADRESSE.length + ' car.) : vente assurance créée', r1.statut === 200 && r1.j.success === true && !!v1, JSON.stringify(r1));
    ok('Téléphone de la vente = téléphone du client (pas son adresse)', !!v1 && telVente(v1) === TEL, v1 && telVente(v1));

    const r2 = await appel('PUT', '../api/v1/vente/client/' + v1, corps(standard));
    ok('Client sans téléphone dont l\'« adresse » est un numéro : rattaché, numéro gardé', r2.j && r2.j.success === true && !!v1 && telVente(v1) === NUMERO,
      JSON.stringify(r2) + ' ; ' + (v1 && telVente(v1)));

    const r3 = await appel('PUT', '../api/v1/vente/client/' + v1, corps(assure));
    ok('Rattacher à nouveau le client à adresse longue : accepté, téléphone repris', r3.j && r3.j.success === true && !!v1 && telVente(v1) === TEL,
      JSON.stringify(r3) + ' ; ' + (v1 && telVente(v1)));

    const r4 = await appel('POST', '../api/v1/vente/add/assurance', corps(long));
    const v4 = r4.j && r4.j.data && r4.j.data.lgPREENREGISTREMENTID;
    if (v4) { ventes.push(v4); }
    ok('Téléphone de plus de 20 caractères : coupé à 20, vente créée', r4.j && r4.j.success === true && !!v4 && telVente(v4) === TEL_LONG.slice(0, 20).trim(),
      JSON.stringify(r4) + ' ; ' + (v4 && telVente(v4)));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Clients, ventes et stock d\'essai retirés', q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE '${M}-%'`) === '0'
      && ventes.every((v) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'") === '0')
      && (!PRODUIT || q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'") === STOCK));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
