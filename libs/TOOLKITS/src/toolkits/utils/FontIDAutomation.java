/********************************************************************
/*  Java Source Code for Linear Barcode Fonts Version 2006
/*  Copyright © 2000-2006 IDAutomation.com, Inc. All rights reserved.
/*  US Registered Copyright #Txu983-177
/*
/*  You may incorporate this Source Code in your application
/*  only if you own a valid license from IDAutomation.com, Inc.
/*  for the associated product, provided that this copyright
/*  notice and text are not removed from the source code.
/*
/*  Distributing this source code outside your
/*  organization requires a Developer License.
/********************************************************************/
package toolkits.utils;

public class  FontIDAutomation
{
    public void test ( )
    {
        //This is an example of how to format the barcode font for output
        System.out.println( "Output: " + Code39("123456789") );
    }


/** This is the complete method for Code128a
 */

   public static String Code128a( String DataToEncode )
    {
        char C128_Start = (char)203;
        char C128_Stop = (char)206;
        String Printable_string = "";
        char CurrentChar;
        int CurrentValue=0;
        int weightedTotal=0;
        int CheckDigitValue=0;
        char C128_CheckDigit='w';

        DataToEncode = DataToEncode.trim();
        weightedTotal = ((int)C128_Start) - 100;
        for( int i = 1; i <= DataToEncode.length(); i++ )
        {
           //get the value of each character
           CurrentChar = DataToEncode.charAt(i-1);
           if( ((int)CurrentChar) < 135 )
              CurrentValue = ((int)CurrentChar) - 32;
           if( ((int)CurrentChar) > 134 )
              CurrentValue = ((int)CurrentChar) - 100;

           CurrentValue = CurrentValue * i;
           weightedTotal = weightedTotal + CurrentValue;
        }
       //divide the WeightedTotal by 103 and get the remainder,
       //this is the CheckDigitValue
       CheckDigitValue = weightedTotal % 103;
       if( (CheckDigitValue < 95) && (CheckDigitValue > 0) )
         C128_CheckDigit = (char)(CheckDigitValue + 32);
       if( CheckDigitValue > 94 )
         C128_CheckDigit = (char)(CheckDigitValue + 100);
       if( CheckDigitValue == 0 ){
         C128_CheckDigit = (char)194;
         }

      Printable_string = C128_Start + DataToEncode + C128_CheckDigit + C128_Stop + " ";
      return Printable_string;
    }


/** This is the complete method for Code128b
 */

  public  static String Code128b( String DataToEncode )
    {
        char C128_Start = (char)204;
        char C128_Stop = (char)206;
        String Printable_string = "";
        String temp = "";
        char CurrentChar;
        int CurrentValue=0;
        int weightedTotal=0;
        int CheckDigitValue=0;
        char C128_CheckDigit='w';

        DataToEncode = DataToEncode.trim();
        weightedTotal = ((int)C128_Start) - 100;
        for( int i = 1; i <= DataToEncode.length(); i++ )
        {
           //get the value of each character
           CurrentChar = DataToEncode.charAt(i-1);
           if( ((int)CurrentChar) < 135 )
              CurrentValue = ((int)CurrentChar) - 32;
           if( ((int)CurrentChar) > 134 )
              CurrentValue = ((int)CurrentChar) - 100;

           CurrentValue = CurrentValue * i;
           weightedTotal = weightedTotal + CurrentValue;
	//added by tb, replaces the spaces with the 194 character
           if (CurrentChar == ' ')
           {
           		CurrentChar = (char) 194;
           }
           		temp = temp + CurrentChar;
        }
       //divide the WeightedTotal by 103 and get the remainder,
       //this is the CheckDigitValue
       CheckDigitValue = weightedTotal % 103;
       if( (CheckDigitValue < 95) && (CheckDigitValue > 0) )
         C128_CheckDigit = (char)(CheckDigitValue + 32);
       if( CheckDigitValue > 94 )
         C128_CheckDigit = (char)(CheckDigitValue + 100);
       if( CheckDigitValue == 0 ){
         C128_CheckDigit = (char)194;
         }

      //Printable_string = C128_Start + DataToEncode + C128_CheckDigit + C128_Stop + " ";
      Printable_string = C128_Start + temp + C128_CheckDigit + C128_Stop + " ";
      return Printable_string;
    }


/** This is the complete method for Code128c
 */

