package com.prestige.etiquettage.catalogue;

import java.util.Map;

/**
 * Un produit du catalogue. {@code valeurs} : champ -> valeur mise en forme (prix « 1250 », dates « jj/mm/aaaa »), champs
 * fixes et champs ajoutes confondus ; un champ vide est absent.
 */
public record Produit(String cip, Map<String, String> valeurs, String creeLe, String creePar, String modifieLe,
        String modifiePar) {
}
