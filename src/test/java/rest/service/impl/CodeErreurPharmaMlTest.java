package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** Retours du 08/10 (8) : codes d'erreur PharmaML (tableau 8) lus dans la balise ERREUR. */
class CodeErreurPharmaMlTest {

    @Test
    void libellesEtConseils() {
        assertEquals("officine inconnue du grossiste", CodeErreurPharmaMl.libelle("0101"));
        assertEquals("version du protocole non supportée", CodeErreurPharmaMl.libelle("3"));
        assertEquals("code propre au grossiste", CodeErreurPharmaMl.libelle("1500"));
        assertEquals("erreur technique", CodeErreurPharmaMl.libelle("0050"));
        assertEquals("erreur fonctionnelle", CodeErreurPharmaMl.libelle("0150"));
        assertEquals("", CodeErreurPharmaMl.libelle("x"));
        assertTrue(CodeErreurPharmaMl.conseil("0101").contains("code client"));
        assertTrue(CodeErreurPharmaMl.conseil("0011").contains("clé"));
        assertTrue(CodeErreurPharmaMl.doublon("0008"));
        assertFalse(CodeErreurPharmaMl.doublon("0011"));
    }

    @Test
    void erreurLueAvecSonLibelle() {
        String xml = "<CSRP_ENVELOPPE xmlns=\"urn:x-csrp:fr.csrp.protocole:enveloppe\"><CORPS><MESSAGE_REPARTITEUR"
                + " xmlns=\"urn:x-csrp:fr.csrp.protocole:message\"><CORPS><ERREUR Statut=\"0101\" Detail=\"Client 0999908 inconnu\"/>"
                + "</CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>";
        String e = PharmaMlMessages.erreurReponse(xml);
        assertEquals("statut 0101 (officine inconnue du grossiste) : Client 0999908 inconnu", e);
        assertEquals("0101", PharmaMlMessages.codeErreur(e));
        assertFalse(PharmaMlMessages.erreurControle(e));
        assertTrue(PharmaMlMessages.erreurControle("statut 0011 (x) : y"));
    }
}
