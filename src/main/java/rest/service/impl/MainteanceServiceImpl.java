package rest.service.impl;

import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TGrossiste;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.collections4.CollectionUtils;
import org.json.JSONObject;
import rest.service.MainteanceService;
import rest.service.dto.DoublonsDTO;
import util.DateUtil;
import util.FunctionUtils;

/**
 *
 * @author koben
 */
@Stateless
public class MainteanceServiceImpl implements MainteanceService {

    private static final Logger LOG = Logger.getLogger(MainteanceServiceImpl.class.getName());

    private static final String GROSSISTE_PRODUIT_UNIQUE_CONSTRAINT_REMOVE = " ALTER TABLE t_famille_grossiste DROP CONSTRAINT  un_gros_ci";
    private static final String GROSSISTE_PRODUIT_UNIQUE_CONSTRAINT_QUERY = "ALTER TABLE t_famille_grossiste ADD  CONSTRAINT  const_gros_produit UNIQUE (lg_FAMILLE_ID,lg_GROSSISTE_ID)";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private List<DoublonsDTO> familleProduit(Tuple tuple) {

        return this.em.createQuery(
                "SELECT o FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgGROSSISTEID.lgGROSSISTEID=?2",
                TFamilleGrossiste.class).setParameter(1, tuple.get("produitId", String.class))
                .setParameter(2, tuple.get("grossisteId", String.class)).getResultList().stream()
                .map(this::buildDoublon).collect(Collectors.toList());
    }

    @Override
    public JSONObject getDoublonsFamilleGrossistes() {
        List<DoublonsDTO> list = fetchDoublonsFamilleGrossistes();
        list.sort(Comparator.comparing(DoublonsDTO::getProduitId));
        return FunctionUtils.returnData(list, list.size());
    }

