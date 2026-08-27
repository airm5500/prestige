package commonTasks.dto;

import java.io.Serializable;

/**
 * Filtres de la recherche du menu Ventes ratees. Chaque champ vide ou nul signifie « pas de filtre ». Les trois champs
 * a trois etats acceptent une chaine vide (tous), la valeur "oui"/"connu"/"rattache" ou "non"/"inconnu"/"arattacher".
 */
public class VenteRateeFiltres implements Serializable {

    private static final long serialVersionUID = 1L;

    /** Debut de periode, format yyyy-MM-dd. */
    private String dtStart;
    /** Fin de periode, format yyyy-MM-dd. */
    private String dtEnd;
    private String userId;
    /** Texte cherche (mode contient) dans le CIP ou la designation. */
    private String produit;
    /** Texte cherche (mode contient) dans le nom du client ou le telephone. */
    private String client;
    private String motifId;
    /** "" = tous, "connu" = produit de la base, "inconnu" = saisie libre. */
    private String connu = "";
    /** "" = tous, "oui" = commandees, "non" = non commandees. */
    private String commande = "";
    /** "" = tous, "rattache" = saisies libres rattachees, "arattacher" = saisies libres restant a rattacher. */
    private String rattache = "";

    public String getDtStart() {
        return dtStart;
    }

    public VenteRateeFiltres setDtStart(String dtStart) {
        this.dtStart = dtStart;
        return this;
    }

    public String getDtEnd() {
        return dtEnd;
    }

    public VenteRateeFiltres setDtEnd(String dtEnd) {
        this.dtEnd = dtEnd;
        return this;
    }

    public String getUserId() {
        return userId;
    }

    public VenteRateeFiltres setUserId(String userId) {
        this.userId = userId;
        return this;
    }

    public String getProduit() {
        return produit;
    }

    public VenteRateeFiltres setProduit(String produit) {
        this.produit = produit;
        return this;
    }

    public String getClient() {
        return client;
    }

    public VenteRateeFiltres setClient(String client) {
        this.client = client;
        return this;
    }

    public String getMotifId() {
        return motifId;
    }

    public VenteRateeFiltres setMotifId(String motifId) {
        this.motifId = motifId;
        return this;
    }

    public String getConnu() {
        return connu;
    }

    public VenteRateeFiltres setConnu(String connu) {
        this.connu = connu;
        return this;
    }

    public String getCommande() {
        return commande;
    }

    public VenteRateeFiltres setCommande(String commande) {
        this.commande = commande;
        return this;
    }

    public String getRattache() {
        return rattache;
    }

    public VenteRateeFiltres setRattache(String rattache) {
        this.rattache = rattache;
        return this;
    }
}
