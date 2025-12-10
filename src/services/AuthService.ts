import { BrowserAuthorizationClient } from "@itwin/browser-authorization";
import type { BrowserAuthorizationClientConfiguration } from "@itwin/browser-authorization";
import { authConfig } from "../config/auth";

export interface MeProfile {
  id: string;
  displayName: string;
  email: string;
  givenName: string;
  surname: string;
  organizationName: string;
  alternateEmail: string;
  phone: string | null;
  city: string | null;
  country: string;
  language: string;
  createdDateTime: string;
}

interface MeResponse {
  user: MeProfile;
}

export class AuthService {
  private client: BrowserAuthorizationClient;

  constructor(configuration: BrowserAuthorizationClientConfiguration) {
    this.validateConfiguration(configuration);
    this.client = new BrowserAuthorizationClient(configuration);
  }

  private validateConfiguration(configuration: BrowserAuthorizationClientConfiguration) {
    if (!configuration.clientId) {
      throw new Error("Please add a valid OIDC client id to the configuration. See the README for more information.");
    }
    if (!configuration.scope) {
      throw new Error("Please add valid scopes for your OIDC client. See the README for more information.");
    }
    if (!configuration.redirectUri) {
      throw new Error("Please add a valid redirect URI to the configuration. See the README for more information.");
    }
  }

  public async signIn(): Promise<void> {
    await this.client.handleSigninCallback();
    return this.client.signIn();
  }

  async signOut(): Promise<void> {
    try {
      await this.client.signOutRedirect();
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    }
  }

  async isSignedIn(): Promise<boolean> {
    try {
      const token = await this.client.getAccessToken();
      return !!token;
    } catch (error) {
      console.error("Error checking sign in status:", error);
      return false;
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const token = await this.client.getAccessToken();
      return token || null;
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
  }

  async getMe(): Promise<MeProfile | null> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        return null;
      }

      const response = await fetch("https://api.bentley.com/users/me", {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          Accept: "application/vnd.bentley.itwin-platform.v1+json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }

      const meResponse: MeResponse = await response.json();
      return meResponse.user;
    } catch (error) {
      console.error("Error getting 'me' profile:", error);
      return null;
    }
  }

  getClient(): BrowserAuthorizationClient {
    return this.client;
  }
}

// Create a singleton instance
export const authService = new AuthService(authConfig);
