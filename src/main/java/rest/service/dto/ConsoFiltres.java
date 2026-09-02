package rest.service.dto;

import java.util.Arrays;
import java.util.List;

/**
 * Criteres du suivi de consommation multicritere (point 2). Tous se combinent en ET ; un critere vide n'est pas
 * applique. Les operateurs numeriques sont limites a =, &gt;=, &lt;=, &gt;, &lt; ; une valeur negative annule le
 * critere.
 *
 * <p>
 * Quand un medicament est filtre, le nombre d'achats, le montant, les dates et la frequence portent sur ce medicament
 * (tickets qui le contiennent, montant des lignes du medicament) ; sinon sur tous les achats du client. Le critere « =
 * » sur la frequence tolere plus ou moins {@link #TOLERANCE_FREQUENCE_JOURS} jours.
 */
public final class ConsoFiltres {

    public static final List<String> OPERATEURS = Arrays.asList("=", ">=", "<=", ">", "<");
    public static final int TOLERANCE_FREQUENCE_JOURS = 3;

    private String dtStart;
    private String dtEnd;
    private String query;
    private String habitude;
    private String typeClient;
    private String sortBy;
    private String medicament;
    private String familleId;
    private String nbAchatsOp;
    private Long nbAchats;
    private String montantOp;
    private Long montant;
    private String frequenceOp;
    private Long frequence;

    public static String operateur(String op) {
        return op != null && OPERATEURS.contains(op.trim()) ? op.trim() : null;
    }

    public static Long valeur(String v) {
        try {
            long n = Long.parseLong(v.trim());
            return n < 0 ? null : n;
        } catch (Exception e) {
            return null;
        }
    }

    public boolean avecMedicament() {
        return (medicament != null && !medicament.trim().isEmpty())
                || (familleId != null && !familleId.trim().isEmpty());
    }

    /** Vrai si le critere numerique est complet (operateur autorise et valeur positive). */
    public static boolean actif(String op, Long v) {
        return operateur(op) != null && v != null;
    }

    /** Applique un operateur de la liste blanche. */
    public static boolean compare(long gauche, String op, long droite) {
        switch (op) {
        case "=":
            return gauche == droite;
        case ">=":
            return gauche >= droite;
        case "<=":
            return gauche <= droite;
        case ">":
            return gauche > droite;
        case "<":
            return gauche < droite;
        default:
            return true;
        }
    }

    public String getDtStart() {
        return dtStart;
    }

    public ConsoFiltres dtStart(String dtStart) {
        this.dtStart = dtStart;
        return this;
    }

    public String getDtEnd() {
        return dtEnd;
    }

    public ConsoFiltres dtEnd(String dtEnd) {
        this.dtEnd = dtEnd;
        return this;
    }

    public String getQuery() {
        return query;
    }

    public ConsoFiltres query(String query) {
        this.query = query;
        return this;
    }

    public String getHabitude() {
        return habitude;
    }

    public ConsoFiltres habitude(String habitude) {
        this.habitude = habitude;
        return this;
    }

    public String getTypeClient() {
        return typeClient;
    }

    public ConsoFiltres typeClient(String typeClient) {
        this.typeClient = typeClient;
        return this;
    }

    public String getSortBy() {
        return sortBy;
    }

    public ConsoFiltres sortBy(String sortBy) {
        this.sortBy = sortBy;
        return this;
    }

    public String getMedicament() {
        return medicament;
    }

    public ConsoFiltres medicament(String medicament) {
        this.medicament = medicament;
        return this;
    }

    public String getFamilleId() {
        return familleId;
    }

    public ConsoFiltres familleId(String familleId) {
        this.familleId = familleId;
        return this;
    }

    public String getNbAchatsOp() {
        return nbAchatsOp;
    }

    public Long getNbAchats() {
        return nbAchats;
    }

    public ConsoFiltres nbAchats(String op, String valeur) {
        this.nbAchatsOp = operateur(op);
        this.nbAchats = valeur == null ? null : valeur(valeur);
        return this;
    }

    public String getMontantOp() {
        return montantOp;
    }

    public Long getMontant() {
        return montant;
    }

    public ConsoFiltres montant(String op, String valeur) {
        this.montantOp = operateur(op);
        this.montant = valeur == null ? null : valeur(valeur);
        return this;
    }

    public String getFrequenceOp() {
        return frequenceOp;
    }

    public Long getFrequence() {
        return frequence;
    }

    public ConsoFiltres frequence(String op, String valeur) {
        this.frequenceOp = operateur(op);
        this.frequence = valeur == null ? null : valeur(valeur);
        return this;
    }
}
