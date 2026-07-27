package rest.service.impl;

import dal.MotifSuggestionReserve;
import dal.TFamille;
import dal.TSuggestionReserve;
import dal.TSuggestionReserveDetail;
import dal.TUser;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.SessionContext;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ReserveService;
import rest.service.SuggestionReserveService;
import util.IdGenerator;

/**
 * Implementation de la gestion des suggestions de reserve.
 *
 * <p>
 * Deux principes structurent ce service :
 * <ul>
 * <li>la quantite proposee est calculee par {@link ReserveService#proposition} et n'est jamais recalculee ensuite : la
 * formule n'existe qu'a un seul endroit, et l'ecart avec la quantite retenue reste auditable ;</li>
 * <li>le traitement s'execute ligne par ligne dans des transactions isolees : une ligne en echec n'annule jamais les
 * lignes deja passees.</li>
 * </ul>
 */
@Stateless
public class SuggestionReserveServiceImpl implements SuggestionReserveService {

    private static final Logger LOG = Logger.getLogger(SuggestionReserveServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Resource
    private SessionContext sessionContext;

    @EJB
    private ReserveService reserveService;

    @EJB
    private rest.service.utils.ReportExcelExportService reportExcelExportService;

    // ------------------------------------------------------------------ MOTIFS

    @Override
    public JSONArray motifs(String categorie) {
        JSONArray out = new JSONArray();
        try {
            TypedQuery<MotifSuggestionReserve> q;
            if (categorie == null || categorie.trim().isEmpty()) {
                q = em.createNamedQuery("MotifSuggestionReserve.findAll", MotifSuggestionReserve.class);
            } else {
                q = em.createNamedQuery("MotifSuggestionReserve.findByCategorie", MotifSuggestionReserve.class);
                q.setParameter("categorie", categorie.trim().toUpperCase());
            }
            for (MotifSuggestionReserve m : q.getResultList()) {
                out.put(new JSONObject().put("id", m.getId()).put("libelle", m.getLibelle()).put("categorie",
                        m.getCategorie() == null ? JSONObject.NULL : m.getCategorie()));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "motifs", e);
        }
        return out;
    }

    // ----------------------------------------------------------------- CREATION

    @Override
    public JSONObject creer(TUser user, String categorie, Integer motifId, String commentaire,
            List<JSONObject> items) {
        String cat = normaliserCategorie(categorie);
        if (items == null || items.isEmpty()) {
            return echec("Aucun article selectionne.");
        }

        TSuggestionReserve s = new TSuggestionReserve(IdGenerator.getComplexId());
        s.setStrREF(genererReference(cat));
        s.setStrCATEGORIE(cat);
        s.setStrORIGINE(TSuggestionReserve.ORIGINE_MANUELLE);
        s.setStrSTATUT(TSuggestionReserve.STATUT_A_TRAITER);
        s.setStrCOMMENTAIRE(commentaire);
        s.setLgEMPLACEMENTID(user.getLgEMPLACEMENTID());
        s.setLgUSERCREATEURID(user);
        s.setDtCREATED(new Date());
        s.setDtUPDATED(s.getDtCREATED());
        if (motifId != null) {
            s.setMotif(em.find(MotifSuggestionReserve.class, motifId));
        }
        em.persist(s);

        int ajoutees = 0;
        int ignorees = 0;
        for (JSONObject item : items) {
            String familleId = item.optString("lg_FAMILLE_ID", null);
            if (familleId == null || familleId.trim().isEmpty()) {
                ignorees++;
                continue;
            }
            int qteDemandee = item.optInt("int_QTE", 0);
            if (ajouterLigne(user, s, familleId, qteDemandee) != null) {
                ajoutees++;
            } else {
                ignorees++;
            }
        }

        if (ajoutees == 0) {
            // Rien de proposable : on ne laisse pas une suggestion vide derriere nous.
            em.remove(s);
            return echec("Aucun article ne donne lieu a une proposition.");
        }

        LOG.log(Level.INFO, "creer suggestion={0} categorie={1} lignes={2} ignorees={3} user={4}",
                new Object[] { s.getLgSUGGESTIONRESERVEID(), cat, ajoutees, ignorees, user.getLgUSERID() });
        return new JSONObject().put("success", true).put("lg_SUGGESTION_RESERVE_ID", s.getLgSUGGESTIONRESERVEID())
                .put("str_REF", s.getStrREF()).put("lignes", ajoutees).put("ignorees", ignorees)
                .put("message", ajoutees + " article(s) dans la suggestion.");
    }

    /**
     * Ajoute une ligne en figeant la proposition du systeme et son explication. Retourne {@code null} si le produit
     * est deja present dans cette suggestion ou s'il n'y a rien a proposer.
     */
    private TSuggestionReserveDetail ajouterLigne(TUser user, TSuggestionReserve s, String familleId,
            int qteRetenueDemandee) {
        if (ligneExiste(s.getLgSUGGESTIONRESERVEID(), familleId)) {
            return null;
        }
        JSONObject p = reserveService.proposition(user, familleId, s.getStrCATEGORIE());
        if (p == null) {
            return null;
        }
        int proposition = p.optInt("int_PROPOSITION", 0);
        if (proposition <= 0 && qteRetenueDemandee <= 0) {
            return null;
        }
        TFamille famille = em.find(TFamille.class, familleId);
        if (famille == null) {
            return null;
        }

        TSuggestionReserveDetail d = new TSuggestionReserveDetail(IdGenerator.getComplexId());
        d.setLgSUGGESTIONRESERVEID(s);
        d.setLgFAMILLEID(famille);
        d.setIntQTEPROPOSEE(proposition);
        // Une quantite transmise par l'ecran est une quantite RETENUE, jamais une proposition.
        d.setIntQTERETENUE(qteRetenueDemandee > 0 ? qteRetenueDemandee : proposition);
        d.setIntQTEDEPLACEE(0);
        d.setIntSTOCKRAYON(p.optInt("int_STOCK_RAYON", 0));
        d.setIntSTOCKRESERVE(p.optInt("int_STOCK_RESERVE", 0));
        d.setIntSEUILDECLENCHEUR(p.isNull("int_SEUIL_DECLENCHEUR") ? null : p.optInt("int_SEUIL_DECLENCHEUR"));
        d.setIntCIBLE(p.optInt("int_CIBLE", 0));
        d.setIntDISPONIBLE(p.optInt("int_DISPONIBLE", 0));
        d.setStrFORMULE(p.optString("str_FORMULE", ""));
        d.setStrETAT(qteRetenueDemandee > 0 && qteRetenueDemandee != proposition
                ? TSuggestionReserveDetail.ETAT_MODIFIEE
                : TSuggestionReserveDetail.ETAT_PROPOSEE);
        d.setDtCREATED(new Date());
        em.persist(d);
        return d;
    }

    private boolean ligneExiste(String suggestionId, String familleId) {
        Query q = em.createNamedQuery("TSuggestionReserveDetail.findBySuggestionEtFamille");
        q.setParameter("suggestionId", suggestionId);
        q.setParameter("familleId", familleId);
        q.setMaxResults(1);
        return !q.getResultList().isEmpty();
    }

    // ------------------------------------------------------------------ LISTING

    @Override
    public JSONObject lister(TUser user, String statut, String categorie, String origine, Integer motifId,
            String search, String dtStart, String dtEnd, String userId, String tri, int start, int limit) {
        StringBuilder jpql = new StringBuilder("SELECT s FROM TSuggestionReserve s WHERE 1=1");
        if (notBlank(statut)) {
            jpql.append(" AND s.strSTATUT = :statut");
        }
        if (notBlank(categorie)) {
            jpql.append(" AND s.strCATEGORIE = :categorie");
        }
        if (notBlank(origine)) {
            jpql.append(" AND s.strORIGINE = :origine");
        }
        if (motifId != null) {
            jpql.append(" AND s.motif.id = :motifId");
        }
        if (notBlank(dtStart)) {
            jpql.append(" AND s.dtCREATED >= :dtStart");
        }
        if (notBlank(dtEnd)) {
            jpql.append(" AND s.dtCREATED <= :dtEnd");
        }
        // Un meme filtre utilisateur porte sur les trois roles : createur, traitant ou cloturant.
        if (notBlank(userId)) {
            jpql.append(" AND (s.lgUSERCREATEURID.lgUSERID = :userId OR s.lgUSERTRAITANTID.lgUSERID = :userId"
                    + " OR s.lgUSERCLOTUREID.lgUSERID = :userId)");
        }
        // Recherche par produit : nom ou code CIP present dans l'une des lignes.
        if (notBlank(search)) {
            jpql.append(" AND EXISTS (SELECT d FROM TSuggestionReserveDetail d"
                    + " WHERE d.lgSUGGESTIONRESERVEID = s AND (d.lgFAMILLEID.strNAME LIKE :search"
                    + " OR d.lgFAMILLEID.intCIP LIKE :search))");
        }
        jpql.append(ordreDeTri(tri));

        TypedQuery<TSuggestionReserve> q = em.createQuery(jpql.toString(), TSuggestionReserve.class);
        appliquerParametres(q, statut, categorie, origine, motifId, search, dtStart, dtEnd, userId);

        // Comptage sur les memes criteres, en remplacant la projection.
        String countJpql = jpql.toString().replaceFirst("SELECT s FROM", "SELECT COUNT(s) FROM");
        int ordreIdx = countJpql.indexOf(" ORDER BY ");
        if (ordreIdx > 0) {
            countJpql = countJpql.substring(0, ordreIdx);
        }
        TypedQuery<Long> qc = em.createQuery(countJpql, Long.class);
        appliquerParametres(qc, statut, categorie, origine, motifId, search, dtStart, dtEnd, userId);
        long total = qc.getSingleResult();

        if (limit > 0) {
            q.setFirstResult(Math.max(0, start));
            q.setMaxResults(limit);
        }

        JSONArray results = new JSONArray();
        for (TSuggestionReserve s : q.getResultList()) {
            results.put(enteteJson(s));
        }
        return new JSONObject().put("total", total).put("results", results);
    }

    private void appliquerParametres(Query q, String statut, String categorie, String origine, Integer motifId,
            String search, String dtStart, String dtEnd, String userId) {
        if (notBlank(statut)) {
            q.setParameter("statut", statut.trim().toUpperCase());
        }
        if (notBlank(categorie)) {
            q.setParameter("categorie", normaliserCategorie(categorie));
        }
        if (notBlank(origine)) {
            q.setParameter("origine", origine.trim().toUpperCase());
        }
        if (motifId != null) {
            q.setParameter("motifId", motifId);
        }
        if (notBlank(dtStart)) {
            q.setParameter("dtStart", debutDeJournee(dtStart), javax.persistence.TemporalType.TIMESTAMP);
        }
        if (notBlank(dtEnd)) {
            q.setParameter("dtEnd", finDeJournee(dtEnd), javax.persistence.TemporalType.TIMESTAMP);
        }
        if (notBlank(userId)) {
            q.setParameter("userId", userId.trim());
        }
        if (notBlank(search)) {
            q.setParameter("search", "%" + search.trim() + "%");
        }
    }

    private static String ordreDeTri(String tri) {
        if ("statut".equalsIgnoreCase(tri)) {
            return " ORDER BY s.strSTATUT ASC, s.dtCREATED DESC";
        }
        if ("utilisateur".equalsIgnoreCase(tri)) {
            return " ORDER BY s.lgUSERCREATEURID.strFIRSTNAME ASC, s.dtCREATED DESC";
        }
        return " ORDER BY s.dtCREATED DESC";
    }

    // ------------------------------------------------------------------- DETAIL

    @Override
    public JSONObject detail(TUser user, String suggestionId) {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return echec("Suggestion introuvable.");
        }
        JSONArray lignes = new JSONArray();
        for (TSuggestionReserveDetail d : chargerLignes(suggestionId)) {
            lignes.put(ligneJson(user, d));
        }
        return new JSONObject().put("success", true).put("entete", enteteJson(s)).put("lignes", lignes);
    }

