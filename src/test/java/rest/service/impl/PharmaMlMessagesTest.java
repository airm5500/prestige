package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;
import javax.xml.bind.JAXBContext;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import rest.service.impl.PharmaMlMessages.Disponibilite;
import rest.service.impl.PharmaMlMessages.Ligne;
import rest.service.impl.PharmaMlMessages.Partenaires;
import rest.service.pharmaMl.response.CsrpEnveloppeResponse;

/** Plan d'octobre 1.2 : messages PharmaML V1 / V3, information produit et commande V3. */
public class PharmaMlMessagesTest {

    private static Partenaires p() {
        Partenaires p = new Partenaires();
        p.codeOfficine = "00";
        p.idOfficine = "461";
        p.nomOfficine = "PHARMACIE <TEST> & CIE";
        p.codeRepartiteur = "01";
        p.idRepartiteur = "VRI";
        p.nomRepartiteur = "REPARTITEUR";
        p.date = "2026-10-06T10:00:00";
        return p;
    }

    private static List<Ligne> lignes(int n) {
        List<Ligne> l = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            l.add(new Ligne(i % 2 == 0 ? "8437297" : "3000000628799", "PRODUIT " + i, 1));
        }
        return l;
    }

    @Test
    public void versionParDefautTrois() {
        assertEquals("3.0.0.0", PharmaMlMessages.version(null));
        assertEquals("3.0.0.0", PharmaMlMessages.version(""));
        assertEquals("1.0.0.0", PharmaMlMessages.version("1.0.0.0"));
    }

    @Test
    public void requeteV3CommeLExempleReel() throws Exception {
        String x = PharmaMlMessages.reqInfoProduit(null, p(), "PRS2610061000001", lignes(2));
        Document d = PharmaMlMessages.lireXml(x);
        Element r = d.getDocumentElement();
        assertEquals("SRP_ENVELOPPE", r.getLocalName());
        assertEquals("urn:x-srp:fr.srp.protocole:enveloppe", r.getNamespaceURI());
        assertEquals("3.0.0.0", r.getAttribute("Version_Protocole"));
        assertEquals("PRESTIGE", r.getAttribute("Id_Moteur"));
        Element em = (Element) r.getElementsByTagNameNS("*", "EMETTEUR").item(0);
        assertEquals("461", em.getAttribute("Id_Officine"));
        assertEquals("PHARMACIE <TEST> & CIE", em.getAttribute("Adresse"), "caracteres speciaux echappes");
        Element l2 = (Element) r.getElementsByTagNameNS("urn:x-srp:fr.srp.protocole:message", "LIGNE_REQ_INFO_PRODUIT")
                .item(1);
        assertEquals("0002", l2.getAttribute("Num_Ligne"));
        assertEquals("EAN13", l2.getAttribute("Type_Codification"));
        assertEquals("0001", l2.getAttribute("Quantite"));
        assertEquals(0, r.getElementsByTagNameNS("*", "COMMANDE").getLength(), "jamais de COMMANDE");
        assertFalse(x.toUpperCase().contains("MEDICIEL"));
    }

    @Test
    public void requeteV1EnveloppeCsrp() throws Exception {
        Element r = PharmaMlMessages.lireXml(PharmaMlMessages.reqInfoProduit("1.0.0.0", p(), "R1", lignes(1)))
                .getDocumentElement();
        assertEquals("CSRP_ENVELOPPE", r.getLocalName());
        assertEquals("urn:x-csrp:fr.csrp.protocole:enveloppe", r.getNamespaceURI());
        assertEquals("1.0.0.0", r.getAttribute("Version_Protocole"));
        assertEquals(1,
                r.getElementsByTagNameNS("urn:x-csrp:fr.csrp.protocole:message", "REQ_INFO_PRODUIT").getLength());
        assertEquals(0, r.getElementsByTagNameNS("*", "COMMANDE").getLength());
    }

    @Test
    public void cinquanteLignesAuPlus() {
        PharmaMlMessages.reqInfoProduit(null, p(), "R", lignes(50));
        assertThrows(IllegalArgumentException.class, () -> PharmaMlMessages.reqInfoProduit(null, p(), "R", lignes(51)));
    }

    @Test
    public void commandeV3() throws Exception {
        Element r = PharmaMlMessages
                .lireXml(PharmaMlMessages.commandeV3(p(), "M", "CDE1", "Test", "2026-10-07", lignes(3)))
                .getDocumentElement();
        Element c = (Element) r.getElementsByTagNameNS("*", "COMMANDE").item(0);
        assertEquals("CDE1", c.getAttribute("Ref_Cde_Client"));
        assertEquals("2026-10-07", c.getAttribute("Date_livraison"));
        assertEquals(3, r.getElementsByTagNameNS("urn:x-srp:fr.srp.protocole:message", "LIGNE_N").getLength());
    }

    @Test
    public void lectureToleranteDesReponses() throws Exception {
        String rep = "<SRP_ENVELOPPE xmlns=\"urn:x-srp:fr.srp.protocole:enveloppe\"><CORPS>"
                + "<MESSAGE_REPARTITEUR xmlns=\"urn:x-srp:fr.srp.protocole:message\"><CORPS>"
                + "<REP_INFO_PRODUIT Ref_Rep=\"X\"><NORMALE>"
                + "<LIGNE_REP_INFO_PRODUIT Num_Ligne=\"0001\" Type_Codification=\"CIP39\" Code_Produit=\"8437297\" Disponibilite=\"Oui\">"
                + "<PRIX_N Nature=\"PFHT\" Valeur=\"1234.500\"/></LIGNE_REP_INFO_PRODUIT>"
                + "<LIGNE_REP_INFO_PRODUIT Num_Ligne=\"0002\" Type_Codification=\"EAN13\" Code_Produit=\"3000000628799\">"
                + "<INDISPONIBILITE Code_Reponse=\"4\" Additif=\"MANQUE FABRICANT\" Date_Effet=\"2026-11-01\">"
                + "<INFO_DISPO Date_Mise_Dispo=\"2026-10-20\" Quantite_Dispo=\"12\"/>"
                + "<PRODUIT_REMPLACANT Type_Remplacement=\"EQ\" Type_Codification=\"CIP39\" Code_Produit=\"1111111\" Designation=\"GENERIQUE\"/>"
                + "</INDISPONIBILITE></LIGNE_REP_INFO_PRODUIT>"
                + "<LIGNE_REP_INFO_PRODUIT Num_Ligne=\"0003\" Code_Produit=\"9\" Disponibilite=\"Autre\" Commentaire=\"Sur commande\"/>"
                + "</NORMALE></REP_INFO_PRODUIT></CORPS></MESSAGE_REPARTITEUR></CORPS></SRP_ENVELOPPE>";
        List<Disponibilite> l = PharmaMlMessages.lireReponseInfoProduit(rep);
        assertEquals(3, l.size(), "le produit remplacant n'est pas une ligne");
        assertEquals("OUI", l.get(0).statut);
        assertEquals(1235, (int) l.get(0).prix);
        Disponibilite n = l.get(1);
        assertEquals(2, n.numLigne);
        assertEquals("NON", n.statut);
        assertEquals("4", n.codeReponse);
        assertEquals("MANQUE FABRICANT", n.libelle);
        assertEquals("2026-10-20", n.dateDispo);
        assertEquals(12, (int) n.quantiteDispo);
        assertEquals("1111111", n.remplacantCode);
        assertEquals("AUTRE", l.get(2).statut);
        assertEquals("Sur commande", l.get(2).commentaire);
        assertNull(l.get(2).prix);
    }

    @Test
    public void reponseSansNormaleEtValeursCourtes() throws Exception {
        String rep = "<CSRP_ENVELOPPE><CORPS><MESSAGE_REPARTITEUR><CORPS><REP_INFO_PRODUIT>"
                + "<LIGNE_REP Num_Ligne_Demande=\"1\" Code_Produit=\"A\" Disponible=\"N\"/>"
                + "<LIGNE_REP Num_Ligne_Demande=\"2\" Code_Produit=\"B\" Disponible=\"O\"/>"
                + "</REP_INFO_PRODUIT></CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>";
        List<Disponibilite> l = PharmaMlMessages.lireReponseInfoProduit(rep);
        assertEquals("NON", l.get(0).statut);
        assertEquals("OUI", l.get(1).statut);
        assertEquals(2, l.get(1).numLigne);
    }

    @Test
    public void aucuneEntiteExterne() {
        String xxe = "<?xml version=\"1.0\"?><!DOCTYPE x [<!ENTITY e SYSTEM \"file:///etc/passwd\">]><x>&e;</x>";
        assertThrows(Exception.class, () -> PharmaMlMessages.lireReponseInfoProduit(xxe));
    }

    @Test
    public void reponseCommandeV3LueParLesClassesV1() throws Exception {
        String rep = "<SRP_ENVELOPPE xmlns=\"urn:x-srp:fr.srp.protocole:enveloppe\" Version_Protocole=\"3.0.0.0\"><CORPS>"
                + "<MESSAGE_REPARTITEUR xmlns=\"urn:x-srp:fr.srp.protocole:message\"><CORPS><REP_COMMANDE><NORMALE>"
                + "<LIGNE_N Code_Produit=\"8437297\" Quantite_livree=\"2\"><PRIX_N Nature=\"PFHT\" Valeur=\"100\"/></LIGNE_N>"
                + "</NORMALE></REP_COMMANDE></CORPS></MESSAGE_REPARTITEUR></CORPS></SRP_ENVELOPPE>";
        CsrpEnveloppeResponse r = (CsrpEnveloppeResponse) JAXBContext.newInstance(CsrpEnveloppeResponse.class)
                .createUnmarshaller().unmarshal(new StringReader(PharmaMlMessages.reponseV3VersV1(rep)));
        assertEquals(2, r.getCorps().getMessageRepartiteur().getCorps().getRepCommande().getNormale().getLignes().get(0)
                .getQuantiteLivree());
        assertTrue(PharmaMlMessages.reponseV3VersV1("<CSRP_ENVELOPPE/>").startsWith("<CSRP_ENVELOPPE"));
    }

    /** Vraie reponse de DPCI (07/10) a une commande en 3.0.0.0 : erreur dans une enveloppe CSRP 1.0.0.0. */
    @org.junit.jupiter.api.Test
    void erreurDuGrossisteLue() throws Exception {
        String xml;
        try (java.io.InputStream in = getClass().getResourceAsStream("/pharmaml/R_DPCI_refus_v3.xml")) {
            xml = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        }
        String e = PharmaMlMessages.erreurReponse(xml);
        org.junit.jupiter.api.Assertions.assertNotNull(e);
        org.junit.jupiter.api.Assertions.assertTrue(e.contains("CSRP enveloppe invalide"), e);
        org.junit.jupiter.api.Assertions.assertTrue(PharmaMlMessages.enveloppeV1Attendue(e));
        org.junit.jupiter.api.Assertions.assertNull(PharmaMlMessages.erreurReponse(
                "<SRP_ENVELOPPE><CORPS><REP_COMMANDE><NORMALE><LIGNE_N Code_Produit=\"1\" Quantite_livree=\"1\"/>"
                        + "</NORMALE></REP_COMMANDE></CORPS></SRP_ENVELOPPE>"));
        org.junit.jupiter.api.Assertions.assertNull(PharmaMlMessages.erreurReponse(null));
        org.junit.jupiter.api.Assertions.assertEquals("stock epuise",
                PharmaMlMessages.erreurReponse("<X><ERREUR>  stock\n epuise </ERREUR></X>"));
        org.junit.jupiter.api.Assertions.assertFalse(PharmaMlMessages.enveloppeV1Attendue("stock epuise"));
    }
}
