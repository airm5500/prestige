package rest.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Retours du 09/10 (1) : controles d'un reglement de differes, avant toute ecriture (classe pure, testee seule).
 *
 * <ul>
 * <li>chaque vente designee appartient au client regle, est cloturee, non annulee, et doit encore quelque chose ;</li>
 * <li>les restes vus a l'ecran ({@code attendus}) sont toujours ceux de la base : sinon la vente a ete reglee
 * ailleurs entre-temps (deuxieme fenetre, double clic) et le reglement est refuse ;</li>
 * <li>le montant est positif et ne depasse pas ce qui reste du (pas de trop-percu encaisse sans affectation) ;</li>
 * <li>reglement total : la caisse encaisse exactement la somme des restes, verifiee contre le total affiche.</li>
 * </ul>
 */
public final class ReglementDiffereControle {

    /** Une vente differee telle qu'elle est en base (lue sous verrou). */
    public static class Ligne {

        public final String id, clientId, statut;
        public final boolean annulee;
        public final int reste;

        public Ligne(String id, String clientId, String statut, boolean annulee, int reste) {
            this.id = id;
            this.clientId = clientId;
            this.statut = statut;
            this.annulee = annulee;
            this.reste = reste;
        }
    }

    /** Montant affecte a une vente. */
    public static class Affectation {

        public final String id;
        public final int montant, nouveauReste;

        Affectation(String id, int montant, int nouveauReste) {
            this.id = id;
            this.montant = montant;
            this.nouveauReste = nouveauReste;
        }
    }

    public static class Resultat {

        public final String erreur;
        public final int encaisse;
        public final List<Affectation> affectations;

        Resultat(String erreur, int encaisse, List<Affectation> affectations) {
            this.erreur = erreur;
            this.encaisse = encaisse;
            this.affectations = affectations;
        }

        public boolean valide() {
            return erreur == null;
        }

        static Resultat refus(String erreur) {
            return new Resultat(erreur, 0, List.of());
        }
    }

    static final String SITUATION_CHANGEE = "La situation de ce client a changé depuis l'ouverture de l'écran (règlement fait"
            + " dans une autre fenêtre ou envoi en double). Rechargez la liste avant de régler.";

    private ReglementDiffereControle() {
    }

    private static String controleLignes(List<Ligne> lignes, String clientId, Map<String, Integer> attendus) {
        for (Ligne l : lignes) {
            if (l == null) {
                return "Une des ventes choisies n'existe plus. Rechargez la liste.";
            }
            if (!Objects.equals(l.clientId, clientId)) {
                return "Une des ventes choisies n'appartient pas à ce client : règlement refusé.";
            }
            if (!"is_Closed".equals(l.statut) || l.annulee) {
                return "Une des ventes choisies a été annulée ou modifiée : rechargez la liste.";
            }
            if (attendus != null && attendus.containsKey(l.id) && attendus.get(l.id) != l.reste) {
                return SITUATION_CHANGEE;
            }
            if (l.reste <= 0) {
                return SITUATION_CHANGEE;
            }
        }
        return null;
    }

    /** Reglement partiel des ventes choisies, dans l'ordre donne. */
    public static Resultat partiel(List<Ligne> lignes, String clientId, Map<String, Integer> attendus, int montant) {
        if (lignes == null || lignes.isEmpty()) {
            return Resultat.refus("Veuillez sélectionner au moins un dossier");
        }
        if (montant <= 0) {
            return Resultat.refus("Le montant du règlement doit être supérieur à zéro.");
        }
        String e = controleLignes(lignes, clientId, attendus);
        if (e != null) {
            return Resultat.refus(e);
        }
        int du = lignes.stream().mapToInt(l -> l.reste).sum();
        if (montant > du) {
            return Resultat.refus("Le montant (" + montant + ") dépasse ce qui reste dû sur les ventes choisies (" + du
                    + ") : rendez la monnaie ou choisissez d'autres ventes.");
        }
        List<Affectation> a = new ArrayList<>();
        int restant = montant;
        for (Ligne l : lignes) {
            if (restant <= 0) {
                break;
            }
            int part = Math.min(restant, l.reste);
            a.add(new Affectation(l.id, part, l.reste - part));
            restant -= part;
        }
        return new Resultat(null, montant, a);
    }

    /**
     * Reglement total : toutes les ventes du client sur la periode. {@code totalAffiche} = total vu a l'ecran (null si
     * inconnu) ; {@code recu} = montant remis par le client (doit couvrir la dette).
     */
    public static Resultat total(List<Ligne> lignes, String clientId, Integer totalAffiche, int recu) {
        if (lignes == null || lignes.isEmpty()) {
            return Resultat.refus("La liste des ventes est vide");
        }
        String e = controleLignes(lignes, clientId, null);
        if (e != null) {
            return Resultat.refus(e);
        }
        int du = lignes.stream().mapToInt(l -> l.reste).sum();
        if (totalAffiche != null && totalAffiche != du) {
            return Resultat.refus(SITUATION_CHANGEE);
        }
        if (recu < du) {
            return Resultat.refus("Montant insuffisant pour un règlement total : " + du
                    + " restent dus. Choisissez le règlement partiel.");
        }
        List<Affectation> a = new ArrayList<>();
        lignes.forEach(l -> a.add(new Affectation(l.id, l.reste, 0)));
        return new Resultat(null, du, a);
    }
}
