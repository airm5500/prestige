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
    private String ref;
    private String description;
    private String refParent;
    private String refTwo;
    private Integer value;
    private Integer valueTwo;
    private Integer valueThree;
    private Integer valueFour;
    /**
     * Doubles 64 bits des quatre valeurs ci-dessus. Les champs Integer restent la forme historique attendue par les
     * appelants existants, mais une valorisation de stock (22 000 produits) depasse Integer.MAX_VALUE et repartait
     * jusqu'ici en negatif. Les valeurs longues sont alimentees en meme temps que les Integer, par les constructeurs
     * comme par les setters : les deux formes restent coherentes quel que soit le chemin utilise.
     */
    private long valueLong;
    private long valueTwoLong;
    private long valueThreeLong;
    private long valueFourLong;
    private String dtStart = LocalDate.now().toString();
    private String dtEnd = dtStart;
    private String hrEnd;
    private String hrStart;
    private TUser operateur;
    boolean scheduled;
    boolean checkug;
    private String userId;
    /** Zone ciblee par un ajustement : RAYON (defaut) ou RESERVE. */
    private String zone;

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
        this.valueLong = value == null ? 0L : value;
    }

    public Integer getValueTwo() {
        return valueTwo;
    }

    public void setValueTwo(Integer valueTwo) {
        this.valueTwo = valueTwo;
        this.valueTwoLong = valueTwo == null ? 0L : valueTwo;
    }

    public Integer getValueThree() {
        return valueThree;
    }

    public void setValueThree(Integer valueThree) {
        this.valueThree = valueThree;
        this.valueThreeLong = valueThree == null ? 0L : valueThree;
    }

    public Integer getValueFour() {
        return valueFour;
    }

    public void setValueFour(Integer valueFour) {
        this.valueFour = valueFour;
        this.valueFourLong = valueFour == null ? 0L : valueFour;
    }

    // Les lectures 64 bits ne sont volontairement PAS nommees getXxx() : les listes de Params sont renvoyees au
    // navigateur par new JSONArray(liste), qui serialise tout accesseur getXxx(). Des getters ajouteraient quatre
    // champs aux reponses JSON de tous les ecrans qui manipulent des Params.

    public long longValue() {
        return valueLong;
    }

    public void setLongValue(long valueLong) {
        this.valueLong = valueLong;
        this.value = (int) valueLong;
    }

    public long longValueTwo() {
        return valueTwoLong;
    }

    public void setLongValueTwo(long valueTwoLong) {
        this.valueTwoLong = valueTwoLong;
        this.valueTwo = (int) valueTwoLong;
    }

    public long longValueThree() {
        return valueThreeLong;
    }

    public void setLongValueThree(long valueThreeLong) {
        this.valueThreeLong = valueThreeLong;
        this.valueThree = (int) valueThreeLong;
    }

    public long longValueFour() {
        return valueFourLong;
    }

    public void setLongValueFour(long valueFourLong) {
        this.valueFourLong = valueFourLong;
        this.valueFour = (int) valueFourLong;
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
        setLongValue(value);
        this.ref = ref;
    }

    public Params(String ref, String description) {
        this.description = description;
        this.ref = ref;
    }

    public Params(long value, long valueTwo) {
        setLongValue(value);
        setLongValueTwo(valueTwo);
    }

    public Params(long value, long valueTwo, long valueTree) {
        setLongValue(value);
        setLongValueTwo(valueTwo);
        setLongValueThree(valueTree);
    }

    public Params(String description, String ref, long value, long nbreClient, long nbreBons) {
        setLongValue(value);
        setLongValueTwo(nbreClient);
        setLongValueThree(nbreBons);
        this.ref = ref;
        this.description = description;
    }

    public Params(String ref, long value, long montantFacture, long montantRestant) {
        setLongValue(value);
        setLongValueTwo(montantFacture);
        setLongValueThree(montantRestant);
        this.ref = ref;
    }

    public Params(Params p, TTiersPayant payant) {
        setValue(p.getValue());
        setValueTwo(p.getValueTwo());
        setValueThree(p.getValueThree());
        this.refTwo = p.getDescription();

        try {
            this.ref = payant.getLgTYPETIERSPAYANTID().getStrLIBELLETYPETIERSPAYANT();
            this.description = payant.getStrFULLNAME();
        } catch (Exception e) {
        }
    }

    public Params(String description, String ref, double value, double nbreClient, double nbreBons) {
        setLongValue((long) value);
        setLongValueTwo((long) nbreClient);
        setLongValueThree((long) nbreBons);
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

    public String getZone() {
        return zone;
    }

    public void setZone(String zone) {
        this.zone = zone;
    }

}
