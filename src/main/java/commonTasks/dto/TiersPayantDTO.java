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
public class TiersPayantDTO  implements Serializable {
    private static final long serialVersionUID = 1L;
      private String lgTIERSPAYANTID,strNAME,strFULLNAME;

    public String getLgTIERSPAYANTID() {
        return lgTIERSPAYANTID;
    }

    public void setLgTIERSPAYANTID(String lgTIERSPAYANTID) {
        this.lgTIERSPAYANTID = lgTIERSPAYANTID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public TiersPayantDTO(String lgTIERSPAYANTID, String strNAME, String strFULLNAME) {
        this.lgTIERSPAYANTID = lgTIERSPAYANTID;
        this.strNAME = strNAME;
        this.strFULLNAME = strFULLNAME;
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 47 * hash + Objects.hashCode(this.lgTIERSPAYANTID);
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
        final TiersPayantDTO other = (TiersPayantDTO) obj;
        if (!Objects.equals(this.lgTIERSPAYANTID, other.lgTIERSPAYANTID)) {
            return false;
        }
        return true;
    }

    public String getStrFULLNAME() {
        return strFULLNAME;
    }

    public void setStrFULLNAME(String strFULLNAME) {
        this.strFULLNAME = strFULLNAME;
    }

    public TiersPayantDTO() {
    }

    @Override
    public String toString() {
        return "TiersPayantDTO{" + "lgTIERSPAYANTID=" + lgTIERSPAYANTID + ", strNAME=" + strNAME + ", strFULLNAME=" + strFULLNAME + '}';
    }
      
      
    
}