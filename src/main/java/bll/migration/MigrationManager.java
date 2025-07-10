/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.migration;

import bll.commandeManagement.orderManagement;
import bll.common.Parameter;
import bll.configManagement.FabricantManagement;
import bll.configManagement.clientManagement;
import bll.configManagement.familleManagement;
import bll.configManagement.grossisteManagement;
import bll.preenregistrement.Preenregistrement;
import bll.stockManagement.DepotManager;
import bll.tierspayantManagement.tierspayantManagement;
import dal.TUser;
import dal.dataManager;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.List;
import org.apache.poi.hssf.usermodel.HSSFRow;
import org.apache.poi.hssf.usermodel.HSSFSheet;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import toolkits.filesmanagers.FilesType.CsvFiles;
import toolkits.filesmanagers.FilesType.CsvFiles_with_Opencvs;
import toolkits.filesmanagers.FilesType.XlsFiles_with_POI;
import toolkits.parameters.commonparameter;
import toolkits.utils.jdom;
import toolkits.utils.logger;

/**
 *
 * @author user
 */
public class MigrationManager extends bll.bllBase {

    public MigrationManager(dataManager OdataManager, TUser OTuser) {
        this.setOTUser(OTuser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    // importation de données
    public boolean ImportDataToDataBase(String table_name, String filename, String extension,
            String str_TYPE_TRANSACTION) {
        boolean result = false;
        List<String> lstString = new ArrayList<>();
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager(), this.getOTUser());
        tierspayantManagement OtierspayantManagement = new tierspayantManagement(this.getOdataManager(),
                this.getOTUser());
        clientManagement OclientManagement = new clientManagement(this.getOdataManager(), this.getOTUser());
        DepotManager ODepotManager = new DepotManager(this.getOdataManager(), this.getOTUser());
        String Message = "", DetailMessage = "";
        try {
            List listexcel;
            XlsFiles_with_POI OXlsFiles_with_POI = new XlsFiles_with_POI(filename);
            CsvFiles_with_Opencvs O = new CsvFiles_with_Opencvs();
            if (extension.equalsIgnoreCase(".xls")) {
                listexcel = OXlsFiles_with_POI.LoadDataToFiles_with_POI();
                lstString = OXlsFiles_with_POI.getAndInsertDataForFileExtract_with_POI(listexcel);
            } else if (extension.equalsIgnoreCase(".xlsx")) {
                listexcel = OXlsFiles_with_POI.LoadDataToFiles2_with_POI();
                lstString = OXlsFiles_with_POI.getAndInsertDataForFileExtract_with_POI(listexcel);
            } else if (extension.equalsIgnoreCase(".csv")) {
                lstString = O.LoadDataWithPointVirgule(filename, ';');
            }
            new logger().OCategory.info("lstString" + lstString.size());
            if (table_name.equalsIgnoreCase(Parameter.TABLE_FAMILLE)) {
                if (!str_TYPE_TRANSACTION.equalsIgnoreCase(commonparameter.TYPE_IMPORTATION_UPDATEDATA)) {
                    OfamilleManagement.createMasseFamille(lstString, str_TYPE_TRANSACTION);
                } else {
                    OfamilleManagement.updateMasseFamille(lstString);
                }

                Message = OfamilleManagement.getMessage();
                DetailMessage = OfamilleManagement.getDetailmessage();
            } else if (table_name.equalsIgnoreCase(Parameter.TABLE_ZONE_GEOGRAPHIQUE)) {
                OfamilleManagement.createMasseTZoneGeographique(lstString);
                Message = OfamilleManagement.getMessage();
                DetailMessage = OfamilleManagement.getDetailmessage();
            } else if (table_name.equalsIgnoreCase(Parameter.TABLE_TIERS_PAYANTS)) {
                OtierspayantManagement.createMasseTierspayant(lstString);
                Message = OtierspayantManagement.getMessage();
                DetailMessage = OtierspayantManagement.getDetailmessage();
            } else if (table_name.equalsIgnoreCase(Parameter.TABLE_CLIENT)) {
                OclientManagement.createMasseClient(lstString);
                Message = OclientManagement.getMessage();
                DetailMessage = OclientManagement.getDetailmessage();
            } else if (table_name.equalsIgnoreCase(Parameter.TABLE_ORDER_DEPOT)) {
                ODepotManager.CreatePreVenteByImport(lstString, str_TYPE_TRANSACTION);
                Message = ODepotManager.getMessage();
                DetailMessage = ODepotManager.getDetailmessage();
            } else if (table_name.equalsIgnoreCase(Parameter.TABLE_RETOURDEPOT)) {
                ODepotManager.CreateRetourDepotInOfficineByImport(lstString, str_TYPE_TRANSACTION);
                Message = ODepotManager.getMessage();
                DetailMessage = ODepotManager.getDetailmessage();
            } else if (table_name.equalsIgnoreCase(Parameter.TABLE_MISEAJOUR_STOCKDEPOT)) {
                ODepotManager.updateStockdepotFromOfficineByImport(lstString, this.getOTUser().getLgEMPLACEMENTID());
                Message = ODepotManager.getMessage();
                DetailMessage = ODepotManager.getDetailmessage();
            }

            this.setMessage(Message);
            this.setDetailmessage(DetailMessage);
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'importation du fichier");
        }
        return result;
    }
    // fin importation de données

    // exportation de donnéess
    public String ExportDataFromDataBase(String table_name, String extension, String liste_param) {
        String FILEPATH = "";
        String str_file_name = "";
        new logger().OCategory.info("table_name:" + table_name + "|extension:" + extension);
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager(), this.getOTUser());
        DepotManager ODepotManager = new DepotManager(this.getOdataManager(), this.getOTUser());
        tierspayantManagement OtierspayantManagement = new tierspayantManagement(this.getOdataManager(),
                this.getOTUser());
        clientManagement OclientManagement = new clientManagement(this.getOdataManager(), this.getOTUser());
        grossisteManagement OgrossisteManagement = new grossisteManagement(this.getOdataManager());
        FabricantManagement OFabricantManagement = new FabricantManagement(this.getOdataManager());
        Preenregistrement OPreenregistrement = new Preenregistrement(this.getOdataManager(), this.getOTUser());
        if (table_name.equalsIgnoreCase(Parameter.TABLE_FAMILLE)) {
            str_file_name = "ARTICLE";
            FILEPATH = this.ExportDataFromDataBase(OfamilleManagement.generateEnteteForFile(),
                    OfamilleManagement.generateDataToExport(liste_param), str_file_name, extension,
                    "LISTE DES ARTICLES");
        } else if (table_name.equalsIgnoreCase(Parameter.TABLE_ZONE_GEOGRAPHIQUE)) {
            str_file_name = "ZONE_GEOGRAPHIQUE";
            FILEPATH = this.ExportDataFromDataBase(OfamilleManagement.generateEnteteForFileZoneGeographie(),
                    OfamilleManagement.generateDataToExportZoneGeographique(), str_file_name, extension,
                    "LISTE DES EMPLACEMENTS");
        } else if (table_name.equalsIgnoreCase(Parameter.TABLE_TIERS_PAYANTS)) {
            str_file_name = "TABLE_TIERS_PAYANTS";
            FILEPATH = this.ExportDataFromDataBase(OtierspayantManagement.generateEnteteForFile(),
                    OtierspayantManagement.generateDataToExport(), str_file_name, extension, "LISTE DES ORGANISMES");
        } else if (table_name.equalsIgnoreCase(Parameter.TABLE_CLIENT)) {
            str_file_name = "TABLE_CLIENT";
            FILEPATH = this.ExportDataFromDataBase(OclientManagement.generateEnteteForFile(),
                    OclientManagement.generateDataToExport(), str_file_name, extension, "LISTE DES CLIENTS");
        } else if (table_name.equalsIgnoreCase(Parameter.TABLE_GROSSISTE)) {
            str_file_name = "TABLE_GROSSISTE";
            FILEPATH = this.ExportDataFromDataBase(OgrossisteManagement.generateEnteteForFile(),
                    OgrossisteManagement.generateDataToExport(), str_file_name, extension, "LISTE DES GROSSISTES");
        } else if (table_name.equalsIgnoreCase(Parameter.TABLE_FABRIQUANT)) {
            str_file_name = "TABLE_FABRIQUANT";
            FILEPATH = this.ExportDataFromDataBase(OFabricantManagement.generateEnteteForFile(),
                    OFabricantManagement.generateDataToExport(), str_file_name, extension, "LISTE DES FABRIQUANTS");
        } else if (table_name.equalsIgnoreCase(Parameter.TABLE_ORDER_DEPOT)) {
            str_file_name = "TABLE_ORDER_DEPOT";
            FILEPATH = this.ExportDataFromDataBase(OfamilleManagement.generateEnteteForFileFromDepot(),
                    OfamilleManagement.generateDataToExportFromDepot(liste_param), str_file_name, extension,
                    "LISTE DES ARTICLES VENDUS");
        } else if (table_name.equalsIgnoreCase(Parameter.TABLE_RETOURDEPOT)) {
            str_file_name = "TABLE_RETOURDEPOT";
            FILEPATH = this.ExportDataFromDataBase(ODepotManager.generateEnteteForFileRetourDepot(),
                    ODepotManager.generateDataToExportRetourDepot(liste_param), str_file_name, extension,
                    "RETOUR DE PRODUIT DEPÔT");
        } else if (table_name.equalsIgnoreCase(Parameter.TABLE_MISEAJOUR_STOCKDEPOT)) {
            str_file_name = "TABLE_MISEAJOUR_STOCKDEPOT";
            FILEPATH = this.ExportDataFromDataBase(OPreenregistrement.generateEnteteForFileProductUpdateStockdepot(),
                    OPreenregistrement.generateDataToExportProductUpdateStockdepot(liste_param), str_file_name,
                    extension, "LISTE DES PRODUITS VENDUS AU DEPÔT");
        }
        return FILEPATH;
    }

