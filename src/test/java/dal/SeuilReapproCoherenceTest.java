package dal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import commonTasks.dto.ArticleDTO;
import java.util.Objects;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Retours du 23/11 : le seuil de reapprovisionnement est garde dans deux colonnes, int_SEUIL_MIN (la reference : fiche
 * article, suggestions, ruptures, tableau de bord) et int_STOCK_REAPROVISONEMENT (ecran « Comparaison stock »).
 * Plusieurs ecritures (suggestion, calcul des seuils, entrepot) ne changeaient que la premiere : les deux divergeaient,
 * et l'enregistrement suivant de la fiche les realignait sans le dire.
 * <p>
 * Regles verifiees sur 20 000 suites d'ecritures tirees au hasard (graine fixe) : apres toute ecriture du seuil, les
 * deux colonnes sont egales ; l'ecriture de la fiche (colonne de saisie puis recopie) donne la valeur saisie ; le seuil
 * presente par « Comparaison stock » est la reference (0 si vide).
 */
class SeuilReapproCoherenceTest {

    private static Integer valeur(Random r) {
        int k = r.nextInt(6);
        return k == 0 ? null : (k == 1 ? 0 : r.nextInt(5_000));
    }

    /** Fiche aux autres compteurs renseignes (ArticleDTO les lit en int). */
    private static TFamille fiche() {
        TFamille f = new TFamille();
        f.setIntQTEREAPPROVISIONNEMENT(0);
        f.setIntNUMBERDETAIL(0);
        f.setIntPAF(0);
        f.setIntPRICE(0);
        return f;
    }

    @Test
    void ecrituresAuHasard() {
        Random r = new Random(20261123L);
        int ecritures = 0;
        int ecartsDeDepart = 0;
        for (int i = 0; i < 20_000; i++) {
            TFamille f = fiche();
            // etat lu en base : les deux colonnes peuvent diverger (donnees anciennes), le chargement JPA ne passe pas
            // par les setters ; on le reproduit en posant la colonne miroir en dernier
            f.setIntSEUILMIN(valeur(r));
            f.setIntSTOCKREAPROVISONEMENT(valeur(r));
            if (!Objects.equals(f.getIntSEUILMIN(), f.getIntSTOCKREAPROVISONEMENT())) {
                ecartsDeDepart++;
            }
            int n = 1 + r.nextInt(4);
            for (int k = 0; k < n; k++) {
                Integer v = valeur(r);
                switch (r.nextInt(3)) {
                case 0:
                    // suggestion, calcul des seuils, entrepot, recalcul : seule la reference est ecrite
                    f.setIntSEUILMIN(v);
                    break;
                case 1:
                    // fiche article (creation, modification, inventaire) : colonne de saisie puis recopie
                    f.setIntSTOCKREAPROVISONEMENT(v);
                    f.setIntSEUILMIN(f.getIntSTOCKREAPROVISONEMENT());
                    assertEquals(v, f.getIntSEUILMIN(), "cas " + i + " : la fiche garde la valeur saisie");
                    break;
                default:
                    f.setIntSEUILMIN(v);
                    f.setIntSEUILMIN(v);
                    break;
                }
                ecritures++;
                assertEquals(f.getIntSEUILMIN(), f.getIntSTOCKREAPROVISONEMENT(),
                        "cas " + i + " : les deux colonnes egales apres l'ecriture " + k);
                ArticleDTO a = new ArticleDTO(f, 0, "", "");
                int attendu = f.getIntSEUILMIN() == null ? 0 : f.getIntSEUILMIN();
                assertEquals(attendu, a.getSeuiRappro(), "cas " + i + " : Comparaison stock = reference");
            }
        }
        assertTrue(ecritures > 40_000 && ecartsDeDepart > 10_000, ecritures + " / " + ecartsDeDepart);
    }

    @Test
    void comparaisonStockSurDonneesDivergentes() {
        // donnees anciennes, non encore realignees : l'ecran suit la reference, pas la colonne miroir
        TFamille f = fiche();
        f.setIntSEUILMIN(12);
        f.setIntSTOCKREAPROVISONEMENT(30);
        assertEquals(12, new ArticleDTO(f, 20, "", "").getSeuiRappro());
        f.setIntSEUILMIN(null);
        f.setIntSTOCKREAPROVISONEMENT(5);
        assertEquals(0, new ArticleDTO(f, 3, "", "").getSeuiRappro());
    }
}
