/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TTypeRemise;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 *
 * @author Kobena
 */
public class TypeRemiseDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private String lgTYPEREMISEID, strNAME, strDESCRIPTION;
    private List<RemiseDTO> remises = new ArrayList<>();

    public String getLgTYPEREMISEID() {
        return lgTYPEREMISEID;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public void setLgTYPEREMISEID(String lgTYPEREMISEID) {
        this.lgTYPEREMISEID = lgTYPEREMISEID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public List<RemiseDTO> getRemises() {
        return remises;
    }

    public void setRemises(List<RemiseDTO> remises) {
        this.remises = remises;
    }

    public TypeRemiseDTO() {
    }

    public TypeRemiseDTO(TTypeRemise typeRemise) {
        this.lgTYPEREMISEID = typeRemise.getLgTYPEREMISEID();
        this.strNAME = typeRemise.getStrNAME();
        this.strDESCRIPTION = typeRemise.getStrDESCRIPTION();
        try {
            this.remises = typeRemise.getTRemiseCollection().stream().map(RemiseDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
        }

    }

}
