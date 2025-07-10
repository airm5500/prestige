package rest.service.fne;

import dal.FneTiersPayantInvoice;
import dal.TClient;
import dal.TCompteClientTiersPayant;
import dal.TFacture;
import dal.TFactureDetail;
import dal.TOfficine;
import dal.TTiersPayant;
import dal.TUser;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.SessionHelperService;
import rest.service.exception.FneExeception;
import util.Constant;
import util.AppParameters;

/**
 *
 * @author koben
 */
@Stateless
public class FneServiceImpl implements FneService {

    private static final Logger LOG = Logger.getLogger(FneServiceImpl.class.getName());
    final AppParameters sp = AppParameters.getInstance();
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SessionHelperService sessionHelperService;

    @Override
    public void createInvoice(String idFacture) throws FneExeception {

        try {
            createInvoice(em.find(TFacture.class, idFacture));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            throw new FneExeception(e.getLocalizedMessage());
        }
    }

    private void createInvoice(TFacture facture) throws FneExeception {
        TOfficine officine = getOfficine();

        Client client = getHttpClient();
        JSONObject payload = new JSONObject(buildFromFacture(facture, officine));
        WebTarget myResource = client.target(sp.fneUrl);
        Response response = myResource.request().header("Authorization", "Bearer ".concat(sp.fnePkey))
                .post(Entity.entity(payload.toString(), MediaType.APPLICATION_JSON_TYPE));
        FneResponse fneResponse = response.readEntity(FneResponse.class);
        LOG.log(Level.INFO, "response ---  {0}", fneResponse);
        saveResponse(fneResponse, facture);

    }

    private TOfficine getOfficine() {
        return em.find(TOfficine.class, Constant.OFFICINE);
    }

    private FneInvoice buildFromFacture(TFacture facture, TOfficine officine) {
        TUser user = this.sessionHelperService.getCurrentUser();
        TTiersPayant tTiersPayant = facture.getTiersPayant();
        FneInvoice fneInvoice = new FneInvoice();
        fneInvoice.setEstablishment(officine.getStrNOMCOMPLET());
        fneInvoice.setClientCompanyName(tTiersPayant.getStrFULLNAME());
        fneInvoice.setClientEmail(tTiersPayant.getStrMAIL());
        fneInvoice.setClientPhone(tTiersPayant.getStrTELEPHONE());
        fneInvoice.setClientSellerName(user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        fneInvoice.setPointOfSale(sp.fnepointOfSale);
        fneInvoice.setClientNcc(tTiersPayant.getStrCOMPTECONTRIBUABLE());

        facture.getTFactureDetailCollection()
                .forEach(t -> fneInvoice.getItems().add(buildFrom(t, tTiersPayant.getLgTIERSPAYANTID())));
        return fneInvoice;
    }

    private FneInvoiceItem buildFrom(TFactureDetail d, String idTp) {
        TClient client = d.getClient();
        TCompteClientTiersPayant clientTiersPayant = getClientTiersPayant(client.getLgCLIENTID(), idTp);
        FneInvoiceItem invoiceItem = new FneInvoiceItem();
        invoiceItem.setAmount(d.getDblMONTANT().intValue());
        invoiceItem.setDescription(client.getStrFIRSTNAME() + " " + client.getStrLASTNAME());
        invoiceItem.setReference(clientTiersPayant.getStrNUMEROSECURITESOCIAL());
        return invoiceItem;

    }

    private TCompteClientTiersPayant getClientTiersPayant(String idClient, String idTp) {
        TypedQuery<TCompteClientTiersPayant> query = em.createQuery(
                "SELECT o FROM  TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID=?1 AND o.lgTIERSPAYANTID.lgTIERSPAYANTID=?2",
                TCompteClientTiersPayant.class);
        query.setParameter(1, idClient);
        query.setParameter(2, idTp);
        query.setMaxResults(1);
        return query.getSingleResult();
    }

    private Client getHttpClient() {
        return ClientBuilder.newClient();
    }

    private void saveResponse(FneResponse fneResponse, TFacture facture) {
        FneTiersPayantInvoice fne = new FneTiersPayantInvoice();
        fne.setFacture(facture);
        fne.getResponses().add(fneResponse);
        em.persist(fne);
    }
}
