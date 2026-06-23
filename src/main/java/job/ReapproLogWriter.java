package job;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.Tuple;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Ecriture des logs de calcul de reapprovisionnement (seuil / quantite), un
 * fichier JSON par mode et par date dans ~/Documents/reappro_logs/.
 *
 * Objectif : pouvoir verifier facilement les calculs et les donnees utilisees,
 * sans dependre d'une case a cocher. Chaque passage mensuel ecrit, selon le mode
 * reellement execute :
 * <ul>
 * <li>semois_abc_AAAA-MM-JJ.json (SEMOIS par classe ABC)</li>
 * <li>semois_normal_AAAA-MM-JJ.json (SEMOIS standard Q1/Q2/Q3)</li>
 * <li>seuil_default_AAAA-MM-JJ.json (mode par defaut : StockReapproService)</li>
 * </ul>
 *
 * Chaque entree doit contenir au minimum la cle "produitId" ; le CIP et le
 * libelle sont ajoutes automatiquement (en masse) avant l'ecriture.
 */
public final class ReapproLogWriter {

    private static final Logger LOG = Logger.getLogger(ReapproLogWriter.class.getName());

    private ReapproLogWriter() {
    }

    public static void write(EntityManager em, String mode, JSONArray entries) {
        if (entries == null || entries.length() == 0) {
            return;
        }
        try {
            enrich(em, entries);
            String dir = System.getProperty("user.home") + File.separator + "Documents" + File.separator
                    + "reappro_logs";
            File d = new File(dir);
            if (!d.exists()) {
                d.mkdirs();
            }
            String file = dir + File.separator + mode + "_" + LocalDate.now() + ".json";
            try (Writer w = new OutputStreamWriter(new FileOutputStream(file), StandardCharsets.UTF_8)) {
                w.write(entries.toString(2));
            }
            LOG.log(Level.INFO, "[REAPPRO LOG] {0} : {1} produits -> {2}",
                    new Object[] { mode, entries.length(), file });
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Ecriture du log reappro impossible (" + mode + ")", e);
        }
    }

    /** Ajoute cip + libelle a chaque entree (une requete en masse, par paquets de 1000). */
    private static void enrich(EntityManager em, JSONArray entries) {
        Set<String> ids = new LinkedHashSet<>();
        for (int i = 0; i < entries.length(); i++) {
            String id = entries.getJSONObject(i).optString("produitId", "");
            if (!id.isEmpty()) {
                ids.add(id);
            }
        }
        Map<String, String[]> map = loadCipName(em, ids);
        for (int i = 0; i < entries.length(); i++) {
            JSONObject o = entries.getJSONObject(i);
            String[] inf = map.get(o.optString("produitId", ""));
            o.put("cip", inf != null ? inf[0] : "");
            o.put("libelle", inf != null ? inf[1] : "");
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, String[]> loadCipName(EntityManager em, Set<String> ids) {
        Map<String, String[]> map = new HashMap<>();
        if (ids.isEmpty()) {
            return map;
        }
        List<String> list = new ArrayList<>(ids);
        final int chunk = 1000;
        for (int i = 0; i < list.size(); i += chunk) {
            List<String> sub = list.subList(i, Math.min(list.size(), i + chunk));
            try {
                Query q = em.createNativeQuery(
                        "SELECT f.lg_FAMILLE_ID AS id, f.int_CIP AS cip, f.str_NAME AS name FROM t_famille f WHERE f.lg_FAMILLE_ID IN (?1)",
                        Tuple.class);
                q.setParameter(1, sub);
                for (Tuple t : (List<Tuple>) q.getResultList()) {
                    String id = t.get("id", String.class);
                    String cip = t.get("cip", String.class);
                    String name = t.get("name", String.class);
                    map.put(id, new String[] { cip != null ? cip : "", name != null ? name : "" });
                }
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Enrichissement cip/libelle partiel", e);
            }
        }
        return map;
    }
}
