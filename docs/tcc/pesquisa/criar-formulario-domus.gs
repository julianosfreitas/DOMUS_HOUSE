/**
 * DOMUS — gerador do formulário de pesquisa de usuários (coleta REAL).
 *
 * COMO USAR (1 minuto):
 *  1. Acesse https://script.google.com  ->  "Novo projeto".
 *  2. Apague o conteúdo e cole ESTE arquivo inteiro.
 *  3. Clique em "Executar" (▶). Autorize o acesso quando pedir (é a sua conta).
 *  4. Veja em "Execução" -> log: aparecem o LINK DE RESPOSTA (para enviar às
 *     pessoas) e o LINK DE EDIÇÃO. O formulário também aparece no seu Google Drive.
 *  5. Para exportar as respostas: no Forms, aba "Respostas" -> ícone do Sheets.
 *
 * Nenhum dado é inventado: o formulário coleta respostas REAIS das pessoas que
 * você enviar (Recife, SP, RJ, Sicília...). n = 8–15 respostas já sustenta o
 * argumento DIRECIONAL da monografia.
 */
function criarFormularioDOMUS() {
  var form = FormApp.create('DOMUS — Automação residencial no Brasil: uso, intenção e barreiras')
    .setDescription(
      'Pesquisa acadêmica (TCC — Ciência da Computação) sobre automação residencial ' +
      '(casa inteligente) no Brasil. Leva ~5 minutos, é anônima e os dados serão usados ' +
      'apenas de forma agregada, em conformidade com a LGPD. Obrigado por participar!'
    )
    .setProgressBar(true)
    .setCollectEmail(false);

  var S1 = 'Discordo totalmente', S5 = 'Concordo totalmente';

  // ===================== SEÇÃO 1 — PERFIL =====================
  form.addSectionHeaderItem().setTitle('1. Perfil do respondente');

  form.addMultipleChoiceItem().setTitle('Sua faixa etária').setRequired(true)
    .setChoiceValues(['18–24', '25–34', '35–44', '45–59', '60 ou mais']);

  form.addMultipleChoiceItem().setTitle('Onde você mora').setRequired(true)
    .setChoiceValues(['Recife (PE)', 'São Paulo (SP)', 'Rio de Janeiro (RJ)',
      'Outra cidade do Brasil', 'Itália (Sicília)', 'Outro país']);

  form.addMultipleChoiceItem().setTitle('Escolaridade')
    .setChoiceValues(['Ensino fundamental', 'Ensino médio', 'Superior incompleto',
      'Superior completo', 'Pós-graduação']);

  form.addScaleItem().setTitle('Como você avalia sua familiaridade com tecnologia?')
    .setBounds(1, 5).setLabels('Nada familiar', 'Muito familiar').setRequired(true);

  form.addMultipleChoiceItem().setTitle('Renda familiar mensal aproximada (opcional)')
    .setChoiceValues(['Até 2 salários mínimos', '2 a 5 salários', '5 a 10 salários',
      'Mais de 10 salários', 'Prefiro não informar']);

  // ===================== SEÇÃO 2 — SITUAÇÃO ATUAL =====================
  form.addPageBreakItem().setTitle('2. Sua casa hoje');

  form.addMultipleChoiceItem().setTitle('Você já tem algum dispositivo de casa inteligente?')
    .setRequired(true).setChoiceValues(['Sim', 'Não', 'Não sei o que é isso']);

  form.addCheckboxItem().setTitle('Se sim, quais você tem? (marque todos)')
    .setChoiceValues(['Lâmpada inteligente', 'Tomada/interruptor inteligente',
      'Assistente de voz (Alexa, Google)', 'Câmera', 'Fechadura/campainha',
      'Ar-condicionado/TV inteligente', 'Outro']);

  form.addMultipleChoiceItem().setTitle('Se tem, quem configurou os aparelhos?')
    .setChoiceValues(['Eu mesmo(a)', 'Um familiar ou amigo', 'Um técnico contratado',
      'Já veio configurado', 'Não se aplica']);

  form.addMultipleChoiceItem().setTitle('Com que frequência usa esses recursos?')
    .setChoiceValues(['Diariamente', 'Algumas vezes por semana', 'Raramente',
      'Quase nunca', 'Não se aplica']);

  // ===================== SEÇÃO 3 — INTENÇÃO E BARREIRAS =====================
  form.addPageBreakItem().setTitle('3. Intenção e barreiras')
    .setHelpText('O foco da pesquisa: o que impede as pessoas de automatizar a casa.');

  form.addScaleItem().setTitle('Você automatizaria sua casa se fosse simples e barato?')
    .setBounds(1, 5).setLabels('Com certeza não', 'Com certeza sim').setRequired(true);

  form.addCheckboxItem().setTitle('Quais as MAIORES dificuldades/barreiras que você percebe? (marque as principais)')
    .setRequired(true)
    .setChoiceValues([
      'Preço do hardware (aparelhos)',
      'Complexidade de instalar e parear os aparelhos',
      'Depender de internet/nuvem para funcionar',
      'Privacidade dos meus dados e áudio',
      'Falta de conhecimento técnico',
      'App do fabricante confuso (às vezes em inglês)',
      'Medo de "travar" a casa se algo der errado',
      'Não vejo utilidade',
      'Outro']);

  form.addMultipleChoiceItem().setTitle('Quanto você pagaria por uma solução completa (central + 2 dispositivos)?')
    .setChoiceValues(['Até R$ 100', 'R$ 100 a R$ 200', 'R$ 200 a R$ 400',
      'Mais de R$ 400', 'Não pagaria']);

  form.addMultipleChoiceItem().setTitle('Você prefere que a automação funcione OFFLINE (local, sem depender da internet)?')
    .setRequired(true)
    .setChoiceValues(['Prefiro offline/local', 'Tanto faz', 'Prefiro que use a nuvem']);

  form.addScaleItem().setTitle('O quanto te preocupa a privacidade dos seus dados/áudio em dispositivos inteligentes?')
    .setBounds(1, 5).setLabels('Não me preocupa', 'Me preocupa muito');

  // ===================== SEÇÃO 4 — AVALIAÇÃO DO DOMUS (SUS) =====================
  form.addPageBreakItem().setTitle('4. Avaliação do DOMUS (só para quem viu a demonstração ou testou)')
    .setHelpText('Responda esta seção apenas se você viu a demonstração do DOMUS ou o utilizou.');

  form.addMultipleChoiceItem().setTitle('Você viu ou testou o DOMUS?')
    .setChoiceValues(['Sim, eu mesmo(a) testei', 'Vi a demonstração', 'Não vi/testei (pode pular esta seção)']);

  var susItens = [
    'Eu gostaria de usar este sistema com frequência.',
    'Achei o sistema desnecessariamente complexo.',
    'Achei o sistema fácil de usar.',
    'Precisaria de ajuda de um técnico para conseguir usar.',
    'As funções do sistema estão bem integradas.',
    'Havia muita inconsistência no sistema.',
    'Imagino que a maioria das pessoas aprenderia a usar rapidamente.',
    'Achei o sistema difícil/incômodo de usar.',
    'Senti-me confiante ao usar o sistema.',
    'Precisei aprender muita coisa antes de conseguir usar.'
  ];
  for (var i = 0; i < susItens.length; i++) {
    form.addScaleItem().setTitle('(SUS ' + (i + 1) + ') ' + susItens[i])
      .setBounds(1, 5).setLabels(S1, S5);
  }

  form.addMultipleChoiceItem().setTitle('Você conseguiu (ou acha que conseguiria) controlar por VOZ sem usar o app do fabricante?')
    .setChoiceValues(['Sim, sem problema', 'Sim, com alguma ajuda', 'Não']);

  form.addParagraphTextItem().setTitle('Comentários, sugestões ou dificuldades (opcional)');

  Logger.log('=== FORMULÁRIO CRIADO ===');
  Logger.log('Link para ENVIAR às pessoas (respostas): ' + form.getPublishedUrl());
  Logger.log('Link de EDIÇÃO (seu):                    ' + form.getEditUrl());
  return form.getPublishedUrl();
}
