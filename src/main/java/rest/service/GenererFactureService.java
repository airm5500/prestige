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

}