    public String ExportDataFromDataBase(String str_entete, List<String> lstData, String str_file_name,
            String str_extension_name, String title) {
        String FILEPATH = "";
        if (str_extension_name.equalsIgnoreCase(commonparameter.type_xls)
                || str_extension_name.equalsIgnoreCase(commonparameter.type_xlsx)) {
            // FILEPATH = this.ExportToExcelFileXLS(str_entete, lstData, str_file_name, title); // a decommenter en cas
            // de probleme 19/11/2016
            FILEPATH = this.ExportToExcelFileXLS(str_entete, lstData, jdom.Path_export + str_file_name, title,
                    "." + str_extension_name);
        } else if (str_extension_name.equalsIgnoreCase(commonparameter.type_csv)
                || str_extension_name.equalsIgnoreCase(commonparameter.type_txt)) {

            FILEPATH = this.ExportToCSVOrTXT(lstData, str_file_name, str_extension_name);
        }

        return FILEPATH;
    }

    public String ExportToExcelFileXLS(String str_entete, List<String> lstData, String str_file_name, String title,
            String extension) {

        // String str_NAMEFILE = "";
        String filepath = "";
        String[] tabData, tabEntete;
        jdom.InitRessource();
        jdom.LoadRessource();
        try {

            // str_NAMEFILE = str_file_name + extension;
            filepath = str_file_name + extension;

            HSSFWorkbook hwb = new HSSFWorkbook();
            HSSFSheet sheet = hwb.createSheet();

            sheet.setDefaultRowHeight((short) 400); // la hauteur par defaut des cellules
            sheet.setDefaultColumnWidth((short) 35); // la largeur par defaut des cellules

            Row rowhead = sheet.createRow((short) 0);

            // gestion des styles du fichier
            Font font = hwb.createFont();
            font.setFontHeightInPoints((short) 12);
            font.setFontName("Courier New");

            CellStyle header = hwb.createCellStyle();
            CellStyle style = hwb.createCellStyle();
            style.setFont(font);
            style.setAlignment(CellStyle.ALIGN_LEFT);

            // fin gestion des styles du fichier
            // un autre style pour les entetes
            Font headerfont = hwb.createFont();
            headerfont.setFontHeightInPoints((short) 12);
            headerfont.setFontName("Courier New");
            headerfont.setColor(IndexedColors.WHITE.getIndex());
            header.setFont(headerfont);
            header.setFillForegroundColor(IndexedColors.GREY_50_PERCENT.getIndex());

            header.setBorderLeft(CellStyle.BORDER_THIN);
            header.setLeftBorderColor(IndexedColors.GREY_80_PERCENT.getIndex());
            header.setBorderRight(CellStyle.BORDER_THIN);
            header.setRightBorderColor(IndexedColors.GREY_80_PERCENT.getIndex());
            header.setFillPattern(CellStyle.SOLID_FOREGROUND);
            header.setAlignment(CellStyle.ALIGN_LEFT);

            // fin du style de l'entete
            Cell cellule;
            if (!str_entete.equals("")) {
                tabEntete = str_entete.split(";");
                for (int i = 0; i < tabEntete.length; i++) {
                    cellule = rowhead.createCell((short) i);
                    cellule.setCellValue(tabEntete[i]);
                    cellule.setCellStyle(header);
                }
            }

            for (int j = 0; j < lstData.size(); j++) {
                tabData = lstData.get(j).split(";");
                HSSFRow row = sheet.createRow((short) j + 1);
                for (int k = 0; k < tabData.length; k++) {
                    row.createCell((short) k).setCellValue(tabData[k]);
                }
            }

            FileOutputStream fileOut = new FileOutputStream(filepath);
            hwb.write(fileOut);
            fileOut.close();
            System.out.println("Fichier genere avec succès! Chemin  " + filepath);

        } catch (Exception ex) {
            System.out.println(ex);
        }

        return filepath;

    }

