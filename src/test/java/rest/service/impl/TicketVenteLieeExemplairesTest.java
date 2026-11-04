package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.TPreenregistrement;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Retour du 03/11 : une vente assurance avec une ligne cochee comptant sort un ticket assurance par tiers-payant et le
 * ticket client combine, sans le recu caisse (le combine le remplace). Un tiers-payant : 2 tickets ; deux : 3 tickets.
 * Sans vente liee, rien ne change.
 */
class TicketVenteLieeExemplairesTest {

    private static TPreenregistrement vo(String venteLiee) {
        TPreenregistrement v = new TPreenregistrement();
        v.setStrTYPEVENTE("VO");
        v.setLgVENTELIEEID(venteLiee);
        return v;
    }

    @Test
    @DisplayName("Vente liee, exemplaires par tiers-payant : pas de recu caisse")
    void venteLieeSansRecuCaisse() {
        assertEquals(false, GenerateTicketServiceImpl.recuCaisseAImprimer(vo("VNO-1"), false, 1));
        assertEquals(false, GenerateTicketServiceImpl.recuCaisseAImprimer(vo("VNO-1"), false, 2));
        // tickets sortis : un par tiers-payant, plus le combine
        assertEquals(2, GenerateTicketServiceImpl.ticketsVenteLiee(1));
        assertEquals(3, GenerateTicketServiceImpl.ticketsVenteLiee(2));
    }

    @Test
    @DisplayName("Fonctionnement existant : sans vente liee, ou ticket unique, le recu caisse reste")
    void existantInchange() {
        assertTrue(GenerateTicketServiceImpl.recuCaisseAImprimer(vo(null), false, 1));
        assertTrue(GenerateTicketServiceImpl.recuCaisseAImprimer(vo(""), false, 2));
        // ticket unique : le recu est le seul ticket assurance, il reste (le combine s'y ajoute)
        assertTrue(GenerateTicketServiceImpl.recuCaisseAImprimer(vo("VNO-1"), true, 1));
        // aucun exemplaire tiers-payant : le recu reste
        assertTrue(GenerateTicketServiceImpl.recuCaisseAImprimer(vo("VNO-1"), false, 0));
        assertTrue(GenerateTicketServiceImpl.recuCaisseAImprimer(null, false, 1));
    }
}
