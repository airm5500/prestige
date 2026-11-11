package rest;

import dal.TUser;
import java.lang.management.ManagementFactory;
import java.nio.file.FileStore;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import javax.ejb.Stateless;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import util.EtatAssistance;
import util.VersionBuild;

/**
 * Plan du 09/11, point 8 : « A propos » de Prestige 3, deux onglets (retour du 11/11 : « juste l'onglet version et
 * assistance »). GET v1/a-propos : 401 sans session ; sinon {nom, version, construction, schema, officine, utilisateur,
 * assistance: {serveur, base, sauvegarde, disque, contact}}. Lecture seule ; aucun chemin, mot de passe, jeton ni
 * numero de telephone n'est rendu (l'etat est le meme pour tous les utilisateurs connectes).
 */
@Path("v1/a-propos")
@Produces("application/json; charset=UTF-8")
@Stateless
public class AProposRessource {

    static final String CONTACT = "Service D.I.C.I";

    @Inject
    private HttpServletRequest requete;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @GET
    public Response lire() {
        TUser u = Droits.utilisateur(requete);
        if (u == null) {
            return Response.status(Response.Status.UNAUTHORIZED).type("application/json")
                    .entity(new JSONObject().put("success", false).put("msg", "Veuillez vous connecter").toString())
                    .build();
        }
        String nom = "Prestige", version = "";
        try {
            toolkits.utils.jdom.InitRessource();
            toolkits.utils.jdom.LoadRessource();
            if (toolkits.utils.jdom.APP_NAME != null && !toolkits.utils.jdom.APP_NAME.trim().isEmpty()) {
                nom = toolkits.utils.jdom.APP_NAME.trim();
            }
            version = toolkits.utils.jdom.APP_VERSION == null ? "" : toolkits.utils.jdom.APP_VERSION.trim();
        } catch (RuntimeException e) {
            // ressources illisibles : nom par defaut, version vide
        }
        JSONObject o = new JSONObject().put("success", true).put("nom", nom).put("version", version)
                .put("construction", VersionBuild.libelle()).put("schema", schema()).put("officine", officine())
                .put("utilisateur", (texte(u.getStrFIRSTNAME()) + " " + texte(u.getStrLASTNAME())).trim())
                .put("assistance", assistance());
        return Response.ok(o.toString()).header("Cache-Control", "no-store").build();
    }

    private JSONObject assistance() {
        long maintenant = System.currentTimeMillis();
        long depuis = (maintenant - ManagementFactory.getRuntimeMXBean().getStartTime()) / 60000;
        JSONObject serveur = new JSONObject().put("minutes", depuis).put("texte", EtatAssistance.duree(depuis))
                .put("niveau", EtatAssistance.VERT);

        long ms;
        long t0 = System.nanoTime();
        try {
            em.createNativeQuery("SELECT 1").getSingleResult();
            ms = (System.nanoTime() - t0) / 1_000_000;
        } catch (RuntimeException e) {
            ms = -1;
        }
        JSONObject base = new JSONObject().put("ms", ms).put("niveau", EtatAssistance.base(ms));

        Timestamp derniere = null;
        try {
            Object v = em.createNativeQuery("SELECT MAX(debut) FROM t_sauvegarde WHERE statut = 'REUSSIE'")
                    .getSingleResult();
            derniere = v instanceof Timestamp ? (Timestamp) v : v instanceof java.util.Date
                    ? new Timestamp(((java.util.Date) v).getTime())
                    : v instanceof java.time.LocalDateTime ? Timestamp.valueOf((java.time.LocalDateTime) v) : null;
        } catch (RuntimeException e) {
            // table absente : aucune sauvegarde connue
        }
        Long age = derniere == null ? null : Math.max(0, (maintenant - derniere.getTime()) / 60000);
        JSONObject sauvegarde = new JSONObject()
                .put("derniere", derniere == null ? "" : derniere.toString().substring(0, 16))
                .put("ageMinutes", age == null ? JSONObject.NULL : age)
                .put("ageTexte", age == null ? "" : EtatAssistance.duree(age))
                .put("niveau", EtatAssistance.sauvegarde(age));

        JSONObject disque = new JSONObject();
        try {
            FileStore fs = Files.getFileStore(Paths.get(System.getProperty("user.dir")).toAbsolutePath());
            long libre = fs.getUsableSpace(), total = fs.getTotalSpace();
            String niveau = EtatAssistance.disque(libre, total);
            disque.put("libre", libre).put("total", total).put("libreTexte", EtatAssistance.go(libre))
                    .put("totalTexte", EtatAssistance.go(total))
                    .put("niveau", niveau == null ? JSONObject.NULL : niveau);
        } catch (Exception e) {
            disque.put("niveau", JSONObject.NULL);
        }
        return new JSONObject().put("serveur", serveur).put("base", base).put("sauvegarde", sauvegarde)
                .put("disque", disque).put("contact", CONTACT);
    }

    private String schema() {
        try {
            @SuppressWarnings("unchecked")
            List<Object> l = em
                    .createNativeQuery(
                            "SELECT version FROM flyway_schema_history WHERE success = 1 AND version IS NOT NULL")
                    .getResultList();
            List<String> v = new ArrayList<>(l.size());
            for (Object x : l) {
                v.add(texte(x));
            }
            return EtatAssistance.plusHauteVersion(v);
        } catch (RuntimeException e) {
            return "";
        }
    }

    private String officine() {
        try {
            @SuppressWarnings("unchecked")
            List<Object> l = em.createNativeQuery("SELECT str_NOM_COMPLET FROM t_officine LIMIT 1").getResultList();
            return l.isEmpty() ? "" : texte(l.get(0));
        } catch (RuntimeException e) {
            return "";
        }
    }

    private static String texte(Object o) {
        return o == null ? "" : o.toString().trim();
    }
}
