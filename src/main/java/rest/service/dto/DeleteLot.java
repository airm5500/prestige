
package rest.service.dto;

/**
 *
 * @author koben
 */
public class DeleteLot {

    private String idProduit;
    private String idBonDetail;
    private String numLot;
    private String refBon;
    private boolean removeLot;

    public String getIdProduit() {
        return idProduit;
    }

    public void setIdProduit(String idProduit) {
        this.idProduit = idProduit;
    }

    public String getIdBonDetail() {
        return idBonDetail;
    }

    public String getRefBon() {
        return refBon;
    }

    public void setRefBon(String refBon) {
        this.refBon = refBon;
    }

    public void setIdBonDetail(String idBonDetail) {
        this.idBonDetail = idBonDetail;
    }

    public String getNumLot() {
        return numLot;
    }

    public void setNumLot(String numLot) {
        this.numLot = numLot;
    }

    public boolean isRemoveLot() {
        return removeLot;
    }

    public void setRemoveLot(boolean removeLot) {
        this.removeLot = removeLot;
    }

}
