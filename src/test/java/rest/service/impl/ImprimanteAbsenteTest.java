package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import commonTasks.dto.ClotureVenteParams;
import dal.MvtTransaction;
import dal.TEmplacement;
import dal.TPreenregistrement;
import dal.TUser;
import java.lang.reflect.Proxy;
import java.util.Collections;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.print.PrintService;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retour support du 18/11 (CAISSE11, 16/11 07:53 et 08:24) : réimpression depuis « Ventes terminées » en erreur 500 «
 * Imprimante inconnue ». Le Payara de la caisse tourne en service Windows, sous le compte système, sans imprimante par
 * défaut. La réimpression ne rattrapait pas l'erreur ; la clôture répondait « Impression n'a pas aboutie », sans dire
 * pourquoi.
 */
class ImprimanteAbsenteTest {

    /** Service des tickets sans imprimante, sur une base réduite au strict nécessaire (vente encaissée). */
    static class SansImprimante extends GenerateTicketServiceImpl {
        final TPreenregistrement vente;

        SansImprimante(String type) {
            TEmplacement e = new TEmplacement();
            TUser u = new TUser();
            u.setLgEMPLACEMENTID(e);
            vente = new TPreenregistrement();
            vente.setLgPREENREGISTREMENTID("v1");
            vente.setStrREFTICKET("261116_00011");
            vente.setStrTYPEVENTE(type);
            vente.setLgUSERID(u);
        }

        @Override
        public EntityManager getEntityManager() {
            return (EntityManager) Proxy.newProxyInstance(EntityManager.class.getClassLoader(),
                    new Class<?>[] { EntityManager.class }, (p, m, a) -> {
                        switch (m.getName()) {
                        case "find":
                            return a[0] == TPreenregistrement.class ? vente : null;
                        case "createQuery":
                            return requete();
                        default:
                            return null;
                        }
                    });
        }

        /** Requête du mouvement de la vente : elle le trouve (vente encaissée). */
        private static TypedQuery<?> requete() {
            return (TypedQuery<?>) Proxy.newProxyInstance(TypedQuery.class.getClassLoader(),
                    new Class<?>[] { TypedQuery.class }, (p, m, a) -> {
                        if ("getSingleResult".equals(m.getName())) {
                            return new MvtTransaction();
                        }
                        if ("getResultList".equals(m.getName())) {
                            return Collections.emptyList();
                        }
                        return m.getReturnType().isInstance(p) ? p : null;
                    });
        }

        @Override
        public PrintService findPrintService() {
            return null;
        }

        @Override
        public String buildLineBarecode(String data) {
            return "";
        }
    }

    private static void messageClair(JSONObject r) {
        assertFalse(r.getBoolean("success"), r.toString());
        assertTrue(r.optBoolean("imprimanteAbsente"), r.toString());
        String msg = r.getString("msg");
        assertTrue(msg.contains("imprimante par défaut"), msg);
        assertTrue(msg.contains("La vente est bien enregistrée"), msg);
    }

    private static SansImprimante service(String type) {
        return new SansImprimante(type);
    }

    private static ClotureVenteParams cloture() {
        ClotureVenteParams c = new ClotureVenteParams();
        c.setVenteId("v1");
        return c;
    }

    @Test
    void reimpressionVenteComptantSans500() throws Exception {
        messageClair(service("VNO").lunchPrinterForTicket("v1"));
    }

    @Test
    void reimpressionVenteAssuranceSans500() throws Exception {
        messageClair(service("VO").lunchPrinterForTicketVo("v1"));
    }

    @Test
    void reimpressionDepotSans500() throws Exception {
        messageClair(service("DEPOT").lunchPrinterForTicketDepot("v1"));
    }

    @Test
    void clotureVenteComptantDitPourquoi() throws Exception {
        messageClair(service("VNO").lunchPrinterForTicket(cloture()));
    }

    @Test
    void clotureVenteAssuranceDitPourquoi() throws Exception {
        messageClair(service("VO").lunchPrinterForTicketVo(cloture()));
    }

    @Test
    void clotureDepotDitPourquoi() throws Exception {
        messageClair(service("DEPOT").lunchPrinterForTicketDepot(cloture()));
    }

    /**
     * Question de l'utilisateur du 18/11 : règlement de facture fait sur serveur:8080. Le ticket part sur l'imprimante
     * du Payara du serveur ; sans imprimante par défaut, le message doit parler du règlement (enregistré avant
     * l'impression), jamais d'une vente.
     */
    private static void reglementClair(JSONObject r) {
        assertFalse(r.getBoolean("success"), r.toString());
        assertTrue(r.optBoolean("imprimanteAbsente"), r.toString());
        String msg = r.getString("msg");
        assertTrue(msg.contains("imprimante par défaut"), msg);
        assertTrue(msg.contains("Le règlement est bien enregistré"), msg);
        assertFalse(msg.contains("vente"), msg);
    }

    @Test
    void reglementDeFactureParleDuReglement() {
        reglementClair(service("VO").printReglementFacture("d1", new TUser()));
    }

    @Test
    void reglementDiffereParleDuReglement() throws Exception {
        reglementClair(service("VNO").ticketReglementDiffere("d1"));
    }

    @Test
    void reglementCarnetParleDuReglement() throws Exception {
        reglementClair(service("CARNET").ticketReglementCarnet("d1"));
    }

    @Test
    void messageSelonLOperation() {
        String vente = ChoixImprimante.message("CAISSE11", 0);
        assertTrue(vente.contains("du poste CAISSE11") && vente.contains("La vente est bien enregistrée"), vente);
        String reglement = ChoixImprimante.message("SERVEUR", 2, ChoixImprimante.REGLEMENT);
        assertTrue(reglement.contains("du poste SERVEUR") && reglement.contains("Le règlement est bien enregistré")
                && reglement.contains("2 imprimantes installées"), reglement);
        String z = ChoixImprimante.message("SERVEUR", 0, ChoixImprimante.TICKET_Z);
        assertTrue(z.contains("ticket Z") && !z.contains("vente"), z);
    }

    /**
     * Demande 65 (19/11) : l'aperçu et l'image du ticket (mobile, borne) ne passent jamais par l'imprimante du serveur.
     * Sur un serveur sans imprimante, ils doivent rester construits ; le refus « Ticket non imprimé » ne vaut que pour
     * une impression réelle.
     */
    private static void apercuSansRefus(String type, Apercu a) {
        try {
            a.lancer(service(type));
        } catch (RuntimeException e) {
            String m = String.valueOf(e.getMessage());
            assertFalse(m.contains("imprimante par défaut") || m.contains("Ticket non imprimé"), type + " : " + m);
        }
    }

    private interface Apercu {
        Object lancer(SansImprimante s);
    }

    @Test
    void apercuVenteComptantSansImprimante() {
        apercuSansRefus("VNO", s -> s.apercuTicketVno("v1"));
    }

    @Test
    void apercuVenteAssuranceSansImprimante() {
        apercuSansRefus("VO", s -> s.apercuTicketVo("v1"));
    }

    @Test
    void apercuReglementDiffereSansImprimante() {
        apercuSansRefus("VNO", s -> s.apercuTicketReglementDiffere("d1"));
    }

    @Test
    void impressionReelleToujoursRefuseeApresUnApercu() throws Exception {
        SansImprimante s = service("VNO");
        try {
            s.apercuTicketVno("v1");
        } catch (RuntimeException e) {
            // l'aperçu peut échouer plus loin sur la base réduite : seule la suite compte
        }
        messageClair(s.lunchPrinterForTicket("v1"));
    }
}
