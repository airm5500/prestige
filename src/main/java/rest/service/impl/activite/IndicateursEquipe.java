package rest.service.impl.activite;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;

/**
 * Plan du 09/11, point 10 : sept indicateurs d'equipe, calcules par employe sur la periode.
 * <ul>
 * <li>REMISES (par caissiere) : ventes, ventes remisees, CA, remises ; taux de remise = remises / CA ;</li>
 * <li>MODIFS_ECARTS : ventes modifiees par l'employe (nombre, montant deplace = somme |apres - avant|) ; caisses
 * fermees billetees, en manquant (ecart = billetage - attendu &lt; 0), montant manquant, surplus (meme regle que
 * l'analyse des ecarts de caisse, tolerance 0) ;</li>
 * <li>PANIER (par caissiere) : panier moyen = CA / ventes, lignes et produits par vente ;</li>
 * <li>CONSEIL : ventes encaissees avec un conseil / ventes encaissees (taux de conseil) ; conseils donnes et CA
 * conseille ; au total, panier moyen avec et sans conseil ;</li>
 * <li>ATTENTE (par caissiere, preventes : vendeur different) : attente = encaissement - derniere ligne saisie par le
 * vendeur ; mediane sur les attentes de 0 a 1 h, part des attentes de plus de 5 min ;</li>
 * <li>AVOIRS (par caissiere) : ventes avec avoir (vente en avoir ou ligne avec produit du), lignes en avoir, taux ;
 * retours de produits = modifications de type PRODUITS faites par l'employe ;</li>
 * <li>PRESENCE : temps connecte (sessions fusionnees, bornees a la periode ; session ouverte : jusqu'a maintenant, 12 h
 * au plus) ; ventes et CA encaisses par heure de presence.</li>
 * </ul>
 * Les taux sont arrondis au dixieme et absents sans denominateur ; les nombres ne sont jamais negatifs, sauf le montant
 * manquant (negatif = manquant).
 */
public final class IndicateursEquipe {

    public static final String[] CODES = { "REMISES", "MODIFS_ECARTS", "PANIER", "CONSEIL", "ATTENTE", "AVOIRS",
            "PRESENCE" };
    static final long ATTENTE_MAX = 3600;
    static final long ATTENTE_LONGUE = 300;
    static final long SESSION_OUVERTE_MAX = 12 * 3600;

    private IndicateursEquipe() {
    }

    /** Une vente encaissee de la periode (memes regles que le reste de l'ecran). */
    public static final class Vente {
        final String caissier, vendeur, conseil;
        final long prix, remise, quantites;
        final int lignes, lignesAvoir;
        final boolean avoir;
        /** secondes de la derniere ligne a l'encaissement ; null si inconnu */
        final Long attente;

        public Vente(String caissier, String vendeur, String conseil, long prix, long remise, int lignes,
                long quantites, boolean avoir, int lignesAvoir, Long attente) {
            this.caissier = caissier;
            this.vendeur = vendeur;
            this.conseil = conseil;
            this.prix = Math.max(0, prix);
            this.remise = Math.max(0, remise);
            this.lignes = Math.max(0, lignes);
            this.quantites = Math.max(0, quantites);
            this.avoir = avoir;
            this.lignesAvoir = Math.max(0, lignesAvoir);
            this.attente = attente;
        }

        boolean prevente() {
            return !vide(vendeur) && !vide(caissier) && !vendeur.equals(caissier);
        }

        boolean avecAvoir() {
            return avoir || lignesAvoir > 0;
        }
    }

    /** Une vente modifiee (vente_modifiee). */
    public static final class Modification {
        final String user, type;
        final long avant, apres;

        public Modification(String user, String type, long avant, long apres) {
            this.user = user;
            this.type = type;
            this.avant = avant;
            this.apres = apres;
        }
    }

    /** Une caisse fermee : attendu (solde du soir) et billetage (null : non billetee). */
    public static final class Caisse {
        final String user;
        final long attendu;
        final Long billetage;

        public Caisse(String user, long attendu, Long billetage) {
            this.user = user;
            this.attendu = attendu;
            this.billetage = billetage;
        }
    }

    /** Une session de connexion. */
    public static final class Session {
        final String user;
        final LocalDateTime debut, fin;

        public Session(String user, LocalDateTime debut, LocalDateTime fin) {
            this.user = user;
            this.debut = debut;
            this.fin = fin;
        }
    }

    static boolean vide(String s) {
        return s == null || s.trim().isEmpty();
    }

