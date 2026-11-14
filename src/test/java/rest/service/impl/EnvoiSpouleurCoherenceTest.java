package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.print.PrinterException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Rapport d'exploitation du 13/11, point 1 : un ticket ne fige plus le serveur. Test de COHERENCE de
 * {@link EnvoiSpouleur} sur 1 000 envois tires au hasard (graine fixe) : imprimantes reelles et virtuelles, envois
 * rendus tout de suite, en echec ou figes dans le pilote, liberations du pilote entre deux envois.
 * <p>
 * Regles verifiees a chaque envoi : l'appelant reprend la main dans le delai (plus une marge) ; une imprimante
 * virtuelle n'est jamais appelee ; une imprimante deja figee est refusee sans appel ; au-dela de BLOQUES_MAX envois
 * figes, plus rien ne part ; les compteurs suivent exactement le modele et ne sont jamais negatifs ; quand le pilote
 * rend la main, l'imprimante redevient utilisable ; a la fin, plus aucun envoi fige.
 * </p>
 */
class EnvoiSpouleurCoherenceTest {

    private static final long DELAI = 25;
    private static final long MARGE = 400;

    private static final String[] REELLES = { "Star TSP100 Cutter (TSP143)", "EPSON TM-T20II", "Generic / Text Only",
            "HP DeskJet Plus 6400 series", "XPrinter XP-80C" };
    private static final String[] VIRTUELLES = { "Microsoft Print to PDF", "Microsoft XPS Document Writer",
            "OneNote (Desktop)", "OneNote for Windows 10", "Fax", "PDFCreator", "Send To OneNote 2016" };

    @Test
    @DisplayName("Imprimantes virtuelles reconnues, imprimantes a tickets acceptees")
    void virtuelles() {
        for (String v : VIRTUELLES) {
            assertTrue(EnvoiSpouleur.virtuelle(v), v);
        }
        for (String r : REELLES) {
            assertFalse(EnvoiSpouleur.virtuelle(r), r);
        }
        assertFalse(EnvoiSpouleur.virtuelle(null));
        assertFalse(EnvoiSpouleur.virtuelle(""));
    }

