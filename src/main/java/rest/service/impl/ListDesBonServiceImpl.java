package rest.service.impl;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.Tuple;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONObject;
import rest.service.ListDesBonService;

import rest.service.dto.BonsDTO;
import rest.service.dto.BonsParam;
import rest.service.dto.BonsTotauxDTO;
import rest.service.dto.ProduitBonDTO;
import util.DateCommonUtils;
import util.DateConverter;
import util.FunctionUtils;

/**
 *
 * @author koben
 */
@Stateless
public class ListDesBonServiceImpl implements ListDesBonService {

    private static final Logger LOG = Logger.getLogger(ListDesBonServiceImpl.class.getName());
    private static final String EXCLUDE_STATEMENT = " AND  p.`lg_PREENREGISTREMENT_ID` NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) ";
    private static final String QUERY = "SELECT  DATE_FORMAT(p.`dt_UPDATED`, \"%d/%m/%Y\") AS dtUPDATED,DATE_FORMAT(p.`dt_UPDATED`, \"%H:%i:%s\") AS HEURE, tp.lg_TIERS_PAYANT_ID AS tiersPayantId, tp.str_NAME AS libelleTiersPayant,typeTp.str_LIBELLE_TYPE_TIERS_PAYANT AS typeTiersPayant, \n"
            + " COALESCE(grp.str_LIBELLE, '') AS groupeLibelle, \n"
            + " cp.int_PRICE AS cpAmount , p.`str_REF`, cp.`int_PERCENT`,cp.`int_PRICE_RESTE`, p.`int_PRICE_REMISE`\n"
            + "  ,cp.lg_PREENREGISTREMENT_ID AS lg_PREENREGISTREMENT_ID ,"
            + " CASE WHEN p.`lg_AYANTS_DROITS_ID` IS NOT NULL THEN COALESCE(ayd.`str_FIRST_NAME`, p.`str_FIRST_NAME_CUSTOMER`) ELSE COALESCE(clt.`str_FIRST_NAME`, p.`str_FIRST_NAME_CUSTOMER`) END AS str_FIRST_NAME_CUSTOMER,"
            + " CASE WHEN p.`lg_AYANTS_DROITS_ID` IS NOT NULL THEN COALESCE(ayd.`str_LAST_NAME`, p.`str_LAST_NAME_CUSTOMER`) ELSE COALESCE(clt.`str_LAST_NAME`, p.`str_LAST_NAME_CUSTOMER`) END AS str_LAST_NAME_CUSTOMER,"
            + " clt.`str_FIRST_NAME`,clt.`str_LAST_NAME`,cl.`str_NUMERO_SECURITE_SOCIAL`,cp.`str_REF_BON`\n"
            + "FROM  t_preenregistrement_compte_client_tiers_payent cp,\n"
            + "t_compte_client_tiers_payant cl, t_tiers_payant tp LEFT JOIN t_groupe_tierspayant grp ON grp.lg_GROUPE_ID = tp.lg_GROUPE_ID,\n"
            + " t_compte_client cpt,t_type_tiers_payant typeTp, t_client clt, mvttransaction m,"
            + " t_preenregistrement p LEFT JOIN t_ayant_droit ayd ON ayd.`lg_AYANTS_DROITS_ID` = p.`lg_AYANTS_DROITS_ID`\n"
            + " WHERE cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID\n"
            + " AND cl.lg_TIERS_PAYANT_ID=tp.lg_TIERS_PAYANT_ID AND\n"
            + " cl.lg_COMPTE_CLIENT_ID=cpt.lg_COMPTE_CLIENT_ID \n"
            + "AND tp.lg_TYPE_TIERS_PAYANT_ID=typeTp.`lg_TYPE_TIERS_PAYANT_ID` AND cpt.`lg_CLIENT_ID`=clt.`lg_CLIENT_ID`\n"
            + "AND p.`lg_PREENREGISTREMENT_ID`=cp.`lg_PREENREGISTREMENT_ID` AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`dt_UPDATED` >= ?1 AND p.`dt_UPDATED` <= ?2  AND m.`typeTransaction`=1 AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?3 AND m.`lg_EMPLACEMENT_ID` =?4 "
            + " AND p.imported=0 AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE` >0 {excludeStatement} {search} {tierspayantId} {typeTp} {groupeTp} ORDER BY  libelleTiersPayant,p.`dt_UPDATED`  ";

