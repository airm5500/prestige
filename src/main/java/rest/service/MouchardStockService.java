/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rest.service;

import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.MouchardStockDTO;

/**
 *
 * @author Hermann N'ZI
 */
@Local
public interface MouchardStockService {

    JSONObject getMouchardStock(String dtStart, String dtEnd, int start, int limit);

    List<MouchardStockDTO> getMouchardStock(String dtStart, String dtEnd, int limit, int start, boolean all);

}
