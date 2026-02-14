import { useEffect, useMemo, useState, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const types = [
  { value: 'lançamento', label: 'Lançamento' },
  { value: 'show', label: 'Show' },
  { value: 'ensaio', label: 'Ensaio' },
  { value: 'gravação', label: 'Gravação' },
  { value: 'outro', label: 'Outro' }
];

export const DashboardWork = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', date: '', type: 'lançamento', notes: '' });
  const [todoForm, setTodoForm] = useState({ title: '', due_date: '' });

  const startOfMonth = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1), [month]);
  const endOfMonth = useMemo(() => new Date(month.getFullYear(), month.getMonth() + 1, 0), [month]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const startISO = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), 1).toISOString().slice(0, 10);
    const endISO = new Date(endOfMonth.getFullYear(), endOfMonth.getMonth(), endOfMonth.getDate()).toISOString().slice(0, 10);
    const { data: ev } = await supabase
      .from('artist_work_events')
      .select('id,title,date,type,notes,created_at')
      .eq('artista_id', user.id)
      .gte('date', startISO)
      .lte('date', endISO)
      .or('status.neq.cancelado,has_contract.eq.true')
      .order('date', { ascending: true });
    setEvents(ev || []);
    const { data: td } = await supabase
      .from('artist_todos')
      .select('id,title,due_date,status,created_at,updated_at')
      .eq('artista_id', user.id)
      .order('created_at', { ascending: false });
    setTodos(td || []);
    setLoading(false);
  }, [user, startOfMonth, endOfMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('realtime-artist-work')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artist_work_events', filter: `artista_id=eq.${user.id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artist_todos', filter: `artista_id=eq.${user.id}` }, fetchData)
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch (e) { console.error(e); }
    };
  }, [user, fetchData]);

  const createEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.date) return;
    await supabase
      .from('artist_work_events')
      .insert({
        artista_id: user.id,
        title: eventForm.title.trim(),
        date: eventForm.date,
        type: eventForm.type,
        notes: eventForm.notes || '',
        created_by: user.id
      });
    setEventForm({ title: '', date: '', type: 'lançamento', notes: '' });
    fetchData();
  };

  const createTodo = async () => {
    if (!todoForm.title.trim()) return;
    await supabase
      .from('artist_todos')
      .insert({
        artista_id: user.id,
        title: todoForm.title.trim(),
        due_date: todoForm.due_date || null,
        status: 'pendente',
        created_by: user.id
      });
    setTodoForm({ title: '', due_date: '' });
    fetchData();
  };

  const updateTodoStatus = async (id, status) => {
    await supabase.from('artist_todos').update({ status }).eq('id', id);
    fetchData();
  };

  const days = useMemo(() => {
    const firstDayIndex = startOfMonth.getDay();
    const totalDays = endOfMonth.getDate();
    const grid = [];
    for (let i = 0; i < firstDayIndex; i++) grid.push(null);
    for (let d = 1; d <= totalDays; d++) grid.push(new Date(month.getFullYear(), month.getMonth(), d));
    return grid;
  }, [startOfMonth, endOfMonth, month]);

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-xl font-semibold text-white">Calendário</div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-lg bg-white/5 border border-white/10" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                <ChevronLeft size={16} />
              </button>
              <div className="text-sm text-gray-300">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
              <button className="px-3 py-2 rounded-lg bg-white/5 border border-white/10" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((w) => (
              <div key={w} className="text-xs text-gray-400 text-center">{w}</div>
            ))}
            {days.map((d, idx) => {
              const dateStr = d ? d.toISOString().slice(0,10) : '';
              const evs = events.filter(e => e.date === dateStr);
              return (
                <div key={idx} className={`min-h-[80px] rounded-xl border border-white/10 bg-white/5 p-2 ${d ? '' : 'opacity-30'}`}>
                  {d && <div className="text-xs text-gray-400">{d.getDate()}</div>}
                  {evs.map(e => (
                    <div key={e.id} className="mt-1 text-xs px-2 py-1 rounded-lg bg-beatwap-gold/20 text-beatwap-gold truncate">{e.type}: {e.title}</div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
            <AnimatedInput placeholder="Título" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
            <AnimatedInput type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} />
            <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}>
              {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <AnimatedInput placeholder="Notas (opcional)" value={eventForm.notes} onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })} />
          </div>
          <AnimatedButton onClick={createEvent} isLoading={loading}>Adicionar Evento</AnimatedButton>
        </Card>

        <Card className="space-y-4">
          <div className="text-xl font-semibold text-white">Avisos e Afazeres</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <AnimatedInput placeholder="Tarefa" value={todoForm.title} onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })} />
            <AnimatedInput type="date" value={todoForm.due_date} onChange={(e) => setTodoForm({ ...todoForm, due_date: e.target.value })} />
            <AnimatedButton onClick={createTodo}>Adicionar</AnimatedButton>
          </div>
          <div className="space-y-2">
            {todos.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-xl">
                <div className="flex-1">
                  <div className="font-bold text-white text-sm">{t.title}</div>
                  <div className="text-xs text-gray-400">{t.due_date ? new Date(t.due_date).toLocaleDateString() : 'Sem prazo'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs" value={t.status} onChange={(e) => updateTodoStatus(t.id, e.target.value)}>
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              </div>
            ))}
            {todos.length === 0 && <div className="text-sm text-gray-400">Nenhum afazer.</div>}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardWork;
