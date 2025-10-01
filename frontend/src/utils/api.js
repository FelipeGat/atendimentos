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
    if (empresaId) {
        // CORREÇÃO CRÍTICA: Adiciona o ID da empresa ao cabeçalho
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
        const response = await fetch(url, config);

        if (response.headers.get('content-type')?.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                // Lança o erro do backend se a resposta for JSON e não for ok
                throw new Error(data.error || `Erro HTTP: ${response.status}`);
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