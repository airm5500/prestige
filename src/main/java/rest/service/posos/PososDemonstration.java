package rest.service.posos;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * MODE DEMONSTRATION de l'analyse Posos (provisoire, le temps d'obtenir les acces Posos).
 *
 * <p>
 * Aucune IA, aucun appel reseau, rien d'invente : les alertes viennent d'un fichier de regles redigees a partir du
 * Thesaurus ANSM et des RCP ({@code posos/demonstration.json}), a faire valider par un pharmacien. Un produit que les
 * regles ne connaissent pas est rendu « non reconnu » - l'ecran dit alors de ne pas conclure a l'absence d'interaction.
 *
 * <p>
 * Le mode ne s'active que cote serveur ({@code POSOS_MODE=demonstration}) et chaque resultat porte l'avertissement :
 * une demonstration ne doit jamais pouvoir passer pour une vraie analyse.
 */
public final class PososDemonstration {

    private static final Logger LOG = Logger.getLogger(PososDemonstration.class.getName());

    static final String RESSOURCE = "/posos/demonstration.json";
    /** Copie corrigee par l'officine, prioritaire : dans le dossier de posos.properties. */
    static final String NOM_SURCHARGE = "posos-demonstration.json";

    private final JSONObject regles;

    PososDemonstration(JSONObject regles) {
        this.regles = regles;
    }

