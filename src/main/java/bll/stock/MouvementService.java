/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.stock;

import dal.TFamille;
import dal.TMouvement;

import java.time.LocalDate;
import java.util.List;

/**
 *
 * @author user
 */
public interface MouvementService {

    Integer entreeStock(TFamille famille, LocalDate debut, LocalDate fin);

    Integer stockVente(TFamille famille, LocalDate debut, LocalDate fin, String empl);

    List<TMouvement> listMvt(String lgFamille, String zoneID, String criteria, String dateDebut, String dateEnd,
            String empl, String LgFamilleArticle, boolean all, int start, int limit);

}
