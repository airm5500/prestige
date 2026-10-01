package rest;

import org.apache.commons.lang3.StringUtils;

/**
 * Regles pures du registre des ventes ratees, sans dependance au conteneur : testables unitairement.
 */
public final class VenteRateeRegles {

    private VenteRateeRegles() {
    }

    /**
     * Designation normalisee pour le regroupement des saisies libres : minuscules, accents ignores tels quels, espaces
     * reduits a un seul. « Doliprane 1000 » et « doliprane 1000 » comptent pour le meme produit.
     */
    public static String normaliser(String designation) {
        if (StringUtils.isBlank(designation)) {
            return "";
        }
        return designation.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    /**
     * Cle de regroupement d'une demande : l'identifiant interne pour un produit connu, la designation normalisee pour
     * une saisie libre non rattachee. Les prefixes distincts empechent toute collision entre les deux familles.
     */
    public static String cleRegroupement(String familleId, String designationNormalisee) {
        if (StringUtils.isNotBlank(familleId)) {
            return "p:" + familleId.trim();
        }
        return "l:" + StringUtils.defaultString(designationNormalisee);
    }

    /**
     * Message de confirmation de commande groupee, pose par la specification : « Ce produit apparaît dans 3 demandes
     * pour une quantité totale de 5. ... »
     */
    public static String messageConfirmationGroupee(int nbDemandes, int quantiteTotale) {
        return "Ce produit apparaît dans " + nbDemandes + " demande" + (nbDemandes > 1 ? "s" : "")
                + " pour une quantité totale de " + quantiteTotale
                + ". Souhaitez-vous marquer comme commandées toutes les lignes de ce produit ?";
    }

    /**
     * Ordre chronologique des jours « dd/MM/yyyy » de l'analyse : compares en texte, 01/03 passait avant 02/01. Un
     * libelle hors format est range apres les dates, dans l'ordre du texte.
     */
    public static final java.util.Comparator<String> ORDRE_DES_JOURS = java.util.Comparator
            .comparing(VenteRateeRegles::cleChronologique);

    static String cleChronologique(String jour) {
        String j = StringUtils.defaultString(jour).trim();
        if (j.matches("\\d{2}/\\d{2}/\\d{4}")) {
            return j.substring(6, 10) + j.substring(3, 5) + j.substring(0, 2);
        }
        return "~" + j;
    }

    /** La confirmation groupee ne se pose que si le produit apparait dans PLUSIEURS demandes actives. */
    public static boolean confirmationGroupeeNecessaire(int nbDemandesActives) {
        return nbDemandesActives > 1;
    }
}
