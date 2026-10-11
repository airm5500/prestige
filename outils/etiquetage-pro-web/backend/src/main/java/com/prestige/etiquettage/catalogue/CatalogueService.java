package com.prestige.etiquettage.catalogue;

import com.prestige.etiquettage.web.Refus;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Catalogue : fiche produit (controle, creation, modification, suppression, historique) et liste filtree. Le CIP est la
 * cle : il n'est jamais modifie.
 */
@Service
public class CatalogueService {

    public static final int TAILLE_MAX = 500;
    public static final int CIPS_MAX = 20000;
    /** Code GS1 lu sur une boite : (01) GTIN 14, eventuellement precede de l'identifiant de symbologie. */
    private static final Pattern GS1 = Pattern.compile("^(?:\\][a-zA-Z]\\d)?\\(?01\\)?(\\d{14})");

    private final ChampDepot champs;
    private final Produits produits;
    private final Historique historique;
    private final JdbcTemplate jdbc;

    public CatalogueService(ChampDepot champs, Produits produits, Historique historique, JdbcTemplate jdbc) {
        this.champs = champs;
        this.produits = produits;
        this.historique = historique;
        this.jdbc = jdbc;
    }

    public List<Champ> champs() {
        return champs.tous();
    }

    /** Resultat du controle d'une fiche : valeurs mises en forme et erreur par champ. */
    public record Controle(Map<String, String> valeurs, Map<String, String> erreurs) {
    }

    /**
     * Controle une fiche complete : chaque champ connu (un champ vide est efface), champ inconnu refuse. En
     * modification, le CIP ne peut pas changer.
     */
    public Controle controler(Map<String, String> saisie, String cipModifie) {
        Map<String, Champ> cs = champs.parNom();
        Map<String, String> valeurs = new LinkedHashMap<>();
        Map<String, String> erreurs = new LinkedHashMap<>();
        Map<String, String> s = saisie == null ? Map.of() : saisie;
        for (String k : s.keySet()) {
            if (!cs.containsKey(k)) {
                erreurs.put(k, "Champ inconnu.");
            }
        }
        for (Champ c : cs.values()) {
            String brute = s.get(c.nom());
            if (cipModifie != null && "cip".equals(c.nom())) {
                brute = brute == null || brute.isBlank() ? cipModifie : brute;
            }
            Controles.Resultat r = Controles.controler(c, brute);
            if (r.ok()) {
                if (r.valeur() != null) {
                    valeurs.put(c.nom(), r.valeur());
                }
            } else {
                erreurs.put(c.nom(), r.erreur());
            }
        }
        if (!erreurs.containsKey("nombre")) {
            /* nombre d'etiquettes : 1 par defaut (colonne NOT NULL DEFAULT 1) */
            valeurs.putIfAbsent("nombre", "1");
        }
        if (cipModifie != null && valeurs.containsKey("cip") && !cipModifie.equals(valeurs.get("cip"))) {
            erreurs.put("cip", "Le CIP n'est pas modifiable.");
        }
        return new Controle(valeurs, erreurs);
    }

    private Controle controlerOuRefuser(Map<String, String> saisie, String cipModifie) {
        Controle c = controler(saisie, cipModifie);
        if (!c.erreurs().isEmpty()) {
            throw new Refus(HttpStatus.BAD_REQUEST, "Fiche incomplète : corrigez les champs signalés.", c.erreurs());
        }
        return c;
    }

    public Produit lire(String cip) {
        Produit p = produits.lire(cip);
        if (p == null) {
            throw Refus.introuvable("Produit " + cip + " introuvable.");
        }
        return p;
    }

    @Transactional
    public Produit creer(Map<String, String> saisie, String qui) {
        Controle c = controlerOuRefuser(saisie, null);
        String cip = c.valeurs().get("cip");
        if (produits.lire(cip) != null) {
            throw new Refus(HttpStatus.CONFLICT, "Le CIP " + cip + " existe déjà dans le catalogue.",
                    Map.of("cip", "Ce CIP existe déjà."));
        }
        try {
            produits.inserer(c.valeurs(), qui);
        } catch (DuplicateKeyException deja) {
            /* meme CIP cree au meme moment (deux onglets, double clic) */
            throw new Refus(HttpStatus.CONFLICT, "Le CIP " + cip + " existe déjà dans le catalogue.",
                    Map.of("cip", "Ce CIP existe déjà."));
        }
        historique.ajouter(cip, qui, "Création (fiche)", null);
        return produits.lire(cip);
    }

    @Transactional
    public Produit modifier(String cip, Map<String, String> saisie, String qui) {
        Produit avant = lire(cip);
        Controle c = controlerOuRefuser(saisie, cip);
        List<Historique.Ecart> ecarts = Historique.ecarts(avant.valeurs(), c.valeurs(), champs.parNom());
        if (!ecarts.isEmpty()) {
            produits.modifier(c.valeurs(), qui);
            historique.ajouter(cip, qui, "Fiche", ecarts);
        }
        return produits.lire(cip);
    }

    @Transactional
    public int supprimer(List<String> cips, String qui) {
        int n = 0;
        for (String cip : cips) {
            if (cip != null && produits.supprimer(cip) > 0) {
                historique.ajouter(cip, qui, "Suppression", null);
                n++;
            }
        }
        return n;
    }

