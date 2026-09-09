/**
 * ============================================================
 * i18n — internacionalização do Loranks
 * ------------------------------------------------------------
 * Este arquivo só ADICIONA uma camada de tradução por cima do HTML
 * já existente: não altera nenhuma lógica de painel.js, cadastro.js,
 * planilha.js ou perfil.js, e não depende deles (pode ser carregado
 * em qualquer ordem em relação aos outros scripts).
 *
 * Funciona lendo elementos marcados com `data-i18n` (texto visível),
 * `data-i18n-placeholder` (atributo placeholder de campos) e
 * `data-i18n-aria-label` (atributo aria-label de botões), e
 * substituindo o conteúdo pela tradução correspondente. Toda
 * substituição de texto usa `textContent` — nunca `innerHTML` —
 * então uma tradução nunca é interpretada como HTML/script, mesmo
 * que uma string maliciosa chegasse a entrar no dicionário.
 *
 * LIMITAÇÃO CONHECIDA (de propósito, para não tocar nos outros
 * arquivos): texto gerado em tempo de execução por painel.js,
 * cadastro.js, planilha.js e perfil.js — mensagens de erro/sucesso,
 * linhas da tabela, estados vazios, cabeçalhos de coluna da
 * planilha — continua em português. Traduzir isso exigiria que
 * aqueles arquivos aceitassem textos vindos de fora (deste
 * dicionário) em vez de strings fixas.
 * ============================================================
 */

/** Idioma usado quando nada foi salvo ainda ou o valor salvo é inválido. */
const IDIOMA_PADRAO = 'pt-BR';

/** Chave usada no localStorage para lembrar o idioma escolhido entre sessões. */
const CHAVE_ARMAZENAMENTO_IDIOMA = 'loranks:idioma';

/**
 * Único ponto de verdade sobre quais idiomas existem — tanto o
 * dicionário quanto qualquer seletor de idioma (ex.: um futuro
 * campo na página de Perfil) devem derivar desta lista, nunca
 * hard-codar os códigos em outro lugar.
 */
const IDIOMAS_SUPORTADOS = Object.freeze(['pt-BR', 'en-US', 'es-ES']);

/**
 * Dicionário de traduções, uma chave em notação de ponto por texto
 * (ex.: "painel.titulo"). O português é a fonte de verdade: se uma
 * chave existir em pt-BR mas faltar em outro idioma, o aplicador
 * cai de volta para pt-BR nessa chave específica (ver `_obterTraducao`)
 * em vez de deixar o elemento em branco.
 *
 * Note que "dd/mm/aaaa" (placeholder do campo Data) e os valores de
 * exemplo de preço ("19.90"/"29.90") NÃO têm chave de tradução: o
 * formato de data é interpretado literalmente por `cadastro.js`
 * (`_interpretarData`), então traduzir a dica para, por exemplo,
 * "mm/dd/yyyy" enganaria o usuário sobre o que o sistema realmente
 * aceita.
 */
