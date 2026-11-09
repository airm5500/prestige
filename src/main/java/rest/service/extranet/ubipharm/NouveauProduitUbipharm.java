package rest.service.extranet.ubipharm;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.extranet.commun.Normalisation;

/**
 * Une ligne de la page Ubipharm « Nouveaux produits » (GET /NouveauxProduits, plan du 07/11, §3).
 * <p>
 * Regles (§17) : references et CIP en chaines, sans longueur supposee ; « En stock » et « Oui » sont des
 * disponibilites, pas des quantites (texte garde, jamais converti) ; un colisage n'est pas un stock ; « N/A » donne une
 * valeur inconnue (null), jamais 0 ; date sans heure inventee. null = absent de la page, "" = present mais vide. Aucun
 * champ ne porte de HTML : tout est du texte decode.
 */
public final class NouveauProduitUbipharm {

    /** Origine du CIP lu. */
    public static final String CIP_DETAIL = "td-detail";
    public static final String CIP_CHAMP_CACHE = "champ-cache";

    /** Disponibilite et colisages d'une agence (bulle « viewStock »). */
    public static final class DisponibiliteAgence {
        String etcoda;
        String etlib;
        String lgetlib;
        String disponibiliteBrute;
        String colisagesBrut;

        public DisponibiliteAgence() {
        }

        public DisponibiliteAgence(String etcoda, String etlib, String lgetlib, String disponibiliteBrute,
                String colisagesBrut) {
            this.etcoda = etcoda;
            this.etlib = etlib;
            this.lgetlib = lgetlib;
            this.disponibiliteBrute = disponibiliteBrute;
            this.colisagesBrut = colisagesBrut;
        }

        /** Code agence (attribut data-etcoda), ex. BKE. */
        public String etcoda() {
            return etcoda;
        }

        /** Libelle agence (.tip-viewStock-etlib). */
        public String etlib() {
            return etlib;
        }

        /** Texte de .tip-viewStock-lgetlib, garde brut : sa signification exacte n'est pas documentee. */
        public String lgetlib() {
            return lgetlib;
        }

        /** Texte affiche (.tip-viewStock-dispo), tel quel : « Oui », « En stock », « N/A »... */
        public String disponibiliteBrute() {
            return disponibiliteBrute;
        }

        /** Disponibilite connue : le texte, ou null si absent ou « N/A ». Jamais un nombre. */
        public String disponibilite() {
            return connue(disponibiliteBrute);
        }

        /** Colisages tels qu'affiches (attribut data-colisage, sinon .tip-viewStock-colisage). */
        public String colisagesBrut() {
            return colisagesBrut;
        }

        /** Colisages lus : null si inconnus (N/A, illisibles, absents), liste vide si texte vide. */
        public List<Integer> colisages() {
            return Normalisation.colisages(colisagesBrut);
        }

        public JSONObject toJson() {
            return new JSONObject().put("etcoda", nul(etcoda)).put("etlib", nul(etlib)).put("lgetlib", nul(lgetlib))
                    .put("disponibilite", nul(disponibilite())).put("disponibiliteBrute", nul(disponibiliteBrute))
                    .put("colisages", liste(colisages())).put("colisagesBrut", nul(colisagesBrut));
        }
    }

    int position;
    String pscode;
    String sheettype;
    String designation;
    String cip;
    String cipSource;
    String categorie;
    String dateAffichee;
    String mouvement;
    String disponibiliteBrute;
    final List<DisponibiliteAgence> agences = new ArrayList<>();

    public NouveauProduitUbipharm() {
    }

    /** Rang dans la page, a partir de 1. */
    public int position() {
        return position;
    }

    /** Reference Ubipharm (attribut data-pscode) ; "" si l'attribut est vide, null s'il manque. */
    public String pscode() {
        return pscode;
    }

    /** Attribut data-sheettype, brut (signification non documentee). */
    public String sheettype() {
        return sheettype;
    }

    /** Texte du lien a.popup-produit. */
    public String designation() {
        return designation;
    }

    /** CIP en chaine, sans longueur supposee ; null si introuvable. */
    public String cip() {
        return cip;
    }

    /** {@link #CIP_DETAIL}, {@link #CIP_CHAMP_CACHE} ou null. */
    public String cipSource() {
        return cipSource;
    }

    public String categorie() {
        return categorie;
    }

    /** Date telle qu'affichee. */
    public String dateAffichee() {
        return dateAffichee;
    }

    /** Jour de la date affichee (jj/mm/aaaa) ; l'heure eventuelle n'est pas gardee, jamais inventee. */
    public LocalDate date() {
        LocalDate d = Normalisation.date(dateAffichee);
        if (d == null && dateAffichee != null) {
            String t = Normalisation.texte(dateAffichee);
            int i = t.indexOf(' ');
            if (i > 0) {
                d = Normalisation.date(t.substring(0, i));
            }
        }
        return d;
    }

    /** Libelle de mouvement, ex. « Mise en place ». */
    public String mouvement() {
        return mouvement;
    }

    /** Disponibilite globale telle qu'affichee. */
    public String disponibiliteBrute() {
        return disponibiliteBrute;
    }

    /** Disponibilite globale connue : le texte, ou null si absente ou « N/A ». Jamais un nombre. */
    public String disponibilite() {
        return connue(disponibiliteBrute);
    }

    public List<DisponibiliteAgence> agences() {
        return Collections.unmodifiableList(agences);
    }

    public JSONObject toJson() {
        JSONArray a = new JSONArray();
        agences.forEach(x -> a.put(x.toJson()));
        LocalDate d = date();
        return new JSONObject().put("position", position).put("pscode", nul(pscode)).put("sheettype", nul(sheettype))
                .put("designation", nul(designation)).put("cip", nul(cip)).put("cipSource", nul(cipSource))
                .put("categorie", nul(categorie)).put("dateAffichee", nul(dateAffichee))
                .put("date", d == null ? JSONObject.NULL : d.toString()).put("mouvement", nul(mouvement))
                .put("disponibilite", nul(disponibilite())).put("disponibiliteBrute", nul(disponibiliteBrute))
                .put("agences", a);
    }

    static String connue(String brut) {
        if (brut == null || Normalisation.inconnu(brut)) {
            return null;
        }
        return brut;
    }

    static Object nul(Object o) {
        return o == null ? JSONObject.NULL : o;
    }

    static Object liste(List<Integer> l) {
        return l == null ? JSONObject.NULL : new JSONArray(l);
    }
}
