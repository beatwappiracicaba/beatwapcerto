import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [artists, setArtists] = useState([]);
  const [music, setMusic] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: artistsData, error: artistsError } = await supabase
          .from('profiles')
          .select(`
            *,
            metrics (*)
          `);
        
        if (artistsError) throw artistsError;

        // Transform metrics array to object if necessary or just take the first one
        const formattedArtists = artistsData.map(artist => ({
          ...artist,
          metrics: artist.metrics?.[0] || { plays: '0', listeners: '0', revenue: 'R$ 0,00', growth: '0%' }
        }));

        const { data: musicData, error: musicError } = await supabase
          .from('musics')
          .select('*')
          .order('created_at', { ascending: false });

        if (musicError) throw musicError;

        setArtists(formattedArtists || []);
        setMusic(musicData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const updateArtistMetrics = async (artistId, newMetrics) => {
    try {
      // Optimistic update
      setArtists(prev => prev.map(artist => 
        artist.id === artistId 
          ? { ...artist, metrics: { ...artist.metrics, ...newMetrics } }
          : artist
      ));

      // Database update
      const { error } = await supabase
        .from('metrics')
        .update(newMetrics)
        .eq('artist_id', artistId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating metrics:', error);
      // Revert logic could be added here
    }
  };

  const updateMusicStatus = async (musicId, status, additionalData = {}) => {
    try {
      // Optimistic update
      setMusic(prev => prev.map(m => 
        m.id === musicId 
          ? { ...m, status, ...additionalData }
          : m
      ));

      // Database update
      const { error } = await supabase
        .from('musics')
        .update({ status, ...additionalData })
        .eq('id', musicId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating music status:', error);
    }
  };

  const addMusic = async (newMusicData) => {
    try {
      // Prepare data for DB
      const musicPayload = {
        status: newMusicData.status || 'review',
        added_by: newMusicData.addedBy || 'artist',
        ...newMusicData,
        // Ensure field names match DB (camelCase to snake_case mapping might be needed if not consistent)
        artist_id: newMusicData.artistId,
        artist_name: newMusicData.artist,
        audio_url: newMusicData.audioFile,
        cover_url: newMusicData.cover
      };
      
      // Remove camelCase keys if they duplicate snake_case ones or aren't in DB
      delete musicPayload.artistId;
      delete musicPayload.artist;
      delete musicPayload.audioFile;
      delete musicPayload.cover;

      const { data, error } = await supabase
        .from('musics')
        .insert([musicPayload])
        .select()
        .single();

      if (error) throw error;

      // Map back to frontend structure if needed, or just use DB structure
      // Assuming frontend can adapt or we map it here
      const newMusic = {
        ...data,
        artistId: data.artist_id,
        artist: data.artist_name,
        audioFile: data.audio_url,
        cover: data.cover_url
      };

      setMusic(prev => [newMusic, ...prev]);
      return newMusic;
    } catch (error) {
      console.error('Error adding music:', error);
      throw error;
    }
  };

  const editMusic = async (musicId, updatedData) => {
    try {
      // Optimistic update
      setMusic(prev => prev.map(m => 
        m.id === musicId 
          ? { ...m, ...updatedData }
          : m
      ));

      // Map keys
      const dbData = {};
      if (updatedData.artistId) dbData.artist_id = updatedData.artistId;
      if (updatedData.artist) dbData.artist_name = updatedData.artist;
      if (updatedData.audioFile) dbData.audio_url = updatedData.audioFile;
      if (updatedData.cover) dbData.cover_url = updatedData.cover;
      if (updatedData.title) dbData.title = updatedData.title;
      if (updatedData.genre) dbData.genre = updatedData.genre;
      if (updatedData.isrc) dbData.isrc = updatedData.isrc;
      if (updatedData.upc) dbData.upc = updatedData.upc;
      if (updatedData.internalNote) dbData.internal_note = updatedData.internalNote;

      const { error } = await supabase
        .from('musics')
        .update(dbData)
        .eq('id', musicId);

      if (error) throw error;
    } catch (error) {
      console.error('Error editing music:', error);
    }
  };

  const deleteMusic = async (musicId) => {
    try {
      setMusic(prev => prev.filter(m => m.id !== musicId));
      
      const { error } = await supabase
        .from('musics')
        .delete()
        .eq('id', musicId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting music:', error);
    }
  };

  const getArtistById = (id) => artists.find(a => a.id === id);

  return (
    <DataContext.Provider value={{ 
      artists, 
      music, 
      loading,
      setMusic,
      updateArtistMetrics,
      updateMusicStatus,
      addMusic,
      editMusic,
      deleteMusic,
      getArtistById 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
