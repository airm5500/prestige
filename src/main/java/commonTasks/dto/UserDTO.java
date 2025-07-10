/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;

/**
 *
 * @author Kobena
 */
public class UserDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String lgUSERID;
    private String strFIRSTNAME;
    private String strLASTNAME;
    private String fullName;

    public String getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(String lgUSERID) {
        this.lgUSERID = lgUSERID;
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

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public UserDTO(String lgUSERID, String strFIRSTNAME, String strLASTNAME) {
        this.lgUSERID = lgUSERID;
        this.strFIRSTNAME = strFIRSTNAME;
        this.strLASTNAME = strLASTNAME;
        this.fullName = strFIRSTNAME + " " + strLASTNAME;
    }

    public UserDTO() {
    }

}
