package etiquetagepro.disposition;

import org.json.JSONObject;

/**
 * Place d'un element sur l'etiquette, en millimetres depuis le coin haut-gauche (comme a l'ecran), avec sa police (pt),
 * son alignement, et s'il est imprime et/ou mis dans le code (codes etendus seulement).
 */
public final class Placement {

    public static final String GAUCHE = "G", CENTRE = "C", DROITE = "D";

    private final ElementEtiquette element;
    private float x, y, l, h;
    private float police;
    private String alignement = CENTRE;
    private boolean imprime = true;
    private boolean dansLeCode;

    public Placement(ElementEtiquette element, float x, float y, float l, float h, float police) {
        this.element = element;
        this.x = x;
        this.y = y;
        this.l = l;
        this.h = h;
        this.police = police;
    }

    public ElementEtiquette getElement() {
        return element;
    }

    public float getX() {
        return x;
    }

    public float getY() {
        return y;
    }

    public float getL() {
        return l;
    }

    public float getH() {
        return h;
    }

    public float getPolice() {
        return police;
    }

    public String getAlignement() {
        return alignement;
    }

    public boolean isImprime() {
        return imprime;
    }

    public boolean isDansLeCode() {
        return dansLeCode;
    }

    public Placement alignement(String a) {
        this.alignement = GAUCHE.equals(a) || DROITE.equals(a) ? a : CENTRE;
        return this;
    }

    public Placement imprime(boolean i) {
        this.imprime = element == ElementEtiquette.CODE || i;
        return this;
    }

    public Placement dansLeCode(boolean d) {
        this.dansLeCode = d && element.isPossibleDansLeCode();
        return this;
    }

    Placement cadre(float nx, float ny, float nl, float nh) {
        this.x = nx;
        this.y = ny;
        this.l = nl;
        this.h = nh;
        return this;
    }

    Placement police(float p) {
        this.police = p;
        return this;
    }

    Placement copie() {
        return new Placement(element, x, y, l, h, police).alignement(alignement).imprime(imprime)
                .dansLeCode(dansLeCode);
    }

    JSONObject json() {
        return new JSONObject().put("element", element.name()).put("x", arrondi(x)).put("y", arrondi(y))
                .put("l", arrondi(l)).put("h", arrondi(h)).put("police", arrondi(police)).put("alignement", alignement)
                .put("imprime", imprime).put("dansLeCode", dansLeCode);
    }

    static Placement lire(JSONObject o) {
        ElementEtiquette e = ElementEtiquette.de(o.optString("element", null));
        if (e == null) {
            return null;
        }
        return new Placement(e, (float) o.optDouble("x", 0), (float) o.optDouble("y", 0), (float) o.optDouble("l", 0),
                (float) o.optDouble("h", 0), (float) o.optDouble("police", e.getPoliceDefaut()))
                        .alignement(o.optString("alignement", CENTRE)).imprime(o.optBoolean("imprime", true))
                        .dansLeCode(o.optBoolean("dansLeCode", false));
    }

    static float arrondi(float v) {
        return Math.round(v * 100f) / 100f;
    }

    /** Rectangle occupe (mm) : le cadre, agrandi de la marge donnee de chaque cote. */
    float[] rectangle(float marge) {
        return new float[] { x - marge, y - marge, x + l + marge, y + h + marge };
    }
}
