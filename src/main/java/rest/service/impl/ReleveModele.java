package rest.service.impl;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONObject;

/**
 * Retours du 09/10 (5) : chaque grossiste presente son releve a sa maniere. Le PDF est lu en lignes de cellules
 * positionnees ({@link ReleveGrossistePdf#lignes}), les cellules sont rangees en colonnes, l'operateur designe la
 * colonne de chaque champ (type, N° BL, sequence, date, montants) et ce reglage est memorise par grossiste, par la
 * position des colonnes, pour les releves suivants. Classe pure, sans base.
 */
public final class ReleveModele {

    /** Champs d'une ligne de releve que l'operateur peut designer. */
    public enum Champ {
        TYPE("Type (BL / avoir)"), NUMERO("N° BL"), SEQUENCE("N° séquence"), DATE("Date"),
        MONTANT("Montant HT (avoirs négatifs)"), MONTANT_BL("Montant BL (débit)"),
        MONTANT_AVOIR("Montant avoir (crédit)");

        public final String libelle;

        Champ(String libelle) {
            this.libelle = libelle;
        }
    }

    /** Un morceau de texte d'une ligne, avec son etendue horizontale (points PDF). */
    public static class Cellule implements Serializable {

        private static final long serialVersionUID = 1L;
        public final String texte;
        public final float x0, x1;

        public Cellule(String texte, float x0, float x1) {
            this.texte = texte;
            this.x0 = x0;
            this.x1 = x1;
        }
    }

    /** Une ligne du PDF : ses cellules de gauche a droite. */
    public static class LigneBrute implements Serializable {

        private static final long serialVersionUID = 1L;
        public final int page;
        public final List<Cellule> cellules;

        public LigneBrute(int page, List<Cellule> cellules) {
            this.page = page;
            this.cellules = cellules;
        }
    }

    /** Une colonne du releve : etendue horizontale commune aux lignes de donnees. */
    public static class Colonne implements Serializable {

        private static final long serialVersionUID = 1L;
        public float x0, x1;

        Colonne(float x0, float x1) {
            this.x0 = x0;
            this.x1 = x1;
        }

        public float centre() {
            return (x0 + x1) / 2;
        }
    }

    /** Reglage d'un grossiste : position (centre) de la colonne de chaque champ, et marqueurs d'avoir. */
    public static class Modele {

        public final Map<Champ, Float> positions = new EnumMap<>(Champ.class);
        /** textes de la colonne Type qui designent un avoir, separes par des virgules */
        public String marqueursAvoir = "AV";

        public JSONObject json() {
            JSONObject c = new JSONObject();
            positions.forEach((k, v) -> c.put(k.name(), Math.round(v * 10) / 10.0));
            return new JSONObject().put("version", 1).put("colonnes", c).put("marqueursAvoir", marqueursAvoir);
        }

        public static Modele lire(String json) {
            Modele m = new Modele();
            JSONObject o = new JSONObject(json);
            JSONObject c = o.optJSONObject("colonnes");
            if (c != null) {
                for (Champ ch : Champ.values()) {
                    if (c.has(ch.name())) {
                        m.positions.put(ch, (float) c.getDouble(ch.name()));
                    }
                }
            }
            m.marqueursAvoir = o.optString("marqueursAvoir", "AV");
            return m;
        }

        /** Le N° BL, la date et un montant sont indispensables. */
        public String incomplet() {
            if (!positions.containsKey(Champ.NUMERO)) {
                return "Désignez la colonne du N° BL.";
            }
            if (!positions.containsKey(Champ.DATE)) {
                return "Désignez la colonne de la date.";
            }
            if (!positions.containsKey(Champ.MONTANT) && !positions.containsKey(Champ.MONTANT_BL)
                    && !positions.containsKey(Champ.MONTANT_AVOIR)) {
                return "Désignez la colonne du montant (ou les colonnes montant BL / montant avoir).";
            }
            return null;
        }
    }

