package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.ticket.ModeleTicket;
import rest.service.ticket.ReglagesTicket;

/**
 * Plan du 08/11, point 16 : l'option « Afficher l'information promotion » vaut aussi pour l'ANCIEN modele de ticket
 * (lignes « ; ;PROMOTION …;; » sous l'article). Sur non : ces lignes seules disparaissent ; articles, credits par
 * tiers-payant et totaux restent. Sans reglages (branchement du modele en echec) : ticket d'avant, mention gardee.
 */
class TicketAncienOptionPromotionTest {

    private static ReglagesTicket reglages(String modele, boolean promotion) {
        return ReglagesTicket.depuis(ModeleTicket.VENTE, new JSONObject().put("version", ReglagesTicket.VERSION)
                .put("modele", modele).put("promotion", promotion));
    }

    private static List<String> imprime(List<String> datas, ReglagesTicket r) {
        ImpressionServiceImpl imp = new ImpressionServiceImpl();
        if (r != null) {
            imp.modeleNouveau(ModeleTicket.VENTE, 80, r);
        }
        imp.buildTicket(datas, Collections.emptyList(), Collections.emptyList(), Collections.emptyList(),
                Collections.emptyList(), "");
        return imp.getDatas();
    }

    @Test
    void ancienModeleSuitLOption() {
        List<String> datas = Arrays.asList(" 6; *;DOLIPRANE 1000MG CP;1.000;5.000", " ; ;PROMOTION 5+1 OFFERT(S);;",
                " 2; *;EFFERALGAN 500MG;1.500;3.000", " ; ;Taux 70 % : 2 100;;", ";;;;------", ";;;;8.000");
        for (String modele : new String[] { ReglagesTicket.ANCIEN, ReglagesTicket.NOUVEAU }) {
            assertEquals(datas, imprime(datas, reglages(modele, true)), modele + " : oui");
            List<String> sans = new ArrayList<>(datas);
            sans.remove(1);
            assertEquals(sans, imprime(datas, reglages(modele, false)), modele + " : non");
        }
        assertEquals(datas, imprime(datas, null), "sans reglages : ticket d'avant");
    }

    /** 2 000 tickets tires au hasard (graine fixe) : seules les lignes de mention promotion suivent l'option. */
    @Test
    void coherenceAncienTicketAuHasard() {
        Random h = new Random(81108L);
        for (int cas = 0; cas < 2000; cas++) {
            List<String> datas = new ArrayList<>();
            int promos = 0;
            for (int i = 0, n = 1 + h.nextInt(7); i < n; i++) {
                int q = 1 + h.nextInt(9), pu = 25 * (1 + h.nextInt(300));
                datas.add(" " + q + "; *;PRODUIT " + i + ";" + pu + ";" + q * pu);
                if (h.nextInt(3) == 0) {
                    datas.add(h.nextBoolean() ? " ; ;PROMOTION;;" : " ; ;PROMOTION " + q + "+1 OFFERT(S);;");
                    promos++;
                }
                if (h.nextInt(4) == 0) {
                    datas.add(" ; ;Taux 70 % : " + (q * pu * 7 / 10) + ";;");
                }
            }
            datas.add(";;;;------");
            datas.add(";;;;" + h.nextInt(100000));
            boolean ancien = h.nextBoolean();
            List<String> avec = imprime(datas, reglages(ancien ? ReglagesTicket.ANCIEN : ReglagesTicket.NOUVEAU, true));
            List<String> sans = imprime(datas,
                    reglages(ancien ? ReglagesTicket.ANCIEN : ReglagesTicket.NOUVEAU, false));
            String cle = "cas " + cas;
            assertEquals(datas, avec, cle);
            assertEquals(datas.size() - promos, sans.size(), cle + " : une ligne de moins par mention");
            assertEquals(datas.stream().filter(l -> !l.contains("PROMOTION")).collect(Collectors.toList()), sans, cle);
            assertTrue(sans.stream().noneMatch(l -> l.contains("PROMOTION")), cle);
        }
    }
}