const TRADUCOES = Object.freeze({
  'pt-BR': Object.freeze({
    documento: { titulo: 'Loranks · Painel de Estoque' },
    nav: { telaInicial: 'Tela inicial', cadastro: 'Cadastro', movimentacao: 'Movimentação', planilha: 'Planilha', perfil: 'Perfil', sair: 'SAIR' },
    painel: {
      titulo: 'Painel de Estoque',
      subtitulo: 'Visão geral da situação atual dos produtos cadastrados',
      grafico: {
        titulo: 'Distribuição do Estoque por Produto',
        subtitulo: 'Percentual que cada produto ocupa da quantidade total armazenada',
        semSuporteCanvas: 'Seu navegador não suporta a exibição de gráficos em canvas.',
        semProdutos: 'Nenhum produto cadastrado ainda.',
      },
      criticos: {
        titulo: 'Produtos que Exigem Atenção',
        subtitulo: 'Abaixo do estoque mínimo cadastrado',
        semProdutos: 'Nenhum produto abaixo do estoque mínimo no momento.',
      },
      indicadores: {
        produtosCadastrados: 'Produtos cadastrados',
        unidadesEmEstoque: 'Unidades em estoque',
        abaixoDoMinimo: 'Abaixo do mínimo',
        esgotados: 'Esgotados',
        valorInvestido: 'Valor investido em estoque',
        valorVenda: 'Valor de venda potencial',
      },
    },
    cadastro: {
      tituloModal: 'Cadastrar produto',
      tituloModalEdicao: 'Editar produto',
      fecharAria: 'Fechar formulário de cadastro',
      campoMarca: 'Marca do produto',
      campoNome: 'Nome do produto',
      campoQuantidade: 'Quantidade',
      campoCodigo: 'Código',
      campoData: 'Data',
      dicaData: 'Em branco = data de hoje',
      campoTipo: 'Tipo',
      campoFornecedor: 'Fornecedor',
      campoUnidade: 'Unidade de medida',
      campoPrecoCusto: 'Preço de custo de cada unidade',
      placeholderPrecoCusto: 'ex.: 19.90',
      campoPrecoVenda: 'Preço de venda de cada unidade (R$)',
      placeholderPrecoVenda: 'ex.: 29.90',
      campoEstoqueMinimo: 'Estoque mínimo',
      dicaEstoqueMinimo: 'Em branco = sem alerta de estoque crítico para este produto',
      campoEstoqueMaximo: 'Estoque máximo',
      dicaEstoqueMaximo: 'Em branco = sem alerta de superlotação para este produto',
      placeholderOpcional: 'opcional',
      botaoSalvar: 'SALVAR',
      botaoSalvarAlteracoes: 'SALVAR ALTERAÇÕES',
      mensagens: {
        camposObrigatorios: 'Preencha ao menos nome do produto, quantidade, código e tipo.',
        quantidadeInvalida: 'Quantidade inválida: informe um número inteiro maior ou igual a zero.',
        dataInvalida: 'Data inválida: use o formato dd/mm/aaaa (ou deixe em branco para usar a data de hoje).',
        precoCustoInvalido: 'Preço de custo inválido: informe um número maior ou igual a zero, ou deixe em branco.',
        precoVendaInvalido: 'Preço de venda inválido: informe um número maior ou igual a zero, ou deixe em branco.',
        estoqueMinimoInvalido: 'Estoque mínimo inválido: informe um número inteiro maior ou igual a zero, ou deixe em branco.',
        estoqueMaximoInvalido: 'Estoque máximo inválido: informe um número inteiro maior ou igual a zero, ou deixe em branco.',
        minimoMaiorQueMaximo: 'Estoque mínimo não pode ser maior que o estoque máximo.',
        erroSalvarGenerico: 'Não foi possível salvar o produto agora. Tente novamente.',
      },
    },
    movimentacao: {
      titulo: 'Movimentação de estoque',
      subtitulo: 'Registre entradas e saídas bipando o código de barras ou digitando manualmente',
      cartaoTitulo: 'Nova movimentação',
      cartaoSubtitulo: 'O mesmo campo aceita tanto o leitor de código de barras quanto a digitação manual',
      campoCodigo: 'Código do produto',
      placeholderCodigo: 'Bipe ou digite o código e pressione Enter',
      campoQuantidade: 'Quantidade',
      campoTipo: 'Tipo',
      tipoEntrada: 'Entrada (compra)',
      tipoSaida: 'Saída (venda)',
      botaoConfirmar: 'Confirmar movimentação',
      produtoEncontrado: '{nome} | estoque atual: {quantidade} {unidade}',
      produtoSemNome: 'Produto sem nome',
      mensagens: {
        codigoObrigatorio: 'Bipe ou digite um código de produto.',
        quantidadeInvalida: 'Quantidade inválida: informe um número inteiro maior que zero.',
        produtoNaoEncontrado: 'Produto não encontrado para este código.',
        erroGenerico: 'Não foi possível registrar a movimentação agora. Tente novamente.',
        entradaSucesso: 'Entrada de {quantidade} un. registrada com sucesso.',
        saidaSucesso: 'Saída de {quantidade} un. registrada com sucesso.',
      },
      historico: {
        cartaoTitulo: 'Histórico de movimentações',
        cartaoSubtitulo: 'Todas as entradas e saídas registradas, mais recentes primeiro',
        colunaProduto: 'Produto',
        colunaData: 'Data',
        colunaTipo: 'Tipo',
        colunaQuantidade: 'Quantidade',
        vazio: 'Nenhuma movimentação registrada ainda.',
        erroCarregar: 'Não foi possível carregar o histórico de movimentações.',
      },
    },
    perfil: {
      tituloPagina: 'Perfil',
      subtitulo: 'Atualize os dados de acesso e o idioma da sua conta',
      dadosDaConta: 'Dados da conta',
      campoNome: 'Nome de usuário',
      campoSenha: 'Senha',
      dicaSenha: 'A senha deve ter no mínimo 6 caracteres.',
      campoIdioma: 'Idioma',
      idiomaOpcaoPortugues: 'Português',
      idiomaOpcaoIngles: 'English',
      idiomaOpcaoEspanhol: 'Español',
      botaoSalvar: 'Salvar alterações',
    },
    planilha: {
      titulo: 'Planilha de produtos',
      fecharAria: 'Fechar planilha',
      telaCheiaAria: 'Expandir para tela cheia',
      telaCheiaSairAria: 'Sair da tela cheia',
      placeholderBusca: 'Buscar por nome, código, marca...',
      botaoExportar: 'Exportar CSV',
      paginaAnterior: '‹ Anterior',
      proximaPagina: 'Próxima ›',
      botaoEditar: 'Editar',
      botaoExcluir: 'Excluir',
     
      colunas: {
        id: 'ID',
        marca: 'Marca',
        nomeProduto: 'Nome do produto',
        quantidade: 'Quantidade',
        estoqueMinimo: 'Estoque mínimo',
        estoqueMaximo: 'Estoque máximo',
        codigo: 'Código',
        data: 'Data',
        tipo: 'Tipo',
        fornecedor: 'Fornecedor',
        unidadeMedida: 'Unidade',
        precoCusto: 'Preço custo',
        precoVenda: 'Preço venda',
        valorTotalEmEstoque: 'Valor em estoque',
        status: 'Status',
        acoes: 'Ações',
        projecaoVenda: 'Projeção de venda',
        
      },
      status: {
        esgotado: 'Esgotado',
        critico: 'Crítico',
        superlotado: 'Superlotado',
        normal: 'Normal',
      },
      mensagens: {
        carregando: 'Carregando...',
        semProdutos: 'Nenhum produto cadastrado ainda.',
        semResultadoBusca: 'Nenhum produto encontrado para essa busca.',
        confirmarExclusao: 'Excluir "{nome}"? Esta ação não pode ser desfeita.',
        erroExcluirGenerico: 'Não foi possível excluir o produto agora. Tente novamente.',
        erroExportarSemDados: 'Nenhum produto para exportar com o filtro atual.',
        pagina: 'Página {atual} de {total}',
        contagemUnico: '{total} produto',
        contagemMultiplo: '{total} produtos',
        contagemFiltrada: '{exibida} de {total} produtos',
        totalEmEstoque: '— {valor} em estoque',
        
      },
      
      
    },
    privilegios: {
      botaoAbrir: 'Privilégios',
      fecharAria: 'Fechar',
      titulo: 'Privilégios de usuário',
      instrucao: 'Promover, rebaixar ou excluir uma conta exige a senha de privilégios do servidor - diferente da senha de login de qualquer pessoa.',
      campoUsuario: 'Conta',
      campoNivel: 'Nível',
      opcaoFuncionario: 'Funcionário',
      opcaoAdmin: 'Administrador',
      campoSenha: 'Senha de privilégios',
      botaoConfirmar: 'CONFIRMAR',
      botaoExcluirConta: 'Excluir esta conta',
      mensagens: {
        erroCarregarUsuarios: 'Não foi possível carregar a lista de usuários agora.',
        selecioneUsuario: 'Selecione uma conta.',
        informeSenha: 'Informe a senha de privilégios.',
        sucesso: 'Privilégio atualizado com sucesso.',
        erroGenerico: 'Não foi possível atualizar o privilégio agora. Tente novamente.',
        confirmarExclusao: 'Excluir definitivamente a conta "{usuario}"? Esta ação não pode ser desfeita.',
        sucessoExclusao: 'Conta excluída com sucesso.',
      },
    },
  }),

  'en-US': Object.freeze({
    documento: { titulo: 'Loranks · Inventory Dashboard' },
    nav: { telaInicial: 'Home', cadastro: 'Register', movimentacao: 'Movement', planilha: 'Spreadsheet', perfil: 'Profile', sair: 'LOG OUT' },
    painel: {
      titulo: 'Inventory Dashboard',
      subtitulo: 'Overview of the current status of registered products',
      grafico: {
        titulo: 'Stock Distribution by Product',
        subtitulo: 'Percentage each product represents of the total quantity stored',
        semSuporteCanvas: 'Your browser does not support displaying charts on canvas.',
        semProdutos: 'No products registered yet.',
      },
      criticos: {
        titulo: 'Products That Need Attention',
        subtitulo: 'Below the registered minimum stock',
        semProdutos: 'No products below the registered minimum stock at the moment.',
      },
      indicadores: {
        produtosCadastrados: 'Registered products',
        unidadesEmEstoque: 'Units in stock',
        abaixoDoMinimo: 'Below minimum',
        esgotados: 'Out of stock',
        valorInvestido: 'Amount invested in stock',
        valorVenda: 'Potential sale value',
      },
    },
    cadastro: {
      tituloModal: 'Register product',
      tituloModalEdicao: 'Edit product',
      fecharAria: 'Close registration form',
      campoMarca: 'Product brand',
      campoNome: 'Product name',
      campoQuantidade: 'Quantity',
      campoCodigo: 'Code',
      campoData: 'Date',
      dicaData: 'Blank = today\u2019s date',
      campoTipo: 'Type',
      campoFornecedor: 'Supplier',
      campoUnidade: 'Unit of measure',
      campoPrecoCusto: 'Cost price per unit (R$)',
      placeholderPrecoCusto: 'e.g.: 19.90',
      campoPrecoVenda: 'Selling price per unit (R$)',
      placeholderPrecoVenda: 'e.g.: 29.90',
      campoEstoqueMinimo: 'Minimum stock',
      dicaEstoqueMinimo: 'Blank = no critical stock alert for this product',
      campoEstoqueMaximo: 'Maximum stock',
      dicaEstoqueMaximo: 'Blank = no overstock alert for this product',
      placeholderOpcional: 'optional',
      botaoSalvar: 'SAVE',
      botaoSalvarAlteracoes: 'SAVE CHANGES',
      mensagens: {
        camposObrigatorios: 'Fill in at least the product name, quantity, code, and type.',
        quantidadeInvalida: 'Invalid quantity: enter a whole number greater than or equal to zero.',
        dataInvalida: 'Invalid date: use the dd/mm/yyyy format (or leave blank to use today\u2019s date).',
        precoCustoInvalido: 'Invalid cost price: enter a number greater than or equal to zero, or leave it blank.',
        precoVendaInvalido: 'Invalid sale price: enter a number greater than or equal to zero, or leave it blank.',
        estoqueMinimoInvalido: 'Invalid minimum stock: enter a whole number greater than or equal to zero, or leave it blank.',
        estoqueMaximoInvalido: 'Invalid maximum stock: enter a whole number greater than or equal to zero, or leave it blank.',
        minimoMaiorQueMaximo: 'Minimum stock cannot be greater than maximum stock.',
        erroSalvarGenerico: 'Could not save the product right now. Please try again.',
      },
    },
    movimentacao: {
      titulo: 'Stock movement',
      subtitulo: 'Record incoming and outgoing stock by scanning the barcode or typing manually',
      cartaoTitulo: 'New movement',
      cartaoSubtitulo: 'The same field accepts both the barcode scanner and manual typing',
      campoCodigo: 'Product code',
      placeholderCodigo: 'Scan or type the code and press Enter',
      campoQuantidade: 'Quantity',
      campoTipo: 'Type',
      tipoEntrada: 'Incoming (purchase)',
      tipoSaida: 'Outgoing (sale)',
      botaoConfirmar: 'Confirm movement',
      produtoEncontrado: '{nome} | current stock: {quantidade} {unidade}',
      produtoSemNome: 'Unnamed product',
      mensagens: {
        codigoObrigatorio: 'Scan or type a product code.',
        quantidadeInvalida: 'Invalid quantity: enter a whole number greater than zero.',
        produtoNaoEncontrado: 'No product found for this code.',
        erroGenerico: 'Could not record the movement right now. Please try again.',
        entradaSucesso: 'Incoming movement of {quantidade} unit(s) recorded successfully.',
        saidaSucesso: 'Outgoing movement of {quantidade} unit(s) recorded successfully.',
      },
      historico: {
        cartaoTitulo: 'Movement history',
        cartaoSubtitulo: 'All recorded incoming and outgoing movements, most recent first',
        colunaProduto: 'Product',
        colunaData: 'Date',
        colunaTipo: 'Type',
        colunaQuantidade: 'Quantity',
        vazio: 'No movements recorded yet.',
        erroCarregar: 'Could not load the movement history.',
      },
    },
    perfil: {
      tituloPagina: 'Profile',
      subtitulo: 'Update your account access details and language',
      dadosDaConta: 'Account details',
      campoNome: 'Username',
      campoSenha: 'Password',
      dicaSenha: 'The password must be at least 6 characters long.',
      campoIdioma: 'Language',
      idiomaOpcaoPortugues: 'Português',
      idiomaOpcaoIngles: 'English',
      idiomaOpcaoEspanhol: 'Español',
      botaoSalvar: 'Save changes',
    },
    planilha: {
      titulo: 'Product spreadsheet',
      fecharAria: 'Close spreadsheet',
      telaCheiaAria: 'Expand to full screen',
      telaCheiaSairAria: 'Exit full screen',
      placeholderBusca: 'Search by name, code, brand...',
      botaoExportar: 'Export CSV',
      paginaAnterior: '‹ Previous',
      proximaPagina: 'Next ›',
      botaoEditar: 'Edit',
      botaoExcluir: 'Delete',
      colunas: {
        id: 'ID',
        marca: 'Brand',
        nomeProduto: 'Product name',
        quantidade: 'Quantity',
        estoqueMinimo: 'Minimum stock',
        estoqueMaximo: 'Maximum stock',
        codigo: 'Code',
        data: 'Date',
        tipo: 'Type',
        fornecedor: 'Supplier',
        unidadeMedida: 'Unit',
        precoCusto: 'Cost price',
        precoVenda: 'Sale price',
        valorTotalEmEstoque: 'Stock value',
        status: 'Status',
        acoes: 'Actions',
        projecaoVenda: 'Sales projection',
       
      },
      status: {
        esgotado: 'Out of stock',
        critico: 'Critical',
        superlotado: 'Overstocked',
        normal: 'Normal',
      },
      mensagens: {
        carregando: 'Loading...',
        semProdutos: 'No products registered yet.',
        semResultadoBusca: 'No products found for this search.',
        confirmarExclusao: 'Delete "{nome}"? This action cannot be undone.',
        erroExcluirGenerico: 'Could not delete the product right now. Please try again.',
        erroExportarSemDados: 'No products to export with the current filter.',
        pagina: 'Page {atual} of {total}',
        contagemUnico: '{total} product',
        contagemMultiplo: '{total} products',
        contagemFiltrada: '{exibida} of {total} products',
        totalEmEstoque: '— {valor} in stock',
      },
    },
    privilegios: {
      botaoAbrir: 'Privileges',
      fecharAria: 'Close',
      titulo: 'User privileges',
      instrucao: 'Promoting, demoting, or deleting an account requires the server privilege password - different from anyone\'s login password.',
      campoUsuario: 'Account',
      campoNivel: 'Level',
      opcaoFuncionario: 'Employee',
      opcaoAdmin: 'Administrator',
      campoSenha: 'Privilege password',
      botaoConfirmar: 'CONFIRM',
      botaoExcluirConta: 'Delete this account',
      mensagens: {
        erroCarregarUsuarios: 'Could not load the user list right now.',
        selecioneUsuario: 'Select an account.',
        informeSenha: 'Enter the privilege password.',
        sucesso: 'Privilege updated successfully.',
        erroGenerico: 'Could not update the privilege right now. Try again.',
        confirmarExclusao: 'Permanently delete the account "{usuario}"? This action cannot be undone.',
        sucessoExclusao: 'Account deleted successfully.',
      },
    },
  }),

  'es-ES': Object.freeze({
    documento: { titulo: 'Loranks · Panel de Inventario' },
    nav: { telaInicial: 'Inicio', cadastro: 'Registro', movimentacao: 'Movimiento', planilha: 'Hoja de cálculo', perfil: 'Perfil', sair: 'SALIR' },
    painel: {
      titulo: 'Panel de Inventario',
      subtitulo: 'Visión general de la situación actual de los productos registrados',
      grafico: {
        titulo: 'Distribución del Inventario por Producto',
        subtitulo: 'Porcentaje que cada producto representa de la cantidad total almacenada',
        semSuporteCanvas: 'Su navegador no admite la visualización de gráficos en canvas.',
        semProdutos: 'Todavía no hay productos registrados.',
      },
      criticos: {
        titulo: 'Productos que Requieren Atención',
        subtitulo: 'Por debajo del stock mínimo registrado',
        semProdutos: 'No hay productos por debajo del stock mínimo en este momento.',
      },
      indicadores: {
        produtosCadastrados: 'Productos registrados',
        unidadesEmEstoque: 'Unidades en stock',
        abaixoDoMinimo: 'Por debajo del mínimo',
        esgotados: 'Agotados',
        valorInvestido: 'Valor invertido en stock',
        valorVenda: 'Valor de venta potencial',
      },
    },
    cadastro: {
      tituloModal: 'Registrar producto',
      tituloModalEdicao: 'Editar producto',
      fecharAria: 'Cerrar formulario de registro',
      campoMarca: 'Marca del producto',
      campoNome: 'Nombre del producto',
      campoQuantidade: 'Cantidad',
      campoCodigo: 'Código',
      campoData: 'Fecha',
      dicaData: 'En blanco = fecha de hoy',
      campoTipo: 'Tipo',
      campoFornecedor: 'Proveedor',
      campoUnidade: 'Unidad de medida',
      campoPrecoCusto: 'Precio de costo por unidad (R$)',
      placeholderPrecoCusto: 'ej.: 19.90',
      campoPrecoVenda: 'Precio de venta por unidad (R$)',
      placeholderPrecoVenda: 'ej.: 29.90',
      campoEstoqueMinimo: 'Stock mínimo',
      dicaEstoqueMinimo: 'En blanco = sin alerta de stock crítico para este producto',
      campoEstoqueMaximo: 'Stock máximo',
      dicaEstoqueMaximo: 'En blanco = sin alerta de sobrestock para este producto',
      placeholderOpcional: 'opcional',
      botaoSalvar: 'GUARDAR',
      botaoSalvarAlteracoes: 'GUARDAR CAMBIOS',
      mensagens: {
        camposObrigatorios: 'Completa al menos el nombre del producto, cantidad, código y tipo.',
        quantidadeInvalida: 'Cantidad inválida: indica un número entero mayor o igual a cero.',
        dataInvalida: 'Fecha inválida: usa el formato dd/mm/aaaa (o déjalo en blanco para usar la fecha de hoy).',
        precoCustoInvalido: 'Precio de costo inválido: indica un número mayor o igual a cero, o déjalo en blanco.',
        precoVendaInvalido: 'Precio de venta inválido: indica un número mayor o igual a cero, o déjalo en blanco.',
        estoqueMinimoInvalido: 'Stock mínimo inválido: indica un número entero mayor o igual a cero, o déjalo en blanco.',
        estoqueMaximoInvalido: 'Stock máximo inválido: indica un número entero mayor o igual a cero, o déjalo en blanco.',
        minimoMaiorQueMaximo: 'El stock mínimo no puede ser mayor que el stock máximo.',
        erroSalvarGenerico: 'No se pudo guardar el producto en este momento. Inténtalo de nuevo.',
        
      },
    },
    movimentacao: {
      titulo: 'Movimiento de inventario',
      subtitulo: 'Registra entradas y salidas escaneando el código de barras o escribiendo manualmente',
      cartaoTitulo: 'Nuevo movimiento',
      cartaoSubtitulo: 'El mismo campo acepta tanto el lector de código de barras como la escritura manual',
      campoCodigo: 'Código del producto',
      placeholderCodigo: 'Escanea o escribe el código y presiona Enter',
      campoQuantidade: 'Cantidad',
      campoTipo: 'Tipo',
      tipoEntrada: 'Entrada (compra)',
      tipoSaida: 'Salida (venta)',
      botaoConfirmar: 'Confirmar movimiento',
      produtoEncontrado: '{nome} | stock actual: {quantidade} {unidade}',
      produtoSemNome: 'Producto sin nombre',
      mensagens: {
        codigoObrigatorio: 'Escanea o escribe un código de producto.',
        quantidadeInvalida: 'Cantidad inválida: indica un número entero mayor que cero.',
        produtoNaoEncontrado: 'No se encontró ningún producto con este código.',
        erroGenerico: 'No se pudo registrar el movimiento en este momento. Inténtalo de nuevo.',
        entradaSucesso: 'Entrada de {quantidade} unidad(es) registrada con éxito.',
        saidaSucesso: 'Salida de {quantidade} unidad(es) registrada con éxito.',
      },
      historico: {
        cartaoTitulo: 'Historial de movimientos',
        cartaoSubtitulo: 'Todos los movimientos registrados, los más recientes primero',
        colunaProduto: 'Producto',
        colunaData: 'Fecha',
        colunaTipo: 'Tipo',
        colunaQuantidade: 'Cantidad',
        vazio: 'Todavía no hay movimientos registrados.',
        erroCarregar: 'No se pudo cargar el historial de movimientos.',
      },
    },
    perfil: {
      tituloPagina: 'Perfil',
      subtitulo: 'Actualiza los datos de acceso y el idioma de tu cuenta',
      dadosDaConta: 'Datos de la cuenta',
      campoNome: 'Nombre de usuario',
      campoSenha: 'Contraseña',
      dicaSenha: 'La contraseña debe tener al menos 6 caracteres.',
      campoIdioma: 'Idioma',
      idiomaOpcaoPortugues: 'Português',
      idiomaOpcaoIngles: 'English',
      idiomaOpcaoEspanhol: 'Español',
      botaoSalvar: 'Guardar cambios',
    },
    planilha: {
      titulo: 'Hoja de cálculo de productos',
      fecharAria: 'Cerrar hoja de cálculo',
      telaCheiaAria: 'Expandir a pantalla completa',
      telaCheiaSairAria: 'Salir de pantalla completa',
      placeholderBusca: 'Buscar por nombre, código, marca...',
      botaoExportar: 'Exportar CSV',
      paginaAnterior: '‹ Anterior',
      proximaPagina: 'Siguiente ›',
      botaoEditar: 'Editar',
      botaoExcluir: 'Eliminar',
      
      colunas: {
        id: 'ID',
        marca: 'Marca',
        nomeProduto: 'Nombre del producto',
        quantidade: 'Cantidad',
        estoqueMinimo: 'Stock mínimo',
        estoqueMaximo: 'Stock máximo',
        codigo: 'Código',
        data: 'Fecha',
        tipo: 'Tipo',
        fornecedor: 'Proveedor',
        unidadeMedida: 'Unidad',
        precoCusto: 'Precio costo',
        precoVenda: 'Precio venta',
        valorTotalEmEstoque: 'Valor en stock',
        status: 'Estado',
        acoes: 'Acciones',
        projecaoVenda: 'Proyección de venta',
       
      },
      status: {
        esgotado: 'Agotado',
        critico: 'Crítico',
        superlotado: 'Sobrestock',
        normal: 'Normal',
      },
      mensagens: {
        carregando: 'Cargando...',
        semProdutos: 'Todavía no hay productos registrados.',
        semResultadoBusca: 'No se encontraron productos para esta búsqueda.',
        confirmarExclusao: '¿Eliminar "{nome}"? Esta acción no se puede deshacer.',
        erroExcluirGenerico: 'No se pudo eliminar el producto en este momento. Inténtalo de nuevo.',
        erroExportarSemDados: 'No hay productos para exportar con el filtro actual.',
        pagina: 'Página {atual} de {total}',
        contagemUnico: '{total} producto',
        contagemMultiplo: '{total} productos',
        contagemFiltrada: '{exibida} de {total} productos',
        totalEmEstoque: '— {valor} en stock',
      },
    },
    privilegios: {
      botaoAbrir: 'Privilegios',
      fecharAria: 'Cerrar',
      titulo: 'Privilegios de usuario',
      instrucao: 'Promover, degradar o eliminar una cuenta requiere la contraseña de privilegios del servidor - diferente de la contraseña de acceso de cualquier persona.',
      campoUsuario: 'Cuenta',
      campoNivel: 'Nivel',
      opcaoFuncionario: 'Empleado',
      opcaoAdmin: 'Administrador',
      campoSenha: 'Contraseña de privilegios',
      botaoConfirmar: 'CONFIRMAR',
      botaoExcluirConta: 'Eliminar esta cuenta',
      mensagens: {
        erroCarregarUsuarios: 'No se pudo cargar la lista de usuarios ahora.',
        selecioneUsuario: 'Seleccione una cuenta.',
        informeSenha: 'Ingrese la contraseña de privilegios.',
        sucesso: 'Privilegio actualizado con éxito.',
        erroGenerico: 'No se pudo actualizar el privilegio ahora. Intente de nuevo.',
        confirmarExclusao: '¿Eliminar definitivamente la cuenta "{usuario}"? Esta acción no se puede deshacer.',
        sucessoExclusao: 'Cuenta eliminada con éxito.',
      },
    },
  }),
});

