package rest.service.impl;

import commonTasks.dto.ClientConsoDTO;
import dal.CategorieNotification;
import dal.ModeleMessage;
import dal.Notification;
import dal.NotificationClient;
import dal.TClient;
import dal.TUser;
import dal.enumeration.TypeNotification;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.CampagneClientService;
import rest.service.ClientConsommationService;
import rest.service.NotificationService;
import rest.service.SmsService;
import rest.service.dto.CampagneRequete;
import rest.service.utils.ReportExcelExportService;
import util.MessageModele;
import util.TelephoneCi;

@Stateless
public class CampagneClientServiceImpl implements CampagneClientService {

    private static final Logger LOG = Logger.getLogger(CampagneClientServiceImpl.class.getName());
    static final String MOTIF_REFUS = "Refus du client (consentement)";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private ClientConsommationService clientConsommationService;
    @EJB
    private ReportExcelExportService reportExcelExportService;
    @EJB
    private NotificationService notificationService;
    @EJB
    private SmsService smsService;

    /** Un contact apres controle. */
    static final class Contact {

        final ClientConsoDTO client;
        final TelephoneCi.Resultat numero;
        final String motif;

        Contact(ClientConsoDTO client, TelephoneCi.Resultat numero, String motif) {
            this.client = client;
            this.numero = numero;
            this.motif = motif;
        }

        boolean conforme() {
            return motif.isEmpty();
        }
    }

    /**
     * Population relue en base : les clients coches sont pris dans le resultat des criteres (pour garder dernier achat
     * et telephone a jour), ceux qui n'y figurent plus sont relus par identifiant ; sans selection, tout le resultat.
     * Dedoublonnee par identifiant.
     */
    private List<ClientConsoDTO> population(CampagneRequete requete) {
        List<ClientConsoDTO> resultat = clientConsommationService.population(requete.getFiltres());
        List<ClientConsoDTO> retenus = new ArrayList<>();
        Set<String> vus = new HashSet<>();
        if (requete.getClientIds().isEmpty()) {
            for (ClientConsoDTO c : resultat) {
                if (vus.add(c.getClientId())) {
                    retenus.add(c);
                }
            }
            return retenus;
        }
        Set<String> demandes = new HashSet<>(requete.getClientIds());
        for (ClientConsoDTO c : resultat) {
            if (demandes.contains(c.getClientId()) && vus.add(c.getClientId())) {
                retenus.add(c);
            }
        }
        List<String> manquants = new ArrayList<>();
        for (String id : requete.getClientIds()) {
            if (!vus.contains(id)) {
                manquants.add(id);
            }
        }
        for (ClientConsoDTO c : clientConsommationService.clientsParIds(manquants)) {
            if (vus.add(c.getClientId())) {
                retenus.add(c);
            }
        }
        return retenus;
    }

    private List<Contact> controler(List<ClientConsoDTO> population) {
        List<Contact> contacts = new ArrayList<>();
        for (ClientConsoDTO c : population) {
            TelephoneCi.Resultat numero = TelephoneCi.controler(c.getTelephone());
            String motif;
            if (Boolean.FALSE.equals(c.getConsentSms())) {
                motif = MOTIF_REFUS;
            } else {
                motif = numero.isValide() ? "" : numero.getMotif();
            }
            contacts.add(new Contact(c, numero, motif));
        }
        return contacts;
    }

