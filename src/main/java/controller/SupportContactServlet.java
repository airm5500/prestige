/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package controller;

import dal.SupportDemande;
import dal.TUser;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.Part;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.SupportService;
import util.Constant;

/**
 * Reception du formulaire "Me contacter" du Centre de Support (multipart : champs + pieces jointes). Archive la demande
 * puis envoie l'e-mail au support en asynchrone : l'utilisateur n'est jamais bloque par l'envoi.
 *
 * @author koben
 */
@WebServlet(name = "SupportContactServlet", urlPatterns = { "/support-contact" })
@MultipartConfig(fileSizeThreshold = 1048576, maxFileSize = 10485760L, maxRequestSize = 26214400L)
public class SupportContactServlet extends HttpServlet {

    private static final Logger LOG = Logger.getLogger(SupportContactServlet.class.getName());

    @EJB
    private SupportService supportService;

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        request.setCharacterEncoding("UTF-8");
        // text/html : reponse lue dans une iframe par le submit ExtJS (upload)
        response.setContentType("text/html;charset=UTF-8");
        JSONObject json = new JSONObject();
        try {
            TUser user = (TUser) request.getSession().getAttribute(Constant.AIRTIME_USER);
            if (user == null) {
                json.put("success", false).put("msg", Constant.DECONNECTED_MESSAGE);
                response.getWriter().print(json.toString());
                return;
            }
            String objet = request.getParameter("objet");
            String message = request.getParameter("message");
            if (StringUtils.isBlank(objet) || StringUtils.isBlank(message)) {
                json.put("success", false).put("msg", "L'objet et le message sont obligatoires");
                response.getWriter().print(json.toString());
                return;
            }
            SupportDemande demande = supportService.createDemande(user, objet, message,
                    request.getParameter("moduleConcerne"), request.getParameter("urgence"), getAttachments(request));
            supportService.sendDemandeEmail(demande.getId());
            json.put("success", true).put("msg",
                    "Votre demande a été enregistrée et transmise au support (réf. " + demande.getId() + ")");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "doPost", e);
            json.put("success", false).put("msg", "Une erreur est survenue lors de l'envoi de la demande");
        }
        response.getWriter().print(json.toString());
    }

    private List<Part> getAttachments(HttpServletRequest request) throws IOException, ServletException {
        List<Part> attachments = new ArrayList<>();
        for (Part part : request.getParts()) {
            if (StringUtils.isNotBlank(part.getSubmittedFileName()) && part.getSize() > 0) {
                attachments.add(part);
            }
        }
        return attachments;
    }
}
