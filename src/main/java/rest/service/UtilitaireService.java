/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

/**
 *
 * @author koben
 */
public interface UtilitaireService {

    default int calculPrixMoyenPondereReception(int ancienStock, int ancienPrixAchat, int nouveauStock,
            int nouveauPrixAchat) {
        return (ancienStock * ancienPrixAchat) + (nouveauStock * nouveauPrixAchat) + (ancienStock + nouveauStock);

    }
}