    private List<TSuggestionReserveDetail> chargerLignes(String suggestionId) {
        TypedQuery<TSuggestionReserveDetail> q = em.createNamedQuery("TSuggestionReserveDetail.findBySuggestion",
                TSuggestionReserveDetail.class);
        q.setParameter("suggestionId", suggestionId);
        return q.getResultList();
    }

    // ------------------------------------------------------------ SAISIE LIGNES

    @Override
    public JSONObject majQuantiteRetenue(TUser user, String detailId, int qte, String motif) {
        TSuggestionReserveDetail d = em.find(TSuggestionReserveDetail.class, detailId);
        if (d == null) {
            return echec("Ligne introuvable.");
        }
        if (TSuggestionReserveDetail.ETAT_TRAITEE.equals(d.getStrETAT())) {
            return echec("Cette ligne a deja ete traitee : sa quantite n'est plus modifiable.");
        }
        if (qte < 0) {
            return echec("La quantite ne peut pas etre negative.");
        }
        // Zero retire la ligne, sans creer le moindre mouvement de stock.
        if (qte == 0) {
            return supprimerLigne(user, detailId, motif);
        }

        d.setIntQTERETENUE(qte);
        d.setStrETAT(qte == nz(d.getIntQTEPROPOSEE()) ? TSuggestionReserveDetail.ETAT_PROPOSEE
                : TSuggestionReserveDetail.ETAT_MODIFIEE);
        if (notBlank(motif)) {
            d.setStrMOTIFLIGNE(motif.trim());
        }
        d.setDtUPDATED(new Date());
        em.merge(d);
        marquerEnCours(d.getLgSUGGESTIONRESERVEID(), user);
        return new JSONObject().put("success", true).put("lg_SUGGESTION_RESERVE_DETAIL_ID", detailId)
                .put("int_QTE_RETENUE", qte).put("str_ETAT", d.getStrETAT());
    }

