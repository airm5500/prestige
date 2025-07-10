
package rest.service.dto;

import java.util.List;

/**
 *
 * @author airman
 */
public class OfficineDTO {

    private String id;
    private String fullName;
    private String nomComplet;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getNomComplet() {
        return nomComplet;
    }

    public void setNomComplet(String nomComplet) {
        this.nomComplet = nomComplet;
    }

    // Constructeurs
    public OfficineDTO() {
    }

    public OfficineDTO(String id, String fullName, String nomComplet) {
        this.id = id;
        this.fullName = fullName;
        this.nomComplet = nomComplet;
    }

}