/**
 * Aplica o dicionário de traduções ao DOM. Separado em uma classe
 * (em vez de funções soltas) pelo mesmo motivo dos demais arquivos:
 * mantém o estado (dicionários, idioma padrão) encapsulado, sem
 * poluir o escopo global com variáveis auxiliares.
 */
class AplicadorDeTraducoes {
  constructor(dicionariosPorIdioma, idiomaPadrao) {
    this.dicionariosPorIdioma = dicionariosPorIdioma;
    this.idiomaPadrao = idiomaPadrao;
  }

  /** Porteiro: só aceita um código de idioma que exista de fato no dicionário. */
  _ehIdiomaSuportado(idioma) {
    return typeof idioma === 'string' && Object.prototype.hasOwnProperty.call(this.dicionariosPorIdioma, idioma);
  }

  /**
   * Resolve uma chave em notação de ponto (ex.: "painel.grafico.titulo")
   * dentro de um dicionário. Retorna `null` — nunca lança erro — se a
   * chave não existir ou não apontar para uma string, para que o
   * chamador decida o que fazer (aqui, cair para o idioma padrão).
   */
  _resolverChave(dicionario, chave) {
    const partes = chave.split('.');
    let atual = dicionario;

    for (const parte of partes) {
      if (atual === null || typeof atual !== 'object' || !(parte in atual)) {
        return null;
      }
      atual = atual[parte];
    }

    return typeof atual === 'string' ? atual : null;
  }

