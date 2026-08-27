package rest;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Filtre « types de mouvement » du journal de caisse.
 *
 * <p>
 * L'ecran ne demandait qu'un type a la fois. Il peut desormais en demander plusieurs, separes par des virgules, sans
 * qu'aucune signature ne change : le meme parametre porte un identifiant ou une liste. Un parametre vide veut toujours
 * dire « tous les types ».
 *
 * <p>
 * Les identifiants entrent dans une requete construite par concatenation : chacun est donc reduit aux caracteres qui
 * peuvent legitimement composer une cle - lettres, chiffres, tiret, souligne. Tout le reste est ecarte, et un element
 * qui n'en garde rien est ignore.
 */
public final class FiltreTypesMvtCaisse {

    private FiltreTypesMvtCaisse() {
    }

    /**
     * Fragment SQL a inserer, ou la chaine vide quand aucun type n'est demande.
     *
     * @param colonne
     *            colonne portant le type dans la requete appelante
     * @param types
     *            un identifiant, plusieurs separes par des virgules, ou rien
     */
    public static String fragment(String colonne, String types) {
        List<String> retenus = identifiants(types);
        if (retenus.isEmpty()) {
            return " ";
        }
        if (retenus.size() == 1) {
            return " AND " + colonne + "='" + retenus.get(0) + "' ";
        }
        return " AND " + colonne + " IN ('" + String.join("','", retenus) + "') ";
    }

    /**
     * Identifiants retenus, dans l'ordre d'arrivee et sans doublon.
     */
    public static List<String> identifiants(String types) {
        List<String> retenus = new ArrayList<>();
        if (types == null || types.trim().isEmpty()) {
            return retenus;
        }
        Set<String> vus = new LinkedHashSet<>();
        for (String brut : types.split(",")) {
            String propre = nettoyer(brut);
            if (!propre.isEmpty() && vus.add(propre)) {
                retenus.add(propre);
            }
        }
        return retenus;
    }

    private static String nettoyer(String valeur) {
        StringBuilder sb = new StringBuilder();
        for (char c : valeur.trim().toCharArray()) {
            if (Character.isLetterOrDigit(c) || c == '-' || c == '_') {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
