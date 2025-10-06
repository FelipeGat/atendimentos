/**
 * Utilitário para chamadas de API
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

/**
 * Retorna a URL base da API
 */
export const getApiBase = () => {
    return API_BASE_URL;
};

/**
 * Retorna os headers padrão (para compatibilidade com código legado)
 */
export const getHeaders = (empresaId = null) => {
    return getDefaultHeaders(false, empresaId);
};

/**
 * Monta os cabeçalhos padrão, incluindo o X-Empresa-ID se fornecido.
 */
const getDefaultHeaders = (isFormData = false, empresaId = null) => {
    const headers = {};

    // Se não foi passado explicitamente, tentar obter do localStorage
    if (!empresaId) {
        try {
            const storedEmpresa = localStorage.getItem('empresa_id');
            if (storedEmpresa) {
                empresaId = storedEmpresa;
            } else {
                const user = localStorage.getItem('user');
                if (user) {
                    const parsed = JSON.parse(user);
                    empresaId = parsed?.empresa_id || parsed?.empresaId || parsed?.empresa || null;
                }
            }
            // Fallback para desenvolvimento - usar empresa_id=1
            if (!empresaId) {
                empresaId = 1;
            }
        } catch (e) {
            // ignore parse errors, usar fallback
            empresaId = 1;
        }
    }

    if (empresaId) {
        // Adiciona o ID da empresa ao cabeçalho
        headers['X-Empresa-ID'] = empresaId;
    }

    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
};

/**
 * Função genérica para fazer requisições à API
 */
