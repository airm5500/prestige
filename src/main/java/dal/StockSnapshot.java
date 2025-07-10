/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import com.vladmihalcea.hibernate.type.json.JsonStringType;
import java.io.Serializable;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToOne;
import javax.persistence.Table;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

/**
 *
 * @author koben
 */
@Entity
@TypeDef(name = "json", typeClass = JsonStringType.class)
@Table(name = "stock_snapshot")
@NamedQueries({ @NamedQuery(name = "StockSnapshot.findAll", query = " SELECT o FROM StockSnapshot o ")

})
public class StockSnapshot implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Column(name = "id", nullable = false, length = 40)
    private String id;
    @OneToOne
    @JoinColumn(name = "produit_id", referencedColumnName = "lg_FAMILLE_ID")
    private TFamille produit;
    @Type(type = "json")
    @Column(columnDefinition = "json", name = "stock_journalier")
    private Set<StockSnapshotValue> stocks = new HashSet<>();

    public Set<StockSnapshotValue> getStocks() {
        if (this.stocks == null) {
            this.stocks = new HashSet<>();
        }
        return stocks;
    }

    public void setStocks(Set<StockSnapshotValue> stocks) {
        if (this.stocks == null) {
            this.stocks = new HashSet<>();
        }
        this.stocks = stocks;
    }

    public StockSnapshot stocks(Set<StockSnapshotValue> stocks) {
        this.stocks = stocks;
        return this;
    }

    public StockSnapshot addStockSnapshot(StockSnapshotValue stockSnapshotValue) {
        if (this.stocks == null) {
            this.stocks = new HashSet<>();

        }
        getStocks().add(stockSnapshotValue);
        return this;
    }

    public String getId() {
        return id;
    }

    public StockSnapshot id(String id) {
        this.id = id;
        return this;
    }

    public void setId(String id) {
        this.id = id;
    }

    public TFamille getProduit() {
        return produit;
    }

    public void setProduit(TFamille produit) {
        this.produit = produit;
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 53 * hash + Objects.hashCode(this.id);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final StockSnapshot other = (StockSnapshot) obj;
        if (!Objects.equals(this.id, other.id)) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "StockSnapshot{" + "id=" + id + '}';
    }

}
