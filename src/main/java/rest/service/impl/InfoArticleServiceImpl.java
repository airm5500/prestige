package rest.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import rest.service.InfoArticleService;
import rest.service.dto.InfoArticleDTO;
import util.DateUtil;

/**
 *
 * @author airman
 */
@Stateless
public class InfoArticleServiceImpl implements InfoArticleService {

    private static final Logger LOG = Logger.getLogger(InfoArticleServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public List<InfoArticleDTO> fetchInfoArticles(LocalDate dtStart, String search) {
        try {
            String searchValue = search + "%";
            return (List<InfoArticleDTO>) em.createNativeQuery(getQuery(), Tuple.class)
                    .setParameter(1, DateUtil.from(dtStart)).setParameter(2, searchValue).setParameter(3, searchValue)
                    .getResultList().stream().map(this::tupleToDto).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Erreur lors de la récupération des informations articles", e);
            return Collections.emptyList();
        }
    }

    private InfoArticleDTO tupleToDto(Object o) {
        Tuple tuple = (Tuple) o;
        return InfoArticleDTO.builder().grossiste(tuple.get("grossiste", String.class))
                .emplacement(tuple.get("emplacement", String.class)).produitId(tuple.get("produitId", String.class))
                .codeCip(tuple.get("codeCip", String.class)).libelle(tuple.get("libelle", String.class))
                .prixVente(tuple.get("prixVente", Integer.class)).prixAchat(tuple.get("prixAchat", Integer.class))
                .stock(tuple.get("stock", Integer.class)).quantiteVendue(tuple.get("quantiteVendue", BigDecimal.class))
                .moyenne(tuple.get("moyenne", BigDecimal.class)).quantiteMois(tuple.get("quantite_mois", String.class))
                .build();
    }

    private String getQuery() {
        return "SELECT g.str_LIBELLE AS grossiste, z.str_LIBELLEE AS emplacement, p.lg_FAMILLE_ID AS produitId, p.int_CIP AS codeCip, p.str_NAME AS libelle, "
                + "p.int_PRICE AS prixVente, p.int_PAF AS prixAchat, f.int_NUMBER AS stock, "
                + "SUM(CASE WHEN venteDetail.dateVente <> MONTH(CURDATE()) THEN venteDetail.quantiteVendue ELSE 0 END) AS quantiteVendue, "
                + "ROUND(SUM(CASE WHEN venteDetail.dateVente <> MONTH(CURDATE()) THEN venteDetail.quantiteVendue ELSE 0 END)/3, 2) AS moyenne, "
                + "GROUP_CONCAT(venteDetail.quantiteVendue, ':', venteDetail.dateVente) AS quantite_mois "
                + "FROM t_famille p " + "JOIN t_zone_geographique z ON p.lg_ZONE_GEO_ID = z.lg_ZONE_GEO_ID "
                + "JOIN t_grossiste g ON p.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID "
                + "JOIN t_famille_stock f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID " + "JOIN ( "
                + "  SELECT d.lg_FAMILLE_ID AS produitId, SUM(d.int_QUANTITY) AS quantiteVendue, MONTH(v.dt_UPDATED) AS dateVente "
                + "  FROM t_preenregistrement_detail d "
                + "  JOIN t_preenregistrement v ON d.lg_PREENREGISTREMENT_ID = v.lg_PREENREGISTREMENT_ID "
                + "  WHERE v.b_IS_CANCEL = 0 AND v.str_STATUT = 'is_Closed' AND v.int_PRICE > 0 AND DATE(v.dt_UPDATED) BETWEEN ?1 AND CURDATE() "
                + "  GROUP BY d.lg_FAMILLE_ID, MONTH(v.dt_UPDATED) "
                + ") AS venteDetail ON p.lg_FAMILLE_ID = venteDetail.produitId "
                + "WHERE p.str_STATUT = 'enable' AND (p.int_CIP LIKE ?2 OR p.str_NAME LIKE ?3) "
                + "GROUP BY p.lg_FAMILLE_ID " + "ORDER BY p.str_NAME;";
    }
}
