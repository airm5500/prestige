package rest.service.impl;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.MonographieService;
import util.monographie.FichePharmagora;
import util.monographie.InteractionsProduits;

/**
 * Lecture des monographies DS Pharmagora. Article -> produit du site par le CIP (UV_parCode, puis qUV si le site
 * renvoie une presentation), puis fiche qPX par rubrique. Les pages sont en ISO-8859-1. Le journal ne cite que des
 * identifiants et des statuts.
 */
@Stateless
public class MonographieServiceImpl implements MonographieService {

    private static final Logger LOG = Logger.getLogger(MonographieServiceImpl.class.getName());
    static final String TROUVE = "TROUVE";
    static final String ABSENT = "ABSENT";
    static final int MAX_INTERACTIONS = 30;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject etat() {
        JSONArray rub = new JSONArray();
        for (Map.Entry<Integer, String> e : FichePharmagora.RUBRIQUES.entrySet()) {
            rub.put(new JSONObject().put("numero", e.getKey()).put("libelle", e.getValue()));
        }
        return new JSONObject().put("success", true).put("actif", actif())
                .put("interactionsVente", actif() && "1".equals(parametre(INTERACTIONS_VENTE, "0")))
                .put("rubriques", rub);
    }

    @Override
    public JSONObject fiche(String familleId, int rubrique, boolean relire) {
        if (!actif()) {
            return refus("Les monographies sont coupées (paramètre " + ACTIF + ").");
        }
        if (!FichePharmagora.RUBRIQUES.containsKey(rubrique)) {
            return refus("Rubrique inconnue.");
        }
        Object[] art = article(familleId);
        if (art == null) {
            return refus("Article introuvable.");
        }
        String cip = StringUtils.trimToEmpty((String) art[1]);
        try {
            String produit = produit(familleId, cip, relire);
            if (produit == null) {
                return new JSONObject().put("success", true).put("trouve", false).put("cip", cip).put("msg",
                        cip.isEmpty() ? "Cet article n'a pas de code CIP : impossible de chercher sa monographie."
                                : "Aucune monographie trouvée pour le CIP " + cip + ".");
            }
            JSONObject f = ficheProduit(produit, rubrique, relire);
            return new JSONObject().put("success", true).put("trouve", true).put("cip", cip).put("fiche", f)
                    .put("lueLe", f.remove("lueLe")).put("ancienne", f.optBoolean("ancienne"));
        } catch (ServiceIndisponible e) {
            return refus("Le service des monographies ne répond pas. Réessayez plus tard.");
        }
    }

