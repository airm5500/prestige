/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.filesmanagers.FilesType;

import java.io.File;
import java.util.Iterator;
import java.util.List;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import org.jdom.Element;
import org.jdom.input.SAXBuilder;

import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import toolkits.security.Cryptages;
import toolkits.utils.jdom;
import toolkits.utils.logger;

/**
 *
 * @author User
 */
public class XmlFiles extends files {

    DocumentBuilderFactory docFactory = null;
    DocumentBuilder docBuilder = null;
    Document doc = null;
    Node key_of_document_node = null;
    NodeList list_NodeList = null;
    org.jdom.Document document;
    Element racine;

    public XmlFiles(String key_of_document) {
        try {
            this.setXtention(".xml");
            this.setPath_input(jdom.path_of_config);
            this.setPath_outut(jdom.path_of_config);
            docFactory = DocumentBuilderFactory.newInstance();
            docBuilder = docFactory.newDocumentBuilder();
            doc = docBuilder.parse(this.getPath_input());
            key_of_document_node = doc.getElementsByTagName(key_of_document).item(0);
            list_NodeList = key_of_document_node.getChildNodes();
        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.error(e.getMessage());
        }
    }

    public XmlFiles(String key_of_document, String path) {
        try {
            this.setXtention(".xml");
            this.setPath_input(path);
            this.setPath_outut(path);
            docFactory = DocumentBuilderFactory.newInstance();
            docBuilder = docFactory.newDocumentBuilder();
            doc = docBuilder.parse(this.getPath_input());
            key_of_document_node = doc.getElementsByTagName(key_of_document).item(0);
            list_NodeList = key_of_document_node.getChildNodes();
        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.error(e.getMessage());
        }
    }

    public void updateFiled(String Key, String Ovalue) {

        for (int i = 0; i < list_NodeList.getLength(); i++) {
            Node node = list_NodeList.item(i);

            if (Key.equals(node.getNodeName())) {

                node.setTextContent(Ovalue);
                new logger().OCategory.info(Ovalue);
                return;
            }
        }

    }
/*
    public void LoadRessource(String key_of_document) {
        Cryptages ocryptage = new Cryptages();
        List listars = racine.getChildren(key_of_document);
        Iterator i = listars.iterator();
        while (i.hasNext()) {
            Element courant = (Element) i.next();
            jdom.path_file_generate_absolute_imported = ocryptage.decryptage(courant.getChild("path_file_generate_absolute_imported").getText());
            jdom.path_file_generate_relatif_imported = ocryptage.decryptage(courant.getChild("path_file_generate_relatif_imported").getText());
            jdom.path_file_generate_absolute = ocryptage.decryptage(courant.getChild("path_file_generate_absolute").getText());
        }
    }

    public void InitRessource(String path_of_config) {
        SAXBuilder sxb = new SAXBuilder();
        try {
            document = sxb.build(new File(path_of_config));
            racine = document.getRootElement();
            return;
        } catch (Exception e) {
        }
        System.err.println("PAS DE FICHIER DE CONFIG");
    }
*/
    public String FindField(String Key) {
        for (int i = 0; i < list_NodeList.getLength(); i++) {
            Node node = list_NodeList.item(i);
            if (Key.equals(node.getNodeName())) {
                return node.getTextContent();
            }
        }
        return null;
    }

    public void commit() {
        try {

            TransformerFactory transformerFactory = TransformerFactory.newInstance();
            Transformer transformer = transformerFactory.newTransformer();
            DOMSource source = new DOMSource(doc);
            StreamResult result = new StreamResult(new File(this.getPath_outut()));
            transformer.transform(source, result);

        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.info(e.getMessage());
        }
    }
}
