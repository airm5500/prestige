package dal;

import java.io.Serializable;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 * Referentiel des motifs de vente ratee. Administrable en base : ajouter, renommer ou desactiver un motif ne demande
 * aucune modification de code.
 */
@Entity
@Table(name = "t_motif_vente_ratee")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "MotifVenteRatee.findActifs", query = "SELECT m FROM MotifVenteRatee m WHERE m.strSTATUT = 'enable' ORDER BY m.intPRIORITY ASC, m.strLIBELLE ASC") })
public class MotifVenteRatee implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Basic(optional = false)
    @Column(name = "lg_MOTIF_ID", nullable = false, length = 40)
    private String lgMOTIFID;

    @Column(name = "str_LIBELLE", nullable = false, length = 100)
    private String strLIBELLE;

    @Column(name = "int_PRIORITY")
    private int intPRIORITY;

    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT = "enable";

    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;

    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public MotifVenteRatee() {
    }

    public MotifVenteRatee(String lgMOTIFID) {
        this.lgMOTIFID = lgMOTIFID;
    }

    public String getLgMOTIFID() {
        return lgMOTIFID;
    }

    public void setLgMOTIFID(String lgMOTIFID) {
        this.lgMOTIFID = lgMOTIFID;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
    }

    public int getIntPRIORITY() {
        return intPRIORITY;
    }

    public void setIntPRIORITY(int intPRIORITY) {
        this.intPRIORITY = intPRIORITY;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    @Override
    public int hashCode() {
        return (lgMOTIFID != null ? lgMOTIFID.hashCode() : 0);
    }

    @Override
    public boolean equals(Object object) {
        if (!(object instanceof MotifVenteRatee)) {
            return false;
        }
        MotifVenteRatee other = (MotifVenteRatee) object;
        return !((this.lgMOTIFID == null && other.lgMOTIFID != null)
                || (this.lgMOTIFID != null && !this.lgMOTIFID.equals(other.lgMOTIFID)));
    }

    @Override
    public String toString() {
        return "dal.MotifVenteRatee[ id=" + lgMOTIFID + " ]";
    }
}
