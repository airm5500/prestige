/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.TEmplacement;
import dal.TImprimante;
import dal.TOfficine;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.print.PageFormat;
import java.awt.print.Paper;
import java.awt.print.Printable;
import java.awt.print.PrinterException;
import java.awt.print.PrinterJob;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import javax.print.PrintService;
import javax.print.attribute.HashPrintRequestAttributeSet;
import javax.print.attribute.PrintRequestAttributeSet;
import javax.print.attribute.standard.Chromaticity;
import javax.print.attribute.standard.Copies;
import javax.swing.ImageIcon;
import toolkits.utils.jdom;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author Kobena
 */
public class ImpressionServiceImpl implements Printable {

    SimpleDateFormat SIMPLE_DATE_FORMAT = new SimpleDateFormat("dd-MM-yyyy HH:mm:ss");
    private PrintService service;
    private int limit = 0, intBegin = 0, nombreCopie = 1, fontSize = 0;
    private boolean showCodeBar;
    private TImprimante oTImprimante;
    private Date operation;
    private Date operationSectionDeux;
    private LocalDateTime operationLocalTime;
    private String typeTicket;
    private String title;
    private String titleSectionDeux;
    private List<String> datas;
    private List<String> datasSectionDeux = new ArrayList<>();
    private List<String> infoSellers;
    private List<String> infoSellersSectionDeux = new ArrayList<>();
    private List<String> infoTiersPayants;
    private List<String> subtotal;
    private List<String> subtotalSectionDeux = new ArrayList<>();
    private List<String> commentairesSectionDeux = new ArrayList<>();
    private List<String> commentaires;
    private String codeBar;
    private TEmplacement emplacement;
    private TOfficine officine;
    private int columnOne = 0;
    private int columnTwo = 0;
    private int columnThree = 0;
    private int columnFour = 0;
    private PrinterJob printerJob;
    private List<String> tierspayantSectionDeux = new ArrayList<>();
    private LinkedList<String> ticketZdatas;

    public LinkedList<String> getTicketZdatas() {
        return ticketZdatas;
    }

    public void setTicketZdatas(LinkedList<String> ticketZdatas) {
        this.ticketZdatas = ticketZdatas;
    }

    public List<String> getDatas() {
        return datas;
    }

    public String getTitleSectionDeux() {
        return titleSectionDeux;
    }

    public void setTitleSectionDeux(String titleSectionDeux) {
        this.titleSectionDeux = titleSectionDeux;
    }

    public List<String> getCommentairesSectionDeux() {
        return commentairesSectionDeux;
    }

    public void setCommentairesSectionDeux(List<String> commentairesSectionDeux) {
        this.commentairesSectionDeux = commentairesSectionDeux;
    }

    public Date getOperationSectionDeux() {
        return operationSectionDeux;
    }

    public void setOperationSectionDeux(Date operationSectionDeux) {
        this.operationSectionDeux = operationSectionDeux;
    }

    public List<String> getDatasSectionDeux() {
        return datasSectionDeux;
    }

    public void setDatasSectionDeux(List<String> datasSectionDeux) {
        this.datasSectionDeux = datasSectionDeux;
    }

    public List<String> getInfoSellersSectionDeux() {
        return infoSellersSectionDeux;
    }

    public void setInfoSellersSectionDeux(List<String> infoSellersSectionDeux) {
        this.infoSellersSectionDeux = infoSellersSectionDeux;
    }

    public List<String> getSubtotalSectionDeux() {
        return subtotalSectionDeux;
    }

    public void setSubtotalSectionDeux(List<String> subtotalSectionDeux) {
        this.subtotalSectionDeux = subtotalSectionDeux;
    }

    public List<String> getTierspayantSectionDeux() {
        return tierspayantSectionDeux;
    }

    public void setTierspayantSectionDeux(List<String> tierspayantSectionDeux) {
        this.tierspayantSectionDeux = tierspayantSectionDeux;
    }

    public int getColumnOne() {
        return columnOne;
    }

    public void setColumnOne(int columnOne) {
        this.columnOne = columnOne;
    }

    public int getColumnTwo() {
        return columnTwo;
    }

    public void setColumnTwo(int columnTwo) {
        this.columnTwo = columnTwo;
    }

