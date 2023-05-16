//Considered By the Compiler
#include <Arduino.h>

#include "soc/soc.h"           // Disable brownour problems
#include "soc/rtc_cntl_reg.h"  // Disable brownour problems
#include "driver/rtc_io.h"

#include <WiFi.h>
#include <HTTPClient.h>
#include <SD_MMC.h>
#include <FS.h>
#include <ESP32Time.h>


#include <vector>

using namespace std;
#define MODE_PIN 16
#define SER_BUF_SIZE 200
#define DATA_SIZE 500
#define AUTORECONNECT_INT_WIFI 5000
#define AUTORECONNECT_INT_HTTP 10000
#define HTTP_TIMEOUT 3000
#define GET_DATA_TIMEOUT 5000
#define SOIL_NUM 4

class Zime {
public:

	unsigned long secs;
	unsigned long mils;
	Zime() {
		this->secs = 0;
		this->mils = 0;
	}
	Zime(long long javatime) {
		this->secs = javatime / 1000;
		this->mils = javatime % 1000;
	}
	Zime(unsigned long secs, unsigned long millis) {
		this->secs = secs;
		if (millis < 1000)
			this->mils = millis;
		else
			this->mils = 0;
	}

	long long millis() {
		return ((uint64_t)this->secs * 1000) + (this->mils % 1000);
	}
};

static bool wifi_connected = false;

const static String server_path = "192.168.137.1";
const static uint16_t server_port = 8080;
static bool server_connected = false;

static vector<String> vec_data;
static uint64_t first = 0;
static uint64_t last = 0;

static bool gd_get_data = true;
static Zime lz_get_data;
static Zime lz_reconnect_wifi;
static Zime lz_reconnect_http;

static FS& zfs = SD_MMC;
static ESP32Time rtcTime(0);
static HTTPClient zhttp;

//get current Time
Zime get_zime() {
	return Zime(rtcTime.getEpoch(), rtcTime.getMillis());
}

void log(String s) {
	s.replace('S', 's');
	Serial.println("LOG : " + s);
}

// clear out the soil  values array
void emp_soil_values(double S[SOIL_NUM]) {
	for (int i = 0; i < SOIL_NUM; i++) {
		S[i] = 0;
	}
}
//  get soil values separated by /
bool get_soil_values(char* str, double S[SOIL_NUM]) {
	char* ne = str;
	for (int i = 0; i < SOIL_NUM; i++) {
		char* lne = ne;
		double Val = strtod(ne, &ne);
		if (i < SOIL_NUM - 1) {
			if (*ne != '/' || ne == lne) {
				emp_soil_values(S);
				return false;
			}
		}
		else {
			if (*ne != '\0' || ne == lne) {
				emp_soil_values(S);
				return false;
			}
		}
		S[i] = Val;
		ne++;
	}
	return true;
}

// casts the string sent by the arduino to the variables, and returns success of op, if failed, it empties out the variables;
bool get_values(char* str, double& T, double& H, double& L, double& W, double S[SOIL_NUM]) {
	char* ne = str;
	for (int i = 0; i < 4; i++) {
		char* lne = ne;
		//log(ne);
		double Val = strtod(ne, &ne);
		//log(Val);
		if (*ne != ',' || ne == lne) {
			T = 0; H = 0; L = 0; W = 0;
			emp_soil_values(S);
			return false;
		}
		switch (i) {
		case 0:
			T = Val;
			break;
		case 1:
			H = Val;
			break;
		case 2:
			L = Val;
			break;
		case 3:
			W = Val;
			break;
		}
		ne++;
	}
	if (!get_soil_values(ne, S)) {
		T = H = L = W = 0;
		return false;
	}
	return true;
}

// asks the arduino for data, and saves it to buffer, returning success of the operation;
size_t get_data(char* buffer, size_t size = SER_BUF_SIZE) {
	Serial.print('S');
	bool startedRecv = false, finishedRecv = false;
	unsigned int ndx = 0;
	char startMarker = '>';
	char endMarker = '<';
	char rc;

	Zime lt = get_zime();
	while (get_zime().millis() - lt.millis() < GET_DATA_TIMEOUT && finishedRecv == false) {
		if (Serial.available()) {
			//log("avaialbe");
			rc = Serial.read();
			if (!startedRecv) {
				if (rc == startMarker)
					startedRecv = true;
			}
			else {
				if (rc != endMarker) {
					buffer[ndx] = rc;
					ndx++;
					if (ndx >= size)
						ndx = size - 1;
				}
				else {
					buffer[ndx] = '\0';
					ndx++;
					finishedRecv = true;
				}
			}
		}
	}
	if (startedRecv && finishedRecv && ndx > 0)
		return ndx;
	buffer[0] = '\0';
	return 0;
}

