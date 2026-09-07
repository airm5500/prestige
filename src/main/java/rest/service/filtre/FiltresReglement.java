package rest.service.filtre;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Filtres de la liste des reglements (point 21) : type et groupe de tiers payants.
 *
 * <p>
 * Comme pour le recapitulatif, les lignes viennent d'une couche ancienne que l'on ne reecrit pas pour y ajouter deux
 * criteres : elles sont filtrees apres coup, AVANT la pagination - filtrer la seule page affichee donnerait des pages
 * inegales et un total faux. Un critere non renseigne laisse tout passer.
 */
public final class FiltresReglement {

    private final String type;
    private final String groupe;

    public FiltresReglement(String type, String groupe) {
        this.type = normaliser(type);
        this.groupe = normaliser(groupe);
    }

    public boolean inactif() {
        return type.isEmpty() && groupe.isEmpty();
    }

    public List<LigneReglement> appliquer(List<LigneReglement> lignes) {
        if (lignes == null) {
            return new ArrayList<>();
        }
        if (inactif()) {
            return new ArrayList<>(lignes);
        }
        List<LigneReglement> retenues = new ArrayList<>();
        for (LigneReglement ligne : lignes) {
            boolean typeOk = type.isEmpty() || type.equals(normaliser(ligne.getTypeTiersPayant()));
            boolean groupeOk = groupe.isEmpty() || groupe.equals(normaliser(ligne.getGroupe()));
            if (typeOk && groupeOk) {
                retenues.add(ligne);
            }
        }
        return retenues;
    }

    /** Rappel des criteres retenus, pour l'en-tete des exports et des impressions. */
    public List<String> libelles() {
        List<String> criteres = new ArrayList<>();
        if (!type.isEmpty()) {
            criteres.add("Type de tiers payant : " + type);
        }
        if (!groupe.isEmpty()) {
            criteres.add("Groupe de tiers payants : " + groupe);
        }
        return criteres;
    }

    private static String normaliser(String valeur) {
        return valeur == null ? "" : valeur.trim().toUpperCase(Locale.ROOT);
    }
}
