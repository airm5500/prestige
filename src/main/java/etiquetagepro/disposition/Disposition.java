package etiquetagepro.disposition;

import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.pdf.LabelSheetPdf;

/**
 * Disposition d'une etiquette pour un type de code et une dimension (« DataMatrix 38 x 21,2 mm ») : ou se trouve chaque
 * information, a quelle taille, et ce qui est imprime ou mis dans le code (codes etendus). Les cotes sont en
 * millimetres depuis le coin haut-gauche de l'etiquette.
 * <p>
 * Sans disposition enregistree, les etiquettes existantes (code-barres, QR, DataMatrix) gardent exactement leur dessin
 * d'avant ; seuls les codes etendus, qui n'ont pas de dessin historique, prennent la disposition proposee.
 */
public final class Disposition {

    /** Marge interieure (mm) : aucun element ne s'approche plus du bord. */
    public static final float MARGE = 1f;
    private static final float PT_EN_MM = 25.4f / 72f;

    /** Hauteur d'une ligne de texte (mm) pour une police (pt). */
    public static float hauteurLigne(float police) {
        return police * PT_EN_MM * 1.15f;
    }

    private final String typeCode;
    private final float largeur, hauteur;
    private final List<Placement> placements = new ArrayList<>();

    public Disposition(String typeCode, float largeur, float hauteur) {
        this.typeCode = typeCode;
        this.largeur = arrondiDixieme(largeur);
        this.hauteur = arrondiDixieme(hauteur);
    }

    public static float arrondiDixieme(float v) {
        return Math.round(v * 10f) / 10f;
    }

    public String getTypeCode() {
        return typeCode;
    }

    public float getLargeur() {
        return largeur;
    }

    public float getHauteur() {
        return hauteur;
    }

    public List<Placement> getPlacements() {
        return Collections.unmodifiableList(placements);
    }

    public Placement placement(ElementEtiquette e) {
        for (Placement p : placements) {
            if (p.getElement() == e) {
                return p;
            }
        }
        return null;
    }

    public Disposition ajouter(Placement p) {
        placements.removeIf(x -> x.getElement() == p.getElement());
        placements.add(p);
        return this;
    }

    /** Vrai pour les codes etendus (DataMatrix+, QR+) : des informations peuvent aller dans le code. */
    public boolean estEtendu() {
        return LabelSheetPdf.QR_PLUS.equals(typeCode) || LabelSheetPdf.DATAMATRIX_PLUS.equals(typeCode);
    }

    public boolean estDeuxD() {
        return !LabelSheetPdf.CODE_BARRES.equals(typeCode);
    }

    /** Cle d'enregistrement : type et dimension au dixieme de millimetre. */
    public String cle() {
        return cle(typeCode, largeur, hauteur);
    }

    public static String cle(String type, float l, float h) {
        return type + "|" + String.format(Locale.ROOT, "%.1f", arrondiDixieme(l)) + "x"
                + String.format(Locale.ROOT, "%.1f", arrondiDixieme(h));
    }

    public JSONObject json() {
        JSONArray a = new JSONArray();
        for (Placement p : placements) {
            a.put(p.json());
        }
        return new JSONObject().put("version", 1).put("typeCode", typeCode).put("largeur", largeur)
                .put("hauteur", hauteur).put("elements", a);
    }

    /** Disposition lue du JSON (elements inconnus ignores, elements manquants ajoutes non imprimes). */
    public static Disposition lire(JSONObject o) {
        Disposition d = new Disposition(o.optString("typeCode", LabelSheetPdf.CODE_BARRES),
                (float) o.optDouble("largeur", 38), (float) o.optDouble("hauteur", 21.2));
        JSONArray a = o.optJSONArray("elements");
        for (int i = 0; a != null && i < a.length(); i++) {
            Placement p = Placement.lire(a.getJSONObject(i));
            if (p != null) {
                d.ajouter(p);
            }
        }
        Disposition defaut = parDefaut(d.typeCode, d.largeur, d.hauteur);
        for (Placement p : defaut.placements) {
            if (d.placement(p.getElement()) == null) {
                d.ajouter(p.copie().imprime(false).dansLeCode(false));
            }
        }
        if (d.estDeuxD() && d.placement(ElementEtiquette.CODE) != null) {
            /* code 2D : toujours carre */
            Placement c = d.placement(ElementEtiquette.CODE);
            float cote = Math.min(c.getL(), c.getH());
            c.cadre(c.getX(), c.getY(), cote, cote);
        }
        return d;
    }

