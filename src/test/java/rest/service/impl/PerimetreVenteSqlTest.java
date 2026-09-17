package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Evolution 5, point 1 : le chiffre d'affaires d'une vente jouee dans un depot d'extension appartient au depot, pas a
 * l'officine, alors que son argent est dans la caisse de l'operateur de l'officine.
 *
 * <p>
 * Ce qui est verifie ici : la clause de perimetre dans les deux sens, le fait qu'une requete purement caisse reste
 * intacte, et - le controle qui compte vraiment - qu'aucune requete de vente de la balance ne reste sur l'ancien
 * perimetre.
 */
public class PerimetreVenteSqlTest {

    private static final String OFFICINE = "p.`lg_EMPLACEMENT_VENTE_ID` IS NULL";

    @Test
    public void pourLOfficineLesVentesDeDepotSontRetirees() {
        String clause = PerimetreVenteSql.clause("m.lg_EMPLACEMENT_ID = ?2", "?2", false);

        assertTrue(clause.contains("m.lg_EMPLACEMENT_ID = ?2"), clause);
        assertTrue(clause.contains(OFFICINE), clause);
        assertFalse(clause.contains("OR"), clause);
    }

    @Test
    public void pourUnDepotLesVentesJoueesDepuisLOfficineSAjoutent() {
        String clause = PerimetreVenteSql.clause("m.lg_EMPLACEMENT_ID = ?2", "?2", true);

        assertTrue(clause.contains("m.lg_EMPLACEMENT_ID = ?2"), clause);
        assertTrue(clause.contains("OR p.`lg_EMPLACEMENT_VENTE_ID` = ?2"), clause);
        // Les deux membres sont parenthesees : sans cela, le OR capturerait les autres conditions du WHERE
        // et la balance d'un depot remonterait des ventes qui ne sont pas les siennes.
        assertTrue(clause.trim().startsWith("("), clause);
        assertTrue(clause.trim().endsWith(")"), clause);
    }

    @Test
    public void quandAucunMouvementNePorteLeDepotLaBrancheInutileEstRetiree() {
        // Retour de l'officine : 6,8 secondes pour un depot SANS AUCUNE vente. Le OR entre deux tables
        // empechait l'usage des index - EXPLAIN donnait un balayage complet de table (type=ALL, aucune cle).
        // Quand aucun mouvement de caisse ne porte ce depot comme magasin, la branche correspondante ne peut
        // rien ramener : on la retire, et il reste une egalite sur colonne indexee.
        String clause = PerimetreVenteSql.clause("m.lg_EMPLACEMENT_ID = ?2", "?2", true, false);

        assertFalse(clause.contains("OR"), clause);
        assertFalse(clause.contains("m.lg_EMPLACEMENT_ID"), clause);
        assertTrue(clause.contains("p.`lg_EMPLACEMENT_VENTE_ID` = ?2"), clause);
    }

    @Test
    public void desQuUnMouvementPorteLeDepotLaBrancheEstConservee() {
        // Un seul mouvement, meme ancien, suffit : on ne perd jamais d'historique pour aller plus vite.
        String clause = PerimetreVenteSql.clause("m.lg_EMPLACEMENT_ID = ?2", "?2", true, true);

        assertTrue(clause.contains("OR"), clause);
        assertTrue(clause.contains("m.lg_EMPLACEMENT_ID = ?2"), clause);
        assertTrue(clause.contains("p.`lg_EMPLACEMENT_VENTE_ID` = ?2"), clause);
    }

    @Test
    public void lePerimetreDeLOfficineNeDependPasDeCeControle() {
        // L'officine retire toujours les ventes de depot, que des mouvements portent un depot ou non.
        String avec = PerimetreVenteSql.clause("m.lg_EMPLACEMENT_ID = ?2", "?2", false, true);
        String sans = PerimetreVenteSql.clause("m.lg_EMPLACEMENT_ID = ?2", "?2", false, false);

        assertEquals(avec, sans);
        assertTrue(avec.contains(OFFICINE), avec);
    }

