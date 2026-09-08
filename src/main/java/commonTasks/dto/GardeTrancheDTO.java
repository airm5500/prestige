package commonTasks.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;

/** Une tranche horaire de la garde : ce qui s'y est vendu, et combien de ventes distinctes l'ont traversee. */
public class GardeTrancheDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private static final DateTimeFormatter HEURE = DateTimeFormatter.ofPattern("HH'h'mm");

    private LocalDateTime debut;
    private LocalDateTime fin;
    private long quantite;
    private long montant;
    private final Set<String> ventes = new HashSet<>();

    public void ajouter(String venteId, long quantiteLigne, long montantLigne) {
        if (venteId != null) {
            ventes.add(venteId);
        }
        quantite += quantiteLigne;
        montant += montantLigne;
    }

    public LocalDateTime getDebut() {
        return debut;
    }

    public void setDebut(LocalDateTime debut) {
        this.debut = debut;
    }

    public LocalDateTime getFin() {
        return fin;
    }

    public void setFin(LocalDateTime fin) {
        this.fin = fin;
    }

    /** Tranche d'heure du jour (0 a 23), quand la repartition est agregee sur la periode. */
    private Integer heureDuJour;
    private Integer heureFinDuJour;

    public void setHeureDuJour(int debut, int fin) {
        this.heureDuJour = debut;
        this.heureFinDuJour = fin;
    }

    public Integer getHeureDuJour() {
        return heureDuJour;
    }

    /** L'intitule affiche, par exemple « 20h30 - 22h30 », ou « 20h - 22h » pour une tranche du jour. */
    public String getLibelle() {
        if (heureDuJour != null) {
            return String.format("%02dh - %02dh", heureDuJour, heureFinDuJour == null ? 0 : heureFinDuJour % 24);
        }
        if (debut == null || fin == null) {
            return "";
        }
        return debut.format(HEURE) + " - " + fin.format(HEURE);
    }

    public int getVentes() {
        return ventes.size();
    }

    public long getQuantite() {
        return quantite;
    }

    public long getMontant() {
        return montant;
    }
}
