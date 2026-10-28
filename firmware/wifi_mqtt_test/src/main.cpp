#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include "secrets.h"

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
unsigned long lastWifiAttempt = 0, lastMqttAttempt = 0, lastReport = 0;
uint32_t sequence = 0;
String clientId;

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\nESP8266 local WiFi + MQTT test");
  WiFi.persistent(false); // Test credentials stay in this firmware, not WiFi SDK settings.
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttempt = millis();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  mqtt.setSocketTimeout(3);
  clientId = "rd-web-esp8266-" + String(ESP.getChipId(), HEX);
  Serial.println("Connecting to WiFi...");
}

void loop() {
  const unsigned long now = millis();
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiAttempt >= 10000) {
      lastWifiAttempt = now;
      Serial.println("WiFi disconnected, retrying...");
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
    delay(10);
    return;
  }
  if (!mqtt.connected()) {
    if (now - lastMqttAttempt >= 3000) {
      lastMqttAttempt = now;
      Serial.print("WiFi connected. IP: "); Serial.println(WiFi.localIP());
      Serial.print("Connecting MQTT to "); Serial.println(MQTT_HOST);
      // Unique device client ID, no cloud credentials, no subscription to commands.
      if (mqtt.connect(clientId.c_str())) Serial.println("MQTT connected.");
      else { Serial.print("MQTT connection failed: "); Serial.println(mqtt.state()); }
    }
    delay(10);
    return;
  }
  mqtt.loop();
  if (now - lastReport >= 2000) {
    lastReport = now;
    char payload[384];
    String ip = WiFi.localIP().toString();
    snprintf(payload, sizeof(payload),
      "{\"type\":\"wifi_test\",\"device\":\"%s\",\"sequence\":%lu,\"uptime_ms\":%lu,\"ip\":\"%s\",\"rssi_dbm\":%ld,\"free_heap\":%lu}",
      clientId.c_str(), (unsigned long)++sequence, now, ip.c_str(), (long)WiFi.RSSI(), (unsigned long)ESP.getFreeHeap());
    if (mqtt.publish(MQTT_TOPIC, payload, false)) Serial.println(payload);
    else Serial.println("MQTT publish failed.");
  }
  delay(5);
}
