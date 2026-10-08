package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class StatutEnvoiPharmaMlTest {

    @Test
    void codes() {
        assertEquals("REPONDUE",
                StatutEnvoiPharmaMl.code("TRAITEE", "{\"nbreproduit\":2,\"nbrerupture\":0,\"totalProduit\":2}"));
        assertEquals("PARTIELLE",
                StatutEnvoiPharmaMl.code("TRAITEE", "{\"nbreproduit\":1,\"nbrerupture\":1,\"totalProduit\":2}"));
        assertEquals("REPONDUE", StatutEnvoiPharmaMl.code("TRAITEE", "réponse immédiate"),
                "anciennes lignes sans resume");
        assertEquals("EN_ATTENTE", StatutEnvoiPharmaMl.code("EN_ATTENTE", null));
        assertEquals("REFUSEE", StatutEnvoiPharmaMl.code("REFUSEE", "statut 11 : contrôle absent"));
        assertEquals("NON_ENVOYEE", StatutEnvoiPharmaMl.code("NON_ENVOYEE", "injoignable"));
        assertEquals("", StatutEnvoiPharmaMl.code("ORPHELINE", null));
        assertEquals("", StatutEnvoiPharmaMl.code(null, null));
    }

    @Test
    void details() {
        assertEquals("1 produit(s) pris en compte, 1 en rupture sur 2",
                StatutEnvoiPharmaMl.detail("TRAITEE", "{\"nbreproduit\":1,\"nbrerupture\":1,\"totalProduit\":2}"));
        assertEquals("Réponse du grossiste traitée", StatutEnvoiPharmaMl.detail("TRAITEE", "réponse immédiate"));
        assertEquals("statut 11 : contrôle absent",
                StatutEnvoiPharmaMl.detail("REFUSEE", "statut 11 : contrôle absent"));
        assertEquals("sans ligne", StatutEnvoiPharmaMl.detail("ERREUR", "{\"msg\":\"sans ligne\"}"));
    }
}