    @Override
    public JSONObject supprimerLigne(TUser user, String detailId, String motif) {
        TSuggestionReserveDetail d = em.find(TSuggestionReserveDetail.class, detailId);
        if (d == null) {
            return echec("Ligne introuvable.");
        }
        if (TSuggestionReserveDetail.ETAT_TRAITEE.equals(d.getStrETAT())) {
            return echec("Cette ligne a deja ete traitee : elle ne peut plus etre retiree.");
        }
        // La ligne est conservee en base, marquee SUPPRIMEE : la trace de ce qui avait ete propose subsiste.
        d.setStrETAT(TSuggestionReserveDetail.ETAT_SUPPRIMEE);
        d.setIntQTERETENUE(0);
        d.setStrMOTIFLIGNE(notBlank(motif) ? motif.trim() : "Retiree par l'utilisateur");
        d.setDtUPDATED(new Date());
        em.merge(d);
        marquerEnCours(d.getLgSUGGESTIONRESERVEID(), user);
        LOG.log(Level.INFO, "ligne retiree detail={0} user={1}", new Object[] { detailId, user.getLgUSERID() });
        return new JSONObject().put("success", true).put("lg_SUGGESTION_RESERVE_DETAIL_ID", detailId)
                .put("str_ETAT", TSuggestionReserveDetail.ETAT_SUPPRIMEE).put("message", "Ligne retiree.");
    }

