package util;

import dal.TPrivilege;
import java.util.List;

/**
 * @author koben
 */
public final class Constant {

    public static final String UPDATE_PRICE = "UPDATE_PRICE";
    public static final String P_BT_ANNULER_VENTE = "P_BT_ANNULER_VENTE";
    public static final String DECONDTIONNEMENT_POSITIF = "05";
    public static final String DECONDTIONNEMENT_NEGATIF = "06";
    public static final String AJUSTEMENT_NEGATIF = "07";
    public static final String AJUSTEMENT_POSITIF = "08";
    public static final String TMVTP_ANNUL_VENTE_DEPOT_EXTENSION = "14";
    public static final String INVENTAIRE = "04";
    public static final String STATUT_ENTREE_STOCK = "ENTREE_STOCK";
    public static final String DEPOT_EXTENSION = "5";
    public static final String DECONNECTED_MESSAGE = "Veuillez vous connecter";
    public static final String STATUT_AUTO = "auto";
    public static final String STATUT_ENABLE = "enable";
    public static final String STATUT_IS_PROGRESS = "is_Process";
    public static final String STATUT_IS_CLOSED = "is_Closed";
    public static final String AIRTIME_USER = "AIRTIME_USER";
    public static final String STATUT_PENDING = "pending";
    public static final String STATUT_PASSED = "passed";
    public static final String STATUT_PHARMA = "pharma";
    public static final String ROLE_SUPERADMIN = "Super Administrateur";
    public static final String PARAMETER_ADMIN = "ADMIN";
    public static final String ROLE_PHARMACIEN = "Pharmacien";
    public static final String ROLE_ADMIN = "Administrateur";
    public static final String STATUT_WAITING = "is_Waiting";
    public static final String VENTE_COMPTANT = "VNO";
    public static final String VENTE_ASSURANCE = "VO";
    public static final String USER_LIST_PRIVILEGE = "USER_LIST_PRIVILEGE";
    public static final String SHOW_VENTE = "str_SHOW_VENTE";
    public static final String P_SHOW_ALL_ACTIVITY = "P_SHOW_ALL_ACTIVITY";
    public static final String STATUT_DELETE = "delete";
    public static final String STATUT_CANCEL = "cancel";
    public static final String DEFAUL_TYPEETIQUETTE = "2";
    public static final String STATUT_IS_USING = "is_Using";
    public static final String ACTION_DESACTIVE_PRODUIT = "ACTION_DESACTIVE_PRODUIT";
    public static final String KEY_ACTIVATE_CLOTURE_CAISSE_AUTO = "KEY_ACTIVATE_CLOTURE_CAISSE_AUTO";
    public static final String STATUT_IS_WAITING_VALIDATION = "is_Waiting_validation";
    public static final String STATUT_IS_ASSIGN = "is_assign";
    public static final String MODE_ESP = "1";
    public static final String ACTION_OTHER = "OTHER";
    public static final String MVT_SORTIE_CAISSE = "4";
    public static final String MVT_FOND_CAISSE = "1";
    public static final String MVT_VENTE_VO = "8";
    public static final String MVT_VENTE_VNO = "9";
    public static final String ACTION_VENTE = "VENTE";
    public static final String DIFFERE = "Differe";
    public static final String VENTE = "02";
    public static final String KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE = "9";
    public static final String KEY_PARAM_MVT_VENTE_ORDONNANCE = "8";
    public static final String MODE_ORANGE = "10";
    public static final String ANNULATION_DE_VENTE = "03";
    public static final String REGL_DIFF = "4";
    public static final String VENTE_AVEC_CARNET = "3";
    public static final String VENTE_COMPTANT_ID = "1";
    public static final String VENTE_ASSURANCE_ID = "2";
    public static final String ENTREE_EN_STOCK = "01";
    public static final String VENTE_DEPOT_AGREE = "4";
    public static final String VENTE_DEPOT_EXTENSION = "5";
    public static final String TMVTP_VENTE_DEPOT_EXTENSION = "12";
    public static final String RETOUR_FOURNISSEUR = "09";
    public static final String TMVTP_RETOUR_DEPOT = "13";
    public static final String NOT = "NOT";
    public static final String WITH = "WITH";
    public static final String TOUT = "TOUT";
    public static final String ALL = "ALL";
    public static final String P_BT_MODIFICATION_DE_VENTE = "P_BT_MODIFICATION_DE_VENTE";
    public static final String P_BTN_UPDATE_VENTE_CLIENT_TP = "P_BTN_UPDATE_VENTE_CLIENT_TP";
    public static final String P_BTN_UPDATE_VENTE_CLIENT_DATE = "P_BTN_UPDATE_VENTE_CLIENT_DATE";
    public static final String STATUT_IS_DEVIS = "devis";
    public static final String PARAMETER_SYSTEM = "SYSTEME";
    public static final String P_BT_UPDATE_PRICE_EDIT = "P_BT_UPDATE_PRICE_EDIT";
    public static final String PARAMETER_INDICE_SECURITY = "KEY_INDICE_SECURITY";
    public static final String PROCESS_SUCCESS = "1";
    public static final String MODE_CHEQUE = "2";
    public static final String MODE_VIREMENT = "6";
    public static final String MODE_CB = "3";
    public static final String MODE_DEVISE = "5";
    public static final String MODE_MOOV = "8";
    public static final String TYPE_REGLEMENT_ORANGE = "7";
    public static final String MODE_MTN = "9";
    public static final String MODE_WAVE = "10";
    public static final String MODE_DJAMO = "19";
    public static final String LESS = "LESS";
    public static final String MORE = "MORE";
    public static final String EQUAL = "EQUAL";
    public static final String LESSOREQUAL = "LESSOREQUAL";
    public static final String MOREOREQUAL = "MOREOREQUAL";
    public static final String ACTION_RETOURFOURNISSEUR = "RETOURFOURNISSEUR";
    public static final String ACTION_ENTREE_RETOUR_DEPOT = "ENTREESTOCK";
    public static final String KEY_PARAMS = "KEY_PARAMS";
    public static final String KEY_TAKE_INTO_ACCOUNT = "KEY_TAKE_INTO_ACCOUNT";
    public static final String KEY_NOMBRE_TICKETS_VNO = "KEY_NOMBRE_TICKETS_VNO";
    public static final String SMS_TOKEN_TYPE = "Bearer";
    public static final String GRANT_TYPE = "client_credentials";
    public static final String KEY_SMS_CLOTURE_CAISSE = "KEY_SMS_CLOTURE_CAISSE";
    public static final String KEY_SMS_MODIF_PRIX_VENTE = "KEY_SMS_MODIF_PRIX_VENTE";
    public static final String KEY_MAIL_CLOTURE_CAISSE = "KEY_MAIL_CLOTURE_CAISSE";
    public static final String KEY_HEURE_EMAIL = "KEY_HEURE_EMAIL";
    public static final String KEY_ACTIVATE_PEREMPTION_DATE = "KEY_ACTIVATE_PEREMPTION_DATE";
    public static final String OFFICINE = "1";
    public static final String STANDART_CLIENT_ID = "6";
    public static final int TIERS_PAYANT_PRINCIPAL = 1;
    public static final String CLIENT_ASSURANCE = "1";
    public static final String CLIENT_CARNET = "2";
    public static final String P_BT_ANNULER_CLOTURE_CAISSE = "P_BT_ANNULER_CLOTURE_CAISSE";
    public static final String KEY_PRENDRE_EN_COMPTE_FOND_CAISSE = "KEY_PRENDRE_EN_COMPTE_FOND_CAISSE";
    public static final String KEY_NOMBRE_TICKET_OTHER_ESPECE = "KEY_NOMBRE_TICKET_OTHER_ESPECE";
    public static final String TYPE_REGLEMENT_ESPECE = "1";
    public static final String TICKET_Z = "TICKET_Z";
    public static final String TICKET_VENTE = "VENTE";
    public static final String CHARGED = "charged";
    public static final String TYPE_VENTE_VNO = "1";
    public static final String KEY_CHECK_UG = "KEY_CHECK_UG";
    public static final String TICKET_ZZ = "TICKET_ZZ";
    public static final String KEY_SHOW_NUMERO_TICKET = "KEY_SHOW_NUMERO_TICKET";
    public static final String ACTION_COMMANDE = "COMMANDE";
    public static final String KEY_PARAM_MVT_REGLEMENT_DIFFERES = "2";
    public static final String PERIME = "11";
    public static final String KEY_VENTE_NON_ORDONNANCEE = "VNO";
    public static final String NON_DIFFERE = "Non_Differe";
    public static final String MVT_ENTREE_CAISSE = "5";

