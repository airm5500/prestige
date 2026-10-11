package avisclients;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Analyse des avis d'une periode (onglet Analyse). Tout est calcule dans Prestige, sans service externe :
 * <ul>
 * <li>synthese : nombre, note moyenne, satisfaits / mecontents, comparaison avec la periode precedente de meme duree
 * ;</li>
 * <li>repartition des notes, evolution (par jour, semaine ou mois selon la duree) ;</li>
 * <li>criteres (apprecie / a ameliorer) et themes reconnus dans le texte (attente, accueil, conseil...) ;</li>
 * <li>mots cles et expressions, avec la note moyenne des avis qui les contiennent ;</li>
 * <li>employes cites : noms rapproches malgre les variantes d'ecriture, recapitulatif par employe ;</li>
 * <li>points forts / a ameliorer et alertes.</li>
 * </ul>
 */
public final class Analyse {

    public static final Map<String, String> LIBELLES_CRITERES = new LinkedHashMap<>();
    static {
        LIBELLES_CRITERES.put("ACCUEIL", "Accueil");
        LIBELLES_CRITERES.put("ATTENTE", "Temps d'attente");
        LIBELLES_CRITERES.put("CONSEIL", "Conseils");
        LIBELLES_CRITERES.put("DISPONIBILITE", "Produits disponibles");
        LIBELLES_CRITERES.put("PRIX", "Prix");
        LIBELLES_CRITERES.put("PROPRETE", "Propreté");
    }

    /** Themes reconnus dans le texte : racines (forme sans accent) qui les signalent. */
    static final Map<String, String[]> THEMES = new LinkedHashMap<>();
    static {
        THEMES.put("Attente", new String[] { "attente", "attendre", "attendu", "attend", "queue", "file", "lent",
                "lente", "lenteur", "long", "longue", "minute", "minutes", "rapide", "rapidite", "vite", "heure" });
        THEMES.put("Accueil",
                new String[] { "accueil", "accueillant", "aimable", "souriant", "sourire", "poli", "politesse",
                        "impoli", "desagreable", "gentil", "gentille", "chaleureux", "froid", "agressif", "mepris",
                        "meprisant", "irrespectueux", "respect", "courtois", "insolent", "arrogant", "crie" });
        THEMES.put("Conseil", new String[] { "conseil", "conseils", "conseille", "explication", "explique", "expliquer",
                "posologie", "competent", "competence", "incompetent", "professionnel", "ecoute" });
        THEMES.put("Disponibilité", new String[] { "rupture", "disponible", "indisponible", "manque", "manquant",
                "stock", "commande", "commander", "introuvable", "trouve" });
        THEMES.put("Prix", new String[] { "prix", "cher", "chere", "couteux", "tarif", "tarifs", "monnaie", "remise",
                "reduction", "abordable" });
        THEMES.put("Propreté", new String[] { "propre", "proprete", "sale", "salete", "odeur", "hygiene" });
        THEMES.put("Paiement / caisse", new String[] { "caisse", "caissier", "caissiere", "paiement", "payer", "wave",
                "momo", "ticket", "facture", "rendu" });
        THEMES.put("Assurance",
                new String[] { "assurance", "mutuelle", "tiers", "prise", "charge", "bon", "carnet", "assure" });
        THEMES.put("Ordonnance",
                new String[] { "ordonnance", "ordonnances", "medecin", "prescription", "substitution", "generique" });
    }

    /** Mots vides francais (forme sans accent), ignores pour les mots cles. */
    static final Set<String> VIDES = new HashSet<>(Arrays.asList(("a,au,aux,avec,ce,ces,cet,cette,dans,de,des,du,elle,"
            + "en,et,eux,il,ils,je,j,la,le,les,leur,leurs,lui,ma,mais,me,meme,mes,moi,mon,ne,nos,notre,nous,on,ou,par,"
            + "pas,pour,qu,que,qui,sa,se,ses,son,sur,ta,te,tes,toi,ton,tu,un,une,vos,votre,vous,c,d,l,m,n,s,t,y,est,"
            + "ete,etait,etre,ai,as,avons,avez,ont,avait,suis,es,sommes,etes,sont,fait,faire,tres,trop,plus,moins,"
            + "bien,ca,cela,ceci,tout,tous,toute,toutes,aussi,alors,donc,car,comme,si,quand,encore,deja,ici,la,"
            + "y,rien,peu,beaucoup,chez,sans,sous,vers,entre,apres,avant,depuis,pendant,jour,fois,oui,non,merci,"
            + "bonjour,svp,pharmacie,cette,celui,celle,ceux,dont,quoi,quel,quelle,etc,lors,puis,ni,soit,peut,"
            + "faut,avoir,mon,vraiment,toujours,jamais,autre,autres,chaque,certains,plusieurs,the,and").split(",")));

