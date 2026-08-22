package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Reponse rendue lorsqu'une vente est demandee en cloture alors qu'elle vient de l'etre.
 *
 * Le drapeau « copie » est lu par une requete native : selon le pilote et la version de MySQL, la colonne revient en
 * booleen, en entier ou en chaine. Le prendre pour vrai a tort relancerait l'annulation de la vente d'origine.
 *
 * @author koben
 */
public class ClotureVenteIdempotenceTest {

    @Test
    @DisplayName("une vente deja cloturee rend un succes portant sa reference")
    public void succesIdempotent() {
        JSONObject json = SalesServiceImpl.reponseVenteDejaCloturee(new JSONObject(), "vente-1", Boolean.FALSE);
        assertTrue(json.getBoolean("success"));
        assertEquals("vente-1", json.getString("ref"));
        assertFalse(json.getBoolean("copy"));
    }

    @Test
    @DisplayName("le drapeau copie est reconnu sous ses trois formes")
    public void copieReconnue() {
        assertTrue(SalesServiceImpl.estUneCopie(Boolean.TRUE));
        assertTrue(SalesServiceImpl.estUneCopie(1));
        assertTrue(SalesServiceImpl.estUneCopie((short) 1));
        assertTrue(SalesServiceImpl.estUneCopie("1"));
        assertTrue(SalesServiceImpl.estUneCopie("true"));
    }

    @Test
    @DisplayName("une vente ordinaire n'est jamais prise pour une copie")
    public void nonCopie() {
        assertFalse(SalesServiceImpl.estUneCopie(null));
        assertFalse(SalesServiceImpl.estUneCopie(Boolean.FALSE));
        assertFalse(SalesServiceImpl.estUneCopie(0));
        assertFalse(SalesServiceImpl.estUneCopie("0"));
        assertFalse(SalesServiceImpl.estUneCopie("false"));
    }
}
