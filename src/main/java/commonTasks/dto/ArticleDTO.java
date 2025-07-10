/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TFamille;
import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Objects;
import org.apache.commons.lang3.StringUtils;

/**
 *
 * @author koben
 */
public class ArticleDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private SimpleDateFormat dateFormatFull = new SimpleDateFormat("dd/MM/yyyy HH:mm");
    private SimpleDateFormat heureFormat = new SimpleDateFormat("HH:mm");
    private String code, libelle, filterId, filterLibelle, lastDate, lastHour, id, grossisteId, codeGrossiste;
    private int stock, qtyEntree, prixAchat, prixVente, qteSurplus, qteVendue, consommation, valeurQteSurplus,
            valeurVente, stockMoyen, seuiRappro, qteReappro, stockDetail, consommationsOne, moyen3Mois,
            consommationsTwo, cumulConso, consommationsThree, consommationUn, consommationsFour, consommationsFive,
            consommationsSix;
    private double coefficient;
    private String codeEan, datePeremption, rayonLibelle, codeEtiquette, tva, dateEntree, dateBon, familleLibelle,
            dateInventaire, lastDateVente;

    public ArticleDTO qtyEntree(int qtyEntree) {
        this.qtyEntree = qtyEntree;
        return this;
    }

    public int getMoyen3Mois() {
        moyen3Mois = (consommationsThree + consommationsOne + consommationsTwo) / 3;

        return moyen3Mois;
    }

    public int getQtyEntree() {
        return qtyEntree;
    }

    public void setQtyEntree(int qtyEntree) {
        this.qtyEntree = qtyEntree;
    }

    public String getDatePeremption() {
        return datePeremption;
    }

    public ArticleDTO cumulConso(int cumulConso) {
        this.cumulConso = cumulConso;
        return this;
    }

    public int getCumulConso() {
        cumulConso = (consommationsOne + consommationsTwo + consommationsThree + consommationUn + consommationsFour
                + consommationsFive + consommationsSix);
        return cumulConso;
    }

    public void setCumulConso(int cumulConso) {
        this.cumulConso = cumulConso;
    }

    public void setDatePeremption(String datePeremption) {
        this.datePeremption = datePeremption;
    }

    public ArticleDTO datePeremption(String datePeremption) {
        try {

            if (!StringUtils.isEmpty(datePeremption)) {
                this.datePeremption = LocalDate.parse(datePeremption.substring(0, datePeremption.indexOf(" ")))
                        .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            }

        } catch (Exception e) {
            // e.printStackTrace();
        }

        return this;
    }

    public ArticleDTO seuiRappro(int seuiRappro) {
        this.consommationUn = seuiRappro;
        return this;
    }

    public ArticleDTO qteReappro(int qteReappro) {
        this.qteReappro = qteReappro;
        return this;
    }

    public String getLastDateVente() {
        return lastDateVente;
    }

    public ArticleDTO lastDateVente(Date lastDateVente) {
        if (lastDateVente != null) {
            this.lastDateVente = dateFormatFull.format(lastDateVente);
        }
        return this;
    }

    public ArticleDTO dateInventaire(Date date) {
        if (date != null) {
            this.dateInventaire = dateFormatFull.format(date);
        }
        return this;
    }

    public ArticleDTO dateEntree(Date date) {
        if (date != null) {
            this.dateEntree = dateFormatFull.format(date);
        }
        return this;
    }

    public ArticleDTO dateBon(Date date) {
        if (date != null) {
            this.dateBon = dateFormatFull.format(date);
        }
        return this;
    }

    public void setLastDateVente(String lastDateVente) {
        this.lastDateVente = lastDateVente;
    }

    public int getConsommationUn() {
        return consommationUn;
    }

    public void setConsommationUn(int consommationUn) {
        this.consommationUn = consommationUn;
    }

    public ArticleDTO consommationUn(int consommationUn) {
        this.consommationUn = consommationUn;
        return this;
    }

    public int getSeuiRappro() {
        return seuiRappro;
    }

    public void setSeuiRappro(int seuiRappro) {
        this.seuiRappro = seuiRappro;
    }

    public int getQteReappro() {
        return qteReappro;
    }

    public void setQteReappro(int qteReappro) {
        this.qteReappro = qteReappro;
    }

    public ArticleDTO(String code, String libelle, String filterId, String filterLibelle, int prixAchat, int prixVente,
            String id, String grossisteId) {
        this.code = code;
        this.libelle = libelle;
        this.filterId = filterId;
        this.filterLibelle = filterLibelle;
        this.prixAchat = prixAchat;
        this.prixVente = prixVente;
        this.id = id;
        this.grossisteId = grossisteId;
    }

    public String getId() {
        return id;
    }

    public ArticleDTO id(String id) {
        this.id = id;
        return this;
    }

    public ArticleDTO() {
    }

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
    }

    public ArticleDTO grossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
        return this;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public ArticleDTO code(String code) {
        this.code = code;
        return this;
    }

    public String getLibelle() {
        return libelle;
    }

    public String getFilterId() {
        return filterId;
    }

    public ArticleDTO filterId(String filterId) {
        this.filterId = filterId;
        return this;
    }

    public ArticleDTO prixAchat(int prixAchat) {
        this.prixAchat = prixAchat;
        return this;
    }

    public ArticleDTO prixVente(int prixVente) {
        this.prixVente = prixVente;
        return this;
    }

    public ArticleDTO libelle(String libelle) {
        this.libelle = libelle;
        return this;
    }

    public String getFilterLibelle() {
        return filterLibelle;
    }

    public ArticleDTO filterLibelle(String filterLibelle) {
        this.filterLibelle = filterLibelle;
        return this;
    }

    public String getLastDate() {
        return lastDate;
    }

    public String getLastHour() {
        return lastHour;
    }

    public int getStock() {
        return stock;
    }

    public ArticleDTO qteVendue(int qteVendue) {
        this.qteVendue = qteVendue;
        return this;
    }

    public int getQteVendue() {
        return qteVendue;
    }

    public void setQteVendue(int qteVendue) {
        this.qteVendue = qteVendue;
    }

    public int getPrixAchat() {
        return prixAchat;
    }

    public int getPrixVente() {
        return prixVente;
    }

    public void setDateFormat(SimpleDateFormat dateFormat) {
        this.dateFormat = dateFormat;
    }

    public void setHeureFormat(SimpleDateFormat heureFormat) {
        this.heureFormat = heureFormat;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public void setFilterId(String filterId) {
        this.filterId = filterId;
    }

    public void setFilterLibelle(String filterLibelle) {
        this.filterLibelle = filterLibelle;
    }

    public void setLastDate(String lastDate) {
        this.lastDate = lastDate;
    }

    public void setLastHour(String lastHour) {
        this.lastHour = lastHour;
    }

    public void setStock(int stock) {
        this.stock = stock;
    }

    public void setPrixAchat(int prixAchat) {
        this.prixAchat = prixAchat;
    }

    public void setPrixVente(int prixVente) {
        this.prixVente = prixVente;
    }

    public ArticleDTO stock(int stock) {
        this.stock = stock;
        return this;
    }

    public ArticleDTO lastDate(Date lastDate) {
        if (lastDate != null) {
            this.lastDate = dateFormat.format(lastDate);
            this.lastHour = heureFormat.format(lastDate);
        }

        return this;
    }

    public String getCodeGrossiste() {
        return codeGrossiste;
    }

    public ArticleDTO codeGrossiste(String codeGrossiste) {
        this.codeGrossiste = codeGrossiste;
        return this;
    }

    public void setCodeGrossiste(String codeGrossiste) {
        this.codeGrossiste = codeGrossiste;
    }

    public int getQteSurplus() {
        return qteSurplus;
    }

    public ArticleDTO qteSurplus(int nbreMois) {
        this.qteSurplus = (int) (this.stock - (this.stockMoyen * nbreMois));
        return this;
    }

    public ArticleDTO valeurQteSurplus(int valeurQteSurplus) {
        try {
            this.valeurQteSurplus = valeurQteSurplus;
        } catch (Exception e) {
        }

        return this;
    }

    public void setQteSurplus(int qteSurplus) {
        this.qteSurplus = qteSurplus;
    }

    public int getValeurQteSurplus() {
        try {
            this.valeurQteSurplus = this.qteSurplus * this.prixAchat;
        } catch (Exception e) {
        }
        return valeurQteSurplus;
    }

    public int getValeurVente() {
        try {
            this.valeurVente = this.qteSurplus * this.prixVente;
        } catch (Exception e) {
        }
        return valeurVente;
    }

    public void setValeurQteSurplus(int valeurQteSurplus) {
        this.valeurQteSurplus = valeurQteSurplus;
    }

    public double getCoefficient() {

        return coefficient;
    }

    public void setCoefficient(double coefficient) {
        this.coefficient = coefficient;
    }

    public int getStockMoyen() {
        return stockMoyen;
    }

    public void setStockMoyen(int stockMoyen) {
        this.stockMoyen = stockMoyen;
    }

    public ArticleDTO stockMoyen(int nbreConsommation) {
        try {
            float d = (consommationsOne + consommationsTwo + consommationsThree);
            this.stockMoyen = Math.round(d / nbreConsommation);
        } catch (Exception e) {
        }

        return this;
    }

    public ArticleDTO coefficient(double nbreMois) {
        try {
            float d = (consommationsOne + consommationsTwo + consommationsThree);
            double _stockMoyen = (d / nbreMois);
            long a = Math.round(_stockMoyen);
            _stockMoyen = a;
            coefficient = new BigDecimal(this.stock / _stockMoyen).setScale(2, RoundingMode.UP).doubleValue();
        } catch (Exception e) {
        }
        return this;
    }

    public int getConsommation() {
        return consommation;
    }

    public void setConsommation(int consommation) {
        this.consommation = consommation;
    }

    public ArticleDTO consommation(int consommation) {
        this.consommation = consommation;
        return this;
    }

    public void setValeurVente(int valeurVente) {
        this.valeurVente = valeurVente;
    }

    @Override
    public String toString() {
        return "ArticleDTO{" + "code=" + code + ", libelle=" + libelle + ", filterId=" + filterId + ", filterLibelle="
                + filterLibelle + ", lastDate=" + lastDate + ", lastHour=" + lastHour + ", id=" + id + ", grossisteId="
                + grossisteId + ", codeGrossiste=" + codeGrossiste + ", stock=" + stock + ", prixAchat=" + prixAchat
                + ", prixVente=" + prixVente + ", qteSurplus=" + qteSurplus + ", valeurQteSurplus=" + valeurQteSurplus
                + ", qteVendue=" + qteVendue + ", consommation=" + consommation + ", coefficient=" + coefficient
                + ", stockMoyen=" + stockMoyen + '}';
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 11 * hash + Objects.hashCode(this.id);
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
        final ArticleDTO other = (ArticleDTO) obj;
        if (!Objects.equals(this.id, other.id)) {
            return false;
        }
        return true;
    }

    public ArticleDTO consommationsOne(int consommationsOne) {
        this.consommationsOne = consommationsOne;
        return this;
    }

    public ArticleDTO consommationsTwo(int consommationsTwo) {
        this.consommationsTwo = consommationsTwo;
        return this;
    }

    public ArticleDTO consommationsThree(int consommationsThree) {
        this.consommationsThree = consommationsThree;
        return this;
    }

    public int getConsommationsOne() {
        return consommationsOne;
    }

    public void setConsommationsOne(int consommationsOne) {
        this.consommationsOne = consommationsOne;
    }

    public int getConsommationsTwo() {
        return consommationsTwo;
    }

    public void setConsommationsTwo(int consommationsTwo) {
        this.consommationsTwo = consommationsTwo;
    }

    public int getConsommationsThree() {
        return consommationsThree;
    }

    public void setConsommationsThree(int consommationsThree) {
        this.consommationsThree = consommationsThree;
    }

    public ArticleDTO consommationsFour(int consommationsFour) {
        this.consommationsFour = consommationsFour;
        return this;
    }

    public int getConsommationsFour() {
        return consommationsFour;
    }

    public void setConsommationsFour(int consommationsFour) {
        this.consommationsFour = consommationsFour;
    }

    public ArticleDTO consommationsFive(int consommationsFive) {
        this.consommationsFive = consommationsFive;
        return this;
    }

    public int getConsommationsFive() {
        return consommationsFive;
    }

    public ArticleDTO consommationsSix(int consommationsSix) {
        this.consommationsSix = consommationsSix;
        return this;
    }

    public void setConsommationsFive(int consommationsFive) {
        this.consommationsFive = consommationsFive;
    }

    public int getConsommationsSix() {
        return consommationsSix;
    }

    public void setConsommationsSix(int consommationsSix) {
        this.consommationsSix = consommationsSix;
    }

    public String getCodeEan() {
        return codeEan;
    }

    public void setCodeEan(String codeEan) {
        this.codeEan = codeEan;
    }

    public String getRayonLibelle() {
        return rayonLibelle;
    }

    public void setRayonLibelle(String rayonLibelle) {
        this.rayonLibelle = rayonLibelle;
    }

    public String getCodeEtiquette() {
        return codeEtiquette;
    }

    public void setCodeEtiquette(String codeEtiquette) {
        this.codeEtiquette = codeEtiquette;
    }

    public String getTva() {
        return tva;
    }

    public void setTva(String tva) {
        this.tva = tva;
    }

    public String getDateEntree() {
        return dateEntree;
    }

    public void setDateEntree(String dateEntree) {
        this.dateEntree = dateEntree;
    }

    public String getDateBon() {
        return dateBon;
    }

    public void setDateBon(String dateBon) {
        this.dateBon = dateBon;
    }

    public String getFamilleLibelle() {
        return familleLibelle;
    }

    public void setFamilleLibelle(String familleLibelle) {
        this.familleLibelle = familleLibelle;
    }

    public int getStockDetail() {
        return stockDetail;
    }

    public void setStockDetail(int stockDetail) {
        this.stockDetail = stockDetail;
    }

    public String getDateInventaire() {
        return dateInventaire;
    }

    public void setDateInventaire(String dateInventaire) {
        this.dateInventaire = dateInventaire;
    }

    public ArticleDTO(TFamille famille, int stock, String filterId, String filterLibelle) {
        this.code = famille.getIntCIP();
        this.libelle = famille.getStrNAME();
        this.id = famille.getLgFAMILLEID();
        this.stock = stock;
        this.prixAchat = famille.getIntPAF();
        this.prixVente = famille.getIntPRICE();
        this.filterId = filterId;
        this.filterLibelle = filterLibelle;
        this.seuiRappro = famille.getIntSTOCKREAPROVISONEMENT();
        this.qteReappro = famille.getIntQTEREAPPROVISIONNEMENT();
        this.stockDetail = famille.getIntNUMBERDETAIL();
        this.codeEan = famille.getIntEAN13();
        try {
            this.grossisteId = famille.getLgGROSSISTEID().getLgGROSSISTEID();
        } catch (Exception e) {
        }
        try {
            this.rayonLibelle = famille.getLgZONEGEOID().getStrLIBELLEE();
        } catch (Exception e) {
        }
        try {
            this.codeEtiquette = famille.getLgTYPEETIQUETTEID().getStrDESCRIPTION();
        } catch (Exception e) {
        }
        try {
            this.familleLibelle = famille.getLgFAMILLEARTICLEID().getStrLIBELLE();
        } catch (Exception e) {
        }
        try {
            this.tva = famille.getLgCODETVAID().getStrNAME();
        } catch (Exception e) {
        }

    }

}
