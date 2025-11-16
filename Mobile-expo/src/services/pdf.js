import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';

export async function createAndSaveInvoicePdf(htmlContent, fileName = 'invoice.pdf'){
  // prints to a temporary file (uri)
  const { uri } = await Print.printToFileAsync({ html: htmlContent });
  const dest = `${FileSystem.documentDirectory}${fileName}`;
  // remove if exists
  try {
    const info = await FileSystem.getInfoAsync(dest);
    if(info.exists) await FileSystem.deleteAsync(dest);
  } catch(e){}
  await FileSystem.moveAsync({ from: uri, to: dest });
  return dest;
}