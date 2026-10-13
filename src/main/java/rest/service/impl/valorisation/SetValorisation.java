package rest.service.impl.valorisation;

import etiquetagepro.Correspondance;
import etiquetagepro.Tableau;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.apache.commons.lang3.StringUtils;

/**
 * SET VALORISATION (besoins du 11/10, lot 4) : valorisation SIMULEE, jamais ecrite dans le stock.
 * <p>
 * Point de depart : le stock de l'officine ou un fichier importe (temporaire, rien n'est conserve). Les quantites sont
 * ajustees proportionnellement pour atteindre une valeur cible (au prix d'achat ou au prix de vente), puis arrondies a
 * l'unite : les unites manquantes sont donnees d'abord aux lignes dont la part arrondie etait la plus grande (methode
 * du plus fort reste), sans jamais depasser la cible. Une ligne a quantite nulle reste nulle.
 * <p>
 * Toute edition porte la mention {@link #MENTION}.
 */
public final class SetValorisation {

    public static final String MENTION = "SIMULATION — ne reflète pas le stock réel";
    public static final int MAX_LIGNES = 20000;
    public static final long CIBLE_MAX = 1_000_000_000_000L;

    public enum Base {
        PA("prix d'achat"), PV("prix de vente");

        public final String libelle;

        Base(String libelle) {
            this.libelle = libelle;
        }

        public static Base de(String v) {
            return "PV".equalsIgnoreCase(StringUtils.trimToEmpty(v)) ? PV : PA;
        }
    }

    /** Une ligne : produit, quantite de depart, prix ; qteAjustee est remplie par {@link #ajuster}. */
    public static final class Ligne {
        public String cip, designation;
        public long qte, pa, pv, qteAjustee;

        public Ligne() {
        }

        public Ligne(String cip, String designation, long qte, long pa, long pv) {
            this.cip = cip;
            this.designation = designation;
            this.qte = qte;
            this.pa = pa;
            this.pv = pv;
        }

        public long prix(Base b) {
            return b == Base.PV ? pv : pa;
        }
    }

    /** Resultat d'un ajustement. */
    public static final class Resultat {
        public Base base;
        public long cible, valeurDepart, valeurObtenue, qteDepart, qteAjustee;
        public double coefficient;
        public int lignesValorisees;
        public List<Ligne> lignes = new ArrayList<>();

        public long ecart() {
            return cible - valeurObtenue;
        }
    }

    private SetValorisation() {
    }

    /** Controle de la demande ; null si elle est recevable, sinon le motif. */
    public static String controler(List<Ligne> lignes, long cible) {
        if (lignes == null || lignes.isEmpty()) {
            return "Aucune ligne à valoriser.";
        }
        if (lignes.size() > MAX_LIGNES) {
            return "Trop de lignes (" + lignes.size() + ", " + MAX_LIGNES + " au plus).";
        }
        if (cible <= 0 || cible > CIBLE_MAX) {
            return "Indiquez une valeur cible positive.";
        }
        return null;
    }

    /**
     * Ajuste les quantites pour approcher la cible sans la depasser. Les lignes recues ne sont pas modifiees : le
     * resultat en porte des copies. Une quantite ou un prix negatif compte pour zero.
     */
    public static Resultat ajuster(List<Ligne> lignes, long cible, Base base) {
        Resultat r = new Resultat();
        r.base = base;
        r.cible = cible;
        List<Ligne> copie = new ArrayList<>(lignes.size());
        for (Ligne l : lignes) {
            Ligne c = new Ligne(l.cip, l.designation, Math.max(0, l.qte), Math.max(0, l.pa), Math.max(0, l.pv));
            copie.add(c);
            r.qteDepart += c.qte;
            r.valeurDepart += c.qte * c.prix(base);
        }
        r.lignes = copie;
        if (r.valeurDepart <= 0) {
            return r;
        }
        BigDecimal facteur = BigDecimal.valueOf(cible).divide(BigDecimal.valueOf(r.valeurDepart), 12,
                BigDecimal.ROUND_HALF_UP);
        r.coefficient = facteur.doubleValue();
        long reste = cible;
        double[] fractions = new double[copie.size()];
        for (int i = 0; i < copie.size(); i++) {
            Ligne c = copie.get(i);
            if (c.qte == 0 || c.prix(base) == 0) {
                /* sans prix, la ligne ne pese pas dans la valeur : sa quantite suit le coefficient, sans plus */
                c.qteAjustee = c.prix(base) == 0
                        ? BigDecimal.valueOf(c.qte).multiply(facteur).setScale(0, BigDecimal.ROUND_HALF_UP).longValue()
                        : 0;
                continue;
            }
            BigDecimal brut = BigDecimal.valueOf(c.qte).multiply(facteur);
            long entier = brut.setScale(0, BigDecimal.ROUND_FLOOR).longValue();
            c.qteAjustee = entier;
            fractions[i] = brut.subtract(BigDecimal.valueOf(entier)).doubleValue();
            reste -= entier * c.prix(base);
        }
        /*
         * plus fort reste : une unite de plus aux lignes les plus proches de l'unite suivante, tant que la cible tient
         */
        List<Integer> ordre = new ArrayList<>();
        for (int i = 0; i < copie.size(); i++) {
            if (copie.get(i).qte > 0 && copie.get(i).prix(base) > 0) {
                ordre.add(i);
            }
        }
        ordre.sort(Comparator.<Integer> comparingDouble(i -> -fractions[i]).thenComparing(i -> i));
        for (int i : ordre) {
            long p = copie.get(i).prix(base);
            if (fractions[i] > 0 && p <= reste) {
                copie.get(i).qteAjustee++;
                reste -= p;
            }
        }
        for (Ligne c : copie) {
            r.valeurObtenue += c.qteAjustee * c.prix(base);
            r.qteAjustee += c.qteAjustee;
            if (c.qteAjustee > 0) {
                r.lignesValorisees++;
            }
        }
        return r;
    }

