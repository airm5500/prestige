package rest.service.impl.whatsapp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Plan du 09/11, point 13 : origine des envois WhatsApp et etapes de leur suivi, verifiees par leurs regles sur des
 * milliers de lignes de journal tirees au hasard (graine fixe).
 */
class OrigineEnvoiCoherenceTest {

    private static final List<String> STATUTS = Arrays.asList("SIMULE", "ENVOYE", "DELIVRE", "LU", "ECHEC", "OUVERT",
            "PREPARE", null, "INCONNU");

    @Test
    void casDeBase() {
        assertEquals("TICKET_Z", OrigineEnvoi.afficher("TICKET_Z", null, false));
        assertEquals("CAMPAGNE", OrigineEnvoi.afficher(null, "N1", true));
        assertEquals("RAPPEL", OrigineEnvoi.afficher(null, "N1", false));
        assertEquals("NON_PRECISEE", OrigineEnvoi.afficher(null, null, false));
        /* une origine enregistree prime sur la deduction */
        assertEquals("ESSAI", OrigineEnvoi.afficher("ESSAI", "N1", true));
        assertNull(OrigineEnvoi.valide("N'IMPORTE"));
        assertEquals("Ticket Z", OrigineEnvoi.libelle("TICKET_Z"));
        assertEquals("Non précisée", OrigineEnvoi.libelle("NON_PRECISEE"));
        assertEquals(0, OrigineEnvoi.etapes("ECHEC"));
        assertEquals(1, OrigineEnvoi.etapes("SIMULE"));
        assertEquals(2, OrigineEnvoi.etapes("ENVOYE"));
        assertEquals(3, OrigineEnvoi.etapes("DELIVRE"));
        assertEquals(4, OrigineEnvoi.etapes("LU"));
        assertEquals(2, OrigineEnvoi.etapes("OUVERT"));
        assertEquals("Distribué", OrigineEnvoi.etat("DELIVRE"));
        assertEquals("Lien ouvert", OrigineEnvoi.etat("OUVERT"));
    }

    @Test
    void reglesSurDesMilliersDeLignes() {
        Random r = new Random(20261113L);
        Set<String> vues = new HashSet<>();
        for (int i = 0; i < 6000; i++) {
            String enregistree = r.nextInt(3) == 0 ? null : (r.nextInt(10) == 0 ? "AUTRE"
                    : OrigineEnvoi.ORIGINES.get(r.nextInt(OrigineEnvoi.ORIGINES.size())));
            String notif = r.nextBoolean() ? "N" + r.nextInt(1000) : null;
            boolean campagne = notif != null && r.nextBoolean();
            String statut = STATUTS.get(r.nextInt(STATUTS.size()));

            String o = OrigineEnvoi.afficher(enregistree, notif, campagne);
            vues.add(o);
            /* origine enregistree valide : gardee telle quelle */
            if (enregistree != null && OrigineEnvoi.ORIGINES.contains(enregistree)) {
                assertEquals(enregistree, o);
            } else if (notif != null) {
                /* sinon : une notification est une campagne ou un rappel, selon la campagne */
                assertEquals(campagne ? "CAMPAGNE" : "RAPPEL", o);
            } else {
                assertEquals("NON_PRECISEE", o);
            }
            /* toujours un libelle, jamais vide ; « non precisee » seulement sans origine sure */
            String lib = OrigineEnvoi.libelle(o);
            assertFalse(lib.isEmpty());
            assertEquals("NON_PRECISEE".equals(o), "Non précisée".equals(lib));

            /* etapes : entre 0 et 4 ; 0 seulement pour un echec ; un lien ne depasse pas 2 */
            int e = OrigineEnvoi.etapes(statut);
            assertTrue(e >= 0 && e <= 4);
            assertEquals("ECHEC".equals(statut), e == 0);
            if ("OUVERT".equals(statut)) {
                assertEquals(2, e);
            }
            /* l'etat affiche suit l'etape */
            String etat = OrigineEnvoi.etat(statut);
            assertFalse(etat.isEmpty());
            if (e == 4) {
                assertEquals("Lu", etat);
            }
            if (e == 3) {
                assertEquals("Distribué", etat);
            }
        }
        /* jeu varie : toutes les origines et la deduction ont ete vues */
        assertTrue(vues.containsAll(OrigineEnvoi.ORIGINES) && vues.contains("NON_PRECISEE"), vues.toString());
    }

    /** L'ordre des etapes suit l'ordre des statuts du webhook (un statut ne recule jamais). */
    @Test
    void etapesDansLOrdreDesStatuts() {
        List<String> ordre = Arrays.asList("SIMULE", "ENVOYE", "DELIVRE", "LU");
        for (int i = 1; i < ordre.size(); i++) {
            assertTrue(OrigineEnvoi.etapes(ordre.get(i)) > OrigineEnvoi.etapes(ordre.get(i - 1)), ordre.get(i));
        }
        /* les libelles des origines sont distincts deux a deux */
        Set<String> libelles = new HashSet<>();
        for (String o : OrigineEnvoi.ORIGINES) {
            assertTrue(libelles.add(OrigineEnvoi.libelle(o)), o);
        }
    }
}
