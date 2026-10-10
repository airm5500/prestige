package rest.service.impl;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.FideliteCalcul.Palier;
import rest.service.impl.FideliteCalcul.Reste;

/**
 * Retours du 09/10 (6) : fidelite clients parametrable.
 *
 * <p>
 * Les points sont tires des ventes cloturees, apres coup ({@link #synchroniser()}), sans rien changer au calcul ni a
 * l'enregistrement de la vente : une vente au comptant ou assurance d'un client identifie rapporte des points sur la
 * part qu'il paie, pour les produits des categories non exclues ; une vente annulee (ou modifiee, ce qui annule la
 * vente d'origine) perd ses points ; les points expirent ; le palier du client (points acquis sur 12 mois) multiplie
 * ses gains. Registre : t_fidelite_mouvement (une ligne GAIN par vente, idempotent).
 * </p>
 */
@Stateless
public class FideliteService {

    static final String ID = "FIDELITE";
    /** Type de reglement « Points fidelite » (t_type_reglement). */
    public static final String TYPE_REGLEMENT = "20";
    static final String GAIN = "GAIN", ANNULATION = "ANNULATION", EXPIRATION = "EXPIRATION",
            UTILISATION = "UTILISATION", AJUSTEMENT = "AJUSTEMENT", RESTITUTION = "RESTITUTION";
    /** Ventes traitees par synchronisation (la suite au passage suivant). */
    static final int LOT = 5000;
    private static final DateTimeFormatter JJ_MM_AAAA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter JJ_MM_AAAA_HH = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Parametres de la fidelite. */
    static class Parametres {

        boolean actif, assurance;
        int montantPoint, valeurPoint, seuil, expirationMois;
        LocalDate debut;
        String synchro;
        /** Retours du 10/10 : exclusions par familles d'articles (FAMILLES) ou par emplacements (EMPLACEMENTS). */
        String modeExclusion = FAMILLES;
    }

    public static final String FAMILLES = "FAMILLES", EMPLACEMENTS = "EMPLACEMENTS";

    /** Condition SQL « le produit f rapporte des points » selon le mode d'exclusion (un seul mode s'applique). */
    static String produitEligible(String modeExclusion) {
        return EMPLACEMENTS.equals(modeExclusion)
                ? "(f.lg_ZONE_GEO_ID IS NULL OR f.lg_ZONE_GEO_ID NOT IN (SELECT z.lg_ZONE_GEO_ID FROM t_fidelite_exclusion_zone z))"
                : "(f.lg_FAMILLEARTICLE_ID IS NULL OR f.lg_FAMILLEARTICLE_ID NOT IN (SELECT e.lg_FAMILLEARTICLE_ID FROM t_fidelite_exclusion e))";
    }

    private static int entier(Object o) {
        return o == null ? 0 : ((Number) o).intValue();
    }

    private static long grand(Object o) {
        return o == null ? 0L : ((Number) o).longValue();
    }

