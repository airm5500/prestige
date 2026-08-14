package rest.report;

import java.io.File;
import java.sql.Connection;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.naming.InitialContext;
import javax.sql.DataSource;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.design.JasperDesign;
import net.sf.jasperreports.engine.xml.JRXmlLoader;

/**
 * Generation des PDF de la gestion des reserves.
 *
 * <p>
 * La connexion provient du POOL DE L'APPLICATION, et non du fichier de configuration lu par {@code dal.JdbConnexion}.
 * Le rapport interroge ainsi rigoureusement la meme base que l'application : impossible qu'il lise une base differente
 * de celle ou les donnees viennent d'etre ecrites.
 *
 * <p>
 * Classe volontairement autonome : les rapports deja en place continuent d'emprunter leur chemin habituel, sans
 * modification ni risque.
 */
public final class ReserveReportBuilder {

    private static final Logger LOG = Logger.getLogger(ReserveReportBuilder.class.getName());

    /** Meme source de donnees que l'unite de persistance de l'application. */
    private static final String JNDI_DATASOURCE = "jdbc/__laborex_pool";

    private ReserveReportBuilder() {
    }

    /**
     * Compile le modele, l'alimente depuis le pool de l'application et ecrit le PDF.
     *
     * @param jrxmlPath
     *            chemin complet du modele .jrxml
     * @param pdfPath
     *            chemin complet du PDF a produire
     */
    public static void build(String jrxmlPath, String pdfPath, Map<String, Object> parameters) throws Exception {
        File modele = new File(jrxmlPath);
        if (!modele.exists()) {
            throw new IllegalStateException("Modele d'impression introuvable : " + jrxmlPath);
        }
        DataSource ds = (DataSource) new InitialContext().lookup(JNDI_DATASOURCE);
        JasperDesign design = JRXmlLoader.load(jrxmlPath);
        JasperReport report = JasperCompileManager.compileReport(design);
        try (Connection cx = ds.getConnection()) {
            JasperPrint print = JasperFillManager.fillReport(report, parameters, cx);
            JasperExportManager.exportReportToPdfFile(print, pdfPath);
        }
        LOG.log(Level.INFO, "PDF reserve genere : {0}", pdfPath);
    }

    /**
     * Compile le modele lu sur un flux, l'alimente depuis un datasource memoire (donnees non persistees, ex. rapport
     * d'importation du panier) et rend le PDF en memoire. Aucune connexion base : le rapport n'interroge rien.
     *
     * @param modele
     *            flux du modele .jrxml (fichier du dossier des modeles ou ressource embarquee)
     * @param parameters
     *            parametres du modele
     * @param dataSource
     *            lignes du rapport
     *
     * @return contenu du PDF
     */
    public static byte[] buildToBytes(java.io.InputStream modele, Map<String, Object> parameters,
            net.sf.jasperreports.engine.JRDataSource dataSource) throws Exception {
        JasperDesign design = JRXmlLoader.load(modele);
        JasperReport report = JasperCompileManager.compileReport(design);
        JasperPrint print = JasperFillManager.fillReport(report, parameters, dataSource);
        byte[] pdf = JasperExportManager.exportReportToPdf(print);
        LOG.log(Level.INFO, "PDF memoire genere : {0} octets", pdf.length);
        return pdf;
    }
}
