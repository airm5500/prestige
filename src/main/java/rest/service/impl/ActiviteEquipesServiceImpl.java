package rest.service.impl;

import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import rest.service.ActiviteEquipesService;
import rest.service.dto.ActiviteCompteurDTO;
import rest.service.dto.ActiviteEmployeDTO;
import rest.service.dto.ActiviteFiltreDTO;
import rest.service.dto.ActiviteJournalDTO;
import rest.service.dto.ActiviteLigneDTO;

/**
 * Journal « Activité des équipes » : une branche SQL par type d'action, chacune filtree par la periode et l'employe
 * AVANT la reunion (UNION ALL), puis une page triee par date decroissante.
 *
 * <p>
 * Ce qui est lu : identifiants, dates, references, montants et l'utilisateur de Prestige. Les textes libres
 * (commentaires, descriptions de modification) ne sont pas repris : ils peuvent contenir le nom d'un client.
 */
@Stateless
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class ActiviteEquipesServiceImpl implements ActiviteEquipesService {

    /** Lignes au plus dans un export CSV. */
    static final int EXPORT_MAX = 100000;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Une branche du journal : type, libelle, puis le SELECT (colonnes d, t, u, r, m, x), la date et l'employe. */
    static final class Branche {

        final String type;
        final String libelle;
        final String select;
        final String date;
        final String employe;

        Branche(String type, String libelle, String select, String date, String employe) {
            this.type = type;
            this.libelle = libelle;
            this.select = select;
            this.date = date;
            this.employe = employe;
        }
    }

    static final List<Branche> BRANCHES = List.of(new Branche("VENTE", "Vente encaissée",
            "SELECT p.dt_UPDATED AS d, 'VENTE' AS t, p.lg_USER_CAISSIER_ID AS u, p.str_REF AS r, p.int_PRICE AS m,"
                    + " CONCAT('Vente ', IFNULL(p.str_TYPE_VENTE, '')) AS x FROM t_preenregistrement p"
                    + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0",
            "p.dt_UPDATED", "p.lg_USER_CAISSIER_ID"),
            new Branche("VENDEUR", "Vente comme vendeur",
                    "SELECT p.dt_CREATED AS d, 'VENDEUR' AS t, p.lg_USER_VENDEUR_ID AS u, p.str_REF AS r, p.int_PRICE AS m,"
                            + " 'Vente saisie, encaissée par un autre' AS x FROM t_preenregistrement p"
                            + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
                            + " AND p.lg_USER_VENDEUR_ID <> p.lg_USER_CAISSIER_ID",
                    "p.dt_UPDATED", "p.lg_USER_VENDEUR_ID"),
            new Branche("ANNULATION", "Vente annulée",
                    "SELECT p.dt_ANNULER AS d, 'ANNULATION' AS t, p.lg_USER_ID AS u, p.str_REF AS r, p.int_PRICE AS m,"
                            + " 'Vente annulée' AS x FROM t_preenregistrement p"
                            + " WHERE p.b_IS_CANCEL = 1 AND p.int_PRICE > 0"
                            + " AND NOT EXISTS (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID)",
                    "p.dt_ANNULER", "p.lg_USER_ID"),
            new Branche("MODIFICATION", "Vente modifiée",
                    "SELECT v.mvt_date AS d, 'MODIFICATION' AS t, v.user_id AS u, v.vente_ref AS r, v.montant_apres AS m,"
                            + " CONCAT('Modification : ', IFNULL(v.type_modification, ''), ' (avant ', IFNULL(v.montant_avant, 0), ')') AS x"
                            + " FROM vente_modifiee v WHERE 1 = 1",
                    "v.mvt_date", "v.user_id"),
            new Branche("BL", "Bon de livraison entré",
                    "SELECT b.dt_CREATED AS d, 'BL' AS t, b.lg_USER_ID AS u, b.str_REF_LIVRAISON AS r, b.int_HTTC AS m,"
                            + " CONCAT('BL ', IFNULL(g.str_LIBELLE, '')) AS x FROM t_bon_livraison b"
                            + " LEFT JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID"
                            + " WHERE b.str_STATUT = 'is_Closed'",
                    "b.dt_CREATED", "b.lg_USER_ID"),
            new Branche("COMMANDE", "Commande créée",
                    "SELECT o.dt_CREATED AS d, 'COMMANDE' AS t, o.lg_USER_ID AS u, o.str_REF_ORDER AS r, o.int_PRICE AS m,"
                            + " CONCAT('Commande ', IFNULL(g.str_LIBELLE, ''), ' (', IFNULL(o.int_LINE, 0), ' lignes)') AS x"
                            + " FROM t_order o LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID WHERE 1 = 1",
                    "o.dt_CREATED", "o.lg_USER_ID"),
            new Branche("AJUSTEMENT", "Ajustement de stock",
                    "SELECT a.dt_CREATED AS d, 'AJUSTEMENT' AS t, a.lg_USER_ID AS u, a.str_NAME AS r, NULL AS m,"
                            + " CONCAT('Ajustement ', IFNULL(a.str_ZONE, '')) AS x FROM t_ajustement a WHERE 1 = 1",
                    "a.dt_CREATED", "a.lg_USER_ID"),
            new Branche("INVENTAIRE", "Inventaire créé",
                    "SELECT i.dt_CREATED AS d, 'INVENTAIRE' AS t, i.lg_USER_ID AS u, i.str_NAME AS r, NULL AS m,"
                            + " 'Inventaire créé' AS x FROM t_inventaire i WHERE 1 = 1",
                    "i.dt_CREATED", "i.lg_USER_ID"),
            new Branche("RETOUR", "Retour fournisseur",
                    "SELECT f.dt_CREATED AS d, 'RETOUR' AS t, f.lg_USER_ID AS u, f.str_REF_RETOUR_FRS AS r, f.dl_AMOUNT AS m,"
                            + " CONCAT('Retour ', IFNULL(g.str_LIBELLE, '')) AS x FROM t_retour_fournisseur f"
                            + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID WHERE 1 = 1",
                    "f.dt_CREATED", "f.lg_USER_ID"),
            new Branche("CONNEXION", "Connexion",
                    "SELECT e.dt_CREATED AS d, 'CONNEXION' AS t, e.lg_USER_ID AS u, NULL AS r, NULL AS m,"
                            + " e.str_DESCRIPTION AS x FROM t_event_log e WHERE e.str_DESCRIPTION LIKE 'Authentification%'",
                    "e.dt_CREATED", "e.lg_USER_ID"));

    static final Map<String, String> LIBELLES = new LinkedHashMap<>();
    static {
        BRANCHES.forEach(b -> LIBELLES.put(b.type, b.libelle));
    }

    @Override
    public List<ActiviteEmployeDTO> employes() {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em
                .createNativeQuery("SELECT u.lg_USER_ID, TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ',"
                        + " IFNULL(u.str_LAST_NAME, ''))), u.str_STATUT = 'enable' FROM t_user u"
                        + " WHERE u.str_STATUT IN ('enable', 'disable') ORDER BY u.str_STATUT = 'enable' DESC, 2")
                .getResultList();
        List<ActiviteEmployeDTO> res = new ArrayList<>();
        for (Object[] r : l) {
            res.add(ActiviteEmployeDTO.builder().id(String.valueOf(r[0])).nom(String.valueOf(r[1]))
                    .actif(r[2] != null && ((Number) r[2]).intValue() == 1).build());
        }
        return res;
    }

    /** Requete reunie : branches retenues (type), chacune filtree par periode et employe. */
    static String reunion(ActiviteFiltreDTO f, List<Object> params, boolean toutesLesBranches) {
        StringBuilder sql = new StringBuilder();
        for (Branche b : BRANCHES) {
            if (!toutesLesBranches && vide(f.getType()) == false && !b.type.equals(f.getType())) {
                continue;
            }
            if (sql.length() > 0) {
                sql.append(" UNION ALL ");
            }
            sql.append(b.select).append(" AND ").append(b.date).append(" >= ?").append(params.size() + 1);
            params.add(Timestamp.valueOf(f.getDebut().atStartOfDay()));
            sql.append(" AND ").append(b.date).append(" < ?").append(params.size() + 1);
            params.add(Timestamp.valueOf(f.getFin().plusDays(1).atStartOfDay()));
            if (!vide(f.getEmployeId())) {
                sql.append(" AND ").append(b.employe).append(" = ?").append(params.size() + 1);
                params.add(f.getEmployeId());
            }
        }
        return sql.toString();
    }

    /** Filtre de recherche sur la reunion (reference ou detail). */
    static String recherche(ActiviteFiltreDTO f, List<Object> params) {
        if (vide(f.getRecherche())) {
            return "";
        }
        String motif = "%" + f.getRecherche().trim() + "%";
        params.add(motif);
        params.add(motif);
        return " WHERE (a.r LIKE ?" + (params.size() - 1) + " OR a.x LIKE ?" + params.size() + ")";
    }

    @Override
    public ActiviteJournalDTO journal(ActiviteFiltreDTO f) {
        /* compteurs par type : toutes les branches, sans le filtre de type (pastilles) */
        List<Object> pc = new ArrayList<>();
        String sqlCompteurs = "SELECT a.t, COUNT(*) FROM (" + reunion(f, pc, true) + ") a" + recherche(f, pc)
                + " GROUP BY a.t";
        Map<String, Long> parType = new LinkedHashMap<>();
        for (Object[] r : liste(sqlCompteurs, pc)) {
            parType.put(String.valueOf(r[0]), ((Number) r[1]).longValue());
        }
        List<ActiviteCompteurDTO> compteurs = new ArrayList<>();
        LIBELLES.forEach((t, l) -> compteurs
                .add(ActiviteCompteurDTO.builder().type(t).libelle(l).nombre(parType.getOrDefault(t, 0L)).build()));
        long total = vide(f.getType()) ? parType.values().stream().mapToLong(Long::longValue).sum()
                : parType.getOrDefault(f.getType(), 0L);

        List<ActiviteLigneDTO> lignes = page(f, Math.max(1, Math.min(f.getLimit(), 500)));
        return ActiviteJournalDTO.builder().total(total).lignes(lignes).compteurs(compteurs).build();
    }

    @Override
    public List<ActiviteLigneDTO> export(ActiviteFiltreDTO f) {
        f.setStart(0);
        return page(f, EXPORT_MAX);
    }

    /** Lignes du journal, triees par date decroissante, a partir de f.start. */
    private List<ActiviteLigneDTO> page(ActiviteFiltreDTO f, int limite) {
        List<Object> pp = new ArrayList<>();
        String sqlPage = "SELECT a.d, a.t, a.u, TRIM(CONCAT(IFNULL(us.str_FIRST_NAME, ''), ' ', IFNULL(us.str_LAST_NAME, ''))),"
                + " a.r, a.m, a.x FROM (" + reunion(f, pp, false) + ") a LEFT JOIN t_user us ON us.lg_USER_ID = a.u"
                + recherche(f, pp) + " ORDER BY a.d DESC, a.t, a.r LIMIT " + limite + " OFFSET "
                + Math.max(0, f.getStart());
        SimpleDateFormat fmt = new SimpleDateFormat("dd/MM/yyyy HH:mm");
        List<ActiviteLigneDTO> lignes = new ArrayList<>();
        for (Object[] r : liste(sqlPage, pp)) {
            lignes.add(ActiviteLigneDTO.builder().date(r[0] == null ? "" : fmt.format((java.util.Date) r[0]))
                    .type(String.valueOf(r[1])).libelleType(LIBELLES.get(String.valueOf(r[1])))
                    .employeId(r[2] == null ? null : String.valueOf(r[2]))
                    .employe(r[3] == null ? "" : String.valueOf(r[3]))
                    .reference(r[4] == null ? "" : String.valueOf(r[4]))
                    .montant(r[5] == null ? null : ((Number) r[5]).longValue())
                    .detail(r[6] == null ? "" : String.valueOf(r[6])).build());
        }
        return lignes;
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> liste(String sql, List<Object> params) {
        Query q = em.createNativeQuery(sql);
        for (int i = 0; i < params.size(); i++) {
            q.setParameter(i + 1, params.get(i));
        }
        return q.getResultList();
    }

    static boolean vide(String s) {
        return s == null || s.trim().isEmpty() || "ALL".equalsIgnoreCase(s.trim());
    }

    /** Periode bornee : fin par defaut aujourd'hui, debut par defaut le 1er du mois, au plus maxJours. */
    public static LocalDate[] periode(LocalDate debut, LocalDate fin, int maxJours) {
        LocalDate f = fin == null ? LocalDate.now() : fin;
        LocalDate d = debut == null ? f.withDayOfMonth(1) : debut;
        if (d.isAfter(f)) {
            LocalDate x = d;
            d = f;
            f = x;
        }
        if (d.plusDays(maxJours).isBefore(f)) {
            d = f.minusDays(maxJours);
        }
        return new LocalDate[] { d, f };
    }
}
