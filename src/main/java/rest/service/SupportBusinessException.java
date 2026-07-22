/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import javax.ejb.ApplicationException;

/**
 * Erreur metier du Centre de Support. Annotee {@link ApplicationException} pour traverser la frontiere EJB sans etre
 * enveloppee dans une EJBException et sans provoquer de rollback.
 *
 * @author koben
 */
@ApplicationException(rollback = false)
public class SupportBusinessException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public SupportBusinessException(String message) {
        super(message);
    }
}
