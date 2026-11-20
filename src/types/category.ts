export type CategoryDto = {
  categoryId: number;
  libelle: string;
  code_uuid: string;
};

export type CharacteristicType = 'number' | 'text' | 'checkbox' | 'select';

export type CharacteristicDto = {
  attributeId: number;
  typeCategorie: string;
  libelle: string;
  type: CharacteristicType;
  etat: boolean;
  values: string[];
};
