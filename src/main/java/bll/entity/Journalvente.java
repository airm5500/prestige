/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.entity;

/**
 *
 * @author AMETCH
 */
public class Journalvente {

    private String str_ref;
    private String str_type_vente;
    private String str_type_reglement;
    private String str_date;
    private String str_vendeur;
    private String str_client = "";
    private String str_client_infos = "";
    private String str_mt_vente;
    private String str_mt_tp = "";
    private String str_mt_clt = "";
    private String str_mt_rem = "";

    /**
     * @return the str_ref
     */
    public String getStr_ref() {
        return str_ref;
    }

    /**
     * @param str_ref
     *            the str_ref to set
     */
    public void setStr_ref(String str_ref) {
        this.str_ref = str_ref;
    }

    /**
     * @return the str_type_vente
     */
    public String getStr_type_vente() {
        return str_type_vente;
    }

    /**
     * @param str_type_vente
     *            the str_type_vente to set
     */
    public void setStr_type_vente(String str_type_vente) {
        this.str_type_vente = str_type_vente;
    }

    /**
     * @return the str_date
     */
    public String getStr_date() {
        return str_date;
    }

    /**
     * @param str_date
     *            the str_date to set
     */
    public void setStr_date(String str_date) {
        this.str_date = str_date;
    }

    /**
     * @return the str_vendeur
     */
    public String getStr_vendeur() {
        return str_vendeur;
    }

    /**
     * @param str_vendeur
     *            the str_vendeur to set
     */
    public void setStr_vendeur(String str_vendeur) {
        this.str_vendeur = str_vendeur;
    }

    /**
     * @return the str_client
     */
    public String getStr_client() {
        return str_client;
    }

    /**
     * @param str_client
     *            the str_client to set
     */
    public void setStr_client(String str_client) {
        this.str_client = str_client;
    }

    /**
     * @return the str_mt_vente
     */
    public String getStr_mt_vente() {
        return str_mt_vente;
    }

    /**
     * @param str_mt_vente
     *            the str_mt_vente to set
     */
    public void setStr_mt_vente(String str_mt_vente) {
        this.str_mt_vente = str_mt_vente;
    }

    /**
     * @return the str_mt_tp
     */
    public String getStr_mt_tp() {
        return str_mt_tp;
    }

    /**
     * @param str_mt_tp
     *            the str_mt_tp to set
     */
    public void setStr_mt_tp(String str_mt_tp) {
        this.str_mt_tp = str_mt_tp;
    }

    /**
     * @return the str_mt_clt
     */
    public String getStr_mt_clt() {
        return str_mt_clt;
    }

    /**
     * @param str_mt_clt
     *            the str_mt_clt to set
     */
    public void setStr_mt_clt(String str_mt_clt) {
        this.str_mt_clt = str_mt_clt;
    }

    /**
     * @return the str_mt_rem
     */
    public String getStr_mt_rem() {
        return str_mt_rem;
    }

    /**
     * @param str_mt_rem
     *            the str_mt_rem to set
     */
    public void setStr_mt_rem(String str_mt_rem) {
        this.str_mt_rem = str_mt_rem;
    }

    /**
     * @return the str_client_infos
     */
    public String getStr_client_infos() {
        return str_client_infos;
    }

    /**
     * @param str_client_infos
     *            the str_client_infos to set
     */
    public void setStr_client_infos(String str_client_infos) {
        this.str_client_infos = str_client_infos;
    }

    /**
     * @return the str_type_reglement
     */
    public String getStr_type_reglement() {
        return str_type_reglement;
    }

    /**
     * @param str_type_reglement
     *            the str_type_reglement to set
     */
    public void setStr_type_reglement(String str_type_reglement) {
        this.str_type_reglement = str_type_reglement;
    }

}
