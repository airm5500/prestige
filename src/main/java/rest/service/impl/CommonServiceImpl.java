/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import bll.Util;
import bll.common.Parameter;
import commonTasks.dto.CategorieAyantdroitDTO;
import commonTasks.dto.ComboDTO;
import commonTasks.dto.ReglementDTO;
import commonTasks.dto.RemiseDTO;
import commonTasks.dto.RisqueDTO;
import commonTasks.dto.TypeRemiseDTO;
import commonTasks.dto.UserDTO;
import dal.GammeProduit;
import dal.GammeProduit_;
import dal.Groupefournisseur;
import dal.Laboratoire;
import dal.Laboratoire_;
import dal.TCategorieAyantdroit;
import dal.TCategorieAyantdroit_;
import dal.TFamillearticle;
import dal.TFamillearticle_;
import dal.TGrossiste;
import dal.TGrossiste_;
import dal.TImprimante;
import dal.TMotifRetour;
import dal.TNatureVente;
import dal.TOfficine;
import dal.TParameters;
import dal.TPrivilege;
import dal.TRemise;
import dal.TRisque;
import dal.TRisque_;
import dal.TTypeReglement;
import dal.TTypeReglement_;
import dal.TTypeRemise;
import dal.TTypeRisque_;
import dal.TTypeVente;
import dal.TTypeVente_;
import dal.TUser;
import dal.TUser_;
import dal.TVille;
import dal.TVille_;
import dal.TZoneGeographique;
import dal.TZoneGeographique_;
import dal.MotifAjustement;
import dal.MotifRetourCarnet;
import dal.enumeration.Statut;
import java.awt.print.PrinterJob;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateful;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.print.PrintService;
import javax.print.PrintServiceLookup;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.CommonService;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author Kobena
 */
@Stateful
public class CommonServiceImpl implements Serializable, CommonService {

