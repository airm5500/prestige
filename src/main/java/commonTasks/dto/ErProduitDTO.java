
package commonTasks.dto;

import dal.TFamille;
import dal.TFamilleStock;

import java.io.Serializable;

/**
 *
 * @author Hermann N'ZI
 */
public class ErProduitDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String familleId;
    private String familleCip;
    private String familleLibelle;
    private Integer pachat;
    private Integer pvente;
    private Integer stock;
    private String emplacement;

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public String getFamilleId() {
        return familleId;
    }

    public void setFamilleId(String familleId) {
        this.familleId = familleId;
    }

    public String getFamilleCip() {
        return familleCip;
    }

    public void setFamilleCip(String familleCip) {
        this.familleCip = familleCip;
    }

    public String getFamilleLibelle() {
        return familleLibelle;
    }

    public void setFamilleLibelle(String familleLibelle) {
        this.familleLibelle = familleLibelle;
    }

    public Integer getPachat() {
        return pachat;
    }

    public void setPachat(Integer pachat) {
        this.pachat = pachat;
    }

    public Integer getPvente() {
        return pvente;
    }

    public void setPvente(Integer pvente) {
        this.pvente = pvente;
    }

    public String getEmplacement() {
        return emplacement;
    }

    public void setEmplacement(String emplacement) {
        this.emplacement = emplacement;
    }

    public ErProduitDTO(TFamilleStock fs) {

        TFamille f = fs.getLgFAMILLEID();

        this.familleId = f.getLgFAMILLEID();
        this.familleCip = f.getIntCIP();
        this.familleLibelle = f.getStrNAME();
        this.pachat = f.getIntPAF();
        this.pvente = f.getIntPRICE();
        this.stock = fs.getIntNUMBER();
        this.emplacement = f.getLgZONEGEOID().getStrLIBELLEE();

    }

    public ErProduitDTO() {
    }

}
