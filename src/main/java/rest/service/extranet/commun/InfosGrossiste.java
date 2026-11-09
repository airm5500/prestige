package rest.service.extranet.commun;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.persistence.EntityManager;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Donnees de l'extranet du grossiste pour le traitement des suggestions (demande du 09/11) : unites gratuites (paliers
 * « 10 commandes, 1 offert »), stock du grossiste (affiche seulement si le parametre KEY_AFFICHER_STOCK_GROSSISTE vaut
 * 1) et commandes en cours chez le grossiste. Lu dans les listes gardees en base (derniere lecture complete) : aucun
 * appel a l'extranet pendant la suggestion. Un produit de Prestige correspond a une ligne d'extranet par ses codes
 * (CIP, CIP2 a CIP4, EAN13), son PSCODE Ubipharm ou son code article chez le grossiste.
 */
public final class InfosGrossiste {

    public static final String PARAMETRE_STOCK = "KEY_AFFICHER_STOCK_GROSSISTE";

    private static final Pattern TITRE_UG = Pattern.compile("Unités gratuites|Paliers");
    private static final Pattern TITRE_DISPO = Pattern.compile("^Dispo");
    private static final Pattern TITRE_DESIGNATION = Pattern.compile("^(Désignation|Produit|Libellé)");
    private static final Pattern TITRE_QTE = Pattern.compile("^(Qté|Quantité)");
    private static final Pattern CIP_DANS_TEXTE = Pattern.compile("CIP\\s*:\\s*(\\d{5,14})");

    /** Listes lues pour chaque extranet, et a quoi elles servent. */
    enum Usage {
        UG, STOCK, COMMANDE
    }

    static final Map<SourceExtranet, Map<String, Usage>> LISTES = new LinkedHashMap<>();
    static {
        Map<String, Usage> u = new LinkedHashMap<>();
        u.put("PRODUITS_UG", Usage.UG);
        LISTES.put(SourceExtranet.UBIPHARM, u);
        Map<String, Usage> t = new LinkedHashMap<>();
        t.put("TEDIS_CATALOGUE", Usage.STOCK);
        t.put("TEDIS_COMMANDES_ATTENTE", Usage.COMMANDE);
        LISTES.put(SourceExtranet.TEDIS, t);
        Map<String, Usage> c = new LinkedHashMap<>();
        c.put("COPHARMED_PROMOTIONS", Usage.UG);
        c.put("COPHARMED_CATALOGUE", Usage.STOCK);
        LISTES.put(SourceExtranet.COPHARMED, c);
        Map<String, Usage> d = new LinkedHashMap<>();
        d.put("DPCI_OFFRES", Usage.UG);
        LISTES.put(SourceExtranet.DPCI, d);
    }

    private InfosGrossiste() {
    }

    /** Produit d'une ligne de suggestion. */
    public static final class Produit {
        public final String cle;
        public final String nom;
        final Set<String> codes = new LinkedHashSet<>();
        final Set<String> references = new LinkedHashSet<>();

        /**
         * @param codes
         *            CIP, CIP2 a CIP4, EAN13 (null et vides ignores)
         * @param references
         *            PSCODE Ubipharm, code article chez le grossiste (null et vides ignores)
         */
        public Produit(String cle, String nom, Collection<String> codes, Collection<String> references) {
            this.cle = cle;
            this.nom = nom;
            for (String c : codes) {
                String n = code(c);
                if (n != null) {
                    this.codes.add(n);
                }
            }
            for (String r : references) {
                String n = code(r);
                if (n != null) {
                    this.references.add(n.toUpperCase(Locale.ROOT));
                }
            }
        }
    }

    /** Ligne de liste gardee. */
    public static final class Ligne {
        final String liste;
        final String agence;
        final String pscode;
        final String cip;
        final JSONArray cellules;

        public Ligne(String liste, String agence, String pscode, String cip, JSONArray cellules) {
            this.liste = liste;
            this.agence = agence;
            this.pscode = pscode;
            this.cip = cip;
            this.cellules = cellules;
        }
    }

    static String code(String s) {
        if (s == null) {
            return null;
        }
        String t = s.replace(" ", "").trim();
        return t.isEmpty() ? null : t;
    }

    /** Paliers d'une cellule : « 20 U → 02 UG ; 50 U → 10 UG » donne deux offres. */
    public static List<String> paliers(String texte) {
        List<String> l = new ArrayList<>();
        if (texte == null) {
            return l;
        }
        for (String p : texte.split(";")) {
            String t = p.trim().replaceAll("\\s+", " ");
            if (!t.isEmpty() && !l.contains(t)) {
                l.add(t);
            }
        }
        return l;
    }

