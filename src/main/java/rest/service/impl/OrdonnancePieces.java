package rest.service.impl;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;

/**
 * Regles des pieces justificatives des ordonnances clients (evolution 6, point 2, vague 2).
 *
 * <p>
 * Tout est ici, en methodes statiques et sans acces disque, parce que ce sont exactement les regles qu'il faut pouvoir
 * verifier une par une : ce qu'on accepte, ou l'on ecrit, et surtout ce qu'on refuse. Un fichier depose par un
 * utilisateur est la seule donnee de cet ecran qui ne vienne pas du logiciel ; c'est donc la seule qui puisse porter un
 * nom hostile.
 *
 * <p>
 * Le chemin enregistre en base est RELATIF a la racine de stockage. Si l'officine change de disque de donnees (D: vers
 * F:, ou un transfert de serveur), les pieces suivent : un chemin absolu en base aurait rendu illisibles, du jour au
 * lendemain, des annees de documents.
 */
public final class OrdonnancePieces {

    /** Dossier racine des pieces, sous la racine de stockage du logiciel. */
    public static final String DOSSIER = "ordonnances";

    /**
     * 10 Mo par piece.
     *
     * <p>
     * Un scan de page A4 en couleur fait 1 a 3 Mo ; 10 Mo laissent donc de la marge pour une ordonnance de plusieurs
     * pages photographiee au telephone, sans qu'une video envoyee par erreur puisse remplir le disque de l'officine.
     */
    public static final long TAILLE_MAX = 10L * 1024L * 1024L;

    /**
     * Ce que l'on accepte : les images et les PDF que produisent les telephones et les scanners de comptoir.
     *
     * <p>
     * Une liste BLANCHE, et non une liste noire des extensions dangereuses : une liste noire laisse toujours passer
     * celle qu'on n'avait pas prevue.
     */
    private static final Set<String> EXTENSIONS = Collections
            .unmodifiableSet(new HashSet<>(Arrays.asList("jpg", "jpeg", "png", "tif", "tiff", "pdf")));

    private OrdonnancePieces() {
    }

    /** Extension en minuscules, sans le point ; vide si le nom n'en porte pas. */
    public static String extension(String nom) {
        if (StringUtils.isBlank(nom)) {
            return "";
        }
        String propre = assainir(nom);
        int point = propre.lastIndexOf('.');
        if (point < 0 || point == propre.length() - 1) {
            return "";
        }
        return propre.substring(point + 1).toLowerCase(Locale.ROOT);
    }

    /** Vrai si le fichier est d'un type accepte. */
    public static boolean typeAccepte(String nom) {
        return EXTENSIONS.contains(extension(nom));
    }

    /** Liste des types acceptes, telle qu'on l'annonce a l'operateur quand on refuse son fichier. */
    public static String typesAcceptes() {
        return "JPG, PNG, TIFF ou PDF";
    }

    /**
     * Type MIME deduit de l'extension.
     *
     * <p>
     * Deduit et non repris du navigateur : le type annonce a l'envoi est declaratif, donc pas une information de
     * confiance. C'est ce type-la qui sera renvoye a la consultation, et un type faux ferait telecharger un fichier que
     * le navigateur croirait executable.
     */
    public static String typeMime(String nom) {
        switch (extension(nom)) {
        case "pdf":
            return "application/pdf";
        case "png":
            return "image/png";
        case "tif":
        case "tiff":
            return "image/tiff";
        case "jpg":
        case "jpeg":
            return "image/jpeg";
        default:
            return "application/octet-stream";
        }
    }

