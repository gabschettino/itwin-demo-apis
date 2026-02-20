import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings, 
  Mail, 
  Eye,
  Edit,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import type { iTwin, iTwinUserMember, AccessControlRole } from '../services/iTwinAPIService';
import { iTwinApiService } from '../services/iTwinAPIService';

interface AccessControlModalProps {
  iTwin: iTwin;
  isOpen: boolean;
  onClose: () => void;
}

function AccessControlModal({ iTwin, isOpen, onClose }: AccessControlModalProps) {
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState<iTwinUserMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [roles, setRoles] = useState<AccessControlRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [isDeletingRoleId, setIsDeletingRoleId] = useState<string | null>(null);
  const [deleteRoleCandidate, setDeleteRoleCandidate] = useState<AccessControlRole | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isUpdatingRoleId, setIsUpdatingRoleId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AccessControlRole | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [editSelectedPermissions, setEditSelectedPermissions] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Fetch members and roles when modal opens
  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoadingMembers(true);
      setMembersError(null);
      try {
        const fetchedMembers = await iTwinApiService.getiTwinUserMembers(iTwin.id);
        
        if (fetchedMembers) {
          setMembers(fetchedMembers);
        } else {
          setMembersError('Unable to fetch members. You may not have permission to view members of this iTwin.');
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        setMembersError('Failed to fetch members. Please check your permissions and try again.');
      } finally {
        setIsLoadingMembers(false);
      }
    };

    const fetchRoles = async () => {
      setIsLoadingRoles(true);
      setRolesError(null);
      try {
        const fetchedRoles = await iTwinApiService.getiTwinRoles(iTwin.id);
        if (fetchedRoles) {
          setRoles(fetchedRoles);
          if (fetchedRoles.length > 0) {
            setSelectedRole((prev) => prev || fetchedRoles[0].id);
          } else {
            setSelectedRole("");
          }
        } else {
          setRoles([]);
          setSelectedRole("");
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        setRolesError('Failed to fetch roles. Please check your permissions and try again.');
      } finally {
        setIsLoadingRoles(false);
      }
    };

    if (isOpen && iTwin.id) {
      fetchMembers();
      fetchRoles();
    }
  }, [isOpen, iTwin.id]);

  const refetchMembers = async () => {
    setIsLoadingMembers(true);
    setMembersError(null);
    try {
      const fetchedMembers = await iTwinApiService.getiTwinUserMembers(iTwin.id);
      
      if (fetchedMembers) {
        setMembers(fetchedMembers);
      } else {
        setMembersError('Unable to fetch members. You may not have permission to view members of this iTwin.');
      }
    } catch (error) {
      console.error('Error refetching members:', error);
      setMembersError('Failed to fetch members. Please check your permissions and try again.');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const refetchRoles = async () => {
    setIsLoadingRoles(true);
    setRolesError(null);
    try {
      const fetchedRoles = await iTwinApiService.getiTwinRoles(iTwin.id);
      if (fetchedRoles) {
        setRoles(fetchedRoles);
      } else {
        setRolesError('Unable to fetch roles.');
      }
    } catch (e) {
      console.error('Error refetching roles:', e);
      setRolesError('Failed to refetch roles.');
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId) || null;
    if (!role) return;
    setDeleteError(null);
    setDeleteRoleCandidate(role);
  };

  const confirmDeleteRole = async () => {
    if (!deleteRoleCandidate) return;
    const roleId = deleteRoleCandidate.id;
    setIsDeletingRoleId(roleId);
    // Optimistic update
    const prevRoles = roles;
    setRoles(prev => prev.filter(r => r.id !== roleId));
    try {
      const ok = await iTwinApiService.deleteiTwinRole(iTwin.id, roleId);
      if (!ok) {
        throw new Error('Delete failed');
      }
      // If deleted role was selected for invite default, adjust selection
      setSelectedRole(sr => (sr === roleId ? (roles[0]?.id || '') : sr));
      setDeleteRoleCandidate(null);
    } catch (e: unknown) {
      console.error('Delete role error:', e);
      let message = 'Failed to delete role.';
      if (typeof e === 'object' && e !== null && 'message' in e) {
        const maybeMsg = (e as Record<string, unknown>).message;
        if (typeof maybeMsg === 'string') message = maybeMsg;
      }
      setDeleteError(message);
      // revert optimistic change
      setRoles(prevRoles);
    } finally {
      setIsDeletingRoleId(null);
    }
  };

  const handleEditRole = async (roleId: string) => {
    setUpdateError(null);
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    setEditingRole(role);
    setEditDisplayName(role.displayName);
    setEditDescription(role.description || '');
    setEditSelectedPermissions([...(role.permissions || [])]);
    // Fetch all permissions if not already
    if (allPermissions.length === 0 && !isLoadingPermissions) {
      setIsLoadingPermissions(true);
      setPermissionsError(null);
      iTwinApiService.listAllPermissions()
        .then(perms => {
          if (perms) setAllPermissions(perms);
          else setPermissionsError('Failed to load permissions');
        })
        .catch(err => {
          console.error('Error loading permissions', err);
          setPermissionsError('Failed to load permissions');
        })
        .finally(() => setIsLoadingPermissions(false));
    }
    setIsEditDialogOpen(true);
  };

  const togglePermission = (perm: string) => {
    setEditSelectedPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const submitRoleUpdate = async () => {
    if (!editingRole) return;
    setIsUpdatingRoleId(editingRole.id);
    const roleId = editingRole.id;
    const optimisticPrev = roles;
    const updated: AccessControlRole = { ...editingRole, displayName: editDisplayName, description: editDescription, permissions: editSelectedPermissions };
    setRoles(prev => prev.map(r => r.id === roleId ? updated : r));
    try {
      const result = await iTwinApiService.updateiTwinRole(iTwin.id, roleId, {
        displayName: editDisplayName,
        description: editDescription,
        permissions: editSelectedPermissions,
      });
      if (!result) throw new Error('Failed to update role');
      setRoles(prev => prev.map(r => r.id === roleId ? result : r));
      setIsEditDialogOpen(false);
      setEditingRole(null);
    } catch (e: unknown) {
      console.error('Update role error:', e);
      let message = 'Failed to update role.';
      if (typeof e === 'object' && e !== null && 'message' in e) {
        const maybeMsg = (e as Record<string, unknown>).message;
        if (typeof maybeMsg === 'string') message = maybeMsg;
      }
      setUpdateError(message);
      setRoles(optimisticPrev);
    } finally {
      setIsUpdatingRoleId(null);
    }
  };

  const handleInviteMember = () => {
    setNewMemberEmail('');
  };

  const getFullName = (member: iTwinUserMember): string => {
    if (member.givenName && member.surname) {
      return `${member.givenName} ${member.surname}`;
    }
    if (member.givenName) return member.givenName;
    if (member.surname) return member.surname;
    return member.email || 'Unknown User';
  };

  const isMissingUser = (member: iTwinUserMember): boolean => {
    return !member.email && !member.givenName && !member.surname;
  };

  const getRoleBadge = (role: { id: string; displayName: string; description: string }) => {
    // Map API roles to colors (could be enhanced with a proper role color mapping)
    const getColorForRole = (roleName: string) => {
      if (roleName.toLowerCase().includes('admin')) return 'bg-red-500';
      if (roleName.toLowerCase().includes('write') || roleName.toLowerCase().includes('contributor')) return 'bg-blue-500';
      return 'bg-green-500';
    };

    return (
      <Badge 
        key={role.id}
        className={`text-xs text-white ${getColorForRole(role.displayName)}`}
      >
        {role.displayName}
      </Badge>
    );
  };

  // Render up to a maximum number of role badges and collapse the rest
  const renderRoleBadges = (roles: iTwinUserMember['roles']) => {
    if (!roles || roles.length === 0) {
      return (
        <Badge variant="outline" className="text-xs">
          No Roles
        </Badge>
      );
    }
    const MAX_BADGES = 4;
    const shown = roles.slice(0, MAX_BADGES);
    const extra = roles.length - shown.length;
    const hidden = extra > 0 ? roles.slice(MAX_BADGES) : [];

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {shown.map((r) => getRoleBadge(r))}
        {extra > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs cursor-help">+{extra} more</Badge>
            </TooltipTrigger>
            <TooltipContent sideOffset={6} className="max-w-[320px] whitespace-normal break-words bg-popover text-popover-foreground">
              <div className="flex flex-wrap gap-1">
                {hidden.map((r) => (
                  <Badge key={r.id} variant="secondary" className="text-[10px]">
                    {r.displayName}
                  </Badge>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Access Control - {iTwin.displayName}</span>
          </DialogTitle>
          <DialogDescription>
            Manage roles, permissions, and member access for this iTwin
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Roles</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Permissions</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 max-h-[500px] overflow-y-auto">
            <TabsContent value="members" className="space-y-4">
              {/* Add Member Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <UserPlus className="h-5 w-5" />
                    <span>Invite New Member</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@company.com"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Default Role</Label>
                      <Select
                        value={selectedRole}
                        onValueChange={setSelectedRole}
                        disabled={roles.length === 0}
                      >
                        <SelectTrigger id="role" className="w-full">
                          <SelectValue placeholder={roles.length === 0 ? 'No roles available' : 'Select a role'} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleInviteMember} disabled={!newMemberEmail}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </Button>
                </CardContent>
              </Card>

              {/* Members List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Current Members {isLoadingMembers ? '(Loading...)' : `(${members.length})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMembers && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading members...</span>
                    </div>
                  )}
                  
                  {membersError && (
                    <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="text-red-800 dark:text-red-200">{membersError}</span>
                      <Button variant="ghost" size="sm" onClick={refetchMembers}>
                        Retry
                      </Button>
                    </div>
                  )}

                  {!isLoadingMembers && !membersError && members.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No members found for this iTwin.
                    </div>
                  )}

                  {!isLoadingMembers && !membersError && members.length > 0 && (
                    <div className="space-y-3">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                          <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              {isMissingUser(member) ? (
                                <AlertTriangle className="h-5 w-5 text-orange-600" />
                              ) : (
                                <Users className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2 min-w-0">
                                <p className="font-medium">
                                  {isMissingUser(member) ? 'Missing User' : getFullName(member)}
                                </p>
                                {isMissingUser(member) && (
                                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                    Missing
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate max-w-[35ch]">
                                {member.email || 'No email available'}
                              </p>
                              {member.organization && (
                                <p className="text-xs text-muted-foreground truncate max-w-[40ch]">
                                  {member.organization}
                                </p>
                              )}
                              {renderRoleBadges(member.roles)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Badge variant="default" className="text-xs">
                              Active
                            </Badge>
                            <Button variant="ghost" size="sm" title="Edit member">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Remove member">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Role Definitions</span>
                    </span>
                    <Button size="sm" onClick={() => { setCreateDisplayName(''); setCreateDescription(''); setCreateError(null); setIsCreateDialogOpen(true);} }>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingRoles && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading roles...</span>
                    </div>
                  )}

          {(rolesError || deleteError || updateError || createError) && (
                    <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 dark:text-red-200">{rolesError || deleteError || updateError || createError}</span>
            <Button variant="ghost" size="sm" onClick={refetchRoles}>Retry</Button>
                    </div>
                  )}

                  {!isLoadingRoles && !rolesError && roles.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No roles found for this iTwin.
                    </div>
                  )}

                  {!isLoadingRoles && !rolesError && roles.length > 0 && (
                    <div className="space-y-3">
                      {roles.map((role) => (
                        <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-4 h-4 rounded-full bg-muted-foreground/40 mt-1"></div>
                            <div>
                              <p className="font-medium">{role.displayName}</p>
                              {role.description && (
                                <p className="text-sm text-muted-foreground">{role.description}</p>
                              )}
                              {role.permissions && role.permissions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {role.permissions.slice(0, 8).map((perm, idx) => (
                                    <Badge key={idx} variant="outline" className="text-[10px]">
                                      {perm}
                                    </Badge>
                                  ))}
                                  {role.permissions.length > 8 && (
                                    <Badge variant="outline" className="text-[10px]">
                                      +{role.permissions.length - 8} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" title="View role" disabled>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Edit role"
                              onClick={() => handleEditRole(role.id)}
                              disabled={isUpdatingRoleId === role.id}
                            >
                              {isUpdatingRoleId === role.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Edit className="h-4 w-4" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Delete role" 
                              disabled={isDeletingRoleId === role.id}
                              onClick={() => handleDeleteRole(role.id)}
                            >
                              {isDeletingRoleId === role.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Permission Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <h4 className="font-medium mb-2">iTwin Platform Services</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Permissions control access to various iTwin Platform services and capabilities.
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">iModels API</p>
                          <p className="text-muted-foreground">Create, read, update iModels</p>
                        </div>
                        <div>
                          <p className="font-medium">Reality Modeling</p>
                          <p className="text-muted-foreground">Process reality data</p>
                        </div>
                        <div>
                          <p className="font-medium">Synchronization</p>
                          <p className="text-muted-foreground">Configure data syncs</p>
                        </div>
                        <div>
                          <p className="font-medium">Visualization</p>
                          <p className="text-muted-foreground">View and interact with models</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Permission Inheritance</h4>
                      <p className="text-sm text-muted-foreground">
                        Permissions are granted through role assignments. Members can have multiple roles, 
                        and permissions are cumulative across all assigned roles.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) { setIsEditDialogOpen(false); setEditingRole(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update role name, description and permissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Display Name</Label>
              <Input id="roleName" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleDesc">Description</Label>
              <Input id="roleDesc" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
              <div className="flex items-center justify-between">
                <Label>Permissions</Label>
                {isLoadingPermissions && <span className="text-xs text-muted-foreground flex items-center"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Loading</span>}
              </div>
              {permissionsError && <p className="text-sm text-red-600">{permissionsError}</p>}
              {!isLoadingPermissions && !permissionsError && allPermissions.length === 0 && (
                <p className="text-sm text-muted-foreground">No permissions available.</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {allPermissions.map(perm => {
                  const checked = editSelectedPermissions.includes(perm);
                  return (
                    <label key={perm} className="flex items-center space-x-2 text-xs font-mono cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={() => togglePermission(perm)}
                      />
                      <div
                        onClick={() => togglePermission(perm)}
                        className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${checked ? 'bg-primary text-primary-foreground' : 'bg-background'} cursor-pointer`}
                      >
                        {checked && '✓'}
                      </div>
                      <span className="truncate" title={perm}>{perm}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            {updateError && <p className="text-sm text-red-600">{updateError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingRole(null); }}>Cancel</Button>
              <Button onClick={submitRoleUpdate} disabled={isUpdatingRoleId === editingRole?.id}>
                {isUpdatingRoleId === editingRole?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (!open) { setIsCreateDialogOpen(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Role</DialogTitle>
            <DialogDescription>Provide a name and description for the new role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="createRoleName">Display Name<span className="text-red-500 ml-0.5">*</span></Label>
              <Input id="createRoleName" value={createDisplayName} onChange={(e) => setCreateDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createRoleDesc">Description<span className="text-red-500 ml-0.5">*</span></Label>
              <Input id="createRoleDesc" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} />
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  setCreateError(null);
                  if (!createDisplayName.trim() || !createDescription.trim()) { setCreateError('Display name and description are required.'); return; }
                  setIsCreatingRole(true);
                  try {
                    const created = await iTwinApiService.createiTwinRole(iTwin.id, { displayName: createDisplayName.trim(), description: createDescription.trim() });
                    if (!created) throw new Error('Failed to create role');
                    setRoles(prev => [created, ...prev]);
                    setIsCreateDialogOpen(false);
                  } catch (e: unknown) {
                    let msg = 'Failed to create role.';
                    if (typeof e === 'object' && e !== null && 'message' in e) {
                      const maybeMsg = (e as Record<string, unknown>).message;
                      if (typeof maybeMsg === 'string') msg = maybeMsg;
                    }
                    setCreateError(msg);
                  } finally {
                    setIsCreatingRole(false);
                  }
                }}
                disabled={isCreatingRole}
              >
                {isCreatingRole && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Role Dialog */}
      <Dialog
        open={!!deleteRoleCandidate}
        onOpenChange={(open) => {
          if (!open && !isDeletingRoleId) setDeleteRoleCandidate(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role "{deleteRoleCandidate?.displayName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteRoleCandidate(null)} disabled={!!isDeletingRoleId}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteRole} disabled={!!isDeletingRoleId}>
              {isDeletingRoleId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export default AccessControlModal;
