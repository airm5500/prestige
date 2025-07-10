/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.asc.prestige2.business.cash;

/**
 *
 * @author JZAGO
 */
public interface CashService {
    int getMontantAnnule(String lg_USER_ID, String dt_date_debut, String dt_date_fin);
}
