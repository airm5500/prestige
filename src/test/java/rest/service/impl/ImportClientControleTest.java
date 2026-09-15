package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.impl.ImportClientControle.Correspondance;
import rest.service.impl.ImportClientControle.Ligne;

/**
 * Evolution 5, point 3 : import de clients standards avec choix des colonnes et controle des lignes.
 *
 * <p>
 * L'import historique lisait les colonnes par leur position, figee dans le code, sans aucun controle : une seule ligne
 * fautive faisait echouer le lot entier, et un fichier aux colonnes dans un autre ordre etait importe de travers. Ces
 * controles fixent le comportement attendu : chaque ligne est jugee separement, et le rapport est connu avant toute
 * ecriture.
 * </p>
 */
public class ImportClientControleTest {

    private static List<List<String>> fichier(String... lignes) {
        List<List<String>> out = new ArrayList<>();
        for (String l : lignes) {
            out.add(Arrays.asList(l.split(";", -1)));
        }
        return out;
    }

    @Test
    public void lesColonnesSontCellesQueLAppelantDesigne() {
        // Le telephone en premiere colonne, le nom en troisieme : l'ordre du fichier n'a pas d'importance.
        List<List<String>> f = fichier("0708473750;Jean Marc;KOFFI");
        ImportClientControle r = ImportClientControle.controler(f, new Correspondance(2, 1, 0, false),
                Collections.emptyList());
        assertEquals(1, r.retenues().size(), r.resume());
        Ligne l = r.retenues().get(0);
        assertEquals("KOFFI", l.getNom());
        assertEquals("Jean Marc", l.getPrenoms());
        assertEquals("0708473750", l.getTelephone());
    }

    @Test
    public void laPremiereLigneDEnteteEstIgnoreeQuandOnLeDit() {
        List<List<String>> f = fichier("NOM;PRENOMS;TELEPHONE", "KOFFI;Jean;0708473750");
        assertEquals(1, ImportClientControle.controler(f, new Correspondance(0, 1, 2, true), Collections.emptyList())
                .getLignes().size());
        // Sans en-tete declaree, la ligne de titres est jugee comme une ligne de donnees et rejetee :
        // c'est bien ce qu'on veut, plutot que de creer un client « NOM PRENOMS ».
        ImportClientControle sansEntete = ImportClientControle.controler(f, new Correspondance(0, 1, 2, false),
                Collections.emptyList());
        assertEquals(2, sansEntete.getLignes().size());
        assertEquals(1, sansEntete.rejetees().size());
        assertTrue(sansEntete.rejetees().get(0).getMotif().startsWith("Numéro de téléphone invalide"),
                sansEntete.rejetees().get(0).getMotif());
    }

    @Test
    public void uneLigneFautiveNEmpechePasLesAutres() {
        // Le defaut principal de l'import historique : une seule ligne invalide et tout echouait.
        List<List<String>> f = fichier("KOFFI;Jean;0708473750", "SANSTEL;Paul;", "YAO;Awa;0501020304");
        ImportClientControle r = ImportClientControle.controler(f, new Correspondance(0, 1, 2, false),
                Collections.emptyList());
        assertEquals(2, r.retenues().size(), r.resume());
        assertEquals(1, r.rejetees().size(), r.resume());
        assertEquals(2, r.rejetees().get(0).getNumero());
    }

    @Test
    public void leNumeroDeLigneRendCompteDuFichierReel() {
        // L'operateur doit pouvoir retrouver la ligne dans son tableur : on compte a partir de 1,
        // en-tete comprise.
        List<List<String>> f = fichier("NOM;PRENOMS;TEL", "KOFFI;Jean;pasunnumero", "YAO;Awa;0501020304");
        ImportClientControle r = ImportClientControle.controler(f, new Correspondance(0, 1, 2, true),
                Collections.emptyList());
        assertEquals(2, r.rejetees().get(0).getNumero());
        assertEquals(3, r.retenues().get(0).getNumero());
    }

