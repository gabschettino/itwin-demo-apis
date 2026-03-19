import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { iModelApiService } from "../services/api";
import type { IModel } from "../services/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Loader2, Database, Calendar, MapPin, CheckCircle, Clock, Grid3X3, List, Search, Server, User, GitBranch, Copy, Trash2 } from "lucide-react";
import { CreateIModelModal } from './CreateIModelModal';
import { CloneIModelModal } from './CloneIModelModal';
import { DeleteIModelModal } from './DeleteIModelModal';
import { Pencil } from "lucide-react";
import { EditIModelModal } from './ui/EditIModelModal';

interface IModelsComponentProps {
  iTwinId?: string;
  iTwinName?: string;
}

export default function IModelsComponent({ iTwinId, iTwinName }: IModelsComponentProps) {
  const navigate = useNavigate();
  const [iModels, setIModels] = useState<IModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  // Load iModels when iTwinId changes
  useEffect(() => {
    if (iTwinId) {
      loadIModels();
    } else {
      setIModels([]);
    }
  }, [iTwinId]);

  const loadIModels = async () => {
    if (!iTwinId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // First try to get iModels with basic info
      let allIModels = await iModelApiService.getAllIModels(iTwinId, false, false);
      
      // Check if we have creation dates, if not, fetch detailed info
      const hasCreationDates = allIModels.length > 0 && allIModels[0].createdDateTime;
      
      if (!hasCreationDates && allIModels.length > 0) {
        // Fetch detailed information for all iModels, including creator info
        allIModels = await iModelApiService.getAllIModels(iTwinId, true, true);
      }
      
      setIModels(allIModels);
    } catch (e) {
      console.error('Error loading iModels:', e);
      setError(e instanceof Error ? e.message : 'Failed to load iModels');
      setIModels([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) {
      return 'N/A';
    }
    
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'initialized':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'notInitialized':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStateVariant = (state: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (state) {
      case 'initialized':
        return 'default';
      case 'notInitialized':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const filteredIModels = iModels.filter(iModel =>
    iModel.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    iModel.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    iModel.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    iModel.creatorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Action handlers
  const handleViewVersions = (iModel: IModel) => {
    if (!iTwinId) {
      console.error('iTwinId is required to view versions');
      return;
    }
    
    // Navigate to the versions page
    navigate(`/itwins/${iTwinId}/imodels/${iModel.id}/versions`);
  };

  const handleRefreshIModels = () => {
    loadIModels();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold mb-2">Loading iModels...</h2>
          <p className="text-muted-foreground">Please wait while we fetch the iModels</p>
          <div className="flex justify-center mt-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">❌ Error Loading iModels</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadIModels} variant="outline" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!iTwinId) {
    return (
      <div className="container mx-auto p-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Select an iTwin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please select an iTwin to view its iModels.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6" />
              iModels
            </h1>
            {iTwinName && (
              <p className="text-muted-foreground">in {iTwinName}</p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <CreateIModelModal 
              iTwinId={iTwinId}
              onCreated={handleRefreshIModels}
            />
            
            <ToggleGroup type="single" value={view} onValueChange={(value) => value && setView(value as 'grid' | 'list')}>
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <Grid3X3 className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        
        {/* Search and Count */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search iModels by name, description, ID, or creator..."
              value={searchTerm}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <span className="text-sm text-muted-foreground">
            {filteredIModels.length} of {iModels.length} iModel{iModels.length !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
          </span>
        </div>
      </div>

      {filteredIModels.length === 0 && searchTerm ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>No Matching iModels</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No iModels match your search term "{searchTerm}". Try adjusting your search.
            </p>
          </CardContent>
        </Card>
      ) : iModels.length === 0 ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>No iModels Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This iTwin doesn't have any iModels yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIModels.map((iModel) => (
                <Card
                  key={iModel.id}
                  className="group hover:shadow-lg transition-all duration-200 overflow-hidden"
                >
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl truncate">{iModel.displayName}</CardTitle>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge variant={getStateVariant(iModel.state)} className="text-xs whitespace-nowrap">
                          {getStateIcon(iModel.state)}
                          <span className="ml-1">{iModel.state}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {iModel.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {iModel.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Database className="w-4 h-4" />
                        <span className="font-medium">ID:</span>
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          {iModel.id}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Created:</span>
                        <span className="text-xs">
                          {formatDate(iModel.createdDateTime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm">
                        <Server className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Data Center:</span>
                        <span className="text-xs">
                          {iModel.dataCenterLocation || 'N/A'}
                        </span>
                      </div>
                      
                      {iModel.creatorName && (
                        <div className="flex items-center space-x-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">Creator:</span>
                          <span className="text-xs">
                            {iModel.creatorName}
                          </span>
                        </div>
                      )}
                      
                      {iModel.extent && (
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">Location:</span>
                          <span className="text-xs">
                            {iModel.extent.southWest?.latitude?.toFixed(4)}, {iModel.extent.southWest?.longitude?.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <Button 
                        onClick={() => handleViewVersions(iModel)}
                        className="flex-1" 
                        size="sm"
                      >
                        <GitBranch className="w-4 h-4 mr-2" />
                        Versions
                      </Button>

                      <EditIModelModal
                        iModel={iModel}
                        onUpdated={handleRefreshIModels}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            title="Edit iModel"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        }
                      />

                      <CloneIModelModal 
                        iModel={iModel}
                        onCloned={handleRefreshIModels}
                        trigger={
                          <Button 
                            variant="outline"
                            size="sm"
                            title="Clone iModel"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        }
                      />
                      <DeleteIModelModal 
                        iModel={iModel}
                        onDeleted={handleRefreshIModels}
                        trigger={
                          <Button 
                            variant="outline"
                            size="sm"
                            title="Delete iModel"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border rounded shadow-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">State</th>
                    <th className="px-4 py-2 text-left">Created</th>
                    <th className="px-4 py-2 text-left">Creator</th>
                    <th className="px-4 py-2 text-left">Data Center</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIModels.map((iModel) => (
                    <tr
                      key={iModel.id}
                      className="hover:bg-primary/10"
                    >
                      <td className="px-4 py-2 font-medium">{iModel.displayName}</td>
                      <td className="px-4 py-2 font-mono text-xs">{iModel.id}</td>
                      <td className="px-4 py-2">
                        <Badge variant={getStateVariant(iModel.state)} className="text-xs">
                          {getStateIcon(iModel.state)}
                          <span className="ml-1">{iModel.state}</span>
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-xs">{formatDate(iModel.createdDateTime)}</td>
                      <td className="px-4 py-2 text-xs">{iModel.creatorName || 'N/A'}</td>
                      <td className="px-4 py-2 text-xs">{iModel.dataCenterLocation || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm max-w-xs truncate">
                        {iModel.description || '-'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button 
                            onClick={() => handleViewVersions(iModel)}
                            size="sm"
                            className="text-xs"
                          >
                            <GitBranch className="w-3 h-3 mr-1" />
                            Versions
                          </Button>
                          
                          <EditIModelModal
                            iModel={iModel}
                            onUpdated={handleRefreshIModels}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                title="Edit iModel"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            }
                          />

                          <CloneIModelModal 
                            iModel={iModel}
                            onCloned={handleRefreshIModels}
                            trigger={
                              <Button 
                                variant="outline"
                                size="sm"
                                title="Clone iModel"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            }
                          />
                          <DeleteIModelModal 
                            iModel={iModel}
                            onDeleted={handleRefreshIModels}
                            trigger={
                              <Button 
                                variant="outline"
                                size="sm"
                                title="Delete iModel"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}