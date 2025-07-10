/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.printer;

import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.print.PageFormat;
import java.awt.print.Paper;
import java.awt.print.Printable;
import java.awt.print.PrinterException;
import java.awt.print.PrinterJob;
import java.io.BufferedInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Date;
import java.util.List;

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
import javax.swing.ImageIcon;

//import bll.bllBase;
import bll.bllBase;
import dal.TImprimante;
import dal.TOfficine;
import dal.TUser;
import dal.dataManager;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.jdom;
import toolkits.utils.logger;

/**
 *
 * @author Admin
 */
public class DriverPrinter extends bllBase implements Printable {

    private List<String> datas;
    private String name_code_bare, type_ticket, title, entete;
    private boolean CodeShow;
    private List<String> datasInfoTiersPayant;
    private List<String> datasInfoSeller;
    private List<String> dataCommentaires;
    private List<String> datasSubTotal;
    int limit = 0, int_BEGIN = 0, int_COLUMN1 = 0, int_COLUMN2 = 0, int_COLUMN3 = 0, int_COLUMN4 = 0, int_FONT = 0;
    Date dateOperation = null;

    public int getInt_FONT() {
        return int_FONT;
    }

    public void setInt_FONT(int int_FONT) {
        this.int_FONT = int_FONT;
    }

    public int getInt_BEGIN() {
        return int_BEGIN;
    }

    public void setInt_BEGIN(int int_BEGIN) {
        this.int_BEGIN = int_BEGIN;
    }

    public int getInt_COLUMN1() {
        return int_COLUMN1;
    }

    public void setInt_COLUMN1(int int_COLUMN1) {
        this.int_COLUMN1 = int_COLUMN1;
    }

    public int getInt_COLUMN2() {
        return int_COLUMN2;
    }

    public void setInt_COLUMN2(int int_COLUMN2) {
        this.int_COLUMN2 = int_COLUMN2;
    }

    public int getInt_COLUMN3() {
        return int_COLUMN3;
    }

    public void setInt_COLUMN3(int int_COLUMN3) {
        this.int_COLUMN3 = int_COLUMN3;
    }

    public int getInt_COLUMN4() {
        return int_COLUMN4;
    }

    public void setInt_COLUMN4(int int_COLUMN4) {
        this.int_COLUMN4 = int_COLUMN4;
    }

    public Date getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(Date dateOperation) {
        this.dateOperation = dateOperation;
    }

    public DriverPrinter() {
        jdom Ojdom = new jdom();
        Ojdom.InitRessource();
        Ojdom.LoadRessource();
    }

