package commonTasks.dto;

import java.io.Serializable;

/**
 * Ligne de la balance agee detaillee par tiers payant avec repartition mensuelle (6 derniers mois + anterieur).
 */
public class BalanceAgeeMensuelDTO implements Serializable {

    private String tiersPayantId;
    private String tiersPayant;
    private long nbTransactions;
    private long mois1;
    private long mois2;
    private long mois3;
    private long mois4;
    private long mois5;
    private long mois6;
    private long moinsSixMois;

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public String getTiersPayant() {
        return tiersPayant;
    }

    public void setTiersPayant(String tiersPayant) {
        this.tiersPayant = tiersPayant;
    }

    public long getNbTransactions() {
        return nbTransactions;
    }

    public void setNbTransactions(long nbTransactions) {
        this.nbTransactions = nbTransactions;
    }

    public long getMois1() {
        return mois1;
    }

    public void setMois1(long mois1) {
        this.mois1 = mois1;
    }

    public long getMois2() {
        return mois2;
    }

    public void setMois2(long mois2) {
        this.mois2 = mois2;
    }

    public long getMois3() {
        return mois3;
    }

    public void setMois3(long mois3) {
        this.mois3 = mois3;
    }

    public long getMois4() {
        return mois4;
    }

    public void setMois4(long mois4) {
        this.mois4 = mois4;
    }

    public long getMois5() {
        return mois5;
    }

    public void setMois5(long mois5) {
        this.mois5 = mois5;
    }

    public long getMois6() {
        return mois6;
    }

    public void setMois6(long mois6) {
        this.mois6 = mois6;
    }

    public long getMoinsSixMois() {
        return moinsSixMois;
    }

    public void setMoinsSixMois(long moinsSixMois) {
        this.moinsSixMois = moinsSixMois;
    }

    public long getTotalSixMois() {
        return mois1 + mois2 + mois3 + mois4 + mois5 + mois6;
    }
}
