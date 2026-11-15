package rest;

import java.io.ByteArrayOutputStream;
import java.io.CharArrayWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.net.URLEncoder;
import java.nio.file.Files;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.inject.Inject;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.MimeMessage;
import javax.persistence.EntityManager;
import javax.servlet.RequestDispatcher;
import javax.servlet.ServletOutputStream;
import javax.servlet.WriteListener;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

import dal.TFacture;
import dal.TOfficine;
import dal.TTiersPayant;
import dal.TUser;
import dal.dataManager;
import rest.service.facture.EnvoiFacture;
import toolkits.utils.jdom;
import util.AppParameters;
import util.Constant;

/**
 * Plan du 14/11, point 4 : envoi d'une facture de tiers payant par email.
 *
 * <p>
 * La facture part telle qu'elle s'imprime : modele dynamique du tiers payant s'il en a un, sinon la page d'impression
 * historique (ws_rp_facture_tiers_payant.jsp), incluse ici sans changement ; elle ecrit son PDF dans le dossier des
 * etats, d'ou il est relu. Chaque essai laisse une ligne dans t_facture_envoi (date, destinataires, statut, motif d'un
 * echec, nom et taille de la piece jointe), relue par la liste des factures. Rien du contenu de la facture n'est
 * journalise.
 *
 * <p>
 * Poste d'essai : si la propriete systeme {@value #DOSSIER_ESSAI} est posee (jamais en officine), le message est ecrit
 * dans ce dossier au format .eml au lieu de partir ; c'est ce que relisent les tests d'ecran.
 */
@Path("v1/facture-envoi")
@Produces(MediaType.APPLICATION_JSON)
public class FactureEnvoiRessource {

    static final String DOSSIER_ESSAI = "prestige.mail.essai.dossier";
    private static final Logger LOG = Logger.getLogger(FactureEnvoiRessource.class.getName());
    private static final String PAGE_IMPRESSION = "/webservices/sm_user/facturation/ws_rp_facture_tiers_payant.jsp";

    @Inject
    private HttpServletRequest servletRequest;

    @Context
    private HttpServletResponse servletResponse;

    private TUser utilisateurSession() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private static Response json(JSONObject o) {
        return Response.ok().entity(o.toString()).build();
    }

    private static Response refus(String motif) {
        return json(new JSONObject().put("success", false).put("message", motif));
    }

