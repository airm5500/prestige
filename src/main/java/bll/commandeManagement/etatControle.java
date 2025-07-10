/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.commandeManagement;

import java.util.Date;

/**
 *
 * @author AMIGONE
 */
public class etatControle {

    public String str_LIBELLE;
    public String str_NAME;
    public String int_CIP;
    public String str_ORDER_REF;
    public double int_ORDER_PRICE;
    public String str_BL_REF;
    public int int_BL_PRICE;
    public int int_BL_NUMBER;
    public Date dt_CREATED;
    public int int_NUMBER;
    public Date dt_DATE_LIVRAISON;
    public int int_QTE_CMD;
    public Date dt_ENTREE_STCK;

    public etatControle(String str_LIBELLE, String str_NAME, String int_CIP, String str_ORDER_REF,
            double int_ORDER_PRICE, String str_BL_REF, int int_BL_PRICE, int int_BL_NUMBER, Date dt_CREATED,
            int int_NUMBER, Date dt_DATE_LIVRAISON, int int_QTE_CMD, Date dt_ENTREE_STCK) {

        this.str_LIBELLE = str_LIBELLE;
        this.str_NAME = str_NAME;
        this.int_CIP = int_CIP;
        this.str_ORDER_REF = str_ORDER_REF;
        this.int_ORDER_PRICE = int_ORDER_PRICE;
        this.str_BL_REF = str_BL_REF;
        this.int_BL_PRICE = int_BL_PRICE;
        this.int_BL_NUMBER = int_BL_NUMBER;
        this.dt_CREATED = dt_CREATED;
        this.int_NUMBER = int_NUMBER;
        this.dt_DATE_LIVRAISON = dt_DATE_LIVRAISON;
        this.int_QTE_CMD = int_QTE_CMD;
        this.dt_ENTREE_STCK = dt_ENTREE_STCK;

    }

    public etatControle() {

    }

}