    @Test
    @DisplayName("1 000 envois au hasard : delai tenu, refus justes, compteurs exacts, rien ne reste fige")
    void millEnvois() throws Exception {
        EnvoiSpouleur e = new EnvoiSpouleur();
        Random alea = new Random(20261113L);
        Map<String, List<CountDownLatch>> figes = new HashMap<>();
        Map<String, Integer> attendu = new HashMap<>();
        int total = 0;
        int[] issues = new int[EnvoiSpouleur.Issue.values().length];

        for (int i = 0; i < 1000; i++) {
            /* de temps en temps, le pilote rend la main a une imprimante figee */
            if (!figes.isEmpty() && alea.nextInt(4) == 0) {
                List<String> noms = new ArrayList<>(figes.keySet());
                String nom = noms.get(alea.nextInt(noms.size()));
                for (CountDownLatch l : figes.remove(nom)) {
                    l.countDown();
                }
                total -= attendu.remove(nom);
                attendreCompteurs(e, nom, 0, total);
            }

            boolean virtuelle = alea.nextInt(6) == 0;
            String nom = virtuelle ? VIRTUELLES[alea.nextInt(VIRTUELLES.length)]
                    : REELLES[alea.nextInt(REELLES.length)];
            int sorte = alea.nextInt(10); // 0-5 : rendu, 6-7 : echec du pilote, 8-9 : fige
            AtomicInteger appels = new AtomicInteger();
            CountDownLatch liberation = new CountDownLatch(1);
            /* delai court pour les envois figes ; large pour les autres (le demarrage d'un fil ne doit pas compter) */
            long delai = sorte >= 8 ? DELAI : 2000;
            EnvoiSpouleur.Resultat r = e.envoyer(nom, () -> {
                appels.incrementAndGet();
                if (sorte >= 8) {
                    liberation.await();
                } else if (sorte >= 6) {
                    throw new PrinterException("pilote en echec " + nom);
                }
                return null;
            }, delai);
            issues[r.getIssue().ordinal()]++;

            String cas = "envoi " + i + " vers " + nom + " (sorte " + sorte + ") : " + r;
            assertTrue(r.getDureeMs() <= delai + MARGE, "delai depasse, " + cas);
            int dejaFiges = attendu.getOrDefault(nom, 0);
            if (virtuelle) {
                assertEquals(EnvoiSpouleur.Issue.IMPRIMANTE_VIRTUELLE, r.getIssue(), cas);
                assertEquals(0, appels.get(), "imprimante virtuelle appelee, " + cas);
                assertTrue(r.getMessage().contains(nom), cas);
            } else if (dejaFiges > 0 || total >= EnvoiSpouleur.BLOQUES_MAX) {
                assertEquals(EnvoiSpouleur.Issue.IMPRIMANTE_BLOQUEE, r.getIssue(), cas);
                assertEquals(0, appels.get(), "imprimante figee appelee, " + cas);
            } else if (sorte >= 8) {
                assertEquals(EnvoiSpouleur.Issue.DELAI_DEPASSE, r.getIssue(), cas);
                figes.computeIfAbsent(nom, k -> new ArrayList<>()).add(liberation);
                attendu.merge(nom, 1, Integer::sum);
                total++;
            } else if (sorte >= 6) {
                assertEquals(EnvoiSpouleur.Issue.ECHEC, r.getIssue(), cas);
                assertTrue(r.getMessage().contains("pilote en echec"), cas);
            } else {
                assertEquals(EnvoiSpouleur.Issue.ENVOYE, r.getIssue(), cas);
                assertTrue(r.isEnvoye(), cas);
                assertEquals("", r.getMessage(), cas);
                assertEquals(1, appels.get(), cas);
            }
            if (!r.isEnvoye()) {
                assertFalse(r.getMessage().isEmpty(), "un refus doit dire pourquoi, " + cas);
            }
            if (sorte < 8) {
                liberation.countDown();
            }
            assertEquals(attendu.getOrDefault(nom, 0).intValue(), e.getBloques(nom), cas);
            assertEquals(total, e.getBloques(), cas);
            assertTrue(e.getBloques() >= 0 && e.getBloques() <= EnvoiSpouleur.BLOQUES_MAX, cas);
        }

        for (Map.Entry<String, List<CountDownLatch>> f : figes.entrySet()) {
            for (CountDownLatch l : f.getValue()) {
                l.countDown();
            }
        }
        attendreCompteurs(e, null, 0, 0);
        /* le jeu d'essai a bien couvert toutes les issues */
        for (EnvoiSpouleur.Issue issue : EnvoiSpouleur.Issue.values()) {
            assertTrue(issues[issue.ordinal()] > 0, "issue jamais vue : " + issue);
        }
    }

    @Test
    @DisplayName("Un envoi rendu par le pilote juste apres le delai libere l'imprimante")
    void renduEnRetard() throws Exception {
        EnvoiSpouleur e = new EnvoiSpouleur();
        CountDownLatch l = new CountDownLatch(1);
        EnvoiSpouleur.Resultat r = e.envoyer("Star TSP100", () -> {
            l.await();
            return null;
        }, 10);
        assertEquals(EnvoiSpouleur.Issue.DELAI_DEPASSE, r.getIssue());
        assertTrue(r.getMessage().contains("Star TSP100"));
        assertEquals(1, e.getBloques("star tsp100 "), "le nom compte sans la casse ni les espaces");
        assertEquals(EnvoiSpouleur.Issue.IMPRIMANTE_BLOQUEE, e.envoyer("Star TSP100", () -> null, 10).getIssue());
        l.countDown();
        attendreCompteurs(e, "Star TSP100", 0, 0);
        assertEquals(EnvoiSpouleur.Issue.ENVOYE, e.envoyer("Star TSP100", () -> null, 1000).getIssue());
    }

    private static void attendreCompteurs(EnvoiSpouleur e, String nom, int surNom, int total)
            throws InterruptedException {
        long fin = System.currentTimeMillis() + 5000;
        while (System.currentTimeMillis() < fin
                && (e.getBloques() != total || (nom != null && e.getBloques(nom) != surNom))) {
            Thread.sleep(2);
        }
        assertEquals(total, e.getBloques(), "envois figes restants");
        if (nom != null) {
            assertEquals(surNom, e.getBloques(nom), "envois figes restants sur " + nom);
        }
    }
}
