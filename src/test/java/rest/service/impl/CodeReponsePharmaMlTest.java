package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.impl.PharmaMlMessages.Disponibilite;

/** Retours du 08/10 (4) : codes reponse (tableau 9) et reponse d'information produit de TEDIS (code sur la ligne). */
class CodeReponsePharmaMlTest {

    @Test
    void tableau9() {
        assertTrue(CodeReponsePharmaMl.disponible("0000"));
        assertTrue(CodeReponsePharmaMl.disponible("0"));
        assertFalse(CodeReponsePharmaMl.disponible("0001"));
        assertFalse(CodeReponsePharmaMl.disponible(""));
        assertEquals("Produit inconnu", CodeReponsePharmaMl.libelle("0001"));
        assertEquals("Pas en stock (ne tenons pas)", CodeReponsePharmaMl.libelle("0002"));
        assertEquals("Ne se fait plus", CodeReponsePharmaMl.libelle("0003"));
        assertEquals("Manque fabricant", CodeReponsePharmaMl.libelle("0004"));
        assertEquals("Manque rayon", CodeReponsePharmaMl.libelle("0005"));
        assertEquals("Retrait de produit", CodeReponsePharmaMl.libelle("0006"));
        assertEquals("Non autorisé", CodeReponsePharmaMl.libelle("0007"));
        assertEquals("Code CSRP 42", CodeReponsePharmaMl.libelle("0042"));
        assertEquals("Code propre au grossiste (1234)", CodeReponsePharmaMl.libelle("1234"));
        assertEquals("", CodeReponsePharmaMl.libelle(""));
        assertEquals("ABC", CodeReponsePharmaMl.libelle("ABC"));
        assertEquals("Manque Rayon (texte)", CodeReponsePharmaMl.motif("0005", " Manque Rayon (texte) "));
        assertEquals("Manque rayon", CodeReponsePharmaMl.motif("0005", " "));
        assertNull(CodeReponsePharmaMl.motif("", ""));
    }

    private static final String TEDIS = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><CSRP_ENVELOPPE xmlns=\"urn:x-csrp:fr.csrp.protocole:enveloppe\""
            + " Nature_Action=\"REP_EMISSION\" Version_Protocole=\"1.0.0.0\"><ENTETE><REF_MESSAGE>IP_1</REF_MESSAGE></ENTETE><CORPS>"
            + "<MESSAGE_REPARTITEUR xmlns=\"urn:x-csrp:fr.csrp.protocole:message\"><CORPS><REP_INFO_PRODUIT Ref_Reponse_Info=\"IP_1\" Ref_Demande_Info=\"P\">"
            + "<LIGNE_REP_INFO_PRODUIT Num_Ligne=\"0001\" Num_Ligne_Demande=\"0001\" Type_Codification=\"CIP39\" Code_Produit=\"8521508\""
            + " Designation=\"AC NET LOTION FLORALE F/125ML\" Nature=\"PHAHT\" Valeur=\"0\" Code_Reponse=\"0001\" Libelle=\"Produit inconnu\"/>"
            + "<LIGNE_REP_INFO_PRODUIT Num_Ligne=\"0002\" Num_Ligne_Demande=\"0002\" Type_Codification=\"CIP39\" Code_Produit=\"3257001\""
            + " Designation=\"EFFERALGAN\" Nature=\"PHAHT\" Valeur=\"1040\" Code_Reponse=\"0000\" Libelle=\"Produit disponible\"/>"
            + "<LIGNE_REP_INFO_PRODUIT Num_Ligne=\"0003\" Code_Produit=\"1111111\" Code_Reponse=\"0004\"/>"
            + "</REP_INFO_PRODUIT></CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>";

    @Test
    void reponseTedisCodeSurLaLigne() throws Exception {
        List<Disponibilite> l = PharmaMlMessages.lireReponseInfoProduit(TEDIS);
        assertEquals(3, l.size());
        assertEquals("8521508", l.get(0).code);
        assertEquals("NON", l.get(0).statut, "fichier RI_ du 08/10 : produit inconnu = non disponible");
        assertEquals("0001", l.get(0).codeReponse);
        assertEquals("Produit inconnu", l.get(0).libelle);
        assertNull(l.get(0).prix);
        assertEquals("OUI", l.get(1).statut);
        assertEquals(Integer.valueOf(1040), l.get(1).prix);
        assertEquals("NON", l.get(2).statut);
        assertEquals("Manque fabricant", l.get(2).libelle, "sans libelle du grossiste : libelle du tableau 9");
    }
}
