package rest.service.impl;

import commonTasks.dto.AbcProduitDTO;
import dal.TClasseAbc;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
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
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.AbcAnalysisService;
import rest.service.SessionHelperService;

@Stateless
public class AbcAnalysisServiceImpl implements AbcAnalysisService {

    private static final Logger LOG = Logger.getLogger(AbcAnalysisServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private SessionHelperService sessionHelperService;

    private String procedureName(String type) {
        if (type == null) {
            return "analyse_abc_par_ca";
        }
        switch (type.trim().toUpperCase()) {
        case "QTY":
            return "analyse_abc_par_quantite";
        case "MARGE":
            return "analyse_abc_par_marge";
        case "CA":
        default:
            return "analyse_abc_par_ca";
        }
    }

    private static String norm(String v) {
        return ("ALL".equalsIgnoreCase(v)) ? "" : (v == null ? "" : v);
    }

    private static int asInt(Object o) {
        return (o instanceof Number) ? ((Number) o).intValue() : 0;
    }

    private static long asLong(Object o) {
        return (o instanceof Number) ? ((Number) o).longValue() : 0L;
    }

    private static double asDouble(Object o) {
        return (o instanceof Number) ? ((Number) o).doubleValue() : 0d;
    }

    private static Integer asInteger(Object o) {
        return (o instanceof Number) ? ((Number) o).intValue() : null;
    }

    private static String asStr(Object o) {
        return (o == null) ? "" : o.toString();
    }

    @Override
    public List<AbcProduitDTO> classify(String dtStart, String dtEnd, String type, String codeFamille, String codeRayon,
            String codeGrossiste) {
        List<AbcProduitDTO> list = new ArrayList<>();
        try {
            String emplacement = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            Query query = em.createNativeQuery("CALL " + procedureName(type) + "(?, ?, ?, ?, ?, ?)");
            query.setParameter(1, dtStart);
            query.setParameter(2, dtEnd);
            query.setParameter(3, emplacement);
            query.setParameter(4, norm(codeFamille));
            query.setParameter(5, norm(codeRayon));
            query.setParameter(6, norm(codeGrossiste));

            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();
            for (Object[] r : rows) {
                AbcProduitDTO dto = new AbcProduitDTO();
                dto.setCip(asStr(r[0]));
                dto.setEan(asStr(r[1]));
                dto.setLibelle(asStr(r[2]));
                dto.setClasse(asStr(r[3]));
                dto.setFamille(asStr(r[4]));
                dto.setRayon(asStr(r[5]));
                dto.setCodeGeoArticle(asStr(r[6]));
                dto.setStockDisponible(asInt(r[7]));
                dto.setSeuilMini(asInt(r[8]));
                dto.setQuantiteReappro(asInt(r[9]));
                dto.setQuantiteVendue(asLong(r[10]));
                dto.setChiffreAffaires(asLong(r[11]));
                dto.setMarge(asLong(r[12]));
                dto.setPartPourcentage(asDouble(r[13]));
                dto.setCumulPourcentage(asDouble(r[14]));
                dto.setProduitId(asStr(r[15]));
                dto.setGrossisteId(asStr(r[16]));
                dto.setQ1(asInteger(r[17]));
                dto.setQ2(asInteger(r[18]));
                dto.setQ3(asInteger(r[19]));
                dto.setUniteCalcul(asStr(r[20]));
                list.add(dto);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Erreur classification ABC", e);
            return Collections.emptyList();
        }
        return list;
    }

    private boolean matchSearch(AbcProduitDTO d, String search) {
        if (StringUtils.isBlank(search)) {
            return true;
        }
        String s = search.trim().toLowerCase();
        return (d.getCip() != null && d.getCip().toLowerCase().contains(s))
                || (d.getLibelle() != null && d.getLibelle().toLowerCase().contains(s))
                || (d.getEan() != null && d.getEan().toLowerCase().contains(s))
                || (d.getCodeGeoArticle() != null && d.getCodeGeoArticle().toLowerCase().contains(s));
    }

    private boolean matchStock(AbcProduitDTO d, String stockFilter, Integer min, Integer max) {
        if (StringUtils.isBlank(stockFilter) || "ALL".equalsIgnoreCase(stockFilter)) {
            return true;
        }
        int stock = d.getStockDisponible();
        switch (stockFilter.trim().toUpperCase()) {
        case "SUP0":
            return stock > 0;
        case "EGAL0":
            return stock == 0;
        case "INF_SEUIL":
            return stock < d.getSeuilMini();
        case "INF_EGAL_SEUIL":
            return stock <= d.getSeuilMini();
        case "NEGATIF":
            return stock < 0;
        case "ENTRE":
            int lo = (min != null) ? min : Integer.MIN_VALUE;
            int hi = (max != null) ? max : Integer.MAX_VALUE;
            return stock >= lo && stock <= hi;
        default:
            return true;
        }
    }

    private Comparator<AbcProduitDTO> buildComparator(String sort, String dir) {
        Comparator<AbcProduitDTO> cmp;
        String s = (sort == null) ? "" : sort.trim();
        switch (s) {
        case "quantiteVendue":
        case "QTY":
            cmp = Comparator.comparingLong(AbcProduitDTO::getQuantiteVendue);
            break;
        case "marge":
        case "MARGE":
            cmp = Comparator.comparingLong(AbcProduitDTO::getMarge);
            break;
        case "chiffreAffaires":
        case "CA":
            cmp = Comparator.comparingLong(AbcProduitDTO::getChiffreAffaires);
            break;
        default:
            return null; // conserve l'ordre de la procedure
        }
        if (!"asc".equalsIgnoreCase(dir)) {
            cmp = cmp.reversed();
        }
        return cmp;
    }

    /** Construit le resume par classe sur l'ensemble fourni (toujours A/B/C presents). */
    private JSONObject buildSummary(List<AbcProduitDTO> data) {
        Map<String, long[]> agg = new LinkedHashMap<>();
        agg.put("A", new long[4]);
        agg.put("B", new long[4]);
        agg.put("C", new long[4]);
        for (AbcProduitDTO d : data) {
            long[] a = agg.get(d.getClasse());
            if (a == null) {
                continue;
            }
            a[0] += 1; // nbProduits
            a[1] += d.getChiffreAffaires();
            a[2] += d.getQuantiteVendue();
            a[3] += d.getMarge();
        }
        JSONObject summary = new JSONObject();
        for (Map.Entry<String, long[]> e : agg.entrySet()) {
            long[] a = e.getValue();
            summary.put(e.getKey(), new JSONObject().put("nbProduits", a[0]).put("chiffreAffaires", a[1])
                    .put("quantiteVendue", a[2]).put("marge", a[3]));
        }
        return summary;
    }

    @Override
    public JSONObject grid(String dtStart, String dtEnd, String type, String classe, String search, String codeFamille,
            String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin, Integer stockMax, int start,
            int limit, String sort, String dir) {

        List<AbcProduitDTO> all = classify(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);

        // Filtres recherche + stock (le resume s'appuie sur cet ensemble, toutes classes)
        List<AbcProduitDTO> filtered = all.stream()
                .filter(d -> matchSearch(d, search))
                .filter(d -> matchStock(d, stockFilter, stockMin, stockMax))
                .collect(Collectors.toList());

        JSONObject summary = buildSummary(filtered);

        // Filtre classe (n'impacte pas le resume A/B/C)
        List<AbcProduitDTO> rows = filtered;
        if (StringUtils.isNotBlank(classe) && !"ALL".equalsIgnoreCase(classe)) {
            if ("NONE".equalsIgnoreCase(classe)) {
                rows = new ArrayList<>();
            } else {
                final String c = classe.trim().toUpperCase();
                rows = filtered.stream().filter(d -> c.equalsIgnoreCase(d.getClasse())).collect(Collectors.toList());
            }
        }

        // Tri optionnel (sinon ordre de la procedure)
        Comparator<AbcProduitDTO> cmp = buildComparator(sort, dir);
        if (cmp != null) {
            rows.sort(cmp);
        }

        int total = rows.size();

        // Pagination
        List<AbcProduitDTO> page = rows;
        if (limit > 0) {
            int from = Math.max(0, start);
            int to = Math.min(total, from + limit);
            page = (from <= to) ? rows.subList(from, to) : Collections.emptyList();
        }

        return new JSONObject().put("success", true).put("total", total).put("data", new JSONArray(page))
                .put("summary", summary);
    }

    @Override
    public JSONObject recalculate(String dtStart, String dtEnd, String type, String codeFamille, String codeRayon,
            String codeGrossiste) {
        List<AbcProduitDTO> all = classify(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);
        return new JSONObject().put("success", true).put("total", all.size()).put("summary", buildSummary(all));
    }

    @Override
    public JSONObject apply(String dtStart, String dtEnd, String type, String codeFamille, String codeRayon,
            String codeGrossiste) {
        List<AbcProduitDTO> all = classify(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);
        if (all.isEmpty()) {
            return new JSONObject().put("success", true).put("count", 0);
        }

        // Code classe -> id technique
        Map<String, String> codeToId = new HashMap<>();
        try {
            List<TClasseAbc> classes = em.createNamedQuery("TClasseAbc.findAll", TClasseAbc.class).getResultList();
            for (TClasseAbc c : classes) {
                codeToId.put(c.getStrCODE(), c.getLgCLASSEABCID());
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Lecture t_classe_abc impossible", e);
            return new JSONObject().put("success", false).put("count", 0);
        }

        // Regroupe les produits par classe puis applique par lots
        Map<String, List<String>> idsByClasse = new HashMap<>();
        for (AbcProduitDTO d : all) {
            String id = codeToId.get(d.getClasse());
            if (id == null || StringUtils.isBlank(d.getProduitId())) {
                continue;
            }
            idsByClasse.computeIfAbsent(d.getClasse(), k -> new ArrayList<>()).add(d.getProduitId());
        }

        Date now = new Date();
        int count = 0;
        final int CHUNK = 500;
        for (Map.Entry<String, List<String>> e : idsByClasse.entrySet()) {
            String classeId = codeToId.get(e.getKey());
            List<String> ids = e.getValue();
            for (int i = 0; i < ids.size(); i += CHUNK) {
                List<String> sub = ids.subList(i, Math.min(ids.size(), i + CHUNK));
                int updated = em.createQuery(
                        "UPDATE TFamille f SET f.lgCLASSEABCID = :cid, f.dtUPDATEDCLASSEABC = :now WHERE f.lgFAMILLEID IN :ids")
                        .setParameter("cid", classeId).setParameter("now", now).setParameter("ids", sub)
                        .executeUpdate();
                count += updated;
            }
        }
        return new JSONObject().put("success", true).put("count", count);
    }

    @Override
    public JSONObject listClasses() {
        JSONArray arr = new JSONArray();
        try {
            List<TClasseAbc> classes = em.createNamedQuery("TClasseAbc.findAll", TClasseAbc.class).getResultList();
            classes.sort(Comparator.comparing(TClasseAbc::getStrCODE));
            for (TClasseAbc c : classes) {
                arr.put(new JSONObject()
                        .put("id", c.getLgCLASSEABCID())
                        .put("code", c.getStrCODE())
                        .put("libelle", c.getStrLIBELLE())
                        .put("q1", c.getIntQ1())
                        .put("q2", c.getIntQ2())
                        .put("q3", c.getIntQ3())
                        .put("unite", c.getStrUNITECALCUL())
                        .put("seuilMin", c.getDblSEUILCUMULMIN())
                        .put("seuilMax", c.getDblSEUILCUMULMAX())
                        .put("statut", c.getStrSTATUT()));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Lecture des classes ABC impossible", e);
            return new JSONObject().put("success", false).put("data", arr);
        }
        return new JSONObject().put("success", true).put("data", arr);
    }

    @Override
    public JSONObject updateClasse(String id, Integer q1, Integer q2, Integer q3, String unite, Double seuilMin,
            Double seuilMax, String statut) {
        if (StringUtils.isBlank(id)) {
            return new JSONObject().put("success", false).put("message", "Identifiant de classe manquant");
        }
        TClasseAbc c = em.find(TClasseAbc.class, id);
        if (c == null) {
            return new JSONObject().put("success", false).put("message", "Classe introuvable");
        }
        if (q1 != null) {
            c.setIntQ1(q1);
        }
        if (q2 != null) {
            c.setIntQ2(q2);
        }
        if (q3 != null) {
            c.setIntQ3(q3);
        }
        if (StringUtils.isNotBlank(unite)) {
            String u = unite.trim().toUpperCase();
            c.setStrUNITECALCUL("JOUR".equals(u) ? "JOUR" : "SEMAINE");
        }
        if (seuilMin != null) {
            c.setDblSEUILCUMULMIN(seuilMin);
        }
        if (seuilMax != null) {
            c.setDblSEUILCUMULMAX(seuilMax);
        }
        if (StringUtils.isNotBlank(statut)) {
            c.setStrSTATUT(statut.trim());
        }
        c.setDtUPDATED(new Date());
        em.merge(c);
        return new JSONObject().put("success", true);
    }
}
