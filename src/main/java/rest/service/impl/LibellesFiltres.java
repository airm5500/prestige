package rest.service.impl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import util.FiltreListe;

/**
 * Noms des rayons, familles et grossistes coches dans le filtre multiple (13/10), pour les titres des impressions : «
 * Rayons : SIROPS, ANTIPALUDIQUES - Familles : GENERIQUES ». Lecture seule.
 */
@Stateless
public class LibellesFiltres {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static final String[][] AXES = {
            { "Rayon", "Rayons",
                    "SELECT lg_ZONE_GEO_ID, str_LIBELLEE FROM t_zone_geographique WHERE lg_ZONE_GEO_ID IN " },
            { "Famille", "Familles",
                    "SELECT lg_FAMILLEARTICLE_ID, str_LIBELLE FROM t_famillearticle WHERE lg_FAMILLEARTICLE_ID IN " },
            { "Grossiste", "Grossistes",
                    "SELECT lg_GROSSISTE_ID, str_LIBELLE FROM t_grossiste WHERE lg_GROSSISTE_ID IN " } };

    /** Noms dans l'ordre coche ; un identifiant inconnu garde son identifiant. */
    public List<String> noms(int axe, String brut) {
        List<String> ids = FiltreListe.valeurs(brut);
        List<String> noms = new ArrayList<>();
        if (ids.isEmpty()) {
            return noms;
        }
        StringBuilder in = new StringBuilder("(");
        for (int i = 0; i < ids.size(); i++) {
            in.append(i == 0 ? "" : ",").append('?').append(i + 1);
        }
        javax.persistence.Query q = em.createNativeQuery(AXES[axe][2] + in.append(')'));
        for (int i = 0; i < ids.size(); i++) {
            q.setParameter(i + 1, ids.get(i));
        }
        Map<String, String> parId = new LinkedHashMap<>();
        for (Object o : q.getResultList()) {
            Object[] r = (Object[]) o;
            parId.put(String.valueOf(r[0]), r[1] == null ? "" : String.valueOf(r[1]).trim());
        }
        for (String id : ids) {
            noms.add(parId.getOrDefault(id, id));
        }
        return noms;
    }

    /** « - Rayons : A, B - Familles : C - Grossiste : D » (vide si aucun filtre). */
    public String resume(String rayons, String familles, String grossistes) {
        String[] valeurs = { rayons, familles, grossistes };
        StringBuilder sb = new StringBuilder();
        for (int a = 0; a < AXES.length; a++) {
            List<String> n = noms(a, valeurs[a]);
            if (!n.isEmpty()) {
                sb.append(" - ").append(n.size() > 1 ? AXES[a][1] : AXES[a][0]).append(" : ")
                        .append(String.join(", ", n));
            }
        }
        return sb.toString();
    }
}
