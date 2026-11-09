package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.promotion.PromotionLigne;

/**
 * Plan du 08/11, point 16 : option « Afficher l'information promotion » des modeles de ticket (oui par defaut). Non :
 * la mention « PROMOTION … » ne sort plus sous la ligne ; la ligne, son montant, ses credits par tiers-payant et les
 * totaux ne changent pas. Un reglage enregistre avant l'option (sans la cle) garde la mention.
 */
class TicketOptionPromotionTest {

    private static final List<ModeleTicket> TICKETS = Arrays.asList(ModeleTicket.VENTE, ModeleTicket.VENTE_ASSURANCE,
            ModeleTicket.VENTE_CARNET, ModeleTicket.VENTE_DEPOT, ModeleTicket.VENTE_MIXTE);

    private static String texte(TicketDocument d) {
        return d.blocsNonVides().stream().flatMap(b -> b.elements.stream()).map(Object::toString)
                .collect(Collectors.joining("\n"));
    }

    private static ReglagesTicket reglages(ModeleTicket t, Boolean promotion) {
        JSONObject j = new JSONObject().put("version", ReglagesTicket.VERSION).put("modele", ReglagesTicket.NOUVEAU);
        if (promotion != null) {
            j.put("promotion", promotion);
        }
        return ReglagesTicket.depuis(t, j);
    }

    private static long compte(String t, String motif) {
        int n = 0;
        for (int i = t.indexOf(motif); i >= 0; i = t.indexOf(motif, i + 1)) {
            n++;
        }
        return n;
    }

    @Test
    void parDefautLaMentionSortEtNonLaRetire() {
        ConversionTicket.Source s = ExemplesTicket.exemple(ModeleTicket.VENTE, 80);
        s.articles = Arrays.asList(
                new ConversionTicket.Article("DOLIPRANE 1000MG CPR B/8", 6, 1000, 5000, "",
                        Collections
                                .singletonList(PromotionLigne.mention(PromotionLigne.UNITES_GRATUITES, null, 5, 1, 1))),
                new ConversionTicket.Article("EFFERALGAN 500MG CPR B/16", 2, 1500, 3000, "", Collections.emptyList()));
        String avec = texte(ConversionTicket.convertir(s, new ReglagesTicket(ModeleTicket.VENTE)));
        assertTrue(avec.contains("TEXTE[PROMOTION 5+1 OFFERT(S)]"), avec);
        String ancienReglage = texte(ConversionTicket.convertir(s, reglages(ModeleTicket.VENTE, null)));
        assertTrue(ancienReglage.contains("PROMOTION 5+1 OFFERT(S)"), "reglage sans la cle : mention gardee");
        String sans = texte(ConversionTicket.convertir(s, reglages(ModeleTicket.VENTE, false)));
        assertFalse(sans.contains("PROMOTION"), sans);
        // seule la mention disparait : le reste du ticket est identique
        assertEquals(avec.replace("\nTEXTE[PROMOTION 5+1 OFFERT(S)]", ""), sans);
    }

    /** Nouveau modele sans lignes completes (lecture de repli des lignes de l'ancien ticket). */
    @Test
    void lectureDeRepliSuitLOption() {
        ConversionTicket.Source s = ExemplesTicket.exemple(ModeleTicket.VENTE, 80);
        s.articles = Collections.emptyList();
        s.datas = new ArrayList<>(Arrays.asList(" 6; *;DOLIPRANE 1000MG CP;1.000;5.000",
                " ; ;PROMOTION 5+1 OFFERT(S);;", " 1; *;SERUM PHYSIOLOGIQU;650;650", ";;;;------", ";;;;5.650"));
        String avec = texte(ConversionTicket.convertir(s, reglages(ModeleTicket.VENTE, true)));
        String sans = texte(ConversionTicket.convertir(s, reglages(ModeleTicket.VENTE, false)));
        assertEquals(1, compte(avec, "TEXTE[PROMOTION 5+1 OFFERT(S)]"), avec);
        assertEquals(0, compte(sans, "PROMOTION"), sans);
        assertEquals(avec.replace("\nTEXTE[PROMOTION 5+1 OFFERT(S)]", ""), sans);
    }

