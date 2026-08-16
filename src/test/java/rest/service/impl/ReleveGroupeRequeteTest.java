package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Releve des factures de groupe : la requete doit nommer chaque colonne.
 *
 * Incident constate a l'edition : "Encountered a duplicated sql alias [str_CODE_FACTURE] during auto-discovery of a
 * native-sql query". La requete ramene DEUX colonnes qui portent le meme nom dans la base - le numero de la facture de
 * groupe et le numero de la facture de l'organisme - et le moteur refuse de deviner laquelle est laquelle.
 *
 * Le controle ne demande pas de base de donnees : il lit la requete telle qu'elle est ecrite.
 */
class ReleveGroupeRequeteTest {

    /** Les expressions de la clause SELECT, en respectant les parentheses (COALESCE(a, b, '') est UNE colonne). */
    private static List<String> colonnes(String requete) {
        String selection = requete.substring(requete.toUpperCase(Locale.ROOT).indexOf("SELECT") + 6,
                requete.toUpperCase(Locale.ROOT).indexOf(" FROM "));
        List<String> colonnes = new ArrayList<>();
        StringBuilder courante = new StringBuilder();
        int profondeur = 0;
        boolean chaine = false;
        for (char c : selection.toCharArray()) {
            if (c == '\'') {
                chaine = !chaine;
            }
            if (!chaine && c == '(') {
                profondeur++;
            }
            if (!chaine && c == ')') {
                profondeur--;
            }
            if (!chaine && c == ',' && profondeur == 0) {
                colonnes.add(courante.toString().trim());
                courante.setLength(0);
            } else {
                courante.append(c);
            }
        }
        if (courante.toString().trim().length() > 0) {
            colonnes.add(courante.toString().trim());
        }
        return colonnes;
    }

    private static String alias(String colonne) {
        int i = colonne.toUpperCase(Locale.ROOT).lastIndexOf(" AS ");
        return i < 0 ? null : colonne.substring(i + 4).trim();
    }

    @Test
    @DisplayName("Chaque colonne du releve porte un nom, et deux colonnes ne portent jamais le meme")
    void chaqueColonneEstNommee() {
        List<String> colonnes = colonnes(ReleveGroupeFactureServiceImpl.REQUETE);
        assertEquals(9, colonnes.size(), "le releve lit neuf colonnes, dans cet ordre");

        Set<String> noms = new LinkedHashSet<>();
        for (String colonne : colonnes) {
            String alias = alias(colonne);
            assertTrue(alias != null, "colonne sans nom : " + colonne);
            assertTrue(noms.add(alias.toLowerCase(Locale.ROOT)),
                    "deux colonnes portent le nom « " + alias + " » : le moteur ne peut pas les distinguer");
        }
    }

    @Test
    @DisplayName("Les deux numeros de facture sont bien distingues")
    void lesDeuxNumerosDeFacture() {
        String requete = ReleveGroupeFactureServiceImpl.REQUETE;
        assertTrue(requete.contains("g.`str_CODE_FACTURE` AS codeFactureGroupe"),
                "le numero de la facture de groupe doit etre nomme");
        assertTrue(requete.contains("f.`str_CODE_FACTURE` AS codeFacture"),
                "le numero de la facture de l'organisme doit etre nomme");
    }

    @Test
    @DisplayName("Les bornes de dates restent en >= et <=, jamais en BETWEEN")
    void pasDeBetween() {
        assertTrue(!ReleveGroupeFactureServiceImpl.REQUETE.toUpperCase(Locale.ROOT).contains("BETWEEN"),
                "les bornes de periode se posent en >= et <=");
    }
}
