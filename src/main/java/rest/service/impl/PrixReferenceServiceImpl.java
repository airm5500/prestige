package rest.service.impl;

import commonTasks.dto.VenteDetailsDTO;
import dal.PrixReference;
import dal.PrixReferenceJournal;
import dal.PrixReferenceJournalAction;
import dal.PrixReferenceType;
import dal.TCompteClientTiersPayant;
import dal.TFamille;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementDetail;
import dal.TTiersPayant;
import dal.TUser;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import job.PosteLocal;
import org.apache.commons.lang3.StringUtils;
import rest.service.PrixReferenceService;
import rest.service.SessionHelperService;
import rest.service.dto.PrixReferenceDTO;
import rest.service.dto.PrixReferenceJournalDTO;
import rest.service.dto.ReferenceTpDTO;
import rest.service.dto.SaisieReferenceResultat;
import rest.service.prixreference.ReferenceCaisse;
import util.Constant;

/**
 *
 * @author koben
 */
@Stateless
public class PrixReferenceServiceImpl implements PrixReferenceService {

    private static final Logger LOG = Logger.getLogger(PrixReferenceServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SessionHelperService sessionHelperService;

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
            prixReference.setValeurTaux(prixReferenceDTO.getTaux());
            em.persist(prixReference);
            // Cas 2 du 03/11 (Q2.6) : la fiche article journalise aussi ses ajouts.
            journaliser(PrixReferenceJournalAction.AJOUT, null, prixReference, null);
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
        if (prixReference == null) {
            return;
        }
        PrixReference avant = ReferenceCaisse.copie(prixReference);
        em.remove(prixReference);
        journaliser(PrixReferenceJournalAction.SUPPRESSION, avant, null, null);
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
        PrixReference avant = ReferenceCaisse.copie(prixReference);
        prixReference.setEnabled(true);
        prixReference.setType(prixReferenceDTO.getType());
        prixReference.setValeur(prixReferenceDTO.getValeur());
        prixReference.setValeurTaux(prixReferenceDTO.getTaux());
        em.merge(prixReference);
        if (ReferenceCaisse.change(avant, prixReference)) {
            journaliser(PrixReferenceJournalAction.MODIFICATION, avant, prixReference, null);
        }
    }

