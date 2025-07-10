/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Table;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

/**
 *
 * @author kkoffi
 */
@Entity
@Table(name = "gamme_produit")
public class GammeProduit extends AbstractEntity {
    private static final long serialVersionUID = 1L;
    @NotNull
    @NotBlank
    @Column(name = "code", nullable = false, unique = true)
    private String code;
    @NotNull
    @NotBlank
    @Column(name = "libelle", nullable = false, unique = true)
    private String libelle;

    public String getCode() {
        return code;
    }

    public GammeProduit code(String code) {
        this.code = code;
        return this;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLibelle() {
        return libelle;
    }

    public GammeProduit libelle(String libelle) {
        this.libelle = libelle;
        return this;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    @Override
    public String toString() {
        return "GammeProduit{" + "id=" + getId() + ", code='" + getCode() + "'" + ", libelle='" + getLibelle() + "'"
                + ", status='" + getStatus() + "'" + "}";
    }

}
