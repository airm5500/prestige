package util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/** Retours du 13/10 (point 16) : rubrique d'un parametre deduite de sa cle. */
class RubriqueParametreTest {

    private static String r(String cle) {
        return RubriqueParametre.de(cle).code;
    }

    @Test
    void rubriques() {
        assertEquals("VENTE", r("KEY_MAX_VALUE_VENTE"));
        assertEquals("TICKET", r("KEY_NOMBRE_TICKETS_VNO"));
        assertEquals("STOCK", r("KEY_ACTIVATE_PEREMPTION_DATE"));
        assertEquals("COMMANDE", r("KEY_PHARMAML_VIDAGE_AUTO"));
        assertEquals("PREVISION", r("KEY_PREVISION_DELAI_JOURS"));
        assertEquals("ETIQUETTE", r("KEY_ETIQUETTE_MODELE"));
        assertEquals("CLIENT", r("KEY_AVIS_ACTIF"));
        assertEquals("MESSAGE", r("KEY_SMS_CLOTURE_CAISSE"));
        assertEquals("RH", r("KEY_RH_TOLERANCE_RETARD"));
        assertEquals("TVA", r("KEY_TVA_VALUE"));
        assertEquals("SURVEILLANCE", r("SUPPORT_SLOW_MS"));
        assertEquals("AFFICHAGE", r("COULEUR_SURVOL_LIGNE"));
        assertEquals("PREVISION", r("KEY_OBJECTIF_TAUX_MARGE"));
        assertEquals("STOCK", r("KEY_OBJECTIF_TAUX_PEREMPTION"));
    }

    @Test
    void cleInconnueOuVide() {
        assertEquals("AUTRES", r("str_Branch_Code"));
        assertEquals("AUTRES", r(null));
    }
}
