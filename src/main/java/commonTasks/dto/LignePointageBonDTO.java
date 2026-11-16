package commonTasks.dto;

import java.io.Serializable;

import org.json.JSONObject;

/**
 * Pointage des bons (15/11) : une ligne de rp_pointage_anomalies.jrxml, mise en forme comme a l'ecran (dates
 * jj/mm/aaaa, taux en %, part en francs), pour comparer PDF, ecran et base texte a texte.
 */
public class LignePointageBonDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    public static final String[] BLOCS = { "Assuré", "Ayant droit", "Taux", "Produits et prix", "Montant attendu",
            "Date" };

    private final String bon;
    private final String dateVente;
    private final String dateOrdonnance;
    private final String matricule;
    private final String assure;
    private final String taux;
    private final String part;
    private final String pointage;
    private final String motif;

    public LignePointageBonDTO(JSONObject b) {
        this.bon = b.optString("bon", "");
        String dv = b.isNull("dateVente") ? "" : b.optString("dateVente", "");
        this.dateVente = dv.length() >= 10 ? dv.substring(8, 10) + "/" + dv.substring(5, 7) + "/" + dv.substring(0, 4)
                : "";
        String o = b.isNull("dateOrdonnance") ? "" : b.optString("dateOrdonnance", "");
        this.dateOrdonnance = o.length() >= 10 ? o.substring(8, 10) + "/" + o.substring(5, 7) + "/" + o.substring(0, 4)
                : "—";
        this.matricule = b.optString("matricule", "");
        this.assure = b.optString("assure", "");
        this.taux = b.isNull("taux") ? "" : b.optInt("taux") + " %";
        this.part = String.valueOf(b.optLong("part"));
        this.pointage = libelle(b);
        this.motif = b.isNull("motif") ? "" : b.optString("motif", "");
    }

    /** « Anomalie 3 · Taux », « Absent du papier », « Conforme », « À pointer ». */
    public static String libelle(JSONObject b) {
        String e = b.optString("etat");
        if ("ANOMALIE".equals(e)) {
            int bloc = b.optInt("blocAnomalie", 0);
            return "Anomalie " + bloc + (bloc >= 1 && bloc <= 6 ? " · " + BLOCS[bloc - 1] : "");
        }
        if ("ABSENT".equals(e)) {
            return "Absent du papier";
        }
        if ("CONFORME".equals(e)) {
            return "Conforme";
        }
        return b.optBoolean("modifieDepuis") ? "Modifié : à repointer" : "À pointer";
    }

    public String getBon() {
        return bon;
    }

    public String getDateVente() {
        return dateVente;
    }

    public String getDateOrdonnance() {
        return dateOrdonnance;
    }

    public String getMatricule() {
        return matricule;
    }

    public String getAssure() {
        return assure;
    }

    public String getTaux() {
        return taux;
    }

    public String getPart() {
        return part;
    }

    public String getPointage() {
        return pointage;
    }

    public String getMotif() {
        return motif;
    }
}
