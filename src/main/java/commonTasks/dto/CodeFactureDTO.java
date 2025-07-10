/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;

/**
 *
 * @author kkoffi
 */
public class CodeFactureDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private String code, factureId;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getFactureId() {
        return factureId;
    }

    public void setFactureId(String factureId) {
        this.factureId = factureId;
    }

    public CodeFactureDTO(String code, String factureId) {
        this.code = code;
        this.factureId = factureId;
    }

    public CodeFactureDTO(String factureId) {
        this.factureId = factureId;
    }

    public CodeFactureDTO() {
    }

}
