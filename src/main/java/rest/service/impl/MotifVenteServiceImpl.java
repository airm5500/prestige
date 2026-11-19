package rest.service.impl;

import dal.TUser;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.MotifVenteService;

/**
 * Plan du 08/11, point 18 : motifs d'annulation et de modification de vente. Le texte libre (« Autre ») est garde en
 * base pour le recapitulatif, jamais journalise.
 */
@Stateless
public class MotifVenteServiceImpl implements MotifVenteService {

    private static final Logger LOG = Logger.getLogger(MotifVenteServiceImpl.class.getName());
    static final int COMMENTAIRE_MAX = 255;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Colonne tinyint(1) : le pilote MariaDB la rend en Boolean, d'autres en Number. */
    static boolean vrai(Object o) {
        if (o instanceof Boolean) {
            return (Boolean) o;
        }
        return o instanceof Number && ((Number) o).intValue() == 1;
    }

    @Override
    public JSONArray motifs() {
        JSONArray a = new JSONArray();
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery("SELECT id, libelle, texte_libre FROM t_motif_vente_annulation"
                + " WHERE statut = 'enable' ORDER BY priorite, libelle").getResultList();
        l.forEach(x -> a.put(new JSONObject().put("id", x[0]).put("libelle", x[1]).put("texteLibre", vrai(x[2]))));
        return a;
    }

    /** Le motif a utiliser, ou null : [libelle, texteLibre]. */
    private Object[] motif(String motifId) {
        if (StringUtils.isBlank(motifId)) {
            return null;
        }
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery(
                "SELECT libelle, texte_libre FROM t_motif_vente_annulation" + " WHERE id = ?1 AND statut = 'enable'")
                .setParameter(1, motifId).getResultList();
        return l.isEmpty() ? null : l.get(0);
    }

    @Override
    public String refus(String motifId, String commentaire) {
        Object[] m = motif(motifId);
        return refus(m != null, m != null && vrai(m[1]), commentaire);
    }

    /** Regle du motif : obligatoire et connu ; « Autre » demande un texte. */
    static String refus(boolean motifConnu, boolean texteLibre, String commentaire) {
        if (!motifConnu) {
            return "Choisissez un motif.";
        }
        if (texteLibre && StringUtils.isBlank(commentaire)) {
            return "Précisez le motif (« Autre »).";
        }
        return null;
    }

    /** Texte libre garde : sans espaces autour, 255 caracteres au plus, null s'il est vide. */
    static String commentaire(String c) {
        String t = StringUtils.trimToNull(c);
        return t == null ? null : StringUtils.left(t, COMMENTAIRE_MAX);
    }

    @Override
    public JSONObject origine(String venteId) {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em
                .createNativeQuery("SELECT p.lg_PREENREGISTREMENT_ID, p.str_REF, COALESCE(p.int_PRICE, 0),"
                        + " p.lg_USER_VENDEUR_ID, p.lg_USER_CAISSIER_ID, p.dt_UPDATED, p.lg_USER_ID"
                        + " FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = ?1")
                .setParameter(1, venteId).getResultList();
        if (l.isEmpty()) {
            return null;
        }
        Object[] x = l.get(0);
        /* vendeur absent (anciennes ventes) : l'auteur est celui qui a saisi la vente */
        String vendeur = x[3] != null ? (String) x[3] : (String) x[6];
        return new JSONObject().put("venteId", x[0]).put("ref", x[1] == null ? "" : x[1])
                .put("montant", ((Number) x[2]).intValue()).put("vendeurId", vendeur == null ? "" : vendeur)
                .put("caissierId", x[4] == null ? "" : x[4])
                .put("dateVente", x[5] == null ? 0L : ((Date) x[5]).getTime());
    }

