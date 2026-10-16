package util;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Retours du 13/10 (point 16) : rubrique d'un parametre (t_parameters), deduite de sa cle. La base ne range presque
 * aucun parametre (str_SECTION_KEY vide pour 203 sur 208) : la rubrique se calcule a la lecture, rien n'est ecrit. La
 * premiere regle qui convient l'emporte ; ordre = ordre d'affichage.
 */
public final class RubriqueParametre {

    /** Une rubrique : code, libelle, couleur, motifs de cles (debut ou contenu). */
    public static final class Rubrique {

        public final String code;
        public final String libelle;
        public final String couleur;
        final List<String> motifs;

        Rubrique(String code, String libelle, String couleur, String... motifs) {
            this.code = code;
            this.libelle = libelle;
            this.couleur = couleur;
            this.motifs = Arrays.asList(motifs);
        }
    }

    public static final List<Rubrique> RUBRIQUES = Arrays.asList(
            new Rubrique("VENTE", "Ventes et caisse", "#2e86c1", "KEY_ACTIVATE_VENTE", "KEY_ACTIVATION_PLAFOND",
                    "KEY_MAX_VALUE_VENTE", "KEY_MAX_PRICE", "KEY_APPLIQ_REMISE", "FORCER_STOCK_VENTE",
                    "KEY_ACTIVATE_CONTROLE_VENTE", "KEY_VENTE_", "KEY_INTERACTIONS_VENTE", "KEY_CHECK_PRICE",
                    "KEY_ACTIVATE_CLOTURE_CAISSE", "KEY_PRENDRE_EN_COMPTE_FOND", "KEY_TAKE_INTO_ACCOUNT",
                    "KEY_BARCODEUSER", "KEY_ACTIVATE_DISPLAYER", "AFFICHER_STOCK", "EXCLUSION_TIERS", "OLD_DATA_CARNET",
                    "KEY_LAST_ORDER_NUMBER", "KEY_SIZE_ORDER"),
            new Rubrique("TICKET", "Tickets et impressions", "#7f8c8d", "KEY_TICKET", "KEY_EDIT_TICKET",
                    "KEY_IMPRIMER_TICKET", "KEY_NOMBRE_TICKET", "KEY_SHOW_NUMERO_TICKET", "KEY_TAILLE_NOM_OFFICINE",
                    "KEY_IMPRESSION", "KEY_LIEU_EDITION", "KEY_ENTETES", "BREAKING_TICKET", "TICKET_Z",
                    "KEY_CODE_FACTURE", "KEY_CODE_NUMERARTION", "KEY_CODE_EMETTEUR"),
            new Rubrique("STOCK", "Stock, réserve et inventaire", "#b8860b", "KEY_GEST_MANAGE", "KEY_DAY_STOCK",
                    "KEY_MONTH_PERIME", "KEY_ACTIVATE_PEREMPTION", "KEY_MAX_VALUE_INVENTAIRE", "KEY_MOVEMENT",
                    "SUGGESTION_RESERVE", "KEY_ACTIVATE_DESTOCKAGE", "KEY_ACTIVATE_CONTROLE_RETOUR",
                    "KEY_OBJECTIF_TAUX_PEREMPTION", "KEY_VALORISATION", "KEY_PREFIXE_CIP"),
            new Rubrique("COMMANDE", "Commandes, PharmaML et achats", "#16a085", "KEY_PHARMAML", "KEY_DELAI_REAPPRO",
                    "KEY_DAY_SEUIL", "KEY_OPTION_SUGGESTION", "KEY_POINTAGE_BL", "KEY_CONTROLE_ACHAT",
                    "KEY_LAST_ORDER_COMMAND", "KEY_RISQUE_", "SEMOIS", "Q1", "Q2", "Q3", "KEY_DAY"),
            new Rubrique("PREVISION", "Prévisions et analyses", "#8e44ad", "KEY_PREVISION", "ABC_",
                    "KEY_OBJECTIF_TAUX_MAR", "KEY_TABLEAU_BORD"),
            new Rubrique("ETIQUETTE", "Étiquettes", "#d35400", "KEY_ETIQUETTE"),
            new Rubrique("CLIENT", "Clients, fidélité, avis et campagnes", "#c0392b", "KEY_AVIS", "KEY_CAMPAGNE",
                    "KEY_RAPPEL", "KEY_GERE_ORDONCIER", "KEY_MONOGRAPHIE"),
            new Rubrique("MESSAGE", "SMS, WhatsApp, e-mails et notifications", "#27ae60", "KEY_SMS", "SMS_",
                    "KEY_WHATSAPP", "KEY_MAIL", "KEY_HEURE_EMAIL", "KEY_HEURE_ENVOI_SMS", "KEY_NOTIFICATION",
                    "KEY_INTERVAL_SEND"),
            new Rubrique("RH", "Ressources humaines et mobile", "#2c3e50", "KEY_RH_", "KEY_MOBILE",
                    "KEY_CONNEXION_BADGE"),
            new Rubrique("TVA", "TVA et comptabilité", "#6c5ce7", "KEY_TVA", "TVA_", "KEY_TAUX_CODE_TABLEAU"),
            new Rubrique("SURVEILLANCE", "Journaux, surveillance et support", "#e74c3c", "SUPPORT_", "KEY_JOURNAL",
                    "KEY_TICKET_LENT", "ACCES_DEPANNAGE", "KEY_DUREE_SESSION", "KEY_INDICE_SECURITY"),
            new Rubrique("AFFICHAGE", "Affichage et fiche article", "#0097a7", "COULEUR_", "FICHE_ARTICLE",
                    "MODE_RECHERCHE"));

    public static final Rubrique AUTRES = new Rubrique("AUTRES", "Système et divers", "#95a5a6");

    private RubriqueParametre() {
    }

    public static Rubrique de(String cle) {
        String c = cle == null ? "" : cle.trim().toUpperCase(Locale.ROOT);
        for (Rubrique r : RUBRIQUES) {
            for (String m : r.motifs) {
                if (c.startsWith(m) || (m.endsWith("_") && c.contains("_" + m))) {
                    return r;
                }
            }
        }
        return AUTRES;
    }

    /** Toutes les rubriques, « Système et divers » en dernier. */
    public static List<Rubrique> toutes() {
        List<Rubrique> l = new java.util.ArrayList<>(RUBRIQUES);
        l.add(AUTRES);
        return l;
    }
}
