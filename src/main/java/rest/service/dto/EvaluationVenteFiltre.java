package rest.service.dto;

/**
 *
 * @author koben
 */
public class EvaluationVenteFiltre {

    private String familleId;
    private String emplacementId;
    private String filtre;
    private Float filtreValue;
    private String query;
    private int start;
    private int limit;
    private boolean all;

    public String getFamilleId() {
        return familleId;
    }

    public boolean isAll() {
        return all;
    }

    public void setAll(boolean all) {
        this.all = all;
    }

    public void setFamilleId(String familleId) {
        this.familleId = familleId;
    }

    public String getEmplacementId() {
        return emplacementId;
    }

    public void setEmplacementId(String emplacementId) {
        this.emplacementId = emplacementId;
    }

    public String getFiltre() {
        return filtre;
    }

    public void setFiltre(String filtre) {
        this.filtre = filtre;
    }

    public Float getFiltreValue() {
        return filtreValue;
    }

    public void setFiltreValue(Float filtreValue) {
        this.filtreValue = filtreValue;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public int getStart() {
        return start;
    }

    public void setStart(int start) {
        this.start = start;
    }

    public int getLimit() {
        return limit;
    }

    public void setLimit(int limit) {
        this.limit = limit;
    }

}