    private static final String RAPPORT_SQL_LIKE = " AND (cp.`str_REF_BON` LIKE '%s' OR cl.`str_NUMERO_SECURITE_SOCIAL` LIKE '%s' OR tp.str_NAME LIKE '%s' OR clt.`str_FIRST_NAME` LIKE '%s' OR clt.`str_FIRST_NAME` LIKE '%s') ";
    private static final String TIERS_PAYANT_ID = " AND tp.`lg_TIERS_PAYANT_ID`= %s ";
    private static final String TYPE_TIERS_PAYANT_ID = " AND tp.`lg_TYPE_TIERS_PAYANT_ID`= '%s' ";
    private static final String GROUPE_TIERS_PAYANT_ID = " AND tp.`lg_GROUPE_ID`= %s ";

    private static final String QUERY_TOTAUX = "SELECT  COUNT(cp.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`)  AS nbreBon, SUM(cp.`int_PRICE`) AS montant "
            + " FROM  t_preenregistrement_compte_client_tiers_payent cp,\n"
            + " t_compte_client_tiers_payant cl, t_tiers_payant tp LEFT JOIN t_groupe_tierspayant grp ON grp.lg_GROUPE_ID = tp.lg_GROUPE_ID,\n"
            + " t_compte_client cpt,t_type_tiers_payant typeTp, t_client clt, t_preenregistrement p,mvttransaction m\n"
            + " WHERE cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID\n"
            + " AND cl.lg_TIERS_PAYANT_ID=tp.lg_TIERS_PAYANT_ID AND\n"
            + " cl.lg_COMPTE_CLIENT_ID=cpt.lg_COMPTE_CLIENT_ID \n"
            + "AND tp.lg_TYPE_TIERS_PAYANT_ID=typeTp.`lg_TYPE_TIERS_PAYANT_ID` AND cpt.`lg_CLIENT_ID`=clt.`lg_CLIENT_ID`\n"
            + "AND p.`lg_PREENREGISTREMENT_ID`=cp.`lg_PREENREGISTREMENT_ID` AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`dt_UPDATED` >= ?1 AND p.`dt_UPDATED` <= ?2  AND m.`typeTransaction`=1 AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?3 AND m.`lg_EMPLACEMENT_ID` =?4 "
            + " AND p.imported=0 AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE` >0 {excludeStatement} {search} {tierspayantId} {typeTp} {groupeTp} ";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public List<BonsDTO> listAllBons(BonsParam bonsParam) {
        return listBonsList(bonsParam).stream().map(this::build).collect(Collectors.toList());
    }

    @Override
    public JSONObject listBons(BonsParam bonsParam) {
        BonsTotauxDTO bonsTotaux = listBonsTotaux(bonsParam);
        return FunctionUtils.returnData(listAllBons(bonsParam), bonsTotaux.getNbreBon(), bonsTotaux);
    }

    @Override
    public BonsTotauxDTO listBonsTotaux(BonsParam bonsParam) {
        Pair<LocalDateTime, LocalDateTime> dateParams = buildDateParams(bonsParam);
        String sql = replacePlaceHolder(QUERY_TOTAUX, bonsParam);
        LOG.log(Level.INFO, "sql--- listAllBons {0}", sql);
        try {
            // TIMESTAMP (et non DATE) : les bornes gardent leurs heures. Avec DATE, la borne de fin
            // etait tronquee a minuit (les bons du dernier jour etaient exclus) et les champs
            // heure debut/fin de l'ecran etaient ignores.
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(3, DateConverter.DEPOT_EXTENSION)
                    .setParameter(4, bonsParam.getEmplacementId())
                    .setParameter(1, DateCommonUtils.convertLocalDateTimeToDate(dateParams.getLeft()),
                            TemporalType.TIMESTAMP)
                    .setParameter(2, DateCommonUtils.convertLocalDateTimeToDate(dateParams.getRight()),
                            TemporalType.TIMESTAMP);

            return Optional.ofNullable((Tuple) query.getSingleResult()).map(this::buildBonsTotaux)
                    .orElse(BonsTotauxDTO.builder().build());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return BonsTotauxDTO.builder().build();
        }

    }

