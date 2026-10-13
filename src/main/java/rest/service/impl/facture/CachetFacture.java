package rest.service.impl.facture;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.List;
import javax.imageio.ImageIO;
import javax.persistence.EntityManager;

/**
 * Cachet / signature des factures du createur de modeles (besoins du 11/10, point 4). Une image commune (cible COMMUN)
 * et, au besoin, une image propre a un modele (cible MODELE-id), qui prime. Stockees en base (t_cachet_facture).
 */
public final class CachetFacture {

    public static final String COMMUN = "COMMUN";
    /** Taille maximale d'une image (1 Mo). */
    public static final int TAILLE_MAX = 1024 * 1024;
    public static final int LARGEUR_MIN = 40, LARGEUR_MAX = 300, LARGEUR_DEFAUT = 140;

    private CachetFacture() {
    }

    /** Cible normalisee : COMMUN, ou MODELE-<id> ; null si invalide. */
    public static String cible(String valeur) {
        if (valeur == null || valeur.trim().isEmpty() || COMMUN.equalsIgnoreCase(valeur.trim())) {
            return COMMUN;
        }
        String v = valeur.trim();
        if (v.startsWith("MODELE-")) {
            v = v.substring(7);
        }
        return v.matches("\\d{1,9}") ? "MODELE-" + v : null;
    }

    /** Type reconnu d'apres le contenu (et non le nom du fichier) : "png", "jpeg" ou null. */
    public static String type(byte[] b) {
        if (b == null || b.length < 4) {
            return null;
        }
        if ((b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return "png";
        }
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "jpeg";
        }
        return null;
    }

    /** Decode et controle une image envoyee en base64 (avec ou sans en-tete data:). Leve IllegalArgumentException. */
    public static byte[] decoder(String base64) {
        if (base64 == null || base64.isEmpty()) {
            throw new IllegalArgumentException("Choisissez une image.");
        }
        String d = base64.contains(",") ? base64.substring(base64.indexOf(',') + 1) : base64;
        byte[] b;
        try {
            b = Base64.getDecoder().decode(d.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Image illisible.");
        }
        if (b.length > TAILLE_MAX) {
            throw new IllegalArgumentException("Image trop lourde (1 Mo au plus).");
        }
        if (type(b) == null) {
            throw new IllegalArgumentException("Seules les images PNG et JPEG sont acceptées.");
        }
        try {
            if (ImageIO.read(new ByteArrayInputStream(b)) == null) {
                throw new IllegalArgumentException("Image illisible.");
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Image illisible.");
        }
        return b;
    }

    public static int largeur(Integer l) {
        return l == null ? LARGEUR_DEFAUT : Math.max(LARGEUR_MIN, Math.min(LARGEUR_MAX, l));
    }

    /** Cachet a imprimer pour un modele : le sien, sinon le commun ; null s'il n'y en a pas. {image, largeur}. */
    @SuppressWarnings("unchecked")
    public static Object[] pourModele(EntityManager em, Integer modeleId) {
        List<Object[]> r = em
                .createNativeQuery(
                        "SELECT image, largeur FROM t_cachet_facture WHERE cible IN (?1, ?2)" + " ORDER BY cible = ?2")
                .setParameter(1, "MODELE-" + modeleId).setParameter(2, COMMUN).setMaxResults(1).getResultList();
        return r.isEmpty() ? null : r.get(0);
    }
}
