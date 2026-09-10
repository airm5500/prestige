package rest;

import dal.TUser;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.json.JSONObject;
import rest.service.StatCaisseRecetteService;
import rest.service.dto.StatCaisseRecetteDTO;
import rest.report.excel.ClasseurExcel;
import rest.service.StatCaisseRecetteService.Granularite;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/stats-recette-caisse")
@Produces("application/json")
public class StatCaisseRecetteResource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private StatCaisseRecetteService caisseRecetteService;

    @GET
    @Path("/data")
    public Response balanceCaisse(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "typeRglementId") String typeRglementId,
            @QueryParam(value = "groupByYear") Boolean groupByYear,
            @QueryParam(value = "granularite") String granularite) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        /*
         * Point 16 : « Mensuelle » vient s'ajouter a « Annuelle ». Le parametre historique groupByYear reste lu, de
         * sorte qu'un appel deja en place continue de fonctionner sans changement.
         */
        JSONObject json = caisseRecetteService.getStatCaisseRecettes(dtStart, dtEnd, typeRglementId,
                Granularite.depuis(granularite, Boolean.TRUE.equals(groupByYear)),
                tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Export Excel du recapitulatif (point 16).
     *
     * <p>
     * Le bouton « Exporter en excel » produisait un .csv, qu'Excel ouvre en devinant separateurs et formats. Il rend
     * desormais un vrai classeur .xlsx : montants gardes comme nombres, criteres de selection rappeles en tete, et le
     * detail mobile money pose au pied de chaque journee, comme a l'ecran et sur le PDF.
     * </p>
     */
    @GET
    @Path("export-excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportExcel(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "typeRglementId") String typeRglementId,
            @QueryParam(value = "groupByYear") Boolean groupByYear,
            @QueryParam(value = "granularite") String granularite) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        Granularite granu = Granularite.depuis(granularite, Boolean.TRUE.equals(groupByYear));
        List<StatCaisseRecetteDTO> data = caisseRecetteService.fetchStatCaisseRecettes(dtStart, dtEnd, typeRglementId,
                granu, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());

        /*
         * Une ligne d'export est soit une journee, soit le detail mobile money qui la suit. Aplatir les deux ici evite
         * de faire du classeur un cas particulier : il ecrit une liste, comme partout ailleurs.
         */
        List<LigneRecap> lignes = new java.util.ArrayList<>();
        for (StatCaisseRecetteDTO d : data) {
            lignes.add(LigneRecap.journee(d));
            String detail = rest.report.pdf.RecapCaisseRecettePdf.detailMobile(d.getDetailMobile());
            if (!detail.isEmpty()) {
                lignes.add(LigneRecap.mobile(detail));
            }
            // Retours des tests 4 : les entrees et sorties de caisse, a la suite, quand il y en a.
            String mouvements = rest.report.pdf.RecapCaisseRecettePdf.detailMouvements(d.getMontantEntre(),
                    d.getMontantSortie());
            if (!mouvements.isEmpty()) {
                lignes.add(LigneRecap.mobile(mouvements));
            }
        }

        ClasseurExcel<LigneRecap> classeur = new ClasseurExcel<LigneRecap>("Caisse recette")
                .titre("Récapitulatif caisse / recette").critere("Période", dtStart + " au " + dtEnd)
                .critere("Regroupement", granu.name().toLowerCase()).critere("Type de règlement", typeRglementId)
                .texte("Date", l -> l.date).nombre("Comptant", l -> l.nombre(l.espece))
                .nombre("Mobile", l -> l.nombre(l.mobile)).nombre("Carte bancaire", l -> l.nombre(l.cb))
                .nombre("Chèque", l -> l.nombre(l.cheque)).nombre("Virement", l -> l.nombre(l.virement))
                .nombre("Crédit", l -> l.nombre(l.credit)).nombre("Remise", l -> l.nombre(l.remise))
                .nombre("Net", l -> l.nombre(l.net)).nombre("Nbre clients", l -> l.nombre(l.clients))
                .nombre("Règlement TP", l -> l.nombre(l.reglementTp))
                .nombre("Règlement différé", l -> l.nombre(l.reglementDiff))
                .nombre("Billetage", l -> l.nombre(l.billetage)).texte("Écart", l -> l.ecart)
                .nombre("Solde", l -> l.nombre(l.solde))
                .texte("Détail (mobile money, mouvements de caisse)", l -> l.detailMobile);
        try {
            byte[] contenu = classeur.construire(lignes);
            String nom = "caisse_recette_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"))
                    + ".xlsx";
            return Response.ok(contenu).header("content-disposition", "attachment; filename=" + nom).build();
        } catch (IOException e) {
            Logger.getLogger(StatCaisseRecetteResource.class.getName()).log(Level.SEVERE, null, e);
            return Response.ok().entity(ResultFactory.getFailResult("L'export Excel a échoué")).build();
        }
    }

    /** Ligne du classeur : une journee, ou le detail mobile money pose juste en dessous. */
    private static final class LigneRecap {
        private String date = "";
        private String detailMobile = "";
        private String ecart = "";
        private boolean journee;
        private long espece;
        private long mobile;
        private long cb;
        private long cheque;
        private long virement;
        private long credit;
        private long remise;
        private long net;
        private long clients;
        private long reglementTp;
        private long reglementDiff;
        private long billetage;
        private long solde;

        static LigneRecap journee(StatCaisseRecetteDTO d) {
            LigneRecap l = new LigneRecap();
            l.journee = true;
            l.date = d.getDisplayMvtDate();
            l.espece = d.getMontantEspece();
            l.mobile = d.getMontantMobile();
            l.cb = d.getMontantCb();
            l.cheque = d.getMontantCheque();
            l.virement = d.getMontantVirement();
            l.credit = d.getMontantCredit();
            l.remise = d.getMontantRemise();
            l.net = d.getMontantNet();
            l.clients = d.getNbreClient();
            l.reglementTp = d.getMontantReglementFacture();
            l.reglementDiff = d.getMontantReglementDiff();
            l.billetage = d.getMontantBilletage();
            l.solde = d.getMontantSolde();
            // Sans billetage, il n'y a rien a comparer : un tiret, et non un ecart egal a l'oppose du comptant.
            l.ecart = d.isBilletageSaisi() ? String.valueOf(d.getMontantEcart()) : "-";
            return l;
        }

        static LigneRecap mobile(String detail) {
            LigneRecap l = new LigneRecap();
            l.detailMobile = detail;
            return l;
        }

        /** Les cellules chiffrees restent vides sur une ligne de detail : elles n'y ont pas de sens. */
        Long nombre(long valeur) {
            return journee ? Long.valueOf(valeur) : null;
        }
    }

    /**
     * Suivi des modes de reglement (point 22) : synthese par mode et series pour la courbe.
     *
     * <p>
     * L'emplacement est celui de l'utilisateur connecte, comme pour le tableau du recapitulatif : c'est la caisse qu'il
     * tient, et il ne doit pas voir celle d'une autre officine.
     * </p>
     */
    @GET
    @Path("modes")
    public Response suiviModes(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "groupByYear") Boolean groupByYear) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = caisseRecetteService.suiviModesReglement(dtStart, dtEnd, Boolean.TRUE.equals(groupByYear),
                tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("export-csv")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportToCsv(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "typeRglementId") String typeRglementId,
            @QueryParam(value = "groupByYear") Boolean groupByYear) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        StreamingOutput output = (OutputStream out) -> {
            try {
                List<StatCaisseRecetteDTO> data = caisseRecetteService.fetchStatCaisseRecettes(dtStart, dtEnd,
                        typeRglementId, groupByYear, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
                Writer writer = new OutputStreamWriter(out, "UTF-8");

                try (CSVPrinter printer = CSVFormat.EXCEL.withDelimiter(';')
                        .withHeader(StatCaisseRecetteResource.RecapHeader.class).print(writer)) {

                    data.forEach(f -> {
                        try {
                            // date,
                            // comptant,mobile,cb,cheque,virement,credit,remise,net,nbrClient,reglementTp,reglementDiff,montantBilletage,solde
                            printer.printRecord(f.getDisplayMvtDate(), f.getMontantEspece(), f.getMontantMobile(),
                                    f.getMontantCb(), f.getMontantCheque(), f.getMontantVirement(),
                                    f.getMontantCredit(), f.getMontantRemise(), f.getMontantNet(), f.getNbreClient(),
                                    f.getMontantReglementFacture(), f.getMontantReglementDiff(),
                                    f.getMontantBilletage(), f.getMontantSolde());
                        } catch (IOException ex) {
                            Logger.getLogger(StatCaisseRecetteResource.class.getName()).log(Level.SEVERE, null, ex);
                        }
                    });

                }
            } catch (IOException ex) {
                throw new WebApplicationException("File Not Found !!");
            }
        };
        String filename = "caisse_recette_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("H_mm_ss"))
                + ".csv";
        return Response.ok(output, MediaType.APPLICATION_OCTET_STREAM)
                .header("content-disposition", "attachment; filename = " + filename).build();

    }

    enum RecapHeader {
        date, comptant, mobile, cb, cheque, virement, credit, remise, net, nbrClient, reglementTp, reglementDiff,
        billetage, solde
    }
}
