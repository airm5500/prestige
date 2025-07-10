/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.stockManagement;

import java.util.Date;
import toolkits.utils.date;

/**
 *
 * @author EACHUA
 */
public class StatistiqueVenteQuery {
    public Date dt_date;
    public int int_quantite;

    public StatistiqueVenteQuery(Date dt, int qte) {
        this.dt_date = dt;
        this.int_quantite = qte;
    }

    public StatistiqueVenteQuery() {
    }
}
