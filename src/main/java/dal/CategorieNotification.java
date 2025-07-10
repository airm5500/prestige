package dal;

import dal.enumeration.Canal;
import java.io.Serializable;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.UniqueConstraint;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "categorie_notification", uniqueConstraints = { @UniqueConstraint(columnNames = { "name" }) })
@NamedQueries({
        @NamedQuery(name = "CategorieNotification.findByCanal", query = "SELECT o FROM CategorieNotification o WHERE  o.canal=:canal "),
        @NamedQuery(name = "CategorieNotification.findOneByName", query = "SELECT o FROM CategorieNotification o WHERE  o.name=:name "),
        @NamedQuery(name = "CategorieNotification.all", query = "SELECT o FROM CategorieNotification o  ") })
public class CategorieNotification implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id")
    private Integer id;
    @NotNull
    @Column(name = "libelle", nullable = false)
    private String libelle;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "canal", nullable = false, length = 18)
    private Canal canal = Canal.EMAIL;
    @NotNull
    @Column(name = "name", nullable = false, unique = true)
    private String name;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Canal getCanal() {
        return canal;
    }

    public void setCanal(Canal canal) {
        this.canal = canal;
    }

}
