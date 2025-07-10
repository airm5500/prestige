/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.stockManagement;

/**
 *
 * @author EACHUA
 */
public class StatistiqueVente {

    public int int_annee;
    public int int_janvier;
    public int int_fevrier;
    public int int_mars;
    public int int_avril;
    public int int_mai;
    public int int_juin;
    public int int_juillet;
    public int int_aout;
    public int int_septembre;
    public int int_octobre;
    public int int_novembre;
    public int int_decembre;

    public StatistiqueVente(int int_annee, int int_janvier, int int_fevrier, int int_mars, int int_mai, int int_juin,
            int int_juillet, int int_aout, int int_septembre, int int_octobre, int int_novembre, int int_decembre) {

        this.int_annee = int_annee;
        this.int_janvier = int_janvier;
        this.int_fevrier = int_fevrier;
        this.int_mars = int_mars;
        this.int_mai = int_mai;
        this.int_juin = int_juin;
        this.int_juillet = int_juillet;
        this.int_aout = int_aout;
        this.int_septembre = int_septembre;
        this.int_octobre = int_octobre;
        this.int_novembre = int_novembre;
        this.int_decembre = int_decembre;

    }

    public StatistiqueVente() {

    }

}