    @Test
    void optionEnregistreeEtRelue() {
        for (ModeleTicket t : TICKETS) {
            assertTrue(new ReglagesTicket(t).json().optBoolean("promotion", false), t + " : oui par defaut");
            for (boolean v : new boolean[] { true, false }) {
                ReglagesTicket r = reglages(t, v);
                assertEquals(v, r.json().optBoolean("promotion", !v), t + " ecrit " + v);
                assertEquals(v, ReglagesTicket.depuis(t, r.json()).json().optBoolean("promotion", !v),
                        t + " relu " + v);
            }
        }
    }

    /** Coherence sur 3 000 tickets tires au hasard (graine fixe) : seules les mentions promotion suivent l'option. */
    @Test
    void coherenceSurTicketsAuHasard() {
        Random h = new Random(20261108L);
        String[] noms = { "AMOXICILLINE 500MG", "PARACETAMOL 1G", "VITAMINE C 500", "SERUM PHYSIO", "IBUPROFENE 400" };
        for (int cas = 0; cas < 3000; cas++) {
            ModeleTicket t = TICKETS.get(h.nextInt(TICKETS.size()));
            ConversionTicket.Source s = ExemplesTicket.exemple(t, h.nextBoolean() ? 80 : 58);
            List<ConversionTicket.Article> lignes = new ArrayList<>();
            int promos = 0, credits = 0, n = 1 + h.nextInt(6);
            for (int i = 0; i < n; i++) {
                int q = h.nextInt(8), pu = 50 * (1 + h.nextInt(200)), offertes = q > 1 && h.nextBoolean() ? 1 : 0;
                List<String> m = new ArrayList<>();
                if (h.nextInt(3) == 0) {
                    m.add(h.nextBoolean() ? PromotionLigne.mention(PromotionLigne.UNITES_GRATUITES, null,
                            Math.max(1, q - 1), 1, offertes)
                            : PromotionLigne.mention(null, null, null, null, offertes));
                    promos++;
                }
                if (h.nextInt(3) == 0) {
                    m.add(CreditLigne.libelle(null, 70, (int) Math.round(0.7 * q * pu)));
                    credits++;
                }
                lignes.add(new ConversionTicket.Article(noms[i % noms.length] + " " + i, q, pu,
                        PromotionLigne.montant(pu, q, offertes), "", m));
            }
            s.articles = lignes;
            if (t == ModeleTicket.VENTE_MIXTE && s.sections.size() == 2) {
                // ticket combine : les lignes sont lues dans ses deux sections (assurance, comptant)
                int k = h.nextInt(lignes.size() + 1);
                s.sections = Arrays.asList(
                        new ConversionTicket.Section(s.sections.get(0).titre, lignes.subList(0, k),
                                s.sections.get(0).totaux),
                        new ConversionTicket.Section(s.sections.get(1).titre, lignes.subList(k, lignes.size()),
                                s.sections.get(1).totaux));
            }
            String avec = texte(ConversionTicket.convertir(s, reglages(t, true)));
            String sans = texte(ConversionTicket.convertir(s, reglages(t, false)));
            String cle = "cas " + cas + " " + t;
            assertEquals(promos, compte(avec, "TEXTE[PROMOTION"), cle + " : une mention par ligne en promotion");
            assertEquals(0, compte(sans, "PROMOTION"), cle + " : aucune mention sans l'option");
            assertEquals(compte(avec, "Taux 70 %"), compte(sans, "Taux 70 %"), cle + " : credits inchanges");
            assertTrue(compte(sans, "Taux 70 %") >= credits, cle + " : credits presents");
            assertEquals(compte(avec, "ARTICLE["), compte(sans, "ARTICLE["), cle + " : memes lignes");
            // le ticket sans l'option = le ticket avec, moins les seules lignes de mention
            String retire = Arrays.stream(avec.split("\n")).filter(l -> !l.startsWith("TEXTE[PROMOTION"))
                    .collect(Collectors.joining("\n"));
            assertEquals(retire, sans, cle);
        }
    }
}