    /**
     * Nom de fichier debarrasse de tout chemin.
     *
     * <p>
     * C'est la defense contre un nom hostile : {@code ../../../etc/passwd} ou {@code C:\Windows\x.pdf} envoyes comme
     * nom de fichier ne doivent pas pouvoir faire ecrire ailleurs que dans le dossier des pieces. On ne garde donc que
     * ce qui suit le dernier separateur, quel qu'il soit.
     */
    public static String assainir(String nom) {
        if (nom == null) {
            return "";
        }
        String propre = nom.trim().replace('\\', '/');
        int slash = propre.lastIndexOf('/');
        if (slash >= 0) {
            propre = propre.substring(slash + 1);
        }
        /*
         * Un deux-points ouvre un flux nomme sous Windows (« ordonnance.pdf:cache ») : on COUPE a cet endroit au lieu
         * de retirer le caractere, sinon « ordonnance.pdf:flux » donnerait « ordonnance.pdfflux », c'est-a-dire un
         * fichier sans extension reconnue - et donc refuse alors qu'il etait legitime.
         */
        int deuxPoints = propre.indexOf(':');
        if (deuxPoints >= 0) {
            propre = propre.substring(0, deuxPoints);
        }
        propre = propre.replaceAll("\\p{Cntrl}", "");
        return propre.trim();
    }

    /**
     * Nom sous lequel le fichier est ECRIT sur le disque : l'identifiant de la piece et l'extension d'origine.
     *
     * <p>
     * Deux clients peuvent deposer « ordonnance.pdf » le meme jour ; garder le nom d'origine ferait s'ecraser leurs
     * documents. Le nom d'origine est conserve en base, et c'est celui-la qu'on rend au telechargement.
     */
    public static String nomSurDisque(String pieceId, String nomOrigine) {
        String extension = extension(nomOrigine);
        return extension.isEmpty() ? pieceId : pieceId + "." + extension;
    }

    /**
     * Chemin RELATIF a la racine de stockage : {@code ordonnances/2026/09/<piece>.pdf}.
     *
     * <p>
     * Un dossier par mois : au bout de quelques annees, un dossier unique contiendrait des dizaines de milliers de
     * fichiers, ce qui rend l'exploration impraticable et les sauvegardes incrementales inutilement lourdes.
     */
    public static String cheminRelatif(LocalDate jour, String nomFichier) {
        return String.format("%s/%04d/%02d/%s", DOSSIER, jour.getYear(), jour.getMonthValue(), nomFichier);
    }

    /**
     * Vrai si un chemin lu EN BASE peut etre servi sans risque.
     *
     * <p>
     * Une base peut avoir ete modifiee a la main, ou restauree d'un autre site : on ne suit donc jamais un chemin
     * absolu ni un chemin qui remonte, sans quoi ce service deviendrait un moyen de lire n'importe quel fichier du
     * serveur.
     */
    public static boolean cheminSur(String relatif) {
        if (StringUtils.isBlank(relatif)) {
            return false;
        }
        String propre = relatif.replace('\\', '/');
        if (propre.startsWith("/") || propre.contains("..") || propre.matches("(?i)^[a-z]:.*")) {
            return false;
        }
        return propre.startsWith(DOSSIER + "/");
    }

    /** Refus explicite d'un fichier, ou null s'il est accepte. */
    public static String refus(String nomOrigine, long taille) {
        if (StringUtils.isBlank(assainir(nomOrigine))) {
            return "Aucun fichier reçu.";
        }
        if (!typeAccepte(nomOrigine)) {
            return "Ce type de fichier n'est pas accepté (" + typesAcceptes() + ").";
        }
        if (taille <= 0) {
            return "Le fichier est vide.";
        }
        if (taille > TAILLE_MAX) {
            /* Le message dit la limite ET la taille du fichier : « trop gros » sans chiffre ne dit pas quoi faire. */
            return "Le fichier fait " + mega(taille) + " ; la limite est de " + limiteLisible() + " par pièce.";
        }
        return null;
    }

    static String mega(long octets) {
        return String.format(Locale.FRANCE, "%.1f Mo", octets / (1024.0 * 1024.0));
    }

    /**
     * La limite, en megaoctets entiers.
     *
     * <p>
     * Et non {@code mega(TAILLE_MAX)} : pour un depassement d'un seul octet, les deux valeurs arrondies etaient
     * identiques et le refus disait « le fichier fait 10,0 Mo ; la limite est de 10,0 Mo », ce qui ressemble a un
     * defaut du logiciel plutot qu'a une regle.
     */
    static String limiteLisible() {
        return (TAILLE_MAX / (1024L * 1024L)) + " Mo";
    }
}