    /**
     * Disposition proposee pour ce type et cette dimension. 2D : nom de la pharmacie en haut, designation dessous (deux
     * lignes), le code a droite le plus grand possible, a gauche CIP, prix, code geo, grossiste, code de l'etiquette.
     * Code-barres : la disposition historique (pharmacie, grossiste et date, designation, code, CIP et prix en bas). Ce
     * qui ne tient pas a une police lisible n'est pas imprime (cochable ensuite).
     */
    public static Disposition parDefaut(String type, float largeur, float hauteur) {
        Disposition d = new Disposition(type, largeur, hauteur);
        float w = d.largeur, h = d.hauteur, m = MARGE, ecart = 0.2f, pleine = w - 2 * m;
        boolean petite = h <= 25f;
        if (!d.estDeuxD()) {
            float y = m;
            d.ajouter(new Placement(ElementEtiquette.PHARMACIE, m, y, pleine, hauteurLigne(5.5f), 5.5f));
            y += hauteurLigne(5.5f) + ecart;
            d.ajouter(new Placement(ElementEtiquette.GROSSISTE, m, y, pleine / 2f - 0.5f, hauteurLigne(6f), 6f)
                    .alignement(Placement.DROITE));
            d.ajouter(new Placement(ElementEtiquette.DATE, m + pleine / 2f + 0.5f, y, pleine / 2f - 0.5f,
                    hauteurLigne(6f), 6f).alignement(Placement.GAUCHE));
            y += hauteurLigne(6f) + ecart;
            d.ajouter(new Placement(ElementEtiquette.DESIGNATION, m, y, pleine, hauteurLigne(5.5f), 5.5f));
            y += hauteurLigne(5.5f) + ecart;
            float bas = hauteurLigne(7.5f);
            d.ajouter(new Placement(ElementEtiquette.CODE, m, y, pleine, Math.max(2f, h - m - bas - ecart - y), 0f));
            d.ajouter(new Placement(ElementEtiquette.CIP, m + 1.5f, h - m - bas, pleine / 2f - 2f, bas, 7f)
                    .alignement(Placement.GAUCHE));
            d.ajouter(new Placement(ElementEtiquette.PRIX, m + pleine / 2f + 0.5f, h - m - bas, pleine / 2f - 2f, bas,
                    7.5f).alignement(Placement.DROITE));
            d.ajouter(new Placement(ElementEtiquette.CODE_GEO, m, m, pleine / 3f, hauteurLigne(6f), 6f).imprime(false));
        } else {
            float y = m;
            float pPh = petite ? 6f : 6.5f, pDes = petite ? 5.5f : 6f;
            d.ajouter(new Placement(ElementEtiquette.PHARMACIE, m, y, pleine, hauteurLigne(pPh), pPh));
            y += hauteurLigne(pPh) + ecart;
            d.ajouter(new Placement(ElementEtiquette.DESIGNATION, m, y, pleine, 2 * hauteurLigne(pDes), pDes));
            y += 2 * hauteurLigne(pDes) + ecart;
            float zone = h - m - y;
            float cote = Math.max(4f, Math.min(zone, pleine * 0.5f));
            float xCode = w - m - cote;
            d.ajouter(new Placement(ElementEtiquette.CODE, xCode, y + (zone - cote) / 2f, cote, cote, 0f));
            float colonne = xCode - 0.6f - m;
            /* colonne de gauche : on reduit les polices (pas sous le minimum) puis on retire ce qui ne tient pas */
            /* retours du 11/10 : la date d'edition est tres importante, elle reste toujours (jamais retiree) */
            ElementEtiquette[] ordre = { ElementEtiquette.CIP, ElementEtiquette.PRIX, ElementEtiquette.DATE,
                    ElementEtiquette.CODE_GEO, ElementEtiquette.GROSSISTE, ElementEtiquette.CODE_UNIQUE };
            Map<ElementEtiquette, Float> polices = new EnumMap<>(ElementEtiquette.class);
            for (ElementEtiquette e : ordre) {
                polices.put(e, e == ElementEtiquette.PRIX && petite ? 8.5f : e.getPoliceDefaut());
            }
            List<ElementEtiquette> gardes = new ArrayList<>(java.util.Arrays.asList(ordre));
            for (int essai = 0; essai < 12 && total(gardes, polices) > zone; essai++) {
                for (ElementEtiquette e : gardes) {
                    polices.put(e, Math.max(5f, polices.get(e) - 0.5f));
                }
            }
            for (ElementEtiquette retire : new ElementEtiquette[] { ElementEtiquette.GROSSISTE,
                    ElementEtiquette.CODE_UNIQUE, ElementEtiquette.CODE_GEO }) {
                if (total(gardes, polices) > zone) {
                    gardes.remove(retire);
                }
            }
            float yc = y + Math.max(0f, (zone - total(gardes, polices)) / 2f);
            for (ElementEtiquette e : ordre) {
                float p = polices.get(e);
                Placement pl = new Placement(e, m, yc, colonne, hauteurLigne(p), p).alignement(Placement.GAUCHE);
                if (gardes.contains(e)) {
                    yc += hauteurLigne(p) + 0.1f;
                } else {
                    pl.imprime(false).cadre(m, y, colonne, hauteurLigne(p));
                }
                d.ajouter(pl);
            }
        }
        /* informations disponibles, non imprimees par defaut */
        for (ElementEtiquette e : new ElementEtiquette[] { ElementEtiquette.LOT, ElementEtiquette.PEREMPTION,
                ElementEtiquette.CODE_UNIQUE, ElementEtiquette.CODE_GEO, ElementEtiquette.GROSSISTE,
                ElementEtiquette.DATE, ElementEtiquette.MENTION }) {
            if (d.placement(e) == null) {
                d.ajouter(new Placement(e, m, m, Math.min(pleine, 15f), hauteurLigne(e.getPoliceDefaut()),
                        e.getPoliceDefaut()).alignement(Placement.GAUCHE).imprime(false));
            }
        }
        if (d.estEtendu()) {
            /* contenu par defaut des codes etendus : designation, prix, pharmacie, code geo */
            for (ElementEtiquette e : new ElementEtiquette[] { ElementEtiquette.DESIGNATION, ElementEtiquette.PRIX,
                    ElementEtiquette.PHARMACIE, ElementEtiquette.CODE_GEO }) {
                d.placement(e).dansLeCode(true);
            }
            /*
             * petite etiquette : si le code n'est plus lisible avec tout cela, on retire du code le code geo, puis la
             * pharmacie, puis le prix, en dernier la designation (le CIP, le lot et la peremption restent toujours) ;
             * l'utilisateur peut les recocher sur une etiquette plus grande
             */
            for (ElementEtiquette e : new ElementEtiquette[] { ElementEtiquette.CODE_GEO, ElementEtiquette.PHARMACIE,
                    ElementEtiquette.PRIX, ElementEtiquette.DESIGNATION }) {
                if (codeLisible(d)) {
                    break;
                }
                d.placement(e).dansLeCode(false);
            }
        }
        return d;
    }