    public int getColumnThree() {
        return columnThree;
    }

    public void setColumnThree(int columnThree) {
        this.columnThree = columnThree;
    }

    public int getColumnFour() {
        return columnFour;
    }

    public void setColumnFour(int columnFour) {
        this.columnFour = columnFour;
    }

    public void setDatas(List<String> datas) {
        this.datas = datas;
    }

    public TOfficine getOfficine() {
        return officine;
    }

    public void setOfficine(TOfficine officine) {
        this.officine = officine;
    }

    public TEmplacement getEmplacement() {
        return emplacement;
    }

    public void setEmplacement(TEmplacement emplacement) {
        this.emplacement = emplacement;
    }

    public List<String> getInfoSellers() {
        return infoSellers;
    }

    public void setInfoSellers(List<String> infoSellers) {
        this.infoSellers = infoSellers;
    }

    public List<String> getInfoTiersPayants() {
        return infoTiersPayants;
    }

    public void setInfoTiersPayants(List<String> infoTiersPayants) {
        this.infoTiersPayants = infoTiersPayants;
    }

    public List<String> getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(List<String> subtotal) {
        this.subtotal = subtotal;
    }

    public List<String> getCommentaires() {
        return commentaires;
    }

    public void setCommentaires(List<String> commentaires) {
        this.commentaires = commentaires;
    }

    public String getCodeBar() {
        return codeBar;
    }

    public void setCodeBar(String codeBar) {
        this.codeBar = codeBar;
    }

    public String getTypeTicket() {
        return typeTicket;
    }

    public int getFontSize() {
        return fontSize;
    }

