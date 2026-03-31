import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Play, Waves, Music, User, BarChart3, Settings, DollarSign, CalendarDays, UploadCloud, Globe2, MessageSquare } from 'lucide-react';

const Section = ({ title, icon: Icon, children }) => (
  <Card className="space-y-3">
    <div className="flex items-center gap-3">
      <Icon className="text-beatwap-gold" size={20} />
      <div className="text-white font-bold text-lg">{title}</div>
    </div>
    <div className="text-gray-300 text-sm leading-relaxed">{children}</div>
  </Card>
);

const ComoFunciona = () => {
  const navigate = useNavigate();
  return (
    <main className="flex-1 w-full px-6 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-400">Guia rápido</div>
            <div className="text-2xl md:text-3xl font-bold text-white">Como a BeatWap funciona</div>
          </div>
          <AnimatedButton onClick={() => navigate('/')} variant="secondary">Voltar</AnimatedButton>
        </div>

        <Section title="Visão Geral" icon={Waves}>
          A BeatWap é uma plataforma para artistas, compositores, produtores e vendedores gerenciarem música, shows e presença digital. O site possui um feed público, perfis, álbuns e uma área autenticada com diferentes painéis conforme o cargo.
        </Section>

        <Section title="Feed" icon={Play}>
          No feed você vê lançamentos, composições e posts dos perfis que segue. É possível reproduzir prévias, curtir e comentar. As reproduções no feed contabilizam métricas de plays e tempo ouvido.
        </Section>

        <Section title="Perfil Público" icon={User}>
          Cada artista/compositor tem um perfil público com foto, bio, redes e lançamentos. Visitantes podem ver álbuns, músicas, posts e composições. A página respeita destaques ativos e remove automaticamente quando o período termina.
        </Section>

        <Section title="Álbuns e Músicas" icon={Music}>
          Álbuns aparecem no feed e no perfil. Ao abrir um álbum, você pode ouvir faixas e registrar plays. As métricas usam os eventos de reprodução com duração para somar tempo total e músicas mais tocadas.
        </Section>

        <Section title="Painel do Artista" icon={BarChart3}>
          O painel mostra métricas: total de músicas, plays, tempo ouvido, curtidas, e um ranking das faixas mais tocadas. Também há atalhos para enviar músicas, gerenciar perfil público, marketing, finanças e agenda de shows.
        </Section>

        <Section title="Painel do Produtor" icon={Settings}>
          Visualiza métricas globais da plataforma, top músicas, lista de artistas, composições e administra uploads e aprovações. Pode acessar configurações e projetos de produtores.
        </Section>

        <Section title="Painel do Vendedor" icon={DollarSign}>
          Focado em leads, propostas, agenda e finanças vinculadas às vendas. Permite acompanhar artistas relacionados às negociações e registrar comunicações.
        </Section>

        <Section title="Painel do Compositor" icon={CalendarDays}>
          Gestão de composições: envio de obras, prévias de áudio, capa, gênero e preço. Comunicação com interessados e visibilidade no feed e na listagem pública de composições.
        </Section>

        <Section title="Uploads e Gestão" icon={UploadCloud}>
          Envio de músicas com capa e arquivo de áudio. O status “aprovado” controla visibilidade no feed e perfis. Há validação de créditos de envio quando aplicável.
        </Section>

        <Section title="Marketing e Social" icon={Globe2}>
          Campos de redes sociais e smartlinks ajudam divulgação. Cliques são rastreados em analytics e entram nas métricas de engajamento do perfil.
        </Section>

        <Section title="Chat e Comunicações" icon={MessageSquare}>
          Espaços de chat por cargo e comunicação com vendedores/produção. Notificações direcionam para detalhes quando necessário.
        </Section>

        <Card className="bg-white/5 border-white/10">
          <div className="flex flex-wrap gap-3">
            <AnimatedButton onClick={() => navigate('/login')} className="px-8 py-4">Entrar na Área do Artista</AnimatedButton>
            <AnimatedButton onClick={() => navigate('/composicoes')} variant="secondary" className="px-8 py-4">Explorar Composições</AnimatedButton>
          </div>
        </Card>
      </div>
    </main>
  );
};

export default ComoFunciona;