    @Test
    public void unDoublonDansLeFichierEstRejeteEnDisantOu() {
        List<List<String>> f = fichier("KOFFI;Jean;0708473750", "AUTRE;Paul;07 08 47 37 50");
        ImportClientControle r = ImportClientControle.controler(f, new Correspondance(0, 1, 2, false),
                Collections.emptyList());
        assertEquals(1, r.retenues().size(), r.resume());
        assertEquals("Numéro en doublon dans le fichier (déjà ligne 1).", r.rejetees().get(0).getMotif());
    }

    @Test
    public void unNumeroDejaEnBaseEstRejete() {
        List<List<String>> f = fichier("KOFFI;Jean;0708473750");
        ImportClientControle r = ImportClientControle.controler(f, new Correspondance(0, 1, 2, false),
                Collections.singletonList("0708473750"));
        assertEquals(0, r.retenues().size());
        assertEquals("Numéro déjà attribué à un client standard existant.", r.rejetees().get(0).getMotif());
    }

    @Test
    public void lesNumerosSontNormalisesAvantComparaison() {
        // Sans normalisation, « 07 08 47 37 50 » et « 0708473750 » passeraient tous les deux et
        // l'index unique ferait echouer l'import au milieu.
        List<List<String>> f = fichier("KOFFI;Jean;+225 07-08-47-37-50");
        ImportClientControle r = ImportClientControle.controler(f, new Correspondance(0, 1, 2, false),
                Collections.singletonList("0708473750"));
        assertEquals(1, r.rejetees().size(), r.resume());
    }

    @Test
    public void lesLignesEntierementVidesSontIgnoreesEtNonRejetees() {
        List<List<String>> f = fichier("KOFFI;Jean;0708473750", ";;", "YAO;Awa;0501020304");
        ImportClientControle r = ImportClientControle.controler(f, new Correspondance(0, 1, 2, false),
                Collections.emptyList());
        assertEquals(2, r.getLignes().size(), r.resume());
        assertEquals(0, r.rejetees().size(), r.resume());
    }

    @Test
    public void uneLigneTropCourteNeFaitPasEchouerLaLecture() {
        List<List<String>> f = new ArrayList<>();
        f.add(Arrays.asList("KOFFI"));
        ImportClientControle r = ImportClientControle.controler(f, new Correspondance(0, 1, 2, false),
                Collections.emptyList());
        assertEquals(1, r.rejetees().size());
        assertTrue(r.rejetees().get(0).getMotif().contains("prénoms"), r.rejetees().get(0).getMotif());
    }

    @Test
    public void laCorrespondanceExigeTroisColonnesDistinctes() {
        assertEquals("", new Correspondance(0, 1, 2, false).motifInvalidite());
        assertEquals("Choisissez les colonnes du nom, des prénoms et du téléphone.",
                new Correspondance(-1, 1, 2, false).motifInvalidite());
        assertEquals("Les trois colonnes doivent être différentes.",
                new Correspondance(1, 1, 2, false).motifInvalidite());
        assertEquals("Les trois colonnes doivent être différentes.",
                new Correspondance(0, 1, 0, false).motifInvalidite());
    }

    @Test
    public void lesNumerosDuFichierSeLisentEnUnePasse() {
        // C'est cette liste qui permet d'interroger la base UNE fois au lieu d'une fois par ligne.
        List<List<String>> f = fichier("NOM;PRENOMS;TEL", "KOFFI;Jean;07 08 47 37 50", "YAO;Awa;0501020304",
                "X;Y;pasunnumero");
        assertEquals(new java.util.HashSet<>(Arrays.asList("0708473750", "0501020304")),
                ImportClientControle.numerosDuFichier(f, new Correspondance(0, 1, 2, true)));
    }

    @Test
    public void leResumeDitCeQuiSeraEcritEtCeQuiNeLeSeraPas() {
        List<List<String>> f = fichier("KOFFI;Jean;0708473750", "X;Y;abc");
        assertEquals("1 ligne(s) retenue(s), 1 rejetée(s)", ImportClientControle
                .controler(f, new Correspondance(0, 1, 2, false), Collections.emptyList()).resume());
    }
}
