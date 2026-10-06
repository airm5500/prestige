package filter;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

public class CaracteresSaisieFilterTest {

    @Test
    public void emojisRefusesAccentsAcceptes() {
        assertTrue(CaracteresSaisieFilter.refuse("/prestige/api/v1/x?query=ab%F0%9F%98%80"));
        assertTrue(CaracteresSaisieFilter.refuse("/prestige/api/v1/x?query=ab%f0%9f%98%80"));
        assertFalse(CaracteresSaisieFilter.refuse("/prestige/api/v1/x?query=%C3%A9t%C3%A9%E2%82%AC"), "é, €");
        assertFalse(CaracteresSaisieFilter.refuse("/prestige/api/v1/x?query=Fo%20F1"), "F0 sans % : du texte");
        assertFalse(CaracteresSaisieFilter.refuse(null));
    }
}
