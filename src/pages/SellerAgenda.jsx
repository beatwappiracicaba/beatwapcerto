import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { supabase } from '../services/supabaseClient';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';

const SellerAgenda = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

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
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-white/[0.02] border border-white/5 rounded-lg opacity-50"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = events.filter(e => {
        const eventDate = new Date(e.event_date);
        return eventDate.getDate() === day;
      });

      days.push(
        <div key={day} className={`h-32 bg-white/5 border border-white/10 rounded-lg p-2 relative hover:border-beatwap-gold/30 transition-colors ${dayEvents.length > 0 ? 'bg-white/10' : ''}`}>
          <div className={`font-bold text-sm mb-1 ${dayEvents.length > 0 ? 'text-beatwap-gold' : 'text-gray-400'}`}>{day}</div>
          <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
            {dayEvents.map((event, idx) => (
              <div key={idx} className="text-xs bg-beatwap-gold/20 text-beatwap-gold p-1 rounded truncate border border-beatwap-gold/30" title={`${event.event_name} - ${event.contractor_name}`}>
                {event.event_name || 'Show'}
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
                Próximos Shows Confirmados
            </h3>
            {events.length === 0 ? (
                <p className="text-gray-500">Nenhum show confirmado para este mês.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((event, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-2">
                            <div className="font-bold text-white">{event.event_name || 'Evento sem nome'}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Clock size={12} />
                                {new Date(event.event_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <MapPin size={12} />
                                {event.city || 'Local não definido'}
                            </div>
                            <div className="mt-2 text-xs text-beatwap-gold bg-beatwap-gold/10 px-2 py-1 rounded w-fit">
                                {event.contractor_name}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SellerAgenda;
