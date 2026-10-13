package util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class SqlTexteTest {

    @Test
    void apostropheEtAntislashNeSortentPasDuTexte() {
        assertEquals("x'' OR SLEEP(5)-- -", SqlTexte.litteral("x' OR SLEEP(5)-- -"));
        assertEquals("a\\\\'' OR 1=1", SqlTexte.litteral("a\\' OR 1=1"));
        assertEquals("ab", SqlTexte.litteral("a\u0000b"));
        assertEquals("", SqlTexte.litteral(null));
        assertEquals("DOLIPRANE 500", SqlTexte.litteral("DOLIPRANE 500"));
    }

    @Test
    void identifiantNonConformeNeCorrespondARien() {
        assertEquals("16106115173088376164", SqlTexte.identifiant("16106115173088376164"));
        assertEquals("'__invalide__'", SqlTexte.identifiant("1 OR SLEEP(5)"));
        assertEquals("'__invalide__'", SqlTexte.identifiant(null));
    }
}
