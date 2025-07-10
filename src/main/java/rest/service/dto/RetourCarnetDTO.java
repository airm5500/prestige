/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.dto;

import dal.RetourCarnet;
import dal.TTiersPayant;
import dal.TUser;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import util.DateConverter;

/**
 *
 * @author koben
 */
public class RetourCarnetDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer id;

    private String libelle;

    private String user;

    private LocalDateTime createdAt;
    private String dateOperation;

    private String status;
    private String tierspayantName;
    private String tierspayantId;
    private TUser operateur;
    private String details = " ";
    private List<RetourCarnetDetailDTO> items = new ArrayList<>();

    private long montant;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(String dateOperation) {
        this.dateOperation = dateOperation;
    }

    public String getTierspayantName() {
        return tierspayantName;
    }

    public void setTierspayantName(String tierspayantName) {
        this.tierspayantName = tierspayantName;
    }

    public String getTierspayantId() {
        return tierspayantId;
    }

    public void setTierspayantId(String tierspayantId) {
        this.tierspayantId = tierspayantId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public TUser getOperateur() {
        return operateur;
    }

    public void setOperateur(TUser operateur) {
        this.operateur = operateur;
    }

    public RetourCarnetDTO() {
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public List<RetourCarnetDetailDTO> getItems() {
        return items;
    }

    public void setItems(List<RetourCarnetDetailDTO> items) {
        this.items = items;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }

    public RetourCarnetDTO montant(long montant) {
        this.montant = montant;
        return this;
    }

    public RetourCarnetDTO(RetourCarnet retourCarnet) {
        this.id = retourCarnet.getId();
        this.libelle = retourCarnet.getLibelle();
        TUser userop = retourCarnet.getUser();
        this.operateur = userop;
        this.user = userop.getStrFIRSTNAME().concat(" ").concat(userop.getStrLASTNAME());
        this.createdAt = retourCarnet.getCreatedAt();
        this.dateOperation = retourCarnet.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyyy HH:mm:ss"));
        this.status = retourCarnet.getStatus();
        TTiersPayant payant = retourCarnet.getTierspayant();
        this.tierspayantName = payant.getStrFULLNAME();
        this.tierspayantId = payant.getLgTIERSPAYANTID();

    }

    public RetourCarnetDTO(RetourCarnet retourCarnet, List<RetourCarnetDetailDTO> items) {
        this.id = retourCarnet.getId();
        this.libelle = retourCarnet.getLibelle();
        TUser userop = retourCarnet.getUser();
        this.user = userop.getStrFIRSTNAME().concat(" ").concat(userop.getStrLASTNAME());
        this.createdAt = retourCarnet.getCreatedAt();
        this.dateOperation = retourCarnet.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyyy HH:mm:ss"));
        this.status = retourCarnet.getStatus();
        TTiersPayant payant = retourCarnet.getTierspayant();
        this.tierspayantName = payant.getStrFULLNAME();
        this.tierspayantId = payant.getLgTIERSPAYANTID();
        items.forEach((tpd) -> {
            this.details = "<b><span style='display:inline-block;width: 7%;'>" + tpd.getProduitCip()
                    + "</span><span style='display:inline-block;width: 25%;'>" + tpd.getProduitLib()
                    + "</span><span style='display:inline-block;width: 10%;'>(" + tpd.getQtyRetour()
                    + ")</span><span style='display:inline-block;width: 15%;'>"
                    + DateConverter.amountFormat(tpd.getPrixUni(), '.') + " F CFA " + "</span></b><br> " + this.details;
        });
    }

    public RetourCarnetDTO(RetourCarnet retourCarnet, long amount) {
        this.id = retourCarnet.getId();
        this.libelle = retourCarnet.getLibelle();
        TUser userop = retourCarnet.getUser();
        this.user = userop.getStrFIRSTNAME().concat(" ").concat(userop.getStrLASTNAME());
        this.createdAt = retourCarnet.getCreatedAt();
        this.dateOperation = retourCarnet.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyyy HH:mm:ss"));
        this.status = retourCarnet.getStatus();
        TTiersPayant payant = retourCarnet.getTierspayant();
        this.tierspayantName = payant.getStrFULLNAME();
        this.tierspayantId = payant.getLgTIERSPAYANTID();
        this.montant = amount;

    }

    public static RetourCarnetDTO buildRetourCarnetDTO(RetourCarnet retourCarnet, List<RetourCarnetDetailDTO> items) {
        RetourCarnetDTO retourCarnetDto = new RetourCarnetDTO(retourCarnet);
        items.sort(Comparator.comparing(RetourCarnetDetailDTO::getProduitLib));
        retourCarnetDto.setItems(items);
        retourCarnetDto.setMontant(items.stream().map(RetourCarnetDetailDTO::getAmount).reduce(0, Integer::sum));
        return retourCarnetDto;

    }
}
