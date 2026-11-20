package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.ticket.ConversionTicket.Article;
import rest.service.ticket.ConversionTicket.Section;

/**
 * Plan du 19/11, point 8 : coherence du ticket de la vente modifiee, sur des milliers de cas tires au hasard (graine
 * fixe) : une a trois lignes, quantites de 1 a 5, zero a trois organismes (organisme ajoute, retire ou garde), remise
 * ou non, client qui avait paye moins, autant ou plus que sa nouvelle part.
 * <ul>
 * <li>reste a payer et a rendre jamais negatifs, l'un des deux nul, reste - a rendre = part client modifiee - deja paye
 * ;</li>
 * <li>chaque ecart = valeur modifiee - valeur d'origine (organisme absent d'un cote = 0) ;</li>
 * <li>ecart du total = somme des ecarts des organismes + ecart de la part client + ecart de la remise ;</li>
 * <li>les lignes « DIFFÉRENCES » relues redonnent ces ecarts ; chaque vente est rappelee avec ses lignes, son total,
 * ses organismes et sa part client ; le net a payer du pied = reste a payer ;</li>
 * <li>un ecart s'ecrit avec son signe et se relit a l'identique.</li>
 * </ul>
 */
class TicketVenteModifieeCoherenceTest {

    private static final String[] ORGANISMES = { "MUGEF CI", "ASCOMA", "SAHAM", "ALLIANZ" };

    private static int lire(String v) {
        return Integer.parseInt(v.replace(" ", "").replace("+", ""));
    }

    private static TicketVenteModifiee.Vente vente(Random r, String ref, List<String> noms) {
        TicketVenteModifiee.Vente v = new TicketVenteModifiee.Vente();
        v.ref = ref;
        v.date = "19/11/2026 10:1" + r.nextInt(10);
        List<Article> lignes = new ArrayList<>();
        int total = 0;
        int n = 1 + r.nextInt(3);
        for (int i = 0; i < n; i++) {
            int q = 1 + r.nextInt(5);
            int pu = 5 * (20 + r.nextInt(2000));
            lignes.add(new Article("PRODUIT " + i, q, pu, q * pu, ""));
            total += q * pu;
        }
        v.articles = lignes;
        v.total = total;
        v.remise = r.nextInt(4) == 0 ? 5 * r.nextInt(total / 50 + 1) : 0;
        int reste = total - v.remise;
        List<String[]> tps = new ArrayList<>();
        for (String nom : noms) {
            int taux = 10 * (1 + r.nextInt(8));
            int part = Math.min(reste, total * taux / 100);
            reste -= part;
            tps.add(new String[] { nom, String.valueOf(taux), String.valueOf(part) });
        }
        v.tiersPayants = tps;
        v.partClient = reste;
        return v;
    }

    private static List<String> organismes(Random r) {
        List<String> l = new ArrayList<>();
        for (String o : ORGANISMES) {
            if (r.nextInt(3) == 0) {
                l.add(o);
            }
        }
        return l;
    }

