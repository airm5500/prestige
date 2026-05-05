/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import dal.enumeration.TypeLience;
import java.io.Serializable;
import java.time.LocalDate;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
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
@Table(name = "licence")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "Licence.findByTypeLience", query = "SELECT t FROM Licence t WHERE t.typeLicence=:typeLicence") })
public class Licence implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 200)
    private String id;
    @NotNull
    @Column(name = "date_start", nullable = false)
    private LocalDate dateStart = LocalDate.now();
    @NotNull
    @Column(name = "date_end", nullable = false)
    private LocalDate dateEnd = LocalDate.now().plusMonths(6);
    @Enumerated(EnumType.ORDINAL)
    @Column(name = "type_licence", nullable = false)
    private TypeLience typeLicence = TypeLience.CALLEBASE;

    public String getId() {
        return id;
    }

    public TypeLience getTypeLicence() {
        return typeLicence;
    }

    public void setTypeLicence(TypeLience typeLicence) {
        this.typeLicence = typeLicence;
    }

    public void setId(String id) {
        this.id = id;
    }

    public LocalDate getDateStart() {
        return dateStart;
    }

    public void setDateStart(LocalDate dateStart) {
        this.dateStart = dateStart;
    }

    public LocalDate getDateEnd() {
        return dateEnd;
    }

    public void setDateEnd(LocalDate dateEnd) {
        this.dateEnd = dateEnd;
    }

}
