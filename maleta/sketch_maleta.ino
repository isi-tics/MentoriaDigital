const int powerKey = 7;
const int reworkButton = 0;
const int garbageButton = 1;
const int goodButton = 2;

const int reworkLed = 4;
const int garbageLed = 8;
const int goodLed = 3;

const int powerRelay = 10;
const int goodRelay = 11;
const int reworkRelay = 12;
const int garbageRelay = 13;

const int buzzer = 9;

const int INA = 5;
const int INB = 6;

byte speed = 255;
const int curr_value_min = 0;
const int curr_value_max = 1023;
const int new_value_min = 120;
const int new_value_max = 255;

void setup()
{
    Serial.begin(9600);
    
    pinMode(powerKey, INPUT_PULLUP);
    pinMode(reworkButton, INPUT_PULLUP);
    pinMode(garbageButton, INPUT_PULLUP);
    pinMode(goodButton, INPUT_PULLUP);
    
    pinMode(reworkLed, OUTPUT);
    pinMode(garbageLed, OUTPUT);
    pinMode(goodLed, OUTPUT);

    pinMode(powerRelay, OUTPUT);
    pinMode(reworkRelay, OUTPUT);
    pinMode(garbageRelay, OUTPUT);
    pinMode(goodRelay, OUTPUT);

    pinMode(INA, OUTPUT);
    pinMode(INB, OUTPUT);
}

void loop()
{
    if (digitalRead(powerKey) == LOW)
    {
        digitalWrite(powerRelay, LOW);
        
        //speed = constrain((analogRead(A0)/4) + 80, 150, 255);
        speed = map(analogRead(A0), curr_value_min, curr_value_max, new_value_min, new_value_max);
        analogWrite(INA,0);
        analogWrite(INB,speed);
    
        if (digitalRead(goodButton) == LOW)
        {
            //Serial.println("Good button pressed");
            digitalWrite(goodLed, HIGH);
            digitalWrite(goodRelay, LOW);

            tone(buzzer, 700, 75);
            delay(100);
            noTone(buzzer);
            
            //while (digitalRead(goodButton) == LOW) {delay(100);}
        }
        else
        {
            digitalWrite(goodLed, LOW);
            digitalWrite(goodRelay, HIGH);
        }
    }
    else
    {
        digitalWrite(powerRelay, HIGH);
        digitalWrite(goodRelay, HIGH);
        digitalWrite(goodLed, LOW);
        
        analogWrite(INA, LOW);
        analogWrite(INB, LOW); 
    }

    if (digitalRead(reworkButton) == LOW)
    {
        //Serial.println("Rework button pressed");
        digitalWrite(reworkLed, HIGH);
        digitalWrite(reworkRelay, LOW);

        tone(buzzer, 450, 50);
        delay(100);
        tone(buzzer, 450, 50);
        delay(100);
        noTone(buzzer);
        
        //while (digitalRead(reworkButton) == LOW) {delay(100);}
    }
    else
    {
        digitalWrite(reworkLed, LOW);
        digitalWrite(reworkRelay, HIGH);
    }

    if (digitalRead(garbageButton) == LOW)
    {
        //Serial.println("Garbage button pressed");
        digitalWrite(garbageLed, HIGH);
        digitalWrite(garbageRelay, LOW);

        tone(buzzer, 200, 500);
        delay(100);
        noTone(buzzer);
        
        //while (digitalRead(garbageButton) == LOW) {delay(100);}
    }
    else
    {
        digitalWrite(garbageLed, LOW);
        digitalWrite(garbageRelay, HIGH);
    }
}
