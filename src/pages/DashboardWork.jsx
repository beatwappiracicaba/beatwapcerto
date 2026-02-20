import { useEffect, useMemo, useState, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { ChevronLeft, ChevronRight, Music, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { CompositionsUploadModal } from '../components/artist/CompositionsUploadModal';

const types = [
  { value: 'lançamento', label: 'Lançamento' },
  { value: 'show', label: 'Show' },
  { value: 'ensaio', label: 'Ensaio' },
  { value: 'gravação', label: 'Gravação' },
  { value: 'outro', label: 'Outro' }
];

export const DashboardWork = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'compositions' ? 'compositions' : 'work';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', date: '', type: 'lançamento', notes: '' });
  const [todoForm, setTodoForm] = useState({ title: '', due_date: '' });
  const [compositions, setCompositions] = useState([]);
  const [compositionsLoading, setCompositionsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const startOfMonth = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1), [month]);
  const endOfMonth = useMemo(() => new Date(month.getFullYear(), month.getMonth() + 1, 0), [month]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const ev = await apiClient.get('/artist/events');
    setEvents(ev || []);
    const td = await apiClient.get('/artist/todos');
    setTodos(td || []);
    setLoading(false);
  }, [user, startOfMonth, endOfMonth]);

  const fetchCompositions = useCallback(async () => {
    if (!user) return;
    setCompositionsLoading(true);
    try {
      const data = await apiClient.get('/artist/compositions'); // endpoint a ser adicionado
      setCompositions(data || []);
    } catch (e) { console.error(e); }
    setCompositionsLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchCompositions(); }, [fetchCompositions]);
  useEffect(() => {
    if (!user) return;
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [user, fetchData]);

  const createEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.date) return;
    await apiClient.post('/artist/events', {
      title: eventForm.title.trim(),
      date: eventForm.date,
      type: eventForm.type,
      notes: eventForm.notes || ''
    });
    setEventForm({ title: '', date: '', type: 'lançamento', notes: '' });
    fetchData();
  };

  const createTodo = async () => {
    if (!todoForm.title.trim()) return;
    await apiClient.post('/artist/todos', {
      title: todoForm.title.trim(),
      due_date: todoForm.due_date || null
    });
    setTodoForm({ title: '', due_date: '' });
    fetchData();
  };

  const updateTodoStatus = async (id, status) => {
    await apiClient.post(`/artist/todos/${id}`, { status }); // patch via post
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
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('work')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'work' ? 'bg-beatwap-gold text-black' : 'bg-white/5 text-white'
          }`}
        >
          Trabalhos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('compositions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'compositions' ? 'bg-beatwap-gold text-black' : 'bg-white/5 text-white'
          }`}
        >
          Composições
        </button>
      </div>

      {activeTab === 'work' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-xl font-semibold text-white">Calendário</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-sm text-gray-300">
                  {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </div>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((w) => (
                <div key={w} className="text-xs text-gray-400 text-center">
                  {w}
                </div>
              ))}
              {days.map((d, idx) => {
                const dateStr = d ? d.toISOString().slice(0, 10) : '';
                const evs = events.filter((e) => e.date === dateStr);
                return (
                  <div
                    key={idx}
                    className={`min-h-[80px] rounded-xl border border-white/10 bg-white/5 p-2 ${
                      d ? '' : 'opacity-30'
                    }`}
                  >
                    {d && <div className="text-xs text-gray-400">{d.getDate()}</div>}
                    {evs.map((e) => (
                      <div
                        key={e.id}
                        className="mt-1 text-xs px-2 py-1 rounded-lg bg-beatwap-gold/20 text-beatwap-gold truncate"
                      >
                        {e.type}: {e.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              <AnimatedInput
                placeholder="Título"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              />
              <AnimatedInput
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
              />
              <select
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                value={eventForm.type}
                onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
              >
                {types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <AnimatedInput
                placeholder="Notas (opcional)"
                value={eventForm.notes}
                onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
              />
            </div>
            <AnimatedButton onClick={createEvent} isLoading={loading}>
              Adicionar Evento
            </AnimatedButton>
          </Card>

          <Card className="space-y-4">
            <div className="text-xl font-semibold text-white">Avisos e Afazeres</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AnimatedInput
                placeholder="Tarefa"
                value={todoForm.title}
                onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
              />
              <AnimatedInput
                type="date"
                value={todoForm.due_date}
                onChange={(e) => setTodoForm({ ...todoForm, due_date: e.target.value })}
              />
              <AnimatedButton onClick={createTodo}>Adicionar</AnimatedButton>
            </div>
            <div className="space-y-2">
              {todos.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-xl"
                >
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm">{t.title}</div>
                    <div className="text-xs text-gray-400">
                      {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'Sem prazo'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs"
                      value={t.status}
                      onChange={(e) => updateTodoStatus(t.id, e.target.value)}
                    >
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
      )}

      {activeTab === 'compositions' && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-xl font-semibold text-white">Minhas Composições</div>
              <AnimatedButton onClick={() => setIsUploadModalOpen(true)} icon={Plus}>
                Nova Composição
              </AnimatedButton>
            </div>
            <div className="space-y-3">
              {compositionsLoading && (
                <div className="text-gray-400 text-sm">Carregando...</div>
              )}
              {!compositionsLoading && compositions.length === 0 && (
                <div className="text-center py-10 text-gray-400 border border-dashed border-white/10 rounded-xl">
                  <p>
                    <span>Nenhuma composição encontrada.</span>
                  </p>
                  <p className="text-sm mt-2">
                    <span>Clique em Nova Composição para enviar.</span>
                  </p>
                </div>
              )}
              {!compositionsLoading &&
                compositions.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                      {comp.cover_url ? (
                        <img
                          src={comp.cover_url}
                          alt={comp.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                          <Music size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{comp.title}</div>
                      <div className="text-xs text-gray-400">
                        {comp.created_at
                          ? new Date(comp.created_at).toLocaleDateString()
                          : ''}
                      </div>
                      {comp.price && (
                        <div className="text-xs text-beatwap-gold mt-1 font-bold">
                          R$ {comp.price}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                          comp.status === 'approved'
                            ? 'bg-green-500/20 text-green-500'
                            : comp.status === 'rejected'
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-yellow-500/20 text-yellow-500'
                        }`}
                      >
                        <span>
                          {comp.status === 'approved'
                            ? 'Aprovado'
                            : comp.status === 'rejected'
                            ? 'Recusado'
                            : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      <CompositionsUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          fetchCompositions();
        }}
      />
    </DashboardLayout>
  );
};

export default DashboardWork;
