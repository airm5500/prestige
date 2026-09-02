package rest.service.impl;

import dal.TFamille;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TUser;
import dal.VenteModifiee;
import dal.VenteModifieeLigne;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.InventaireService;
import rest.service.VenteModifieeService;
import rest.service.dto.VenteModifieeDTO;
import rest.service.v2.dto.VenteModification;
import util.ComparaisonLignesVente;
import util.ComparaisonLignesVente.Ecart;
import util.ComparaisonLignesVente.Ligne;
import util.DateCommonUtils;
import util.NumberUtils;

/**
 * Mouchard des ventes modifiees (point 6). Les enregistrements se font dans la transaction de la modification ; une
 * erreur du mouchard est journalisee sans faire echouer la vente.
 */
@Stateless
public class VenteModifieeServiceImpl implements VenteModifieeService {

    private static final Logger LOG = Logger.getLogger(VenteModifieeServiceImpl.class.getName());
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HEURE_FORMAT = DateTimeFormatter.ofPattern("HH:mm:ss");
    private static final DateTimeFormatter DATE_HEURE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int DESCRIPTION_MAX = 1000;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private InventaireService inventaireService;

    // ------------------------------------------------------------------ enregistrement

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void enregistrerModificationProduits(TUser user, TPreenregistrement origine, TPreenregistrement copie) {
        try {
            if (origine == null || copie == null) {
                return;
            }
            List<Ecart> ecarts = ComparaisonLignesVente.comparer(lignes(origine), lignes(copie));
            VenteModifiee m = entete(VenteModifiee.TYPE_PRODUITS, user, copie);
            m.setVenteOrigineId(origine.getLgPREENREGISTREMENTID());
            m.setVenteRef(reference(origine));
            m.setVenteDate(dateVente(origine));
            m.setMontantAvant(montant(origine));
            m.setMontantApres(montant(copie));
            for (Ecart e : ecarts) {
                VenteModifieeLigne l = new VenteModifieeLigne();
                l.setProduitId(e.produitId);
                l.setProduitCip(e.cip);
                l.setProduitLibelle(e.libelle);
                l.setAction(e.action);
                l.setQteAvant(e.qteAvant);
                l.setQteApres(e.qteApres);
                l.setPuAvant(e.puAvant);
                l.setPuApres(e.puApres);
                l.setMontantAvant(e.montantAvant);
                l.setMontantApres(e.montantApres);
                m.ajouterLigne(l);
            }
            m.setDescription(descriptionProduits(ecarts, m));
            em.persist(m);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "enregistrerModificationProduits", e);
        }
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void enregistrerModificationInfos(TUser user, TPreenregistrement vente, VenteModification modification) {
        try {
            if (vente == null) {
                return;
            }
            VenteModifiee m = entete(VenteModifiee.TYPE_INFOS, user, vente);
            m.setMontantAvant(montant(vente));
            m.setMontantApres(montant(vente));
            m.setDescription(descriptionInfos(modification));
            // Tableau recapitulatif element / avant / apres, comme le detail produit
            for (String[] ligne : lignesInfos(modification)) {
                m.ajouterLigne(ligneInfo(ligne[0], ligne[1], ligne[2]));
            }
            em.persist(m);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "enregistrerModificationInfos", e);
        }
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void enregistrerModificationDate(TUser user, TPreenregistrement vente, Date avant, Date apres) {
        try {
            if (vente == null) {
                return;
            }
            VenteModifiee m = entete(VenteModifiee.TYPE_DATE, user, vente);
            m.setMontantAvant(montant(vente));
            m.setMontantApres(montant(vente));
            m.setDescription("Ancienne date : " + formatDate(avant) + " ; Nouvelle date : " + formatDate(apres));
            m.ajouterLigne(ligneInfo("Date de vente", formatDate(avant), formatDate(apres)));
            em.persist(m);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "enregistrerModificationDate", e);
        }
    }

    private VenteModifiee entete(String type, TUser user, TPreenregistrement vente) {
        VenteModifiee m = new VenteModifiee();
        m.setTypeModification(type);
        m.setVenteId(vente.getLgPREENREGISTREMENTID());
        m.setVenteRef(reference(vente));
        m.setVenteDate(dateVente(vente));
        if (user != null) {
            m.setUserId(user.getLgUSERID());
            m.setUserName(user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        }
        m.setMvtDate(LocalDateTime.now());
        return m;
    }

    private static LocalDateTime dateVente(TPreenregistrement vente) {
        Date d = vente.getDtCREATED() != null ? vente.getDtCREATED() : vente.getDtUPDATED();
        return d == null ? null : DateCommonUtils.convertDateToLocalDateTime(d);
    }

    private static VenteModifieeLigne ligneInfo(String element, String avant, String apres) {
        VenteModifieeLigne l = new VenteModifieeLigne();
        l.setAction(VenteModifieeLigne.ACTION_INFO);
        l.setProduitLibelle(element);
        l.setValeurAvant(StringUtils.abbreviate(StringUtils.defaultIfEmpty(avant, "-"), 255));
        l.setValeurApres(StringUtils.abbreviate(StringUtils.defaultIfEmpty(apres, "-"), 255));
        return l;
    }

    /** Lignes element / avant / apres d'une modification d'informations (memes regles que le texte). */
    static List<String[]> lignesInfos(VenteModification v) {
        List<String[]> lignes = new ArrayList<>();
        if (v == null) {
            return lignes;
        }
        ajouterLigne(lignes, "Client", v.getOldClient(), v.getFinalClient());
        ajouterLigne(lignes, "N° bon", v.getOldBon(), v.getFinalBon());
        ajouterLigne(lignes, "Part client", v.getOldMontantClient(), v.getNouveauMontantClient());
        ajouterLigne(lignes, "Ayant droit", v.getOldAyantDroit(), v.getFinalAyantDroit());
        String tpAvant = libelles(v.getOldTiersPayant());
        String tpApres = libelles(v.getFinalTiersPayant());
        if (!StringUtils.equals(tpAvant, tpApres)) {
            lignes.add(new String[] { "Tiers payant", tpAvant, tpApres });
        }
        return lignes;
    }

    private static void ajouterLigne(List<String[]> lignes, String element, String avant, String apres) {
        String a = sansId(avant);
        String b = sansId(apres);
        if ((StringUtils.isEmpty(a) && StringUtils.isEmpty(b)) || StringUtils.equals(a, b)) {
            return;
        }
        lignes.add(new String[] { element, a, b });
    }

    private static String reference(TPreenregistrement vente) {
        return StringUtils.isNotEmpty(vente.getStrREF()) ? vente.getStrREF() : vente.getStrREFTICKET();
    }

    private static int montant(TPreenregistrement vente) {
        return vente.getIntPRICE() == null ? 0 : vente.getIntPRICE();
    }

    private static String formatDate(Date d) {
        return d == null ? "" : DateCommonUtils.convertDateToLocalDateTime(d).format(DATE_HEURE_FORMAT);
    }

    private List<Ligne> lignes(TPreenregistrement vente) {
        TypedQuery<TPreenregistrementDetail> q = em.createQuery(
                "SELECT t FROM TPreenregistrementDetail t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1",
                TPreenregistrementDetail.class);
        q.setParameter(1, vente.getLgPREENREGISTREMENTID());
        List<Ligne> lignes = new ArrayList<>();
        for (TPreenregistrementDetail d : q.getResultList()) {
            TFamille f = d.getLgFAMILLEID();
            lignes.add(new Ligne(f == null ? null : f.getLgFAMILLEID(), f == null ? "" : f.getIntCIP(),
                    f == null ? "" : f.getStrNAME(), valeur(d.getIntQUANTITY()), valeur(d.getIntPRICEUNITAIR()),
                    valeur(d.getIntPRICE())));
        }
        return lignes;
    }

    private static int valeur(Integer i) {
        return i == null ? 0 : i;
    }

    /** Texte lisible, produit par produit, pour la colonne « Détail » et l'export. */
    static String descriptionProduits(List<Ecart> ecarts, VenteModifiee m) {
        StringBuilder sb = new StringBuilder();
        if (ecarts.isEmpty()) {
            sb.append("Aucun changement de produit");
        }
        for (Ecart e : ecarts) {
            if (sb.length() > 0) {
                sb.append(" ; ");
            }
            sb.append(e.libelle).append(" : ");
            switch (e.action) {
            case Ecart.AJOUT:
                sb.append("ajouté (qté ").append(e.qteApres).append(", ")
                        .append(NumberUtils.formatIntToString(e.montantApres)).append(")");
                break;
            case Ecart.RETRAIT:
                sb.append("retiré (qté ").append(e.qteAvant).append(", ")
                        .append(NumberUtils.formatIntToString(e.montantAvant)).append(")");
                break;
            case Ecart.QUANTITE:
                sb.append("quantité ").append(e.qteAvant).append(" → ").append(e.qteApres);
                break;
            default:
                sb.append("prix ").append(NumberUtils.formatIntToString(e.puAvant)).append(" → ")
                        .append(NumberUtils.formatIntToString(e.puApres));
                break;
            }
        }
        if (!m.getMontantAvant().equals(m.getMontantApres())) {
            sb.append(" ; montant ").append(NumberUtils.formatIntToString(m.getMontantAvant())).append(" → ")
                    .append(NumberUtils.formatIntToString(m.getMontantApres()));
        }
        return StringUtils.abbreviate(sb.toString(), DESCRIPTION_MAX);
    }

    /**
     * Texte lisible des changements d'informations. Les valeurs de {@link VenteModification} sont de la forme «
     * id;libellé;... » : on retire l'identifiant technique.
     */
    static String descriptionInfos(VenteModification v) {
        List<String> parts = new ArrayList<>();
        if (v != null) {
            ajouter(parts, "Client", v.getOldClient(), v.getFinalClient());
            ajouter(parts, "N° bon", v.getOldBon(), v.getFinalBon());
            ajouter(parts, "Part client", v.getOldMontantClient(), v.getNouveauMontantClient());
            ajouter(parts, "Ayant droit", v.getOldAyantDroit(), v.getFinalAyantDroit());
            String tpAvant = libelles(v.getOldTiersPayant());
            String tpApres = libelles(v.getFinalTiersPayant());
            if (!StringUtils.equals(tpAvant, tpApres)) {
                parts.add("Tiers payant : " + StringUtils.defaultIfEmpty(tpAvant, "-") + " → "
                        + StringUtils.defaultIfEmpty(tpApres, "-"));
            }
        }
        if (parts.isEmpty()) {
            return "Informations client / tiers payant enregistrées sans changement détecté";
        }
        return StringUtils.abbreviate(String.join(" ; ", parts), DESCRIPTION_MAX);
    }

    private static void ajouter(List<String> parts, String libelle, String avant, String apres) {
        String a = sansId(avant);
        String b = sansId(apres);
        if (StringUtils.isEmpty(a) && StringUtils.isEmpty(b)) {
            return;
        }
        if (StringUtils.equals(a, b)) {
            return;
        }
        parts.add(libelle + " : " + StringUtils.defaultIfEmpty(a, "-") + " → " + StringUtils.defaultIfEmpty(b, "-"));
    }

    private static String libelles(List<String> valeurs) {
        if (CollectionUtils.isEmpty(valeurs)) {
            return "";
        }
        return valeurs.stream().map(VenteModifieeServiceImpl::sansId).filter(StringUtils::isNotEmpty)
                .collect(Collectors.joining(", "));
    }

    /** « id;nom;prenom;numero » devient « nom prenom numero » ; une valeur sans « ; » est rendue telle quelle. */
    static String sansId(String valeur) {
        if (StringUtils.isEmpty(valeur)) {
            return "";
        }
        int i = valeur.indexOf(';');
        if (i < 0) {
            return valeur.trim();
        }
        String reste = valeur.substring(i + 1).replace(';', ' ').replace("null", "").trim();
        return reste.replaceAll("\\s+", " ");
    }

    // ------------------------------------------------------------------ consultation

    @Override
    public JSONObject list(String dtStart, String dtEnd, String userId, String query, String type, int start,
            int limit) {
        JSONObject json = new JSONObject();
        try {
            json.put("total", count(dtStart, dtEnd, userId, query, type));
            json.put("results", new JSONArray(query(dtStart, dtEnd, userId, query, type, start, limit).stream()
                    .map(this::toDto).map(JSONObject::new).collect(Collectors.toList())));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "list", e);
            json.put("total", 0);
            json.put("results", new JSONArray());
        }
        return json;
    }

    @Override
    public List<VenteModifieeDTO> fetchAll(String dtStart, String dtEnd, String userId, String query, String type) {
        return query(dtStart, dtEnd, userId, query, type, 0, 0).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public Set<String> produitIds(List<String> modificationIds) {
        Set<String> ids = new LinkedHashSet<>();
        if (CollectionUtils.isEmpty(modificationIds)) {
            return ids;
        }
        List<String> venteIds = new ArrayList<>();
        for (String id : modificationIds) {
            VenteModifiee m = em.find(VenteModifiee.class, id);
            if (m == null) {
                continue;
            }
            if (StringUtils.isNotEmpty(m.getVenteId())) {
                venteIds.add(m.getVenteId());
            }
            m.getLignes().stream().map(VenteModifieeLigne::getProduitId).filter(StringUtils::isNotEmpty)
                    .forEach(ids::add);
        }
        if (!venteIds.isEmpty()) {
            ids.addAll(inventaireService.produitIdsFromVentes(venteIds));
        }
        return ids;
    }

    private VenteModifieeDTO toDto(VenteModifiee m) {
        VenteModifieeDTO dto = new VenteModifieeDTO();
        dto.setId(m.getId());
        dto.setTypeModification(m.getTypeModification());
        dto.setTypeLibelle(libelleType(m.getTypeModification()));
        dto.setVenteId(m.getVenteId());
        dto.setVenteOrigineId(m.getVenteOrigineId());
        dto.setVenteRef(m.getVenteRef());
        dto.setVenteDate(m.getVenteDate() == null ? "" : m.getVenteDate().format(DATE_HEURE_FORMAT));
        dto.setUserName(m.getUserName());
        dto.setMontantAvant(m.getMontantAvant());
        dto.setMontantApres(m.getMontantApres());
        dto.setDescription(m.getDescription());
        if (m.getMvtDate() != null) {
            dto.setDate(m.getMvtDate().format(DATE_FORMAT));
            dto.setHeure(m.getMvtDate().format(HEURE_FORMAT));
        }
        for (VenteModifieeLigne l : m.getLignes()) {
            VenteModifieeDTO.Ligne dl = new VenteModifieeDTO.Ligne();
            dl.setProduitId(l.getProduitId());
            dl.setProduitCip(l.getProduitCip());
            dl.setProduitLibelle(l.getProduitLibelle());
            dl.setAction(l.getAction());
            dl.setQteAvant(l.getQteAvant());
            dl.setQteApres(l.getQteApres());
            dl.setPuAvant(l.getPuAvant());
            dl.setPuApres(l.getPuApres());
            dl.setMontantAvant(l.getMontantAvant());
            dl.setMontantApres(l.getMontantApres());
            dl.setValeurAvant(l.getValeurAvant());
            dl.setValeurApres(l.getValeurApres());
            dto.getLignes().add(dl);
        }
        return dto;
    }

    public static String libelleType(String type) {
        if (VenteModifiee.TYPE_PRODUITS.equals(type)) {
            return "Modification des produits";
        }
        if (VenteModifiee.TYPE_INFOS.equals(type)) {
            return "Modification client / tiers payant";
        }
        if (VenteModifiee.TYPE_DATE.equals(type)) {
            return "Modification de la date";
        }
        return StringUtils.defaultString(type);
    }

    private List<VenteModifiee> query(String dtStart, String dtEnd, String userId, String query, String type, int start,
            int limit) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<VenteModifiee> cq = cb.createQuery(VenteModifiee.class);
            Root<VenteModifiee> root = cq.from(VenteModifiee.class);
            cq.select(root)
                    .where(predicates(cb, cq, root, dtStart, dtEnd, userId, query, type).toArray(Predicate[]::new))
                    .orderBy(cb.desc(root.get("mvtDate")));
            TypedQuery<VenteModifiee> q = em.createQuery(cq);
            if (limit > 0) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "query", e);
            return List.of();
        }
    }

    private long count(String dtStart, String dtEnd, String userId, String query, String type) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<VenteModifiee> root = cq.from(VenteModifiee.class);
            cq.select(cb.count(root))
                    .where(predicates(cb, cq, root, dtStart, dtEnd, userId, query, type).toArray(Predicate[]::new));
            return em.createQuery(cq).getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "count", e);
            return 0;
        }
    }

    private List<Predicate> predicates(CriteriaBuilder cb, CriteriaQuery<?> cq, Root<VenteModifiee> root,
            String dtStart, String dtEnd, String userId, String query, String type) {
        List<Predicate> predicates = new ArrayList<>();
        if (StringUtils.isNotEmpty(dtStart)) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("mvtDate"),
                    LocalDateTime.of(LocalDate.parse(dtStart), LocalTime.MIN)));
        }
        if (StringUtils.isNotEmpty(dtEnd)) {
            predicates.add(
                    cb.lessThanOrEqualTo(root.get("mvtDate"), LocalDateTime.of(LocalDate.parse(dtEnd), LocalTime.MAX)));
        }
        if (StringUtils.isNotEmpty(userId)) {
            predicates.add(cb.equal(root.get("userId"), userId));
        }
        if (StringUtils.isNotEmpty(type)) {
            predicates.add(cb.equal(root.get("typeModification"), type));
        }
        if (StringUtils.isNotEmpty(query)) {
            String search = "%" + query.trim().toLowerCase() + "%";
            // Reference de vente, operateur, texte du detail, ou produit du detail
            javax.persistence.criteria.Subquery<String> sousRequete = cq.subquery(String.class);
            Root<VenteModifieeLigne> ligne = sousRequete.from(VenteModifieeLigne.class);
            sousRequete.select(ligne.get("modification").get("id"))
                    .where(cb.or(cb.like(cb.lower(ligne.get("produitLibelle")), search),
                            cb.like(ligne.get("produitCip"), query.trim() + "%")));
            predicates.add(cb.or(cb.like(cb.lower(root.get("venteRef")), search),
                    cb.like(cb.lower(root.get("userName")), search), cb.like(cb.lower(root.get("description")), search),
                    root.get("id").in(sousRequete)));
        }
        return predicates;
    }
}
