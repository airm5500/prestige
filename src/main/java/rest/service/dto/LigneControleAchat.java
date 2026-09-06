package rest.service.dto;

import java.math.BigDecimal;
import rest.service.filtre.FiltresControleAchat;

/**
 * Une ligne de l'etat de controle des achats, telle qu'elle est imprimee (point 17).
 *
 * <p>
 * Le DTO de l'ecran porte les lignes de detail du bon et des libelles techniques ; l'edition n'a besoin que de valeurs
 * deja mises en forme, et de deux informations calculees - le libelle du statut et la presence d'un ecart - que Jasper
 * ne saurait pas deduire.
 */
public final class LigneControleAchat {

    private String grossiste;
    private String reference;
    private String commande;
    private String dateLivraison;
    private String operateur;
    private String statut;
    private String ecart;
    private BigDecimal montantHt;
    private BigDecimal montantTva;
    private BigDecimal montantTtc;
    private BigDecimal montantAvoir;

    /** Ligne d'edition batie depuis le bon affiche a l'ecran. */
    public static LigneControleAchat de(EtatControlBon bon) {
        LigneControleAchat ligne = new LigneControleAchat();
        ligne.grossiste = bon.getFournisseurLibelle();
        ligne.reference = bon.getStrREFLIVRAISON();
        ligne.commande = bon.getOrderRef();
        ligne.dateLivraison = bon.getDtDATELIVRAISON();
        ligne.operateur = bon.getUserName();
        ligne.statut = libelleStatut(bon.getChecked());
        ligne.ecart = FiltresControleAchat.presenteUnEcart(bon) ? "Avec écart" : "Sans écart";
        ligne.montantHt = BigDecimal.valueOf(bon.getIntMHT());
        ligne.montantTva = BigDecimal.valueOf(bon.getIntTVA());
        ligne.montantTtc = BigDecimal.valueOf(bon.getIntHTTC());
        ligne.montantAvoir = BigDecimal.valueOf(bon.getMontantAvoir());
        return ligne;
    }

    /** Meme vocabulaire qu'a l'ecran : l'etat imprime doit se relire a cote de la grille. */
    private static String libelleStatut(String checked) {
        if ("TERMINE".equals(checked)) {
            return "Terminé";
        }
        return "EN_COURS".equals(checked) ? "En cours" : "À faire";
    }

    public String getGrossiste() {
        return grossiste;
    }

    public String getReference() {
        return reference;
    }

    public String getCommande() {
        return commande;
    }

    public String getDateLivraison() {
        return dateLivraison;
    }

    public String getOperateur() {
        return operateur;
    }

    public String getStatut() {
        return statut;
    }

    public String getEcart() {
        return ecart;
    }

    public BigDecimal getMontantHt() {
        return montantHt;
    }

    public BigDecimal getMontantTva() {
        return montantTva;
    }

    public BigDecimal getMontantTtc() {
        return montantTtc;
    }

    public BigDecimal getMontantAvoir() {
        return montantAvoir;
    }
}
