package rest.service.impl;

import dal.TEmplacement;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TTypeStock;
import dal.TTypeStockFamille;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.servlet.http.Part;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.json.JSONObject;
import rest.service.DepotService;
import rest.service.SessionHelperService;

/**
 *
 * @author koben
 */
@Stateless
public class DepotServiceImpl implements DepotService {

    private static final Logger LOG = Logger.getLogger(DepotServiceImpl.class.getName());
    @EJB
    private SessionHelperService sessionHelperService;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject importStockDepot(Part part) {
        AtomicInteger count = new AtomicInteger();
        AtomicInteger size = new AtomicInteger();
        JSONObject json = new JSONObject();
        StringBuilder sb = new StringBuilder();
        TEmplacement emplacement = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID();
        String idEmpl = emplacement.getLgEMPLACEMENTID();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(part.getInputStream()))) {
            Iterable<CSVRecord> records = CSVFormat.EXCEL.withDelimiter(';').parse(br);

            records.forEach(rec -> {
                size.incrementAndGet();
                if (size.get() == 1) {

                    return;
                }

                String id = rec.get(0);
                String cip = rec.get(1);
                int qty = Integer.parseInt(rec.get(2));
                findProduit(id, cip).ifPresentOrElse(produit -> {
                    findTFamilleStock(produit.getLgFAMILLEID(), idEmpl).ifPresentOrElse(
                            stock -> sb.append("Le produit ").append(cip).append(" existe déjà"), () -> {
                                createFamilleStock(qty, produit, emplacement);
                                createTypeStock(qty, produit, emplacement);
                                count.incrementAndGet();
                            });

                }, () -> sb.append("Le produit ").append(cip).append("n'existe pas en base de données "));
            });
            sb.append("\n").append("<span style='color:blue;font-weight:800;'>").append(count.get()).append("/")
                    .append(size.get()).append("</span> produits mis à jour");
        } catch (Exception e) {
            json.put("statut", 0);
            LOG.log(Level.SEVERE, "importation : ", e);
        }
        return json.put("statut", 1).put("success", sb.toString());
    }

    private TTypeStockFamille createTypeStock(int qty, TFamille f, TEmplacement emplacement) {
        TTypeStockFamille famille = new TTypeStockFamille(UUID.randomUUID().toString());
        famille.setIntNUMBER(qty);
        famille.setLgFAMILLEID(f);
        famille.setLgEMPLACEMENTID(emplacement);
        famille.setLgTYPESTOCKID(getTTypeStock("3"));
        famille.setStrNAME("");
        famille.setStrDESCRIPTION("");
        em.persist(famille);
        return famille;
    }

    private void createFamilleStock(int qty, TFamille famille, TEmplacement emplacement) {
        TFamilleStock stock = new TFamilleStock(UUID.randomUUID().toString());
        stock.setLgFAMILLEID(famille);
        stock.setLgEMPLACEMENTID(emplacement);
        stock.setIntNUMBER(qty);
        stock.setIntNUMBERAVAILABLE(qty);
        em.persist(stock);

    }

    private TTypeStock getTTypeStock(String id) {
        return new TTypeStock(id);
    }

    private Optional<TFamilleStock> findTFamilleStock(String idProduit, String idEmpl) {

        try {
            TypedQuery<TFamilleStock> query = em
                    .createNamedQuery("TFamilleStock.findFamilleStockByProduitAndEmplacement", TFamilleStock.class);
            query.setParameter("lgFAMILLEID", idProduit);
            query.setParameter("lgEMPLACEMENTID", idEmpl);
            query.setMaxResults(1);
            return Optional.ofNullable(query.getSingleResult());

        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private Optional<TFamille> findFamilleByCip(String cip) {

        try {
            TypedQuery<TFamille> query = em.createQuery(
                    "SELECT o FROM  TFamille o LEFT JOIN o.tFamilleGrossisteCollection fp WHERE (fp.strCODEARTICLE LIKE ?1 OR o.intCIP LIKE ?1)",
                    TFamille.class);
            query.setParameter(1, cip + "%");
            query.setMaxResults(1);
            return Optional.ofNullable(query.getSingleResult());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "findFamilleByCip", e);
            return Optional.empty();
        }
    }

    private Optional<TFamille> findProduit(String id, String cip) {
        return findById(id).or(() -> findFamilleByCip(cip));
    }

    private Optional<TFamille> findById(String id) {
        if (org.apache.commons.lang.StringUtils.isEmpty(id)) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(em.find(TFamille.class, id));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "findById", e);
            return Optional.empty();
        }
    }
}