    @Override
    public JSONObject controlerNumeros(CampagneRequete requete) {
        JSONObject json = new JSONObject();
        try {
            List<Contact> contacts = controler(population(requete));
            JSONArray conformes = new JSONArray();
            JSONArray nonConformes = new JSONArray();
            for (Contact c : contacts) {
                JSONObject o = new JSONObject().put("clientId", c.client.getClientId())
                        .put("client", c.client.getClient())
                        .put("telephone", StringUtils.defaultString(c.client.getTelephone()))
                        .put("dernierAchat", StringUtils.defaultString(c.client.getDernierAchat()));
                if (c.conforme()) {
                    conformes
                            .put(o.put("local", c.numero.getLocal()).put("international", c.numero.getInternational()));
                } else {
                    nonConformes.put(o.put("motif", c.motif));
                }
            }
            json.put("success", true).put("total", contacts.size()).put("nbConformes", conformes.length())
                    .put("nbNonConformes", nonConformes.length()).put("conformes", conformes)
                    .put("nonConformes", nonConformes);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "controle des numeros", e);
            json.put("success", false).put("msg", "Le contrôle des numéros a échoué");
        }
        return json;
    }

    @Override
    public byte[] excelNonConformes(CampagneRequete requete) throws IOException {
        List<Contact> anomalies = new ArrayList<>();
        for (Contact c : controler(population(requete))) {
            if (!c.conforme()) {
                anomalies.add(c);
            }
        }
        return reportExcelExportService.createExcelReport("NUMEROS NON CONFORMES - CAMPAGNE SUIVI DE CONSOMMATION",
                new String[] { "Client", "Téléphone enregistré", "Motif de non-conformité" }, anomalies, (row, c) -> {
                    row.createCell(0).setCellValue(c.client.getClient());
                    row.createCell(1).setCellValue(StringUtils.defaultString(c.client.getTelephone()));
                    row.createCell(2).setCellValue(c.motif);
                });
    }

    /** Message personnalise pour un contact (nom / prenom relus sur la fiche). */
    private String personnaliser(String modele, ClientConsoDTO c, String medicament, String[] officine) {
        TClient fiche = em.find(TClient.class, c.getClientId());
        String nom = fiche == null ? c.getClient() : StringUtils.defaultString(fiche.getStrFIRSTNAME());
        String prenom = fiche == null ? "" : StringUtils.defaultString(fiche.getStrLASTNAME());
        Map<String, String> valeurs = MessageModele.valeurs(nom, prenom, medicament, officine[0], officine[1],
                c.getDernierAchat());
        return MessageModele.personnaliser(modele, valeurs);
    }

    /** Nom complet et telephone de l'officine, pour {officine} et {telephone_officine}. */
    private String[] officine() {
        try {
            @SuppressWarnings("unchecked")
            List<Object[]> rows = em.createNativeQuery("SELECT str_NOM_COMPLET, str_PHONE FROM t_officine LIMIT 1")
                    .getResultList();
            if (!rows.isEmpty()) {
                Object[] r = rows.get(0);
                return new String[] { r[0] == null ? "" : r[0].toString(), r[1] == null ? "" : r[1].toString() };
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "officine illisible", e);
        }
        return new String[] { "", "" };
    }

    private String modeleOuMessage(CampagneRequete requete) {
        if (StringUtils.isNotBlank(requete.getMessage())) {
            return requete.getMessage();
        }
        if (StringUtils.isNotBlank(requete.getModeleId())) {
            ModeleMessage m = em.find(ModeleMessage.class, requete.getModeleId());
            if (m != null) {
                return m.getContenu();
            }
        }
        return "";
    }

    @Override
    public List<String> preparerSms(TUser utilisateur, CampagneRequete requete) {
        List<String> ids = new ArrayList<>();
        String modele = modeleOuMessage(requete);
        if (StringUtils.isBlank(modele)) {
            return ids;
        }
        String[] officine = officine();
        CategorieNotification categorie = notificationService.getOneByName(TypeNotification.MASSE);
        for (Contact c : controler(population(requete))) {
            if (!c.conforme()) {
                continue; // aucun numero non conforme ne part vers le fournisseur
            }
            TClient client = em.find(TClient.class, c.client.getClientId());
            if (client == null) {
                continue;
            }
            Notification notification = new Notification();
            notification.setCategorieNotification(categorie);
            notification.setMessage(personnaliser(modele, c.client, requete.getMedicament(), officine));
            notification.setUser(utilisateur);
            notification.getNotificationClients().add(new NotificationClient(client, notification));
            em.persist(notification);
            ids.add(notification.getId());
        }
        em.flush();
        return ids;
    }

    @Override
    public void lancerEnvois(List<String> notificationIds) {
        for (String id : notificationIds) {
            smsService.sendSMSByNotificationIdAsync(id);
        }
    }

    @Override
    public JSONObject liensWhatsapp(CampagneRequete requete) {
        JSONObject json = new JSONObject();
        try {
            String modele = modeleOuMessage(requete);
            String[] officine = officine();
            JSONArray liens = new JSONArray();
            for (Contact c : controler(population(requete))) {
                if (!c.conforme()) {
                    continue;
                }
                String message = personnaliser(modele, c.client, requete.getMedicament(), officine);
                String texte = URLEncoder.encode(message, StandardCharsets.UTF_8.name()).replace("+", "%20");
                liens.put(new JSONObject().put("clientId", c.client.getClientId()).put("client", c.client.getClient())
                        .put("telephone", c.numero.getInternational()).put("message", message)
                        .put("lien", "https://wa.me/" + c.numero.getInternational() + "?text=" + texte));
            }
            json.put("success", true).put("total", liens.length()).put("liens", liens);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liens whatsapp", e);
            json.put("success", false).put("msg", "La préparation des liens WhatsApp a échoué");
        }
        return json;
    }
}
