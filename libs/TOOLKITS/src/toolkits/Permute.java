/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits;

import java.util.*;

public class Permute<E> {

    /**
     *    Implementation of http://en.wikipedia.org/wiki/Permutation#Systematic_generation_of_all_permutations
    Algorithm to effeciently generate permutations of a sequence
    until all possiblities are exhausted

     */
    private int[] arrIdxs;
    private ArrayList<E> arr;

    public ArrayList<E> get_next() {
        ArrayList<E> ret = new ArrayList<E>();
        for (int idx = 0; idx < arrIdxs.length; idx++) {
            ret.add(idx, arr.get(arrIdxs[idx])); //Permute integer based array indexes, which can be used to get permuted array in return
        }
        return ret;
    }

    public Permute(ArrayList<E> arr) {
        this.arr = new ArrayList<E>();
        for (E each : arr) {
            this.arr.add(each);
        }

       
        arrIdxs = new int[arr.size()];
        for (int i = 0; i < arr.size(); i++) //Set indexes lexicographically minimal value;
        {
            this.arrIdxs[i] = i;
        }
        
       

    }




    public boolean next_permutation() {
        int i, j, l;

        for (j = arr.size() - 2; j >= 0; j--) //get maximum index j for which arr[j+1] > arr[j]
        {
            if (arrIdxs[j + 1] > arrIdxs[j]) {
                break;
            }
        }
        if (j == -1) //has reached it's lexicographic maximum value, No more permutations left
        {
            return false;
        }

        for (l = arr.size() - 1; l > j; l--) //get maximum index l for which arr[l] > arr[j]
        {
            if (arrIdxs[l] > arrIdxs[j]) {
                break;
            }
        }

        int swap = arrIdxs[j]; //Swap arr[i],arr[j]
        arrIdxs[j] = arrIdxs[l];
        arrIdxs[l] = swap;

        for (i = j + 1; i < arrIdxs.length; i++) //reverse array present after index : j+1
        {
            if (i > arrIdxs.length - i + j) {
                break;
            }
            swap = arrIdxs[i];
            arrIdxs[i] = arrIdxs[arrIdxs.length - i + j];
            arrIdxs[arrIdxs.length - i + j] = swap;
        }

        return true;
    }

    public static void main(String[] args) {
        /**
         * Test Run
         */
        ArrayList<String> test_arr = new ArrayList<String>();
        //test_arr.add("1");test_arr.add("2");test_arr.add("3");test_arr.add("4");

        test_arr.add("A");
        test_arr.add("B");
        test_arr.add("C");
        test_arr.add("D");
        test_arr.add("E");
        test_arr.add("F");
        // test_arr.add("7");
        // test_arr.add("8");
        // test_arr.add("9");
        //test_arr.add("10");
        //test_arr.add("11");
        //test_arr.add("12");

        Permute<String> test = new Permute<String>(test_arr);


        while (true) {
            System.out.println(test.get_next().toString());
            if (!test.next_permutation()) {
                break;
            }
        }
    }
}
