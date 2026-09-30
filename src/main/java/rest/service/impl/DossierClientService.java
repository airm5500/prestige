package rest.service.impl;

import dal.TUser;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * DOSSIER DU CLIENT, onglet « Fiche client » des ordonnances (retour du 30/09) : identite, terrains et allergies
 * permanents, allergies en texte libre, parametres suivis (glycemie, tension, poids...) avec leurs mesures datees et
 * leur analyse selon les normes de l'age ; IMC calcule.
 *
 * <p>
 * Les parametres sont PARAMETRABLES (libelle, unite, bornes de saisie, ordre, actif) ; un parametre ne se supprime pas,
 * il se desactive (ses mesures restent). Une mesure erronee se retire.
 */
@Stateless
public class DossierClientService {

    private static final Logger LOG = Logger.getLogger(DossierClientService.class.getName());
    static final int MAX_LIBELLE = 80;
    static final int MAX_ALLERGIES = 2000;
    private static final DateTimeFormatter ISO_MINUTE = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /* ================================================================ parametres */

    /** Les parametres (actifs, ou tous pour le parametrage), avec leurs normes. */
    @SuppressWarnings("unchecked")
    public JSONObject parametres(boolean tous) {
        JSONArray data = new JSONArray();
        try {
            Map<String, List<NormeClinique.Norme>> normes = normes();
            for (Tuple t : (List<Tuple>) em.createNativeQuery("SELECT p.lg_PARAMETRE_ID AS id, p.str_CODE AS code,"
                    + " p.str_LIBELLE AS libelle, p.str_UNITE AS unite, p.str_GENRE AS genre, p.int_DECIMALES AS decimales,"
                    + " p.dbl_SAISIE_MIN AS mini, p.dbl_SAISIE_MAX AS maxi, p.int_ORDRE AS ordre, p.bool_ACTIF AS actif,"
                    + " (SELECT COUNT(*) FROM t_client_mesure m WHERE m.lg_PARAMETRE_ID = p.lg_PARAMETRE_ID) AS mesures"
                    + " FROM t_parametre_clinique p" + (tous ? "" : " WHERE p.bool_ACTIF = 1")
                    + " ORDER BY p.int_ORDRE, p.str_LIBELLE", Tuple.class).getResultList()) {
                String id = t.get("id", String.class);
                JSONArray n = new JSONArray();
                for (NormeClinique.Norme x : normes.getOrDefault(id, new ArrayList<>())) {
                    n.put(new JSONObject().put("plage", x.plage()).put("source",
                            StringUtils.defaultString(x.getSource())));
                }
                data.put(new JSONObject().put("id", id)
                        .put("code", StringUtils.defaultString(t.get("code", String.class)))
                        .put("libelle", t.get("libelle", String.class))
                        .put("unite", StringUtils.defaultString(t.get("unite", String.class)))
                        .put("genre", t.get("genre", String.class)).put("decimales", entier(t.get("decimales")))
                        .put("saisieMin", t.get("mini") == null ? JSONObject.NULL : t.get("mini"))
                        .put("saisieMax", t.get("maxi") == null ? JSONObject.NULL : t.get("maxi"))
                        .put("ordre", entier(t.get("ordre"))).put("actif", TerrainCliniqueService.vrai(t.get("actif")))
                        .put("mesures", entier(t.get("mesures"))).put("normes", n));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "parametres cliniques", e);
            return refus("Les paramètres n'ont pas pu être lus.");
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
    }

    /** Cree (sans id) ou modifie un parametre. Le genre (simple / tension) ne change plus une fois cree. */
    public JSONObject enregistrerParametre(JSONObject r) {
        String id = StringUtils.trimToNull(r.optString("id", null));
        String libelle = StringUtils.normalizeSpace(r.optString("libelle", ""));
        String motif = validerParametre(libelle, nombre(r, "saisieMin"), nombre(r, "saisieMax"));
        if (motif != null) {
            return refus(motif);
        }
        String unite = StringUtils.left(StringUtils.trimToNull(r.optString("unite", null)), 20);
        int decimales = Math.max(0, Math.min(r.optInt("decimales", 0), 3));
        try {
            Number doublon = (Number) em
                    .createNativeQuery("SELECT COUNT(*) FROM t_parametre_clinique"
                            + " WHERE UPPER(str_LIBELLE) = UPPER(?1) AND lg_PARAMETRE_ID <> ?2")
                    .setParameter(1, libelle).setParameter(2, StringUtils.defaultString(id)).getSingleResult();
            if (doublon.intValue() > 0) {
                return refus("Un paramètre « " + libelle + " » existe déjà.");
            }
            if (id == null) {
                id = UUID.randomUUID().toString();
                em.createNativeQuery("INSERT INTO t_parametre_clinique (lg_PARAMETRE_ID, str_LIBELLE, str_UNITE,"
                        + " str_GENRE, int_DECIMALES, dbl_SAISIE_MIN, dbl_SAISIE_MAX, int_ORDRE, bool_ACTIF, dt_CREATED)"
                        + " VALUES (?1, ?2, ?3, 'simple', ?4, ?5, ?6, ?7, ?8, ?9)").setParameter(1, id)
                        .setParameter(2, libelle).setParameter(3, unite).setParameter(4, decimales)
                        .setParameter(5, nombre(r, "saisieMin")).setParameter(6, nombre(r, "saisieMax"))
                        .setParameter(7, r.optInt("ordre", 100)).setParameter(8, r.optBoolean("actif", true) ? 1 : 0)
                        .setParameter(9, new Date()).executeUpdate();
            } else {
                int n = em.createNativeQuery("UPDATE t_parametre_clinique SET str_LIBELLE = ?1, str_UNITE = ?2,"
                        + " int_DECIMALES = ?3, dbl_SAISIE_MIN = ?4, dbl_SAISIE_MAX = ?5, int_ORDRE = ?6, bool_ACTIF = ?7,"
                        + " dt_UPDATED = ?8 WHERE lg_PARAMETRE_ID = ?9").setParameter(1, libelle).setParameter(2, unite)
                        .setParameter(3, decimales).setParameter(4, nombre(r, "saisieMin"))
                        .setParameter(5, nombre(r, "saisieMax")).setParameter(6, r.optInt("ordre", 100))
                        .setParameter(7, r.optBoolean("actif", true) ? 1 : 0).setParameter(8, new Date())
                        .setParameter(9, id).executeUpdate();
                if (n == 0) {
                    return refus("Paramètre inconnu.");
                }
            }
            return new JSONObject().put("success", true).put("id", id).put("message",
                    "Paramètre « " + libelle + " » enregistré.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "parametre clinique", e);
            return refus("Le paramètre n'a pas pu être enregistré.");
        }
    }

    static String validerParametre(String libelle, Double min, Double max) {
        if (StringUtils.isBlank(libelle)) {
            return "Le libellé du paramètre est obligatoire.";
        }
        if (libelle.length() > MAX_LIBELLE) {
            return "Le libellé du paramètre fait " + MAX_LIBELLE + " caractères au plus.";
        }
        if (min != null && max != null && min >= max) {
            return "La borne basse de saisie doit être inférieure à la borne haute.";
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, List<NormeClinique.Norme>> normes() {
        Map<String, List<NormeClinique.Norme>> m = new HashMap<>();
        for (Tuple t : (List<Tuple>) em.createNativeQuery("SELECT lg_PARAMETRE_ID AS p, int_AGE_MIN AS amin,"
                + " int_AGE_MAX AS amax, dbl_BAS AS bas, dbl_HAUT AS haut, dbl_BAS2 AS bas2, dbl_HAUT2 AS haut2,"
                + " str_SOURCE AS src FROM t_parametre_norme ORDER BY int_AGE_MIN", Tuple.class).getResultList()) {
            m.computeIfAbsent(t.get("p", String.class), k -> new ArrayList<>())
                    .add(new NormeClinique.Norme(entierOuNull(t.get("amin")), entierOuNull(t.get("amax")),
                            decimal(t.get("bas")), decimal(t.get("haut")), decimal(t.get("bas2")),
                            decimal(t.get("haut2")), t.get("src", String.class)));
        }
        return m;
    }

    /* ================================================================ dossier */

    /** Le dossier complet d'un client pour l'onglet « Fiche client ». */
    @SuppressWarnings("unchecked")
    public JSONObject dossier(String clientId) {
        try {
            List<Tuple> c = em.createNativeQuery("SELECT c.lg_CLIENT_ID AS id, c.str_FIRST_NAME AS nom,"
                    + " c.str_LAST_NAME AS prenoms, c.str_TELEPHONE AS tel, c.str_ADRESSE AS adresse,"
                    + " c.dt_NAISSANCE AS naissance, c.str_SEXE AS sexe, c.lg_TYPE_CLIENT_ID AS typeId, t.str_NAME AS type"
                    + " FROM t_client c LEFT JOIN t_type_client t ON t.lg_TYPE_CLIENT_ID = c.lg_TYPE_CLIENT_ID"
                    + " WHERE c.lg_CLIENT_ID = ?1", Tuple.class).setParameter(1, StringUtils.defaultString(clientId))
                    .getResultList();
            if (c.isEmpty()) {
                return refus("Client introuvable.");
            }
            Tuple t = c.get(0);
            String naissance = StringUtils.left(t.get("naissance") == null ? "" : String.valueOf(t.get("naissance")),
                    10);
            Integer age = age(clientId, naissance);
            JSONObject client = new JSONObject().put("id", clientId)
                    .put("nom", StringUtils.defaultString(t.get("nom", String.class)))
                    .put("prenoms", StringUtils.defaultString(t.get("prenoms", String.class)))
                    .put("telephone",
                            RechercheClientOrdonnance.telephone(t.get("tel", String.class),
                                    t.get("adresse", String.class)))
                    .put("naissance", naissance).put("age", age == null ? JSONObject.NULL : age)
                    .put("sexe", StringUtils.defaultString(t.get("sexe", String.class)))
                    .put("typeId", StringUtils.defaultString(t.get("typeId", String.class)))
                    .put("type", StringUtils.defaultString(t.get("type", String.class)));
            JSONArray terrains = new JSONArray((List<String>) em
                    .createNativeQuery("SELECT lg_TERRAIN_ID FROM t_client_terrain WHERE lg_CLIENT_ID = ?1")
                    .setParameter(1, clientId).getResultList());
            List<Object> allergies = em
                    .createNativeQuery("SELECT str_ALLERGIES FROM t_client_dossier WHERE lg_CLIENT_ID = ?1")
                    .setParameter(1, clientId).getResultList();
            JSONObject sortie = new JSONObject().put("success", true).put("client", client).put("terrains", terrains)
                    .put("allergies",
                            allergies.isEmpty() || allergies.get(0) == null ? "" : String.valueOf(allergies.get(0)));
            /* Derniere mesure de chaque parametre actif, analysee. */
            Map<String, List<NormeClinique.Norme>> normes = normes();
            JSONArray dernieres = new JSONArray();
            Double poids = null;
            Double taille = null;
            for (Tuple m : (List<Tuple>) em.createNativeQuery("SELECT p.lg_PARAMETRE_ID AS pid, p.str_CODE AS code,"
                    + " p.str_LIBELLE AS libelle, p.str_UNITE AS unite, p.str_GENRE AS genre, p.int_DECIMALES AS nbdec,"
                    + " m.dbl_VALEUR AS v, m.dbl_VALEUR2 AS v2, m.str_COTE AS cote, m.dt_MESURE AS jour,"
                    + " (SELECT COUNT(*) FROM t_client_mesure x WHERE x.lg_CLIENT_ID = :c AND x.lg_PARAMETRE_ID = p.lg_PARAMETRE_ID) AS nb"
                    + " FROM t_parametre_clinique p LEFT JOIN t_client_mesure m ON m.lg_MESURE_ID = (SELECT y.lg_MESURE_ID"
                    + " FROM t_client_mesure y WHERE y.lg_CLIENT_ID = :c AND y.lg_PARAMETRE_ID = p.lg_PARAMETRE_ID"
                    + " ORDER BY y.dt_MESURE DESC, y.dt_CREATED DESC LIMIT 1) WHERE p.bool_ACTIF = 1"
                    + " ORDER BY p.int_ORDRE, p.str_LIBELLE", Tuple.class).setParameter("c", clientId)
                    .getResultList()) {
                JSONObject d = new JSONObject().put("parametreId", m.get("pid", String.class))
                        .put("code", StringUtils.defaultString(m.get("code", String.class)))
                        .put("libelle", m.get("libelle", String.class))
                        .put("unite", StringUtils.defaultString(m.get("unite", String.class)))
                        .put("genre", m.get("genre", String.class)).put("decimales", entier(m.get("nbdec")))
                        .put("nbMesures", entier(m.get("nb")));
                if (m.get("v") != null) {
                    double v = decimal(m.get("v"));
                    Double v2 = decimal(m.get("v2"));
                    NormeClinique.Evaluation e = NormeClinique.evaluer(v, v2, age,
                            normes.getOrDefault(m.get("pid", String.class), new ArrayList<>()));
                    d.put("valeur", v).put("valeur2", v2 == null ? JSONObject.NULL : v2)
                            .put("cote", cote(m.get("cote"))).put("date", horodatage(m.get("jour"))).put("etat", e.etat)
                            .put("analyse", e.libelle).put("norme", e.norme == null ? "" : e.norme.plage());
                    if ("POIDS".equals(m.get("code", String.class))) {
                        poids = v;
                    } else if ("TAILLE".equals(m.get("code", String.class))) {
                        taille = v;
                    }
                }
                dernieres.put(d);
            }
            sortie.put("parametres", dernieres);
            Double imc = NormeClinique.imc(poids, taille);
            if (imc != null) {
                NormeClinique.Evaluation e = NormeClinique.classerImc(imc, age);
                sortie.put("imc", new JSONObject().put("valeur", imc).put("etat", e.etat).put("analyse", e.libelle));
            }
            Number nbOrdonnances = (Number) em
                    .createNativeQuery("SELECT COUNT(*) FROM t_ordonnance_client"
                            + " WHERE lg_CLIENT_ID = ?1 AND str_STATUT <> 'annulee'")
                    .setParameter(1, clientId).getSingleResult();
            return sortie.put("nbOrdonnances", nbOrdonnances.intValue());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "dossier d'un client", e);
            return refus("Le dossier du client n'a pas pu être lu.");
        }
    }

    /**
     * Fiche du client pour le SUIVI DE CONSOMMATION de l'ecran de vente (maquette validee le 30/09) : identite
     * (telephone, naissance, age, type) et assurances pour tout operateur ; terrains, allergies et derniers parametres
     * seulement si {@code clinique} (le droit de consulter les ordonnances clients). Lecture seule.
     */
    @SuppressWarnings("unchecked")
    public JSONObject ficheVente(String clientId, boolean clinique) {
        JSONObject d = dossier(clientId);
        if (!d.optBoolean("success")) {
            return d;
        }
        JSONObject sortie = new JSONObject().put("success", true).put("client", d.getJSONObject("client"))
                .put("clinique", clinique);
        try {
            JSONArray assurances = new JSONArray();
            for (Tuple t : (List<Tuple>) em
                    .createNativeQuery("SELECT COALESCE(NULLIF(tp.str_FULLNAME, ''), tp.str_NAME) AS nom,"
                            + " cp.int_POURCENTAGE AS taux, cp.b_IS_RO AS ro FROM t_compte_client cc"
                            + " JOIN t_compte_client_tiers_payant cp ON cp.lg_COMPTE_CLIENT_ID = cc.lg_COMPTE_CLIENT_ID"
                            + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = cp.lg_TIERS_PAYANT_ID"
                            + " WHERE cc.lg_CLIENT_ID = ?1 AND (cp.str_STATUT IS NULL OR cp.str_STATUT = 'enable')"
                            + " ORDER BY cp.b_IS_RO DESC, cp.int_PRIORITY", Tuple.class)
                    .setParameter(1, clientId).getResultList()) {
                assurances.put(new JSONObject().put("nom", StringUtils.defaultString(t.get("nom", String.class)))
                        .put("taux", t.get("taux") == null ? JSONObject.NULL : entier(t.get("taux"))));
            }
            sortie.put("assurances", assurances);
            if (clinique) {
                JSONArray terrains = new JSONArray();
                for (Tuple t : (List<Tuple>) em.createNativeQuery("SELECT tc.str_LIBELLE AS libelle,"
                        + " tc.str_CATEGORIE AS categorie FROM t_client_terrain ct"
                        + " JOIN t_terrain_clinique tc ON tc.lg_TERRAIN_ID = ct.lg_TERRAIN_ID WHERE ct.lg_CLIENT_ID = ?1"
                        + " ORDER BY tc.int_ORDRE, tc.str_LIBELLE", Tuple.class).setParameter(1, clientId)
                        .getResultList()) {
                    terrains.put(new JSONObject().put("libelle", t.get("libelle", String.class)).put("categorie",
                            StringUtils.defaultString(t.get("categorie", String.class))));
                }
                JSONArray mesures = new JSONArray();
                JSONArray parametres = d.optJSONArray("parametres");
                for (int i = 0; parametres != null && i < parametres.length(); i++) {
                    if (parametres.getJSONObject(i).has("valeur")) {
                        mesures.put(parametres.getJSONObject(i));
                    }
                }
                sortie.put("terrains", terrains).put("allergies", d.optString("allergies", ""))
                        .put("parametres", mesures).put("imc", d.opt("imc") == null ? JSONObject.NULL : d.get("imc"));
            }
            return sortie;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fiche client de la vente", e);
            return refus("La fiche du client n'a pas pu être lue.");
        }
    }

    /**
     * Age revolu du client : par sa date de naissance, sinon par l'age de sa derniere ordonnance (vieilli des annees
     * ecoulees depuis). Null si on ne sait pas.
     */
    @SuppressWarnings("unchecked")
    Integer age(String clientId, String naissance) {
        LocalDate n = DateNaissance.lire(naissance);
        if (n != null) {
            return DateNaissance.age(n, LocalDate.now());
        }
        List<Tuple> l = em
                .createNativeQuery("SELECT int_AGE_PATIENT AS age, dt_ORDONNANCE AS jour FROM t_ordonnance_client"
                        + " WHERE lg_CLIENT_ID = ?1 AND int_AGE_PATIENT IS NOT NULL AND str_STATUT <> 'annulee'"
                        + " ORDER BY dt_ORDONNANCE DESC LIMIT 1", Tuple.class)
                .setParameter(1, clientId).getResultList();
        if (l.isEmpty()) {
            return null;
        }
        LocalDate jour = LocalDate.parse(String.valueOf(l.get(0).get("jour")).substring(0, 10));
        return entier(l.get(0).get("age")) + Math.max(0, java.time.Period.between(jour, LocalDate.now()).getYears());
    }

    /** Terrains / allergies permanents et allergies en texte libre. */
    public JSONObject enregistrerDossier(String clientId, JSONObject r, TUser operateur) {
        String allergies = StringUtils.trimToNull(r.optString("allergies", null));
        if (allergies != null && allergies.length() > MAX_ALLERGIES) {
            return refus("Les allergies font " + MAX_ALLERGIES + " caractères au plus.");
        }
        try {
            if (em.createNativeQuery("SELECT 1 FROM t_client WHERE lg_CLIENT_ID = ?1")
                    .setParameter(1, StringUtils.defaultString(clientId)).getResultList().isEmpty()) {
                return refus("Client introuvable.");
            }
            em.createNativeQuery("INSERT INTO t_client_dossier (lg_CLIENT_ID, str_ALLERGIES, dt_UPDATED, lg_USER_ID)"
                    + " VALUES (?1, ?2, ?3, ?4) ON DUPLICATE KEY UPDATE str_ALLERGIES = VALUES(str_ALLERGIES),"
                    + " dt_UPDATED = VALUES(dt_UPDATED), lg_USER_ID = VALUES(lg_USER_ID)").setParameter(1, clientId)
                    .setParameter(2, allergies).setParameter(3, new Date())
                    .setParameter(4, operateur == null ? null : operateur.getLgUSERID()).executeUpdate();
            if (r.has("terrains")) {
                em.createNativeQuery("DELETE FROM t_client_terrain WHERE lg_CLIENT_ID = ?1").setParameter(1, clientId)
                        .executeUpdate();
                ajouterTerrains(clientId, r.optJSONArray("terrains"));
            }
            return new JSONObject().put("success", true).put("message", "Dossier du client enregistré.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "dossier d'un client", e);
            return refus("Le dossier n'a pas pu être enregistré.");
        }
    }

    /** Ajoute des terrains au dossier (sans rien retirer). Un identifiant inconnu est ignore. */
    public void ajouterTerrains(String clientId, JSONArray terrains) {
        for (int i = 0; terrains != null && i < terrains.length(); i++) {
            String t = StringUtils.trimToNull(terrains.optString(i, null));
            if (t != null) {
                em.createNativeQuery("INSERT IGNORE INTO t_client_terrain (lg_CLIENT_ID, lg_TERRAIN_ID, dt_CREATED)"
                        + " SELECT ?1, lg_TERRAIN_ID, ?3 FROM t_terrain_clinique WHERE lg_TERRAIN_ID = ?2")
                        .setParameter(1, clientId).setParameter(2, t).setParameter(3, new Date()).executeUpdate();
            }
        }
    }

    /* ================================================================ mesures */

    /** Les mesures d'un parametre pour un client, de la plus ancienne a la plus recente (l'ordre de la courbe). */
    @SuppressWarnings("unchecked")
    public JSONObject mesures(String clientId, String parametreId) {
        JSONArray data = new JSONArray();
        try {
            Integer age = age(clientId, naissanceDuClient(clientId));
            List<NormeClinique.Norme> normes = normes().getOrDefault(parametreId, new ArrayList<>());
            for (Tuple t : (List<Tuple>) em.createNativeQuery("SELECT m.lg_MESURE_ID AS id, m.dbl_VALEUR AS v,"
                    + " m.dbl_VALEUR2 AS v2, m.str_COTE AS cote, m.dt_MESURE AS jour, m.str_COMMENTAIRE AS com,"
                    + " m.lg_ORDONNANCE_ID AS ord, o.str_NUMERO AS numero,"
                    + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))) AS par"
                    + " FROM t_client_mesure m LEFT JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID = m.lg_ORDONNANCE_ID"
                    + " LEFT JOIN t_user u ON u.lg_USER_ID = m.lg_USER_ID WHERE m.lg_CLIENT_ID = ?1 AND m.lg_PARAMETRE_ID = ?2"
                    + " ORDER BY m.dt_MESURE, m.dt_CREATED", Tuple.class).setParameter(1, clientId)
                    .setParameter(2, parametreId).getResultList()) {
                double v = decimal(t.get("v"));
                Double v2 = decimal(t.get("v2"));
                NormeClinique.Evaluation e = NormeClinique.evaluer(v, v2, age, normes);
                data.put(new JSONObject().put("id", t.get("id", String.class)).put("valeur", v)
                        .put("valeur2", v2 == null ? JSONObject.NULL : v2).put("cote", cote(t.get("cote")))
                        .put("date", horodatage(t.get("jour")))
                        .put("commentaire", StringUtils.defaultString(t.get("com", String.class)))
                        .put("ordonnance", StringUtils.defaultString(t.get("numero", String.class)))
                        .put("par", StringUtils.defaultString(t.get("par", String.class))).put("etat", e.etat)
                        .put("analyse", e.libelle));
            }
            NormeClinique.Norme n = NormeClinique.choisir(normes, age);
            return new JSONObject().put("success", true).put("total", data.length()).put("data", data)
                    .put("age", age == null ? JSONObject.NULL : age).put("norme",
                            n == null ? JSONObject.NULL
                                    : new JSONObject().put("plage", n.plage())
                                            .put("source", StringUtils.defaultString(n.getSource()))
                                            .put("bas", n.bas == null ? JSONObject.NULL : n.bas)
                                            .put("haut", n.haut == null ? JSONObject.NULL : n.haut)
                                            .put("bas2", n.bas2 == null ? JSONObject.NULL : n.bas2)
                                            .put("haut2", n.haut2 == null ? JSONObject.NULL : n.haut2));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "mesures d'un client", e);
            return refus("Les mesures n'ont pas pu être lues.");
        }
    }

