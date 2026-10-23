package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import util.sms.SmsProviderCatalog;
import util.sms.SmsProviderParamDef;

/** Retour du 23/10 : chaque parametre de fournisseur SMS a une indication, jamais un identifiant. */
class SmsProviderCatalogExempleTest {

    @Test
    void chaqueParametreAUneIndication() {
        for (String code : new String[] { SmsProviderCatalog.CODE_ORANGE, SmsProviderCatalog.CODE_LETEXTO }) {
            assertFalse(SmsProviderCatalog.paramDefs(code).isEmpty());
            for (SmsProviderParamDef d : SmsProviderCatalog.paramDefs(code)) {
                assertFalse(d.getExemple().trim().isEmpty(), code + " " + d.getCle());
                // une indication n'est jamais un jeton : pas de longue suite de lettres et chiffres
                assertFalse(d.getExemple().matches(".*[A-Za-z0-9]{16,}.*") && !d.getExemple().startsWith("http"),
                        code + " " + d.getCle());
            }
        }
    }

    @Test
    void urlsParDefautEnIndication() {
        SmsProviderParamDef token = SmsProviderCatalog.paramDefs(SmsProviderCatalog.CODE_ORANGE).stream()
                .filter(d -> SmsProviderCatalog.ORANGE_TOKEN_ENDPOINT.equals(d.getCle())).findFirst().get();
        assertEquals("https://api.orange.com/oauth/v2/token", token.getExemple());
        SmsProviderParamDef secret = SmsProviderCatalog.paramDefs(SmsProviderCatalog.CODE_ORANGE).stream()
                .filter(d -> SmsProviderCatalog.ORANGE_CLIENT_SECRET.equals(d.getCle())).findFirst().get();
        assertTrue(secret.getExemple().contains("portail"));
    }
}
