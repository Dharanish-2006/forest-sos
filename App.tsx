import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
  Vibration,
} from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import Geolocation from "react-native-geolocation-service";
import RNFS from "react-native-fs";
import Sound from "react-native-sound";
import SendSMS from "react-native-sms"; // yarn add react-native-sms
import { downloadTiles } from "./tileDownloader";

type Coord = { latitude: number; longitude: number };

export default function App() {
  const [location, setLocation] = useState<Coord | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Coord[]>([]);
  const [alarm, setAlarm] = useState<Sound | null>(null);
  const [isSosActive, setIsSosActive] = useState(false);

  const watchId = useRef<number | null>(null);

  // Request location permissions
  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "This app needs access to your location for SOS tracking.",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  // Start watching position
  useEffect(() => {
    (async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert("Permission denied", "Cannot track location.");
        return;
      }

      watchId.current = Geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const newCoord = { latitude, longitude };
          setLocation(newCoord);
          setBreadcrumbs((prev) => [...prev, newCoord]);
        },
        (err) => console.log("Location error:", err),
        { enableHighAccuracy: true, distanceFilter: 5, interval: 5000 }
      );
    })();

    return () => {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  // Load alarm sound
  useEffect(() => {
    Sound.setCategory("Playback");
    const s = new Sound("alarm.mp3", Sound.MAIN_BUNDLE, (err) => {
      if (err) {
        console.log("Failed to load alarm", err);
      } else {
        setAlarm(s);
      }
    });
    return () => {
      s.release();
    };
  }, []);

  // SOS handler
  const triggerSOS = () => {
    if (!location) {
      Alert.alert("No location available", "Wait until GPS locks.");
      return;
    }
    setIsSosActive(true);

    // Start vibration
    Vibration.vibrate([500, 1000], true);

    // Play alarm
    alarm?.play(() => {
      alarm.setNumberOfLoops(-1); // loop indefinitely
    });

    // Prepare SMS
    const msg = `🚨 SOS! I am lost.\nMy location: ${location.latitude}, ${location.longitude}`;
    SendSMS.send(
  {
    body: msg,
    recipients: ["8939778453"], // replace with rescue number
    allowAndroidSendWithoutReadPermission: true,
  },
  (completed, cancelled, error) => {
    console.log("SMS Callback:", { completed, cancelled, error });
  }
);


  const stopSOS = () => {
    setIsSosActive(false);
    Vibration.cancel();
    alarm?.stop();
  };

  const handleDownloadMap = () => {
    if (location) {
      downloadTiles(location, [14, 15], 2); // zoom levels 14–15, radius 2
      Alert.alert("Downloading tiles...", "Map tiles are being saved offline.");
    } else {
      Alert.alert("No location yet", "Wait for GPS fix before downloading.");
    }
  };

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            ...location,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
        >
          <UrlTile
            urlTemplate={`${RNFS.DocumentDirectoryPath}/tiles/{z}/{x}/{y}.png`}
            zIndex={-1}
          />
          {breadcrumbs.length > 1 && (
            <Polyline coordinates={breadcrumbs} strokeColor="red" strokeWidth={3} />
          )}
          <Marker coordinate={location} title="You are here" />
        </MapView>
      )}

      {/* Download Map Button */}
      <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadMap}>
        <Text style={styles.downloadText}>Download Map</Text>
      </TouchableOpacity>

      {/* SOS / Stop Button */}
      {!isSosActive ? (
        <TouchableOpacity style={styles.sosButton} onPress={triggerSOS}>
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.stopButton} onPress={stopSOS}>
          <Text style={styles.stopText}>STOP</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  sosButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "red",
    padding: 30,
    borderRadius: 100,
  },
  sosText: { color: "white", fontSize: 28, fontWeight: "bold" },
  stopButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "black",
    padding: 30,
    borderRadius: 100,
  },
  stopText: { color: "white", fontSize: 28, fontWeight: "bold" },
  downloadButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "blue",
    padding: 12,
    borderRadius: 8,
  },
  downloadText: { color: "white", fontWeight: "bold" },
});
}
