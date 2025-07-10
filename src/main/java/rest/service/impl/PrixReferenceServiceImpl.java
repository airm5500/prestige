package rest.service.impl;

import dal.PrixReference;
import dal.PrixReferenceType;
import dal.PrixReferenceVente;
import dal.TCompteClientTiersPayant;
import dal.TFamille;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TTiersPayant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import rest.service.PrixReferenceService;
import rest.service.dto.PrixReferenceDTO;

/**
 *
 * @author koben
 */
@Stateless
public class PrixReferenceServiceImpl implements PrixReferenceService {

    private static final Logger LOG = Logger.getLogger(PrixReferenceServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public void add(PrixReferenceDTO prixReferenceDTO) {
        if (StringUtils.isNotEmpty(prixReferenceDTO.getId())) {
            update(prixReferenceDTO);
        } else {
            PrixReference prixReference = new PrixReference();
            prixReference.setEnabled(true);
            prixReference.setType(prixReferenceDTO.getType());
            prixReference.setProduit(new TFamille(prixReferenceDTO.getProduitId()));
            prixReference.setTiersPayant(new TTiersPayant(prixReferenceDTO.getTiersPayantId()));
            prixReference.setValeur(prixReferenceDTO.getValeur());
            em.persist(prixReference);
        }

    }

    @Override
    public void changeStatut(String id, Boolean enabled) {
        PrixReference prixReference = em.find(PrixReference.class, id);
        prixReference.setEnabled(enabled);
        em.merge(prixReference);
    }

    @Override
    public void delete(String id) {
        PrixReference prixReference = em.find(PrixReference.class, id);
        em.remove(prixReference);
    }

    @Override
    public List<PrixReferenceDTO> getByProduitId(String produitId) {
        try {
            TypedQuery<PrixReference> t = em.createNamedQuery("PrixReference.findByProduitId", PrixReference.class);
            t.setParameter("produitId", produitId);
            return t.getResultStream().map(PrixReferenceDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.info(e.getLocalizedMessage());
            return List.of();
        }
    }

    @Override
    public Optional<PrixReference> getByProduitIdAndTiersPayantId(String produitId, String tiersPayantId) {
        try {
            TypedQuery<PrixReference> t = em.createNamedQuery("PrixReference.findByProduitIdAndTiersPayantId",
                    PrixReference.class);
            t.setParameter("produitId", produitId);
            t.setParameter("tiersPayantId", tiersPayantId);
            return Optional.ofNullable(t.getSingleResult());
        } catch (Exception e) {
            LOG.info(e.getLocalizedMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<PrixReference> getActifByProduitIdAndTiersPayantId(String produitId, String tiersPayantId) {
        return getByProduitIdAndTiersPayantId(produitId, tiersPayantId).filter(PrixReference::isEnabled);
    }

    @Override
    public void update(PrixReferenceDTO prixReferenceDTO) {
        PrixReference prixReference = em.find(PrixReference.class, prixReferenceDTO.getId());
        prixReference.setEnabled(true);
        prixReference.setType(prixReferenceDTO.getType());
        prixReference.setValeur(prixReferenceDTO.getValeur());
        em.merge(prixReference);
    }

    @Override
    public void updatePrixReference(TPreenregistrementDetail preenregistrementDetail,
            List<TCompteClientTiersPayant> clientTiersPayants) {
        if (CollectionUtils.isNotEmpty(clientTiersPayants)) {

            String produitId = preenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID();
            clientTiersPayants.forEach(comptClient -> {
                String tTiersPayantId = comptClient.getLgTIERSPAYANTID().getLgTIERSPAYANTID();
                getByProduitIdAndTiersPayantId(produitId, tTiersPayantId).ifPresent(prixReference -> {
                    preenregistrementDetail.getPrixReferenceVentes()
                            .add(createPrixReferenceVente(preenregistrementDetail, produitId, prixReference,
                                    comptClient.getLgCOMPTECLIENTTIERSPAYANTID()));

                });

            });
        }

    }

    private PrixReferenceVente createPrixReferenceVente(TPreenregistrementDetail preenregistrementDetail,
            String produitId, PrixReference prixReference, String compteClientTiersPayantId) {
        int unitPrice = computeUniPriceFromPrixReference(prixReference, preenregistrementDetail.getIntPRICEUNITAIR());
        PrixReferenceVente prixReferenceVente = new PrixReferenceVente();
        prixReferenceVente.setPreenregistrementDetail(preenregistrementDetail);
        prixReferenceVente.setPrixReference(prixReference);
        prixReferenceVente.setProduitId(produitId);
        prixReferenceVente.setCompteClientTiersPayantId(compteClientTiersPayantId);
        prixReferenceVente.setPrixUni(unitPrice);
        prixReferenceVente.setMontant(preenregistrementDetail.getIntQUANTITY() * unitPrice);

        return prixReferenceVente;
    }

    private int computeUniPriceFromPrixReference(PrixReference prixReference, int incomingPrice) {
        if (prixReference.getType() == PrixReferenceType.PRIX_REFERENCE) {
            return prixReference.getValeur();

        }
        System.err.println("incomingPrice " + incomingPrice);
        int amm = Math.round(incomingPrice * prixReference.getTaux());
        System.err.println(" amm " + amm + " taux " + prixReference.getTaux());
        return Math.round(incomingPrice * prixReference.getTaux());

    }

    @Override
    public List<PrixReference> getActifByProduitIdAndTiersPayantIds(String produitId, Set<String> tiersPayantIds) {
        try {
            TypedQuery<PrixReference> t = em.createNamedQuery("PrixReference.findByProduitIdAndTiersPayantIds",
                    PrixReference.class);
            t.setParameter("produitId", produitId);
            t.setParameter("tiersPayantIds", buildInClose(tiersPayantIds));
            return t.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "getActifByProduitIdAndTiersPayantIds", e);
            return List.of();
        }
    }

    @Override
    public void updatePrixReference(TPreenregistrementDetail preenregistrementDetail) {
        preenregistrementDetail.getPrixReferenceVentes().forEach(prixReferenceVente -> {
            prixReferenceVente.setMontant(preenregistrementDetail.getIntQUANTITY() * prixReferenceVente.getPrixUni());
            em.merge(prixReferenceVente);
        });
    }

    @Override
    public void removeTiersPayantFromVente(TPreenregistrement preenregistrement, String tierspayantId) {
        preenregistrement.getTPreenregistrementDetailCollection().stream()
                .flatMap(e -> e.getPrixReferenceVentes().stream())
                .filter(prix -> prix.getCompteClientTiersPayantId().equals(tierspayantId)).forEach(em::remove);

    }

    private String buildInClose(Set<String> tiersPayantIds) {
        return String.join(",", tiersPayantIds);

    }
}
