import { Platform } from 'react-native';
import client from '../client';

const getMimeType = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'm4v':
      return 'video/x-m4v';
    default:
      return 'application/octet-stream';
  }
};

export const uploadFile = async (
  fileUri: string,
  type: string,
  id: number
): Promise<{ success: boolean; message: string }> => {
  const fileName = fileUri.split('/').pop() || `file-${Date.now()}`;
  const mimeType = getMimeType(fileName);

  const formData = new FormData();

  formData.append('file', {
    uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  console.log('UPLOAD URI =>', fileUri);
  console.log('UPLOAD TYPE =>', type);
  console.log('UPLOAD ID =>', id);
  console.log('UPLOAD NAME =>', fileName);
  console.log('UPLOAD MIME =>', mimeType);

  const response = await client.post('/api-files/upload', formData, {
    params: { type, id },
    headers: {
      Accept: 'application/json',
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};