  public  static String Code128c( String DataToEncode )
    {
        char C128_Start = (char)205;
        char C128_Stop = (char)206;
        String Printable_string = "";
        String DataToPrint = "";
        String OnlyCorrectData = "";
        int i=1;
        int CurrentChar=0;
        int CurrentValue=0;
        int weightedTotal=0;
        int CheckDigitValue=0;
        char C128_CheckDigit='w';
        DataToPrint = "";
        DataToEncode = DataToEncode.trim();
        for(i = 1; i <= DataToEncode.length(); i++ )
        {
            //Add only numbers to OnlyCorrectData string
            CurrentChar = (int)DataToEncode.charAt(i-1);
            if((CurrentChar < 58) && (CurrentChar > 47))
            {
                OnlyCorrectData = OnlyCorrectData + (char)DataToEncode.charAt(i-1);
            }
        }
        DataToEncode = OnlyCorrectData;
        //Check for an even number of digits, add 0 if not even
        if( (DataToEncode.length() % 2) == 1 )
        {
            DataToEncode = "0" + DataToEncode;
        }
        //<<<< Calculate Modulo 103 Check Digit and generate DataToPrint >>>>
        //Set WeightedTotal to the Code 128 value of the start character
        weightedTotal = ((int)C128_Start) - 100;
        int WeightValue = 1;
        for( i = 1; i <= DataToEncode.length(); i += 2 )
        {
           //Get the value of each number pair (ex: 5 and 6 = 5*10+6 =56)
           //And assign the ASCII values to DataToPrint
           CurrentChar = ((((int)DataToEncode.charAt(i-1))-48)*10) + (((int)DataToEncode.charAt(i))-48);
           if((CurrentChar < 95) && (CurrentChar  > 0))
              DataToPrint = DataToPrint + (char)(CurrentChar + 32);
           if( CurrentChar > 94 )
              DataToPrint = DataToPrint + (char)(CurrentChar + 100);
           if( CurrentChar == 0)
              DataToPrint = DataToPrint + (char)194;
           //multiply by the weighting character
           //add the values together to get the weighted total
           weightedTotal = weightedTotal + (CurrentChar * WeightValue);
           WeightValue = WeightValue + 1;
        }
       //divide the WeightedTotal by 103 and get the remainder,
       //this is the CheckDigitValue
       CheckDigitValue = weightedTotal % 103;
       if((CheckDigitValue < 95) && (CheckDigitValue > 0))
         C128_CheckDigit = (char)(CheckDigitValue + 32);
       if( CheckDigitValue > 94 )
         C128_CheckDigit = (char)(CheckDigitValue + 100);
       if( CheckDigitValue == 0 ){
         C128_CheckDigit = (char)194;
         }
      Printable_string = C128_Start + DataToPrint + C128_CheckDigit + C128_Stop + " ";
      return Printable_string;
    }


/** This is the complete method for Code39
 */

