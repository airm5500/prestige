package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Retours du 08/10 (10) : avancement des commandes (tableau 11, REQ_ETAT_COMMANDE / SUIVI_COMMANDE). */
class AvancementPharmaMlTest {

    @Test
    void codesEtEtatGlobal() {
        assertEquals(CodeAvancementPharmaMl.A_FAIRE, CodeAvancementPharmaMl.etat("0001"));
        assertEquals(CodeAvancementPharmaMl.EN_COURS, CodeAvancementPharmaMl.etat("2"));
        assertEquals(CodeAvancementPharmaMl.PREPAREE, CodeAvancementPharmaMl.etat("0003"));
        assertEquals(CodeAvancementPharmaMl.ANNULEE, CodeAvancementPharmaMl.etat("0004"));
        assertEquals(CodeAvancementPharmaMl.AUTRE, CodeAvancementPharmaMl.etat("1500"));
        assertEquals("Expédiée", CodeAvancementPharmaMl.libelle("1500", "Expédiée"));
        assertEquals("Code 1500", CodeAvancementPharmaMl.libelle("1500", ""));
        assertEquals("Préparée (en livraison)", CodeAvancementPharmaMl.libelle("0003", "x"));
        assertEquals(CodeAvancementPharmaMl.EN_COURS,
                CodeAvancementPharmaMl.global(Arrays.asList("PREPAREE", "EN_COURS")), "le moins avance des lignes");
        assertEquals(CodeAvancementPharmaMl.PREPAREE,
                CodeAvancementPharmaMl.global(Arrays.asList("PREPAREE", "ANNULEE")),
                "les annulees sont comptees a part");
        assertEquals(CodeAvancementPharmaMl.ANNULEE,
                CodeAvancementPharmaMl.global(Arrays.asList("ANNULEE", "ANNULEE")));
        assertEquals(CodeAvancementPharmaMl.AUTRE, CodeAvancementPharmaMl.global(Collections.emptyList()));
    }

    @Test
    void demandeEtat() {
        PharmaMlMessages.Partenaires p = new PharmaMlMessages.Partenaires();
        p.codeOfficine = "00";
        p.idOfficine = "0999908";
        p.nomOfficine = "OFFICINE";
        p.codeRepartiteur = "12";
        p.idRepartiteur = "04";
        p.nomRepartiteur = "TEDIS";
        p.date = "2026-10-08T12:00:00";
        String xml = PharmaMlMessages.etatCommande(PharmaMlMessages.V1, p, "REF1", "8102026_00008", Arrays
                .asList(new PharmaMlMessages.Ligne("3257001", "", 2), new PharmaMlMessages.Ligne("8521508", "", 1)));
        assertTrue(xml.contains("<REQ_ETAT_COMMANDE Ref_Cde_Client=\"8102026_00008\">"), xml);
        assertEquals(2, xml.split("<LIGNE Num_Ligne=").length - 1);
        assertTrue(xml.contains("Code_Produit=\"3257001\""));
        assertTrue(xml.contains("CSRP_ENVELOPPE") && xml.contains("Nature_Action=\"REQ_EMISSION\""));
    }

    @Test
    void lectureSuivi() throws Exception {
        String xml = "<CSRP_ENVELOPPE xmlns=\"urn:x-csrp:fr.csrp.protocole:enveloppe\"><CORPS><MESSAGE_REPARTITEUR"
                + " xmlns=\"urn:x-csrp:fr.csrp.protocole:message\"><CORPS><SUIVI_COMMANDE Ref_Suivi=\"S1\" Ref_Cde_Client=\"C1\">"
                + "<NORMALE><LIGNE_N Num_Ligne=\"1\" Type_Codification=\"CIP39\" Code_Produit=\"3257001\" Quantite=\"2\""
                + " Code_Statut=\"0002\" Libelle_Statut=\"En cours\" Date_Livraison=\"2026-10-10\" Commentaire=\"tournée 2\"/>"
                + "</NORMALE></SUIVI_COMMANDE></CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>";
        Object[] r = PharmaMlMessages.lireSuiviCommande(xml);
        assertEquals("C1", r[0]);
        @SuppressWarnings("unchecked")
        List<PharmaMlMessages.Suivi> l = (List<PharmaMlMessages.Suivi>) r[1];
        assertEquals(1, l.size());
        assertEquals("3257001", l.get(0).code);
        assertEquals(2, l.get(0).quantite);
        assertEquals("0002", l.get(0).codeStatut);
        assertEquals("2026-10-10", l.get(0).dateLivraison);
        assertEquals("tournée 2", l.get(0).commentaire);
        assertNull(PharmaMlMessages
                .lireSuiviCommande("<CSRP_ENVELOPPE><CORPS><ACTION>FIN_SERVICE</ACTION></CORPS></CSRP_ENVELOPPE>"));
        assertEquals("suivis", ArchivePharmaMl.type("E_X"));
        assertEquals("suivis", ArchivePharmaMl.type("RE_X"));
    }
}
