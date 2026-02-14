import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User, Plus, X } from 'lucide-react';

const SellerAgenda = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Novos estados para gerenciamento de artistas
  const [viewMode, setViewMode] = useState('seller'); // 'seller' | 'artist'
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState('');
  const [artistEvents, setArtistEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'show', notes: '' });

  useEffect(() => {
    fetchEvents();
    fetchArtists();
  }, [currentDate]);

  useEffect(() => {
    if (viewMode === 'artist' && selectedArtist) {
      fetchArtistEvents();
    }
  }, [selectedArtist, currentDate, viewMode]);

  const fetchArtists = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, nome_completo_razao_social')
        .eq('cargo', 'Artista')
        .order('nome');
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'fechado')
        .gte('event_date', startOfMonth)
        .lte('event_date', endOfMonth);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtistEvents = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

      // Tentativa de join para pegar nome do criador. Se falhar, pegamos sem join.
      const { data, error } = await supabase
        .from('artist_work_events')
        .select('*, creator:created_by(nome)')
        .eq('artista_id', selectedArtist)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .or('status.neq.cancelado,has_contract.eq.true');

      if (error) throw error;
      setArtistEvents(data || []);
    } catch (error) {
      console.error('Error fetching artist events:', error);
      // Fallback sem join
      const { data } = await supabase
        .from('artist_work_events')
        .select('*')
        .eq('artista_id', selectedArtist)
        .gte('date', new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString())
        .lte('date', new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString())
        .or('status.neq.cancelado,has_contract.eq.true');
      setArtistEvents(data || []);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !selectedArtist) return;

    try {
      const { error } = await supabase.from('artist_work_events').insert({
        artista_id: selectedArtist,
        title: newEvent.title,
        date: newEvent.date,
        type: newEvent.type,
        notes: newEvent.notes,
        created_by: user.id
      });

      if (error) throw error;

      setShowModal(false);
      setNewEvent({ title: '', date: '', type: 'show', notes: '' });
      fetchArtistEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Erro ao criar evento');
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCalendar = () => {
    const days = [];
    const currentEvents = viewMode === 'artist' ? artistEvents : events;
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-white/[0.02] border border-white/5 rounded-lg opacity-50"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = currentEvents.filter(e => {
        // Handle both date formats (ISO string or YYYY-MM-DD)
        const eDate = viewMode === 'artist' ? new Date(e.date + 'T12:00:00') : new Date(e.event_date);
        return eDate.getDate() === day;
      });

      days.push(
        <div key={day} className={`h-32 bg-white/5 border border-white/10 rounded-lg p-2 relative hover:border-beatwap-gold/30 transition-colors ${dayEvents.length > 0 ? 'bg-white/10' : ''}`}>
          <div className={`font-bold text-sm mb-1 ${dayEvents.length > 0 ? 'text-beatwap-gold' : 'text-gray-400'}`}>{day}</div>
          <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
            {dayEvents.map((event, idx) => (
              <div key={idx} className={`text-xs p-1 rounded truncate border ${viewMode === 'artist' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-beatwap-gold/20 text-beatwap-gold border-beatwap-gold/30'}`} title={event.title || event.event_name}>
                {viewMode === 'artist' ? event.title : (event.event_name || 'Show')}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Agenda & Disponibilidade</h1>
            <p className="text-gray-400">Gerencie datas e evite conflitos</p>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-white"><ChevronLeft size={20} /></button>
            <div className="font-bold text-lg min-w-[150px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-white"><ChevronRight size={20} /></button>
          </div>
        </div>

        {/* User Selection & Mode Switch */}
        <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${viewMode === 'seller' ? 'bg-beatwap-gold text-black font-bold' : 'text-gray-400 hover:text-white'}`} onClick={() => setViewMode('seller')}>
              Meus Shows (Leads)
            </div>
            <div className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${viewMode === 'artist' ? 'bg-purple-500 text-white font-bold' : 'text-gray-400 hover:text-white'}`} onClick={() => setViewMode('artist')}>
              Agenda do Artista
            </div>
          </div>

          {viewMode === 'artist' && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select 
                className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white w-full md:w-[300px]"
                value={selectedArtist}
                onChange={(e) => setSelectedArtist(e.target.value)}
              >
                <option value="">Selecione um Artista...</option>
                {artists.map(artist => (
                  <option key={artist.id} value={artist.id}>
                    {artist.nome || artist.nome_completo_razao_social || 'Artista sem nome'}
                  </option>
                ))}
              </select>
              {selectedArtist && (
                <AnimatedButton onClick={() => setShowModal(true)} variant="secondary" size="sm">
                  <Plus size={18} /> Novo Evento
                </AnimatedButton>
              )}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="grid grid-cols-7 gap-4 mb-4 text-center text-gray-400 text-sm font-medium">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>
          <div className="grid grid-cols-7 gap-4">
            {renderCalendar()}
          </div>
        </Card>

        {/* List of upcoming events */}
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarIcon size={20} className="text-beatwap-gold" />
                {viewMode === 'artist' ? 'Compromissos do Artista' : 'Próximos Shows Confirmados'}
            </h3>
            
            {((viewMode === 'artist' ? artistEvents : events).length === 0) ? (
                <p className="text-gray-500">Nenhum evento encontrado para este mês.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(viewMode === 'artist' ? artistEvents : events).map((event, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-2 relative">
                            <div className="font-bold text-white">{event.title || event.event_name || 'Evento sem nome'}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Clock size={12} />
                                {new Date(event.date || event.event_date).toLocaleDateString()}
                            </div>
                            
                            {viewMode === 'seller' && (
                              <>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <MapPin size={12} />
                                    {event.city || 'Local não definido'}
                                </div>
                                <div className="mt-2 text-xs text-beatwap-gold bg-beatwap-gold/10 px-2 py-1 rounded w-fit">
                                    {event.contractor_name}
                                </div>
                              </>
                            )}

                            {viewMode === 'artist' && (
                              <>
                                <div className="text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded w-fit capitalize">
                                  {event.type}
                                </div>
                                {event.notes && <div className="text-xs text-gray-500 italic mt-1">{event.notes}</div>}
                                {event.creator?.nome && (
                                  <div className="absolute bottom-4 right-4 text-[10px] text-gray-500 flex items-center gap-1">
                                    <User size={10} /> Marcado por: {event.creator.nome}
                                  </div>
                                )}
                              </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Modal Nova Evento */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 space-y-4 relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold text-white">Marcar Compromisso</h2>
            
            <div className="space-y-3">
              <AnimatedInput 
                label="Título do Evento"
                placeholder="Ex: Show em SP, Gravação de Voz"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
              />
              
              <AnimatedInput 
                label="Data"
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
              />
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Tipo</label>
                <select 
                  className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold/50"
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                >
                  <option value="show">Show</option>
                  <option value="gravação">Gravação</option>
                  <option value="ensaio">Ensaio</option>
                  <option value="reunião">Reunião</option>
                  <option value="lançamento">Lançamento</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <AnimatedInput 
                label="Notas/Detalhes"
                placeholder="Detalhes adicionais..."
                value={newEvent.notes}
                onChange={(e) => setNewEvent({...newEvent, notes: e.target.value})}
              />
            </div>

            <AnimatedButton onClick={handleCreateEvent} className="w-full">
              Confirmar Agendamento
            </AnimatedButton>
          </Card>
        </div>
      )}

    </DashboardLayout>
  );
};

export default SellerAgenda;
