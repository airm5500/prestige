package rest.service.impl;

import commonTasks.dto.ComboDTO;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
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
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.json.JSONObject;
import rest.service.ArticleMvtService;
import rest.service.InventaireService;
import rest.service.dto.ArticleMvtDTO;
import rest.service.dto.ArticleMvtFilter;
import util.FunctionUtils;

@Stateless
public class ArticleMvtServiceImpl implements ArticleMvtService {

    private static final Logger LOG = Logger.getLogger(ArticleMvtServiceImpl.class.getName());

    private static final String TYPES_MVT_QUERY = "SELECT t.ID AS id, t.description AS description"
            + " FROM typemvtproduit t ORDER BY t.description";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private InventaireService inventaireService;

    // ------------------------------------------------------------------
    // Anciennes signatures : conservees telles quelles, sans filtre en plus.
    // ------------------------------------------------------------------
    @Override
    public JSONObject getAllArticleMvt(String dtStart, String dtEnd, String query, int limit, int start) {
        return getAllArticleMvt(filtreSimple(dtStart, dtEnd, query), limit, start);
    }

    @Override
    public JSONObject getAllArticleMvt(String dtStart, String dtEnd, String query) {
        return FunctionUtils.returnData(getAllArticleMvt(filtreSimple(dtStart, dtEnd, query), 0, 0, false));
    }

    @Override
    public List<ArticleMvtDTO> getAllArticleMvt(String dtStart, String dtEnd, String query, int limit, int start,
            boolean all) {
        return getAllArticleMvt(filtreSimple(dtStart, dtEnd, query), limit, start, all);
    }

    @Override
    public byte[] exportToExcel(String dtStart, String dtEnd, String query) {
        return exportToExcel(filtreSimple(dtStart, dtEnd, query));
    }

    private static ArticleMvtFilter filtreSimple(String dtStart, String dtEnd, String query) {
        return ArticleMvtFilter.builder().dtStart(dtStart).dtEnd(dtEnd).query(query).build();
    }

    // ------------------------------------------------------------------
    // Lecture
    // ------------------------------------------------------------------
    @Override
    public JSONObject getAllArticleMvt(ArticleMvtFilter filtre, int limit, int start) {
        int total = getCount(filtre);
        return FunctionUtils.returnData(getAllArticleMvt(filtre, limit, start, true), total);
    }

    @Override
    public JSONObject getAllArticleMvt(ArticleMvtFilter filtre) {
        return FunctionUtils.returnData(getAllArticleMvt(filtre, 0, 0, false));
    }

    @Override
    public List<ArticleMvtDTO> getAllArticleMvt(ArticleMvtFilter filtre, int limit, int start, boolean all) {
        return fetchAllArticleMvt(filtre, limit, start, all).stream().map(this::build).collect(Collectors.toList());
    }

    private List<Tuple> fetchAllArticleMvt(ArticleMvtFilter filtre, int limit, int start, boolean all) {
        String sql = ArticleMvtSql.liste(filtre);
        try {
            Query q = appliquerParametres(em.createNativeQuery(sql, Tuple.class), filtre);
            if (all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "articlemvt : echec de la liste " + sql, e);
            return new ArrayList<>();
        }
    }