    // fin exportation en excel
    // exportation en csv
    public String ExportToCSVOrTXT(List<String> lstData, String str_file_name, String str_extension_name) {
        jdom.InitRessource();
        jdom.LoadRessource();
        try {
            new logger().OCategory.info("lstData taille " + lstData.size());

            str_file_name = jdom.Path_export + str_file_name + "." + str_extension_name;
            CsvFiles OCsvFiles = new CsvFiles();
            OCsvFiles.setPath_outut(str_file_name);
            OCsvFiles.SaveToFile(lstData);

            System.out.println("Fichier " + str_extension_name + " généré avec succès! Chemin  " + str_file_name);
            return str_file_name;
        } catch (Exception e) {
            e.printStackTrace();
            return "";
        }

    }
    // fin exportation en csv

    // fin exportation de données
    // generation de la liste des produits du fichier de la pharmacie qui n'existe pas dans la BD
    public String CheckDataToDataBase(String table_name, String filename, String extension, String format) {

        List<String> lstString = new ArrayList<>();
        List<String> lstStringFinal = new ArrayList<>();
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager(), this.getOTUser());
        tierspayantManagement OtierspayantManagement = new tierspayantManagement(this.getOdataManager(),
                this.getOTUser());
        String FILEPATH = "";

        try {
            List listexcel;
            XlsFiles_with_POI OXlsFiles_with_POI = new XlsFiles_with_POI(filename + extension);
            CsvFiles_with_Opencvs O = new CsvFiles_with_Opencvs();
            if (extension.equalsIgnoreCase(".xls")) {
                listexcel = OXlsFiles_with_POI.LoadDataToFiles_with_POI();
                lstString = OXlsFiles_with_POI.getAndInsertDataForFileExtract_with_POI(listexcel);
            } else if (extension.equalsIgnoreCase(".xlsx")) {
                listexcel = OXlsFiles_with_POI.LoadDataToFiles2_with_POI();
                lstString = OXlsFiles_with_POI.getAndInsertDataForFileExtract_with_POI(listexcel);
            } else if (extension.equalsIgnoreCase(".csv")) {
                lstString = O.LoadDataWithPointVirgule(filename + extension, ';');
            }

            if (table_name.equalsIgnoreCase(Parameter.TABLE_FAMILLE)) {
                lstStringFinal = OfamilleManagement.checkImport(lstString);
                this.setMessage(OfamilleManagement.getMessage());
                this.setDetailmessage(OfamilleManagement.getDetailmessage());
            } else if (table_name.equalsIgnoreCase(Parameter.TABLE_TIERS_PAYANTS)) {
                lstStringFinal = OtierspayantManagement.checkImport(lstString);
                this.setMessage(OtierspayantManagement.getMessage());
                this.setDetailmessage(OtierspayantManagement.getDetailmessage());
            }
            if (table_name.equalsIgnoreCase(Parameter.TABLE_ORDER)) {
                orderManagement OorderManagement = new orderManagement(this.getOdataManager());
                lstStringFinal = OorderManagement.checkImport(lstString, format);
                this.setMessage(OorderManagement.getMessage());
                this.setDetailmessage(OorderManagement.getDetailmessage());
            }
            //// FILEPATH = this.ExportToCSVOrTXT(lstStringFinal, table_name, extension.substring(1,
            //// extension.length())); // a decommenter apres urgent
            new logger().OCategory.info("extension fichier final:" + extension.substring(1, extension.length()));
            if (extension.substring(1, extension.length()).equals(commonparameter.type_csv)
                    || extension.substring(1, extension.length()).equals(commonparameter.type_txt)) {
                FILEPATH = this.ExportToCSVOrTXT(lstStringFinal, table_name,
                        extension.substring(1, extension.length()));
            } else {
                FILEPATH = this.ExportToExcelFileXLS("", lstStringFinal, jdom.Path_export + table_name, "", extension);
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'importation du fichier");
        }
        return FILEPATH;
    }

    // fin generation de la liste des produits du fichier de la pharmacie qui n'existe pas dans la BD
}