    private static final Logger LOG = Logger.getLogger(CommonServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    private PrintService service;
    private TImprimante imprimante;
    private Boolean afficheeurActif;
    private LocalDate dateUpdat;
    private Integer maximunproduit;
    private Boolean voirNumeroTicket;
    private Boolean sansBon;

    public LocalDate getDateUpdat() {
        return dateUpdat;
    }

    public void setDateUpdat(LocalDate dateUpdat) {
        this.dateUpdat = dateUpdat;
    }

    public Boolean getSansBon() {
        return sansBon;
    }

    public void setSansBon(Boolean sansBon) {
        this.sansBon = sansBon;
    }

    public Integer getNombreTickets() {
        return nombreTickets;
    }

    public void setNombreTickets(Integer nombreTickets) {
        this.nombreTickets = nombreTickets;
    }

    public boolean isAfficheeurActif() {
        return afficheeurActif;
    }

    public void setAfficheeurActif(boolean afficheeurActif) {
        this.afficheeurActif = afficheeurActif;
    }

    public EntityManager getEntityManager() {
        return em;
    }

    public TImprimante getImprimante() {
        return imprimante;
    }

    public void setImprimante(TImprimante imprimante) {
        this.imprimante = imprimante;
    }

    public Boolean getAfficheeurActif() {
        return afficheeurActif;
    }

    public void setAfficheeurActif(Boolean afficheeurActif) {
        this.afficheeurActif = afficheeurActif;
    }

    public Integer getMaximunproduit() {
        return maximunproduit;
    }

    public void setMaximunproduit(Integer maximunproduit) {
        this.maximunproduit = maximunproduit;
    }

    public Boolean getVoirNumeroTicket() {
        return voirNumeroTicket;
    }

    public void setVoirNumeroTicket(Boolean voirNumeroTicket) {
        this.voirNumeroTicket = voirNumeroTicket;
    }

    @Override
    public List<TNatureVente> findNatureVente() {
        TypedQuery<TNatureVente> tq = getEntityManager().createNamedQuery("TNatureVente.findByStrSTATUT",
                TNatureVente.class);
        tq.setParameter("strSTATUT", Constant.STATUT_ENABLE);
        return tq.getResultList();
    }

    @Override
    public List<TTypeVente> findTypeVente() {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TTypeVente> cq = cb.createQuery(TTypeVente.class);
            Root<TTypeVente> root = cq.from(TTypeVente.class);
            cq.select(root);
            cq.where(cb.and(cb.equal(root.get(TTypeVente_.strSTATUT), "enable"),
                    cb.notEqual(root.get(TTypeVente_.lgTYPEVENTEID), Util.DEPOT_EXTENSION),
                    cb.notEqual(root.get(TTypeVente_.lgTYPEVENTEID), Util.DEPOT_AGREE)));
            Query q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TTypeVente> typeventeDevis() {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TTypeVente> cq = cb.createQuery(TTypeVente.class);
            Root<TTypeVente> root = cq.from(TTypeVente.class);
            cq.select(root);
            cq.where(cb.and(cb.equal(root.get(TTypeVente_.strSTATUT), "enable"),
                    cb.notEqual(root.get(TTypeVente_.lgTYPEVENTEID), Util.DEPOT_EXTENSION),
                    cb.notEqual(root.get(TTypeVente_.lgTYPEVENTEID), Util.DEPOT_AGREE),
                    cb.notEqual(root.get(TTypeVente_.lgTYPEVENTEID), Util.VENTE_ASSURANCE)));
            Query q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TTypeVente> findAllTypeVente() {
        TypedQuery<TTypeVente> tq = getEntityManager().createNamedQuery("TTypeVente.findByStrSTATUT", TTypeVente.class);
        tq.setParameter("strSTATUT", Constant.STATUT_ENABLE);
        return tq.getResultList();
    }

    @Override
    public List<TypeRemiseDTO> findAllTTypeRemises() {
        TypedQuery<TTypeRemise> tq = getEntityManager().createNamedQuery("TTypeRemise.findByStrSTATUT",
                TTypeRemise.class);
        tq.setParameter("strSTATUT", Constant.STATUT_ENABLE);
        List<TTypeRemise> list = tq.getResultList();
        return list.stream().map(TypeRemiseDTO::new).collect(Collectors.toList());
    }

    @Override
    public List<RemiseDTO> findAllRemise(String typeId) {
        TypedQuery<TRemise> tq = getEntityManager().createNamedQuery("TRemise.findByStrSTATUT", TRemise.class);
        tq.setParameter("strSTATUT", Constant.STATUT_ENABLE);
        tq.setParameter("typeId", typeId);
        List<TRemise> list = tq.getResultList();
        return list.stream().map(RemiseDTO::new).collect(Collectors.toList());
    }

    @Override
    public List<ReglementDTO> findReglements() {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ReglementDTO> cq = cb.createQuery(ReglementDTO.class);
            Root<TTypeReglement> root = cq.from(TTypeReglement.class);
            cq.select(cb.construct(ReglementDTO.class, root.get(TTypeReglement_.lgTYPEREGLEMENTID),
                    root.get(TTypeReglement_.strNAME))).orderBy(cb.asc(root.get(TTypeReglement_.strNAME)));
            cq.where(cb.and(cb.equal(root.get(TTypeReglement_.strSTATUT), "enable"),
                    cb.notEqual(root.get(TTypeReglement_.lgTYPEREGLEMENTID), Constant.MODE_DEVISE)));
            Query q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public long findUsers(String query, String empl) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TUser> root = cq.from(TUser.class);
            cq.select(cb.count(root));
            predicates.add(cb.and(cb.equal(root.get(TUser_.strSTATUT), "enable")));
            predicates.add(cb.and(cb.equal(root.get(TUser_.lgEMPLACEMENTID).get("lgEMPLACEMENTID"), empl)));

            if (query != null && !query.equals("")) {
                predicates.add(cb.or(cb.like(root.get(TUser_.strFIRSTNAME), query + "%"),
                        cb.like(root.get(TUser_.strLASTNAME), query + "%"),
                        cb.like(cb.concat(cb.concat(root.get(TUser_.strFIRSTNAME), " "), root.get(TUser_.strLASTNAME)),
                                query + "%")));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);

            return ((Long) q.getSingleResult()).intValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public List<UserDTO> findUsers(int start, int limit, String query, String empl) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<UserDTO> cq = cb.createQuery(UserDTO.class);
            Root<TUser> root = cq.from(TUser.class);
            cq.select(cb.construct(UserDTO.class, root.get(TUser_.lgUSERID), root.get(TUser_.strFIRSTNAME),
                    root.get(TUser_.strLASTNAME))).orderBy(cb.asc(root.get(TUser_.strFIRSTNAME)));
            predicates.add(cb.and(cb.equal(root.get(TUser_.strSTATUT), "enable")));
            predicates.add(cb.and(cb.equal(root.get(TUser_.lgEMPLACEMENTID).get("lgEMPLACEMENTID"), empl)));

            if (query != null && !query.equals("")) {
                predicates.add(cb.or(cb.like(root.get(TUser_.strFIRSTNAME), query + "%"),
                        cb.like(root.get(TUser_.strLASTNAME), query + "%"),
                        cb.like(cb.concat(cb.concat(root.get(TUser_.strFIRSTNAME), " "), root.get(TUser_.strLASTNAME)),
                                query + "%")));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            if (limit > 0) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public boolean hasAuthority(List<TPrivilege> lstTPrivilege, String authorityName) {
        java.util.function.Predicate<TPrivilege> p = e -> e.getStrNAME().equalsIgnoreCase(authorityName);
        return lstTPrivilege.stream().anyMatch(p);
    }

    @Override
    public boolean canShowAllSales(List<TPrivilege> lstTPrivilege) {
        java.util.function.Predicate<TPrivilege> p = e -> e.getStrNAME()
                .equalsIgnoreCase(Parameter.P_SHOW_ALL_ACTIVITY);
        return lstTPrivilege.stream().anyMatch(p);
    }

    private Integer nombreTickets;

    @Override
    public int nombreTickets(String param) {
        try {
            if (nombreTickets == null) {
                TParameters tp = getEntityManager().find(TParameters.class, param);
                nombreTickets = Integer.valueOf(tp.getStrVALUE());
            }
            return nombreTickets;
        } catch (Exception e) {
            nombreTickets = 1;
            return nombreTickets;
        }

    }

    @Override
    public boolean voirNumeroTicket() {
        try {
            if (voirNumeroTicket == null) {
                TParameters tp = getEntityManager().find(TParameters.class, Parameter.KEY_SHOW_NUMERO_TICKET);
                voirNumeroTicket = (Integer.parseInt(tp.getStrVALUE()) == 1);
            }
            return voirNumeroTicket;
        } catch (Exception e) {
            voirNumeroTicket = false;
            return voirNumeroTicket;
        }
    }

    @Override
    public Integer maximunproduit() {
        try {
            if (maximunproduit == null) {
                TParameters tp = getEntityManager().find(TParameters.class, "KEY_MAX_VALUE_VENTE");
                maximunproduit = Integer.valueOf(tp.getStrVALUE());
            }
            return maximunproduit;
        } catch (Exception e) {
            maximunproduit = 1000;
            return maximunproduit;
        }
    }

    public TOfficine getOfficine() {
        return findOfficine();
    }

    @Override
    public TOfficine findOfficine() {

        return getEntityManager().find(TOfficine.class, "1");
    }

    @Override
    public PrintService findPrintService(String printerName) {
        printerName = printerName.toLowerCase();
        if (service == null) {
            PrintService[] services = PrinterJob.lookupPrintServices();
            for (int index = 0; service == null && index < services.length; index++) {
                if (services[index].getName().toLowerCase().contains(printerName)) {
                    service = services[index];
                }
            }
        }

        return service;
    }

    @Override
    public PrintService findPrintService() {
        if (service == null) {
            service = PrintServiceLookup.lookupDefaultPrintService();
        }

        return service;
    }

    public PrintService getService() {
        return service;
    }

    public void setService(PrintService service) {
        this.service = service;
    }

    @Override
    public TImprimante findImprimanteByName() {
        if (imprimante == null && service != null) {
            try {

                Query qry = getEntityManager().createQuery("SELECT t FROM TImprimante t WHERE t.strNAME = ?1 ")
                        .setParameter(1, service.getName());
                if (!qry.getResultList().isEmpty()) {
                    imprimante = (TImprimante) qry.getSingleResult();
                }
            } catch (Exception e) {
            }
        }

        return imprimante;
    }

    @Override
    public List<TVille> findVilles(String query) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TVille> cq = cb.createQuery(TVille.class);
            Root<TVille> root = cq.from(TVille.class);
            cq.select(root).orderBy(cb.asc(root.get(TVille_.strName)));
            if (query != null && !query.equals("")) {
                predicates.add(cb.like(root.get(TVille_.strName), query + "%"));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<RisqueDTO> findRisques(String query) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<RisqueDTO> cq = cb.createQuery(RisqueDTO.class);
            Root<TRisque> root = cq.from(TRisque.class);
            cq.select(cb.construct(RisqueDTO.class, root.get(TRisque_.lgRISQUEID), root.get(TRisque_.strLIBELLERISQUE),
                    root.get(TRisque_.lgTYPERISQUEID).get(TTypeRisque_.lgTYPERISQUEID),
                    root.get(TRisque_.lgTYPERISQUEID).get(TTypeRisque_.strNAME)))
                    .orderBy(cb.asc(root.get(TRisque_.strLIBELLERISQUE)));
            if (query != null && !query.equals("")) {
                predicates.add(cb.like(root.get(TRisque_.strLIBELLERISQUE), query + "%"));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    @Override
    public List<CategorieAyantdroitDTO> findCategorieAyantdroits(String query) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<CategorieAyantdroitDTO> cq = cb.createQuery(CategorieAyantdroitDTO.class);
            Root<TCategorieAyantdroit> root = cq.from(TCategorieAyantdroit.class);
            cq.select(
                    cb.construct(CategorieAyantdroitDTO.class, root.get(TCategorieAyantdroit_.lgCATEGORIEAYANTDROITID),
                            root.get(TCategorieAyantdroit_.strLIBELLECATEGORIEAYANTDROIT)))
                    .orderBy(cb.asc(root.get(TCategorieAyantdroit_.strLIBELLECATEGORIEAYANTDROIT)));
            if (query != null && !query.equals("")) {
                predicates.add(cb.like(root.get(TCategorieAyantdroit_.strLIBELLECATEGORIEAYANTDROIT), query + "%"));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public boolean sansBon() {
        if (sansBon == null) {
            try {
                TParameters tp = getEntityManager().find(TParameters.class, "KEY_ACTIVATE_VENTE_WITHOUT_BON");
                sansBon = (tp != null && tp.getStrVALUE().trim().equals("1"));
            } catch (Exception e) {
                sansBon = false;
            }

        }
        return sansBon;
    }

    @Override
    public List<RemiseDTO> findAllRemise() {
        TypedQuery<TRemise> tq = getEntityManager().createNamedQuery("TRemise.findByAll", TRemise.class);
        tq.setParameter("strSTATUT", Constant.STATUT_ENABLE);
        List<TRemise> list = tq.getResultList();
        return list.stream().map(RemiseDTO::new).collect(Collectors.toList());
    }

    @Override
    public List<ReglementDTO> findReglements(String id) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ReglementDTO> cq = cb.createQuery(ReglementDTO.class);
            Root<TTypeReglement> root = cq.from(TTypeReglement.class);
            cq.select(cb.construct(ReglementDTO.class, root.get(TTypeReglement_.lgTYPEREGLEMENTID),
                    root.get(TTypeReglement_.strNAME))).orderBy(cb.asc(root.get(TTypeReglement_.strNAME)));
            cq.where(cb.and(cb.equal(root.get(TTypeReglement_.strSTATUT), "enable"),
                    cb.notEqual(root.get(TTypeReglement_.lgTYPEREGLEMENTID), DateConverter.MODE_DEVISE),
                    cb.notEqual(root.get(TTypeReglement_.lgTYPEREGLEMENTID), DateConverter.MODE_DIFF)));
            Query q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ComboDTO> loadGroupeFournisseur() {
        try {
            TypedQuery<Groupefournisseur> q = getEntityManager().createNamedQuery("Groupefournisseur.findAll",
                    Groupefournisseur.class);
            return q.getResultList().stream().map(x -> new ComboDTO(x.getId(), x.getLibelle()))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    @Override
    public List<ComboDTO> loadFournisseur(String query) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ComboDTO> cq = cb.createQuery(ComboDTO.class);
            Root<TGrossiste> root = cq.from(TGrossiste.class);
            cq.select(
                    cb.construct(ComboDTO.class, root.get(TGrossiste_.lgGROSSISTEID), root.get(TGrossiste_.strLIBELLE)))
                    .orderBy(cb.asc(root.get(TGrossiste_.strLIBELLE)));
            predicates.add(cb.equal(root.get(TGrossiste_.strSTATUT), DateConverter.STATUT_ENABLE));
            if (!StringUtils.isEmpty(query)) {
                predicates.add(cb.or(cb.like(root.get(TGrossiste_.strCODE), query + "%"),
                        cb.like(root.get(TGrossiste_.strLIBELLE), query + "%")));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<ComboDTO> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ComboDTO> loadRayons(String query) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ComboDTO> cq = cb.createQuery(ComboDTO.class);
            Root<TZoneGeographique> root = cq.from(TZoneGeographique.class);
            cq.select(cb.construct(ComboDTO.class, root.get(TZoneGeographique_.lgZONEGEOID),
                    root.get(TZoneGeographique_.strLIBELLEE)))
                    .orderBy(cb.asc(root.get(TZoneGeographique_.strLIBELLEE)));
            predicates.add(cb.equal(root.get(TZoneGeographique_.strSTATUT), DateConverter.STATUT_ENABLE));
            if (!StringUtils.isEmpty(query)) {
                predicates.add(cb.or(cb.like(root.get(TZoneGeographique_.strCODE), query + "%"),
                        cb.like(root.get(TZoneGeographique_.strLIBELLEE), query + "%")));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<ComboDTO> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ComboDTO> familleArticles(String query) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ComboDTO> cq = cb.createQuery(ComboDTO.class);
            Root<TFamillearticle> root = cq.from(TFamillearticle.class);
            cq.select(cb.construct(ComboDTO.class, root.get(TFamillearticle_.lgFAMILLEARTICLEID),
                    root.get(TFamillearticle_.strLIBELLE))).orderBy(cb.asc(root.get(TFamillearticle_.strLIBELLE)));
            predicates.add(cb.equal(root.get(TFamillearticle_.strSTATUT), DateConverter.STATUT_ENABLE));
            if (!StringUtils.isEmpty(query)) {
                predicates.add(cb.or(cb.like(root.get(TFamillearticle_.strCODEFAMILLE), query + "%"),
                        cb.like(root.get(TFamillearticle_.strLIBELLE), query + "%")));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<ComboDTO> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ComboDTO> findAllTypeReglement() {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ComboDTO> cq = cb.createQuery(ComboDTO.class);
            Root<TTypeReglement> root = cq.from(TTypeReglement.class);
            cq.select(cb.construct(ComboDTO.class, root.get(TTypeReglement_.lgTYPEREGLEMENTID),
                    root.get(TTypeReglement_.strNAME))).orderBy(cb.asc(root.get(TTypeReglement_.strNAME)));
            predicates.add(cb.equal(root.get(TTypeReglement_.strSTATUT), DateConverter.STATUT_ENABLE));

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<ComboDTO> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ComboDTO> gammeProduits(String query) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ComboDTO> cq = cb.createQuery(ComboDTO.class);
            Root<GammeProduit> root = cq.from(GammeProduit.class);
            cq.select(cb.construct(ComboDTO.class, root.get(GammeProduit_.id), root.get(GammeProduit_.libelle)))
                    .orderBy(cb.asc(root.get(GammeProduit_.libelle)));
            predicates.add(cb.equal(root.get(GammeProduit_.status), Statut.ENABLE));
            if (!StringUtils.isEmpty(query)) {
                predicates.add(cb.or(cb.like(root.get(GammeProduit_.libelle), query + "%"),
                        cb.like(root.get(GammeProduit_.code), query + "%")));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<ComboDTO> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ComboDTO> laboratoiresProduits(String query) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ComboDTO> cq = cb.createQuery(ComboDTO.class);
            Root<Laboratoire> root = cq.from(Laboratoire.class);
            cq.select(cb.construct(ComboDTO.class, root.get(Laboratoire_.id), root.get(Laboratoire_.libelle)))
                    .orderBy(cb.asc(root.get(Laboratoire_.libelle)));
            predicates.add(cb.equal(root.get(GammeProduit_.status), Statut.ENABLE));
            if (!StringUtils.isEmpty(query)) {
                predicates.add(cb.or(cb.like(root.get(Laboratoire_.libelle), query + "%")));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<ComboDTO> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public boolean afficheurActif() {
        if (afficheeurActif == null) {
            try {
                TParameters tp = getEntityManager().find(TParameters.class, "KEY_ACTIVATE_DISPLAYER");
                afficheeurActif = tp != null && tp.getStrVALUE().trim().equals("1");
            } catch (Exception e) {
                return afficheeurActif;
            }
        }
        return afficheeurActif;

    }

    @Override
    public JSONObject findDateMiseAJour() throws JSONException {
        if (dateUpdat == null) {
            try {
                TParameters tp = getEntityManager().find(TParameters.class, "DATE_MIS_A_JOUR_NLLE_VERSION");
                if (tp != null) {
                    dateUpdat = LocalDate.parse(tp.getStrVALUE().trim(), DateTimeFormatter.ofPattern("dd-MM-yyyy"));
                    return new JSONObject().put("success", true).put("datemisajour", dateUpdat.toString());
                }
                return new JSONObject().put("success", false);
            } catch (Exception e) {
                LOG.log(Level.SEVERE, null, e);
                return new JSONObject().put("success", false);
            }
        }
        return new JSONObject().put("success", true).put("datemisajour", dateUpdat.toString());
    }

    @Override
    public boolean checkUg() {
        try {
            TParameters tp = getEntityManager().find(TParameters.class, "KEY_CHECK_UG");
            if (tp != null) {
                return Integer.parseInt(tp.getStrVALUE().trim()) == 1;
            }
            return false;
        } catch (Exception e) {

            return false;
        }
    }

    @Override
    public boolean findParam(String key) {
        try {
            TParameters tp = getEntityManager().find(TParameters.class, key);
            if (tp != null) {
                return Integer.parseInt(tp.getStrVALUE().trim()) == 1;
            }
            return false;
        } catch (Exception e) {

            return false;
        }
    }

    @Override
    public boolean isNormalUse() {
        boolean takeInAccount = this.findParam(DateConverter.KEY_TAKE_INTO_ACCOUNT);
        boolean keyParams = this.findParam(DateConverter.KEY_PARAMS);
        return takeInAccount || keyParams;
    }

    @Override
    public List<TMotifRetour> motifsRetour() {
        TypedQuery<TMotifRetour> tq = getEntityManager().createNamedQuery("TMotifRetour.findAll", TMotifRetour.class);
        return tq.getResultList();
    }

    @Override
    public List<MotifAjustement> findAllTypeAjustements() {
        TypedQuery<MotifAjustement> tq = getEntityManager().createNamedQuery("MotifAjustement.findAll",
                MotifAjustement.class);
        return tq.getResultList();
    }

    @Override
    public List<MotifRetourCarnet> motifRetourCarnets() {
        TypedQuery<MotifRetourCarnet> tq = getEntityManager().createNamedQuery("MotifRetourCarnet.findAll",
                MotifRetourCarnet.class);
        return tq.getResultList();
    }

}