    private String replacePlaceHolder(String sql, BonsParam bonsParam) {
        String search = bonsParam.getSearch();
        String tiersPayantId = bonsParam.getTiersPayantId();
        if (bonsParam.isShowAllAmount()) {
            sql = sql.replace("{excludeStatement}", "");

        } else {
            sql = sql.replace("{excludeStatement}", EXCLUDE_STATEMENT);
        }
        if (StringUtils.isNotEmpty(search)) {

            sql = sql.replace("{search}", String.format(RAPPORT_SQL_LIKE, search + "%", search + "%", search + "%",
                    search + "%", search + "%"));
        } else {
            sql = sql.replace("{search}", "");
        }
        if (StringUtils.isNotEmpty(tiersPayantId)) {

            sql = sql.replace("{tierspayantId}", String.format(TIERS_PAYANT_ID, tiersPayantId));
        } else {
            sql = sql.replace("{tierspayantId}", "");
        }
        // Filtres lot 3 : type de tiers payant et groupe de tiers payant. Les valeurs ne sont
        // acceptees que numeriques (identifiants techniques) pour rester inoffensives dans le SQL.
        if (StringUtils.isNotEmpty(bonsParam.getTypeTiersPayantId())
                && StringUtils.isNumeric(bonsParam.getTypeTiersPayantId())) {
            sql = sql.replace("{typeTp}", String.format(TYPE_TIERS_PAYANT_ID, bonsParam.getTypeTiersPayantId()));
        } else {
            sql = sql.replace("{typeTp}", "");
        }
        if (StringUtils.isNotEmpty(bonsParam.getGroupeId()) && StringUtils.isNumeric(bonsParam.getGroupeId())) {
            sql = sql.replace("{groupeTp}", String.format(GROUPE_TIERS_PAYANT_ID, bonsParam.getGroupeId()));
        } else {
            sql = sql.replace("{groupeTp}", "");
        }
        return sql;
    }

