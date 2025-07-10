package dal;

import com.vladmihalcea.hibernate.type.json.JsonStringType;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;
import rest.service.fne.FneResponse;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "fne_invoice")
@TypeDef(name = "json", typeClass = JsonStringType.class)
public class FneTiersPayantInvoice implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 70)
    private final String id = UUID.randomUUID().toString();
    @NotNull
    @JoinColumn(name = "facture_id", referencedColumnName = "lg_FACTURE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFacture facture;
    @NotNull
    @Column(name = "mvt_date", nullable = false, updatable = false)
    private LocalDateTime mvtDate = LocalDateTime.now();
    @Type(type = "json")
    @Column(columnDefinition = "json", name = "response")
    private List<FneResponse> responses = new ArrayList<>();// Eclipse link n'accepte pas un object

    public String getId() {
        return id;
    }

    public TFacture getFacture() {
        return facture;
    }

    public void setFacture(TFacture facture) {
        this.facture = facture;
    }

    public LocalDateTime getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(LocalDateTime mvtDate) {
        this.mvtDate = mvtDate;
    }

    public List<FneResponse> getResponses() {
        return responses;
    }

    public void setResponses(List<FneResponse> responses) {
        this.responses = responses;
    }

}
