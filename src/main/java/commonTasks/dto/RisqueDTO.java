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
 * @author Kobena
 */
public class RisqueDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private String lgRISQUEID;
    private String strLIBELLERISQUE, lgTYPERISQUEID, strNAME;

    public RisqueDTO() {
    }

    public String getLgRISQUEID() {
        return lgRISQUEID;
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 13 * hash + Objects.hashCode(this.lgRISQUEID);
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
        final RisqueDTO other = (RisqueDTO) obj;
        if (!Objects.equals(this.lgRISQUEID, other.lgRISQUEID)) {
            return false;
        }
        return true;
    }

    public void setLgRISQUEID(String lgRISQUEID) {
        this.lgRISQUEID = lgRISQUEID;
    }

    public String getStrLIBELLERISQUE() {
        return strLIBELLERISQUE;
    }

    public void setStrLIBELLERISQUE(String strLIBELLERISQUE) {
        this.strLIBELLERISQUE = strLIBELLERISQUE;
    }

    public String getLgTYPERISQUEID() {
        return lgTYPERISQUEID;
    }

    public void setLgTYPERISQUEID(String lgTYPERISQUEID) {
        this.lgTYPERISQUEID = lgTYPERISQUEID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public RisqueDTO(String lgRISQUEID, String strLIBELLERISQUE, String lgTYPERISQUEID, String strNAME) {
        this.lgRISQUEID = lgRISQUEID;
        this.strLIBELLERISQUE = strLIBELLERISQUE;
        this.lgTYPERISQUEID = lgTYPERISQUEID;
        this.strNAME = strNAME;
    }

}
