/* Jeu d'essai de la balance vente / caisse (lots L et N) : deux mois consecutifs, il y a plus d'un an,
   cinq ventes aux montants choisis (3 comptant, 2 a credit), leurs reglements par mode (especes,
   ORANGE, WAVE) et cinq mouvements de caisse. Tout se retire par retirerJeuDEssai(). */
const { execFileSync } = require('child_process');
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-LL';
const ESP = '1', ORANGE = '7', WAVE = '10';

// deux mois consecutifs, il y a plus d'un an : aucune donnee reelle n'y vit
const MOIS_A = q("SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 16 MONTH), '%Y-%m-01')");
const MOIS_B = q("SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 15 MONTH), '%Y-%m-01')");
const FIN_B = q("SELECT LAST_DAY('" + MOIS_B + "')");
const jour = (mois, j) => mois.slice(0, 8) + String(j).padStart(2, '0');
const fr = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);

const VENTES = [
  { id: 'V1', mois: MOIS_A, type: 'comptant', montant: 10000, credit: 0, reglements: [[ESP, 6000], [ORANGE, 4000]] },
  { id: 'V2', mois: MOIS_A, type: 'comptant', montant: 5000, credit: 0, reglements: [[WAVE, 5000]] },
  { id: 'V3', mois: MOIS_A, type: 'credit', montant: 20000, credit: 15000, reglements: [[ESP, 5000]] },
  { id: 'V4', mois: MOIS_B, type: 'comptant', montant: 8000, credit: 0, reglements: [[ESP, 8000]] },
  { id: 'V5', mois: MOIS_B, type: 'credit', montant: 10000, credit: 7000, reglements: [[ESP, 3000]] }
];
const MOUVEMENTS = [
  { id: 'M1', mois: MOIS_A, typeMvt: '1', montant: 50000 }, // fonds de caisse
  { id: 'M2', mois: MOIS_A, typeMvt: '5', montant: 1000 },  // entree
  { id: 'M3', mois: MOIS_A, typeMvt: '5', montant: 2000 },  // entree
  { id: 'M4', mois: MOIS_A, typeMvt: '4', montant: 500 },   // sortie
  { id: 'M5', mois: MOIS_B, typeMvt: '3', montant: 12000 }  // reglement tiers payant
];

function retirerJeuDEssai() {
  exec("DELETE FROM vente_reglement WHERE id LIKE '" + MARQUE + "-%';"
    + "DELETE FROM mvttransaction WHERE reference='" + MARQUE + "';"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%';"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "-%';");
}

function poserJeuDEssai() {
  retirerJeuDEssai();
  const USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const CAISSE = q("SELECT lg_CAISSE_ID FROM t_caisse LIMIT 1");
  const PRODUIT = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' AND lg_FAMILLEARTICLE_ID IS NOT NULL ORDER BY str_NAME LIMIT 1");
  VENTES.forEach(function (v, i) {
    const id = MARQUE + '-' + v.id;
    const quand = jour(v.mois, 10) + ' 10:' + String(10 + i) + ':00';
    const typeVente = v.type === 'comptant' ? '1' : '2';
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
      + " int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
      + " lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER,"
      + " int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
      + " montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + id + "','" + id + "','0'," + v.montant + ",0,'is_Closed','" + quand + "','" + quand + "','" + typeVente
      + "','" + USER + "','" + USER + "','" + USER + "',0,0,0,0," + v.credit + ",0,0,1,0,0,0,0,0,0)");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
      + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
      + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
      + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + id + "-D','" + id + "','" + PRODUIT + "',1,0,0,0," + v.montant + "," + v.montant + ",0,'" + quand + "','" + quand
      + "',0,0,0,0,0,0,1,0,0,0,0,0)");
    const regle = v.montant - v.credit;
    exec("INSERT INTO mvttransaction (uuid,categorie,createdAt,mvtdate,pkey,reference,typeTransaction,caisse,"
      + "lg_EMPLACEMENT_ID,lg_USER_ID,montant,vente_id,montantRestant,montantNet,montantTva,montantCredit,"
      + "montantRegle,montantPaye,montantRemise,montantAcc,typeMvtCaisseId)"
      + " VALUES ('" + id + "-M',1,'" + quand + "','" + quand.slice(0, 10) + "','" + id + "','" + MARQUE + "',"
      + (v.type === 'comptant' ? 0 : 1) + ",'" + CAISSE + "','1','" + USER + "'," + v.montant + ",'" + id + "',0," + v.montant
      + ",0," + v.credit + "," + regle + "," + regle + ",0,0,'" + (v.type === 'comptant' ? '9' : '8') + "');");
    v.reglements.forEach(function (r, k) {
      exec("INSERT INTO vente_reglement (id,flaged_amount,montant,montant_attentu,mvtDate,vente_id,type_regelement,"
        + "ug_amount,ug_amount_net,amount_non_ca,montant_verse) VALUES ('" + MARQUE + '-' + v.id + '-' + k
        + "',0," + r[1] + "," + r[1] + ",'" + quand + "','" + id + "','" + r[0] + "',0,0,0," + r[1] + ");");
    });
  });
  MOUVEMENTS.forEach(function (m) {
    const quand = jour(m.mois, 12) + ' 11:00:00';
    exec("INSERT INTO mvttransaction (uuid,categorie,createdAt,mvtdate,pkey,reference,typeTransaction,caisse,"
      + "lg_EMPLACEMENT_ID,lg_USER_ID,montant,typeMvtCaisseId,typeReglementId)"
      + " VALUES ('" + MARQUE + '-' + m.id + "',3,'" + quand + "','" + quand.slice(0, 10) + "','" + MARQUE + '-' + m.id + "','" + MARQUE
      + "',3,'" + CAISSE + "','1','" + USER + "'," + m.montant + ",'" + m.typeMvt + "','1');");
  });
}


module.exports = { q, exec, MARQUE, ESP, ORANGE, WAVE, MOIS_A, MOIS_B, FIN_B, jour, fr, VENTES, MOUVEMENTS, poserJeuDEssai, retirerJeuDEssai };
