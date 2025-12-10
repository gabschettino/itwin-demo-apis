import { BaseAPIClient } from "../base/BaseAPIClient";

interface AuthorizationInformationResponse {
  authorizationInformation: {
    isUserAuthorized: boolean;
    _links?: { authorizationUrl?: { href?: string | null } };
  };
}

class ExportAuthorizationService extends BaseAPIClient {
  async getAuthorizationInformation(redirectUrl: string): Promise<AuthorizationInformationResponse['authorizationInformation'] | null> {
    try {
      const encoded = encodeURIComponent(redirectUrl);
      const resp = await this.fetch<AuthorizationInformationResponse>(`/export/authorizationInformation?redirectUrl=${encoded}`);
      return resp?.authorizationInformation || null;
    } catch (e) {
      console.error('Failed to get export authorization information', e);
      return null;
    }
  }
}

export const exportAuthorizationService = new ExportAuthorizationService();
