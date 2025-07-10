package rest.service.impl;

import commonTasks.dto.VenteReglementDTO;
import commonTasks.dto.VenteReglementReportDTO;
import dal.MvtTransaction;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TTypeReglement;
import dal.VenteReglement;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.collections.CollectionUtils;
import rest.service.VenteReglementService;
import util.Constant;
import util.DateCommonUtils;

/**
 *
 * @author koben
 */
@Stateless
public class VenteReglementServiceImpl implements VenteReglementService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public List<VenteReglement> getByVenteId(String venteId) {
        TypedQuery<VenteReglement> query = em
                .createQuery("SELECT o FROM VenteReglement o WHERE o.preenregistrement.lgPREENREGISTREMENTID=?1",
                        VenteReglement.class)
                .setParameter(1, venteId);
        return query.getResultList();
    }

    private void createNew(VenteReglement venteReglement) {
        em.persist(venteReglement);
    }

    @Override
    public void createNew(TPreenregistrement preenregistrement, TTypeReglement typeReglement, MvtTransaction mt) {
        VenteReglement venteReglement = new VenteReglement();
        venteReglement.setMontant(mt.getMontantPaye());
        venteReglement.setTypeReglement(typeReglement);
        venteReglement.setPreenregistrement(preenregistrement);
        venteReglement.setMvtDate(DateCommonUtils.convertDateToLocalDateTime(preenregistrement.getDtUPDATED()));
        venteReglement.setMontantAttentu(mt.getMontantRegle());
        venteReglement.setUgAmount(mt.getMontantttcug());
        venteReglement.setUgNetAmount(mt.getMontantnetug());
        venteReglement.setAmountNonCa(computeSumOfExclusVenteItemFromCa(preenregistrement));
        if (typeReglement.getLgTYPEREGLEMENTID().equals("1")) {
            venteReglement.setMontantVerse(mt.getMontantVerse());
        } else {
            venteReglement.setMontantVerse(venteReglement.getMontantAttentu());
        }

        em.persist(venteReglement);
    }

    @Override
    public void createCopyVenteReglement(TPreenregistrement tp, VenteReglement venteReglement) {
        VenteReglement copy = new VenteReglement();
        copy.setMontant(venteReglement.getMontant() * (-1));
        copy.setTypeReglement(venteReglement.getTypeReglement());
        copy.setPreenregistrement(tp);
        copy.setMvtDate(DateCommonUtils.convertDateToLocalDateTime(tp.getDtUPDATED()));
        copy.setMontantAttentu(venteReglement.getMontantAttentu() * (-1));
        copy.setUgAmount(venteReglement.getUgAmount() * (-1));
        copy.setUgNetAmount(venteReglement.getUgNetAmount() * (-1));
        copy.setAmountNonCa(venteReglement.getAmountNonCa() * (-1));
        copy.setFlagedAmount(venteReglement.getFlagedAmount() * (-1));
        this.createNew(copy);
    }

    @Override
    public void createVenteReglement(TPreenregistrement tp, VenteReglementDTO p, TTypeReglement typeReglement,
            LocalDateTime mvtDate) {
        VenteReglement venteReglement = new VenteReglement();
        venteReglement.setMontant(p.getMontant());
        venteReglement.setAmountNonCa(p.getAmountNonCa());
        venteReglement.setTypeReglement(typeReglement);
        venteReglement.setPreenregistrement(tp);
        venteReglement.setMvtDate(mvtDate);
        venteReglement.setMontantAttentu(p.getMontantAttentu());
        venteReglement.setUgAmount(p.getMontantTttcug());
        venteReglement.setUgNetAmount(p.getMontantnetug());
        venteReglement.setMontantVerse(p.getMontant());
        this.createNew(venteReglement);
    }

    private int computeSumOfExclusVenteItemFromCa(TPreenregistrement tp) {
        return tp.getTPreenregistrementDetailCollection().stream().filter(
                e -> !e.getBoolACCOUNT() && tp.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Constant.VENTE_COMPTANT_ID))
                .mapToInt(TPreenregistrementDetail::getIntPRICE).sum();
    }

    @Override
    public List<VenteReglementReportDTO> buildFromEntities(List<VenteReglement> reglements) {
        if (CollectionUtils.isNotEmpty(reglements)) {
            return reglements.stream().map(e -> {
                TTypeReglement tTypeReglement = e.getTypeReglement();
                VenteReglementReportDTO o = new VenteReglementReportDTO();
                o.setTypeReglementLibelle(tTypeReglement.getStrDESCRIPTION());
                o.setTypeReglement(tTypeReglement.getLgTYPEREGLEMENTID());
                o.setLibelle(o.getTypeReglementLibelle());
                o.setMontant(e.getMontant());
                o.setMontantAttentu(e.getMontantAttentu());
                o.setMontantVerse(Objects.requireNonNullElse(e.getMontantVerse(), 0));
                return o;
            }).collect(Collectors.toList());
        }
        return List.of();
    }
}
