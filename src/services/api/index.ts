import { iTwinService } from "./iTwinService";
import { iModelService } from "./IModelService";
import { RealityModelingService } from "./RealityModelingService";
import { AccessControlService } from "./AccessControlService";
import { RealityManagementService } from "./RealityManagementService";
import { synchronizationService as synchronizationApiService } from "./SynchronizationService";
import { storageService as storageApiService } from "./StorageService";
import type { CreateJobRequest } from "../types";

// Service instances
export const iTwinApiService = new iTwinService();
export const iModelApiService = iModelService;
export const realityModelingService = new RealityModelingService();
export const accessControlService = new AccessControlService();
export const realityManagementService = new RealityManagementService();
export const synchronizationService = synchronizationApiService;
export const storageService = storageApiService;

// Unified service interface (for backward compatibility)
export class iTwinAPIService {
  // iTwin methods
  public async getMyiTwins() {
    return iTwinApiService.getMyiTwins();
  }

  // Reality Modeling methods
  public async createWorkspace(name: string, iTwinId?: string) {
    return realityModelingService.createWorkspace(name, iTwinId);
  }

  public async getWorkspaces() {
    return realityModelingService.getWorkspaces();
  }

  public async createJob(jobRequest: CreateJobRequest) {
    return realityModelingService.createJob(jobRequest);
  }

  public async getJobs() {
    return realityModelingService.getJobs();
  }

  public async getJob(jobId: string) {
    return realityModelingService.getJob(jobId);
  }

  public async submitJob(jobId: string) {
    return realityModelingService.submitJob(jobId);
  }

  public async cancelJob(jobId: string) {
    return realityModelingService.cancelJob(jobId);
  }

  public async getJobProgress(jobId: string) {
    return realityModelingService.getJobProgress(jobId);
  }

  // Access Control methods
  public async getiTwinUserMembers(iTwinId: string) {
    return accessControlService.getiTwinUserMembers(iTwinId);
  }

  public async addiTwinUserMembers(
    iTwinId: string,
    members: { email: string; roleIds: string[] }[],
    customMessage?: string
  ) {
    return accessControlService.addiTwinUserMembers(iTwinId, members, customMessage);
  }

  public async updateiTwinUserMember(iTwinId: string, memberId: string, roleIds: string[]) {
    return accessControlService.updateiTwinUserMember(iTwinId, memberId, roleIds);
  }

  public async deleteiTwinUserMember(iTwinId: string, memberId: string) {
    return accessControlService.deleteiTwinUserMember(iTwinId, memberId);
  }

  public async getiTwinRoles(iTwinId: string) {
    return accessControlService.getiTwinRoles(iTwinId);
  }

  public async deleteiTwinRole(iTwinId: string, roleId: string) {
    return accessControlService.deleteiTwinRole(iTwinId, roleId);
  }

  public async updateiTwinRole(
    iTwinId: string,
    roleId: string,
    payload: Partial<Pick<import('../types').AccessControlRole, 'displayName' | 'description' | 'permissions'>>
  ) {
    return accessControlService.updateiTwinRole(iTwinId, roleId, payload);
  }

  public async listAllPermissions() {
    return accessControlService.listAllPermissions();
  }

  public async createiTwinRole(
    iTwinId: string,
    payload: Pick<import('../types').AccessControlRole, 'displayName' | 'description'>
  ) {
    return accessControlService.createiTwinRole(iTwinId, payload);
  }

  // Reality Management methods
  public async listRealityData(params?: import("../types").RealityDataListParams) {
    return realityManagementService.listRealityData(params);
  }
}

// Default export for backward compatibility
export const iTwinApiServiceLegacy = new iTwinAPIService();
