package rest.service.dto;

public class UpdateCipDTO {

    private String newCip;
    private String grossisteId;

    public String getNewCip() {
        return newCip;
    }

    public void setNewCip(String newCip) {
        this.newCip = newCip;
    }

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
    }
}
