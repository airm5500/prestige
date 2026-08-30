package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Couleurs de mise en evidence des lignes : une saisie erronee dans l'ecran des parametrages ne doit jamais rendre les
 * listes illisibles, la couleur d'origine reprend la main.
 */
public class CouleurLigneParametreTest {

    private static final String DEFAUT = ParametreRessource.COULEUR_SURVOL_DEFAUT;

    @Test
    @DisplayName("un code hexadecimal a 6 chiffres est accepte")
    public void codeSixChiffresAccepte() {
        assertEquals("#FFCC80", ParametreRessource.couleurValide("#ffcc80", DEFAUT));
    }

    @Test
    public void codeTroisChiffresAccepte() {
        assertEquals("#FC8", ParametreRessource.couleurValide("#fc8", DEFAUT));
    }

    @Test
    public void diezeFacultatif() {
        assertEquals("#CE93D8", ParametreRessource.couleurValide("ce93d8", DEFAUT));
    }

    @Test
    public void espacesIgnores() {
        assertEquals("#FFCC80", ParametreRessource.couleurValide("  #FFCC80  ", DEFAUT));
    }

    @Test
    @DisplayName("valeur vide : la couleur d'origine reprend la main")
    public void valeurVideRendLaCouleurDOrigine() {
        assertEquals(DEFAUT, ParametreRessource.couleurValide("", DEFAUT));
        assertEquals(DEFAUT, ParametreRessource.couleurValide("   ", DEFAUT));
        assertEquals(DEFAUT, ParametreRessource.couleurValide(null, DEFAUT));
    }

    @Test
    @DisplayName("saisie erronee : la couleur d'origine reprend la main")
    public void saisieErroneeRendLaCouleurDOrigine() {
        assertEquals(DEFAUT, ParametreRessource.couleurValide("orange", DEFAUT));
        assertEquals(DEFAUT, ParametreRessource.couleurValide("#12345", DEFAUT));
        assertEquals(DEFAUT, ParametreRessource.couleurValide("#gggggg", DEFAUT));
        assertEquals(DEFAUT, ParametreRessource.couleurValide("#ffcc80ff", DEFAUT));
    }
}
