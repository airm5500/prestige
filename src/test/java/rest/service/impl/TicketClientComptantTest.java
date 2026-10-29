package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.TClient;
import dal.TNatureVente;
import dal.TPreenregistrement;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import util.Constant;

/** Demande du 29/10 (point 2) : nom du client sur le ticket d'une vente au comptant a laquelle il a ete associe. */
class TicketClientComptantTest {

    private static TPreenregistrement vente(String type, String nature, boolean client) {
        TPreenregistrement v = new TPreenregistrement();
        v.setStrTYPEVENTE(type);
        v.setLgNATUREVENTEID(new TNatureVente(nature));
        if (client) {
            v.setClient(new TClient("C1"));
        }
        return v;
    }

    @Test
    @DisplayName("Comptant avec client : le nom est imprime")
    void comptantAvecClient() {
        assertTrue(GenerateTicketServiceImpl.clientComptantAImprimer(vente("VNO", "1", true)));
    }

    @Test
    @DisplayName("Comptant sans client, vente assurance, vente en depot : pas de ligne ajoutee")
    void autresCas() {
        assertFalse(GenerateTicketServiceImpl.clientComptantAImprimer(vente("VNO", "1", false)));
        assertFalse(GenerateTicketServiceImpl.clientComptantAImprimer(vente("VO", "1", true)));
        assertFalse(
                GenerateTicketServiceImpl.clientComptantAImprimer(vente("VNO", Constant.KEY_NATURE_VENTE_DEPOT, true)));
        assertFalse(GenerateTicketServiceImpl.clientComptantAImprimer(null));
    }
}