  /**
   * Traduz uma chave no idioma pedido, caindo para o idioma padrão
   * se a chave faltar ali (dicionário incompleto) — nunca deixa o
   * elemento sem texto por causa de uma tradução ausente.
   */
  _traduzir(idioma, chave) {
    const dicionarioAtual = this.dicionariosPorIdioma[idioma];
    const traducao = this._resolverChave(dicionarioAtual, chave);
    if (traducao !== null) {
      return traducao;
    }

    const dicionarioPadrao = this.dicionariosPorIdioma[this.idiomaPadrao];
    return this._resolverChave(dicionarioPadrao, chave);
  }

  /**
   * Aplica o idioma pedido a todo o documento. Retorna o idioma
   * efetivamente aplicado (pode ser o padrão, se o pedido for
   * inválido/não suportado), para o chamador persistir o valor certo.
   */
  aplicar(idioma) {
    const idiomaResolvido = this._ehIdiomaSuportado(idioma) ? idioma : this.idiomaPadrao;

    document.documentElement.setAttribute('lang', idiomaResolvido);

    this._aplicarPorAtributo(idiomaResolvido, 'data-i18n', (elemento, texto) => {
      // textContent: nunca innerHTML — a tradução nunca é interpretada como HTML/script.
      elemento.textContent = texto;
    });

    this._aplicarPorAtributo(idiomaResolvido, 'data-i18n-placeholder', (elemento, texto) => {
      elemento.setAttribute('placeholder', texto);
    });

    this._aplicarPorAtributo(idiomaResolvido, 'data-i18n-aria-label', (elemento, texto) => {
      elemento.setAttribute('aria-label', texto);
    });

    return idiomaResolvido;
  }

