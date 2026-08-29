package rest.service.dto;

/**
 *
 * @author koben
 */
public class ModeReglementTDO {

    private String id;
    private String typeReglementId;
    private String name;
    private byte[] qrCode;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTypeReglementId() {
        return typeReglementId;
    }

    public void setTypeReglementId(String typeReglementId) {
        this.typeReglementId = typeReglementId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public byte[] getQrCode() {
        return qrCode;
    }

    public void setQrCode(byte[] qrCode) {
        this.qrCode = qrCode;
    }

    /** Client standard par defaut du mode (mobile money) — lot 3. */
    private String clientDefautId;
    private String clientDefautNom;

    public String getClientDefautId() {
        return clientDefautId;
    }

    public void setClientDefautId(String clientDefautId) {
        this.clientDefautId = clientDefautId;
    }

    public String getClientDefautNom() {
        return clientDefautNom;
    }

    public void setClientDefautNom(String clientDefautNom) {
        this.clientDefautNom = clientDefautNom;
    }

}
