package rest.service.impl;

import dal.TUser;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ImagesProduitService;
import util.StockageDisque;

/**
 * IMAGES PRODUIT (plan d'octobre, section 6) : fichiers sur le disque de donnees (images-produits/AAAA/MM), vignette
 * JPEG a cote, chemin relatif et metadonnees en base. La premiere image d'un produit devient sa principale.
 */
@Stateless
public class ImagesProduitServiceImpl implements ImagesProduitService {

    private static final Logger LOG = Logger.getLogger(ImagesProduitServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject lister(String familleId) {
        JSONArray data = new JSONArray();
        for (Tuple t : (List<Tuple>) em.createNativeQuery("SELECT lg_ID AS id, str_TYPE AS type, int_TAILLE AS taille,"
                + " int_LARGEUR AS l, int_HAUTEUR AS h, bool_PRINCIPALE AS p, str_CHEMIN_VIGNETTE AS v, str_CHEMIN AS c,"
                + " DATE_FORMAT(dt_CREATED, '%d/%m/%Y %H:%i') AS dt FROM t_famille_image WHERE lg_FAMILLE_ID = :f"
                + " ORDER BY bool_PRINCIPALE DESC, int_ORDRE, dt_CREATED", Tuple.class).setParameter("f", familleId)
                .getResultList()) {
            String id = (String) t.get("id");
            String base = "../api/v1/produit-images/" + familleId + "/" + id + "/fichier";
            data.put(new JSONObject().put("id", id).put("type", t.get("type"))
                    .put("taille", ((Number) t.get("taille")).longValue())
                    .put("largeur", t.get("l") == null ? JSONObject.NULL : t.get("l"))
                    .put("hauteur", t.get("h") == null ? JSONObject.NULL : t.get("h"))
                    .put("principale", vrai(t.get("p"))).put("date", t.get("dt")).put("url", base)
                    .put("vignette", base + (t.get("v") == null ? "" : "?taille=vignette"))
                    /*
                     * retours du 07/10 : ou est le fichier ? chemin en base (relatif) et chemin complet sur le disque
                     */
                    .put("chemin", t.get("c")).put("fichier", fichier((String) t.get("c"))));
        }
        return new JSONObject().put("success", true).put("data", data).put("total", data.length()).put("dossier",
                dossierImages().toAbsolutePath().toString());
    }

    @Override
    public JSONObject ajouter(String familleId, InputStream flux, boolean principale, TUser user) {
        Path ecrit = null, vignetteEcrite = null;
        try {
            if (em.createNativeQuery("SELECT 1 FROM t_famille WHERE lg_FAMILLE_ID = :f").setParameter("f", familleId)
                    .getResultList().isEmpty()) {
                return echec("Produit inconnu.");
            }
            byte[] octets = ImagesProduit.lireBorne(flux, ImagesProduit.TAILLE_MAX);
            if (octets == null) {
                return echec("L'image dépasse 5 Mo.");
            }
            String type = ImagesProduit.typeReel(octets);
            if (type == null) {
                return echec("Seules les images JPG, PNG ou WEBP sont acceptées.");
            }
            String id = UUID.randomUUID().toString();
            String relatif = ImagesProduit.cheminRelatif(LocalDate.now(), id, type);
            ecrit = emplacement(relatif);
            Files.createDirectories(ecrit.getParent());
            Files.write(ecrit, octets);
            ImagesProduit.Vignette v = ImagesProduit.vignette(octets);
            String relatifVignette = null;
            if (v != null) {
                relatifVignette = ImagesProduit.cheminRelatif(LocalDate.now(), id + "_v", "jpg");
                vignetteEcrite = emplacement(relatifVignette);
                Files.write(vignetteEcrite, v.octets);
            }
            boolean premiere = ((Number) em
                    .createNativeQuery("SELECT COUNT(*) FROM t_famille_image WHERE lg_FAMILLE_ID = :f")
                    .setParameter("f", familleId).getSingleResult()).intValue() == 0;
            String ancienne = null;
            if (principale && !premiere) {
                List<?> a = em
                        .createNativeQuery(
                                "SELECT lg_ID FROM t_famille_image WHERE lg_FAMILLE_ID = :f AND bool_PRINCIPALE = 1")
                        .setParameter("f", familleId).getResultList();
                ancienne = a.isEmpty() ? null : (String) a.get(0);
            }
            em.createNativeQuery(
                    "INSERT INTO t_famille_image (lg_ID, lg_FAMILLE_ID, str_CHEMIN, str_CHEMIN_VIGNETTE, str_TYPE,"
                            + " int_TAILLE, int_LARGEUR, int_HAUTEUR, bool_PRINCIPALE, int_ORDRE, lg_USER_ID, dt_CREATED) VALUES"
                            + " (:id, :f, :c, :cv, :t, :ta, :l, :h, 0, (SELECT COALESCE(MAX(x.int_ORDRE), 0) + 1 FROM t_famille_image x"
                            + " WHERE x.lg_FAMILLE_ID = :f), :u, NOW())")
                    .setParameter("id", id).setParameter("f", familleId).setParameter("c", relatif)
                    .setParameter("cv", relatifVignette).setParameter("t", type)
                    .setParameter("ta", (long) octets.length).setParameter("l", v == null ? null : v.largeur)
                    .setParameter("h", v == null ? null : v.hauteur)
                    .setParameter("u", user == null ? null : user.getLgUSERID()).executeUpdate();
            if (premiere || principale) {
                definirPrincipale(familleId, id);
            }
            if (ancienne != null) {
                supprimer(familleId, ancienne);
            }
            return new JSONObject().put("success", true).put("id", id);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "ajout d'une image produit", e);
            try {
                if (ecrit != null) {
                    Files.deleteIfExists(ecrit);
                }
                if (vignetteEcrite != null) {
                    Files.deleteIfExists(vignetteEcrite);
                }
            } catch (Exception ignore) {
                /* rien de plus a faire */
            }
            return echec("L'image n'a pas pu être enregistrée.");
        }
    }