    private List<Tuple> listBonsList(BonsParam bonsParam) {
        Pair<LocalDateTime, LocalDateTime> dateParams = buildDateParams(bonsParam);
        String sql = replacePlaceHolder(QUERY, bonsParam);
        LOG.log(Level.INFO, "sql--- listAllBons {0}", sql);
        try {
            // TIMESTAMP : memes bornes exactes que la requete des totaux (heures respectees)
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(3, DateConverter.DEPOT_EXTENSION)
                    .setParameter(4, bonsParam.getEmplacementId())
                    .setParameter(1, DateCommonUtils.convertLocalDateTimeToDate(dateParams.getLeft()),
                            TemporalType.TIMESTAMP)
                    .setParameter(2, DateCommonUtils.convertLocalDateTimeToDate(dateParams.getRight()),
                            TemporalType.TIMESTAMP);
            if (!bonsParam.isAll()) {
                query.setFirstResult(bonsParam.getStart());
                query.setMaxResults(bonsParam.getLimit());
            }
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private BonsDTO build(Tuple tuple) {
        return BonsDTO.builder().dtUPDATED(tuple.get("dtUPDATED", String.class)).heure(tuple.get("HEURE", String.class))
                .tiersPayantId(tuple.get("tiersPayantId", String.class))
                .clientFullName(
                        tuple.get("str_FIRST_NAME", String.class) + " " + tuple.get("str_LAST_NAME", String.class))
                .beneficiaireFullName(tuple.get("str_FIRST_NAME_CUSTOMER", String.class) + " "
                        + tuple.get("str_LAST_NAME_CUSTOMER", String.class))
                .strNUMEROSECURITESOCIAL(tuple.get("str_NUMERO_SECURITE_SOCIAL", String.class))
                .strREFBON(tuple.get("str_REF_BON", String.class)).strREF(tuple.get("str_REF", String.class))
                .tiersPayantLibelle(tuple.get("libelleTiersPayant", String.class))
                .intPERCENT(tuple.get("int_PERCENT", Integer.class)).intPRICE(tuple.get("cpAmount", Integer.class))
                .lg_PREENREGISTREMENT_ID(tuple.get("lg_PREENREGISTREMENT_ID", String.class))
                .typeTiersPayant(tuple.get("typeTiersPayant", String.class))
                .groupeLibelle(tuple.get("groupeLibelle", String.class)).build();
    }

    private BonsTotauxDTO buildBonsTotaux(Tuple tuple) {
        return BonsTotauxDTO.builder().nbreBon(tuple.get("nbreBon", BigInteger.class).intValue())
                .montant(tuple.get("montant", BigDecimal.class)).build();
    }

    // ------------------------------------------------------------------
    // PDF construit en code (lot 3) : liste simple regroupee par groupe, ou
    // liste avec les produits de chaque bon. Aucun gabarit jasper requis,
    // donc rien a deployer dans le dossier CONF des officines.
    // ------------------------------------------------------------------
    @Override
    public List<BonsDTO> bonsPourEdition(BonsParam bonsParam, boolean avecProduits, boolean parGroupe) {
        List<BonsDTO> bons = listAllBons(bonsParam);
        if (avecProduits) {
            Map<String, List<ProduitBonDTO>> produits = produitsParVente(
                    bons.stream().map(BonsDTO::getLg_PREENREGISTREMENT_ID).collect(Collectors.toList()));
            bons.forEach(b -> b.setProduits(
                    produits.getOrDefault(b.getLg_PREENREGISTREMENT_ID(), java.util.Collections.emptyList())));
        }
        bons.sort(ordreEdition(parGroupe));
        return bons;
    }

    /**
     * Ordre des bons dans l'edition : le groupe de tiers payant s'il est demande, puis l'organisme, puis la date.
     *
     * L'etat ouvre une nouvelle section des que la valeur groupee change d'une ligne a la suivante : un organisme dont
     * les bons ne se suivent pas apparaitrait plusieurs fois, chaque fois avec son propre total. C'est donc ici, et pas
     * dans l'etat, que l'ordre se decide.
     */
    static java.util.Comparator<BonsDTO> ordreEdition(boolean parGroupe) {
        java.util.Comparator<BonsDTO> ordre = parGroupe
                ? java.util.Comparator.comparing((BonsDTO b) -> cleDeTri(b.getGroupeLibelle())) : (a, b) -> 0;
        return ordre.thenComparing(b -> cleDeTri(b.getTiersPayantLibelle())).thenComparing(b -> nz(b.getDtUPDATED()))
                .thenComparing(b -> nz(b.getHeure()));
    }

    /** Cle de tri d'un libelle : sans accent, en majuscules, pour obtenir l'ordre du dictionnaire. */
    static String cleDeTri(String libelle) {
        if (libelle == null) {
            return "";
        }
        return java.text.Normalizer.normalize(libelle, java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toUpperCase().trim();
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    /** Produits (cip, libelle, quantite, montant) de chaque vente, en une seule requete par lot d'identifiants. */
    private Map<String, List<ProduitBonDTO>> produitsParVente(List<String> venteIds) {
        Map<String, List<ProduitBonDTO>> map = new java.util.HashMap<>();
        if (venteIds == null || venteIds.isEmpty()) {
            return map;
        }
        final int CHUNK = 500;
        for (int i = 0; i < venteIds.size(); i += CHUNK) {
            List<String> chunk = venteIds.subList(i, Math.min(venteIds.size(), i + CHUNK));
            try {
                @SuppressWarnings("unchecked")
                List<Object[]> rows = em.createNativeQuery(
                        "SELECT d.lg_PREENREGISTREMENT_ID, f.int_CIP, f.str_NAME, d.int_QUANTITY, d.int_PRICE"
                                + " FROM t_preenregistrement_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                                + " WHERE d.lg_PREENREGISTREMENT_ID IN (:ids) ORDER BY f.str_NAME")
                        .setParameter("ids", chunk).getResultList();
                for (Object[] r : rows) {
                    map.computeIfAbsent((String) r[0], k -> new ArrayList<>())
                            .add(ProduitBonDTO.builder().cip(r[1] == null ? "" : r[1].toString())
                                    .libelle(r[2] == null ? "" : r[2].toString())
                                    .quantite(r[3] == null ? 0 : ((Number) r[3]).intValue())
                                    .montant(r[4] == null ? 0 : ((Number) r[4]).intValue()).build());
                }
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Lecture des produits des bons impossible", e);
            }
        }
        return map;
    }

    private Pair<LocalDateTime, LocalDateTime> buildDateParams(BonsParam bonsParam) {
        LocalDate dts = StringUtils.isNotEmpty(bonsParam.getDtStart()) ? LocalDate.parse(bonsParam.getDtStart())
                : LocalDate.now();
        LocalTime hs = StringUtils.isNotEmpty(bonsParam.getHStart())
                ? LocalTime.parse(bonsParam.getHStart(), DateTimeFormatter.ofPattern("HH:mm")) : LocalTime.MIN;
        LocalDateTime dtStart = dts.atTime(hs);

        LocalDate dtE = StringUtils.isNotEmpty(bonsParam.getDtEnd()) ? LocalDate.parse(bonsParam.getDtEnd())
                : LocalDate.now();
        LocalTime hE = StringUtils.isNotEmpty(bonsParam.getHEnd())
                ? LocalTime.parse(bonsParam.getHEnd(), DateTimeFormatter.ofPattern("HH:mm")) : LocalTime.MAX;
        LocalDateTime dtEnd = dtE.atTime(hE);
        return Pair.of(dtStart, dtEnd);
    }

}
