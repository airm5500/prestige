package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;
import javax.xml.XMLConstants;
import javax.xml.transform.Source;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.NodeList;

/**
 * Commande PharmaML 1.0.0.0 (retours du 07/10) : valide contre les schemas officiels Pharma-ML v4.8 (enveloppe +
 * message) et de meme structure que l'exemple reel fourni par l'officine (espace de noms du message declare sur
 * MESSAGE_OFFICINE, sans prefixe ns2).
 */
class PharmaMlFormatV1Test {

    private static String ressource(String chemin) throws Exception {
        try (InputStream in = PharmaMlFormatV1Test.class.getResourceAsStream(chemin)) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static String commandeV1() {
        PharmaMlMessages.Partenaires p = new PharmaMlMessages.Partenaires();
        p.codeOfficine = "00";
        p.idOfficine = "0999908";
        p.nomOfficine = "PHIE DE GBOGUHE SARL-U";
        p.codeRepartiteur = "12";
        p.idRepartiteur = "04";
        p.nomRepartiteur = "DPCI";
        p.date = "2026-10-07T22:22:34";
        List<PharmaMlMessages.Ligne> l = new ArrayList<>();
        l.add(new PharmaMlMessages.Ligne("3232018", "DOLIPRANE 500MG CPR B/16", 1));
        l.add(new PharmaMlMessages.Ligne("3000000263068", "", 2));
        return PharmaMlMessages.commande(PharmaMlMessages.V1, p, "20261007222234", "7102026_000022234", "7102026_00002",
                "2026-10-08", l);
    }

    private static Schema schemas() throws Exception {
        SchemaFactory f = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        /* schemas officiels locaux (ressources de test) : leur modele depasse la limite de securite par defaut */
        f.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, false);
        return f.newSchema(
                new Source[] { new StreamSource(new StringReader(ressource("/pharmaml/xsd/csrp-message-specv4.8.xsd"))),
                        new StreamSource(new StringReader(ressource("/pharmaml/xsd/csrp-enveloppe-specv4.8.xsd"))) });
    }

    @Test
    void valideContreLesSchemasOfficiels() throws Exception {
        schemas().newValidator().validate(new StreamSource(new StringReader(commandeV1())));
        /* l'exemple reel passe aussi : le test valide bien le schema */
        schemas().newValidator()
                .validate(new StreamSource(new StringReader(ressource("/pharmaml/exemple_ReqCommande_V1_CSRP.xml"))));
    }

    @Test
    void memeStructureQueLExempleReel() throws Exception {
        String x = commandeV1();
        assertFalse(x.contains("ns2:"), x);
        assertFalse(x.contains("standalone"), x);
        assertTrue(x.contains("<MESSAGE_OFFICINE xmlns=\"urn:x-csrp:fr.csrp.protocole:message\">"), x);
        assertEquals(structure(ressource("/pharmaml/exemple_ReqCommande_V1_CSRP.xml")), structure(x));
        /* designation inconnue : attribut omis (le schema l'impose non vide) */
        assertTrue(x.contains("Code_Produit=\"3000000263068\" Quantite=\"0002\" Equivalent"), x);
        assertTrue(x.contains("Type_Codification=\"EAN13\""), x);
    }

    /**
     * Elements (espace de noms + nom) et noms d'attributs, dans l'ordre, sans les valeurs ni les doublons de lignes.
     */
    private static String structure(String xml) throws Exception {
        Document d = PharmaMlMessages.lireXml(xml);
        StringBuilder sb = new StringBuilder();
        NodeList nl = d.getElementsByTagName("*");
        String precedente = null;
        for (int i = 0; i < nl.getLength(); i++) {
            Element e = (Element) nl.item(i);
            TreeSet<String> a = new TreeSet<>();
            NamedNodeMap m = e.getAttributes();
            for (int j = 0; j < m.getLength(); j++) {
                String n = m.item(j).getNodeName();
                if (!n.startsWith("xmlns") && !"Designation".equals(n)) {
                    a.add(n);
                }
            }
            String ligne = e.getNamespaceURI() + " " + e.getLocalName() + " " + a + "\n";
            if (!ligne.equals(precedente)) {
                sb.append(ligne);
            }
            precedente = ligne;
        }
        return sb.toString();
    }
}
