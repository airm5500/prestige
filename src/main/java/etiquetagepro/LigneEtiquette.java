package etiquetagepro;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import rest.report.pdf.Gs1;

/**
 * Etiquettage Pro : une ligne de produit (fichier importe ou saisie), ses valeurs par zone et le resultat du controle.
 * Une ligne en erreur n'est pas imprimee ; un avertissement n'empeche rien.
 */
public final class LigneEtiquette {

    public static final int MAX_PAR_LIGNE = 999;
    private static final DateTimeFormatter JJ_MM_AAAA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final int numero;
    private final Map<Zone, String> valeurs = new EnumMap<>(Zone.class);
    private final Map<String, String> ajoutees = new LinkedHashMap<>();
    private final List<String> erreurs = new ArrayList<>();
    private final List<String> avertissements = new ArrayList<>();
    /* valeurs controlees */
    private BigDecimal prix;
    private LocalDate peremption;
    private int nombre = 1;

    public LigneEtiquette(int numero) {
        this.numero = numero;
    }

    public LigneEtiquette valeur(Zone z, String v) {
        valeurs.put(z, v == null ? "" : v.trim());
        return this;
    }

    public String valeur(Zone z) {
        String v = valeurs.get(z);
        return v == null ? "" : v;
    }

    public LigneEtiquette ajoutee(String nom, String v) {
        ajoutees.put(nom, v == null ? "" : v.trim());
        return this;
    }

    public Map<String, String> getAjoutees() {
        return Collections.unmodifiableMap(ajoutees);
    }

    public int getNumero() {
        return numero;
    }

    public List<String> getErreurs() {
        return Collections.unmodifiableList(erreurs);
    }

    public List<String> getAvertissements() {
        return Collections.unmodifiableList(avertissements);
    }

    public boolean imprimable() {
        return erreurs.isEmpty();
    }

    public BigDecimal getPrix() {
        return prix;
    }

    public LocalDate getPeremption() {
        return peremption;
    }

    public int getNombre() {
        return nombre;
    }

    /** Controle la ligne (zones obligatoires, CIP, prix, peremption, EAN, nombre d'etiquettes). */
    public LigneEtiquette valider(Set<Zone> obligatoires) {
        erreurs.clear();
        avertissements.clear();
        prix = null;
        peremption = null;
        nombre = 1;
        for (Zone z : obligatoires) {
            if (valeur(z).isEmpty()) {
                erreurs.add(z.getLibelle() + " manquant"
                        + (z == Zone.DESIGNATION || z == Zone.PEREMPTION || z == Zone.MENTION || z == Zone.DATE ? "e"
                                : ""));
            }
        }
        String cip = valeur(Zone.CIP);
        if (!cip.isEmpty() && !cip.matches("[A-Za-z0-9][A-Za-z0-9.\\-]{0,29}")) {
            erreurs.add("CIP invalide (lettres et chiffres, 30 au plus)");
        }
        String p = valeur(Zone.PRIX);
        if (!p.isEmpty()) {
            prix = lirePrix(p);
            if (prix == null) {
                erreurs.add("Prix illisible : " + p);
            } else if (prix.signum() < 0) {
                erreurs.add("Prix négatif");
                prix = null;
            }
        }
        String d = valeur(Zone.PEREMPTION);
        if (!d.isEmpty()) {
            peremption = lireDate(d);
            if (peremption == null) {
                erreurs.add("Péremption illisible : " + d + " (jj/mm/aaaa ou mm/aaaa)");
            } else if (peremption.isBefore(LocalDate.now())) {
                avertissements.add("Lot périmé (" + peremption.format(JJ_MM_AAAA) + ")");
            }
        }
        String ean = valeur(Zone.EAN);
        if (!ean.isEmpty() && Gs1.gtin14(ean) == null) {
            avertissements.add("EAN invalide : il ne figurera pas dans le code 2D");
        }
        if (valeur(Zone.LOT).length() > 20) {
            avertissements.add("Lot de plus de 20 caractères : tronqué dans le code 2D");
        }
        String n = valeur(Zone.NOMBRE);
        if (!n.isEmpty()) {
            BigDecimal x = lirePrix(n);
            if (x == null || x.stripTrailingZeros().scale() > 0 || x.compareTo(BigDecimal.ZERO) < 0
                    || x.compareTo(BigDecimal.valueOf(MAX_PAR_LIGNE)) > 0) {
                erreurs.add("Nombre d'étiquettes invalide : " + n + " (0 à " + MAX_PAR_LIGNE + ")");
            } else {
                nombre = x.intValue();
                if (nombre == 0) {
                    avertissements.add("Aucune étiquette demandée (nombre 0)");
                }
            }
        }
        return this;
    }

    /**
     * Montant ecrit librement : « 1 500 », « 1500 F », « 1.500 », « 1 500,50 », « 12,5 € », « 1500 CFA ». Le point
     * suivi de trois chiffres est un separateur de milliers ; sinon point et virgule sont des decimales.
     */
    static BigDecimal lirePrix(String s) {
        String t = s.replaceAll("(?i)(f\\s*cfa|cfa|fcfa|xof|eur|euros?|€|f)\\s*$", "")
                .replaceAll("[\\s\\u00a0\\u202f']", "");
        if (t.isEmpty()) {
            return null;
        }
        if (t.matches("-?\\d{1,3}(\\.\\d{3})+(,\\d+)?")) {
            t = t.replace(".", "").replace(',', '.');
        } else if (t.matches("-?\\d{1,3}(,\\d{3})+(\\.\\d+)?")) {
            t = t.replace(",", "");
        } else {
            t = t.replace(',', '.');
        }
        try {
            return new BigDecimal(t);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Date ecrite librement : jj/mm/aaaa, jj/mm/aa, jj-mm-aaaa, jj.mm.aaaa, aaaa-mm-jj, mm/aaaa et mm/aa (dernier jour
     * du mois), ou numero de jour Excel (cellule non formatee).
     */
    static LocalDate lireDate(String s) {
        String t = s.trim();
        try {
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("(\\d{1,2})[/.\\-](\\d{1,2})[/.\\-](\\d{2}|\\d{4})").matcher(t);
            if (m.matches()) {
                return LocalDate.of(annee(m.group(3)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1)));
            }
            m = java.util.regex.Pattern.compile("(\\d{4})[/.\\-](\\d{1,2})[/.\\-](\\d{1,2})").matcher(t);
            if (m.matches()) {
                return LocalDate.of(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)),
                        Integer.parseInt(m.group(3)));
            }
            m = java.util.regex.Pattern.compile("(\\d{1,2})[/.\\-](\\d{2}|\\d{4})").matcher(t);
            if (m.matches()) {
                return YearMonth.of(annee(m.group(2)), Integer.parseInt(m.group(1))).atEndOfMonth();
            }
            if (t.matches("\\d{5}")) {
                /* numero de jour Excel (1900) : 45000 = 15/03/2023 */
                return LocalDate.of(1899, 12, 30).plusDays(Long.parseLong(t));
            }
        } catch (java.time.DateTimeException | NumberFormatException e) {
            return null;
        }
        return null;
    }

    private static int annee(String a) {
        int x = Integer.parseInt(a);
        return a.length() == 2 ? 2000 + x : x;
    }
}