    /** Mots qui ne designent pas une personne, retires du nom d'employe cite pour le rapprochement. */
    static final Set<String> TITRES = new HashSet<>(Arrays.asList(
            "mme,madame,mr,m,monsieur,mlle,mademoiselle,mle,dr,docteur,le,la,l,un,une,mon,ma,the,sieur,dame,tantie,tonton"
                    .split(",")));

    private Analyse() {
    }

    /**
     * Analyse des avis de la periode {@code [du, au]}. {@code precedents} : avis de la periode precedente de meme duree
     * (comparaison). {@code personnel} : nom d'employe (forme {@link Texte#plat}) -> nom affiche, pour signaler a quel
     * utilisateur un nom cite correspond.
     */
    public static JSONObject analyser(List<Avis> avis, List<Avis> precedents, LocalDate du, LocalDate au,
            Map<String, String> personnel) {
        JSONObject r = new JSONObject();
        r.put("synthese", synthese(avis, precedents));
        int[] rep = new int[6];
        avis.forEach(a -> rep[a.note]++);
        JSONArray repartition = new JSONArray();
        for (int n = 5; n >= 1; n--) {
            repartition.put(new JSONObject().put("note", n).put("nombre", rep[n]).put("part",
                    avis.isEmpty() ? 0 : Math.round(rep[n] * 1000.0 / avis.size()) / 10.0));
        }
        r.put("repartition", repartition);
        r.put("evolution", evolution(avis, du, au));
        r.put("criteres", criteres(avis));
        JSONArray themes = themes(avis, precedents);
        r.put("themes", themes);
        r.put("motsCles", motsCles(avis, 40));
        JSONArray employes = employes(avis, personnel == null ? new HashMap<>() : personnel);
        r.put("employes", employes);
        r.put("bilan", bilan(r.getJSONArray("criteres"), themes));
        r.put("alertes", alertes(avis, precedents, employes, themes));
        return r;
    }

    static double moyenne(Collection<Avis> l) {
        return l.isEmpty() ? 0 : Math.round(l.stream().mapToInt(a -> a.note).average().orElse(0) * 10) / 10.0;
    }

    private static double part(long n, long total) {
        return total == 0 ? 0 : Math.round(n * 1000.0 / total) / 10.0;
    }

    static JSONObject synthese(List<Avis> avis, List<Avis> precedents) {
        long satisfaits = avis.stream().filter(Avis::positif).count();
        long mecontents = avis.stream().filter(Avis::negatif).count();
        JSONObject s = new JSONObject().put("nombre", avis.size()).put("moyenne", moyenne(avis))
                .put("satisfaits", part(satisfaits, avis.size())).put("mecontents", part(mecontents, avis.size()))
                .put("nouveaux", avis.stream().filter(a -> "NOUVEAU".equals(a.statut)).count())
                .put("negatifsNonTraites", avis.stream().filter(a -> a.negatif() && !"TRAITE".equals(a.statut)).count())
                .put("reponsesAttendues", avis.stream().filter(a -> a.reponseAttendue).count())
                .put("avecEmploye", avis.stream().filter(a -> a.employe != null).count())
                .put("avecTexte", avis.stream().filter(a -> a.texte != null).count());
        s.put("precedent", new JSONObject().put("nombre", precedents.size()).put("moyenne", moyenne(precedents))
                .put("satisfaits", part(precedents.stream().filter(Avis::positif).count(), precedents.size())));
        return s;
    }

