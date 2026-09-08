package commonTasks.dto;

import java.io.Serializable;
import java.util.HashSet;
import java.util.Set;

/** Un vendeur pendant la garde (H3) : ses ventes, ses clients, son chiffre et sa marge. */
public class GardeVendeurDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String vendeurId = "";
    private String nom = "";
    private long montant;
    private long marge;
    private final Set<String> ventes = new HashSet<>();
    private final Set<String> clients = new HashSet<>();

    public GardeVendeurDTO() {
    }

    public GardeVendeurDTO(String vendeurId, String nom) {
        this.vendeurId = vendeurId == null ? "" : vendeurId;
        this.nom = nom == null ? "" : nom;
    }

    public void ajouter(String venteId, String cleClient, long montantLigne, long margeLigne) {
        if (venteId != null) {
            ventes.add(venteId);
        }
        if (cleClient != null) {
            clients.add(cleClient);
        }
        montant += montantLigne;
        marge += margeLigne;
    }

    public String getVendeurId() {
        return vendeurId;
    }

    public String getNom() {
        return nom;
    }

    public int getVentes() {
        return ventes.size();
    }

    public int getClients() {
        return clients.size();
    }

    public long getMontant() {
        return montant;
    }

    public long getMarge() {
        return marge;
    }

    public double getTauxMarge() {
        return montant > 0 ? marge * 100D / montant : 0D;
    }
}
