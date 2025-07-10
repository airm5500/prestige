/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.CategorieNotification;
import dal.Notification;
import dal.NotificationClient;
import dal.TUser;
import dal.enumeration.Statut;
import dal.enumeration.TypeNotification;
import java.io.Serializable;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import org.apache.commons.collections4.CollectionUtils;
import org.json.JSONObject;
import rest.service.v2.dto.NotificationUtilsDTO;
import util.NotificationUtils;

/**
 *
 * @author koben
 */
public class NotificationDTO implements Serializable {

    private static final Logger LOG = Logger.getLogger(NotificationDTO.class.getName());
    private static final long serialVersionUID = 1L;
    private String id;

    private String message;
    private String entityRef;
    private String statut;

    private String canal;

    private String typeNotification;
    private String categorieName;
    private String modfiedAt;
    private NotificationUtilsDTO notificationDetail;
    private TypeNotification type;

    public String getEntityRef() {
        return entityRef;
    }

    public void setEntityRef(String entityRef) {
        this.entityRef = entityRef;
    }

    public NotificationUtilsDTO getNotificationDetail() {
        return notificationDetail;
    }

    public void setNotificationDetail(NotificationUtilsDTO notificationDetail) {
        this.notificationDetail = notificationDetail;
    }

    private String user;

    private String userTo;

    private List<NotificationClientDTO> clients = new ArrayList<>();

    public NotificationDTO() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public TypeNotification getType() {
        return type;
    }

    public void setType(TypeNotification type) {
        this.type = type;
    }

    public String getCanal() {
        return canal;
    }

    public void setCanal(String canal) {
        this.canal = canal;
    }

    public String getTypeNotification() {
        return typeNotification;
    }

    public void setTypeNotification(String typeNotification) {
        this.typeNotification = typeNotification;
    }

    public String getModfiedAt() {
        return modfiedAt;
    }

    public void setModfiedAt(String modfiedAt) {
        this.modfiedAt = modfiedAt;
    }

    public String getUser() {
        return user;
    }

    public String getCategorieName() {
        return categorieName;
    }

