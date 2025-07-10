/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TTiersPayant;
import dal.TUser;
import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;

/**
 *
 * @author DICI
 */
public class Params implements Serializable {

    private static final long serialVersionUID = 1L;
    private String ref, description, refParent, refTwo;
    private Integer value, valueTwo, valueThree, valueFour;
    private String dtStart = LocalDate.now().toString();
    private String dtEnd = dtStart;
    private String hrEnd;
    private String hrStart;
    private TUser operateur;
    boolean scheduled;
    boolean checkug;
    private String userId;

    public String getHrEnd() {
        return hrEnd;
    }

    public void setHrEnd(String hrEnd) {
        this.hrEnd = hrEnd;
    }

    public String getHrStart() {
        return hrStart;
    }

    public void setHrStart(String hrStart) {
        this.hrStart = hrStart;
    }

    public String getRefParent() {
        return refParent;
    }

    public boolean isScheduled() {
        return scheduled;
    }

    public void setScheduled(boolean scheduled) {
        this.scheduled = scheduled;
    }

    public String getDtStart() {
        return dtStart;
    }

    public void setDtStart(String dtStart) {
        this.dtStart = dtStart;
    }

    public String getDtEnd() {
        return dtEnd;
    }

    public void setDtEnd(String dtEnd) {
        this.dtEnd = dtEnd;
    }

    public TUser getOperateur() {
        return operateur;
    }

    public void setOperateur(TUser operateur) {
        this.operateur = operateur;
    }

    public void setRefParent(String refParent) {
        this.refParent = refParent;
    }

    public String getRefTwo() {
        return refTwo;
    }

    public void setRefTwo(String refTwo) {
        this.refTwo = refTwo;
    }

    public String getRef() {
        return ref;
    }

    public void setRef(String ref) {
        this.ref = ref;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getValue() {
        return value;
    }

    public void setValue(Integer value) {
        this.value = value;
    }

    public Integer getValueTwo() {
        return valueTwo;
    }

    public void setValueTwo(Integer valueTwo) {
        this.valueTwo = valueTwo;
    }

    public Integer getValueThree() {
        return valueThree;
    }

    public void setValueThree(Integer valueThree) {
        this.valueThree = valueThree;
    }

    public Integer getValueFour() {
        return valueFour;
    }

    public void setValueFour(Integer valueFour) {
        this.valueFour = valueFour;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 79 * hash + Objects.hashCode(this.ref);
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
        final Params other = (Params) obj;
        return Objects.equals(this.ref, other.ref);
    }

    public Params() {
    }

    public Params(String ref, long value) {
        this.value = (int) value;
        this.ref = ref;
    }

    public Params(String ref, String description) {
        this.description = description;
        this.ref = ref;
    }

    public Params(long value, long valueTwo) {
        this.value = (int) value;
        this.valueTwo = (int) valueTwo;
    }

    public Params(long value, long valueTwo, long valueTree) {
        this.value = (int) value;
        this.valueTwo = (int) valueTwo;
        this.valueThree = (int) valueTree;
    }

    public Params(String description, String ref, long value, long nbreClient, long nbreBons) {
        this.value = (int) value;
        this.valueTwo = (int) nbreClient;
        this.valueThree = (int) nbreBons;
        this.ref = ref;
        this.description = description;
    }

    public Params(String ref, long value, long montantFacture, long montantRestant) {
        this.value = (int) value;
        this.valueTwo = (int) montantFacture;
        this.valueThree = (int) montantRestant;
        this.ref = ref;
    }

    public Params(Params p, TTiersPayant payant) {
        this.value = p.getValue();
        this.valueTwo = p.getValueTwo();
        this.valueThree = p.getValueThree();
        this.refTwo = p.getDescription();

        try {
            this.ref = payant.getLgTYPETIERSPAYANTID().getStrLIBELLETYPETIERSPAYANT();
            this.description = payant.getStrFULLNAME();
        } catch (Exception e) {
        }
    }

    public Params(String description, String ref, double value, double nbreClient, double nbreBons) {
        this.value = (int) value;
        this.valueTwo = (int) nbreClient;
        this.valueThree = (int) nbreBons;
        this.ref = ref;
        this.description = description;
    }

    public boolean isCheckug() {
        return checkug;
    }

    public void setCheckug(boolean checkug) {
        this.checkug = checkug;
    }

    public Params ref(String ref) {
        this.ref = ref;
        return this;
    }

    @Override
    public String toString() {
        return "Params{" + "ref=" + ref + ", description=" + description + ", refParent=" + refParent + ", refTwo="
                + refTwo + ", value=" + value + ", valueTwo=" + valueTwo + ", valueThree=" + valueThree + ", valueFour="
                + valueFour + ", dtStart=" + dtStart + ", dtEnd=" + dtEnd + ", hrEnd=" + hrEnd + ", hrStart=" + hrStart
                + ", operateur=" + operateur + ", scheduled=" + scheduled + ", checkug=" + checkug + ", userId="
                + userId + '}';
    }

}