    public void setFontSize(int fontSize) {
        this.fontSize = fontSize;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setTypeTicket(String typeTicket) {
        this.typeTicket = typeTicket;
    }

    public int getLimit() {
        return limit;
    }

    public Date getOperation() {
        return operation;
    }

    public void setOperation(Date operation) {
        this.operation = operation;
    }

    public LocalDateTime getOperationLocalTime() {
        return operationLocalTime;
    }

    public void setOperationLocalTime(LocalDateTime operationLocalTime) {
        this.operationLocalTime = operationLocalTime;
    }

    public TImprimante getOTImprimante() {
        return oTImprimante;
    }

    public void setOTImprimante(TImprimante oImprimante) {
        this.oTImprimante = oImprimante;
    }

    public boolean isShowCodeBar() {
        return showCodeBar;
    }

    public void setShowCodeBar(boolean showCodeBar) {
        this.showCodeBar = showCodeBar;
    }

    public int getNombreCopie() {
        return nombreCopie;
    }

    public void setNombreCopie(int nombreCopie) {
        this.nombreCopie = nombreCopie;
    }

    public void setLimit(int limit) {
        this.limit = limit;
    }

    public int getIntBegin() {
        return intBegin;
    }

    public void setIntBegin(int intBegin) {
        this.intBegin = intBegin;
    }

    public PrintService getService() {
        return service;
    }

    public void setService(PrintService service) {
        this.service = service;
    }

    public void printTicketVente(int copies) throws PrinterException {

        PrinterJob printerjob = findPrinterJob();
        TImprimante oImprimante = this.getOTImprimante();
        if (oImprimante != null) {
            intBegin = oImprimante.getIntBEGIN();
            columnOne = oImprimante.getIntCOLUMN1();
            columnTwo = oImprimante.getIntCOLUMN2();
            columnThree = oImprimante.getIntCOLUMN3();
            columnFour = oImprimante.getIntCOLUMN4();
        }
        PrintRequestAttributeSet printRequestAttributeSet = new HashPrintRequestAttributeSet();
        if (printerjob != null) {
            PageFormat pageFormat = printerjob.defaultPage();
            Paper paper = new Paper();

            paper.setImageableArea(9 + intBegin, -70, paper.getWidth(), paper.getHeight()); // definition des marges de
            // la feuille
            // paper.setImageableArea(20, -70, paper.getWidth(), paper.getHeight()); //definition des marges de la
            // feuille
            pageFormat.setPaper(paper);
            pageFormat.setOrientation(PageFormat.PORTRAIT); // orientation de la page
            printRequestAttributeSet.add(new Copies(copies)); // nombre de copie a imprimer
            printRequestAttributeSet.add(Chromaticity.COLOR); // insiste sur la netteté de la couleur du texte

            printerjob.setPrintable(this, pageFormat);

            printerjob.print(printRequestAttributeSet);

        }

    }

    public PrinterJob findPrinterJob() throws PrinterException {
        if (printerJob == null) {
            PrintService printService = this.getService();
            if (printService == null) {

                throw new IllegalStateException("Imprimante inconnue");
            }
            printerJob = PrinterJob.getPrinterJob();
            printerJob.setPrintService(printService);

            return printerJob;
        }
        return printerJob;

    }

    @Override
    public int print(Graphics graphics, PageFormat pageFormat, int pageIndex) throws PrinterException {
        if (pageIndex == 0) {
            Graphics2D g2d = (Graphics2D) graphics;
            g2d.translate(pageFormat.getImageableX(), pageFormat.getImageableY());
            int scaleImage = 2; // coefficient de proportion des images
            int scaleTexte = 12; // hauteur d'une ligne de texte
            Font font = new Font("Calibri (Corps)", Font.PLAIN, 9 + fontSize);
            g2d.setFont(font);
            limit = 85;

            this.buildHeader(g2d, scaleImage, scaleTexte, limit); // definition de l'entete
            if (!this.getInfoTiersPayants().isEmpty()) {
                buildInfoTiersPayant(g2d, scaleTexte, limit, this.getInfoTiersPayants());
            }
            if (!this.getInfoSellers().isEmpty()) {
                this.buildInfoSeller(g2d, scaleTexte, limit, this.getInfoSellers());
            }

            this.buildContent(g2d, scaleTexte, limit); // definition du corps du ticket

            if (!this.getSubtotal().isEmpty()) {
                this.buildSubTotal(g2d, scaleTexte, limit, this.getSubtotal());
            }

            if (!this.getCommentaires().isEmpty()) {
                this.buildSubCommentaire(g2d, scaleTexte, limit);
            }

            this.buildFooter(g2d, scaleImage, scaleTexte, limit); // definition du pied de page

            return Printable.PAGE_EXISTS;
        }
        return Printable.NO_SUCH_PAGE;

    }

    public void buildTicket(List<String> datas, List<String> infoSellers, List<String> infoTiersPayants,
            List<String> subtotal, List<String> commentaires, String codeBar) {
        this.codeBar = codeBar;
        this.infoSellers = infoSellers;
        this.datas = datas;
        this.infoTiersPayants = infoTiersPayants;
        this.subtotal = subtotal;
        this.commentaires = commentaires;
    }

    public void buildHeader(Graphics2D graphics, int scaleImage, int scaleTexte, int start) {
        int logoWidth = 20;
        int logoHeight = 20;
        int i = 1;
        int lw = scaleImage * logoWidth;
        int lh = scaleImage * logoHeight;
        boolean result = this.getEmplacement().getLgEMPLACEMENTID().equals(DateConverter.OFFICINE);
        Image logo = new ImageIcon(jdom.scr_report_file_logo).getImage();
        Font font = new Font("Calibri (Corps)", Font.PLAIN, 15 + fontSize);
        graphics.setFont(font);
        graphics.drawString(this.getOfficine().getStrNOMCOMPLET(), 0, start);
        font = new Font("Arial Narrow", Font.PLAIN, 9 + fontSize);
        graphics.setFont(font);
        /*
         * Commenter pour ne pas afficher le nom terme Depot extension: SCB par exemple sur le ticket quand on fait une
         * vente depuis le depot
         */
        /*
         * if (!result) { graphics.drawString(this.getEmplacement().getLgTYPEDEPOTID().getStrDESCRIPTION() + ": " +
         * this.getEmplacement().getStrDESCRIPTION(), 0, start + (scaleTexte * i)); i++; }
         */
        graphics.drawString(this.getOfficine().getStrFIRSTNAME() + " " + this.getOfficine().getStrLASTNAME(), 0,
                start + (scaleTexte * i));
        graphics.drawString(this.getOfficine().getStrPHONE() + "   |    " + this.getOfficine().getStrADRESSSEPOSTALE(),
                0, start + (scaleTexte * ++i));
        if (!this.getOfficine().getStrENTETE().equals("") && this.getOfficine().getStrENTETE() != null) {
            if (result) {
                i++;
            }
            graphics.drawString(this.getOfficine().getStrENTETE(), 0, start + (scaleTexte * ++i));
        }
        graphics.drawString(this.getTitle(), 0, start + (scaleTexte * ++i));
        limit = start + (scaleTexte * ++i);

        if (intBegin == 0) {
            graphics.drawImage(logo, 155, 85, lw, lh, null); // A decommenter pour les imprimantes thermique
        }
    }

    public void buildContent(Graphics2D graphics, int scaleTexte, int start) {
        List<String> curDatas = this.getDatas();
        int dataSize = curDatas.size();
        switch (this.getTypeTicket()) {
        case Constant.TICKET_VENTE: {
            Font font = new Font("Arial Narrow", Font.PLAIN, 9 + fontSize);
            graphics.drawString("QTE", 0 + columnOne, start);
            graphics.drawString("ARTICLES", 25 + columnTwo, start);
            graphics.drawString("P.U", 125 + columnThree, start);
            graphics.drawString("MONTANT", 158 + columnFour, start);
            graphics.setFont(font);

            for (int i = 0; i < curDatas.size(); i++) {
                String[] parts = curDatas.get(i).split(";");
                graphics.drawString(parts[0], 0, start + (scaleTexte * (i + 1)));
                graphics.drawString(parts[1], 10 + columnOne, start + (scaleTexte * (i + 1)));
                graphics.drawString(parts[2], 25 + columnTwo, start + (scaleTexte * (i + 1)));
                graphics.drawString(parts[3], 125 + columnThree, start + (scaleTexte * (i + 1)));
                graphics.drawString(parts[4], 158 + columnFour, start + (scaleTexte * (i + 1)));
            }
            break;
        }
        case Constant.TICKET_Z: {
            Font font;
            for (int i = 0; i < curDatas.size(); i++) {
                String[] parts = curDatas.get(i).split(";");
                if (parts[4].equals("1")) {
                    font = new Font("Arial Narrow", Font.BOLD, 8 + fontSize);
                } else {
                    font = new Font("Arial Narrow", Font.PLAIN, 8 + fontSize);
                }

                graphics.setFont(font);
                if (parts[5].equals("0")) {
                    graphics.drawString(parts[0], 0, start + (scaleTexte * (i + 1)));
                } else {

                    if (parts.length > 6) {
                        graphics.drawString(parts[0], 0, start + (scaleTexte * (i + 1)));
                        graphics.drawString(parts[1], 85 + columnTwo, start + (scaleTexte * (i + 1)));
                        graphics.drawString(parts[2], 130 + columnThree, start + (scaleTexte * (i + 1)));
                        graphics.drawString(parts[3], 140 + columnFour, start + (scaleTexte * (i + 1)));
                    } else {
                        graphics.drawString(parts[0], 0, start + (scaleTexte * (i + 1)));
                        graphics.drawString(parts[1], 65 + columnTwo, start + (scaleTexte * (i + 1)));
                        graphics.drawString(parts[2], 130 + columnThree, start + (scaleTexte * (i + 1)));
                        graphics.drawString(parts[3], 140 + columnFour, start + (scaleTexte * (i + 1)));
                    }

                }

            }
            break;
        }
        case DateConverter.TICKET_ZZ: {
            LinkedList<String> ticketDatas = this.getTicketZdatas();
            dataSize = ticketDatas.size();
            Font font;
            for (int i = 0; i < ticketDatas.size(); i++) {
                String[] parts = ticketDatas.get(i).split(";");
                if (parts[4].equals("1")) {
                    font = new Font("Arial Narrow", Font.BOLD, 8 + fontSize);
                } else {
                    font = new Font("Arial Narrow", Font.PLAIN, 8 + fontSize);
                }

                graphics.setFont(font);
                if (parts[5].equals("0")) {
                    graphics.drawString(parts[0], 0, start + (scaleTexte * (i + 1)));
                } else {

                    if (parts.length > 6) {
                        graphics.drawString(parts[0], 0, start + (scaleTexte * (i + 1)));
                        graphics.drawString(parts[1], 85 + columnTwo, start + (scaleTexte * (i + 1)));
                        graphics.drawString(parts[2], 130 + columnThree, start + (scaleTexte * (i + 1)));
                        graphics.drawString(parts[3], 140 + columnFour, start + (scaleTexte * (i + 1)));
                    } else {
                        graphics.drawString(parts[0], 0, start + (scaleTexte * (i + 1)));
                        graphics.drawString(parts[1], 65 + columnTwo, start + (scaleTexte * (i + 1)));
                        graphics.drawString(parts[2], 130 + columnThree, start + (scaleTexte * (i + 1)));
                        graphics.drawString(parts[3], 140 + columnFour, start + (scaleTexte * (i + 1)));
                    }

                }

            }
            break;
        }

        default:
            for (int i = 0; i < curDatas.size(); i++) {
                String[] parts = curDatas.get(i).split(";");
                graphics.drawString(parts[0], 0, start + (scaleTexte * (i + 1)));
                graphics.drawString(parts[1], 100 + columnThree, start + (scaleTexte * (i + 1)));
                graphics.drawString(parts[2], 150 + columnFour, start + (scaleTexte * (i + 1)));
            }
            break;
        }

        limit = start + (scaleTexte * dataSize);
    }

    public void buildSubCommentaire(Graphics2D graphics, int scaleTexte, int start) {
        List<String> commentairess = this.getCommentaires();

        Font font;

        for (int i = 0; i < commentairess.size(); i++) {
            String[] parts = commentairess.get(i).split(";");
            if (parts[1].equals("1")) {
                font = new Font("Arial Narrow", Font.BOLD, 9 + fontSize);
            } else {
                font = new Font("Arial Narrow", Font.PLAIN, 9 + fontSize);
            }
            graphics.setFont(font);
            graphics.drawString(parts[0], 0, start + (scaleTexte * (i + 1)));

        }

        limit = start + (scaleTexte * (commentairess.size()));
    }

    public void buildFooter(Graphics2D graphics, int scaleImage, int scaleTexte, int start) {
        int codeBarWidth = 50;
        int codeBarHeight = 15;
        int cw = scaleImage * codeBarWidth;
        int ch = scaleImage * codeBarHeight;

        graphics.drawString(SIMPLE_DATE_FORMAT.format(this.getOperation()), 125, start + (scaleTexte * 1)); // imprimante
        // matricielle

        if (this.isShowCodeBar()) {
            Image imgCodeBar = new ImageIcon(this.getCodeBar()).getImage();
            if (intBegin == 0) {
                graphics.drawImage(imgCodeBar, -5, start + 5, cw, ch, null);
            }

        }

    }

    public void buildInfoSeller(Graphics2D graphics, int scaleTexte, int start, List<String> datas) {
        for (int i = 0; i < datas.size(); i++) {
            graphics.drawString(datas.get(i), 0, start + (scaleTexte * i));
        }

        limit = start + (scaleTexte * (datas.size() + 1));
    }

    public void buildSubTotal(Graphics2D graphics, int scaleTexte, int start, List<String> datas) {
        graphics.drawString("", 0, start);
        Font font;
        for (int i = 0; i < datas.size(); i++) {
            String[] parts = datas.get(i).split(";");
            if (parts[3].equals("1")) {
                font = new Font("Arial Narrow", Font.BOLD, 9 + fontSize);
            } else {
                font = new Font("Arial Narrow", Font.PLAIN, 9 + fontSize);
            }

            graphics.setFont(font);
            graphics.drawString(parts[0], 35, start + (scaleTexte * (i + 1)));
            graphics.drawString(parts[1], 110, start + (scaleTexte * (i + 1)));
            // graphics.drawString(parts[2], 160, start + (scaleTexte * (i + 1))); //imprimante termique
            graphics.drawString(parts[2], 150, start + (scaleTexte * (i + 1))); // imprimante matricielle
        }
        limit = start + (scaleTexte * (datas.size()));
    }

    public void buildInfoTiersPayant(Graphics2D graphics, int scaleTexte, int start, List<String> datas) {
        for (int i = 0; i < datas.size(); i++) {
            graphics.drawString(datas.get(i), 0, start + (scaleTexte * i));
        }

        limit = start + (scaleTexte * (datas.size() + 1));

    }

}
