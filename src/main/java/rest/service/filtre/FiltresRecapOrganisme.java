package rest.service.filtre;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Filtres du recapitulatif par compte organisme (point 10) : montant, type de tiers payant, groupe.
 *
 * <p>
 * Le recapitulatif vient d'une procedure stockee, que l'on ne veut pas reecrire pour y ajouter trois criteres : les
 * lignes sont donc filtrees apres coup. Le tri de la liste est conserve, et un critere non renseigne laisse tout passer
 * - l'ecran s'ouvre comme avant.
 *
 * <p>
 * Le filtrage est fait AVANT la pagination : filtrer la seule page affichee donnerait des pages inegales et un total
 * faux.
 */
public final class FiltresRecapOrganisme {

    private final FiltreMontant montant;
    private final String type;
    private final String groupe;

    public FiltresRecapOrganisme(String operateurMontant, String valeurMontant, String type, String groupe) {
        this.montant = FiltreMontant.de(operateurMontant, valeurMontant);
        this.type = normaliser(type);
        this.groupe = normaliser(groupe);
    }

    /** Aucun des trois criteres n'est renseigne. */
    public boolean inactif() {
        return montant.inactif() && type.isEmpty() && groupe.isEmpty();
    }

    /** Sous-ensemble des lignes qui satisfont les trois criteres, dans l'ordre recu. */
    public List<LigneRecapOrganisme> appliquer(List<LigneRecapOrganisme> lignes) {
        if (lignes == null) {
            return new ArrayList<>();
        }
        if (inactif()) {
            return new ArrayList<>(lignes);
        }
        List<LigneRecapOrganisme> retenues = new ArrayList<>();
        for (LigneRecapOrganisme ligne : lignes) {
            if (accepte(ligne)) {
                retenues.add(ligne);
            }
        }
        return retenues;
    }

    private boolean accepte(LigneRecapOrganisme ligne) {
        // Le filtre de montant porte sur le SOLDE : c'est la colonne sur laquelle l'utilisateur
        // cherche (les comptes qui doivent encore quelque chose, ceux qui sont a zero...).
        if (!montant.accepte(ligne.getSolde())) {
            return false;
        }
        if (!type.isEmpty() && !type.equals(normaliser(ligne.getTypeOrganisme()))) {
            return false;
        }
        return groupe.isEmpty() || groupe.equals(normaliser(ligne.getGroupe()));
    }

    /** Rappel des criteres retenus, pour l'en-tete des exports et des impressions. */
    public List<String> libelles() {
        List<String> criteres = new ArrayList<>();
        if (!montant.inactif()) {
            criteres.add("Solde " + montant.libelle());
        }
        if (!type.isEmpty()) {
            criteres.add("Type de tiers payant : " + type);
        }
        if (!groupe.isEmpty()) {
            criteres.add("Groupe de tiers payants : " + groupe);
        }
        return criteres;
    }

    /** Comparaison insensible a la casse et aux espaces de bord : les libelles viennent de la base. */
    private static String normaliser(String valeur) {
        return valeur == null ? "" : valeur.trim().toUpperCase(Locale.ROOT);
    }
}
