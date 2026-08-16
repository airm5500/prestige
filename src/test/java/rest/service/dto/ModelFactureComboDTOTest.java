package rest.service.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Calendar;
import java.util.GregorianCalendar;

import dal.TModelFacture;
import org.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Liste deroulante « modele de facture » de la fiche tiers payant, passee de la JSP au service REST.
 *
 * L'ecran lit des noms de colonnes precis, herites du modele ExtJS : si l'un d'eux change, la liste s'affiche vide sans
 * la moindre erreur visible. Ces controles figent donc la forme de la reponse.
 */
class ModelFactureComboDTOTest {

    private static TModelFacture modele(String id, String valeur, String description, String statut) {
        TModelFacture m = new TModelFacture();
        m.setLgMODELFACTUREID(id);
        m.setStrVALUE(valeur);
        m.setStrDESCRIPTION(description);
        m.setStrSTATUT(statut);
        m.setDtCREATED(new GregorianCalendar(2026, Calendar.JULY, 9).getTime());
        return m;
    }

    @Test
    @DisplayName("Les noms de colonnes sont ceux que l'ecran attend depuis la JSP")
    void memesNomsQueLaJsp() throws Exception {
        JSONObject json = new ModelFactureComboDTO(modele("12", "0303", "Facture detaillee", "is_Enable")).toJson();

        assertEquals("12", json.getString("lg_MODEL_FACTURE_ID"));
        assertEquals("0303", json.getString("str_VALUE"));
        assertEquals("Facture detaillee", json.getString("str_DESCRIPTION"));
        assertEquals("is_Enable", json.getString("str_STATUT"));
        assertEquals("09/07/2026", json.getString("dt_CREATED"), "la date garde le format jour/mois/annee");
    }

    @Test
    @DisplayName("Une valeur absente devient une chaine vide, jamais null")
    void jamaisDeNull() throws Exception {
        TModelFacture sansRien = modele("7", null, null, null);
        sansRien.setDtCREATED(null); // l'assistant pose une date par defaut : ici on veut vraiment l'absence
        JSONObject json = new ModelFactureComboDTO(sansRien).toJson();

        assertEquals("", json.getString("str_VALUE"));
        assertEquals("", json.getString("str_DESCRIPTION"));
        assertEquals("", json.getString("str_STATUT"));
        assertEquals("", json.getString("dt_CREATED"), "sans date de creation, la colonne reste vide");
    }

    @Test
    @DisplayName("Aucune propriete inattendue : l'ecran n'en lit que cinq")
    void exactementCinqColonnes() throws Exception {
        JSONObject json = new ModelFactureComboDTO(modele("1", "a", "b", "c")).toJson();

        assertEquals(5, json.length(), "cinq colonnes, comme le modele ExtJS testextjs.model.ModelFacture");
        for (String attendu : new String[] { "lg_MODEL_FACTURE_ID", "str_VALUE", "str_DESCRIPTION", "str_STATUT",
                "dt_CREATED" }) {
            assertTrue(json.has(attendu), "colonne manquante : " + attendu);
        }
    }
}