    /** Ecart maximal (points) entre la position memorisee d'une colonne et celle du nouveau releve. */
    static final float ECART_POSITION = 30f;
    static final int COLONNES_MAX = 20;

    private static final Pattern DATE = Pattern.compile("(?<!\\d)(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{4}|\\d{2})(?!\\d)");
    private static final Pattern DATE_SEULE = Pattern.compile("^\\d{1,2}[/.-]\\d{1,2}[/.-](\\d{4}|\\d{2})$");
    private static final Pattern MONTANT = Pattern
            .compile("^(-|\\()?\\s*(\\d{1,3}(?:[ .,\\u00a0\\u202f']\\d{3})+|\\d+)(?:[.,](\\d{1,2}))?\\s*(-|\\))?$");
    private static final Pattern NUMERO = Pattern
            .compile("^([A-Za-z]{1,6})?\\s*[-_]?\\s*0*(\\d{3,15})(?:\\s+(\\d{1,3}))?$");
    private static final Pattern CHIFFRES = Pattern.compile("\\d+");

    private ReleveModele() {
    }

    // ---------------------------------------------------------------- lecture des valeurs

    static String propre(String s) {
        return s == null ? "" : s.replace(' ', ' ').replace(' ', ' ').replace('\t', ' ').trim();
    }