    /* ------------------------------------------------------------------------------------------------ import */

    /** Lecture d'un fichier importe : lignes reconnues et motif des lignes ignorees. */
    public static final class Import {
        public List<Ligne> lignes = new ArrayList<>();
        public int ignorees;
        public String message;
        public String colonnes;
    }

    private static final String[][] TITRES = {
            { "cip", "code cip", "code", "cip7", "code produit", "ean", "code barre", "reference" },
            { "designation", "libelle", "produit", "nom", "article", "nom produit" },
            { "quantite", "qte", "qty", "stock", "quantite en stock", "stock reel", "qte stock" },
            { "prix achat", "pa", "paf", "prix d achat", "prix achat ht", "pa ht", "cout" },
            { "prix vente", "pv", "prix de vente", "pu", "prix public", "prix unitaire", "prix", "pv ttc" } };

    private static int colonne(Tableau t, String[] titres) {
        for (String titre : titres) {
            String n = Correspondance.normaliser(titre);
            for (int i = 0; i < t.getColonnes().size(); i++) {
                if (Correspondance.normaliser(t.getColonnes().get(i)).equals(n)) {
                    return i;
                }
            }
        }
        return -1;
    }

    /** Nombre ecrit a la francaise ou non (« 1 250 », « 1.250,50 », « 1250.5 ») ; null si illisible. */
    static Long nombre(String v) {
        String s = StringUtils.trimToEmpty(v).replace(" ", "").replace(" ", "").replace(" ", "");
        if (s.isEmpty()) {
            return null;
        }
        if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) {
            s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(".", "").replace(',', '.') : s.replace(",", "");
        } else if (s.indexOf(',') >= 0) {
            s = s.replace(',', '.');
        }
        try {
            return new BigDecimal(s).setScale(0, BigDecimal.ROUND_HALF_UP).longValueExact();
        } catch (ArithmeticException | NumberFormatException e) {
            return null;
        }
    }

    /**
     * Lignes d'un fichier importe : colonnes reconnues par leur titre (CIP, designation, quantite, prix d'achat, prix
     * de vente). Il faut la quantite, une designation ou un CIP, et au moins un des deux prix.
     */
    public static Import lire(Tableau t) {
        Import im = new Import();
        int cip = colonne(t, TITRES[0]), des = colonne(t, TITRES[1]), qte = colonne(t, TITRES[2]),
                pa = colonne(t, TITRES[3]), pv = colonne(t, TITRES[4]);
        if (qte < 0 || (cip < 0 && des < 0) || (pa < 0 && pv < 0)) {
            im.message = "Colonnes attendues : CIP ou Désignation, Quantité, Prix achat et/ou Prix vente (titres en "
                    + "première ligne).";
            return im;
        }
        im.colonnes = (cip >= 0 ? "CIP : « " + t.getColonnes().get(cip) + " » · " : "")
                + (des >= 0 ? "Désignation : « " + t.getColonnes().get(des) + " » · " : "") + "Quantité : « "
                + t.getColonnes().get(qte) + " »"
                + (pa >= 0 ? " · Prix achat : « " + t.getColonnes().get(pa) + " »" : "")
                + (pv >= 0 ? " · Prix vente : « " + t.getColonnes().get(pv) + " »" : "");
        for (List<String> l : t.getLignes()) {
            String c = cip >= 0 ? StringUtils.trimToEmpty(l.get(cip)) : "";
            String d = des >= 0 ? StringUtils.trimToEmpty(l.get(des)) : "";
            Long q = nombre(l.get(qte));
            Long a = pa >= 0 ? nombre(l.get(pa)) : null;
            Long v = pv >= 0 ? nombre(l.get(pv)) : null;
            if (c.isEmpty() && d.isEmpty() && q == null && a == null && v == null) {
                continue;
            }
            if ((c.isEmpty() && d.isEmpty()) || q == null || q < 0 || (a == null && v == null) || (a != null && a < 0)
                    || (v != null && v < 0)) {
                im.ignorees++;
                continue;
            }
            if (im.lignes.size() >= MAX_LIGNES) {
                im.ignorees++;
                continue;
            }
            im.lignes.add(new Ligne(StringUtils.left(c, 40), StringUtils.left(d, 200), q, a == null ? 0 : a,
                    v == null ? 0 : v));
        }
        if (im.lignes.isEmpty()) {
            im.message = "Aucune ligne exploitable dans le fichier.";
        }
        return im;
    }
}
