package rest.service.impl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import rest.report.pdf.TableauPdf;

/**
 * Plan du 21/11, point 12 : liste des ecarts d'un inventaire, servie par l'API REST, avec le stock reserve lu au moment
 * de l'impression (reponse du 22/11). Memes lignes et memes totaux que l'ancienne edition (ws_generate_pdf.jsp, modeles
 * rp_fiche_inventaire_ecart_*) : produits inventories dont le compte differe du stock machine, regroupes par
 * emplacement, famille ou grossiste selon le type de l'inventaire ; « manquant » (ecart negatif) et « surplus » (ecart
 * positif), regroupes par famille. Totaux par groupe et total general : valeur comptee et valeur de l'ecart, au prix de
 * vente et au prix d'achat.
 *
 * <p>
 * Classe sans base : les lignes arrivent lues, les sections sortent formees ; regles verifiees par
 * EcartsInventaireCoherenceTest.
 */
public final class EcartsInventaire {

    private EcartsInventaire() {
    }

    /** Une ligne inventoriee, telle que lue en base. */
    public static final class Ligne {
        public String groupe, cip, designation;
        public long prixVente, prixAchat;
        public int machine, compte, reserve;

        public Ligne(String groupe, String cip, String designation, long prixVente, long prixAchat, int machine,
                int compte, int reserve) {
            this.groupe = groupe == null || groupe.trim().isEmpty() ? "Sans regroupement" : groupe.trim();
            this.cip = cip == null ? "" : cip;
            this.designation = designation == null ? "" : designation;
            this.prixVente = prixVente;
            this.prixAchat = prixAchat;
            this.machine = machine;
            this.compte = compte;
            this.reserve = reserve;
        }

        public int ecart() {
            return compte - machine;
        }
    }

    /** Totaux d'un groupe ou de toute l'edition. */
    public static final class Totaux {
        public int produits, ecart, reserve;
        public long compteVente, compteAchat, ecartVente, ecartAchat;

        void ajouter(Ligne l) {
            produits++;
            ecart += l.ecart();
            reserve += l.reserve;
            compteVente += l.prixVente * l.compte;
            compteAchat += l.prixAchat * l.compte;
            ecartVente += l.prixVente * l.ecart();
            ecartAchat += l.prixAchat * l.ecart();
        }
    }

    /** Filtre de l'ancienne edition : « manquant », « surplus », ou tous les ecarts. */
    public static boolean retenue(Ligne l, String filtre) {
        if ("manquant".equalsIgnoreCase(filtre)) {
            return l.ecart() < 0;
        }
        if ("surplus".equalsIgnoreCase(filtre)) {
            return l.ecart() > 0;
        }
        return l.ecart() != 0;
    }

    /** Lignes retenues, regroupees dans l'ordre d'arrivee (la requete trie par groupe puis designation). */
    public static Map<String, List<Ligne>> groupes(List<Ligne> lignes, String filtre) {
        Map<String, List<Ligne>> g = new LinkedHashMap<>();
        for (Ligne l : lignes) {
            if (retenue(l, filtre)) {
                g.computeIfAbsent(l.groupe, k -> new ArrayList<>()).add(l);
            }
        }
        return g;
    }

    public static Totaux totaux(List<Ligne> lignes) {
        Totaux t = new Totaux();
        for (Ligne l : lignes) {
            t.ajouter(l);
        }
        return t;
    }

    public static String[] entetes(boolean stock, boolean reserve) {
        List<String> e = new ArrayList<>(List.of("CIP", "Désignation", "Prix vente", "Prix achat"));
        if (stock) {
            e.add("Stock machine");
        }
        e.add("Stock compté");
        e.add("Écart");
        if (reserve) {
            e.add("Stock réserve");
        }
        e.add("Écart × prix vente");
        e.add("Écart × prix achat");
        return e.toArray(new String[0]);
    }

    private static String[] valeurs(String cip, String designation, String pv, String pa, String machine, String compte,
            String ecart, String reserve, String ev, String ea, boolean stock, boolean avecReserve) {
        List<String> v = new ArrayList<>(List.of(cip, designation, pv, pa));
        if (stock) {
            v.add(machine);
        }
        v.add(compte);
        v.add(ecart);
        if (avecReserve) {
            v.add(reserve);
        }
        v.add(ev);
        v.add(ea);
        return v.toArray(new String[0]);
    }

