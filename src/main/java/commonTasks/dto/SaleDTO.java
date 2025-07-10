/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
public class SaleDTO implements Serializable {
    private Integer discountAmount;
    private String customerNum;
    private String numberTransaction;
    private Integer salesAmount;
    private String userFullName;
    private Integer grossAmount;
    private Integer netAmount;
    private Integer taxAmount;
    private Integer costAmount;
    private Instant createdAt;
    private Instant updatedAt;
    private List<SaleLineDTO> salesLines = new ArrayList<>();
    private List<PaymentDTO> payments = new ArrayList<>();
    private Integer dateDimensionId;
    private String sellerUserName;
    private SaleDTO canceledSale;
    private Instant effectiveUpdateDate;
    private boolean toIgnore;
    private String ticketNumber;
    private Integer payrollAmount;
    private Integer amountToBePaid;
    private Integer amountToBeTakenIntoAccount;
    private String codeRemise;
    private Integer restToPay;
    @NotNull
    private String type;
    private Boolean copy = false;
    private boolean imported = false;
    private Integer margeUg = 0;
    private Integer montantttcUg = 0;
    private Integer montantnetUg = 0;
    private Integer montantTvaUg = 0;

    private Integer marge = 0;

    public Boolean getCopy() {
        return copy;
    }

    public void setCopy(Boolean copy) {
        this.copy = copy;
    }

    public boolean isImported() {
        return imported;
    }

    public void setImported(boolean imported) {
        this.imported = imported;
    }

    public Integer getMargeUg() {
        return margeUg;
    }

    public void setMargeUg(Integer margeUg) {
        this.margeUg = margeUg;
    }

    public Integer getMontantttcUg() {
        return montantttcUg;
    }

    public void setMontantttcUg(Integer montantttcUg) {
        this.montantttcUg = montantttcUg;
    }

    public Integer getMontantnetUg() {
        return montantnetUg;
    }

    public void setMontantnetUg(Integer montantnetUg) {
        this.montantnetUg = montantnetUg;
    }

    public Integer getMontantTvaUg() {
        return montantTvaUg;
    }

    public void setMontantTvaUg(Integer montantTvaUg) {
        this.montantTvaUg = montantTvaUg;
    }

    public Integer getMarge() {
        return marge;
    }

    public void setMarge(Integer marge) {
        this.marge = marge;
    }

    public Integer getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(Integer discountAmount) {
        this.discountAmount = discountAmount;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getCustomerNum() {
        return customerNum;
    }

    public void setCustomerNum(String customerNum) {
        this.customerNum = customerNum;
    }

    public String getNumberTransaction() {
        return numberTransaction;
    }

    public void setNumberTransaction(String numberTransaction) {
        this.numberTransaction = numberTransaction;
    }

    public Integer getSalesAmount() {
        return salesAmount;
    }

    public void setSalesAmount(Integer salesAmount) {
        this.salesAmount = salesAmount;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public Integer getGrossAmount() {
        return grossAmount;
    }

    public void setGrossAmount(Integer grossAmount) {
        this.grossAmount = grossAmount;
    }

    public Integer getNetAmount() {
        return netAmount;
    }

    public void setNetAmount(Integer netAmount) {
        this.netAmount = netAmount;
    }

    public Integer getTaxAmount() {
        return taxAmount;
    }

    public void setTaxAmount(Integer taxAmount) {
        this.taxAmount = taxAmount;
    }

    public Integer getCostAmount() {
        return costAmount;
    }

    public void setCostAmount(Integer costAmount) {
        this.costAmount = costAmount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<SaleLineDTO> getSalesLines() {
        return salesLines;
    }

    public void setSalesLines(List<SaleLineDTO> salesLines) {
        this.salesLines = salesLines;
    }

    public List<PaymentDTO> getPayments() {
        return payments;
    }

    public void setPayments(List<PaymentDTO> payments) {
        this.payments = payments;
    }

    public Integer getDateDimensionId() {
        return dateDimensionId;
    }

    public void setDateDimensionId(Integer dateDimensionId) {
        this.dateDimensionId = dateDimensionId;
    }

    public String getSellerUserName() {
        return sellerUserName;
    }

    public void setSellerUserName(String sellerUserName) {
        this.sellerUserName = sellerUserName;
    }

    public SaleDTO getCanceledSale() {
        return canceledSale;
    }

    public void setCanceledSale(SaleDTO canceledSale) {
        this.canceledSale = canceledSale;
    }

    public Instant getEffectiveUpdateDate() {
        return effectiveUpdateDate;
    }

    public void setEffectiveUpdateDate(Instant effectiveUpdateDate) {
        this.effectiveUpdateDate = effectiveUpdateDate;
    }

    public boolean isToIgnore() {
        return toIgnore;
    }

    public void setToIgnore(boolean toIgnore) {
        this.toIgnore = toIgnore;
    }

    public String getTicketNumber() {
        return ticketNumber;
    }

    public void setTicketNumber(String ticketNumber) {
        this.ticketNumber = ticketNumber;
    }

    public Integer getPayrollAmount() {
        return payrollAmount;
    }

    public void setPayrollAmount(Integer payrollAmount) {
        this.payrollAmount = payrollAmount;
    }

    public Integer getAmountToBePaid() {
        return amountToBePaid;
    }

    public void setAmountToBePaid(Integer amountToBePaid) {
        this.amountToBePaid = amountToBePaid;
    }

    public Integer getAmountToBeTakenIntoAccount() {
        return amountToBeTakenIntoAccount;
    }

    public void setAmountToBeTakenIntoAccount(Integer amountToBeTakenIntoAccount) {
        this.amountToBeTakenIntoAccount = amountToBeTakenIntoAccount;
    }

    public String getCodeRemise() {
        return codeRemise;
    }

    public void setCodeRemise(String codeRemise) {
        this.codeRemise = codeRemise;
    }

    public Integer getRestToPay() {
        return restToPay;
    }

    public void setRestToPay(Integer restToPay) {
        this.restToPay = restToPay;
    }

}
