/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 * Controle de coherence parametrable du Centre de Support. Chaque ligne porte une requete SQL en lecture seule qui
 * renvoie les lignes fautives (1ere colonne = id, 2e = contexte).
 *
 * @author koben
 */
@Entity
@Table(name = "t_support_controle")
@NamedQueries({
        @NamedQuery(name = "SupportControle.all", query = "SELECT o FROM SupportControle o ORDER BY o.ordre ASC"),
        @NamedQuery(name = "SupportControle.actifs", query = "SELECT o FROM SupportControle o WHERE o.actif = true ORDER BY o.ordre ASC") })
public class SupportControle extends AbstractEntity {

    private static final long serialVersionUID = 1L;

    @NotNull
    @Column(name = "code", nullable = false, length = 60)
    private String code;
    @NotNull
    @Column(name = "libelle", nullable = false)
    private String libelle;
    @Column(name = "module", length = 50)
    private String module;
    @NotNull
    @Column(name = "requete_sql", nullable = false)
    private String requeteSql;
    @Column(name = "dry_run", nullable = false)
    private boolean dryRun = true;
    @Column(name = "actif", nullable = false)
    private boolean actif = true;
    @Column(name = "ordre", nullable = false)
    private int ordre;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public String getRequeteSql() {
        return requeteSql;
    }

    public void setRequeteSql(String requeteSql) {
        this.requeteSql = requeteSql;
    }

    public boolean isDryRun() {
        return dryRun;
    }

    public void setDryRun(boolean dryRun) {
        this.dryRun = dryRun;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }

    public int getOrdre() {
        return ordre;
    }

    public void setOrdre(int ordre) {
        this.ordre = ordre;
    }

}