    private static float[] largeurs(boolean stock, boolean reserve) {
        List<Float> l = new ArrayList<>(List.of(8f, 26f, 7f, 7f));
        if (stock) {
            l.add(7f);
        }
        l.add(7f);
        l.add(6f);
        if (reserve) {
            l.add(7f);
        }
        l.add(9f);
        l.add(9f);
        float[] r = new float[l.size()];
        for (int i = 0; i < r.length; i++) {
            r[i] = l.get(i);
        }
        return r;
    }

    private static boolean[] droite(int n) {
        boolean[] d = new boolean[n];
        for (int i = 2; i < n; i++) {
            d[i] = true;
        }
        return d;
    }

    /** Nombre au format de l'officine : espace pour les milliers, signe moins devant. */
    public static String nombre(long v) {
        String s = String.valueOf(Math.abs(v));
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            if (i > 0 && (s.length() - i) % 3 == 0) {
                b.append(' ');
            }
            b.append(s.charAt(i));
        }
        return (v < 0 ? "-" : "") + b;
    }

    /**
     * Sections de l'edition : un tableau par groupe (ses lignes, puis sa ligne « Total »), puis le total general.
     */
    public static List<TableauPdf.Section> sections(List<Ligne> lignes, String filtre, boolean stock, boolean reserve) {
        List<TableauPdf.Section> sections = new ArrayList<>();
        String[] entetes = entetes(stock, reserve);
        float[] largeurs = largeurs(stock, reserve);
        Totaux general = new Totaux();
        for (Map.Entry<String, List<Ligne>> g : groupes(lignes, filtre).entrySet()) {
            TableauPdf.Section s = new TableauPdf.Section();
            s.titre = g.getKey();
            s.entetes = entetes;
            s.largeurs = largeurs;
            s.droite = droite(entetes.length);
            s.lignes = new ArrayList<>();
            for (Ligne l : g.getValue()) {
                general.ajouter(l);
                s.lignes.add(valeurs(l.cip, l.designation, nombre(l.prixVente), nombre(l.prixAchat),
                        String.valueOf(l.machine), String.valueOf(l.compte), String.valueOf(l.ecart()),
                        String.valueOf(l.reserve), nombre(l.prixVente * l.ecart()), nombre(l.prixAchat * l.ecart()),
                        stock, reserve));
            }
            Totaux t = totaux(g.getValue());
            s.lignes.add(valeurs("",
                    "Total " + g.getKey() + " (" + t.produits + " produit" + (t.produits > 1 ? "s" : "") + ")", "", "",
                    "", "", String.valueOf(t.ecart), String.valueOf(t.reserve), nombre(t.ecartVente),
                    nombre(t.ecartAchat), stock, reserve));
            sections.add(s);
        }
        TableauPdf.Section total = new TableauPdf.Section();
        total.titre = "Total général";
        total.entetes = new String[] { "Produits", "Écart", "Valeur comptée (prix vente)",
                "Valeur comptée (prix achat)", "Écart × prix vente", "Écart × prix achat" };
        total.largeurs = new float[] { 8f, 8f, 14f, 14f, 14f, 14f };
        total.droite = droite(total.entetes.length);
        total.droite[0] = true;
        total.droite[1] = true;
        total.lignes = new ArrayList<>();
        total.lignes.add(new String[] { String.valueOf(general.produits), String.valueOf(general.ecart),
                nombre(general.compteVente), nombre(general.compteAchat), nombre(general.ecartVente),
                nombre(general.ecartAchat) });
        sections.add(total);
        return sections;
    }

    /** Sous-titre : inventaire, filtre, options. */
    public static String sousTitre(String inventaire, String filtre, boolean stock, boolean reserve, String le) {
        String f = "manquant".equalsIgnoreCase(filtre) ? "Manquants (écart négatif)"
                : "surplus".equalsIgnoreCase(filtre) ? "Surplus (écart positif)" : "Tous les écarts";
        return (inventaire == null ? "" : inventaire) + " · " + f + (stock ? " · avec le stock machine" : "")
                + (reserve ? " · stock réserve au " + le : "");
    }
}