  public  static String Code39( String DataToEncode )
    {
            String DataToPrint = "";
            String OnlyCorrectData = "";
            String Printable_string = "";
            int CurrentChar=0;
            int CurrentValue=0;
            DataToEncode = DataToEncode.trim();

            //only pass correct data
            for( int i = 1; i <= DataToEncode.length(); i++ )
            {
                //Get each character value one at a time
                CurrentChar = (int)(DataToEncode.charAt(i-1));
                //Get the value of CurrentChar according to MOD43
                //0-9
                if( (CurrentChar < 58) && (CurrentChar > 47) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //A-Z
                if( (CurrentChar < 91) && (CurrentChar > 64) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //Space
                if( CurrentChar == ( 32 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //-
                if( CurrentChar == ( 45 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //.
                if( CurrentChar == ( 46 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //$
                if( CurrentChar == ( 36 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                ///
                if( CurrentChar == ( 47 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //+
                if( CurrentChar == ( 43 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //%
                if( CurrentChar == ( 37 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
            }
            DataToEncode = OnlyCorrectData;

            //Get Printable String
            Printable_string = "!" + DataToPrint + "!" + " ";

            //Return PrintableString
            return Printable_string;

    }


/** This is the complete method for Code39Mod43
 */


  public  static String Code39Mod43( String DataToEncode )
    {
            String DataToPrint = "";
            int CheckDigit='0';
            String OnlyCorrectData = "";
            String Printable_string = "";
            int CurrentChar=0;
            int CurrentValue=0;
            int weightedTotal=0;
            int CheckDigitValue=0;
            DataToEncode = DataToEncode.trim();

            //only pass correct data
            for( int i = 1; i <= DataToEncode.length(); i++ )
            {
                //Get each character value one at a time
                CurrentChar = (int)(DataToEncode.charAt(i-1));
                //Get the value of CurrentChar according to MOD43
                //0-9
                if( (CurrentChar < 58) && (CurrentChar > 47) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //A-Z
                if( (CurrentChar < 91) && (CurrentChar > 64) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //Space
                if( CurrentChar == ( 32 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //-
                if( CurrentChar == ( 45 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //.
                if( CurrentChar == ( 46 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //$
                if( CurrentChar == ( 36 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                ///
                if( CurrentChar == ( 47 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //+
                if( CurrentChar == ( 43 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
                //%
                if( CurrentChar == ( 37 ) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
            }
            DataToEncode = OnlyCorrectData;
            weightedTotal = 0;

            for( int i = 1; i <= DataToEncode.length(); i++ )
            {
                //Get each character value one at a time
                CurrentChar = (int)(DataToEncode.charAt(i-1));
                //Get the value of CurrentChar according to MOD43
                //0-9
                if( (CurrentChar < 58) && (CurrentChar > 47) )
                {
                    CurrentValue = (int)CurrentChar - 48;
                }
                //A-Z
                if( ((int)CurrentChar < 91) && ((int)CurrentChar > 64) )
                {
                    CurrentValue = (int)CurrentChar - 55;
                }
                //Space
                if( CurrentChar == ( 32 ) )
                {
                    CurrentValue = 38;
                }
                //-
                if( CurrentChar == ( 45 ) )
                {
                    CurrentValue = 36;
                }
                //.
                if( CurrentChar == ( 46 ) )
                {
                    CurrentValue = 37;
                }
                //$
                if( CurrentChar == ( 36 ) )
                {
                    CurrentValue = 39;
                }
                ///
                if( CurrentChar == ( 47 ) )
                {
                    CurrentValue = 40;
                }
                //+
                if( CurrentChar == ( 43 ) )
                {
                    CurrentValue = 41;
                }
                //%
                if( CurrentChar == ( 37 ) )
                {
                    CurrentValue = 42;
                }
                //To print the barcode symbol representing a space you will
                //to type or print "=" (the equal character) instead of a space character.
                if( CurrentChar == ( 32 ) )
                {
                    CurrentChar = ( 61 );
                }
                //gather data to print
                DataToPrint = DataToPrint + (char)CurrentChar;
                //add the values together
                weightedTotal = weightedTotal + CurrentValue;
            }
            //divide the WeightedTotal by 43 and get the remainder, this is the CheckDigit
            CheckDigitValue = weightedTotal % 43;
            //Assign values to characters
            //0-9
            if( CheckDigitValue < 10 )
            {
                CheckDigit = CheckDigitValue + 48;
            }
            //A-Z
            if( (CheckDigitValue < 36) && (CheckDigitValue > 9) )
            {
                CheckDigit = CheckDigitValue + 55;
            }
            //Space
            if( CheckDigitValue == 38 )
            {
                CheckDigit = 61;
            }
            //-
            if( CheckDigitValue == 36 )
            {
                CheckDigit = 45;
            }
            //.
            if( CheckDigitValue == 37 )
            {
                CheckDigit = 46;
            }
            //$
            if( CheckDigitValue == 39 )
            {
                CheckDigit = 36;
            }
            ///
            if( CheckDigitValue == 40 )
            {
                CheckDigit = 47;
            }
            //+
            if( CheckDigitValue == 41 )
            {
                CheckDigit = 43;
            }
            //%
            if( CheckDigitValue == 42 )
            {
                CheckDigit = 37;
            }

            //Get Printable String
            Printable_string = "!" + DataToPrint + (char)CheckDigit + "!" + " ";

            //Return PrintableString
            return Printable_string;

    }


/** This is the complete method for Postnet
 */

  public  static String Postnet( String DataToEncode )
    {
            int CheckDigit=0;
            int i=1;
            String OnlyCorrectData = "";
            String Printable_string = "";
            char CurrentChar;
            int CurrentValue=0;
            int weightedTotal=0;
            String DataToPrint = "";
            DataToEncode = DataToEncode.trim();

            // Check to make sure data is numeric and remove dashes, etc.
            for( i = 1; i <= DataToEncode.length(); i++ )
            {
                //Add all numbers to OnlyCorrectData string
                CurrentValue = (int)(DataToEncode.charAt(i-1));
                if( (CurrentValue < 58) && (CurrentValue > 47) )
                {
                    OnlyCorrectData = OnlyCorrectData + DataToEncode.charAt(i-1);
                }
            }
            DataToEncode = OnlyCorrectData;

            //<<<< Calculate Check Digit >>>>
            for( i = 1; i <= DataToEncode.length(); i++ )
            {
                //Get the value of each number
                CurrentChar = DataToEncode.charAt(i-1);
                //Convert CurrentChar to Integer and add the values together
                weightedTotal = weightedTotal + (((int)CurrentChar)-48);
            }
            //Find the CheckDigit by finding the number + weightedTotal that = a multiple of 10
            //divide by 10, get the remainder and subtract from 10
            i = weightedTotal % 10;
            if( i != 0 )
            {
                CheckDigit = 10 - i;
            }
            else
            {
                CheckDigit = 0;
            }

            //Get Printable String
            DataToPrint = DataToEncode;
            Printable_string = "(" + DataToPrint + CheckDigit + ")" + " ";

            //Return PrintableString
            return Printable_string;

    }

/** This is the complete method for Interleaved2of5Mod10
 */

  public  static String Interleaved2of5Mod10( String DataToEncode )
    {
        String Printable_string = "";
        String OnlyCorrectData = "";
        String DataToPrint = "";
        int CurrentChar;
        int i=1;
        int CurrentValue=0;
        int weightedTotal=0;
        int CheckDigitValue=0;
        int CheckDigit=0;

        DataToEncode = DataToEncode.trim();

            for(i = 1; i <= DataToEncode.length(); i++ )
            {
                //Add only numbers to OnlyCorrectData string
                CurrentChar = (int)DataToEncode.charAt(i-1);
                if((CurrentChar < 58) && (CurrentChar > 47))
                {
                    OnlyCorrectData = OnlyCorrectData + (char)DataToEncode.charAt(i-1);
                }
            }
            DataToEncode = OnlyCorrectData;

            //<<<< Calculate Check Digit >>>>
            int Factor = 3;
            for( i = DataToEncode.length(); i >= 1; i-- )
            {
                //Get the value of each number starting at the end
                CurrentChar = (((int)DataToEncode.charAt(i-1))-48);
                //multiply by the weighting factor which is 3,1,3,1...
                //and add the sum together
                weightedTotal = weightedTotal + (CurrentChar * Factor);
                //change factor for next calculation
                Factor = 4 - Factor;
            }
            //Find the CheckDigit by finding the smallest number that = a multiple of 10
            i = weightedTotal % 10;
            if( i != 0 )
            {
                CheckDigit = 10 - i;
            }
            else
            {
                CheckDigit = 0;
            }
            //Add check digit number to DataToEncode
            DataToEncode = DataToEncode + CheckDigit;

            //Check for an even number of digits, add 0 if not even
            if( (DataToEncode.length() % 2) == 1 )
            {
                DataToEncode = "0" + DataToEncode;
            }

            for( i = 1; i <= DataToEncode.length(); i += 2 )
            {
                //Get the value of each number pair (ex: 5 and 6 = 5*10+6 =56)
                CurrentChar = ((((int)DataToEncode.charAt(i-1))-48)*10) + (((int)DataToEncode.charAt(i))-48);
                //Get the ASCII value of CurrentChar according to chart by adding to the value
                // (old process) DataToPrint = DataToPrint + (char)(CurrentChar + 130);
               if( CurrentChar < 94 )
                  DataToPrint = DataToPrint + (char)(CurrentChar + 33);
               if( CurrentChar > 93 )
                  DataToPrint = DataToPrint + (char)(CurrentChar + 103);
            }

            //Get PrintableString
            Printable_string = (char)(203) + DataToPrint + (char)(204) + " ";

            //Return PrintableString
            return Printable_string;

    }

/** This is the complete method for Interleaved2of5
 */

  public  static String Interleaved2of5( String DataToEncode )
    {
        String Printable_string = "";
        String OnlyCorrectData = "";
        String DataToPrint = "";
        int CurrentChar;
        int i=1;
        int CurrentValue=0;
        int weightedTotal=0;

        DataToEncode = DataToEncode.trim();

            for(i = 1; i <= DataToEncode.length(); i++ )
            {
                //Add only numbers to OnlyCorrectData string
                CurrentChar = (int)DataToEncode.charAt(i-1);
                if((CurrentChar < 58) && (CurrentChar > 47))
                {
                    OnlyCorrectData = OnlyCorrectData + (char)DataToEncode.charAt(i-1);
                }
            }
            DataToEncode = OnlyCorrectData;

            //Check for an even number of digits, add 0 if not even
            if( (DataToEncode.length() % 2) == 1 )
            {
                DataToEncode = "0" + DataToEncode;
            }

            for( i = 1; i <= DataToEncode.length(); i += 2 )
            {
                //Get the value of each number pair (ex: 5 and 6 = 5*10+6 =56)
                CurrentChar = ((((int)DataToEncode.charAt(i-1))-48)*10) + (((int)DataToEncode.charAt(i))-48);
                //Get the ASCII value of CurrentChar according to chart by adding to the value
                // (old process) DataToPrint = DataToPrint + (char)(CurrentChar + 130);
               if( CurrentChar < 94 )
                  DataToPrint = DataToPrint + (char)(CurrentChar + 33);
               if( CurrentChar > 93 )
                  DataToPrint = DataToPrint + (char)(CurrentChar + 103);
            }

            //Get PrintableString
            Printable_string = (char)(203) + DataToPrint + (char)(204) + " ";

            //Return PrintableString
            return Printable_string;

    }

}