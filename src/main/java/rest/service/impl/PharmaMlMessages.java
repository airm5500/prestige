package rest.service.impl;

import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.Predicate;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

/**
 * MESSAGES PHARMAML (plan d'octobre 1.2) : construction et lecture, sans reseau ni base (testable).
 *
 * <ul>
 * <li>Version 1.0.0.0 : enveloppe CSRP (urn:x-csrp:fr.csrp.protocole), identique a l'envoi de commande existant.</li>
 * <li>Version 3.0.0.0 : enveloppe SRP (urn:x-srp:fr.srp.protocole), attributs Id_Officine / Id_Repartiteur, Id_Moteur,
 * sur le modele des echanges reels fournis par l'officine (REQ_EMISSION, lignes dans NORMALE).</li>
 * </ul>
 *
 * <p>
 * La requete d'information produit « ne constitue en aucun cas une pre-commande, ni une pre-reservation »
 * (specification 3.1.3) : ce parcours ne construit JAMAIS de message COMMANDE. 50 lignes au plus par requete.
 *
 * <p>
 * La reponse d'information produit est lue de facon TOLERANTE (noms locaux, sans dependre des espaces de noms ni de la
 * presence d'une NORMALE) : la specification decrit les champs mais pas les balises, et les repartiteurs different. Les
 * echanges sont archives pour ajuster la lecture apres les essais de l'officine.
 */
public final class PharmaMlMessages {

    public static final String V1 = "1.0.0.0";
    public static final String V3 = "3.0.0.0";
    public static final int MAX_LIGNES = 50;
    public static final String ID_MOTEUR = "PRESTIGE";
    public static final String VERSION_MOTEUR = "2.0.0";

    private static final String NS_V1_ENV = "urn:x-csrp:fr.csrp.protocole:enveloppe";
    private static final String NS_V1_MSG = "urn:x-csrp:fr.csrp.protocole:message";
    private static final String NS_V3_ENV = "urn:x-srp:fr.srp.protocole:enveloppe";
    private static final String NS_V3_MSG = "urn:x-srp:fr.srp.protocole:message";

    private PharmaMlMessages() {
    }

    /** Version normalisee : 1.0.0.0 si demandee explicitement, 3.0.0.0 sinon (defaut du 06/10). */
    public static String version(String v) {
        return v != null && v.trim().startsWith("1") ? V1 : V3;
    }

    /** Les parties de l'echange (lues dans la fiche grossiste et l'officine). */
    public static class Partenaires {

        /** Code emetteur (str_OFFICINE_ID, « 00 » par defaut), identifiant officine chez le grossiste. */
        public String codeOfficine = "00", idOfficine = "", nomOfficine = "";
        /** Code recepteur (str_CODE_RECEPTEUR_PHARMA), identifiant repartiteur, libelle. */
        public String codeRepartiteur = "", idRepartiteur = "", nomRepartiteur = "";
        /** Date au format AAAA-MM-JJThh:mm:ss. */
        public String date = "";
    }

    /** Une ligne demandee. */
    public static class Ligne {

        public final String code, typeCodification, designation;
        public final int quantite;

        public Ligne(String code, String designation, int quantite) {
            this.code = code == null ? "" : code.trim();
            this.typeCodification = this.code.length() == 13 ? "EAN13" : "CIP39";
            this.designation = designation == null ? "" : designation.trim();
            this.quantite = Math.max(1, quantite);
        }
    }

