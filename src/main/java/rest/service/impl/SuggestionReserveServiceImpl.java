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

    /** Interrupteur du declenchement sur vente : mettre a 0 en base pour le desactiver sans redeploiement. */
    private static final String PARAM_HOOK_VENTE = "SUGGESTION_RESERVE_HOOK_VENTE";
    /** Cle de regroupement des produits d'une meme vente, portee par la transaction en cours. */
    private static final String CLE_PRODUITS_VENTE = "SUGGESTION_RESERVE_PRODUITS_VENTE";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Resource
    private SessionContext sessionContext;

    @Resource
    private javax.transaction.TransactionSynchronizationRegistry txRegistry;

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
        // Motif obligatoire : chaque mouvement de reserve doit pouvoir etre justifie a posteriori.
        // Controle cote serveur, l'ecran ne fait qu'anticiper le refus.
        if (motifId == null) {
            return echec("Le motif est obligatoire : precisez pourquoi cette suggestion est creee.")
                    .put("code", "MOTIF_OBLIGATOIRE");
        }
        MotifSuggestionReserve motif = em.find(MotifSuggestionReserve.class, motifId);
        if (motif == null) {
            return echec("Motif inconnu.").put("code", "MOTIF_OBLIGATOIRE");
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
        s.setMotif(motif);
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

        // Quand l'utilisateur saisit lui-meme une quantite alors que la regle automatique ne
        // propose rien, c'est LUI qui propose : sa valeur devient la proposition initiale.
        // Enregistrer zero afficherait une suggestion vide et marquerait la ligne "modifiee"
        // des son ouverture, alors que l'utilisateur n'a encore rien change.
        boolean saisieManuelle = (proposition <= 0 && qteRetenueDemandee > 0);
        int propositionInitiale = saisieManuelle ? qteRetenueDemandee : proposition;

        TSuggestionReserveDetail d = new TSuggestionReserveDetail(IdGenerator.getComplexId());
        d.setLgSUGGESTIONRESERVEID(s);
        d.setLgFAMILLEID(famille);
        d.setIntQTEPROPOSEE(propositionInitiale);
        d.setIntQTERETENUE(qteRetenueDemandee > 0 ? qteRetenueDemandee : propositionInitiale);
        d.setIntQTEDEPLACEE(0);
        d.setIntSTOCKRAYON(p.optInt("int_STOCK_RAYON", 0));
        d.setIntSTOCKRESERVE(p.optInt("int_STOCK_RESERVE", 0));
        d.setIntSEUILDECLENCHEUR(p.isNull("int_SEUIL_DECLENCHEUR") ? null : p.optInt("int_SEUIL_DECLENCHEUR"));
        d.setIntCIBLE(p.optInt("int_CIBLE", 0));
        d.setIntDISPONIBLE(p.optInt("int_DISPONIBLE", 0));
        // L'explication doit dire la verite : afficher une soustraction qui donne zero alors
        // que la ligne porte une quantite serait incomprehensible.
        // Quand l'utilisateur impose une quantite alors que la regle ne proposait rien, on le dit
        // simplement, et on rappelle ensuite l'etat des stocks a la creation.
        d.setStrFORMULE(saisieManuelle
                ? "Quantite de " + qteRetenueDemandee + " decidee par l'utilisateur : la regle "
                        + "automatique ne proposait rien. " + p.optString("str_FORMULE", "")
                : p.optString("str_FORMULE", ""));
        // La ligne n'est "modifiee" que si l'utilisateur s'ecarte reellement de ce qui a ete propose.
        d.setStrETAT(qteRetenueDemandee > 0 && qteRetenueDemandee != propositionInitiale
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
            String search, String dtStart, String dtEnd, String userId, String controle, String tri, int start,
            int limit) {
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
        // Controle : seules les suggestions traitees peuvent l'etre, une suggestion a traiter n'est
        // donc jamais rendue par ce filtre, dans un sens comme dans l'autre.
        if ("O".equalsIgnoreCase(controle)) {
            jpql.append(" AND s.dtCONTROLE IS NOT NULL");
        } else if ("N".equalsIgnoreCase(controle)) {
            jpql.append(" AND s.dtCONTROLE IS NULL AND s.strSTATUT = '" + TSuggestionReserve.STATUT_TRAITEE + "'");
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

        List<TSuggestionReserve> page = q.getResultList();
        // Nombre de produits par suggestion : une seule requete pour toute la page, et non une par
        // ligne, pour ne pas alourdir l'affichage de la liste.
        java.util.Map<String, Integer> compteurs = compterLignes(page);

        JSONArray results = new JSONArray();
        for (TSuggestionReserve s : page) {
            Integer nb = compteurs.get(s.getLgSUGGESTIONRESERVEID());
            results.put(enteteJson(s).put("nb_produits", nb == null ? 0 : nb));
        }
        return new JSONObject().put("total", total).put("results", results);
    }

    /** Compte les lignes non retirees de chaque suggestion de la page, en une seule requete. */
    private java.util.Map<String, Integer> compterLignes(List<TSuggestionReserve> page) {
        java.util.Map<String, Integer> out = new java.util.HashMap<>();
        if (page == null || page.isEmpty()) {
            return out;
        }
        List<String> ids = new ArrayList<>();
        for (TSuggestionReserve s : page) {
            ids.add(s.getLgSUGGESTIONRESERVEID());
        }
        try {
            @SuppressWarnings("unchecked")
            List<Object[]> rows = em
                    .createQuery("SELECT d.lgSUGGESTIONRESERVEID.lgSUGGESTIONRESERVEID, COUNT(d)"
                            + " FROM TSuggestionReserveDetail d"
                            + " WHERE d.lgSUGGESTIONRESERVEID.lgSUGGESTIONRESERVEID IN :ids"
                            + " AND d.strETAT <> :retiree"
                            + " GROUP BY d.lgSUGGESTIONRESERVEID.lgSUGGESTIONRESERVEID")
                    .setParameter("ids", ids).setParameter("retiree", TSuggestionReserveDetail.ETAT_SUPPRIMEE)
                    .getResultList();
            for (Object[] r : rows) {
                out.put(String.valueOf(r[0]), ((Number) r[1]).intValue());
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "compterLignes", e);
        }
        return out;
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

    // ---------------------------------------------------------------- VERROU

    /**
     * Au-dela de ce delai sans activite, le verrou est considere comme abandonne. Sans cela, un poste ferme
     * brutalement condamnerait la suggestion pour tout le monde.
     */
    private static final long VERROU_EXPIRATION_MS = 20L * 60L * 1000L;

    @Override
    public JSONObject ouvrirPourTraitement(TUser user, String suggestionId) {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return echec("Suggestion introuvable.");
        }
        JSONObject detail = detail(user, suggestionId);
        if (!detail.optBoolean("success", false)) {
            return detail;
        }

        TUser occupant = s.getLgUSERVERROUID();
        boolean perime = s.getDtVERROU() == null
                || (System.currentTimeMillis() - s.getDtVERROU().getTime()) > VERROU_EXPIRATION_MS;
        boolean libre = occupant == null || perime;
        boolean parMoi = occupant != null && occupant.getLgUSERID().equals(user.getLgUSERID());

        // Une suggestion close n'est plus modifiable : inutile de la verrouiller.
        boolean close = TSuggestionReserve.STATUT_TRAITEE.equals(s.getStrSTATUT())
                || TSuggestionReserve.STATUT_SUPPRIMEE.equals(s.getStrSTATUT());

        if (close) {
            return detail.put("modifiable", false).put("verrou_par", "").put("verrou_depuis", "")
                    .put("motif_lecture_seule", "Cette suggestion est cloturee : elle est consultable uniquement.");
        }
        if (libre || parMoi) {
            s.setLgUSERVERROUID(user);
            s.setDtVERROU(new Date());
            em.merge(s);
            LOG.log(Level.INFO, "verrou pris suggestion={0} user={1}",
                    new Object[] { suggestionId, user.getLgUSERID() });
            return detail.put("modifiable", true).put("verrou_par", "").put("verrou_depuis", "");
        }

        // Occupee par quelqu'un d'autre : on laisse consulter, sans autoriser la saisie.
        LOG.log(Level.INFO, "verrou refuse suggestion={0} occupant={1} demandeur={2}",
                new Object[] { suggestionId, occupant.getLgUSERID(), user.getLgUSERID() });
        return detail.put("modifiable", false).put("verrou_par", nomUtilisateur(occupant))
                .put("verrou_depuis", dateTexte(s.getDtVERROU()))
                .put("motif_lecture_seule", nomUtilisateur(occupant) + " a ouvert cette suggestion depuis "
                        + dateTexte(s.getDtVERROU())
                        + ". Vous pouvez la consulter, mais pas la modifier tant qu'elle est occupee.");
    }

    @Override
    public JSONObject libererVerrou(TUser user, String suggestionId) {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return echec("Suggestion introuvable.");
        }
        // On ne libere que SON propre verrou : personne ne peut deloger quelqu'un d'autre.
        if (s.getLgUSERVERROUID() != null && s.getLgUSERVERROUID().getLgUSERID().equals(user.getLgUSERID())) {
            s.setLgUSERVERROUID(null);
            s.setDtVERROU(null);
            em.merge(s);
            LOG.log(Level.INFO, "verrou libere suggestion={0} user={1}",
                    new Object[] { suggestionId, user.getLgUSERID() });
        }
        return new JSONObject().put("success", true);
    }

    /**
     * Verifie que l'utilisateur detient bien la suggestion avant toute modification, et prolonge son verrou.
     *
     * @return {@code null} si l'operation peut se poursuivre, sinon le refus a retourner tel quel
     */
    private JSONObject verifierVerrou(TUser user, TSuggestionReserve s) {
        if (s == null) {
            return echec("Suggestion introuvable.");
        }
        TUser occupant = s.getLgUSERVERROUID();
        boolean perime = s.getDtVERROU() == null
                || (System.currentTimeMillis() - s.getDtVERROU().getTime()) > VERROU_EXPIRATION_MS;
        if (occupant != null && !perime && !occupant.getLgUSERID().equals(user.getLgUSERID())) {
            return echec(nomUtilisateur(occupant) + " a ouvert cette suggestion depuis " + dateTexte(s.getDtVERROU())
                    + " : vos modifications ne peuvent pas etre enregistrees tant qu'elle est occupee.")
                            .put("code", "SUGGESTION_OCCUPEE");
        }
        // L'utilisateur travaille dessus : on repousse l'expiration.
        s.setLgUSERVERROUID(user);
        s.setDtVERROU(new Date());
        em.merge(s);
        return null;
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
        if (TSuggestionReserveDetail.ETAT_ANNULEE.equals(d.getStrETAT())) {
            return echec("Cette ligne a ete annulee : sa quantite n'est plus modifiable.");
        }
        if (qte < 0) {
            return echec("La quantite ne peut pas etre negative.");
        }
        JSONObject refus = verifierVerrou(user, d.getLgSUGGESTIONRESERVEID());
        if (refus != null) {
            return refus;
        }
        // Zero retire la ligne, sans creer le moindre mouvement de stock.
        if (qte == 0) {
            return supprimerLigne(user, detailId, motif);
        }

        d.setIntQTERETENUE(qte);
        // Valider une quantite est un acte de l'utilisateur, meme lorsqu'il confirme la valeur proposee :
        // la ligne passe donc a MODIFIEE, ce qui la distingue visuellement de celles encore non vues.
        d.setStrETAT(TSuggestionReserveDetail.ETAT_MODIFIEE);
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
        JSONObject refusVerrou = verifierVerrou(user, d.getLgSUGGESTIONRESERVEID());
        if (refusVerrou != null) {
            return refusVerrou;
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
        if (TSuggestionReserve.STATUT_ANNULEE.equals(s.getStrSTATUT())) {
            // Elle porte la trace de mouvements executes puis defaits : la supprimer effacerait
            // cet historique de l'ecran.
            return echec("Cette suggestion a ete annulee : elle est conservee pour l'historique "
                    + "et ne peut plus etre supprimee.");
        }
        JSONObject refusVerrou = verifierVerrou(user, s);
        if (refusVerrou != null) {
            return refusVerrou;
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
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public JSONObject traiter(TUser user, String suggestionId) {
        return executer(user, suggestionId, false);
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public JSONObject reessayerEchecs(TUser user, String suggestionId) {
        return executer(user, suggestionId, true);
    }

    /**
     * Orchestre le traitement SANS transaction englobante.
     *
     * <p>
     * C'est le point cle. La base travaille en lecture repetable : une transaction qui a deja lu conserve son image des
     * donnees jusqu'a sa fin, et ne verrait donc jamais les lignes validees entre-temps par les traitements isoles.
     * Elle compterait comme ignoree une ligne pourtant deplacee, et laisserait le statut a En cours. Les trois etapes
     * s'executent donc chacune dans SA PROPRE transaction, par le proxy du bean.
     */
    private JSONObject executer(TUser user, String suggestionId, boolean seulementEchecs) {
        SuggestionReserveService self = sessionContext.getBusinessObject(SuggestionReserveService.class);

        JSONObject prepa = self.preparerTraitement(user, suggestionId, seulementEchecs);
        if (!prepa.optBoolean("success", false)) {
            return prepa;
        }
        JSONArray ids = prepa.optJSONArray("ids");
        int nb = ids == null ? 0 : ids.length();

        LOG.log(Level.INFO, "traitement suggestion={0} lignes={1} reprise={2} user={3}",
                new Object[] { suggestionId, nb, seulementEchecs, user.getLgUSERID() });

        // Chaque ligne dans sa propre transaction : un echec ne condamne pas les lignes deja passees.
        for (int i = 0; i < nb; i++) {
            String detailId = ids.optString(i, null);
            if (detailId == null || detailId.isEmpty()) {
                continue;
            }
            try {
                self.traiterLigneIsolee(user, detailId);
            } catch (Exception e) {
                LOG.log(Level.SEVERE, "traitement ligne " + detailId, e);
            }
        }

        return self.finaliserEtCompteRendu(user, suggestionId);
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public JSONObject preparerTraitement(TUser user, String suggestionId, boolean seulementEchecs) {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return echec("Suggestion introuvable.");
        }
        if (TSuggestionReserve.STATUT_SUPPRIMEE.equals(s.getStrSTATUT())) {
            return echec("Cette suggestion est supprimee : elle ne peut plus etre traitee.");
        }
        if (TSuggestionReserve.STATUT_ANNULEE.equals(s.getStrSTATUT())) {
            return echec("Cette suggestion a ete annulee : elle ne peut plus etre traitee. "
                    + "Creez une nouvelle suggestion pour refaire l'operation.");
        }
        JSONObject refus = verifierVerrou(user, s);
        if (refus != null) {
            return refus;
        }

        JSONArray ids = new JSONArray();
        for (TSuggestionReserveDetail d : chargerLignes(suggestionId)) {
            if (seulementEchecs) {
                if (TSuggestionReserveDetail.ETAT_ECHEC.equals(d.getStrETAT())) {
                    ids.put(d.getLgSUGGESTIONRESERVEDETAILID());
                }
            } else if (estTraitable(d)) {
                ids.put(d.getLgSUGGESTIONRESERVEDETAILID());
            }
        }
        return new JSONObject().put("success", true).put("ids", ids);
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public JSONObject finaliserEtCompteRendu(TUser user, String suggestionId) {
        finaliserStatut(suggestionId, user);
        return compteRendu(user, suggestionId);
    }

    private static boolean estTraitable(TSuggestionReserveDetail d) {
        String etat = d.getStrETAT();
        // ANNULEE comprise : rejouer une ligne annulee reproduirait exactement le mouvement que
        // l'on vient de defaire.
        if (TSuggestionReserveDetail.ETAT_SUPPRIMEE.equals(etat)
                || TSuggestionReserveDetail.ETAT_TRAITEE.equals(etat)
                || TSuggestionReserveDetail.ETAT_ANNULEE.equals(etat)) {
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
            } else if (TSuggestionReserveDetail.ETAT_SUPPRIMEE.equals(etat)
                    || TSuggestionReserveDetail.ETAT_ANNULEE.equals(etat)) {
                supprimes++;
                nonTraites.put(l.put("str_RAISON", raisonNonTraitee(d)));
            } else {
                ignores++;
                demandes++;
                nonTraites.put(l.put("str_RAISON", raisonNonTraitee(d)));
            }
        }

        return new JSONObject().put("success", true).put("entete", enteteJson(s))
                .put("total_demande", demandes).put("total_reussi", reussis).put("total_echoue", echoues)
                .put("total_supprime", supprimes).put("total_ignore", ignores)
                .put("articles_traites", traites).put("articles_non_traites", nonTraites)
                .put("relancable", echoues > 0);
    }

    /**
     * Explique, en langage courant, pourquoi une ligne n'a pas ete traitee. Sans cela le compte rendu se contentait de
     * lister l'article, sans jamais dire ce qui s'etait passe.
     */
    private static String raisonNonTraitee(TSuggestionReserveDetail d) {
        String etat = d.getStrETAT();
        if (TSuggestionReserveDetail.ETAT_ANNULEE.equals(etat)) {
            String motif = texte(d.getStrMOTIFLIGNE());
            return motif.isEmpty() ? "Mouvement annule : le stock a ete remis en place."
                    : motif;
        }
        if (TSuggestionReserveDetail.ETAT_SUPPRIMEE.equals(etat)) {
            String motif = texte(d.getStrMOTIFLIGNE());
            return motif.isEmpty() ? "Ligne retiree de la suggestion avant le traitement."
                    : "Ligne retiree de la suggestion : " + motif;
        }
        if (TSuggestionReserveDetail.ETAT_ECHEC.equals(etat)) {
            String motif = texte(d.getStrMOTIFLIGNE());
            return motif.isEmpty() ? "Le mouvement a echoue." : motif;
        }
        if (quantiteARetenir(d) <= 0) {
            return "Quantite retenue a zero : il n'y a rien a deplacer pour cet article.";
        }
        return "Ligne restee a traiter : le traitement ne l'a pas prise en compte.";
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
                        : "")
                // Le controle fait partie du compte rendu : un classeur archive doit dire si
                // quelqu'un a constate que le deplacement avait bien ete fait.
                + (s.getDtCONTROLE() != null
                        ? " - controlee le " + dateTexte(s.getDtCONTROLE()) + " par "
                                + nomUtilisateur(s.getLgUSERCONTROLEID())
                                + (notBlank(s.getStrOBSERVATIONCONTROLE())
                                        ? " (" + s.getStrOBSERVATIONCONTROLE() + ")" : "")
                        : " - NON CONTROLEE");
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

    @Override
    public JSONObject creerDepuisRecherche(TUser user, String type, String search, Integer motifId,
            String commentaire) {
        // Le sens decoule de l'onglet : REAPPRO range le trop-plein en reserve, les autres regarnissent le rayon.
        String categorie = "REAPPRO".equalsIgnoreCase(type) ? TSuggestionReserve.CATEGORIE_RESERVE
                : TSuggestionReserve.CATEGORIE_RAYON;

        // limit a 0 : on reprend TOUT le resultat de recherche, pas seulement la page affichee.
        JSONObject data = reserveService.listArticles(user, search, type, 0, 0);
        JSONArray articles = data.optJSONArray("results");
        List<JSONObject> items = new ArrayList<>();
        if (articles != null) {
            for (int i = 0; i < articles.length(); i++) {
                JSONObject a = articles.getJSONObject(i);
                items.add(new JSONObject().put("lg_FAMILLE_ID", a.optString("lg_FAMILLE_ID", "")));
            }
        }
        if (items.isEmpty()) {
            return echec("La recherche ne ramene aucun article.");
        }
        LOG.log(Level.INFO, "creerDepuisRecherche type={0} articles={1} user={2}",
                new Object[] { type, items.size(), user.getLgUSERID() });
        return creer(user, categorie, motifId, commentaire, items);
    }

    @Override
    public JSONObject controler(TUser user, String suggestionId, String observation) {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return echec("Suggestion introuvable.");
        }
        // Le controle atteste d'un deplacement physique : il n'a de sens que sur une suggestion
        // dont les mouvements ont ete executes.
        if (!TSuggestionReserve.STATUT_TRAITEE.equals(s.getStrSTATUT())) {
            return echec("Seule une suggestion traitee peut etre controlee.");
        }
        // Un controle deja pose n'est pas remplace : on perdrait la trace du premier controleur.
        if (s.getDtCONTROLE() != null) {
            return echec("Cette suggestion a deja ete controlee par " + nomUtilisateur(s.getLgUSERCONTROLEID())
                    + " le " + dateTexte(s.getDtCONTROLE()) + ".");
        }
        s.setLgUSERCONTROLEID(user);
        s.setDtCONTROLE(new java.util.Date());
        s.setStrOBSERVATIONCONTROLE(notBlank(observation) ? observation.trim() : null);
        s.setDtUPDATED(new java.util.Date());
        em.merge(s);

        LOG.log(Level.INFO, "controle suggestion={0} user={1}",
                new Object[] { suggestionId, user.getLgUSERID() });
        return new JSONObject().put("success", true).put("str_USER_CONTROLE", nomUtilisateur(user))
                .put("dt_CONTROLE", dateTexte(s.getDtCONTROLE()))
                .put("message", "Controle enregistre.");
    }

    @Override
    public JSONObject creerInventaire(TUser user, String suggestionId) {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return echec("Suggestion introuvable.");
        }
        java.util.Set<String> produits = new java.util.LinkedHashSet<>();
        for (TSuggestionReserveDetail d : chargerLignes(suggestionId)) {
            // Une ligne retiree ne fait plus partie de la suggestion : elle n'a pas a etre inventoriee.
            if (!TSuggestionReserveDetail.ETAT_SUPPRIMEE.equals(d.getStrETAT()) && d.getLgFAMILLEID() != null) {
                produits.add(d.getLgFAMILLEID().getLgFAMILLEID());
            }
        }
        if (produits.isEmpty()) {
            return echec("Cette suggestion ne contient aucun produit a inventorier.");
        }
        String commentaire = "Inventaire issu de la suggestion " + texte(s.getStrREF());
        return reserveService.createInventaireFromSelection(user, produits, commentaire);
    }

    // ------------------------------------------------------------- ANNULATION

    @Override
    public JSONObject annulerLigne(TUser user, String detailId, String motif) {
        SuggestionReserveService self = sessionContext.getBusinessObject(SuggestionReserveService.class);
        JSONObject r = self.annulerLigneIsolee(user, detailId, motif);
        TSuggestionReserveDetail d = em.find(TSuggestionReserveDetail.class, detailId);
        if (d != null) {
            recalculerStatutApresAnnulation(d.getLgSUGGESTIONRESERVEID().getLgSUGGESTIONRESERVEID(), user);
        }
        return r;
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public JSONObject annulerLigneIsolee(TUser user, String detailId, String motif) {
        TSuggestionReserveDetail d = em.find(TSuggestionReserveDetail.class, detailId);
        if (d == null) {
            return echec("Ligne introuvable.").put("code", "LIGNE_INTROUVABLE");
        }
        JSONObject identite = new JSONObject()
                .put("lg_SUGGESTION_RESERVE_DETAIL_ID", detailId)
                .put("int_CIP", d.getLgFAMILLEID() != null ? texte(d.getLgFAMILLEID().getIntCIP()) : "")
                .put("str_NAME", d.getLgFAMILLEID() != null ? texte(d.getLgFAMILLEID().getStrNAME()) : "");

        if (!TSuggestionReserveDetail.ETAT_TRAITEE.equals(d.getStrETAT())) {
            return echec("Cette ligne n'a pas ete traitee : il n'y a aucun mouvement a annuler.")
                    .put("code", "LIGNE_NON_TRAITEE").put("identite", identite);
        }
        if (d.getLgMOUVEMENTID() == null || d.getLgMOUVEMENTID().trim().isEmpty()) {
            return echec("Aucun mouvement n'est rattache a cette ligne : annulation impossible.")
                    .put("code", "MOUVEMENT_ABSENT").put("identite", identite);
        }

        // Le mouvement inverse passe par le service de reserve : privilege, verrou, controle du
        // disponible dans la nouvelle zone source et interdiction des stocks negatifs y sont deja.
        JSONObject r = reserveService.annulerMouvement(user, d.getLgMOUVEMENTID(), motif);
        if (!r.optBoolean("success", false)) {
            return r.put("identite", identite);
        }

        // Etat propre a l'annulation, distinct d'une ligne ecartee avant tout mouvement : ici le
        // stock a bouge puis a ete remis en place. La ligne reste un produit de la suggestion et
        // continue donc d'etre comptee.
        d.setStrETAT(TSuggestionReserveDetail.ETAT_ANNULEE);
        d.setIntQTEDEPLACEE(0);
        d.setStrMOTIFLIGNE("Annulee par mouvement inverse"
                + (motif == null || motif.trim().isEmpty() ? "" : " : " + motif.trim()));
        d.setDtUPDATED(new Date());
        em.merge(d);
        return r.put("identite", identite);
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public JSONObject annulerSuggestion(TUser user, String suggestionId, String motif) {
        // Sans transaction englobante, pour la meme raison qu'au traitement : une transaction deja
        // ouverte conserverait son image des lignes et recalculerait le statut sur des valeurs
        // anterieures aux annulations.
        SuggestionReserveService self = sessionContext.getBusinessObject(SuggestionReserveService.class);

        JSONObject prepa = self.preparerAnnulation(user, suggestionId);
        if (!prepa.optBoolean("success", false)) {
            return prepa;
        }
        JSONArray ids = prepa.optJSONArray("ids");
        JSONArray nonAnnulables = prepa.optJSONArray("lignes_non_annulables");
        int nb = ids == null ? 0 : ids.length();

        JSONArray annulees = new JSONArray();
        JSONArray refusees = new JSONArray();
        for (int i = 0; i < nb; i++) {
            String detailId = ids.optString(i, null);
            if (detailId == null || detailId.isEmpty()) {
                continue;
            }
            JSONObject r;
            try {
                r = self.annulerLigneIsolee(user, detailId, motif);
            } catch (Exception e) {
                LOG.log(Level.SEVERE, "annulation ligne " + detailId, e);
                r = echec("Echec technique sur cette ligne.").put("code", "ERREUR_TECHNIQUE");
            }
            if (r.optBoolean("success", false)) {
                annulees.put(r);
            } else {
                refusees.put(r);
            }
        }

        self.finaliserAnnulation(user, suggestionId);
        LOG.log(Level.INFO, "annulation suggestion={0} annulees={1} refusees={2} user={3}",
                new Object[] { suggestionId, annulees.length(), refusees.length(), user.getLgUSERID() });
        return new JSONObject().put("success", refusees.length() == 0)
                .put("total_annule", annulees.length()).put("total_refuse", refusees.length())
                .put("lignes_annulees", annulees).put("lignes_refusees", refusees)
                .put("lignes_non_annulables", nonAnnulables == null ? new JSONArray() : nonAnnulables)
                .put("message", annulees.length() + " ligne(s) annulee(s), " + refusees.length() + " refusee(s).");
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public JSONObject preparerAnnulation(TUser user, String suggestionId) {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return echec("Suggestion introuvable.");
        }
        if (!reserveService.peutAnnuler(user)) {
            return echec("Vous n'avez pas le privilege requis pour annuler un mouvement de reserve.");
        }
        JSONArray ids = new JSONArray();
        JSONArray nonAnnulables = new JSONArray();
        for (TSuggestionReserveDetail d : chargerLignes(suggestionId)) {
            if (TSuggestionReserveDetail.ETAT_TRAITEE.equals(d.getStrETAT())) {
                ids.put(d.getLgSUGGESTIONRESERVEDETAILID());
            } else if (TSuggestionReserveDetail.ETAT_ANNULEE.equals(d.getStrETAT())) {
                nonAnnulables.put(ligneJson(user, d).put("motif_refus",
                        "Ligne deja annulee : son mouvement a deja ete defait."));
            } else if (!TSuggestionReserveDetail.ETAT_SUPPRIMEE.equals(d.getStrETAT())) {
                // Rien n'a bouge pour cette ligne : il n'y a tout simplement rien a defaire.
                nonAnnulables.put(ligneJson(user, d).put("motif_refus",
                        "Ligne non traitee : aucun mouvement a annuler."));
            }
        }
        return new JSONObject().put("success", true).put("ids", ids)
                .put("lignes_non_annulables", nonAnnulables);
    }

    /**
     * Apres annulation : si plus aucune ligne n'est traitee, la suggestion ne peut plus etre close.
     */
    private void recalculerStatutApresAnnulation(String suggestionId, TUser user) {
        TSuggestionReserve s = em.find(TSuggestionReserve.class, suggestionId);
        if (s == null) {
            return;
        }
        boolean resteDuTraite = false;
        boolean auMoinsUneAnnulee = false;
        for (TSuggestionReserveDetail d : chargerLignes(suggestionId)) {
            if (TSuggestionReserveDetail.ETAT_TRAITEE.equals(d.getStrETAT())) {
                resteDuTraite = true;
            } else if (TSuggestionReserveDetail.ETAT_ANNULEE.equals(d.getStrETAT())) {
                auMoinsUneAnnulee = true;
            }
        }
        if (!resteDuTraite && auMoinsUneAnnulee) {
            // Plus rien n'est traite et au moins une ligne a ete defaite : la suggestion est
            // ANNULEE, statut terminal. La remettre a En cours laisserait croire qu'on peut la
            // reprendre, et la reprendre reproduirait les mouvements qu'on vient d'annuler.
            s.setStrSTATUT(TSuggestionReserve.STATUT_ANNULEE);
            s.setDtCLOTURE(new Date());
            s.setLgUSERCLOTUREID(user);
        } else if (resteDuTraite && TSuggestionReserve.STATUT_TRAITEE.equals(s.getStrSTATUT())) {
            // Annulation partielle : il reste des mouvements en vigueur, la suggestion n'est plus close.
            s.setStrSTATUT(TSuggestionReserve.STATUT_EN_COURS);
            s.setDtCLOTURE(null);
            s.setLgUSERCLOTUREID(null);
        }
        s.setLgUSERTRAITANTID(user);
        s.setDtUPDATED(new Date());
        em.merge(s);
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void finaliserAnnulation(TUser user, String suggestionId) {
        recalculerStatutApresAnnulation(suggestionId, user);
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void evaluerApresMouvement(TUser user, String familleId) {
        try {
            evaluerUnProduit(user, familleId);
        } catch (Exception e) {
            // Un incident ici ne doit jamais remonter : la vente ou l'entree en stock qui nous a appeles prime.
            LOG.log(Level.WARNING, "evaluerApresMouvement famille=" + familleId, e);
            markRollback();
        }
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void evaluerApresMouvementLot(TUser user, java.util.Collection<String> familleIds) {
        if (familleIds == null || familleIds.isEmpty()) {
            return;
        }
        for (String familleId : familleIds) {
            try {
                evaluerUnProduit(user, familleId);
            } catch (Exception e) {
                // Un produit en erreur ne prive pas les autres de leur evaluation.
                LOG.log(Level.WARNING, "evaluerApresMouvementLot famille=" + familleId, e);
            }
        }
    }

    @Override
    public void planifierEvaluationApresVente(TUser user, String familleId) {
        if (familleId == null || familleId.trim().isEmpty()) {
            return;
        }
        try {
            // Un seul regroupement par transaction : les produits d'un meme ticket sont evalues ensemble.
            @SuppressWarnings("unchecked")
            java.util.Set<String> enAttente = (java.util.Set<String>) txRegistry.getResource(CLE_PRODUITS_VENTE);
            if (enAttente != null) {
                enAttente.add(familleId);
                return;
            }
            final java.util.Set<String> produits = new java.util.LinkedHashSet<>();
            produits.add(familleId);
            txRegistry.putResource(CLE_PRODUITS_VENTE, produits);

            // Le proxy est capte maintenant : il servira a declencher l'evaluation dans sa propre
            // transaction, une fois celle de la vente terminee.
            final SuggestionReserveService self = sessionContext.getBusinessObject(SuggestionReserveService.class);
            final TUser vendeur = user;
            txRegistry.registerInterposedSynchronization(new javax.transaction.Synchronization() {
                @Override
                public void beforeCompletion() {
                    // Rien : tout se joue apres la validation.
                }

                @Override
                public void afterCompletion(int status) {
                    // Vente annulee ou en erreur : aucune suggestion a produire.
                    if (status != javax.transaction.Status.STATUS_COMMITTED) {
                        return;
                    }
                    try {
                        self.evaluerApresVente(vendeur, produits);
                    } catch (Exception e) {
                        LOG.log(Level.WARNING, "Suggestions de reserve non evaluees apres la vente", e);
                    }
                }
            });
        } catch (Exception e) {
            // Inscription impossible : on renonce silencieusement, la vente prime.
            LOG.log(Level.WARNING, "planifierEvaluationApresVente famille=" + familleId, e);
        }
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void evaluerApresVente(TUser user, java.util.Collection<String> familleIds) {
        if (!hookVenteActif()) {
            return;
        }
        evaluerApresMouvementLot(user, familleIds);
    }

    /**
     * Declenchement sur vente actif par defaut. Positionner le parametre en base a {@code 0} le desactive sans
     * redeploiement : le reste du module continue de fonctionner, seules les suggestions issues des ventes cessent
     * d'etre generees.
     */
    private boolean hookVenteActif() {
        try {
            dal.TParameters p = em.find(dal.TParameters.class, PARAM_HOOK_VENTE);
            if (p == null || p.getStrVALUE() == null) {
                return true;
            }
            String v = p.getStrVALUE().trim();
            return !("0".equals(v) || "false".equalsIgnoreCase(v) || "non".equalsIgnoreCase(v));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "hookVenteActif", e);
            return true;
        }
    }

    /**
     * Examine les deux sens pour un produit. Le rayon sous son seuil mini l'emporte sur l'excedent : regarnir le rayon
     * prime toujours sur ranger du stock en reserve. Avec un seuil reserve superieur au seuil mini, configuration que
     * produit le calcul automatique des seuils, les deux cas s'excluent de toute facon.
     */
    private void evaluerUnProduit(TUser user, String familleId) {
        if (familleId == null || familleId.trim().isEmpty()) {
            return;
        }
        TFamille f = em.find(TFamille.class, familleId);
        // Garde-fou en tete : l'immense majorite des lignes vendues n'est pas geree en reserve et ressort ici,
        // sans avoir declenche la moindre requete de stock.
        if (f == null || !Boolean.TRUE.equals(f.getBoolRESERVE())) {
            return;
        }
        Integer seuilMini = f.getIntSEUILMINIRAYON();
        int seuilReserve = nz(f.getIntSEUILRESERVE());
        if (seuilMini == null && seuilReserve <= 0) {
            return;
        }

        JSONObject versRayon = reserveService.proposition(user, familleId, TSuggestionReserve.CATEGORIE_RAYON);
        if (versRayon == null) {
            return;
        }
        int stockRayon = versRayon.optInt("int_STOCK_RAYON", 0);

        if (seuilMini != null && stockRayon <= seuilMini && versRayon.optInt("int_PROPOSITION", 0) > 0) {
            rattacher(user, TSuggestionReserve.CATEGORIE_RAYON, familleId);
            return;
        }
        if (seuilReserve > 0 && stockRayon > seuilReserve) {
            JSONObject versReserve = reserveService.proposition(user, familleId,
                    TSuggestionReserve.CATEGORIE_RESERVE);
            if (versReserve != null && versReserve.optInt("int_PROPOSITION", 0) > 0) {
                rattacher(user, TSuggestionReserve.CATEGORIE_RESERVE, familleId);
            }
        }
    }

    /** Ajoute le produit a la suggestion automatique ouverte de ce sens, ou en ouvre une. */
    private void rattacher(TUser user, String categorie, String familleId) {
        TSuggestionReserve s = suggestionAutoOuverte(user, categorie);
        if (s == null) {
            s = ouvrirSuggestionAuto(user, categorie);
        }
        // ajouterLigne ignore un produit deja present et une proposition nulle : la quantite proposee
        // initiale reste donc figee, meme si le stock a encore bouge depuis.
        if (ajouterLigne(user, s, familleId, 0) != null) {
            LOG.log(Level.INFO, "suggestion auto: produit={0} rattache a {1} ({2})",
                    new Object[] { familleId, s.getStrREF(), categorie });
        }
    }

    private TSuggestionReserve suggestionAutoOuverte(TUser user, String categorie) {
        try {
            TypedQuery<TSuggestionReserve> q = em.createNamedQuery("TSuggestionReserve.findOuverteAuto",
                    TSuggestionReserve.class);
            q.setParameter("empl", user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            q.setParameter("categorie", categorie);
            q.setParameter("origine", TSuggestionReserve.ORIGINE_AUTOMATIQUE);
            q.setMaxResults(1);
            List<TSuggestionReserve> l = q.getResultList();
            return l.isEmpty() ? null : l.get(0);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "suggestionAutoOuverte", e);
            return null;
        }
    }

    private TSuggestionReserve ouvrirSuggestionAuto(TUser user, String categorie) {
        TSuggestionReserve s = new TSuggestionReserve(IdGenerator.getComplexId());
        s.setStrREF(genererReference(categorie));
        s.setStrCATEGORIE(categorie);
        s.setStrORIGINE(TSuggestionReserve.ORIGINE_AUTOMATIQUE);
        s.setStrSTATUT(TSuggestionReserve.STATUT_A_TRAITER);
        s.setStrCOMMENTAIRE("Generee automatiquement par les mouvements de stock");
        s.setLgEMPLACEMENTID(user.getLgEMPLACEMENTID());
        s.setLgUSERCREATEURID(user);
        s.setDtCREATED(new Date());
        s.setDtUPDATED(s.getDtCREATED());
        s.setMotif(motifParDefaut(categorie));
        em.persist(s);
        LOG.log(Level.INFO, "suggestion auto ouverte {0} ({1})", new Object[] { s.getStrREF(), categorie });
        return s;
    }

    /** Premier motif actif du sens concerne : avec le referentiel livre, le motif journalier. */
    private MotifSuggestionReserve motifParDefaut(String categorie) {
        try {
            TypedQuery<MotifSuggestionReserve> q = em.createQuery(
                    "SELECT m FROM MotifSuggestionReserve m WHERE m.actif = true AND m.categorie = :cat"
                            + " ORDER BY m.id ASC",
                    MotifSuggestionReserve.class);
            q.setParameter("cat", categorie);
            q.setMaxResults(1);
            List<MotifSuggestionReserve> l = q.getResultList();
            return l.isEmpty() ? null : l.get(0);
        } catch (Exception e) {
            return null;
        }
    }

    private void markRollback() {
        try {
            sessionContext.setRollbackOnly();
        } catch (Exception ignore) {
            LOG.log(Level.FINE, "markRollback: pas de transaction active");
        }
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
                .put("dt_TRAITEE", dateTexte(s.getDtTRAITEE())).put("dt_CLOTURE", dateTexte(s.getDtCLOTURE()))
                .put("str_USER_CONTROLE", nomUtilisateur(s.getLgUSERCONTROLEID()))
                .put("dt_CONTROLE", dateTexte(s.getDtCONTROLE()))
                .put("str_OBSERVATION_CONTROLE", texte(s.getStrOBSERVATIONCONTROLE()))
                .put("bl_CONTROLEE", s.getDtCONTROLE() != null);
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
