package com.prestige.etiquettage.catalogue;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/** Lecture et ecriture des produits (table produit ; champs ajoutes dans champs_libres, en JSON). */
@Repository
public class Produits {

    /** Champs fixes, colonnes de la table produit. */
    public static final List<String> FIXES = List.of("cip", "designation", "prix", "ean", "grossiste", "lot",
            "peremption", "code_geo", "mention", "nombre");
    static final String SELECT = "SELECT cip, designation, prix, ean, grossiste, lot, peremption, code_geo, mention,"
            + " nombre, champs_libres, cree_le, cree_par, modifie_le, modifie_par FROM produit";
    private static final DateTimeFormatter HORODATE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int PAQUET = 1000;

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public Produits(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /** Lecteur de lignes (methode, pas champ : le depot est un proxy Spring). */
    public RowMapper<Produit> lecteur() {
        return this::lire;
    }

    private Produit lire(ResultSet rs, int i) throws SQLException {
        Map<String, String> v = new LinkedHashMap<>();
        for (String c : List.of("cip", "designation", "ean", "grossiste", "lot", "code_geo", "mention")) {
            mettre(v, c, rs.getString(c));
        }
        long prix = rs.getLong("prix");
        if (!rs.wasNull()) {
            v.put("prix", Long.toString(prix));
        }
        LocalDate per = rs.getObject("peremption", LocalDate.class);
        if (per != null) {
            v.put("peremption", per.format(Controles.JJ_MM_AAAA));
        }
        v.put("nombre", Integer.toString(rs.getInt("nombre")));
        String libres = rs.getString("champs_libres");
        if (libres != null && !libres.isBlank()) {
            try {
                Map<String, Object> m = json.readValue(libres, new TypeReference<TreeMap<String, Object>>() {
                });
                m.forEach((k, x) -> mettre(v, k, x == null ? null : x.toString()));
            } catch (JsonProcessingException e) {
                // contenu illisible : ignore (la colonne est controlee par JSON_VALID)
            }
        }
        return new Produit(rs.getString("cip"), v, horodate(rs.getTimestamp("cree_le")), rs.getString("cree_par"),
                horodate(rs.getTimestamp("modifie_le")), rs.getString("modifie_par"));
    }

    private static void mettre(Map<String, String> v, String cle, String valeur) {
        if (valeur != null && !valeur.isEmpty()) {
            v.put(cle, valeur);
        }
    }

    private static String horodate(Timestamp t) {
        return t == null ? null : t.toLocalDateTime().format(HORODATE);
    }

    public Produit lire(String cip) {
        List<Produit> l = jdbc.query(SELECT + " WHERE cip = ?", lecteur(), cip);
        return l.isEmpty() ? null : l.get(0);
    }

    /** Produits existants parmi ces CIP (par paquets de 1000). */
    public Map<String, Produit> lire(Collection<String> cips) {
        Map<String, Produit> m = new LinkedHashMap<>();
        List<String> tous = new ArrayList<>(cips);
        for (int i = 0; i < tous.size(); i += PAQUET) {
            List<String> p = tous.subList(i, Math.min(tous.size(), i + PAQUET));
            String marques = String.join(",", Collections.nCopies(p.size(), "?"));
            jdbc.query(SELECT + " WHERE cip IN (" + marques + ")", lecteur(), p.toArray()).forEach(x -> m.put(x.cip(), x));
        }
        return m;
    }

    /** Parametres d'ecriture : 10 colonnes fixes puis champs_libres (JSON, null si aucun). */
    private Object[] colonnes(Map<String, String> v) {
        Map<String, String> libres = new TreeMap<>();
        v.forEach((k, x) -> {
            if (!FIXES.contains(k) && x != null && !x.isEmpty()) {
                libres.put(k, x);
            }
        });
        String per = v.get("peremption");
        String nb = v.get("nombre");
        try {
            return new Object[] { v.get("cip"), v.get("designation"),
                    v.get("prix") == null ? null : Long.valueOf(v.get("prix")), v.get("ean"), v.get("grossiste"),
                    v.get("lot"), per == null ? null : LocalDate.parse(per, Controles.JJ_MM_AAAA), v.get("code_geo"),
                    v.get("mention"), nb == null ? 1 : Integer.parseInt(nb),
                    libres.isEmpty() ? null : json.writeValueAsString(libres) };
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Object[] avec(Object[] debut, Object... fin) {
        Object[] r = new Object[debut.length + fin.length];
        System.arraycopy(debut, 0, r, 0, debut.length);
        System.arraycopy(fin, 0, r, debut.length, fin.length);
        return r;
    }

    static final String INSERER = "INSERT INTO produit (cip, designation, prix, ean, grossiste, lot, peremption,"
            + " code_geo, mention, nombre, champs_libres, cree_par, dernier_import) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)";
    static final String MODIFIER = "UPDATE produit SET cip = ?, designation = ?, prix = ?, ean = ?, grossiste = ?,"
            + " lot = ?, peremption = ?, code_geo = ?, mention = ?, nombre = ?, champs_libres = ?, modifie_le = NOW(),"
            + " modifie_par = ?, dernier_import = COALESCE(?, dernier_import) WHERE cip = ?";

    public void inserer(Map<String, String> v, String qui) {
        jdbc.update(INSERER, avec(colonnes(v), qui, null));
    }

    public void modifier(Map<String, String> v, String qui) {
        jdbc.update(MODIFIER, avec(colonnes(v), qui, null, v.get("cip")));
    }

    public void insererTous(List<Map<String, String>> l, String qui, long importId) {
        List<Object[]> p = new ArrayList<>(l.size());
        l.forEach(v -> p.add(avec(colonnes(v), qui, importId)));
        paquets(INSERER, p);
    }

    public void modifierTous(List<Map<String, String>> l, String qui, long importId) {
        List<Object[]> p = new ArrayList<>(l.size());
        l.forEach(v -> p.add(avec(colonnes(v), qui, importId, v.get("cip"))));
        paquets(MODIFIER, p);
    }

    /** Lignes inchangees d'un import : seulement marquees « dernier import ». */
    public void marquerImport(Collection<String> cips, long importId) {
        List<Object[]> p = new ArrayList<>(cips.size());
        cips.forEach(c -> p.add(new Object[] { importId, c }));
        paquets("UPDATE produit SET dernier_import = ? WHERE cip = ?", p);
    }

    private void paquets(String sql, List<Object[]> p) {
        for (int i = 0; i < p.size(); i += PAQUET) {
            jdbc.batchUpdate(sql, p.subList(i, Math.min(p.size(), i + PAQUET)));
        }
    }

    public int supprimer(String cip) {
        return jdbc.update("DELETE FROM produit WHERE cip = ?", cip);
    }
}