    /** Journal des envois d'une facture, du plus recent au plus ancien. */
    @GET
    @Path("facture/{factureId}")
    public Response journal(@PathParam("factureId") String factureId) {
        if (utilisateurSession() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            @SuppressWarnings("unchecked")
            List<Object[]> lignes = odm.getEm().createNativeQuery(
                    "SELECT e.dt_CREATED, e.str_MODE, e.str_DESTINATAIRE, e.str_STATUT, e.str_ERREUR, e.str_FICHIER,"
                            + " e.int_TAILLE, CONCAT_WS(' ', u.str_FIRST_NAME, u.str_LAST_NAME)"
                            + " FROM t_facture_envoi e LEFT JOIN t_user u ON u.lg_USER_ID = e.lg_USER_ID"
                            + " WHERE e.lg_FACTURE_ID = ?1 ORDER BY e.dt_CREATED DESC, e.id DESC")
                    .setParameter(1, factureId).getResultList();
            JSONArray data = new JSONArray();
            SimpleDateFormat f = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
            for (Object[] l : lignes) {
                data.put(new JSONObject().put("date", l[0] == null ? "" : f.format((Date) l[0])).put("mode", l[1])
                        .put("destinataire", StringUtils.defaultString((String) l[2])).put("statut", l[3])
                        .put("erreur", StringUtils.defaultString((String) l[4]))
                        .put("fichier", StringUtils.defaultString((String) l[5]))
                        .put("taille", l[6] == null ? 0 : ((Number) l[6]).intValue())
                        .put("utilisateur", StringUtils.defaultString((String) l[7]).trim()));
            }
            return json(new JSONObject().put("success", true).put("data", data).put("total", data.length()));
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Envoi de la facture par email a l'adresse de la fiche du tiers payant (mode MAIL). */
    @POST
    @Path("{factureId}/mail")
    public Response envoyerParMail(@PathParam("factureId") String factureId) {
        TUser user = utilisateurSession();
        if (user == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        EntityManager em = odm.getEm();
        try {
            TFacture facture = em.find(TFacture.class, factureId);
            if (facture == null) {
                return refus("Facture introuvable");
            }
            TTiersPayant tp = em.find(TTiersPayant.class, facture.getStrCUSTOMER());
            if (tp == null) {
                return refus("Cette facture n'est pas celle d'un tiers payant");
            }
            if (!EnvoiFacture.MAIL.equals(EnvoiFacture.modeEffectif(tp.getStrMODEENVOIFACTURE()))) {
                return refus("Le tiers payant " + tp.getStrNAME()
                        + " n'est pas réglé sur l'envoi des factures par email (fiche du tiers payant)");
            }
            String motif = EnvoiFacture.controlerFiche(EnvoiFacture.MAIL, tp.getStrMAIL());
            if (motif != null) {
                return refus(motif);
            }
            List<String> destinataires = EnvoiFacture.adresses(tp.getStrMAIL());
            String dest = String.join("; ", destinataires);
            if (facture.getIntNBDOSSIER() == null || facture.getIntNBDOSSIER() == 0) {
                return refus("Cette facture ne contient aucun bon : il n'y a rien à envoyer");
            }
            String dossierEssai = System.getProperty(DOSSIER_ESSAI);
            AppParameters sp = AppParameters.getInstance();
            if (StringUtils.isBlank(dossierEssai) && !sp.expediteurConfigure()) {
                return journaliserEtRepondre(em, facture, tp, user, dest, EnvoiFacture.STATUT_ECHEC,
                        Constant.MSG_EXPEDITEUR_MAIL_NON_CONFIGURE, null, 0);
            }
            byte[] pdf;
            try {
                pdf = pdf(em, facture, tp);
            } catch (Exception e) {
                LOG.log(Level.SEVERE, "envoyerParMail : edition de la facture " + factureId, e);
                pdf = null;
            }
            if (pdf == null || pdf.length == 0) {
                return journaliserEtRepondre(em, facture, tp, user, dest, EnvoiFacture.STATUT_ECHEC,
                        "La facture n'a pas pu être éditée en PDF", null, 0);
            }
            TOfficine officine = em.find(TOfficine.class, "1");
            String nomOfficine = officine == null ? ""
                    : StringUtils.defaultIfBlank(officine.getStrNOMCOMPLET(), officine.getStrNOMABREGE());
            SimpleDateFormat jour = new SimpleDateFormat("dd/MM/yyyy");
            String periode = facture.getDtDEBUTFACTURE() == null || facture.getDtFINFACTURE() == null ? "" : "du "
                    + jour.format(facture.getDtDEBUTFACTURE()) + " au " + jour.format(facture.getDtFINFACTURE());
            String nomFichier = EnvoiFacture.nomPieceJointe(tp.getStrNAME(), facture.getStrCODEFACTURE());
            String expediteur = StringUtils.isNotBlank(sp.email) ? sp.email : "prestige@localhost";
            try {
                MimeMessage msg = EnvoiFacture.construire(sessionMail(expediteur), expediteur, destinataires,
                        EnvoiFacture.objet(facture.getStrCODEFACTURE(), nomOfficine),
                        EnvoiFacture.corps(tp.getStrFULLNAME(), facture.getStrCODEFACTURE(), periode,
                                facture.getDblMONTANTCMDE() == null ? 0 : facture.getDblMONTANTCMDE(),
                                facture.getIntNBDOSSIER(), nomOfficine),
                        pdf, nomFichier);
                if (StringUtils.isNotBlank(dossierEssai)) {
                    File dossier = new File(dossierEssai);
                    dossier.mkdirs();
                    try (OutputStream out = new FileOutputStream(
                            new File(dossier, facture.getLgFACTUREID() + "-" + System.currentTimeMillis() + ".eml"))) {
                        msg.writeTo(out);
                    }
                } else {
                    Transport.send(msg, sp.email, sp.password);
                }
            } catch (Exception e) {
                LOG.log(Level.WARNING, "envoyerParMail : envoi de la facture " + factureId + " refuse : "
                        + e.getClass().getSimpleName());
                return journaliserEtRepondre(em, facture, tp, user, dest, EnvoiFacture.STATUT_ECHEC,
                        "L'envoi a échoué : "
                                + StringUtils.defaultIfBlank(e.getMessage(), e.getClass().getSimpleName()),
                        nomFichier, pdf.length);
            }
            return journaliserEtRepondre(em, facture, tp, user, dest, EnvoiFacture.STATUT_ENVOYEE, null, nomFichier,
                    pdf.length);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "envoyerParMail " + factureId, e);
            return refus("L'envoi de la facture n'a pas pu être fait");
        } finally {
            odm.closeEntityManager();
        }
    }

    private Response journaliserEtRepondre(EntityManager em, TFacture facture, TTiersPayant tp, TUser user,
            String destinataires, String statut, String erreur, String fichier, int taille) {
        Date maintenant = new Date();
        javax.persistence.EntityTransaction tx = em.getTransaction();
        boolean aNous = !tx.isActive();
        if (aNous) {
            tx.begin();
        }
        em.createNativeQuery("INSERT INTO t_facture_envoi (id, lg_FACTURE_ID, lg_TIERS_PAYANT_ID, str_MODE,"
                + " str_DESTINATAIRE, str_STATUT, str_ERREUR, str_FICHIER, int_TAILLE, lg_USER_ID, dt_CREATED)"
                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)")
                .setParameter(1, UUID.randomUUID().toString()).setParameter(2, facture.getLgFACTUREID())
                .setParameter(3, tp.getLgTIERSPAYANTID()).setParameter(4, EnvoiFacture.MAIL)
                .setParameter(5, StringUtils.abbreviate(destinataires, 255)).setParameter(6, statut)
                .setParameter(7, erreur == null ? null : StringUtils.abbreviate(erreur, 500)).setParameter(8, fichier)
                .setParameter(9, taille).setParameter(10, user.getLgUSERID()).setParameter(11, maintenant)
                .executeUpdate();
        if (aNous) {
            tx.commit();
        }
        boolean ok = EnvoiFacture.STATUT_ENVOYEE.equals(statut);
        return json(new JSONObject().put("success", ok).put("statut", statut)
                .put("date", new SimpleDateFormat("dd/MM/yyyy HH:mm:ss").format(maintenant))
                .put("destinataire", destinataires).put("message",
                        ok ? "Facture " + facture.getStrCODEFACTURE() + " envoyée à " + destinataires : erreur));
    }

    /**
     * Session d'envoi : reglages SMTP communs, plus l'expediteur (mail.from) ; sans lui, l'identifiant du message est
     * fabrique a partir du nom de la machine, cherche dans le DNS a chaque message (plusieurs secondes sur le poste).
     */
    private static Session sessionMail(String expediteur) {
        java.util.Properties props = new java.util.Properties();
        props.putAll(rest.service.notification.template.Mail.getEmailProperties());
        props.put("mail.from", expediteur);
        return Session.getInstance(props);
    }

    /** PDF de la facture, tel qu'il s'imprime. */
    private byte[] pdf(EntityManager em, TFacture facture, TTiersPayant tp) throws Exception {
        byte[] dynamique = new ModelFactureDynamiqueRessource().pdfSiModeleDynamique(em, facture, tp);
        if (dynamique != null) {
            return dynamique;
        }
        // meme nom que celui que la page d'impression donne a son fichier, a la seconde pres
        SimpleDateFormat jour = new SimpleDateFormat("ddMMyyyy");
        String prefixe = "Facture_" + StringUtils.defaultString(tp.getStrNAME()).replaceAll("[^A-Za-z0-9]", "") + "-"
                + jour.format(facture.getDtDEBUTFACTURE()) + "_" + jour.format(facture.getDtFINFACTURE()) + "-";
        long debut = System.currentTimeMillis() - 2000L;
        RequestDispatcher page = servletRequest.getRequestDispatcher(
                PAGE_IMPRESSION + "?lg_FACTURE_ID=" + URLEncoder.encode(facture.getLgFACTUREID(), "UTF-8"));
        page.include(servletRequest, new SortieIgnoree(servletResponse));
        File dossier = new File(jdom.scr_report_pdf);
        File[] candidats = dossier.listFiles(
                (d, n) -> n.startsWith(prefixe) && n.endsWith(".pdf") && new File(d, n).lastModified() >= debut);
        File plusRecent = null;
        if (candidats != null) {
            for (File c : candidats) {
                if (plusRecent == null || c.lastModified() > plusRecent.lastModified()) {
                    plusRecent = c;
                }
            }
        }
        return plusRecent == null ? null : Files.readAllBytes(plusRecent.toPath());
    }

    /** Reponse de la page incluse : ce qu'elle ecrit est ignore, la vraie reponse reste intacte. */
    private static final class SortieIgnoree extends HttpServletResponseWrapper {
        private final PrintWriter ecrivain = new PrintWriter(new CharArrayWriter());
        private final ByteArrayOutputStream octets = new ByteArrayOutputStream();

        SortieIgnoree(HttpServletResponse r) {
            super(r);
        }

        @Override
        public PrintWriter getWriter() {
            return ecrivain;
        }

        @Override
        public ServletOutputStream getOutputStream() {
            return new ServletOutputStream() {
                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setWriteListener(WriteListener l) {
                    // sans objet
                }

                @Override
                public void write(int b) {
                    octets.write(b);
                }
            };
        }

        @Override
        public void sendRedirect(String location) throws IOException {
            // la page d'impression redirige vers son fichier : rien a faire, le fichier est relu sur disque
        }

        @Override
        public void setStatus(int sc) {
            // la vraie reponse garde son statut
        }

        @Override
        public void setContentType(String type) {
            // idem
        }

        @Override
        public void setHeader(String name, String value) {
            // idem
        }

        @Override
        public void addHeader(String name, String value) {
            // idem
        }

        @Override
        public void flushBuffer() {
            // rien ne part au client
        }

        @Override
        public boolean isCommitted() {
            return false;
        }

        @Override
        public void resetBuffer() {
            octets.reset();
        }

        @Override
        public void reset() {
            octets.reset();
        }

        @Override
        public void setCharacterEncoding(String charset) {
            // idem
        }

        @Override
        public void setContentLength(int len) {
            // idem
        }
    }
}
