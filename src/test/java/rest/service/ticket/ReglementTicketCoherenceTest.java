package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * Plan du 06/11, point 6 : le reglement imprime d'une vente differee. Regles verifiees sur 5 000 recapitulatifs tires
 * au hasard (graine fixe), passes par la conversion du ticket :
 * <ul>
 * <li>un seul « Règlement : Différé », aucun mode especes, aucune ligne de versement ni de monnaie a 0 ;</li>
 * <li>« Espèces versées » present si et seulement si un acompte a ete encaisse, au montant de l'acompte ;</li>
 * <li>remise, vente a terme et net a payer inchanges, dans le meme ordre ;</li>
 * <li>une vente payee (non differee) garde son ticket d'avant.</li>
 * </ul>
 */
class ReglementTicketCoherenceTest {

    private static final Pattern PAIRE = Pattern.compile("(?:PAIRE|ENCADRE)\\[([^|\\]]+?)\\s*\\|\\s*([^\\]]*)\\]");

    private static List<String[]> paires(List<String> subtotal, ModeleTicket t) {
        ConversionTicket.Source s = ExemplesTicket.exemple(t, 80);
        s.subtotal = new ArrayList<>(subtotal);
        String texte = ConversionTicket.convertir(s, new ReglagesTicket(t)).blocsNonVides().stream()
                .filter(b -> b.id.equals(TicketDocument.REGLEMENT)).flatMap(b -> b.elements.stream())
                .map(Object::toString).collect(Collectors.joining("\n"));
        List<String[]> r = new ArrayList<>();
        Matcher m = PAIRE.matcher(texte.replace("**", ""));
        while (m.find()) {
            r.add(new String[] { m.group(1).trim(), m.group(2).trim() });
        }
        return r;
    }

    private static int chiffres(String v) {
        String c = v.replaceAll("[^0-9]", "");
        return c.isEmpty() ? 0 : Integer.parseInt(c);
    }

    private static String ligne(String libelle, long valeur, String unite, int gras) {
        return libelle + ": ;     " + ConversionTicket.nombre(valeur) + ";" + unite + ";" + gras;
    }

    /**
     * Recapitulatif tel que les services le construisent pour une vente « payee » (le differe y passe pour especes).
     */
    private static List<String> recap(Random g, int net) {
        List<String> l = new ArrayList<>();
        if (g.nextInt(3) == 0) {
            l.add("* ;(-) " + ConversionTicket.nombre(5 + g.nextInt(2000)) + "; F CFA;1");
        }
        if (g.nextInt(5) == 0) {
            l.add(ligne("Vente à terme", 100 + g.nextInt(90000), " F CFA", 1));
        }
        l.add(ligne("Net à payer", net, " F CFA", 1));
        int forme = g.nextInt(3);
        if (forme == 0) {
            l.add("Règlement: ;     Espèces; ;0");
        } else if (forme == 1) {
            l.add("Règlement: ;     " + (g.nextBoolean() ? "Differe" : "Mobile Money") + "; ;0");
        } else {
            l.add(ligne("Espèces", 0, " ", 0));
            l.add(ligne("Differe", net, " ", 0));
        }
        l.add(ligne("Montant Versé", g.nextInt(4) == 0 ? g.nextInt(net + 1) : 0, " F CFA", 0));
        l.add(ligne("Monnaie", 0, " F CFA", 0));
        return l;
    }

    @Test
    void differeSurCinqMilleRecapitulatifs() {
        Random g = new Random(20261107L);
        int avecAcompte = 0;
        for (int i = 0; i < 5000; i++) {
            int net = 5 * (1 + g.nextInt(20000));
            int especes = g.nextInt(3) == 0 ? 5 * (1 + g.nextInt(net / 5)) : 0;
            List<String> avant = recap(g, net);
            List<String> apres = ReglementTicket.differe(avant, especes);
            String cas = "cas " + i + " " + avant + " -> " + apres;

            // remise, vente a terme et net : memes lignes, meme ordre
            List<String> gardees = avant.stream()
                    .filter(x -> x.startsWith("*") || x.startsWith("Vente à terme") || x.startsWith("Net à payer"))
                    .collect(Collectors.toList());
            assertEquals(gardees, apres.subList(0, gardees.size()), cas);

            ModeleTicket t = g.nextBoolean() ? ModeleTicket.VENTE_ASSURANCE : ModeleTicket.VENTE;
            List<String[]> p = paires(apres, t);
            String vu = p.stream().map(x -> x[0] + "=" + x[1]).collect(Collectors.joining(", "));
            assertEquals(1, p.stream().filter(x -> x[0].equals("Règlement")).count(), cas + " / " + vu);
            assertTrue(p.stream().anyMatch(x -> x[0].equals("Règlement") && x[1].equals("Différé")), cas + " / " + vu);
            for (String[] x : p) {
                boolean versement = x[0].matches("(?i).*(esp[eè]ces|vers[eé]|monnaie).*");
                assertFalse(versement && chiffres(x[1]) == 0, "ligne a 0 : " + cas + " / " + vu);
            }
            List<String[]> verse = p.stream().filter(x -> x[0].equals(ReglementTicket.ESPECES_VERSEES))
                    .collect(Collectors.toList());
            if (especes > 0) {
                avecAcompte++;
                assertEquals(1, verse.size(), cas + " / " + vu);
                assertEquals(especes, chiffres(verse.get(0)[1]), cas + " / " + vu);
            } else {
                assertTrue(verse.isEmpty(), cas + " / " + vu);
            }
            assertFalse(p.stream().anyMatch(x -> x[0].equals("Monnaie rendue") || x[0].equals("Montant versé")),
                    cas + " / " + vu);
        }
        assertTrue(avecAcompte > 1000 && avecAcompte < 4000, "jeu varie : " + avecAcompte + " acomptes");
    }

    @Test
    void venteEnEspecesInchangee() {
        List<String> l = Arrays.asList(ligne("Net à payer", 1475, " F CFA", 1), "Règlement: ;     Espèces; ;0",
                ligne("Montant Versé", 2000, " F CFA", 0), ligne("Monnaie", 525, " F CFA", 0));
        List<String[]> p = paires(l, ModeleTicket.VENTE_ASSURANCE);
        String vu = p.stream().map(x -> x[0] + "=" + x[1]).collect(Collectors.joining(", "));
        assertTrue(p.stream().anyMatch(x -> x[0].equals("Espèces versées") && chiffres(x[1]) == 2000), vu);
        assertTrue(p.stream().anyMatch(x -> x[0].equals("Monnaie rendue") && chiffres(x[1]) == 525), vu);
        assertFalse(vu.contains("Différé"), vu);
    }

    @Test
    void ticketCombineDiffere() {
        TicketCombine.Entree e = new TicketCombine.Entree();
        e.refVo = "1";
        e.refVno = "2";
        e.articlesVo = new ArrayList<>();
        e.articlesVno = new ArrayList<>();
        e.partClientVo = 960;
        e.netVno = 1915;
        e.modeReglement = "Espèces";
        e.differe = true;
        List<String> s = TicketCombine.construire(e).subtotal;
        assertTrue(s.contains("Règlement: ;     Différé; ;0"), s.toString());
        assertFalse(s.stream().anyMatch(x -> x.startsWith("Montant Versé") || x.startsWith("Monnaie")), s.toString());
        e.especesDiffere = 1000;
        assertTrue(TicketCombine.construire(e).subtotal.contains("Espèces versées: ;     1 000; F CFA;0"));
        e.differe = false;
        assertTrue(TicketCombine.construire(e).subtotal.stream().anyMatch(x -> x.startsWith("Montant Versé")));
    }
}
