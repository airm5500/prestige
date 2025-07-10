/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.asc.prestige2.business.litiges;

import dal.TLitige;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TTiersPayant;
import java.util.List;

/**
 *
 * @author JZAGO
 */
public interface LitigeService {

    boolean createTypeLitige(String strNAME, String str_DESCRIPTION);

    boolean createLitige(String str_LITIGE_TYPE, String strCLIENTNAME, String strREFERENCEVENTELITIGE,
            String str_TIERS_PAYANT_ID, String strLIBELLELITIGE, String strETATLITIGE, String strCONSEQUENCELITIGE,
            String strDESCRIPTIONLITIGE, String strCOMMENTAIRELITIGE);

    boolean deleteLitige(String lgLITIGEID);

    TLitige getLitige(String lgLITIGEID);

    TTiersPayant findTiersPayantById(String strTIERSPAYANTID);

    List<TPreenregistrementCompteClientTiersPayent> getVentesForTiersPayantsAndCompteClients(String tiersPayantID,
            String compteClientID);

    List<TLitige> getAllLitiges();

}