// get dt string that includes time from arduino dt.
String process_data(char* dtb, Zime czime) {
	String dt = "";
	double T, H, L, W, S[SOIL_NUM];
	if (!get_values(dtb, T, H, L, W, S))
		return "";
	dt += czime.millis();
	dt += ",";
	//log(dt+"processed_data");

	dt += String(T,20);
	dt += ",";

	dt += String(H, 20);;
	dt += ",";

	dt += String(L, 20);;
	dt += ",";

	dt += String(W, 20);;
	for (int i = 0; i < SOIL_NUM; i++) {
		dt += ",";
		dt += String(S[i], 20);
	}
	dt += '\n';
	return dt;
}

String gather_data(Zime czime) {
	char dt[SER_BUF_SIZE];
	if (get_data(dt)==0)
		return "";

	return process_data(dt, czime);
}

// to be run every loop it automatically sets wifi_connected, and starts reconnecting if not connected;
bool reconnect_wifi() {
	Zime ztime = get_zime();
	// if WiFi is down, try reconnecting every CHECK_WIFI_TIME seconds
	if(WiFi.status()==WL_CONNECTED){
		wifi_connected = true;
		return true;
	}
	if (wifi_connected)
		wifi_connected = false;

	if (ztime.millis() - lz_reconnect_wifi.millis() > AUTORECONNECT_INT_WIFI) {
		WiFi.disconnect();
		WiFi.reconnect();
		lz_reconnect_wifi = ztime;
	}
	return false;
}

// ping the server and check if input and output are working
bool pingit(unsigned long timeout_ms = HTTP_TIMEOUT,bool check_wifi=true) {
	//log("Start pinging");
	if (!wifi_connected && check_wifi) {
		return false;
	}
	//log("wifi con or not check");
	HTTPClient http;
	http.begin(server_path, server_port, "/ping");
	//log("http begen");
	http.setConnectTimeout(timeout_ms);
	http.setTimeout(timeout_ms);
	http.addHeader("Content-Type", "text/data");
	int code = http.POST("Input");
	String ans = http.getString();
	//log(String("") + "Pinged : " + code + " ; " + ans);
	if (code!= 200 ||  ans != "Output") {
		//log("pinged ssuccessfully");
		http.end();
		return false;
	}

	http.end();
	return true;
}

// sets the current time in rrtc to ctime;
bool setTime(ESP32Time& rtc, Zime ctime)
{
	rtc.setTime(ctime.secs,ctime.mils);
}

// gets the current time from server and uses it to set the rtc time
bool getNsetTime(unsigned long timeout_ms = HTTP_TIMEOUT) {
	HTTPClient http;
	http.begin(server_path, server_port, "/ping");
	http.setConnectTimeout(timeout_ms);
	http.setTimeout(timeout_ms);
	
	http.addHeader("Content-Type", "text/data");
	int code = http.POST("Time");
	String ans = http.getString();
	//log(String("") + "timing: " + code + "; "+ ans);
	if (code != 200){
		http.end();
		return false;
	}
	//log("ans: " + ans);
	uint64_t timems = strtoull(ans.c_str(), nullptr, 10);
	//log(String("")+ "timems:" + timems);
	http.end();
	if (timems == 0) 
		return false;
	//log("Time set up done but...");
	Zime crt(timems);
	//log(String("") + timems + " crt:" + crt.secs + ";" + crt.mils + ":" + crt.millis());
	rtcTime.setTime(crt.secs,crt.mils);
	return true;
}

// to be run every loop it automatically sets server_connecterd, and starts reconnecting if not connected;
bool reconnect_http() {
	if (!wifi_connected)
		return false;
	Zime ztime = get_zime();
	// if WiFi is down, try reconnecting every CHECK_WIFI_TIME seconds
	if (zhttp.connected()) {
		server_connected = true;
	}else if (server_connected)
		server_connected = false;

	if (ztime.millis() - lz_reconnect_http.millis() > AUTORECONNECT_INT_HTTP) {
		if (server_connected) {
			zhttp.addHeader("Content-Type", "text/data");
			if (zhttp.POST("TEST") != 200 || zhttp.getString() != "TESTED") {
				server_connected = false;
				lz_reconnect_http = ztime;
				return false;
			}
			else {
				server_connected = true;
				lz_reconnect_http = ztime;
				return true;
			}
		}

		if (!pingit()) {
			server_connected = false;
			lz_reconnect_http = ztime;
			return false;
		}

		
		zhttp.end();
		zhttp.begin(server_path, server_port, "/api/send");
		zhttp.setConnectTimeout(HTTP_TIMEOUT);
		zhttp.setTimeout(HTTP_TIMEOUT);
		zhttp.addHeader("Content-Type", "text/data");

		if (zhttp.POST("TEST") != 200 || zhttp.getString() != "TESTED") {
			server_connected = false;
			lz_reconnect_http = ztime;
			return false;
		}
		server_connected = true;
		lz_reconnect_http = ztime;
		return true;
	}

	return server_connected;
}