    private void inserer(String type, String statut, JSONObject o, String motifId, String commentaire,
            TUser operateur) {
        Object[] m = motif(motifId);
        em.createNativeQuery("INSERT INTO vente_motif (id, type_operation, statut, vente_id, vente_ref, motif_id,"
                + " motif_libelle, commentaire, montant, vendeur_id, caissier_id, operateur_id, date_vente, created_at)"
                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, NOW())")
                .setParameter(1, UUID.randomUUID().toString()).setParameter(2, type).setParameter(3, statut)
                .setParameter(4, o.getString("venteId")).setParameter(5, o.optString("ref")).setParameter(6, motifId)
                .setParameter(7, m == null ? motifId : (String) m[0]).setParameter(8, commentaire(commentaire))
                .setParameter(9, o.optInt("montant")).setParameter(10, StringUtils.trimToNull(o.optString("vendeurId")))
                .setParameter(11, StringUtils.trimToNull(o.optString("caissierId")))
                .setParameter(12, operateur.getLgUSERID())
                .setParameter(13, o.optLong("dateVente") > 0 ? new Date(o.optLong("dateVente")) : null).executeUpdate();
    }

    @Override
    public void enregistrerAnnulation(JSONObject origine, String motifId, String commentaire, TUser operateur) {
        if (origine == null || operateur == null) {
            return;
        }
        /* une modification ouverte puis abandonnee sans « Retour » ne compte plus : la vente est annulee */
        abandonnerModification(origine.getString("venteId"));
        inserer(ANNULATION, VALIDEE, origine, motifId, commentaire, operateur);
    }

    @Override
    public JSONObject ouvrirModification(String venteId, String motifId, String commentaire, TUser operateur) {
        String r = refus(motifId, commentaire);
        if (r != null) {
            return new JSONObject().put("success", false).put("msg", r);
        }
        JSONObject o = origine(venteId);
        if (o == null) {
            return new JSONObject().put("success", false).put("msg", "Vente introuvable.");
        }
        abandonnerModification(venteId);
        inserer(MODIFICATION, EN_COURS, o, motifId, commentaire, operateur);
        return new JSONObject().put("success", true);
    }

    @Override
    public void validerModification(String venteOrigineId, String nouvelleVenteId) {
        try {
            em.createNativeQuery("UPDATE vente_motif SET statut = ?1, nouvelle_vente_id = ?2, updated_at = NOW()"
                    + " WHERE vente_id = ?3 AND type_operation = ?4 AND statut = ?5").setParameter(1, VALIDEE)
                    .setParameter(2, nouvelleVenteId).setParameter(3, venteOrigineId).setParameter(4, MODIFICATION)
                    .setParameter(5, EN_COURS).executeUpdate();
        } catch (Exception e) {
            /* le motif ne doit jamais faire echouer la vente */
            LOG.log(Level.SEVERE, "validerModification " + venteOrigineId, e);
        }
    }

