package rest.service.impl;

import commonTasks.dto.ProduitExtraInfoDTO;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import rest.service.InfoArticleService;
import rest.service.ProduitExtraInfoService;
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

    @EJB
    private ProduitExtraInfoService produitExtraInfoService;

    @Override
    public List<InfoArticleDTO> fetchInfoArticles(LocalDate dtStart, String search) {
        try {
            String searchValue = search + "%";
            return (List<InfoArticleDTO>) em.createNativeQuery(getQuery(), Tuple.class)
                    .setParameter(1, DateUtil.from(dtStart)).setParameter(2, searchValue).setParameter(3, searchValue)
                    .setParameter(4, DateUtil.from(dtStart)).getResultList().stream().map(this::tupleToDto)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Erreur lors de la récupération des informations articles", e);
            return Collections.emptyList();
        }
    }

    private InfoArticleDTO tupleToDto(Object o) {
        Tuple tuple = (Tuple) o;
        String produitId = tuple.get("produitId", String.class);
        String emplacementId = tuple.get("emplacementId", String.class);
        ProduitExtraInfoDTO extra = produitExtraInfoService.getExtraInfo(produitId, emplacementId);
        return InfoArticleDTO.builder().grossiste(tuple.get("grossiste", String.class))
                .emplacement(tuple.get("emplacement", String.class)).produitId(produitId)
                .codeCip(tuple.get("codeCip", String.class)).libelle(tuple.get("libelle", String.class))
                .prixVente(tuple.get("prixVente", Integer.class)).prixAchat(tuple.get("prixAchat", Integer.class))
                .stock(tuple.get("stock", Integer.class)).quantiteVendue(tuple.get("quantiteVendue", BigDecimal.class))
                .moyenne(tuple.get("moyenne", BigDecimal.class)).quantiteMois(tuple.get("quantite_mois", String.class))
                .moyenneJour(tuple.get("moyenneJour", BigDecimal.class)).dateDerniereVente(extra.getDateDerniereVente())
                .qteDerniereVente(extra.getQteDerniereVente()).dateDernierAchat(extra.getDateDernierAchat())
                .qteDernierAchat(extra.getQteDernierAchat()).dateDernierInventaire(extra.getDateDernierInventaire())
                .qteDernierInventaire(extra.getQteDernierInventaire()).codeGeoArticle(extra.getCodeGeoArticle())
                .classe(extra.getClasse()).stockReserve(extra.getStockReserve()).seuilReserve(extra.getSeuilReserve())
                .seuilMiniRayon(extra.getSeuilMiniRayon()).build();
    }

    private String getQuery() {
        return "SELECT \n" + "  g.str_LIBELLE AS grossiste,\n" + "  z.str_LIBELLEE AS emplacement,\n"
                + "  p.lg_FAMILLE_ID AS produitId,\n" + "  p.int_CIP AS codeCip,\n" + "  p.str_NAME AS libelle,\n"
                + "  p.int_PRICE AS prixVente,\n" + "  p.int_PAF AS prixAchat,\n" + "  f.int_NUMBER AS stock,\n"
                + "  f.lg_EMPLACEMENT_ID AS emplacementId,\n" + "  vAgg.quantiteVendue,\n" + "  vAgg.moyenne,\n"
                + "  vAgg.quantite_mois,\n" + "  vAgg.moyenneJour\n" + "FROM t_famille p\n"
                + "JOIN t_zone_geographique z ON p.lg_ZONE_GEO_ID = z.lg_ZONE_GEO_ID\n"
                + "JOIN t_grossiste g ON p.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID\n"
                + "JOIN t_famille_stock f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID\n" + "LEFT JOIN (\n" + "   SELECT \n"
                + "     produitId,\n"
                + "     SUM(CASE WHEN mois <> MONTH(CURDATE()) THEN qte ELSE 0 END) AS quantiteVendue,\n"
                + "     ROUND(SUM(CASE WHEN mois <> MONTH(CURDATE()) THEN qte ELSE 0 END)/3, 2) AS moyenne,\n"
                + "     GROUP_CONCAT(CONCAT(qte, ':', mois) ORDER BY mois DESC) AS quantite_mois,\n"
                + "     ROUND(SUM(qte) / GREATEST(DATEDIFF(DATE_ADD(CURDATE(), INTERVAL 1 DAY), ?4), 1), 2) AS moyenneJour\n"
                + "   FROM (\n" + "      SELECT \n" + "        d.lg_FAMILLE_ID AS produitId,\n"
                + "        SUM(d.int_QUANTITY) AS qte,\n" + "        MONTH(v.dt_UPDATED) AS mois\n"
                + "      FROM t_preenregistrement_detail d\n"
                + "      JOIN t_preenregistrement v ON d.lg_PREENREGISTREMENT_ID = v.lg_PREENREGISTREMENT_ID\n"
                + "      WHERE v.b_IS_CANCEL = 0\n" + "        AND v.str_STATUT = 'is_Closed'\n"
                + "        AND v.int_PRICE > 0\n"
                + "        AND v.dt_UPDATED >= ?1 AND v.dt_UPDATED < DATE_ADD(CURDATE(), INTERVAL 1 DAY)\n"
                + "      GROUP BY d.lg_FAMILLE_ID, MONTH(v.dt_UPDATED)\n" + "   ) x\n" + "   GROUP BY produitId\n"
                + ") vAgg ON vAgg.produitId = p.lg_FAMILLE_ID\n" + "WHERE p.str_STATUT = 'enable'\n"
                + "  AND (p.int_CIP LIKE ?2 OR p.str_NAME LIKE ?3)\n" + "GROUP BY p.lg_FAMILLE_ID\n"
                + "ORDER BY p.str_NAME;";
    }
}
