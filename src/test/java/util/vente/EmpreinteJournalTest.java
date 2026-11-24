package util.vente;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Journal de preuve des ventes en saisie : toute retouche (un caractère, un montant, un état, l'heure), toute ligne
 * retirée ou intervertie se voit, à l'endroit exact ; une chaîne intacte est toujours reconnue intacte.
 */
class EmpreinteJournalTest {

    private static final String[] GESTES = { "METTRE_EN_ATTENTE", "REPRENDRE_ATTENTE", "RETOUR_SUPPRIMER",
            "INTERROMPRE", "SIGNAL_RETROUVE", "REPRENDRE_INTERROMPUE", "EXPIRER", "CLOTURER" };

    private static List<EmpreinteJournal.Ligne> chaine(Random r, int n) {
        List<EmpreinteJournal.Ligne> l = new ArrayList<>();
        String prec = EmpreinteJournal.ORIGINE;
        LocalDateTime t = LocalDateTime.of(2026, 11, 24, 8, 0);
        for (int i = 0; i < n; i++) {
            t = t.plusNanos((r.nextInt(90_000) + 1) * 1_000_000L);
            EmpreinteJournal.Ligne x = new EmpreinteJournal.Ligne(i + 1, t, "V" + r.nextInt(50), "N|" + i,
                    r.nextBoolean(), GESTES[r.nextInt(GESTES.length)], "EN_COURS", "EN_ATTENTE", r.nextBoolean(),
                    r.nextInt(4) == 0 ? null : "motif " + i, null, "U" + r.nextInt(5), "POSTE-" + r.nextInt(3),
                    r.nextInt(20), r.nextInt(4) == 0 ? null : r.nextInt(500_000), null, null).scellee(prec);
            prec = x.empreinte;
            l.add(x);
        }
        return l;
    }

    private static EmpreinteJournal.Ligne retouche(EmpreinteJournal.Ligne o, int champ) {
        switch (champ) {
        case 0:
            return new EmpreinteJournal.Ligne(o.id, o.creeLe.plusSeconds(1), o.venteId, o.numero, o.depot, o.geste,
                    o.etatAvant, o.etatApres, o.admis, o.motif, o.cause, o.utilisateurId, o.poste, o.nbLignes,
                    o.montant, o.empreintePrecedente, o.empreinte);
        case 1:
            return new EmpreinteJournal.Ligne(o.id, o.creeLe, o.venteId, o.numero, o.depot, o.geste, o.etatAvant,
                    o.etatApres, !o.admis, o.motif, o.cause, o.utilisateurId, o.poste, o.nbLignes, o.montant,
                    o.empreintePrecedente, o.empreinte);
        case 2:
            return new EmpreinteJournal.Ligne(o.id, o.creeLe, o.venteId, o.numero, o.depot, o.geste, o.etatAvant,
                    o.etatApres, o.admis, o.motif, o.cause, o.utilisateurId, o.poste, o.nbLignes,
                    o.montant == null ? 0 : o.montant + 1, o.empreintePrecedente, o.empreinte);
        case 3:
            return new EmpreinteJournal.Ligne(o.id, o.creeLe, o.venteId, o.numero, o.depot, o.geste, o.etatAvant,
                    "CLOTUREE", o.admis, o.motif, o.cause, o.utilisateurId, o.poste, o.nbLignes, o.montant,
                    o.empreintePrecedente, o.empreinte);
        default:
            return new EmpreinteJournal.Ligne(o.id, o.creeLe, o.venteId, o.numero, o.depot, o.geste, o.etatAvant,
                    o.etatApres, o.admis, o.motif, o.cause, "AUTRE", o.poste, o.nbLignes, o.montant,
                    o.empreintePrecedente, o.empreinte);
        }
    }

    @Test
    void chaineIntacteReconnue() {
        Random r = new Random(20261124L);
        for (int k = 0; k < 200; k++) {
            assertEquals(-1, EmpreinteJournal.premiereRupture(chaine(r, r.nextInt(60))));
        }
    }

    @Test
    void retoucheVueALaLigneExacte() {
        Random r = new Random(20261125L);
        for (int k = 0; k < 2000; k++) {
            List<EmpreinteJournal.Ligne> l = chaine(r, 2 + r.nextInt(40));
            int i = r.nextInt(l.size());
            l.set(i, retouche(l.get(i), r.nextInt(5)));
            assertEquals(l.get(i).id, EmpreinteJournal.premiereRupture(l));
        }
    }

    @Test
    void ligneRetireeOuInterVertieVue() {
        Random r = new Random(20261126L);
        for (int k = 0; k < 2000; k++) {
            List<EmpreinteJournal.Ligne> l = chaine(r, 3 + r.nextInt(40));
            int i = r.nextInt(l.size() - 1);
            if (r.nextBoolean()) {
                long attendu = l.get(i + 1).id;
                l.remove(i);
                assertEquals(attendu, EmpreinteJournal.premiereRupture(l));
            } else {
                EmpreinteJournal.Ligne a = l.get(i);
                l.set(i, l.get(i + 1));
                l.set(i + 1, a);
                assertEquals(l.get(i).id, EmpreinteJournal.premiereRupture(l));
            }
        }
    }

    /** Le séparateur dans une valeur ne permet pas de fabriquer la même empreinte avec d'autres champs. */
    @Test
    void separateurNonForgeable() {
        LocalDateTime t = LocalDateTime.of(2026, 11, 24, 9, 0);
        EmpreinteJournal.Ligne a = new EmpreinteJournal.Ligne(1, t, "V1", "A|B", false, "CLOTURER", null, null, true,
                null, null, "U", "P", 1, 100, EmpreinteJournal.ORIGINE, null);
        EmpreinteJournal.Ligne b = new EmpreinteJournal.Ligne(1, t, "V1|A", "B", false, "CLOTURER", null, null, true,
                null, null, "U", "P", 1, 100, EmpreinteJournal.ORIGINE, null);
        assertNotEquals(EmpreinteJournal.calculer(a), EmpreinteJournal.calculer(b));
        EmpreinteJournal.Ligne c = new EmpreinteJournal.Ligne(1, t, "V1", null, false, "CLOTURER", null, null, true,
                null, null, "U", "P", 1, 100, EmpreinteJournal.ORIGINE, null);
        EmpreinteJournal.Ligne d = new EmpreinteJournal.Ligne(1, t, "V1", "null", false, "CLOTURER", null, null, true,
                null, null, "U", "P", 1, 100, EmpreinteJournal.ORIGINE, null);
        assertNotEquals(EmpreinteJournal.calculer(c), EmpreinteJournal.calculer(d));
    }

    /**
     * Essai du 24/11 : écrite à 09:00:00.123, l'heure revenait de la base à 09:00:00.000 (pilote) et toute la chaîne
     * paraissait rompue. L'heure est scellée à la seconde : relue avec ou sans fraction, l'empreinte est la même ; une
     * seconde de différence, elle, se voit.
     */
    @Test
    void heureRelueSansFraction() {
        LocalDateTime t = LocalDateTime.of(2026, 11, 24, 9, 0, 0, 123_456_789);
        EmpreinteJournal.Ligne a = new EmpreinteJournal.Ligne(1, t, "V", null, false, "G", null, null, true, null, null,
                null, null, null, null, null, null).scellee(EmpreinteJournal.ORIGINE);
        for (int nanos : new int[] { 0, 123_000_000, 999_999_999 }) {
            EmpreinteJournal.Ligne relue = new EmpreinteJournal.Ligne(1, LocalDateTime.of(2026, 11, 24, 9, 0, 0, nanos),
                    "V", null, false, "G", null, null, true, null, null, null, null, null, null, a.empreintePrecedente,
                    a.empreinte);
            assertEquals(-1, EmpreinteJournal.premiereRupture(List.of(relue)), "relue avec " + nanos + " ns");
        }
        EmpreinteJournal.Ligne autre = new EmpreinteJournal.Ligne(1, t.plusSeconds(1), "V", null, false, "G", null,
                null, true, null, null, null, null, null, null, a.empreintePrecedente, a.empreinte);
        assertEquals(1, EmpreinteJournal.premiereRupture(List.of(autre)));
    }
}
