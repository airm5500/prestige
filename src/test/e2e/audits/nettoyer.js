/* Retire le jeu d'essai d'un scenario de reproduction interrompu.
 * AUDIT_DEBUT='AAAA-MM-JJ HH:MM:SS' : debut du lancement interrompu (ventes du compte de test posterieures) ;
 * les clients, tiers payants, lots et groupes marques ZZAUDIT sont retires dans tous les cas.
 * Les stocks et parametres modifies par le lancement interrompu ne sont PAS connus ici : les remettre a la main
 * d'apres sa sortie si besoin.
 */
if (!process.env.AUDIT_DEBUT) { console.error('AUDIT_DEBUT manquant'); process.exit(2); }
const C = require('./commun');
C.etat.restaurations.push("DELETE FROM t_lot WHERE lg_LOT_ID LIKE '" + C.MARQUE + "-LOT-%'");
C.nettoyer();
process.exit(C.bilan() ? 1 : 0);