    private String naissanceDuClient(String clientId) {
        List<?> l = em.createNativeQuery("SELECT dt_NAISSANCE FROM t_client WHERE lg_CLIENT_ID = ?1")
                .setParameter(1, StringUtils.defaultString(clientId)).getResultList();
        return l.isEmpty() || l.get(0) == null ? "" : StringUtils.left(String.valueOf(l.get(0)), 10);
    }

    /**
     * Enregistre une prise : une valeur, ou pour la tension le bras gauche et / ou le bras droit (l'un des deux
     * suffit). {@code date} : AAAA-MM-JJ ou AAAA-MM-JJTHH:MM, pas dans le futur ; absente = maintenant.
     */
    @SuppressWarnings("unchecked")
    public JSONObject ajouterMesures(String clientId, JSONObject r, String ordonnanceId, TUser operateur) {
        String parametreId = StringUtils.defaultString(r.optString("parametreId", null));
        List<Tuple> p = em
                .createNativeQuery(
                        "SELECT str_GENRE AS genre, str_LIBELLE AS libelle, dbl_SAISIE_MIN AS mini,"
                                + " dbl_SAISIE_MAX AS maxi FROM t_parametre_clinique WHERE lg_PARAMETRE_ID = ?1",
                        Tuple.class)
                .setParameter(1, parametreId).getResultList();
        if (p.isEmpty()) {
            return refus("Choisissez le paramètre mesuré.");
        }
        if (em.createNativeQuery("SELECT 1 FROM t_client WHERE lg_CLIENT_ID = ?1")
                .setParameter(1, StringUtils.defaultString(clientId)).getResultList().isEmpty()) {
            return refus("Client introuvable.");
        }
        LocalDateTime quand = dateMesure(r.optString("date", null));
        if (quand == null) {
            return refus("La date de la mesure est illisible ou dans le futur.");
        }
        Tuple par = p.get(0);
        Double mini = decimal(par.get("mini"));
        Double maxi = decimal(par.get("maxi"));
        List<Object[]> prises = new ArrayList<>();
        if ("tension".equals(par.get("genre", String.class))) {
            for (String cote : new String[] { "G", "D" }) {
                JSONObject bras = r.optJSONObject("G".equals(cote) ? "gauche" : "droite");
                Double sys = bras == null ? null : nombre(bras, "systolique");
                Double dia = bras == null ? null : nombre(bras, "diastolique");
                if (sys == null && dia == null) {
                    continue;
                }
                String bras2 = "G".equals(cote) ? "bras gauche" : "bras droit";
                if (sys == null || dia == null) {
                    return refus("Tension du " + bras2 + " : saisissez la systolique ET la diastolique.");
                }
                String m = MesureSaisie.hors(sys, mini, maxi, "Systolique (" + bras2 + ")");
                if (m == null) {
                    m = MesureSaisie.hors(dia, mini, maxi, "Diastolique (" + bras2 + ")");
                }
                if (m == null && dia >= sys) {
                    m = "Tension du " + bras2 + " : la diastolique doit être inférieure à la systolique.";
                }
                if (m != null) {
                    return refus(m);
                }
                prises.add(new Object[] { sys, dia, cote });
            }
            if (prises.isEmpty()) {
                return refus("Saisissez la tension d'au moins un bras (gauche ou droit).");
            }
        } else {
            Double v = nombre(r, "valeur");
            if (v == null) {
                return refus("Saisissez la valeur mesurée.");
            }
            String m = MesureSaisie.hors(v, mini, maxi, par.get("libelle", String.class));
            if (m != null) {
                return refus(m);
            }
            prises.add(new Object[] { v, null, null });
        }
        try {
            String commentaire = StringUtils.left(StringUtils.trimToNull(r.optString("commentaire", null)), 200);
            Date jour = java.sql.Timestamp.valueOf(quand);
            for (Object[] x : prises) {
                em.createNativeQuery("INSERT INTO t_client_mesure (lg_MESURE_ID, lg_CLIENT_ID, lg_PARAMETRE_ID,"
                        + " dbl_VALEUR, dbl_VALEUR2, str_COTE, dt_MESURE, str_COMMENTAIRE, lg_ORDONNANCE_ID, lg_USER_ID,"
                        + " dt_CREATED) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)")
                        .setParameter(1, UUID.randomUUID().toString()).setParameter(2, clientId)
                        .setParameter(3, parametreId).setParameter(4, x[0]).setParameter(5, x[1]).setParameter(6, x[2])
                        .setParameter(7, jour).setParameter(8, commentaire).setParameter(9, ordonnanceId)
                        .setParameter(10, operateur == null ? null : operateur.getLgUSERID())
                        .setParameter(11, new Date()).executeUpdate();
            }
            return new JSONObject().put("success", true).put("nombre", prises.size()).put("message",
                    prises.size() > 1 ? "Mesures enregistrées." : "Mesure enregistrée.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "mesure d'un client", e);
            return refus("La mesure n'a pas pu être enregistrée.");
        }
    }

    public JSONObject supprimerMesure(String mesureId) {
        int n = em.createNativeQuery("DELETE FROM t_client_mesure WHERE lg_MESURE_ID = ?1")
                .setParameter(1, StringUtils.defaultString(mesureId)).executeUpdate();
        return n == 0 ? refus("Mesure introuvable.")
                : new JSONObject().put("success", true).put("message", "Mesure retirée.");
    }

    /**
     * Depuis une ORDONNANCE enregistree (30/09) : le poids saisi rejoint le suivi du client (une mesure par ordonnance,
     * mise a jour si l'ordonnance est modifiee) et les terrains coches enrichissent son dossier.
     */
    public void depuisOrdonnance(String clientId, String ordonnanceId, LocalDate jour, boolean majPoids, Integer poids,
            JSONArray terrains, TUser operateur) {
        ajouterTerrains(clientId, terrains);
        if (!majPoids) {
            return;
        }
        em.createNativeQuery("DELETE FROM t_client_mesure WHERE lg_ORDONNANCE_ID = ?1 AND lg_PARAMETRE_ID ="
                + " (SELECT lg_PARAMETRE_ID FROM t_parametre_clinique WHERE str_CODE = 'POIDS')")
                .setParameter(1, ordonnanceId).executeUpdate();
        if (poids != null && poids > 0) {
            em.createNativeQuery("INSERT INTO t_client_mesure (lg_MESURE_ID, lg_CLIENT_ID, lg_PARAMETRE_ID, dbl_VALEUR,"
                    + " dt_MESURE, lg_ORDONNANCE_ID, lg_USER_ID, dt_CREATED) SELECT ?1, ?2, lg_PARAMETRE_ID, ?3, ?4, ?5, ?6, ?7"
                    + " FROM t_parametre_clinique WHERE str_CODE = 'POIDS'")
                    .setParameter(1, UUID.randomUUID().toString()).setParameter(2, clientId)
                    .setParameter(3, poids.doubleValue())
                    .setParameter(4, java.sql.Timestamp.valueOf(jour.atTime(12, 0))).setParameter(5, ordonnanceId)
                    .setParameter(6, operateur == null ? null : operateur.getLgUSERID()).setParameter(7, new Date())
                    .executeUpdate();
        }
    }

    /* ================================================================ outils */

    static LocalDateTime dateMesure(String saisie) {
        String s = StringUtils.trimToEmpty(saisie);
        LocalDateTime d;
        try {
            if (s.isEmpty()) {
                return LocalDateTime.now().withSecond(0).withNano(0);
            }
            d = s.length() <= 10
                    ? LocalDate.parse(s).atTime(LocalDateTime.now().toLocalTime().withSecond(0).withNano(0))
                    : LocalDateTime.parse(s.substring(0, 16), ISO_MINUTE);
        } catch (Exception e) {
            return null;
        }
        return d.isAfter(LocalDateTime.now().plusMinutes(5)) ? null : d;
    }

    private static String horodatage(Object v) {
        if (v == null) {
            return "";
        }
        String s = String.valueOf(v);
        return s.length() >= 16 ? s.substring(0, 10) + "T" + s.substring(11, 16) : s;
    }

    static Double nombre(JSONObject o, String cle) {
        if (o == null || !o.has(cle) || o.isNull(cle)) {
            return null;
        }
        Object v = o.opt(cle);
        if (v instanceof Number) {
            return ((Number) v).doubleValue();
        }
        String s = StringUtils.trimToEmpty(String.valueOf(v)).replace(',', '.');
        if (s.isEmpty()) {
            return null;
        }
        try {
            return Double.valueOf(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** CHAR(1) arrive en Character : lu dans ses deux formes. */
    static String cote(Object v) {
        return v == null ? "" : String.valueOf(v).trim();
    }

    private static Double decimal(Object v) {
        return v instanceof Number ? ((Number) v).doubleValue() : null;
    }

    private static int entier(Object v) {
        return v instanceof Number ? ((Number) v).intValue() : 0;
    }

    private static Integer entierOuNull(Object v) {
        return v instanceof Number ? ((Number) v).intValue() : null;
    }

    private static JSONObject refus(String message) {
        return new JSONObject().put("success", false).put("message", message);
    }

    /** Controle des bornes de saisie (faute de frappe), separe pour les tests. */
    static final class MesureSaisie {
        private MesureSaisie() {
        }

        static String hors(double v, Double mini, Double maxi, String libelle) {
            if ((mini != null && v < mini) || (maxi != null && v > maxi)) {
                return libelle + " : " + NormeClinique.nombre(v) + " est hors des valeurs possibles ("
                        + NormeClinique.nombre(mini) + " à " + NormeClinique.nombre(maxi) + ").";
            }
            return null;
        }
    }
}
