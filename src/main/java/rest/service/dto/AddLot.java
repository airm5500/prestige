
package rest.service.dto;

/**
 *
 * @author koben
 */
public class AddLot {

    private int qty;
    private int freeQty;
    private String numLot;
    private String idBonDetail;
    private String idEtiquette;
    private String dateUsine;
    private String datePeremption;
    private boolean directImport;

    public int getQty() {
        return qty;
    }

    public void setQty(int qty) {
        this.qty = qty;
    }

    public int getFreeQty() {
        return freeQty;
    }

    public void setFreeQty(int freeQty) {
        this.freeQty = freeQty;
    }

    public String getNumLot() {
        return numLot;
    }

    public void setNumLot(String numLot) {
        this.numLot = numLot;
    }

    public String getIdBonDetail() {
        return idBonDetail;
    }

    public void setIdBonDetail(String idBonDetail) {
        this.idBonDetail = idBonDetail;
    }

    public String getIdEtiquette() {
        return idEtiquette;
    }

    public void setIdEtiquette(String idEtiquette) {
        this.idEtiquette = idEtiquette;
    }

    public String getDateUsine() {
        return dateUsine;
    }

    public void setDateUsine(String dateUsine) {
        this.dateUsine = dateUsine;
    }

    public String getDatePeremption() {
        return datePeremption;
    }

    public void setDatePeremption(String datePeremption) {
        this.datePeremption = datePeremption;
    }

    public boolean isDirectImport() {
        return directImport;
    }

    public void setDirectImport(boolean directImport) {
        this.directImport = directImport;
    }

}
