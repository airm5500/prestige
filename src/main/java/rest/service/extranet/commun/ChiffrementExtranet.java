package rest.service.extranet.commun;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.persistence.EntityManager;

/**
 * Chiffrement des mots de passe des extranets (AES-256-GCM). Decision du 08/11 : la cle est rangee EN BASE, dans la
 * table {@code extranet_cle} (aucun fichier sur le poste), creee au premier usage et jamais renvoyee par l'API ni
 * journalisee. Format enregistre : {@code v1:} + base64(iv de 12 octets + texte chiffre + etiquette).
 */
public final class ChiffrementExtranet {

    static final String PREFIXE = "v1:";
    private static final int IV = 12;
    private static final int ETIQUETTE_BITS = 128;
    private static final SecureRandom ALEA = new SecureRandom();

    /** Fournit la cle de 32 octets. */
    public interface SourceCle {
        byte[] cle() throws GeneralSecurityException;
    }

    private final SourceCle source;
    private byte[] cle;

    public ChiffrementExtranet(SourceCle source) {
        this.source = source;
    }

    /** Cle rangee en base (table extranet_cle, ligne 1), creee si absente. */
    public static ChiffrementExtranet deLaBase(EntityManager em) {
        return new ChiffrementExtranet(() -> cleEnBase(em));
    }

    @SuppressWarnings("unchecked")
    static byte[] cleEnBase(EntityManager em) throws GeneralSecurityException {
        List<Object> l = em.createNativeQuery("SELECT cle FROM extranet_cle WHERE id = 1").getResultList();
        if (l.isEmpty()) {
            byte[] n = new byte[32];
            ALEA.nextBytes(n);
            /* INSERT IGNORE : si un autre appel l'a creee en meme temps, on relit la sienne */
            em.createNativeQuery("INSERT IGNORE INTO extranet_cle (id, cle, creee_le) VALUES (1, ?1, NOW())")
                    .setParameter(1, Base64.getEncoder().encodeToString(n)).executeUpdate();
            l = em.createNativeQuery("SELECT cle FROM extranet_cle WHERE id = 1").getResultList();
        }
        if (l.isEmpty() || l.get(0) == null) {
            throw new GeneralSecurityException("Clé des extranets absente");
        }
        return decoder(l.get(0) instanceof BigInteger ? l.get(0).toString() : (String) l.get(0));
    }

    static byte[] decoder(String texte) throws GeneralSecurityException {
        try {
            byte[] lu = Base64.getDecoder().decode(texte.trim());
            if (lu.length != 32) {
                throw new GeneralSecurityException("Clé des extranets invalide");
            }
            return lu;
        } catch (IllegalArgumentException e) {
            throw new GeneralSecurityException("Clé des extranets illisible", e);
        }
    }

    private synchronized byte[] cle() throws GeneralSecurityException {
        if (cle == null) {
            byte[] lu = source.cle();
            if (lu == null || lu.length != 32) {
                throw new GeneralSecurityException("Clé des extranets invalide");
            }
            cle = lu;
        }
        return cle;
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
