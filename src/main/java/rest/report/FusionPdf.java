package rest.report;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import toolkits.filesmanagers.FilesType.PdfFiles;

/**
 * Assemble les morceaux d'une facture en un seul PDF, et efface les morceaux.
 *
 * L'édition d'une facture produisait TROIS fichiers dans le dossier des éditions : le récapitulatif seul, la facture
 * seule, puis les deux assemblés. Seul le troisième est envoyé au navigateur ; les deux autres restaient sur le disque
 * à chaque impression, sans que personne ne les relise jamais.
 *
 * Ici les morceaux sont désignés par leur chemin, et non par un flux déjà ouvert : c'est ce qui permet de les refermer
 * puis de les supprimer une fois l'assemblage réussi. Un flux laissé ouvert empêche la suppression sous Windows, et le
 * fichier serait resté malgré tout.
 *
 * @author koben
 */
public final class FusionPdf {

    private static final Logger LOG = Logger.getLogger(FusionPdf.class.getName());

    private FusionPdf() {
    }

    /**
     * Assemble {@code morceaux} dans {@code destination}, puis efface les morceaux.
     *
     * Les morceaux sont effacés SEULEMENT si l'assemblage a réussi : en cas d'échec ils restent sur le disque, seule
     * trace permettant de comprendre ce qui s'est passé.
     *
     * @param morceaux
     *            chemins des PDF à assembler, dans l'ordre
     * @param destination
     *            chemin du PDF final
     *
     * @throws IllegalArgumentException
     *             si aucun morceau n'est fourni : produire un PDF vide masquerait le vrai problème et l'utilisateur
     *             téléchargerait un fichier illisible
     */
    public static void assembler(List<String> morceaux, String destination) throws Exception {
        if (morceaux == null || morceaux.isEmpty()) {
            throw new IllegalArgumentException("aucun document à assembler pour " + destination);
        }
        List<InputStream> flux = new ArrayList<>(morceaux.size());
        try (OutputStream sortie = new FileOutputStream(destination)) {
            for (String morceau : morceaux) {
                flux.add(new FileInputStream(morceau));
            }
            PdfFiles.mergePdfFiles(flux, sortie);
        } finally {
            for (InputStream f : flux) {
                fermer(f);
            }
        }
        effacer(morceaux, destination);
    }

    /** Efface les morceaux, en épargnant le fichier final s'il figure parmi eux. */
    private static void effacer(List<String> morceaux, String destination) {
        File cible = new File(destination);
        for (String morceau : morceaux) {
            File f = new File(morceau);
            if (f.equals(cible) || f.getAbsolutePath().equals(cible.getAbsolutePath())) {
                continue;
            }
            if (f.isFile() && !f.delete()) {
                // sans gravité pour l'utilisateur : la facture est complète, seul un fichier
                // de travail subsiste. On le dit sans transformer cela en échec d'édition.
                LOG.log(Level.WARNING, "Le fichier de travail {0} n''a pas pu être efface.", morceau);
            }
        }
    }

    private static void fermer(InputStream f) {
        try {
            f.close();
        } catch (IOException e) {
            LOG.log(Level.FINE, "fermeture d'un morceau de facture", e);
        }
    }
}
