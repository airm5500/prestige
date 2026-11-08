package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.dto.ModePaymentAmount;
import rest.service.dto.TicketRecap;
import rest.service.dto.TicketRecapWrapper;

/**
 * Plan du 08/11, point 19 : le ticket Z part par SMS et par WhatsApp avec le MEME texte (texteTicketZ). Sur 2 000
 * recapitulatifs tires au hasard (graine fixe) : chaque caissier dans l'ordre, chaque mode « libelle: montant » sous
 * son caissier, ses totaux, puis le total general ; aucune ligne inventee ni perdue.
 */
class TicketZTexteTest {

    private static List<ModePaymentAmount> modes(Random h, int n) {
        String[] libelles = { "Espèces", "Chèque", "Carte", "Mobile money", "Virement", "Différé" };
        List<ModePaymentAmount> l = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            l.add(new ModePaymentAmount(libelles[i % libelles.length], String.valueOf(h.nextInt(2_000_000) - 50_000)));
        }
        return l;
    }

    @Test
    void texteCommeLeRecapitulatif() {
        Random h = new Random(19_0811L);
        for (int cas = 0; cas < 2000; cas++) {
            TicketRecapWrapper w = new TicketRecapWrapper();
            List<TicketRecap> caissiers = new ArrayList<>();
            int nc = h.nextInt(5);
            for (int i = 0; i < nc; i++) {
                TicketRecap r = new TicketRecap();
                r.setUser("CAISSIER " + i);
                r.setModePaymentAmounts(modes(h, h.nextInt(5)));
                r.setTotaux(modes(h, 1 + h.nextInt(2)));
                caissiers.add(r);
            }
            w.setDatas(caissiers);
            w.setTotaux(modes(h, 1 + h.nextInt(4)));
            String t = GenerateTicketServiceImpl.texteTicketZ(w);
            StringBuilder attendu = new StringBuilder();
            for (TicketRecap r : caissiers) {
                attendu.append("RECAPITULATIF DE ").append(r.getUser()).append("\n\n");
                r.getModePaymentAmounts().forEach(
                        m -> attendu.append(m.getModeLibelle()).append(": ").append(m.getMontant()).append("\n"));
                attendu.append("\nTOTAL ").append(r.getUser()).append("\n");
                r.getTotaux().forEach(
                        m -> attendu.append(m.getModeLibelle()).append(": ").append(m.getMontant()).append("\n"));
            }
            attendu.append("\nTOTAL GENERAL\n\n");
            w.getTotaux()
                    .forEach(m -> attendu.append(m.getModeLibelle()).append(": ").append(m.getMontant()).append("\n"));
            assertEquals(attendu.toString(), t, "cas " + cas);
            long lignes = t.chars().filter(c -> c == '\n').count();
            int montants = w.getTotaux().size();
            for (TicketRecap r : caissiers) {
                montants += r.getModePaymentAmounts().size() + r.getTotaux().size();
            }
            assertEquals(montants + 3 + 4L * nc, lignes, "cas " + cas + " : une ligne par montant, en-tetes compris");
            assertTrue(t.endsWith("\n") && t.contains("TOTAL GENERAL"), "cas " + cas);
        }
    }
}
