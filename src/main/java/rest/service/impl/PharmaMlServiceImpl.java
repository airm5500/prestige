/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.Rupture;
import dal.RuptureDetail;
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
                    order.getStrREFORDER() + LocalDateTime.now().format(DateTimeFormatter.ofPattern("mmss")));
            journalEnvoi("commande", order.getStrREFORDER(), grossiste);
            CsrpEnveloppeResponse enveloppeResponse = processommandeXml(payLoad, order.getStrREFORDER(), grossiste);
            if (Objects.isNull(enveloppeResponse)) {
                return new JSONObject().put("success", false).put("msg", REPONSE_ILLISIBLE);
            }
            if (getLigneNReponses(enveloppeResponse).isEmpty() && !order.getTOrderDetailCollection().isEmpty()) {
                /* une rupture totale renvoie quand meme les lignes (quantite 0) : aucune ligne = reponse anormale */
                return new JSONObject().put("success", false).put("msg", SANS_LIGNE);
            }
            JSONObject traite = traiterCommandeRepondue(order, enveloppeResponse);
            enregistrerTraite(grossiste, SOURCE_COMMANDE, commandeId, payLoad);
            return traite;
        } catch (EnAttente ex) {
            TGrossiste g = em.find(TOrder.class, commandeId).getLgGROSSISTEID();
            enregistrerAttente(g, SOURCE_COMMANDE, commandeId, ex);
            return reponseEnAttente(g);
        } catch (RefusGrossiste ex) {
            TGrossiste g = em.find(TOrder.class, commandeId).getLgGROSSISTEID();
            LOG.log(Level.WARNING, "PharmaML : {0} a refuse la commande ({1})",
                    new Object[] { g.getStrLIBELLE(), ex.version });
            return new JSONObject().put("success", false).put("msg", messageRefus(g, ex));
        } catch (RefusHttp ex) {
            TGrossiste g = em.find(TOrder.class, commandeId).getLgGROSSISTEID();
            LOG.log(Level.WARNING, "PharmaML : {0} a repondu {1}", new Object[] { g.getStrLIBELLE(), ex.getMessage() });
            return new JSONObject().put("success", false).put("msg", messageRefus(g, ex));
        } catch (Exception ex) {
            if (erreurReseau(ex)) {
                TGrossiste g = em.find(TOrder.class, commandeId).getLgGROSSISTEID();
                LOG.log(Level.WARNING, "PharmaML : {0} injoignable ({1})",
                        new Object[] { g.getStrLIBELLE(), ex.getClass().getSimpleName() });
                return new JSONObject().put("success", false).put("msg", messageReseau(g, ex));
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
                    rupture.getReference(), rupture.getReference() + "_"
                            + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyMMddHHmmss")));
            journalEnvoi("renvoi de rupture", rupture.getReference(), grossiste);
            CsrpEnveloppeResponse enveloppeResponse = processommandeXml(payLoad, rupture.getReference(), grossiste);
            if (Objects.isNull(enveloppeResponse)) {
                return new JSONObject().put("success", false).put("msg", REPONSE_ILLISIBLE);
            }
            if (getLigneNReponses(enveloppeResponse).isEmpty() && !ruptureDetails.isEmpty()) {
                return new JSONObject().put("success", false).put("msg", SANS_LIGNE);
            }
            JSONObject traite = traiterCommandeRepondue(rupture, ruptureDetails, grossiste, enveloppeResponse);
            enregistrerTraite(grossiste, SOURCE_RUPTURE, ruptureId, payLoad);
            return traite;
        } catch (EnAttente ex) {
            TGrossiste g = em.find(TGrossiste.class, grossisteId);
            enregistrerAttente(g, SOURCE_RUPTURE, ruptureId, ex);
            return reponseEnAttente(g);
        } catch (RefusGrossiste ex) {
            TGrossiste g = em.find(TGrossiste.class, grossisteId);
            LOG.log(Level.WARNING, "PharmaML : {0} a refuse la commande ({1})",
                    new Object[] { g.getStrLIBELLE(), ex.version });
            return new JSONObject().put("success", false).put("msg", messageRefus(g, ex));
        } catch (RefusHttp ex) {
            TGrossiste g = em.find(TGrossiste.class, grossisteId);
            LOG.log(Level.WARNING, "PharmaML : {0} a repondu {1}", new Object[] { g.getStrLIBELLE(), ex.getMessage() });
            return new JSONObject().put("success", false).put("msg", messageRefus(g, ex));
        } catch (Exception ex) {
            if (erreurReseau(ex)) {
                TGrossiste g = em.find(TGrossiste.class, grossisteId);
                LOG.log(Level.WARNING, "PharmaML : {0} injoignable ({1})",
                        new Object[] { g.getStrLIBELLE(), ex.getClass().getSimpleName() });
                return new JSONObject().put("success", false).put("msg", messageReseau(g, ex));
            }
            LOG.log(Level.SEVERE, null, ex);
            return new JSONObject().put("success", false).put("msg", "Une erreur c'est produite");
        }

    }

    /** Calcul de l'en-tete Content-PharmaML (parametre KEY_PHARMAML_CONTROLE, CSRP par defaut). */
    String modeControle() {
        try {
            List<?> r = em
                    .createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_PHARMAML_CONTROLE'")
                    .getResultList();
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

    /** Reponse immediate traitee : l'envoi est note, pour reconnaitre une copie de cette reponse au depot. */
    private void enregistrerTraite(TGrossiste g, String source, String sourceId, CsrpEnveloppe payLoad) {
        em.createNativeQuery("INSERT INTO t_pharmaml_attente (lg_ID, lg_GROSSISTE_ID, str_SOURCE, lg_SOURCE_ID,"
                + " str_REF_MESSAGE, str_VERSION, str_STATUT, str_DETAIL, dt_ENVOI, dt_REPONSE)"
                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'réponse immédiate', NOW(), NOW())")
                .setParameter(1, java.util.UUID.randomUUID().toString()).setParameter(2, g.getLgGROSSISTEID())
                .setParameter(3, source).setParameter(4, sourceId).setParameter(5, payLoad.getEntete().getRefMessage())
                .setParameter(6, versionCommande(g)).setParameter(7, TRAITEE).executeUpdate();
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
        int traitees = 0;
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
                .put("enAttente", attentes().getJSONArray("data").length());
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
                        g.getStrCLERECEPTEUR(), modeControle(), DELAI_CONNEXION, DELAI_REPONSE).reponse;
                String corps = rep.body();
                ecrireArchive("RV_" + ref + "_" + nomFichier, corps);
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
        TGrossiste g = em.find(TGrossiste.class, grossisteId);
        PharmaMlMessages.Enveloppe env = PharmaMlMessages.lireEnveloppe(xml);
        JSONObject r = new JSONObject().put("refMessage", env.refMessage).put("enReponseA", env.enReponseA);
        List<Object[]> a = em
                .createNativeQuery("SELECT lg_ID, str_SOURCE, lg_SOURCE_ID, str_VERSION FROM t_pharmaml_attente"
                        + " WHERE lg_GROSSISTE_ID = ?1 AND str_STATUT = ?2 AND str_REF_MESSAGE = ?3")
                .setParameter(1, grossisteId).setParameter(2, EN_ATTENTE).setParameter(3, env.enReponseA)
                .getResultList();
        Object[] attente = a.isEmpty() ? null : a.get(0);
        String erreur = PharmaMlMessages.erreurReponse(xml);
        if (attente == null && StringUtils.isNotBlank(env.enReponseA)) {
            Number deja = (Number) em
                    .createNativeQuery("SELECT COUNT(*) FROM t_pharmaml_attente WHERE lg_GROSSISTE_ID = ?1"
                            + " AND str_REF_MESSAGE = ?2 AND str_STATUT <> ?3")
                    .setParameter(1, grossisteId).setParameter(2, env.enReponseA).setParameter(3, EN_ATTENTE)
                    .getSingleResult();
            if (deja.intValue() > 0) {
                /*
                 * copie d'une reponse deja traitee (ex. reponse immediate non acquittee) : acquittee, jamais
                 * reappliquee
                 */
                return r.put("statut", "DEJA_TRAITEE");
            }
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
            }
        }
        em.createNativeQuery("UPDATE t_pharmaml_attente SET str_STATUT = ?1, str_DETAIL = ?2, dt_REPONSE = NOW()"
                + " WHERE lg_ID = ?3").setParameter(1, statut)
                .setParameter(2, StringUtils.left(resultat.toString(), 500)).setParameter(3, idAttente).executeUpdate();
        return r.put("statut", statut).put("source", source).put("sourceId", sourceId).put("resultat", resultat);
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
                                + " majuscules et minuscules comptent) et le code client de l'officine chez ce"
                                + " grossiste ; le paramètre KEY_PHARMAML_CONTROLE doit valoir CSRP.")
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
            creationProduit.setIntEan13(creationProduit.getIntEan13());
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
            orderService.creerRuptureItem(rupture, coupleProduitResponse.getLeft(), orderDetail.getIntNUMBER());
            processRemplacement(ligneNReponse, grossiste, orderDetail.getIntNUMBER(), order);
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
            orderService.creerRuptureItem(rupture, coupleProduitResponse.getLeft(), ruptureDetail.getQty());
            processRemplacement(ligneNReponse, grossiste, ruptureDetail.getQty(), order);

        });

    }

    private void processRemplacement(LigneNReponse ligneNReponse, TGrossiste grossiste, int qty, TOrder order) {
        IndisponibiliteN indisponibilite = ligneNReponse.getIndisponibilite();
        if (Objects.nonNull(indisponibilite)) {
            ProduitRemplacant produitRemplacant = indisponibilite.getProduitRemplacant();
            if (Objects.nonNull(produitRemplacant)
                    && (TypeRemplacement.EL.name().equals(produitRemplacant.getTypeRemplacement())
                            || TypeRemplacement.RL.name().equals(produitRemplacant.getTypeRemplacement()))) {
                TFamilleGrossiste familleGrossiste = findTFamilleGrossisteByCodeCipOrEanOrProduitCode(
                        produitRemplacant.getCodeProduit(), grossiste.getLgGROSSISTEID());
                TFamille famille = findTFamilleByCodeCipOrEan(produitRemplacant.getCodeProduit());
                if (Objects.isNull(familleGrossiste) && Objects.nonNull(famille)) {

                    produitService.createTFamilleGrossisteFromRupture(buildFromLigneNReponse(ligneNReponse), famille,
                            grossiste);

                } else if (Objects.isNull(famille)) {

                    famille = createTFamille(buildFromLigneNReponse(ligneNReponse), grossiste);
                }
                addRemplacement(ligneNReponse, qty, famille, order);
                // on ajoute la ligne a la commande
            }

        }
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
            LOG.log(Level.WARNING, "version PharmaML du grossiste : 3.0.0.0 par defaut", e);
            return PharmaMlMessages.V3;
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
                grossiste.getStrIDRECEPTEURPHARMA(), grossiste.getStrCLERECEPTEUR(), modeControle(), DELAI_CONNEXION,
                DELAI_REPONSE).reponse;
        if (httpResponse.statusCode() != 200) {
            saveResponse(httpResponse.body(), "LOG_" + fileName);
            throw new RefusHttp(httpResponse.statusCode(), "R_LOG_" + fileName);
        }
        ecrireArchive("R_" + fileName, httpResponse.body());
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
