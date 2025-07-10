/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "flag")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "Flag.findAll", query = "SELECT o FROM Flag o ORDER BY o.dateStart DESC"),
        @NamedQuery(name = "Flag.checkDate", query = "SELECT o FROM Flag o WHERE o.interval LIKE ?1") }

)
public class Flag implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 16)
    private String id;
    @NotNull
    @Column(name = "montant", nullable = false)
    private Integer montant;
    @NotNull
    @Column(name = "date_start", nullable = false, length = 8)
    private Integer dateStart;
    @NotNull
    @Column(name = "date_end", nullable = false, length = 8)
    private Integer dateEnd;
    @Column(name = "periode_interval")
    private String interval;

    public String getInterval() {
        return interval;
    }

    public void setInterval(String interval) {
        this.interval = interval;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getMontant() {
        return montant;
    }

    public void setMontant(Integer montant) {
        this.montant = montant;
    }

    public Integer getDateStart() {
        return dateStart;
    }

    public void setDateStart(Integer dateStart) {
        this.dateStart = dateStart;
    }

    public Integer getDateEnd() {
        return dateEnd;
    }

    public void setDateEnd(Integer dateEnd) {
        this.dateEnd = dateEnd;
    }

    @Override
    public String toString() {
        return "Flag{" + "id=" + id + ", montant=" + montant + ", dateStart=" + dateStart + ", dateEnd=" + dateEnd
                + '}';
    }

}
