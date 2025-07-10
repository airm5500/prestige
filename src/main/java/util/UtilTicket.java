/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package util;

import javax.print.DocFlavor;
import javax.print.PrintService;
import javax.print.PrintServiceLookup;

/**
 *
 * @author koben
 */
public final class UtilTicket {

    public static PrintService getPrintService(String printername) {

        // Initalize print service
        if (printername == null) {
            return PrintServiceLookup.lookupDefaultPrintService();
        } else {

            switch (printername) {
            case "(Show dialog)":
                return null; // null means "you have to show the print dialog"
            case "(Default)":
                return PrintServiceLookup.lookupDefaultPrintService();
            default:
                PrintService[] pservices = PrintServiceLookup.lookupPrintServices(DocFlavor.SERVICE_FORMATTED.PRINTABLE,
                        null);
                for (PrintService s : pservices) {
                    if (printername.equals(s.getName())) {
                        return s;
                    }
                }
                return PrintServiceLookup.lookupDefaultPrintService();
            }
        }
    }

    public static String[] getPrintNames() {
        PrintService[] pservices = PrintServiceLookup.lookupPrintServices(DocFlavor.SERVICE_FORMATTED.PRINTABLE, null);

        String printers[] = new String[pservices.length];
        for (int i = 0; i < pservices.length; i++) {
            printers[i] = pservices[i].getName();
        }

        return printers;
    }

    private UtilTicket() {
    }

}
