/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package filter;

import dal.TUser;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.ext.ExceptionMapper;
import javax.ws.rs.ext.Provider;
import org.apache.commons.lang3.StringUtils;
import rest.ResultFactory;
import rest.service.SupportEventService;
import rest.service.dto.SupportEventDTO;
import util.Constant;

/**
 * Capture globale des exceptions non gerees de l'API REST : journalise l'evenement dans le Centre de Support
 * (deduplication par signature) puis retourne une reponse JSON generique. L'enregistrement est asynchrone et ne bloque
 * jamais la reponse.
 *
 * @author koben
 */
@Provider
public class SupportExceptionMapper implements ExceptionMapper<Throwable> {

    private static final Logger LOG = Logger.getLogger(SupportExceptionMapper.class.getName());

    @Context
    private HttpServletRequest request;
    @EJB
    private SupportEventService supportEventService;

    @Override
    public Response toResponse(Throwable exception) {
        if (exception instanceof WebApplicationException) {
            String parametre = util.SaisieInvalide.parametreIllisible(exception);
            if (parametre != null) {
                return Response.status(Response.Status.BAD_REQUEST).entity(ResultFactory.getFailResult(parametre))
                        .type(MediaType.APPLICATION_JSON).build();
            }
            return ((WebApplicationException) exception).getResponse();
        }
        Response refus = saisieInvalide(exception);
        if (refus != null) {
            return refus;
        }
        boolean interrompu = envoiInterrompu(exception);
        if (interrompu) {
            LOG.log(Level.FINE, "envoi interrompu par le poste", exception);
        } else {
            LOG.log(Level.SEVERE, "Erreur non gérée dans l'API REST", exception);
        }
        try {
            supportEventService.record(buildEvent(exception), currentUser());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "toResponse: enregistrement de l'événement", e);
        }
        if (interrompu) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(ResultFactory.getFailResult("Envoi interrompu avant la fin : à refaire."))
                    .type(MediaType.APPLICATION_JSON).build();
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(ResultFactory.getFailResult("Une erreur interne est survenue. Le support a été notifié."))
                .type(MediaType.APPLICATION_JSON).build();
    }

    /**
     * Valeur tapee par l'utilisateur et illisible (date, nombre) : refus propre (HTTP 400) avec la valeur en cause,
     * sans evenement au Centre de support. Voir {@link util.SaisieInvalide}.
     */
    private Response saisieInvalide(Throwable exception) {
        try {
            if (request == null) {
                return null;
            }
            String corps = util.SaisieInvalide.corpsIllisible(exception);
            if (corps != null) {
                LOG.log(Level.FINE, "corps illisible refuse : {0}", request.getRequestURI());
                return Response.status(Response.Status.BAD_REQUEST).entity(ResultFactory.getFailResult(corps))
                        .type(MediaType.APPLICATION_JSON).build();
            }
            Throwable racine = util.ErreurExplication.causeRacine(exception);
            java.util.Map<String, String[]> parametres = util.SaisieInvalide.parametresUtf8(request.getQueryString(),
                    request.getParameterMap());
            String texte = util.SaisieInvalide.valeurIllisible(racine);
            String message = texte != null && util.SaisieInvalide.estSaisie(texte, parametres, request.getRequestURI())
                    ? util.SaisieInvalide.message(texte) : util.SaisieInvalide.autreSaisie(racine, parametres);
            if (message == null) {
                return null;
            }
            LOG.log(Level.FINE, "saisie invalide refusee : {0}", request.getRequestURI());
            return Response.status(Response.Status.BAD_REQUEST).entity(ResultFactory.getFailResult(message))
                    .type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return null;
        }
    }

    private SupportEventDTO buildEvent(Throwable exception) {
        SupportEventDTO dto = new SupportEventDTO();
        dto.setType("JAVA");
        // Cause racine : une EJBException (ou autre enveloppe) masque presque toujours la vraie erreur.
        // Le message et l'explication portent sur la cause d'origine, pas sur l'enveloppe technique.
        Throwable racine = util.ErreurExplication.causeRacine(exception);
        dto.setNiveau(niveau(exception));
        String uri = request != null ? request.getRequestURI() : "";
        dto.setModule(moduleFromUri(uri));
        dto.setMessageCourt(StringUtils.abbreviate(
                racine.getClass().getSimpleName() + " : " + StringUtils.defaultString(racine.getMessage()), 500));
        // Explication "terre a terre" en francais : affichee dans le detail de l'evenement (bloc Contexte).
        String explication = util.ErreurExplication.expliquer(racine);
        // Contexte metier : de quelle vente parle-t-on, dans quel etat, tenue par qui. Sans lui, l'evenement ne
        // nomme qu'un identifiant technique et l'analyse a distance oblige a interroger la base.
        String contexte = contexteMetier(uri);
        dto.setPayloadJson(StringUtils
                .abbreviate("Explication : " + explication + (contexte == null ? "" : "\n\n" + contexte), 4000));
        dto.setUrlOuEcran(StringUtils
                .abbreviate((request != null ? request.getMethod() + " " : "") + StringUtils.defaultString(uri), 255));
        StringWriter stack = new StringWriter();
        exception.printStackTrace(new PrintWriter(stack));
        dto.setStack(StringUtils.abbreviate("EXPLICATION : " + explication + "\n\n" + stack, 20000));
        return dto;
    }

    /**
     * Niveau de l'evenement. Rapport d'exploitation du 13/11, point 10 : un envoi coupe par le poste pendant la lecture
     * de la requete (EOFException de Grizzly sur {@code support/rum}, onglet ferme, Wi-Fi perdu) etait classe ERROR ;
     * rien n'est en panne cote serveur : INFO.
     */
    static String niveau(Throwable exception) {
        Throwable racine = util.ErreurExplication.causeRacine(exception);
        if (exception instanceof Error || racine instanceof Error) {
            return "FATAL";
        }
        return envoiInterrompu(exception) ? "INFO" : "ERROR";
    }

    /** Vrai si la cause est une connexion coupee par le poste pendant l'echange (et non une panne du serveur). */
    static boolean envoiInterrompu(Throwable exception) {
        for (Throwable t = exception; t != null; t = t.getCause() == t ? null : t.getCause()) {
            String classe = t.getClass().getName();
            if (classe.endsWith("ClientAbortException") || classe.endsWith("EofException")) {
                return true;
            }
            // fin de flux en lisant la requete du poste (Grizzly) ; une fin de fichier local reste une erreur
            if (t instanceof java.io.EOFException && t.getStackTrace().length > 0
                    && t.getStackTrace()[0].getClassName().startsWith("org.glassfish.grizzly")) {
                return true;
            }
            if (t instanceof java.io.IOException && t.getMessage() != null) {
                String m = t.getMessage();
                if (m.contains("Connection is closed") || m.contains("Broken pipe") || m.contains("Connection reset")
                        || m.contains("connexion a été abandonnée") || m.contains("Early EOF")) {
                    return true;
                }
            }
        }
        return false;
    }

    /** Contexte metier, best-effort : une erreur de plus ici ne doit pas empecher l'enregistrement de l'evenement. */
    private String contexteMetier(String uri) {
        try {
            return supportEventService.contexteMetier(uri);
        } catch (Exception e) {
            LOG.log(Level.FINE, "contexteMetier", e);
            return null;
        }
    }

    private String moduleFromUri(String uri) {
        // extrait le segment apres /api/v1/ : /prestige/api/v1/produit/... -> produit
        if (StringUtils.isBlank(uri)) {
            return "API";
        }
        String[] segments = uri.split("/");
        for (int i = 0; i < segments.length - 1; i++) {
            if (segments[i].matches("v[0-9]+") && StringUtils.isNotBlank(segments[i + 1])) {
                return segments[i + 1].toUpperCase();
            }
        }
        return "API";
    }

    private String currentUser() {
        try {
            String label = null;
            if (request != null) {
                HttpSession session = request.getSession(false);
                TUser user = session != null ? (TUser) session.getAttribute(Constant.AIRTIME_USER) : null;
                if (user != null) {
                    label = StringUtils.trimToEmpty(user.getStrFIRSTNAME()) + " "
                            + StringUtils.trimToEmpty(user.getStrLASTNAME()) + " (" + user.getStrLOGIN() + ")";
                }
            }
            // IP + nom du poste qui constate l'erreur, ajoutes au libelle utilisateur.
            return util.PosteClient.utilisateurAvecPoste(label, request);
        } catch (Exception e) {
            return null;
        }
    }
}
