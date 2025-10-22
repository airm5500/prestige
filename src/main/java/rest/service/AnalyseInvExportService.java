
package rest.service;

import java.io.IOException;
import net.sf.jasperreports.engine.JRException;

/**
 *
 * @author airman
 */
public interface AnalyseInvExportService {

    byte[] generatePdfReport(String inventaireId, String filterType) throws JRException;

    byte[] generateExcelReport(String inventaireId, String filterType) throws IOException;

    byte[] generateAdvancedExcelReport(String inventaireId) throws IOException;

}