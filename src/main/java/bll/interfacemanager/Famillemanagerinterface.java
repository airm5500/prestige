/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package bll.interfacemanager;

import dal.TFamille;
import dal.TTypeetiquette;

/**
 *
 * @author MKABOU
 */
public interface Famillemanagerinterface {
    // deconditionnement
    public boolean createDeconditionnement(TFamille OTFamille, int int_NUMBER);

    public TTypeetiquette getTTypeetiquette(String lg_TYPEETIQUETTE_ID);
    // fin deconditionnement
}
