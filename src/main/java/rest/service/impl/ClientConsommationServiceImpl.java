package rest.service.impl;

import commonTasks.dto.ClientConsoDTO;
import commonTasks.dto.ClientConsoProduitDTO;
import dal.TClient;
import dal.TUser;
import java.io.IOException;
import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.ClientConsommationService;
import rest.service.utils.CsvExportService;
import rest.service.utils.ReportExcelExportService;

/**
 * Analyse de la consommation d'un client par medicament sur une periode.
 */
@Stateless
public class ClientConsommationServiceImpl implements ClientConsommationService {

    private static final Logger LOG = Logger.getLogger(ClientConsommationServiceImpl.class.getName());
    private static final int SEUIL_DORMANT_JOURS = 90;
    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final String BASE_FROM = " FROM t_preenregistrement_detail d"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
            + " WHERE p.lg_CLIENT_ID = ?1 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
            + " AND DATE(p.dt_UPDATED) BETWEEN ?2 AND ?3 AND (f.str_NAME LIKE ?4 OR f.int_CIP LIKE ?4)";

    private static final String DATA_QUERY = "SELECT f.lg_FAMILLE_ID AS familleId, f.int_CIP AS cip,"
            + " f.str_NAME AS name, MAX(DATE(p.dt_UPDATED)) AS dernierAchat, MIN(DATE(p.dt_UPDATED)) AS premierAchat,"
            + " COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID) AS nbAchats, COALESCE(SUM(d.int_QUANTITY),0) AS qteTotale,"
            + " COALESCE(SUM(d.int_PRICE),0) AS montant" + BASE_FROM
            + " GROUP BY f.lg_FAMILLE_ID ORDER BY nbAchats DESC, montant DESC";

    private static final String COUNT_QUERY = "SELECT COUNT(DISTINCT d.lg_FAMILLE_ID)" + BASE_FROM;

    private static final String CLIENTS_QUERY = "SELECT c.lg_CLIENT_ID AS clientId,"
            + " TRIM(CONCAT(COALESCE(c.str_FIRST_NAME,''),' ',COALESCE(c.str_LAST_NAME,''))) AS client,"
            + " TRIM(CONCAT_WS(' / ', NULLIF(TRIM(COALESCE(c.str_ADRESSE,'')),''), NULLIF(TRIM(COALESCE(c.email,'')),''))) AS contact,"
            + " COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID) AS nbAchats, COALESCE(SUM(p.int_PRICE),0) AS montant,"
            + " MAX(DATE(p.dt_UPDATED)) AS dernierAchat, MIN(DATE(p.dt_UPDATED)) AS premierAchat"
            + " FROM t_preenregistrement p JOIN t_client c ON c.lg_CLIENT_ID = p.lg_CLIENT_ID"
            + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
            + " AND DATE(p.dt_UPDATED) BETWEEN ?1 AND ?2"
            + " AND CONCAT(COALESCE(c.str_FIRST_NAME,''),' ',COALESCE(c.str_LAST_NAME,'')) LIKE ?3"
            + " {typeClient} GROUP BY c.lg_CLIENT_ID {orderBy}";

    /** valeur speciale du filtre type de client : clients sans compte tiers payant */
    private static final String TYPE_CLIENT_STANDARD = "STANDARD";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private CsvExportService csvExportService;
    @EJB
    private ReportExcelExportService reportExcelExportService;
    @EJB
    private ReportUtil reportUtil;

    private LocalDate parseOr(String value, LocalDate fallback) {
        try {
            return LocalDate.parse(value);
        } catch (Exception e) {
            return fallback;
        }
    }

