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
public class CategorieAyantdroitDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String lgCATEGORIEAYANTDROITID;
    private String strLIBELLECATEGORIEAYANTDROIT;

    public CategorieAyantdroitDTO(String lgCATEGORIEAYANTDROITID, String strLIBELLECATEGORIEAYANTDROIT) {
        this.lgCATEGORIEAYANTDROITID = lgCATEGORIEAYANTDROITID;
        this.strLIBELLECATEGORIEAYANTDROIT = strLIBELLECATEGORIEAYANTDROIT;
    }

    public String getLgCATEGORIEAYANTDROITID() {
        return lgCATEGORIEAYANTDROITID;
    }

    public void setLgCATEGORIEAYANTDROITID(String lgCATEGORIEAYANTDROITID) {
        this.lgCATEGORIEAYANTDROITID = lgCATEGORIEAYANTDROITID;
    }

    public String getStrLIBELLECATEGORIEAYANTDROIT() {
        return strLIBELLECATEGORIEAYANTDROIT;
    }

    public void setStrLIBELLECATEGORIEAYANTDROIT(String strLIBELLECATEGORIEAYANTDROIT) {
        this.strLIBELLECATEGORIEAYANTDROIT = strLIBELLECATEGORIEAYANTDROIT;
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 97 * hash + Objects.hashCode(this.lgCATEGORIEAYANTDROITID);
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
        final CategorieAyantdroitDTO other = (CategorieAyantdroitDTO) obj;
        return Objects.equals(this.lgCATEGORIEAYANTDROITID, other.lgCATEGORIEAYANTDROITID);
    }

    public CategorieAyantdroitDTO() {
    }

}
