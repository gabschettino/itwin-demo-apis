import { BaseAPIClient } from "../base/BaseAPIClient";
import { API_CONFIG } from "../config/api.config";
import type { iTwinUserMember, iTwinUserMembersResponse, iTwinRolesResponse, AccessControlRole, AddiTwinUserMembersResponse } from "../types";

export class AccessControlService extends BaseAPIClient {
  public async addiTwinUserMembers(
    iTwinId: string,
    members: { email: string; roleIds: string[] }[],
    customMessage?: string
  ): Promise<AddiTwinUserMembersResponse | null> {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.ACCESS_CONTROL.MEMBERS(iTwinId);
      const token = await (await import("../AuthService")).authService.getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `${token}`,
          Accept: "application/vnd.bentley.itwin-platform.v2+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          members,
          ...(customMessage ? { customMessage } : {}),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        try {
          const err = JSON.parse(text);
          throw new Error(err?.error?.message || `Add member failed (${response.status})`);
        } catch (parseErr) {
          if (parseErr instanceof Error) throw parseErr;
          throw new Error(`Add member failed (${response.status})`);
        }
      }

      return await response.json();
    } catch (error) {
      console.error("Error adding iTwin user members:", error);
      throw error;
    }
  }

  public async updateiTwinUserMember(
    iTwinId: string,
    memberId: string,
    roleIds: string[]
  ): Promise<iTwinUserMember | null> {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.ACCESS_CONTROL.MEMBER(iTwinId, memberId);
      const token = await (await import("../AuthService")).authService.getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: "PATCH",
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `${token}`,
          Accept: "application/vnd.bentley.itwin-platform.v2+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleIds }),
      });

      if (!response.ok) {
        const text = await response.text();
        try {
          const err = JSON.parse(text);
          throw new Error(err?.error?.message || `Update member failed (${response.status})`);
        } catch (parseErr) {
          if (parseErr instanceof Error) throw parseErr;
          throw new Error(`Update member failed (${response.status})`);
        }
      }

      const data = await response.json();
      return data.member ?? null;
    } catch (error) {
      console.error("Error updating iTwin user member:", error);
      throw error;
    }
  }

  public async deleteiTwinUserMember(iTwinId: string, memberId: string): Promise<boolean> {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.ACCESS_CONTROL.MEMBER(iTwinId, memberId);
      const token = await (await import("../AuthService")).authService.getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `${token}`,
          Accept: "application/vnd.bentley.itwin-platform.v2+json",
        },
      });

      if (response.status === 204) return true;

      if (!response.ok) {
        let message = `Remove member failed with status ${response.status}`;
        try {
          const err = await response.json();
          message = err?.error?.message || message;
        } catch { /* ignore parse error */ }
        throw new Error(message);
      }
      return true;
    } catch (error) {
      console.error("Error removing iTwin user member:", error);
      throw error;
    }
  }

  public async getiTwinUserMembers(iTwinId: string): Promise<iTwinUserMember[] | null> {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.ACCESS_CONTROL.MEMBERS(iTwinId);

      const data = await this.fetch<iTwinUserMembersResponse>(endpoint, {
        headers: {
          Accept: "application/vnd.bentley.itwin-platform.v2+json",
        },
      });
      
      return data.members.filter(member => 
        member.email !== null || member.givenName !== null || member.surname !== null
      );
    } catch (error) {
      console.error("Error fetching iTwin user members:", error);
      return null;
    }
  }

  public async getUserById(iTwinId: string, userId: string): Promise<iTwinUserMember | null> {
    try {
      const members = await this.getiTwinUserMembers(iTwinId);
      if (!members) return null;
      
      return members.find(member => member.id === userId) || null;
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }
  }

  public async getiTwinRoles(iTwinId: string): Promise<AccessControlRole[] | null> {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.ACCESS_CONTROL.ROLES(iTwinId);
      const data = await this.fetch<iTwinRolesResponse>(endpoint, {
        headers: {
          Accept: "application/vnd.bentley.itwin-platform.v2+json",
        },
      });
      return data.roles ?? [];
    } catch (error) {
      console.error("Error fetching iTwin roles:", error);
      return null;
    }
  }

  public async deleteiTwinRole(iTwinId: string, roleId: string): Promise<boolean> {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.ACCESS_CONTROL.ROLE(iTwinId, roleId);
      // Use native fetch because BaseAPIClient.fetch assumes JSON response
      const token = await (await import("../AuthService")).authService.getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `${token}`,
          Accept: "application/vnd.bentley.itwin-platform.v2+json",
        },
      });

      if (response.status === 204) return true;

      if (!response.ok) {
        let message = `Delete role failed with status ${response.status}`;
        try {
          const err = await response.json();
          message = err?.error?.message || message;
  } catch { /* ignore parse error */ }
        throw new Error(message);
      }
      return true;
    } catch (error) {
      console.error("Error deleting iTwin role:", error);
      return false;
    }
  }

  public async updateiTwinRole(
    iTwinId: string,
    roleId: string,
    payload: Partial<Pick<AccessControlRole, 'displayName' | 'description' | 'permissions'>>
  ): Promise<AccessControlRole | null> {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.ACCESS_CONTROL.ROLE(iTwinId, roleId);
      const token = await (await import("../AuthService")).authService.getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `${token}`,
          Accept: 'application/vnd.bentley.itwin-platform.v2+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        try {
          const err = JSON.parse(text);
          throw new Error(err?.error?.message || `Update role failed (${response.status})`);
        } catch (parseErr) {
          if (parseErr instanceof Error) throw parseErr;
          throw new Error(`Update role failed (${response.status})`);
        }
      }

      const data = await response.json();
      return data.role ?? null;
    } catch (error) {
      console.error('Error updating iTwin role:', error);
      return null;
    }
  }

  public async listAllPermissions(): Promise<string[] | null> {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.ACCESS_CONTROL.ALL_PERMISSIONS;
      const token = await (await import("../AuthService")).authService.getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `${token}`,
          Accept: 'application/vnd.bentley.itwin-platform.v2+json',
        }
      });
      if (!response.ok) {
        const txt = await response.text();
        try {
          const err = JSON.parse(txt);
          throw new Error(err?.error?.message || `Fetch permissions failed (${response.status})`);
        } catch (parseErr) {
          if (parseErr instanceof Error) throw parseErr;
          throw new Error(`Fetch permissions failed (${response.status})`);
        }
      }
      const data = await response.json();
      return data.permissions ?? [];
    } catch (e) {
      console.error('Error listing all permissions:', e);
      return null;
    }
  }

  public async createiTwinRole(
    iTwinId: string,
    payload: Pick<AccessControlRole, 'displayName' | 'description'>
  ): Promise<AccessControlRole | null> {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.ACCESS_CONTROL.ROLES(iTwinId);
      const token = await (await import("../AuthService")).authService.getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `${token}`,
          Accept: 'application/vnd.bentley.itwin-platform.v2+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (response.status !== 201) {
        const text = await response.text();
        try {
          const err = JSON.parse(text);
          throw new Error(err?.error?.message || `Create role failed (${response.status})`);
        } catch (parseErr) {
          if (parseErr instanceof Error) throw parseErr;
          throw new Error(`Create role failed (${response.status})`);
        }
      }
      const data = await response.json();
      return data.role ?? null;
    } catch (e) {
      console.error('Error creating iTwin role:', e);
      return null;
    }
  }
}