    static JSONArray evolution(List<Avis> avis, LocalDate du, LocalDate au) {
        long jours = ChronoUnit.DAYS.between(du, au) + 1;
        String pas = jours <= 31 ? "JOUR" : jours <= 182 ? "SEMAINE" : "MOIS";
        TreeMap<LocalDate, List<Avis>> seaux = new TreeMap<>();
        for (LocalDate d = debutSeau(du, pas); !d.isAfter(au); d = suivant(d, pas)) {
            seaux.put(d, new ArrayList<>());
        }
        for (Avis a : avis) {
            seaux.computeIfAbsent(debutSeau(a.date.toLocalDate(), pas), k -> new ArrayList<>()).add(a);
        }
        DateTimeFormatter f = DateTimeFormatter.ofPattern("MOIS".equals(pas) ? "MM/yyyy" : "dd/MM", Locale.FRANCE);
        JSONArray e = new JSONArray();
        seaux.forEach((d,
                l) -> e.put(new JSONObject().put("periode", ("SEMAINE".equals(pas) ? "sem. " : "") + d.format(f))
                        .put("date", d.toString()).put("pas", pas).put("nombre", l.size()).put("moyenne", moyenne(l))
                        .put("negatifs", l.stream().filter(Avis::negatif).count())));
        return e;
    }