    public static final String MVT_REGLE_TP = "3";
    public static final String MVT_REGLE_DIFF = "2";
    public static final String MVT_REGLE_VO = "8";
    public static final String MVT_REGLE_VNO = "9";

    public static final String EMPLACEMENT = "1";

    public static final String FINDALLDEPOT = "2";

    public static final String REPORTDEPOT = "D:\\CONF\\LABOREX\\REPORTS\\";

    public static final String REPORT_PATH = "D:/CONF/LABOREX/REPORTS/";

    /*
     * parametre nombre de mois à considerer
     */
    public static final String Q3 = "Q3";
    /*
     * QTE DE REAPPRO (EN NOMBRE DE SEMAINES) A DEFINIR
     */
    public static final String Q2 = "Q2";
    /*
     * SEUIL DE REAPPRO (EN NOMBRE DE SEMAINES) A DEFNIR
     */
    public static final String Q1 = "Q1";
    public static final String ADD = "ADD";
    public static final String REMOVE = "REMOVE";
    public static final String ACTION_DECONDITIONNEMENT = "DECONDITIONNEMENT";
    public static final String KEY_NATURE_VENTE_DEPOT = "3";
    public static final String TICKET_REGLEMENT = "TICKET_REGLEMENT";
    public static final String TICKET_REGLEMENT_CARNET_DEPOT = "TICKET_REGLEMENT_CARNET_DEPOT";
    public static final String P_AFFICHER_STOCK_A_LA_VENTE = "P_AFFICHER_STOCK_A_LA_VENTE";
    public static final String KEY_HEURE_ENVOI_SMS_RECAP_ACTIVITE = "KEY_HEURE_ENVOI_SMS_RECAP_ACTIVITE";
    public static final String STATUT_PAID = "paid";
    public static final String AUTRES = "AUTRES";
    public static final String LABOREXCI = "LABOREX-CI";
    public static final String COPHARMED = "COPHARMED";
    public static final String TEDIS = "TEDIS PHAR.";
    public static final String DPCI = "DPCI";
    public static final String USER_ROLE_ID = "USER_ROLE_ID";
    public static final String SEUIL = "SEUIL";
    public static final String DIFF = "DIFF";
    public static final String KEY_MAX_PRICE_POURCENT_VENTE = "KEY_MAX_PRICE_POURCENT_VENTE";
    public static final String KEY_TAUX_CODE_TABLEAU = "KEY_TAUX_CODE_TABLEAU";
    public static final String DEFAUL_GROSSISTE = "001";
    public static final String DEFAUL_RAYON_ID = "1";
    public static final String DEFAUL_CODE_TVA = "1";
    public static final String STATUT_DISABLE = "disable";
    public static final String P_BTN_DESACTIVER_TIERS_PAYANT = "P_BTN_DESACTIVER_TIERS_PAYANT";
    public static final String CAUTION_ID = "10";
    public static final String KEY_OPTION_SUGGESTION = "KEY_OPTION_SUGGESTION";
    public static final String STATUT_PERIME = "perime";
    public static final String STATUT_ENCOURS_PEREMPTION = "en peremption";
    public static final String STATUT_UNPAID = "unpaid";
    public static final String KEY_MONTH_PERIME = "KEY_MONTH_PERIME";
    public static final String PARAM_TRUE = "1";
    public static final String PARAM_FALSE = "0";
    public static final String TYPE_TIERS_PAYANT_CARNET_ID = "2";

    private Constant() {
    }

    public static boolean hasAuthorityByName(List<TPrivilege> lstTPrivilege, String authorityName) {
        java.util.function.Predicate<TPrivilege> p = e -> e.getStrNAME().equalsIgnoreCase(authorityName);
        return lstTPrivilege.stream().anyMatch(p);
    }
}
