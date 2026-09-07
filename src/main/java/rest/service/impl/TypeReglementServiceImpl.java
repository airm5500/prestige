package rest.service.impl;

import commonTasks.dto.ComboDTO;
import dal.TTypeReglement;
import dal.TTypeReglement_;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import rest.service.TypeReglementService;
import util.Constant;

/**
 *
 * @author koben
 */
@Stateless
public class TypeReglementServiceImpl implements TypeReglementService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private EntityManager getEntityManager() {
        return em;
    }

    @Override
    public List<ComboDTO> findAll() {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ComboDTO> cq = cb.createQuery(ComboDTO.class);
            Root<TTypeReglement> root = cq.from(TTypeReglement.class);
            cq.select(cb.construct(ComboDTO.class, root.get(TTypeReglement_.lgTYPEREGLEMENTID),
                    root.get(TTypeReglement_.strNAME))).orderBy(cb.asc(root.get(TTypeReglement_.strNAME)));
            predicates.add(cb.equal(root.get(TTypeReglement_.strSTATUT), Constant.STATUT_ENABLE));

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<ComboDTO> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {

            return Collections.emptyList();
        }
    }

    @Override
    public List<ComboDTO> findAllWithoutEspece() {
        return findAllExclude(Set.of(Constant.MODE_ESP, Constant.REGL_DIFF, Constant.MODE_DEVISE));

    }

    @Override
    public List<ComboDTO> findAllExclude(Set<String> toExclude) {
        return findAll().stream().filter(e -> !toExclude.contains(e.getId())).collect(Collectors.toList());
    }

    @Override
    public List<String> identifiantsMobileMoney() {
        List<String> depuisLaBase = actifsDeCategorie(util.MobileMoney.CATEGORIE_MOBILE_MONEY);
        if (!depuisLaBase.isEmpty()) {
            return depuisLaBase;
        }
        /*
         * Base pas encore migree : aucun type ne porte la categorie. On retombe sur les operateurs historiques, mais en
         * ne gardant que ceux encore ACTIFS - un mode desactive dans la configuration ne doit plus etre propose, c'est
         * tout l'objet de la demande.
         */
        return actifsParmi(util.MobileMoney.identifiants());
    }

    /** Identifiants des types de reglement ACTIFS portant cette categorie, tries. */
    private List<String> actifsDeCategorie(String categorie) {
        try {
            TypedQuery<String> q = getEntityManager()
                    .createQuery("SELECT t.lgTYPEREGLEMENTID FROM TTypeReglement t WHERE t.strSTATUT = ?1 "
                            + "AND UPPER(t.strCATEGORIE) = ?2 ORDER BY t.lgTYPEREGLEMENTID", String.class);
            q.setParameter(1, Constant.STATUT_ENABLE);
            q.setParameter(2, categorie.toUpperCase(java.util.Locale.ROOT));
            return q.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    /** Parmi des identifiants donnes, ceux que la base declare encore actifs. */
    private List<String> actifsParmi(java.util.Set<String> identifiants) {
        if (identifiants == null || identifiants.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            TypedQuery<String> q = getEntityManager()
                    .createQuery("SELECT t.lgTYPEREGLEMENTID FROM TTypeReglement t WHERE t.strSTATUT = ?1 "
                            + "AND t.lgTYPEREGLEMENTID IN ?2 ORDER BY t.lgTYPEREGLEMENTID", String.class);
            q.setParameter(1, Constant.STATUT_ENABLE);
            q.setParameter(2, identifiants);
            return q.getResultList();
        } catch (Exception e) {
            // Dernier repli : la liste telle quelle, plutot que de priver la vente du mobile money.
            return identifiants.stream().sorted().collect(Collectors.toList());
        }
    }

    /**
     * Types de reglement qui exigent un client sur la vente. L'ecran de vente s'en sert pour decider s'il ouvre le
     * parcours « choisir ou creer un client » : la liste vient de la base, plus jamais du code, de sorte qu'un mode
     * cree par l'officine se regle dans l'ecran des modes de reglement au lieu de demander une livraison.
     */
    @Override
    public List<String> identifiantsClientRequis() {
        try {
            TypedQuery<String> q = getEntityManager()
                    .createQuery("SELECT t.lgTYPEREGLEMENTID FROM TTypeReglement t WHERE t.strSTATUT = ?1 "
                            + "AND t.boolCLIENTREQUIS = TRUE ORDER BY t.lgTYPEREGLEMENTID", String.class);
            q.setParameter(1, Constant.STATUT_ENABLE);
            return q.getResultList();
        } catch (Exception e) {
            // L'ecran garde sa liste de repli : mieux vaut le comportement historique que rien.
            return Collections.emptyList();
        }
    }

}
