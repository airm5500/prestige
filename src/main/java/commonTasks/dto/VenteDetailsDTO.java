/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TFamille;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TUser;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Objects;
import toolkits.parameters.commonparameter;
import util.DateConverter;

/**
 *
 * @author Kobena
 */
public class VenteDetailsDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String lgPREENREGISTREMENTDETAILID = "", lgPREENREGISTREMENTID = "",
            strREF, lgFAMILLEID, strNAME, intCIP, intEAN13, strSTATUT, dtCREATED, HEURE, ticketName, ticketNum;
    private Integer intPRICEUNITAIR = 0, intQUANTITY = 0, intQUANTITYSERVED = 0, intPRICE = 0, intPRICEREMISE = 0;
    private String operateur, strRefBon, dateHeure;
    private Date dateOperation;
    private String typeVente;
    private int intAVOIR, currentStock = 0;

    public VenteDetailsDTO operateur(TUser operateur) {
        this.operateur = operateur.getStrFIRSTNAME() + " " + operateur.getStrLASTNAME();
        return this;
    }

    public VenteDetailsDTO intPRICEUNITAIR(int intPRICEUNITAIR) {
        this.intPRICEUNITAIR = intPRICEUNITAIR;
        return this;
    }

    public VenteDetailsDTO intQUANTITY(int intQUANTITY) {
        this.intQUANTITY = intQUANTITY;
        return this;
    }

    public String getTicketNum() {
        return ticketNum;
    }

    public void setTicketNum(String ticketNum) {
        this.ticketNum = ticketNum;
    }

    public int getCurrentStock() {
        return currentStock;
    }

    public void setCurrentStock(int currentStock) {
        this.currentStock = currentStock;
    }
    private boolean bISAVOIR;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private final SimpleDateFormat dateFormatHeure = new SimpleDateFormat("dd/MM/yyyy HH:mm");
    private final SimpleDateFormat heureFormat = new SimpleDateFormat("HH:mm");
    private LocalDateTime dateOp;
    private boolean avoir;
    private final LocalDate toDate = LocalDate.now();

    public VenteDetailsDTO strREF(String strREF) {
        this.strREF = strREF;
        return this;
    }

    public Date getDateOperation() {
        return dateOperation;
    }

    public boolean isbISAVOIR() {
        return bISAVOIR;
    }

    public String getDateHeure() {
        return dateHeure;
    }

    public VenteDetailsDTO dateHeure(Date dateHeure) {
        this.dateHeure = dateFormatHeure.format(dateHeure);
        return this;
    }

    public void setDateHeure(String dateHeure) {
        this.dateHeure = dateHeure;
    }

    public VenteDetailsDTO() {
    }

    public boolean isAvoir() {
        return avoir;
    }

    public void setAvoir(boolean avoir) {
        this.avoir = avoir;
    }

    public String getTicketName() {
        return ticketName;
    }

    public void setTicketName(String ticketName) {
        this.ticketName = ticketName;
    }

    public String getStrRefBon() {
        return strRefBon;
    }

    public void setStrRefBon(String strRefBon) {
        this.strRefBon = strRefBon;
    }

    public LocalDateTime getDateOp() {
        return dateOp;
    }

    public void setDateOp(LocalDateTime dateOp) {
        this.dateOp = dateOp;
    }

    public void setDateOperation(Date dateOperation) {
        this.dateOperation = dateOperation;
    }

    public String getDtCREATED() {
        return dtCREATED;
    }

    public String getOperateur() {
        return operateur;
    }

    public void setOperateur(String operateur) {
        this.operateur = operateur;
    }

    public String getTypeVente() {
        return typeVente;
    }

    public void setTypeVente(String typeVente) {
        this.typeVente = typeVente;
    }

    public void setDtCREATED(String dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getHEURE() {
        return HEURE;
    }

    public void setHEURE(String HEURE) {
        this.HEURE = HEURE;
    }

    public VenteDetailsDTO(TPreenregistrementDetail d) {
        this.lgPREENREGISTREMENTDETAILID = d.getLgPREENREGISTREMENTDETAILID();
        TPreenregistrement p = d.getLgPREENREGISTREMENTID();
        this.lgPREENREGISTREMENTID = p.getLgPREENREGISTREMENTID();
        this.strRefBon = p.getStrREFBON();
        this.strREF = p.getStrREF();
        TFamille f = d.getLgFAMILLEID();
        this.lgFAMILLEID = f.getLgFAMILLEID();
        this.strNAME = f.getStrNAME();
        this.intCIP = f.getIntCIP();
        this.intEAN13 = f.getIntEAN13();
        this.strSTATUT = f.getStrSTATUT();
        this.intPRICEUNITAIR = d.getIntPRICEUNITAIR();
        this.intQUANTITY = d.getIntQUANTITY();
        this.intQUANTITYSERVED = (p.getStrSTATUT().equals(commonparameter.statut_is_Closed) ? d.getIntQUANTITYSERVED() + d.getIntAVOIR() : d.getIntQUANTITYSERVED());
        this.intPRICE = d.getIntPRICE();
        this.intAVOIR = d.getIntAVOIR();
        this.bISAVOIR = d.getBISAVOIR();
        this.intPRICEREMISE = d.getIntPRICEREMISE();
        this.dateOp = DateConverter.convertDateToLocalDateTime(p.getDtUPDATED());
        this.dtCREATED = dateFormat.format(p.getDtUPDATED());
        this.ticketName = f.getStrNAME();

    }

    public VenteDetailsDTO(TPreenregistrementDetail d, boolean b) {
        this.dateOperation = d.getDtUPDATED();
        this.lgPREENREGISTREMENTDETAILID = d.getLgPREENREGISTREMENTDETAILID();
        TPreenregistrement p = d.getLgPREENREGISTREMENTID();
        this.lgPREENREGISTREMENTID = p.getLgPREENREGISTREMENTID();
        this.strREF = p.getStrREF();
        TFamille f = d.getLgFAMILLEID();
        this.lgFAMILLEID = f.getLgFAMILLEID();
        this.strNAME = f.getStrNAME();
        this.intCIP = f.getIntCIP();
        this.intEAN13 = f.getIntEAN13();
        this.strSTATUT = f.getStrSTATUT();
        this.intPRICEUNITAIR = d.getIntPRICEUNITAIR();
        this.intQUANTITY = d.getIntQUANTITY();
        this.intQUANTITYSERVED = (p.getStrSTATUT().equals(commonparameter.statut_is_Closed) ? d.getIntQUANTITYSERVED() + d.getIntAVOIR() : d.getIntQUANTITYSERVED());
        this.intPRICE = d.getIntPRICE();
        this.intAVOIR = d.getIntAVOIR();
        this.bISAVOIR = d.getBISAVOIR();
        this.intPRICEREMISE = d.getIntPRICEREMISE();
        this.dtCREATED = dateFormat.format(d.getDtUPDATED());
        this.HEURE = heureFormat.format(d.getDtUPDATED());
        TUser tu = p.getLgUSERID();
        this.operateur = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
        this.typeVente = p.getLgTYPEVENTEID().getStrNAME();
        this.ticketName = f.getStrNAME();
    }

    public String getLgPREENREGISTREMENTDETAILID() {
        return lgPREENREGISTREMENTDETAILID;
    }

    public void setLgPREENREGISTREMENTDETAILID(String lgPREENREGISTREMENTDETAILID) {
        this.lgPREENREGISTREMENTDETAILID = lgPREENREGISTREMENTDETAILID;
    }

    public String getLgPREENREGISTREMENTID() {
        return lgPREENREGISTREMENTID;
    }

    public void setLgPREENREGISTREMENTID(String lgPREENREGISTREMENTID) {
        this.lgPREENREGISTREMENTID = lgPREENREGISTREMENTID;
    }

    public String getStrREF() {
        return strREF;
    }

    public Integer getIntPRICEREMISE() {
        return intPRICEREMISE;
    }

    public void setIntPRICEREMISE(Integer intPRICEREMISE) {
        this.intPRICEREMISE = intPRICEREMISE;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
    }

    public String getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(String lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getIntCIP() {
        return intCIP;
    }

    public void setIntCIP(String intCIP) {
        this.intCIP = intCIP;
    }

    public String getIntEAN13() {
        return intEAN13;
    }

    public void setIntEAN13(String intEAN13) {
        this.intEAN13 = intEAN13;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Integer getIntPRICEUNITAIR() {
        return intPRICEUNITAIR;
    }

    public void setIntPRICEUNITAIR(Integer intPRICEUNITAIR) {
        this.intPRICEUNITAIR = intPRICEUNITAIR;
    }

    public Integer getIntQUANTITY() {
        return intQUANTITY;
    }

    public void setIntQUANTITY(Integer intQUANTITY) {
        this.intQUANTITY = intQUANTITY;
    }

    public Integer getIntQUANTITYSERVED() {
        return intQUANTITYSERVED;
    }

    public void setIntQUANTITYSERVED(Integer intQUANTITYSERVED) {
        this.intQUANTITYSERVED = intQUANTITYSERVED;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public int getIntAVOIR() {
        return intAVOIR;
    }

    public void setIntAVOIR(int intAVOIR) {
        this.intAVOIR = intAVOIR;
    }

    public boolean getBISAVOIR() {
        return bISAVOIR;
    }

//    public boolean isbISAVOIR() {
//        return bISAVOIR;
//    }
    public void setbISAVOIR(boolean bISAVOIR) {
        this.bISAVOIR = bISAVOIR;
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 97 * hash + Objects.hashCode(this.lgPREENREGISTREMENTDETAILID);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final VenteDetailsDTO other = (VenteDetailsDTO) obj;
        return Objects.equals(this.lgPREENREGISTREMENTDETAILID, other.lgPREENREGISTREMENTDETAILID);
    }

    public VenteDetailsDTO(String cip, String libelle, long valeurCa, long valeurQty, String produit, String grossiste, String familleArticle) {
        this.intCIP = cip;
        this.strNAME = libelle;
        this.intPRICE = (int) valeurCa;
        this.intQUANTITY = (int) valeurQty;
        this.lgFAMILLEID = produit;
        this.typeVente = grossiste;
        this.ticketName = familleArticle;
    }

    public VenteDetailsDTO(long valeurPrixAchat, long valeurPrixVente, long qty) {

        this.intPRICE = (int) valeurPrixVente;
        this.intPRICEREMISE = (int) valeurPrixAchat;
        this.intQUANTITY = (int) qty;

    }

    public VenteDetailsDTO(String cip, String libelle, String rayon, String grossiste, String familleArticle, Date _datePeremption, Integer valeurPrixAchat, Integer valeurPrixVente, Integer qty, String groupById, String groupBy) {
        LocalDate dateTime = DateConverter.convertDateToLocalDate(_datePeremption);
        String date_perem = dateTime.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        this.intCIP = cip;
        this.strNAME = libelle;
        this.intPRICE = qty * valeurPrixVente;
        this.intPRICEREMISE = qty * valeurPrixAchat;
        this.operateur = rayon;
        this.typeVente = grossiste;
        this.ticketName = familleArticle;
        this.dtCREATED = date_perem;
        this.intQUANTITY = qty;
        Period p = Period.between(toDate, dateTime);
        int nbJours = p.getDays();
        int months = p.normalized().getMonths();
        if (nbJours < 0) {
            if (months < 0) {
                this.strSTATUT = "Périmé il y a " + ((-1) * months) + " mois(s) " + ((-1) * nbJours) + " jour(s)";
            } else if (months == 0) {
                this.strSTATUT = "Périmé il y a " + ((-1) * nbJours) + " jour(s)";
            }

        } else if (months == 0 && nbJours == 0) {
            this.strSTATUT = "Périme aujourd'hui";
        } else {
            String nbremois = (months > 0 ? months + " mois " : "");
            String nbreJours = (nbJours > 0 ? nbJours + " jour(s) " : "");
            this.strSTATUT = "Périme dans " + nbremois + "" + nbreJours;
        }
        this.intAVOIR = (months > 0 && nbJours == 0 ? months : (nbJours < 0 ? -1 : nbJours));
        this.lgPREENREGISTREMENTID = groupById;
        this.lgPREENREGISTREMENTDETAILID = groupBy;
    }

    /**
     * constructeur pour le report des articles vendus
     *
     * @param d
     * @param stock
     */
    public VenteDetailsDTO(TPreenregistrementDetail d, int stock) {
        TPreenregistrement p = d.getLgPREENREGISTREMENTID();
        TUser u = p.getLgUSERCAISSIERID();
        TFamille f = d.getLgFAMILLEID();
        this.strREF = p.getStrREF();
        this.strNAME = f.getStrNAME();
        this.intCIP = f.getIntCIP();
        this.intEAN13 = f.getIntEAN13();
        this.dtCREATED = dateFormat.format(d.getDtUPDATED());
        this.HEURE = heureFormat.format(d.getDtUPDATED());
        this.ticketNum = p.getStrREFTICKET();
        this.operateur = u.getStrFIRSTNAME() + " " + u.getStrLASTNAME();
        this.typeVente = p.getStrTYPEVENTE();
        this.intAVOIR = d.getIntAVOIR();
        this.dateOp = DateConverter.convertDateToLocalDateTime(p.getDtUPDATED());
        this.intQUANTITY = d.getIntQUANTITY();
        this.intPRICE = d.getIntPRICE();
        this.currentStock = stock;
    }

}