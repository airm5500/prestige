package rest.service.correspondance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.correspondance.CorrespondanceRegles.Etat;
import rest.service.correspondance.CorrespondanceRegles.Reception;
import rest.service.correspondance.CorrespondanceRegles.Reception.Action;

/**
 * Coherence de la regle de reception d'un BL (lot 2) : un code lu a l'import, recu sur un BL cloture pour la fiche F,
 * confirme ou contredit la correspondance (grossiste, code). Milliers de cas tires (graine fixe), compares a un oracle
 * ecrit a part, puis regles verifiees : une validation humaine n'est jamais changee d'etat ni de fiche ; seule une
 * correspondance automatique passe CONTREDITE ; compteurs : exactement un des deux augmente de 1.
 */
class ReceptionBlCoherenceTest {

    private static final long GRAINE = 20261108L;
    private static final List<String> FICHES = Arrays.asList("F1", "F2", "F3", "F4");

    private static Action oracle(Etat etat, String famille, List<String> candidats, String recue) {
        if (etat == null) {
            return Action.CREER;
        }
        switch (etat) {
        case AUTO_EXACTE:
            return recue.equals(famille) ? Action.CONFIRMER : Action.CONTREDIRE;
        case VALIDEE:
        case CONTREDITE:
            return recue.equals(famille) ? Action.CONFIRMER : Action.SIGNALER;
        case PROPOSEE:
            return candidats.contains(recue) ? Action.CONFIRMER : Action.SIGNALER;
        default: // REJETEE : la reception va contre la decision humaine, elle est seulement signalee
            return Action.SIGNALER;
        }
    }

    @Test
    void receptionEgaleALOracleEtReglesTenues() {
        Random r = new Random(GRAINE);
        Map<Action, Integer> vus = new EnumMap<>(Action.class);
        for (int i = 0; i < 20_000; i++) {
            Etat etat = r.nextInt(6) == 0 ? null : Etat.values()[r.nextInt(Etat.values().length)];
            String famille = etat == null || etat == Etat.PROPOSEE || r.nextInt(10) == 0 ? null
                    : FICHES.get(r.nextInt(FICHES.size()));
            List<String> candidats = new ArrayList<>();
            if (etat == Etat.PROPOSEE) {
                candidats.addAll(FICHES.subList(0, 2 + r.nextInt(2)));
                Collections.shuffle(candidats, r);
            }
            String recue = FICHES.get(r.nextInt(FICHES.size()));
            int conf = r.nextInt(5), contra = r.nextInt(5);
            Reception rec = CorrespondanceRegles.recevoir(etat, famille, candidats, recue);
            String cas = "cas " + i + " " + etat + "/" + famille + " cand=" + candidats + " recue=" + recue;
            assertEquals(oracle(etat, famille, candidats, recue), rec.action, cas);
            vus.merge(rec.action, 1, Integer::sum);

            // un et un seul compteur augmente de 1
            int c2 = conf + rec.confirmations, k2 = contra + rec.contradictions;
            assertEquals(1, (c2 - conf) + (k2 - contra), cas);
            // etat et fiche apres
            switch (rec.action) {
            case CREER:
                assertEquals(Etat.AUTO_EXACTE, rec.etatApres, cas);
                assertEquals(recue, rec.familleApres, cas);
                assertNull(rec.familleContradiction, cas);
                break;
            case CONFIRMER:
                assertEquals(etat, rec.etatApres, cas);
                assertEquals(famille, rec.familleApres, cas);
                assertNull(rec.familleContradiction, cas);
                break;
            case CONTREDIRE:
                assertEquals(Etat.AUTO_EXACTE, etat, cas);
                assertEquals(Etat.CONTREDITE, rec.etatApres, cas);
                assertEquals(famille, rec.familleApres, "la fiche d'origine reste, pour comparaison " + cas);
                assertEquals(recue, rec.familleContradiction, cas);
                break;
            default: // SIGNALER
                assertEquals(etat, rec.etatApres, cas);
                assertEquals(famille, rec.familleApres, cas);
                assertEquals(recue, rec.familleContradiction, cas);
            }
            // une decision humaine ne change jamais d'etat ni de fiche
            if (etat == Etat.VALIDEE || etat == Etat.REJETEE) {
                assertEquals(etat, rec.etatApres, cas);
                assertEquals(famille, rec.familleApres, cas);
            }
            // seule une correspondance automatique devient CONTREDITE
            if (rec.etatApres == Etat.CONTREDITE) {
                assertTrue(etat == Etat.AUTO_EXACTE || etat == Etat.CONTREDITE, cas);
            }
        }
        for (Action a : Action.values()) {
            assertTrue(vus.getOrDefault(a, 0) > 200, "action peu couverte : " + a + " " + vus);
        }
    }

    @Test
    void casNommes() {
        // premiere reception d'un code inconnu : correspondance creee, source BL
        Reception r = CorrespondanceRegles.recevoir(null, null, Collections.emptyList(), "F1");
        assertEquals(Action.CREER, r.action);
        assertEquals(1, r.confirmations);
        assertEquals(CorrespondanceRegles.Source.BL, r.sourceCreation);
        // validee pour F1, recue pour F2 : reste validee pour F1, contradiction signalee
        r = CorrespondanceRegles.recevoir(Etat.VALIDEE, "F1", Collections.emptyList(), "F2");
        assertEquals(Action.SIGNALER, r.action);
        assertEquals(Etat.VALIDEE, r.etatApres);
        assertEquals("F1", r.familleApres);
        assertEquals("F2", r.familleContradiction);
        assertEquals(1, r.contradictions);
        // automatique pour F1, recue pour F1 : confirmee
        r = CorrespondanceRegles.recevoir(Etat.AUTO_EXACTE, "F1", Collections.emptyList(), "F1");
        assertEquals(Action.CONFIRMER, r.action);
        assertEquals(0, r.contradictions);
    }
}