  _aplicarPorAtributo(idioma, nomeAtributo, escrever) {
    document.querySelectorAll(`[${nomeAtributo}]`).forEach((elemento) => {
      const chave = elemento.getAttribute(nomeAtributo);
      const texto = this._traduzir(idioma, chave);
      if (texto !== null) {
        escrever(elemento, texto);
      } else {
        console.warn(`[i18n] Chave de tradução não encontrada: "${chave}" (atributo ${nomeAtributo}).`);
      }
    });
  }
}

/**
 * Persistência da preferência de idioma. Isolada num objeto próprio
 * (mesmo padrão de `Sanitizacao`/`ValidadorSenha` nos outros
 * arquivos): nunca lança erro para quem chama, e nunca guarda um
 * valor fora de `IDIOMAS_SUPORTADOS`.
 */
const PreferenciaDeIdioma = Object.freeze({
  ler() {
    try {
      const valor = window.localStorage.getItem(CHAVE_ARMAZENAMENTO_IDIOMA);
      return IDIOMAS_SUPORTADOS.includes(valor) ? valor : null;
    } catch (erro) {
      // localStorage pode estar indisponível (modo privado, política do
      // navegador); nesse caso seguimos sem preferência salva em vez de
      // quebrar a aplicação.
      console.warn('[i18n] Não foi possível ler a preferência de idioma salva:', erro);
      return null;
    }
  },

  salvar(idioma) {
    if (!IDIOMAS_SUPORTADOS.includes(idioma)) {
      console.warn('[i18n] Tentativa de salvar idioma não suportado ignorada:', idioma);
      return;
    }
    try {
      window.localStorage.setItem(CHAVE_ARMAZENAMENTO_IDIOMA, idioma);
    } catch (erro) {
      console.warn('[i18n] Não foi possível salvar a preferência de idioma:', erro);
    }
  },
});

