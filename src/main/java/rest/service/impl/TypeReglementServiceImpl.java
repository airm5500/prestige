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

}
