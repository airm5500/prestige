/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.StockDailyValue;
import java.io.Serializable;

/**
 *
 * @author koben
 */
public class StockDailyValueDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private long valeurAchat;
    private long valeurVente;
    private String date;

    public long getValeurAchat() {
        return valeurAchat;
    }

    public void setValeurAchat(long valeurAchat) {
        this.valeurAchat = valeurAchat;
    }

    public long getValeurVente() {
        return valeurVente;
    }

    public void setValeurVente(long valeurVente) {
        this.valeurVente = valeurVente;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public StockDailyValueDTO(StockDailyValue sdv) {
        this.valeurAchat = sdv.getValeurAchat();
        this.valeurVente = sdv.getValeurVente();
        // L'id de StockDailyValue est la date au format numerique yyyyMMdd
        String s = String.valueOf(sdv.getId());
        if (s.length() == 8) {
            this.date = s.substring(0, 4) + "-" + s.substring(4, 6) + "-" + s.substring(6, 8);
        }
    }

    public StockDailyValueDTO() {
    }

}
