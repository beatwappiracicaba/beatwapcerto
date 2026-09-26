import {
  Rss, MessageCircle, Music, Layers, CalendarDays, Users, Wallet,
  Target, FileText, Presentation, UserCircle, Sparkles, Briefcase
} from 'lucide-react';

// Atalhos dos paineis. Todos apontam para rotas que ja existem em
// routes/AppRoutes.jsx, entao nenhum atalho cria pagina nova.
//
// Cada cargo so recebe o que ele pode realmente acessar. A autorizacao de
// verdade continua sendo a das rotas e do hasAccess() dos layouts; aqui a
// lista apenas evita mostrar botao que cairia em "Acesso Restrito".

const ATALHOS = {
  Produtor: [
    { id: 'feed', label: 'Abrir Feed', to: '/dashboard/feed', icon: Rss },
    { id: 'chat', label: 'Conversas', to: '/admin/chat', icon: MessageCircle },
    { id: 'eventos', label: 'Eventos', to: '/admin/eventos', icon: CalendarDays },
    { id: 'musics', label: 'Músicas', to: '/admin/musics', icon: Music },
    { id: 'compositions', label: 'Composições', to: '/admin/compositions', icon: Layers },
    { id: 'artists', label: 'Artistas', to: '/admin/artists', icon: Users },
    { id: 'finance', label: 'Financeiro', to: '/admin/finance', icon: Wallet }
  ],
  Vendedor: [
    { id: 'feed', label: 'Abrir Feed', to: '/dashboard/feed', icon: Rss },
    { id: 'leads', label: 'Leads', to: '/seller/leads', icon: Target },
    { id: 'proposals', label: 'Propostas', to: '/seller/proposals', icon: FileText },
    { id: 'communications', label: 'Conversas', to: '/seller/communications', icon: MessageCircle },
    { id: 'artists', label: 'Artistas', to: '/seller/artists', icon: Users },
    { id: 'calendar', label: 'Agenda', to: '/seller/calendar', icon: CalendarDays },
    { id: 'finance', label: 'Comissões', to: '/seller/finance', icon: Wallet }
  ],
  Artista: [
    { id: 'feed', label: 'Abrir Feed', to: '/dashboard/feed', icon: Rss },
    { id: 'musics', label: 'Minhas Músicas', to: '/dashboard/musics', icon: Music },
    { id: 'compositions', label: 'Composições', to: '/dashboard/compositions', icon: Layers },
    { id: 'chat', label: 'Conversas', to: '/dashboard/chat', icon: MessageCircle },
    { id: 'work', label: 'Projetos', to: '/dashboard/work', icon: Briefcase },
    { id: 'marketing', label: 'Marketing', to: '/dashboard/marketing', icon: Presentation },
    { id: 'finance', label: 'Financeiro', to: '/dashboard/finance', icon: Wallet },
    { id: 'profile', label: 'Meu Perfil', to: '/dashboard/profile', icon: UserCircle }
  ],
  Compositor: [
    { id: 'feed', label: 'Abrir Feed', to: '/dashboard/feed', icon: Rss },
    { id: 'audicoes', label: 'Audições', to: '/audicoes', icon: Sparkles },
    { id: 'chat', label: 'Conversas', to: '/dashboard/chat', icon: MessageCircle },
    { id: 'marketing', label: 'Marketing', to: '/dashboard/marketing', icon: Presentation },
    { id: 'finance', label: 'Financeiro', to: '/dashboard/finance', icon: Wallet },
    { id: 'profile', label: 'Meu Perfil', to: '/dashboard/profile', icon: UserCircle }
  ]
};

/**
 * Devolve os atalhos de um cargo, na ordem definida acima.
 * `omitir` remove ids que nao se aplicam naquele momento (ex.: composicoes
 * bloqueadas pelo plano do artista).
 */
export const atalhosDoCargo = (cargo, omitir = []) => {
  const lista = ATALHOS[String(cargo || '').trim()] || [];
  if (!omitir.length) return lista;
  const fora = new Set(omitir);
  return lista.filter((a) => !fora.has(a.id));
};

export const rotuloDoCargo = (cargo) => {
  const c = String(cargo || '').trim().toLowerCase();
  if (c === 'produtor') return 'Produtor';
  if (c === 'artista') return 'Artista';
  if (c === 'compositor') return 'Compositor';
  if (c === 'vendedor') return 'Vendedor';
  return '';
};
