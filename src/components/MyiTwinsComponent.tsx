
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { iTwinApiService } from '../services/iTwinAPIService';
import type { iTwin } from '../services/iTwinAPIService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Globe, Hash, Tag, Database, Shield, Clock, HardDrive, Pencil } from 'lucide-react';
import AccessControlModal from './AccessControlModal';
import { CreateITwinModal } from './CreateITwinModal';
import { EditITwinModal } from './EditITwinModal';

// Utility functions for managing recently viewed iTwins
const RECENT_VIEWED_ITWINS_KEY = 'itwin-demo-recent-viewed-itwins';
const MAX_RECENT_VIEWED_ITWINS = 6;

const getRecentViewedITwins = (): iTwin[] => {
  try {
    const stored = localStorage.getItem(RECENT_VIEWED_ITWINS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentViewedITwin = (itwin: iTwin): void => {
  try {
    const recent = getRecentViewedITwins();
    // Remove if already exists
    const filtered = recent.filter(item => item.id !== itwin.id);
    // Add to beginning
    const updated = [itwin, ...filtered].slice(0, MAX_RECENT_VIEWED_ITWINS);
    localStorage.setItem(RECENT_VIEWED_ITWINS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save recent viewed iTwin:', error);
  }
};

function MyiTwinsComponent() {
  const [iTwins, setiTwins] = useState<iTwin[] | null>(null);
  const [recentViewedITwins, setRecentViewedITwins] = useState<iTwin[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedITwinForAccess, setSelectedITwinForAccess] = useState<iTwin | null>(null);
  const [selectedITwinForEdit, setSelectedITwinForEdit] = useState<iTwin | null>(null);
  const navigate = useNavigate();

  // Load recent viewed iTwins on component mount
  useEffect(() => {
    setRecentViewedITwins(getRecentViewedITwins());
  }, []);

  const handleViewiModels = (iTwin: iTwin) => {
    // Save to recent viewed iTwins
    saveRecentViewedITwin(iTwin);
    setRecentViewedITwins(getRecentViewedITwins());
    
    navigate(`/itwins/${iTwin.id}/imodels`);
  };

  const handleViewStorage = (iTwin: iTwin) => {
    // Save to recent viewed iTwins
    saveRecentViewedITwin(iTwin);
    setRecentViewedITwins(getRecentViewedITwins());
    
    navigate(`/storage?iTwinId=${iTwin.id}`);
  };

  const handleManageAccess = (iTwin: iTwin) => {
    setSelectedITwinForAccess(iTwin);
  };

  const closeAccessModal = () => {
    setSelectedITwinForAccess(null);
  };

  const reloadITwins = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await iTwinApiService.getMyiTwins();
      setiTwins(result);
    } catch (err) {
      setError('Failed to fetch iTwins. Please try again.');
      console.error('Error fetching iTwins:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadITwins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold mb-2">Loading Your iTwins...</h2>
          <p className="text-muted-foreground">Please wait while we fetch your iTwin projects</p>
          <div className="text-4xl animate-spin mt-4">
            ⚙️
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
            <CardTitle className="text-destructive">❌ Error Loading iTwins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!iTwins || iTwins.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>📂 No iTwins Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have any iTwin projects yet. Create your first iTwin to get started!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter iTwins by search
  const filterediTwins = iTwins.filter(iTwin =>
    iTwin.displayName.toLowerCase().includes(search.toLowerCase())
  );

  // Get recently viewed iTwins that are available and match search
  const availableRecentITwins = recentViewedITwins.filter(recentItwin =>
    iTwins.some(itwin => itwin.id === recentItwin.id) &&
    recentItwin.displayName.toLowerCase().includes(search.toLowerCase())
  );

  // Get non-recent iTwins for the main list
  const nonRecentFilteredITwins = filterediTwins.filter(itwin =>
    !availableRecentITwins.some(recentItwin => recentItwin.id === itwin.id)
  );

  return (
    <div className="container mx-auto p-4">
  <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My iTwins</h1>
        <p className="text-muted-foreground">
          You have {iTwins.length} iTwin project{iTwins.length !== 1 ? 's' : ''}
          {availableRecentITwins.length > 0 && !search && (
            <span className="ml-2">• {availableRecentITwins.length} recently viewed</span>
          )}
        </p>
        <div className="mt-4">
          <CreateITwinModal onCreated={reloadITwins} />
        </div>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mt-4 w-full max-w-md px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring"
        />
        <div className="mt-4 flex gap-2">
          <button
            className={`px-3 py-1 rounded border ${view === 'grid' ? 'bg-primary text-white' : 'bg-muted'}`}
            onClick={() => setView('grid')}
          >
            Tile View
          </button>
          <button
            className={`px-3 py-1 rounded border ${view === 'list' ? 'bg-primary text-white' : 'bg-muted'}`}
            onClick={() => setView('list')}
          >
            List View
          </button>
        </div>
      </div>

      {/* Recent iTwins Section */}
      {availableRecentITwins.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Recently Viewed</h2>
          </div>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableRecentITwins.map((iTwin) => (
                <Card
                  key={`recent-${iTwin.id}`}
                  className="group hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer border-l-4 border-l-blue-500 bg-blue-50/30"
                  onClick={() => handleViewiModels(iTwin)}
                >
                  {/* Header */}
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl truncate flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          {iTwin.displayName}
                        </CardTitle>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge
                          variant={iTwin.status === 'Active' ? 'default' : 'secondary'}
                          className="text-xs whitespace-nowrap"
                        >
                          {iTwin.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Content */}
                  <CardContent className="pb-4 space-y-4">
                    {/* Project Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Hash className="w-4 h-4 mr-2" />
                        <span className="truncate" title={`ID: ${iTwin.id}`}>
                          {iTwin.id}
                        </span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Tag className="w-4 h-4 mr-2" />
                        <span className="truncate">{iTwin.number}</span>
                      </div>
                    </div>

                    {/* Location and Type */}
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Globe className="w-4 h-4 mr-2" />
                        <span className="truncate">
                          {iTwin.type ? `${iTwin.type} - ${iTwin.subClass}` : iTwin.subClass}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewiModels(iTwin);
                        }}
                        className="flex-1"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        View iModels
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewStorage(iTwin);
                        }}
                        className="flex-1"
                      >
                        <HardDrive className="w-4 h-4 mr-2" />
                        Storage
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleManageAccess(iTwin);
                        }}
                        className="flex-1"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Access
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedITwinForEdit(iTwin);
                        }}
                        className="flex-1"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border rounded shadow-sm bg-blue-50/30">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Project #</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {availableRecentITwins.map((iTwin) => (
                    <tr
                      key={`recent-${iTwin.id}`}
                      className="hover:bg-blue-100 cursor-pointer border-l-4 border-l-blue-500"
                      onClick={() => handleViewiModels(iTwin)}
                    >
                      <td className="px-4 py-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        {iTwin.displayName}
                      </td>
                      <td className="px-4 py-2 font-mono text-sm text-muted-foreground">{iTwin.id}</td>
                      <td className="px-4 py-2">
                        <Badge variant={iTwin.status === 'Active' ? 'default' : 'secondary'}>
                          {iTwin.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">{iTwin.number}</td>
                      <td className="px-4 py-2">{iTwin.type || iTwin.subClass}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewiModels(iTwin);
                            }}
                          >
                            <Database className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleManageAccess(iTwin);
                            }}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Access
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedITwinForEdit(iTwin);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* All iTwins Section */}
      {nonRecentFilteredITwins.length > 0 && (
        <div className="mb-6">
          {availableRecentITwins.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">All iTwins</h2>
            </div>
          )}
          {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nonRecentFilteredITwins.map((iTwin) => (
            <Card
              key={iTwin.id}
              className="group hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
              onClick={() => handleViewiModels(iTwin)}
            >
              {/* Header */}
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl truncate">{iTwin.displayName}</CardTitle>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge
                      variant={iTwin.status === 'Active' ? 'default' : 'secondary'}
                      className="text-xs whitespace-nowrap"
                    >
                      {iTwin.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {/* Basic Information */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {iTwin.id}
                    </span>
                  </div>
                  {iTwin.number && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Project:</span>
                      <span className="font-mono bg-muted px-2 py-1 rounded text-xs">
                        {iTwin.number}
                      </span>
                    </div>
                  )}
                  {iTwin.type && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Type:</span>
                      <Badge variant="outline" className="text-xs">
                        {iTwin.type}
                      </Badge>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewiModels(iTwin);
                    }}
                    className="flex-1"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    View iModels
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewStorage(iTwin);
                    }}
                    className="flex-1"
                  >
                    <HardDrive className="w-4 h-4 mr-2" />
                    Storage
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManageAccess(iTwin);
                    }}
                    className="flex-1"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Access
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedITwinForEdit(iTwin);
                    }}
                    className="flex-1"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
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
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Project #</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nonRecentFilteredITwins.map((iTwin) => (
                    <tr
                      key={iTwin.id}
                      className="hover:bg-primary/10 cursor-pointer"
                      onClick={() => handleViewiModels(iTwin)}
                    >
                      <td className="px-4 py-2 font-medium">{iTwin.displayName}</td>
                      <td className="px-4 py-2 font-mono text-xs">{iTwin.id}</td>
                      <td className="px-4 py-2">
                        <Badge variant={iTwin.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                          {iTwin.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{iTwin.number || '-'}</td>
                      <td className="px-4 py-2">
                        {iTwin.type ? (
                          <Badge variant="outline" className="text-xs">{iTwin.type}</Badge>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewiModels(iTwin);
                            }}
                          >
                            <Database className="w-4 h-4 mr-1" />
                            View iModels
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewStorage(iTwin);
                            }}
                          >
                            <HardDrive className="w-4 h-4 mr-1" />
                            Storage
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleManageAccess(iTwin);
                            }}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Access
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedITwinForEdit(iTwin);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* No results found */}
      {availableRecentITwins.length === 0 && nonRecentFilteredITwins.length === 0 && search && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No iTwins found</h3>
          <p className="text-gray-500">Try adjusting your search terms</p>
        </div>
      )}

      {/* Access Control Modal */}
      {selectedITwinForAccess && (
        <AccessControlModal
          iTwin={selectedITwinForAccess}
          isOpen={!!selectedITwinForAccess}
          onClose={closeAccessModal}
        />
      )}

      {/* Edit iTwin Modal */}
      {selectedITwinForEdit && (
        <EditITwinModal
          iTwin={selectedITwinForEdit}
          isOpen={!!selectedITwinForEdit}
          onClose={() => setSelectedITwinForEdit(null)}
          onUpdated={reloadITwins}
        />
      )}
    </div>
  );
}

export default MyiTwinsComponent;
