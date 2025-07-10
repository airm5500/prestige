/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package util;

import commonTasks.dto.PharmaMLItemDTO;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.LongAdder;
import org.apache.commons.lang3.StringUtils;

/**
 *
 * @author kkoffi
 */
public final class PharmaMlUtils {

    public static final int DEF_COUNT = 6;
    public static final String PATTERN_DATE_LIVRAISON_SOUHAITE = "yyyy-MM-dd";
    /*
     * Ligne repartiteur suivi du l'identifiant
     */
    public static final String R = "R";
    /*
     * la lettre P indique le type de travail
     */
    public static final String P = "P";
    /*
     * Type de commande
     */
    public static final String TYPE_TRAVAIL_COMMANDE = "C";
    /*
     * Date de livraison souhaitee
     */
    public static final String L = "L";
    /*
     * Ligne de produits
     */
    public static final String E = "E";
    /*
     * Commentaire
     */
    public static final String W = "W";
    /*
     * Fin de la commande
     */
    public static final String Z = "Z";
    /*
     * Commande normale
     */
    public static final int COMMANDE_NORMALE = 0;

    /*
     * Commande package
     */
    public static final int COMMANDE_PACKAGE = 1;

    /*
     * Commande speciale
     */
    public static final int COMMANDE_SPECIALE = 2;

    public static final String OUI = "O";
    public static final String NON = "N";
    public static final String SEPARATEUR_COMMANDE_SP_PAC = "C";
    /*
     * Type de codification CIP
     */
    public static final String TYPE_CODIFICATION_CIP = "C1";
    public static final String TYPE_CODIFICATION_EAN13 = "C2";
    public static final String TYPE_CODIFICATION_LIBELLE_PRODUIT = "C3";
    public static int NOMBRE_LIGNE_CODE = 0;
    public static int NOMBRE_LIGNE_CLAIRE = 0;
    public static final String TYPE_TRAVAIL_INFOS_PRODUITS = "Q";
    public static final String RECEPTION_PRODUIT = "K";
    /**
     * les codes retour commande
     */
    public static final int PRODUIT_INCONNU = 1;
    public static final int PRODUIT_PAS_EN_STOCK = 2;
    public static final int PRODUIT_NE_SE_FAIT_PLUS = 3;
    public static final int PRODUIT_MANQUE_FABRIQUANT = 4;
    public static final int PRODUIT_MANQUE_RAYON = 5;
    public static final int PRODUIT_RETIRE = 6;
    public static final int PRODUIT_NON_AUTORISE = 7;
    public static final String NATURE_ACTION_RE = "RE";
    public static final String VERSION_PROTOCLE_LIBELLE = "Version_Protocole";
    public static final String VERSION_PROTOCLE_VALUE = "1.0.0.0";
    public static final String ID_LOGICIEL_LIBELLE = "Id_Logiciel";
    public static final String ID_LOGICIEL_VALUE = "Prestige";
    public static final String VERSION_LOGICIEL_LIBELLE = "Id_Logiciel";
    public static final String VERSION_LOGICIEL_VALUE = "2.0.0";

    public static final String NATURE_PARTENAIRE_VALUE_OF = "OF";
    public static final String NATURE_PARTENAIRE_VALUE_RE = "RE";
    public static final String TYPE_CODIFICATION_CIP39 = "CIP39";
    public static final String CODE_VALUE = "00";
    public static final String ID_LIBELLE = "Id";
    public static final String NATURE_ACTION_REQ_EMISSION = "REQ_EMISSION";
    public static final String TYPE_CODIFICATION_EAN = "EAN13";
    public static final String USAGE_VALUE = "P";

    public static String buildRepartiteurLine(String idRepartiteur) {
        return R + idRepartiteur;
    }

    public static String buildComment(String commentaire) {
        if (StringUtils.isEmpty(commentaire)) {
            return W + StringUtils.rightPad("COMMENTAIRE GENERAL", 100, StringUtils.SPACE);
        }
        return W + StringUtils.rightPad(commentaire, 256, StringUtils.SPACE);
    }

