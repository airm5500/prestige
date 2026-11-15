package commonTasks.dto;

import java.io.Serializable;

import org.json.JSONObject;

/**
 * Onglet « Liste réserve » (15/11) : une ligne de l'edition rp_liste_reserve.jrxml. Valeurs mises en forme comme dans
 * la grille (VMJ a deux decimales avec virgule, valeur absente = tiret), pour comparer PDF et ecran texte a texte.
 */
public class LigneListeReserveDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private final String cip;
    private final String designation;
    private final String emplacement;
    private final String famille;
    private final String grossiste;
    private final String stockRayon;
    private final String stockReserve;
    private final String vmj;
    private final String enReserve;
    private final String capacite;
    private final String seuilMini;

    public LigneListeReserveDTO(JSONObject l) {
        this.cip = l.optString("cip", "");
        this.designation = l.optString("designation", "");
        this.emplacement = l.optString("emplacement", "");
        this.famille = l.optString("famille", "");
        this.grossiste = l.optString("grossiste", "");
        this.stockRayon = String.valueOf(l.optInt("stockRayon", 0));
        this.stockReserve = String.valueOf(l.optInt("stockReserve", 0));
        this.vmj = l.isNull("vmj") ? "—" : String.format(java.util.Locale.FRANCE, "%.2f", l.getDouble("vmj"));
        this.enReserve = l.optBoolean("enReserve") ? "Oui" : "Non";
        this.capacite = l.isNull("capacite") ? "—" : String.valueOf(l.getInt("capacite"));
        this.seuilMini = l.isNull("seuilMini") ? "—" : String.valueOf(l.getInt("seuilMini"));
    }

    public String getCip() {
        return cip;
    }

    public String getDesignation() {
        return designation;
    }

    public String getEmplacement() {
        return emplacement;
    }

    public String getFamille() {
        return famille;
    }

    public String getGrossiste() {
        return grossiste;
    }

    public String getStockRayon() {
        return stockRayon;
    }

    public String getStockReserve() {
        return stockReserve;
    }

    public String getVmj() {
        return vmj;
    }

    public String getEnReserve() {
        return enReserve;
    }

    public String getCapacite() {
        return capacite;
    }

    public String getSeuilMini() {
        return seuilMini;
    }
}