    static String esc(String s) {
        if (s == null) {
            return "";
        }
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) {
            switch (c) {
            case '&':
                b.append("&amp;");
                break;
            case '<':
                b.append("&lt;");
                break;
            case '>':
                b.append("&gt;");
                break;
            case '"':
                b.append("&quot;");
                break;
            default:
                if (c >= 0x20 || c == '\t') {
                    b.append(c);
                }
            }
        }
        return b.toString();
    }

    private static String pad4(int n) {
        return String.format(Locale.ROOT, "%04d", n);
    }

    private static String tronque(String s, int n) {
        return s == null ? "" : (s.length() > n ? s.substring(0, n) : s);
    }

    /** Enveloppe + en-tete de message, autour du corps metier (deja serialise). */
    private static String enveloppe(String version, Partenaires p, String reference, String corpsMetier) {
        StringBuilder x = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        if (V1.equals(version)) {
            x.append("<CSRP_ENVELOPPE xmlns=\"").append(NS_V1_ENV)
                    .append("\" Nature_Action=\"REQ_EMISSION\" Version_Protocole=\"").append(V1)
                    .append("\" Id_Logiciel=\"Prestige\" Version_Logiciel=\"").append(VERSION_MOTEUR)
                    .append("\" Usage=\"P\">\n  <ENTETE>\n    <EMETTEUR Nature=\"OF\" Code=\"")
                    .append(esc(p.codeOfficine)).append("\" Id=\"").append(esc(p.idOfficine)).append("\" Adresse=\"")
                    .append(esc(p.nomOfficine)).append("\"/>\n    <RECEPTEUR Nature=\"RE\" Code=\"")
                    .append(esc(p.codeRepartiteur)).append("\" Id=\"").append(esc(p.idRepartiteur))
                    .append("\" Adresse=\"").append(esc(p.nomRepartiteur)).append("\"/>\n    <REF_MESSAGE>")
                    .append(esc(reference)).append("</REF_MESSAGE>\n    <DATE>").append(esc(p.date))
                    .append("</DATE>\n  </ENTETE>\n  <CORPS>\n    <MESSAGE_OFFICINE xmlns=\"").append(NS_V1_MSG)
                    .append("\">\n      <ENTETE>\n        <EMETTEUR Id_Client=\"").append(esc(p.idOfficine))
                    .append("\" Nature_Partenaire=\"OF\"/>\n        <DESTINATAIRE Code_Societe=\"")
                    .append(esc(p.codeRepartiteur)).append("\" Id_Societe=\"").append(esc(p.idRepartiteur))
                    .append("\" Nature_Partenaire=\"RE\"/>\n        <DATE>").append(esc(p.date))
                    .append("</DATE>\n      </ENTETE>\n      <CORPS>\n").append(corpsMetier)
                    .append("      </CORPS>\n    </MESSAGE_OFFICINE>\n  </CORPS>\n</CSRP_ENVELOPPE>\n");
        } else {
            x.append("<SRP_ENVELOPPE xmlns=\"").append(NS_V3_ENV)
                    .append("\" Nature_Action=\"REQ_EMISSION\" Version_Protocole=\"").append(V3)
                    .append("\" Id_Moteur=\"").append(ID_MOTEUR).append("\" Version_Moteur=\"").append(VERSION_MOTEUR)
                    .append("\" Usage=\"P\">\n  <ENTETE>\n    <EMETTEUR Nature=\"OF\" Code=\"")
                    .append(esc(p.codeOfficine)).append("\" Id_Officine=\"").append(esc(p.idOfficine))
                    .append("\" Adresse=\"").append(esc(p.nomOfficine))
                    .append("\"/>\n    <RECEPTEUR Nature=\"RE\" Code=\"").append(esc(p.codeRepartiteur))
                    .append("\" Id_Repartiteur=\"").append(esc(p.idRepartiteur)).append("\" Adresse=\"")
                    .append(esc(p.nomRepartiteur)).append("\"/>\n    <REF_MESSAGE>").append(esc(reference))
                    .append("</REF_MESSAGE>\n    <DATE>").append(esc(p.date))
                    .append("</DATE>\n  </ENTETE>\n  <CORPS>\n    <MESSAGE_OFFICINE xmlns=\"").append(NS_V3_MSG)
                    .append("\">\n      <ENTETE>\n        <EMETTEUR Id_Officine=\"").append(esc(p.idOfficine))
                    .append("\" Nature_Partenaire=\"OF\"/>\n        <DESTINATAIRE Code_Societe=\"")
                    .append(esc(p.codeRepartiteur)).append("\" Id_Repartiteur=\"").append(esc(p.idRepartiteur))
                    .append("\" Nature_Partenaire=\"RE\"/>\n        <DATE>").append(esc(p.date))
                    .append("</DATE>\n      </ENTETE>\n      <CORPS>\n").append(corpsMetier)
                    .append("      </CORPS>\n    </MESSAGE_OFFICINE>\n  </CORPS>\n</SRP_ENVELOPPE>\n");
        }
        return x.toString();
    }

    /** Requete d'information produit (50 lignes au plus : les suivantes sont refusees, pas tronquees en silence). */
    public static String reqInfoProduit(String version, Partenaires p, String reference, List<Ligne> lignes) {
        if (lignes == null || lignes.isEmpty() || lignes.size() > MAX_LIGNES) {
            throw new IllegalArgumentException("Entre 1 et " + MAX_LIGNES + " lignes par requête");
        }
        StringBuilder c = new StringBuilder("        <REQ_INFO_PRODUIT Ref_Req_Info_Produit=\"").append(esc(reference))
                .append("\">\n          <NORMALE>\n");
        int i = 1;
        for (Ligne l : lignes) {
            c.append("            <LIGNE_REQ_INFO_PRODUIT Num_Ligne=\"").append(pad4(i++))
                    .append("\" Type_Codification=\"").append(l.typeCodification).append("\" Code_Produit=\"")
                    .append(esc(l.code)).append("\" Designation=\"").append(esc(tronque(l.designation, 50)))
                    .append("\" Quantite=\"").append(pad4(l.quantite)).append("\"/>\n");
        }
        c.append("          </NORMALE>\n        </REQ_INFO_PRODUIT>\n");
        return enveloppe(version(version), p, reference, c.toString());
    }

    /** Commande en version 3.0.0.0 (memes lignes et memes options que l'envoi 1.0.0.0 existant). */
    public static String commandeV3(Partenaires p, String reference, String refCdeClient, String commentaire,
            String dateLivraison, List<Ligne> lignes) {
        return commande(V3, p, reference, refCdeClient, commentaire, dateLivraison, lignes);
    }

    /**
     * Commande dans l'enveloppe de la version : CSRP 1.0.0.0 ou SRP 3.0.0.0, sur le modele des echanges reels (espace
     * de noms du message declare sur MESSAGE_OFFICINE, sans prefixe). Designation omise si inconnue (le schema l'impose
     * non vide quand elle est presente).
     */
    public static String commande(String version, Partenaires p, String reference, String refCdeClient,
            String commentaire, String dateLivraison, List<Ligne> lignes) {
        StringBuilder c = new StringBuilder("        <COMMANDE Ref_Cde_Client=\"").append(esc(refCdeClient))
                .append("\" Commentaire_General=\"").append(esc(tronque(commentaire, 255)))
                .append("\" Date_livraison=\"").append(esc(dateLivraison)).append("\">\n          <NORMALE>\n");
        int i = 1;
        for (Ligne l : lignes) {
            c.append("            <LIGNE_N Num_Ligne=\"").append(pad4(i++)).append("\" Type_Codification=\"")
                    .append(l.typeCodification).append("\" Code_Produit=\"").append(esc(l.code))
                    .append("\" Quantite=\"").append(pad4(l.quantite)).append("\"");
            String d = tronque(l.designation == null ? "" : l.designation.trim(), 50);
            if (!d.isEmpty()) {
                c.append(" Designation=\"").append(esc(d)).append("\"");
            }
            c.append(" Equivalent=\"false\" Partielle=\"false\" Reliquat=\"false\"/>\n");
        }
        c.append("          </NORMALE>\n        </COMMANDE>\n");
        return enveloppe(V1.equals(version) ? V1 : V3, p, reference, c.toString());
    }

    /**
     * Message de cinematique (specification v4.8 § 4.1) : demande de VIDAGE du depot ou ACQUITTEMENT d'un message recu,
     * Nature_Action REQ_RECEPTION (ou REQ_EMISSION pour acquitter une reponse immediate), EN_REPONSE_A si renseigne.
     */
    public static String action(String version, Partenaires p, String reference, String natureAction, String enReponseA,
            String action) {
        boolean v1 = V1.equals(version);
        StringBuilder x = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        if (v1) {
            x.append("<CSRP_ENVELOPPE xmlns=\"").append(NS_V1_ENV).append("\" Nature_Action=\"").append(natureAction)
                    .append("\" Version_Protocole=\"").append(V1)
                    .append("\" Id_Logiciel=\"Prestige\" Version_Logiciel=\"").append(VERSION_MOTEUR)
                    .append("\" Usage=\"P\">\n  <ENTETE>\n    <EMETTEUR Nature=\"OF\" Code=\"")
                    .append(esc(p.codeOfficine)).append("\" Id=\"").append(esc(p.idOfficine)).append("\" Adresse=\"")
                    .append(esc(p.nomOfficine)).append("\"/>\n    <RECEPTEUR Nature=\"RE\" Code=\"")
                    .append(esc(p.codeRepartiteur)).append("\" Id=\"").append(esc(p.idRepartiteur))
                    .append("\" Adresse=\"").append(esc(p.nomRepartiteur)).append("\"/>\n");
        } else {
            x.append("<SRP_ENVELOPPE xmlns=\"").append(NS_V3_ENV).append("\" Nature_Action=\"").append(natureAction)
                    .append("\" Version_Protocole=\"").append(V3).append("\" Id_Moteur=\"").append(ID_MOTEUR)
                    .append("\" Version_Moteur=\"").append(VERSION_MOTEUR)
                    .append("\" Usage=\"P\">\n  <ENTETE>\n    <EMETTEUR Nature=\"OF\" Code=\"")
                    .append(esc(p.codeOfficine)).append("\" Id_Officine=\"").append(esc(p.idOfficine))
                    .append("\" Adresse=\"").append(esc(p.nomOfficine))
                    .append("\"/>\n    <RECEPTEUR Nature=\"RE\" Code=\"").append(esc(p.codeRepartiteur))
                    .append("\" Id_Repartiteur=\"").append(esc(p.idRepartiteur)).append("\" Adresse=\"")
                    .append(esc(p.nomRepartiteur)).append("\"/>\n");
        }
        x.append("    <REF_MESSAGE>").append(esc(reference)).append("</REF_MESSAGE>\n");
        if (enReponseA != null && !enReponseA.isEmpty()) {
            x.append("    <EN_REPONSE_A>").append(esc(enReponseA)).append("</EN_REPONSE_A>\n");
        }
        x.append("    <DATE>").append(esc(p.date)).append("</DATE>\n  </ENTETE>\n  <CORPS>\n    <ACTION>")
                .append(esc(action)).append("</ACTION>\n  </CORPS>\n</").append(v1 ? "CSRP_ENVELOPPE" : "SRP_ENVELOPPE")
                .append(">\n");
        return x.toString();
    }

    /** Ce que dit l'enveloppe d'une reponse : nature, references, action de cinematique, presence d'une reponse. */
    public static final class Enveloppe {
        public String natureAction = "", refMessage = "", enReponseA = "", action = "";
        public boolean repCommande, erreur;
    }

    public static Enveloppe lireEnveloppe(String xml) {
        Enveloppe e = new Enveloppe();
        if (xml == null || xml.trim().isEmpty()) {
            return e;
        }
        try {
            Document d = lireXml(xml);
            Element racine = d.getDocumentElement();
            e.natureAction = racine.getAttribute("Nature_Action");
            for (Element x : descendants(racine)) {
                String n = nom(x);
                Node parent = x.getParentNode();
                boolean enteteEnveloppe = parent instanceof Element && "ENTETE".equals(nom(parent))
                        && parent.getParentNode() == racine;
                if (enteteEnveloppe && "REF_MESSAGE".equals(n)) {
                    e.refMessage = x.getTextContent().trim();
                } else if (enteteEnveloppe && "EN_REPONSE_A".equals(n)) {
                    e.enReponseA = x.getTextContent().trim();
                } else if ("ACTION".equals(n)) {
                    e.action = x.getTextContent().trim().toUpperCase(Locale.ROOT);
                } else if ("REP_COMMANDE".equals(n)) {
                    e.repCommande = true;
                } else if ("ERREUR".equals(n)) {
                    e.erreur = true;
                }
            }
        } catch (Exception ex) {
            /* illisible : enveloppe vide */
        }
        return e;
    }

    /**
     * Reponse 3.0.0.0 ramenee aux espaces de noms 1.0.0.0 : le traitement de la reponse de commande existant (classes
     * JAXB du protocole 1) la lit alors telle quelle. Les attributs propres a la V3 sont ignores par JAXB.
     */
    public static String reponseV3VersV1(String xml) {
        if (xml == null) {
            return null;
        }
        return xml.replace(NS_V3_ENV, NS_V1_ENV).replace(NS_V3_MSG, NS_V1_MSG)
                .replace("SRP_ENVELOPPE", "CSRP_ENVELOPPE").replace("CCSRP_ENVELOPPE", "CSRP_ENVELOPPE");
    }

    /** Une ligne de reponse d'information produit. */
    public static class Disponibilite {

        public int numLigne;
        public String code = "", statut = "INCONNU", codeReponse = "", libelle = "", dateDispo = "", commentaire = "",
                remplacantCode = "", remplacantNom = "";
        public Integer quantiteDispo, prix;
    }

    /** Parseur sur, sans DTD ni entite externe. */
    static Document lireXml(String xml) throws Exception {
        DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
        f.setNamespaceAware(true);
        f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        f.setFeature("http://xml.org/sax/features/external-general-entities", false);
        f.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        f.setXIncludeAware(false);
        f.setExpandEntityReferences(false);
        f.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        f.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        DocumentBuilder b = f.newDocumentBuilder();
        return b.parse(new InputSource(new StringReader(xml)));
    }

    private static String nom(Node n) {
        String l = n.getLocalName();
        return (l == null ? n.getNodeName() : l).toUpperCase(Locale.ROOT);
    }

    private static List<Element> descendants(Element e) {
        List<Element> r = new ArrayList<>();
        NodeList nl = e.getElementsByTagName("*");
        for (int i = 0; i < nl.getLength(); i++) {
            r.add((Element) nl.item(i));
        }
        return r;
    }

    /** Premier attribut (de l'element puis de ses descendants) dont le nom satisfait le critere. */
    private static String attribut(Element e, Predicate<String> critere) {
        List<Element> tous = new ArrayList<>();
        tous.add(e);
        tous.addAll(descendants(e));
        for (Element x : tous) {
            NamedNodeMap at = x.getAttributes();
            for (int i = 0; i < at.getLength(); i++) {
                Attr a = (Attr) at.item(i);
                if (critere.test(nom(a)) && a.getValue() != null && !a.getValue().trim().isEmpty()) {
                    return a.getValue().trim();
                }
            }
        }
        return "";
    }

    private static Integer entier(String s) {
        try {
            return s == null || s.isEmpty() ? null : (int) Math.round(Double.parseDouble(s.replace(',', '.')));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    static String normaliser(String v) {
        String x = v == null ? "" : v.trim().toUpperCase(Locale.ROOT);
        if (x.isEmpty()) {
            return "";
        }
        if (x.startsWith("O") || x.equals("TRUE") || x.equals("1") || x.startsWith("DISPO") || x.equals("Y")
                || x.equals("YES")) {
            return "OUI";
        }
        if (x.startsWith("N") || x.equals("FALSE") || x.equals("0") || x.startsWith("INDISPO")) {
            return "NON";
        }
        return "AUTRE";
    }

    /**
     * Erreur renvoyee par le grossiste (element ERREUR, quelle que soit la version de l'enveloppe) : son texte
     * (Description_libre, sinon contenu), ou null s'il n'y en a pas. Ex. DPCI en 3.0.0.0 : « CSRP enveloppe invalide ».
     */
    public static String erreurReponse(String xml) {
        if (xml == null || !xml.toUpperCase(Locale.ROOT).contains("ERREUR")) {
            return null;
        }
        try {
            Document d = lireXml(xml);
            List<Element> tous = descendants(d.getDocumentElement());
            tous.add(0, d.getDocumentElement());
            for (Element e : tous) {
                if ("ERREUR".equals(nom(e))) {
                    /* selon le repartiteur : Description_libre, ou Statut + Detail (DPCI), ou le texte */
                    String t = e.getAttribute("Description_libre");
                    if (t == null || t.trim().isEmpty()) {
                        t = e.getAttribute("Detail");
                    }
                    if (t == null || t.trim().isEmpty()) {
                        t = e.getTextContent();
                    }
                    String statut = e.getAttribute("Statut");
                    if (statut != null && !statut.trim().isEmpty()) {
                        t = "statut " + statut.trim() + " : " + (t == null ? "" : t);
                    }
                    t = t == null ? "" : t.replaceAll("\\s+", " ").trim();
                    return t.isEmpty() ? "erreur sans description" : (t.length() > 300 ? t.substring(0, 300) + "…" : t);
                }
            }
        } catch (Exception e) {
            return null; /* illisible : traite plus loin comme reponse non exploitable */
        }
        return null;
    }

    /** Le grossiste reclame ou rejette l'element de controle Content-PharmaML (calcul avec la cle). */
    public static boolean erreurControle(String erreur) {
        return erreur != null && erreur.toUpperCase(Locale.ROOT).contains("CONTENT-PHARMAML");
    }

    /** Le grossiste rejette l'enveloppe 3.0.0.0 (il attend une enveloppe CSRP 1.0.0.0). */
    public static boolean enveloppeV1Attendue(String erreur) {
        String e = erreur == null ? "" : erreur.toUpperCase(Locale.ROOT);
        return e.contains("CSRP_ENVELOPPE") || (e.contains("CSRP") && e.contains("ENVELOPPE"));
    }

    /** Lecture tolerante de la reponse d'information produit : une entree par ligne lue. */
    public static List<Disponibilite> lireReponseInfoProduit(String xml) throws Exception {
        List<Disponibilite> sortie = new ArrayList<>();
        Document d = lireXml(xml);
        for (Element e : descendants(d.getDocumentElement())) {
            String n = nom(e);
            if (!n.startsWith("LIGNE") || !e.hasAttribute("Code_Produit")) {
                continue;
            }
            /* Seules les lignes d'une reponse d'information produit (pas une ligne de produit remplacant). */
            Node parent = e.getParentNode();
            boolean dansInfo = false;
            while (parent instanceof Element) {
                if (nom(parent).contains("INFO_PRODUIT")) {
                    dansInfo = true;
                    break;
                }
                parent = parent.getParentNode();
            }
            if (!dansInfo) {
                continue;
            }
            Disponibilite r = new Disponibilite();
            r.code = e.getAttribute("Code_Produit").trim();
            Integer num = entier(attribut(e, a -> a.startsWith("NUM_LIGNE")));
            r.numLigne = num == null ? 0 : num;
            String explicite = "";
            for (String a : new String[] { "Disponibilite", "Disponibilité", "Disponible", "Dispo" }) {
                if (e.hasAttribute(a)) {
                    explicite = normaliser(e.getAttribute(a));
                }
            }
            boolean indispo = false, autre = false;
            for (Element x : descendants(e)) {
                String nx = nom(x);
                if (nx.startsWith("INDISPONIBILITE")) {
                    indispo = true;
                } else if (nx.startsWith("AUTRE")) {
                    autre = true;
                } else if (nx.equals("DISPONIBILITE") && explicite.isEmpty()) {
                    explicite = normaliser(x.getTextContent());
                }
            }
            r.statut = !explicite.isEmpty() ? explicite : (indispo ? "NON" : (autre ? "AUTRE" : "OUI"));
            r.codeReponse = attribut(e, a -> a.equals("CODE_REPONSE"));
            r.libelle = attribut(e, a -> a.equals("ADDITIF") || a.equals("LIBELLE_REPONSE"));
            r.commentaire = attribut(e, a -> a.equals("COMMENTAIRE"));
            r.dateDispo = attribut(e, a -> a.startsWith("DATE_MISE") || a.equals("DATE_DISPONIBILITE"));
            r.quantiteDispo = entier(attribut(e, a -> a.startsWith("QUANTITE_DISPO") || a.startsWith("QUANTITE_MISE")));
            for (Element x : descendants(e)) {
                String nx = nom(x);
                if (nx.startsWith("PRODUIT_REMPLACANT") || nx.startsWith("PRODUIT_EQUIVALENT")) {
                    r.remplacantCode = x.getAttribute("Code_Produit");
                    r.remplacantNom = x.getAttribute("Designation");
                } else if (nx.startsWith("PRIX") && r.prix == null) {
                    r.prix = entier(x.getAttribute("Valeur"));
                }
            }
            sortie.add(r);
        }
        return sortie;
    }
}
