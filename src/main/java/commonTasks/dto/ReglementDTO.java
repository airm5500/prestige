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
public class ReglementDTO implements Serializable {
    private String lgTYPEREGLEMENTID;

    private String strNAME;

    public ReglementDTO(String lgTYPEREGLEMENTID, String strNAME) {
        this.lgTYPEREGLEMENTID = lgTYPEREGLEMENTID;
        this.strNAME = strNAME;
    }

    public ReglementDTO() {
    }

    public String getLgTYPEREGLEMENTID() {
        return lgTYPEREGLEMENTID;
    }

    public void setLgTYPEREGLEMENTID(String lgTYPEREGLEMENTID) {
        this.lgTYPEREGLEMENTID = lgTYPEREGLEMENTID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

}