    private static LocalDate debutSeau(LocalDate d, String pas) {
        return "JOUR".equals(pas) ? d : "SEMAINE".equals(pas)
                ? d.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)) : d.withDayOfMonth(1);
    }

    private static LocalDate suivant(LocalDate d, String pas) {
        return "JOUR".equals(pas) ? d.plusDays(1) : "SEMAINE".equals(pas) ? d.plusWeeks(1) : d.plusMonths(1);
    }

    static JSONArray criteres(List<Avis> avis) {
        JSONArray a = new JSONArray();
        LIBELLES_CRITERES.forEach((cle, libelle) -> {
            long plus = avis.stream().filter(x -> "PLUS".equals(x.criteres.get(cle))).count();
            long moins = avis.stream().filter(x -> "MOINS".equals(x.criteres.get(cle))).count();
            a.put(new JSONObject().put("cle", cle).put("libelle", libelle).put("plus", plus).put("moins", moins)
                    .put("solde", plus - moins).put("satisfaction",
                            plus + moins == 0 ? JSONObject.NULL : Math.round(plus * 100.0 / (plus + moins))));
        });
        return a;
    }

    /** Mots du texte, forme sans accent. */
    static List<String> mots(String texte) {
        List<String> l = new ArrayList<>();
        for (String m : Texte.plat(texte).split(" ")) {
            if (!m.isEmpty()) {
                l.add(m);
            }
        }
        return l;
    }

    static JSONArray themes(List<Avis> avis, List<Avis> precedents) {
        JSONArray a = new JSONArray();
        THEMES.forEach((theme, racines) -> {
            List<Avis> l = avis.stream().filter(x -> evoque(x, racines)).collect(Collectors.toList());
            long avant = precedents.stream().filter(x -> evoque(x, racines)).count();
            if (!l.isEmpty() || avant > 0) {
                a.put(new JSONObject().put("theme", theme).put("nombre", l.size()).put("moyenne", moyenne(l))
                        .put("negatifs", l.stream().filter(Avis::negatif).count())
                        .put("positifs", l.stream().filter(Avis::positif).count()).put("precedent", avant)
                        .put("motsCles", String.join(" ", racines)));
            }
        });
        List<JSONObject> tri = new ArrayList<>();
        a.forEach(o -> tri.add((JSONObject) o));
        tri.sort(Comparator.comparingInt((JSONObject o) -> -o.getInt("nombre")));
        return new JSONArray(tri);
    }

    static boolean evoque(Avis a, String[] racines) {
        if (a.texte == null) {
            return false;
        }
        Set<String> m = new HashSet<>(mots(a.texte));
        for (String r : racines) {
            if (m.contains(r)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Mots cles (mots et expressions de deux mots) les plus frequents, comptes une fois par avis, avec la note moyenne
     * des avis qui les contiennent et leur ton (positif si la moyenne est >= 4, negatif si <= 2,5). Pluriels rapproches
     * du singulier.
     */
    static JSONArray motsCles(List<Avis> avis, int max) {
        Map<String, List<Avis>> par = new HashMap<>();
        Map<String, Map<String, Integer>> graphies = new HashMap<>();
        for (Avis a : avis) {
            if (a.texte == null) {
                continue;
            }
            List<String> plats = mots(a.texte);
            String[] originaux = a.texte.toLowerCase(Locale.FRANCE).split("[^\\p{L}\\p{N}]+");
            Set<String> vus = new LinkedHashSet<>();
            for (int i = 0; i < plats.size(); i++) {
                String m = plats.get(i);
                if (m.length() > 2 && !VIDES.contains(m) && !m.matches("\\d+")) {
                    vus.add(m);
                    if (i < originaux.length) {
                        graphies.computeIfAbsent(m, k -> new HashMap<>()).merge(originaux[i], 1, Integer::sum);
                    }
                }
                if (i + 1 < plats.size()) {
                    String n = plats.get(i + 1);
                    if (m.length() > 2 && n.length() > 2 && !VIDES.contains(m) && !VIDES.contains(n)) {
                        vus.add(m + " " + n);
                    }
                }
            }
            for (String v : vus) {
                par.computeIfAbsent(v, k -> new ArrayList<>()).add(a);
            }
        }
        /* pluriel -> singulier quand le singulier existe */
        for (String m : new ArrayList<>(par.keySet())) {
            if (m.length() > 4 && (m.endsWith("s") || m.endsWith("x")) && !m.contains(" ")) {
                String s = m.substring(0, m.length() - 1);
                if (par.containsKey(s)) {
                    Set<Avis> u = new LinkedHashSet<>(par.get(s));
                    u.addAll(par.remove(m));
                    par.put(s, new ArrayList<>(u));
                }
            }
        }
        List<Map.Entry<String, List<Avis>>> l = par.entrySet().stream()
                .filter(e -> !e.getKey().contains(" ") || e.getValue().size() >= 2)
                .sorted(Comparator.comparingInt((Map.Entry<String, List<Avis>> e) -> -e.getValue().size())
                        .thenComparing(e -> e.getKey().contains(" ") ? 0 : 1).thenComparing(Map.Entry::getKey))
                .collect(Collectors.toList());
        /* une expression qui couvre exactement les memes avis que son mot le plus frequent le remplace */
        JSONArray a = new JSONArray();
        Set<String> masques = new HashSet<>();
        for (Map.Entry<String, List<Avis>> e : l) {
            if (e.getKey().contains(" ")) {
                for (String partie : e.getKey().split(" ")) {
                    List<Avis> seul = par.get(partie);
                    if (seul != null && seul.size() == e.getValue().size()) {
                        masques.add(partie);
                    }
                }
            }
        }
        for (Map.Entry<String, List<Avis>> e : l) {
            if (a.length() >= max) {
                break;
            }
            if (masques.contains(e.getKey())) {
                continue;
            }
            List<Avis> v = e.getValue();
            double moy = moyenne(v);
            a.put(new JSONObject().put("mot", affiche(e.getKey(), graphies)).put("cle", e.getKey())
                    .put("nombre", v.size()).put("moyenne", moy)
                    .put("negatifs", v.stream().filter(Avis::negatif).count())
                    .put("positifs", v.stream().filter(Avis::positif).count())
                    .put("ton", moy >= 4 ? "positif" : moy <= 2.5 ? "negatif" : "neutre"));
        }
        return a;
    }

    private static String affiche(String cle, Map<String, Map<String, Integer>> graphies) {
        StringBuilder b = new StringBuilder();
        for (String p : cle.split(" ")) {
            Map<String, Integer> g = graphies.get(p);
            String m = g == null ? p
                    : g.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(p);
            b.append(b.length() == 0 ? "" : " ").append(m);
        }
        return b.toString();
    }

    /** Nom cite ramene a sa forme de comparaison : sans accent, sans titre (Mme, le, la...). */
    public static String cleEmploye(String employe) {
        List<String> m = mots(employe).stream().filter(x -> !TITRES.contains(x)).collect(Collectors.toList());
        return String.join(" ", m);
    }

    static int distance(String a, String b) {
        int[] p = new int[b.length() + 1], c = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            p[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            c[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                c[j] = Math.min(Math.min(c[j - 1] + 1, p[j] + 1),
                        p[j - 1] + (a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1));
            }
            int[] t = p;
            p = c;
            c = t;
        }
        return p[b.length()];
    }

    /** Deux noms cites designent la meme personne : meme forme, ou une faute de frappe (Awa / Awah, Kone / Koné). */
    static boolean memePersonne(String a, String b) {
        if (a.equals(b)) {
            return true;
        }
        int l = Math.min(a.length(), b.length());
        String court = a.length() <= b.length() ? a : b, long_ = court == a ? b : a;
        /* nom court : seule une lettre muette ajoutee a la fin est toleree (Awa / Awah), pas Ali / Alia */
        if (l >= 3 && long_.length() == court.length() + 1 && long_.startsWith(court)
                && "hes".indexOf(long_.charAt(long_.length() - 1)) >= 0) {
            return true;
        }
        int tolere = l >= 9 ? 2 : l >= 5 ? 1 : 0;
        return tolere > 0 && distance(a, b) <= tolere;
    }

    static JSONArray employes(List<Avis> avis, Map<String, String> personnel) {
        /* groupes : cle de reference -> avis ; la reference est la premiere forme rencontree */
        Map<String, List<Avis>> groupes = new LinkedHashMap<>();
        Map<String, Map<String, Integer>> variantes = new HashMap<>();
        avis.stream().filter(a -> a.employe != null).sorted(Comparator.comparing(a -> a.date)).forEach(a -> {
            String k = cleEmploye(a.employe);
            if (k.isEmpty()) {
                k = Texte.plat(a.employe);
            }
            String ref = null;
            for (String g : groupes.keySet()) {
                if (memePersonne(g, k)) {
                    ref = g;
                    break;
                }
            }
            if (ref == null) {
                ref = k;
            }
            groupes.computeIfAbsent(ref, x -> new ArrayList<>()).add(a);
            variantes.computeIfAbsent(ref, x -> new HashMap<>()).merge(a.employe.trim(), 1, Integer::sum);
        });
        LocalDateTime limite30 = LocalDateTime.now().minusDays(30);
        List<JSONObject> l = new ArrayList<>();
        groupes.forEach((ref, la) -> {
            Map<String, Integer> v = variantes.get(ref);
            String libelle = v.entrySet().stream()
                    .max(Map.Entry.<String, Integer> comparingByValue().thenComparing(e -> -e.getKey().length()))
                    .map(Map.Entry::getKey).orElse(ref);
            JSONObject criteresNeg = new JSONObject();
            LIBELLES_CRITERES.forEach((c, lib) -> {
                long n = la.stream().filter(x -> "MOINS".equals(x.criteres.get(c))).count();
                if (n > 0) {
                    criteresNeg.put(lib, n);
                }
            });
            JSONArray mots = motsCles(la, 6);
            JSONArray ids = new JSONArray();
            la.forEach(x -> ids.put(x.id));
            String compte = correspondance(ref, personnel);
            Avis dernier = la.get(la.size() - 1);
            l.add(new JSONObject().put("employe", libelle).put("cle", ref)
                    .put("variantes", new JSONArray(new ArrayList<>(v.keySet()))).put("nombre", la.size())
                    .put("moyenne", moyenne(la)).put("negatifs", la.stream().filter(Avis::negatif).count())
                    .put("positifs", la.stream().filter(Avis::positif).count())
                    .put("trenteJours", la.stream().filter(x -> x.date.isAfter(limite30)).count())
                    .put("dernier", dernier.date.toString()).put("criteresNegatifs", criteresNeg).put("motsCles", mots)
                    .put("avis", ids).put("correspondance", compte == null ? JSONObject.NULL : compte));
        });
        l.sort(Comparator.comparingInt((JSONObject o) -> -o.getInt("negatifs"))
                .thenComparingInt(o -> -o.getInt("nombre")).thenComparing(o -> o.getString("employe")));
        return new JSONArray(l);
    }

    /** Utilisateur dont le prenom ou le nom correspond a l'un des mots du nom cite (un seul, sinon rien). */
    static String correspondance(String cle, Map<String, String> personnel) {
        Set<String> trouves = new LinkedHashSet<>();
        for (String m : cle.split(" ")) {
            if (m.length() >= 3) {
                for (Map.Entry<String, String> e : personnel.entrySet()) {
                    for (String p : e.getKey().split(" ")) {
                        if (p.length() >= 3 && memePersonne(p, m)) {
                            trouves.add(e.getValue());
                        }
                    }
                }
            }
        }
        return trouves.size() == 1 ? trouves.iterator().next() : null;
    }

    /** Points forts et points a ameliorer, en phrases courtes. */
    static JSONObject bilan(JSONArray criteres, JSONArray themes) {
        List<String> forts = new ArrayList<>(), faibles = new ArrayList<>();
        for (int i = 0; i < criteres.length(); i++) {
            JSONObject c = criteres.getJSONObject(i);
            long plus = c.getLong("plus"), moins = c.getLong("moins");
            if (plus + moins >= 2 && plus >= 2 * moins && plus > 0) {
                forts.add(c.getString("libelle") + " (" + plus + " appréciation" + (plus > 1 ? "s" : "") + ")");
            } else if (plus + moins >= 2 && moins > plus) {
                faibles.add(c.getString("libelle") + " (" + moins + " remarque" + (moins > 1 ? "s" : "") + ")");
            }
        }
        for (int i = 0; i < themes.length(); i++) {
            JSONObject t = themes.getJSONObject(i);
            if (t.getInt("negatifs") >= 2 && t.getInt("negatifs") > t.getInt("positifs")) {
                faibles.add("« " + t.getString("theme") + " » évoqué dans " + t.getInt("negatifs") + " avis négatifs");
            }
        }
        return new JSONObject().put("forts", forts).put("faibles", faibles);
    }

    static JSONArray alertes(List<Avis> avis, List<Avis> precedents, JSONArray employes, JSONArray themes) {
        JSONArray a = new JSONArray();
        long negNonTraites = avis.stream().filter(x -> x.negatif() && !"TRAITE".equals(x.statut)).count();
        if (negNonTraites > 0) {
            a.put(alerte("haute", negNonTraites + " avis à 1 ou 2 étoiles non traité" + (negNonTraites > 1 ? "s" : ""),
                    new JSONObject().put("note", "NEGATIF").put("statut", "NON_TRAITE")));
        }
        long attente = avis.stream().filter(x -> x.reponseAttendue).count();
        if (attente > 0) {
            a.put(alerte("moyenne", attente + " client" + (attente > 1 ? "s attendent" : " attend") + " une réponse",
                    new JSONObject().put("reponse", "ATTENDUE")));
        }
        for (int i = 0; i < employes.length(); i++) {
            JSONObject e = employes.getJSONObject(i);
            if (e.getInt("negatifs") >= 2 || e.getInt("trenteJours") >= 3 && e.getDouble("moyenne") < 3) {
                a.put(alerte("haute",
                        "« " + e.getString("employe") + " » cité dans " + e.getInt("negatifs")
                                + " avis négatifs (note moyenne " + e.getDouble("moyenne") + ")",
                        new JSONObject().put("employe", e.getString("cle"))));
            }
        }
        double m = moyenne(avis), mp = moyenne(precedents);
        if (avis.size() >= 3 && precedents.size() >= 3 && mp - m >= 0.5) {
            a.put(alerte("moyenne", "Note moyenne en baisse : " + m + " contre " + mp + " la période précédente",
                    null));
        }
        for (int i = 0; i < themes.length(); i++) {
            JSONObject t = themes.getJSONObject(i);
            if (t.getInt("negatifs") >= 3 && t.getInt("nombre") >= 2 * Math.max(1, t.getInt("precedent"))) {
                a.put(alerte("moyenne",
                        "Thème « " + t.getString("theme") + " » en hausse : " + t.getInt("nombre") + " avis contre "
                                + t.getInt("precedent") + " la période précédente",
                        new JSONObject().put("theme", t.getString("theme"))));
            }
        }
        return a;
    }

    private static JSONObject alerte(String niveau, String texte, JSONObject filtre) {
        return new JSONObject().put("niveau", niveau).put("texte", texte).put("filtre",
                filtre == null ? JSONObject.NULL : filtre);
    }
}
