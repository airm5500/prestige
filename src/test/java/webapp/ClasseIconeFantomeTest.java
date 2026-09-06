package webapp;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Garde contre le retour de la classe « x-display-hide ».
 *
 * <p>
 * Cette classe n'existe dans aucune feuille de style, ni celles d'ExtJS ni celles du projet. Elle etait pourtant
 * renvoyee par soixante-treize {@code getClass} de colonnes d'action pour AFFICHER une icone : cela fonctionnait par
 * accident, une classe inconnue n'ayant aucun effet. Le jour ou un theme ou une montee de version viendrait a la
 * definir - le nom est plausible, il est le miroir exact de « x-hide-display », qui masque reellement - toutes ces
 * icones disparaitraient d'un coup, la case restant cliquable.
 * </p>
 *
 * <p>
 * L'ecriture juste est de ne renvoyer aucune classe : {@code return ""}. Ce test relit les sources de l'interface pour
 * s'en assurer.
 * </p>
 */
class ClasseIconeFantomeTest {

    private static final String FANTOME = "x-display-hide";
    /** Celle-ci existe bel et bien : {@code .x-hide-display{display:none!important}}. */
    private static final String VRAIE = "x-hide-display";

    private static List<Path> sourcesInterface() throws IOException {
        Path racine = Paths.get("src/main/webapp/general/app");
        try (Stream<Path> chemins = Files.walk(racine)) {
            List<Path> fichiers = new ArrayList<>();
            chemins.filter(Files::isRegularFile).filter(p -> p.toString().endsWith(".js")).forEach(fichiers::add);
            return fichiers;
        }
    }

    @Test
    @DisplayName("Aucune vue ne renvoie la classe fantome « x-display-hide »")
    void aucuneClasseFantome() throws IOException {
        List<String> coupables = new ArrayList<>();
        for (Path fichier : sourcesInterface()) {
            /*
             * Le rapport nomme le fichier, la LIGNE et son contenu : quand ces occurrences reviennent - une fusion qui
             * garde l'ancienne version d'une vue, par exemple - il faut pouvoir corriger sans avoir a rechercher
             * soi-meme dans neuf fichiers.
             */
            List<String> lignes = Files.readAllLines(fichier, StandardCharsets.UTF_8);
            for (int i = 0; i < lignes.size(); i++) {
                if (lignes.get(i).contains(FANTOME)) {
                    coupables.add("  " + fichier + ":" + (i + 1) + "   " + lignes.get(i).trim());
                }
            }
        }
        assertTrue(coupables.isEmpty(),
                "La classe « " + FANTOME + " » n'existe dans aucune feuille de style, ni celles d'ExtJS ni celles du"
                        + " projet : l'icone qui en depend est invisible des qu'un theme la definit, la case de seize"
                        + " pixels restant cliquable.\n"
                        + "Corrigez en renvoyant une chaine vide - « return '' » - qui est ce que la classe inconnue"
                        + " fait deja, mais en le disant.\n"
                        + "Attention a ne pas confondre avec « x-hide-display », qui existe, masque reellement, et ne"
                        + " doit pas etre touchee.\n" + coupables.size() + " occurrence(s) :\n"
                        + String.join("\n", coupables));
    }

    @Test
    @DisplayName("Le test sait distinguer la classe fantome de la vraie classe qui masque")
    void leTestNeConfondPasLesDeuxClasses() throws IOException {
        // Garde-fou du garde-fou : « x-hide-display » est employe partout et ne doit jamais etre signale.
        long fichiersAvecLaVraie = 0;
        for (Path fichier : sourcesInterface()) {
            String contenu = new String(Files.readAllBytes(fichier), StandardCharsets.UTF_8);
            if (contenu.contains(VRAIE)) {
                fichiersAvecLaVraie++;
            }
        }
        assertTrue(fichiersAvecLaVraie > 10,
                "la vraie classe devrait rester largement employee, or elle n'apparait que dans " + fichiersAvecLaVraie
                        + " fichier(s) : le test ne mesure probablement pas ce qu'il croit");
    }
}