//TODONE: add open_http to pingit and whatever functionn changes server_concted, so that s_c would mean that the http is working.
bool save2file() {
	File tmpf = zfs.open("/tmp", FILE_WRITE);

	if (!tmpf)
		return false;

	for (String dt : vec_data) {
		if (!tmpf.print(dt)) {
			tmpf.close();
			zfs.remove("/tmp");
			return false;
		}
	}
	tmpf.close();
	/// i don't know if this last==0 will bring about problems or not
	// TODOnt: verify last==0 is ok.
	if (first == 0 || first > last) {
		first = 1;
		last = 0;
	}
	if (!zfs.rename("/tmp", "/" + String(last + 1, 10))) {
		zfs.remove("/tmp");
		return false;
	}
	last++;
	vec_data.clear();
	return true;
}

// lopads the first and last files from sdcard;
bool load_first_last() {
	//log("get files");
	File rdir = zfs.open("/");
	if (!rdir)
		return false;
	//log("opened root");
	if (!rdir.isDirectory())
		return false;
	//log("it is a dir");
	String fl = rdir.getNextFileName();
	fl[0] = ' ';
	while (fl != "") {
		//log(String("File  : ") + fl);
		uint64_t vl = strtoull(fl.c_str(), nullptr, 10);
		if (vl > 0) {
			if (vl < first || first == 0)
				first = vl;
			if (vl > last)
				last = vl;
		}
		fl = rdir.getNextFileName();
		fl[0] = ' ';
	}
	return true;

}

bool send_data(String dt, String good_res = "AKNOWLEGED", bool check_server = true) {
	if (!server_connected && check_server)
		return false;
	//log(String("") + "Started The Sending Of Data: " + dt);
	zhttp.addHeader("Content-Type", "text/data");
	int code = zhttp.POST(dt);
	if (code < 0) {
		server_connected = false;
		return false;
	}
	String ans = zhttp.getString();
	//log(String("") + "sent data and received :" +code+";"+ ans);
	if (code != 200)
		return false;
	if (ans != good_res)
		return false;

	return true;
}

bool send_file(uint64_t i, String good_res = "AKNOWLEGED") {
	//log(String("Sending ") + i + " ...");
	if (!server_connected)
		return false;

	//log("server is connected");

	String path = "/";
	path+=i;

	if (!zfs.exists(path)) {
		//log("File Doesnt exists?");
		return true;
	}

	//log("files exists");

	File tmpf = zfs.open(path);
	if (!tmpf)
		return false;

	//log("file is open");

	String tmp_str = "File:";
	tmp_str += tmpf.readString();;
	tmpf.close();
	log(tmp_str);
	if (tmp_str == "") {
		return false;
	}
	
	zhttp.addHeader("Content-Type", "text/data");
	int code = zhttp.POST(tmp_str);
	//log(String("code is:") + code);
	if (code < 0) {
		server_connected = false;
		return false;
	}

	if (code != 200)
		return false;

	if (zhttp.getString() != good_res)
		return false;

	//log("aknowledged");
	//if (!zfs.rename(path, String("/sentdata_") + i))
		return zfs.remove(path);
	//log("renamed");
	return true;
}

bool send_files() {
	if (first == 0 || first > last) {
		first = 1;
		last = 0;
		return true;
	}
	log("Started sending files");
	bool good = true;
	unsigned long lsterr = 0;
	for (uint64_t i = first; i <= last && i != 0; i++) {
		if (!send_file(i)) {
			if (!server_connected)
				return false;
			else {
				lsterr = i;
				good = false;
			}
		}
		if (good) {
			first++;
		}	
	}
	if (lsterr < last)
		last = lsterr;
	if (good || first == 0 || first > last) {
		first = 1;
		last = 0;
	}
	return good;
}


