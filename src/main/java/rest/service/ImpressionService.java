/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import java.awt.print.Printable;
import java.util.List;

/**
 *
 * @author Kobena
 */
public interface ImpressionService extends Printable {

    public void PrintTicketVente();

    public void buildTicket(List<String> datas, List<String> infoSellers, List<String> infoClientAvoir,
            List<String> subtotal, List<String> commentaires, String codeBar);

    public void buildTicketVo(List<String> datas, List<String> infoSellers, List<String> infoTiersPayants,
            List<String> subtotal, List<String> commentaires, String codeBar);

}