    public static String finCommande() {
        return Z + StringUtils.leftPad(NOMBRE_LIGNE_CODE + "", 4, '0')
                + StringUtils.leftPad(NOMBRE_LIGNE_CLAIRE + "", 4, '0');

    }

    public static String buildCommandeLine(final int typeCommande, final String codeCommande, String commandeId) {

        return TYPE_TRAVAIL_COMMANDE + StringUtils.leftPad(typeCommande + "", 3, "0") + R + commandeId;
    }

    public static List<String> buildBody(List<PharmaMLItemDTO> itemDTO) {
        LongAdder adder = new LongAdder();
        adder.increment();
        List<String> strings = new ArrayList<>();
        itemDTO.forEach(d -> {
            strings.add(buildBodyElement(d, adder.intValue()));
            adder.increment();

        });
        return strings;

    }

    public static List<String> buildBodyInfosProduit(List<PharmaMLItemDTO> itemDTO) {
        LongAdder adder = new LongAdder();
        adder.increment();
        List<String> strings = new ArrayList<>();
        if (itemDTO.size() <= 50) {
            itemDTO.forEach(d -> {
                strings.add(buildBodyElementInfoProduit(d, adder.intValue()));
                adder.increment();
            });
        } else {
            itemDTO.subList(0, 50).forEach(d -> {
                strings.add(buildBodyElementInfoProduit(d, adder.intValue()));
                adder.increment();

            });
        }
        return strings;

    }

    public static String buildBodyElement(PharmaMLItemDTO e, int index) {
        String ligne = E + StringUtils.leftPad(e.getQuantite() + "", 4, '0');
        String code;
        switch (e.getTypeCodification()) {
        case TYPE_CODIFICATION_EAN13:
            code = TYPE_CODIFICATION_EAN13 + e.getEan();
            NOMBRE_LIGNE_CODE++;
            break;
        case TYPE_CODIFICATION_LIBELLE_PRODUIT:
            code = TYPE_CODIFICATION_LIBELLE_PRODUIT + e.getLibelle();
            NOMBRE_LIGNE_CLAIRE++;
            break;
        default:
            code = TYPE_CODIFICATION_CIP + e.getCip();
            NOMBRE_LIGNE_CODE++;
            break;
        }
        return ligne + StringUtils.rightPad(code, 52, StringUtils.SPACE) + returnOorN(e.isLivraisonPartielle())
                + returnOorN(e.isReliquats()) + returnOorN(e.isLivraisonEquivalente())
                + StringUtils.leftPad(index + "", 4, '0');
    }

    public static String buildTypeTravailLine(String typeTravail) {
        if (StringUtils.isEmpty(typeTravail)) {
            return P + TYPE_TRAVAIL_COMMANDE;
        }
        return P + typeTravail;
    }

    public static String buildDateLivraisonLine(LocalDate dateLivraisonSouhaitee) {
        return L + dateLivraisonSouhaitee.format(DateTimeFormatter.ofPattern(PATTERN_DATE_LIVRAISON_SOUHAITE));

    }

    public static String returnOorN(boolean r) {
        return r ? "O" : "N";
    }

    public static String buildReferenceDemandeInfosProduit(String codeRequete) {
        return TYPE_TRAVAIL_INFOS_PRODUITS + codeRequete;
    }

    public static String buildBodyElementInfoProduit(PharmaMLItemDTO e, int index) {
        String ligne = E + StringUtils.leftPad(e.getQuantite() + "", 4, '0');
        String code;
        switch (e.getTypeCodification()) {
        case TYPE_CODIFICATION_EAN13:
            code = TYPE_CODIFICATION_EAN13 + e.getEan();
            NOMBRE_LIGNE_CODE++;
            break;
        case TYPE_CODIFICATION_LIBELLE_PRODUIT:
            code = TYPE_CODIFICATION_LIBELLE_PRODUIT + e.getLibelle();
            NOMBRE_LIGNE_CLAIRE++;
            break;
        default:
            code = TYPE_CODIFICATION_CIP + e.getCip();
            NOMBRE_LIGNE_CODE++;
            break;
        }
        return ligne + StringUtils.rightPad(code, 52, StringUtils.SPACE) + StringUtils.leftPad(index + "", 4, '0');
    }

}
