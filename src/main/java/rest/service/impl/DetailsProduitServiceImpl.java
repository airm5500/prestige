package rest.service.impl;

import commonTasks.dto.DeconditionnementHistoDTO;
import commonTasks.dto.ProduitDetailleDTO;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.security.PermitAll;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import rest.service.DetailsProduitService;

/**
 * Menu Détails.
 *
 * <p>
 * La liste part des produits principaux detaillables - un detail existe, ou une contenance est renseignee - et joint
 * leur produit detail ({@code lg_FAMILLE_PARENT_ID}). La contenance est portee par le principal ; celle du detail
 * (toujours 1) ne sert pas.
 *
 * <p>
 * L'historique repose sur hmvtproduit : le declenchement d'un déconditionnement ecrit deux mouvements, et celui du
 * PRINCIPAL (type {@code 06}) porte deja la quantite detaillee et les stocks avant/apres - voir
 * {@code DeconditionServiceImpl}. Une ligne par acte, sans reconstruction.
 */
@PermitAll
@Stateless
public class DetailsProduitServiceImpl implements DetailsProduitService {

    /** Garde-fou des editions : bien au-dela de tout catalogue reel de produits detailles. */
    private static final int MAX_LIGNES = 5000;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public List<ProduitDetailleDTO> produitsDetailles(String recherchePP, String recherchePD, int contenance) {
        StringBuilder sql = new StringBuilder("SELECT fp.lg_FAMILLE_ID AS id_pp, fp.int_CIP AS cip_pp,"
                + " fp.str_NAME AS nom_pp, COALESCE(sp.int_NUMBER_AVAILABLE, 0) AS stock_pp,"
                + " fd.lg_FAMILLE_ID AS id_pd, fd.int_CIP AS cip_pd, fd.str_NAME AS nom_pd,"
                + " COALESCE(fp.int_NUMBERDETAIL, 0) AS contenance, COALESCE(sd.int_NUMBER_AVAILABLE, 0) AS stock_pd"
                + " FROM t_famille fp" + " LEFT JOIN t_famille fd ON fd.lg_FAMILLE_PARENT_ID = fp.lg_FAMILLE_ID"
                + "   AND fd.bool_DECONDITIONNE = 1 AND fd.str_STATUT = 'enable'"
                + " LEFT JOIN t_famille_stock sp ON sp.lg_FAMILLE_ID = fp.lg_FAMILLE_ID AND sp.str_STATUT = 'enable'"
                + " LEFT JOIN t_famille_stock sd ON sd.lg_FAMILLE_ID = fd.lg_FAMILLE_ID AND sd.str_STATUT = 'enable'"
                + " WHERE fp.str_STATUT = 'enable' AND fp.bool_DECONDITIONNE = 0"
                + " AND (fd.lg_FAMILLE_ID IS NOT NULL OR fp.bool_DECONDITIONNE_EXIST = 1 OR fp.int_NUMBERDETAIL > 0)");
        if (StringUtils.isNotBlank(recherchePP)) {
            sql.append(" AND (fp.int_CIP LIKE ?1 OR fp.str_NAME LIKE ?1)");
        }
        if (StringUtils.isNotBlank(recherchePD)) {
            sql.append(" AND (fd.int_CIP LIKE ?2 OR fd.str_NAME LIKE ?2)");
        }
        if (contenance > 0) {
            sql.append(" AND fp.int_NUMBERDETAIL = ?3");
        }
        sql.append(" ORDER BY fp.str_NAME");
        Query query = em.createNativeQuery(sql.toString()).setMaxResults(MAX_LIGNES);
        if (StringUtils.isNotBlank(recherchePP)) {
            query.setParameter(1, "%" + recherchePP.trim() + "%");
        }
        if (StringUtils.isNotBlank(recherchePD)) {
            query.setParameter(2, "%" + recherchePD.trim() + "%");
        }
        if (contenance > 0) {
            query.setParameter(3, contenance);
        }
        List<ProduitDetailleDTO> lignes = new ArrayList<>();
        for (Object ligne : query.getResultList()) {
            Object[] r = (Object[]) ligne;
            ProduitDetailleDTO dto = new ProduitDetailleDTO();
            dto.setFamilleIdPP(texte(r[0]));
            dto.setCipPP(texte(r[1]));
            dto.setNomPP(texte(r[2]));
            dto.setStockPP(nombre(r[3]));
            dto.setFamilleIdPD(texte(r[4]));
            dto.setCipPD(texte(r[5]));
            dto.setNomPD(texte(r[6]));
            dto.setContenance(nombre(r[7]));
            dto.setStockPD(nombre(r[8]));
            lignes.add(dto);
        }
        return lignes;
    }

    @Override
    public List<DeconditionnementHistoDTO> historique(String dtStart, String dtEnd) {
        StringBuilder sql = new StringBuilder("SELECT DATE_FORMAT(h.mvtdate, '%d/%m/%Y') AS jour,"
                + " fp.int_CIP AS code_ch, fp.str_NAME AS nom_ch, h.qteMvt AS qte_det,"
                + " fd.int_CIP AS code_det, fd.str_NAME AS nom_det, h.qteDebut AS stock_avant,"
                + " h.qteFinale AS stock_apres,"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))) AS operateur"
                + " FROM hmvtproduit h" + " INNER JOIN t_famille fp ON fp.lg_FAMILLE_ID = h.lg_FAMILLE_ID"
                + " LEFT JOIN t_famille fd ON fd.lg_FAMILLE_PARENT_ID = fp.lg_FAMILLE_ID AND fd.bool_DECONDITIONNE = 1"
                + " LEFT JOIN t_user u ON u.lg_USER_ID = h.lg_USER_ID" + " WHERE h.typeMvt = ?1");
        if (StringUtils.isNotBlank(dtStart)) {
            sql.append(" AND h.mvtdate >= ?2");
        }
        if (StringUtils.isNotBlank(dtEnd)) {
            sql.append(" AND h.mvtdate <= ?3");
        }
        sql.append(" ORDER BY h.createdAt DESC");
        Query query = em.createNativeQuery(sql.toString()).setParameter(1, util.Constant.DECONDTIONNEMENT_NEGATIF)
                .setMaxResults(MAX_LIGNES);
        if (StringUtils.isNotBlank(dtStart)) {
            query.setParameter(2, dtStart.trim());
        }
        if (StringUtils.isNotBlank(dtEnd)) {
            query.setParameter(3, dtEnd.trim());
        }
        List<DeconditionnementHistoDTO> lignes = new ArrayList<>();
        for (Object ligne : query.getResultList()) {
            Object[] r = (Object[]) ligne;
            DeconditionnementHistoDTO dto = new DeconditionnementHistoDTO();
            dto.setDate(texte(r[0]));
            dto.setCodeCh(texte(r[1]));
            dto.setNomCh(texte(r[2]));
            dto.setQteDet(nombre(r[3]));
            dto.setCodeDet(texte(r[4]));
            dto.setNomDet(texte(r[5]));
            dto.setStockAvant(nombre(r[6]));
            dto.setStockApres(nombre(r[7]));
            dto.setUtilisateur(texte(r[8]));
            lignes.add(dto);
        }
        return lignes;
    }

    private static String texte(Object valeur) {
        return valeur == null ? "" : String.valueOf(valeur);
    }

    private static long nombre(Object valeur) {
        return valeur instanceof Number ? ((Number) valeur).longValue() : 0L;
    }
}