    /** TINYINT(1) arrive en Boolean ou en nombre selon le pilote. */
    private static boolean vrai(Object v) {
        return v instanceof Boolean ? (Boolean) v : v instanceof Number && ((Number) v).intValue() == 1;
    }

    private static JSONObject echec(String m) {
        return new JSONObject().put("success", false).put("message", m);
    }

    @Override
    public JSONObject definirPrincipale(String familleId, String imageId) {
        int n = em
                .createNativeQuery("UPDATE t_famille_image SET bool_PRINCIPALE = CASE WHEN lg_ID = :i THEN 1 ELSE 0 END"
                        + " WHERE lg_FAMILLE_ID = :f AND EXISTS (SELECT 1 FROM (SELECT lg_ID FROM t_famille_image WHERE lg_ID = :i"
                        + " AND lg_FAMILLE_ID = :f) y)")
                .setParameter("i", imageId).setParameter("f", familleId).executeUpdate();
        return n > 0 ? new JSONObject().put("success", true) : echec("Image introuvable.");
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject supprimer(String familleId, String imageId) {
        List<Object[]> r = em
                .createNativeQuery("SELECT str_CHEMIN, str_CHEMIN_VIGNETTE, bool_PRINCIPALE FROM t_famille_image"
                        + " WHERE lg_ID = :i AND lg_FAMILLE_ID = :f")
                .setParameter("i", imageId).setParameter("f", familleId).getResultList();
        if (r.isEmpty()) {
            return echec("Image introuvable.");
        }
        em.createNativeQuery("DELETE FROM t_famille_image WHERE lg_ID = :i").setParameter("i", imageId).executeUpdate();
        for (int k = 0; k < 2; k++) {
            String c = (String) r.get(0)[k];
            if (ImagesProduit.cheminSur(c)) {
                try {
                    Files.deleteIfExists(lire(c));
                } catch (Exception e) {
                    LOG.log(Level.WARNING, "fichier d''image non retire : {0}", c);
                }
            }
        }
        if (vrai(r.get(0)[2])) {
            /* La plus ancienne restante devient principale. */
            List<?> suivante = em.createNativeQuery("SELECT lg_ID FROM t_famille_image WHERE lg_FAMILLE_ID = :f"
                    + " ORDER BY int_ORDRE, dt_CREATED LIMIT 1").setParameter("f", familleId).getResultList();
            if (!suivante.isEmpty()) {
                definirPrincipale(familleId, (String) suivante.get(0));
            }
        }
        return new JSONObject().put("success", true);
    }

    @Override
    @SuppressWarnings("unchecked")
    public Object[] fichier(String imageId, boolean vignette) {
        List<Object[]> r = em
                .createNativeQuery(
                        "SELECT str_CHEMIN, str_CHEMIN_VIGNETTE, str_TYPE FROM t_famille_image" + " WHERE lg_ID = :i")
                .setParameter("i", imageId).getResultList();
        if (r.isEmpty()) {
            return null;
        }
        boolean v = vignette && r.get(0)[1] != null;
        String c = (String) (v ? r.get(0)[1] : r.get(0)[0]);
        if (!ImagesProduit.cheminSur(c)) {
            return null;
        }
        Path p = lire(c);
        return Files.isRegularFile(p)
                ? new Object[] { p, v ? "image/jpeg" : ImagesProduit.typeMime((String) r.get(0)[2]) } : null;
    }

    /* ------------------------------------------------------------------ dossier des images (retours du 06/10) */

    /** Parametre facultatif : dossier des images choisi par l'officine (chemin absolu). */
    static final String PARAM_DOSSIER = "KEY_DOSSIER_IMAGES_PRODUITS";

    /**
     * Dossier des images : le parametre s'il est renseigne, sinon {@code images_produits} dans le dossier de
     * configuration de l'officine (celui du fichier config_laborex : {@code D:\CONF\LABOREX\images_produits}),
     * sauvegarde avec la configuration ; a defaut (configuration introuvable), l'ancien emplacement du disque de
     * donnees.
     */
    Path dossierImages() {
        try {
            List<?> r = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = :k")
                    .setParameter("k", PARAM_DOSSIER).getResultList();
            String v = r.isEmpty() || r.get(0) == null ? "" : String.valueOf(r.get(0)).trim();
            if (!v.isEmpty()) {
                return java.nio.file.Paths.get(v);
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "parametre du dossier des images", e);
        }
        Path conf = ImagesProduit.dossierConfiguration(toolkits.utils.jdom.path_of_config);
        return conf != null ? conf.resolve(ImagesProduit.DOSSIER_CONF)
                : StockageDisque.racine().resolve(ImagesProduit.DOSSIER);
    }

    /** Chemin complet du fichier sur le disque du serveur, pour l'affichage (vide si le chemin est inattendu). */
    private String fichier(String relatif) {
        return ImagesProduit.cheminSur(relatif) ? emplacement(relatif).toAbsolutePath().toString() : "";
    }

    /** Ou ecrire un fichier dont le chemin relatif (en base) commence par images-produits/. */
    private Path emplacement(String relatif) {
        return dossierImages().resolve(relatif.substring(ImagesProduit.DOSSIER.length() + 1));
    }

    /**
     * Ou lire un fichier : le nouveau dossier ; une image enregistree avant le changement (ancien emplacement) y est
     * deplacee a sa premiere lecture, sans rien perdre.
     */
    private Path lire(String relatif) {
        Path neuf = emplacement(relatif);
        if (!Files.exists(neuf)) {
            Path ancien = StockageDisque.racine().resolve(relatif);
            if (!ancien.equals(neuf) && Files.isRegularFile(ancien)) {
                try {
                    Files.createDirectories(neuf.getParent());
                    Files.move(ancien, neuf);
                } catch (Exception e) {
                    LOG.log(Level.WARNING, "image laissee a l''ancien emplacement : {0}", relatif);
                    return ancien;
                }
            }
        }
        return neuf;
    }
}
