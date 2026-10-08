/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.Rupture;
import dal.RuptureDetail;
import dal.TUser;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TGrossiste;
import dal.TOfficine;
import dal.TOrder;
import dal.TOrderDetail;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.StringReader;
import java.io.StringWriter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Level;
import java.util.UUID;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.SessionContext;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.xml.bind.JAXBContext;
import javax.xml.bind.JAXBException;
import javax.xml.bind.Marshaller;
import javax.xml.bind.Unmarshaller;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.collections4.map.HashedMap;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.OrderService;
import rest.service.PharmaMlService;
import rest.service.ProduitService;
import rest.service.SessionHelperService;
import rest.service.dto.CreationProduitDTO;
import rest.service.pharmaMl.Commande;
import rest.service.pharmaMl.Corps;
import rest.service.pharmaMl.CsrpEnveloppe;
import rest.service.pharmaMl.Entete;
import rest.service.pharmaMl.LigneN;
import rest.service.pharmaMl.MessageCorps;
import rest.service.pharmaMl.MessageEntete;
import rest.service.pharmaMl.MessageOfficine;
import rest.service.pharmaMl.Normale;
import rest.service.pharmaMl.OfficinePartenaire;
import rest.service.pharmaMl.Partenaire;
import rest.service.pharmaMl.response.CorpsRepartiteur;
import rest.service.pharmaMl.response.CorpsResponse;
import rest.service.pharmaMl.response.CsrpEnveloppeResponse;
import rest.service.pharmaMl.response.IndisponibiliteN;
import rest.service.pharmaMl.response.LigneNReponse;
import rest.service.pharmaMl.response.MessageRepartiteur;
import rest.service.pharmaMl.response.NormaleReponse;
import rest.service.pharmaMl.response.PrixN;
import rest.service.pharmaMl.response.ProduitRemplacant;
import rest.service.pharmaMl.response.RepCommande;
import rest.service.pharmaMl.response.enumeration.TypePrix;
import rest.service.pharmaMl.response.enumeration.TypeRemplacement;
import util.AppParameters;
import util.Constant;
import util.KeyUtilGen;
import util.NumberUtils;
import util.PharmaMlUtils;
import static util.PharmaMlUtils.NATURE_PARTENAIRE_VALUE_OF;
import static util.PharmaMlUtils.TYPE_CODIFICATION_CIP39;
import static util.PharmaMlUtils.TYPE_CODIFICATION_EAN;

/**
 *
 * @author kkoffi
 */
@Stateless
public class PharmaMlServiceImpl implements PharmaMlService {

    private static final Logger LOG = Logger.getLogger(PharmaMlServiceImpl.class.getName());
    private final AppParameters ap = AppParameters.getInstance();
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private OrderService orderService;
    @EJB
    private rest.service.SuggestionService suggestionService;
    @EJB
    private ProduitService produitService;
    @EJB
    private SessionHelperService sessionHelperService;
    @Resource
    private SessionContext contexte;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public JSONObject envoiPharmaInfosProduit(String commandeId) {
        JSONObject json = new JSONObject();
        TOrder order = getEntityManager().find(TOrder.class, commandeId);
        TGrossiste tg = order.getLgGROSSISTEID();
        // a implementer selon le nouveau Pharmaml
        return null;

    }

    @Override
    public JSONObject envoiCommande(String commandeId, LocalDate dateLivraisonSouhaitee, int typeCommande,
            String typeCommandeExecptionel, String commentaire) {
        try {
            TOrder order = em.find(TOrder.class, commandeId);
            TGrossiste grossiste = order.getLgGROSSISTEID();
            if (StringUtils.isEmpty(grossiste.getStrURLPHARMAML())) {
                return new JSONObject().put("success", false).put("msg", "Le grossise n'a url pharmaML");
            }

            JSONObject dejaEnvoyee = attenteEnCours(commandeId, grossiste);
            if (dejaEnvoyee == null) {
                dejaEnvoyee = dejaRepondue(commandeId, grossiste);
            }
            if (dejaEnvoyee != null) {
                return dejaEnvoyee;
            }
            TOfficine officine = getOfficine();
            CsrpEnveloppe payLoad = buildPayload(grossiste, officine, buildNormale(order, grossiste.getLgGROSSISTEID()),
                    StringUtils.isEmpty(commentaire) ? order.getStrREFORDER() : commentaire,
                    refCdeClient(order.getStrREFORDER(), null));
            journalEnvoi("commande", order.getStrREFORDER(), grossiste);
            CsrpEnveloppeResponse enveloppeResponse = processommandeXml(payLoad, order.getStrREFORDER(), grossiste);
            if (Objects.isNull(enveloppeResponse)) {
                return noterEchec(grossiste, SOURCE_COMMANDE, commandeId, ERREUR, REPONSE_ILLISIBLE);
            }
            if (getLigneNReponses(enveloppeResponse).isEmpty() && !order.getTOrderDetailCollection().isEmpty()) {
                /* une rupture totale renvoie quand meme les lignes (quantite 0) : aucune ligne = reponse anormale */
                return noterEchec(grossiste, SOURCE_COMMANDE, commandeId, ERREUR, SANS_LIGNE);
            }
            JSONObject traite = traiterCommandeRepondue(order, enveloppeResponse);
            enregistrerTraite(grossiste, SOURCE_COMMANDE, commandeId, payLoad, traite);
            return traite;
        } catch (EnAttente ex) {
            TGrossiste g = em.find(TOrder.class, commandeId).getLgGROSSISTEID();
            enregistrerAttente(g, SOURCE_COMMANDE, commandeId, ex);
            return reponseEnAttente(g);
        } catch (RefusGrossiste ex) {
            TGrossiste g = em.find(TOrder.class, commandeId).getLgGROSSISTEID();
            LOG.log(Level.WARNING, "PharmaML : {0} a refuse la commande ({1})",
                    new Object[] { g.getStrLIBELLE(), ex.version });
            return noterEchec(g, SOURCE_COMMANDE, commandeId, REFUSEE, messageRefus(g, ex));
        } catch (RefusHttp ex) {
            TGrossiste g = em.find(TOrder.class, commandeId).getLgGROSSISTEID();
            LOG.log(Level.WARNING, "PharmaML : {0} a repondu {1}", new Object[] { g.getStrLIBELLE(), ex.getMessage() });
            return noterEchec(g, SOURCE_COMMANDE, commandeId, REFUSEE, messageRefus(g, ex));
        } catch (Exception ex) {
            if (erreurReseau(ex)) {
                TGrossiste g = em.find(TOrder.class, commandeId).getLgGROSSISTEID();
                LOG.log(Level.WARNING, "PharmaML : {0} injoignable ({1})",
                        new Object[] { g.getStrLIBELLE(), ex.getClass().getSimpleName() });
                return noterEchec(g, SOURCE_COMMANDE, commandeId, NON_ENVOYEE, messageReseau(g, ex));
            }
            LOG.log(Level.SEVERE, null, ex);
            return new JSONObject().put("success", false).put("msg", "Une erreur c'est produite");
        }
    }

    @Override
    public JSONObject renvoiPharmaCommande(String ruptureId, String grossisteId, LocalDate dateLivraisonSouhaitee) {
        try {
            Rupture rupture = em.find(Rupture.class, ruptureId);
            TGrossiste grossiste = em.find(TGrossiste.class, grossisteId);
            if (StringUtils.isEmpty(grossiste.getStrURLPHARMAML())) {
                return new JSONObject().put("success", false).put("msg", "Le grossise n'a url pharmaML");
            }
            JSONObject dejaEnvoyee = attenteEnCours(ruptureId, grossiste);
            if (dejaEnvoyee != null) {
                return dejaEnvoyee;
            }
            List<RuptureDetail> ruptureDetails = orderService.ruptureDetaisDtoByRupture(rupture.getId());
            TOfficine officine = getOfficine();
            CsrpEnveloppe payLoad = buildPayload(grossiste, officine, buildFromRupture(ruptureDetails, grossisteId),
                    rupture.getReference(), refCdeClient(rupture.getReference(), "R" + rupture.getId()));
            journalEnvoi("renvoi de rupture", rupture.getReference(), grossiste);
            CsrpEnveloppeResponse enveloppeResponse = processommandeXml(payLoad, rupture.getReference(), grossiste);
            if (Objects.isNull(enveloppeResponse)) {
                return noterEchec(grossiste, SOURCE_RUPTURE, ruptureId, ERREUR, REPONSE_ILLISIBLE);
            }
            if (getLigneNReponses(enveloppeResponse).isEmpty() && !ruptureDetails.isEmpty()) {
                return noterEchec(grossiste, SOURCE_RUPTURE, ruptureId, ERREUR, SANS_LIGNE);
            }
            JSONObject traite = traiterCommandeRepondue(rupture, ruptureDetails, grossiste, enveloppeResponse);
            enregistrerTraite(grossiste, SOURCE_RUPTURE, ruptureId, payLoad, traite);
            return traite;
        } catch (EnAttente ex) {
            TGrossiste g = em.find(TGrossiste.class, grossisteId);
            enregistrerAttente(g, SOURCE_RUPTURE, ruptureId, ex);
            return reponseEnAttente(g);
        } catch (RefusGrossiste ex) {
            TGrossiste g = em.find(TGrossiste.class, grossisteId);
            LOG.log(Level.WARNING, "PharmaML : {0} a refuse la commande ({1})",
                    new Object[] { g.getStrLIBELLE(), ex.version });
            return noterEchec(g, SOURCE_RUPTURE, ruptureId, REFUSEE, messageRefus(g, ex));
        } catch (RefusHttp ex) {
            TGrossiste g = em.find(TGrossiste.class, grossisteId);
            LOG.log(Level.WARNING, "PharmaML : {0} a repondu {1}", new Object[] { g.getStrLIBELLE(), ex.getMessage() });
            return noterEchec(g, SOURCE_RUPTURE, ruptureId, REFUSEE, messageRefus(g, ex));
        } catch (Exception ex) {
            if (erreurReseau(ex)) {
                TGrossiste g = em.find(TGrossiste.class, grossisteId);
                LOG.log(Level.WARNING, "PharmaML : {0} injoignable ({1})",
                        new Object[] { g.getStrLIBELLE(), ex.getClass().getSimpleName() });
                return noterEchec(g, SOURCE_RUPTURE, ruptureId, NON_ENVOYEE, messageReseau(g, ex));
            }
            LOG.log(Level.SEVERE, null, ex);
            return new JSONObject().put("success", false).put("msg", "Une erreur c'est produite");
        }

    }

    /** Calcul de l'en-tete Content-PharmaML (parametre KEY_PHARMAML_CONTROLE, CSRP par defaut). */
    /** Reglage du grossiste (fiche) ; a defaut, parametre global KEY_PHARMAML_CONTROLE ; a defaut, CSRP. */
    String modeControle(TGrossiste g) {
        try {
            List<?> r = em.createNativeQuery("SELECT COALESCE(NULLIF(g.str_PHARMAML_CONTROLE, ''), (SELECT p.str_VALUE"
                    + " FROM t_parameters p WHERE p.str_KEY = 'KEY_PHARMAML_CONTROLE')) FROM t_grossiste g"
                    + " WHERE g.lg_GROSSISTE_ID = ?1").setParameter(1, g.getLgGROSSISTEID()).getResultList();
            return r.isEmpty() ? null : (String) r.get(0);
        } catch (Exception e) {
            return null;
        }
    }

    /** Adresse principale puis, si elle est renseignee, l'adresse de secours du grossiste. */
    private List<String> adresses(TGrossiste grossiste) {
        return EnvoiPharmaMl.adresses(grossiste.getStrURLPHARMAML(), urlSecours(grossiste.getLgGROSSISTEID()));
    }

    String urlSecours(String grossisteId) {
        try {
            List<?> r = em
                    .createNativeQuery("SELECT str_URL_PHARMAML_SECOURS FROM t_grossiste WHERE lg_GROSSISTE_ID = ?1")
                    .setParameter(1, grossisteId).getResultList();
            return r.isEmpty() ? null : (String) r.get(0);
        } catch (Exception e) {
            return null; /* colonne absente (migration non passee) : pas de secours */
        }
    }

    /* ================================================================== reponses differees (vidage) */

    static final String SOURCE_COMMANDE = "COMMANDE", SOURCE_RUPTURE = "RUPTURE", SOURCE_SUIVI = "SUIVI";
    /* retours du 08/10 (13) : demande de retour et reclamation (str_SOURCE sur 10 caracteres) */
    static final String SOURCE_RETOUR = "RETOUR", SOURCE_RECLAM = "RECLAM";
    static final String EN_ATTENTE = "EN_ATTENTE", TRAITEE = "TRAITEE", ERREUR = "ERREUR", ORPHELINE = "ORPHELINE";
    /** Retours du 08/10 (statut d'envoi sur la liste des commandes) : refus du grossiste, envoi impossible. */
    static final String REFUSEE = "REFUSEE", NON_ENVOYEE = "NON_ENVOYEE";
    /** Specification v4.8 § 4.1.3 : 30 secondes au moins entre deux demandes de vidage. */
    static final long DELAI_ENTRE_VIDAGES_MS = 30_000L;
    private static final java.util.concurrent.ConcurrentHashMap<String, Long> DERNIER_VIDAGE = new java.util.concurrent.ConcurrentHashMap<>();
    private static final java.util.concurrent.atomic.AtomicInteger COMPTEUR = new java.util.concurrent.atomic.AtomicInteger();

    /** Le grossiste a recu l'envoi (FIN_SERVICE) mais repondra plus tard. */
    static final class EnAttente extends RuntimeException {
        private static final long serialVersionUID = 1L;
        final String refMessage, refCde, version;

        EnAttente(String refMessage, String refCde, String version) {
            super("FIN_SERVICE");
            this.refMessage = refMessage;
            this.refCde = refCde;
            this.version = version;
        }
    }

    private void enregistrerAttente(TGrossiste g, String source, String sourceId, EnAttente ex) {
        em.createNativeQuery("INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, lg_SOURCE_ID,"
                + " str_REF_MESSAGE, str_REF_CDE, str_VERSION, str_STATUT, dt_ENVOI) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NOW())")
                .setParameter(1, java.util.UUID.randomUUID().toString()).setParameter(2, g.getLgGROSSISTEID())
                .setParameter(3, source).setParameter(4, sourceId).setParameter(5, ex.refMessage)
                .setParameter(6, ex.refCde).setParameter(7, ex.version).setParameter(8, EN_ATTENTE).executeUpdate();
        LOG.log(Level.INFO, "PharmaML : {0} a recu l''envoi {1} (FIN_SERVICE), reponse differee",
                new Object[] { g.getStrLIBELLE(), ex.refMessage });
        ArchivePharmaMl.journal("COMMANDE", g.getStrLIBELLE(), "EN_ATTENTE",
                source + " " + sourceId + " | message " + ex.refMessage + " | commande "
                        + StringUtils.defaultString(ex.refCde)
                        + " | recue par le grossiste (FIN_SERVICE), reponse a recuperer par vidage");
    }

    /**
     * Reponse immediate traitee : l'envoi est note, pour reconnaitre une copie de cette reponse au depot, et pour le
     * statut d'envoi de la liste des commandes (resume : produits livres / en rupture).
     */
    private void enregistrerTraite(TGrossiste g, String source, String sourceId, CsrpEnveloppe payLoad,
            JSONObject traite) {
        JSONObject resume = new JSONObject().put("reponse", "immédiate");
        for (String k : new String[] { "nbreproduit", "nbrerupture", "totalProduit" }) {
            if (traite != null && traite.has(k)) {
                resume.put(k, traite.opt(k));
            }
        }
        String refCde = null;
        try {
            refCde = payLoad.getCorps().getMessageOfficine().getCorps().getCommande().getRefCdeClient();
        } catch (RuntimeException e) {
            /* pas de reference de commande lisible : rattachement par REF_MESSAGE seulement */
        }
        em.createNativeQuery("INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, lg_SOURCE_ID,"
                + " str_REF_MESSAGE, str_REF_CDE, str_VERSION, str_STATUT, str_DETAIL, dt_ENVOI, dt_REPONSE)"
                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NOW(), NOW())")
                .setParameter(1, java.util.UUID.randomUUID().toString()).setParameter(2, g.getLgGROSSISTEID())
                .setParameter(3, source).setParameter(4, sourceId).setParameter(5, payLoad.getEntete().getRefMessage())
                .setParameter(6, refCde).setParameter(7, versionCommande(g)).setParameter(8, TRAITEE)
                .setParameter(9, resume.toString()).executeUpdate();
        ArchivePharmaMl.journal("COMMANDE", g.getStrLIBELLE(), "TRAITEE",
                source + " " + sourceId + " | message " + payLoad.getEntete().getRefMessage() + " | "
                        + (traite == null ? "" : traite.optInt("nbreproduit") + " pris en compte, "
                                + traite.optInt("nbrerupture") + " en rupture sur " + traite.optInt("totalProduit")));
    }

