/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll;

import java.io.Serializable;

/**
 *
 * @author TBEKOLA
 */
public interface Imanager {
    public boolean delete(Serializable o);

    public Serializable find(Object o);

}
