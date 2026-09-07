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

    /** Vrai si le type du mode est du mobile money (voir util.MobileMoney). */
    private boolean mobileMoney;
    /** Ce mode ouvre-t-il le parcours « choisir ou creer un client » a la vente ? (point 12) */
    private boolean clientRequis;

    public boolean isMobileMoney() {
        return mobileMoney;
    }

    public void setMobileMoney(boolean mobileMoney) {
        this.mobileMoney = mobileMoney;
    }

    public boolean isClientRequis() {
        return clientRequis;
    }

    public void setClientRequis(boolean clientRequis) {
        this.clientRequis = clientRequis;
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
