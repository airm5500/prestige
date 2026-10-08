package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import javax.xml.XMLConstants;
import javax.xml.transform.Source;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import org.junit.jupiter.api.Test;

/** Retours du 08/10 (13) : demande de retour (§ 3.1.5), reclamations (§ 3.1.4), bon de retour (§ 3.2.5). */
class RetourPharmaMlTest {

    private static String ressource(String chemin) throws Exception {
        try (InputStream in = RetourPharmaMlTest.class.getResourceAsStream(chemin)) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static Schema schemas() throws Exception {
        SchemaFactory f = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        f.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, false);
        return f.newSchema(
                new Source[] { new StreamSource(new StringReader(ressource("/pharmaml/xsd/csrp-message-specv4.8.xsd"))),
                        new StreamSource(new StringReader(ressource("/pharmaml/xsd/csrp-enveloppe-specv4.8.xsd"))) });
    }

    private static PharmaMlMessages.Partenaires partenaires() {
        PharmaMlMessages.Partenaires p = new PharmaMlMessages.Partenaires();
        p.codeOfficine = "00";
        p.idOfficine = "0999908";
        p.nomOfficine = "OFFICINE & CO";
        p.codeRepartiteur = "12";
        p.idRepartiteur = "04";
        p.nomRepartiteur = "TEDIS";
        p.date = "2026-10-08T22:00:00";
        return p;
    }

    private static List<PharmaMlMessages.LigneRetour> lignes() {
        return Arrays.asList(
                new PharmaMlMessages.LigneRetour("3257001", "DOLIPRANE <500>", 2, "0104", "0006", null, null,
                        "boîte écrasée"),
                new PharmaMlMessages.LigneRetour("3400930000001", "", 1, "0103", "0006", 1, 1, ""));
    }

    @Test
    void demandeDeRetourValide() throws Exception {
        String x = PharmaMlMessages.demandeRetour(PharmaMlMessages.V1, partenaires(), "R1", "RET-00012345", "BL-77",
                lignes());
        schemas().newValidator().validate(new StreamSource(new StringReader(x)));
        assertTrue(x.contains("<REQ_RETOUR Ref_Demande_Retour=\"RET-00012345\">"), x);
        assertTrue(x.contains("<DOCUMENT Nature_Document=\"0002\" Ref_Document=\"BL-77\"/>"), x);
        assertTrue(x.contains("Motif=\"0104\" Commentaire_produit=\"boîte écrasée\""), x);
        assertTrue(x.contains("Designation=\"DOLIPRANE &lt;500&gt;\""), x);
        assertTrue(x.contains("Type_Codification=\"EAN13\""), x);
        /* sans bon de livraison : pas d'element DOCUMENT, toujours valide */
        String sans = PharmaMlMessages.demandeRetour(PharmaMlMessages.V1, partenaires(), "R2", "RET-1", null, lignes());
        schemas().newValidator().validate(new StreamSource(new StringReader(sans)));
        assertTrue(!sans.contains("<DOCUMENT"));
        assertThrows(IllegalArgumentException.class, () -> PharmaMlMessages.demandeRetour(PharmaMlMessages.V1,
                partenaires(), "R", "X", null, Collections.emptyList()));
    }

    @Test
    void reclamationValide() throws Exception {
        String x = PharmaMlMessages.reclamations(PharmaMlMessages.V1, partenaires(), "R3", "REC-1", "BL-77", lignes());
        schemas().newValidator().validate(new StreamSource(new StringReader(x)));
        assertTrue(
                x.contains("<RECLAMATIONS Ref_Reclamation=\"REC-1\" Nature_Document=\"0002\" Ref_Document=\"BL-77\">"),
                x);
        assertTrue(
                x.contains(
                        "Motif=\"0103\" Action=\"0006\" Quantite=\"1\" Quantite_livree=\"1\" Quantite_facturee=\"1\""),
                x);
        assertTrue(x.contains("<PRODUIT_FACTURE Type_Codification=\"CIP39\" Code_Produit=\"3257001\""), x);
        assertThrows(IllegalArgumentException.class,
                () -> PharmaMlMessages.reclamations(PharmaMlMessages.V1, partenaires(), "R", "X", " ", lignes()));
    }

    @Test
    void lectureBonDeRetour() throws Exception {
        String xml = "<CSRP_ENVELOPPE xmlns=\"urn:x-csrp:fr.csrp.protocole:enveloppe\"><CORPS><MESSAGE_REPARTITEUR"
                + " xmlns=\"urn:x-csrp:fr.csrp.protocole:message\"><CORPS><BON_RETOUR Ref_Demande_Retour=\"RET-1\" Ref_Bon_Retour=\"BR9\">"
                + "<LIGNE Num_Ligne=\"1\" Num_Ligne_Demande=\"2\" Type_Codification=\"CIP39\" Code_Produit=\"3257001\" Quantite_acceptee=\"1\""
                + " Date_Reprise=\"2026-10-12\" Commentaire=\"1 refusée : hors délai\"><PRIX Nature=\"NETHT\" Valeur=\"10\"/></LIGNE>"
                + "<LIGNE Num_Ligne=\"2\" Type_Codification=\"CIP39\" Code_Produit=\"3400930\" Quantite_acceptee=\"0\"/>"
                + "</BON_RETOUR></CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>";
        Object[] r = PharmaMlMessages.lireBonRetour(xml);
        assertEquals("RET-1", r[0]);
        assertEquals("BR9", r[1]);
        @SuppressWarnings("unchecked")
        List<PharmaMlMessages.LigneBonRetour> l = (List<PharmaMlMessages.LigneBonRetour>) r[2];
        assertEquals(2, l.size());
        assertEquals(Integer.valueOf(2), l.get(0).numLigneDemande);
        assertEquals(1, l.get(0).quantiteAcceptee);
        assertEquals("2026-10-12", l.get(0).dateReprise);
        assertEquals("1 refusée : hors délai", l.get(0).commentaire);
        assertNull(l.get(1).numLigneDemande);
        assertEquals(0, l.get(1).quantiteAcceptee);
        assertNull(PharmaMlMessages
                .lireBonRetour("<CSRP_ENVELOPPE><CORPS><ACTION>FIN_SERVICE</ACTION></CORPS></CSRP_ENVELOPPE>"));
    }
}
