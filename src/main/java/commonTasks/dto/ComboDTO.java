/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.util.Objects;

/**
 *
 * @author DICI
 */
public class ComboDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String id;
    private String libelle;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public ComboDTO id(String id) {
        this.id = id;
        return this;
    }

    public String getLibelle() {
        return libelle;
    }

    public ComboDTO libelle(String libelle) {
        this.libelle = libelle;
        return this;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    @Override
    public String toString() {
        return "ComboDTO{" + "id=" + id + ", libelle=" + libelle + '}';
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 23 * hash + Objects.hashCode(this.id);
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
        final ComboDTO other = (ComboDTO) obj;
        return Objects.equals(this.id, other.id);
    }

    public ComboDTO(String id, String libelle) {
        this.id = id;
        this.libelle = libelle;
    }

    public ComboDTO(Number id, String libelle) {
        this.id = id + "";
        this.libelle = libelle;
    }

    public ComboDTO() {
    }

}
