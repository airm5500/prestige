package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Retours du 25/11 (1.5) : filtres du journal des ventes en saisie. Sur des milliers de combinaisons tirées avec une
 * graine fixe : chaque paramètre ?n du SQL a sa valeur, dans l'ordre ; un filtre vide ne restreint rien ; « SERVEUR » =
 * gestes du serveur (utilisateur absent) ; le texte du motif est cherché tel quel (% et _ échappés) ; la période couvre
 * le dernier jour entier.
 */
class FiltreJournalCoherenceTest {

    private static final String[] GESTES = { null, "", "  ", "DEBUT_SAISIE", "RETOUR_SUPPRIMER",
            "ABANDONNER_INTERROMPUE" };
    private static final String[] POSTES = { null, "", "POSTE-1", "192.168.1.20", "caisse 2" };
    private static final String[] UTILISATEURS = { null, "", "SERVEUR", "E2E-JS1", "abc-123" };
    private static final String[] MOTIFS = { null, "", "FERMETURE", "Droit manquant", "100%", "a_b", "x\\y", " MENU " };

    @Test
    void chaqueParametreASaValeurEtUnFiltreVideNeRestreintRien() {
        Random r = new Random(20261125L);
        Pattern p = Pattern.compile("\\?(\\d+)");
        for (int i = 0; i < 5000; i++) {
            String g = GESTES[r.nextInt(GESTES.length)], po = POSTES[r.nextInt(POSTES.length)];
            String u = UTILISATEURS[r.nextInt(UTILISATEURS.length)], m = MOTIFS[r.nextInt(MOTIFS.length)];
            LocalDate du = LocalDate.of(2026, 1, 1).plusDays(r.nextInt(300));
            LocalDate au = du.plusDays(r.nextInt(40));
            VenteSaisieRessource.FiltreJournal f = new VenteSaisieRessource.FiltreJournal(du.toString(), au.toString(),
                    g, po, u, m);
            List<Object> valeurs = new ArrayList<>();
            String w = f.where(valeurs);
            /* indices utilises = 1..n, chacun avec sa valeur */
            Matcher mt = p.matcher(w);
            int max = 0;
            while (mt.find()) {
                max = Math.max(max, Integer.parseInt(mt.group(1)));
            }
            assertEquals(valeurs.size(), max, w);
            /* periode : du inclus, lendemain de au exclu */
            assertEquals(java.sql.Date.valueOf(du), valeurs.get(0));
            assertEquals(java.sql.Date.valueOf(au.plusDays(1)), valeurs.get(1));
            int attendus = 2;
            boolean gVide = g == null || g.trim().isEmpty();
            assertEquals(!gVide, w.contains("j.geste = ?"), w);
            if (!gVide) {
                attendus++;
                assertTrue(valeurs.contains(g.trim()));
            }
            boolean pVide = po == null || po.trim().isEmpty();
            assertEquals(!pVide, w.contains("j.poste = ?"), w);
            if (!pVide) {
                attendus++;
            }
            boolean uVide = u == null || u.trim().isEmpty();
            if ("SERVEUR".equals(u)) {
                assertTrue(w.contains("j.utilisateur_id IS NULL"), w);
                assertFalse(w.contains("j.utilisateur_id = ?"), w);
            } else {
                assertEquals(!uVide, w.contains("j.utilisateur_id = ?"), w);
                if (!uVide) {
                    attendus++;
                }
            }
            boolean mVide = m == null || m.trim().isEmpty();
            assertEquals(!mVide, w.contains("j.motif LIKE ?"), w);
            if (!mVide) {
                attendus++;
                String motif = (String) valeurs.get(valeurs.size() - 1);
                assertTrue(motif.startsWith("%") && motif.endsWith("%"), motif);
                String coeur = motif.substring(1, motif.length() - 1);
                /* aucun joker libre : chaque % ou _ du texte est echappe */
                assertFalse(coeur.replace("\\\\", "").replace("\\%", "").replace("\\_", "").matches(".*[%_].*"), coeur);
                assertEquals(m.trim(), coeur.replace("\\%", "%").replace("\\_", "_").replace("\\\\", "\\"));
            }
            assertEquals(attendus, valeurs.size(), w);
        }
    }

    @Test
    void sansDateLaPeriodeEstLeJourMeme() {
        VenteSaisieRessource.FiltreJournal f = new VenteSaisieRessource.FiltreJournal(null, "", null, null, null, null);
        List<Object> v = new ArrayList<>();
        f.where(v);
        assertEquals(java.sql.Date.valueOf(LocalDate.now()), v.get(0));
        assertEquals(java.sql.Date.valueOf(LocalDate.now().plusDays(1)), v.get(1));
        assertEquals(2, v.size());
    }

    @Test
    void libelleRappelleChaqueFiltre() {
        VenteSaisieRessource.FiltreJournal f = new VenteSaisieRessource.FiltreJournal("2026-11-01", "2026-11-25",
                "RETOUR_SUPPRIMER", "POSTE-1", "SERVEUR", "FERMETURE");
        String l = f.libelle(id -> "Nom " + id);
        assertEquals(
                "Du 01/11/2026 au 25/11/2026 ; geste : Retour : vente abandonnée ; poste : POSTE-1 ; utilisateur : Serveur"
                        + " ; motif ou cause : « FERMETURE »",
                l);
        assertEquals("Du 01/11/2026 au 25/11/2026 ; utilisateur : Nom U1",
                new VenteSaisieRessource.FiltreJournal("2026-11-01", "2026-11-25", null, null, "U1", null)
                        .libelle(id -> "Nom " + id));
    }
}
