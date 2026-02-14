import Terms from './Terms';
import Privacy from './Privacy';
import Copyright from './Copyright';

const LegalAll = () => {
  return (
    <div className="bg-beatwap-dark text-white">
      <section className="py-16 px-6 border-b border-white/10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold">Informações Legais</h1>
          <p className="text-gray-400 mt-2">
            Consulte abaixo nossos Termos de Uso, Política de Privacidade e Direitos Autorais.
          </p>
        </div>
      </section>
      <Terms />
      <Privacy />
      <Copyright />
    </div>
  );
};

export default LegalAll;
