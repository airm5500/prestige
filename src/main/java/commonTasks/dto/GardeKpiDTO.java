package commonTasks.dto;

import java.io.Serializable;

/**
 * Les indicateurs REELS d'une garde (retour du 08/09, H2) : ce sur quoi deux gardes se comparent.
 *
 * <p>
 * Nombre de ventes, de clients, chiffre d'affaires, marge et taux, ventes ratees, clients a credit et montant du
 * credit, chiffre par mode de reglement. Le chiffre par heure reste porte pour information : c'est lui qui ramene des
 * gardes de durees differentes a une base comparable.
 * </p>
 */
public class GardeKpiDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private int ventes;
    private int clients;
    private long montant;
    private long marge;
    private long dureeMinutes;
    private int rates;
    private int clientsCredit;
    private long montantCredit;
    private long caEspeces;
    private long caMobile;
    private long caCheque;
    private long caCarte;
    private long caDiffere;
    private long caAutres;

    public int getVentes() {
        return ventes;
    }

    public void setVentes(int ventes) {
        this.ventes = ventes;
    }

    public int getClients() {
        return clients;
    }

    public void setClients(int clients) {
        this.clients = clients;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }

    public long getMarge() {
        return marge;
    }

    public void setMarge(long marge) {
        this.marge = marge;
    }

    public double getTauxMarge() {
        return montant > 0 ? marge * 100D / montant : 0D;
    }

    public long getDureeMinutes() {
        return dureeMinutes;
    }

    public void setDureeMinutes(long dureeMinutes) {
        this.dureeMinutes = dureeMinutes;
    }

    public long getMontantParHeure() {
        return dureeMinutes > 0 ? Math.round(montant * 60D / dureeMinutes) : 0L;
    }

    public int getRates() {
        return rates;
    }

    public void setRates(int rates) {
        this.rates = rates;
    }

    public int getClientsCredit() {
        return clientsCredit;
    }

    public void setClientsCredit(int clientsCredit) {
        this.clientsCredit = clientsCredit;
    }

    public long getMontantCredit() {
        return montantCredit;
    }

    public void setMontantCredit(long montantCredit) {
        this.montantCredit = montantCredit;
    }

    public long getCaEspeces() {
        return caEspeces;
    }

    public void setCaEspeces(long caEspeces) {
        this.caEspeces = caEspeces;
    }

    public long getCaMobile() {
        return caMobile;
    }

    public void setCaMobile(long caMobile) {
        this.caMobile = caMobile;
    }

    public long getCaCheque() {
        return caCheque;
    }

    public void setCaCheque(long caCheque) {
        this.caCheque = caCheque;
    }

    public long getCaCarte() {
        return caCarte;
    }

    public void setCaCarte(long caCarte) {
        this.caCarte = caCarte;
    }

    public long getCaDiffere() {
        return caDiffere;
    }

    public void setCaDiffere(long caDiffere) {
        this.caDiffere = caDiffere;
    }

    public long getCaAutres() {
        return caAutres;
    }

    public void setCaAutres(long caAutres) {
        this.caAutres = caAutres;
    }
}
