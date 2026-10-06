package rest.service.impl.rh;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Plan d'octobre, section 3 : export de pointeuse lu selon un modele. */
public class ImportPointeuseTest {

    private static List<String> l(String... c) {
        return Arrays.asList(c);
    }

    @Test
    public void colonnesSepareesAvecSens() {
        ImportPointeuse.Modele m = new ImportPointeuse.Modele();
        m.colSens = 4;
        List<ImportPointeuse.Ligne> r = ImportPointeuse.lire(
                Arrays.asList(l("Badge", "Date", "Heure", "Etat"), l("B1", "02/11/2026", "08:05", "IN"),
                        l("B1", "02/11/2026", "17:02:30", "out"), l("", "02/11/2026", "08:00", "IN"),
                        l("B2", "31/02/2026", "08:00", "IN"), l("B3", "02/11/2026", "08:00", "?"), l("", "", "", "")),
                m);
        assertEquals(5, r.size(), "ligne vide ignoree");
        assertEquals(LocalDateTime.of(2026, 11, 2, 8, 5), r.get(0).horodatage);
        assertEquals("ENTREE", r.get(0).sens);
        assertEquals("SORTIE", r.get(1).sens);
        assertEquals(LocalDateTime.of(2026, 11, 2, 17, 2), r.get(1).horodatage.withSecond(0));
        assertEquals("badge absent", r.get(2).erreur);
        assertTrue(r.get(3).erreur.contains("illisible"));
        assertEquals("INCONNU", r.get(4).sens);
        assertEquals(3, r.get(0).numero + 1, "numero de ligne du fichier (entete = 1)");
    }

    @Test
    public void dateEtHeureDansUneColonneEtNombreDeClasseur() {
        ImportPointeuse.Modele m = new ImportPointeuse.Modele();
        m.colHeure = 0;
        m.formatDate = "yyyy-MM-dd HH:mm:ss";
        m.entete = false;
        List<ImportPointeuse.Ligne> r = ImportPointeuse
                .lire(Arrays.asList(l("B1", "2026-11-02 07:58:10"), l("B1", "46328.75")), m);
        assertEquals(LocalDateTime.of(2026, 11, 2, 7, 58, 10), r.get(0).horodatage);
        assertNull(r.get(1).erreur);
        assertEquals(18, r.get(1).horodatage.getHour());
    }

    @Test
    public void modeleControle() {
        ImportPointeuse.Modele m = new ImportPointeuse.Modele();
        m.formatDate = "pas un format {";
        assertTrue(ImportPointeuse.controler(m).contains("Format"));
        m = new ImportPointeuse.Modele();
        m.colBadge = 0;
        assertTrue(ImportPointeuse.controler(m).contains("obligatoires"));
        assertEquals(3, ImportPointeuse.Modele.valeurs("in, E;0").size());
    }
}
