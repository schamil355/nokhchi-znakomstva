import * as ImagePicker from "expo-image-picker";

export type PickedImage = {
  uri: string;
  width: number;
  height: number;
  type?: string;
};

export const pickImageFromLibrary = async (): Promise<PickedImage | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: false,
    quality: 0.8,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const [asset] = result.assets;

  return {
    uri: asset.uri,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    type: asset.mimeType,
  };
};
