export function buildDistributionContractHTML({
  artistName,
  artistCPF,
  artistAddress,
  beatwapCNPJ = 'CNPJ a definir',
  beatwapAddress = 'Endereço a definir',
  vigenciaAnos = 3,
  artistaPercent = 80,
  beatwapPercent = 20,
}) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const contrato = `
CONTRATO DE LICENÇA DE DISTRIBUIÇÃO DE CONTEÚDO MUSICAL

1. IDENTIFICAÇÃO DAS PARTES
1.1. ARTISTA: ${artistName}, CPF ${artistCPF}, residente em ${artistAddress}.
1.2. BEATWAP: Pessoa Jurídica, CNPJ ${beatwapCNPJ}, sediada em ${beatwapAddress}.

2. OBJETO
2.1. O presente instrumento tem por objeto a concessão, pelo ARTISTA à BEATWAP, de licença para reprodução, distribuição, transmissão, comunicação ao público e exploração digital dos fonogramas e obras musicais entregues pelo ARTISTA, em plataformas digitais.

3. VIGÊNCIA
3.1. Este contrato vigorará por ${vigenciaAnos} anos, contados da data de assinatura, renovável mediante acordo entre as partes.

4. TERRITÓRIO
4.1. O presente contrato possui abrangência mundial, incluindo Brasil e exterior.

5. OBRIGAÇÕES DO ARTISTA
5.1. Fornecer à BEATWAP os fonogramas, metadados completos e materiais necessários à distribuição (capas, créditos, ISRC, autorizações).
5.2. Garantir que possui todos os direitos e autorizações para a exploração digital dos fonogramas, isentando a BEATWAP de quaisquer reclamações de terceiros.
5.3. Responder pela veracidade das informações e pela regularidade das autorizações de intérpretes, produtores fonográficos e titulares de direitos conexos.

6. OBRIGAÇÕES DA BEATWAP
6.1. Distribuir os conteúdos nas plataformas digitais parceiras, conforme disponibilidade comercial.
6.2. Envidar esforços razoáveis para maximizar a presença e performance dos conteúdos, sem garantia de resultados específicos.
6.3. Disponibilizar relatórios periódicos de receita e efetuar os repasses devidos ao ARTISTA, observadas as condições deste contrato.

7. DIVISÃO DE RECEITAS
7.1. Após dedução de taxas das plataformas, impostos e custos operacionais diretamente relacionados à distribuição, as receitas líquidas serão divididas da seguinte forma: ${artistaPercent}% para o ARTISTA e ${beatwapPercent}% para a BEATWAP.
7.2. Ajustes de percentuais poderão ser acordados por aditivo contratual.

8. PAGAMENTOS E REPASSE
8.1. Os repasses ao ARTISTA serão efetuados em periodicidade definida pela BEATWAP, desde que o valor mínimo acumulado seja atingido.
8.2. Eventuais encargos financeiros, tarifas bancárias e impostos incidentes poderão ser deduzidos dos valores a repassar.
8.3. O ARTISTA deverá manter seus dados cadastrais e bancários atualizados para recebimento.

9. RESPONSABILIDADE E CONFORMIDADE
9.1. A BEATWAP atuará conforme políticas das plataformas digitais e legislação vigente, podendo remover, suspender ou ajustar conteúdos que violem direitos ou políticas.
9.2. O ARTISTA é integralmente responsável por autorizações, conteúdo, créditos e regularidade da obra, respondendo por reclamações de terceiros.
9.3. Em caso de disputas de titularidade, valores poderão ser retidos até solução.

10. RESCISÃO, FORO E DISPOSIÇÕES GERAIS
10.1. O presente contrato poderá ser rescindido por qualquer das partes, mediante aviso prévio escrito de 30 dias, sem prejuízo das obrigações pendentes.
10.2. Permanecem vigentes as licenças necessárias para a conclusão de ciclos de pagamento e obrigações decorrentes de períodos anteriores.
10.3. O foro eleito é o da comarca da sede da BEATWAP, com renúncia a qualquer outro, para dirimir questões oriundas deste instrumento.
10.4. Este contrato constitui o acordo integral entre as partes, substituindo entendimentos anteriores.

ASSINATURA ELETRÔNICA
ARTISTA: ______________________________________    Data: ${hoje}
BEATWAP: ______________________________________    Data: ${hoje}
`;
  const styles = `
    <style>
      @page { margin: 20mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.6; }
      h1 { font-size: 18px; text-align: center; margin-bottom: 16px; }
      pre { white-space: pre-wrap; font-family: inherit; }
      .actions { display: none; }
      @media print { .no-print { display: none; } }
    </style>
  `;
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Contrato de Distribuição BeatWap</title>
        ${styles}
      </head>
      <body>
        <h1>Contrato de Licença de Distribuição de Conteúdo Musical</h1>
        <pre>${contrato}</pre>
      </body>
    </html>
  `;
  return html;
}
