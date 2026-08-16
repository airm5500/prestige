package rest.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import rest.service.ReleveGroupeFactureService;
import rest.service.dto.ReleveGroupeDTO;
import rest.service.dto.ReleveGroupeFactureDTO;
import rest.service.dto.ReleveGroupeLigneDTO;

/**
 * Releve des factures de groupe.
 *
 * Les lignes sont celles de l'ecran "Facture de groupes" : une facture de groupe = un numero de facture, un groupe et
 * une date d'edition, avec le cumul des factures individuelles qu'elle contient. Le regroupement (numero de facture,
 * groupe, jour d'edition) est le MEME que celui de la liste a l'ecran, pour que le papier et l'ecran donnent toujours
 * les memes chiffres.
 *
 * Les bornes de dates sont posees en &gt;= et &lt;= sur le jour, jamais en BETWEEN.
 *
 * @author koben
 */
@Stateless
public class ReleveGroupeFactureServiceImpl implements ReleveGroupeFactureService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /**
     * Une ligne par FACTURE (donc par organisme), et non par facture de groupe : c'est ce niveau de detail qui dit a
     * qui appartient chaque facture. Le regroupement par facture de groupe est fait par l'etat.
     *
     * CHAQUE colonne porte un nom explicite. Deux colonnes s'appellent str_CODE_FACTURE dans la base - celle de la
     * facture de groupe et celle de la facture de l'organisme - et sans alias le moteur refuse la requete ("duplicated
     * sql alias"). Les alias servent uniquement a le lever : les valeurs restent lues par leur position.
     */
    static final String REQUETE = "SELECT g.`lg_GROUPE_ID` AS groupeId, gt.`str_LIBELLE` AS groupeLibelle,"
            + " g.`str_CODE_FACTURE` AS codeFactureGroupe, DATE(g.`dt_CREATED`) AS dateEdition,"
            + " f.`str_CODE_FACTURE` AS codeFacture,"
            + " COALESCE(tp.`str_FULLNAME`, tp.`str_NAME`, '') AS tiersPayant,"
            + " COALESCE(f.`dbl_MONTANT_CMDE`,0) AS montantFacture,"
            + " COALESCE(f.`dbl_MONTANT_PAYE`,0) AS montantRegle,"
            + " COALESCE(f.`dbl_MONTANT_RESTANT`,0) AS montantRestant"
            + " FROM `t_groupe_factures` g JOIN `t_groupe_tierspayant` gt ON gt.`lg_GROUPE_ID` = g.`lg_GROUPE_ID`"
            + " JOIN `t_facture` f ON f.`lg_FACTURE_ID` = g.`lg_FACTURES_ID`"
            + " LEFT JOIN `t_tiers_payant` tp ON tp.`lg_TIERS_PAYANT_ID` = f.`str_CUSTOMER`";

    @Override
    @SuppressWarnings("unchecked")
    public ReleveGroupeFactureDTO releve(String dtStart, String dtEnd, Integer idGroupe, String search,
            String codeFacture) {
        StringBuilder sql = new StringBuilder(REQUETE).append(" WHERE 1=1 ");
        List<Object> valeurs = new ArrayList<>();
        boolean parCodeFacture = StringUtils.isNotEmpty(codeFacture);
        if (parCodeFacture) {
            // l'ecran est ouvert sur UNE facture de groupe precise : la periode n'a plus de sens
            sql.append(" AND g.`str_CODE_FACTURE` = ?").append(valeurs.size() + 1).append(' ');
            valeurs.add(codeFacture);
        } else {
            sql.append(" AND DATE(g.`dt_CREATED`) >= ?").append(valeurs.size() + 1).append(' ');
            valeurs.add(java.sql.Date.valueOf(LocalDate.parse(dtStart)));
            sql.append(" AND DATE(g.`dt_CREATED`) <= ?").append(valeurs.size() + 1).append(' ');
            valeurs.add(java.sql.Date.valueOf(LocalDate.parse(dtEnd)));
        }
        if (idGroupe != null && idGroupe > 0) {
            sql.append(" AND g.`lg_GROUPE_ID` = ?").append(valeurs.size() + 1).append(' ');
            valeurs.add(idGroupe);
        }
        if (StringUtils.isNotEmpty(search)) {
            // meme recherche qu'a l'ecran : nom du groupe, numero de facture de groupe ou
            // numero d'une des factures qu'elle contient
            sql.append(" AND (gt.`str_LIBELLE` LIKE ?").append(valeurs.size() + 1);
            sql.append(" OR g.`str_CODE_FACTURE` LIKE ?").append(valeurs.size() + 2);
            sql.append(" OR f.`str_CODE_FACTURE` LIKE ?").append(valeurs.size() + 3).append(") ");
            valeurs.add(search + "%");
            valeurs.add(search + "%");
            valeurs.add(search + "%");
        }
        sql.append(" ORDER BY gt.`str_LIBELLE` ASC, DATE(g.`dt_CREATED`) ASC, g.`str_CODE_FACTURE` ASC,"
                + " COALESCE(tp.`str_FULLNAME`, tp.`str_NAME`, '') ASC");

        Query q = em.createNativeQuery(sql.toString());
        for (int i = 0; i < valeurs.size(); i++) {
            q.setParameter(i + 1, valeurs.get(i));
        }
        return assembler(q.getResultList());
    }

    /** Repartit les lignes plates renvoyees par la base en un bloc par groupe, et cumule les totaux. */
    private ReleveGroupeFactureDTO assembler(List<Object[]> lignes) {
        ReleveGroupeFactureDTO releve = new ReleveGroupeFactureDTO();
        Map<Integer, ReleveGroupeDTO> parGroupe = new LinkedHashMap<>();
        BigDecimal totalFacture = BigDecimal.ZERO;
        BigDecimal totalRegle = BigDecimal.ZERO;
        BigDecimal totalRestant = BigDecimal.ZERO;
        int nbFactures = 0;

        for (Object[] ligne : lignes) {
            ReleveGroupeDTO groupe = parGroupe.computeIfAbsent(nombreEntier(ligne[0]),
                    id -> new ReleveGroupeDTO(id, texte(ligne[1])));

            BigDecimal facture = montant(ligne[6]);
            BigDecimal regle = montant(ligne[7]);
            BigDecimal restant = montant(ligne[8]);

            groupe.getFactures().add(new ReleveGroupeLigneDTO(texte(ligne[2]), dateCourte(ligne[3]), texte(ligne[4]),
                    texte(ligne[5]), facture, regle, restant, restant.signum() <= 0 ? "Soldée" : "En cours"));
            groupe.setMontantFacture(groupe.getMontantFacture().add(facture));
            groupe.setMontantRegle(groupe.getMontantRegle().add(regle));
            groupe.setMontantRestant(groupe.getMontantRestant().add(restant));

            totalFacture = totalFacture.add(facture);
            totalRegle = totalRegle.add(regle);
            totalRestant = totalRestant.add(restant);
            nbFactures++;
        }

        releve.setGroupes(new ArrayList<>(parGroupe.values()));
        releve.setMontantFacture(totalFacture);
        releve.setMontantRegle(totalRegle);
        releve.setMontantRestant(totalRestant);
        releve.setNbFactures(nbFactures);
        return releve;
    }

    private static String texte(Object valeur) {
        return valeur == null ? "" : valeur.toString();
    }

    private static int nombreEntier(Object valeur) {
        return valeur == null ? 0 : ((Number) valeur).intValue();
    }

    private static BigDecimal montant(Object valeur) {
        if (valeur == null) {
            return BigDecimal.ZERO;
        }
        return valeur instanceof BigDecimal ? (BigDecimal) valeur : BigDecimal.valueOf(((Number) valeur).doubleValue());
    }

    /** La base renvoie une date SQL : le releve l'affiche au format francais, comme la liste a l'ecran. */
    private static String dateCourte(Object valeur) {
        if (valeur == null) {
            return "";
        }
        if (valeur instanceof Date) {
            return new java.text.SimpleDateFormat("dd/MM/yyyy").format((Date) valeur);
        }
        return valeur.toString();
    }
}
