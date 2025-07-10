/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.preenregistrement;

import java.util.List;
import java.util.Map;

/**
 *
 * @author JZAGO
 */
public interface SalesService {
    List<Object[]> getSalesPerMonth(String lg_FAMILLE_ID);

    List<Map<String, Object>> getSalesMapPerMonth(String lg_FAMILLE_ID);

}