    @Override
    public void abandonnerModification(String venteOrigineId) {
        try {
            em.createNativeQuery("DELETE FROM vente_motif WHERE vente_id = ?1 AND type_operation = ?2 AND statut = ?3")
                    .setParameter(1, venteOrigineId).setParameter(2, MODIFICATION).setParameter(3, EN_COURS)
                    .executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "abandonnerModification " + venteOrigineId, e);
        }
    }

    /** Une ligne du recapitulatif. */
    static final class Ligne {
        final String type, motif, auteurId, auteur, operateur, ref, commentaire, date;
        final int montant;
        /* plan du 14/11, point 10 : caissier(e) de la vente d'origine */
        final String caissierId, caissier;

        Ligne(String type, String motif, String auteurId, String auteur, String operateur, String ref,
                String commentaire, String date, int montant) {
            this(type, motif, auteurId, auteur, operateur, ref, commentaire, date, montant, "", INCONNU);
        }

        Ligne(String type, String motif, String auteurId, String auteur, String operateur, String ref,
                String commentaire, String date, int montant, String caissierId, String caissier) {
            this.caissierId = caissierId == null ? "" : caissierId;
            this.caissier = caissier == null || caissier.trim().isEmpty() ? INCONNU : caissier;
            this.type = type;
            this.motif = motif;
            this.auteurId = auteurId;
            this.auteur = auteur;
            this.operateur = operateur;
            this.ref = ref;
            this.commentaire = commentaire;
            this.date = date;
            this.montant = montant;
        }
    }

    static final String INCONNU = "Inconnu";

    /** Ordre d'un bloc : le plus d'operations d'abord, a egalite par libelle (ordre stable d'un appel a l'autre). */
    private static java.util.Comparator<Map.Entry<String, int[]>> ordre(Map<String, String> libelles) {
        return (x, y) -> {
            int c = (y.getValue()[0] + y.getValue()[1]) - (x.getValue()[0] + x.getValue()[1]);
            return c != 0 ? c : String.valueOf(libelles.getOrDefault(x.getKey(), x.getKey()))
                    .compareTo(String.valueOf(libelles.getOrDefault(y.getKey(), y.getKey())));
        };
    }

    /**
     * Agregation : par motif, par auteur de la vente d'origine, par caissier(e) de la vente d'origine (le plus
     * d'operations d'abord), totaux.
     */
    static JSONObject agreger(List<Ligne> lignes) {
        Map<String, int[]> parMotif = new LinkedHashMap<>();
        Map<String, int[]> parAuteur = new LinkedHashMap<>();
        Map<String, int[]> parCaissier = new LinkedHashMap<>();
        Map<String, String> noms = new LinkedHashMap<>();
        Map<String, String> caissiers = new LinkedHashMap<>();
        int annulations = 0, modifications = 0, montant = 0;
        JSONArray detail = new JSONArray();
        for (Ligne l : lignes) {
            boolean annulation = ANNULATION.equals(l.type);
            int[] m = parMotif.computeIfAbsent(l.motif, k -> new int[3]);
            int[] a = parAuteur.computeIfAbsent(l.auteurId, k -> new int[3]);
            int[] c = parCaissier.computeIfAbsent(l.caissierId, k -> new int[3]);
            noms.put(l.auteurId, l.auteur);
            caissiers.put(l.caissierId, l.caissier);
            for (int[] t : new int[][] { m, a, c }) {
                t[annulation ? 0 : 1]++;
                t[2] += l.montant;
            }
            annulations += annulation ? 1 : 0;
            modifications += annulation ? 0 : 1;
            montant += l.montant;
            detail.put(new JSONObject().put("date", l.date).put("type", annulation ? "Annulation" : "Modification")
                    .put("ref", l.ref).put("montant", l.montant).put("motif", l.motif)
                    .put("commentaire", l.commentaire == null ? "" : l.commentaire).put("auteur", l.auteur)
                    .put("operateur", l.operateur).put("caissier", l.caissier));
        }
        JSONArray motifs = new JSONArray();
        parMotif.entrySet().stream().sorted(ordre(java.util.Collections.emptyMap()))
                .forEach(e -> motifs.put(new JSONObject().put("motif", e.getKey()).put("annulations", e.getValue()[0])
                        .put("modifications", e.getValue()[1]).put("nb", e.getValue()[0] + e.getValue()[1])
                        .put("montant", e.getValue()[2])));
        JSONArray auteurs = new JSONArray();
        parAuteur.entrySet().stream().sorted(ordre(noms)).forEach(
                e -> auteurs.put(new JSONObject().put("auteurId", e.getKey()).put("auteur", noms.get(e.getKey()))
                        .put("annulations", e.getValue()[0]).put("modifications", e.getValue()[1])
                        .put("nb", e.getValue()[0] + e.getValue()[1]).put("montant", e.getValue()[2])));
        JSONArray caisse = new JSONArray();
        parCaissier.entrySet().stream().sorted(ordre(caissiers))
                .forEach(e -> caisse
                        .put(new JSONObject().put("caissierId", e.getKey()).put("caissier", caissiers.get(e.getKey()))
                                .put("annulations", e.getValue()[0]).put("modifications", e.getValue()[1])
                                .put("nb", e.getValue()[0] + e.getValue()[1]).put("montant", e.getValue()[2])));
        return new JSONObject().put("success", true).put("parMotif", motifs).put("parAuteur", auteurs)
                .put("parCaissier", caisse).put("detail", detail)
                .put("total", new JSONObject().put("annulations", annulations).put("modifications", modifications)
                        .put("nb", annulations + modifications).put("montant", montant));
    }

    /**
     * Retour du 15/11 : « quelle caissiere occasionne le plus d'annulations ». Classement des caissieres (celle qui a
     * encaisse la vente d'origine) par nombre d'annulations, rapporte aux ventes qu'elles ont encaissees sur la periode
     * (meme definition que l'Activite des equipes : ventes cloturees au comptant et a credit, hors ventes remplacees
     * par une modification).
     * <ul>
     * <li>une ligne par caissiere ayant au moins une annulation ; les modifications ne comptent pas ;</li>
     * <li>taux = annulations / ventes encaissees, au dixieme ; absent (null) sans vente encaissee ;</li>
     * <li>ordre : annulations, puis taux, puis montant annule (decroissants), puis nom ; rang partage a egalite
     * d'annulations (1, 2, 2, 4).</li>
     * </ul>
     */
    static JSONArray classementAnnulations(List<Ligne> lignes, Map<String, Long> ventes) {
        Map<String, long[]> parCaissier = new LinkedHashMap<>();
        Map<String, String> noms = new LinkedHashMap<>();
        for (Ligne l : lignes) {
            if (!ANNULATION.equals(l.type)) {
                continue;
            }
            long[] c = parCaissier.computeIfAbsent(l.caissierId, k -> new long[2]);
            c[0]++;
            c[1] += l.montant;
            noms.put(l.caissierId, l.caissier);
        }
        List<JSONObject> l = new ArrayList<>();
        parCaissier.forEach((id, c) -> {
            long v = ventes == null || id.isEmpty() ? 0 : Math.max(0, ventes.getOrDefault(id, 0L));
            JSONObject o = new JSONObject().put("caissierId", id).put("caissier", noms.get(id)).put("annulations", c[0])
                    .put("montant", c[1]).put("ventes", v);
            if (v > 0) {
                o.put("taux", Math.round(1000.0 * c[0] / v) / 10.0);
            }
            l.add(o);
        });
        l.sort((x, y) -> {
            int r = Long.compare(y.getLong("annulations"), x.getLong("annulations"));
            if (r == 0) {
                r = Double.compare(y.optDouble("taux", -1), x.optDouble("taux", -1));
            }
            if (r == 0) {
                r = Long.compare(y.getLong("montant"), x.getLong("montant"));
            }
            return r != 0 ? r : x.getString("caissier").compareTo(y.getString("caissier"));
        });
        JSONArray t = new JSONArray();
        for (int i = 0; i < l.size(); i++) {
            JSONObject o = l.get(i);
            boolean exAequo = i > 0 && l.get(i - 1).getLong("annulations") == o.getLong("annulations");
            o.put("rang", exAequo ? t.getJSONObject(i - 1).getInt("rang") : i + 1);
            t.put(o);
        }
        return t;
    }

    /** Ventes encaissees par caissiere sur [debut, fin] (denominateur du taux, comme l'Activite des equipes). */
    private Map<String, Long> ventesEncaissees(LocalDate debut, LocalDate fin) {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery(requeteVentesEncaissees(debut, fin))
                .setParameter(1, java.sql.Date.valueOf(debut)).setParameter(2, java.sql.Date.valueOf(fin.plusDays(1)))
                .getResultList();
        Map<String, Long> m = new LinkedHashMap<>();
        l.forEach(x -> m.put(String.valueOf(x[0]), ((Number) x[1]).longValue()));
        return m;
    }

    private static final String VENTES_ENCAISSEES_FILTRE = " p.str_STATUT = 'is_Closed' AND p.int_PRICE > 0"
            + " AND p.lg_TYPE_VENTE_ID IN ('1', '2', '3') AND p.lg_USER_CAISSIER_ID IS NOT NULL AND NOT EXISTS"
            + " (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID)";

    /**
     * Au-dela de cette duree, la lecture complete de la table est plus rapide que les deux branches indexees (mesure
     * sur la copie d'appaul, 2,1 millions de ventes : 3 mois 0,6 s contre 3,8 ; 6 mois 0,85 s contre 3,7 ; 9 mois 3,9 s
     * contre 3,8).
     */
    static final int JOURS_DEUX_BRANCHES = 186;

    /**
     * Retour support du 18/11 (R8) : l'analyse par motif d'UN jour prenait 3 a 5 s, car la periode portait sur
     * COALESCE(completion_date, dt_UPDATED), qu'aucun index ne sert (985 000 lignes lues). La meme periode s'ecrit en
     * deux branches disjointes, chacune sur sa colonne indexee : date d'encaissement dans la periode, ou pas de date
     * d'encaissement et date de mise a jour dans la periode. Memes ventes, memes comptes ; 0,13 s pour un jour. Au-dela
     * de {@link #JOURS_DEUX_BRANCHES} jours, la requete d'origine, plus rapide sur une longue periode.
     */
    static String requeteVentesEncaissees(LocalDate debut, LocalDate fin) {
        if (ChronoUnit.DAYS.between(debut, fin) + 1 > JOURS_DEUX_BRANCHES) {
            return "SELECT p.lg_USER_CAISSIER_ID, COUNT(*) FROM t_preenregistrement p WHERE" + VENTES_ENCAISSEES_FILTRE
                    + " AND COALESCE(p.completion_date, p.dt_UPDATED) >= ?1"
                    + " AND COALESCE(p.completion_date, p.dt_UPDATED) < ?2 GROUP BY p.lg_USER_CAISSIER_ID";
        }
        return "SELECT x.c, SUM(x.n) FROM (SELECT p.lg_USER_CAISSIER_ID AS c, COUNT(*) AS n FROM t_preenregistrement p"
                + " WHERE" + VENTES_ENCAISSEES_FILTRE + " AND p.completion_date >= ?1 AND p.completion_date < ?2"
                + " GROUP BY p.lg_USER_CAISSIER_ID UNION ALL SELECT p.lg_USER_CAISSIER_ID, COUNT(*) FROM"
                + " t_preenregistrement p WHERE" + VENTES_ENCAISSEES_FILTRE + " AND p.completion_date IS NULL"
                + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2 GROUP BY p.lg_USER_CAISSIER_ID) x GROUP BY x.c";
    }

    @Override
    public JSONObject recap(String dtStart, String dtEnd, String type, String vendeurId) {
        LocalDate debut = date(dtStart, LocalDate.now()), fin = date(dtEnd, debut);
        String t = ANNULATION.equals(type) || MODIFICATION.equals(type) ? type : "";
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery("SELECT m.type_operation, m.motif_libelle, COALESCE(m.vendeur_id, ''),"
                + " COALESCE(CONCAT_WS(' ', a.str_FIRST_NAME, a.str_LAST_NAME), 'Inconnu'),"
                + " COALESCE(CONCAT_WS(' ', o.str_FIRST_NAME, o.str_LAST_NAME), ''), COALESCE(m.vente_ref, ''),"
                + " m.commentaire, DATE_FORMAT(m.created_at, '%d/%m/%Y %H:%i'), m.montant, COALESCE(m.caissier_id, ''),"
                + " COALESCE(CONCAT_WS(' ', c.str_FIRST_NAME, c.str_LAST_NAME), '')"
                + " FROM vente_motif m LEFT JOIN t_user a ON a.lg_USER_ID = m.vendeur_id"
                + " LEFT JOIN t_user c ON c.lg_USER_ID = m.caissier_id"
                + " LEFT JOIN t_user o ON o.lg_USER_ID = m.operateur_id"
                + " WHERE m.statut = 'VALIDEE' AND m.created_at >= ?1 AND m.created_at < ?2"
                + " AND (?3 = '' OR m.type_operation = ?3) AND (?4 = '' OR m.vendeur_id = ?4) ORDER BY m.created_at DESC")
                .setParameter(1, java.sql.Date.valueOf(debut)).setParameter(2, java.sql.Date.valueOf(fin.plusDays(1)))
                .setParameter(3, t).setParameter(4, StringUtils.defaultString(StringUtils.trimToNull(vendeurId)))
                .getResultList();
        List<Ligne> lignes = new ArrayList<>();
        l.forEach(x -> lignes
                .add(new Ligne((String) x[0], (String) x[1], (String) x[2], (String) x[3], (String) x[4], (String) x[5],
                        (String) x[6], (String) x[7], ((Number) x[8]).intValue(), (String) x[9], (String) x[10])));
        JSONObject o = agreger(lignes).put("dtStart", debut.toString()).put("dtEnd", fin.toString());
        if (lignes.stream().anyMatch(x -> ANNULATION.equals(x.type))) {
            o.put("classementAnnulations", classementAnnulations(lignes, ventesEncaissees(debut, fin)));
        } else {
            o.put("classementAnnulations", new JSONArray());
        }
        return o;
    }

    private static LocalDate date(String s, LocalDate defaut) {
        try {
            return StringUtils.isBlank(s) ? defaut : LocalDate.parse(s.trim());
        } catch (Exception e) {
            return defaut;
        }
    }
}
