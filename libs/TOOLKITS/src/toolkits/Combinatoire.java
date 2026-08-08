/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package toolkits;

import java.util.Vector;
import java.util.Enumeration;

public class Combinatoire{

	/**
	 * La fonction java.lang.Long.toBinaryString(long value) retourne
	 * la valeur passée en argument sous la forme d'une chaine de
	 * caractères (formee de bits : 0 ou 1) représentant un nombre binaire (base 2).
   	 * Pour notre utilisation, il est nécessaire de compléter ce nombre
	 * par la gauche avec un nombre précis de zéros tel que :
	 * [Nombre de zéros complémentaires]=[Nombre total d'élements]-[Nombre de bits dans le nombre]
	 */
	private static String completerParDesZeros(String str, int nbreChiffres){
		StringBuffer buffer=new StringBuffer(str);
		for(long diff=nbreChiffres-buffer.length();diff>0;diff--) buffer.insert(0,"0");
		String tmp=buffer.toString();
		buffer=null;
		return tmp;
	}

	/**
	 * La fonction compte et retourne le nombre de bits à 0 dans le
	 * nombre binaire passé en argument sous la forme d'une chaine de caractères.
	 */
	private static int nombreDe0(String binaire){
		int compteur=0;
		for(int i=0;i<binaire.length();i++) if(binaire.charAt(i)=='0') compteur++;
		return compteur;
	}

	/**
	 * La fonction compte et retourne le nombre de bits à 1 dans le
	 * nombre binaire passé en argument sous la forme d'une chaine de caractères.
	 */
	private static int nombreDe1(String binaire){
		int compteur=0;
		for(int i=0;i<binaire.length();i++) if(binaire.charAt(i)=='1') compteur++;
		return compteur;
	}

	/**
	 * La fonction construit une chaine de caractères telle que :
	 * pour une position donnée [0...n], si le bit est à 1 dans [binaire]
	 * alors le caractère correspondant dans [listeElements] est ajouté.
	 */
	private static String remplacerChiffresParElements(String binaire, String listeElements){
		final int nbreElements = listeElements.length();
		StringBuffer buffer=new StringBuffer();
		for(long j=0;j<nbreElements;j++){
			buffer.append((binaire.charAt((int)j)=='0')?"":""+listeElements.charAt((int)j));
		}
		String tmp=buffer.toString();
		buffer=null;
		return tmp;
	}

	/**
	 * Considerons la liste des éléments et un nombre binaire comme des bandelettes de papier;
	 * Sur la première est inscrite la liste des éléments pouvant apparaitre dans les combinaisons;
	 * Sur la deuxième, les bits à 1 sont représentés par des trous.
	 * En superposant la deuxième bandelette à la première, on peut (littéralement) lire
	 * la combinaison d'éléments correspondant au nombre binaire.
	 *
	 * Probleme à résoudre :
	 *
	 * Pour un meme nombre total d'elements, le nombre d'éléments par combinaison peut varier,
	 * sans que la fonction soit plus rapide.
	 *
	 * ex: Avec 3 symboles , le plus grand nombre binaire possible est 111 (soit 2^3 -1=7 en décimal) et le plus petit 000 (soit 0 !)
	 *
	 * La fonction incrémente un compteur de 0 à n (7 dans notre exemple)
	 * 0->000 1->001 2->010 3->011 4->100 5->101 6->110 7->111
	 *
	 * transforme cette valeur en binaire; ensuite, si le nombre de bits à 1 est égal au nombre d'éléments demandé
	 * le masque est utilisé pour construire une combinaison.
	 *
	 * Comment ne plus filtrer la liste de toutes les combinaisons possibles de 0 à n éléments, mais bel et bien
	 * Génerer seulement les combinaisons de x éléments demandées???
	 */
	protected static Enumeration toutesLesCombinaisons(String listeElements, int nombreElementsDansCombinaison){


                final int nbreElements = listeElements.length();
		final double nbreLignes = Math.pow(2,nbreElements);

		Vector vector= new Vector((int)nbreLignes);
		long valeur=(long)nbreLignes-1L;

		while(valeur>0){
			String binaire=completerParDesZeros(Long.toBinaryString(valeur),nbreElements);
			if(nombreElementsDansCombinaison==nombreDe1(binaire)){
				String mot=remplacerChiffresParElements(binaire,listeElements);
				vector.add(mot);
			}
			valeur--;
		}
		return vector.elements();
    	}
	/**
	 *
	 */
	private static String permuterSymboles(String str, int oldPos, int newPos){
		int min=0,max=str.length();
		char ch1, ch2;
		char[] chars=str.toCharArray();
		if(oldPos>=min&oldPos<max&newPos>=min&newPos<max&newPos!=oldPos){
			chars=str.toCharArray();
			ch1=str.charAt(oldPos);
			ch2=str.charAt(newPos);
			chars[oldPos]=ch2;
			chars[newPos]=ch1;
		}
		return String.valueOf(chars);
	}

	/**
	 *
	 */
	protected static Enumeration toutesLesPermutations(String str){
		String copyStr=str;
		final int length=str.length();
		final int vecSize=length*(length-1);
		Vector vector=new Vector(vecSize);
		int index=0;
		for(int i=0;i<vecSize;i++){
			index=i%(length-1);
			copyStr=permuterSymboles(copyStr,index,(index+1));
			vector.add(copyStr);
		}
		return vector.elements();
	}

	/**
	 * La méthode imprime sur la console le contenu de l'objet java.util.Enumeration
	 */
	protected static void lister(Enumeration enumeration){
     		while(enumeration.hasMoreElements()){
			System.out.println((String)enumeration.nextElement());
     		}
    	}
    	/**
	 * Méthode principale
	 * @author REQUENA Ludwig
 	 */
    	public static void main(String[] args){
		long dep1=System.currentTimeMillis();
		try{
			Enumeration enumo= toutesLesCombinaisons("1-2-3-4",4);
			while(enumo.hasMoreElements()){
				String str=(String)enumo.nextElement();
				lister(toutesLesPermutations(str));
			}
		}catch(OutOfMemoryError oomerr){
			System.err.println("La methode a consomme trop de ressources");
		}
		long fin1=System.currentTimeMillis();
		long diff1=fin1-dep1;
		System.out.println("nouvelle methode executee en : "+diff1+" millisecondes.");
    	}

}