    private static String texte(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static LocalDate jour(Object o) {
        if (o instanceof java.sql.Date) {
            return ((java.sql.Date) o).toLocalDate();
        }
        if (o instanceof Timestamp) {
            return ((Timestamp) o).toLocalDateTime().toLocalDate();
        }
        if (o instanceof java.util.Date) {
            return new java.sql.Date(((java.util.Date) o).getTime()).toLocalDate();
        }
        return null;
    }

    private static LocalDateTime instant(Object o) {
        if (o instanceof Timestamp) {
            return ((Timestamp) o).toLocalDateTime();
        }
        if (o instanceof java.util.Date) {
            return new Timestamp(((java.util.Date) o).getTime()).toLocalDateTime();
        }
        return null;
    }

    private static boolean vrai(Object o) {
        return o instanceof Boolean ? (Boolean) o : o != null && ((Number) o).intValue() != 0;
    }

    @SuppressWarnings("unchecked")
    Parametres parametres(boolean verrou) {
        List<Object[]> l = em.createNativeQuery("SELECT bool_ACTIF, int_MONTANT_POINT, int_VALEUR_POINT,"
                + " int_SEUIL_UTILISATION, int_EXPIRATION_MOIS, bool_ASSURANCE, dt_DEBUT, dt_SYNCHRO, str_MODE_EXCLUSION"
                + " FROM t_fidelite_parametre WHERE lg_PARAMETRE_ID = ?1" + (verrou ? " FOR UPDATE" : ""))
                .setParameter(1, ID).getResultList();
        Parametres p = new Parametres();
        if (l.isEmpty()) {
            p.montantPoint = 1000;
            p.valeurPoint = 5;
            p.seuil = 100;
            p.expirationMois = 12;
            p.assurance = true;
            return p;
        }
        Object[] r = l.get(0);
        p.actif = vrai(r[0]);
        p.montantPoint = entier(r[1]);
        p.valeurPoint = entier(r[2]);
        p.seuil = entier(r[3]);
        p.expirationMois = entier(r[4]);
        p.assurance = vrai(r[5]);
        p.debut = jour(r[6]);
        LocalDateTime s = instant(r[7]);
        p.synchro = s == null ? "" : s.format(JJ_MM_AAAA_HH);
        p.modeExclusion = EMPLACEMENTS.equals(texte(r[8])) ? EMPLACEMENTS : FAMILLES;
        return p;
    }

    @SuppressWarnings("unchecked")
    List<Palier> paliers() {
        List<Palier> l = new ArrayList<>();
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT lg_PALIER_ID, str_LIBELLE, int_SEUIL_POINTS,"
                + " dbl_COEFFICIENT FROM t_fidelite_palier ORDER BY int_SEUIL_POINTS").getResultList()) {
            l.add(new Palier(texte(r[0]), texte(r[1]), entier(r[2]), ((Number) r[3]).doubleValue()));
        }
        return l;
    }

    // ------------------------------------------------------------------ parametrage

    /** Parametres, paliers et categories de produits (exclues ou non). */
    @SuppressWarnings("unchecked")
    public JSONObject lireParametres() {
        Parametres p = parametres(false);
        JSONArray paliers = new JSONArray();
        for (Palier x : paliers()) {
            paliers.put(new JSONObject().put("id", x.id).put("libelle", x.libelle).put("seuil", x.seuil)
                    .put("coefficient", x.coefficient));
        }
        JSONArray categories = new JSONArray();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT fa.lg_FAMILLEARTICLE_ID, fa.str_LIBELLE,"
                        + " (SELECT COUNT(*) FROM t_famille f WHERE f.lg_FAMILLEARTICLE_ID = fa.lg_FAMILLEARTICLE_ID"
                        + " AND f.str_STATUT = 'enable'), EXISTS (SELECT 1 FROM t_fidelite_exclusion e"
                        + " WHERE e.lg_FAMILLEARTICLE_ID = fa.lg_FAMILLEARTICLE_ID)"
                        + " FROM t_famillearticle fa WHERE fa.str_STATUT = 'enable' ORDER BY fa.str_LIBELLE")
                .getResultList()) {
            categories
                    .put(new JSONObject().put("id", texte(r[0])).put("libelle", StringUtils.defaultString(texte(r[1])))
                            .put("produits", grand(r[2])).put("exclue", vrai(r[3])));
        }
        JSONArray emplacements = new JSONArray();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT z.lg_ZONE_GEO_ID, z.str_LIBELLEE, z.str_CODE,"
                        + " (SELECT COUNT(*) FROM t_famille f WHERE f.lg_ZONE_GEO_ID = z.lg_ZONE_GEO_ID"
                        + " AND f.str_STATUT = 'enable'), EXISTS (SELECT 1 FROM t_fidelite_exclusion_zone e"
                        + " WHERE e.lg_ZONE_GEO_ID = z.lg_ZONE_GEO_ID)"
                        + " FROM t_zone_geographique z WHERE z.str_STATUT = 'enable' ORDER BY z.str_LIBELLEE")
                .getResultList()) {
            emplacements
                    .put(new JSONObject().put("id", texte(r[0])).put("libelle", StringUtils.defaultString(texte(r[1])))
                            .put("code", StringUtils.defaultString(texte(r[2]))).put("produits", grand(r[3]))
                            .put("exclue", vrai(r[4])));
        }
        return new JSONObject().put("success", true).put("actif", p.actif).put("montantPoint", p.montantPoint)
                .put("valeurPoint", p.valeurPoint).put("seuil", p.seuil).put("expirationMois", p.expirationMois)
                .put("assurance", p.assurance).put("debut", p.debut == null ? "" : p.debut.toString())
                .put("synchro", p.synchro).put("paliers", paliers).put("categories", categories)
                .put("modeExclusion", p.modeExclusion).put("emplacements", emplacements);
    }

    private static JSONObject echec(String msg) {
        return new JSONObject().put("success", false).put("msg", msg);
    }

    /** Enregistre les parametres (taux, seuil, expiration, activation, date de debut). */
    public JSONObject enregistrerParametres(JSONObject o, String userId) {
        Parametres avant = parametres(true);
        int montant = o.optInt("montantPoint", avant.montantPoint), valeur = o.optInt("valeurPoint", avant.valeurPoint),
                seuil = o.optInt("seuil", avant.seuil), exp = o.optInt("expirationMois", avant.expirationMois);
        String err = FideliteCalcul.controleParametres(montant, valeur, seuil, exp);
        if (err != null) {
            return echec(err);
        }
        boolean actif = o.optBoolean("actif", avant.actif), assurance = o.optBoolean("assurance", avant.assurance);
        LocalDate debut = avant.debut;
        String d = StringUtils.trimToNull(o.optString("debut", null));
        if (d != null) {
            try {
                debut = LocalDate.parse(d.length() > 10 ? d.substring(0, 10) : d);
            } catch (RuntimeException e) {
                return echec("Date de début invalide.");
            }
            if (debut.isAfter(LocalDate.now())) {
                return echec("La date de début ne peut pas être dans le futur.");
            }
            if (debut.isBefore(LocalDate.now().minusMonths(24))) {
                return echec("Date de début : 24 mois en arrière au plus.");
            }
        }
        if (actif && debut == null) {
            debut = LocalDate.now();
        }
        em.createNativeQuery("UPDATE t_fidelite_parametre SET bool_ACTIF = ?1, int_MONTANT_POINT = ?2,"
                + " int_VALEUR_POINT = ?3, int_SEUIL_UTILISATION = ?4, int_EXPIRATION_MOIS = ?5, bool_ASSURANCE = ?6,"
                + " dt_DEBUT = ?7, dt_UPDATED = NOW(), lg_USER_ID = ?8 WHERE lg_PARAMETRE_ID = ?9")
                .setParameter(1, actif ? 1 : 0).setParameter(2, montant).setParameter(3, valeur).setParameter(4, seuil)
                .setParameter(5, exp).setParameter(6, assurance ? 1 : 0)
                .setParameter(7, debut == null ? null : java.sql.Date.valueOf(debut)).setParameter(8, userId)
                .setParameter(9, ID).executeUpdate();
        /* mode de reglement « Points fidelite » propose a la caisse seulement quand la fidelite est activee */
        String statut = actif ? "enable" : "disable";
        em.createNativeQuery(
                "UPDATE t_type_reglement SET str_STATUT = ?1, dt_UPDATED = NOW()" + " WHERE lg_TYPE_REGLEMENT_ID = ?2")
                .setParameter(1, statut).setParameter(2, TYPE_REGLEMENT).executeUpdate();
        em.createNativeQuery(
                "UPDATE t_mode_reglement SET str_STATUT = ?1, dt_UPDATED = NOW()" + " WHERE lg_TYPE_REGLEMENT_ID = ?2")
                .setParameter(1, statut).setParameter(2, TYPE_REGLEMENT).executeUpdate();
        return lireParametres().put("msg", "Paramètres enregistrés.");
    }

    /** Ajoute ou modifie un palier (libelle, seuil de points sur 12 mois, coefficient). */
    public JSONObject enregistrerPalier(JSONObject o) {
        String id = StringUtils.trimToNull(o.optString("id", null));
        String libelle = StringUtils.trimToEmpty(o.optString("libelle", ""));
        int seuil = o.optInt("seuil", -1);
        double coef = o.optDouble("coefficient", -1);
        if (libelle.isEmpty() || libelle.length() > 40) {
            return echec("Libellé du palier : 1 à 40 caractères.");
        }
        if (seuil < 0 || seuil > 10_000_000) {
            return echec("Seuil du palier : entre 0 et 10 000 000 points.");
        }
        if (Double.isNaN(coef) || coef < 0.1 || coef > 10) {
            return echec("Coefficient du palier : entre 0,1 et 10.");
        }
        for (Palier p : paliers()) {
            if (p.seuil == seuil && !p.id.equals(id)) {
                return echec("Un autre palier (« " + p.libelle + " ») a déjà ce seuil.");
            }
        }
        coef = Math.round(coef * 100) / 100.0;
        int n = id == null ? 0
                : em.createNativeQuery("UPDATE t_fidelite_palier SET str_LIBELLE = ?1, int_SEUIL_POINTS = ?2,"
                        + " dbl_COEFFICIENT = ?3, dt_UPDATED = NOW() WHERE lg_PALIER_ID = ?4").setParameter(1, libelle)
                        .setParameter(2, seuil).setParameter(3, coef).setParameter(4, id).executeUpdate();
        if (n == 0) {
            id = UUID.randomUUID().toString();
            em.createNativeQuery("INSERT INTO t_fidelite_palier (lg_PALIER_ID, str_LIBELLE, int_SEUIL_POINTS,"
                    + " dbl_COEFFICIENT, dt_UPDATED) VALUES (?1, ?2, ?3, ?4, NOW())").setParameter(1, id)
                    .setParameter(2, libelle).setParameter(3, seuil).setParameter(4, coef).executeUpdate();
        }
        return lireParametres().put("palierId", id);
    }

    public JSONObject supprimerPalier(String id) {
        int n = em.createNativeQuery("DELETE FROM t_fidelite_palier WHERE lg_PALIER_ID = ?1").setParameter(1, id)
                .executeUpdate();
        return n == 0 ? echec("Palier introuvable.") : lireParametres();
    }

    /** Exclut (ou reintegre) une categorie de produits. */
    public JSONObject exclure(String categorieId, boolean exclue) {
        if (exclue) {
            List<?> l = em.createNativeQuery("SELECT 1 FROM t_famillearticle WHERE lg_FAMILLEARTICLE_ID = ?1")
                    .setParameter(1, categorieId).getResultList();
            if (l.isEmpty()) {
                return echec("Catégorie introuvable.");
            }
            em.createNativeQuery("INSERT IGNORE INTO t_fidelite_exclusion (lg_FAMILLEARTICLE_ID, dt_CREATED)"
                    + " VALUES (?1, NOW())").setParameter(1, categorieId).executeUpdate();
        } else {
            em.createNativeQuery("DELETE FROM t_fidelite_exclusion WHERE lg_FAMILLEARTICLE_ID = ?1")
                    .setParameter(1, categorieId).executeUpdate();
        }
        return new JSONObject().put("success", true);
    }

    /** Retours du 10/10 : exclut (ou reintegre) un emplacement de rangement (zone geographique / rayon). */
    public JSONObject exclureEmplacement(String zoneId, boolean exclue) {
        if (exclue) {
            List<?> l = em.createNativeQuery("SELECT 1 FROM t_zone_geographique WHERE lg_ZONE_GEO_ID = ?1")
                    .setParameter(1, zoneId).getResultList();
            if (l.isEmpty()) {
                return echec("Emplacement introuvable.");
            }
            em.createNativeQuery(
                    "INSERT IGNORE INTO t_fidelite_exclusion_zone (lg_ZONE_GEO_ID, dt_CREATED)" + " VALUES (?1, NOW())")
                    .setParameter(1, zoneId).executeUpdate();
        } else {
            em.createNativeQuery("DELETE FROM t_fidelite_exclusion_zone WHERE lg_ZONE_GEO_ID = ?1")
                    .setParameter(1, zoneId).executeUpdate();
        }
        return new JSONObject().put("success", true);
    }

    /**
     * Retours du 10/10 : exclusions par familles OU par emplacements, jamais les deux. Les deux listes sont gardees ;
     * seule celle du mode choisi s'applique aux ventes traitees ensuite (les points deja acquis ne changent pas).
     */
    public JSONObject changerModeExclusion(String mode, String userId) {
        String m = StringUtils.trimToEmpty(mode).toUpperCase(java.util.Locale.ROOT);
        if (!FAMILLES.equals(m) && !EMPLACEMENTS.equals(m)) {
            return echec("Mode d'exclusion inconnu (familles ou emplacements).");
        }
        em.createNativeQuery("UPDATE t_fidelite_parametre SET str_MODE_EXCLUSION = ?1, dt_UPDATED = NOW(),"
                + " lg_USER_ID = ?2 WHERE lg_PARAMETRE_ID = ?3").setParameter(1, m).setParameter(2, userId)
                .setParameter(3, ID).executeUpdate();
        return lireParametres().put("msg",
                FAMILLES.equals(m)
                        ? "Exclusions par familles d'articles : les emplacements exclus ne s'appliquent plus."
                        : "Exclusions par emplacements : les familles exclues ne s'appliquent plus.");
    }

    // ------------------------------------------------------------------ synchronisation

    private void inserer(String client, String type, int points, int restants, Long base, Double coef, String vente,
            String reference, String motif, Integer valeur, LocalDateTime quand, LocalDate expiration, String userId) {
        Query q = em.createNativeQuery("INSERT INTO t_fidelite_mouvement (lg_MOUVEMENT_ID, lg_CLIENT_ID, str_TYPE,"
                + " int_POINTS, int_RESTANTS, int_BASE, dbl_COEFFICIENT, lg_PREENREGISTREMENT_ID, str_REFERENCE,"
                + " str_MOTIF, int_VALEUR, dt_MOUVEMENT, dt_EXPIRATION, lg_USER_ID, dt_CREATED)"
                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, NOW())");
        q.setParameter(1, UUID.randomUUID().toString()).setParameter(2, client).setParameter(3, type)
                .setParameter(4, points).setParameter(5, restants).setParameter(6, base).setParameter(7, coef)
                .setParameter(8, vente).setParameter(9, StringUtils.left(reference, 60))
                .setParameter(10, StringUtils.left(motif, 150)).setParameter(11, valeur)
                .setParameter(12, Timestamp.valueOf(quand))
                .setParameter(13, expiration == null ? null : java.sql.Date.valueOf(expiration))
                .setParameter(14, userId);
        q.executeUpdate();
    }

    /** Points acquis (gains moins annulations) par le client sur les 12 mois precedant cette date. */
    private long acquis12Mois(String client, LocalDateTime quand) {
        Object o = em
                .createNativeQuery("SELECT COALESCE(SUM(int_POINTS), 0) FROM t_fidelite_mouvement"
                        + " WHERE lg_CLIENT_ID = ?1 AND str_TYPE IN ('GAIN', 'ANNULATION') AND dt_MOUVEMENT >= ?2"
                        + " AND dt_MOUVEMENT < ?3")
                .setParameter(1, client).setParameter(2, Timestamp.valueOf(quand.minusMonths(12)))
                .setParameter(3, Timestamp.valueOf(quand)).getSingleResult();
        return grand(o);
    }

    /**
     * Met le registre a jour : points des ventes cloturees depuis le debut de la fidelite, annulation des points des
     * ventes annulees ou modifiees, expiration. Idempotent ; rend le nombre d'operations de chaque sorte.
     */
    @SuppressWarnings("unchecked")
    public JSONObject synchroniser() {
        Parametres p = parametres(true);
        JSONObject r = new JSONObject().put("success", true).put("gains", 0).put("annulations", 0).put("expirations",
                0);
        if (!p.actif || p.debut == null) {
            return r.put("actif", false);
        }
        List<Palier> paliers = paliers();
        int gains = 0, annulations = 0, expirations = 0;
        /* 1. gains : ventes cloturees d'un client, non annulees, pas encore traitees */
        List<Object[]> ventes = em.createNativeQuery("SELECT p.lg_PREENREGISTREMENT_ID, p.lg_CLIENT_ID,"
                + " p.int_PRICE - COALESCE(p.int_PRICE_REMISE, 0), COALESCE(p.str_REF_TICKET, p.str_REF), p.dt_UPDATED,"
                + " (SELECT COALESCE(SUM(t.int_PRICE), 0) FROM t_preenregistrement_compte_client_tiers_payent t"
                + "   WHERE t.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID),"
                + " (SELECT COALESCE(SUM(d.int_PRICE - COALESCE(d.int_PRICE_REMISE, 0)), 0)"
                + "   FROM t_preenregistrement_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + "   WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID AND "
                + produitEligible(p.modeExclusion) + "),"
                + " (SELECT COALESCE(SUM(u.int_VALEUR), 0) FROM t_fidelite_mouvement u"
                + "   WHERE u.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID AND u.str_TYPE = 'UTILISATION')"
                + " FROM t_preenregistrement p JOIN t_client c ON c.lg_CLIENT_ID = p.lg_CLIENT_ID"
                + " WHERE p.str_STATUT = 'is_Closed' AND COALESCE(p.b_IS_CANCEL, 0) = 0 AND p.int_PRICE > 0"
                + " AND p.str_TYPE_VENTE IN ('VNO'" + (p.assurance ? ", 'VO'" : "") + ") AND p.dt_UPDATED >= ?1"
                + " AND NOT EXISTS (SELECT 1 FROM t_fidelite_mouvement m"
                + "   WHERE m.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID AND m.str_TYPE = 'GAIN')"
                + " ORDER BY p.dt_UPDATED").setParameter(1, java.sql.Date.valueOf(p.debut)).setMaxResults(LOT)
                .getResultList();
        for (Object[] v : ventes) {
            LocalDateTime quand = instant(v[4]);
            if (quand == null) {
                continue;
            }
            String client = texte(v[1]);
            /* la part payee avec des points ne rapporte pas de points */
            long base = FideliteCalcul.base(grand(v[2]), grand(v[6]), grand(v[5]) + grand(v[7]));
            Palier pal = FideliteCalcul.palier(paliers, acquis12Mois(client, quand));
            double coef = pal == null ? 1.0 : pal.coefficient;
            int points = FideliteCalcul.points(base, p.montantPoint, coef);
            LocalDate exp = p.expirationMois > 0 ? quand.toLocalDate().plusMonths(p.expirationMois) : null;
            inserer(client, GAIN, points, points, base, coef, texte(v[0]), texte(v[3]), null, null, quand, exp, null);
            gains++;
        }
        /* 2. annulations : la vente d'un gain a ete annulee (ou modifiee) ; ce qui a deja expire n'est pas repris */
        for (Object[] g : (List<Object[]>) em.createNativeQuery("SELECT m.lg_MOUVEMENT_ID, m.lg_CLIENT_ID,"
                + " m.int_POINTS, m.lg_PREENREGISTREMENT_ID, m.str_REFERENCE, COALESCE(p.dt_ANNULER, p.dt_UPDATED),"
                + " (SELECT COALESCE(SUM(x.int_POINTS), 0) FROM t_fidelite_mouvement x"
                + "   WHERE x.lg_PREENREGISTREMENT_ID = m.lg_PREENREGISTREMENT_ID AND x.str_TYPE = 'EXPIRATION')"
                + " FROM t_fidelite_mouvement m JOIN t_preenregistrement p"
                + "   ON p.lg_PREENREGISTREMENT_ID = m.lg_PREENREGISTREMENT_ID"
                + " WHERE m.str_TYPE = 'GAIN' AND m.int_POINTS > 0 AND (COALESCE(p.b_IS_CANCEL, 0) = 1"
                + "   OR p.str_STATUT <> 'is_Closed')" + " AND NOT EXISTS (SELECT 1 FROM t_fidelite_mouvement a"
                + "   WHERE a.lg_PREENREGISTREMENT_ID = m.lg_PREENREGISTREMENT_ID AND a.str_TYPE = 'ANNULATION')")
                .getResultList()) {
            int retire = entier(g[2]) + entier(g[6]);
            LocalDateTime quand = instant(g[5]);
            inserer(texte(g[1]), ANNULATION, -Math.max(0, retire), 0, null, null, texte(g[3]), texte(g[4]),
                    "Vente annulée ou modifiée", null, quand == null ? LocalDateTime.now() : quand, null, null);
            em.createNativeQuery("UPDATE t_fidelite_mouvement SET int_RESTANTS = 0 WHERE lg_MOUVEMENT_ID = ?1")
                    .setParameter(1, texte(g[0])).executeUpdate();
            annulations++;
        }
        /* 2 bis. restitution : points donnes en paiement d'une vente annulee (ou modifiee) */
        int restitutions = 0;
        for (Object[] u : (List<Object[]>) em.createNativeQuery("SELECT m.lg_CLIENT_ID, -m.int_POINTS,"
                + " m.lg_PREENREGISTREMENT_ID, m.str_REFERENCE, m.int_VALEUR"
                + " FROM t_fidelite_mouvement m JOIN t_preenregistrement p"
                + "   ON p.lg_PREENREGISTREMENT_ID = m.lg_PREENREGISTREMENT_ID"
                + " WHERE m.str_TYPE = 'UTILISATION' AND m.int_POINTS < 0 AND (COALESCE(p.b_IS_CANCEL, 0) = 1"
                + "   OR p.str_STATUT <> 'is_Closed')" + " AND NOT EXISTS (SELECT 1 FROM t_fidelite_mouvement r"
                + "   WHERE r.lg_PREENREGISTREMENT_ID = m.lg_PREENREGISTREMENT_ID AND r.str_TYPE = 'RESTITUTION')")
                .getResultList()) {
            int pts = entier(u[1]);
            LocalDate exp = p.expirationMois > 0 ? LocalDate.now().plusMonths(p.expirationMois) : null;
            inserer(texte(u[0]), RESTITUTION, pts, pts, null, null, texte(u[2]), texte(u[3]),
                    "Points rendus : vente payée en points annulée ou modifiée", u[4] == null ? null : entier(u[4]),
                    LocalDateTime.now(), exp, null);
            restitutions++;
        }
        /* 3. expiration des points restants (gains, ajustements positifs et restitutions) */
        for (Object[] g : (List<Object[]>) em.createNativeQuery("SELECT lg_MOUVEMENT_ID, lg_CLIENT_ID, int_RESTANTS,"
                + " lg_PREENREGISTREMENT_ID, str_REFERENCE, dt_EXPIRATION FROM t_fidelite_mouvement"
                + " WHERE str_TYPE IN ('GAIN', 'AJUSTEMENT', 'RESTITUTION') AND int_RESTANTS > 0"
                + " AND dt_EXPIRATION < CURDATE()").getResultList()) {
            LocalDate fin = jour(g[5]);
            inserer(texte(g[1]), EXPIRATION, -entier(g[2]), 0, null, null, texte(g[3]),
                    StringUtils.defaultIfBlank(texte(g[4]), texte(g[0])), "Points expirés", null,
                    fin == null ? LocalDateTime.now() : fin.atStartOfDay(), null, null);
            em.createNativeQuery("UPDATE t_fidelite_mouvement SET int_RESTANTS = 0 WHERE lg_MOUVEMENT_ID = ?1")
                    .setParameter(1, texte(g[0])).executeUpdate();
            expirations++;
        }
        em.createNativeQuery("UPDATE t_fidelite_parametre SET dt_SYNCHRO = NOW() WHERE lg_PARAMETRE_ID = ?1")
                .setParameter(1, ID).executeUpdate();
        return r.put("actif", true).put("gains", gains).put("annulations", annulations)
                .put("restitutions", restitutions).put("expirations", expirations).put("suite", ventes.size() >= LOT);
    }

    // ------------------------------------------------------------------ consultation

    private long solde(String client) {
        return grand(em
                .createNativeQuery(
                        "SELECT COALESCE(SUM(int_POINTS), 0) FROM t_fidelite_mouvement" + " WHERE lg_CLIENT_ID = ?1")
                .setParameter(1, client).getSingleResult());
    }

    /**
     * Clients et leurs points ; recherche par nom, prenom, telephone ; sans recherche, les clients ayant des points.
     */
    @SuppressWarnings("unchecked")
    public JSONObject clients(String recherche, int start, int limit) {
        return clients(recherche, start, limit, 200);
    }

    /** Retours du 10/10 : tous les clients de la recherche pour les editions (5 000 au plus). */
    public JSONObject clientsEdition(String recherche) {
        return clients(recherche, 0, 5000, 5000);
    }

    @SuppressWarnings("unchecked")
    private JSONObject clients(String recherche, int start, int limit, int plafond) {
        Parametres p = parametres(false);
        List<Palier> paliers = paliers();
        String r = StringUtils.trimToEmpty(recherche);
        String filtre = r.isEmpty()
                ? " AND EXISTS (SELECT 1 FROM t_fidelite_mouvement e WHERE e.lg_CLIENT_ID = c.lg_CLIENT_ID)"
                : " AND (CONCAT_WS(' ', c.str_FIRST_NAME, c.str_LAST_NAME) LIKE ?1"
                        + " OR CONCAT_WS(' ', c.str_LAST_NAME, c.str_FIRST_NAME) LIKE ?1 OR c.str_TELEPHONE LIKE ?1"
                        + " OR c.str_CODE_INTERNE LIKE ?1)";
        String de = " FROM t_client c WHERE COALESCE(c.str_STATUT, 'enable') = 'enable'" + filtre;
        Query qn = em.createNativeQuery("SELECT COUNT(*)" + de);
        Query q = em.createNativeQuery("SELECT c.lg_CLIENT_ID, CONCAT_WS(' ', c.str_FIRST_NAME, c.str_LAST_NAME),"
                + " c.str_TELEPHONE,"
                + " (SELECT COALESCE(SUM(m.int_POINTS), 0) FROM t_fidelite_mouvement m WHERE m.lg_CLIENT_ID = c.lg_CLIENT_ID) solde,"
                + " (SELECT COALESCE(SUM(m.int_POINTS), 0) FROM t_fidelite_mouvement m WHERE m.lg_CLIENT_ID = c.lg_CLIENT_ID"
                + "   AND m.str_TYPE IN ('GAIN', 'ANNULATION') AND m.dt_MOUVEMENT >= NOW() - INTERVAL 12 MONTH),"
                + " (SELECT COALESCE(SUM(m.int_RESTANTS), 0) FROM t_fidelite_mouvement m WHERE m.lg_CLIENT_ID = c.lg_CLIENT_ID"
                + "   AND m.int_RESTANTS > 0 AND m.dt_EXPIRATION <= CURDATE() + INTERVAL 30 DAY),"
                + " (SELECT MAX(m.dt_MOUVEMENT) FROM t_fidelite_mouvement m WHERE m.lg_CLIENT_ID = c.lg_CLIENT_ID)" + de
                + " ORDER BY solde DESC, 2");
        if (!r.isEmpty()) {
            String motif = "%" + r.replace("\\", "").replace("%", "").replace("_", "") + "%";
            qn.setParameter(1, motif);
            q.setParameter(1, motif);
        }
        long total = grand(qn.getSingleResult());
        JSONArray data = new JSONArray();
        for (Object[] x : (List<Object[]>) q.setFirstResult(Math.max(0, start))
                .setMaxResults(Math.min(Math.max(1, limit), plafond)).getResultList()) {
            long solde = grand(x[3]), acquis = grand(x[4]);
            Palier pal = FideliteCalcul.palier(paliers, acquis), suivant = FideliteCalcul.prochain(paliers, acquis);
            LocalDateTime der = instant(x[6]);
            data.put(new JSONObject().put("id", texte(x[0])).put("nom", StringUtils.defaultString(texte(x[1])).trim())
                    .put("telephone", StringUtils.defaultString(texte(x[2]))).put("solde", solde)
                    .put("valeur", FideliteCalcul.valeur(solde, p.valeurPoint)).put("acquis12Mois", acquis)
                    .put("palier", pal == null ? "" : pal.libelle)
                    .put("prochainPalier", suivant == null ? "" : suivant.libelle)
                    .put("manque", suivant == null ? 0 : suivant.seuil - acquis).put("expireBientot", grand(x[5]))
                    .put("utilisable", p.actif && solde > 0 && solde >= p.seuil)
                    .put("derniereOperation", der == null ? "" : der.format(JJ_MM_AAAA_HH)));
        }
        return new JSONObject().put("success", true).put("data", data).put("total", total).put("actif", p.actif)
                .put("valeurPoint", p.valeurPoint).put("seuil", p.seuil).put("synchro", p.synchro);
    }

    /** Historique des points d'un client (les plus recents d'abord ; ventes sans point masquees). */
    @SuppressWarnings("unchecked")
    public JSONObject historique(String client) {
        JSONArray data = new JSONArray();
        for (Object[] x : (List<Object[]>) em
                .createNativeQuery("SELECT m.str_TYPE, m.int_POINTS, m.int_RESTANTS,"
                        + " m.int_BASE, m.dbl_COEFFICIENT, m.str_REFERENCE, m.str_MOTIF, m.int_VALEUR, m.dt_MOUVEMENT,"
                        + " m.dt_EXPIRATION, CONCAT_WS(' ', u.str_FIRST_NAME, u.str_LAST_NAME)"
                        + " FROM t_fidelite_mouvement m LEFT JOIN t_user u ON u.lg_USER_ID = m.lg_USER_ID"
                        + " WHERE m.lg_CLIENT_ID = ?1 AND NOT (m.str_TYPE = 'GAIN' AND m.int_POINTS = 0)"
                        + " ORDER BY m.dt_MOUVEMENT DESC, m.dt_CREATED DESC")
                .setParameter(1, client).setMaxResults(500).getResultList()) {
            LocalDateTime d = instant(x[8]);
            LocalDate e = jour(x[9]);
            data.put(new JSONObject().put("type", texte(x[0])).put("points", entier(x[1])).put("restants", entier(x[2]))
                    .put("base", x[3] == null ? JSONObject.NULL : grand(x[3]))
                    .put("coefficient", x[4] == null ? JSONObject.NULL : ((Number) x[4]).doubleValue())
                    .put("reference", StringUtils.defaultString(texte(x[5])))
                    .put("motif", StringUtils.defaultString(texte(x[6])))
                    .put("valeur", x[7] == null ? JSONObject.NULL : grand(x[7]))
                    .put("date", d == null ? "" : d.format(JJ_MM_AAAA_HH))
                    .put("expiration", e == null ? "" : e.format(JJ_MM_AAAA))
                    .put("par", StringUtils.defaultString(texte(x[10])).trim()));
        }
        return new JSONObject().put("success", true).put("data", data).put("total", data.length()).put("solde",
                solde(client));
    }

    // ------------------------------------------------------------------ utilisation et ajustement

    @SuppressWarnings("unchecked")
    private List<Reste> credits(String client) {
        List<Reste> l = new ArrayList<>();
        for (Object[] x : (List<Object[]>) em.createNativeQuery("SELECT lg_MOUVEMENT_ID, int_RESTANTS"
                + " FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = ?1 AND int_RESTANTS > 0"
                + " ORDER BY dt_MOUVEMENT, dt_CREATED FOR UPDATE").setParameter(1, client).getResultList()) {
            l.add(new Reste(texte(x[0]), entier(x[1])));
        }
        return l;
    }

    private void retirer(String client, int points) {
        for (Reste r : FideliteCalcul.consommer(credits(client), points)) {
            em.createNativeQuery(
                    "UPDATE t_fidelite_mouvement SET int_RESTANTS = int_RESTANTS - ?1" + " WHERE lg_MOUVEMENT_ID = ?2")
                    .setParameter(1, r.restants).setParameter(2, r.id).executeUpdate();
        }
    }

    private boolean clientExiste(String client) {
        return !em.createNativeQuery("SELECT 1 FROM t_client WHERE lg_CLIENT_ID = ?1").setParameter(1, client)
                .getResultList().isEmpty();
    }

    /** Points d'un client et ce qu'ils valent. */
    public JSONObject compte(String client) {
        Parametres p = parametres(false);
        long s = solde(client);
        return new JSONObject().put("success", true).put("solde", s)
                .put("valeur", FideliteCalcul.valeur(s, p.valeurPoint)).put("seuil", p.seuil)
                .put("utilisable", p.actif && s > 0 && s >= p.seuil);
    }

    /** Utilisation de points (bon d'achat, remise accordee...) : points les plus anciens d'abord. */
    public JSONObject utiliser(String client, int points, String reference, String userId) {
        Parametres p = parametres(true);
        if (!p.actif) {
            return echec("La fidélité n'est pas activée.");
        }
        if (!clientExiste(client)) {
            return echec("Client introuvable.");
        }
        if (points <= 0) {
            return echec("Nombre de points à utiliser : plus de 0.");
        }
        long s = solde(client);
        if (s < p.seuil) {
            return echec("Le client a " + s + " point(s) : il en faut " + p.seuil + " pour les utiliser.");
        }
        if (points > s) {
            return echec("Le client n'a que " + s + " point(s).");
        }
        String ref = StringUtils.trimToNull(reference);
        if (ref != null && !ref.matches("[\\p{L}0-9 ./#_-]{1,60}")) {
            return echec("Référence : 60 caractères au plus (lettres, chiffres, - / . #).");
        }
        retirer(client, points);
        long valeur = FideliteCalcul.valeur(points, p.valeurPoint);
        inserer(client, UTILISATION, -points, 0, null, null, null, ref, "Utilisation de points", (int) valeur,
                LocalDateTime.now(), null, userId);
        return compte(client).put("msg", points + " point(s) utilisé(s), soit " + valeur + " FCFA.")
                .put("valeurUtilisee", valeur);
    }

    /** Refus du paiement en points : la vente n'est pas enregistree (transaction annulee). */
    @javax.ejb.ApplicationException(rollback = true)
    public static class PaiementPointsRefuse extends RuntimeException {

        private static final long serialVersionUID = 1L;

        public PaiementPointsRefuse(String message) {
            super(message);
        }
    }

    /** Points necessaires pour payer ce montant (arrondi au point superieur). */
    static int pointsPour(long montant, int valeurPoint) {
        return valeurPoint <= 0 ? 0 : (int) ((montant + valeurPoint - 1) / valeurPoint);
    }

    /**
     * Ce que le client peut payer avec ses points a la caisse (ecran de vente) : apres mise a jour du registre.
     */
    public JSONObject pourPaiement(String client) {
        synchroniser();
        Parametres p = parametres(false);
        long s = client == null ? 0 : solde(client);
        boolean utilisable = p.actif && p.valeurPoint > 0 && s > 0 && s >= p.seuil;
        return new JSONObject().put("success", true).put("actif", p.actif).put("solde", s)
                .put("valeurPoint", p.valeurPoint).put("seuil", p.seuil).put("utilisable", utilisable)
                .put("montantMax", utilisable ? FideliteCalcul.valeur(s, p.valeurPoint) : 0)
                .put("msg", !p.actif ? "La fidélité n'est pas activée." : s < Math.max(1, p.seuil) ? "Le client a " + s
                        + " point(s) : il en faut " + Math.max(1, p.seuil) + " pour payer avec ses points." : "");
    }

    /**
     * Paiement d'une vente avec des points (mode de reglement « Points fidelite ») : appele dans la transaction de la
     * cloture ; refus = exception, la vente n'est pas enregistree. Rend les points utilises.
     */
    public int payerVente(String client, String venteId, String reference, long montant, String userId) {
        if (montant <= 0) {
            return 0;
        }
        Parametres p = parametres(true);
        if (!p.actif || p.valeurPoint <= 0) {
            throw new PaiementPointsRefuse("Paiement en points impossible : la fidélité n'est pas activée.");
        }
        if (client == null || !clientExiste(client)) {
            throw new PaiementPointsRefuse("Paiement en points : choisissez d'abord le client de la vente.");
        }
        long s = solde(client);
        int points = pointsPour(montant, p.valeurPoint);
        if (s < Math.max(1, p.seuil)) {
            throw new PaiementPointsRefuse("Paiement en points refusé : le client a " + s + " point(s), il en faut "
                    + Math.max(1, p.seuil) + " pour les utiliser.");
        }
        if (points > s) {
            throw new PaiementPointsRefuse("Paiement en points refusé : " + montant + " FCFA demandent " + points
                    + " point(s), le client n'en a que " + s + " (" + FideliteCalcul.valeur(s, p.valeurPoint)
                    + " FCFA).");
        }
        List<?> deja = em.createNativeQuery("SELECT 1 FROM t_fidelite_mouvement WHERE lg_PREENREGISTREMENT_ID = ?1"
                + " AND str_TYPE = 'UTILISATION'").setParameter(1, venteId).getResultList();
        if (!deja.isEmpty()) {
            throw new PaiementPointsRefuse("Cette vente a déjà été payée en points.");
        }
        retirer(client, points);
        inserer(client, UTILISATION, -points, 0, null, null, venteId, reference, "Paiement de la vente en points",
                (int) montant, LocalDateTime.now(), null, userId);
        return points;
    }

    /** Ajustement manuel (geste commercial, correction) : motif obligatoire. */
    public JSONObject ajuster(String client, int points, String motif, String userId) {
        Parametres p = parametres(true);
        if (!clientExiste(client)) {
            return echec("Client introuvable.");
        }
        String m = StringUtils.trimToEmpty(motif);
        if (m.length() < 3 || m.length() > 150) {
            return echec("Motif de l'ajustement : 3 à 150 caractères.");
        }
        if (points == 0 || Math.abs(points) > 1_000_000) {
            return echec("Points de l'ajustement : non nul, 1 000 000 au plus.");
        }
        if (points < 0) {
            long s = solde(client);
            if (-points > s) {
                return echec("Le client n'a que " + s + " point(s) : retrait impossible.");
            }
            retirer(client, -points);
        }
        LocalDate exp = points > 0 && p.expirationMois > 0 ? LocalDate.now().plusMonths(p.expirationMois) : null;
        inserer(client, AJUSTEMENT, points, Math.max(0, points), null, null, null, null, m, null, LocalDateTime.now(),
                exp, userId);
        return compte(client).put("msg", "Ajustement enregistré.");
    }

    /** Synthese : clients avec des points, total des points et leur valeur, points expirant sous 30 jours. */
    public JSONObject synthese() {
        Parametres p = parametres(false);
        Object[] r = (Object[]) em.createNativeQuery("SELECT COUNT(*), COALESCE(SUM(s), 0) FROM (SELECT lg_CLIENT_ID,"
                + " SUM(int_POINTS) s FROM t_fidelite_mouvement GROUP BY lg_CLIENT_ID HAVING SUM(int_POINTS) > 0) x")
                .getSingleResult();
        long exp = grand(em
                .createNativeQuery("SELECT COALESCE(SUM(int_RESTANTS), 0) FROM t_fidelite_mouvement"
                        + " WHERE int_RESTANTS > 0 AND dt_EXPIRATION <= CURDATE() + INTERVAL 30 DAY")
                .getSingleResult());
        long points = grand(r[1]);
        Map<String, Object> m = new HashMap<>();
        m.put("clients", grand(r[0]));
        m.put("points", points);
        m.put("valeur", FideliteCalcul.valeur(points, p.valeurPoint));
        m.put("expirent30j", exp);
        return new JSONObject(m).put("success", true).put("actif", p.actif).put("synchro", p.synchro);
    }

    /** Nom de l'officine (en-tete des editions). */
    @SuppressWarnings("unchecked")
    public String nomOfficine() {
        List<Object> r = em.createNativeQuery("SELECT str_NOM_COMPLET FROM t_officine LIMIT 1").getResultList();
        return r.isEmpty() || r.get(0) == null ? "" : String.valueOf(r.get(0));
    }

    public int valeurPoint() {
        return parametres(false).valeurPoint;
    }

    /**
     * Retours du 10/10 (section 15) : analyse des points de la periode (date de l'operation) — gagnes, utilises,
     * expires par mois, clients actifs, repartition par palier, taux d'utilisation, cout des points, meilleurs clients.
     */
    @SuppressWarnings("unchecked")
    public JSONObject analyse(LocalDate du, LocalDate au, int nbMeilleurs) {
        Parametres p = parametres(false);
        List<Palier> paliers = paliers();
        rest.service.impl.fidelite.AnalyseFidelite a = new rest.service.impl.fidelite.AnalyseFidelite();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT DATE_FORMAT(dt_MOUVEMENT, '%Y-%m'), lg_CLIENT_ID,"
                        + " str_TYPE, SUM(int_POINTS), SUM(COALESCE(int_VALEUR, 0)) FROM t_fidelite_mouvement"
                        + " WHERE dt_MOUVEMENT >= ?1 AND dt_MOUVEMENT < ?2 GROUP BY 1, 2, 3")
                .setParameter(1, Timestamp.valueOf(du.atStartOfDay()))
                .setParameter(2, Timestamp.valueOf(au.plusDays(1).atStartOfDay())).getResultList()) {
            a.ajouter(texte(r[0]), texte(r[1]), texte(r[2]), grand(r[3]), grand(r[4]));
        }
        List<String> ids = a.clientsActifs();
        for (int i = 0; i < ids.size(); i += 500) {
            List<String> lot = ids.subList(i, Math.min(ids.size(), i + 500));
            for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT c.lg_CLIENT_ID,"
                    + " CONCAT_WS(' ', c.str_FIRST_NAME, c.str_LAST_NAME),"
                    + " (SELECT COALESCE(SUM(m.int_POINTS), 0) FROM t_fidelite_mouvement m WHERE m.lg_CLIENT_ID = c.lg_CLIENT_ID),"
                    + " (SELECT COALESCE(SUM(m.int_POINTS), 0) FROM t_fidelite_mouvement m WHERE m.lg_CLIENT_ID = c.lg_CLIENT_ID"
                    + "   AND m.str_TYPE IN ('GAIN', 'ANNULATION') AND m.dt_MOUVEMENT >= NOW() - INTERVAL 12 MONTH)"
                    + " FROM t_client c WHERE c.lg_CLIENT_ID IN (?1)").setParameter(1, lot).getResultList()) {
                Palier pal = FideliteCalcul.palier(paliers, grand(r[3]));
                a.decrire(texte(r[0]), texte(r[1]), grand(r[2]), pal == null ? "" : pal.libelle);
            }
        }
        List<String> ordre = new ArrayList<>();
        paliers.forEach(x -> ordre.add(x.libelle));
        return a.json(nbMeilleurs, ordre).put("success", true).put("debut", du.toString()).put("fin", au.toString())
                .put("valeurPoint", p.valeurPoint);
    }

    /** Nom du client (titre des editions). */
    @SuppressWarnings("unchecked")
    public String nomClient(String client) {
        List<Object> r = em.createNativeQuery(
                "SELECT CONCAT_WS(' ', str_FIRST_NAME, str_LAST_NAME) FROM t_client" + " WHERE lg_CLIENT_ID = ?1")
                .setParameter(1, client).getResultList();
        return r.isEmpty() || r.get(0) == null ? "" : String.valueOf(r.get(0)).trim();
    }
}