    static Double taux(long n, long sur) {
        return AnnulationsAuteurs.taux(n, sur);
    }

    static Double ratio(long n, long sur) {
        return sur <= 0 ? null : AgregatsActivite.arrondi((double) n / sur);
    }

    static Long moyenne(long n, long sur) {
        return sur <= 0 ? null : Math.round((double) n / sur);
    }

    static Double mediane(List<Long> l) {
        if (l.isEmpty()) {
            return null;
        }
        List<Long> d = new ArrayList<>(l);
        d.sort(null);
        int n = d.size();
        double m = n % 2 == 1 ? d.get(n / 2) : (d.get(n / 2 - 1) + d.get(n / 2)) / 2.0;
        return AgregatsActivite.arrondi(m);
    }

    /** Lignes par employe : creees a la demande, dans l'ordre d'arrivee. */
    private static final class Lignes {
        final Map<String, Map<String, Object>> m = new LinkedHashMap<>();
        final Map<String, String> noms;
        final Function<String, Map<String, Object>> zero;

        Lignes(Map<String, String> noms, Function<String, Map<String, Object>> zero) {
            this.noms = noms;
            this.zero = zero;
        }

        Map<String, Object> de(String id) {
            return m.computeIfAbsent(id, k -> {
                Map<String, Object> x = new LinkedHashMap<>();
                x.put("id", k);
                x.put("nom", noms.getOrDefault(k, "?"));
                x.putAll(zero.apply(k));
                return x;
            });
        }
    }

    static long l(Map<String, Object> x, String k) {
        Object o = x.get(k);
        return o instanceof Number ? ((Number) o).longValue() : 0;
    }

    static void ajouter(Map<String, Object> x, String k, long v) {
        x.put(k, l(x, k) + v);
    }

