package com.prestige.etiquettage.catalogue;

import com.prestige.etiquettage.catalogue.Champ.Type;
import com.prestige.etiquettage.web.Refus;
import etiquetagepro.Correspondance;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Champs du catalogue : les 10 champs fixes et ceux ajoutes par un import. */
@Repository
public class ChampDepot {

    public static final int LIBELLE_MAX = 60;
    private final JdbcTemplate jdbc;

    public ChampDepot(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Champ> tous() {
        return jdbc.query("SELECT nom, libelle, type, longueur, obligatoire, systeme, affiche, ordre FROM champ"
                + " ORDER BY ordre, libelle",
                (rs, i) -> new Champ(rs.getString("nom"), rs.getString("libelle"), Type.valueOf(rs.getString("type")),
                        (Integer) rs.getObject("longueur", Integer.class), rs.getBoolean("obligatoire"),
                        rs.getBoolean("systeme"), rs.getBoolean("affiche"), rs.getInt("ordre")));
    }

    /** Champs par nom, dans l'ordre d'affichage. */
    public Map<String, Champ> parNom() {
        Map<String, Champ> m = new LinkedHashMap<>();
        tous().forEach(c -> m.put(c.nom(), c));
        return m;
    }

    /**
     * Controle le libelle d'un nouveau champ : 1 a 60 caracteres, sans caractere de controle, distinct des champs
     * existants (casse et accents ignores). Rend le libelle reduit ou leve un refus.
     */
    public static String libelleValide(String libelle, Map<String, Champ> existants) {
        String l = libelle == null ? "" : libelle.strip().replaceAll("\\s+", " ");
        if (l.isEmpty()) {
            throw Refus.requete("Donnez un nom au nouveau champ.");
        }
        if (l.length() > LIBELLE_MAX) {
            throw Refus.requete("Nom de champ « " + l + " » : " + LIBELLE_MAX + " caractères au plus.");
        }
        if (l.codePoints().anyMatch(Character::isISOControl)) {
            throw Refus.requete("Nom de champ : caractère de contrôle non autorisé.");
        }
        String n = Correspondance.normaliser(l);
        if (n.isEmpty()) {
            throw Refus.requete("Nom de champ « " + l + " » : au moins une lettre ou un chiffre.");
        }
        for (Champ c : existants.values()) {
            if (Correspondance.normaliser(c.libelle()).equals(n) || Correspondance.normaliser(c.nom()).equals(n)) {
                throw Refus.requete("Le champ « " + c.libelle() + " » existe déjà : associez la colonne à ce champ.");
            }
        }
        return l;
    }

    /** Nom technique d'un champ ajoute : « Rayon B » -> « x_rayon_b » (prefixe : jamais un nom de colonne fixe). */
    static String nomPour(String libelle, Map<String, Champ> existants) {
        String base = "x_" + Correspondance.normaliser(libelle).replace(' ', '_');
        if (base.length() > 36) {
            base = base.substring(0, 36);
        }
        String nom = base;
        for (int i = 2; existants.containsKey(nom); i++) {
            nom = base + "_" + i;
        }
        return nom;
    }

    /** Ajoute un champ (libre, affiche, facultatif) a la fin. */
    public Champ ajouter(String libelle, Type type, Integer longueur) {
        Map<String, Champ> existants = parNom();
        String l = libelleValide(libelle, existants);
        String nom = nomPour(l, existants);
        Integer ordre = jdbc.queryForObject("SELECT GREATEST(COALESCE(MAX(ordre), 0), 99) + 1 FROM champ", Integer.class);
        Integer lg = type == Type.TEXTE || type == Type.CODE ? longueur : null;
        jdbc.update("INSERT INTO champ (nom, libelle, type, longueur, obligatoire, systeme, affiche, ordre)"
                + " VALUES (?, ?, ?, ?, 0, 0, 1, ?)", nom, l, type.name(), lg, ordre);
        return new Champ(nom, l, type, lg, false, false, true, ordre);
    }
}