    @Override
    public JSONObject interactions(List<String> familleIds) {
        if (!actif()) {
            return refus("Les monographies sont coupées (paramètre " + ACTIF + ").");
        }
        List<InteractionsProduits.Produit> produits = new ArrayList<>();
        JSONArray sansFiche = new JSONArray();
        boolean indisponible = false;
        int n = 0;
        for (String id : new LinkedHashSet<>(familleIds == null ? List.<String> of() : familleIds)) {
            if (n++ >= MAX_INTERACTIONS) {
                break;
            }
            Object[] art = article(id);
            if (art == null) {
                continue;
            }
            String nom = (String) art[0];
            JSONObject fiche = null;
            if (!indisponible) {
                try {
                    String produit = produit(id, StringUtils.trimToEmpty((String) art[1]), false);
                    fiche = produit == null ? null : ficheProduit(produit, 3, false);
                } catch (ServiceIndisponible e) {
                    indisponible = true;
                }
            }
            if (fiche == null) {
                sansFiche.put(new JSONObject().put("id", id).put("nom", nom));
            } else {
                produits.add(new InteractionsProduits.Produit(id, nom, fiche));
            }
        }
        return new JSONObject().put("success", true).put("alertes", InteractionsProduits.alertes(produits))
                .put("sansFiche", sansFiche).put("indisponible", indisponible);
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject interactionsVente(String venteId) {
        if (!actif() || !"1".equals(StringUtils.trim(parametre(INTERACTIONS_VENTE, "0")))) {
            return new JSONObject().put("success", true).put("active", false);
        }
        List<String> ids = StringUtils.isBlank(venteId) ? List.of()
                : em.createNativeQuery("SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d"
                        + " WHERE d.lg_PREENREGISTREMENT_ID = ?1 GROUP BY d.lg_FAMILLE_ID ORDER BY MIN(d.dt_CREATED)")
                        .setParameter(1, venteId).getResultList();
        if (ids.size() < 2) {
            return new JSONObject().put("success", true).put("active", true).put("alertes", new JSONArray())
                    .put("sansFiche", new JSONArray()).put("indisponible", false);
        }
        return interactions(ids).put("active", true);
    }

    /* ------------------------------------------------------------------ produit du site */

    @SuppressWarnings("unchecked")
    private Object[] article(String familleId) {
        if (StringUtils.isBlank(familleId)) {
            return null;
        }
        List<Object[]> r = em.createNativeQuery("SELECT str_NAME, int_CIP FROM t_famille WHERE lg_FAMILLE_ID = ?1")
                .setParameter(1, familleId).getResultList();
        return r.isEmpty() ? null : r.get(0);
    }

    @SuppressWarnings("unchecked")
    String produit(String familleId, String cip, boolean relire) throws ServiceIndisponible {
        List<Object[]> r = em
                .createNativeQuery("SELECT str_PRODUIT, str_STATUT, str_CIP, dt_RECHERCHE"
                        + " FROM t_monographie_produit WHERE lg_FAMILLE_ID = ?1")
                .setParameter(1, familleId).getResultList();
        if (!r.isEmpty() && cip.equals(r.get(0)[2])) {
            Object[] l = r.get(0);
            if (TROUVE.equals(l[1])) {
                return (String) l[0]; /* « Relire » relit la fiche, pas la correspondance CIP -> produit */
            }
            if (!relire && frais((Date) l[3])) {
                return null; /* recherche infructueuse recente : on ne repose pas la question au site */
            }
        }
        String produit = null;
        if (cip.matches("[0-9A-Za-z]{4,20}")) {
            JSONObject t = FichePharmagora.lireRecherche(lire("UV_parCode.php3?Chercher=" + cip));
            if (t != null && t.has("produit")) {
                produit = t.getString("produit");
            } else if (t != null && t.has("presentation") && t.getString("presentation").matches("[0-9A-Za-z]{1,30}")) {
                JSONObject u = FichePharmagora.lireRecherche(lire("qUV.php3?cbCuvSemp=" + t.getString("presentation")));
                produit = u == null ? null : u.optString("produit", null);
            }
        }
        if (produit != null && !produit.matches("[0-9A-Za-z]{1,20}")) {
            produit = null;
        }
        em.createNativeQuery("INSERT INTO t_monographie_produit (lg_FAMILLE_ID, str_CIP, str_PRODUIT, str_STATUT,"
                + " dt_RECHERCHE) VALUES (?1, ?2, ?3, ?4, NOW()) ON DUPLICATE KEY UPDATE str_CIP = VALUES(str_CIP),"
                + " str_PRODUIT = VALUES(str_PRODUIT), str_STATUT = VALUES(str_STATUT), dt_RECHERCHE = NOW()")
                .setParameter(1, familleId).setParameter(2, StringUtils.left(cip, 20)).setParameter(3, produit)
                .setParameter(4, produit == null ? ABSENT : TROUVE).executeUpdate();
        LOG.log(Level.INFO, "Monographie : article {0} -> {1}", new Object[] { familleId, produit });
        return produit;
    }

    /* ------------------------------------------------------------------ fiches */

    @SuppressWarnings("unchecked")
    JSONObject ficheProduit(String produit, int rubrique, boolean relire) throws ServiceIndisponible {
        List<Object[]> r = em
                .createNativeQuery("SELECT txt_CONTENU, dt_LECTURE FROM t_monographie"
                        + " WHERE str_PRODUIT = ?1 AND int_RUBRIQUE = ?2")
                .setParameter(1, produit).setParameter(2, rubrique).getResultList();
        JSONObject cache = r.isEmpty() ? null : new JSONObject((String) r.get(0)[0]);
        Date lue = r.isEmpty() ? null : (Date) r.get(0)[1];
        if (cache != null && !relire && frais(lue)) {
            return cache.put("lueLe", lue.getTime());
        }
        String html;
        try {
            html = lire("qPX.php3?cbCprod=" + produit + "&curRub=" + rubrique);
        } catch (ServiceIndisponible e) {
            if (cache != null) {
                return cache.put("lueLe", lue.getTime()).put("ancienne", true);
            }
            throw e;
        }
        JSONObject f = FichePharmagora.lireFiche(html, rubrique);
        em.createNativeQuery("INSERT INTO t_monographie (str_PRODUIT, int_RUBRIQUE, str_TITRE, txt_CONTENU,"
                + " dt_LECTURE) VALUES (?1, ?2, ?3, ?4, NOW()) ON DUPLICATE KEY UPDATE str_TITRE = VALUES(str_TITRE),"
                + " txt_CONTENU = VALUES(txt_CONTENU), dt_LECTURE = NOW()").setParameter(1, produit)
                .setParameter(2, rubrique).setParameter(3, StringUtils.left(f.optString("titre"), 200))
                .setParameter(4, f.toString()).executeUpdate();
        return f.put("lueLe", System.currentTimeMillis());
    }

    /* ------------------------------------------------------------------ site */

    static final class ServiceIndisponible extends Exception {
        private static final long serialVersionUID = 1L;

        ServiceIndisponible(String m) {
            super(m);
        }
    }

    String lire(String chemin) throws ServiceIndisponible {
        String base = StringUtils.trimToEmpty(parametre(URL, ""));
        if (!base.matches("(?i)https?://.+")) {
            throw new ServiceIndisponible("adresse non configuree");
        }
        if (!base.endsWith("/")) {
            base += "/";
        }
        int delai = Math.max(2, Math.min(60, entier(parametre(DELAI, "8"), 8)));
        try {
            HttpResponse<byte[]> rep = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(delai))
                    .followRedirects(HttpClient.Redirect.NORMAL).build().send(HttpRequest
                            .newBuilder(URI.create(base + chemin)).timeout(Duration.ofSeconds(delai)).GET().build(),
                            HttpResponse.BodyHandlers.ofByteArray());
            if (rep.statusCode() != 200) {
                LOG.log(Level.WARNING, "Monographie : statut {0}", rep.statusCode());
                throw new ServiceIndisponible("statut " + rep.statusCode());
            }
            return new String(rep.body(), StandardCharsets.ISO_8859_1);
        } catch (IOException | IllegalArgumentException e) {
            LOG.log(Level.WARNING, "Monographie : service injoignable ({0})", e.getClass().getSimpleName());
            throw new ServiceIndisponible(e.getClass().getSimpleName());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ServiceIndisponible("interrompu");
        }
    }

    /* ------------------------------------------------------------------ outils */

    private boolean actif() {
        return "1".equals(StringUtils.trim(parametre(ACTIF, "0")));
    }

    private boolean frais(Date d) {
        int jours = Math.max(1, entier(parametre(JOURS, "30"), 30));
        return d != null && System.currentTimeMillis() - d.getTime() < jours * 86_400_000L;
    }

    private static int entier(String v, int defaut) {
        try {
            return Integer.parseInt(StringUtils.trim(v));
        } catch (NumberFormatException | NullPointerException e) {
            return defaut;
        }
    }

    @SuppressWarnings("unchecked")
    private String parametre(String cle, String defaut) {
        List<Object> r = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                .setParameter(1, cle).getResultList();
        return r.isEmpty() || r.get(0) == null ? defaut : String.valueOf(r.get(0));
    }

    private static JSONObject refus(String m) {
        return new JSONObject().put("success", false).put("msg", m);
    }
}
