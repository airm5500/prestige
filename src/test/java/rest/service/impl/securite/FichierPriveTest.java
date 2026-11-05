package rest.service.impl.securite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.AclEntry;
import java.nio.file.attribute.AclEntryFlag;
import java.nio.file.attribute.AclEntryType;
import java.nio.file.attribute.AclFileAttributeView;
import java.nio.file.attribute.PosixFileAttributeView;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Cas 4, lot 4.A : le fichier d'options qui recoit le mot de passe n'est lisible que par le compte du serveur, avec de
 * vrais droits (ACL Windows sans heritage, ou rw------- en POSIX), dans le dossier prive, jamais dans %TEMP%.
 */
class FichierPriveTest {

    @Test
    void fichierPriveReserveAuSeulCompteCourant() throws Exception {
        Path f = FichierPrive.creer("essai-prive", ".cnf");
        try {
            assertTrue(Files.isRegularFile(f));
            assertEquals(FichierPrive.dossier(), f.getParent());
            assertTrue(FichierPrive.estPrive(f), "seul le compte courant");
            AclFileAttributeView acl = Files.getFileAttributeView(f, AclFileAttributeView.class);
            if (acl != null) {
                List<AclEntry> entrees = acl.getAcl();
                assertEquals(1, entrees.size(), "une seule entree : " + entrees);
                AclEntry e = entrees.get(0);
                assertEquals(AclEntryType.ALLOW, e.type());
                assertEquals(FichierPrive.compteCourant(f), e.principal());
                assertTrue(e.flags().isEmpty(), "pas d'heritage sur un fichier");
            } else {
                PosixFileAttributeView posix = Files.getFileAttributeView(f, PosixFileAttributeView.class);
                assertEquals("rw-------", PosixFilePermissions.toString(posix.readAttributes().permissions()));
            }
        } finally {
            Files.deleteIfExists(f);
        }
    }

    @Test
    void dossierPriveHeriteSesDroitsAuxFichiers() throws Exception {
        Path d = FichierPrive.dossier();
        assertTrue(Files.isDirectory(d));
        assertTrue(FichierPrive.estPrive(d));
        AclFileAttributeView acl = Files.getFileAttributeView(d, AclFileAttributeView.class);
        if (acl != null) {
            AclEntry e = acl.getAcl().get(0);
            assertTrue(e.flags().contains(AclEntryFlag.FILE_INHERIT)
                    && e.flags().contains(AclEntryFlag.DIRECTORY_INHERIT));
        }
        /* un fichier cree sans passer par creer() (ex. Files.createTempFile) y est deja prive par heritage */
        Path f = Files.createTempFile(d, "essai-herite", ".cnf");
        try {
            assertTrue(FichierPrive.estPrive(f));
        } finally {
            Files.deleteIfExists(f);
        }
    }

    @Test
    void nettoyageRetireLesFichiersOrphelinsDuPrefixe() throws Exception {
        Path a = FichierPrive.creer("essai-orphelin", ".cnf");
        Path b = FichierPrive.creer("essai-autre", ".cnf");
        try {
            assertEquals(1, FichierPrive.nettoyer("essai-orphelin"));
            assertFalse(Files.exists(a));
            assertTrue(Files.exists(b), "un autre prefixe n'est pas touche");
        } finally {
            Files.deleteIfExists(a);
            Files.deleteIfExists(b);
        }
    }
}
