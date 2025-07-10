/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TClient;
import dal.TRemise;
import dal.TVille;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 *
 * @author Kobena
 */
public class ClientDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String lgCLIENTID;
    private String strCODEINTERNE;
    private String lgTIERSPAYANTID;
    private String email;
    private String lgVILLEID;
    private String dtNAISSANCE;
    private String strCODEPOSTAL;
    private String strFIRSTNAME;
    private String strLASTNAME;
    private String strNUMEROSECURITESOCIAL = "";
    private String strSEXE;
    private String strADRESSE;
    private String fullName;
    private String lgTYPECLIENTID;
    private List<TiersPayantParams> tiersPayants = new ArrayList<>();
    private List<AyantDroitDTO> ayantDroits = new ArrayList<>();
    private Integer intPOURCENTAGE;
    private Integer intPRIORITY;
    private Integer dbPLAFONDENCOURS = 0;
    private Integer dblQUOTACONSOMENSUELLE = 0;
    private Integer dblPLAFOND = 0;
    private boolean bIsAbsolute;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private final String lgCATEGORIEAYANTDROITID = "555146116095894790";
    private final String lgRISQUEID = "55181642844215217016";
    private String compteTp;
    private String remiseId;
    private List<TiersPayantParams> preenregistrementstp = new ArrayList<>();
    private String libelleTypeClient;

    public String getRemiseId() {
        return remiseId;
    }

    public void setRemiseId(String remiseId) {
        this.remiseId = remiseId;
    }

    public String getLibelleTypeClient() {
        return libelleTypeClient;
    }

    public void setLibelleTypeClient(String libelleTypeClient) {
        this.libelleTypeClient = libelleTypeClient;
    }

    public String getLgCLIENTID() {
        return lgCLIENTID;
    }

    public List<AyantDroitDTO> getAyantDroits() {
        return ayantDroits;
    }

    public List<TiersPayantParams> getPreenregistrementstp() {
        return preenregistrementstp;
    }

    public void setPreenregistrementstp(List<TiersPayantParams> preenregistrementstp) {
        this.preenregistrementstp = preenregistrementstp;
    }

    public Integer getDblPLAFOND() {
        return dblPLAFOND;
    }

    public void setDblPLAFOND(Integer dblPLAFOND) {
        this.dblPLAFOND = dblPLAFOND;
    }

    public void setAyantDroits(List<AyantDroitDTO> ayantDroits) {
        this.ayantDroits = ayantDroits;
    }

    public List<TiersPayantParams> getTiersPayants() {
        return tiersPayants;
    }

    public void setTiersPayants(List<TiersPayantParams> tiersPayants) {
        this.tiersPayants = tiersPayants;
    }

    public String getFullName() {
        return fullName;
    }

    public String getCompteTp() {
        return compteTp;
    }

    public void setCompteTp(String compteTp) {
        this.compteTp = compteTp;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 97 * hash + Objects.hashCode(this.lgCLIENTID);
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
        final ClientDTO other = (ClientDTO) obj;
        if (!Objects.equals(this.lgCLIENTID, other.lgCLIENTID)) {
            return false;
        }
        return true;
    }

    public void setLgCLIENTID(String lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
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

    public String getLgTYPECLIENTID() {
        return lgTYPECLIENTID;
    }

    public void setLgTYPECLIENTID(String lgTYPECLIENTID) {
        this.lgTYPECLIENTID = lgTYPECLIENTID;
    }

    public String getStrNUMEROSECURITESOCIAL() {
        return strNUMEROSECURITESOCIAL;
    }

    public void setStrNUMEROSECURITESOCIAL(String strNUMEROSECURITESOCIAL) {
        this.strNUMEROSECURITESOCIAL = strNUMEROSECURITESOCIAL;
    }

    public String getStrSEXE() {
        return strSEXE;
    }

    public void setStrSEXE(String strSEXE) {
        this.strSEXE = strSEXE;
    }

    public String getStrADRESSE() {
        return strADRESSE;
    }

    public void setStrADRESSE(String strADRESSE) {
        this.strADRESSE = strADRESSE;
    }

    public ClientDTO() {
    }

    public ClientDTO(TClient client) {
        this.lgCLIENTID = client.getLgCLIENTID();
        TRemise remise = client.getRemise();
        if (remise != null) {
            this.remiseId = remise.getLgREMISEID();
        }
        this.strCODEINTERNE = client.getStrCODEINTERNE();
        this.strFIRSTNAME = client.getStrFIRSTNAME();
        this.strLASTNAME = client.getStrLASTNAME();
        this.strNUMEROSECURITESOCIAL = client.getStrNUMEROSECURITESOCIAL();
        this.strSEXE = client.getStrSEXE();
        this.strADRESSE = client.getStrADRESSE();
        this.fullName = client.getStrFIRSTNAME() + " " + client.getStrLASTNAME();
        this.email = client.getEmail();
        this.libelleTypeClient = client.getLgTYPECLIENTID().getStrNAME();
    }

    public ClientDTO(TClient client, List<TiersPayantParams> tiersPayants, List<AyantDroitDTO> ayantDroits) {
        this.lgCLIENTID = client.getLgCLIENTID();
        TRemise remise = client.getRemise();
        if (remise != null) {
            this.remiseId = remise.getLgREMISEID();
        }
        this.email = client.getEmail();
        this.tiersPayants = tiersPayants;
        this.strCODEINTERNE = client.getStrCODEINTERNE();
        this.strFIRSTNAME = client.getStrFIRSTNAME();
        this.strLASTNAME = client.getStrLASTNAME();
        this.strNUMEROSECURITESOCIAL = client.getStrNUMEROSECURITESOCIAL();
        this.strSEXE = client.getStrSEXE();
        this.strADRESSE = client.getStrADRESSE();
        this.fullName = client.getStrFIRSTNAME() + " " + client.getStrLASTNAME();
        this.lgTYPECLIENTID = client.getLgTYPECLIENTID().getLgTYPECLIENTID();
        this.ayantDroits = ayantDroits;
        if (client.getDtNAISSANCE() != null) {
            this.dtNAISSANCE = dateFormat.format(client.getDtNAISSANCE());
        }
        TVille tv = client.getLgVILLEID();
        if (tv != null) {
            this.lgVILLEID = tv.getLgVILLEID();
        }
        try {
            TiersPayantParams tp = tiersPayants.get(0);
            this.lgTIERSPAYANTID = tp.getLgTIERSPAYANTID();
            this.bIsAbsolute = tp.isbIsAbsolute();
            this.dbPLAFONDENCOURS = tp.getDbPLAFONDENCOURS();
            this.dblQUOTACONSOMENSUELLE = tp.getDblPLAFOND();
            this.dblPLAFOND = tp.getDblPLAFOND();
            this.intPOURCENTAGE = tp.getTaux();
            this.intPRIORITY = tp.getOrder();
            this.compteTp = tp.getCompteTp();

        } catch (Exception e) {
        }

    }

    public ClientDTO(TClient client, List<TiersPayantParams> tiersPayants) {
        this.lgCLIENTID = client.getLgCLIENTID();
        TRemise remise = client.getRemise();
        if (remise != null) {
            this.remiseId = remise.getLgREMISEID();
        }
        this.email = client.getEmail();
        this.tiersPayants = tiersPayants;
        this.strCODEINTERNE = client.getStrCODEINTERNE();
        this.strFIRSTNAME = client.getStrFIRSTNAME();
        this.strLASTNAME = client.getStrLASTNAME();
        this.strNUMEROSECURITESOCIAL = client.getStrNUMEROSECURITESOCIAL();
        this.strSEXE = client.getStrSEXE();
        this.strADRESSE = client.getStrADRESSE();
        this.fullName = client.getStrFIRSTNAME() + " " + client.getStrLASTNAME();
        this.lgTYPECLIENTID = client.getLgTYPECLIENTID().getLgTYPECLIENTID();
        if (client.getDtNAISSANCE() != null) {
            this.dtNAISSANCE = dateFormat.format(client.getDtNAISSANCE());
        }
        TVille tv = client.getLgVILLEID();
        if (tv != null) {
            this.lgVILLEID = tv.getLgVILLEID();
        }
        try {
            TiersPayantParams tp = tiersPayants.get(0);
            this.lgTIERSPAYANTID = tp.getLgTIERSPAYANTID();
            this.bIsAbsolute = tp.isbIsAbsolute();
            this.dbPLAFONDENCOURS = tp.getDbPLAFONDENCOURS();
            this.dblQUOTACONSOMENSUELLE = tp.getDblPLAFOND();
            this.dblPLAFOND = tp.getDblPLAFOND();
            this.intPOURCENTAGE = tp.getTaux();
            this.intPRIORITY = 1;
            this.compteTp = tp.getCompteTp();

        } catch (Exception e) {
        }

    }

    public String getLgCATEGORIEAYANTDROITID() {
        return lgCATEGORIEAYANTDROITID;
    }

    public String getLgRISQUEID() {
        return lgRISQUEID;
    }

    public String getLgTIERSPAYANTID() {
        return lgTIERSPAYANTID;
    }

    public void setLgTIERSPAYANTID(String lgTIERSPAYANTID) {
        this.lgTIERSPAYANTID = lgTIERSPAYANTID;
    }

    public String getLgVILLEID() {
        return lgVILLEID;
    }

    public void setLgVILLEID(String lgVILLEID) {
        this.lgVILLEID = lgVILLEID;
    }

    public String getDtNAISSANCE() {
        return dtNAISSANCE;
    }

    public void setDtNAISSANCE(String dtNAISSANCE) {
        this.dtNAISSANCE = dtNAISSANCE;
    }

    public String getStrCODEPOSTAL() {
        return strCODEPOSTAL;
    }

    public void setStrCODEPOSTAL(String strCODEPOSTAL) {
        this.strCODEPOSTAL = strCODEPOSTAL;
    }

    public Integer getIntPOURCENTAGE() {
        return intPOURCENTAGE;
    }

    public void setIntPOURCENTAGE(Integer intPOURCENTAGE) {
        this.intPOURCENTAGE = intPOURCENTAGE;
    }

    public Integer getIntPRIORITY() {
        return intPRIORITY;
    }

    public void setIntPRIORITY(Integer intPRIORITY) {
        this.intPRIORITY = intPRIORITY;
    }

    public Integer getDbPLAFONDENCOURS() {
        return dbPLAFONDENCOURS;
    }

    public void setDbPLAFONDENCOURS(Integer dbPLAFONDENCOURS) {
        this.dbPLAFONDENCOURS = dbPLAFONDENCOURS;
    }

    public Integer getDblQUOTACONSOMENSUELLE() {
        return dblQUOTACONSOMENSUELLE;
    }

    public void setDblQUOTACONSOMENSUELLE(Integer dblQUOTACONSOMENSUELLE) {
        this.dblQUOTACONSOMENSUELLE = dblQUOTACONSOMENSUELLE;
    }

    public boolean isbIsAbsolute() {
        return bIsAbsolute;
    }

    public void setbIsAbsolute(boolean bIsAbsolute) {
        this.bIsAbsolute = bIsAbsolute;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public ClientDTO(TClient client, List<TiersPayantParams> tiersPayants, List<TiersPayantParams> preenregistrementstp,
            List<AyantDroitDTO> ayantDroits) {
        this.lgCLIENTID = client.getLgCLIENTID();
        TRemise remise = client.getRemise();
        this.email = client.getEmail();
        if (remise != null) {
            this.remiseId = remise.getLgREMISEID();
        }
        this.tiersPayants = tiersPayants;
        this.strCODEINTERNE = client.getStrCODEINTERNE();
        this.strFIRSTNAME = client.getStrFIRSTNAME();
        this.strLASTNAME = client.getStrLASTNAME();
        this.strNUMEROSECURITESOCIAL = client.getStrNUMEROSECURITESOCIAL();
        this.strSEXE = client.getStrSEXE();
        this.strADRESSE = client.getStrADRESSE();
        this.fullName = client.getStrFIRSTNAME() + " " + client.getStrLASTNAME();
        this.lgTYPECLIENTID = client.getLgTYPECLIENTID().getLgTYPECLIENTID();
        this.ayantDroits = ayantDroits;
        this.preenregistrementstp = preenregistrementstp;
        if (client.getDtNAISSANCE() != null) {
            this.dtNAISSANCE = dateFormat.format(client.getDtNAISSANCE());
        }
        TVille tv = client.getLgVILLEID();
        if (tv != null) {
            this.lgVILLEID = tv.getLgVILLEID();
        }
        try {
            TiersPayantParams tp = tiersPayants.get(0);
            this.lgTIERSPAYANTID = tp.getLgTIERSPAYANTID();
            this.bIsAbsolute = tp.isbIsAbsolute();
            this.dbPLAFONDENCOURS = tp.getDbPLAFONDENCOURS();
            this.dblQUOTACONSOMENSUELLE = tp.getDblPLAFOND();
            this.dblPLAFOND = tp.getDblPLAFOND();
            this.intPOURCENTAGE = tp.getTaux();
            this.intPRIORITY = tp.getOrder();
            this.compteTp = tp.getCompteTp();

        } catch (Exception e) {
        }
    }

}
