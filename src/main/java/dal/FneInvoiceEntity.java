package dal;

import java.io.Serializable;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.Lob;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;

/**
 * Trace des appels a la plateforme FNE pour une facture : reponse JSON complete de la certification de vente (type
 * SALE) et de l'avoir (type AVOIR). L'id est l'identifiant FNE de la facture (invoice.id de la reponse de
 * certification) ; c'est lui qu'exige l'endpoint /refund.
 *
 * @author koben
 */
@Entity
@Table(name = "fne_invoice")
public class FneInvoiceEntity implements Serializable {

    private static final long serialVersionUID = 1L;

    public static final String TYPE_SALE = "SALE";
    public static final String TYPE_AVOIR = "AVOIR";

    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 70)
    private String id;
    @Basic(optional = false)
    @Column(name = "mvt_date", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date mvtDate;
    @Column(name = "type", length = 20)
    private String type = TYPE_SALE;
    @Column(name = "reference", length = 70)
    private String reference;
    @Lob
    @Column(name = "response")
    private String response;
    @JoinColumn(name = "facture_id", referencedColumnName = "lg_FACTURE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFacture facture;

    public FneInvoiceEntity() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Date getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(Date mvtDate) {
        this.mvtDate = mvtDate;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getResponse() {
        return response;
    }

    public void setResponse(String response) {
        this.response = response;
    }

    public TFacture getFacture() {
        return facture;
    }

    public void setFacture(TFacture facture) {
        this.facture = facture;
    }

}
