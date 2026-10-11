package com.prestige.etiquettage.catalogue;

/**
 * Un champ du catalogue : les champs du moteur d'etiquettes (CIP, designation, prix...) et ceux ajoutes par un import
 * (« Rayon »...). {@code systeme} : champ fixe, colonne de la table produit ; sinon, champ libre (JSON).
 */
public record Champ(String nom, String libelle, Type type, Integer longueur, boolean obligatoire, boolean systeme,
        boolean affiche, int ordre) {

    public enum Type {
        /** chiffres seulement (CIP, EAN) */
        CODE,
        TEXTE,
        /** entier >= 0 (« 1 250 », « 1250 F ») */
        PRIX,
        /** entier >= 0 */
        ENTIER,
        /** jj/mm/aaaa */
        DATE
    }

    public static final int LONGUEUR_TEXTE_DEFAUT = 100;

    public int longueurMax() {
        return longueur == null || longueur <= 0 ? LONGUEUR_TEXTE_DEFAUT : longueur;
    }
}