    /** Date jj/mm/aa ou jj/mm/aaaa (separateurs / . -), stricte ; null sinon. */
    static LocalDate date(String v) {
        Matcher m = DATE.matcher(propre(v));
        if (!m.find()) {
            return null;
        }
        try {
            int a = Integer.parseInt(m.group(3));
            return LocalDate.of(a < 100 ? 2000 + a : a, Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1)));
        } catch (RuntimeException e) {
            return null;
        }
    }

    /**
     * Montant : separateurs de milliers (espace, point, virgule, apostrophe), decimales sur 1 ou 2 chiffres
     * (arrondies), negatif par « - » devant ou derriere ou entre parentheses. null si ce n'est pas un montant.
     */
    static Long montant(String v) {
        String s = propre(v).replaceAll("\\s+(?=\\d)", " ");
        if (s.isEmpty()) {
            return null;
        }
        Matcher m = MONTANT.matcher(s);
        if (!m.matches()) {
            return null;
        }
        long entier;
        try {
            entier = Long.parseLong(m.group(2).replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return null;
        }
        if (m.group(3) != null) {
            int dec = Integer.parseInt(m.group(3).length() == 1 ? m.group(3) + "0" : m.group(3));
            entier += dec >= 50 ? 1 : 0;
        }
        boolean ouvre = "(".equals(m.group(1)), ferme = ")".equals(m.group(4));
        if (ouvre != ferme) {
            return null;
        }
        boolean negatif = ouvre || "-".equals(m.group(1)) || "-".equals(m.group(4));
        return negatif ? -entier : entier;
    }

    /** Cellule ne contenant qu'une date (pas « du 14/09/2026 au 30/09/2026 »). */
    static LocalDate dateSeule(String v) {
        String s = propre(v);
        return DATE_SEULE.matcher(s).matches() ? date(s) : null;
    }

    /** Texte sans accents, en minuscules (en-tetes de colonnes). */
    static String normal(String v) {
        return java.text.Normalizer.normalize(propre(v), java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }

    // ---------------------------------------------------------------- colonnes

    /** Ligne pouvant etre une operation : au moins 3 cellules, une cellule qui n'est qu'une date et un autre nombre. */
    static boolean ressembleDonnee(LigneBrute l) {
        if (l.cellules.size() < 3) {
            return false;
        }
        boolean date = false, nombre = false;
        for (Cellule c : l.cellules) {
            if (!date && dateSeule(c.texte) != null) {
                date = true;
            } else if (CHIFFRES.matcher(c.texte).find()) {
                nombre = true;
            }
        }
        return date && nombre;
    }

    /** Colonnes du releve : reunion des etendues des cellules des lignes de donnees qui se chevauchent. */
    public static List<Colonne> colonnes(List<LigneBrute> lignes) {
        List<float[]> etendues = new ArrayList<>();
        for (LigneBrute l : lignes) {
            if (ressembleDonnee(l)) {
                for (Cellule c : l.cellules) {
                    etendues.add(new float[] { c.x0, c.x1 });
                }
            }
        }
        etendues.sort((a, b) -> Float.compare(a[0], b[0]));
        List<Colonne> sortie = new ArrayList<>();
        Colonne courante = null;
        for (float[] e : etendues) {
            if (courante != null && e[0] <= courante.x1 + 1f) {
                courante.x1 = Math.max(courante.x1, e[1]);
            } else {
                courante = new Colonne(e[0], e[1]);
                sortie.add(courante);
            }
        }
        return sortie.size() > COLONNES_MAX ? new ArrayList<>(sortie.subList(0, COLONNES_MAX)) : sortie;
    }

    /**
     * Rang de la colonne d'une cellule (plus grand chevauchement, sinon la plus proche a moins de 10 points), -1 sinon.
     */
    static int colonneDe(Cellule c, List<Colonne> cols) {
        int meilleure = -1;
        float recouvrement = 0, distance = 10f;
        for (int i = 0; i < cols.size(); i++) {
            Colonne k = cols.get(i);
            float r = Math.min(c.x1, k.x1) - Math.max(c.x0, k.x0);
            if (r > recouvrement) {
                recouvrement = r;
                meilleure = i;
            } else if (recouvrement <= 0) {
                float d = r >= 0 ? 0 : -r;
                if (d < distance) {
                    distance = d;
                    meilleure = i;
                }
            }
        }
        return meilleure;
    }

    /** Une ligne rangee dans les colonnes (cellules d'une meme colonne jointes par un espace). */
    public static String[] ranger(LigneBrute l, List<Colonne> cols) {
        String[] v = new String[cols.size()];
        for (Cellule c : l.cellules) {
            int i = colonneDe(c, cols);
            if (i >= 0) {
                v[i] = v[i] == null ? propre(c.texte) : v[i] + " " + propre(c.texte);
            }
        }
        for (int i = 0; i < v.length; i++) {
            v[i] = v[i] == null ? "" : v[i];
        }
        return v;
    }

    /** Colonne memorisee la plus proche de la position, -1 si aucune a moins de {@link #ECART_POSITION}. */
    static int colonneProche(float position, List<Colonne> cols) {
        int meilleure = -1;
        float ecart = ECART_POSITION;
        for (int i = 0; i < cols.size(); i++) {
            Colonne k = cols.get(i);
            float d = position >= k.x0 && position <= k.x1 ? 0 : Math.abs(k.centre() - position);
            if (d < ecart) {
                ecart = d;
                meilleure = i;
            }
        }
        return meilleure;
    }

    /** Rang de colonne de chaque champ du modele dans ce releve. */
    public static Map<Champ, Integer> rangs(Modele m, List<Colonne> cols) {
        Map<Champ, Integer> r = new EnumMap<>(Champ.class);
        m.positions.forEach((ch, x) -> {
            int i = colonneProche(x, cols);
            if (i >= 0) {
                r.put(ch, i);
            }
        });
        return r;
    }

    /** Modele construit a partir des rangs de colonnes choisis a l'ecran. */
    public static Modele modele(Map<Champ, Integer> rangs, List<Colonne> cols, String marqueursAvoir) {
        Modele m = new Modele();
        rangs.forEach((ch, i) -> {
            if (i != null && i >= 0 && i < cols.size()) {
                m.positions.put(ch, cols.get(i).centre());
            }
        });
        if (marqueursAvoir != null && !marqueursAvoir.trim().isEmpty()) {
            m.marqueursAvoir = marqueursAvoir.trim();
        }
        return m;
    }

    // ---------------------------------------------------------------- proposition automatique

    /**
     * En-tete de chaque colonne : texte des lignes (4 au plus, jusqu'a un titre date) qui precedent la premiere ligne
     * de donnees (« Montant » / « Net HT » sur deux lignes sont reunis).
     */
    public static String[] entetes(List<LigneBrute> lignes, List<Colonne> cols) {
        String[] e = new String[cols.size()];
        java.util.Arrays.fill(e, "");
        int premiere = -1;
        for (int i = 0; i < lignes.size() && premiere < 0; i++) {
            if (ressembleDonnee(lignes.get(i))) {
                premiere = i;
            }
        }
        int debut = premiere;
        while (debut > 0 && premiere - debut < 4 && lignes.get(debut - 1).page == lignes.get(premiere).page
                && !contientDate(lignes.get(debut - 1))) {
            debut--;
        }
        for (int i = Math.max(0, debut); i < premiere; i++) {
            List<Cellule> cs = lignes.get(i).cellules;
            for (int j = 0; j < cs.size(); j++) {
                /* autant d'en-tetes que de colonnes : dans l'ordre (en-tete cale a gauche, montants a droite) */
                int k = cs.size() == cols.size() ? j : zone((cs.get(j).x0 + cs.get(j).x1) / 2, cols);
                e[k] = (e[k] + " " + propre(cs.get(j).texte)).trim();
            }
        }
        return e;
    }

    private static boolean contientDate(LigneBrute l) {
        for (Cellule c : l.cellules) {
            if (date(c.texte) != null) {
                return true;
            }
        }
        return false;
    }

    /** Colonne dont la zone (jusqu'a mi-chemin des colonnes voisines) contient la position. */
    static int zone(float x, List<Colonne> cols) {
        for (int i = 0; i < cols.size() - 1; i++) {
            if (x < (cols.get(i).x1 + cols.get(i + 1).x0) / 2) {
                return i;
            }
        }
        return cols.size() - 1;
    }

    private static double part(List<String[]> rangees, int i, java.util.function.Predicate<String> test) {
        int n = 0, ok = 0;
        for (String[] r : rangees) {
            if (!r[i].isEmpty()) {
                n++;
                if (test.test(r[i])) {
                    ok++;
                }
            }
        }
        return n == 0 ? 0 : (double) ok / n;
    }

    private static int remplies(List<String[]> rangees, int i) {
        int n = 0;
        for (String[] r : rangees) {
            if (!r[i].isEmpty()) {
                n++;
            }
        }
        return n;
    }

    private static boolean contient(String entete, String... mots) {
        for (String m : mots) {
            if (entete.matches("(?s).*\\b" + m + "\\b.*")) {
                return true;
            }
        }
        return false;
    }

    /** Interet d'une colonne de montants d'apres son en-tete : HT net d'abord, TTC en dernier, TVA / remise exclues. */
    private static int note(String entete) {
        if (contient(entete, "tva", "remise", "ristourne", "solde", "taux", "qte", "quantite", "escompte", "cumul")
                && !contient(entete, "net")) {
            return -1;
        }
        if (contient(entete, "net") && contient(entete, "ht")) {
            return 5;
        }
        if (contient(entete, "ht")) {
            return contient(entete, "brut") ? 3 : 4;
        }
        if (contient(entete, "ttc")) {
            return 1;
        }
        return 2;
    }

    /** Proposition de colonnes d'apres le contenu et les en-tetes (l'operateur corrige au besoin). */
    public static Map<Champ, Integer> deviner(List<LigneBrute> lignes, List<Colonne> cols) {
        Map<Champ, Integer> r = new EnumMap<>(Champ.class);
        List<String[]> rangees = new ArrayList<>();
        for (LigneBrute l : lignes) {
            if (ressembleDonnee(l)) {
                rangees.add(ranger(l, cols));
            }
        }
        if (rangees.isEmpty()) {
            return r;
        }
        String[] ent = entetes(lignes, cols);
        for (int i = 0; i < ent.length; i++) {
            ent[i] = normal(ent[i]);
        }
        int seuil = Math.max(1, rangees.size() / 2);
        java.util.Set<Integer> pris = new java.util.HashSet<>();
        /* date : la premiere colonne de dates */
        for (int i = 0; i < cols.size() && !r.containsKey(Champ.DATE); i++) {
            if (remplies(rangees, i) >= seuil && part(rangees, i, s -> dateSeule(s) != null) >= 0.8) {
                r.put(Champ.DATE, i);
                pris.add(i);
            }
        }
        /* type : mots courts sans chiffre (BL, AV/BL, FACT, AVOIR) */
        for (int i = 0; i < cols.size() && !r.containsKey(Champ.TYPE); i++) {
            if (!pris.contains(i) && remplies(rangees, i) >= seuil
                    && part(rangees, i, s -> s.length() <= 8 && !CHIFFRES.matcher(s).find()) >= 0.8) {
                r.put(Champ.TYPE, i);
                pris.add(i);
            }
        }
        /* N° BL : au moins 4 chiffres a la suite ; l'en-tete N° / reference / facture / BL l'emporte, sinon a gauche */
        int numero = -1;
        for (int i = 0; i < cols.size(); i++) {
            if (pris.contains(i) || remplies(rangees, i) < seuil
                    || part(rangees, i, s -> s.matches(".*\\d{4,}.*")) < 0.8) {
                continue;
            }
            boolean nomme = contient(ent[i], "n", "no", "num", "numero", "ref", "reference", "facture", "bl", "piece",
                    "document", "doc");
            if (numero < 0 || nomme && !contient(ent[numero], "n", "no", "num", "numero", "ref", "reference", "facture",
                    "bl", "piece", "document", "doc")) {
                numero = i;
            }
        }
        if (numero >= 0) {
            r.put(Champ.NUMERO, numero);
            pris.add(numero);
        }
        /* sequence : en-tete « seq » */
        for (int i = 0; i < cols.size() && !r.containsKey(Champ.SEQUENCE); i++) {
            if (!pris.contains(i) && contient(ent[i], "seq", "sequence") && remplies(rangees, i) > 0) {
                r.put(Champ.SEQUENCE, i);
                pris.add(i);
            }
        }
        /* montants : debit / credit s'ils sont nommes, sinon la meilleure colonne de montants */
        List<Integer> montants = new ArrayList<>();
        for (int i = 0; i < cols.size(); i++) {
            if (!pris.contains(i) && remplies(rangees, i) > 0 && part(rangees, i, s -> montant(s) != null) >= 0.8) {
                montants.add(i);
            }
        }
        Integer debit = null, credit = null;
        for (int i : montants) {
            if (debit == null && contient(ent[i], "debit")) {
                debit = i;
            } else if (credit == null && contient(ent[i], "credit")) {
                credit = i;
            }
        }
        if (debit != null && credit != null) {
            r.put(Champ.MONTANT_BL, debit);
            r.put(Champ.MONTANT_AVOIR, credit);
            return r;
        }
        boolean sansEntete = true;
        for (String e : ent) {
            sansEntete &= e.isEmpty();
        }
        if (sansEntete && montants.size() >= 2) {
            int a = montants.get(0), b = montants.get(1), deux = 0;
            for (String[] x : rangees) {
                if (!x[a].isEmpty() && !x[b].isEmpty()) {
                    deux++;
                }
            }
            if (deux * 10 <= rangees.size()) {
                r.put(Champ.MONTANT_BL, a);
                r.put(Champ.MONTANT_AVOIR, b);
                return r;
            }
        }
        int meilleure = -1, meilleureNote = -1;
        for (int i : montants) {
            int n = note(ent[i]);
            if (n > meilleureNote) {
                meilleure = i;
                meilleureNote = n;
            }
        }
        if (meilleure >= 0) {
            r.put(Champ.MONTANT, meilleure);
        }
        return r;
    }

    // ---------------------------------------------------------------- lecture avec le modele

    private static String valeur(String[] v, Map<Champ, Integer> rangs, Champ c) {
        Integer i = rangs.get(c);
        return i == null || i >= v.length ? "" : v[i];
    }

    private static boolean estAvoir(String type, String marqueurs) {
        String t = type.toUpperCase(Locale.ROOT).replace(" ", "");
        if (t.isEmpty()) {
            return false;
        }
        for (String m : marqueurs.split("[,;]")) {
            String k = m.trim().toUpperCase(Locale.ROOT).replace(" ", "");
            if (!k.isEmpty() && t.contains(k)) {
                return true;
            }
        }
        return false;
    }

    /** Une rangee lue avec les rangs de colonnes, null si ce n'est pas une operation (en-tete, total, report...). */
    public static ReleveGrossiste.Ligne ligne(String[] v, Map<Champ, Integer> rangs, String marqueursAvoir) {
        LocalDate d = dateSeule(valeur(v, rangs, Champ.DATE));
        if (d == null) {
            return null;
        }
        String numeroBrut = valeur(v, rangs, Champ.NUMERO);
        String sequence = propre(valeur(v, rangs, Champ.SEQUENCE));
        if (!rangs.containsKey(Champ.SEQUENCE) && numeroBrut.contains("/")) {
            int k = numeroBrut.lastIndexOf('/');
            sequence = propre(numeroBrut.substring(k + 1));
            numeroBrut = numeroBrut.substring(0, k);
        }
        numeroBrut = propre(numeroBrut);
        String agence = "", numeroBl, indice = "";
        Matcher n = NUMERO.matcher(numeroBrut);
        if (n.matches()) {
            agence = n.group(1) == null ? "" : n.group(1).toUpperCase(Locale.ROOT);
            numeroBl = n.group(2);
            indice = n.group(3) == null ? "" : n.group(3);
        } else {
            numeroBl = RapprochementBL.numero(numeroBrut);
        }
        if (numeroBl.length() < 3) {
            return null;
        }
        Long montant = montant(valeur(v, rangs, Champ.MONTANT));
        Long bl = montant(valeur(v, rangs, Champ.MONTANT_BL));
        Long avoir = montant(valeur(v, rangs, Champ.MONTANT_AVOIR));
        boolean estAvoir;
        long ht;
        if (avoir != null && avoir != 0 && (bl == null || bl == 0)) {
            estAvoir = true;
            ht = avoir;
        } else if (bl != null) {
            estAvoir = false;
            ht = bl;
        } else if (montant != null) {
            estAvoir = montant < 0;
            ht = montant;
        } else {
            return null;
        }
        if (rangs.containsKey(Champ.TYPE) && estAvoir(valeur(v, rangs, Champ.TYPE), marqueursAvoir)) {
            estAvoir = true;
        }
        ht = estAvoir ? -Math.abs(ht) : Math.abs(ht);
        if (sequence.length() > 20) {
            sequence = sequence.substring(0, 20);
        }
        String numero = (agence.isEmpty() ? "" : agence + " ") + numeroBl + (indice.isEmpty() ? "" : " " + indice);
        return new ReleveGrossiste.Ligne(estAvoir ? ReleveGrossiste.Type.AVOIR : ReleveGrossiste.Type.BL, numero,
                agence, numeroBl, indice, sequence, d, ht);
    }

    /** Operations du releve lues avec le modele du grossiste. */
    public static List<ReleveGrossiste.Ligne> lire(List<LigneBrute> lignes, Modele m) {
        List<ReleveGrossiste.Ligne> sortie = new ArrayList<>();
        if (m == null || m.incomplet() != null) {
            return sortie;
        }
        List<Colonne> cols = colonnes(lignes);
        Map<Champ, Integer> rangs = rangs(m, cols);
        if (!rangs.containsKey(Champ.NUMERO) || !rangs.containsKey(Champ.DATE)) {
            return sortie;
        }
        for (LigneBrute l : lignes) {
            ReleveGrossiste.Ligne x = ligne(ranger(l, cols), rangs, m.marqueursAvoir);
            if (x != null) {
                sortie.add(x);
            }
        }
        return sortie;
    }
}
