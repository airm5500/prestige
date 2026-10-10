package etiquetagepro;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Etiquetage Pro : correspondance entre les colonnes du fichier et les zones de l'etiquette (assistant d'importation).
 * <p>
 * La source d'une zone est un modele : « {Titre de colonne} » prend la cellule de cette colonne, un texte sans
 * accolades est un texte fixe (le meme pour toutes les lignes, pour une zone absente du fichier), et les deux se
 * combinent (« Lot {Lot} - {Rayon} »). Des zones ajoutees (nom libre) se definissent de la meme facon ; elles sont
 * reprises dans les modeles par leur nom (« {Rayon} ») et dans le tableau des produits.
 */
public final class Correspondance {

    private static final Pattern REFERENCE = Pattern.compile("\\{([^{}]+)\\}");

    private final Map<Zone, String> sources = new EnumMap<>(Zone.class);
    private final Set<Zone> obligatoires = EnumSet.noneOf(Zone.class);
    private final Map<String, String> ajoutees = new LinkedHashMap<>();

    public Correspondance() {
        for (Zone z : Zone.values()) {
            if (z.isObligatoireParDefaut()) {
                obligatoires.add(z);
            }
        }
    }

    /** Minuscules, sans accent, ponctuation remplacee par des espaces simples. */
    public static String normaliser(String s) {
        if (s == null) {
            return "";
        }
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ").trim();
    }

    public Correspondance source(Zone zone, String modele) {
        if (modele == null || modele.trim().isEmpty()) {
            sources.remove(zone);
        } else {
            sources.put(zone, modele);
        }
        return this;
    }

    public String getSource(Zone zone) {
        return sources.get(zone);
    }

    public Correspondance obligatoire(Zone zone, boolean oui) {
        if (oui || zone.isToujoursObligatoire()) {
            obligatoires.add(zone);
        } else {
            obligatoires.remove(zone);
        }
        return this;
    }

    public Set<Zone> getObligatoires() {
        return EnumSet.copyOf(obligatoires.isEmpty() ? EnumSet.of(Zone.CIP) : obligatoires);
    }

    /** Zone ajoutee (nom libre, unique sans tenir compte de la casse et des accents). */
    public Correspondance ajouter(String nom, String modele) {
        if (nom != null && !nom.trim().isEmpty()) {
            ajoutees.keySet().removeIf(k -> normaliser(k).equals(normaliser(nom)));
            ajoutees.put(nom.trim(), modele == null ? "" : modele);
        }
        return this;
    }

    public Map<String, String> getAjoutees() {
        return new LinkedHashMap<>(ajoutees);
    }

    /**
     * Proposition de depart : chaque zone prend la premiere colonne dont le titre la designe (« Libellé » pour la
     * designation, « PV » pour le prix...), une colonne ne servant qu'une fois.
     */
    public static Correspondance proposer(Tableau t) {
        Correspondance c = new Correspondance();
        Set<Integer> prises = new java.util.HashSet<>();
        for (Zone z : Zone.values()) {
            for (int i = 0; i < t.getColonnes().size(); i++) {
                if (!prises.contains(i) && z.reconnait(t.getColonnes().get(i))) {
                    c.source(z, "{" + t.getColonnes().get(i) + "}");
                    prises.add(i);
                    break;
                }
            }
        }
        return c;
    }

    /** References des modeles qui ne designent ni une colonne du fichier ni une zone ajoutee. */
    public List<String> referencesInconnues(Tableau t) {
        List<String> inconnues = new ArrayList<>();
        List<String> modeles = new ArrayList<>(sources.values());
        modeles.addAll(ajoutees.values());
        for (String m : modeles) {
            Matcher x = REFERENCE.matcher(m);
            while (x.find()) {
                String ref = x.group(1);
                if (t.indexDe(ref) < 0
                        && ajoutees.keySet().stream().noneMatch(k -> normaliser(k).equals(normaliser(ref)))
                        && !inconnues.contains(ref)) {
                    inconnues.add(ref);
                }
            }
        }
        return inconnues;
    }

    /** Lignes d'etiquettes du fichier, numerotees comme dans le fichier (titres compris), validees. */
    public List<LigneEtiquette> appliquer(Tableau t, boolean avecTitres) {
        List<LigneEtiquette> resultat = new ArrayList<>();
        int numero = avecTitres ? 2 : 1;
        for (List<String> cellules : t.getLignes()) {
            LigneEtiquette l = new LigneEtiquette(numero++);
            /* zones ajoutees d'abord : elles peuvent servir dans les modeles des zones de l'etiquette */
            Map<String, String> valeursAjoutees = new LinkedHashMap<>();
            for (Map.Entry<String, String> a : ajoutees.entrySet()) {
                valeursAjoutees.put(a.getKey(), evaluer(a.getValue(), t, cellules, valeursAjoutees));
            }
            valeursAjoutees.forEach(l::ajoutee);
            for (Map.Entry<Zone, String> s : sources.entrySet()) {
                l.valeur(s.getKey(), evaluer(s.getValue(), t, cellules, valeursAjoutees));
            }
            resultat.add(l.valider(getObligatoires()));
        }
        return resultat;
    }

    static String evaluer(String modele, Tableau t, List<String> cellules, Map<String, String> ajoutees) {
        if (modele == null) {
            return "";
        }
        Matcher x = REFERENCE.matcher(modele);
        StringBuffer b = new StringBuffer();
        boolean reference = false, renseigne = false;
        while (x.find()) {
            reference = true;
            String ref = x.group(1), valeur = null;
            for (Map.Entry<String, String> a : ajoutees.entrySet()) {
                if (normaliser(a.getKey()).equals(normaliser(ref))) {
                    valeur = a.getValue();
                }
            }
            if (valeur == null) {
                int i = t.indexDe(ref);
                valeur = i >= 0 && i < cellules.size() ? cellules.get(i) : "";
            }
            renseigne |= valeur != null && !valeur.trim().isEmpty();
            x.appendReplacement(b, Matcher.quoteReplacement(valeur == null ? "" : valeur));
        }
        x.appendTail(b);
        /* « Lot {Lot} » sans lot : zone vide plutot que « Lot » seul */
        if (reference && !renseigne) {
            return "";
        }
        return b.toString().trim().replaceAll("\\s{2,}", " ");
    }
}
