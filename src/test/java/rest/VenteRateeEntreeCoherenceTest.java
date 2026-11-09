package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

import org.junit.jupiter.api.Test;

/**
 * Plan du 08/11, point 13 : une vente ratee passe « Commandé » a l'entree en stock de son produit. Regles verifiees sur
 * des milliers de registres tires au hasard (graine fixe) :
 * <ul>
 * <li>marquee si et seulement si : active, pas encore commandee, produit entre (quantite &gt; 0), demande anterieure a
 * l'entree ;</li>
 * <li>une demande deja commandee, desactivee, posterieure a l'entree ou d'un autre produit n'est jamais touchee ;</li>
 * <li>rejouer la meme entree ne marque plus rien (pas de double marquage) ;</li>
 * <li>commandees apres = commandees avant + marquees ; actives inchangees.</li>
 * </ul>
 */
class VenteRateeEntreeCoherenceTest {

    static final class Demande {
        String statut;
        boolean commandee;
        Date creee;
        String produit;
        String bl;
    }

    /** Ce que fait le service, sur une liste en memoire : rend le nombre de demandes marquees. */
    static int appliquer(List<Demande> registre, Set<String> entres, String bl, Date entree) {
        int n = 0;
        for (Demande d : registre) {
            if (VenteRateeRegles.commandeeParEntree(d.statut, d.commandee, d.creee, entree,
                    entres.contains(d.produit))) {
                d.commandee = true;
                d.bl = bl;
                n++;
            }
        }
        return n;
    }

    @Test
    void marquageParSesRegles() {
        Random h = new Random(13_0811L);
        long base = 1_794_000_000_000L;
        for (int cas = 0; cas < 5000; cas++) {
            int nbProduits = 1 + h.nextInt(6);
            List<Demande> registre = new ArrayList<>();
            for (int i = 0, n = h.nextInt(25); i < n; i++) {
                Demande d = new Demande();
                d.statut = h.nextInt(6) == 0 ? "disable" : "enable";
                d.commandee = h.nextInt(4) == 0;
                d.creee = h.nextInt(30) == 0 ? null : new Date(base + h.nextInt(10) * 3_600_000L);
                d.produit = "p" + h.nextInt(nbProduits);
                registre.add(d);
            }
            Set<String> entres = new HashSet<>();
            for (int i = 0; i < nbProduits; i++) {
                if (h.nextBoolean()) {
                    entres.add("p" + i);
                }
            }
            /* l'entree tombe parfois pile sur une heure de demande : egalite = pas anterieure */
            Date entree = new Date(base + h.nextInt(10) * 3_600_000L);
            List<Boolean> avant = new ArrayList<>();
            int commandeesAvant = 0, activesAvant = 0, attendu = 0;
            for (Demande d : registre) {
                avant.add(d.commandee);
                commandeesAvant += d.commandee ? 1 : 0;
                activesAvant += "enable".equals(d.statut) ? 1 : 0;
                if ("enable".equals(d.statut) && !d.commandee && entres.contains(d.produit) && d.creee != null
                        && d.creee.getTime() < entree.getTime()) {
                    attendu++;
                }
            }
            int marquees = appliquer(registre, entres, "BL" + cas, entree);
            assertEquals(attendu, marquees, "cas " + cas);
            int commandeesApres = 0, activesApres = 0;
            for (int i = 0; i < registre.size(); i++) {
                Demande d = registre.get(i);
                commandeesApres += d.commandee ? 1 : 0;
                activesApres += "enable".equals(d.statut) ? 1 : 0;
                if (d.bl != null) {
                    assertFalse(avant.get(i), "deja commandee : jamais remarquee");
                    assertEquals("enable", d.statut, "desactivee : jamais marquee");
                    assertTrue(entres.contains(d.produit), "produit non entre : jamais marque");
                    assertTrue(d.creee.before(entree), "demande posterieure a l'entree : jamais marquee");
                }
            }
            assertEquals(commandeesAvant + marquees, commandeesApres, "cas " + cas);
            assertEquals(activesAvant, activesApres, "cas " + cas);
            assertEquals(0, appliquer(registre, entres, "BL" + cas, entree), "rejouer l'entree : rien de plus");
        }
    }

    @Test
    void casLimites() {
        Date t = new Date(1_794_000_000_000L), apres = new Date(t.getTime() + 1000);
        assertTrue(VenteRateeRegles.commandeeParEntree("enable", false, t, apres, true));
        assertFalse(VenteRateeRegles.commandeeParEntree("enable", false, t, t, true), "meme instant : pas anterieure");
        assertFalse(VenteRateeRegles.commandeeParEntree("enable", false, apres, t, true), "demande apres l'entree");
        assertFalse(VenteRateeRegles.commandeeParEntree("enable", true, t, apres, true), "deja commandee");
        assertFalse(VenteRateeRegles.commandeeParEntree("disable", false, t, apres, true), "desactivee");
        assertFalse(VenteRateeRegles.commandeeParEntree("enable", false, t, apres, false), "quantite entree 0");
        assertFalse(VenteRateeRegles.commandeeParEntree("enable", false, null, apres, true), "date absente");
        assertFalse(VenteRateeRegles.commandeeParEntree(null, false, t, apres, true), "statut absent");
    }
}
