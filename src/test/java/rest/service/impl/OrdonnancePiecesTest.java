package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/**
 * Regles des pieces justificatives des ordonnances (evolution 6, point 2, vague 2).
 *
 * <p>
 * Un fichier depose est la seule donnee de cet ecran qui ne vienne pas du logiciel : c'est donc la seule qui puisse
 * porter un nom hostile, annoncer un type qu'elle n'a pas, ou faire ecrire ailleurs que dans le dossier prevu. Ces
 * tests verrouillent chacun de ces trois cas.
 */
public class OrdonnancePiecesTest {

    @Test
    public void lesTypesAttendusSontAcceptes() {
        for (String nom : new String[] { "ordonnance.pdf", "scan.JPG", "photo.jpeg", "page.png", "fax.tif",
                "fax.TIFF" }) {
            assertTrue(OrdonnancePieces.typeAccepte(nom), nom);
        }
    }

    @Test
    public void toutLeResteEstRefuse() {
        /* Liste BLANCHE : une liste noire laisse toujours passer l'extension qu'on n'avait pas prevue. */
        for (String nom : new String[] { "ordonnance.exe", "script.js", "macro.docm", "archive.zip", "page.html",
                "sans-extension", "", "ordonnance.pdf.exe" }) {
            assertFalse(OrdonnancePieces.typeAccepte(nom), nom);
        }
    }

    @Test
    public void leTypeMimeEstDEDUITDuFichierEtNonAnnonceParLeNavigateur() {
        /*
         * Le type annonce a l'envoi est declaratif. C'est ce type-la qui sera renvoye a la consultation : un type faux
         * ferait telecharger un fichier que le navigateur croirait executable.
         */
        assertEquals("application/pdf", OrdonnancePieces.typeMime("ordonnance.pdf"));
        assertEquals("image/jpeg", OrdonnancePieces.typeMime("scan.JPG"));
        assertEquals("image/png", OrdonnancePieces.typeMime("page.png"));
        assertEquals("image/tiff", OrdonnancePieces.typeMime("fax.tiff"));
        assertEquals("application/octet-stream", OrdonnancePieces.typeMime("inconnu.xyz"));
    }

    @Test
    public void unNomDeFichierHostileEstDesarme() {
        assertEquals("passwd", OrdonnancePieces.assainir("../../../etc/passwd"));
        assertEquals("x.pdf", OrdonnancePieces.assainir("C:\\Windows\\System32\\x.pdf"));
        assertEquals("ordonnance.pdf", OrdonnancePieces.assainir("  /tmp/ordonnance.pdf  "));
        assertEquals("ordonnance.pdf", OrdonnancePieces.assainir("ordonnance.pdf:flux"));
        assertEquals("", OrdonnancePieces.assainir(null));
    }

    @Test
    public void leFichierEstEcritSousUnNomQuiNePeutPasEcraserUnAutre() {
        /*
         * Deux clients peuvent deposer « ordonnance.pdf » le meme jour : garder le nom d'origine ferait s'ecraser leurs
         * documents. Le nom d'origine reste en base, et c'est lui qu'on rend au telechargement.
         */
        assertEquals("piece-1.pdf", OrdonnancePieces.nomSurDisque("piece-1", "ordonnance.pdf"));
        assertEquals("piece-1.jpg", OrdonnancePieces.nomSurDisque("piece-1", "SCAN.JPG"));
        assertEquals("piece-1", OrdonnancePieces.nomSurDisque("piece-1", "sans-extension"));
        // Meme un nom hostile ne sort pas du dossier : il ne reste que l'extension
        assertEquals("piece-1.pdf", OrdonnancePieces.nomSurDisque("piece-1", "../../evasion.pdf"));
    }

    @Test
    public void leCheminEstRelatifEtRangeParMois() {
        /*
         * Relatif : si l'officine change de disque de donnees, les pieces suivent. Un chemin absolu en base aurait
         * rendu illisibles, du jour au lendemain, des annees de documents.
         */
        assertEquals("ordonnances/2026/09/p.pdf", OrdonnancePieces.cheminRelatif(LocalDate.of(2026, 9, 18), "p.pdf"));
        assertEquals("ordonnances/2026/01/p.pdf", OrdonnancePieces.cheminRelatif(LocalDate.of(2026, 1, 5), "p.pdf"));
    }

    @Test
    public void unCheminLuEnBaseNEstSuiviQueSIlEstSur() {
        assertTrue(OrdonnancePieces.cheminSur("ordonnances/2026/09/p.pdf"));
        /* Une base restauree d'un autre site, ou modifiee a la main, ne doit pas faire lire le serveur entier. */
        assertFalse(OrdonnancePieces.cheminSur("/etc/passwd"));
        assertFalse(OrdonnancePieces.cheminSur("ordonnances/../../etc/passwd"));
        assertFalse(OrdonnancePieces.cheminSur("C:/Windows/System32/config"));
        assertFalse(OrdonnancePieces.cheminSur("support/ticket.pdf"));
        assertFalse(OrdonnancePieces.cheminSur(""));
        assertFalse(OrdonnancePieces.cheminSur(null));
    }

    @Test
    public void unFichierValideEstAccepteSansRefus() {
        assertNull(OrdonnancePieces.refus("ordonnance.pdf", 2L * 1024 * 1024));
    }

    @Test
    public void lesRefusDisentQuoiFaire() {
        assertTrue(OrdonnancePieces.refus(null, 10).contains("Aucun fichier"));
        assertTrue(OrdonnancePieces.refus("virus.exe", 10).contains("JPG, PNG, TIFF ou PDF"));
        assertTrue(OrdonnancePieces.refus("vide.pdf", 0).contains("vide"));
        /*
         * Le message porte la taille du fichier ET la limite : « trop gros » sans chiffre ne dit pas quoi faire. La
         * limite est annoncee en Mo ENTIERS : pour un depassement d'un octet, deux valeurs arrondies identiques (« fait
         * 10,0 Mo, limite 10,0 Mo ») ressemblaient a un defaut du logiciel plutot qu'a une regle.
         */
        String juste = OrdonnancePieces.refus("gros.pdf", OrdonnancePieces.TAILLE_MAX + 1);
        assertNotNull(juste);
        assertTrue(juste.contains("limite est de 10 Mo"), juste);
        String enorme = OrdonnancePieces.refus("gros.pdf", 25L * 1024 * 1024);
        assertTrue(enorme.contains("25,0 Mo") && enorme.contains("limite est de 10 Mo"), enorme);
    }

    @Test
    public void laLimiteExacteEstAcceptee() {
        assertNull(OrdonnancePieces.refus("pile.pdf", OrdonnancePieces.TAILLE_MAX));
    }
}
