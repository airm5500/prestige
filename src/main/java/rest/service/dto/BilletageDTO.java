package rest.service.dto;

/**
 *
 * @author koben
 */
public class BilletageDTO {

    private String resumeCaisseId;
    private int cinqCent;
    private int deuxMille;
    private int mille;
    private int cinqMille;
    private int dixMille;
    private int autre;

    public String getResumeCaisseId() {
        return resumeCaisseId;
    }

    public void setResumeCaisseId(String resumeCaisseId) {
        this.resumeCaisseId = resumeCaisseId;
    }

    public int getCinqCent() {
        return cinqCent;
    }

    public void setCinqCent(int cinqCent) {
        this.cinqCent = cinqCent;
    }

    public int getDeuxMille() {
        return deuxMille;
    }

    public void setDeuxMille(int deuxMille) {
        this.deuxMille = deuxMille;
    }

    public int getMille() {
        return mille;
    }

    public void setMille(int mille) {
        this.mille = mille;
    }

    public int getCinqMille() {
        return cinqMille;
    }

    public void setCinqMille(int cinqMille) {
        this.cinqMille = cinqMille;
    }

    public int getDixMille() {
        return dixMille;
    }

    public void setDixMille(int dixMille) {
        this.dixMille = dixMille;
    }

    public int getAutre() {
        return autre;
    }

    public void setAutre(int autre) {
        this.autre = autre;
    }

    public int getTotal() {
        return autre + (cinqCent * 500) + (deuxMille * 2000) + (mille * 1000) + (cinqMille * 5000) + (dixMille * 10000);
    }

    @Override
    public String toString() {
        return "Billatage = cinqCent=" + cinqCent + ", deuxMille=" + deuxMille + ", mille=" + mille + ", cinqMille="
                + cinqMille + ", dixMille=" + dixMille + ", autre=" + autre + " total=" + this.getTotal();
    }

}