    @Override
    public JSONObject consommation(String clientId, String dtStart, String dtEnd, String query, int start, int limit) {
        JSONObject json = new JSONObject();
        try {
            LocalDate fin = parseOr(dtEnd, LocalDate.now());
            LocalDate debut = parseOr(dtStart, fin.minusMonths(12));
            String search = StringUtils.isEmpty(query) ? "%%" : "%" + query + "%";

            Query countQuery = em.createNativeQuery(COUNT_QUERY).setParameter(1, clientId)
                    .setParameter(2, Date.valueOf(debut)).setParameter(3, Date.valueOf(fin)).setParameter(4, search);
            long total = ((Number) countQuery.getSingleResult()).longValue();
            if (total == 0) {
                return json.put("total", 0).put("data", new JSONArray());
            }

            Query q = em.createNativeQuery(DATA_QUERY, Tuple.class).setParameter(1, clientId)
                    .setParameter(2, Date.valueOf(debut)).setParameter(3, Date.valueOf(fin)).setParameter(4, search);
            if (limit > 0) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            List<Tuple> tuples = q.getResultList();
            JSONArray datas = new JSONArray();
            for (Tuple t : tuples) {
                long nbAchats = ((Number) t.get("nbAchats")).longValue();
                long qteTotale = ((Number) t.get("qteTotale")).longValue();
                long montant = ((Number) t.get("montant")).longValue();
                LocalDate dernierAchat = ((Date) t.get("dernierAchat")).toLocalDate();
                LocalDate premierAchat = ((Date) t.get("premierAchat")).toLocalDate();

                // frequence moyenne de renouvellement (en jours) entre le premier et
                // le dernier achat de la periode
                long frequenceJours = 0;
                if (nbAchats > 1) {
                    frequenceJours = ChronoUnit.DAYS.between(premierAchat, dernierAchat) / (nbAchats - 1);
                }
                double qteMoyenne = nbAchats > 0 ? (double) qteTotale / nbAchats : 0;

                JSONObject row = new JSONObject();
                row.put("familleId", t.get("familleId", String.class));
                row.put("cip", t.get("cip", String.class));
                row.put("name", t.get("name", String.class));
                row.put("dernierAchat", dernierAchat.toString());
                row.put("premierAchat", premierAchat.toString());
                row.put("nbAchats", nbAchats);
                row.put("qteTotale", qteTotale);
                row.put("qteMoyenne", Math.round(qteMoyenne * 100.0) / 100.0);
                row.put("frequenceJours", frequenceJours);
                row.put("montant", montant);
                row.put("habitude", habitude(nbAchats, frequenceJours, dernierAchat));
                datas.put(row);
            }
            return json.put("total", total).put("data", datas);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return json.put("total", 0).put("data", new JSONArray());
        }
    }

    // -------------------------------------------------- suivi global (tous les clients)

    /**
     * Clause du filtre par type de client : STANDARD = aucun compte tiers payant ; sinon la valeur est un id de type de
     * tiers payant (assurance, carnet...).
     */
    private String typeClientClause(String typeClient) {
        if (StringUtils.isEmpty(typeClient)) {
            return " ";
        }
        if (TYPE_CLIENT_STANDARD.equalsIgnoreCase(typeClient)) {
            return " AND NOT EXISTS (SELECT 1 FROM t_compte_client cc"
                    + " JOIN t_compte_client_tiers_payant cctp ON cctp.lg_COMPTE_CLIENT_ID = cc.lg_COMPTE_CLIENT_ID"
                    + " WHERE cc.lg_CLIENT_ID = c.lg_CLIENT_ID) ";
        }
        return String.format(
                " AND EXISTS (SELECT 1 FROM t_compte_client cc"
                        + " JOIN t_compte_client_tiers_payant cctp ON cctp.lg_COMPTE_CLIENT_ID = cc.lg_COMPTE_CLIENT_ID"
                        + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID"
                        + " WHERE cc.lg_CLIENT_ID = c.lg_CLIENT_ID AND tp.lg_TYPE_TIERS_PAYANT_ID = '%s') ",
                typeClient.replace("'", ""));
    }

    private String orderByClause(String sortBy) {
        if ("nbAchats".equalsIgnoreCase(sortBy)) {
            return " ORDER BY nbAchats DESC, montant DESC";
        }
        return " ORDER BY montant DESC, nbAchats DESC";
    }