    /** Index de la premiere colonne dont le titre correspond, -1 sinon. */
    static int colonne(JSONArray titres, Pattern p) {
        for (int i = 0; titres != null && i < titres.length(); i++) {
            if (p.matcher(titres.optString(i, "")).find()) {
                return i;
            }
        }
        return -1;
    }

    private static String cellule(Ligne l, int i) {
        return i < 0 || l.cellules == null ? null : l.cellules.optString(i, null);
    }

    private static String sansFin(String designation) {
        return designation == null ? "" : designation.replaceAll("\\.\\.\\.\\s*$", "").toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", " ").trim();
    }

    /** Vrai si la ligne de liste designe le produit. */
    static boolean correspond(Produit p, Ligne l, JSONArray titres) {
        String cip = code(l.cip);
        if (cip != null && p.codes.contains(cip)) {
            return true;
        }
        String ps = code(l.pscode);
        if (ps != null && (p.references.contains(ps.toUpperCase(Locale.ROOT)) || p.codes.contains(ps))) {
            return true;
        }
        if (cip == null && ps == null) {
            /* commandes en attente TEDIS : le CIP est parfois dans la designation, sinon la designation tronquee */
            String d = cellule(l, colonne(titres, TITRE_DESIGNATION));
            if (d == null) {
                return false;
            }
            Matcher m = CIP_DANS_TEXTE.matcher(d);
            if (m.find()) {
                return p.codes.contains(m.group(1));
            }
            String debut = sansFin(d), nom = sansFin(p.nom);
            return debut.length() >= 12 && !nom.isEmpty() && nom.startsWith(debut);
        }
        return false;
    }

    /**
     * Informations d'un produit tirees des lignes de son extranet.
     *
     * @param titres
     *            colonnes de chaque liste (description)
     */
    public static JSONObject infos(SourceExtranet s, Produit p, List<Ligne> lignes, Map<String, JSONArray> titres,
            boolean avecStock) {
        Map<String, Usage> usages = LISTES.getOrDefault(s, Collections.emptyMap());
        List<String> ug = new ArrayList<>(), stock = new ArrayList<>();
        JSONArray commandes = new JSONArray();
        for (Ligne l : lignes) {
            Usage u = usages.get(l.liste);
            JSONArray t = titres.get(l.liste);
            if (u == null || !correspond(p, l, t)) {
                continue;
            }
            if (u == Usage.UG) {
                for (String o : paliers(cellule(l, colonne(t, TITRE_UG)))) {
                    if (!ug.contains(o)) {
                        ug.add(o);
                    }
                }
                String dispo = cellule(l, colonne(t, TITRE_DISPO));
                if (avecStock && dispo != null && !dispo.isEmpty() && stock.isEmpty()) {
                    stock.add(dispo);
                }
            } else if (u == Usage.STOCK && avecStock) {
                String dispo = cellule(l, colonne(t, TITRE_DISPO));
                if (dispo != null && !dispo.isEmpty()) {
                    String v = (l.agence == null || l.agence.isEmpty() ? "" : l.agence + " : ") + dispo;
                    if (!stock.contains(v)) {
                        stock.add(v);
                    }
                }
            } else if (u == Usage.COMMANDE) {
                commandes.put(new JSONObject().put("date", l.agence == null ? "" : l.agence)
                        .put("quantite",
                                cellule(l, colonne(t, TITRE_QTE)) == null ? "" : cellule(l, colonne(t, TITRE_QTE)))
                        .put("designation", cellule(l, colonne(t, TITRE_DESIGNATION)) == null ? ""
                                : cellule(l, colonne(t, TITRE_DESIGNATION))));
            }
        }
        JSONObject o = new JSONObject().put("ug", new JSONArray(ug)).put("enCommande", commandes);
        if (avecStock) {
            o.put("stock", new JSONArray(stock));
        }
        return o;
    }

