export interface iTwin {
  id: string;
  class: string;
  subClass: string;
  type: string | null;
  number: string;
  displayName: string;
  status: string;
  dataCenterLocation?: string;
  geographicLocation?: string;
  latitude?: number;
  longitude?: number;
  ianaTimeZone?: string;
}

export interface iTwinsResponse {
  iTwins: iTwin[];
  _links: {
    self: { href: string };
    next?: { href: string };
  };
}

export interface iModel {
  id: string;
  displayName: string;
  description?: string | null;
  state?: string;
  createdDateTime?: string;
  updatedDateTime?: string;
}

export interface iModelsResponse {
  iModels: iModel[];
  _links: {
    self: { href: string };
    next?: { href: string };
  };
}
