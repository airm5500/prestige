package rest.service.dto;

public class UpdateCipDTO {

    private String newCip;
    private String grossisteId;
    /** "CIP" → mettre à jour int_CIP  /  "EAN" → mettre à jour int_EAN13 */
    private String field;

    public String getNewCip() { return newCip; }
    public void setNewCip(String newCip) { this.newCip = newCip; }

    public String getGrossisteId() { return grossisteId; }
    public void setGrossisteId(String grossisteId) { this.grossisteId = grossisteId; }

    public String getField() { return field; }
    public void setField(String field) { this.field = field; }
}
