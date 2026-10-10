package etiquetagepro.autonome;

import etiquetagepro.Correspondance;
import etiquetagepro.Zone;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * Etiquettage Pro autonome : reglages du poste (pharmacie, monnaie, planche, type de code, calage) et correspondances
 * retenues par forme de fichier. Dossier : propriete « etiquetagepro.dossier », sinon %APPDATA%\EtiquetagePro sous
 * Windows, sinon ~/.etiquetage-pro.
 */
final class Reglages {

    private final Path dossier;
    private final Properties valeurs = new Properties();
    private final Properties correspondances = new Properties();

    Reglages(Path dossier) {
        this.dossier = dossier;
        lire(dossier.resolve("reglages.properties"), valeurs);
        lire(dossier.resolve("correspondances.properties"), correspondances);
    }

    static Path dossierParDefaut() {
        String d = System.getProperty("etiquetagepro.dossier");
        if (d != null && !d.trim().isEmpty()) {
            return Paths.get(d);
        }
        String appdata = System.getenv("APPDATA");
        if (appdata != null && System.getProperty("os.name", "").toLowerCase().contains("win")) {
            return Paths.get(appdata, "EtiquetagePro");
        }
        return Paths.get(System.getProperty("user.home"), ".etiquetage-pro");
    }

    Path getDossier() {
        return dossier;
    }

    private static void lire(Path p, Properties dans) {
        if (Files.exists(p)) {
            try (InputStream in = Files.newInputStream(p)) {
                dans.load(in);
            } catch (IOException e) {
                /* reglages illisibles : valeurs par defaut */
            }
        }
    }

    private void ecrire(String nom, Properties p) {
        try {
            Files.createDirectories(dossier);
            try (OutputStream out = Files.newOutputStream(dossier.resolve(nom))) {
                p.store(out, "Etiquettage Pro");
            }
        } catch (IOException e) {
            /* poste en lecture seule : les reglages ne seront pas retenus */
        }
    }

    String get(String cle, String defaut) {
        return valeurs.getProperty(cle, defaut);
    }

    void set(String cle, String valeur) {
        if (valeur == null) {
            valeurs.remove(cle);
        } else {
            valeurs.setProperty(cle, valeur);
        }
    }

    void enregistrer() {
        ecrire("reglages.properties", valeurs);
    }

    static String signature(List<String> colonnes) {
        StringBuilder b = new StringBuilder();
        for (String c : colonnes) {
            b.append(Correspondance.normaliser(c)).append('|');
        }
        return Integer.toHexString(b.toString().hashCode()) + "-" + colonnes.size();
    }

    /** Retient la correspondance d'un fichier de cette forme. */
    void retenir(List<String> colonnes, Correspondance c) {
        String s = signature(colonnes);
        correspondances.stringPropertyNames().stream().filter(k -> k.startsWith(s + "."))
                .forEach(correspondances::remove);
        for (Zone z : Zone.values()) {
            if (c.getSource(z) != null) {
                correspondances.setProperty(s + ".source." + z.name(), c.getSource(z));
            }
        }
        StringBuilder o = new StringBuilder();
        for (Zone z : c.getObligatoires()) {
            o.append(z.name()).append(',');
        }
        correspondances.setProperty(s + ".obligatoires", o.toString());
        int i = 0;
        for (Map.Entry<String, String> a : c.getAjoutees().entrySet()) {
            correspondances.setProperty(s + ".ajoutee." + i + ".nom", a.getKey());
            correspondances.setProperty(s + ".ajoutee." + i + ".modele", a.getValue());
            i++;
        }
        ecrire("correspondances.properties", correspondances);
    }

    /** Correspondance retenue pour un fichier de cette forme, sinon null. */
    Correspondance retenue(List<String> colonnes) {
        String s = signature(colonnes);
        if (!correspondances.containsKey(s + ".obligatoires")) {
            return null;
        }
        Correspondance c = new Correspondance();
        for (Zone z : Zone.values()) {
            c.source(z, correspondances.getProperty(s + ".source." + z.name()));
        }
        String o = "," + correspondances.getProperty(s + ".obligatoires") + ",";
        for (Zone z : Zone.values()) {
            c.obligatoire(z, o.contains("," + z.name() + ","));
        }
        for (int i = 0; correspondances.containsKey(s + ".ajoutee." + i + ".nom"); i++) {
            c.ajouter(correspondances.getProperty(s + ".ajoutee." + i + ".nom"),
                    correspondances.getProperty(s + ".ajoutee." + i + ".modele", ""));
        }
        return c;
    }
}
