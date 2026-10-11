package com.prestige.etiquettage.catalogue;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Historique d'un produit : qui, quand, d'ou (fiche, import...), et le detail ancien -> nouveau de chaque champ. */
@Repository
public class Historique {

    private static final DateTimeFormatter HORODATE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public Historique(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /** Un changement : champ, libelle, avant, apres (null = vide). */
    public record Ecart(String champ, String libelle, String avant, String apres) {
    }

    /** Ecarts entre deux jeux de valeurs, dans l'ordre des champs. */
    public static List<Ecart> ecarts(Map<String, String> avant, Map<String, String> apres, Map<String, Champ> champs) {
        List<Ecart> l = new ArrayList<>();
        for (Champ c : champs.values()) {
            String a = avant.get(c.nom());
            String b = apres.get(c.nom());
            if (!Objects.equals(vide(a), vide(b))) {
                l.add(new Ecart(c.nom(), c.libelle(), vide(a), vide(b)));
            }
        }
        return l;
    }

    private static String vide(String s) {
        return s == null || s.isEmpty() ? null : s;
    }

    public Object[] ligne(String cip, String qui, String source, List<Ecart> ecarts) {
        try {
            return new Object[] { cip, qui, source, ecarts == null ? null : json.writeValueAsString(ecarts) };
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    static final String INSERER = "INSERT INTO historique (cip, qui, source, detail) VALUES (?, ?, ?, ?)";

    public void ajouter(String cip, String qui, String source, List<Ecart> ecarts) {
        jdbc.update(INSERER, ligne(cip, qui, source, ecarts));
    }

    public void ajouterTous(List<Object[]> lignes) {
        for (int i = 0; i < lignes.size(); i += 1000) {
            jdbc.batchUpdate(INSERER, lignes.subList(i, Math.min(lignes.size(), i + 1000)));
        }
    }

    /** Les 200 derniers evenements du produit, du plus recent au plus ancien. */
    public List<Map<String, Object>> de(String cip) {
        return jdbc.query("SELECT quand, qui, source, detail FROM historique WHERE cip = ? ORDER BY quand DESC, id DESC"
                + " LIMIT 200", (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("quand", rs.getTimestamp("quand").toLocalDateTime().format(HORODATE));
                    m.put("qui", rs.getString("qui"));
                    m.put("source", rs.getString("source"));
                    List<Ecart> d = List.of();
                    String t = rs.getString("detail");
                    if (t != null) {
                        try {
                            d = json.readValue(t, new TypeReference<List<Ecart>>() {
                            });
                        } catch (JsonProcessingException e) {
                            // detail illisible : non affiche
                        }
                    }
                    m.put("ecarts", d);
                    return m;
                }, cip);
    }
}