    private int getCount(ArticleMvtFilter filtre) {
        try {
            Query q = appliquerParametres(em.createNativeQuery(ArticleMvtSql.comptage(filtre)), filtre);
            return ((Number) q.getSingleResult()).intValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "articlemvt : echec du comptage", e);
            return 0;
        }
    }

    /**
     * Renseigne uniquement les parametres que le SQL construit contient reellement : les clauses etant optionnelles,
     * positionner un parametre absent leverait une exception.
     */
    private Query appliquerParametres(Query q, ArticleMvtFilter filtre) {
        q.setParameter(ArticleMvtSql.P_DEBUT, Timestamp.valueOf(filtre.debut().atStartOfDay()));
        q.setParameter(ArticleMvtSql.P_FIN, Timestamp.valueOf(filtre.fin().plusDays(1).atStartOfDay()));
        if (filtre.rechercheLike() != null) {
            q.setParameter(ArticleMvtSql.P_RECHERCHE, filtre.rechercheLike());
        }
        if (filtre.typeMvtOuNull() != null) {
            q.setParameter(ArticleMvtSql.P_TYPE_MVT, filtre.typeMvtOuNull());
        }
        if (filtre.emplacementOuNull() != null) {
            q.setParameter(ArticleMvtSql.P_EMPLACEMENT, filtre.emplacementOuNull());
        }
        if (filtre.familleOuNull() != null) {
            q.setParameter(ArticleMvtSql.P_FAMILLE, filtre.familleOuNull());
        }
        return q;
    }

    private ArticleMvtDTO build(Tuple t) {
        Integer prixVente = t.get("prixVente", Integer.class);
        Integer prixAchat = t.get("prixAchat", Integer.class);
        return ArticleMvtDTO.builder().lgFamilleId(t.get("lgFamilleId", String.class))
                .codeCip(t.get("codeCip", String.class)).strName(t.get("strName", String.class))
                .prixVente(Objects.isNull(prixVente) ? 0 : prixVente)
                .prixAchat(Objects.isNull(prixAchat) ? 0 : prixAchat)
                .emplacement(StringUtils.defaultString(t.get("emplacement", String.class)))
                .famille(StringUtils.defaultString(t.get("famille", String.class)))
                .typesMvt(StringUtils.defaultString(t.get("typesMvt", String.class))).build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<ComboDTO> typesMouvement() {
        List<ComboDTO> types = new ArrayList<>();
        types.add(new ComboDTO(ArticleMvtFilter.TOUS, "Tous"));
        try {
            List<Tuple> lignes = em.createNativeQuery(TYPES_MVT_QUERY, Tuple.class).getResultList();
            for (Tuple t : lignes) {
                types.add(new ComboDTO(String.valueOf(t.get("id")), t.get("description", String.class)));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "articlemvt : echec du chargement des types de mouvement", e);
        }
        return types;
    }

    // ------------------------------------------------------------------
    // Creation d'inventaire
    // ------------------------------------------------------------------
    @Override
    public JSONObject createInventaireFromSelection(String ids, String dtStart, String dtEnd) {
        JSONObject json = new JSONObject();
        try {
            if (StringUtils.isBlank(ids)) {
                return json.put("success", false).put("count", 0).put("message", "Aucun article sélectionné.");
            }
            Set<String> famillesIds = Arrays.stream(ids.split(",")).map(StringUtils::trimToNull)
                    .filter(Objects::nonNull).collect(Collectors.toSet());
            if (famillesIds.isEmpty()) {
                return json.put("success", false).put("count", 0).put("message", "Aucun identifiant d'article valide.");
            }
            return creer(famillesIds, "INVENTAIRE ARTICLES EN MOUVEMENT DU " + dtStart + " AU " + dtEnd);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Erreur lors de la création de l'inventaire à partir des mouvements d'articles", e);
            return json.put("success", false).put("count", 0).put("message",
                    "Erreur serveur lors de la création de l'inventaire.");
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject createInventaireFromFilter(ArticleMvtFilter filtre) {
        JSONObject json = new JSONObject();
        try {
            List<Object> resultats = appliquerParametres(em.createNativeQuery(ArticleMvtSql.identifiants(filtre)),
                    filtre).getResultList();
            Set<String> famillesIds = new LinkedHashSet<>();
            for (Object o : resultats) {
                String id = StringUtils.trimToNull(String.valueOf(o));
                if (id != null) {
                    famillesIds.add(id);
                }
            }
            if (famillesIds.isEmpty()) {
                return json.put("success", false).put("count", 0).put("message",
                        "Aucun article ne correspond aux critères : rien à inventorier.");
            }
            return creer(famillesIds, libelleInventaire(filtre));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Erreur lors de la création de l'inventaire de la liste filtrée", e);
            return json.put("success", false).put("count", 0).put("message",
                    "Erreur serveur lors de la création de l'inventaire.");
        }
    }

    private JSONObject creer(Set<String> famillesIds, String libelle) {
        int count = inventaireService.create(famillesIds, libelle);
        return new JSONObject().put("success", true).put("count", count).put("selection", famillesIds.size())
                .put("message", "Inventaire créé avec succès (" + count + " article(s)).");
    }

    /** Le libelle rappelle le mode retenu : c'est la seule trace du critere une fois l'inventaire cree. */
    private String libelleInventaire(ArticleMvtFilter filtre) {
        StringBuilder sb = new StringBuilder("INVENTAIRE ARTICLES EN MOUVEMENT DU ").append(filtre.debutTexte())
                .append(" AU ").append(filtre.finTexte());
        String type = filtre.typeMvtOuNull();
        if (type != null) {
            sb.append(" - ").append(StringUtils.defaultIfBlank(libelleTypeMvt(type), "MODE " + type));
        }
        return StringUtils.abbreviate(sb.toString(), 250);
    }

    private String libelleTypeMvt(String id) {
        try {
            Object libelle = em.createNativeQuery("SELECT t.description FROM typemvtproduit t WHERE t.ID = :id")
                    .setParameter("id", id).getSingleResult();
            return libelle == null ? null : String.valueOf(libelle);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "articlemvt : type de mouvement {0} introuvable", id);
            return null;
        }
    }

    // ------------------------------------------------------------------
    // Export
    // ------------------------------------------------------------------
    @Override
    public byte[] exportToExcel(ArticleMvtFilter filtre) {
        List<ArticleMvtDTO> data = getAllArticleMvt(filtre, 0, 0, false);

        try (Workbook workbook = new HSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("ArticlesMvt");
            int rowIndex = 0;

            Row header = sheet.createRow(rowIndex++);
            header.createCell(0).setCellValue("CIP");
            header.createCell(1).setCellValue("Désignation");
            header.createCell(2).setCellValue("Emplacement");
            header.createCell(3).setCellValue("Famille");
            header.createCell(4).setCellValue("Types de mouvement");
            header.createCell(5).setCellValue("Prix achat");
            header.createCell(6).setCellValue("Prix vente");

            for (ArticleMvtDTO dto : data) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(StringUtils.defaultString(dto.getCodeCip()));
                row.createCell(1).setCellValue(StringUtils.defaultString(dto.getStrName()));
                row.createCell(2).setCellValue(StringUtils.defaultString(dto.getEmplacement()));
                row.createCell(3).setCellValue(StringUtils.defaultString(dto.getFamille()));
                row.createCell(4).setCellValue(StringUtils.defaultString(dto.getTypesMvt()));
                row.createCell(5).setCellValue(dto.getPrixAchat() == null ? 0 : dto.getPrixAchat());
                row.createCell(6).setCellValue(dto.getPrixVente() == null ? 0 : dto.getPrixVente());
            }

            for (int i = 0; i < 7; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "Erreur lors de l'export Excel des articles en mouvement", e);
            return new byte[0];
        }
    }
}