    private List<DoublonsDTO> fetchDoublonsFamilleGrossistes() {
        List<DoublonsDTO> list = new ArrayList<>();
        try {
            ((List<Tuple>) em.createNativeQuery(
                    "SELECT COUNT(f.lg_FAMILLE_ID) AS produit_count, f.lg_FAMILLE_ID AS produitId,f.lg_GROSSISTE_ID AS grossisteId FROM t_famille_grossiste f,t_famille p WHERE f.lg_FAMILLE_ID=p.lg_FAMILLE_ID  GROUP BY f.lg_FAMILLE_ID,f.lg_GROSSISTE_ID HAVING  produit_count>1",
                    Tuple.class).getResultList()).forEach(t -> list.addAll(familleProduit(t)));

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
        return list;
    }

    private DoublonsDTO buildDoublon(TFamilleGrossiste familleGrossiste) {
        TFamille famille = familleGrossiste.getLgFAMILLEID();
        TGrossiste grossiste = familleGrossiste.getLgGROSSISTEID();
        return DoublonsDTO.builder().cip(famille.getIntCIP()).libelle(famille.getStrNAME())
                .produitId(famille.getLgFAMILLEID().concat(grossiste.getLgGROSSISTEID()))
                .statut("enable".equals(familleGrossiste.getStrSTATUT()) ? "Actif" : "Désactivé")
                .codeProduit(familleGrossiste.getStrCODEARTICLE()).id(familleGrossiste.getLgFAMILLEGROSSISTEID())
                .libelleGrossiste(familleGrossiste.getLgGROSSISTEID().getStrLIBELLE())
                .prixAchat(familleGrossiste.getIntPAF()).prixUnitaire(familleGrossiste.getIntPRICE())
                .dateCreation(DateUtil.convertDateToDD_MM_YYYY_HH_mm(familleGrossiste.getDtCREATED()))
                .dateModification(DateUtil.convertDateToDD_MM_YYYY_HH_mm(familleGrossiste.getDtUPDATED())).build();
    }

    @Override
    public void remove(Set<String> ids) {
        ids.stream().forEach(this::remoteFamilleGrossiste);
    }

    @Override
    public void remoteFamilleGrossiste(String id) {
        this.em.remove(this.em.find(TFamilleGrossiste.class, id));
    }

    private void removeOldConstraint() {
        this.em.createNativeQuery(GROSSISTE_PRODUIT_UNIQUE_CONSTRAINT_REMOVE).executeUpdate();

    }

    private void addNexConstraint() {
        this.em.createNativeQuery(GROSSISTE_PRODUIT_UNIQUE_CONSTRAINT_QUERY).executeUpdate();

    }

    @Override
    public void addConstraint() throws Exception {
        List<DoublonsDTO> list = fetchDoublonsFamilleGrossistes();
        if (CollectionUtils.isNotEmpty(list)) {
            throw new Exception("Il existe encore des doublons non supprimés");
        }
        removeOldConstraint();
        addNexConstraint();
    }

    private class MvtTransactionDTO {

        private final String uuid;
        private final Integer montant;
        private final Integer montantRestant;
        private final Integer montantRegle;
        private final Integer montantCredit;

        private final Integer montantNet;

        private final Integer montantRemise;

        private final Integer montantPaye;

        private final Integer avoidAmount;

        private final Integer montantAcc;

        private final Boolean checked;

        private final LocalDate mvtDate;

        private final LocalDateTime createdAt;

        private final String user;

        private final String magasin;

        private final String reglement;

        private final String tTypeMvtCaisse;

        private final Integer typeTransaction;

        private final Integer categoryTransaction;

        private final String pkey;

        private final String reference;

        private final String caisse;

        private final Integer montantTva = 0;

        private final Integer marge = 0;

        private final String organisme;

        private final Integer margeug = 0;

        private final Integer montantttcug = 0;

        private final Integer montantnetug = 0;

        private final Integer montantTvaUg = 0;

        private final String preenregistrement;

        private final Boolean flaged;

        private final Integer cmuAmount = 0;

        public String getUuid() {
            return uuid;
        }

        public Integer getMontant() {
            return montant;
        }

        public Integer getMontantRestant() {
            return montantRestant;
        }

        public Integer getMontantRegle() {
            return montantRegle;
        }

        public Integer getMontantCredit() {
            return montantCredit;
        }

        public Integer getMontantNet() {
            return montantNet;
        }

        public Integer getMontantRemise() {
            return montantRemise;
        }

        public Integer getMontantPaye() {
            return montantPaye;
        }

        public Integer getAvoidAmount() {
            return avoidAmount;
        }

        public Integer getMontantAcc() {
            return montantAcc;
        }

        public Boolean getChecked() {
            return checked;
        }

        public LocalDate getMvtDate() {
            return mvtDate;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }

        public String getUser() {
            return user;
        }

        public String getMagasin() {
            return magasin;
        }

        public String getReglement() {
            return reglement;
        }

        public String gettTypeMvtCaisse() {
            return tTypeMvtCaisse;
        }

        public Integer getTypeTransaction() {
            return typeTransaction;
        }

        public Integer getCategoryTransaction() {
            return categoryTransaction;
        }

        public String getPkey() {
            return pkey;
        }

        public String getReference() {
            return reference;
        }

        public String getCaisse() {
            return caisse;
        }

        public Integer getMontantTva() {
            return montantTva;
        }

        public Integer getMarge() {
            return marge;
        }

        public String getOrganisme() {
            return organisme;
        }

        public Integer getMargeug() {
            return margeug;
        }

        public Integer getMontantttcug() {
            return montantttcug;
        }

        public Integer getMontantnetug() {
            return montantnetug;
        }

        public Integer getMontantTvaUg() {
            return montantTvaUg;
        }

        public String getPreenregistrement() {
            return preenregistrement;
        }

        public Boolean getFlaged() {
            return flaged;
        }

        public Integer getCmuAmount() {
            return cmuAmount;
        }

        public MvtTransactionDTO(String uuid, Integer montant, Integer montantRestant, Integer montantRegle,
                Integer montantCredit, Integer montantNet, Integer montantRemise, Integer montantPaye,
                Integer avoidAmount, Integer montantAcc, Boolean checked, LocalDate mvtDate, LocalDateTime createdAt,
                String user, String magasin, String reglement, String tTypeMvtCaisse, Integer typeTransaction,
                Integer categoryTransaction, String pkey, String reference, String caisse, String organisme,
                String preenregistrement, Boolean flaged) {
            this.uuid = uuid;
            this.montant = montant;
            this.montantRestant = montantRestant;
            this.montantRegle = montantRegle;
            this.montantCredit = montantCredit;
            this.montantNet = montantNet;
            this.montantRemise = montantRemise;
            this.montantPaye = montantPaye;
            this.avoidAmount = avoidAmount;
            this.montantAcc = montantAcc;
            this.checked = checked;
            this.mvtDate = mvtDate;
            this.createdAt = createdAt;
            this.user = user;
            this.magasin = magasin;
            this.reglement = reglement;
            this.tTypeMvtCaisse = tTypeMvtCaisse;
            this.typeTransaction = typeTransaction;
            this.categoryTransaction = categoryTransaction;
            this.pkey = pkey;
            this.reference = reference;
            this.caisse = caisse;
            this.organisme = organisme;
            this.preenregistrement = preenregistrement;
            this.flaged = flaged;
        }

    }

    private class HMvtProduitDTO {

        private final String uuid;

        private final LocalDate mvtDate;

        private final LocalDateTime createdAt;

        private final Integer qteDebut;

        private final Integer qteFinale;

        private final Integer qteMvt;

        private final String pkey;

        private final String famille;

        private final String typemvtproduit;

        private final Integer prixUn;
        private final Integer prixAchat;
        private final Integer valeurTva;

        private final Boolean checked;

        private final Integer ug;

        private final Integer cmuPrice;

        private final String preenregistrementDetail;

        public String getUuid() {
            return uuid;
        }

        public LocalDate getMvtDate() {
            return mvtDate;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }

        public Integer getQteDebut() {
            return qteDebut;
        }

        public Integer getQteFinale() {
            return qteFinale;
        }

        public Integer getQteMvt() {
            return qteMvt;
        }

        public String getPkey() {
            return pkey;
        }

        public String getFamille() {
            return famille;
        }

        public String getTypemvtproduit() {
            return typemvtproduit;
        }

        public Integer getPrixUn() {
            return prixUn;
        }

        public Integer getPrixAchat() {
            return prixAchat;
        }

        public Integer getValeurTva() {
            return valeurTva;
        }

        public Boolean getChecked() {
            return checked;
        }

        public Integer getUg() {
            return ug;
        }

        public Integer getCmuPrice() {
            return cmuPrice;
        }

        public String getPreenregistrementDetail() {
            return preenregistrementDetail;
        }

        public HMvtProduitDTO(String uuid, LocalDate mvtDate, LocalDateTime createdAt, Integer qteDebut,
                Integer qteFinale, Integer qteMvt, String pkey, String famille, String typemvtproduit, Integer prixUn,
                Integer prixAchat, Integer valeurTva, Boolean checked, Integer ug, Integer cmuPrice,
                String preenregistrementDetail) {
            this.uuid = uuid;
            this.mvtDate = mvtDate;
            this.createdAt = createdAt;
            this.qteDebut = qteDebut;
            this.qteFinale = qteFinale;
            this.qteMvt = qteMvt;
            this.pkey = pkey;
            this.famille = famille;
            this.typemvtproduit = typemvtproduit;
            this.prixUn = prixUn;
            this.prixAchat = prixAchat;
            this.valeurTva = valeurTva;
            this.checked = checked;
            this.ug = ug;
            this.cmuPrice = cmuPrice;
            this.preenregistrementDetail = preenregistrementDetail;
        }
    }

}
