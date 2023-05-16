#include <Arduino.h>
#include "Classes.h"

#define DEC_SIZE 5

TempHum *THS;
LDR* LS;
WindSpeed* WS;
moistsensor* SOS[4];
// the setup function runs once when you press reset or power the board
void setup() {
	Serial.begin(115200);
	THS = new TempHum(4);
	LS = new LDR(A0);
	WS = new WindSpeed(2);
	SOS[0] = new moistsensor(A1);
	SOS[1] = new moistsensor(A2);
	SOS[2] = new moistsensor(A3);
	SOS[3] = new moistsensor(A4);
}
// the loop function runs over and over again until power down or reset
void loop() {
	double T = 0, H = 0, L = 0, W = 0, S[4] = { 0,0,0,0 };
	while (Serial.available()) {
		if (Serial.read() != 'S') { continue; }
		THS->getavg(T, H);
		L = LS->getavg();
		W = WS->getavg();
		for (int i = 0; i < 4; i++) {
			S[i] = SOS[i]->getavg();
		}
		Serial.println(">" + String(T, DEC_SIZE) + ',' + String(H, DEC_SIZE) + ',' + String(L, DEC_SIZE) + ',' + String(W, DEC_SIZE) 
			+ ',' + String(S[0], DEC_SIZE) + '/' + String(S[1], DEC_SIZE) + '/' 
			+ String(S[2], DEC_SIZE) + '/' + String(S[3], DEC_SIZE)+"<");
		while (Serial.available()) { Serial.read(); }
	}

	THS->update();
	LS->update();
	WS->update();
	for (int i = 0; i < 4; i++) {
		SOS[i]->update();
	}
	delay(1);
	//double tmp1 = 0, tmp2 = 0;
	//LS->getValue(tmp1);
	//tmp2 = LS->getavg();
	//Serial.println(String("L:") + tmp1 + " LA:" + tmp2);
}