    /** Envoi refuse ou impossible : note pour la liste des commandes, puis le message habituel. */
    private JSONObject noterEchec(TGrossiste g, String source, String sourceId, String statut, String msg) {
        ArchivePharmaMl.journal("COMMANDE", g.getStrLIBELLE(), statut, source + " " + sourceId + " | " + msg);
        try {
            em.createNativeQuery("INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, lg_SOURCE_ID,"
                    + " str_VERSION, str_STATUT, str_DETAIL, dt_ENVOI) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NOW())")
                    .setParameter(1, java.util.UUID.randomUUID().toString()).setParameter(2, g.getLgGROSSISTEID())
                    .setParameter(3, source).setParameter(4, sourceId).setParameter(5, versionCommande(g))
                    .setParameter(6, statut).setParameter(7, StringUtils.left(msg, 500)).executeUpdate();
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "PharmaML : statut d''envoi non note ({0})", e.getMessage());
        }
        return new JSONObject().put("success", false).put("msg", msg);
    }

    private static JSONObject reponseEnAttente(TGrossiste g) {
        String nom = StringUtils.trimToEmpty(g.getStrLIBELLE());
        return new JSONObject().put("success", true).put("enAttente", true).put("msg", nom
                + " a bien reçu la commande. Sa réponse (quantités livrées, ruptures) n'est pas immédiate : elle sera"
                + " récupérée automatiquement, ou par le bouton « Réponses PharmaML ». Ne renvoyez pas la commande.");
    }

    /** Un envoi deja recu par le grossiste et sans reponse : on ne renvoie pas (doublon chez le grossiste). */
    @SuppressWarnings("unchecked")
    private JSONObject attenteEnCours(String sourceId, TGrossiste g) {
        List<Object> r = em.createNativeQuery("SELECT DATE_FORMAT(dt_ENVOI, '%d/%m/%Y %H:%i') FROM t_pharmaml_attente"
                + " WHERE lg_SOURCE_ID = ?1 AND lg_GROSSISTE_ID = ?2 AND str_STATUT = ?3 ORDER BY dt_ENVOI DESC")
                .setParameter(1, sourceId).setParameter(2, g.getLgGROSSISTEID()).setParameter(3, EN_ATTENTE)
                .getResultList();
        if (r.isEmpty()) {
            return null;
        }
        return new JSONObject().put("success", false).put("enAttente", true).put("msg",
                "Cette commande a déjà été reçue par " + StringUtils.trimToEmpty(g.getStrLIBELLE()) + " le " + r.get(0)
                        + " et attend sa réponse : la renvoyer"
                        + " créerait un doublon. Utilisez « Réponses PharmaML » pour récupérer la réponse.");
    }

    /**
     * Retours du 08/10 (8) : commande deja envoyee ET repondue par le grossiste : la renvoyer la commanderait une
     * seconde fois (bouton de l'ecran de la commande). Les produits manquants partent par la liste des ruptures.
     */
    @SuppressWarnings("unchecked")
    private JSONObject dejaRepondue(String commandeId, TGrossiste g) {
        List<Object> r = em.createNativeQuery("SELECT DATE_FORMAT(COALESCE(dt_REPONSE, dt_ENVOI), '%d/%m/%Y %H:%i')"
                + " FROM t_pharmaml_attente WHERE lg_SOURCE_ID = ?1 AND str_SOURCE = ?2 AND str_STATUT IN (?3, ?4)"
                + " ORDER BY dt_ENVOI DESC").setParameter(1, commandeId).setParameter(2, SOURCE_COMMANDE)
                .setParameter(3, TRAITEE).setParameter(4, RATTACHEE).getResultList();
        if (r.isEmpty()) {
            return null;
        }
        return new JSONObject().put("success", false).put("dejaRepondue", true).put("msg",
                "Cette commande a déjà été envoyée et " + StringUtils.trimToEmpty(g.getStrLIBELLE())
                        + " y a répondu le " + r.get(0)
                        + " : la renvoyer la commanderait une seconde fois. Les produits non livrés sont"
                        + " dans la liste des ruptures, d'où ils peuvent être renvoyés.");
    }

    private PharmaMlMessages.Partenaires partenaires(TGrossiste g) {
        PharmaMlMessages.Partenaires p = new PharmaMlMessages.Partenaires();
        p.codeOfficine = StringUtils.defaultIfBlank(g.getStrOFFICINEID(), PharmaMlUtils.CODE_VALUE);
        p.idOfficine = StringUtils.defaultString(g.getStrIDRECEPTEURPHARMA());
        TOfficine of = getOfficine();
        p.nomOfficine = of == null ? "" : StringUtils.defaultString(of.getStrNOMCOMPLET());
        p.codeRepartiteur = StringUtils.defaultString(g.getStrCODERECEPTEURPHARMA());
        p.idRepartiteur = StringUtils.defaultString(g.getIdRepartiteur());
        p.nomRepartiteur = StringUtils.defaultString(g.getStrLIBELLE());
        p.date = getDate();
        return p;
    }

    /** REF_MESSAGE unique, 20 caracteres au plus (schema). */
    private static String refMessage() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmmss"))
                + String.format("%03d", COMPTEUR.incrementAndGet() % 1000);
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    @SuppressWarnings("unchecked")
    public JSONObject recupererReponses(String grossisteId, boolean auto) {
        /*
         * grossistes ayant un envoi en attente (ou celui demande) : jamais les autres, pour ne pas relire chez eux
         * d'anciennes reponses non acquittees
         */
        List<Object> ids = StringUtils.isNotBlank(grossisteId)
                ? List.of(grossisteId) : em
                        .createNativeQuery(
                                "SELECT DISTINCT lg_GROSSISTE_ID FROM t_pharmaml_attente WHERE str_STATUT = ?1"
                                        + " AND dt_ENVOI > NOW() - INTERVAL 15 DAY")
                        .setParameter(1, EN_ATTENTE).getResultList();
        if (!auto && StringUtils.isBlank(grossisteId)) {
            /* retours du 08/10 (11) : a la demande, aussi les grossistes actifs (BLV et alertes deposes) */
            ids = new ArrayList<>(ids);
            for (Object id : (List<Object>) em
                    .createNativeQuery("SELECT DISTINCT a.lg_GROSSISTE_ID FROM t_pharmaml_attente a"
                            + " JOIN t_grossiste g ON g.lg_GROSSISTE_ID = a.lg_GROSSISTE_ID WHERE a.dt_ENVOI > NOW() - INTERVAL 30 DAY"
                            + " AND IFNULL(g.str_URL_PHARMAML, '') <> '' AND g.str_STATUT = 'enable'")
                    .getResultList()) {
                if (!ids.contains(id)) {
                    ids.add(id);
                }
            }
        }
        JSONArray parGrossiste = new JSONArray();
        int traitees = 0, reprises = 0;
        PharmaMlService moi = contexte.getBusinessObject(PharmaMlService.class);
        for (Object orpheline : (List<Object>) em
                .createNativeQuery("SELECT lg_ID FROM t_pharmaml_attente"
                        + " WHERE str_STATUT = ?1 AND dt_REPONSE > NOW() - INTERVAL 15 DAY ORDER BY dt_REPONSE")
                .setParameter(1, ORPHELINE).getResultList()) {
            if (TRAITEE.equals(moi.reprendreOrpheline((String) orpheline).optString("statut"))) {
                traitees++;
                reprises++;
            }
        }
        for (Object id : ids) {
            JSONObject r = vidage(em.find(TGrossiste.class, (String) id));
            traitees += r.optInt("traitees");
            parGrossiste.put(r);
        }
        if (!auto || traitees > 0) {
            LOG.log(Level.INFO, "PharmaML : vidage de {0} grossiste(s), {1} reponse(s) traitee(s)",
                    new Object[] { ids.size(), traitees });
        }
        return new JSONObject().put("success", true).put("grossistes", parGrossiste).put("traitees", traitees)
                .put("reprises", reprises).put("enAttente", attentes().getJSONArray("data").length());
    }

    /**
     * Retours du 08/10 (11) : vidage des grossistes PharmaML actifs (un envoi dans les 30 derniers jours), meme sans
     * envoi en attente, pour recevoir les bons de livraison valorises et les alertes.
     */
    @Override
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    @SuppressWarnings("unchecked")
    public JSONObject recupererMessages() {
        List<Object> ids = em.createNativeQuery("SELECT DISTINCT a.lg_GROSSISTE_ID FROM t_pharmaml_attente a"
                + " JOIN t_grossiste g ON g.lg_GROSSISTE_ID = a.lg_GROSSISTE_ID WHERE a.dt_ENVOI > NOW() - INTERVAL 30 DAY"
                + " AND IFNULL(g.str_URL_PHARMAML, '') <> '' AND g.str_STATUT = 'enable'").getResultList();
        int traitees = 0;
        JSONArray parGrossiste = new JSONArray();
        for (Object id : ids) {
            JSONObject r = vidage(em.find(TGrossiste.class, (String) id));
            traitees += r.optInt("traitees");
            parGrossiste.put(r);
        }
        return new JSONObject().put("success", true).put("grossistes", parGrossiste).put("traitees", traitees);
    }

    private JSONObject vidage(TGrossiste g) {
        JSONObject out = new JSONObject().put("grossiste", g == null ? "" : g.getStrLIBELLE()).put("traitees", 0)
                .put("messages", new JSONArray());
        if (g == null || StringUtils.isBlank(g.getStrURLPHARMAML())) {
            return out.put("msg", "pas d'adresse PharmaML");
        }
        long maintenant = System.currentTimeMillis();
        Long dernier = DERNIER_VIDAGE.get(g.getLgGROSSISTEID());
        if (dernier != null && maintenant - dernier < DELAI_ENTRE_VIDAGES_MS) {
            return out.put("msg",
                    "Dernière interrogation il y a moins de 30 secondes (règle PharmaML) : réessayez dans "
                            + ((DELAI_ENTRE_VIDAGES_MS - (maintenant - dernier)) / 1000 + 1) + " s.");
        }
        DERNIER_VIDAGE.put(g.getLgGROSSISTEID(), maintenant);
        String version = versionCommande(g);
        PharmaMlMessages.Partenaires p = partenaires(g);
        String nomFichier = StringUtils.replace(g.getStrLIBELLE(), StringUtils.SPACE, StringUtils.EMPTY);
        String ref = refMessage();
        String xml = PharmaMlMessages.action(version, p, ref, "REQ_RECEPTION", null, "VIDAGE");
        PharmaMlService moi = contexte.getBusinessObject(PharmaMlService.class);
        int traitees = 0;
        try {
            ArchivePharmaMl.journal("VIDAGE", g.getStrLIBELLE(), "DEBUT",
                    "version " + version + " | adresse " + ArchivePharmaMl.adresseSure(g.getStrURLPHARMAML()));
            for (int i = 0; i < 50; i++) {
                String archiveV = ecrireArchive("V_" + ref + "_" + nomFichier, xml);
                ArchivePharmaMl.journal("VIDAGE", g.getStrLIBELLE(), i == 0 ? "DEMANDE" : "ACQUITTEMENT + DEMANDE",
                        "message " + ref + " | archive " + StringUtils.defaultString(archiveV, "(non archivee)"));
                HttpResponse<String> rep = EnvoiPharmaMl.envoyer(adresses(g), xml, g.getStrIDRECEPTEURPHARMA(),
                        g.getStrCLERECEPTEUR(), modeControle(g), DELAI_CONNEXION, DELAI_REPONSE).reponse;
                String corps = rep.body();
                String archiveRV = ecrireArchive("RV_" + ref + "_" + nomFichier, PharmaMlMessages.indenter(corps));
                ArchivePharmaMl.journal("VIDAGE", g.getStrLIBELLE(), "REPONSE RECUE", "HTTP " + rep.statusCode()
                        + " | archive " + StringUtils.defaultString(archiveRV, "(non archivee)"));
                if (rep.statusCode() != 200) {
                    ArchivePharmaMl.journal("VIDAGE", g.getStrLIBELLE(), "REFUS HTTP", "HTTP " + rep.statusCode());
                    return out.put("traitees", traitees).put("msg", "HTTP " + rep.statusCode());
                }
                PharmaMlMessages.Enveloppe env = PharmaMlMessages.lireEnveloppe(corps);
                if ("FIN_SERVICE".equals(env.action) && !env.repCommande) {
                    ArchivePharmaMl.journal("VIDAGE", g.getStrLIBELLE(), "FIN",
                            i == 0 ? "aucune reponse en attente au depot" : traitees + " reponse(s) traitee(s)");
                    return out.put("traitees", traitees).put("msg", i == 0 ? "aucune réponse en attente" : "fin");
                }
                if (StringUtils.isBlank(env.refMessage)) {
                    ArchivePharmaMl.journal("VIDAGE", g.getStrLIBELLE(), "ILLISIBLE", "reponse sans REF_MESSAGE");
                    return out.put("traitees", traitees).put("msg", "réponse illisible");
                }
                if (env.erreur && !env.repCommande && StringUtils.isBlank(env.enReponseA)) {
                    /* refus de la demande de vidage elle-meme (controle, identifiants) : rien a acquitter */
                    ArchivePharmaMl.journal("VIDAGE", g.getStrLIBELLE(), "REFUS",
                            StringUtils.defaultString(PharmaMlMessages.erreurReponse(corps)));
                    return out.put("traitees", traitees).put("msg",
                            "refus : " + StringUtils.defaultString(PharmaMlMessages.erreurReponse(corps)));
                }
                JSONObject r = moi.appliquerReponseDifferee(g.getLgGROSSISTEID(), corps,
                        "RV_" + ref + "_" + nomFichier);
                out.getJSONArray("messages").put(r);
                ArchivePharmaMl.journal("VIDAGE", g.getStrLIBELLE(), "MESSAGE " + r.optString("statut"),
                        "message du grossiste " + env.refMessage + " | en reponse a "
                                + StringUtils.defaultString(env.enReponseA) + (r.has("resultat")
                                        ? " | " + StringUtils.left(String.valueOf(r.opt("resultat")), 300) : ""));
                if (TRAITEE.equals(r.optString("statut"))) {
                    traitees++;
                }
                /* acquittement : le grossiste retire le message de son depot et envoie le suivant (ou FIN_SERVICE) */
                ref = refMessage();
                xml = PharmaMlMessages.action(version, p, ref, "REQ_RECEPTION", env.refMessage, "ACQUITTEMENT");
            }
            return out.put("traitees", traitees).put("msg", "arrêt après 50 messages");
        } catch (Exception e) {
            LOG.log(Level.WARNING, "PharmaML : vidage {0} ({1})",
                    new Object[] { g.getStrLIBELLE(), e.getClass().getSimpleName() });
            ArchivePharmaMl.journal("VIDAGE", g.getStrLIBELLE(), erreurReseau(e) ? "INJOIGNABLE" : "ERREUR",
                    e.getClass().getSimpleName() + " | " + traitees + " reponse(s) traitee(s) avant l'erreur");
            return out.put("traitees", traitees).put("msg",
                    erreurReseau(e) ? messageReseau(g, e) : "erreur : " + e.getClass().getSimpleName());
        }
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    @SuppressWarnings("unchecked")
    public JSONObject appliquerReponseDifferee(String grossisteId, String xml, String archive) {
        return appliquer(grossisteId, xml, archive, true);
    }

    /**
     * Retours du 08/10 : reponses archivees « non rattachees » (ex. DPCI, rattachement impossible avant la lecture de
     * Ref_Cde_Client) reprises depuis leur archive. Rattachee : appliquee comme a la reception, la ligne passe
     * RATTACHEE ; toujours inconnue : laissee telle quelle.
     */
    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    @SuppressWarnings("unchecked")
    public JSONObject reprendreOrpheline(String idOrpheline) {
        List<Object[]> l = em
                .createNativeQuery("SELECT lg_GROSSISTE_ID, str_DETAIL FROM t_pharmaml_attente"
                        + " WHERE lg_ID = ?1 AND str_STATUT = ?2")
                .setParameter(1, idOrpheline).setParameter(2, ORPHELINE).getResultList();
        if (l.isEmpty()) {
            return new JSONObject().put("statut", "ABSENTE");
        }
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("archivée : ([A-Za-z0-9_.-]+)\\.xml")
                .matcher(StringUtils.defaultString((String) l.get(0)[1]));
        if (!m.find()) {
            return new JSONObject().put("statut", "SANS_ARCHIVE");
        }
        String archive = m.group(1);
        /* rangee (vidages/AAAA-MM) ou ancienne (racine) */
        Path fichier = ArchivePharmaMl.trouver(archive);
        if (fichier == null) {
            return new JSONObject().put("statut", "SANS_ARCHIVE");
        }
        String xml;
        try {
            xml = new String(Files.readAllBytes(fichier), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return new JSONObject().put("statut", "SANS_ARCHIVE");
        }
        JSONObject r = appliquer((String) l.get(0)[0], xml, archive, false);
        if (!ORPHELINE.equals(r.optString("statut"))) {
            em.createNativeQuery("UPDATE t_pharmaml_attente SET str_STATUT = ?1, str_DETAIL = ?2 WHERE lg_ID = ?3")
                    .setParameter(1, RATTACHEE)
                    .setParameter(2, StringUtils.left("Reprise de " + archive + ".xml : " + r.optString("statut"), 500))
                    .setParameter(3, idOrpheline).executeUpdate();
            LOG.log(Level.INFO, "PharmaML : reponse archivee {0} rattachee ({1})",
                    new Object[] { archive, r.optString("statut") });
        }
        return r;
    }

    static final String RATTACHEE = "RATTACHEE";

    @SuppressWarnings("unchecked")
    private JSONObject appliquer(String grossisteId, String xml, String archive, boolean noterOrpheline) {
        TGrossiste g = em.find(TGrossiste.class, grossisteId);
        PharmaMlMessages.Enveloppe env = PharmaMlMessages.lireEnveloppe(xml);
        if (xml != null && xml.contains("BON_RETOUR") && !env.repCommande) {
            /* retours du 08/10 (13) : bon de retour (reponse a une demande de retour), souvent differe */
            return appliquerBonRetourDiffere(g, env, xml, archive, noterOrpheline);
        }
        if (BlvPharmaMl.estBlv(xml) && !env.repCommande) {
            /* retours du 08/10 (11) : bon de livraison valorise depose au depot */
            JSONObject b = BlvPharmaMl.enregistrerBlv(em, grossisteId, env.refMessage, xml, archive);
            ArchivePharmaMl.journal("BLV", g == null ? "" : g.getStrLIBELLE(), b.optString("statut"),
                    "message " + env.refMessage + " | " + String.valueOf(b.opt("resultat")) + " | archive " + archive);
            return b;
        }
        if (BlvPharmaMl.estAlerte(xml) && !env.repCommande) {
            JSONObject a = BlvPharmaMl.enregistrerAlerte(em, grossisteId, env.refMessage, xml, archive);
            ArchivePharmaMl.journal("ALERTE", g == null ? "" : g.getStrLIBELLE(), a.optString("statut"),
                    "message " + env.refMessage + " | " + String.valueOf(a.opt("resultat")) + " | archive " + archive);
            return a;
        }
        if (xml != null && xml.contains("SUIVI_COMMANDE")) {
            /* retours du 08/10 (10) : suivi de commande (avancement) depose au depot */
            return appliquerSuiviDiffere(g, env, xml, archive, noterOrpheline);
        }
        JSONObject r = new JSONObject().put("refMessage", env.refMessage).put("enReponseA", env.enReponseA);
        List<Object[]> a = em
                .createNativeQuery("SELECT lg_ID, str_SOURCE, lg_SOURCE_ID, str_VERSION FROM t_pharmaml_attente"
                        + " WHERE lg_GROSSISTE_ID = ?1 AND str_STATUT = ?2 AND str_REF_MESSAGE = ?3")
                .setParameter(1, grossisteId).setParameter(2, EN_ATTENTE).setParameter(3, env.enReponseA)
                .getResultList();
        Object[] attente = a.isEmpty() ? null : a.get(0);
        if (attente == null && StringUtils.isNotBlank(env.refCdeClient)) {
            /*
             * Retours du 08/10 : DPCI met dans EN_REPONSE_A la reference de la DEMANDE DE VIDAGE, pas celle de la
             * commande. Rattachement par Ref_Cde_Client (stable depuis le 08/10) : envoi en attente de ce grossiste ;
             * si cet envoi a deja recu sa reponse (copie d'une reponse immediate), elle n'est pas reappliquee.
             */
            List<Object[]> parRef = em
                    .createNativeQuery("SELECT lg_ID, str_SOURCE, lg_SOURCE_ID, str_VERSION, str_STATUT"
                            + " FROM t_pharmaml_attente WHERE lg_GROSSISTE_ID = ?1 AND str_REF_CDE = ?2"
                            + " AND str_STATUT IN (?3, ?4) ORDER BY (str_STATUT = ?3) DESC, dt_ENVOI DESC")
                    .setParameter(1, grossisteId).setParameter(2, env.refCdeClient).setParameter(3, EN_ATTENTE)
                    .setParameter(4, TRAITEE).getResultList();
            if (!parRef.isEmpty() && TRAITEE.equals(parRef.get(0)[4])) {
                return r.put("statut", "DEJA_TRAITEE");
            }
            attente = parRef.isEmpty() ? null : parRef.get(0);
        }
        String erreur = PharmaMlMessages.erreurReponse(xml);
        if (attente == null && StringUtils.isNotBlank(env.enReponseA)) {
            Number deja = (Number) em
                    .createNativeQuery("SELECT COUNT(*) FROM t_pharmaml_attente WHERE lg_GROSSISTE_ID = ?1"
                            + " AND str_REF_MESSAGE = ?2 AND str_STATUT IN (?3, ?4)")
                    .setParameter(1, grossisteId).setParameter(2, env.enReponseA).setParameter(3, TRAITEE)
                    .setParameter(4, ERREUR).getSingleResult();
            if (deja.intValue() > 0) {
                /*
                 * copie d'une reponse deja traitee (ex. reponse immediate non acquittee) : acquittee, jamais
                 * reappliquee
                 */
                return r.put("statut", "DEJA_TRAITEE");
            }
        }
        if (attente == null && !noterOrpheline) {
            return r.put("statut", ORPHELINE);
        }
        if (attente == null) {
            /* reponse a un envoi inconnu : archivee, acquittee, signalee (rattachement manuel) */
            em.createNativeQuery("INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, str_REF_MESSAGE,"
                    + " str_STATUT, str_DETAIL, dt_ENVOI, dt_REPONSE) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NOW(), NOW())")
                    .setParameter(1, java.util.UUID.randomUUID().toString()).setParameter(2, grossisteId)
                    .setParameter(3, env.repCommande ? SOURCE_COMMANDE : "MESSAGE").setParameter(4, env.enReponseA)
                    .setParameter(5, ORPHELINE).setParameter(6, StringUtils.left("Réponse non rattachée, archivée : "
                            + archive + ".xml" + (erreur == null ? "" : " — " + erreur), 500))
                    .executeUpdate();
            return r.put("statut", ORPHELINE);
        }
        String idAttente = (String) attente[0], source = (String) attente[1], sourceId = (String) attente[2];
        JSONObject resultat;
        String statut;
        if (SOURCE_RECLAM.equals(source)) {
            /* reponse a une reclamation : prise en compte (ou refus) ; le detail reste dans l'archive */
            statut = erreur != null ? ERREUR : TRAITEE;
            String libre = PharmaMlMessages.commentaireLibre(xml);
            resultat = new JSONObject().put("msg", erreur != null ? "réclamation refusée : " + erreur
                    : "réponse à la réclamation" + (libre.isEmpty() ? " : prise en compte" : " : « " + libre + " »"));
            RetourPharmaMl.statut(em, sourceId, erreur != null ? RetourPharmaMl.ERREUR : RetourPharmaMl.ENVOYE,
                    resultat.optString("msg"), null, null, false);
        } else if (erreur != null || !env.repCommande) {
            statut = ERREUR;
            resultat = new JSONObject().put("msg", erreur == null ? "message sans réponse de commande" : erreur);
        } else {
            CsrpEnveloppeResponse reponse = lireReponseCommande(xml, (String) attente[3]);
            if (reponse == null || getLigneNReponses(reponse).isEmpty()) {
                statut = ERREUR;
                resultat = new JSONObject().put("msg", SANS_LIGNE);
            } else if (SOURCE_RUPTURE.equals(source)) {
                Rupture rupture = em.find(Rupture.class, sourceId);
                resultat = traiterCommandeRepondue(rupture, orderService.ruptureDetaisDtoByRupture(sourceId), g,
                        reponse);
                statut = TRAITEE;
            } else {
                TOrder order = em.find(TOrder.class, sourceId);
                resultat = order == null ? new JSONObject().put("msg", "commande introuvable")
                        : traiterCommandeRepondue(order, reponse);
                statut = order == null ? ERREUR : TRAITEE;
                if (order != null) {
                    suggestionCommandee(order);
                }
            }
        }
        em.createNativeQuery("UPDATE t_pharmaml_attente SET str_STATUT = ?1, str_DETAIL = ?2, dt_REPONSE = NOW()"
                + " WHERE lg_ID = ?3").setParameter(1, statut)
                .setParameter(2, StringUtils.left(resultat.toString(), 500)).setParameter(3, idAttente).executeUpdate();
        return r.put("statut", statut).put("source", source).put("sourceId", sourceId).put("resultat", resultat);
    }

    /**
     * Retours du 08/10 : une suggestion envoyee par PharmaML ne passe « Commandee » qu'a la reponse du grossiste. Pour
     * une reponse differee (FIN_SERVICE puis vidage), c'est ici.
     */
    @SuppressWarnings("unchecked")
    private void suggestionCommandee(TOrder order) {
        List<Object> ids = em
                .createNativeQuery("SELECT lg_SUGGESTION_ORDER_ID FROM t_suggestion_order"
                        + " WHERE lg_ORDER_ID = ?1 AND str_STATUT <> ?2")
                .setParameter(1, order.getLgORDERID()).setParameter(2, rest.service.SuggestionService.STATUT_COMMANDEE)
                .getResultList();
        for (Object id : ids) {
            suggestionService.marquerCommandee((String) id, rest.service.SuggestionService.MODE_COMMANDE_PHARMAML,
                    order.getLgORDERID(), order.getLgUSERID());
        }
    }

    private CsrpEnveloppeResponse lireReponseCommande(String xml, String version) {
        try {
            String corps = PharmaMlMessages.V3.equals(version)
                    || xml.contains("SRP_ENVELOPPE") && !xml.contains("CSRP_ENVELOPPE")
                            ? PharmaMlMessages.reponseV3VersV1(xml) : xml;
            return (CsrpEnveloppeResponse) JAXBContext.newInstance(CsrpEnveloppeResponse.class).createUnmarshaller()
                    .unmarshal(new StringReader(corps));
        } catch (JAXBException ex) {
            LOG.log(Level.WARNING, "PharmaML : reponse differee illisible", ex);
            return null;
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject attentes() {
        JSONArray a = new JSONArray();
        for (Object[] l : (List<Object[]>) em
                .createNativeQuery("SELECT a.lg_SOURCE_ID, a.str_SOURCE, g.str_LIBELLE,"
                        + " DATE_FORMAT(a.dt_ENVOI, '%d/%m/%Y %H:%i'), IFNULL(o.str_REF_ORDER, ''), a.str_STATUT"
                        + " FROM t_pharmaml_attente a JOIN t_grossiste g ON g.lg_GROSSISTE_ID = a.lg_GROSSISTE_ID"
                        + " LEFT JOIN t_order o ON o.lg_ORDER_ID = a.lg_SOURCE_ID WHERE a.str_STATUT IN (?1, ?2)"
                        + " ORDER BY a.dt_ENVOI")
                .setParameter(1, EN_ATTENTE).setParameter(2, ORPHELINE).getResultList()) {
            a.put(new JSONObject().put("sourceId", l[0]).put("source", l[1]).put("grossiste", l[2]).put("envoi", l[3])
                    .put("reference", l[4]).put("statut", l[5]));
        }
        return new JSONObject().put("success", true).put("data", a);
    }

    static final String SANS_LIGNE = "Le grossiste a répondu sans aucune ligne de commande : rien n'a été pris en"
            + " compte. Le message envoyé et la réponse sont archivés dans le dossier PharmaML.";

    static final String REPONSE_ILLISIBLE = "Le grossiste n'a pas renvoyé de réponse exploitable. Le message envoyé et la"
            + " réponse sont archivés dans le dossier PharmaML.";

    /**
     * Une ligne par envoi : version REELLEMENT envoyee (l'objet interne reste au format 1.0.0.0 et n'est converti qu'a
     * l'envoi en 3.0.0.0 : l'afficher faisait croire a un envoi en 1.0.0.0).
     */
    private void journalEnvoi(String quoi, String reference, TGrossiste grossiste) {
        LOG.log(Level.INFO, "PharmaML : envoi {0} {1} en version {2} a {3} ({4})", new Object[] { quoi, reference,
                versionCommande(grossiste), grossiste.getStrLIBELLE(), grossiste.getStrURLPHARMAML() });
        ArchivePharmaMl.journal("COMMANDE", grossiste.getStrLIBELLE(), "PREPARATION",
                quoi + " " + reference + " | version " + versionCommande(grossiste) + " | adresse "
                        + ArchivePharmaMl.adresseSure(grossiste.getStrURLPHARMAML()));
    }

    private CsrpEnveloppeResponse processommandeXml(CsrpEnveloppe payLoad, String reference, TGrossiste grossiste)
            throws JAXBException, IOException, InterruptedException {
        /*
         * Plan d'octobre 1.2, decision Q-B : la version de l'envoi de commande se regle par grossiste (3.0.0.0 par
         * defaut). Les MEMES lignes, quantites, references et date sont envoyees dans l'enveloppe de la version ; une
         * reponse 3.0.0.0 est ramenee au format 1.0.0.0 et suit exactement le traitement existant.
         */
        /* 1.0.0.0 et 3.0.0.0 : meme generateur, au format exact des echanges reels (plus de JAXB et de prefixe ns2) */
        return envoyerCommande(payLoad, reference, grossiste, versionCommande(grossiste));
    }

    private JSONObject processommandeXml(TOrder order) throws JAXBException, IOException, InterruptedException {

        TGrossiste grossiste = order.getLgGROSSISTEID();
        if (StringUtils.isEmpty(grossiste.getStrURLPHARMAML())) {
            return new JSONObject().put("success", false).put("msg", "Le grossise n'a url pharmaML");
        }
        TOfficine of = getOfficine();
        CsrpEnveloppe payLoad = buildPayload(grossiste, of, null, null, null);

        JAXBContext requestContext = JAXBContext.newInstance(CsrpEnveloppe.class);
        Marshaller marshaller = requestContext.createMarshaller();
        marshaller.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.TRUE);
        StringWriter sw = new StringWriter();
        marshaller.marshal(payLoad, sw); // save file // a supprimer a l'avenir
        String fileName = order.getStrREFORDER() + "_"
                + StringUtils.replace(grossiste.getStrLIBELLE(), StringUtils.SPACE, StringUtils.EMPTY);
        createSaveXmlFile(marshaller, payLoad, "C", fileName);

        HttpClient client = getHttpClient();
        HttpRequest httpRequest = HttpRequest.newBuilder().uri(URI.create(grossiste.getStrURLPHARMAML()))
                .timeout(DELAI_REPONSE).header("Content-Type", "text/xml; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(sw.toString())).build();

        HttpResponse<String> httpResponse = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        return null;

    }

    private JSONObject processommandeTestFromFileXml(TOrder order)
            throws JAXBException, IOException, InterruptedException {

        return processResponseTesting(order);

    }

    private JSONObject processResponseTesting(TOrder order) {
        return traiterCommandeRepondue(order, loadFromFileForTestingPurpose());
    }

    /** Le serveur du grossiste a repondu, mais avec un code HTTP d'erreur : la commande n'est pas acceptee. */
    static final class RefusHttp extends RuntimeException {
        private static final long serialVersionUID = 1L;
        final int code;
        final String archive;

        RefusHttp(int code, String archive) {
            super("HTTP " + code);
            this.code = code;
            this.archive = archive;
        }
    }

    /** Le grossiste a repondu par un message ERREUR : la commande n'est pas acceptee. */
    static final class RefusGrossiste extends RuntimeException {
        private static final long serialVersionUID = 1L;
        final String archive, version;

        RefusGrossiste(String erreur, String archive, String version) {
            super(erreur);
            this.archive = archive;
            this.version = version;
        }
    }

    static String messageRefus(TGrossiste grossiste, RefusGrossiste r) {
        String nom = StringUtils.trimToEmpty(grossiste.getStrLIBELLE());
        String conseil = PharmaMlMessages.V3.equals(r.version) && PharmaMlMessages.enveloppeV1Attendue(r.getMessage())
                ? " Ce grossiste n'accepte pas PharmaML 3.0.0.0 : dans sa fiche, réglez « PharmaML : commande » sur"
                        + " 1.0.0.0 puis renvoyez la commande."
                : PharmaMlMessages.erreurControle(r.getMessage()) ? (StringUtils.isBlank(grossiste.getStrCLERECEPTEUR())
                        ? " Ce grossiste exige le contrôle calculé avec la clé de l'officine : renseignez la clé"
                                + " fournie par le grossiste."
                        : " Le contrôle n'est pas reconnu : vérifiez dans la fiche grossiste la clé (4 caractères,"
                                + " majuscules et minuscules comptent), le code client de l'officine chez ce grossiste"
                                + " et son réglage « Contrôle PharmaML » (Spécification CSRP).")
                        : "";
        String code = PharmaMlMessages.codeErreur(r.getMessage());
        if (conseil.isEmpty()) {
            /* retours du 08/10 (8) : conseil selon le code d'erreur (tableau 8 de la specification) */
            conseil = CodeErreurPharmaMl.conseil(code);
        }
        return nom + " a refusé la commande : « " + r.getMessage() + " »."
                + (CodeErreurPharmaMl.doublon(code) ? " Le grossiste indique l'avoir déjà reçue."
                        : " La commande n'a pas été prise en compte.")
                + conseil + " Réponse archivée : " + r.archive + ".xml";
    }

    static String messageRefus(TGrossiste grossiste, RefusHttp r) {
        String explication = r.code == 404 ? " (adresse PharmaML incorrecte ?)"
                : r.code == 401 || r.code == 403 ? " (accès refusé : identifiants de l'officine chez le grossiste ?)"
                        : r.code >= 500 ? " (erreur du serveur du grossiste)" : "";
        return "Le serveur PharmaML de " + StringUtils.trimToEmpty(grossiste.getStrLIBELLE()) + " a répondu HTTP "
                + r.code + explication + " : la commande n'a pas été acceptée. Réponse archivée : " + r.archive
                + ".xml";
    }

    private List<LigneNReponse> getLigneNReponses(CsrpEnveloppeResponse response) {
        if (Objects.nonNull(response)) {
            CorpsResponse corps = response.getCorps();
            if (Objects.nonNull(corps)) {
                MessageRepartiteur messageRepartiteur = corps.getMessageRepartiteur();
                if (Objects.nonNull(messageRepartiteur)) {
                    CorpsRepartiteur corpsR = messageRepartiteur.getCorps();
                    if (Objects.nonNull(corpsR)) {
                        RepCommande repCommande = corpsR.getRepCommande();
                        if (Objects.nonNull(repCommande)) {
                            NormaleReponse normale = repCommande.getNormale();
                            if (Objects.nonNull(normale)) {
                                return normale.getLignes();
                            }
                        }
                    }
                }
            }
        }
        return List.of();
    }

    private TFamilleGrossiste findTFamilleGrossisteByCodeCipOrEanOrProduitCode(String code, String grossisteId,
            String idProduit) {
        try {
            TypedQuery<TFamilleGrossiste> q = em.createQuery(
                    "SELECT o FROM TFamilleGrossiste o WHERE   (o.lgFAMILLEID.intCIP =?1 OR o.lgFAMILLEID.intEAN13=?1 OR o.strCODEARTICLE=?1) AND o.lgGROSSISTEID.lgGROSSISTEID=?2 AND o.lgFAMILLEID.lgFAMILLEID=?3",
                    TFamilleGrossiste.class);
            q.setParameter(1, code);
            q.setParameter(2, grossisteId);
            q.setParameter(3, idProduit);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "findTFamilleGrossisteByCodeCipOrEanOrProduitCode", e);
            return null;
        }
    }

    private TFamilleGrossiste findTFamilleGrossisteByCodeCipOrEanOrProduitCode(String code, String grossisteId) {
        try {
            TypedQuery<TFamilleGrossiste> q = em.createQuery(
                    "SELECT o FROM TFamilleGrossiste o WHERE   (o.lgFAMILLEID.intCIP =?1 OR o.lgFAMILLEID.intEAN13=?1 OR o.strCODEARTICLE=?1) AND o.lgGROSSISTEID.lgGROSSISTEID=?2 ",
                    TFamilleGrossiste.class);
            q.setParameter(1, code);
            q.setParameter(2, grossisteId);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "findTFamilleGrossisteByCodeCipOrEanOrProduitCode", e);
            return null;
        }
    }

    private TFamille findTFamilleByCodeCipOrEan(String code) {
        try {
            TypedQuery<TFamille> q = em.createQuery("SELECT o FROM TFamille o WHERE   (o.intCIP =?1 OR o.intEAN13=?1 )",
                    TFamille.class);
            q.setParameter(1, code);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "findByCodeCipOrEan", e);
            return null;
        }
    }

    private Pair<Integer, Integer> getPrixAchatPrixUni(List<PrixN> prixs) {
        if (CollectionUtils.isEmpty(prixs)) {
            return Pair.of(null, null);
        }
        Integer prixAchat = NumberUtils.intFromString(prixs.stream()
                .filter(p -> p.getNature().equals(TypePrix.PHAHT.name())).findAny().map(PrixN::getValeur).orElse(""));
        Integer prixUnitt = NumberUtils.intFromString(prixs.stream()
                .filter(p -> p.getNature().equals(TypePrix.PUBTC.name())).findAny().map(PrixN::getValeur).orElse(""));
        return Pair.of(prixAchat, prixUnitt);
    }

    // ajout du produit de rempalcement a la commande
    private void addRemplacement__(LigneNReponse ligneNReponse, TOrderDetail origin, TFamille famille, TOrder order) {
        Pair<Integer, Integer> prixs = getPrixAchatPrixUni(ligneNReponse.getPrix());

        TOrderDetail item = new TOrderDetail(KeyUtilGen.getId());
        item.setLgORDERID(order);
        item.setIntNUMBER(origin.getIntNUMBER());
        item.setIntQTEREPGROSSISTE(item.getIntNUMBER());
        item.setIntQTEMANQUANT(item.getIntNUMBER());
        item.setLgFAMILLEID(famille);
        item.setLgGROSSISTEID(order.getLgGROSSISTEID());
        item.setStrSTATUT(Constant.STATUT_PASSED);
        item.setDtCREATED(new Date());
        item.setDtUPDATED(item.getDtCREATED());
        item.setIntPAFDETAIL(
                prixs.getLeft() != null ? prixs.getLeft() : (famille.getIntPAF() == null ? 0 : famille.getIntPAF()));
        item.setIntPRICEDETAIL(prixs.getRight() != null && prixs.getRight() > 0 ? prixs.getRight()
                : (famille.getIntPRICE() == null ? 0 : famille.getIntPRICE()));
        item.setIntPRICE(item.getIntPAFDETAIL() * origin.getIntNUMBER());
        em.persist(item);
        order.getTOrderDetailCollection().add(item);

    }

    private String addRemplacement(LigneNReponse ligneNReponse, int qtyOrigin, TFamille famille, TOrder order) {
        Pair<Integer, Integer> prixs = getPrixAchatPrixUni(ligneNReponse.getPrix());

        TOrderDetail item = new TOrderDetail(KeyUtilGen.getId());
        item.setLgORDERID(order);
        item.setIntNUMBER(qtyOrigin);
        item.setIntQTEREPGROSSISTE(item.getIntNUMBER());
        item.setIntQTEMANQUANT(item.getIntNUMBER());
        item.setLgFAMILLEID(famille);
        item.setLgGROSSISTEID(order.getLgGROSSISTEID());
        item.setStrSTATUT(Constant.STATUT_PASSED);
        item.setDtCREATED(new Date());
        item.setDtUPDATED(item.getDtCREATED());
        item.setIntPAFDETAIL(
                prixs.getLeft() != null ? prixs.getLeft() : (famille.getIntPAF() == null ? 0 : famille.getIntPAF()));
        item.setIntPRICEDETAIL(prixs.getRight() != null && prixs.getRight() > 0 ? prixs.getRight()
                : (famille.getIntPRICE() == null ? 0 : famille.getIntPRICE()));
        item.setIntPRICE(item.getIntPAFDETAIL() * qtyOrigin);
        em.persist(item);
        order.getTOrderDetailCollection().add(item);
        return item.getLgORDERDETAILID();
    }

    // on creer le produit s'il n'existe pas
    private TFamille createTFamille(CreationProduitDTO creationProduit, TGrossiste grossiste) {

        return produitService.createProduitFromRupture(creationProduit, grossiste);

    }

    private CreationProduitDTO buildFromLigneNReponse(LigneNReponse ligneNReponse) {
        Pair<Integer, Integer> pair = getPrixAchatPrixUni(ligneNReponse.getPrix());
        ProduitRemplacant produitRemplacant = ligneNReponse.getIndisponibilite().getProduitRemplacant();

        CreationProduitDTO creationProduit = new CreationProduitDTO();
        creationProduit.setStrName(produitRemplacant.getDesignation());
        creationProduit.setIntPrice(pair.getRight());
        creationProduit.setIntPaf(pair.getLeft());
        creationProduit.setIntPat(creationProduit.getIntPaf());
        creationProduit.setIntPriceTips(creationProduit.getIntPrice());
        creationProduit.setIntT("");
        if (produitRemplacant.getTypeCodification().equalsIgnoreCase(TYPE_CODIFICATION_EAN)) {
            creationProduit.setIntEan13(produitRemplacant.getCodeProduit());
        } else {
            creationProduit.setIntCip(produitRemplacant.getCodeProduit());
        }
        creationProduit.setLgFamilleArticleId("1010");
        creationProduit.setStrCodeRemise("0");
        creationProduit.setStrCodeTauxRemboursement("0");
        creationProduit.setLgZoneGeoId("1");
        creationProduit.setSeuilMax(1);
        creationProduit.setBoolDeconditionne((short) 0);
        creationProduit.setLgTypeEtiquetteId("2");

        creationProduit.setLgCodeTvaId("1");

        return creationProduit;
    }

    private Pair<TFamille, RuptureDetail> searchCoupleFamilleRuptureDetailByLigneNReponse(List<RuptureDetail> items,
            LigneNReponse ligneNReponse, String idGrossiste) {
        for (RuptureDetail item : items) {

            TFamille famille = item.getProduit();
            if (famille.getIntCIP().equals(ligneNReponse.getCodeProduit())
                    || famille.getIntEAN13().equals(ligneNReponse.getCodeProduit())) {

                return Pair.of(famille, item);
            }

            TFamilleGrossiste familleGrossiste = findTFamilleGrossisteByCodeCipOrEanOrProduitCode(
                    ligneNReponse.getCodeProduit(), idGrossiste, famille.getLgFAMILLEID());

            if (Objects.nonNull(familleGrossiste)) {
                if (familleGrossiste.getStrCODEARTICLE().equals(ligneNReponse.getCodeProduit())) {

                    return Pair.of(famille, item);
                }
            }

        }
        return null;// n'est pas sence arriver
    }

    private Pair<TFamille, TOrderDetail> searchCoupleFamilleOrderDetailByLigneNReponse(List<TOrderDetail> items,
            LigneNReponse ligneNReponse, String idGrossiste) {
        for (TOrderDetail item : items) {

            TFamille famille = item.getLgFAMILLEID();
            if (famille.getIntCIP().equals(ligneNReponse.getCodeProduit())
                    || famille.getIntEAN13().equals(ligneNReponse.getCodeProduit())) {

                return Pair.of(famille, item);
            }

            TFamilleGrossiste familleGrossiste = findTFamilleGrossisteByCodeCipOrEanOrProduitCode(
                    ligneNReponse.getCodeProduit(), idGrossiste, famille.getLgFAMILLEID());

            if (Objects.nonNull(familleGrossiste)) {
                if (familleGrossiste.getStrCODEARTICLE().equals(ligneNReponse.getCodeProduit())) {

                    return Pair.of(famille, item);
                }
            }

        }
        return null;// n'est pas sence arriver
    }

    private void createRupture(Map<TOrderDetail, Pair<TFamille, LigneNReponse>> lignesRupture, TOrder order,
            TGrossiste grossiste) {

        Rupture rupture = orderService.creerRupture(order);
        lignesRupture.forEach((orderDetail, coupleProduitResponse) -> {
            LigneNReponse ligneNReponse = coupleProduitResponse.getRight();
            RuptureDetail ligneRupture = orderService.creerRuptureItem(rupture, coupleProduitResponse.getLeft(),
                    orderDetail.getIntNUMBER());
            ligneRupture.setMotif(motifIndisponibilite(ligneNReponse));
            processRemplacement(ligneNReponse, grossiste, orderDetail.getIntNUMBER(), order,
                    coupleProduitResponse.getLeft(), ligneRupture);
            if (ligneNReponse.getQuantiteLivree() == 0) {
                em.remove(orderDetail);
            }
        });

    }

    private Rupture creerRupture(Rupture ruptureOrigin, TGrossiste grossiste) {
        Rupture rupture = new Rupture();
        rupture.setGrossiste(grossiste);
        rupture.setReference(ruptureOrigin.getReference());
        em.persist(rupture);
        return rupture;

    }

    private void createRupture(Map<RuptureDetail, Pair<TFamille, LigneNReponse>> lignesRupture, Rupture ruptureOrigin,
            TOrder order) {
        TGrossiste grossiste = order.getLgGROSSISTEID();
        Rupture rupture = creerRupture(ruptureOrigin, grossiste);
        lignesRupture.forEach((ruptureDetail, coupleProduitResponse) -> {
            LigneNReponse ligneNReponse = coupleProduitResponse.getRight();
            RuptureDetail ligneRupture = orderService.creerRuptureItem(rupture, coupleProduitResponse.getLeft(),
                    ruptureDetail.getQty());
            ligneRupture.setMotif(motifIndisponibilite(ligneNReponse));
            processRemplacement(ligneNReponse, grossiste, ruptureDetail.getQty(), order,
                    coupleProduitResponse.getLeft(), ligneRupture);

        });

    }

    /**
     * Remplacements annonces par le grossiste (point 5 du 08/10). EL / RL : deja livres, ajoutes a la commande comme
     * avant, et notes. EP : equivalent propose, non livre : note « propose » pour decision dans l'ecran des ruptures,
     * sauf choix memorise pour ce couple de produits (accepte ou refuse automatiquement).
     */
    private void processRemplacement(LigneNReponse ligneNReponse, TGrossiste grossiste, int qty, TOrder order,
            TFamille origine, RuptureDetail ligneRupture) {
        IndisponibiliteN indisponibilite = ligneNReponse.getIndisponibilite();
        if (Objects.isNull(indisponibilite) || Objects.isNull(indisponibilite.getProduitRemplacant())) {
            return;
        }
        ProduitRemplacant produitRemplacant = indisponibilite.getProduitRemplacant();
        String type = StringUtils.upperCase(StringUtils.trimToEmpty(produitRemplacant.getTypeRemplacement()));
        String code = StringUtils.trimToEmpty(produitRemplacant.getCodeProduit());
        if (code.isEmpty()) {
            return;
        }
        if (TypeRemplacement.EL.name().equals(type) || TypeRemplacement.RL.name().equals(type)) {
            TFamilleGrossiste familleGrossiste = findTFamilleGrossisteByCodeCipOrEanOrProduitCode(code,
                    grossiste.getLgGROSSISTEID());
            TFamille famille = findTFamilleByCodeCipOrEan(code);
            if (Objects.isNull(familleGrossiste) && Objects.nonNull(famille)) {
                produitService.createTFamilleGrossisteFromRupture(buildFromLigneNReponse(ligneNReponse), famille,
                        grossiste);
            } else if (Objects.isNull(famille)) {
                famille = createTFamille(buildFromLigneNReponse(ligneNReponse), grossiste);
            }
            // on ajoute la ligne a la commande
            String ligneAjoutee = addRemplacement(ligneNReponse, qty, famille, order);
            String idRempl = noterRemplacement(grossiste, order, origine, null, type, produitRemplacant, ligneNReponse,
                    qty, REMPL_AJOUTE, "AUTO");
            /* retours du 08/10 (7) : ligne de la commande, pour la marquer et pouvoir la retirer avant reception */
            em.createNativeQuery("UPDATE t_pharmaml_remplacement SET lg_ORDERDETAIL_ID = ?1 WHERE lg_ID = ?2")
                    .setParameter(1, ligneAjoutee).setParameter(2, idRempl).executeUpdate();
        } else if (TypeRemplacement.EP.name().equals(type) && origine != null) {
            String choix = choixMemorise(origine.getLgFAMILLEID(), code);
            String id = noterRemplacement(grossiste, order, origine, ligneRupture, type, produitRemplacant,
                    ligneNReponse, qty, REMPL_PROPOSE, null);
            if (choix != null) {
                deciderRemplacement(id, ACCEPTER.equals(choix), false, null, "AUTO");
            }
        }
    }

    static final String REMPL_AJOUTE = "AJOUTE", REMPL_PROPOSE = "PROPOSE", REMPL_ACCEPTE = "ACCEPTE",
            REMPL_REFUSE = "REFUSE", REMPL_RETIRE = "RETIRE", ACCEPTER = "ACCEPTER", REFUSER = "REFUSER";

    private String noterRemplacement(TGrossiste g, TOrder order, TFamille origine, RuptureDetail ligneRupture,
            String type, ProduitRemplacant p, LigneNReponse ligne, int qty, String statut, String mode) {
        Pair<Integer, Integer> prix = getPrixAchatPrixUni(ligne.getPrix());
        String id = java.util.UUID.randomUUID().toString();
        em.createNativeQuery("INSERT INTO t_pharmaml_remplacement (lg_ID, lg_GROSSISTE_ID, lg_ORDER_ID, str_REF_CDE,"
                + " lg_FAMILLE_ID, lg_RUPTURE_DETAIL_ID, str_TYPE, str_CODE_REMPLACANT, str_TYPE_CODIFICATION,"
                + " str_DESIGNATION, int_QTE, int_PRIX_ACHAT, int_PRIX_VENTE, str_STATUT, str_MODE, dt_CREATED,"
                + " dt_DECISION) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, NOW(),"
                + " CASE WHEN ?14 = 'PROPOSE' THEN NULL ELSE NOW() END)").setParameter(1, id)
                .setParameter(2, g.getLgGROSSISTEID()).setParameter(3, order == null ? null : order.getLgORDERID())
                .setParameter(4, order == null ? null : StringUtils.left(order.getStrREFORDER(), 70))
                .setParameter(5, origine == null ? "" : origine.getLgFAMILLEID())
                .setParameter(6, ligneRupture == null ? null : ligneRupture.getId()).setParameter(7, type)
                .setParameter(8, StringUtils.left(p.getCodeProduit(), 20))
                .setParameter(9, StringUtils.left(p.getTypeCodification(), 10))
                .setParameter(10, StringUtils.left(StringUtils.defaultString(p.getDesignation()), 150))
                .setParameter(11, qty).setParameter(12, prix.getLeft() == null ? 0 : prix.getLeft())
                .setParameter(13, prix.getRight() == null ? 0 : prix.getRight()).setParameter(14, statut)
                .setParameter(15, mode).executeUpdate();
        return id;
    }

    @SuppressWarnings("unchecked")
    private String choixMemorise(String familleId, String code) {
        List<Object> r = em
                .createNativeQuery("SELECT str_CHOIX FROM t_pharmaml_equivalent_choix"
                        + " WHERE lg_FAMILLE_ID = ?1 AND str_CODE_REMPLACANT = ?2")
                .setParameter(1, familleId).setParameter(2, code).getResultList();
        return r.isEmpty() ? null : (String) r.get(0);
    }

    // ------------------------------------------------------------------
    // Retours du 08/10 (10) : avancement des commandes (REQ_ETAT_COMMANDE / SUIVI_COMMANDE, tableau 11)
    // ------------------------------------------------------------------

    /**
     * Demande au grossiste ou en est une commande envoyee par PharmaML. Reponse immediate : avancement enregistre et
     * rendu ; FIN_SERVICE : reponse au depot, recuperee par le vidage ; erreur : code (tableau 8) et conseil.
     */
    @Override
    @SuppressWarnings("unchecked")
    public JSONObject avancementCommande(String commandeId, TUser user) {
        TOrder order = em.find(TOrder.class, commandeId);
        if (order == null) {
            return new JSONObject().put("success", false).put("msg", "Commande introuvable.");
        }
        TGrossiste g = order.getLgGROSSISTEID();
        if (StringUtils.isBlank(g.getStrURLPHARMAML())) {
            return new JSONObject().put("success", false).put("msg",
                    "Le grossiste " + g.getStrLIBELLE() + " n'a pas de lien PharmaML.");
        }
        List<Object> refs = em.createNativeQuery("SELECT str_REF_CDE FROM t_pharmaml_attente WHERE lg_SOURCE_ID = ?1"
                + " AND str_SOURCE = ?2 AND str_STATUT IN (?3, ?4, ?5) AND str_REF_CDE IS NOT NULL ORDER BY dt_ENVOI DESC")
                .setParameter(1, commandeId).setParameter(2, SOURCE_COMMANDE).setParameter(3, EN_ATTENTE)
                .setParameter(4, TRAITEE).setParameter(5, RATTACHEE).setMaxResults(1).getResultList();
        if (refs.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Cette commande n'a pas été reçue par le grossiste"
                    + " par PharmaML : il n'y a pas d'avancement à demander.");
        }
        String refCde = (String) refs.get(0);
        List<PharmaMlMessages.Ligne> lignes = new ArrayList<>();
        for (LigneN l : buildNormale(order, g.getLgGROSSISTEID()).getLignes()) {
            lignes.add(new PharmaMlMessages.Ligne(l.getCodeProduit(), "", Integer.parseInt(l.getQuantite())));
        }
        if (lignes.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "La commande n'a plus de ligne.");
        }
        String version = versionCommande(g);
        String ref = refMessage();
        String nom = StringUtils.replace(g.getStrLIBELLE(), StringUtils.SPACE, StringUtils.EMPTY);
        String xml = PharmaMlMessages.etatCommande(version, partenaires(g), ref, refCde, lignes);
        String archiveE = ecrireArchive("E_" + order.getStrREFORDER() + "_" + nom, xml);
        ArchivePharmaMl.journal("SUIVI", g.getStrLIBELLE(), "DEMANDE",
                "commande " + order.getStrREFORDER() + " | message " + ref + " | " + lignes.size()
                        + " ligne(s) | archive " + StringUtils.defaultString(archiveE, "(non archivee)"));
        String corps;
        try {
            HttpResponse<String> rep = EnvoiPharmaMl.envoyer(adresses(g), xml, g.getStrIDRECEPTEURPHARMA(),
                    g.getStrCLERECEPTEUR(), modeControle(g), DELAI_CONNEXION, DELAI_REPONSE).reponse;
            corps = rep.body();
            ecrireArchive("RE_" + order.getStrREFORDER() + "_" + nom, PharmaMlMessages.indenter(corps));
            if (rep.statusCode() != 200) {
                ArchivePharmaMl.journal("SUIVI", g.getStrLIBELLE(), "REFUS HTTP", "HTTP " + rep.statusCode());
                return new JSONObject().put("success", false).put("msg",
                        "Le serveur PharmaML de " + g.getStrLIBELLE() + " a répondu HTTP " + rep.statusCode() + ".");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new JSONObject().put("success", false).put("msg", "Interrogation interrompue.");
        } catch (Exception e) {
            ArchivePharmaMl.journal("SUIVI", g.getStrLIBELLE(), erreurReseau(e) ? "INJOIGNABLE" : "ERREUR",
                    e.getClass().getSimpleName());
            return new JSONObject().put("success", false).put("msg", erreurReseau(e) ? messageReseau(g, e)
                    : "Interrogation impossible (" + e.getClass().getSimpleName() + ").");
        }
        String erreur = PharmaMlMessages.erreurReponse(corps);
        if (erreur != null) {
            String code = PharmaMlMessages.codeErreur(erreur);
            ArchivePharmaMl.journal("SUIVI", g.getStrLIBELLE(), "REFUS", erreur);
            boolean nonOuvert = "0006".equals(code) || "6".equals(code) || "0103".equals(code) || "103".equals(code);
            return new JSONObject().put("success", false).put("serviceFerme", nonOuvert).put("msg",
                    g.getStrLIBELLE() + " a refusé la demande d'avancement : « " + erreur + " »." + (nonOuvert
                            ? " Ce grossiste ne propose pas (ou pas à l'officine) le suivi de commande par PharmaML."
                            : CodeErreurPharmaMl.conseil(code)));
        }
        PharmaMlMessages.Enveloppe env = PharmaMlMessages.lireEnveloppe(corps);
        if (!corps.contains("SUIVI_COMMANDE") && "FIN_SERVICE".equals(env.action)) {
            em.createNativeQuery("INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, lg_SOURCE_ID,"
                    + " str_REF_MESSAGE, str_REF_CDE, str_VERSION, str_STATUT, dt_ENVOI) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NOW())")
                    .setParameter(1, UUID.randomUUID().toString()).setParameter(2, g.getLgGROSSISTEID())
                    .setParameter(3, SOURCE_SUIVI).setParameter(4, commandeId).setParameter(5, ref)
                    .setParameter(6, refCde).setParameter(7, version).setParameter(8, EN_ATTENTE).executeUpdate();
            ArchivePharmaMl.journal("SUIVI", g.getStrLIBELLE(), "EN_ATTENTE",
                    "commande " + order.getStrREFORDER() + " | reponse au depot (vidage)");
            return new JSONObject().put("success", true).put("enAttente", true).put("msg", g.getStrLIBELLE()
                    + " a reçu la demande ; l'avancement sera récupéré avec les réponses PharmaML (bouton « Récupérer »).");
        }
        return appliquerSuivi(g, commandeId, corps, ref);
    }

    /** Lignes du suivi enregistrees ; etat global et date de livraison prevue rendus. */
    private JSONObject appliquerSuivi(TGrossiste g, String commandeId, String xml, String refMessage) {
        Object[] lu;
        try {
            lu = PharmaMlMessages.lireSuiviCommande(xml);
        } catch (Exception e) {
            lu = null;
        }
        if (lu == null) {
            return new JSONObject().put("success", false).put("msg", "Réponse de suivi illisible (archivée).");
        }
        @SuppressWarnings("unchecked")
        List<PharmaMlMessages.Suivi> lignes = (List<PharmaMlMessages.Suivi>) lu[1];
        for (PharmaMlMessages.Suivi l : lignes) {
            TFamille f = StringUtils.isBlank(l.code) ? null : famillePourCode(l.code, g.getLgGROSSISTEID());
            em.createNativeQuery(
                    "INSERT INTO t_pharmaml_avancement (lg_ID, lg_ORDER_ID, lg_GROSSISTE_ID, str_REF_MESSAGE,"
                            + " str_CODE_PRODUIT, lg_FAMILLE_ID, int_QTE, str_CODE_STATUT, str_LIBELLE, str_DATE_LIVRAISON,"
                            + " str_COMMENTAIRE, dt_REPONSE) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, NOW())")
                    .setParameter(1, UUID.randomUUID().toString()).setParameter(2, commandeId)
                    .setParameter(3, g.getLgGROSSISTEID()).setParameter(4, StringUtils.left(refMessage, 40))
                    .setParameter(5, StringUtils.left(l.code, 20))
                    .setParameter(6, f == null ? null : f.getLgFAMILLEID()).setParameter(7, l.quantite)
                    .setParameter(8, StringUtils.left(l.codeStatut, 10))
                    .setParameter(9,
                            StringUtils.left(CodeAvancementPharmaMl.libelle(l.codeStatut, l.libelleStatut), 100))
                    .setParameter(10, StringUtils.left((l.dateLivraison + " " + l.heureLivraison).trim(), 20))
                    .setParameter(11, StringUtils.left(l.commentaire, 255)).executeUpdate();
        }
        JSONObject r = avancement(em, commandeId);
        ArchivePharmaMl.journal("SUIVI", g.getStrLIBELLE(), "AVANCEMENT",
                "commande " + commandeId + " | " + r.optString("libelle")
                        + (r.optString("dateLivraison").isEmpty() ? ""
                                : " | livraison prevue " + r.optString("dateLivraison"))
                        + " | " + lignes.size() + " ligne(s)");
        return r.put("success", true);
    }

    private TFamille famillePourCode(String code, String grossisteId) {
        TFamilleGrossiste fg = findTFamilleGrossisteByCodeCipOrEanOrProduitCode(code, grossisteId);
        return fg != null ? fg.getLgFAMILLEID() : findTFamilleByCodeCipOrEan(code);
    }

    /** Suivi depose au depot : rattache a la demande en attente, sinon a la commande par sa reference. */
    @SuppressWarnings("unchecked")
    private JSONObject appliquerSuiviDiffere(TGrossiste g, PharmaMlMessages.Enveloppe env, String xml, String archive,
            boolean noterOrpheline) {
        JSONObject r = new JSONObject().put("refMessage", env.refMessage).put("enReponseA", env.enReponseA);
        String refCde = "";
        try {
            Object[] lu = PharmaMlMessages.lireSuiviCommande(xml);
            refCde = lu == null ? "" : (String) lu[0];
        } catch (Exception e) {
            /* illisible : traite comme non rattache */
        }
        List<Object[]> a = em.createNativeQuery("SELECT lg_ID, lg_SOURCE_ID FROM t_pharmaml_attente WHERE"
                + " lg_GROSSISTE_ID = ?1 AND str_SOURCE = ?2 AND str_STATUT = ?3 AND (str_REF_MESSAGE = ?4 OR str_REF_CDE = ?5)"
                + " ORDER BY dt_ENVOI DESC").setParameter(1, g.getLgGROSSISTEID()).setParameter(2, SOURCE_SUIVI)
                .setParameter(3, EN_ATTENTE).setParameter(4, StringUtils.defaultString(env.enReponseA))
                .setParameter(5, refCde).setMaxResults(1).getResultList();
        String commandeId = a.isEmpty() ? null : (String) a.get(0)[1];
        if (commandeId == null && !refCde.isEmpty()) {
            List<Object> c = em
                    .createNativeQuery("SELECT lg_SOURCE_ID FROM t_pharmaml_attente WHERE lg_GROSSISTE_ID = ?1"
                            + " AND str_SOURCE = ?2 AND str_REF_CDE = ?3 ORDER BY dt_ENVOI DESC")
                    .setParameter(1, g.getLgGROSSISTEID()).setParameter(2, SOURCE_COMMANDE).setParameter(3, refCde)
                    .setMaxResults(1).getResultList();
            commandeId = c.isEmpty() ? null : (String) c.get(0);
        }
        if (commandeId == null || em.find(TOrder.class, commandeId) == null) {
            if (noterOrpheline) {
                em.createNativeQuery(
                        "INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, str_REF_MESSAGE,"
                                + " str_STATUT, str_DETAIL, dt_ENVOI, dt_REPONSE) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NOW(), NOW())")
                        .setParameter(1, UUID.randomUUID().toString()).setParameter(2, g.getLgGROSSISTEID())
                        .setParameter(3, SOURCE_SUIVI).setParameter(4, env.enReponseA).setParameter(5, ORPHELINE)
                        .setParameter(6,
                                StringUtils.left("Suivi de commande non rattaché, archivé : " + archive + ".xml", 500))
                        .executeUpdate();
            }
            return r.put("statut", ORPHELINE);
        }
        JSONObject res = appliquerSuivi(g, commandeId, xml, env.refMessage);
        if (!a.isEmpty()) {
            em.createNativeQuery("UPDATE t_pharmaml_attente SET str_STATUT = ?1, str_DETAIL = ?2, dt_REPONSE = NOW()"
                    + " WHERE lg_ID = ?3").setParameter(1, TRAITEE)
                    .setParameter(2, StringUtils.left(res.optString("libelle"), 500)).setParameter(3, a.get(0)[0])
                    .executeUpdate();
        }
        return r.put("statut", TRAITEE).put("source", SOURCE_SUIVI).put("sourceId", commandeId).put("resultat", res);
    }

    /**
     * Dernier avancement connu d'une commande : etat global (tableau 11), libelle, date de livraison prevue, lignes
     * annulees, date de la reponse, lignes. Vide (etat "") si aucune reponse.
     */
    @SuppressWarnings("unchecked")
    public static JSONObject avancement(javax.persistence.EntityManager em, String commandeId) {
        JSONObject r = new JSONObject().put("etat", "").put("libelle", "").put("dateLivraison", "").put("annulees", 0)
                .put("date", "").put("lignes", new JSONArray());
        if (StringUtils.isBlank(commandeId)) {
            return r;
        }
        List<Object[]> l = em
                .createNativeQuery("SELECT a.str_CODE_STATUT, a.str_LIBELLE, IFNULL(a.str_DATE_LIVRAISON, ''),"
                        + " IFNULL(a.str_COMMENTAIRE, ''), a.str_CODE_PRODUIT, IFNULL(f.str_NAME, ''), a.int_QTE,"
                        + " DATE_FORMAT(a.dt_REPONSE, '%d/%m/%Y %H:%i') FROM t_pharmaml_avancement a"
                        + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = a.lg_FAMILLE_ID WHERE a.lg_ORDER_ID = ?1"
                        + " AND a.dt_REPONSE = (SELECT MAX(x.dt_REPONSE) FROM t_pharmaml_avancement x WHERE x.lg_ORDER_ID = ?1)"
                        + " ORDER BY f.str_NAME")
                .setParameter(1, commandeId).getResultList();
        if (l.isEmpty()) {
            return r;
        }
        List<String> etats = new ArrayList<>();
        String dateLivraison = "";
        int annulees = 0;
        JSONArray lignes = new JSONArray();
        for (Object[] x : l) {
            String etat = CodeAvancementPharmaMl.etat((String) x[0]);
            etats.add(etat);
            if (CodeAvancementPharmaMl.ANNULEE.equals(etat)) {
                annulees++;
            } else if (!((String) x[2]).isEmpty()
                    && (dateLivraison.isEmpty() || ((String) x[2]).compareTo(dateLivraison) > 0)) {
                dateLivraison = (String) x[2];
            }
            lignes.put(new JSONObject().put("etat", etat).put("libelle", x[1]).put("dateLivraison", x[2])
                    .put("commentaire", x[3]).put("code", x[4]).put("produit", x[5]).put("qte", x[6]));
        }
        String global = CodeAvancementPharmaMl.global(etats);
        String libelle = CodeAvancementPharmaMl.AUTRE
                .equals(global)
                        ? (String) l.get(0)[1]
                        : CodeAvancementPharmaMl
                                .libelle(
                                        global.equals(CodeAvancementPharmaMl.A_FAIRE) ? "1"
                                                : global.equals(CodeAvancementPharmaMl.EN_COURS) ? "2"
                                                        : global.equals(CodeAvancementPharmaMl.PREPAREE) ? "3" : "4",
                                        "");
        return r.put("etat", global).put("libelle", libelle).put("dateLivraison", dateLivraison)
                .put("annulees", annulees).put("date", l.get(0)[7]).put("lignes", lignes);
    }

    @Override
    public JSONObject avancementConnu(String commandeId) {
        return avancement(em, commandeId).put("success", true);
    }

    // ------------------------------------------------------------------
    // Retours du 08/10 (13) : retours fournisseurs et reclamations par PharmaML
    // ------------------------------------------------------------------

    /**
     * Envoie le retour : les lignes « retour » en demande d'autorisation (REQ_RETOUR), les lignes « reclamation » en
     * reclamation (RECLAMATIONS), selon le motif. Reponse immediate (bon de retour) appliquee ; fin de service : la
     * reponse sera recuperee au vidage (souvent plus tard) ; refus : code et conseil.
     */
    @Override
    public JSONObject envoyerRetour(String retourId, TUser user) {
        Object[] e = RetourPharmaMl.entete(em, retourId);
        if (e == null) {
            return new JSONObject().put("success", false).put("msg", "Retour introuvable.");
        }
        if (RetourPharmaMl.EN_ATTENTE.equals(e[4]) || RetourPharmaMl.REPONDU.equals(e[4])) {
            return new JSONObject().put("success", false).put("msg", RetourPharmaMl.REPONDU.equals(e[4])
                    ? "Le grossiste a déjà répondu à ce retour : il n'est pas renvoyé."
                    : "Ce retour a déjà été envoyé ; la réponse du grossiste est attendue (« Réponses PharmaML »).");
        }
        TGrossiste g = e[0] == null ? null : em.find(TGrossiste.class, (String) e[0]);
        if (g == null || StringUtils.isBlank(g.getStrURLPHARMAML())) {
            return new JSONObject().put("success", false).put("msg",
                    "Le grossiste " + (g == null ? "" : g.getStrLIBELLE() + " ") + "n'a pas de lien PharmaML.");
        }
        String refBl = (String) e[1], refRetour = StringUtils.defaultString((String) e[2]);
        List<RetourPharmaMl.Ligne> retours = new ArrayList<>(), reclamations = new ArrayList<>();
        List<String> ignores = new ArrayList<>();
        for (RetourPharmaMl.Ligne l : RetourPharmaMl.lignes(em, retourId)) {
            if (RetourPharmaMl.RETOUR.equals(l.type) && StringUtils.isNotBlank(l.codeNorme)) {
                retours.add(l);
            } else if (RetourPharmaMl.RECLAMATION.equals(l.type) && StringUtils.isNotBlank(l.codeNorme)) {
                reclamations.add(l);
            } else {
                ignores.add(l.designation + " (motif " + StringUtils.defaultIfBlank(l.motifLocal, "?") + ")");
            }
        }
        if (retours.isEmpty() && reclamations.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Aucune ligne à envoyer : les motifs choisis ne"
                    + " partent pas par PharmaML (" + String.join(", ", ignores) + ").");
        }
        if (retours.size() > PharmaMlMessages.MAX_LIGNES || reclamations.size() > PharmaMlMessages.MAX_LIGNES) {
            return new JSONObject().put("success", false).put("msg",
                    "PharmaML accepte 50 lignes au plus par demande : scindez ce retour.");
        }
        if (!reclamations.isEmpty() && StringUtils.isBlank(refBl)) {
            return new JSONObject().put("success", false).put("msg",
                    "Une réclamation porte sur un bon de livraison : choisissez le bon de livraison du retour.");
        }
        String version = versionCommande(g);
        String refDemande = StringUtils.left("RT" + refRetour, 20), refReclam = StringUtils.left("RC" + refRetour, 20);
        List<String> messages = new ArrayList<>();
        boolean attente = false, erreur = false, repondu = false;
        if (!retours.isEmpty()) {
            List<PharmaMlMessages.LigneRetour> lignes = new ArrayList<>();
            for (int i = 0; i < retours.size(); i++) {
                RetourPharmaMl.Ligne l = retours.get(i);
                lignes.add(new PharmaMlMessages.LigneRetour(l.code, l.designation, l.quantite, l.codeNorme, null, null,
                        null, null));
                RetourPharmaMl.noterEnvoiLigne(em, l, i + 1);
            }
            String ref = refMessage();
            JSONObject r = echangeRetour(g, SOURCE_RETOUR, retourId, refRetour, ref, refDemande,
                    PharmaMlMessages.demandeRetour(version, partenaires(g), ref, refDemande, refBl, lignes), version);
            messages.add("Demande de retour (" + retours.size() + " ligne(s)) : " + r.optString("msg"));
            attente |= r.optBoolean("enAttente");
            erreur |= !r.optBoolean("success");
            repondu |= r.optBoolean("repondu");
        }
        if (!reclamations.isEmpty()) {
            List<PharmaMlMessages.LigneRetour> lignes = new ArrayList<>();
            for (int i = 0; i < reclamations.size(); i++) {
                RetourPharmaMl.Ligne l = reclamations.get(i);
                lignes.add(new PharmaMlMessages.LigneRetour(l.code, l.designation, l.quantite, l.codeNorme, l.action,
                        null, null, null));
                RetourPharmaMl.noterEnvoiLigne(em, l, i + 1);
            }
            String ref = refMessage();
            JSONObject r = echangeRetour(g, SOURCE_RECLAM, retourId, refRetour, ref, refReclam,
                    PharmaMlMessages.reclamations(version, partenaires(g), ref, refReclam, refBl, lignes), version);
            messages.add("Réclamation (" + reclamations.size() + " ligne(s)) : " + r.optString("msg"));
            attente |= r.optBoolean("enAttente");
            erreur |= !r.optBoolean("success");
        }
        if (!ignores.isEmpty()) {
            messages.add("Non envoyé (motif interne) : " + String.join(", ", ignores));
        }
        String statut = erreur ? RetourPharmaMl.ERREUR
                : repondu ? RetourPharmaMl.REPONDU : attente ? RetourPharmaMl.EN_ATTENTE : RetourPharmaMl.ENVOYE;
        String detail = String.join(" · ", messages);
        if (!RetourPharmaMl.REPONDU.equals(statut)) {
            RetourPharmaMl.statut(em, retourId, statut, detail, retours.isEmpty() ? null : refDemande,
                    reclamations.isEmpty() ? null : refReclam, true);
        }
        return new JSONObject().put("success", !erreur).put("statut", statut).put("msg", detail).put("enAttente",
                attente);
    }

    /** Un message (demande de retour ou reclamation) : envoi, archives T_/RT_ ou Q_/RQ_, journal, reponse. */
    private JSONObject echangeRetour(TGrossiste g, String source, String retourId, String refRetour, String ref,
            String refDocument, String xml, String version) {
        String nom = StringUtils.replace(g.getStrLIBELLE(), StringUtils.SPACE, StringUtils.EMPTY);
        boolean retour = SOURCE_RETOUR.equals(source);
        String prefixe = retour ? "T_" : "Q_", domaine = retour ? "RETOUR" : "RECLAMATION";
        String archive = ecrireArchive(prefixe + refRetour + "_" + nom, xml);
        ArchivePharmaMl.journal(domaine, g.getStrLIBELLE(), "DEMANDE", "retour " + refRetour + " | message " + ref
                + " | document " + refDocument + " | archive " + StringUtils.defaultString(archive, "(non archivee)"));
        String corps;
        try {
            HttpResponse<String> rep = EnvoiPharmaMl.envoyer(adresses(g), xml, g.getStrIDRECEPTEURPHARMA(),
                    g.getStrCLERECEPTEUR(), modeControle(g), DELAI_CONNEXION, DELAI_REPONSE).reponse;
            corps = rep.body();
            ecrireArchive("R" + prefixe + refRetour + "_" + nom, PharmaMlMessages.indenter(corps));
            if (rep.statusCode() != 200) {
                ArchivePharmaMl.journal(domaine, g.getStrLIBELLE(), "REFUS HTTP", "HTTP " + rep.statusCode());
                return new JSONObject().put("success", false).put("msg",
                        "le serveur a répondu HTTP " + rep.statusCode());
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return new JSONObject().put("success", false).put("msg", "envoi interrompu");
        } catch (Exception ex) {
            ArchivePharmaMl.journal(domaine, g.getStrLIBELLE(), erreurReseau(ex) ? "INJOIGNABLE" : "ERREUR",
                    ex.getClass().getSimpleName());
            return new JSONObject().put("success", false).put("msg", erreurReseau(ex) ? messageReseau(g, ex)
                    : "envoi impossible (" + ex.getClass().getSimpleName() + ")");
        }
        String erreur = PharmaMlMessages.erreurReponse(corps);
        if (erreur != null) {
            ArchivePharmaMl.journal(domaine, g.getStrLIBELLE(), "REFUS", erreur);
            return new JSONObject().put("success", false).put("msg",
                    "refusé : « " + erreur + " »." + CodeErreurPharmaMl.conseil(PharmaMlMessages.codeErreur(erreur)));
        }
        Object[] bon = null;
        try {
            bon = retour ? PharmaMlMessages.lireBonRetour(corps) : null;
        } catch (Exception ex) {
            bon = null;
        }
        if (bon != null) {
            JSONObject a = RetourPharmaMl.appliquerBonRetour(em, retourId, bon);
            ArchivePharmaMl.journal(domaine, g.getStrLIBELLE(), "BON DE RETOUR", a.optString("msg"));
            return new JSONObject().put("success", true).put("repondu", true).put("msg", a.optString("msg"));
        }
        PharmaMlMessages.Enveloppe env = PharmaMlMessages.lireEnveloppe(corps);
        if (retour || "FIN_SERVICE".equals(env.action)) {
            /* reponse differee : le bon de retour (ou la reponse a la reclamation) sera recupere au vidage */
            em.createNativeQuery("INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, lg_SOURCE_ID,"
                    + " str_REF_MESSAGE, str_REF_CDE, str_VERSION, str_STATUT, dt_ENVOI) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NOW())")
                    .setParameter(1, UUID.randomUUID().toString()).setParameter(2, g.getLgGROSSISTEID())
                    .setParameter(3, source).setParameter(4, retourId).setParameter(5, ref).setParameter(6, refDocument)
                    .setParameter(7, version).setParameter(8, EN_ATTENTE).executeUpdate();
            ArchivePharmaMl.journal(domaine, g.getStrLIBELLE(), "EN_ATTENTE",
                    "retour " + refRetour + " | reponse au depot");
            return new JSONObject().put("success", true).put("enAttente", true).put("msg", g.getStrLIBELLE()
                    + " a reçu la demande ; sa réponse sera récupérée automatiquement (ou par « Réponses PharmaML »).");
        }
        ArchivePharmaMl.journal(domaine, g.getStrLIBELLE(), "RECUE", "reclamation prise en compte");
        return new JSONObject().put("success", true).put("msg",
                g.getStrLIBELLE() + " a pris en compte la réclamation.");
    }

    /** Bon de retour depose au depot : rattache a la demande en attente, sinon par la reference de la demande. */
    private JSONObject appliquerBonRetourDiffere(TGrossiste g, PharmaMlMessages.Enveloppe env, String xml,
            String archive, boolean noterOrpheline) {
        JSONObject r = new JSONObject().put("refMessage", env.refMessage).put("enReponseA", env.enReponseA);
        Object[] bon;
        try {
            bon = PharmaMlMessages.lireBonRetour(xml);
        } catch (Exception e) {
            bon = null;
        }
        if (bon == null) {
            return r.put("statut", ERREUR).put("resultat", new JSONObject().put("msg", "bon de retour illisible"));
        }
        @SuppressWarnings("unchecked")
        List<Object[]> a = em
                .createNativeQuery("SELECT lg_ID, lg_SOURCE_ID FROM t_pharmaml_attente WHERE lg_GROSSISTE_ID = ?1"
                        + " AND str_SOURCE = ?2 AND str_STATUT = ?3 AND (str_REF_MESSAGE = ?4 OR str_REF_CDE = ?5) ORDER BY dt_ENVOI DESC")
                .setParameter(1, g.getLgGROSSISTEID()).setParameter(2, SOURCE_RETOUR).setParameter(3, EN_ATTENTE)
                .setParameter(4, StringUtils.defaultString(env.enReponseA)).setParameter(5, (String) bon[0])
                .getResultList();
        String retourId = a.isEmpty() ? RetourPharmaMl.retourDeLaDemande(em, g.getLgGROSSISTEID(), (String) bon[0])
                : (String) a.get(0)[1];
        if (retourId == null) {
            if (noterOrpheline) {
                em.createNativeQuery(
                        "INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, str_REF_MESSAGE,"
                                + " str_STATUT, str_DETAIL, dt_ENVOI, dt_REPONSE) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NOW(), NOW())")
                        .setParameter(1, UUID.randomUUID().toString()).setParameter(2, g.getLgGROSSISTEID())
                        .setParameter(3, SOURCE_RETOUR).setParameter(4, env.enReponseA).setParameter(5, ORPHELINE)
                        .setParameter(6,
                                StringUtils.left("Bon de retour non rattaché, archivé : " + archive + ".xml", 500))
                        .executeUpdate();
            }
            return r.put("statut", ORPHELINE);
        }
        JSONObject res = RetourPharmaMl.appliquerBonRetour(em, retourId, bon);
        if (!a.isEmpty()) {
            em.createNativeQuery(
                    "UPDATE t_pharmaml_attente SET str_STATUT = ?1, str_DETAIL = ?2, dt_REPONSE = NOW() WHERE lg_ID = ?3")
                    .setParameter(1, TRAITEE).setParameter(2, StringUtils.left(res.optString("msg"), 500))
                    .setParameter(3, a.get(0)[0]).executeUpdate();
        }
        ArchivePharmaMl.journal("RETOUR", g.getStrLIBELLE(), "BON DE RETOUR", res.optString("msg"));
        return r.put("statut", TRAITEE).put("source", SOURCE_RETOUR).put("sourceId", retourId).put("resultat", res);
    }

    @Override
    public JSONObject etatRetour(String retourId) {
        return RetourPharmaMl.etat(em, retourId);
    }

    // Retours du 08/10 (11) : bons de livraison valorises et alertes deposes au depot

    @Override
    public JSONObject blvsCommande(String commandeId) {
        return BlvPharmaMl.blvsCommande(em, commandeId);
    }

    @Override
    public JSONObject blv(String blvId, String commandeId) {
        return BlvPharmaMl.detail(em, blvId, commandeId);
    }

    @Override
    public JSONObject alertes(boolean nonLuesSeulement) {
        return BlvPharmaMl.alertes(em, nonLuesSeulement);
    }

    @Override
    public JSONObject tableauBord() {
        return TableauBordPharmaMl.calculer(em);
    }

    @Override
    public JSONObject alerteLue(String alerteId, TUser user) {
        return BlvPharmaMl.marquerLue(em, alerteId, nomUtilisateur(user));
    }

    // ------------------------------------------------------------------
    // Retours du 08/10 (7) : suivi des substitutions (onglet « Substitutions » des ruptures, lignes de commande)
    // ------------------------------------------------------------------

    private static final java.time.format.DateTimeFormatter HORODATAGE_HISTO = java.time.format.DateTimeFormatter
            .ofPattern("dd/MM/yyyy HH:mm");

    static String nomUtilisateur(TUser u) {
        if (u == null) {
            return "le système";
        }
        String n = (StringUtils.trimToEmpty(u.getStrFIRSTNAME()) + " " + StringUtils.trimToEmpty(u.getStrLASTNAME()))
                .trim();
        return n.isEmpty() ? StringUtils.defaultString(u.getStrLOGIN()) : n;
    }

    /** Historique existant + nouvelle entree datee (le plus recent a la fin), borne a 1000 caracteres. */
    @SuppressWarnings("unchecked")
    private String historique(String id, String entree) {
        List<Object> r = em.createNativeQuery("SELECT str_HISTORIQUE FROM t_pharmaml_remplacement WHERE lg_ID = ?1")
                .setParameter(1, id).getResultList();
        String avant = r.isEmpty() || r.get(0) == null ? "" : (String) r.get(0);
        String ligne = java.time.LocalDateTime.now().format(HORODATAGE_HISTO) + " : " + entree;
        String tout = avant.isEmpty() ? ligne : avant + " ; " + ligne;
        return tout.length() <= 1000 ? tout : "… " + tout.substring(tout.length() - 998);
    }

    /** Rupture deja renvoyee au grossiste (envoi recu, en attente ou traite) : la substitution n'est plus annulable. */
    @SuppressWarnings("unchecked")
    private boolean ruptureRenvoyee(String ruptureId) {
        if (ruptureId == null) {
            return false;
        }
        List<Object> r = em
                .createNativeQuery("SELECT COUNT(*) FROM t_pharmaml_attente WHERE str_SOURCE = ?1"
                        + " AND lg_SOURCE_ID = ?2 AND str_STATUT IN (?3, ?4, ?5)")
                .setParameter(1, SOURCE_RUPTURE).setParameter(2, ruptureId).setParameter(3, EN_ATTENTE)
                .setParameter(4, TRAITEE).setParameter(5, RATTACHEE).getResultList();
        return ((Number) r.get(0)).intValue() > 0;
    }

    private static final String SQL_SUBSTITUTIONS = "SELECT r.lg_ID, r.str_TYPE, r.str_STATUT, IFNULL(r.str_MODE, ''),"
            + " DATE_FORMAT(r.dt_CREATED, '%d/%m/%Y %H:%i'), IFNULL(DATE_FORMAT(r.dt_DECISION, '%d/%m/%Y %H:%i'), ''),"
            + " IFNULL(TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))), ''),"
            + " g.str_LIBELLE, IFNULL(r.str_REF_CDE, ''), IFNULL(fo.int_CIP, ''), IFNULL(fo.str_NAME, ''),"
            + " r.str_CODE_REMPLACANT, IFNULL(NULLIF(r.str_DESIGNATION, ''), IFNULL((SELECT e.str_NAME FROM t_famille e"
            + "   WHERE e.int_CIP = r.str_CODE_REMPLACANT LIMIT 1), '')), r.int_QTE, r.int_PRIX_ACHAT,"
            + " IFNULL(r.str_HISTORIQUE, ''), r.lg_ORDER_ID, r.lg_ORDERDETAIL_ID, IFNULL(o.str_STATUT, ''),"
            + " (SELECT d.ruptureId FROM rupture_detail d WHERE d.id = r.lg_RUPTURE_DETAIL_ID),"
            + " (SELECT d.produitId FROM rupture_detail d WHERE d.id = r.lg_RUPTURE_DETAIL_ID), r.lg_FAMILLE_ID,"
            + " (SELECT COUNT(*) FROM t_order_detail od WHERE od.lg_ORDERDETAIL_ID = r.lg_ORDERDETAIL_ID)"
            + " FROM t_pharmaml_remplacement r JOIN t_grossiste g ON g.lg_GROSSISTE_ID = r.lg_GROSSISTE_ID"
            + " LEFT JOIN t_famille fo ON fo.lg_FAMILLE_ID = r.lg_FAMILLE_ID"
            + " LEFT JOIN t_user u ON u.lg_USER_ID = r.lg_USER_ID LEFT JOIN t_order o ON o.lg_ORDER_ID = r.lg_ORDER_ID";

    private JSONObject ligneSubstitution(Object[] l) {
        String statut = (String) l[2], type = (String) l[1];
        String ruptureId = (String) l[19], produitRupture = (String) l[20], origine = (String) l[21];
        boolean ligneCommande = l[22] != null && ((Number) l[22]).intValue() > 0;
        String statutCommande = (String) l[18];
        boolean commandeNonRecue = "is_Process".equals(statutCommande) || Constant.STATUT_PHARMA.equals(statutCommande);
        /* annulable : acceptee, rupture encore la et non renvoyee, la ligne porte toujours l'equivalent */
        boolean annulable = REMPL_ACCEPTE.equals(statut) && ruptureId != null && produitRupture != null
                && !produitRupture.equals(origine) && !ruptureRenvoyee(ruptureId);
        /* retirable : deja livre (EL/RL) ajoute a une commande pas encore receptionnee (aucun bon de livraison) */
        boolean retirable = REMPL_AJOUTE.equals(statut) && ligneCommande && commandeNonRecue;
        String raison = "";
        if (REMPL_ACCEPTE.equals(statut) && !annulable) {
            raison = ruptureId == null ? "rupture supprimée" : "rupture déjà renvoyée au grossiste";
        } else if (REMPL_AJOUTE.equals(statut) && !retirable) {
            raison = !ligneCommande ? "ligne absente de la commande" : "commande déjà en réception (bon de livraison)";
        }
        return new JSONObject().put("id", l[0]).put("type", type).put("statut", statut).put("mode", l[3])
                .put("date", l[4]).put("dateDecision", l[5]).put("utilisateur", l[6]).put("grossiste", l[7])
                .put("reference", l[8]).put("cipOrigine", l[9]).put("produitOrigine", l[10])
                .put("codeRemplacant", l[11]).put("designationRemplacant", l[12]).put("qte", l[13])
                .put("prixAchat", l[14]).put("historique", l[15]).put("commandeId", l[16] == null ? "" : l[16])
                .put("ligneCommandeId", l[17] == null ? "" : l[17]).put("ruptureId", ruptureId == null ? "" : ruptureId)
                .put("annulable", annulable).put("retirable", retirable).put("raison", raison);
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject substitutions(String statut, String grossisteId, java.time.LocalDate du, java.time.LocalDate au,
            String recherche) {
        StringBuilder sql = new StringBuilder(SQL_SUBSTITUTIONS).append(" WHERE DATE(r.dt_CREATED) BETWEEN ?1 AND ?2");
        if (StringUtils.isNotBlank(statut)) {
            sql.append(" AND r.str_STATUT = ?3");
        }
        if (StringUtils.isNotBlank(grossisteId)) {
            sql.append(" AND r.lg_GROSSISTE_ID = ?4");
        }
        if (StringUtils.isNotBlank(recherche)) {
            sql.append(" AND (r.str_REF_CDE LIKE ?5 OR fo.str_NAME LIKE ?5 OR fo.int_CIP LIKE ?5"
                    + " OR r.str_DESIGNATION LIKE ?5 OR r.str_CODE_REMPLACANT LIKE ?5)");
        }
        sql.append(" ORDER BY r.dt_CREATED DESC");
        javax.persistence.Query q = em.createNativeQuery(sql.toString()).setParameter(1, du).setParameter(2, au);
        if (StringUtils.isNotBlank(statut)) {
            q.setParameter(3, statut);
        }
        if (StringUtils.isNotBlank(grossisteId)) {
            q.setParameter(4, grossisteId);
        }
        if (StringUtils.isNotBlank(recherche)) {
            q.setParameter(5, "%" + recherche.trim() + "%");
        }
        JSONArray a = new JSONArray();
        for (Object[] l : (List<Object[]>) q.setMaxResults(1000).getResultList()) {
            a.put(ligneSubstitution(l));
        }
        return new JSONObject().put("success", true).put("data", a).put("total", a.length());
    }

    /** Substitutions d'une commande : lignes ajoutees (EL/RL) et equivalents proposes en attente de decision. */
    @Override
    @SuppressWarnings("unchecked")
    public JSONObject substitutionsCommande(String commandeId) {
        JSONArray a = new JSONArray();
        int aDecider = 0;
        for (Object[] l : (List<Object[]>) em
                .createNativeQuery(SQL_SUBSTITUTIONS + " WHERE r.lg_ORDER_ID = ?1" + " ORDER BY r.dt_CREATED")
                .setParameter(1, commandeId).getResultList()) {
            JSONObject o = ligneSubstitution(l);
            if (REMPL_PROPOSE.equals(o.getString("statut"))) {
                aDecider++;
            }
            a.put(o);
        }
        return new JSONObject().put("success", true).put("data", a).put("aDecider", aDecider);
    }

    /** Equivalents proposes en attente de decision, par commande (pastille de la liste des commandes). */
    @SuppressWarnings("unchecked")
    public static int propositionsADecider(javax.persistence.EntityManager em, String commandeId) {
        if (StringUtils.isBlank(commandeId)) {
            return 0;
        }
        List<Object> r = em.createNativeQuery(
                "SELECT COUNT(*) FROM t_pharmaml_remplacement WHERE lg_ORDER_ID = ?1" + " AND str_STATUT = 'PROPOSE'")
                .setParameter(1, commandeId).getResultList();
        return ((Number) r.get(0)).intValue();
    }

    /**
     * Annule une acceptation tant que la rupture n'a pas ete renvoyee : la ligne de rupture reprend le produit
     * d'origine et la proposition redevient a decider. La fiche creee a l'acceptation (produit inconnu) reste.
     */
    @Override
    @SuppressWarnings("unchecked")
    public JSONObject annulerAcceptation(String id, TUser user) {
        List<Object[]> r = em.createNativeQuery(SQL_SUBSTITUTIONS + " WHERE r.lg_ID = ?1").setParameter(1, id)
                .getResultList();
        if (r.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Substitution introuvable");
        }
        JSONObject o = ligneSubstitution(r.get(0));
        if (!REMPL_ACCEPTE.equals(o.getString("statut"))) {
            return new JSONObject().put("success", false).put("msg",
                    "Seule une substitution acceptée peut être annulée.");
        }
        if (!o.getBoolean("annulable")) {
            return new JSONObject().put("success", false).put("msg",
                    "Annulation impossible : " + o.getString("raison") + ".");
        }
        List<Object> ligneRupture = em
                .createNativeQuery("SELECT lg_RUPTURE_DETAIL_ID FROM t_pharmaml_remplacement" + " WHERE lg_ID = ?1")
                .setParameter(1, id).getResultList();
        RuptureDetail ligne = em.find(RuptureDetail.class, (String) ligneRupture.get(0));
        TFamille origine = em.find(TFamille.class, (String) r.get(0)[21]);
        if (ligne == null || origine == null) {
            return new JSONObject().put("success", false).put("msg",
                    "Annulation impossible : rupture ou produit introuvable.");
        }
        ligne.setProduit(origine);
        ligne.setPrixAchat(origine.getIntPAF());
        ligne.setPrixVente(origine.getIntPRICE());
        em.merge(ligne);
        em.createNativeQuery("UPDATE t_pharmaml_remplacement SET str_STATUT = ?1, str_MODE = NULL, lg_USER_ID = NULL,"
                + " dt_DECISION = NULL, str_HISTORIQUE = ?2 WHERE lg_ID = ?3").setParameter(1, REMPL_PROPOSE)
                .setParameter(2, historique(id, "Acceptation annulée par " + nomUtilisateur(user))).setParameter(3, id)
                .executeUpdate();
        boolean memorise = !em
                .createNativeQuery("SELECT 1 FROM t_pharmaml_equivalent_choix WHERE lg_FAMILLE_ID = ?1"
                        + " AND str_CODE_REMPLACANT = ?2 AND str_CHOIX = ?3")
                .setParameter(1, origine.getLgFAMILLEID()).setParameter(2, o.getString("codeRemplacant"))
                .setParameter(3, ACCEPTER).getResultList().isEmpty();
        ArchivePharmaMl.journal("SUBSTITUTION", o.getString("grossiste"), "ACCEPTATION ANNULEE",
                "commande " + o.getString("reference") + " | " + origine.getStrNAME()
                        + " retrouve sa place (au lieu de " + o.getString("designationRemplacant") + ") | par "
                        + nomUtilisateur(user));
        return new JSONObject().put("success", true).put("msg",
                "Acceptation annulée : la rupture commandera de nouveau " + origine.getStrNAME()
                        + ". La proposition est de nouveau à décider."
                        + (memorise
                                ? " Attention : ce choix est mémorisé (acceptation automatique) ; retirez-le dans « Choix mémorisés »"
                                        + " pour qu'il ne s'applique plus."
                                : ""));
    }

    /**
     * Retire de la commande un equivalent / remplacant deja livre (EL, RL), avant la reception (pas de bon de
     * livraison). Le montant de la commande est recalcule.
     */
    @Override
    @SuppressWarnings("unchecked")
    public JSONObject retirerSubstitution(String id, TUser user) {
        List<Object[]> r = em.createNativeQuery(SQL_SUBSTITUTIONS + " WHERE r.lg_ID = ?1").setParameter(1, id)
                .getResultList();
        if (r.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Substitution introuvable");
        }
        JSONObject o = ligneSubstitution(r.get(0));
        if (!REMPL_AJOUTE.equals(o.getString("statut"))) {
            return new JSONObject().put("success", false).put("msg",
                    "Seul un produit déjà livré par le grossiste (ajouté à la commande) peut être retiré.");
        }
        if (!o.getBoolean("retirable")) {
            return new JSONObject().put("success", false).put("msg", "Retrait impossible : " + o.getString("raison")
                    + (o.getString("raison").contains("bon de livraison") ? ". Retirez-le à la réception." : "."));
        }
        TOrderDetail d = em.find(TOrderDetail.class, o.getString("ligneCommandeId"));
        TOrder commande = d.getLgORDERID();
        if (commande.getTOrderDetailCollection() != null) {
            commande.getTOrderDetailCollection().remove(d);
        }
        em.remove(d);
        em.flush();
        /* montant d'achat recalcule sur les lignes restantes (comme la liste des commandes) */
        Number montant = (Number) em
                .createNativeQuery("SELECT COALESCE(SUM(int_NUMBER * int_PAF_DETAIL), 0)"
                        + " FROM t_order_detail WHERE lg_ORDER_ID = ?1")
                .setParameter(1, commande.getLgORDERID()).getSingleResult();
        commande.setIntPRICE(montant.intValue());
        commande.setDtUPDATED(new Date());
        em.merge(commande);
        em.createNativeQuery("UPDATE t_pharmaml_remplacement SET str_STATUT = ?1, str_MODE = 'MANUEL', lg_USER_ID = ?2,"
                + " dt_DECISION = NOW(), str_HISTORIQUE = ?3 WHERE lg_ID = ?4").setParameter(1, REMPL_RETIRE)
                .setParameter(2, user == null ? null : user.getLgUSERID())
                .setParameter(3, historique(id, "Retiré de la commande par " + nomUtilisateur(user)))
                .setParameter(4, id).executeUpdate();
        ArchivePharmaMl.journal("SUBSTITUTION", o.getString("grossiste"), "RETIRE DE LA COMMANDE",
                "commande " + o.getString("reference") + " | " + o.getString("designationRemplacant") + " ("
                        + o.getString("codeRemplacant") + ") | par " + nomUtilisateur(user));
        return new JSONObject().put("success", true).put("msg", o.getString("designationRemplacant")
                + " a été retiré de la commande " + o.getString("reference") + ".");
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject choixMemorises() {
        JSONArray a = new JSONArray();
        for (Object[] l : (List<Object[]>) em.createNativeQuery("SELECT c.lg_FAMILLE_ID, c.str_CODE_REMPLACANT,"
                + " c.str_CHOIX, DATE_FORMAT(c.dt_UPDATED, '%d/%m/%Y %H:%i'), IFNULL(f.int_CIP, ''), IFNULL(f.str_NAME, ''),"
                + " IFNULL((SELECT e.str_NAME FROM t_famille e WHERE e.int_CIP = c.str_CODE_REMPLACANT LIMIT 1), ''),"
                + " IFNULL(TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))), '')"
                + " FROM t_pharmaml_equivalent_choix c LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = c.lg_FAMILLE_ID"
                + " LEFT JOIN t_user u ON u.lg_USER_ID = c.lg_USER_ID ORDER BY c.dt_UPDATED DESC").setMaxResults(1000)
                .getResultList()) {
            a.put(new JSONObject().put("familleId", l[0]).put("codeRemplacant", l[1]).put("choix", l[2])
                    .put("date", l[3]).put("cipOrigine", l[4]).put("produitOrigine", l[5])
                    .put("designationRemplacant", l[6]).put("utilisateur", l[7]));
        }
        return new JSONObject().put("success", true).put("data", a).put("total", a.length());
    }

    @Override
    public JSONObject supprimerChoixMemorise(String familleId, String code, TUser user) {
        int n = em
                .createNativeQuery("DELETE FROM t_pharmaml_equivalent_choix WHERE lg_FAMILLE_ID = ?1"
                        + " AND str_CODE_REMPLACANT = ?2")
                .setParameter(1, familleId).setParameter(2, code).executeUpdate();
        if (n > 0) {
            ArchivePharmaMl.journal("SUBSTITUTION", "", "CHOIX MEMORISE SUPPRIME",
                    "produit " + familleId + " | remplacant " + code + " | par " + nomUtilisateur(user));
        }
        return new JSONObject().put("success", n > 0)
                .put("msg", n > 0
                        ? "Choix supprimé : les prochaines propositions de ce couple de produits seront à décider."
                        : "Ce choix n'existe plus.");
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject remplacementsProposes() {
        JSONArray a = new JSONArray();
        for (Object[] l : (List<Object[]>) em
                .createNativeQuery("SELECT r.lg_ID, r.str_TYPE, r.str_CODE_REMPLACANT,"
                        + " r.str_DESIGNATION, r.int_QTE, r.int_PRIX_ACHAT, IFNULL(r.str_REF_CDE, ''), g.str_LIBELLE,"
                        + " f.int_CIP, f.str_NAME, DATE_FORMAT(r.dt_CREATED, '%d/%m/%Y %H:%i'),"
                        + " (SELECT e.str_NAME FROM t_famille e WHERE e.int_CIP = r.str_CODE_REMPLACANT LIMIT 1),"
                        + " (r.lg_RUPTURE_DETAIL_ID IS NOT NULL AND EXISTS (SELECT 1 FROM rupture_detail d"
                        + "   WHERE d.id = r.lg_RUPTURE_DETAIL_ID)),"
                        + " (SELECT d.ruptureId FROM rupture_detail d WHERE d.id = r.lg_RUPTURE_DETAIL_ID)"
                        + " FROM t_pharmaml_remplacement r JOIN t_grossiste g ON g.lg_GROSSISTE_ID = r.lg_GROSSISTE_ID"
                        + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = r.lg_FAMILLE_ID"
                        + " WHERE r.str_STATUT = 'PROPOSE' ORDER BY r.dt_CREATED DESC")
                .setMaxResults(500).getResultList()) {
            String designation = StringUtils.defaultIfBlank((String) l[3], (String) l[11]);
            a.put(new JSONObject().put("id", l[0]).put("type", l[1]).put("codeRemplacant", l[2])
                    .put("designationRemplacant", StringUtils.defaultString(designation)).put("connu", l[11] != null)
                    .put("qte", l[4]).put("prixAchat", l[5]).put("reference", l[6]).put("grossiste", l[7])
                    .put("cipOrigine", StringUtils.defaultString((String) l[8]))
                    .put("produitOrigine", StringUtils.defaultString((String) l[9])).put("date", l[10])
                    .put("ruptureOuverte", l[12] != null && ((Number) l[12]).intValue() == 1)
                    /* retours du 08/10 (4) : rupture de rattachement (filtre par la ligne choisie en haut) */
                    .put("ruptureId", l[13] == null ? "" : l[13]));
        }
        return new JSONObject().put("success", true).put("data", a).put("total", a.length());
    }

    /**
     * Retours du 08/10 : reponse du grossiste lisible a l'ecran pour une commande (ou la commande liee d'une
     * suggestion) : derniere reponse recue, une ligne par produit (commande / livre / prix / motif / remplacant).
     */
    @Override
    @SuppressWarnings("unchecked")
    public JSONObject reponseGrossiste(String commandeId) {
        JSONObject r = new JSONObject().put("success", true);
        JSONArray a = new JSONArray();
        if (StringUtils.isBlank(commandeId)) {
            return r.put("data", a).put("total", 0);
        }
        String[] envoi = StatutEnvoiPharmaMl.dernierEnvoi(em, commandeId);
        if (envoi != null) {
            r.put("statut", envoi[0]).put("dateEnvoi", envoi[1]).put("resume", envoi[2]);
        }
        List<Object[]> lignes = em.createNativeQuery("SELECT l.str_CODE_PRODUIT, f.str_NAME, l.int_QTE_COMMANDEE,"
                + " l.int_QTE_LIVREE, l.int_PRIX_ACHAT, l.int_PRIX_VENTE, l.str_CODE_REPONSE, l.str_MOTIF,"
                + " l.str_REMPLACANT, DATE_FORMAT(l.dt_REPONSE, '%d/%m/%Y %H:%i'), g.str_LIBELLE"
                + " FROM t_pharmaml_reponse_ligne l JOIN t_grossiste g ON g.lg_GROSSISTE_ID = l.lg_GROSSISTE_ID"
                + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = l.lg_FAMILLE_ID"
                + " WHERE (l.lg_SOURCE_ID = ?1 OR l.lg_ORDER_ID = ?1) AND l.dt_REPONSE = (SELECT MAX(x.dt_REPONSE)"
                + "   FROM t_pharmaml_reponse_ligne x WHERE x.lg_SOURCE_ID = ?1 OR x.lg_ORDER_ID = ?1)"
                + " ORDER BY (l.int_QTE_LIVREE >= l.int_QTE_COMMANDEE), f.str_NAME").setParameter(1, commandeId)
                .setMaxResults(1000).getResultList();
        int livrees = 0;
        for (Object[] l : lignes) {
            int cde = ((Number) l[2]).intValue(), liv = ((Number) l[3]).intValue();
            if (liv > 0) {
                livrees++;
            }
            a.put(new JSONObject().put("code", StringUtils.defaultString((String) l[0]))
                    .put("produit", StringUtils.defaultString((String) l[1])).put("qteCommandee", cde)
                    .put("qteLivree", liv).put("prixAchat", l[4] == null ? JSONObject.NULL : l[4])
                    .put("prixVente", l[5] == null ? JSONObject.NULL : l[5])
                    .put("etat", liv >= cde ? "LIVRE" : liv > 0 ? "PARTIEL" : "RUPTURE")
                    .put("codeReponse", StringUtils.defaultString((String) l[6]))
                    .put("motif", StringUtils.defaultString((String) l[7]))
                    .put("remplacant", StringUtils.defaultString((String) l[8])).put("date", l[9])
                    .put("grossiste", l[10]));
        }
        return r.put("data", a).put("total", a.length()).put("livrees", livrees);
    }

    @Override
    public JSONObject deciderRemplacement(String id, boolean accepter, boolean memoriser, TUser user) {
        return deciderRemplacement(id, accepter, memoriser, user, "MANUEL");
    }

    @SuppressWarnings("unchecked")
    private JSONObject deciderRemplacement(String id, boolean accepter, boolean memoriser, TUser user, String mode) {
        List<Object[]> r = em.createNativeQuery("SELECT lg_FAMILLE_ID, lg_RUPTURE_DETAIL_ID, str_CODE_REMPLACANT,"
                + " str_TYPE_CODIFICATION, str_DESIGNATION, int_PRIX_ACHAT, int_PRIX_VENTE, lg_GROSSISTE_ID, str_STATUT"
                + " FROM t_pharmaml_remplacement WHERE lg_ID = ?1").setParameter(1, id).getResultList();
        if (r.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Proposition introuvable");
        }
        Object[] l = r.get(0);
        if (!REMPL_PROPOSE.equals(l[8])) {
            return new JSONObject().put("success", false).put("msg", "Cette proposition a déjà été traitée");
        }
        String familleOrigine = (String) l[0], code = (String) l[2];
        String nomEquivalent = null;
        if (accepter) {
            RuptureDetail ligne = l[1] == null ? null : em.find(RuptureDetail.class, (String) l[1]);
            if (ligne == null) {
                return new JSONObject().put("success", false).put("msg", "La rupture de ce produit n'existe plus"
                        + " (déjà renvoyée ou supprimée) : l'équivalent ne peut plus y être placé.");
            }
            TGrossiste g = em.find(TGrossiste.class, (String) l[7]);
            TFamille equivalent = findTFamilleByCodeCipOrEan(code);
            CreationProduitDTO c = creationDepuisRemplacement(code, (String) l[3], (String) l[4],
                    ((Number) l[5]).intValue(), ((Number) l[6]).intValue());
            if (equivalent == null) {
                equivalent = createTFamille(c, g);
            } else if (findTFamilleGrossisteByCodeCipOrEanOrProduitCode(code, g.getLgGROSSISTEID()) == null) {
                produitService.createTFamilleGrossisteFromRupture(c, equivalent, g);
            }
            ligne.setProduit(equivalent);
            ligne.setPrixAchat(equivalent.getIntPAF());
            ligne.setPrixVente(equivalent.getIntPRICE());
            em.merge(ligne);
            nomEquivalent = equivalent.getStrNAME();
        }
        em.createNativeQuery("UPDATE t_pharmaml_remplacement SET str_STATUT = ?1, str_MODE = ?2, lg_USER_ID = ?3,"
                + " dt_DECISION = NOW(), str_HISTORIQUE = ?5 WHERE lg_ID = ?4")
                .setParameter(1, accepter ? REMPL_ACCEPTE : REMPL_REFUSE).setParameter(2, mode)
                .setParameter(3, user == null ? null : user.getLgUSERID()).setParameter(4, id)
                .setParameter(5, historique(id, (accepter ? "Acceptée" : "Refusée")
                        + ("AUTO".equals(mode) ? " automatiquement (choix mémorisé)" : " par " + nomUtilisateur(user))))
                .executeUpdate();
        if (memoriser) {
            em.createNativeQuery("INSERT INTO t_pharmaml_equivalent_choix (lg_FAMILLE_ID, str_CODE_REMPLACANT,"
                    + " str_CHOIX, lg_USER_ID, dt_UPDATED) VALUES (?1, ?2, ?3, ?4, NOW()) ON DUPLICATE KEY UPDATE"
                    + " str_CHOIX = VALUES(str_CHOIX), lg_USER_ID = VALUES(lg_USER_ID), dt_UPDATED = NOW()")
                    .setParameter(1, familleOrigine).setParameter(2, code)
                    .setParameter(3, accepter ? ACCEPTER : REFUSER)
                    .setParameter(4, user == null ? null : user.getLgUSERID()).executeUpdate();
        }
        return new JSONObject().put("success", true).put("statut", accepter ? REMPL_ACCEPTE : REMPL_REFUSE).put("msg",
                accepter ? "Équivalent accepté : la rupture commandera " + nomEquivalent + "."
                        + ("AUTO".equals(mode) ? ""
                                : " Annulable dans l'onglet « Substitutions » tant que la rupture n'est pas renvoyée.")
                        : "Équivalent refusé : la rupture garde le produit d'origine.");
    }

    private CreationProduitDTO creationDepuisRemplacement(String code, String codification, String designation,
            int prixAchat, int prixVente) {
        CreationProduitDTO c = new CreationProduitDTO();
        c.setStrName(StringUtils.defaultIfBlank(designation, code));
        c.setIntPrice(prixVente);
        c.setIntPaf(prixAchat);
        c.setIntPat(prixAchat);
        c.setIntPriceTips(prixVente);
        c.setIntT("");
        if (TYPE_CODIFICATION_EAN.equalsIgnoreCase(codification)) {
            c.setIntEan13(code);
        } else {
            c.setIntCip(code);
        }
        c.setLgFamilleArticleId("1010");
        c.setStrCodeRemise("0");
        c.setStrCodeTauxRemboursement("0");
        c.setLgZoneGeoId("1");
        c.setSeuilMax(1);
        c.setBoolDeconditionne((short) 0);
        c.setLgTypeEtiquetteId("2");
        c.setLgCodeTvaId("1");
        return c;
    }

    private void processOnderDetailResponce(TOrderDetail o, LigneNReponse ligneNReponse) {
        Pair<Integer, Integer> prix = getPrixAchatPrixUni(ligneNReponse.getPrix());

        o.setIntQTEREPGROSSISTE(ligneNReponse.getQuantiteLivree());

        o.setIntQTEMANQUANT(ligneNReponse.getQuantiteLivree());
        o.setIntNUMBER(ligneNReponse.getQuantiteLivree());

        if (prix.getLeft() != null && prix.getLeft() > 0) {
            o.setPrixAchat(prix.getLeft());
            o.setIntPAFDETAIL(prix.getLeft());
        } else {
            o.setPrixAchat(o.getIntPAFDETAIL());
        }
        /*
         * retours du 08/10 : prix de vente (PUBTC) absent de la reponse (ex. DPCI, AFTAGEL : PHAHT et NETHT seulement)
         * -> on garde le prix de vente de la ligne (ou de la fiche) au lieu de le mettre a 0
         */
        Integer pv = prix.getRight();
        if (pv == null || pv <= 0) {
            pv = o.getIntPRICEDETAIL() != null && o.getIntPRICEDETAIL() > 0 ? o.getIntPRICEDETAIL()
                    : (o.getLgFAMILLEID() != null && o.getLgFAMILLEID().getIntPRICE() != null
                            ? o.getLgFAMILLEID().getIntPRICE() : 0);
        }
        o.setPrixUnitaire(pv);
        o.setIntPRICE(o.getIntNUMBER() * o.getPrixAchat());
        o.setIntPRICEDETAIL(o.getPrixUnitaire());
        o.setDtUPDATED(new Date());
        em.merge(o);

    }

    private void createOnderDetailFromResponce(RuptureDetail ruptureDetail, LigneNReponse ligneNReponse, TOrder order) {
        Pair<Integer, Integer> prix = getPrixAchatPrixUni(ligneNReponse.getPrix());

        TFamille famille = ruptureDetail.getProduit();

        TOrderDetail orderDetail = new TOrderDetail();
        orderDetail.setLgORDERDETAILID(new KeyUtilGen().getComplexId());

        orderDetail.setIntNUMBER(ligneNReponse.getQuantiteLivree());
        orderDetail.setIntQTEREPGROSSISTE(orderDetail.getIntNUMBER());
        orderDetail.setIntQTEMANQUANT(orderDetail.getIntNUMBER());
        orderDetail.setLgFAMILLEID(famille);
        orderDetail.setStrSTATUT(Constant.STATUT_IS_PROGRESS);
        if (prix.getLeft() != null && prix.getLeft() > 0) {
            orderDetail.setPrixAchat(prix.getLeft());
            orderDetail.setIntPAFDETAIL(prix.getLeft());
        } else {
            orderDetail.setPrixAchat(orderDetail.getIntPAFDETAIL());
        }
        /* PUBTC absent de la reponse : prix de vente de la fiche (retours du 08/10) */
        orderDetail.setPrixUnitaire(prix.getRight() != null && prix.getRight() > 0 ? prix.getRight()
                : (famille.getIntPRICE() == null ? 0 : famille.getIntPRICE()));
        orderDetail.setIntPRICE(orderDetail.getIntNUMBER() * orderDetail.getPrixAchat());
        orderDetail.setIntPRICEDETAIL(orderDetail.getPrixUnitaire());
        orderDetail.setDtUPDATED(new Date());
        orderDetail.setDtCREATED(orderDetail.getDtCREATED());
        orderDetail.setLgORDERID(order);
        orderDetail.setLgGROSSISTEID(order.getLgGROSSISTEID());
        em.persist(orderDetail);

    }

    private JSONObject traiterCommandeRepondue(Rupture rupture, List<RuptureDetail> items, TGrossiste grossiste,
            CsrpEnveloppeResponse response) {

        String idGrossiste = grossiste.getLgGROSSISTEID();
        AtomicInteger countRupture = new AtomicInteger(0);
        AtomicInteger ruptureComplet = new AtomicInteger(0);
        AtomicInteger prisEncompte = new AtomicInteger(0);
        Map<RuptureDetail, Pair<TFamille, LigneNReponse>> lignesRupture = new HashedMap<>();
        List<LigneNReponse> lignes = getLigneNReponses(response);

        int itemSize = items.size();
        int montantCommande = 0;
        TOrder order = null;
        if (CollectionUtils.isNotEmpty(lignes)) {
            order = orderService.createOrder(grossiste, sessionHelperService.getCurrentUser());
            em.persist(order);
        }
        for (LigneNReponse ligneNReponse : lignes) {
            Pair<TFamille, RuptureDetail> produitCommandeItem = searchCoupleFamilleRuptureDetailByLigneNReponse(items,
                    ligneNReponse, idGrossiste);
            int qteLivre = ligneNReponse.getQuantiteLivree();
            RuptureDetail ruptureDetail = produitCommandeItem.getRight();
            noterLigneReponse(grossiste, "RUPTURE", rupture.getId(), order, produitCommandeItem.getLeft(),
                    ruptureDetail.getQty(), ligneNReponse);

            if (qteLivre >= ruptureDetail.getQty()) {
                prisEncompte.incrementAndGet();
                createOnderDetailFromResponce(ruptureDetail, ligneNReponse, order);

                montantCommande += computeOrderAmount(ligneNReponse);
            } else {
                if (qteLivre > 0 && qteLivre < ruptureDetail.getQty()) {

                    prisEncompte.incrementAndGet();
                    createOnderDetailFromResponce(ruptureDetail, ligneNReponse, order);
                    montantCommande += computeOrderAmount(ligneNReponse);
                } else {
                    ruptureComplet.incrementAndGet();
                }
                countRupture.incrementAndGet();

                lignesRupture.put(ruptureDetail, Pair.of(produitCommandeItem.getLeft(), ligneNReponse));

            }
            items.remove(ruptureDetail);
        }
        // la commande est en rupture totale

        if (Objects.nonNull(order) && countRupture.get() > 0) {

            createRupture(lignesRupture, rupture, order);
        }
        if (Objects.nonNull(order) && prisEncompte.get() > 0) {
            order.setIntPRICE(montantCommande);
            em.merge(order);
        }
        if (itemSize == ruptureComplet.get()) {
            em.remove(rupture);
        }
        // update commande montant
        return new JSONObject().put("success", true).put("totalProduit", itemSize)
                .put("nbreproduit", prisEncompte.get()).put("nbrerupture", countRupture.get());

    }

    private JSONObject traiterCommandeRepondue(TOrder order, CsrpEnveloppeResponse response) {

        TGrossiste grossiste = order.getLgGROSSISTEID();
        String idGrossiste = grossiste.getLgGROSSISTEID();
        AtomicInteger countRupture = new AtomicInteger(0);
        AtomicInteger ruptureComplet = new AtomicInteger(0);
        AtomicInteger prisEncompte = new AtomicInteger(0);
        Map<TOrderDetail, Pair<TFamille, LigneNReponse>> lignesRupture = new HashedMap<>();
        List<LigneNReponse> lignes = getLigneNReponses(response);
        List<TOrderDetail> items = new ArrayList<>(order.getTOrderDetailCollection());

        int itemSize = items.size();
        int montantCommande = 0;
        // si tout les produit sont zero surprime la commande
        for (LigneNReponse ligneNReponse : lignes) {
            Pair<TFamille, TOrderDetail> produitCommandeItem = searchCoupleFamilleOrderDetailByLigneNReponse(items,
                    ligneNReponse, idGrossiste);
            int qteLivre = ligneNReponse.getQuantiteLivree();
            TOrderDetail orderDetail = produitCommandeItem.getRight();
            noterLigneReponse(grossiste, "COMMANDE", order.getLgORDERID(), order, produitCommandeItem.getLeft(),
                    orderDetail.getIntNUMBER(), ligneNReponse);

            if (qteLivre >= orderDetail.getIntNUMBER()) {
                prisEncompte.incrementAndGet();
                processOnderDetailResponce(orderDetail, ligneNReponse);
                montantCommande += computeOrderAmount(ligneNReponse);
            } else {
                if (qteLivre > 0 && qteLivre < orderDetail.getIntNUMBER()) {

                    prisEncompte.incrementAndGet();
                    processOnderDetailResponce(orderDetail, ligneNReponse);
                    montantCommande += computeOrderAmount(ligneNReponse);
                } else {
                    ruptureComplet.incrementAndGet();
                }
                countRupture.incrementAndGet();

                lignesRupture.put(orderDetail, Pair.of(produitCommandeItem.getLeft(), ligneNReponse));

            }
            items.remove(orderDetail);
        }
        // la commande est en rupture totale

        if (countRupture.get() > 0) {
            createRupture(lignesRupture, order, grossiste);
        }
        if (prisEncompte.get() > 0) {
            order.setIntPRICE(montantCommande);
            order.setDtUPDATED(new Date());
            em.merge(order);
        }
        if (itemSize == ruptureComplet.get()) {
            em.remove(order);
        }
        // update commande montant
        return new JSONObject().put("success", true).put("totalProduit", itemSize)
                .put("nbreproduit", prisEncompte.get()).put("nbrerupture", countRupture.get());

    }

    /**
     * Retours du 08/10 : motif d'indisponibilite lisible (Additif, sinon code reponse), plus le remplacant annonce.
     */
    static String motifIndisponibilite(LigneNReponse ligne) {
        IndisponibiliteN indispo = ligne == null ? null : ligne.getIndisponibilite();
        if (indispo == null) {
            return null;
        }
        /* retours du 08/10 (4) : sans texte du grossiste, libelle du code (tableau 9 de la specification) */
        return StringUtils.abbreviate(CodeReponsePharmaMl.motif(indispo.getCodeReponse(), indispo.getAdditif()), 255);
    }

    static String remplacant(LigneNReponse ligne) {
        IndisponibiliteN indispo = ligne == null ? null : ligne.getIndisponibilite();
        ProduitRemplacant r = indispo == null ? null : indispo.getProduitRemplacant();
        if (r == null || StringUtils.isBlank(r.getCodeProduit())) {
            return null;
        }
        return StringUtils.abbreviate(StringUtils.trimToEmpty(r.getTypeRemplacement()) + " " + r.getCodeProduit().trim()
                + " " + StringUtils.trimToEmpty(r.getDesignation()), 200).trim();
    }

    /**
     * Retours du 08/10 : chaque ligne de la reponse du grossiste est gardee pour etre lue a l'ecran (commandes en
     * cours, suggestions) sans ouvrir le fichier XML. Une erreur ici n'empeche jamais le traitement de la reponse.
     */
    private void noterLigneReponse(TGrossiste grossiste, String source, String sourceId, TOrder order, TFamille famille,
            int qteCommandee, LigneNReponse ligne) {
        try {
            Pair<Integer, Integer> prix = getPrixAchatPrixUni(ligne.getPrix());
            em.createNativeQuery(
                    "INSERT INTO t_pharmaml_reponse_ligne (lg_ID, lg_GROSSISTE_ID, str_SOURCE, lg_SOURCE_ID,"
                            + " lg_ORDER_ID, lg_FAMILLE_ID, str_CODE_PRODUIT, int_QTE_COMMANDEE, int_QTE_LIVREE, int_PRIX_ACHAT,"
                            + " int_PRIX_VENTE, str_CODE_REPONSE, str_MOTIF, str_REMPLACANT, dt_REPONSE)"
                            + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, NOW())")
                    .setParameter(1, UUID.randomUUID().toString()).setParameter(2, grossiste.getLgGROSSISTEID())
                    .setParameter(3, source).setParameter(4, sourceId)
                    .setParameter(5, order == null ? null : order.getLgORDERID())
                    .setParameter(6, famille == null ? null : famille.getLgFAMILLEID())
                    .setParameter(7, StringUtils.abbreviate(StringUtils.trimToEmpty(ligne.getCodeProduit()), 20))
                    .setParameter(8, qteCommandee).setParameter(9, ligne.getQuantiteLivree())
                    .setParameter(10, prix.getLeft()).setParameter(11, prix.getRight())
                    .setParameter(12,
                            ligne.getIndisponibilite() == null ? null
                                    : StringUtils.abbreviate(
                                            StringUtils.trimToNull(ligne.getIndisponibilite().getCodeReponse()), 10))
                    .setParameter(13, motifIndisponibilite(ligne)).setParameter(14, remplacant(ligne)).executeUpdate();
        } catch (RuntimeException ex) {
            LOG.log(Level.WARNING, "ligne de reponse PharmaML non conservee : {0}", ex.getMessage());
        }
    }

    private int computeOrderAmount(LigneNReponse ligneNReponse) {
        return ligneNReponse.getQuantiteLivree() * getPrixAchatPrixUni(ligneNReponse.getPrix()).getLeft();
    }

    /** Delai de connexion au serveur du grossiste : au-dela, message clair au lieu d'un blocage de 20 a 30 s. */
    static final Duration DELAI_CONNEXION = Duration.ofSeconds(15);
    /** Delai de reponse a une commande (le grossiste traite toutes les lignes avant de repondre). */
    static final Duration DELAI_REPONSE = Duration.ofSeconds(120);

    private HttpClient getHttpClient() {
        return HttpClient.newBuilder().connectTimeout(DELAI_CONNEXION).build();
    }

    /** Message lisible quand le serveur du grossiste n'est pas joignable (rien n'a ete envoye ou recu). */
    String messageReseau(TGrossiste grossiste, Throwable ex) {
        String secours = urlSecours(grossiste.getLgGROSSISTEID());
        String nom = StringUtils.trimToEmpty(grossiste.getStrLIBELLE());
        String url = StringUtils.trimToEmpty(grossiste.getStrURLPHARMAML());
        if (ex instanceof java.net.http.HttpTimeoutException
                && !(ex instanceof java.net.http.HttpConnectTimeoutException)) {
            return "Le serveur PharmaML de " + nom + " n'a pas répondu à temps (" + DELAI_REPONSE.getSeconds()
                    + " s). La commande a pu être reçue : vérifiez auprès du grossiste avant de la renvoyer.";
        }
        String cause = adresseIntrouvable(ex) ? "adresse introuvable" : "connexion impossible";
        return "Le serveur PharmaML de " + nom + " ne répond pas (" + cause + " : " + url
                + (StringUtils.isBlank(secours) || secours.trim().equals(url) ? ""
                        : ", adresse de secours " + secours.trim() + " également injoignable")
                + "). La commande n'a pas été envoyée. Vérifiez l'adresse PharmaML du grossiste et l'accès internet du serveur.";
    }

    static boolean adresseIntrouvable(Throwable ex) {
        for (Throwable c = ex; c != null; c = c.getCause() == c ? null : c.getCause()) {
            if (c instanceof java.net.UnknownHostException
                    || c instanceof java.nio.channels.UnresolvedAddressException) {
                return true;
            }
        }
        return false;
    }

    /** Erreur de transport (connexion, delai, adresse) : distincte d'une erreur de traitement. */
    static boolean erreurReseau(Throwable ex) {
        for (Throwable c = ex; c != null; c = c.getCause() == c ? null : c.getCause()) {
            if (c instanceof java.net.ConnectException || c instanceof java.net.http.HttpTimeoutException
                    || c instanceof java.net.UnknownHostException || c instanceof java.net.NoRouteToHostException
                    || c instanceof java.nio.channels.UnresolvedAddressException) {
                return true;
            }
        }
        return false;
    }

    /**
     * Ref_Cde_Client stable (CSRP 4.8 : NMTOKEN, 20 caracteres au plus). Sans horodatage : un renvoi du meme document
     * porte la meme reference et le grossiste reconnait le doublon. Le suffixe (renvoi de rupture) distingue deux
     * documents differents tires de la meme commande ; il est garde en entier, la base est raccourcie si besoin.
     */
    static String refCdeClient(String base, String suffixe) {
        String b = StringUtils.defaultString(base).replaceAll("[^A-Za-z0-9._:-]", "");
        String s = StringUtils.defaultString(suffixe).replaceAll("[^A-Za-z0-9._:-]", "");
        s = StringUtils.left(s, 6);
        String r = StringUtils.left(b, 20 - s.length()) + s;
        return r.isEmpty() ? "CDE" : r;
    }

    private CsrpEnveloppe buildPayload(TGrossiste grossiste, TOfficine of, Normale normale, String commentaire,
            String refCdeClient) {
        // Normale n = buildNormale(order, idGrossiste);
        Commande c = buildCommande(normale, refCdeClient, commentaire);
        MessageCorps messageCorps = buildMessageCorps(c);
        MessageOfficine messageOfficine = buildMessageOfficine(grossiste, messageCorps);
        Corps corps = buildCorps(messageOfficine);
        CsrpEnveloppe ce = new CsrpEnveloppe();
        ce.setUsage(PharmaMlUtils.USAGE_VALUE);
        ce.setVersionProtocole(PharmaMlUtils.VERSION_PROTOCLE_VALUE);
        ce.setVersionLogiciel(PharmaMlUtils.VERSION_LOGICIEL_VALUE);
        ce.setIdLogiciel(PharmaMlUtils.ID_LOGICIEL_VALUE);
        ce.setEntete(buildEntete(grossiste, of));
        ce.setCorps(corps);
        ce.setNatureAction(PharmaMlUtils.NATURE_ACTION_REQ_EMISSION);
        return ce;

    }

    private String getDate() {
        return LocalDate.now() + "T" + LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));

    }

    private Entete buildEntete(TGrossiste grossiste, TOfficine of) {
        Entete e = new Entete();
        e.setDate(getDate());
        e.setRefMessage(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
        e.setEmetteur(buildEmetteur(grossiste, of));
        e.setRecepteur(buildRecepteur(grossiste));
        return e;

    }

    private Partenaire buildEmetteur(TGrossiste grossiste, TOfficine of) {
        String code = StringUtils.isNotEmpty(grossiste.getStrOFFICINEID()) ? grossiste.getStrOFFICINEID()
                : PharmaMlUtils.CODE_VALUE;
        Partenaire p = new Partenaire();
        p.setNature(PharmaMlUtils.NATURE_PARTENAIRE_VALUE_OF);
        p.setCode(code);
        p.setAdresse(of.getStrNOMCOMPLET());
        p.setId(grossiste.getStrIDRECEPTEURPHARMA());
        return p;
    }

    private Partenaire buildRecepteur(TGrossiste grossiste) {

        Partenaire p = new Partenaire();
        p.setNature(PharmaMlUtils.NATURE_PARTENAIRE_VALUE_RE);
        p.setCode(grossiste.getStrCODERECEPTEURPHARMA());
        p.setAdresse(grossiste.getStrLIBELLE());

        p.setId(grossiste.getIdRepartiteur());
        return p;
    }

    private MessageEntete buildMessageEntete(TGrossiste grossiste) {
        MessageEntete me = new MessageEntete();
        me.setEmetteur(buildOfficineEmetteur(grossiste));
        me.setDestinataire(buildOfficineDestinataire(grossiste));
        me.setDate(getDate());
        return me;
    }

    private OfficinePartenaire buildOfficineDestinataire(TGrossiste grossiste) {
        OfficinePartenaire op = new OfficinePartenaire();
        op.setIdSociete(grossiste.getIdRepartiteur());
        op.setCodeSociete(grossiste.getStrCODERECEPTEURPHARMA());
        op.setNaturePartenaire(PharmaMlUtils.NATURE_PARTENAIRE_VALUE_RE);
        return op;
    }

    private OfficinePartenaire buildOfficineEmetteur(TGrossiste grossiste) {
        OfficinePartenaire op = new OfficinePartenaire();
        op.setIdClient(grossiste.getStrIDRECEPTEURPHARMA());
        op.setNaturePartenaire(NATURE_PARTENAIRE_VALUE_OF);
        return op;
    }

    private MessageCorps buildMessageCorps(Commande c/* , String commentaire, String idGrossiste */) {
        MessageCorps mc = new MessageCorps();
        // mc.setCommande(buildCommande(order, commentaire, idGrossiste));
        mc.setCommande(c);
        return mc;
    }
    // refCdeClient
    // n buildNormale(order, idGrossiste)

    private Commande buildCommande(Normale n, String refCdeClient, String commentaire) {
        Commande c = new Commande();
        c.setDateLivraison(LocalDate.now().plusDays(1).toString());
        c.setCommentaireGeneral(commentaire);
        c.setRefCdeClient(refCdeClient);
        c.setNormale(n);
        return c;
    }

    private List<LigneN> buildCommandeLigne(TOrder order, String grossisteId) {
        AtomicInteger count = new AtomicInteger(1);
        return new ArrayList<>(order.getTOrderDetailCollection()).stream().map(item -> {
            TFamille famille = item.getLgFAMILLEID();
            TFamilleGrossiste familleGrossiste = orderService
                    .finFamilleGrossisteByFamilleCipAndIdGrossiste(famille.getIntCIP(), grossisteId);
            return buildLigne(famille, familleGrossiste, item.getIntNUMBER(), count.getAndIncrement());

        }).collect(Collectors.toList());
    }

    private LigneN buildLigne(TFamille famille, TFamilleGrossiste familleGrossiste, int qty, int count) {
        LigneN ligne = new LigneN();

        String numLigne = StringUtils.leftPad(count + "", 4, '0');
        String quantite = StringUtils.leftPad(qty + "", 4, '0');
        String cip = null;
        if (familleGrossiste != null && StringUtils.isEmpty(familleGrossiste.getStrCODEARTICLE())) {
            cip = familleGrossiste.getStrCODEARTICLE();
        }
        if (StringUtils.isEmpty(cip)) {
            cip = famille.getIntCIP();
        }
        ligne.setCodeProduit(cip);
        ligne.setQuantite(quantite);
        ligne.setNumLigne(numLigne);
        ligne.setTypeCodification(typeCodification(cip));
        return ligne;
    }

    private List<LigneN> buildCommandeLigne(List<RuptureDetail> ruptureDetails, String grossisteId) {
        AtomicInteger count = new AtomicInteger(1);
        return ruptureDetails.stream().map(item -> {
            TFamille famille = item.getProduit();
            TFamilleGrossiste familleGrossiste = orderService
                    .finFamilleGrossisteByFamilleCipAndIdGrossiste(famille.getIntCIP(), grossisteId);
            return buildLigne(famille, familleGrossiste, item.getQty(), count.getAndIncrement());

        }).collect(Collectors.toList());
    }

    private String typeCodification(String cip) {
        if (cip.length() == 13) {
            return TYPE_CODIFICATION_EAN;
        }
        return TYPE_CODIFICATION_CIP39;
    }

    private Normale buildNormale(TOrder order, String grossisteId) {
        Normale n = new Normale();
        n.setLignes(buildCommandeLigne(order, grossisteId));
        return n;
    }

    private Normale buildFromRupture(List<RuptureDetail> ruptureDetails, String grossisteId) {
        Normale n = new Normale();
        n.setLignes(buildCommandeLigne(ruptureDetails, grossisteId));
        return n;
    }
    // messageOfficine buildMessageOfficine( TGrossiste grossiste, MessageCorps messageCorps)

    private Corps buildCorps(MessageOfficine messageOfficine) {

        Corps c = new Corps();
        c.setMessageOfficine(messageOfficine);

        return c;
    }
    // messageCorps buildMessageCorps(c)

    private MessageOfficine buildMessageOfficine(TGrossiste grossiste, MessageCorps messageCorps) {
        // Commande c = buildCommande( Normale n,String refCdeClient, String commentaire);
        MessageOfficine messageOfficine = new MessageOfficine();
        messageOfficine.setEntete(buildMessageEntete(grossiste));
        messageOfficine.setCorps(messageCorps);
        return messageOfficine;
    }

    private void createSaveXmlFile(Marshaller marshaller, Object objectToSave, String prefix, String fileName) {
        try {
            StringWriter w = new StringWriter();
            marshaller.marshal(objectToSave, w);
            ArchivePharmaMl.ecrire(prefix.toUpperCase() + "_" + fileName, w.toString());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

    }

    private String versionCommande(TGrossiste grossiste) {
        try {
            List<?> r = em
                    .createNativeQuery("SELECT str_PHARMAML_VERSION_CMDE FROM t_grossiste WHERE lg_GROSSISTE_ID = ?1")
                    .setParameter(1, grossiste.getLgGROSSISTEID()).getResultList();
            return PharmaMlMessages.version(r.isEmpty() ? null : (String) r.get(0));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "version PharmaML du grossiste : 1.0.0.0 par defaut", e);
            return PharmaMlMessages.V1;
        }
    }

    private CsrpEnveloppeResponse envoyerCommande(CsrpEnveloppe payLoad, String reference, TGrossiste grossiste,
            String version) throws IOException, InterruptedException {
        Entete en = payLoad.getEntete();
        PharmaMlMessages.Partenaires p = new PharmaMlMessages.Partenaires();
        p.codeOfficine = StringUtils.defaultString(en.getEmetteur().getCode());
        p.idOfficine = StringUtils.defaultString(en.getEmetteur().getId());
        p.nomOfficine = StringUtils.defaultString(en.getEmetteur().getAdresse());
        p.codeRepartiteur = StringUtils.defaultString(en.getRecepteur().getCode());
        p.idRepartiteur = StringUtils.defaultString(en.getRecepteur().getId());
        p.nomRepartiteur = StringUtils.defaultString(en.getRecepteur().getAdresse());
        p.date = en.getDate();
        Commande c = payLoad.getCorps().getMessageOfficine().getCorps().getCommande();
        List<PharmaMlMessages.Ligne> lignes = new ArrayList<>();
        for (LigneN l : c.getNormale().getLignes()) {
            lignes.add(new PharmaMlMessages.Ligne(l.getCodeProduit(), "", Integer.parseInt(l.getQuantite())));
        }
        String xml = PharmaMlMessages.commande(version, p, en.getRefMessage(), c.getRefCdeClient(),
                c.getCommentaireGeneral(), c.getDateLivraison(), lignes);
        String fileName = reference + "_"
                + StringUtils.replace(grossiste.getStrLIBELLE(), StringUtils.SPACE, StringUtils.EMPTY);
        String archiveC = ecrireArchive("C_" + fileName, xml);
        ArchivePharmaMl.journal("COMMANDE", grossiste.getStrLIBELLE(), "ENVOI",
                "message " + en.getRefMessage() + " | commande " + c.getRefCdeClient() + " | " + lignes.size()
                        + " ligne(s) | version " + version + " | archive "
                        + StringUtils.defaultString(archiveC, "(non archivee)"));
        HttpResponse<String> httpResponse = EnvoiPharmaMl.envoyer(adresses(grossiste), xml,
                grossiste.getStrIDRECEPTEURPHARMA(), grossiste.getStrCLERECEPTEUR(), modeControle(grossiste),
                DELAI_CONNEXION, DELAI_REPONSE).reponse;
        if (httpResponse.statusCode() != 200) {
            saveResponse(httpResponse.body(), "LOG_" + fileName);
            throw new RefusHttp(httpResponse.statusCode(), "R_LOG_" + fileName);
        }
        String archiveR = ecrireArchive("R_" + fileName, PharmaMlMessages.indenter(httpResponse.body()));
        ArchivePharmaMl.journal("COMMANDE", grossiste.getStrLIBELLE(), "REPONSE RECUE", "message " + en.getRefMessage()
                + " | archive " + StringUtils.defaultString(archiveR, "(non archivee)"));
        String erreur = PharmaMlMessages.erreurReponse(httpResponse.body());
        if (erreur != null) {
            throw new RefusGrossiste(erreur, "R_" + fileName, version);
        }
        PharmaMlMessages.Enveloppe env = PharmaMlMessages.lireEnveloppe(httpResponse.body());
        if (!env.repCommande && "FIN_SERVICE".equals(env.action)) {
            /* specification v4.8 § 4.1.2 : commande recue, reponse a recuperer plus tard par une demande de vidage */
            throw new EnAttente(en.getRefMessage(), c.getRefCdeClient(), version);
        }
        try {
            String corps = PharmaMlMessages.V3.equals(version) ? PharmaMlMessages.reponseV3VersV1(httpResponse.body())
                    : httpResponse.body();
            return (CsrpEnveloppeResponse) JAXBContext.newInstance(CsrpEnveloppeResponse.class).createUnmarshaller()
                    .unmarshal(new StringReader(corps));
        } catch (JAXBException ex) {
            LOG.log(Level.SEVERE, "reponse de commande PharmaML " + version + " illisible", ex);
            return null;
        }
    }

    /** Retours du 08/10 (5) : rangement par type et par mois (ArchivePharmaMl) ; renvoie le chemin relatif. */
    private String ecrireArchive(String nom, String contenu) {
        return ArchivePharmaMl.ecrire(nom, contenu);
    }

    private void saveResponse(String response, String fileName) {
        ArchivePharmaMl.ecrire("R_" + fileName, response);
    }

    private CsrpEnveloppeResponse loadFromFileForTestingPurpose() {
        try {
            Path path = Paths.get(ap.pharmaMlDir + File.separator + "R_15062025_00001_UBIPHARMYOP.xml");
            JAXBContext jaxbContext = JAXBContext.newInstance(CsrpEnveloppeResponse.class);
            Unmarshaller unmarshaller = jaxbContext.createUnmarshaller();
            return (CsrpEnveloppeResponse) unmarshaller.unmarshal(path.toFile());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tes", e);
        }
        return null;

    }

    private TOfficine getOfficine() {
        return em.find(TOfficine.class, Constant.OFFICINE);
    }
}
