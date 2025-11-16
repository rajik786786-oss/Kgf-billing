import * as FileSystem from 'expo-file-system';

export async function saveLocalJson(key, value){
  try {
    const path = `${FileSystem.documentDirectory}${key}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(value));
    return path;
  } catch(e){
    throw e;
  }
}

export async function readLocalJson(key){
  try {
    const path = `${FileSystem.documentDirectory}${key}.json`;
    const exists = await FileSystem.getInfoAsync(path);
    if(!exists.exists) return null;
    const txt = await FileSystem.readAsStringAsync(path);
    return JSON.parse(txt);
  } catch(e){
    return null;
  }
}