    @Override
    public List<PrixReference> getActifByProduitIdAndTiersPayantIds(String produitId, Set<String> tiersPayantIds) {
        try {
            TypedQuery<PrixReference> t = em.createNamedQuery("PrixReference.findByProduitIdAndTiersPayantIds",
                    PrixReference.class);
            t.setParameter("produitId", produitId);
            t.setParameter("tiersPayantIds", tiersPayantIds);
            return t.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "getActifByProduitIdAndTiersPayantIds", e);
            return List.of();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Cas 2 du 03/11/2026 : saisie a la caisse et journal */
    /* ------------------------------------------------------------------ */

    @Override
    public boolean caisseActive() {
        try {
            TParameters p = em.find(TParameters.class, ReferenceCaisse.CLE_PARAMETRE);
            return p != null && "1".equals(StringUtils.trimToEmpty(p.getStrVALUE()));
        } catch (Exception e) {
            LOG.log(Level.FINE, "caisseActive", e);
            return false;
        }
    }

    /** Les tiers-payants de la vente, par priorite du compte client. */
    private List<TPreenregistrementCompteClientTiersPayent> tiersPayantsDeLaVente(TPreenregistrement vente) {
        if (vente == null || vente.getTPreenregistrementCompteClientTiersPayentCollection() == null) {
            return List.of();
        }
        return vente.getTPreenregistrementCompteClientTiersPayentCollection().stream()
                .filter(v -> v.getLgCOMPTECLIENTTIERSPAYANTID() != null
                        && v.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID() != null)
                .sorted(Comparator
                        .comparing((TPreenregistrementCompteClientTiersPayent v) -> Objects
                                .requireNonNullElse(v.getLgCOMPTECLIENTTIERSPAYANTID().getIntPRIORITY(), 99))
                        .thenComparing(
                                v -> v.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getLgTIERSPAYANTID()))
                .collect(Collectors.toList());
    }

    @Override
    public List<ReferenceTpDTO> referencesPourVente(String venteId) {
        return referencesPourVente(venteId == null ? null : em.find(TPreenregistrement.class, venteId));
    }

    private List<ReferenceTpDTO> referencesPourVente(TPreenregistrement vente) {
        List<ReferenceTpDTO> resultat = new ArrayList<>();
        List<TPreenregistrementCompteClientTiersPayent> tps = tiersPayantsDeLaVente(vente);
        if (tps.isEmpty() || vente.getTPreenregistrementDetailCollection() == null) {
            return resultat;
        }
        Set<String> tpIds = tps.stream()
                .map(v -> v.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getLgTIERSPAYANTID())
                .collect(Collectors.toSet());
        for (TPreenregistrementDetail ligne : vente.getTPreenregistrementDetailCollection()) {
            resultat.addAll(referencesDeLaLigne(ligne, tps, tpIds));
        }
        return resultat;
    }

    private List<ReferenceTpDTO> referencesDeLaLigne(TPreenregistrementDetail ligne,
            List<TPreenregistrementCompteClientTiersPayent> tps, Set<String> tpIds) {
        List<ReferenceTpDTO> lignes = new ArrayList<>();
        TFamille produit = ligne.getLgFAMILLEID();
        if (produit == null) {
            return lignes;
        }
        Map<String, PrixReference> existantes = new HashMap<>();
        for (PrixReference p : getActifByProduitIdAndTiersPayantIds(produit.getLgFAMILLEID(), new HashSet<>(tpIds))) {
            existantes.put(p.getTiersPayant().getLgTIERSPAYANTID(), p);
        }
        int prixVente = Objects.requireNonNullElse(ligne.getIntPRICEUNITAIR(), 0);
        for (TPreenregistrementCompteClientTiersPayent v : tps) {
            TCompteClientTiersPayant compte = v.getLgCOMPTECLIENTTIERSPAYANTID();
            TTiersPayant tp = compte.getLgTIERSPAYANTID();
            ReferenceTpDTO r = new ReferenceTpDTO();
            r.setDetailId(ligne.getLgPREENREGISTREMENTDETAILID());
            r.setTpId(tp.getLgTIERSPAYANTID());
            r.setCompteTpId(compte.getLgCOMPTECLIENTTIERSPAYANTID());
            r.setLibelle(StringUtils.defaultIfBlank(tp.getStrNAME(), tp.getStrFULLNAME()));
            PrixReference existante = existantes.get(tp.getLgTIERSPAYANTID());
            // Taux par defaut : celui que le moteur applique sans reference (taux de la vente pour ce tiers-payant,
            // sinon taux du compte client).
            int tauxDefaut = Objects.requireNonNullElse(v.getIntPERCENT(),
                    Objects.requireNonNullElse(compte.getIntPOURCENTAGE(), 0));
            if (existante == null) {
                r.setDefaut(true);
                r.setValeur(prixVente);
                r.setTaux(tauxDefaut);
                r.setType(null);
            } else {
                r.setDefaut(false);
                r.setPrixReferenceId(existante.getId());
                r.setType(existante.getType() == null ? null : existante.getType().name());
                // Une reference de type TAUX n'a pas de prix propre : c'est le prix de vente qui sert de base.
                r.setValeur(existante.getType() == PrixReferenceType.TAUX ? prixVente : existante.getValeur());
                r.setTaux(existante.getValeurTaux() == null || existante.getType() == PrixReferenceType.PRIX_REFERENCE
                        ? tauxDefaut : Math.round(existante.getValeurTaux()));
            }
            lignes.add(r);
        }
        return lignes;
    }

    @Override
    public void completerReferencesTp(List<VenteDetailsDTO> lignes, TPreenregistrement vente) {
        if (lignes == null || lignes.isEmpty() || vente == null || vente.getLgTYPEVENTEID() == null
                || !Constant.VENTE_ASSURANCE_ID.equals(vente.getLgTYPEVENTEID().getLgTYPEVENTEID())
                || !caisseActive()) {
            return;
        }
        try {
            List<TPreenregistrementCompteClientTiersPayent> tps = tiersPayantsDeLaVente(vente);
            if (tps.isEmpty()) {
                return;
            }
            Set<String> tpIds = tps.stream()
                    .map(v -> v.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getLgTIERSPAYANTID())
                    .collect(Collectors.toSet());
            Map<String, TPreenregistrementDetail> details = new HashMap<>();
            if (vente.getTPreenregistrementDetailCollection() != null) {
                vente.getTPreenregistrementDetailCollection()
                        .forEach(d -> details.put(d.getLgPREENREGISTREMENTDETAILID(), d));
            }
            for (VenteDetailsDTO dto : lignes) {
                TPreenregistrementDetail d = details.get(dto.getLgPREENREGISTREMENTDETAILID());
                if (d != null) {
                    dto.setReferencesTp(referencesDeLaLigne(d, tps, tpIds));
                }
            }
        } catch (Exception e) {
            // La grille de vente ne doit jamais tomber a cause des colonnes de reference.
            LOG.log(Level.WARNING, "completerReferencesTp", e);
        }
    }

    @Override
    public SaisieReferenceResultat saisieCaisse(String venteId, String detailId, String tiersPayantId, Integer valeur,
            Integer taux) {
        if (StringUtils.isBlank(tiersPayantId)) {
            return SaisieReferenceResultat.refus("Le tiers-payant est obligatoire.");
        }
        TPreenregistrementDetail ligne = detailId == null ? null : em.find(TPreenregistrementDetail.class, detailId);
        if (ligne == null || ligne.getLgPREENREGISTREMENTID() == null || venteId == null
                || !venteId.equals(ligne.getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID())) {
            return SaisieReferenceResultat.refus("Ligne de vente introuvable.");
        }
        TPreenregistrement vente = ligne.getLgPREENREGISTREMENTID();
        if (Constant.STATUT_IS_CLOSED.equals(vente.getStrSTATUT())) {
            return SaisieReferenceResultat.refus("La vente est d\u00e9j\u00e0 cl\u00f4tur\u00e9e.");
        }
        if (vente.getLgTYPEVENTEID() == null
                || !Constant.VENTE_ASSURANCE_ID.equals(vente.getLgTYPEVENTEID().getLgTYPEVENTEID())) {
            return SaisieReferenceResultat.refus("La saisie n'est possible qu'en vente assurance.");
        }
        boolean tpDeLaVente = tiersPayantsDeLaVente(vente).stream().anyMatch(v -> tiersPayantId
                .equals(v.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getLgTIERSPAYANTID()));
        if (!tpDeLaVente) {
            return SaisieReferenceResultat.refus("Ce tiers-payant n'est pas sur la vente.");
        }
        int prixVente = Objects.requireNonNullElse(ligne.getIntPRICEUNITAIR(), 0);
        String motif = ReferenceCaisse.motifRefus(valeur, taux, prixVente);
        if (motif != null) {
            return SaisieReferenceResultat.refus(motif);
        }
        TFamille produit = ligne.getLgFAMILLEID();
        Optional<PrixReference> existante = getByProduitIdAndTiersPayantId(produit.getLgFAMILLEID(), tiersPayantId);
        PrixReference reference;
        if (existante.isPresent()) {
            reference = existante.get();
            PrixReference avant = ReferenceCaisse.copie(reference);
            reference.setEnabled(true);
            reference.setType(ReferenceCaisse.typeCaisse());
            reference.setValeur(valeur);
            reference.setValeurTaux((float) taux);
            em.merge(reference);
            if (ReferenceCaisse.change(avant, reference)) {
                journaliser(PrixReferenceJournalAction.MODIFICATION, avant, reference, venteId);
            }
        } else {
            reference = new PrixReference();
            reference.setEnabled(true);
            reference.setType(ReferenceCaisse.typeCaisse());
            reference.setProduit(produit);
            reference.setTiersPayant(em.find(TTiersPayant.class, tiersPayantId));
            reference.setValeur(valeur);
            reference.setValeurTaux((float) taux);
            em.persist(reference);
            journaliser(PrixReferenceJournalAction.AJOUT, null, reference, venteId);
        }
        return SaisieReferenceResultat.ecrite(new PrixReferenceDTO(reference));
    }

    private void journaliser(PrixReferenceJournalAction action, PrixReference avant, PrixReference apres,
            String venteId) {
        try {
            TUser utilisateur = sessionHelperService == null ? null : sessionHelperService.getCurrentUser();
            PrixReferenceJournal j = ReferenceCaisse.journal(action, avant, apres, utilisateur, venteId,
                    PosteLocal.nomMachine());
            if (j.getProduitId() == null || j.getTiersPayantId() == null) {
                return;
            }
            em.persist(j);
        } catch (Exception e) {
            // Le journal ne doit jamais faire echouer l'ecriture du prix de reference.
            LOG.log(Level.WARNING, "journal prix de reference", e);
        }
    }

    @Override
    public List<PrixReferenceJournalDTO> journalProduit(String produitId) {
        try {
            TypedQuery<PrixReferenceJournal> t = em.createNamedQuery("PrixReferenceJournal.findByProduitId",
                    PrixReferenceJournal.class);
            t.setParameter("produitId", produitId);
            t.setMaxResults(500);
            Map<String, String> libelles = new HashMap<>();
            Map<String, String> references = new HashMap<>();
            List<PrixReferenceJournalDTO> resultat = new ArrayList<>();
            for (PrixReferenceJournal j : t.getResultList()) {
                String libelle = libelles.computeIfAbsent(j.getTiersPayantId(), id -> {
                    TTiersPayant tp = em.find(TTiersPayant.class, id);
                    return tp == null ? id : StringUtils.defaultIfBlank(tp.getStrNAME(), tp.getStrFULLNAME());
                });
                String ref = j.getVenteId() == null ? null : references.computeIfAbsent(j.getVenteId(), id -> {
                    TPreenregistrement v = em.find(TPreenregistrement.class, id);
                    return v == null || StringUtils.isBlank(v.getStrREF()) ? id : v.getStrREF();
                });
                resultat.add(new PrixReferenceJournalDTO(j, libelle, ref));
            }
            return resultat;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "journalProduit", e);
            return List.of();
        }
    }

}
