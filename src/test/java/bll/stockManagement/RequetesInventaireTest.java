package bll.stockManagement;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

/**
 * Ouverture d'un inventaire volumineux : la liste des lignes ne doit pas cumuler DISTINCT et GROUP BY.
 *
 * Mesure faite sur les donnees reelles de l'officine (17 374 lignes, un seul inventaire) : la requete de la grille
 * mettait 130 s, soit au-dela du delai d'attente de 3 minutes du navigateur, et l'ecran restait vide. La meme requete
 * privee du seul mot DISTINCT rend les memes 17 372 lignes en 0,19 s.
 *
 * Le mecanisme : avec DISTINCT ET GROUP BY, MariaDB construit une table temporaire ; tant qu'elle tient en memoire
 * (tmp_table_size) tout va vite, et des qu'elle deborde sur le disque le dedoublonnage s'effondre. D'ou la bascule
 * brutale observee entre 17 200 lignes (0,24 s) et 17 374 lignes (130 s) — et le fait que les petits inventaires par
 * emplacement s'ouvrent normalement alors que l'inventaire global reste bloque.
 *
 * Le DISTINCT etait sans effet : le GROUP BY sur le produit donne deja une ligne par produit, et la cle primaire de la
 * ligne d'inventaire fait partie des colonnes lues. Verifie sur les donnees reelles : meme nombre de lignes, meme
 * empreinte.
 *
 * Ce test relit le source pour que la combinaison ne puisse pas revenir par inadvertance dans une requete JPQL.
 */
class RequetesInventaireTest {

    private static final Path SOURCE = Paths.get("src/main/java/bll/stockManagement/InventaireManager.java");

    private static List<String> requetesCumulantDistinctEtGroupBy() throws IOException {
        List<String> fautives = new ArrayList<>();
        for (String ligne : Files.readAllLines(SOURCE, StandardCharsets.UTF_8)) {
            String texte = ligne.toUpperCase();
            if (texte.contains("SELECT DISTINCT") && texte.contains("GROUP BY")) {
                fautives.add(ligne.trim());
            }
        }
        return fautives;
    }

    @Test
    void leSourceEstLisible() throws IOException {
        assertTrue(Files.exists(SOURCE), "source introuvable : " + SOURCE.toAbsolutePath());
        assertTrue(Files.size(SOURCE) > 0, "source vide");
    }

    @Test
    void aucuneRequeteNeCumuleDistinctEtGroupBy() throws IOException {
        List<String> fautives = requetesCumulantDistinctEtGroupBy();
        assertTrue(fautives.isEmpty(), "requete(s) cumulant DISTINCT et GROUP BY : " + fautives.size()
                + " — la premiere : " + (fautives.isEmpty() ? "" : fautives.get(0).substring(0, 120)));
    }

    /** Le GROUP BY par produit, lui, doit rester : c'est lui qui donne une ligne par produit dans la grille. */
    @Test
    void leRegroupementParProduitEstConserve() throws IOException {
        long compte = Files.readAllLines(SOURCE, StandardCharsets.UTF_8).stream()
                .filter(l -> l.contains("GROUP BY t.lgFAMILLEID.lgFAMILLEID")).count();
        assertTrue(compte >= 3, "regroupement par produit attendu dans les requetes de liste, trouve : " + compte);
    }
}