    /** Colonnes de chaque liste lue pour l'extranet. */
    static Map<String, JSONArray> titres(SourceExtranet s) {
        Map<String, JSONArray> m = new HashMap<>();
        for (String liste : LISTES.getOrDefault(s, Collections.emptyMap()).keySet()) {
            JSONObject d = null;
            if (s == SourceExtranet.UBIPHARM) {
                rest.service.extranet.ubipharm.ListeUbipharm l = rest.service.extranet.ubipharm.ListeUbipharm
                        .parCode(liste);
                d = l == null ? null : l.description();
            } else if (s == SourceExtranet.TEDIS) {
                rest.service.extranet.tedis.ListeTedis l = rest.service.extranet.tedis.ListeTedis.parCode(liste);
                d = l == null ? null : l.description();
            } else if (s == SourceExtranet.COPHARMED) {
                rest.service.extranet.copharmed.ListeCopharmed l = rest.service.extranet.copharmed.ListeCopharmed
                        .parCode(liste);
                d = l == null ? null : l.description();
            } else if (s == SourceExtranet.DPCI) {
                rest.service.extranet.dpci.ListeDpci l = rest.service.extranet.dpci.ListeDpci.parCode(liste);
                d = l == null ? null : l.description();
            }
            if (d != null) {
                m.put(liste, d.getJSONArray("colonnes"));
            }
        }
        return m;
    }

    /** Lignes gardees (derniere lecture complete) qui peuvent concerner les produits. */
    @SuppressWarnings("unchecked")
    static List<Ligne> charger(EntityManager em, SourceExtranet s, Collection<Produit> produits) {
        Map<String, Usage> usages = LISTES.getOrDefault(s, Collections.emptyMap());
        if (usages.isEmpty() || produits.isEmpty()) {
            return Collections.emptyList();
        }
        Set<String> codes = new LinkedHashSet<>(), refs = new LinkedHashSet<>(), toutes = new LinkedHashSet<>();
        for (Produit p : produits) {
            codes.addAll(p.codes);
            refs.addAll(p.references);
            refs.addAll(p.codes);
        }
        for (Map.Entry<String, Usage> e : usages.entrySet()) {
            if (e.getValue() == Usage.COMMANDE) {
                toutes.add(e.getKey()); /* peu de lignes, sans code : toutes lues */
            }
        }
        codes.add("-");
        refs.add("-");
        toutes.add("-");
        List<Object[]> rows = em
                .createNativeQuery("SELECT l.liste, l.agence, l.pscode, l.cip, l.cellules"
                        + " FROM extranet_liste_ligne l JOIN extranet_collecte c ON c.id = l.collecte_id"
                        + " AND c.statut = '" + JournalCollecte.COMPLETE + "' WHERE l.liste IN (:l)"
                        + " AND (l.cip IN (:c) OR l.pscode IN (:p) OR l.liste IN (:t)) ORDER BY l.liste, l.position")
                .setParameter("l", new ArrayList<>(usages.keySet())).setParameter("c", new ArrayList<>(codes))
                .setParameter("p", new ArrayList<>(refs)).setParameter("t", new ArrayList<>(toutes)).getResultList();
        List<Ligne> l = new ArrayList<>();
        for (Object[] o : rows) {
            l.add(new Ligne((String) o[0], (String) o[1], (String) o[2], (String) o[3],
                    new JSONArray(o[4] == null ? "[]" : (String) o[4])));
        }
        return l;
    }

    /** Parametre « afficher stock grossiste » : 1 = oui ; absent, illisible ou autre valeur = non. */
    public static boolean stockAffiche(EntityManager em) {
        try {
            dal.TParameters p = em.find(dal.TParameters.class, PARAMETRE_STOCK);
            return p != null && p.getStrVALUE() != null && "1".equals(p.getStrVALUE().trim());
        } catch (RuntimeException e) {
            return false;
        }
    }

    /**
     * Infos de l'extranet pour chaque produit, par cle ; {@code null} si le grossiste n'est lie a aucun extranet.
     */
    public static Map<String, JSONObject> pourProduits(EntityManager em, SourceExtranet s, List<Produit> produits,
            boolean avecStock) {
        Map<String, JSONObject> m = new LinkedHashMap<>();
        List<Ligne> lignes = charger(em, s, produits);
        Map<String, JSONArray> titres = titres(s);
        for (Produit p : produits) {
            m.put(p.cle, infos(s, p, lignes, titres, avecStock));
        }
        return m;
    }

    /** Sources dont des listes servent aux suggestions. */
    public static List<SourceExtranet> sources() {
        return new ArrayList<>(Arrays.asList(SourceExtranet.UBIPHARM, SourceExtranet.TEDIS, SourceExtranet.COPHARMED,
                SourceExtranet.DPCI));
    }
}
