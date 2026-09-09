/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author DICI
 */
public class GenericDTO {

    private SummaryDTO summary;
    private List<BalanceDTO> balances = new ArrayList<>();
    /*
     * Retour du 09/09, point 4 : ce que la balance a rencontre par mode de reglement et comme autres mouvements de
     * caisse, pour que la ventilation soit construite sans rejouer une seule requete.
     */
    private List<rest.service.dto.ModeReglementMontantDTO> modesReglement = new ArrayList<>();
    private List<rest.service.dto.BalanceVenteItemDTO> mouvementsCaisse = new ArrayList<>();

    public List<rest.service.dto.ModeReglementMontantDTO> getModesReglement() {
        return modesReglement;
    }

    public void setModesReglement(List<rest.service.dto.ModeReglementMontantDTO> modesReglement) {
        this.modesReglement = modesReglement;
    }

    public List<rest.service.dto.BalanceVenteItemDTO> getMouvementsCaisse() {
        return mouvementsCaisse;
    }

    public void setMouvementsCaisse(List<rest.service.dto.BalanceVenteItemDTO> mouvementsCaisse) {
        this.mouvementsCaisse = mouvementsCaisse;
    }

    public SummaryDTO getSummary() {
        return summary;
    }

    public void setSummary(SummaryDTO summary) {
        this.summary = summary;
    }

    public List<BalanceDTO> getBalances() {
        return balances;
    }

    public void setBalances(List<BalanceDTO> balances) {
        this.balances = balances;
    }

}
