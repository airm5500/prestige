/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TFamille;
import dal.TFamillearticle;
import dal.TGrossiste;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TUser;
import dal.TWarehouse;
import dal.TZoneGeographique;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Objects;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author Kobena
 */
public class VenteDetailsDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String lgPREENREGISTREMENTDETAILID = "";
    private String lgPREENREGISTREMENTID = "";
    private String strREF;
    private String lgFAMILLEID;
    private String strNAME;
    private String intCIP;
    private String intEAN13;
    private String strSTATUT;
    private String dtCREATED;
    private String HEURE;
    private String ticketName;
    private String ticketNum;
    private Integer intPRICEUNITAIR = 0;
    private Integer intQUANTITY = 0;
    private Integer intQUANTITYSERVED = 0;
    private Integer intPRICE = 0;
    private Integer intPRICEREMISE = 0;
    private Integer stockInitial;
    private Integer stockFinal;
    private String operateur;
    private String strRefBon;
    private String dateHeure;
    private String caissier;
    private String caissierId;
    private Date dateOperation;
    private String typeVente;
    private String numOrder;
    private String medecinId;
    private String commentaire;
    private String nom;
    private int intAVOIR;
    private int currentStock;
    private int uniteGratuite;
    private int montantUg;
    private int seuil;
    private int stockUg;
    private int montantTva;
    private int valeurTva;
    private int prixHt;
    private int montantHt;
    private int montantNetHt;
    private int prixAchat;
    private boolean bISAVOIR;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private final SimpleDateFormat dateFormatHeure = new SimpleDateFormat("dd/MM/yyyy HH:mm");
    private final SimpleDateFormat heureFormat = new SimpleDateFormat("HH:mm");
    private LocalDateTime dateOp;
    private boolean avoir;
    private final LocalDate toDate = LocalDate.now();
    private String rayonId;
    private String libelleRayon;
    private String familleId;
    private String libelleFamille;
    private String grossisteId;
    private String libelleGrossiste;
    private boolean deconditionne;

    public Integer getStockInitial() {
        return stockInitial;
    }

    public void setStockInitial(Integer stockInitial) {
        this.stockInitial = stockInitial;
    }

    public Integer getStockFinal() {
        return stockFinal;
    }

    public void setStockFinal(Integer stockFinal) {
        this.stockFinal = stockFinal;
    }

    public boolean isDeconditionne() {
        return deconditionne;
    }

    public void setDeconditionne(boolean deconditionne) {
        this.deconditionne = deconditionne;
    }

    public String getCaissier() {
        return caissier;
    }

    public void setCaissier(String caissier) {
        this.caissier = caissier;
    }

    public String getCaissierId() {
        return caissierId;
    }

    public void setCaissierId(String caissierId) {
        this.caissierId = caissierId;
    }

    public String getRayonId() {
        return rayonId;
    }

    public void setRayonId(String rayonId) {
        this.rayonId = rayonId;
    }

    public String getLibelleRayon() {
        return libelleRayon;
    }

    public void setLibelleRayon(String libelleRayon) {
        this.libelleRayon = libelleRayon;
    }

    public String getNumOrder() {
        return numOrder;
    }

    public int getMontantNetHt() {
        return montantNetHt;
    }

    public void setMontantNetHt(int montantNetHt) {
        this.montantNetHt = montantNetHt;
    }

    public int getUniteGratuite() {
        return uniteGratuite;
    }

    public int getMontantUg() {
        return montantUg;
    }

    public void setMontantUg(int montantUg) {
        this.montantUg = montantUg;
    }

    public void setUniteGratuite(int uniteGratuite) {
        this.uniteGratuite = uniteGratuite;
    }

    public void setNumOrder(String numOrder) {
        this.numOrder = numOrder;
    }

    public String getMedecinId() {
        return medecinId;
    }

    public void setMedecinId(String medecinId) {
        this.medecinId = medecinId;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public int getMontantHt() {
        return montantHt;
    }

    public void setMontantHt(int montantHt) {
        this.montantHt = montantHt;
    }

    public VenteDetailsDTO operateur(TUser operateur) {
        this.operateur = operateur.getStrFIRSTNAME() + " " + operateur.getStrLASTNAME();
        return this;
    }

    public VenteDetailsDTO stockUg(int stockUg) {
        this.stockUg = stockUg;
        return this;
    }

    public int getPrixHt() {
        return prixHt;
    }

    public void setPrixHt(int prixHt) {
        this.prixHt = prixHt;
    }

    public int getStockUg() {
        return stockUg;
    }

    public void setStockUg(int stockUg) {
        this.stockUg = stockUg;
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

    public String getFamilleId() {
        return familleId;
    }

    public void setFamilleId(String familleId) {
        this.familleId = familleId;
    }

    public String getLibelleFamille() {
        return libelleFamille;
    }

    public void setLibelleFamille(String libelleFamille) {
        this.libelleFamille = libelleFamille;
    }

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
    }

    public String getLibelleGrossiste() {
        return libelleGrossiste;
    }

    public void setLibelleGrossiste(String libelleGrossiste) {
        this.libelleGrossiste = libelleGrossiste;
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
        this.intQUANTITYSERVED = (p.getStrSTATUT().equals(Constant.STATUT_IS_CLOSED)
                ? d.getIntQUANTITYSERVED() + d.getIntAVOIR() : d.getIntQUANTITYSERVED());
        this.intPRICE = d.getIntPRICE();
        this.intAVOIR = d.getIntAVOIR();
        this.bISAVOIR = d.getBISAVOIR();
        this.intPRICEREMISE = d.getIntPRICEREMISE();
        this.dateOp = DateConverter.convertDateToLocalDateTime(p.getDtUPDATED());
        this.dtCREATED = dateFormat.format(p.getDtUPDATED());
        this.ticketName = f.getStrNAME();
        this.uniteGratuite = d.getIntUG();
        this.montantUg = d.getIntUG() * d.getIntPRICEUNITAIR();
        this.dateHeure = dateFormatHeure.format(p.getDtUPDATED());
        this.valeurTva = d.getValeurTva();
        this.montantTva = d.getMontantTva();
        double valeurTva1 = 1 + (Double.valueOf(d.getValeurTva()) / 100);
        int htAmont = (int) Math.ceil(d.getIntPRICE() / valeurTva1);
        int prixHt0 = (int) Math.ceil(d.getIntPRICEUNITAIR() / valeurTva1);
        this.prixHt = prixHt0;
        this.montantHt = htAmont;
        htAmont = (int) Math.ceil((d.getIntPRICE() - d.getIntPRICEREMISE()) / valeurTva1);
        this.montantNetHt = htAmont;
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
        this.intQUANTITYSERVED = (p.getStrSTATUT().equals(Constant.STATUT_IS_CLOSED)
                ? d.getIntQUANTITYSERVED() + d.getIntAVOIR() : d.getIntQUANTITYSERVED());
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
        this.valeurTva = d.getValeurTva();
        this.montantTva = d.getMontantTva();
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

    public VenteDetailsDTO(String cip, String libelle, long valeurCa, long valeurQty, String produit, String grossiste,
            String familleArticle) {
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

    public VenteDetailsDTO(String cip, String libelle, String rayon, String grossiste, String familleArticle,
            Date datePeremption0, Integer valeurPrixAchat, Integer valeurPrixVente, Integer qty, String groupById,
            String groupBy, int seuil) {
        LocalDate dateTime = DateConverter.convertDateToLocalDate(datePeremption0);
        String datePerem0 = dateTime.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        this.intCIP = cip;
        this.strNAME = libelle;
        this.intPRICE = qty * valeurPrixVente;
        this.intPRICEREMISE = qty * valeurPrixAchat;
        this.operateur = rayon;
        this.typeVente = grossiste;
        this.ticketName = familleArticle;
        this.dtCREATED = datePerem0;
        this.intQUANTITY = qty;
        this.seuil = seuil;

        Period p = Period.between(toDate, dateTime);
        int years = p.getYears();
        int months = p.getMonths();
        int days = p.getDays();

        if (dateTime.isBefore(toDate)) {
            Period diff = Period.between(dateTime, toDate);

            String txtYears = diff.getYears() > 0 ? diff.getYears() + " an(s) " : "";
            String txtMonths = diff.getMonths() > 0 ? diff.getMonths() + " mois " : "";
            String txtDays = diff.getDays() > 0 ? diff.getDays() + " jour(s)" : "";
            this.strSTATUT = "Périmé il y a " + txtYears + txtMonths + txtDays;

        } else if (dateTime.isEqual(toDate)) {
            days = 0;
            this.strSTATUT = "Périme aujourd'hui";
        } else {
            String txtYears = years > 0 ? years + " an(s) " : "";
            String txtMonths = months > 0 ? months + " mois " : "";
            String txtDays = days > 0 ? days + " jour(s)" : "";
            this.strSTATUT = "Périme dans " + txtYears + txtMonths + txtDays;

        }
        this.intAVOIR = days < 0 || months < 0 || years < 0 ? -1 : days;
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
        this.valeurTva = d.getValeurTva();
        this.montantTva = d.getMontantTva();
    }

    public int getMontantTva() {
        return montantTva;
    }

    public void setMontantTva(int montantTva) {
        this.montantTva = montantTva;
    }

    public int getValeurTva() {
        return valeurTva;
    }

    public void setValeurTva(int valeurTva) {
        this.valeurTva = valeurTva;
    }

    public int getSeuil() {
        return seuil;
    }

    public void setSeuil(int seuil) {
        this.seuil = seuil;
    }

    public int getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(int prixAchat) {
        this.prixAchat = prixAchat;
    }

    public VenteDetailsDTO(String lgFAMILLEID, String strNAME, String intCIP, Date dateHeure, TUser operateur,
            TUser caissier, int seuil, int stock, int qty, int avoir, String refVente, String typeVente, String rayonId,
            String libelleRayon, int price, String tickeNum) {
        this.lgFAMILLEID = lgFAMILLEID;
        this.strNAME = strNAME;
        this.intCIP = intCIP;
        this.operateur = operateur.getStrFIRSTNAME() + " " + operateur.getStrLASTNAME();
        this.dtCREATED = dateFormat.format(dateHeure);
        this.HEURE = heureFormat.format(dateHeure);
        this.dateHeure = dateFormatHeure.format(dateHeure);
        this.caissier = caissier.getStrFIRSTNAME() + " " + caissier.getStrLASTNAME();
        this.caissierId = caissier.getLgUSERID();
        this.seuil = seuil;
        this.currentStock = stock;
        this.intQUANTITY = qty;
        this.rayonId = rayonId;
        this.libelleRayon = libelleRayon;
        this.strREF = refVente;
        this.typeVente = typeVente;
        this.intPRICE = price;
        this.intAVOIR = avoir;
        this.ticketNum = tickeNum;

    }

    public VenteDetailsDTO(String lgFAMILLEID, String strNAME, String intCIP, TUser operateur, TUser caissier,
            int stock, long qty, long avoir, String rayonId, String libelleRayon, long price) {
        this.lgFAMILLEID = lgFAMILLEID;
        this.strNAME = strNAME;
        this.intCIP = intCIP;
        this.operateur = operateur.getStrFIRSTNAME() + " " + operateur.getStrLASTNAME();
        this.caissier = caissier.getStrFIRSTNAME() + " " + caissier.getStrLASTNAME();
        this.caissierId = caissier.getLgUSERID();
        this.currentStock = stock;
        this.intQUANTITY = (int) qty;
        this.rayonId = rayonId;
        this.libelleRayon = libelleRayon;
        this.intPRICE = (int) price;
        this.intAVOIR = (int) avoir;
    }

    private String lgFAMILLEPARENTID;

    public String getLgFAMILLEPARENTID() {
        return lgFAMILLEPARENTID;
    }

    public void setLgFAMILLEPARENTID(String lgFAMILLEPARENTID) {
        this.lgFAMILLEPARENTID = lgFAMILLEPARENTID;
    }

    public VenteDetailsDTO(String produit, long quantiteVendue, String grossiste, Short isDecond,
            String lgFAMILLEPARENTID) {
        this.intQUANTITY = (int) quantiteVendue;
        this.lgFAMILLEID = produit;
        this.typeVente = grossiste;
        this.deconditionne = isDecond == 1;
        this.lgFAMILLEPARENTID = lgFAMILLEPARENTID;
        this.lgPREENREGISTREMENTDETAILID = produit;

    }

    public VenteDetailsDTO(TWarehouse warehouse, Integer grouby) {
        this.dateOperation = warehouse.getDtCREATED();
        TFamille famille = warehouse.getLgFAMILLEID();
        this.lgFAMILLEID = famille.getLgFAMILLEID();
        this.strNAME = famille.getStrNAME();
        this.intCIP = famille.getIntCIP();
        this.stockFinal = warehouse.getStockFinal();
        this.stockInitial = warehouse.getStockInitial();
        this.operateur = warehouse.getLgUSERID().getStrFIRSTNAME() + " " + warehouse.getLgUSERID().getStrLASTNAME();
        try {
            this.dtCREATED = dateFormat.format(warehouse.getDtPEREMPTION());
        } catch (Exception e) {
        }

        this.intQUANTITY = warehouse.getIntNUMBER();
        TZoneGeographique zone = famille.getLgZONEGEOID();
        if (zone != null) {
            this.rayonId = zone.getLgZONEGEOID();
            this.libelleRayon = zone.getStrLIBELLEE();
        }
        this.intPRICE = warehouse.getIntNUMBER() * famille.getIntPRICE();
        this.dateHeure = dateFormatHeure.format(warehouse.getDtCREATED());
        this.intPRICEUNITAIR = famille.getIntPRICE();
        this.ticketNum = warehouse.getIntNUMLOT();
        TGrossiste g = famille.getLgGROSSISTEID();
        if (g != null) {
            this.grossisteId = g.getLgGROSSISTEID();
            this.libelleGrossiste = g.getStrLIBELLE();
        }
        TFamillearticle famillearticle = famille.getLgFAMILLEARTICLEID();
        this.familleId = famillearticle.getLgFAMILLEARTICLEID();
        this.libelleFamille = famillearticle.getStrLIBELLE();
        if (grouby != null) {
            if (grouby.compareTo(0) == 0) {
                this.lgPREENREGISTREMENTDETAILID = this.familleId;
                this.lgPREENREGISTREMENTID = this.libelleFamille;
            } else if (grouby.compareTo(1) == 0) {
                this.lgPREENREGISTREMENTDETAILID = this.rayonId;
                this.lgPREENREGISTREMENTID = this.libelleRayon;
            } else if (grouby.compareTo(2) == 0) {
                this.lgPREENREGISTREMENTDETAILID = this.grossisteId;
                this.lgPREENREGISTREMENTID = this.libelleGrossiste;
            }
        }
        this.prixAchat = famille.getIntPAF();
    }

}
