package rest.service.impl;

import dal.TTypeReglement;
import java.math.RoundingMode;
import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.StatCaisseRecetteService;
import rest.service.StatCaisseRecetteService.Granularite;
import static rest.service.StatCaisseRecetteService.Granularite.ANNEE;
import static rest.service.StatCaisseRecetteService.Granularite.MOIS;
import rest.service.dto.StatCaisseRecetteDTO;
import util.Constant;
import util.FunctionUtils;

/**
 *
 * @author koben
 */
@Stateless
public class StatCaisseRecetteServiceImpl implements StatCaisseRecetteService {

    private static final Logger LOG = Logger.getLogger(StatCaisseRecetteServiceImpl.class.getName());
    private static final String DATE_QUERY_DAY = "DATE(p.dt_UPDATED) ";
    private static final String DATE_QUERY_VENTE_REGL = "DATE(vr.mvtDate) ";
    private static final String DATE_QUERY_YEAR = "YEAR(p.dt_UPDATED) ";
    private static final String DATE_QUERY_VENTE_REGL_YEAR = "YEAR(vr.mvtDate) ";
    /*
     * Regroupement mensuel (point 16) : le premier jour du mois, rendu comme une DATE et non comme une chaine, pour que
     * les lignes se relisent exactement comme les lignes journalieres - seul l'affichage change.
     */
    private static final String DATE_QUERY_MONTH = "DATE(DATE_FORMAT(p.dt_UPDATED, '%Y-%m-01')) ";
    private static final String DATE_QUERY_VENTE_REGL_MONTH = "DATE(DATE_FORMAT(vr.mvtDate, '%Y-%m-01')) ";
    private static final String QUERY = "SELECT {date_column} AS mvtDate, SUM(p.int_PRICE) AS montantTtc,SUM(m.montantRestant) AS montantDiffere,SUM(p.int_PRICE_REMISE) AS montantRemise, SUM(CASE WHEN p.`int_PRICE` <0 OR p.`b_IS_CANCEL`=1 THEN 0 ELSE 1 END) AS nbreClient,SUM(m.montantNet) montantNet, SUM(m.montantTva) AS montantTva, SUM(m.montantCredit) AS montantCredit,vente_reglement_q.venteReglement FROM mvttransaction m "
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=m.vente_id,(SELECT {date_regl_column} AS mvtDateR,GROUP_CONCAT(CONCAT(CONCAT(tr.lg_TYPE_REGLEMENT_ID, ':', vr.montant_attentu)  ) SEPARATOR '/' ) AS venteReglement   FROM vente_reglement vr JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID=vr.type_regelement "
            + " {sub_where_close} GROUP BY {date_regl_column}) AS vente_reglement_q WHERE vente_reglement_q.mvtDateR={date_column} AND  {date_column} BETWEEN ?1 AND ?2 AND p.str_STATUT='is_Closed' AND m.lg_EMPLACEMENT_ID=?3 AND  p.lg_TYPE_VENTE_ID <> '5' AND p.imported=0   AND  p.`lg_PREENREGISTREMENT_ID` NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) {where_close}"
            + " GROUP BY {date_column} ";
    private static final String TYPE_REGLEMENT_WHERE_CLOSE = " AND p.`lg_PREENREGISTREMENT_ID` IN (SELECT vp.vente_id FROM vente_reglement vp WHERE vp.type_regelement='%s') ";
    private static final String TYPE_REGLEMENT_SUB_WHERE_CLOSE = " WHERE vr.type_regelement='%s' ";
    private static final String OTHER_MVT_SQL_QUERY = "SELECT vr.`typeMvtCaisseId` AS typeMvtCaisse,{date_regl_column} as mvtDate, SUM(vr.montant) AS montantTTC FROM  mvttransaction vr WHERE {date_regl_column} BETWEEN ?1 AND ?2 AND vr.`typeMvtCaisseId` IN('2','3','5','4')  AND vr.`lg_EMPLACEMENT_ID` =?3 {where_close}  GROUP BY vr.`typeMvtCaisseId`,{date_regl_column} ";
    private static final String TYPE_REGLEMENT_OTHER_MVT = " AND vr.typeReglementId='%s' ";
    private static final String BILLETAGE_QUERY = " SELECT {date_regl_column} AS mvtDate, SUM(vr.int_AMOUNT) AS montantTTC FROM t_billetage vr WHERE {date_regl_column} BETWEEN ?1 AND ?2 GROUP  BY {date_regl_column}";
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public List<StatCaisseRecetteDTO> fetchStatCaisseRecettes(String dateDebut, String dateFin, String typeRglementId,
            boolean groupByYear, String emplacementId) {
        return fetchStatCaisseRecettes(dateDebut, dateFin, typeRglementId,
                groupByYear ? Granularite.ANNEE : Granularite.JOUR, emplacementId);
    }

    @Override
    public List<StatCaisseRecetteDTO> fetchStatCaisseRecettes(String dateDebut, String dateFin, String typeRglementId,
            Granularite granularite, String emplacementId) {
        List<Tuple> tuples = getData(dateDebut, dateFin, typeRglementId, granularite, emplacementId);
        List<StatCaisseRecetteDTO> ventes = buildData(tuples, granularite);
        List<StatCaisseRecetteDTO> mvts = buildDataMvts(
                getDataMvts(dateDebut, dateFin, typeRglementId, granularite, emplacementId), granularite);
        List<StatCaisseRecetteDTO> billetages = buildDataBilletage(dateDebut, dateFin, granularite);
        return mergeAll(ventes, mvts, billetages);

    }

    @Override
    public JSONObject getStatCaisseRecettes(String dateDebut, String dateFin, String typeRglementId,
            boolean groupByYear, String emplacementId) {
        return getStatCaisseRecettes(dateDebut, dateFin, typeRglementId,
                groupByYear ? Granularite.ANNEE : Granularite.JOUR, emplacementId);
    }

    @Override
    public JSONObject getStatCaisseRecettes(String dateDebut, String dateFin, String typeRglementId,
            Granularite granularite, String emplacementId) {
        List<StatCaisseRecetteDTO> caisseRecettes = this.fetchStatCaisseRecettes(dateDebut, dateFin, typeRglementId,
                granularite, emplacementId);
        return FunctionUtils.returnData(caisseRecettes, caisseRecettes.size());
    }

    /**
     * Requete du suivi des modes de reglement (point 22).
     *
     * <p>
     * Elle part de {@code vente_reglement}, ou chaque encaissement porte son mode et son montant, et retient les memes
     * ventes que le recapitulatif : cloturees, de l'emplacement, hors depot extension, hors ventes exclues. Sans ces
     * memes exclusions, la synthese des modes ne se raccorderait pas au tableau qu'elle accompagne.
     * </p>
     */
    private static final String MODES_QUERY = "SELECT tr.lg_TYPE_REGLEMENT_ID AS modeId, tr.str_NAME AS mode,"
            + " {tranche} AS tranche, SUM(vr.montant_attentu) AS montant, COUNT(*) AS operations"
            + " FROM vente_reglement vr" + " JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = vr.type_regelement"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = vr.vente_id"
            + " JOIN mvttransaction m ON m.vente_id = p.lg_PREENREGISTREMENT_ID"
            + " WHERE DATE(vr.mvtDate) BETWEEN ?1 AND ?2 AND p.str_STATUT = 'is_Closed'"
            + " AND m.lg_EMPLACEMENT_ID = ?3 AND p.lg_TYPE_VENTE_ID <> '5' AND p.imported = 0"
            + " AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v)"
            + " GROUP BY tr.lg_TYPE_REGLEMENT_ID, tr.str_NAME, tranche ORDER BY tranche";

    /**
     * Le chiffre d'affaires realise sur la periode (retour du 09/09, point 7) : le net TTC des memes ventes que le
     * recapitulatif, et la part restee a credit (organismes). C'est le denominateur du « % de chaque mode de reglement
     * dans le chiffre d'affaires ».
     */
    private static final String CA_QUERY = "SELECT COALESCE(SUM(m.montantNet),0) AS chiffreAffaires,"
            + " COALESCE(SUM(m.montantCredit),0) AS montantCredit FROM mvttransaction m"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = m.vente_id"
            + " WHERE DATE(p.dt_UPDATED) BETWEEN ?1 AND ?2 AND p.str_STATUT = 'is_Closed'"
            + " AND m.lg_EMPLACEMENT_ID = ?3 AND p.lg_TYPE_VENTE_ID <> '5' AND p.imported = 0"
            + " AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v)";

    @Override
    public JSONObject suiviModesReglement(String dateDebut, String dateFin, boolean groupByYear, String emplacementId) {
        JSONObject json = new JSONObject();
        try {
            javax.persistence.Tuple ca = (javax.persistence.Tuple) em
                    .createNativeQuery(CA_QUERY, javax.persistence.Tuple.class)
                    .setParameter(1, java.sql.Date.valueOf(dateDebut)).setParameter(2, java.sql.Date.valueOf(dateFin))
                    .setParameter(3, emplacementId).getSingleResult();
            long chiffreAffaires = ((Number) ca.get("chiffreAffaires")).longValue();
            long montantCredit = ((Number) ca.get("montantCredit")).longValue();
            String sql = MODES_QUERY.replace("{tranche}",
                    groupByYear ? "YEAR(vr.mvtDate)" : "DATE_FORMAT(vr.mvtDate, '%Y-%m-%d')");
            @SuppressWarnings("unchecked")
            List<javax.persistence.Tuple> resultat = em.createNativeQuery(sql, javax.persistence.Tuple.class)
                    .setParameter(1, java.sql.Date.valueOf(dateDebut)).setParameter(2, java.sql.Date.valueOf(dateFin))
                    .setParameter(3, emplacementId).getResultList();

            // Un mode = un cumul ; une tranche = un point de la courbe. Les deux se remplissent en un seul parcours.
            Map<String, JSONObject> parMode = new java.util.LinkedHashMap<>();
            Map<String, Map<String, Long>> serie = new java.util.LinkedHashMap<>();
            java.util.SortedSet<String> tranches = new java.util.TreeSet<>();
            long totalGeneral = 0;
            long operationsGenerales = 0;
            for (javax.persistence.Tuple t : resultat) {
                String modeId = String.valueOf(t.get("modeId"));
                String mode = t.get("mode") == null || String.valueOf(t.get("mode")).trim().isEmpty() ? modeId
                        : String.valueOf(t.get("mode")).trim();
                String tranche = String.valueOf(t.get("tranche"));
                long montant = t.get("montant") == null ? 0 : ((Number) t.get("montant")).longValue();
                long operations = t.get("operations") == null ? 0 : ((Number) t.get("operations")).longValue();
                tranches.add(tranche);
                JSONObject cumul = parMode.computeIfAbsent(modeId,
                        k -> new JSONObject().put("modeId", modeId).put("mode", mode).put("montant", 0L)
                                .put("operations", 0L).put("mobile", util.MobileMoney.est(modeId)));
                cumul.put("montant", cumul.optLong("montant") + montant);
                cumul.put("operations", cumul.optLong("operations") + operations);
                serie.computeIfAbsent(modeId, k -> new java.util.LinkedHashMap<>()).merge(tranche, montant, Long::sum);
                totalGeneral += montant;
                operationsGenerales += operations;
            }

            // Part et montant moyen : c'est ce qui fait de la synthese une aide a la decision, et non un simple
            // releve. La part est calculee sur le total de la periode, a une decimale.
            List<JSONObject> modes = new ArrayList<>(parMode.values());
            modes.sort((a, b) -> Long.compare(b.optLong("montant"), a.optLong("montant")));
            JSONArray dataModes = new JSONArray();
            for (JSONObject m : modes) {
                long montant = m.optLong("montant");
                long operations = m.optLong("operations");
                m.put("part",
                        totalGeneral == 0 ? 0d
                                : java.math.BigDecimal.valueOf(montant).multiply(java.math.BigDecimal.valueOf(100))
                                        .divide(java.math.BigDecimal.valueOf(totalGeneral), 1, RoundingMode.HALF_UP)
                                        .doubleValue());
                m.put("montantMoyen", operations == 0 ? 0L : Math.round((double) montant / operations));
                // Part dans le chiffre d'affaires realise (point 7), distincte de la part des encaissements.
                m.put("partCa", VentilationBalance.pourcentage(montant, chiffreAffaires));
                dataModes.put(m);
            }
            long totalMobile = modes.stream().filter(m -> m.optBoolean("mobile")).mapToLong(m -> m.optLong("montant"))
                    .sum();
            json.put("chiffreAffaires", chiffreAffaires).put("totalMobile", totalMobile)
                    .put("partMobileCa", VentilationBalance.pourcentage(totalMobile, chiffreAffaires))
                    .put("montantCredit", montantCredit)
                    .put("partCreditCa", VentilationBalance.pourcentage(montantCredit, chiffreAffaires));

            // Courbe : une serie par mode, une valeur par tranche, les tranches sans encaissement valant zero -
            // une courbe trouee se lit de travers.
            JSONArray series = new JSONArray();
            for (JSONObject m : modes) {
                Map<String, Long> valeurs = serie.getOrDefault(m.optString("modeId"), java.util.Collections.emptyMap());
                JSONArray points = new JSONArray();
                for (String tranche : tranches) {
                    points.put(valeurs.getOrDefault(tranche, 0L));
                }
                series.put(new JSONObject().put("mode", m.optString("mode")).put("modeId", m.optString("modeId"))
                        .put("points", points));
            }
            json.put("success", true).put("data", dataModes).put("total", dataModes.length())
                    .put("tranches", new JSONArray(tranches)).put("series", series).put("totalGeneral", totalGeneral)
                    .put("operationsGenerales", operationsGenerales);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "suivi des modes de reglement", e);
            json.put("success", false).put("msg", "Le suivi des modes de règlement a échoué")
                    .put("data", new JSONArray()).put("total", 0);
        }
        return json;
    }

