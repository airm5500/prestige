package rest.service.promotion;

import dal.TFamille;
import dal.TPromotion;
import dal.TPromotionHistory;
import dal.TPromotionProduct;
import java.text.SimpleDateFormat;
import java.util.Date;
import org.apache.commons.lang3.StringUtils;

/**
 * Plan du 06/11, point 3.5 (demande du 07/11) : journal des promotions (t_promotion_history). Chaque action est
 * enregistree avec la date, l'utilisateur, les valeurs d'avant et les nouvelles.
 */
public final class JournalPromotion {

    public static final String CREATION = "CREATION";
    public static final String MODIFICATION_PROMOTION = "MODIFICATION PROMOTION";
    public static final String CLOTURE = "CLOTURE";
    public static final String AJOUT = "AJOUT";
    public static final String MODIFICATION = "MODIFICATION";
    public static final String RETRAIT = "RETRAIT";
    public static final String RETRAIT_VENTE_ASSURANCE = "RETRAIT VENTE ASSURANCE";

    private JournalPromotion() {
    }

    /** Libelle d'une action pour l'ecran et les editions (vide : ligne d'avant le journal). */
    public static String libelle(String action) {
        if (action == null || action.isEmpty()) {
            return "Ajout ou modification";
        }
        switch (action) {
        case CREATION:
            return "Création de la promotion";
        case MODIFICATION_PROMOTION:
            return "Modification de la promotion";
        case CLOTURE:
            return "Clôture";
        case AJOUT:
            return "Ajout du produit";
        case MODIFICATION:
            return "Modification du produit";
        case RETRAIT:
            return "Retrait du produit";
        case RETRAIT_VENTE_ASSURANCE:
            return "Retirée d'une vente passée en assurance";
        default:
            return action;
        }
    }

    private static String jour(Date d) {
        return d == null ? "?" : new SimpleDateFormat("dd/MM/yyyy").format(d);
    }

    /** Periode et type d'une promotion : « REMISE du 01/11/2026 au 10/11/2026 ». */
    public static String periode(String type, Date debut, Date fin) {
        return StringUtils.defaultString(type) + " du " + jour(debut) + " au " + jour(fin);
    }

    /** Valeurs d'un produit en promotion : « Remise 10 % », « Prix 1 500 », « Par palier de 4 : 1 offerte(s) ». */
    public static String valeurs(String type, Integer remise, Double prix, String modeUg, Integer seuil,
            Integer offertes) {
        if (PromotionLigne.REMISE.equals(type)) {
            return "Remise " + (remise == null ? 0 : remise) + " %";
        }
        if (PromotionLigne.UNITES_GRATUITES.equals(type)) {
            return (PromotionLigne.palier(modeUg) ? "Par palier de " : "À partir de ") + (seuil == null ? 0 : seuil)
                    + " : " + (offertes == null ? 0 : offertes) + " offerte(s)";
        }
        return "Prix " + (prix == null ? 0 : Math.round(prix));
    }

    public static String valeurs(TPromotionProduct p) {
        return valeurs(p.getLgCODEPROMOTIONID() != null ? p.getLgCODEPROMOTIONID().getStrTYPE() : null,
                p.getIntDISCOUNT(), p.getDbPRICE(), p.getStrMODEUG(), p.getIntACTIVEAT(), p.getIntPACKNUMBER());
    }

    /**
     * Ligne du journal, a enregistrer par l'appelant. {@code famille} et {@code valeurs} sont null pour une action sur
     * la promotion elle-meme (creation, modification, cloture).
     */
    public static TPromotionHistory ligne(String action, TPromotion promotion, TFamille famille,
            TPromotionProduct valeurs, String avant, String refVente, String utilisateur) {
        TPromotionHistory h = new TPromotionHistory();
        h.setLgCODEPROMOTIONID(promotion.getLgCODEPROMOTIONID());
        h.setIntCIP(famille != null ? StringUtils.defaultString(famille.getIntCIP()) : "");
        h.setLgFAMILLEID(famille != null ? famille.getLgFAMILLEID() : "");
        h.setStrNAME(famille != null ? StringUtils.left(famille.getStrNAME(), 60) : null);
        h.setDtPROMOTEDDATE(new Date());
        h.setDtSTARTDATE(promotion.getDtSTARTDATE());
        h.setDtENDDATE(promotion.getDtENDDATE());
        h.setStrTYPE(promotion.getStrTYPE());
        if (valeurs != null) {
            h.setIntDISCOUNT(valeurs.getIntDISCOUNT());
            h.setBlMODE(valeurs.getBlMODE());
            h.setIntPACKNUMBER(valeurs.getIntPACKNUMBER());
            h.setIntACTIVEAT(valeurs.getIntACTIVEAT());
            h.setDbPRICE(valeurs.getDbPRICE());
            h.setStrMODEUG(valeurs.getStrMODEUG());
        }
        h.setStrACTION(action);
        h.setLgUSERID(utilisateur);
        h.setStrAVANT(StringUtils.left(avant, 500));
        h.setStrREFVENTE(refVente);
        return h;
    }
}