    public List<Produit> lot(List<String> cips) {
        Map<String, Produit> m = produits.lire(new java.util.LinkedHashSet<>(cips));
        List<Produit> r = new ArrayList<>();
        for (String c : new java.util.LinkedHashSet<>(cips)) {
            if (m.containsKey(c)) {
                r.add(m.get(c));
            }
        }
        return r;
    }

    public List<Map<String, Object>> historique(String cip) {
        lire(cip);
        return historique.de(cip);
    }

    /* ------------------------------------------------------------ liste */

    /**
     * Filtres de la liste. {@code q} : recherche « contient » (designation, CIP, EAN, lot, code geo), un mot apres
     * l'autre, ou code scanne (CIP, EAN, code GS1 d'une boite). {@code peremption} : depassee, 3 ou 6 (mois a venir).
     */
    public record Filtre(String q, String peremption, boolean dernierImport, String tri, String sens) {
    }

    public record Page(long total, int page, int taille, List<Produit> produits) {
    }

    private record Requete(String where, List<Object> parametres) {
    }

    static String commeContient(String s) {
        return "%" + s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }

    private Requete where(Filtre f) {
        StringBuilder w = new StringBuilder(" WHERE 1 = 1");
        List<Object> p = new ArrayList<>();
        String q = f.q() == null ? "" : f.q().replace("\u001d", "").strip();
        if (q.length() > 200) {
            q = q.substring(0, 200);
        }
        Matcher gs1 = GS1.matcher(q);
        if (gs1.find()) {
            String gtin = gs1.group(1);
            w.append(" AND (cip = ? OR ean = ? OR ean = ?)");
            p.add(gtin.substring(1));
            p.add(gtin);
            p.add(gtin.substring(1));
        } else if (!q.isEmpty()) {
            String[] mots = q.split("\\s+");
            for (int i = 0; i < Math.min(mots.length, 8); i++) {
                w.append(" AND (designation LIKE ? OR cip LIKE ? OR ean LIKE ? OR lot LIKE ? OR code_geo LIKE ?)");
                String m = commeContient(mots[i]);
                for (int k = 0; k < 5; k++) {
                    p.add(m);
                }
            }
        }
        if ("depassee".equals(f.peremption())) {
            w.append(" AND peremption < CURDATE()");
        } else if ("3".equals(f.peremption()) || "6".equals(f.peremption())) {
            w.append(" AND peremption >= CURDATE() AND peremption <= DATE_ADD(CURDATE(), INTERVAL ? MONTH)");
            p.add(Integer.parseInt(f.peremption()));
        } else if (f.peremption() != null && !f.peremption().isBlank()) {
            throw Refus.requete("Filtre de péremption inconnu.");
        }
        if (f.dernierImport()) {
            w.append(" AND dernier_import = (SELECT MAX(id) FROM journal_import)");
        }
        return new Requete(w.toString(), p);
    }

    /** ORDER BY sur un champ connu seulement (champ ajoute : valeur JSON, chemin passe en parametre). */
    private String ordre(Filtre f, List<Object> p) {
        String sens = "desc".equalsIgnoreCase(f.sens()) ? " DESC" : " ASC";
        String tri = f.tri() == null || f.tri().isBlank() ? "designation" : f.tri();
        if ("modifie".equals(tri)) {
            return " ORDER BY COALESCE(modifie_le, cree_le)" + sens + ", cip";
        }
        if (Produits.FIXES.contains(tri)) {
            /* colonne fixe : nom pris dans la liste connue, jamais dans la requete */
            return " ORDER BY " + tri + sens + ", cip";
        }
        Champ c = champs.parNom().get(tri);
        if (c == null) {
            throw Refus.requete("Tri inconnu : " + tri + ".");
        }
        p.add("$.\"" + c.nom() + "\"");
        String expr = c.type() == Champ.Type.ENTIER || c.type() == Champ.Type.PRIX
                ? "CAST(JSON_VALUE(champs_libres, ?) AS SIGNED)"
                : c.type() == Champ.Type.DATE ? "STR_TO_DATE(JSON_VALUE(champs_libres, ?), '%d/%m/%Y')"
                        : "JSON_VALUE(champs_libres, ?)";
        return " ORDER BY " + expr + sens + ", cip";
    }

    public Page lister(Filtre f, int page, int taille) {
        int t = Math.max(1, Math.min(taille, TAILLE_MAX));
        int pg = Math.max(0, page);
        Requete r = where(f);
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM produit" + r.where(), Long.class,
                r.parametres().toArray());
        List<Object> p = new ArrayList<>(r.parametres());
        String sql = Produits.SELECT + r.where() + ordre(f, p) + " LIMIT ? OFFSET ?";
        p.add(t);
        p.add((long) pg * t);
        return new Page(total == null ? 0 : total, pg, t, jdbc.query(sql, produits.lecteur(), p.toArray()));
    }

    /** CIP de tous les produits du filtre (« tout cocher »), 20 000 au plus. */
    public List<String> cips(Filtre f) {
        Requete r = where(f);
        List<Object> p = new ArrayList<>(r.parametres());
        String sql = "SELECT cip FROM produit" + r.where() + ordre(f, p) + " LIMIT " + CIPS_MAX;
        return jdbc.queryForList(sql, String.class, p.toArray());
    }
}
