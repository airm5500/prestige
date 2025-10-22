package rest.service.impl;

import java.text.DecimalFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import rest.service.AnalyseInvService;
import rest.service.dto.AnalyseInvDTO;

@Stateless
public class AnalyseInvServiceImpl implements AnalyseInvService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public List<AnalyseInvDTO> analyseInventaire(String inventaireId) {
        if (inventaireId == null || inventaireId.trim().isEmpty()) {
            return new ArrayList<>();
        }
        try {
            String queryStr = "SELECT f.int_CIP AS codeCip, f.str_NAME AS nom, f.int_PAF AS prixAchat, f.int_PRICE AS prixVente, z.str_LIBELLEE AS emplacement, i.lg_INVENTAIRE_ID AS inventaireId, iv.str_NAME AS invName, i.int_NUMBER AS qteSaisie, i.int_NUMBER_INIT AS qteInitiale "
                    + "FROM t_inventaire_famille i, t_inventaire iv, t_famille f, t_zone_geographique z "
                    + "WHERE i.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND f.lg_ZONE_GEO_ID = z.lg_ZONE_GEO_ID AND i.lg_INVENTAIRE_ID=iv.lg_INVENTAIRE_ID "
                    + "AND i.lg_INVENTAIRE_ID = :inventaireId " + "ORDER BY z.str_LIBELLEE, f.str_NAME ASC";

            List<Tuple> results = em.createNativeQuery(queryStr, Tuple.class).setParameter("inventaireId", inventaireId)
                    .getResultList();

            return results.stream().map(this::tupleToDto).collect(Collectors.toList());
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    @Override
    public Map<String, Object> getAnalyseAvanceeData(String inventaireId) {
        List<AnalyseInvDTO> rawData = analyseInventaire(inventaireId);

        Map<String, Object> response = new HashMap<>();
        List<Map<String, Object>> summaryData = buildSummaryData(rawData);

        response.put("summaryData", summaryData);
        response.put("abcData", buildAbcData(rawData));
        response.put("detailData", buildDetailData(rawData));
        response.put("summaryHtml", buildSummaryHtml(rawData, summaryData));
        response.put("complianceReport", buildComplianceReport(rawData));

        return response;
    }

    // --- Méthodes de construction des données ---

    private List<Map<String, Object>> buildSummaryData(List<AnalyseInvDTO> rawData) {
        Map<String, Map<String, Double>> emplacementTotals = new HashMap<>();
        for (AnalyseInvDTO dto : rawData) {
            String loc = (dto.getEmplacement() != null && !dto.getEmplacement().isEmpty()) ? dto.getEmplacement()
                    : "Non défini";
            emplacementTotals.putIfAbsent(loc, new HashMap<>());
            Map<String, Double> totals = emplacementTotals.get(loc);
            totals.merge("valeurAchatRayon", dto.getQteSaisie() * dto.getPrixAchat(), Double::sum);
            totals.merge("valeurAchatMachine", dto.getQteInitiale() * dto.getPrixAchat(), Double::sum);
            totals.merge("valeurVenteRayon", dto.getQteSaisie() * dto.getPrixVente(), Double::sum);
        }

        double totalEcartAbsolu = emplacementTotals.values().stream()
                .mapToDouble(totals -> Math.abs(
                        totals.getOrDefault("valeurAchatRayon", 0.0) - totals.getOrDefault("valeurAchatMachine", 0.0)))
                .sum();

        List<Map<String, Object>> summaryList = new ArrayList<>();
        for (Map.Entry<String, Map<String, Double>> entry : emplacementTotals.entrySet()) {
            Map<String, Object> rowData = new HashMap<>();
            Map<String, Double> totals = entry.getValue();
            double ecartAchat = totals.getOrDefault("valeurAchatRayon", 0.0)
                    - totals.getOrDefault("valeurAchatMachine", 0.0);
            rowData.put("emplacement", entry.getKey());
            rowData.put("valeurAchatRayon", totals.getOrDefault("valeurAchatRayon", 0.0));
            rowData.put("ecartValeurAchat", ecartAchat);
            rowData.put("pourcentageEcartGlobal",
                    (totalEcartAbsolu != 0) ? (Math.abs(ecartAchat) / totalEcartAbsolu) * 100 : 0);
            rowData.put("ratioVA", (totals.getOrDefault("valeurAchatRayon", 0.0) != 0)
                    ? totals.getOrDefault("valeurVenteRayon", 0.0) / totals.getOrDefault("valeurAchatRayon", 0.0) : 0);
            summaryList.add(rowData);
        }
        return summaryList;
    }

    private List<Map<String, Object>> buildAbcData(List<AnalyseInvDTO> rawData) {
        List<Map<String, Object>> productEcarts = new ArrayList<>();
        double totalEcartAbsolu = 0;

        for (AnalyseInvDTO dto : rawData) {
            double ecartVal = (dto.getQteSaisie() - dto.getQteInitiale()) * dto.getPrixAchat();
            if (ecartVal != 0) {
                Map<String, Object> item = new HashMap<>();
                item.put("nom", dto.getNom());
                item.put("ecartValeurAchat", ecartVal);
                item.put("ecartAbs", Math.abs(ecartVal));
                productEcarts.add(item);
                totalEcartAbsolu += Math.abs(ecartVal);
            }
        }

        productEcarts
                .sort(Comparator.comparingDouble((Map<String, Object> m) -> (double) m.get("ecartAbs")).reversed());

        double cumul = 0;
        for (Map<String, Object> item : productEcarts) {
            double ecartPct = (totalEcartAbsolu > 0) ? ((double) item.get("ecartAbs") / totalEcartAbsolu) * 100 : 0;
            cumul += ecartPct;
            item.put("ecartTotalPct", ecartPct);
            item.put("cumulPct", cumul);
            if (cumul <= 80)
                item.put("categorie", "A");
            else if (cumul <= 95)
                item.put("categorie", "B");
            else
                item.put("categorie", "C");
        }
        return productEcarts;
    }

    private List<Map<String, Object>> buildDetailData(List<AnalyseInvDTO> rawData) {
        return rawData.stream().map(dto -> {
            Map<String, Object> item = new HashMap<>();
            item.put("nom", dto.getNom());
            item.put("emplacement", dto.getEmplacement());
            item.put("qteInitiale", dto.getQteInitiale());
            item.put("qteSaisie", dto.getQteSaisie());
            item.put("ecartQte", dto.getQteSaisie() - dto.getQteInitiale());
            item.put("prixAchat", dto.getPrixAchat());
            item.put("prixVente", dto.getPrixVente());
            item.put("ratioVA", dto.getPrixAchat() > 0 ? dto.getPrixVente() / dto.getPrixAchat() : 0);
            return item;
        }).collect(Collectors.toList());
    }

    private String buildSummaryHtml(List<AnalyseInvDTO> rawData, List<Map<String, Object>> summaryData) {
        DecimalFormat moneyFormat = new DecimalFormat("#,##0 'FCFA'");
        DecimalFormat percentFormat = new DecimalFormat("#.00' %'");

        double totalEcartNet = summaryData.stream().mapToDouble(m -> (Double) m.get("ecartValeurAchat")).sum();
        double totalValeurMachine = rawData.stream().mapToDouble(dto -> dto.getQteInitiale() * dto.getPrixAchat())
                .sum();
        double demarquePct = (totalValeurMachine == 0) ? 0 : (totalEcartNet / totalValeurMachine) * 100;

        String emplacementCritique = summaryData.stream()
                .max(Comparator.comparingDouble(m -> Math.abs((Double) m.get("ecartValeurAchat"))))
                .map(m -> (String) m.get("emplacement")).orElse("N/A");

        String emplacementFaibleMarge = summaryData.stream().filter(m -> (Double) m.get("ratioVA") > 0)
                .min(Comparator.comparingDouble(m -> (Double) m.get("ratioVA")))
                .map(m -> String.format("%s (%.2f)", m.get("emplacement"), m.get("ratioVA"))).orElse("N/A");

        StringBuilder sb = new StringBuilder();
        sb.append("<div style='font-family: Arial, sans-serif; padding: 10px;'>");
        sb.append("<h3>Synthèse & Recommandations</h3>");
        sb.append("<p><strong>Date du Rapport:</strong> ")
                .append(DateTimeFormatter.ofPattern("dd MMMM yyyy").format(LocalDateTime.now())).append("</p>");
        sb.append("<p><strong>Inventaire:</strong> ").append(rawData.isEmpty() ? "" : rawData.get(0).getInvName())
                .append("</p>");

        sb.append("<h4>1. Synthèse Globale</h4>");
        sb.append("<ul>");
        sb.append("<li>L'inventaire présente un écart global net de <strong>").append(moneyFormat.format(totalEcartNet))
                .append("</strong>.</li>");
        sb.append("<li>Cela représente une démarque de <strong>").append(String.format("%.2f %%", demarquePct))
                .append("</strong>.</li>");
        sb.append("</ul>");

        sb.append("<h4>2. Performance par Emplacement</h4>");
        sb.append("<ul>");
        sb.append("<li><strong>Emplacement Critique :</strong> ").append(emplacementCritique)
                .append(" (plus forte contribution à l'écart).</li>");
        sb.append("<li><strong>Marge à surveiller :</strong> ").append(emplacementFaibleMarge)
                .append(" (plus faible ratio V/A).</li>");
        sb.append("</ul>");

        sb.append("<h4>3. Recommandations</h4>");
        sb.append("<ol>");
        sb.append(
                "<li><strong>Action Immédiate :</strong> Lancer un contrôle ciblé sur les produits de catégorie A (voir onglet Analyse des Écarts) pour identifier la source des écarts.</li>");
        sb.append("<li><strong>Audit d'Emplacement :</strong> Mener un audit des procédures sur l'emplacement '")
                .append(emplacementCritique).append("'.</li>");
        sb.append(
                "<li><strong>Revue des Prix :</strong> Analyser la politique de prix des emplacements à faible ratio V/A.</li>");
        sb.append("</ol>");
        sb.append("</div>");

        return sb.toString();
    }

    private String buildComplianceReport(List<AnalyseInvDTO> rawData) {
        long modifiedProducts = rawData.stream().filter(dto -> !dto.getQteSaisie().equals(dto.getQteInitiale()))
                .count();
        long totalProducts = rawData.size();
        double percentage = (totalProducts > 0) ? ((double) modifiedProducts / totalProducts) * 100 : 0;
        return String.format("Rapport de conformité : %d produit(s) modifié(s) sur %d au total (%.2f %%)",
                modifiedProducts, totalProducts, percentage);
    }

    private AnalyseInvDTO tupleToDto(Tuple tuple) {
        return AnalyseInvDTO.builder().codeCip(tuple.get("codeCip", String.class)).nom(tuple.get("nom", String.class))
                .prixAchat(getTupleValue(tuple, "prixAchat", Number.class, 0.0).doubleValue())
                .prixVente(getTupleValue(tuple, "prixVente", Number.class, 0.0).doubleValue())
                .emplacement(tuple.get("emplacement", String.class))
                .inventaireId(tuple.get("inventaireId", String.class)).invName(tuple.get("invName", String.class))
                .qteSaisie(getTupleValue(tuple, "qteSaisie", Number.class, 0).intValue())
                .qteInitiale(getTupleValue(tuple, "qteInitiale", Number.class, 0).intValue()).build();
    }

    private <T> T getTupleValue(Tuple tuple, String alias, Class<T> type, T defaultValue) {
        Object value = tuple.get(alias);
        return value != null ? type.cast(value) : defaultValue;
    }
}
