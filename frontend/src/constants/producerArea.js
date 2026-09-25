// Area de atuacao do produtor. Compartilhada entre o cadastro e o editor de
// perfil para as duas telas oferecerem exatamente as mesmas opcoes.
export const PRODUCER_AREA_OPTIONS = [
  { value: 'Produtor musical', label: 'Produtor musical' },
  { value: 'Produtor artistico', label: 'Produtor artístico' },
  { value: 'Produtor de eventos', label: 'Produtor de eventos' },
  { value: 'outros', label: 'Outros' }
];

// "Outros" guarda o texto digitado com um prefixo, para nao colidir com as
// opcoes fixas e continuar legivel em qualquer listagem.
export const OTHER_AREA_PREFIX = 'Outro: ';

export const OTHER_AREA_OPTION = 'outros';

export const buildProducerArea = (selected, custom) => {
  const value = String(selected || '').trim();
  const free = String(custom || '').trim();
  if (value === OTHER_AREA_OPTION) return free ? `${OTHER_AREA_PREFIX}${free}` : '';
  return value;
};

// Aceita tanto o valor salvo (com prefixo) quanto a opcao "outros" crua.
export const isOtherProducerArea = (value) => {
  const v = String(value || '').trim();
  return v === OTHER_AREA_OPTION || v.toLowerCase().startsWith('outro:');
};

export const splitProducerArea = (value) => {
  const v = String(value || '').trim();
  if (v.toLowerCase().startsWith('outro:')) {
    return { selected: OTHER_AREA_OPTION, custom: v.slice(OTHER_AREA_PREFIX.length).trim() };
  }
  return { selected: v, custom: '' };
};