    public void setCategorieName(String categorieName) {
        this.categorieName = categorieName;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getUserTo() {
        return userTo;
    }

    public void setUserTo(String userTo) {
        this.userTo = userTo;
    }

    public List<NotificationClientDTO> getClients() {
        return clients;
    }

    public void setClients(List<NotificationClientDTO> clients) {
        this.clients = clients;
    }

    public NotificationDTO addClients(List<NotificationClientDTO> clients) {
        this.clients = clients;
        return this;
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 71 * hash + Objects.hashCode(this.id);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final NotificationDTO other = (NotificationDTO) obj;
        if (!Objects.equals(this.id, other.id)) {
            return false;
        }
        return true;
    }

    public NotificationDTO(Notification n, List<NotificationClientDTO> clients) {
        this.entityRef = n.getEntityRef();
        this.id = n.getId();
        this.message = n.getMessage();
        if (n.getStatut() == Statut.SENT) {
            this.statut = "Envoyé";
        } else {
            this.statut = "Non envoyé";
        }
        CategorieNotification categorieNotification = n.getCategorieNotification();
        this.canal = categorieNotification.getCanal().name();
        this.typeNotification = categorieNotification.getLibelle();
        this.modfiedAt = n.getModfiedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        TUser userO = n.getUser();
        if (userO != null) {
            this.user = userO.getStrFIRSTNAME() + " " + userO.getStrLASTNAME();
        }
        TUser oUserTo = n.getUserTo();
        if (oUserTo != null) {
            this.userTo = oUserTo.getStrFIRSTNAME() + " " + oUserTo.getStrLASTNAME();
        }
        this.clients = clients;
        this.notificationDetail = builgFromDonnes(n);
    }

    public NotificationDTO(Notification n) {
        this.id = n.getId();
        this.message = n.getMessage();
        if (n.getStatut() == Statut.SENT) {
            this.statut = "Envoyé";
        } else {
            this.statut = "Non envoyé";
        }
        this.entityRef = n.getEntityRef();
        CategorieNotification categorieNotification = n.getCategorieNotification();
        this.canal = categorieNotification.getCanal().name();
        this.typeNotification = categorieNotification.getLibelle();
        this.modfiedAt = n.getModfiedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        TUser userO = n.getUser();
        if (userO != null) {
            this.user = userO.getStrFIRSTNAME() + " " + userO.getStrLASTNAME();
        }
        TUser oUserTo = n.getUserTo();
        if (oUserTo != null) {
            this.userTo = oUserTo.getStrFIRSTNAME() + " " + oUserTo.getStrLASTNAME();
        }
        Collection<NotificationClient> notificationClients = n.getNotificationClients();
        if (CollectionUtils.isNotEmpty(notificationClients)) {
            this.clients = notificationClients.stream().map(NotificationClientDTO::new).collect(Collectors.toList());
        }
        this.notificationDetail = builgFromDonnes(n);

    }

    private NotificationUtilsDTO buildFromString(String donnes, TUser tu) {
        if (Objects.nonNull(donnes) && !donnes.isEmpty()) {
            NotificationUtilsDTO o = new NotificationUtilsDTO();
            JSONObject js = new JSONObject(donnes);
            o.setUser(tu.getStrFIRSTNAME().concat(" " + tu.getStrLASTNAME()));
            /*
             * if (js.has(NotificationUtils.USER.getId())) { o.setUser(js.getString(NotificationUtils.USER.getId())); }
             */
            if (js.has("code")) {
                o.setCode(js.getString("code"));
            }

            if (js.has("dateMvtIni")) {
                o.setDateMvtIni(js.getString("dateMvtIni"));
            }
            if (js.has("prixAchatFinal")) {
                o.setPrixAchatFinal(js.getString("prixAchatFinal"));
            }
            if (js.has("prixAchatUni")) {
                o.setPrixAchatUni(js.getString("prixAchatUni"));
            }
            if (js.has("prixFinal")) {
                o.setPrixFinal(js.getString("prixFinal"));
            }
            if (js.has("prixUni")) {
                o.setPrixUni(js.getString("prixUni"));
            }
            if (js.has("quantiteFinale")) {
                o.setQuantiteFinale(js.getInt("quantiteFinale") + "");
            }
            if (js.has("quantiteInit")) {
                o.setQuantiteInit(js.getInt("quantiteInit") + "");
            }
            if (js.has("quantite")) {
                o.setQuantite(js.getInt("quantite") + "");
            }
            if (js.has("description")) {
                o.setDescription(js.getString("description"));
            }
            if (js.has("dateBon")) {
                o.setDateBon(js.getString("dateBon"));
            }
            if (js.has("montantTtc")) {
                o.setMontantTtc(js.getString("montantTtc"));
            }
            if (js.has("montantTva")) {
                o.setMontantTva(js.getString("montantTva"));
            }
            if (js.has("numBon")) {
                o.setNumBon(js.getString("numBon"));
            }
            if (js.has("message")) {
                o.setMessage(js.getString("message"));
            }
            if (js.has("type")) {
                o.setType(js.getString("type"));
            }
            if (js.has("montant")) {
                o.setMontant(js.getString("montant"));
            }
            if (js.has("dateMvt")) {
                o.setDateMvt(js.getString("dateMvt"));
            }
            if (js.has("detail")) {
                try {
                    js.getJSONArray("detail").forEach(e -> o.getDetail().add(buildFromString(e.toString(), tu)));
                } catch (Exception e) {
                }

            }
            return o;
        }
        return null;
    }

    private NotificationUtilsDTO builgFromDonnes(Notification n) {
        String donnes = n.getDonnees();
        try {
            if (Objects.nonNull(donnes) && !donnes.isEmpty()) {
                return buildFromString(donnes, n.getUser());
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return null;
    }

}