export const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}/${endpoint}`;
    const isFormData = options.body instanceof FormData;

    // Configura a requisição, passando o empresaId para getDefaultHeaders
    const config = {
        headers: getDefaultHeaders(isFormData, options.empresaId),
        ...options
    };

    // Lógica para simular PUT/DELETE com POST para suportar FormData
    if (isFormData && (options.method === 'PUT' || options.method === 'DELETE')) {
        config.method = 'POST';
        config.headers['X-HTTP-Method-Override'] = options.method;
    }

    if (isFormData && config.headers['Content-Type']) {
        delete config.headers['Content-Type'];
    }

    try {
        // Debug: logar requisições DELETE para inspecionar headers e url
        if (options.method === 'DELETE') {
            console.debug('[API DEBUG] DELETE Request -> URL:', url);
            console.debug('[API DEBUG] DELETE Request -> Config:', config);
        }

        const response = await fetch(url, config);

        if (response.headers.get('content-type')?.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                // Lança o erro do backend se a resposta for JSON e não for ok
                throw new Error(data.message || data.error || `Erro HTTP: ${response.status}`);
            }
            return data;
        }

        // Trata respostas não-JSON (como 204 No Content ou sucesso simples)
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        return { success: true, message: `Requisição ${options.method} bem-sucedida.` };

    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
};

/**
 * Objeto utilitário para simplificar as chamadas HTTP (GET, POST, PUT, DELETE)
 */
export const api = {
    get: (endpoint, id = null, options = {}) => {
        const url = id ? `${endpoint}?id=${id}` : endpoint;
        return apiRequest(url, { method: 'GET', ...options });
    },

    post: (endpoint, data, options = {}) => {
        const body = data instanceof FormData ? data : JSON.stringify(data);
        return apiRequest(endpoint, {
            method: 'POST',
            body,
            ...options
        });
    },

    put: (endpoint, id, data, options = {}) => {
        const url = `${endpoint}?id=${id}`;
        const body = data instanceof FormData ? data : JSON.stringify(data);
        return apiRequest(url, {
            method: 'PUT',
            body,
            ...options
        });
    },

    delete: (endpoint, id, options = {}) => {
        const url = `${endpoint}?id=${id}`;
        return apiRequest(url, {
            method: 'DELETE',
            ...options
        });
    }
};


// ========================================================================
// FUNÇÕES ESPECÍFICAS PARA CADA ENTIDADE (GARANTIA DE CONSISTÊNCIA MULTI-TENANT)
// ========================================================================

/**
 * Assuntos API
 */
export const assuntosAPI = {
    listar: (params = {}) => api.get('assuntos.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('assuntos.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('assuntos.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('assuntos.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('assuntos.php', id, { empresaId })
};

/**
 * Clientes API
 */
export const clientesAPI = {
    listar: (params = {}) => api.get('clientes.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('clientes.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('clientes.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('clientes.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('clientes.php', id, { empresaId })
};

/**
 * Segmentos API
 */
export const segmentosAPI = {
    listar: (params = {}) => api.get('segmentos.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('segmentos.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('segmentos.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('segmentos.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('segmentos.php', id, { empresaId })
};

/**
 * Usuários API
 */
export const usuariosAPI = {
    listar: (params = {}) => api.get('usuarios.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('usuarios.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('usuarios.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('usuarios.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('usuarios.php', id, { empresaId })
};

/**
 * Equipamentos API
 */
export const equipamentosAPI = {
    listar: (params = {}) => api.get('equipamentos.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('equipamentos.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('equipamentos.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('equipamentos.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('equipamentos.php', id, { empresaId })
};

/**
 * Atendimentos API
 */
export const atendimentosAPI = {
    listar: (params = {}) => api.get('atendimentos.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('atendimentos.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('atendimentos.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('atendimentos.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('atendimentos.php', id, { empresaId })
};

/**
 * Dashboard API (Foco principal da correção inicial)
 */
export const dashboardAPI = {
    obterDados: (params = {}) => api.get('dashboard.php', null, { empresaId: params.empresaId })
};

export const empresasAPI = {
    listar: () => api.get('empresas.php'), // Não requer empresaId para listar todas
    buscar: (id) => api.get('empresas.php', id),
    criar: (data) => api.post('empresas.php', data),
    atualizar: (id, data) => api.put('empresas.php', id, data),
    excluir: (id) => api.delete('empresas.php', id)
};

/**
 * Orçamentos API
 */
export const orcamentosAPI = {
    listar: (params = {}) => api.get('orcamentos.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('orcamentos.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('orcamentos.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('orcamentos.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('orcamentos.php', id, { empresaId })
};

/**
 * APIs do Módulo Financeiro
 * Adicionar estas funções ao arquivo api.js existente
 */

/**
 * Fornecedores API
 */
export const fornecedoresAPI = {
    listar: (params = {}) => api.get('fornecedores.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('fornecedores.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('fornecedores.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('fornecedores.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('fornecedores.php', id, { empresaId })
};

/**
 * Contas Bancárias API
 */
export const contasBancariasAPI = {
    listar: (params = {}) => api.get('contas_bancarias.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('contas_bancarias.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('contas_bancarias.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('contas_bancarias.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('contas_bancarias.php', id, { empresaId }),

    // Movimentações
    listarMovimentacoes: (contaId = null, params = {}) => {
        const endpoint = contaId
            ? `contas_bancarias.php?action=movimentacoes&conta_id=${contaId}`
            : 'contas_bancarias.php?action=movimentacoes';
        return api.get(endpoint, null, { empresaId: params.empresaId });
    },

    // Transferência entre contas
    transferir: (data) => apiRequest('contas_bancarias.php?action=transferencia', {
        method: 'POST',
        body: JSON.stringify(data),
        empresaId: data.empresa_id
    }),

    // Registrar movimentação manual
    registrarMovimentacao: (data) => apiRequest('contas_bancarias.php?action=movimentacao', {
        method: 'POST',
        body: JSON.stringify(data),
        empresaId: data.empresa_id
    })
};

/**
 * Contas a Pagar API
 */
export const contasPagarAPI = {
    listar: (params = {}) => api.get('contas_pagar.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('contas_pagar.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('contas_pagar.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('contas_pagar.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('contas_pagar.php', id, { empresaId }),

    // Filtros específicos
    listarVencidas: (params = {}) => api.get('contas_pagar.php?action=vencidas', null, { empresaId: params.empresaId }),
    listarAVencer: (params = {}) => api.get('contas_pagar.php?action=a_vencer', null, { empresaId: params.empresaId }),

    // Registrar pagamento
    registrarPagamento: (id, data) => apiRequest(`contas_pagar.php?action=pagar&id=${id}`, {
        method: 'POST',
        body: JSON.stringify(data),
        empresaId: data.empresa_id
    })
};

/**
 * Contas a Receber API
 */
export const contasReceberAPI = {
    listar: (params = {}) => api.get('contas_receber.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('contas_receber.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('contas_receber.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('contas_receber.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('contas_receber.php', id, { empresaId }),

    // Filtros específicos
    listarVencidas: (params = {}) => api.get('contas_receber.php?action=vencidas', null, { empresaId: params.empresaId }),
    listarAVencer: (params = {}) => api.get('contas_receber.php?action=a_vencer', null, { empresaId: params.empresaId }),

    // Registrar recebimento
    registrarRecebimento: (id, data) => apiRequest(`contas_receber.php?action=receber&id=${id}`, {
        method: 'POST',
        body: JSON.stringify(data),
        empresaId: data.empresa_id
    })
};

/**
 * Dashboard Financeiro API
 */
export const dashboardFinanceiroAPI = {
    obterDados: (params = {}) => api.get('dashboard_financeiro.php', null, { empresaId: params.empresaId })
};

/**
 * Lançamentos Recorrentes API
 */
export const lancamentosRecorrentesAPI = {
    listar: (params = {}) => api.get('lancamentos_recorrentes.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('lancamentos_recorrentes.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('lancamentos_recorrentes.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('lancamentos_recorrentes.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('lancamentos_recorrentes.php', id, { empresaId }),

    // Gerar lançamentos
    gerar: (params = {}) => api.get('lancamentos_recorrentes.php?action=gerar', null, { empresaId: params.empresaId })
};

/**
 * Categorias Financeiras API
 */
export const categoriasFinanceirasAPI = {
    listar: (params = {}) => api.get('categorias_financeiras.php', null, { empresaId: params.empresaId }),
    buscar: (id, params = {}) => api.get('categorias_financeiras.php', id, { empresaId: params.empresaId }),
    criar: (data) => api.post('categorias_financeiras.php', data, { empresaId: data.empresa_id }),
    atualizar: (id, data) => api.put('categorias_financeiras.php', id, data, { empresaId: data.empresa_id }),
    excluir: (id, empresaId) => api.delete('categorias_financeiras.php', id, { empresaId })
};
