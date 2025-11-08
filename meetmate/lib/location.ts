import * as Location from "expo-location";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export const requestLocation = async (): Promise<Coordinates | null> => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== Location.PermissionStatus.GRANTED) {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
};
