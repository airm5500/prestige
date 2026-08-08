/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package toolkits;

import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import toolkits.utils.Maths;

/**
 *
 * @author Admin
 */
public class PermutationGenerator<T>
{
    private final T[] elements;
    private final int[] permutationIndices;
    private long remainingPermutations;
    private long totalPermutations;


    /**
     * Permutation generator that generates all possible orderings of
     * the elements in the specified set.
     * @param elements The elements to permute.
     */
    public PermutationGenerator(T[] elements,int paternSize)
    {
        if (elements.length < 1 || elements.length > 20)
        {
            throw new IllegalArgumentException("Size must be between 1 and 20.");
        }
        this.elements = elements.clone();
        permutationIndices = new int[5];
        totalPermutations = Maths.factorial(5);
        reset();
    }


    /**
     * Permutation generator that generates all possible orderings of
     * the elements in the specified set.
     * @param elements The elements to permute.
     */
    @SuppressWarnings("unchecked")
    public PermutationGenerator(Collection<T> elements,int paternSize)
    {
        this(elements.toArray((T[]) new Object[elements.size()]),paternSize);
    }


    /**
     * Resets the generator state.
     */
    public final void reset()
    {
        for (int i = 0; i < permutationIndices.length; i++)
        {
            permutationIndices[i] = i;
        }
        remainingPermutations = totalPermutations;
    }


    /**
     * Returns the number of permutations not yet generated.
     * @return The number of unique permutations still to be generated.
     */
    public long getRemainingPermutations()
    {
        return remainingPermutations;
    }


    /**
     * Returns the total number of unique permutations that can be
     * generated for the given set of elements.
     * @return The total number of permutations.
     */
    public long getTotalPermutations()
    {
        return totalPermutations;
    }


    /**
     * Are there more permutations that have not yet been returned?
     * @return true if there are more permutations, false otherwise.
     */
    public boolean hasMore()
    {
        return remainingPermutations > 0;
    }


    /**
     * Generate the next permutation and return an array containing
     * the elements in the appropriate order.
     * @see #nextPermutationAsArray(Object[])
     * @see #nextPermutationAsList()
     * @return The next permutation as an array.
     */
    @SuppressWarnings("unchecked")
    public T[] nextPermutationAsArray()
    {
        generateNextPermutationIndices();
        // Generate actual permutation.
        T[] permutation = (T[]) Array.newInstance(elements.getClass().getComponentType(),permutationIndices.length);
        for (int i = 0; i < permutationIndices.length; i++)
        {
            permutation[i] = elements[permutationIndices[i]];
        }
        return permutation;
    }


    /**
     * Generate the next permutation and return an array containing
     * the elements in the appropriate order.  This overloaded method
     * allows the caller to provide an array that will be used and returned.
     * The purpose of this is to improve performance when iterating over
     * permutations.  If the {@link #nextPermutationAsArray()} method is
     * used it will create a new array every time.  When iterating over
     * permutations this will result in lots of short-lived objects that
     * have to be garbage collected.  This method allows a single array
     * instance to be reused in such circumstances.
     * @param destination Provides an array to use to create the
     * permutation.  The specified array must be the same length as a
     * permutation.  This is the array that will be returned, once
     * it has been filled with the elements in the appropriate order.
     * @return The next permutation as an array.
     */
    public T[] nextPermutationAsArray(T[] destination)
    {
        if (destination.length != elements.length)
        {
            throw new IllegalArgumentException("Destination array must be the same length as permutations.");
        }
        generateNextPermutationIndices();
        // Generate actual permutation.
        for (int i = 0; i < permutationIndices.length; i++)
        {
            destination[i] = elements[permutationIndices[i]];
        }
        return destination;
    }


    /**
     * Generate the next permutation and return a list containing
     * the elements in the appropriate order.
     * @see #nextPermutationAsList(java.util.List)
     * @see #nextPermutationAsArray()
     * @return The next permutation as a list.
     */
    public List<T> nextPermutationAsList()
    {
        generateNextPermutationIndices();
        // Generate actual permutation.
        List<T> permutation = new ArrayList<T>(elements.length);
        for (int i : permutationIndices)
        {
            permutation.add(elements[i]);
        }
        return permutation;
    }


    /**
     * Generate the next permutation and return a list containing
     * the elements in the appropriate order.  This overloaded method
     * allows the caller to provide a list that will be used and returned.
     * The purpose of this is to improve performance when iterating over
     * permutations.  If the {@link #nextPermutationAsList()} method is
     * used it will create a new list every time.  When iterating over
     * permutations this will result in lots of short-lived objects that
     * have to be garbage collected.  This method allows a single list
     * instance to be reused in such circumstances.
     * @param destination Provides a list to use to create the
     * permutation.  This is the list that will be returned, once
     * it has been filled with the elements in the appropriate order.
     * @return The next permutation as a list.
     */
    public List<T> nextPermutationAsList(List<T> destination)
    {
        generateNextPermutationIndices();
        // Generate actual permutation.
        destination.clear();
        for (int i : permutationIndices)
        {
            destination.add(elements[i]);
        }
        return destination;
    }


    /**
     * Generate the indices into the elements array for the next permutation.  The
     * algorithm is from Kenneth H. Rosen, Discrete Mathematics and its Applications,
     * 2nd edition (NY: McGraw-Hill, 1991), p. 284)
     */
    private void generateNextPermutationIndices()
    {
        if (remainingPermutations < totalPermutations)
        {
            // Find largest index j with permutationIndices[j] < permutationIndices[j + 1]
            int j = permutationIndices.length - 2;
            while (permutationIndices[j] > permutationIndices[j + 1])
            {
                j--;
            }

            // Find index k such that permutationIndices[k] is smallest integer greater than
            // permutationIndices[j] to the right of permutationIndices[j].
            int k = permutationIndices.length - 1;
            while (permutationIndices[j] > permutationIndices[k])
            {
                k--;
            }

            // Interchange permutation indices.
            int temp = permutationIndices[k];
            permutationIndices[k] = permutationIndices[j];
            permutationIndices[j] = temp;

            // Put tail end of permutation after jth position in increasing order.
            int r = permutationIndices.length - 1;
            int s = j + 1;

            while (r > s)
            {
                temp = permutationIndices[s];
                permutationIndices[s] = permutationIndices[r];
                permutationIndices[r] = temp;
                r--;
                s++;
            }
        }
        --remainingPermutations;
    }
}