package commonTasks.dto;

import java.io.Serializable;

/**
 * Ligne d'emplacement pour l'edition "Feuille de comptage des emplacements" (JasperReports).
 */
public class EmplacementReportDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String code;
    private String libelle;

    public EmplacementReportDTO() {
    }

    public EmplacementReportDTO(String code, String libelle) {
        this.code = code;
        this.libelle = libelle;
    }

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
}
