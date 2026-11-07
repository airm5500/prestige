package rest.service.extranet.commun;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Chiffrement des mots de passe des extranets (AES-256-GCM). La cle est un fichier du serveur, hors base et hors depot
 * ({@code D:\prestige\cles\extranet.cle}), cree au premier usage : une copie de la base seule ne livre pas les mots de
 * passe. Format enregistre : {@code v1:} + base64(iv de 12 octets + texte chiffre + etiquette).
 */
public final class ChiffrementExtranet {

    static final String PREFIXE = "v1:";
    private static final int IV = 12;
    private static final int ETIQUETTE_BITS = 128;
    private static final SecureRandom ALEA = new SecureRandom();

    private final Path fichierCle;
    private byte[] cle;

    public ChiffrementExtranet(Path fichierCle) {
        this.fichierCle = fichierCle;
    }

    /** Cle du serveur : dossier « cles » de la racine Prestige. */
    public static ChiffrementExtranet duServeur() {
        String force = System.getenv("EXTRANET_CLE_FICHIER");
        if (force == null) {
            force = System.getProperty("EXTRANET_CLE_FICHIER");
        }
        Path p = force != null && !force.trim().isEmpty() ? Path.of(force.trim())
                : util.StockageDisque.sousDossier("cles").resolve("extranet.cle");
        return new ChiffrementExtranet(p);
    }

    private synchronized byte[] cle() throws GeneralSecurityException {
        if (cle != null) {
            return cle;
        }
        try {
            if (!Files.exists(fichierCle)) {
                byte[] n = new byte[32];
                ALEA.nextBytes(n);
                Files.createDirectories(fichierCle.getParent());
                try {
                    Files.write(fichierCle, Base64.getEncoder().encode(n), StandardOpenOption.CREATE_NEW);
                } catch (java.nio.file.FileAlreadyExistsException deja) {
                    /* cree en meme temps par un autre appel : on relit le sien */
                }
            }
            byte[] lu = Base64.getDecoder()
                    .decode(new String(Files.readAllBytes(fichierCle), StandardCharsets.US_ASCII).trim());
            if (lu.length != 32) {
                throw new GeneralSecurityException("Clé des extranets invalide");
            }
            cle = lu;
            return cle;
        } catch (java.io.IOException | IllegalArgumentException e) {
            throw new GeneralSecurityException("Clé des extranets illisible", e);
        }
    }

    public String chiffrer(String clair) throws GeneralSecurityException {
        byte[] iv = new byte[IV];
        ALEA.nextBytes(iv);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(cle(), "AES"), new GCMParameterSpec(ETIQUETTE_BITS, iv));
        byte[] ch = c.doFinal(clair.getBytes(StandardCharsets.UTF_8));
        byte[] tout = Arrays.copyOf(iv, IV + ch.length);
        System.arraycopy(ch, 0, tout, IV, ch.length);
        return PREFIXE + Base64.getEncoder().encodeToString(tout);
    }

    /** Dechiffre ; leve une exception si la valeur a ete alteree ou si la cle a change. */
    public String dechiffrer(String enregistre) throws GeneralSecurityException {
        if (enregistre == null || !enregistre.startsWith(PREFIXE)) {
            throw new GeneralSecurityException("Mot de passe enregistré dans un format inconnu");
        }
        byte[] tout;
        try {
            tout = Base64.getDecoder().decode(enregistre.substring(PREFIXE.length()));
        } catch (IllegalArgumentException e) {
            throw new GeneralSecurityException("Mot de passe enregistré illisible", e);
        }
        if (tout.length <= IV) {
            throw new GeneralSecurityException("Mot de passe enregistré illisible");
        }
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(cle(), "AES"), new GCMParameterSpec(ETIQUETTE_BITS, tout, 0, IV));
        return new String(c.doFinal(tout, IV, tout.length - IV), StandardCharsets.UTF_8);
    }
}
