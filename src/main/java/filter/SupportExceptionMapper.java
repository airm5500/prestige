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
            return ((WebApplicationException) exception).getResponse();
        }
        LOG.log(Level.SEVERE, "Erreur non gérée dans l'API REST", exception);
        try {
            supportEventService.record(buildEvent(exception), currentUser());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "toResponse: enregistrement de l'événement", e);
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(ResultFactory.getFailResult("Une erreur interne est survenue. Le support a été notifié."))
                .type(MediaType.APPLICATION_JSON).build();
    }

    private SupportEventDTO buildEvent(Throwable exception) {
        SupportEventDTO dto = new SupportEventDTO();
        dto.setType("JAVA");
        dto.setNiveau(exception instanceof Error ? "FATAL" : "ERROR");
        String uri = request != null ? request.getRequestURI() : "";
        dto.setModule(moduleFromUri(uri));
        dto.setMessageCourt(StringUtils.abbreviate(
                exception.getClass().getSimpleName() + " : " + StringUtils.defaultString(exception.getMessage()), 500));
        dto.setUrlOuEcran(StringUtils
                .abbreviate((request != null ? request.getMethod() + " " : "") + StringUtils.defaultString(uri), 255));
        StringWriter stack = new StringWriter();
        exception.printStackTrace(new PrintWriter(stack));
        dto.setStack(StringUtils.abbreviate(stack.toString(), 20000));
        return dto;
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
            if (request == null) {
                return null;
            }
            HttpSession session = request.getSession(false);
            if (session == null) {
                return null;
            }
            TUser user = (TUser) session.getAttribute(Constant.AIRTIME_USER);
            if (user == null) {
                return null;
            }
            return StringUtils.trimToEmpty(user.getStrFIRSTNAME()) + " "
                    + StringUtils.trimToEmpty(user.getStrLASTNAME()) + " (" + user.getStrLOGIN() + ")";
        } catch (Exception e) {
            return null;
        }
    }
}