    private static boolean codeLisible(Disposition d) {
        for (ControleDisposition.Probleme p : ControleDisposition.controler(d).problemes) {
            if (p.bloquant && p.element == ElementEtiquette.CODE) {
                return false;
            }
        }
        return true;
    }

    private static float total(List<ElementEtiquette> elements, Map<ElementEtiquette, Float> polices) {
        float t = 0f;
        for (ElementEtiquette e : elements) {
            t += hauteurLigne(polices.get(e)) + 0.1f;
        }
        return t;
    }

    /**
     * Meme disposition reportee sur une autre dimension (proportions gardees, polices reduites avec la plus petite
     * echelle, code 2D carre). A recontroler : une reduction peut rendre un element illisible.
     */
    public Disposition aLEchelle(float nouvelleLargeur, float nouvelleHauteur) {
        Disposition d = new Disposition(typeCode, nouvelleLargeur, nouvelleHauteur);
        float sx = d.largeur / largeur, sy = d.hauteur / hauteur, s = Math.min(sx, sy);
        for (Placement p : placements) {
            Placement c = p.copie();
            if (p.getElement() == ElementEtiquette.CODE && estDeuxD()) {
                float cote = Math.min(p.getL() * sx, p.getH() * sy);
                c.cadre(p.getX() * sx, p.getY() * sy, cote, cote);
            } else {
                c.cadre(p.getX() * sx, p.getY() * sy, p.getL() * sx, p.getH() * sy);
                c.police(p.getPolice() * s);
            }
            d.ajouter(c);
        }
        return d;
    }
}
