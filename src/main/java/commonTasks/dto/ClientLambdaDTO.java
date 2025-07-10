/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TClient;
import dal.TTypeClient;
import java.io.Serializable;
import java.util.Objects;

/**
 *
 * @author Kobena
 */
public class ClientLambdaDTO implements Serializable {

    private String lgCLIENTID, strFIRSTNAME, strLASTNAME, strADRESSE, lgTYPECLIENTID, strSEXE, email;

    public String getLgCLIENTID() {
        return lgCLIENTID;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setLgCLIENTID(String lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
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

    public String getStrADRESSE() {
        return strADRESSE;
    }

    public void setStrADRESSE(String strADRESSE) {
        this.strADRESSE = strADRESSE;
    }

    public String getLgTYPECLIENTID() {
        return lgTYPECLIENTID;
    }

    public void setLgTYPECLIENTID(String lgTYPECLIENTID) {
        this.lgTYPECLIENTID = lgTYPECLIENTID;
    }

    public String getStrSEXE() {
        return strSEXE;
    }

    public void setStrSEXE(String strSEXE) {
        this.strSEXE = strSEXE;
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 23 * hash + Objects.hashCode(this.lgCLIENTID);
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
        final ClientLambdaDTO other = (ClientLambdaDTO) obj;
        if (!Objects.equals(this.lgCLIENTID, other.lgCLIENTID)) {
            return false;
        }
        return true;
    }

    public ClientLambdaDTO(String lgCLIENTID, String strFIRSTNAME, String strLASTNAME, String strADRESSE,
            String lgTYPECLIENTID, String strSEXE, String email) {
        this.lgCLIENTID = lgCLIENTID;
        this.strFIRSTNAME = strFIRSTNAME;
        this.strLASTNAME = strLASTNAME;
        this.strADRESSE = strADRESSE;
        this.lgTYPECLIENTID = lgTYPECLIENTID;
        this.strSEXE = strSEXE;
        this.email = email;
    }

    public ClientLambdaDTO(TClient c) {
        this.lgCLIENTID = c.getLgCLIENTID();
        this.strFIRSTNAME = c.getStrFIRSTNAME();
        this.strLASTNAME = c.getStrLASTNAME();
        this.strADRESSE = c.getStrADRESSE();
        TTypeClient ttc = c.getLgTYPECLIENTID();
        if (ttc != null) {
            this.lgTYPECLIENTID = ttc.getLgTYPECLIENTID();
        }

        this.strSEXE = c.getStrSEXE();
        this.email = c.getEmail();
    }

    public ClientLambdaDTO() {
    }

}