    @Test
    public void uneRequeteSansVenteResteIntacte() {
        // Achats et autres mouvements de caisse n'ont pas de vente a leur cote : ils n'ont pas de « p ».
        String sql = "SELECT SUM(m.montant) FROM mvttransaction m WHERE m.`typeTransaction` =2"
                + " AND m.`lg_EMPLACEMENT_ID` =?3";

        assertEquals(sql, PerimetreVenteSql.appliquer(sql, false));
        assertEquals(sql, PerimetreVenteSql.appliquer(sql, true));
    }

    @Test
    public void uneRequeteNulleEstToleree() {
        assertEquals(null, PerimetreVenteSql.appliquer(null, false));
    }

    @Test
    public void lesQuatreEcrituresDuPredicatSontTraitees() {
        for (String[] predicat : PerimetreVenteSql.PREDICATS) {
            String sql = "SELECT 1 FROM t_preenregistrement p, mvttransaction m, t_user u WHERE " + predicat[0];
            String officine = PerimetreVenteSql.appliquer(sql, false);
            String depot = PerimetreVenteSql.appliquer(sql, true);

            assertTrue(officine.contains(OFFICINE), predicat[0] + " -> " + officine);
            assertTrue(depot.contains("OR p.`lg_EMPLACEMENT_VENTE_ID` = " + predicat[1]), predicat[0] + " -> " + depot);
        }
    }

    @Test
    public void lePerimetreNEstPosePuQuUneSeuleFois() {
        String sql = "SELECT 1 FROM t_preenregistrement p, mvttransaction m WHERE m.lg_EMPLACEMENT_ID = ?2";
        String une = PerimetreVenteSql.appliquer(sql, false);

        assertEquals(1, compter(une, "lg_EMPLACEMENT_VENTE_ID"), une);
    }

    /**
     * Le controle qui compte : toute requete de la balance qui joint t_preenregistrement ET filtre un emplacement doit
     * utiliser une des ecritures connues du predicat. Une ecriture nouvelle ou differente passerait entre les mailles
     * et laisserait cette requete-la sur l'ancien perimetre - c'est-a-dire melangerait de nouveau les ventes du depot
     * au chiffre de l'officine, sans que rien ne le signale.
     */
    @Test
    public void aucuneRequeteDeVenteDeLaBalanceNEchappeAuPerimetre() throws IOException {
        Path fichier = Paths.get("src/main/java/rest/service/impl/BalanceServiceImpl.java");
        if (!Files.exists(fichier)) {
            return; // execution hors de l'arborescence du projet
        }
        String source = new String(Files.readAllBytes(fichier), StandardCharsets.UTF_8);
        List<String> manquantes = new ArrayList<>();
        Matcher m = Pattern.compile("private static final String (\\w+)\\s*=\\s*((?:\"[^\"]*\"\\s*\\+?\\s*)+);")
                .matcher(source);
        while (m.find()) {
            String nom = m.group(1);
            String corps = m.group(2);
            if (!corps.contains("t_preenregistrement") || !corps.contains("lg_EMPLACEMENT_ID")) {
                continue;
            }
            boolean connue = false;
            for (String[] predicat : PerimetreVenteSql.PREDICATS) {
                if (corps.contains(predicat[0])) {
                    connue = true;
                    break;
                }
            }
            if (!connue) {
                manquantes.add(nom);
            }
        }
        assertTrue(manquantes.isEmpty(),
                "Requetes de vente dont le predicat d'emplacement n'est pas reconnu, et qui restent donc sur"
                        + " l'ancien perimetre : " + manquantes);
    }

    private static int compter(String texte, String motif) {
        int n = 0;
        int i = texte.indexOf(motif);
        while (i >= 0) {
            n++;
            i = texte.indexOf(motif, i + motif.length());
        }
        return n;
    }
}
