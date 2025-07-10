package rest.service;

/**
 *
 * @author koben
 */
import java.io.IOException;
import javax.ejb.Local;
import rest.service.dto.GenericExcelDTO;

@Local
public interface ExcelGeneratorService {

    byte[] generate(GenericExcelDTO genericExcel, String sheetName) throws IOException;
}
