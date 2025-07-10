/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal.enumeration;

/**
 *
 * @author Kobena
 */
public enum TypeLog {
    DECONDITIONNEMENT("Deconditionnement de produit", true),
    MODIFICATION_PRIX_VENTE_PRODUIT("Modification prix de vente de produit", true),
    ANNULATION_DE_VENTE("Annulation de vente", true), SUPPRESION_DE_FACTURE("Suppression de facture", true),
    DESACTIVATION_DE_PRODUIT("Désactivation de produit", true), SUPPRESSION_DE_PRODUIT("Suppression de produit", true),
    ACTIVATION_DE_PRODUIT("Activation de produit", true), AJUSTEMENT_DE_PRODUIT("Ajustement de produit", true),
    VALIDATION_DE_CAISSE("Validation de caisse", true), ANNULATION_DE_CAISSE("Annulation de caisse", true),
    MVT_DE_CAISSE("Mouvement de caisse", true), ENTREE_EN_STOCK("Entrée en stock de BL", true),
    ATTRIBUTION_DE_FOND_DE_CAISSE("Attribution de fond de caisse", true),
    MODIFICATION_DATE_SYSTEME("Modification de la date système", true), IVENTAIRE("Inventaire du stock", true),
    GENERATION_DE_FACTURE("Génération de facture", true),
    MODIFICATION_INFO_PRODUIT_COMMANDE("Modification info produit à la commande", true),
    QUANTITE_UG("Entrée quantité UG", true), MODIFICATION_INFO_VENTE("Modification de vente", true),
    RETOUR_FOURNISSEUR("Retour fournisseur", true), SAISIS_PERIMES("Saisis de périmés", true),
    VALIDATION_DE_FOND_DE_CAISSE("Validation de fond de caisse ", true), AUTHENTIFICATION("Authentification", true),
    DECONNECTION("Deconnection", true), CLOTURE_CAISSE("Cloture de caisse", true),
    OUVERTURE_CAISSE_AUTO("Ouverture de de caisse automatique", false), OUVERTURE_CAISSE("Ouverture  de caisse", true),
    MODIFICATION_DATE_VENTE_CREDIT("Modification de date de vente a crédit", true),
    AVOIR_PRODUIT("Reception avoir", true),
    MODIFICATION_PA_PRODUIT_COMMANDE("Modification prix d'achat produit à la commande", false),
    MODIFICATION_PU_PRODUIT_COMMANDE("Modification prix de vente produit à la commande", false),
    MVT_DE_CAISSE_REGLEMENT_DIFFERE("Règlement différé", false),
    MVT_DE_CAISSE_REGLEMENT_DEPOT("Règlement dépôt", false), MODIFICATION_VENTE("Modification de vente", true),
    AJOUT_DE_NOUVEAU_PRODUIT("Ajout de nouveau produit", true),
    AJOUT_DE_DETAIL_PRODUIT("Creation de detail de  produit", true);

    private final String value;
    private final boolean checked;

    public String getValue() {
        return value;
    }

    public boolean isChecked() {
        return checked;
    }

    private TypeLog(String value, boolean checked) {
        this.value = value;
        this.checked = checked;
    }

}
