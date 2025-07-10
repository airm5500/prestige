
package rest.service.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import dal.TClient;
import dal.TPreenregistrement;
import dal.TTiersPayant;
import dal.TUser;
import dal.VenteExclus;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 *
 * @author koben
 */
public class VenteExclusDTO {

    private String id;
    private Integer montantVente = 0;

    private Integer montantRegle = 0;

    private Integer montantTiersPayant = 0;

    private Integer montantPaye = 0;

    private Integer montantClient = 0;

    private String preenregistrementRef;
    private String preenregistrementTicketNum;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy")
    private LocalDate mvtDate;

    private String mvtTransactionKey;

    private String tiersPayantId;
    private String tiersPayantName;
    private String clientFullName;
    private String clientId;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy HH:mm:ss")
    private LocalDateTime createdAt;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy HH:mm:ss")
    private LocalDateTime modifiedAt;
    private String refBon;
    private String userFullName;
    private String userId;

    public String getUserFullName() {
        return userFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getModifiedAt() {
        return modifiedAt;
    }

    public void setModifiedAt(LocalDateTime modifiedAt) {
        this.modifiedAt = modifiedAt;
    }

    public Integer getMontantVente() {
        return montantVente;
    }

    public void setMontantVente(Integer montantVente) {
        this.montantVente = montantVente;
    }

    public String getRefBon() {
        return refBon;
    }

    public void setRefBon(String refBon) {
        this.refBon = refBon;
    }

    public Integer getMontantRegle() {
        return montantRegle;
    }

    public void setMontantRegle(Integer montantRegle) {
        this.montantRegle = montantRegle;
    }

    public Integer getMontantTiersPayant() {
        return montantTiersPayant;
    }

    public void setMontantTiersPayant(Integer montantTiersPayant) {
        this.montantTiersPayant = montantTiersPayant;
    }

    public Integer getMontantPaye() {
        return montantPaye;
    }

    public void setMontantPaye(Integer montantPaye) {
        this.montantPaye = montantPaye;
    }

    public Integer getMontantClient() {
        return montantClient;
    }

    public void setMontantClient(Integer montantClient) {
        this.montantClient = montantClient;
    }

    public String getPreenregistrementRef() {
        return preenregistrementRef;
    }

    public void setPreenregistrementRef(String preenregistrementRef) {
        this.preenregistrementRef = preenregistrementRef;
    }

    public String getPreenregistrementTicketNum() {
        return preenregistrementTicketNum;
    }

    public void setPreenregistrementTicketNum(String preenregistrementTicketNum) {
        this.preenregistrementTicketNum = preenregistrementTicketNum;
    }

    public LocalDate getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(LocalDate mvtDate) {
        this.mvtDate = mvtDate;
    }

    public String getMvtTransactionKey() {
        return mvtTransactionKey;
    }

    public void setMvtTransactionKey(String mvtTransactionKey) {
        this.mvtTransactionKey = mvtTransactionKey;
    }

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public String getTiersPayantName() {
        return tiersPayantName;
    }

    public void setTiersPayantName(String tiersPayantName) {
        this.tiersPayantName = tiersPayantName;
    }

    public String getClientFullName() {
        return clientFullName;
    }

    public void setClientFullName(String clientFullName) {
        this.clientFullName = clientFullName;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public VenteExclusDTO(VenteExclus venteExclus) {
        this.id = venteExclus.getId();
        TPreenregistrement preenregistrement = venteExclus.getPreenregistrement();
        this.refBon = preenregistrement.getStrREFBON();
        this.preenregistrementRef = preenregistrement.getStrREF();
        this.preenregistrementTicketNum = preenregistrement.getStrREFTICKET();
        this.mvtDate = venteExclus.getMvtDate();
        this.mvtTransactionKey = venteExclus.getMvtTransactionKey();
        TTiersPayant payant = venteExclus.getTiersPayant();
        this.tiersPayantId = payant.getLgTIERSPAYANTID();
        this.tiersPayantName = payant.getStrFULLNAME();
        TClient client = venteExclus.getClient();
        this.clientFullName = String.format("%s %s", client.getStrFIRSTNAME(), client.getStrLASTNAME());
        this.clientId = client.getLgCLIENTID();
        this.createdAt = venteExclus.getCreatedAt();
        this.modifiedAt = venteExclus.getModifiedAt();
        TUser user = preenregistrement.getLgUSERID();
        this.userFullName = String.format("%s %s", user.getStrFIRSTNAME(), user.getStrLASTNAME());
        this.userId = user.getLgUSERID();
        this.montantTiersPayant = venteExclus.getMontantTiersPayant();
        this.montantClient = venteExclus.getMontantClient();
        this.montantPaye = venteExclus.getMontantPaye();
        this.montantVente = venteExclus.getMontantVente();

    }

}
