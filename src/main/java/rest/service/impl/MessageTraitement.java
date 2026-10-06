package rest.service.impl;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Le traitement cite dans un message au client (plan d'octobre, section 4.1) : les medicaments, ou un message neutre
 * quand la fiche client le demande (« Afficher les médicaments dans les messages » decoche). Aucune autre donnee de
 * sante n'est jamais ecrite.
 */
public final class MessageTraitement {

    /** Ce qui remplace {medicament} quand le client ne veut pas que ses medicaments soient cites. */
    public static final String NEUTRE = "votre traitement habituel";
    private static final Pattern TRAITEMENT_VARIABLE = Pattern.compile("(?i)(traitement)\\s*\\{medicament\\}");

    private MessageTraitement() {
    }

    /** Valeur de {medicament} : deux produits au plus (puis « … »), ou {@code repli} sans produit. */
    public static String medicaments(List<String> produits, String repli) {
        if (produits == null || produits.isEmpty()) {
            return repli;
        }
        return produits.size() <= 2 ? String.join(", ", produits) : produits.get(0) + ", " + produits.get(1) + "…";
    }

    /**
     * Le modele adapte a un message neutre : « votre traitement {medicament} » devient « votre traitement habituel » ;
     * un {medicament} isole reste une variable (il recevra {@link #NEUTRE}).
     */
    public static String modeleNeutre(String modele) {
        return modele == null ? null : TRAITEMENT_VARIABLE.matcher(modele).replaceAll("$1 habituel");
    }
}