    /** Les regles de l'officine si elle en a depose, sinon celles livrees avec l'application. */
    public static PososDemonstration chargee() {
        try {
            Path surcharge = util.StockageDisque.fichierConfiguration(NOM_SURCHARGE);
            if (surcharge != null && Files.isReadable(surcharge)) {
                return new PososDemonstration(
                        new JSONObject(new String(Files.readAllBytes(surcharge), StandardCharsets.UTF_8)));
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Regles de demonstration de l'officine illisibles : celles livrees sont utilisees");
        }
        return livree();
    }

    static PososDemonstration livree() {
        try (InputStream in = PososDemonstration.class.getResourceAsStream(RESSOURCE)) {
            return new PososDemonstration(new JSONObject(new String(in.readAllBytes(), StandardCharsets.UTF_8)));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Regles de demonstration introuvables", e);
            return new PososDemonstration(new JSONObject());
        }
    }

    public String avertissement() {
        String a = regles.optString("avertissement", "DÉMONSTRATION — ce n'est pas Posos.");
        JSONObject v = regles.optJSONObject("validation");
        String par = v == null ? "" : v.optString("parPharmacien", "").trim();
        return par.isEmpty() ? a + " Contenu NON ENCORE VALIDÉ par un pharmacien." : a + " Contenu validé par " + par
                + (v.optString("le", "").isEmpty() ? "" : " le " + v.optString("le")) + ".";
    }

    /* ------------------------------------------------------------------ reconnaissance */

    /** Libelle en mots majuscules sans accents : « Doliprane 500mg cpr » -> [DOLIPRANE, 500MG, CPR]. */
    static List<String> mots(String libelle) {
        String s = Normalizer.normalize(libelle == null ? "" : libelle, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT);
        List<String> out = new ArrayList<>();
        for (String m : s.split("[^A-Z0-9]+")) {
            if (!m.isEmpty()) {
                out.add(m);
            }
        }
        return out;
    }

    /**
     * Un mot-cle est reconnu en DEBUT de mot (CIPRO reconnait CIPROFLOXACINE) ; un mot-cle de plusieurs mots doit
     * apparaitre dans l'ordre, le dernier en debut de mot.
     */
    static boolean contientPrefixe(List<String> mots, String cle) {
        List<String> c = mots(cle);
        if (c.isEmpty()) {
            return false;
        }
        for (int i = 0; i + c.size() <= mots.size(); i++) {
            boolean ok = true;
            for (int j = 0; j < c.size() && ok; j++) {
                String m = mots.get(i + j);
                ok = j == c.size() - 1 ? m.startsWith(c.get(j)) : m.equals(c.get(j));
            }
            if (ok) {
                return true;
            }
        }
        return false;
    }

    /** Un mot-cle de forme ou d'exclusion doit correspondre EXACTEMENT (CR ne doit pas reconnaitre CREAT). */
    static boolean contientExact(List<String> mots, String cle) {
        List<String> c = mots(cle);
        for (int i = 0; !c.isEmpty() && i + c.size() <= mots.size(); i++) {
            if (mots.subList(i, i + c.size()).equals(c)) {
                return true;
            }
        }
        return false;
    }

    private static boolean unDes(List<String> mots, JSONArray cles, boolean exact) {
        for (int i = 0; cles != null && i < cles.length(); i++) {
            if (exact ? contientExact(mots, cles.getString(i)) : contientPrefixe(mots, cles.getString(i))) {
                return true;
            }
        }
        return false;
    }

    /** Les substances (objets JSON) reconnues dans un libelle ; vide pour une forme locale exclue. */
    List<JSONObject> substances(String libelle) {
        List<JSONObject> out = new ArrayList<>();
        List<String> m = mots(libelle);
        if (unDes(m, regles.optJSONArray("exclure"), true)) {
            return out;
        }
        JSONArray toutes = regles.optJSONArray("substances");
        for (int i = 0; toutes != null && i < toutes.length(); i++) {
            JSONObject s = toutes.getJSONObject(i);
            if (unDes(m, s.optJSONArray("mots"), false)) {
                out.add(s);
            }
        }
        return out;
    }

    private static boolean designe(JSONObject substance, String code) {
        return code.equals(substance.optString("code")) || code.equals(substance.optString("groupe"));
    }

    /* ------------------------------------------------------------------ analyse */

    public PososResultat analyser(PososDemande demande) {
        PososResultat r = new PososResultat();
        r.setDisponible(true);
        List<PososDemande.Produit> produits = demande == null ? new ArrayList<>() : demande.getProduits();
        if (produits.isEmpty()) {
            return PososResultat.indisponible("Aucun produit à analyser.");
        }
        /* produit -> substances reconnues */
        Map<String, List<JSONObject>> reconnus = new LinkedHashMap<>();
        List<String> nonReconnus = new ArrayList<>();
        for (PososDemande.Produit p : produits) {
            List<JSONObject> s = substances(p.getNom());
            if (s.isEmpty()) {
                nonReconnus.add(p.getNom());
            } else {
                reconnus.put(p.getNom(), s);
            }
        }
        List<PososResultat.Alerte> alertes = new ArrayList<>();
        doublons(reconnus, alertes);
        interactions(reconnus, alertes);
        contextes(reconnus, demande.getContexte(), alertes);
        informations(reconnus, alertes);
        formes(reconnus.keySet(), alertes);
        /* Les plus graves en tete : c'est ce qu'on lit d'abord. */
        alertes.sort((a, b) -> Integer.compare(rang(a.getGravite()), rang(b.getGravite())));
        r.setAlertes(alertes);
        r.setProduitsNonReconnus(nonReconnus);
        r.setDemonstration(true);
        r.setMessage(alertes.isEmpty()
                ? "Aucune interaction ni alerte connue des règles de démonstration pour ces produits." : "");
        return r;
    }

    static int rang(String gravite) {
        String g = gravite == null ? "" : gravite.toLowerCase(Locale.ROOT);
        if (g.contains("contre")) {
            return 0;
        }
        if (g.contains("majeur") || g.contains("déconseill")) {
            return 1;
        }
        if (g.contains("précaution")) {
            return 2;
        }
        if (g.contains("prendre en compte")) {
            return 3;
        }
        return 4;
    }

    private static PososResultat.Alerte alerte(JSONObject regle, List<String> produits, String libelle) {
        PososResultat.Alerte a = new PososResultat.Alerte();
        a.setType(regle.optString("nature"));
        a.setGravite(regle.optString("gravite"));
        a.setLibelle(libelle != null ? libelle : regle.optString("alerte"));
        String source = regle.optString("source", "");
        a.setRecommandation(regle.optString("conduite") + (source.isEmpty() ? "" : " (Source : " + source + ")"));
        a.setProduits(produits);
        return a;
    }

    private static List<String> produitsAvec(Map<String, List<JSONObject>> reconnus, String code) {
        List<String> out = new ArrayList<>();
        for (Map.Entry<String, List<JSONObject>> e : reconnus.entrySet()) {
            for (JSONObject s : e.getValue()) {
                if (designe(s, code)) {
                    out.add(e.getKey());
                    break;
                }
            }
        }
        return out;
    }

    private void doublons(Map<String, List<JSONObject>> reconnus, List<PososResultat.Alerte> alertes) {
        JSONObject regle = regles.optJSONObject("doublon");
        if (regle == null) {
            return;
        }
        Set<String> vus = new LinkedHashSet<>();
        for (List<JSONObject> ss : reconnus.values()) {
            for (JSONObject s : ss) {
                String code = s.optString("code");
                if (!vus.add(code)) {
                    continue;
                }
                List<String> avec = produitsAvec(reconnus, code);
                if (avec.size() >= 2) {
                    alertes.add(
                            alerte(regle, avec, regle.optString("alerte").replace("{n}", String.valueOf(avec.size()))
                                    .replace("{substance}", s.optString("libelle"))));
                }
            }
        }
    }

    private void interactions(Map<String, List<JSONObject>> reconnus, List<PososResultat.Alerte> alertes) {
        JSONArray liste = regles.optJSONArray("interactions");
        for (int i = 0; liste != null && i < liste.length(); i++) {
            JSONObject regle = liste.getJSONObject(i);
            List<String> a = produitsAvec(reconnus, regle.optString("a"));
            List<String> b = produitsAvec(reconnus, regle.optString("b"));
            if (a.isEmpty() || b.isEmpty()) {
                continue;
            }
            /* Un meme produit des deux cotes (association fixe) n'est pas une interaction entre produits. */
            Set<String> concernes = new LinkedHashSet<>(a);
            concernes.addAll(b);
            if (concernes.size() < 2) {
                continue;
            }
            alertes.add(alerte(regle, new ArrayList<>(concernes), null));
        }
    }

    private void contextes(Map<String, List<JSONObject>> reconnus, PososDemande.Contexte c,
            List<PososResultat.Alerte> alertes) {
        if (c == null) {
            return;
        }
        JSONArray liste = regles.optJSONArray("contextes");
        for (int i = 0; liste != null && i < liste.length(); i++) {
            JSONObject regle = liste.getJSONObject(i);
            if (!contexteVrai(regle, c)) {
                continue;
            }
            List<String> avec = produitsAvec(reconnus, regle.optString("substance"));
            if (!avec.isEmpty()) {
                alertes.add(alerte(regle, avec, null));
            }
        }
    }

    static boolean contexteVrai(JSONObject regle, PososDemande.Contexte c) {
        if (regle.has("ageMoinsDe")) {
            return c.getAge() != null && c.getAge() < regle.getInt("ageMoinsDe");
        }
        switch (regle.optString("contexte")) {
        case "grossesse":
            return Boolean.TRUE.equals(c.getGrossesse());
        case "allaitement":
            return Boolean.TRUE.equals(c.getAllaitement());
        case "insuffisanceRenale":
            return Boolean.TRUE.equals(c.getInsuffisanceRenale());
        case "insuffisanceHepatique":
            return Boolean.TRUE.equals(c.getInsuffisanceHepatique());
        default:
            return false;
        }
    }

    private void informations(Map<String, List<JSONObject>> reconnus, List<PososResultat.Alerte> alertes) {
        JSONArray liste = regles.optJSONArray("informations");
        for (int i = 0; liste != null && i < liste.length(); i++) {
            JSONObject regle = liste.getJSONObject(i);
            List<String> avec = produitsAvec(reconnus, regle.optString("substance"));
            if (!avec.isEmpty()) {
                alertes.add(alerte(regle, avec, null));
            }
        }
    }

    private void formes(Set<String> produits, List<PososResultat.Alerte> alertes) {
        JSONArray liste = regles.optJSONArray("formes");
        for (int i = 0; liste != null && i < liste.length(); i++) {
            JSONObject regle = liste.getJSONObject(i);
            List<String> avec = new ArrayList<>();
            for (String p : produits) {
                if (unDes(mots(p), regle.optJSONArray("mots"), true)) {
                    avec.add(p);
                }
            }
            if (!avec.isEmpty()) {
                alertes.add(alerte(regle, avec, null));
            }
        }
    }
}
