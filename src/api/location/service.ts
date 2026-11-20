import client from '../client';
import { CityDto, ZoneDto } from '@/src/types/location';

export const getCities = async (): Promise<CityDto[]> => {
  const response = await client.get('/api/akkarak/liste-villes');
  return response.data;
};

export const getZonesByCity = async (codeUuid: string): Promise<ZoneDto[]> => {
  const response = await client.get(`/api/akkarak/${codeUuid}/liste-zones`);
  return response.data;
};
