/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.CodeFactureDTO;
import commonTasks.dto.GenererFactureDTO;
import java.util.LinkedHashSet;
import java.util.List;

/**
 *
 * @author kkoffi
 */
// @Local
public interface GenererFactureService {

    List<CodeFactureDTO> genererFactureTemporaire(GenererFactureDTO datas);

    LinkedHashSet<CodeFactureDTO> genererFactureTierspayant(GenererFactureDTO datas);

    /**
     * Factures de carnet depot (retour du 08/09).
     *
     * <p>
     * Une facture de carnet depot est une VRAIE facture : numerotee, definitive, creee d'un coup depuis le menu du
     * carnet depot, sans passer par une provisoire. Seuls les bons des tiers payants marques « depot » sont retenus,
     * quels que soient les criteres recus : ce menu ne facture rien d'autre.
     * </p>
     */
    LinkedHashSet<CodeFactureDTO> genererFactureCarnetDepot(GenererFactureDTO datas);

}