    public DriverPrinter(dataManager OdataManager, TUser OTuser) {
        this.setOTUser(OTuser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
        jdom Ojdom = new jdom();
        Ojdom.InitRessource();
        Ojdom.LoadRessource();

    }

    public String getType_ticket() {
        return type_ticket;
    }

    public void setType_ticket(String type_ticket) {
        this.type_ticket = type_ticket;
    }

    public List<String> getDatasInfoTiersPayant() {
        return datasInfoTiersPayant;
    }

    public void setDatasInfoTiersPayant(List<String> datasInfoTiersPayant) {
        this.datasInfoTiersPayant = datasInfoTiersPayant;
    }

    public List<String> getDataCommentaires() {
        return dataCommentaires;
    }

    public void setDataCommentaires(List<String> dataCommentaires) {
        this.dataCommentaires = dataCommentaires;
    }

    public String getEntete() {
        return entete;
    }

    public void setEntete(String entete) {
        this.entete = entete;
    }

    public List<String> getDatasInfoSeller() {
        return datasInfoSeller;
    }

    public void setDatasInfoSeller(List<String> datasInfoSeller) {
        this.datasInfoSeller = datasInfoSeller;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public List<String> getDatasSubTotal() {
        return datasSubTotal;
    }

    public void setDatasSubTotal(List<String> datasSubTotal) {
        this.datasSubTotal = datasSubTotal;
    }

    public boolean isCodeShow() {
        return CodeShow;
    }

    public void setCodeShow(boolean CodeShow) {
        this.CodeShow = CodeShow;
    }

    public String getName_code_bare() {
        return name_code_bare;
    }

    public void setName_code_bare(String name_code_bare) {
        this.name_code_bare = name_code_bare;
    }

    public List<String> getDatas() {
        return datas;
    }

    public void setDatas(List<String> datas) {
        this.datas = datas;
    }

    // fonction pour imprimer les tickets de vente
    public void PrintTicketVente(int int_NUMBER_COPY) {
        PrinterJob job = null;
        try {
            this.setCodeShow(true); // affiche code barre sur le ticket
            // Utils.setDefaultPrinter(printerName); a decommenter en cas de probleme. definition de l'imprimante par
            // defaut
            job = this.findPrinterJob().getPrinterJob();
            TImprimante OTImprimante = new PrinterManager(this.getOdataManager(), this.getOTUser())
                    .getTImprimanteByName(this.findPrintService().getName());
            if (OTImprimante != null) {
                int_BEGIN = OTImprimante.getIntBEGIN();
                int_COLUMN1 = OTImprimante.getIntCOLUMN1();
                int_COLUMN2 = OTImprimante.getIntCOLUMN2();
                int_COLUMN3 = OTImprimante.getIntCOLUMN3();
                int_COLUMN4 = OTImprimante.getIntCOLUMN4();
            }
            // definition des parametres de l'impression
            PrintRequestAttributeSet OPrintRequestAttributeSet = new HashPrintRequestAttributeSet();
            if (job != null) {
                PageFormat pageFormat = job.defaultPage();
                Paper paper = new Paper();
                new logger().OCategory.info("int_BEGIN:" + int_BEGIN);
                paper.setImageableArea(9 + int_BEGIN, -70, paper.getWidth(), paper.getHeight()); // definition des
                                                                                                 // marges de la feuille
                // paper.setImageableArea(20, -70, paper.getWidth(), paper.getHeight()); //definition des marges de la
                // feuille
                pageFormat.setPaper(paper);
                pageFormat.setOrientation(PageFormat.PORTRAIT); // orientation de la page

                OPrintRequestAttributeSet.add(new Copies(int_NUMBER_COPY)); // nombre de copie a imprimer
                OPrintRequestAttributeSet.add(Chromaticity.COLOR); // insiste sur la netteté de la couleur du texte

                job.setPrintable(this, pageFormat);
                try {

                    job.print(OPrintRequestAttributeSet);
                    this.buildSuccesTraceMessage("Opération valide");
                } catch (PrinterException e) {
                    e.printStackTrace();
                    this.buildErrorTraceMessage("Echec de l'impression");
                }
            }

            // fin definition des parametres de l'impression
        } catch (Exception ex) {
            ex.printStackTrace();
            new logger().OCategory.info("Echec de l'impression du ticket de vente");
            this.buildErrorTraceMessage("Echec de l'impression du ticket de caisse. Paramètre incorrect");
        }

    }
    // fin fonction pour imprimer les tickets de vente

    // fonction d'impression document A4
    public void doPrintSimpleByPrinterName(String printerName, int int_NUMBER_COPY, String name_file) {
        try {
            PrintRequestAttributeSet OPrintRequestAttributeSet = new HashPrintRequestAttributeSet();
            OPrintRequestAttributeSet.add(MediaSizeName.ISO_A4);
            OPrintRequestAttributeSet.add(new Copies(int_NUMBER_COPY)); // nombre de copie a imprimer
            OPrintRequestAttributeSet.add(Chromaticity.COLOR); // insiste sur la netteté de la couleur du texte

            PrintServiceAttributeSet printServiceAttributeSet = new HashPrintServiceAttributeSet();

            printServiceAttributeSet.add(new PrinterName(printerName, null));
            InputStream stream = new BufferedInputStream(new FileInputStream(name_file));
            DocFlavor flavor = DocFlavor.INPUT_STREAM.AUTOSENSE;

            Doc myDoc = new SimpleDoc(stream, flavor, null);

            // DocPrintJob job = svc.createPrintJob();
            // job.print(myDoc, null);
            PrintService printService = PrintServiceLookup.lookupDefaultPrintService();

            // System.out.println("Printing to default printer: " + printService.getName());
            DocPrintJob job = printService.createPrintJob();

            job.print(myDoc, OPrintRequestAttributeSet);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    // fin

    // recherche d'une imprimante
    public PrinterJob findPrinterJob() throws PrinterException {

        // try
        // Retrieve the Printer Service
        PrintService printService = this.findPrintService();

        // Validate the Printer Service
        if (printService == null) {
            this.buildErrorTraceMessage("Imprimante inconnue");
            // return null;
            throw new IllegalStateException("Imprimante inconnue");
        }
        // Obtain a Printer Job instance.
        PrinterJob printerJob = PrinterJob.getPrinterJob();

        // Set the Print Service.
        printerJob.setPrintService(printService);

        // Return Print Job
        return printerJob;
        // } catch (Exception e) {
        // return null;
        // }

    }

    public PrintService findPrintService(String printerName) {

        printerName = printerName.toLowerCase();

        PrintService service = null;

        // Get array of all print services
        PrintService[] services = PrinterJob.lookupPrintServices();

        // Retrieve a print service from the array
        for (int index = 0; service == null && index < services.length; index++) {
            if (services[index].getName().toLowerCase().indexOf(printerName) >= 0) {
                service = services[index];
            }
        }

        // Return the print service
        return service;
    }

    public PrintService findPrintService() {

        PrintService service = PrintServiceLookup.lookupDefaultPrintService();
        new logger().OCategory.info("Printer's name: " + service.getName());
        // Return the print service
        return service;
    }

    // fin recherche d'une imprimante
    // implementation de la fonction d'impression de JAVA
    @Override
    public int print(Graphics graphics, PageFormat pageFormat, int pageIndex) throws PrinterException {
        // datas = generateData();
        if (pageIndex > 0) {
            /* We have only one page, and 'page' is zero-based */

            return NO_SUCH_PAGE;
        }

        Graphics2D g2d = (Graphics2D) graphics;
        g2d.translate(pageFormat.getImageableX(), pageFormat.getImageableY());

        int scale_image = 2; // coefficient de proportion des images
        int scale_texte = 12; // hauteur d'une ligne de texte

        // Font font = new Font("Times New Roman", Font.PLAIN, 10);
        Font font = new Font("Calibri (Corps)", Font.PLAIN, 9 + int_FONT);

        g2d.setFont(font);

        limit = 85;
        // new logger().OCategory.info("taille liste " + datas.size());
        this.buildHeader(g2d, scale_image, scale_texte, limit); // definition de l'entete
        if (this.getDatasInfoTiersPayant().size() > 0) {
            buildInfoTiersPayant(g2d, scale_texte, limit, this.getDatasInfoTiersPayant());
        }
        if (this.getDatasInfoSeller().size() > 0) {
            this.buildInfoSeller(g2d, scale_texte, limit, this.getDatasInfoSeller());
        }

        this.buildContent(g2d, scale_texte, limit, this.getDatas()); // definition du corps du ticket

        if (this.getDatasSubTotal().size() > 0) {
            this.buildSubTotal(g2d, scale_texte, limit, this.getDatasSubTotal());
        }

        if (this.getDataCommentaires().size() > 0) {
            this.buildSubCommentaire(g2d, scale_texte, limit, this.getDataCommentaires());
        }

        this.buildFooter(g2d, scale_image, scale_texte, limit); // definition du pied de page

        /*
         * font = new Font("control", Font.PLAIN, 10); g2d.setFont(font); g2d.drawString("A", 0, limit);
         */
        /* tell the caller that this page is part of the printed document */
        return PAGE_EXISTS;
    }
    // implementation de la fonction d'impression de JAVA

    // definition de l'entete
    public void buildHeader(Graphics2D graphics, int scale_image, int scale_texte, int start) {
        int logoWidth = 20, logoHeight = 20, i = 1;
        int Lw = scale_image * logoWidth, Lh = scale_image * logoHeight;
        boolean result = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                .equalsIgnoreCase(commonparameter.PROCESS_SUCCESS);

        Image logo = new ImageIcon(jdom.scr_report_file_logo).getImage();
        TOfficine OTOfficine = this.getOdataManager().getEm().find(TOfficine.class, "1");

        Font font = new Font("Calibri (Corps)", Font.PLAIN, 15 + int_FONT);
        graphics.setFont(font);

        // graphics.drawString(OTOfficine.getStrNOMCOMPLET(), 35, start); //ancienne bonne version
        graphics.drawString(OTOfficine.getStrNOMCOMPLET(), 0, start);
        font = new Font("Arial Narrow", Font.PLAIN, 9 + int_FONT);
        graphics.setFont(font);

        if (!result) {
            graphics.drawString(this.getOTUser().getLgEMPLACEMENTID().getLgTYPEDEPOTID().getStrDESCRIPTION() + ": "
                    + this.getOTUser().getLgEMPLACEMENTID().getStrDESCRIPTION(), 0, start + (scale_texte * i));
            i++;
        }
        graphics.drawString(OTOfficine.getStrFIRSTNAME() + " " + OTOfficine.getStrLASTNAME(), 0,
                start + (scale_texte * i));
        // graphics.drawString("Tél: " + conversion.PhoneNumberFormat("+225", OTOfficine.getStrPHONE()), 0, start +
        // (scale_texte * 2));
        graphics.drawString(OTOfficine.getStrPHONE() + "   |    " + OTOfficine.getStrADRESSSEPOSTALE(), 0,
                start + (scale_texte * ++i));

        if (!OTOfficine.getStrENTETE().equals("") && OTOfficine.getStrENTETE() != null) {
            if (result) {
                i++;
            }
            graphics.drawString(OTOfficine.getStrENTETE(), 0, start + (scale_texte * ++i));
        }
        graphics.drawString(this.getTitle(), 0, start + (scale_texte * ++i));
        limit = start + (scale_texte * ++i);

        if (int_BEGIN == 0) {
            graphics.drawImage(logo, 155, 85, (int) Lw, (int) Lh, null); // A decommenter pour les imprimantes thermique
        }

    }
    // fin definition de l'entete

    // definition du pied de page
    public void buildContent(Graphics2D graphics, int scale_texte, int start, List<String> datas) {

        if (this.getType_ticket().equalsIgnoreCase(commonparameter.str_ACTION_VENTE)) {
            // Font font = new Font("Arial Narrow", Font.BOLD, 8);
            Font font = new Font("Arial Narrow", Font.PLAIN, 9 + int_FONT);

            graphics.drawString("QTE", 0 + int_COLUMN1, start); /// imprimante thermique
            graphics.drawString("ARTICLES", 25 + int_COLUMN2, start);
            graphics.drawString("P.U", 125 + int_COLUMN3, start);
            graphics.drawString("MONTANT", 158 + int_COLUMN4, start);
            /*
             * graphics.drawString("QTE", 0, start); //imprimante matricielle graphics.drawString("ARTICLES", 25,
             * start); graphics.drawString("P.U", 125, start); graphics.drawString("MONTANT", 148, start); font = new
             * Font("Arial Narrow", Font.PLAIN, 8);
             */
            graphics.setFont(font);
            for (int i = 0; i < datas.size(); i++) {
                String[] parts = datas.get(i).split(";");
                /*
                 * imprimante matricielle graphics.drawString(parts[0], 0, start + (scale_texte * (i + 1)));
                 * graphics.drawString(parts[1], 10, start + (scale_texte * (i + 1))); graphics.drawString(parts[2], 25,
                 * start + (scale_texte * (i + 1))); graphics.drawString(parts[3], 125, start + (scale_texte * (i +
                 * 1))); graphics.drawString(parts[4], 148, start + (scale_texte * (i + 1)));
                 */

                // imprimante thermique
                graphics.drawString(parts[0], 0, start + (scale_texte * (i + 1)));
                graphics.drawString(parts[1], 10 + int_COLUMN1, start + (scale_texte * (i + 1)));
                graphics.drawString(parts[2], 25 + int_COLUMN2, start + (scale_texte * (i + 1)));
                graphics.drawString(parts[3], 125 + int_COLUMN3, start + (scale_texte * (i + 1)));
                graphics.drawString(parts[4], 158 + int_COLUMN4, start + (scale_texte * (i + 1)));
                // fin imprimante thermique
            }
        } else if (this.getType_ticket().equalsIgnoreCase(commonparameter.str_TICKETZ)) {
            Font font;
            for (int i = 0; i < datas.size(); i++) {
                String[] parts = datas.get(i).split(";");
                if (parts[4].equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                    font = new Font("Arial Narrow", Font.BOLD, 9 + int_FONT);
                } else {
                    font = new Font("Arial Narrow", Font.PLAIN, 9 + int_FONT);
                }

                graphics.setFont(font);
                if (parts[5].equalsIgnoreCase(commonparameter.PROCESS_FAILED)) {
                    graphics.drawString(parts[0], 0, start + (scale_texte * (i + 1)));
                } else {

                    if (parts.length > 6) {
                        graphics.drawString(parts[0], 0, start + (scale_texte * (i + 1)));
                        // graphics.drawString(parts[1], 30 + int_COLUMN2, start + (scale_texte * (i + 1)));
                        // graphics.drawString(parts[2], 90 + int_COLUMN3, start + (scale_texte * (i + 1)));
                        // graphics.drawString(parts[3], 150 + int_COLUMN4, start + (scale_texte * (i + 1)));

                        graphics.drawString(parts[1], 85 + int_COLUMN2, start + (scale_texte * (i + 1)));
                        graphics.drawString(parts[2], 130 + int_COLUMN3, start + (scale_texte * (i + 1)));
                        graphics.drawString(parts[3], 140 + int_COLUMN4, start + (scale_texte * (i + 1)));
                    } else {
                        graphics.drawString(parts[0], 0, start + (scale_texte * (i + 1)));
                        // graphics.drawString(parts[1], 30 + int_COLUMN2, start + (scale_texte * (i + 1)));
                        // graphics.drawString(parts[2], 90 + int_COLUMN3, start + (scale_texte * (i + 1)));
                        // graphics.drawString(parts[3], 150 + int_COLUMN4, start + (scale_texte * (i + 1)));

                        graphics.drawString(parts[1], 65 + int_COLUMN2, start + (scale_texte * (i + 1)));
                        graphics.drawString(parts[2], 130 + int_COLUMN3, start + (scale_texte * (i + 1)));
                        graphics.drawString(parts[3], 140 + int_COLUMN4, start + (scale_texte * (i + 1)));
                    }

                }

            }
        } else {
            for (int i = 0; i < datas.size(); i++) {
                String[] parts = datas.get(i).split(";");
                graphics.drawString(parts[0], 0, start + (scale_texte * (i + 1)));
                graphics.drawString(parts[1], 100 + int_COLUMN3, start + (scale_texte * (i + 1)));
                graphics.drawString(parts[2], 150 + int_COLUMN4, start + (scale_texte * (i + 1)));
            }
        }

        limit = start + (scale_texte * datas.size());
    }
    // fin definition du detail de la vente

    // public void buildContent(Graphics2D graphics, int scale_texte, int start, List<String> datas) {
    //
    // for (int i = 0; i < datas.size(); i++) {
    // String[] parts = datas.get(i).split(";");
    // graphics.drawString(parts[0], 0, start + (scale_texte * (i+1)));
    // graphics.drawString(parts[1], 75, start + (scale_texte * (i+1)));
    // graphics.drawString(parts[2], 100, start + (scale_texte * (i+1)));
    // }
    // limit = start + (scale_texte * (datas.size() + 1));
    // }
    // definition infos ayant droit
    public void buildInfoTiersPayant(Graphics2D graphics, int scale_texte, int start, List<String> datas) {
        for (int i = 0; i < datas.size(); i++) {
            graphics.drawString(datas.get(i), 0, start + (scale_texte * i));
        }

        limit = start + (scale_texte * (datas.size() + 1));
        // limit = start + (scale_texte * datas.size());
    }
    // fin definition infos ayant droit

    // definition infos vendeur et caissier
    public void buildInfoSeller(Graphics2D graphics, int scale_texte, int start, List<String> datas) {
        for (int i = 0; i < datas.size(); i++) {
            graphics.drawString(datas.get(i), 0, start + (scale_texte * i));
        }

        limit = start + (scale_texte * (datas.size() + 1));
    }
    // fin definition infos vendeur et caissier

    // sous total
    public void buildSubTotal(Graphics2D graphics, int scale_texte, int start, List<String> datas) {
        graphics.drawString("", 0, start);
        Font font;
        for (int i = 0; i < datas.size(); i++) {
            String[] parts = datas.get(i).split(";");
            if (parts[3].equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                font = new Font("Arial Narrow", Font.BOLD, 9 + int_FONT);
            } else {
                font = new Font("Arial Narrow", Font.PLAIN, 9 + int_FONT);
            }

            graphics.setFont(font);
            graphics.drawString(parts[0], 35, start + (scale_texte * (i + 1)));
            graphics.drawString(parts[1], 110, start + (scale_texte * (i + 1)));
            // graphics.drawString(parts[2], 160, start + (scale_texte * (i + 1))); //imprimante termique
            graphics.drawString(parts[2], 150, start + (scale_texte * (i + 1))); // imprimante matricielle
        }
        limit = start + (scale_texte * (datas.size()));
    }
    // fin sous total

    // definition du pied de page
    public void buildFooter(Graphics2D graphics, int scale_image, int scale_texte, int start) {
        int codeBarWidth = 50;
        int codeBarHeight = 15;
        int Cw = scale_image * codeBarWidth;
        int Ch = scale_image * codeBarHeight;

        /*
         * if (this.getType_ticket().equalsIgnoreCase(commonparameter.str_ACTION_VENTE)) {
         * graphics.drawString("***** Merci de votre confiance.*****", 15, start); }
         */
        graphics.drawString("Logiciel DICI", 125, start + (scale_texte * 2)); // a decommenter apres 11/06/2016
        // graphics.drawString("Logiciel DICI", 0, start + (scale_texte * 2));

        graphics.drawString(
                date.DateToString((dateOperation != null ? dateOperation : new Date()), date.formatterOrange), 125,
                start + (scale_texte * 1)); // imprimante matricielle
        // graphics.drawString(date.DateToString((dateOperation != null ? dateOperation : new Date()),
        // date.formatterOrange), 0, start + (scale_texte * 1)); // code ajouté imprimante thermique
        if (this.isCodeShow()) { // a decommenter apres generation 11/06/2016
            // Image codeBar = new ImageIcon(jdom.barecode_file + this.getName_code_bare() + ".png").getImage();
            new logger().OCategory.info("path " + this.getName_code_bare());
            Image codeBar = new ImageIcon(this.getName_code_bare()).getImage();

            if (int_BEGIN == 0) {
                graphics.drawImage(codeBar, -5, start + 5, (int) Cw, (int) Ch, null);
            }

            // graphics.drawImage(codeBar, -5, start + 5, codeBar.getWidth(null), codeBar.getHeight(null), null);
        }

    }
    // fin definition du pied de page

    // sous commentaires
    public void buildSubCommentaire(Graphics2D graphics, int scale_texte, int start, List<String> datas) {

        /*
         * Font font = new Font("Arial Narrow", Font.PLAIN, 9); // a decommenter en cas de probleme
         * graphics.setFont(font); for (int i = 0; i < datas.size(); i++) { graphics.drawString(datas.get(i), 0, start +
         * (scale_texte * (i + 1))); }
         */
        // code ajouté
        Font font;

        for (int i = 0; i < datas.size(); i++) {
            String[] parts = datas.get(i).split(";");
            if (parts[1].equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                font = new Font("Arial Narrow", Font.BOLD, 9 + int_FONT);
            } else {
                font = new Font("Arial Narrow", Font.PLAIN, 9 + int_FONT);
            }
            graphics.setFont(font);
            graphics.drawString(parts[0], 0, start + (scale_texte * (i + 1)));
            // graphics.drawString(datas.get(i), 0, start + (scale_texte * (i + 1)));
        }

        // fin code ajouté
        limit = start + (scale_texte * (datas.size()));
    }
    // fin sous commentaires

}
