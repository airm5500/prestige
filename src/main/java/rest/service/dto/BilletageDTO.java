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

    /**
     * Somme des coupures. Gestion de caisse G1 : calcul exact ; un total qui ne tient pas dans un entier (faute de
     * frappe) leve ArithmeticException au lieu de donner un total faux, voire negatif.
     */
    public int getTotal() {
        long total = (long) autre + 500L * cinqCent + 2000L * deuxMille + 1000L * mille + 5000L * cinqMille
                + 10000L * dixMille;
        return Math.toIntExact(total);
    }

    @Override
    public String toString() {
        return "Billatage = cinqCent=" + cinqCent + ", deuxMille=" + deuxMille + ", mille=" + mille + ", cinqMille="
                + cinqMille + ", dixMille=" + dixMille + ", autre=" + autre + " total="
                + (500L * cinqCent + 2000L * deuxMille + 1000L * mille + 5000L * cinqMille + 10000L * dixMille + autre);
    }

}