    private static Map<String, Object> zeros(String... cles) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (String c : cles) {
            m.put(c, 0L);
        }
        return m;
    }

    /** Bloc d'un indicateur : lignes filtrees (employe), triees, et total recalcule sur les lignes gardees. */
    private static Map<String, Object> bloc(Collection<Map<String, Object>> lignes, String employeId,
            Comparator<Map<String, Object>> tri, String[] sommes,
            java.util.function.Consumer<Map<String, Object>> taux) {
        List<Map<String, Object>> l = new ArrayList<>();
        for (Map<String, Object> x : lignes) {
            if (vide(employeId) || employeId.equals(x.get("id"))) {
                taux.accept(x);
                l.add(x);
            }
        }
        l.sort(tri.thenComparing(x -> String.valueOf(x.get("nom"))));
        Map<String, Object> total = new LinkedHashMap<>();
        for (String s : sommes) {
            long v = 0;
            for (Map<String, Object> x : l) {
                v += l(x, s);
            }
            total.put(s, v);
        }
        taux.accept(total);
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("lignes", l);
        b.put("total", total);
        return b;
    }

    private static Comparator<Map<String, Object>> decroissant(String k) {
        return Comparator.comparingLong((Map<String, Object> x) -> l(x, k)).reversed();
    }

    public static Map<String, Object> calculer(List<Vente> ventes, List<Modification> modifs, List<Caisse> caisses,
            List<Session> sessions, LocalDateTime de, LocalDateTime a, LocalDateTime maintenant,
            Map<String, String> noms, String employeId) {
        String emp = vide(employeId) || "ALL".equalsIgnoreCase(employeId.trim()) ? null : employeId.trim();
        Map<String, Object> r = new LinkedHashMap<>();

        /* REMISES, PANIER, AVOIRS, ATTENTE : par caissiere */
        Lignes rem = new Lignes(noms, k -> zeros("ventes", "ventesRemisees", "ca", "remise"));
        Lignes pan = new Lignes(noms, k -> zeros("ventes", "ca", "lignes", "quantites"));
        Lignes avo = new Lignes(noms, k -> zeros("ventes", "ventesAvoir", "lignesAvoir", "retoursProduits"));
        Lignes att = new Lignes(noms, k -> zeros("preventes", "mesurees", "longues"));
        Map<String, List<Long>> attentes = new HashMap<>();
        Lignes con = new Lignes(noms, k -> zeros("ventes", "ventesConseillees", "conseils", "caConseille"));
        long caAvec = 0, nAvec = 0, caSans = 0, nSans = 0;
        for (Vente v : ventes) {
            if (vide(v.caissier)) {
                continue;
            }
            Map<String, Object> x = rem.de(v.caissier);
            ajouter(x, "ventes", 1);
            ajouter(x, "ca", v.prix);
            ajouter(x, "remise", v.remise);
            if (v.remise > 0) {
                ajouter(x, "ventesRemisees", 1);
            }
            Map<String, Object> p = pan.de(v.caissier);
            ajouter(p, "ventes", 1);
            ajouter(p, "ca", v.prix);
            ajouter(p, "lignes", v.lignes);
            ajouter(p, "quantites", v.quantites);
            Map<String, Object> av = avo.de(v.caissier);
            ajouter(av, "ventes", 1);
            if (v.avecAvoir()) {
                ajouter(av, "ventesAvoir", 1);
            }
            ajouter(av, "lignesAvoir", v.lignesAvoir);
            if (v.prevente()) {
                Map<String, Object> t = att.de(v.caissier);
                ajouter(t, "preventes", 1);
                if (v.attente != null && v.attente >= 0 && v.attente <= ATTENTE_MAX) {
                    ajouter(t, "mesurees", 1);
                    attentes.computeIfAbsent(v.caissier, k -> new ArrayList<>()).add(v.attente);
                    if (v.attente > ATTENTE_LONGUE) {
                        ajouter(t, "longues", 1);
                    }
                }
            }
            Map<String, Object> c = con.de(v.caissier);
            ajouter(c, "ventes", 1);
            boolean conseillee = !vide(v.conseil);
            if (conseillee) {
                ajouter(c, "ventesConseillees", 1);
                Map<String, Object> cc = con.de(v.conseil.trim());
                ajouter(cc, "conseils", 1);
                ajouter(cc, "caConseille", v.prix);
            }
            if (emp == null || emp.equals(v.caissier)) {
                if (conseillee) {
                    caAvec += v.prix;
                    nAvec++;
                } else {
                    caSans += v.prix;
                    nSans++;
                }
            }
        }

        /* modifications et ecarts de caisse */
        Lignes mod = new Lignes(noms, k -> zeros("modifications", "montantModifie", "caisses", "sansBilletage",
                "manquants", "montantManquant", "surplus", "montantSurplus"));
        for (Modification m : modifs) {
            if (vide(m.user)) {
                continue;
            }
            Map<String, Object> x = mod.de(m.user);
            ajouter(x, "modifications", 1);
            ajouter(x, "montantModifie", Math.abs(m.apres - m.avant));
            if ("PRODUITS".equalsIgnoreCase(m.type == null ? "" : m.type.trim())) {
                ajouter(avo.de(m.user), "retoursProduits", 1);
            }
        }
        for (Caisse c : caisses) {
            if (vide(c.user)) {
                continue;
            }
            Map<String, Object> x = mod.de(c.user);
            if (c.billetage == null) {
                ajouter(x, "sansBilletage", 1);
                continue;
            }
            ajouter(x, "caisses", 1);
            long ecart = c.billetage - c.attendu;
            if (ecart < 0) {
                ajouter(x, "manquants", 1);
                ajouter(x, "montantManquant", ecart);
            } else if (ecart > 0) {
                ajouter(x, "surplus", 1);
                ajouter(x, "montantSurplus", ecart);
            }
        }

        /* presence */
        Lignes pre = new Lignes(noms, k -> zeros("secondes", "ventes", "ca"));
        Map<String, List<LocalDateTime[]>> plages = new TreeMap<>();
        for (Session s : sessions) {
            if (vide(s.user) || s.debut == null) {
                continue;
            }
            LocalDateTime f = s.fin;
            if (f == null) {
                LocalDateTime borne = s.debut.plusSeconds(SESSION_OUVERTE_MAX);
                f = maintenant == null || maintenant.isAfter(borne) ? borne : maintenant;
            }
            LocalDateTime d0 = s.debut.isBefore(de) ? de : s.debut;
            LocalDateTime f0 = f.isAfter(a) ? a : f;
            if (f0.isAfter(d0)) {
                plages.computeIfAbsent(s.user, k -> new ArrayList<>()).add(new LocalDateTime[] { d0, f0 });
            }
        }
        for (Map.Entry<String, List<LocalDateTime[]>> e : plages.entrySet()) {
            ajouter(pre.de(e.getKey()), "secondes", fusionner(e.getValue()));
        }
        for (Vente v : ventes) {
            if (!vide(v.caissier)) {
                Map<String, Object> x = pre.de(v.caissier);
                ajouter(x, "ventes", 1);
                ajouter(x, "ca", v.prix);
            }
        }

        r.put("REMISES", bloc(rem.m.values(), emp, decroissant("remise"),
                new String[] { "ventes", "ventesRemisees", "ca", "remise" }, x -> {
                    x.put("tauxRemise", taux(l(x, "remise"), l(x, "ca")));
                    x.put("partRemisees", taux(l(x, "ventesRemisees"), l(x, "ventes")));
                }));
        r.put("MODIFS_ECARTS",
                bloc(mod.m.values(), emp,
                        Comparator.comparingLong((Map<String, Object> x) -> l(x, "montantManquant"))
                                .thenComparing(decroissant("modifications")),
                        new String[] { "modifications", "montantModifie", "caisses", "sansBilletage", "manquants",
                                "montantManquant", "surplus", "montantSurplus" },
                        x -> x.put("recurrence", taux(l(x, "manquants"), l(x, "caisses")))));
        r.put("PANIER", bloc(pan.m.values(), emp, decroissant("ca"),
                new String[] { "ventes", "ca", "lignes", "quantites" }, x -> {
                    x.put("panierMoyen", moyenne(l(x, "ca"), l(x, "ventes")));
                    x.put("lignesParVente", ratio(l(x, "lignes"), l(x, "ventes")));
                    x.put("produitsParVente", ratio(l(x, "quantites"), l(x, "ventes")));
                }));
        Map<String, Object> bc = bloc(con.m.values(), emp, decroissant("conseils").thenComparing(decroissant("ventes")),
                new String[] { "ventes", "ventesConseillees", "conseils", "caConseille" }, x -> {
                    x.put("tauxConseil", taux(l(x, "ventesConseillees"), l(x, "ventes")));
                    x.put("panierConseille", moyenne(l(x, "caConseille"), l(x, "conseils")));
                });
        @SuppressWarnings("unchecked")
        Map<String, Object> tc = (Map<String, Object>) bc.get("total");
        tc.put("panierAvecConseil", moyenne(caAvec, nAvec));
        tc.put("panierSansConseil", moyenne(caSans, nSans));
        r.put("CONSEIL", bc);
        Map<String, Object> ba = bloc(att.m.values(), emp, decroissant("preventes"),
                new String[] { "preventes", "mesurees", "longues" }, x -> {
                    if (x.containsKey("id")) {
                        x.put("attenteMediane", mediane(attentes.getOrDefault(x.get("id"), new ArrayList<>())));
                    }
                    x.put("partLongues", taux(l(x, "longues"), l(x, "mesurees")));
                });
        List<Long> toutes = new ArrayList<>();
        for (Map.Entry<String, List<Long>> e : attentes.entrySet()) {
            if (emp == null || emp.equals(e.getKey())) {
                toutes.addAll(e.getValue());
            }
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> ta = (Map<String, Object>) ba.get("total");
        ta.put("attenteMediane", mediane(toutes));
        r.put("ATTENTE", ba);
        r.put("AVOIRS",
                bloc(avo.m.values(), emp, decroissant("ventesAvoir").thenComparing(decroissant("retoursProduits")),
                        new String[] { "ventes", "ventesAvoir", "lignesAvoir", "retoursProduits" },
                        x -> x.put("tauxAvoir", taux(l(x, "ventesAvoir"), l(x, "ventes")))));
        r.put("PRESENCE",
                bloc(pre.m.values(), emp, decroissant("secondes"), new String[] { "secondes", "ventes", "ca" }, x -> {
                    long s = l(x, "secondes");
                    x.put("heures", s <= 0 ? null : AgregatsActivite.arrondi(s / 3600.0));
                    x.put("ventesParHeure", s <= 0 ? null : AgregatsActivite.arrondi(l(x, "ventes") * 3600.0 / s));
                    x.put("caParHeure", s <= 0 ? null : Math.round(l(x, "ca") * 3600.0 / s));
                }));
        return r;
    }

    /** Duree totale (secondes) de plages fusionnees : un chevauchement ne compte qu'une fois. */
    static long fusionner(List<LocalDateTime[]> plages) {
        List<LocalDateTime[]> l = new ArrayList<>(plages);
        l.sort(Comparator.comparing(x -> x[0]));
        long total = 0;
        LocalDateTime d = null, f = null;
        for (LocalDateTime[] p : l) {
            if (f == null || p[0].isAfter(f)) {
                if (f != null) {
                    total += Duration.between(d, f).getSeconds();
                }
                d = p[0];
                f = p[1];
            } else if (p[1].isAfter(f)) {
                f = p[1];
            }
        }
        if (f != null) {
            total += Duration.between(d, f).getSeconds();
        }
        return total;
    }
}
