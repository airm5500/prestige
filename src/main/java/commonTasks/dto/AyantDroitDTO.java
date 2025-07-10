/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TAyantDroit;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.util.Objects;

/**
 *
 * @author Kobena
 */
public class AyantDroitDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String lgAYANTSDROITSID, strCODEINTERNE, dtNAISSANCE, strFIRSTNAME, strSEXE, strLASTNAME,
            strNUMEROSECURITESOCIAL, fullName, lgCLIENTID;
    private final String lgCATEGORIEAYANTDROITID = "555146116095894790", lgRISQUEID = "55181642844215217016";
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");

    public String getDtNAISSANCE() {
        return dtNAISSANCE;
    }

    public void setDtNAISSANCE(String dtNAISSANCE) {
        this.dtNAISSANCE = dtNAISSANCE;
    }

    public String getLgAYANTSDROITSID() {
        return lgAYANTSDROITSID;
    }

    public void setLgAYANTSDROITSID(String lgAYANTSDROITSID) {
        this.lgAYANTSDROITSID = lgAYANTSDROITSID;
    }

    public String getStrCODEINTERNE() {
        return strCODEINTERNE;
    }

    public void setStrCODEINTERNE(String strCODEINTERNE) {
        this.strCODEINTERNE = strCODEINTERNE;
    }

    public String getStrFIRSTNAME() {
        return strFIRSTNAME;
    }

    public void setStrFIRSTNAME(String strFIRSTNAME) {
        this.strFIRSTNAME = strFIRSTNAME;
    }

    public String getStrLASTNAME() {
        return strLASTNAME;
    }

    public void setStrLASTNAME(String strLASTNAME) {
        this.strLASTNAME = strLASTNAME;
    }

    public String getStrNUMEROSECURITESOCIAL() {
        return strNUMEROSECURITESOCIAL;
    }

    public void setStrNUMEROSECURITESOCIAL(String strNUMEROSECURITESOCIAL) {
        this.strNUMEROSECURITESOCIAL = strNUMEROSECURITESOCIAL;
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 97 * hash + Objects.hashCode(this.lgAYANTSDROITSID);
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
        final AyantDroitDTO other = (AyantDroitDTO) obj;
        if (!Objects.equals(this.lgAYANTSDROITSID, other.lgAYANTSDROITSID)) {
            return false;
        }
        return true;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public AyantDroitDTO(TAyantDroit ayantDroit) {
        if (ayantDroit != null) {
            this.lgAYANTSDROITSID = ayantDroit.getLgAYANTSDROITSID();
            this.strCODEINTERNE = ayantDroit.getStrCODEINTERNE();
            this.strFIRSTNAME = ayantDroit.getStrFIRSTNAME();
            this.strLASTNAME = ayantDroit.getStrLASTNAME();
            this.lgCLIENTID = ayantDroit.getLgCLIENTID().getLgCLIENTID();
            this.strNUMEROSECURITESOCIAL = ayantDroit.getStrNUMEROSECURITESOCIAL();
            this.fullName = ayantDroit.getStrFIRSTNAME().concat(" ").concat(ayantDroit.getStrLASTNAME());
            this.strSEXE = ayantDroit.getStrSEXE();
            try {
                this.dtNAISSANCE = dateFormat.format(ayantDroit.getDtNAISSANCE());
            } catch (Exception e) {
            }
        }
    }

    public String getStrSEXE() {
        return strSEXE;
    }

    public void setStrSEXE(String strSEXE) {
        this.strSEXE = strSEXE;
    }

    public String getLgCATEGORIEAYANTDROITID() {
        return lgCATEGORIEAYANTDROITID;
    }

    public String getLgRISQUEID() {
        return lgRISQUEID;
    }

    public AyantDroitDTO() {
    }

    @Override
    public String toString() {
        return "AyantDroitDTO{" + "lgAYANTSDROITSID=" + lgAYANTSDROITSID + ", strCODEINTERNE=" + strCODEINTERNE
                + ", strFIRSTNAME=" + strFIRSTNAME + ", strLASTNAME=" + strLASTNAME + ", strNUMEROSECURITESOCIAL="
                + strNUMEROSECURITESOCIAL + '}';
    }

    public String getLgCLIENTID() {
        return lgCLIENTID;
    }

    public void setLgCLIENTID(String lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
    }

}