    private String buildQuery(String query, String typeRglementId, Granularite granularite) {

        switch (granularite) {
        case ANNEE:
            query = query.replace("{date_column}", DATE_QUERY_YEAR).replace("{date_regl_column}",
                    DATE_QUERY_VENTE_REGL_YEAR);
            break;
        case MOIS:
            /*
             * Le regroupement porte sur le premier du mois, mais les BORNES portent sur le jour reel : sans cela, « du
             * 03 au 04 aout » comparerait le 1er aout aux bornes et ne rendrait aucune ligne.
             */
            query = query.replace("{date_column} BETWEEN", DATE_QUERY_DAY + " BETWEEN")
                    .replace("{date_column}", DATE_QUERY_MONTH)
                    .replace("{date_regl_column}", DATE_QUERY_VENTE_REGL_MONTH);
            break;
        default:
            query = query.replace("{date_column}", DATE_QUERY_DAY).replace("{date_regl_column}", DATE_QUERY_VENTE_REGL);
            break;
        }
        if (StringUtils.isNotBlank(typeRglementId)) {
            query = query.replace("{where_close}", String.format(TYPE_REGLEMENT_WHERE_CLOSE, typeRglementId));
            query = query.replace("{sub_where_close}", String.format(TYPE_REGLEMENT_SUB_WHERE_CLOSE, typeRglementId));
        } else {
            query = query.replace("{where_close}", "");
            query = query.replace("{sub_where_close}", "");
        }
        return query;
    }

