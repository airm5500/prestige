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

    static final String SOURCE_COMMANDE = "COMMANDE", SOURCE_RUPTURE = "RUPTURE";
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
    }

    /** Envoi refuse ou impossible : note pour la liste des commandes, puis le message habituel. */
    private JSONObject noterEchec(TGrossiste g, String source, String sourceId, String statut, String msg) {
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
            for (int i = 0; i < 50; i++) {
                ecrireArchive("V_" + ref + "_" + nomFichier, xml);
                HttpResponse<String> rep = EnvoiPharmaMl.envoyer(adresses(g), xml, g.getStrIDRECEPTEURPHARMA(),
                        g.getStrCLERECEPTEUR(), modeControle(g), DELAI_CONNEXION, DELAI_REPONSE).reponse;
                String corps = rep.body();
                ecrireArchive("RV_" + ref + "_" + nomFichier, PharmaMlMessages.indenter(corps));
                if (rep.statusCode() != 200) {
                    return out.put("traitees", traitees).put("msg", "HTTP " + rep.statusCode());
                }
                PharmaMlMessages.Enveloppe env = PharmaMlMessages.lireEnveloppe(corps);
                if ("FIN_SERVICE".equals(env.action) && !env.repCommande) {
                    return out.put("traitees", traitees).put("msg", i == 0 ? "aucune réponse en attente" : "fin");
                }
                if (StringUtils.isBlank(env.refMessage)) {
                    return out.put("traitees", traitees).put("msg", "réponse illisible");
                }
                if (env.erreur && !env.repCommande && StringUtils.isBlank(env.enReponseA)) {
                    /* refus de la demande de vidage elle-meme (controle, identifiants) : rien a acquitter */
                    return out.put("traitees", traitees).put("msg",
                            "refus : " + StringUtils.defaultString(PharmaMlMessages.erreurReponse(corps)));
                }
                JSONObject r = moi.appliquerReponseDifferee(g.getLgGROSSISTEID(), corps,
                        "RV_" + ref + "_" + nomFichier);
                out.getJSONArray("messages").put(r);
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
        if (!m.find() || StringUtils.isBlank(ap.pharmaMlDir)) {
            return new JSONObject().put("statut", "SANS_ARCHIVE");
        }
        String archive = m.group(1);
        Path fichier = Paths.get(ap.pharmaMlDir, archive + ".xml");
        if (!Files.isRegularFile(fichier)) {
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
        if (erreur != null || !env.repCommande) {
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
        return nom + " a refusé la commande : « " + r.getMessage() + " ». La commande n'a pas été prise en compte."
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
        item.setIntPAFDETAIL(prixs.getLeft());
        item.setIntPRICEDETAIL(prixs.getRight());
        item.setIntPRICE(item.getIntPAFDETAIL() * origin.getIntNUMBER());
        em.persist(item);
        order.getTOrderDetailCollection().add(item);

    }

    private void addRemplacement(LigneNReponse ligneNReponse, int qtyOrigin, TFamille famille, TOrder order) {
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
        item.setIntPAFDETAIL(prixs.getLeft());
        item.setIntPRICEDETAIL(prixs.getRight());
        item.setIntPRICE(item.getIntPAFDETAIL() * qtyOrigin);
        em.persist(item);
        order.getTOrderDetailCollection().add(item);

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
            addRemplacement(ligneNReponse, qty, famille, order);
            noterRemplacement(grossiste, order, origine, null, type, produitRemplacant, ligneNReponse, qty,
                    REMPL_AJOUTE, "AUTO");
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
            REMPL_REFUSE = "REFUSE", ACCEPTER = "ACCEPTER", REFUSER = "REFUSER";

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
                        + "   WHERE d.id = r.lg_RUPTURE_DETAIL_ID))"
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
                    .put("ruptureOuverte", l[12] != null && ((Number) l[12]).intValue() == 1));
        }
        return new JSONObject().put("success", true).put("data", a).put("total", a.length());
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
                + " dt_DECISION = NOW() WHERE lg_ID = ?4").setParameter(1, accepter ? REMPL_ACCEPTE : REMPL_REFUSE)
                .setParameter(2, mode).setParameter(3, user == null ? null : user.getLgUSERID()).setParameter(4, id)
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

        if (prix.getLeft() > 0) {
            o.setPrixAchat(prix.getLeft());
            o.setIntPAFDETAIL(prix.getLeft());
        } else {
            o.setPrixAchat(o.getIntPAFDETAIL());
        }
        o.setPrixUnitaire(prix.getRight());
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
        if (prix.getLeft() > 0) {
            orderDetail.setPrixAchat(prix.getLeft());
            orderDetail.setIntPAFDETAIL(prix.getLeft());
        } else {
            orderDetail.setPrixAchat(orderDetail.getIntPAFDETAIL());
        }
        orderDetail.setPrixUnitaire(prix.getRight());
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
            Path path = Paths.get(ap.pharmaMlDir + File.separator + prefix.toUpperCase() + "_" + fileName + ".xml");
            try (OutputStream os = Files.newOutputStream(path)) {
                marshaller.marshal(objectToSave, os);
            }
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
        ecrireArchive("C_" + fileName, xml);
        HttpResponse<String> httpResponse = EnvoiPharmaMl.envoyer(adresses(grossiste), xml,
                grossiste.getStrIDRECEPTEURPHARMA(), grossiste.getStrCLERECEPTEUR(), modeControle(grossiste),
                DELAI_CONNEXION, DELAI_REPONSE).reponse;
        if (httpResponse.statusCode() != 200) {
            saveResponse(httpResponse.body(), "LOG_" + fileName);
            throw new RefusHttp(httpResponse.statusCode(), "R_LOG_" + fileName);
        }
        ecrireArchive("R_" + fileName, PharmaMlMessages.indenter(httpResponse.body()));
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

    private void ecrireArchive(String nom, String contenu) {
        try {
            Files.write(Paths.get(ap.pharmaMlDir + File.separator + nom + ".xml"),
                    (contenu == null ? "" : contenu).getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "archive PharmaML {0} : {1}", new Object[] { nom, e.getMessage() });
        }
    }

    private void saveResponse(String response, String fileName) {
        try {
            Path path = Paths.get(ap.pharmaMlDir + File.separator + "R_" + fileName + ".xml");
            Files.write(path, response.getBytes(StandardCharsets.UTF_8));
        } catch (IOException ex) {
            LOG.log(Level.SEVERE, "saveResonse", ex);
        }
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
