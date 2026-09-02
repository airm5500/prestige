package rest.service.impl;

import dal.TUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.CaZoneGeoService;
import util.DateConverter;
import util.PeriodesCa;
import util.PeriodesCa.Granularite;
import util.PeriodesCa.Tranche;

/**
 * Meme perimetre de chiffre d'affaires que les statistiques par famille d'articles ({@link FamilleArticleServiceImpl})
 * : ventes cloturees, non annulees, a montant positif, hors depot extension, de l'emplacement de l'utilisateur, datees
 * par dt_UPDATED ; montant net TTC de la ligne = prix - remise. La zone geographique est celle du produit
 * (t_famille.lg_ZONE_GEO_ID), la famille celle du produit egalement.
 */
@Stateless
public class CaZoneGeoServiceImpl implements CaZoneGeoService {

    private static final Logger LOG = Logger.getLogger(CaZoneGeoServiceImpl.class.getName());
    static final String SANS_ZONE = "Sans zone";
    static final String SANS_FAMILLE = "Sans famille";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject chiffreAffaires(TUser utilisateur, Filtres filtres) {
        JSONObject json = new JSONObject();
        try {
            LocalDate aujourdhui = LocalDate.now();
            List<Tranche> tranches = PeriodesCa.tranches(filtres.getTypePeriode(), filtres.getDebut(), filtres.getFin(),
                    aujourdhui);
            Granularite granularite = PeriodesCa.granularite(filtres.getTypePeriode(), filtres.getDebut(),
                    filtres.getFin());
            if (tranches.isEmpty()) {
                return json.put("success", true).put("total", 0).put("data", new JSONArray()).put("tranches",
                        new JSONArray());
            }
            LocalDate debut = tranches.get(0).getDebut();
            LocalDate fin = tranches.get(tranches.size() - 1).getFin();
            String emplacementId = utilisateur.getLgEMPLACEMENTID().getLgEMPLACEMENTID();

            // STRAIGHT_JOIN + FORCE INDEX : sur une base d'officine (1,2 million de ventes), l'optimiseur partait
            // de la table des utilisateurs et relisait TOUTES les ventes de chacun (78 000 par utilisateur) pour ne
            // garder que la periode : 8 secondes. On lui impose de partir des ventes de la periode, par l'index
            // (str_STATUT, dt_UPDATED) pose par la migration V6.2.9, puis de joindre lignes, utilisateur, produit.
            StringBuilder sql = new StringBuilder("SELECT STRAIGHT_JOIN f.lg_ZONE_GEO_ID, z.str_LIBELLEE,")
                    .append(" f.lg_FAMILLEARTICLE_ID, fa.str_LIBELLE, ")
                    .append(granularite.expressionSql("p.dt_UPDATED")).append(" AS tranche,")
                    .append(" SUM(d.int_PRICE - IFNULL(d.int_PRICE_REMISE, 0)) AS ca, SUM(d.int_QUANTITY) AS qte")
                    .append(" FROM t_preenregistrement p FORCE INDEX (idx_preenr_statut_date)")
                    .append(" INNER JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID")
                    .append(" INNER JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID")
                    .append(" INNER JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID")
                    .append(" LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID")
                    .append(" LEFT JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID")
                    // Borne haute exclusive au lendemain : un intervalle sur la colonne elle-meme, que l'index
                    // sur dt_UPDATED sait servir. DATE(p.dt_UPDATED) BETWEEN ... obligeait a lire toutes les ventes.
                    .append(" WHERE p.str_STATUT = ?4 AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2")
                    .append(" AND u.lg_EMPLACEMENT_ID = ?3 AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0")
                    .append(" AND p.lg_TYPE_VENTE_ID <> ?5");
            boolean filtreZone = estRenseigne(filtres.getZoneId());
            boolean filtreFamille = estRenseigne(filtres.getFamilleId());
            if (filtreZone) {
                sql.append(" AND f.lg_ZONE_GEO_ID = ?6");
            }
            if (filtreFamille) {
                sql.append(" AND f.lg_FAMILLEARTICLE_ID = ?").append(filtreZone ? 7 : 6);
            }
            sql.append(" GROUP BY f.lg_ZONE_GEO_ID, z.str_LIBELLEE, f.lg_FAMILLEARTICLE_ID, fa.str_LIBELLE, tranche");
            Query requete = em.createNativeQuery(sql.toString())
                    .setParameter(1, java.sql.Timestamp.valueOf(debut.atStartOfDay()))
                    .setParameter(2, java.sql.Timestamp.valueOf(fin.plusDays(1).atStartOfDay()))
                    .setParameter(3, emplacementId).setParameter(4, DateConverter.STATUT_IS_CLOSED)
                    .setParameter(5, DateConverter.DEPOT_EXTENSION);
            int position = 6;
            if (filtreZone) {
                requete.setParameter(position++, filtres.getZoneId());
            }
            if (filtreFamille) {
                requete.setParameter(position, filtres.getFamilleId());
            }
            @SuppressWarnings("unchecked")
            List<Object[]> lignesSql = requete.getResultList();

            Map<String, Ligne> lignes = new LinkedHashMap<>();
            Map<String, Long> totauxTranches = new LinkedHashMap<>();
            for (Tranche t : tranches) {
                totauxTranches.put(t.getCle(), 0L);
            }
            for (Object[] r : lignesSql) {
                String zoneId = texte(r[0]);
                String zone = texte(r[1]).isEmpty() ? SANS_ZONE : texte(r[1]);
                String familleId = texte(r[2]);
                String famille = texte(r[3]).isEmpty() ? SANS_FAMILLE : texte(r[3]);
                String tranche = texte(r[4]);
                long ca = r[5] == null ? 0 : ((Number) r[5]).longValue();
                long qte = r[6] == null ? 0 : ((Number) r[6]).longValue();
                if (!totauxTranches.containsKey(tranche)) {
                    continue; // hors des tranches (ne devrait pas arriver, les bornes SQL sont celles des tranches)
                }
                String cle;
                switch (filtres.getRegroupement()) {
                case FAMILLE:
                    cle = "F|" + familleId;
                    break;
                case ZONE_FAMILLE:
                    cle = "Z|" + zoneId + "|F|" + familleId;
                    break;
                default:
                    cle = "Z|" + zoneId;
                    break;
                }
                Ligne ligne = lignes.computeIfAbsent(cle,
                        k -> new Ligne(filtres.getRegroupement(), zoneId, zone, familleId, famille));
                ligne.montants.merge(tranche, ca, Long::sum);
                ligne.quantites.merge(tranche, qte, Long::sum);
                ligne.total += ca;
                totauxTranches.merge(tranche, ca, Long::sum);
            }
            List<Ligne> triees = new ArrayList<>(lignes.values());
            triees.sort((a, b) -> Long.compare(b.total, a.total));

            JSONArray data = new JSONArray();
            long totalGeneral = 0;
            String premiereCle = tranches.get(0).getCle();
            String derniereCle = tranches.get(tranches.size() - 1).getCle();
            for (Ligne l : triees) {
                JSONObject o = new JSONObject().put("zoneId", l.zoneId).put("zone", l.zone)
                        .put("familleId", l.familleId).put("famille", l.famille).put("libelle", l.libelle())
                        .put("total", l.total);
                String clePrecedente = null;
                for (Tranche t : tranches) {
                    o.put("t_" + t.getCle(), l.montants.getOrDefault(t.getCle(), 0L));
                    o.put("q_" + t.getCle(), l.quantites.getOrDefault(t.getCle(), 0L));
                    // Evolution de tranche en tranche (de tel mois a tel mois) : par rapport a la tranche precedente
                    o.put("e_" + t.getCle(), clePrecedente == null ? JSONObject.NULL : evolution(
                            l.montants.getOrDefault(clePrecedente, 0L), l.montants.getOrDefault(t.getCle(), 0L)));
                    clePrecedente = t.getCle();
                }
                o.put("evolution",
                        evolution(l.montants.getOrDefault(premiereCle, 0L), l.montants.getOrDefault(derniereCle, 0L)));
                totalGeneral += l.total;
                data.put(o);
            }
            JSONArray tranchesJson = new JSONArray();
            for (Tranche t : tranches) {
                tranchesJson.put(new JSONObject().put("cle", t.getCle()).put("libelle", t.getLibelle())
                        .put("debut", t.getDebut().toString()).put("fin", t.getFin().toString()));
            }
            JSONObject totaux = new JSONObject();
            totauxTranches.forEach(totaux::put);
            JSONObject evolutionsTranches = new JSONObject();
            String precedente = null;
            for (Tranche t : tranches) {
                evolutionsTranches.put(t.getCle(),
                        precedente == null ? JSONObject.NULL : evolution(totauxTranches.getOrDefault(precedente, 0L),
                                totauxTranches.getOrDefault(t.getCle(), 0L)));
                precedente = t.getCle();
            }
            json.put("success", true).put("data", data).put("total", data.length()).put("tranches", tranchesJson)
                    .put("granularite", granularite.name()).put("totauxTranches", totaux)
                    .put("evolutionsTranches", evolutionsTranches).put("totalGeneral", totalGeneral)
                    .put("debut", debut.toString()).put("fin", fin.toString())
                    .put("evolutionGenerale", evolution(totauxTranches.getOrDefault(premiereCle, 0L),
                            totauxTranches.getOrDefault(derniereCle, 0L)));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "chiffreAffaires zone geo", e);
            json.put("success", false).put("msg", "Le calcul du chiffre d'affaires a échoué")
                    .put("data", new JSONArray()).put("total", 0);
        }
        return json;
    }

    /** Variation en pourcentage, arrondie a une decimale ; null quand il n'y a rien au depart. */
    static Object evolution(long premier, long dernier) {
        if (premier == 0) {
            return JSONObject.NULL;
        }
        return BigDecimal.valueOf(dernier - premier).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(premier), 1, RoundingMode.HALF_UP).doubleValue();
    }

    private static boolean estRenseigne(String valeur) {
        return valeur != null && !valeur.trim().isEmpty() && !"ALL".equalsIgnoreCase(valeur.trim());
    }

    private static String texte(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    private static final class Ligne {

        final Regroupement regroupement;
        final String zoneId;
        final String zone;
        final String familleId;
        final String famille;
        final Map<String, Long> montants = new LinkedHashMap<>();
        final Map<String, Long> quantites = new LinkedHashMap<>();
        long total;

        Ligne(Regroupement regroupement, String zoneId, String zone, String familleId, String famille) {
            this.regroupement = regroupement;
            this.zoneId = zoneId;
            this.zone = zone;
            this.familleId = familleId;
            this.famille = famille;
        }

        String libelle() {
            switch (regroupement) {
            case FAMILLE:
                return famille;
            case ZONE_FAMILLE:
                return zone + " / " + famille;
            default:
                return zone;
            }
        }
    }
}
