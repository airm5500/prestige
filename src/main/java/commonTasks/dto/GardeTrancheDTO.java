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

    /** L'intitule affiche, par exemple « 20h30 - 22h30 ». */
    public String getLibelle() {
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