    @Override
    public JSONObject supprimerSuggestion(TUser user, String suggestionId, String motif) {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return echec("Suggestion introuvable.");
        }
        if (TSuggestionReserve.STATUT_SUPPRIMEE.equals(s.getStrSTATUT())) {
            return echec("Cette suggestion est deja supprimee.");
        }
        // Un mouvement de stock deja execute ne doit jamais pouvoir etre masque par une suppression.
        for (TSuggestionReserveDetail d : chargerLignes(suggestionId)) {
            if (TSuggestionReserveDetail.ETAT_TRAITEE.equals(d.getStrETAT())) {
                return echec("Cette suggestion contient des lignes deja traitees : elle ne peut plus etre supprimee. "
                        + "Utilisez l'annulation par mouvement inverse.");
            }
        }
        s.setStrSTATUT(TSuggestionReserve.STATUT_SUPPRIMEE);
        s.setStrCOMMENTAIRE(notBlank(motif) ? motif.trim() : s.getStrCOMMENTAIRE());
        s.setLgUSERCLOTUREID(user);
        s.setDtCLOTURE(new Date());
        s.setDtUPDATED(s.getDtCLOTURE());
        em.merge(s);
        LOG.log(Level.INFO, "suggestion supprimee={0} user={1}", new Object[] { suggestionId, user.getLgUSERID() });
        return new JSONObject().put("success", true).put("message", "Suggestion supprimee.");
    }

    // ---------------------------------------------------------------- TRAITEMENT

    @Override
    public JSONObject traiter(TUser user, String suggestionId) {
        return executer(user, suggestionId, false);
    }

    @Override
    public JSONObject reessayerEchecs(TUser user, String suggestionId) {
        return executer(user, suggestionId, true);
    }

    private JSONObject executer(TUser user, String suggestionId, boolean seulementEchecs) {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return echec("Suggestion introuvable.");
        }
        if (TSuggestionReserve.STATUT_SUPPRIMEE.equals(s.getStrSTATUT())) {
            return echec("Cette suggestion est supprimee : elle ne peut plus etre traitee.");
        }

        List<String> aTraiter = new ArrayList<>();
        for (TSuggestionReserveDetail d : chargerLignes(suggestionId)) {
            if (seulementEchecs) {
                if (TSuggestionReserveDetail.ETAT_ECHEC.equals(d.getStrETAT())) {
                    aTraiter.add(d.getLgSUGGESTIONRESERVEDETAILID());
                }
            } else if (estTraitable(d)) {
                aTraiter.add(d.getLgSUGGESTIONRESERVEDETAILID());
            }
        }

        LOG.log(Level.INFO, "traitement suggestion={0} lignes={1} reprise={2} user={3}",
                new Object[] { suggestionId, aTraiter.size(), seulementEchecs, user.getLgUSERID() });

        // Chaque ligne dans sa propre transaction : un echec ne condamne pas les lignes deja passees.
        SuggestionReserveService self = sessionContext.getBusinessObject(SuggestionReserveService.class);
        for (String detailId : aTraiter) {
            try {
                self.traiterLigneIsolee(user, detailId);
            } catch (Exception e) {
                LOG.log(Level.SEVERE, "traitement ligne " + detailId, e);
            }
        }

        finaliserStatut(suggestionId, user);
        return compteRendu(user, suggestionId);
    }

    private static boolean estTraitable(TSuggestionReserveDetail d) {
        String etat = d.getStrETAT();
        if (TSuggestionReserveDetail.ETAT_SUPPRIMEE.equals(etat)
                || TSuggestionReserveDetail.ETAT_TRAITEE.equals(etat)) {
            return false;
        }
        return quantiteARetenir(d) > 0;
    }

    /** Quantite effectivement a deplacer : la retenue si elle est renseignee, sinon la proposition. */
    private static int quantiteARetenir(TSuggestionReserveDetail d) {
        return d.getIntQTERETENUE() != null ? d.getIntQTERETENUE() : nz(d.getIntQTEPROPOSEE());
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public JSONObject traiterLigneIsolee(TUser user, String detailId) {
        TSuggestionReserveDetail d = em.find(TSuggestionReserveDetail.class, detailId);
        if (d == null) {
            return echec("Ligne introuvable.");
        }
        int qte = quantiteARetenir(d);
        String familleId = d.getLgFAMILLEID() != null ? d.getLgFAMILLEID().getLgFAMILLEID() : null;
        String categorie = d.getLgSUGGESTIONRESERVEID().getStrCATEGORIE();

        // Le mouvement passe par le service de reserve : verrou sur le stock, controle du disponible et trace dans
        // t_mouvement_reserve sont ceux deja en place. On utilise la variante qui REJOINT cette transaction : le
        // mouvement et la mise a jour de la ligne ci-dessous sont ainsi valides ou annules ensemble, ce qui interdit
        // qu'une ligne reste rejouable apres un stock deja deplace.
        JSONObject r = reserveService.deplacer(user, familleId, qte, categorie);

        if (r.optBoolean("success", false)) {
            d.setStrETAT(TSuggestionReserveDetail.ETAT_TRAITEE);
            d.setIntQTEDEPLACEE(qte);
            d.setLgMOUVEMENTID(r.optString("lg_MOUVEMENT_ID", null));
            d.setStrCODEECHEC(null);
        } else {
            d.setStrETAT(TSuggestionReserveDetail.ETAT_ECHEC);
            d.setIntQTEDEPLACEE(0);
            d.setStrCODEECHEC(r.optString("code", "ERREUR_TECHNIQUE"));
            d.setStrMOTIFLIGNE(r.optString("message", ""));
        }
        d.setDtUPDATED(new Date());
        em.merge(d);
        return r;
    }

    /** Recalcule le statut de l'en-tete apres un traitement, et renseigne les acteurs et les dates. */
    private void finaliserStatut(String suggestionId, TUser user) {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return;
        }
        int restant = 0;
        int traitees = 0;
        for (TSuggestionReserveDetail d : chargerLignes(suggestionId)) {
            if (TSuggestionReserveDetail.ETAT_TRAITEE.equals(d.getStrETAT())) {
                traitees++;
            } else if (!TSuggestionReserveDetail.ETAT_SUPPRIMEE.equals(d.getStrETAT())) {
                restant++;
            }
        }
        Date now = new Date();
        s.setLgUSERTRAITANTID(user);
        s.setDtUPDATED(now);
        if (restant == 0 && traitees > 0) {
            // Plus rien a traiter : la suggestion est close.
            s.setStrSTATUT(TSuggestionReserve.STATUT_TRAITEE);
            s.setDtTRAITEE(now);
            s.setDtCLOTURE(now);
            s.setLgUSERCLOTUREID(user);
        } else if (traitees > 0) {
            // Traitement partiel : reste EN_COURS, statut qui couvre aussi le partiellement traite.
            s.setStrSTATUT(TSuggestionReserve.STATUT_EN_COURS);
            s.setDtTRAITEE(now);
        }
        em.merge(s);
    }

    /** Bascule une suggestion de A_TRAITER a EN_COURS des la premiere intervention de l'utilisateur. */
    private void marquerEnCours(TSuggestionReserve s, TUser user) {
        if (s != null && TSuggestionReserve.STATUT_A_TRAITER.equals(s.getStrSTATUT())) {
            s.setStrSTATUT(TSuggestionReserve.STATUT_EN_COURS);
            s.setLgUSERTRAITANTID(user);
            s.setDtUPDATED(new Date());
            em.merge(s);
        }
    }

    // --------------------------------------------------------------- RENDU

    @Override
    public JSONObject compteRendu(TUser user, String suggestionId) {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return echec("Suggestion introuvable.");
        }
        JSONArray traites = new JSONArray();
        JSONArray nonTraites = new JSONArray();
        int demandes = 0;
        int reussis = 0;
        int echoues = 0;
        int supprimes = 0;
        int ignores = 0;

        for (TSuggestionReserveDetail d : chargerLignes(suggestionId)) {
            JSONObject l = ligneJson(user, d);
            String etat = d.getStrETAT();
            if (TSuggestionReserveDetail.ETAT_TRAITEE.equals(etat)) {
                reussis++;
                demandes++;
                traites.put(l);
            } else if (TSuggestionReserveDetail.ETAT_ECHEC.equals(etat)) {
                echoues++;
                demandes++;
                nonTraites.put(l);
            } else if (TSuggestionReserveDetail.ETAT_SUPPRIMEE.equals(etat)) {
                supprimes++;
                nonTraites.put(l);
            } else {
                ignores++;
                demandes++;
                nonTraites.put(l);
            }
        }

        return new JSONObject().put("success", true).put("entete", enteteJson(s))
                .put("total_demande", demandes).put("total_reussi", reussis).put("total_echoue", echoues)
                .put("total_supprime", supprimes).put("total_ignore", ignores)
                .put("articles_traites", traites).put("articles_non_traites", nonTraites)
                .put("relancable", echoues > 0);
    }

    @Override
    public byte[] exportCompteRenduExcel(TUser user, String suggestionId) throws java.io.IOException {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return new byte[0];
        }
        List<TSuggestionReserveDetail> lignes = chargerLignes(suggestionId);
        if (lignes.isEmpty()) {
            return new byte[0];
        }
        // Le titre porte l'identite de la suggestion : un classeur exporte reste interpretable seul.
        String titre = "Compte rendu " + texte(s.getStrREF()) + " - " + libelleSens(s.getStrCATEGORIE()) + " - statut "
                + texte(s.getStrSTATUT()) + " - motif " + (s.getMotif() != null ? s.getMotif().getLibelle() : "-")
                + " - creee le " + dateTexte(s.getDtCREATED()) + " par " + nomUtilisateur(s.getLgUSERCREATEURID())
                + (s.getDtCLOTURE() != null
                        ? " - cloturee le " + dateTexte(s.getDtCLOTURE()) + " par "
                                + nomUtilisateur(s.getLgUSERCLOTUREID())
                        : "");
        String[] entetes = { "CIP", "Designation", "Declencheur", "Qte proposee", "Qte retenue", "Qte deplacee",
                "Etat", "Code echec", "Motif / message" };
        return reportExcelExportService.createExcelReport(titre, entetes, lignes, (row, d) -> {
            int col = 0;
            row.createCell(col++).setCellValue(d.getLgFAMILLEID() != null ? texte(d.getLgFAMILLEID().getIntCIP()) : "");
            row.createCell(col++).setCellValue(d.getLgFAMILLEID() != null ? texte(d.getLgFAMILLEID().getStrNAME()) : "");
            row.createCell(col++).setCellValue(texte(d.getStrFORMULE()));
            row.createCell(col++).setCellValue(nz(d.getIntQTEPROPOSEE()));
            row.createCell(col++).setCellValue(d.getIntQTERETENUE() != null ? d.getIntQTERETENUE() : 0);
            row.createCell(col++).setCellValue(nz(d.getIntQTEDEPLACEE()));
            row.createCell(col++).setCellValue(texte(d.getStrETAT()));
            row.createCell(col++).setCellValue(texte(d.getStrCODEECHEC()));
            row.createCell(col).setCellValue(texte(d.getStrMOTIFLIGNE()));
        });
    }

    private static String libelleSens(String categorie) {
        return TSuggestionReserve.CATEGORIE_RESERVE.equals(categorie) ? "REAPPRO RESERVE (envoi en reserve)"
                : "REAPPRO RAYON (envoi en rayon)";
    }

    // ------------------------------------------------------------------- JSON

    private JSONObject enteteJson(TSuggestionReserve s) {
        return new JSONObject().put("lg_SUGGESTION_RESERVE_ID", s.getLgSUGGESTIONRESERVEID())
                .put("str_REF", texte(s.getStrREF())).put("str_CATEGORIE", texte(s.getStrCATEGORIE()))
                .put("str_ORIGINE", texte(s.getStrORIGINE())).put("str_STATUT", texte(s.getStrSTATUT()))
                .put("str_COMMENTAIRE", texte(s.getStrCOMMENTAIRE()))
                .put("motif_id", s.getMotif() != null ? s.getMotif().getId() : JSONObject.NULL)
                .put("motif_libelle", s.getMotif() != null ? s.getMotif().getLibelle() : "")
                .put("str_USER_CREATEUR", nomUtilisateur(s.getLgUSERCREATEURID()))
                .put("str_USER_TRAITANT", nomUtilisateur(s.getLgUSERTRAITANTID()))
                .put("str_USER_CLOTURE", nomUtilisateur(s.getLgUSERCLOTUREID()))
                .put("dt_CREATED", dateTexte(s.getDtCREATED())).put("dt_UPDATED", dateTexte(s.getDtUPDATED()))
                .put("dt_TRAITEE", dateTexte(s.getDtTRAITEE())).put("dt_CLOTURE", dateTexte(s.getDtCLOTURE()));
    }

    private JSONObject ligneJson(TUser user, TSuggestionReserveDetail d) {
        TFamille f = d.getLgFAMILLEID();
        JSONObject json = new JSONObject();
        json.put("lg_SUGGESTION_RESERVE_DETAIL_ID", d.getLgSUGGESTIONRESERVEDETAILID());
        json.put("lg_FAMILLE_ID", f != null ? f.getLgFAMILLEID() : "");
        json.put("int_CIP", f != null ? texte(f.getIntCIP()) : "");
        json.put("str_NAME", f != null ? texte(f.getStrNAME()) : "");
        json.put("int_QTE_PROPOSEE", nz(d.getIntQTEPROPOSEE()));
        json.put("int_QTE_RETENUE", d.getIntQTERETENUE() != null ? d.getIntQTERETENUE() : JSONObject.NULL);
        json.put("int_QTE_DEPLACEE", nz(d.getIntQTEDEPLACEE()));
        // Explication figee a la creation (§4)
        json.put("int_STOCK_RAYON", nz(d.getIntSTOCKRAYON()));
        json.put("int_STOCK_RESERVE", nz(d.getIntSTOCKRESERVE()));
        json.put("int_SEUIL_DECLENCHEUR",
                d.getIntSEUILDECLENCHEUR() != null ? d.getIntSEUILDECLENCHEUR() : JSONObject.NULL);
        json.put("int_CIBLE", nz(d.getIntCIBLE()));
        json.put("int_DISPONIBLE", nz(d.getIntDISPONIBLE()));
        json.put("str_FORMULE", texte(d.getStrFORMULE()));
        json.put("str_ETAT", texte(d.getStrETAT()));
        json.put("str_CODE_ECHEC", texte(d.getStrCODEECHEC()));
        json.put("str_MOTIF_LIGNE", texte(d.getStrMOTIFLIGNE()));
        json.put("lg_MOUVEMENT_ID", texte(d.getLgMOUVEMENTID()));

        // Stock ACTUEL a cote du stock constate a la creation : l'utilisateur voit si la proposition a vieilli.
        if (f != null && user != null) {
            JSONObject actuel = reserveService.proposition(user, f.getLgFAMILLEID(),
                    d.getLgSUGGESTIONRESERVEID().getStrCATEGORIE());
            if (actuel != null) {
                json.put("int_STOCK_RAYON_ACTUEL", actuel.optInt("int_STOCK_RAYON", 0));
                json.put("int_STOCK_RESERVE_ACTUEL", actuel.optInt("int_STOCK_RESERVE", 0));
                json.put("int_PROPOSITION_ACTUELLE", actuel.optInt("int_PROPOSITION", 0));
            }
        }
        return json;
    }

    // ------------------------------------------------------------------ OUTILS

    private static String normaliserCategorie(String categorie) {
        return TSuggestionReserve.CATEGORIE_RESERVE.equalsIgnoreCase(categorie) ? TSuggestionReserve.CATEGORIE_RESERVE
                : TSuggestionReserve.CATEGORIE_RAYON;
    }

    private static String genererReference(String categorie) {
        String prefixe = TSuggestionReserve.CATEGORIE_RESERVE.equals(categorie) ? "SR-RES-" : "SR-RAY-";
        return prefixe + new SimpleDateFormat("yyMMdd-HHmmss").format(new Date());
    }

    private static Date debutDeJournee(String iso) {
        Date d = parseDate(iso);
        return d != null ? d : new Date(0L);
    }

    private static Date finDeJournee(String iso) {
        Date d = parseDate(iso);
        return d != null ? new Date(d.getTime() + 86399999L) : new Date(Long.MAX_VALUE);
    }

    private static Date parseDate(String iso) {
        try {
            return new SimpleDateFormat("yyyy-MM-dd").parse(iso.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private static String dateTexte(Date d) {
        return d == null ? "" : new SimpleDateFormat("dd/MM/yyyy HH:mm").format(d);
    }

    private static String nomUtilisateur(TUser u) {
        if (u == null) {
            return "";
        }
        String nom = (u.getStrFIRSTNAME() == null ? "" : u.getStrFIRSTNAME()) + " "
                + (u.getStrLASTNAME() == null ? "" : u.getStrLASTNAME());
        return nom.trim().isEmpty() ? texte(u.getStrLOGIN()) : nom.trim();
    }

    private static String texte(String s) {
        return s == null ? "" : s;
    }

    private static int nz(Integer i) {
        return i == null ? 0 : i;
    }

    private static boolean notBlank(String s) {
        return s != null && !s.trim().isEmpty();
    }

    private static JSONObject echec(String message) {
        return new JSONObject().put("success", false).put("message", message);
    }
}
