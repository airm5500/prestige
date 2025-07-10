/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.printer;

import bll.bllBase;
import java.awt.print.PrinterJob;
import java.io.BufferedInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import javax.print.Doc;
import javax.print.DocFlavor;
import javax.print.DocPrintJob;
import javax.print.PrintService;
import javax.print.PrintServiceLookup;
import javax.print.SimpleDoc;
import javax.print.attribute.HashPrintRequestAttributeSet;
import javax.print.attribute.HashPrintServiceAttributeSet;
import javax.print.attribute.PrintRequestAttributeSet;
import javax.print.attribute.PrintServiceAttributeSet;
import javax.print.attribute.standard.Chromaticity;
import javax.print.attribute.standard.Copies;
import javax.print.attribute.standard.MediaSizeName;
import javax.print.attribute.standard.PrinterName;
import net.sf.jasperreports.engine.export.JRPrintServiceExporter;
import toolkits.Utils;
import toolkits.utils.logger;

/**
 *
 * @author Admin
 */
public class PrintManangement extends bllBase {

    public static PrinterJob findPrinterJob(String printerName) throws Exception {

        // Retrieve the Printer Service
        PrintService printService = PrintManangement.findPrintService(printerName);

        // Validate the Printer Service
        if (printService == null) {
            throw new IllegalStateException("Imprimante inconnue \"" + printerName + '"');
        }

        // Obtain a Printer Job instance.
        PrinterJob printerJob = PrinterJob.getPrinterJob();

        // Set the Print Service.
        printerJob.setPrintService(printService);

        // Return Print Job
        return printerJob;
    }

    public static PrintService findPrintService(String printerName) {

        // printerName = printerName.toLowerCase();

        PrintService service = null;

        // Get array of all print services
        PrintService[] services = PrinterJob.lookupPrintServices();

        // Retrieve a print service from the array
        for (int index = 0; service == null && index < services.length; index++) {
            if (services[index].getName().contains(printerName)) {
                service = services[index];
            }
        }

        // Return the print service
        return service;
    }
}