    /**
     * Liste complete des clients ayant achete sur la periode, avec cumuls et habitude. Le filtre habitude est applique
     * apres classification.
     */
    private List<ClientConsoDTO> clients(String dtStart, String dtEnd, String query, String habitude, String typeClient,
            String sortBy) {
        List<ClientConsoDTO> rows = new ArrayList<>();
        try {
            LocalDate fin = parseOr(dtEnd, LocalDate.now());
            LocalDate debut = parseOr(dtStart, fin.minusMonths(12));
            String search = StringUtils.isEmpty(query) ? "%%" : "%" + query + "%";

            String sql = CLIENTS_QUERY.replace("{typeClient}", typeClientClause(typeClient)).replace("{orderBy}",
                    orderByClause(sortBy));
            Query q = em.createNativeQuery(sql, Tuple.class).setParameter(1, Date.valueOf(debut))
                    .setParameter(2, Date.valueOf(fin)).setParameter(3, search);
            List<Tuple> tuples = q.getResultList();
            for (Tuple t : tuples) {
                long nbAchats = ((Number) t.get("nbAchats")).longValue();
                LocalDate dernierAchat = ((Date) t.get("dernierAchat")).toLocalDate();
                LocalDate premierAchat = ((Date) t.get("premierAchat")).toLocalDate();
                long frequenceJours = 0;
                if (nbAchats > 1) {
                    frequenceJours = ChronoUnit.DAYS.between(premierAchat, dernierAchat) / (nbAchats - 1);
                }
                ClientConsoDTO dto = new ClientConsoDTO();
                dto.setClientId(t.get("clientId", String.class));
                dto.setClient(t.get("client", String.class));
                dto.setContact(t.get("contact", String.class));
                dto.setNbAchats(nbAchats);
                dto.setMontant(((Number) t.get("montant")).longValue());
                dto.setDernierAchat(dernierAchat.format(FR));
                dto.setPremierAchat(premierAchat.format(FR));
                dto.setFrequenceJours(frequenceJours);
                dto.setHabitude(habitude(nbAchats, frequenceJours, dernierAchat));
                rows.add(dto);
            }
            if (StringUtils.isNotEmpty(habitude)) {
                String filtre = habitude;
                rows = rows.stream().filter(r -> filtre.equalsIgnoreCase(r.getHabitude())).collect(Collectors.toList());
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return rows;
    }

    @Override
    public JSONObject fetchClients(String dtStart, String dtEnd, String query, String habitude, String typeClient,
            String sortBy, int start, int limit) {
        JSONObject json = new JSONObject();
        try {
            List<ClientConsoDTO> rows = clients(dtStart, dtEnd, query, habitude, typeClient, sortBy);
            int total = rows.size();
            if (limit > 0) {
                int from = Math.min(start, total);
                int to = Math.min(start + limit, total);
                rows = rows.subList(from, to);
            }
            return json.put("total", total).put("data", new JSONArray(rows));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return json.put("total", 0).put("data", new JSONArray());
        }
    }

    private String periode(String dtStart, String dtEnd) {
        LocalDate fin = parseOr(dtEnd, LocalDate.now());
        LocalDate debut = parseOr(dtStart, fin.minusMonths(12));
        return "du " + debut.format(FR) + " au " + fin.format(FR);
    }

    private String[] clientsHeaders() {
        return new String[] { "Client", "Contact", "Nb achats", "Montant cumulé", "Dernier achat", "Fréquence (jours)",
                "Habitude" };
    }

    private String frequenceLabel(long nbAchats, long frequenceJours) {
        if (nbAchats < 2) {
            return "-";
        }
        return frequenceJours < 1 ? "< 1 jour" : String.valueOf(frequenceJours);
    }

    @Override
    public byte[] exportClientsCsv(String dtStart, String dtEnd, String query, String habitude, String typeClient,
            String sortBy) throws IOException {
        List<ClientConsoDTO> rows = clients(dtStart, dtEnd, query, habitude, typeClient, sortBy);
        byte[] raw = csvExportService.createCsvReport("Suivi de consommation clients " + periode(dtStart, dtEnd),
                clientsHeaders(), rows,
                dto -> new String[] { dto.getClient(), StringUtils.defaultString(dto.getContact()),
                        String.valueOf(dto.getNbAchats()), String.valueOf(dto.getMontant()), dto.getDernierAchat(),
                        frequenceLabel(dto.getNbAchats(), dto.getFrequenceJours()), dto.getHabitude() });
        return csvExportService.addUtf8Bom(raw);
    }

    @Override
    public byte[] exportClientsExcel(String dtStart, String dtEnd, String query, String habitude, String typeClient,
            String sortBy) throws IOException {
        List<ClientConsoDTO> rows = clients(dtStart, dtEnd, query, habitude, typeClient, sortBy);
        return reportExcelExportService.createExcelReport("Suivi de consommation clients " + periode(dtStart, dtEnd),
                clientsHeaders(), rows, (row, dto) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(dto.getClient());
                    row.createCell(col++).setCellValue(StringUtils.defaultString(dto.getContact()));
                    row.createCell(col++).setCellValue(dto.getNbAchats());
                    row.createCell(col++).setCellValue(dto.getMontant());
                    row.createCell(col++).setCellValue(dto.getDernierAchat());
                    row.createCell(col++).setCellValue(frequenceLabel(dto.getNbAchats(), dto.getFrequenceJours()));
                    row.createCell(col++).setCellValue(dto.getHabitude());
                });
    }

    @Override
    public String printClients(TUser user, String dtStart, String dtEnd, String query, String habitude,
            String typeClient, String sortBy) {
        List<ClientConsoDTO> rows = clients(dtStart, dtEnd, query, habitude, typeClient, sortBy);
        Map<String, Object> parameters = reportUtil.officineData(user);
        String titre = "SUIVI DE CONSOMMATION CLIENTS - PERIODE " + periode(dtStart, dtEnd).toUpperCase();
        if (StringUtils.isNotEmpty(habitude)) {
            titre += " - " + habitude.toUpperCase();
        }
        parameters.put("P_H_CLT_INFOS", titre);
        return reportUtil.buildReport(parameters, "rp_conso_clients", rows);
    }

    @Override
    public String printClient(TUser user, String clientId, String dtStart, String dtEnd) {
        List<ClientConsoProduitDTO> rows = produitsClient(clientId, dtStart, dtEnd);
        Map<String, Object> parameters = reportUtil.officineData(user);
        String nomClient = "";
        try {
            TClient client = em.find(TClient.class, clientId);
            if (client != null) {
                nomClient = (StringUtils.defaultString(client.getStrFIRSTNAME()) + " "
                        + StringUtils.defaultString(client.getStrLASTNAME())).trim();
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        parameters.put("P_H_CLT_INFOS",
                ("SUIVI DE CONSOMMATION : " + nomClient + " - PERIODE " + periode(dtStart, dtEnd)).toUpperCase());
        return reportUtil.buildReport(parameters, "rp_conso_client", rows);
    }

    /** Lignes par produit du client (pour l'impression), meme requete que la consommation a l'ecran. */
    private List<ClientConsoProduitDTO> produitsClient(String clientId, String dtStart, String dtEnd) {
        List<ClientConsoProduitDTO> rows = new ArrayList<>();
        try {
            LocalDate fin = parseOr(dtEnd, LocalDate.now());
            LocalDate debut = parseOr(dtStart, fin.minusMonths(12));
            Query q = em.createNativeQuery(DATA_QUERY, Tuple.class).setParameter(1, clientId)
                    .setParameter(2, Date.valueOf(debut)).setParameter(3, Date.valueOf(fin)).setParameter(4, "%%");
            List<Tuple> tuples = q.getResultList();
            for (Tuple t : tuples) {
                long nbAchats = ((Number) t.get("nbAchats")).longValue();
                long qteTotale = ((Number) t.get("qteTotale")).longValue();
                LocalDate dernierAchat = ((Date) t.get("dernierAchat")).toLocalDate();
                LocalDate premierAchat = ((Date) t.get("premierAchat")).toLocalDate();
                long frequenceJours = 0;
                if (nbAchats > 1) {
                    frequenceJours = ChronoUnit.DAYS.between(premierAchat, dernierAchat) / (nbAchats - 1);
                }
                ClientConsoProduitDTO dto = new ClientConsoProduitDTO();
                dto.setCip(t.get("cip", String.class));
                dto.setName(t.get("name", String.class));
                dto.setDernierAchat(dernierAchat.format(FR));
                dto.setNbAchats(nbAchats);
                dto.setQteTotale(qteTotale);
                dto.setQteMoyenne(nbAchats > 0 ? Math.round((double) qteTotale / nbAchats * 100.0) / 100.0 : 0);
                dto.setFrequenceJours(frequenceJours);
                dto.setMontant(((Number) t.get("montant")).longValue());
                dto.setHabitude(habitude(nbAchats, frequenceJours, dernierAchat));
                rows.add(dto);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return rows;
    }

    /**
     * Classification de l'habitude d'achat : dormant (plus d'achat depuis 90 jours), bimensuel (renouvellement <= 20
     * jours), mensuel (21 a 45 jours), ponctuel sinon.
     */
    private String habitude(long nbAchats, long frequenceJours, LocalDate dernierAchat) {
        if (ChronoUnit.DAYS.between(dernierAchat, LocalDate.now()) > SEUIL_DORMANT_JOURS) {
            return "Dormant";
        }
        if (nbAchats < 2) {
            return "Ponctuel";
        }
        if (frequenceJours <= 20) {
            return "Bimensuel";
        }
        if (frequenceJours <= 45) {
            return "Mensuel";
        }
        return "Ponctuel";
    }
}