const aplicadorDeTraducoes = new AplicadorDeTraducoes(TRADUCOES, IDIOMA_PADRAO);

/**
 * Substitui marcadores "{nome}" pelo valor correspondente em `variaveis`.
 * Usado por mensagens com dados dinâmicos (ex.: "Excluir \"{nome}\"?",
 * "Página {atual} de {total}") que view/módulos fora deste arquivo
 * precisam montar - eles não sabem qual é a "forma" da frase em cada
 * idioma, só fornecem os valores.
 */
function interpolar(texto, variaveis) {
  if (!variaveis) return texto;
  return texto.replace(/\{(\w+)\}/g, (correspondencia, nomeVariavel) =>
    Object.prototype.hasOwnProperty.call(variaveis, nomeVariavel) ? String(variaveis[nomeVariavel]) : correspondencia
  );
}

/**
 * API pública mínima, exposta em `window.Idioma` para que uma tela
 * futura (ex.: um seletor de idioma na página de Perfil) possa
 * trocar o idioma sem precisar conhecer o dicionário ou o
 * aplicador internamente.
 */
const Idioma = Object.freeze({
  obterAtual() {
    return document.documentElement.getAttribute('lang') || IDIOMA_PADRAO;
  },

  obterSuportados() {
    return [...IDIOMAS_SUPORTADOS];
  },

  /**
   * Traduz uma chave para o idioma atual, para uso por qualquer módulo
   * que gere texto dinamicamente em JS (tabelas, mensagens de
   * erro/sucesso, selos de status etc.) - conteúdo que não existe como
   * elemento fixo no HTML, então nunca passaria pelo `data-i18n`
   * automático. `variaveis` (opcional) preenche marcadores "{chave}" no
   * texto encontrado. Nunca retorna null: cai para a própria chave se
   * nem o idioma atual nem o padrão tiverem a tradução, para o texto
   * nunca sumir da tela por causa de uma chave esquecida.
   */
  traduzir(chave, variaveis) {
    const texto = aplicadorDeTraducoes._traduzir(this.obterAtual(), chave);
    if (texto === null) {
      console.warn(`[i18n] Chave de tradução não encontrada: "${chave}" (Idioma.traduzir).`);
      return chave;
    }
    return interpolar(texto, variaveis);
  },

  /** Aplica e persiste o idioma pedido; retorna o idioma efetivamente aplicado. */
  definir(idioma) {
    const idiomaAplicado = aplicadorDeTraducoes.aplicar(idioma);
    PreferenciaDeIdioma.salvar(idiomaAplicado);
    // Avisa qualquer módulo que tenha conteúdo gerado em JS (tabelas,
    // selos, mensagens) e precise se re-renderizar para refletir o novo
    // idioma imediatamente, sem esperar o usuário fechar e reabrir a tela.
    window.dispatchEvent(new CustomEvent('idioma:alterado', { detail: { idioma: idiomaAplicado } }));
    return idiomaAplicado;
  },
});

window.Idioma = Idioma;

function inicializarI18n() {
  const idiomaSalvo = PreferenciaDeIdioma.ler();
  Idioma.definir(idiomaSalvo || IDIOMA_PADRAO);
}

inicializarI18n();











































