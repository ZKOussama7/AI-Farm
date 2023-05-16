#pragma once
#include <Adafruit_Sensor.h>
#include <DHT_U.h>
#include <DHT.h>

const static float pi = 3.14159;       // Valeur de pi
const static float radius = 0.13;            // Rayon du ventilateur en mètres

const static float drag_coef = 2.5;
static unsigned long lst_tmp;
static unsigned long delays[4];
static int stp;

class TempHum {
private:
    DHT* dht = nullptr;
    double T, H;
public:
    TempHum(int p) {
        this->dht = new DHT(p, DHT11);
        this->dht->begin();
        this->T = this->dht->readTemperature(false);
        this->H = this->dht->readHumidity();
    }

    void getValue(double &temp, double &humidity,bool  isforced=false)
    {
        temp = this->dht->readTemperature(false, isforced);
        humidity = this->dht->readHumidity(isforced);
    }

    void update() {
        this->getValue(this->T, this->H);
    }
    double getavg(double& T, double& H) {
        T = this->T;
        H = this->H;
    }
};

class potentio
{
private:
    int pin;

public:
    potentio(int p) {
        this->pin = p;
        pinMode(p, INPUT);
    }

    void getValue(double* value) {
        int potvalue = analogRead(this->pin);
        *value = (double)potvalue * 100. / 1023;
    }
};

class ultrason {
private:
    int Trigpin;
    int Echopin;

public:
    ultrason(int T, int E) {
        this->Trigpin = T;
        this->Echopin = E;
    }

    void getValue(double* distance)
    {
        digitalWrite(this->Trigpin, LOW);
        delayMicroseconds(1);
        digitalWrite(this->Trigpin, HIGH);
        delayMicroseconds(5);
        digitalWrite(this->Trigpin, LOW);

        long long duration = pulseIn(this->Echopin, HIGH);


        *distance = (double)duration / 58.0;

    }
};

class LDR {
private:
    const double maxvalue = 100.;
    const double minvalue = 0.;

    int pin;
    double avg;
    uint64_t count;
public:
    LDR(int p) {
        this->pin = p;
        pinMode(p, INPUT);
        this->getValue(this->avg);

    }

    void getOValue(double& value) {
        value = (double)analogRead(this->pin) * 100. / 1023.;
    }

    void getValue(double &value) {
        double Valpin;
        this->getOValue(Valpin);
        value = (Valpin - minvalue) * (100.0 / (maxvalue - minvalue));
    }

    void update() {
        double vl = this->avg;
        this->getValue(vl);
        this->count++;
        if (count != 0) {
            this->avg = this->avg + (vl - this->avg)/ this->count;
        }
        else {
            this->getValue(this->avg);
        }
    }

    double getavg() {
        double oavg = this->avg;
        getValue(this->avg);
        this->count = 0;
        return oavg;
    }


};

class moistsensor {
private:
    double avg;
    uint64_t count = 0;
    int pin;
    //const int maxvalue = 68;
    //const int minvalue = 0;
    const double maxvalue = 90;
    const double minvalue = 0.;

public:
    moistsensor(int p) {
        this->pin = p;
        pinMode(p, INPUT);
        this->getValue(this->avg);
    }

    void getOValue(double& value) {
        value = (double)analogRead(this->pin) * 100. / 1023.;
    }

    void getValue(double& value) {
        double Valpin;
        this->getOValue(Valpin);
        Valpin = (Valpin - minvalue) / (maxvalue - minvalue);
        if(Valpin<=0.5)
            value = constrain(sqrt(Valpin*2)*50,0,100);
        else
            value = constrain((pow(Valpin-0.5,2)*2+0.5)*100, 0, 100);
    }

    void update() {
        double vl = this->avg;
        this->getValue(vl);
        this->count++;
        if (count != 0) {
            this->avg = this->avg + (vl - this->avg) / this->count;
        }
        else {
            this->getValue(this->avg);
        }
    }

    double getavg() {
        double oavg = this->avg;
        getValue(this->avg);
        this->count = 0;
        return oavg;
    }
    //TODO: average of all

};

class WindSpeed {
private:
    double avg;
public:
    WindSpeed(int p)
    {
        lst_tmp = micros();
        for (int i = 0; i < 4; i++){
            delays[i]= 3000000;
        }
        stp = 0;

        pinMode(p, INPUT);
        attachInterrupt(digitalPinToInterrupt(p), this->sensorcount, CHANGE);
        sei();
    }
    static void sensorcount() {
        unsigned long ctmp = micros();
        if (lst_tmp > ctmp) {
            lst_tmp = ctmp;
            return;
        }
        stp++;
        stp = stp % 4;
        delays[stp] = ctmp - lst_tmp;
        lst_tmp = ctmp;
        return;
    }

    double getSpeed() {
        double s = 0;
        for (int i = 0; i < 4; i++) {
            s += delays[i];
        }
        s /= 4;
        if (s >= 3000000)
            return 0;
        s = 250000 / (s);
        return 2 * pi * radius * (s)*drag_coef;
    }

    void update() {
        if (micros() - lst_tmp > 3000000)
            this->sensorcount();
    }

    double getavg() {
        return this->getSpeed();
    }
};