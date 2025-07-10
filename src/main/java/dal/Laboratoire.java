/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 *
 * @author kkoffi
 */
@Entity
@Table(name = "laboratoire")
public class Laboratoire extends AbstractEntity {

    @NotNull
    @Column(name = "libelle", nullable = false, unique = true)
    private String libelle;

    public String getLibelle() {
        return libelle;
    }

    public Laboratoire libelle(String libelle) {
        this.libelle = libelle;
        return this;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    @Override
    public String toString() {
        return "Laboratoire{" + ", libelle='" + getLibelle() + "'" + "}";
    }
}
