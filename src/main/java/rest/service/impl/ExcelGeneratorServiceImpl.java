package rest.service.impl;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import rest.service.ExcelGeneratorService;
import rest.service.dto.GenericExcelDTO;

/**
 *
 * @author koben
 */
@Stateless
public class ExcelGeneratorServiceImpl implements ExcelGeneratorService {

    private static final Logger LOG = Logger.getLogger(ExcelGeneratorServiceImpl.class.getName());

    @Override
    public byte[] generate(GenericExcelDTO genericExcel, String sheetName) throws IOException {
        try (Workbook workbook = new HSSFWorkbook()) {
            Sheet sheet = workbook.createSheet(sheetName);
            createHeaderRow(sheet, genericExcel);
            fillData(sheet, genericExcel.getData());

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);

            // HttpHeaders headers = new HttpHeaders();
            // headers.add("Content-Disposition", "attachment; filename=data.xlsx");
            return outputStream.toByteArray();
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "generate", e);
            throw e;
        }
    }

    private void createHeaderRow(Sheet sheet, GenericExcelDTO genericExcel) {
        Row headerRow = sheet.createRow(0);

        CellStyle headerStyle = sheet.getWorkbook().createCellStyle();
        Font font = sheet.getWorkbook().createFont();
        int index = 0;
        for (Integer w : genericExcel.getColumnWidths()) {
            sheet.setColumnWidth(index, w);
            index++;
        }

        font.setBold(true);
        headerStyle.setFont(font);
        List<String> columns = genericExcel.getColumns();
        for (int i = 0; i < columns.size(); i++) {

            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns.get(i));
            cell.setCellStyle(headerStyle);

        }
    }

    private void fillData(Sheet sheet, List<Object[]> data) {
        int rowNum = 1;
        for (Object[] rowData : data) {
            Row row = sheet.createRow(rowNum++);
            for (int i = 0; i < rowData.length; i++) {
                var rowIndexData = rowData[i];

                if (rowIndexData instanceof Integer) {
                    row.createCell(i).setCellType(CellType.NUMERIC);
                    row.createCell(i).setCellValue((int) rowData[i]);
                } else if (rowIndexData instanceof Long) {
                    row.createCell(i).setCellType(CellType.NUMERIC);
                    row.createCell(i).setCellValue((long) rowData[i]);
                } else if (rowIndexData instanceof BigDecimal) {
                    row.createCell(i).setCellType(CellType.NUMERIC);
                    row.createCell(i).setCellValue(new BigDecimal(rowData[i].toString()).longValue());
                } else if (rowIndexData instanceof Double) {
                    row.createCell(i).setCellType(CellType.NUMERIC);
                    row.createCell(i).setCellValue((double) rowData[i]);
                } else if (rowIndexData instanceof Short) {
                    row.createCell(i).setCellType(CellType.NUMERIC);
                    row.createCell(i).setCellValue((short) rowData[i]);
                } else if (rowIndexData instanceof Float) {
                    row.createCell(i).setCellType(CellType.NUMERIC);
                    row.createCell(i).setCellValue((float) rowData[i]);
                } else {
                    row.createCell(i).setCellValue(rowData[i].toString());
                }

            }
        }
    }
}
