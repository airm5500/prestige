/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.time.Instant;

/**
 *
 * @author koben
 */
public class PaymentDTO {

    private Integer netAmount;
    private Integer paidAmount;
    private Integer reelPaidAmount;
    private Integer restToPay;
    private Instant createdAt;
    private Instant updatedAt;
    private String paymentCode;

    public Integer getReelPaidAmount() {
        return reelPaidAmount;
    }

    public void setReelPaidAmount(Integer reelPaidAmount) {
        this.reelPaidAmount = reelPaidAmount;
    }

    public Integer getNetAmount() {
        return netAmount;
    }

    public void setNetAmount(Integer netAmount) {
        this.netAmount = netAmount;
    }

    public Integer getPaidAmount() {
        return paidAmount;
    }

    public void setPaidAmount(Integer paidAmount) {
        this.paidAmount = paidAmount;
    }

    public Integer getRestToPay() {
        return restToPay;
    }

    public void setRestToPay(Integer restToPay) {
        this.restToPay = restToPay;
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

    public String getPaymentCode() {
        return paymentCode;
    }

    public void setPaymentCode(String paymentCode) {
        this.paymentCode = paymentCode;
    }

}
