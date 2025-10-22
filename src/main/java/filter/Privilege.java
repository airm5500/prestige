
package filter;

/**
 *
 * @author koben
 */
public class Privilege {
    final String name;
    final boolean value;

    public Privilege(String name, boolean value) {
        this.name = name;
        this.value = value;
    }

    public String getName() {
        return name;
    }

    public boolean isValue() {
        return value;
    }

}
