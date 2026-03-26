import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { iTwinApiService } from '../services/api';
import type { iTwin } from '../services/types';
import IModelsComponent from '../components/IModelsComponent';

export default function IModelsRoute() {
  const { itwinId } = useParams<{ itwinId: string }>();
  const [iTwin, setITwin] = useState<iTwin | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (itwinId) {
      loadITwin();
    }
  }, [itwinId]);

  const loadITwin = async () => {
    if (!itwinId) return;
    try {
      setLoading(true);
      const iTwins = await iTwinApiService.getMyiTwins();
      const foundITwin = iTwins?.find(itwin => itwin.id === itwinId);
      setITwin(foundITwin || null);
    } catch (e) {
      console.error('Failed to load iTwin:', e);
      setITwin(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading iTwin details...</div>;
  }

  if (!iTwin && itwinId) {
    return <div className="container mx-auto p-4">iTwin not found.</div>;
  }

  return (
    <IModelsComponent 
      iTwinId={itwinId} 
      iTwinName={iTwin?.displayName}
    />
  );
}
