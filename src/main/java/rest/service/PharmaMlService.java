/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import dal.TUser;
import java.time.LocalDate;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 *
 * @author kkoffi
 */
@Local
public interface PharmaMlService {

    JSONObject envoiPharmaInfosProduit(String commandeId);

    JSONObject envoiCommande(String commandeId, LocalDate dateLivraisonSouhaitee, int typeCommande,
            String typeCommandeExecptionel, String commentaire);

}
