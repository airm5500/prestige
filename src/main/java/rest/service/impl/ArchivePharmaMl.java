package rest.service.impl;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.lang3.StringUtils;
import util.AppParameters;

/**
 * Retours du 08/10 (5) : rangement des echanges PharmaML et journal des transmissions.
 *
 * <pre>
 * pharmaMlDir/
 *   commandes/AAAA-MM/    C_ (commande envoyee), R_ (reponse), R_LOG_ (reponse HTTP en erreur)
 *   vidages/AAAA-MM/      V_ (demande de vidage / acquittement), RV_ (reponse)
 *   infoproduit/AAAA-MM/  I_ (demande de disponibilite), RI_ (reponse)
 *   log/AAAA-MM/          pharmaml_AAAA-MM-JJ.log : une ligne par evenement (envoi, essai HTTP, reponse, refus...)
 * </pre>
 *
 * Les archives deja presentes a la racine (avant ce rangement) restent lues. Le journal ne contient jamais la cle du
 * grossiste, l'en-tete de controle ni le contenu des messages : references, adresses, codes, durees et resultats. Ligne
 * : horodatage | domaine | grossiste | evenement | detail (le detail, dernier champ, peut contenir des « | »).
 */
public final class ArchivePharmaMl {

    private static final Logger LOG = Logger.getLogger(ArchivePharmaMl.class.getName());
    private static final DateTimeFormatter MOIS = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter HORODATAGE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    public static final String COMMANDES = "commandes", VIDAGES = "vidages", INFOPRODUIT = "infoproduit",
            JOURNAL = "log", AUTRES = "autres";

    /** Dossier racine force par les tests unitaires, "" = aucun (sinon pharmaMlDir de la configuration). */
    static volatile String racineForcee;

    private ArchivePharmaMl() {
    }

    static String racine() {
        if (racineForcee != null) {
            return StringUtils.trimToNull(racineForcee); /* "" = aucun dossier (tests) */
        }
        try {
            return StringUtils.trimToNull(AppParameters.getInstance().pharmaMlDir);
        } catch (RuntimeException e) {
            return null;
        }
    }

    /** Dossier d'un echange d'apres le prefixe de son nom. */
    public static String type(String nom) {
        String n = StringUtils.defaultString(nom).toUpperCase(java.util.Locale.ROOT);
        if (n.startsWith("RV_") || n.startsWith("V_")) {
            return VIDAGES;
        }
        if (n.startsWith("RI_") || n.startsWith("I_")) {
            return INFOPRODUIT;
        }
        if (n.startsWith("R_") || n.startsWith("C_")) {
            return COMMANDES;
        }
        return AUTRES;
    }

    /** Chemin relatif a la racine (ex. commandes/2026-10/C_x.xml) : celui qui est cite dans les messages. */
    public static String cheminRelatif(String nom, LocalDateTime quand) {
        return type(nom) + "/" + quand.format(MOIS) + "/" + nom + ".xml";
    }

    /** Ecrit l'archive dans son dossier (type / mois) ; renvoie son chemin relatif, ou null si rien n'a ete ecrit. */
    public static String ecrire(String nom, String contenu) {
        String racine = racine();
        if (racine == null) {
            LOG.log(Level.WARNING, "Dossier PharmaML non configure : echange {0} non archive", nom);
            return null;
        }
        String relatif = cheminRelatif(nom, LocalDateTime.now());
        try {
            Path p = Paths.get(racine, relatif);
            Files.createDirectories(p.getParent());
            Files.write(p, (contenu == null ? "" : contenu).getBytes(StandardCharsets.UTF_8));
            return relatif;
        } catch (IOException | RuntimeException e) {
            LOG.log(Level.WARNING, "archive PharmaML {0} : {1}", new Object[] { nom, e.getMessage() });
            return null;
        }
    }

    /** Chemin absolu d'une archive (rangee ou ancienne, a la racine) ; null si introuvable. */
    public static Path trouver(String nom) {
        String racine = racine();
        if (racine == null || StringUtils.isBlank(nom) || nom.contains("/") || nom.contains("\\")
                || nom.contains("..")) {
            return null;
        }
        String fichier = nom.endsWith(".xml") ? nom : nom + ".xml";
        Path dossierType = Paths.get(racine, type(nom));
        if (Files.isDirectory(dossierType)) {
            List<Path> mois = new ArrayList<>();
            try (DirectoryStream<Path> d = Files.newDirectoryStream(dossierType)) {
                d.forEach(mois::add);
            } catch (IOException e) {
                LOG.log(Level.FINE, "lecture {0}", dossierType);
            }
            mois.sort((a, b) -> b.getFileName().toString().compareTo(a.getFileName().toString()));
            for (Path m : mois) {
                Path p = m.resolve(fichier);
                if (Files.isRegularFile(p)) {
                    return p;
                }
            }
        }
        Path ancien = Paths.get(racine, fichier);
        return Files.isRegularFile(ancien) ? ancien : null;
    }

    /**
     * Journal des transmissions : log/AAAA-MM/pharmaml_AAAA-MM-JJ.log. Champs separes par « | » : horodatage, domaine
     * (COMMANDE, VIDAGE, INFOPRODUIT, HTTP), grossiste, evenement, detail.
     */
    public static void journal(String domaine, String grossiste, String evenement, String detail) {
        String racine = racine();
        if (racine == null) {
            return;
        }
        LocalDateTime t = LocalDateTime.now();
        /* lignes HTTP (EnvoiPharmaMl) : grossiste du dernier evenement de ce meme traitement */
        String nom = StringUtils.trimToNull(grossiste);
        if (nom == null) {
            nom = DERNIER_GROSSISTE.get();
        } else {
            DERNIER_GROSSISTE.set(nom);
        }
        String ligne = t.format(HORODATAGE) + " | " + nettoyer(domaine) + " | " + nettoyer(nom) + " | "
                + nettoyer(evenement) + " | " + StringUtils.defaultString(detail).replaceAll("[\\r\\n\\t]+", " ").trim()
                + System.lineSeparator();
        try {
            Path p = Paths.get(racine, JOURNAL, t.format(MOIS), "pharmaml_" + t.format(JOUR) + ".log");
            synchronized (ArchivePharmaMl.class) {
                Files.createDirectories(p.getParent());
                Files.write(p, ligne.getBytes(StandardCharsets.UTF_8), StandardOpenOption.CREATE,
                        StandardOpenOption.APPEND);
            }
        } catch (IOException | RuntimeException e) {
            LOG.log(Level.WARNING, "journal PharmaML : {0}", e.getMessage());
        }
    }

    private static final ThreadLocal<String> DERNIER_GROSSISTE = new ThreadLocal<>();

    /** Une valeur par ligne : pas de retour a la ligne ni de separateur dans les champs. */
    static String nettoyer(String v) {
        return StringUtils.defaultString(v).replaceAll("[\\r\\n\\t]+", " ").replace("|", "/").trim();
    }

    /** Adresse sans identifiants ni parametres (rien de secret dans le journal). */
    public static String adresseSure(String url) {
        try {
            URI u = URI.create(StringUtils.trimToEmpty(url));
            return (u.getScheme() == null ? "" : u.getScheme() + "://") + StringUtils.defaultString(u.getHost())
                    + (u.getPort() > 0 ? ":" + u.getPort() : "") + StringUtils.defaultString(u.getPath());
        } catch (RuntimeException e) {
            return "(adresse illisible)";
        }
    }
}
