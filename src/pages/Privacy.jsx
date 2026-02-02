import React from 'react';

const Privacy = () => {
  return (
    <section className="min-h-screen bg-beatwap-dark text-white py-20 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl md:text-4xl font-bold">Política de Privacidade</h1>
        <p className="text-gray-400">
          Esta Política descreve como coletamos, usamos e protegemos seus dados pessoais na BeatWap.
        </p>
        <h2 className="text-xl font-bold">Coleta de Dados</h2>
        <p className="text-gray-400">
          Coletamos informações fornecidas por você e dados técnicos de uso da plataforma para melhorar nossos serviços.
        </p>
        <h2 className="text-xl font-bold">Uso de Dados</h2>
        <p className="text-gray-400">
          Utilizamos seus dados para autenticação, suporte, comunicação e cumprimento de obrigações legais.
        </p>
        <h2 className="text-xl font-bold">Compartilhamento</h2>
        <p className="text-gray-400">
          Compartilhamos dados apenas quando necessário para operação, por exigência legal ou com seu consentimento.
        </p>
      </div>
    </section>
  );
};

export default Privacy;