    @Test
    void coherenceSurDesMilliersDeCas() {
        Random r = new Random(20261119L);
        int rendre = 0;
        int resteAPayer = 0;
        int egal = 0;
        for (int cas = 0; cas < 20000; cas++) {
            TicketVenteModifiee.Entree e = new TicketVenteModifiee.Entree();
            e.origine = vente(r, "261119_000" + cas, organismes(r));
            e.modifiee = vente(r, "261119_100" + cas,
                    r.nextBoolean() ? organismes(r) : new ArrayList<>(parts(e.origine.tiersPayants).keySet()));
            int choix = r.nextInt(3);
            e.payeOrigine = choix == 0 ? e.modifiee.partClient
                    : choix == 1 ? e.origine.partClient : 5 * r.nextInt(e.origine.partClient / 5 + 1);
            e.assure = "ESSAI " + cas;
            e.modeReglement = "Espèce";
            e.verse = 5 * r.nextInt(2000);
            e.monnaie = r.nextInt(2) == 0 ? 0 : 5 * r.nextInt(100);
            String ici = "cas " + cas;

            TicketVenteModifiee.Ecarts x = TicketVenteModifiee.ecarts(e);
            assertTrue(x.reste >= 0 && x.aRendre >= 0, ici + " : jamais negatif");
            assertTrue(x.reste == 0 || x.aRendre == 0, ici + " : reste ou a rendre, pas les deux");
            assertEquals(e.modifiee.partClient - e.payeOrigine, x.reste - x.aRendre, ici + " : reste - a rendre");
            assertEquals(e.modifiee.total - e.origine.total, x.total, ici + " : ecart du total");
            assertEquals(e.modifiee.remise - e.origine.remise, x.remise, ici + " : ecart de la remise");
            assertEquals(e.modifiee.partClient - e.origine.partClient, x.partClient, ici + " : ecart part client");
            Map<String, Integer> avant = parts(e.origine.tiersPayants);
            Map<String, Integer> apres = parts(e.modifiee.tiersPayants);
            int somme = 0;
            for (String o : ORGANISMES) {
                boolean present = avant.containsKey(o) || apres.containsKey(o);
                assertEquals(present, x.parts.containsKey(o), ici + " : organisme " + o + " present");
                if (present) {
                    assertEquals(apres.getOrDefault(o, 0) - avant.getOrDefault(o, 0), (int) x.parts.get(o),
                            ici + " : ecart " + o);
                    somme += x.parts.get(o);
                }
            }
            assertEquals(x.total, somme + x.partClient + x.remise, ici + " : total = organismes + client + remise");

            TicketCombine.Sortie s = TicketVenteModifiee.construire(e);
            assertEquals(3, s.sections.size(), ici);
            Section so = s.sections.get(0);
            Section sm = s.sections.get(1);
            Section sd = s.sections.get(2);
            assertTrue(so.titre.startsWith(TicketVenteModifiee.TITRE_ORIGINE) && so.titre.contains(e.origine.ref),
                    ici + " : " + so.titre);
            assertTrue(sm.titre.startsWith(TicketVenteModifiee.TITRE_MODIFIEE) && sm.titre.contains(e.modifiee.ref),
                    ici + " : " + sm.titre);
            assertEquals(e.origine.articles.size(), so.articles.size(), ici);
            assertEquals(e.modifiee.articles.size(), sm.articles.size(), ici);
            verifierVente(ici, so, e.origine);
            verifierVente(ici, sm, e.modifiee);
            assertEquals(e.payeOrigine, lire(valeur(so, TicketVenteModifiee.PAYE_CLIENT)), ici + " : paye");

            assertEquals(x.total, lire(valeur(sd, TicketVenteModifiee.ECART_TOTAL)), ici);
            assertEquals(x.partClient, lire(valeur(sd, TicketVenteModifiee.ECART_CLIENT)), ici);
            assertEquals(x.remise == 0 ? null : String.valueOf(x.remise),
                    valeur(sd, TicketVenteModifiee.ECART_REMISE) == null ? null
                            : String.valueOf(lire(valeur(sd, TicketVenteModifiee.ECART_REMISE))),
                    ici + " : ecart de remise ecrit seulement s'il existe");
            for (Map.Entry<String, Integer> p : x.parts.entrySet()) {
                assertEquals((int) p.getValue(), lire(valeur(sd, TicketVenteModifiee.ECART_PART + p.getKey())),
                        ici + " : ecart " + p.getKey());
            }
            assertEquals(e.payeOrigine, lire(valeur(sd, TicketVenteModifiee.DEJA_PAYE)), ici);
            if (x.aRendre > 0) {
                assertEquals(x.aRendre, lire(valeur(sd, TicketVenteModifiee.A_RENDRE)), ici);
                assertEquals(null, valeur(sd, TicketVenteModifiee.RESTE), ici);
                rendre++;
            } else {
                assertEquals(x.reste, lire(valeur(sd, TicketVenteModifiee.RESTE)), ici);
                assertEquals(null, valeur(sd, TicketVenteModifiee.A_RENDRE), ici);
                if (x.reste == 0) {
                    egal++;
                } else {
                    resteAPayer++;
                }
            }
            assertTrue(s.subtotal.get(0).startsWith("Net à payer"), ici);
            assertEquals(x.reste, lire(s.subtotal.get(0).split(";")[1].trim()), ici + " : net a payer = reste");
            assertEquals(Math.max(0, e.verse), lire(s.subtotal.get(2).split(";")[1].trim()), ici + " : verse");
            assertEquals(Math.max(0, e.monnaie), lire(s.subtotal.get(3).split(";")[1].trim()), ici + " : monnaie");
            assertEquals(e.origine.articles.size() + e.modifiee.articles.size(), s.articles.size(), ici);
            assertTrue(s.titre.contains(e.modifiee.ref), ici);
        }
        assertTrue(rendre > 1000 && resteAPayer > 1000 && egal > 1000,
                "cas varies : a rendre " + rendre + ", reste a payer " + resteAPayer + ", solde nul " + egal);
    }

    private static void verifierVente(String ici, Section sec, TicketVenteModifiee.Vente v) {
        int lignes = 0;
        for (Article a : sec.articles) {
            assertEquals(a.quantite * a.prixUnitaire, a.montant, ici + " : montant = quantite x prix");
            lignes += a.montant;
        }
        assertEquals(v.total, lignes, ici + " : total = somme des lignes");
        assertEquals(v.total, lire(valeur(sec, "Total")), ici + " : total");
        for (String[] tp : v.tiersPayants) {
            assertEquals(Integer.parseInt(tp[2]), lire(valeur(sec, tp[0] + " " + tp[1] + " %")), ici + " : " + tp[0]);
        }
        assertEquals(v.partClient, lire(valeur(sec, TicketVenteModifiee.PART_CLIENT)), ici + " : part client");
        if (v.remise != 0) {
            assertEquals(v.remise, lire(valeur(sec, "(-) Remise")), ici + " : remise");
        }
    }

    private static String valeur(Section sec, String libelle) {
        for (String[] t : sec.totaux) {
            if (t[0].equals(libelle)) {
                return t[1];
            }
        }
        return null;
    }

    private static Map<String, Integer> parts(List<String[]> tps) {
        Map<String, Integer> m = new HashMap<>();
        for (String[] t : tps) {
            m.merge(t[0], Integer.parseInt(t[2]), Integer::sum);
        }
        return m;
    }

    @Test
    void ecartSigneSeRelit() {
        Random r = new Random(20261119L);
        for (int i = 0; i < 20000; i++) {
            int n = r.nextInt(2_000_001) - 1_000_000;
            String s = TicketVenteModifiee.signe(n);
            assertEquals(n, lire(s), s);
            assertTrue(n > 0 ? s.startsWith("+") : n < 0 ? s.startsWith("-") : s.equals("0"), s);
            assertEquals(s, ConversionTicket.montant(s), "le rendu garde l'ecart tel quel : " + s);
        }
    }
}
