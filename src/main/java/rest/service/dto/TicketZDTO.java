package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 *
 * @author koben
 */
@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(of = { "userId" })
public class TicketZDTO {

    private long totalEsp;

    private long totalCredit;
    private long totalCheque;
    private long totalVirement;
    private long totalCB;
    private long differe;
    private String user;
    private String userId;
    private long totalEntreeEsp;

    private long totalEntreeCredit;
    private long totalEntreeCheque;
    private long totalEntreeVirement;
    private long totalEntreeCB;

    private long totalReglementEsp;

    private long totalReglementCredit;
    private long totalReglementCheque;
    private long totalReglementVirement;
    private long totalReglementCB;

    private long totalSortieEsp;

    private long totalSortieCredit;
    private long totalSortieCheque;
    private long totalSortieVirement;
    private long totalSortieCB;

    private long montantMtn;
    private long montantOrange;
    private long montantMoov;
    private long montantWave;
    private long montantDjamo;

    private long montantReglementMtn;
    private long montantReglementOrange;
    private long montantReglementMoov;
    private long montantReglementWave;
    private long montantReglementDjamo;

    private long montantSortieMtn;
    private long montantSortieOrange;
    private long montantSortieMoov;
    private long montantSortieWave;
    private long montantSortieDjamo;

    private long montantEntreeMtn;
    private long montantEntreeOrange;
    private long montantEntreeMoov;
    private long montantEntreeWave;
    private long montantEntreeDjamo;

    /**
     * Modes mobile money sans colonne propre (modes crees par l'officine) : un cumul par type, dans l'ordre de
     * rencontre, avec le libelle du type pour l'impression.
     */
    private java.util.Map<String, AutreMobile> autresMobiles;

    public java.util.Map<String, AutreMobile> getAutresMobiles() {
        if (autresMobiles == null) {
            autresMobiles = new java.util.LinkedHashMap<>();
        }
        return autresMobiles;
    }

    /** Le cumul du type donne, cree a la premiere rencontre. */
    public AutreMobile autreMobile(String typeReglementId, String libelle) {
        return getAutresMobiles().computeIfAbsent(typeReglementId, k -> new AutreMobile(libelle));
    }

    /**
     * Ventes jouees dans un depot d'extension, depot par depot, encaissees dans la caisse de cet operateur.
     *
     * <p>
     * Ces montants sont DEJA compris dans les totaux ci-dessus : l'argent est reellement dans le tiroir de l'operateur.
     * Ils ne s'ajoutent donc pas au ticket, ils le ventilent - c'est la reponse a « le ticket Z peut-il ajouter une
     * ligne pour mentionner ces ventes ? ». Sans vente en depot, la carte reste vide et le ticket est exactement celui
     * d'avant.
     */
    private java.util.Map<String, Long> ventesEnDepot;

    public java.util.Map<String, Long> getVentesEnDepot() {
        if (ventesEnDepot == null) {
            ventesEnDepot = new java.util.LinkedHashMap<>();
        }
        return ventesEnDepot;
    }

    /** Ajoute un encaissement au cumul du depot nomme. */
    public void ajouterVenteEnDepot(String nomDepot, long montant) {
        String cle = nomDepot == null || nomDepot.isEmpty() ? "Depot" : nomDepot;
        getVentesEnDepot().merge(cle, montant, Long::sum);
    }

    /** Total encaisse pour le compte des depots, tous depots confondus. */
    public long totalVentesEnDepot() {
        long total = 0;
        for (Long montant : getVentesEnDepot().values()) {
            total += montant == null ? 0 : montant;
        }
        return total;
    }

    @Getter
    @Setter
    public static class AutreMobile {

        private final String libelle;
        private long vente;
        private long reglement;
        private long entree;
        private long sortie;

        public AutreMobile(String libelle) {
            this.libelle = libelle == null ? "" : libelle;
        }

        /** Vente + sortie + entree, comme les operateurs a colonne propre dans le pied du ticket Z. */
        public long total() {
            return vente + sortie + entree;
        }
    }

}
