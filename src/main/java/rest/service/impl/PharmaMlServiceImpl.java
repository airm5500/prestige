/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.Rupture;
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
import javax.ejb.EJB;
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
import org.json.JSONObject;
import rest.service.OrderService;
import rest.service.PharmaMlService;
import rest.service.ProduitService;
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

    public EntityManager getEntityManager() {
        return em;
    }

    private List<TOrderDetail> findByOrder(TOrder order) {
        TypedQuery<TOrderDetail> q = getEntityManager().createNamedQuery("TOrderDetail.findByLgORDERID",
                TOrderDetail.class);
        q.setParameter("lgORDERID", order);
        return q.getResultList();
    }

    private TFamilleGrossiste findByGrossisteAndFamille(String idProduit, String grossisteId) {
        try {
            TypedQuery<TFamilleGrossiste> q = getEntityManager().createQuery(
                    "SELECT o FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgGROSSISTEID.lgGROSSISTEID=?2 AND o.strSTATUT='enable' ",
                    TFamilleGrossiste.class);
            q.setParameter(1, idProduit);
            q.setParameter(2, grossisteId);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            // LOG.log(Level.SEVERE, null, e);
            return null;
        }
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

            return processommandeXml(em.find(TOrder.class, commandeId));
            // return processommandeTestFromFileXml(em.find(TOrder.class, commandeId)); // pour tester un fichier de
            // reponse

        } catch (JAXBException | IOException | InterruptedException ex) {
            LOG.log(Level.SEVERE, null, ex);
            return new JSONObject().put("success", true).put("msg", ex.getLocalizedMessage());
        }
    }

    private JSONObject processommandeXml(TOrder order) throws JAXBException, IOException, InterruptedException {

        TGrossiste grossiste = order.getLgGROSSISTEID();
        if (StringUtils.isEmpty(grossiste.getStrURLPHARMAML())) {
            return new JSONObject().put("success", false).put("msg", "Le grossise n'a url pharmaML");
        }
        TOfficine of = em.find(TOfficine.class, Constant.OFFICINE);
        CsrpEnveloppe payLoad = buildPayload(order, grossiste, of, null);

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
                .header("Content-Type", "text/xml; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(sw.toString())).build();

        HttpResponse<String> httpResponse = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        return processResponse(httpResponse, fileName, order);

    }

    private JSONObject processommandeTestFromFileXml(TOrder order)
            throws JAXBException, IOException, InterruptedException {

        return processResponseTesting(order);

    }

    private JSONObject processResponseTesting(TOrder order) {
        return traiterCommandeRepondue(order, loadFromFileForTestingPurpose());
    }

    private JSONObject processResponse(HttpResponse<String> httpResponse, String fileName, TOrder order) {
        int httpCode = httpResponse.statusCode();

        if (httpCode == 200) {

            try {

                JAXBContext jaxbContext = JAXBContext.newInstance(CsrpEnveloppeResponse.class);
                Unmarshaller unmarshaller = jaxbContext.createUnmarshaller();
                CsrpEnveloppeResponse response = (CsrpEnveloppeResponse) unmarshaller
                        .unmarshal(new StringReader(httpResponse.body()));
                // a supprimer a l'avenir
                createSaveXmlFile(jaxbContext.createMarshaller(), response, "R", fileName);

                return traiterCommandeRepondue(order, response);

            } catch (JAXBException | IOException ex) {
                LOG.log(Level.SEVERE, "processResponse", ex);
            }

        } else {
            saveResponse(httpResponse.body(), "LOG_" + fileName);
        }
        return new JSONObject().put("success", false);
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
    private void addRemplacement(LigneNReponse ligneNReponse, TOrderDetail origin, TFamille famille, TOrder order) {
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
            processRemplacement(ligneNReponse, grossiste, orderDetail, order);
            if (ligneNReponse.getQuantiteLivree() == 0) {
                em.remove(orderDetail);
            }
        });

    }

    private void processRemplacement(LigneNReponse ligneNReponse, TGrossiste grossiste, TOrderDetail origin,
            TOrder order) {
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
                addRemplacement(ligneNReponse, origin, famille, order);
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

    private HttpClient getHttpClient() {
        return HttpClient.newHttpClient();
    }

    private CsrpEnveloppe buildPayload(TOrder order, TGrossiste grossiste, TOfficine of, String commentiare) {

        CsrpEnveloppe ce = new CsrpEnveloppe();
        ce.setUsage(PharmaMlUtils.USAGE_VALUE);
        ce.setVersionProtocole(PharmaMlUtils.VERSION_PROTOCLE_VALUE);
        ce.setVersionLogiciel(PharmaMlUtils.VERSION_LOGICIEL_VALUE);
        ce.setIdLogiciel(PharmaMlUtils.ID_LOGICIEL_VALUE);
        ce.setEntete(buildEntete(grossiste, of));
        ce.setCorps(buildCorps(order, commentiare));
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

    private MessageCorps buildMessageCorps(TOrder order, String commentaire, String idGrossiste) {
        MessageCorps mc = new MessageCorps();
        mc.setCommande(buildCommande(order, commentaire, idGrossiste));
        return mc;
    }

    private Commande buildCommande(TOrder order, String commentaire, String idGrossiste) {
        Commande c = new Commande();
        c.setDateLivraison(LocalDate.now().plusDays(1).toString());
        if (StringUtils.isNotEmpty(commentaire)) {
            c.setCommentaireGeneral(commentaire);
        } else {
            c.setCommentaireGeneral(order.getStrREFORDER());
        }

        c.setRefCdeClient(order.getStrREFORDER());
        c.setNormale(buildNormale(order, idGrossiste));
        return c;
    }

    private List<LigneN> buildCommandeLigne(TOrder order, String grossisteId) {
        AtomicInteger count = new AtomicInteger(1);
        return new ArrayList<>(order.getTOrderDetailCollection()).stream().map(item -> {
            LigneN ligne = new LigneN();
            TFamille famille = item.getLgFAMILLEID();
            TFamilleGrossiste familleGrossiste = orderService
                    .finFamilleGrossisteByFamilleCipAndIdGrossiste(famille.getIntCIP(), grossisteId);

            String numLigne = StringUtils.leftPad(count.getAndIncrement() + "", 4, '0');
            String quantite = StringUtils.leftPad(item.getIntNUMBER() + "", 4, '0');
            String cip = null;
            if (familleGrossiste != null && StringUtils.isEmpty(familleGrossiste.getStrCODEARTICLE())) {
                cip = familleGrossiste.getStrCODEARTICLE();
            }
            if (StringUtils.isEmpty(cip)) {
                cip = item.getLgFAMILLEID().getIntCIP();
            }
            ligne.setCodeProduit(cip);
            ligne.setQuantite(quantite);
            ligne.setNumLigne(numLigne);
            ligne.setTypeCodification(typeCodification(cip));
            return ligne;

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

    private Corps buildCorps(TOrder order, String commentaire) {

        Corps c = new Corps();
        c.setMessageOfficine(buildMessageOfficine(order, commentaire));

        return c;
    }

    private MessageOfficine buildMessageOfficine(TOrder order, String commentaire) {
        TGrossiste grossiste = order.getLgGROSSISTEID();
        MessageOfficine messageOfficine = new MessageOfficine();
        messageOfficine.setEntete(buildMessageEntete(grossiste));
        messageOfficine.setCorps(buildMessageCorps(order, commentaire, grossiste.getLgGROSSISTEID()));
        return messageOfficine;
    }

    private void createSaveXmlFile(Marshaller marshaller, Object objectToSave, String prefix, String fileName)
            throws IOException, JAXBException {
        Path path = Paths.get(ap.pharmaMlDir + File.separator + prefix.toUpperCase() + "_" + fileName + ".xml");
        try (OutputStream os = Files.newOutputStream(path)) {
            marshaller.marshal(objectToSave, os);
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
}
