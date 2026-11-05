package rest.service.impl.securite;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.AclEntry;
import java.nio.file.attribute.AclEntryFlag;
import java.nio.file.attribute.AclEntryPermission;
import java.nio.file.attribute.AclEntryType;
import java.nio.file.attribute.AclFileAttributeView;
import java.nio.file.attribute.PosixFileAttributeView;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.nio.file.attribute.UserPrincipal;
import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * FICHIERS PRIVES DU SERVEUR (cas 4, lot 4.A) : fichiers qui recoivent un mot de passe le temps d'un appel a l'outil de
 * MariaDB (fichier d'options --defaults-extra-file). Ils vivent dans un dossier prive du domaine Payara, jamais dans le
 * dossier temporaire du systeme, et leurs droits sont reellement restreints :
 * <ul>
 * <li>Windows : liste de controle d'acces (DACL) reduite au seul compte qui fait tourner le serveur, sans heritage du
 * dossier parent ({@link AclFileAttributeView}) ; avant, setReadable(false, false) ne retirait rien ;</li>
 * <li>POSIX : rw------- (rwx------ pour le dossier).</li>
 * </ul>
 * Un fichier reste sur le disque si la JVM s'arrete pendant la sauvegarde : {@link #nettoyer(String)} retire au
 * demarrage ceux qui ont survecu.
 */
public final class FichierPrive {

    private static final Logger LOG = Logger.getLogger(FichierPrive.class.getName());
    static final String NOM_DOSSIER = "prestige-prive";

    private FichierPrive() {
    }

    /** Dossier prive, sous le domaine Payara (prestige-prive) ; sous le dossier temporaire hors Payara (tests). */
    public static Path dossier() throws IOException {
        String racine = System.getProperty("com.sun.aas.instanceRoot");
        Path d = racine != null ? Paths.get(racine, NOM_DOSSIER)
                : Paths.get(System.getProperty("java.io.tmpdir"), NOM_DOSSIER + "-" + System.getProperty("user.name"));
        if (!Files.isDirectory(d)) {
            Files.createDirectories(d);
        }
        if (!restreindre(d)) {
            throw new IOException("Impossible de réserver le dossier " + d + " au compte du serveur.");
        }
        return d;
    }

    /**
     * Fichier vide du dossier prive, lisible par le seul compte courant ; IOException si les droits ne se posent pas.
     */
    public static Path creer(String prefixe, String suffixe) throws IOException {
        Path f = Files.createTempFile(dossier(), prefixe, suffixe);
        if (!restreindre(f)) {
            Files.deleteIfExists(f);
            throw new IOException("Impossible de réserver le fichier " + f.getFileName() + " au compte du serveur.");
        }
        return f;
    }

    /**
     * Reserve le fichier ou le dossier au seul compte courant. Renvoie false si le systeme de fichiers ne sait ni les
     * ACL ni les droits POSIX (rien n'est alors promis : l'appelant decide).
     */
    public static boolean restreindre(Path p) throws IOException {
        boolean dossier = Files.isDirectory(p);
        PosixFileAttributeView posix = Files.getFileAttributeView(p, PosixFileAttributeView.class);
        if (posix != null) {
            posix.setPermissions(PosixFilePermissions.fromString(dossier ? "rwx------" : "rw-------"));
            return true;
        }
        AclFileAttributeView acl = Files.getFileAttributeView(p, AclFileAttributeView.class);
        if (acl == null) {
            return false;
        }
        AclEntry.Builder b = AclEntry.newBuilder().setType(AclEntryType.ALLOW).setPrincipal(compteCourant(p))
                .setPermissions(EnumSet.allOf(AclEntryPermission.class));
        if (dossier) {
            b.setFlags(AclEntryFlag.FILE_INHERIT, AclEntryFlag.DIRECTORY_INHERIT);
        }
        acl.setAcl(Collections.singletonList(b.build()));
        return true;
    }

    /** Vrai si seul le compte courant a acces au fichier (controle : etat, tests). */
    public static boolean estPrive(Path p) throws IOException {
        PosixFileAttributeView posix = Files.getFileAttributeView(p, PosixFileAttributeView.class);
        if (posix != null) {
            Set<PosixFilePermission> droits = posix.readAttributes().permissions();
            return !droits.contains(PosixFilePermission.GROUP_READ) && !droits.contains(PosixFilePermission.GROUP_WRITE)
                    && !droits.contains(PosixFilePermission.OTHERS_READ)
                    && !droits.contains(PosixFilePermission.OTHERS_WRITE);
        }
        AclFileAttributeView acl = Files.getFileAttributeView(p, AclFileAttributeView.class);
        if (acl == null) {
            return false;
        }
        List<AclEntry> entrees = acl.getAcl();
        UserPrincipal moi = compteCourant(p);
        for (AclEntry e : entrees) {
            if (e.type() == AclEntryType.ALLOW && !e.principal().equals(moi)) {
                return false;
            }
        }
        return !entrees.isEmpty();
    }

    /** Retire du dossier prive les fichiers d'un prefixe laisses par un arret brutal ; nombre retire. */
    public static int nettoyer(String prefixe) {
        int n = 0;
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(dossier(), prefixe + "*")) {
            for (Path f : ds) {
                if (Files.isRegularFile(f) && Files.deleteIfExists(f)) {
                    n++;
                }
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "nettoyage du dossier prive", e);
        }
        if (n > 0) {
            LOG.log(Level.INFO, "Dossier privé : {0} fichier(s) {1}* d''une sauvegarde interrompue retiré(s)",
                    new Object[] { n, prefixe });
        }
        return n;
    }

    /** Le compte qui fait tourner la JVM (user.name), a defaut le proprietaire du fichier. */
    static UserPrincipal compteCourant(Path p) throws IOException {
        try {
            return p.getFileSystem().getUserPrincipalLookupService()
                    .lookupPrincipalByName(System.getProperty("user.name"));
        } catch (Exception e) {
            return Files.getOwner(p);
        }
    }
}