    private List<Tuple> getData(String dateDebut, String dateFin, String typeRglementId, Granularite granularite,
            String emplacementId) {
        String sql = buildQuery(QUERY, typeRglementId, granularite);
        LOG.log(Level.INFO, "sql--- StatCaisseRecette {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(3, emplacementId)
                    .setParameter(1, java.sql.Date.valueOf(dateDebut)).setParameter(2, java.sql.Date.valueOf(dateFin));
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private List<Tuple> getDataMvts(String dateDebut, String dateFin, String typeRglementId, Granularite granularite,
            String emplacementId) {
        String sql = buildMvtsQuery(OTHER_MVT_SQL_QUERY, typeRglementId, granularite);
        LOG.log(Level.INFO, "sql--- OTHER_MVT_SQL_QUERY {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(3, emplacementId)
                    .setParameter(1, java.sql.Date.valueOf(dateDebut)).setParameter(2, java.sql.Date.valueOf(dateFin));
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private List<StatCaisseRecetteDTO> buildDataMvts(List<Tuple> tuples, Granularite granularite) {
        try {
            if (CollectionUtils.isNotEmpty(tuples)) {
                List<StatCaisseRecetteDTO> datas = new ArrayList<>();
                for (Tuple t : tuples) {
                    StatCaisseRecetteDTO caisseRecette = new StatCaisseRecetteDTO();
                    daterLigne(caisseRecette, t.get("mvtDate", Object.class), granularite);

                    long montantTTC = t.get("montantTTC", BigDecimal.class).longValue();
                    var typeId = t.get("typeMvtCaisse", String.class);
                    switch (typeId) {
                    case Constant.MVT_REGLE_DIFF:
                        caisseRecette.setMontantReglementDiff(caisseRecette.getMontantReglementDiff() + montantTTC);
                        break;
                    case Constant.MVT_REGLE_TP:
                        caisseRecette
                                .setMontantReglementFacture(caisseRecette.getMontantReglementFacture() + montantTTC);
                        break;
                    case Constant.MVT_ENTREE_CAISSE:
                        caisseRecette.setMontantEntre(caisseRecette.getMontantEntre() + montantTTC);
                        break;
                    case Constant.MVT_SORTIE_CAISSE:
                        caisseRecette.setMontantSortie(caisseRecette.getMontantSortie() + montantTTC);
                        break;

                    default:
                        break;
                    }
                    datas.add(caisseRecette);

                }
                return datas;
            } else {
                return Collections.emptyList();
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private List<StatCaisseRecetteDTO> buildData(List<Tuple> tuples, Granularite granularite) {
        try {
            if (CollectionUtils.isNotEmpty(tuples)) {
                List<StatCaisseRecetteDTO> datas = new ArrayList<>();
                for (Tuple t : tuples) {
                    StatCaisseRecetteDTO caisseRecette = new StatCaisseRecetteDTO();
                    daterLigne(caisseRecette, t.get("mvtDate", Object.class), granularite);
                    caisseRecette.setMontantTtc(t.get("montantTtc", BigDecimal.class).longValue());
                    caisseRecette.setMontantRemise(t.get("montantRemise", BigDecimal.class).longValue());
                    caisseRecette.setMontantNet(t.get("montantNet", BigDecimal.class).longValue());
                    var montantCredit = t.get("montantCredit", BigDecimal.class).longValue();
                    var montantDiffere = t.get("montantDiffere", BigDecimal.class).longValue();
                    caisseRecette.setMontantCredit(montantCredit + montantDiffere);
                    caisseRecette.setMontantTva(t.get("montantTva", BigDecimal.class).longValue());
                    caisseRecette.setNbreClient(t.get("nbreClient", BigDecimal.class).intValue());
                    buildTypeReglementData(caisseRecette, t.get("venteReglement", String.class));

                    datas.add(caisseRecette);

                }
                return datas;
            } else {
                return Collections.emptyList();
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private void buildTypeReglementData(StatCaisseRecetteDTO caisseRecette, String venteReglement) {
        Map<String, Long> map = new HashMap<>();

        String[] typeReglementMontants = venteReglement.split("/");

        for (String typeReglementMontant1 : typeReglementMontants) {
            String[] typeReglementMontant = typeReglementMontant1.split(":");
            if (typeReglementMontant.length > 1) {
                var typeRgl = typeReglementMontant[0];

                Long montant = Long.valueOf(typeReglementMontant[1]);
                Long typMontant = map.get(typeRgl);
                if (Objects.nonNull(typMontant)) {
                    typMontant += montant;
                } else {
                    typMontant = montant;
                }
                map.put(typeRgl, typMontant);
            }
        }

        /*
         * Point 22 : le sous-detail des paiements mobiles est construit a partir des modes REELLEMENT rencontres,
         * jamais d'une liste ecrite d'avance. Un operateur cree par l'officine y figure donc au meme titre qu'Orange,
         * et le total du sous-detail vaut par construction le montant mobile de la ligne.
         */
        getTTypeReglements().forEach(type -> {
            String name = type.getLgTYPEREGLEMENTID();
            Long montant = map.get(name);
            if (Objects.nonNull(montant)) {
                switch (name) {
                case Constant.MODE_ESP:
                    caisseRecette.setMontantEspece(montant);
                    break;
                case Constant.MODE_WAVE:
                case Constant.MODE_DJAMO:
                case Constant.MODE_MTN:
                case Constant.MODE_MOOV:
                case Constant.TYPE_REGLEMENT_ORANGE:
                    caisseRecette.ajouterDetailMobile(libelleMode(type), montant);
                    break;
                case Constant.MODE_CHEQUE:
                    caisseRecette.setMontantCheque(montant);
                    break;
                case Constant.MODE_CB:
                    caisseRecette.setMontantCb(montant);
                    break;
                case Constant.MODE_VIREMENT:
                    caisseRecette.setMontantVirement(montant);
                    break;

                default:
                    // Mode mobile money cree par l'officine : compte dans le total mobile ET dans le sous-detail.
                    if (util.MobileMoney.est(name)) {
                        caisseRecette.ajouterDetailMobile(libelleMode(type), montant);
                    }
                    break;
                }
            }

        });

    }

    /** Nom affichable d'un mode : son libelle, ou son identifiant si le libelle n'est pas renseigne. */
    private static String libelleMode(TTypeReglement type) {
        String libelle = type.getStrNAME();
        return libelle == null || libelle.trim().isEmpty() ? type.getLgTYPEREGLEMENTID() : libelle.trim();
    }

    private List<TTypeReglement> getTTypeReglements() {
        return this.getEntityManager().createNamedQuery("TTypeReglement.findAll", TTypeReglement.class).getResultList();
    }

    private String buildMvtsQuery(String query, String typeRglementId, Granularite granularite) {

        if (granularite == Granularite.ANNEE) {
            query = query.replace("{date_regl_column}", DATE_QUERY_VENTE_REGL_YEAR);
        } else if (granularite == Granularite.MOIS) {
            // Bornes sur le jour reel, regroupement sur le mois : cf. buildQuery.
            query = query.replace("{date_regl_column} BETWEEN", DATE_QUERY_VENTE_REGL + " BETWEEN")
                    .replace("{date_regl_column}", DATE_QUERY_VENTE_REGL_MONTH);
        } else {
            query = query.replace("{date_regl_column}", DATE_QUERY_VENTE_REGL);
        }
        if (StringUtils.isNotBlank(typeRglementId)) {
            query = query.replace("{where_close}", String.format(TYPE_REGLEMENT_OTHER_MVT, typeRglementId));

        } else {
            query = query.replace("{where_close}", "");

        }
        return query;
    }

    private String buildBilletageQuery(String query, Granularite granularite) {

        if (granularite == Granularite.ANNEE) {
            query = query.replace("{date_regl_column}", " YEAR(vr.dt_CREATED) ");
        } else if (granularite == Granularite.MOIS) {
            // Bornes sur le jour reel, regroupement sur le mois : cf. buildQuery.
            query = query.replace("{date_regl_column} BETWEEN", " DATE(vr.dt_CREATED) BETWEEN")
                    .replace("{date_regl_column}", " DATE(DATE_FORMAT(vr.dt_CREATED, '%Y-%m-01')) ");
        } else {
            query = query.replace("{date_regl_column}", " DATE(vr.dt_CREATED)  ");
        }

        return query;
    }

    /**
     * Date de la ligne et son libelle, selon le regroupement demande.
     *
     * <p>
     * Le regroupement annuel rend un entier, les deux autres une date : jour affiche « 05/08/2026 », mois « 08/2026 »,
     * annee « 2026 ». Les trois lectures de ligne partagent ce meme calcul, faute de quoi elles se desaccorderaient a
     * la fusion - les journees se regroupent sur cette date.
     * </p>
     */
    private static void daterLigne(StatCaisseRecetteDTO ligne, Object mvtDate, Granularite granularite) {
        LocalDate date;
        String libelle;
        if (mvtDate instanceof Integer) {
            date = LocalDate.ofYearDay((int) mvtDate, 1);
            libelle = String.valueOf(mvtDate);
        } else {
            date = ((Date) mvtDate).toLocalDate();
            libelle = granularite == Granularite.MOIS ? date.format(DateTimeFormatter.ofPattern("MM/yyyy"))
                    : date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        ligne.setDisplayMvtDate(libelle);
        ligne.setMvtDate(date);
    }

    private List<StatCaisseRecetteDTO> mergeAll(List<StatCaisseRecetteDTO> ventes, List<StatCaisseRecetteDTO> mvtCaisse,
            List<StatCaisseRecetteDTO> billetages) {
        List<StatCaisseRecetteDTO> datas = new ArrayList<>();
        Stream.of(ventes, mvtCaisse, billetages).flatMap(List::stream)
                .sorted(Comparator.comparing(StatCaisseRecetteDTO::getMvtDate))
                .collect(Collectors.groupingBy(StatCaisseRecetteDTO::getMvtDate)).forEach((mvtDate, values) -> {
                    StatCaisseRecetteDTO o = new StatCaisseRecetteDTO();
                    o.setMvtDate(mvtDate);
                    o.setDisplayMvtDate(values.get(0).getDisplayMvtDate());
                    values.forEach(e -> {
                        o.setMontantBilletage(o.getMontantBilletage() + e.getMontantBilletage());
                        o.setMontantCb(o.getMontantCb() + e.getMontantCb());
                        o.setMontantCheque(o.getMontantCheque() + e.getMontantCheque());
                        o.setMontantCredit(o.getMontantCredit() + e.getMontantCredit());
                        o.setMontantEntre(o.getMontantEntre() + e.getMontantEntre());
                        o.setMontantEspece(o.getMontantEspece() + e.getMontantEspece());
                        o.setMontantMobile(o.getMontantMobile() + e.getMontantMobile());
                        o.setMontantTtc(o.getMontantTtc() + e.getMontantTtc());
                        o.setMontantTva(o.getMontantTva() + e.getMontantTva());
                        o.setMontantReglementDiff(o.getMontantReglementDiff() + e.getMontantReglementDiff());
                        o.setMontantReglementFacture(o.getMontantReglementFacture() + e.getMontantReglementFacture());
                        o.setMontantVirement(o.getMontantVirement() + e.getMontantVirement());
                        o.setNbreClient(o.getNbreClient() + e.getNbreClient());
                        o.setMontantRemise(o.getMontantRemise() + e.getMontantRemise());
                        o.setMontantHt(o.getMontantTtc() - o.getMontantTva());
                        o.setMontantSortie(o.getMontantSortie() + e.getMontantSortie());
                        o.setMontantNet(o.getMontantNet() + e.getMontantNet());
                        /*
                         * La journee est recomposee dans un objet NEUF, champ par champ : le sous-detail des paiements
                         * mobiles doit etre reporte lui aussi, sinon il se perd ici alors qu'il a bien ete calcule. Les
                         * parts sont ADDITIONNEES, comme le montant mobile juste au-dessus : les deux restent ainsi
                         * egaux par construction. On ne repasse pas par ajouterDetailMobile, qui ajouterait une seconde
                         * fois au total.
                         */
                        e.getDetailMobile().forEach((mode, part) -> o.getDetailMobile().merge(mode, part, Long::sum));
                    });
                    /*
                     * Point 16 : le solde est calcule UNE FOIS, la journee entierement recomposee.
                     *
                     * Il l'etait auparavant a l'interieur de la boucle, en s'ajoutant a lui-meme : chaque source de la
                     * journee - ventes, mouvements de caisse, billetage - reempilait des totaux encore partiels, si
                     * bien que le solde valait plusieurs fois les montants deja cumules. Il vaut desormais exactement
                     * ce que l'officine appelle le solde : comptant + mobile + reglement tiers payant + reglement
                     * differe.
                     */
                    o.calculerSolde();
                    datas.add(o);
                });
        datas.sort(Comparator.comparing(StatCaisseRecetteDTO::getMvtDate));
        return datas;

    }

    private List<Tuple> getDataBilletage(String dateDebut, String dateFin, Granularite granularite) {
        String sql = buildBilletageQuery(BILLETAGE_QUERY, granularite);
        LOG.log(Level.INFO, "sql--- BILLETAGE_QUERY {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, java.sql.Date.valueOf(dateDebut))
                    .setParameter(2, java.sql.Date.valueOf(dateFin));
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private List<StatCaisseRecetteDTO> buildDataBilletage(String dateDebut, String dateFin, Granularite granularite) {
        List<Tuple> tuples = getDataBilletage(dateDebut, dateFin, granularite);
        try {
            if (CollectionUtils.isNotEmpty(tuples)) {
                List<StatCaisseRecetteDTO> datas = new ArrayList<>();
                for (Tuple t : tuples) {
                    StatCaisseRecetteDTO caisseRecette = new StatCaisseRecetteDTO();
                    daterLigne(caisseRecette, t.get("mvtDate", Object.class), granularite);

                    long montantBilletage = t.get("montantTTC", Double.class).longValue();
                    caisseRecette.setMontantBilletage(montantBilletage);

                    datas.add(caisseRecette);

                }
                return datas;
            } else {
                return Collections.emptyList();
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }
}
