package rest.service.dto;

/**
 * Ligne de l'edition PDF du mouchard des ventes modifiees : une ligne par produit modifie, l'en-tete de la modification
 * etant repete (le modele regroupe sur {@code id}). Une modification sans detail produit donne une seule ligne dont les
 * champs produit sont vides.
 */
public class VenteModifieePdfLigne {

    private String id;
    private String action;
    private String venteRef;
    private String venteDate;
    private String date;
    private String heure;
    private String operateur;
    private Long montantAvant;
    private Long montantApres;
    private String description;
    private String changement;
    private String cip;
    private String produit;
    private Long qteAvant;
    private Long qteApres;
    private Long puAvant;
    private Long puApres;
    private Long ligneAvant;
    private Long ligneApres;
    /** PRODUIT ou INFO (ligne du recapitulatif element / avant / apres) */
    private String typeLigne;
    private String valeurAvant;
    private String valeurApres;

    public static VenteModifieePdfLigne entete(VenteModifieeDTO m) {
        VenteModifieePdfLigne l = new VenteModifieePdfLigne();
        l.id = m.getId();
        l.action = m.getTypeLibelle();
        l.venteRef = m.getVenteRef();
        l.venteDate = m.getVenteDate();
        l.date = m.getDate();
        l.heure = m.getHeure();
        l.operateur = m.getUserName();
        l.montantAvant = m.getMontantAvant() == null ? 0L : m.getMontantAvant().longValue();
        l.montantApres = m.getMontantApres() == null ? 0L : m.getMontantApres().longValue();
        // La fleche « → » n'existe pas dans la police de l'edition : elle serait perdue a l'impression
        l.description = m.getDescription() == null ? null : m.getDescription().replace("→", "->");
        return l;
    }

    public static VenteModifieePdfLigne avecProduit(VenteModifieeDTO m, VenteModifieeDTO.Ligne p, String changement) {
        VenteModifieePdfLigne l = entete(m);
        if ("INFO".equals(p.getAction())) {
            l.typeLigne = "INFO";
            l.changement = p.getProduitLibelle();
            l.valeurAvant = p.getValeurAvant() == null ? "" : p.getValeurAvant().replace("→", "->");
            l.valeurApres = p.getValeurApres() == null ? "" : p.getValeurApres().replace("→", "->");
            return l;
        }
        l.typeLigne = "PRODUIT";
        l.changement = changement;
        l.cip = p.getProduitCip();
        l.produit = p.getProduitLibelle();
        l.qteAvant = valeur(p.getQteAvant());
        l.qteApres = valeur(p.getQteApres());
        l.puAvant = valeur(p.getPuAvant());
        l.puApres = valeur(p.getPuApres());
        l.ligneAvant = valeur(p.getMontantAvant());
        l.ligneApres = valeur(p.getMontantApres());
        return l;
    }

    private static Long valeur(Integer i) {
        return i == null ? 0L : i.longValue();
    }

    public String getId() {
        return id;
    }

    public String getAction() {
        return action;
    }

    public String getVenteRef() {
        return venteRef;
    }

    public String getDate() {
        return date;
    }

    public String getHeure() {
        return heure;
    }

    public String getOperateur() {
        return operateur;
    }

    public Long getMontantAvant() {
        return montantAvant;
    }

    public Long getMontantApres() {
        return montantApres;
    }

    public String getDescription() {
        return description;
    }

    public String getChangement() {
        return changement;
    }

    public String getCip() {
        return cip;
    }

    public String getProduit() {
        return produit;
    }

    public Long getQteAvant() {
        return qteAvant;
    }

    public Long getQteApres() {
        return qteApres;
    }

    public Long getPuAvant() {
        return puAvant;
    }

    public Long getPuApres() {
        return puApres;
    }

    public Long getLigneAvant() {
        return ligneAvant;
    }

    public Long getLigneApres() {
        return ligneApres;
    }

    public String getVenteDate() {
        return venteDate;
    }

    public String getTypeLigne() {
        return typeLigne;
    }

    public String getValeurAvant() {
        return valeurAvant;
    }

    public String getValeurApres() {
        return valeurApres;
    }
}
