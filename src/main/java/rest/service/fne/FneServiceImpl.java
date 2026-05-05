package rest.service.fne;

import com.google.common.util.concurrent.AtomicDouble;
import dal.TFacture;
import dal.TOfficine;
import dal.TTiersPayant;
import dal.TTypeTiersPayant;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.exception.FneExeception;
import rest.service.impl.Utils;
import util.Constant;
import util.AppParameters;
import util.DateCommonUtils;

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

    @Override
    public void createInvoice(String idFacture, TypeInvoice typeInvoice) throws FneExeception {

        try {

            createInvoice(em.find(TFacture.class, idFacture), typeInvoice);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            throw new FneExeception(e.getLocalizedMessage());
        }
    }

    @Override
    public void createGroupeInvoice(String idGroupeFactures, TypeInvoice typeInvoice) {

        fetchGroupeFactures(
                Arrays.stream(idGroupeFactures.split("_")).map(Integer::valueOf).collect(Collectors.toSet()))
                        .forEach(facture -> {
                            createInvoice(facture, typeInvoice);
                        });
    }

    private void createInvoice(TFacture facture, TypeInvoice typeInvoice) throws FneExeception {
        TOfficine officine = getOfficine();
        Client client = getHttpClient();
        JSONObject payload = new JSONObject(resolveFneInvoice(facture, officine, typeInvoice));

        WebTarget myResource = client.target(sp.fneUrl);
        Response response = myResource.request().header("Authorization", "Bearer ".concat(sp.fnePkey))
                .post(Entity.entity(payload.toString(), MediaType.APPLICATION_JSON_TYPE));
        // String fneResponse = response.readEntity(String.class);

        FneResponse fneResponse = response.readEntity(FneResponse.class);
        LOG.log(Level.INFO, "response --- {0}", fneResponse);
        saveResponse(fneResponse, facture);

    }

    private TOfficine getOfficine() {
        return em.find(TOfficine.class, Constant.OFFICINE);
    }

    private FneInvoice buildCommonFneInvoice(TTiersPayant tTiersPayant, TOfficine officine) {
        FneInvoice fneInvoice = new FneInvoice();
        fneInvoice.setEstablishment(officine.getStrNOMCOMPLET());
        fneInvoice.setClientCompanyName(tTiersPayant.getStrFULLNAME());
        fneInvoice.setClientEmail(tTiersPayant.getStrADRESSE());
        fneInvoice.setClientPhone(tTiersPayant.getStrTELEPHONE());
        fneInvoice.setPointOfSale(sp.fnepointOfSale);
        fneInvoice.setClientSellerName("Gestionnaire/Comptable");
        // on pourra recuperer le nom de l'utilisateur connecter apres pour remplacer
        fneInvoice.setClientNcc(tTiersPayant.getStrCOMPTECONTRIBUABLE());
        return fneInvoice;
    }

    private FneInvoice buildFneInvoiceForCarnet(TFacture facture, TOfficine officine, TTiersPayant tTiersPayant,
            TypeInvoice typeInvoice) {
        FneInvoice fneInvoice = buildCommonFneInvoice(tTiersPayant, officine);
        fneInvoice.setTemplate("B2C");
        List<FneInvoiceItem> fneInvoiceItems = resolveInvoiceItems(facture, tTiersPayant, typeInvoice);
        fneInvoice.setItems(fneInvoiceItems);

        return fneInvoice;
    }

    private List<FneInvoiceItem> resolveInvoiceItems(TFacture facture, TTiersPayant tTiersPayant,
            TypeInvoice typeInvoice) {
        String tiersPayantId = tTiersPayant.getLgTIERSPAYANTID();
        if (Objects.isNull(typeInvoice) || typeInvoice == TypeInvoice.GROUPE_TAUX_TVA) {
            return buildFromProduitCodeTva(facture, tiersPayantId);
        }
        return buildFneInvoiceItemParProduit(facture, tiersPayantId);
    }

    private List<FneInvoiceItem> buildFneInvoiceItemParProduit(TFacture facture, String tiersPayantId) {
        List<VenteDetail> venteDetails = fetchVenteDetail(facture.getLgFACTUREID(), tiersPayantId);

        List<FneInvoiceItem> fneInvoiceItems = new ArrayList<>();
        for (VenteDetail item : venteDetails) {
            FneInvoiceItem invoiceItem = new FneInvoiceItem();
            invoiceItem.setDescription(item.getLibelle());
            invoiceItem.setReference(item.getCodeCip());
            invoiceItem.setQuantity(item.getQuantity());
            invoiceItem.setDiscount(item.getTauxRemise());
            invoiceItem.setTaxes(new String[] { TaxeEnum.getByValue(item.getCodeTva()).name() });
            // invoiceItem.setAmount(Utils.calculHt(item.getMontantTtc(), item.getCodeTva()));
            invoiceItem.setAmount(computeTpAmount(item.getMontantTtc(), item.getCodeTva(), item.getTauxCouverture()));
            fneInvoiceItems.add(invoiceItem);
        }

        return fneInvoiceItems;
    }

    private FneInvoice buildFromFacture(TFacture facture, TOfficine officine, TTiersPayant tTiersPayant,
            TypeInvoice typeInvoice) {

        FneInvoice fneInvoice = buildCommonFneInvoice(tTiersPayant, officine);
        List<FneInvoiceItem> fneInvoiceItems = resolveInvoiceItems(facture, tTiersPayant, typeInvoice);
        fneInvoice.setItems(fneInvoiceItems);
        return fneInvoice;
    }

    private FneInvoice resolveFneInvoice(TFacture facture, TOfficine officine, TypeInvoice typeInvoice) {
        TTiersPayant tTiersPayant = facture.getTiersPayant();
        TTypeTiersPayant tTypeTiersPayant = tTiersPayant.getLgTYPETIERSPAYANTID();
        if (Constant.TYPE_TIERS_PAYANT_CARNET_ID.equals(tTypeTiersPayant.getLgTYPETIERSPAYANTID())) {
            return buildFneInvoiceForCarnet(facture, officine, tTiersPayant, typeInvoice);
        }
        return buildFromFacture(facture, officine, tTiersPayant, typeInvoice);

    }

    private Client getHttpClient() {
        return ClientBuilder.newClient();
    }

    private void saveResponse(FneResponse fneResponse, TFacture facture) {
        if (Objects.nonNull(fneResponse)) {
            facture.setFneUrl(fneResponse.getToken());
            em.merge(facture);
        }

    }

    /**
     * IMPORTANT: Dans une vente complémentaire (assurance + carnet), il existe plusieurs lignes dans
     * t_preenregistrement_compte_client_tiers_payent pour le même préenregistrement. Il faut donc filtrer cp par le
     * tiers payant demandé, sinon le taux peut être pris sur l'autre prise en charge (ex: 70% au lieu de 30%).
     */
    private List<Item> getFactureMonatantByTva(String factureId, String tiersPayantId) {
        String sqlQuery = "SELECT d.valeurTva AS codeTva ,SUM(d.int_PRICE) AS montantTTCByCodeTva,cp.int_PERCENT AS taux "
                + "FROM t_facture_detail fd "
                + "JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID=fd.P_KEY "
                + "JOIN t_preenregistrement_compte_client_tiers_payent cp ON cp.lg_PREENREGISTREMENT_ID=fd.P_KEY "
                + "JOIN t_compte_client_tiers_payant cpt ON cpt.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID "
                + "JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID=cpt.lg_TIERS_PAYANT_ID "
                + "WHERE fd.lg_FACTURE_ID=?1 AND tp.lg_TIERS_PAYANT_ID=?2 " + "GROUP BY d.valeurTva,cp.int_PERCENT "
                + "ORDER BY d.valeurTva";
        Query query = em.createNativeQuery(sqlQuery, Tuple.class).setParameter(1, factureId).setParameter(2,
                tiersPayantId);
        List<Tuple> list = query.getResultList();
        return list.stream().map(t -> buildFromTuple(t)).collect(Collectors.toList());

    }

    /**
     * IMPORTANT: Correction pour vente complémentaire: filtrer le taux sur le tiers payant demandé via cp -> cpt -> tp,
     * et ne pas s'appuyer sur fact.tiersPayant.
     *
     * Le GROUP BY précédent pouvait "choisir" un taux au hasard (MariaDB/MySQL) lorsqu'il y avait plusieurs lignes cp
     * pour le même préenregistrement.
     */
    private List<VenteDetail> fetchVenteDetail(String factureId, String tiersPayantId) {
        String sqlQuery = "SELECT cp.int_PERCENT AS tauxCouverture,COALESCE(r.dbl_TAUX,0.0)  AS tauxRemise, "
                + "d.int_PRICE_UNITAIR AS montantTtc,d.int_QUANTITY AS quantity,d.valeurTva AS codeTva,"
                + "prod.int_CIP AS codeCip,prod.str_NAME AS libelle " + "FROM t_preenregistrement_detail d "
                + "JOIN t_famille prod ON d.lg_FAMILLE_ID=prod.lg_FAMILLE_ID "
                + "JOIN t_facture_detail fd ON d.lg_PREENREGISTREMENT_ID=fd.P_KEY "
                + "LEFT JOIN t_grille_remise r ON r.lg_GRILLE_REMISE_ID=d.lg_GRILLE_REMISE_ID "
                + "JOIN t_preenregistrement_compte_client_tiers_payent cp ON cp.lg_PREENREGISTREMENT_ID=fd.P_KEY "
                + "JOIN t_compte_client_tiers_payant cpt ON cpt.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID "
                + "JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID=cpt.lg_TIERS_PAYANT_ID "
                + "WHERE fd.lg_FACTURE_ID=?1 AND tp.lg_TIERS_PAYANT_ID=?2";

        Query query = em.createNativeQuery(sqlQuery, Tuple.class).setParameter(1, factureId).setParameter(2,
                tiersPayantId);
        List<Tuple> list = query.getResultList();
        return list.stream().map(t -> buildarnetDetailFromTuple(t)).collect(Collectors.toList());

    }

    private List<TFacture> fetchGroupeFactures(Set<Integer> idGroupeFactures) {

        TypedQuery<TFacture> typedQuery = em.createQuery(
                "SELECT o FROM  TFacture o WHERE o.lgFACTUREID IN ( SELECT g.lgFACTURESID FROM TGroupeFactures g WHERE g.id IN ?1 ) ",
                TFacture.class);
        typedQuery.setParameter(1, idGroupeFactures);
        return typedQuery.getResultList();

    }

    private Item buildFromTuple(Tuple tuple) {
        return new Item(tuple.get("codeTva", Integer.class),
                tuple.get("montantTTCByCodeTva", BigDecimal.class).intValue(),
                Utils.arrondiTauxCouverture(tuple.get("taux", Integer.class)));
    }

    private VenteDetail buildarnetDetailFromTuple(Tuple tuple) {

        return new VenteDetail(tuple.get("codeTva", Integer.class), tuple.get("montantTtc", Integer.class),
                tuple.get("quantity", Integer.class), tuple.get("libelle", String.class),
                tuple.get("codeCip", String.class), tuple.get("tauxRemise", Double.class),
                tuple.get("tauxCouverture", Integer.class));
    }

    private List<FneInvoiceItem> buildFromProduitCodeTva(TFacture facture, String tiersPayantId) {
        List<Item> itemsByCodeTvaAndByTaux = getFactureMonatantByTva(facture.getLgFACTUREID(), tiersPayantId);

        List<FneInvoiceItem> fneInvoiceItems = new ArrayList<>();
        String codeFacture = facture.getStrCODEFACTURE();
        String description = "FACTURATION DU " + DateCommonUtils.format(facture.getDtDEBUTFACTURE()) + " AU "
                + DateCommonUtils.format(facture.getDtFINFACTURE());
        Map<Integer, List<Item>> codeTvaMap = itemsByCodeTvaAndByTaux.stream()
                .collect(Collectors.groupingBy(Item::getCodeTva));
        codeTvaMap.forEach((codeTva, values) -> {

            FneInvoiceItem invoiceItem = new FneInvoiceItem();
            invoiceItem.setDescription(description);
            invoiceItem.setReference(codeFacture);
            TaxeEnum taxeEnum = TaxeEnum.getByValue(codeTva);
            invoiceItem.setTaxes(new String[] { taxeEnum.name() });
            invoiceItem.setAmount(computeMontantByTvaAndTaux(codeTva, values));

            fneInvoiceItems.add(invoiceItem);

        });

        return fneInvoiceItems;
    }

    /**
     * Problème probable pour des vente avec remise, prix de reference, des facture avec remise forfetaire
     *
     * @param itemsByTva
     *
     * @return
     */
    private double computeMontantByTvaAndTaux(int codeTva, List<Item> itemsByTva) {

        AtomicDouble montantAtomicHt = new AtomicDouble(0);

        Map<Integer, List<Item>> tauxMap = itemsByTva.stream().collect(Collectors.groupingBy(Item::getTaux));
        tauxMap.forEach((tauxAssure, values) -> {
            int totalTtc = values.stream().mapToInt(Item::getMontantTtc).sum();
            montantAtomicHt.addAndGet(computeTpAmount(totalTtc, codeTva, tauxAssure));

        });
        return montantAtomicHt.get();

    }

    private double computeTpAmount(int totalTtc, int codeTva, int tauxAssure) {
        double montantHt = Utils.calculHt(totalTtc, codeTva);
        return BigDecimal.valueOf(montantHt).multiply(BigDecimal.valueOf(tauxAssure / 100.f))
                .setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    // 1428351F
    private class Item {

        private final int codeTva;
        private final int montantTtc;
        private final int taux;

        public int getCodeTva() {
            return codeTva;
        }

        public int getMontantTtc() {
            return montantTtc;
        }

        public Item(int codeTva, int montantTtc, int taux) {
            this.codeTva = codeTva;
            this.montantTtc = montantTtc;
            this.taux = taux;

        }

        public int getTaux() {
            return taux;
        }

        @Override
        public String toString() {
            return "Item{" + "codeTva=" + codeTva + ", montantTtc=" + montantTtc + ", taux=" + taux + '}';
        }

    }

    private class VenteDetail {

        private final int codeTva;
        private final int montantTtc;
        private final int quantity;
        private final String libelle;
        private final String codeCip;
        private final Double tauxRemise;
        private final int tauxCouverture;

        public VenteDetail(int codeTva, int montantTtc, int quantity, String libelle, String codeCip, Double tauxRemise,
                int tauxCouverture) {
            this.codeTva = codeTva;
            this.montantTtc = montantTtc;
            this.quantity = quantity;
            this.libelle = libelle;
            this.codeCip = codeCip;
            this.tauxRemise = tauxRemise;
            this.tauxCouverture = tauxCouverture;
        }

        public String getCodeCip() {
            return codeCip;
        }

        public Double getTauxRemise() {
            return tauxRemise;
        }

        public int getTauxCouverture() {
            return tauxCouverture;
        }

        public int getCodeTva() {
            return codeTva;
        }

        public int getMontantTtc() {
            return montantTtc;
        }

        public int getQuantity() {
            return quantity;
        }

        public String getLibelle() {
            return libelle;
        }

    }
}