// connect to wifi, coneect to server , get time, set time, connect to arduino, get a sample, send the sample to the server. return.
// TODOnt: fill up lst_zime too;
bool startup_rootine(uint32_t timeout_secs = 30) {
	unsigned long frstime = millis();
	unsigned long lstime = millis();
	unsigned long ctime = millis();
	bool wifi_on = false;
	bool server_up = false;
	bool time_up = false;
	bool http_on = false;
	bool arduino_on = false;
	//log("StartUp Routineed, waiting for wifi...");
	while (ctime - frstime < timeout_secs * 1000) {
		if (!wifi_on) {
			if (WiFi.status() == WL_CONNECTED) {
				//log("Wifi connected, wating for server");
				wifi_on = true;
				lstime = ctime;
				continue;
			}
			delay(5);

			if (ctime - lstime > AUTORECONNECT_INT_WIFI) {
				//log("wifi reconnected");
				WiFi.disconnect();
				WiFi.reconnect();
				lstime = ctime;
			}
		}
		else if (!server_up) {
			
			if (pingit(3000, false)) {
				//log("Pinged server");
				server_up = true;
				lstime = ctime - 1000;
			}
		}
		else if (!time_up) {
			if (getNsetTime(3000)) {
				//log("Time is Up");
				time_up = true;
				lstime = ctime - 1000;
			}
		}
		else if (!http_on) {
			if (ctime - lstime > 1000) {
				lstime = ctime;
				zhttp.end();
				zhttp.begin(server_path, server_port, "/api/send");
				zhttp.setConnectTimeout(HTTP_TIMEOUT);
				zhttp.setTimeout(HTTP_TIMEOUT);
				zhttp.addHeader("Content-Type", "text/data");
				if (zhttp.POST("TEST") == 200 && zhttp.getString() == "TESTED") {
					//log("server Tested");
					http_on = true;
					lstime = ctime - 1000;
				}
			}
		}
		else if (!arduino_on) {
			if (lstime - ctime >= 1000) {
				//log("Asking For Data...");
				String dt= gather_data(get_zime());
				//log("REceiveed DATA:");
				//log(dt);
				if (dt != "") {
					//log("sending data...");
					if (send_data(String("Sample:") + dt, "SAMPLED",false)) {
						//log("arduino  good....");
						arduino_on = true;
						break;
					}
				}
			}
		}
		ctime = millis();
	}
	if (!wifi_on || !time_up || !http_on || !arduino_on) {
		return false;
	}
	wifi_connected = true;
	server_connected = true;
	// loop wait for wifi //
	// loop wait for http //
	// get time //
	// set time //
	// loop wait for arduino //
	// send a sample to server //
	return true;
}


/// text/data


// the setup function runs once when you press reset or power the board
void setup() {
	//WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
	bool bigger_good = true;
	pinMode(33, OUTPUT);
	digitalWrite(33, !bigger_good);
	Serial.begin(115200);
	Serial.setTimeout(HTTP_TIMEOUT);
	//log("Started");
	WiFi.mode(WIFI_STA);
	WiFi.begin("AIFARM", "123456987");
	//log(String("")+"Wifi Begin : " + WiFi.status());
	if (!startup_rootine(30))
		bigger_good = false;
	//log(String("") + "startup rootine finished :" + bigger_good);
	if (!SD_MMC.begin())
		bigger_good = false;
	if (SD_MMC.cardType() == CARD_NONE)
		bigger_good = false;
	zfs = SD_MMC;
	if (!load_first_last())
		bigger_good = false;
	//log(String("") + "finished seting up :" + bigger_good);
	//log(String("") + "Last : " + last + "First:" + first);
	send_files();
	digitalWrite(33, !bigger_good);
	if (!bigger_good) {
		for (;;) {/* halt */ }
	}
}

//double a, b, c, d;
// the loop function runs over and over again until power down or reset
void loop() {
	Zime czime = get_zime();
	if (czime.secs - lz_get_data.secs > 1 || !gd_get_data) {
		String dt;
		if ((dt = gather_data(czime)) == "") {
			if (gd_get_data) {
				gd_get_data = false;
				digitalWrite(33, !false);
			}
			return;
		}
		else if (!gd_get_data) {
			gd_get_data = true;
			digitalWrite(33, !true);
		}

		bool gd_til_now = true;
		if (server_connected && gd_til_now) {
			if (first > 0 && last >= first) {
				gd_til_now=send_files();
			}
			else if (first == 0 || last > 0)
				first = 1; last = 0;
			
		}
		if (server_connected&&gd_til_now) {			
			if (vec_data.size() > 0) {
				size_t count=0,osize = vec_data.size();
				for (int i = 0; i < osize; i++) {
					if (count >= osize || count >= vec_data.size() || !server_connected)
						break;

					if (send_data(vec_data[count])) {
						vec_data.erase(next(vec_data.begin(), count));
					}
					else {
						count++;
					}
				}
				gd_til_now = vec_data.size() == 0;
			}
			
			
		}
		if (server_connected) {
			//send cdata
			send_data(dt);
		}
		
		if(!server_connected){
			if (vec_data.size() >= DATA_SIZE) {
				save2file();
			}
			vec_data.push_back(dt);
		}

		// if first and last are set, empty out the sdcard.
		// if vector has data empty it out too
		// send the current data
		
		// if not then check if vector is full
		// if that is the case empty it out
		// if not then just add data to vector
		
		// TODONE: add to gather_data if servers -> send else add to vector, if vecotr > datasize save data, then add add.
	}
	
	reconnect_wifi();
	reconnect_http();
}
